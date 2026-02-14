<script lang="ts">
    import { ChevronDown, Check, Sparkles } from "lucide-svelte";
    import {
        modelStore,
        AVAILABLE_MODELS,
        isPrivacyFocusedModel,
    } from "$lib/stores/modelStore";
    import { settingsStore } from "$lib/stores/settingsStore";
    import { uiStore } from "$lib/stores/uiStore";
    import { chatStore } from "$lib/stores/chatStore";
    import {
        SiOpenai,
        SiAnthropic,
        SiGoogle,
        SiMeta,
        SiMistralai,
        SiClaude,
        SiGooglegemini,
    } from "@icons-pack/svelte-simple-icons";
    import MiniMaxLogo from "$lib/components/icons/MiniMaxLogo.svelte";
    import {
        DeepSeekLogo,
        PerplexityAILogo,
        XAIGrokLogo,
        KimiLogo,
        QwenLogo,
        GrokLogo,
    } from "@selemondev/svgl-svelte";

    let isExpanded = $state(false);
    let selectedBrand = $state<string>("recommended");
    let theme = $derived($uiStore.theme);
    let selectedModels = $derived(new Set($modelStore.selectedModels));
    let autoMode = $derived($modelStore.autoMode);
    let multiModelMode = $derived($modelStore.multiModelMode);
    let zeroDataRetention = $derived($settingsStore.zeroDataRetention);

    // Brand icon mapping
    const brandIcons: Record<string, any> = {
        openai: SiOpenai,
        anthropic: SiAnthropic,
        google: SiGoogle,
        meta: SiMeta,
        mistral: SiMistralai,
        xai: XAIGrokLogo,
        deepseek: DeepSeekLogo,
        perplexity: PerplexityAILogo,
        moonshot: KimiLogo,
        qwen: QwenLogo,
        minimax: MiniMaxLogo,
    };

    // Model-specific icon mapping
    const modelIcons: Record<string, any> = {
        "anthropic/claude-opus-4.5": SiClaude,
        "anthropic/claude-sonnet-4.5": SiClaude,
        "anthropic/claude-haiku-4.5": SiClaude,
        "google/gemini-2.5-flash-lite": SiGooglegemini,
        "google/gemini-3-flash-preview": SiGooglegemini,
        "google/gemini-3-pro-preview": SiGooglegemini,
        "google/gemini-3-pro-image-preview": SiGooglegemini,
        "google/gemini-2.5-flash-image": SiGooglegemini,
        "x-ai/grok-4.1-fast": GrokLogo,
        "perplexity/sonar-pro-search": PerplexityAILogo,
        "qwen/qwen3-vl-235b-a22b-instruct": QwenLogo,
        "moonshotai/kimi-k2": KimiLogo,
        "moonshotai/kimi-k2.5": KimiLogo,
        "deepseek/deepseek-v3.2": DeepSeekLogo,
        "minimax/minimax-m2.1": MiniMaxLogo,
    };

    // Get unique brands
    const uniqueBrands = Array.from(
        new Set(AVAILABLE_MODELS.map((m) => m.brand)),
    );
    const brands = [
        { id: "recommended", name: "Top" },
        ...uniqueBrands
            .sort((a, b) => a.localeCompare(b))
            .map((brand) => ({
                id: brand.toLowerCase(),
                name: brand,
            })),
    ];

    // Sync with chatStore
    $effect(() => {
        if ($modelStore.multiModelMode) {
            chatStore.setMode("manual");
            chatStore.setSelectedModels($modelStore.selectedModels);
        } else if (
            !$modelStore.autoMode &&
            $modelStore.selectedModels.length > 0
        ) {
            chatStore.setMode("manual");
            chatStore.setSelectedModels($modelStore.selectedModels);
        } else {
            chatStore.setMode("auto");
            chatStore.setSelectedModels([]);
        }
    });

    let currentModelName = $derived(() => {
        if ($modelStore.autoMode) {
            return "Auto";
        } else if (
            $modelStore.multiModelMode &&
            $modelStore.selectedModels.length > 0
        ) {
            return `${$modelStore.selectedModels.length} models`;
        } else if ($modelStore.selectedModels.length > 0) {
            const model = AVAILABLE_MODELS.find(
                (m) => m.id === $modelStore.selectedModels[0],
            );
            return model ? model.name : "Select Model";
        }
        return "Select Model";
    });

    // Get current model icon and brand
    let currentModelId = $derived(() => {
        if ($modelStore.autoMode || $modelStore.multiModelMode) return null;
        return $modelStore.selectedModels[0] || null;
    });

    let currentModelBrand = $derived(() => {
        const modelId = currentModelId();
        if (!modelId) return null;
        const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
        return model ? model.brand.toLowerCase() : null;
    });

    let CurrentIcon = $derived(() => {
        const modelId = currentModelId();
        if (!modelId) return null;
        if (modelIcons[modelId]) return modelIcons[modelId];
        const brand = currentModelBrand();
        if (brand && brandIcons[brand]) {
            return brandIcons[brand];
        }
        return null;
    });

    // Filter models
    let models = $derived(() => {
        const allModels = AVAILABLE_MODELS.map((m) => ({
            id: m.id,
            name: m.name,
            brand: m.brand.toLowerCase(),
            recommended: m.category === "general" || m.category === "advanced",
            contextWindow: m.contextWindow,
            price: m.pricePer1M.input + m.pricePer1M.output,
            privacyFocused: isPrivacyFocusedModel(m.id),
        }));

        if (zeroDataRetention) {
            return allModels.filter((m) => m.privacyFocused);
        }
        return allModels;
    });

    let filteredModels = $derived(() => {
        const currentModels = models();
        if (selectedBrand === "recommended") {
            return currentModels.filter((m) => m.recommended);
        }
        return currentModels.filter((m) => m.brand === selectedBrand);
    });

    function selectModel(modelId: string) {
        if ($modelStore.multiModelMode) {
            const currentModels = new Set($modelStore.selectedModels);
            if (currentModels.has(modelId)) {
                currentModels.delete(modelId);
            } else {
                currentModels.add(modelId);
            }
            modelStore.selectMultipleModels(Array.from(currentModels));
        } else {
            modelStore.selectModel(modelId);
            isExpanded = false;
        }
    }

    function selectAuto() {
        modelStore.setAutoMode(true);
        isExpanded = false;
    }

    function toggleMultiModel() {
        modelStore.toggleMultiModelMode();
    }

    function getBrandColor(brand: string) {
        switch (brand) {
            case "openai":
                return "bg-[#10a37f]";
            case "anthropic":
                return "bg-[#d97757]";
            case "google":
                return "bg-[#4285f4]";
            case "xai":
                return theme === "light" ? "bg-[#000000]" : "bg-[#ffffff]";
            case "deepseek":
                return "bg-[#4d6bff]";
            case "meta":
                return "bg-[#0668E1]";
            case "mistral":
                return "bg-[#ff6b00]";
            case "minimax":
                return "bg-[#ff4d4f]";
            case "moonshot":
                return "bg-[#00b96b]";
            default:
                return theme === "light" ? "bg-[#3b82f6]" : "bg-[#4299e1]";
        }
    }

    function isSvgIcon(icon: any) {
        return (
            icon === DeepSeekLogo ||
            icon === PerplexityAILogo ||
            icon === XAIGrokLogo ||
            icon === KimiLogo ||
            icon === QwenLogo ||
            icon === GrokLogo ||
            icon === MiniMaxLogo
        );
    }

    let inputBg = $derived(theme === "light" ? "#f3f4f6" : "#0f1419");
    let bgColor = $derived(theme === "light" ? "#ffffff" : "#0f1419");
    let bgSecondary = $derived(theme === "light" ? "#f3f4f6" : "#1a1f2e");
    let border = $derived(theme === "light" ? "#e5e7eb" : "#2d3748");
    let text = $derived(theme === "light" ? "#1f2937" : "#e2e8f0");
    let textSecondary = $derived(theme === "light" ? "#6b7280" : "#718096");
    let accentColor = $derived(theme === "light" ? "#3b82f6" : "#4299e1");
</script>

<div class="mobile-model-selector">
    <!-- Current Model Display (Matches search bar styling) -->
    <button
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm transition-all"
        style:background-color={$modelStore.autoMode
            ? "rgba(72, 187, 120, 0.1)"
            : inputBg}
        style:border-color={$modelStore.autoMode ? "#48bb78" : border}
        style:color={text}
        onclick={() => (isExpanded = !isExpanded)}
    >
        {#if $modelStore.autoMode}
            <div
                class="w-6 h-6 rounded bg-[#48bb78] flex items-center justify-center flex-shrink-0"
            >
                <span class="text-white text-xs font-bold">A</span>
            </div>
        {:else if $modelStore.multiModelMode}
            <div
                class="w-6 h-6 rounded bg-[#4299e1] flex items-center justify-center flex-shrink-0"
            >
                <Sparkles size={14} class="text-white" />
            </div>
        {:else if CurrentIcon()}
            {@const IconComponent = CurrentIcon()}
            {@const iconColor =
                currentModelBrand() === "xai" && theme === "dark"
                    ? "#000000"
                    : "#ffffff"}
            <div
                class="w-6 h-6 rounded flex items-center justify-center {getBrandColor(
                    currentModelBrand()!,
                )} flex-shrink-0 overflow-hidden"
            >
                {#if isSvgIcon(IconComponent)}
                    <IconComponent height={14} width={14} />
                {:else}
                    <IconComponent size={14} color={iconColor} />
                {/if}
            </div>
        {/if}
        <span class="flex-1 font-medium truncate text-left"
            >{currentModelName()}</span
        >
        <ChevronDown
            size={16}
            class="transition-transform duration-200 flex-shrink-0 {isExpanded
                ? 'rotate-180'
                : ''}"
            color={textSecondary}
        />
    </button>

    <!-- Expanded Model List -->
    {#if isExpanded}
        <div
            class="mt-2 rounded-lg border overflow-hidden animate-slide-down"
            style:background-color={bgColor}
            style:border-color={border}
        >
            <!-- Brand Tabs -->
            <div
                class="flex items-center gap-1 px-2 py-2 overflow-x-auto border-b"
                style:border-color={border}
            >
                {#each brands as brand}
                    <button
                        class="flex-shrink-0 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap"
                        style:background-color={selectedBrand === brand.id
                            ? bgSecondary
                            : "transparent"}
                        style:color={selectedBrand === brand.id
                            ? text
                            : textSecondary}
                        onclick={() => (selectedBrand = brand.id)}
                    >
                        {brand.name}
                    </button>
                {/each}
            </div>

            <!-- Multi-Model Toggle -->
            <div class="p-2 border-b" style:border-color={border}>
                <button
                    class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                    style:background-color={$modelStore.multiModelMode
                        ? accentColor
                        : bgSecondary}
                    style:color={$modelStore.multiModelMode
                        ? "#ffffff"
                        : textSecondary}
                    onclick={toggleMultiModel}
                >
                    <div class="flex items-center gap-2">
                        <Sparkles size={14} />
                        <span>Multi-Model Mode</span>
                    </div>
                    {#if $modelStore.multiModelMode}
                        <Check size={14} />
                    {/if}
                </button>
            </div>

            <!-- Auto Option -->
            {#if !$modelStore.multiModelMode}
                <div class="p-2 border-b" style:border-color={border}>
                    <button
                        class="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left"
                        style:background-color={$modelStore.autoMode
                            ? "rgba(72, 187, 120, 0.15)"
                            : "transparent"}
                        onclick={selectAuto}
                    >
                        <div
                            class="w-6 h-6 rounded bg-[#48bb78] flex items-center justify-center flex-shrink-0"
                        >
                            <span class="text-white text-xs font-bold">A</span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="text-sm font-medium" style:color={text}>
                                Auto
                            </div>
                            <div class="text-xs" style:color={textSecondary}>
                                Best model for your prompt
                            </div>
                        </div>
                        {#if $modelStore.autoMode}
                            <Check
                                size={16}
                                class="text-[#48bb78] flex-shrink-0"
                            />
                        {/if}
                    </button>
                </div>
            {/if}

            <!-- Model List -->
            <div class="max-h-64 overflow-y-auto p-2 space-y-1">
                {#each filteredModels() as model}
                    {@const isSelected = $modelStore.multiModelMode
                        ? selectedModels.has(model.id)
                        : !$modelStore.autoMode &&
                          $modelStore.selectedModels.includes(model.id)}
                    {@const ModelIcon =
                        modelIcons[model.id] || brandIcons[model.brand]}
                    {@const iconColor =
                        model.brand === "xai" && theme === "dark"
                            ? "#000000"
                            : "#ffffff"}
                    <button
                        class="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left border"
                        style:background-color={isSelected
                            ? `${accentColor}15`
                            : "transparent"}
                        style:border-color={isSelected
                            ? accentColor
                            : "transparent"}
                        onclick={() => selectModel(model.id)}
                    >
                        {#if $modelStore.multiModelMode}
                            <div
                                class="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0"
                                style:background-color={selectedModels.has(
                                    model.id,
                                )
                                    ? accentColor
                                    : "transparent"}
                                style:border-color={selectedModels.has(model.id)
                                    ? accentColor
                                    : border}
                            >
                                {#if selectedModels.has(model.id)}
                                    <Check size={12} class="text-white" />
                                {/if}
                            </div>
                        {/if}
                        {#if ModelIcon}
                            <div
                                class="w-6 h-6 rounded {getBrandColor(
                                    model.brand,
                                )} flex items-center justify-center flex-shrink-0 overflow-hidden"
                            >
                                {#if isSvgIcon(ModelIcon)}
                                    <ModelIcon height={14} width={14} />
                                {:else}
                                    <ModelIcon size={14} color={iconColor} />
                                {/if}
                            </div>
                        {/if}
                        <div class="flex-1 min-w-0">
                            <div
                                class="text-sm font-medium truncate"
                                style:color={text}
                            >
                                {model.name}
                            </div>
                            <div
                                class="text-xs flex items-center gap-2"
                                style:color={textSecondary}
                            >
                                <span
                                    >{model.contextWindow >= 1000000
                                        ? `${(model.contextWindow / 1000000).toFixed(1)}M`
                                        : `${(model.contextWindow / 1000).toFixed(0)}K`}</span
                                >
                                <span class="text-[#48bb78]"
                                    >${model.price.toFixed(2)}/1M</span
                                >
                            </div>
                        </div>
                        {#if !$modelStore.multiModelMode && !autoMode && $modelStore.selectedModels.includes(model.id)}
                            <Check
                                size={16}
                                color={accentColor}
                                class="flex-shrink-0"
                            />
                        {/if}
                    </button>
                {/each}
            </div>

            <!-- Done Button for Multi-Model -->
            {#if $modelStore.multiModelMode && selectedModels.size > 0}
                <div class="p-2 border-t" style:border-color={border}>
                    <button
                        class="w-full px-3 py-2 rounded-lg text-white text-sm font-medium transition-colors"
                        style:background-color={accentColor}
                        onclick={() => (isExpanded = false)}
                    >
                        Done ({selectedModels.size} selected)
                    </button>
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    @keyframes slide-down {
        from {
            opacity: 0;
            transform: translateY(-8px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    :global(.animate-slide-down) {
        animation: slide-down 0.2s ease-out;
    }
</style>
