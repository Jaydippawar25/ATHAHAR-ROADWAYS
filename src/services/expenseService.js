import { getStoredItem, setStoredItem, STORAGE_KEYS } from './mockStorage';
import { db } from '../firebase/firebase';
import { doc, deleteDoc, setDoc, collection, getDocs } from 'firebase/firestore';

export const EXPENSE_CATEGORIES = [
  'Diesel / Fuel Expense',
  'Vehicle Maintenance',
  'Toll and Road Charges',
  'Driver and Helper Expenses',
  'Loading Expense',
  'Unloading Expense',
  'Other Expenses',
];

export const PAYMENT_MODES = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'];

export const getAllExpenses = () => {
  const stored = getStoredItem(STORAGE_KEYS.EXPENSES, []);
  if (!Array.isArray(stored)) {
    return [];
  }
  // Auto-migrate any existing 'Loading and Unloading' entries and ensure valid unique ID
  return stored.map((item, idx) => {
    let category = item.category;
    if (category === 'Loading and Unloading') {
      const isUnload = String(item.notes || '').toLowerCase().includes('unload');
      category = isUnload ? 'Unloading Expense' : 'Loading Expense';
    }
    const resolvedId = item.id || item.voucherNo || `exp-${idx}-${Date.now()}`;
    return {
      ...item,
      id: resolvedId,
      category,
    };
  });
};

export const getNextExpenseVoucherNo = (expensesList) => {
  const list = expensesList || getAllExpenses();
  const serialNums = list
    .map((item) => {
      const match = String(item.voucherNo ?? '').match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : NaN;
    })
    .filter((num) => !isNaN(num) && num > 0);
  const nextNum = serialNums.length > 0 ? Math.max(...serialNums) + 1 : 1;
  return `EXP-${String(nextNum).padStart(2, '0')}`;
};

export const createExpense = (expenseData, currentUser = 'Operator') => {
  if (!expenseData.amount || Number(expenseData.amount) <= 0) {
    throw new Error('Please enter a valid expense amount greater than 0.');
  }

  const expenses = getAllExpenses();
  const voucherNo = expenseData.voucherNo?.trim() || getNextExpenseVoucherNo(expenses);

  const newExpense = {
    id: `exp-${Date.now()}`,
    voucherNo,
    date: expenseData.date || new Date().toISOString().split('T')[0],
    category: expenseData.category || EXPENSE_CATEGORIES[0],
    amount: Number(expenseData.amount),
    vehicleNo: (expenseData.vehicleNo || '').trim().toUpperCase(),
    payeeName: (expenseData.payeeName || '').trim(),
    paymentMode: expenseData.paymentMode || 'CASH',
    referenceNo: (expenseData.referenceNo || '').trim(),
    notes: (expenseData.notes || '').trim(),
    createdAt: new Date().toISOString(),
    createdBy: currentUser,
  };

  const updated = [newExpense, ...expenses];
  setStoredItem(STORAGE_KEYS.EXPENSES, updated);
  return newExpense;
};

export const updateExpense = (id, fields, currentUser = 'Operator') => {
  const expenses = getAllExpenses();
  const index = expenses.findIndex((e) => String(e.id) === String(id) || String(e.voucherNo) === String(id));
  if (index === -1) {
    throw new Error(`Expense record not found: ${id}`);
  }

  const updatedItem = {
    ...expenses[index],
    ...fields,
    amount: fields.amount !== undefined ? Number(fields.amount) : expenses[index].amount,
    vehicleNo: fields.vehicleNo !== undefined ? String(fields.vehicleNo).trim().toUpperCase() : expenses[index].vehicleNo,
    payeeName: fields.payeeName !== undefined ? String(fields.payeeName).trim() : expenses[index].payeeName,
    referenceNo: fields.referenceNo !== undefined ? String(fields.referenceNo).trim() : expenses[index].referenceNo,
    notes: fields.notes !== undefined ? String(fields.notes).trim() : expenses[index].notes,
    updatedAt: new Date().toISOString(),
    updatedBy: currentUser,
  };

  expenses[index] = updatedItem;
  setStoredItem(STORAGE_KEYS.EXPENSES, expenses);
  return updatedItem;
};

export const deleteExpense = async (id) => {
  const expenses = getAllExpenses();
  const target = expenses.find(
    (e, idx) =>
      String(e.id) === String(id) ||
      String(e.voucherNo) === String(id) ||
      String(idx) === String(id)
  );

  const targetId = target?.id || id;
  const targetVoucherNo = target?.voucherNo;

  const filtered = expenses.filter(
    (e, idx) =>
      String(e.id) !== String(targetId) &&
      String(e.voucherNo) !== String(targetId) &&
      (!targetVoucherNo || String(e.voucherNo) !== String(targetVoucherNo)) &&
      String(idx) !== String(id)
  );

  setStoredItem(STORAGE_KEYS.EXPENSES, filtered);

  if (db) {
    try {
      if (targetId) {
        await deleteDoc(doc(db, STORAGE_KEYS.EXPENSES, String(targetId)));
      }
      if (targetVoucherNo && targetVoucherNo !== targetId) {
        await deleteDoc(doc(db, STORAGE_KEYS.EXPENSES, String(targetVoucherNo)));
      }
      await setDoc(doc(db, 'app_data', STORAGE_KEYS.EXPENSES), {
        data: filtered,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('[Firestore Delete Expense Warning]:', e);
    }
  }

  return true;
};

export const clearAllExpenses = async () => {
  setStoredItem(STORAGE_KEYS.EXPENSES, []);
  if (db) {
    try {
      await setDoc(doc(db, 'app_data', STORAGE_KEYS.EXPENSES), {
        data: [],
        updatedAt: new Date().toISOString(),
      });
      const colRef = collection(db, STORAGE_KEYS.EXPENSES);
      const snap = await getDocs(colRef);
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (e) {
      console.warn('[Firestore Clear All Expenses Warning]:', e);
    }
  }
  return true;
};
