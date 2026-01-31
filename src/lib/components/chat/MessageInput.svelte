<script lang="ts">
	import { page } from '$app/stores';
	import { Send, X, Image, Square, Sparkles } from 'lucide-svelte';
	import { chatStore, isStreaming } from '$lib/stores/chatStore';
	import { uiStore } from '$lib/stores/uiStore';
	import { modelStore, isImageGenerationModel } from '$lib/stores/modelStore';
	import { toastStore } from '$lib/stores/toastStore';
	import { IMAGE_MODELS } from '$lib/types';
	import ImageModal from '$lib/components/media/ImageModal.svelte';
	
	let message = $state('');
	let isSubmitting = $state(false);
	let theme = $derived($uiStore.theme);
	let attachedImages = $state<Array<{ type: 'image'; url: string; name: string }>>([]);
	let fileInput: HTMLInputElement | undefined = $state(undefined);
	let isStreamingState = $derived($isStreaming);
	
	// Image modal state
	let selectedImageUrl = $state<string | null>(null);
	let selectedImageAlt = $state('');
	
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
		if ((!message.trim() && attachedImages.length === 0) || isSubmitting) return;
		
		isSubmitting = true;
		const userMessage = message.trim();
		message = '';
		const images = [...attachedImages];
		attachedImages = [];
		
		try {
			await chatStore.sendMessage(userMessage, images, isNewChat);
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
		const maxSize = 5 * 1024 * 1024; // 5MB
		
		for (let i = 0; i < fileList.length; i++) {
			const file = fileList[i];
			
			if (file.size > maxSize) {
				alert(`File ${file.name} is too large. Maximum size is 5MB`);
				continue;
			}
			
			if (!file.type.startsWith('image/')) {
				alert(`File ${file.name} is not a supported image format`);
				continue;
			}
			
			const reader = new FileReader();
			reader.onload = (e) => {
				const result = e.target?.result as string;
				attachedImages = [...attachedImages, {
					type: 'image',
					url: result,
					name: file.name
				}];
			};
			reader.readAsDataURL(file);
		}
		
		if (fileInput) fileInput.value = '';
	}
	
	function removeImage(index: number) {
		attachedImages = attachedImages.filter((_, i) => i !== index);
	}
	
	function openFilePicker() {
		if (!supportsImages) {
			toastStore.show('Current model does not support images. Switch to a vision-capable model.', 'error');
			return;
		}
		fileInput?.click();
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

<div class="message-input-container flex-shrink-0 transition-colors duration-200" style:background-color={bgColor} style:border-top="1px solid {border}">
	<div class="max-w-4xl mx-auto px-6 py-4">
		<!-- Attached Images Preview -->
		{#if attachedImages.length > 0}
			<div class="flex flex-wrap gap-2 mb-3">
				{#each attachedImages as image, index}
				<div 
					class="relative group rounded-lg border cursor-pointer hover:border-[#4299e1] transition-colors"
					style:border-color={border}
					onclick={() => openImageModal(image.url, image.name)}
					role="button"
					tabindex="0"
					onkeydown={(e) => e.key === 'Enter' && openImageModal(image.url, image.name)}
				>
					<div class="w-16 h-16 overflow-hidden rounded-lg">
						<img 
							src={image.url} 
							alt={image.name}
							class="w-full h-full object-cover"
						/>
					</div>
					<div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center rounded-lg">
						<span class="text-white opacity-0 group-hover:opacity-100 text-xs font-medium">View</span>
					</div>
					<button
						onclick={(e) => { e.stopPropagation(); removeImage(index); }}
						class="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-md"
					>
						<X size={12} />
					</button>
				</div>
				{/each}
			</div>
		{/if}
		
		<div class="relative flex items-stretch gap-3">
			<div class="flex-1 relative">
				<button 
					class="absolute left-4 top-3 p-1 rounded-lg transition-all duration-200 hover:opacity-70 hover:scale-110 active:scale-95 z-10"
					style:color={supportsImages ? accentColor : placeholder}
					onclick={openFilePicker}
					title={supportsImages ? "Attach images" : "Current model doesn't support images"}
				>
					<Image size={18} />
				</button>
				<textarea
					class="w-full pl-12 pr-4 py-3 rounded-xl border resize-none focus:outline-none transition-all duration-200 focus:ring-2 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
					style:background-color={inputBg}
					style:border-color={border}
					style:color={text}
					style:--placeholder-color={placeholder}
					style:--tw-ring-color={accentColor}
					placeholder={attachedImages.length > 0 
						? "Add a message about these images..." 
						: isImageGenModel 
							? "Describe the image you want to generate..." 
							: "Type your message..."}
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
					disabled={(!message.trim() && attachedImages.length === 0) || isSubmitting}
				>
					<Send size={16} class="transition-transform duration-200 {isSubmitting ? 'animate-pulse' : ''}" />
				</button>
			{/if}
		</div>
		
		<!-- Hidden file input -->
		<input
			bind:this={fileInput}
			type="file"
			accept="image/*"
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
