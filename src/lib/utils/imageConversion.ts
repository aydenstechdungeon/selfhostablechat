/**
 * Image Conversion Utility
 * Provides client-side image format conversion capabilities
 */

export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'avif';

export interface ConversionOptions {
  quality?: number; // 0-100, only applicable for lossy formats (jpeg, webp)
  maxWidth?: number;
  maxHeight?: number;
  preserveAspectRatio?: boolean;
}

/**
 * Convert an image from one format to another
 * @param sourceUrl - The source image URL (data URL or blob URL)
 * @param targetFormat - The target format
 * @param options - Conversion options
 * @returns Promise with the converted image as a data URL
 */
export async function convertImage(
  sourceUrl: string,
  targetFormat: ImageFormat,
  options: ConversionOptions = {}
): Promise<string> {
  const {
    quality = 0.92,
    maxWidth,
    maxHeight,
    preserveAspectRatio = true
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // Calculate dimensions
        let { width, height } = img;
        
        if (maxWidth || maxHeight) {
          const aspectRatio = width / height;
          
          if (maxWidth && width > maxWidth) {
            width = maxWidth;
            if (preserveAspectRatio) {
              height = width / aspectRatio;
            }
          }
          
          if (maxHeight && height > maxHeight) {
            height = maxHeight;
            if (preserveAspectRatio) {
              width = height * aspectRatio;
            }
          }
        }
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Fill white background for JPEG (which doesn't support transparency)
        if (targetFormat === 'jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }
        
        // Draw image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to target format
        const mimeType = `image/${targetFormat}`;
        const dataUrl = canvas.toDataURL(mimeType, quality);
        
        resolve(dataUrl);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = sourceUrl;
  });
}

/**
 * Get image dimensions from a data URL or blob URL
 * @param sourceUrl - The source image URL
 * @returns Promise with width and height
 */
export async function getImageDimensions(sourceUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = sourceUrl;
  });
}

/**
 * Get file size from a data URL
 * @param dataUrl - The data URL
 * @returns Size in bytes
 */
export function getDataUrlSize(dataUrl: string): number {
  // Remove data URL prefix
  const base64 = dataUrl.split(',')[1];
  if (!base64) return 0;
  
  // Calculate size: base64 is 4/3 of the actual size
  return Math.floor(base64.length * 0.75);
}

/**
 * Format file size for display
 * @param bytes - Size in bytes
 * @returns Formatted string
 */
export function formatImageSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * Detect image format from data URL
 * @param dataUrl - The data URL
 * @returns The detected format or 'unknown'
 */
export function detectImageFormat(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/(\w+);/);
  return match ? match[1] : 'unknown';
}

/**
 * Check if the browser supports a specific image format for encoding
 * @param format - The format to check
 * @returns boolean
 */
export function supportsImageEncoding(format: ImageFormat): boolean {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  try {
    const dataUrl = canvas.toDataURL(`image/${format}`);
    return dataUrl.startsWith(`data:image/${format}`);
  } catch {
    return false;
  }
}

/**
 * Batch convert multiple images
 * @param images - Array of { url, format, options }
 * @returns Promise with array of converted images
 */
export async function batchConvertImages(
  images: Array<{
    id: string;
    url: string;
    targetFormat: ImageFormat;
    options?: ConversionOptions;
  }>
): Promise<Array<{ id: string; url: string; error?: string }>> {
  const results = await Promise.all(
    images.map(async ({ id, url, targetFormat, options }) => {
      try {
        const convertedUrl = await convertImage(url, targetFormat, options);
        return { id, url: convertedUrl };
      } catch (error) {
        return { 
          id, 
          url: '', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    })
  );
  
  return results;
}