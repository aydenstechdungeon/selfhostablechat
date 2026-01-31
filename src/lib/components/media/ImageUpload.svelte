<script lang="ts">
	import { Image, X, Upload } from 'lucide-svelte';
	
	let {
		onUpload,
		maxSize = 5 * 1024 * 1024,
		theme = 'dark'
	}: {
		onUpload: (files: Array<{ type: 'image' | 'video'; url: string; name: string }>) => void;
		maxSize?: number;
		theme?: 'light' | 'dark';
	} = $props();
	
	let files = $state<Array<{ type: 'image' | 'video'; url: string; name: string }>>([]);
	let isDragging = $state(false);
	let fileInput: HTMLInputElement;
	
	let textPrimary = $derived(theme === 'light' ? '#1f2937' : '#e2e8f0');
	let textSecondary = $derived(theme === 'light' ? '#6b7280' : '#a0aec0');
	let bgSecondary = $derived(theme === 'light' ? '#f3f4f6' : '#1a1f2e');
	let border = $derived(theme === 'light' ? '#e5e7eb' : '#2d3748');
	
	function handleFiles(fileList: FileList | null) {
		if (!fileList) return;
		
		const newFiles: typeof files = [];
		
		for (let i = 0; i < fileList.length; i++) {
			const file = fileList[i];
			
			// Check file size
			if (file.size > maxSize) {
				alert(`File ${file.name} is too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
				continue;
			}
			
			// Check file type
			if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
				alert(`File ${file.name} is not a supported image or video format`);
				continue;
			}
			
			// Read file as base64
			const reader = new FileReader();
			reader.onload = (e) => {
				const result = e.target?.result as string;
				const fileData = {
					type: file.type.startsWith('image/') ? 'image' as const : 'video' as const,
					url: result,
					name: file.name
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
</script>

<div class="image-upload-component">
	{#if files.length > 0}
		<div class="uploaded-files flex flex-wrap gap-2 mb-3">
			{#each files as file, index}
			<div 
				class="file-preview relative group rounded-lg border cursor-pointer"
				style:border-color={border}
			>
				{#if file.type === 'image'}
					<div class="w-20 h-20 overflow-hidden rounded-lg">
						<img 
							src={file.url} 
							alt={file.name}
							class="w-full h-full object-cover"
						/>
					</div>
				{:else}
					<div 
						class="w-20 h-20 flex items-center justify-center rounded-lg"
						style:background-color={bgSecondary}
					>
						<span class="text-xs" style:color={textSecondary}>Video</span>
					</div>
				{/if}
				<button
					onclick={() => removeFile(index)}
					class="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-md"
				>
					<X size={12} />
				</button>
			</div>
			{/each}
		</div>
	{/if}
	
	<div
		class="upload-area border-2 border-dashed rounded-lg p-4 transition-all cursor-pointer"
		style:border-color={isDragging ? '#4299e1' : border}
		style:background-color={isDragging ? 'rgba(66, 153, 225, 0.1)' : 'transparent'}
		role="button"
		tabindex="0"
		aria-label="Upload image or video"
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
				<Upload class="w-5 h-5" color="#4299e1" />
			</div>
			<div>
				<p class="text-sm font-medium" style:color={textPrimary}>
					Upload image or video
				</p>
				<p class="text-xs" style:color={textSecondary}>
					Click or drag & drop • Max {maxSize / 1024 / 1024}MB
				</p>
			</div>
		</div>
	</div>
	
	<input
		bind:this={fileInput}
		type="file"
		accept="image/*,video/*"
		multiple
		class="hidden"
		onchange={(e) => handleFiles(e.currentTarget.files)}
	/>
</div>
