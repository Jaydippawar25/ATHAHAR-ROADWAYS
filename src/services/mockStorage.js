import { INITIAL_MASTERS } from '../utils/constants';
import { db } from '../firebase/firebase';
import { doc, getDoc, setDoc, deleteDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';

export const STORAGE_KEYS = {
  MASTERS: 'athahar_masters',
  INWARDS: 'athahar_inwards',
  INWARD_ITEMS: 'athahar_inward_items',
  OUTWARDS: 'athahar_outwards',
  OUTWARD_ITEMS: 'athahar_outward_items',
  AUDIT_LOGS: 'athahar_audit_logs',
  ACCOUNTING_VOUCHERS: 'athahar_accounting_vouchers',
  EXPENSES: 'athahar_expenses',
};

// Internal flag to prevent echo loops when remote updates arrive
let isApplyingRemoteUpdate = false;

/**
 * Read item from localStorage with fallback default
 */
export const getStoredItem = (key, defaultVal = []) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
};

/**
 * Write item to localStorage ONLY without pushing to Firestore.
 * Used during cloud hydration and remote onSnapshot updates.
 */
export const setStoredItemLocalOnly = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error(`Local storage write error for ${key}:`, e);
  }
};

/**
 * Write item to localStorage AND trigger sync to Cloud Firestore
 */
export const setStoredItem = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error(`Local storage write error for ${key}:`, e);
  }

  // Only trigger Firestore sync if not actively applying a remote Firestore snapshot
  if (!isApplyingRemoteUpdate) {
    syncToFirestore(key, val).catch((err) =>
      console.warn(`[Firestore Sync Warning] Unable to sync "${key}":`, err?.message || err)
    );
  }
};

const CHUNK_SIZE = 250;

/**
 * Sync item to Cloud Firestore asynchronously
 */
export const syncToFirestore = async (key, val) => {
  if (!db) {
    console.warn('[Firestore] Database instance not ready. Stored locally.');
    return;
  }

  try {
    const isLargeArray = Array.isArray(val) && val.length > CHUNK_SIZE;

    if (isLargeArray) {
      // 1. Chunked storage for large arrays to never exceed Firestore's 1 MiB document limit
      const chunkCount = Math.ceil(val.length / CHUNK_SIZE);
      const chunkPromises = [];
      for (let i = 0; i < chunkCount; i++) {
        const chunkData = val.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const chunkDocRef = doc(db, 'app_data', `${key}_chunk_${i}`);
        chunkPromises.push(
          setDoc(chunkDocRef, {
            chunkIndex: i,
            data: chunkData,
            updatedAt: new Date().toISOString(),
          })
        );
      }
      await Promise.all(chunkPromises);

      // Primary doc holds metadata pointing to chunks
      const docRef = doc(db, 'app_data', key);
      await setDoc(docRef, {
        chunked: true,
        chunkCount,
        totalCount: val.length,
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Small arrays or objects fit comfortably in primary doc
      const docRef = doc(db, 'app_data', key);
      await setDoc(
        docRef,
        {
          chunked: false,
          data: val,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    // 2. Granular document-level write for recent items only (avoiding heavy 1000+ sequential network calls)
    if (Array.isArray(val)) {
      const recentItems = val.slice(0, 30);
      for (let index = 0; index < recentItems.length; index++) {
        const item = recentItems[index];
        if (item && (item.id || item.lrNo)) {
          const itemDocId = String(item.id || item.lrNo || index);
          setDoc(
            doc(db, key, itemDocId),
            { ...item, updatedAt: new Date().toISOString() },
            { merge: true }
          ).catch(() => {});
        }
      }
    } else if (typeof val === 'object' && val !== null) {
      await setDoc(
        doc(db, key, 'current'),
        { ...val, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    }
  } catch (err) {
    console.warn(`[Firestore Sync Error] Collection "${key}":`, err?.message || err);
    throw err;
  }
};

/**
 * Fetch a single key directly from Cloud Firestore
 */
export const fetchFromFirestore = async (key) => {
  if (!db) return { exists: false, data: null };

  try {
    // Check primary doc in app_data collection
    const docRef = doc(db, 'app_data', key);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const snapData = snap.data();
      if (snapData?.chunked && snapData?.chunkCount) {
        // Fetch all chunks in parallel and reassemble array
        const chunkPromises = [];
        for (let i = 0; i < snapData.chunkCount; i++) {
          chunkPromises.push(getDoc(doc(db, 'app_data', `${key}_chunk_${i}`)));
        }
        const chunkSnaps = await Promise.all(chunkPromises);
        const allData = [];
        for (const cSnap of chunkSnaps) {
          if (cSnap.exists() && Array.isArray(cSnap.data()?.data)) {
            allData.push(...cSnap.data().data);
          }
        }
        return { exists: true, data: allData };
      }

      if (snapData?.data !== undefined) {
        return { exists: true, data: snapData.data };
      }
    }

    // Fallback: check if stored as an individual collection
    const colRef = collection(db, key);
    const colSnap = await getDocs(colRef);
    if (!colSnap.empty) {
      const docsData = colSnap.docs.map((d) => d.data());
      return { exists: true, data: docsData };
    }

    return { exists: false, data: null };
  } catch (err) {
    console.warn(`[Firestore Fetch Error] "${key}":`, err?.message || err);
    return { exists: false, data: null, error: err };
  }
};

/**
 * Bulk push all local data to Cloud Firestore
 */
export const syncAllToFirestore = async () => {
  const keys = Object.values(STORAGE_KEYS);
  let syncedCount = 0;
  for (const key of keys) {
    const data = getStoredItem(key);
    if (data !== undefined && data !== null) {
      await syncToFirestore(key, data);
      syncedCount++;
    }
  }
  return syncedCount;
};

/**
 * Bulk pull all data from Cloud Firestore into local storage
 */
export const pullAllFromFirestore = async () => {
  const keys = Object.values(STORAGE_KEYS);
  let pulledCount = 0;

  isApplyingRemoteUpdate = true;
  try {
    for (const key of keys) {
      const res = await fetchFromFirestore(key);
      if (res.exists && res.data !== null && res.data !== undefined) {
        // Smart merge: never lose local items that are newer or not yet in cloud!
        const localData = getStoredItem(key, null);
        if (Array.isArray(localData) && Array.isArray(res.data)) {
          const cloudIds = new Set(res.data.map((i) => i.id).filter(Boolean));
          const localOnlyItems = localData.filter((i) => i && i.id && !cloudIds.has(i.id));
          if (localOnlyItems.length > 0) {
            console.log(`[Storage] Preserving ${localOnlyItems.length} local items for "${key}" not yet in cloud`);
            const merged = [...localOnlyItems, ...res.data];
            setStoredItemLocalOnly(key, merged);
            syncToFirestore(key, merged).catch(console.warn);
            pulledCount++;
            continue;
          }
        }
        setStoredItemLocalOnly(key, res.data);
        pulledCount++;
      }
    }
  } finally {
    isApplyingRemoteUpdate = false;
  }

  return pulledCount;
};

/**
 * Test Firestore database connection
 */
export const testFirestoreConnection = async () => {
  try {
    if (!db) throw new Error('Firestore instance is not initialized.');
    const testDoc = doc(db, '_connection_check', 'ping');
    await setDoc(testDoc, { ping: true, timestamp: new Date().toISOString() });
    const snap = await getDoc(testDoc);
    return { success: snap.exists() };
  } catch (err) {
    console.error('Firestore Healthcheck Failed:', err);
    return { success: false, error: err?.message || String(err) };
  }
};


/**
 * Safe Asynchronous Hydration & Initialization:
 * 1. Checks if Cloud Firestore already has live records.
 * 2. If Firestore has data -> downloads it into local storage.
 * 3. If Firestore is empty AND local storage is empty -> initializes clean empty state.
 * 4. If Firestore is unreachable -> cleanly falls back to existing local storage.
 */
export const safeInitializeData = async () => {
  try {
    let cloudHasData = false;

    // Check key collections in Firestore
    const inwardCheck = await fetchFromFirestore(STORAGE_KEYS.INWARDS);
    const mastersCheck = await fetchFromFirestore(STORAGE_KEYS.MASTERS);

    if (inwardCheck.exists || mastersCheck.exists) {
      cloudHasData = true;
    }

    if (cloudHasData) {
      // Cloud has existing data -> pull all collections from Firestore into localStorage
      await pullAllFromFirestore();
      return { success: true, source: 'firestore' };
    }

    // Cloud does NOT have data yet. Check if local storage has data to upload.
    const localInwards = localStorage.getItem(STORAGE_KEYS.INWARDS);
    const localMasters = localStorage.getItem(STORAGE_KEYS.MASTERS);

    if (localInwards || localMasters) {
      // Push existing local data to Firestore
      await syncAllToFirestore();
      return { success: true, source: 'localStorage' };
    }

    // Both Cloud and Local are empty -> Clean fresh initialization
    isApplyingRemoteUpdate = true;
    setStoredItemLocalOnly(STORAGE_KEYS.MASTERS, INITIAL_MASTERS);
    setStoredItemLocalOnly(STORAGE_KEYS.INWARDS, []);
    setStoredItemLocalOnly(STORAGE_KEYS.INWARD_ITEMS, []);
    setStoredItemLocalOnly(STORAGE_KEYS.OUTWARDS, []);
    setStoredItemLocalOnly(STORAGE_KEYS.OUTWARD_ITEMS, []);
    setStoredItemLocalOnly(STORAGE_KEYS.AUDIT_LOGS, []);
    setStoredItemLocalOnly(STORAGE_KEYS.ACCOUNTING_VOUCHERS, []);
    setStoredItemLocalOnly(STORAGE_KEYS.EXPENSES, []);
    isApplyingRemoteUpdate = false;

    // Upload clean initial state to Firestore
    await syncAllToFirestore();
    return { success: true, source: 'initialized' };
  } catch (err) {
    console.warn('[Storage Init] Cloud check encountered an error. Falling back to local storage:', err);
    return { success: false, error: err?.message || String(err), source: 'local_fallback' };
  }
};

/**
 * Completely wipe all records from both LocalStorage and Cloud Firestore
 */
export const clearAllDatabaseData = async () => {
  isApplyingRemoteUpdate = true;
  try {
    // 1. Clear local storage keys
    Object.values(STORAGE_KEYS).forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    });

    const emptyMasters = {
      transporters: [],
      vehicles: [],
      drivers: [],
      consignors: [],
      consignees: [],
      stations: [],
      deliveryPersons: [],
      owners: [],
    };

    setStoredItemLocalOnly(STORAGE_KEYS.MASTERS, emptyMasters);
    setStoredItemLocalOnly(STORAGE_KEYS.INWARDS, []);
    setStoredItemLocalOnly(STORAGE_KEYS.INWARD_ITEMS, []);
    setStoredItemLocalOnly(STORAGE_KEYS.OUTWARDS, []);
    setStoredItemLocalOnly(STORAGE_KEYS.OUTWARD_ITEMS, []);
    setStoredItemLocalOnly(STORAGE_KEYS.AUDIT_LOGS, []);
    setStoredItemLocalOnly(STORAGE_KEYS.ACCOUNTING_VOUCHERS, []);
    setStoredItemLocalOnly(STORAGE_KEYS.EXPENSES, []);

    // 2. Wipe Firestore app_data documents
    if (db) {
      for (const key of Object.values(STORAGE_KEYS)) {
        try {
          const docRef = doc(db, 'app_data', key);
          const emptyVal = key === STORAGE_KEYS.MASTERS ? emptyMasters : [];
          await setDoc(docRef, {
            data: emptyVal,
            updatedAt: new Date().toISOString(),
            clearedAt: new Date().toISOString(),
          });
        } catch (e) {
          console.warn(`Could not clear Firestore app_data/${key}:`, e);
        }
      }

      // 3. Clear granular collection documents
      const granularCollections = [
        'athahar_inwards',
        'athahar_inward_items',
        'athahar_outwards',
        'athahar_outward_items',
        'athahar_accounting_vouchers',
        'athahar_expenses',
        'athahar_masters',
      ];
      for (const colName of granularCollections) {
        try {
          const colRef = collection(db, colName);
          const snap = await getDocs(colRef);
          for (const docSnap of snap.docs) {
            await deleteDoc(docSnap.ref);
          }
        } catch (e) {}
      }
    }
    return { success: true };
  } finally {
    isApplyingRemoteUpdate = false;
  }
};

/**
 * Real-time bidirectional synchronization listener:
 * Subscribes via onSnapshot to Firestore `app_data` documents.
 * Invokes onKeyChange(key, data) whenever a change is made from another device/browser.
 */
export const subscribeToFirestore = (onKeyChange) => {
  if (!db) return () => {};

  const unsubscribers = [];
  const keys = Object.values(STORAGE_KEYS);

  keys.forEach((key) => {
    try {
      const docRef = doc(db, 'app_data', key);
      const unsubscribe = onSnapshot(
        docRef,
        async (snap) => {
          if (!snap.exists()) return;
          // Ignore local pending writes to avoid race conditions or clobbering optimistic UI state
          if (snap.metadata.hasPendingWrites) return;

          let remoteData = snap.data()?.data;
          if (snap.data()?.chunked && snap.data()?.chunkCount) {
            // Reassemble chunks
            try {
              const chunkPromises = [];
              for (let i = 0; i < snap.data().chunkCount; i++) {
                chunkPromises.push(getDoc(doc(db, 'app_data', `${key}_chunk_${i}`)));
              }
              const chunkSnaps = await Promise.all(chunkPromises);
              const allData = [];
              for (const cSnap of chunkSnaps) {
                if (cSnap.exists() && Array.isArray(cSnap.data()?.data)) {
                  allData.push(...cSnap.data().data);
                }
              }
              remoteData = allData;
            } catch (chunkErr) {
              console.warn(`[Firestore onSnapshot chunk reassembly error] "${key}":`, chunkErr);
              return;
            }
          }

          if (remoteData === undefined || remoteData === null) return;

          // Compare with current local storage to avoid redundant re-renders
          const localStr = localStorage.getItem(key);
          const remoteStr = JSON.stringify(remoteData);

          if (localStr !== remoteStr) {
            // If local storage currently has items not yet in incoming remote, do not blindly overwrite!
            const localData = getStoredItem(key, null);
            if (Array.isArray(localData) && Array.isArray(remoteData)) {
              const cloudIds = new Set(remoteData.map((i) => i.id).filter(Boolean));
              const localOnlyItems = localData.filter((i) => i && i.id && !cloudIds.has(i.id));
              if (localOnlyItems.length > 0) {
                // Keep local items intact
                remoteData = [...localOnlyItems, ...remoteData];
                syncToFirestore(key, remoteData).catch(console.warn);
              }
            }

            isApplyingRemoteUpdate = true;
            try {
              setStoredItemLocalOnly(key, remoteData);
              if (typeof onKeyChange === 'function') {
                onKeyChange(key, remoteData);
              }
            } finally {
              isApplyingRemoteUpdate = false;
            }
          }
        },
        (err) => {
          console.warn(`[Firestore onSnapshot Error] "${key}":`, err?.message || err);
        }
      );
      unsubscribers.push(unsubscribe);
    } catch (err) {
      console.warn(`[Firestore Subscribe Error] "${key}":`, err);
    }
  });

  return () => {
    unsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch (e) {}
    });
  };
};

/**
 * Retained for backwards compatibility with any remaining imports.
 * Delegates safely without destructive overwrites.
 */
export const seedInitialData = () => {
  // If localStorage already has masters, do not overwrite
  if (!localStorage.getItem(STORAGE_KEYS.MASTERS)) {
    setStoredItemLocalOnly(STORAGE_KEYS.MASTERS, INITIAL_MASTERS);
  }
};
