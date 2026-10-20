import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { EditableCombobox } from '../../components/common/EditableCombobox';
import { Save, Printer, AlertCircle, Trash2, Edit2, Layers, CheckCircle } from 'lucide-react';
import { getTodayDateString, formatDate } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/numberUtils';
import { printRecordDetails } from '../../services/exportService';
import { getNextCrossOutwardNo } from '../../services/outwardService';

export const CrossOutwardCreate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { masters, outwards, handleCreateOutward, handleUpdateFullOutward, handleAddMaster } = useApp();
  const { user } = useAuth();

  const editOutwardData = location.state?.editOutward || null;
  const editingOutwardId = editOutwardData?.id || null;

  // HEADER DETAILS (8 fields matching screenshot)
  const [headerData, setHeaderData] = useState({
    outwardNo: getNextCrossOutwardNo(outwards),
    date: getTodayDateString(),
    transporterName: '',
    fromStation: '',
    vehicleNo: '',
    memoNo: '',
    driverName: '',
    ownerName: '',
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
    ctTo: '',
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
      return;
    }

    // Ctrl+Enter or Cmd+Enter to quickly save/add row from ANY field
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAddOrUpdateLR();
      return;
    }

    // Shift+Tab backward navigation
    if (e.key === 'Tab' && e.shiftKey) {
      if (index > 0) {
        e.preventDefault();
        const prevField = fieldRefs.current[index - 1];
        if (prevField) {
          prevField.focus();
          if (typeof prevField.select === 'function') {
            prevField.select();
          }
        }
      }
      return;
    }

    // Enter or forward Tab
    if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      // Index 9 is paidAmount (the last input)
      if (index >= 9) {
        handleAddOrUpdateLR();
      } else {
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
        outwardNo: edit.outwardNo || getNextCrossOutwardNo(outwards),
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

      if (items.length > 0) {
        const first = items[0];
        setItemForm({
          srNo: 1,
          lrNo: first.lrNo,
          date: first.date,
          invoiceNo: first.invoiceNo,
          consignorName: first.consignorName,
          consigneeName: first.consigneeName,
          ctTo: first.ctTo,
          pkg: String(first.pkg || ''),
          toPayAmount: String(first.toPayAmount || ''),
          tbbAmount: String(first.tbbAmount || ''),
          paidAmount: String(first.paidAmount || ''),
        });
        setEditingIndex(0);
      }
    }
  }, [location.state, masters]);

  // List of added LR rows
  const [lrItems, setLrItems] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);

  // Notifications
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Quick Add Master State
  const [quickAddModal, setQuickAddModal] = useState({
    isOpen: false,
    category: '',
    title: '',
    targetField: '',
    isHeader: true,
  });
  const [quickAddValue, setQuickAddValue] = useState('');

  // Auto-fill owner name whenever vehicleNo changes
  const handleHeaderChange = (field, value) => {
    setHeaderData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'vehicleNo') {
        const found = masters.vehicles?.find(
          (v) => (v.vehicleNo || '').trim().toLowerCase() === String(value).trim().toLowerCase()
        );
        if (found?.ownerName) {
          updated.ownerName = found.ownerName;
        }
      }
      return updated;
    });
  };

  const handleItemChange = (field, value) => {
    setItemForm((prev) => ({ ...prev, [field]: value }));
  };

  // Add or Update row in table
  const handleAddOrUpdateLR = (e) => {
    if (e) e.preventDefault();
    setError('');

    const cleanLR = String(itemForm.lrNo || '').trim();
    if (!cleanLR) {
      setError('Please enter a valid LR No.');
      focusLRNoInput();
      return;
    }

    const rowItem = {
      srNo: editingIndex !== null ? lrItems[editingIndex]?.srNo || editingIndex + 1 : lrItems.length + 1,
      lrNo: cleanLR,
      date: itemForm.date || getTodayDateString(),
      invoiceNo: itemForm.invoiceNo || '',
      consignorName: itemForm.consignorName || '',
      consigneeName: itemForm.consigneeName || '',
      ctTo: itemForm.ctTo || '',
      pkg: Number(itemForm.pkg) || 0,
      toPayAmount: Number(itemForm.toPayAmount) || 0,
      tbbAmount: Number(itemForm.tbbAmount) || 0,
      paidAmount: Number(itemForm.paidAmount) || 0,
    };

    if (editingIndex !== null) {
      setLrItems((prev) => {
        const copy = [...prev];
        copy[editingIndex] = rowItem;
        return copy;
      });
      setEditingIndex(null);
    } else {
      setLrItems((prev) => [...prev, rowItem]);
    }

    // Reset Form for next LR entry
    setItemForm({
      srNo: (editingIndex !== null ? lrItems.length : lrItems.length + 1) + 1,
      lrNo: '',
      date: getTodayDateString(),
      invoiceNo: '',
      consignorName: '',
      consigneeName: '',
      ctTo: '',
      pkg: '',
      toPayAmount: '',
      tbbAmount: '',
      paidAmount: '',
    });
    focusLRNoInput();
  };

  const handleEditRow = (idx) => {
    const item = lrItems[idx];
    if (!item) return;
    setItemForm({
      srNo: item.srNo,
      lrNo: item.lrNo,
      date: item.date,
      invoiceNo: item.invoiceNo,
      consignorName: item.consignorName,
      consigneeName: item.consigneeName,
      ctTo: item.ctTo,
      pkg: String(item.pkg || ''),
      toPayAmount: String(item.toPayAmount || ''),
      tbbAmount: String(item.tbbAmount || ''),
      paidAmount: String(item.paidAmount || ''),
    });
    setEditingIndex(idx);
    focusLRNoInput();
  };

  const handleDeleteRow = (idx) => {
    setLrItems((prev) => {
      const filtered = prev.filter((_, i) => i !== idx);
      return filtered.map((item, i) => ({ ...item, srNo: i + 1 }));
    });
    if (editingIndex === idx) {
      setEditingIndex(null);
      setItemForm({
        srNo: lrItems.length,
        lrNo: '',
        date: getTodayDateString(),
        invoiceNo: '',
        consignorName: '',
        consigneeName: '',
        ctTo: '',
        pkg: '',
        toPayAmount: '',
        tbbAmount: '',
        paidAmount: '',
      });
    }
    focusLRNoInput();
  };

  // Live Draft Preview
  const currentLrNo = String(itemForm?.lrNo ?? '').trim();
  const hasFormDraft = Boolean(
    currentLrNo ||
      itemForm?.pkg ||
      itemForm?.invoiceNo ||
      String(itemForm?.consignorName ?? '').trim() ||
      String(itemForm?.consigneeName ?? '').trim() ||
      itemForm?.toPayAmount ||
      itemForm?.tbbAmount ||
      itemForm?.paidAmount
  );
  const existingPreviewBase = editingIndex !== null && lrItems[editingIndex] ? lrItems[editingIndex] : {};
  const currentFormPreviewItem = {
    ...existingPreviewBase,
    srNo: editingIndex !== null && lrItems[editingIndex] ? lrItems[editingIndex].srNo : lrItems.length + 1,
    lrNo: currentLrNo || '...',
    date: itemForm?.date || getTodayDateString(),
    invoiceNo: itemForm?.invoiceNo || '',
    consignorName: itemForm?.consignorName || '',
    consigneeName: itemForm?.consigneeName || '',
    ctTo: itemForm?.ctTo || masters.stations[0]?.name || '',
    pkg: Number(itemForm?.pkg) || 0,
    toPayAmount: Number(itemForm?.toPayAmount) || 0,
    tbbAmount: Number(itemForm?.tbbAmount) || 0,
    paidAmount: Number(itemForm?.paidAmount) || 0,
    isDraftPreview: true,
  };

  const displayLrItems = [...lrItems];
  if (editingIndex !== null && displayLrItems[editingIndex]) {
    displayLrItems[editingIndex] = currentFormPreviewItem;
  } else if (hasFormDraft) {
    displayLrItems.push(currentFormPreviewItem);
  }

  // Quick Add Master Handler
  const openQuickAdd = (category, title, targetField, isHeader = true) => {
    setQuickAddModal({ isOpen: true, category, title, targetField, isHeader });
    setQuickAddValue('');
  };

  const handleSaveQuickAdd = (e) => {
    e.preventDefault();
    if (!quickAddValue.trim()) return;

    const val = quickAddValue.trim();
    let newItem = { name: val };
    if (quickAddModal.category === 'vehicles') {
      newItem = { vehicleNo: val, type: 'Own', capacity: '10 Ton' };
    } else if (quickAddModal.category === 'vehicleOwners') {
      newItem = { name: val, phone: '9800000000' };
    } else if (quickAddModal.category === 'stations') {
      newItem = { name: val, state: 'MH' };
    } else if (quickAddModal.category === 'drivers') {
      newItem = { name: val, licenseNo: 'DL-9902', phone: '9800000000' };
    }

    handleAddMaster(quickAddModal.category, newItem);

    if (quickAddModal.isHeader) {
      handleHeaderChange(quickAddModal.targetField, val);
    } else {
      handleItemChange(quickAddModal.targetField, val);
    }

    setQuickAddModal({ isOpen: false, category: '', title: '', targetField: '', isHeader: true });
  };

  // Summary Totals
  const summary = displayLrItems.reduce(
    (acc, curr) => ({
      pkg: acc.pkg + (Number(curr.pkg) || 0),
      toPay: acc.toPay + (Number(curr.toPayAmount) || 0),
      tbb: acc.tbb + (Number(curr.tbbAmount) || 0),
      paid: acc.paid + (Number(curr.paidAmount) || 0),
    }),
    { pkg: 0, toPay: 0, tbb: 0, paid: 0 }
  );

  const itemTotal =
    (Number(itemForm.toPayAmount) || 0) +
    (Number(itemForm.tbbAmount) || 0) +
    (Number(itemForm.paidAmount) || 0);

  // Save Stock-Out Transaction
  const handleSaveCrossOutward = () => {
    setError('');
    setSuccess('');

    let finalItems = displayLrItems
      .filter((i) => String(i.lrNo ?? '').trim() && String(i.lrNo ?? '').trim() !== '...')
      .map((item) => ({
        ...item,
        pkg: Number(item.pkg) || 0,
      }));

    if (finalItems.length === 0) {
      setError('Please add at least one LR item before saving.');
      focusLRNoInput();
      return;
    }

    try {
      if (editingOutwardId) {
        handleUpdateFullOutward(
          editingOutwardId,
          { ...headerData, isCrossOutward: true },
          finalItems,
          user?.displayName || 'Operator'
        );
        setSuccess(`Cross Stock-Out #${headerData.outwardNo} updated successfully!`);
      } else {
        handleCreateOutward(
          { ...headerData, isCrossOutward: true },
          finalItems,
          user?.displayName || 'Operator'
        );
        setSuccess(`Cross Stock-Out #${headerData.outwardNo} recorded successfully!`);
      }

      setTimeout(() => {
        if (location.state?.returnPath) {
          navigate(location.state.returnPath);
        } else {
          navigate('/all-entries', { state: { tab: 'cross_outward_headers' } });
        }
      }, 300);
    } catch (err) {
      setError(err.message || 'Failed to save Cross Stock-Out transaction.');
    }
  };

  return (
    <div className="space-y-5 text-slate-800 max-w-full">
      {/* ROYAL NAVY & ORANGE HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#07182e] via-[#0b2545] to-[#133e87] p-5 sm:p-6 text-white shadow-xl border border-blue-900/40">
        <div className="h-1 highway-accent-line absolute top-0 left-0 right-0" />
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-extrabold tracking-widest uppercase text-orange-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>DIRECT CROSS-DOCK DISPATCH (MANUAL DISPATCH)</span>
              <span className="text-blue-200/50">•</span>
              <span className="text-blue-100 font-mono">STANDALONE MANIFEST</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
              {editingOutwardId ? `Update Cross Stock-Out #${headerData.outwardNo}` : 'Manual Cross Stock-Out'}
            </h1>
            <p className="text-xs text-blue-100/80 mt-1 max-w-xl font-medium">
              Manual direct dispatch terminal independent of Godown Pending Stock or Inward batches.
            </p>
          </div>

          <div className="flex items-center space-x-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => navigate('/all-entries', { state: { tab: 'cross_outward_headers' } })}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-xl text-xs font-bold transition-all border border-white/20 flex items-center space-x-2 shadow-xs cursor-pointer"
            >
              <Layers className="w-4 h-4 text-orange-400" />
              <span>Show All Cross Stock-Out</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold flex items-center space-x-2 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center space-x-2 shadow-2xs">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* SECTION 1: HEADER DETAILS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-4 bg-[#1d4ed8] rounded-full" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              Cross Stock-Out Header Details
            </h3>
          </div>
          <span className="text-[11px] font-bold text-slate-400">
            Stock-Out No.: <span className="font-mono text-[#1d4ed8] font-black">{headerData.outwardNo}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
              NO. (STOCK OUT)
            </label>
            <input
              type="text"
              value={headerData.outwardNo}
              onChange={(e) => handleHeaderChange('outwardNo', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 bg-slate-50/70 rounded-xl text-xs font-black text-[#1d4ed8] font-mono focus:ring-2 focus:ring-[#1d4ed8] outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
              Date *
            </label>
            <input
              type="date"
              value={headerData.date}
              onChange={(e) => handleHeaderChange('date', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#1d4ed8] outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
              Transporter Name
            </label>
            <div className="flex items-center space-x-1.5 min-w-0">
              <EditableCombobox
                name="transporterName"
                value={headerData.transporterName}
                onChange={(e, val) => handleHeaderChange('transporterName', val)}
                options={masters.transporters}
                placeholder=""
                className="px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#1d4ed8]"
              />
              <button
                type="button"
                onClick={() => openQuickAdd('transporters', 'Add New Transporter', 'transporterName', true)}
                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl font-black text-xs text-slate-700 transition-colors shadow-2xs flex-shrink-0 cursor-pointer"
                title="Add Transporter"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
              From (Origin Station) *
            </label>
            <div className="flex items-center space-x-1.5 min-w-0">
              <EditableCombobox
                name="fromStation"
                value={headerData.fromStation}
                onChange={(e, val) => handleHeaderChange('fromStation', val)}
                options={masters.stations}
                placeholder=""
                className="px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#1d4ed8]"
              />
              <button
                type="button"
                onClick={() => openQuickAdd('stations', 'Add New Station / City', 'fromStation', true)}
                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl font-black text-xs text-slate-700 transition-colors shadow-2xs flex-shrink-0 cursor-pointer"
                title="Add Station"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
              Vehicle No. *
            </label>
            <div className="flex items-center space-x-1.5 min-w-0">
              <EditableCombobox
                name="vehicleNo"
                value={headerData.vehicleNo}
                onChange={(e, val) => handleHeaderChange('vehicleNo', val)}
                options={masters.vehicles}
                placeholder=""
                className="px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-[#1d4ed8]"
              />
              <button
                type="button"
                onClick={() => openQuickAdd('vehicles', 'Add New Vehicle No.', 'vehicleNo', true)}
                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl font-black text-xs text-slate-700 transition-colors shadow-2xs flex-shrink-0 cursor-pointer"
                title="Add Vehicle"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
              Memo No.
            </label>
            <input
              type="text"
              name="memoNo"
              value={headerData.memoNo}
              onChange={(e) => handleHeaderChange('memoNo', e.target.value)}
              placeholder="e.g. CR-MM-01"
              className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-800 uppercase focus:ring-2 focus:ring-[#1d4ed8] outline-none placeholder-slate-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
              Driver Name *
            </label>
            <div className="flex items-center space-x-1.5 min-w-0">
              <EditableCombobox
                name="driverName"
                value={headerData.driverName}
                onChange={(e, val) => handleHeaderChange('driverName', val)}
                options={masters.drivers}
                placeholder=""
                className="px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#1d4ed8]"
              />
              <button
                type="button"
                onClick={() => openQuickAdd('drivers', 'Add New Driver Name', 'driverName', true)}
                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl font-black text-xs text-slate-700 transition-colors shadow-2xs flex-shrink-0 cursor-pointer"
                title="Add Driver"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
              Vehicle Owner Name
            </label>
            <div className="flex items-center space-x-1.5 min-w-0">
              <EditableCombobox
                name="ownerName"
                value={headerData.ownerName}
                onChange={(e, val) => handleHeaderChange('ownerName', val)}
                options={(masters.vehicleOwners || []).map((o) => o.name)}
                placeholder=""
                className="px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#1d4ed8]"
              />
              <button
                type="button"
                onClick={() => openQuickAdd('vehicleOwners', 'Add Vehicle Owner', 'ownerName', true)}
                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl font-black text-xs text-slate-700 transition-colors shadow-2xs flex-shrink-0 cursor-pointer"
                title="Add Owner"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: LR ENTRY DETAILS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-4 bg-sky-500 rounded-full" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              LR Entry Details
            </h3>
            {editingIndex !== null && (
              <div className="flex items-center space-x-2 ml-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  EDITING ROW #{editingIndex + 1}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingIndex(null);
                    focusLRNoInput();
                  }}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                  title="Cancel edit"
                >
                  Cancel Edit
                </button>
              </div>
            )}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-bold text-slate-700">Enter</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-bold text-slate-700">Tab</kbd> to jump fields &bull; Auto-saves on last input
          </span>
        </div>

        <form onSubmit={handleAddOrUpdateLR} className="space-y-3.5">
          {/* Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 items-end">
            <div>
              <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
                SR NO.
              </label>
              <input
                type="text"
                readOnly
                value={itemForm.srNo}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-center text-slate-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-[#1d4ed8] uppercase mb-1.5">
                LR NO. *
              </label>
              <input
                ref={(el) => (fieldRefs.current[0] = el)}
                type="text"
                value={itemForm.lrNo}
                onChange={(e) => handleItemChange('lrNo', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 0)}
                placeholder="Enter LR No."
                className="w-full px-3 py-2 bg-sky-50/70 border border-blue-200 rounded-xl text-xs font-black text-[#1d4ed8] uppercase focus:ring-2 focus:ring-[#1d4ed8] outline-none placeholder-slate-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
                DATE
              </label>
              <input
                ref={(el) => (fieldRefs.current[1] = el)}
                type="date"
                value={itemForm.date}
                onChange={(e) => handleItemChange('date', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 1)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#1d4ed8] outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
                INVOICE NO.
              </label>
              <input
                ref={(el) => (fieldRefs.current[2] = el)}
                type="text"
                value={itemForm.invoiceNo}
                onChange={(e) => handleItemChange('invoiceNo', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 2)}
                placeholder="Invoice No."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 uppercase focus:ring-2 focus:ring-[#1d4ed8] outline-none placeholder-slate-400"
              />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 items-end">
            <div>
              <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
                CONSIGNOR
              </label>
              <input
                ref={(el) => (fieldRefs.current[3] = el)}
                type="text"
                list="cross-consignors-datalist"
                value={itemForm.consignorName}
                onChange={(e) => handleItemChange('consignorName', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 3)}
                placeholder="Type Consignor"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#1d4ed8] outline-none placeholder-slate-400"
              />
              <datalist id="cross-consignors-datalist">
                {masters.consignors.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
                CONSIGNEE
              </label>
              <input
                ref={(el) => (fieldRefs.current[4] = el)}
                type="text"
                list="cross-consignees-datalist"
                value={itemForm.consigneeName}
                onChange={(e) => handleItemChange('consigneeName', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 4)}
                placeholder="Type Consignee"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#1d4ed8] outline-none placeholder-slate-400"
              />
              <datalist id="cross-consignees-datalist">
                {masters.consignees.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
                DESTINATION / CT TO
              </label>
              <div className="flex items-center space-x-1.5 min-w-0">
                <EditableCombobox
                  ref={(el) => (fieldRefs.current[5] = el)}
                  name="ctTo"
                  value={itemForm.ctTo}
                  onChange={(e, val) => handleItemChange('ctTo', val)}
                  onKeyDown={(e) => handleKeyDown(e, 5)}
                  options={masters.stations}
                  placeholder=""
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#1d4ed8]"
                />
                <button
                  type="button"
                  onClick={() => openQuickAdd('stations', 'Add Destination City (CT TO)', 'ctTo', false)}
                  className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl font-black text-xs text-slate-700 transition-colors shadow-2xs flex-shrink-0 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-900 uppercase mb-1.5">
                PACKAGES (PKG)
              </label>
              <input
                ref={(el) => (fieldRefs.current[6] = el)}
                type="number"
                min="1"
                value={itemForm.pkg}
                onChange={(e) => handleItemChange('pkg', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 6)}
                placeholder="1"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-[#1d4ed8] outline-none"
              />
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 items-end pt-1">
            <div>
              <label className="block text-[11px] font-extrabold text-amber-700 uppercase mb-1.5">
                TO PAY
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
                className="w-full px-3 py-2 bg-amber-50/60 border border-amber-200 rounded-xl text-xs font-black text-amber-900 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-sky-700 uppercase mb-1.5">
                T.B.B.
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
                className="w-full px-3 py-2 bg-sky-50/60 border border-sky-200 rounded-xl text-xs font-black text-sky-900 focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-emerald-700 uppercase mb-1.5">
                PAID
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
                className="w-full px-3 py-2 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs font-black text-emerald-900 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1.5">
                TOTAL ROW
              </label>
              <input
                type="text"
                readOnly
                tabIndex={-1}
                value={itemTotal.toFixed(2)}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-900 text-right outline-none cursor-default select-none"
              />
            </div>
          </div>
        </form>
      </div>

      {/* SECTION 3: DATA GRID TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              Cross Stock-Out Staged Entries
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-[#1d4ed8]">
              {displayLrItems.length} Entries
            </span>
          </div>
          <span className="text-xs text-slate-400">Review all LR items before saving or printing</span>
        </div>

        <div className="overflow-x-auto min-h-[200px] max-h-[380px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0d2358] text-white sticky top-0 z-10">
              <tr className="text-[10px] font-extrabold uppercase tracking-wider">
                <th className="py-2.5 px-3 border-r border-blue-900/60 w-12 text-center">SR</th>
                <th className="py-2.5 px-3 border-r border-blue-900/60">LR NO.</th>
                <th className="py-2.5 px-3 border-r border-blue-900/60">DATE</th>
                <th className="py-2.5 px-3 border-r border-blue-900/60 text-right">PKG</th>
                <th className="py-2.5 px-3 border-r border-blue-900/60">INV NO.</th>
                <th className="py-2.5 px-3 border-r border-blue-900/60">DESTINATION</th>
                <th className="py-2.5 px-3 border-r border-blue-900/60">CONSIGNOR</th>
                <th className="py-2.5 px-3 border-r border-blue-900/60">CONSIGNEE</th>
                <th className="py-2.5 px-3 border-r border-blue-900/60 text-right">TO PAY</th>
                <th className="py-2.5 px-3 border-r border-blue-900/60 text-right">T.B.B.</th>
                <th className="py-2.5 px-3 border-r border-blue-900/60 text-right">PAID</th>
                <th className="py-2.5 px-3 text-center w-20">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {displayLrItems.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400 font-medium">
                    No LR items added yet. Fill LR Entry Details above to add items.
                  </td>
                </tr>
              ) : (
                displayLrItems.map((item, idx) => (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      item.isDraftPreview
                        ? 'bg-sky-50/70 border-l-4 border-[#1d4ed8]'
                        : editingIndex === idx
                        ? 'bg-amber-50/80 border-l-4 border-amber-500'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2 px-3 border-r border-slate-100 text-center font-bold text-slate-600">
                      {item.srNo}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-100 font-extrabold text-[#1d4ed8]">
                      <div className="flex items-center gap-1.5">
                        <span>{item.lrNo}</span>
                        {item.isDraftPreview && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-100 text-[#1d4ed8] border border-blue-200">
                            Live
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 border-r border-slate-100 text-slate-600">
                      {formatDate(item.date)}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-black text-slate-900">
                      {item.pkg}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-100 text-slate-600">
                      {item.invoiceNo || '-'}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-100 font-semibold text-slate-800">
                      {item.ctTo || '-'}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-100 text-slate-600 truncate max-w-[130px]">
                      {item.consignorName || '-'}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-100 text-slate-600 truncate max-w-[130px]">
                      {item.consigneeName || '-'}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-extrabold text-amber-700">
                      {Number(item.toPayAmount) > 0 ? Number(item.toPayAmount).toFixed(2) : '-'}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-extrabold text-sky-700">
                      {Number(item.tbbAmount) > 0 ? Number(item.tbbAmount).toFixed(2) : '-'}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-extrabold text-emerald-700">
                      {Number(item.paidAmount) > 0 ? Number(item.paidAmount).toFixed(2) : '-'}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {item.isDraftPreview ? (
                        <span className="text-[10px] font-semibold text-sky-600 italic">Typing...</span>
                      ) : (
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleEditRow(idx)}
                            title="Edit Row"
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(idx)}
                            title="Delete Row"
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
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

      {/* SECTION 4: BOTTOM ACTION BUTTONS & SUMMARY TOTALS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-4 flex flex-col lg:flex-row items-center justify-between gap-4 sticky bottom-4 z-20">
        {/* Left Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <button
            type="button"
            onClick={handleSaveCrossOutward}
            className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-black text-xs rounded-xl shadow-lg shadow-orange-500/25 flex items-center space-x-1.5 cursor-pointer transition-all active:scale-[0.98]"
          >
            <Save className="w-4 h-4" />
            <span>{editingOutwardId ? 'Update Stock-Out' : 'Save Stock-Out'}</span>
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
                  { label: 'Stock-Out No.', value: headerData.outwardNo },
                  { label: 'Date', value: formatDate(headerData.date) },
                  { label: 'Transporter', value: headerData.transporterName || '-' },
                  { label: 'From Station', value: headerData.fromStation || '-' },
                  { label: 'Vehicle No.', value: headerData.vehicleNo || '-' },
                  { label: 'Driver Name', value: headerData.driverName || '-' },
                  { label: 'Vehicle Owner', value: headerData.ownerName || '-' },
                  { label: 'Total PKG', value: `${summary.pkg || 0} Pkgs` },
                  { label: 'Total Freight', value: formatCurrency(totalFreight) },
                ],
                items: itemsToPrint,
              });
            }}
            className="px-5 py-2.5 bg-[#1d4ed8] hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Save &amp; Print Memo</span>
          </button>
        </div>

        {/* Right Summary Totals */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-black text-slate-800 w-full lg:w-auto justify-end">
          <div className="flex items-center space-x-2 bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200">
            <span className="text-slate-500 uppercase text-[10px] tracking-wider">TOTAL PKG</span>
            <span className="text-slate-900 font-black text-sm">{summary.pkg}</span>
          </div>

          <div className="flex items-center space-x-2 bg-amber-50 px-3.5 py-2 rounded-xl border border-amber-200 text-amber-900">
            <span className="text-amber-700 uppercase text-[10px] tracking-wider">TO PAY</span>
            <span className="font-black text-sm">{summary.toPay.toFixed(2)}</span>
          </div>

          <div className="flex items-center space-x-2 bg-sky-50 px-3.5 py-2 rounded-xl border border-sky-200 text-sky-900">
            <span className="text-sky-700 uppercase text-[10px] tracking-wider">T.B.B.</span>
            <span className="font-black text-sm">{summary.tbb.toFixed(2)}</span>
          </div>

          <div className="flex items-center space-x-2 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200 text-emerald-900">
            <span className="text-emerald-700 uppercase text-[10px] tracking-wider">PAID</span>
            <span className="font-black text-sm">{summary.paid.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Quick Add Master Modal */}
      <Modal
        isOpen={quickAddModal.isOpen}
        onClose={() => setQuickAddModal({ isOpen: false, category: '', title: '', targetField: '', isHeader: true })}
        title={quickAddModal.title}
      >
        <form onSubmit={handleSaveQuickAdd} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Enter Name / Number: *
            </label>
            <input
              type="text"
              autoFocus
              required
              value={quickAddValue}
              onChange={(e) => setQuickAddValue(e.target.value)}
              placeholder="Type here..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#1d4ed8] outline-none"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setQuickAddModal({ isOpen: false, category: '', title: '', targetField: '', isHeader: true })}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-[#1d4ed8] rounded-xl hover:bg-blue-700 shadow-xs cursor-pointer transition-all"
            >
              Add &amp; Select
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
