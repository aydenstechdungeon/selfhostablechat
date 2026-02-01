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
  // Reasoning/chain-of-thought data
  reasoning?: ReasoningData;
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

export interface ReasoningStep {
  step: number;
  title: string;
  content: string;
  type: 'analysis' | 'deduction' | 'planning' | 'reflection' | 'conclusion';
}

export interface ReasoningData {
  steps: ReasoningStep[];
  rawContent?: string;
  model: string;
  timestamp: Date;
}

export interface MediaAttachment {
  id: string;
  type: 'image' | 'video' | 'document' | 'audio' | 'file';
  url: string;
  name?: string;
  thumbnail?: string;
  generatedBy?: string;
  timestamp: Date;
  mimeType?: string;
  size?: number;
}

// Supported file types for upload
export const SUPPORTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/svg+xml',
  'image/bmp',
  'image/tiff'
] as const;

export const SUPPORTED_DOCUMENT_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/xml',
  'text/xml',
  'text/html',
  'application/javascript',
  'text/javascript',
  'text/css',
  'text/typescript',
  'application/typescript'
] as const;

export const SUPPORTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
  'audio/mp4',
  'audio/aac'
] as const;

export const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime'
] as const;

// All supported MIME types
export const ALL_SUPPORTED_TYPES = [
  ...SUPPORTED_IMAGE_TYPES,
  ...SUPPORTED_DOCUMENT_TYPES,
  ...SUPPORTED_AUDIO_TYPES,
  ...SUPPORTED_VIDEO_TYPES
] as const;

// Maximum file size (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Get file type category from MIME type
export function getFileTypeCategory(mimeType: string): 'image' | 'video' | 'document' | 'audio' | 'file' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (SUPPORTED_DOCUMENT_TYPES.includes(mimeType as any)) return 'document';
  return 'file';
}

// Get file extension from MIME type
export function getFileExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff',
    'application/pdf': 'pdf',
    'text/plain': 'txt',
    'text/markdown': 'md',
    'text/csv': 'csv',
    'application/json': 'json',
    'application/xml': 'xml',
    'text/xml': 'xml',
    'text/html': 'html',
    'application/javascript': 'js',
    'text/javascript': 'js',
    'text/css': 'css',
    'text/typescript': 'ts',
    'application/typescript': 'ts',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/webm': 'webm',
    'audio/mp4': 'm4a',
    'audio/aac': 'aac',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/ogg': 'ogv',
    'video/quicktime': 'mov'
  };
  return extensions[mimeType] || 'bin';
}

// Image conversion formats
export const IMAGE_CONVERSION_FORMATS = [
  { format: 'png', mimeType: 'image/png', label: 'PNG' },
  { format: 'jpeg', mimeType: 'image/jpeg', label: 'JPEG' },
  { format: 'webp', mimeType: 'image/webp', label: 'WebP' },
  { format: 'avif', mimeType: 'image/avif', label: 'AVIF' }
] as const;

export type ImageConversionFormat = typeof IMAGE_CONVERSION_FORMATS[number]['format'];

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
