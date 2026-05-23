'use client';

const DB_NAME = 'inventaire-offline';
const STORE_NAME = 'pending-scans';

let db: IDBDatabase | null = null;

async function openDb(): Promise<IDBDatabase> {
  if (db) return db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const database = (e.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = (e) => {
      db = (e.target as IDBOpenDBRequest).result;
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveScanOffline(scan: Record<string, unknown>) {
  const database = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add({ ...scan, savedAt: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingScans(): Promise<Record<string, unknown>[]> {
  const database = await openDb();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function clearPendingScans() {
  const database = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Synchronisation automatique quand la connexion est rétablie
export function setupOfflineSync(syncFn: (scans: Record<string, unknown>[]) => Promise<void>) {
  window.addEventListener('online', async () => {
    const scans = await getPendingScans();
    if (scans.length === 0) return;
    try {
      await syncFn(scans);
      await clearPendingScans();
      console.log(`[Offline] ${scans.length} scan(s) synchronisé(s)`);
    } catch (err) {
      console.error('[Offline] Sync failed:', err);
    }
  });
}
