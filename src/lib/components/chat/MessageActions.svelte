<script lang="ts">
	import { BarChart3, Copy, RefreshCw, Trash2, Edit2, ThumbsUp, ThumbsDown } from 'lucide-svelte';
	import { statsStore } from '$lib/stores/statsStore';
	import { chatStore } from '$lib/stores/chatStore';
	import { toastStore } from '$lib/stores/toastStore';
	
	interface Props {
		messageId: string;
		role: 'user' | 'assistant';
		content: string;
		isEdited?: boolean;
		onEdit?: () => void;
		stats?: any;
	}
	
	let { messageId, role, content, isEdited, onEdit, stats }: Props = $props();
	let deleteConfirm = $state(false);
	let feedback: 'like' | 'dislike' | null = $state(null);
	
	function handleLike() {
		feedback = feedback === 'like' ? null : 'like';
		// TODO: Send feedback to backend when implemented
	}
	
	function handleDislike() {
		feedback = feedback === 'dislike' ? null : 'dislike';
		// TODO: Send feedback to backend when implemented
	}
	
	function handleViewStats() {
		// Use actual stats from the message if available
		if (stats) {
			statsStore.setMessageStats(messageId, stats);
			// Open stats panel via UI store or event
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('open-message-stats', { detail: { messageId } }));
			}
		}
	}
	
	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(content);
			toastStore.show('Message copied to clipboard', 'success');
		} catch (err) {
			toastStore.show('Failed to copy message', 'error');
		}
	}
	
	async function handleRegenerate() {
		// Find the parent user message for this assistant message
		const messages = getCurrentMessages();
		const assistantIndex = messages.findIndex(m => m.id === messageId);
		if (assistantIndex > 0) {
			const userMessage = messages[assistantIndex - 1];
			if (userMessage.role === 'user') {
				await chatStore.regenerateResponse(userMessage.id);
				toastStore.show('Regenerating response...', 'info');
			}
		}
	}
	
	function getCurrentMessages() {
		let messages: any[] = [];
		const unsubscribe = chatStore.subscribe(s => { messages = s.messages; });
		unsubscribe();
		return messages;
	}
	
	function handleDelete() {
		if (!deleteConfirm) {
			deleteConfirm = true;
			toastStore.show('Click delete again to confirm', 'info');
			setTimeout(() => deleteConfirm = false, 3000);
			return;
		}
		chatStore.deleteMessage(messageId);
		toastStore.show('Message deleted', 'success');
	}
	
	function handleEdit() {
		if (onEdit) {
			onEdit();
		}
	}
</script>

<div class="message-actions flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
	{#if role === 'assistant'}
		<!-- Feedback buttons for assistant messages -->
		<button
			class="action-btn p-1.5 rounded-lg transition-all duration-200 hover:bg-[#2d3748] hover:scale-110 active:scale-95 {feedback === 'like' ? 'bg-green-500/20' : ''}"
			onclick={handleLike}
			title="Helpful"
		>
			<ThumbsUp size={14} class={feedback === 'like' ? 'text-[#48bb78]' : 'text-[#a0aec0]'} />
		</button>
		<button
			class="action-btn p-1.5 rounded-lg transition-all duration-200 hover:bg-[#2d3748] hover:scale-110 active:scale-95 {feedback === 'dislike' ? 'bg-red-500/20' : ''}"
			onclick={handleDislike}
			title="Not helpful"
		>
			<ThumbsDown size={14} class={feedback === 'dislike' ? 'text-[#f56565]' : 'text-[#a0aec0]'} />
		</button>
		<div class="w-px h-4 bg-[#2d3748] mx-1"></div>
		<button
			class="action-btn p-1.5 rounded-lg transition-all duration-200 hover:bg-[#2d3748] hover:scale-110 active:scale-95"
			onclick={handleViewStats}
			title="View Statistics"
		>
			<BarChart3 size={14} class="text-[#a0aec0]" />
		</button>
	{/if}

	<button
		class="action-btn p-1.5 rounded-lg transition-all duration-200 hover:bg-[#2d3748] hover:scale-110 active:scale-95"
		onclick={handleCopy}
		title="Copy"
	>
		<Copy size={14} class="text-[#a0aec0]" />
	</button>

	{#if role === 'assistant'}
		<button
			class="action-btn p-1.5 rounded-lg transition-all duration-200 hover:bg-[#2d3748] hover:scale-110 active:scale-95"
			onclick={handleRegenerate}
			title="Regenerate"
		>
			<RefreshCw size={14} class="text-[#a0aec0]" />
		</button>
	{/if}

	{#if role === 'user'}
		<button
			class="action-btn p-1.5 rounded-lg transition-all duration-200 hover:bg-[#2d3748] hover:scale-110 active:scale-95"
			onclick={handleEdit}
			title="Edit"
		>
			<Edit2 size={14} class="text-[#a0aec0]" />
		</button>
	{/if}

	<button
		class="action-btn p-1.5 rounded-lg transition-all duration-200 hover:bg-red-500/20 hover:scale-110 active:scale-95 {deleteConfirm ? 'bg-red-500/20 animate-pulse' : ''}"
		onclick={handleDelete}
		title={deleteConfirm ? 'Click again to confirm' : 'Delete'}
	>
		<Trash2 size={12} class={deleteConfirm ? 'text-[#f56565]' : 'text-[#a0aec0]'} />
	</button>
</div>
