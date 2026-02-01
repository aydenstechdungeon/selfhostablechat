import { writable } from 'svelte/store';
import type { MessageStats, DashboardStats, ChartData } from '../types';
import { chatDB } from './indexedDB';

interface StatsState {
  messageStats: Record<string, MessageStats | MessageStats[]>;
  aggregatedStats: {
    totalCost: number;
    totalTokens: number;
  };
  statsPanelOpen: boolean;
  targetMessageId: string | null;
  dashboardStats: DashboardStats | null;
  chartData: ChartData | null;
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
}

const createStatsStore = () => {
  const { subscribe, set, update } = writable<StatsState>({
    messageStats: {},
    aggregatedStats: {
      totalCost: 0,
      totalTokens: 0
    },
    statsPanelOpen: false,
    targetMessageId: null,
    dashboardStats: null,
    chartData: null,
    isLoading: false,
    error: null,
    lastFetch: null
  });

  return {
    subscribe,

    setMessageStats: (messageId: string, stats: MessageStats | MessageStats[]) => 
      update(state => ({
        ...state,
        messageStats: {
          ...state.messageStats,
          [messageId]: stats
        }
      })),

    updateAggregatedStats: () => update(state => {
      let totalCost = 0;
      let totalTokens = 0;
      
      Object.values(state.messageStats).forEach(stats => {
        if (Array.isArray(stats)) {
          stats.forEach(s => {
            totalCost += s.cost;
            totalTokens += s.tokensInput + s.tokensOutput;
          });
        } else {
          totalCost += stats.cost;
          totalTokens += stats.tokensInput + stats.tokensOutput;
        }
      });

      return {
        ...state,
        aggregatedStats: { totalCost, totalTokens }
      };
    }),

    async fetchDashboardStats(timeRange: 'day' | 'week' | 'month' = 'week') {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        // Get all chats from IndexedDB
        const chats = await chatDB.getAllChats();
        
        // Calculate stats from all chats
        let totalCost = 0;
        let totalTokens = 0;
        let totalMessages = 0;
        let totalLatency = 0;
        let messageCount = 0;
        
        const modelStats: Record<string, { count: number; cost: number; latency: number }> = {};
        
        for (const chat of chats) {
          const messages = await chatDB.getMessages(chat.id);
          for (const msg of messages) {
            if (msg.role === 'assistant' && msg.stats) {
              totalCost += msg.stats.cost || 0;
              totalTokens += (msg.stats.tokensInput || 0) + (msg.stats.tokensOutput || 0);
              totalMessages++;
              totalLatency += msg.stats.latency || 0;
              messageCount++;
              
              if (msg.model) {
                if (!modelStats[msg.model]) {
                  modelStats[msg.model] = { count: 0, cost: 0, latency: 0 };
                }
                modelStats[msg.model].count++;
                modelStats[msg.model].cost += msg.stats.cost || 0;
                modelStats[msg.model].latency += msg.stats.latency || 0;
              }
            }
          }
        }

        const dashboardStats: DashboardStats = {
          totalCost,
          totalTokens,
          totalMessages,
          avgLatency: messageCount > 0 ? totalLatency / messageCount : 0,
          costChange: 0,
          tokensChange: 0,
          messagesChange: 0,
          latencyChange: 0
        };

        // Build chart data
        const messagesPerModel = Object.entries(modelStats).map(([model, stats]) => ({
          label: model.split('/').pop() || model,
          value: stats.count
        }));

        // Cost over time (group by date)
        const costByDate: Record<string, number> = {};
        for (const chat of chats) {
          const date = new Date(chat.createdAt).toISOString().split('T')[0];
          costByDate[date] = (costByDate[date] || 0) + chat.totalCost;
        }
        
        const costOverTime = Object.entries(costByDate)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-30) // Last 30 days
          .map(([date, value]) => ({ date: new Date(date), value }));

        const chartData: ChartData = {
          costOverTime,
          tokenUsageOverTime: costOverTime.map(d => ({ ...d, value: d.value * 1000 })), // Approximate
          messagesPerModel,
          latencyDistribution: Object.entries(modelStats).map(([model, stats]) => {
            const avgLatency = stats.count > 0 ? stats.latency / stats.count : 0;
            return {
              model: model.split('/').pop() || model,
              min: avgLatency * 0.5,
              q1: avgLatency * 0.75,
              median: avgLatency,
              q3: avgLatency * 1.25,
              max: avgLatency * 1.5
            };
          })
        };

        update(state => ({
          ...state,
          dashboardStats,
          chartData,
          isLoading: false,
          lastFetch: Date.now()
        }));
      } catch (error) {
        update(state => ({
          ...state,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    },

    openStatsPanel: (messageId: string) => update(state => ({
      ...state,
      statsPanelOpen: true,
      targetMessageId: messageId
    })),

    closeStatsPanel: () => update(state => ({
      ...state,
      statsPanelOpen: false,
      targetMessageId: null
    })),

    clearError: () => update(state => ({ ...state, error: null })),

    reset: () => set({
      messageStats: {},
      aggregatedStats: {
        totalCost: 0,
        totalTokens: 0
      },
      statsPanelOpen: false,
      targetMessageId: null,
      dashboardStats: null,
      chartData: null,
      isLoading: false,
      error: null,
      lastFetch: null
    })
  };
};

export const statsStore = createStatsStore();
