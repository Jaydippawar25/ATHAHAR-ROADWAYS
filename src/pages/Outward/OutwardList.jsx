import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Link } from 'react-router-dom';
import { Plus, ArrowUpRight, Pencil, Trash2, AlertTriangle, Eye, FileSpreadsheet } from 'lucide-react';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { exportToExcel, exportToPDF } from '../../services/exportService';
import { formatDate } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/numberUtils';

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

  // Modal states for view, edit & delete
  const [viewingRecord, setViewingRecord] = useState(null);
  const [viewType, setViewType] = useState(null); // 'header' | 'item'
  const [editingRecord, setEditingRecord] = useState(null);
  const [editType, setEditType] = useState(null); // 'header' | 'item'
  const [editFormData, setEditFormData] = useState({});
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [deleteType, setDeleteType] = useState(null); // 'header' | 'item'

  const handleStartView = (row, type) => {
    setViewType(type);
    setViewingRecord(row);
  };

  const handleExportRowExcel = (row, type) => {
    if (type === 'header') {
      const items = outwardItems.filter((item) => item.outwardId === row.id || item.outwardNo === row.outwardNo);
      if (items.length > 0) {
        const cols = deliveredItemColumns.filter((c) => c.key !== 'actions');
        exportToExcel(items, `Outward_${row.outwardNo}_LRs`, cols);
      } else {
        const cols = outwardHeaderColumns.filter((c) => c.key !== 'actions');
        exportToExcel([row], `Outward_${row.outwardNo}`, cols);
      }
    } else {
      const cols = deliveredItemColumns.filter((c) => c.key !== 'actions');
      exportToExcel([row], `Delivered_LR_${row.lrNo}`, cols);
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
        <div className="flex items-center justify-center space-x-0.5">
          <button
            onClick={() => handleStartView(row, 'header')}
            className="p-0.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
            title="View Outward Receipt"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleExportRowExcel(row, 'header')}
            className="p-0.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
            title="Export Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleStartEdit(row, 'header')}
            className="p-0.5 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded transition-colors cursor-pointer"
            title="Edit Outward Receipt"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleStartDelete(row, 'header')}
            className="p-0.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors cursor-pointer"
            title="Delete Outward Receipt"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const deliveredItemColumns = [
    { label: 'Out No.', key: 'outwardNo' },
    { label: 'LR No.', key: 'lrNo', render: (row) => <span className="font-extrabold text-emerald-700">{row.lrNo}</span> },
    { label: 'Out Date', key: 'outwardDate', type: 'date' },
    { label: 'In Date', key: 'inwardDate', type: 'date' },
    { label: 'Del. Person', key: 'deliveryPersonName' },
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
        <div className="flex items-center justify-center space-x-0.5">
          <button
            onClick={() => handleStartView(row, 'item')}
            className="p-0.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
            title="View Delivered LR"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleExportRowExcel(row, 'item')}
            className="p-0.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
            title="Export Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleStartEdit(row, 'item')}
            className="p-0.5 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded transition-colors cursor-pointer"
            title="Edit Delivered LR Entry"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleStartDelete(row, 'item')}
            className="p-0.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors cursor-pointer"
            title="Delete Delivered LR Entry"
          >
            <Trash2 className="w-3.5 h-3.5" />
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

      {/* VIEW MODAL */}
      <Modal
        isOpen={!!viewingRecord}
        onClose={() => setViewingRecord(null)}
        title={
          viewType === 'header'
            ? `Outward Receipt Details #${viewingRecord?.outwardNo}`
            : `Delivered LR Details #${viewingRecord?.lrNo}`
        }
        maxWidth="max-w-3xl"
      >
        {viewingRecord && (
          <div className="space-y-4 text-xs">
            {viewType === 'header' ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">Outward No.</span>
                    <span className="font-black text-slate-900 text-sm">{viewingRecord.outwardNo}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">Date</span>
                    <span className="font-bold text-slate-800">{formatDate(viewingRecord.date)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">Vehicle No.</span>
                    <span className="font-black text-emerald-700">{viewingRecord.vehicleNo || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">Driver Name</span>
                    <span className="font-bold text-slate-800">{viewingRecord.driverName || '-'}</span>
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

                {/* Associated Delivered LRs Table */}
                <div className="space-y-2">
                  <h4 className="font-black text-slate-700 uppercase tracking-wider text-[11px]">
                    Associated Delivered LR Items
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-60">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 text-slate-700 font-black uppercase border-b border-slate-200">
                        <tr>
                          <th className="p-2">LR No.</th>
                          <th className="p-2">Delivery Person</th>
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
                        {outwardItems
                          .filter(
                            (item) =>
                              item.outwardId === viewingRecord.id || item.outwardNo === viewingRecord.outwardNo
                          )
                          .map((lr, idx) => (
                            <tr key={lr.id || idx} className="hover:bg-slate-50 font-semibold">
                              <td className="p-2 font-black text-emerald-700">{lr.lrNo}</td>
                              <td className="p-2">{lr.deliveryPersonName || '-'}</td>
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
                  <span className="font-black text-emerald-700 text-sm">{viewingRecord.lrNo}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Outward No.</span>
                  <span className="font-bold text-slate-900">{viewingRecord.outwardNo || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Outward Date</span>
                  <span className="font-bold text-slate-800">{formatDate(viewingRecord.outwardDate || viewingRecord.date)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Inward Date</span>
                  <span className="font-bold text-slate-800">{formatDate(viewingRecord.inwardDate)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Delivery Person</span>
                  <span className="font-bold text-emerald-800">{viewingRecord.deliveryPersonName || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Status</span>
                  <StatusBadge status={viewingRecord.status} />
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
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Packages</span>
                  <span className="font-black text-slate-900">{viewingRecord.pkg || 0} Pkgs</span>
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
