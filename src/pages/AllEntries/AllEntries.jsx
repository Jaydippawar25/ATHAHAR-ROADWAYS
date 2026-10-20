import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  Shuffle,
  PackageCheck,
  Pencil,
  Trash2,
  AlertTriangle,
  Layers,
  FileSpreadsheet,
  FileText,
  Eye,
  Printer,
} from 'lucide-react';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { exportToExcel, exportToPDF, printRecordDetails } from '../../services/exportService';
import { formatDate } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/numberUtils';

export const AllEntries = () => {
  const location = useLocation();
  const navigate = useNavigate();
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

  // Active view tab: 'all_lrs' | 'inward_headers' | 'outward_headers' | 'stock_out_headers'
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'all_lrs');

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state?.tab]);

  // Modal states for view, edit & delete
  const [viewingRecord, setViewingRecord] = useState(null);
  const [viewCategory, setViewCategory] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editCategory, setEditCategory] = useState(null); // 'inward_header' | 'inward_item' | 'outward_header' | 'stock_out_header' | 'outward_item'
  const [editFormData, setEditFormData] = useState({});

  const [deleteRecord, setDeleteRecord] = useState(null);
  const [deleteCategory, setDeleteCategory] = useState(null);

  const handleStartView = (row, category) => {
    setViewCategory(category);
    setViewingRecord(row);
  };

  const handleExportRowExcel = (row, category) => {
    if (category === 'inward_header') {
      const items = inwardItems.filter((item) => item.inwardId === row.id || item.inwardNo === row.inwardNo);
      if (items.length > 0) {
        const cols = combinedLRColumns.filter((c) => c.key !== 'actions');
        exportToExcel(items, `Inward_${row.inwardNo}_LRs`, cols);
      } else {
        const cols = inwardHeaderColumns.filter((c) => c.key !== 'actions');
        exportToExcel([row], `Inward_${row.inwardNo}`, cols);
      }
    } else if (category === 'outward_header' || category === 'stock_out_header') {
      const items = outwardItems.filter((item) => item.outwardId === row.id || item.outwardNo === row.outwardNo);
      const isStockOut = category === 'stock_out_header' || row.isCrossOutward;
      const prefix = isStockOut ? 'StockOut' : 'Outward';
      if (items.length > 0) {
        const cols = combinedLRColumns.filter((c) => c.key !== 'actions');
        exportToExcel(items, `${prefix}_${row.outwardNo}_LRs`, cols);
      } else {
        const cols = (isStockOut ? stockOutHeaderColumns : outwardHeaderColumns).filter((c) => c.key !== 'actions');
        exportToExcel([row], `${prefix}_${row.outwardNo}`, cols);
      }
    } else {
      const cols = combinedLRColumns.filter((c) => c.key !== 'actions');
      exportToExcel([row], `LR_${row.lrNo}`, cols);
    }
  };

  const handlePrintRecord = (row, category) => {
    if (category?.includes('header')) {
      const isInward = category === 'inward_header';
      const isStockOut = category === 'stock_out_header' || row.isCrossOutward;
      const items = isInward
        ? inwardItems.filter((item) => item.inwardId === row.id || item.inwardNo === row.inwardNo)
        : outwardItems.filter((item) => item.outwardId === row.id || item.outwardNo === row.outwardNo);
      const totalFreight =
        (Number(row.totalToPay) || 0) + (Number(row.totalTbb) || 0) + (Number(row.totalPaid) || 0);

      printRecordDetails({
        title: isInward
          ? `Inward Receipt Details #${row.inwardNo}`
          : isStockOut
          ? `Stock-Out Receipt Details #${row.outwardNo}`
          : `Outward Receipt Details #${row.outwardNo}`,
        fields: [
          {
            label: isInward ? 'Inward No.' : isStockOut ? 'Stock-Out No.' : 'Outward No.',
            value: row.inwardNo || row.outwardNo,
          },
          { label: 'Date', value: formatDate(row.date) },
          { label: 'Vehicle No.', value: row.vehicleNo || '-' },
          {
            label: isInward ? 'Vehicle Owner' : 'Driver Name',
            value: isInward ? row.ownerName || '-' : row.driverName || row.ownerName || '-',
          },
          ...(isStockOut && row.ownerName
            ? [{ label: 'Vehicle Owner', value: row.ownerName }]
            : []),
          { label: 'From Station', value: row.from || '-' },
          { label: 'Memo No.', value: row.memoNo || '-' },
          { label: 'Total PKG', value: `${row.totalQty || 0} Pkgs` },
          { label: 'Total Freight', value: formatCurrency(totalFreight) },
        ],
        items,
      });
    } else {
      printRecordDetails({
        title: `LR Entry Details #${row.lrNo}`,
        fields: [
          { label: 'LR No.', value: row.lrNo },
          { label: 'Status', value: row.status },
          { label: 'Packages', value: `${row.pkg || 0} Pkgs` },
          { label: 'Inward No.', value: row.inwardNo || '-' },
          { label: 'Inward Date', value: formatDate(row.inwardDate) },
          { label: 'Outward No.', value: row.outwardNo || '-' },
          { label: 'Outward Date', value: formatDate(row.outwardDate) },
          { label: 'Delivery Person', value: row.deliveryPersonName || '-' },
          { label: 'CT To', value: row.ctTo || '-' },
          { label: 'Consigner', value: row.consignorName || '-' },
          { label: 'Consignee', value: row.consigneeName || '-' },
          { label: 'Memo No.', value: row.memoNo || '-' },
          { label: 'To Pay', value: formatCurrency(row.toPayAmount) },
          { label: 'T.B.B', value: formatCurrency(row.tbbAmount) },
          { label: 'Paid', value: formatCurrency(row.paidAmount) },
        ],
      });
    }
  };

  const handleStartEdit = (row, category) => {
    if (category === 'inward_header') {
      const items = inwardItems.filter(
        (item) => item.inwardId === row.id || item.inwardNo === row.inwardNo
      );
      navigate('/inward', {
        state: {
          editInward: { ...row, items },
          returnTab: activeTab,
        },
      });
    } else if (category === 'inward_item') {
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
          returnTab: activeTab,
        },
      });
    } else if (category === 'outward_header' || category === 'stock_out_header') {
      const items = outwardItems.filter(
        (item) => item.outwardId === row.id || item.outwardNo === row.outwardNo
      );
      const isStockOut =
        category === 'stock_out_header' ||
        row.isCrossOutward ||
        String(row.outwardNo || '').startsWith('STOCK-OUT');
      navigate(isStockOut ? '/cross-outward' : '/outward', {
        state: {
          editOutward: { ...row, items },
          returnTab: activeTab,
        },
      });
    } else if (category === 'outward_item' || category === 'stock_out_item') {
      const parentOutward = outwards.find(
        (out) => out.id === row.outwardId || out.outwardNo === row.outwardNo
      );
      const items = parentOutward
        ? outwardItems.filter(
            (item) => item.outwardId === parentOutward.id || item.outwardNo === parentOutward.outwardNo
          )
        : [row];
      const isCross = Boolean(
        category === 'stock_out_item' ||
          parentOutward?.isCrossOutward ||
          row.isCrossOutward ||
          String(parentOutward?.outwardNo || row.outwardNo || '').startsWith('STOCK-OUT')
      );
      navigate(isCross ? '/cross-outward' : '/outward', {
        state: {
          editOutward: {
            ...(parentOutward || row),
            id: parentOutward?.id || row.outwardId || row.id,
            outwardNo: parentOutward?.outwardNo || row.outwardNo,
            date: parentOutward?.date || row.outwardDate || row.date,
            items: items.length > 0 ? items : [row],
          },
          focusLrNo: row.lrNo,
          returnTab: activeTab,
        },
      });
    }
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
    } else if (editCategory === 'outward_header' || editCategory === 'stock_out_header') {
      handleUpdateOutwardHeader(editingRecord.id, editFormData);
    } else if (editCategory === 'outward_item' || editCategory === 'stock_out_item') {
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
    } else if (deleteCategory === 'outward_header' || deleteCategory === 'stock_out_header') {
      handleDeleteOutward(deleteRecord.id);
    } else if (deleteCategory === 'outward_item' || deleteCategory === 'stock_out_item') {
      handleDeleteOutwardItem(deleteRecord.id);
    }
    setDeleteRecord(null);
    setDeleteCategory(null);
  };

  // Enrich inwards with consignor and consignee names and live totals derived from items
  const enrichedInwards = inwards.map((inw) => {
    const items = inwardItems.filter((item) => item.inwardId === inw.id || item.inwardNo === inw.inwardNo);
    const consignors = Array.from(new Set(items.map((i) => i.consignorName).filter(Boolean))).join(', ');
    const consignees = Array.from(new Set(items.map((i) => i.consigneeName).filter(Boolean))).join(', ');
    return {
      ...inw,
      consignorName: consignors || inw.consignorName || '-',
      consigneeName: consignees || inw.consigneeName || '-',
      totalQty: items.length > 0 ? items.reduce((acc, curr) => acc + (Number(curr.pkg) || 0), 0) : inw.totalQty,
      totalToPay: items.length > 0 ? items.reduce((acc, curr) => acc + (Number(curr.toPayAmount) || 0), 0) : inw.totalToPay,
      totalTbb: items.length > 0 ? items.reduce((acc, curr) => acc + (Number(curr.tbbAmount) || 0), 0) : inw.totalTbb,
      totalPaid: items.length > 0 ? items.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0) : inw.totalPaid,
    };
  });

  // Enrich outwards with consignor and consignee names and live totals derived from items
  const allEnrichedOutwards = outwards.map((out) => {
    const items = outwardItems.filter((item) => item.outwardId === out.id || item.outwardNo === out.outwardNo);
    const consignors = Array.from(new Set(items.map((i) => i.consignorName).filter(Boolean))).join(', ');
    const consignees = Array.from(new Set(items.map((i) => i.consigneeName).filter(Boolean))).join(', ');
    return {
      ...out,
      consignorName: consignors || out.consignorName || '-',
      consigneeName: consignees || out.consigneeName || '-',
      totalQty: items.length > 0 ? items.reduce((acc, curr) => acc + (Number(curr.pkg) || 0), 0) : out.totalQty,
      totalToPay: items.length > 0 ? items.reduce((acc, curr) => acc + (Number(curr.toPayAmount) || 0), 0) : out.totalToPay,
      totalTbb: items.length > 0 ? items.reduce((acc, curr) => acc + (Number(curr.tbbAmount) || 0), 0) : out.totalTbb,
      totalPaid: items.length > 0 ? items.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0) : out.totalPaid,
    };
  });

  const isStockOutRecord = (out) =>
    Boolean(out.isCrossOutward || String(out.outwardNo || '').toUpperCase().startsWith('STOCK-OUT'));

  const enrichedOutwards = allEnrichedOutwards.filter((out) => !isStockOutRecord(out));
  const enrichedStockOuts = allEnrichedOutwards.filter((out) => isStockOutRecord(out));

  // Combine inward and outward items into a unified master list of all LR entries
  const allLREntriesMap = new Map();

  // First add all Inward items
  inwardItems.forEach((item) => {
    const parentInw = inwards.find((inw) => inw.id === item.inwardId || inw.inwardNo === item.inwardNo);
    allLREntriesMap.set(item.id || item.lrNo, {
      ...item,
      memoNo: item.memoNo || parentInw?.memoNo || '-',
      inwardDate: item.date || item.inwardDate || '-',
      outwardDate: '-',
      outwardNo: '-',
      deliveryPersonName: '-',
      recordCategory: 'inward_item',
    });
  });

  // Merge Outward delivered items
  outwardItems.forEach((item) => {
    const isStockOut = Boolean(
      item.isCrossOutward ||
      String(item.outwardNo || '').toUpperCase().startsWith('STOCK-OUT')
    );

    if (isStockOut) {
      // Cross Stock Out is a manual direct dispatch with NO connection to Pending Stock or Inward
      allLREntriesMap.set(`stockout-${item.id}`, {
        ...item,
        memoNo: item.memoNo || '-',
        inwardDate: '-',
        inwardNo: '-',
        outwardDate: item.outwardDate || item.date || '-',
        outwardNo: item.outwardNo || '-',
        deliveryPersonName: item.deliveryPersonName || '-',
        status: 'DISPATCHED',
        recordCategory: 'stock_out_item',
      });
    } else {
      // Standard Outward delivered from Godown pending stock
      const inwKey = Array.from(allLREntriesMap.keys()).find((k) => {
        const val = allLREntriesMap.get(k);
        return (
          val.recordCategory === 'inward_item' &&
          ((item.inwardItemId && val.id === item.inwardItemId) ||
            val.id === item.id ||
            String(val.lrNo ?? '').trim().toLowerCase() === String(item.lrNo ?? '').trim().toLowerCase())
        );
      });

      if (inwKey) {
        const existing = allLREntriesMap.get(inwKey);
        allLREntriesMap.set(inwKey, {
          ...existing,
          ...item,
          inwardDate: existing.inwardDate || item.inwardDate || item.date || '-',
          outwardDate: item.outwardDate || item.date || '-',
          outwardNo: item.outwardNo || '-',
          deliveryPersonName: item.deliveryPersonName || existing.deliveryPersonName || '-',
          status: 'DELIVERED',
          recordCategory: 'outward_item',
        });
      } else {
        allLREntriesMap.set(`out-${item.id}`, {
          ...item,
          memoNo: item.memoNo || '-',
          inwardDate: '-',
          inwardNo: '-',
          outwardDate: item.outwardDate || item.date || '-',
          outwardNo: item.outwardNo || '-',
          deliveryPersonName: item.deliveryPersonName || '-',
          status: 'DELIVERED',
          recordCategory: 'outward_item',
        });
      }
    }
  });

  const combinedLREntries = Array.from(allLREntriesMap.values());

  // Statistics
  const totalInwardPkg = enrichedInwards.reduce((sum, i) => sum + (Number(i.totalQty) || 0), 0);
  const totalOutwardPkg = enrichedOutwards.reduce((sum, o) => sum + (Number(o.totalQty) || 0), 0);
  const totalStockOutPkg = enrichedStockOuts.reduce((sum, o) => sum + (Number(o.totalQty) || 0), 0);

  // Column Definitions
  const combinedLRColumns = [
    {
      label: 'LR No.',
      key: 'lrNo',
      render: (row) => <span className="font-extrabold text-sky-800 whitespace-nowrap">{row.lrNo}</span>,
    },
    { label: 'Status', key: 'status', type: 'status', width: 'min-w-[96px]' },
    { label: 'In Date', key: 'inwardDate', type: 'date' },
    { label: 'Out Date', key: 'outwardDate', type: 'date' },
    {
      label: 'In No.',
      key: 'inwardNo',
      render: (row) => (
        <span className="whitespace-nowrap block" title={row.inwardNo}>
          {row.inwardNo || '-'}
        </span>
      ),
    },
    {
      label: 'Out No.',
      key: 'outwardNo',
      render: (row) => (
        <span className="whitespace-nowrap block" title={row.outwardNo}>
          {row.outwardNo || '-'}
        </span>
      ),
    },
    {
      label: 'CONSIGNER',
      key: 'consignorName',
      render: (row) => (
        <span className="font-semibold text-slate-800 max-w-[65px] truncate block" title={row.consignorName}>
          {row.consignorName || '-'}
        </span>
      ),
    },
    {
      label: 'CONSIGNEE',
      key: 'consigneeName',
      render: (row) => (
        <span className="font-semibold text-slate-800 max-w-[65px] truncate block" title={row.consigneeName}>
          {row.consigneeName || '-'}
        </span>
      ),
    },
    {
      label: 'CT To',
      key: 'ctTo',
      render: (row) => (
        <span className="max-w-[55px] truncate block" title={row.ctTo}>
          {row.ctTo || '-'}
        </span>
      ),
    },
    {
      label: 'Del. Person',
      key: 'deliveryPersonName',
      render: (row) => (
        <span className="max-w-[60px] truncate block" title={row.deliveryPersonName}>
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
        <div className="flex items-center justify-center space-x-1">
          <button
            onClick={() => handleStartView(row, row.recordCategory || 'inward_item')}
            className="p-0.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
            title="View Entry"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleStartEdit(row, row.recordCategory || 'inward_item')}
            className="p-0.5 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded transition-colors cursor-pointer"
            title="Edit Entry"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleStartDelete(row, row.recordCategory || 'inward_item')}
            className="p-0.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors cursor-pointer"
            title="Delete Entry"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const inwardHeaderColumns = [
    {
      label: 'Inward No.',
      key: 'inwardNo',
      render: (row) => (
        <span className="font-bold text-slate-900 whitespace-nowrap block" title={row.inwardNo}>
          {row.inwardNo || '-'}
        </span>
      ),
    },
    { label: 'Date', key: 'date', type: 'date' },
    {
      label: 'CONSIGNER',
      key: 'consignorName',
      render: (row) => (
        <span className="font-semibold text-slate-800 max-w-[80px] truncate block" title={row.consignorName}>
          {row.consignorName || '-'}
        </span>
      ),
    },
    {
      label: 'CONSIGNEE',
      key: 'consigneeName',
      render: (row) => (
        <span className="font-semibold text-slate-800 max-w-[80px] truncate block" title={row.consigneeName}>
          {row.consigneeName || '-'}
        </span>
      ),
    },
    {
      label: 'Vehicle No.',
      key: 'vehicleNo',
      render: (row) => (
        <span className="whitespace-nowrap block" title={row.vehicleNo}>
          {row.vehicleNo || '-'}
        </span>
      ),
    },
    {
      label: 'Vehicle Owner',
      key: 'ownerName',
      render: (row) => (
        <span className="max-w-[75px] truncate block" title={row.ownerName}>
          {row.ownerName || '-'}
        </span>
      ),
    },
    {
      label: 'From',
      key: 'from',
      render: (row) => (
        <span className="max-w-[60px] truncate block" title={row.from}>
          {row.from || '-'}
        </span>
      ),
    },
    {
      label: 'Memo No.',
      key: 'memoNo',
      render: (row) => (
        <span className="max-w-[55px] truncate block" title={row.memoNo}>
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
        <div className="flex items-center justify-center space-x-1">
          <button
            onClick={() => handleStartView(row, 'inward_header')}
            className="p-0.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
            title="View Receipt"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleStartEdit(row, 'inward_header')}
            className="p-0.5 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded transition-colors cursor-pointer"
            title="Edit Receipt"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleStartDelete(row, 'inward_header')}
            className="p-0.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors cursor-pointer"
            title="Delete Receipt"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const outwardHeaderColumns = [
    {
      label: 'Outward No.',
      key: 'outwardNo',
      render: (row) => (
        <span className="font-bold text-slate-900 whitespace-nowrap block" title={row.outwardNo}>
          {row.outwardNo || '-'}
        </span>
      ),
    },
    { label: 'Date', key: 'date', type: 'date' },
    {
      label: 'CONSIGNER',
      key: 'consignorName',
      render: (row) => (
        <span className="font-semibold text-slate-800 max-w-[80px] truncate block" title={row.consignorName}>
          {row.consignorName || '-'}
        </span>
      ),
    },
    {
      label: 'CONSIGNEE',
      key: 'consigneeName',
      render: (row) => (
        <span className="font-semibold text-slate-800 max-w-[80px] truncate block" title={row.consigneeName}>
          {row.consigneeName || '-'}
        </span>
      ),
    },
    {
      label: 'Vehicle No.',
      key: 'vehicleNo',
      render: (row) => (
        <span className="whitespace-nowrap block" title={row.vehicleNo}>
          {row.vehicleNo || '-'}
        </span>
      ),
    },
    {
      label: 'Driver Name',
      key: 'driverName',
      render: (row) => (
        <span className="max-w-[75px] truncate block" title={row.driverName}>
          {row.driverName || '-'}
        </span>
      ),
    },
    {
      label: 'From',
      key: 'from',
      render: (row) => (
        <span className="max-w-[60px] truncate block" title={row.from}>
          {row.from || '-'}
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
        <div className="flex items-center justify-center space-x-1">
          <button
            onClick={() => handleStartView(row, 'outward_header')}
            className="p-0.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
            title="View Outward Receipt"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleStartEdit(row, 'outward_header')}
            className="p-0.5 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded transition-colors cursor-pointer"
            title="Edit Outward Receipt"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleStartDelete(row, 'outward_header')}
            className="p-0.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors cursor-pointer"
            title="Delete Outward Receipt"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const stockOutHeaderColumns = [
    {
      label: 'Stock-Out No.',
      key: 'outwardNo',
      render: (row) => (
        <span className="font-bold text-slate-900 whitespace-nowrap block" title={row.outwardNo}>
          {row.outwardNo || '-'}
        </span>
      ),
    },
    { label: 'Date', key: 'date', type: 'date' },
    {
      label: 'CONSIGNER',
      key: 'consignorName',
      render: (row) => (
        <span className="font-semibold text-slate-800 max-w-[80px] truncate block" title={row.consignorName}>
          {row.consignorName || '-'}
        </span>
      ),
    },
    {
      label: 'CONSIGNEE',
      key: 'consigneeName',
      render: (row) => (
        <span className="font-semibold text-slate-800 max-w-[80px] truncate block" title={row.consigneeName}>
          {row.consigneeName || '-'}
        </span>
      ),
    },
    {
      label: 'Vehicle No.',
      key: 'vehicleNo',
      render: (row) => (
        <span className="whitespace-nowrap block" title={row.vehicleNo}>
          {row.vehicleNo || '-'}
        </span>
      ),
    },
    {
      label: 'Driver Name',
      key: 'driverName',
      render: (row) => (
        <span className="max-w-[75px] truncate block" title={row.driverName}>
          {row.driverName || '-'}
        </span>
      ),
    },
    {
      label: 'Vehicle Owner',
      key: 'ownerName',
      render: (row) => (
        <span className="max-w-[75px] truncate block" title={row.ownerName}>
          {row.ownerName || '-'}
        </span>
      ),
    },
    {
      label: 'From',
      key: 'from',
      render: (row) => (
        <span className="max-w-[60px] truncate block" title={row.from}>
          {row.from || '-'}
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
        <div className="flex items-center justify-center space-x-1">
          <button
            onClick={() => handleStartView(row, 'stock_out_header')}
            className="p-0.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
            title="View Stock-Out Receipt"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleStartEdit(row, 'stock_out_header')}
            className="p-0.5 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded transition-colors cursor-pointer"
            title="Edit Stock-Out Receipt"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleStartDelete(row, 'stock_out_header')}
            className="p-0.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors cursor-pointer"
            title="Delete Stock-Out Receipt"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 text-slate-800 max-w-full">
      {/* Top Banner with Logistics Registry details */}
      <div className="bg-gradient-to-r from-[#07182e] via-[#0b2545] to-[#133e87] rounded-3xl p-6 text-white shadow-xl border border-blue-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="h-1 highway-accent-line absolute top-0 left-0 right-0" />
        <div className="absolute right-0 top-0 w-80 h-80 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1.5 z-10">
          <div className="flex items-center space-x-2 text-[10px] font-black tracking-widest uppercase text-orange-400">
            <span className="bg-white/10 px-2.5 py-0.5 rounded-full border border-white/20">
              CENTRAL LOGISTICS REGISTRY
            </span>
            <span>&bull; SANGLI TERMINAL &mdash; ATHAHAR ROADWAYS</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center space-x-2.5 text-white">
            <ArrowLeftRight className="w-7 h-7 text-orange-400" />
            <span>All Inward &amp; Outward Entries</span>
          </h2>

          <p className="text-blue-100 text-xs sm:text-sm font-medium">
            Complete transaction register of all inward receipts, outward dispatches, stock-out entries, and individual LR records
          </p>
        </div>

        <div className="flex items-center space-x-2.5 flex-shrink-0 z-10">
          <button
            onClick={() => navigate('/inward/new')}
            className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-black px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-orange-500/25 transition-all active:scale-[0.98] cursor-pointer"
          >
            <span>+ New Inward</span>
          </button>
          <button
            onClick={() => navigate('/outward/new')}
            className="inline-flex items-center space-x-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <span>+ New Outward</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10.5px] font-black uppercase text-slate-400 tracking-wider">Inward Receipts</span>
            <ArrowDownLeft className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{enrichedInwards.length}</p>
          <p className="text-[11px] text-sky-700 font-bold mt-0.5">{totalInwardPkg} Total PKG</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10.5px] font-black uppercase text-slate-400 tracking-wider">Outward Receipts</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{enrichedOutwards.length}</p>
          <p className="text-[11px] text-emerald-700 font-bold mt-0.5">{totalOutwardPkg} Total PKG</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10.5px] font-black uppercase text-slate-400 tracking-wider">Stock-Out Receipts</span>
            <Shuffle className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{enrichedStockOuts.length}</p>
          <p className="text-[11px] text-indigo-700 font-bold mt-0.5">{totalStockOutPkg} Total PKG</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10.5px] font-black uppercase text-slate-400 tracking-wider">Total LR Entries</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-700">{combinedLREntries.length}</p>
          <p className="text-[11px] text-blue-600 font-bold mt-0.5">Combined LRs</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10.5px] font-black uppercase text-slate-400 tracking-wider">Pending Stock</span>
            <PackageCheck className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-600">{pendingStock.length}</p>
          <p className="text-[11px] text-amber-700 font-bold mt-0.5">In Godown Stock</p>
        </div>
      </div>

      {/* Main Tab Controls & Data Table */}
      <div className="space-y-4">
        {/* Tab Selection Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveTab('all_lrs')}
            className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center space-x-2 cursor-pointer shadow-2xs ${
              activeTab === 'all_lrs'
                ? 'bg-[#1d4ed8] text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>All LR Entries ({combinedLREntries.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('inward_headers')}
            className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center space-x-2 cursor-pointer shadow-2xs ${
              activeTab === 'inward_headers'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Inward Receipts ({enrichedInwards.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('outward_headers')}
            className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center space-x-2 cursor-pointer shadow-2xs ${
              activeTab === 'outward_headers'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Outward Receipts ({enrichedOutwards.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('stock_out_headers')}
            className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center space-x-2 cursor-pointer shadow-2xs ${
              activeTab === 'stock_out_headers'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Shuffle className="w-4 h-4" />
            <span>Stock-Out Receipts ({enrichedStockOuts.length})</span>
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

        {activeTab === 'stock_out_headers' && (
          <DataTable
            columns={stockOutHeaderColumns}
            data={enrichedStockOuts}
            searchPlaceholder="Search Stock-Out Receipts by Stock-Out No., Vehicle No., Driver, Vehicle Owner..."
            onExportExcel={(data) => exportToExcel(data, 'Stock_Out_Receipts_Register', stockOutHeaderColumns)}
            onExportPDF={(data) =>
              exportToPDF('Stock-Out Receipts Register', stockOutHeaderColumns, data, 'Stock_Out_Receipts_Register')
            }
          />
        )}
      </div>

      {/* View Record Modal */}
      {viewingRecord && (
        <Modal
          isOpen={!!viewingRecord}
          onClose={() => setViewingRecord(null)}
          title={
            viewCategory === 'inward_header'
              ? `Inward Receipt Details #${viewingRecord.inwardNo}`
              : viewCategory === 'stock_out_header'
              ? `Stock-Out Receipt Details #${viewingRecord.outwardNo}`
              : viewCategory === 'outward_header'
              ? `Outward Receipt Details #${viewingRecord.outwardNo}`
              : `LR Entry Details #${viewingRecord.lrNo}`
          }
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4 text-xs">
            {viewCategory?.includes('header') ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">
                      {viewCategory === 'inward_header'
                        ? 'Inward No.'
                        : viewCategory === 'stock_out_header'
                        ? 'Stock-Out No.'
                        : 'Outward No.'}
                    </span>
                    <span className="font-black text-slate-900 text-sm">
                      {viewingRecord.inwardNo || viewingRecord.outwardNo}
                    </span>
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
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">
                      {viewCategory === 'inward_header' ? 'Vehicle Owner' : 'Driver Name'}
                    </span>
                    <span className="font-bold text-slate-800">
                      {viewCategory === 'inward_header'
                        ? viewingRecord.ownerName || '-'
                        : viewingRecord.driverName || viewingRecord.ownerName || '-'}
                    </span>
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
                        {(viewCategory === 'inward_header'
                          ? inwardItems.filter(
                              (item) =>
                                item.inwardId === viewingRecord.id || item.inwardNo === viewingRecord.inwardNo
                            )
                          : outwardItems.filter(
                              (item) =>
                                item.outwardId === viewingRecord.id || item.outwardNo === viewingRecord.outwardNo
                            )
                        ).map((lr, idx) => (
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
                  <span className="font-black text-sky-800 text-sm">{viewingRecord.lrNo}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Status</span>
                  <StatusBadge status={viewingRecord.status} />
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Packages</span>
                  <span className="font-black text-slate-900">{viewingRecord.pkg || 0} Pkgs</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Inward No.</span>
                  <span className="font-bold text-slate-800">{viewingRecord.inwardNo || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Inward Date</span>
                  <span className="font-bold text-slate-800">{formatDate(viewingRecord.inwardDate)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Outward No.</span>
                  <span className="font-bold text-slate-800">{viewingRecord.outwardNo || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Outward Date</span>
                  <span className="font-bold text-slate-800">{formatDate(viewingRecord.outwardDate)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Delivery Person</span>
                  <span className="font-bold text-emerald-800">{viewingRecord.deliveryPersonName || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">CT To</span>
                  <span className="font-bold text-slate-800">{viewingRecord.ctTo || '-'}</span>
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
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Memo No.</span>
                  <span className="font-bold text-slate-800">{viewingRecord.memoNo || '-'}</span>
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
                onClick={() => handlePrintRecord(viewingRecord, viewCategory)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded shadow-xs flex items-center cursor-pointer"
              >
                <Printer className="w-4 h-4 mr-1.5" />
                <span>Print</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportRowExcel(viewingRecord, viewCategory)}
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
        </Modal>
      )}

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
                  <label className="block text-slate-600 mb-1 uppercase font-bold">Memo No.</label>
                  <input
                    type="text"
                    value={editFormData.memoNo || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, memoNo: e.target.value })}
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
