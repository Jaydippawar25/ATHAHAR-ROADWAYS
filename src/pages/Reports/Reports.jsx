import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { FileText } from 'lucide-react';
import { DataTable } from '../../components/common/DataTable';
import { exportToExcel, exportToPDF } from '../../services/exportService';

export const Reports = () => {
  const { inwardItems, pendingStock, outwardItems } = useApp();
  const [reportType, setReportType] = useState('inward'); // 'inward' | 'pending' | 'delivered'

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
        onExportExcel={(data) => exportToExcel(data, reportTitle.replace(/\s+/g, '_'), columns)}
        onExportPDF={(data) => exportToPDF(reportTitle, columns, data, reportTitle.replace(/\s+/g, '_'))}
      />
    </div>
  );
};
