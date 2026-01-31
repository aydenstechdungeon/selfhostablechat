import { writable } from 'svelte/store';

interface UIState {
  leftSidebarCollapsed: boolean;
  rightSidebarExpanded: boolean;
  leftSidebarWidth: number;
  multiModelDisplayMode: 'split' | 'stacked' | 'tabbed';
  theme: 'dark' | 'light' | 'auto';
  mobileMenuOpen: boolean;
}

const STORAGE_KEY = 'uiState';
const DEFAULT_SIDEBAR_WIDTH = 320;
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 500;

const getInitialState = (): UIState => {
  if (typeof window === 'undefined') {
    return {
      leftSidebarCollapsed: false,
      rightSidebarExpanded: false,
      leftSidebarWidth: DEFAULT_SIDEBAR_WIDTH,
      multiModelDisplayMode: 'split',
      theme: 'dark',
      mobileMenuOpen: false
    };
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return {
        leftSidebarCollapsed: parsed.leftSidebarCollapsed ?? false,
        rightSidebarExpanded: parsed.rightSidebarExpanded ?? false,
        leftSidebarWidth: parsed.leftSidebarWidth ?? DEFAULT_SIDEBAR_WIDTH,
        multiModelDisplayMode: parsed.multiModelDisplayMode ?? 'split',
        theme: parsed.theme ?? 'dark',
        mobileMenuOpen: parsed.mobileMenuOpen ?? false
      };
    } catch (e) {
      console.error('Failed to parse UI state:', e);
    }
  }

  // Check for theme in old settings store for migration
  const userSettings = localStorage.getItem('userSettings');
  if (userSettings) {
    try {
      const parsed = JSON.parse(userSettings);
      if (parsed.theme) {
        return {
          leftSidebarCollapsed: false,
          rightSidebarExpanded: false,
          leftSidebarWidth: DEFAULT_SIDEBAR_WIDTH,
          multiModelDisplayMode: 'split',
          theme: parsed.theme,
          mobileMenuOpen: false
        };
      }
    } catch (e) {
      console.error('Failed to parse user settings:', e);
    }
  }

  return {
    leftSidebarCollapsed: false,
    rightSidebarExpanded: false,
    leftSidebarWidth: DEFAULT_SIDEBAR_WIDTH,
    multiModelDisplayMode: 'split',
    theme: 'dark',
    mobileMenuOpen: false
  };
};

const createUIStore = () => {
  const { subscribe, set, update } = writable<UIState>(getInitialState());

  const saveToStorage = (state: UIState) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  };

  const getEffectiveTheme = (theme: 'dark' | 'light' | 'auto'): 'dark' | 'light' => {
    if (theme === 'auto') {
      if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'dark';
    }
    return theme;
  };

  return {
    subscribe,
    toggleLeftSidebar: () => update(state => {
      const newState = { ...state, leftSidebarCollapsed: !state.leftSidebarCollapsed };
      saveToStorage(newState);
      return newState;
    }),
    toggleRightSidebar: () => update(state => {
      const newState = { ...state, rightSidebarExpanded: !state.rightSidebarExpanded };
      saveToStorage(newState);
      return newState;
    }),
    setLeftSidebarWidth: (width: number) => update(state => {
      const clampedWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, width));
      const newState = { ...state, leftSidebarWidth: clampedWidth };
      saveToStorage(newState);
      return newState;
    }),
    setMultiModelDisplayMode: (mode: 'split' | 'stacked' | 'tabbed') => 
      update(state => {
        const newState = { ...state, multiModelDisplayMode: mode };
        saveToStorage(newState);
        return newState;
      }),
    setTheme: (theme: 'dark' | 'light' | 'auto') => update(state => {
      const newState = { ...state, theme };
      saveToStorage(newState);
      // Also sync to settings store for backward compatibility
      if (typeof window !== 'undefined') {
        const userSettings = localStorage.getItem('userSettings');
        if (userSettings) {
          try {
            const parsed = JSON.parse(userSettings);
            parsed.theme = theme;
            localStorage.setItem('userSettings', JSON.stringify(parsed));
          } catch (e) {
            console.error('Failed to sync theme to settings:', e);
          }
        }
      }
      return newState;
    }),
    getEffectiveTheme: () => {
      let currentTheme: 'dark' | 'light' | 'auto' = 'dark';
      const unsubscribe = subscribe(s => { currentTheme = s.theme; });
      unsubscribe();
      return getEffectiveTheme(currentTheme);
    },
    toggleMobileMenu: () => update(state => {
      const newState = { ...state, mobileMenuOpen: !state.mobileMenuOpen };
      saveToStorage(newState);
      return newState;
    }),
    reset: () => {
      const defaultState: UIState = {
        leftSidebarCollapsed: false,
        rightSidebarExpanded: false,
        leftSidebarWidth: DEFAULT_SIDEBAR_WIDTH,
        multiModelDisplayMode: 'split',
        theme: 'dark',
        mobileMenuOpen: false
      };
      set(defaultState);
      saveToStorage(defaultState);
    }
  };
};

export const uiStore = createUIStore();
