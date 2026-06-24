
import React from 'react';
import { FrameCoord } from '../constants';
import { ArrowUpIcon, ArrowDownIcon } from './icons';

interface PhotoStripProps {
  photos: string[];
  frameSrc: string;
  topic: string;
  coords: FrameCoord[];
  frameDimensions: { w: number, h: number };
  onNext: () => void;
  onPrev: () => void;
}

export const PhotoStrip: React.FC<PhotoStripProps> = ({ 
  photos, 
  frameSrc, 
  topic, 
  coords, 
  frameDimensions,
  onNext,
  onPrev
}) => {
  
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
      <div className="flex items-center justify-between w-full mb-4 text-[#FDEFB2]">
        <button 
          onClick={onPrev}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Previous Frame"
        >
          <div className="transform -rotate-90">
            <ArrowUpIcon />
          </div>
        </button>
        <h2 className="text-2xl font-pacifico text-center px-2 truncate">
          {topic}
        </h2>
        <button 
          onClick={onNext}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Next Frame"
        >
          <div className="transform -rotate-90">
            <ArrowDownIcon />
          </div>
        </button>
      </div>

      <div className="relative w-full bg-gray-900 shadow-2xl">
        {/* Use aspect ratio from frame dimensions if available, else default */}
        <div 
            className="relative w-full transition-all duration-300 ease-in-out"
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
            className="absolute inset-0 w-full h-full z-10 pointer-events-none select-none"
          />
        </div>
      </div>
      
      {coords.length === 0 && (
          <p className="text-xs text-gray-400 mt-2 animate-pulse">Analyzing frame layout...</p>
      )}
      
      <div className="flex gap-2 mt-4">
         <button 
            onClick={onPrev} 
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors text-white/80"
         >
            <ArrowUpIcon />
         </button>
         <button 
            onClick={onNext} 
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors text-white/80"
         >
            <ArrowDownIcon />
         </button>
      </div>
    </div>
  );
};
