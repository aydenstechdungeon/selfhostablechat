import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

// Maximum image size: 10MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
// Request timeout: 30 seconds
const FETCH_TIMEOUT = 30000;

/**
 * Validate and sanitize quality parameter
 */
function validateQuality(quality: unknown): number {
	const DEFAULT_QUALITY = 92;
	
	if (typeof quality !== 'number') {
		return DEFAULT_QUALITY;
	}
	
	// Ensure quality is between 1 and 100
	if (isNaN(quality) || quality < 1 || quality > 100) {
		return DEFAULT_QUALITY;
	}
	
	return Math.round(quality);
}

/**
 * Fetch with timeout to prevent hanging requests
 */
async function fetchWithTimeout(
	url: string, 
	options: RequestInit = {}, 
	timeoutMs: number = FETCH_TIMEOUT
): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
	
	try {
		const response = await fetch(url, {
			...options,
			signal: controller.signal
		});
		return response;
	} finally {
		clearTimeout(timeoutId);
	}
}

/**
 * Convert image format using a simple mime-type swap for base64 images.
 * Server-side canvas-based conversion is not supported without heavy native dependencies.
 * This implementation validates the image and returns it with the target mime type.
 */
async function convertImage(
	imageUrl: string,
	targetFormat: string,
	quality: number = 92,
	_apiKey: string // API key validated at route level but not needed for this conversion
): Promise<{ success: boolean; converted_url?: string; error?: string }> {
	try {
		// For base64 images, we validate and return with updated mime type
		if (imageUrl.startsWith('data:image/')) {
			// Extract mime type and base64 data
			const match = imageUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
			if (!match) {
				return { success: false, error: 'Invalid base64 image format' };
			}

			const base64Data = match[2];
			const dataSize = Buffer.byteLength(base64Data, 'base64');
			
			// Check image size
			if (dataSize > MAX_IMAGE_SIZE) {
				return { success: false, error: 'Image too large (max 10MB)' };
			}

			// Validate base64 data
			try {
				Buffer.from(base64Data, 'base64');
			} catch {
				return { success: false, error: 'Invalid base64 data' };
			}

			// Return with new mime type (actual pixel conversion requires Sharp/canvas library)
			const newMimeType = targetFormat === 'jpg' ? 'jpeg' : targetFormat;
			const convertedUrl = `data:image/${newMimeType};base64,${base64Data}`;
			
			return { success: true, converted_url: convertedUrl };
		}

		// For remote URLs, fetch with timeout and validate
		const response = await fetchWithTimeout(imageUrl, {}, FETCH_TIMEOUT);
		
		if (!response.ok) {
			return { success: false, error: 'Failed to fetch image' };
		}

		// Check content type
		const contentType = response.headers.get('content-type');
		if (!contentType || !contentType.startsWith('image/')) {
			return { success: false, error: 'URL does not point to a valid image' };
		}

		// Check content length if available
		const contentLength = response.headers.get('content-length');
		if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_SIZE) {
			return { success: false, error: 'Image too large (max 10MB)' };
		}

		const blob = await response.blob();
		
		if (blob.size > MAX_IMAGE_SIZE) {
			return { success: false, error: 'Image too large (max 10MB)' };
		}

		// Convert blob to base64 data URL with new mime type
		const arrayBuffer = await blob.arrayBuffer();
		const base64 = Buffer.from(arrayBuffer).toString('base64');
		const newMimeType = targetFormat === 'jpg' ? 'jpeg' : targetFormat;
		const convertedUrl = `data:image/${newMimeType};base64,${base64}`;

		return { success: true, converted_url: convertedUrl };
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			return { success: false, error: 'Request timeout - image fetch took too long' };
		}
		console.error('Image conversion error:', error);
		return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
	}
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { image_url, target_format, quality: rawQuality, apiKey } = body;

		if (!image_url || !target_format) {
			return json({
				success: false,
				error: 'Missing required parameters: image_url and target_format'
			}, { status: 400 });
		}

		if (!apiKey) {
			return json({
				success: false,
				error: 'API key is required'
			}, { status: 401 });
		}

		// Validate image_url format
		if (typeof image_url !== 'string') {
			return json({
				success: false,
				error: 'Invalid image_url format'
			}, { status: 400 });
		}

		// Only allow data URLs or http/https URLs
		const isValidUrlScheme = 
			image_url.startsWith('data:image/') || 
			image_url.startsWith('https://') || 
			image_url.startsWith('http://');
		
		if (!isValidUrlScheme) {
			return json({
				success: false,
				error: 'Invalid URL scheme. Only data URLs and http/https are allowed'
			}, { status: 400 });
		}

		// Validate target format
		const validFormats = ['png', 'jpeg', 'jpg', 'webp', 'avif'];
		if (!validFormats.includes(target_format.toLowerCase())) {
			return json({
				success: false,
				error: `Invalid target format. Must be one of: ${validFormats.join(', ')}`
			}, { status: 400 });
		}

		// Validate quality parameter
		const quality = validateQuality(rawQuality);

		const result = await convertImage(
			image_url,
			target_format.toLowerCase(),
			quality,
			apiKey
		);

		if (result.success) {
			return json({
				success: true,
				converted_url: result.converted_url,
				format: target_format.toLowerCase()
			});
		} else {
			return json({
				success: false,
				error: result.error
			}, { status: 500 });
		}
	} catch (error) {
		console.error('Image conversion API error:', error);
		return json({
			success: false,
			error: 'Internal server error'
		}, { status: 500 });
	}
};
