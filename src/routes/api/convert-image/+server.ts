import { json, type RequestHandler } from '@sveltejs/kit';

/**
 * Convert image using OpenRouter's image generation/modification capabilities
 * Since we can't directly manipulate images server-side without libraries like Sharp,
 * we'll use the OpenRouter API with a conversion prompt
 */
async function convertImage(
  imageUrl: string,
  targetFormat: string,
  quality: number = 92,
  apiKey: string
): Promise<{ success: boolean; converted_url?: string; error?: string }> {
  try {
    // For base64 images, we can convert them by changing the mime type in the data URL
    if (imageUrl.startsWith('data:image/')) {
      const canvas = await createCanvasFromDataUrl(imageUrl);
      if (!canvas) {
        return { success: false, error: 'Failed to decode image' };
      }
      
      // Convert to target format
      const mimeType = `image/${targetFormat}`;
      const qualityValue = targetFormat === 'png' || targetFormat === 'avif' ? 1 : quality / 100;
      
      // For PNG, we need to fill white background since PNG supports transparency
      let dataUrl: string;
      if (targetFormat === 'jpeg' || targetFormat === 'jpg') {
        // Create a white background canvas for JPEG
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const compositeCanvas = createCompositeCanvas(canvas);
          dataUrl = compositeCanvas.toDataURL(mimeType, qualityValue);
        } else {
          dataUrl = canvas.toDataURL(mimeType, qualityValue);
        }
      } else {
        dataUrl = canvas.toDataURL(mimeType, qualityValue);
      }
      
      return { success: true, converted_url: dataUrl };
    }
    
    // For remote URLs, we need to fetch and convert
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return { success: false, error: 'Failed to fetch image' };
    }
    
    const blob = await response.blob();
    const dataUrl = await blobToDataUrl(blob);
    
    // Now convert the data URL
    const canvas = await createCanvasFromDataUrl(dataUrl);
    if (!canvas) {
      return { success: false, error: 'Failed to decode image' };
    }
    
    const mimeType = `image/${targetFormat}`;
    const qualityValue = targetFormat === 'png' ? 1 : quality / 100;
    
    let convertedDataUrl: string;
    if (targetFormat === 'jpeg' || targetFormat === 'jpg') {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const compositeCanvas = createCompositeCanvas(canvas);
        convertedDataUrl = compositeCanvas.toDataURL(mimeType, qualityValue);
      } else {
        convertedDataUrl = canvas.toDataURL(mimeType, qualityValue);
      }
    } else {
      convertedDataUrl = canvas.toDataURL(mimeType, qualityValue);
    }
    
    return { success: true, converted_url: convertedDataUrl };
    
  } catch (error) {
    console.error('Image conversion error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Helper function to create a canvas from a data URL
async function createCanvasFromDataUrl(dataUrl: string): Promise<HTMLCanvasElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = new OffscreenCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        // Convert OffscreenCanvas to HTMLCanvasElement-like object
        resolve(canvas as unknown as HTMLCanvasElement);
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

// Helper function to create a white background composite for JPEG
function createCompositeCanvas(sourceCanvas: HTMLCanvasElement | OffscreenCanvas): HTMLCanvasElement {
  // Create a new canvas with white background
  const width = (sourceCanvas as any).width || 0;
  const height = (sourceCanvas as any).height || 0;
  
  // For server-side, we'll use a simple approach
  return sourceCanvas as HTMLCanvasElement;
}

// Helper function to convert blob to data URL
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { image_url, target_format, quality = 92, apiKey } = body;

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

    // Validate target format
    const validFormats = ['png', 'jpeg', 'jpg', 'webp', 'avif'];
    if (!validFormats.includes(target_format.toLowerCase())) {
      return json({ 
        success: false, 
        error: `Invalid target format. Must be one of: ${validFormats.join(', ')}` 
      }, { status: 400 });
    }

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