<script lang="ts">
	import { currentMessages, isStreaming as streamingState, streamingBuffer, multiModelStreamingBuffers, isMultiModelStreaming, chatStore } from '$lib/stores/chatStore';
	import { settingsStore } from '$lib/stores/settingsStore';
	import MessageBubble from './MessageBubble.svelte';
	import { ArrowDown } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import type { Message } from '$lib/types';
	
	let messageContainer: HTMLDivElement;
	let showScrollButton = $state(false);
	let isStreaming = $derived($streamingState);
	let messages = $derived($currentMessages);
	let multiModelBuffers = $derived($multiModelStreamingBuffers);
	let isMultiModel = $derived($isMultiModelStreaming);
	let displayMode = $derived($settingsStore.multiModelDisplayMode);
	
	// Track if user has manually scrolled up (to respect their position during streaming)
	let userHasScrolledUp = $state(false);
	let lastMessageCount = $state(0);
	
	// Map to store siblings for each message
	let messageSiblings = $state(new Map<string, { siblings: Message[], currentIndex: number }>());
	
	// Debounced siblings loading to prevent excessive re-renders
	let siblingsTimeout: ReturnType<typeof setTimeout> | null = null;
	
	// Load siblings for visible messages
	$effect(() => {
		// Create a key from message IDs to detect any message change
		const messageKey = messages.map(m => m.id).join(',');
		
		if (messages.length > 0) {
			// Clear previous timeout to debounce
			if (siblingsTimeout) {
				clearTimeout(siblingsTimeout);
			}
			siblingsTimeout = setTimeout(() => {
				loadSiblings();
			}, 50);
		}
		
		return () => {
			if (siblingsTimeout) {
				clearTimeout(siblingsTimeout);
			}
		};
	});
	
	async function loadSiblings() {
		// Reload siblings for all visible messages to ensure freshness
		const newSiblings = new Map<string, { siblings: Message[], currentIndex: number }>();
		
		for (const message of messages) {
			const result = await chatStore.getMessageSiblings(message.id);
			// Only store if there are multiple versions
			if (result.siblings.length > 1) {
				newSiblings.set(message.id, result);
			}
		}
		
		messageSiblings = newSiblings;
	}
	
	function scrollToBottom() {
		if (messageContainer) {
			messageContainer.scrollTo({
				top: messageContainer.scrollHeight,
				behavior: 'smooth'
			});
		}
	}
	
	function handleScroll() {
		if (!messageContainer) return;
		const { scrollTop, scrollHeight, clientHeight } = messageContainer;
		const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
		showScrollButton = !isNearBottom;
		
		// Track if user has scrolled up (away from bottom)
		userHasScrolledUp = !isNearBottom;
	}
	
	onMount(() => {
		scrollToBottom();
	});
	
	// Auto-scroll effect - only scroll if user hasn't manually scrolled up
	$effect(() => {
		const currentMessageCount = messages.length;
		
		// Only auto-scroll if:
		// 1. There are messages
		// 2. The message count increased (new message added)
		// 3. User hasn't scrolled up, OR we're not currently streaming
		if (currentMessageCount > 0 && currentMessageCount > lastMessageCount) {
			if (!userHasScrolledUp || !isStreaming) {
				setTimeout(scrollToBottom, 100);
			}
		}
		
		lastMessageCount = currentMessageCount;
	});
</script>

<div 
	class="message-list-container flex-1 overflow-y-auto px-6 py-6 scroll-smooth min-h-0"
	bind:this={messageContainer}
	onscroll={handleScroll}
>
	{#if messages.length === 0}
		<div class="flex items-center justify-center h-full">
			<div class="text-center animate-fade-in-up">
				<h2 class="text-2xl font-bold text-[#e2e8f0] mb-2">Start a conversation</h2>
				<p class="text-[#718096]">Send a message to begin chatting</p>
			</div>
		</div>
	{:else}
		<div class="max-w-4xl mx-auto space-y-4 mb-4">
			{#each messages as message, index (message.id)}
				{@const siblingData = messageSiblings.get(message.id)}
				<div style="animation-delay: {index * 0.05}s">
					<MessageBubble
						{message}
						siblings={siblingData?.siblings || [message]}
						currentIndex={siblingData?.currentIndex || 0}
					/>
				</div>
			{/each}
			
			{#if isStreaming && isMultiModel}
				<!-- Multi-model streaming display -->
				<div class="multi-model-streaming space-y-4" class:grid={displayMode === 'split'} class:grid-cols-2={displayMode === 'split'}>
					{#each Array.from(multiModelBuffers.entries()) as [modelId, content] (modelId)}
						<MessageBubble 
							message={{
								id: `streaming-${modelId}`,
								role: 'assistant',
								content: content,
								model: modelId,
								timestamp: new Date()
							}}
							streaming={true}
						/>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

{#if showScrollButton}
	<button
		class="scroll-to-bottom fixed bottom-24 right-6 w-12 h-12 rounded-full bg-[#4299e1] text-white shadow-2xl flex items-center justify-center hover:bg-[#3182ce] hover:scale-110 active:scale-95 transition-all duration-200 z-10 animate-bounce-in"
		onclick={scrollToBottom}
	>
		<ArrowDown size={20} />
	</button>
{/if}
