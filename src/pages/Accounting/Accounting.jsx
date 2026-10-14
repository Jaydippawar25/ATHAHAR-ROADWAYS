import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Printer,
  FileSpreadsheet,
  FileText,
  Pencil,
  Trash2,
  Eye,
  AlertTriangle,
  Receipt,
  Layers,
  Building2,
  Truck,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { exportToExcel, exportToPDF, printRecordDetails } from '../../services/exportService';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_MODES,
  getNextVoucherNo,
} from '../../services/accountingService';
import { formatDate } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/numberUtils';

export const Accounting = () => {
  const { user } = useAuth();
  const {
    inwardItems,
    outwardItems,
    pendingStock,
    vouchers = [],
    masters,
    handleCreateVoucher,
    handleUpdateVoucher,
    handleDeleteVoucher,
  } = useApp();

  // Active Tab: 'cash_book' | 'expenses' | 'topay_ledger' | 'tbb_ledger' | 'party_ledger'
  const [activeTab, setActiveTab] = useState('cash_book');

  // Date Range Filter: 'all' | 'today' | 'week' | 'month'
  const [dateFilter, setDateFilter] = useState('all');

  // Voucher Form Modal State
  const [voucherModal, setVoucherModal] = useState({
    isOpen: false,
    mode: 'create', // 'create' | 'edit'
    id: null,
  });

  const [voucherForm, setVoucherForm] = useState({
    voucherNo: '',
    date: new Date().toISOString().split('T')[0],
    type: 'EXPENSE',
    category: EXPENSE_CATEGORIES[0],
    partyName: '',
    vehicleNo: '',
    lrNo: '',
    amount: '',
    paymentMode: 'CASH',
    referenceNo: '',
    notes: '',
  });

  // View & Delete Modal States
  const [viewingVoucher, setViewingVoucher] = useState(null);
  const [deleteVoucherTarget, setDeleteVoucherTarget] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filter helper for date
  const isDateInFilter = (dateStr) => {
    if (!dateStr || dateFilter === 'all') return true;
    const d = new Date(dateStr);
    const now = new Date();
    if (isNaN(d.getTime())) return true;

    if (dateFilter === 'today') {
      return d.toDateString() === now.toDateString();
    }
    if (dateFilter === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return d >= oneWeekAgo && d <= now;
    }
    if (dateFilter === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    return true;
  };

  // Financial Calculations
  const financialSummary = useMemo(() => {
    // 1. Total Freight Billed across all Inward LRs
    const totalToPayBilled = inwardItems.reduce((acc, curr) => acc + (Number(curr.toPayAmount) || 0), 0);
    const totalTbbBilled = inwardItems.reduce((acc, curr) => acc + (Number(curr.tbbAmount) || 0), 0);
    const totalPaidBilled = inwardItems.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0);
    const totalBilled = totalToPayBilled + totalTbbBilled + totalPaidBilled;

    // 2. To-Pay Collected: delivered LRs that were To-Pay
    const toPayCollected = outwardItems.reduce((acc, curr) => acc + (Number(curr.toPayAmount) || 0), 0);
    // To-Pay Pending: undelivered stock in godown
    const toPayPending = pendingStock.reduce((acc, curr) => acc + (Number(curr.toPayAmount) || 0), 0);

    // 3. Paid Freight upfront collected at booking
    const paidCollected = totalPaidBilled;

    // 4. Voucher Incomes & Expenses
    const voucherExpenses = vouchers
      .filter((v) => v.type === 'EXPENSE')
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    const voucherDirectIncome = vouchers
      .filter((v) => v.type === 'INCOME')
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    // Total Cash Inflow = Paid freight + To-Pay freight collected on delivery + Direct voucher incomes
    const totalCashInflow = paidCollected + toPayCollected + voucherDirectIncome;

    // Total Cash Outflow = Operational expenses recorded via vouchers
    const totalCashOutflow = voucherExpenses;

    // Net Cash Balance / Profit
    const netCashBalance = totalCashInflow - totalCashOutflow;

    // Total Outstanding Receivables = Pending To-Pay + Unsettled T.B.B.
    const totalReceivables = toPayPending + totalTbbBilled;

    return {
      totalBilled,
      totalToPayBilled,
      totalTbbBilled,
      totalPaidBilled,
      toPayCollected,
      toPayPending,
      paidCollected,
      voucherExpenses,
      voucherDirectIncome,
      totalCashInflow,
      totalCashOutflow,
      netCashBalance,
      totalReceivables,
    };
  }, [inwardItems, outwardItems, pendingStock, vouchers]);

  // Combined Cash Book Register (Incomes from deliveries/paid freight + vouchers)
  const cashBookEntries = useMemo(() => {
    const list = [];

    // Add Paid Freight transactions
    inwardItems.forEach((item) => {
      if (Number(item.paidAmount) > 0 && isDateInFilter(item.inwardDate || item.date)) {
        list.push({
          id: `inw-paid-${item.id || item.lrNo}`,
          date: item.inwardDate || item.date,
          type: 'INCOME',
          category: 'Paid Freight Collection',
          refNo: item.lrNo || '-',
          lrNo: item.lrNo || '-',
          partyName: item.consignorName || item.consigneeName || 'Cash Party',
          amount: Number(item.paidAmount) || 0,
          paymentMode: 'CASH',
          notes: `Booking upfront freight collection for LR #${item.lrNo}`,
        });
      }
    });

    // Add Delivered To-Pay Freight collections
    outwardItems.forEach((item) => {
      if (Number(item.toPayAmount) > 0 && isDateInFilter(item.outwardDate || item.date)) {
        list.push({
          id: `out-topay-${item.id || item.lrNo}`,
          date: item.outwardDate || item.date,
          type: 'INCOME',
          category: 'To-Pay Freight Collection',
          refNo: item.lrNo || '-',
          lrNo: item.lrNo || '-',
          partyName: item.consigneeName || 'Consignee',
          amount: Number(item.toPayAmount) || 0,
          paymentMode: 'CASH',
          notes: `Delivery collection from consignee on Outward #${item.outwardNo || '-'}`,
        });
      }
    });

    // Add Vouchers (Expenses & Direct Incomes)
    vouchers.forEach((vch) => {
      if (isDateInFilter(vch.date)) {
        list.push({
          id: vch.id,
          date: vch.date,
          type: vch.type,
          category: vch.category,
          refNo: vch.lrNo || vch.voucherNo,
          lrNo: vch.lrNo || vch.voucherNo,
          partyName: vch.partyName,
          amount: Number(vch.amount) || 0,
          paymentMode: vch.paymentMode,
          notes: vch.notes || vch.referenceNo || '-',
          isVoucher: true,
          rawVoucher: vch,
        });
      }
    });

    // Sort chronologically descending
    list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    return list;
  }, [inwardItems, outwardItems, vouchers, dateFilter]);

  // To-Pay Ledger Items
  const toPayLedger = useMemo(() => {
    return inwardItems
      .filter((item) => Number(item.toPayAmount) > 0 && isDateInFilter(item.date))
      .map((item) => {
        const isDelivered = outwardItems.some((out) => out.lrNo === item.lrNo);
        return {
          ...item,
          collectionStatus: isDelivered ? 'COLLECTED' : 'PENDING IN GODOWN',
        };
      });
  }, [inwardItems, outwardItems, dateFilter]);

  // T.B.B. Ledger Items
  const tbbLedger = useMemo(() => {
    return inwardItems
      .filter((item) => Number(item.tbbAmount) > 0 && isDateInFilter(item.date))
      .map((item) => ({
        ...item,
        billingParty: item.consignorName || item.consigneeName || 'Credit Account',
      }));
  }, [inwardItems, dateFilter]);

  // Party-wise Summary Ledger
  const partyLedger = useMemo(() => {
    const partyMap = new Map();

    inwardItems.forEach((item) => {
      const parties = [item.consignorName, item.consigneeName].filter(Boolean);
      parties.forEach((name) => {
        const key = name.trim().toUpperCase();
        if (!partyMap.has(key)) {
          partyMap.set(key, {
            partyName: key,
            totalLRs: 0,
            totalPkg: 0,
            toPayFreight: 0,
            tbbFreight: 0,
            paidFreight: 0,
            totalFreight: 0,
          });
        }
        const record = partyMap.get(key);
        record.totalLRs += 1;
        record.totalPkg += Number(item.pkg) || 0;
        record.toPayFreight += Number(item.toPayAmount) || 0;
        record.tbbFreight += Number(item.tbbAmount) || 0;
        record.paidFreight += Number(item.paidAmount) || 0;
        record.totalFreight = record.toPayFreight + record.tbbFreight + record.paidFreight;
      });
    });

    return Array.from(partyMap.values()).sort((a, b) => b.totalFreight - a.totalFreight);
  }, [inwardItems]);

  // Filtered Expense Vouchers
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => isDateInFilter(v.date));
  }, [vouchers, dateFilter]);

  // Open Create Voucher Modal
  const handleOpenCreateVoucher = (type = 'EXPENSE') => {
    const nextNo = getNextVoucherNo(vouchers);
    setVoucherForm({
      voucherNo: nextNo,
      date: new Date().toISOString().split('T')[0],
      type,
      category: type === 'EXPENSE' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0],
      partyName: '',
      vehicleNo: masters?.vehicles[0]?.vehicleNo || '',
      lrNo: '',
      amount: '',
      paymentMode: 'CASH',
      referenceNo: '',
      notes: '',
    });
    setVoucherModal({ isOpen: true, mode: 'create', id: null });
    setError('');
  };

  // Open Edit Voucher Modal
  const handleOpenEditVoucher = (vch) => {
    setVoucherForm({
      voucherNo: vch.voucherNo,
      date: vch.date,
      type: vch.type,
      category: vch.category,
      partyName: vch.partyName,
      vehicleNo: vch.vehicleNo || '',
      lrNo: vch.lrNo || '',
      amount: vch.amount,
      paymentMode: vch.paymentMode,
      referenceNo: vch.referenceNo || '',
      notes: vch.notes || '',
    });
    setVoucherModal({ isOpen: true, mode: 'edit', id: vch.id });
    setError('');
  };

  // Save Voucher Form
  const handleSaveVoucher = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!voucherForm.amount || Number(voucherForm.amount) <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    try {
      if (voucherModal.mode === 'create') {
        handleCreateVoucher(voucherForm, user?.name || 'Operator');
        setSuccess(`Voucher #${voucherForm.voucherNo} created successfully!`);
      } else {
        handleUpdateVoucher(voucherModal.id, voucherForm);
        setSuccess(`Voucher #${voucherForm.voucherNo} updated successfully!`);
      }
      setVoucherModal({ isOpen: false, mode: 'create', id: null });
    } catch (err) {
      setError(err.message || 'Failed to save voucher.');
    }
  };

  // Confirm Delete Voucher
  const handleConfirmDeleteVoucher = () => {
    if (deleteVoucherTarget) {
      handleDeleteVoucher(deleteVoucherTarget.id);
      setDeleteVoucherTarget(null);
      setSuccess('Voucher deleted successfully.');
    }
  };

  // Print Voucher Details
  const handlePrintVoucher = (vch) => {
    printRecordDetails({
      title: `${vch.type === 'EXPENSE' ? 'Expense Payment Voucher' : 'Receipt Voucher'} #${vch.voucherNo}`,
      fields: [
        { label: 'Voucher No.', value: vch.voucherNo },
        { label: 'Date', value: formatDate(vch.date) },
        { label: 'Voucher Type', value: vch.type },
        { label: 'Category', value: vch.category },
        { label: vch.type === 'EXPENSE' ? 'Paid To' : 'Received From', value: vch.partyName || '-' },
        { label: 'Vehicle No.', value: vch.vehicleNo || '-' },
        { label: 'Related LR No.', value: vch.lrNo || '-' },
        { label: 'Payment Mode', value: vch.paymentMode },
        { label: 'Ref / Cheque No.', value: vch.referenceNo || '-' },
        { label: 'Amount', value: formatCurrency(vch.amount) },
        { label: 'Remarks / Notes', value: vch.notes || '-' },
      ],
    });
  };

  // Table Column Definitions
  const cashBookColumns = [
    { label: 'Date', key: 'date', type: 'date' },
    {
      label: 'Type',
      key: 'type',
      render: (row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-black ${
            row.type === 'INCOME'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-rose-100 text-rose-800 border border-rose-300'
          }`}
        >
          {row.type === 'INCOME' ? (
            <ArrowDownLeft className="w-3 h-3 mr-1 text-emerald-600" />
          ) : (
            <ArrowUpRight className="w-3 h-3 mr-1 text-rose-600" />
          )}
          {row.type}
        </span>
      ),
    },
    {
      label: 'LR No.',
      key: 'lrNo',
      render: (row) => <span className="font-extrabold text-slate-900">{row.lrNo || row.refNo || '-'}</span>,
    },
    { label: 'Category', key: 'category' },
    { label: 'Party / Description', key: 'partyName' },
    {
      label: 'Payment Mode',
      key: 'paymentMode',
      render: (row) => (
        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-700">
          {row.paymentMode}
        </span>
      ),
    },
    {
      label: 'Amount (₹)',
      key: 'amount',
      render: (row) => (
        <span
          className={`font-black text-xs ${
            row.type === 'INCOME' ? 'text-emerald-700' : 'text-rose-700'
          }`}
        >
          {row.type === 'INCOME' ? '+ ' : '- '}
          {formatCurrency(row.amount)}
        </span>
      ),
    },
  ];

  const voucherColumns = [
    {
      label: 'Voucher No.',
      key: 'voucherNo',
      render: (row) => <span className="font-black text-sky-800">{row.voucherNo}</span>,
    },
    { label: 'Date', key: 'date', type: 'date' },
    {
      label: 'Category',
      key: 'category',
      render: (row) => <span className="font-bold text-slate-800">{row.category}</span>,
    },
    { label: 'Paid To', key: 'partyName' },
    { label: 'Vehicle No.', key: 'vehicleNo', render: (row) => row.vehicleNo || '-' },
    {
      label: 'Mode',
      key: 'paymentMode',
      render: (row) => (
        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-700">
          {row.paymentMode}
        </span>
      ),
    },
    {
      label: 'Amount',
      key: 'amount',
      render: (row) => <span className="font-black text-rose-700">{formatCurrency(row.amount)}</span>,
    },
    {
      label: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex items-center justify-center space-x-1">
          <button
            onClick={() => handlePrintVoucher(row)}
            className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
            title="Print Voucher"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setViewingVoucher(row);
            }}
            className="p-1 text-sky-600 hover:bg-sky-50 rounded transition-colors cursor-pointer"
            title="View Voucher"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleOpenEditVoucher(row)}
            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
            title="Edit Voucher"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDeleteVoucherTarget(row)}
            className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
            title="Delete Voucher"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const toPayColumns = [
    {
      label: 'LR No.',
      key: 'lrNo',
      render: (row) => <span className="font-extrabold text-sky-800">{row.lrNo}</span>,
    },
    { label: 'Date', key: 'date', type: 'date' },
    { label: 'Consigner', key: 'consignorName' },
    { label: 'Consignee', key: 'consigneeName' },
    { label: 'CT To', key: 'ctTo' },
    { label: 'PKG', key: 'pkg' },
    {
      label: 'To Pay Amount',
      key: 'toPayAmount',
      render: (row) => <span className="font-black text-amber-700">{formatCurrency(row.toPayAmount)}</span>,
    },
    {
      label: 'Collection Status',
      key: 'collectionStatus',
      render: (row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
            row.collectionStatus === 'COLLECTED'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-amber-100 text-amber-800 border border-amber-300'
          }`}
        >
          {row.collectionStatus}
        </span>
      ),
    },
  ];

  const tbbColumns = [
    {
      label: 'LR No.',
      key: 'lrNo',
      render: (row) => <span className="font-extrabold text-sky-800">{row.lrNo}</span>,
    },
    { label: 'Date', key: 'date', type: 'date' },
    { label: 'Billing Party', key: 'billingParty' },
    { label: 'CT To', key: 'ctTo' },
    { label: 'PKG', key: 'pkg' },
    {
      label: 'T.B.B Freight',
      key: 'tbbAmount',
      render: (row) => <span className="font-black text-sky-700">{formatCurrency(row.tbbAmount)}</span>,
    },
    {
      label: 'Billing Status',
      key: 'status',
      render: () => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
          TO BE BILLED
        </span>
      ),
    },
  ];

  const partyColumns = [
    {
      label: 'Party Name',
      key: 'partyName',
      render: (row) => <span className="font-black text-slate-900">{row.partyName}</span>,
    },
    { label: 'Total LRs', key: 'totalLRs' },
    { label: 'Total Packages', key: 'totalPkg' },
    {
      label: 'To Pay Freight',
      key: 'toPayFreight',
      render: (row) => formatCurrency(row.toPayFreight),
    },
    {
      label: 'T.B.B Freight',
      key: 'tbbFreight',
      render: (row) => formatCurrency(row.tbbFreight),
    },
    {
      label: 'Paid Freight',
      key: 'paidFreight',
      render: (row) => formatCurrency(row.paidFreight),
    },
    {
      label: 'Total Freight Billed',
      key: 'totalFreight',
      render: (row) => (
        <span className="font-black text-indigo-700">{formatCurrency(row.totalFreight)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-slate-800 max-w-full">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2 text-[11px] font-bold tracking-wider uppercase">
            <span className="bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 backdrop-blur-xs flex items-center">
              <Wallet className="w-3.5 h-3.5 mr-1" />
              FINANCIAL ACCOUNTS & CASH BOOK
            </span>
            <span className="text-slate-400">&bull; ATHAHAR ROADWAYS SANGLI</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center space-x-3">
            <span>Transport Accounting & Ledger</span>
          </h2>

          <p className="text-slate-300 text-xs sm:text-sm font-medium">
            Complete financial tracking of freight collections, To-Pay / TBB party accounts, cash book, and operational expense vouchers
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => handleOpenCreateVoucher('EXPENSE')}
            className="inline-flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Expense Voucher</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenCreateVoucher('INCOME')}
            className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Record Income / Receipt</span>
          </button>
        </div>
      </div>

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Billed Freight */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Freight Billed</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xl font-black text-slate-900">{formatCurrency(financialSummary.totalBilled)}</p>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Across All Booked LRs</p>
        </div>

        {/* Collected Freight Income */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Cash Inflow</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-700">{formatCurrency(financialSummary.totalCashInflow)}</p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            Paid + Delivered To-Pay
          </p>
        </div>

        {/* Total Operational Expenses */}
        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-2xs">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Expenses</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-xl font-black text-rose-700">{formatCurrency(financialSummary.totalCashOutflow)}</p>
          <p className="text-[11px] text-rose-600 font-semibold mt-0.5">Fuel, Hamali, Driver, Toll</p>
        </div>

        {/* Net Cash Balance / Profit */}
        <div className="bg-white p-4 rounded-xl border border-sky-200 shadow-2xs">
          <div className="flex items-center justify-between text-sky-700 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Net Cash in Hand</span>
            <Wallet className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-xl font-black text-sky-800">{formatCurrency(financialSummary.netCashBalance)}</p>
          <p className="text-[11px] text-sky-600 font-semibold mt-0.5">Inflow minus Outflow</p>
        </div>

        {/* Total Outstanding Receivables */}
        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Outstanding</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-black text-amber-700">{formatCurrency(financialSummary.totalReceivables)}</p>
          <p className="text-[11px] text-amber-600 font-semibold mt-0.5">
            Godown To-Pay + T.B.B.
          </p>
        </div>
      </div>

      {/* Date Filter & Tab Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          {/* Main Accounting Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('cash_book')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'cash_book'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Cash Book Register ({cashBookEntries.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('expenses')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'expenses'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Expense Vouchers ({filteredVouchers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('topay_ledger')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'topay_ledger'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>To-Pay Ledger ({toPayLedger.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('tbb_ledger')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'tbb_ledger'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>T.B.B. Party Ledger ({tbbLedger.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('party_ledger')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'party_ledger'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Party-wise Summary ({partyLedger.length})</span>
            </button>
          </div>

          {/* Quick Date Range Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold self-start sm:self-auto">
            <span className="text-[10px] text-slate-500 uppercase px-2 font-black">Filter:</span>
            <button
              onClick={() => setDateFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                dateFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setDateFilter('today')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                dateFilter === 'today' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('week')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                dateFilter === 'week' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                dateFilter === 'month' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Month
            </button>
          </div>
        </div>

        {/* Tab 1: Cash Book Register */}
        {activeTab === 'cash_book' && (
          <DataTable
            columns={cashBookColumns}
            data={cashBookEntries}
            searchPlaceholder="Search Cash Book by LR No., Category, Party Name..."
            onExportExcel={(data) => exportToExcel(data, 'Cash_Book_Register', cashBookColumns)}
            onExportPDF={(data) =>
              exportToPDF('Cash Book Register', cashBookColumns, data, 'Cash_Book_Register')
            }
          />
        )}

        {/* Tab 2: Expense Vouchers */}
        {activeTab === 'expenses' && (
          <DataTable
            columns={voucherColumns}
            data={filteredVouchers}
            searchPlaceholder="Search Expense Vouchers by Voucher No., Category, Paid To, Vehicle No..."
            onExportExcel={(data) =>
              exportToExcel(
                data,
                'Expense_Vouchers_Register',
                voucherColumns.filter((c) => c.key !== 'actions')
              )
            }
            onExportPDF={(data) =>
              exportToPDF(
                'Expense Vouchers Register',
                voucherColumns.filter((c) => c.key !== 'actions'),
                data,
                'Expense_Vouchers_Register'
              )
            }
          />
        )}

        {/* Tab 3: To-Pay Freight Ledger */}
        {activeTab === 'topay_ledger' && (
          <DataTable
            columns={toPayColumns}
            data={toPayLedger}
            searchPlaceholder="Search To-Pay items by LR No., Consigner, Consignee, Station..."
            onExportExcel={(data) => exportToExcel(data, 'ToPay_Freight_Ledger', toPayColumns)}
            onExportPDF={(data) =>
              exportToPDF('To-Pay Freight Ledger', toPayColumns, data, 'ToPay_Freight_Ledger')
            }
          />
        )}

        {/* Tab 4: T.B.B. Party Credit Ledger */}
        {activeTab === 'tbb_ledger' && (
          <DataTable
            columns={tbbColumns}
            data={tbbLedger}
            searchPlaceholder="Search T.B.B. items by LR No., Billing Party, Station..."
            onExportExcel={(data) => exportToExcel(data, 'TBB_Party_Ledger', tbbColumns)}
            onExportPDF={(data) =>
              exportToPDF('T.B.B. Party Credit Ledger', tbbColumns, data, 'TBB_Party_Ledger')
            }
          />
        )}

        {/* Tab 5: Party-Wise Summary */}
        {activeTab === 'party_ledger' && (
          <DataTable
            columns={partyColumns}
            data={partyLedger}
            searchPlaceholder="Search Party Name..."
            onExportExcel={(data) => exportToExcel(data, 'Party_Wise_Summary_Ledger', partyColumns)}
            onExportPDF={(data) =>
              exportToPDF('Party-Wise Summary Ledger', partyColumns, data, 'Party_Wise_Summary_Ledger')
            }
          />
        )}
      </div>

      {/* CREATE / EDIT VOUCHER MODAL */}
      {voucherModal.isOpen && (
        <Modal
          isOpen={voucherModal.isOpen}
          onClose={() => setVoucherModal({ isOpen: false, mode: 'create', id: null })}
          title={
            voucherModal.mode === 'create'
              ? `New ${voucherForm.type === 'EXPENSE' ? 'Expense Payment' : 'Income Receipt'} Voucher`
              : `Edit Voucher #${voucherForm.voucherNo}`
          }
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleSaveVoucher} className="space-y-4 text-xs font-semibold">
            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 uppercase font-bold mb-1">Voucher No.</label>
                <input
                  type="text"
                  value={voucherForm.voucherNo}
                  disabled
                  className="w-full p-2 bg-slate-100 border border-slate-300 rounded font-black text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 uppercase font-bold mb-1">Date *</label>
                <input
                  type="date"
                  value={voucherForm.date}
                  onChange={(e) => setVoucherForm({ ...voucherForm, date: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-sky-500 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 uppercase font-bold mb-1">Voucher Type *</label>
                <select
                  value={voucherForm.type}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setVoucherForm({
                      ...voucherForm,
                      type: newType,
                      category: newType === 'EXPENSE' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0],
                    });
                  }}
                  className="w-full p-2 border border-slate-300 rounded bg-white font-bold"
                >
                  <option value="EXPENSE">Expense (Outflow)</option>
                  <option value="INCOME">Income / Receipt (Inflow)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 uppercase font-bold mb-1">Category *</label>
                <select
                  value={voucherForm.category}
                  onChange={(e) => setVoucherForm({ ...voucherForm, category: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white font-bold"
                >
                  {(voucherForm.type === 'EXPENSE' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 uppercase font-bold mb-1">
                  {voucherForm.type === 'EXPENSE' ? 'Paid To (Party / Person)' : 'Received From'}
                </label>
                <input
                  type="text"
                  value={voucherForm.partyName}
                  onChange={(e) => setVoucherForm({ ...voucherForm, partyName: e.target.value })}
                  placeholder="Ex. Petrol Pump, Ramesh, Mathadi Labour..."
                  className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 uppercase font-bold mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={voucherForm.amount}
                  onChange={(e) => setVoucherForm({ ...voucherForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full p-2 border border-slate-300 rounded font-black text-sm text-slate-900 focus:ring-1 focus:ring-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 uppercase font-bold mb-1">Payment Mode</label>
                <select
                  value={voucherForm.paymentMode}
                  onChange={(e) => setVoucherForm({ ...voucherForm, paymentMode: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white font-bold"
                >
                  {PAYMENT_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 uppercase font-bold mb-1">
                  Vehicle No. (If Applicable)
                </label>
                <select
                  value={voucherForm.vehicleNo}
                  onChange={(e) => setVoucherForm({ ...voucherForm, vehicleNo: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white font-bold uppercase"
                >
                  <option value="">-- None / General --</option>
                  {(masters?.vehicles || []).map((v) => (
                    <option key={v.id} value={v.vehicleNo}>
                      {v.vehicleNo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-slate-700 uppercase font-bold mb-1">
                  Reference No. / UTR / Cheque No.
                </label>
                <input
                  type="text"
                  value={voucherForm.referenceNo}
                  onChange={(e) => setVoucherForm({ ...voucherForm, referenceNo: e.target.value })}
                  placeholder="Ex. UPI transaction ID, bank reference, cheque number..."
                  className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-700 uppercase font-bold mb-1">Notes / Description</label>
                <textarea
                  rows="2"
                  value={voucherForm.notes}
                  onChange={(e) => setVoucherForm({ ...voucherForm, notes: e.target.value })}
                  placeholder="Add any additional details or remarks..."
                  className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setVoucherModal({ isOpen: false, mode: 'create', id: null })}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-5 py-2 text-white rounded-lg font-bold shadow-sm transition-all cursor-pointer ${
                  voucherForm.type === 'EXPENSE'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {voucherModal.mode === 'create' ? 'Save Voucher' : 'Update Voucher'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* VIEW VOUCHER MODAL */}
      {viewingVoucher && (
        <Modal
          isOpen={!!viewingVoucher}
          onClose={() => setViewingVoucher(null)}
          title={`Voucher Details #${viewingVoucher.voucherNo}`}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Voucher No.</span>
                <span className="font-black text-slate-900 text-sm">{viewingVoucher.voucherNo}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Date</span>
                <span className="font-bold text-slate-800">{formatDate(viewingVoucher.date)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Type</span>
                <span
                  className={`font-black uppercase ${
                    viewingVoucher.type === 'INCOME' ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {viewingVoucher.type}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Category</span>
                <span className="font-bold text-slate-900">{viewingVoucher.category}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">
                  {viewingVoucher.type === 'EXPENSE' ? 'Paid To' : 'Received From'}
                </span>
                <span className="font-bold text-slate-800">{viewingVoucher.partyName || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Payment Mode</span>
                <span className="font-bold text-slate-800">{viewingVoucher.paymentMode}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Vehicle No.</span>
                <span className="font-bold text-slate-800">{viewingVoucher.vehicleNo || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Amount</span>
                <span
                  className={`font-black text-sm ${
                    viewingVoucher.type === 'INCOME' ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {formatCurrency(viewingVoucher.amount)}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 font-bold uppercase block text-[10px]">
                  Reference / Cheque No.
                </span>
                <span className="font-medium text-slate-800">{viewingVoucher.referenceNo || '-'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 font-bold uppercase block text-[10px]">
                  Description / Remarks
                </span>
                <span className="font-medium text-slate-800">{viewingVoucher.notes || '-'}</span>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => handlePrintVoucher(viewingVoucher)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs flex items-center cursor-pointer"
              >
                <Printer className="w-4 h-4 mr-1.5" />
                <span>Print Voucher</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingVoucher(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteVoucherTarget && (
        <Modal
          isOpen={!!deleteVoucherTarget}
          onClose={() => setDeleteVoucherTarget(null)}
          title="Confirm Voucher Deletion"
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs font-semibold">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-sm text-rose-900">
                  Are you sure you want to delete this voucher?
                </p>
                <p className="mt-1">
                  Voucher No.: <span className="font-black underline">{deleteVoucherTarget.voucherNo}</span>
                </p>
                <p className="mt-0.5 text-slate-600">
                  Amount: {formatCurrency(deleteVoucherTarget.amount)} &bull; {deleteVoucherTarget.category}
                </p>
                <p className="text-[11px] text-rose-600 mt-1 font-bold">This action cannot be undone.</p>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDeleteVoucherTarget(null)}
                className="px-3.5 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteVoucher}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-sm cursor-pointer"
              >
                Delete Voucher
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Accounting;
