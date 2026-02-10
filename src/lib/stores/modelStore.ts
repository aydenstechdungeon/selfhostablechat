import { writable, derived } from 'svelte/store';
import type { Model } from '../types';

interface ModelState {
  selectedModels: string[];
  multiModelMode: boolean;
  autoMode: boolean;
  pinnedModels: string[];
  recentModels: string[];
}

export interface CustomModel {
  id: string;
  name: string;
  displayName: string;
  brand: string;
  category: string;
  contextWindow: number;
  pricePer1M: { input: number; output: number };
  capabilities: string[];
  supportsImages?: boolean;
  supportsImageGeneration?: boolean;
  isRecommended?: boolean;
  isAutoSelectable?: boolean;
  isCustom: true;
  privacyFocused?: boolean;
}

const STORAGE_KEY = 'modelStore';
const CUSTOM_MODELS_KEY = 'customModels';
const HIDDEN_MODELS_KEY = 'hiddenModels';

const getInitialState = (): ModelState => {
  if (typeof window === 'undefined') {
    return {
      selectedModels: [],
      multiModelMode: false,
      autoMode: true,
      pinnedModels: [],
      recentModels: []
    };
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return {
        selectedModels: parsed.selectedModels || [],
        multiModelMode: parsed.multiModelMode || false,
        autoMode: parsed.autoMode !== undefined ? parsed.autoMode : true,
        pinnedModels: parsed.pinnedModels || [],
        recentModels: parsed.recentModels || []
      };
    } catch (e) {
      console.error('Failed to parse model store state:', e);
    }
  }

  return {
    selectedModels: [],
    multiModelMode: false,
    autoMode: true,
    pinnedModels: [],
    recentModels: []
  };
};

// Privacy-focused providers and model definitions are now in $lib/shared/models
import {
  AVAILABLE_MODELS,
  PRIVACY_FOCUSED_PROVIDERS,
  isPrivacyFocusedModel,
  isOnlineModel,
  getBaseModelId,
  toOnlineModelId
} from '$lib/shared/models';

export {
  AVAILABLE_MODELS,
  PRIVACY_FOCUSED_PROVIDERS,
  isPrivacyFocusedModel,
  isOnlineModel,
  getBaseModelId,
  toOnlineModelId
};

const createModelStore = () => {
  const { subscribe, set, update } = writable<ModelState>(getInitialState());

  const saveToStorage = (state: ModelState) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  };

  return {
    subscribe,
    selectModel: (modelId: string) => update(state => {
      const newState = {
        ...state,
        selectedModels: [modelId],
        multiModelMode: false,
        autoMode: modelId === 'auto',
        recentModels: [modelId, ...state.recentModels.filter(m => m !== modelId)].slice(0, 10)
      };
      saveToStorage(newState);
      return newState;
    }),
    selectMultipleModels: (modelIds: string[]) => update(state => {
      const newState = {
        ...state,
        selectedModels: modelIds,
        multiModelMode: true,
        autoMode: false
      };
      saveToStorage(newState);
      return newState;
    }),
    toggleMultiModelMode: () => update(state => {
      const newState = {
        ...state,
        multiModelMode: !state.multiModelMode
      };
      saveToStorage(newState);
      return newState;
    }),
    setAutoMode: (enabled: boolean) => update(state => {
      const newState = {
        ...state,
        autoMode: enabled,
        multiModelMode: enabled ? false : state.multiModelMode,
        selectedModels: enabled ? [] : state.selectedModels
      };
      saveToStorage(newState);
      return newState;
    }),
    pinModel: (modelId: string) => update(state => {
      const newState = {
        ...state,
        pinnedModels: [...state.pinnedModels, modelId]
      };
      saveToStorage(newState);
      return newState;
    }),
    unpinModel: (modelId: string) => update(state => {
      const newState = {
        ...state,
        pinnedModels: state.pinnedModels.filter(m => m !== modelId)
      };
      saveToStorage(newState);
      return newState;
    }),
    reset: () => {
      const defaultState: ModelState = {
        selectedModels: [],
        multiModelMode: false,
        autoMode: true,
        pinnedModels: [],
        recentModels: []
      };
      set(defaultState);
      saveToStorage(defaultState);
    }
  };
};

export const modelStore = createModelStore();

export const currentModel = derived(
  modelStore,
  $model => $model.selectedModels[0] || 'auto'
);

export const isMultiModel = derived(
  modelStore,
  $model => $model.multiModelMode && $model.selectedModels.length > 1
);

export const imageCapableModels = AVAILABLE_MODELS.filter(m => m.supportsImages);

export const imageGenerationModels = AVAILABLE_MODELS.filter(m => m.supportsImageGeneration);

export function isImageGenerationModel(modelId: string): boolean {
  return imageGenerationModels.some(m => m.id === modelId);
}

// Hidden Models Store (for hiding built-in models)
interface HiddenModelsState {
  hiddenIds: string[];
}

const getInitialHiddenModels = (): HiddenModelsState => {
  if (typeof window === 'undefined') {
    return { hiddenIds: [] };
  }

  const stored = localStorage.getItem(HIDDEN_MODELS_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return { hiddenIds: parsed.hiddenIds || [] };
    } catch (e) {
      console.error('Failed to parse hidden models:', e);
    }
  }

  return { hiddenIds: [] };
};

const createHiddenModelsStore = () => {
  const { subscribe, set, update } = writable<HiddenModelsState>(getInitialHiddenModels());

  const saveToStorage = (state: HiddenModelsState) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(HIDDEN_MODELS_KEY, JSON.stringify(state));
    }
  };

  return {
    subscribe,
    hideModel: (id: string) => update(state => {
      const newState = {
        hiddenIds: [...state.hiddenIds, id]
      };
      saveToStorage(newState);
      return newState;
    }),
    showModel: (id: string) => update(state => {
      const newState = {
        hiddenIds: state.hiddenIds.filter(hiddenId => hiddenId !== id)
      };
      saveToStorage(newState);
      return newState;
    }),
    toggleModel: (id: string) => update(state => {
      const isHidden = state.hiddenIds.includes(id);
      const newState = {
        hiddenIds: isHidden
          ? state.hiddenIds.filter(hiddenId => hiddenId !== id)
          : [...state.hiddenIds, id]
      };
      saveToStorage(newState);
      return newState;
    }),
    reset: () => {
      const emptyState: HiddenModelsState = { hiddenIds: [] };
      set(emptyState);
      saveToStorage(emptyState);
    }
  };
};

export const hiddenModelsStore = createHiddenModelsStore();

// Custom Models Store
interface CustomModelsState {
  models: CustomModel[];
}

const getInitialCustomModels = (): CustomModelsState => {
  if (typeof window === 'undefined') {
    return { models: [] };
  }

  const stored = localStorage.getItem(CUSTOM_MODELS_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return { models: parsed.models || [] };
    } catch (e) {
      console.error('Failed to parse custom models:', e);
    }
  }

  return { models: [] };
};

const createCustomModelsStore = () => {
  const { subscribe, set, update } = writable<CustomModelsState>(getInitialCustomModels());

  const saveToStorage = (state: CustomModelsState) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CUSTOM_MODELS_KEY, JSON.stringify(state));
    }
  };

  return {
    subscribe,
    addModel: (model: CustomModel) => update(state => {
      const newState = {
        models: [...state.models, model]
      };
      saveToStorage(newState);
      return newState;
    }),
    updateModel: (id: string, updates: Partial<CustomModel>) => update(state => {
      const newState = {
        models: state.models.map(m => m.id === id ? { ...m, ...updates } : m)
      };
      saveToStorage(newState);
      return newState;
    }),
    removeModel: (id: string) => update(state => {
      const newState = {
        models: state.models.filter(m => m.id !== id)
      };
      saveToStorage(newState);
      return newState;
    }),
    reset: () => {
      const emptyState: CustomModelsState = { models: [] };
      set(emptyState);
      saveToStorage(emptyState);
    }
  };
};

export const customModelsStore = createCustomModelsStore();

// Reset all model settings to defaults
export const resetAllModelSettings = () => {
  customModelsStore.reset();
  hiddenModelsStore.reset();
  modelStore.reset();
};

// Combined models store that includes both built-in and custom models
export const allModelsStore = derived(
  customModelsStore,
  $custom => [...AVAILABLE_MODELS, ...$custom.models]
);

// Get recommended models (from both built-in and custom)
export const recommendedModels = derived(
  allModelsStore,
  $models => $models.filter(m => m.isRecommended || m.category === 'general' || m.category === 'advanced')
);

// Get auto-selectable models
export const autoSelectableModels = derived(
  allModelsStore,
  $models => $models.filter(m => {
    if ('isAutoSelectable' in m) {
      return m.isAutoSelectable !== false;
    }
    return true;
  })
);
