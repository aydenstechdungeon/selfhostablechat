import { writable } from 'svelte/store';

interface SystemPromptState {
  prompt: string;
  isEnabled: boolean;
}

const STORAGE_KEY = 'systemPrompt';

const DEFAULT_SYSTEM_PROMPT = `You are :model_name:, a large language model from :model_creator:.

Formatting Rules:
- Use Markdown for lists, tables, and styling.
- Use \`\`\`code fences\`\`\` for all code blocks.
- Format file names, paths, and function names with \`inline code\` backticks.
- **For all mathematical expressions, you must use dollar-sign delimiters. Use $...$ for inline math and $$...$$ for block math. Do not use (...) or [...] delimiters.**
- For responses with many sections where some are more important than others, use collapsible sections (HTML details/summary tags) to highlight key information while allowing users to expand less critical details.`;

const getInitialState = (): SystemPromptState => {
  if (typeof window === 'undefined') {
    return {
      prompt: DEFAULT_SYSTEM_PROMPT,
      isEnabled: true
    };
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return {
        prompt: parsed.prompt || '',
        isEnabled: parsed.isEnabled ?? false
      };
    } catch (e) {
      console.error('Failed to parse system prompt:', e);
    }
  }

  return {
    prompt: DEFAULT_SYSTEM_PROMPT,
    isEnabled: true
  };
};

const createSystemPromptStore = () => {
  const { subscribe, set, update } = writable<SystemPromptState>(getInitialState());

  const saveToStorage = (state: SystemPromptState) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  };

  return {
    subscribe,
    setPrompt: (prompt: string) => update(state => {
      const newState = { ...state, prompt };
      saveToStorage(newState);
      return newState;
    }),
    setEnabled: (isEnabled: boolean) => update(state => {
      const newState = { ...state, isEnabled };
      saveToStorage(newState);
      return newState;
    }),
    toggleEnabled: () => update(state => {
      const newState = { ...state, isEnabled: !state.isEnabled };
      saveToStorage(newState);
      return newState;
    }),
    reset: () => {
      const defaultState: SystemPromptState = {
        prompt: '',
        isEnabled: false
      };
      set(defaultState);
      saveToStorage(defaultState);
    },
    getEffectivePrompt: (): string | null => {
      let state: SystemPromptState | undefined;
      const unsubscribe = subscribe(s => { state = s; });
      unsubscribe();
      return state?.isEnabled && state?.prompt ? state.prompt : null;
    }
  };
};

export const systemPromptStore = createSystemPromptStore();
