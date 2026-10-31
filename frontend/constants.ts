export interface FrameCoord {
    x: number;
    y: number;
    w: number;
    h: number;
}

// Frame and photo dimensions
const frameWidth = 647.2;
const frameHeight = 1920;
const photoWidth = 554.1;
const photoHeight = 346.1;
const gapBetweenPhotos = 50.7; // User-defined gap

// Calculate x coordinate for centering
const xCoord = (frameWidth - photoWidth) / 2;

// Calculate total height occupied by photos and their gaps
const totalPhotoHeight = photoHeight * 4;
const totalInternalGapsHeight = gapBetweenPhotos * 3;
const occupiedHeight = totalPhotoHeight + totalInternalGapsHeight;

// Calculate the remaining space and distribute it for top/bottom margins
const remainingSpace = frameHeight - occupiedHeight;
const topMargin = remainingSpace / 2;

const commonCoords: FrameCoord[] = [
    { x: xCoord, y: topMargin, w: photoWidth, h: photoHeight },
    { x: xCoord, y: topMargin + photoHeight + gapBetweenPhotos, w: photoWidth, h: photoHeight },
    { x: xCoord, y: topMargin + (photoHeight + gapBetweenPhotos) * 2, w: photoWidth, h: photoHeight },
    { x: xCoord, y: topMargin + (photoHeight + gapBetweenPhotos) * 3, w: photoWidth, h: photoHeight },
];

// Vite serves the source PNG in dev and copies it into the static build.
const hamicFrameUrl = new URL('../assets/hamic_frames_transparent.png', import.meta.url).href;

export const photoboothFrames = [
  {
    topic: "HAMIC K71",
    frame_content: hamicFrameUrl,
    number: 9,
    coords: [
      { x: 87, y: 177, w: 418, h: 319 },
      { x: 87, y: 700, w: 418, h: 318 },
      { x: 87, y: 1223, w: 418, h: 322 },
    ],
  },
  {
    topic: "Original",
    frame_content: `${import.meta.env.BASE_URL}frames/frame-1.png`,
    number: 1,
    coords: commonCoords,
  },
  {
    topic: "Chirstmas",
    frame_content: `${import.meta.env.BASE_URL}frames/frame-2.png`,
    number: 2,
    coords: commonCoords,
  },
  {
    topic: "25th Anniversary",
    frame_content: `${import.meta.env.BASE_URL}frames/frame-3.png`,
    number: 3,
    coords: commonCoords,
  },
  {
    topic: "Lunar New Year",
    frame_content: `${import.meta.env.BASE_URL}frames/frame-4.png`,
    number: 4,
    coords: commonCoords,
  },
  {
    topic: "DATAFLOW 1",
    frame_content: `${import.meta.env.BASE_URL}frames/frame-5.png`,
    number: 5,
    coords: commonCoords,
  },
  {
    topic: "DATAFLOW 2",
    frame_content: `${import.meta.env.BASE_URL}frames/frame-6.png`,
    number: 6,
    coords: commonCoords,
  },
  {
    topic: "TECH-FEST 2026 (1)",
    frame_content: `${import.meta.env.BASE_URL}frames/frame-7.png`,
    number: 7,
    coords: commonCoords,
  },
  {
    topic: "TECH-FEST 2026 (2)",
    frame_content: `${import.meta.env.BASE_URL}frames/frame-8.png`,
    number: 8,
    coords: commonCoords,
  }
];
