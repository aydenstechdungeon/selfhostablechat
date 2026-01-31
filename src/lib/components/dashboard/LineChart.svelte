<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, LineController, LineElement, PointElement, LinearScale, TimeScale, Title, Tooltip, Legend, CategoryScale } from 'chart.js';
	import type { TimeSeriesData } from '$lib/types';
	
	let {
		title,
		data,
		height = 300,
		theme = 'dark'
	}: {
		title: string;
		data: TimeSeriesData[];
		height?: number;
		theme?: 'light' | 'dark';
	} = $props();
	
	let canvas: HTMLCanvasElement | undefined = $state();
	let chart: Chart | null = null;
	
	let textPrimary = $derived(theme === 'light' ? '#1f2937' : '#e2e8f0');
	let textSecondary = $derived(theme === 'light' ? '#6b7280' : '#a0aec0');
	let bgSecondary = $derived(theme === 'light' ? '#f3f4f6' : '#1a1f2e');
	let border = $derived(theme === 'light' ? '#e5e7eb' : '#2d3748');
	let gridColor = $derived(theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)');
	
	onMount(() => {
		// Register Chart.js components
		Chart.register(LineController, LineElement, PointElement, LinearScale, TimeScale, Title, Tooltip, Legend, CategoryScale);
		
		// Create chart
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		
		chart = new Chart(ctx, {
			type: 'line',
			data: {
				labels: data.map(d => {
					const date = new Date(d.date);
					return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
				}),
				datasets: [{
					label: title,
					data: data.map(d => d.value),
					borderColor: '#4299e1',
					backgroundColor: 'rgba(66, 153, 225, 0.1)',
					borderWidth: 2,
					tension: 0.4,
					fill: true,
					pointRadius: 3,
					pointHoverRadius: 5
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: false
					},
					tooltip: {
						mode: 'index',
						intersect: false,
						backgroundColor: bgSecondary,
						titleColor: textPrimary,
						bodyColor: textSecondary,
						borderColor: border,
						borderWidth: 1
					}
				},
				scales: {
					x: {
						grid: {
							color: gridColor
						},
						ticks: {
							color: textSecondary
						}
					},
					y: {
						grid: {
							color: gridColor
						},
						ticks: {
							color: textSecondary
						},
						beginAtZero: true
					}
				}
			}
		});
		
		return () => {
			if (chart) {
				chart.destroy();
			}
		};
	});
</script>

<div class="line-chart-container rounded-lg border p-6" style:border-color={border} style:background-color={bgSecondary}>
	<h3 class="text-lg font-semibold mb-4" style:color={textPrimary}>
		{title}
	</h3>
	
	{#if data && data.length > 0}
		<div style:height="{height}px">
			<canvas bind:this={canvas}></canvas>
		</div>
	{:else}
		<div class="flex items-center justify-center" style:height="{height}px" style:color={textSecondary}>
			<div class="text-center">
				<p>No data available</p>
				<p class="text-xs mt-1">Start chatting to see trends</p>
			</div>
		</div>
	{/if}
</div>
