import { createOpenRouterClient, SUMMARIZER_MODEL, type OpenRouterMessage } from './openrouter';

const SUMMARY_PROMPT = `Generate a concise, descriptive title for this conversation (max 60 characters). Focus on the main topic or question. Respond with ONLY the title text, no quotes or extra formatting.

Examples:
- "JavaScript async/await patterns"
- "Python data analysis tips"
- "Debug React rendering issue"
- "Plan marketing strategy"

Keep it short, clear, and specific.`;

export async function generateChatSummary(
  messages: Array<{ role: string; content: string | any[] }>,
  apiKey: string,
  zeroDataRetention?: boolean
): Promise<string> {
  const client = createOpenRouterClient(apiKey);

  // Filter out system messages and empty content, take last 5 relevant messages
  const relevantMessages = messages
    .filter(m => m.role !== 'system' && m.content)
    .slice(-5);

  // If no relevant messages, return default
  if (relevantMessages.length === 0) {
    return 'New Chat';
  }

  const conversationText = relevantMessages
    .map(m => {
      // Handle multimodal content (text + images)
      let content = m.content;
      if (Array.isArray(content)) {
        // Extract text parts from multimodal content
        content = content
          .filter((part: any) => part.type === 'text')
          .map((part: any) => part.text)
          .join(' ');
      }
      return `${m.role === 'user' ? 'User' : 'Assistant'}: ${String(content).substring(0, 500)}`;
    })
    .join('\n\n');

  const summaryMessages: OpenRouterMessage[] = [
    {
      role: 'system',
      content: SUMMARY_PROMPT
    },
    {
      role: 'user',
      content: `Conversation:\n${conversationText}\n\nTitle:`
    }
  ];

  try {
    const request: any = {
      model: SUMMARIZER_MODEL,
      messages: summaryMessages,
      temperature: 0.5,
      max_tokens: 50
    };

    if (zeroDataRetention) {
      request.provider = { zdr: true };
    }

    const response = await client.createCompletion(request);

    let summary = response.choices[0]?.message?.content;

    // Handle multimodal response (extract text from array if needed)
    if (Array.isArray(summary)) {
      summary = summary
        .filter((part: any) => part.type === 'text' && part.text)
        .map((part: any) => part.text)
        .join('');
    }

    summary = summary?.trim();

    // If no summary or empty, use first user message as fallback
    if (!summary || summary.trim() === '' || summary.toLowerCase() === 'new chat') {
      const firstUserMessage = relevantMessages.find(m => m.role === 'user');
      if (firstUserMessage) {
        let content = firstUserMessage.content;
        if (Array.isArray(content)) {
          content = content
            .filter((part: any) => part.type === 'text')
            .map((part: any) => part.text)
            .join(' ');
        }
        summary = String(content).substring(0, 50).trim();
        if (summary.length > 47) {
          summary = summary.substring(0, 47) + '...';
        }
      } else {
        summary = 'New Chat';
      }
    }

    summary = summary.replace(/^["']|["']$/g, '').trim();

    if (summary.length > 60) {
      summary = summary.substring(0, 57) + '...';
    }

    return summary || 'New Chat';
  } catch (error) {
    console.error('Summary generation error:', error);
    // Fallback to first user message on error
    const firstUserMessage = relevantMessages.find(m => m.role === 'user');
    if (firstUserMessage) {
      let content = firstUserMessage.content;
      if (Array.isArray(content)) {
        content = content
          .filter((part: any) => part.type === 'text')
          .map((part: any) => part.text)
          .join(' ');
      }
      const fallback = String(content).substring(0, 50).trim();
      return fallback.length > 47 ? fallback.substring(0, 47) + '...' : fallback;
    }
    return 'New Chat';
  }
}

export async function generateStreamingSummary(
  messages: Array<{ role: string; content: string | any[] }>,
  apiKey: string,
  zeroDataRetention?: boolean
): Promise<AsyncGenerator<string>> {
  const client = createOpenRouterClient(apiKey);

  // Filter out system messages and empty content, take last 5 relevant messages
  const relevantMessages = messages
    .filter(m => m.role !== 'system' && m.content)
    .slice(-5);

  // If no relevant messages, yield default and return
  if (relevantMessages.length === 0) {
    return (async function* () {
      yield 'New Chat';
    })();
  }

  const conversationText = relevantMessages
    .map(m => {
      // Handle multimodal content (text + images)
      let content = m.content;
      if (Array.isArray(content)) {
        // Extract text parts from multimodal content
        content = content
          .filter((part: any) => part.type === 'text')
          .map((part: any) => part.text)
          .join(' ');
      }
      return `${m.role === 'user' ? 'User' : 'Assistant'}: ${String(content).substring(0, 500)}`;
    })
    .join('\n\n');

  const summaryMessages: OpenRouterMessage[] = [
    {
      role: 'system',
      content: SUMMARY_PROMPT
    },
    {
      role: 'user',
      content: `Conversation:\n${conversationText}\n\nTitle:`
    }
  ];

  return (async function* () {
    try {
      let summary = '';
      let hasYielded = false;

      const request: any = {
        model: SUMMARIZER_MODEL,
        messages: summaryMessages,
        temperature: 0.5,
        max_tokens: 50
      };

      if (zeroDataRetention) {
        request.provider = { zdr: true };
      }

      for await (const chunk of client.createStreamingCompletion(request)) {
        const deltaContent = chunk.choices[0]?.delta?.content;
        if (deltaContent) {
          // Handle multimodal streaming response
          let textContent: string;
          if (Array.isArray(deltaContent)) {
            textContent = deltaContent
              .filter((part: any) => part.type === 'text' && part.text)
              .map((part: any) => part.text)
              .join('');
          } else {
            textContent = deltaContent;
          }

          if (textContent) {
            summary += textContent;
            hasYielded = true;
            yield summary.trim();
          }
        }
      }

      // If nothing was generated, use first user message as fallback
      if (!hasYielded || !summary.trim() || summary.toLowerCase() === 'new chat') {
        const firstUserMessage = relevantMessages.find(m => m.role === 'user');
        if (firstUserMessage) {
          let content = firstUserMessage.content;
          if (Array.isArray(content)) {
            content = content
              .filter((part: any) => part.type === 'text')
              .map((part: any) => part.text)
              .join(' ');
          }
          let fallback = String(content).substring(0, 50).trim();
          if (fallback.length > 47) {
            fallback = fallback.substring(0, 47) + '...';
          }
          yield fallback;
        } else {
          yield 'New Chat';
        }
      }
    } catch (error) {
      console.error('Streaming summary error:', error);
      // Fallback to first user message on error
      const firstUserMessage = relevantMessages.find(m => m.role === 'user');
      if (firstUserMessage) {
        let content = firstUserMessage.content;
        if (Array.isArray(content)) {
          content = content
            .filter((part: any) => part.type === 'text')
            .map((part: any) => part.text)
            .join(' ');
        }
        const fallback = String(content).substring(0, 50).trim();
        yield fallback.length > 47 ? fallback.substring(0, 47) + '...' : fallback;
      } else {
        yield 'New Chat';
      }
    }
  })();
}
