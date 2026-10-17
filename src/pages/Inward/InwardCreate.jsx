import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { EditableCombobox } from '../../components/common/EditableCombobox';
import { Save, Printer, AlertCircle, Plus, Trash2, Edit2, Layers, CheckCircle } from 'lucide-react';
import { getTodayDateString, formatDate } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/numberUtils';
import { printRecordDetails } from '../../services/exportService';
import { getNextInwardNo } from '../../services/inwardService';

export const InwardCreate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { masters, inwards, handleCreateInward, handleUpdateFullInward, handleAddMaster } = useApp();
  const { user } = useAuth();

  const editInwardData = location.state?.editInward || null;
  const editingInwardId = editInwardData?.id || null;

  // HEADER DETAILS (Transporter, Vehicle, Driver, Memo, From Station, Owner)
  const [headerData, setHeaderData] = useState({
    inwardNo: getNextInwardNo(inwards),
    date: getTodayDateString(),
    transporterName: '',
    fromStation: '',
    vehicleNo: '',
    ownerName: '',
    memoNo: '',
    driverName: '',
  });

  // LR ENTRY FORM (Matching LIMRA LR detail fields)
  const [itemForm, setItemForm] = useState({
    srNo: 1,
    lrNo: '',
    date: getTodayDateString(),
    pkg: '',
    invoiceNo: '',
    ctTo: '',
    consignorName: '',
    consigneeName: '',
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

  // Array of staged LR items (Multi-LR entry support)
  const [stagedItems, setStagedItems] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);

  useEffect(() => {
    if (location.state?.editInward) {
      const editData = location.state.editInward;
      setHeaderData({
        inwardNo: editData.inwardNo || '',
        date: editData.date || editData.inwardDate || getTodayDateString(),
        transporterName: editData.transporterName || masters.transporters[0]?.name || '',
        fromStation:
          editData.from ||
          editData.fromStation ||
          masters.stations[1]?.name ||
          masters.stations[0]?.name ||
          '',
        vehicleNo: editData.vehicleNo || masters.vehicles[0]?.vehicleNo || '',
        ownerName:
          editData.ownerName ||
          masters.vehicles[0]?.ownerName ||
          masters.owners?.[0]?.name ||
          '',
        memoNo: editData.memoNo || '',
        driverName: editData.driverName || masters.drivers[0]?.name || '',
      });

      const items = (editData.items || []).map((item, idx) => ({
        ...item,
        srNo: idx + 1,
        lrNo: String(item.lrNo ?? ''),
        date: item.date || item.inwardDate || editData.date || getTodayDateString(),
        pkg: Number(item.pkg) || 1,
        invoiceNo: item.invoiceNo || '',
        ctTo: item.ctTo || item.destinationStation || masters.stations[0]?.name || '',
        consignorName: item.consignorName || '',
        consigneeName: item.consigneeName || '',
        toPayAmount: Number(item.toPayAmount) || 0,
        tbbAmount: Number(item.tbbAmount) || 0,
        paidAmount: Number(item.paidAmount) || 0,
      }));

      setStagedItems(items);

      if (items.length > 0) {
        let targetIdx = 0;
        if (location.state.focusLrNo) {
          const foundIdx = items.findIndex(
            (i) =>
              String(i.lrNo).trim().toLowerCase() ===
              String(location.state.focusLrNo).trim().toLowerCase()
          );
          if (foundIdx !== -1) targetIdx = foundIdx;
        }
        const targetItem = items[targetIdx];
        setItemForm({
          srNo: targetItem.srNo,
          lrNo: String(targetItem.lrNo ?? ''),
          date: targetItem.date || getTodayDateString(),
          pkg: targetItem.pkg !== undefined && targetItem.pkg !== null ? String(targetItem.pkg) : '',
          invoiceNo: String(targetItem.invoiceNo ?? ''),
          ctTo: targetItem.ctTo || masters.stations[0]?.name || '',
          consignorName: String(targetItem.consignorName ?? ''),
          consigneeName: String(targetItem.consigneeName ?? ''),
          toPayAmount: targetItem.toPayAmount ? String(targetItem.toPayAmount) : '',
          tbbAmount: targetItem.tbbAmount ? String(targetItem.tbbAmount) : '',
          paidAmount: targetItem.paidAmount ? String(targetItem.paidAmount) : '',
        });
        setEditingIndex(targetIdx);
      }
    }
    focusLRNoInput();
  }, [location.state]);

  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      return;
    }
    if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
      if (index >= 10) {
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

  // Auto-fill owner name whenever vehicleNo changes
  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setHeaderData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'vehicleNo') {
        const found = masters.vehicles?.find(
          (v) => (v.vehicleNo || '').trim().toLowerCase() === value.trim().toLowerCase()
        );
        if (found?.ownerName) {
          updated.ownerName = found.ownerName;
        }
      }
      return updated;
    });
  };

  const handleItemChange = (e) => {
    const { name, value } = e.target;
    setItemForm((prev) => ({ ...prev, [name]: value }));
  };

  // Open Quick Add Dialog
  const handleOpenQuickAdd = (category, title, targetField, isHeader = true) => {
    setQuickAddModal({
      isOpen: true,
      category,
      title,
      targetField,
      isHeader,
    });
    setQuickAddValue('');
  };

  // Save Quick Add Master Entry
  const handleSaveQuickAdd = (e) => {
    e.preventDefault();
    if (!quickAddValue.trim()) return;

    const val = quickAddValue.trim();
    let newItem = { name: val };
    if (quickAddModal.category === 'vehicles') {
      newItem = { vehicleNo: val, type: 'Own', capacity: '10 Ton' };
    } else if (quickAddModal.category === 'owners') {
      newItem = { name: val, phone: '9800000000' };
    } else if (quickAddModal.category === 'stations') {
      newItem = { name: val, state: 'MH' };
    } else if (quickAddModal.category === 'drivers') {
      newItem = { name: val, licenseNo: 'DL-9902', phone: '9800000000' };
    }

    handleAddMaster(quickAddModal.category, newItem);

    // Auto-select newly created master item
    if (quickAddModal.isHeader) {
      setHeaderData((prev) => ({ ...prev, [quickAddModal.targetField]: val }));
    } else {
      setItemForm((prev) => ({ ...prev, [quickAddModal.targetField]: val }));
    }

    setQuickAddModal({ isOpen: false, category: '', title: '', targetField: '', isHeader: true });
  };

  // Reset form inputs for next LR entry
  const resetForm = () => {
    setItemForm({
      srNo: stagedItems.length + 1,
      lrNo: '',
      date: getTodayDateString(),
      pkg: '',
      invoiceNo: '',
      ctTo: '',
      consignorName: '',
      consigneeName: '',
      toPayAmount: '',
      tbbAmount: '',
      paidAmount: '',
    });
    setEditingIndex(null);
  };

  // Add / Update LR item in staged list
  const handleAddOrUpdateLR = (e) => {
    if (e) e.preventDefault();
    setError('');

    const cleanLR = String(itemForm?.lrNo ?? '').trim();
    if (!cleanLR) {
      setError('Please enter a valid LR No.');
      focusLRNoInput();
      return;
    }

    const existingStaged =
      editingIndex !== null && stagedItems[editingIndex] ? stagedItems[editingIndex] : {};

    const newItem = {
      ...existingStaged,
      srNo:
        editingIndex !== null && stagedItems[editingIndex]
          ? stagedItems[editingIndex].srNo
          : stagedItems.length + 1,
      lrNo: cleanLR,
      date: itemForm.date || getTodayDateString(),
      pkg: Number(itemForm.pkg) || 1,
      invoiceNo: itemForm.invoiceNo || '',
      ctTo: itemForm.ctTo || '',
      consignorName: itemForm.consignorName || '',
      consigneeName: itemForm.consigneeName || '',
      toPayAmount: Number(itemForm.toPayAmount) || 0,
      tbbAmount: Number(itemForm.tbbAmount) || 0,
      paidAmount: Number(itemForm.paidAmount) || 0,
    };

    let nextItems;
    if (editingIndex !== null && editingIndex < stagedItems.length) {
      nextItems = [...stagedItems];
      nextItems[editingIndex] = newItem;
      setStagedItems(nextItems);
      setEditingIndex(null);
    } else {
      nextItems = [...stagedItems, newItem];
      setStagedItems(nextItems);
      setEditingIndex(null);
    }

    if (editingInwardId && nextItems.length > 0) {
      try {
        handleUpdateFullInward(editingInwardId, headerData, nextItems, user?.displayName || 'Operator');
      } catch (err) {
        // Ignore transient validation error until final save
      }
    }

    resetForm();
    focusLRNoInput();
  };

  // Aggregate Totals across staged items (plus active form if filled)
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
  const existingPreviewBase =
    editingIndex !== null && stagedItems[editingIndex] ? stagedItems[editingIndex] : {};
  const currentFormPreviewItem = {
    ...existingPreviewBase,
    srNo:
      editingIndex !== null && stagedItems[editingIndex]
        ? stagedItems[editingIndex].srNo
        : stagedItems.length + 1,
    lrNo: currentLrNo || '...',
    date: itemForm?.date || getTodayDateString(),
    pkg: Number(itemForm?.pkg) || 0,
    invoiceNo: itemForm?.invoiceNo || '',
    ctTo: itemForm?.ctTo || masters.stations[0]?.name || '',
    consignorName: itemForm?.consignorName || '',
    consigneeName: itemForm?.consigneeName || '',
    toPayAmount: Number(itemForm?.toPayAmount) || 0,
    tbbAmount: Number(itemForm?.tbbAmount) || 0,
    paidAmount: Number(itemForm?.paidAmount) || 0,
    isDraftPreview: true,
  };

  const allLRs = [...stagedItems];
  if (editingIndex !== null && allLRs[editingIndex]) {
    allLRs[editingIndex] = currentFormPreviewItem;
  } else if (hasFormDraft) {
    allLRs.push(currentFormPreviewItem);
  }

  const handleEditStagedItem = (index) => {
    const item = stagedItems[index] || allLRs[index];
    if (!item) {
      focusLRNoInput();
      return;
    }

    if (!stagedItems[index]) {
      setStagedItems((prev) => [...prev, { ...item, srNo: prev.length + 1 }]);
    }

    setItemForm({
      srNo: item.srNo ?? index + 1,
      lrNo: String(item.lrNo ?? ''),
      date: item.date || getTodayDateString(),
      pkg: item.pkg !== undefined && item.pkg !== null ? String(item.pkg) : '',
      invoiceNo: String(item.invoiceNo ?? ''),
      ctTo: item.ctTo || masters.stations[0]?.name || '',
      consignorName: String(item.consignorName ?? ''),
      consigneeName: String(item.consigneeName ?? ''),
      toPayAmount: item.toPayAmount ? String(item.toPayAmount) : '',
      tbbAmount: item.tbbAmount ? String(item.tbbAmount) : '',
      paidAmount: item.paidAmount ? String(item.paidAmount) : '',
    });
    setEditingIndex(index);
    focusLRNoInput();
  };

  const handleDeleteStagedItem = (index) => {
    if (!stagedItems[index]) {
      resetForm();
      focusLRNoInput();
      return;
    }
    const filtered = stagedItems.filter((_, idx) => idx !== index);
    const renumbered = filtered.map((item, idx) => ({ ...item, srNo: idx + 1 }));
    setStagedItems(renumbered);
    if (editingIndex === index) {
      resetForm();
    } else if (editingIndex !== null && index < editingIndex) {
      setEditingIndex(editingIndex - 1);
    }
  };

  const totalQty = allLRs.reduce((sum, item) => sum + (Number(item.pkg) || 0), 0);
  const totalToPay = allLRs.reduce((sum, item) => sum + (Number(item.toPayAmount) || 0), 0);
  const totalTbb = allLRs.reduce((sum, item) => sum + (Number(item.tbbAmount) || 0), 0);
  const totalPaid = allLRs.reduce((sum, item) => sum + (Number(item.paidAmount) || 0), 0);

  // Final Submit handler
  const handleFinalSubmit = (shouldPrint = false) => {
    setError('');
    setSuccess('');

    let finalItems = allLRs
      .filter((item) => String(item.lrNo ?? '').trim() && String(item.lrNo ?? '').trim() !== '...')
      .map((item) => ({
        ...item,
        pkg: Number(item.pkg) || 1,
      }));

    if (finalItems.length === 0) {
      setError('Please enter at least one LR No. before saving or printing.');
      return;
    }

    if (shouldPrint) {
      if (editingInwardId || editInwardData) {
        try {
          handleUpdateFullInward(
            editingInwardId || editInwardData?.inwardNo,
            headerData,
            finalItems,
            user?.displayName || 'Operator'
          );
        } catch (err) {
          // Proceed with printing current form data
        }
      }

      printRecordDetails({
        title: `Inward Receipt Details #${headerData.inwardNo}`,
        fields: [
          { label: 'Inward No.', value: headerData.inwardNo },
          { label: 'Date', value: formatDate(headerData.date) },
          { label: 'Vehicle No.', value: headerData.vehicleNo || '-' },
          { label: 'Vehicle Owner', value: headerData.ownerName || '-' },
          { label: 'Driver Name', value: headerData.driverName || '-' },
          { label: 'From Station', value: headerData.fromStation || '-' },
          { label: 'Memo No.', value: headerData.memoNo || '-' },
          {
            label: 'Total Freight',
            value: formatCurrency(totalToPay + totalTbb + totalPaid),
          },
        ],
        items: finalItems,
      });
      return;
    }

    try {
      if (editingInwardId || editInwardData) {
        handleUpdateFullInward(
          editingInwardId || editInwardData?.inwardNo,
          headerData,
          finalItems,
          user?.displayName || 'Operator'
        );
        setSuccess(`Inward Receipt #${headerData.inwardNo} updated successfully!`);
      } else {
        handleCreateInward(headerData, finalItems, user?.displayName || 'Operator');
        setSuccess(`Inward Receipt #${headerData.inwardNo} saved successfully!`);
      }

      setTimeout(() => {
        if (location.state?.returnPath) {
          navigate(location.state.returnPath);
        } else {
          navigate('/all-entries', { state: { tab: location.state?.returnTab || 'inward_headers' } });
        }
      }, 300);
    } catch (err) {
      setError(err.message || 'Failed to save Inward transaction.');
    }
  };

  return (
    <div className="space-y-5 text-slate-800 max-w-full">
      {/* ROYAL NAVY HERO BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0d2358] via-[#102d73] to-[#163a94] p-5 sm:p-6 text-white shadow-lg border border-blue-900/40">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-extrabold tracking-widest uppercase text-sky-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>GATE-01 INWARD MANIFEST DOCK</span>
              <span className="text-blue-200/50">•</span>
              <span className="text-blue-100 font-mono">
                {editingInwardId ? `EDITING INW #${headerData.inwardNo}` : 'NEW RECEIPT'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
              {editingInwardId ? `Update Inward Entry #${headerData.inwardNo}` : 'New Inward Consignment'}
            </h1>
            <p className="text-xs text-blue-100/80 mt-1 max-w-xl">
              Log incoming linehaul truckload, attach physical memo numbers, and register individual LR items into godown stock.
            </p>
          </div>

          <div className="flex items-center space-x-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => navigate('/all-entries', { state: { tab: 'inward_headers' } })}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-xl text-xs font-bold transition-all border border-white/20 flex items-center space-x-2 shadow-xs cursor-pointer"
            >
              <Layers className="w-4 h-4 text-sky-300" />
              <span>Show All Inward</span>
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

      {/* HEADER SECTION: Inward Header Details */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-4 bg-[#1d4ed8] rounded-full" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              Trip & Linehaul Header Details
            </h3>
          </div>
          <span className="text-[11px] font-bold text-slate-400">
            Auto-assigned Inward: <span className="font-mono text-[#1d4ed8] font-black">{headerData.inwardNo}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
              Inward No.
            </label>
            <input
              type="text"
              name="inwardNo"
              value={headerData.inwardNo}
              onChange={handleHeaderChange}
              className="w-full px-3 py-2 border border-slate-200 bg-slate-50/70 rounded-xl text-xs font-black text-[#1d4ed8] font-mono focus:ring-2 focus:ring-[#1d4ed8] outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
              Arrival Date *
            </label>
            <input
              type="date"
              name="date"
              value={headerData.date}
              onChange={handleHeaderChange}
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
                onChange={handleHeaderChange}
                options={masters.transporters}
                placeholder=""
                className="px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#1d4ed8]"
              />
              <button
                type="button"
                onClick={() => handleOpenQuickAdd('transporters', 'Transporter', 'transporterName', true)}
                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl font-black text-xs text-slate-700 transition-colors shadow-2xs flex-shrink-0 cursor-pointer"
                title="Quick Add Transporter"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
              Origin Station *
            </label>
            <div className="flex items-center space-x-1.5 min-w-0">
              <EditableCombobox
                name="fromStation"
                value={headerData.fromStation}
                onChange={handleHeaderChange}
                options={masters.stations}
                placeholder=""
                className="px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#1d4ed8]"
              />
              <button
                type="button"
                onClick={() => handleOpenQuickAdd('stations', 'Origin Station', 'fromStation', true)}
                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl font-black text-xs text-slate-700 transition-colors shadow-2xs flex-shrink-0 cursor-pointer"
                title="Quick Add Station"
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
                onChange={handleHeaderChange}
                options={masters.vehicles}
                placeholder=""
                className="px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-[#1d4ed8]"
              />
              <button
                type="button"
                onClick={() => handleOpenQuickAdd('vehicles', 'Vehicle Number', 'vehicleNo', true)}
                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl font-black text-xs text-slate-700 transition-colors shadow-2xs flex-shrink-0 cursor-pointer"
                title="Quick Add Vehicle"
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
              onChange={handleHeaderChange}
              placeholder="e.g. MM-8801"
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
                onChange={handleHeaderChange}
                options={masters.drivers}
                placeholder=""
                className="px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#1d4ed8]"
              />
              <button
                type="button"
                onClick={() => handleOpenQuickAdd('drivers', 'Driver Name', 'driverName', true)}
                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl font-black text-xs text-slate-700 transition-colors shadow-2xs flex-shrink-0 cursor-pointer"
                title="Quick Add Driver"
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
                onChange={handleHeaderChange}
                options={Array.from(
                  new Set([
                    ...(masters.owners || []).map((o) => o.name),
                    ...(masters.vehicles || []).map((v) => v.ownerName).filter(Boolean),
                    headerData.ownerName,
                  ].filter(Boolean))
                )}
                placeholder=""
                className="px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#1d4ed8]"
              />
              <button
                type="button"
                onClick={() => handleOpenQuickAdd('owners', 'Vehicle Owner', 'ownerName', true)}
                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl font-black text-xs text-slate-700 transition-colors shadow-2xs flex-shrink-0 cursor-pointer"
                title="Quick Add Vehicle Owner"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* LR ENTRY DETAILS FORM */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-4 bg-sky-500 rounded-full" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              LR Consignment Fast Input Terminal
            </h3>
            {editingIndex !== null && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                EDITING ROW #{editingIndex + 1}
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-bold text-slate-600">Enter</kbd> to jump fields &amp; save row
          </span>
        </div>

        {/* Row 1: SRNO, LR NO, DATE, INVOICE NO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 items-end">
          <div>
            <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">SR NO.</label>
            <input
              type="text"
              readOnly
              tabIndex={-1}
              value={
                editingIndex !== null && stagedItems[editingIndex]
                  ? stagedItems[editingIndex].srNo
                  : editingIndex !== null
                  ? editingIndex + 1
                  : stagedItems.length + 1
              }
              className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-center text-slate-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-[#1d4ed8] uppercase mb-1.5">LR NO. *</label>
            <input
              ref={(el) => (fieldRefs.current[0] = el)}
              onKeyDown={(e) => handleKeyDown(e, 0)}
              type="text"
              name="lrNo"
              value={itemForm.lrNo}
              onChange={handleItemChange}
              placeholder="e.g. 13941"
              autoFocus
              className="w-full px-3 py-2 bg-sky-50/70 border border-blue-200 rounded-xl text-xs font-black text-[#1d4ed8] uppercase focus:ring-2 focus:ring-[#1d4ed8] outline-none placeholder-slate-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">DATE</label>
            <input
              ref={(el) => (fieldRefs.current[1] = el)}
              onKeyDown={(e) => handleKeyDown(e, 1)}
              type="date"
              name="date"
              value={itemForm.date}
              onChange={handleItemChange}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#1d4ed8] outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">INVOICE NO.</label>
            <input
              ref={(el) => (fieldRefs.current[2] = el)}
              onKeyDown={(e) => handleKeyDown(e, 2)}
              type="text"
              name="invoiceNo"
              value={itemForm.invoiceNo}
              onChange={handleItemChange}
              placeholder="e.g. INV-902"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 uppercase focus:ring-2 focus:ring-[#1d4ed8] outline-none placeholder-slate-400"
            />
          </div>
        </div>

        {/* Row 2: CT TO, CONSIGNOR, CONSIGNEE, PKG */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 items-end">
          <div>
            <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">DESTINATION / CT TO</label>
            <div className="flex items-center space-x-1.5 min-w-0">
              <EditableCombobox
                inputRef={(el) => (fieldRefs.current[3] = el)}
                onKeyDown={(e) => handleKeyDown(e, 3)}
                name="ctTo"
                value={itemForm.ctTo}
                onChange={handleItemChange}
                options={masters.stations}
                placeholder=""
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#1d4ed8]"
              />
              <button
                type="button"
                onClick={() => handleOpenQuickAdd('stations', 'Station', 'ctTo', false)}
                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl font-black text-xs text-slate-700 transition-colors shadow-2xs flex-shrink-0 cursor-pointer"
                title="Quick Add Station"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">CONSIGNOR (SENDER)</label>
            <div className="flex items-center space-x-1.5 min-w-0">
              <EditableCombobox
                inputRef={(el) => (fieldRefs.current[4] = el)}
                onKeyDown={(e) => handleKeyDown(e, 4)}
                name="consignorName"
                value={itemForm.consignorName}
                onChange={handleItemChange}
                options={masters.consignors}
                placeholder=""
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#1d4ed8]"
              />
              <button
                type="button"
                onClick={() => handleOpenQuickAdd('consignors', 'Consignor', 'consignorName', false)}
                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl font-black text-xs text-slate-700 transition-colors shadow-2xs flex-shrink-0 cursor-pointer"
                title="Quick Add Consignor"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">CONSIGNEE (RECEIVER)</label>
            <div className="flex items-center space-x-1.5 min-w-0">
              <EditableCombobox
                inputRef={(el) => (fieldRefs.current[5] = el)}
                onKeyDown={(e) => handleKeyDown(e, 5)}
                name="consigneeName"
                value={itemForm.consigneeName}
                onChange={handleItemChange}
                options={masters.consignees}
                placeholder=""
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#1d4ed8]"
              />
              <button
                type="button"
                onClick={() => handleOpenQuickAdd('consignees', 'Consignee', 'consigneeName', false)}
                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl font-black text-xs text-slate-700 transition-colors shadow-2xs flex-shrink-0 cursor-pointer"
                title="Quick Add Consignee"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-900 uppercase mb-1.5">PACKAGES (PKG) *</label>
            <input
              ref={(el) => (fieldRefs.current[6] = el)}
              onKeyDown={(e) => handleKeyDown(e, 6)}
              type="text"
              inputMode="numeric"
              name="pkg"
              value={itemForm.pkg}
              onChange={handleItemChange}
              placeholder="1"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-[#1d4ed8] outline-none"
            />
          </div>
        </div>

        {/* Row 3: TO PAY, T.B.B, PAID, TOTAL & ACTION BUTTON */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 items-end pt-1">
          <div>
            <label className="block text-[11px] font-extrabold text-amber-700 uppercase mb-1.5">TO PAY FREIGHT</label>
            <input
              ref={(el) => (fieldRefs.current[7] = el)}
              onKeyDown={(e) => handleKeyDown(e, 7)}
              type="text"
              inputMode="decimal"
              name="toPayAmount"
              value={itemForm.toPayAmount}
              onChange={handleItemChange}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-amber-50/60 border border-amber-200 rounded-xl text-xs font-black text-amber-900 focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-sky-700 uppercase mb-1.5">T.B.B. FREIGHT</label>
            <input
              ref={(el) => (fieldRefs.current[8] = el)}
              onKeyDown={(e) => handleKeyDown(e, 8)}
              type="text"
              inputMode="decimal"
              name="tbbAmount"
              value={itemForm.tbbAmount}
              onChange={handleItemChange}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-sky-50/60 border border-sky-200 rounded-xl text-xs font-black text-sky-900 focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-emerald-700 uppercase mb-1.5">PAID FREIGHT</label>
            <input
              ref={(el) => (fieldRefs.current[9] = el)}
              onKeyDown={(e) => handleKeyDown(e, 9)}
              type="text"
              inputMode="decimal"
              name="paidAmount"
              value={itemForm.paidAmount}
              onChange={handleItemChange}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs font-black text-emerald-900 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1.5">TOTAL ROW</label>
            <input
              ref={(el) => (fieldRefs.current[10] = el)}
              onKeyDown={(e) => handleKeyDown(e, 10)}
              type="text"
              readOnly
              tabIndex={0}
              value={formatCurrency((Number(itemForm.toPayAmount) || 0) + (Number(itemForm.tbbAmount) || 0) + (Number(itemForm.paidAmount) || 0))}
              className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-900 text-right outline-none"
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleAddOrUpdateLR}
              className="w-full py-2 bg-[#1d4ed8] hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{editingIndex !== null ? 'Update LR' : 'Add to Grid'}</span>
            </button>
            {editingIndex !== null && (
              <button
                type="button"
                onClick={resetForm}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
                title="Cancel Edit"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* STAGED ITEMS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              Inward Freight Staging Manifest
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-[#1d4ed8]">
              {allLRs.length} Total Rows
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
              {allLRs.length === 0 ? (
                <tr>
                  <td colSpan="12" className="py-12 text-center text-slate-400 font-medium">
                    No LR entries staged yet. Fill LR details above to populate grid.
                  </td>
                </tr>
              ) : (
                allLRs.map((item, idx) => (
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
                        <span className="tracking-tight">{item.lrNo}</span>
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
                    <td className="py-2 px-3 border-r border-slate-100 text-slate-600 truncate max-w-[140px]">
                      {item.consignorName || '-'}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-100 text-slate-600 truncate max-w-[140px]">
                      {item.consigneeName || '-'}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-extrabold text-amber-700">
                      {Number(item.toPayAmount || 0) > 0 ? Number(item.toPayAmount).toFixed(2) : '-'}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-extrabold text-sky-700">
                      {Number(item.tbbAmount || 0) > 0 ? Number(item.tbbAmount).toFixed(2) : '-'}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-extrabold text-emerald-700">
                      {Number(item.paidAmount || 0) > 0 ? Number(item.paidAmount).toFixed(2) : '-'}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {item.isDraftPreview ? (
                        <span className="text-[10px] font-semibold text-sky-600 italic">Typing...</span>
                      ) : (
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleEditStagedItem(idx)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                            title="Edit LR"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStagedItem(idx)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                            title="Delete LR"
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

      {/* BOTTOM SUMMARY & ACTIONS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-4 flex flex-col lg:flex-row items-center justify-between gap-4 sticky bottom-4 z-20">
        {/* Left Action Buttons (Save, Print) */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => handleFinalSubmit(false)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{editingInwardId ? 'Update Inward' : 'Save & Post to Stock'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleFinalSubmit(true)}
            className="px-5 py-2.5 bg-[#1d4ed8] hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Save &amp; Print Manifest</span>
          </button>
        </div>

        {/* Right Summary Totals (PKG, TO PAY, T.B.B, PAID) */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-black text-slate-800 w-full lg:w-auto justify-end">
          <div className="flex items-center space-x-2 bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200">
            <span className="text-slate-500 uppercase text-[10px] tracking-wider">TOTAL PKG</span>
            <span className="text-slate-900 font-black text-sm">{totalQty}</span>
          </div>

          <div className="flex items-center space-x-2 bg-amber-50 px-3.5 py-2 rounded-xl border border-amber-200 text-amber-900">
            <span className="text-amber-700 uppercase text-[10px] tracking-wider">TO PAY</span>
            <span className="font-black text-sm">{formatCurrency(totalToPay)}</span>
          </div>

          <div className="flex items-center space-x-2 bg-sky-50 px-3.5 py-2 rounded-xl border border-sky-200 text-sky-900">
            <span className="text-sky-700 uppercase text-[10px] tracking-wider">T.B.B.</span>
            <span className="font-black text-sm">{formatCurrency(totalTbb)}</span>
          </div>

          <div className="flex items-center space-x-2 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200 text-emerald-900">
            <span className="text-emerald-700 uppercase text-[10px] tracking-wider">PAID</span>
            <span className="font-black text-sm">{formatCurrency(totalPaid)}</span>
          </div>
        </div>
      </div>

      {/* QUICK ADD MODAL FOR [...] BUTTONS */}
      <Modal
        isOpen={quickAddModal.isOpen}
        onClose={() => setQuickAddModal({ isOpen: false, category: '', title: '', targetField: '', isHeader: true })}
        title={`Quick Add New ${quickAddModal.title}`}
      >
        <form onSubmit={handleSaveQuickAdd} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1.5">
              Enter {quickAddModal.title} Name / Identifier: *
            </label>
            <input
              type="text"
              value={quickAddValue}
              onChange={(e) => setQuickAddValue(e.target.value)}
              placeholder={`e.g. New ${quickAddModal.title}`}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#1d4ed8] outline-none"
              required
              autoFocus
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setQuickAddModal({ isOpen: false, category: '', title: '', targetField: '', isHeader: true })}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#1d4ed8] hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer transition-all"
            >
              Save &amp; Select
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
