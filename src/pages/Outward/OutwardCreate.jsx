import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { Save, Printer, ArrowLeft, AlertCircle, Plus, Trash2, Edit2, RotateCcw, PackageCheck, Eye, X, Search } from 'lucide-react';
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
    transporterName: masters.transporters[0]?.name || '',
    fromStation: masters.stations[0]?.name || 'SANGLI',
    vehicleNo: masters.vehicles[0]?.vehicleNo || '',
    deliveryPersonName: masters.deliveryPersons[0]?.name || '',
    driverName: masters.drivers[0]?.name || '',
    memoNo: '',
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

  useEffect(() => {
    focusLRNoInput();
  }, []);

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
        deliveryPersonName: headerData.deliveryPersonName || masters.deliveryPersons[0]?.name || '',
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

  // Auto-load items passed from Pending Stock page or Edit Mode from All Entries
  useEffect(() => {
    if (location.state?.editOutward) {
      const editData = location.state.editOutward;
      setHeaderData({
        outwardNo: editData.outwardNo || '',
        date: editData.date || editData.outwardDate || getTodayDateString(),
        transporterName: editData.transporterName || masters.transporters[0]?.name || '',
        fromStation: editData.from || editData.fromStation || masters.stations[0]?.name || 'SANGLI',
        vehicleNo: editData.vehicleNo || masters.vehicles[0]?.vehicleNo || '',
        deliveryPersonName:
          editData.deliveryPersonName ||
          editData.items?.[0]?.deliveryPersonName ||
          masters.deliveryPersons[0]?.name ||
          '',
        driverName: editData.driverName || masters.drivers[0]?.name || '',
        memoNo: editData.memoNo || '',
      });

      const items = (editData.items || []).map((item, idx) => ({
        ...item,
        id: item.inwardItemId || item.id,
        inwardItemId: item.inwardItemId || item.id,
        srNo: idx + 1,
        lrNo: String(item.lrNo ?? ''),
        inwardDate: item.inwardDate || item.date || getTodayDateString(),
        date: item.inwardDate || item.date || getTodayDateString(),
        pkg: Number(item.pkg) || 1,
        invoiceNo: item.invoiceNo || '',
        ctTo: item.ctTo || masters.stations[0]?.name || '',
        deliveryPersonName:
          item.deliveryPersonName ||
          editData.deliveryPersonName ||
          masters.deliveryPersons[0]?.name ||
          '',
        consignorName: item.consignorName || '',
        consigneeName: item.consigneeName || '',
        toPayAmount: Number(item.toPayAmount) || 0,
        tbbAmount: Number(item.tbbAmount) || 0,
        paidAmount: Number(item.paidAmount) || 0,
      }));
      setSelectedItems(items);
    } else if (location.state?.selectedPendingItems && location.state.selectedPendingItems.length > 0) {
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
    if (name === 'deliveryPersonName') {
      setItemForm((prev) => ({ ...prev, deliveryPersonName: value }));
      setSelectedItems((prev) =>
        prev.map((item) => ({ ...item, deliveryPersonName: value }))
      );
    }
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
      if (quickAddModal.targetField === 'deliveryPersonName') {
        setItemForm((prev) => ({ ...prev, deliveryPersonName: val }));
        setSelectedItems((prev) =>
          prev.map((item) => ({ ...item, deliveryPersonName: val }))
        );
      }
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
        deliveryPersonName: headerData.deliveryPersonName || masters.deliveryPersons[0]?.name || 'SANTOSH SAI RAM PALUS',
      };
      setSelectedItems((prev) => [...prev, newItem]);
    }
  };

  // Manual Add or Update LR item
  const handleAddOrUpdateLR = (e) => {
    if (e) e.preventDefault();
    setError('');

    const cleanLR = String(itemForm?.lrNo ?? '').trim();
    if (!cleanLR) {
      setError('Please enter a valid LR No.');
      focusLRNoInput();
      return;
    }

    const existingItem = editingIndex !== null ? selectedItems[editingIndex] : null;
    const newItem = {
      ...(existingItem || {}),
      id: existingItem?.id || `out-item-${Date.now()}`,
      inwardItemId: existingItem?.inwardItemId || existingItem?.id,
      srNo: existingItem?.srNo ?? selectedItems.length + 1,
      lrNo: cleanLR,
      inwardDate: itemForm.date || getTodayDateString(),
      date: itemForm.date || getTodayDateString(),
      pkg: Number(itemForm.pkg) || 1,
      invoiceNo: itemForm.invoiceNo || '',
      ctTo: itemForm.ctTo || masters.stations[0]?.name || '',
      deliveryPersonName: itemForm.deliveryPersonName || headerData.deliveryPersonName || masters.deliveryPersons[0]?.name || '',
      consignorName: itemForm.consignorName || '',
      consigneeName: itemForm.consigneeName || '',
      toPayAmount: Number(itemForm.toPayAmount) || 0,
      tbbAmount: Number(itemForm.tbbAmount) || 0,
      paidAmount: Number(itemForm.paidAmount) || 0,
    };

    let nextItems;
    if (editingIndex !== null && editingIndex < selectedItems.length) {
      nextItems = [...selectedItems];
      nextItems[editingIndex] = newItem;
      setSelectedItems(nextItems);
      setEditingIndex(null);
    } else {
      nextItems = [...selectedItems, newItem];
      setSelectedItems(nextItems);
      setEditingIndex(null);
    }

    if ((editingOutwardId || editOutwardData) && nextItems.length > 0) {
      try {
        handleUpdateFullOutward(
          editingOutwardId || editOutwardData?.outwardNo,
          headerData,
          nextItems,
          user?.displayName || 'Operator'
        );
      } catch (err) {
        // Ignore transient validation error until final save
      }
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
      consignorName: '',
      consigneeName: '',
      toPayAmount: '',
      tbbAmount: '',
      paidAmount: '',
    });
    setEditingIndex(null);
  };

  const handleEditItem = (index) => {
    const item = selectedItems[index];
    if (!item) return;
    setItemForm({
      srNo: item.srNo ?? index + 1,
      lrNo: String(item.lrNo ?? ''),
      date: item.inwardDate || item.date || getTodayDateString(),
      pkg: item.pkg !== undefined && item.pkg !== null ? String(item.pkg) : '',
      invoiceNo: String(item.invoiceNo ?? ''),
      ctTo: item.ctTo || masters.stations[0]?.name || '',
      deliveryPersonName: item.deliveryPersonName || headerData.deliveryPersonName || masters.deliveryPersons[0]?.name || '',
      consignorName: String(item.consignorName ?? ''),
      consigneeName: String(item.consigneeName ?? ''),
      toPayAmount: item.toPayAmount ? String(item.toPayAmount) : '',
      tbbAmount: item.tbbAmount ? String(item.tbbAmount) : '',
      paidAmount: item.paidAmount ? String(item.paidAmount) : '',
    });
    setEditingIndex(index);
  };

  const handleDeleteItem = (index) => {
    const filtered = selectedItems.filter((_, idx) => idx !== index);
    const renumbered = filtered.map((item, idx) => ({ ...item, srNo: idx + 1 }));
    setSelectedItems(renumbered);
    if (editingIndex === index) {
      resetForm();
    } else if (editingIndex !== null && index < editingIndex) {
      setEditingIndex(editingIndex - 1);
    }
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
    const cleanLR = String(itemForm?.lrNo ?? '').trim();
    if (editingIndex !== null && finalItems[editingIndex] && cleanLR) {
      const existingItem = finalItems[editingIndex];
      finalItems[editingIndex] = {
        ...existingItem,
        lrNo: cleanLR,
        inwardDate: itemForm.date || existingItem.inwardDate || existingItem.date,
        date: itemForm.date || existingItem.date || existingItem.inwardDate,
        pkg: Number(itemForm.pkg) || 1,
        invoiceNo: itemForm.invoiceNo || '',
        ctTo: itemForm.ctTo || existingItem.ctTo,
        deliveryPersonName: itemForm.deliveryPersonName || headerData.deliveryPersonName || existingItem.deliveryPersonName,
        consignorName: itemForm.consignorName || '',
        consigneeName: itemForm.consigneeName || '',
        toPayAmount: Number(itemForm.toPayAmount) || 0,
        tbbAmount: Number(itemForm.tbbAmount) || 0,
        paidAmount: Number(itemForm.paidAmount) || 0,
      };
    } else if (finalItems.length === 0 && cleanLR) {
      finalItems.push({
        id: `out-item-${Date.now()}`,
        srNo: 1,
        lrNo: cleanLR,
        inwardDate: itemForm.date,
        date: itemForm.date,
        pkg: Number(itemForm.pkg) || 1,
        invoiceNo: itemForm.invoiceNo || '',
        ctTo: itemForm.ctTo,
        deliveryPersonName: itemForm.deliveryPersonName || headerData.deliveryPersonName,
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

    if (shouldPrint) {
      if (editingOutwardId || editOutwardData) {
        try {
          handleUpdateFullOutward(
            editingOutwardId || editOutwardData?.outwardNo,
            headerData,
            finalItems,
            user?.displayName || 'Operator'
          );
        } catch (err) {
          // Proceed with printing current form data
        }
      }

      const printToPay = finalItems.reduce((sum, item) => sum + (Number(item.toPayAmount) || 0), 0);
      const printTbb = finalItems.reduce((sum, item) => sum + (Number(item.tbbAmount) || 0), 0);
      const printPaid = finalItems.reduce((sum, item) => sum + (Number(item.paidAmount) || 0), 0);

      printRecordDetails({
        title: `Outward Receipt Details #${headerData.outwardNo}`,
        fields: [
          { label: 'Outward No.', value: headerData.outwardNo },
          { label: 'Date', value: formatDate(headerData.date) },
          { label: 'Vehicle No.', value: headerData.vehicleNo || '-' },
          { label: 'Delivery Person', value: headerData.deliveryPersonName || '-' },
          { label: 'Driver Name', value: headerData.driverName || '-' },
          { label: 'From Station', value: headerData.fromStation || '-' },
          { label: 'Memo No.', value: headerData.memoNo || '-' },
          {
            label: 'Total Freight',
            value: formatCurrency(printToPay + printTbb + printPaid),
          },
        ],
        items: finalItems,
        showDeliveryPerson: true,
      });
      return;
    }

    try {
      if (editingOutwardId || editOutwardData) {
        handleUpdateFullOutward(
          editingOutwardId || editOutwardData?.outwardNo,
          headerData,
          finalItems,
          user?.displayName || 'Operator'
        );
        setSuccess(`Outward Receipt #${headerData.outwardNo} updated successfully!`);
      } else {
        handleCreateOutward(headerData, finalItems, user?.displayName || 'Operator');
        setSuccess(`Outward Receipt #${headerData.outwardNo} saved successfully! Status updated to DELIVERED.`);
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
    <div className="space-y-4 text-slate-800 max-w-full">
      {/* Top Header Title & Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            {editingOutwardId ? `Edit Outward Details (#${headerData.outwardNo})` : 'Outward Details'}
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {editingOutwardId
              ? 'Update outward dispatch manifest and delivery entries'
              : 'Record outward dispatch manifest and delivery entries'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/all-entries', { state: { tab: 'outward_headers' } })}
          className="inline-flex items-center justify-center bg-sky-600 hover:bg-sky-700 text-white font-extrabold px-6 py-2.5 rounded-xl text-sm shadow-md transition-all self-end sm:self-auto cursor-pointer"
        >
          <span>Show All Outward</span>
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
            <label className="block text-[11px] font-black text-emerald-800 uppercase mb-1">
              DELIVERY PERSON *
            </label>
            <div className="flex items-center space-x-1 min-w-0">
              <select
                name="deliveryPersonName"
                value={headerData.deliveryPersonName}
                onChange={handleHeaderChange}
                className="flex-1 px-2.5 py-1.5 border border-emerald-300 bg-emerald-50 rounded text-xs font-extrabold text-emerald-900 focus:ring-1 focus:ring-emerald-500 min-w-0 truncate"
              >
                {masters.deliveryPersons.map((dp) => (
                  <option key={dp.id} value={dp.name}>
                    {dp.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleOpenQuickAdd('deliveryPersons', 'Delivery Person', 'deliveryPersonName', true)}
                className="px-2 py-1.5 bg-emerald-200 hover:bg-emerald-300 border border-emerald-300 rounded font-black text-xs text-emerald-900 transition-colors shadow-2xs flex-shrink-0 cursor-pointer"
                title="Quick Add Delivery Person"
              >
                ...
              </button>
            </div>
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

          <div>
            <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
              MEMO NO.
            </label>
            <input
              type="text"
              name="memoNo"
              value={headerData.memoNo}
              onChange={handleHeaderChange}
              placeholder="MEMO NO."
              className="w-full px-2.5 py-1.5 border border-slate-300 bg-white rounded text-xs font-bold text-slate-800 focus:ring-1 focus:ring-sky-500 uppercase"
            />
          </div>
        </div>
      </fieldset>



      {/* EMBEDDED PENDING STOCK GODOWN PICKER (Matching Image 1 & Image 2 design) */}
      <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/90 p-4 space-y-3.5">
        {/* Search Bar & Select All Filtered Button */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-indigo-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search incoming Memo No, or LR No to select..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 border border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleSelectAllFiltered}
            className="w-full sm:w-auto px-5 py-2.5 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer flex-shrink-0 shadow-2xs"
          >
            <span>Select All Filtered</span>
          </button>
        </div>

        {/* Header Title with Orange Icon */}
        <div className="flex items-center space-x-2 pt-0.5">
          <div className="w-5 h-5 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 flex-shrink-0">
            <PackageCheck className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
            SELECT PENDING LRS IN GODOWN TO DISPATCH ({filteredPendingStock.length} AVAILABLE)
          </h3>
        </div>

        {/* Scrollable Card List */}
        <div className="max-h-72 overflow-y-auto space-y-2.5 no-scrollbar pr-1">
          {filteredPendingStock.length === 0 ? (
            <div className="p-6 text-center text-slate-400 font-bold text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              No pending stock LRs matching search term.
            </div>
          ) : (
            filteredPendingStock.map((item) => {
              const isSelected = selectedItems.some((s) => s.id === item.id);

              let amt = 0;
              let payLabel = 'ToPay';
              if (Number(item.paidAmount) > 0) {
                amt = item.paidAmount;
                payLabel = 'Paid';
              } else if (Number(item.tbbAmount) > 0) {
                amt = item.tbbAmount;
                payLabel = 'TBB';
              } else {
                amt = item.toPayAmount || 0;
                payLabel = 'ToPay';
              }

              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelectPendingLR(item)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/40 shadow-2xs'
                      : 'border-slate-200/90 bg-white hover:border-indigo-300 hover:bg-slate-50/50'
                  }`}
                >
                  {/* Left Content (3 Stacked Lines) */}
                  <div className="space-y-1">
                    {/* Line 1: LR No + Station Badge */}
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-[#1e295b] text-xs sm:text-sm tracking-tight">
                        {item.lrNo}
                      </span>
                      <span className="bg-slate-200 text-slate-700 font-black text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">
                        {item.ctTo || item.destinationStation || 'SANGLI'}
                      </span>
                    </div>

                    {/* Line 2: CONSIGNOR ➔ CONSIGNEE */}
                    <div className="text-xs font-black text-slate-600 uppercase tracking-tight">
                      {item.consignorName || 'SELF'} &rarr; {item.consigneeName || 'RECEIVER'}
                    </div>

                    {/* Line 3: Pkgs & Amount (Payment Status) */}
                    <div className="text-xs text-slate-400 font-bold space-x-2">
                      <span>{item.pkg || 1} Pkgs</span>
                      <span>&bull;</span>
                      <span>{formatCurrency(amt)} ({payLabel})</span>
                    </div>
                  </div>

                  {/* Right Side Circle Radio Checkbox */}
                  <div className="flex-shrink-0 ml-4">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-indigo-600 border-2 border-indigo-600 text-white font-black text-xs shadow-xs'
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

      {/* STAGED DISPATCH GRID TABLE (LIMRA Outward Table with DelPerson) */}
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
                <th className="py-2 px-2.5 border-r border-slate-700">DEL PERSON</th>
                <th className="py-2 px-2.5 border-r border-slate-700">CONSIGNER</th>
                <th className="py-2 px-2.5 border-r border-slate-700">CONSIGNEE</th>
                <th className="py-2 px-2.5 border-r border-slate-700 text-right">TO PAY</th>
                <th className="py-2 px-2.5 border-r border-slate-700 text-right">TBB</th>
                <th className="py-2 px-2.5 border-r border-slate-700 text-right">PAID</th>
                <th className="py-2 px-2.5 text-center w-24">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {selectedItems.length === 0 ? (
                <tr>
                  <td colSpan="13" className="py-12 text-center text-slate-400 font-medium">
                    No LRs selected for dispatch yet. Select LRs from godown list above or enter LR details.
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
                          ? 'bg-sky-50/90 border-l-4 border-sky-500 animate-pulse'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-center font-bold text-slate-700">
                        {idx + 1}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 font-extrabold text-sky-800">
                        <div className="flex items-center gap-1.5">
                          <span>{item.lrNo}</span>
                          {isLiveRow && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700 border border-sky-300">
                              <Eye className="w-2.5 h-2.5 mr-0.5" /> Live
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-slate-700">
                        {formatDate(item.inwardDate || item.date)}
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
                      <td className="py-1.5 px-2.5 border-r border-slate-200 font-semibold text-emerald-800">
                        {item.deliveryPersonName || itemForm.deliveryPersonName || '-'}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-slate-700">
                        {item.consignorName || '-'}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-slate-700">
                        {item.consigneeName || '-'}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-right font-semibold text-slate-800">
                        {Number(item.toPayAmount || 0).toFixed(2)}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-right font-semibold text-slate-800">
                        {Number(item.tbbAmount || 0).toFixed(2)}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-right font-semibold text-slate-800">
                        {Number(item.paidAmount || 0).toFixed(2)}
                      </td>
                      <td className="py-1.5 px-2.5 text-center">
                        {editingIndex === idx ? (
                          <span className="text-[10px] font-semibold text-sky-600 italic">Typing...</span>
                        ) : (
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              onClick={() => handleEditItem(idx)}
                              className="p-1 text-sky-600 hover:bg-sky-50 rounded cursor-pointer"
                              title="Edit Dispatch LR"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(idx)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
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

      {/* BOTTOM SUMMARY & ACTIONS (LIMRA Footer Controls - Single Clean Line) */}
      <div className="bg-slate-200/90 rounded-xl border border-slate-300 p-3 flex flex-col lg:flex-row items-center justify-between gap-3 shadow-2xs">
        {/* Left Action Buttons (Save, Print) */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => handleFinalSubmit(false)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded shadow-xs flex items-center cursor-pointer"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {editingOutwardId ? 'Update Outward' : 'Save'}
          </button>

          <button
            type="button"
            onClick={() => handleFinalSubmit(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded shadow-xs flex items-center cursor-pointer"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Print
          </button>
        </div>

        {/* Right Summary Totals (PKG, TO PAY, T.B.B, PAID) */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-black text-slate-800 w-full lg:w-auto justify-end">
          <div className="flex items-center space-x-1.5 bg-white px-3 py-1.5 rounded border border-slate-300 shadow-2xs">
            <span className="text-slate-600 uppercase text-[11px]">PKG:</span>
            <span className="text-slate-900 font-black text-xs">{totalQty}</span>
          </div>

          <div className="flex items-center space-x-1.5 bg-amber-50 px-3 py-1.5 rounded border border-amber-300 text-amber-900 shadow-2xs">
            <span className="text-amber-800 uppercase text-[11px]">TO PAY:</span>
            <span className="font-black text-xs">{formatCurrency(totalToPay)}</span>
          </div>

          <div className="flex items-center space-x-1.5 bg-sky-50 px-3 py-1.5 rounded border border-sky-300 text-sky-900 shadow-2xs">
            <span className="text-sky-800 uppercase text-[11px]">T.B.B:</span>
            <span className="font-black text-xs">{formatCurrency(totalTbb)}</span>
          </div>

          <div className="flex items-center space-x-1.5 bg-emerald-50 px-3 py-1.5 rounded border border-emerald-300 text-emerald-900 shadow-2xs">
            <span className="text-emerald-800 uppercase text-[11px]">PAID:</span>
            <span className="font-black text-xs">{formatCurrency(totalPaid)}</span>
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-sky-700"
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold"
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">CT To (Station)</label>
              <input
                type="text"
                name="ctTo"
                value={itemForm.ctTo}
                onChange={handleItemChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Delivery Person</label>
              <select
                name="deliveryPersonName"
                value={itemForm.deliveryPersonName}
                onChange={handleItemChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold"
              >
                {masters.deliveryPersons.map((dp) => (
                  <option key={dp.id} value={dp.name}>
                    {dp.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Consignor</label>
              <input
                type="text"
                name="consignorName"
                value={itemForm.consignorName}
                onChange={handleItemChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Consignee</label>
              <input
                type="text"
                name="consigneeName"
                value={itemForm.consigneeName}
                onChange={handleItemChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-amber-800"
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-sky-800"
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-emerald-800"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => resetForm()}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-xs shadow cursor-pointer"
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
