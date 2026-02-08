import type { Handle } from '@sveltejs/kit';

const ALLOWED_DEV_PORTS = [5173, 5174, 3420, 3421, 3422];

function isLocalhostOrigin(origin: string, host: string): boolean {
	// Extract hostname and port from origin
	try {
		const originUrl = new URL(origin);
		const [hostName, hostPort] = host.split(':');
		const originPort = originUrl.port
			? parseInt(originUrl.port, 10)
			: originUrl.protocol === 'https:'
				? 443
				: 80;
		const expectedPort = hostPort ? parseInt(hostPort, 10) : 443;

		// Allow localhost with any of the dev ports regardless of protocol
		if (originUrl.hostname === 'localhost' && hostName === 'localhost') {
			return (
				ALLOWED_DEV_PORTS.includes(originPort) && ALLOWED_DEV_PORTS.includes(expectedPort)
			);
		}

		// For non-localhost, require exact match
		return originUrl.host === host;
	} catch {
		return false;
	}
}

export const handle: Handle = async ({ event, resolve }) => {
	// CSRF Protection: Check origin for state-changing requests
	if (event.request.method !== 'GET' && event.request.method !== 'HEAD') {
		const origin = event.request.headers.get('origin');
		const host = event.request.headers.get('host');
		const referer = event.request.headers.get('referer');

		// Strictly require origin or referer for state-changing requests to /api/
		if (event.url.pathname.startsWith('/api/')) {
			if (!origin && !referer) {
				console.warn(`CSRF blocked: Missing origin and referer headers for ${event.url.pathname}`);
				return new Response('CSRF validation failed: Missing security headers', { status: 403 });
			}

			const shieldOrigin = origin || (referer ? new URL(referer).origin : null);

			if (!shieldOrigin || !host || !isLocalhostOrigin(shieldOrigin, host)) {
				console.warn(`CSRF blocked: origin=${origin}, referer=${referer}, host=${host}`);
				return new Response('CSRF validation failed: Origin mismatch', { status: 403 });
			}
		}
	}

	const response = await resolve(event);

	// Add security headers
	response.headers.set('X-Frame-Options', 'SAMEORIGIN');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

	// Content Security Policy for image rendering
	response.headers.set(
		'Content-Security-Policy',
		[
			"default-src 'self'",
			"script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Svelte needs unsafe-eval in dev
			"style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com",
			"style-src-elem 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com",
			"img-src 'self' data: https: blob:",
			"font-src 'self' data: https://fonts.gstatic.com",
			"connect-src 'self' https://openrouter.ai",
			"frame-ancestors 'self'"
		].join('; ')
	);

	// CORS headers for API routes
	if (event.url.pathname.startsWith('/api/')) {
		response.headers.set('Access-Control-Allow-Origin', event.url.origin);
		response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
		response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
		response.headers.set('Access-Control-Allow-Credentials', 'true');
		response.headers.set('Access-Control-Max-Age', '86400');
	}

	return response;
};
