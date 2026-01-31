import { json, type RequestHandler } from '@sveltejs/kit';
import { analyzeAndRoute, type MediaAttachment, isImageGenerationModel } from '$lib/server/ai/router';
import { generateChatSummary } from '$lib/server/ai/summarizer';
import { createSSEStream, createMultiModelStream, createSSEResponse, type StreamChunk } from '$lib/server/ai/streaming';
import type { OpenRouterMessage } from '$lib/server/ai/openrouter';
import { IMAGE_GENERATION_PROMPT } from '$lib/server/ai/router';
import { checkRateLimit } from '$lib/server/ai/rate-limiter';

// Input validation constants
const MAX_MESSAGE_LENGTH = 10000;
const MAX_CONVERSATION_HISTORY = 100;
const ALLOWED_MODELS = new Set([
  'openai/gpt-oss-20b:free', 'openai/gpt-oss-20b', 'openai/gpt-oss-120b',
  'openai/gpt-4o-mini', 'openai/gpt-5.1', 'openai/gpt-5.2', 'openai/gpt-5-mini',
  'x-ai/grok-4.1-fast', 'google/gemini-2.5-flash-lite', 'google/gemini-3-flash-preview',
  'anthropic/claude-4.5-sonnet', 'anthropic/claude-opus-4.5', 'bytedance-seed/seedream-4.5',
  'google/gemini-3-pro-image-preview', 'google/gemini-2.5-flash-image', 'black-forest-labs/flux.2-pro',
  'black-forest-labs/flux.2-flex', 'sourceful/riverflow-v2-standard-preview'
]);

// Sanitize user input to prevent prompt injection
function sanitizeInput(input: string): string {
  // Remove potential system prompt escape sequences
  return input
    .replace(/<\|system\|>/gi, '')
    .replace(/<\|user\|>/gi, '')
    .replace(/<\|assistant\|>/gi, '')
    .replace(/\[system\]/gi, '')
    .trim();
}

// Validate API key format
function isValidApiKey(key: string): boolean {
  // OpenRouter keys typically start with 'sk-or-' and are at least 20 chars
  return typeof key === 'string' &&
         key.length >= 20 &&
         /^sk-[a-zA-Z0-9_-]+$/.test(key);
}

// Generate a chat title - uses whatever title is returned without retrying
async function generateChatTitle(
  messages: Array<{ role: string; content: string | any[] }>,
  apiKey: string
): Promise<string> {
  const summary = await generateChatSummary(messages, apiKey);
  console.log(`[Chat Title Generation] Generated title: "${summary}"`);
  return summary;
}

// Template variable replacement function
function processSystemPromptTemplate(prompt: string, modelId: string): string {
  if (!prompt) return prompt;
  
  // Parse model info from ID (e.g., "anthropic/claude-3.5-sonnet" or "x-ai/grok-4.1-fast")
  const parts = modelId.split('/');
  const creator = parts[0] || 'Unknown';
  const modelName = parts[1] || modelId;
  
  // Format creator name (e.g., "anthropic" -> "Anthropic", "x-ai" -> "xAI")
  const formattedCreator = creator
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
    .replace('XAi', 'xAI')
    .replace('Openai', 'OpenAI')
    .replace('Google', 'Google')
    .replace('Mistralai', 'Mistral AI')
    .replace('Cohere', 'Cohere')
    .replace('Perplexity', 'Perplexity')
    .replace('Ai21', 'AI21');
  
  // Format model name (replace hyphens with spaces, title case)
  const formattedModelName = modelName
    .split('-')
    .map(word => {
      // Keep version numbers lowercase (e.g., "3.5", "4.1")
      if (/^\d+(\.\d+)?/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
  
  return prompt
    .replace(/:model_name:/g, formattedModelName)
    .replace(/:model_creator:/g, formattedCreator)
    .replace(/:model_id:/g, modelId);
}

// Build conversation messages with optional system prompt and image attachments
function buildConversationMessages(
  conversationHistory: any[], 
  message: string, 
  attachments: MediaAttachment[] = [],
  systemPrompt?: string,
  modelId?: string
): OpenRouterMessage[] {
  const messages: OpenRouterMessage[] = [];
  
  // Determine if this is an image generation model
  const isImageGenModel = modelId && isImageGenerationModel(modelId);
  
  // Add system prompt if provided
  if (systemPrompt) {
    const processedPrompt = modelId 
      ? processSystemPromptTemplate(systemPrompt, modelId)
      : systemPrompt;
    messages.push({
      role: 'system',
      content: processedPrompt
    });
  }
  
  // Add image generation prompt for image generation models
  if (isImageGenModel) {
    messages.push({
      role: 'system',
      content: IMAGE_GENERATION_PROMPT
    });
  }
  
  // Add conversation history
  messages.push(...conversationHistory.map((m: any) => ({
    role: m.role,
    content: m.content
  })));

  // Build current user message content
  let userContent: OpenRouterMessage['content'];
  
  if (attachments.length > 0) {
    // Create multimodal content with images
    const contentParts: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [];
    
    // Add text part
    if (message.trim()) {
      contentParts.push({ type: 'text', text: message });
    }
    
    // Add image parts
    for (const attachment of attachments) {
      if (attachment.type === 'image') {
        contentParts.push({
          type: 'image_url',
          image_url: { url: attachment.url }
        });
      }
    }
    
    userContent = contentParts;
  } else {
    // Text-only message
    userContent = message;
  }
  
  // Add current user message
  messages.push({
    role: 'user',
    content: userContent
  });
  
  return messages;
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  try {
    // Apply rate limiting
    const clientIp = getClientAddress();
    const rateLimit = checkRateLimit(clientIp);
    
    if (!rateLimit.allowed) {
      return json({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
      }, {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.resetTime.toString()
        }
      });
    }

    const body = await request.json();
    const { 
      message, 
      attachments = [], 
      mode = 'auto', 
      models = [], 
      apiKey, 
      conversationHistory = [], 
      systemPrompt,
      imageOptions
    } = body;

    if (!apiKey) {
      return json({ error: 'API key is required' }, { status: 401 });
    }

    // Validate API key format
    if (!isValidApiKey(apiKey)) {
      return json({ error: 'Invalid API key format' }, { status: 401 });
    }

    if (!message || typeof message !== 'string') {
      return json({ error: 'Message is required' }, { status: 400 });
    }

    // Validate message length
    if (message.length > MAX_MESSAGE_LENGTH) {
      return json({
        error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
        code: 'MESSAGE_TOO_LONG'
      }, { status: 400 });
    }

    // Sanitize user input
    const sanitizedMessage = sanitizeInput(message);
    if (!sanitizedMessage) {
      return json({ error: 'Message cannot be empty after sanitization' }, { status: 400 });
    }

    // Validate conversation history length
    if (conversationHistory.length > MAX_CONVERSATION_HISTORY) {
      return json({
        error: `Conversation history exceeds maximum of ${MAX_CONVERSATION_HISTORY} messages`,
        code: 'HISTORY_TOO_LONG'
      }, { status: 400 });
    }

    // Validate model selections
    if (mode === 'manual' && models.length > 0) {
      const invalidModels = models.filter((m: string) => !ALLOWED_MODELS.has(m));
      if (invalidModels.length > 0) {
        return json({
          error: 'Invalid model selection',
          invalidModels
        }, { status: 400 });
      }
    }

    if (mode === 'auto') {
      const routerDecision = await analyzeAndRoute(sanitizedMessage, attachments as MediaAttachment[], apiKey);
      
      const conversationMessages = buildConversationMessages(
        conversationHistory,
        sanitizedMessage,
        attachments as MediaAttachment[],
        systemPrompt,
        routerDecision.model
      );
      
      // Start title generation in parallel with streaming
      // FIX: Properly handle content that could be string or array
      const titlePromise = generateChatTitle(
        conversationMessages.map(m => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
        })),
        apiKey
      );

      const streamGenerator = (async function* () {
        yield {
          type: 'router',
          routerDecision
        } as StreamChunk;

        // Process the stream - title will be yielded after streaming completes
        // but both run in parallel
        for await (const chunk of createSSEStream(apiKey, routerDecision.model, conversationMessages, imageOptions)) {
          yield chunk;
        }

        // Wait for title generation to complete
        const summary = await titlePromise;
        yield { type: 'summary', summary } as StreamChunk;

        yield { type: 'done' } as StreamChunk;
      })();

      return createSSEResponse(streamGenerator);
    } else {
      if (!models || models.length === 0) {
        return json({ error: 'Models are required for manual mode' }, { status: 400 });
      }

      const multiStreamGenerator = (async function* () {
        // For multi-model mode, we'll use the first model for template processing
        // as a reasonable default
        const primaryModel = models[0];
        const conversationMessages = buildConversationMessages(
          conversationHistory,
          sanitizedMessage,
          attachments as MediaAttachment[],
          systemPrompt,
          primaryModel
        );
        
        // Start title generation in parallel with streaming for manual mode too
        // FIX: Properly handle content that could be string or array
        const titlePromise = generateChatTitle(
          conversationMessages.map(m => ({
            role: m.role,
            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
          })),
          apiKey
        );
        
        // Process the stream
        for await (const chunk of createMultiModelStream(apiKey, models, conversationMessages, imageOptions)) {
          yield chunk as StreamChunk;
        }
        
        // Wait for title generation to complete
        const summary = await titlePromise;
        yield { type: 'summary', summary } as StreamChunk;
        
        yield { type: 'done' } as StreamChunk;
      })();

      return createSSEResponse(multiStreamGenerator);
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
