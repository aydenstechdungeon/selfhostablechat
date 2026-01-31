<script lang="ts">
	import { ChevronDown, Check, Sparkles } from 'lucide-svelte';
	import { modelStore, AVAILABLE_MODELS } from '$lib/stores/modelStore';
	import { uiStore } from '$lib/stores/uiStore';
	import { chatStore } from '$lib/stores/chatStore';
	import { 
		SiOpenai, 
		SiAnthropic, 
		SiGoogle, 
		SiMeta,
		SiMistralai,
		SiX
	} from '@icons-pack/svelte-simple-icons';
	
	let isOpen = $state(false);
	let selectedBrand = $state<string>('recommended');
	let theme = $derived($uiStore.theme);
	
	// Sync local state with store
	let multiModelEnabled = $derived($modelStore.multiModelMode);
	let selectedModels = $derived(new Set($modelStore.selectedModels));
	let autoMode = $derived($modelStore.autoMode);
	
	// Sync with chatStore when selection changes
	$effect(() => {
		if ($modelStore.multiModelMode) {
			chatStore.setMode('manual');
			chatStore.setSelectedModels($modelStore.selectedModels);
		} else if (!$modelStore.autoMode && $modelStore.selectedModels.length > 0) {
			chatStore.setMode('manual');
			chatStore.setSelectedModels($modelStore.selectedModels);
		} else {
			chatStore.setMode('auto');
			chatStore.setSelectedModels([]);
		}
	});
	
	// Brand icon mapping
	const brandIcons: Record<string, any> = {
		'openai': SiOpenai,
		'anthropic': SiAnthropic,
		'google': SiGoogle,
		'meta': SiMeta,
		'mistral': SiMistralai,
		'xai': SiX,
	};
	
	// Display text and icon for the selector button
	let currentModelName = $derived(() => {
		if ($modelStore.autoMode) {
			return 'Auto';
		} else if ($modelStore.multiModelMode && $modelStore.selectedModels.length > 0) {
			return `${$modelStore.selectedModels.length} models`;
		} else if ($modelStore.selectedModels.length > 0) {
			const model = AVAILABLE_MODELS.find(m => m.id === $modelStore.selectedModels[0]);
			return model ? model.name : 'Select Model';
		}
		return 'Select Model';
	});
	
	let currentModelBrand = $derived(() => {
		if ($modelStore.autoMode || $modelStore.multiModelMode) {
			return null;
		} else if ($modelStore.selectedModels.length > 0) {
			const model = AVAILABLE_MODELS.find(m => m.id === $modelStore.selectedModels[0]);
			return model ? model.brand.toLowerCase() : null;
		}
		return null;
	});
	
	// Get current brand and icon for display
	let displayBrand = $derived(currentModelBrand());
	let DisplayBrandIcon = $derived(displayBrand ? brandIcons[displayBrand] : null);
	
	// Custom brand order: All, Recommended, Anthropic (3rd), others..., Google (5th), OpenAI (6th)
	const BRAND_ORDER = ['all', 'recommended', 'image', 'anthropic', 'xai', 'google', 'openai', 'meta', 'mistral', 'moonshot', 'minimax'];
	
	// Get unique brands from AVAILABLE_MODELS with custom ordering
	const uniqueBrands = Array.from(new Set(AVAILABLE_MODELS.map(m => m.brand)));
	const sortedBrands = uniqueBrands.sort((a, b) => {
		const aLower = a.toLowerCase();
		const bLower = b.toLowerCase();
		const aIndex = BRAND_ORDER.indexOf(aLower);
		const bIndex = BRAND_ORDER.indexOf(bLower);
		
		// If both are in the order array, sort by their position
		if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
		// If only a is in the order array, it comes first
		if (aIndex !== -1) return -1;
		// If only b is in the order array, it comes first
		if (bIndex !== -1) return 1;
		// Otherwise, alphabetical
		return a.localeCompare(b);
	});
	
	const brands = [
		{ id: 'all', name: 'All' },
		{ id: 'recommended', name: 'Recommended' },
		...sortedBrands.map(brand => ({
			id: brand.toLowerCase(),
			name: brand
		}))
	];
	
	// Map AVAILABLE_MODELS to selector format
	const models = AVAILABLE_MODELS.map(m => ({
		id: m.id,
		name: m.name,
		brand: m.brand.toLowerCase(),
		recommended: m.category === 'general' || m.category === 'advanced',
		context: m.contextWindow >= 1000000 
			? `${(m.contextWindow / 1000000).toFixed(1)}M` 
			: `${(m.contextWindow / 1000).toFixed(0)}K`,
		price: `$${(m.pricePer1M.input + m.pricePer1M.output).toFixed(2)}/1M`,
		supportsImages: m.supportsImages,
		supportsImageGeneration: m.supportsImageGeneration
	}));
	
	let filteredModels = $derived(() => {
		if (selectedBrand === 'all') return models;
		if (selectedBrand === 'recommended') return models.filter(m => m.recommended);
		if (selectedBrand === 'image') return models.filter(m => m.supportsImageGeneration);
		return models.filter(m => m.brand === selectedBrand);
	});
	
	function selectModel(modelId: string) {
		if ($modelStore.multiModelMode) {
			// Toggle model in multi-model mode
			const currentModels = new Set($modelStore.selectedModels);
			if (currentModels.has(modelId)) {
				currentModels.delete(modelId);
			} else {
				currentModels.add(modelId);
			}
			modelStore.selectMultipleModels(Array.from(currentModels));
		} else {
			// Select single model
			modelStore.selectModel(modelId);
			isOpen = false;
		}
	}
	
	function selectAuto() {
		modelStore.setAutoMode(true);
		isOpen = false;
	}
	
	function toggleMultiModel() {
		modelStore.toggleMultiModelMode();
	}
	
	function getBrandColor(brand: string) {
		switch (brand) {
			case 'openai': return 'bg-[#10a37f]';
			case 'anthropic': return 'bg-[#d97757]';
			case 'google': return 'bg-[#4285f4]';
			case 'xai': return 'bg-[#000000]';
			case 'seedream': return 'bg-[#8b5cf6]';
			case 'deepseek': return 'bg-[#4d6bff]';
			case 'meta': return 'bg-[#0668E1]';
			case 'mistral': return 'bg-[#ff6b00]';
			case 'minimax': return 'bg-[#ff4d4f]';
			case 'moonshot': return 'bg-[#00b96b]';
			case 'black forest labs': return 'bg-[#8B4513]';
			default: return theme === 'light' ? 'bg-[#3b82f6]' : 'bg-[#4299e1]';
		}
	}
	
	let bgColor = $derived(theme === 'light' ? '#ffffff' : '#0f1419');
	let bgSecondary = $derived(theme === 'light' ? '#f3f4f6' : '#1a1f2e');
	let border = $derived(theme === 'light' ? '#e5e7eb' : '#2d3748');
	let text = $derived(theme === 'light' ? '#1f2937' : '#e2e8f0');
	let textSecondary = $derived(theme === 'light' ? '#6b7280' : '#718096');
	let accentColor = $derived(theme === 'light' ? '#3b82f6' : '#4299e1');
</script>

<div class="model-selector relative z-[100]">
	<button
		class="selector-trigger flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-150 ease-out min-w-[180px] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
		style:background-color={bgColor}
		style:border-color={$modelStore.autoMode ? '#48bb78' : border}
		style:color={text}
		onclick={() => isOpen = !isOpen}
		onmouseenter={() => {}}
		type="button"
		aria-haspopup="listbox"
		aria-expanded={isOpen}
	>
		{#if DisplayBrandIcon}
			<div class="w-5 h-5 rounded flex items-center justify-center {getBrandColor(displayBrand!)} flex-shrink-0 pointer-events-none">
				<DisplayBrandIcon size={14} class="text-white" />
			</div>
		{:else if $modelStore.autoMode}
			<div class="w-5 h-5 rounded bg-[#48bb78] flex items-center justify-center flex-shrink-0 pointer-events-none">
				<span class="text-white text-xs font-bold">A</span>
			</div>
		{/if}
		<span class="flex-1 text-sm font-medium text-left truncate pointer-events-none">{currentModelName()}</span>
		<ChevronDown size={16} class="transition-transform duration-200 ease-out {isOpen ? 'rotate-180' : ''} pointer-events-none flex-shrink-0" />
	</button>
	
	{#if isOpen}
		<div class="selector-dropdown absolute top-full mt-2 w-[420px] rounded-xl shadow-2xl overflow-hidden z-[9999] opacity-100 animate-dropdown-in" style:background-color={bgColor} style:border="1px solid {border}" style:left="50%" style:transform="translateX(-50%)">
			<!-- Header with Multi-Model Toggle and Brand Tabs -->
			<div style:border-bottom="1px solid {border}">
				<div class="flex items-center gap-1 px-3 py-2 overflow-x-auto" style="scrollbar-width: thin; scrollbar-color: {textSecondary} {bgSecondary};">
					<!-- Multi-Model Toggle -->
					<button
						class="flex-shrink-0 mr-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
						style:background-color={$modelStore.multiModelMode ? accentColor : bgSecondary}
						style:color={$modelStore.multiModelMode ? '#ffffff' : textSecondary}
						onclick={toggleMultiModel}
					>
						<Sparkles size={12} />
						Multi
					</button>
					
					<div class="w-px h-5 flex-shrink-0" style:background-color={border}></div>
					
					<!-- Brand Tabs -->
					{#each brands as brand}
						{@const BrandIcon = brandIcons[brand.id]}
						<button
							class="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1"
							style:background-color={selectedBrand === brand.id ? bgSecondary : 'transparent'}
							style:color={selectedBrand === brand.id ? text : textSecondary}
							onclick={() => selectedBrand = brand.id}
						>
							{#if BrandIcon}
								<BrandIcon size={14} />
							{/if}
							{brand.name}
						</button>
					{/each}
				</div>
			</div>
			
			<!-- Auto Option -->
			{#if !$modelStore.multiModelMode}
				<div class="p-2" style:border-bottom="1px solid {border}">
					<button
						class="model-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors border"
						style:background-color={$modelStore.autoMode ? 'rgba(72, 187, 120, 0.15)' : 'transparent'}
						style:border-color={$modelStore.autoMode ? '#48bb78' : 'transparent'}
						onclick={selectAuto}
					>
						<div class="w-8 h-8 rounded-lg bg-[#48bb78] flex items-center justify-center text-sm text-white font-semibold">
							A
						</div>
						<div class="flex-1 text-left">
							<div class="text-sm font-medium" style:color={text}>Auto</div>
							<div class="text-xs" style:color={textSecondary}>Automatically select best model</div>
						</div>
						{#if $modelStore.autoMode}
							<Check size={16} class="text-[#48bb78]" />
						{/if}
					</button>
				</div>
			{/if}
			
			<!-- Model List (Scrollable) -->
			<div class="max-h-[320px] overflow-y-auto p-2 space-y-1" style="scrollbar-width: thin; scrollbar-color: {textSecondary} {bgSecondary};">
				{#each filteredModels() as model}
					{@const isSelected = $modelStore.multiModelMode ? selectedModels.has(model.id) : (!$modelStore.autoMode && $modelStore.selectedModels.includes(model.id))}
					{@const ModelIcon = brandIcons[model.brand]}
					<button
						class="model-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors border"
						style:background-color={isSelected ? `${accentColor}15` : 'transparent'}
						style:border-color={isSelected ? accentColor : 'transparent'}
						onclick={() => selectModel(model.id)}
					>
						{#if $modelStore.multiModelMode}
							<div class="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors" style:background-color={selectedModels.has(model.id) ? accentColor : 'transparent'} style:border-color={selectedModels.has(model.id) ? accentColor : border}>
								{#if selectedModels.has(model.id)}
									<Check size={12} class="text-white" />
								{/if}
							</div>
						{/if}
						<div class="w-8 h-8 rounded-lg {getBrandColor(model.brand)} flex items-center justify-center text-white">
							{#if ModelIcon}
								<ModelIcon size={18} />
							{:else}
								<span class="text-sm font-semibold">{model.name[0]}</span>
							{/if}
						</div>
						<div class="flex-1 text-left min-w-0">
							<div class="text-sm font-medium truncate" style:color={text}>{model.name}</div>
							<div class="text-xs flex items-center gap-2" style:color={textSecondary}>
								<span>{model.context}</span>
								<span class="text-[#48bb78]">{model.price}</span>
							</div>
						</div>
						{#if !$modelStore.multiModelMode && !autoMode && $modelStore.selectedModels.includes(model.id)}
							<Check size={16} color={accentColor} />
						{/if}
					</button>
				{/each}
			</div>
			
			<!-- Footer when multi-model is enabled -->
			{#if $modelStore.multiModelMode && selectedModels.size > 0}
				<div class="p-3 flex items-center justify-between" style:border-top="1px solid {border}">
					<span class="text-xs" style:color={textSecondary}>{selectedModels.size} model{selectedModels.size > 1 ? 's' : ''} selected</span>
					<button
						class="px-4 py-1.5 rounded-lg text-white text-sm font-medium transition-colors"
						style:background-color={accentColor}
						onclick={() => isOpen = false}
					>
						Done
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>

<svelte:window onclick={(e) => {
	if (e.target instanceof HTMLElement && !e.target.closest('.model-selector')) {
		isOpen = false;
	}
}} />

<style>
	@keyframes dropdown-in {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(-8px) scale(0.96);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0) scale(1);
		}
	}

	:global(.animate-dropdown-in) {
		animation: dropdown-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}

	:global(.model-item) {
		transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
	}

	:global(.model-item:hover) {
		transform: translateX(2px);
	}

	:global(.model-item:active) {
		transform: scale(0.98);
	}
</style>