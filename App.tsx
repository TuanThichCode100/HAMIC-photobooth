
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { WebcamView } from './components/WebcamView';
import { PhotoStrip } from './components/PhotoStrip';
import { Controls } from './components/Controls';
import { QrCodeModal } from './components/QrCodeModal';
import { photoboothFrames, FrameCoord } from './constants';
import { mergePhotosWithFrame, calculateFrameLayout } from './services/imageService';
import { uploadImageAndGetData, getFirebaseInitializationPromise } from './services/firebaseService';

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
  const [countdown, setCountdown] = useState<number | string | null>(null);
  const [finalImageUrl, setFinalImageUrl] = useState<string | null>(null);
  
  // State for dynamic frame layout
  const [activeFrameCoords, setActiveFrameCoords] = useState<FrameCoord[]>([]);
  const [frameDimensions, setFrameDimensions] = useState<{w: number, h: number}>({ w: 0, h: 0 });
  
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const currentFrame = photoboothFrames[0];

  // Calculate frame layout dynamically on load
  useEffect(() => {
    const analyzeFrame = async () => {
      try {
        const layout = await calculateFrameLayout(currentFrame.frame_content);
        setActiveFrameCoords(layout.coords);
        setFrameDimensions({ w: layout.width, h: layout.height });
        console.log("Calculated Frame Layout:", layout);
      } catch (err) {
        console.error("Failed to analyze frame:", err);
        // Fallback to hardcoded if calculation fails (optional, relying on calc here)
        setActiveFrameCoords(currentFrame.coords); 
      }
    };
    analyzeFrame();
  }, [currentFrame]);

  useEffect(() => {
    // Initialize Firebase when the app loads.
    getFirebaseInitializationPromise()
      .then(() => {
        setIsFirebaseReady(true);
      })
      .catch((error) => {
        let userFriendlyError: string;
        if (error.code === 'auth/operation-not-allowed' || error.code === 'auth/admin-restricted-operation') {
            userFriendlyError = 'ACTION REQUIRED: Anonymous sign-in is not enabled. Please go to your Firebase Console (Authentication -> Sign-in method) and enable the "Anonymous" provider.';
        } else {
            userFriendlyError = `An unexpected Firebase error occurred: ${error.message}`;
        }
        setFirebaseError(userFriendlyError);
      });
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

    // Immediately show the modal in a loading state to provide instant feedback.
    if (isFirebaseReady) {
      setFinalImageUrl('loading');
    }
    
    setStatus('processing');
    
    try {
      // Use the dynamically calculated coordinates
      const { blob, dataUrl } = await mergePhotosWithFrame(capturedPhotos, currentFrame.frame_content, activeFrameCoords);
      
      const link = document.createElement('a');
      link.download = `hamic-photobooth-${currentFrame.topic}.png`;
      link.href = dataUrl;
      link.click();

      if (isFirebaseReady) {
        const firebaseUrl = await uploadImageAndGetData(blob, currentFrame);
        if (firebaseUrl) {
          setFinalImageUrl(firebaseUrl);
        } else {
          setFinalImageUrl(null);
        }
      } else {
        alert("Firebase not configured or failed to initialize. The QR code feature is unavailable. Your photo has been saved locally.");
      }
    } catch (error) {
      console.error("Error during download/upload process:", error);
      alert("An error occurred while processing the image.");
      setFinalImageUrl(null);
    } finally {
      setStatus('finished');
    }
  }, [capturedPhotos, isFirebaseReady, activeFrameCoords, currentFrame]);

  const reset = () => {
      setCapturedPhotos([]);
      setStatus('idle');
      setFinalImageUrl(null);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-8 overflow-x-hidden text-white">
      <h1 className="font-pacifico text-[#FDEFB2] text-4xl sm:text-5xl mb-6 text-shadow-lg text-center">
        HAMIC'S PHOTOBOOTH
      </h1>

      {firebaseError && <FirebaseErrorDisplay message={firebaseError} />}

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
