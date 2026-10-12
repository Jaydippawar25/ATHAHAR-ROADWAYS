import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { Save, Printer, ArrowLeft, AlertCircle, Plus, Trash2, Edit2, RotateCcw, Eye } from 'lucide-react';
import { getTodayDateString, formatDate } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/numberUtils';
import { printRecordDetails } from '../../services/exportService';

export const CrossOutwardCreate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { masters, handleCreateOutward, handleUpdateFullOutward, handleAddMaster } = useApp();
  const { user } = useAuth();

  const editOutwardData = location.state?.editOutward || null;
  const editingOutwardId = editOutwardData?.id || null;

  // HEADER DETAILS (8 fields matching screenshot)
  const [headerData, setHeaderData] = useState({
    outwardNo: `OUT-${Math.floor(1000 + Math.random() * 9000)}`,
    date: getTodayDateString(),
    transporterName: masters.transporters[0]?.name || '',
    fromStation: masters.stations[0]?.name || 'SANGLI',
    vehicleNo: masters.vehicles[0]?.vehicleNo || '',
    memoNo: '',
    driverName: masters.drivers[0]?.name || '',
    ownerName: masters.vehicleOwners?.[0]?.name || '',
    isCrossOutward: true,
  });

  // ITEM ENTRY FORM (LR Entry Details matching screenshot)
  const [itemForm, setItemForm] = useState({
    srNo: 1,
    lrNo: '',
    date: getTodayDateString(),
    invoiceNo: '',
    consignorName: '',
    consigneeName: '',
    ctTo: masters.stations[0]?.name || '',
    pkg: '',
    toPayAmount: '',
    tbbAmount: '',
    paidAmount: '',
  });

  const fieldRefs = useRef([]);

  const focusLRNoInput = () => {
    setTimeout(() => {
      if (fieldRefs.current[0]) {
        fieldRefs.current[0].focus();
        if (typeof fieldRefs.current[0].select === 'function') {
          fieldRefs.current[0].select();
        }
      }
    }, 50);
  };

  useEffect(() => {
    focusLRNoInput();
  }, []);

  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      return;
    }
    if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
      if (index >= 9) {
        e.preventDefault();
        handleAddOrUpdateLR();
      } else {
        e.preventDefault();
        const nextField = fieldRefs.current[index + 1];
        if (nextField) {
          nextField.focus();
          if (typeof nextField.select === 'function') {
            nextField.select();
          }
        }
      }
    }
  };

  // Load Edit Mode if navigated from All Entries
  useEffect(() => {
    if (location.state?.editOutward) {
      const edit = location.state.editOutward;
      setHeaderData({
        outwardNo: edit.outwardNo || `OUT-${Math.floor(1000 + Math.random() * 9000)}`,
        date: edit.date || edit.outwardDate || getTodayDateString(),
        transporterName: edit.transporterName || masters.transporters[0]?.name || '',
        fromStation: edit.from || edit.fromStation || masters.stations[0]?.name || 'SANGLI',
        vehicleNo: edit.vehicleNo || masters.vehicles[0]?.vehicleNo || '',
        memoNo: edit.memoNo || '',
        driverName: edit.driverName || masters.drivers[0]?.name || '',
        ownerName: edit.ownerName || masters.vehicleOwners?.[0]?.name || '',
        isCrossOutward: true,
      });

      const items = (edit.items || []).map((item, idx) => ({
        ...item,
        srNo: idx + 1,
        lrNo: String(item.lrNo ?? ''),
        date: item.inwardDate || item.date || edit.date || getTodayDateString(),
        pkg: Number(item.pkg) || 0,
        invoiceNo: item.invoiceNo || '',
        ctTo: item.ctTo || '',
        consignorName: item.consignorName || '',
        consigneeName: item.consigneeName || '',
        toPayAmount: Number(item.toPayAmount) || 0,
        tbbAmount: Number(item.tbbAmount) || 0,
        paidAmount: Number(item.paidAmount) || 0,
      }));
      setLrItems(items);

      if (location.state.focusLrNo) {
        const targetIndex = items.findIndex((i) => i.lrNo === location.state.focusLrNo);
        if (targetIndex !== -1) {
          const item = items[targetIndex];
          setItemForm({
            srNo: item.srNo,
            lrNo: String(item.lrNo ?? ''),
            date: item.date || getTodayDateString(),
            invoiceNo: item.invoiceNo || '',
            consignorName: item.consignorName || '',
            consigneeName: item.consigneeName || '',
            ctTo: item.ctTo || '',
            pkg: item.pkg || '',
            toPayAmount: item.toPayAmount || '',
            tbbAmount: item.tbbAmount || '',
            paidAmount: item.paidAmount || '',
          });
          setEditingIndex(targetIndex);
        }
      } else {
        setItemForm((prev) => ({
          ...prev,
          srNo: items.length + 1,
        }));
      }
    }
  }, [location.state]);

  // Staged LR Items List
  const [lrItems, setLrItems] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);

  // Quick Add Master State for [...] buttons
  const [quickAddModal, setQuickAddModal] = useState({
    isOpen: false,
    category: '',
    title: '',
    targetField: '',
    isHeader: true,
  });
  const [quickAddValue, setQuickAddValue] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const itemTotal =
    (Number(itemForm.toPayAmount) || 0) +
    (Number(itemForm.tbbAmount) || 0) +
    (Number(itemForm.paidAmount) || 0);

  const hasFormDraft = Boolean(
    String(itemForm.lrNo ?? '').trim() ||
      itemForm.pkg ||
      itemForm.invoiceNo ||
      String(itemForm.consignorName ?? '').trim() ||
      String(itemForm.consigneeName ?? '').trim() ||
      itemForm.toPayAmount ||
      itemForm.tbbAmount ||
      itemForm.paidAmount
  );

  const previewRowData = {
    srNo: editingIndex !== null ? itemForm.srNo : lrItems.length + 1,
    lrNo: String(itemForm.lrNo ?? '').trim() || '...',
    date: itemForm.date,
    pkg: Number(itemForm.pkg) || 0,
    invoiceNo: itemForm.invoiceNo || '-',
    ctTo: itemForm.ctTo || '-',
    consignorName: itemForm.consignorName || '-',
    consigneeName: itemForm.consigneeName || '-',
    toPayAmount: Number(itemForm.toPayAmount) || 0,
    tbbAmount: Number(itemForm.tbbAmount) || 0,
    paidAmount: Number(itemForm.paidAmount) || 0,
    isDraftPreview: true,
  };

  const displayLrItems =
    editingIndex !== null
      ? lrItems.map((item, idx) => (idx === editingIndex ? { ...item, ...previewRowData, isDraftPreview: true } : item))
      : hasFormDraft
      ? [...lrItems, previewRowData]
      : lrItems;

  const summary = displayLrItems.reduce(
    (acc, curr) => ({
      pkg: acc.pkg + (Number(curr.pkg) || 0),
      toPay: acc.toPay + (Number(curr.toPayAmount) || 0),
      tbb: acc.tbb + (Number(curr.tbbAmount) || 0),
      paid: acc.paid + (Number(curr.paidAmount) || 0),
    }),
    { pkg: 0, toPay: 0, tbb: 0, paid: 0 }
  );

  const handleHeaderChange = (field, value) => {
    setHeaderData((prev) => ({ ...prev, [field]: value }));
    if (field === 'date') {
      setItemForm((prev) => ({ ...prev, date: value }));
    }
  };

  const handleItemChange = (field, value) => {
    setItemForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetItemForm = (nextSrNo) => {
    setItemForm({
      srNo: nextSrNo,
      lrNo: '',
      date: headerData.date,
      invoiceNo: '',
      consignorName: '',
      consigneeName: '',
      ctTo: masters.stations[0]?.name || '',
      pkg: '',
      toPayAmount: '',
      tbbAmount: '',
      paidAmount: '',
    });
    setEditingIndex(null);
  };

  const handleAddOrUpdateLR = (e) => {
    if (e) e.preventDefault();
    setError('');

    if (!String(itemForm.lrNo ?? '').trim()) {
      setError('Please enter LR NO.');
      return;
    }
    if (!itemForm.pkg || Number(itemForm.pkg) <= 0) {
      setError('PKG (Quantity) must be greater than 0.');
      return;
    }

    const isDuplicateInList = lrItems.some(
      (item, idx) =>
        idx !== editingIndex &&
        String(item.lrNo ?? '').toLowerCase() === String(itemForm.lrNo ?? '').trim().toLowerCase()
    );
    if (isDuplicateInList) {
      setError(`LR No. "${itemForm.lrNo}" is already added in the current grid.`);
      return;
    }

    const formattedItem = {
      ...itemForm,
      lrNo: String(itemForm.lrNo ?? '').trim(),
      pkg: Number(itemForm.pkg) || 0,
      toPayAmount: Number(itemForm.toPayAmount) || 0,
      tbbAmount: Number(itemForm.tbbAmount) || 0,
      paidAmount: Number(itemForm.paidAmount) || 0,
    };

    if (editingIndex !== null) {
      const updated = [...lrItems];
      updated[editingIndex] = { ...formattedItem, srNo: editingIndex + 1 };
      setLrItems(updated);
      resetItemForm(updated.length + 1);
      focusLRNoInput();
    } else {
      const updated = [...lrItems, { ...formattedItem, srNo: lrItems.length + 1 }];
      setLrItems(updated);
      resetItemForm(updated.length + 1);
      focusLRNoInput();
    }
  };

  const handleEditRow = (index) => {
    const item = lrItems[index];
    setItemForm({
      srNo: item.srNo,
      lrNo: String(item.lrNo ?? ''),
      date: item.date || headerData.date,
      invoiceNo: item.invoiceNo || '',
      consignorName: item.consignorName || '',
      consigneeName: item.consigneeName || '',
      ctTo: item.ctTo || '',
      pkg: item.pkg,
      toPayAmount: item.toPayAmount || '',
      tbbAmount: item.tbbAmount || '',
      paidAmount: item.paidAmount || '',
    });
    setEditingIndex(index);
    focusLRNoInput();
  };

  const handleDeleteRow = (index) => {
    const filtered = lrItems
      .filter((_, idx) => idx !== index)
      .map((item, idx) => ({ ...item, srNo: idx + 1 }));
    setLrItems(filtered);
    resetItemForm(filtered.length + 1);
  };

  const openQuickAdd = (category, title, targetField, isHeader = true) => {
    setQuickAddModal({ isOpen: true, category, title, targetField, isHeader });
    setQuickAddValue('');
  };

  const handleSaveQuickAdd = (e) => {
    e.preventDefault();
    if (!quickAddValue.trim()) return;
    const val = quickAddValue.trim().toUpperCase();

    if (quickAddModal.category === 'vehicles') {
      handleAddMaster('vehicles', { vehicleNo: val, type: 'Truck' });
    } else {
      handleAddMaster(quickAddModal.category, { name: val });
    }

    if (quickAddModal.isHeader) {
      handleHeaderChange(quickAddModal.targetField, val);
    } else {
      handleItemChange(quickAddModal.targetField, val);
    }

    setQuickAddModal({ isOpen: false, category: '', title: '', targetField: '', isHeader: true });
    setQuickAddValue('');
  };

  const handleSaveCrossOutward = () => {
    setError('');
    setSuccess('');

    if (!headerData.vehicleNo) {
      setError('Please select or add a Vehicle No.');
      return;
    }

    let finalItems = [...lrItems];
    if (String(itemForm.lrNo ?? '').trim() && Number(itemForm.pkg) > 0) {
      const formattedDraft = {
        ...(editingIndex !== null ? lrItems[editingIndex] : {}),
        ...itemForm,
        lrNo: String(itemForm.lrNo ?? '').trim(),
        pkg: Number(itemForm.pkg) || 0,
        toPayAmount: Number(itemForm.toPayAmount) || 0,
        tbbAmount: Number(itemForm.tbbAmount) || 0,
        paidAmount: Number(itemForm.paidAmount) || 0,
      };
      if (editingIndex !== null) {
        finalItems[editingIndex] = { ...formattedDraft, srNo: editingIndex + 1 };
      } else {
        const alreadyExists = finalItems.some(
          (i) => String(i.lrNo ?? '').toLowerCase() === formattedDraft.lrNo.toLowerCase()
        );
        if (!alreadyExists) {
          finalItems.push({ ...formattedDraft, srNo: finalItems.length + 1 });
        }
      }
    }

    if (finalItems.length === 0) {
      setError('Please add at least one LR item to the grid before saving.');
      return;
    }

    try {
      const payloadHeader = {
        ...headerData,
        from: headerData.fromStation,
        isCrossOutward: true,
      };

      if (editingOutwardId) {
        handleUpdateFullOutward(
          editingOutwardId,
          payloadHeader,
          finalItems,
          user?.name || 'Operator'
        );
        setSuccess(`Cross Stock Out Entry #${headerData.outwardNo} updated successfully!`);
        setTimeout(() => {
          navigate('/all-entries', {
            state: { tab: location.state?.returnTab || 'outward_headers' },
          });
        }, 600);
      } else {
        handleCreateOutward(
          payloadHeader,
          finalItems,
          user?.name || 'Operator'
        );

        setSuccess('Cross Stock Out Entry saved successfully!');
        const nextNo = `OUT-${Math.floor(1000 + Math.random() * 9000)}`;
        setHeaderData((prev) => ({
          ...prev,
          outwardNo: nextNo,
          memoNo: '',
        }));
        setLrItems([]);
        resetItemForm(1);
      }
    } catch (err) {
      setError(err.message || 'Failed to save Cross Stock Out entry.');
    }
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white px-4 py-3 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/all-entries', { state: { tab: 'outward_headers' } })}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight uppercase">
                {editingOutwardId ? `Edit Cross Stock Out #${headerData.outwardNo}` : 'Cross Stock Out Details'}
              </h1>
              {editingOutwardId && (
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-300 rounded">
                  Edit Mode
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {editingOutwardId
                ? 'Modify Cross Stock Out header or LR rows and click Update Outward'
                : 'Direct Cross Stock Out Dispatch & LR Entry Screen'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => navigate('/all-entries', { state: { tab: 'outward_headers' } })}
            className="px-5 py-2.5 text-sm font-extrabold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            Show All Outward
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-300 rounded-lg flex items-center text-red-800 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 mr-2 shrink-0 text-red-600" />
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center text-emerald-800 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 mr-2 shrink-0 text-emerald-600" />
          {success}
        </div>
      )}

      {/* SECTION 1: HEADER DETAILS (Matching Screenshot 2) */}
      <fieldset className="bg-white rounded-lg border-2 border-slate-300 shadow-xs p-3.5">
        <legend className="px-2 text-xs font-extrabold text-slate-800 uppercase tracking-wider">
          Header Details
        </legend>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* NO */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              No. (Outward No)
            </label>
            <input
              type="text"
              value={headerData.outwardNo}
              onChange={(e) => handleHeaderChange('outwardNo', e.target.value)}
              className="w-full px-2.5 py-1.5 bg-amber-50/60 border border-slate-300 rounded text-xs font-bold text-slate-900 focus:outline-none focus:border-sky-600"
            />
          </div>

          {/* DATE */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={headerData.date}
              onChange={(e) => handleHeaderChange('date', e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-900 focus:outline-none focus:border-sky-600"
            />
          </div>

          {/* TRANSPORTER NAME + [...] */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Transporter Name
            </label>
            <div className="flex">
              <select
                value={headerData.transporterName}
                onChange={(e) => handleHeaderChange('transporterName', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-l text-xs font-semibold text-slate-900 focus:outline-none focus:border-sky-600"
              >
                <option value="">-- Select Transporter --</option>
                {masters.transporters.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => openQuickAdd('transporters', 'Add New Transporter', 'transporterName', true)}
                title="Add Transporter"
                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 border border-l-0 border-slate-300 rounded-r text-xs font-bold text-slate-800 cursor-pointer"
              >
                ...
              </button>
            </div>
          </div>

          {/* FROM (Origin Station) + [...] */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              From (Origin Station) <span className="text-red-500">*</span>
            </label>
            <div className="flex">
              <select
                value={headerData.fromStation}
                onChange={(e) => handleHeaderChange('fromStation', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-l text-xs font-semibold text-slate-900 focus:outline-none focus:border-sky-600"
              >
                <option value="">-- Select Station --</option>
                {masters.stations.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => openQuickAdd('stations', 'Add New Station / City', 'fromStation', true)}
                title="Add Station"
                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 border border-l-0 border-slate-300 rounded-r text-xs font-bold text-slate-800 cursor-pointer"
              >
                ...
              </button>
            </div>
          </div>

          {/* VEHICLE NO + [...] */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Vehicle No. <span className="text-red-500">*</span>
            </label>
            <div className="flex">
              <select
                value={headerData.vehicleNo}
                onChange={(e) => handleHeaderChange('vehicleNo', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-l text-xs font-semibold text-slate-900 focus:outline-none focus:border-sky-600"
              >
                <option value="">-- Select Vehicle --</option>
                {masters.vehicles.map((v) => (
                  <option key={v.id} value={v.vehicleNo}>
                    {v.vehicleNo}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => openQuickAdd('vehicles', 'Add New Vehicle No.', 'vehicleNo', true)}
                title="Add Vehicle"
                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 border border-l-0 border-slate-300 rounded-r text-xs font-bold text-slate-800 cursor-pointer"
              >
                ...
              </button>
            </div>
          </div>

          {/* MEMO NO */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Memo No.
            </label>
            <input
              type="text"
              value={headerData.memoNo}
              onChange={(e) => handleHeaderChange('memoNo', e.target.value)}
              placeholder="Ex. M-202"
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-900 focus:outline-none focus:border-sky-600"
            />
          </div>

          {/* DRIVER NAME + [...] */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Driver Name <span className="text-red-500">*</span>
            </label>
            <div className="flex">
              <select
                value={headerData.driverName}
                onChange={(e) => handleHeaderChange('driverName', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-l text-xs font-semibold text-slate-900 focus:outline-none focus:border-sky-600"
              >
                <option value="">-- Select Driver --</option>
                {masters.drivers.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => openQuickAdd('drivers', 'Add New Driver Name', 'driverName', true)}
                title="Add Driver"
                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 border border-l-0 border-slate-300 rounded-r text-xs font-bold text-slate-800 cursor-pointer"
              >
                ...
              </button>
            </div>
          </div>

          {/* VEHICLE OWNER NAME + [...] */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Vehicle Owner Name
            </label>
            <div className="flex">
              <select
                value={headerData.ownerName}
                onChange={(e) => handleHeaderChange('ownerName', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-l text-xs font-semibold text-slate-900 focus:outline-none focus:border-sky-600"
              >
                <option value="">-- Select Owner --</option>
                {(masters.vehicleOwners || []).map((o) => (
                  <option key={o.id} value={o.name}>
                    {o.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => openQuickAdd('vehicleOwners', 'Add Vehicle Owner', 'ownerName', true)}
                title="Add Owner"
                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 border border-l-0 border-slate-300 rounded-r text-xs font-bold text-slate-800 cursor-pointer"
              >
                ...
              </button>
            </div>
          </div>
        </div>
      </fieldset>

      {/* SECTION 2: LR ENTRY DETAILS (Matching Screenshot 3) */}
      <fieldset className="bg-slate-50 rounded-lg border-2 border-slate-300 shadow-xs p-3.5">
        <legend className="px-2 text-xs font-extrabold text-sky-800 uppercase tracking-wider">
          LR Entry Details {editingIndex !== null && `(Editing Row #${editingIndex + 1})`}
        </legend>

        <form onSubmit={handleAddOrUpdateLR} className="space-y-3">
          {/* Row 1 of LR Form */}
          <div className="grid grid-cols-2 sm:grid-cols-6 lg:grid-cols-12 gap-2.5">
            {/* SRNO */}
            <div className="col-span-1 sm:col-span-1 lg:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                SRNO:
              </label>
              <input
                type="text"
                readOnly
                value={itemForm.srNo}
                className="w-full px-2.5 py-1.5 bg-slate-200 border border-slate-300 rounded text-xs font-extrabold text-center text-slate-800"
              />
            </div>

            {/* LR NO */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-4">
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                LR NO: <span className="text-red-500">*</span>
              </label>
              <input
                ref={(el) => (fieldRefs.current[0] = el)}
                type="text"
                value={itemForm.lrNo}
                onChange={(e) => handleItemChange('lrNo', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 0)}
                placeholder="Enter LR No."
                className="w-full px-2.5 py-1.5 bg-amber-50 border border-slate-400 rounded text-xs font-bold text-slate-900 focus:outline-none focus:border-sky-600 focus:bg-white"
              />
            </div>

            {/* DATE */}
            <div className="col-span-1 sm:col-span-1 lg:col-span-3">
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                DATE:
              </label>
              <input
                ref={(el) => (fieldRefs.current[1] = el)}
                type="date"
                value={itemForm.date}
                onChange={(e) => handleItemChange('date', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 1)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-900 focus:outline-none focus:border-sky-600"
              />
            </div>

            {/* INVOICE NO */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-3">
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                INVOICE NO:
              </label>
              <input
                ref={(el) => (fieldRefs.current[2] = el)}
                type="text"
                value={itemForm.invoiceNo}
                onChange={(e) => handleItemChange('invoiceNo', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 2)}
                placeholder="Invoice No."
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-900 focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          {/* Row 2 of LR Form */}
          <div className="grid grid-cols-1 sm:grid-cols-6 lg:grid-cols-12 gap-2.5">
            {/* CONSIGNER */}
            <div className="sm:col-span-3 lg:col-span-4">
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                CONSIGNER:
              </label>
              <input
                ref={(el) => (fieldRefs.current[3] = el)}
                type="text"
                list="cross-consignors-datalist"
                value={itemForm.consignorName}
                onChange={(e) => handleItemChange('consignorName', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 3)}
                placeholder="Type Consigner Name"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-900 focus:outline-none focus:border-sky-600"
              />
              <datalist id="cross-consignors-datalist">
                {masters.consignors.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>

            {/* CONSIGNEE */}
            <div className="sm:col-span-3 lg:col-span-4">
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                CONSIGNEE:
              </label>
              <input
                ref={(el) => (fieldRefs.current[4] = el)}
                type="text"
                list="cross-consignees-datalist"
                value={itemForm.consigneeName}
                onChange={(e) => handleItemChange('consigneeName', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 4)}
                placeholder="Type Consignee Name"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-900 focus:outline-none focus:border-sky-600"
              />
              <datalist id="cross-consignees-datalist">
                {masters.consignees.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>

            {/* CT TO + [...] */}
            <div className="sm:col-span-6 lg:col-span-4">
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                CT TO:
              </label>
              <div className="flex">
                <select
                  ref={(el) => (fieldRefs.current[5] = el)}
                  value={itemForm.ctTo}
                  onChange={(e) => handleItemChange('ctTo', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 5)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-l text-xs font-semibold text-slate-900 focus:outline-none focus:border-sky-600"
                >
                  <option value="">-- Select Destination --</option>
                  {masters.stations.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => openQuickAdd('stations', 'Add Destination City (CT TO)', 'ctTo', false)}
                  className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 border border-l-0 border-slate-300 rounded-r text-xs font-bold text-slate-800 cursor-pointer"
                >
                  ...
                </button>
              </div>
            </div>
          </div>

          {/* Row 3 of LR Form: Amounts & Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-6 lg:grid-cols-12 gap-2.5 items-end">
            {/* PKG */}
            <div className="col-span-1 sm:col-span-1 lg:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                PKG:
              </label>
              <input
                ref={(el) => (fieldRefs.current[6] = el)}
                type="number"
                min="1"
                value={itemForm.pkg}
                onChange={(e) => handleItemChange('pkg', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 6)}
                placeholder="0"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-bold text-right text-slate-900 focus:outline-none focus:border-sky-600"
              />
            </div>

            {/* TO PAY */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                TO PAY:
              </label>
              <input
                ref={(el) => (fieldRefs.current[7] = el)}
                type="number"
                min="0"
                step="0.01"
                value={itemForm.toPayAmount}
                onChange={(e) => handleItemChange('toPayAmount', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 7)}
                placeholder="0.00"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-bold text-right text-slate-900 focus:outline-none focus:border-sky-600"
              />
            </div>

            {/* TBB */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                TBB:
              </label>
              <input
                ref={(el) => (fieldRefs.current[8] = el)}
                type="number"
                min="0"
                step="0.01"
                value={itemForm.tbbAmount}
                onChange={(e) => handleItemChange('tbbAmount', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 8)}
                placeholder="0.00"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-bold text-right text-slate-900 focus:outline-none focus:border-sky-600"
              />
            </div>

            {/* PAID */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-3">
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                PAID:
              </label>
              <input
                ref={(el) => (fieldRefs.current[9] = el)}
                type="number"
                min="0"
                step="0.01"
                value={itemForm.paidAmount}
                onChange={(e) => handleItemChange('paidAmount', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 9)}
                placeholder="0.00"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-bold text-right text-slate-900 focus:outline-none focus:border-sky-600"
              />
            </div>

            {/* TOTAL + Add/Update Button */}
            <div className="col-span-2 sm:col-span-4 lg:col-span-3 flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  TOTAL:
                </label>
                <input
                  type="text"
                  readOnly
                  value={itemTotal.toFixed(2)}
                  className="w-full px-2.5 py-1.5 bg-slate-200 border border-slate-300 rounded text-xs font-extrabold text-right text-slate-900"
                />
              </div>

              <button
                type="submit"
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded shadow-xs flex items-center cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                {editingIndex !== null ? 'Update' : 'Add'}
              </button>

              {editingIndex !== null && (
                <button
                  type="button"
                  onClick={() => resetItemForm(lrItems.length + 1)}
                  title="Cancel Edit"
                  className="px-2 py-1.5 bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold text-xs rounded cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </form>
      </fieldset>

      {/* SECTION 3: DATA GRID TABLE (Matching Screenshot 3) */}
      <div className="bg-white rounded-lg border-2 border-slate-300 shadow-xs overflow-hidden">
        <div className="overflow-x-auto min-h-[220px] max-h-[340px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-800 text-white sticky top-0 z-10">
              <tr className="text-[11px] font-bold uppercase tracking-wider">
                <th className="py-2 px-2.5 border-r border-slate-700 w-12 text-center">SRNO</th>
                <th className="py-2 px-2.5 border-r border-slate-700">LR NO</th>
                <th className="py-2 px-2.5 border-r border-slate-700">INDATE</th>
                <th className="py-2 px-2.5 border-r border-slate-700 text-right">PKG</th>
                <th className="py-2 px-2.5 border-r border-slate-700">INV NO</th>
                <th className="py-2 px-2.5 border-r border-slate-700">CT TO</th>
                <th className="py-2 px-2.5 border-r border-slate-700">CONSIGNER</th>
                <th className="py-2 px-2.5 border-r border-slate-700">CONSIGNEE</th>
                <th className="py-2 px-2.5 border-r border-slate-700 text-right">TO PAY</th>
                <th className="py-2 px-2.5 border-r border-slate-700 text-right">TBB</th>
                <th className="py-2 px-2.5 border-r border-slate-700 text-right">PAID</th>
                <th className="py-2 px-2.5 text-center w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {displayLrItems.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400 font-medium">
                    No LR items added yet. Fill LR Entry Details above and press Enter or click &ldquo;Add&rdquo;.
                  </td>
                </tr>
              ) : (
                displayLrItems.map((item, idx) => (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      item.isDraftPreview
                        ? 'bg-sky-50/90 border-l-4 border-sky-500 animate-pulse'
                        : editingIndex === idx
                        ? 'bg-amber-50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-1.5 px-2.5 border-r border-slate-200 text-center font-bold text-slate-700">
                      {item.srNo}
                    </td>
                    <td className="py-1.5 px-2.5 border-r border-slate-200 font-extrabold text-sky-800">
                      <div className="flex items-center gap-1.5">
                        <span>{item.lrNo}</span>
                        {item.isDraftPreview && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700 border border-sky-300">
                            <Eye className="w-2.5 h-2.5 mr-0.5" /> Live
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-1.5 px-2.5 border-r border-slate-200 text-slate-700">
                      {formatDate(item.date)}
                    </td>
                    <td className="py-1.5 px-2.5 border-r border-slate-200 text-right font-bold text-slate-900">
                      {item.pkg}
                    </td>
                    <td className="py-1.5 px-2.5 border-r border-slate-200 text-slate-700">
                      {item.invoiceNo || '-'}
                    </td>
                    <td className="py-1.5 px-2.5 border-r border-slate-200 font-semibold text-slate-800">
                      {item.ctTo || '-'}
                    </td>
                    <td className="py-1.5 px-2.5 border-r border-slate-200 text-slate-700">
                      {item.consignorName || '-'}
                    </td>
                    <td className="py-1.5 px-2.5 border-r border-slate-200 text-slate-700">
                      {item.consigneeName || '-'}
                    </td>
                    <td className="py-1.5 px-2.5 border-r border-slate-200 text-right font-semibold text-slate-800">
                      {Number(item.toPayAmount).toFixed(2)}
                    </td>
                    <td className="py-1.5 px-2.5 border-r border-slate-200 text-right font-semibold text-slate-800">
                      {Number(item.tbbAmount).toFixed(2)}
                    </td>
                    <td className="py-1.5 px-2.5 border-r border-slate-200 text-right font-semibold text-slate-800">
                      {Number(item.paidAmount).toFixed(2)}
                    </td>
                    <td className="py-1.5 px-2.5 text-center">
                      {item.isDraftPreview ? (
                        <span className="text-[10px] font-semibold text-sky-600 italic">Typing...</span>
                      ) : (
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleEditRow(idx)}
                            title="Edit Row"
                            className="p-1 text-sky-600 hover:bg-sky-50 rounded cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(idx)}
                            title="Delete Row"
                            className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: BOTTOM ACTION BUTTONS & SUMMARY TOTALS (Matching Screenshot 3) */}
      <div className="bg-slate-100 rounded-lg border-2 border-slate-300 p-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSaveCrossOutward}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded shadow-xs flex items-center cursor-pointer"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {editingOutwardId ? 'Update Outward' : 'Save'}
          </button>

          <button
            type="button"
            onClick={() => {
              const itemsToPrint = displayLrItems.filter((i) => !i.isDraftPreview || String(i.lrNo ?? '').trim() !== '...');
              const totalFreight =
                (Number(summary.toPay) || 0) + (Number(summary.tbb) || 0) + (Number(summary.paid) || 0);
              printRecordDetails({
                title: `Cross Stock Out Receipt Details #${headerData.outwardNo}`,
                fields: [
                  { label: 'Outward No.', value: headerData.outwardNo },
                  { label: 'Date', value: formatDate(headerData.date) },
                  { label: 'Transporter', value: headerData.transporterName || '-' },
                  { label: 'From Station', value: headerData.fromStation || '-' },
                  { label: 'Vehicle No.', value: headerData.vehicleNo || '-' },
                  { label: 'Memo No.', value: headerData.memoNo || '-' },
                  { label: 'Driver Name', value: headerData.driverName || '-' },
                  { label: 'Vehicle Owner', value: headerData.ownerName || '-' },
                  { label: 'Total PKG', value: `${summary.pkg || 0} Pkgs` },
                  { label: 'Total Freight', value: formatCurrency(totalFreight) },
                ],
                items: itemsToPrint,
              });
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded shadow-xs flex items-center cursor-pointer"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Print
          </button>
        </div>

        {/* Right Summary Totals */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white px-3 py-1.5 rounded border border-slate-300 flex items-center justify-between space-x-3">
            <span className="text-[11px] font-extrabold text-slate-600 uppercase">PKG:</span>
            <span className="text-sm font-black text-slate-900">{summary.pkg}</span>
          </div>

          <div className="bg-white px-3 py-1.5 rounded border border-slate-300 flex items-center justify-between space-x-3">
            <span className="text-[11px] font-extrabold text-slate-600 uppercase">TO PAY:</span>
            <span className="text-sm font-black text-amber-700">{summary.toPay.toFixed(2)}</span>
          </div>

          <div className="bg-white px-3 py-1.5 rounded border border-slate-300 flex items-center justify-between space-x-3">
            <span className="text-[11px] font-extrabold text-slate-600 uppercase">T.B.B:</span>
            <span className="text-sm font-black text-sky-700">{summary.tbb.toFixed(2)}</span>
          </div>

          <div className="bg-white px-3 py-1.5 rounded border border-slate-300 flex items-center justify-between space-x-3">
            <span className="text-[11px] font-extrabold text-slate-600 uppercase">PAID:</span>
            <span className="text-sm font-black text-emerald-700">{summary.paid.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Quick Add Master Modal */}
      <Modal
        isOpen={quickAddModal.isOpen}
        onClose={() => setQuickAddModal({ isOpen: false, category: '', title: '', targetField: '', isHeader: true })}
        title={quickAddModal.title}
        size="sm"
      >
        <form onSubmit={handleSaveQuickAdd} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Enter Name / Number
            </label>
            <input
              type="text"
              autoFocus
              required
              value={quickAddValue}
              onChange={(e) => setQuickAddValue(e.target.value)}
              placeholder="Type here..."
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-semibold focus:outline-none focus:border-sky-600"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setQuickAddModal({ isOpen: false, category: '', title: '', targetField: '', isHeader: true })}
              className="px-4 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 rounded hover:bg-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold text-white bg-sky-600 rounded hover:bg-sky-700 cursor-pointer"
            >
              Add & Select
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
