<script lang="ts">
	import { X, ZoomIn, ZoomOut, Download } from 'lucide-svelte';
	import { uiStore } from '$lib/stores/uiStore';
	
	interface Props {
		imageUrl: string;
		alt?: string;
		onClose: () => void;
	}
	
	let { imageUrl, alt = 'Image', onClose }: Props = $props();
	
	let scale = $state(1);
	let isLoading = $state(true);
	let theme = $derived($uiStore.theme);
	
	let bgColor = $derived(theme === 'light' ? 'rgba(0, 0, 0, 0.9)' : 'rgba(0, 0, 0, 0.95)');
	
	function zoomIn() {
		scale = Math.min(scale + 0.25, 3);
	}
	
	function zoomOut() {
		scale = Math.max(scale - 0.25, 0.5);
	}
	
	function resetZoom() {
		scale = 1;
	}
	
	async function downloadImage() {
		try {
			// Handle base64 data URLs directly
			if (imageUrl.startsWith('data:')) {
				const a = document.createElement('a');
				a.href = imageUrl;
				// Extract mime type to determine extension
				const mimeMatch = imageUrl.match(/data:image\/(\w+);/);
				const ext = mimeMatch ? mimeMatch[1] : 'png';
				a.download = alt.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.' + ext;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				return;
			}
			
			// For regular URLs, fetch and download
			const response = await fetch(imageUrl);
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = alt.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.png';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Failed to download image:', error);
			// Fallback: try to open image in new tab
			window.open(imageUrl, '_blank');
		}
	}
	
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		} else if (e.key === '+' || e.key === '=') {
			zoomIn();
		} else if (e.key === '-') {
			zoomOut();
		} else if (e.key === '0') {
			resetZoom();
		}
	}
	
	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div 
	class="image-modal fixed inset-0 z-[9999] flex items-center justify-center"
	style:background-color={bgColor}
	onclick={handleBackdropClick}
	onkeydown={handleKeydown}
	role="dialog"
	aria-modal="true"
	aria-label="Image viewer"
	tabindex="-1"
>
	<!-- Close button -->
	<button
		class="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
		onclick={onClose}
		aria-label="Close"
	>
		<X size={24} class="text-white" />
	</button>
	
	<!-- Controls -->
	<div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 rounded-full bg-white/10 backdrop-blur-sm">
		<button
			class="p-2 rounded-full hover:bg-white/20 transition-colors"
			onclick={zoomOut}
			disabled={scale <= 0.5}
			aria-label="Zoom out"
			title="Zoom out (-)"
		>
			<ZoomOut size={20} class="text-white {scale <= 0.5 ? 'opacity-50' : ''}" />
		</button>
		<span class="text-white text-sm min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
		<button
			class="p-2 rounded-full hover:bg-white/20 transition-colors"
			onclick={zoomIn}
			disabled={scale >= 3}
			aria-label="Zoom in"
			title="Zoom in (+)"
		>
			<ZoomIn size={20} class="text-white {scale >= 3 ? 'opacity-50' : ''}" />
		</button>
		<div class="w-px h-6 bg-white/20 mx-1"></div>
		<button
			class="p-2 rounded-full hover:bg-white/20 transition-colors"
			onclick={downloadImage}
			aria-label="Download image"
			title="Download"
		>
			<Download size={20} class="text-white" />
		</button>
	</div>
	
	<!-- Image container -->
	<div class="relative max-w-[90vw] max-h-[90vh] overflow-hidden">
		{#if isLoading}
			<div class="absolute inset-0 flex items-center justify-center">
				<div class="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
			</div>
		{/if}
		<img
			src={imageUrl}
			{alt}
			class="max-w-full max-h-[80vh] object-contain transition-transform duration-200 ease-out cursor-grab active:cursor-grabbing"
			style:transform="scale({scale})"
			onload={() => isLoading = false}
			onerror={() => isLoading = false}
			draggable={false}
		/>
	</div>
	
	<!-- Instructions -->
	<div class="absolute top-4 left-4 text-white/50 text-xs">
		<p>ESC to close • +/- to zoom • 0 to reset</p>
	</div>
</div>

<style>
	.image-modal {
		animation: fade-in 0.2s ease-out;
	}
	
	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	
	:global(.image-modal img) {
		-webkit-user-drag: none;
		user-select: none;
	}
</style>
