import { PersistedState } from '$lib/stores/persisted-state.svelte';

interface UIState {
	leftSidebarCollapsed: boolean;
	rightSidebarExpanded: boolean;
	leftSidebarWidth: number;
	multiModelDisplayMode: 'split' | 'stacked' | 'tabbed';
	theme: 'dark' | 'light' | 'auto';
	mobileMenuOpen: boolean;
}

const DEFAULT_SIDEBAR_WIDTH = 320;
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 500;

const defaultState: UIState = {
	leftSidebarCollapsed: false,
	rightSidebarExpanded: false,
	leftSidebarWidth: DEFAULT_SIDEBAR_WIDTH,
	multiModelDisplayMode: 'split',
	theme: 'dark',
	mobileMenuOpen: false
};

// Create persisted state for UI preferences
const uiState = new PersistedState<UIState>('uiState', defaultState);

export const ui = {
	get current() {
		return uiState.current;
	},
	toggleLeftSidebar() {
		uiState.current = {
			...uiState.current,
			leftSidebarCollapsed: !uiState.current.leftSidebarCollapsed
		};
	},
	toggleRightSidebar() {
		uiState.current = {
			...uiState.current,
			rightSidebarExpanded: !uiState.current.rightSidebarExpanded
		};
	},
	setLeftSidebarWidth(width: number) {
		const clampedWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, width));
		uiState.current = {
			...uiState.current,
			leftSidebarWidth: clampedWidth
		};
	},
	setMultiModelDisplayMode(mode: 'split' | 'stacked' | 'tabbed') {
		uiState.current = {
			...uiState.current,
			multiModelDisplayMode: mode
		};
	},
	setTheme(theme: 'dark' | 'light' | 'auto') {
		uiState.current = {
			...uiState.current,
			theme
		};
	},
	toggleMobileMenu() {
		uiState.current = {
			...uiState.current,
			mobileMenuOpen: !uiState.current.mobileMenuOpen
		};
	},
	get effectiveTheme(): 'dark' | 'light' {
		const currentTheme = uiState.current.theme;
		if (currentTheme === 'auto') {
			if (typeof window !== 'undefined') {
				return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
			}
			return 'dark';
		}
		return currentTheme;
	},
	reset() {
		uiState.current = defaultState;
	}
};

// Derived helpers
export const sidebar = {
	get isCollapsed() {
		return uiState.current.leftSidebarCollapsed;
	},
	get width() {
		return uiState.current.leftSidebarWidth;
	}
};

export const theme = {
	get current() {
		return uiState.current.theme;
	}
};

export { uiState, DEFAULT_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH };
