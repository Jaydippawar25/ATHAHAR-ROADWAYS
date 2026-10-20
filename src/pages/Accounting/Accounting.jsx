import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Percent,
  Layers,
  FileSpreadsheet,
  FileText,
  Printer,
  Eye,
  CheckCircle2,
  Calendar,
  Calculator,
  DollarSign,
  ArrowLeftRight,
  Shuffle,
} from 'lucide-react';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { exportToExcel, exportToPDF, printRecordDetails } from '../../services/exportService';
import { formatDate } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/numberUtils';

export const Accounting = () => {
  const { inwards, inwardItems, outwards, outwardItems } = useApp();

  // Active view tab: 'all_accounting' | 'inward_money' | 'outward_money' | 'stock_out_money' | 'commission_summary'
  const [activeTab, setActiveTab] = useState('all_accounting');

  // Configurable commission percentage (defaulted to 20% as requested)
  const [commissionRate, setCommissionRate] = useState(20);

  // Date filter: 'all' | 'today' | 'week' | 'month'
  const [dateFilter, setDateFilter] = useState('all');

  // Modal view state
  const [viewingRecord, setViewingRecord] = useState(null);

  // Filter helper for dates
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

  const commMultiplier = (Number(commissionRate) || 0) / 100;

  // 1. Enrich Inward receipts with live items totals and 20% Commission
  const enrichedInwards = useMemo(() => {
    return inwards
      .filter((inw) => isDateInFilter(inw.date))
      .map((inw) => {
        const items = inwardItems.filter(
          (item) => item.inwardId === inw.id || item.inwardNo === inw.inwardNo
        );
        const totalQty =
          items.length > 0
            ? items.reduce((acc, curr) => acc + (Number(curr.pkg) || 0), 0)
            : Number(inw.totalQty) || 0;
        const totalToPay =
          items.length > 0
            ? items.reduce((acc, curr) => acc + (Number(curr.toPayAmount) || 0), 0)
            : Number(inw.totalToPay) || 0;
        const totalTbb =
          items.length > 0
            ? items.reduce((acc, curr) => acc + (Number(curr.tbbAmount) || 0), 0)
            : Number(inw.totalTbb) || 0;
        const totalPaid =
          items.length > 0
            ? items.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0)
            : Number(inw.totalPaid) || 0;

        const grossFreight = totalToPay + totalTbb + totalPaid;
        const commissionAmount = grossFreight * commMultiplier;
        // Total Money calculates (-) COMMISSION for Inward
        const totalMoney = grossFreight - commissionAmount;
        const netAmount = totalMoney;

        return {
          ...inw,
          id: inw.id || `inw-${inw.inwardNo}`,
          type: 'INWARD',
          receiptNo: inw.inwardNo,
          totalQty,
          totalToPay,
          totalTbb,
          totalPaid,
          grossFreight,
          commissionRate,
          commissionAmount,
          totalMoney,
          netAmount,
          items,
        };
      });
  }, [inwards, inwardItems, dateFilter, commMultiplier, commissionRate]);

  // Helper to distinguish Stock Out from Standard Outward
  const isStockOutRecord = (out) =>
    Boolean(out.isCrossOutward || String(out.outwardNo || '').toUpperCase().startsWith('STOCK-OUT'));

  // 2. Enrich Outward receipts (Standard Outward)
  const enrichedOutwards = useMemo(() => {
    return outwards
      .filter((out) => !isStockOutRecord(out) && isDateInFilter(out.date))
      .map((out) => {
        const items = outwardItems.filter(
          (item) => item.outwardId === out.id || item.outwardNo === out.outwardNo
        );
        const totalQty =
          items.length > 0
            ? items.reduce((acc, curr) => acc + (Number(curr.pkg) || 0), 0)
            : Number(out.totalQty) || 0;
        const totalToPay =
          items.length > 0
            ? items.reduce((acc, curr) => acc + (Number(curr.toPayAmount) || 0), 0)
            : Number(out.totalToPay) || 0;
        const totalTbb =
          items.length > 0
            ? items.reduce((acc, curr) => acc + (Number(curr.tbbAmount) || 0), 0)
            : Number(out.totalTbb) || 0;
        const totalPaid =
          items.length > 0
            ? items.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0)
            : Number(out.totalPaid) || 0;

        const totalMoney = totalToPay + totalTbb + totalPaid;
        // Commission is ONLY for Inward; no commission in outward
        const commissionAmount = 0;
        const netAmount = totalMoney;

        return {
          ...out,
          id: out.id || `out-${out.outwardNo}`,
          type: 'OUTWARD',
          receiptNo: out.outwardNo,
          totalQty,
          totalToPay,
          totalTbb,
          totalPaid,
          totalMoney,
          commissionRate,
          commissionAmount,
          netAmount,
          items,
        };
      });
  }, [outwards, outwardItems, dateFilter, commissionRate]);

  // 3. Enrich Stock Out receipts (Cross Stock Out)
  const enrichedStockOuts = useMemo(() => {
    return outwards
      .filter((out) => isStockOutRecord(out) && isDateInFilter(out.date))
      .map((out) => {
        const items = outwardItems.filter(
          (item) => item.outwardId === out.id || item.outwardNo === out.outwardNo
        );
        const totalQty =
          items.length > 0
            ? items.reduce((acc, curr) => acc + (Number(curr.pkg) || 0), 0)
            : Number(out.totalQty) || 0;
        const totalToPay =
          items.length > 0
            ? items.reduce((acc, curr) => acc + (Number(curr.toPayAmount) || 0), 0)
            : Number(out.totalToPay) || 0;
        const totalTbb =
          items.length > 0
            ? items.reduce((acc, curr) => acc + (Number(curr.tbbAmount) || 0), 0)
            : Number(out.totalTbb) || 0;
        const totalPaid =
          items.length > 0
            ? items.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0)
            : Number(out.totalPaid) || 0;

        const totalMoney = totalToPay + totalTbb + totalPaid;
        // Commission is ONLY for Inward; no commission in stock out
        const commissionAmount = 0;
        const netAmount = totalMoney;

        return {
          ...out,
          id: out.id || `stock-out-${out.outwardNo}`,
          type: 'STOCK OUT',
          receiptNo: out.outwardNo,
          totalQty,
          totalToPay,
          totalTbb,
          totalPaid,
          totalMoney,
          commissionRate,
          commissionAmount,
          netAmount,
          items,
        };
      });
  }, [outwards, outwardItems, dateFilter, commissionRate]);

  // 4. Combined Inward, Outward & Stock Out Transactions
  const allTransactions = useMemo(() => {
    const combined = [...enrichedInwards, ...enrichedOutwards, ...enrichedStockOuts];
    combined.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return combined;
  }, [enrichedInwards, enrichedOutwards, enrichedStockOuts]);

  // 5. Financial KPI Totals
  const accountingSummary = useMemo(() => {
    // Inward Calculations (Commission is calculated ONLY on Inward)
    const inwardGrossFreight = enrichedInwards.reduce(
      (acc, curr) => acc + (curr.grossFreight ?? (curr.totalToPay + curr.totalTbb + curr.totalPaid)),
      0
    );
    const inwardCommission = enrichedInwards.reduce(
      (acc, curr) => acc + (curr.commissionAmount || 0),
      0
    );
    // Net Inward Money after deducting Commission
    const inwardMoneyTotal = enrichedInwards.reduce((acc, curr) => acc + curr.totalMoney, 0);
    const inwardToPay = enrichedInwards.reduce((acc, curr) => acc + curr.totalToPay, 0);
    const inwardTbb = enrichedInwards.reduce((acc, curr) => acc + curr.totalTbb, 0);
    const inwardPaid = enrichedInwards.reduce((acc, curr) => acc + curr.totalPaid, 0);

    // Outward Calculations (No commission in outward)
    const outwardMoneyTotal = enrichedOutwards.reduce((acc, curr) => acc + curr.totalMoney, 0);
    const outwardToPay = enrichedOutwards.reduce((acc, curr) => acc + curr.totalToPay, 0);
    const outwardTbb = enrichedOutwards.reduce((acc, curr) => acc + curr.totalTbb, 0);
    const outwardPaid = enrichedOutwards.reduce((acc, curr) => acc + curr.totalPaid, 0);
    const outwardCommission = 0;

    // Stock Out Calculations (No commission in stock out)
    const stockOutMoneyTotal = enrichedStockOuts.reduce((acc, curr) => acc + curr.totalMoney, 0);
    const stockOutToPay = enrichedStockOuts.reduce((acc, curr) => acc + curr.totalToPay, 0);
    const stockOutTbb = enrichedStockOuts.reduce((acc, curr) => acc + curr.totalTbb, 0);
    const stockOutPaid = enrichedStockOuts.reduce((acc, curr) => acc + curr.totalPaid, 0);
    const stockOutCommission = 0;

    // Combined Totals: Total Commission is strictly from Inward
    const totalFreightHandled = inwardGrossFreight + outwardMoneyTotal + stockOutMoneyTotal;
    const totalCommission20 = inwardCommission;
    const netDifference = inwardMoneyTotal - outwardMoneyTotal;

    return {
      inwardMoneyTotal,
      inwardGrossFreight,
      inwardToPay,
      inwardTbb,
      inwardPaid,
      inwardCommission,
      outwardMoneyTotal,
      outwardToPay,
      outwardTbb,
      outwardPaid,
      outwardCommission,
      stockOutMoneyTotal,
      stockOutToPay,
      stockOutTbb,
      stockOutPaid,
      stockOutCommission,
      totalFreightHandled,
      totalCommission20,
      netDifference,
    };
  }, [enrichedInwards, enrichedOutwards, enrichedStockOuts, commMultiplier]);

  // Print Details Handler
  const handlePrintAccountingStatement = (row) => {
    printRecordDetails({
      title: `${row.type} Accounting Receipt #${row.receiptNo}`,
      fields: [
        { label: 'Receipt Type', value: row.type },
        { label: 'Receipt No.', value: row.receiptNo },
        { label: 'Date', value: formatDate(row.date) },
        { label: 'Vehicle No.', value: row.vehicleNo || '-' },
        { label: 'Driver / Transporter', value: row.driverName || row.transporterName || '-' },
        { label: 'Total Packages', value: `${row.totalQty || 0} Pkgs` },
        { label: 'To Pay Amount', value: formatCurrency(row.totalToPay) },
        { label: 'T.B.B Amount', value: formatCurrency(row.totalTbb) },
        { label: 'Paid Amount', value: formatCurrency(row.totalPaid) },
        ...(row.type === 'INWARD'
          ? [
              {
                label: `Commission (${commissionRate}%)`,
                value: `(-) ${formatCurrency(row.commissionAmount)}`,
              },
              { label: 'Total Money (After Commission)', value: formatCurrency(row.totalMoney) },
            ]
          : [{ label: 'Total Money', value: formatCurrency(row.totalMoney) }]),
      ],
      items: row.items,
    });
  };

  // Table Columns Definition
  const accountingColumns = [
    { label: 'Date', key: 'date', type: 'date', nowrap: true },
    {
      label: 'Type',
      key: 'type',
      width: 'min-w-[110px]',
      nowrap: true,
      render: (row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-black whitespace-nowrap shrink-0 ${
            row.type === 'INWARD'
              ? 'bg-sky-100 text-sky-800 border border-sky-300'
              : row.type === 'STOCK OUT'
              ? 'bg-purple-100 text-purple-800 border border-purple-300'
              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
          }`}
        >
          {row.type === 'INWARD' ? (
            <ArrowDownLeft className="w-3 h-3 mr-1 text-sky-600 shrink-0" />
          ) : row.type === 'STOCK OUT' ? (
            <Shuffle className="w-3 h-3 mr-1 text-purple-600 shrink-0" />
          ) : (
            <ArrowUpRight className="w-3 h-3 mr-1 text-emerald-600 shrink-0" />
          )}
          <span>{row.type}</span>
        </span>
      ),
    },
    {
      label: 'Receipt No.',
      key: 'receiptNo',
      nowrap: true,
      render: (row) => <span className="font-extrabold text-slate-900 whitespace-nowrap">{row.receiptNo}</span>,
    },
    { label: 'Vehicle No.', key: 'vehicleNo', nowrap: true, render: (row) => <span className="whitespace-nowrap">{row.vehicleNo || '-'}</span> },
    { label: 'PKG', key: 'totalQty', nowrap: true },
    { label: 'To Pay', key: 'totalToPay', type: 'currency', nowrap: true },
    { label: 'T.B.B', key: 'totalTbb', type: 'currency', nowrap: true },
    { label: 'Paid', key: 'totalPaid', type: 'currency', nowrap: true },
    {
      label: `COMMISSION (${commissionRate}%)`,
      key: 'commissionAmount',
      type: 'currency',
      nowrap: true,
      render: (row) =>
        row.type === 'INWARD' ? (
          <span className="font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 whitespace-nowrap">
            {formatCurrency(row.commissionAmount)}
          </span>
        ) : (
          <span className="font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 whitespace-nowrap">
            ₹0.00
          </span>
        ),
    },
    {
      label: 'Total Money',
      key: 'totalMoney',
      type: 'currency',
      nowrap: true,
      render: (row) => (
        <span className="font-black text-slate-900 text-xs whitespace-nowrap">
          {formatCurrency(row.totalMoney)}
        </span>
      ),
    },
    {
      label: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex items-center justify-center space-x-1">
          <button
            onClick={() => setViewingRecord(row)}
            className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
            title="View Money & Commission Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handlePrintAccountingStatement(row)}
            className="p-1 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded transition-colors cursor-pointer"
            title="Print Statement"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  // Outward & Stock Out Columns (Excludes COMMISSION column)
  const outwardColumns = useMemo(
    () => accountingColumns.filter((col) => col.key !== 'commissionAmount'),
    [accountingColumns]
  );

  return (
    <div className="space-y-6 text-slate-800 max-w-full">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-[#07182e] via-[#0b2545] to-[#133e87] rounded-3xl p-6 text-white shadow-xl border border-blue-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="h-1 highway-accent-line absolute top-0 left-0 right-0" />
        <div className="absolute right-0 top-0 w-80 h-80 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1.5 z-10">
          <div className="flex items-center space-x-2 text-[10px] font-black tracking-widest uppercase text-orange-400">
            <span className="bg-white/10 px-2.5 py-0.5 rounded-full border border-white/20 flex items-center">
              <Calculator className="w-3.5 h-3.5 mr-1 text-orange-400" />
              TRANSPORT FREIGHT ACCOUNTING
            </span>
            <span>&bull; ATHAHAR ROADWAYS SANGLI</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center space-x-3">
            <span>Inward, Outward &amp; Stock Out Accounting</span>
          </h2>

          <p className="text-blue-100 text-xs sm:text-sm font-medium">
            Live calculation of Total Money Inward, Outward, Stock Out, and Agency Commission
          </p>
        </div>

        {/* Commission Rate Configurator Pill */}
        <div className="bg-white/10 border border-white/20 px-4 py-2.5 rounded-xl flex items-center space-x-3 self-start md:self-auto shadow-sm backdrop-blur-xs z-10">
          <div className="p-2 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-lg font-black shadow-xs">
            <Percent className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-blue-200 block">
              Agency Commission
            </span>
            <div className="flex items-center space-x-1.5">
              <input
                type="number"
                min="0"
                max="100"
                value={commissionRate}
                onChange={(e) => setCommissionRate(Number(e.target.value) || 0)}
                className="w-16 px-2 py-0.5 bg-white text-slate-900 font-black text-sm rounded border border-slate-300 text-center focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
              <span className="font-extrabold text-sm text-white">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Financial Summary Cards (Inward Money, Outward Money, Stock Out Money, 20% Commission, Total Handled) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
        {/* Card 1: Inward Money */}
        <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border-2 border-sky-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-sky-800 truncate">
                Money Inward
              </span>
              <div className="p-1.5 sm:p-2 bg-sky-100 text-sky-700 rounded-lg sm:rounded-xl flex-shrink-0">
                <ArrowDownLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <p className="text-xl sm:text-3xl font-black text-sky-900 truncate">
              {formatCurrency(accountingSummary.inwardMoneyTotal)}
            </p>
          </div>
          <div className="mt-2 pt-2 sm:mt-2.5 sm:pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between text-[10px] sm:text-[11px] font-bold text-slate-500 gap-0.5">
            <span className="truncate">Gross: {formatCurrency(accountingSummary.inwardGrossFreight)}</span>
            <span className="truncate text-orange-600">Comm: -{formatCurrency(accountingSummary.inwardCommission)}</span>
          </div>
        </div>

        {/* Card 2: Outward Money */}
        <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border-2 border-emerald-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-emerald-800 truncate">
                Money Outward
              </span>
              <div className="p-1.5 sm:p-2 bg-emerald-100 text-emerald-700 rounded-lg sm:rounded-xl flex-shrink-0">
                <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <p className="text-xl sm:text-3xl font-black text-emerald-900 truncate">
              {formatCurrency(accountingSummary.outwardMoneyTotal)}
            </p>
          </div>
          <div className="mt-2 pt-2 sm:mt-2.5 sm:pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between text-[10px] sm:text-[11px] font-bold text-slate-500 gap-0.5">
            <span className="truncate">To Pay: {formatCurrency(accountingSummary.outwardToPay)}</span>
            <span className="truncate">Paid: {formatCurrency(accountingSummary.outwardPaid)}</span>
          </div>
        </div>

        {/* Card 3: Stock Out Money */}
        <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border-2 border-purple-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-purple-800 truncate">
                Stock Out
              </span>
              <div className="p-1.5 sm:p-2 bg-purple-100 text-purple-700 rounded-lg sm:rounded-xl flex-shrink-0">
                <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <p className="text-xl sm:text-3xl font-black text-purple-900 truncate">
              {formatCurrency(accountingSummary.stockOutMoneyTotal)}
            </p>
          </div>
          <div className="mt-2 pt-2 sm:mt-2.5 sm:pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between text-[10px] sm:text-[11px] font-bold text-slate-500 gap-0.5">
            <span className="truncate">To Pay: {formatCurrency(accountingSummary.stockOutToPay)}</span>
            <span className="truncate">Paid: {formatCurrency(accountingSummary.stockOutPaid)}</span>
          </div>
        </div>

        {/* Card 4: Commission (20%) */}
        <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border-2 border-amber-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-amber-800">
              COMMISSION ({commissionRate}%)
            </span>
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xl sm:text-3xl font-black text-amber-900 truncate">
            {formatCurrency(accountingSummary.totalCommission20)}
          </p>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>Inward ({commissionRate}%): {formatCurrency(accountingSummary.inwardCommission)}</span>
            <span className="text-slate-400 font-medium">Inward Freight Only</span>
          </div>
        </div>

        {/* Card 5: Net Difference of Inward and Outward */}
        <div className="col-span-2 lg:col-span-1 bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border-2 border-emerald-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
              Net Difference (Inward - Outward)
            </span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xl sm:text-3xl font-black text-emerald-950 truncate">
            {formatCurrency(accountingSummary.netDifference)}
          </p>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>Inward: {formatCurrency(accountingSummary.inwardMoneyTotal)}</span>
            <span>Outward: {formatCurrency(accountingSummary.outwardMoneyTotal)}</span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation & Date Filter */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('all_accounting')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'all_accounting'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>All Inward, Outward & Stock Out ({allTransactions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('inward_money')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'inward_money'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Inward Money ({enrichedInwards.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('outward_money')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'outward_money'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Outward Money ({enrichedOutwards.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('stock_out_money')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'stock_out_money'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Shuffle className="w-4 h-4" />
              <span>Stock Out Money ({enrichedStockOuts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('commission_summary')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'commission_summary'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Percent className="w-4 h-4" />
              <span>Commission Breakdown (20%)</span>
            </button>
          </div>

          {/* Quick Date Range Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold self-start sm:self-auto">
            <span className="text-[10px] text-slate-500 uppercase px-2 font-black">Filter:</span>
            <button
              onClick={() => setDateFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                dateFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setDateFilter('today')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                dateFilter === 'today'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('week')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                dateFilter === 'week'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                dateFilter === 'month'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Month
            </button>
          </div>
        </div>

        {/* Tab 1: All Inward, Outward & Stock Out Transactions */}
        {activeTab === 'all_accounting' && (
          <DataTable
            columns={accountingColumns}
            data={allTransactions}
            searchPlaceholder="Search Inward, Outward & Stock Out Accounting by Receipt No, Vehicle No..."
            onExportExcel={(data) => exportToExcel(data, 'Accounting_All_Transactions', accountingColumns)}
            onExportPDF={(data) =>
              exportToPDF(
                'Inward, Outward & Stock Out Accounting Statement',
                accountingColumns,
                data,
                'Accounting_All_Transactions'
              )
            }
          />
        )}

        {/* Tab 2: Inward Money */}
        {activeTab === 'inward_money' && (
          <DataTable
            columns={accountingColumns}
            data={enrichedInwards}
            searchPlaceholder="Search Inward Money by Inward No, Vehicle No..."
            onExportExcel={(data) => exportToExcel(data, 'Accounting_Inward_Money', accountingColumns)}
            onExportPDF={(data) =>
              exportToPDF(
                'Inward Money Accounting Statement',
                accountingColumns,
                data,
                'Accounting_Inward_Money'
              )
            }
          />
        )}

        {/* Tab 3: Outward Money */}
        {activeTab === 'outward_money' && (
          <DataTable
            columns={outwardColumns}
            data={enrichedOutwards}
            searchPlaceholder="Search Outward Money by Outward No, Vehicle No..."
            onExportExcel={(data) => exportToExcel(data, 'Accounting_Outward_Money', outwardColumns)}
            onExportPDF={(data) =>
              exportToPDF(
                'Outward Money Accounting Statement',
                outwardColumns,
                data,
                'Accounting_Outward_Money'
              )
            }
          />
        )}

        {/* Tab 4: Stock Out Money */}
        {activeTab === 'stock_out_money' && (
          <DataTable
            columns={outwardColumns}
            data={enrichedStockOuts}
            searchPlaceholder="Search Stock Out Money by Stock Out No, Vehicle No..."
            onExportExcel={(data) => exportToExcel(data, 'Accounting_Stock_Out_Money', outwardColumns)}
            onExportPDF={(data) =>
              exportToPDF(
                'Stock Out Money Accounting Statement',
                outwardColumns,
                data,
                'Accounting_Stock_Out_Money'
              )
            }
          />
        )}

        {/* Tab 5: Commission Summary Breakdown (20%) */}
        {activeTab === 'commission_summary' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center space-x-2">
                <Percent className="w-5 h-5 text-amber-600" />
                <span>Agency Commission Statement @ {commissionRate}%</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Detailed comparison of money inward, outward dispatches, stock out entries, and 20% agency commission
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              <div className="bg-sky-50 border border-sky-200 p-3 sm:p-4 rounded-xl space-y-1.5 sm:space-y-2">
                <span className="text-xs font-bold text-sky-800 uppercase block">
                  Inward Commission (20%)
                </span>
                <p className="text-lg sm:text-2xl font-black text-sky-950 truncate">
                  {formatCurrency(accountingSummary.inwardCommission)}
                </p>
                <div className="text-[11px] text-sky-700 font-semibold space-y-0.5 pt-2 border-t border-sky-200/80">
                  <p>Inward Total Money: {formatCurrency(accountingSummary.inwardMoneyTotal)}</p>
                  <p>Receipts Count: {enrichedInwards.length}</p>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-3 sm:p-4 rounded-xl space-y-1.5 sm:space-y-2">
                <span className="text-xs font-bold text-emerald-800 uppercase block">
                  Outward (No Commission)
                </span>
                <p className="text-lg sm:text-2xl font-black text-emerald-950 truncate">
                  {formatCurrency(0)}
                </p>
                <div className="text-[11px] text-emerald-700 font-semibold space-y-0.5 pt-2 border-t border-emerald-200/80">
                  <p>Outward Total Money: {formatCurrency(accountingSummary.outwardMoneyTotal)}</p>
                  <p>Commission: ₹0.00 (Inward Only)</p>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 p-3 sm:p-4 rounded-xl space-y-1.5 sm:space-y-2">
                <span className="text-xs font-bold text-purple-800 uppercase block">
                  Stock Out (No Commission)
                </span>
                <p className="text-lg sm:text-2xl font-black text-purple-950 truncate">
                  {formatCurrency(0)}
                </p>
                <div className="text-[11px] text-purple-700 font-semibold space-y-0.5 pt-2 border-t border-purple-200/80">
                  <p>Stock Out Total Money: {formatCurrency(accountingSummary.stockOutMoneyTotal)}</p>
                  <p>Commission: ₹0.00 (Inward Only)</p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-300 p-3 sm:p-4 rounded-xl space-y-1.5 sm:space-y-2">
                <span className="text-xs font-bold text-amber-900 uppercase block">
                  Total Commission Earned
                </span>
                <p className="text-lg sm:text-2xl font-black text-amber-950 truncate">
                  {formatCurrency(accountingSummary.totalCommission20)}
                </p>
                <div className="text-[11px] text-amber-800 font-semibold space-y-0.5 pt-2 border-t border-amber-200/80">
                  <p>Total Handled: {formatCurrency(accountingSummary.totalFreightHandled)}</p>
                  <p>Commission Rate: {commissionRate}% (Inward Only)</p>
                </div>
              </div>
            </div>

            {/* Mobile View: Clean Touch Cards (NO Horizontal Scrolling) */}
            <div className="sm:hidden divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="p-3.5 space-y-2 bg-white">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-sky-700">Inward Freight</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                    Comm ({commissionRate}%): {formatCurrency(accountingSummary.inwardCommission)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                  <span>{enrichedInwards.length} Receipts</span>
                  <span className="font-black text-slate-900">Total: {formatCurrency(accountingSummary.inwardMoneyTotal)}</span>
                </div>
                <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-100 text-[10px] text-slate-500 font-bold">
                  <span>ToPay: {formatCurrency(accountingSummary.inwardToPay)}</span>
                  <span>TBB: {formatCurrency(accountingSummary.inwardTbb)}</span>
                  <span>Paid: {formatCurrency(accountingSummary.inwardPaid)}</span>
                </div>
              </div>

              <div className="p-3.5 space-y-2 bg-white">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-emerald-700">Outward Freight</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-500">
                    No Commission
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                  <span>{enrichedOutwards.length} Dispatches</span>
                  <span className="font-black text-slate-900">Total: {formatCurrency(accountingSummary.outwardMoneyTotal)}</span>
                </div>
                <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-100 text-[10px] text-slate-500 font-bold">
                  <span>ToPay: {formatCurrency(accountingSummary.outwardToPay)}</span>
                  <span>TBB: {formatCurrency(accountingSummary.outwardTbb)}</span>
                  <span>Paid: {formatCurrency(accountingSummary.outwardPaid)}</span>
                </div>
              </div>

              <div className="p-3.5 space-y-2 bg-white">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-purple-700">Stock Out Freight</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-500">
                    No Commission
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                  <span>{enrichedStockOuts.length} Stock Outs</span>
                  <span className="font-black text-slate-900">Total: {formatCurrency(accountingSummary.stockOutMoneyTotal)}</span>
                </div>
                <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-100 text-[10px] text-slate-500 font-bold">
                  <span>ToPay: {formatCurrency(accountingSummary.stockOutToPay)}</span>
                  <span>TBB: {formatCurrency(accountingSummary.stockOutTbb)}</span>
                  <span>Paid: {formatCurrency(accountingSummary.stockOutPaid)}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-900 text-white flex items-center justify-between text-xs font-bold">
                <span>Total Handled: {formatCurrency(accountingSummary.totalFreightHandled)}</span>
                <span className="text-amber-400 font-black">Net Comm: {formatCurrency(accountingSummary.totalCommission20)}</span>
              </div>
            </div>

            {/* Desktop View: Multi-column Table */}
            <div className="hidden sm:block border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-800 font-black uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">Stream</th>
                    <th className="p-3">Entries Count</th>
                    <th className="p-3">To Pay Freight</th>
                    <th className="p-3">T.B.B Freight</th>
                    <th className="p-3">Paid Freight</th>
                    <th className="p-3 font-black text-amber-800">Commission ({commissionRate}%)</th>
                    <th className="p-3 font-black">Total Money</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-black text-sky-700">Inward Freight</td>
                    <td className="p-3">{enrichedInwards.length}</td>
                    <td className="p-3">{formatCurrency(accountingSummary.inwardToPay)}</td>
                    <td className="p-3">{formatCurrency(accountingSummary.inwardTbb)}</td>
                    <td className="p-3">{formatCurrency(accountingSummary.inwardPaid)}</td>
                    <td className="p-3 font-black text-amber-700">
                      {formatCurrency(accountingSummary.inwardCommission)}
                    </td>
                    <td className="p-3 font-black text-slate-900">
                      {formatCurrency(accountingSummary.inwardMoneyTotal)}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-black text-emerald-700">Outward Freight</td>
                    <td className="p-3">{enrichedOutwards.length}</td>
                    <td className="p-3">{formatCurrency(accountingSummary.outwardToPay)}</td>
                    <td className="p-3">{formatCurrency(accountingSummary.outwardTbb)}</td>
                    <td className="p-3">{formatCurrency(accountingSummary.outwardPaid)}</td>
                    <td className="p-3 font-black text-slate-500">
                      ₹0.00 (No Comm)
                    </td>
                    <td className="p-3 font-black text-slate-900">
                      {formatCurrency(accountingSummary.outwardMoneyTotal)}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-black text-purple-700">Stock Out Freight</td>
                    <td className="p-3">{enrichedStockOuts.length}</td>
                    <td className="p-3">{formatCurrency(accountingSummary.stockOutToPay)}</td>
                    <td className="p-3">{formatCurrency(accountingSummary.stockOutTbb)}</td>
                    <td className="p-3">{formatCurrency(accountingSummary.stockOutPaid)}</td>
                    <td className="p-3 font-black text-slate-500">
                      ₹0.00 (No Comm)
                    </td>
                    <td className="p-3 font-black text-slate-900">
                      {formatCurrency(accountingSummary.stockOutMoneyTotal)}
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td className="p-3 uppercase">Total Handled</td>
                    <td className="p-3">{enrichedInwards.length + enrichedOutwards.length + enrichedStockOuts.length}</td>
                    <td className="p-3">
                      {formatCurrency(
                        accountingSummary.inwardToPay +
                          accountingSummary.outwardToPay +
                          accountingSummary.stockOutToPay
                      )}
                    </td>
                    <td className="p-3">
                      {formatCurrency(
                        accountingSummary.inwardTbb +
                          accountingSummary.outwardTbb +
                          accountingSummary.stockOutTbb
                      )}
                    </td>
                    <td className="p-3">
                      {formatCurrency(
                        accountingSummary.inwardPaid +
                          accountingSummary.outwardPaid +
                          accountingSummary.stockOutPaid
                      )}
                    </td>
                    <td className="p-3 font-black text-amber-800 text-sm">
                      {formatCurrency(accountingSummary.totalCommission20)}
                    </td>
                    <td className="p-3 font-black text-indigo-900 text-sm">
                      {formatCurrency(
                        accountingSummary.inwardMoneyTotal +
                          accountingSummary.outwardMoneyTotal +
                          accountingSummary.stockOutMoneyTotal
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* VIEW DETAILS MODAL */}
      {viewingRecord && (
        <Modal
          isOpen={!!viewingRecord}
          onClose={() => setViewingRecord(null)}
          title={`${viewingRecord.type} Money & Commission Details #${viewingRecord.receiptNo}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs font-semibold">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Type</span>
                <span className="font-black text-slate-900 text-xs">{viewingRecord.type}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Receipt No.</span>
                <span className="font-black text-slate-900 text-xs">{viewingRecord.receiptNo}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Date</span>
                <span className="font-bold text-slate-800">{formatDate(viewingRecord.date)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Vehicle No.</span>
                <span className="font-bold text-slate-800">{viewingRecord.vehicleNo || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Packages</span>
                <span className="font-black text-slate-900">{viewingRecord.totalQty || 0} Pkgs</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">To Pay</span>
                <span className="font-bold text-amber-700">{formatCurrency(viewingRecord.totalToPay)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">T.B.B</span>
                <span className="font-bold text-sky-700">{formatCurrency(viewingRecord.totalTbb)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Paid</span>
                <span className="font-bold text-emerald-700">{formatCurrency(viewingRecord.totalPaid)}</span>
              </div>
              {viewingRecord.type === 'INWARD' && (
                <div className="col-span-2 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  <span className="text-amber-700 font-bold uppercase block text-[10px]">
                    COMMISSION ({commissionRate}%)
                  </span>
                  <span className="font-black text-amber-800 text-base">
                    {formatCurrency(viewingRecord.commissionAmount)}
                  </span>
                </div>
              )}
              <div className={`${viewingRecord.type === 'INWARD' ? 'col-span-2' : 'col-span-4'} bg-slate-100 p-2.5 rounded-lg border border-slate-200`}>
                <span className="text-slate-500 font-bold uppercase block text-[10px]">
                  {viewingRecord.type === 'INWARD' ? 'Total Money (After Commission)' : 'Total Money'}
                </span>
                <span className="font-black text-slate-900 text-base">
                  {formatCurrency(viewingRecord.totalMoney)}
                </span>
              </div>
            </div>

            {/* Sub-items table */}
            {viewingRecord.items && viewingRecord.items.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-black text-slate-700 uppercase tracking-wider text-[11px]">
                  LR Breakdown & Calculations
                </h4>
                {/* Mobile Cards (sm:hidden) */}
                <div className="sm:hidden space-y-2 max-h-56 overflow-y-auto pr-0.5">
                  {viewingRecord.items.map((lr, idx) => {
                    const lrFreight =
                      (Number(lr.toPayAmount) || 0) +
                      (Number(lr.tbbAmount) || 0) +
                      (Number(lr.paidAmount) || 0);
                    const lrComm =
                      viewingRecord.type === 'INWARD' ? lrFreight * commMultiplier : 0;
                    return (
                      <div key={lr.id || idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-sky-800">LR #{lr.lrNo}</span>
                          <span className="font-bold text-slate-600">{lr.pkg} PKG</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-500 pt-1">
                          <div>To Pay: <span className="font-bold text-slate-700">{formatCurrency(lr.toPayAmount)}</span></div>
                          <div>T.B.B: <span className="font-bold text-slate-700">{formatCurrency(lr.tbbAmount)}</span></div>
                          <div>Paid: <span className="font-bold text-slate-700">{formatCurrency(lr.paidAmount)}</span></div>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200 font-black text-[11px]">
                          <span>Freight: {formatCurrency(lrFreight)}</span>
                          {viewingRecord.type === 'INWARD' && (
                            <span className="text-amber-700">Comm: {formatCurrency(lrComm)}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table (hidden sm:block) */}
                <div className="hidden sm:block border border-slate-200 rounded-xl overflow-x-auto max-h-56">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-100 text-slate-700 font-black uppercase border-b border-slate-200">
                      <tr>
                        <th className="p-2">LR No.</th>
                        <th className="p-2">PKG</th>
                        <th className="p-2">To Pay</th>
                        <th className="p-2">T.B.B</th>
                        <th className="p-2">Paid</th>
                        <th className="p-2">Total Freight</th>
                        {viewingRecord.type === 'INWARD' && (
                          <th className="p-2 text-amber-800">Comm ({commissionRate}%)</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold">
                      {viewingRecord.items.map((lr, idx) => {
                        const lrFreight =
                          (Number(lr.toPayAmount) || 0) +
                          (Number(lr.tbbAmount) || 0) +
                          (Number(lr.paidAmount) || 0);
                        const lrComm =
                          viewingRecord.type === 'INWARD' ? lrFreight * commMultiplier : 0;
                        return (
                          <tr key={lr.id || idx} className="hover:bg-slate-50">
                            <td className="p-2 font-black text-sky-800">{lr.lrNo}</td>
                            <td className="p-2">{lr.pkg}</td>
                            <td className="p-2">{formatCurrency(lr.toPayAmount)}</td>
                            <td className="p-2">{formatCurrency(lr.tbbAmount)}</td>
                            <td className="p-2">{formatCurrency(lr.paidAmount)}</td>
                            <td className="p-2 font-black text-slate-900">{formatCurrency(lrFreight)}</td>
                            {viewingRecord.type === 'INWARD' && (
                              <td className="p-2 font-black text-amber-700">{formatCurrency(lrComm)}</td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => handlePrintAccountingStatement(viewingRecord)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center cursor-pointer"
              >
                <Printer className="w-4 h-4 mr-1.5" />
                <span>Print Statement</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingRecord(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Accounting;
