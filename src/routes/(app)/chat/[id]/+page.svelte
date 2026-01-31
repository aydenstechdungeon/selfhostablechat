<script lang="ts">
	import { page } from '$app/stores';
	import ChatHeader from '$lib/components/chat/ChatHeader.svelte';
	import MessageList from '$lib/components/chat/MessageList.svelte';
	import MessageInput from '$lib/components/chat/MessageInput.svelte';
	import StatsModal from '$lib/components/chat/StatsModal.svelte';
	import { chatStore } from '$lib/stores/chatStore';
	import { chatDB } from '$lib/stores/indexedDB';
	import { apiKeyStore } from '$lib/stores/apiKeyStore';
	import { uiStore } from '$lib/stores/uiStore';
	import { goto } from '$app/navigation';
	import { AlertTriangle } from 'lucide-svelte';
	
	let chatId = $derived($page.params.id);
	let hasApiKey = $derived(!!$apiKeyStore.apiKey);
	let theme = $derived($uiStore.theme);
	
	// Reactive effect to load chat when chatId changes
	$effect(() => {
		if (chatId) {
			loadChat(chatId);
		}
	});
	
	async function loadChat(id: string) {
		// Check if chat exists in IndexedDB
		const chat = await chatDB.getChat(id);
		if (chat) {
			// Load existing chat
			await chatStore.loadChat(id);
		} else {
			// Create new chat
			await chatStore.createChat(id, 'New Chat');
			chatStore.setActiveChat(id);
		}
	}
	
	function goToSettings() {
		goto('/settings');
	}
	
	let bgSecondary = $derived(theme === 'light' ? '#f8f9fa' : '#1a1f2e');
	let textPrimary = $derived(theme === 'light' ? '#1f2937' : '#e2e8f0');
	let textSecondary = $derived(theme === 'light' ? '#6b7280' : '#a0aec0');
	let borderColor = $derived(theme === 'light' ? '#e5e7eb' : '#2d3748');
	let alertColor = $derived(theme === 'light' ? '#f59e0b' : '#f59e0b');
</script>

<div class="chat-page flex flex-col h-full overflow-hidden">
	{#if !hasApiKey}
		<div class="api-key-banner px-4 py-3 border-b" style:background-color={bgSecondary} style:border-color={borderColor}>
			<div class="flex items-center justify-between max-w-4xl mx-auto">
				<div class="flex items-center gap-3">
					<AlertTriangle size={20} color={alertColor} />
					<div>
						<p class="text-sm font-medium" style:color={textPrimary}>API Key Required</p>
						<p class="text-xs" style:color={textSecondary}>Please configure your API key to start chatting</p>
					</div>
				</div>
				<button 
					onclick={goToSettings}
					class="px-4 py-2 rounded-lg bg-[#4299e1] text-white text-sm font-medium hover:bg-[#3182ce] transition-colors"
				>
					Add API Key
				</button>
			</div>
		</div>
	{/if}
	<ChatHeader />
	<MessageList />
	<MessageInput />
	<StatsModal />
</div>
