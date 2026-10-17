import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Link } from 'react-router-dom';
import {
  ArrowDownLeft,
  PackageCheck,
  ArrowUpRight,
  Truck,
  PlusCircle,
  Search,
  X,
  CheckCircle2,
} from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatDate } from '../utils/dateUtils';
import { formatCurrency } from '../utils/numberUtils';

export const Dashboard = () => {
  const { inwards, inwardItems, pendingStock, outwardItems } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  const totalInwardCount = inwardItems.length;
  const totalPendingCount = pendingStock.length;
  const totalDeliveredCount = outwardItems.length;

  const totalToPayPending = pendingStock.reduce(
    (acc, curr) => acc + (Number(curr.toPayAmount) || 0),
    0
  );

  const query = searchTerm.trim().toLowerCase();

  // Filter Pending Stock by search query
  const filteredPending = useMemo(() => {
    if (!query) return pendingStock;
    return pendingStock.filter((item) =>
      String(item.lrNo ?? '').toLowerCase().includes(query) ||
      String(item.inwardNo ?? '').toLowerCase().includes(query) ||
      String(item.consigneeName ?? '').toLowerCase().includes(query) ||
      String(item.consignorName ?? '').toLowerCase().includes(query) ||
      String(item.ctTo ?? '').toLowerCase().includes(query) ||
      String(item.memoNo ?? '').toLowerCase().includes(query) ||
      String(item.vehicleNo ?? '').toLowerCase().includes(query)
    );
  }, [pendingStock, query]);

  // Filter Inwards by search query
  const filteredInwards = useMemo(() => {
    if (!query) return inwards;
    return inwards.filter((inw) =>
      String(inw.inwardNo ?? '').toLowerCase().includes(query) ||
      String(inw.vehicleNo ?? '').toLowerCase().includes(query) ||
      String(inw.memoNo ?? '').toLowerCase().includes(query) ||
      String(inw.transporterName ?? '').toLowerCase().includes(query) ||
      String(inw.from ?? '').toLowerCase().includes(query) ||
      String(inw.consignorName ?? '').toLowerCase().includes(query) ||
      String(inw.consigneeName ?? '').toLowerCase().includes(query)
    );
  }, [inwards, query]);

  // Check matching Delivered (Outward) items
  const matchingDelivered = useMemo(() => {
    if (!query) return [];
    return outwardItems.filter((item) =>
      String(item.lrNo ?? '').toLowerCase().includes(query) ||
      String(item.outwardNo ?? '').toLowerCase().includes(query) ||
      String(item.consigneeName ?? '').toLowerCase().includes(query) ||
      String(item.consignorName ?? '').toLowerCase().includes(query) ||
      String(item.vehicleNo ?? '').toLowerCase().includes(query)
    );
  }, [outwardItems, query]);

  return (
    <div className="space-y-6">
      {/* Header Banner with Sangli Details & Quick Actions */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2 text-[11px] font-bold tracking-wider uppercase">
            <span className="bg-white/20 px-2.5 py-0.5 rounded-full border border-white/30 backdrop-blur-xs">
              GODOWN SUMMARY
            </span>
            <span className="text-blue-100">
              SANGLI TERMINAL &mdash; ATHARVA ROADWAYS
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            ATHARVA ROADWAYS Dashboard
          </h2>

          <p className="text-blue-100 text-xs sm:text-sm font-medium">
            NEXT TO PARVATI CRANE, VAKHAR BHAG, SANGLI-416416 &bull; MOB: 9370229449 / 9850329449
          </p>
        </div>

        <div className="flex items-center space-x-3 flex-shrink-0">
          <Link
            to="/inward/new"
            className="inline-flex items-center space-x-2 bg-sky-500 hover:bg-sky-400 text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow-md transition-all active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Inward Entry</span>
          </Link>
          <Link
            to="/outward/new"
            className="inline-flex items-center space-x-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-sm shadow-md transition-all active:scale-[0.98]"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Process Outward</span>
          </Link>
        </div>
      </div>

      {/* Universal Dashboard Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="relative flex items-center">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Quick search by LR No., Inward No., Vehicle No., Consignee, Consignor, Memo No..."
            className="w-full pl-11 pr-10 py-3 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all shadow-inner"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Live Search Indicator & Summary Counts */}
        {query && (
          <div className="flex flex-wrap items-center justify-between text-xs gap-2 pt-1 px-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-500">Search Results for:</span>
              <span className="font-black text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-md border border-sky-200">
                "{searchTerm}"
              </span>
              <span className="text-slate-300 font-bold">&bull;</span>
              <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {filteredPending.length} in Pending Stock
              </span>
              <span className="text-slate-300 font-bold">&bull;</span>
              <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                {filteredInwards.length} in Inwards
              </span>
              {matchingDelivered.length > 0 && (
                <>
                  <span className="text-slate-300 font-bold">&bull;</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {matchingDelivered.length} Delivered
                  </span>
                </>
              )}
            </div>

            <button
              onClick={() => setSearchTerm('')}
              className="text-xs font-bold text-slate-500 hover:text-slate-900 underline cursor-pointer"
            >
              Clear Filter
            </button>
          </div>
        )}

        {/* Matching Delivered LRs Alert Card */}
        {query && matchingDelivered.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs space-y-1.5">
            <div className="flex items-center justify-between font-bold text-emerald-900">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Found {matchingDelivered.length} Delivered LR(s) matching "{searchTerm}":</span>
              </div>
              <Link
                to="/all-entries"
                state={{ tab: 'outward_headers' }}
                className="text-emerald-700 hover:underline font-extrabold shrink-0"
              >
                View in All Entries &rarr;
              </Link>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {matchingDelivered.slice(0, 5).map((del) => (
                <span
                  key={del.id}
                  className="bg-white border border-emerald-300 text-emerald-950 px-2.5 py-1 rounded-lg font-semibold flex items-center space-x-1.5 shadow-2xs"
                >
                  <span className="font-black text-emerald-700">LR #{del.lrNo}</span>
                  <span className="text-slate-400">&bull;</span>
                  <span className="truncate max-w-[140px]">{del.consigneeName || del.consignorName || 'Delivered'}</span>
                  <span className="text-slate-400">&bull;</span>
                  <span className="font-bold text-slate-700">{del.pkg} Pkgs</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Inward LRs</p>
            <p className="text-2xl font-black text-slate-900">{totalInwardCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <PackageCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Pending Stock LRs</p>
            <p className="text-2xl font-black text-amber-600">{totalPendingCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Delivered LRs</p>
            <p className="text-2xl font-black text-emerald-600">{totalDeliveredCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Pending Freight (To Pay)</p>
            <p className="text-xl font-black text-slate-900">{formatCurrency(totalToPayPending)}</p>
          </div>
        </div>
      </div>

      {/* Tables grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Pending LRs */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 flex items-center space-x-2">
              <PackageCheck className="w-5 h-5 text-amber-500" />
              <span>
                Pending Stock {query ? `(${filteredPending.length} matches)` : '(Ready for Outward)'}
              </span>
            </h3>
            <Link to="/pending" className="text-xs font-semibold text-sky-600 hover:underline">
              View All
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="p-2">LR No.</th>
                  <th className="p-2">Inward Date</th>
                  <th className="p-2">PKG</th>
                  <th className="p-2">Consignee</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPending.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-4 text-center text-slate-400">
                      {query
                        ? `No pending stock items matching "${searchTerm}".`
                        : 'No pending stock items.'}
                    </td>
                  </tr>
                ) : (
                  filteredPending.slice(0, query ? 15 : 5).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2 font-bold text-sky-700">{item.lrNo}</td>
                      <td className="p-2">{formatDate(item.inwardDate || item.date)}</td>
                      <td className="p-2 font-semibold">{item.pkg}</td>
                      <td className="p-2 truncate max-w-[120px]">{item.consigneeName}</td>
                      <td className="p-2">
                        <StatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Inward Entries */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 flex items-center space-x-2">
              <ArrowDownLeft className="w-5 h-5 text-sky-500" />
              <span>
                Recent Inward Transactions {query ? `(${filteredInwards.length} matches)` : ''}
              </span>
            </h3>
            <Link
              to="/all-entries"
              state={{ tab: 'inward_headers' }}
              className="text-xs font-semibold text-sky-600 hover:underline"
            >
              View All
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="p-2">Inward No.</th>
                  <th className="p-2">Date</th>
                  <th className="p-2">Vehicle</th>
                  <th className="p-2">Total Qty</th>
                  <th className="p-2">Memo No.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInwards.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-4 text-center text-slate-400">
                      {query
                        ? `No inward transactions matching "${searchTerm}".`
                        : 'No inward transactions recorded.'}
                    </td>
                  </tr>
                ) : (
                  filteredInwards.slice(0, query ? 15 : 5).map((inw) => (
                    <tr key={inw.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2 font-bold text-slate-900">{inw.inwardNo}</td>
                      <td className="p-2">{formatDate(inw.date)}</td>
                      <td className="p-2 font-semibold text-slate-800">{inw.vehicleNo}</td>
                      <td className="p-2 font-bold text-sky-700">{inw.totalQty}</td>
                      <td className="p-2">{inw.memoNo || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
