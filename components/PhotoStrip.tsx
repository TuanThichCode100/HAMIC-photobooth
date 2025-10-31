
import React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from './icons';

interface PhotoStripProps {
  photos: string[];
  frameSrc: string;
  onNextTheme: () => void;
  onPrevTheme: () => void;
  isBusy: boolean;
}

const PhotoPreview: React.FC<{ src?: string }> = ({ src }) => (
  <div className="absolute w-[83.33%] h-[19.44%] bg-[#333] rounded-lg left-[8.33%] overflow-hidden">
    {src && <img src={src} alt="Photo preview" className="w-full h-full object-cover" />}
  </div>
);

export const PhotoStrip: React.FC<PhotoStripProps> = ({ photos, frameSrc, onNextTheme, onPrevTheme, isBusy }) => {
  const previewPositions = ['top-[8.33%]', 'top-[29.17%]', 'top-[50%]', 'top-[70.83%]'];

  return (
    <div className="relative w-full max-w-[300px] aspect-[300/720] flex-shrink-0">
      <div className="absolute inset-0">
        {previewPositions.map((pos, index) => (
          <div key={index} className={`absolute w-[83.33%] h-[19.44%] bg-gray-800/50 backdrop-blur-sm rounded-lg left-[8.33%] ${pos}`}>
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

      <button
        onClick={onPrevTheme}
        disabled={isBusy}
        className="absolute top-[38%] -right-4 md:-right-14 w-12 h-12 bg-[#D02C3F] rounded-full flex items-center justify-center text-white z-20 transition hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Previous Theme"
      >
        <ArrowUpIcon />
      </button>
      <button
        onClick={onNextTheme}
        disabled={isBusy}
        className="absolute top-[52%] -right-4 md:-right-14 w-12 h-12 bg-[#D02C3F] rounded-full flex items-center justify-center text-white z-20 transition hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Next Theme"
      >
        <ArrowDownIcon />
      </button>
    </div>
  );
};