import { AUTO_SUPPORTED_MODELS, IMAGE_MODELS, IMAGE_GENERATION_MODELS } from '$lib/types';

// Re-export for backwards compatibility
export { AUTO_SUPPORTED_MODELS, IMAGE_MODELS, IMAGE_GENERATION_MODELS };

// Model used for routing decisions and chat title generation
export const ROUTER_MODEL = 'openai/gpt-oss-20b'; // The selector model
export const SUMMARIZER_MODEL = 'openai/gpt-oss-20b'; // The namer/summarizer of the chat

export interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
    };
  }>;
}

export interface ImageConfig {
  aspect_ratio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';
  image_size?: '1K' | '2K' | '4K';
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
  modalities?: ('text' | 'image')[];
  image_config?: ImageConfig;
}

export interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface GeneratedImage {
  type: 'image_url';
  image_url: {
    url: string;
  };
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: 'assistant';
      content: string | Array<{
        type: 'text' | 'image_url';
        text?: string;
        image_url?: {
          url: string;
        };
      }>;
      images?: GeneratedImage[];
    };
    finish_reason: string;
  }>;
  usage: OpenRouterUsage;
}

export interface OpenRouterStreamChunk {
  id: string;
  model: string;
  choices: Array<{
    delta: {
      role?: 'assistant';
      content?: string | Array<{
        type: 'text' | 'image_url';
        text?: string;
        image_url?: {
          url: string;
        };
      }>;
      images?: GeneratedImage[];
    };
    finish_reason: string | null;
  }>;
  usage?: OpenRouterUsage;
}

export interface OpenRouterError {
  error: {
    message: string;
    type: string;
    code: string;
  };
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

export class OpenRouterClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = OPENROUTER_API_URL) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'HTTP-Referer': 'https://selfhostablechat.app',
      'X-Title': 'Self-Hostable Chat',
      'Content-Type': 'application/json'
    };
  }

  async createCompletion(request: OpenRouterRequest): Promise<OpenRouterResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ ...request, stream: false })
      });

      if (!response.ok) {
        const error = await response.json() as OpenRouterError;
        throw new Error(error.error?.message || 'OpenRouter API request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('OpenRouter API error:', error);
      throw error;
    }
  }

  async *createStreamingCompletion(request: OpenRouterRequest): AsyncGenerator<OpenRouterStreamChunk> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ ...request, stream: true })
      });

      if (!response.ok) {
        const error = await response.json() as OpenRouterError;
        throw new Error(error.error?.message || 'OpenRouter API request failed');
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          
          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              yield json as OpenRouterStreamChunk;
            } catch (e) {
              console.warn('Failed to parse SSE line:', trimmed);
            }
          }
        }
      }
    } catch (error) {
      console.error('OpenRouter streaming error:', error);
      throw error;
    }
  }

  async getModels() {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get models:', error);
      throw error;
    }
  }
}

export function createOpenRouterClient(apiKey: string): OpenRouterClient {
  return new OpenRouterClient(apiKey);
}
