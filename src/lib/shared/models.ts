
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
export const AVAILABLE_MODELS: Model[] = [
    {
        id: 'arcee-ai/trinity-mini:free',
        name: 'Trinity Mini Free',
        displayName: 'Trinity Mini Free',
        brand: 'Arcee AI',
        category: 'general',
        capabilities: ['general', 'fast'],
        supportsImages: false,
        contextWindow: 128000,
        pricePer1M: { input: 0, output: 0 },
        isRecommended: true,
        isAutoSelectable: true
    },
    {
        id: 'arcee-ai/trinity-mini',
        name: 'Trinity Mini',
        displayName: 'Trinity Mini',
        brand: 'Arcee AI',
        category: 'general',
        capabilities: ['general', 'fast', 'coding'],
        supportsImages: false,
        contextWindow: 128000,
        pricePer1M: { input: 0.045, output: 0.15 }
    },
    {
        id: 'arcee-ai/trinity-large-preview:free',
        name: 'Trinity Large Preview Free',
        displayName: 'Trinity Large Preview Free',
        brand: 'Arcee AI',
        category: 'general',
        capabilities: ['general', 'coding'],
        supportsImages: false,
        contextWindow: 128000,
        pricePer1M: { input: 0, output: 0 },
        isRecommended: true
    },
    {
        id: 'arcee-ai/trinity-large-preview',
        name: 'Trinity Large Preview',
        displayName: 'Trinity Large Preview',
        brand: 'Arcee AI',
        category: 'general',
        capabilities: ['general', 'coding'],
        supportsImages: false,
        contextWindow: 128000,
        pricePer1M: { input: 0.50, output: 1.50 }
    },
    {
        id: 'deepseek/deepseek-r1-0528:free',
        name: 'DeepSeek R1 0528 Free',
        displayName: 'DeepSeek R1 0528 Free',
        brand: 'DeepSeek',
        category: 'general',
        capabilities: ['general', 'coding'],
        supportsImages: false,
        contextWindow: 163840,
        pricePer1M: { input: 0, output: 0 },
        isRecommended: true
    },
    {
        id: 'google/gemini-3.0-flash',
        name: 'Gemini 3 Flash',
        displayName: 'Gemini 3 Flash',
        brand: 'Google',
        category: 'general',
        capabilities: ['general', 'vision', 'fast', 'coding'],
        supportsImages: true,
        contextWindow: 1048576,
        pricePer1M: { input: 0.10, output: 0.40 }, // Updated to more realistic 2026 pricing
        isRecommended: true
    },
    {
        id: 'google/gemini-3-flash-preview',
        name: 'Gemini 3 Flash Preview',
        displayName: 'Gemini 3 Flash Preview',
        brand: 'Google',
        category: 'general',
        capabilities: ['general', 'vision', 'fast', 'coding'],
        supportsImages: true,
        contextWindow: 1048576,
        pricePer1M: { input: 0.50, output: 3.00 },
        isRecommended: true
    },
    {
        id: 'google/gemini-3.1-pro-preview',
        name: 'Gemini 3.1 Pro',
        displayName: 'Gemini 3.1 Pro',
        brand: 'Google',
        category: 'general',
        capabilities: ['general', 'vision', 'coding', 'complex'],
        supportsImages: true,
        contextWindow: 2000000,
        pricePer1M: { input: 2.00, output: 12.00 },
        isRecommended: true
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
        id: 'anthropic/claude-sonnet-4.6',
        name: 'Claude Sonnet 4.6',
        displayName: 'Claude Sonnet 4.6',
        brand: 'Anthropic',
        category: 'general',
        capabilities: ['general', 'vision', 'coding', 'writing', 'complex'],
        supportsImages: true,
        contextWindow: 1000000,
        pricePer1M: { input: 3.00, output: 15.00 },
        isRecommended: true
    },
    {
        id: 'anthropic/claude-opus-4.6',
        name: 'Claude Opus 4.6',
        displayName: 'Claude Opus 4.6',
        brand: 'Anthropic',
        category: 'advanced',
        capabilities: ['general', 'vision', 'coding', 'writing', 'complex'],
        supportsImages: true,
        contextWindow: 1000000,
        pricePer1M: { input: 15.00, output: 75.00 },
        isRecommended: true
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
        pricePer1M: { input: 0.15, output: 0.60 },
        isRecommended: true
    },
    // Popular models from browser results
    {
        id: 'openai/gpt-5-nano',
        name: 'GPT-5 Nano',
        displayName: 'GPT-5 Nano',
        brand: 'OpenAI',
        category: 'general',
        capabilities: ['general', 'fast'],
        supportsImages: false,
        contextWindow: 128000,
        pricePer1M: { input: 0.05, output: 0.40 }
    },
    {
        id: 'openai/gpt-oss-120b',
        name: 'GPT-OSS 120B',
        displayName: 'GPT-OSS 120B',
        brand: 'OpenAI',
        category: 'general',
        capabilities: ['general', 'coding'],
        supportsImages: false,
        contextWindow: 128000,
        pricePer1M: { input: 0.039, output: 0.19 }
    },
    {
        id: 'openai/gpt-5-mini',
        name: 'GPT-5 Mini',
        displayName: 'GPT-5 Mini',
        brand: 'OpenAI',
        category: 'general',
        capabilities: ['general', 'fast'],
        supportsImages: true,
        contextWindow: 128000,
        pricePer1M: { input: 0.25, output: 2.00 }
    },
    {
        id: 'x-ai/grok-4-fast',
        name: 'Grok 4 Fast',
        displayName: 'Grok 4 Fast',
        brand: 'xAI',
        category: 'general',
        capabilities: ['general', 'fast'],
        supportsImages: false,
        contextWindow: 2000000,
        pricePer1M: { input: 0.20, output: 0.50 }
    },
    {
        id: 'x-ai/grok-4.1-fast',
        name: 'Grok 4.1 Fast',
        displayName: 'Grok 4.1 Fast',
        brand: 'xAI',
        category: 'general',
        capabilities: ['general', 'fast', 'vision', 'coding'],
        supportsImages: true,
        contextWindow: 2000000,
        pricePer1M: { input: 0.20, output: 0.50 },
        isRecommended: true,
        isAutoSelectable: true
    },
    {
        id: 'mistralai/mistral-nemo',
        name: 'Mistral Nemo',
        displayName: 'Mistral Nemo',
        brand: 'Mistral',
        category: 'general',
        capabilities: ['general', 'fast'],
        supportsImages: false,
        contextWindow: 128000,
        pricePer1M: { input: 0.02, output: 0.04 }
    },
    {
        id: 'deepseek/deepseek-chat-v3-0324',
        name: 'DeepSeek V3',
        displayName: 'DeepSeek V3',
        brand: 'DeepSeek',
        category: 'general',
        capabilities: ['general', 'coding'],
        supportsImages: false,
        contextWindow: 128000,
        pricePer1M: { input: 0.14, output: 0.28 },
        isRecommended: true
    },
    {
        id: 'deepseek/deepseek-v3.2',
        name: 'DeepSeek V3.2',
        displayName: 'DeepSeek V3.2',
        brand: 'DeepSeek',
        category: 'general',
        capabilities: ['general', 'coding', 'reasoning'],
        supportsImages: false,
        contextWindow: 163840,
        pricePer1M: { input: 0.26, output: 0.38 },
        isRecommended: true
    },
    {
        id: 'google/gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        displayName: 'Gemini 2.5 Pro',
        brand: 'Google',
        category: 'advanced',
        capabilities: ['general', 'vision', 'coding', 'complex'],
        supportsImages: true,
        contextWindow: 1000000,
        pricePer1M: { input: 1.25, output: 10.00 }
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
        pricePer1M: { input: 0.23, output: 3.00 }
    },
    {
        id: 'minimax/minimax-m2.5',
        name: 'MiniMax M2.5',
        displayName: 'MiniMax M2.5',
        brand: 'MiniMax',
        category: 'general',
        capabilities: ['general', 'coding', 'vision'],
        supportsImages: true,
        contextWindow: 196608,
        pricePer1M: { input: 0.30, output: 1.10 },
        isRecommended: true
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
        pricePer1M: { input: 0.27, output: 0.95 }
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
        pricePer1M: { input: 1.75, output: 14.00 },
        isRecommended: true
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
        id: 'z-ai/glm-5',
        name: 'GLM 5',
        displayName: 'GLM 5',
        brand: 'Z.AI',
        category: 'general',
        capabilities: ['general', 'coding', 'vision', 'complex'],
        supportsImages: true,
        contextWindow: 202752,
        pricePer1M: { input: 0.30, output: 2.55 },
        isRecommended: true
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
        pricePer1M: { input: 0.38, output: 1.70 }
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
    // Image Generation Models
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
        },
        isRecommended: true
    },
    {
        id: 'bytedance-seed/seedream-4.5',
        name: 'Seedream 4.5',
        displayName: 'Seedream 4.5',
        brand: 'Bytedance',
        category: 'image',
        capabilities: ['image-generation'],
        supportsImages: false,
        supportsImageGeneration: true,
        contextWindow: 4096,
        pricePer1M: { input: 5.0, output: 5.0 },
        imageConfig: { supportsAspectRatio: true, supportsImageSize: true }
    },
    {
        id: 'openai/gpt-5-image-mini',
        name: 'GPT-5 Image Mini',
        displayName: 'GPT-5 Image Mini',
        brand: 'OpenAI',
        category: 'image',
        capabilities: ['image-generation'],
        supportsImages: false,
        supportsImageGeneration: true,
        contextWindow: 4096,
        pricePer1M: { input: 2.5, output: 2.0 },
        imageConfig: { supportsAspectRatio: true, supportsImageSize: true }
    },
    {
        id: 'openai/gpt-5-image',
        name: 'GPT-5 Image',
        displayName: 'GPT-5 Image',
        brand: 'OpenAI',
        category: 'image',
        capabilities: ['image-generation'],
        supportsImages: false,
        supportsImageGeneration: true,
        contextWindow: 4096,
        pricePer1M: { input: 10.0, output: 10.0 },
        imageConfig: { supportsAspectRatio: true, supportsImageSize: true }
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
        pricePer1M: { input: 3.00, output: 15.00 },
        isRecommended: true
    }
];

