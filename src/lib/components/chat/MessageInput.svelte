<script lang="ts">
	import { page } from '$app/stores';
	import { Send, X, Paperclip, Square, Sparkles, FileText, Music, Film, File as FileIcon } from 'lucide-svelte';
	import { chatStore } from '$lib/stores/chatStore';
	import { streamingStore } from '$lib/stores/streamingStore';
	import { uiStore } from '$lib/stores/uiStore';
	import { modelStore, isImageGenerationModel } from '$lib/stores/modelStore';
	import { toastStore } from '$lib/stores/toastStore';
	import { IMAGE_MODELS, getFileTypeCategory, ALL_SUPPORTED_TYPES, MAX_FILE_SIZE } from '$lib/types';
	import ImageModal from '$lib/components/media/ImageModal.svelte';
	
	// Props
	interface Props {
		pendingFiles?: globalThis.File[];
		consumePendingFiles?: () => globalThis.File[];
	}
	
	let { pendingFiles = [], consumePendingFiles }: Props = $props();
	
	let message = $state('');
	let isSubmitting = $state(false);
	let submittingChatId = $state<string | undefined>(undefined);
	let isCreatingNewChat = $state(false);
	let theme = $derived($uiStore.theme);
	let attachedFiles = $state<Array<{ type: 'image' | 'video' | 'document' | 'audio' | 'file'; url: string; name: string; mimeType: string; size: number }>>([]);
	let fileInput: HTMLInputElement | undefined = $state(undefined);
	
	// Get current chat ID from page params or submitting state
	// FIX: Use submittingChatId whenever it's set (not just when isSubmitting is true)
	// This ensures the stop button appears even after isSubmitting becomes false
	// but before the URL updates via replaceState
	let currentChatId = $derived($page.params.id || submittingChatId);
	
	// Reactive streaming state that properly updates when the store changes
	// Use a separate state variable that gets updated via an effect to ensure reactivity
	let isStreamingState = $state(false);
	
	// Effect to sync streaming state from store - this ensures the UI updates immediately
	// when streaming starts/stops, fixing the stop button visibility issue
	$effect(() => {
		if (currentChatId) {
			// Check both the Map and also derive from store to ensure reactivity
			const chatState = $streamingStore.streamingChats.get(currentChatId);
			isStreamingState = chatState?.isStreaming || false;
		} else {
			isStreamingState = false;
		}
	});
	
	// Image modal state
	let selectedImageUrl = $state<string | null>(null);
	let selectedImageAlt = $state('');
	
	// Watch for pending files from parent (drag and drop)
	$effect(() => {
		if (pendingFiles.length > 0 && consumePendingFiles) {
			const files = consumePendingFiles();
			if (files.length > 0) {
				processFiles(files);
			}
		}
	});
	
	// Clear isCreatingNewChat and submittingChatId once URL updates to the new chat
	$effect(() => {
		if (isCreatingNewChat && submittingChatId && $page.params.id === submittingChatId) {
			isCreatingNewChat = false;
			submittingChatId = undefined;
		}
	});

	// Clear flags when navigating away to a different chat or to /chat/new
	// This ensures the send button doesn't stay disabled when switching chats
	$effect(() => {
		const onChatNew = $page.url.pathname === '/chat/new';
		const onDifferentChat = $page.params.id && $page.params.id !== submittingChatId;

		if ((onChatNew || onDifferentChat)) {
			// Always reset these flags when navigating to prevent stuck state
			isCreatingNewChat = false;
			submittingChatId = undefined;
			// CRITICAL: Also reset isSubmitting to prevent permanently disabled send button
			isSubmitting = false;
		}
	});

	// Explicitly clear all generation flags when landing on /chat/new
	// This prevents the stop button from showing and ensures send button is enabled
	$effect(() => {
		if ($page.url.pathname === '/chat/new') {
			isCreatingNewChat = false;
			submittingChatId = undefined;
			isSubmitting = false;
		}
	});
	
	function openImageModal(imageUrl: string, alt: string) {
		selectedImageUrl = imageUrl;
		selectedImageAlt = alt;
	}
	
	function closeImageModal() {
		selectedImageUrl = null;
		selectedImageAlt = '';
	}
	
	// Check if we need to create a new chat (no active chat yet)
	let isNewChat = $derived($page.url.pathname === '/chat/new' && !$chatStore.activeChatId);
	
	// Check if current model supports images
	let selectedModel = $derived($modelStore.selectedModels[0]);
	let autoMode = $derived($modelStore.autoMode);
	let supportsImages = $derived(autoMode || !selectedModel ||
		$modelStore.selectedModels.some(modelId => {
			return IMAGE_MODELS.some(m => modelId?.includes(m));
		})
	);
	
	// Check if current model supports image generation
	let isImageGenModel = $derived(!autoMode && selectedModel && isImageGenerationModel(selectedModel));
	
	async function handleSubmit() {
		if ((!message.trim() && attachedFiles.length === 0) || isSubmitting) return;

		// Allow sending messages even during streaming - each chat has independent state
		// The chatStore handles the per-chat streaming state management
		isSubmitting = true;

		// Mark that we're creating a new chat (only applies when starting from /chat/new)
		// This flag ensures we use submittingChatId only during the creation transition
		if (isNewChat) {
			isCreatingNewChat = true;
		}

		const userMessage = message.trim();
		message = '';
		const files = [...attachedFiles];
		attachedFiles = [];

		// Store the chat ID we're submitting to, so we can check it in finally
		const submissionTargetChatId = submittingChatId;

		try {
			const chatId = await chatStore.sendMessage(
				userMessage,
				files,
				isNewChat,
				// Callback fired immediately when chat is created (for new chats)
				// This ensures submittingChatId is set before streaming starts
				(createdChatId) => {
					submittingChatId = createdChatId;
				}
			);
			// Fallback: if callback wasn't triggered (existing chat), set it here
			if (chatId && !submittingChatId) {
				submittingChatId = chatId;
			}
		} finally {
			// FIX: Only reset isSubmitting if we're still on the same chat
			// This prevents the "permanently disabled send button" issue when
			// navigating to a new chat while a generation is in progress
			const currentPageChatId = $page.params.id;
			const isStillOnSameChat = !currentPageChatId || currentPageChatId === submissionTargetChatId || currentPageChatId === submittingChatId;
			
			if (isStillOnSameChat) {
				isSubmitting = false;
			}
			// If we navigated away, the navigation effect will handle resetting isSubmitting
		}
	}
	
	function handleStopGeneration() {
		chatStore.stopGeneration();
	}
	
	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
			e.preventDefault();
			handleSubmit();
		}
	}
	
	function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files) {
			handleFiles(target.files);
		}
	}
	
	function handleFiles(fileList: FileList) {
		processFiles(Array.from(fileList));
	}
	
	function processFiles(files: globalThis.File[]) {
		for (const file of files) {
			// Check file size
			if (file.size > MAX_FILE_SIZE) {
				toastStore.show(`File ${file.name} is too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`, 'error');
				continue;
			}
			
			// Check if file type is supported
			if (!ALL_SUPPORTED_TYPES.includes(file.type as any) && !file.type.startsWith('image/')) {
				toastStore.show(`File ${file.name} is not a supported format`, 'error');
				continue;
			}
			
			// Check if image but model doesn't support images
			if (file.type.startsWith('image/') && !supportsImages) {
				toastStore.show('Current model does not support images. Switch to a vision-capable model.', 'error');
				continue;
			}
			
			const reader = new FileReader();
			reader.onload = (e) => {
				const result = e.target?.result as string;
				const fileType = getFileTypeCategory(file.type);
				attachedFiles = [...attachedFiles, {
					type: fileType,
					url: result,
					name: file.name,
					mimeType: file.type,
					size: file.size
				}];
			};
			reader.readAsDataURL(file);
		}
		
		if (fileInput) fileInput.value = '';
	}
	

	
	function removeFile(index: number) {
		attachedFiles = attachedFiles.filter((_, i) => i !== index);
	}
	
	function openFilePicker() {
		fileInput?.click();
	}
	
	// Get icon for file type
	function getFileIcon(type: string) {
		switch (type) {
			case 'image': return null; // Images show thumbnail
			case 'video': return Film;
			case 'audio': return Music;
			case 'document': return FileText;
			default: return FileIcon;
		}
	}
	
	// Format file size
	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
	}
	
	let bgColor = $derived(theme === 'light' ? '#f8f9fa' : '#1a1f2e');
	let border = $derived(theme === 'light' ? '#e5e7eb' : '#2d3748');
	let inputBg = $derived(theme === 'light' ? '#ffffff' : '#0f1419');
	let text = $derived(theme === 'light' ? '#1f2937' : '#e2e8f0');
	let placeholder = $derived(theme === 'light' ? '#6b7280' : '#718096');
	let accentColor = $derived(theme === 'light' ? '#3b82f6' : '#4299e1');
</script>

<style>
	textarea::placeholder {
		color: var(--placeholder-color);
	}
</style>

<div class="message-input-container flex-shrink-0 transition-colors duration-200 relative" style:background-color={bgColor} style:border-top="1px solid {border}">
	
	<div class="max-w-4xl mx-auto px-6 py-4">
		<!-- Attached Files Preview -->
		{#if attachedFiles.length > 0}
			<div class="flex flex-wrap gap-2 mb-3">
				{#each attachedFiles as file, index}
					{#if file.type === 'image'}
						<div 
							class="relative group rounded-lg border cursor-pointer hover:border-[#4299e1] transition-colors"
							style:border-color={border}
							onclick={() => openImageModal(file.url, file.name)}
							role="button"
							tabindex="0"
							onkeydown={(e) => e.key === 'Enter' && openImageModal(file.url, file.name)}
						>
							<div class="w-16 h-16 overflow-hidden rounded-lg">
								<img 
									src={file.url} 
									alt={file.name}
									class="w-full h-full object-cover"
								/>
							</div>
							<div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center rounded-lg">
								<span class="text-white opacity-0 group-hover:opacity-100 text-xs font-medium">View</span>
							</div>
							<button
								onclick={(e) => { e.stopPropagation(); removeFile(index); }}
								class="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-md"
							>
								<X size={12} />
							</button>
						</div>
					{:else}
						<div 
							class="relative group flex items-center gap-2 px-3 py-2 rounded-lg border min-w-[120px] max-w-[200px]"
							style:border-color={border}
							style:background-color={inputBg}
						>
							{#if file.type === 'video'}
								<Film size={20} color={accentColor} />
							{:else if file.type === 'audio'}
								<Music size={20} color={accentColor} />
							{:else if file.type === 'document'}
								<FileText size={20} color={accentColor} />
							{:else}
								<FileIcon size={20} color={accentColor} />
							{/if}
							<div class="flex-1 min-w-0">
								<p class="text-xs font-medium truncate" style:color={text}>{file.name}</p>
								<p class="text-[10px] opacity-60" style:color={text}>{formatFileSize(file.size)}</p>
							</div>
							<button
								onclick={() => removeFile(index)}
								class="p-1 rounded-full hover:bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
							>
								<X size={12} />
							</button>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
		
		<div class="relative flex items-stretch gap-3">
			<div class="flex-1 relative">
				<button 
					class="absolute left-4 top-3 p-1 rounded-lg transition-all duration-200 hover:opacity-70 hover:scale-110 active:scale-95 z-10"
					style:color={accentColor}
					onclick={openFilePicker}
					title="Attach files"
				>
					<Paperclip size={18} />
				</button>
				<textarea
					class="w-full pl-12 pr-4 py-3 rounded-xl border resize-none focus:outline-none transition-all duration-200 focus:ring-2 focus:ring-opacity-50"
					style:background-color={inputBg}
					style:border-color={border}
					style:color={text}
					style:--placeholder-color={placeholder}
					style:--tw-ring-color={accentColor}
					placeholder={attachedFiles.length > 0 
						? "Add a message about these files..." 
						: isImageGenModel 
							? "Describe the image you want to generate..." 
							: isStreamingState
								? "Generation in progress in this chat..."
								: "Type your message or drop files here..."}
					rows="1"
					bind:value={message}
					onkeydown={handleKeyDown}
					style="min-height: 48px; max-height: 320px; field-sizing: content;"
				></textarea>
				{#if isImageGenModel}
					<div class="absolute right-3 top-3 flex items-center gap-1 text-xs" style:color={accentColor}>
						<Sparkles size={12} />
						<span>Image Gen</span>
					</div>
				{/if}
			</div>
			{#if isStreamingState}
				<button
					class="flex-shrink-0 w-12 h-12 rounded-lg text-white transition-all duration-300 ease-in-out flex items-center justify-center hover:scale-105 active:scale-95 hover:shadow-lg animate-pulse"
					style:background-color="#ef4444"
					onclick={handleStopGeneration}
					title="Stop generation"
				>
					<Square size={16} fill="currentColor" class="transition-transform duration-200" />
				</button>
			{:else}
				<button
					class="flex-shrink-0 w-12 h-12 rounded-lg text-white transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center hover:scale-105 active:scale-95 hover:shadow-lg"
					style:background-color={accentColor}
					onclick={handleSubmit}
					disabled={(!message.trim() && attachedFiles.length === 0) || isSubmitting}
				>
					<Send size={16} class="transition-transform duration-200 {isSubmitting ? 'animate-pulse' : ''}" />
				</button>
			{/if}
		</div>
		
		<!-- Hidden file input -->
		<input
			bind:this={fileInput}
			type="file"
			accept="{ALL_SUPPORTED_TYPES.join(',')}"
			multiple
			class="hidden"
			onchange={handleFileSelect}
		/>
	</div>
</div>

<!-- Image Modal -->
{#if selectedImageUrl}
	<ImageModal 
		imageUrl={selectedImageUrl} 
		alt={selectedImageAlt}
		onClose={closeImageModal}
	/>
{/if}
