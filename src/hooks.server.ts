import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
    // CSRF Protection: Check origin for state-changing requests
    if (event.request.method !== 'GET' && event.request.method !== 'HEAD') {
        const origin = event.request.headers.get('origin');
        const host = event.request.headers.get('host');

        // Block requests without origin header (except from same origin)
        if (origin && host) {
            const originUrl = new URL(origin);
            const hostUrl = `${event.url.protocol}//${host}`;

            if (origin !== hostUrl) {
                // For API routes, enforce strict origin matching
                if (event.url.pathname.startsWith('/api/')) {
                    return new Response('CSRF validation failed', { status: 403 });
                }
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
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https: blob:",
            "font-src 'self' data:",
            "connect-src 'self' https://openrouter.ai",
            "frame-ancestors 'self'",
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
