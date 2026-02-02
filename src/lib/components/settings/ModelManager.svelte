<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import {
		modelStore,
		AVAILABLE_MODELS,
		customModelsStore,
		hiddenModelsStore,
		resetAllModelSettings,
		type CustomModel
	} from '$lib/stores/modelStore';
	import { uiStore } from '$lib/stores/uiStore';
	import { 
		SiOpenai, 
		SiAnthropic, 
		SiGoogle, 
		SiMeta,
		SiMistralai,
		SiClaude,
		SiGooglegemini,
		SiX,
		SiPerplexity
	} from '@icons-pack/svelte-simple-icons';
	import {
		DeepSeekLogo,
		PerplexityAILogo,
		XAIGrokLogo,
		KimiLogo,
		QwenLogo,
		GrokLogo
	} from '@selemondev/svgl-svelte';
	import { 
		Star, 
		Trash2, 
		Plus, 
		Edit3, 
		Check, 
		X, 
		Sparkles,
		DollarSign,
		Brain,
		Eye,
		Image,
		GripVertical,
		Search,
		Filter,
		EyeOff,
		RotateCcw,
		AlertTriangle,
		Layers,
		Package,
		MoreVertical
	} from 'lucide-svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	
	let { theme = 'dark' }: { theme?: string } = $props();
	
	// Local state
	let showAddModal = $state(false);
	let showEditModal = $state(false);
	let editingModel: CustomModel | null = $state(null);
	let searchQuery = $state('');
	let filterBrand = $state('all');
	let filterCategory = $state('all');
	let filterVisibility = $state<'all' | 'visible' | 'hidden'>('all');
	let confirmDeleteModalOpen = $state(false);
	let confirmResetModalOpen = $state(false);
	let modelToDelete: CustomModel | null = $state(null);
	let showHiddenModels = $state(false);
	
	// Form state for new/edit model
	let formData = $state<Partial<CustomModel>>({
		id: '',
		name: '',
		displayName: '',
		brand: 'OpenAI',
		category: 'general',
		contextWindow: 128000,
		pricePer1M: { input: 0, output: 0 },
		capabilities: [],
		supportsImages: false,
		supportsImageGeneration: false,
		isRecommended: false,
		isAutoSelectable: true
	});
	
	const uiState = $derived($uiStore);
	const hiddenModels = $derived($hiddenModelsStore.hiddenIds);
	const customModels = $derived($customModelsStore.models);
	
	// Combine all models with visibility status
	const allModels = $derived(() => {
		const builtIn = AVAILABLE_MODELS.map(m => ({
			...m,
			isCustom: false,
			isHidden: hiddenModels.includes(m.id)
		}));
		const custom = customModels.map(m => ({
			...m,
			isCustom: true,
			isHidden: false
		}));
		return [...builtIn, ...custom];
	});
	
	// Filter models
	let filteredModels = $derived(() => {
		let models = allModels();
		
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			models = models.filter(m => 
				m.name.toLowerCase().includes(query) ||
				m.brand.toLowerCase().includes(query) ||
				m.id.toLowerCase().includes(query)
			);
		}
		
		if (filterBrand !== 'all') {
			models = models.filter(m => m.brand.toLowerCase() === filterBrand.toLowerCase());
		}
		
		if (filterCategory !== 'all') {
			models = models.filter(m => m.category === filterCategory);
		}
		
		if (filterVisibility === 'visible') {
			models = models.filter(m => !m.isHidden);
		} else if (filterVisibility === 'hidden') {
			models = models.filter(m => m.isHidden);
		}
		
		return models;
	});
	
	// Separate visible and hidden models
	let visibleModels = $derived(() => filteredModels().filter(m => !m.isHidden));
	let hiddenModelsList = $derived(() => filteredModels().filter(m => m.isHidden));
	
	// Stats
	let stats = $derived(() => {
		const models = allModels();
		const visible = models.filter(m => !m.isHidden);
		return {
			total: models.length,
			visible: visible.length,
			hidden: models.filter(m => m.isHidden).length,
			recommended: visible.filter(m => m.isRecommended).length,
			autoSelectable: visible.filter(m => 'isAutoSelectable' in m ? m.isAutoSelectable !== false : true).length,
			custom: customModels.length,
			vision: visible.filter(m => m.supportsImages).length,
			imageGen: visible.filter(m => m.supportsImageGeneration).length
		};
	});
	
	// Brand icon mapping
	const brandIcons: Record<string, any> = {
		'openai': SiOpenai,
		'anthropic': SiAnthropic,
		'google': SiGoogle,
		'meta': SiMeta,
		'mistral': SiMistralai,
		'xai': XAIGrokLogo,
		'deepseek': DeepSeekLogo,
		'perplexity': PerplexityAILogo,
		'moonshot': KimiLogo,
		'qwen': QwenLogo,
		'minimax': null, // No icon available, uses fallback
	};
	
	// Model-specific icon mapping (for actual model logos)
	const modelIcons: Record<string, any> = {
		// Claude models
		'anthropic/claude-opus-4.5': SiClaude,
		'anthropic/claude-sonnet-4.5': SiClaude,
		'anthropic/claude-haiku-4.5': SiClaude,
		// Gemini models
		'google/gemini-2.5-flash-lite': SiGooglegemini,
		'google/gemini-3-flash-preview': SiGooglegemini,
		'google/gemini-3-pro-preview': SiGooglegemini,
		'google/gemini-2.5-flash-image': SiGooglegemini,
		'google/gemini-3-pro-image-preview': SiGooglegemini,
		// Grok models
		'x-ai/grok-4.1-fast': GrokLogo,
		// Other models with specific icons
		'perplexity/sonar-pro-search': PerplexityAILogo,
		'qwen/qwen3-vl-235b-a22b-instruct': QwenLogo,
		'moonshotai/kimi-k2': KimiLogo,
		'moonshotai/kimi-k2.5': KimiLogo,
		'deepseek/deepseek-v3.2': DeepSeekLogo,
		'minimax/minimax-m2.1': null,
	};
	
	const brands = ['OpenAI', 'Anthropic', 'Google', 'Meta', 'Mistral', 'xAI', 'Moonshot', 'DeepSeek', 'MiniMax', 'Qwen', 'Perplexity', 'Black Forest Labs', 'Z.AI', 'Other'];
	const categories = [
		{ id: 'general', name: 'General', icon: Brain },
		{ id: 'advanced', name: 'Advanced', icon: Star },
		{ id: 'image', name: 'Image Generation', icon: Image },
		{ id: 'reasoning', name: 'Reasoning', icon: Sparkles },
	];
	const capabilities = ['general', 'vision', 'coding', 'writing', 'fast', 'complex', 'math', 'reasoning', 'search', 'image-generation'];
	
	function openAddModal() {
		formData = {
			id: '',
			name: '',
			displayName: '',
			brand: 'OpenAI',
			category: 'general',
			contextWindow: 128000,
			pricePer1M: { input: 0, output: 0 },
			capabilities: ['general'],
			supportsImages: false,
			supportsImageGeneration: false,
			isRecommended: false,
			isAutoSelectable: true
		};
		showAddModal = true;
	}
	
	function openEditModal(model: CustomModel) {
		editingModel = model;
		formData = { ...model };
		showEditModal = true;
	}
	
	function closeModals() {
		showAddModal = false;
		showEditModal = false;
		editingModel = null;
	}
	
	function handleSave() {
		if (!formData.id || !formData.name) return;
		
		const modelData: CustomModel = {
			id: formData.id,
			name: formData.name,
			displayName: formData.displayName || formData.name,
			brand: formData.brand || 'OpenAI',
			category: formData.category || 'general',
			contextWindow: formData.contextWindow || 128000,
			pricePer1M: formData.pricePer1M || { input: 0, output: 0 },
			capabilities: formData.capabilities || [],
			supportsImages: formData.supportsImages || false,
			supportsImageGeneration: formData.supportsImageGeneration || false,
			isRecommended: formData.isRecommended || false,
			isAutoSelectable: formData.isAutoSelectable !== false,
			isCustom: true
		};
		
		if (showEditModal && editingModel) {
			customModelsStore.updateModel(editingModel.id, modelData);
		} else {
			customModelsStore.addModel(modelData);
		}
		
		closeModals();
	}
	
	function confirmDelete(model: CustomModel) {
		modelToDelete = model;
		confirmDeleteModalOpen = true;
	}
	
	function handleDelete() {
		if (modelToDelete) {
			customModelsStore.removeModel(modelToDelete.id);
			confirmDeleteModalOpen = false;
			modelToDelete = null;
		}
	}
	
	function toggleCapability(cap: string) {
		const current = formData.capabilities || [];
		if (current.includes(cap)) {
			formData.capabilities = current.filter(c => c !== cap);
		} else {
			formData.capabilities = [...current, cap];
		}
	}
	
	function toggleRecommended(model: CustomModel) {
		if (model.isCustom) {
			customModelsStore.updateModel(model.id, { isRecommended: !model.isRecommended });
		}
	}
	
	function toggleAutoSelectable(model: CustomModel) {
		if (model.isCustom) {
			const current = 'isAutoSelectable' in model ? model.isAutoSelectable : true;
			customModelsStore.updateModel(model.id, { isAutoSelectable: !current });
		}
	}
	
	function toggleModelVisibility(modelId: string, isHidden: boolean) {
		if (isHidden) {
			hiddenModelsStore.showModel(modelId);
		} else {
			hiddenModelsStore.hideModel(modelId);
		}
	}
	
	function handleReset() {
		resetAllModelSettings();
		confirmResetModalOpen = false;
	}
	
	function getBrandIcon(brand: string) {
		return brandIcons[brand.toLowerCase()];
	}
	
	function getBrandColor(brand: string) {
		switch (brand.toLowerCase()) {
			case 'openai': return '#10a37f';
			case 'anthropic': return '#d97757';
			case 'google': return '#4285f4';
			case 'xai': return '#000000';
			case 'meta': return '#0668E1';
			case 'mistral': return '#ff6b00';
			case 'moonshot': return '#00b96b';
			case 'deepseek': return '#4d6bff';
			case 'minimax': return '#ff4d4f';
			case 'qwen': return '#1677ff';
			case 'perplexity': return '#00a4e4';
			default: return '#4299e1';
		}
	}
	
	// Theme-based colors
	let textPrimary = $derived(theme === 'light' ? '#1f2937' : '#e2e8f0');
	let textSecondary = $derived(theme === 'light' ? '#6b7280' : '#a0aec0');
	let inputBg = $derived(theme === 'light' ? '#f3f4f6' : '#0f1419');
	let contentBg = $derived(theme === 'light' ? '#ffffff' : '#1a1f2e');
	let border = $derived(theme === 'light' ? '#e5e7eb' : '#2d3748');
	let hoverBg = $derived(theme === 'light' ? 'rgba(249, 250, 251, 0.5)' : 'rgba(45, 55, 72, 0.3)');
	let activeBg = $derived(theme === 'light' ? '#f3f4f6' : '#2d3748');
</script>

<div class="model-manager space-y-6">
	<!-- Stats Cards -->
	<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
		<div class="stat-card p-3 rounded-lg border" style:border-color={border} style:background-color={inputBg}>
			<div class="text-2xl font-bold" style:color={textPrimary}>{stats().total}</div>
			<div class="text-xs truncate" style:color={textSecondary} title="Total">Total</div>
		</div>
		<div class="stat-card p-3 rounded-lg border" style:border-color={border} style:background-color={inputBg}>
			<div class="text-2xl font-bold text-green-500">{stats().visible}</div>
			<div class="text-xs truncate" style:color={textSecondary} title="Visible">Visible</div>
		</div>
		<div class="stat-card p-3 rounded-lg border" style:border-color={border} style:background-color={inputBg}>
			<div class="text-2xl font-bold text-gray-500">{stats().hidden}</div>
			<div class="text-xs truncate" style:color={textSecondary} title="Hidden">Hidden</div>
		</div>
		<div class="stat-card p-3 rounded-lg border" style:border-color={border} style:background-color={inputBg}>
			<div class="text-2xl font-bold text-yellow-500">{stats().recommended}</div>
			<div class="text-xs truncate" style:color={textSecondary} title="Recommended">Rec.</div>
		</div>
		<div class="stat-card p-3 rounded-lg border" style:border-color={border} style:background-color={inputBg}>
			<div class="text-2xl font-bold text-purple-500">{stats().autoSelectable}</div>
			<div class="text-xs truncate" style:color={textSecondary} title="Auto Mode">Auto</div>
		</div>
		<div class="stat-card p-3 rounded-lg border" style:border-color={border} style:background-color={inputBg}>
			<div class="text-2xl font-bold text-blue-500">{stats().custom}</div>
			<div class="text-xs truncate" style:color={textSecondary} title="Custom">Custom</div>
		</div>
		<div class="stat-card p-3 rounded-lg border" style:border-color={border} style:background-color={inputBg}>
			<div class="text-2xl font-bold text-pink-500">{stats().vision}</div>
			<div class="text-xs truncate" style:color={textSecondary} title="Vision">Vision</div>
		</div>
		<div class="stat-card p-3 rounded-lg border" style:border-color={border} style:background-color={inputBg}>
			<div class="text-2xl font-bold text-orange-500">{stats().imageGen}</div>
			<div class="text-xs truncate" style:color={textSecondary} title="Image Generation">Img. Gen</div>
		</div>
	</div>
	
	<!-- Filters and Actions -->
	<div class="flex flex-wrap items-center gap-3">
		<div class="relative flex-1 min-w-[200px]">
			<Search class="absolute left-3 top-1/2 -translate-y-1/2" size={16} color={textSecondary} />
			<input
				type="text"
				placeholder="Search models..."
				class="w-full pl-10 pr-4 py-2 rounded-lg border text-sm focus:outline-none focus:border-[#4299e1]"
				style:background-color={inputBg}
				style:border-color={border}
				style:color={textPrimary}
				bind:value={searchQuery}
			/>
		</div>
		
		<select
			class="px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-[#4299e1]"
			style:background-color={inputBg}
			style:border-color={border}
			style:color={textPrimary}
			bind:value={filterBrand}
		>
			<option value="all">All Brands</option>
			{#each brands as brand}
				<option value={brand.toLowerCase()}>{brand}</option>
			{/each}
		</select>
		
		<select
			class="px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-[#4299e1]"
			style:background-color={inputBg}
			style:border-color={border}
			style:color={textPrimary}
			bind:value={filterCategory}
		>
			<option value="all">All Categories</option>
			{#each categories as cat}
				<option value={cat.id}>{cat.name}</option>
			{/each}
		</select>
		
		<select
			class="px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-[#4299e1]"
			style:background-color={inputBg}
			style:border-color={border}
			style:color={textPrimary}
			bind:value={filterVisibility}
		>
			<option value="all">All Models</option>
			<option value="visible">Visible Only</option>
			<option value="hidden">Hidden Only</option>
		</select>
		
		<button
			class="px-4 py-2 rounded-lg bg-[#4299e1] text-white text-sm font-medium flex items-center gap-2 hover:bg-[#3182ce] transition-colors"
			onclick={openAddModal}
		>
			<Plus size={16} />
			Add Model
		</button>
		
		<button
			class="px-4 py-2 rounded-lg border text-sm font-medium flex items-center gap-2 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500 transition-colors"
			style:border-color={border}
			style:color={textPrimary}
			onclick={() => confirmResetModalOpen = true}
			title="Reset all model settings to defaults"
		>
			<RotateCcw size={16} />
			Reset
		</button>
	</div>
	
	<!-- Visible Models Section -->
	{#if visibleModels().length > 0}
		<div class="models-section">
			<div class="flex items-center gap-2 mb-3">
				<Package size={18} color={textPrimary} />
				<h3 class="text-sm font-semibold" style:color={textPrimary}>
					Visible Models ({visibleModels().length})
				</h3>
			</div>
			<div class="models-list space-y-2 max-h-[400px] overflow-y-auto" style="scrollbar-width: thin;">
				{#each visibleModels() as model}
					{@const BrandIcon = getBrandIcon(model.brand)}
					{@const ModelSpecificIcon = modelIcons[model.id]}
					{@const DisplayIcon = ModelSpecificIcon || BrandIcon}
					{@const isSvgIcon = DisplayIcon === DeepSeekLogo || DisplayIcon === PerplexityAILogo || DisplayIcon === XAIGrokLogo || DisplayIcon === KimiLogo || DisplayIcon === QwenLogo || DisplayIcon === GrokLogo}
					{@const isCustom = model.isCustom}
					{@const isAutoSelectable = 'isAutoSelectable' in model ? model.isAutoSelectable : true}
					
					<div class="model-item flex items-center gap-3 p-3 rounded-lg border transition-all hover:translate-x-1"
						style:border-color={border}
						style:background-color={contentBg}
					>
						<!-- Drag Handle (for custom models) -->
						{#if isCustom}
							<div class="cursor-move" style:color={textSecondary}>
								<GripVertical size={16} />
							</div>
						{/if}
						
						<!-- Brand/Model Icon -->
						<div class="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0 overflow-hidden"
							style:background-color={getBrandColor(model.brand)}
						>
							{#if DisplayIcon}
								{#if isSvgIcon}
									<DisplayIcon height={20} width={20} />
								{:else}
									<DisplayIcon size={20} />
								{/if}
							{:else}
								<span class="text-sm font-bold">{model.brand[0]}</span>
							{/if}
						</div>
						
						<!-- Model Info -->
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2">
								<span class="font-medium text-sm truncate" style:color={textPrimary}>{model.displayName || model.name}</span>
								{#if model.isRecommended}
									<Star size={14} class="text-yellow-500 fill-yellow-500" />
								{/if}
								{#if isCustom}
									<span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-500 font-medium">Custom</span>
								{:else}
									<span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-500">Built-in</span>
								{/if}
							</div>
							<div class="flex items-center gap-3 text-xs" style:color={textSecondary}>
								<span>{model.brand}</span>
								<span>•</span>
								<span>{model.contextWindow >= 1000000 ? `${(model.contextWindow / 1000000).toFixed(1)}M` : `${(model.contextWindow / 1000).toFixed(0)}K`} context</span>
								<span>•</span>
								<span class="text-green-500">${model.pricePer1M.input.toFixed(2)} / ${model.pricePer1M.output.toFixed(2)} per 1M</span>
								{#if model.supportsImages}
									<span>•</span>
									<Eye size={12} />
								{/if}
								{#if model.supportsImageGeneration}
									<span>•</span>
									<Image size={12} />
								{/if}
							</div>
						</div>
						
						<!-- Actions -->
						<div class="flex items-center gap-1">
							<!-- Recommended Toggle -->
							<button
								class="p-2 rounded-lg transition-colors"
								style:background-color={model.isRecommended ? 'rgba(234, 179, 8, 0.2)' : 'transparent'}
								onclick={() => isCustom && toggleRecommended(model as CustomModel)}
								title={model.isRecommended ? 'Remove from recommended' : 'Add to recommended'}
								disabled={!isCustom}
								class:opacity-50={!isCustom}
							>
								<Star size={16} class={model.isRecommended ? 'text-yellow-500 fill-yellow-500' : ''} color={model.isRecommended ? undefined : textSecondary} />
							</button>
							
							<!-- Auto Mode Toggle -->
							<button
								class="p-2 rounded-lg transition-colors"
								style:background-color={isAutoSelectable ? 'rgba(34, 197, 94, 0.2)' : 'transparent'}
								onclick={() => isCustom && toggleAutoSelectable(model as CustomModel)}
								title={isAutoSelectable ? 'Remove from auto mode' : 'Add to auto mode'}
								disabled={!isCustom}
								class:opacity-50={!isCustom}
							>
								<Sparkles size={16} class={isAutoSelectable ? 'text-green-500' : ''} color={isAutoSelectable ? undefined : textSecondary} />
							</button>
							
							<!-- Hide/Show (built-in only) -->
							{#if !isCustom}
								<button
									class="p-2 rounded-lg hover:bg-gray-500/20 transition-colors"
									onclick={() => toggleModelVisibility(model.id, false)}
									title="Hide model"
								>
									<EyeOff size={16} color={textSecondary} />
								</button>
							{/if}
							
							<!-- Edit (custom only) -->
							{#if isCustom}
								<button
									class="p-2 rounded-lg hover:bg-blue-500/20 transition-colors"
									onclick={() => openEditModal(model as CustomModel)}
									title="Edit model"
								>
									<Edit3 size={16} color={textSecondary} />
								</button>
								
								<!-- Delete -->
								<button
									class="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
									onclick={() => confirmDelete(model as CustomModel)}
									title="Delete model"
								>
									<Trash2 size={16} color={textSecondary} />
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
	
	<!-- Hidden Models Section -->
	{#if hiddenModelsList().length > 0 && filterVisibility !== 'visible'}
		<div class="models-section mt-6">
			<button 
				class="flex items-center gap-2 mb-3 w-full"
				onclick={() => showHiddenModels = !showHiddenModels}
			>
				<EyeOff size={18} color={textSecondary} />
				<h3 class="text-sm font-semibold" style:color={textSecondary}>
					Hidden Models ({hiddenModelsList().length})
				</h3>
				<span class="text-xs ml-auto" style:color={textSecondary}>
					{showHiddenModels ? 'Click to collapse' : 'Click to expand'}
				</span>
			</button>
			
			{#if showHiddenModels}
				<div class="models-list space-y-2 max-h-[300px] overflow-y-auto" style="scrollbar-width: thin;" transition:fade={{ duration: 200 }}>
					{#each hiddenModelsList() as model}
						{@const BrandIcon = getBrandIcon(model.brand)}
						{@const ModelSpecificIcon = modelIcons[model.id]}
						{@const DisplayIcon = ModelSpecificIcon || BrandIcon}
						{@const isSvgIcon = DisplayIcon === DeepSeekLogo || DisplayIcon === PerplexityAILogo || DisplayIcon === XAIGrokLogo || DisplayIcon === KimiLogo || DisplayIcon === QwenLogo || DisplayIcon === GrokLogo}
						
						<div class="model-item flex items-center gap-3 p-3 rounded-lg border opacity-60"
							style:border-color={border}
							style:background-color={inputBg}
						>
							<!-- Brand/Model Icon -->
							<div class="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0 grayscale overflow-hidden"
								style:background-color={getBrandColor(model.brand)}
							>
								{#if DisplayIcon}
									{#if isSvgIcon}
										<DisplayIcon height={20} width={20} />
									{:else}
										<DisplayIcon size={20} />
									{/if}
								{:else}
									<span class="text-sm font-bold">{model.brand[0]}</span>
								{/if}
							</div>
							
							<!-- Model Info -->
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2">
									<span class="font-medium text-sm truncate" style:color={textSecondary}>{model.displayName || model.name}</span>
									<span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-500">Hidden</span>
								</div>
								<div class="flex items-center gap-3 text-xs" style:color={textSecondary}>
									<span>{model.brand}</span>
									<span>•</span>
									<span>{model.contextWindow >= 1000000 ? `${(model.contextWindow / 1000000).toFixed(1)}M` : `${(model.contextWindow / 1000).toFixed(0)}K`} context</span>
								</div>
							</div>
							
							<!-- Show Button -->
							<button
								class="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/20 text-green-500 hover:bg-green-500/30 transition-colors"
								onclick={() => toggleModelVisibility(model.id, true)}
							>
								Show Model
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
	
	{#if filteredModels().length === 0}
		<div class="text-center py-12" style:color={textSecondary}>
			<Package size={48} class="mx-auto mb-4 opacity-50" />
			<p class="text-lg font-medium mb-2">No models found</p>
			<p class="text-sm">Try adjusting your filters or add a custom model</p>
		</div>
	{/if}
	
	<!-- Legend -->
	<div class="flex flex-wrap items-center gap-4 text-xs pt-4 border-t" style:border-color={border} style:color={textSecondary}>
		<div class="flex items-center gap-1">
			<Star size={14} class="text-yellow-500 fill-yellow-500" />
			<span>Recommended</span>
		</div>
		<div class="flex items-center gap-1">
			<Sparkles size={14} class="text-green-500" />
			<span>Auto Mode</span>
		</div>
		<div class="flex items-center gap-1">
			<Eye size={14} />
			<span>Vision</span>
		</div>
		<div class="flex items-center gap-1">
			<Image size={14} />
			<span>Image Gen</span>
		</div>
		<div class="flex items-center gap-1">
			<EyeOff size={14} />
			<span>Hidden</span>
		</div>
	</div>
</div>

<!-- Add/Edit Model Modal -->
{#if showAddModal || showEditModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
		<div class="w-full max-w-2xl rounded-xl border shadow-2xl max-h-[90vh] overflow-y-auto"
			style:background-color={contentBg}
			style:border-color={border}
		>
			<div class="p-6 border-b flex items-center justify-between" style:border-color={border}>
				<h3 class="text-lg font-semibold" style:color={textPrimary}>
					{showEditModal ? 'Edit Model' : 'Add Custom Model'}
				</h3>
				<button 
					class="p-2 rounded-lg hover:bg-gray-500/20 transition-colors"
					onclick={closeModals}
				>
					<X size={20} color={textSecondary} />
				</button>
			</div>
			
			<div class="p-6 space-y-4">
				<!-- Model ID -->
				<div class="setting-group">
					<label for="model-id" class="block text-sm font-medium mb-2" style:color={textPrimary}>Model ID *</label>
					<input
						id="model-id"
						type="text"
						placeholder="e.g., openai/gpt-4-custom"
						class="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-[#4299e1]"
						style:background-color={inputBg}
						style:border-color={border}
						style:color={textPrimary}
						bind:value={formData.id}
						disabled={showEditModal}
					/>
					<p class="text-xs mt-1" style:color={textSecondary}>Format: provider/model-name (cannot be changed later)</p>
				</div>
				
				<!-- Display Name -->
				<div class="setting-group">
					<label for="model-name" class="block text-sm font-medium mb-2" style:color={textPrimary}>Display Name *</label>
					<input
						id="model-name"
						type="text"
						placeholder="e.g., GPT-4 Custom"
						class="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-[#4299e1]"
						style:background-color={inputBg}
						style:border-color={border}
						style:color={textPrimary}
						bind:value={formData.name}
					/>
				</div>
				
				<!-- Brand and Category -->
				<div class="grid grid-cols-2 gap-4">
					<div class="setting-group">
						<label for="model-brand" class="block text-sm font-medium mb-2" style:color={textPrimary}>Brand</label>
						<select
							id="model-brand"
							class="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-[#4299e1]"
							style:background-color={inputBg}
							style:border-color={border}
							style:color={textPrimary}
							bind:value={formData.brand}
						>
							{#each brands as brand}
								<option value={brand}>{brand}</option>
							{/each}
						</select>
					</div>
					
					<div class="setting-group">
						<label for="model-category" class="block text-sm font-medium mb-2" style:color={textPrimary}>Category</label>
						<select
							id="model-category"
							class="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-[#4299e1]"
							style:background-color={inputBg}
							style:border-color={border}
							style:color={textPrimary}
							bind:value={formData.category}
						>
							{#each categories as cat}
								<option value={cat.id}>{cat.name}</option>
							{/each}
						</select>
					</div>
				</div>
				
				<!-- Context Window -->
				<div class="setting-group">
					<label for="model-context" class="block text-sm font-medium mb-2" style:color={textPrimary}>Context Window</label>
					<input
						id="model-context"
						type="number"
						placeholder="128000"
						class="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-[#4299e1]"
						style:background-color={inputBg}
						style:border-color={border}
						style:color={textPrimary}
						bind:value={formData.contextWindow}
					/>
				</div>
				
				<!-- Pricing -->
				<div class="setting-group">
					<span class="block text-sm font-medium mb-2" style:color={textPrimary}>Price per 1M tokens</span>
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="model-price-input" class="text-xs" style:color={textSecondary}>Input</label>
							<div class="relative">
								<DollarSign size={14} class="absolute left-3 top-1/2 -translate-y-1/2" color={textSecondary} />
								<input
									id="model-price-input"
									type="number"
									step="0.01"
									placeholder="0.00"
									class="w-full pl-9 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-[#4299e1]"
									style:background-color={inputBg}
									style:border-color={border}
									style:color={textPrimary}
									value={formData.pricePer1M?.input ?? 0}
									oninput={(e) => formData.pricePer1M = { ...(formData.pricePer1M || { input: 0, output: 0 }), input: parseFloat(e.currentTarget.value) || 0 }}
								/>
							</div>
						</div>
						<div>
							<label for="model-price-output" class="text-xs" style:color={textSecondary}>Output</label>
							<div class="relative">
								<DollarSign size={14} class="absolute left-3 top-1/2 -translate-y-1/2" color={textSecondary} />
								<input
									id="model-price-output"
									type="number"
									step="0.01"
									placeholder="0.00"
									class="w-full pl-9 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-[#4299e1]"
									style:background-color={inputBg}
									style:border-color={border}
									style:color={textPrimary}
									value={formData.pricePer1M?.output ?? 0}
									oninput={(e) => formData.pricePer1M = { ...(formData.pricePer1M || { input: 0, output: 0 }), output: parseFloat(e.currentTarget.value) || 0 }}
								/>
							</div>
						</div>
					</div>
				</div>
				
				<!-- Capabilities -->
				<div class="setting-group">
					<span class="block text-sm font-medium mb-2" style:color={textPrimary}>Capabilities</span>
					<div class="flex flex-wrap gap-2">
						{#each capabilities as cap}
							<button
								class="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
								style:border-color={formData.capabilities?.includes(cap) ? '#4299e1' : border}
								style:background-color={formData.capabilities?.includes(cap) ? 'rgba(66, 153, 225, 0.2)' : inputBg}
								style:color={formData.capabilities?.includes(cap) ? '#4299e1' : textSecondary}
								onclick={() => toggleCapability(cap)}
							>
								{cap}
							</button>
						{/each}
					</div>
				</div>
				
				<!-- Toggles -->
				<div class="grid grid-cols-2 gap-4">
					<label class="flex items-center gap-3 cursor-pointer p-3 rounded-lg border" style:border-color={border}>
						<input
							type="checkbox"
							class="w-5 h-5 rounded"
							bind:checked={formData.supportsImages}
						/>
						<div>
							<div class="text-sm font-medium" style:color={textPrimary}>Vision Support</div>
							<div class="text-xs" style:color={textSecondary}>Can process images</div>
						</div>
					</label>
					
					<label class="flex items-center gap-3 cursor-pointer p-3 rounded-lg border" style:border-color={border}>
						<input
							type="checkbox"
							class="w-5 h-5 rounded"
							bind:checked={formData.supportsImageGeneration}
						/>
						<div>
							<div class="text-sm font-medium" style:color={textPrimary}>Image Generation</div>
							<div class="text-xs" style:color={textSecondary}>Can generate images</div>
						</div>
					</label>
					
					<label class="flex items-center gap-3 cursor-pointer p-3 rounded-lg border" style:border-color={border}>
						<input
							type="checkbox"
							class="w-5 h-5 rounded"
							bind:checked={formData.isRecommended}
						/>
						<div>
							<div class="text-sm font-medium" style:color={textPrimary}>Recommended</div>
							<div class="text-xs" style:color={textSecondary}>Show in recommended tab</div>
						</div>
					</label>
					
					<label class="flex items-center gap-3 cursor-pointer p-3 rounded-lg border" style:border-color={border}>
						<input
							type="checkbox"
							class="w-5 h-5 rounded"
							bind:checked={formData.isAutoSelectable}
						/>
						<div>
							<div class="text-sm font-medium" style:color={textPrimary}>Auto Mode</div>
							<div class="text-xs" style:color={textSecondary}>Available in auto mode</div>
						</div>
					</label>
				</div>
			</div>
			
			<div class="p-6 border-t flex justify-end gap-3" style:border-color={border}>
				<button
					class="px-4 py-2 rounded-lg border text-sm font-medium transition-colors"
					style:border-color={border}
					style:color={textPrimary}
					onclick={closeModals}
				>
					Cancel
				</button>
				<button
					class="px-4 py-2 rounded-lg bg-[#4299e1] text-white text-sm font-medium hover:bg-[#3182ce] transition-colors disabled:opacity-50"
					onclick={handleSave}
					disabled={!formData.id || !formData.name}
				>
					{showEditModal ? 'Save Changes' : 'Add Model'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Confirmation Modal -->
<ConfirmModal
	isOpen={confirmDeleteModalOpen}
	title="Delete Model"
	message="Are you sure you want to delete this custom model? This action cannot be undone."
	confirmLabel="Delete"
	cancelLabel="Cancel"
	variant="danger"
	onConfirm={handleDelete}
	onCancel={() => { confirmDeleteModalOpen = false; modelToDelete = null; }}
/>

<!-- Reset Confirmation Modal -->
<ConfirmModal
	isOpen={confirmResetModalOpen}
	title="Reset All Model Settings"
	message="This will delete all custom models, restore hidden built-in models, and reset all model preferences to defaults. This action cannot be undone."
	confirmLabel="Reset Everything"
	cancelLabel="Cancel"
	variant="danger"
	onConfirm={handleReset}
	onCancel={() => confirmResetModalOpen = false}
/>

<style>
	.stat-card {
		transition: transform 0.2s, box-shadow 0.2s;
	}
	
	.stat-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}
	
	.model-item {
		transition: all 0.2s ease;
	}
	
	.model-item:hover {
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
	}
</style>