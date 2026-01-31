<script lang="ts">
	import { toastStore } from '$lib/stores/toastStore';
	import { CheckCircle, XCircle, Info, X } from 'lucide-svelte';
	import { uiStore } from '$lib/stores/uiStore';
	
	let toasts = $derived($toastStore);
	let theme = $derived($uiStore.theme);
	
	function getIcon(type: string) {
		switch (type) {
			case 'success': return CheckCircle;
			case 'error': return XCircle;
			default: return Info;
		}
	}
	
	function getColor(type: string) {
		switch (type) {
			case 'success': return '#48bb78';
			case 'error': return '#f56565';
			default: return '#4299e1';
		}
	}
</script>

<div class="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
	{#each toasts as toast (toast.id)}
		{@const Icon = getIcon(toast.type)}
		<div
			class="toast flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl min-w-[300px] animate-slideIn"
			style:background-color={theme === 'light' ? '#ffffff' : '#1a1f2e'}
			style:border="1px solid {theme === 'light' ? '#e5e7eb' : '#2d3748'}"
		>
			<Icon size={20} color={getColor(toast.type)} />
			<span class="flex-1 text-sm" style:color={theme === 'light' ? '#1f2937' : '#e2e8f0'}>
				{toast.message}
			</span>
			<button
				onclick={() => toastStore.remove(toast.id)}
				class="p-1 rounded hover:opacity-70 transition-opacity"
				style:color={theme === 'light' ? '#6b7280' : '#a0aec0'}
			>
				<X size={16} />
			</button>
		</div>
	{/each}
</div>

<style>
	@keyframes slideIn {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}
	
	.animate-slideIn {
		animation: slideIn 200ms ease-out;
	}
</style>