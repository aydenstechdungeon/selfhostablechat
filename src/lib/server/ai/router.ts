import { createOpenRouterClient, AUTO_SUPPORTED_MODELS, IMAGE_MODELS, IMAGE_GENERATION_MODELS, ROUTER_MODEL, type OpenRouterMessage } from './openrouter';
import { AVAILABLE_MODELS } from '$lib/shared/models';

export interface RouterDecision {
  model: string;
  reasoning: string;
}

export interface MediaAttachment {
  type: 'image' | 'video' | 'document' | 'audio' | 'file';
  url: string;
  name?: string;
  mimeType?: string;
  size?: number;
}

export const IMAGE_GENERATION_PROMPT = `You are an AI image generation assistant. When the user requests an image, you should generate it and include the image in your response using markdown image syntax: ![description](image_url).

Guidelines:
- Generate the image based on the user's description
- Include the generated image in your response using markdown: ![description](image_url)
- Provide a brief description of what you generated
- If the request is unclear, ask for clarification`;

// Tool definition for image conversion
export const IMAGE_CONVERSION_TOOL = {
  type: 'function' as const,
  function: {
    name: 'convert_image',
    description: 'Convert an image from one format to another (e.g., PNG to WebP, JPEG to PNG, WebP to AVIF). Use this when the user wants to convert an image to a different format.',
    parameters: {
      type: 'object',
      properties: {
        image_url: {
          type: 'string',
          description: 'The URL or base64 data URL of the image to convert'
        },
        target_format: {
          type: 'string',
          enum: ['png', 'jpeg', 'webp', 'avif'],
          description: 'The target format to convert the image to'
        },
        quality: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          default: 92,
          description: 'Quality setting for lossy formats (JPEG, WebP), 1-100. Higher is better quality but larger file size. PNG ignores this value.'
        }
      },
      required: ['image_url', 'target_format']
    }
  }
};

// Tools available to the AI
export const AVAILABLE_TOOLS = [IMAGE_CONVERSION_TOOL];

const ROUTING_PROMPT = `You are a model routing assistant. Analyze the user's message and choose the BEST single model from this list:

Available models:
- x-ai/grok-4.1-fast: Best for general stuff like questions and stuff
- google/gemini-2.5-flash-lite: Fast, efficient general purpose
- google/gemini-3-flash-preview: Fast, good vision capabilities
- anthropic/claude-4.5-sonnet: Best for coding and writing
- google/gemini-3-pro-image-preview: Best for high-quality image generation (officailly nano banana pro; supports 4K, aspect ratios)
- google/gemini-2.5-flash-image: Specialized for image analysis and vision tasks (officailly nano banana)
- black-forest-labs/flux.2-pro: Professional image generation with excellent quality
- black-forest-labs/flux.2-flex: Flexible image generation model

Guidelines:
- For general questions, chat, and common tasks: grok-4.1-fast
- For coding, technical writing, or complex prose: claude-4.5-sonnet
- For quick queries or light tasks: gemini-2.5-flash-lite or gemini-3-flash-preview
- For image generation requests (create, generate, draw an image): google/gemini-3-pro-image-preview or google/gemini-2.5-flash-image
- For analyzing images: gemini-2.5-flash-image or gemini-3-flash-preview
- For creative storytelling: bytedance-seed/seedream-4.5 or claude-4.5-sonnet

Respond ONLY with JSON in this exact format:
{
  "model": "chosen-model-id",
  "reasoning": "brief explanation (max 100 chars)"
}`;

// Keywords that indicate image generation requests
const IMAGE_GENERATION_KEYWORDS = [
  'generate an image', 'generate image', 'generate a picture', 'generate picture',
  'create an image', 'create image', 'create a picture', 'create picture',
  'draw an image', 'draw image', 'draw a picture', 'draw picture',
  'make an image', 'make image', 'make a picture', 'make picture',
  'render an image', 'render image', 'render a picture', 'render picture',
  'image of', 'picture of', 'photo of', 'drawing of',
  'illustration of', 'portrait of', 'scene of'
];

function isImageGenerationRequest(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return IMAGE_GENERATION_KEYWORDS.some(keyword => lowerMessage.includes(keyword.toLowerCase()));
}

export async function analyzeAndRoute(
  userMessage: string,
  attachments: MediaAttachment[] = [],
  apiKey: string,
  zeroDataRetention?: boolean
): Promise<RouterDecision> {
  if (attachments.some(a => a.type === 'image' || a.type === 'video')) {
    return {
      model: 'google/gemini-2.5-flash-image',
      reasoning: 'Image/video content detected'
    };
  }

  // Check if this is an image generation request
  if (isImageGenerationRequest(userMessage)) {
    return {
      model: 'google/gemini-3-pro-image-preview',
      reasoning: 'Image generation request detected'
    };
  }

  const client = createOpenRouterClient(apiKey);

  const messages: OpenRouterMessage[] = [
    {
      role: 'system',
      content: ROUTING_PROMPT
    },
    {
      role: 'user',
      content: userMessage
    }
  ];

  try {
    const request: any = {
      model: ROUTER_MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 150
    };

    if (zeroDataRetention) {
      request.provider = { zdr: true };
    }

    const response = await client.createCompletion(request);

    const rawContent = response.choices[0]?.message?.content || '';

    // Extract text content from multimodal response if needed
    let content: string;
    if (Array.isArray(rawContent)) {
      // Combine all text parts from the multimodal content
      content = rawContent
        .filter(part => part.type === 'text' && part.text)
        .map(part => part.text)
        .join('');
    } else {
      content = rawContent;
    }

    let decision: RouterDecision;

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        decision = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.warn('Failed to parse router response, using default model:', content);
      return {
        model: 'x-ai/grok-4.1-fast',
        reasoning: 'Fallback to default model'
      };
    }

    if (!AUTO_SUPPORTED_MODELS.includes(decision.model as any)) {
      console.warn('Router chose unsupported model, using default:', decision.model);
      return {
        model: 'x-ai/grok-4.1-fast',
        reasoning: 'Invalid model selected, using default'
      };
    }

    return decision;
  } catch (error) {
    console.error('Router error:', error);
    return {
      model: 'x-ai/grok-4.1-fast',
      reasoning: 'Router error, using default'
    };
  }
}

export function isImageModel(model: string): boolean {
  return IMAGE_MODELS.includes(model as any);
}

export function isImageGenerationModel(model: string): boolean {
  return IMAGE_GENERATION_MODELS.includes(model as any);
}

export function getModelCapabilities(model: string): {
  supportsImages: boolean;
  supportsStreaming: boolean;
  contextWindow: number;
} {
  const supportsImages = isImageModel(model);

  // Look up the actual context window from AVAILABLE_MODELS
  const modelInfo = AVAILABLE_MODELS.find(m => m.id === model);
  const contextWindow = modelInfo?.contextWindow || 128000; // Default fallback

  return {
    supportsImages,
    supportsStreaming: true,
    contextWindow
  };
}
