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
	let theme = $derived($uiStore.theme);
	let attachedFiles = $state<Array<{ type: 'image' | 'video' | 'document' | 'audio' | 'file'; url: string; name: string; mimeType: string; size: number }>>([]);
	let fileInput: HTMLInputElement | undefined = $state(undefined);
	
	// Get current chat ID from page params only
	// Don't use activeChatId from store to avoid conflicts with background generating chats
	// When on /chat/new, currentChatId should be undefined (no chat yet)
	let currentChatId = $derived($page.params.id);
	
	// Use conversation-level streaming state instead of global lock
	// This allows inputs in other chats to remain functional during generation
	// For new chats (/chat/new), always allow input - no global lock
	// For existing chats, only lock if THIS specific chat is generating
	let isStreamingState = $derived(
		currentChatId
			? ($streamingStore.streamingChats.get(currentChatId)?.isStreaming || false)
			: false
	);
	
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
		
		isSubmitting = true;
		const userMessage = message.trim();
		message = '';
		const files = [...attachedFiles];
		attachedFiles = [];
		
		try {
			await chatStore.sendMessage(userMessage, files, isNewChat);
		} finally {
			isSubmitting = false;
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
					class="w-full pl-12 pr-4 py-3 rounded-xl border resize-none focus:outline-none transition-all duration-200 focus:ring-2 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
					style:background-color={inputBg}
					style:border-color={border}
					style:color={text}
					style:--placeholder-color={placeholder}
					style:--tw-ring-color={accentColor}
					placeholder={attachedFiles.length > 0 
						? "Add a message about these files..." 
						: isImageGenModel 
							? "Describe the image you want to generate..." 
							: "Type your message or drop files here..."}
					rows="1"
					bind:value={message}
					onkeydown={handleKeyDown}
					disabled={isStreamingState}
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
