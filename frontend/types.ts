
import { FrameCoord } from './constants';

export interface PhotoFrame {
  topic: string;
  frame_content: string; // URL to the transparent PNG frame
  number: number;
  coords: FrameCoord[];
}
