<script lang="ts">
	import { statsStore } from '$lib/stores/statsStore';
	import { X } from 'lucide-svelte';
	import { formatCost, formatTokens } from '$lib/utils/helpers';
	
	let statsPanelOpen = $derived($statsStore.statsPanelOpen);
	let targetMessageId = $derived($statsStore.targetMessageId);
	let messageStats = $derived(
		targetMessageId ? $statsStore.messageStats[targetMessageId] : null
	);
</script>

{#if statsPanelOpen && messageStats}
	<div class="message-stats-panel p-5 h-full overflow-y-auto">
		<div class="stats-header flex items-center justify-between mb-6">
			<h3 class="text-base font-semibold text-base-lightest">Message Statistics</h3>
			<button 
				class="p-1.5 rounded hover:bg-base-dark transition-colors"
				onclick={() => statsStore.closeStatsPanel()}
			>
				<X size={18} class="text-base-light" />
			</button>
		</div>
		
		{#if Array.isArray(messageStats)}
			<div class="space-y-4">
				{#each messageStats as stats}
					<div class="stat-card p-4 bg-base-darkest rounded-lg border border-base-dark">
						<div class="flex items-center gap-2 mb-3 pb-3 border-b border-base-dark">
							<div class="w-6 h-6 rounded bg-primary-500 flex items-center justify-center text-xs text-white font-medium">
								{stats.model[0].toUpperCase()}
							</div>
							<span class="text-sm font-semibold text-base-lightest">{stats.model}</span>
						</div>
						
						<div class="space-y-3">
							<div class="stat-item">
								<span class="stat-label block text-[11px] uppercase tracking-wide text-base-light mb-1">Tokens Input</span>
								<span class="stat-value text-base font-semibold text-base-lightest">{formatTokens(stats.tokensInput)}</span>
							</div>
							
							<div class="stat-item">
								<span class="stat-label block text-[11px] uppercase tracking-wide text-base-light mb-1">Tokens Output</span>
								<span class="stat-value text-base font-semibold text-base-lightest">{formatTokens(stats.tokensOutput)}</span>
							</div>
							
							<div class="stat-item">
								<span class="stat-label block text-[11px] uppercase tracking-wide text-base-light mb-1">Cost</span>
								<span class="stat-value text-base font-semibold text-success">{formatCost(stats.cost)}</span>
							</div>
							
							<div class="stat-item">
								<span class="stat-label block text-[11px] uppercase tracking-wide text-base-light mb-1">Latency</span>
								<span class="stat-value text-base font-semibold text-primary-500">{stats.latency}ms</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="space-y-3">
				<div class="stat-item">
					<span class="stat-label block text-[11px] uppercase tracking-wide text-base-light mb-1">Tokens Input</span>
					<span class="stat-value text-base font-semibold text-base-lightest">{formatTokens(messageStats.tokensInput)}</span>
				</div>
				
				<div class="stat-item">
					<span class="stat-label block text-[11px] uppercase tracking-wide text-base-light mb-1">Tokens Output</span>
					<span class="stat-value text-base font-semibold text-base-lightest">{formatTokens(messageStats.tokensOutput)}</span>
				</div>
				
				<div class="stat-item">
					<span class="stat-label block text-[11px] uppercase tracking-wide text-base-light mb-1">Cost</span>
					<span class="stat-value text-base font-semibold text-success">{formatCost(messageStats.cost)}</span>
				</div>
				
				<div class="stat-item">
					<span class="stat-label block text-[11px] uppercase tracking-wide text-base-light mb-1">Latency</span>
					<span class="stat-value text-base font-semibold text-primary-500">{messageStats.latency}ms</span>
				</div>
				
				<div class="stat-item">
					<span class="stat-label block text-[11px] uppercase tracking-wide text-base-light mb-1">Model</span>
					<span class="stat-value text-sm font-semibold text-base-lightest">{messageStats.model}</span>
				</div>
			</div>
		{/if}
	</div>
{:else}
	<div class="flex items-center justify-center h-full text-base-light text-sm">
		Select a message to view statistics
	</div>
{/if}
