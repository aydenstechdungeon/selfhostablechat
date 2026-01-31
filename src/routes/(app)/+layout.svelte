<script lang="ts">
	import { uiStore } from '$lib/stores/uiStore';
	import { statsStore } from '$lib/stores/statsStore';
	import { settingsStore } from '$lib/stores/settingsStore';
	import ChatSidebar from '$lib/components/sidebar/ChatSidebar.svelte';
	import { onMount } from 'svelte';
	
	let { children } = $props();
	let leftSidebarCollapsed = $derived($uiStore.leftSidebarCollapsed);
	let leftSidebarWidth = $derived($uiStore.leftSidebarWidth);
	let theme = $derived($uiStore.theme);
	let settings = $derived($settingsStore);
	
	// Determine effective theme (handle 'auto')
	let effectiveTheme = $derived(theme === 'auto' 
		? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
		: theme
	);
	
	// Light theme colors
	const lightColors = {
		bg: '#ffffff',
		bgSecondary: '#f8f9fa',
		border: '#e5e7eb',
		text: '#1f2937',
		textSecondary: '#6b7280'
	};
	
	// Dark theme colors
	const darkColors = {
		bg: '#0f1419',
		bgSecondary: '#1a1f2e',
		border: '#2d3748',
		text: '#e2e8f0',
		textSecondary: '#a0aec0'
	};
	
	let colors = $derived(effectiveTheme === 'light' ? lightColors : darkColors);
	
	// Apply font size and compact mode settings
	$effect(() => {
		if (typeof document !== 'undefined') {
			document.documentElement.style.fontSize = `${settings.fontSize}px`;
		}
	});
	
	$effect(() => {
		if (typeof document !== 'undefined') {
			if (settings.compactMode) {
				document.body.classList.add('compact-mode');
			} else {
				document.body.classList.remove('compact-mode');
			}
		}
	});
	
	// Sidebar resize state
	let isResizing = $state(false);
	let startX = $state(0);
	let startWidth = $state(0);
	
	function startResize(e: MouseEvent) {
		isResizing = true;
		startX = e.clientX;
		startWidth = $uiStore.leftSidebarWidth;
		document.body.style.cursor = 'col-resize';
		document.body.style.userSelect = 'none';
	}
	
	function handleResize(e: MouseEvent) {
		if (!isResizing) return;
		const delta = e.clientX - startX;
		const newWidth = startWidth + delta;
		uiStore.setLeftSidebarWidth(newWidth);
	}
	
	function stopResize() {
		isResizing = false;
		document.body.style.cursor = '';
		document.body.style.userSelect = '';
	}
	
	function handleKeyResize(e: KeyboardEvent) {
		const step = 20;
		let newWidth = $uiStore.leftSidebarWidth;
		if (e.key === 'ArrowLeft') {
			newWidth -= step;
		} else if (e.key === 'ArrowRight') {
			newWidth += step;
		} else {
			return;
		}
		e.preventDefault();
		uiStore.setLeftSidebarWidth(newWidth);
	}
	
	// Listen for system theme changes when in auto mode
	onMount(() => {
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handler = () => {
			// Force re-render by touching the store (theme stays 'auto' but effectiveTheme changes)
			if (theme === 'auto') {
				uiStore.setTheme('auto');
			}
		};
		mediaQuery.addEventListener('change', handler);
		
		// Add resize event listeners
		document.addEventListener('mousemove', handleResize);
		document.addEventListener('mouseup', stopResize);
		
		// Listen for message stats event to open stats modal
		const handleOpenStats = (e: CustomEvent) => {
			if (e.detail?.messageId) {
				statsStore.openStatsPanel(e.detail.messageId);
			}
		};
		window.addEventListener('open-message-stats', handleOpenStats as EventListener);
		
		return () => {
			mediaQuery.removeEventListener('change', handler);
			document.removeEventListener('mousemove', handleResize);
			document.removeEventListener('mouseup', stopResize);
			window.removeEventListener('open-message-stats', handleOpenStats as EventListener);
		};
	});
</script>

<div class="app-shell grid h-full overflow-hidden transition-colors duration-200" 
	style:background-color={colors.bg} 
	style:grid-template-columns="{leftSidebarCollapsed ? '0' : leftSidebarWidth + 'px'} 1fr">
	<aside class="sidebar-left overflow-y-auto overflow-x-hidden transition-all duration-300 relative {leftSidebarCollapsed ? '-translate-x-full' : ''}" 
		style:background-color={colors.bgSecondary} 
		style:border-right="1px solid {colors.border}">
		<ChatSidebar />
		
		<!-- Resize handle -->
		{#if !leftSidebarCollapsed}
			<div 
				class="resize-handle absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#4299e1] transition-colors z-50"
				class:resizing={isResizing}
				role="slider"
				aria-label="Resize sidebar"
				aria-valuemin={200}
				aria-valuemax={600}
				aria-valuenow={leftSidebarWidth}
				tabindex="0"
				onmousedown={startResize}
				onkeydown={handleKeyResize}
				title="Drag to resize sidebar (or use arrow keys)"
			></div>
		{/if}
	</aside>
	
	<main class="main-content overflow-hidden flex flex-col">
		{@render children()}
	</main>
</div>

<style>
	.resize-handle {
		opacity: 0;
	}
	
	.resize-handle:hover,
	.resize-handle.resizing {
		opacity: 1;
		background-color: #4299e1;
	}
	
	.sidebar-left:hover .resize-handle {
		opacity: 0.5;
	}
	
	@media (max-width: 768px) {
		.app-shell {
			grid-template-columns: 1fr !important;
		}
		
		.sidebar-left {
			display: none;
		}
	}
</style>
