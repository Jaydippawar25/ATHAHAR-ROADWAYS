import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { FileText, Eye, FileSpreadsheet, Printer } from 'lucide-react';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { exportToExcel, exportToPDF, printRecordDetails } from '../../services/exportService';
import { formatDate } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/numberUtils';

export const Reports = () => {
  const { inwardItems, pendingStock, outwardItems } = useApp();
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
        { label: 'Invoice No.', value: row.invoiceNo || '-' },
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
    { label: 'LR No.', key: 'lrNo', render: (row) => <span className="font-extrabold text-sky-800">{row.lrNo}</span> },
    { label: 'Inward Date', key: 'inwardDate', type: 'date' },
    { label: 'Outward Date', key: 'outwardDate', type: 'date' },
    { label: 'Invoice No.', key: 'invoiceNo' },
    { label: 'CT To', key: 'ctTo' },
    { label: 'Consignor', key: 'consignorName' },
    { label: 'Consignee', key: 'consigneeName' },
    { label: 'PKG', key: 'pkg' },
    { label: 'To Pay', key: 'toPayAmount', type: 'currency' },
    { label: 'T.B.B', key: 'tbbAmount', type: 'currency' },
    { label: 'Paid', key: 'paidAmount', type: 'currency' },
    { label: 'Status', key: 'status', type: 'status' },
    {
      label: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex items-center justify-center space-x-1">
          <button
            onClick={() => setViewingRecord(row)}
            className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
            title="View LR Details"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  let currentData = inwardItems;
  let reportTitle = 'All Inward Items Report';

  if (reportType === 'pending') {
    currentData = pendingStock;
    reportTitle = 'Pending Stock Register';
  } else if (reportType === 'delivered') {
    currentData = outwardItems;
    reportTitle = 'Completed Deliveries Report';
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <FileText className="w-6 h-6 text-sky-600" />
            <span>Transport Reports & Exports</span>
          </h2>
          <p className="text-xs text-slate-500">Filter, export Excel spreadsheets, and print PDF summaries</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setReportType('inward')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              reportType === 'inward' ? 'bg-sky-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inward Report
          </button>
          <button
            onClick={() => setReportType('pending')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              reportType === 'pending' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending Report
          </button>
          <button
            onClick={() => setReportType('delivered')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              reportType === 'delivered' ? 'bg-emerald-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Delivered Report
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={currentData}
        searchPlaceholder={`Search ${reportTitle}...`}
        onExportExcel={(data) => exportToExcel(data, reportTitle.replace(/\s+/g, '_'), columns.filter((c) => c.key !== 'actions'))}
        onExportPDF={(data) => exportToPDF(reportTitle, columns.filter((c) => c.key !== 'actions'), data, reportTitle.replace(/\s+/g, '_'))}
      />

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
                <span className="font-black text-sky-800 text-sm">{viewingRecord.lrNo}</span>
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
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Invoice No.</span>
                <span className="font-bold text-slate-800">{viewingRecord.invoiceNo || '-'}</span>
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
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded shadow-xs flex items-center cursor-pointer"
              >
                <Printer className="w-4 h-4 mr-1.5" />
                <span>Print</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportRowExcel(viewingRecord)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Excel</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingRecord(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
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

