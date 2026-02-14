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

export interface OpenRouterTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface OpenRouterToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// Web search plugin configuration
export interface WebSearchPlugin {
  id: 'web';
  engine?: 'native' | 'exa';
  max_results?: number;
  search_prompt?: string;
}

// Web search options for native search
export interface WebSearchOptions {
  search_context_size?: 'low' | 'medium' | 'high';
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
  tools?: OpenRouterTool[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  plugins?: WebSearchPlugin[];
  web_search_options?: WebSearchOptions;
  provider?: {
    zdr?: boolean;
    order?: string[];
    allow_fallbacks?: boolean;
    require_parameters?: boolean;
    data_collection?: 'deny' | 'allow';
  };
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

// URL citation annotation from web search results
export interface URLCitation {
  type: 'url_citation';
  url_citation: {
    url: string;
    title: string;
    content?: string;
    start_index: number;
    end_index: number;
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
      annotations?: URLCitation[];
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
      annotations?: URLCitation[];
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
const DEFAULT_TIMEOUT_MS = 60000; // 60 seconds default timeout
const STREAMING_TIMEOUT_MS = 120000; // 2 minutes for streaming (can be longer)

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

  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timed out after ${timeoutMs}ms. The OpenRouter API may be unreachable from your container. Check your network configuration and ensure outbound HTTPS is allowed.`);
        }

        // Handle specific network errors
        if (error.message.includes('ETIMEDOUT') || error.message.includes('fetch failed')) {
          console.error(`Network error connecting to ${url}:`, error.message);
          throw new Error(
            `Failed to connect to OpenRouter API (${this.baseUrl}). ` +
            `This is typically a network connectivity issue in containerized environments. ` +
            `Error: ${error.message}. ` +
            `Please verify: 1) Container has internet access, 2) DNS resolution works, 3) No firewall blocking outbound HTTPS.`
          );
        }
      }
      throw error;
    }
  }

  async createCompletion(request: OpenRouterRequest): Promise<OpenRouterResponse> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ ...request, stream: false })
        },
        DEFAULT_TIMEOUT_MS
      );

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
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ ...request, stream: true })
        },
        STREAMING_TIMEOUT_MS
      );

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

      // Set up a timeout for individual chunks to detect stalled connections
      const CHUNK_TIMEOUT_MS = 30000; // 30 seconds between chunks

      while (true) {
        // Use Promise.race to enforce a timeout on the read operation itself
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const readPromise = reader.read();
        const timeoutPromise = new Promise<{ done: boolean; value?: Uint8Array }>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error(`Streaming connection stalled - no data received for ${CHUNK_TIMEOUT_MS}ms`)), CHUNK_TIMEOUT_MS);
        });

        const { done, value } = await Promise.race([readPromise, timeoutPromise])
          .finally(() => {
            if (timeoutId) clearTimeout(timeoutId);
          })
          .catch(error => {
            reader.cancel();
            throw error;
          });

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
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/models`,
        {
          method: 'GET',
          headers: this.getHeaders()
        },
        DEFAULT_TIMEOUT_MS
      );

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
