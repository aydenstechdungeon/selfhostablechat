/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="es2020" />
/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

import { build, files, version } from '$service-worker';

// Create unique cache name based on build version
const STATIC_ASSETS = `static-${version}`;

// Assets to cache immediately on install
const ASSETS = [
	...build, // the app itself
	...files  // everything in `static`
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
	async function addFilesToCache() {
		const cache = await caches.open(STATIC_ASSETS);
		await cache.addAll(ASSETS);
	}

	event.waitUntil(addFilesToCache());
	// Skip waiting to activate immediately
	void self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
	async function deleteOldCaches() {
		const cacheNames = await caches.keys();
		const validCaches = [STATIC_ASSETS];
		
		// Delete any cache that doesn't match our current version
		const deletions = cacheNames
			.filter(name => !validCaches.includes(name))
			.map(name => caches.delete(name));
			
		await Promise.all(deletions);
	}

	event.waitUntil(deleteOldCaches());
	// Take control of all clients immediately
	event.waitUntil(self.clients.claim());
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
	// Ignore non-GET requests
	if (event.request.method !== 'GET') return;
	
	// Ignore API routes - always fetch from network
	if (event.request.url.includes('/api/')) {
		return;
	}
	
	// Ignore browser extensions
	if (!(event.request.url.startsWith('http'))) return;

	async function respond() {
		const cache = await caches.open(STATIC_ASSETS);

		// Try to get from cache first
		const cachedResponse = await cache.match(event.request);
		
		if (cachedResponse) {
			return cachedResponse;
		}

		// Not in cache - try network
		try {
			const response = await fetch(event.request);
			
			// Cache successful same-origin responses
			if (response.status === 200 && response.type === 'basic') {
				const responseClone = response.clone();
				cache.put(event.request, responseClone);
			}
			
			return response;
		} catch (error) {
			// Network failed - try to return offline fallback
			// For HTML pages, we could return an offline page
			if (event.request.headers.get('accept')?.includes('text/html')) {
				const offlineResponse = await cache.match('/');
				if (offlineResponse) {
					return offlineResponse;
				}
			}
			
			throw error;
		}
	}

	event.respondWith(respond());
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') {
		void self.skipWaiting();
	}
});
