import React from 'react';
import { useApp } from '../context/AppContext';
import { Link } from 'react-router-dom';
import {
  ArrowDownLeft,
  PackageCheck,
  ArrowUpRight,
  Truck,
  PlusCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatDate } from '../utils/dateUtils';
import { formatCurrency } from '../utils/numberUtils';

export const Dashboard = () => {
  const { inwards, inwardItems, pendingStock, outwardItems } = useApp();

  const totalInwardCount = inwardItems.length;
  const totalPendingCount = pendingStock.length;
  const totalDeliveredCount = outwardItems.length;

  const totalToPayPending = pendingStock.reduce(
    (acc, curr) => acc + (Number(curr.toPayAmount) || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header Banner (Matching Image 2 with Company Name & Address) */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2 text-[11px] font-bold tracking-wider uppercase">
            <span className="bg-white/20 px-2.5 py-0.5 rounded-full border border-white/30 backdrop-blur-xs">
              GODOWN SUMMARY
            </span>
            <span className="text-blue-100">
              SANGLI TERMINAL &mdash; ATHAHAR ROADWAYS
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            ATHAHAR ROADWAYS Dashboard
          </h2>

          <p className="text-blue-100 text-xs sm:text-sm font-medium">
            NEXT TO PARVATI CRANE, VAKHAR BHAG, SANGLI-416416 &bull; MOB: 9370229449 / 9850329449
          </p>
        </div>

        <div className="flex items-center space-x-3 flex-shrink-0">
          <Link
            to="/inward/new"
            className="inline-flex items-center space-x-2 bg-sky-500 hover:bg-sky-400 text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow-md transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Inward Entry</span>
          </Link>
          <Link
            to="/outward/new"
            className="inline-flex items-center space-x-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-sm shadow-md transition-all"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Process Outward</span>
          </Link>
        </div>
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
              <span>Pending Stock (Ready for Outward)</span>
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
                {pendingStock.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-4 text-center text-slate-400">
                      No pending stock items.
                    </td>
                  </tr>
                ) : (
                  pendingStock.slice(0, 5).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
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
              <span>Recent Inward Transactions</span>
            </h3>
            <Link to="/inward" className="text-xs font-semibold text-sky-600 hover:underline">
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
                {inwards.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-4 text-center text-slate-400">
                      No inward transactions recorded.
                    </td>
                  </tr>
                ) : (
                  inwards.slice(0, 5).map((inw) => (
                    <tr key={inw.id} className="hover:bg-slate-50">
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
