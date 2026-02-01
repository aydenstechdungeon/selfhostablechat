<script lang="ts">
	import { onMount } from 'svelte';
	import { 
		BarChart3, 
		MessageSquare, 
		DollarSign, 
		Clock, 
		TrendingUp, 
		TrendingDown,
		Brain,
		Zap
	} from 'lucide-svelte';
	import { uiStore } from '$lib/stores/uiStore';
	import { statsStore } from '$lib/stores/statsStore';
	import { customModelsStore } from '$lib/stores/modelStore';
	import RefreshTimer from '$lib/components/dashboard/RefreshTimer.svelte';
	import { fade } from 'svelte/transition';
	
	// LayerChart imports
	import {
		Chart,
		Svg,
		Axis,
		Bars,
		Area
	} from 'layerchart';
	import { format } from 'date-fns';
	
	let theme = $derived($uiStore.theme);
	let effectiveTheme = $derived(theme === 'auto'
		? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
		: theme
	);
	let store = $derived($statsStore);
	let stats = $derived(store.dashboardStats);
	let chartData = $derived(store.chartData);
	let isLoading = $derived(store.isLoading);
	let customModels = $derived($customModelsStore);
	
	let timeRange = $state<'day' | 'week' | 'month'>('week');
	let activeTab = $state<'overview' | 'models' | 'costs' | 'trends'>('overview');
	
	async function handleRefresh() {
		await statsStore.fetchDashboardStats(timeRange);
	}
	
	interface TabItem {
		id: 'overview' | 'models' | 'costs' | 'trends';
		label: string;
		icon: typeof BarChart3;
	}
	
	onMount(() => {
		handleRefresh();
	});
	
	// Prepare chart data for LayerChart
	let costChartData = $derived(() => {
		if (!chartData?.costOverTime) return [];
		return chartData.costOverTime.map(d => ({
			date: new Date(d.date),
			value: d.value,
			label: format(new Date(d.date), 'MMM dd')
		}));
	});
	
	let tokenChartData = $derived(() => {
		if (!chartData?.tokenUsageOverTime) return [];
		return chartData.tokenUsageOverTime.map(d => ({
			date: new Date(d.date),
			value: d.value,
			label: format(new Date(d.date), 'MMM dd')
		}));
	});
	
	let modelChartData = $derived(() => {
		if (!chartData?.messagesPerModel) return [];
		return chartData.messagesPerModel.map(d => ({
			label: d.label,
			value: d.value
		}));
	});
	
	// Colors based on theme
	let cardBg = $derived(theme === 'light' ? '#ffffff' : '#1a1f2e');
	let textPrimary = $derived(theme === 'light' ? '#1f2937' : '#e2e8f0');
	let textSecondary = $derived(theme === 'light' ? '#6b7280' : '#a0aec0');
	let borderColor = $derived(theme === 'light' ? '#e5e7eb' : '#2d3748');
	let chartColors = ['#4299e1', '#48bb78', '#ed8936', '#9f7aea', '#f56565', '#38b2ac'];
	
	function formatNumber(num: number): string {
		if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
		if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
		return num.toFixed(0);
	}
	
	function formatCurrency(num: number): string {
		if (num >= 1000) return '$' + (num / 1000).toFixed(2) + 'k';
		return '$' + num.toFixed(2);
	}
</script>

<div class="dashboard-page px-8 py-6 overflow-y-auto h-full">
	<div class="max-w-7xl mx-auto">
		<!-- Header -->
		<div class="dashboard-header flex flex-wrap items-center justify-between gap-4 mb-8">
			<div>
				<h1 class="text-3xl font-bold" style:color={textPrimary}>Analytics Dashboard</h1>
				<p class="text-sm mt-1" style:color={textSecondary}>Track your AI usage and costs</p>
			</div>
			
			<div class="flex items-center gap-3">
				<select
					class="px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-[#4299e1]"
					style:background-color={cardBg}
					style:border-color={borderColor}
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
		
		<!-- Tab Navigation -->
		<div class="flex gap-2 mb-6 border-b" style:border-color={borderColor}>
			{#each [{id: 'overview', label: 'Overview', icon: BarChart3}, {id: 'models', label: 'Models', icon: Brain}, {id: 'costs', label: 'Costs', icon: DollarSign}, {id: 'trends', label: 'Trends', icon: TrendingUp}] as tab}
				{@const tabItem = tab as TabItem}
				<button
					class="px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors -mb-px"
					style:border-color={activeTab === tabItem.id ? '#4299e1' : 'transparent'}
					style:color={activeTab === tabItem.id ? '#4299e1' : textSecondary}
					onclick={() => activeTab = tabItem.id}
				>
					<tabItem.icon size={16} />
					{tabItem.label}
				</button>
			{/each}
		</div>
		
		{#if isLoading}
			<div class="flex items-center justify-center h-64" style:color={textSecondary}>
				<div class="text-center">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4299e1] mx-auto mb-4"></div>
					<p>Loading analytics...</p>
				</div>
			</div>
		{:else if stats}
			{#if activeTab === 'overview'}
				<!-- Overview Tab -->
				<div class="space-y-6" transition:fade={{ duration: 200 }}>
					<!-- Stats Cards -->
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
						<div class="stat-card p-5 rounded-xl border" style:background-color={cardBg} style:border-color={borderColor}>
							<div class="flex items-center gap-3 mb-3">
								<div class="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
									<DollarSign size={20} class="text-green-500" />
								</div>
								<span class="text-xs uppercase tracking-wide" style:color={textSecondary}>Total Cost</span>
							</div>
							<div class="text-3xl font-bold mb-1" style:color={textPrimary}>
								{formatCurrency(stats.totalCost)}
							</div>
							<div class="flex items-center gap-1 text-sm">
								{#if stats.costChange >= 0}
									<TrendingUp size={14} class="text-green-500" />
									<span class="text-green-500">+{stats.costChange}%</span>
								{:else}
									<TrendingDown size={14} class="text-red-500" />
									<span class="text-red-500">{stats.costChange}%</span>
								{/if}
								<span style:color={textSecondary}>vs last period</span>
							</div>
						</div>
						
						<div class="stat-card p-5 rounded-xl border" style:background-color={cardBg} style:border-color={borderColor}>
							<div class="flex items-center gap-3 mb-3">
								<div class="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
									<BarChart3 size={20} class="text-blue-500" />
								</div>
								<span class="text-xs uppercase tracking-wide" style:color={textSecondary}>Total Tokens</span>
							</div>
							<div class="text-3xl font-bold mb-1" style:color={textPrimary}>
								{formatNumber(stats.totalTokens)}
							</div>
							<div class="flex items-center gap-1 text-sm">
								{#if stats.tokensChange >= 0}
									<TrendingUp size={14} class="text-green-500" />
									<span class="text-green-500">+{stats.tokensChange}%</span>
								{:else}
									<TrendingDown size={14} class="text-red-500" />
									<span class="text-red-500">{stats.tokensChange}%</span>
								{/if}
								<span style:color={textSecondary}>vs last period</span>
							</div>
						</div>
						
						<div class="stat-card p-5 rounded-xl border" style:background-color={cardBg} style:border-color={borderColor}>
							<div class="flex items-center gap-3 mb-3">
								<div class="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
									<MessageSquare size={20} class="text-orange-500" />
								</div>
								<span class="text-xs uppercase tracking-wide" style:color={textSecondary}>Messages</span>
							</div>
							<div class="text-3xl font-bold mb-1" style:color={textPrimary}>
								{formatNumber(stats.totalMessages)}
							</div>
							<div class="flex items-center gap-1 text-sm">
								{#if stats.messagesChange >= 0}
									<TrendingUp size={14} class="text-green-500" />
									<span class="text-green-500">+{stats.messagesChange}%</span>
								{:else}
									<TrendingDown size={14} class="text-red-500" />
									<span class="text-red-500">{stats.messagesChange}%</span>
								{/if}
								<span style:color={textSecondary}>vs last period</span>
							</div>
						</div>
						
						<div class="stat-card p-5 rounded-xl border" style:background-color={cardBg} style:border-color={borderColor}>
							<div class="flex items-center gap-3 mb-3">
								<div class="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
									<Zap size={20} class="text-purple-500" />
								</div>
								<span class="text-xs uppercase tracking-wide" style:color={textSecondary}>Avg Latency</span>
							</div>
							<div class="text-3xl font-bold mb-1" style:color={textPrimary}>
								{Math.round(stats.avgLatency)}ms
							</div>
							<div class="flex items-center gap-1 text-sm">
								{#if stats.latencyChange <= 0}
									<TrendingDown size={14} class="text-green-500" />
									<span class="text-green-500">{stats.latencyChange}%</span>
								{:else}
									<TrendingUp size={14} class="text-red-500" />
									<span class="text-red-500">+{stats.latencyChange}%</span>
								{/if}
								<span style:color={textSecondary}>vs last period</span>
							</div>
						</div>
					</div>
					
					<!-- Charts Grid -->
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<!-- Cost Over Time -->
						<div class="chart-card p-5 rounded-xl border" style:background-color={cardBg} style:border-color={borderColor}>
							<h3 class="text-base font-semibold mb-4" style:color={textPrimary}>Cost Over Time</h3>
							{#if costChartData().length > 0}
								<div class="h-64">
									<Chart
										data={costChartData()}
										x="date"
										y="value"
										padding={{ left: 16, right: 16, bottom: 24 }}
									>
										<Svg>
											<Axis placement="bottom" format={d => format(d, 'MMM dd')} tickLabelProps={{ fill: textSecondary, fontSize: 10 }} />
											<Axis placement="left" format={d => '$' + d.toFixed(2)} tickLabelProps={{ fill: textSecondary, fontSize: 10 }} />
											<Area 
												fill="url(#cost-gradient)" 
												line={{ stroke: '#4299e1', strokeWidth: 2 }}
											/>
											<defs>
												<linearGradient id="cost-gradient" x1="0" y1="0" x2="0" y2="1">
													<stop offset="0%" stop-color="#4299e1" stop-opacity="0.4" />
													<stop offset="100%" stop-color="#4299e1" stop-opacity="0.05" />
												</linearGradient>
											</defs>
										</Svg>
									</Chart>
								</div>
							{:else}
								<div class="h-64 flex items-center justify-center" style:color={textSecondary}>
									<p>No cost data available</p>
								</div>
							{/if}
						</div>
						
						<!-- Token Usage Over Time -->
						<div class="chart-card p-5 rounded-xl border" style:background-color={cardBg} style:border-color={borderColor}>
							<h3 class="text-base font-semibold mb-4" style:color={textPrimary}>Token Usage Trend</h3>
							{#if tokenChartData().length > 0}
								<div class="h-64">
									<Chart
										data={tokenChartData()}
										x="date"
										y="value"
										padding={{ left: 16, right: 16, bottom: 24 }}
									>
										<Svg>
										<Axis placement="bottom" format={d => format(d, 'MMM dd')} tickLabelProps={{ fill: textSecondary, fontSize: 10 }} />
										<Axis placement="left" format={d => formatNumber(d)} tickLabelProps={{ fill: textSecondary, fontSize: 10 }} />
										<Area fill="url(#token-gradient)" line={{ stroke: '#48bb78', strokeWidth: 2 }} />
											<defs>
												<linearGradient id="token-gradient" x1="0" y1="0" x2="0" y2="1">
													<stop offset="0%" stop-color="#48bb78" stop-opacity="0.3" />
													<stop offset="100%" stop-color="#48bb78" stop-opacity="0.05" />
												</linearGradient>
											</defs>
										</Svg>
									</Chart>
								</div>
							{:else}
								<div class="h-64 flex items-center justify-center" style:color={textSecondary}>
									<p>No token data available</p>
								</div>
							{/if}
						</div>
						
						<!-- Messages Per Model -->
						<div class="chart-card p-5 rounded-xl border lg:col-span-2" style:background-color={cardBg} style:border-color={borderColor}>
							<h3 class="text-base font-semibold mb-4" style:color={textPrimary}>Messages Per Model</h3>
							{#if modelChartData().length > 0}
								<div class="h-64">
									<Chart
										data={modelChartData()}
										x="label"
										y="value"
										padding={{ left: 16, right: 16, bottom: 40 }}
									>
										<Svg>
											<Axis placement="bottom" tickLabelProps={{ fill: textSecondary, fontSize: 10, angle: 45 }} />
											<Axis placement="left" tickLabelProps={{ fill: textSecondary, fontSize: 10 }} />
										<Bars 
											radius={4} 
											fill="#4299e1"
										/>
										</Svg>
									</Chart>
								</div>
							{:else}
								<div class="h-64 flex items-center justify-center" style:color={textSecondary}>
									<p>No model usage data available</p>
								</div>
							{/if}
						</div>
					</div>
				</div>
			{:else if activeTab === 'models'}
				<!-- Models Tab -->
				<div class="space-y-6" transition:fade={{ duration: 200 }}>
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<!-- Custom Models Summary -->
						<div class="chart-card p-5 rounded-xl border" style:background-color={cardBg} style:border-color={borderColor}>
							<h3 class="text-base font-semibold mb-4" style:color={textPrimary}>Custom Models</h3>
							<div class="space-y-3">
								<div class="flex justify-between items-center p-3 rounded-lg" style:background-color={theme === 'light' ? '#f3f4f6' : '#0f1419'}>
									<span style:color={textSecondary}>Total Custom Models</span>
									<span class="font-semibold" style:color={textPrimary}>{customModels.models.length}</span>
								</div>
								<div class="flex justify-between items-center p-3 rounded-lg" style:background-color={theme === 'light' ? '#f3f4f6' : '#0f1419'}>
									<span style:color={textSecondary}>Recommended</span>
									<span class="font-semibold" style:color={textPrimary}>
										{customModels.models.filter(m => m.isRecommended).length}
									</span>
								</div>
								<div class="flex justify-between items-center p-3 rounded-lg" style:background-color={theme === 'light' ? '#f3f4f6' : '#0f1419'}>
									<span style:color={textSecondary}>Auto-Selectable</span>
									<span class="font-semibold" style:color={textPrimary}>
										{customModels.models.filter(m => m.isAutoSelectable !== false).length}
									</span>
								</div>
							</div>
						</div>
						
						<!-- Model Performance -->
						<div class="chart-card p-5 rounded-xl border" style:background-color={cardBg} style:border-color={borderColor}>
							<h3 class="text-base font-semibold mb-4" style:color={textPrimary}>Latency Distribution</h3>
							{#if chartData?.latencyDistribution && chartData.latencyDistribution.length > 0}
								<div class="space-y-2">
									{#each chartData.latencyDistribution.slice(0, 5) as item}
										<div class="flex items-center gap-3">
											<span class="text-sm w-24 truncate" style:color={textSecondary}>{item.model}</span>
											<div class="flex-1 h-6 rounded-full overflow-hidden" style:background-color={theme === 'light' ? '#e5e7eb' : '#2d3748'}>
												<div 
													class="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
													style:width={`${Math.min((item.median / 5000) * 100, 100)}%`}
												></div>
											</div>
											<span class="text-sm w-16 text-right" style:color={textPrimary}>{Math.round(item.median)}ms</span>
										</div>
									{/each}
								</div>
							{:else}
								<div class="h-32 flex items-center justify-center" style:color={textSecondary}>
									<p>No latency data available</p>
								</div>
							{/if}
						</div>
					</div>
				</div>
			{:else if activeTab === 'costs'}
				<!-- Costs Tab -->
				<div class="space-y-6" transition:fade={{ duration: 200 }}>
					<div class="chart-card p-5 rounded-xl border" style:background-color={cardBg} style:border-color={borderColor}>
						<h3 class="text-base font-semibold mb-4" style:color={textPrimary}>Cost Analysis</h3>
						<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
							<div class="p-4 rounded-lg border" style:border-color={borderColor}>
								<div class="text-sm" style:color={textSecondary}>Average per Message</div>
								<div class="text-2xl font-bold" style:color={textPrimary}>
									${stats.totalMessages > 0 ? (stats.totalCost / stats.totalMessages).toFixed(4) : '0.0000'}
								</div>
							</div>
							<div class="p-4 rounded-lg border" style:border-color={borderColor}>
								<div class="text-sm" style:color={textSecondary}>Cost per 1K Tokens</div>
								<div class="text-2xl font-bold" style:color={textPrimary}>
									${stats.totalTokens > 0 ? ((stats.totalCost / stats.totalTokens) * 1000).toFixed(4) : '0.0000'}
								</div>
							</div>
							<div class="p-4 rounded-lg border" style:border-color={borderColor}>
								<div class="text-sm" style:color={textSecondary}>Projected Monthly</div>
								<div class="text-2xl font-bold" style:color={textPrimary}>
									${(stats.totalCost * 4).toFixed(2)}
								</div>
							</div>
						</div>
					</div>
				</div>
			{:else if activeTab === 'trends'}
				<!-- Trends Tab -->
				<div class="space-y-6" transition:fade={{ duration: 200 }}>
					<div class="chart-card p-5 rounded-xl border" style:background-color={cardBg} style:border-color={borderColor}>
						<h3 class="text-base font-semibold mb-4" style:color={textPrimary}>Usage Trends</h3>
						<p style:color={textSecondary}>Coming soon: Detailed trend analysis with predictive insights</p>
					</div>
				</div>
			{/if}
		{:else}
			<div class="flex items-center justify-center h-64" style:color={textSecondary}>
				<div class="text-center">
					<p class="mb-2">No data available</p>
					<p class="text-sm">Start chatting to see your analytics</p>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.stat-card {
		transition: transform 0.2s, box-shadow 0.2s;
	}
	
	.stat-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}
	
	.chart-card {
		transition: box-shadow 0.2s;
	}
	
	.chart-card:hover {
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
	}
</style>
