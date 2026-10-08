import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { Save, Printer, ArrowLeft, AlertCircle, Plus, Trash2, Edit2, RotateCcw, PackageCheck } from 'lucide-react';
import { getTodayDateString } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/numberUtils';

export const OutwardCreate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { masters, pendingStock, handleCreateOutward, handleAddMaster } = useApp();
  const { user } = useAuth();

  // HEADER DETAILS (Outward Memo Header)
  const [headerData, setHeaderData] = useState({
    outwardNo: `OUT-${Math.floor(1000 + Math.random() * 9000)}`,
    date: getTodayDateString(),
    transporterName: masters.transporters[0]?.name || '',
    fromStation: masters.stations[0]?.name || 'SANGLI',
    vehicleNo: masters.vehicles[0]?.vehicleNo || '',
    memoNo: '',
    driverName: masters.drivers[0]?.name || '',
  });

  // ITEM ENTRY FORM (Matching LIMRA Outward LR detail fields)
  const [itemForm, setItemForm] = useState({
    srNo: 1,
    lrNo: '',
    date: getTodayDateString(),
    pkg: '',
    invoiceNo: '',
    ctTo: masters.stations[0]?.name || '',
    deliveryPersonName: masters.deliveryPersons[0]?.name || '',
    consignorName: masters.consignors[0]?.name || '',
    consigneeName: masters.consignees[0]?.name || '',
    toPayAmount: '',
    tbbAmount: '',
    paidAmount: '',
  });

  // Selected & Staged Outward Items
  const [selectedItems, setSelectedItems] = useState([]);
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

  // Auto-load items passed from Pending Stock page
  useEffect(() => {
    if (location.state?.selectedPendingItems && location.state.selectedPendingItems.length > 0) {
      const items = location.state.selectedPendingItems.map((item, idx) => ({
        ...item,
        srNo: idx + 1,
        deliveryPersonName: masters.deliveryPersons[0]?.name || 'SANTOSH SAI RAM PALUS',
      }));
      setSelectedItems(items);
    }
  }, [location.state]);

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setHeaderData((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (e) => {
    const { name, value } = e.target;
    if (name === 'pkg') {
      if (value !== '' && !/^\d*$/.test(value)) return;
    }
    if (['toPayAmount', 'tbbAmount', 'paidAmount'].includes(name)) {
      if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;
    }
    setItemForm((prev) => ({ ...prev, [name]: value }));
  };

  // Open Quick Add Modal for [...] buttons
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
    } else if (quickAddModal.category === 'stations') {
      newItem = { name: val, state: 'MH' };
    } else if (quickAddModal.category === 'drivers') {
      newItem = { name: val, licenseNo: 'DL-9902', phone: '9800000000' };
    } else if (quickAddModal.category === 'deliveryPersons') {
      newItem = { name: val, phone: '9870000000' };
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

  // Toggle selection of pending stock LRs from godown
  const toggleSelectPendingLR = (item) => {
    if (selectedItems.some((s) => s.id === item.id)) {
      setSelectedItems((prev) => prev.filter((s) => s.id !== item.id));
    } else {
      const newItem = {
        ...item,
        srNo: selectedItems.length + 1,
        deliveryPersonName: itemForm.deliveryPersonName || masters.deliveryPersons[0]?.name || 'SANTOSH SAI RAM PALUS',
      };
      setSelectedItems((prev) => [...prev, newItem]);
    }
  };

  // Manual Add or Update LR item
  const handleAddOrUpdateLR = (e) => {
    if (e) e.preventDefault();
    setError('');

    const cleanLR = String(itemForm.lrNo).trim();
    if (!cleanLR) {
      setError('Please enter a valid LR No.');
      return;
    }

    const newItem = {
      id: `out-item-${Date.now()}`,
      srNo: editingIndex !== null ? selectedItems[editingIndex].srNo : selectedItems.length + 1,
      lrNo: cleanLR,
      inwardDate: itemForm.date || getTodayDateString(),
      date: itemForm.date || getTodayDateString(),
      pkg: Number(itemForm.pkg) || 1,
      invoiceNo: itemForm.invoiceNo || '',
      ctTo: itemForm.ctTo || masters.stations[0]?.name || '',
      deliveryPersonName: itemForm.deliveryPersonName || masters.deliveryPersons[0]?.name || '',
      consignorName: itemForm.consignorName || '',
      consigneeName: itemForm.consigneeName || '',
      toPayAmount: Number(itemForm.toPayAmount) || 0,
      tbbAmount: Number(itemForm.tbbAmount) || 0,
      paidAmount: Number(itemForm.paidAmount) || 0,
    };

    if (editingIndex !== null) {
      const updated = [...selectedItems];
      updated[editingIndex] = newItem;
      setSelectedItems(updated);
      setEditingIndex(null);
    } else {
      setSelectedItems((prev) => [...prev, newItem]);
    }

    resetForm();
  };

  const resetForm = () => {
    setItemForm({
      srNo: selectedItems.length + 1,
      lrNo: '',
      date: getTodayDateString(),
      pkg: '',
      invoiceNo: '',
      ctTo: masters.stations[0]?.name || '',
      deliveryPersonName: masters.deliveryPersons[0]?.name || '',
      consignorName: masters.consignors[0]?.name || '',
      consigneeName: masters.consignees[0]?.name || '',
      toPayAmount: '',
      tbbAmount: '',
      paidAmount: '',
    });
    setEditingIndex(null);
  };

  const handleEditItem = (index) => {
    const item = selectedItems[index];
    setItemForm({ ...item });
    setEditingIndex(index);
  };

  const handleDeleteItem = (index) => {
    const filtered = selectedItems.filter((_, idx) => idx !== index);
    const renumbered = filtered.map((item, idx) => ({ ...item, srNo: idx + 1 }));
    setSelectedItems(renumbered);
  };

  // Aggregate Summary Totals
  const totalQty = selectedItems.reduce((sum, item) => sum + (Number(item.pkg) || 0), 0);
  const totalToPay = selectedItems.reduce((sum, item) => sum + (Number(item.toPayAmount) || 0), 0);
  const totalTbb = selectedItems.reduce((sum, item) => sum + (Number(item.tbbAmount) || 0), 0);
  const totalPaid = selectedItems.reduce((sum, item) => sum + (Number(item.paidAmount) || 0), 0);

  // Final Submit Handler
  const handleFinalSubmit = (shouldPrint = false) => {
    setError('');
    setSuccess('');

    let finalItems = [...selectedItems];
    if (finalItems.length === 0 && itemForm.lrNo.trim()) {
      finalItems.push({
        id: `out-item-${Date.now()}`,
        srNo: 1,
        lrNo: itemForm.lrNo.trim(),
        inwardDate: itemForm.date,
        date: itemForm.date,
        pkg: Number(itemForm.pkg) || 1,
        invoiceNo: itemForm.invoiceNo || '',
        ctTo: itemForm.ctTo,
        deliveryPersonName: itemForm.deliveryPersonName,
        consignorName: itemForm.consignorName,
        consigneeName: itemForm.consigneeName,
        toPayAmount: Number(itemForm.toPayAmount) || 0,
        tbbAmount: Number(itemForm.tbbAmount) || 0,
        paidAmount: Number(itemForm.paidAmount) || 0,
      });
    }

    if (finalItems.length === 0) {
      setError('Please select or enter at least one LR for Outward dispatch.');
      return;
    }

    try {
      handleCreateOutward(headerData, finalItems, user?.displayName || 'Operator');
      setSuccess(`Outward Receipt #${headerData.outwardNo} saved successfully! Status updated to DELIVERED.`);

      if (shouldPrint) {
        setTimeout(() => window.print(), 500);
      }

      setTimeout(() => {
        navigate('/outward');
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to save Outward transaction.');
    }
  };

  return (
    <div className="space-y-4 text-slate-800 max-w-full">
      {/* Top Header Title & Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Outward Details</h2>
          <p className="text-xs text-slate-500 font-medium">Record outward dispatch manifest and delivery entries</p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/outward')}
          className="inline-flex items-center space-x-2 bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-sm transition-all self-end sm:self-auto cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to OUTWARD</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold">
          {success}
        </div>
      )}

      {/* HEADER SECTION FIELDSET: Outward Header Details */}
      <fieldset className="bg-slate-100/90 rounded-xl border border-slate-300 p-3.5 pt-2 shadow-2xs">
        <legend className="px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-sky-900 bg-white border border-slate-300 rounded-md shadow-2xs">
          Outward Header Details
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 items-end mt-1">
          <div>
            <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
              NO. (OUTWARD NO)
            </label>
            <input
              type="text"
              name="outwardNo"
              value={headerData.outwardNo}
              onChange={handleHeaderChange}
              className="w-full px-2.5 py-1.5 border border-slate-300 bg-slate-200/70 rounded text-xs font-black text-[#1e295b]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
              DATE *
            </label>
            <input
              type="date"
              name="date"
              value={headerData.date}
              onChange={handleHeaderChange}
              className="w-full px-2.5 py-1.5 border border-slate-300 bg-white rounded text-xs font-semibold text-slate-800"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
              TRANSPORTER NAME
            </label>
            <div className="flex items-center space-x-1 min-w-0">
              <select
                name="transporterName"
                value={headerData.transporterName}
                onChange={handleHeaderChange}
                className="flex-1 px-2.5 py-1.5 border border-slate-300 bg-white rounded text-xs font-bold text-slate-800 focus:ring-1 focus:ring-sky-500 min-w-0 truncate"
              >
                {masters.transporters.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleOpenQuickAdd('transporters', 'Transporter', 'transporterName', true)}
                className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 border border-slate-300 rounded font-black text-xs text-slate-700 transition-colors shadow-2xs flex-shrink-0 cursor-pointer"
                title="Quick Add Transporter"
              >
                ...
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
              FROM (ORIGIN STATION) *
            </label>
            <div className="flex items-center space-x-1 min-w-0">
              <select
                name="fromStation"
                value={headerData.fromStation}
                onChange={handleHeaderChange}
                className="flex-1 px-2.5 py-1.5 border border-slate-300 bg-white rounded text-xs font-bold text-slate-800 focus:ring-1 focus:ring-sky-500 min-w-0 truncate"
              >
                {masters.stations.map((st) => (
                  <option key={st.id} value={st.name}>
                    {st.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleOpenQuickAdd('stations', 'Origin Station', 'fromStation', true)}
                className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 border border-slate-300 rounded font-black text-xs text-slate-700 transition-colors shadow-2xs flex-shrink-0 cursor-pointer"
                title="Quick Add Station"
              >
                ...
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
              VEHICLE NO. *
            </label>
            <div className="flex items-center space-x-1 min-w-0">
              <select
                name="vehicleNo"
                value={headerData.vehicleNo}
                onChange={handleHeaderChange}
                className="flex-1 px-2.5 py-1.5 border border-slate-300 bg-white rounded text-xs font-extrabold text-[#1e295b] focus:ring-1 focus:ring-sky-500 uppercase min-w-0 truncate"
              >
                {masters.vehicles.map((v) => (
                  <option key={v.id} value={v.vehicleNo}>
                    {v.vehicleNo}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleOpenQuickAdd('vehicles', 'Vehicle Number', 'vehicleNo', true)}
                className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 border border-slate-300 rounded font-black text-xs text-slate-700 transition-colors shadow-2xs flex-shrink-0 cursor-pointer"
                title="Quick Add Vehicle"
              >
                ...
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
              MEMO NO.
            </label>
            <input
              type="text"
              name="memoNo"
              value={headerData.memoNo}
              onChange={handleHeaderChange}
              placeholder="E.G. MM-9026"
              className="w-full px-2.5 py-1.5 border border-slate-300 bg-white rounded text-xs font-bold text-slate-800 uppercase focus:ring-1 focus:ring-sky-500 placeholder-slate-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
              DRIVER NAME *
            </label>
            <div className="flex items-center space-x-1 min-w-0">
              <select
                name="driverName"
                value={headerData.driverName}
                onChange={handleHeaderChange}
                className="flex-1 px-2.5 py-1.5 border border-slate-300 bg-white rounded text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-sky-500 min-w-0 truncate"
              >
                {masters.drivers.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleOpenQuickAdd('drivers', 'Driver Name', 'driverName', true)}
                className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 border border-slate-300 rounded font-black text-xs text-slate-700 transition-colors shadow-2xs flex-shrink-0 cursor-pointer"
                title="Quick Add Driver"
              >
                ...
              </button>
            </div>
          </div>
        </div>
      </fieldset>

      {/* ITEM DETAILS FORM FIELDSET: LR Dispatch Details */}
      <fieldset className="bg-slate-50 rounded-xl border border-slate-300 p-3.5 pt-2 space-y-3 shadow-2xs">
        <legend className="px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-sky-900 bg-white border border-slate-300 rounded-md shadow-2xs">
          LR Dispatch Details
        </legend>
        {/* Row 1: SRNO, LR NO, DATE, INVOICE NO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">SRNO:</label>
            <input
              type="text"
              readOnly
              value={editingIndex !== null ? selectedItems[editingIndex].srNo : selectedItems.length + 1}
              className="w-full px-2 py-1.5 bg-slate-200 border border-slate-300 rounded text-xs font-bold text-center text-slate-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-[#1e295b] uppercase mb-1">LR NO: *</label>
            <input
              type="text"
              name="lrNo"
              value={itemForm.lrNo}
              onChange={handleItemChange}
              placeholder="E.G. 174"
              className="w-full px-2.5 py-1.5 bg-sky-50/80 border border-slate-300 rounded text-xs font-black text-[#1e295b] uppercase focus:ring-1 focus:ring-sky-500 placeholder-slate-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">DATE:</label>
            <input
              type="date"
              name="date"
              value={itemForm.date}
              onChange={handleItemChange}
              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">INVOICE NO:</label>
            <input
              type="text"
              name="invoiceNo"
              value={itemForm.invoiceNo}
              onChange={handleItemChange}
              placeholder="INV-9026"
              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold uppercase placeholder-slate-400"
            />
          </div>
        </div>

        {/* Row 2: DELIVERY PERSON, CT TO, CONSIGNER, CONSIGNEE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-black text-emerald-800 uppercase mb-1">DELIVERY PERSON:</label>
            <div className="flex items-center space-x-1 min-w-0">
              <select
                name="deliveryPersonName"
                value={itemForm.deliveryPersonName}
                onChange={handleItemChange}
                className="w-full px-2 py-1.5 bg-emerald-50 border border-emerald-300 rounded text-xs font-extrabold text-emerald-900 truncate min-w-0"
              >
                {masters.deliveryPersons.map((dp) => (
                  <option key={dp.id} value={dp.name}>
                    {dp.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleOpenQuickAdd('deliveryPersons', 'Delivery Person', 'deliveryPersonName', false)}
                className="px-1.5 py-1.5 bg-emerald-200 hover:bg-emerald-300 border border-emerald-300 rounded font-black text-xs text-emerald-900 transition-colors shadow-2xs flex-shrink-0 cursor-pointer"
                title="Quick Add Delivery Person"
              >
                ...
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">CT TO:</label>
            <div className="flex items-center space-x-1 min-w-0">
              <select
                name="ctTo"
                value={itemForm.ctTo}
                onChange={handleItemChange}
                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs font-bold text-[#1e295b] truncate min-w-0"
              >
                {masters.stations.map((st) => (
                  <option key={st.id} value={st.name}>
                    {st.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleOpenQuickAdd('stations', 'Destination Station', 'ctTo', false)}
                className="px-1.5 py-1.5 bg-slate-200 hover:bg-slate-300 border border-slate-300 rounded font-black text-xs text-slate-700 transition-colors shadow-2xs flex-shrink-0 cursor-pointer"
                title="Quick Add Station"
              >
                ...
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">CONSIGNER:</label>
            <div className="flex items-center space-x-1 min-w-0">
              <select
                name="consignorName"
                value={itemForm.consignorName}
                onChange={handleItemChange}
                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800 truncate min-w-0"
              >
                <option value="">Select Consignor...</option>
                {masters.consignors.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleOpenQuickAdd('consignors', 'Consignor', 'consignorName', false)}
                className="px-1.5 py-1.5 bg-slate-200 hover:bg-slate-300 border border-slate-300 rounded font-black text-xs text-slate-700 transition-colors shadow-2xs flex-shrink-0 cursor-pointer"
                title="Quick Add Consignor"
              >
                ...
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">CONSIGNEE:</label>
            <div className="flex items-center space-x-1 min-w-0">
              <select
                name="consigneeName"
                value={itemForm.consigneeName}
                onChange={handleItemChange}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800 truncate min-w-0"
              >
                <option value="">Select Consignee...</option>
                {masters.consignees.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleOpenQuickAdd('consignees', 'Consignee', 'consigneeName', false)}
                className="px-1.5 py-1.5 bg-slate-200 hover:bg-slate-300 border border-slate-300 rounded font-black text-xs text-slate-700 transition-colors shadow-2xs flex-shrink-0 cursor-pointer"
                title="Quick Add Consignee"
              >
                ...
              </button>
            </div>
          </div>
        </div>

        {/* Row 3: PKG, TO PAY, TBB, PAID, ADD LR (5 inputs in 1 row) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">PKG:</label>
            <input
              type="text"
              inputMode="numeric"
              name="pkg"
              value={itemForm.pkg}
              onChange={handleItemChange}
              onWheel={(e) => e.target.blur()}
              onKeyDown={(e) => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()}
              placeholder="Qty"
              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs font-bold text-center placeholder-slate-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">TO PAY:</label>
            <input
              type="text"
              inputMode="decimal"
              name="toPayAmount"
              value={itemForm.toPayAmount}
              onChange={handleItemChange}
              onWheel={(e) => e.target.blur()}
              onKeyDown={(e) => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()}
              placeholder="0.00"
              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs font-black text-amber-900 placeholder-slate-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">TBB:</label>
            <input
              type="text"
              inputMode="decimal"
              name="tbbAmount"
              value={itemForm.tbbAmount}
              onChange={handleItemChange}
              onWheel={(e) => e.target.blur()}
              onKeyDown={(e) => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()}
              placeholder="0.00"
              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs font-black text-sky-900 placeholder-slate-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">PAID:</label>
            <input
              type="text"
              inputMode="decimal"
              name="paidAmount"
              value={itemForm.paidAmount || ''}
              onChange={handleItemChange}
              onWheel={(e) => e.target.blur()}
              onKeyDown={(e) => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()}
              placeholder="0.00"
              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs font-black text-emerald-900 placeholder-slate-400"
            />
          </div>

          <div className="flex space-x-1.5">
            <button
              type="button"
              onClick={handleAddOrUpdateLR}
              className="w-full inline-flex items-center justify-center space-x-1 bg-sky-600 hover:bg-sky-700 text-white font-black py-1.5 px-3 rounded text-xs shadow-xs transition-colors uppercase tracking-wider cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{editingIndex !== null ? 'Update LR' : 'Add LR'}</span>
            </button>
            {editingIndex !== null && (
              <button
                type="button"
                onClick={resetForm}
                className="p-1.5 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 cursor-pointer"
                title="Cancel Edit"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </fieldset>

      {/* EMBEDDED PENDING STOCK GODOWN PICKER */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-300 p-3.5 space-y-2">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center space-x-2">
            <PackageCheck className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-black text-[#1e295b] uppercase tracking-wider">
              SELECT PENDING LRS IN GODOWN TO DISPATCH ({pendingStock.length} Available)
            </h3>
          </div>
          <span className="text-[10px] font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            Click to toggle dispatch list
          </span>
        </div>

        <div className="max-h-40 overflow-y-auto space-y-1.5 no-scrollbar pr-1">
          {pendingStock.length === 0 ? (
            <div className="p-4 text-center text-slate-400 font-bold text-xs border border-dashed rounded-lg">
              No pending stock LRs currently available in godown.
            </div>
          ) : (
            pendingStock.map((item) => {
              const isSelected = selectedItems.some((s) => s.id === item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelectPendingLR(item)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50/80 shadow-2xs'
                      : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-3 text-xs">
                    <span className="font-black text-[#1e295b]">{item.lrNo}</span>
                    <span className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase px-1.5 py-0.5 rounded border border-slate-200">
                      {item.ctTo || item.destinationStation || 'STATION'}
                    </span>
                    <span className="text-slate-600 font-semibold truncate max-w-[200px]">
                      {item.consignorName || 'SELF'} &rarr; {item.consigneeName || 'RECEIVER'}
                    </span>
                    <span className="text-slate-500 font-bold">
                      {item.pkg} Pkgs &bull; {formatCurrency(item.toPayAmount || item.tbbAmount || item.paidAmount || 0)}
                    </span>
                  </div>

                  <div className="flex-shrink-0 ml-2">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-all text-[11px] ${
                        isSelected
                          ? 'bg-sky-600 text-white font-black shadow-xs'
                          : 'border-2 border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && '✓'}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* STAGED DISPATCH GRID TABLE (LIMRA Outward Table with DelPerson) */}
      <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto no-scrollbar max-h-48">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-200 text-slate-800 font-black text-[10px] uppercase tracking-tight sticky top-0 border-b border-slate-300">
              <tr>
                <th className="px-2 py-1.5 w-10 text-center">SRNO</th>
                <th className="px-2 py-1.5">LR NO</th>
                <th className="px-2 py-1.5">INDATE</th>
                <th className="px-2 py-1.5 text-center">PKG</th>
                <th className="px-2 py-1.5">INV NO</th>
                <th className="px-2 py-1.5">CT TO</th>
                <th className="px-2 py-1.5">DEL PERSON</th>
                <th className="px-2 py-1.5">CONSIGNER</th>
                <th className="px-2 py-1.5">CONSIGNEE</th>
                <th className="px-2 py-1.5 text-right">TO PAY</th>
                <th className="px-2 py-1.5 text-right">TBB</th>
                <th className="px-2 py-1.5 text-right">PAID</th>
                <th className="px-2 py-1.5 text-center w-16">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {selectedItems.length === 0 ? (
                <tr>
                  <td colSpan="13" className="py-6 px-4 text-center text-slate-400 font-bold text-xs">
                    No LRs selected for dispatch yet. Select LRs from godown list above or enter LR details.
                  </td>
                </tr>
              ) : (
                selectedItems.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-sky-50/60 font-semibold text-[11px]">
                    <td className="px-2 py-1.5 text-center font-black text-slate-600">{idx + 1}</td>
                    <td className="px-2 py-1.5 font-black text-sky-700">{item.lrNo}</td>
                    <td className="px-2 py-1.5">{item.inwardDate || item.date}</td>
                    <td className="px-2 py-1.5 text-center font-bold">{item.pkg}</td>
                    <td className="px-2 py-1.5">{item.invoiceNo || '-'}</td>
                    <td className="px-2 py-1.5 font-bold text-slate-800">{item.ctTo}</td>
                    <td className="px-2 py-1.5 font-bold text-emerald-900 bg-emerald-50/60 px-1 rounded">
                      {item.deliveryPersonName || itemForm.deliveryPersonName || '-'}
                    </td>
                    <td className="px-2 py-1.5 text-slate-700">{item.consignorName || '-'}</td>
                    <td className="px-2 py-1.5 text-slate-700">{item.consigneeName || '-'}</td>
                    <td className="px-2 py-1.5 text-right font-black text-amber-800">
                      {formatCurrency(item.toPayAmount)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-black text-sky-800">
                      {formatCurrency(item.tbbAmount)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-black text-emerald-800">
                      {formatCurrency(item.paidAmount)}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleEditItem(idx)}
                          className="p-1 text-sky-600 hover:bg-sky-100 rounded"
                          title="Edit Dispatch LR"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(idx)}
                          className="p-1 text-rose-600 hover:bg-rose-100 rounded"
                          title="Remove Dispatch LR"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BOTTOM SUMMARY & ACTIONS (LIMRA Footer Controls - Single Clean Line) */}
      <div className="bg-slate-200/90 rounded-xl border border-slate-300 p-3 flex flex-col lg:flex-row items-center justify-between gap-3 shadow-2xs">
        {/* Left Action Buttons (Save, Print, PrintPreview, Modify, Close) */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => handleFinalSubmit(false)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#072440] hover:bg-[#091b30] text-white font-black rounded text-xs shadow-xs transition-all tracking-wide"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>

          <button
            type="button"
            onClick={() => handleFinalSubmit(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded text-xs shadow-xs transition-all tracking-wide"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={() => handleFinalSubmit(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-black rounded text-xs shadow-xs transition-all tracking-wide"
          >
            <span>PrintPreview</span>
          </button>

          <button
            type="button"
            onClick={resetForm}
            className="px-3.5 py-2 bg-slate-300 hover:bg-slate-400 text-slate-800 font-extrabold rounded text-xs transition-colors"
          >
            Modify
          </button>

          <button
            type="button"
            onClick={() => navigate('/outward')}
            className="px-3.5 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 font-extrabold rounded text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* Right Summary Totals (TOTAL QTY, TO PAY, TOTAL TBB, TOTAL PAID) */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-black text-slate-800 w-full lg:w-auto justify-end">
          <div className="flex items-center space-x-1.5 bg-white px-3 py-1.5 rounded border border-slate-300 shadow-2xs">
            <span className="text-slate-600 uppercase text-[11px]">TOTAL QTY:</span>
            <span className="text-slate-900 font-black text-xs">{totalQty}</span>
          </div>

          <div className="flex items-center space-x-1.5 bg-amber-50 px-3 py-1.5 rounded border border-amber-300 text-amber-900 shadow-2xs">
            <span className="text-amber-800 uppercase text-[11px]">TO PAY:</span>
            <span className="font-black text-xs">{formatCurrency(totalToPay)}</span>
          </div>

          <div className="flex items-center space-x-1.5 bg-sky-50 px-3 py-1.5 rounded border border-sky-300 text-sky-900 shadow-2xs">
            <span className="text-sky-800 uppercase text-[11px]">TOTAL TBB:</span>
            <span className="font-black text-xs">{formatCurrency(totalTbb)}</span>
          </div>

          <div className="flex items-center space-x-1.5 bg-emerald-50 px-3 py-1.5 rounded border border-emerald-300 text-emerald-900 shadow-2xs">
            <span className="text-emerald-800 uppercase text-[11px]">TOTAL PAID:</span>
            <span className="font-black text-xs">{formatCurrency(totalPaid)}</span>
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
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Enter {quickAddModal.title} Name / Details: *
            </label>
            <input
              type="text"
              value={quickAddValue}
              onChange={(e) => setQuickAddValue(e.target.value)}
              placeholder={`e.g. New ${quickAddModal.title}`}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-sky-500"
              required
              autoFocus
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setQuickAddModal({ isOpen: false, category: '', title: '', targetField: '', isHeader: true })}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-xs shadow"
            >
              Save &amp; Select
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
