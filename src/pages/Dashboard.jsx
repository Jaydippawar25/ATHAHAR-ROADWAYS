import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDownLeft,
  PackageCheck,
  ArrowUpRight,
  PlusCircle,
  Search,
  X,
  Printer,
  Eye,
  CheckCircle2,
  RotateCw,
  Building2,
  Route,
  Wallet,
  Truck,
  User,
  Clock,
  MapPin,
  FileText,
  Layers,
  ExternalLink,
  AlertCircle,
  Calendar,
  Send,
} from 'lucide-react';
import { formatDate } from '../utils/dateUtils';
import { formatCurrency } from '../utils/numberUtils';
import { printRecordDetails, exportToExcel } from '../services/exportService';
import { Modal } from '../components/common/Modal';

export const Dashboard = () => {
  const {
    inwards,
    inwardItems,
    pendingStock,
    outwards,
    outwardItems,
    masters,
    cachedDashboardStats,
  } = useApp();
  const navigate = useNavigate();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStation, setSelectedStation] = useState('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [stockTab, setStockTab] = useState('all'); // 'all' | 'priority' | 'heavy'
  const [selectedStockIds, setSelectedStockIds] = useState([]);
  const [viewingItem, setViewingItem] = useState(null);
  const searchInputRef = useRef(null);

  // Keyboard shortcuts (Alt+N, Alt+O, Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        navigate('/inward/new');
      } else if (e.altKey && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        navigate('/outward/new');
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Instant Smart In-Memory Cached KPIs (Zero multi-pass re-calculations on route navigation)
  const {
    totalInwardCount,
    totalInwardPackages,
    totalPendingCount,
    totalPendingPackages,
    totalDispatchedCount,
    totalDispatchedPackages,
    totalToPayPending,
    pendingStockToPayCount,
    dispatchRate,
  } = cachedDashboardStats;

  const query = searchTerm.trim().toLowerCase();

  // Unified Master List of ALL LR Entries across Inward, Godown Pending Stock, Outward & Cross Stock-Out
  const combinedLREntries = useMemo(() => {
    const allLREntriesMap = new Map();

    // 1. Inward Items
    (inwardItems || []).forEach((item) => {
      const parentInw = (inwards || []).find(
        (inw) => inw.id === item.inwardId || inw.inwardNo === item.inwardNo
      );
      allLREntriesMap.set(item.id || item.lrNo, {
        ...item,
        transporterName: item.transporterName || parentInw?.transporterName || '-',
        fromStation: item.from || item.fromStation || parentInw?.from || parentInw?.fromStation || '-',
        inwardVehicleNo: item.vehicleNo || parentInw?.vehicleNo || '-',
        inwardDriverName: item.driverName || parentInw?.driverName || '-',
        memoNo: item.memoNo || parentInw?.memoNo || '-',
        inwardDate: item.date || item.inwardDate || parentInw?.date || '-',
        inwardNo: item.inwardNo || parentInw?.inwardNo || '-',
        outwardDate: item.outwardDate || '-',
        outwardNo: item.outwardNo || '-',
        outwardVehicleNo: '-',
        outwardDriverName: '-',
        deliveryPersonName: item.deliveryPersonName || '-',
        status: item.status || 'PENDING',
        recordCategory: 'inward_item',
      });
    });

    // 2. Outward Items (both standard godown dispatches and cross stock-out)
    (outwardItems || []).forEach((item) => {
      const parentOut = (outwards || []).find(
        (out) => out.id === item.outwardId || out.outwardNo === item.outwardNo
      );
      const isStockOut = Boolean(
        item.isCrossOutward ||
        parentOut?.isCrossOutward ||
        String(item.outwardNo || parentOut?.outwardNo || '').toUpperCase().startsWith('STOCK-OUT')
      );

      if (isStockOut) {
        // Cross Stock Out is a manual direct dispatch
        allLREntriesMap.set(`stockout-${item.id}`, {
          ...item,
          transporterName: item.transporterName || parentOut?.transporterName || '-',
          fromStation: item.from || parentOut?.from || '-',
          inwardVehicleNo: '-',
          inwardDriverName: '-',
          memoNo: item.memoNo || parentOut?.memoNo || '-',
          inwardDate: '-',
          inwardNo: '-',
          outwardDate: item.outwardDate || item.date || parentOut?.date || '-',
          outwardNo: item.outwardNo || parentOut?.outwardNo || '-',
          outwardVehicleNo: item.vehicleNo || parentOut?.vehicleNo || '-',
          outwardDriverName: item.driverName || parentOut?.driverName || '-',
          ownerName: item.ownerName || parentOut?.ownerName || '-',
          deliveryPersonName: item.deliveryPersonName || parentOut?.deliveryPersonName || '-',
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
            inwardNo: existing.inwardNo || item.inwardNo || '-',
            inwardVehicleNo: existing.inwardVehicleNo || existing.vehicleNo || '-',
            inwardDriverName: existing.inwardDriverName || existing.driverName || '-',
            outwardDate: item.outwardDate || item.date || parentOut?.date || '-',
            outwardNo: item.outwardNo || parentOut?.outwardNo || '-',
            outwardVehicleNo: item.vehicleNo || parentOut?.vehicleNo || '-',
            outwardDriverName: item.driverName || parentOut?.driverName || '-',
            ownerName: item.ownerName || parentOut?.ownerName || existing.ownerName || '-',
            deliveryPersonName: item.deliveryPersonName || parentOut?.deliveryPersonName || existing.deliveryPersonName || '-',
            status: 'DELIVERED',
            recordCategory: 'outward_item',
          });
        } else {
          allLREntriesMap.set(`outward-${item.id}`, {
            ...item,
            transporterName: item.transporterName || parentOut?.transporterName || '-',
            fromStation: item.from || parentOut?.from || '-',
            inwardVehicleNo: '-',
            inwardDriverName: '-',
            memoNo: item.memoNo || parentOut?.memoNo || '-',
            inwardDate: '-',
            inwardNo: '-',
            outwardDate: item.outwardDate || item.date || parentOut?.date || '-',
            outwardNo: item.outwardNo || parentOut?.outwardNo || '-',
            outwardVehicleNo: item.vehicleNo || parentOut?.vehicleNo || '-',
            outwardDriverName: item.driverName || parentOut?.driverName || '-',
            ownerName: item.ownerName || parentOut?.ownerName || '-',
            deliveryPersonName: item.deliveryPersonName || parentOut?.deliveryPersonName || '-',
            status: 'DELIVERED',
            recordCategory: 'outward_item',
          });
        }
      }
    });

    return Array.from(allLREntriesMap.values());
  }, [inwardItems, inwards, outwardItems, outwards]);

  // Universal LR Search: Searches ANY LR across Inward, Godown Pending Stock, Outward & Cross Stock-Out
  const matchedAllLRs = useMemo(() => {
    if (!query) return [];
    return combinedLREntries
      .filter((item) => {
        // Query match across all fields
        const match =
          String(item.lrNo ?? '').toLowerCase().includes(query) ||
          String(item.inwardNo ?? '').toLowerCase().includes(query) ||
          String(item.outwardNo ?? '').toLowerCase().includes(query) ||
          String(item.consigneeName ?? '').toLowerCase().includes(query) ||
          String(item.consignorName ?? '').toLowerCase().includes(query) ||
          String(item.ctTo ?? '').toLowerCase().includes(query) ||
          String(item.memoNo ?? '').toLowerCase().includes(query) ||
          String(item.invoiceNo ?? '').toLowerCase().includes(query) ||
          String(item.inwardVehicleNo ?? '').toLowerCase().includes(query) ||
          String(item.outwardVehicleNo ?? '').toLowerCase().includes(query) ||
          String(item.vehicleNo ?? '').toLowerCase().includes(query) ||
          String(item.deliveryPersonName ?? '').toLowerCase().includes(query) ||
          String(item.driverName ?? '').toLowerCase().includes(query);

        if (!match) return false;

        // Station filter
        if (selectedStation !== 'ALL') {
          const itemStation = String(item.ctTo || item.fromStation || item.from || '').toUpperCase();
          if (!itemStation.includes(selectedStation.toUpperCase())) return false;
        }

        // Status filter
        if (selectedStatusFilter === 'pending' && item.status !== 'PENDING') return false;
        if (selectedStatusFilter === 'dispatched' && item.status === 'PENDING') return false;

        return true;
      })
      .sort((a, b) => {
        // Exact LR match placed first
        const aExact = String(a.lrNo ?? '').trim().toLowerCase() === query;
        const bExact = String(b.lrNo ?? '').trim().toLowerCase() === query;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return 0;
      });
  }, [combinedLREntries, query, selectedStation, selectedStatusFilter]);

  // Enriched Viewing Item resolving full consignment tracking lifecycle
  const enrichedViewingItem = useMemo(() => {
    if (!viewingItem) return null;
    const found = combinedLREntries.find(
      (e) =>
        (e.id && e.id === viewingItem.id) ||
        (e.lrNo && String(e.lrNo).trim().toLowerCase() === String(viewingItem.lrNo).trim().toLowerCase())
    );
    return found ? { ...viewingItem, ...found } : viewingItem;
  }, [viewingItem, combinedLREntries]);

  // Filtered Pending Stock
  const filteredPending = useMemo(() => {
    return pendingStock.filter((item) => {
      // Query filter
      if (query) {
        const match =
          String(item.lrNo ?? '').toLowerCase().includes(query) ||
          String(item.inwardNo ?? '').toLowerCase().includes(query) ||
          String(item.consigneeName ?? '').toLowerCase().includes(query) ||
          String(item.consignorName ?? '').toLowerCase().includes(query) ||
          String(item.ctTo ?? '').toLowerCase().includes(query) ||
          String(item.memoNo ?? '').toLowerCase().includes(query) ||
          String(item.vehicleNo ?? '').toLowerCase().includes(query);
        if (!match) return false;
      }
      // Station filter
      if (selectedStation !== 'ALL') {
        const itemStation = String(item.ctTo || item.fromStation || '').toUpperCase();
        if (!itemStation.includes(selectedStation.toUpperCase())) return false;
      }
      // Tab filter (Priority / Heavy)
      if (stockTab === 'priority') {
        return Number(item.toPayAmount || 0) > 2000;
      }
      if (stockTab === 'heavy') {
        return Number(item.pkg || 0) >= 20;
      }
      return true;
    });
  }, [pendingStock, query, selectedStation, stockTab]);

  // Filtered Inwards
  const filteredInwards = useMemo(() => {
    if (!query) return inwards.slice(0, 5);
    return inwards
      .filter((inw) =>
        String(inw.inwardNo ?? '').toLowerCase().includes(query) ||
        String(inw.vehicleNo ?? '').toLowerCase().includes(query) ||
        String(inw.memoNo ?? '').toLowerCase().includes(query) ||
        String(inw.transporterName ?? '').toLowerCase().includes(query) ||
        String(inw.from ?? '').toLowerCase().includes(query) ||
        String(inw.consignorName ?? '').toLowerCase().includes(query) ||
        String(inw.consigneeName ?? '').toLowerCase().includes(query)
      )
      .slice(0, 5);
  }, [inwards, query]);

  // Checkbox management for pending stock
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedStockIds(filteredPending.map((i) => i.id));
    } else {
      setSelectedStockIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedStockIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectedPackagesCount = useMemo(() => {
    return pendingStock
      .filter((i) => selectedStockIds.includes(i.id))
      .reduce((sum, curr) => sum + (Number(curr.pkg) || 0), 0);
  }, [pendingStock, selectedStockIds]);

  const handleDispatchSelected = () => {
    if (selectedStockIds.length === 0) return;
    const selectedItems = pendingStock.filter((i) => selectedStockIds.includes(i.id));
    navigate('/outward/new', { state: { prefillItems: selectedItems } });
  };

  const handlePrintLR = (item) => {
    const toPay = Number(item.toPayAmount) || 0;
    const tbb = Number(item.tbbAmount) || 0;
    const paid = Number(item.paidAmount) || 0;
    const totalFreight = toPay + tbb + paid;
    const status = String(item.status || 'PENDING').toUpperCase();

    printRecordDetails({
      title: `Consignment Lorry Receipt #${item.lrNo}`,
      fields: [
        { label: 'LR No.', value: item.lrNo },
        { label: 'Status', value: status },
        { label: 'Inward Date', value: item.inwardDate && item.inwardDate !== '-' ? formatDate(item.inwardDate) : '-' },
        { label: 'Inward No.', value: item.inwardNo || '-' },
        { label: 'Memo No.', value: item.memoNo || '-' },
        { label: 'Transporter', value: item.transporterName || '-' },
        { label: 'Inward Vehicle', value: item.inwardVehicleNo || item.vehicleNo || '-' },
        { label: 'Inward Driver', value: item.inwardDriverName || item.driverName || '-' },
        { label: 'Destination', value: item.ctTo || '-' },
        { label: 'Consignor', value: item.consignorName || '-' },
        { label: 'Consignee', value: item.consigneeName || '-' },
        { label: 'Packages (PKG)', value: `${item.pkg} PKG` },
        { label: 'Invoice No.', value: item.invoiceNo || '-' },
        { label: 'Outward No.', value: item.outwardNo && item.outwardNo !== '-' ? item.outwardNo : 'Not Dispatched Yet' },
        { label: 'Outward Date', value: item.outwardDate && item.outwardDate !== '-' ? formatDate(item.outwardDate) : '-' },
        { label: 'Delivery Vehicle', value: item.outwardVehicleNo && item.outwardVehicleNo !== '-' ? item.outwardVehicleNo : '-' },
        { label: 'Delivery Person', value: item.deliveryPersonName && item.deliveryPersonName !== '-' ? item.deliveryPersonName : '-' },
        { label: 'To Pay Freight', value: formatCurrency(toPay) },
        { label: 'T.B.B. Freight', value: formatCurrency(tbb) },
        { label: 'Paid Freight', value: formatCurrency(paid) },
        { label: 'Total Freight', value: formatCurrency(totalFreight) },
      ],
      items: [item],
    });
  };

  const handlePrintInward = (inw) => {
    printRecordDetails({
      title: `Inward Memo #${inw.inwardNo}`,
      fields: [
        { label: 'Inward No.', value: inw.inwardNo },
        { label: 'Date', value: formatDate(inw.date) },
        { label: 'Transporter', value: inw.transporterName },
        { label: 'Vehicle No.', value: inw.vehicleNo },
        { label: 'Driver', value: inw.driverName },
        { label: 'From Station', value: inw.from },
        { label: 'Memo No.', value: inw.memoNo || '-' },
        { label: 'Total Packages', value: inw.totalQty },
      ],
      items: inwardItems.filter((i) => i.inwardId === inw.id || i.inwardNo === inw.inwardNo),
    });
  };

  const handleExportInwardLog = () => {
    const exportData = inwards.map((i) => ({
      'Inward No': i.inwardNo,
      Date: formatDate(i.date),
      Transporter: i.transporterName,
      Vehicle: i.vehicleNo,
      Driver: i.driverName,
      'From Station': i.from,
      'Memo No': i.memoNo || '-',
      'Total Qty': i.totalQty,
    }));
    exportToExcel(exportData, `Athahar_Recent_Inward_Log`);
  };

  // Pseudo bay location allocator for logistics rack tag
  const getRackLocation = (index) => {
    const bays = ['Rack A-02', 'Rack B-01', 'Floor Bay 3', 'Rack C-04', 'Rack A-05', 'Bay D-12'];
    return bays[index % bays.length];
  };

  return (
    <div className="space-y-4 sm:space-y-5 max-w-full">
      {/* Hero Operational Hub Banner */}
      <div className="bg-gradient-to-r from-[#07182e] via-[#0b2545] to-[#133e87] rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-xl border border-blue-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-5 relative overflow-hidden">
        {/* Top Brand Highway Accent Line */}
        <div className="h-1 highway-accent-line absolute top-0 left-0 right-0" />
        {/* Subtle background glow effect matching logo orange highway arch */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="space-y-2 sm:space-y-2.5 z-10">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="bg-white/10 text-orange-200 text-[9px] sm:text-[10px] font-black px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full uppercase tracking-wider sm:tracking-widest border border-orange-400/20 backdrop-blur-xs flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>TERMINAL HUB &bull; SANGLI</span>
            </span>
            <span className="bg-orange-950/80 text-orange-300 border border-orange-500/30 text-[9px] sm:text-[10px] font-mono font-black px-2 py-0.5 rounded tracking-wider">
              GATE-01 ACTIVE
            </span>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4 pt-0.5 sm:pt-1">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white p-1 sm:p-1.5 flex items-center justify-center shadow-2xl border-2 border-white/60 flex-shrink-0 ring-2 sm:ring-4 ring-orange-500/20">
              <img src="/logo.png" alt="ATHAHAR ROADWAYS" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-3xl font-black tracking-tight text-white uppercase truncate">
                ATHAHAR ROADWAYS
              </h2>
              <p className="text-orange-400 text-[10px] sm:text-[11px] font-black tracking-wider sm:tracking-widest uppercase mt-0.5">
                SAFE &bull; ON TIME &bull; ALWAYS
              </p>
              <p className="text-blue-100/80 text-[10px] sm:text-xs font-mono tracking-tight mt-0.5 sm:mt-1 truncate sm:whitespace-normal">
                VAKHAR BHAG, SANGLI &bull; MOB: 9370229449 / 9850329449
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:space-x-3 w-full sm:w-auto flex-shrink-0 z-10 pt-1 sm:pt-0">
          <Link
            to="/inward/new"
            className="flex items-center justify-center space-x-1.5 sm:space-x-2 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-black px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs shadow-lg shadow-orange-500/25 transition-all active:scale-[0.98] text-center"
          >
            <PlusCircle className="w-4 h-4 text-white flex-shrink-0" />
            <span>New Inward</span>
            <span className="hidden sm:inline bg-orange-700/80 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
              Alt+N
            </span>
          </Link>
          <Link
            to="/outward/new"
            className="flex items-center justify-center space-x-1.5 sm:space-x-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-[0.98] text-center"
          >
            <ArrowUpRight className="w-4 h-4 text-orange-400 flex-shrink-0" />
            <span>Outward</span>
            <span className="hidden sm:inline bg-white/15 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
              Alt+O
            </span>
          </Link>
        </div>
      </div>

      {/* Universal Search & Filter Toolbar */}
      <div className="bg-white p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3">
        {/* Search input with keyboard shortcut */}
        <div className="relative w-full md:flex-1 md:min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search LR No., Vehicle, Consignee..."
            className="w-full pl-9 pr-16 sm:pr-20 py-2 sm:py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all shadow-inner"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center space-x-1">
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm('')}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="hidden sm:inline-block bg-white border border-slate-200 text-slate-400 text-[10px] font-mono px-1.5 py-0.5 rounded shadow-2xs">
                Ctrl+K
              </span>
            )}
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-1.5 sm:gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-0.5 md:pb-0">
          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            className="px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer flex-1 md:flex-none"
          >
            <option value="ALL">All Stations</option>
            {masters.stations?.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={selectedDateFilter}
            onChange={(e) => setSelectedDateFilter(e.target.value)}
            className="px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer flex-1 md:flex-none"
          >
            <option value="all">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer flex-1 md:flex-none"
          >
            <option value="all">Status: All</option>
            <option value="pending">Pending</option>
            <option value="dispatched">Dispatched</option>
          </select>

          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedStation('ALL');
              setSelectedDateFilter('all');
              setSelectedStatusFilter('all');
            }}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg sm:rounded-xl transition-colors border border-slate-200 flex-shrink-0"
            title="Reset Filters"
          >
            <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Universal LR Consignment Search Results (Active when searching any LR No., Vehicle, Consignee, etc.) */}
      {query && (
        <div className="bg-white rounded-2xl border-2 border-blue-500/40 shadow-lg overflow-hidden transition-all animate-fadeIn">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0b2545] to-[#153e75] text-white p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 sm:p-2.5 bg-blue-500/20 rounded-xl border border-blue-400/30 flex-shrink-0">
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-blue-300" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-black text-xs sm:text-sm tracking-tight text-white">
                    Consignment Master Search Results
                  </h3>
                  <span className="bg-blue-400/20 text-blue-200 border border-blue-400/30 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full">
                    Query: "{searchTerm}"
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-blue-200/80 font-medium mt-0.5">
                  Full consignment history across Inward Arrivals, Godown Pending Floor, and Outward Deliveries
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 self-end sm:self-auto flex-shrink-0">
              <span className="text-[11px] sm:text-xs font-bold px-2.5 py-1 bg-white/10 rounded-lg text-white border border-white/15">
                {matchedAllLRs.length} {matchedAllLRs.length === 1 ? 'Record' : 'Records'} Found
              </span>
              <button
                onClick={() => setSearchTerm('')}
                className="p-1 sm:p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Clear Search Filter"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {matchedAllLRs.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="font-black text-sm sm:text-base text-slate-800">
                No Consignment Found Matching "{searchTerm}"
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No LR matches this number, vehicle, consignee, or station across all records. Try verifying the digits or clearing the filter.
              </p>
              <button
                onClick={() => setSearchTerm('')}
                className="mt-3 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Clear Search Filter
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] sm:text-[11px] font-black uppercase text-slate-500 tracking-wider">
                    <tr>
                      <th className="py-3 px-4">LR No. &amp; Inv</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Parties &amp; Destination</th>
                      <th className="py-3 px-4">Inward Details</th>
                      <th className="py-3 px-4">Outward Details</th>
                      <th className="py-3 px-4 text-center">PKG</th>
                      <th className="py-3 px-4 text-right">Freight (₹)</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {matchedAllLRs.map((item, idx) => {
                      const toPay = Number(item.toPayAmount) || 0;
                      const paid = Number(item.paidAmount) || 0;
                      const tbb = Number(item.tbbAmount) || 0;
                      const totalFreight = toPay + paid + tbb;
                      const isDelivered = item.status === 'DELIVERED';
                      const isStockOut = item.status === 'DISPATCHED' && item.recordCategory === 'stock_out_item';
                      const isPending = item.status === 'PENDING';

                      return (
                        <tr
                          key={item.id || idx}
                          className="hover:bg-blue-50/50 transition-colors group cursor-pointer"
                          onClick={() => setViewingItem(item)}
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-black text-sm text-blue-700 group-hover:text-blue-900 flex items-center space-x-1">
                              <span>#{item.lrNo}</span>
                            </div>
                            {item.invoiceNo && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                Inv: {item.invoiceNo}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {isPending && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>
                                Pending Godown
                              </span>
                            )}
                            {isDelivered && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                                Outward Delivered
                              </span>
                            )}
                            {isStockOut && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-purple-50 text-purple-700 border border-purple-200">
                                <Route className="w-3 h-3 mr-1 text-purple-600" />
                                Stock-Out Dispatched
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 truncate max-w-[200px]" title={item.consigneeName}>
                              {item.consigneeName || '-'}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[200px]" title={item.consignorName}>
                              From: {item.consignorName || '-'}
                            </div>
                            {item.ctTo && (
                              <span className="inline-block mt-1 text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                                TO: {item.ctTo}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {item.inwardNo && item.inwardNo !== '-' ? (
                              <div>
                                <div className="font-bold text-slate-800">
                                  {item.inwardNo} &bull; <span className="text-slate-500 font-medium text-[11px]">{formatDate(item.inwardDate)}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  Veh: <span className="font-mono font-semibold text-slate-700">{item.inwardVehicleNo || '-'}</span>
                                </div>
                                {item.transporterName && item.transporterName !== '-' && (
                                  <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                    {item.transporterName}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Direct Entry</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {item.outwardNo && item.outwardNo !== '-' ? (
                              <div>
                                <div className="font-bold text-slate-800">
                                  {item.outwardNo} &bull; <span className="text-slate-500 font-medium text-[11px]">{formatDate(item.outwardDate)}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  {item.deliveryPersonName && item.deliveryPersonName !== '-' ? (
                                    <span>Agent: <strong className="text-slate-700">{item.deliveryPersonName}</strong></span>
                                  ) : item.outwardVehicleNo && item.outwardVehicleNo !== '-' ? (
                                    <span>Veh: <span className="font-mono font-semibold text-slate-700">{item.outwardVehicleNo}</span></span>
                                  ) : (
                                    <span>Dispatched</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-amber-700 font-semibold text-[10px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                In Godown Floor
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                              {item.pkg}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="font-black text-slate-900 text-xs">
                              {formatCurrency(totalFreight)}
                            </div>
                            <div className="text-[9px] font-bold mt-0.5 space-x-1">
                              {toPay > 0 && <span className="text-rose-600">ToPay: {formatCurrency(toPay)}</span>}
                              {paid > 0 && <span className="text-sky-600">Paid: {formatCurrency(paid)}</span>}
                              {tbb > 0 && <span className="text-indigo-600">TBB: {formatCurrency(tbb)}</span>}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setViewingItem(item)}
                                className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg transition-colors font-bold text-[11px] flex items-center space-x-1"
                                title="View Full LR History & Lifecycle"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Full Info</span>
                              </button>
                              <button
                                onClick={() => handlePrintLR(item)}
                                className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                                title="Print Complete Consignment LR Record"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View: Cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {matchedAllLRs.map((item, idx) => {
                  const toPay = Number(item.toPayAmount) || 0;
                  const paid = Number(item.paidAmount) || 0;
                  const tbb = Number(item.tbbAmount) || 0;
                  const totalFreight = toPay + paid + tbb;
                  const isDelivered = item.status === 'DELIVERED';
                  const isStockOut = item.status === 'DISPATCHED' && item.recordCategory === 'stock_out_item';
                  const isPending = item.status === 'PENDING';

                  return (
                    <div
                      key={item.id || idx}
                      className="p-3.5 space-y-2.5 hover:bg-blue-50/30 transition-colors"
                      onClick={() => setViewingItem(item)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm text-blue-700">#{item.lrNo}</span>
                        {isPending && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                            Pending Godown
                          </span>
                        )}
                        {isDelivered && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Delivered
                          </span>
                        )}
                        {isStockOut && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-50 text-purple-700 border border-purple-200">
                            Dispatched
                          </span>
                        )}
                      </div>

                      <div className="text-xs">
                        <div className="font-bold text-slate-900">{item.consigneeName || 'Consignee'}</div>
                        <div className="text-[11px] text-slate-400">From: {item.consignorName || '-'}</div>
                        {item.ctTo && (
                          <div className="text-[10px] font-bold text-orange-600 mt-0.5">
                            TO: {item.ctTo}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <div>
                          <span className="text-slate-400 block font-bold">INWARD:</span>
                          <span className="font-semibold text-slate-700">{item.inwardNo || '-'} ({formatDate(item.inwardDate)})</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold">OUTWARD:</span>
                          <span className="font-semibold text-slate-700">
                            {item.outwardNo && item.outwardNo !== '-' ? `${item.outwardNo} (${formatDate(item.outwardDate)})` : 'In Godown'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                            {item.pkg} PKG
                          </span>
                          <span className="font-black text-slate-800">
                            {formatCurrency(totalFreight)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setViewingItem(item)}
                            className="px-2.5 py-1 bg-blue-600 text-white rounded-lg font-bold text-[10px]"
                          >
                            Full Info
                          </button>
                          <button
                            onClick={() => handlePrintLR(item)}
                            className="p-1 bg-slate-100 text-slate-600 rounded-lg"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* 4 Primary Metric Stat Cards with Brand Theme Accents */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Total Inward LRs */}
        <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/90 border-t-4 border-t-[#0b2545] shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 truncate">
                Total Inward
              </span>
              <div className="p-1.5 sm:p-2 bg-slate-100 text-[#0b2545] rounded-lg sm:rounded-xl font-bold flex-shrink-0">
                <ArrowDownLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-1 sm:space-x-2">
              <span className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {totalInwardCount}
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-slate-500">LRs</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mt-2.5 pt-2 sm:mt-3 sm:pt-3 border-t border-slate-100 text-[10px] sm:text-xs">
            <span className="font-semibold text-slate-500 truncate">{totalInwardPackages.toLocaleString()} Pkg</span>
            <span className="text-[#0b2545] font-black bg-blue-50 px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[11px] border border-blue-100 w-fit">
              Inward
            </span>
          </div>
        </div>

        {/* Card 2: Pending Stock (Godown) */}
        <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/90 border-t-4 border-t-orange-500 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 truncate">
                Pending Stock
              </span>
              <div className="p-1.5 sm:p-2 bg-orange-500 text-white rounded-lg sm:rounded-xl shadow-xs flex-shrink-0">
                <PackageCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-1 sm:space-x-2">
              <span className="text-xl sm:text-3xl font-black text-orange-600 tracking-tight">
                {totalPendingCount}
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-slate-500">LRs</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mt-2.5 pt-2 sm:mt-3 sm:pt-3 border-t border-slate-100 text-[10px] sm:text-xs">
            <span className="font-semibold text-slate-500 truncate">{totalPendingPackages.toLocaleString()} Pkg</span>
            <span className="text-orange-700 font-black bg-orange-50 border border-orange-200/80 px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[11px] w-fit">
              Ready
            </span>
          </div>
        </div>

        {/* Card 3: Dispatched Today */}
        <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/90 border-t-4 border-t-emerald-500 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 truncate">
                Dispatched
              </span>
              <div className="p-1.5 sm:p-2 bg-emerald-50 text-emerald-600 rounded-lg sm:rounded-xl flex-shrink-0">
                <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-1 sm:space-x-2">
              <span className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {totalDispatchedCount}
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-slate-500">LRs</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mt-2.5 pt-2 sm:mt-3 sm:pt-3 border-t border-slate-100 text-[10px] sm:text-xs">
            <span className="font-semibold text-slate-500 truncate">{totalDispatchedPackages.toLocaleString()} Pkg</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[11px] w-fit">
              {dispatchRate}% Rate
            </span>
          </div>
        </div>

        {/* Card 4: Pending Freight (To Pay) */}
        <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/90 border-t-4 border-t-amber-500 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 truncate">
                To Pay Pending
              </span>
              <div className="p-1.5 sm:p-2 bg-amber-50 text-amber-600 rounded-lg sm:rounded-xl font-bold flex-shrink-0 flex items-center justify-center">
                <span className="font-black text-xs sm:text-sm">&#8377;</span>
              </div>
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                {formatCurrency(totalToPayPending)}
              </span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mt-2.5 pt-2 sm:mt-3 sm:pt-3 border-t border-slate-100 text-[10px] sm:text-xs">
            <span className="font-semibold text-slate-500 truncate">{pendingStockToPayCount} Vouchers</span>
            <span className="text-amber-800 font-bold bg-amber-50 border border-amber-200 px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[11px] w-fit">
              Collect
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Pending Stock (Ready for Outward) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between overflow-hidden">
          <div>
            {/* Card Header & Tabs */}
            <div className="p-3.5 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5 sm:space-x-3">
                <div className="p-1.5 sm:p-2 bg-blue-50 text-blue-700 rounded-lg sm:rounded-xl">
                  <PackageCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="font-black text-xs sm:text-sm text-slate-900 tracking-tight">
                    Pending Stock (Ready for Outward)
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                    Sangli Godown Floor Bays A, B &amp; C
                  </p>
                </div>
              </div>

              {/* Segmented Filter Pills */}
              <div className="flex items-center space-x-1 bg-slate-100/90 p-1 rounded-xl text-xs font-bold text-slate-600 overflow-x-auto no-scrollbar w-full sm:w-auto">
                <button
                  onClick={() => setStockTab('all')}
                  className={`flex-1 sm:flex-none text-center whitespace-nowrap px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all text-[11px] sm:text-xs ${
                    stockTab === 'all'
                      ? 'bg-[#0b2545] text-white shadow-xs font-black'
                      : 'hover:text-slate-900'
                  }`}
                >
                  All ({pendingStock.length})
                </button>
                <button
                  onClick={() => setStockTab('priority')}
                  className={`flex-1 sm:flex-none text-center whitespace-nowrap px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all text-[11px] sm:text-xs ${
                    stockTab === 'priority'
                      ? 'bg-[#0b2545] text-white shadow-xs font-black'
                      : 'hover:text-slate-900'
                  }`}
                >
                  Priority ({pendingStock.filter((i) => Number(i.toPayAmount || 0) > 2000).length})
                </button>
                <button
                  onClick={() => setStockTab('heavy')}
                  className={`flex-1 sm:flex-none text-center whitespace-nowrap px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all text-[11px] sm:text-xs ${
                    stockTab === 'heavy'
                      ? 'bg-[#0b2545] text-white shadow-xs font-black'
                      : 'hover:text-slate-900'
                  }`}
                >
                  Heavy ({pendingStock.filter((i) => Number(i.pkg || 0) >= 20).length})
                </button>
              </div>
            </div>

            {/* Mobile View: Clean Touch Cards (NO Horizontal Scrolling) */}
            <div className="sm:hidden divide-y divide-slate-100">
              {filteredPending.length === 0 ? (
                <div className="py-8 px-4 text-center text-slate-400 font-medium text-xs">
                  No pending stock records matching filter.
                </div>
              ) : (
                filteredPending.slice(0, 5).map((item, idx) => {
                  const isSelected = selectedStockIds.includes(item.id);
                  const toPay = Number(item.toPayAmount) || 0;
                  const paid = Number(item.paidAmount) || 0;
                  const tbb = Number(item.tbbAmount) || 0;

                  return (
                    <div
                      key={item.id}
                      className={`p-3 space-y-2 transition-colors ${
                        isSelected ? 'bg-blue-50/50' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(item.id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="font-black text-xs text-blue-700">
                            #{item.lrNo}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {formatDate(item.inwardDate || item.date)}
                          </span>
                        </div>
                        {toPay > 0 ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-50 border border-rose-200 text-rose-700">
                            TO PAY {formatCurrency(toPay)}
                          </span>
                        ) : paid > 0 ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-sky-50 border border-sky-200 text-sky-700">
                            PAID {formatCurrency(paid)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-50 border border-indigo-200 text-indigo-700">
                            T.B.B. {formatCurrency(tbb)}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-700">
                        <div className="font-bold truncate">
                          {item.consigneeName || 'Consignee'}
                          {item.ctTo ? <span className="text-orange-600 font-semibold ml-1">({item.ctTo})</span> : ''}
                        </div>
                        {item.consignorName && (
                          <div className="text-[11px] text-slate-400 truncate">
                            Consignor: {item.consignorName}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.pkg} PKG
                          </span>
                          <span className="font-mono text-[10px] font-bold text-slate-500">
                            {getRackLocation(idx)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handlePrintLR(item)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Print LR"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setViewingItem(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg font-bold text-[11px] flex items-center space-x-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop View: Multi-column Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase font-black text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="p-3 w-8">
                      <input
                        type="checkbox"
                        checked={
                          filteredPending.length > 0 &&
                          selectedStockIds.length === filteredPending.length
                        }
                        onChange={handleSelectAll}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                    <th className="p-3">LR No</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Pkg</th>
                    <th className="p-3">Destination &amp; Party</th>
                    <th className="p-3">Freight Type</th>
                    <th className="p-3">Location</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPending.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-400 font-medium">
                        No pending stock records matching filter.
                      </td>
                    </tr>
                  ) : (
                    filteredPending.slice(0, 5).map((item, idx) => {
                      const isSelected = selectedStockIds.includes(item.id);
                      const toPay = Number(item.toPayAmount) || 0;
                      const paid = Number(item.paidAmount) || 0;
                      const tbb = Number(item.tbbAmount) || 0;

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isSelected ? 'bg-blue-50/40' : ''
                          }`}
                        >
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectRow(item.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 font-black text-blue-700">
                            #{item.lrNo}
                          </td>
                          <td className="p-3 font-medium text-slate-600">
                            {formatDate(item.inwardDate || item.date)}
                          </td>
                          <td className="p-3 font-black text-slate-900">
                            {item.pkg}
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900 truncate max-w-[200px]">
                              {item.consigneeName || 'Consignee'}
                              {item.ctTo ? ` (${item.ctTo})` : ''}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                              Consignor: {item.consignorName || '-'}
                            </div>
                          </td>
                          <td className="p-3">
                            {toPay > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-50 border border-rose-200 text-rose-700">
                                TO PAY {formatCurrency(toPay)}
                              </span>
                            ) : paid > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase bg-sky-50 border border-sky-200 text-sky-700">
                                PAID {formatCurrency(paid)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-50 border border-indigo-200 text-indigo-700">
                                T.B.B. {formatCurrency(tbb)}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                              {getRackLocation(idx)}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => handlePrintLR(item)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Print Lorry Receipt"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setViewingItem(item)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Stock Card Footer */}
          <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 text-xs">
            <div className="text-slate-500 font-semibold text-center sm:text-left">
              <span className="font-bold text-slate-800">
                {Math.min(5, filteredPending.length)} of {filteredPending.length}
              </span>{' '}
              displayed &bull;{' '}
              <span className="font-bold text-blue-700">
                {selectedPackagesCount} Pkg Selected
              </span>
            </div>

            <div className="flex items-center justify-between sm:justify-end space-x-3 w-full sm:w-auto">
              <Link
                to="/pending"
                className="text-orange-600 hover:text-orange-700 hover:underline font-bold text-xs"
              >
                View All Stock
              </Link>
              <button
                onClick={handleDispatchSelected}
                disabled={selectedStockIds.length === 0}
                className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 disabled:opacity-40 text-white font-bold px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs shadow-xs transition-all active:scale-[0.98]"
              >
                Dispatch Selected
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Inward Transactions Feed */}
        <div className="lg:col-span-4 bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between overflow-hidden">
          <div>
            {/* Header */}
            <div className="p-3.5 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 sm:p-2 bg-sky-50 text-sky-600 rounded-lg sm:rounded-xl">
                  <ArrowDownLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="font-black text-xs sm:text-sm text-slate-900 tracking-tight">
                    Recent Inwards
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                    Gate Inward Arrival Logs
                  </p>
                </div>
              </div>

              <Link
                to="/all-entries"
                state={{ tab: 'inward_headers' }}
                className="text-xs font-bold text-blue-700 hover:underline flex items-center space-x-1"
              >
                <span>Full Log</span>
                <span className="text-[10px]">&nearr;</span>
              </Link>
            </div>

            {/* Inward Arrival Cards Feed */}
            <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
              {filteredInwards.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-slate-400 text-xs font-medium">
                  No inward arrival records yet.
                </div>
              ) : (
                filteredInwards.map((inw) => (
                  <div
                    key={inw.id}
                    className="p-3 sm:p-3.5 rounded-xl border border-slate-200/80 hover:border-blue-300 hover:shadow-2xs transition-all bg-slate-50/40 space-y-1.5 sm:space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="bg-[#0f172a] text-white font-mono font-black text-[10px] px-1.5 sm:px-2 py-0.5 rounded flex-shrink-0">
                          {inw.inwardNo}
                        </span>
                        <span className="font-bold text-xs text-slate-900 truncate">{inw.vehicleNo}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium flex-shrink-0 ml-2">
                        {formatDate(inw.date)}
                      </span>
                    </div>

                    <div className="text-[11px] sm:text-xs text-slate-600 font-medium flex items-center justify-between">
                      <span className="truncate">Origin: {inw.from || 'MUMBAI'}</span>
                      <span className="text-slate-400 mx-1">&bull;</span>
                      <span className="truncate">Driver: {inw.driverName || 'DRIVER'}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                      <div className="flex items-center space-x-1.5 text-emerald-700 font-black text-[10px] sm:text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>{inw.totalQty} Pkg &bull; Verified</span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handlePrintInward(inw)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded"
                          title="Print Inward Memo"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2.5 sm:gap-3 text-xs">
            <button
              onClick={() => {
                if (inwards[0]) handlePrintInward(inwards[0]);
              }}
              className="flex-1 py-1.5 sm:py-2 px-2.5 sm:px-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-2xs text-center text-xs"
            >
              Receipt Memo
            </button>
            <button
              onClick={handleExportInwardLog}
              className="flex-1 py-1.5 sm:py-2 px-2.5 sm:px-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-2xs text-center text-xs"
            >
              Export Log
            </button>
          </div>
        </div>
      </div>

      {/* Bottom 3 Facility & Logistics Operations Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4">
        {/* Card 1: Godown Capacity */}
        <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs flex items-center space-x-3 sm:space-x-4">
          <div className="p-2 sm:p-3 bg-blue-50 text-blue-700 rounded-lg sm:rounded-xl flex-shrink-0">
            <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] sm:text-xs font-bold text-slate-900 uppercase tracking-tight">Godown Capacity</p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">Floor bays at 68% utilization</p>
            <div className="flex items-baseline space-x-1.5 mt-0.5 sm:mt-1">
              <span className="text-base sm:text-lg font-black text-blue-700">
                {totalInwardPackages.toLocaleString()}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 font-semibold">/ 2,700 Max PKG</span>
            </div>
          </div>
        </div>

        {/* Card 2: Next Linehaul Departure */}
        <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs flex items-center space-x-3 sm:space-x-4">
          <div className="p-2 sm:p-3 bg-sky-50 text-[#0284c7] rounded-lg sm:rounded-xl flex-shrink-0">
            <Route className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] sm:text-xs font-bold text-slate-900 uppercase tracking-tight">Next Linehaul Departure</p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">Sangli &rarr; Mumbai NH-48</p>
            <div className="flex items-center justify-between mt-0.5 sm:mt-1">
              <span className="text-base sm:text-lg font-black text-slate-900">14:30</span>
              <span className="text-[10px] sm:text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 sm:px-2 py-0.5 rounded truncate">
                MH-10-AZ-9901
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Daily Cash Flow */}
        <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs flex items-center space-x-3 sm:space-x-4 sm:col-span-2 md:col-span-1">
          <div className="p-2 sm:p-3 bg-emerald-50 text-emerald-700 rounded-lg sm:rounded-xl flex-shrink-0">
            <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] sm:text-xs font-bold text-slate-900 uppercase tracking-tight">Daily Cash Flow</p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">To-Pay collected at gate</p>
            <div className="flex items-center justify-between mt-0.5 sm:mt-1">
              <span className="text-base sm:text-lg font-black text-emerald-700">
                {formatCurrency(totalToPayPending)}
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 sm:px-2 py-0.5 rounded">
                Settled
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for viewing LR item full consignment details & tracking */}
      <Modal
        isOpen={!!viewingItem}
        onClose={() => setViewingItem(null)}
        title={`Consignment LR #${enrichedViewingItem?.lrNo || viewingItem?.lrNo || ''} Lifecycle`}
        maxWidth="max-w-3xl"
      >
        {enrichedViewingItem && (() => {
          const item = enrichedViewingItem;
          const toPay = Number(item.toPayAmount) || 0;
          const tbb = Number(item.tbbAmount) || 0;
          const paid = Number(item.paidAmount) || 0;
          const totalFreight = toPay + tbb + paid;
          const isPending = item.status === 'PENDING';
          const isDelivered = item.status === 'DELIVERED';
          const isStockOut = item.status === 'DISPATCHED';

          return (
            <div className="space-y-4 text-xs text-slate-700">
              {/* Hero Banner */}
              <div className="bg-gradient-to-r from-[#0b2545] to-[#1a406c] p-4 sm:p-5 rounded-2xl text-white shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-200">
                      Consignment Lorry Receipt
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center space-x-2">
                      <span>#{item.lrNo}</span>
                    </h2>
                    {item.invoiceNo && (
                      <p className="text-xs text-blue-200/90 font-mono mt-0.5">
                        Invoice Ref: <strong className="text-white">{item.invoiceNo}</strong>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-1.5">
                    {isPending && (
                      <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-amber-400 text-amber-950 border border-amber-300 shadow-xs flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-950 animate-ping"></span>
                        <span>Pending in Godown</span>
                      </span>
                    )}
                    {isDelivered && (
                      <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-400 text-emerald-950 border border-emerald-300 shadow-xs flex items-center space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Outward Delivered</span>
                      </span>
                    )}
                    {isStockOut && (
                      <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-purple-300 text-purple-950 border border-purple-200 shadow-xs flex items-center space-x-1.5">
                        <Route className="w-3.5 h-3.5" />
                        <span>Stock-Out Dispatched</span>
                      </span>
                    )}
                    <div className="flex items-center space-x-2 text-[11px] text-blue-100 font-bold mt-1">
                      <span className="bg-white/10 px-2 py-0.5 rounded">{item.pkg} Packages</span>
                      <span className="bg-white/10 px-2 py-0.5 rounded text-amber-300">{formatCurrency(totalFreight)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Detail Grid Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* 1. Consignment & Route */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 text-slate-800 font-black text-xs uppercase tracking-wide">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>Consignment &amp; Route</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Consignor (Sender)</span>
                      <span className="font-bold text-slate-900 truncate block" title={item.consignorName}>{item.consignorName || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Consignee (Receiver)</span>
                      <span className="font-bold text-slate-900 truncate block" title={item.consigneeName}>{item.consigneeName || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Destination (CT TO)</span>
                      <span className="font-bold text-orange-600 truncate block">{item.ctTo || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Origin Station</span>
                      <span className="font-bold text-slate-800 truncate block">{item.fromStation || item.from || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Packages</span>
                      <span className="font-black text-slate-900 text-sm">{item.pkg} PKG</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Memo No.</span>
                      <span className="font-bold text-slate-800 font-mono">{item.memoNo || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Inward Receipt & Hub Arrival */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 text-slate-800 font-black text-xs uppercase tracking-wide">
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Inward Hub Arrival</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Inward Receipt</span>
                      <span className="font-bold text-blue-700">{item.inwardNo || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Arrival Date</span>
                      <span className="font-bold text-slate-800">
                        {item.inwardDate && item.inwardDate !== '-' ? formatDate(item.inwardDate) : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Incoming Vehicle</span>
                      <span className="font-mono font-bold text-slate-900">{item.inwardVehicleNo || item.vehicleNo || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Inward Driver</span>
                      <span className="font-bold text-slate-800 truncate block">{item.inwardDriverName || item.driverName || '-'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Transporter Agency</span>
                      <span className="font-bold text-slate-800 truncate block">{item.transporterName || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Outward Dispatch & Delivery */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 text-slate-800 font-black text-xs uppercase tracking-wide">
                    <ArrowUpRight className="w-3.5 h-3.5 text-purple-600" />
                    <span>Outward Dispatch / Delivery</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Outward / Stock-Out</span>
                      <span className={`font-bold ${item.outwardNo && item.outwardNo !== '-' ? 'text-purple-700' : 'text-slate-400'}`}>
                        {item.outwardNo && item.outwardNo !== '-' ? item.outwardNo : 'Not Dispatched Yet'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Dispatch Date</span>
                      <span className="font-bold text-slate-800">
                        {item.outwardDate && item.outwardDate !== '-' ? formatDate(item.outwardDate) : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Delivery Vehicle</span>
                      <span className="font-mono font-bold text-slate-900">{item.outwardVehicleNo || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Delivery Driver / Agent</span>
                      <span className="font-bold text-slate-800 truncate block">{item.deliveryPersonName || item.outwardDriverName || '-'}</span>
                    </div>
                    {item.ownerName && item.ownerName !== '-' && (
                      <div className="col-span-2">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Vehicle Owner</span>
                        <span className="font-bold text-slate-800 truncate block">{item.ownerName}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Financial & Freight Breakdown */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 text-slate-800 font-black text-xs uppercase tracking-wide">
                    <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Freight &amp; Payment Breakdown</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">To Pay Freight</span>
                      <span className="font-black text-rose-600 text-sm">{formatCurrency(toPay)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Paid Freight</span>
                      <span className="font-black text-sky-600 text-sm">{formatCurrency(paid)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">T.B.B. (Billed)</span>
                      <span className="font-black text-indigo-600 text-sm">{formatCurrency(tbb)}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Freight</span>
                      <span className="font-black text-slate-900 text-sm">{formatCurrency(totalFreight)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-200">
                <div>
                  {isPending && (
                    <button
                      onClick={() => {
                        setViewingItem(null);
                        navigate('/outward/new', { state: { prefillLR: item.lrNo } });
                      }}
                      className="w-full sm:w-auto px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-xs"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      <span>Dispatch LR in Outward</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePrintLR(item)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-blue-700 text-white font-bold rounded-xl hover:bg-blue-800 transition-colors flex items-center justify-center space-x-1.5 text-xs shadow-xs"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Consignment LR</span>
                  </button>
                  <button
                    onClick={() => setViewingItem(null)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};
