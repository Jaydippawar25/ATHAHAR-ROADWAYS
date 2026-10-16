import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { PackageCheck, ArrowUpRight, Clock, Pencil, Trash2, AlertTriangle, Eye, FileSpreadsheet, Printer } from 'lucide-react';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { calculateDaysPending, formatDate } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/numberUtils';
import { exportToExcel, exportToPDF, printRecordDetails } from '../../services/exportService';

export const PendingStock = () => {
  const { inwards, inwardItems, pendingStock, handleDeleteInwardItem, handleUpdateInwardItem } = useApp();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState([]);

  // Modal states for view, edit & delete
  const [viewingRecord, setViewingRecord] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [deleteRecord, setDeleteRecord] = useState(null);

  const handleExportRowExcel = (row) => {
    const cols = pendingColumns.filter((c) => c.key !== 'actions');
    exportToExcel([row], `Pending_LR_${row.lrNo}`, cols);
  };

  const handlePrintRecord = (row) => {
    printRecordDetails({
      title: `Pending LR Details #${row.lrNo}`,
      fields: [
        { label: 'LR No.', value: row.lrNo },
        { label: 'Inward No.', value: row.inwardNo || '-' },
        { label: 'Inward Date', value: formatDate(row.inwardDate || row.date) },
        { label: 'Memo No.', value: row.memoNo || '-' },
        { label: 'Status', value: row.status },
        { label: 'CT To', value: row.ctTo || '-' },
        { label: 'Consignor', value: row.consignorName || '-' },
        { label: 'Consignee', value: row.consigneeName || '-' },
        { label: 'Packages', value: `${row.pkg || 0} Pkgs` },
        { label: 'To Pay', value: formatCurrency(row.toPayAmount) },
        { label: 'T.B.B', value: formatCurrency(row.tbbAmount) },
        { label: 'Paid', value: formatCurrency(row.paidAmount) },
      ],
    });
  };

  const handleStartEdit = (row) => {
    const parentInward = inwards.find(
      (inw) => inw.id === row.inwardId || inw.inwardNo === row.inwardNo
    );
    const items = parentInward
      ? inwardItems.filter(
          (item) => item.inwardId === parentInward.id || item.inwardNo === parentInward.inwardNo
        )
      : [row];
    navigate('/inward', {
      state: {
        editInward: {
          ...(parentInward || row),
          id: parentInward?.id || row.inwardId || row.id,
          inwardNo: parentInward?.inwardNo || row.inwardNo,
          date: parentInward?.date || row.inwardDate || row.date,
          items: items.length > 0 ? items : [row],
        },
        focusLrNo: row.lrNo,
        returnPath: '/pending',
      },
    });
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
      width: 'w-[82px]',
      render: (row) => (
        <span className="font-extrabold text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 text-[10.5px] block text-center truncate">
          {row.lrNo}
        </span>
      ),
    },
    { label: 'Inw Date', key: 'inwardDate', type: 'date', width: 'w-[74px]' },
    { label: 'Inw No.', key: 'inwardNo', width: 'w-[72px]' },
    { label: 'Memo No.', key: 'memoNo', width: 'w-[70px]' },
    { label: 'CT To', key: 'ctTo', width: 'w-[84px]' },
    { label: 'Consignor', key: 'consignorName', width: 'w-[96px]' },
    { label: 'Consignee', key: 'consigneeName', width: 'w-[96px]' },
    { label: 'PKG', key: 'pkg', width: 'w-[44px]', render: (row) => <span className="font-bold">{row.pkg}</span> },
    { label: 'To Pay', key: 'toPayAmount', type: 'currency', width: 'w-[72px]' },
    { label: 'T.B.B', key: 'tbbAmount', type: 'currency', width: 'w-[68px]' },
    { label: 'Paid', key: 'paidAmount', type: 'currency', width: 'w-[66px]' },
    { label: 'Status', key: 'status', type: 'status', width: 'w-[72px]' },
    {
      label: 'Actions',
      key: 'actions',
      width: 'w-[64px]',
      render: (row) => (
        <div className="flex items-center justify-center space-x-0.5">
          <button
            onClick={() => setViewingRecord(row)}
            className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
            title="View Pending LR"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleStartEdit(row)}
            className="p-1 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded transition-colors cursor-pointer"
            title="Edit Pending LR"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDeleteRecord(row)}
            className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors cursor-pointer"
            title="Delete Pending LR"
          >
            <Trash2 className="w-3.5 h-3.5" />
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
        searchPlaceholder="Search Pending LR No, Memo No, Consignor, Consignee..."
        onExportExcel={(data) => exportToExcel(data, 'Pending_Stock_Report', pendingColumns)}
        onExportPDF={(data) => exportToPDF('Pending Stock Register', pendingColumns, data, 'Pending_Stock_Report')}
        compact={true}
        tableLayout="fixed"
      />

      {/* VIEW MODAL */}
      <Modal
        isOpen={!!viewingRecord}
        onClose={() => setViewingRecord(null)}
        title={`Pending LR Details #${viewingRecord?.lrNo}`}
        maxWidth="max-w-2xl"
      >
        {viewingRecord && (
          <div className="space-y-4 text-xs">
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
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Inward Date</span>
                <span className="font-bold text-slate-800">{formatDate(viewingRecord.inwardDate || viewingRecord.date)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Memo No.</span>
                <span className="font-bold text-slate-800">{viewingRecord.memoNo || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">Status</span>
                <StatusBadge status={viewingRecord.status} />
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase block text-[10px]">CT To</span>
                <span className="font-bold text-slate-800">{viewingRecord.ctTo || '-'}</span>
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
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Memo No.</label>
              <input
                type="text"
                value={editFormData.memoNo || ''}
                onChange={(e) => setEditFormData({ ...editFormData, memoNo: e.target.value })}
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
