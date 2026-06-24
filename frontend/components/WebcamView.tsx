
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

interface WebcamViewProps {
  countdown: number | string | null;
  isRecording: boolean;
}

export const WebcamView = forwardRef<HTMLVideoElement, WebcamViewProps>(({ countdown, isRecording }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => videoRef.current!, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const setupWebcam = async () => {
      setError(null);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user"
          },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.error("Error accessing webcam: ", err);
        let msg = "Could not access the webcam. Please check permissions.";
        
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            msg = "Camera permission denied. Please allow camera access in your browser settings and reload.";
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            msg = "No camera device found. Please ensure your camera is connected.";
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            msg = "Camera is currently in use by another application or blocked by the system.";
        } else if (err.name === 'OverconstrainedError') {
            msg = "Camera does not support the requested resolution.";
        }

        setError(msg);
      }
    };

    setupWebcam();

    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  return (
    <div className="relative w-full max-w-3xl aspect-video bg-black rounded-lg overflow-hidden shadow-lg bg-gray-900 flex items-center justify-center">
      {!error ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform -scale-x-100" // Mirror the webcam feed
        />
      ) : (
        <div className="text-center p-6 text-white z-10">
            <svg className="w-16 h-16 mx-auto text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-xl font-bold mb-2">Camera Error</h3>
            <p className="text-gray-300 mb-6 max-w-md">{error}</p>
            <button 
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors border border-gray-600"
            >
                Refresh Page
            </button>
        </div>
      )}
      
      {!error && isRecording && (
        <div className="absolute top-4 left-4 flex items-center gap-2 animate-pulse z-10">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-white font-bold uppercase text-sm text-shadow">REC</span>
        </div>
      )}
      {!error && countdown && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <span className="text-white font-bold text-9xl text-shadow-lg animate-ping-once">
            {countdown}
          </span>
        </div>
      )}
    </div>
  );
});
