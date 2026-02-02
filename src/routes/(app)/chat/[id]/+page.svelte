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
	import { streamingStore } from '$lib/stores/streamingStore';
	import { goto } from '$app/navigation';
	import { AlertTriangle, Upload } from 'lucide-svelte';
	import { MAX_FILE_SIZE, ALL_SUPPORTED_TYPES } from '$lib/types';
	import { toastStore } from '$lib/stores/toastStore';
	
	let chatId = $derived($page.params.id);
	let hasApiKey = $derived(!!$apiKeyStore.apiKey);
	let theme = $derived($uiStore.theme);
	
	// Drag and drop state
	let isDragging = $state(false);
	let dragCounter = $state(0);
	
	// Files being processed for drag and drop
	let pendingFiles: globalThis.File[] = $state([]);
	
	// Reactive effect to load chat when chatId changes
	$effect(() => {
		if (chatId) {
			loadChat(chatId);
			streamingStore.setActiveChat(chatId);
		}
	});

	// Ensure streaming state is synced when mounting a chat that's already generating
	// This fixes the issue where stop button doesn't show initially
	$effect(() => {
		if (chatId && streamingStore.isChatStreaming(chatId)) {
			streamingStore.setActiveChat(chatId);
		}
	});
	
	async function loadChat(id: string) {
		// Check if chat exists in IndexedDB
		const chat = await chatDB.getChat(id);
		if (chat) {
			// Load existing chat - loadChat sets activeChatId and preserves streaming state
			await chatStore.loadChat(id);
		} else {
			// Create new chat - createChat doesn't set active, so we set it
			await chatStore.createChat(id, 'New Chat');
			// Use setActiveChat which now preserves streaming state if this chat is generating
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
	
	// Drag and drop handlers
	function handleDragEnter(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		dragCounter++;
		if (e.dataTransfer?.types.includes('Files')) {
			isDragging = true;
		}
	}
	
	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		dragCounter--;
		if (dragCounter === 0) {
			isDragging = false;
		}
	}
	
	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'copy';
		}
	}
	
	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		dragCounter = 0;
		isDragging = false;
		
		const files = e.dataTransfer?.files;
		if (!files || files.length === 0) return;
		
		await processFiles(Array.from(files));
	}
	
	async function processFiles(files: globalThis.File[]) {
		const validFiles: globalThis.File[] = [];
		const errors: string[] = [];
		
		for (const file of files) {
			// Check file type
			if (!ALL_SUPPORTED_TYPES.includes(file.type as any)) {
				errors.push(`${file.name}: Unsupported file type`);
				continue;
			}
			
			// Check file size
			if (file.size > MAX_FILE_SIZE) {
				errors.push(`${file.name}: File too large (max ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB)`);
				continue;
			}
			
			validFiles.push(file);
		}
		
		if (errors.length > 0) {
			toastStore.show(errors.join('\n'), 'error');
		}
		
		if (validFiles.length > 0) {
			// Store files to be picked up by MessageInput
			pendingFiles = validFiles;
		}
	}
	
	// Global drag events for window
	$effect(() => {
		const handleWindowDragEnter = (e: DragEvent) => {
			if (e.dataTransfer?.types.includes('Files')) {
				dragCounter = 1;
				isDragging = true;
			}
		};
		
		const handleWindowDragLeave = (e: DragEvent) => {
			if (e.clientX === 0 && e.clientY === 0) {
				dragCounter = 0;
				isDragging = false;
			}
		};
		
		const handleWindowDrop = () => {
			dragCounter = 0;
			isDragging = false;
		};
		
		window.addEventListener('dragenter', handleWindowDragEnter);
		window.addEventListener('dragleave', handleWindowDragLeave);
		window.addEventListener('drop', handleWindowDrop);
		
		return () => {
			window.removeEventListener('dragenter', handleWindowDragEnter);
			window.removeEventListener('dragleave', handleWindowDragLeave);
			window.removeEventListener('drop', handleWindowDrop);
		};
	});
	
	// Clear pending files after they've been consumed
	export function consumePendingFiles(): globalThis.File[] {
		const files = [...pendingFiles];
		pendingFiles = [];
		return files;
	}
</script>

<div
	class="chat-page flex flex-col h-full overflow-hidden relative"
	ondragenter={handleDragEnter}
	ondragleave={handleDragLeave}
	ondragover={handleDragOver}
	ondrop={handleDrop}
	role="region"
	aria-label="Chat message area with file drop support"
>
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
	<MessageInput {pendingFiles} {consumePendingFiles} />
	<StatsModal />
	
	<!-- Full-page drag and drop overlay -->
	{#if isDragging}
		<div 
			class="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
			style:background-color={theme === 'light' ? 'rgba(66, 153, 225, 0.15)' : 'rgba(66, 153, 225, 0.25)'}
		>
			<div 
				class="flex flex-col items-center gap-4 p-12 rounded-2xl border-4 border-dashed transform scale-110"
				style:background-color={theme === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(26, 31, 46, 0.95)'}
				style:border-color="#4299e1"
			>
				<div 
					class="p-6 rounded-full"
					style:background-color="rgba(66, 153, 225, 0.2)"
				>
					<Upload size={64} color="#4299e1" />
				</div>
				<p class="text-2xl font-semibold" style:color={theme === 'light' ? '#1f2937' : '#e2e8f0'}>
					Drop files here
				</p>
				<p class="text-sm opacity-70" style:color={theme === 'light' ? '#6b7280' : '#a0aec0'}>
					Images, documents, audio, and video files supported
				</p>
			</div>
		</div>
	{/if}
</div>
