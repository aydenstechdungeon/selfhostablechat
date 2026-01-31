<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { uiStore } from '$lib/stores/uiStore';
  import { formatRelativeTime } from '$lib/utils/helpers';
  import { chatDB, type StoredChat } from '$lib/stores/indexedDB';
  import { onMount } from 'svelte';
  import { Trash2 } from 'lucide-svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	
	let { searchQuery = '' }: { searchQuery: string } = $props();
  let theme = $derived($uiStore.theme);
  let chats: StoredChat[] = $state([]);
  let isLoading = $state(true);
  
  let deleteModalOpen = $state(false);
  let chatToDelete: string | null = $state(null);
  
  async function loadChats() {
    isLoading = true;
    try {
      chats = await chatDB.getAllChats();
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      isLoading = false;
    }
  }
  
  onMount(() => {
    loadChats();
    // Listen for chat updates from other components
    const handleChatUpdate = () => loadChats();
    window.addEventListener('chat-updated', handleChatUpdate);
    return () => window.removeEventListener('chat-updated', handleChatUpdate);
  });
  
  let filteredChats = $derived(
    chats.filter(chat => 
      chat.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
  
  let activeChatId = $derived($page.params.id);
  
  function selectChat(chatId: string) {
    goto(`/chat/${chatId}`);
  }
  
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
        goto('/chat/new');
      }
    }
    await loadChats();
    closeDeleteModal();
  }
  
  let textPrimary = $derived(theme === 'light' ? '#1f2937' : '#e2e8f0');
  let textSecondary = $derived(theme === 'light' ? '#718096' : '#718096');
  let activeBg = $derived(theme === 'light' ? '#f3f4f6' : '#2d3748');
  let hoverBg = $derived(theme === 'light' ? '#f3f4f6' : '#2d3748');
</script>

<div class="chat-list flex-1 overflow-y-auto px-2 py-2">
  {#if isLoading}
    <div class="text-center py-8 text-sm" style:color={textSecondary}>
      Loading chats...
    </div>
  {:else if filteredChats.length === 0}
    <div class="text-center py-8 text-sm" style:color={textSecondary}>
      {#if searchQuery}
        No chats found
      {:else}
        No chats yet. Start a new conversation!
      {/if}
    </div>
  {:else}
    {#each filteredChats as chat, index (chat.id)}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="chat-row w-full flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-all duration-200 mb-1 group animate-fade-in-up hover:translate-x-1"
        style:background-color={activeChatId === chat.id ? activeBg : 'transparent'}
        style:animation-delay="{index * 0.03}s"
        onmouseenter={(e) => activeChatId !== chat.id && (e.currentTarget.style.backgroundColor = hoverBg)}
        onmouseleave={(e) => activeChatId !== chat.id && (e.currentTarget.style.backgroundColor = 'transparent')}
        onclick={() => selectChat(chat.id)}
      >
        <div class="row-left flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <h4 class="chat-title text-sm font-semibold truncate" style:color={textPrimary}>
              {chat.title}
            </h4>
          </div>
          <p class="chat-preview text-xs truncate" style:color={textSecondary}>
            {chat.messageCount} messages · ${chat.totalCost.toFixed(2)}
          </p>
        </div>

        <div class="row-right flex-shrink-0 flex items-center gap-2">
          <span class="timestamp text-[11px] whitespace-nowrap" style:color={textSecondary}>
            {formatRelativeTime(new Date(chat.updatedAt))}
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
      </div>
    {/each}
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
