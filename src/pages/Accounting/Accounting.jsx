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
} from 'lucide-react';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { exportToExcel, exportToPDF, printRecordDetails } from '../../services/exportService';
import { formatDate } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/numberUtils';

export const Accounting = () => {
  const { inwards, inwardItems, outwards, outwardItems } = useApp();

  // Active view tab: 'all_accounting' | 'inward_money' | 'outward_money' | 'commission_summary'
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

        const totalMoney = totalToPay + totalTbb + totalPaid;
        const commissionAmount = totalMoney * commMultiplier;
        const netAmount = totalMoney - commissionAmount;

        return {
          ...inw,
          id: inw.id || `inw-${inw.inwardNo}`,
          type: 'INWARD',
          receiptNo: inw.inwardNo,
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
  }, [inwards, inwardItems, dateFilter, commMultiplier, commissionRate]);

  // 2. Enrich Outward receipts with live items totals and 20% Commission
  const enrichedOutwards = useMemo(() => {
    return outwards
      .filter((out) => isDateInFilter(out.date))
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
        const commissionAmount = totalMoney * commMultiplier;
        const netAmount = totalMoney - commissionAmount;

        return {
          ...out,
          id: out.id || `out-${out.outwardNo}`,
          type: out.isCrossOutward ? 'STOCK OUT' : 'OUTWARD',
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
  }, [outwards, outwardItems, dateFilter, commMultiplier, commissionRate]);

  // 3. Combined Inward & Outward Transactions
  const allTransactions = useMemo(() => {
    const combined = [...enrichedInwards, ...enrichedOutwards];
    combined.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return combined;
  }, [enrichedInwards, enrichedOutwards]);

  // 4. Financial KPI Totals
  const accountingSummary = useMemo(() => {
    // Inward Calculations
    const inwardMoneyTotal = enrichedInwards.reduce((acc, curr) => acc + curr.totalMoney, 0);
    const inwardToPay = enrichedInwards.reduce((acc, curr) => acc + curr.totalToPay, 0);
    const inwardTbb = enrichedInwards.reduce((acc, curr) => acc + curr.totalTbb, 0);
    const inwardPaid = enrichedInwards.reduce((acc, curr) => acc + curr.totalPaid, 0);
    const inwardCommission = inwardMoneyTotal * commMultiplier;

    // Outward Calculations
    const outwardMoneyTotal = enrichedOutwards.reduce((acc, curr) => acc + curr.totalMoney, 0);
    const outwardToPay = enrichedOutwards.reduce((acc, curr) => acc + curr.totalToPay, 0);
    const outwardTbb = enrichedOutwards.reduce((acc, curr) => acc + curr.totalTbb, 0);
    const outwardPaid = enrichedOutwards.reduce((acc, curr) => acc + curr.totalPaid, 0);
    const outwardCommission = outwardMoneyTotal * commMultiplier;

    // Combined Totals
    const totalFreightHandled = inwardMoneyTotal + outwardMoneyTotal;
    const totalCommission20 = inwardCommission + outwardCommission;
    const netDifference = inwardMoneyTotal - outwardMoneyTotal;

    return {
      inwardMoneyTotal,
      inwardToPay,
      inwardTbb,
      inwardPaid,
      inwardCommission,
      outwardMoneyTotal,
      outwardToPay,
      outwardTbb,
      outwardPaid,
      outwardCommission,
      totalFreightHandled,
      totalCommission20,
      netDifference,
    };
  }, [enrichedInwards, enrichedOutwards, commMultiplier]);

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
        { label: 'Total Freight Money', value: formatCurrency(row.totalMoney) },
        { label: `Commission (${commissionRate}%)`, value: formatCurrency(row.commissionAmount) },
        { label: 'Net Payable / Balance', value: formatCurrency(row.netAmount) },
      ],
      items: row.items,
    });
  };

  // Table Columns Definition
  const accountingColumns = [
    { label: 'Date', key: 'date', type: 'date' },
    {
      label: 'Type',
      key: 'type',
      render: (row) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-black ${
            row.type === 'INWARD'
              ? 'bg-sky-100 text-sky-800 border border-sky-300'
              : row.type === 'STOCK OUT'
              ? 'bg-purple-100 text-purple-800 border border-purple-300'
              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
          }`}
        >
          {row.type === 'INWARD' ? (
            <ArrowDownLeft className="w-3 h-3 mr-1 text-sky-600" />
          ) : (
            <ArrowUpRight className="w-3 h-3 mr-1 text-emerald-600" />
          )}
          {row.type}
        </span>
      ),
    },
    {
      label: 'Receipt No.',
      key: 'receiptNo',
      render: (row) => <span className="font-extrabold text-slate-900">{row.receiptNo}</span>,
    },
    { label: 'Vehicle No.', key: 'vehicleNo', render: (row) => row.vehicleNo || '-' },
    { label: 'PKG', key: 'totalQty' },
    { label: 'To Pay', key: 'totalToPay', type: 'currency' },
    { label: 'T.B.B', key: 'totalTbb', type: 'currency' },
    { label: 'Paid', key: 'totalPaid', type: 'currency' },
    {
      label: 'Total Money',
      key: 'totalMoney',
      render: (row) => (
        <span className="font-black text-slate-900 text-xs">
          {formatCurrency(row.totalMoney)}
        </span>
      ),
    },
    {
      label: `COMMISSION (${commissionRate}%)`,
      key: 'commissionAmount',
      render: (row) => (
        <span className="font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          {formatCurrency(row.commissionAmount)}
        </span>
      ),
    },
    {
      label: 'Net Balance',
      key: 'netAmount',
      render: (row) => (
        <span className="font-bold text-slate-700">
          {formatCurrency(row.netAmount)}
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

  return (
    <div className="space-y-6 text-slate-800 max-w-full">
      {/* Top Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2 text-[11px] font-bold tracking-wider uppercase">
            <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center">
              <Calculator className="w-3.5 h-3.5 mr-1" />
              TRANSPORT FREIGHT ACCOUNTING
            </span>
            <span className="text-slate-400 font-semibold">&bull; ATHAHAR ROADWAYS SANGLI</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center space-x-3">
            <span>Inward & Outward Money Calculation</span>
          </h2>

          <p className="text-slate-500 text-xs sm:text-sm font-medium">
            Live calculation of Total Money Inward, Total Money Outward, and 20% Agency Commission
          </p>
        </div>

        {/* Commission Rate Configurator Pill */}
        <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl flex items-center space-x-3 self-start md:self-auto shadow-xs">
          <div className="p-2 bg-amber-500 text-white rounded-lg font-black shadow-xs">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
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
              <span className="font-extrabold text-sm text-slate-700">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Financial Summary Cards (Inward Money, Outward Money, 20% Commission) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Inward Money */}
        <div className="bg-white p-5 rounded-2xl border-2 border-sky-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-sky-800">
              Total Money Inward
            </span>
            <div className="p-2 bg-sky-100 text-sky-700 rounded-xl">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-sky-900">
            {formatCurrency(accountingSummary.inwardMoneyTotal)}
          </p>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>To Pay: {formatCurrency(accountingSummary.inwardToPay)}</span>
            <span>Paid: {formatCurrency(accountingSummary.inwardPaid)}</span>
          </div>
        </div>

        {/* Card 2: Outward Money */}
        <div className="bg-white p-5 rounded-2xl border-2 border-emerald-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
              Total Money Outward
            </span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-900">
            {formatCurrency(accountingSummary.outwardMoneyTotal)}
          </p>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>To Pay: {formatCurrency(accountingSummary.outwardToPay)}</span>
            <span>Paid: {formatCurrency(accountingSummary.outwardPaid)}</span>
          </div>
        </div>

        {/* Card 3: Commission (20%) */}
        <div className="bg-white p-5 rounded-2xl border-2 border-amber-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-amber-800">
              COMMISSION ({commissionRate}%)
            </span>
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-900">
            {formatCurrency(accountingSummary.totalCommission20)}
          </p>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>Inward: {formatCurrency(accountingSummary.inwardCommission)}</span>
            <span>Outward: {formatCurrency(accountingSummary.outwardCommission)}</span>
          </div>
        </div>

        {/* Card 4: Total Turnover */}
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              Total Freight Handled
            </span>
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">
            {formatCurrency(accountingSummary.totalFreightHandled)}
          </p>
          <p className="text-[11px] font-bold text-slate-500 mt-2.5 pt-2 border-t border-slate-100">
            Net Difference (In - Out): {formatCurrency(accountingSummary.netDifference)}
          </p>
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
              <span>All Inward & Outward ({allTransactions.length})</span>
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

        {/* Tab 1: All Inward & Outward Transactions with 20% Commission */}
        {activeTab === 'all_accounting' && (
          <DataTable
            columns={accountingColumns}
            data={allTransactions}
            searchPlaceholder="Search Inward & Outward Accounting by Receipt No, Vehicle No..."
            onExportExcel={(data) => exportToExcel(data, 'Accounting_All_Transactions', accountingColumns)}
            onExportPDF={(data) =>
              exportToPDF(
                'Inward and Outward Accounting Statement',
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
            columns={accountingColumns}
            data={enrichedOutwards}
            searchPlaceholder="Search Outward Money by Outward No, Vehicle No..."
            onExportExcel={(data) => exportToExcel(data, 'Accounting_Outward_Money', accountingColumns)}
            onExportPDF={(data) =>
              exportToPDF(
                'Outward Money Accounting Statement',
                accountingColumns,
                data,
                'Accounting_Outward_Money'
              )
            }
          />
        )}

        {/* Tab 4: Commission Summary Breakdown (20%) */}
        {activeTab === 'commission_summary' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center space-x-2">
                <Percent className="w-5 h-5 text-amber-600" />
                <span>Agency Commission Statement @ {commissionRate}%</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Detailed comparison of money inward, money outward, and the 20% commission earned
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-sky-50 border border-sky-200 p-4 rounded-xl space-y-2">
                <span className="text-xs font-bold text-sky-800 uppercase block">
                  Inward Commission (20%)
                </span>
                <p className="text-2xl font-black text-sky-950">
                  {formatCurrency(accountingSummary.inwardCommission)}
                </p>
                <div className="text-[11px] text-sky-700 font-semibold space-y-0.5 pt-2 border-t border-sky-200/80">
                  <p>Inward Total Money: {formatCurrency(accountingSummary.inwardMoneyTotal)}</p>
                  <p>Receipts Count: {enrichedInwards.length}</p>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-2">
                <span className="text-xs font-bold text-emerald-800 uppercase block">
                  Outward Commission (20%)
                </span>
                <p className="text-2xl font-black text-emerald-950">
                  {formatCurrency(accountingSummary.outwardCommission)}
                </p>
                <div className="text-[11px] text-emerald-700 font-semibold space-y-0.5 pt-2 border-t border-emerald-200/80">
                  <p>Outward Total Money: {formatCurrency(accountingSummary.outwardMoneyTotal)}</p>
                  <p>Receipts Count: {enrichedOutwards.length}</p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl space-y-2">
                <span className="text-xs font-bold text-amber-900 uppercase block">
                  Total Commission Earned
                </span>
                <p className="text-2xl font-black text-amber-950">
                  {formatCurrency(accountingSummary.totalCommission20)}
                </p>
                <div className="text-[11px] text-amber-800 font-semibold space-y-0.5 pt-2 border-t border-amber-200/80">
                  <p>Total Business Handled: {formatCurrency(accountingSummary.totalFreightHandled)}</p>
                  <p>Commission Rate: {commissionRate}%</p>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-800 font-black uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">Stream</th>
                    <th className="p-3">Entries Count</th>
                    <th className="p-3">To Pay Freight</th>
                    <th className="p-3">T.B.B Freight</th>
                    <th className="p-3">Paid Freight</th>
                    <th className="p-3 font-black">Total Money</th>
                    <th className="p-3 font-black text-amber-800">Commission ({commissionRate}%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-black text-sky-700">Inward Freight</td>
                    <td className="p-3">{enrichedInwards.length}</td>
                    <td className="p-3">{formatCurrency(accountingSummary.inwardToPay)}</td>
                    <td className="p-3">{formatCurrency(accountingSummary.inwardTbb)}</td>
                    <td className="p-3">{formatCurrency(accountingSummary.inwardPaid)}</td>
                    <td className="p-3 font-black text-slate-900">
                      {formatCurrency(accountingSummary.inwardMoneyTotal)}
                    </td>
                    <td className="p-3 font-black text-amber-700">
                      {formatCurrency(accountingSummary.inwardCommission)}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-black text-emerald-700">Outward Freight</td>
                    <td className="p-3">{enrichedOutwards.length}</td>
                    <td className="p-3">{formatCurrency(accountingSummary.outwardToPay)}</td>
                    <td className="p-3">{formatCurrency(accountingSummary.outwardTbb)}</td>
                    <td className="p-3">{formatCurrency(accountingSummary.outwardPaid)}</td>
                    <td className="p-3 font-black text-slate-900">
                      {formatCurrency(accountingSummary.outwardMoneyTotal)}
                    </td>
                    <td className="p-3 font-black text-amber-700">
                      {formatCurrency(accountingSummary.outwardCommission)}
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td className="p-3 uppercase">Total Handled</td>
                    <td className="p-3">{enrichedInwards.length + enrichedOutwards.length}</td>
                    <td className="p-3">{formatCurrency(accountingSummary.inwardToPay + accountingSummary.outwardToPay)}</td>
                    <td className="p-3">{formatCurrency(accountingSummary.inwardTbb + accountingSummary.outwardTbb)}</td>
                    <td className="p-3">{formatCurrency(accountingSummary.inwardPaid + accountingSummary.outwardPaid)}</td>
                    <td className="p-3 font-black text-indigo-900 text-sm">
                      {formatCurrency(accountingSummary.totalFreightHandled)}
                    </td>
                    <td className="p-3 font-black text-amber-800 text-sm">
                      {formatCurrency(accountingSummary.totalCommission20)}
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
              <div className="col-span-2 bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-bold uppercase block text-[10px]">Total Money</span>
                <span className="font-black text-slate-900 text-base">
                  {formatCurrency(viewingRecord.totalMoney)}
                </span>
              </div>
              <div className="col-span-2 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                <span className="text-amber-700 font-bold uppercase block text-[10px]">
                  COMMISSION ({commissionRate}%)
                </span>
                <span className="font-black text-amber-800 text-base">
                  {formatCurrency(viewingRecord.commissionAmount)}
                </span>
              </div>
            </div>

            {/* Sub-items table */}
            {viewingRecord.items && viewingRecord.items.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-black text-slate-700 uppercase tracking-wider text-[11px]">
                  LR Breakdown & Calculations
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-56">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-100 text-slate-700 font-black uppercase border-b border-slate-200">
                      <tr>
                        <th className="p-2">LR No.</th>
                        <th className="p-2">PKG</th>
                        <th className="p-2">To Pay</th>
                        <th className="p-2">T.B.B</th>
                        <th className="p-2">Paid</th>
                        <th className="p-2">Total Freight</th>
                        <th className="p-2 text-amber-800">Comm (20%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold">
                      {viewingRecord.items.map((lr, idx) => {
                        const lrFreight =
                          (Number(lr.toPayAmount) || 0) +
                          (Number(lr.tbbAmount) || 0) +
                          (Number(lr.paidAmount) || 0);
                        const lrComm = lrFreight * commMultiplier;
                        return (
                          <tr key={lr.id || idx} className="hover:bg-slate-50">
                            <td className="p-2 font-black text-sky-800">{lr.lrNo}</td>
                            <td className="p-2">{lr.pkg}</td>
                            <td className="p-2">{formatCurrency(lr.toPayAmount)}</td>
                            <td className="p-2">{formatCurrency(lr.tbbAmount)}</td>
                            <td className="p-2">{formatCurrency(lr.paidAmount)}</td>
                            <td className="p-2 font-black text-slate-900">{formatCurrency(lrFreight)}</td>
                            <td className="p-2 font-black text-amber-700">{formatCurrency(lrComm)}</td>
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
