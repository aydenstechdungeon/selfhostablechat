<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { RefreshCw } from 'lucide-svelte';
	
	let { 
		onRefresh,
		interval = 30000,
		theme = 'dark'
	}: {
		onRefresh: () => void | Promise<void>;
		interval?: number;
		theme?: 'light' | 'dark';
	} = $props();
	
	let secondsLeft = $state(30);
	let isRefreshing = $state(false);
	let isPaused = $state(false);
	
	// Initialize and update secondsLeft when interval changes
	$effect(() => {
		secondsLeft = interval / 1000;
	});
	let intervalId: number | undefined;
	let countdownId: number | undefined;
	
	let textSecondary = $derived(theme === 'light' ? '#6b7280' : '#a0aec0');
	let textPrimary = $derived(theme === 'light' ? '#1f2937' : '#e2e8f0');
	
	function startCountdown() {
		secondsLeft = interval / 1000;
		countdownId = setInterval(() => {
			if (!isPaused) {
				secondsLeft--;
				if (secondsLeft <= 0) {
					handleRefresh();
				}
			}
		}, 1000) as unknown as number;
	}
	
	async function handleRefresh() {
		if (isRefreshing) return;
		
		isRefreshing = true;
		try {
			await onRefresh();
		} catch (error) {
			console.error('Refresh error:', error);
		} finally {
			isRefreshing = false;
			secondsLeft = interval / 1000;
		}
	}
	
	function togglePause() {
		isPaused = !isPaused;
	}
	
	onMount(() => {
		startCountdown();
	});
	
	onDestroy(() => {
		if (countdownId) clearInterval(countdownId);
		if (intervalId) clearInterval(intervalId);
	});
</script>

<div class="refresh-timer flex items-center gap-3 px-4 py-2 rounded-lg border" style:border-color={theme === 'light' ? '#e5e7eb' : '#2d3748'}>
	<button
		onclick={handleRefresh}
		disabled={isRefreshing}
		class="p-1 hover:bg-opacity-10 hover:bg-white rounded transition-all disabled:opacity-50"
		title="Refresh now"
	>
		<RefreshCw 
			class="w-4 h-4 {isRefreshing ? 'animate-spin' : ''}" 
			color="#4299e1" 
		/>
	</button>
	
	<div class="flex items-center gap-2 text-sm">
		<span style:color={textSecondary}>Next update in</span>
		<span class="font-mono font-semibold" style:color={textPrimary}>
			{secondsLeft}s
		</span>
	</div>
	
	<button
		onclick={togglePause}
		class="px-2 py-1 text-xs rounded hover:bg-opacity-10 hover:bg-white transition-all"
		style:color={textSecondary}
	>
		{isPaused ? 'Resume' : 'Pause'}
	</button>
</div>
