
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { WebcamView } from './components/WebcamView';
import { PhotoStrip } from './components/PhotoStrip';
import { Controls } from './components/Controls';
import { QrCodeModal } from './components/QrCodeModal';
import { photoboothFrames, FrameCoord } from './constants';
import { mergePhotosWithFrame, calculateFrameLayout } from './services/imageService';
import { saveBlobToDirectory } from './services/fileSystemService';

type AppStatus = 'idle' | 'countdown' | 'capturing' | 'processing' | 'finished';

const GOOGLE_DRIVE_FOLDER = "https://drive.google.com/drive/folders/1KY_DPlWtR5q0aKfae5uVF53FDFFJoELL?usp=sharing";

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>('idle');
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number | string | null>(null);
  
  // State for active frame
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  
  // State for dynamic frame layout
  const [activeFrameCoords, setActiveFrameCoords] = useState<FrameCoord[]>([]);
  const [frameDimensions, setFrameDimensions] = useState<{w: number, h: number}>({ w: 0, h: 0 });
  
  // State for timelapse video
  const [timelapseUrl, setTimelapseUrl] = useState<string | null>(null);
  const [timelapseBlob, setTimelapseBlob] = useState<Blob | null>(null);
  
  // State for QR Code
  const [showQr, setShowQr] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const currentFrame = photoboothFrames[currentFrameIndex];

  // Frame Navigation Handlers
  const nextFrame = useCallback(() => {
    setCurrentFrameIndex((prev) => (prev + 1) % photoboothFrames.length);
  }, []);

  const prevFrame = useCallback(() => {
    setCurrentFrameIndex((prev) => (prev - 1 + photoboothFrames.length) % photoboothFrames.length);
  }, []);

  // Calculate frame layout dynamically on load or when frame changes
  useEffect(() => {
    const analyzeFrame = async () => {
      try {
        const layout = await calculateFrameLayout(currentFrame.frame_content);
        setActiveFrameCoords(layout.coords);
        setFrameDimensions({ w: layout.width, h: layout.height });
        console.log("Calculated Frame Layout:", layout);
      } catch (err) {
        console.error("Failed to analyze frame:", err);
        // Fallback to hardcoded if calculation fails
        setActiveFrameCoords(currentFrame.coords); 
      }
    };
    analyzeFrame();
  }, [currentFrame]);

  // Cleanup timelapse URL on unmount or when changed
  useEffect(() => {
    return () => {
      if (timelapseUrl) {
        URL.revokeObjectURL(timelapseUrl);
      }
    };
  }, [timelapseUrl]);

  const startTimelapse = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      recordedChunksRef.current = [];
      const stream = videoRef.current.srcObject as MediaStream;
      try {
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm' });
      } catch (e) {
        // Fallback for Safari/older browsers if webm isn't supported
        mediaRecorderRef.current = new MediaRecorder(stream);
      }

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setTimelapseUrl(url); // Store the URL for preview
        setTimelapseBlob(blob); // keep blob so we can write it to disk later
        recordedChunksRef.current = [];
      };

      mediaRecorderRef.current.start();
    }
  }, []);

  const stopTimelapse = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (video && canvas) {
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.save();
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        context.restore();
        const dataUrl = canvas.toDataURL('image/png');
        setCapturedPhotos((prevPhotos) => [...prevPhotos, dataUrl]);
      }
    }
  }, []);

  const startPhotoSequence = useCallback(async () => {
    setStatus('capturing');
    setCapturedPhotos([]);
    setTimelapseUrl(null); // Clear previous video
    startTimelapse();

    // Use the detected number of slots, or default to 4
    const numberOfShots = activeFrameCoords.length > 0 ? activeFrameCoords.length : 4;

    for (let i = 0; i < numberOfShots; i++) {
      await new Promise<void>((resolve) => {
        let count = 3;
        setStatus('countdown');
        setCountdown(count);
        const interval = setInterval(() => {
          count--;
          if (count > 0) {
            setCountdown(count);
          } else {
            clearInterval(interval);
            setCountdown("CHEESE!");
            setTimeout(() => {
              takePhoto();
              setCountdown(null);
              setStatus('capturing');
              resolve();
            }, 800);
          }
        }, 1000);
      });
      if (i < numberOfShots - 1) await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    stopTimelapse();
    setStatus('finished');
  }, [takePhoto, startTimelapse, stopTimelapse, activeFrameCoords]);

  const handleDownload = useCallback(async () => {
    if (capturedPhotos.length < activeFrameCoords.length) {
      alert(`Please take ${activeFrameCoords.length} photos first.`);
      return;
    }

    setStatus('processing');
    
    try {
      // 1. Generate final photo strip
      const { blob, dataUrl } = await mergePhotosWithFrame(capturedPhotos, currentFrame.frame_content, activeFrameCoords);
      const imageFilename = `hamic-photobooth-${currentFrame.topic}-${Date.now()}.png`;

      try {
        await saveBlobToDirectory(blob, imageFilename);
      } catch (err) {
        console.error('Failed to save image to directory, falling back to download anchor', err);
        const imageLink = document.createElement('a');
        imageLink.download = imageFilename;
        imageLink.href = dataUrl;
        document.body.appendChild(imageLink);
        imageLink.click();
        document.body.removeChild(imageLink);
      }

      // 2. Download Timelapse Video Locally (if available)
      if (timelapseBlob) {
        const videoFilename = `hamic-photobooth-timelapse-${Date.now()}.webm`;
        try {
          await saveBlobToDirectory(timelapseBlob, videoFilename);
        } catch (err) {
          console.error('Failed to save timelapse to directory, falling back to download anchor', err);
          setTimeout(() => {
            if (timelapseUrl) {
              const videoLink = document.createElement('a');
              videoLink.download = videoFilename;
              videoLink.href = timelapseUrl;
              document.body.appendChild(videoLink);
              videoLink.click();
              document.body.removeChild(videoLink);
            }
          }, 500);
        }
      } else if (timelapseUrl) {
        // If for some reason we don't have the blob, fallback to anchor download
        setTimeout(() => {
          const videoLink = document.createElement('a');
          videoLink.download = `hamic-photobooth-timelapse-${Date.now()}.webm`;
          videoLink.href = timelapseUrl;
          document.body.appendChild(videoLink);
          videoLink.click();
          document.body.removeChild(videoLink);
        }, 500);
      }

      // 3. Show QR Code for Google Drive Folder
      setShowQr(true);

    } catch (error) {
      console.error("Error during download process:", error);
      alert("An error occurred while generating the image.");
    } finally {
      setStatus('finished');
    }
  }, [capturedPhotos, activeFrameCoords, currentFrame, timelapseUrl]);

  const reset = () => {
      setCapturedPhotos([]);
      setTimelapseUrl(null);
      setStatus('idle');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-8 overflow-x-hidden text-white">
      <h1 className="font-pacifico text-[#FDEFB2] text-4xl sm:text-5xl mb-6 text-shadow-lg text-center">
        HAMIC'S PHOTOBOOTH
      </h1>

      <main className="flex flex-col lg:flex-row items-start justify-center gap-8 w-full max-w-7xl">
        <WebcamView 
          ref={videoRef} 
          countdown={countdown} 
          isRecording={status === 'capturing' || status === 'countdown'}
        />
        <PhotoStrip 
          photos={capturedPhotos} 
          frameSrc={currentFrame.frame_content} 
          topic={currentFrame.topic}
          coords={activeFrameCoords}
          frameDimensions={frameDimensions}
          onNext={nextFrame}
          onPrev={prevFrame}
        />
      </main>

      <Controls 
        status={status}
        onStart={startPhotoSequence}
        onDownload={handleDownload}
        onReset={reset}
      />

      {showQr && (
        <QrCodeModal 
          url={GOOGLE_DRIVE_FOLDER}
          onClose={() => setShowQr(false)}
        />
      )}

      <canvas ref={captureCanvasRef} className="hidden"></canvas>
    </div>
  );
};

export default App;
