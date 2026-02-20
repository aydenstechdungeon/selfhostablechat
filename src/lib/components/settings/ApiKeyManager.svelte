<script lang="ts">
	import { onMount } from "svelte";
	import { get } from "svelte/store";
	import { apiKeyStore } from "$lib/stores/apiKeyStore";
	import { Key, Check, X, Eye, EyeOff } from "lucide-svelte";
	import { SiOpenstreetmap } from "@icons-pack/svelte-simple-icons";

	let { theme = "dark" }: { theme?: string } = $props();

	let apiKeyInput = $state("");
	let ollamaUrlInput = $state("");
	let showKey = $state(false);
	let saveStatus = $state<"idle" | "saving" | "success" | "error">("idle");
	let ollamaSaveStatus = $state<"idle" | "saving" | "success" | "error">(
		"idle",
	);
	let statusMessage = $state("");
	let ollamaStatusMessage = $state("");

	const store = $derived($apiKeyStore);

	let textPrimary = $derived(theme === "light" ? "#1f2937" : "#e2e8f0");
	let textSecondary = $derived(theme === "light" ? "#6b7280" : "#a0aec0");
	let inputBg = $derived(theme === "light" ? "#f3f4f6" : "#0f1419");
	let border = $derived(theme === "light" ? "#e5e7eb" : "#2d3748");

	onMount(() => {
		apiKeyStore.loadApiKey();
		apiKeyInput = get(apiKeyStore).apiKey || "";
		ollamaUrlInput = get(apiKeyStore).ollamaUrl || "http://localhost:11434";
	});

	async function handleSave() {
		if (!apiKeyInput.trim()) {
			saveStatus = "error";
			statusMessage = "Please enter an API key";
			return;
		}

		saveStatus = "saving";
		statusMessage = "";

		const success = apiKeyStore.saveApiKey(apiKeyInput);

		if (success) {
			saveStatus = "success";
			statusMessage = "API key saved successfully";

			setTimeout(() => {
				saveStatus = "idle";
				statusMessage = "";
			}, 3000);
		} else {
			saveStatus = "error";
			statusMessage = store.error || "Failed to save API key";
		}
	}

	async function handleOllamaSave() {
		if (!ollamaUrlInput.trim()) {
			ollamaSaveStatus = "error";
			ollamaStatusMessage = "Please enter an Ollama URL";
			return;
		}

		ollamaSaveStatus = "saving";
		ollamaStatusMessage = "";

		const success = apiKeyStore.saveOllamaUrl(ollamaUrlInput);

		if (success) {
			ollamaSaveStatus = "success";
			ollamaStatusMessage = "Ollama URL saved successfully";

			setTimeout(() => {
				ollamaSaveStatus = "idle";
				ollamaStatusMessage = "";
			}, 3000);
		} else {
			ollamaSaveStatus = "error";
			ollamaStatusMessage = store.error || "Failed to save Ollama URL";
		}
	}

	async function handleDelete() {
		if (!confirm("Are you sure you want to delete your stored API key?")) {
			return;
		}

		saveStatus = "saving";
		const success = apiKeyStore.deleteApiKey();

		if (success) {
			saveStatus = "success";
			statusMessage = "API key deleted successfully";

			setTimeout(() => {
				saveStatus = "idle";
				statusMessage = "";
			}, 3000);
		} else {
			saveStatus = "error";
			statusMessage = store.error || "Failed to delete API key";
		}
	}
</script>

<div class="api-keys-manager space-y-6">
	<div
		class="flex items-start gap-3 p-4 rounded-lg border"
		style:border-color={border}
		style:background-color={inputBg}
	>
		<div class="w-5 h-5 mt-0.5">
			<SiOpenstreetmap size={20} color="#4299e1" />
		</div>
		<div class="flex-1">
			<h3 class="font-semibold mb-1" style:color={textPrimary}>
				OpenRouter API Key
			</h3>
			<p class="text-sm" style:color={textSecondary}>
				Your API key is stored locally in your browser. Get your key
				from
				<a
					href="https://openrouter.ai"
					target="_blank"
					rel="noopener"
					class="text-[#4299e1] hover:underline">openrouter.ai</a
				>
			</p>
		</div>
	</div>

	<div class="space-y-4">
		<div class="setting-group">
			<label
				for="apiKey"
				class="block mb-2 text-sm font-semibold"
				style:color={textPrimary}
			>
				API Key
			</label>
			<div class="relative">
				<input
					id="apiKey"
					type={showKey ? "text" : "password"}
					placeholder={store.apiKey
						? "••••••••••••••••"
						: "sk-or-v1-..."}
					bind:value={apiKeyInput}
					class="input w-full px-3 py-2 pr-10 rounded-lg border focus:outline-none focus:border-[#4299e1]"
					style:background-color={inputBg}
					style:border-color={border}
					style:color={textPrimary}
					disabled={saveStatus === "saving"}
				/>
				<button
					class="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-opacity-10 hover:bg-white rounded"
					onclick={() => (showKey = !showKey)}
					type="button"
				>
					{#if showKey}
						<EyeOff class="w-4 h-4" color={textSecondary} />
					{:else}
						<Eye class="w-4 h-4" color={textSecondary} />
					{/if}
				</button>
			</div>
		</div>

		<div class="flex items-center gap-3">
			<button
				onclick={handleSave}
				disabled={saveStatus === "saving" || !apiKeyInput.trim()}
				class="px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
				style:background-color="#4299e1"
				style:color="#ffffff"
			>
				{#if saveStatus === "saving"}
					<span class="animate-spin">⟳</span>
					Saving...
				{:else if saveStatus === "success"}
					<Check class="w-4 h-4" />
					Saved
				{:else}
					Save API Key
				{/if}
			</button>

			{#if store.apiKey}
				<button
					onclick={handleDelete}
					disabled={saveStatus === "saving"}
					class="px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed border"
					style:border-color={border}
					style:color={textPrimary}
				>
					Delete Stored Key
				</button>
			{/if}
		</div>

		{#if statusMessage}
			<div
				class="flex items-center gap-2 p-3 rounded-lg text-sm"
				style:background-color={saveStatus === "error"
					? "rgba(220, 38, 38, 0.1)"
					: "rgba(34, 197, 94, 0.1)"}
				style:color={saveStatus === "error" ? "#dc2626" : "#22c55e"}
			>
				{#if saveStatus === "error"}
					<X class="w-4 h-4" />
				{:else}
					<Check class="w-4 h-4" />
				{/if}
				{statusMessage}
			</div>
		{/if}
	</div>

	<div class="space-y-4 pt-6 border-t" style:border-color={border}>
		<div
			class="flex items-start gap-3 p-4 rounded-lg border"
			style:border-color={border}
			style:background-color={inputBg}
		>
			<div class="w-5 h-5 mt-0.5 text-[#4299e1]">
				<svg
					viewBox="0 0 24 24"
					width="20"
					height="20"
					stroke="currentColor"
					stroke-width="2"
					fill="none"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="css-i6dzq1"
					><rect x="2" y="2" width="20" height="8" rx="2" ry="2"
					></rect><rect
						x="2"
						y="14"
						width="20"
						height="8"
						rx="2"
						ry="2"
					></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line
						x1="6"
						y1="18"
						x2="6.01"
						y2="18"
					></line></svg
				>
			</div>
			<div class="flex-1">
				<h3 class="font-semibold mb-1" style:color={textPrimary}>
					Ollama Connection
				</h3>
				<p class="text-sm" style:color={textSecondary}>
					Connect to a local or remote Ollama instance.
				</p>
			</div>
		</div>

		<div class="setting-group">
			<label
				for="ollamaUrl"
				class="block mb-2 text-sm font-semibold"
				style:color={textPrimary}
			>
				Ollama API URL
			</label>
			<input
				id="ollamaUrl"
				type="text"
				placeholder="http://localhost:11434"
				bind:value={ollamaUrlInput}
				class="input w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-[#4299e1]"
				style:background-color={inputBg}
				style:border-color={border}
				style:color={textPrimary}
				disabled={ollamaSaveStatus === "saving"}
			/>
		</div>

		<div class="flex items-center gap-3">
			<button
				onclick={handleOllamaSave}
				disabled={ollamaSaveStatus === "saving" ||
					!ollamaUrlInput.trim()}
				class="px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
				style:background-color="#4299e1"
				style:color="#ffffff"
			>
				{#if ollamaSaveStatus === "saving"}
					<span class="animate-spin">⟳</span>
					Saving...
				{:else if ollamaSaveStatus === "success"}
					<Check class="w-4 h-4" />
					Saved
				{:else}
					Save Connection
				{/if}
			</button>
		</div>

		{#if ollamaStatusMessage}
			<div
				class="flex items-center gap-2 p-3 rounded-lg text-sm"
				style:background-color={ollamaSaveStatus === "error"
					? "rgba(220, 38, 38, 0.1)"
					: "rgba(34, 197, 94, 0.1)"}
				style:color={ollamaSaveStatus === "error"
					? "#dc2626"
					: "#22c55e"}
			>
				{#if ollamaSaveStatus === "error"}
					<X class="w-4 h-4" />
				{:else}
					<Check class="w-4 h-4" />
				{/if}
				{ollamaStatusMessage}
			</div>
		{/if}
	</div>

	<div class="status-indicators space-y-2">
		<div class="flex items-center gap-2 text-sm">
			<div
				class="w-2 h-2 rounded-full"
				style:background-color={store.apiKey ? "#22c55e" : "#6b7280"}
			></div>
			<span style:color={textSecondary}>
				OpenRouter: {store.apiKey ? "Configured" : "Not set"}
			</span>
		</div>
		<div class="flex items-center gap-2 text-sm">
			<div
				class="w-2 h-2 rounded-full"
				style:background-color={store.ollamaUrl !==
					"http://localhost:11434" && store.ollamaUrl
					? "#22c55e"
					: "#6b7280"}
			></div>
			<span style:color={textSecondary}>
				Ollama: {store.ollamaUrl}
			</span>
		</div>
	</div>

	<div
		class="info-box p-4 rounded-lg border"
		style:border-color={border}
		style:background-color={inputBg}
	>
		<h4 class="font-semibold mb-2 text-sm" style:color={textPrimary}>
			Privacy Information
		</h4>
		<ul class="space-y-1 text-sm" style:color={textSecondary}>
			<li>• API key is stored locally in your browser's LocalStorage</li>
			<li>• Your key never leaves your device</li>
			<li>• Chats are stored in IndexedDB (browser only)</li>
			<li>• Clear browser data to remove all stored information</li>
		</ul>
	</div>
</div>
