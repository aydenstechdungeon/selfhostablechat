import { writable, derived } from 'svelte/store';

export interface StreamingChatState {
  isStreaming: boolean;
  completedAt: Date | null;
  hasNewMessages: boolean;
  chatName: string;
  // Abort controller for stopping the stream - persisted here so it survives chat switching
  abortController?: AbortController;
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

const initialState: StreamingState = {
  streamingChats: new Map(),
  activeChatId: null
};

function createStreamingStore() {
  const { subscribe, set, update } = writable<StreamingState>(initialState);

  return {
    subscribe,
    
    // Set which chat is currently visible
    setActiveChat: (chatId: string | null) => update(state => ({
      ...state,
      activeChatId: chatId
    })),
    
    // Mark a chat as streaming
    startStreaming: (chatId: string, chatName: string = 'Unknown Chat', abortController?: AbortController) => update(state => {
      const newMap = new Map(state.streamingChats);
      // Preserve existing chat name if already present
      const existing = newMap.get(chatId);
      newMap.set(chatId, {
        isStreaming: true,
        completedAt: null,
        hasNewMessages: false,
        chatName: existing?.chatName || chatName,
        abortController: abortController || existing?.abortController
      });
      return { ...state, streamingChats: newMap };
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
        // Preserve abortController for potential cleanup
        abortController: existing?.abortController
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
      
      return { ...state, streamingChats: newMap };
    }),
    
    // Update chat name for a streaming chat
    updateChatName: (chatId: string, chatName: string) => update(state => {
      const newMap = new Map(state.streamingChats);
      const existing = newMap.get(chatId);
      if (existing) {
        newMap.set(chatId, { ...existing, chatName });
      }
      return { ...state, streamingChats: newMap };
    }),
    
    // Mark a chat's new messages as seen
    clearNewMessages: (chatId: string) => update(state => {
      const newMap = new Map(state.streamingChats);
      const existing = newMap.get(chatId);
      if (existing) {
        newMap.set(chatId, { ...existing, hasNewMessages: false });
      }
      return { ...state, streamingChats: newMap };
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
      return { ...state, streamingChats: newMap };
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
    
    // Subscribe to background completion notifications
    onBackgroundComplete: (callback: BackgroundCompletionCallback) => {
      completionCallbacks.add(callback);
      return () => {
        completionCallbacks.delete(callback);
      };
    },
    
    reset: () => set(initialState)
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
