<script lang="ts">
	import { Search, Plus, Settings, BarChart3 } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { uiStore } from '$lib/stores/uiStore';
	import ChatList from './ChatList.svelte';
	import ChatFilters from './ChatFilters.svelte';
	
	let searchQuery = $state('');
	let theme = $derived($uiStore.theme);
	
	async function handleNewChat() {
		// Navigate to /chat/new - UUID will be generated when first message is sent
		goto('/chat/new');
	}
	
	function handleSettings() {
		goto('/settings');
	}
	
	function handleAnalytics() {
		goto('/dashboard');
	}
	
	let textPrimary = $derived(theme === 'light' ? '#1f2937' : '#e2e8f0');
	let textSecondary = $derived(theme === 'light' ? '#6b7280' : '#a0aec0');
	let inputBg = $derived(theme === 'light' ? '#f3f4f6' : '#0f1419');
	let border = $derived(theme === 'light' ? '#e5e7eb' : '#2d3748');
	let hoverBg = $derived(theme === 'light' ? '#f3f4f6' : '#2d3748');
</script>

<aside class="chat-sidebar flex flex-col h-full">
	<div class="sidebar-header flex justify-between items-center px-4 py-4 border-b" style:border-color={border}>
		<div class="flex items-center gap-2">
			<img src="/webaicat128.webp" alt="Logo" class="w-6 h-6 rounded" />
			<h2 class="text-lg font-bold" style:color={textPrimary}>Chats</h2>
		</div>
		<button 
			class="new-chat px-3 py-2 rounded-lg bg-[#4299e1] text-white text-sm font-medium flex items-center gap-2 hover:bg-[#3182ce] transition-colors"
			onclick={handleNewChat}
		>
			<Plus size={16} />
			New
		</button>
	</div>
	
	<div class="sidebar-search px-4 py-3 border-b relative" style:border-color={border}>
		<div class="relative">
			<Search class="absolute left-3 top-1/2 -translate-y-1/2" color={textSecondary} size={16} />
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
	<ChatList {searchQuery} />
	
	<!-- Bottom Navigation -->
	<div class="border-t p-3 space-y-1" style:border-color={border}>
		<button 
			class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm"
			style:color={textSecondary}
			onmouseenter={(e) => { e.currentTarget.style.backgroundColor = hoverBg; e.currentTarget.style.color = textPrimary; }}
			onmouseleave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = textSecondary; }}
			onclick={handleAnalytics}
		>
			<BarChart3 size={18} />
			Analytics
		</button>
		<button 
			class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm"
			style:color={textSecondary}
			onmouseenter={(e) => { e.currentTarget.style.backgroundColor = hoverBg; e.currentTarget.style.color = textPrimary; }}
			onmouseleave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = textSecondary; }}
			onclick={handleSettings}
		>
			<Settings size={18} />
			Settings
		</button>
	</div>
</aside>
