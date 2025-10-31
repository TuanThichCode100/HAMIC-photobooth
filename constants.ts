// FIX: Provide implementation for constants to resolve module errors.
export interface FrameCoord {
    x: number;
    y: number;
    w: number;
    h: number;
}

// Using a higher resolution for the output image (600x1440) for better quality.
const commonCoords: FrameCoord[] = [
    { x: 50, y: 120, w: 500, h: 280 },
    { x: 50, y: 420, w: 500, h: 280 },
    { x: 50, y: 720, w: 500, h: 280 },
    { x: 50, y: 1020, w: 500, h: 280 },
];

const createFrameDataUrl = (text: string, bgColor: string, textColor: string): string => {
    const canvas = document.createElement('canvas');
    const width = 600;
    const height = 1440;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Create transparent cutouts for photos
    ctx.globalCompositeOperation = 'destination-out';
    commonCoords.forEach(c => {
        ctx.fillRect(c.x, c.y, c.w, c.h);
    });
    ctx.globalCompositeOperation = 'source-over';
    
    // Add text to the frame
    ctx.fillStyle = textColor;
    ctx.font = 'bold 48px Pacifico, cursive, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, width / 2, 80);

    return canvas.toDataURL('image/png');
};

export const photoboothFrames = [
  {
    topic: "Classic Black",
    frame_content: createFrameDataUrl('HAMIC', '#000000', '#FFFFFF'),
    number: 1,
    coords: commonCoords,
  },
  {
    topic: "Vibrant Red",
    frame_content: createFrameDataUrl('Photobooth', '#D02C3F', '#FFFFFF'),
    number: 2,
    coords: commonCoords,
  },
  {
    topic: "Sunny Yellow",
    frame_content: createFrameDataUrl('Smile!', '#FDEFB2', '#333333'),
    number: 3,
    coords: commonCoords,
  },
];
