
import { FrameCoord } from '../constants';

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Required for loading cross-domain images onto a canvas
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => {
      console.error(`Failed to load image: ${src}`, err);
      reject(new Error(`Failed to load image: ${src}`));
    };
    img.src = src;
  });
};

/**
 * Analyzes a PNG image to find transparent rectangular regions.
 * Returns coordinates for photo placement and the frame dimensions.
 */
export const calculateFrameLayout = async (frameSrc: string): Promise<{ coords: FrameCoord[], width: number, height: number }> => {
  const img = await loadImage(frameSrc);
  const canvas = document.createElement('canvas');
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  if (!ctx) throw new Error("Could not get canvas context for frame analysis");
  
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  
  const visited = new Uint8Array(w * h); // Track visited pixels
  const rects: FrameCoord[] = [];

  // Helper to get index in data array
  const getIdx = (x: number, y: number) => (y * w + x) * 4;

  // Helper to check if pixel is transparent
  const isTransparent = (x: number, y: number) => data[getIdx(x, y) + 3] < 20;

  // Threshold for "touching the edge"
  // We use a small margin (2px) because sometimes there's a 1px artifact line at the edge
  const edgeThreshold = 2;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const offset = y * w + x;
      
      // Start a new region flood fill
      if (!visited[offset] && isTransparent(x, y)) {
        let minX = x, maxX = x, minY = y, maxY = y;
        let touchesEdge = false;
        
        const stack = [[x, y]];
        visited[offset] = 1;
        
        while (stack.length > 0) {
          const [cx, cy] = stack.pop()!;
          
          // Check if close to edge
          if (cx < edgeThreshold || cy < edgeThreshold || cx >= w - edgeThreshold || cy >= h - edgeThreshold) {
            touchesEdge = true;
          }

          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          // 4 neighbors
          const neighbors = [
            [cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]
          ];

          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              const nOffset = ny * w + nx;
              if (!visited[nOffset] && isTransparent(nx, ny)) {
                visited[nOffset] = 1;
                stack.push([nx, ny]);
              }
            }
          }
        }

        // If this region touches the edge, it's likely the background margin -> ignore it.
        if (touchesEdge) continue;

        const regionW = maxX - minX + 1;
        const regionH = maxY - minY + 1;
        
        // Filter:
        // 1. Must be significant size (>5% of width/height) to avoid noise.
        // 2. Must NOT be excessively tall (>80% height) as that suggests a side strip that didn't touch edge.
        if (regionW > w * 0.05 && regionH > h * 0.05 && regionH < h * 0.8) {
            rects.push({ x: minX, y: minY, w: regionW, h: regionH });
        }
      }
    }
  }

  // Sort by Y position (top to bottom)
  rects.sort((a, b) => a.y - b.y);

  // Safety: If we detected too many regions (e.g. > 4 for a 4-cut),
  // try to pick the "best" ones.
  // Heuristic: The photo slots are likely the largest regions.
  if (rects.length > 4) {
      // Sort by area descending
      rects.sort((a, b) => (b.w * b.h) - (a.w * a.h));
      // Keep top 4
      rects.length = 4;
      // Sort back by Y
      rects.sort((a, b) => a.y - b.y);
  }

  return {
    coords: rects,
    width: w,
    height: h
  };
};

export const mergePhotosWithFrame = async (
  photoDataUrls: string[],
  frameSrc: string,
  coords: FrameCoord[]
): Promise<{ blob: Blob, dataUrl: string }> => {
  const mergeCanvas = document.createElement('canvas');
  const ctx = mergeCanvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  try {
    const frameImg = await loadImage(frameSrc);
    const photoImages = await Promise.all(photoDataUrls.map(loadImage));

    // Set canvas dimensions to match the frame image's natural size
    mergeCanvas.width = frameImg.naturalWidth;
    mergeCanvas.height = frameImg.naturalHeight;

    // Draw the 4 captured photos onto the canvas first
    photoImages.forEach((img, index) => {
      if (coords[index]) {
        const c = coords[index];
        
        // Calculate dimensions to cover the slot while maintaining aspect ratio (object-cover)
        const slotRatio = c.w / c.h;
        const imgRatio = img.width / img.height;
        
        let drawW, drawH, drawX, drawY;
        
        if (imgRatio > slotRatio) {
            // Image is wider than slot -> match height, crop width
            drawH = c.h;
            drawW = c.h * imgRatio;
            drawX = c.x + (c.w - drawW) / 2; // Center horizontally
            drawY = c.y;
        } else {
            // Image is taller than slot -> match width, crop height
            drawW = c.w;
            drawH = c.w / imgRatio;
            drawX = c.x;
            drawY = c.y + (c.h - drawH) / 2; // Center vertically
        }

        // Save context to apply clipping
        ctx.save();
        ctx.beginPath();
        // Define the clipping path based on the detected slot
        ctx.rect(c.x, c.y, c.w, c.h);
        ctx.clip();
        
        // Draw the image centered and covering the slot area
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        
        // Restore context to remove clipping for subsequent operations
        ctx.restore();
      }
    });

    // Draw the transparent frame on top of the photos
    ctx.drawImage(frameImg, 0, 0);

    const dataUrl = mergeCanvas.toDataURL('image/png');
    
    const blob = await new Promise<Blob>((resolve, reject) => {
        mergeCanvas.toBlob((b) => {
            if (b) {
                resolve(b);
            } else {
                reject(new Error("Canvas toBlob failed"));
            }
        }, 'image/png');
    });

    return { blob, dataUrl };
  } catch (error) {
    console.error("Error in mergePhotosWithFrame:", error);
    throw error;
  }
};
