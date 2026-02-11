<script lang="ts">
	import "../app.css";
	import { uiStore } from "$lib/stores/uiStore";
	import ToastContainer from "$lib/components/ui/ToastContainer.svelte";
	import { QueryClientProvider } from "@tanstack/svelte-query";
	import { createQueryClient } from "$lib/query/client";
	import MermaidModal from "$lib/components/media/MermaidModal.svelte";
	import { mermaidModalStore } from "$lib/stores/mermaidModalStore";

	import { onMount } from "svelte";

	let { children } = $props();

	const queryClient = createQueryClient();

	onMount(() => {
		if ("serviceWorker" in navigator) {
			navigator.serviceWorker
				.register("/service-worker.js", { scope: "/", type: "module" })
				.then(
					(registration) => {
						console.log(
							"ServiceWorker registration successful with scope: ",
							registration.scope,
						);
					},
					(err) => {
						console.log("ServiceWorker registration failed: ", err);
					},
				);
		}
	});
</script>

<svelte:head>
	<title>AI Chat Application</title>
	<!-- Preconnect to Google Fonts for faster connection -->
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link
		rel="preconnect"
		href="https://fonts.gstatic.com"
		crossorigin="anonymous"
	/>

	<!-- DNS prefetch for API domains used by the app -->
	<link rel="dns-prefetch" href="https://openrouter.ai" />
	<link
		rel="preconnect"
		href="https://openrouter.ai"
		crossorigin="anonymous"
	/>

	<!-- Load fonts normally - preconnect handles the optimization -->
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="app-root h-screen overflow-hidden">
	<QueryClientProvider client={queryClient}>
		{@render children()}
	</QueryClientProvider>
</div>

<ToastContainer />

<!-- Global Mermaid Modal -->
{#if $mermaidModalStore.isOpen}
	<MermaidModal
		mermaidCode={$mermaidModalStore.code}
		onClose={() => mermaidModalStore.close()}
	/>
{/if}

<style>
	:global(html, body) {
		height: 100%;
		overflow: hidden;
		margin: 0;
		padding: 0;
	}
</style>
