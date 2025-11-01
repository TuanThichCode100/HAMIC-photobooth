export interface FrameCoord {
    x: number;
    y: number;
    w: number;
    h: number;
}

// Using a higher resolution for the output image (600x1440) for better quality.
// The width (w) has been adjusted to 498px to create a perfect 16:9 aspect ratio with the height of 280px.
// The x-coordinate is now 51 to keep it centered ((600-498)/2).
const commonCoords: FrameCoord[] = [
    { x: 51, y: 120, w: 498, h: 280 },
    { x: 51, y: 420, w: 498, h: 280 },
    { x: 51, y: 720, w: 498, h: 280 },
    { x: 51, y: 1020, w: 498, h: 280 },
];

const createFrameDataUrl = (bgColor: string): string => {
    // This function can only run in a browser environment
    if (typeof document === 'undefined') {
        return '';
    }
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
    
    // Text is no longer drawn on the canvas frame itself.
    // It will be displayed as a separate element in the UI.

    return canvas.toDataURL('image/png');
};

export const photoboothFrames = [
  {
    topic: "Original",
    frame_content: createFrameDataUrl('#000000'),
    number: 1,
    coords: commonCoords,
  },
  {
    topic: "Classic Black",
    frame_content: createFrameDataUrl('#000000'),
    number: 2,
    coords: commonCoords,
  },
  {
    topic: "Vintage Sepia",
    frame_content: createFrameDataUrl('#704214'),
    number: 3,
    coords: commonCoords,
  },
    {
    topic: "Cool Blue",
    frame_content: createFrameDataUrl('#295E8A'),
    number: 4,
    coords: commonCoords,
  }
];
