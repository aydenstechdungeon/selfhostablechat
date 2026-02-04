<script lang="ts">
	import {
		Search,
		Plus,
		Settings,
		BarChart3,
		Loader2,
		MessageSquare,
	} from "lucide-svelte";
	import { goto } from "$app/navigation";
	import { uiStore } from "$lib/stores/uiStore";
	import { chatStore } from "$lib/stores/chatStore";
	import { streamingStore } from "$lib/stores/streamingStore";
	import ChatList from "./ChatList.svelte";
	import ChatFilters from "./ChatFilters.svelte";
	import MobileModelSelector from "./MobileModelSelector.svelte";

	let { collapsed = false } = $props();

	let searchQuery = $state("");
	let theme = $derived($uiStore.theme);

	// Track active generating chats for global indicator
	let activeStreamCount = $derived(
		Array.from($streamingStore.streamingChats.values()).filter(
			(s) => s.isStreaming,
		).length,
	);

	async function handleNewChat() {
		// Soft reset preserves any ongoing generation in other chats
		// This allows multitasking - creating new chats while others generate
		chatStore.reset();
		streamingStore.setActiveChat(null);
		// Navigate to /chat/new - UUID will be generated when first message is sent
		goto("/chat/new");
	}

	function handleSettings() {
		goto("/settings");
	}

	function handleAnalytics() {
		goto("/dashboard");
	}

	let textPrimary = $derived(theme === "light" ? "#1f2937" : "#e2e8f0");
	let textSecondary = $derived(theme === "light" ? "#6b7280" : "#a0aec0");
	let inputBg = $derived(theme === "light" ? "#f3f4f6" : "#0f1419");
	let border = $derived(theme === "light" ? "#e5e7eb" : "#2d3748");
	let hoverBg = $derived(theme === "light" ? "#f3f4f6" : "#2d3748");
</script>

<aside class="chat-sidebar flex flex-col h-full" class:collapsed>
	<div
		class="sidebar-header flex justify-between items-center px-4 py-4 border-b"
		style:border-color={border}
		class:justify-center={collapsed}
		class:px-2={collapsed}
	>
		{#if !collapsed}
			<div class="flex items-center gap-2">
				<enhanced:img
					src="/webaicat128.webp"
					alt="Logo"
					class="w-6 h-6 rounded"
				/>
				<h2 class="text-lg font-bold" style:color={textPrimary}>
					Chats
				</h2>
				{#if activeStreamCount > 0}
					<span
						class="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-500"
						title="{activeStreamCount} chat{activeStreamCount > 1
							? 's'
							: ''} generating"
					>
						<Loader2 size={12} class="animate-spin" />
						{activeStreamCount}
					</span>
				{/if}
			</div>
			<button
				class="new-chat px-3 py-2 rounded-lg bg-[#4299e1] text-white text-sm font-medium flex items-center gap-2 hover:bg-[#3182ce] transition-colors"
				onclick={handleNewChat}
			>
				<Plus size={16} />
				New
			</button>
		{:else}
			<button
				class="new-chat w-10 h-10 rounded-lg bg-[#4299e1] text-white flex items-center justify-center hover:bg-[#3182ce] transition-colors"
				onclick={handleNewChat}
				title="New Chat"
			>
				<Plus size={20} />
			</button>
		{/if}
	</div>

	{#if !collapsed}
		<!-- Model Selector - Mobile Only -->
		<div class="px-4 py-3 border-b md:hidden" style:border-color={border}>
			<MobileModelSelector />
		</div>

		<!-- Search Bar -->
		<div
			class="sidebar-search px-4 py-3 border-b relative"
			style:border-color={border}
		>
			<div class="relative">
				<Search
					class="absolute left-3 top-1/2 -translate-y-1/2"
					color={textSecondary}
					size={16}
				/>
				<input
					type="text"
					class="search-input w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm focus:border-[#4299e1] focus:outline-none"
					style:background-color={inputBg}
					style:border-color={border}
					style:color={textPrimary}
					placeholder="Search chats..."
					bind:value={searchQuery}
				/>
			</div>
		</div>

		<ChatFilters />
	{/if}

	<ChatList {searchQuery} {collapsed} />

	<!-- Bottom Navigation -->
	<div
		class="border-t p-3 space-y-1"
		style:border-color={border}
		class:p-2={collapsed}
	>
		<button
			class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm"
			class:justify-center={collapsed}
			class:px-0={collapsed}
			style:color={textSecondary}
			onmouseenter={(e) => {
				e.currentTarget.style.backgroundColor = hoverBg;
				e.currentTarget.style.color = textPrimary;
			}}
			onmouseleave={(e) => {
				e.currentTarget.style.backgroundColor = "transparent";
				e.currentTarget.style.color = textSecondary;
			}}
			onclick={handleAnalytics}
			title={collapsed ? "Analytics" : ""}
		>
			<BarChart3 size={collapsed ? 20 : 18} />
			{#if !collapsed}
				Analytics
			{/if}
		</button>
		<button
			class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm"
			class:justify-center={collapsed}
			class:px-0={collapsed}
			style:color={textSecondary}
			onmouseenter={(e) => {
				e.currentTarget.style.backgroundColor = hoverBg;
				e.currentTarget.style.color = textPrimary;
			}}
			onmouseleave={(e) => {
				e.currentTarget.style.backgroundColor = "transparent";
				e.currentTarget.style.color = textSecondary;
			}}
			onclick={handleSettings}
			title={collapsed ? "Settings" : ""}
		>
			<Settings size={collapsed ? 20 : 18} />
			{#if !collapsed}
				Settings
			{/if}
		</button>
	</div>
</aside>
