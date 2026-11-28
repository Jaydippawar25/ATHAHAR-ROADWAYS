import React, { useState, useEffect } from 'react';
import { ShieldCheck, History, Download, Trash2, RotateCcw, AlertTriangle, Layers, Truck, FileText, CheckCircle2 } from 'lucide-react';
import { getDraftVault, deleteFromVault, clearVault } from '../../services/draftVaultService';
import * as XLSX from 'xlsx';

export const DraftVaultModal = ({ isOpen, onClose, type = 'inward', onRestoreDraft }) => {
  const [vaultList, setVaultList] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  const loadVault = () => {
    setVaultList(getDraftVault(type));
  };

  useEffect(() => {
    if (isOpen) {
      loadVault();
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this backup from the Vault?')) {
      deleteFromVault(type, id);
      loadVault();
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear ALL backup history? This cannot be undone.')) {
      clearVault(type);
      loadVault();
    }
  };

  const handleExportExcel = (entry) => {
    try {
      const items = entry.stagedItems || [];
      const rows = items.map((item, idx) => ({
        'Sr. No': item.srNo || idx + 1,
        'LR No.': item.lrNo || '',
        Date: item.date || entry.headerData?.date || '',
        'Packages (PKG)': item.pkg || 1,
        Consignor: item.consignorName || '',
        Consignee: item.consigneeName || '',
        'Station (To)': item.ctTo || item.destinationStation || '',
        'Invoice No.': item.invoiceNo || '',
        'To Pay': item.toPayAmount || 0,
        TBB: item.tbbAmount || 0,
        Paid: item.paidAmount || 0,
        Transporter: entry.headerData?.transporterName || '',
        'Vehicle No': entry.headerData?.vehicleNo || '',
        'Memo No': entry.headerData?.memoNo || '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Vault_Backup');
      const filename = `Vault_${type}_${entry.manifestNo || 'Manifest'}_${new Date(entry.savedAt).toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (e) {
      alert('Error exporting Excel: ' + (e?.message || e));
    }
  };

  const handleRestore = (entry) => {
    if (onRestoreDraft) {
      onRestoreDraft(entry);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* MODAL HEADER */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-500/20 border border-blue-400/30 rounded-2xl">
              <ShieldCheck className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                Manifest Data Vault & Auto-Recovery
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full">
                  Protected
                </span>
              </h2>
              <p className="text-xs text-blue-200/80">
                Automatic rolling backups of every manifest and LR entered. Never lose a consignment.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-xl hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        {/* MODAL CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {vaultList.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400">
                <History className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">No Vault Backups Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Any manifest you start typing in will be continuously and safely saved here in real time.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-100">
                <span className="font-bold">
                  {vaultList.length} Backup{vaultList.length > 1 ? 's' : ''} Stored Locally
                </span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear All History
                </button>
              </div>

              {vaultList.map((entry) => {
                const dateStr = entry.savedAt
                  ? new Date(entry.savedAt).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Recent';

                return (
                  <div
                    key={entry.id}
                    className="p-4 bg-slate-50 hover:bg-blue-50/40 border border-slate-200 hover:border-blue-300 rounded-2xl transition-all shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="px-2.5 py-1 bg-blue-100 text-blue-800 font-black text-xs rounded-lg border border-blue-200">
                          #{entry.manifestNo || 'Consignment'}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[11px] rounded-lg border border-emerald-200">
                          <Layers className="w-3 h-3" />
                          {entry.itemCount || entry.stagedItems?.length || 0} LR Items
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          Saved: {dateStr}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 pt-1">
                        <div>
                          <span className="text-slate-400 font-semibold">Transporter:</span>{' '}
                          <span className="font-medium truncate">{entry.headerData?.transporterName || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-semibold">Vehicle:</span>{' '}
                          <span className="font-medium font-mono">{entry.headerData?.vehicleNo || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-semibold">Memo:</span>{' '}
                          <span className="font-medium">{entry.headerData?.memoNo || '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 w-full sm:w-auto flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleExportExcel(entry)}
                        title="Download backup as Excel"
                        className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Excel</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRestore(entry)}
                        className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore Manifest</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id)}
                        title="Delete snapshot"
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>All manifests are safely encrypted in your browser storage.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
