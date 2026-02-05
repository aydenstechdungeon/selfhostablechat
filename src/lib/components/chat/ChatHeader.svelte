<script lang="ts">
	import { page } from "$app/stores";
	import {
		Menu,
		MoreVertical,
		Trash2,
		Download,
		Share2,
		Sun,
		Moon,
	} from "lucide-svelte";
	import { uiStore } from "$lib/stores/uiStore";
	import { chatStore } from "$lib/stores/chatStore";
	import { chatDB } from "$lib/stores/indexedDB";
	import ModelSelector from "$lib/components/model-selector/ModelSelector.svelte";
	import { onMount } from "svelte";

	let chatTitle = $state("New Chat");
	let isEditingTitle = $state(false);
	let menuOpen = $state(false);
	let theme = $derived($uiStore.theme);
	let activeChatId = $derived($chatStore.activeChatId);

	// Load chat title when active chat changes or when on /chat/new
	$effect(() => {
		// If we're on /chat/new, always show "New Chat"
		if ($page.url.pathname === "/chat/new") {
			chatTitle = "New Chat";
		} else if (activeChatId) {
			loadChatTitle(activeChatId);
		} else {
			chatTitle = "New Chat";
		}
	});

	// Listen for chat updates (e.g., when AI generates summary)
	onMount(() => {
		const handleChatUpdate = () => {
			if (activeChatId) {
				loadChatTitle(activeChatId);
			}
		};
		window.addEventListener("chat-updated", handleChatUpdate);
		return () =>
			window.removeEventListener("chat-updated", handleChatUpdate);
	});

	async function loadChatTitle(chatId: string) {
		try {
			const chat = await chatDB.getChat(chatId);
			if (chat) {
				chatTitle = chat.title || "New Chat";
			}
		} catch (error) {
			console.error("Failed to load chat title:", error);
		}
	}

	async function saveChatTitle() {
		if (!activeChatId) return;

		try {
			const chat = await chatDB.getChat(activeChatId);
			if (chat) {
				const updatedChat = {
					...chat,
					title: chatTitle,
					updatedAt: new Date(),
				};
				await chatDB.saveChat(updatedChat);
				// Dispatch event to update sidebar
				if (typeof window !== "undefined") {
					window.dispatchEvent(new CustomEvent("chat-updated"));
				}
			}
		} catch (error) {
			console.error("Failed to save chat title:", error);
		}
		isEditingTitle = false;
	}

	function handleTitleKeydown(e: KeyboardEvent) {
		if (e.key === "Enter") {
			saveChatTitle();
		}
	}

	function toggleTheme() {
		uiStore.setTheme(theme === "light" ? "dark" : "light");
		menuOpen = false;
	}
</script>

<header
	class="chat-header relative flex items-center h-14 md:h-16 px-3 md:px-6 flex-shrink-0 transition-colors duration-200 z-50"
	style:background-color={theme === "light" ? "#f8f9fa" : "#1a1f2e"}
	style:border-bottom="1px solid {theme === 'light' ? '#e5e7eb' : '#2d3748'}"
>
	<div class="header-left flex items-center gap-2 md:gap-4 flex-1 min-w-0">
		<button
			class="sidebar-toggle p-2 md:p-1 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
			style:color={theme === "light" ? "#1f2937" : "#e2e8f0"}
			style:hover:background-color={theme === "light"
				? "#e5e7eb"
				: "#2d3748"}
			onclick={() => {
				if (window.innerWidth < 768) {
					uiStore.toggleMobileMenu();
				} else {
					uiStore.toggleLeftSidebar();
				}
			}}
		>
			<Menu size={20} />
		</button>

		{#if isEditingTitle}
			<input
				type="text"
				class="chat-title px-2 md:px-3 py-1.5 text-sm md:text-base font-semibold bg-transparent rounded-md focus:outline-none max-w-[26vw] transition-colors min-w-0 flex-1"
				style:color={theme === "light" ? "#1f2937" : "#e2e8f0"}
				style:border="1px solid {theme === 'light'
					? '#d1d5db'
					: '#4a5568'}"
				style:focus:border-color={theme === "light"
					? "#3b82f6"
					: "#4299e1"}
				bind:value={chatTitle}
				onblur={saveChatTitle}
				onkeydown={handleTitleKeydown}
			/>
		{:else}
			<button
				class="chat-title text-sm md:text-base font-semibold transition-colors text-left overflow-hidden whitespace-nowrap min-w-0 max-w-[26vw] flex-1"
				style:color={theme === "light" ? "#1f2937" : "#e2e8f0"}
				style:hover:color={theme === "light" ? "#3b82f6" : "#4299e1"}
				style:text-overflow="ellipsis"
				onclick={() => (isEditingTitle = true)}
			>
				{chatTitle}
			</button>
		{/if}
	</div>

	<div
		class="header-center absolute left-1/2 -translate-x-1/2 hidden md:flex"
	>
		<ModelSelector />
	</div>

	<div
		class="header-right flex items-center gap-2 relative flex-1 justify-end"
	>
		<button
			class="p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
			style:color={theme === "light" ? "#1f2937" : "#e2e8f0"}
			style:hover:background-color={theme === "light"
				? "#e5e7eb"
				: "#2d3748"}
			onclick={() => (menuOpen = !menuOpen)}
		>
			<MoreVertical size={20} />
		</button>

		{#if menuOpen}
			<div
				class="absolute top-full right-0 mt-2 w-48 rounded-xl shadow-2xl overflow-hidden z-50 animate-scale-in origin-top-right"
				style:background-color={theme === "light"
					? "#ffffff"
					: "#1a1f2e"}
				style:border="1px solid {theme === 'light'
					? '#e5e7eb'
					: '#2d3748'}"
			>
				<div class="py-1">
					<button
						class="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-200 hover:translate-x-1"
						style:color={theme === "light" ? "#1f2937" : "#e2e8f0"}
						style:hover:background-color={theme === "light"
							? "#f3f4f6"
							: "#2d3748"}
						onclick={toggleTheme}
					>
						{#if theme === "light"}
							<Moon size={16} color="#6b7280" />
							Dark Mode
						{:else}
							<Sun size={16} color="#a0aec0" />
							Light Mode
						{/if}
					</button>
					<div
						style:border-top="1px solid {theme === 'light'
							? '#e5e7eb'
							: '#2d3748'}"
						class="my-1"
					></div>
					<button
						class="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-200 hover:translate-x-1"
						style:color={theme === "light" ? "#1f2937" : "#e2e8f0"}
						style:hover:background-color={theme === "light"
							? "#f3f4f6"
							: "#2d3748"}
					>
						<Share2
							size={16}
							color={theme === "light" ? "#6b7280" : "#a0aec0"}
						/>
						Share Chat
					</button>
					<button
						class="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-200 hover:translate-x-1"
						style:color={theme === "light" ? "#1f2937" : "#e2e8f0"}
						style:hover:background-color={theme === "light"
							? "#f3f4f6"
							: "#2d3748"}
					>
						<Download
							size={16}
							color={theme === "light" ? "#6b7280" : "#a0aec0"}
						/>
						Export Chat
					</button>
					<div
						style:border-top="1px solid {theme === 'light'
							? '#e5e7eb'
							: '#2d3748'}"
						class="my-1"
					></div>
					<button
						class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#f56565] transition-all duration-200 hover:translate-x-1"
						style:hover:background-color={theme === "light"
							? "#f3f4f6"
							: "#2d3748"}
					>
						<Trash2 size={16} />
						Delete Chat
					</button>
				</div>
			</div>
		{/if}
	</div>
</header>

<svelte:window
	onclick={(e) => {
		if (
			e.target instanceof HTMLElement &&
			!e.target.closest(".header-right")
		) {
			menuOpen = false;
		}
	}}
/>
