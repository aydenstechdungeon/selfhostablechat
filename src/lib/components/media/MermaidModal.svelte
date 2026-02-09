<script lang="ts">
	import { X, ZoomIn, ZoomOut, Move, Code, Eye } from "lucide-svelte";
	import { ui } from "$lib/stores/ui.svelte";
	import { useKeyboardShortcut } from "$lib/utils/runed-helpers.svelte";

	interface Props {
		mermaidCode: string;
		onClose: () => void;
	}

	import { preprocessMermaidCode } from "$lib/utils/markdown";

	let { mermaidCode, onClose }: Props = $props();

	let scale = $state(1);
	let isLoading = $state(false);
	let theme = $derived(ui.current.theme);
	let activeTab = $state<"diagram" | "raw">("diagram");

	// Pan state
	let panX = $state(0);
	let panY = $state(0);
	let isDragging = $state(false);
	let dragStartX = $state(0);
	let dragStartY = $state(0);
	let panStartX = $state(0);
	let panStartY = $state(0);

	let modalContent = $state<HTMLElement | null>(null);
	let diagramContainer = $state<HTMLElement | null>(null);

	// Mermaid instance and rendered SVG
	// DON'T use $state for library instances as the proxy can break internal behavior
	let mermaidInstance: typeof import("mermaid").default | null = null;
	let renderedSvg = $state<string>("");
	let renderError = $state<string | null>(null);
	let isRendering = false; // Non-reactive flag to prevent concurrent renders

	let bgColor = $derived(
		theme === "light" ? "rgba(0, 0, 0, 0.9)" : "rgba(0, 0, 0, 0.95)",
	);
	// Always use dark theme for the panel to match Mermaid's dark theme configuration
	// This prevents white-on-white text issues in light mode and ensures consistency
	let panelBg = "#1a1f2e";
	let panelText = "#e2e8f0";
	let panelBorder = "#2d3748";

	// Load and render mermaid diagram
	async function renderDiagram() {
		if (isRendering) return; // Guard against concurrent renders
		isRendering = true;
		isLoading = true;
		renderError = null;

		try {
			if (!mermaidInstance) {
				const mermaidModule = await import("mermaid");
				mermaidInstance = mermaidModule.default;
				mermaidInstance.initialize({
					startOnLoad: false,
					theme: "dark",
					securityLevel: "loose",
					fontFamily:
						"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
				});
			}

			const id = `mermaid-modal-${Date.now()}`;
			const processedCode = preprocessMermaidCode(mermaidCode);
			const { svg } = await mermaidInstance.render(id, processedCode);
			renderedSvg = svg;
		} catch (err) {
			console.error("Failed to render mermaid diagram:", err);
			renderError =
				err instanceof Error ? err.message : "Failed to render diagram";
		} finally {
			isRendering = false;
			isLoading = false;
		}
	}

	// Initialize on mount
	$effect(() => {
		if (activeTab === "diagram" && mermaidCode) {
			renderDiagram();
		}
	});

	function zoomIn() {
		scale = Math.min(scale + 0.25, 3);
	}

	function zoomOut() {
		scale = Math.max(scale - 0.25, 0.5);
		if (scale <= 1) {
			panX = 0;
			panY = 0;
		}
	}

	function resetZoom() {
		scale = 1;
		panX = 0;
		panY = 0;
	}

	function handleDoubleClick() {
		if (scale > 1) {
			resetZoom();
		} else {
			scale = 2;
		}
	}

	function handleMouseDown(e: MouseEvent) {
		if (scale > 1 && e.button === 0) {
			isDragging = true;
			dragStartX = e.clientX;
			dragStartY = e.clientY;
			panStartX = panX;
			panStartY = panY;
		}
	}

	function handleMouseMove(e: MouseEvent) {
		if (isDragging && scale > 1) {
			const dx = e.clientX - dragStartX;
			const dy = e.clientY - dragStartY;
			panX = panStartX + dx;
			panY = panStartY + dy;
		}
	}

	function handleMouseUp() {
		isDragging = false;
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const delta = e.deltaY > 0 ? -0.15 : 0.15;
		const newScale = Math.max(0.5, Math.min(3, scale + delta));

		if (newScale !== scale) {
			if (newScale <= 1) {
				panX = 0;
				panY = 0;
			}
			scale = newScale;
		}
	}

	// Touch support
	let lastTouchDist = 0;
	let lastTouchX = 0;
	let lastTouchY = 0;

	function handleTouchStart(e: TouchEvent) {
		if (e.touches.length === 1 && scale > 1) {
			isDragging = true;
			lastTouchX = e.touches[0].clientX;
			lastTouchY = e.touches[0].clientY;
			panStartX = panX;
			panStartY = panY;
		} else if (e.touches.length === 2) {
			isDragging = false;
			const dx = e.touches[0].clientX - e.touches[1].clientX;
			const dy = e.touches[0].clientY - e.touches[1].clientY;
			lastTouchDist = Math.sqrt(dx * dx + dy * dy);
		}
	}

	function handleTouchMove(e: TouchEvent) {
		e.preventDefault();
		if (e.touches.length === 1 && isDragging && scale > 1) {
			const dx = e.touches[0].clientX - lastTouchX;
			const dy = e.touches[0].clientY - lastTouchY;
			panX = panStartX + dx;
			panY = panStartY + dy;
		} else if (e.touches.length === 2) {
			const dx = e.touches[0].clientX - e.touches[1].clientX;
			const dy = e.touches[0].clientY - e.touches[1].clientY;
			const dist = Math.sqrt(dx * dx + dy * dy);

			if (lastTouchDist > 0) {
				const delta = (dist - lastTouchDist) * 0.01;
				scale = Math.max(0.5, Math.min(3, scale + delta));
				if (scale <= 1) {
					panX = 0;
					panY = 0;
				}
			}
			lastTouchDist = dist;
		}
	}

	function handleTouchEnd() {
		isDragging = false;
		lastTouchDist = 0;
	}

	function switchTab(tab: "diagram" | "raw") {
		activeTab = tab;
		resetZoom();
	}

	// Manual click-outside handler with proper timing to avoid immediate trigger
	$effect(() => {
		if (!modalContent) return;

		// Skip the first frame to let the opening click complete
		let cancelled = false;
		let clickHandler: ((e: MouseEvent) => void) | null = null;

		const rafId = requestAnimationFrame(() => {
			if (cancelled) return;

			clickHandler = (e: MouseEvent) => {
				const target = e.target as Node;
				if (modalContent && !modalContent.contains(target)) {
					onClose();
				}
			};

			document.addEventListener("click", clickHandler, true);
		});

		return () => {
			cancelled = true;
			cancelAnimationFrame(rafId);
			if (clickHandler) {
				document.removeEventListener("click", clickHandler, true);
			}
		};
	});

	useKeyboardShortcut("Escape", () => {
		onClose();
	});

	useKeyboardShortcut("+", zoomIn);
	useKeyboardShortcut("=", zoomIn);
	useKeyboardShortcut("-", zoomOut);
	useKeyboardShortcut("0", resetZoom);

	// Focus trap
	$effect(() => {
		if (!modalContent) return;

		const focusableElements = modalContent.querySelectorAll(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
		);
		const firstElement = focusableElements[0] as HTMLElement;
		const lastElement = focusableElements[
			focusableElements.length - 1
		] as HTMLElement;

		if (firstElement) {
			firstElement.focus();
		}

		const handleTab = (e: KeyboardEvent) => {
			if (e.key === "Tab") {
				if (e.shiftKey) {
					if (document.activeElement === firstElement) {
						e.preventDefault();
						lastElement?.focus();
					}
				} else {
					if (document.activeElement === lastElement) {
						e.preventDefault();
						firstElement?.focus();
					}
				}
			}
		};

		modalContent.addEventListener("keydown", handleTab);
		return () => {
			modalContent?.removeEventListener("keydown", handleTab);
		};
	});
</script>

<div
	bind:this={modalContent}
	class="mermaid-modal fixed inset-0 z-[9999] flex items-center justify-center"
	style:background-color={bgColor}
	role="dialog"
	aria-modal="true"
	aria-label="Mermaid diagram viewer"
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

	<!-- Tab toggle (Positioned to not overlap with close button) -->
	<div
		class="absolute top-4 md:top-6 left-4 md:left-1/2 md:-translate-x-1/2 flex items-center z-20"
	>
		<!-- Tab buttons -->
		<div
			class="flex items-center bg-white/10 backdrop-blur-md rounded-full p-1 border border-white/10 shadow-lg"
		>
			<button
				class="flex items-center gap-1.5 px-3 md:px-5 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 {activeTab ===
				'diagram'
					? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
					: 'text-white/60 hover:text-white hover:bg-white/5'}"
				onclick={() => switchTab("diagram")}
				aria-label="View diagram"
			>
				<Eye size={16} class="md:w-[18px] md:h-[18px]" />
				Diagram
			</button>
			<button
				class="flex items-center gap-1.5 px-3 md:px-5 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 {activeTab ===
				'raw'
					? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
					: 'text-white/60 hover:text-white hover:bg-white/5'}"
				onclick={() => switchTab("raw")}
				aria-label="View raw code"
			>
				<Code size={16} class="md:w-[18px] md:h-[18px]" />
				Raw
			</button>
		</div>
	</div>

	<!-- Zoom controls (only for diagram tab) -->
	{#if activeTab === "diagram"}
		<div
			class="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl z-20"
		>
			<button
				class="p-2 rounded-full hover:bg-white/10 active:scale-95 transition-all disabled:opacity-30"
				onclick={zoomOut}
				disabled={scale <= 0.5}
				aria-label="Zoom out"
				title="Zoom out (-)"
			>
				<ZoomOut size={20} class="text-white" />
			</button>
			<span
				class="text-white text-xs md:text-sm font-bold min-w-[50px] md:min-w-[64px] text-center"
				>{Math.round(scale * 100)}%</span
			>
			<button
				class="p-2 rounded-full hover:bg-white/10 active:scale-95 transition-all disabled:opacity-30"
				onclick={zoomIn}
				disabled={scale >= 3}
				aria-label="Zoom in"
				title="Zoom in (+)"
			>
				<ZoomIn size={20} class="text-white" />
			</button>
			<div class="w-px h-6 bg-white/10 mx-1"></div>
			<button
				class="p-2 rounded-full hover:bg-white/10 active:scale-95 transition-all {scale !==
					1 ||
				panX !== 0 ||
				panY !== 0
					? 'bg-white/10 text-blue-400'
					: 'text-white disabled:opacity-30'}"
				onclick={resetZoom}
				disabled={scale === 1 && panX === 0 && panY === 0}
				aria-label="Reset zoom and pan"
				title="Reset (0)"
			>
				<Move size={20} />
			</button>
		</div>
	{/if}

	<!-- Content container -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		bind:this={diagramContainer}
		class="relative w-[92vw] h-[82vh] max-w-[1500px] overflow-hidden rounded-2xl flex flex-col"
		style:background-color={panelBg}
		style:border="1px solid {panelBorder}"
		role="img"
		aria-label="Mermaid diagram"
		onwheel={activeTab === "diagram" ? handleWheel : undefined}
		onmousedown={activeTab === "diagram" ? handleMouseDown : undefined}
		onmousemove={activeTab === "diagram" ? handleMouseMove : undefined}
		onmouseup={activeTab === "diagram" ? handleMouseUp : undefined}
		onmouseleave={activeTab === "diagram" ? handleMouseUp : undefined}
		ontouchstart={activeTab === "diagram" ? handleTouchStart : undefined}
		ontouchmove={activeTab === "diagram" ? handleTouchMove : undefined}
		ontouchend={activeTab === "diagram" ? handleTouchEnd : undefined}
		ondblclick={activeTab === "diagram" ? handleDoubleClick : undefined}
	>
		{#if activeTab === "diagram"}
			<div
				class="flex-1 w-full p-4 md:p-12 flex items-center justify-center overflow-auto"
				class:cursor-grab={scale > 1 && !isDragging}
				class:cursor-grabbing={isDragging}
				class:cursor-zoom-in={scale <= 1}
			>
				{#if isLoading}
					<div class="flex flex-col items-center gap-3">
						<div
							class="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin"
						></div>
						<span class="text-white/50 text-base font-medium"
							>Rendering diagram...</span
						>
					</div>
				{:else if renderError}
					<div
						class="flex flex-col items-center gap-4 text-red-400 p-6"
					>
						<div class="p-3 rounded-full bg-red-400/10">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="40"
								height="40"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								><circle cx="12" cy="12" r="10" /><line
									x1="12"
									x2="12"
									y1="8"
									y2="12"
								/><line
									x1="12"
									x2="12.01"
									y1="16"
									y2="16"
								/></svg
							>
						</div>
						<span class="text-lg font-medium"
							>Failed to render diagram</span
						>
						<pre
							class="text-xs text-white/30 max-w-xl text-center bg-black/20 p-4 rounded-lg overflow-auto max-h-[200px]">{renderError}</pre>
					</div>
				{:else if renderedSvg}
					<div
						class="transition-transform duration-200 ease-out select-none flex items-center justify-center min-w-full min-h-full"
						style:transform="scale({scale}) translate({panX /
							scale}px, {panY / scale}px)"
						style:transform-origin="center center"
					>
						{@html renderedSvg}
					</div>
				{/if}
			</div>
		{:else}
			<div class="flex-1 w-full p-6 md:p-10 overflow-auto">
				<pre
					class="text-sm md:text-base font-mono whitespace-pre-wrap break-words leading-relaxed"
					style:color={panelText}><code>{mermaidCode}</code></pre>
			</div>
		{/if}
	</div>

	<!-- Instructions -->
	{#if activeTab === "diagram"}
		<div class="absolute bottom-4 left-4 text-white/50 text-xs space-y-1">
			<p>ESC to close • +/- to zoom • 0 to reset</p>
			<p class="text-white/30">
				Scroll to zoom • Drag to pan when zoomed
			</p>
		</div>
	{:else}
		<div class="absolute bottom-4 left-4 text-white/50 text-xs">
			<p>ESC to close</p>
		</div>
	{/if}
</div>

<style>
	.mermaid-modal {
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

	:global(.mermaid-modal svg) {
		width: auto;
		height: auto;
		max-width: 100%;
		max-height: 100%;
		display: block;
		margin: 0 auto;
	}

	/* Custom scrollbar for raw code view */
	.mermaid-modal *::-webkit-scrollbar {
		width: 10px;
		height: 10px;
	}

	.mermaid-modal *::-webkit-scrollbar-track {
		background: rgba(0, 0, 0, 0.2);
		border-radius: 5px;
	}

	.mermaid-modal *::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.15);
		border-radius: 5px;
		border: 2px solid rgba(0, 0, 0, 0.1);
	}

	.mermaid-modal *::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.25);
	}
</style>
