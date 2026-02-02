import { PersistedState } from 'runed';
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
	theme: 'auto',
	fontSize: 14,
	compactMode: false,
	codeSyntaxTheme: 'github-dark',
	privacyOnlyProviders: false,
	disableChatStoring: false,
	webSearch: {
		enabled: false,
		engine: undefined,
		maxResults: 5,
		searchContextSize: 'medium'
	}
};

// Create a persisted state for user settings
const settingsState = new PersistedState<UserSettings>('userSettings', defaultSettings);

// Reactive getters and setters for settings
export const settings = {
	get current() {
		return settingsState.current;
	},
	update(updates: Partial<UserSettings>) {
		settingsState.current = { ...settingsState.current, ...updates };
	},
	reset() {
		settingsState.current = defaultSettings;
	}
};

// Derived values as getter functions
export const theme = {
	get current() {
		return settingsState.current.theme;
	}
};

export const isCompactMode = {
	get current() {
		return settingsState.current.compactMode;
	}
};

export const fontSize = {
	get current() {
		return settingsState.current.fontSize;
	}
};

export const isChatStoringDisabled = {
	get current() {
		return settingsState.current.disableChatStoring;
	}
};

// Helper to get effective theme
export function getEffectiveTheme(): 'dark' | 'light' {
	const currentTheme = settingsState.current.theme;
	if (currentTheme === 'auto') {
		if (typeof window !== 'undefined') {
			return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		}
		return 'dark';
	}
	return currentTheme;
}

// Export the raw state for advanced use cases
export { settingsState };
