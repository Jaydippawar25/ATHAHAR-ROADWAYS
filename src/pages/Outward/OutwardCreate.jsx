import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { EditableCombobox } from '../../components/common/EditableCombobox';
import { Save, Printer, AlertCircle, Trash2, Edit2, PackageCheck, Search, Layers, CheckCircle } from 'lucide-react';
import { getTodayDateString, formatDate } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/numberUtils';
import { printRecordDetails } from '../../services/exportService';
import { getNextOutwardNo } from '../../services/outwardService';

export const OutwardCreate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { masters, outwards, pendingStock, handleCreateOutward, handleUpdateFullOutward, handleAddMaster } = useApp();
  const { user } = useAuth();

  const editOutwardData = location.state?.editOutward || null;
  const editingOutwardId = editOutwardData?.id || null;

  // HEADER DETAILS (Outward Memo Header)
  const [headerData, setHeaderData] = useState({
    outwardNo: getNextOutwardNo(outwards),
    date: getTodayDateString(),
    transporterName: '',
    fromStation: '',
    vehicleNo: '',
    deliveryPersonName: '',
    driverName: '',
    memoNo: '',
  });

  // ITEM ENTRY FORM (Matching LIMRA Outward LR detail fields)
  const [itemForm, setItemForm] = useState({
    srNo: 1,
    lrNo: '',
    date: getTodayDateString(),
    pkg: '',
    invoiceNo: '',
    ctTo: '',
    deliveryPersonName: '',
    consignorName: '',
    consigneeName: '',
    toPayAmount: '',
    tbbAmount: '',
    paidAmount: '',
  });

// Selected & Staged Outward Items
  const [selectedItems, setSelectedItems] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Combine pendingStock with items currently in editOutward so they show up in the godown picker
  const availableStock = React.useMemo(() => {
    if (!editOutwardData?.items?.length) return pendingStock;
    const existingIds = new Set(pendingStock.map((p) => p.id));
    const extraEditedItems = editOutwardData.items
      .map((item) => ({
        ...item,
        id: item.inwardItemId || item.id,
      }))
      .filter((item) => !existingIds.has(item.id));
    return [...extraEditedItems, ...pendingStock];
  }, [pendingStock, editOutwardData]);

  const filteredPendingStock = availableStock.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      (item.lrNo && String(item.lrNo).toLowerCase().includes(term)) ||
      (item.memoNo && String(item.memoNo).toLowerCase().includes(term)) ||
      (item.inwardNo && String(item.inwardNo).toLowerCase().includes(term)) ||
      (item.consignorName && String(item.consignorName).toLowerCase().includes(term)) ||
      (item.consigneeName && String(item.consigneeName).toLowerCase().includes(term)) ||
      (item.ctTo && String(item.ctTo).toLowerCase().includes(term))
    );
  });

  const handleSelectAllFiltered = () => {
    const unselectedFiltered = filteredPendingStock.filter(
      (item) => !selectedItems.some((s) => s.id === item.id)
    );
    if (unselectedFiltered.length > 0) {
      const newAdditions = unselectedFiltered.map((item, idx) => ({
        ...item,
        srNo: selectedItems.length + idx + 1,
        deliveryPersonName: headerData.deliveryPersonName || item.deliveryPersonName || '',
      }));
      setSelectedItems((prev) => [...prev, ...newAdditions]);
    } else if (filteredPendingStock.length > 0) {
      const filteredIds = new Set(filteredPendingStock.map((item) => item.id));
      setSelectedItems((prev) => prev.filter((item) => !filteredIds.has(item.id)));
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

  // Load Edit Outward Data
  useEffect(() => {
    if (location.state?.editOutward) {
      const edit = location.state.editOutward;
      setHeaderData({
        outwardNo: edit.outwardNo || '',
        date: edit.date || edit.outwardDate || getTodayDateString(),
        transporterName: edit.transporterName || masters.transporters[0]?.name || '',
        fromStation: edit.from || edit.fromStation || masters.stations[0]?.name || '',
        vehicleNo: edit.vehicleNo || masters.vehicles[0]?.vehicleNo || '',
        deliveryPersonName: edit.deliveryPersonName || masters.deliveryPersons?.[0]?.name || '',
        driverName: edit.driverName || masters.drivers[0]?.name || '',
        memoNo: edit.memoNo || '',
      });

      const items = (edit.items || []).map((item, idx) => ({
        ...item,
        id: item.inwardItemId || item.id,
        srNo: idx + 1,
        lrNo: String(item.lrNo ?? ''),
        inwardDate: item.inwardDate || item.date || getTodayDateString(),
        pkg: Number(item.pkg) || 1,
        invoiceNo: item.invoiceNo || '',
        ctTo: item.ctTo || item.destinationStation || masters.stations[0]?.name || '',
        deliveryPersonName: item.deliveryPersonName || edit.deliveryPersonName || '',
        consignorName: item.consignorName || '',
        consigneeName: item.consigneeName || '',
        toPayAmount: Number(item.toPayAmount) || 0,
        tbbAmount: Number(item.tbbAmount) || 0,
        paidAmount: Number(item.paidAmount) || 0,
      }));

      setSelectedItems(items);
    }
  }, [location.state, masters]);

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setHeaderData((prev) => ({ ...prev, [name]: value }));

    // When default delivery person is updated, optionally apply to all selected items
    if (name === 'deliveryPersonName') {
      setSelectedItems((prev) =>
        prev.map((item) => ({
          ...item,
          deliveryPersonName: item.deliveryPersonName || value,
        }))
      );
    }
  };

  const handleItemChange = (e) => {
    const { name, value } = e.target;
    setItemForm((prev) => ({ ...prev, [name]: value }));
  };

  // Toggle LR from Pending Stock selection
  const toggleSelectPendingLR = (item) => {
    const isAlreadySelected = selectedItems.some((s) => s.id === item.id);
    if (isAlreadySelected) {
      setSelectedItems((prev) => prev.filter((s) => s.id !== item.id));
    } else {
      setSelectedItems((prev) => [
        ...prev,
        {
          ...item,
          srNo: prev.length + 1,
          deliveryPersonName: headerData.deliveryPersonName || item.deliveryPersonName || '',
        },
      ]);
    }
  };

  // Edit LR in Selected Staged List
  const handleEditItem = (index) => {
    const item = selectedItems[index];
    if (!item) return;

    setItemForm({
      srNo: index + 1,
      lrNo: String(item.lrNo ?? ''),
      date: item.inwardDate || item.date || getTodayDateString(),
      pkg: item.pkg !== undefined && item.pkg !== null ? String(item.pkg) : '',
      invoiceNo: String(item.invoiceNo ?? ''),
      ctTo: item.ctTo || item.destinationStation || '',
      deliveryPersonName: item.deliveryPersonName || headerData.deliveryPersonName || '',
      consignorName: String(item.consignorName ?? ''),
      consigneeName: String(item.consigneeName ?? ''),
      toPayAmount: item.toPayAmount ? String(item.toPayAmount) : '',
      tbbAmount: item.tbbAmount ? String(item.tbbAmount) : '',
      paidAmount: item.paidAmount ? String(item.paidAmount) : '',
    });
    setEditingIndex(index);
  };

  const handleDeleteItem = (index) => {
    setSelectedItems((prev) => prev.filter((_, idx) => idx !== index));
    if (editingIndex === index) {
      resetForm();
    }
  };

  const resetForm = () => {
    setItemForm({
      srNo: selectedItems.length + 1,
      lrNo: '',
      date: getTodayDateString(),
      pkg: '',
      invoiceNo: '',
      ctTo: '',
      deliveryPersonName: '',
      consignorName: '',
      consigneeName: '',
      toPayAmount: '',
      tbbAmount: '',
      paidAmount: '',
    });
    setEditingIndex(null);
  };

  const handleAddOrUpdateLR = (e) => {
    if (e) e.preventDefault();
    if (editingIndex === null) return;

    const updated = [...selectedItems];
    updated[editingIndex] = {
      ...updated[editingIndex],
      lrNo: itemForm.lrNo,
      pkg: Number(itemForm.pkg) || 1,
      invoiceNo: itemForm.invoiceNo,
      ctTo: itemForm.ctTo,
      deliveryPersonName: itemForm.deliveryPersonName,
      consignorName: itemForm.consignorName,
      consigneeName: itemForm.consigneeName,
      toPayAmount: Number(itemForm.toPayAmount) || 0,
      tbbAmount: Number(itemForm.tbbAmount) || 0,
      paidAmount: Number(itemForm.paidAmount) || 0,
    };
    setSelectedItems(updated);
    resetForm();
  };

  const handleDirectItemAmountChange = (index, field, value) => {
    setSelectedItems((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          [field]: value,
        };
      }
      return updated;
    });
  };

  // Quick Add Master
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
      newItem = { name: val, phone: '9800000000', vehicleType: 'Bike/Van' };
    }

    handleAddMaster(quickAddModal.category, newItem);

    if (quickAddModal.isHeader) {
      setHeaderData((prev) => ({ ...prev, [quickAddModal.targetField]: val }));
    } else {
      setItemForm((prev) => ({ ...prev, [quickAddModal.targetField]: val }));
    }

    setQuickAddModal({ isOpen: false, category: '', title: '', targetField: '', isHeader: true });
  };

  const totalQty = selectedItems.reduce((sum, item) => sum + (Number(item.pkg) || 0), 0);
  const totalToPay = selectedItems.reduce((sum, item) => sum + (Number(item.toPayAmount) || 0), 0);
  const totalTbb = selectedItems.reduce((sum, item) => sum + (Number(item.tbbAmount) || 0), 0);
  const totalPaid = selectedItems.reduce((sum, item) => sum + (Number(item.paidAmount) || 0), 0);

  // Submit Final Outward Manifest
  const handleFinalSubmit = (shouldPrint = false) => {
    setError('');
    setSuccess('');

    if (selectedItems.length === 0) {
      setError('Please select at least one pending LR to dispatch.');
      return;
    }

    const finalItems = selectedItems.map((item, idx) => ({
      ...item,
      srNo: idx + 1,
      inwardItemId: item.inwardItemId || item.id,
      pkg: Number(item.pkg) || 1,
      toPayAmount: Number(item.toPayAmount) || 0,
      tbbAmount: Number(item.tbbAmount) || 0,
      paidAmount: Number(item.paidAmount) || 0,
      deliveryPersonName: item.deliveryPersonName || headerData.deliveryPersonName || '',
    }));

    const submitHeader = {
      ...headerData,
      outwardNo: headerData.outwardNo,
      date: headerData.date,
      itemsCount: finalItems.length,
    };

    if (shouldPrint) {
      if (editingOutwardId || editOutwardData) {
        try {
          handleUpdateFullOutward(
            editingOutwardId || editOutwardData?.outwardNo,
            submitHeader,
            finalItems,
            user?.displayName || 'Operator'
          );
        } catch (err) {
          // Proceed with printing current form data
        }
      }

      printRecordDetails({
        title: `Outward Dispatch Memo #${submitHeader.outwardNo}`,
        fields: [
          { label: 'Outward No.', value: submitHeader.outwardNo },
          { label: 'Date', value: formatDate(submitHeader.date) },
          { label: 'Vehicle No.', value: submitHeader.vehicleNo || '-' },
          { label: 'Transporter', value: submitHeader.transporterName || '-' },
          { label: 'Driver Name', value: submitHeader.driverName || '-' },
          { label: 'Delivery Person', value: submitHeader.deliveryPersonName || '-' },
          { label: 'Origin Station', value: submitHeader.fromStation || '-' },
          { label: 'Memo No.', value: submitHeader.memoNo || '-' },
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
      if (editingOutwardId || editOutwardData) {
        handleUpdateFullOutward(
          editingOutwardId || editOutwardData?.outwardNo,
          submitHeader,
          finalItems,
          user?.displayName || 'Operator'
        );
        setSuccess(`Outward Receipt #${submitHeader.outwardNo} updated successfully!`);
      } else {
        handleCreateOutward(submitHeader, finalItems, user?.displayName || 'Operator');
        setSuccess(`Outward Receipt #${submitHeader.outwardNo} saved successfully! Status updated to DELIVERED.`);
      }

      setTimeout(() => {
        if (location.state?.returnPath) {
          navigate(location.state.returnPath);
        } else {
          navigate('/all-entries', { state: { tab: location.state?.returnTab || 'outward_headers' } });
        }
      }, 300);
    } catch (err) {
      setError(err.message || 'Failed to save Outward transaction.');
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
              <span>GATE-02 DISPATCH DOCK &amp; LINEHAUL OUTWARD</span>
              <span className="text-blue-200/50">•</span>
              <span className="text-blue-100 font-mono">
                {editingOutwardId ? `EDITING OUT #${headerData.outwardNo}` : 'NEW DISPATCH'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
              {editingOutwardId ? `Update Outward Manifest #${headerData.outwardNo}` : 'Process Outward Dispatch'}
            </h1>
            <p className="text-xs text-blue-100/80 mt-1 max-w-xl font-medium">
              Select verified pending stock consignments from the godown hub to dispatch with outgoing vehicles and delivery personnel.
            </p>
          </div>

          <div className="flex items-center space-x-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => navigate('/all-entries', { state: { tab: 'outward_headers' } })}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-xl text-xs font-bold transition-all border border-white/20 flex items-center space-x-2 shadow-xs cursor-pointer"
            >
              <Layers className="w-4 h-4 text-orange-400" />
              <span>Show All Outward</span>
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

      {/* HEADER SECTION: Outward Header Details */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-4 bg-[#1d4ed8] rounded-full" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              Outward Dispatch Memo Header
            </h3>
          </div>
          <span className="text-[11px] font-bold text-slate-400">
            Outward Memo: <span className="font-mono text-[#1d4ed8] font-black">{headerData.outwardNo}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
              Outward No.
            </label>
            <input
              type="text"
              name="outwardNo"
              value={headerData.outwardNo}
              onChange={handleHeaderChange}
              className="w-full px-3 py-2 border border-slate-200 bg-slate-50/70 rounded-xl text-xs font-black text-[#1d4ed8] font-mono focus:ring-2 focus:ring-[#1d4ed8] outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
              Dispatch Date *
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
            <label className="block text-[11px] font-extrabold text-emerald-800 uppercase mb-1.5">
              Delivery Person *
            </label>
            <div className="flex items-center space-x-1.5 min-w-0">
              <EditableCombobox
                name="deliveryPersonName"
                value={headerData.deliveryPersonName}
                onChange={handleHeaderChange}
                options={masters.deliveryPersons}
                placeholder=""
                className="px-3 py-2 border border-emerald-200 bg-emerald-50/50 rounded-xl text-xs font-extrabold text-emerald-900 focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => handleOpenQuickAdd('deliveryPersons', 'Delivery Person', 'deliveryPersonName', true)}
                className="px-2.5 py-2 bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 rounded-xl font-black text-xs text-emerald-900 transition-colors shadow-2xs flex-shrink-0 cursor-pointer"
                title="Quick Add Delivery Person"
              >
                +
              </button>
            </div>
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
              Memo No.
            </label>
            <input
              type="text"
              name="memoNo"
              value={headerData.memoNo}
              onChange={handleHeaderChange}
              placeholder="e.g. OUT-MM-01"
              className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-800 uppercase focus:ring-2 focus:ring-[#1d4ed8] outline-none placeholder-slate-400"
            />
          </div>
        </div>
      </div>

      {/* EMBEDDED PENDING STOCK GODOWN PICKER */}
      <div className="bg-white rounded-2xl shadow-2xs border border-slate-200 p-5 space-y-4">
        {/* Search Bar & Select All Filtered Button */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search incoming Memo No, Consignor, Consignee or LR No to select..."
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#1d4ed8] focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 transition-all outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleSelectAllFiltered}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#1d4ed8] font-extrabold text-xs rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer flex-shrink-0 shadow-2xs"
          >
            <span>Select All Filtered</span>
          </button>
        </div>

        {/* Header Title */}
        <div className="flex items-center space-x-2 pt-0.5">
          <div className="w-6 h-6 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 flex-shrink-0">
            <PackageCheck className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
            Select Pending LRs in Godown to Dispatch ({filteredPendingStock.length} Available)
          </h3>
        </div>

        {/* Scrollable Card List */}
        <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
          {filteredPendingStock.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-semibold text-xs border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              No pending godown stock LRs matching search term.
            </div>
          ) : (
            filteredPendingStock.map((item) => {
              const isSelected = selectedItems.some((s) => s.id === item.id);
              const amt = Number(item.paidAmount) > 0 ? item.paidAmount : Number(item.tbbAmount) > 0 ? item.tbbAmount : (item.toPayAmount || 0);
              const payLabel = Number(item.paidAmount) > 0 ? 'Paid' : Number(item.tbbAmount) > 0 ? 'TBB' : 'ToPay';

              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelectPendingLR(item)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                    isSelected
                      ? 'border-[#1d4ed8] bg-blue-50/50 shadow-2xs'
                      : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-[#1d4ed8] text-xs sm:text-sm tracking-tight">
                        {item.lrNo}
                      </span>
                      <span className="bg-slate-100 text-slate-700 font-extrabold text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">
                        {item.ctTo || item.destinationStation || 'SANGLI'}
                      </span>
                      {item.memoNo && (
                        <span className="bg-slate-100 text-slate-500 font-mono text-[10px] px-1.5 py-0.5 rounded">
                          {item.memoNo}
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-bold text-slate-700 uppercase tracking-tight">
                      {item.consignorName || 'SELF'} &rarr; {item.consigneeName || 'RECEIVER'}
                    </div>

                    <div className="text-xs text-slate-400 font-semibold space-x-2">
                      <span>{item.pkg || 1} Pkgs</span>
                      <span>&bull;</span>
                      <span className={payLabel === 'ToPay' ? 'text-amber-700 font-bold' : 'text-slate-600'}>
                        {formatCurrency(amt)} ({payLabel})
                      </span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 ml-4">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-[#1d4ed8] border-2 border-[#1d4ed8] text-white font-black text-xs shadow-xs'
                          : 'border-2 border-slate-300 bg-white group-hover:border-slate-400'
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

      {/* STAGED DISPATCH GRID TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              Selected LRs Scheduled for Dispatch
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-[#1d4ed8]">
              {selectedItems.length} LRs Selected
            </span>
          </div>
          <span className="text-xs text-slate-400">Amounts are editable before final outward recording</span>
        </div>

        <div className="overflow-x-auto min-h-[200px] max-h-[380px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0d2358] text-white sticky top-0 z-10">
              <tr className="text-[10px] font-extrabold uppercase tracking-wider">
                <th className="py-2.5 px-3 border-r border-blue-900/60 w-12 text-center">SR</th>
                <th className="py-2.5 px-3 border-r border-blue-900/60">LR NO.</th>
                <th className="py-2.5 px-3 border-r border-blue-900/60">INDATE</th>
                <th className="py-2.5 px-3 border-r border-blue-900/60 text-right">PKG</th>
                <th className="py-2.5 px-3 border-r border-blue-900/60">INV NO.</th>
                <th className="py-2.5 px-3 border-r border-blue-900/60">DESTINATION</th>
                <th className="py-2.5 px-3 border-r border-blue-900/60">DEL PERSON</th>
                <th className="py-2.5 px-3 border-r border-blue-900/60">CONSIGNOR</th>
                <th className="py-2.5 px-3 border-r border-blue-900/60">CONSIGNEE</th>
                <th className="py-2.5 px-3 border-r border-blue-900/60 text-right">TO PAY</th>
                <th className="py-2.5 px-3 border-r border-blue-900/60 text-right">T.B.B.</th>
                <th className="py-2.5 px-3 border-r border-blue-900/60 text-right">PAID</th>
                <th className="py-2.5 px-3 text-center w-20">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {selectedItems.length === 0 ? (
                <tr>
                  <td colSpan="13" className="py-12 text-center text-slate-400 font-medium">
                    No LRs selected for dispatch yet. Select LRs from godown list above.
                  </td>
                </tr>
              ) : (
                selectedItems.map((posItem, idx) => {
                  const isLiveRow = editingIndex === idx || idx === selectedItems.length - 1;
                  const item =
                    editingIndex === idx
                      ? {
                          ...posItem,
                          lrNo: itemForm.lrNo || posItem.lrNo,
                          inwardDate: itemForm.date || posItem.inwardDate || posItem.date,
                          pkg: itemForm.pkg !== '' ? itemForm.pkg : posItem.pkg,
                          invoiceNo: itemForm.invoiceNo,
                          ctTo: itemForm.ctTo,
                          deliveryPersonName: itemForm.deliveryPersonName,
                          consignorName: itemForm.consignorName,
                          consigneeName: itemForm.consigneeName,
                          toPayAmount: itemForm.toPayAmount || 0,
                          tbbAmount: itemForm.tbbAmount || 0,
                          paidAmount: itemForm.paidAmount || 0,
                        }
                      : posItem;
                  return (
                    <tr
                      key={item.id || idx}
                      className={`transition-colors ${
                        isLiveRow
                          ? 'bg-sky-50/70 border-l-4 border-[#1d4ed8]'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2 px-3 border-r border-slate-100 text-center font-bold text-slate-600">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-100 font-extrabold text-[#1d4ed8]">
                        <div className="flex items-center gap-1.5">
                          <span>{item.lrNo}</span>
                          {isLiveRow && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-100 text-[#1d4ed8] border border-blue-200">
                              Live
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 border-r border-slate-100 text-slate-600">
                        {formatDate(item.inwardDate || item.date)}
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
                      <td className="py-2 px-3 border-r border-slate-100 font-semibold text-emerald-800">
                        {item.deliveryPersonName || itemForm.deliveryPersonName || '-'}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-100 text-slate-600 truncate max-w-[130px]">
                        {item.consignorName || '-'}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-100 text-slate-600 truncate max-w-[130px]">
                        {item.consigneeName || '-'}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-100 text-right">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.toPayAmount !== undefined && item.toPayAmount !== null ? item.toPayAmount : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                              handleDirectItemAmountChange(idx, 'toPayAmount', val);
                            }
                          }}
                          className="w-20 px-2 py-1 text-right font-black text-amber-900 bg-amber-50/70 border border-amber-200 rounded-lg focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none text-xs"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="py-1 px-2 border-r border-slate-100 text-right">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.tbbAmount !== undefined && item.tbbAmount !== null ? item.tbbAmount : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                              handleDirectItemAmountChange(idx, 'tbbAmount', val);
                            }
                          }}
                          className="w-20 px-2 py-1 text-right font-black text-sky-900 bg-sky-50/70 border border-sky-200 rounded-lg focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none text-xs"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="py-1 px-2 border-r border-slate-100 text-right">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.paidAmount !== undefined && item.paidAmount !== null ? item.paidAmount : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                              handleDirectItemAmountChange(idx, 'paidAmount', val);
                            }
                          }}
                          className="w-20 px-2 py-1 text-right font-black text-emerald-900 bg-emerald-50/70 border border-emerald-200 rounded-lg focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        {editingIndex === idx ? (
                          <span className="text-[10px] font-semibold text-sky-600 italic">Typing...</span>
                        ) : (
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              onClick={() => handleEditItem(idx)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                              title="Edit Dispatch LR"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(idx)}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                              title="Remove Dispatch LR"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
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
            className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-black text-xs rounded-xl shadow-lg shadow-orange-500/25 flex items-center space-x-1.5 cursor-pointer transition-all active:scale-[0.98]"
          >
            <Save className="w-4 h-4" />
            <span>{editingOutwardId ? 'Update Outward' : 'Record Outward & Dispatch'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleFinalSubmit(true)}
            className="px-5 py-2.5 bg-[#0b2545] hover:bg-[#133e87] text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer transition-all active:scale-[0.98]"
          >
            <Printer className="w-4 h-4 text-orange-400" />
            <span>Save &amp; Print Memo</span>
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

      {/* EDIT DISPATCH LR MODAL */}
      <Modal
        isOpen={editingIndex !== null}
        onClose={() => resetForm()}
        title={`Edit Dispatch LR #${itemForm.lrNo || ''}`}
      >
        <form onSubmit={handleAddOrUpdateLR} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">LR No. *</label>
              <input
                type="text"
                name="lrNo"
                value={itemForm.lrNo}
                onChange={handleItemChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-sky-700"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">PKG Qty *</label>
              <input
                type="text"
                inputMode="numeric"
                name="pkg"
                value={itemForm.pkg}
                onChange={handleItemChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Invoice No.</label>
              <input
                type="text"
                name="invoiceNo"
                value={itemForm.invoiceNo}
                onChange={handleItemChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">CT To (Station)</label>
              <EditableCombobox
                name="ctTo"
                value={itemForm.ctTo}
                onChange={handleItemChange}
                options={masters.stations}
                placeholder=""
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Delivery Person</label>
              <EditableCombobox
                name="deliveryPersonName"
                value={itemForm.deliveryPersonName}
                onChange={handleItemChange}
                options={masters.deliveryPersons}
                placeholder=""
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Consignor</label>
              <input
                type="text"
                name="consignorName"
                value={itemForm.consignorName}
                onChange={handleItemChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Consignee</label>
              <input
                type="text"
                name="consigneeName"
                value={itemForm.consigneeName}
                onChange={handleItemChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-700 uppercase mb-1">To Pay (₹)</label>
              <input
                type="text"
                inputMode="decimal"
                name="toPayAmount"
                value={itemForm.toPayAmount}
                onChange={handleItemChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-amber-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-sky-700 uppercase mb-1">T.B.B (₹)</label>
              <input
                type="text"
                inputMode="decimal"
                name="tbbAmount"
                value={itemForm.tbbAmount}
                onChange={handleItemChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-sky-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">Paid (₹)</label>
              <input
                type="text"
                inputMode="decimal"
                name="paidAmount"
                value={itemForm.paidAmount}
                onChange={handleItemChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-emerald-800"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => resetForm()}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#1d4ed8] hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer"
            >
              Update LR
            </button>
          </div>
        </form>
      </Modal>

      {/* QUICK ADD MODAL FOR [...] BUTTONS */}
      <Modal
        isOpen={quickAddModal.isOpen}
        onClose={() => setQuickAddModal({ isOpen: false, category: '', title: '', targetField: '', isHeader: true })}
        title={`Quick Add New ${quickAddModal.title}`}
      >
        <form onSubmit={handleSaveQuickAdd} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Enter {quickAddModal.title} Name / Details: *
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
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#1d4ed8] hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer"
            >
              Save &amp; Select
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
