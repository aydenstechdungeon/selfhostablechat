<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	
	onMount(() => {
		// Redirect /chat to /chat/new
		goto('/chat/new', { replaceState: true });
	});
</script>

<div class="flex items-center justify-center h-full">
	<div class="animate-pulse text-gray-500">Loading...</div>
</div>
