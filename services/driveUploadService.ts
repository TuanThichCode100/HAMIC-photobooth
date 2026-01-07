/// <reference types="vite/client" />

const DEFAULT_BACKEND = import.meta.env.VITE_DRIVE_UPLOADER_URL || 'http://localhost:4000';

export async function uploadBlobToDrive(blob: Blob, filename: string) {
  try {
    const url = `${DEFAULT_BACKEND}/upload`;
    const form = new FormData();
    form.append('file', blob, filename);

    const resp = await fetch(url, {
      method: 'POST',
      body: form,
    });

    if (!resp.ok) throw new Error(await resp.text());

    const data = await resp.json();
    return data;
  } catch (err) {
    console.error('uploadBlobToDrive error', err);
    throw err;
  }
}

export default { uploadBlobToDrive };
