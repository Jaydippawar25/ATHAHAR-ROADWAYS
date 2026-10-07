import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { PackageCheck, ArrowUpRight, Clock, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { calculateDaysPending } from '../../utils/dateUtils';
import { exportToExcel, exportToPDF } from '../../services/exportService';

export const PendingStock = () => {
  const { pendingStock, handleDeleteInwardItem, handleUpdateInwardItem } = useApp();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState([]);

  // Modal states for edit & delete
  const [editingRecord, setEditingRecord] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [deleteRecord, setDeleteRecord] = useState(null);

  const handleStartEdit = (row) => {
    setEditingRecord(row);
    setEditFormData({ ...row });
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    handleUpdateInwardItem(editingRecord.id, editFormData);
    setEditingRecord(null);
  };

  const handleConfirmDelete = () => {
    handleDeleteInwardItem(deleteRecord.id);
    setDeleteRecord(null);
  };

  const pendingColumns = [
    {
      label: 'LR No.',
      key: 'lrNo',
      render: (row) => (
        <span className="font-extrabold text-sky-700 bg-sky-50 px-2 py-1 rounded border border-sky-200">
          {row.lrNo}
        </span>
      ),
    },
    { label: 'Inward Date', key: 'inwardDate', type: 'date' },
    { label: 'Inward No.', key: 'inwardNo' },
    { label: 'Memo No.', key: 'memoNo' },
    { label: 'Invoice No.', key: 'invoiceNo' },
    { label: 'CT To', key: 'ctTo' },
    { label: 'Consignor', key: 'consignorName' },
    { label: 'Consignee', key: 'consigneeName' },
    { label: 'PKG', key: 'pkg', render: (row) => <span className="font-bold">{row.pkg}</span> },
    { label: 'To Pay', key: 'toPayAmount', type: 'currency' },
    { label: 'TBB Amt', key: 'tbbAmount', type: 'currency' },
    { label: 'Paid', key: 'paidAmount', type: 'currency' },
    { label: 'Status', key: 'status', type: 'status' },
    {
      label: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex items-center space-x-1">
          <button
            onClick={() => handleStartEdit(row)}
            className="p-1.5 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded transition-colors"
            title="Edit Pending LR"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteRecord(row)}
            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors"
            title="Delete Pending LR"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const handleSelectRow = (row) => {
    setSelectedIds((prev) =>
      prev.includes(row.id) ? prev.filter((id) => id !== row.id) : [...prev, row.id]
    );
  };

  const handleSelectAll = (checked, pageRows) => {
    if (checked) {
      const pageIds = pageRows.map((r) => r.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    } else {
      const pageIds = new Set(pageRows.map((r) => r.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    }
  };

  const handleProceedToOutward = () => {
    if (selectedIds.length === 0) return;
    const selectedItems = pendingStock.filter((item) => selectedIds.includes(item.id));
    navigate('/outward/new', { state: { selectedPendingItems: selectedItems } });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <PackageCheck className="w-6 h-6 text-amber-500" />
            <span>Pending Stock Register</span>
          </h2>
          <p className="text-xs text-slate-500">
            All Inward LRs currently awaiting Outward dispatch & delivery
          </p>
        </div>

        {selectedIds.length > 0 && (
          <button
            onClick={handleProceedToOutward}
            className="inline-flex items-center space-x-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-lg text-sm shadow-lg transition-all animate-bounce"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Process Outward ({selectedIds.length} LRs Selected)</span>
          </button>
        )}
      </div>

      <DataTable
        columns={pendingColumns}
        data={pendingStock}
        selectable={true}
        selectedIds={selectedIds}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
        searchPlaceholder="Search Pending LR No, Invoice, Consignor, Consignee..."
        onExportExcel={(data) => exportToExcel(data, 'Pending_Stock_Report', pendingColumns)}
        onExportPDF={(data) => exportToPDF('Pending Stock Register', pendingColumns, data, 'Pending_Stock_Report')}
      />

      {/* EDIT MODAL */}
      <Modal
        isOpen={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        title={`Edit Pending LR #${editingRecord?.lrNo}`}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
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
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">To Pay Amount</label>
              <input
                type="number"
                value={editFormData.toPayAmount || 0}
                onChange={(e) => setEditFormData({ ...editFormData, toPayAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">TBB Amount</label>
              <input
                type="number"
                value={editFormData.tbbAmount || 0}
                onChange={(e) => setEditFormData({ ...editFormData, tbbAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>

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
              Are you sure you want to delete Pending LR No. #{deleteRecord?.lrNo}?
              This action will remove it from Pending Stock.
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
