import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Link } from 'react-router-dom';
import { Plus, ArrowDownLeft, Pencil, Trash2, AlertTriangle, Eye, FileSpreadsheet, Printer } from 'lucide-react';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { exportToExcel, exportToPDF } from '../../services/exportService';
import { formatDate } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/numberUtils';

export const InwardList = () => {
  const {
    inwards,
    inwardItems,
    handleDeleteInward,
    handleDeleteInwardItem,
    handleUpdateInwardHeader,
    handleUpdateInwardItem,
  } = useApp();

  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' | 'lr_items'
  
  // Modal states for view, edit & delete
  const [viewingRecord, setViewingRecord] = useState(null);
  const [viewType, setViewType] = useState(null); // 'header' | 'item'
  const [editingRecord, setEditingRecord] = useState(null); // object to edit
  const [editType, setEditType] = useState(null); // 'header' | 'item'
  const [deleteRecord, setDeleteRecord] = useState(null); // object to delete
  const [deleteType, setDeleteType] = useState(null); // 'header' | 'item'

  const [editFormData, setEditFormData] = useState({});

  const handleStartView = (row, type) => {
    setViewType(type);
    setViewingRecord(row);
  };

  const handleExportRowExcel = (row, type) => {
    if (type === 'header') {
      const items = inwardItems.filter((item) => item.inwardId === row.id || item.inwardNo === row.inwardNo);
      if (items.length > 0) {
        const cols = inwardItemColumns.filter((c) => c.key !== 'actions');
        exportToExcel(items, `Inward_${row.inwardNo}_LRs`, cols);
      } else {
        const cols = inwardHeaderColumns.filter((c) => c.key !== 'actions');
        exportToExcel([row], `Inward_${row.inwardNo}`, cols);
      }
    } else {
      const cols = inwardItemColumns.filter((c) => c.key !== 'actions');
      exportToExcel([row], `Inward_LR_${row.lrNo}`, cols);
    }
  };

  const handleStartEdit = (row, type) => {
    setEditType(type);
    setEditingRecord(row);
    setEditFormData({ ...row });
  };

  const handleStartDelete = (row, type) => {
    setDeleteType(type);
    setDeleteRecord(row);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (editType === 'header') {
      handleUpdateInwardHeader(editingRecord.id, editFormData);
    } else if (editType === 'item') {
      handleUpdateInwardItem(editingRecord.id, editFormData);
    }
    setEditingRecord(null);
    setEditType(null);
  };

  const handleConfirmDelete = () => {
    if (deleteType === 'header') {
      handleDeleteInward(deleteRecord.id);
    } else if (deleteType === 'item') {
      handleDeleteInwardItem(deleteRecord.id);
    }
    setDeleteRecord(null);
    setDeleteType(null);
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
            onClick={() => handleStartView(row, 'header')}
            className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
            title="View Receipt"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleExportRowExcel(row, 'header')}
            className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
            title="Export Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleStartEdit(row, 'header')}
            className="p-1 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded transition-colors cursor-pointer"
            title="Edit Receipt"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleStartDelete(row, 'header')}
            className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors cursor-pointer"
            title="Delete Receipt"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const inwardItemColumns = [
    { label: 'Inward No.', key: 'inwardNo' },
    { label: 'SrNo', key: 'srNo' },
    { label: 'LR No.', key: 'lrNo', render: (row) => <span className="font-extrabold text-sky-700">{row.lrNo}</span> },
    { label: 'LR Date', key: 'date', type: 'date' },
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
        <div className="flex items-center space-x-1">
          <button
            onClick={() => handleStartView(row, 'item')}
            className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
            title="View LR Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleExportRowExcel(row, 'item')}
            className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
            title="Export Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleStartEdit(row, 'item')}
            className="p-1 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded transition-colors cursor-pointer"
            title="Edit LR Entry"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleStartDelete(row, 'item')}
            className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors cursor-pointer"
            title="Delete LR Entry"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <ArrowDownLeft className="w-6 h-6 text-sky-600" />
            <span>Inward Management</span>
          </h2>
          <p className="text-xs text-slate-500">Record and review inward transport documents and LR items</p>
        </div>

        <Link
          to="/inward/new"
          className="inline-flex items-center space-x-2 bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-2.5 rounded-lg text-sm shadow transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Inward Transaction</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'transactions'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Inward Receipts ({inwards.length})
        </button>
        <button
          onClick={() => setActiveTab('lr_items')}
          className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'lr_items'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          All Inward LR Entries ({inwardItems.length})
        </button>
      </div>

      {activeTab === 'transactions' ? (
        <DataTable
          columns={inwardHeaderColumns}
          data={enrichedInwards}
          searchPlaceholder="Search Inward No, Vehicle, Memo, Consigner, Consignee..."
          onExportExcel={(data) => exportToExcel(data, 'Inward_Receipts', inwardHeaderColumns)}
          onExportPDF={(data) => exportToPDF('Inward Receipts Summary', inwardHeaderColumns, data, 'Inward_Receipts')}
        />
      ) : (
        <DataTable
          columns={inwardItemColumns}
          data={inwardItems}
          searchPlaceholder="Search LR No, Invoice, Consignor, Consignee..."
          onExportExcel={(data) => exportToExcel(data, 'Inward_LR_Items', inwardItemColumns)}
          onExportPDF={(data) => exportToPDF('Inward LR Items Report', inwardItemColumns, data, 'Inward_LR_Items')}
        />
      )}

      {/* VIEW MODAL */}
      <Modal
        isOpen={!!viewingRecord}
        onClose={() => setViewingRecord(null)}
        title={
          viewType === 'header'
            ? `Inward Receipt Details #${viewingRecord?.inwardNo}`
            : `Inward LR Details #${viewingRecord?.lrNo}`
        }
        maxWidth="max-w-3xl"
      >
        {viewingRecord && (
          <div className="space-y-4 text-xs">
            {viewType === 'header' ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">Inward No.</span>
                    <span className="font-black text-slate-900 text-sm">{viewingRecord.inwardNo}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">Date</span>
                    <span className="font-bold text-slate-800">{formatDate(viewingRecord.date)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">Vehicle No.</span>
                    <span className="font-black text-sky-700">{viewingRecord.vehicleNo || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">Vehicle Owner</span>
                    <span className="font-bold text-slate-800">{viewingRecord.ownerName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">From Station</span>
                    <span className="font-bold text-slate-800">{viewingRecord.from || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">Memo No.</span>
                    <span className="font-bold text-slate-800">{viewingRecord.memoNo || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">Total PKG</span>
                    <span className="font-black text-slate-900">{viewingRecord.totalQty || 0} Pkgs</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">Total Freight</span>
                    <span className="font-black text-emerald-700">
                      {formatCurrency(
                        (Number(viewingRecord.totalToPay) || 0) +
                          (Number(viewingRecord.totalTbb) || 0) +
                          (Number(viewingRecord.totalPaid) || 0)
                      )}
                    </span>
                  </div>
                </div>

                {/* Associated LRs Table */}
                <div className="space-y-2">
                  <h4 className="font-black text-slate-700 uppercase tracking-wider text-[11px]">
                    Associated LR Items
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-60">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 text-slate-700 font-black uppercase border-b border-slate-200">
                        <tr>
                          <th className="p-2">LR No.</th>
                          <th className="p-2">Consigner</th>
                          <th className="p-2">Consignee</th>
                          <th className="p-2">CT To</th>
                          <th className="p-2">PKG</th>
                          <th className="p-2">To Pay</th>
                          <th className="p-2">TBB</th>
                          <th className="p-2">Paid</th>
                          <th className="p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {inwardItems
                          .filter(
                            (item) =>
                              item.inwardId === viewingRecord.id || item.inwardNo === viewingRecord.inwardNo
                          )
                          .map((lr, idx) => (
                            <tr key={lr.id || idx} className="hover:bg-slate-50 font-semibold">
                              <td className="p-2 font-black text-sky-700">{lr.lrNo}</td>
                              <td className="p-2">{lr.consignorName || '-'}</td>
                              <td className="p-2">{lr.consigneeName || '-'}</td>
                              <td className="p-2">{lr.ctTo || '-'}</td>
                              <td className="p-2 font-bold">{lr.pkg}</td>
                              <td className="p-2">{formatCurrency(lr.toPayAmount)}</td>
                              <td className="p-2">{formatCurrency(lr.tbbAmount)}</td>
                              <td className="p-2">{formatCurrency(lr.paidAmount)}</td>
                              <td className="p-2">
                                <StatusBadge status={lr.status} />
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">LR No.</span>
                  <span className="font-black text-sky-700 text-sm">{viewingRecord.lrNo}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Inward No.</span>
                  <span className="font-bold text-slate-900">{viewingRecord.inwardNo || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">LR Date</span>
                  <span className="font-bold text-slate-800">{formatDate(viewingRecord.date)}</span>
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
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Consigner</span>
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
            )}

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => handleExportRowExcel(viewingRecord, viewType)}
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

      {/* EDIT MODAL */}
      <Modal
        isOpen={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        title={editType === 'header' ? `Edit Inward Receipt #${editingRecord?.inwardNo}` : `Edit Inward LR #${editingRecord?.lrNo}`}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {editType === 'header' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Inward No.</label>
                <input
                  type="text"
                  value={editFormData.inwardNo || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, inwardNo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date</label>
                <input
                  type="date"
                  value={editFormData.date || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Vehicle No.</label>
                <input
                  type="text"
                  value={editFormData.vehicleNo || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, vehicleNo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Vehicle Owner</label>
                <input
                  type="text"
                  value={editFormData.ownerName || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, ownerName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">From Station</label>
                <input
                  type="text"
                  value={editFormData.from || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, from: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Memo No.</label>
                <input
                  type="text"
                  value={editFormData.memoNo || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, memoNo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">LR No.</label>
                <input
                  type="text"
                  value={editFormData.lrNo || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, lrNo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-bold text-sky-700"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">PKG Qty</label>
                <input
                  type="number"
                  value={editFormData.pkg || 1}
                  onChange={(e) => setEditFormData({ ...editFormData, pkg: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Invoice No.</label>
                <input
                  type="text"
                  value={editFormData.invoiceNo || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, invoiceNo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">CT To (Station)</label>
                <input
                  type="text"
                  value={editFormData.ctTo || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, ctTo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Consignor Name</label>
                <input
                  type="text"
                  value={editFormData.consignorName || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, consignorName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Consignee Name</label>
                <input
                  type="text"
                  value={editFormData.consigneeName || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, consigneeName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Freight Amount</label>
                <input
                  type="number"
                  value={editFormData.toPayAmount || editFormData.tbbAmount || editFormData.paidAmount || 0}
                  onChange={(e) => {
                    const amt = Number(e.target.value) || 0;
                    if (editFormData.paymentType === 'TBB') {
                      setEditFormData({ ...editFormData, tbbAmount: amt, toPayAmount: 0, paidAmount: 0 });
                    } else if (editFormData.paymentType === 'PAID') {
                      setEditFormData({ ...editFormData, paidAmount: amt, toPayAmount: 0, tbbAmount: 0 });
                    } else {
                      setEditFormData({ ...editFormData, toPayAmount: amt, tbbAmount: 0, paidAmount: 0 });
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Payment Type</label>
                <select
                  value={editFormData.paymentType || 'TOPAY'}
                  onChange={(e) => setEditFormData({ ...editFormData, paymentType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-semibold"
                >
                  <option value="TOPAY">TOPAY</option>
                  <option value="TBB">TBB</option>
                  <option value="PAID">PAID</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={() => setEditingRecord(null)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 text-white font-bold rounded-lg text-sm shadow hover:bg-sky-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={!!deleteRecord}
        onClose={() => setDeleteRecord(null)}
        title="Confirm Deletion"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-amber-600 bg-amber-50 p-3.5 rounded-lg border border-amber-200">
            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
            <p className="text-sm font-medium text-amber-800">
              Are you sure you want to delete {deleteType === 'header' ? `Inward Receipt #${deleteRecord?.inwardNo}` : `Inward LR Entry #${deleteRecord?.lrNo}`}?
              This action cannot be undone.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setDeleteRecord(null)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="px-5 py-2 bg-rose-600 text-white font-bold rounded-lg text-sm shadow hover:bg-rose-700"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
