// Lightweight File System Access helpers with IndexedDB persistence for directory handles
const DB_NAME = 'hamic-fs';
const STORE_NAME = 'handles';
const STORE_KEY = 'save-dir';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(key: string, value: any): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    } catch (err) {
      reject(err);
    }
  });
}

function idbGet(key: string): Promise<any> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function getDirectoryHandle(promptIfMissing = true): Promise<any /* FileSystemDirectoryHandle | null */> {
  if (!('showDirectoryPicker' in window)) return null;

  try {
    let handle = await idbGet(STORE_KEY);

    if (handle) {
      // Check permission
      try {
        // Some browsers support queryPermission
        // @ts-ignore
        const perm = await handle.queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') return handle;
      } catch (e) {
        // ignore and fallthrough to prompt if allowed
      }
    }

    if (promptIfMissing) {
      // @ts-ignore
      handle = await (window as any).showDirectoryPicker();
      await idbPut(STORE_KEY, handle);
      return handle;
    }

    return null;
  } catch (err) {
    console.error('getDirectoryHandle error', err);
    return null;
  }
}

export async function saveBlobToDirectory(blob: Blob, filename: string): Promise<void> {
  // Try File System Access API first
  const dirHandle = await getDirectoryHandle(true);

  if (dirHandle) {
    try {
      const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      console.error('Failed to write via File System Access API', err);
      // fallback to anchor below
    }
  }

  // Fallback: trigger browser download via anchor
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function clearStoredDirectoryHandle(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(STORE_KEY);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('clearStoredDirectoryHandle error', err);
  }
}

export default {
  getDirectoryHandle,
  saveBlobToDirectory,
  clearStoredDirectoryHandle,
};
