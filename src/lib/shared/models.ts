
import type { Model } from '../types';

// Privacy-focused providers with zero data retention policies
export const PRIVACY_FOCUSED_PROVIDERS = [
    'hyperbolic',
    'inference.net',
    'fireworks',
    'baseten',
    'modal',
    'featherless',
    'amazon',
    'anthropic',
    'google',
    'deepseek',
    'meta-llama',
    'moonshotai',
    'qwen',
    'z-ai',
    'x-ai',
    'mistralai',
    'minimax',
    'perplexity'
];

// Check if a model is from a privacy-focused provider
export function isPrivacyFocusedModel(modelId: string): boolean {
    const provider = modelId.split('/')[0];
    return PRIVACY_FOCUSED_PROVIDERS.some(p => provider.toLowerCase().includes(p.toLowerCase()));
}

// Check if a model has the :online suffix for web search
export function isOnlineModel(modelId: string): boolean {
    return modelId.includes(':online');
}

// Strip :online suffix from model ID for display/lookup purposes
export function getBaseModelId(modelId: string): string {
    return modelId.replace(/:online$/, '');
}

// Add :online suffix to model ID
export function toOnlineModelId(modelId: string): string {
    if (isOnlineModel(modelId)) return modelId;
    return `${modelId}:online`;
}

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
        id: 'openai/gpt-oss-20b',
        name: 'GPT OSS 20B',
        displayName: 'GPT OSS 20B',
        brand: 'OpenAI',
        category: 'general',
        capabilities: ['general', 'fast'],
        supportsImages: false,
        contextWindow: 131072,
        pricePer1M: { input: 0.075, output: 0.30 }
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
        contextWindow: 2000000,
        pricePer1M: { input: 0.20, output: 0.50 }
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
        supportsImages: true,
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
        id: 'minimax/minimax-m2.5',
        name: 'MiniMax M2.5',
        displayName: 'MiniMax M2.5',
        brand: 'MiniMax',
        category: 'general',
        capabilities: ['general', 'coding', 'vision'],
        supportsImages: true,
        contextWindow: 262144,
        pricePer1M: { input: 0.30, output: 1.20 }
    },
    {
        id: 'openai/gpt-5.1',
        name: 'GPT 5.1',
        displayName: 'GPT 5.1',
        brand: 'OpenAI',
        category: 'general',
        capabilities: ['general', 'vision', 'coding'],
        supportsImages: true,
        contextWindow: 400000,
        pricePer1M: { input: 1.25, output: 10.00 }
    },
    {
        id: 'openai/gpt-5.2',
        name: 'GPT 5.2',
        displayName: 'GPT 5.2',
        brand: 'OpenAI',
        category: 'general',
        capabilities: ['general', 'vision', 'coding', 'complex'],
        supportsImages: true,
        contextWindow: 400000,
        pricePer1M: { input: 1.75, output: 14.00 }
    },
    {
        id: 'openai/gpt-5.2-pro',
        name: 'GPT-5.2 Pro',
        displayName: 'GPT-5.2 Pro',
        brand: 'OpenAI',
        category: 'general',
        capabilities: ['general', 'vision', 'coding', 'complex'],
        supportsImages: true,
        contextWindow: 400000,
        pricePer1M: { input: 21.00, output: 168.00 }
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
        pricePer1M: { input: 5.00, output: 25.00 }
    },
    {
        id: 'anthropic/claude-opus-4.6',
        name: 'Claude Opus 4.6',
        displayName: 'Claude Opus 4.6',
        brand: 'Anthropic',
        category: 'advanced',
        capabilities: ['general', 'vision', 'coding', 'writing', 'complex'],
        supportsImages: true,
        contextWindow: 400000,
        pricePer1M: { input: 5.00, output: 25.00 }
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
        id: 'meta-llama/llama-4-scout',
        name: 'Llama 4 Scout',
        displayName: 'Llama 4 Scout',
        brand: 'Meta',
        category: 'general',
        capabilities: ['general', 'fast'],
        supportsImages: false,
        contextWindow: 327680,
        pricePer1M: { input: 0.08, output: 0.30 }
    },
    {
        id: 'meta-llama/llama-4-maverick',
        name: 'Llama 4 Maverick',
        displayName: 'Llama 4 Maverick',
        brand: 'Meta',
        category: 'general',
        capabilities: ['general', 'coding'],
        supportsImages: false,
        contextWindow: 1048576,
        pricePer1M: { input: 0.15, output: 0.60 }
    },
    {
        id: 'z-ai/glm-4.7',
        name: 'GLM 4.7',
        displayName: 'GLM 4.7',
        brand: 'Z.AI',
        category: 'general',
        capabilities: ['general', 'coding'],
        supportsImages: false,
        contextWindow: 202752,
        pricePer1M: { input: 0.40, output: 1.50 }
    },
    {
        id: 'z-ai/glm-5',
        name: 'GLM 5',
        displayName: 'GLM 5',
        brand: 'Z.AI',
        category: 'general',
        capabilities: ['general', 'coding', 'vision'],
        supportsImages: true,
        contextWindow: 400000,
        pricePer1M: { input: 0.80, output: 2.56 }
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
        pricePer1M: { input: 0.10, output: 0.40 }
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
        pricePer1M: { input: 0.50, output: 3.00 }
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
        pricePer1M: { input: 2.00, output: 12.00 }
    },
    {
        id: 'anthropic/claude-sonnet-4.5',
        name: 'Claude Sonnet 4.5',
        displayName: 'Claude Sonnet 4.5',
        brand: 'Anthropic',
        category: 'general',
        capabilities: ['general', 'vision', 'coding', 'writing'],
        supportsImages: true,
        contextWindow: 1000000,
        pricePer1M: { input: 3.00, output: 15.00 }
    },
    {
        id: 'anthropic/claude-haiku-4.5',
        name: 'Claude Haiku 4.5',
        displayName: 'Claude Haiku 4.5',
        brand: 'Anthropic',
        category: 'general',
        capabilities: ['general', 'fast', 'coding'],
        supportsImages: false,
        contextWindow: 200000,
        pricePer1M: { input: 1.00, output: 5.00 }
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
        pricePer1M: { input: 2.00, output: 12.00 },
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
        pricePer1M: { input: 0.30, output: 2.50 },
        imageConfig: {
            supportsAspectRatio: true,
            supportsImageSize: true
        }
    },
    // Additional models for manual selection
    {
        id: 'openai/gpt-4o-2024-11-20',
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
        id: 'mistralai/mistral-large-2512',
        name: 'Mistral Large 3',
        displayName: 'Mistral Large 3',
        brand: 'Mistral',
        category: 'general',
        capabilities: ['general', 'coding'],
        supportsImages: false,
        contextWindow: 262144,
        pricePer1M: { input: 0.50, output: 1.50 }
    },
    {
        id: 'qwen/qwen3-vl-235b-a22b-instruct',
        name: 'Qwen3 VL 235B',
        displayName: 'Qwen3 VL 235B',
        brand: 'Qwen',
        category: 'general',
        capabilities: ['general', 'coding', 'math'],
        supportsImages: true,
        contextWindow: 262144,
        pricePer1M: { input: 0.20, output: 1.20 }
    },
    {
        id: 'perplexity/sonar-pro-search',
        name: 'Sonar Pro Search',
        displayName: 'Sonar Pro Search',
        brand: 'Perplexity',
        category: 'reasoning',
        capabilities: ['reasoning', 'search'],
        supportsImages: false,
        contextWindow: 200000,
        pricePer1M: { input: 3.00, output: 15.00 }
    }
];
