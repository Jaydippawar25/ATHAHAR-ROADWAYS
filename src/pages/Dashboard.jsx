import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDownLeft,
  PackageCheck,
  ArrowUpRight,
  Truck,
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
  Calendar,
  Layers,
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
    <div className="space-y-5 max-w-full">
      {/* Hero Operational Hub Banner matching reference mockup */}
      <div className="bg-gradient-to-r from-[#0d2358] via-[#102d73] to-[#163a94] rounded-2xl p-6 text-white shadow-lg border border-blue-900/40 flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        {/* Subtle background glow effect */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-white/10 text-blue-200 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-white/10 backdrop-blur-xs flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>GODOWN SUMMARY &bull; SANGLI TERMINAL &mdash; ATHAHAR ROADWAYS</span>
            </span>
            <span className="bg-sky-950/80 text-sky-300 border border-sky-500/30 text-[10px] font-mono font-black px-2 py-0.5 rounded tracking-wider">
              GATE-01 ACTIVE
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
            ATHAHAR ROADWAYS
          </h2>

          <p className="text-blue-100 text-xs sm:text-sm font-medium tracking-tight">
            NEXT TO PARVATI CRANE, VAKHAR BHAG, SANGLI-416416 &bull; HELPLINE: 9370229449 / 9850329449
          </p>
        </div>

        <div className="flex items-center space-x-3 flex-shrink-0 z-10">
          <Link
            to="/inward/new"
            className="inline-flex items-center space-x-2 bg-white text-[#0d2358] hover:bg-slate-100 font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4 text-[#0d2358]" />
            <span>New Inward Entry</span>
            <span className="bg-slate-100 border border-slate-300 text-slate-600 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
              Alt+N
            </span>
          </Link>
          <Link
            to="/outward/new"
            className="inline-flex items-center space-x-2 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-[0.98]"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Process Outward</span>
            <span className="bg-sky-700 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
              Alt+O
            </span>
          </Link>
        </div>
      </div>

      {/* Universal Search & Filter Toolbar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Search input with keyboard shortcut */}
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Quick search by LR No., Inward Memo, Vehicle No., Consignee, Consignor..."
            className="w-full pl-10 pr-20 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all shadow-inner"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm('')}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="bg-white border border-slate-200 text-slate-400 text-[10px] font-mono px-1.5 py-0.5 rounded shadow-2xs">
                Ctrl+K
              </span>
            )}
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center space-x-2 flex-wrap">
          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
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
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
          >
            <option value="all">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
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
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
            title="Reset Filters"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4 Primary Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Inward LRs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Total Inward LRs
            </span>
            <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {totalInwardCount}
            </span>
            <span className="text-xs font-bold text-slate-500">LRs</span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs">
            <span className="font-semibold text-slate-500">{totalInwardPackages.toLocaleString()} Packages</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
              &nearr; +12%
            </span>
          </div>
        </div>

        {/* Card 2: Pending Stock (Godown) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Pending Stock (Godown)
            </span>
            <div className="p-2 bg-blue-50 text-[#1d4ed8] rounded-xl">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-blue-600 tracking-tight">
              {totalPendingCount}
            </span>
            <span className="text-xs font-bold text-slate-500">LRs</span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs">
            <span className="font-semibold text-slate-500">{totalPendingPackages.toLocaleString()} Packages</span>
            <span className="text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded text-[11px]">
              Awaiting Outward
            </span>
          </div>
        </div>

        {/* Card 3: Dispatched Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Dispatched Today
            </span>
            <div className="p-2 bg-sky-50 text-[#0284c7] rounded-xl">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {totalDispatchedCount}
            </span>
            <span className="text-xs font-bold text-slate-500">LRs</span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs">
            <span className="font-semibold text-slate-500">{totalDispatchedPackages.toLocaleString()} Packages</span>
            <span className="text-slate-700 font-bold text-[11px]">
              {dispatchRate}% Dispatch Rate
            </span>
          </div>
        </div>

        {/* Card 4: Pending Freight (To Pay) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Pending Freight (To Pay)
            </span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <span className="font-black text-sm">&#8377;</span>
            </div>
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(totalToPayPending)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs">
            <span className="font-semibold text-slate-500">{pendingStockToPayCount} Freight Vouchers</span>
            <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded text-[11px]">
              To Be Collected
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
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 tracking-tight">
                    Pending Stock (Ready for Outward)
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Sangli Godown Floor Bays A, B &amp; C
                  </p>
                </div>
              </div>

              {/* Segmented Filter Pills */}
              <div className="flex items-center space-x-1 bg-slate-100/80 p-1 rounded-xl text-xs font-bold text-slate-600">
                <button
                  onClick={() => setStockTab('all')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    stockTab === 'all'
                      ? 'bg-white text-blue-700 shadow-2xs font-black'
                      : 'hover:text-slate-900'
                  }`}
                >
                  All ({pendingStock.length})
                </button>
                <button
                  onClick={() => setStockTab('priority')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    stockTab === 'priority'
                      ? 'bg-white text-blue-700 shadow-2xs font-black'
                      : 'hover:text-slate-900'
                  }`}
                >
                  Priority ({pendingStock.filter((i) => Number(i.toPayAmount || 0) > 2000).length})
                </button>
                <button
                  onClick={() => setStockTab('heavy')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    stockTab === 'heavy'
                      ? 'bg-white text-blue-700 shadow-2xs font-black'
                      : 'hover:text-slate-900'
                  }`}
                >
                  Heavy ({pendingStock.filter((i) => Number(i.pkg || 0) >= 20).length})
                </button>
              </div>
            </div>

            {/* High Density Pending Stock Table */}
            <div className="overflow-x-auto">
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
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="text-slate-500 font-semibold">
              <span className="font-bold text-slate-800">
                {Math.min(5, filteredPending.length)} of {filteredPending.length}
              </span>{' '}
              records displayed &bull;{' '}
              <span className="font-bold text-blue-700">
                {selectedPackagesCount} Packages Selected
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <Link
                to="/pending"
                className="text-blue-700 hover:underline font-bold text-xs"
              >
                View All Pending Stock
              </Link>
              <button
                onClick={handleDispatchSelected}
                disabled={selectedStockIds.length === 0}
                className="bg-[#1d4ed8] hover:bg-blue-800 disabled:opacity-40 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs transition-all active:scale-[0.98]"
              >
                Dispatch Selected
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Inward Transactions Feed */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between overflow-hidden">
          <div>
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 tracking-tight">
                    Recent Inward Transactions
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Terminal Gate Inward Arrival Logs
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
            <div className="p-4 space-y-3">
              {filteredInwards.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs font-medium">
                  No inward arrival records yet.
                </div>
              ) : (
                filteredInwards.map((inw) => (
                  <div
                    key={inw.id}
                    className="p-3.5 rounded-xl border border-slate-200/80 hover:border-blue-300 hover:shadow-2xs transition-all bg-slate-50/40 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="bg-[#0f172a] text-white font-mono font-black text-[10px] px-2 py-0.5 rounded">
                          {inw.inwardNo}
                        </span>
                        <span className="font-bold text-xs text-slate-900">{inw.vehicleNo}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {formatDate(inw.date)}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 font-medium flex items-center justify-between">
                      <span>Origin: {inw.from || 'MUMBAI'}</span>
                      <span className="text-slate-400">&bull;</span>
                      <span>Driver: {inw.driverName || 'DRIVER'}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                      <div className="flex items-center space-x-1.5 text-emerald-700 font-black text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{inw.totalQty} Pkg &bull; Unloaded &amp; Verified</span>
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
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 text-xs">
            <button
              onClick={() => {
                if (inwards[0]) handlePrintInward(inwards[0]);
              }}
              className="flex-1 py-2 px-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-2xs text-center"
            >
              Receipt Memo
            </button>
            <button
              onClick={handleExportInwardLog}
              className="flex-1 py-2 px-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-2xs text-center"
            >
              Export Log
            </button>
          </div>
        </div>
      </div>

      {/* Bottom 3 Facility & Logistics Operations Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Godown Capacity */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 uppercase tracking-tight">Godown Capacity</p>
            <p className="text-[11px] text-slate-400 font-medium">Floor bays at 68% utilization</p>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-lg font-black text-blue-700">
                {totalInwardPackages.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400 font-semibold">/ 2,700 Max PKG</span>
            </div>
          </div>
        </div>

        {/* Card 2: Next Linehaul Departure */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center space-x-4">
          <div className="p-3 bg-sky-50 text-[#0284c7] rounded-xl">
            <Route className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 uppercase tracking-tight">Next Linehaul Departure</p>
            <p className="text-[11px] text-slate-400 font-medium">Sangli &rarr; Mumbai NH-48</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-lg font-black text-slate-900">14:30</span>
              <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                Truck MH-10-AZ-9901
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Daily Cash Flow */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <Wallet className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 uppercase tracking-tight">Daily Cash Flow</p>
            <p className="text-[11px] text-slate-400 font-medium">To-Pay collected at gate</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-lg font-black text-emerald-700">
                {formatCurrency(totalToPayPending)}
              </span>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                Settled with Counter
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
