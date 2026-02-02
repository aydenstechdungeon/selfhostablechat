import { PersistedState } from 'runed';

interface ApiKeyState {
	apiKey: string | null;
	isLoading: boolean;
	error: string | null;
}

const defaultState: ApiKeyState = {
	apiKey: null,
	isLoading: false,
	error: null
};

// Create persisted state for API key (stored separately for security considerations)
const apiKeyState = new PersistedState<string | null>('openrouter_api_key', null);

// Runtime state (not persisted)
let isLoading = $state(false);
let error = $state<string | null>(null);

export const apiKey = {
	get current() {
		return apiKeyState.current;
	},
	get isLoading() {
		return isLoading;
	},
	get error() {
		return error;
	},
	save(key: string) {
		isLoading = true;
		error = null;
		try {
			apiKeyState.current = key;
			isLoading = false;
			return true;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to save API key';
			isLoading = false;
			return false;
		}
	},
	delete() {
		isLoading = true;
		error = null;
		try {
			apiKeyState.current = null;
			isLoading = false;
			return true;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to delete API key';
			isLoading = false;
			return false;
		}
	},
	clearError() {
		error = null;
	},
	reset() {
		apiKeyState.current = null;
		isLoading = false;
		error = null;
	}
};

// Export raw state for advanced use
export { apiKeyState };
