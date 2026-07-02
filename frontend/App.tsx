
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { WebcamView } from './components/WebcamView';
import { PhotoStrip } from './components/PhotoStrip';
import { Controls } from './components/Controls';
import { QrCodeModal } from './components/QrCodeModal';
import { photoboothFrames, FrameCoord } from './constants';
import { mergePhotosWithFrame, calculateFrameLayout } from './services/imageService';
import { saveBlobToDirectory } from './services/fileSystemService';
import { uploadToBackend } from './services/backendService';
import {
  initializeLibraries,
  analyzeAndCacheImage,
  enhanceImage,
  EnhancementPreset,
  ImageCacheData
} from './services/photoEnhancementService';

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
  const [qrUrl, setQrUrl] = useState<string>(GOOGLE_DRIVE_FOLDER);

  // States cho xử lý ảnh nâng cao
  const [libsLoaded, setLibsLoaded] = useState(false);
  const [libsLoadingError, setLibsLoadingError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<EnhancementPreset>('original');
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);
  const [processedPhotos, setProcessedPhotos] = useState<string[]>([]);
  const [imageCache, setImageCache] = useState<ImageCacheData[]>([]);
  const [isEnhancing, setIsEnhancing] = useState(false);

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

  // Khởi tạo thư viện OpenCV và MediaPipe
  useEffect(() => {
    const loadLibs = async () => {
      try {
        await initializeLibraries();
        setLibsLoaded(true);
      } catch (err) {
        console.error("Failed to load OpenCV.js/MediaPipe libraries:", err);
        setLibsLoadingError("Không thể tải thư viện xử lý ảnh. Vui lòng tải lại trang.");
      }
    };
    loadLibs();
  }, []);

  // Tự động phân tích và áp dụng preset mặc định (original) khi chụp xong và thư viện đã sẵn sàng
  useEffect(() => {
    const runInitialEnhancement = async () => {
      if (
        status === 'finished' &&
        libsLoaded &&
        capturedPhotos.length > 0 &&
        imageCache.length === 0
      ) {
        setIsEnhancing(true);
        try {
          const cacheList: ImageCacheData[] = [];
          const enhancedList: string[] = [];
          
          for (let i = 0; i < capturedPhotos.length; i++) {
            const cache = await analyzeAndCacheImage(capturedPhotos[i]);
            cacheList.push(cache);
            
            enhancedList.push(capturedPhotos[i]); // Default is original
          }
          
          setImageCache(cacheList);
          setProcessedPhotos(enhancedList);
          setSelectedPreset('original');
        } catch (err) {
          console.error("Error during initial photo enhancement:", err);
          // Fallback dùng ảnh gốc nếu lỗi
          setProcessedPhotos(capturedPhotos);
        } finally {
          setIsEnhancing(false);
        }
      }
    };
    runInitialEnhancement();
  }, [status, libsLoaded, capturedPhotos, imageCache]);

  const handlePresetChange = useCallback(async (preset: EnhancementPreset) => {
    if (capturedPhotos.length === 0) return;
    
    setSelectedPreset(preset);
    if (preset === 'original') {
      setProcessedPhotos(capturedPhotos);
      return;
    }

    if (imageCache.length === 0) return;
    setIsEnhancing(true);
    try {
      const enhancedList: string[] = [];
      for (let i = 0; i < capturedPhotos.length; i++) {
        const cache = imageCache[i];
        const enhanced = await enhanceImage(capturedPhotos[i], cache, preset);
        enhancedList.push(enhanced);
      }
      setProcessedPhotos(enhancedList);
    } catch (err) {
      console.error(`Error applying preset ${preset}:`, err);
    } finally {
      setIsEnhancing(false);
    }
  }, [capturedPhotos, imageCache]);

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
    const photosToMerge = processedPhotos.length > 0 ? processedPhotos : capturedPhotos;
    if (photosToMerge.length < activeFrameCoords.length) {
      alert(`Please take ${activeFrameCoords.length} photos first.`);
      return;
    }

    setStatus('processing');
    
    try {
      // 1. Generate final photo strip
      const { blob, dataUrl } = await mergePhotosWithFrame(photosToMerge, currentFrame.frame_content, activeFrameCoords);
      const imageFilename = `hamic-photobooth-${currentFrame.topic}-${Date.now()}.png`;

      // Show QR Modal in loading state right away to improve UX
      setQrUrl('');
      setShowQr(true);

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

      // 3. Upload photo and timelapse to backend (ImgBB)
      console.log('Uploading photo and timelapse to ImgBB via backend...');
      const uploadedUrl = await uploadToBackend(blob, timelapseBlob, currentFrame.topic);
      if (uploadedUrl) {
        setQrUrl(uploadedUrl);
      } else {
        console.warn('Failed to upload, falling back to static Drive folder.');
        setQrUrl(GOOGLE_DRIVE_FOLDER);
      }

      // Upload finished, URL is updated and QR will be generated


    } catch (error) {
      console.error("Error during download process:", error);
      alert("An error occurred while generating the image.");
    } finally {
      setStatus('finished');
    }
  }, [capturedPhotos, processedPhotos, activeFrameCoords, currentFrame, timelapseBlob, timelapseUrl]);

  const reset = () => {
      setCapturedPhotos([]);
      setProcessedPhotos([]);
      setImageCache([]);
      setTimelapseUrl(null);
      setStatus('idle');
      setSelectedPreset('original');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-8 overflow-x-hidden text-white">
      <h1 className="font-pacifico text-[#FDEFB2] text-4xl sm:text-5xl mb-6 text-shadow-lg text-center">
        HAMIC'S PHOTOBOOTH
      </h1>

      <main className="flex flex-col lg:flex-row items-start justify-center gap-8 w-full max-w-7xl">
        <div className="flex flex-col items-center justify-center w-full lg:w-auto gap-4">
          <WebcamView 
            ref={videoRef} 
            countdown={countdown} 
            isRecording={status === 'capturing' || status === 'countdown'}
          />

          {status === 'finished' && capturedPhotos.length > 0 && (
            <div className="flex flex-col items-center justify-center w-full p-4 animate-fade-in">
              {!libsLoaded && !libsLoadingError && (
                <div className="flex items-center gap-3 text-gray-300 text-sm">
                  <svg className="animate-spin h-4 w-4 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Đang tải bộ lọc chất lượng ảnh...</span>
                </div>
              )}

              {libsLoadingError && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-medium">
                  <span>⚠️ {libsLoadingError}</span>
                </div>
              )}

              {libsLoaded && (
                <div className="flex flex-col items-center gap-4 w-full">
                  <div className="flex flex-wrap items-center justify-center gap-5 text-xl font-pacifico tracking-wide">
                    {(['original', 'auto', 'bright', 'vivid', 'cool', 'warm'] as EnhancementPreset[]).map((preset) => (
                      <button
                        key={preset}
                        onClick={() => handlePresetChange(preset)}
                        disabled={isEnhancing}
                        className={`transition-all duration-300 capitalize ${
                          selectedPreset === preset
                            ? 'text-[#FDEFB2] drop-shadow-[0_2px_8px_rgba(253,239,178,0.5)] scale-110 font-bold'
                            : 'text-white hover:text-[#FDEFB2]/75'
                        } disabled:opacity-50`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-center gap-4">
                    <button
                      onMouseDown={() => setShowBeforeAfter(true)}
                      onMouseUp={() => setShowBeforeAfter(false)}
                      onMouseLeave={() => setShowBeforeAfter(false)}
                      onTouchStart={() => setShowBeforeAfter(true)}
                      onTouchEnd={() => setShowBeforeAfter(false)}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 active:bg-white/20 text-white text-xs font-semibold rounded-lg border border-white/10 transition-all duration-200 select-none shadow-md flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4 text-[#FDEFB2]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                      </svg>
                      Giữ đè xem ảnh gốc
                    </button>

                    {isEnhancing && (
                      <div className="flex items-center gap-1.5 text-yellow-400 text-xs animate-pulse font-semibold">
                        <svg className="animate-spin h-4 w-4 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Đang lọc...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <PhotoStrip 
          photos={showBeforeAfter ? capturedPhotos : (processedPhotos.length > 0 ? processedPhotos : capturedPhotos)} 
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
          url={qrUrl}
          onClose={() => setShowQr(false)}
        />
      )}

      <canvas ref={captureCanvasRef} className="hidden"></canvas>
    </div>
  );
};

export default App;
