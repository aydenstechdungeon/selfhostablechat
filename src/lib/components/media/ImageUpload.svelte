<script lang="ts">
	import { Paperclip, X, Upload, FileText, Music, Film, File } from 'lucide-svelte';
	import { getFileTypeCategory, ALL_SUPPORTED_TYPES, MAX_FILE_SIZE } from '$lib/types';
	import { toastStore } from '$lib/stores/toastStore';
	
	let {
		onUpload,
		maxSize = MAX_FILE_SIZE,
		theme = 'dark'
	}: {
		onUpload: (files: Array<{ type: 'image' | 'video' | 'document' | 'audio' | 'file'; url: string; name: string; mimeType: string; size: number }>) => void;
		maxSize?: number;
		theme?: 'light' | 'dark';
	} = $props();
	
	let files = $state<Array<{ type: 'image' | 'video' | 'document' | 'audio' | 'file'; url: string; name: string; mimeType: string; size: number }>>([]);
	let isDragging = $state(false);
	let fileInput: HTMLInputElement;
	
	let textPrimary = $derived(theme === 'light' ? '#1f2937' : '#e2e8f0');
	let textSecondary = $derived(theme === 'light' ? '#6b7280' : '#a0aec0');
	let bgSecondary = $derived(theme === 'light' ? '#f3f4f6' : '#1a1f2e');
	let border = $derived(theme === 'light' ? '#e5e7eb' : '#2d3748');
	let accentColor = $derived('#4299e1');
	
	function handleFiles(fileList: FileList | null) {
		if (!fileList) return;
		
		const newFiles: typeof files = [];
		
		for (let i = 0; i < fileList.length; i++) {
			const file = fileList[i];
			
			// Check file size
			if (file.size > maxSize) {
				toastStore.show(`File ${file.name} is too large. Maximum size is ${maxSize / 1024 / 1024}MB`, 'error');
				continue;
			}
			
			// Check file type
			if (!ALL_SUPPORTED_TYPES.includes(file.type as any) && !file.type.startsWith('image/')) {
				toastStore.show(`File ${file.name} is not a supported format`, 'error');
				continue;
			}
			
			// Read file as base64
			const reader = new FileReader();
			reader.onload = (e) => {
				const result = e.target?.result as string;
				const fileType = getFileTypeCategory(file.type);
				const fileData = {
					type: fileType,
					url: result,
					name: file.name,
					mimeType: file.type,
					size: file.size
				};
				newFiles.push(fileData);
				files = [...files, fileData];
			};
			reader.readAsDataURL(file);
		}
	}
	
	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		handleFiles(e.dataTransfer?.files ?? null);
	}
	
	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}
	
	function handleDragLeave() {
		isDragging = false;
	}
	
	function removeFile(index: number) {
		files = files.filter((_, i) => i !== index);
	}
	
	function handleAttach() {
		if (files.length > 0) {
			onUpload(files);
			files = [];
		}
	}
	
	$effect(() => {
		// Auto-upload when files change
		if (files.length > 0) {
			onUpload(files);
		}
	});
	
	// Format file size
	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
	}
</script>

<div class="image-upload-component">
	{#if files.length > 0}
		<div class="uploaded-files flex flex-wrap gap-2 mb-3">
			{#each files as file, index}
				{#if file.type === 'image'}
					<div 
						class="file-preview relative group rounded-lg border cursor-pointer"
						style:border-color={border}
					>
						<div class="w-20 h-20 overflow-hidden rounded-lg">
							<img 
								src={file.url} 
								alt={file.name}
								class="w-full h-full object-cover"
							/>
						</div>
						<button
							onclick={() => removeFile(index)}
							class="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-md"
						>
							<X size={12} />
						</button>
					</div>
				{:else}
					<div 
						class="file-preview relative group rounded-lg border cursor-pointer flex items-center gap-2 px-3 py-2 min-w-[120px]"
						style:border-color={border}
						style:background-color={bgSecondary}
					>
						{#if file.type === 'video'}
							<Film size={24} color={accentColor} />
						{:else if file.type === 'audio'}
							<Music size={24} color={accentColor} />
						{:else if file.type === 'document'}
							<FileText size={24} color={accentColor} />
						{:else}
							<File size={24} color={accentColor} />
						{/if}
						<div class="flex-1 min-w-0">
							<p class="text-xs font-medium truncate" style:color={textPrimary}>{file.name}</p>
							<p class="text-[10px]" style:color={textSecondary}>{formatFileSize(file.size)}</p>
						</div>
						<button
							onclick={() => removeFile(index)}
							class="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-md"
						>
							<X size={12} />
						</button>
					</div>
				{/if}
			{/each}
		</div>
	{/if}
	
	<div
		class="upload-area border-2 border-dashed rounded-lg p-4 transition-all cursor-pointer"
		style:border-color={isDragging ? accentColor : border}
		style:background-color={isDragging ? 'rgba(66, 153, 225, 0.1)' : 'transparent'}
		role="button"
		tabindex="0"
		aria-label="Upload files"
		ondrop={handleDrop}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		onclick={() => fileInput.click()}
		onkeydown={(e) => e.key === 'Enter' && fileInput.click()}
	>
		<div class="flex items-center gap-3">
			<div 
				class="w-10 h-10 rounded-lg flex items-center justify-center"
				style:background-color="rgba(66, 153, 225, 0.2)"
			>
				<Paperclip class="w-5 h-5" color={accentColor} />
			</div>
			<div>
				<p class="text-sm font-medium" style:color={textPrimary}>
					Upload files
				</p>
				<p class="text-xs" style:color={textSecondary}>
					Images, docs, audio, video • Max {maxSize / 1024 / 1024}MB
				</p>
			</div>
		</div>
	</div>
	
	<input
		bind:this={fileInput}
		type="file"
		accept={ALL_SUPPORTED_TYPES.join(',')}
		multiple
		class="hidden"
		onchange={(e) => handleFiles(e.currentTarget.files)}
	/>
</div>
