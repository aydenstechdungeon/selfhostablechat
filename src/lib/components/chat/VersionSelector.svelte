<script lang="ts">
	import type { Message } from '$lib/types';
	import { ChevronLeft, ChevronRight, GitBranch } from 'lucide-svelte';

	interface Props {
		siblings: Message[];
		currentIndex: number;
		onSwitch: (messageId: string) => void;
		messageRole?: 'user' | 'assistant';
	}

	let { siblings, currentIndex, onSwitch, messageRole = 'assistant' }: Props = $props();

	let totalVersions = $derived(siblings.length);
	let displayIndex = $derived(currentIndex + 1);

	function goToPrevious() {
		if (currentIndex > 0) {
			const newIndex = currentIndex - 1;
			onSwitch(siblings[newIndex].id);
		}
	}

	function goToNext() {
		if (currentIndex < totalVersions - 1) {
			const newIndex = currentIndex + 1;
			onSwitch(siblings[newIndex].id);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowLeft') {
			e.preventDefault();
			goToPrevious();
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			goToNext();
		}
	}
</script>

{#if totalVersions > 1}
	<div
		class="version-selector flex items-center gap-1 mt-3 pt-2 border-t {messageRole === 'user' ? 'border-white/30' : 'border-white/30'}"
		tabindex="0"
		role="toolbar"
		aria-label="{messageRole === 'user' ? 'Prompt version selector' : 'Response version selector'}"
		onkeydown={handleKeydown}
	>
		{#if messageRole === 'user'}
			<GitBranch size={12} class="text-white/80 mr-1" aria-hidden="true" />
		{:else}
			<GitBranch size={12} class="text-[#e2e8f0] mr-1" aria-hidden="true" />
		{/if}
		<button
			class="p-1 rounded hover:bg-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed {messageRole === 'user' ? 'text-white' : 'text-[#e2e8f0]'}"
			onclick={goToPrevious}
			disabled={currentIndex === 0}
			title={messageRole === 'user' ? "Previous prompt version (Left arrow)" : "Previous version (Left arrow)"}
			aria-label={messageRole === 'user' ? "Previous prompt version" : "Previous version"}
		>
			<ChevronLeft size={14} />
		</button>

		<span
			class="text-xs font-medium tabular-nums min-w-[3ch] text-center {messageRole === 'user' ? 'text-white' : 'text-[#e2e8f0]'}"
			aria-live="polite"
			aria-atomic="true"
		>
			{displayIndex}/{totalVersions}
		</span>

		<button
			class="p-1 rounded hover:bg-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed {messageRole === 'user' ? 'text-white' : 'text-[#e2e8f0]'}"
			onclick={goToNext}
			disabled={currentIndex === totalVersions - 1}
			title={messageRole === 'user' ? "Next prompt version (Right arrow)" : "Next version (Right arrow)"}
			aria-label={messageRole === 'user' ? "Next prompt version" : "Next version"}
		>
			<ChevronRight size={14} />
		</button>
	</div>
{/if}
