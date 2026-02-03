<script lang="ts">
	import {
		BarChart3,
		Copy,
		RefreshCw,
		Trash2,
		Edit2,
		ThumbsUp,
		ThumbsDown,
		MoreHorizontal,
		X,
	} from "lucide-svelte";
	import { statsStore } from "$lib/stores/statsStore";
	import { chatStore } from "$lib/stores/chatStore";
	import { toastStore } from "$lib/stores/toastStore";
	import { fade, scale } from "svelte/transition";
	import { onMount } from "svelte";

	interface Props {
		messageId: string;
		role: "user" | "assistant";
		content: string;
		isEdited?: boolean;
		onEdit?: () => void;
		stats?: any;
	}

	let { messageId, role, content, isEdited, onEdit, stats }: Props = $props();
	let deleteConfirm = $state(false);
	let feedback: "like" | "dislike" | null = $state(null);
	let mobileMenuOpen = $state(false);

	function handleLike() {
		feedback = feedback === "like" ? null : "like";
		mobileMenuOpen = false;
	}

	function handleDislike() {
		feedback = feedback === "dislike" ? null : "dislike";
		mobileMenuOpen = false;
	}

	function handleViewStats() {
		if (stats) {
			statsStore.setMessageStats(messageId, stats);
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("open-message-stats", {
						detail: { messageId },
					}),
				);
			}
		}
		mobileMenuOpen = false;
	}

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(content);
			toastStore.show("Message copied to clipboard", "success");
		} catch (err) {
			toastStore.show("Failed to copy message", "error");
		}
		mobileMenuOpen = false;
	}

	async function handleRegenerate() {
		const messages = getCurrentMessages();
		const assistantIndex = messages.findIndex((m) => m.id === messageId);
		if (assistantIndex > 0) {
			const userMessage = messages[assistantIndex - 1];
			if (userMessage.role === "user") {
				await chatStore.regenerateResponse(userMessage.id);
				toastStore.show("Regenerating response...", "info");
			}
		}
		mobileMenuOpen = false;
	}

	function getCurrentMessages() {
		let messages: any[] = [];
		const unsubscribe = chatStore.subscribe((s) => {
			messages = s.messages;
		});
		unsubscribe();
		return messages;
	}

	function handleDelete() {
		if (!deleteConfirm) {
			deleteConfirm = true;
			toastStore.show("Click delete again to confirm", "info");
			setTimeout(() => (deleteConfirm = false), 3000);
			return;
		}
		chatStore.deleteMessage(messageId);
		toastStore.show("Message deleted", "success");
		mobileMenuOpen = false;
	}

	function handleEdit() {
		if (onEdit) {
			onEdit();
		}
		mobileMenuOpen = false;
	}

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}
</script>

<div
	class="message-actions flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-all duration-200"
>
	<!-- Desktop View -->
	<div class="hidden md:flex items-center gap-1">
		{#if role === "assistant"}
			<!-- Feedback buttons for assistant messages -->
			<button
				class="action-btn p-1.5 rounded-lg transition-all duration-200 hover:bg-[#2d3748] hover:scale-110 active:scale-95 {feedback ===
				'like'
					? 'bg-green-500/20'
					: ''}"
				onclick={handleLike}
				title="Helpful"
			>
				<ThumbsUp
					size={14}
					class={feedback === "like"
						? "text-[#48bb78]"
						: "text-[#a0aec0]"}
				/>
			</button>
			<button
				class="action-btn p-1.5 rounded-lg transition-all duration-200 hover:bg-[#2d3748] hover:scale-110 active:scale-95 {feedback ===
				'dislike'
					? 'bg-red-500/20'
					: ''}"
				onclick={handleDislike}
				title="Not helpful"
			>
				<ThumbsDown
					size={14}
					class={feedback === "dislike"
						? "text-[#f56565]"
						: "text-[#a0aec0]"}
				/>
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

		{#if role === "assistant"}
			<button
				class="action-btn p-1.5 rounded-lg transition-all duration-200 hover:bg-[#2d3748] hover:scale-110 active:scale-95"
				onclick={handleRegenerate}
				title="Regenerate"
			>
				<RefreshCw size={14} class="text-[#a0aec0]" />
			</button>
		{/if}

		{#if role === "user"}
			<button
				class="action-btn p-1.5 rounded-lg transition-all duration-200 hover:bg-[#2d3748] hover:scale-110 active:scale-95"
				onclick={handleEdit}
				title="Edit"
			>
				<Edit2 size={14} class="text-[#a0aec0]" />
			</button>
		{/if}

		<button
			class="action-btn p-1.5 rounded-lg transition-all duration-200 hover:bg-red-500/20 hover:scale-110 active:scale-95 {deleteConfirm
				? 'bg-red-500/20 animate-pulse'
				: ''}"
			onclick={handleDelete}
			title={deleteConfirm ? "Click again to confirm" : "Delete"}
		>
			<Trash2
				size={12}
				class={deleteConfirm ? "text-[#f56565]" : "text-[#a0aec0]"}
			/>
		</button>
	</div>

	<!-- Mobile View (Kebab Menu) -->
	<div class="flex md:hidden relative">
		<button
			class="p-1.5 rounded-lg transition-all duration-200 hover:bg-white/10 active:scale-95 {mobileMenuOpen
				? 'bg-white/10'
				: ''}"
			onclick={(e) => {
				e.stopPropagation();
				toggleMobileMenu();
			}}
		>
			<MoreHorizontal size={16} class="text-[#a0aec0]" />
		</button>

		{#if mobileMenuOpen}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="fixed inset-0 z-[60] bg-black/20"
				onclick={(e) => {
					e.stopPropagation();
					mobileMenuOpen = false;
				}}
			></div>
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="absolute right-0 top-full mt-2 w-48 bg-[#1a1f2e]/100 border border-[#2d3748] rounded-xl shadow-xl z-[70] overflow-hidden flex flex-col p-1"
				transition:scale={{ duration: 150, start: 0.95 }}
				onclick={(e) => e.stopPropagation()}
			>
				{#if role === "assistant"}
					<div
						class="flex items-center gap-1 p-1 border-b border-[#2d3748] mb-1"
					>
						<button
							class="flex-1 p-2 rounded-lg hover:bg-[#2d3748] flex justify-center {feedback ===
							'like'
								? 'bg-green-500/20'
								: ''}"
							onclick={handleLike}
						>
							<ThumbsUp
								size={16}
								class={feedback === "like"
									? "text-[#48bb78]"
									: "text-[#a0aec0]"}
							/>
						</button>
						<button
							class="flex-1 p-2 rounded-lg hover:bg-[#2d3748] flex justify-center {feedback ===
							'dislike'
								? 'bg-red-500/20'
								: ''}"
							onclick={handleDislike}
						>
							<ThumbsDown
								size={16}
								class={feedback === "dislike"
									? "text-[#f56565]"
									: "text-[#a0aec0]"}
							/>
						</button>
					</div>

					<button
						class="w-full text-left px-3 py-2 rounded-lg hover:bg-[#2d3748] flex items-center gap-3 text-sm text-[#e2e8f0]"
						onclick={handleViewStats}
					>
						<BarChart3 size={16} class="text-[#a0aec0]" />
						<span>View Statistics</span>
					</button>
				{/if}

				<button
					class="w-full text-left px-3 py-2 rounded-lg hover:bg-[#2d3748] flex items-center gap-3 text-sm text-[#e2e8f0]"
					onclick={handleCopy}
				>
					<Copy size={16} class="text-[#a0aec0]" />
					<span>Copy Message</span>
				</button>

				{#if role === "assistant"}
					<button
						class="w-full text-left px-3 py-2 rounded-lg hover:bg-[#2d3748] flex items-center gap-3 text-sm text-[#e2e8f0]"
						onclick={handleRegenerate}
					>
						<RefreshCw size={16} class="text-[#a0aec0]" />
						<span>Regenerate</span>
					</button>
				{/if}

				{#if role === "user"}
					<button
						class="w-full text-left px-3 py-2 rounded-lg hover:bg-[#2d3748] flex items-center gap-3 text-sm text-[#e2e8f0]"
						onclick={handleEdit}
					>
						<Edit2 size={16} class="text-[#a0aec0]" />
						<span>Edit Message</span>
					</button>
				{/if}

				<div class="border-t border-[#2d3748] my-1"></div>

				<button
					class="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/10 flex items-center gap-3 text-sm text-red-400"
					onclick={handleDelete}
				>
					<Trash2 size={16} />
					<span>{deleteConfirm ? "Confirm Delete" : "Delete"}</span>
				</button>
			</div>
		{/if}
	</div>
</div>
