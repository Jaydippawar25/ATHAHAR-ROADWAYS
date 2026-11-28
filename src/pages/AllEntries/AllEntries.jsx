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
  const resolveTab = (tab) => (tab === 'cross_outward_headers' ? 'stock_out_headers' : tab);
  const [activeTab, setActiveTab] = useState(resolveTab(location.state?.tab) || 'all_lrs');

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(resolveTab(location.state.tab));
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
    try {
      if (category?.includes('header')) {
        const isInward = category === 'inward_header';
        const isStockOut = category === 'stock_out_header' || Boolean(row.isCrossOutward);
        const isOutward = category === 'outward_header' && !row.isCrossOutward;
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
            { label: isInward ? 'Arrival Date' : 'Dispatch Date', value: formatDate(row.date) },
            { label: 'Transporter Name', value: row.transporterName || row.outwardTransporterName || '-' },
            { label: isInward ? 'From Station' : 'Origin Station', value: row.from || row.fromStation || row.outwardFromStation || '-' },
            {
              label: isInward ? 'Inward Vehicle No.' : isStockOut ? 'Stock-Out Vehicle No.' : 'Vehicle No.',
              value: row.vehicleNo || row.outwardVehicleNo || '-',
            },
            {
              label: 'Driver Name',
              value: row.driverName || row.outwardDriverName || '-',
            },
            ...(isInward && row.ownerName ? [{ label: 'Vehicle Owner Name', value: row.ownerName }] : []),
            ...(isOutward && row.deliveryPersonName ? [{ label: 'Delivery Person', value: row.deliveryPersonName }] : []),
            ...(!isOutward && row.memoNo ? [{ label: 'Memo No.', value: row.memoNo }] : []),
            { label: 'Total PKG', value: `${row.totalQty || 0} Pkgs` },
            { label: 'Total Freight', value: formatCurrency(totalFreight) },
          ],
          items,
        });
      } else {
        const inwVeh = row.inwardVehicleNo && row.inwardVehicleNo !== '-' ? row.inwardVehicleNo : (row.inwardNo && row.inwardNo !== '-' ? row.vehicleNo : '-');
        const outVeh = row.outwardVehicleNo && row.outwardVehicleNo !== '-' ? row.outwardVehicleNo : (row.outwardNo && row.outwardNo !== '-' ? row.vehicleNo : '-');
        const inwDrv = row.inwardDriverName && row.inwardDriverName !== '-' ? row.inwardDriverName : (row.inwardNo && row.inwardNo !== '-' ? row.driverName : '-');
        const outDrv = row.outwardDriverName && row.outwardDriverName !== '-' ? row.outwardDriverName : (row.outwardNo && row.outwardNo !== '-' ? row.driverName : '-');

        printRecordDetails({
          title: `LR Entry Details #${row.lrNo}`,
          fields: [
            { label: 'LR No.', value: row.lrNo },
            { label: 'Status', value: row.status },
            { label: 'Packages', value: `${row.pkg || 0} Pkgs` },
            { label: 'Inward No.', value: row.inwardNo || '-' },
            { label: 'Inward Date', value: formatDate(row.inwardDate) },
            { label: 'Inward Transporter', value: row.inwardTransporterName || row.transporterName || '-' },
            { label: 'Inward Origin Station', value: row.inwardFromStation || row.from || row.fromStation || '-' },
            { label: 'Incoming Vehicle', value: inwVeh || '-' },
            { label: 'Inward Driver', value: inwDrv || '-' },
            ...(row.ownerName && row.ownerName !== '-' ? [{ label: 'Vehicle Owner', value: row.inwardOwnerName || row.ownerName }] : []),
            ...(row.memoNo && row.memoNo !== '-' ? [{ label: 'Memo No.', value: row.memoNo }] : []),
            { label: 'Outward No.', value: row.outwardNo || '-' },
            { label: 'Dispatch Date', value: formatDate(row.outwardDate) },
            { label: 'Transporter Name', value: row.outwardTransporterName || (row.recordCategory === 'outward_item' ? row.transporterName : '-') },
            { label: 'Origin Station', value: row.outwardFromStation || (row.recordCategory === 'outward_item' ? (row.from || row.fromStation) : (row.from || '-')) },
            { label: 'Vehicle No.', value: outVeh || '-' },
            { label: 'Driver Name', value: outDrv || '-' },
            { label: 'Delivery Person', value: row.deliveryPersonName || '-' },
            { label: 'CT To', value: row.ctTo || '-' },
            { label: 'Consigner', value: row.consignorName || '-' },
            { label: 'Consignee', value: row.consigneeName || '-' },
            { label: 'To Pay', value: formatCurrency(row.toPayAmount) },
            { label: 'T.B.B', value: formatCurrency(row.tbbAmount) },
            { label: 'Paid', value: formatCurrency(row.paidAmount) },
          ],
        });
      }
    } catch (err) {
      console.error('Error generating print preview:', err);
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
    const resolvedTransporter =
      out.transporterName ||
      out.outwardTransporterName ||
      items.find((i) => i.outwardTransporterName)?.outwardTransporterName ||
      items.find((i) => i.transporterName)?.transporterName ||
      '-';
    const resolvedVehicle =
      out.vehicleNo ||
      out.outwardVehicleNo ||
      items.find((i) => i.outwardVehicleNo)?.outwardVehicleNo ||
      items.find((i) => i.vehicleNo)?.vehicleNo ||
      '-';
    const resolvedDriver =
      out.driverName ||
      out.outwardDriverName ||
      items.find((i) => i.outwardDriverName)?.outwardDriverName ||
      items.find((i) => i.driverName)?.driverName ||
      '-';
    const resolvedDelPerson =
      out.deliveryPersonName ||
      items.find((i) => i.deliveryPersonName && i.deliveryPersonName !== '-')?.deliveryPersonName ||
      '-';
    const resolvedFrom =
      out.from ||
      out.fromStation ||
      out.outwardFromStation ||
      items.find((i) => i.outwardFromStation)?.outwardFromStation ||
      items.find((i) => i.from || i.fromStation)?.from ||
      '-';

    const isCross = out.isCrossOutward || String(out.outwardNo || '').toUpperCase().startsWith('STOCK-OUT');

    return {
      ...out,
      transporterName: resolvedTransporter,
      outwardTransporterName: resolvedTransporter,
      vehicleNo: resolvedVehicle,
      outwardVehicleNo: resolvedVehicle,
      driverName: resolvedDriver,
      outwardDriverName: resolvedDriver,
      deliveryPersonName: resolvedDelPerson,
      from: resolvedFrom,
      fromStation: resolvedFrom,
      outwardFromStation: resolvedFrom,
      toStation: out.toStation || items.find((i) => i.toStation)?.toStation || items.find((i) => i.ctTo)?.ctTo || '',
      ownerName: isCross ? (out.ownerName || '') : '',
      memoNo: isCross ? (out.memoNo || '') : '',
      consignorName: consignors || out.consignorName || '-',
      consigneeName: consignees || out.consigneeName || '-',
      totalQty: items.length > 0 ? items.reduce((acc, curr) => acc + (Number(curr.pkg) || 0), 0) : out.totalQty,
      totalToPay: items.length > 0 ? items.reduce((acc, curr) => acc + (Number(curr.toPayAmount) || 0), 0) : out.totalToPay,
      totalTbb: items.length > 0 ? items.reduce((acc, curr) => acc + (Number(curr.tbbAmount) || 0), 0) : out.totalTbb,
      totalPaid: items.length > 0 ? items.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0) : out.totalPaid,
      totalCrossingFreight: items.length > 0 ? items.reduce((acc, curr) => acc + (Number(curr.crossingFreight) || 0), 0) : (Number(out.totalCrossingFreight) || 0),
    };
  });

  const isStockOutRecord = (out) =>
    Boolean(out.isCrossOutward || String(out.outwardNo || '').toUpperCase().startsWith('STOCK-OUT'));

  const deduplicateOutwardHeaders = (list) => {
    const map = new Map();
    for (const item of list) {
      const key = String(item.outwardNo || item.id || '').trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, item);
      } else {
        const existing = map.get(key);
        const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        const currTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
        if (currTime >= existingTime) {
          map.set(key, { ...existing, ...item });
        }
      }
    }
    return Array.from(map.values());
  };

  const enrichedOutwards = deduplicateOutwardHeaders(allEnrichedOutwards.filter((out) => !isStockOutRecord(out)));
  const enrichedStockOuts = deduplicateOutwardHeaders(allEnrichedOutwards.filter((out) => isStockOutRecord(out)));

  // Combine inward and outward items into a unified master list of all LR entries
  const allLREntriesMap = new Map();
  // High-speed indices to eliminate 5-million-iteration nested loops
  const inwardKeysByLR = new Map();
  const inwardKeysById = new Map();

  // First add all Inward items
  inwardItems.forEach((item, index) => {
    const parentInw = inwards.find((inw) => inw.id === item.inwardId || inw.inwardNo === item.inwardNo);
    const itemKey = item.id ? String(item.id) : `inw-item-${item.inwardNo || 'inw'}-${item.lrNo}-${index}`;
    allLREntriesMap.set(itemKey, {
      ...item,
      inwardVehicleNo: item.vehicleNo || parentInw?.vehicleNo || '-',
      inwardDriverName: item.driverName || parentInw?.driverName || '-',
      inwardOwnerName: item.ownerName || parentInw?.ownerName || '-',
      outwardVehicleNo: '-',
      outwardDriverName: '-',
      memoNo: item.memoNo || parentInw?.memoNo || '-',
      inwardDate: item.date || item.inwardDate || parentInw?.date || '-',
      outwardDate: '-',
      outwardNo: '-',
      deliveryPersonName: '-',
      recordCategory: 'inward_item',
    });

    if (item.id) inwardKeysById.set(String(item.id), itemKey);
    const cleanLR = String(item.lrNo ?? '').trim().toLowerCase();
    if (cleanLR) {
      if (!inwardKeysByLR.has(cleanLR)) inwardKeysByLR.set(cleanLR, []);
      inwardKeysByLR.get(cleanLR).push(itemKey);
    }
  });

  // Merge Outward delivered items
  // Pre-deduplicate outward items by (outwardNo + lrNo) to ensure zero double-counting,
  // preserving inward linkage if available
  const outwardByDispatchMap = new Map();
  for (const item of outwardItems || []) {
    if (!item) continue;
    const outKey = String(item.outwardNo || item.outwardId || '').trim().toLowerCase();
    const lrKey = String(item.lrNo ?? '').trim().toLowerCase();
    const key = `${outKey}__${lrKey}`;

    if (!outwardByDispatchMap.has(key)) {
      outwardByDispatchMap.set(key, item);
    } else {
      const existing = outwardByDispatchMap.get(key);
      const existingHasInward = Boolean(existing.inwardItemId || (existing.inwardNo && existing.inwardNo !== '-'));
      const currentHasInward = Boolean(item.inwardItemId || (item.inwardNo && item.inwardNo !== '-'));
      if (!existingHasInward && currentHasInward) {
        outwardByDispatchMap.set(key, { ...existing, ...item });
      }
    }
  }
  const uniqueOutwardItems = Array.from(outwardByDispatchMap.values());

  uniqueOutwardItems.forEach((item, index) => {
    const parentOut = outwards.find(
      (out) => out.id === item.outwardId || out.outwardNo === item.outwardNo
    );
    const isStockOut = Boolean(
      item.isCrossOutward ||
      parentOut?.isCrossOutward ||
      String(item.outwardNo || parentOut?.outwardNo || '').toUpperCase().startsWith('STOCK-OUT')
    );

    const outVeh = parentOut?.vehicleNo || item.outwardVehicleNo || item.vehicleNo || '-';
    const outDrv = parentOut?.driverName || item.outwardDriverName || item.driverName || '-';

    if (isStockOut) {
      // Cross Stock Out is a manual direct dispatch with NO connection to Pending Stock or Inward
      allLREntriesMap.set(`stockout-${item.id || index}`, {
        ...item,
        transporterName: item.transporterName || parentOut?.transporterName || '-',
        fromStation: item.from || parentOut?.from || '-',
        toStation: item.toStation || parentOut?.toStation || item.ctTo || '-',
        crossingFreight: Number(item.crossingFreight) || 0,
        inwardVehicleNo: '-',
        inwardDriverName: '-',
        memoNo: item.memoNo || parentOut?.memoNo || '-',
        inwardDate: '-',
        inwardNo: '-',
        outwardDate: item.outwardDate || item.date || parentOut?.date || '-',
        outwardNo: item.outwardNo || parentOut?.outwardNo || '-',
        outwardVehicleNo: outVeh,
        outwardDriverName: outDrv,
        vehicleNo: outVeh,
        driverName: outDrv,
        ownerName: item.ownerName || parentOut?.ownerName || '-',
        deliveryPersonName: item.deliveryPersonName || parentOut?.deliveryPersonName || '-',
        status: 'DISPATCHED',
        recordCategory: 'stock_out_item',
      });
    } else {
      // Standard Outward delivered from Godown pending stock
      // Instant O(1) indexed lookup instead of 5-million nested scan
      let inwKey = null;
      if (item.inwardItemId && inwardKeysById.has(String(item.inwardItemId))) {
        inwKey = inwardKeysById.get(String(item.inwardItemId));
      } else {
        const cleanLR = String(item.lrNo ?? '').trim().toLowerCase();
        const candidateKeys = inwardKeysByLR.get(cleanLR) || [];
        for (const k of candidateKeys) {
          const val = allLREntriesMap.get(k);
          if (!val || val.recordCategory !== 'inward_item') continue;

          const outMatch = val.outwardNo && item.outwardNo &&
            String(val.outwardNo).trim().toLowerCase() === String(item.outwardNo).trim().toLowerCase();
          if (outMatch) { inwKey = k; break; }

          const hasDifferentOutwardNo = val.outwardNo && item.outwardNo &&
            val.outwardNo !== '-' && item.outwardNo !== '-' &&
            String(val.outwardNo).trim().toLowerCase() !== String(item.outwardNo).trim().toLowerCase();
          if (hasDifferentOutwardNo) continue;

          if (val.status === 'DELIVERED' && (!val.outwardNo || val.outwardNo === '-')) {
            const transMatch = !item.transporterName || !val.transporterName ||
              String(item.transporterName).trim().toLowerCase() === String(val.transporterName).trim().toLowerCase();
            if (transMatch) { inwKey = k; break; }
          }
        }
      }

      if (inwKey) {
        const existing = allLREntriesMap.get(inwKey);
        const inwVeh = existing.inwardVehicleNo && existing.inwardVehicleNo !== '-' ? existing.inwardVehicleNo : (existing.vehicleNo || '-');
        const inwDrv = existing.inwardDriverName && existing.inwardDriverName !== '-' ? existing.inwardDriverName : (existing.driverName || '-');
        const inwOwner = existing.inwardOwnerName && existing.inwardOwnerName !== '-' ? existing.inwardOwnerName : (existing.ownerName || '-');
        const inwTrans = existing.inwardTransporterName || existing.transporterName || '-';

        const outTrans = parentOut?.transporterName || item.outwardTransporterName || item.transporterName || inwTrans;
        const outDelPerson = parentOut?.deliveryPersonName || item.deliveryPersonName || existing.deliveryPersonName || '-';
        const outFrom = parentOut?.from || parentOut?.fromStation || item.outwardFromStation || item.from || existing.from || '-';

        allLREntriesMap.set(inwKey, {
          ...existing,
          ...item,
          transporterName: outTrans,
          outwardTransporterName: parentOut?.transporterName || item.outwardTransporterName || item.transporterName || '-',
          inwardTransporterName: inwTrans,
          inwardDate: existing.inwardDate || item.inwardDate || item.date || '-',
          inwardNo: existing.inwardNo && existing.inwardNo !== '-' ? existing.inwardNo : (item.inwardNo || '-'),
          inwardVehicleNo: inwVeh,
          inwardDriverName: inwDrv,
          inwardOwnerName: inwOwner,
          outwardDate: item.outwardDate || item.date || parentOut?.date || existing.outwardDate || '-',
          outwardNo: item.outwardNo || parentOut?.outwardNo || existing.outwardNo || '-',
          outwardVehicleNo: outVeh,
          outwardDriverName: outDrv,
          vehicleNo: outVeh !== '-' ? outVeh : inwVeh,
          driverName: outDrv !== '-' ? outDrv : inwDrv,
          ownerName: inwOwner,
          deliveryPersonName: outDelPerson,
          from: outFrom,
          status: 'DELIVERED',
          recordCategory: 'outward_item',
        });
      } else {
        const outTrans = parentOut?.transporterName || item.outwardTransporterName || item.transporterName || '-';
        const outDelPerson = parentOut?.deliveryPersonName || item.deliveryPersonName || '-';
        const outFrom = parentOut?.from || parentOut?.fromStation || item.outwardFromStation || item.from || '-';

        allLREntriesMap.set(`out-${item.id || index}`, {
          ...item,
          transporterName: outTrans,
          outwardTransporterName: outTrans,
          fromStation: outFrom,
          from: outFrom,
          inwardVehicleNo: '-',
          inwardDriverName: '-',
          inwardOwnerName: '-',
          memoNo: item.memoNo || parentOut?.memoNo || '-',
          inwardDate: '-',
          inwardNo: '-',
          outwardDate: item.outwardDate || item.date || parentOut?.date || '-',
          outwardNo: item.outwardNo || parentOut?.outwardNo || '-',
          outwardVehicleNo: outVeh,
          outwardDriverName: outDrv,
          vehicleNo: outVeh,
          driverName: outDrv,
          ownerName: '-',
          deliveryPersonName: outDelPerson,
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
      label: 'CROSSING',
      key: 'crossingFreight',
      type: 'currency',
      render: (row) => (
        <span>{Number(row.crossingFreight) > 0 ? formatCurrency(row.crossingFreight) : '-'}</span>
      ),
    },
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
      label: 'Transporter',
      key: 'transporterName',
      render: (row) => (
        <span className="font-semibold text-slate-800 max-w-[85px] truncate block" title={row.transporterName}>
          {row.transporterName || '-'}
        </span>
      ),
    },
    {
      label: 'From',
      key: 'from',
      render: (row) => (
        <span className="max-w-[65px] truncate block font-medium" title={row.from || row.fromStation}>
          {row.from || row.fromStation || '-'}
        </span>
      ),
    },
    {
      label: 'Vehicle No.',
      key: 'vehicleNo',
      render: (row) => (
        <span className="whitespace-nowrap block font-semibold" title={row.vehicleNo}>
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
      label: 'Del. Person',
      key: 'deliveryPersonName',
      render: (row) => (
        <span className="max-w-[75px] truncate block text-emerald-800 font-semibold" title={row.deliveryPersonName}>
          {row.deliveryPersonName || '-'}
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
    {
      label: 'To',
      key: 'toStation',
      render: (row) => (
        <span className="max-w-[60px] truncate block" title={row.toStation}>
          {row.toStation || '-'}
        </span>
      ),
    },
    { label: 'PKG', key: 'totalQty' },
    { label: 'TO PAY', key: 'totalToPay', type: 'currency' },
    { label: 'T.B.B', key: 'totalTbb', type: 'currency' },
    { label: 'PAID', key: 'totalPaid', type: 'currency' },
    { label: 'CROSSING', key: 'totalCrossingFreight', type: 'currency' },
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
      <div className="bg-gradient-to-r from-[#061944] via-[#102256] to-[#2D3661] rounded-3xl p-6 text-white shadow-xl border border-blue-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="h-1 highway-accent-line absolute top-0 left-0 right-0" />
        <div className="absolute right-0 top-0 w-80 h-80 bg-[#3956D4]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1.5 z-10">
          <div className="flex items-center space-x-2 text-[10px] font-black tracking-widest uppercase text-[#3956D4]">
            <span className="bg-white/10 px-2.5 py-0.5 rounded-full border border-white/20">
              CENTRAL LOGISTICS REGISTRY
            </span>
            <span>&bull; SANGLI TERMINAL &mdash; ATHAHAR ROADWAYS</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center space-x-2.5 text-white">
            <ArrowLeftRight className="w-7 h-7 text-[#3956D4]" />
            <span>All Inward &amp; Outward Entries</span>
          </h2>

          <p className="text-blue-100 text-xs sm:text-sm font-medium">
            Complete transaction register of all inward receipts, outward dispatches, stock-out entries, and individual LR records
          </p>
        </div>

        <div className="flex items-center space-x-2.5 flex-shrink-0 z-10 w-full sm:w-auto">
          <button
            onClick={() => navigate('/inward/new')}
            className="flex-1 sm:flex-none justify-center inline-flex items-center space-x-1.5 bg-[#3956D4] hover:bg-[#2D3661] text-white font-black px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-[#3956D4]/25 transition-all active:scale-[0.98] cursor-pointer"
          >
            <span>+ New Inward</span>
          </button>
          <button
            onClick={() => navigate('/outward/new')}
            className="flex-1 sm:flex-none justify-center inline-flex items-center space-x-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <span>+ New Outward</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
        <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] sm:text-[10.5px] font-black uppercase text-slate-400 tracking-wider">Inward Receipts</span>
            <ArrowDownLeft className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900">{enrichedInwards.length}</p>
          <p className="text-[10px] sm:text-[11px] text-sky-700 font-bold mt-0.5">{totalInwardPkg} Total PKG</p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] sm:text-[10.5px] font-black uppercase text-slate-400 tracking-wider">Outward Receipts</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900">{enrichedOutwards.length}</p>
          <p className="text-[10px] sm:text-[11px] text-emerald-700 font-bold mt-0.5">{totalOutwardPkg} Total PKG</p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] sm:text-[10.5px] font-black uppercase text-slate-400 tracking-wider">Stock-Out</span>
            <Shuffle className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900">{enrichedStockOuts.length}</p>
          <p className="text-[10px] sm:text-[11px] text-indigo-700 font-bold mt-0.5">{totalStockOutPkg} Total PKG</p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] sm:text-[10.5px] font-black uppercase text-slate-400 tracking-wider">Total LR Entries</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-blue-700">{combinedLREntries.length}</p>
          <p className="text-[10px] sm:text-[11px] text-blue-600 font-bold mt-0.5">Combined LRs</p>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs">
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
        <div className="flex items-center gap-2 border-b border-[#E1E5EE] pb-3 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('all_lrs')}
            className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center space-x-2 cursor-pointer shadow-2xs ${
              activeTab === 'all_lrs'
                ? 'bg-[#061944] text-white shadow-sm border border-[#061944]'
                : 'bg-white text-[#2D3661] hover:bg-[#F6F7F9] border border-[#E1E5EE]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>All LR Entries ({combinedLREntries.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('inward_headers')}
            className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center space-x-2 cursor-pointer shadow-2xs ${
              activeTab === 'inward_headers'
                ? 'bg-[#3956D4] text-white shadow-sm border border-[#3956D4]'
                : 'bg-white text-[#2D3661] hover:bg-[#F6F7F9] border border-[#E1E5EE]'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Inward Receipts ({enrichedInwards.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('outward_headers')}
            className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center space-x-2 cursor-pointer shadow-2xs ${
              activeTab === 'outward_headers'
                ? 'bg-[#2D3661] text-white shadow-sm border border-[#2D3661]'
                : 'bg-white text-[#2D3661] hover:bg-[#F6F7F9] border border-[#E1E5EE]'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Outward Receipts ({enrichedOutwards.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('stock_out_headers')}
            className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center space-x-2 cursor-pointer shadow-2xs ${
              activeTab === 'stock_out_headers'
                ? 'bg-[#7A4F05] text-white shadow-sm border border-[#7A4F05]'
                : 'bg-white text-[#2D3661] hover:bg-[#F6F7F9] border border-[#E1E5EE]'
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
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">
                      {viewCategory === 'inward_header' ? 'Arrival Date' : 'Dispatch Date'}
                    </span>
                    <span className="font-bold text-slate-800">{formatDate(viewingRecord.date)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">Transporter Name</span>
                    <span className="font-bold text-slate-800 truncate block">
                      {viewingRecord.transporterName || viewingRecord.outwardTransporterName || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">
                      {viewCategory === 'inward_header' ? 'From Station' : 'Origin Station'}
                    </span>
                    <span className="font-bold text-slate-800">
                      {viewingRecord.from || viewingRecord.fromStation || viewingRecord.outwardFromStation || '-'}
                    </span>
                  </div>
                  {viewCategory === 'stock_out_header' && (
                    <div>
                      <span className="text-slate-400 font-bold uppercase block text-[10px]">
                        Destination Station
                      </span>
                      <span className="font-bold text-slate-800">
                        {viewingRecord.toStation || '-'}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">
                      {viewCategory === 'inward_header' ? 'Inward Vehicle No.' : 'Vehicle No.'}
                    </span>
                    <span className="font-black text-sky-700">
                      {viewingRecord.vehicleNo || viewingRecord.outwardVehicleNo || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">Driver Name</span>
                    <span className="font-bold text-slate-800">
                      {viewingRecord.driverName || viewingRecord.outwardDriverName || '-'}
                    </span>
                  </div>
                  {viewCategory === 'inward_header' ? (
                    <div>
                      <span className="text-slate-400 font-bold uppercase block text-[10px]">Vehicle Owner Name</span>
                      <span className="font-bold text-slate-800">{viewingRecord.ownerName || '-'}</span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-slate-400 font-bold uppercase block text-[10px]">Delivery Person</span>
                      <span className="font-bold text-emerald-800">{viewingRecord.deliveryPersonName || '-'}</span>
                    </div>
                  )}
                  {viewCategory === 'inward_header' && (
                    <div>
                      <span className="text-slate-400 font-bold uppercase block text-[10px]">Memo No.</span>
                      <span className="font-bold text-slate-800">{viewingRecord.memoNo || '-'}</span>
                    </div>
                  )}
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
                          (Number(viewingRecord.totalPaid) || 0) +
                          (Number(viewingRecord.totalCrossingFreight) || 0)
                      )}
                    </span>
                  </div>
                </div>

                {/* Associated LRs Table */}
                {(() => {
                  const modalChildItems =
                    viewCategory === 'inward_header'
                      ? inwardItems.filter(
                          (item) =>
                            item.inwardId === viewingRecord.id || item.inwardNo === viewingRecord.inwardNo
                        )
                      : outwardItems.filter(
                          (item) =>
                            item.outwardId === viewingRecord.id || item.outwardNo === viewingRecord.outwardNo
                        );
                  const hasModalCrossing = modalChildItems.some((i) => Number(i.crossingFreight) > 0);

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-slate-700 uppercase tracking-wider text-[11px]">
                          Associated LR Items
                        </h4>
                        <span className="text-[10px] font-bold text-slate-400">
                          {modalChildItems.length} {modalChildItems.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>

                      {/* Mobile Cards (sm:hidden) */}
                      <div className="sm:hidden space-y-2 max-h-64 overflow-y-auto pr-0.5">
                        {modalChildItems.length === 0 ? (
                          <div className="py-6 px-4 text-center text-slate-400 font-medium text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            No LR items found. Click the Edit (pencil) button on this row to add or update LR items.
                          </div>
                        ) : (
                          modalChildItems.map((lr, idx) => (
                            <div key={lr.id || idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-black text-sky-800 text-xs">LR #{lr.lrNo}</span>
                                <StatusBadge status={lr.status} />
                              </div>
                              <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600">
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Consigner</span>
                                  <span className="font-semibold truncate block">{lr.consignorName || '-'}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Consignee</span>
                                  <span className="font-semibold truncate block">{lr.consigneeName || '-'}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-slate-400 block">CT To</span>
                                  <span className="font-semibold truncate block">{lr.ctTo || '-'}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-slate-400 block">PKG</span>
                                  <span className="font-black text-slate-800">{lr.pkg}</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[10px] text-slate-500 pt-1.5 border-t border-slate-200">
                                <div>To Pay: <span className="font-bold text-slate-800">{formatCurrency(lr.toPayAmount)}</span></div>
                                <div>TBB: <span className="font-bold text-slate-800">{formatCurrency(lr.tbbAmount)}</span></div>
                                <div>Paid: <span className="font-bold text-slate-800">{formatCurrency(lr.paidAmount)}</span></div>
                                {hasModalCrossing && (
                                  <div>Crossing: <span className="font-bold text-purple-700">{formatCurrency(lr.crossingFreight)}</span></div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Desktop Table (hidden sm:block) */}
                      <div className="hidden sm:block border border-slate-200 rounded-xl overflow-x-auto max-h-60">
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
                              {hasModalCrossing && <th className="p-2">Crossing</th>}
                              <th className="p-2">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {modalChildItems.length === 0 ? (
                              <tr>
                                <td colSpan={hasModalCrossing ? 10 : 9} className="py-8 px-4 text-center text-slate-400 font-medium text-xs">
                                  No LR items found. Click the Edit (pencil) button on this row in the table to add or update LR items.
                                </td>
                              </tr>
                            ) : (
                              modalChildItems.map((lr, idx) => (
                                <tr key={lr.id || idx} className="hover:bg-slate-50 font-semibold">
                                  <td className="p-2 font-black text-sky-700">{lr.lrNo}</td>
                                  <td className="p-2">{lr.consignorName || '-'}</td>
                                  <td className="p-2">{lr.consigneeName || '-'}</td>
                                  <td className="p-2">{lr.ctTo || '-'}</td>
                                  <td className="p-2 font-bold">{lr.pkg}</td>
                                  <td className="p-2">{formatCurrency(lr.toPayAmount)}</td>
                                  <td className="p-2">{formatCurrency(lr.tbbAmount)}</td>
                                  <td className="p-2">{formatCurrency(lr.paidAmount)}</td>
                                  {hasModalCrossing && (
                                    <td className="p-2 font-bold text-purple-700">{formatCurrency(lr.crossingFreight)}</td>
                                  )}
                                  <td className="p-2">
                                    <StatusBadge status={lr.status} />
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
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
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Inward Transporter</span>
                  <span className="font-bold text-slate-800">
                    {viewingRecord.inwardTransporterName || viewingRecord.transporterName || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Inward Origin Station</span>
                  <span className="font-bold text-slate-800">
                    {viewingRecord.inwardFromStation || viewingRecord.from || viewingRecord.fromStation || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Incoming Vehicle</span>
                  <span className="font-bold text-indigo-700">
                    {viewingRecord.inwardVehicleNo && viewingRecord.inwardVehicleNo !== '-'
                      ? viewingRecord.inwardVehicleNo
                      : viewingRecord.inwardNo && viewingRecord.inwardNo !== '-'
                      ? viewingRecord.vehicleNo
                      : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Inward Driver</span>
                  <span className="font-bold text-slate-800">
                    {viewingRecord.inwardDriverName && viewingRecord.inwardDriverName !== '-'
                      ? viewingRecord.inwardDriverName
                      : '-'}
                  </span>
                </div>
                {viewingRecord.ownerName && viewingRecord.ownerName !== '-' && (
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">Vehicle Owner</span>
                    <span className="font-bold text-slate-800">
                      {viewingRecord.inwardOwnerName || viewingRecord.ownerName}
                    </span>
                  </div>
                )}
                {viewingRecord.memoNo && viewingRecord.memoNo !== '-' && (
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[10px]">Memo No.</span>
                    <span className="font-bold text-slate-800">{viewingRecord.memoNo}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Outward No.</span>
                  <span className="font-bold text-purple-700">{viewingRecord.outwardNo || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Dispatch Date</span>
                  <span className="font-bold text-slate-800">{formatDate(viewingRecord.outwardDate)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Transporter Name</span>
                  <span className="font-bold text-slate-800">
                    {viewingRecord.outwardTransporterName || (viewingRecord.recordCategory === 'outward_item' ? viewingRecord.transporterName : '-')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Origin Station</span>
                  <span className="font-bold text-slate-800">
                    {viewingRecord.outwardFromStation || (viewingRecord.recordCategory === 'outward_item' ? (viewingRecord.from || viewingRecord.fromStation) : (viewingRecord.from || '-'))}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Vehicle No.</span>
                  <span className="font-bold text-emerald-700">
                    {viewingRecord.outwardVehicleNo && viewingRecord.outwardVehicleNo !== '-'
                      ? viewingRecord.outwardVehicleNo
                      : viewingRecord.outwardNo && viewingRecord.outwardNo !== '-'
                      ? viewingRecord.vehicleNo
                      : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Driver Name</span>
                  <span className="font-bold text-slate-800">
                    {viewingRecord.outwardDriverName && viewingRecord.outwardDriverName !== '-'
                      ? viewingRecord.outwardDriverName
                      : viewingRecord.outwardNo && viewingRecord.outwardNo !== '-'
                      ? viewingRecord.driverName
                      : '-'}
                  </span>
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
                  <label className="block text-slate-600 mb-1 uppercase font-bold">Transporter Name</label>
                  <input
                    type="text"
                    value={editFormData.transporterName || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, transporterName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-sky-500 uppercase font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 uppercase font-bold">
                    {editCategory === 'inward_header' ? 'From Station' : 'Origin Station'}
                  </label>
                  <input
                    type="text"
                    value={editFormData.from || editFormData.fromStation || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, from: e.target.value, fromStation: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-sky-500 uppercase"
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
                  <label className="block text-slate-600 mb-1 uppercase font-bold">Driver Name</label>
                  <input
                    type="text"
                    value={editFormData.driverName || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, driverName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-sky-500 uppercase"
                  />
                </div>
                {editCategory === 'inward_header' && (
                  <>
                    <div>
                      <label className="block text-slate-600 mb-1 uppercase font-bold">Vehicle Owner Name</label>
                      <input
                        type="text"
                        value={editFormData.ownerName || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, ownerName: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-sky-500 uppercase"
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
                  </>
                )}
                {editCategory === 'outward_header' && (
                  <div>
                    <label className="block text-slate-600 mb-1 uppercase font-bold">Delivery Person</label>
                    <input
                      type="text"
                      value={editFormData.deliveryPersonName || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, deliveryPersonName: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-sky-500 uppercase text-emerald-800 font-bold"
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
                {editCategory === 'outward_item' ? (
                  <div>
                    <label className="block text-slate-600 mb-1 uppercase font-bold">Delivery Person</label>
                    <input
                      type="text"
                      value={editFormData.deliveryPersonName || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, deliveryPersonName: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded text-emerald-800 font-bold"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-600 mb-1 uppercase font-bold">Memo No.</label>
                    <input
                      type="text"
                      value={editFormData.memoNo || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, memoNo: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded"
                    />
                  </div>
                )}
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
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    data-lpignore="true"
                    value={editFormData.pkg || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, pkg: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 uppercase font-bold">To Pay</label>
                  <input
                    type="number"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    data-lpignore="true"
                    value={editFormData.toPayAmount || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, toPayAmount: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 uppercase font-bold">T.B.B</label>
                  <input
                    type="number"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    data-lpignore="true"
                    value={editFormData.tbbAmount || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, tbbAmount: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 uppercase font-bold">Paid</label>
                  <input
                    type="number"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    data-lpignore="true"
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
