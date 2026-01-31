<script lang="ts">
	import { onMount } from 'svelte';
	import { BarChart3, MessageSquare, DollarSign, Clock } from 'lucide-svelte';
	import { uiStore } from '$lib/stores/uiStore';
	import { statsStore } from '$lib/stores/statsStore';
	import RefreshTimer from '$lib/components/dashboard/RefreshTimer.svelte';
	import ChartPlaceholder from '$lib/components/dashboard/ChartPlaceholder.svelte';
	import LineChart from '$lib/components/dashboard/LineChart.svelte';
	
	let theme = $derived($uiStore.theme);
	// Resolve 'auto' theme to actual light/dark for child components
	let effectiveTheme = $derived(theme === 'auto'
		? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
		: theme
	);
	let store = $derived($statsStore);
	let stats = $derived(store.dashboardStats);
	let chartData = $derived(store.chartData);
	let isLoading = $derived(store.isLoading);
	
	let timeRange = $state<'day' | 'week' | 'month'>('week');
	
	async function handleRefresh() {
		await statsStore.fetchDashboardStats(timeRange);
	}
	
	onMount(() => {
		handleRefresh();
	});
	
	let cardBg = $derived(theme === 'light' ? '#ffffff' : '#1a1f2e');
	let textPrimary = $derived(theme === 'light' ? '#1f2937' : '#e2e8f0');
	let textSecondary = $derived(theme === 'light' ? '#6b7280' : '#a0aec0');
</script>

<div class="dashboard-page px-8 py-6 overflow-y-auto h-full">
	<div class="max-w-7xl mx-auto">
		<div class="dashboard-header flex items-center justify-between mb-8">
			<h1 class="text-3xl font-bold" style:color={textPrimary}>Dashboard</h1>
			<div class="flex items-center gap-4">
				<select
					class="px-3 py-2 rounded-lg border text-sm"
					style:background-color={cardBg}
					style:border-color={theme === 'light' ? '#e5e7eb' : '#2d3748'}
					style:color={textPrimary}
					bind:value={timeRange}
					onchange={handleRefresh}
				>
					<option value="day">Last 24 hours</option>
					<option value="week">Last 7 days</option>
					<option value="month">Last 30 days</option>
				</select>
				<RefreshTimer theme={effectiveTheme} onRefresh={handleRefresh} />
			</div>
		</div>
		
		{#if isLoading}
			<div class="flex items-center justify-center h-64" style:color={textSecondary}>
				<div class="text-center">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
					<p>Loading statistics...</p>
				</div>
			</div>
		{:else if stats}
			<div class="stats-cards grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
				<div class="stat-card card" style:background-color={cardBg}>
					<div class="flex items-center gap-3 mb-4">
						<div class="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
							<DollarSign size={20} class="text-success" />
						</div>
						<h3 class="text-xs uppercase tracking-wide" style:color={textSecondary}>Total Cost</h3>
					</div>
					<div class="value text-3xl font-bold mb-2" style:color={textPrimary}>
						${stats.totalCost.toFixed(2)}
					</div>
					<div class="change text-sm {stats.costChange >= 0 ? 'text-success' : 'text-error'}">
						{stats.costChange >= 0 ? '+' : ''}{stats.costChange}% from last period
					</div>
				</div>
				
				<div class="stat-card card" style:background-color={cardBg}>
					<div class="flex items-center gap-3 mb-4">
						<div class="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
							<BarChart3 size={20} class="text-primary-500" />
						</div>
						<h3 class="text-xs uppercase tracking-wide" style:color={textSecondary}>Total Tokens</h3>
					</div>
					<div class="value text-3xl font-bold mb-2" style:color={textPrimary}>
						{stats.totalTokens >= 1000 ? (stats.totalTokens / 1000).toFixed(1) + 'K' : stats.totalTokens}
					</div>
					<div class="change text-sm {stats.tokensChange >= 0 ? 'text-success' : 'text-error'}">
						{stats.tokensChange >= 0 ? '+' : ''}{stats.tokensChange}% from last period
					</div>
				</div>
				
				<div class="stat-card card" style:background-color={cardBg}>
					<div class="flex items-center gap-3 mb-4">
						<div class="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
							<MessageSquare size={20} class="text-warning" />
						</div>
						<h3 class="text-xs uppercase tracking-wide" style:color={textSecondary}>Total Messages</h3>
					</div>
					<div class="value text-3xl font-bold mb-2" style:color={textPrimary}>
						{stats.totalMessages}
					</div>
					<div class="change text-sm {stats.messagesChange >= 0 ? 'text-success' : 'text-error'}">
						{stats.messagesChange >= 0 ? '+' : ''}{stats.messagesChange}% from last period
					</div>
				</div>
				
				<div class="stat-card card" style:background-color={cardBg}>
					<div class="flex items-center gap-3 mb-4">
						<div class="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
							<Clock size={20} class="text-primary-500" />
						</div>
						<h3 class="text-xs uppercase tracking-wide" style:color={textSecondary}>Avg Latency</h3>
					</div>
					<div class="value text-3xl font-bold mb-2" style:color={textPrimary}>
						{Math.round(stats.avgLatency)}ms
					</div>
					<div class="change text-sm {stats.latencyChange >= 0 ? 'text-error' : 'text-success'}">
						{stats.latencyChange >= 0 ? '+' : ''}{stats.latencyChange}% from last period
					</div>
				</div>
			</div>
		{:else}
			<div class="flex items-center justify-center h-64" style:color={textSecondary}>
				<div class="text-center">
					<p class="mb-2">No data available</p>
					<p class="text-sm">Start chatting to see your statistics</p>
				</div>
			</div>
		{/if}
		
		{#if chartData}
			<div class="charts-grid grid grid-cols-1 lg:grid-cols-2 gap-6">
				<ChartPlaceholder 
					title="Messages Per Model" 
					data={chartData.messagesPerModel}
					type="bar"
					theme={effectiveTheme}
				/>
				
				<LineChart 
					title="Cost Over Time" 
					data={chartData.costOverTime}
					theme={effectiveTheme}
				/>
				
				<LineChart 
					title="Token Usage Over Time" 
					data={chartData.tokenUsageOverTime}
					theme={effectiveTheme}
				/>
				
				<div class="chart-card card" style:background-color={cardBg}>
					<h3 class="text-base font-semibold mb-5" style:color={textPrimary}>Latency Distribution</h3>
					<div class="flex items-center justify-center h-64" style:color={textSecondary}>
						<div class="text-center">
							<p class="mb-2">Average latency by model</p>
							<p class="text-xs">{chartData.latencyDistribution.length} models tracked</p>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
