import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Link } from 'react-router-dom';
import {
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  PackageCheck,
  Pencil,
  Trash2,
  AlertTriangle,
  Layers,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { exportToExcel, exportToPDF } from '../../services/exportService';

export const AllEntries = () => {
  const {
    inwards,
    inwardItems,
    outwards,
    outwardItems,
    pendingStock,
    handleDeleteInward,
    handleDeleteInwardItem,
    handleUpdateInwardHeader,
    handleUpdateInwardItem,
    handleDeleteOutward,
    handleDeleteOutwardItem,
    handleUpdateOutwardHeader,
    handleUpdateOutwardItem,
  } = useApp();

  // Active view tab: 'all_lrs' | 'inward_headers' | 'outward_headers'
  const [activeTab, setActiveTab] = useState('all_lrs');

  // Modal states for edit & delete
  const [editingRecord, setEditingRecord] = useState(null);
  const [editCategory, setEditCategory] = useState(null); // 'inward_header' | 'inward_item' | 'outward_header' | 'outward_item'
  const [editFormData, setEditFormData] = useState({});

  const [deleteRecord, setDeleteRecord] = useState(null);
  const [deleteCategory, setDeleteCategory] = useState(null);

  const handleStartEdit = (row, category) => {
    setEditCategory(category);
    setEditingRecord(row);
    setEditFormData({ ...row });
  };

  const handleStartDelete = (row, category) => {
    setDeleteCategory(category);
    setDeleteRecord(row);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (editCategory === 'inward_header') {
      handleUpdateInwardHeader(editingRecord.id, editFormData);
    } else if (editCategory === 'inward_item') {
      handleUpdateInwardItem(editingRecord.id, editFormData);
    } else if (editCategory === 'outward_header') {
      handleUpdateOutwardHeader(editingRecord.id, editFormData);
    } else if (editCategory === 'outward_item') {
      handleUpdateOutwardItem(editingRecord.id, editFormData);
    }
    setEditingRecord(null);
    setEditCategory(null);
  };

  const handleConfirmDelete = () => {
    if (deleteCategory === 'inward_header') {
      handleDeleteInward(deleteRecord.id);
    } else if (deleteCategory === 'inward_item') {
      handleDeleteInwardItem(deleteRecord.id);
    } else if (deleteCategory === 'outward_header') {
      handleDeleteOutward(deleteRecord.id);
    } else if (deleteCategory === 'outward_item') {
      handleDeleteOutwardItem(deleteRecord.id);
    }
    setDeleteRecord(null);
    setDeleteCategory(null);
  };

  // Enrich inwards with consignor and consignee names derived from items
  const enrichedInwards = inwards.map((inw) => {
    const items = inwardItems.filter((item) => item.inwardId === inw.id || item.inwardNo === inw.inwardNo);
    const consignors = Array.from(new Set(items.map((i) => i.consignorName).filter(Boolean))).join(', ');
    const consignees = Array.from(new Set(items.map((i) => i.consigneeName).filter(Boolean))).join(', ');
    return {
      ...inw,
      consignorName: inw.consignorName || consignors || '-',
      consigneeName: inw.consigneeName || consignees || '-',
    };
  });

  // Enrich outwards with consignor and consignee names derived from items
  const enrichedOutwards = outwards.map((out) => {
    const items = outwardItems.filter((item) => item.outwardId === out.id || item.outwardNo === out.outwardNo);
    const consignors = Array.from(new Set(items.map((i) => i.consignorName).filter(Boolean))).join(', ');
    const consignees = Array.from(new Set(items.map((i) => i.consigneeName).filter(Boolean))).join(', ');
    return {
      ...out,
      consignorName: out.consignorName || consignors || '-',
      consigneeName: out.consigneeName || consignees || '-',
    };
  });

  // Combine inward and outward items into a unified master list of all LR entries
  const allLREntriesMap = new Map();

  // First add all Inward items
  inwardItems.forEach((item) => {
    allLREntriesMap.set(item.lrNo, {
      ...item,
      inwardDate: item.date || item.inwardDate || '-',
      outwardDate: '-',
      outwardNo: '-',
      deliveryPersonName: '-',
      recordCategory: 'inward_item',
    });
  });

  // Merge Outward delivered items
  outwardItems.forEach((item) => {
    const existing = allLREntriesMap.get(item.lrNo) || {};
    allLREntriesMap.set(item.lrNo, {
      ...existing,
      ...item,
      inwardDate: existing.inwardDate || item.inwardDate || item.date || '-',
      outwardDate: item.outwardDate || item.date || '-',
      outwardNo: item.outwardNo || '-',
      deliveryPersonName: item.deliveryPersonName || '-',
      status: 'DELIVERED',
      recordCategory: 'outward_item',
    });
  });

  const combinedLREntries = Array.from(allLREntriesMap.values());

  // Statistics
  const totalInwardPkg = inwards.reduce((sum, i) => sum + (Number(i.totalQty) || 0), 0);
  const totalOutwardPkg = outwards.reduce((sum, o) => sum + (Number(o.totalQty) || 0), 0);

  // Column Definitions
  const combinedLRColumns = [
    {
      label: 'LR No.',
      key: 'lrNo',
      render: (row) => <span className="font-extrabold text-sky-800">{row.lrNo}</span>,
    },
    { label: 'Status', key: 'status', type: 'status' },
    { label: 'Inward Date', key: 'inwardDate', type: 'date' },
    { label: 'Outward Date', key: 'outwardDate', type: 'date' },
    { label: 'Inward No.', key: 'inwardNo' },
    { label: 'Outward No.', key: 'outwardNo' },
    {
      label: 'CONSIGNER',
      key: 'consignorName',
      render: (row) => (
        <span className="font-semibold text-slate-800 max-w-[100px] truncate block" title={row.consignorName}>
          {row.consignorName || '-'}
        </span>
      ),
    },
    {
      label: 'CONSIGNEE',
      key: 'consigneeName',
      render: (row) => (
        <span className="font-semibold text-slate-800 max-w-[100px] truncate block" title={row.consigneeName}>
          {row.consigneeName || '-'}
        </span>
      ),
    },
    {
      label: 'CT To',
      key: 'ctTo',
      render: (row) => (
        <span className="max-w-[75px] truncate block" title={row.ctTo}>
          {row.ctTo || '-'}
        </span>
      ),
    },
    {
      label: 'Delivery Person',
      key: 'deliveryPersonName',
      render: (row) => (
        <span className="max-w-[90px] truncate block" title={row.deliveryPersonName}>
          {row.deliveryPersonName || '-'}
        </span>
      ),
    },
    { label: 'PKG', key: 'pkg' },
    { label: 'TO PAY', key: 'toPayAmount', type: 'currency' },
    { label: 'T.B.B', key: 'tbbAmount', type: 'currency' },
    { label: 'PAID', key: 'paidAmount', type: 'currency' },
    {
      label: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex items-center space-x-1">
          <button
            onClick={() => handleStartEdit(row, row.recordCategory || 'inward_item')}
            className="p-1 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded transition-colors"
            title="Edit Entry"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleStartDelete(row, row.recordCategory || 'inward_item')}
            className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors"
            title="Delete Entry"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const inwardHeaderColumns = [
    { label: 'Inward No.', key: 'inwardNo' },
    { label: 'Date', key: 'date', type: 'date' },
    {
      label: 'CONSIGNER',
      key: 'consignorName',
      render: (row) => (
        <span className="font-semibold text-slate-800 max-w-[100px] truncate block" title={row.consignorName}>
          {row.consignorName || '-'}
        </span>
      ),
    },
    {
      label: 'CONSIGNEE',
      key: 'consigneeName',
      render: (row) => (
        <span className="font-semibold text-slate-800 max-w-[100px] truncate block" title={row.consigneeName}>
          {row.consigneeName || '-'}
        </span>
      ),
    },
    {
      label: 'Vehicle No.',
      key: 'vehicleNo',
      render: (row) => (
        <span className="max-w-[85px] truncate block" title={row.vehicleNo}>
          {row.vehicleNo || '-'}
        </span>
      ),
    },
    {
      label: 'Vehicle Owner',
      key: 'ownerName',
      render: (row) => (
        <span className="max-w-[85px] truncate block" title={row.ownerName}>
          {row.ownerName || '-'}
        </span>
      ),
    },
    {
      label: 'From',
      key: 'from',
      render: (row) => (
        <span className="max-w-[75px] truncate block" title={row.from}>
          {row.from || '-'}
        </span>
      ),
    },
    {
      label: 'Memo No.',
      key: 'memoNo',
      render: (row) => (
        <span className="max-w-[70px] truncate block" title={row.memoNo}>
          {row.memoNo || '-'}
        </span>
      ),
    },
    { label: 'PKG', key: 'totalQty' },
    { label: 'TO PAY', key: 'totalToPay', type: 'currency' },
    { label: 'T.B.B', key: 'totalTbb', type: 'currency' },
    { label: 'PAID', key: 'totalPaid', type: 'currency' },
    {
      label: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex items-center space-x-1">
          <button
            onClick={() => handleStartEdit(row, 'inward_header')}
            className="p-1 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded transition-colors"
            title="Edit Receipt"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleStartDelete(row, 'inward_header')}
            className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors"
            title="Delete Receipt"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const outwardHeaderColumns = [
    { label: 'Outward No.', key: 'outwardNo' },
    { label: 'Date', key: 'date', type: 'date' },
    {
      label: 'CONSIGNER',
      key: 'consignorName',
      render: (row) => (
        <span className="font-semibold text-slate-800 max-w-[100px] truncate block" title={row.consignorName}>
          {row.consignorName || '-'}
        </span>
      ),
    },
    {
      label: 'CONSIGNEE',
      key: 'consigneeName',
      render: (row) => (
        <span className="font-semibold text-slate-800 max-w-[100px] truncate block" title={row.consigneeName}>
          {row.consigneeName || '-'}
        </span>
      ),
    },
    {
      label: 'Vehicle No.',
      key: 'vehicleNo',
      render: (row) => (
        <span className="max-w-[85px] truncate block" title={row.vehicleNo}>
          {row.vehicleNo || '-'}
        </span>
      ),
    },
    {
      label: 'Driver Name',
      key: 'driverName',
      render: (row) => (
        <span className="max-w-[85px] truncate block" title={row.driverName}>
          {row.driverName || '-'}
        </span>
      ),
    },
    {
      label: 'From',
      key: 'from',
      render: (row) => (
        <span className="max-w-[75px] truncate block" title={row.from}>
          {row.from || '-'}
        </span>
      ),
    },
    {
      label: 'Memo No.',
      key: 'memoNo',
      render: (row) => (
        <span className="max-w-[70px] truncate block" title={row.memoNo}>
          {row.memoNo || '-'}
        </span>
      ),
    },
    { label: 'PKG', key: 'totalQty' },
    { label: 'TO PAY', key: 'totalToPay', type: 'currency' },
    { label: 'T.B.B', key: 'totalTbb', type: 'currency' },
    { label: 'PAID', key: 'totalPaid', type: 'currency' },
    {
      label: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex items-center space-x-1">
          <button
            onClick={() => handleStartEdit(row, 'outward_header')}
            className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors"
            title="Edit Outward Receipt"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleStartDelete(row, 'outward_header')}
            className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors"
            title="Delete Outward Receipt"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-slate-800 max-w-full">
      {/* Top Header Title & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2.5">
            <ArrowLeftRight className="w-7 h-7 text-sky-600" />
            <span>All Inward & Outward Entries</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Complete transaction register of all inward receipts, outward dispatches, and individual LR records
          </p>
        </div>

        {/* Quick Action Navigation Buttons */}
        <div className="flex items-center space-x-2">
          <Link
            to="/inward/new"
            className="inline-flex items-center space-x-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-sm transition-all"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>New Inward</span>
          </Link>
          <Link
            to="/outward/new"
            className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-sm transition-all"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>New Outward</span>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Inward Receipts</span>
            <ArrowDownLeft className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-xl font-black text-slate-900">{inwards.length}</p>
          <p className="text-[11px] text-sky-700 font-semibold mt-0.5">{totalInwardPkg} Total PKG</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Outward Receipts</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-slate-900">{outwards.length}</p>
          <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">{totalOutwardPkg} Total PKG</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total LR Entries</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xl font-black text-slate-900">{combinedLREntries.length}</p>
          <p className="text-[11px] text-indigo-700 font-semibold mt-0.5">Combined In & Out LRs</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Stock</span>
            <PackageCheck className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-black text-slate-900">{pendingStock.length}</p>
          <p className="text-[11px] text-amber-700 font-semibold mt-0.5">In Godown Stock</p>
        </div>
      </div>

      {/* Main Tab Controls & Data Table */}
      <div className="space-y-4">
        {/* Tab Selection Buttons */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('all_lrs')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'all_lrs'
                ? 'bg-slate-900 text-white shadow'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>All LR Entries ({combinedLREntries.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('inward_headers')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'inward_headers'
                ? 'bg-sky-600 text-white shadow'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Inward Receipts ({enrichedInwards.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('outward_headers')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'outward_headers'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Outward Receipts ({enrichedOutwards.length})</span>
          </button>
        </div>

        {/* Dynamic Table Rendering based on Active Tab */}
        {activeTab === 'all_lrs' && (
          <DataTable
            columns={combinedLRColumns}
            data={combinedLREntries}
            searchPlaceholder="Search by LR No., Consignor, Consignee, Inward No., Outward No..."
            onExportExcel={(data) => exportToExcel(data, 'All_LR_Entries', combinedLRColumns)}
            onExportPDF={(data) => exportToPDF('All LR Entries Register', combinedLRColumns, data, 'All_LR_Entries')}
          />
        )}

        {activeTab === 'inward_headers' && (
          <DataTable
            columns={inwardHeaderColumns}
            data={enrichedInwards}
            searchPlaceholder="Search Inward Receipts by Inward No., Vehicle No., Consigner, Consignee..."
            onExportExcel={(data) => exportToExcel(data, 'Inward_Receipts_Register', inwardHeaderColumns)}
            onExportPDF={(data) =>
              exportToPDF('Inward Receipts Register', inwardHeaderColumns, data, 'Inward_Receipts_Register')
            }
          />
        )}

        {activeTab === 'outward_headers' && (
          <DataTable
            columns={outwardHeaderColumns}
            data={enrichedOutwards}
            searchPlaceholder="Search Outward Receipts by Outward No., Vehicle No., Driver, Delivery Person..."
            onExportExcel={(data) => exportToExcel(data, 'Outward_Receipts_Register', outwardHeaderColumns)}
            onExportPDF={(data) =>
              exportToPDF('Outward Receipts Register', outwardHeaderColumns, data, 'Outward_Receipts_Register')
            }
          />
        )}
      </div>

      {/* Edit Record Modal */}
      {editingRecord && (
        <Modal
          isOpen={!!editingRecord}
          onClose={() => setEditingRecord(null)}
          title={`Edit ${editCategory.replace(/_/g, ' ').toUpperCase()}`}
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4 text-xs font-semibold">
            {editCategory.includes('header') ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 uppercase font-bold">Number</label>
                  <input
                    type="text"
                    value={editFormData.inwardNo || editFormData.outwardNo || ''}
                    disabled
                    className="w-full p-2 bg-slate-100 border border-slate-300 rounded font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 uppercase font-bold">Date</label>
                  <input
                    type="date"
                    value={editFormData.date || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 uppercase font-bold">Vehicle No.</label>
                  <input
                    type="text"
                    value={editFormData.vehicleNo || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, vehicleNo: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-sky-500 uppercase font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 uppercase font-bold">From</label>
                  <input
                    type="text"
                    value={editFormData.from || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, from: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 uppercase font-bold">Memo No.</label>
                  <input
                    type="text"
                    value={editFormData.memoNo || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, memoNo: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-sky-500 uppercase"
                  />
                </div>
                {editCategory === 'outward_header' && (
                  <div>
                    <label className="block text-slate-600 mb-1 uppercase font-bold">Driver Name</label>
                    <input
                      type="text"
                      value={editFormData.driverName || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, driverName: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 uppercase font-bold">LR No.</label>
                  <input
                    type="text"
                    value={editFormData.lrNo || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, lrNo: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded font-bold text-sky-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 uppercase font-bold">Invoice No.</label>
                  <input
                    type="text"
                    value={editFormData.invoiceNo || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, invoiceNo: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 uppercase font-bold">Consignor</label>
                  <input
                    type="text"
                    value={editFormData.consignorName || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, consignorName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 uppercase font-bold">Consignee</label>
                  <input
                    type="text"
                    value={editFormData.consigneeName || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, consigneeName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 uppercase font-bold">PKG</label>
                  <input
                    type="number"
                    value={editFormData.pkg || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, pkg: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 uppercase font-bold">To Pay</label>
                  <input
                    type="number"
                    value={editFormData.toPayAmount || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, toPayAmount: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 uppercase font-bold">T.B.B</label>
                  <input
                    type="number"
                    value={editFormData.tbbAmount || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, tbbAmount: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 uppercase font-bold">Paid</label>
                  <input
                    type="number"
                    value={editFormData.paidAmount || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, paidAmount: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-3.5 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Record Confirmation Modal */}
      {deleteRecord && (
        <Modal
          isOpen={!!deleteRecord}
          onClose={() => setDeleteRecord(null)}
          title="Confirm Deletion"
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs font-semibold">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-sm text-rose-900">Are you sure you want to delete this record?</p>
                <p className="mt-1">
                  Record:{' '}
                  <span className="font-black underline">
                    {deleteRecord.lrNo || deleteRecord.inwardNo || deleteRecord.outwardNo}
                  </span>
                </p>
                <p className="text-[11px] text-rose-600 mt-1">This action cannot be undone.</p>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDeleteRecord(null)}
                className="px-3.5 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-sm"
              >
                Delete Record
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AllEntries;
