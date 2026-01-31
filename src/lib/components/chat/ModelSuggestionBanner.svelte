<script lang="ts">
	import { AlertTriangle, X } from 'lucide-svelte';
	
	let {
		suggestedModels,
		onSwitch,
		onDismiss,
		theme = 'dark'
	}: {
		suggestedModels: string[];
		onSwitch: (model: string) => void;
		onDismiss: () => void;
		theme?: 'light' | 'dark';
	} = $props();
	
	let textPrimary = $derived(theme === 'light' ? '#1f2937' : '#e2e8f0');
	let textSecondary = $derived(theme === 'light' ? '#6b7280' : '#a0aec0');
	
	function getModelDisplayName(modelId: string): string {
		const parts = modelId.split('/');
		return parts[parts.length - 1];
	}
</script>

<div 
	class="model-suggestion-banner flex items-start gap-3 px-4 py-3 rounded-lg border border-warning/30 animate-slideDown"
	style:background-color="rgba(251, 191, 36, 0.1)"
>
	<div class="flex-shrink-0 mt-0.5">
		<AlertTriangle class="w-5 h-5 text-warning" />
	</div>
	<div class="flex-1 min-w-0">
		<h4 class="text-sm font-semibold mb-1" style:color={textPrimary}>
			Image/Video Detected
		</h4>
		<p class="text-sm mb-3" style:color={textSecondary}>
			The selected model may not support images. Try one of these instead:
		</p>
		<div class="flex flex-wrap gap-2">
			{#each suggestedModels as model}
				<button
					onclick={() => onSwitch(model)}
					class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
					style:background-color="#4299e1"
					style:color="#ffffff"
				>
					Switch to {getModelDisplayName(model)}
				</button>
			{/each}
		</div>
	</div>
	<button
		onclick={onDismiss}
		class="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-all"
		title="Dismiss"
	>
		<X class="w-4 h-4" color={textSecondary} />
	</button>
</div>
