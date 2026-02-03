import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			out: 'build',
			precompress: true,
			envPrefix: ''
		}),
		serviceWorker: {
			register: true
		},
		prerender: {
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
		}
	}
};

export default config;
