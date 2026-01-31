<script lang="ts">
	import type { TimeSeriesData, BarChartData } from '$lib/types';
	
	let {
		title,
		data,
		type = 'line',
		height = 300,
		theme = 'dark'
	}: {
		title: string;
		data: TimeSeriesData[] | BarChartData[];
		type?: 'line' | 'bar' | 'pie';
		height?: number;
		theme?: 'light' | 'dark';
	} = $props();
	
	let textPrimary = $derived(theme === 'light' ? '#1f2937' : '#e2e8f0');
	let textSecondary = $derived(theme === 'light' ? '#6b7280' : '#a0aec0');
	let bgSecondary = $derived(theme === 'light' ? '#f3f4f6' : '#1a1f2e');
	let border = $derived(theme === 'light' ? '#e5e7eb' : '#2d3748');
	
	let hasData = $derived(data && data.length > 0);
	
	// Simple bar chart visualization (placeholder for real chart library)
	function getBarHeight(value: number, max: number): number {
		return (value / max) * 100;
	}
	
	let maxValue = $derived(() => {
		if (!hasData) return 0;
		if (type === 'bar') {
			return Math.max(...(data as BarChartData[]).map(d => d.value));
		}
		return Math.max(...(data as TimeSeriesData[]).map(d => d.value));
	});
</script>

<div class="chart-container rounded-lg border p-6" style:border-color={border} style:background-color={bgSecondary}>
	<h3 class="text-lg font-semibold mb-4" style:color={textPrimary}>
		{title}
	</h3>
	
	{#if hasData}
		<div class="chart-content" style:height="{height}px">
			{#if type === 'bar'}
				<div class="flex items-end gap-2 h-full">
					{#each data as item}
						{@const barData = item as BarChartData}
						<div class="flex-1 flex flex-col items-center gap-2">
							<div class="w-full flex items-end justify-center" style:height="calc(100% - 30px)">
								<div 
									class="w-full rounded-t transition-all hover:opacity-80"
									style:background-color="#4299e1"
									style:height="{getBarHeight(barData.value, maxValue())}%"
									title="{barData.label}: {barData.value}"
								></div>
							</div>
							<span class="text-xs truncate w-full text-center" style:color={textSecondary}>
								{barData.label}
							</span>
						</div>
					{/each}
				</div>
			{:else if type === 'line'}
				<div class="flex items-center justify-center h-full" style:color={textSecondary}>
					<div class="text-center">
						<p class="mb-2">Line chart data available</p>
						<p class="text-xs">Install chart library (Chart.js/Recharts) for visualization</p>
						<p class="text-xs mt-1">{data.length} data points ready</p>
					</div>
				</div>
			{:else}
				<div class="flex items-center justify-center h-full" style:color={textSecondary}>
					<div class="text-center">
						<p class="mb-2">Chart data available</p>
						<p class="text-xs">{data.length} items</p>
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<div class="flex items-center justify-center" style:height="{height}px" style:color={textSecondary}>
			<div class="text-center">
				<p>No data available</p>
				<p class="text-xs mt-1">Start chatting to see statistics</p>
			</div>
		</div>
	{/if}
</div>

<style>
	.chart-content {
		width: 100%;
		position: relative;
	}
</style>
