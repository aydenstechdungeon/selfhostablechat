<script lang="ts">
	import {
		currentMessages,
		isStreaming as streamingState,
		streamingBuffer,
		multiModelStreamingBuffers,
		isMultiModelStreaming,
		chatStore,
	} from "$lib/stores/chatStore";
	import { settingsStore } from "$lib/stores/settingsStore";
	import { streamingStore } from "$lib/stores/streamingStore";
	import MessageBubble from "./MessageBubble.svelte";
	import { ArrowDown } from "lucide-svelte";
	import { onMount, tick } from "svelte";
	import type { Message } from "$lib/types";
	import { throttle } from "$lib/utils/helpers";

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

	// Object to store siblings for each message group (keyed by "parentId:role")
	// Using a plain object instead of Map for better Svelte 5 reactivity
	let messageSiblings: Record<string, { siblings: Message[] }> = $state({});

	// Create derived key for structure to prevent streaming updates from re-triggering sibling fetch
	let structureKey = $derived(
		messages.map((m) => `${m.id}:${m.parentId}:${m.role}`).join("|"),
	);

	// Debounced siblings loading to prevent excessive re-renders
	let siblingsTimeout: ReturnType<typeof setTimeout> | null = null;
	let isLoadingSiblings = $state(false);
	// Track parentIds we've already loaded siblings for to avoid redundant work
	// Using parentId as key because all messages with the same parent share the same sibling group
	let loadedSiblingsFor = new Set<string | null>();

	// Track previous chat ID to detect actual chat changes
	let previousChatId: string | null = $state(null);
	// Track previous structure to detect significant changes
	let previousStructureKey: string = $state("");

	// Unified effect for loading siblings - handles both chat changes and message updates
	$effect(() => {
		const chatId = activeChatId;
		const key = structureKey;

		// Check if this is a chat change
		const isChatChange = chatId !== previousChatId;

		// Check if structure changed significantly (new messages, different tree path)
		const isStructureChange = key !== previousStructureKey;

		// If chat changed, clear everything and prepare for new load
		if (isChatChange && chatId) {
			loadedSiblingsFor.clear();
			messageSiblings = {};
			previousChatId = chatId;
		} else if (!chatId) {
			// Navigating away from all chats
			loadedSiblingsFor.clear();
			messageSiblings = {};
			previousChatId = null;
			previousStructureKey = "";
			return;
		}

		if (!key) {
			return;
		}

		// Update previous structure key
		previousStructureKey = key;

		// Clear previous timeout
		if (siblingsTimeout) {
			clearTimeout(siblingsTimeout);
		}

		// Check if we have any new messages not in cached siblings
		// This detects regeneration/edits that create new message versions
		const siblingsEmpty = Object.keys(messageSiblings).length === 0;
		let hasNewMessages = false;

		if (!siblingsEmpty && isStructureChange) {
			// Check if any current message is missing from cached siblings
			for (const message of messages) {
				const siblingKey = `${message.parentId ?? "null"}:${message.role}`;
				const cached = messageSiblings[siblingKey];
				if (
					!cached ||
					!cached.siblings.some((s) => s.id === message.id)
				) {
					hasNewMessages = true;
					break;
				}
			}
		}

		// Load siblings - immediately if chat changed, empty, or new messages detected
		if (isChatChange || siblingsEmpty || hasNewMessages) {
			// Immediate load for chat changes, empty cache, or new messages
			loadSiblings();
		} else if (isStructureChange) {
			// Debounce for minor structure changes (shouldn't happen often now)
			siblingsTimeout = setTimeout(() => {
				loadSiblings();
			}, 150);
		}

		return () => {
			if (siblingsTimeout) {
				clearTimeout(siblingsTimeout);
			}
		};
	});

	// Clear loaded siblings cache when active path changes (version switch)

	async function loadSiblings() {
		isLoadingSiblings = true;

		try {
			// Group messages by parentId to avoid redundant loading
			const messagesByParent = new Map<string | null, typeof messages>();
			const currentKeys = new Set<string>();

			for (const message of messages) {
				const parentId = message.parentId ?? "null";
				// Key by parentId + role to handle different branches properly
				const key = `${parentId}:${message.role}`;
				currentKeys.add(key);

				const parentIdKey = message.parentId ?? null;
				if (!messagesByParent.has(parentIdKey)) {
					messagesByParent.set(parentIdKey, []);
				}
				messagesByParent.get(parentIdKey)!.push(message);
			}

			// Build new object with only current keys (cleanup old entries)
			const newSiblings: Record<string, { siblings: Message[] }> = {};

			// Copy over existing entries for current keys
			for (const key of currentKeys) {
				const existing = messageSiblings[key];
				if (existing) {
					newSiblings[key] = existing;
				}
			}

			// Identify which parents actually need processing
			// Process if:
			// 1. Any message in the group is missing its sibling data
			const parentIdsToProcess = [...messagesByParent.keys()].filter(
				(parentId) => {
					const msgs = messagesByParent.get(parentId) ?? [];
					return msgs.some((m) => {
						const key = `${m.parentId ?? "null"}:${m.role}`;

						// If missing, we need to fetch
						if (!newSiblings[key]) return true;

						// Verify content consistency:
						// If the current message ID is NOT in the cached siblings list,
						// it means we have a new version, so we must refresh
						const cached = newSiblings[key];
						if (!cached) return true;

						return !cached.siblings.some((s) => s.id === m.id);
					});
				},
			);

			if (parentIdsToProcess.length === 0) {
				// Still need to update to remove old entries
				messageSiblings = newSiblings;
				return;
			}

			// Batch sibling loading
			const batchSize = 5;
			for (let i = 0; i < parentIdsToProcess.length; i += batchSize) {
				const batch = parentIdsToProcess.slice(i, i + batchSize);

				await Promise.all(
					batch.map(async (parentId) => {
						try {
							const messagesInGroup =
								messagesByParent.get(parentId) ?? [];
							if (messagesInGroup.length === 0) return;

							const messagesByRole = new Map<
								string,
								typeof messages
							>();
							for (const m of messagesInGroup) {
								if (!messagesByRole.has(m.role))
									messagesByRole.set(m.role, []);
								messagesByRole.get(m.role)!.push(m);
							}

							for (const [
								role,
								validMessages,
							] of messagesByRole) {
								if (validMessages.length === 0) continue;

								// Fetch siblings for one representative message
								const rep = validMessages[0];
								const roleResult =
									await chatStore.getMessageSiblings(rep.id);

								// Store using composite key
								const key = `${rep.parentId ?? "null"}:${rep.role}`;

								newSiblings[key] = {
									siblings: roleResult.siblings,
								};
							}

							loadedSiblingsFor.add(parentId);
						} catch (e) {
							console.error(
								"Error loading siblings for parent",
								parentId,
								e,
							);
						}
					}),
				);

				if (i + batchSize < parentIdsToProcess.length) {
					await tick();
				}
			}

			// Reassign to trigger Svelte reactivity
			messageSiblings = newSiblings;
		} finally {
			isLoadingSiblings = false;
		}
	}

	function scrollToBottom() {
		if (messageContainer) {
			messageContainer.scrollTo({
				top: messageContainer.scrollHeight,
				behavior: "smooth",
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
				<h2 class="text-2xl font-bold text-[#e2e8f0] mb-2">
					Start a conversation
				</h2>
				<p class="text-[#718096]">Send a message to begin chatting</p>
			</div>
		</div>
	{:else}
		<div class="max-w-4xl mx-auto space-y-4 mb-4">
			{#each messages as message, index (message.id)}
				{@const siblingKey = `${message.parentId ?? "null"}:${message.role}`}
				{@const siblingData = messageSiblings[siblingKey]}
				{@const rawSiblings = siblingData?.siblings || [message]}
				{@const effectiveSiblings = rawSiblings.filter(
					(s: Message) =>
						(s.parentId ?? null) === (message.parentId ?? null),
				)}
				{@const safeSiblings =
					effectiveSiblings.length > 0
						? effectiveSiblings
						: [message]}
				{@const effectiveIndex = safeSiblings.findIndex(
					(s: Message) => s.id === message.id,
				)}
				<div style="animation-delay: {index * 0.05}s">
					<MessageBubble
						{message}
						siblings={safeSiblings}
						currentIndex={effectiveIndex}
					/>
				</div>
			{/each}

			{#if isStreaming && isMultiModel}
				<!-- Multi-model streaming display -->
				<div
					class="multi-model-streaming space-y-4"
					class:grid={displayMode === "split"}
					class:grid-cols-2={displayMode === "split"}
				>
					{#each Array.from(multiModelBuffers.entries()) as [modelId, content] (modelId)}
						<MessageBubble
							message={{
								id: `streaming-${modelId}`,
								role: "assistant",
								content: content,
								model: modelId,
								timestamp: new Date(),
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
