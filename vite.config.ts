import { sveltekit } from '@sveltejs/kit/vite';
import { enhancedImages } from '@sveltejs/enhanced-img';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		enhancedImages(),
		sveltekit()
	],
	build: {
		// Disable CSS code splitting to avoid preload warnings
		// CSS will be inlined into JS chunks instead of separate files
		cssCodeSplit: false
	}
});
