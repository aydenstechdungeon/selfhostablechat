<script lang="ts">
	import { page } from '$app/stores';
	import { MessageSquare, Settings } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	
	let currentPath = $derived($page.url.pathname);
	
	const navItems = [
		{ path: '/chat', icon: MessageSquare, label: 'Chat' },
		{ path: '/settings', icon: Settings, label: 'Settings' }
	];
</script>

<nav class="fixed bottom-0 left-0 right-0 bg-base-darker border-t border-base-dark p-4 md:hidden z-50">
	<div class="flex justify-around">
		{#each navItems as item}
			{@const Icon = item.icon}
			<button
				class="flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors {currentPath.startsWith(item.path) ? 'text-primary-500 bg-primary-500/10' : 'text-base-light'}"
				onclick={() => goto(item.path)}
			>
				<Icon size={20} />
				<span class="text-xs">{item.label}</span>
			</button>
		{/each}
	</div>
</nav>
