import { writable } from 'svelte/store';

const STORAGE_KEY = 'openrouter_api_key';

interface ApiKeyState {
  apiKey: string | null;
  isLoading: boolean;
  error: string | null;
}

const loadApiKey = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
};

const createApiKeyStore = () => {
  const { subscribe, set, update } = writable<ApiKeyState>({
    apiKey: loadApiKey(),
    isLoading: false,
    error: null
  });

  return {
    subscribe,

    loadApiKey() {
      const key = loadApiKey();
      update(state => ({
        ...state,
        apiKey: key,
        isLoading: false,
        error: null
      }));
      return key;
    },

    saveApiKey(apiKey: string) {
      update(state => ({ ...state, isLoading: true, error: null }));
      
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, apiKey);
        }
        
        update(state => ({
          ...state,
          apiKey,
          isLoading: false,
          error: null
        }));
        
        return true;
      } catch (error) {
        update(state => ({
          ...state,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to save API key'
        }));
        return false;
      }
    },

    deleteApiKey() {
      update(state => ({ ...state, isLoading: true, error: null }));
      
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY);
        }
        
        update(state => ({
          ...state,
          apiKey: null,
          isLoading: false,
          error: null
        }));
        
        return true;
      } catch (error) {
        update(state => ({
          ...state,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to delete API key'
        }));
        return false;
      }
    },

    clearError() {
      update(state => ({ ...state, error: null }));
    },

    reset() {
      set({
        apiKey: null,
        isLoading: false,
        error: null
      });
    }
  };
};

export const apiKeyStore = createApiKeyStore();
