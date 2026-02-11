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
		cssCodeSplit: true,
		chunkSizeWarningLimit: 1600
	},
	ssr: {
		// Bundle all dependencies to avoid issues with node_modules resolution in Electron AppImage
		// But exclude node built-ins and electron itself (which is provided by the runner)
		noExternal: /^(?!node:|electron|@electron|@capacitor|highlight\.js).*$/
	}
});
