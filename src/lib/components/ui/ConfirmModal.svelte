<script lang="ts">
	import { ui } from "$lib/stores/ui.svelte";
	import {
		onClickOutside,
		useKeyboardShortcut,
	} from "$lib/utils/runed-helpers.svelte";
	import { AlertTriangle, Trash2, Upload, X } from "lucide-svelte";

	interface Props {
		isOpen: boolean;
		title: string;
		message: string;
		confirmLabel?: string;
		cancelLabel?: string;
		variant?: "danger" | "warning" | "info";
		onConfirm: () => void;
		onCancel: () => void;
	}

	let {
		isOpen,
		title,
		message,
		confirmLabel = "Confirm",
		cancelLabel = "Cancel",
		variant = "danger",
		onConfirm,
		onCancel,
	}: Props = $props();

	let modalContent = $state<HTMLElement | null>(null);
	let modalOverlay = $state<HTMLElement | null>(null);

	$effect(() => {
		if (isOpen && modalOverlay) {
			document.body.appendChild(modalOverlay);
			return () => {
				if (modalOverlay?.parentNode) {
					modalOverlay.parentNode.removeChild(modalOverlay);
				}
			};
		}
	});

	// Use Runed's onClickOutside for backdrop click
	onClickOutside(
		() => modalContent,
		() => {
			if (isOpen) onCancel();
		},
	);

	// Use Runed's keyboard shortcut hook
	useKeyboardShortcut("Escape", () => {
		if (isOpen) onCancel();
	});

	useKeyboardShortcut(
		"Enter",
		() => {
			if (isOpen) onConfirm();
		},
		{ ctrl: true },
	);

	// Use the new UI store from Runed
	let theme = $derived(ui.current.theme);
	let textPrimary = $derived(theme === "light" ? "#1f2937" : "#e2e8f0");
	let textSecondary = $derived(theme === "light" ? "#6b7280" : "#a0aec0");
	let bgColor = $derived(theme === "light" ? "#ffffff" : "#1a1f2e");
	let borderColor = $derived(theme === "light" ? "#e5e7eb" : "#2d3748");
	let overlayBg = $derived(
		theme === "light" ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0.7)",
	);

	const variantColors = {
		danger: { bg: "#ef4444", hover: "#dc2626", icon: "#ef4444" },
		warning: { bg: "#f97316", hover: "#ea580c", icon: "#f97316" },
		info: { bg: "#3b82f6", hover: "#2563eb", icon: "#3b82f6" },
	};
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		bind:this={modalOverlay}
		class="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
		style:background-color={overlayBg}
	>
		<div
			bind:this={modalContent}
			class="modal-content w-full max-w-md rounded-xl border shadow-2xl animate-scale-in"
			style:background-color={bgColor}
			style:border-color={borderColor}
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
			tabindex="-1"
		>
			<!-- Header -->
			<div class="flex items-start gap-4 p-6 pb-4">
				<div
					class="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
					style:background-color={variant === "danger"
						? "rgba(239, 68, 68, 0.1)"
						: variant === "warning"
							? "rgba(249, 115, 22, 0.1)"
							: "rgba(59, 130, 246, 0.1)"}
				>
					{#if variant === "danger"}
						<Trash2
							size={24}
							style="color: {variantColors.danger.icon}"
						/>
					{:else if variant === "warning"}
						<AlertTriangle
							size={24}
							style="color: {variantColors.warning.icon}"
						/>
					{:else}
						<Upload
							size={24}
							style="color: {variantColors.info.icon}"
						/>
					{/if}
				</div>
				<div class="flex-1">
					<h3
						id="modal-title"
						class="text-lg font-semibold mb-1"
						style:color={textPrimary}
					>
						{title}
					</h3>
					<p class="text-sm" style:color={textSecondary}>
						{message}
					</p>
				</div>
				<button
					class="flex-shrink-0 p-1 rounded-lg transition-colors hover:bg-gray-500/20"
					style:color={textSecondary}
					onclick={onCancel}
					aria-label="Close"
				>
					<X size={20} />
				</button>
			</div>

			<!-- Actions -->
			<div
				class="flex items-center justify-end gap-3 px-6 py-4 border-t"
				style:border-color={borderColor}
			>
				<button
					class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
					style:color={textSecondary}
					onclick={onCancel}
					onmouseenter={(e) =>
						(e.currentTarget.style.backgroundColor =
							theme === "light" ? "#f3f4f6" : "#2d3748")}
					onmouseleave={(e) =>
						(e.currentTarget.style.backgroundColor = "transparent")}
				>
					{cancelLabel}
				</button>
				<button
					class="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90"
					style:background-color={variantColors[variant].bg}
					onclick={onConfirm}
				>
					{confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		animation: fadeIn 0.2s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	:global(.animate-scale-in) {
		animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}

	@keyframes scaleIn {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
