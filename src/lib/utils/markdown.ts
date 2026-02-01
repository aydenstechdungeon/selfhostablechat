import { marked } from 'marked';
import hljs from 'highlight.js';

// Configure marked with syntax highlighting
marked.use({
	gfm: true,
	breaks: true
});

// Custom renderer for code blocks
const renderer = new marked.Renderer();

renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
	const validLanguage = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
	const highlighted = hljs.highlight(text, { language: validLanguage }).value;
	const codeId = `code-${Math.random().toString(36).substring(2, 11)}`;

	return `<div class="code-block relative group my-4 rounded-lg overflow-hidden bg-[#1a1f2e] border border-[#2d3748]" id="${codeId}">
    <div class="code-header flex items-center justify-between px-4 py-2 bg-[#0f1419] border-b border-[#2d3748]">
      <span class="text-xs text-[#a0aec0] font-mono">${validLanguage}</span>
      <div class="flex items-center gap-2">
        <button class="download-btn opacity-0 group-hover:opacity-100 transition-all duration-200 p-2 rounded-lg text-xs bg-[#2d3748] text-[#e2e8f0] hover:bg-[#38a169] hover:scale-105 active:scale-95" data-code="${encodeURIComponent(text)}" data-lang="${validLanguage}" title="Download file">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
        </button>
        <button class="copy-btn opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-[#2d3748] text-[#e2e8f0] hover:bg-[#4299e1] hover:scale-105 active:scale-95" data-code="${encodeURIComponent(text)}" title="Copy to clipboard">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="copy-icon"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="check-icon hidden"><polyline points="20 6 9 17 4 12"/></svg>
          <span class="btn-text">Copy</span>
        </button>
      </div>
    </div>
    <pre class="m-0 p-4 overflow-x-auto"><code class="hljs language-${validLanguage}">${highlighted}</code></pre>
  </div>`;
};

renderer.codespan = ({ text }: { text: string }) => {
	return `<code class="px-1.5 py-0.5 rounded bg-[#2d3748] text-[#e2e8f0] text-sm font-mono">${escapeHtml(text)}</code>`;
};

renderer.blockquote = ({ text }: { text: string }) => {
	return `<blockquote class="border-l-4 border-[#4299e1] pl-4 my-4 italic text-[#a0aec0]">${text}</blockquote>`;
};

renderer.table = (token: any) => {
	const header = token.header.map((cell: any) => cell.text || cell);
	const rows = token.rows.map((row: any) => row.map((cell: any) => cell.text || cell));

	const headerHtml = header.map((cell: string) => `<th class="px-4 py-3 text-left text-sm font-semibold bg-[#0f1419] text-[#e2e8f0] border-b border-[#2d3748]">${escapeHtml(cell)}</th>`).join('');
	const rowsHtml = rows.map((row: string[], i: number) => {
		const isLastRow = i === rows.length - 1;
		const cells = row.map((cell: string) => `<td class="px-4 py-3 text-sm text-[#e2e8f0] ${isLastRow ? '' : 'border-b border-[#2d3748]/50'}">${escapeHtml(cell)}</td>`).join('');
		const bgClass = i % 2 === 0 ? 'bg-[#1a1f2e]' : 'bg-[#1a1f2e]/50';
		return `<tr class="${bgClass} hover:bg-[#2d3748]/30 transition-colors">${cells}</tr>`;
	}).join('');

	return `<div class="table-container overflow-x-auto rounded-lg ">
    <table class="w-full border-collapse min-w-[500px]">
      <thead>
        <tr>${headerHtml}</tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  </div>`;
};

// Custom renderer for images - makes them clickable
// SECURITY: Uses data attributes instead of onclick for event handling
renderer.image = ({ href, text }: { href: string; text: string }) => {
	// Validate and sanitize the URL
	let safeHref = href;
	
	// Only allow http/https/data:image URLs
	const isValidUrl = href.startsWith('data:image/') || 
	                   href.startsWith('https://') || 
	                   href.startsWith('http://');
	
	if (!isValidUrl) {
		console.warn('Blocked potentially unsafe image URL:', href.substring(0, 50));
		return `<span class="text-red-400">[Blocked unsafe image]</span>`;
	}
	
	// Create a clickable image that will trigger the image modal via event delegation
	return `<button 
    class="image-preview-button relative group overflow-hidden rounded-lg border border-[#2d3748] hover:border-[#4299e1] transition-colors inline-block my-2 cursor-pointer bg-transparent p-0"
    data-image-url="${safeHref.replace(/"/g, '"')}"
    data-image-alt="${(text || 'Image').replace(/"/g, '"')}"
  >
    <img 
      src="${safeHref.replace(/"/g, '"')}" 
      alt="${(text || '').replace(/"/g, '"')}" 
      class="max-w-full h-auto max-h-[65vh] block object-contain"
      loading="lazy"
      onerror="this.style.display='none'; this.parentElement.style.display='none';"
    />
    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
      <span class="text-white opacity-0 group-hover:opacity-100 text-xs font-medium">View</span>
    </div>
  </button>`;
};

// Use the custom renderer
marked.use({ renderer });

// Post-process HTML to wrap tables in scrollable containers
function wrapTablesInContainers(html: string): string {
	// Replace table elements with wrapped versions
	return html.replace(
		/<table([^>]*)>([\s\S]*?)<\/table>/g,
		'<div class="table-container overflow-x-auto my-4 rounded-lg border border-[#2d3748]"><table$1 class="w-full border-collapse min-w-[400px] bg-[#1a1f2e]">$2</table></div>'
	);
}

// HTML escape function that doesn't require DOM (works in SSR)
export function escapeHtml(text: string): string {
	const htmlEscapes: Record<string, string> = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#x27;',
		'/': '&#x2F;'
	};

	return text.replace(/[&<>"'/]/g, (char) => htmlEscapes[char] || char);
}

// LRU cache for parsed markdown to avoid re-parsing
const markdownCache = new Map<string, string>();
const MAX_CACHE_SIZE = 100;

function getCachedMarkdown(content: string): string | undefined {
	return markdownCache.get(content);
}

function setCachedMarkdown(content: string, html: string): void {
	if (markdownCache.size >= MAX_CACHE_SIZE) {
		// Remove oldest entry (first in map)
		const firstKey = markdownCache.keys().next().value;
		if (firstKey !== undefined) {
			markdownCache.delete(firstKey);
		}
	}
	markdownCache.set(content, html);
}

export function parseMarkdown(content: string): string {
	if (!content) return '';
	
	// Check cache first
	const cached = getCachedMarkdown(content);
	if (cached !== undefined) {
		return cached;
	}
	
	try {
		const rawHtml = marked.parse(content, { async: false }) as string;
		// Wrap tables in scrollable containers
		const processedHtml = wrapTablesInContainers(rawHtml);
		
		// Cache the result
		setCachedMarkdown(content, processedHtml);
		return processedHtml;
	} catch (error) {
		console.error('Failed to parse markdown:', error);
		return escapeHtml(content);
	}
}

// Clear cache when needed (e.g., memory pressure)
export function clearMarkdownCache(): void {
	markdownCache.clear();
}

// Track initialized code blocks to prevent duplicate listeners
const initializedBlocks = new Set<string>();

// Initialize copy and download buttons after DOM update
export function initCodeCopyButtons(container: HTMLElement) {
	// Handle copy buttons
	const buttons = container.querySelectorAll('.copy-btn');
	buttons.forEach(btn => {
		// Skip if already initialized
		if (btn.hasAttribute('data-initialized')) return;
		btn.setAttribute('data-initialized', 'true');

		btn.addEventListener('click', async (e) => {
			const target = e.currentTarget as HTMLElement;
			const code = decodeURIComponent(target.dataset.code || '');
			const copyIcon = target.querySelector('.copy-icon');
			const checkIcon = target.querySelector('.check-icon');
			const btnText = target.querySelector('.btn-text');

			try {
				await navigator.clipboard.writeText(code);

				// Visual feedback
				if (copyIcon && checkIcon) {
					copyIcon.classList.add('hidden');
					checkIcon.classList.remove('hidden');
				}
				if (btnText) {
					btnText.textContent = 'Copied!';
				}
				target.classList.add('bg-[#48bb78]');

				// Reset after 2 seconds
				setTimeout(() => {
					if (copyIcon && checkIcon) {
						copyIcon.classList.remove('hidden');
						checkIcon.classList.add('hidden');
					}
					if (btnText) {
						btnText.textContent = 'Copy';
					}
					target.classList.remove('bg-[#48bb78]');
				}, 2000);
			} catch (err) {
				console.error('Failed to copy:', err);
				if (btnText) {
					btnText.textContent = 'Failed';
					setTimeout(() => {
						btnText.textContent = 'Copy';
					}, 2000);
				}
			}
		});
	});

	// Handle download buttons
	const downloadButtons = container.querySelectorAll('.download-btn');
	downloadButtons.forEach(btn => {
		if (btn.hasAttribute('data-initialized')) return;
		btn.setAttribute('data-initialized', 'true');

		btn.addEventListener('click', async (e) => {
			const target = e.currentTarget as HTMLElement;
			const code = decodeURIComponent(target.dataset.code || '');
			const lang = target.dataset.lang || 'txt';

			// Determine file extension based on language
			const extensionMap: Record<string, string> = {
				'javascript': 'js',
				'typescript': 'ts',
				'python': 'py',
				'java': 'java',
				'cpp': 'cpp',
				'c': 'c',
				'csharp': 'cs',
				'go': 'go',
				'rust': 'rs',
				'ruby': 'rb',
				'php': 'php',
				'swift': 'swift',
				'kotlin': 'kt',
				'scala': 'scala',
				'r': 'r',
				'matlab': 'm',
				'shell': 'sh',
				'bash': 'sh',
				'powershell': 'ps1',
				'sql': 'sql',
				'html': 'html',
				'css': 'css',
				'scss': 'scss',
				'sass': 'sass',
				'less': 'less',
				'json': 'json',
				'xml': 'xml',
				'yaml': 'yml',
				'toml': 'toml',
				'dockerfile': 'dockerfile',
				'plaintext': 'txt',
				'markdown': 'md'
			};

			const extension = extensionMap[lang.toLowerCase()] || lang.toLowerCase() || 'txt';
			const filename = `code-${Date.now()}.${extension}`;

			try {
				const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = filename;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
			} catch (err) {
				console.error('Failed to download:', err);
			}
		});
	});
}
