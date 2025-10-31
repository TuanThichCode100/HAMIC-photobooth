import React, { useState, useRef, useCallback, useEffect } from 'react';
import { WebcamView } from './components/WebcamView';
import { PhotoStrip } from './components/PhotoStrip';
import { Controls } from './components/Controls';
import { QrCodeModal } from './components/QrCodeModal';
import { photoboothFrames, FrameCoord } from './constants';
import { mergePhotosWithFrame } from './services/imageService';
import { initializeFirebaseApp, uploadImageAndGetData } from './services/firebaseService';

type AppStatus = 'idle' | 'countdown' | 'capturing' | 'processing' | 'finished';

const FirebaseErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
  <div className="w-full max-w-7xl bg-red-800 border-2 border-red-500 text-white p-4 rounded-lg shadow-lg mb-6 text-center">
    <h3 className="font-bold text-xl mb-2">Firebase Connection Error</h3>
    <p className="font-mono bg-red-900/50 p-3 rounded">{message}</p>
  </div>
);

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>('idle');
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [countdown, setCountdown] = useState<number | string | null>(null);
  const [finalImageUrl, setFinalImageUrl] = useState<string | null>(null);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const initializeApp = async () => {
      const { success, error } = await initializeFirebaseApp();
      setIsFirebaseReady(success);
      if (error) {
        setFirebaseError(error);
      }
    };
    initializeApp();
  }, []);

  const startTimelapse = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      recordedChunksRef.current = [];
      const stream = videoRef.current.srcObject as MediaStream;
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm' });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hamic-photobooth-timelapse.webm`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
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
    startTimelapse();

    for (let i = 0; i < 4; i++) {
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
      if (i < 3) await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    stopTimelapse();
    setStatus('finished');
  }, [takePhoto, startTimelapse, stopTimelapse]);

  const handleDownload = useCallback(async () => {
    if (capturedPhotos.length < 4) {
      alert("Please take 4 photos first.");
      return;
    }
    setStatus('processing');
    const currentFrame = photoboothFrames[currentFrameIndex];
    
    try {
      const { blob, dataUrl } = await mergePhotosWithFrame(capturedPhotos, currentFrame.frame_content, currentFrame.coords as FrameCoord[]);
      
      // Trigger local download
      const link = document.createElement('a');
      link.download = `hamic-photobooth-${currentFrame.topic}.png`;
      link.href = dataUrl;
      link.click();

      // Upload and get QR code URL
      if (isFirebaseReady) {
        const firebaseUrl = await uploadImageAndGetData(blob, currentFrame);
        if (firebaseUrl) {
          setFinalImageUrl(firebaseUrl);
        }
      } else {
        alert("Firebase connection failed. The QR code feature is unavailable. Your photo has been saved locally.");
      }
    } catch (error) {
      console.error("Error during download/upload process:", error);
      alert("An error occurred while processing the image.");
    } finally {
      setStatus('finished');
    }
  }, [capturedPhotos, currentFrameIndex, isFirebaseReady]);

  const nextTheme = () => setCurrentFrameIndex((prev) => (prev + 1) % photoboothFrames.length);
  const prevTheme = () => setCurrentFrameIndex((prev) => (prev - 1 + photoboothFrames.length) % photoboothFrames.length);
  const reset = () => {
      setCapturedPhotos([]);
      setStatus('idle');
      setFinalImageUrl(null);
  };

  const isBusy = status === 'countdown' || status === 'capturing' || status === 'processing';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-8 overflow-x-hidden text-white">
      <h1 className="font-pacifico text-[#FDEFB2] text-4xl sm:text-5xl mb-6 text-shadow-lg text-center">
        HAMIC'S PHOTOBOOTH
      </h1>

      {firebaseError && <FirebaseErrorDisplay message={firebaseError} />}

      <main className="flex flex-col lg:flex-row justify-center items-center lg:items-start gap-8 lg:gap-12 w-full max-w-7xl">
        <WebcamView 
          ref={videoRef} 
          countdown={countdown} 
          isRecording={status === 'capturing' || status === 'countdown'}
        />
        <PhotoStrip 
          photos={capturedPhotos} 
          frameSrc={photoboothFrames[currentFrameIndex].frame_content} 
          onNextTheme={nextTheme}
          onPrevTheme={prevTheme}
          isBusy={isBusy}
        />
      </main>

      <Controls 
        status={status}
        onStart={startPhotoSequence}
        onDownload={handleDownload}
        onReset={reset}
        isFirebaseReady={isFirebaseReady}
      />

      {finalImageUrl && (
        <QrCodeModal 
          url={finalImageUrl} 
          onClose={() => setFinalImageUrl(null)} 
        />
      )}

      <canvas ref={captureCanvasRef} className="hidden"></canvas>
    </div>
  );
};

export default App;