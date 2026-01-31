<script lang="ts">
	import type { Message } from '$lib/types';
	import { ChevronLeft, ChevronRight, GitBranch } from 'lucide-svelte';

	interface Props {
		siblings: Message[];
		currentIndex: number;
		onSwitch: (messageId: string, index: number) => void;
		messageRole?: 'user' | 'assistant';
	}

	let { siblings, currentIndex, onSwitch, messageRole = 'assistant' }: Props = $props();

	let totalVersions = $derived(siblings.length);
	let displayIndex = $derived(currentIndex + 1);

	function goToPrevious() {
		if (currentIndex > 0) {
			const newIndex = currentIndex - 1;
			onSwitch(siblings[newIndex].id, newIndex);
		}
	}

	function goToNext() {
		if (currentIndex < totalVersions - 1) {
			const newIndex = currentIndex + 1;
			onSwitch(siblings[newIndex].id, newIndex);
		}
	}
</script>

<div class="version-selector flex items-center gap-1 mt-3 pt-2 border-t {messageRole === 'user' ? 'border-[#4299e1]/50' : 'border-white/30'}">
	{#if messageRole === 'user'}
		<GitBranch size={12} class="text-[#4299e1] mr-1" />
	{:else}
		<GitBranch size={12} class="text-[#e2e8f0] mr-1" />
	{/if}
	<button
		class="p-1 rounded hover:bg-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed {messageRole === 'user' ? 'text-[#4299e1]' : 'text-[#e2e8f0]'}"
		onclick={goToPrevious}
		disabled={currentIndex === 0}
		title={messageRole === 'user' ? "Previous prompt version" : "Previous version"}
	>
		<ChevronLeft size={14} />
	</button>

	<span class="text-xs font-medium tabular-nums min-w-[3ch] text-center {messageRole === 'user' ? 'text-[#4299e1]' : 'text-[#e2e8f0]'}">
		{displayIndex}/{totalVersions}
	</span>

	<button
		class="p-1 rounded hover:bg-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed {messageRole === 'user' ? 'text-[#4299e1]' : 'text-[#e2e8f0]'}"
		onclick={goToNext}
		disabled={currentIndex === totalVersions - 1}
		title={messageRole === 'user' ? "Next prompt version" : "Next version"}
	>
		<ChevronRight size={14} />
	</button>
</div>
