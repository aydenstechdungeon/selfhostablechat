<script lang="ts">
	import { statsStore } from '$lib/stores/statsStore';
	import { uiStore } from '$lib/stores/uiStore';
	import { X } from 'lucide-svelte';
	import { formatCost, formatTokens } from '$lib/utils/helpers';
	
	let statsPanelOpen = $derived($statsStore.statsPanelOpen);
	let targetMessageId = $derived($statsStore.targetMessageId);
	let messageStats = $derived(
		targetMessageId ? $statsStore.messageStats[targetMessageId] : null
	);
	let theme = $derived($uiStore.theme);
	
	let bgColor = $derived(theme === 'light' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.7)');
	let modalBg = $derived(theme === 'light' ? '#ffffff' : '#1a1f2e');
	let textColor = $derived(theme === 'light' ? '#1f2937' : '#e2e8f0');
	let textSecondary = $derived(theme === 'light' ? '#6b7280' : '#a0aec0');
	let borderColor = $derived(theme === 'light' ? '#e5e7eb' : '#2d3748');
	let cardBg = $derived(theme === 'light' ? '#f3f4f6' : '#0f1419');
	
	function closeModal() {
		statsStore.closeStatsPanel();
	}
	
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			closeModal();
		}
	}
	
	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			closeModal();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if statsPanelOpen && messageStats}
	<div 
		class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
		style:background-color={bgColor}
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		aria-label="Message statistics"
		tabindex="-1"
	>
		<div 
			class="w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
			style:background-color={modalBg}
			style:border="1px solid {borderColor}"
		>
			<!-- Header -->
			<div class="flex items-center justify-between p-4 border-b" style:border-color={borderColor}>
				<h3 class="text-lg font-semibold" style:color={textColor}>Message Statistics</h3>
				<button 
					class="p-1.5 rounded-lg transition-colors hover:opacity-70"
					style:color={textSecondary}
					onclick={closeModal}
					aria-label="Close"
				>
					<X size={20} />
				</button>
			</div>
			
			<!-- Content -->
			<div class="p-4 max-h-[70vh] overflow-y-auto">
				{#if Array.isArray(messageStats)}
					<div class="space-y-3">
						{#each messageStats as stats}
							<div class="p-4 rounded-lg border" style:background-color={cardBg} style:border-color={borderColor}>
								<div class="flex items-center gap-2 mb-3 pb-3 border-b" style:border-color={borderColor}>
									<div class="w-8 h-8 rounded-lg bg-[#4299e1] flex items-center justify-center text-xs text-white font-medium">
										{stats.model[0].toUpperCase()}
									</div>
									<span class="text-sm font-semibold" style:color={textColor}>{stats.model}</span>
								</div>
								
								<div class="grid grid-cols-2 gap-3">
									<div>
										<span class="text-xs uppercase tracking-wide block mb-1" style:color={textSecondary}>Input Tokens</span>
										<p class="text-base font-semibold" style:color={textColor}>{formatTokens(stats.tokensInput)}</p>
									</div>
									
									<div>
										<span class="text-xs uppercase tracking-wide block mb-1" style:color={textSecondary}>Output Tokens</span>
										<p class="text-base font-semibold" style:color={textColor}>{formatTokens(stats.tokensOutput)}</p>
									</div>
									
									<div>
										<span class="text-xs uppercase tracking-wide block mb-1" style:color={textSecondary}>Cost</span>
										<p class="text-base font-semibold text-[#48bb78]">{formatCost(stats.cost)}</p>
									</div>
									
									<div>
										<span class="text-xs uppercase tracking-wide block mb-1" style:color={textSecondary}>Latency</span>
										<p class="text-base font-semibold text-[#4299e1]">{stats.latency}ms</p>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="space-y-4">
						{#if messageStats.model}
							<div class="flex items-center gap-3 pb-3 border-b" style:border-color={borderColor}>
								<div class="w-10 h-10 rounded-lg bg-[#4299e1] flex items-center justify-center text-sm text-white font-semibold">
									{messageStats.model[0].toUpperCase()}
								</div>
								<div>
									<p class="text-xs uppercase tracking-wide" style:color={textSecondary}>Model</p>
									<p class="text-sm font-semibold" style:color={textColor}>{messageStats.model}</p>
								</div>
							</div>
						{/if}
						
						<div class="grid grid-cols-2 gap-4">
							<div class="p-3 rounded-lg" style:background-color={cardBg}>
								<span class="text-xs uppercase tracking-wide block mb-1" style:color={textSecondary}>Input Tokens</span>
								<p class="text-lg font-semibold" style:color={textColor}>{formatTokens(messageStats.tokensInput)}</p>
							</div>
							
							<div class="p-3 rounded-lg" style:background-color={cardBg}>
								<span class="text-xs uppercase tracking-wide block mb-1" style:color={textSecondary}>Output Tokens</span>
								<p class="text-lg font-semibold" style:color={textColor}>{formatTokens(messageStats.tokensOutput)}</p>
							</div>
							
							<div class="p-3 rounded-lg" style:background-color={cardBg}>
								<span class="text-xs uppercase tracking-wide block mb-1" style:color={textSecondary}>Cost</span>
								<p class="text-lg font-semibold text-[#48bb78]">{formatCost(messageStats.cost)}</p>
							</div>
							
							<div class="p-3 rounded-lg" style:background-color={cardBg}>
								<span class="text-xs uppercase tracking-wide block mb-1" style:color={textSecondary}>Latency</span>
								<p class="text-lg font-semibold text-[#4299e1]">{messageStats.latency}ms</p>
							</div>
						</div>
					</div>
				{/if}
			</div>
			
			<!-- Footer -->
			<div class="p-4 border-t" style:border-color={borderColor}>
				<p class="text-xs text-center" style:color={textSecondary}>Press ESC to close</p>
			</div>
		</div>
	</div>
{/if}
