<script lang="ts">
	import { ChevronDown, X, SlidersHorizontal, Check, Search, FileText } from 'lucide-svelte';
	import { uiStore } from '$lib/stores/uiStore';
	import { filterStore, type SortOption, type DateRange, type SearchMode } from '$lib/stores/filterStore';
	import { AVAILABLE_MODELS } from '$lib/stores/modelStore';
	import { 
		SiOpenai, 
		SiAnthropic, 
		SiGoogle, 
		SiMeta,
		SiMistralai,
		SiClaude,
		SiGooglegemini
	} from '@icons-pack/svelte-simple-icons';
	import { 
		DeepSeekLogo, 
		PerplexityAILogo, 
		XAIGrokLogo,
		KimiLogo,
		QwenLogo,
		GrokLogo
	} from '@selemondev/svgl-svelte';
	
	let filtersExpanded = $state(false);
	let theme = $derived($uiStore.theme);
	let filters = $derived($filterStore);
	
	// Brand icon mapping
	const brandIcons: Record<string, any> = {
		'OpenAI': SiOpenai,
		'Anthropic': SiAnthropic,
		'Google': SiGoogle,
		'Meta': SiMeta,
		'Mistral': SiMistralai,
		'xAI': XAIGrokLogo,
		'DeepSeek': DeepSeekLogo,
		'Perplexity': PerplexityAILogo,
		'Moonshot': KimiLogo,
		'Qwen': QwenLogo,
	};
	
	// Model-specific icon mapping (for actual model logos)
	const modelIcons: Record<string, any> = {
		// Claude models use SiClaude
		'anthropic/claude-opus-4.5': SiClaude,
		'anthropic/claude-sonnet-4.5': SiClaude,
		'anthropic/claude-haiku-4.5': SiClaude,
		// Gemini models use SiGooglegemini
		'google/gemini-2.5-flash-lite': SiGooglegemini,
		'google/gemini-3-flash-preview': SiGooglegemini,
		'google/gemini-3-pro-preview': SiGooglegemini,
		'google/gemini-2.5-flash-image': SiGooglegemini,
		'google/gemini-3-pro-image-preview': SiGooglegemini,
		// Grok models use Grok icon
		'x-ai/grok-4.1-fast': GrokLogo,
	};
	
	function getBrandColor(brand: string) {
		switch (brand.toLowerCase()) {
			case 'openai': return '#10a37f';
			case 'anthropic': return '#d97757';
			case 'google': return '#4285f4';
			case 'xai': return theme === 'light' ? '#000000' : '#ffffff';
			case 'deepseek': return '#4d6bff';
			case 'meta': return '#0668E1';
			case 'mistral': return '#ff6b00';
			case 'minimax': return '#ff4d4f';
			case 'moonshot': return '#00b96b';
			case 'black forest labs': return '#8B4513';
			case 'qwen': return '#8B5CF6';
			case 'z.ai': return '#10B981';
			default: return theme === 'light' ? '#3b82f6' : '#4299e1';
		}
	}
	
	// Get models grouped by brand
	let modelsByBrand = $derived(() => {
		const grouped = new Map<string, typeof AVAILABLE_MODELS>();
		AVAILABLE_MODELS.forEach((model) => {
			const existing = grouped.get(model.brand) || [];
			existing.push(model);
			grouped.set(model.brand, existing);
		});
		// Sort brands: OpenAI, Anthropic, Google first, then alphabetically
		const brandOrder = ['OpenAI', 'Anthropic', 'Google', 'xAI', 'Meta', 'Mistral', 'DeepSeek', 'Moonshot', 'MiniMax', 'Qwen', 'Z.AI'];
		return Array.from(grouped.entries()).sort((a, b) => {
			const aIndex = brandOrder.indexOf(a[0]);
			const bIndex = brandOrder.indexOf(b[0]);
			if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
			if (aIndex !== -1) return -1;
			if (bIndex !== -1) return 1;
			return a[0].localeCompare(b[0]);
		});
	});
	
	// Check if any filters are active (excluding sort)
	let hasActiveFilters = $derived(
		filters.dateRange !== 'all' || 
		filters.minCost !== null || 
		filters.maxCost !== null ||
		filters.selectedModels.length > 0 ||
		filters.searchMode !== 'name'
	);
	
	let textPrimary = $derived(theme === 'light' ? '#1f2937' : '#e2e8f0');
	let textSecondary = $derived(theme === 'light' ? '#6b7280' : '#a0aec0');
	let contentBg = $derived(theme === 'light' ? '#f8f9fa' : '#0f1419');
	let selectBg = $derived(theme === 'light' ? '#ffffff' : '#1a1f2e');
	let border = $derived(theme === 'light' ? '#e5e7eb' : '#2d3748');
	let hoverBg = $derived(theme === 'light' ? 'rgba(243, 244, 246, 0.3)' : 'rgba(45, 55, 72, 0.3)');
	let accentColor = $derived(theme === 'light' ? '#3b82f6' : '#4299e1');
	
	const sortOptions: { value: SortOption; label: string }[] = [
		{ value: 'recent', label: 'Most Recent' },
		{ value: 'oldest', label: 'Oldest First' },
		{ value: 'expensive', label: 'Most Expensive' },
		{ value: 'cheapest', label: 'Least Expensive' },
		{ value: 'tokens', label: 'Most Tokens' },
		{ value: 'messages', label: 'Most Messages' }
	];
	
	const dateOptions: { value: DateRange; label: string }[] = [
		{ value: 'all', label: 'All Time' },
		{ value: 'today', label: 'Today' },
		{ value: 'week', label: 'Last 7 Days' },
		{ value: 'month', label: 'Last 30 Days' },
		{ value: 'year', label: 'Last Year' }
	];
	
	function handleSortChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		filterStore.setSortBy(target.value as SortOption);
	}
	
	function handleDateChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		filterStore.setDateRange(target.value as DateRange);
	}
	
	function handleMinCostChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const value = target.value === '' ? null : parseFloat(target.value);
		filterStore.setCostRange(value, filters.maxCost);
	}
	
	function handleMaxCostChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const value = target.value === '' ? null : parseFloat(target.value);
		filterStore.setCostRange(filters.minCost, value);
	}
	
	function toggleModel(modelId: string) {
		filterStore.toggleModel(modelId);
	}
	
	function setSearchMode(mode: SearchMode) {
		filterStore.setSearchMode(mode);
	}
	
	function clearFilters() {
		filterStore.resetFilters();
	}
</script>

<div class="chat-filters border-b" style:border-color={border}>
	<button 
		class="filters-toggle w-full px-4 py-3 text-left bg-transparent text-xs font-semibold flex items-center justify-between transition-colors"
		style:color={textSecondary}
		onmouseenter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
		onmouseleave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
		onclick={() => filtersExpanded = !filtersExpanded}
	>
		<div class="flex items-center gap-2">
			<SlidersHorizontal size={14} />
			<span>FILTERS</span>
			{#if hasActiveFilters}
				<span 
					class="w-2 h-2 rounded-full"
					style:background-color={accentColor}
				></span>
			{/if}
		</div>
		<div class="flex items-center gap-2">
			{#if hasActiveFilters}
				<span
					class="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
					onclick={(e) => { e.stopPropagation(); clearFilters(); }}
					title="Clear filters"
					role="button"
					tabindex="0"
					onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); clearFilters(); }}}
				>
					<X size={12} />
				</span>
			{/if}
			<ChevronDown 
				size={16} 
				class="transition-transform duration-200 {filtersExpanded ? 'rotate-180' : ''}"
			/>
		</div>
	</button>
	
	{#if filtersExpanded}
		<div class="filters-content px-4 py-4 space-y-4" style:background-color={contentBg}>
			<!-- Search Mode -->
			<div class="filter-group">
				<span class="block mb-2 text-xs uppercase tracking-wide font-medium" style:color={textSecondary}>
					Search In
				</span>
				<div class="flex gap-2">
					<button
						onclick={() => setSearchMode('name')}
						class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border"
						style:background-color={filters.searchMode === 'name' ? `${accentColor}30` : selectBg}
						style:color={filters.searchMode === 'name' ? textPrimary : textSecondary}
						style:border-color={filters.searchMode === 'name' ? accentColor : border}
					>
						<Search size={12} />
						Name Only
					</button>
					<button
						onclick={() => setSearchMode('name_and_content')}
						class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border"
						style:background-color={filters.searchMode === 'name_and_content' ? `${accentColor}30` : selectBg}
						style:color={filters.searchMode === 'name_and_content' ? textPrimary : textSecondary}
						style:border-color={filters.searchMode === 'name_and_content' ? accentColor : border}
					>
						<FileText size={12} />
						Chat + Name
					</button>
				</div>
			</div>
			
			<!-- Sort By -->
			<div class="filter-group">
				<label for="sortBy" class="block mb-2 text-xs uppercase tracking-wide font-medium" style:color={textSecondary}>
					Sort By
				</label>
				<select
					id="sortBy"
					value={filters.sortBy}
					onchange={handleSortChange}
					class="w-full px-3 py-2 rounded-lg border text-sm focus:border-[#4299e1] focus:outline-none transition-colors"
					style:background-color={selectBg}
					style:border-color={border}
					style:color={textPrimary}
				>
					{#each sortOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>
			
			<!-- Date Range -->
			<div class="filter-group">
				<label for="dateRange" class="block mb-2 text-xs uppercase tracking-wide font-medium" style:color={textSecondary}>
					Date Range
				</label>
				<select
					id="dateRange"
					value={filters.dateRange}
					onchange={handleDateChange}
					class="w-full px-3 py-2 rounded-lg border text-sm focus:border-[#4299e1] focus:outline-none transition-colors"
					style:background-color={selectBg}
					style:border-color={border}
					style:color={textPrimary}
				>
					{#each dateOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>
			
			<!-- Cost Range -->
			<div class="filter-group">
				<span class="block mb-2 text-xs uppercase tracking-wide font-medium" style:color={textSecondary}>
					Cost Range ($)
				</span>
				<div class="flex items-center gap-2">
					<input
						type="number"
						placeholder="0"
						min="0"
						step="0.01"
						value={filters.minCost ?? ''}
						onchange={handleMinCostChange}
						class="w-16 px-2 py-1.5 rounded-lg border text-xs focus:border-[#4299e1] focus:outline-none transition-colors text-center"
						style:background-color={selectBg}
						style:border-color={border}
						style:color={textPrimary}
					/>
					<span style:color={textSecondary}>-</span>
					<input
						type="number"
						placeholder="∞"
						min="0"
						step="0.01"
						value={filters.maxCost ?? ''}
						onchange={handleMaxCostChange}
						class="w-16 px-2 py-1.5 rounded-lg border text-xs focus:border-[#4299e1] focus:outline-none transition-colors text-center"
						style:background-color={selectBg}
						style:border-color={border}
						style:color={textPrimary}
					/>
				</div>
			</div>
			
			<!-- Model Filter -->
			<div class="filter-group">
				<span class="block mb-2 text-xs uppercase tracking-wide font-medium" style:color={textSecondary}>
					Models Used
					{#if filters.selectedModels.length > 0}
						<span class="ml-1 text-[10px]" style:color={accentColor}>({filters.selectedModels.length})</span>
					{/if}
				</span>
				<div class="max-h-48 overflow-y-auto space-y-2">
					{#each modelsByBrand() as [brand, models]}
						{@const BrandIcon = brandIcons[brand]}
						{@const brandColor = getBrandColor(brand)}
						<div class="brand-group">
							<div class="flex items-center gap-1.5 mb-1.5 px-1">
								{#if BrandIcon}
									{@const iconColor = brand.toLowerCase() === 'xai' && theme === 'light' ? '#ffffff' : '#000000'}
									{@const bgColor = brand.toLowerCase() === 'xai' ? (theme === 'light' ? '#000000' : '#ffffff') : brandColor}
									{@const isSvgBrandIcon = BrandIcon === DeepSeekLogo || BrandIcon === PerplexityAILogo || BrandIcon === XAIGrokLogo || BrandIcon === KimiLogo || BrandIcon === QwenLogo || BrandIcon === GrokLogo}
									<div class="w-4 h-4 rounded flex items-center justify-center overflow-hidden" style:background-color={bgColor}>
										{#if isSvgBrandIcon}
											<BrandIcon height={10} width={10} />
										{:else}
											<BrandIcon size={10} color={iconColor} />
										{/if}
									</div>
								{:else}
									<div class="w-4 h-4 rounded flex items-center justify-center text-[8px] text-white font-bold" style:background-color={brandColor}>
										{brand[0]}
									</div>
								{/if}
								<span class="text-[10px] font-semibold uppercase" style:color={textSecondary}>{brand}</span>
							</div>
							<div class="grid grid-cols-2 gap-1">
								{#each models as model}
									{@const ModelIcon = modelIcons[model.id]}
										{@const showModelIcon = ModelIcon && (brand === 'Anthropic' || brand === 'Google' || brand === 'xAI')}
									<button
										onclick={() => toggleModel(model.id)}
										class="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium text-left transition-all border"
										class:col-span-2={model.displayName.length > 20}
										style:background-color={filters.selectedModels.includes(model.id) ? `${brandColor}30` : selectBg}
										style:color={filters.selectedModels.includes(model.id) ? textPrimary : textSecondary}
										style:border-color={filters.selectedModels.includes(model.id) ? brandColor : border}
										title={model.displayName}
									>
										{#if filters.selectedModels.includes(model.id)}
											<Check size={10} color={brandColor} />
									{:else if showModelIcon}
										{@const isModelIconSvg = ModelIcon === GrokLogo}
										<span style:color={brandColor}>
											{#if isModelIconSvg}
												<ModelIcon height={10} width={10} />
											{:else}
												<ModelIcon size={10} />
											{/if}
										</span>
									{/if}
										<span class="truncate">{model.displayName}</span>
									</button>
								{/each}
							</div>
						</div>
					{/each}
				</div>
				{#if modelsByBrand().length === 0}
					<p class="text-xs italic" style:color={textSecondary}>No models available</p>
				{/if}
			</div>
		</div>
	{/if}
</div>