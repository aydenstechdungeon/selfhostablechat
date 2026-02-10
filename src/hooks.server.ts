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

		const isLocal = (h: string) => h === 'localhost' || h === '127.0.0.1';

		// Allow localhost or 127.0.0.1 with any of the dev ports regardless of protocol
		if (isLocal(originUrl.hostname) && isLocal(hostName)) {
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

			let shieldOrigin = origin;
			if (!shieldOrigin && referer) {
				try {
					shieldOrigin = new URL(referer).origin;
				} catch (e) {
					// Ignore invalid referer
				}
			}

			if (!shieldOrigin || !host || !isLocalhostOrigin(shieldOrigin, host)) {
				console.warn(`CSRF blocked: origin=${origin}, referer=${referer}, host=${host}`);
				return new Response('CSRF validation failed: Origin mismatch', { status: 403 });
			}
		}
	}

	let response: Response;
	try {
		response = await resolve(event);
	} catch (err) {
		console.error('SvelteKit resolve error:', err);
		const errorHtml = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>Internal Server Error</title>
	<style>
		body { font-family: system-ui, sans-serif; padding: 2rem; line-height: 1.5; color: #333; }
		h1 { color: #e53e3e; }
		pre { background: #f7fafc; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
	</style>
</head>
<body>
	<h1>Internal Server Error</h1>
	<p>The application encountered an unexpected error.</p>
	<p>Check server logs for details.</p>
</body>
</html>`;
		return new Response(errorHtml, {
			status: 500,
			headers: {
				'Content-Type': 'text/html; charset=utf-8',
				'X-Content-Type-Options': 'nosniff'
			}
		});
	}

	// Add security headers safely
	// Note: Response objects from resolve() can be immutable (e.g. redirects)
	// We use a try-catch to avoid crashing the server on immutable responses
	try {
		response.headers.set('X-Frame-Options', 'SAMEORIGIN');
		response.headers.set('X-Content-Type-Options', 'nosniff');
		response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

		// Content Security Policy for image rendering
		response.headers.set(
			'Content-Security-Policy',
			[
				"default-src 'self' http://127.0.0.1:* http://localhost:*",
				"script-src 'self' 'unsafe-inline' 'unsafe-eval' http://127.0.0.1:* http://localhost:*",
				"style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com",
				"style-src-elem 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com",
				"img-src 'self' data: https: blob:",
				"font-src 'self' data: https://fonts.gstatic.com",
				"connect-src 'self' https://openrouter.ai http://127.0.0.1:* http://localhost:*",
				"frame-ancestors 'self'"
			].join('; ')
		);
	} catch (e) {
		// If response is immutable (like a redirect), we can't set headers directly.
		// For redirects, security headers are less critical but we could clone the response if needed.
		// For now, we just log and continue to avoid a 500 error.
		if (event.url.pathname !== '/api/chat') {
			// Don't log for common API routes to keep logs clean
			console.debug('Could not set security headers on immutable response:', event.url.pathname);
		}
	}


	// CORS headers for API routes
	if (event.url.pathname.startsWith('/api/')) {
		const origin = event.request.headers.get('origin') || event.url.origin;
		response.headers.set('Access-Control-Allow-Origin', origin);
		response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
		response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
		response.headers.set('Access-Control-Allow-Credentials', 'true');
		response.headers.set('Access-Control-Max-Age', '86400');
	}

	return response;
};
