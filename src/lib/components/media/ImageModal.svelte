<script lang="ts">
	import { X, ZoomIn, ZoomOut, Download, ImagePlus, RefreshCw } from 'lucide-svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { toastStore } from '$lib/stores/toastStore';
	import { convertImage, detectImageFormat, formatImageSize, getDataUrlSize, type ImageFormat } from '$lib/utils/imageConversion';
	import { IMAGE_CONVERSION_FORMATS } from '$lib/types';
	import { onClickOutside, useKeyboardShortcut } from '$lib/utils/runed-helpers.svelte';
	
	interface Props {
		imageUrl: string;
		alt?: string;
		onClose: () => void;
	}
	
	let { imageUrl, alt = 'Image', onClose }: Props = $props();
	
	let scale = $state(1);
	let isLoading = $state(true);
	let theme = $derived(ui.current.theme);
	
	// Conversion state
	let showConversionPanel = $state(false);
	let isConverting = $state(false);
	let selectedFormat = $state<ImageFormat>('png');
	let quality = $state(92);
	let convertedUrl = $state<string | null>(null);
	let originalSize = $state(0);
	let convertedSize = $state(0);
	let modalContent = $state<HTMLElement | null>(null);
	let conversionPanel = $state<HTMLElement | null>(null);
	
	let bgColor = $derived(theme === 'light' ? 'rgba(0, 0, 0, 0.9)' : 'rgba(0, 0, 0, 0.95)');
	let panelBg = $derived(theme === 'light' ? '#ffffff' : '#1a1f2e');
	let panelText = $derived(theme === 'light' ? '#1f2937' : '#e2e8f0');
	let panelBorder = $derived(theme === 'light' ? '#e5e7eb' : '#2d3748');
	
	// Get current format
	let currentFormat = $derived(detectImageFormat(imageUrl));
	
	// Initialize original size
	$effect(() => {
		originalSize = getDataUrlSize(imageUrl);
	});
	
	function zoomIn() {
		scale = Math.min(scale + 0.25, 3);
	}
	
	function zoomOut() {
		scale = Math.max(scale - 0.25, 0.5);
	}
	
	function resetZoom() {
		scale = 1;
	}
	
	async function downloadImage(url: string = imageUrl, format?: string) {
		try {
			// Handle base64 data URLs directly
			if (url.startsWith('data:')) {
				const a = document.createElement('a');
				a.href = url;
				// Extract mime type to determine extension
				const mimeMatch = url.match(/data:image\/(\w+);/);
				const ext = format || (mimeMatch ? mimeMatch[1] : 'png');
				a.download = alt.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.' + ext;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				return;
			}
			
			// For regular URLs, fetch and download
			const response = await fetch(url);
			const blob = await response.blob();
			const blobUrl = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = blobUrl;
			a.download = alt.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.' + (format || 'png');
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(blobUrl);
		} catch (error) {
			console.error('Failed to download image:', error);
			toastStore.show('Failed to download image', 'error');
		}
	}
	
	async function handleConvert() {
		if (selectedFormat === currentFormat) {
			toastStore.show('Image is already in this format', 'info');
			return;
		}
		
		isConverting = true;
		try {
			const result = await convertImage(imageUrl, selectedFormat, {
				quality: quality / 100,
				preserveAspectRatio: true
			});
			convertedUrl = result;
			convertedSize = getDataUrlSize(result);
			toastStore.show(`Image converted to ${selectedFormat.toUpperCase()}`, 'success');
		} catch (error) {
			console.error('Conversion failed:', error);
			toastStore.show('Failed to convert image', 'error');
		} finally {
			isConverting = false;
		}
	}
	
	function downloadConverted() {
		if (convertedUrl) {
			downloadImage(convertedUrl, selectedFormat);
		}
	}
	
	function toggleConversionPanel() {
		showConversionPanel = !showConversionPanel;
		if (!showConversionPanel) {
			convertedUrl = null;
		}
	}
	
	// Use Runed's onClickOutside for backdrop click - only when conversion panel is closed
	onClickOutside(
		() => modalContent,
		() => {
			if (!showConversionPanel) {
				onClose();
			}
		}
	);
	
	// Keyboard shortcuts using Runed
	useKeyboardShortcut('Escape', () => {
		onClose();
	});
	
	useKeyboardShortcut('+', zoomIn);
	useKeyboardShortcut('=', zoomIn);
	useKeyboardShortcut('-', zoomOut);
	useKeyboardShortcut('0', resetZoom);
</script>

<div 
	bind:this={modalContent}
	class="image-modal fixed inset-0 z-[9999] flex items-center justify-center"
	style:background-color={bgColor}
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
			onclick={() => downloadImage()}
			aria-label="Download image"
			title="Download"
		>
			<Download size={20} class="text-white" />
		</button>
		<button
			class="p-2 rounded-full hover:bg-white/20 transition-colors {showConversionPanel ? 'bg-white/30' : ''}"
			onclick={toggleConversionPanel}
			aria-label="Convert image"
			title="Convert format"
		>
			<ImagePlus size={20} class="text-white" />
		</button>
	</div>
	
	<!-- Conversion Panel -->
	{#if showConversionPanel}
		<div
			bind:this={conversionPanel}
			class="absolute right-4 top-16 w-80 rounded-xl p-4 shadow-xl z-20"
			style:background-color={panelBg}
			style:border="1px solid {panelBorder}"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-label="Image conversion panel"
			tabindex="-1"
		>
			<h3 class="text-sm font-semibold mb-3 flex items-center gap-2" style:color={panelText}>
				<ImagePlus size={16} />
				Convert Image
			</h3>
			
			<!-- Format Selection -->
			<div class="mb-4">
				<p class="text-xs opacity-70 mb-2 block" style:color={panelText}>Target Format</p>
				<div class="grid grid-cols-2 gap-2">
					{#each IMAGE_CONVERSION_FORMATS as format}
						<button
							class="px-3 py-2 rounded-lg text-xs font-medium transition-all border"
							class:opacity-50={currentFormat === format.format}
							style:background-color={selectedFormat === format.format ? '#4299e1' : 'transparent'}
							style:color={selectedFormat === format.format ? '#ffffff' : panelText}
							style:border-color={selectedFormat === format.format ? '#4299e1' : panelBorder}
							onclick={() => selectedFormat = format.format}
							disabled={currentFormat === format.format}
						>
							{format.label}
							{#if currentFormat === format.format}
								<span class="ml-1 opacity-70">(current)</span>
							{/if}
						</button>
					{/each}
				</div>
			</div>
			
			<!-- Quality Slider (for lossy formats) -->
			{#if selectedFormat === 'jpeg' || selectedFormat === 'webp'}
				<div class="mb-4">
					<label for="quality-slider" class="text-xs opacity-70 mb-2 block flex justify-between" style:color={panelText}>
						<span>Quality</span>
						<span>{quality}%</span>
					</label>
					<input
						id="quality-slider"
						type="range"
						min="1"
						max="100"
						bind:value={quality}
						class="w-full h-2 rounded-lg appearance-none cursor-pointer"
						style:background="linear-gradient(to right, #4299e1 0%, #4299e1 {quality}%, {panelBorder} {quality}%, {panelBorder} 100%)"
					/>
				</div>
			{/if}
			
			<!-- Size Comparison -->
			<div class="mb-4 p-3 rounded-lg text-xs" style:background-color={theme === 'light' ? '#f3f4f6' : '#0f1419'}>
				<div class="flex justify-between mb-1" style:color={panelText}>
					<span>Original:</span>
					<span>{formatImageSize(originalSize)}</span>
				</div>
				{#if convertedUrl}
					<div class="flex justify-between" style:color={panelText}>
						<span>Converted:</span>
						<span class="flex items-center gap-1">
							{formatImageSize(convertedSize)}
							{#if convertedSize < originalSize}
								<span class="text-green-500">
									(-{Math.round((1 - convertedSize / originalSize) * 100)}%)
								</span>
							{:else if convertedSize > originalSize}
								<span class="text-amber-500">
									(+{Math.round((convertedSize / originalSize - 1) * 100)}%)
								</span>
							{/if}
						</span>
					</div>
				{/if}
			</div>
			
			<!-- Action Buttons -->
			<div class="flex gap-2">
				<button
					class="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
					style:background-color="#4299e1"
					style:color="#ffffff"
					onclick={handleConvert}
					disabled={isConverting || selectedFormat === currentFormat}
				>
					{#if isConverting}
						<RefreshCw size={16} class="animate-spin" />
						Converting...
					{:else}
						<RefreshCw size={16} />
						Convert
					{/if}
				</button>
				{#if convertedUrl}
					<button
						class="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
						style:background-color={theme === 'light' ? '#10b981' : '#059669'}
						style:color="#ffffff"
						onclick={downloadConverted}
					>
						<Download size={16} />
						Download
					</button>
				{/if}
			</div>
		</div>
	{/if}
	
	<!-- Image container -->
	<div class="relative max-w-[90vw] max-h-[90vh] overflow-hidden">
		{#if isLoading}
			<div class="absolute inset-0 flex items-center justify-center">
				<div class="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
			</div>
		{/if}
		<img
			src={convertedUrl || imageUrl}
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
	
	/* Range slider styling */
	input[type="range"] {
		-webkit-appearance: none;
		appearance: none;
		height: 6px;
		border-radius: 3px;
		outline: none;
	}
	
	input[type="range"]::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #4299e1;
		cursor: pointer;
		border: 2px solid white;
		box-shadow: 0 1px 3px rgba(0,0,0,0.3);
	}
	
	input[type="range"]::-moz-range-thumb {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #4299e1;
		cursor: pointer;
		border: 2px solid white;
		box-shadow: 0 1px 3px rgba(0,0,0,0.3);
	}
</style>
