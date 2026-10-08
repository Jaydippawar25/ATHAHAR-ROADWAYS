import { INITIAL_MASTERS, STATUS } from '../utils/constants';
import { db } from '../firebase/firebase';
import { doc, setDoc } from 'firebase/firestore';

const STORAGE_KEYS = {
  MASTERS: 'athahar_masters',
  INWARDS: 'athahar_inwards',
  INWARD_ITEMS: 'athahar_inward_items',
  OUTWARDS: 'athahar_outwards',
  OUTWARD_ITEMS: 'athahar_outward_items',
  AUDIT_LOGS: 'athahar_audit_logs',
};

// Sync item to Cloud Firestore asynchronously
export const syncToFirestore = async (key, val) => {
  try {
    if (!db) return;
    const docRef = doc(db, 'app_data', key);
    await setDoc(docRef, { data: val, updatedAt: new Date().toISOString() }, { merge: true });

    if (Array.isArray(val)) {
      for (let index = 0; index < val.length; index++) {
        const item = val[index];
        if (item && (item.id || item.lrNo)) {
          const itemDocId = String(item.id || item.lrNo || index);
          await setDoc(doc(db, key, itemDocId), { ...item, updatedAt: new Date().toISOString() }, { merge: true });
        }
      }
    } else if (typeof val === 'object' && val !== null) {
      await setDoc(doc(db, key, 'current'), { ...val, updatedAt: new Date().toISOString() }, { merge: true });
    }
  } catch (err) {
    console.error(`[Firestore Sync Error] Collection "${key}":`, err);
    throw err;
  }
};

// Bulk sync all local data to Cloud Firestore
export const syncAllToFirestore = async () => {
  const keys = Object.values(STORAGE_KEYS);
  let syncedCount = 0;
  for (const key of keys) {
    const data = getStoredItem(key);
    if (data) {
      await syncToFirestore(key, data);
      syncedCount++;
    }
  }
  return syncedCount;
};

// Test Firestore database connection
export const testFirestoreConnection = async () => {
  try {
    if (!db) throw new Error('Firestore instance is not initialized.');
    const testDoc = doc(db, '_connection_check', 'ping');
    await setDoc(testDoc, { ping: true, timestamp: new Date().toISOString() });
    return { success: true };
  } catch (err) {
    console.error('Firestore Healthcheck Failed:', err);
    return { success: false, error: err?.message || String(err) };
  }
};

// Seed default initial data if storage empty
export const seedInitialData = () => {
  if (!localStorage.getItem(STORAGE_KEYS.MASTERS)) {
    localStorage.setItem(STORAGE_KEYS.MASTERS, JSON.stringify(INITIAL_MASTERS));
    syncToFirestore(STORAGE_KEYS.MASTERS, INITIAL_MASTERS).catch(err => console.error('Seed Masters error:', err));
  }

  if (!localStorage.getItem(STORAGE_KEYS.INWARDS)) {
    // Seed dummy inward & pending items for instant interactive testing
    const sampleInward = {
      id: 'inw-9026',
      inwardNo: '9026',
      date: new Date().toISOString().split('T')[0],
      transporterName: 'LIMRA FREIGHT LOGISTICS',
      vehicleNo: 'MH-04-FK-1234',
      driverName: 'RAMESH KUMAR',
      ownerName: 'AHMED KHAN',
      from: 'SURAT',
      memoNo: 'MEM-8801',
      totalQty: 25,
      totalToPay: 4500,
      totalTbb: 1200,
      totalPaid: 500,
      createdAt: new Date().toISOString(),
      createdBy: 'Operator',
    };

    const sampleItems = [
      {
        id: 'item-101',
        inwardId: 'inw-9026',
        inwardNo: '9026',
        inwardDate: sampleInward.date,
        transporterName: sampleInward.transporterName,
        vehicleNo: sampleInward.vehicleNo,
        driverName: sampleInward.driverName,
        ownerName: sampleInward.ownerName,
        from: sampleInward.from,
        memoNo: sampleInward.memoNo,
        srNo: 1,
        lrNo: '174',
        date: sampleInward.date,
        pkg: 10,
        invoiceNo: 'INV-5541',
        ctTo: 'BHIWANDI HUB',
        consignorName: 'GLOBAL TEXTILES PVT LTD',
        consigneeName: 'BHIWANDI FASHION HUB',
        toPayAmount: 2000,
        tbbAmount: 500,
        paidAmount: 200,
        status: STATUS.PENDING,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'item-102',
        inwardId: 'inw-9026',
        inwardNo: '9026',
        inwardDate: sampleInward.date,
        transporterName: sampleInward.transporterName,
        vehicleNo: sampleInward.vehicleNo,
        driverName: sampleInward.driverName,
        ownerName: sampleInward.ownerName,
        from: sampleInward.from,
        memoNo: sampleInward.memoNo,
        srNo: 2,
        lrNo: '13941',
        date: sampleInward.date,
        pkg: 15,
        invoiceNo: 'INV-5542',
        ctTo: 'MUMBAI CENTRAL',
        consignorName: 'SUPER TRADERS',
        consigneeName: 'METRO RETAILS',
        toPayAmount: 2500,
        tbbAmount: 700,
        paidAmount: 300,
        status: STATUS.PENDING,
        createdAt: new Date().toISOString(),
      },
    ];

    localStorage.setItem(STORAGE_KEYS.INWARDS, JSON.stringify([sampleInward]));
    localStorage.setItem(STORAGE_KEYS.INWARD_ITEMS, JSON.stringify(sampleItems));
    localStorage.setItem(STORAGE_KEYS.OUTWARDS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.OUTWARD_ITEMS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify([]));

    syncToFirestore(STORAGE_KEYS.INWARDS, [sampleInward]).catch(() => {});
    syncToFirestore(STORAGE_KEYS.INWARD_ITEMS, sampleItems).catch(() => {});
    syncToFirestore(STORAGE_KEYS.OUTWARDS, []).catch(() => {});
    syncToFirestore(STORAGE_KEYS.OUTWARD_ITEMS, []).catch(() => {});
  } else {
    // Sync existing data to Firestore on app launch
    try {
      Object.values(STORAGE_KEYS).forEach((key) => {
        const item = getStoredItem(key);
        if (item) syncToFirestore(key, item).catch(err => console.error(`Auto-sync error on launch for ${key}:`, err));
      });
    } catch (e) {}
  }
};

export const getStoredItem = (key, defaultVal = []) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
};

export const setStoredItem = (key, val) => {
  localStorage.setItem(key, JSON.stringify(val));
  syncToFirestore(key, val).catch(err => console.error(`Sync error on setStoredItem for ${key}:`, err));
};

export { STORAGE_KEYS };
