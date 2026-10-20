import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { FileText, Eye, FileSpreadsheet, Printer, Package, Wallet, CheckCircle2 } from 'lucide-react';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { exportToExcel, exportToPDF, printRecordDetails } from '../../services/exportService';
import { formatDate } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/numberUtils';

export const Reports = () => {
  const { inwards, inwardItems, pendingStock, outwardItems } = useApp();
  const [reportType, setReportType] = useState('inward'); // 'inward' | 'pending' | 'delivered'
  const [viewingRecord, setViewingRecord] = useState(null);

  const handleExportRowExcel = (row) => {
    const cols = columns.filter((c) => c.key !== 'actions');
    exportToExcel([row], `Report_LR_${row.lrNo}`, cols);
  };

  const handlePrintRecord = (row) => {
    printRecordDetails({
      title: `LR Report Details #${row.lrNo}`,
      fields: [
        { label: 'LR No.', value: row.lrNo },
        { label: 'Inward Date', value: formatDate(row.inwardDate || row.date) },
        { label: 'Outward Date', value: formatDate(row.outwardDate) },
        { label: 'Memo No.', value: row.memoNo || '-' },
        { label: 'CT To', value: row.ctTo || '-' },
        { label: 'Status', value: row.status },
        { label: 'Consignor', value: row.consignorName || '-' },
        { label: 'Consignee', value: row.consigneeName || '-' },
        { label: 'Packages', value: `${row.pkg || 0} Pkgs` },
        { label: 'To Pay', value: formatCurrency(row.toPayAmount) },
        { label: 'T.B.B', value: formatCurrency(row.tbbAmount) },
        { label: 'Paid', value: formatCurrency(row.paidAmount) },
      ],
    });
  };

  const columns = [
    {
      label: 'LR No.',
      key: 'lrNo',
      render: (row) => (
        <span className="font-extrabold text-[#1d4ed8] tracking-tight bg-blue-50/70 border border-blue-200/60 px-2 py-0.5 rounded">
          {row.lrNo}
        </span>
      ),
    },
    { label: 'Inward Date', key: 'inwardDate', type: 'date' },
    { label: 'Outward Date', key: 'outwardDate', type: 'date' },
    {
      label: 'Memo No.',
      key: 'memoNo',
      render: (row) => (
        <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">
          {row.memoNo || '-'}
        </span>
      ),
    },
    { label: 'CT To', key: 'ctTo' },
    { label: 'Consignor', key: 'consignorName' },
    { label: 'Consignee', key: 'consigneeName' },
    {
      label: 'PKG',
      key: 'pkg',
      render: (row) => (
        <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
          {row.pkg || 0}
        </span>
      ),
    },
    { label: 'To Pay', key: 'toPayAmount', type: 'currency' },
    { label: 'T.B.B', key: 'tbbAmount', type: 'currency' },
    { label: 'Paid', key: 'paidAmount', type: 'currency' },
    { label: 'Status', key: 'status', type: 'status', width: 'min-w-[96px]' },
    {
      label: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex items-center justify-center space-x-1">
          <button
            onClick={() => setViewingRecord(row)}
            className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
            title="View LR Details"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  let rawData = inwardItems;
  let reportTitle = 'All Inward Items Report';

  if (reportType === 'pending') {
    rawData = pendingStock;
    reportTitle = 'Pending Stock Register';
  } else if (reportType === 'delivered') {
    rawData = outwardItems;
    reportTitle = 'Completed Deliveries Report';
  }

  const currentData = rawData.map((item) => {
    if (item.memoNo) return item;
    const parentInw = inwards?.find((inw) => inw.id === item.inwardId || inw.inwardNo === item.inwardNo);
    const matchingInwItem = inwardItems?.find((inwItem) => inwItem.lrNo === item.lrNo);
    return {
      ...item,
      memoNo: item.memoNo || matchingInwItem?.memoNo || parentInw?.memoNo || '-',
    };
  });

  const totalRecords = currentData.length;
  const totalPackages = currentData.reduce((sum, item) => sum + (Number(item.pkg) || 0), 0);
  const totalToPay = currentData.reduce((sum, item) => sum + (Number(item.toPayAmount) || 0), 0);
  const totalPaid = currentData.reduce((sum, item) => sum + (Number(item.paidAmount) || 0), 0);
  const totalTbb = currentData.reduce((sum, item) => sum + (Number(item.tbbAmount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* ROYAL NAVY & ORANGE HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#07182e] via-[#0b2545] to-[#133e87] p-6 text-white shadow-xl border border-blue-900/40">
        <div className="h-1 highway-accent-line absolute top-0 left-0 right-0" />
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-extrabold tracking-widest uppercase text-orange-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>ANALYTICS & AUDIT HUB</span>
              <span className="text-blue-200/50">•</span>
              <span className="text-blue-100 font-mono">FINANCIAL AUDIT ENGINE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
              Transport Performance Reports
            </h1>
            <p className="text-xs text-blue-100/80 mt-1 max-w-xl font-medium">
              Inspect historical LR movements, reconcile pending freight receivables, and export detailed spreadsheets.
            </p>
          </div>

          {/* Quick Filter Switcher Pills */}
          <div className="flex items-center p-1 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 self-start md:self-auto text-xs font-bold">
            <button
              onClick={() => setReportType('inward')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                reportType === 'inward'
                  ? 'bg-white text-[#0b2545] shadow-md font-black'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              Inward Register
            </button>
            <button
              onClick={() => setReportType('pending')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                reportType === 'pending'
                  ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md font-black'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              Pending Stock
            </button>
            <button
              onClick={() => setReportType('delivered')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                reportType === 'delivered'
                  ? 'bg-emerald-500 text-white shadow-md font-black'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              Delivered Registry
            </button>
          </div>
        </div>
      </div>

      {/* 4 SUMMARY METRIC KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Registry Count */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              {reportType === 'inward'
                ? 'TOTAL INWARD LRS'
                : reportType === 'pending'
                ? 'PENDING GODOWN STOCK'
                : 'DISPATCHED LRS'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">{totalRecords}</div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Active report records</div>
          </div>
        </div>

        {/* Card 2: Total Package Volume */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">TOTAL PACKAGES</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">{totalPackages} Pkgs</div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Physical freight in view</div>
          </div>
        </div>

        {/* Card 3: To Pay Receivables */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">TO PAY RECEIVABLES</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-600 tracking-tight">{formatCurrency(totalToPay)}</div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Due upon consignee delivery</div>
          </div>
        </div>

        {/* Card 4: Settled / Paid Amount */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">PAID & T.B.B. FREIGHT</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600 tracking-tight">{formatCurrency(totalPaid + totalTbb)}</div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Paid: {formatCurrency(totalPaid)} | TBB: {formatCurrency(totalTbb)}</div>
          </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4">
        <DataTable
          columns={columns}
          data={currentData}
          searchPlaceholder={`Search ${reportTitle}...`}
          onExportExcel={(data) => exportToExcel(data, reportTitle.replace(/\s+/g, '_'), columns.filter((c) => c.key !== 'actions'))}
          onExportPDF={(data) => exportToPDF(reportTitle, columns.filter((c) => c.key !== 'actions'), data, reportTitle.replace(/\s+/g, '_'))}
        />
      </div>

      {/* VIEW MODAL */}
      <Modal
        isOpen={!!viewingRecord}
        onClose={() => setViewingRecord(null)}
        title={`LR Report Details #${viewingRecord?.lrNo}`}
        maxWidth="max-w-2xl"
      >
        {viewingRecord && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">LR No.</span>
                <span className="font-black text-[#1d4ed8] text-sm">{viewingRecord.lrNo}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Inward Date</span>
                <span className="font-bold text-slate-800">{formatDate(viewingRecord.inwardDate || viewingRecord.date)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Outward Date</span>
                <span className="font-bold text-slate-800">{formatDate(viewingRecord.outwardDate)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Memo No.</span>
                <span className="font-bold text-slate-800">{viewingRecord.memoNo || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">CT To</span>
                <span className="font-bold text-slate-800">{viewingRecord.ctTo || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Status</span>
                <StatusBadge status={viewingRecord.status} />
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Consignor</span>
                <span className="font-bold text-slate-800">{viewingRecord.consignorName || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Consignee</span>
                <span className="font-bold text-slate-800">{viewingRecord.consigneeName || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Packages</span>
                <span className="font-black text-slate-900">{viewingRecord.pkg || 0} Pkgs</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">To Pay</span>
                <span className="font-bold text-amber-700">{formatCurrency(viewingRecord.toPayAmount)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">T.B.B</span>
                <span className="font-bold text-sky-700">{formatCurrency(viewingRecord.tbbAmount)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Paid</span>
                <span className="font-bold text-emerald-700">{formatCurrency(viewingRecord.paidAmount)}</span>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => handlePrintRecord(viewingRecord)}
                className="px-4 py-2 bg-[#1d4ed8] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center cursor-pointer transition-all"
              >
                <Printer className="w-4 h-4 mr-1.5" />
                <span>Print LR Memo</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportRowExcel(viewingRecord)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Excel</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingRecord(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
