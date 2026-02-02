import { writable, derived } from 'svelte/store';
import type { StoredChat, StoredMessage } from './indexedDB';
import { chatDB } from './indexedDB';

export type SortOption = 'recent' | 'expensive' | 'cheapest' | 'tokens' | 'messages' | 'oldest';
export type DateRange = 'all' | 'today' | 'week' | 'month' | 'year';
export type SearchMode = 'name' | 'name_and_content';

export interface FilterState {
  sortBy: SortOption;
  dateRange: DateRange;
  minCost: number | null;
  maxCost: number | null;
  selectedModels: string[];
  searchQuery: string;
  searchMode: SearchMode;
}

const initialState: FilterState = {
  sortBy: 'recent',
  dateRange: 'all',
  minCost: null,
  maxCost: null,
  selectedModels: [],
  searchQuery: '',
  searchMode: 'name'
};

function createFilterStore() {
  const { subscribe, set, update } = writable<FilterState>(initialState);

  return {
    subscribe,
    
    setSortBy: (sortBy: SortOption) => update(state => ({ ...state, sortBy })),
    
    setDateRange: (dateRange: DateRange) => update(state => ({ ...state, dateRange })),
    
    setCostRange: (min: number | null, max: number | null) => 
      update(state => ({ ...state, minCost: min, maxCost: max })),
    
    toggleModel: (model: string) => update(state => {
      const models = state.selectedModels.includes(model)
        ? state.selectedModels.filter(m => m !== model)
        : [...state.selectedModels, model];
      return { ...state, selectedModels: models };
    }),
    
    setSelectedModels: (models: string[]) => update(state => ({ 
      ...state, 
      selectedModels: models 
    })),
    
    setSearchQuery: (searchQuery: string) => update(state => ({ ...state, searchQuery })),
    
    setSearchMode: (searchMode: SearchMode) => update(state => ({ ...state, searchMode })),
    
    reset: () => set(initialState),
    
    resetFilters: () => update(state => ({ 
      ...initialState, 
      searchQuery: state.searchQuery,
      searchMode: state.searchMode
    }))
  };
}

export const filterStore = createFilterStore();

// Cache for message content search
let messageCache: Map<string, StoredMessage[]> = new Map();

// Helper function to filter and sort chats
export async function filterAndSortChats(
  chats: StoredChat[], 
  filters: FilterState
): Promise<StoredChat[]> {
  let result = [...chats];

  // Apply search filter
  if (filters.searchQuery.trim()) {
    const query = filters.searchQuery.toLowerCase();
    
    if (filters.searchMode === 'name') {
      // Search by name only
      result = result.filter(chat => 
        chat.title.toLowerCase().includes(query)
      );
    } else {
      // Search by name and content
      const chatIdsWithMatch = await Promise.all(
        result.map(async (chat) => {
          // Check title first
          if (chat.title.toLowerCase().includes(query)) {
            return chat.id;
          }
          
          // Check message content
          try {
            const messages = await chatDB.getMessages(chat.id);
            const hasContentMatch = messages.some(msg => 
              msg.content.toLowerCase().includes(query)
            );
            if (hasContentMatch) {
              return chat.id;
            }
          } catch (e) {
            console.error('Failed to search messages:', e);
          }
          return null;
        })
      );
      
      const matchingIds = new Set(chatIdsWithMatch.filter(Boolean) as string[]);
      result = result.filter(chat => matchingIds.has(chat.id));
    }
  }

  // Apply date range filter
  if (filters.dateRange !== 'all') {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let cutoffDate: Date;

    switch (filters.dateRange) {
      case 'today':
        cutoffDate = startOfDay;
        break;
      case 'week':
        cutoffDate = new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        // Use accurate month calculation (30 days can be wrong)
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'year':
        // Use accurate year calculation (accounting for leap years)
        cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        cutoffDate = new Date(0);
    }

    result = result.filter(chat => new Date(chat.updatedAt) >= cutoffDate);
  }

  // Apply cost range filter
  if (filters.minCost !== null) {
    result = result.filter(chat => chat.totalCost >= filters.minCost!);
  }
  if (filters.maxCost !== null) {
    result = result.filter(chat => chat.totalCost <= filters.maxCost!);
  }

  // Apply model filter - case insensitive matching
  if (filters.selectedModels.length > 0) {
    result = result.filter(chat => {
      const chatModels = chat.models || [];
      // Use case-insensitive matching for model IDs
      return filters.selectedModels.some(selectedModel => 
        chatModels.some(chatModel => 
          chatModel.toLowerCase() === selectedModel.toLowerCase()
        )
      );
    });
  }

  // Apply sorting
  switch (filters.sortBy) {
    case 'recent':
      result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      break;
    case 'oldest':
      result.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
      break;
    case 'expensive':
      result.sort((a, b) => b.totalCost - a.totalCost);
      break;
    case 'cheapest':
      result.sort((a, b) => a.totalCost - b.totalCost);
      break;
    case 'tokens':
      result.sort((a, b) => b.totalTokens - a.totalTokens);
      break;
    case 'messages':
      result.sort((a, b) => b.messageCount - a.messageCount);
      break;
  }

  return result;
}

// Format cost with dynamic decimal places
export function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  
  // If cost is less than 0.01, show up to 4 decimal places
  if (cost < 0.01) {
    // Format with 4 decimal places, then trim trailing zeros
    const formatted = cost.toFixed(4);
    // Trim trailing zeros but keep at least 2 decimal places
    // Match: decimal point followed by 0-2 digits (keep), then optional non-zero digits, then zeros
    const trimmed = formatted.replace(/(\.[0-9]{2})[0-9]*$/, '$1');
    return `$${trimmed}`;
  }
  
  // For larger costs, use 2 decimal places
  return `$${cost.toFixed(2)}`;
}