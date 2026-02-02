import { writable } from 'svelte/store';
import type { UserSettings } from '../types';

const defaultSettings: UserSettings = {
  defaultModel: 'auto',
  autoSaveFrequency: 'realtime',
  chatTitleGeneration: true,
  streamingAnimation: true,
  multiModelDisplayMode: 'split',
  pinnedModels: [],
  modelCostAlert: {
    enabled: false,
    threshold: 1.0
  },
  theme: 'auto', // Default to auto (system preference)
  fontSize: 14,
  compactMode: false,
  codeSyntaxTheme: 'github-dark',
  // Privacy-focused settings (default to false for backwards compatibility)
  privacyOnlyProviders: false,
  disableChatStoring: false
};

const loadSettings = (): UserSettings => {
  if (typeof window === 'undefined') return defaultSettings;
  
  const stored = localStorage.getItem('userSettings');
  if (stored) {
    try {
      return { ...defaultSettings, ...JSON.parse(stored) };
    } catch (e) {
      console.error('Failed to parse stored settings:', e);
    }
  }
  return defaultSettings;
};

const createSettingsStore = () => {
  const { subscribe, set, update } = writable<UserSettings>(loadSettings());

  const saveToLocalStorage = (settings: UserSettings) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('userSettings', JSON.stringify(settings));
    }
  };

  return {
    subscribe,
    updateSettings: (updates: Partial<UserSettings>) => update(state => {
      const newState = { ...state, ...updates };
      saveToLocalStorage(newState);
      return newState;
    }),
    reset: () => {
      set(defaultSettings);
      saveToLocalStorage(defaultSettings);
    }
  };
};

export const settingsStore = createSettingsStore();
