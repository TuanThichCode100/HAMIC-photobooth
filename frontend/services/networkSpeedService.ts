import { BACKEND_URL } from './backendService';

export interface AdaptiveCompressionConfig {
  quality: number;       // WebP quality between 0.0 and 1.0
  scale: number;         // Dimension scale factor (1.0 = original, 0.7 = 70% width & height)
  tier: 'fast' | 'good' | 'medium' | 'slow';
  speedKBps?: number;
  measuredAt?: number;
}

// Safe default config (matches current behavior)
const DEFAULT_CONFIG: AdaptiveCompressionConfig = {
  quality: 0.75,
  scale: 1.0,
  tier: 'good',
};

let cachedConfig: AdaptiveCompressionConfig = { ...DEFAULT_CONFIG };
let isMeasuring = false;

/**
 * Maps measured upload speed in KB/s to optimal compression settings.
 */
export const calculateCompressionConfig = (speedKBps: number): AdaptiveCompressionConfig => {
  if (speedKBps >= 1200) {
    // Fast network (> 1.2 MB/s, approx > 10 Mbps): High quality, full resolution
    return {
      quality: 0.90,
      scale: 1.0,
      tier: 'fast',
      speedKBps,
      measuredAt: Date.now(),
    };
  } else if (speedKBps >= 450) {
    // Good network (450 KB/s - 1200 KB/s, approx 3.6 - 10 Mbps): Standard high quality
    return {
      quality: 0.78,
      scale: 1.0,
      tier: 'good',
      speedKBps,
      measuredAt: Date.now(),
    };
  } else if (speedKBps >= 150) {
    // Medium network (150 KB/s - 450 KB/s): Slightly lower quality and scaled resolution
    return {
      quality: 0.65,
      scale: 0.85,
      tier: 'medium',
      speedKBps,
      measuredAt: Date.now(),
    };
  } else {
    // Slow or congested network (< 150 KB/s): Maximum compression to ensure QR generates fast
    return {
      quality: 0.55,
      scale: 0.70,
      tier: 'slow',
      speedKBps,
      measuredAt: Date.now(),
    };
  }
};

/**
 * Measures upload speed by sending a lightweight 50KB dummy payload to the backend.
 * Aborts after 1500ms if network is slow/unresponsive.
 */
export const measureUploadSpeed = async (
  apiUrl: string = BACKEND_URL,
  timeoutMs: number = 1500
): Promise<AdaptiveCompressionConfig> => {
  if (!apiUrl) return cachedConfig;
  // If recently measured (< 45s ago), reuse cache to save bandwidth
  if (cachedConfig.measuredAt && Date.now() - cachedConfig.measuredAt < 45000) {
    return cachedConfig;
  }

  if (isMeasuring) {
    return cachedConfig;
  }

  isMeasuring = true;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const payloadSizeKB = 50;
  const dummyPayload = new Uint8Array(payloadSizeKB * 1024);

  const startTime = performance.now();

  try {
    const response = await fetch(`${apiUrl}/api/ping-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      body: dummyPayload,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Ping failed with status ${response.status}`);
    }

    const durationSeconds = (performance.now() - startTime) / 1000;
    // Calculate speed in KB/s
    const speedKBps = durationSeconds > 0 ? payloadSizeKB / durationSeconds : 1000;
    
    cachedConfig = calculateCompressionConfig(speedKBps);
    console.log(
      `[NetworkSpeed] Measured: ${speedKBps.toFixed(1)} KB/s (~${((speedKBps * 8) / 1024).toFixed(2)} Mbps). Tier: ${cachedConfig.tier} (Quality: ${cachedConfig.quality}, Scale: ${cachedConfig.scale})`
    );
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      // Timeout triggered: Network is very slow or congested
      console.warn(`[NetworkSpeed] Speed test timed out (> ${timeoutMs}ms). Applying max compression (slow tier).`);
      cachedConfig = {
        quality: 0.55,
        scale: 0.70,
        tier: 'slow',
        speedKBps: 50 / (timeoutMs / 1000),
        measuredAt: Date.now(),
      };
    } else {
      console.warn('[NetworkSpeed] Ping measurement failed, using default config:', error.message);
      // Keep existing or default config
    }
  } finally {
    isMeasuring = false;
  }

  return cachedConfig;
};

/**
 * Returns the latest determined compression config without re-measuring.
 */
export const getCachedCompressionConfig = (): AdaptiveCompressionConfig => {
  return cachedConfig;
};
