import React from 'react';
import { Calendar, CloudOff, RefreshCw, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

export const TopHeader = () => {
  const { syncStatus } = useApp();
  const { user } = useAuth();

  const currentDateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const isConnected = syncStatus?.state === 'connected';
  const isSyncing = syncStatus?.state === 'syncing' || syncStatus?.state === 'connecting';

  return (
    <header className="bg-white border-b border-slate-200/90 px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs sticky top-0 z-30">
      <div className="flex items-center space-x-3">
        <div className="bg-[#0284c7] text-white w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm shadow-2xs flex-shrink-0">
          A
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-sm font-black tracking-wide text-slate-900 uppercase">
              ATHARVA ROADWAYS
            </h1>
            <span className="bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-tight">
              Godown Hub 01
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono tracking-tight">
            NEXT TO PARVATI CRANE, VAKHAR BHAG, SANGLI-416416 &nbsp;|&nbsp; MOB: 9370229449 / 9850329449
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3 w-fit self-end sm:self-auto">
        {/* Live Cloud Sync Status Pill */}
        <Link
          to="/settings"
          title={`Data Sync Status: ${syncStatus?.message || 'Ready'}${
            syncStatus?.lastSync ? ` (Last: ${syncStatus.lastSync})` : ''
          }`}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
            isConnected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
              : isSyncing
              ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
              : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {isSyncing ? (
            <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
          ) : isConnected ? (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          ) : (
            <CloudOff className="w-3 h-3 text-slate-500" />
          )}

          <span>
            {isSyncing ? 'Syncing...' : isConnected ? 'Cloud Synced' : 'Local Mode'}
          </span>
        </Link>

        {/* Calendar Date Pill */}
        <div className="flex items-center space-x-1.5 text-xs text-slate-600 font-medium px-2 py-1">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{currentDateStr}</span>
        </div>

        {/* User Avatar Circle */}
        <Link
          to="/settings"
          className="w-7 h-7 rounded-full bg-[#0f172a] text-white flex items-center justify-center font-bold text-xs hover:ring-2 hover:ring-blue-500/50 transition-all flex-shrink-0"
          title={user?.email || 'Settings'}
        >
          <User className="w-3.5 h-3.5" />
        </Link>
      </div>
    </header>
  );
};
