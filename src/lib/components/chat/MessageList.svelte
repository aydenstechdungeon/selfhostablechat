<script lang="ts">
	import { currentMessages, isStreaming as streamingState, streamingBuffer, multiModelStreamingBuffers, isMultiModelStreaming, chatStore } from '$lib/stores/chatStore';
	import { settingsStore } from '$lib/stores/settingsStore';
	import { streamingStore } from '$lib/stores/streamingStore';
	import MessageBubble from './MessageBubble.svelte';
	import { ArrowDown } from 'lucide-svelte';
	import { onMount, tick } from 'svelte';
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
	
	// Preserve scroll position across re-renders
	let preservedScrollTop = $state(0);
	let wasStreaming = $state(false);
	
	// Track if user is near bottom for new messages dismissal
	let isNearBottom = $state(false);
	let activeChatId = $derived($chatStore.activeChatId);
	
	// Map to store siblings for each message
	let messageSiblings = $state(new Map<string, { siblings: Message[], currentIndex: number }>());
	
	// Debounced siblings loading to prevent excessive re-renders
	let siblingsTimeout: ReturnType<typeof setTimeout> | null = null;
	let isLoadingSiblings = $state(false);
	// Track message IDs we've already loaded siblings for to avoid redundant work
	let loadedSiblingsFor = new Set<string>();
	
	// Load siblings for visible messages - debounced and throttled
	$effect(() => {
		const messageIds = messages.map(m => m.id);
		const messageKey = messageIds.join(',');
		
		if (messages.length === 0) {
			messageSiblings = new Map();
			loadedSiblingsFor.clear();
			return;
		}
		
		// Clear previous timeout to debounce
		if (siblingsTimeout) {
			clearTimeout(siblingsTimeout);
		}
		
		// Only load siblings if we have new messages that we haven't loaded for yet
		const hasNewMessages = messageIds.some(id => !loadedSiblingsFor.has(id));
		if (!hasNewMessages && messageSiblings.size > 0) {
			return; // Skip if we've already loaded for all current messages
		}
		
		siblingsTimeout = setTimeout(() => {
			loadSiblings();
		}, 150); // Increased debounce to 150ms
		
		return () => {
			if (siblingsTimeout) {
				clearTimeout(siblingsTimeout);
			}
		};
	});
	
	async function loadSiblings() {
		if (isLoadingSiblings) return;
		isLoadingSiblings = true;
		
		try {
			// Only process messages we haven't loaded siblings for yet
			const messagesToProcess = messages.filter(m => !loadedSiblingsFor.has(m.id));
			
			if (messagesToProcess.length === 0 && messageSiblings.size > 0) {
				return;
			}
			
			// Create new map from existing to avoid full re-render
			const newSiblings = new Map(messageSiblings);
			
			// Batch sibling loading - process in chunks to avoid blocking UI
			const batchSize = 5;
			for (let i = 0; i < messagesToProcess.length; i += batchSize) {
				const batch = messagesToProcess.slice(i, i + batchSize);
				
				await Promise.all(batch.map(async (message) => {
					try {
						const result = await chatStore.getMessageSiblings(message.id);
						// Only store if there are multiple versions
						if (result.siblings.length > 1) {
							newSiblings.set(message.id, result);
						}
						loadedSiblingsFor.add(message.id);
					} catch (e) {
						// Silently fail for individual messages
						loadedSiblingsFor.add(message.id);
					}
				}));
				
				// Yield to UI between batches
				if (i + batchSize < messagesToProcess.length) {
					await tick();
				}
			}
			
			// Only update state if there are actual changes
			if (newSiblings.size !== messageSiblings.size ||
				Array.from(newSiblings.keys()).some(k => !messageSiblings.has(k))) {
				messageSiblings = newSiblings;
			}
		} finally {
			isLoadingSiblings = false;
		}
	}
	
	// Clear loaded siblings cache when chat changes
	$effect(() => {
		if (activeChatId) {
			loadedSiblingsFor.clear();
			messageSiblings = new Map();
		}
	});
	
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
		const nearBottom = scrollHeight - scrollTop - clientHeight < 100;
		
		// Update reactive state
		isNearBottom = nearBottom;
		showScrollButton = !nearBottom;
		
		// Track if user has scrolled up (away from bottom)
		userHasScrolledUp = !nearBottom;
		
		// Preserve current scroll position for restoration after streaming
		if (userHasScrolledUp) {
			preservedScrollTop = scrollTop;
		}
	}
	
	onMount(() => {
		scrollToBottom();
	});
	
	// Auto-scroll effect - only scroll if user hasn't manually scrolled up
	$effect(() => {
		const currentMessageCount = messages.length;
		
		// Detect when streaming transitions from true to false (generation completed)
		if (wasStreaming && !isStreaming && userHasScrolledUp) {
			// Restore the scroll position that was preserved
			if (messageContainer && preservedScrollTop > 0) {
				messageContainer.scrollTop = preservedScrollTop;
			}
		}
		
		// Preserve scroll position before streaming state changes
		if (!wasStreaming && isStreaming && messageContainer) {
			preservedScrollTop = messageContainer.scrollTop;
		}
		wasStreaming = isStreaming;
		
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
	
	// Effect to auto-dismiss green indicator when scrolled to bottom and generation completes
	$effect(() => {
		// Check if streaming just completed (transitioned from true to false)
		if (wasStreaming && !isStreaming && isNearBottom && activeChatId) {
			// User is at bottom and generation completed - dismiss the green indicator
			streamingStore.clearNewMessages(activeChatId);
		}
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
