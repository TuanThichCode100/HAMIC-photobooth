/**
 * photoEnhancementService.ts
 * Service xử lý ảnh tự động và áp dụng các preset màu sắc/độ sáng cho hệ thống photobooth.
 * Sử dụng OpenCV.js và MediaPipe (Face Detection, Selfie Segmentation) tải qua CDN.
 */

export type EnhancementPreset = 'original' | 'auto' | 'bright' | 'vivid' | 'cool' | 'warm';

export interface ImageCacheData {
  faces: any[];
  segmentationMask: ImageData | null;
  width: number;
  height: number;
}

// Khai báo kiểu cho window
declare global {
  interface Window {
    cv: any;
    FaceDetection: any;
    SelfieSegmentation: any;
  }
}

// Đối tượng lưu trữ model instances để tái sử dụng
let faceDetectionInstance: any = null;
let selfieSegmentationInstance: any = null;

// Biến điều phối callback của MediaPipe để tránh tranh chấp
let faceResolveQueue: ((value: any[]) => void)[] = [];
let segmentResolveQueue: ((value: ImageData | null) => void)[] = [];

/**
 * Helper nạp động một script CDN thông qua thẻ script.
 */
const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Kiểm tra xem script đã được nạp chưa
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Không thể tải script: ${src}`));
    document.head.appendChild(script);
  });
};

/**
 * Đợi các thư viện tải qua CDN sẵn sàng trên window.
 * Có cơ chế giới hạn thời gian nạp (Timeout) để tránh treo ứng dụng.
 */
export const initializeLibraries = (timeoutMs: number = 30000): Promise<void> => {
  const scripts = [
    "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js",
    "https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/face_detection.js",
    "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js",
    "https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.9.0-release.3/dist/opencv.js"
  ];

  const loadPromise = Promise.all(scripts.map(loadScript)).then(() => {
    return new Promise<void>((resolve) => {
      const check = () => {
        if (
          window.cv &&
          window.cv.Mat &&
          window.FaceDetection &&
          window.SelfieSegmentation
        ) {
          console.log("All photo enhancement libraries are loaded successfully!");
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  });

  const timeoutPromise = new Promise<void>((_, reject) => {
    setTimeout(() => reject(new Error("Thời gian tải bộ xử lý ảnh OpenCV/MediaPipe bị quá hạn (Timeout).")), timeoutMs);
  });

  return Promise.race([loadPromise, timeoutPromise]);
};

/**
 * Helper load ảnh dạng dataURL thành HTMLImageElement
 */
const loadImageElement = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
};

/**
 * Khởi tạo MediaPipe Face Detection và Selfie Segmentation
 */
const getFaceDetectionModel = () => {
  if (faceDetectionInstance) return faceDetectionInstance;

  faceDetectionInstance = new window.FaceDetection({
    locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
  });

  faceDetectionInstance.setOptions({
    model: 'short', // 'short' tối ưu cho khuôn mặt gần webcam (< 2m)
    minDetectionConfidence: 0.5
  });

  faceDetectionInstance.onResults((results: any) => {
    const nextResolve = faceResolveQueue.shift();
    if (nextResolve) {
      nextResolve(results.detections || []);
    }
  });

  return faceDetectionInstance;
};

const getSelfieSegmentationModel = () => {
  if (selfieSegmentationInstance) return selfieSegmentationInstance;

  selfieSegmentationInstance = new window.SelfieSegmentation({
    locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
  });

  selfieSegmentationInstance.setOptions({
    modelSelection: 1, // 1: Landscape (tốt cho selfie nhiều người ngoài trời)
  });

  selfieSegmentationInstance.onResults((results: any) => {
    const nextResolve = segmentResolveQueue.shift();
    if (nextResolve) {
      if (results.segmentationMask) {
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = results.width || results.image.width;
        maskCanvas.height = results.height || results.image.height;
        const maskCtx = maskCanvas.getContext('2d');
        if (maskCtx) {
          maskCtx.drawImage(results.segmentationMask, 0, 0);
          const imgData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
          nextResolve(imgData);
        } else {
          nextResolve(null);
        }
      } else {
        nextResolve(null);
      }
    }
  });

  return selfieSegmentationInstance;
};

/**
 * Phát hiện khuôn mặt của ảnh
 */
const detectFaces = (imageElement: HTMLImageElement | HTMLCanvasElement): Promise<any[]> => {
  const model = getFaceDetectionModel();
  return new Promise((resolve) => {
    faceResolveQueue.push(resolve);
    model.send({ image: imageElement }).catch((err: any) => {
      console.error("MediaPipe Face Detection error:", err);
      const idx = faceResolveQueue.indexOf(resolve);
      if (idx > -1) faceResolveQueue.splice(idx, 1);
      resolve([]);
    });
  });
};

/**
 * Tách nền ảnh và tạo Mask
 */
const segmentImage = (imageElement: HTMLImageElement | HTMLCanvasElement): Promise<ImageData | null> => {
  const model = getSelfieSegmentationModel();
  return new Promise((resolve) => {
    segmentResolveQueue.push(resolve);
    model.send({ image: imageElement }).catch((err: any) => {
      console.error("MediaPipe Selfie Segmentation error:", err);
      const idx = segmentResolveQueue.indexOf(resolve);
      if (idx > -1) segmentResolveQueue.splice(idx, 1);
      resolve(null);
    });
  });
};

/**
 * Bước 1, 2, 3: Phân tích ảnh và Cache kết quả khuôn mặt + segmentation mask.
 * Chạy tuần tự cho từng ảnh để tránh trùng lặp dữ liệu xử lý không đồng bộ.
 */
export const analyzeAndCacheImage = async (imageSrc: string): Promise<ImageCacheData> => {
  const img = await loadImageElement(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error("Could not create canvas context for analysis");
  }
  ctx.drawImage(img, 0, 0);

  // Chạy phát hiện khuôn mặt và tách nền tuần tự
  const faces = await detectFaces(canvas);
  const segmentationMask = await segmentImage(canvas);

  return {
    faces,
    segmentationMask,
    width: canvas.width,
    height: canvas.height
  };
};

/**
 * Bước 4-7: Xử lý chất lượng và áp dụng Preset màu sắc trên OpenCV.js
 */
export const enhanceImage = async (
  imageSrc: string,
  cache: ImageCacheData,
  preset: EnhancementPreset
): Promise<string> => {
  if (preset === 'original') {
    return imageSrc;
  }
  const cv = window.cv;
  if (!cv || !cv.Mat) {
    throw new Error("OpenCV.js is not loaded.");
  }

  const img = await loadImageElement(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error("Could not create canvas context for enhancement");
  }
  ctx.drawImage(img, 0, 0);

  // 1. Đọc ảnh vào OpenCV Mat (Định dạng RGBA)
  const src = cv.imread(canvas);
  const rows = src.rows;
  const cols = src.cols;

  // Chuyển sang RGB
  const srcRGB = new cv.Mat();
  cv.cvtColor(src, srcRGB, cv.COLOR_RGBA2RGB);

  // --- BƯỚC 1: PHÂN TÍCH CHẤT LƯỢNG ẢNH & TÍNH ĐỘ SÁNG TRUNG BÌNH ---
  const grayMat = new cv.Mat();
  cv.cvtColor(srcRGB, grayMat, cv.COLOR_RGB2GRAY);
  const meanScalar = cv.mean(grayMat);
  const avgBrightness = meanScalar[0]; // Giá trị độ sáng trung bình [0, 255]
  grayMat.delete();

  // Xác định mức độ tăng sáng tự động dựa trên độ sáng thực tế
  // Càng tối thì tăng sáng càng nhiều. Nếu ảnh sáng sẵn (độ sáng > 150) thì không tăng sáng thêm.
  let autoBrightnessDelta = 0;
  if (avgBrightness < 100) {
    // Ảnh tối (ngược sáng mạnh)
    autoBrightnessDelta = Math.min(35, 120 - avgBrightness);
  } else if (avgBrightness < 140) {
    // Ảnh hơi tối
    autoBrightnessDelta = Math.min(15, 140 - avgBrightness);
  }

  // Thiết lập các tham số xử lý theo preset
  let targetCLAHEClipLimit = 2.0;
  let brightnessDelta = autoBrightnessDelta;
  let faceBrightnessDelta = 6; // Mặc định làm sáng mặt nhẹ nhàng, tự nhiên
  let subjectContrastCoef = 1.05; // Tăng nhẹ tương phản chủ thể
  let saturationFactor = 1.0;
  let colorToning: { r: number; g: number; b: number } = { r: 0, g: 0, b: 0 };
  let subjectBrightnessDelta = 5; // Tăng sáng nhẹ chủ thể

  switch (preset) {
    case 'bright':
      brightnessDelta += 20; // Làm sáng tổng thể mạnh hơn
      faceBrightnessDelta = 15;
      subjectBrightnessDelta = 15;
      break;
    case 'vivid':
      saturationFactor = 1.25; // Tăng 25% độ rực rỡ màu sắc
      subjectContrastCoef = 1.15;
      brightnessDelta += 5;
      break;
    case 'cool':
      colorToning = { r: -10, g: -5, b: 15 }; // Tông xanh mát, hiện đại
      faceBrightnessDelta = 4;
      break;
    case 'warm':
      colorToning = { r: 15, g: 5, b: -10 }; // Tông ấm áp, hồng hảo tự nhiên
      faceBrightnessDelta = 8;
      break;
    case 'auto':
    default:
      // Preset auto dùng các tham số mặc định được tính tự động từ histogram
      break;
  }

  // --- BƯỚC 4: CÂN BẰNG SÁNG BẰNG CLAHE TRÊN KÊNH L ---
  const labMat = new cv.Mat();
  cv.cvtColor(srcRGB, labMat, cv.COLOR_RGB2Lab);

  const channels = new cv.MatVector();
  cv.split(labMat, channels);

  const clahe = new cv.CLAHE(targetCLAHEClipLimit, new cv.Size(8, 8));
  const channelL = channels.get(0);
  const enhancedL = new cv.Mat();
  clahe.apply(channelL, enhancedL);

  // Thay kênh L đã xử lý vào
  channels.set(0, enhancedL);
  cv.merge(channels, labMat);

  // Chuyển ngược lại RGB sau khi CLAHE
  const claheRGB = new cv.Mat();
  cv.cvtColor(labMat, claheRGB, cv.COLOR_Lab2RGB);

  // Dọn dẹp bộ nhớ bước CLAHE
  channels.delete();
  clahe.delete();
  channelL.delete();
  enhancedL.delete();
  labMat.delete();

  // --- BƯỚC 5: LÀM SÁNG KHUÔN MẶT CỤC BỘ VÀ CHUYỂN TIẾP MỀM ---
  const finalEnhanced = claheRGB.clone();

  if (cache.faces.length > 0) {
    const faceMask = cv.Mat.zeros(rows, cols, cv.CV_8UC1);
    
    // Vẽ mask cho các khuôn mặt phát hiện được
    for (const face of cache.faces) {
      const bbox = face.boundingBox;
      
      // Chuyển tỷ lệ bbox sang pixel thực tế và mở rộng thêm 25% làm sáng da cổ và tóc
      let w = Math.floor(bbox.width * cols * 1.25);
      let h = Math.floor(bbox.height * rows * 1.25);
      let x = Math.floor(bbox.xCenter * cols - w / 2);
      let y = Math.floor(bbox.yCenter * rows - h / 2);

      // Đảm bảo không vượt quá biên ảnh
      x = Math.max(0, x);
      y = Math.max(0, y);
      w = Math.min(w, cols - x);
      h = Math.min(h, rows - y);

      if (w > 0 && h > 0) {
        // Vẽ ellipse bao phủ vùng mặt
        const center = new cv.Point(x + w / 2, y + h / 2);
        const axes = new cv.Size(w / 1.5, h / 1.5);
        cv.ellipse(faceMask, center, axes, 0, 0, 360, new cv.Scalar(255), -1);
      }
    }

    // Làm mờ mask khuôn mặt (Gaussian Blur) tạo chuyển tiếp mềm mại (soft blending)
    const faceMaskBlur = new cv.Mat();
    let blurSize = Math.max(19, Math.floor(cols * 0.15));
    if (blurSize % 2 === 0) blurSize++; // Kernel size của GaussianBlur phải là số lẻ
    cv.GaussianBlur(faceMask, faceMaskBlur, new cv.Size(blurSize, blurSize), 0, 0);

    // Tạo ảnh làm sáng khuôn mặt (sử dụng Gamma Correction hoặc cộng trực tiếp độ sáng)
    const faceEnhancedMat = new cv.Mat();
    // Chỉnh sáng mặt
    claheRGB.convertTo(faceEnhancedMat, -1, 1.0, faceBrightnessDelta + brightnessDelta);

    // Trộn ảnh làm sáng mặt với ảnh gốc theo mask chuyển tiếp mềm
    // formula: output = original * (1 - mask/255) + brightened * (mask/255)
    const maskFloat = new cv.Mat();
    faceMaskBlur.convertTo(maskFloat, cv.CV_32FC1, 1.0 / 255.0);

    const maskFloat3C = new cv.Mat();
    const maskChannels = new cv.MatVector();
    maskChannels.push_back(maskFloat);
    maskChannels.push_back(maskFloat);
    maskChannels.push_back(maskFloat);
    cv.merge(maskChannels, maskFloat3C);

    const origFloat = new cv.Mat();
    const faceFloat = new cv.Mat();
    finalEnhanced.convertTo(origFloat, cv.CV_32FC3);
    faceEnhancedMat.convertTo(faceFloat, cv.CV_32FC3);

    // Blend: (faceFloat - origFloat) * mask + origFloat
    const diffFloat = new cv.Mat();
    cv.subtract(faceFloat, origFloat, diffFloat);

    const blendFloat = new cv.Mat();
    cv.multiply(diffFloat, maskFloat3C, blendFloat);

    const resultFloat = new cv.Mat();
    cv.add(blendFloat, origFloat, resultFloat);
    resultFloat.convertTo(finalEnhanced, cv.CV_8UC3);

    // Giải phóng bộ nhớ face blend
    faceMask.delete();
    faceMaskBlur.delete();
    faceEnhancedMat.delete();
    maskFloat.delete();
    maskFloat3C.delete();
    maskChannels.delete();
    origFloat.delete();
    faceFloat.delete();
    diffFloat.delete();
    blendFloat.delete();
    resultFloat.delete();
  }

  // --- BƯỚC 6: TÁCH NGƯỜI VÀ NỀN - TĂNG SÁNG & TƯƠNG PHẢN CHỦ THỂ ---
  if (cache.segmentationMask) {
    // Chuyển ImageData của mask thành OpenCV Mat 8-bit 1-channel
    const rawMask = new cv.Mat(cache.height, cache.width, cv.CV_8UC4);
    rawMask.data.set(cache.segmentationMask.data);

    // Selfie segmentation mask là kênh Alpha, trích xuất nó
    const maskChannels = new cv.MatVector();
    cv.split(rawMask, maskChannels);
    const personMask = maskChannels.get(0).clone(); // Kênh Red chứa segmentation mask (0: nền, 255: người)

    // Resize mask khớp kích thước ảnh nâng cao hiện tại nếu có lệch
    const personMaskResized = new cv.Mat();
    cv.resize(personMask, personMaskResized, new cv.Size(cols, rows));

    // Làm mờ nhẹ rìa của mask phân đoạn người để tránh răng cưa sắc cạnh
    const personMaskBlur = new cv.Mat();
    let pBlurSize = Math.max(5, Math.floor(cols * 0.015));
    if (pBlurSize % 2 === 0) pBlurSize++;
    cv.GaussianBlur(personMaskResized, personMaskBlur, new cv.Size(pBlurSize, pBlurSize), 0, 0);

    // Tạo ảnh đã tăng chất lượng cho chủ thể (Brightness + Contrast)
    const subjectEnhancedMat = new cv.Mat();
    // contrast & brightness: output = input * contrastCoef + brightnessDelta
    finalEnhanced.convertTo(subjectEnhancedMat, -1, subjectContrastCoef, subjectBrightnessDelta + brightnessDelta);

    // Blend: Trộn chủ thể đã nâng cao vào ảnh chính
    const maskFloat = new cv.Mat();
    personMaskBlur.convertTo(maskFloat, cv.CV_32FC1, 1.0 / 255.0);

    const maskFloat3C = new cv.Mat();
    const vecChannels = new cv.MatVector();
    vecChannels.push_back(maskFloat);
    vecChannels.push_back(maskFloat);
    vecChannels.push_back(maskFloat);
    cv.merge(vecChannels, maskFloat3C);

    const origFloat = new cv.Mat();
    const subjFloat = new cv.Mat();
    finalEnhanced.convertTo(origFloat, cv.CV_32FC3);
    subjectEnhancedMat.convertTo(subjFloat, cv.CV_32FC3);

    const diffFloat = new cv.Mat();
    cv.subtract(subjFloat, origFloat, diffFloat);

    const blendFloat = new cv.Mat();
    cv.multiply(diffFloat, maskFloat3C, blendFloat);

    const resultFloat = new cv.Mat();
    cv.add(blendFloat, origFloat, resultFloat);
    resultFloat.convertTo(finalEnhanced, cv.CV_8UC3);

    // --- BƯỚC 7: TĂNG ĐỘ NÉT (SHARPNING) TRÊN VÙNG CHỦ THỂ ---
    // Kernel sharpening nhẹ
    const kernel = cv.matFromArray(3, 3, cv.CV_32FC1, [
      0, -0.15, 0,
      -0.15, 1.6, -0.15,
      0, -0.15, 0
    ]);
    const sharpenedMat = new cv.Mat();
    cv.filter2D(finalEnhanced, sharpenedMat, -1, kernel);

    // Chỉ áp dụng làm nét lên chủ thể người chụp (trộn bằng mask người)
    const finalEnhancedFloat = new cv.Mat();
    const sharpFloat = new cv.Mat();
    finalEnhanced.convertTo(finalEnhancedFloat, cv.CV_32FC3);
    sharpenedMat.convertTo(sharpFloat, cv.CV_32FC3);

    const diffSharp = new cv.Mat();
    cv.subtract(sharpFloat, finalEnhancedFloat, diffSharp);

    const blendSharp = new cv.Mat();
    cv.multiply(diffSharp, maskFloat3C, blendSharp);

    const resultSharp = new cv.Mat();
    cv.add(blendSharp, finalEnhancedFloat, resultSharp);
    resultSharp.convertTo(finalEnhanced, cv.CV_8UC3);

    // Giải phóng bộ nhớ bước chủ thể & làm nét
    rawMask.delete();
    maskChannels.delete();
    personMask.delete();
    personMaskResized.delete();
    personMaskBlur.delete();
    subjectEnhancedMat.delete();
    maskFloat.delete();
    maskFloat3C.delete();
    vecChannels.delete();
    origFloat.delete();
    subjFloat.delete();
    diffFloat.delete();
    blendFloat.delete();
    resultFloat.delete();
    kernel.delete();
    sharpenedMat.delete();
    finalEnhancedFloat.delete();
    sharpFloat.delete();
    diffSharp.delete();
    blendSharp.delete();
    resultSharp.delete();
  } else {
    // Nếu không có segmentation mask (lỗi tải model hoặc thiết bị yếu), áp dụng tăng sáng/tương phản toàn ảnh mức nhẹ
    const fallbackMat = new cv.Mat();
    finalEnhanced.convertTo(fallbackMat, -1, subjectContrastCoef, brightnessDelta);
    fallbackMat.copyTo(finalEnhanced);
    fallbackMat.delete();

    // Làm nét toàn ảnh mức siêu nhẹ
    const kernel = cv.matFromArray(3, 3, cv.CV_32FC1, [
      0, -0.1, 0,
      -0.1, 1.4, -0.1,
      0, -0.1, 0
    ]);
    const sharpenedMat = new cv.Mat();
    cv.filter2D(finalEnhanced, sharpenedMat, -1, kernel);
    sharpenedMat.copyTo(finalEnhanced);
    kernel.delete();
    sharpenedMat.delete();
  }

  // --- BỘ LỌC PRESET MÀU SẮC (VIVID / COOL / WARM) ---
  if (preset === 'vivid' && saturationFactor !== 1.0) {
    const hsvMat = new cv.Mat();
    cv.cvtColor(finalEnhanced, hsvMat, cv.COLOR_RGB2HSV);

    const hsvChannels = new cv.MatVector();
    cv.split(hsvMat, hsvChannels);

    // Nhân kênh Saturation (kênh 1) với saturationFactor
    const channelS = hsvChannels.get(1);
    const enhancedS = new cv.Mat();
    channelS.convertTo(enhancedS, -1, saturationFactor, 0);

    hsvChannels.set(1, enhancedS);
    cv.merge(hsvChannels, hsvMat);

    cv.cvtColor(hsvMat, finalEnhanced, cv.COLOR_HSV2RGB);

    hsvMat.delete();
    hsvChannels.delete();
    channelS.delete();
    enhancedS.delete();
  }

  // Tinh chỉnh cân bằng màu (Color Toning) cho Cool / Warm
  if (colorToning.r !== 0 || colorToning.g !== 0 || colorToning.b !== 0) {
    const rgbChannels = new cv.MatVector();
    cv.split(finalEnhanced, rgbChannels);

    const rChan = rgbChannels.get(0);
    const gChan = rgbChannels.get(1);
    const bChan = rgbChannels.get(2);

    const newR = new cv.Mat();
    const newG = new cv.Mat();
    const newB = new cv.Mat();

    rChan.convertTo(newR, -1, 1.0, colorToning.r);
    gChan.convertTo(newG, -1, 1.0, colorToning.g);
    bChan.convertTo(newB, -1, 1.0, colorToning.b);

    rgbChannels.set(0, newR);
    rgbChannels.set(1, newG);
    rgbChannels.set(2, newB);

    cv.merge(rgbChannels, finalEnhanced);

    rgbChannels.delete();
    rChan.delete();
    gChan.delete();
    bChan.delete();
    newR.delete();
    newG.delete();
    newB.delete();
  }

  // Chuyển kết quả cuối cùng từ RGB -> RGBA và vẽ ra canvas để lấy base64
  const finalRGBA = new cv.Mat();
  cv.cvtColor(finalEnhanced, finalRGBA, cv.COLOR_RGB2RGBA);
  cv.imshow(canvas, finalRGBA);

  // Giải phóng toàn bộ tài nguyên Mat
  src.delete();
  srcRGB.delete();
  claheRGB.delete();
  finalEnhanced.delete();
  finalRGBA.delete();

  return canvas.toDataURL('image/png');
};
