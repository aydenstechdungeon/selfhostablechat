import { writable, derived, get } from 'svelte/store';

export interface StreamingChatState {
  isStreaming: boolean;
  completedAt: Date | null;
  hasNewMessages: boolean;
  chatName: string;
  // Abort controller for stopping the stream - persisted here so it survives chat switching
  abortController?: AbortController;
  // Timestamp when streaming started (for recovery after page refresh)
  startedAt?: Date;
  // Last content received (for recovery)
  lastContent?: string;
}

interface StreamingState {
  // Map of chatId -> streaming state
  streamingChats: Map<string, StreamingChatState>;
  // Currently visible/active chat
  activeChatId: string | null;
}

// Callback type for background completion notifications
export type BackgroundCompletionCallback = (chatId: string, chatName: string) => void;

// Store callbacks for background completion notifications
const completionCallbacks: Set<BackgroundCompletionCallback> = new Set();

const STORAGE_KEY = 'ai-chat-streaming-state';

// Serializable version of streaming state for localStorage
interface SerializableChatState {
  isStreaming: boolean;
  completedAt: string | null;
  hasNewMessages: boolean;
  chatName: string;
  startedAt?: string;
  lastContent?: string;
}

interface SerializableStreamingState {
  streamingChats: Record<string, SerializableChatState>;
  activeChatId: string | null;
}

// Load persisted state from localStorage
function loadPersistedState(): SerializableStreamingState | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load persisted streaming state:', e);
  }
  return null;
}

// Save state to localStorage (without AbortController - can't be serialized)
function persistState(state: StreamingState) {
  if (typeof window === 'undefined') return;
  try {
    const serializable: SerializableStreamingState = {
      streamingChats: {},
      activeChatId: state.activeChatId
    };
    state.streamingChats.forEach((chatState, chatId) => {
      serializable.streamingChats[chatId] = {
        isStreaming: chatState.isStreaming,
        completedAt: chatState.completedAt?.toISOString() || null,
        hasNewMessages: chatState.hasNewMessages,
        chatName: chatState.chatName,
        startedAt: chatState.startedAt?.toISOString(),
        lastContent: chatState.lastContent
      };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch (e) {
    console.error('Failed to persist streaming state:', e);
  }
}

// Clear persisted state
function clearPersistedState() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear persisted streaming state:', e);
  }
}

// Initialize state from localStorage or default
function getInitialState(): StreamingState {
  const persisted = loadPersistedState();
  if (persisted) {
    const streamingChats = new Map<string, StreamingChatState>();
    Object.entries(persisted.streamingChats).forEach(([chatId, chatState]) => {
      // Only restore if streaming was active and started recently (< 5 minutes ago)
      // This prevents showing "streaming" state for old abandoned streams
      const startedAt = chatState.startedAt ? new Date(chatState.startedAt) : null;
      const isRecent = startedAt && (Date.now() - startedAt.getTime()) < 5 * 60 * 1000;

      if (chatState.isStreaming && isRecent) {
        streamingChats.set(chatId, {
          isStreaming: true,
          completedAt: null,
          hasNewMessages: true, // Mark as new since user refreshed
          chatName: chatState.chatName,
          startedAt,
          lastContent: chatState.lastContent
        });
      } else if (!chatState.isStreaming && chatState.hasNewMessages) {
        // Preserve completed chats with new messages
        streamingChats.set(chatId, {
          isStreaming: false,
          completedAt: chatState.completedAt ? new Date(chatState.completedAt) : null,
          hasNewMessages: true,
          chatName: chatState.chatName,
          startedAt: startedAt || undefined,
          lastContent: chatState.lastContent
        });
      }
    });
    return { streamingChats, activeChatId: persisted.activeChatId };
  }
  return { streamingChats: new Map(), activeChatId: null };
}

const initialState: StreamingState = getInitialState();

function createStreamingStore() {
  const { subscribe, set, update } = writable<StreamingState>(initialState);

  // Subscribe to changes and persist to localStorage
  subscribe(state => {
    persistState(state);
  });

  return {
    subscribe,

    // Set which chat is currently visible
    setActiveChat: (chatId: string | null) => update(state => {
      const newState = { ...state, activeChatId: chatId };
      persistState(newState);
      return newState;
    }),

    // Mark a chat as streaming
    startStreaming: (chatId: string, chatName: string = 'Unknown Chat', abortController?: AbortController) => update(state => {
      const newMap = new Map(state.streamingChats);
      // Preserve existing chat name if already present
      const existing = newMap.get(chatId);
      const startedAt = existing?.startedAt || new Date();
      newMap.set(chatId, {
        isStreaming: true,
        completedAt: null,
        hasNewMessages: existing?.hasNewMessages || false,
        chatName: existing?.chatName || chatName,
        abortController: abortController || existing?.abortController,
        startedAt,
        lastContent: existing?.lastContent
      });
      const newState = { ...state, streamingChats: newMap };
      persistState(newState);
      return newState;
    }),

    // Update last content for recovery after page refresh
    updateLastContent: (chatId: string, content: string) => update(state => {
      const newMap = new Map(state.streamingChats);
      const existing = newMap.get(chatId);
      if (existing && existing.isStreaming) {
        newMap.set(chatId, { ...existing, lastContent: content });
        const newState = { ...state, streamingChats: newMap };
        persistState(newState);
        return newState;
      }
      return state;
    }),

    // Mark a chat as completed
    completeStreaming: (chatId: string, chatName?: string) => update(state => {
      const newMap = new Map(state.streamingChats);
      const existing = newMap.get(chatId);
      const isBackgroundCompletion = state.activeChatId !== chatId;

      newMap.set(chatId, {
        isStreaming: false,
        completedAt: new Date(),
        hasNewMessages: existing?.hasNewMessages || isBackgroundCompletion,
        chatName: chatName || existing?.chatName || 'Unknown Chat',
        // Preserve startedAt for reference
        startedAt: existing?.startedAt,
        // Clear last content on complete
        lastContent: undefined
      });

      // Trigger background completion callbacks if this is a background chat
      if (isBackgroundCompletion) {
        const name = chatName || existing?.chatName || 'Unknown Chat';
        completionCallbacks.forEach(callback => {
          try {
            callback(chatId, name);
          } catch (e) {
            console.error('Error in completion callback:', e);
          }
        });
      }

      const newState = { ...state, streamingChats: newMap };
      persistState(newState);
      return newState;
    }),

    // Update chat name for a streaming chat
    updateChatName: (chatId: string, chatName: string) => update(state => {
      const newMap = new Map(state.streamingChats);
      const existing = newMap.get(chatId);
      if (existing) {
        newMap.set(chatId, { ...existing, chatName });
        const newState = { ...state, streamingChats: newMap };
        persistState(newState);
        return newState;
      }
      return state;
    }),

    // Mark a chat's new messages as seen
    clearNewMessages: (chatId: string) => update(state => {
      const newMap = new Map(state.streamingChats);
      const existing = newMap.get(chatId);
      if (existing) {
        newMap.set(chatId, { ...existing, hasNewMessages: false });
        const newState = { ...state, streamingChats: newMap };
        persistState(newState);
        return newState;
      }
      return state;
    }),

    // Stop/cancel streaming for a chat
    stopStreaming: (chatId: string) => update(state => {
      const newMap = new Map(state.streamingChats);
      const existing = newMap.get(chatId);
      // Abort the stream if there's an abortController
      if (existing?.abortController) {
        try {
          existing.abortController.abort();
        } catch (e) {
          // Ignore abort errors
        }
      }
      newMap.delete(chatId);
      const newState = { ...state, streamingChats: newMap };
      persistState(newState);
      return newState;
    }),

    // Get the abortController for a specific chat (to allow stopping from anywhere)
    getAbortController: (chatId: string): AbortController | undefined => {
      let result: AbortController | undefined;
      const unsubscribe = subscribe(state => {
        result = state.streamingChats.get(chatId)?.abortController;
      });
      unsubscribe();
      return result;
    },

    // Check if any chat is streaming (for global indicators)
    isAnyStreaming: () => {
      let result = false;
      const unsubscribe = subscribe(state => {
        result = Array.from(state.streamingChats.values()).some(s => s.isStreaming);
      });
      unsubscribe();
      return result;
    },

    // Get state for a specific chat
    getChatState: (chatId: string): StreamingChatState | undefined => {
      let result: StreamingChatState | undefined;
      const unsubscribe = subscribe(state => {
        result = state.streamingChats.get(chatId);
      });
      unsubscribe();
      return result;
    },

    // Check if a specific chat is streaming
    isChatStreaming: (chatId: string): boolean => {
      let result = false;
      const unsubscribe = subscribe(state => {
        const state_data = state.streamingChats.get(chatId);
        result = state_data?.isStreaming || false;
      });
      unsubscribe();
      return result;
    },

    // Get all currently streaming chats (for checking interrupted streams on page load)
    getAllStreamingChats: (): Array<{ chatId: string; state: StreamingChatState }> => {
      let result: Array<{ chatId: string; state: StreamingChatState }> = [];
      const unsubscribe = subscribe(state => {
        result = Array.from(state.streamingChats.entries())
          .filter(([_, s]) => s.isStreaming)
          .map(([chatId, state]) => ({ chatId, state }));
      });
      unsubscribe();
      return result;
    },

    // Subscribe to background completion notifications
    onBackgroundComplete: (callback: BackgroundCompletionCallback) => {
      completionCallbacks.add(callback);
      return () => {
        completionCallbacks.delete(callback);
      };
    },

    // Clear all persisted state (useful for logout/reset)
    clearPersisted: () => {
      clearPersistedState();
    },

    reset: () => {
      clearPersistedState();
      set({ streamingChats: new Map(), activeChatId: null });
    }
  };
}

export const streamingStore = createStreamingStore();

// Derived store for the currently active chat's streaming state
export const activeChatStreaming = derived(
  streamingStore,
  $state => $state.activeChatId ? $state.streamingChats.get($state.activeChatId) : undefined
);

// Derived store to check if any chat has completed messages waiting
export const hasCompletedChats = derived(
  streamingStore,
  $state => Array.from($state.streamingChats.entries()).filter(([_, s]) => s.hasNewMessages)
);

// Derived store to check if any chat is currently streaming
export const isAnyChatStreaming = derived(
  streamingStore,
  $state => Array.from($state.streamingChats.values()).some(s => s.isStreaming)
);
