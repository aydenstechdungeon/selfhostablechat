import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
    // CSRF Protection: Check origin for state-changing requests
    if (event.request.method !== 'GET' && event.request.method !== 'HEAD') {
        const origin = event.request.headers.get('origin');
        const host = event.request.headers.get('host');

        // Skip CSRF check if no origin header (browser same-origin requests may omit it)
        // Or if origin matches the host
        if (origin && host) {
            const expectedOrigin = `${event.url.protocol}//${host}`;

            // Allow requests from same origin
            if (origin !== expectedOrigin) {
                // For API routes, enforce strict origin matching
                if (event.url.pathname.startsWith('/api/')) {
                    console.warn(`CSRF blocked: origin=${origin}, expected=${expectedOrigin}`);
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
            "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com",
            "style-src-elem 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com",
            "img-src 'self' data: https: blob:",
            "font-src 'self' data: https://fonts.gstatic.com",
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
