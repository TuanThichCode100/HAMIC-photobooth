const BACKEND_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000';

export interface UploadResponse {
  success: boolean;
  urls: {
    photo: string;
    timelapse?: string;
  };
  error?: string;
}

/**
 * Uploads the final photo strip and optional timelapse video to the backend.
 * Returns the public image URL from ImgBB on success, or null on failure.
 */
export const uploadToBackend = async (
  photoBlob: Blob,
  timelapseBlob: Blob | null,
  frameTopic: string
): Promise<string | null> => {
  const formData = new FormData();
  formData.append('photo', photoBlob, `photo-${frameTopic}-${Date.now()}.png`);
  
  if (timelapseBlob) {
    formData.append('timelapse', timelapseBlob, `timelapse-${frameTopic}-${Date.now()}.webm`);
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Backend upload failed response:', errText);
      throw new Error(`Upload failed with status ${response.status}`);
    }

    const data: UploadResponse = await response.json();
    if (data.success && data.urls.photo) {
      console.log('Upload to backend successful:', data.urls.photo);
      return data.urls.photo;
    } else {
      console.error('Backend upload response indicated failure:', data.error);
      return null;
    }
  } catch (error) {
    console.error('Error uploading to backend:', error);
    return null;
  }
};
