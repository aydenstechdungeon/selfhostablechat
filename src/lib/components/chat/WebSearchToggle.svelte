<script lang="ts">
	import { settingsStore } from '$lib/stores/settingsStore';
	import { Globe, AlertCircle } from 'lucide-svelte';
	
	let settings = $derived($settingsStore);
	let isEnabled = $derived(settings.webSearch?.enabled ?? false);
	
	let theme = $derived($settingsStore.theme === 'auto' 
		? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
		: $settingsStore.theme
	);
	
	function toggleWebSearch() {
		settingsStore.updateSettings({
			webSearch: {
				...settings.webSearch,
				enabled: !isEnabled
			}
		});
	}
	
	let bgColor = $derived(theme === 'light' ? '#ffffff' : '#0f1419');
	let textColor = $derived(theme === 'light' ? '#1f2937' : '#e2e8f0');
	let borderColor = $derived(theme === 'light' ? '#e5e7eb' : '#2d3748');
	let accentColor = '#4299e1';
	let enabledBg = 'rgba(66, 153, 225, 0.15)';
	let enabledBorder = '#4299e1';
</script>

<button
	class="web-search-toggle flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
	style:background-color={isEnabled ? enabledBg : bgColor}
	style:border-color={isEnabled ? enabledBorder : borderColor}
	style:color={isEnabled ? accentColor : textColor}
	onclick={toggleWebSearch}
	title={isEnabled ? 'Web search is enabled - AI will search the web for current information' : 'Enable web search to get real-time information'}
	type="button"
>
	<Globe size={14} class={isEnabled ? 'animate-pulse' : ''} />
	<span class="text-xs font-medium">Web</span>
	{#if isEnabled}
		<span class="w-1.5 h-1.5 rounded-full bg-[#4299e1] animate-pulse"></span>
	{/if}
</button>

<style>
	.web-search-toggle {
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}
	
	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}
	
	.animate-pulse {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}
</style>
