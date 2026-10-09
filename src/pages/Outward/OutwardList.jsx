import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Link } from 'react-router-dom';
import { Plus, ArrowUpRight, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { exportToExcel, exportToPDF } from '../../services/exportService';

export const OutwardList = () => {
  const {
    outwards,
    outwardItems,
    handleDeleteOutward,
    handleDeleteOutwardItem,
    handleUpdateOutwardHeader,
    handleUpdateOutwardItem,
  } = useApp();

  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' | 'delivered_items'

  // Modal states for edit & delete
  const [editingRecord, setEditingRecord] = useState(null);
  const [editType, setEditType] = useState(null); // 'header' | 'item'
  const [editFormData, setEditFormData] = useState({});
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [deleteType, setDeleteType] = useState(null); // 'header' | 'item'

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
      handleUpdateOutwardHeader(editingRecord.id, editFormData);
    } else if (editType === 'item') {
      handleUpdateOutwardItem(editingRecord.id, editFormData);
    }
    setEditingRecord(null);
    setEditType(null);
  };

  const handleConfirmDelete = () => {
    if (deleteType === 'header') {
      handleDeleteOutward(deleteRecord.id);
    } else if (deleteType === 'item') {
      handleDeleteOutwardItem(deleteRecord.id);
    }
    setDeleteRecord(null);
    setDeleteType(null);
  };

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

  const outwardHeaderColumns = [
    { label: 'Outward No.', key: 'outwardNo' },
    { label: 'Date', key: 'date', type: 'date' },
    {
      label: 'CONSIGNER',
      key: 'consignorName',
      render: (row) => (
        <span className="font-semibold text-slate-800 max-w-[150px] truncate block" title={row.consignorName}>
          {row.consignorName || '-'}
        </span>
      ),
    },
    {
      label: 'CONSIGNEE',
      key: 'consigneeName',
      render: (row) => (
        <span className="font-semibold text-slate-800 max-w-[150px] truncate block" title={row.consigneeName}>
          {row.consigneeName || '-'}
        </span>
      ),
    },
    { label: 'Vehicle No.', key: 'vehicleNo' },
    { label: 'Driver Name', key: 'driverName' },
    { label: 'From', key: 'from' },
    { label: 'Memo No.', key: 'memoNo' },
    { label: 'Total PKG', key: 'totalQty' },
    { label: 'Total To Pay', key: 'totalToPay', type: 'currency' },
    { label: 'Total TBB', key: 'totalTbb', type: 'currency' },
    { label: 'Total Paid', key: 'totalPaid', type: 'currency' },
    {
      label: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex items-center space-x-1">
          <button
            onClick={() => handleStartEdit(row, 'header')}
            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors"
            title="Edit Outward Receipt"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleStartDelete(row, 'header')}
            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors"
            title="Delete Outward Receipt"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const deliveredItemColumns = [
    { label: 'Outward No.', key: 'outwardNo' },
    { label: 'LR No.', key: 'lrNo', render: (row) => <span className="font-extrabold text-emerald-700">{row.lrNo}</span> },
    { label: 'Outward Date', key: 'outwardDate', type: 'date' },
    { label: 'Inward Date', key: 'inwardDate', type: 'date' },
    { label: 'Delivery Person', key: 'deliveryPersonName' },
    { label: 'Invoice No.', key: 'invoiceNo' },
    { label: 'CT To', key: 'ctTo' },
    { label: 'Consignor', key: 'consignorName' },
    { label: 'Consignee', key: 'consigneeName' },
    { label: 'PKG', key: 'pkg' },
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
            onClick={() => handleStartEdit(row, 'item')}
            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors"
            title="Edit Delivered LR Entry"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleStartDelete(row, 'item')}
            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors"
            title="Delete Delivered LR Entry"
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
            <ArrowUpRight className="w-6 h-6 text-emerald-600" />
            <span>Outward & Delivery Register</span>
          </h2>
          <p className="text-xs text-slate-500">Track outward dispatches and completed LR deliveries</p>
        </div>

        <Link
          to="/outward/new"
          className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-lg text-sm shadow transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Outward Entry</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'transactions'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Outward Receipts ({outwards.length})
        </button>
        <button
          onClick={() => setActiveTab('delivered_items')}
          className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'delivered_items'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Delivered LRs ({outwardItems.length})
        </button>
      </div>

      {activeTab === 'transactions' ? (
        <DataTable
          columns={outwardHeaderColumns}
          data={enrichedOutwards}
          searchPlaceholder="Search Outward No, Vehicle, Driver, Memo, Consigner, Consignee..."
          onExportExcel={(data) => exportToExcel(data, 'Outward_Receipts', outwardHeaderColumns)}
          onExportPDF={(data) => exportToPDF('Outward Receipts Summary', outwardHeaderColumns, data, 'Outward_Receipts')}
        />
      ) : (
        <DataTable
          columns={deliveredItemColumns}
          data={outwardItems}
          searchPlaceholder="Search Delivered LR No, Delivery Person, Invoice, Consignee..."
          onExportExcel={(data) => exportToExcel(data, 'Delivered_LR_Report', deliveredItemColumns)}
          onExportPDF={(data) => exportToPDF('Delivered LR Report', deliveredItemColumns, data, 'Delivered_LR_Report')}
        />
      )}

      {/* EDIT MODAL */}
      <Modal
        isOpen={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        title={editType === 'header' ? `Edit Outward Receipt #${editingRecord?.outwardNo}` : `Edit Delivered LR #${editingRecord?.lrNo}`}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {editType === 'header' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Outward No.</label>
                <input
                  type="text"
                  value={editFormData.outwardNo || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, outwardNo: e.target.value })}
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
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Driver Name</label>
                <input
                  type="text"
                  value={editFormData.driverName || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, driverName: e.target.value })}
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
                  className="w-full px-3 py-2 border rounded-lg text-sm font-bold text-emerald-700"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Delivery Person</label>
                <input
                  type="text"
                  value={editFormData.deliveryPersonName || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, deliveryPersonName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
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
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">To Pay Amt</label>
                <input
                  type="number"
                  value={editFormData.toPayAmount || 0}
                  onChange={(e) => setEditFormData({ ...editFormData, toPayAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
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
              className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-lg text-sm shadow hover:bg-emerald-700"
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
              Are you sure you want to delete {deleteType === 'header' ? `Outward Receipt #${deleteRecord?.outwardNo}` : `Delivered LR #${deleteRecord?.lrNo}`}?
              Deleting an outward record will return its LRs back into Pending Stock.
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
