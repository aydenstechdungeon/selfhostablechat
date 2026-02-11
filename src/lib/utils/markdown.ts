import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Lazy-loaded highlight.js instance to avoid SSR issues
let hljsInstance: typeof import('highlight.js').default | null = null;
let hljsLoadPromise: Promise<typeof import('highlight.js').default> | null = null;

async function getHighlightJS() {
	if (!hljsInstance) {
		if (!hljsLoadPromise) {
			hljsLoadPromise = import('highlight.js').then(m => m.default);
		}
		hljsInstance = await hljsLoadPromise;
	}
	return hljsInstance;
}

// Configure marked with syntax highlighting
marked.use({
	gfm: true,
	breaks: true
});

// Custom renderer for code blocks
const renderer = new marked.Renderer();

renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
	const codeId = `code-${Math.random().toString(36).substring(2, 11)}`;

	// Handle mermaid diagrams specially
	if (lang === 'mermaid') {
		const escapedCode = escapeHtml(text);
		return `<div class="mermaid-block my-4 rounded-lg overflow-hidden bg-[#1a1f2e] border border-[#2d3748]" id="${codeId}" data-mermaid-code="${encodeURIComponent(text)}">
   <div class="mermaid-header flex items-center justify-between px-4 py-2 bg-[#0f1419] border-b border-[#2d3748]">
     <span class="text-xs text-[#a0aec0] font-mono">mermaid</span>
     <div class="flex items-center gap-1 bg-[#1a1f2e] rounded-lg p-1">
       <button class="mermaid-expand-btn flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 text-[#a0aec0] hover:text-[#e2e8f0] hover:bg-[#2d3748]" title="View fullscreen">
         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
       </button>
       <button class="mermaid-tab-btn flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 bg-[#4299e1] text-white" data-tab="diagram" title="View diagram">
         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
         Diagram
       </button>
       <button class="mermaid-tab-btn flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 text-[#a0aec0] hover:text-[#e2e8f0] hover:bg-[#2d3748]" data-tab="raw" title="View raw code">
         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
         Raw
       </button>
     </div>
   </div>
   <div class="mermaid-content">
     <div class="mermaid-diagram p-4 flex items-center justify-center min-h-[100px] overflow-x-auto" data-initialized="false">
       <div class="text-[#a0aec0] text-sm">Loading diagram...</div>
     </div>
     <pre class="mermaid-raw m-0 p-4 overflow-x-auto hidden"><code class="text-sm text-[#e2e8f0] font-mono whitespace-pre-wrap">${escapedCode}</code></pre>
   </div>
 </div>`;
	}

	// For SSR or when hljs isn't loaded yet, return plain code
	// The client-side will re-render with highlighting
	const escapedText = escapeHtml(text);
	const validLanguage = lang || 'plaintext';

	return `<div class="code-block relative group my-4 rounded-lg overflow-hidden bg-[#1a1f2e] border border-[#2d3748]" id="${codeId}" data-needs-highlighting="true" data-code-lang="${validLanguage}" data-code-text="${encodeURIComponent(text)}">
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
    <pre class="m-0 p-4 overflow-x-auto"><code class="language-${validLanguage}">${escapedText}</code></pre>
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

	const headerHtml = header.map((cell: string) => `<th class="px-4 py-3 select-text text-left text-sm font-semibold bg-[#0f1419] text-[#e2e8f0] border-b border-[#2d3748]">${escapeHtml(cell)}</th>`).join('');
	const rowsHtml = rows.map((row: string[], i: number) => {
		const isLastRow = i === rows.length - 1;
		const cells = row.map((cell: string) => `<td class="px-4 py-3 select-text text-sm text-[#e2e8f0] ${isLastRow ? '' : 'border-b border-[#2d3748]/50'}">${escapeHtml(cell)}</td>`).join('');
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
	// Uses lazy loading with low fetch priority for off-screen images
	return `<button 
    class="image-preview-button relative group overflow-hidden rounded-lg border border-[#2d3748] hover:border-[#4299e1] transition-colors inline-block my-2 cursor-pointer bg-transparent p-0"
    data-image-url="${safeHref.replace(/"/g, '&quot;')}" 
    data-image-alt="${(text || 'Image').replace(/"/g, '&quot;')}"
  >
    <img 
      src="${safeHref.replace(/"/g, '&quot;')}" 
      alt="${(text || '').replace(/"/g, '&quot;')}" 
      class="max-w-full h-auto max-h-[65vh] block object-contain"
      loading="lazy"
      fetchpriority="low"
      decoding="async"
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
const MAX_CACHE_SIZE = 200; // Increased for longer conversations

// Use a simple hash for content keys to avoid memory issues with long content
function hashContent(content: string): string {
	// For short content, use directly; for long content, use length + first/last 50 chars
	if (content.length < 200) return content;
	return `${content.length}:${content.slice(0, 50)}:${content.slice(-50)}`;
}

function getCachedMarkdown(content: string): string | undefined {
	const key = hashContent(content);
	const result = markdownCache.get(key);
	if (result !== undefined) {
		// Move to end (most recently used)
		markdownCache.delete(key);
		markdownCache.set(key, result);
	}
	return result;
}

function setCachedMarkdown(content: string, html: string): void {
	const key = hashContent(content);
	if (markdownCache.size >= MAX_CACHE_SIZE) {
		// Remove oldest entry (first in map)
		const firstKey = markdownCache.keys().next().value;
		if (firstKey !== undefined) {
			markdownCache.delete(firstKey);
		}
	}
	markdownCache.set(key, html);
}

// Cache for streaming content - only cache complete or substantial content
const streamingContentCache = new Set<string>();

// Initialize DOMPurify hook once
if (typeof window !== 'undefined') {
	DOMPurify.addHook('afterSanitizeAttributes', (node) => {
		if (node.tagName === 'A' && node.hasAttribute('href')) {
			node.setAttribute('target', '_blank');
			node.setAttribute('rel', 'noopener noreferrer');
		}
	});
}

export function parseMarkdown(content: string, isStreaming: boolean = false): string {
	if (!content) return '';

	// For streaming content, only cache if it's substantial or contains markdown structures
	if (isStreaming) {
		// Skip caching for very short streaming content (< 50 chars)
		if (content.length < 50) {
			try {
				const rawHtml = marked.parse(content, { async: false }) as string;
				const sanitized = typeof window !== 'undefined'
					? DOMPurify.sanitize(rawHtml, {
						ADD_ATTR: ['target', 'rel', 'data-image-url', 'data-image-alt', 'data-mermaid-code', 'data-tab', 'data-initialized'],
						ADD_TAGS: ['button'],
					})
					: rawHtml; // Fallback for SSR
				return wrapTablesInContainers(sanitized);
			} catch (error) {
				return escapeHtml(content);
			}
		}

		// Only cache if we've seen this content before (re-render) or it has markdown structures
		const cacheKey = hashContent(content);
		if (!streamingContentCache.has(cacheKey)) {
			streamingContentCache.add(cacheKey);
			// Check for markdown structures
			const hasMarkdown = /[!\[\]\(\)#\*\-\`\|\\]/.test(content);
			if (!hasMarkdown && content.length < 200) {
				try {
					const rawHtml = marked.parse(content, { async: false }) as string;
					const sanitized = typeof window !== 'undefined'
						? DOMPurify.sanitize(rawHtml, {
							ADD_ATTR: ['target', 'rel', 'data-image-url', 'data-image-alt', 'data-mermaid-code', 'data-tab', 'data-initialized'],
							ADD_TAGS: ['button'],
						})
						: rawHtml;
					return wrapTablesInContainers(sanitized);
				} catch (error) {
					return escapeHtml(content);
				}
			}
		}
	}

	// Check cache first
	const cached = getCachedMarkdown(content);
	if (cached !== undefined) {
		return cached;
	}

	try {
		const rawHtml = marked.parse(content, { async: false }) as string;

		// Sanitize HTML
		const sanitized = typeof window !== 'undefined'
			? DOMPurify.sanitize(rawHtml, {
				ADD_ATTR: ['target', 'rel', 'data-image-url', 'data-image-alt', 'data-mermaid-code', 'data-tab', 'data-initialized'],
				ADD_TAGS: ['button'], // Allow these for custom renderers
			})
			: rawHtml;

		// Wrap tables in scrollable containers
		const processedHtml = wrapTablesInContainers(sanitized);

		// Cache the result
		setCachedMarkdown(content, processedHtml);
		return processedHtml;
	} catch (error) {
		console.error('Failed to parse markdown:', error);
		return escapeHtml(content);
	}
}

// Clear streaming cache periodically to prevent memory leaks
setInterval(() => {
	streamingContentCache.clear();
}, 60000); // Clear every minute

// Clear cache when needed (e.g., memory pressure)
export function clearMarkdownCache(): void {
	markdownCache.clear();
}

// Track initialized code blocks to prevent duplicate listeners
const initializedBlocks = new Set<string>();

// Initialize copy and download buttons after DOM update
export async function initCodeCopyButtons(container: HTMLElement) {
	// Apply syntax highlighting to code blocks that need it (client-side only)
	if (typeof window !== 'undefined') {
		const codeBlocks = container.querySelectorAll('.code-block[data-needs-highlighting="true"]');
		if (codeBlocks.length > 0) {
			try {
				const hljs = await getHighlightJS();
				codeBlocks.forEach(block => {
					const codeElement = block.querySelector('code');
					const lang = block.getAttribute('data-code-lang') || 'plaintext';
					const encodedText = block.getAttribute('data-code-text') || '';
					const text = decodeURIComponent(encodedText);

					if (codeElement && text) {
						const validLanguage = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
						const highlighted = hljs.highlight(text, { language: validLanguage }).value;
						codeElement.innerHTML = highlighted;
						codeElement.classList.add('hljs');
						block.removeAttribute('data-needs-highlighting');
					}
				});
			} catch (err) {
				console.error('Failed to apply syntax highlighting:', err);
			}
		}
	}

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

	// Handle mermaid diagrams
	initMermaidDiagrams(container);
}

// Lazy-loaded mermaid instance
let mermaidInstance: typeof import('mermaid').default | null = null;
let mermaidLoadPromise: Promise<typeof import('mermaid').default> | null = null;

// Initialize mermaid diagrams
// Preprocess mermaid code to fix common issues
export function preprocessMermaidCode(code: string): string {
	let processed = code
		// Replace <br/> and <br /> with proper line break syntax for mermaid
		// In mermaid, you can use <br> (without slash) inside node labels
		.replace(/<br\s*\/>/gi, '<br>')
		.trim();

	// For erDiagram: quote entity names with hyphens or special characters
	// Match erDiagram entity definitions like: EntityName { or EntityName {
	if (processed.includes('erDiagram')) {
		// Quote entity names that contain hyphens (but aren't already quoted)
		// Pattern: match entity names at start of line or after relationship arrows
		// Avoid matching relationships like o--|| by requiring alphanumeric chars after hyphens
		processed = processed.replace(
			/(^|\s|>|})(\s*)([A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)+)(\s*[{\s])/gm,
			'$1$2"$3"$4'
		);
	}

	// For flowchart: quote node labels containing parentheses, brackets, or special chars
	// Pattern: NodeID[Label] or NodeID["Label"] - quote unquoted labels with special chars
	// Matches: ID[text with (parens)] but not ID["already quoted"]
	if (processed.includes('flowchart') || processed.includes('graph')) {
		// Match node definitions with square brackets that have unquoted labels containing special chars
		// Node ID pattern: letters, numbers, underscores, some special chars
		processed = processed.replace(
			/([A-Za-z_][A-Za-z0-9_]*)\[([^\]"[]*[\(\)\{\}<>][^\]"[]*)\]/g,
			(nodeId: string, id: string, label: string) => {
				// If label contains special chars and isn't already quoted, quote it
				if (label && !label.startsWith('"')) {
					return `${id}["${label}"]`;
				}
				return `${nodeId}[${label}]`;
			}
		);

		// Fix subgraph/node ID conflicts: when a node inside a subgraph has the same ID as the subgraph
		// This causes "Setting X as parent of X would create a cycle" error
		// Pattern: subgraph ID["label"] ... ID[...] end
		// Solution: rename the inner node ID by adding a suffix
		const subgraphMatches = processed.matchAll(/subgraph\s+([A-Za-z_][A-Za-z0-9_]*)\s*\[/g);
		const subgraphIds = new Set<string>();
		for (const match of subgraphMatches) {
			subgraphIds.add(match[1]);
		}

		// For each subgraph ID, find nodes with the same ID inside subgraphs and rename them
		for (const subgraphId of subgraphIds) {
			// Match pattern: subgraphId[label] that appears after a subgraph declaration
			// We need to be careful to only rename nodes INSIDE subgraphs, not the subgraph declarations themselves
			// Pattern: look for node definitions that match subgraph ID but aren't part of "subgraph ID["
			const nodePattern = new RegExp(
				`(?<!subgraph\\s+)(${subgraphId})(\\[[^\\]]+\\])`,
				'g'
			);
			processed = processed.replace(nodePattern, `$1_Node$2`);
		}
	}

	return processed;
}

// Initialize mermaid diagrams
async function initMermaidDiagrams(container: HTMLElement) {
	const mermaidBlocks = container.querySelectorAll('.mermaid-block');

	if (mermaidBlocks.length === 0) return;

	// Lazy load mermaid only when needed - use promise to prevent race conditions
	if (!mermaidInstance) {
		if (!mermaidLoadPromise) {
			mermaidLoadPromise = import('mermaid').then(m => m.default);
		}

		try {
			mermaidInstance = await mermaidLoadPromise;
			mermaidInstance.initialize({
				startOnLoad: false,
				theme: 'dark',
				securityLevel: 'loose',
				fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
			});
		} catch (err) {
			console.error('Failed to load mermaid:', err);
			mermaidLoadPromise = null;
			// Show error in all mermaid blocks
			mermaidBlocks.forEach(block => {
				const diagramDiv = block.querySelector('.mermaid-diagram');
				if (diagramDiv) {
					diagramDiv.innerHTML = '<span class="text-red-400 text-sm">Failed to load diagram renderer</span>';
				}
			});
			return;
		}
	}

	for (const block of mermaidBlocks) {
		// Skip if already initialized
		if (block.hasAttribute('data-initialized')) {
			continue;
		}
		block.setAttribute('data-initialized', 'true');

		const diagramDiv = block.querySelector('.mermaid-diagram') as HTMLElement;
		const rawPre = block.querySelector('.mermaid-raw') as HTMLElement;
		const tabButtons = block.querySelectorAll('.mermaid-tab-btn');
		const expandBtn = block.querySelector('.mermaid-expand-btn') as HTMLElement;
		const mermaidCode = decodeURIComponent(block.getAttribute('data-mermaid-code') || '');

		// Expand button - dispatch custom event for parent to handle
		if (expandBtn && !expandBtn.hasAttribute('data-initialized')) {
			expandBtn.setAttribute('data-initialized', 'true');
			expandBtn.addEventListener('click', () => {
				const event = new CustomEvent('mermaid-expand', {
					detail: { code: mermaidCode },
					bubbles: true
				});
				block.dispatchEvent(event);
			});
		}

		// Tab switching
		tabButtons.forEach(btn => {
			btn.addEventListener('click', (e) => {
				const target = e.currentTarget as HTMLElement;
				const tab = target.getAttribute('data-tab');

				// Update button styles
				tabButtons.forEach(b => {
					if (b.getAttribute('data-tab') === tab) {
						b.classList.add('bg-[#4299e1]', 'text-white');
						b.classList.remove('text-[#a0aec0]', 'hover:text-[#e2e8f0]', 'hover:bg-[#2d3748]');
					} else {
						b.classList.remove('bg-[#4299e1]', 'text-white');
						b.classList.add('text-[#a0aec0]', 'hover:text-[#e2e8f0]', 'hover:bg-[#2d3748]');
					}
				});

				// Toggle visibility
				if (tab === 'diagram') {
					diagramDiv.classList.remove('hidden');
					rawPre.classList.add('hidden');
				} else {
					diagramDiv.classList.add('hidden');
					rawPre.classList.remove('hidden');
				}
			});
		});

		// Render diagram
		if (diagramDiv && mermaidCode && diagramDiv.getAttribute('data-initialized') !== 'rendered' && mermaidInstance) {
			try {
				const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
				const processedCode = preprocessMermaidCode(mermaidCode);
				const { svg } = await mermaidInstance.render(id, processedCode);
				diagramDiv.innerHTML = svg;
				diagramDiv.setAttribute('data-initialized', 'rendered');
			} catch (err) {
				console.error('Failed to render mermaid diagram:', err);
				diagramDiv.innerHTML = '<span class="text-red-400 text-sm">Failed to render diagram. Check syntax.</span>';
			}
		}
	}
}
