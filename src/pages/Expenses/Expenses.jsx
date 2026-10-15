import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  Receipt,
  Plus,
  Fuel,
  Wrench,
  Navigation,
  Users,
  Package,
  MoreHorizontal,
  FileSpreadsheet,
  FileText,
  Printer,
  Search,
  Calendar,
  Filter,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Truck,
  DollarSign,
  CreditCard,
  Building2,
  RefreshCw,
  X,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { EditableCombobox } from '../../components/common/EditableCombobox';
import {
  EXPENSE_CATEGORIES,
  PAYMENT_MODES,
  getNextExpenseVoucherNo,
} from '../../services/expenseService';
import { exportToExcel, exportToPDF, printRecordDetails } from '../../services/exportService';
import { formatDate, getTodayDateString } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/numberUtils';

export const Expenses = () => {
  const { expenses, masters, handleCreateExpense, handleUpdateExpense, handleDeleteExpense } = useApp();
  const { user } = useAuth();

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedVehicle, setSelectedVehicle] = useState('ALL');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'week' | 'month' | 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Modals & Forms
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [viewingExpense, setViewingExpense] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Add / Edit Form State
  const initialFormState = {
    voucherNo: '',
    date: getTodayDateString(),
    category: EXPENSE_CATEGORIES[0],
    amount: '',
    vehicleNo: '',
    payeeName: '',
    paymentMode: 'CASH',
    referenceNo: '',
    notes: '',
  };

  const [formData, setFormData] = useState(initialFormState);

  // Category Configuration (Icon & Theme)
  const categoryConfig = {
    'Diesel / Fuel Expense': {
      icon: Fuel,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
      cardBorder: 'border-l-4 border-l-amber-500',
    },
    'Vehicle Maintenance': {
      icon: Wrench,
      color: 'text-rose-700 bg-rose-50 border-rose-200',
      badge: 'bg-rose-100 text-rose-800 border-rose-300',
      cardBorder: 'border-l-4 border-l-rose-500',
    },
    'Toll and Road Charges': {
      icon: Navigation,
      color: 'text-purple-700 bg-purple-50 border-purple-200',
      badge: 'bg-purple-100 text-purple-800 border-purple-300',
      cardBorder: 'border-l-4 border-l-purple-500',
    },
    'Driver and Helper Expenses': {
      icon: Users,
      color: 'text-sky-700 bg-sky-50 border-sky-200',
      badge: 'bg-sky-100 text-sky-800 border-sky-300',
      cardBorder: 'border-l-4 border-l-sky-500',
    },
    'Loading and Unloading': {
      icon: Package,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      cardBorder: 'border-l-4 border-l-emerald-500',
    },
    'Other Expenses': {
      icon: MoreHorizontal,
      color: 'text-slate-700 bg-slate-50 border-slate-200',
      badge: 'bg-slate-100 text-slate-800 border-slate-300',
      cardBorder: 'border-l-4 border-l-slate-500',
    },
  };

  // Helper for Date Filtering
  const isDateInFilter = (dateStr) => {
    if (!dateStr) return true;
    if (dateFilter === 'all') return true;

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
    if (dateFilter === 'custom') {
      if (customStartDate && d < new Date(customStartDate)) return false;
      if (customEndDate && d > new Date(customEndDate + 'T23:59:59')) return false;
      return true;
    }
    return true;
  };

  // Filtered Expense Records
  const filteredExpenses = useMemo(() => {
    return (expenses || []).filter((item) => {
      // Date Filter
      if (!isDateInFilter(item.date)) return false;

      // Category Filter
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;

      // Vehicle Filter
      if (selectedVehicle !== 'ALL' && item.vehicleNo !== selectedVehicle) return false;

      // Payment Mode Filter
      if (selectedPaymentMode !== 'ALL' && item.paymentMode !== selectedPaymentMode) return false;

      // Search Query
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const vNo = String(item.voucherNo || '').toLowerCase();
        const cat = String(item.category || '').toLowerCase();
        const payee = String(item.payeeName || '').toLowerCase();
        const veh = String(item.vehicleNo || '').toLowerCase();
        const ref = String(item.referenceNo || '').toLowerCase();
        const notes = String(item.notes || '').toLowerCase();

        return (
          vNo.includes(term) ||
          cat.includes(term) ||
          payee.includes(term) ||
          veh.includes(term) ||
          ref.includes(term) ||
          notes.includes(term)
        );
      }

      return true;
    });
  }, [
    expenses,
    searchTerm,
    selectedCategory,
    selectedVehicle,
    selectedPaymentMode,
    dateFilter,
    customStartDate,
    customEndDate,
  ]);

  // Aggregate Category Totals
  const categoryTotals = useMemo(() => {
    const totals = {
      total: 0,
      'Diesel / Fuel Expense': 0,
      'Vehicle Maintenance': 0,
      'Toll and Road Charges': 0,
      'Driver and Helper Expenses': 0,
      'Loading and Unloading': 0,
      'Other Expenses': 0,
    };

    filteredExpenses.forEach((item) => {
      const amt = Number(item.amount) || 0;
      totals.total += amt;
      if (totals[item.category] !== undefined) {
        totals[item.category] += amt;
      } else {
        totals['Other Expenses'] += amt;
      }
    });

    return totals;
  }, [filteredExpenses]);

  // Unique Vehicles present in expenses or masters
  const vehicleOptions = useMemo(() => {
    const set = new Set();
    (masters.vehicles || []).forEach((v) => {
      if (v.vehicleNo) set.add(v.vehicleNo);
    });
    (expenses || []).forEach((e) => {
      if (e.vehicleNo) set.add(e.vehicleNo);
    });
    return Array.from(set).sort();
  }, [masters.vehicles, expenses]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingExpenseId(null);
    setFormData({
      voucherNo: getNextExpenseVoucherNo(expenses),
      date: getTodayDateString(),
      category: selectedCategory !== 'ALL' ? selectedCategory : EXPENSE_CATEGORIES[0],
      amount: '',
      vehicleNo: '',
      payeeName: '',
      paymentMode: 'CASH',
      referenceNo: '',
      notes: '',
    });
    setFormError('');
    setFormSuccess('');
    setIsAddEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item) => {
    setEditingExpenseId(item.id);
    setFormData({
      voucherNo: item.voucherNo || '',
      date: item.date || getTodayDateString(),
      category: item.category || EXPENSE_CATEGORIES[0],
      amount: item.amount || '',
      vehicleNo: item.vehicleNo || '',
      payeeName: item.payeeName || '',
      paymentMode: item.paymentMode || 'CASH',
      referenceNo: item.referenceNo || '',
      notes: item.notes || '',
    });
    setFormError('');
    setFormSuccess('');
    setIsAddEditModalOpen(true);
  };

  // Form Submit (Create / Update)
  const handleSaveForm = (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formData.amount || Number(formData.amount) <= 0) {
      setFormError('Please enter a valid expense amount greater than 0.');
      return;
    }

    try {
      if (editingExpenseId) {
        handleUpdateExpense(editingExpenseId, formData, user?.displayName || 'Administrator');
        setFormSuccess('Expense record updated successfully!');
      } else {
        handleCreateExpense(formData, user?.displayName || 'Administrator');
        setFormSuccess('Expense record created successfully!');
      }

      setTimeout(() => {
        setIsAddEditModalOpen(false);
      }, 400);
    } catch (err) {
      setFormError(err.message || 'Failed to save expense record.');
    }
  };

  // Delete Expense Record
  const handleConfirmDelete = () => {
    if (!deleteConfirmId) return;
    try {
      handleDeleteExpense(deleteConfirmId);
      setDeleteConfirmId(null);
    } catch (err) {
      alert('Failed to delete expense: ' + err.message);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = filteredExpenses.map((e, idx) => ({
      'Sr No': idx + 1,
      'Voucher No': e.voucherNo,
      'Date': formatDate(e.date),
      'Expense Category': e.category,
      'Amount (₹)': Number(e.amount) || 0,
      'Vehicle No': e.vehicleNo || '-',
      'Paid To / Payee': e.payeeName || '-',
      'Payment Mode': e.paymentMode || 'CASH',
      'Ref / Bill No': e.referenceNo || '-',
      'Remarks / Notes': e.notes || '-',
      'Recorded By': e.createdBy || '-',
    }));
    exportToExcel(exportData, `Athahar_Expenses_${getTodayDateString()}`);
  };

  // Export to PDF
  const handleExportPDF = () => {
    const title = 'ATHAHAR ROADWAYS - EXPENSE SUMMARY REPORT';
    const columns = [
      { header: 'Date', dataKey: 'date' },
      { header: 'Voucher', dataKey: 'voucherNo' },
      { header: 'Category', dataKey: 'category' },
      { header: 'Vehicle', dataKey: 'vehicleNo' },
      { header: 'Paid To', dataKey: 'payeeName' },
      { header: 'Mode', dataKey: 'paymentMode' },
      { header: 'Amount (₹)', dataKey: 'amount' },
      { header: 'Notes', dataKey: 'notes' },
    ];
    const data = filteredExpenses.map((e) => ({
      date: formatDate(e.date),
      voucherNo: e.voucherNo,
      category: e.category,
      vehicleNo: e.vehicleNo || '-',
      payeeName: e.payeeName || '-',
      paymentMode: e.paymentMode,
      amount: formatCurrency(e.amount),
      notes: e.notes || '-',
    }));
    exportToPDF(title, columns, data, `Athahar_Expenses_${getTodayDateString()}`);
  };

  // Print Expense Voucher Slip
  const handlePrintVoucher = (voucher) => {
    printRecordDetails({
      title: `ATHAHAR ROADWAYS - EXPENSE VOUCHER #${voucher.voucherNo}`,
      fields: [
        { label: 'Voucher No', value: voucher.voucherNo },
        { label: 'Expense Date', value: formatDate(voucher.date) },
        { label: 'Category', value: voucher.category },
        { label: 'Total Amount', value: formatCurrency(voucher.amount) },
        { label: 'Vehicle No.', value: voucher.vehicleNo || 'N/A' },
        { label: 'Paid To / Payee', value: voucher.payeeName || '-' },
        { label: 'Payment Mode', value: voucher.paymentMode || 'CASH' },
        { label: 'Ref / Bill No.', value: voucher.referenceNo || '-' },
        { label: 'Recorded By', value: voucher.createdBy || 'Administrator' },
        { label: 'Notes / Remarks', value: voucher.notes || '-' },
      ],
      items: [],
    });
  };

  return (
    <div className="space-y-5 text-slate-800 max-w-full">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200">
        <div className="flex items-center space-x-3.5">
          <div className="bg-gradient-to-br from-[#072440] to-sky-700 text-white p-3 rounded-xl shadow-md flex items-center justify-center">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Expenses
              <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                {filteredExpenses.length} Records
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Record and track Diesel/Fuel, Vehicle Maintenance, Toll, Driver Advances, Loading/Unloading, and Other operational expenses.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Export to Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center space-x-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Export to PDF"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white rounded-lg text-xs font-extrabold transition-all shadow-md shadow-sky-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Expense</span>
          </button>
        </div>
      </div>

      {/* TOP KPI CARDS FOR THE 6 REQUESTED CATEGORIES */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* Total Overall Expenses */}
        <div className="col-span-2 sm:col-span-3 lg:col-span-1 bg-gradient-to-br from-[#072440] to-[#0c3761] text-white p-3.5 rounded-xl shadow-md border border-sky-950 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-300">
              Total Expenses
            </span>
            <DollarSign className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2">
            <div className="text-lg font-black tracking-tight text-white">
              {formatCurrency(categoryTotals.total)}
            </div>
            <div className="text-[10px] text-sky-200/80 font-semibold mt-0.5">
              {filteredExpenses.length} Vouchers
            </div>
          </div>
        </div>

        {/* 1. Diesel / Fuel Expense */}
        <div
          onClick={() => setSelectedCategory(selectedCategory === 'Diesel / Fuel Expense' ? 'ALL' : 'Diesel / Fuel Expense')}
          className={`bg-white p-3 rounded-xl border transition-all cursor-pointer shadow-2xs hover:shadow-md ${
            selectedCategory === 'Diesel / Fuel Expense' ? 'ring-2 ring-amber-500 border-amber-500' : 'border-slate-200'
          } ${categoryConfig['Diesel / Fuel Expense'].cardBorder}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-500">Diesel / Fuel</span>
            <div className="p-1 rounded-md bg-amber-50 text-amber-600">
              <Fuel className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-base font-black text-slate-900">
              {formatCurrency(categoryTotals['Diesel / Fuel Expense'])}
            </div>
            <div className="text-[10px] font-bold text-amber-600 mt-0.5">
              Fuel & Diesel
            </div>
          </div>
        </div>

        {/* 2. Vehicle Maintenance */}
        <div
          onClick={() => setSelectedCategory(selectedCategory === 'Vehicle Maintenance' ? 'ALL' : 'Vehicle Maintenance')}
          className={`bg-white p-3 rounded-xl border transition-all cursor-pointer shadow-2xs hover:shadow-md ${
            selectedCategory === 'Vehicle Maintenance' ? 'ring-2 ring-rose-500 border-rose-500' : 'border-slate-200'
          } ${categoryConfig['Vehicle Maintenance'].cardBorder}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-500">Maintenance</span>
            <div className="p-1 rounded-md bg-rose-50 text-rose-600">
              <Wrench className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-base font-black text-slate-900">
              {formatCurrency(categoryTotals['Vehicle Maintenance'])}
            </div>
            <div className="text-[10px] font-bold text-rose-600 mt-0.5">
              Repairs & Garage
            </div>
          </div>
        </div>

        {/* 3. Toll and Road Charges */}
        <div
          onClick={() => setSelectedCategory(selectedCategory === 'Toll and Road Charges' ? 'ALL' : 'Toll and Road Charges')}
          className={`bg-white p-3 rounded-xl border transition-all cursor-pointer shadow-2xs hover:shadow-md ${
            selectedCategory === 'Toll and Road Charges' ? 'ring-2 ring-purple-500 border-purple-500' : 'border-slate-200'
          } ${categoryConfig['Toll and Road Charges'].cardBorder}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-500">Toll & Road</span>
            <div className="p-1 rounded-md bg-purple-50 text-purple-600">
              <Navigation className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-base font-black text-slate-900">
              {formatCurrency(categoryTotals['Toll and Road Charges'])}
            </div>
            <div className="text-[10px] font-bold text-purple-600 mt-0.5">
              Fastag & RTO
            </div>
          </div>
        </div>

        {/* 4. Driver and Helper Expenses */}
        <div
          onClick={() => setSelectedCategory(selectedCategory === 'Driver and Helper Expenses' ? 'ALL' : 'Driver and Helper Expenses')}
          className={`bg-white p-3 rounded-xl border transition-all cursor-pointer shadow-2xs hover:shadow-md ${
            selectedCategory === 'Driver and Helper Expenses' ? 'ring-2 ring-sky-500 border-sky-500' : 'border-slate-200'
          } ${categoryConfig['Driver and Helper Expenses'].cardBorder}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-500">Driver & Helper</span>
            <div className="p-1 rounded-md bg-sky-50 text-sky-600">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-base font-black text-slate-900">
              {formatCurrency(categoryTotals['Driver and Helper Expenses'])}
            </div>
            <div className="text-[10px] font-bold text-sky-600 mt-0.5">
              Bhatta & Advances
            </div>
          </div>
        </div>

        {/* 5. Loading and Unloading */}
        <div
          onClick={() => setSelectedCategory(selectedCategory === 'Loading and Unloading' ? 'ALL' : 'Loading and Unloading')}
          className={`bg-white p-3 rounded-xl border transition-all cursor-pointer shadow-2xs hover:shadow-md ${
            selectedCategory === 'Loading and Unloading' ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-slate-200'
          } ${categoryConfig['Loading and Unloading'].cardBorder}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-500">Hamali / Loading</span>
            <div className="p-1 rounded-md bg-emerald-50 text-emerald-600">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-base font-black text-slate-900">
              {formatCurrency(categoryTotals['Loading and Unloading'])}
            </div>
            <div className="text-[10px] font-bold text-emerald-600 mt-0.5">
              Labour Charges
            </div>
          </div>
        </div>

        {/* 6. Other Expenses */}
        <div
          onClick={() => setSelectedCategory(selectedCategory === 'Other Expenses' ? 'ALL' : 'Other Expenses')}
          className={`bg-white p-3 rounded-xl border transition-all cursor-pointer shadow-2xs hover:shadow-md ${
            selectedCategory === 'Other Expenses' ? 'ring-2 ring-slate-500 border-slate-500' : 'border-slate-200'
          } ${categoryConfig['Other Expenses'].cardBorder}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-500">Other Expenses</span>
            <div className="p-1 rounded-md bg-slate-100 text-slate-600">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-base font-black text-slate-900">
              {formatCurrency(categoryTotals['Other Expenses'])}
            </div>
            <div className="text-[10px] font-bold text-slate-600 mt-0.5">
              Misc & Godown
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Voucher, Payee, Vehicle, Notes..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Category Dropdown */}
          <div className="lg:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="ALL">All Expense Categories</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Vehicle Filter */}
          <div className="lg:col-span-2">
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="ALL">All Vehicles</option>
              {vehicleOptions.map((veh) => (
                <option key={veh} value={veh}>
                  {veh}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Mode Filter */}
          <div className="lg:col-span-3">
            <select
              value={selectedPaymentMode}
              onChange={(e) => setSelectedPaymentMode(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="ALL">All Payment Modes</option>
              {PAYMENT_MODES.map((pm) => (
                <option key={pm} value={pm}>
                  {pm}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Filter Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">Date:</span>
            {[
              { id: 'all', label: 'All Dates' },
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: 'custom', label: 'Custom Range' },
            ].map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDateFilter(d.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  dateFilter === d.id
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs if 'custom' is active */}
          {dateFilter === 'custom' && (
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-800"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-800"
              />
            </div>
          )}
        </div>
      </div>

      {/* EXPENSES DATA TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-black text-slate-700 uppercase tracking-wider">
                <th className="py-3 px-3.5">Date</th>
                <th className="py-3 px-3.5">Voucher No</th>
                <th className="py-3 px-3.5">Category</th>
                <th className="py-3 px-3.5">Vehicle No</th>
                <th className="py-3 px-3.5">Paid To / Payee</th>
                <th className="py-3 px-3.5">Payment Mode</th>
                <th className="py-3 px-3.5 text-right">Amount (₹)</th>
                <th className="py-3 px-3.5">Notes / Ref</th>
                <th className="py-3 px-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-800">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-500" />
                    No expenses found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((item) => {
                  const conf = categoryConfig[item.category] || categoryConfig['Other Expenses'];
                  const Icon = conf.icon;
                  return (
                    <tr key={item.id} className="hover:bg-sky-50/40 transition-colors">
                      <td className="py-3 px-3.5 font-bold text-slate-700 whitespace-nowrap">
                        {formatDate(item.date)}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="font-extrabold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 text-[11px]">
                          #{item.voucherNo}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-black border ${conf.badge}`}
                        >
                          <Icon className="w-3 h-3 mr-1" />
                          <span>{item.category}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {item.vehicleNo ? (
                          <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {item.vehicleNo}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-bold text-slate-900">
                        {item.payeeName || <span className="text-slate-400 font-normal">-</span>}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-700">
                          {item.paymentMode || 'CASH'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right font-black text-sm text-slate-900 whitespace-nowrap">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="py-3 px-3.5 max-w-xs truncate text-slate-600 font-medium">
                        {item.notes ? item.notes : item.referenceNo ? `Ref: ${item.referenceNo}` : '-'}
                      </td>
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            type="button"
                            onClick={() => setViewingExpense(item)}
                            title="View Voucher"
                            className="p-1.5 text-sky-600 hover:text-sky-800 hover:bg-sky-100 rounded transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintVoucher(item)}
                            title="Print Voucher"
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            title="Edit Record"
                            className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(item.id)}
                            title="Delete Record"
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-100 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredExpenses.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100/90 font-black border-t-2 border-slate-300 text-slate-900 text-xs">
                  <td colSpan={6} className="py-3 px-3.5 uppercase tracking-wider text-right">
                    Total Filtered Expenses:
                  </td>
                  <td className="py-3 px-3.5 text-right font-black text-sm text-slate-900">
                    {formatCurrency(categoryTotals.total)}
                  </td>
                  <td colSpan={2} className="py-3 px-3.5 text-slate-500 font-bold">
                    {filteredExpenses.length} Records
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ADD / EDIT EXPENSE MODAL */}
      <Modal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        title={editingExpenseId ? `Edit Expense Voucher #${formData.voucherNo}` : '+ Add New Expense Record'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveForm} className="space-y-4">
          {formError && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-bold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="flex items-center space-x-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Voucher No */}
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                Voucher No. *
              </label>
              <input
                type="text"
                value={formData.voucherNo}
                onChange={(e) => setFormData((prev) => ({ ...prev, voucherNo: e.target.value.toUpperCase() }))}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-slate-50 uppercase focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                Expense Date *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            {/* Category Dropdown (Requested 6 categories) */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                Expense Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-extrabold text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount (₹) */}
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                Amount (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={formData.amount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                  required
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-black text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                Payment Mode *
              </label>
              <select
                value={formData.paymentMode}
                onChange={(e) => setFormData((prev) => ({ ...prev, paymentMode: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                {PAYMENT_MODES.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>

            {/* Vehicle No */}
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                Vehicle No. (If applicable)
              </label>
              <EditableCombobox
                name="vehicleNo"
                value={formData.vehicleNo}
                onChange={(e, val) => setFormData((prev) => ({ ...prev, vehicleNo: val }))}
                options={masters.vehicles}
                placeholder=""
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            {/* Payee / Driver / Vendor */}
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                Paid To / Payee / Driver Name
              </label>
              <input
                type="text"
                value={formData.payeeName}
                onChange={(e) => setFormData((prev) => ({ ...prev, payeeName: e.target.value }))}
                placeholder=""
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 uppercase focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            {/* Reference No / Bill No */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                Bill / Invoice / Receipt / Ref No.
              </label>
              <input
                type="text"
                value={formData.referenceNo}
                onChange={(e) => setFormData((prev) => ({ ...prev, referenceNo: e.target.value }))}
                placeholder=""
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 uppercase focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            {/* Notes / Remarks */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                Expense Notes / Remarks
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder=""
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAddEditModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-black shadow-md shadow-sky-600/20 transition-all cursor-pointer"
            >
              {editingExpenseId ? 'Update Expense' : 'Save Expense'}
            </button>
          </div>
        </form>
      </Modal>

      {/* VIEW VOUCHER MODAL */}
      <Modal
        isOpen={!!viewingExpense}
        onClose={() => setViewingExpense(null)}
        title={`Expense Voucher #${viewingExpense?.voucherNo}`}
        maxWidth="max-w-xl"
      >
        {viewingExpense && (
          <div className="space-y-4 text-slate-800">
            {/* Printable Voucher Header */}
            <div className="bg-[#072440] text-white p-4 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black tracking-wider uppercase">ATHAHAR ROADWAYS</h3>
                <p className="text-[10px] text-sky-400 font-bold uppercase">SANGLI-416416</p>
                <div className="mt-1 text-[11px] font-extrabold text-sky-200">
                  Payment Voucher #{viewingExpense.voucherNo}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-sky-300 font-bold uppercase">Date</div>
                <div className="text-sm font-bold">{formatDate(viewingExpense.date)}</div>
              </div>
            </div>

            {/* Amount Big Display */}
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <span className="text-xs font-black text-emerald-900 uppercase">Paid Amount:</span>
              <span className="text-2xl font-black text-emerald-700">
                {formatCurrency(viewingExpense.amount)}
              </span>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Category</span>
                <span className="font-extrabold text-slate-900">{viewingExpense.category}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Payment Mode</span>
                <span className="font-extrabold text-slate-900">{viewingExpense.paymentMode}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Vehicle No.</span>
                <span className="font-extrabold text-slate-900">{viewingExpense.vehicleNo || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Paid To / Payee</span>
                <span className="font-extrabold text-slate-900">{viewingExpense.payeeName || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Bill / Ref No.</span>
                <span className="font-bold text-slate-800">{viewingExpense.referenceNo || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Recorded By</span>
                <span className="font-bold text-slate-800">{viewingExpense.createdBy || 'Administrator'}</span>
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Notes / Remarks</span>
                <span className="font-medium text-slate-700">{viewingExpense.notes || '-'}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => handlePrintVoucher(viewingExpense)}
                className="flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Voucher</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingExpense(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Confirm Delete Expense"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-slate-800">
          <p className="text-xs text-slate-600 font-medium">
            Are you sure you want to delete this expense record? This action will permanently remove it from your records.
          </p>
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setDeleteConfirmId(null)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black shadow-xs cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default Expenses;
