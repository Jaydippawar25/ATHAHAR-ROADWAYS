import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMasters, addMasterItem, updateMasterItem, deleteMasterItem } from '../services/masterService';
import {
  getAllInwards,
  getAllInwardItems,
  createInward,
  getPendingStockItems,
  deleteInward,
  deleteInwardItem,
  updateInwardHeader,
  updateInwardItem,
  updateFullInward,
} from '../services/inwardService';
import {
  getAllOutwards,
  getAllOutwardItems,
  createOutward,
  deleteOutward,
  deleteOutwardItem,
  updateOutwardHeader,
  updateOutwardItem,
  updateFullOutward,
} from '../services/outwardService';
import {
  getAllVouchers,
  createVoucher,
  updateVoucher,
  deleteVoucher,
} from '../services/accountingService';
import {
  getAllExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from '../services/expenseService';
import {
  safeInitializeData,
  subscribeToFirestore,
  pullAllFromFirestore,
  syncAllToFirestore,
  testFirestoreConnection,
  STORAGE_KEYS,
} from '../services/mockStorage';
import { STATUS } from '../utils/constants';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [masters, setMasters] = useState(getMasters());
  const [inwards, setInwards] = useState(getAllInwards());
  const [inwardItems, setInwardItems] = useState(getAllInwardItems());
  const [outwards, setOutwards] = useState(getAllOutwards());
  const [outwardItems, setOutwardItems] = useState(getAllOutwardItems());
  const [pendingStock, setPendingStock] = useState(getPendingStockItems());
  const [vouchers, setVouchers] = useState(getAllVouchers());
  const [expenses, setExpenses] = useState(getAllExpenses());

  // Cloud Sync Status Tracking
  const [syncStatus, setSyncStatus] = useState({
    state: 'connecting', // 'connecting' | 'connected' | 'syncing' | 'offline' | 'error'
    message: 'Connecting to Cloud Firestore...',
    lastSync: null,
    source: 'local',
  });

  const refreshData = () => {
    setMasters(getMasters());
    setInwards(getAllInwards());
    setInwardItems(getAllInwardItems());
    setOutwards(getAllOutwards());
    setOutwardItems(getAllOutwardItems());
    setPendingStock(getPendingStockItems());
    setVouchers(getAllVouchers());
    setExpenses(getAllExpenses());
  };

  // Safe Cloud Hydration and Real-Time Bidirectional Synchronization
  useEffect(() => {
    let unsubscribe = null;
    let isMounted = true;

    const initSync = async () => {
      try {
        setSyncStatus((prev) => ({
          ...prev,
          state: 'syncing',
          message: 'Checking Cloud Firestore...',
        }));

        const initResult = await safeInitializeData();
        if (!isMounted) return;

        if (initResult.success) {
          refreshData();
          setSyncStatus({
            state: 'connected',
            message: 'Cloud Sync Active',
            lastSync: new Date().toLocaleTimeString(),
            source: initResult.source,
          });
        } else {
          setSyncStatus({
            state: 'offline',
            message: 'Local Offline Mode',
            lastSync: new Date().toLocaleTimeString(),
            source: 'local',
            error: initResult.error,
          });
        }

        // Establish live onSnapshot subscription
        unsubscribe = subscribeToFirestore((updatedKey, newData) => {
          if (!isMounted) return;
          switch (updatedKey) {
            case STORAGE_KEYS.MASTERS:
              setMasters(newData);
              break;
            case STORAGE_KEYS.INWARDS:
              setInwards(newData);
              break;
            case STORAGE_KEYS.INWARD_ITEMS:
              setInwardItems(newData);
              setPendingStock((newData || []).filter((item) => item.status === STATUS.PENDING));
              break;
            case STORAGE_KEYS.OUTWARDS:
              setOutwards(newData);
              break;
            case STORAGE_KEYS.OUTWARD_ITEMS:
              setOutwardItems(newData);
              break;
            case STORAGE_KEYS.ACCOUNTING_VOUCHERS:
              setVouchers(newData);
              break;
            case STORAGE_KEYS.EXPENSES:
              setExpenses(newData);
              break;
            default:
              refreshData();
              break;
          }

          setSyncStatus((prev) => ({
            ...prev,
            state: 'connected',
            lastSync: new Date().toLocaleTimeString(),
          }));
        });
      } catch (err) {
        if (!isMounted) return;
        console.warn('Sync initialization warning:', err);
        setSyncStatus({
          state: 'offline',
          message: 'Local Offline Mode',
          lastSync: new Date().toLocaleTimeString(),
          source: 'local',
          error: err?.message || String(err),
        });
      }
    };

    initSync();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Manual Trigger to Pull All from Cloud Firestore
  const handlePullFromCloud = async () => {
    setSyncStatus((prev) => ({
      ...prev,
      state: 'syncing',
      message: 'Pulling records from Cloud Firestore...',
    }));
    const count = await pullAllFromFirestore();
    refreshData();
    setSyncStatus({
      state: 'connected',
      message: `Successfully pulled ${count} collections from Cloud Firestore!`,
      lastSync: new Date().toLocaleTimeString(),
      source: 'firestore',
    });
    return count;
  };

  // Manual Trigger to Push All to Cloud Firestore
  const handlePushToCloud = async () => {
    setSyncStatus((prev) => ({
      ...prev,
      state: 'syncing',
      message: 'Pushing local records to Cloud Firestore...',
    }));
    const count = await syncAllToFirestore();
    setSyncStatus({
      state: 'connected',
      message: `Successfully pushed ${count} collections to Cloud Firestore!`,
      lastSync: new Date().toLocaleTimeString(),
      source: 'localStorage',
    });
    return count;
  };

  const handleCreateInward = (headerData, lrItems, username) => {
    const res = createInward(headerData, lrItems, username);
    refreshData();
    return res;
  };

  const handleUpdateFullInward = (id, headerData, lrItems, username) => {
    const res = updateFullInward(id, headerData, lrItems, username);
    refreshData();
    return res;
  };

  const handleDeleteInward = (id) => {
    const res = deleteInward(id);
    refreshData();
    return res;
  };

  const handleDeleteInwardItem = (id) => {
    const res = deleteInwardItem(id);
    refreshData();
    return res;
  };

  const handleUpdateInwardHeader = (id, fields) => {
    const res = updateInwardHeader(id, fields);
    refreshData();
    return res;
  };

  const handleUpdateInwardItem = (id, fields) => {
    const res = updateInwardItem(id, fields);
    refreshData();
    return res;
  };

  const handleCreateOutward = (headerData, selectedPendingItems, username) => {
    const res = createOutward(headerData, selectedPendingItems, username);
    refreshData();
    return res;
  };

  const handleUpdateFullOutward = (id, headerData, selectedPendingItems, username) => {
    const res = updateFullOutward(id, headerData, selectedPendingItems, username);
    refreshData();
    return res;
  };

  const handleDeleteOutward = (id) => {
    const res = deleteOutward(id);
    refreshData();
    return res;
  };

  const handleDeleteOutwardItem = (id) => {
    const res = deleteOutwardItem(id);
    refreshData();
    return res;
  };

  const handleUpdateOutwardHeader = (id, fields) => {
    const res = updateOutwardHeader(id, fields);
    refreshData();
    return res;
  };

  const handleUpdateOutwardItem = (id, fields) => {
    const res = updateOutwardItem(id, fields);
    refreshData();
    return res;
  };

  const handleAddMaster = (category, item) => {
    const res = addMasterItem(category, item);
    refreshData();
    return res;
  };

  const handleUpdateMaster = (category, id, fields) => {
    const res = updateMasterItem(category, id, fields);
    refreshData();
    return res;
  };

  const handleDeleteMaster = (category, id) => {
    const res = deleteMasterItem(category, id);
    refreshData();
    return res;
  };

  const handleCreateVoucher = (voucherData, username) => {
    const res = createVoucher(voucherData, username);
    refreshData();
    return res;
  };

  const handleUpdateVoucher = (id, fields) => {
    const res = updateVoucher(id, fields);
    refreshData();
    return res;
  };

  const handleDeleteVoucher = (id) => {
    const res = deleteVoucher(id);
    refreshData();
    return res;
  };

  const handleCreateExpense = (expenseData, username) => {
    const res = createExpense(expenseData, username);
    refreshData();
    return res;
  };

  const handleUpdateExpense = (id, fields, username) => {
    const res = updateExpense(id, fields, username);
    refreshData();
    return res;
  };

  const handleDeleteExpense = (id) => {
    const res = deleteExpense(id);
    refreshData();
    return res;
  };

  return (
    <AppContext.Provider
      value={{
        masters,
        inwards,
        inwardItems,
        outwards,
        outwardItems,
        pendingStock,
        vouchers,
        expenses,
        syncStatus,
        refreshData,
        handlePullFromCloud,
        handlePushToCloud,
        testFirestoreConnection,
        handleCreateInward,
        handleUpdateFullInward,
        handleDeleteInward,
        handleDeleteInwardItem,
        handleUpdateInwardHeader,
        handleUpdateInwardItem,
        handleCreateOutward,
        handleUpdateFullOutward,
        handleDeleteOutward,
        handleDeleteOutwardItem,
        handleUpdateOutwardHeader,
        handleUpdateOutwardItem,
        handleAddMaster,
        handleUpdateMaster,
        handleDeleteMaster,
        handleCreateVoucher,
        handleUpdateVoucher,
        handleDeleteVoucher,
        handleCreateExpense,
        handleUpdateExpense,
        handleDeleteExpense,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
