import { getStoredItem, setStoredItem, STORAGE_KEYS } from './mockStorage';

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

const INITIAL_SAMPLE_EXPENSES = [
  {
    id: 'exp-101',
    voucherNo: 'EXP-01',
    date: new Date().toISOString().split('T')[0],
    category: 'Diesel / Fuel Expense',
    amount: 4500,
    vehicleNo: 'MH-10-CR-1122',
    payeeName: 'Bharat Petroleum Sangli',
    paymentMode: 'UPI',
    referenceNo: 'BPCL-9921',
    notes: '50 Litres Diesel for Sangli to Mumbai dispatch',
    createdAt: new Date().toISOString(),
    createdBy: 'Administrator',
  },
  {
    id: 'exp-102',
    voucherNo: 'EXP-02',
    date: new Date().toISOString().split('T')[0],
    category: 'Vehicle Maintenance',
    amount: 1800,
    vehicleNo: 'MH-10-CR-1122',
    payeeName: 'National Auto Garage',
    paymentMode: 'CASH',
    referenceNo: 'BILL-402',
    notes: 'Oil filter replacement and brake checkup',
    createdAt: new Date().toISOString(),
    createdBy: 'Administrator',
  },
  {
    id: 'exp-103',
    voucherNo: 'EXP-03',
    date: new Date().toISOString().split('T')[0],
    category: 'Toll and Road Charges',
    amount: 750,
    vehicleNo: 'MH-10-CR-1122',
    payeeName: 'Fastag NH4',
    paymentMode: 'BANK_TRANSFER',
    referenceNo: 'FT-8831',
    notes: 'Karad & Satara Toll Plaza charges',
    createdAt: new Date().toISOString(),
    createdBy: 'Administrator',
  },
  {
    id: 'exp-104',
    voucherNo: 'EXP-04',
    date: new Date().toISOString().split('T')[0],
    category: 'Driver and Helper Expenses',
    amount: 1200,
    vehicleNo: 'MH-10-CR-1122',
    payeeName: 'Ramesh Shinde (Driver)',
    paymentMode: 'CASH',
    referenceNo: '',
    notes: 'Food allowance and trip advance for driver',
    createdAt: new Date().toISOString(),
    createdBy: 'Administrator',
  },
  {
    id: 'exp-105',
    voucherNo: 'EXP-05',
    date: new Date().toISOString().split('T')[0],
    category: 'Loading Expense',
    amount: 650,
    vehicleNo: 'MH-10-CR-1122',
    payeeName: 'Sangli Mathadi Hamali Union',
    paymentMode: 'CASH',
    referenceNo: '',
    notes: 'Loading 40 packages for outward dispatch vehicle',
    createdAt: new Date().toISOString(),
    createdBy: 'Administrator',
  },
  {
    id: 'exp-106',
    voucherNo: 'EXP-06',
    date: new Date().toISOString().split('T')[0],
    category: 'Unloading Expense',
    amount: 950,
    vehicleNo: '',
    payeeName: 'Sangli Mathadi Hamali Union',
    paymentMode: 'CASH',
    referenceNo: '',
    notes: 'Godown unloading 35 packages from Kolhapur inward',
    createdAt: new Date().toISOString(),
    createdBy: 'Administrator',
  },
];

export const getAllExpenses = () => {
  const stored = getStoredItem(STORAGE_KEYS.EXPENSES);
  if (!stored || !Array.isArray(stored) || stored.length === 0) {
    setStoredItem(STORAGE_KEYS.EXPENSES, INITIAL_SAMPLE_EXPENSES);
    return INITIAL_SAMPLE_EXPENSES;
  }
  // Auto-migrate any existing 'Loading and Unloading' entries
  return stored.map((item) => {
    if (item.category === 'Loading and Unloading') {
      const isUnload = String(item.notes || '').toLowerCase().includes('unload');
      return {
        ...item,
        category: isUnload ? 'Unloading Expense' : 'Loading Expense',
      };
    }
    return item;
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
  const index = expenses.findIndex((e) => e.id === id);
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

export const deleteExpense = (id) => {
  const expenses = getAllExpenses();
  const filtered = expenses.filter((e) => e.id !== id);
  setStoredItem(STORAGE_KEYS.EXPENSES, filtered);
  return true;
};
