import React, { useState } from 'react';
import { Search, FileSpreadsheet, FileText, Calendar, MapPin, Tag } from 'lucide-react';
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
  compact = false,
  tableLayout = 'auto',
  className = '',
}) => {
  const isCompact = compact || (columns && columns.length >= 10);

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stationFilter, setStationFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [consignerFilter, setConsignerFilter] = useState('ALL');
  const [consigneeFilter, setConsigneeFilter] = useState('ALL');

  // Extract station options dynamically from data rows
  const stationOptions = Array.from(
    new Set(
      data
        .flatMap((row) => [row.from, row.ctTo, row.toStation, row.station, row.fromStation])
        .filter(Boolean)
    )
  );

  // Extract consigner & consignee options dynamically from data rows
  const consignerOptions = Array.from(
    new Set(
      data
        .flatMap((row) => {
          const val = row.consignorName || row.consignor || row.consigners;
          if (typeof val === 'string') return val.split(', ');
          return [];
        })
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );

  const consigneeOptions = Array.from(
    new Set(
      data
        .flatMap((row) => {
          const val = row.consigneeName || row.consignee || row.consignees;
          if (typeof val === 'string') return val.split(', ');
          return [];
        })
        .map((s) => s.trim())
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
          const isSameMonth =
            rowDateObj.getMonth() === todayObj.getMonth() &&
            rowDateObj.getFullYear() === todayObj.getFullYear();
          if (!isSameMonth) return false;
        } else if (dateFilter === 'CUSTOM') {
          if (startDate && rowDateStrClean < startDate) return false;
          if (endDate && rowDateStrClean > endDate) return false;
        }
      }
    }

    // 3. Station Filter
    if (stationFilter !== 'ALL') {
      const rowStations = [
        row.from,
        row.ctTo,
        row.toStation,
        row.station,
        row.fromStation,
      ]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase());
      if (!rowStations.some((s) => s.includes(stationFilter.toLowerCase()))) return false;
    }

    // 4. Status Filter
    if (statusFilter !== 'ALL') {
      const rowStatus = String(row.status || '').toUpperCase();
      if (rowStatus !== statusFilter) return false;
    }

    // 5. Consigner Filter
    if (consignerFilter !== 'ALL') {
      const rowConsigner = String(row.consignorName || row.consignor || row.consigners || '');
      if (!rowConsigner.toLowerCase().includes(consignerFilter.toLowerCase())) return false;
    }

    // 6. Consignee Filter
    if (consigneeFilter !== 'ALL') {
      const rowConsignee = String(row.consigneeName || row.consignee || row.consignees || '');
      if (!rowConsignee.toLowerCase().includes(consigneeFilter.toLowerCase())) return false;
    }

    return true;
  });

  const handleSelectAllChange = (e) => {
    if (onSelectAll) {
      onSelectAll(e.target.checked, filteredData);
    }
  };

  const isAllSelected =
    filteredData.length > 0 && filteredData.every((r) => selectedIds.includes(r.id));
  const isSomeSelected =
    filteredData.some((r) => selectedIds.includes(r.id)) && !isAllSelected;

  // Determine which columns are numeric totals
  const isTotalColumn = (col) => {
    if (col.type === 'currency' || col.showTotal) return true;
    const k = (col.key || '').toLowerCase();
    return (
      k.includes('pkg') ||
      k.includes('qty') ||
      k.includes('topay') ||
      k.includes('tbb') ||
      k.includes('paid') ||
      k.includes('freight') ||
      k.includes('amount') ||
      k.includes('money')
    );
  };

  const totalColIndices = columns
    .map((col, idx) => (isTotalColumn(col) ? idx : -1))
    .filter((idx) => idx !== -1);

  const firstTotalIndex = totalColIndices.length > 0 ? totalColIndices[0] : -1;
  const labelIndex = firstTotalIndex > 0 ? firstTotalIndex - 1 : 0;

  const renderCell = (row, col) => {
    let cellVal = row[col.key];
    if (col.render) {
      return col.render(row);
    } else if (col.type === 'status') {
      return <StatusBadge status={cellVal} />;
    } else if (col.type === 'currency') {
      return formatCurrency(cellVal);
    } else if (col.type === 'date') {
      return formatDate(cellVal);
    }
    return cellVal ?? '-';
  };

  return (
    <div className={`bg-white rounded-2xl shadow-2xs border border-slate-200/90 overflow-hidden ${className}`}>
      {/* Table Filter Controls Header Bar */}
      <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-700">
        {/* Date Filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500 font-bold">Date:</span>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs text-xs"
          >
            <option value="ALL">All Dates</option>
            <option value="TODAY">Today</option>
            <option value="THIS_WEEK">This Week</option>
            <option value="THIS_MONTH">This Month</option>
            <option value="CUSTOM">Custom Date</option>
          </select>

          {dateFilter === 'CUSTOM' && (
            <div className="flex items-center space-x-1.5 bg-white px-2 py-1 border border-slate-200 rounded-lg shadow-2xs">
              <span className="text-slate-400 text-[10px]">From</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-1 py-0.5 border border-slate-200 rounded text-xs font-semibold text-slate-800"
              />
              <span className="text-slate-400 text-[10px]">To</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-1 py-0.5 border border-slate-200 rounded text-xs font-semibold text-slate-800"
              />
            </div>
          )}
        </div>

        {/* Station Filter */}
        <div className="flex items-center space-x-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500 font-bold">Station:</span>
          <select
            value={stationFilter}
            onChange={(e) => setStationFilter(e.target.value)}
            className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs text-xs"
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
        <div className="flex items-center space-x-1.5">
          <Tag className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500 font-bold">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs text-xs"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">PENDING</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="DISPATCHED">DISPATCHED</option>
          </select>
        </div>

        {/* Consigner Filter */}
        {consignerOptions.length > 0 && (
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-bold">Consigner:</span>
            <select
              value={consignerFilter}
              onChange={(e) => setConsignerFilter(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs text-xs max-w-[150px] truncate"
            >
              <option value="ALL">All Consigners</option>
              {consignerOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Consignee Filter */}
        {consigneeOptions.length > 0 && (
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-bold">Consignee:</span>
            <select
              value={consigneeFilter}
              onChange={(e) => setConsigneeFilter(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs text-xs max-w-[150px] truncate"
            >
              <option value="ALL">All Consignees</option>
              {consigneeOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Table Toolbar */}
      <div className="p-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
        {searchable && (
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all shadow-inner"
            />
          </div>
        )}

        <div className="flex items-center space-x-2 flex-wrap">
          {onExportExcel && (
            <button
              onClick={() => onExportExcel(filteredData)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-all shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Excel</span>
            </button>
          )}

          {onExportPDF && (
            <button
              onClick={() => onExportPDF(filteredData)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-xl text-xs font-bold transition-all shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span>Export PDF</span>
            </button>
          )}

          {actionButtons}
        </div>
      </div>

      {/* Mobile Card View (NO Horizontal Scroll on Mobile Screens) */}
      <div className="sm:hidden divide-y divide-slate-100 bg-white">
        {filteredData.length === 0 ? (
          <div className="p-8 text-center text-slate-400 font-medium text-xs">
            No records found matching filters.
          </div>
        ) : (
          filteredData.map((row, rowIdx) => {
            const isRowSelected = selectedIds.includes(row.id);
            const actionCol = columns.find((c) => c.key === 'actions');
            const dataCols = columns.filter((c) => c.key !== 'actions');
            const primaryCol = dataCols[0];
            const statusCol = dataCols.find((c) => c.type === 'status');
            const secondaryCols = dataCols.slice(1);

            return (
              <div
                key={row.id || rowIdx}
                className={`p-3.5 space-y-2 transition-colors ${
                  isRowSelected ? 'bg-orange-50/70' : rowIdx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 min-w-0">
                    {selectable && (
                      <input
                        type="checkbox"
                        checked={isRowSelected}
                        onChange={() => onSelectRow && onSelectRow(row)}
                        className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer flex-shrink-0"
                      />
                    )}
                    {primaryCol && (
                      <div className="font-black text-xs text-[#0b2545] truncate">
                        {renderCell(row, primaryCol)}
                      </div>
                    )}
                  </div>
                  {statusCol && (
                    <div className="flex-shrink-0">
                      {renderCell(row, statusCol)}
                    </div>
                  )}
                </div>

                {/* 2-column key-value grid for secondary details */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-700 pt-1">
                  {secondaryCols
                    .filter((c) => c.type !== 'status')
                    .map((col, cIdx) => (
                      <div key={cIdx} className="min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block truncate">
                          {col.label}
                        </span>
                        <div className="text-xs font-semibold text-slate-800 truncate">
                          {renderCell(row, col)}
                        </div>
                      </div>
                    ))}
                </div>

                {/* Actions row */}
                {actionCol && (
                  <div className="flex items-center justify-end pt-1.5 border-t border-slate-100">
                    {renderCell(row, actionCol)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table Container (hidden on mobile) */}
      <div className="hidden sm:block w-full overflow-x-auto">
        <table className={`w-full text-slate-800 border-collapse table-${tableLayout}`}>
          <thead className="bg-slate-100/90 text-[#0b2545] uppercase font-black text-[10px] tracking-wider border-b-2 border-slate-200">
            <tr>
              {selectable && (
                <th className="p-3 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = isSomeSelected;
                    }}
                    onChange={handleSelectAllChange}
                    className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                  />
                </th>
              )}

              {columns.map((col, idx) => {
                const isAction = col.key === 'actions';
                const isCenter =
                  isAction || col.type === 'status' || col.align === 'center' || col.key === 'pkg';
                const isRight = col.type === 'currency' || col.align === 'right';
                const alignCls = isRight ? 'text-right' : isCenter ? 'text-center' : 'text-left';
                const widthCls = col.width
                  ? col.width
                  : isAction
                  ? isCompact
                    ? 'w-16 min-w-[62px]'
                    : 'w-20 min-w-[76px]'
                  : '';

                return (
                  <th
                    key={idx}
                    className={`p-3 ${alignCls} ${widthCls} whitespace-nowrap select-none`}
                  >
                    {col.label}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="p-8 text-center text-slate-400 font-medium text-xs"
                >
                  No records found matching filters.
                </td>
              </tr>
            ) : (
              filteredData.map((row, rowIdx) => {
                const isRowSelected = selectedIds.includes(row.id);
                return (
                  <tr
                    key={row.id || rowIdx}
                    className={`hover:bg-orange-50/40 transition-colors ${
                      isRowSelected ? 'bg-orange-50/70' : rowIdx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'
                    }`}
                  >
                    {selectable && (
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isRowSelected}
                          onChange={() => onSelectRow && onSelectRow(row)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
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

                      const isAction = col.key === 'actions';
                      const isCenter =
                        isAction || col.type === 'status' || col.align === 'center' || col.key === 'pkg';
                      const isRight = col.type === 'currency' || col.align === 'right';
                      const isNumOrDate =
                        col.nowrap ||
                        col.type === 'status' ||
                        col.type === 'currency' ||
                        col.type === 'date' ||
                        col.key === 'type' ||
                        col.key === 'receiptNo' ||
                        col.key === 'lrNo' ||
                        col.key === 'inwardNo' ||
                        col.key === 'outwardNo' ||
                        col.key === 'vehicleNo' ||
                        col.key === 'pkg' ||
                        col.key === 'totalQty' ||
                        col.key === 'srNo';

                      const paddingCls = isCompact ? 'px-2 py-2' : 'px-3 py-2.5';
                      const textCls = isCompact ? 'text-[11px]' : 'text-xs';
                      const alignCls = isRight ? 'text-right font-black' : isCenter ? 'text-center' : 'text-left';
                      const isBadgeCol = col.type === 'status' || col.key === 'type';
                      const wrapCls =
                        isAction || isRight || isCenter || isNumOrDate || isBadgeCol
                          ? 'whitespace-nowrap'
                          : 'truncate';
                      const widthCls = col.width
                        ? col.width
                        : isAction
                        ? isCompact
                          ? 'w-16 min-w-[62px]'
                          : 'w-20 min-w-[76px]'
                        : col.type === 'status'
                        ? 'min-w-[96px]'
                        : col.key === 'type'
                        ? 'min-w-[105px]'
                        : isNumOrDate
                        ? 'whitespace-nowrap'
                        : isCompact
                        ? 'max-w-[110px] truncate'
                        : 'max-w-[140px] truncate';

                      return (
                        <td
                          key={colIdx}
                          className={`${paddingCls} font-semibold text-slate-800 ${textCls} leading-snug ${alignCls} ${wrapCls} ${widthCls} ${
                            col.className || ''
                          }`}
                          title={!col.render && typeof row[col.key] === 'string' ? row[col.key] : undefined}
                        >
                          {cellVal ?? '-'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>

          {/* TOTAL Summary Footer Row */}
          {showTotal && filteredData.length > 0 && (() => {
            const grandTotalSum = filteredData.reduce((acc, curr) => {
              const toPay = Number(curr.toPayAmount ?? curr.totalToPay) || 0;
              const tbb = Number(curr.tbbAmount ?? curr.totalTbb) || 0;
              const paid = Number(curr.paidAmount ?? curr.totalPaid) || 0;
              const sum = toPay + tbb + paid;
              return acc + (sum || Number(curr.totalFreight || curr.freight) || 0);
            }, 0);

            const lastTotalIndex =
              totalColIndices.length > 0 ? totalColIndices[totalColIndices.length - 1] : -1;
            const hasExplicitTotalCol = columns.some((c) =>
              ['totalfreight', 'totalmoney', 'grandtotal', 'netamount'].includes(
                (c.key || '').toLowerCase()
              )
            );
            const grandTotalColIndex =
              !hasExplicitTotalCol &&
              lastTotalIndex !== -1 &&
              lastTotalIndex + 1 < columns.length &&
              columns[lastTotalIndex + 1].key !== 'actions'
                ? lastTotalIndex + 1
                : -1;

            const padCls = isCompact ? 'px-2 py-2' : 'px-3 py-2.5';
            const fTextCls = isCompact ? 'text-[11px]' : 'text-xs';

            return (
              <tfoot className={`bg-blue-50/80 border-t-2 border-slate-300 font-black text-slate-900 ${fTextCls}`}>
                <tr>
                  {selectable && <td className="p-3"></td>}
                  {columns.map((col, colIdx) => {
                    const isAction = col.key === 'actions';

                    if (colIdx === labelIndex) {
                      return (
                        <td
                          key={colIdx}
                          className={`${padCls} text-right font-black tracking-wider uppercase text-slate-900 whitespace-nowrap`}
                        >
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
                          <td
                            key={colIdx}
                            className={`${padCls} font-black text-slate-900 text-center whitespace-nowrap`}
                          >
                            {sum} Pkgs
                          </td>
                        );
                      }

                      return (
                        <td
                          key={colIdx}
                          className={`${padCls} font-black text-[#1d4ed8] text-right whitespace-nowrap`}
                        >
                          {formatCurrency(sum)}
                        </td>
                      );
                    }

                    if (colIdx === grandTotalColIndex) {
                      return (
                        <td
                          key={colIdx}
                          className={`${isCompact ? 'px-1 py-1.5' : 'px-2 py-2'} text-center whitespace-nowrap`}
                        >
                          <span
                            className="inline-flex items-center px-2 py-0.5 text-[10px] font-black text-emerald-950 bg-emerald-100 rounded border border-emerald-300 shadow-2xs"
                            title="Total Freight (To Pay + TBB + Paid)"
                          >
                            Total: {formatCurrency(grandTotalSum)}
                          </span>
                        </td>
                      );
                    }

                    const widthCls = col.width
                      ? col.width
                      : isAction
                      ? isCompact
                        ? 'w-16 min-w-[62px]'
                        : 'w-20 min-w-[76px]'
                      : '';

                    return <td key={colIdx} className={`${padCls} ${widthCls}`}></td>;
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
