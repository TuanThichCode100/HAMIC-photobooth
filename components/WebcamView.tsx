import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

interface WebcamViewProps {
  countdown: number | string | null;
  isRecording: boolean;
}

export const WebcamView = forwardRef<HTMLVideoElement, WebcamViewProps>(({ countdown, isRecording }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useImperativeHandle(ref, () => videoRef.current!, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const setupWebcam = async () => {
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
      } catch (err) {
        console.error("Error accessing webcam: ", err);
        alert("Could not access the webcam. Please allow camera permissions and refresh the page.");
      }
    };

    setupWebcam();

    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  return (
    <div className="relative w-full max-w-3xl aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover transform -scale-x-100" // Mirror the webcam feed
      />
      {isRecording && (
        <div className="absolute top-4 left-4 flex items-center gap-2 animate-pulse">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-white font-bold uppercase text-sm">REC</span>
        </div>
      )}
      {countdown && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold text-9xl text-shadow-lg animate-ping-once">
            {countdown}
          </span>
        </div>
      )}
    </div>
  );
});