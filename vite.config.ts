import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		// Disable CSS code splitting to avoid preload warnings
		// CSS will be inlined into JS chunks instead of separate files
		cssCodeSplit: false
	}
});
