
import React from 'react';

type AppStatus = 'idle' | 'countdown' | 'capturing' | 'processing' | 'finished';

interface ControlsProps {
  status: AppStatus;
  onStart: () => void;
  onDownload: () => void;
  onReset: () => void;
  isFirebaseReady: boolean;
}

const ActionButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => (
  <button
    {...props}
    className="w-48 h-14 bg-[#D02C3F] text-white font-bold text-xl rounded-lg shadow-lg uppercase tracking-wider transition-transform duration-200 hover:scale-105 active:scale-95 disabled:bg-gray-500 disabled:scale-100 disabled:cursor-not-allowed"
  />
);

export const Controls: React.FC<ControlsProps> = ({ status, onStart, onDownload, onReset, isFirebaseReady }) => {
  const isBusy = status === 'countdown' || status === 'capturing' || status === 'processing';

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 w-full max-w-xl">
      {status !== 'finished' ? (
        <ActionButton onClick={onStart} disabled={isBusy}>
          {isBusy ? 'Capturing...' : 'Start'}
        </ActionButton>
      ) : (
        <ActionButton onClick={onReset}>
          Retake
        </ActionButton>
      )}
      <ActionButton onClick={onDownload} disabled={status !== 'finished'}>
        {status === 'processing' ? 'Processing...' : (isFirebaseReady ? 'Save & QR' : 'Save')}
      </ActionButton>
    </div>
  );
};
