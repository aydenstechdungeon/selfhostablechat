import adapter from '@sveltejs/adapter-node';

// Disable prerendering in Docker builds - app needs runtime database
const isPrerenderEnabled = process.env.SVELTEKIT_ADAPTER_NODE_PRERENDER !== 'false';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			out: 'build',
			precompress: true,
			envPrefix: ''
		}),
		serviceWorker: {
			register: false
		},
		prerender: isPrerenderEnabled ? {
			entries: [
				'*',
				'/chat/new',
				'/settings',
				'/dashboard'
			],
			handleHttpError: ({ path, message }) => {
				// Ignore errors from dynamic routes that will be handled at runtime
				if (path.startsWith('/api/')) {
					console.warn(`Skipping API route during prerender: ${path}`);
					return;
				}
				// Fail on other errors
				throw new Error(message);
			},
			handleMissingId: 'ignore'
		} : {
			// Prerender disabled - no entries to prerender
			entries: []
		}
	}
};

export default config;
