/**
 * IndexedDB Enterprise Storage Layer for Athahar Roadways
 * Provides persistent, quota-free (GB-scale) local storage for manifests,
 * draft backups, and database tables. Prevents any 5MB localStorage limits
 * or data loss from browser crashes.
 */

const DB_NAME = 'AthaharRoadwaysEnterpriseDB';
const DB_VERSION = 1;

const STORES = {
  VAULT: 'manifest_vault',
  BACKUPS: 'database_backups',
  ACTIVE_DRAFTS: 'active_drafts',
};

let dbPromise = null;

const getDB = () => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORES.VAULT)) {
        db.createObjectStore(STORES.VAULT, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.BACKUPS)) {
        db.createObjectStore(STORES.BACKUPS, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORES.ACTIVE_DRAFTS)) {
        db.createObjectStore(STORES.ACTIVE_DRAFTS, { keyPath: 'type' });
      }
    };

    request.onsuccess = (e) => {
      resolve(e.target.result);
    };

    request.onerror = (e) => {
      console.warn('[IndexedDB] Failed to open enterprise database:', e.target.error);
      resolve(null);
    };
  });

  return dbPromise;
};

/**
 * Save an active draft directly into IndexedDB
 */
export const saveIDBDraft = async (type, payload) => {
  try {
    const db = await getDB();
    if (!db) return;
    return new Promise((resolve) => {
      const tx = db.transaction([STORES.ACTIVE_DRAFTS], 'readwrite');
      const store = tx.objectStore(STORES.ACTIVE_DRAFTS);
      store.put({ type, ...payload, updatedAt: new Date().toISOString() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (e) {
    console.warn('[IndexedDB] Draft save error:', e);
  }
};

/**
 * Get active draft from IndexedDB
 */
export const getIDBDraft = async (type) => {
  try {
    const db = await getDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction([STORES.ACTIVE_DRAFTS], 'readonly');
      const store = tx.objectStore(STORES.ACTIVE_DRAFTS);
      const req = store.get(type);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
};

/**
 * Clear an active draft in IndexedDB
 */
export const clearIDBDraft = async (type) => {
  try {
    const db = await getDB();
    if (!db) return;
    return new Promise((resolve) => {
      const tx = db.transaction([STORES.ACTIVE_DRAFTS], 'readwrite');
      const store = tx.objectStore(STORES.ACTIVE_DRAFTS);
      store.delete(type);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (e) {}
};

/**
 * Save snapshot to persistent vault
 */
export const saveIDBVaultSnapshot = async (snapshot) => {
  try {
    const db = await getDB();
    if (!db) return;
    return new Promise((resolve) => {
      const tx = db.transaction([STORES.VAULT], 'readwrite');
      const store = tx.objectStore(STORES.VAULT);
      store.put(snapshot);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (e) {}
};

/**
 * Get all vault snapshots from IndexedDB
 */
export const getAllIDBVaultSnapshots = async () => {
  try {
    const db = await getDB();
    if (!db) return [];
    return new Promise((resolve) => {
      const tx = db.transaction([STORES.VAULT], 'readonly');
      const store = tx.objectStore(STORES.VAULT);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
};

/**
 * Mirror critical collection data to IndexedDB
 */
export const backupCollectionToIDB = async (key, data) => {
  try {
    const db = await getDB();
    if (!db) return;
    return new Promise((resolve) => {
      const tx = db.transaction([STORES.BACKUPS], 'readwrite');
      const store = tx.objectStore(STORES.BACKUPS);
      store.put({ key, data, savedAt: new Date().toISOString() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (e) {}
};

/**
 * Restore critical collection data from IndexedDB
 */
export const getCollectionFromIDB = async (key) => {
  try {
    const db = await getDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction([STORES.BACKUPS], 'readonly');
      const store = tx.objectStore(STORES.BACKUPS);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result?.data || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
};
