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

// Valid OpenRouter models (as of Jan 2026)
export const AVAILABLE_MODELS = [
  {
    id: 'openai/gpt-oss-20b:free',
    name: 'GPT OSS 20B Free',
    displayName: 'GPT OSS 20B Free',
    brand: 'OpenAI',
    category: 'general',
    capabilities: ['general', 'fast'],
    supportsImages: false,
    contextWindow: 131072,
    pricePer1M: { input: 0, output: 0 },
    isRecommended: true,
    isAutoSelectable: true
  },
  {
    id: 'openai/gpt-oss-120b:free',
    name: 'GPT OSS 120B Free',
    displayName: 'GPT OSS 120B Free',
    brand: 'OpenAI',
    category: 'general',
    capabilities: ['general', 'fast'],
    supportsImages: false,
    contextWindow: 131072,
    pricePer1M: { input: 0, output: 0 },
    isRecommended: false,
    isAutoSelectable: true
  },
  {
    id: 'openai/gpt-oss-20b',
    name: 'GPT OSS 20B',
    displayName: 'GPT OSS 20B',
    brand: 'OpenAI',
    category: 'general',
    capabilities: ['general', 'fast'],
    supportsImages: false,
    contextWindow: 128000,
    pricePer1M: { input: 0.10, output: 0.10 }
  },
  {
    id: 'openai/gpt-oss-120b',
    name: 'GPT OSS 120B',
    displayName: 'GPT OSS 120B',
    brand: 'OpenAI',
    category: 'general',
    capabilities: ['general', 'coding', 'complex'],
    supportsImages: false,
    contextWindow: 128000,
    pricePer1M: { input: 0.50, output: 1.50 }
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    displayName: 'GPT-4o Mini',
    brand: 'OpenAI',
    category: 'general',
    capabilities: ['general', 'vision', 'fast'],
    supportsImages: true,
    contextWindow: 128000,
    pricePer1M: { input: 0.15, output: 0.60 }
  },
  // Popular third-party models (grok, moonshot, minimax moved up)
  {
    id: 'x-ai/grok-4.1-fast',
    name: 'Grok 4.1 Fast',
    displayName: 'Grok 4.1 Fast',
    brand: 'xAI',
    category: 'general',
    capabilities: ['general', 'fast'],
    supportsImages: false,
    contextWindow: 128000,
    pricePer1M: { input: 0.50, output: 1.50 }
  },
  {
    id: 'moonshotai/kimi-k2',
    name: 'Kimi K2',
    displayName: 'Kimi K2',
    brand: 'Moonshot',
    category: 'general',
    capabilities: ['general', 'coding'],
    supportsImages: false,
    contextWindow: 262144,
    pricePer1M: { input: 0.50, output: 2.80 }
  },
  {
    id: 'moonshotai/kimi-k2.5',
    name: 'Kimi K2.5',
    displayName: 'Kimi K2.5',
    brand: 'Moonshot',
    category: 'general',
    capabilities: ['general', 'coding'],
    supportsImages: false,
    contextWindow: 262144,
    pricePer1M: { input: 0.50, output: 2.80 }
  },
  {
    id: 'minimax/minimax-m2.1',
    name: 'MiniMax M2.1',
    displayName: 'MiniMax M2.1',
    brand: 'MiniMax',
    category: 'general',
    capabilities: ['general', 'coding'],
    supportsImages: false,
    contextWindow: 196608,
    pricePer1M: { input: 0.27, output: 1.10 }
  },
  {
    id: 'openai/gpt-5.1',
    name: 'GPT 5.1',
    displayName: 'GPT 5.1',
    brand: 'OpenAI',
    category: 'general',
    capabilities: ['general', 'vision', 'coding'],
    supportsImages: true,
    contextWindow: 256000,
    pricePer1M: { input: 2.00, output: 8.00 }
  },
  {
    id: 'openai/gpt-5.2',
    name: 'GPT 5.2',
    displayName: 'GPT 5.2',
    brand: 'OpenAI',
    category: 'general',
    capabilities: ['general', 'vision', 'coding', 'complex'],
    supportsImages: true,
    contextWindow: 256000,
    pricePer1M: { input: 5.00, output: 15.00 }
  },
  {
    id: 'openai/gpt-5-mini',
    name: 'GPT-5 Mini',
    displayName: 'GPT-5 Mini',
    brand: 'OpenAI',
    category: 'general',
    capabilities: ['general', 'vision', 'fast'],
    supportsImages: true,
    contextWindow: 256000,
    pricePer1M: { input: 0.50, output: 1.50 }
  },
  {
    id: 'anthropic/claude-opus-4.5',
    name: 'Claude Opus 4.5',
    displayName: 'Claude Opus 4.5',
    brand: 'Anthropic',
    category: 'advanced',
    capabilities: ['general', 'vision', 'coding', 'writing', 'complex'],
    supportsImages: true,
    contextWindow: 200000,
    pricePer1M: { input: 15.00, output: 25.00 }
  },
  {
    id: 'deepseek/deepseek-v3.2',
    name: 'DeepSeek V3.2',
    displayName: 'DeepSeek V3.2',
    brand: 'DeepSeek',
    category: 'general',
    capabilities: ['general', 'coding', 'math'],
    supportsImages: false,
    contextWindow: 163840,
    pricePer1M: { input: 0.25, output: 0.38 }
  },
  {
    id: 'meta/llama-4-scout',
    name: 'Llama 4 Scout',
    displayName: 'Llama 4 Scout',
    brand: 'Meta',
    category: 'general',
    capabilities: ['general', 'fast'],
    supportsImages: false,
    contextWindow: 128000,
    pricePer1M: { input: 0.20, output: 0.60 }
  },
  {
    id: 'meta/llama-4-maverick',
    name: 'Llama 4 Maverick',
    displayName: 'Llama 4 Maverick',
    brand: 'Meta',
    category: 'general',
    capabilities: ['general', 'coding'],
    supportsImages: false,
    contextWindow: 128000,
    pricePer1M: { input: 0.50, output: 1.50 }
  },
  {
    id: 'z-ai/glm-4.7',
    name: 'GLM 4.7',
    displayName: 'GLM 4.7',
    brand: 'Z.AI',
    category: 'general',
    capabilities: ['general', 'coding'],
    supportsImages: false,
    contextWindow: 128000,
    pricePer1M: { input: 0.40, output: 1.50 }
  },
  {
    id: 'google/gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    displayName: 'Gemini 2.5 Flash Lite',
    brand: 'Google',
    category: 'general',
    capabilities: ['general', 'fast'],
    supportsImages: true,
    contextWindow: 1000000,
    pricePer1M: { input: 0.10, output: 0.20 }
  },
  {
    id: 'google/gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    displayName: 'Gemini 3 Flash',
    brand: 'Google',
    category: 'general',
    capabilities: ['general', 'vision', 'fast'],
    supportsImages: true,
    contextWindow: 1000000,
    pricePer1M: { input: 0.35, output: 0.70 }
  },
  {
    id: 'google/gemini-3-pro-preview',
    name: 'Gemini 3 Pro',
    displayName: 'Gemini 3 Pro',
    brand: 'Google',
    category: 'general',
    capabilities: ['general', 'vision', 'coding', 'complex'],
    supportsImages: true,
    contextWindow: 2000000,
    pricePer1M: { input: 1.25, output: 5.00 }
  },
  {
    id: 'anthropic/claude-4.5-sonnet',
    name: 'Claude 4.5 Sonnet',
    displayName: 'Claude 4.5 Sonnet',
    brand: 'Anthropic',
    category: 'general',
    capabilities: ['general', 'vision', 'coding', 'writing'],
    supportsImages: true,
    contextWindow: 200000,
    pricePer1M: { input: 3.00, output: 15.00 }
  },
  {
    id: 'anthropic/claude-4.5-haiku',
    name: 'Claude 4.5 Haiku',
    displayName: 'Claude 4.5 Haiku',
    brand: 'Anthropic',
    category: 'general',
    capabilities: ['general', 'fast', 'coding'],
    supportsImages: false,
    contextWindow: 200000,
    pricePer1M: { input: 1, output: 5 }
  },
  {
    id: 'google/gemini-3-pro-image-preview',
    name: 'Nano Banana Pro',
    displayName: 'Nano Banana Pro',
    brand: 'Google',
    category: 'image',
    capabilities: ['image-generation', 'vision'],
    supportsImages: true,
    supportsImageGeneration: true,
    contextWindow: 4096,
    pricePer1M: { input: 0, output: 0 },
    imageConfig: {
      supportsAspectRatio: true,
      supportsImageSize: true
    }
  },
  {
    id: 'google/gemini-2.5-flash-image',
    name: 'Nano Banana',
    displayName: 'Nano Banana',
    brand: 'Google',
    category: 'image',
    capabilities: ['image-generation', 'vision', 'fast'],
    supportsImages: true,
    supportsImageGeneration: true,
    contextWindow: 1000000,
    pricePer1M: { input: 0.35, output: 0.70 },
    imageConfig: {
      supportsAspectRatio: true,
      supportsImageSize: true
    }
  },
  {
    id: 'black-forest-labs/flux.2-pro',
    name: 'FLUX 2 Pro',
    displayName: 'FLUX 2 Pro',
    brand: 'Black Forest Labs',
    category: 'image',
    capabilities: ['image-generation'],
    supportsImages: false,
    supportsImageGeneration: true,
    contextWindow: 4096,
    pricePer1M: { input: 0.005, output: 0.02 }
  },
  {
    id: 'black-forest-labs/flux.2-flex',
    name: 'FLUX 2 Flex',
    displayName: 'FLUX 2 Flex',
    brand: 'Black Forest Labs',
    category: 'image',
    capabilities: ['image-generation'],
    supportsImages: false,
    supportsImageGeneration: true,
    contextWindow: 4096,
    pricePer1M: { input: 0.003, output: 0.012 }
  },
  // Additional models for manual selection
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    displayName: 'GPT-4o',
    brand: 'OpenAI',
    category: 'general',
    capabilities: ['general', 'vision', 'coding'],
    supportsImages: true,
    contextWindow: 128000,
    pricePer1M: { input: 2.50, output: 10.00 }
  },
  {
    id: 'mistralai/mistral-large',
    name: 'Mistral Large 2',
    displayName: 'Mistral Large 2',
    brand: 'Mistral',
    category: 'general',
    capabilities: ['general', 'coding'],
    supportsImages: false,
    contextWindow: 128000,
    pricePer1M: { input: 2.00, output: 6.00 }
  },
  {
    id: 'qwen/qwen3-235b-a22b-2507',
    name: 'Qwen3 235B',
    displayName: 'Qwen3 235B',
    brand: 'Qwen',
    category: 'general',
    capabilities: ['general', 'coding', 'math'],
    supportsImages: false,
    contextWindow: 262144,
    pricePer1M: { input: 0.071, output: 0.463 }
  },
  {
    id: 'perplexity/sonar-reasoning-pro',
    name: 'Sonar Reasoning Pro',
    displayName: 'Sonar Reasoning Pro',
    brand: 'Perplexity',
    category: 'reasoning',
    capabilities: ['reasoning', 'search'],
    supportsImages: false,
    contextWindow: 128000,
    pricePer1M: { input: 1.00, output: 5.00 }
  }
];

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
