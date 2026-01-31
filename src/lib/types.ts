export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  stats?: MessageStats;
  timestamp: Date;
  media?: MediaAttachment[];
  // Generated/received images from AI
  generatedMedia?: MediaAttachment[];
  // Tree branching fields for edit history
  parentId?: string | null;
  branchId?: string;
  branchIndex?: number;
  isEdited?: boolean;
  editedAt?: Date;
  // Auto-save field for partial responses
  isPartial?: boolean;
}

// Represents a branch of messages (a conversation path)
export interface MessageBranch {
  id: string;
  chatId: string;
  rootMessageId: string; // The user message that started this branch
  name: string;
  createdAt: Date;
  messageCount: number;
}

// A node in the message tree with all its siblings
export interface MessageNode {
  message: Message;
  siblings: Message[]; // All versions of this message at the same position
  children: MessageNode[];
}

// For navigation: current position in the tree
export interface TreePosition {
  messageId: string;
  branchId: string;
  siblingIndex: number;
  totalSiblings: number;
}

export interface MessageStats {
  tokensInput: number;
  tokensOutput: number;
  cost: number;
  latency: number;
  model: string;
}

export interface MediaAttachment {
  id: string;
  type: 'image' | 'video';
  url: string;
  name?: string;
  thumbnail?: string;
  generatedBy?: string;
  timestamp: Date;
}

export interface Chat {
  id: string;
  title: string;
  models: string[];
  preview: string;
  lastActivity: Date;
  messageCount: number;
  totalCost: number;
  totalTokens: number;
}

export interface Model {
  id: string;
  name: string;
  displayName: string;
  brand: string;
  category: string;
  icon?: string;
  contextWindow: number;
  costPerToken: {
    input: number;
    output: number;
  };
  capabilities: string[];
  isRecommended?: boolean;
  supportsImageGeneration?: boolean;
  supportsImages?: boolean;
  imageConfig?: {
    supportsAspectRatio?: boolean;
    supportsImageSize?: boolean;
  };
}

export interface ModelCategory {
  id: string;
  name: string;
  brands: ModelBrand[];
}

export interface ModelBrand {
  id: string;
  name: string;
  icon: string;
  models: Model[];
}

export interface ChatFilter {
  models?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  costRange?: {
    min: number;
    max: number;
  };
  sortBy: 'recent' | 'expensive' | 'tokens';
}

export interface UserSettings {
  defaultModel: string | 'auto';
  autoSaveFrequency: 'realtime' | '30s' | '5min';
  chatTitleGeneration: boolean;
  streamingAnimation: boolean;
  multiModelDisplayMode: 'split' | 'stacked' | 'tabbed';
  pinnedModels: string[];
  modelCostAlert: {
    enabled: boolean;
    threshold: number;
  };
  theme: 'dark' | 'light' | 'auto';
  fontSize: number;
  compactMode: boolean;
  codeSyntaxTheme: string;
}

// Note: Old version interfaces removed - now using tree-based branching with MessageBranch

export interface DashboardStats {
  totalCost: number;
  totalTokens: number;
  totalMessages: number;
  avgLatency: number;
  costChange: number;
  tokensChange: number;
  messagesChange: number;
  latencyChange: number;
}

export interface ChartData {
  costOverTime: TimeSeriesData[];
  tokenUsageOverTime: TimeSeriesData[];
  messagesPerModel: BarChartData[];
  latencyDistribution: BoxPlotData[];
}

export interface TimeSeriesData {
  date: Date;
  value: number;
  model?: string;
}

export interface BarChartData {
  label: string;
  value: number;
}

export interface BoxPlotData {
  model: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

// Shared constants for models that support image input
// These can be imported by both client and server code
// Models that support image input (vision models)
export const IMAGE_MODELS = [
  'google/gemini-2.5-flash-lite',
  'google/gemini-3-flash-preview',
  'google/gemini-3-pro-preview',
  'openai/gpt-4o-mini',
  'openai/gpt-5.1',
  'openai/gpt-5.2',
  'openai/gpt-5-mini',
  'anthropic/claude-4.5-sonnet',
  'anthropic/claude-opus-4.5',
  'google/gemini-2.5-flash-image',
  'google/gemini-3-pro-image-preview'
] as const;

// Models that can generate images
export const IMAGE_GENERATION_MODELS = [
  'google/gemini-2.5-flash-image',
  'google/gemini-3-pro-image-preview',
  'black-forest-labs/flux.2-pro',
  'black-forest-labs/flux.2-flex',
  'sourceful/riverflow-v2-standard-preview',
  'bytedance-seed/seedream-4.5'
] as const;

export const AUTO_SUPPORTED_MODELS = [
  'openai/gpt-oss-20b:free',
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  'openai/gpt-4o-mini',
  'openai/gpt-5.1',
  'openai/gpt-5.2',
  'openai/gpt-5-mini',
  'x-ai/grok-4.1-fast',
  'google/gemini-2.5-flash-lite',
  'google/gemini-3-flash-preview',
  'anthropic/claude-4.5-sonnet',
  'anthropic/claude-opus-4.5',
  'bytedance-seed/seedream-4.5',
  'google/gemini-3-pro-image-preview',
  'google/gemini-2.5-flash-image',
  'deepseek/deepseek-v3.2',
  'meta/llama-4-scout',
  'meta/llama-4-maverick',
  'moonshotai/kimi-k2',
  'moonshotai/kimi-k2.5',
  'minimax/minimax-m2.1'
] as const;
