import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
  clearAllExpenses,
} from '../services/expenseService';
import {
  safeInitializeData,
  subscribeToFirestore,
  pullAllFromFirestore,
  syncAllToFirestore,
  testFirestoreConnection,
  clearAllDatabaseData,
  STORAGE_KEYS,
} from '../services/mockStorage';
import { STATUS } from '../utils/constants';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [masters, setMasters] = useState(getMasters);
  const [inwards, setInwards] = useState(getAllInwards);
  const [inwardItems, setInwardItems] = useState(getAllInwardItems);
  const [outwards, setOutwards] = useState(getAllOutwards);
  const [outwardItems, setOutwardItems] = useState(getAllOutwardItems);
  const [pendingStock, setPendingStock] = useState(getPendingStockItems);
  const [vouchers, setVouchers] = useState(getAllVouchers);
  const [expenses, setExpenses] = useState(getAllExpenses);

  // Module revision counters for cache invalidation tracking
  const [dataVersions, setDataVersions] = useState({
    inwards: 1,
    outwards: 1,
    expenses: 1,
    masters: 1,
    vouchers: 1,
  });

  // Targeted Auto-Invalidation Functions (Eliminate blanket re-reading of unrelated modules)
  const invalidateInwardData = () => {
    setInwards(getAllInwards());
    setInwardItems(getAllInwardItems());
    setPendingStock(getPendingStockItems());
    setDataVersions((v) => ({ ...v, inwards: v.inwards + 1 }));
  };

  const invalidateOutwardData = () => {
    setOutwards(getAllOutwards());
    setOutwardItems(getAllOutwardItems());
    setInwardItems(getAllInwardItems());
    setPendingStock(getPendingStockItems());
    setDataVersions((v) => ({ ...v, outwards: v.outwards + 1 }));
  };

  const invalidateExpenseData = () => {
    setExpenses(getAllExpenses());
    setDataVersions((v) => ({ ...v, expenses: v.expenses + 1 }));
  };

  const invalidateMasterData = () => {
    setMasters(getMasters());
    setDataVersions((v) => ({ ...v, masters: v.masters + 1 }));
  };

  const invalidateVoucherData = () => {
    setVouchers(getAllVouchers());
    setDataVersions((v) => ({ ...v, vouchers: v.vouchers + 1 }));
  };

  const refreshData = () => {
    setMasters(getMasters());
    setInwards(getAllInwards());
    setInwardItems(getAllInwardItems());
    setOutwards(getAllOutwards());
    setOutwardItems(getAllOutwardItems());
    setPendingStock(getPendingStockItems());
    setVouchers(getAllVouchers());
    setExpenses(getAllExpenses());
    setDataVersions((v) => ({
      inwards: v.inwards + 1,
      outwards: v.outwards + 1,
      expenses: v.expenses + 1,
      masters: v.masters + 1,
      vouchers: v.vouchers + 1,
    }));
  };

  // Smart In-Memory Pre-Calculated Caches (Instant O(1) retrieval across page navigation)
  const cachedDashboardStats = useMemo(() => {
    const totalInwardCount = inwardItems.length;
    const totalInwardPackages = inwardItems.reduce((acc, curr) => acc + (Number(curr.pkg) || 0), 0);
    const totalPendingCount = pendingStock.length;
    const totalPendingPackages = pendingStock.reduce((acc, curr) => acc + (Number(curr.pkg) || 0), 0);
    const totalDispatchedCount = outwardItems.length;
    const totalDispatchedPackages = outwardItems.reduce((acc, curr) => acc + (Number(curr.pkg) || 0), 0);
    const totalToPayPending = pendingStock.reduce(
      (acc, curr) => acc + (Number(curr.toPayAmount) || 0),
      0
    );
    const pendingStockToPayCount = pendingStock.filter((i) => Number(i.toPayAmount) > 0).length;
    const dispatchRate =
      totalInwardCount > 0
        ? ((totalDispatchedCount / totalInwardCount) * 100).toFixed(1)
        : '0.0';

    return {
      totalInwardCount,
      totalInwardPackages,
      totalPendingCount,
      totalPendingPackages,
      totalDispatchedCount,
      totalDispatchedPackages,
      totalToPayPending,
      pendingStockToPayCount,
      dispatchRate,
    };
  }, [inwardItems, pendingStock, outwardItems]);

  const cachedPendingSummary = useMemo(() => {
    return {
      totalCount: pendingStock.length,
      totalPackages: pendingStock.reduce((acc, curr) => acc + (Number(curr.pkg) || 0), 0),
      totalToPay: pendingStock.reduce((acc, curr) => acc + (Number(curr.toPayAmount) || 0), 0),
      totalTbb: pendingStock.reduce((acc, curr) => acc + (Number(curr.tbbAmount) || 0), 0),
      totalPaid: pendingStock.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0),
    };
  }, [pendingStock]);

  const cachedExpenseSummary = useMemo(() => {
    const totalExpenses = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalCount = expenses.length;
    return { totalExpenses, totalCount };
  }, [expenses]);

  // Cloud Sync Status Tracking
  const [syncStatus, setSyncStatus] = useState({
    state: 'connecting', // 'connecting' | 'connected' | 'syncing' | 'offline' | 'error'
    message: 'Connecting to Cloud Firestore...',
    lastSync: null,
    source: 'local',
  });

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
              setDataVersions((v) => ({ ...v, masters: v.masters + 1 }));
              break;
            case STORAGE_KEYS.INWARDS:
              setInwards(newData);
              setDataVersions((v) => ({ ...v, inwards: v.inwards + 1 }));
              break;
            case STORAGE_KEYS.INWARD_ITEMS:
              setInwardItems(newData);
              setPendingStock((newData || []).filter((item) => item.status === STATUS.PENDING));
              setDataVersions((v) => ({ ...v, inwards: v.inwards + 1 }));
              break;
            case STORAGE_KEYS.OUTWARDS:
              setOutwards(newData);
              setDataVersions((v) => ({ ...v, outwards: v.outwards + 1 }));
              break;
            case STORAGE_KEYS.OUTWARD_ITEMS:
              setOutwardItems(newData);
              setDataVersions((v) => ({ ...v, outwards: v.outwards + 1 }));
              break;
            case STORAGE_KEYS.ACCOUNTING_VOUCHERS:
              setVouchers(newData);
              setDataVersions((v) => ({ ...v, vouchers: v.vouchers + 1 }));
              break;
            case STORAGE_KEYS.EXPENSES:
              setExpenses(newData);
              setDataVersions((v) => ({ ...v, expenses: v.expenses + 1 }));
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

  // Complete Database Wipe (Local + Cloud Firestore)
  const handleClearAllData = async () => {
    setSyncStatus((prev) => ({
      ...prev,
      state: 'syncing',
      message: 'Wiping all database records...',
    }));
    await clearAllDatabaseData();
    refreshData();
    setSyncStatus({
      state: 'connected',
      message: 'All records and Cloud Firestore data cleared!',
      lastSync: new Date().toLocaleTimeString(),
      source: 'cleared',
    });
    return { success: true };
  };

  const handleCreateInward = (headerData, lrItems, username) => {
    const res = createInward(headerData, lrItems, username);
    invalidateInwardData();
    return res;
  };

  const handleUpdateFullInward = (id, headerData, lrItems, username) => {
    const res = updateFullInward(id, headerData, lrItems, username);
    invalidateInwardData();
    return res;
  };

  const handleDeleteInward = (id) => {
    const res = deleteInward(id);
    invalidateInwardData();
    return res;
  };

  const handleDeleteInwardItem = (id) => {
    const res = deleteInwardItem(id);
    invalidateInwardData();
    return res;
  };

  const handleUpdateInwardHeader = (id, fields) => {
    const res = updateInwardHeader(id, fields);
    invalidateInwardData();
    return res;
  };

  const handleUpdateInwardItem = (id, fields) => {
    const res = updateInwardItem(id, fields);
    invalidateInwardData();
    return res;
  };

  const handleCreateOutward = (headerData, selectedPendingItems, username) => {
    const res = createOutward(headerData, selectedPendingItems, username);
    invalidateOutwardData();
    return res;
  };

  const handleUpdateFullOutward = (id, headerData, selectedPendingItems, username) => {
    const res = updateFullOutward(id, headerData, selectedPendingItems, username);
    invalidateOutwardData();
    return res;
  };

  const handleDeleteOutward = (id) => {
    const res = deleteOutward(id);
    invalidateOutwardData();
    return res;
  };

  const handleDeleteOutwardItem = (id) => {
    const res = deleteOutwardItem(id);
    invalidateOutwardData();
    return res;
  };

  const handleUpdateOutwardHeader = (id, fields) => {
    const res = updateOutwardHeader(id, fields);
    invalidateOutwardData();
    return res;
  };

  const handleUpdateOutwardItem = (id, fields) => {
    const res = updateOutwardItem(id, fields);
    invalidateOutwardData();
    return res;
  };

  const handleAddMaster = (category, item) => {
    const res = addMasterItem(category, item);
    invalidateMasterData();
    return res;
  };

  const handleUpdateMaster = (category, id, fields) => {
    const res = updateMasterItem(category, id, fields);
    invalidateMasterData();
    return res;
  };

  const handleDeleteMaster = (category, id) => {
    const res = deleteMasterItem(category, id);
    invalidateMasterData();
    return res;
  };

  const handleCreateVoucher = (voucherData, username) => {
    const res = createVoucher(voucherData, username);
    invalidateVoucherData();
    return res;
  };

  const handleUpdateVoucher = (id, fields) => {
    const res = updateVoucher(id, fields);
    invalidateVoucherData();
    return res;
  };

  const handleDeleteVoucher = (id) => {
    const res = deleteVoucher(id);
    invalidateVoucherData();
    return res;
  };

  const handleCreateExpense = (expenseData, username) => {
    const res = createExpense(expenseData, username);
    invalidateExpenseData();
    return res;
  };

  const handleUpdateExpense = (id, fields, username) => {
    const res = updateExpense(id, fields, username);
    invalidateExpenseData();
    return res;
  };

  const handleDeleteExpense = async (id) => {
    const res = await deleteExpense(id);
    invalidateExpenseData();
    return res;
  };

  const handleClearAllExpenses = async () => {
    const res = await clearAllExpenses();
    invalidateExpenseData();
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
        dataVersions,
        cachedDashboardStats,
        cachedPendingSummary,
        cachedExpenseSummary,
        syncStatus,
        refreshData,
        invalidateInwardData,
        invalidateOutwardData,
        invalidateExpenseData,
        invalidateMasterData,
        invalidateVoucherData,
        handlePullFromCloud,
        handlePushToCloud,
        handleClearAllData,
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
        handleClearAllExpenses,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
