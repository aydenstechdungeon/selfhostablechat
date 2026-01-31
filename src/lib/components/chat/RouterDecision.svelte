<script lang="ts">
	import { Sparkles, Info } from 'lucide-svelte';
	
	let {
		model,
		reasoning,
		theme = 'dark'
	}: {
		model: string;
		reasoning: string;
		theme?: 'light' | 'dark';
	} = $props();
	
	let textPrimary = $derived(theme === 'light' ? '#1f2937' : '#e2e8f0');
	let textSecondary = $derived(theme === 'light' ? '#6b7280' : '#a0aec0');
	let bgSecondary = $derived(theme === 'light' ? '#f3f4f6' : '#1a1f2e');
	let border = $derived(theme === 'light' ? '#e5e7eb' : '#2d3748');
	
	// Extract model display name
	let modelName = $derived(() => {
		const parts = model.split('/');
		return parts[parts.length - 1];
	});
</script>

<div 
	class="router-decision flex items-start gap-3 px-4 py-3 rounded-lg border animate-fadeIn my-3"
	style:background-color={bgSecondary}
	style:border-color={border}
>
	<div class="flex-shrink-0 mt-0.5">
		<Sparkles class="w-4 h-4" color="#4299e1" />
	</div>
	<div class="flex-1 min-w-0">
		<div class="flex items-center gap-2 mb-1">
			<span class="text-xs font-semibold uppercase tracking-wide" style:color="#4299e1">
				Auto-Routing
			</span>
		</div>
		<p class="text-sm mb-2" style:color={textPrimary}>
			Selected: <span class="font-semibold">{modelName()}</span>
		</p>
		<div class="flex items-start gap-2 text-xs" style:color={textSecondary}>
			<Info class="w-3 h-3 flex-shrink-0 mt-0.5" />
			<span>{reasoning}</span>
		</div>
	</div>
</div>
