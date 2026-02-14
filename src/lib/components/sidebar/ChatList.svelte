<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { uiStore } from "$lib/stores/uiStore";
  import { formatRelativeTime } from "$lib/utils/helpers";
  import { chatDB, type StoredChat } from "$lib/stores/indexedDB";
  import { now } from "$lib/stores/timeStore";
  import { onMount, onDestroy } from "svelte";
  import { Trash2, Loader2 } from "lucide-svelte";
  import ConfirmModal from "$lib/components/ui/ConfirmModal.svelte";
  import {
    filterStore,
    filterAndSortChats,
    formatCost,
  } from "$lib/stores/filterStore";
  import { streamingStore } from "$lib/stores/streamingStore";

  // Props
  let {
    searchQuery = "",
    collapsed = false,
  }: { searchQuery: string; collapsed?: boolean } = $props();

  let theme = $derived($uiStore.theme);
  let allChats: StoredChat[] = $state([]);
  let isLoading = $state(true);
  let filters = $derived($filterStore);
  let filteredChats: StoredChat[] = $state([]);
  let isFiltering = $state(false);

  // Async filtering effect
  $effect(() => {
    const doFilter = async () => {
      isFiltering = true;
      filteredChats = await filterAndSortChats(allChats, filters);
      isFiltering = false;
    };
    doFilter();
  });

  // Pagination state
  const CHATS_PER_PAGE = 20;
  let visibleCount = $state(CHATS_PER_PAGE);
  let isLoadingMore = $state(false);

  let hasMoreInDB = $state(true);
  let areAllChatsLoaded = $state(false);

  let isSimpleView = $derived(
    !searchQuery &&
      filters.dateRange === "all" &&
      filters.minCost === null &&
      filters.maxCost === null &&
      filters.selectedModels.length === 0 &&
      filters.sortBy === "recent",
  );

  let hasMore = $derived(
    visibleCount < filteredChats.length || (isSimpleView && hasMoreInDB),
  );
  let scrollContainer: HTMLDivElement | null = $state(null);

  let deleteModalOpen = $state(false);
  let chatToDelete: string | null = $state(null);

  // Preserve sidebar scroll position across updates
  let preservedSidebarScrollTop = $state(0);

  // Update search query in filter store
  $effect(() => {
    filterStore.setSearchQuery(searchQuery);
  });

  // Handle scroll to preserve position
  function handleSidebarScroll() {
    if (scrollContainer) {
      preservedSidebarScrollTop = scrollContainer.scrollTop;
    }
  }

  // Restore scroll position after chats load (unless it's initial load)
  $effect(() => {
    if (!isLoading && scrollContainer && preservedSidebarScrollTop > 0) {
      scrollContainer.scrollTop = preservedSidebarScrollTop;
    }
  });

  // Only show visible chats
  let visibleChats = $derived(filteredChats.slice(0, visibleCount));

  // Track if this is the initial load vs an update
  let isInitialLoad = $state(true);
  // Track previous chat count to detect meaningful changes
  let previousChatCount = $state(0);
  // Track if a chat was just completed (to avoid flicker)
  let justCompletedChat = $state(false);

  async function loadChats(preserveScroll = false) {
    if (isInitialLoad) {
      isLoading = true;
    }
    try {
      let newChats: StoredChat[];

      if (isSimpleView && !areAllChatsLoaded) {
        // If preserving scroll/state (like during streaming updates), ensure we keep existing items
        // Otherwise load just the first page
        const limit = preserveScroll
          ? Math.max(allChats.length, CHATS_PER_PAGE)
          : CHATS_PER_PAGE;

        newChats = await chatDB.getChats({ limit, offset: 0 });

        // If we got fewer chats than requested, or exactly the requested amount but it's small, checks
        // For strict correctness we might need a count query, but this heuristic works for infinite scroll
        // If we got less than limit, we definitely reached the end.
        if (newChats.length < limit) {
          hasMoreInDB = false;
        } else {
          hasMoreInDB = true;
        }
      } else {
        newChats = await chatDB.getAllChats();
        areAllChatsLoaded = true;
        hasMoreInDB = false;
      }

      const newCount = newChats.length;

      // Detect if this is just a completion update (same count but state change)
      // vs a meaningful change (new chat added, chat deleted)
      const isMeaningfulChange = newCount !== previousChatCount;

      // Always update the chats list
      allChats = newChats;
      previousChatCount = newCount;

      // If we have a scroll container and want to preserve scroll position
      if (
        preserveScroll &&
        scrollContainer &&
        !isMeaningfulChange &&
        !justCompletedChat
      ) {
        // Don't reset scroll position for streaming state updates
      }
    } catch (error) {
      console.error("Failed to load chats:", error);
    } finally {
      isLoading = false;
      isInitialLoad = false;
    }
  }

  onMount(() => {
    loadChats();

    // Listen for chat updates from other components
    // Use a debounced reload to prevent rapid re-renders during streaming
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let lastUpdateTime = 0;

    const handleChatUpdate = () => {
      const now = Date.now();
      // Prevent updates more frequently than every 250ms
      // This eliminates flicker during streaming completion
      if (now - lastUpdateTime < 250) {
        if (debounceTimer) clearTimeout(debounceTimer);
      }
      lastUpdateTime = now;

      debounceTimer = setTimeout(() => {
        // Check if any chat just completed streaming
        const hadActiveStreams = Array.from(
          $streamingStore.streamingChats.values(),
        ).some((s) => !s.isStreaming && s.completedAt);
        justCompletedChat = hadActiveStreams;

        // Use silent update - don't reset scroll position
        loadChats(true);

        // Reset the flag after a short delay
        setTimeout(() => {
          justCompletedChat = false;
        }, 500);
      }, 250); // Longer debounce to batch rapid updates
    };

    window.addEventListener("chat-updated", handleChatUpdate);

    // Set up intersection observer for infinite scroll
    if (scrollContainer) {
      setupIntersectionObserver();
    }

    return () => {
      window.removeEventListener("chat-updated", handleChatUpdate);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (observer) {
        observer.disconnect();
      }
    };
  });

  // Intersection Observer for infinite scroll
  let observer: IntersectionObserver | null = null;
  let loadMoreTrigger: HTMLDivElement | null = $state(null);

  function setupIntersectionObserver() {
    if (!loadMoreTrigger) return;

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMore && !isLoadingMore) {
            loadMore();
          }
        });
      },
      {
        root: scrollContainer,
        rootMargin: "100px", // Start loading before reaching the bottom
        threshold: 0,
      },
    );

    observer.observe(loadMoreTrigger);
  }

  // Re-setup observer when loadMoreTrigger changes
  $effect(() => {
    if (loadMoreTrigger && observer) {
      observer.disconnect();
      setupIntersectionObserver();
    }
  });

  async function loadMore() {
    if (isLoadingMore || !hasMore) return;

    isLoadingMore = true;

    // Simulate a small delay for smooth UX
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (visibleCount < filteredChats.length) {
      visibleCount += CHATS_PER_PAGE;
    } else if (isSimpleView && hasMoreInDB) {
      // Fetch next page
      const currentLength = allChats.length;
      const nextChats = await chatDB.getChats({
        limit: CHATS_PER_PAGE,
        offset: currentLength,
      });

      if (nextChats.length < CHATS_PER_PAGE) {
        hasMoreInDB = false;
      }

      if (nextChats.length > 0) {
        allChats = [...allChats, ...nextChats];
        visibleCount += nextChats.length;
      }
    }

    isLoadingMore = false;
  }

  // Reset visible count when filters change
  $effect(() => {
    // Reset to first page when filters change
    visibleCount = CHATS_PER_PAGE;
  });

  // Reload all chats if we leave simple view and haven't loaded everything
  $effect(() => {
    if (!isSimpleView && !areAllChatsLoaded) {
      loadChats();
    }
  });

  let activeChatId = $derived($page.params.id);

  function openDeleteModal(chatId: string, event: MouseEvent) {
    event.stopPropagation();
    chatToDelete = chatId;
    deleteModalOpen = true;
  }

  function closeDeleteModal() {
    deleteModalOpen = false;
    chatToDelete = null;
  }

  async function confirmDelete() {
    if (!chatToDelete) return;

    await chatDB.deleteChat(chatToDelete);
    if (activeChatId === chatToDelete) {
      // Navigate to most recent remaining chat or create new one
      const remainingChats = await chatDB.getAllChats();
      if (remainingChats.length > 0) {
        goto(`/chat/${remainingChats[0].id}`);
      } else {
        goto("/chat/new");
      }
    }
    await loadChats();
    closeDeleteModal();
  }

  let textPrimary = $derived(theme === "light" ? "#1f2937" : "#e2e8f0");
  let textSecondary = $derived(theme === "light" ? "#718096" : "#718096");
  let activeBg = $derived(theme === "light" ? "#f3f4f6" : "#2d3748");
  let hoverBg = $derived(theme === "light" ? "#f3f4f6" : "#2d3748");

  // Track streaming state for each chat
  let streamingChats = $derived($streamingStore.streamingChats);
  // Track if any chat is currently streaming (to disable animations)
  let isAnyChatStreaming = $derived(
    Array.from(streamingChats.values()).some((s) => s.isStreaming),
  );

  function selectChat(chatId: string) {
    // Clear new messages indicator when selecting chat
    streamingStore.clearNewMessages(chatId);
    goto(`/chat/${chatId}`);
  }
</script>

<div
  bind:this={scrollContainer}
  class="chat-list flex-1 overflow-y-auto px-2 py-2"
  onscroll={handleSidebarScroll}
>
  {#if isLoading}
    <div
      class="text-center py-8 text-sm select-none"
      style:color={textSecondary}
    >
      Loading chats...
    </div>
  {:else if filteredChats.length === 0}
    <div
      class="text-center py-8 text-sm select-none"
      style:color={textSecondary}
    >
      {#if searchQuery || filters.dateRange !== "all" || filters.minCost !== null || filters.maxCost !== null || filters.selectedModels.length > 0}
        No chats match your filters
      {:else}
        No chats yet. Start a new conversation!
      {/if}
    </div>
  {:else}
    {#each visibleChats as chat, index (chat.id)}
      {@const chatStreamState = streamingChats.get(chat.id)}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="chat-row w-full flex gap-3 py-3 rounded-lg cursor-pointer transition-all duration-200 mb-1 group relative"
        class:animate-fade-in-up={!isAnyChatStreaming && isInitialLoad}
        class:flex-col={collapsed}
        class:items-center={!collapsed}
        class:px-3={!collapsed}
        class:px-2={collapsed}
        class:hover:translate-x-1={!collapsed}
        style:background-color={activeChatId === chat.id
          ? activeBg
          : "transparent"}
        style:animation-delay={!isAnyChatStreaming && isInitialLoad
          ? `${index * 0.03}s`
          : "0s"}
        onmouseenter={(e) =>
          activeChatId !== chat.id &&
          (e.currentTarget.style.backgroundColor = hoverBg)}
        onmouseleave={(e) =>
          activeChatId !== chat.id &&
          (e.currentTarget.style.backgroundColor = "transparent")}
        onclick={() => selectChat(chat.id)}
        title={collapsed ? chat.title : ""}
      >
        {#if collapsed}
          <!-- Collapsed View: Simplified without avatar -->
          <div class="flex flex-col items-center gap-2 w-full relative">
            {#if chatStreamState?.isStreaming}
              <div class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            {:else if chatStreamState?.hasNewMessages}
              <div class="w-2 h-2 rounded-full bg-green-500"></div>
            {:else}
              <div class="w-2 h-2"></div>
            {/if}
            <span
              class="timestamp text-[9px] whitespace-nowrap"
              style:color={textSecondary}
            >
              {$now && formatRelativeTime(new Date(chat.updatedAt))}
            </span>
            <button
              class="opacity-100 p-1 rounded-lg transition-all duration-200 hover:text-red-500 hover:bg-red-500/10 hover:scale-110 active:scale-95"
              style:color={textSecondary}
              onclick={(e) => openDeleteModal(chat.id, e)}
              title="Delete chat"
            >
              <Trash2 size={12} />
            </button>
          </div>
        {:else}
          <div class="row-left flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h4
                class="chat-title text-sm font-semibold truncate"
                style:color={textPrimary}
              >
                {chat.title}
              </h4>
              {#if chatStreamState?.isStreaming}
                <span
                  class="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0"
                  title="Generating..."
                ></span>
              {:else if chatStreamState?.hasNewMessages}
                <span
                  class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"
                  title="New messages"
                ></span>
              {/if}
            </div>
            <p
              class="chat-preview text-xs truncate"
              style:color={textSecondary}
            >
              {chat.messageCount} messages · {formatCost(chat.totalCost)}
            </p>
          </div>
        {/if}

        {#if !collapsed}
          <div class="row-right flex-shrink-0 flex items-center gap-2">
            <span
              class="timestamp text-[11px] whitespace-nowrap"
              style:color={textSecondary}
            >
              {$now && formatRelativeTime(new Date(chat.updatedAt))}
            </span>
            <button
              class="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all duration-200 hover:text-red-500 hover:bg-red-500/10 hover:scale-110 active:scale-95"
              style:color={textSecondary}
              onclick={(e) => openDeleteModal(chat.id, e)}
              title="Delete chat"
            >
              <Trash2 size={14} />
            </button>
          </div>
        {/if}
      </div>
    {/each}

    <!-- Load more trigger element -->
    <div
      bind:this={loadMoreTrigger}
      class="load-more-trigger h-16 flex items-center justify-center"
    >
      {#if isLoadingMore}
        <div class="flex items-center gap-2" style:color={textSecondary}>
          <Loader2 size={16} class="animate-spin" />
          <span class="text-xs">Loading more...</span>
        </div>
      {:else if filteredChats.length > CHATS_PER_PAGE}
        <div class="text-xs" style:color={textSecondary}>
          Showing all {filteredChats.length} chats
        </div>
      {/if}
    </div>
  {/if}
</div>

<ConfirmModal
  isOpen={deleteModalOpen}
  title="Delete Chat"
  message="Are you sure you want to delete this chat? This action cannot be undone."
  confirmLabel="Delete"
  cancelLabel="Cancel"
  variant="danger"
  onConfirm={confirmDelete}
  onCancel={closeDeleteModal}
/>

<style>
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fade-in-up {
    animation: fadeInUp 0.3s ease-out forwards;
    opacity: 0;
  }
</style>
