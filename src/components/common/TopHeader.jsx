import React from 'react';
import { Clock, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Link } from 'react-router-dom';

export const TopHeader = () => {
  const { syncStatus, handlePullFromCloud } = useApp();

  const currentDateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const isConnected = syncStatus?.state === 'connected';
  const isSyncing = syncStatus?.state === 'syncing' || syncStatus?.state === 'connecting';

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs sticky top-0 z-30">
      <div>
        <h1 className="text-base font-black tracking-wide text-sky-950 uppercase">
          ATHARVA ROADWAYS
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          NEXT TO PARVATI CRANE, VAKHAR BHAG, SANGLI-416416 &nbsp;|&nbsp;{' '}
          <span className="font-semibold text-slate-700">MOB: 9370229449 / 9850329449</span>
        </p>
      </div>

      <div className="flex items-center space-x-3 w-fit">
        {/* Live Cloud Sync Status Pill */}
        <Link
          to="/settings"
          title={`Data Sync Status: ${syncStatus?.message || 'Ready'}${
            syncStatus?.lastSync ? ` (Last: ${syncStatus.lastSync})` : ''
          }`}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
            isConnected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
              : isSyncing
              ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
              : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {isSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
          ) : isConnected ? (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          ) : (
            <CloudOff className="w-3.5 h-3.5 text-slate-500" />
          )}

          <span>
            {isSyncing ? 'Syncing...' : isConnected ? 'Cloud Synced' : 'Local Mode'}
          </span>
        </Link>

        {/* Date / Clock Pill */}
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-700">
          <Clock className="w-3.5 h-3.5 text-sky-600" />
          <span>{currentDateStr}</span>
        </div>
      </div>
    </header>
  );
};
