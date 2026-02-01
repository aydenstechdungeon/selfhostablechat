<script lang="ts">
	import { settingsStore } from '$lib/stores/settingsStore';
	import { uiStore } from '$lib/stores/uiStore';
	import { systemPromptStore } from '$lib/stores/systemPromptStore';
	import { chatDB } from '$lib/stores/indexedDB';
	import { chatStore } from '$lib/stores/chatStore';
	import { toastStore } from '$lib/stores/toastStore';
	import ApiKeyManager from '$lib/components/settings/ApiKeyManager.svelte';
	import ModelManager from '$lib/components/settings/ModelManager.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import { goto } from '$app/navigation';
	import { Download, Upload, Trash2, FileArchive, CheckSquare, Square } from 'lucide-svelte';
	
	// Modal state
	let clearAllModalOpen = $state(false);
	let importReplaceModalOpen = $state(false);
	let pendingImportFile: File | null = $state(null);
	
	let activeTab = $state<'general' | 'models' | 'api-keys' | 'appearance' | 'system-prompt' | 'data'>('general');
	let systemPrompt = $derived($systemPromptStore);
	let settings = $derived($settingsStore);
	let uiState = $derived($uiStore);
	
	// Use UI store for theme (single source of truth)
	let theme = $derived(uiState.theme);
	
	// Data management state
	let chats: any[] = $state([]);
	let selectedChats = $state<Set<string>>(new Set());
	let isLoadingChats = $state(false);
	let showSelectionMode = $state(false);
	let fileInput: HTMLInputElement | null = $state(null);
	
	function updateSetting<K extends keyof typeof settings>(key: K, value: typeof settings[K]) {
		settingsStore.updateSettings({ [key]: value });
	}
	
	function updateTheme(newTheme: 'dark' | 'light' | 'auto') {
		uiStore.setTheme(newTheme);
		// Also update settings store for consistency
		settingsStore.updateSettings({ theme: newTheme });
	}
	
	// Load chats for data management
	async function loadChatsForDataManagement() {
		isLoadingChats = true;
		try {
			chats = await chatDB.getAllChats();
		} catch (error) {
			console.error('Failed to load chats:', error);
			toastStore.show('Failed to load chats', 'error');
		} finally {
			isLoadingChats = false;
		}
	}
	
	// Clear all chats
	function openClearAllModal() {
		clearAllModalOpen = true;
	}
	
	async function confirmClearAllChats() {
		clearAllModalOpen = false;
		
		try {
			await chatDB.clearAll();
			chatStore.reset();
			chats = [];
			selectedChats.clear();
			toastStore.show('All chats have been cleared', 'success');
			// Dispatch event to update sidebar
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('chat-updated'));
			}
			// Navigate to new chat if we're on a chat page
			goto('/chat/new');
		} catch (error) {
			console.error('Failed to clear chats:', error);
			toastStore.show('Failed to clear chats', 'error');
		}
	}
	
	// Export all chats
	async function exportAllChats() {
		try {
			const allChats = await chatDB.getAllChats();
			const exportData: any = {
				version: '1.0',
				exportDate: new Date().toISOString(),
				chats: []
			};
			
			for (const chat of allChats) {
				const messages = await chatDB.getMessages(chat.id);
				exportData.chats.push({
					...chat,
					messages
				});
			}
			
			const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `chat-export-${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			
			toastStore.show(`Exported ${allChats.length} chat${allChats.length !== 1 ? 's' : ''}`, 'success');
		} catch (error) {
			console.error('Failed to export chats:', error);
			toastStore.show('Failed to export chats', 'error');
		}
	}
	
	// Export selected chats
	async function exportSelectedChats() {
		if (selectedChats.size === 0) {
			toastStore.show('No chats selected', 'error');
			return;
		}
		
		try {
			const exportData: any = {
				version: '1.0',
				exportDate: new Date().toISOString(),
				chats: []
			};
			
			for (const chatId of selectedChats) {
				const chat = await chatDB.getChat(chatId);
				if (chat) {
					const messages = await chatDB.getMessages(chatId);
					exportData.chats.push({
						...chat,
						messages
					});
				}
			}
			
			const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `chat-export-selected-${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			
			toastStore.show(`Exported ${selectedChats.size} chat${selectedChats.size !== 1 ? 's' : ''}`, 'success');
			
			// Reset selection mode
			showSelectionMode = false;
			selectedChats.clear();
		} catch (error) {
			console.error('Failed to export chats:', error);
			toastStore.show('Failed to export chats', 'error');
		}
	}
	
	// Import chats (merge)
	async function importChats(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		
		try {
			const text = await file.text();
			const importData = JSON.parse(text);
			
			if (!importData.chats || !Array.isArray(importData.chats)) {
				toastStore.show('Invalid export file format', 'error');
				return;
			}
			
			let importedCount = 0;
			for (const chatData of importData.chats) {
				// Generate new IDs to avoid conflicts (merge mode)
				const newChatId = crypto.randomUUID();
				
				// Save chat
				await chatDB.saveChat({
					id: newChatId,
					title: chatData.title || 'Imported Chat',
					mode: chatData.mode || 'auto',
					createdAt: new Date(chatData.createdAt),
					updatedAt: new Date(),
					messageCount: chatData.messageCount || 0,
					totalCost: chatData.totalCost || 0,
					totalTokens: chatData.totalTokens || 0,
					models: chatData.models || []
				});
				
				// Save messages with new IDs
				if (chatData.messages && Array.isArray(chatData.messages)) {
					const idMapping = new Map<string, string>();
					
					for (const msg of chatData.messages) {
						const newMsgId = crypto.randomUUID();
						idMapping.set(msg.id, newMsgId);
						
						await chatDB.saveMessage({
							id: newMsgId,
							chatId: newChatId,
							role: msg.role,
							content: msg.content,
							model: msg.model,
							attachments: msg.attachments,
							createdAt: new Date(msg.createdAt),
							stats: msg.stats,
							parentId: msg.parentId ? idMapping.get(msg.parentId) || null : null,
							branchId: msg.branchId,
							branchIndex: msg.branchIndex,
							isEdited: msg.isEdited,
							editedAt: msg.editedAt ? new Date(msg.editedAt) : undefined,
							isPartial: msg.isPartial
						});
					}
				}
				importedCount++;
			}
			
			toastStore.show(`Imported ${importedCount} chat${importedCount !== 1 ? 's' : ''}`, 'success');
			
			// Reload chats and update sidebar
			await loadChatsForDataManagement();
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('chat-updated'));
			}
			
			// Reset file input
			input.value = '';
		} catch (error) {
			console.error('Failed to import chats:', error);
			toastStore.show('Failed to import chats: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
		}
	}
	
	// Import and replace chats
	function openImportReplaceModal(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		
		pendingImportFile = file;
		importReplaceModalOpen = true;
		// Reset the input so the same file can be selected again
		input.value = '';
	}
	
	async function confirmImportAndReplace() {
		importReplaceModalOpen = false;
		
		const file = pendingImportFile;
		if (!file) return;
		pendingImportFile = null;
		
		try {
			// First clear all existing chats
			await chatDB.clearAll();
			
			const text = await file.text();
			const importData = JSON.parse(text);
			
			if (!importData.chats || !Array.isArray(importData.chats)) {
				toastStore.show('Invalid export file format', 'error');
				return;
			}
			
			let importedCount = 0;
			for (const chatData of importData.chats) {
				// Use original IDs in replace mode
				const chatId = chatData.id || crypto.randomUUID();
				
				// Save chat
				await chatDB.saveChat({
					id: chatId,
					title: chatData.title || 'Imported Chat',
					mode: chatData.mode || 'auto',
					createdAt: new Date(chatData.createdAt),
					updatedAt: new Date(chatData.updatedAt),
					messageCount: chatData.messageCount || 0,
					totalCost: chatData.totalCost || 0,
					totalTokens: chatData.totalTokens || 0,
					models: chatData.models || []
				});
				
				// Save messages
				if (chatData.messages && Array.isArray(chatData.messages)) {
					for (const msg of chatData.messages) {
						await chatDB.saveMessage({
							id: msg.id || crypto.randomUUID(),
							chatId: chatId,
							role: msg.role,
							content: msg.content,
							model: msg.model,
							attachments: msg.attachments,
							createdAt: new Date(msg.createdAt),
							stats: msg.stats,
							parentId: msg.parentId,
							branchId: msg.branchId,
							branchIndex: msg.branchIndex,
							isEdited: msg.isEdited,
							editedAt: msg.editedAt ? new Date(msg.editedAt) : undefined,
							isPartial: msg.isPartial
						});
					}
				}
				importedCount++;
			}
			
			toastStore.show(`Replaced with ${importedCount} imported chat${importedCount !== 1 ? 's' : ''}`, 'success');
			
			// Reload chats and update sidebar
			await loadChatsForDataManagement();
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('chat-updated'));
			}
		} catch (error) {
			console.error('Failed to import chats:', error);
			toastStore.show('Failed to import chats: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
		}
	}
	
	// Toggle chat selection
	function toggleChatSelection(chatId: string) {
		const newSet = new Set(selectedChats);
		if (newSet.has(chatId)) {
			newSet.delete(chatId);
		} else {
			newSet.add(chatId);
		}
		selectedChats = newSet;
	}
	
	// Select/deselect all chats
	function toggleSelectAll() {
		if (selectedChats.size === chats.length) {
			selectedChats = new Set();
		} else {
			selectedChats = new Set(chats.map(c => c.id));
		}
	}
	
	// Watch for tab change to load chats
	$effect(() => {
		if (activeTab === 'data') {
			loadChatsForDataManagement();
		}
	});
	
	let textPrimary = $derived(theme === 'light' ? '#1f2937' : '#e2e8f0');
	let textSecondary = $derived(theme === 'light' ? '#6b7280' : '#a0aec0');
	let inputBg = $derived(theme === 'light' ? '#f3f4f6' : '#0f1419');
	let contentBg = $derived(theme === 'light' ? '#ffffff' : '#1a1f2e');
	let border = $derived(theme === 'light' ? '#e5e7eb' : '#2d3748');
	let hoverBg = $derived(theme === 'light' ? 'rgba(249, 250, 251, 0.5)' : 'rgba(45, 55, 72, 0.3)');
	let activeBg = $derived(theme === 'light' ? '#f3f4f6' : '#2d3748');
	let dangerColor = '#ef4444';
	let dangerHoverBg = 'rgba(239, 68, 68, 0.1)';
</script>

<div class="settings-page px-8 py-6 overflow-y-auto h-full">
	<div class="max-w-6xl mx-auto">
		<div class="settings-header mb-8">
			<h1 class="text-3xl font-bold" style:color={textPrimary}>Settings</h1>
		</div>
		
		<div class="settings-content grid grid-cols-[220px_1fr] gap-8">
			<div class="tabs-sidebar flex flex-col gap-1">
				<button
					class="px-4 py-3 text-left rounded-lg transition-all"
					style:background-color={activeTab === 'general' ? activeBg : 'transparent'}
					style:color={activeTab === 'general' ? '#4299e1' : textSecondary}
					onmouseenter={(e) => activeTab !== 'general' && (e.currentTarget.style.backgroundColor = hoverBg)}
					onmouseleave={(e) => activeTab !== 'general' && (e.currentTarget.style.backgroundColor = 'transparent')}
					onclick={() => activeTab = 'general'}
				>
					General
				</button>
				<button
					class="px-4 py-3 text-left rounded-lg transition-all"
					style:background-color={activeTab === 'models' ? activeBg : 'transparent'}
					style:color={activeTab === 'models' ? '#4299e1' : textSecondary}
					onmouseenter={(e) => activeTab !== 'models' && (e.currentTarget.style.backgroundColor = hoverBg)}
					onmouseleave={(e) => activeTab !== 'models' && (e.currentTarget.style.backgroundColor = 'transparent')}
					onclick={() => activeTab = 'models'}
				>
					Models
				</button>
				<button
					class="px-4 py-3 text-left rounded-lg transition-all"
					style:background-color={activeTab === 'api-keys' ? activeBg : 'transparent'}
					style:color={activeTab === 'api-keys' ? '#4299e1' : textSecondary}
					onmouseenter={(e) => activeTab !== 'api-keys' && (e.currentTarget.style.backgroundColor = hoverBg)}
					onmouseleave={(e) => activeTab !== 'api-keys' && (e.currentTarget.style.backgroundColor = 'transparent')}
					onclick={() => activeTab = 'api-keys'}
				>
					API Keys
				</button>
				<button
					class="px-4 py-3 text-left rounded-lg transition-all"
					style:background-color={activeTab === 'appearance' ? activeBg : 'transparent'}
					style:color={activeTab === 'appearance' ? '#4299e1' : textSecondary}
					onmouseenter={(e) => activeTab !== 'appearance' && (e.currentTarget.style.backgroundColor = hoverBg)}
					onmouseleave={(e) => activeTab !== 'appearance' && (e.currentTarget.style.backgroundColor = 'transparent')}
					onclick={() => activeTab = 'appearance'}
				>
					Appearance
				</button>
				<button
					class="px-4 py-3 text-left rounded-lg transition-all"
					style:background-color={activeTab === 'system-prompt' ? activeBg : 'transparent'}
					style:color={activeTab === 'system-prompt' ? '#4299e1' : textSecondary}
					onmouseenter={(e) => activeTab !== 'system-prompt' && (e.currentTarget.style.backgroundColor = hoverBg)}
					onmouseleave={(e) => activeTab !== 'system-prompt' && (e.currentTarget.style.backgroundColor = 'transparent')}
					onclick={() => activeTab = 'system-prompt'}
				>
					System Prompt
				</button>
				<button
					class="px-4 py-3 text-left rounded-lg transition-all"
					style:background-color={activeTab === 'data' ? activeBg : 'transparent'}
					style:color={activeTab === 'data' ? '#4299e1' : textSecondary}
					onmouseenter={(e) => activeTab !== 'data' && (e.currentTarget.style.backgroundColor = hoverBg)}
					onmouseleave={(e) => activeTab !== 'data' && (e.currentTarget.style.backgroundColor = 'transparent')}
					onclick={() => activeTab = 'data'}
				>
					Data Management
				</button>
			</div>
			
			<div class="tabs-content rounded-xl border p-8" style:background-color={contentBg} style:border-color={border}>
				{#if activeTab === 'general'}
					<div class="tab-panel animate-fadeIn space-y-6">
						<div class="setting-group">
							<label for="autoSaveFrequency" class="block mb-3 text-sm font-semibold" style:color={textPrimary}>
								Auto-save Frequency
							</label>
							<p class="setting-description text-sm mb-3" style:color={textSecondary}>
								How often to save your chat automatically
							</p>
							<select
								id="autoSaveFrequency"
								class="input w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-[#4299e1]"
								style:background-color={inputBg}
								style:border-color={border}
								style:color={textPrimary}
								value={settings.autoSaveFrequency}
								onchange={(e) => updateSetting('autoSaveFrequency', e.currentTarget.value as any)}
							>
								<option value="realtime">Real-time</option>
								<option value="30s">Every 30 seconds</option>
								<option value="5min">Every 5 minutes</option>
							</select>
						</div>
						
						<div class="setting-group">
							<label class="flex items-center gap-3 cursor-pointer">
								<input
									type="checkbox"
									class="w-5 h-5 rounded text-primary-500 focus:ring-primary-500"
									checked={settings.chatTitleGeneration}
									onchange={(e) => updateSetting('chatTitleGeneration', e.currentTarget.checked)}
								/>
								<div>
									<div class="text-sm font-semibold" style:color={textPrimary}>Auto-generate Chat Titles</div>
									<p class="text-sm" style:color={textSecondary}>Automatically generate titles based on conversation content</p>
								</div>
							</label>
						</div>
						
						<div class="setting-group">
							<label class="flex items-center gap-3 cursor-pointer">
								<input
									type="checkbox"
									class="w-5 h-5 rounded text-primary-500 focus:ring-primary-500"
									checked={settings.streamingAnimation}
									onchange={(e) => updateSetting('streamingAnimation', e.currentTarget.checked)}
								/>
								<div>
									<div class="text-sm font-semibold" style:color={textPrimary}>Streaming Animation</div>
									<p class="text-sm" style:color={textSecondary}>Show typing animation for AI responses</p>
								</div>
							</label>
						</div>
					</div>
				{:else if activeTab === 'models'}
					<div class="tab-panel animate-fadeIn space-y-6">
						<ModelManager {theme} />
						
						<div class="border-t pt-6 mt-6" style:border-color={border}>
							<div class="setting-group">
								<span class="block mb-3 text-sm font-semibold" style:color={textPrimary}>
									Multi-Model Display Mode
								</span>
								<p class="setting-description text-sm mb-3" style:color={textSecondary}>
									Choose how to display responses from multiple models
								</p>
								<div class="space-y-2" role="radiogroup" aria-label="Multi-Model Display Mode">
									{#each ['split', 'stacked', 'tabbed'] as mode}
										<label class="flex items-center gap-3 cursor-pointer p-3 rounded-lg border" style:border-color={border}>
											<input
												type="radio"
												name="displayMode"
												value={mode}
												checked={settings.multiModelDisplayMode === mode}
												onchange={() => updateSetting('multiModelDisplayMode', mode as any)}
												class="w-4 h-4"
											/>
											<span class="text-sm capitalize" style:color={textPrimary}>{mode}</span>
										</label>
									{/each}
								</div>
							</div>
						</div>
					</div>
				{:else if activeTab === 'api-keys'}
					<div class="tab-panel animate-fadeIn">
						<ApiKeyManager {theme} />
					</div>
				{:else if activeTab === 'appearance'}
					<div class="tab-panel animate-fadeIn space-y-6">
						<div class="setting-group">
							<label for="theme-select" class="block mb-3 text-sm font-semibold" style:color={textPrimary}>
								Theme
							</label>
							<select 
								id="theme-select"
								class="input w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-[#4299e1]"
								style:background-color={inputBg}
								style:border-color={border}
								style:color={textPrimary}
								value={theme}
								onchange={(e) => updateTheme(e.currentTarget.value as 'dark' | 'light' | 'auto')}
							>
								<option value="dark">Dark</option>
								<option value="light">Light</option>
								<option value="auto">Auto (System)</option>
							</select>
						</div>
						
						<div class="setting-group">
							<label for="font-size-range" class="block mb-3 text-sm font-semibold" style:color={textPrimary}>
								Font Size: {settings.fontSize}px
							</label>
							<input
								id="font-size-range"
								type="range"
								min="12"
								max="20"
								class="w-full"
								value={settings.fontSize}
								oninput={(e) => updateSetting('fontSize', parseInt(e.currentTarget.value))}
							/>
						</div>
						
						<div class="setting-group">
							<label class="flex items-center gap-3 cursor-pointer">
								<input
									type="checkbox"
									class="w-5 h-5 rounded"
									checked={settings.compactMode}
									onchange={(e) => updateSetting('compactMode', e.currentTarget.checked)}
								/>
								<div>
									<div class="text-sm font-semibold" style:color={textPrimary}>Compact Mode</div>
									<p class="text-sm" style:color={textSecondary}>Reduce spacing for a more compact interface</p>
								</div>
							</label>
						</div>
					</div>
				{:else if activeTab === 'system-prompt'}
					<div class="tab-panel animate-fadeIn space-y-6">
						<div class="setting-group">
							<div class="flex items-center justify-between mb-4">
								<label for="system-prompt-textarea" class="text-sm font-semibold" style:color={textPrimary}>
									System Prompt
								</label>
								<label class="flex items-center gap-2 cursor-pointer">
									<input
										type="checkbox"
										class="w-4 h-4 rounded"
										checked={systemPrompt.isEnabled}
										onchange={(e) => systemPromptStore.setEnabled(e.currentTarget.checked)}
									/>
									<span class="text-sm" style:color={textSecondary}>Enabled</span>
								</label>
							</div>
							<p class="setting-description text-sm mb-3" style:color={textSecondary}>
								Set a custom system prompt that will be sent with every conversation. This instructs the AI how to behave.
							</p>
							<textarea
								id="system-prompt-textarea"
								class="w-full h-48 px-4 py-3 rounded-lg border focus:outline-none focus:border-[#4299e1] resize-none font-mono text-sm"
								style:background-color={inputBg}
								style:border-color={border}
								style:color={textPrimary}
								placeholder="Enter your system prompt here..."
								value={systemPrompt.prompt}
								oninput={(e) => systemPromptStore.setPrompt(e.currentTarget.value)}
								disabled={!systemPrompt.isEnabled}
							></textarea>
							<div class="flex justify-between items-center mt-3">
								<span class="text-xs" style:color={textSecondary}>
									{systemPrompt.prompt.length} characters
								</span>
								<button
									class="px-3 py-1.5 rounded-lg text-sm border hover:bg-opacity-80 transition-colors"
									style:border-color={border}
									style:color={textSecondary}
									onclick={() => systemPromptStore.reset()}
								>
									Reset to Default
								</button>
							</div>
						</div>
						
						<div class="setting-group p-4 rounded-lg border" style:border-color={border} style:background-color={inputBg}>
							<h4 class="text-sm font-semibold mb-2" style:color={textPrimary}>Example System Prompts</h4>
							<div class="space-y-2">
								<button
									class="w-full text-left p-3 rounded-lg border text-sm hover:border-[#4299e1] transition-colors"
									style:border-color={border}
									style:color={textSecondary}
									onclick={() => {
										systemPromptStore.setPrompt('You are a helpful coding assistant. Provide clear, concise code examples and explanations.');
										systemPromptStore.setEnabled(true);
									}}
								>
									<strong style:color={textPrimary}>Coding Assistant</strong><br>
									Helpful for programming tasks and code review
								</button>
								<button
									class="w-full text-left p-3 rounded-lg border text-sm hover:border-[#4299e1] transition-colors"
									style:border-color={border}
									style:color={textSecondary}
									onclick={() => {
										systemPromptStore.setPrompt('You are a creative writing assistant. Help with storytelling, editing, and creative projects.');
										systemPromptStore.setEnabled(true);
									}}
								>
									<strong style:color={textPrimary}>Creative Writer</strong><br>
									For creative writing and storytelling help
								</button>
								<button
									class="w-full text-left p-3 rounded-lg border text-sm hover:border-[#4299e1] transition-colors"
									style:border-color={border}
									style:color={textSecondary}
									onclick={() => {
										systemPromptStore.setPrompt('You are a concise assistant. Keep responses brief and to the point.');
										systemPromptStore.setEnabled(true);
									}}
								>
									<strong style:color={textPrimary}>Concise Mode</strong><br>
									Short, direct responses
								</button>
							</div>
						</div>
					</div>
				{:else if activeTab === 'data'}
					<div class="tab-panel animate-fadeIn space-y-6">
						<!-- Clear All Chats -->
						<div class="setting-group p-4 rounded-lg border" style:border-color={border}>
							<div class="flex items-start gap-4">
								<div class="p-3 rounded-lg" style:background-color={dangerHoverBg}>
									<Trash2 size={24} style="color: {dangerColor}" />
								</div>
								<div class="flex-1">
									<h3 class="text-sm font-semibold mb-1" style:color={textPrimary}>Clear All Chats</h3>
									<p class="text-sm mb-3" style:color={textSecondary}>
										Permanently delete all conversations and their messages. This action cannot be undone.
									</p>
									<button
										class="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90"
										style:background-color={dangerColor}
										onclick={openClearAllModal}
									>
										Clear All Chats
									</button>
								</div>
							</div>
						</div>
						
						<!-- Export All -->
						<div class="setting-group p-4 rounded-lg border" style:border-color={border}>
							<div class="flex items-start gap-4">
								<div class="p-3 rounded-lg bg-blue-500/10">
									<FileArchive size={24} class="text-blue-500" />
								</div>
								<div class="flex-1">
									<h3 class="text-sm font-semibold mb-1" style:color={textPrimary}>Export All Chats</h3>
									<p class="text-sm mb-3" style:color={textSecondary}>
										Download all your chats and messages as a JSON file for backup or transfer.
									</p>
									<button
										class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-500 transition-colors hover:bg-blue-600 flex items-center gap-2"
										onclick={exportAllChats}
									>
										<Download size={16} />
										Export All
									</button>
								</div>
							</div>
						</div>
						
						<!-- Export Selected -->
						<div class="setting-group p-4 rounded-lg border" style:border-color={border}>
							<div class="flex items-start gap-4">
								<div class="p-3 rounded-lg bg-green-500/10">
									<CheckSquare size={24} class="text-green-500" />
								</div>
								<div class="flex-1">
									<h3 class="text-sm font-semibold mb-1" style:color={textPrimary}>Export Selected Chats</h3>
									<p class="text-sm mb-3" style:color={textSecondary}>
										Select specific chats to export. Click "Select Chats" to choose which conversations to include.
									</p>
									{#if !showSelectionMode}
										<button
											class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-green-500 transition-colors hover:bg-green-600 flex items-center gap-2"
											onclick={() => { showSelectionMode = true; loadChatsForDataManagement(); }}
										>
											<CheckSquare size={16} />
											Select Chats to Export
										</button>
									{:else}
										<div class="space-y-3">
											<div class="flex items-center justify-between mb-2">
												<button
													class="text-sm flex items-center gap-2 transition-colors"
													style:color={textSecondary}
													onclick={toggleSelectAll}
												>
													{#if selectedChats.size === chats.length && chats.length > 0}
														<CheckSquare size={16} />
													{:else}
														<Square size={16} />
													{/if}
													Select All ({selectedChats.size} of {chats.length})
												</button>
												<button
													class="text-sm hover:underline"
													style:color={textSecondary}
													onclick={() => { showSelectionMode = false; selectedChats.clear(); }}
												>
													Cancel
												</button>
											</div>
											
											{#if isLoadingChats}
												<div class="text-sm py-4" style:color={textSecondary}>Loading chats...</div>
											{:else if chats.length === 0}
												<div class="text-sm py-4" style:color={textSecondary}>No chats available</div>
											{:else}
												<div class="max-h-48 overflow-y-auto space-y-1 rounded-lg border p-2" style:border-color={border} style:background-color={inputBg}>
													{#each chats as chat}
														<button
															class="w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors"
															style:background-color={selectedChats.has(chat.id) ? 'rgba(59, 130, 246, 0.2)' : 'transparent'}
															onclick={() => toggleChatSelection(chat.id)}
														>
															{#if selectedChats.has(chat.id)}
																<CheckSquare size={16} class="text-blue-500" />
															{:else}
																<Square size={16} style="color: {textSecondary}" />
															{/if}
															<span class="text-sm truncate" style:color={textPrimary}>{chat.title}</span>
															<span class="text-xs ml-auto" style:color={textSecondary}>{chat.messageCount} msgs</span>
														</button>
													{/each}
												</div>
											{/if}
											
											<button
												class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-green-500 transition-colors hover:bg-green-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
												onclick={exportSelectedChats}
												disabled={selectedChats.size === 0}
											>
												<Download size={16} />
												Export {selectedChats.size} Selected
											</button>
										</div>
									{/if}
								</div>
							</div>
						</div>
						
						<!-- Import -->
						<div class="setting-group p-4 rounded-lg border" style:border-color={border}>
							<div class="flex items-start gap-4">
								<div class="p-3 rounded-lg bg-purple-500/10">
									<Upload size={24} class="text-purple-500" />
								</div>
								<div class="flex-1">
									<h3 class="text-sm font-semibold mb-1" style:color={textPrimary}>Import Chats</h3>
									<p class="text-sm mb-3" style:color={textSecondary}>
										Import chats from a JSON file. New IDs will be assigned to avoid conflicts with existing chats.
									</p>
									<input
										bind:this={fileInput}
										type="file"
										accept=".json"
										class="hidden"
										onchange={importChats}
									/>
									<button
										class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-purple-500 transition-colors hover:bg-purple-600 flex items-center gap-2"
										onclick={() => fileInput?.click()}
									>
										<Upload size={16} />
										Import Chats (Merge)
									</button>
								</div>
							</div>
						</div>
						
						<!-- Import and Replace -->
						<div class="setting-group p-4 rounded-lg border" style:border-color={border}>
							<div class="flex items-start gap-4">
								<div class="p-3 rounded-lg bg-orange-500/10">
									<Upload size={24} class="text-orange-500" />
								</div>
								<div class="flex-1">
									<h3 class="text-sm font-semibold mb-1" style:color={textPrimary}>Import and Replace</h3>
									<p class="text-sm mb-3" style:color={textSecondary}>
										Import chats from a JSON file and replace all existing chats. <strong style:color={dangerColor}>This will delete all current chats!</strong>
									</p>
									<button
										class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-orange-500 transition-colors hover:bg-orange-600 flex items-center gap-2"
										onclick={() => {
											const input = document.createElement('input');
											input.type = 'file';
											input.accept = '.json';
											input.onchange = openImportReplaceModal;
											input.click();
										}}
									>
										<Upload size={16} />
										Import and Replace
									</button>
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Confirmation Modals -->
<ConfirmModal
	isOpen={clearAllModalOpen}
	title="Clear All Chats"
	message="Are you sure you want to delete ALL chats? This action cannot be undone. All conversations and messages will be permanently lost."
	confirmLabel="Clear All"
	cancelLabel="Cancel"
	variant="danger"
	onConfirm={confirmClearAllChats}
	onCancel={() => clearAllModalOpen = false}
/>

<ConfirmModal
	isOpen={importReplaceModalOpen}
	title="Import and Replace"
	message="This will REPLACE all existing chats with the imported ones. All current chats will be permanently deleted. Are you sure?"
	confirmLabel="Replace All"
	cancelLabel="Cancel"
	variant="warning"
	onConfirm={confirmImportAndReplace}
	onCancel={() => { importReplaceModalOpen = false; pendingImportFile = null; }}
/>

<style>
	.animate-fadeIn {
		animation: fadeIn 0.2s ease-out;
	}
	
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(5px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
