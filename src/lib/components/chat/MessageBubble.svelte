<script lang="ts">
	import type { Message } from "$lib/types";
	import { formatRelativeTime, formatFileSize } from "$lib/utils/helpers";
	import { parseMarkdown, initCodeCopyButtons } from "$lib/utils/markdown";
	import MessageActions from "./MessageActions.svelte";
	import VersionSelector from "./VersionSelector.svelte";
	import ReasoningDisplay from "./ReasoningDisplay.svelte";
	import ImageModal from "$lib/components/media/ImageModal.svelte";
	import {
		User,
		Bot,
		Edit3,
		Check,
		X,
		AlertCircle,
		FileText,
		Music,
		Film,
		File,
		Globe,
		ExternalLink,
	} from "lucide-svelte";
	import { chatStore, isStreaming } from "$lib/stores/chatStore";
	import { toastStore } from "$lib/stores/toastStore";
	import { tick } from "svelte";

	interface Props {
		message: Message;
		streaming?: boolean;
		siblings?: Message[];
		currentIndex?: number;
	}

	let {
		message,
		streaming = false,
		siblings = [],
		currentIndex = 0,
	}: Props = $props();

	// Detect if this message is currently being streamed into
	// (streaming is active and message has empty content or no stats yet)
	let isBeingStreamed = $derived(
		$isStreaming &&
			message.role === "assistant" &&
			(message.content === "" || !message.stats),
	);

	// Combined streaming state (explicit prop or detected)
	let showStreaming = $derived(streaming || isBeingStreamed);

	// Image modal state
	let selectedImageUrl = $state<string | null>(null);
	let selectedImageAlt = $state("");

	function openImageModal(imageUrl: string, alt: string) {
		selectedImageUrl = imageUrl;
		selectedImageAlt = alt;
	}

	function closeImageModal() {
		selectedImageUrl = null;
		selectedImageAlt = "";
	}

	let isEditing = $state(false);
	let editContent = $state("");
	let isSaving = $state(false);
	let contentElement: HTMLDivElement | undefined = $state();

	// Parse markdown content for assistant messages with streaming awareness
	let parsedContent = $derived(
		message.role === "assistant"
			? parseMarkdown(message.content, showStreaming)
			: null,
	);

	// Initialize copy buttons after content updates (debounced for streaming performance)
	let initTimeout: ReturnType<typeof setTimeout> | null = null;
	let lastContentLength = $state(0);

	$effect(() => {
		if (parsedContent && contentElement) {
			// Skip re-initializing for small content changes during streaming
			if (showStreaming) {
				const contentLength = message.content.length;
				// Only re-init every ~100 chars during streaming or when streaming ends
				if (contentLength - lastContentLength < 100 && showStreaming) {
					return;
				}
				lastContentLength = contentLength;
			}

			// Clear previous timeout to debounce during streaming
			if (initTimeout) clearTimeout(initTimeout);
			// Delay initialization to avoid excessive DOM updates during streaming
			initTimeout = setTimeout(
				() => {
					tick().then(() => {
						if (contentElement) {
							initCodeCopyButtons(contentElement);
						}
					});
				},
				showStreaming ? 800 : 100,
			);
		}

		return () => {
			if (initTimeout) clearTimeout(initTimeout);
		};
	});

	// Reset lastContentLength when streaming ends
	$effect(() => {
		if (!showStreaming) {
			lastContentLength = 0;
		}
	});

	function startEdit() {
		if (message.role !== "user") return;
		editContent = message.content;
		isEditing = true;
	}

	function cancelEdit() {
		isEditing = false;
		editContent = message.content;
	}

	async function saveEdit() {
		if (!editContent.trim()) {
			toastStore.show("Message cannot be empty", "error");
			return;
		}

		if (editContent === message.content) {
			isEditing = false;
			return;
		}

		isSaving = true;
		try {
			await chatStore.editAndRegenerate(message.id, editContent);
			isEditing = false;
			toastStore.show(
				"Message updated and response regenerated",
				"success",
			);
		} catch (error) {
			toastStore.show("Failed to update message", "error");
		} finally {
			isSaving = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
			saveEdit();
		} else if (e.key === "Escape") {
			cancelEdit();
		}
	}

	async function handleVersionSwitch(messageId: string) {
		await chatStore.switchVersion(messageId);
	}

	// Listen for open-image-modal event from rendered markdown
	function handleOpenImageModal(e: Event) {
		const customEvent = e as CustomEvent<{ url: string; alt: string }>;
		openImageModal(customEvent.detail.url, customEvent.detail.alt);
	}

	// Setup event listener on mount
	$effect(() => {
		window.addEventListener("open-image-modal", handleOpenImageModal);
		return () => {
			window.removeEventListener(
				"open-image-modal",
				handleOpenImageModal,
			);
		};
	});

	// SECURITY: Event delegation for image preview buttons (replaces inline onclick)
	$effect(() => {
		if (!contentElement) return;

		const handleImageClick = (e: MouseEvent) => {
			const button = (e.target as HTMLElement).closest(
				".image-preview-button",
			);
			if (button) {
				const url = button.getAttribute("data-image-url");
				const alt = button.getAttribute("data-image-alt") || "Image";
				if (url) {
					openImageModal(url, alt);
				}
			}
		};

		contentElement.addEventListener("click", handleImageClick);
		return () => {
			if (contentElement) {
				contentElement.removeEventListener("click", handleImageClick);
			}
		};
	});

	// Get icon for file type
	function getFileIcon(type: string) {
		switch (type) {
			case "video":
				return Film;
			case "audio":
				return Music;
			case "document":
				return FileText;
			default:
				return File;
		}
	}

	// Get file type label
	function getFileTypeLabel(type: string, mimeType?: string): string {
		if (type === "video") return "Video";
		if (type === "audio") return "Audio";
		if (type === "document") {
			if (mimeType?.includes("pdf")) return "PDF";
			if (mimeType?.includes("json")) return "JSON";
			if (mimeType?.includes("csv")) return "CSV";
			if (mimeType?.includes("markdown") || mimeType?.includes("md"))
				return "Markdown";
			return "Document";
		}
		return "File";
	}
</script>

<div
	class="message-bubble group flex gap-2 md:gap-3 animate-fade-in-up {message.role ===
	'user'
		? 'flex-row-reverse'
		: ''}"
>
	<div
		class="message-avatar w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-200 hover:scale-110 {message.role ===
		'user'
			? 'bg-[#4299e1]'
			: 'bg-[#2d3748]'}"
	>
		{#if message.role === "user"}
			<User size={16} class="text-white md:size-[18px]" />
		{:else}
			<Bot size={16} class="text-[#4299e1] md:size-[18px]" />
		{/if}
	</div>

	<div
		class="message-content max-w-[90%] md:max-w-[75%] lg:max-w-[70%] min-w-[140px] md:min-w-[200px] rounded-2xl px-3 py-2.5 md:px-4 md:py-3 transition-all duration-200 hover:shadow-lg {message.role ===
		'user'
			? 'bg-[#4299e1] text-white'
			: 'bg-[#1a1f2e] text-[#e2e8f0] border border-[#2d3748]'}"
	>
		<div
			class="message-header flex items-center justify-between gap-2 md:gap-4 mb-1.5 md:mb-2 {message.role ===
			'user'
				? 'opacity-80'
				: 'opacity-60'}"
		>
			<span
				class="text-xs font-medium flex items-center gap-1.5 md:gap-2"
			>
				{message.role === "user" ? "You" : "Assistant"}
				{#if message.model}
					<span class="px-1.5 py-0.5 rounded text-[10px] bg-white/20"
						>{message.model}</span
					>
				{/if}
				{#if message.isPartial}
					<span
						title="Generation was interrupted - partial response saved"
						class="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300"
					>
						<AlertCircle size={10} />
						<span>Partial</span>
					</span>
				{/if}
			</span>
			<div class="flex items-center gap-2">
				{#if !showStreaming}
					<MessageActions
						messageId={message.id}
						role={message.role}
						content={message.content}
						isEdited={message.isEdited}
						onEdit={startEdit}
						stats={message.stats}
					/>
				{/if}
				<span class="text-xs flex items-center gap-1">
					{formatRelativeTime(message.timestamp)}
					{#if message.isEdited}
						<span title="Edited" class="animate-fade-in">
							<Edit3 size={10} class="text-[#4299e1]" />
						</span>
					{/if}
				</span>
			</div>
		</div>

		<div class="message-body">
			<!-- Display attached media for user messages -->
			{#if message.media && message.media.length > 0}
				<div class="flex flex-wrap gap-2 mb-3">
					{#each message.media as media}
						{#if media.type === "image"}
							<button
								class="relative group overflow-hidden rounded-lg border border-[#2d3748] hover:border-[#4299e1] transition-colors"
								onclick={() =>
									openImageModal(media.url, "Attached image")}
							>
								<img
									src={media.url}
									alt=""
									class="w-24 h-24 object-cover hover:scale-105 transition-transform duration-200"
									loading="lazy"
									fetchpriority="low"
									decoding="async"
								/>
								<div
									class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center"
								>
									<span
										class="text-white opacity-0 group-hover:opacity-100 text-xs font-medium"
										>View</span
									>
								</div>
							</button>
						{:else}
							<!-- Non-image files -->
							<div
								class="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0f1419] border border-[#2d3748]"
							>
								{#if media.type === "video"}
									<Film size={20} class="text-[#4299e1]" />
								{:else if media.type === "audio"}
									<Music size={20} class="text-[#4299e1]" />
								{:else if media.type === "document"}
									<FileText
										size={20}
										class="text-[#4299e1]"
									/>
								{:else}
									<File size={20} class="text-[#4299e1]" />
								{/if}
								<div>
									<p class="text-xs font-medium">
										{media.name || "Attachment"}
									</p>
									<p class="text-[10px] opacity-60">
										{getFileTypeLabel(
											media.type,
											media.mimeType,
										)}
									</p>
								</div>
							</div>
						{/if}
					{/each}
				</div>
			{/if}

			{#if isEditing}
				<div class="edit-container">
					<textarea
						class="w-full min-h-[80px] p-3 rounded-lg bg-[#0f1419] border border-[#2d3748] text-[#e2e8f0] text-sm resize-none focus:outline-none focus:border-[#4299e1]"
						bind:value={editContent}
						onkeydown={handleKeydown}
					></textarea>
					<div class="flex justify-end gap-2 mt-2">
						<button
							class="p-1.5 rounded hover:bg-white/10 transition-colors"
							onclick={cancelEdit}
							title="Cancel"
						>
							<X size={16} />
						</button>
						<button
							class="p-1.5 rounded bg-[#48bb78] hover:bg-[#38a169] transition-colors disabled:opacity-50"
							onclick={saveEdit}
							disabled={isSaving}
							title="Save (Ctrl+Enter)"
						>
							<Check size={16} />
						</button>
					</div>
				</div>
			{:else}
				<div
					class="text-content text-sm leading-relaxed break-words min-h-[1.5em]"
					bind:this={contentElement}
				>
					{#if message.role === "assistant" && parsedContent}
						{@html parsedContent}
					{:else}
						<span class="whitespace-pre-wrap"
							>{message.content}</span
						>
					{/if}
					{#if showStreaming}
						<span
							class="streaming-cursor inline-block w-0.5 h-4 bg-current ml-0.5 animate-pulse"
						></span>
					{/if}
				</div>

				<!-- Display generated/received images for assistant messages -->
				{#if message.generatedMedia && message.generatedMedia.length > 0}
					<div class="flex flex-wrap gap-3 mt-3">
						{#each message.generatedMedia as media}
							{#if media.type === "image"}
								<button
									class="relative group overflow-hidden rounded-lg border border-[#2d3748] hover:border-[#4299e1] transition-colors"
									onclick={() =>
										openImageModal(
											media.url,
											media.name || "Generated image",
										)}
								>
									{#if media.url}
										<img
											src={media.url}
											alt={media.name || ""}
											class="max-w-full w-auto h-auto max-h-[300px] object-contain hover:scale-105 transition-transform duration-200"
											loading="lazy"
											fetchpriority="low"
											decoding="async"
										/>
									{/if}
									<div
										class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none"
									>
										<span
											class="text-white opacity-0 group-hover:opacity-100 text-xs font-medium"
											>View</span
										>
									</div>
								</button>
							{/if}
						{/each}
					</div>
				{/if}

				<!-- Web search citations for assistant messages -->
				{#if message.citations && message.citations.length > 0 && message.role === "assistant"}
					<div class="mt-4 pt-3 border-t border-[#2d3748]">
						<div class="flex items-center gap-2 mb-2">
							<Globe size={14} class="text-[#4299e1]" />
							<span class="text-xs font-medium text-[#4299e1]"
								>Web Sources</span
							>
						</div>
						<div class="flex flex-wrap gap-2">
							{#each message.citations as citation, index}
								{#if citation.type === "url_citation"}
									<a
										href={citation.url_citation.url}
										target="_blank"
										rel="noopener noreferrer"
										class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0f1419] border border-[#2d3748] hover:border-[#4299e1] transition-colors group"
										title={citation.url_citation.title}
									>
										<span
											class="text-xs text-[#4299e1] font-medium"
											>[{index + 1}]</span
										>
										<span
											class="text-xs text-[#a0aec0] truncate max-w-[150px] group-hover:text-[#e2e8f0]"
										>
											{new URL(
												citation.url_citation.url,
											).hostname.replace(/^www\./, "")}
										</span>
										<ExternalLink
											size={10}
											class="text-[#718096] group-hover:text-[#4299e1]"
										/>
									</a>
								{/if}
							{/each}
						</div>
					</div>
				{/if}

				<!-- Reasoning display for assistant messages -->
				{#if message.reasoning && message.role === "assistant"}
					<div class="mt-3">
						<ReasoningDisplay
							reasoning={message.reasoning.steps ||
								message.reasoning.rawContent ||
								""}
							model={message.model}
							compact={true}
						/>
					</div>
				{/if}

				<!-- Version selector for messages with siblings (both user and assistant) -->
				<VersionSelector
					{siblings}
					{currentIndex}
					onSwitch={handleVersionSwitch}
					messageRole={message.role}
				/>
			{/if}
		</div>
	</div>
</div>

<!-- Image Modal -->
{#if selectedImageUrl}
	<ImageModal
		imageUrl={selectedImageUrl}
		alt={selectedImageAlt}
		onClose={closeImageModal}
	/>
{/if}

<style>
	:global(.code-block) {
		font-family: "JetBrains Mono", "Fira Code", "Consolas", monospace;
	}

	:global(.code-block pre) {
		font-size: 0.85rem;
		line-height: 1.5;
	}

	:global(.code-block code) {
		font-family: inherit;
	}

	:global(.hljs) {
		background: transparent !important;
	}

	:global(.text-content ul),
	:global(.text-content ol) {
		margin: 0.5rem 0;
		padding-left: 1.5rem;
	}

	:global(.text-content li) {
		margin: 0.25rem 0;
	}

	:global(.text-content p) {
		margin: 0.5rem 0;
	}

	:global(.text-content p:first-child) {
		margin-top: 0;
	}

	:global(.text-content p:last-child) {
		margin-bottom: 0;
	}

	:global(.text-content h1),
	:global(.text-content h2),
	:global(.text-content h3),
	:global(.text-content h4),
	:global(.text-content h5),
	:global(.text-content h6) {
		margin: 1rem 0 0.5rem 0;
		font-weight: 600;
	}

	:global(.text-content h1) {
		font-size: 1.25rem;
	}
	:global(.text-content h2) {
		font-size: 1.125rem;
	}
	:global(.text-content h3) {
		font-size: 1rem;
	}

	:global(.text-content .table-container) {
		max-width: 100%;
		background-color: #1a1f2e;
	}

	:global(.text-content .table-container::-webkit-scrollbar) {
		height: 6px;
	}

	:global(.text-content .table-container::-webkit-scrollbar-track) {
		background: #0f1419;
		border-radius: 3px;
	}

	:global(.text-content .table-container::-webkit-scrollbar-thumb) {
		background: #2d3748;
		border-radius: 3px;
	}

	:global(.text-content .table-container::-webkit-scrollbar-thumb:hover) {
		background: #4a5568;
	}

	:global(.text-content table) {
		width: 100%;
		border-collapse: collapse;
	}

	:global(.text-content th),
	:global(.text-content td) {
		padding: 0.75rem 1rem;
		text-align: left;
		white-space: nowrap;
	}

	:global(.text-content th) {
		background-color: #1a1f2e;
		font-weight: 600;
		color: #e2e8f0;
	}

	:global(.text-content tr:nth-child(even)) {
		background-color: rgba(255, 255, 255, 0.02);
	}

	:global(.text-content tr:hover) {
		background-color: rgba(66, 153, 225, 0.05);
	}

	.edit-container textarea {
		font-family: inherit;
	}

	.edit-container textarea:focus {
		box-shadow: 0 0 0 2px rgba(66, 153, 225, 0.3);
	}
</style>
