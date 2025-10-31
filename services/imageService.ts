
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
        ctx.drawImage(img, c.x, c.y, c.w, c.h);
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
