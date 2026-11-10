import { getStoredItem, setStoredItem, STORAGE_KEYS } from './mockStorage';

export const EXPENSE_CATEGORIES = [
  'Fuel / Diesel',
  'Hamali / Labour',
  'Driver Advance',
  'Vehicle Maintenance & Repairs',
  'Toll & RTO Charges',
  'Office / Godown Rent',
  'Tea & Refreshments',
  'Stationery & Printing',
  'Salary & Wages',
  'Miscellaneous Expense',
];

export const INCOME_CATEGORIES = [
  'Freight Collection (To Pay)',
  'Freight Advance (Paid)',
  'T.B.B. Party Settlement',
  'Demurrage / Hamali Income',
  'Miscellaneous Income',
];

export const PAYMENT_MODES = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'];


export const getAllVouchers = () => {
  const stored = getStoredItem(STORAGE_KEYS.ACCOUNTING_VOUCHERS, []);
  return Array.isArray(stored) ? stored : [];
};

export const getNextVoucherNo = (vouchersList) => {
  const list = vouchersList || getAllVouchers();
  const serialNums = list
    .map((v) => {
      const match = String(v.voucherNo ?? '').match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : NaN;
    })
    .filter((num) => !isNaN(num) && num > 0);
  const nextNum = serialNums.length > 0 ? Math.max(...serialNums) + 1 : 1;
  return `VCH-${String(nextNum).padStart(2, '0')}`;
};

export const createVoucher = (voucherData, currentUser = 'Operator') => {
  if (!voucherData.amount || Number(voucherData.amount) <= 0) {
    throw new Error('Please enter a valid amount greater than 0.');
  }

  const vouchers = getAllVouchers();
  const newVoucher = {
    id: `vch-${Date.now()}`,
    voucherNo: voucherData.voucherNo || getNextVoucherNo(vouchers),
    date: voucherData.date || new Date().toISOString().split('T')[0],
    type: voucherData.type || 'EXPENSE',
    category: voucherData.category || 'Miscellaneous Expense',
    partyName: voucherData.partyName || '-',
    vehicleNo: voucherData.vehicleNo || '',
    lrNo: voucherData.lrNo || '',
    amount: Number(voucherData.amount) || 0,
    paymentMode: voucherData.paymentMode || 'CASH',
    referenceNo: voucherData.referenceNo || '',
    notes: voucherData.notes || '',
    createdAt: new Date().toISOString(),
    createdBy: currentUser,
  };

  const updated = [newVoucher, ...vouchers];
  setStoredItem(STORAGE_KEYS.ACCOUNTING_VOUCHERS, updated);
  return newVoucher;
};

export const updateVoucher = (id, fields) => {
  const vouchers = getAllVouchers();
  const updated = vouchers.map((v) => {
    if (v.id === id) {
      return {
        ...v,
        ...fields,
        amount: fields.amount !== undefined ? Number(fields.amount) || 0 : v.amount,
        updatedAt: new Date().toISOString(),
      };
    }
    return v;
  });
  setStoredItem(STORAGE_KEYS.ACCOUNTING_VOUCHERS, updated);
  return updated.find((v) => v.id === id);
};

export const deleteVoucher = (id) => {
  const vouchers = getAllVouchers();
  const filtered = vouchers.filter((v) => v.id !== id);
  setStoredItem(STORAGE_KEYS.ACCOUNTING_VOUCHERS, filtered);
  return true;
};
