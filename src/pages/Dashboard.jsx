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
} from 'lucide-react';
import { formatDate } from '../utils/dateUtils';
import { formatCurrency } from '../utils/numberUtils';
import { printRecordDetails, exportToExcel } from '../services/exportService';
import { Modal } from '../components/common/Modal';

export const Dashboard = () => {
  const { inwards, inwardItems, pendingStock, outwardItems, masters } = useApp();
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

  // Derived KPI Calculations
  const totalInwardCount = inwardItems.length;
  const totalInwardPackages = inwardItems.reduce((acc, curr) => acc + (Number(curr.pkg) || 0), 0);
  const totalPendingCount = pendingStock.length;
  const totalPendingPackages = pendingStock.reduce((acc, curr) => acc + (Number(curr.pkg) || 0), 0);
  const totalDispatchedCount = outwardItems.length;
  const totalDispatchedPackages = outwardItems.reduce((acc, curr) => acc + (Number(curr.pkg) || 0), 0);

  const totalToPayPending = pendingStock.reduce(
    (acc, curr) => acc + (Number(curr.toPayAmount) || 0),
    0
  );
  const pendingStockToPayCount = pendingStock.filter((i) => Number(i.toPayAmount) > 0).length;

  const dispatchRate =
    totalInwardCount > 0
      ? ((totalDispatchedCount / totalInwardCount) * 100).toFixed(1)
      : '0.0';

  const query = searchTerm.trim().toLowerCase();

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
    printRecordDetails({
      title: `Lorry Receipt #${item.lrNo}`,
      fields: [
        { label: 'LR No.', value: item.lrNo },
        { label: 'Inward Date', value: formatDate(item.inwardDate || item.date) },
        { label: 'Inward No.', value: item.inwardNo || '-' },
        { label: 'Memo No.', value: item.memoNo || '-' },
        { label: 'Vehicle No.', value: item.vehicleNo || '-' },
        { label: 'Destination', value: item.ctTo || '-' },
        { label: 'Consignor', value: item.consignorName || '-' },
        { label: 'Consignee', value: item.consigneeName || '-' },
        { label: 'Packages', value: item.pkg },
        { label: 'To Pay (₹)', value: formatCurrency(item.toPayAmount) },
        { label: 'Paid (₹)', value: formatCurrency(item.paidAmount) },
        { label: 'T.B.B. (₹)', value: formatCurrency(item.tbbAmount) },
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

      {/* Modal for viewing LR item details */}
      <Modal
        isOpen={!!viewingItem}
        onClose={() => setViewingItem(null)}
        title={`Lorry Receipt #${viewingItem?.lrNo}`}
      >
        {viewingItem && (
          <div className="space-y-4 text-xs text-slate-700">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 font-bold block">LR NUMBER</span>
                <span className="font-black text-sm text-blue-700">{viewingItem.lrNo}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">DATE</span>
                <span className="font-bold">{formatDate(viewingItem.inwardDate || viewingItem.date)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">CONSIGNOR</span>
                <span className="font-bold">{viewingItem.consignorName || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">CONSIGNEE</span>
                <span className="font-bold">{viewingItem.consigneeName || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">DESTINATION</span>
                <span className="font-bold">{viewingItem.ctTo || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">PACKAGES</span>
                <span className="font-black text-sm">{viewingItem.pkg}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">TO PAY AMOUNT</span>
                <span className="font-black text-rose-600">{formatCurrency(viewingItem.toPayAmount)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">STATUS</span>
                <span className="font-black text-emerald-700">{viewingItem.status}</span>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => handlePrintLR(viewingItem)}
                className="px-4 py-2 bg-blue-700 text-white font-bold rounded-xl hover:bg-blue-800 transition-colors flex items-center space-x-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print LR</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
