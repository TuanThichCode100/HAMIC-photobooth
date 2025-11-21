
import React from 'react';
import { FrameCoord } from '../constants';

interface PhotoStripProps {
  photos: string[];
  frameSrc: string;
  topic: string;
  coords: FrameCoord[];
  frameDimensions: { w: number, h: number };
}

export const PhotoStrip: React.FC<PhotoStripProps> = ({ photos, frameSrc, topic, coords, frameDimensions }) => {
  
  // Calculate styles for each photo slot based on the frame dimensions
  const getSlotStyle = (coord: FrameCoord) => {
    if (!frameDimensions.w || !frameDimensions.h) return {};
    
    return {
        left: `${(coord.x / frameDimensions.w) * 100}%`,
        top: `${(coord.y / frameDimensions.h) * 100}%`,
        width: `${(coord.w / frameDimensions.w) * 100}%`,
        height: `${(coord.h / frameDimensions.h) * 100}%`,
    };
  };

  return (
    <div className="flex flex-col items-center w-full max-w-xs">
      <h2 className="text-2xl font-pacifico text-[#FDEFB2] mb-4 text-center h-10 flex items-center justify-center">
        {topic}
      </h2>
      <div className="relative w-full bg-gray-900 shadow-2xl">
        {/* Use aspect ratio from frame dimensions if available, else default */}
        <div 
            className="relative w-full"
            style={{ 
                aspectRatio: frameDimensions.w && frameDimensions.h ? `${frameDimensions.w}/${frameDimensions.h}` : '647.2/1920' 
            }}
        >
          <div className="absolute inset-0">
            {coords.map((coord, index) => (
              <div 
                key={index} 
                className="absolute bg-gray-800/50 backdrop-blur-sm overflow-hidden"
                style={getSlotStyle(coord)}
              >
                {photos[index] && (
                  <img src={photos[index]} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                )}
              </div>
            ))}
          </div>
          
          <img
            src={frameSrc}
            alt="Photostrip Background"
            className="absolute inset-0 w-full h-full z-10 pointer-events-none transition-opacity duration-300"
          />
        </div>
      </div>
      {coords.length === 0 && (
          <p className="text-xs text-gray-400 mt-2">Analyzing frame layout...</p>
      )}
    </div>
  );
};
