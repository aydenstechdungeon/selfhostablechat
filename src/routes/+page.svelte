<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { chatDB } from '$lib/stores/indexedDB';
	
	onMount(async () => {
		goto('/chat/new', { replaceState: true });
	});
</script>

<div class="flex items-center justify-center h-screen bg-base-darkest">
	<div class="text-center">
		<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
		<p class="text-base-light">Loading...</p>
	</div>
</div>
