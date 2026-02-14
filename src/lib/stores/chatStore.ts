import { writable, derived, get } from 'svelte/store';
import { replaceState } from '$app/navigation';
import type { Message, MessageBranch, TreePosition } from '../types';
import { chatDB } from './indexedDB';
import { apiKeyStore } from './apiKeyStore';
import { systemPromptStore } from './systemPromptStore';
import { toastStore } from './toastStore';
import { modelStore } from './modelStore';
import { settingsStore } from './settingsStore';
import { streamingStore } from './streamingStore';
import type { WebSearchConfig } from '$lib/server/ai/streaming';

// Helper to check if chat storing is disabled
function isChatStoringDisabled(): boolean {
  return get(settingsStore).disableChatStoring;
}

// Type for extracted images
type ExtractedImage = { id: string; type: 'image'; url: string; name: string; timestamp: Date };

// LRU cache for image extraction to avoid re-parsing same content
class ImageExtractionCache {
  private cache = new Map<string, ExtractedImage[]>();
  private maxSize = 50;

  get(content: string): ExtractedImage[] | undefined {
    const result = this.cache.get(content);
    if (result) {
      // Move to end (most recently used)
      this.cache.delete(content);
      this.cache.set(content, result);
    }
    return result;
  }

  set(content: string, images: ExtractedImage[]) {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(content, images);
  }

  clear() {
    this.cache.clear();
  }
}

const imageExtractionCache = new ImageExtractionCache();

// Extract image URLs from content (markdown, HTML, or direct URLs)
function extractImagesFromContent(content: string): ExtractedImage[] {
  const images: ExtractedImage[] = [];
  const seenUrls = new Set<string>();

  if (!content || typeof content !== 'string') {
    return images;
  }

  // Match markdown image syntax: ![alt](url) or ![alt](url 'title')
  const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = markdownImageRegex.exec(content)) !== null) {
    const url = match[2].trim();
    if ((url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://')) && !seenUrls.has(url)) {
      seenUrls.add(url);
      images.push({
        id: crypto.randomUUID(),
        type: 'image',
        url,
        name: match[1] || 'Generated image',
        timestamp: new Date()
      });
    }
  }

  // Match HTML img tags
  const htmlImageRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
  while ((match = htmlImageRegex.exec(content)) !== null) {
    const url = match[1];
    const altMatch = match[0].match(/alt=["']([^"]*)["']/i);
    const alt = altMatch ? altMatch[1] : 'Generated image';

    if ((url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://')) && !seenUrls.has(url)) {
      seenUrls.add(url);
      images.push({
        id: crypto.randomUUID(),
        type: 'image',
        url,
        name: alt,
        timestamp: new Date()
      });
    }
  }

  // Match img tags with single quotes
  const htmlImageRegexSingle = /<img\s+[^>]*src='([^']+)'[^>]*>/gi;
  while ((match = htmlImageRegexSingle.exec(content)) !== null) {
    const url = match[1];
    const altMatch = match[0].match(/alt=['"]([^'"]*)['"]/i);
    const alt = altMatch ? altMatch[1] : 'Generated image';

    if ((url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://')) && !seenUrls.has(url)) {
      seenUrls.add(url);
      images.push({
        id: crypto.randomUUID(),
        type: 'image',
        url,
        name: alt,
        timestamp: new Date()
      });
    }
  }

  // Match direct image URLs
  const directImageRegex = /(https?:\/\/[^\s<>"'\)]+\.(?:png|jpg|jpeg|gif|webp|svg|bmp))(?:\?[^\s<>"'\)]*)?/gi;
  while ((match = directImageRegex.exec(content)) !== null) {
    const url = match[1] + (match[0].includes('?') ? match[0].substring(match[0].indexOf('?')).split(/[\s<>'"\)"]/)[0] : '');
    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      images.push({
        id: crypto.randomUUID(),
        type: 'image',
        url,
        name: 'Generated image',
        timestamp: new Date()
      });
    }
  }

  // Match base64 image data URIs
  const base64ImageRegex = /(data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]{100,})/g;
  while ((match = base64ImageRegex.exec(content)) !== null) {
    const url = match[1];
    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      images.push({
        id: crypto.randomUUID(),
        type: 'image',
        url,
        name: 'Generated image',
        timestamp: new Date()
      });
    }
  }

  return images;
}

// Cached version of extractImagesFromContent
function getImagesFromContent(content: string): ExtractedImage[] {
  // Check cache first
  const cached = imageExtractionCache.get(content);
  if (cached) return cached;

  // Extract and cache
  const result = extractImagesFromContent(content);
  imageExtractionCache.set(content, result);
  return result;
}

interface ChatState {
  activeChatId: string | null;
  messages: Message[];
  isStreaming: boolean;
  streamingBuffer: string;
  streamingModel: string | null;
  multiModelBuffers: Map<string, string>;
  multiModelStats: Map<string, any>;
  draftMessage: string;
  mode: 'auto' | 'manual';
  selectedModels: string[];
  routerDecision: { model: string; reasoning: string } | null;
  currentSummary: string | null;
  activePath: Map<string | null, string>;
  abortController: AbortController | null;
  partialContentMap: Map<string, string>;
  streamingMessageIds: string[];
  imageOptions: {
    aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';
    imageSize?: '1K' | '2K' | '4K';
  };
}

const createChatStore = () => {
  const { subscribe, set, update } = writable<ChatState>({
    activeChatId: null,
    messages: [],
    isStreaming: false,
    streamingBuffer: '',
    streamingModel: null,
    multiModelBuffers: new Map(),
    multiModelStats: new Map(),
    draftMessage: '',
    mode: 'auto',
    selectedModels: [],
    routerDecision: null,
    currentSummary: null,
    activePath: new Map(),
    abortController: null,
    partialContentMap: new Map(),
    streamingMessageIds: [],
    imageOptions: {}
  });

  // Helper to get current state - uses Svelte's get() for proper cleanup
  const getState = (): ChatState => {
    return get({ subscribe });
  };

  const parseSSELine = (line: string) => {
    if (!line.trim() || line === 'data: [DONE]') return null;
    if (line.startsWith('data: ')) {
      try {
        return JSON.parse(line.slice(6));
      } catch (e) {
        console.warn('Failed to parse SSE line:', line);
        return null;
      }
    }
    return null;
  };

  // Build the visible message list from the tree structure with optimizations
  const buildVisibleMessages = async (
    chatId: string,
    activeSelections?: Map<string | null, string>
  ): Promise<Message[]> => {
    const allStoredMessages = await chatDB.getMessages(chatId);
    if (allStoredMessages.length === 0) return [];

    // Group messages by parentId in a single pass
    const childrenByParent = new Map<string | null, typeof allStoredMessages>();
    for (let i = 0; i < allStoredMessages.length; i++) {
      const msg = allStoredMessages[i];
      const parentId = msg.parentId ?? null;
      let siblings = childrenByParent.get(parentId);
      if (!siblings) {
        siblings = [];
        childrenByParent.set(parentId, siblings);
      }
      siblings.push(msg);
    }

    // Sort siblings by branchIndex once
    childrenByParent.forEach((siblings) => {
      siblings.sort((a, b) => (a.branchIndex || 0) - (b.branchIndex || 0));
    });

    // Build visible messages by following active selections
    const visibleMessages: Message[] = [];

    const buildFrom = (parentId: string | null) => {
      const siblings = childrenByParent.get(parentId);
      if (!siblings || siblings.length === 0) return;

      let activeMessage: typeof allStoredMessages[0] | undefined;

      if (activeSelections) {
        const selectedId = activeSelections.get(parentId);
        if (selectedId) {
          for (let i = 0; i < siblings.length; i++) {
            if (siblings[i].id === selectedId) {
              activeMessage = siblings[i];
              break;
            }
          }
        }
      }

      if (!activeMessage) {
        activeMessage = siblings[siblings.length - 1];
      }

      if (activeMessage) {
        // Use cached image extraction for assistant messages
        const generatedMedia = activeMessage.role === 'assistant'
          ? getImagesFromContent(activeMessage.content)
          : undefined;

        visibleMessages.push({
          id: activeMessage.id,
          role: activeMessage.role === 'system' ? 'assistant' : activeMessage.role,
          content: activeMessage.content,
          model: activeMessage.model,
          timestamp: new Date(activeMessage.createdAt),
          media: activeMessage.attachments ? JSON.parse(activeMessage.attachments) : undefined,
          generatedMedia: generatedMedia && generatedMedia.length > 0 ? generatedMedia : undefined,
          stats: activeMessage.stats,
          parentId: activeMessage.parentId,
          branchId: activeMessage.branchId,
          branchIndex: activeMessage.branchIndex,
          isEdited: activeMessage.isEdited,
          editedAt: activeMessage.editedAt ? new Date(activeMessage.editedAt) : undefined,
          isPartial: activeMessage.isPartial
        });

        buildFrom(activeMessage.id);
      }
    };

    buildFrom(null);
    return visibleMessages;
  };

  // Build active path map from a target message
  const buildActivePathFromMessage = async (
    chatId: string,
    targetMessageId: string
  ): Promise<Map<string | null, string>> => {
    const allStoredMessages = await chatDB.getMessages(chatId);
    const activePath = new Map<string | null, string>();

    const childrenByParent = new Map<string | null, typeof allStoredMessages>();
    for (let i = 0; i < allStoredMessages.length; i++) {
      const msg = allStoredMessages[i];
      const parentId = msg.parentId ?? null;
      let siblings = childrenByParent.get(parentId);
      if (!siblings) {
        siblings = [];
        childrenByParent.set(parentId, siblings);
      }
      siblings.push(msg);
    }

    const pathMessageIds = new Set<string>();
    let currentId: string | null = targetMessageId;
    while (currentId) {
      pathMessageIds.add(currentId);
      const msg = allStoredMessages.find(m => m.id === currentId);
      currentId = msg?.parentId ?? null;
    }

    childrenByParent.forEach((children, parentId) => {
      let childInPath: typeof allStoredMessages[0] | undefined;
      for (let i = 0; i < children.length; i++) {
        if (pathMessageIds.has(children[i].id)) {
          childInPath = children[i];
          break;
        }
      }
      if (childInPath) {
        activePath.set(parentId, childInPath.id);
      } else if (children.length > 0) {
        let lastChild = children[0];
        for (let i = 1; i < children.length; i++) {
          if ((children[i].branchIndex || 0) > (lastChild.branchIndex || 0)) {
            lastChild = children[i];
          }
        }
        activePath.set(parentId, lastChild.id);
      }
    });

    return activePath;
  };

  // Get sibling messages for a given message
  const getSiblings = async (messageId: string): Promise<Message[]> => {
    const message = await chatDB.getMessage(messageId);
    if (!message) return [];

    const siblings = await chatDB.getSiblingMessages(message.parentId ?? null, message.chatId);

    const filteredSiblings = siblings.filter(s => s.role === message.role);

    return filteredSiblings.map(s => {
      const generatedMedia = s.role === 'assistant'
        ? getImagesFromContent(s.content)
        : undefined;

      return {
        id: s.id,
        role: s.role === 'system' ? 'assistant' : s.role,
        content: s.content,
        model: s.model,
        timestamp: new Date(s.createdAt),
        media: s.attachments ? JSON.parse(s.attachments) : undefined,
        generatedMedia: generatedMedia && generatedMedia.length > 0 ? generatedMedia : undefined,
        stats: s.stats,
        parentId: s.parentId,
        branchId: s.branchId,
        branchIndex: s.branchIndex,
        isEdited: s.isEdited,
        editedAt: s.editedAt ? new Date(s.editedAt) : undefined,
        isPartial: s.isPartial
      };
    });
  };

  // Batch update queue for streaming performance
  let pendingUpdates: Partial<ChatState>[] = [];
  let batchTimeout: ReturnType<typeof setTimeout> | null = null;

  const flushBatch = () => {
    if (pendingUpdates.length === 0) return;

    // Merge all pending updates
    const merged = pendingUpdates.reduce((acc, update) => ({ ...acc, ...update }), {});
    pendingUpdates = [];
    batchTimeout = null;

    // Apply single update
    update(state => ({ ...state, ...merged }));
  };

  const queueUpdate = (updateData: Partial<ChatState>) => {
    pendingUpdates.push(updateData);
    if (!batchTimeout) {
      batchTimeout = setTimeout(flushBatch, 16); // ~1 frame at 60fps
    }
  };

  return {
    subscribe,

    setActiveChat: (chatId: string) => update(state => {
      const isCurrentlyStreaming = streamingStore.isChatStreaming(chatId);
      const abortController = isCurrentlyStreaming
        ? (streamingStore.getAbortController(chatId) || null)
        : null;

      return {
        ...state,
        activeChatId: chatId,
        messages: [],
        streamingBuffer: '',
        isStreaming: isCurrentlyStreaming,
        abortController,
        activePath: new Map()
      };
    }),

    setMode: (mode: 'auto' | 'manual') => update(state => ({
      ...state,
      mode
    })),

    setSelectedModels: (models: string[]) => update(state => ({
      ...state,
      selectedModels: models
    })),

    async loadChat(chatId: string) {
      try {
        const chat = await chatDB.getChat(chatId);
        const state = getState();

        let activePath = state.activePath;
        if (chat?.currentLeafMessageId) {
          activePath = await buildActivePathFromMessage(chatId, chat.currentLeafMessageId);
        }

        const messages = await buildVisibleMessages(chatId, activePath);

        const isCurrentlyStreaming = streamingStore.isChatStreaming(chatId);
        const abortController = isCurrentlyStreaming
          ? (streamingStore.getAbortController(chatId) || null)
          : null;

        update(state => ({
          ...state,
          activeChatId: chatId,
          messages,
          activePath,
          isStreaming: isCurrentlyStreaming,
          abortController,
        }));
      } catch (error) {
        console.error('Failed to load chat:', error);
        toastStore.show('Failed to load chat', 'error');
      }
    },

    async switchVersion(messageId: string) {
      const state = getState();
      if (!state.activeChatId) return;

      try {
        const targetMessage = await chatDB.getMessage(messageId);
        if (!targetMessage) {
          console.error('Target message not found:', messageId);
          return;
        }

        const newActivePath = await buildActivePathFromMessage(state.activeChatId, messageId);
        const messages = await buildVisibleMessages(state.activeChatId, newActivePath);

        update(state => ({
          ...state,
          messages,
          activePath: newActivePath
        }));

        // Persist the new leaf position
        if (!isChatStoringDisabled() && messages.length > 0) {
          const lastMsg = messages[messages.length - 1];
          const chat = await chatDB.getChat(state.activeChatId);
          if (chat) {
            chat.currentLeafMessageId = lastMsg.id;
            await chatDB.saveChat(chat);
          }
        }
      } catch (error) {
        console.error('Failed to switch version:', error);
        toastStore.show('Failed to switch version', 'error');
      }
    },

    async getMessageSiblings(messageId: string): Promise<{ siblings: Message[], currentIndex: number }> {
      const siblings = await getSiblings(messageId);
      const currentIndex = siblings.findIndex(s => s.id === messageId);
      const validIndex = currentIndex >= 0 ? currentIndex : Math.max(0, siblings.length - 1);
      return { siblings, currentIndex: validIndex };
    },

    async editAndRegenerate(messageId: string, newContent: string) {
      const state = getState();
      if (!state.activeChatId) return;

      try {
        const originalMessage = await chatDB.getMessage(messageId);
        if (!originalMessage || originalMessage.role !== 'user') {
          console.error('Can only edit user messages');
          return;
        }

        const siblings = await chatDB.getSiblingMessages(originalMessage.parentId ?? null, state.activeChatId);
        const newBranchIndex = siblings.length;

        const newUserMessageId = crypto.randomUUID();
        const newUserMessage = {
          id: newUserMessageId,
          chatId: state.activeChatId,
          role: 'user' as const,
          content: newContent,
          attachments: originalMessage.attachments,
          createdAt: new Date(),
          parentId: originalMessage.parentId ?? null,
          branchId: crypto.randomUUID(),
          branchIndex: newBranchIndex,
          isEdited: true,
          editedAt: new Date()
        };

        if (!isChatStoringDisabled()) {
          await chatDB.saveMessage(newUserMessage);
        }

        const newActivePath = new Map(state.activePath);
        newActivePath.set(originalMessage.parentId ?? null, newUserMessageId);

        const messages = await buildVisibleMessages(state.activeChatId, newActivePath);
        update(state => ({ ...state, messages, activePath: newActivePath }));

        if (!isChatStoringDisabled()) {
          const chat = await chatDB.getChat(state.activeChatId);
          if (chat) {
            chat.currentLeafMessageId = newUserMessageId;
            await chatDB.saveChat(chat);
          }
        }

        await this.regenerateResponse(newUserMessageId);

      } catch (error) {
        console.error('Failed to edit and regenerate:', error);
        toastStore.show('Failed to edit message', 'error');
      }
    },

    async regenerateResponse(userMessageId: string) {
      const state = getState();

      const apiKey = apiKeyStore.loadApiKey();
      if (!apiKey) {
        console.error('No API key set');
        toastStore.show('Please set your API key in settings', 'error');
        return;
      }

      if (!state.activeChatId) return;

      const modelState = get(modelStore);
      const mode = modelState.autoMode ? 'auto' : 'manual';
      const selectedModels = modelState.selectedModels;

      const userMessage = await chatDB.getMessage(userMessageId);
      if (!userMessage) return;

      const currentSiblings = await chatDB.getSiblingMessages(userMessageId, state.activeChatId);
      const newBranchIndex = currentSiblings.length;

      const assistantMessageId = crypto.randomUUID();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        model: undefined,
        parentId: userMessageId,
        branchIndex: newBranchIndex
      };

      if (!isChatStoringDisabled()) {
        await chatDB.saveMessage({
          id: assistantMessage.id,
          chatId: state.activeChatId!,
          role: 'assistant',
          content: '',
          createdAt: assistantMessage.timestamp,
          parentId: userMessageId,
          branchIndex: newBranchIndex
        });
      }

      const newActivePath = new Map(state.activePath);
      newActivePath.set(userMessageId, assistantMessageId);

      const visibleMessages = await buildVisibleMessages(state.activeChatId!, newActivePath);

      const abortController = new AbortController();

      const initialPartialContentMap = new Map<string, string>();
      initialPartialContentMap.set(assistantMessageId, '');

      update(s => ({
        ...s,
        messages: visibleMessages,
        activePath: newActivePath,
        isStreaming: true,
        streamingBuffer: '',
        streamingModel: null,
        routerDecision: null,
        abortController,
        partialContentMap: initialPartialContentMap,
        streamingMessageIds: [assistantMessageId]
      }));

      const activeChatId = state.activeChatId;
      const chatInfo = await chatDB.getChat(activeChatId!);
      const chatName = chatInfo?.title || 'Unknown Chat';

      streamingStore.startStreaming(activeChatId!, chatName, abortController);

      const path = await chatDB.getMessagePath(userMessageId);
      const conversationHistory = path.map(m => ({
        role: m.role,
        content: m.content
      }));

      try {
        const systemPrompt = systemPromptStore.getEffectivePrompt();
        const settings = get(settingsStore);
        const currentImageOptions = getState().imageOptions;

        // Build web search config from settings
        const webSearchConfig: WebSearchConfig | undefined = settings.webSearch?.enabled ? {
          enabled: true,
          engine: settings.webSearch.engine,
          maxResults: settings.webSearch.maxResults,
          searchContextSize: settings.webSearch.searchContextSize
        } : undefined;

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortController.signal,
          body: JSON.stringify({
            message: userMessage.content,
            attachments: userMessage.attachments ? JSON.parse(userMessage.attachments) : [],
            mode,
            models: mode === 'manual' ? selectedModels : undefined,
            apiKey,
            conversationHistory,
            systemPrompt,
            imageOptions: currentImageOptions,
            webSearch: webSearchConfig,
            zeroDataRetention: settings.zeroDataRetention
          })
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        let buffer = '';
        let assistantContent = '';
        let assistantModel: string | undefined;
        let messageStats: any = null;

        const STREAM_TIMEOUT = 5 * 60 * 1000;
        const startTime = Date.now();
        let lastUpdateTime = Date.now();

        while (true) {
          if (Date.now() - startTime > STREAM_TIMEOUT) {
            console.error('Stream timeout - forcing stop');
            abortController.abort();
            throw new Error('Stream timeout after 5 minutes');
          }

          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const event = parseSSELine(line);
            if (!event) continue;

            switch (event.type) {
              case 'router':
                update(s => ({
                  ...s,
                  routerDecision: event.routerDecision
                }));
                assistantModel = event.routerDecision?.model;
                update(s => ({
                  ...s,
                  messages: s.messages.map(m =>
                    m.id === assistantMessageId ? { ...m, model: assistantModel } : m
                  )
                }));
                break;

              case 'content':
                assistantContent += event.content || '';
                // Debounce image extraction during streaming - only update every 100ms
                const now = Date.now();
                if (now - lastUpdateTime > 100 || event.content?.includes('![')) {
                  const generatedMediaRegen = getImagesFromContent(assistantContent);
                  update(s => {
                    const newPartialMap = new Map(s.partialContentMap);
                    newPartialMap.set(assistantMessageId, assistantContent);
                    return {
                      ...s,
                      messages: s.messages.map(m =>
                        m.id === assistantMessageId ? { ...m, content: assistantContent, generatedMedia: generatedMediaRegen } : m
                      ),
                      partialContentMap: newPartialMap
                    };
                  });
                  lastUpdateTime = now;
                } else {
                  // Update content without re-extracting images
                  update(s => {
                    const newPartialMap = new Map(s.partialContentMap);
                    newPartialMap.set(assistantMessageId, assistantContent);
                    return {
                      ...s,
                      messages: s.messages.map(m =>
                        m.id === assistantMessageId ? { ...m, content: assistantContent } : m
                      ),
                      partialContentMap: newPartialMap
                    };
                  });
                }
                break;

              case 'stats':
                messageStats = event.stats;
                break;

              case 'summary':
                update(s => ({
                  ...s,
                  currentSummary: event.summary
                }));
                try {
                  const settings = get(settingsStore);
                  if (!settings.chatTitleGeneration || isChatStoringDisabled()) {
                    break;
                  }

                  const chat = await chatDB.getChat(state!.activeChatId!);
                  if (chat && (chat.title === 'New Chat' || !chat.title || chat.title.trim() === '')) {
                    const updatedChat = {
                      ...chat,
                      title: event.summary,
                      updatedAt: new Date()
                    };
                    await chatDB.saveChat(updatedChat);
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('chat-updated'));
                    }
                  }
                } catch (error) {
                  console.error('Failed to update chat title:', error);
                }
                break;

              case 'done':
                break;

              case 'error':
                console.error('Stream error:', event.error);
                update(s => ({
                  ...s,
                  isStreaming: false
                }));
                break;
            }
          }
        }

        await chatDB.saveMessage({
          id: assistantMessageId,
          chatId: state!.activeChatId!,
          role: 'assistant',
          content: assistantContent,
          model: assistantModel,
          createdAt: assistantMessage.timestamp,
          stats: messageStats,
          parentId: userMessageId,
          branchIndex: newBranchIndex,
          isPartial: false
        });

        update(s => ({
          ...s,
          messages: s.messages.map(m =>
            m.id === assistantMessageId
              ? { ...m, content: assistantContent, model: assistantModel, stats: messageStats }
              : m
          )
        }));

        if (!isChatStoringDisabled()) {
          const costIncrement = messageStats?.cost || 0;
          const tokensIncrement = (messageStats?.tokensInput || 0) + (messageStats?.tokensOutput || 0);

          await chatDB.updateChatStats(state!.activeChatId!, {
            messageCountIncrement: 0, // Assistant message was already saved, just updating stats
            costIncrement,
            tokensIncrement,
            models: assistantModel ? [assistantModel] : []
          });

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('chat-updated'));
          }

          // Persist the new leaf position (assistant message)
          const chat = await chatDB.getChat(state!.activeChatId!);
          if (chat) {
            chat.currentLeafMessageId = assistantMessageId;
            await chatDB.saveChat(chat);
          }
        }

        const finalMessages = await buildVisibleMessages(state!.activeChatId!, newActivePath);
        update(s => ({
          ...s,
          ...(s.activeChatId === state!.activeChatId ? {
            messages: finalMessages,
            isStreaming: false,
            streamingBuffer: '',
            streamingModel: null,
            abortController: null,
            partialContentMap: new Map(),
            streamingMessageIds: []
          } : {
            isStreaming: s.activeChatId === state!.activeChatId ? false : s.isStreaming,
            abortController: s.activeChatId === state!.activeChatId ? null : s.abortController,
            partialContentMap: s.activeChatId === state!.activeChatId ? new Map() : s.partialContentMap,
            streamingMessageIds: s.activeChatId === state!.activeChatId ? [] : s.streamingMessageIds
          })
        }));

        const completedChatInfo = await chatDB.getChat(state!.activeChatId!);
        const completedChatName = completedChatInfo?.title || 'Unknown Chat';

        streamingStore.completeStreaming(state!.activeChatId!, completedChatName);

      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Generation stopped by user');
        } else {
          console.error('Failed to regenerate response:', error);
          toastStore.show('Failed to regenerate response', 'error');
        }
        update(s => ({
          ...s,
          isStreaming: false,
          streamingBuffer: '',
          streamingModel: null,
          abortController: null,
          partialContentMap: new Map(),
          streamingMessageIds: []
        }));
        streamingStore.stopStreaming(state!.activeChatId!);
      }
    },

    async createChat(chatId: string, title: string = 'New Chat') {
      if (isChatStoringDisabled()) {
        return;
      }

      try {
        await chatDB.saveChat({
          id: chatId,
          title,
          mode: 'auto',
          createdAt: new Date(),
          updatedAt: new Date(),
          messageCount: 0,
          totalCost: 0,
          totalTokens: 0,
          models: []
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('chat-updated'));
        }
      } catch (error) {
        console.error('Failed to create chat:', error);
        toastStore.show('Failed to create chat', 'error');
      }
    },

    async sendMessage(
      content: string,
      attachments: any[] = [],
      isNewChat: boolean = false,
      onChatCreated?: (chatId: string) => void
    ): Promise<string | undefined> {
      let state: ChatState;
      const unsubscribe = subscribe(s => { state = s; });
      unsubscribe();

      const apiKey = apiKeyStore.loadApiKey();
      if (!apiKey) {
        console.error('No API key set');
        toastStore.show('Please set your API key in settings', 'error');
        return;
      }

      const modelState = get(modelStore);
      const mode = modelState.autoMode ? 'auto' : 'manual';
      const selectedModels = modelState.selectedModels;

      const chatId = (!state!.activeChatId) ? crypto.randomUUID() : state!.activeChatId;

      const needsNavigation = !state!.activeChatId && typeof window !== 'undefined';

      const existingChat = await chatDB.getChat(chatId);
      if (!existingChat) {
        const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
        await this.createChat(chatId, title);
        update(s => ({ ...s, activeChatId: chatId }));

        // Notify component immediately that chat is created so it can track the chatId
        if (onChatCreated) {
          onChatCreated(chatId);
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('chat-updated'));
        }

        if (needsNavigation) {
          replaceState(`/chat/${chatId}`, {});
        }
      }

      let parentId: string | null = null;
      const currentMessages = state!.messages;
      if (currentMessages.length > 0) {
        parentId = currentMessages[currentMessages.length - 1].id;
      }

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: new Date(),
        media: attachments,
        parentId,
        branchIndex: 0
      };

      if (!isChatStoringDisabled()) {
        await chatDB.saveMessage({
          id: userMessage.id,
          chatId,
          role: 'user',
          content,
          attachments: attachments.length > 0 ? JSON.stringify(attachments) : undefined,
          createdAt: userMessage.timestamp,
          parentId,
          branchIndex: 0
        });

        const chat = await chatDB.getChat(chatId);
        if (chat) {
          chat.currentLeafMessageId = userMessage.id;
          await chatDB.saveChat(chat);
        }
      }

      const newActivePath = new Map(state!.activePath);
      newActivePath.set(parentId, userMessage.id);

      const isMultiModel = mode === 'manual' && selectedModels.length > 1;
      const assistantMessageIds: string[] = [];
      const assistantMessages: Message[] = [];

      if (isMultiModel && selectedModels.length > 0) {
        for (let i = 0; i < selectedModels.length; i++) {
          const modelId = selectedModels[i];
          const assistantId = crypto.randomUUID();
          assistantMessageIds.push(assistantId);
          assistantMessages.push({
            id: assistantId,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            model: modelId,
            parentId: userMessage.id,
            branchIndex: i
          });
          if (!isChatStoringDisabled()) {
            await chatDB.saveMessage({
              id: assistantId,
              chatId,
              role: 'assistant',
              content: '',
              model: modelId,
              createdAt: new Date(),
              parentId: userMessage.id,
              branchIndex: i
            });
          }
          if (i === 0) {
            newActivePath.set(userMessage.id, assistantId);
          }
        }
      } else {
        const assistantId = crypto.randomUUID();
        assistantMessageIds.push(assistantId);
        assistantMessages.push({
          id: assistantId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          model: undefined,
          parentId: userMessage.id,
          branchIndex: 0
        });
        if (!isChatStoringDisabled()) {
          await chatDB.saveMessage({
            id: assistantId,
            chatId,
            role: 'assistant',
            content: '',
            createdAt: new Date(),
            parentId: userMessage.id,
            branchIndex: 0
          });
        }
        newActivePath.set(userMessage.id, assistantId);
      }

      const visibleMessages = await buildVisibleMessages(chatId, newActivePath);

      const abortController = new AbortController();

      const initialPartialContentMap = new Map<string, string>();
      for (const msg of assistantMessages) {
        initialPartialContentMap.set(msg.id, '');
      }

      update(s => ({
        ...s,
        activeChatId: s.activeChatId === null || s.activeChatId === chatId ? chatId : s.activeChatId,
        messages: visibleMessages,
        isStreaming: true,
        streamingBuffer: '',
        streamingModel: null,
        routerDecision: null,
        activePath: newActivePath,
        abortController,
        partialContentMap: initialPartialContentMap,
        streamingMessageIds: assistantMessageIds
      }));

      const sendChatInfo = await chatDB.getChat(chatId);
      const sendChatName = sendChatInfo?.title || 'Unknown Chat';

      streamingStore.startStreaming(chatId, sendChatName, abortController);

      try {
        const conversationMessages = state!.messages.map(m => ({
          role: m.role,
          content: m.content
        }));
        conversationMessages.push({ role: 'user', content });

        // Build web search config from settings
        const webSearchConfigSend: WebSearchConfig | undefined = get(settingsStore).webSearch?.enabled ? {
          enabled: true,
          engine: get(settingsStore).webSearch.engine,
          maxResults: get(settingsStore).webSearch.maxResults,
          searchContextSize: get(settingsStore).webSearch.searchContextSize
        } : undefined;

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortController.signal,
          body: JSON.stringify({
            message: content,
            attachments,
            mode,
            models: mode === 'manual' ? selectedModels : undefined,
            apiKey,
            conversationHistory: conversationMessages,
            systemPrompt: systemPromptStore.getEffectivePrompt(),
            imageOptions: state!.imageOptions,
            webSearch: webSearchConfigSend,
            zeroDataRetention: get(settingsStore).zeroDataRetention
          })
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        let buffer = '';
        const assistantContents = new Map<string, string>();
        const assistantModels = new Map<string, string>();
        const messageStatsMap = new Map<string, any>();

        for (const msg of assistantMessages) {
          assistantContents.set(msg.id, '');
        }

        const STREAM_TIMEOUT = 5 * 60 * 1000;
        const startTime = Date.now();
        let lastUpdateTime = Date.now();

        while (true) {
          if (Date.now() - startTime > STREAM_TIMEOUT) {
            console.error('Stream timeout - forcing stop');
            abortController.abort();
            throw new Error('Stream timeout after 5 minutes');
          }

          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const event = parseSSELine(line);
            if (!event) continue;

            switch (event.type) {
              case 'router':
                update(s => ({
                  ...s,
                  routerDecision: event.routerDecision
                }));
                if (assistantMessages.length === 1) {
                  const msgId = assistantMessages[0].id;
                  assistantModels.set(msgId, event.routerDecision?.model);
                  update(s => ({
                    ...s,
                    messages: s.messages.map(m =>
                      m.id === msgId ? { ...m, model: event.routerDecision?.model } : m
                    )
                  }));
                }
                break;

              case 'content':
                if (isMultiModel && event.model) {
                  const msgIndex = selectedModels.indexOf(event.model);
                  if (msgIndex >= 0 && msgIndex < assistantMessages.length) {
                    const msgId = assistantMessages[msgIndex].id;
                    const currentContent = assistantContents.get(msgId) || '';
                    const newContent = currentContent + (event.content || '');
                    assistantContents.set(msgId, newContent);
                    const now = Date.now();
                    if (now - lastUpdateTime > 100 || event.content?.includes('![')) {
                      const generatedMedia = getImagesFromContent(newContent);
                      update(s => {
                        const newPartialMap = new Map(s.partialContentMap);
                        newPartialMap.set(msgId, newContent);
                        return {
                          ...s,
                          messages: s.messages.map(m =>
                            m.id === msgId ? { ...m, content: newContent, generatedMedia } : m
                          ),
                          partialContentMap: newPartialMap
                        };
                      });
                      lastUpdateTime = now;
                    } else {
                      update(s => {
                        const newPartialMap = new Map(s.partialContentMap);
                        newPartialMap.set(msgId, newContent);
                        return {
                          ...s,
                          messages: s.messages.map(m =>
                            m.id === msgId ? { ...m, content: newContent } : m
                          ),
                          partialContentMap: newPartialMap
                        };
                      });
                    }
                  }
                } else if (assistantMessages.length === 1) {
                  const msgId = assistantMessages[0].id;
                  const currentContent = assistantContents.get(msgId) || '';
                  const newContent = currentContent + (event.content || '');
                  assistantContents.set(msgId, newContent);
                  const now = Date.now();
                  if (now - lastUpdateTime > 100 || event.content?.includes('![')) {
                    const generatedMedia = getImagesFromContent(newContent);
                    update(s => {
                      const newPartialMap = new Map(s.partialContentMap);
                      newPartialMap.set(msgId, newContent);
                      return {
                        ...s,
                        messages: s.messages.map(m =>
                          m.id === msgId ? { ...m, content: newContent, generatedMedia } : m
                        ),
                        streamingModel: event.model || s.streamingModel,
                        partialContentMap: newPartialMap
                      };
                    });
                    lastUpdateTime = now;
                  } else {
                    update(s => {
                      const newPartialMap = new Map(s.partialContentMap);
                      newPartialMap.set(msgId, newContent);
                      return {
                        ...s,
                        messages: s.messages.map(m =>
                          m.id === msgId ? { ...m, content: newContent } : m
                        ),
                        streamingModel: event.model || s.streamingModel,
                        partialContentMap: newPartialMap
                      };
                    });
                  }
                }
                break;

              case 'citations':
                if (event.citations && event.citations.length > 0) {
                  if (isMultiModel && event.model) {
                    const msgIndex = selectedModels.indexOf(event.model);
                    if (msgIndex >= 0 && msgIndex < assistantMessages.length) {
                      const msgId = assistantMessages[msgIndex].id;
                      update(s => ({
                        ...s,
                        messages: s.messages.map(m =>
                          m.id === msgId ? { ...m, citations: event.citations } : m
                        )
                      }));
                    }
                  } else if (assistantMessages.length === 1) {
                    const msgId = assistantMessages[0].id;
                    update(s => ({
                      ...s,
                      messages: s.messages.map(m =>
                        m.id === msgId ? { ...m, citations: event.citations } : m
                      )
                    }));
                  }
                }
                break;

              case 'stats':
                if (isMultiModel && event.model) {
                  const msgIndex = selectedModels.indexOf(event.model);
                  if (msgIndex >= 0 && msgIndex < assistantMessages.length) {
                    const msgId = assistantMessages[msgIndex].id;
                    messageStatsMap.set(msgId, event.stats);
                  }
                } else if (assistantMessages.length === 1) {
                  messageStatsMap.set(assistantMessages[0].id, event.stats);
                }
                break;

              case 'summary':
                update(s => ({
                  ...s,
                  currentSummary: event.summary
                }));
                try {
                  const settings = get(settingsStore);
                  if (!settings.chatTitleGeneration || isChatStoringDisabled()) {
                    break;
                  }

                  const chat = await chatDB.getChat(chatId);
                  if (chat && (chat.title === 'New Chat' || !chat.title || chat.title.trim() === '')) {
                    const updatedChat = {
                      ...chat,
                      title: event.summary,
                      updatedAt: new Date()
                    };
                    await chatDB.saveChat(updatedChat);
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('chat-updated'));
                    }
                  }
                } catch (error) {
                  console.error('Failed to update chat title:', error);
                }
                break;

              case 'done':
                break;

              case 'error':
                console.error('Stream error:', event.error);
                toastStore.show(event.error || 'Stream error occurred', 'error');
                update(s => ({
                  ...s,
                  isStreaming: false
                }));
                break;
            }
          }
        }

        if (!isChatStoringDisabled()) {
          for (const msg of assistantMessages) {
            const finalContent = assistantContents.get(msg.id) || '';
            const finalModel = assistantModels.get(msg.id) || msg.model;
            const finalStats = messageStatsMap.get(msg.id);

            await chatDB.saveMessage({
              id: msg.id,
              chatId,
              role: 'assistant',
              content: finalContent,
              model: finalModel,
              createdAt: msg.timestamp,
              stats: finalStats,
              parentId: userMessage.id,
              branchIndex: msg.branchIndex,
              isPartial: false
            });
          }
        }

        update(s => ({
          ...s,
          messages: s.messages.map(m => {
            const finalContent = assistantContents.get(m.id);
            const finalModel = assistantModels.get(m.id);
            const finalStats = messageStatsMap.get(m.id);
            if (finalContent !== undefined) {
              return { ...m, content: finalContent, model: finalModel || m.model, stats: finalStats };
            }
            return m;
          })
        }));

        let totalCostIncr = 0;
        let totalTokensIncr = 0;
        const usedModels: string[] = [];

        for (const msg of assistantMessages) {
          const stats = messageStatsMap.get(msg.id);
          if (stats) {
            totalCostIncr += stats.cost || 0;
            totalTokensIncr += (stats.tokensInput || 0) + (stats.tokensOutput || 0);
          }
          const finalModel = assistantModels.get(msg.id) || msg.model;
          if (finalModel) usedModels.push(finalModel);
        }

        // Also count the user message in messageCountIncrement
        await chatDB.updateChatStats(chatId, {
          messageCountIncrement: 1 + assistantMessages.length,
          costIncrement: totalCostIncr,
          tokensIncrement: totalTokensIncr,
          models: usedModels
        });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('chat-updated'));
        }

        // Persist the new leaf position (assistant message - use the last one)
        if (assistantMessages.length > 0) {
          const lastAssistantId = assistantMessages[assistantMessages.length - 1].id;
          const chat = await chatDB.getChat(chatId);
          if (chat) {
            chat.currentLeafMessageId = lastAssistantId;
            await chatDB.saveChat(chat);
          }
        }

        const visibleMessages = await buildVisibleMessages(chatId, newActivePath);
        update(s => ({
          ...s,
          ...(s.activeChatId === chatId ? {
            messages: visibleMessages,
            isStreaming: false,
            streamingBuffer: '',
            streamingModel: null,
            multiModelBuffers: new Map(),
            multiModelStats: new Map(),
            abortController: null,
            partialContentMap: new Map(),
            streamingMessageIds: []
          } : {
            isStreaming: s.activeChatId === chatId ? false : s.isStreaming,
            abortController: s.activeChatId === chatId ? null : s.abortController,
            partialContentMap: s.activeChatId === chatId ? new Map() : s.partialContentMap,
            streamingMessageIds: s.activeChatId === chatId ? [] : s.streamingMessageIds
          })
        }));

        const finalChatInfo = await chatDB.getChat(chatId);
        const finalChatName = finalChatInfo?.title || 'Unknown Chat';

        streamingStore.completeStreaming(chatId, finalChatName);

      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Generation stopped by user');
        } else {
          console.error('Failed to send message:', error);
          toastStore.show('Failed to send message', 'error');
        }
        update(s => ({
          ...s,
          isStreaming: false,
          streamingBuffer: '',
          streamingModel: null,
          multiModelBuffers: new Map(),
          multiModelStats: new Map(),
          abortController: null,
          partialContentMap: new Map(),
          streamingMessageIds: []
        }));
        streamingStore.stopStreaming(chatId);
      }
      return chatId;
    },

    async stopGeneration() {
      const state = getState();
      if (state.abortController) {
        state.abortController.abort();

        if (state.activeChatId) {
          streamingStore.stopStreaming(state.activeChatId);
        }

        const partialContentMap = state.partialContentMap;
        const streamingMessageIds = state.streamingMessageIds;

        if (!isChatStoringDisabled() && streamingMessageIds.length > 0 && partialContentMap.size > 0 && state.activeChatId) {
          try {
            for (const messageId of streamingMessageIds) {
              const partialContent = partialContentMap.get(messageId);
              if (partialContent && partialContent.trim().length > 0) {
                const existingMessage = await chatDB.getMessage(messageId);
                if (existingMessage) {
                  await chatDB.saveMessage({
                    ...existingMessage,
                    content: partialContent,
                    isPartial: true
                  });
                }
              }
            }

            const totalSaved = streamingMessageIds.filter(id => {
              const content = partialContentMap.get(id);
              return content && content.trim().length > 0;
            }).length;

            if (totalSaved > 0) {
              toastStore.show(`Saved ${totalSaved} partial response${totalSaved > 1 ? 's' : ''}`, 'info');
            }
          } catch (error) {
            console.error('Failed to save partial content:', error);
          }
        }

        update(s => ({
          ...s,
          isStreaming: false,
          streamingBuffer: '',
          streamingModel: null,
          multiModelBuffers: new Map(),
          multiModelStats: new Map(),
          abortController: null,
          partialContentMap: new Map(),
          streamingMessageIds: []
        }));
      }
    },

    async deleteChat(chatId: string) {
      try {
        await chatDB.deleteChat(chatId);
        update(state => {
          if (state.activeChatId === chatId) {
            return {
              ...state,
              activeChatId: null,
              messages: [],
              activePath: new Map()
            };
          }
          return state;
        });
      } catch (error) {
        console.error('Failed to delete chat:', error);
        toastStore.show('Failed to delete chat', 'error');
      }
    },

    addMessage: (message: Message) => update(state => ({
      ...state,
      messages: [...state.messages, message]
    })),

    updateMessage: (messageId: string, updates: Partial<Message>) => update(state => ({
      ...state,
      messages: state.messages.map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    })),

    deleteMessage: (messageId: string) => update(state => ({
      ...state,
      messages: state.messages.filter(msg => msg.id !== messageId)
    })),

    updateDraft: (text: string) => update(state => ({
      ...state,
      draftMessage: text
    })),

    clearMessages: () => update(state => ({
      ...state,
      messages: [],
      activePath: new Map()
    })),

    setImageOptions: (options: { aspectRatio?: ChatState['imageOptions']['aspectRatio']; imageSize?: ChatState['imageOptions']['imageSize'] }) => update(state => ({
      ...state,
      imageOptions: options
    })),

    reset: () => {
      // Clear any pending batch updates
      if (batchTimeout) {
        clearTimeout(batchTimeout);
        batchTimeout = null;
      }
      pendingUpdates = [];

      set({
        activeChatId: null,
        messages: [],
        isStreaming: false,
        streamingBuffer: '',
        streamingModel: null,
        multiModelBuffers: new Map(),
        multiModelStats: new Map(),
        draftMessage: '',
        mode: 'auto',
        selectedModels: [],
        routerDecision: null,
        currentSummary: null,
        activePath: new Map(),
        abortController: null,
        partialContentMap: new Map(),
        streamingMessageIds: [],
        imageOptions: {}
      });
    },

    hardReset: () => {
      const state = getState();
      if (state.abortController) {
        try {
          state.abortController.abort();
        } catch (e) {
          // Ignore abort errors
        }
      }

      if (batchTimeout) {
        clearTimeout(batchTimeout);
        batchTimeout = null;
      }
      pendingUpdates = [];

      set({
        activeChatId: null,
        messages: [],
        isStreaming: false,
        streamingBuffer: '',
        streamingModel: null,
        multiModelBuffers: new Map(),
        multiModelStats: new Map(),
        draftMessage: '',
        mode: 'auto',
        selectedModels: [],
        routerDecision: null,
        currentSummary: null,
        activePath: new Map(),
        abortController: null,
        partialContentMap: new Map(),
        streamingMessageIds: [],
        imageOptions: {}
      });
    },
  };
};

export const chatStore = createChatStore();

export const currentMessages = derived(
  chatStore,
  $chat => $chat.messages
);

export const isStreaming = derived(
  chatStore,
  $chat => $chat.isStreaming
);

export const streamingBuffer = derived(
  chatStore,
  $chat => $chat.streamingBuffer
);

export const multiModelStreamingBuffers = derived(
  chatStore,
  $chat => $chat.multiModelBuffers
);

export const isMultiModelStreaming = derived(
  chatStore,
  $chat => $chat.isStreaming && $chat.multiModelBuffers.size > 0
);

export const routerDecision = derived(
  chatStore,
  $chat => $chat.routerDecision
);
