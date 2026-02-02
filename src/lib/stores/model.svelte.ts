import { PersistedState } from 'runed';
import type { CustomModel } from './modelStore';
export type { CustomModel } from './modelStore';

interface ModelState {
	selectedModels: string[];
	multiModelMode: boolean;
	autoMode: boolean;
	pinnedModels: string[];
	recentModels: string[];
}

interface HiddenModelsState {
	hiddenIds: string[];
}

interface CustomModelsState {
	models: CustomModel[];
}

const defaultModelState: ModelState = {
	selectedModels: [],
	multiModelMode: false,
	autoMode: true,
	pinnedModels: [],
	recentModels: []
};

const defaultHiddenModels: HiddenModelsState = {
	hiddenIds: []
};

const defaultCustomModels: CustomModelsState = {
	models: []
};

// Create persisted states
const modelState = new PersistedState<ModelState>('modelStore', defaultModelState);
const hiddenModelsState = new PersistedState<HiddenModelsState>('hiddenModels', defaultHiddenModels);
const customModelsState = new PersistedState<CustomModelsState>('customModels', defaultCustomModels);

// Main model store
export const model = {
	get current() {
		return modelState.current;
	},
	selectModel(modelId: string) {
		modelState.current = {
			...modelState.current,
			selectedModels: [modelId],
			multiModelMode: false,
			autoMode: modelId === 'auto',
			recentModels: [modelId, ...modelState.current.recentModels.filter(m => m !== modelId)].slice(0, 10)
		};
	},
	selectMultipleModels(modelIds: string[]) {
		modelState.current = {
			...modelState.current,
			selectedModels: modelIds,
			multiModelMode: true,
			autoMode: false
		};
	},
	toggleMultiModelMode() {
		modelState.current = {
			...modelState.current,
			multiModelMode: !modelState.current.multiModelMode
		};
	},
	setAutoMode(enabled: boolean) {
		modelState.current = {
			...modelState.current,
			autoMode: enabled,
			multiModelMode: enabled ? false : modelState.current.multiModelMode,
			selectedModels: enabled ? [] : modelState.current.selectedModels
		};
	},
	pinModel(modelId: string) {
		if (!modelState.current.pinnedModels.includes(modelId)) {
			modelState.current = {
				...modelState.current,
				pinnedModels: [...modelState.current.pinnedModels, modelId]
			};
		}
	},
	unpinModel(modelId: string) {
		modelState.current = {
			...modelState.current,
			pinnedModels: modelState.current.pinnedModels.filter(m => m !== modelId)
		};
	},
	reset() {
		modelState.current = defaultModelState;
	}
};

// Derived values
export const currentModel = {
	get current() {
		return modelState.current.selectedModels[0] || 'auto';
	}
};

export const isMultiModel = {
	get current() {
		return modelState.current.multiModelMode && modelState.current.selectedModels.length > 1;
	}
};

// Hidden models store
export const hiddenModels = {
	get current() {
		return hiddenModelsState.current;
	},
	hideModel(id: string) {
		if (!hiddenModelsState.current.hiddenIds.includes(id)) {
			hiddenModelsState.current = {
				hiddenIds: [...hiddenModelsState.current.hiddenIds, id]
			};
		}
	},
	showModel(id: string) {
		hiddenModelsState.current = {
			hiddenIds: hiddenModelsState.current.hiddenIds.filter(hiddenId => hiddenId !== id)
		};
	},
	toggleModel(id: string) {
		const isHidden = hiddenModelsState.current.hiddenIds.includes(id);
		hiddenModelsState.current = {
			hiddenIds: isHidden
				? hiddenModelsState.current.hiddenIds.filter(hiddenId => hiddenId !== id)
				: [...hiddenModelsState.current.hiddenIds, id]
		};
	},
	reset() {
		hiddenModelsState.current = defaultHiddenModels;
	}
};

// Custom models store
export const customModels = {
	get current() {
		return customModelsState.current;
	},
	addModel(model: CustomModel) {
		customModelsState.current = {
			models: [...customModelsState.current.models, model]
		};
	},
	updateModel(id: string, updates: Partial<CustomModel>) {
		customModelsState.current = {
			models: customModelsState.current.models.map(m =>
				m.id === id ? { ...m, ...updates } : m
			)
		};
	},
	removeModel(id: string) {
		customModelsState.current = {
			models: customModelsState.current.models.filter(m => m.id !== id)
		};
	},
	reset() {
		customModelsState.current = defaultCustomModels;
	}
};

// Combined all models (computed on access)
export const allModels = {
	get current() {
		// This will be combined with AVAILABLE_MODELS from modelStore
		return customModelsState.current.models;
	}
};

// Reset all model settings
export function resetAllModelSettings() {
	model.reset();
	hiddenModels.reset();
	customModels.reset();
}

// Export raw states for advanced use
export { modelState, hiddenModelsState, customModelsState };
