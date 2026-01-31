import { writable, derived, get } from 'svelte/store';
import { replaceState } from '$app/navigation';
import type { Message, MessageBranch, TreePosition } from '../types';
import { chatDB } from './indexedDB';
import { apiKeyStore } from './apiKeyStore';
import { systemPromptStore } from './systemPromptStore';
import { toastStore } from './toastStore';
import { modelStore } from './modelStore';
import { settingsStore } from './settingsStore';
import { debounce } from '$lib/utils/helpers';

// Batch update utility for streaming performance
function createBatchedUpdater<T>(updateFn: (update: Partial<T>) => void, delay: number = 50) {
  let pendingUpdates: Partial<T> = {};
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (Object.keys(pendingUpdates).length > 0) {
      updateFn(pendingUpdates);
      pendingUpdates = {};
    }
    timeoutId = null;
  };

  return {
    batch: (update: Partial<T>) => {
      pendingUpdates = { ...pendingUpdates, ...update };
      if (!timeoutId) {
        timeoutId = setTimeout(flush, delay);
      }
    },
    flush
  };
}

interface ChatState {
  activeChatId: string | null;
  messages: Message[];
  isStreaming: boolean;
  streamingBuffer: string;
  streamingModel: string | null;
  // Multi-model streaming state - buffers and content per model
  multiModelBuffers: Map<string, string>; // modelId -> content buffer
  multiModelStats: Map<string, any>; // modelId -> stats
  draftMessage: string;
  mode: 'auto' | 'manual';
  selectedModels: string[];
  routerDecision: { model: string; reasoning: string } | null;
  currentSummary: string | null;
  // Tree navigation state - maps parentId to the active child messageId
  activePath: Map<string | null, string>;
  // Abort controller for stopping generation
  abortController: AbortController | null;
  // Track partial content for auto-save during streaming
  partialContentMap: Map<string, string>; // messageId -> partial content
  // Track streaming message IDs for auto-save on interruption
  streamingMessageIds: string[];
  // Image generation options
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

  // Helper to get current state - defined inside factory to avoid circular reference
  const getState = (): ChatState => {
    let state: ChatState | undefined;
    const unsubscribe = subscribe(s => { state = s; });
    unsubscribe();
    return state!;
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

  // Extract image URLs from content (markdown, HTML, or direct URLs)
  const extractImagesFromContent = (content: string): Array<{ id: string; type: 'image'; url: string; name: string; timestamp: Date }> => {
    const images: Array<{ id: string; type: 'image'; url: string; name: string; timestamp: Date }> = [];
    const seenUrls = new Set<string>();

    if (!content || typeof content !== 'string') {
      return images;
    }

    // Match markdown image syntax: ![alt](url) or ![alt](url "title")
    // Handles base64 URLs by matching non-greedy until closing paren
    const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    while ((match = markdownImageRegex.exec(content)) !== null) {
      const url = match[2].trim();
      // Accept data:image URLs, http/https URLs
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

    // Match HTML img tags with improved regex that handles multiline and various attribute orders
    // This handles: <img src="..." alt="...">, <img alt="..." src="...">, etc.
    const htmlImageRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
    while ((match = htmlImageRegex.exec(content)) !== null) {
      const url = match[1];
      // Extract alt text if available
      const altMatch = match[0].match(/alt=["']([^"]*)["']/i);
      const alt = altMatch ? altMatch[1] : 'Generated image';

      // Accept data:image URLs, http/https URLs
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

    // Also match img tags with single quotes
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

    // Match direct image URLs anywhere in text (not just own line) with image extensions
    // Allows query parameters after the extension
    const directImageRegex = /(https?:\/\/[^\s<>"'\)]+\.(?:png|jpg|jpeg|gif|webp|svg|bmp))(?:\?[^\s<>"'\)]*)?/gi;
    while ((match = directImageRegex.exec(content)) !== null) {
      const url = match[1] + (match[0].includes('?') ? match[0].substring(match[0].indexOf('?')).split(/[\s<>'")\]]/)[0] : '');
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

    // Match base64 image data URIs that might not be in markdown or HTML
    // This regex handles longer base64 strings that might be truncated by other patterns
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

    // Debug logging - always log when checking, not just when found
    console.log('[extractImagesFromContent] Checking content length:', content.length, 'found images:', images.length);
    if (images.length > 0) {
      console.log('[extractImagesFromContent] Image URLs:', images.map(img => img.url.substring(0, 100) + '...'));
    }

    return images;
  };

  // Build the visible message list from the tree structure
  // activeSelections maps parentId -> selected child messageId
  const buildVisibleMessages = async (
    chatId: string, 
    activeSelections?: Map<string | null, string>
  ): Promise<Message[]> => {
    const allStoredMessages = await chatDB.getMessages(chatId);
    if (allStoredMessages.length === 0) return [];

    // Group messages by parentId to build the tree
    const childrenByParent = new Map<string | null, typeof allStoredMessages>();
    allStoredMessages.forEach(msg => {
      const parentId = msg.parentId ?? null;
      const siblings = childrenByParent.get(parentId) || [];
      siblings.push(msg);
      childrenByParent.set(parentId, siblings);
    });

    // Sort siblings by branchIndex
    childrenByParent.forEach((siblings, parentId) => {
      siblings.sort((a, b) => (a.branchIndex || 0) - (b.branchIndex || 0));
      childrenByParent.set(parentId, siblings);
    });

    // Build visible messages by following active selections
    const visibleMessages: Message[] = [];
    
    const buildFrom = (parentId: string | null) => {
      const siblings = childrenByParent.get(parentId) || [];
      if (siblings.length === 0) return;

      // Find which sibling to show
      // Use active selection if available, otherwise default to last (most recent)
      let activeMessage: typeof allStoredMessages[0] | undefined;
      
      if (activeSelections && activeSelections.has(parentId)) {
        const selectedId = activeSelections.get(parentId);
        activeMessage = siblings.find(s => s.id === selectedId);
      }
      
      // Fallback to last sibling if no selection or selection not found
      if (!activeMessage) {
        activeMessage = siblings[siblings.length - 1];
      }

      if (activeMessage) {
        // Extract generated images from content for assistant messages
        const generatedMedia = activeMessage.role === 'assistant' 
          ? extractImagesFromContent(activeMessage.content)
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

        // Recursively add children
        buildFrom(activeMessage.id);
      }
    };

    buildFrom(null);
    return visibleMessages;
  };

  // Build active path map from a target message (to that message and all its descendants)
  const buildActivePathFromMessage = async (
    chatId: string,
    targetMessageId: string
  ): Promise<Map<string | null, string>> => {
    const allStoredMessages = await chatDB.getMessages(chatId);
    const activePath = new Map<string | null, string>();
    
    // Build parent -> children map
    const childrenByParent = new Map<string | null, typeof allStoredMessages>();
    allStoredMessages.forEach(msg => {
      const parentId = msg.parentId ?? null;
      const siblings = childrenByParent.get(parentId) || [];
      siblings.push(msg);
      childrenByParent.set(parentId, siblings);
    });

    // First, trace UP from target to root to mark the path
    const pathMessageIds = new Set<string>();
    let currentId: string | null = targetMessageId;
    while (currentId) {
      pathMessageIds.add(currentId);
      const msg = allStoredMessages.find(m => m.id === currentId);
      currentId = msg?.parentId ?? null;
    }

    // Now build the active path - for each parent, select the child that's in our path
    childrenByParent.forEach((children, parentId) => {
      const childInPath = children.find(c => pathMessageIds.has(c.id));
      if (childInPath) {
        activePath.set(parentId, childInPath.id);
      } else {
        // For branches not in our path, select the last one (most recent)
        const sorted = [...children].sort((a, b) => (a.branchIndex || 0) - (b.branchIndex || 0));
        activePath.set(parentId, sorted[sorted.length - 1].id);
      }
    });

    return activePath;
  };

  // Get sibling messages for a given message
  const getSiblings = async (messageId: string): Promise<Message[]> => {
    const message = await chatDB.getMessage(messageId);
    if (!message) return [];
    
    const siblings = await chatDB.getSiblingMessages(message.parentId ?? null, message.chatId);
    
    // CRITICAL FIX: Filter siblings by role to prevent mixing user and assistant messages
    const filteredSiblings = siblings.filter(s => s.role === message.role);
    
    return filteredSiblings.map(s => {
      // Extract generated images from content for assistant messages
      const generatedMedia = s.role === 'assistant' 
        ? extractImagesFromContent(s.content)
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

  return {
    subscribe,
    
    setActiveChat: (chatId: string) => update(state => ({
      ...state,
      activeChatId: chatId,
      messages: [],
      streamingBuffer: '',
      isStreaming: false,
      activePath: new Map()
    })),

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
        const messages = await buildVisibleMessages(chatId, state.activePath);
        
        update(state => ({
          ...state,
          activeChatId: chatId,
          messages
          // Note: We intentionally don't override mode/selectedModels here
          // to preserve user's global model selection across chats
        }));
      } catch (error) {
        console.error('Failed to load chat:', error);
        toastStore.show('Failed to load chat', 'error');
      }
    },

    // Switch to a different version (sibling) of a message
    async switchVersion(messageId: string) {
      const state = getState();
      if (!state.activeChatId) return;

      try {
        // Get the message we're switching to
        const targetMessage = await chatDB.getMessage(messageId);
        if (!targetMessage) {
          console.error('Target message not found:', messageId);
          return;
        }

        // Build a complete active path from the target message
        // This ensures all descendants of the new branch are correctly selected
        const newActivePath = await buildActivePathFromMessage(state.activeChatId, messageId);

        // Rebuild visible messages with the new active path
        const messages = await buildVisibleMessages(state.activeChatId, newActivePath);

        update(state => ({
          ...state,
          messages,
          activePath: newActivePath
        }));
      } catch (error) {
        console.error('Failed to switch version:', error);
        toastStore.show('Failed to switch version', 'error');
      }
    },

    // Get siblings for a message (for the version selector)
    async getMessageSiblings(messageId: string): Promise<{ siblings: Message[], currentIndex: number }> {
      const siblings = await getSiblings(messageId);
      const currentIndex = siblings.findIndex(s => s.id === messageId);
      // Ensure currentIndex is valid - if not found, default to last sibling
      const validIndex = currentIndex >= 0 ? currentIndex : Math.max(0, siblings.length - 1);
      return { siblings, currentIndex: validIndex };
    },

    // Edit a user message - creates a new branch and regenerates response
    async editAndRegenerate(messageId: string, newContent: string) {
      const state = getState();
      if (!state.activeChatId) return;

      try {
        // Get the original message
        const originalMessage = await chatDB.getMessage(messageId);
        if (!originalMessage || originalMessage.role !== 'user') {
          console.error('Can only edit user messages');
          return;
        }

        // Get siblings to determine new branch index
        const siblings = await chatDB.getSiblingMessages(originalMessage.parentId ?? null, state.activeChatId);
        const newBranchIndex = siblings.length;

        // Create a new version of the user message (as a sibling, not replacement)
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

        await chatDB.saveMessage(newUserMessage);

        // Build new active path that includes the new message
        const newActivePath = new Map(state.activePath);
        newActivePath.set(originalMessage.parentId ?? null, newUserMessageId);

        // Reload to show the new branch
        const messages = await buildVisibleMessages(state.activeChatId, newActivePath);
        update(state => ({ ...state, messages, activePath: newActivePath }));

        // Now regenerate the AI response for the new user message
        await this.regenerateResponse(newUserMessageId);

      } catch (error) {
        console.error('Failed to edit and regenerate:', error);
        toastStore.show('Failed to edit message', 'error');
      }
    },

    // Regenerate AI response for a user message
    async regenerateResponse(userMessageId: string) {
      let state: ChatState;
      const unsubscribe = subscribe(s => { state = s; });
      unsubscribe();

      const apiKey = apiKeyStore.loadApiKey();
      if (!apiKey) {
        console.error('No API key set');
        toastStore.show('Please set your API key in settings', 'error');
        return;
      }

      if (!state!.activeChatId) return;

      // Get mode and models from modelStore (source of truth)
      const modelState = get(modelStore);
      const mode = modelState.autoMode ? 'auto' : 'manual';
      const selectedModels = modelState.selectedModels;

      const userMessage = await chatDB.getMessage(userMessageId);
      if (!userMessage) return;

      // Get current assistant siblings to determine branch index for the NEW message
      // We do this BEFORE deleting anything so we know the correct index
      const currentSiblings = await chatDB.getSiblingMessages(userMessageId, state!.activeChatId);
      const newBranchIndex = currentSiblings.length;

      // Create the branch FIRST - add an empty assistant message that will be filled during streaming
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

      // Save the empty message to create the branch
      await chatDB.saveMessage({
        id: assistantMessage.id,
        chatId: state!.activeChatId!,
        role: 'assistant',
        content: '',
        createdAt: assistantMessage.timestamp,
        parentId: userMessageId,
        branchIndex: newBranchIndex
      });

      // Update active path to show ONLY the new assistant message (hide old ones)
      const newActivePath = new Map(state!.activePath);
      newActivePath.set(userMessageId, assistantMessageId);

      // Rebuild visible messages to show only the new branch
      const visibleMessages = await buildVisibleMessages(state!.activeChatId!, newActivePath);

      // Create abort controller for this request
      const abortController = new AbortController();

      // Initialize tracking for partial content auto-save
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

      // Get the conversation history up to this message
      const path = await chatDB.getMessagePath(userMessageId);
      const conversationHistory = path.map(m => ({
        role: m.role,
        content: m.content
      }));

      try {
        const systemPrompt = systemPromptStore.getEffectivePrompt();
        const state = getState();
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
            imageOptions: state.imageOptions
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

        // OPTIMIZATION: Add timeout to prevent infinite loops
        const STREAM_TIMEOUT = 5 * 60 * 1000; // 5 minutes max
        const startTime = Date.now();

        while (true) {
          // Check for timeout
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
                // Update the message model as soon as we know it
                update(s => ({
                  ...s,
                  messages: s.messages.map(m => 
                    m.id === assistantMessageId ? { ...m, model: assistantModel } : m
                  )
                }));
                break;

              case 'content':
                assistantContent += event.content || '';
                // Extract images from content
                const generatedMediaRegen = extractImagesFromContent(assistantContent);
                // Update the existing message content directly and track partial content
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
                  // Check if chat title generation is enabled in settings
                  const settings = get(settingsStore);
                  if (!settings.chatTitleGeneration) {
                    break; // Skip title generation if disabled
                  }

                  const chat = await chatDB.getChat(state!.activeChatId!);
                  if (chat && (chat.title === 'New Chat' || !chat.title || chat.title.trim() === '')) {
                    // Create a fresh chat object with updated title and timestamp
                    const updatedChat = {
                      ...chat,
                      title: event.summary,
                      updatedAt: new Date()
                    };
                    await chatDB.saveChat(updatedChat);
                    // Dispatch event to update UI
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

        // Update the message with final content and stats
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
          isPartial: false // Mark as complete (not partial)
        });

        // Update the message in the store with final data
        update(s => ({
          ...s,
          messages: s.messages.map(m => 
            m.id === assistantMessageId 
              ? { ...m, content: assistantContent, model: assistantModel, stats: messageStats } 
              : m
          )
        }));

        // Update chat stats
        const allMessages = await chatDB.getMessages(state!.activeChatId!);
        const totalCost = allMessages.reduce((sum, m) => sum + (m.stats?.cost || 0), 0);
        const totalTokens = allMessages.reduce((sum, m) => 
          sum + (m.stats?.tokensInput || 0) + (m.stats?.tokensOutput || 0), 0
        );
        
        await chatDB.updateChatStats(state!.activeChatId!, {
          messageCount: allMessages.length,
          totalCost,
          totalTokens
        });
        
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('chat-updated'));
        }

        // Rebuild visible messages to ensure correct state
        const finalMessages = await buildVisibleMessages(state!.activeChatId!, newActivePath);
        update(s => ({ 
          ...s, 
          messages: finalMessages, 
          isStreaming: false, 
          streamingBuffer: '', 
          streamingModel: null, 
          abortController: null,
          partialContentMap: new Map(),
          streamingMessageIds: []
        }));

      } catch (error) {
        // Don't show error toast for user-initiated aborts
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
      }
    },

    async createChat(chatId: string, title: string = 'New Chat') {
      try {
        await chatDB.saveChat({
          id: chatId,
          title,
          mode: 'auto',
          createdAt: new Date(),
          updatedAt: new Date(),
          messageCount: 0,
          totalCost: 0,
          totalTokens: 0
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('chat-updated'));
        }
      } catch (error) {
        console.error('Failed to create chat:', error);
        toastStore.show('Failed to create chat', 'error');
      }
    },

    async sendMessage(content: string, attachments: any[] = [], isNewChat: boolean = false) {
      let state: ChatState;
      const unsubscribe = subscribe(s => { state = s; });
      unsubscribe();

      const apiKey = apiKeyStore.loadApiKey();
      if (!apiKey) {
        console.error('No API key set');
        toastStore.show('Please set your API key in settings', 'error');
        return;
      }

      // Get mode and models from modelStore (source of truth)
      const modelState = get(modelStore);
      const mode = modelState.autoMode ? 'auto' : 'manual';
      const selectedModels = modelState.selectedModels;

      // FIX: Only generate new chat if we don't have an active chat
      // isNewChat is only true when on /chat/new AND no activeChatId
      const chatId = (!state!.activeChatId) ? crypto.randomUUID() : state!.activeChatId;
      
      // Check if we need to navigate from /chat/new to the new chat URL
      // Only navigate if this is the first message (no active chat before)
      const needsNavigation = !state!.activeChatId && typeof window !== 'undefined';
      
      const existingChat = await chatDB.getChat(chatId);
      if (!existingChat) {
        // Generate title from first user message in parallel
        const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
        await this.createChat(chatId, title);
        update(s => ({ ...s, activeChatId: chatId }));
        
        // Dispatch event immediately to update sidebar with the new title
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('chat-updated'));
        }
        
        // Navigate to the new chat URL if we were on /chat/new
        if (needsNavigation) {
          replaceState(`/chat/${chatId}`, {});
        }
      }

      // Find the current leaf message to use as parent based on active path
      let parentId: string | null = null;
      const currentMessages = state!.messages;
      if (currentMessages.length > 0) {
        // Use the last visible message as parent
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

      // Update active path to include this new message
      const newActivePath = new Map(state!.activePath);
      newActivePath.set(parentId, userMessage.id);

      // Create assistant message placeholder(s) FIRST before streaming
      const isMultiModel = mode === 'manual' && selectedModels.length > 1;
      const assistantMessageIds: string[] = [];
      const assistantMessages: Message[] = [];

      if (isMultiModel && selectedModels.length > 0) {
        // Create placeholders for each model
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
          // Save placeholder to DB
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
          if (i === 0) {
            newActivePath.set(userMessage.id, assistantId);
          }
        }
      } else {
        // Single model - create one placeholder
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
        // Save placeholder to DB
        await chatDB.saveMessage({
          id: assistantId,
          chatId,
          role: 'assistant',
          content: '',
          createdAt: new Date(),
          parentId: userMessage.id,
          branchIndex: 0
        });
        newActivePath.set(userMessage.id, assistantId);
      }

      // Rebuild visible messages to show only the active assistant message
      const visibleMessages = await buildVisibleMessages(chatId, newActivePath);

      // Create abort controller for this request
      const abortController = new AbortController();

      // Initialize tracking for partial content auto-save
      const initialPartialContentMap = new Map<string, string>();
      for (const msg of assistantMessages) {
        initialPartialContentMap.set(msg.id, '');
      }

      update(s => ({
        ...s,
        activeChatId: chatId,
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

      try {
        const conversationMessages = state!.messages.map(m => ({
          role: m.role,
          content: m.content
        }));
        conversationMessages.push({ role: 'user', content });

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
            imageOptions: state!.imageOptions
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
        const assistantContents = new Map<string, string>(); // messageId -> content
        const assistantModels = new Map<string, string>(); // messageId -> model
        const messageStatsMap = new Map<string, any>(); // messageId -> stats
        const multiModelStats = new Map<string, any>(); // model -> stats

        // Initialize content tracking for each assistant message
        for (const msg of assistantMessages) {
          assistantContents.set(msg.id, '');
        }

        // OPTIMIZATION: Add timeout to prevent infinite loops
        const STREAM_TIMEOUT = 5 * 60 * 1000; // 5 minutes max
        const startTime = Date.now();

        while (true) {
          // Check for timeout
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
                // Update the first message's model
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
                  // Find the message for this model
                  const msgIndex = selectedModels.indexOf(event.model);
                  if (msgIndex >= 0 && msgIndex < assistantMessages.length) {
                    const msgId = assistantMessages[msgIndex].id;
                    const currentContent = assistantContents.get(msgId) || '';
                    const newContent = currentContent + (event.content || '');
                    assistantContents.set(msgId, newContent);
                    // Extract images from content
                    const generatedMedia = extractImagesFromContent(newContent);
                    // Update the message directly and track partial content
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
                  }
                } else if (assistantMessages.length === 1) {
                  // Single model mode
                  const msgId = assistantMessages[0].id;
                  const currentContent = assistantContents.get(msgId) || '';
                  const newContent = currentContent + (event.content || '');
                  assistantContents.set(msgId, newContent);
                  // Extract images from content
                  const generatedMedia = extractImagesFromContent(newContent);
                  // Update the message and track partial content
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
                  // Check if chat title generation is enabled in settings
                  const settings = get(settingsStore);
                  if (!settings.chatTitleGeneration) {
                    break; // Skip title generation if disabled
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

        // Update all messages in DB with final content
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
            isPartial: false // Mark as complete (not partial)
          });

          // Update in store
          update(s => ({
            ...s,
            messages: s.messages.map(m => 
              m.id === msg.id 
                ? { ...m, content: finalContent, model: finalModel, stats: finalStats } 
                : m
            )
          }));
        }

        const allStoredMessages = await chatDB.getMessages(chatId);
        const totalCost = allStoredMessages.reduce((sum, m) => sum + (m.stats?.cost || 0), 0);
        const totalTokens = allStoredMessages.reduce((sum, m) => 
          sum + (m.stats?.tokensInput || 0) + (m.stats?.tokensOutput || 0), 0
        );
        
        await chatDB.updateChatStats(chatId, {
          messageCount: allStoredMessages.length,
          totalCost,
          totalTokens
        });
        
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('chat-updated'));
        }

        // Rebuild visible messages to ensure correct final state
        const finalMessages = await buildVisibleMessages(chatId, newActivePath);
        update(s => ({ 
          ...s, 
          messages: finalMessages,
          isStreaming: false,
          streamingBuffer: '',
          streamingModel: null,
          abortController: null,
          partialContentMap: new Map(),
          streamingMessageIds: []
        }));

      } catch (error) {
        // Don't show error toast for user-initiated aborts
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
          abortController: null,
          partialContentMap: new Map(),
          streamingMessageIds: []
        }));
      }
    },

    async stopGeneration() {
      const state = getState();
      if (state.abortController) {
        state.abortController.abort();
        
        // Auto-save partial content for all streaming messages
        const partialContentMap = state.partialContentMap;
        const streamingMessageIds = state.streamingMessageIds;
        
        if (streamingMessageIds.length > 0 && partialContentMap.size > 0 && state.activeChatId) {
          try {
            for (const messageId of streamingMessageIds) {
              const partialContent = partialContentMap.get(messageId);
              if (partialContent && partialContent.trim().length > 0) {
                // Get the existing message from DB
                const existingMessage = await chatDB.getMessage(messageId);
                if (existingMessage) {
                  // Save the partial content with isPartial flag
                  await chatDB.saveMessage({
                    ...existingMessage,
                    content: partialContent,
                    isPartial: true // Mark as partial/incomplete
                  });
                }
              }
            }
            
            // Show toast notification about saved partial content
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

    reset: () => set({
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
    })
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
