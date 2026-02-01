import { createOpenRouterClient, type OpenRouterMessage, type OpenRouterStreamChunk, type OpenRouterUsage, type ImageConfig, type OpenRouterTool } from './openrouter';
import { IMAGE_GENERATION_MODELS } from '$lib/types';

export interface StreamChunk {
  type: 'content' | 'stats' | 'summary' | 'error' | 'done' | 'router';
  content?: string;
  model?: string;
  stats?: {
    tokensInput: number;
    tokensOutput: number;
    cost: number;
    latency: number;
    model: string;
  };
  summary?: string;
  error?: string;
  routerDecision?: {
    model: string;
    reasoning: string;
  };
}

export interface MultiStreamChunk {
  type: 'content' | 'stats' | 'error' | 'done' | 'summary';
  model: string;
  content?: string;
  stats?: {
    tokensInput: number;
    tokensOutput: number;
    cost: number;
    latency: number;
    model: string;
  };
  error?: string;
  summary?: string;
  aggregatedStats?: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
    averageLatency: number;
  };
}

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'deepseek/deepseek-r1-distill-qwen-32b': { input: 0.0002, output: 0.0008 },
  'x-ai/grok-4.1-fast': { input: 0.001, output: 0.005 },
  'google/gemini-2.5-flash-lite': { input: 0.0001, output: 0.0004 },
  'google/gemini-3-flash-preview': { input: 0.00015, output: 0.0006 },
  'anthropic/claude-4.5-sonnet': { input: 0.003, output: 0.015 },
  'openai/gpt-4o': { input: 0.01, output: 0.03 },
  'openai/gpt-oss-20b': { input: 0.0005, output: 0.002 },
  'google/gemini-2.5-flash-image': { input: 0.0002, output: 0.0008 },
  'bytedance-seed/seedream-4.5': { input: 0.001, output: 0.003 },
  'google/gemini-3-pro-image-preview': { input: 0, output: 0 }
};

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs = MODEL_COSTS[model] || { input: 0.001, output: 0.005 };
  return (inputTokens * costs.input + outputTokens * costs.output) / 1000;
}

export interface ImageGenerationOptions {
  aspectRatio?: ImageConfig['aspect_ratio'];
  imageSize?: ImageConfig['image_size'];
}

function isImageGenerationModel(model: string): boolean {
  return IMAGE_GENERATION_MODELS.includes(model as any);
}

export async function* createSSEStream(
  apiKey: string,
  model: string,
  messages: OpenRouterMessage[],
  imageOptions?: ImageGenerationOptions,
  tools?: OpenRouterTool[]
): AsyncGenerator<StreamChunk> {
  const client = createOpenRouterClient(apiKey);
  const startTime = Date.now();
  let fullContent = '';
  let usage: OpenRouterUsage | undefined;

  // Check if this is an image generation model
  const isImageGenModel = isImageGenerationModel(model);

  // Build request parameters
  const requestParams: Parameters<typeof client.createStreamingCompletion>[0] = {
    model,
    messages,
    temperature: 0.7
  };

  // Add tools if provided
  if (tools && tools.length > 0) {
    requestParams.tools = tools;
    requestParams.tool_choice = 'auto';
  }

  // Add image generation parameters for image generation models
  if (isImageGenModel) {
    requestParams.modalities = ['text', 'image'];
    
    // Add image config if options provided
    if (imageOptions?.aspectRatio || imageOptions?.imageSize) {
      requestParams.image_config = {};
      if (imageOptions.aspectRatio) {
        requestParams.image_config.aspect_ratio = imageOptions.aspectRatio;
      }
      if (imageOptions.imageSize) {
        requestParams.image_config.image_size = imageOptions.imageSize;
      }
    }
  }

  try {
    for await (const chunk of client.createStreamingCompletion(requestParams)) {
      const delta = chunk.choices[0]?.delta;
      
      // Handle images field from image generation models (non-streaming style)
      if (delta?.images && Array.isArray(delta.images)) {
        for (const image of delta.images) {
          if (image.image_url?.url) {
            const imageUrl = image.image_url.url;
            // Convert to markdown image syntax so it can be extracted and displayed
            const markdownImage = `\n![Generated Image](${imageUrl})\n`;
            fullContent += markdownImage;
            yield {
              type: 'content',
              content: markdownImage,
              model
            };
          }
        }
      }
      
      // Handle content as string
      if (typeof delta?.content === 'string') {
        fullContent += delta.content;
        yield {
          type: 'content',
          content: delta.content,
          model
        };
      }
      
      // Handle content as array (multimodal responses including images)
      if (Array.isArray(delta?.content)) {
        for (const part of delta.content) {
          if (part.type === 'text' && part.text) {
            fullContent += part.text;
            yield {
              type: 'content',
              content: part.text,
              model
            };
          }
          // Handle image parts from image generation models
          if (part.type === 'image_url' && part.image_url?.url) {
            const imageUrl = part.image_url.url;
            // Convert to markdown image syntax so it can be extracted and displayed
            // Use proper markdown format that will be recognized by the extraction regex
            const markdownImage = `\n![Generated Image](${imageUrl})\n`;
            fullContent += markdownImage;
            yield {
              type: 'content',
              content: markdownImage,
              model
            };
          }
        }
      }

      if (chunk.usage) {
        usage = chunk.usage;
      }
    }

    const latency = Date.now() - startTime;

    if (usage) {
      yield {
        type: 'stats',
        model,
        stats: {
          tokensInput: usage.prompt_tokens,
          tokensOutput: usage.completion_tokens,
          cost: calculateCost(model, usage.prompt_tokens, usage.completion_tokens),
          latency,
          model
        }
      };
    }

    yield {
      type: 'done',
      model
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check if the error is about tool use not being supported
    if (tools && tools.length > 0 && errorMessage.includes('No endpoints found that support tool use')) {
      console.log(`Model ${model} does not support tool use, retrying without tools...`);
      
      // Retry without tools
      const retryParams: Parameters<typeof client.createStreamingCompletion>[0] = {
        model,
        messages,
        temperature: 0.7
      };
      
      // Add image generation parameters for image generation models (without tools)
      if (isImageGenModel) {
        retryParams.modalities = ['text', 'image'];
        if (imageOptions?.aspectRatio || imageOptions?.imageSize) {
          retryParams.image_config = {};
          if (imageOptions.aspectRatio) {
            retryParams.image_config.aspect_ratio = imageOptions.aspectRatio;
          }
          if (imageOptions.imageSize) {
            retryParams.image_config.image_size = imageOptions.imageSize;
          }
        }
      }
      
      try {
        for await (const chunk of client.createStreamingCompletion(retryParams)) {
          const delta = chunk.choices[0]?.delta;
          
          if (typeof delta?.content === 'string') {
            fullContent += delta.content;
            yield {
              type: 'content',
              content: delta.content,
              model
            };
          }
          
          if (Array.isArray(delta?.content)) {
            for (const part of delta.content) {
              if (part.type === 'text' && part.text) {
                fullContent += part.text;
                yield {
                  type: 'content',
                  content: part.text,
                  model
                };
              }
            }
          }

          if (chunk.usage) {
            usage = chunk.usage;
          }
        }

        const latency = Date.now() - startTime;

        if (usage) {
          yield {
            type: 'stats',
            model,
            stats: {
              tokensInput: usage.prompt_tokens,
              tokensOutput: usage.completion_tokens,
              cost: calculateCost(model, usage.prompt_tokens, usage.completion_tokens),
              latency,
              model
            }
          };
        }

        yield {
          type: 'done',
          model
        };
        return;
      } catch (retryError) {
        console.error('Retry stream error:', retryError);
        yield {
          type: 'error',
          error: retryError instanceof Error ? retryError.message : 'Unknown error',
          model
        };
        return;
      }
    }
    
    console.error('Stream error:', error);
    yield {
      type: 'error',
      error: errorMessage,
      model
    };
  }
}

export async function* createMultiModelStream(
  apiKey: string,
  models: string[],
  messages: OpenRouterMessage[],
  imageOptions?: ImageGenerationOptions,
  tools?: OpenRouterTool[]
): AsyncGenerator<MultiStreamChunk> {
  const streams = models.map(model => ({
    model,
    generator: createSSEStream(apiKey, model, messages, imageOptions, tools),
    stats: { tokensInput: 0, tokensOutput: 0, cost: 0, latency: 0, model }
  }));

  const aggregatedStats = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    averageLatency: 0,
    completedModels: 0
  };

  // Create a shared queue for interleaving chunks from all models
  const chunkQueue: MultiStreamChunk[] = [];
  let activeStreams = streams.length;
  let resolveNextChunk: (() => void) | null = null;

  // Start all streams and push chunks to the queue as they arrive
  const streamPromises = streams.map(async (stream) => {
    try {
      for await (const chunk of stream.generator) {
        if (chunk.type === 'content' && chunk.content) {
          const multiChunk: MultiStreamChunk = {
            type: 'content',
            model: stream.model,
            content: chunk.content
          };
          chunkQueue.push(multiChunk);
          if (resolveNextChunk) {
            resolveNextChunk();
            resolveNextChunk = null;
          }
        } else if (chunk.type === 'stats' && chunk.stats) {
          stream.stats = chunk.stats;
          aggregatedStats.totalInputTokens += chunk.stats.tokensInput;
          aggregatedStats.totalOutputTokens += chunk.stats.tokensOutput;
          aggregatedStats.totalCost += chunk.stats.cost;
          aggregatedStats.averageLatency += chunk.stats.latency;
          aggregatedStats.completedModels += 1;
          
          const multiChunk: MultiStreamChunk = {
            type: 'stats',
            model: stream.model,
            stats: chunk.stats
          };
          chunkQueue.push(multiChunk);
          if (resolveNextChunk) {
            resolveNextChunk();
            resolveNextChunk = null;
          }
        } else if (chunk.type === 'error' && chunk.error) {
          const multiChunk: MultiStreamChunk = {
            type: 'error',
            model: stream.model,
            error: chunk.error
          };
          chunkQueue.push(multiChunk);
          if (resolveNextChunk) {
            resolveNextChunk();
            resolveNextChunk = null;
          }
        }
      }
    } finally {
      activeStreams--;
      if (resolveNextChunk) {
        resolveNextChunk();
        resolveNextChunk = null;
      }
    }
  });

  // Yield chunks as they become available
  while (activeStreams > 0 || chunkQueue.length > 0) {
    if (chunkQueue.length > 0) {
      yield chunkQueue.shift()!;
    } else {
      // Wait for the next chunk to arrive
      await new Promise<void>(resolve => {
        resolveNextChunk = resolve;
      });
    }
  }

  // Wait for all streams to complete
  await Promise.allSettled(streamPromises);

  // Yield any remaining chunks
  while (chunkQueue.length > 0) {
    yield chunkQueue.shift()!;
  }

  if (aggregatedStats.completedModels > 0) {
    aggregatedStats.averageLatency = aggregatedStats.averageLatency / aggregatedStats.completedModels;
  }

  yield {
    type: 'done',
    model: 'multi',
    aggregatedStats: {
      totalInputTokens: aggregatedStats.totalInputTokens,
      totalOutputTokens: aggregatedStats.totalOutputTokens,
      totalCost: aggregatedStats.totalCost,
      averageLatency: aggregatedStats.averageLatency
    }
  };
}

export function createSSEResponse(generator: AsyncGenerator<StreamChunk> | AsyncGenerator<MultiStreamChunk>): Response {
  const encoder = new TextEncoder();
  let isClosed = false;
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of generator) {
          if (isClosed) break;
          
          try {
            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(encoder.encode(data));
          } catch (enqueueError) {
            // Controller might be closed, stop processing
            if ((enqueueError as Error).message?.includes('Controller is already closed')) {
              isClosed = true;
              break;
            }
            throw enqueueError;
          }
        }
        
        if (!isClosed) {
          try {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (closeError) {
            // Controller already closed, ignore
          }
        }
      } catch (error) {
        console.error('SSE stream error:', error);
        if (!isClosed) {
          try {
            const errorData = `data: ${JSON.stringify({ type: 'error', error: 'Stream failed' })}\n\n`;
            controller.enqueue(encoder.encode(errorData));
            controller.close();
          } catch {
            // Controller already closed, ignore
          }
        }
      }
    },
    cancel() {
      // Client disconnected
      isClosed = true;
      console.log('SSE stream cancelled by client');
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
