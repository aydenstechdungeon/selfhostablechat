<script lang="ts">
	import { ChevronDown } from 'lucide-svelte';
	import { uiStore } from '$lib/stores/uiStore';
	
	let filtersExpanded = $state(false);
	let selectedModels = $state<string[]>([]);
	let sortBy = $state<'recent' | 'expensive' | 'tokens'>('recent');
	let theme = $derived($uiStore.theme);
	
	let textPrimary = $derived(theme === 'light' ? '#1f2937' : '#e2e8f0');
	let textSecondary = $derived(theme === 'light' ? '#6b7280' : '#a0aec0');
	let contentBg = $derived(theme === 'light' ? '#f8f9fa' : '#0f1419');
	let selectBg = $derived(theme === 'light' ? '#ffffff' : '#1a1f2e');
	let border = $derived(theme === 'light' ? '#e5e7eb' : '#2d3748');
	let hoverBg = $derived(theme === 'light' ? 'rgba(243, 244, 246, 0.3)' : 'rgba(45, 55, 72, 0.3)');
</script>

<div class="chat-filters border-b" style:border-color={border}>
	<button 
		class="filters-toggle w-full px-4 py-3 text-left bg-transparent text-xs font-semibold flex items-center justify-between transition-colors"
		style:color={textSecondary}
		onmouseenter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
		onmouseleave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
		onclick={() => filtersExpanded = !filtersExpanded}
	>
		<span>FILTERS</span>
		<ChevronDown 
			size={16} 
			class="transition-transform duration-200 {filtersExpanded ? 'rotate-180' : ''}"
		/>
	</button>
	
	{#if filtersExpanded}
		<div class="filters-content px-4 py-4" style:background-color={contentBg}>
			<div class="filter-group mb-4">
				<label for="sortBy" class="block mb-2 text-xs uppercase tracking-wide" style:color={textSecondary}>Sort By</label>
				<select
					id="sortBy"
					bind:value={sortBy}
					class="w-full px-3 py-2 rounded-lg border text-sm focus:border-[#4299e1] focus:outline-none"
					style:background-color={selectBg}
					style:border-color={border}
					style:color={textPrimary}
				>
					<option value="recent">Most Recent</option>
					<option value="expensive">Most Expensive</option>
					<option value="tokens">Most Tokens</option>
				</select>
			</div>
			
			<div class="filter-group">
				<label for="models" class="block mb-2 text-xs uppercase tracking-wide" style:color={textSecondary}>Models</label>
				<div class="text-xs" style:color={textSecondary}>Filter options coming soon</div>
			</div>
		</div>
	{/if}
</div>