import React, { useState } from 'react';
import { Search, FileSpreadsheet, FileText } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { formatDate } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/numberUtils';

export const DataTable = ({
  columns,
  data = [],
  searchable = true,
  searchPlaceholder = 'Search records...',
  onExportExcel,
  onExportPDF,
  actionButtons,
  selectable = false,
  selectedIds = [],
  onSelectRow,
  onSelectAll,
  showTotal = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [stationFilter, setStationFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Extract station options dynamically from data rows
  const stationOptions = Array.from(
    new Set(
      data
        .flatMap((row) => [row.from, row.ctTo, row.toStation, row.station, row.fromStation])
        .filter(Boolean)
    )
  );

  const filteredData = data.filter((row) => {
    // 1. Search term filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchesSearch = Object.values(row).some((val) =>
        String(val || '').toLowerCase().includes(term)
      );
      if (!matchesSearch) return false;
    }

    // 2. Date Filter
    if (dateFilter !== 'ALL') {
      const rowDateStr = row.date || row.inwardDate || row.outwardDate || row.createdAt;
      if (rowDateStr) {
        const rowDateStrClean = String(rowDateStr).split('T')[0];
        const todayStr = new Date().toISOString().split('T')[0];

        if (dateFilter === 'TODAY') {
          if (rowDateStrClean !== todayStr) return false;
        } else if (dateFilter === 'THIS_WEEK') {
          const rowDateObj = new Date(rowDateStrClean);
          const todayObj = new Date();
          const diffDays = (todayObj - rowDateObj) / (1000 * 60 * 60 * 24);
          if (diffDays < 0 || diffDays > 7) return false;
        } else if (dateFilter === 'THIS_MONTH') {
          const rowDateObj = new Date(rowDateStrClean);
          const todayObj = new Date();
          const isSameMonth = rowDateObj.getMonth() === todayObj.getMonth() && rowDateObj.getFullYear() === todayObj.getFullYear();
          if (!isSameMonth) return false;
        }
      }
    }

    // 3. Station Filter
    if (stationFilter !== 'ALL') {
      const rowStation = row.from || row.ctTo || row.toStation || row.station || row.fromStation;
      if (String(rowStation || '').toLowerCase() !== String(stationFilter).toLowerCase()) {
        return false;
      }
    }

    // 4. Status Filter
    if (statusFilter !== 'ALL') {
      const rowStatus = row.status || 'PENDING';
      if (String(rowStatus).toUpperCase() !== String(statusFilter).toUpperCase()) {
        return false;
      }
    }

    return true;
  });

  const allSelected =
    filteredData.length > 0 &&
    filteredData.every((row) => selectedIds.includes(row.id));

  // Determine which columns have total values
  const isTotalColumn = (col) => {
    if (col.type === 'currency') return true;
    const k = (col.key || '').toLowerCase();
    return (
      k.includes('pkg') ||
      k.includes('qty') ||
      k.includes('topay') ||
      k.includes('tbb') ||
      k.includes('paid') ||
      k.includes('freight') ||
      k.includes('amount')
    );
  };

  const totalColIndices = columns
    .map((col, idx) => (isTotalColumn(col) ? idx : -1))
    .filter((idx) => idx !== -1);

  const firstTotalIndex = totalColIndices.length > 0 ? totalColIndices[0] : -1;
  const labelIndex = firstTotalIndex > 0 ? firstTotalIndex - 1 : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden space-y-0">
      {/* Table Filter Controls Header Bar (Matching media_1791444487889.png) */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-700">
        {/* Date Filter */}
        <div className="flex items-center space-x-2">
          <label className="text-slate-600 font-bold">Date:</label>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
          >
            <option value="ALL">All Dates</option>
            <option value="TODAY">Today</option>
            <option value="THIS_WEEK">This Week</option>
            <option value="THIS_MONTH">This Month</option>
          </select>
        </div>

        {/* Station Filter */}
        <div className="flex items-center space-x-2">
          <label className="text-slate-600 font-bold">Station:</label>
          <select
            value={stationFilter}
            onChange={(e) => setStationFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
          >
            <option value="ALL">All Stations</option>
            {stationOptions.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-2">
          <label className="text-slate-600 font-bold">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">PENDING</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="DISPATCHED">DISPATCHED</option>
          </select>
        </div>
      </div>

      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
        {searchable && (
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
        )}

        <div className="flex items-center space-x-2">
          {onExportExcel && (
            <button
              onClick={() => onExportExcel(filteredData)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export Excel</span>
            </button>
          )}

          {onExportPDF && (
            <button
              onClick={() => onExportPDF(filteredData)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-semibold transition-colors"
            >
              <FileText className="w-4 h-4 text-rose-600" />
              <span>Export PDF</span>
            </button>
          )}

          {actionButtons}
        </div>
      </div>

      {/* Table Container */}
      <div className="w-full overflow-x-auto no-scrollbar">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[10px] sm:text-[11px] uppercase tracking-tight">
            <tr>
              {selectable && (
                <th className="px-1.5 py-2 w-7 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onSelectAll && onSelectAll(e.target.checked, filteredData)}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                </th>
              )}
              {columns.map((col, idx) => (
                <th key={idx} className="px-1.5 py-2 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {filteredData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="p-8 text-center text-slate-500 font-medium"
                >
                  No records found.
                </td>
              </tr>
            ) : (
              filteredData.map((row, rowIdx) => (
                <tr
                  key={row.id || rowIdx}
                  className={`hover:bg-sky-50/50 transition-colors ${
                    selectedIds.includes(row.id) ? 'bg-sky-50/80' : ''
                  }`}
                >
                  {selectable && (
                    <td className="px-1.5 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.id)}
                        onChange={() => onSelectRow && onSelectRow(row)}
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                    </td>
                  )}
                  {columns.map((col, colIdx) => {
                    let cellVal = row[col.key];

                    if (col.render) {
                      cellVal = col.render(row);
                    } else if (col.type === 'status') {
                      cellVal = <StatusBadge status={cellVal} />;
                    } else if (col.type === 'currency') {
                      cellVal = formatCurrency(cellVal);
                    } else if (col.type === 'date') {
                      cellVal = formatDate(cellVal);
                    }

                    return (
                      <td key={colIdx} className="px-1.5 py-1.5 font-medium text-slate-800 text-[11px] sm:text-xs">
                        {cellVal ?? '-'}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>

          {/* TOTAL Summary Footer Row (Matching Image 1 + Grand Total Sum) */}
          {showTotal && filteredData.length > 0 && (() => {
            const grandTotalSum = filteredData.reduce((acc, curr) => {
              const toPay = Number(curr.toPayAmount ?? curr.totalToPay) || 0;
              const tbb = Number(curr.tbbAmount ?? curr.totalTbb) || 0;
              const paid = Number(curr.paidAmount ?? curr.totalPaid) || 0;
              const sum = toPay + tbb + paid;
              return acc + (sum || Number(curr.totalFreight || curr.freight) || 0);
            }, 0);

            return (
              <tfoot className="bg-sky-50/90 border-t-2 border-slate-300 font-extrabold text-slate-900 text-[11px] sm:text-xs">
                <tr>
                  {selectable && <td className="px-1.5 py-1.5"></td>}
                  {columns.map((col, colIdx) => {
                    if (colIdx === labelIndex) {
                      return (
                        <td key={colIdx} className="px-1.5 py-1.5 text-right font-black tracking-wider uppercase text-slate-900">
                          TOTAL:
                        </td>
                      );
                    }

                    if (isTotalColumn(col)) {
                      const k = (col.key || '').toLowerCase();
                      const sum = filteredData.reduce(
                        (acc, curr) => acc + (Number(curr[col.key]) || 0),
                        0
                      );

                      if (k.includes('pkg') || k.includes('qty')) {
                        return (
                          <td key={colIdx} className="px-1.5 py-1.5 font-black text-slate-900 whitespace-nowrap">
                            {sum} Pkgs
                          </td>
                        );
                      }

                      return (
                        <td key={colIdx} className="px-1.5 py-1.5 font-extrabold text-[#1e295b] whitespace-nowrap">
                          {formatCurrency(sum)}
                        </td>
                      );
                    }

                    if (colIdx === columns.length - 1) {
                      return (
                        <td key={colIdx} className="px-1.5 py-1 font-black text-emerald-900 bg-emerald-100/90 rounded text-center whitespace-nowrap border border-emerald-300 shadow-xs" title="To Pay + TBB + Paid = Total">
                          Total: {formatCurrency(grandTotalSum)}
                        </td>
                      );
                    }

                    return <td key={colIdx} className="px-1.5 py-1.5"></td>;
                  })}
                </tr>
              </tfoot>
            );
          })()}
        </table>
      </div>
    </div>
  );
};
