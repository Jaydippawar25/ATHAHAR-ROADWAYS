import React, { useState } from 'react';
import {
  ShieldCheck,
  Users,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Check,
  DownloadCloud,
  UploadCloud,
  Wifi,
  Trash2,
  Cloud,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

export const Settings = () => {
  const { user } = useAuth();
  const {
    syncStatus,
    handlePullFromCloud,
    handlePushToCloud,
    handleClearAllData,
    testFirestoreConnection,
  } = useApp();
  const [actionStatus, setActionStatus] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleTestConnection = async () => {
    setIsProcessing(true);
    setActionStatus({ type: 'info', message: 'Testing Firestore connection...' });

    const connTest = await testFirestoreConnection();
    setIsProcessing(false);

    if (connTest.success) {
      setActionStatus({
        type: 'success',
        message: 'Cloud Firestore connection successful! Read and write permissions verified.',
      });
    } else {
      setActionStatus({
        type: 'error',
        message: `Firestore connection failed: ${connTest.error}`,
        detail:
          'Ensure Firestore Security Rules allow read/write and network connection is active. (Rules: allow read, write: if true;)',
      });
    }
  };

  const handlePushData = async () => {
    setIsProcessing(true);
    setActionStatus({ type: 'info', message: 'Pushing all local records to Cloud Firestore...' });

    try {
      const count = await handlePushToCloud();
      setIsProcessing(false);
      setActionStatus({
        type: 'success',
        message: `Successfully uploaded ${count} collections to Cloud Firestore!`,
      });
    } catch (err) {
      setIsProcessing(false);
      setActionStatus({
        type: 'error',
        message: `Push failed: ${err?.message || String(err)}`,
        detail: 'Verify internet connection and Firestore Security Rules.',
      });
    }
  };

  const handlePullData = async () => {
    setIsProcessing(true);
    setActionStatus({ type: 'info', message: 'Pulling all live records from Cloud Firestore...' });

    try {
      const count = await handlePullFromCloud();
      setIsProcessing(false);
      setActionStatus({
        type: 'success',
        message: `Successfully downloaded ${count} collections from Cloud Firestore into this browser!`,
      });
    } catch (err) {
      setIsProcessing(false);
      setActionStatus({
        type: 'error',
        message: `Pull failed: ${err?.message || String(err)}`,
        detail: 'Verify internet connection and Firestore Security Rules.',
      });
    }
  };

  const handleClearDatabase = async () => {
    const confirmed = window.confirm(
      'WARNING: Are you sure you want to permanently delete ALL records?\n\n' +
        'This will delete:\n' +
        '• All Inward Entries & Items\n' +
        '• All Outward Entries & Items\n' +
        '• All Pending Stock Items\n' +
        '• All Accounting Vouchers\n' +
        '• All Expenses & Reports\n' +
        '• All Masters (Transporters, Vehicles, Drivers, Consignors, etc.)\n\n' +
        'Data will be permanently wiped from BOTH local storage and Cloud Firestore.'
    );

    if (!confirmed) return;

    setIsProcessing(true);
    setActionStatus({
      type: 'info',
      message: 'Wiping all records from Cloud Firestore & local storage...',
    });

    try {
      await handleClearAllData();
      setIsProcessing(false);
      setActionStatus({
        type: 'success',
        message:
          'All records (Inwards, Outwards, Stock, Accounting, Expenses, Masters) have been permanently wiped.',
      });
    } catch (err) {
      setIsProcessing(false);
      setActionStatus({
        type: 'error',
        message: `Wipe failed: ${err?.message || String(err)}`,
        detail: 'Ensure you have an active network connection.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* ROYAL NAVY HERO BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0d2358] via-[#102d73] to-[#163a94] p-6 text-white shadow-lg border border-blue-900/40">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-extrabold tracking-widest uppercase text-sky-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>SYSTEM CONFIGURATION &amp; CLOUD HUB</span>
              <span className="text-blue-200/50">•</span>
              <span className="text-blue-100 font-mono">ATHARVA SYSTEM NODE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
              System Settings &amp; Governance
            </h1>
            <p className="text-xs text-blue-100/80 mt-1 max-w-xl">
              Configure multi-device cloud synchronization, manage active operator credentials, and review critical transport business guardrails.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Firebase Cloud Firestore Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 md:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1d4ed8] flex items-center justify-center">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Cloud Firestore Real-Time Multi-Device Sync
                </h3>
                <p className="text-xs text-slate-400">
                  Instant bidirectional sync across all computers, tablets, and mobile devices
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleTestConnection}
                disabled={isProcessing}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>Test Link</span>
              </button>

              <button
                onClick={handlePullData}
                disabled={isProcessing}
                className="px-3.5 py-2 bg-[#1d4ed8] hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <DownloadCloud className="w-3.5 h-3.5" />
                <span>Pull from Cloud</span>
              </button>

              <button
                onClick={handlePushData}
                disabled={isProcessing}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Push to Cloud</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-600">Current Sync Status:</span>
              <span
                className={`font-black uppercase tracking-wider text-[11px] px-2 py-0.5 rounded-md ${
                  syncStatus?.state === 'connected'
                    ? 'bg-emerald-100 text-emerald-800'
                    : syncStatus?.state === 'syncing'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-200 text-slate-800'
                }`}
              >
                {syncStatus?.message || 'Ready'}
              </span>
            </div>
            {syncStatus?.lastSync && (
              <span className="text-slate-500 font-mono text-[11px]">Last Synced: {syncStatus.lastSync}</span>
            )}
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            All Inwards, Outwards, Pending Stock, Expenses, and Masters automatically synchronize
            bidirectionally via Google Cloud Firestore. When an operator updates data on any device,
            all other connected screens update in real-time.
          </p>

          {actionStatus && (
            <div
              className={`p-4 rounded-xl text-xs border ${
                actionStatus.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : actionStatus.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}
            >
              <div className="flex items-start space-x-2.5 font-bold">
                {actionStatus.type === 'success' && (
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                )}
                {actionStatus.type === 'error' && (
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                )}
                {actionStatus.type === 'info' && (
                  <RefreshCw className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p>{actionStatus.message}</p>
                  {actionStatus.detail && (
                    <p className="mt-1 font-normal text-slate-600">{actionStatus.detail}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Session Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="font-extrabold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-3 text-xs uppercase tracking-wider">
            <Users className="w-4 h-4 text-[#1d4ed8]" />
            <span>Active Operator Session</span>
          </h3>

          <div className="space-y-3 text-xs text-slate-700">
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-500 uppercase text-[10px]">OPERATOR UID</span>
              <span className="font-mono text-slate-900 font-bold">{user?.uid || 'local-operator'}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-500 uppercase text-[10px]">OPERATOR EMAIL</span>
              <span className="font-bold text-slate-900">{user?.email || 'operator@atharva.com'}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-500 uppercase text-[10px]">ACCOUNT STATUS</span>
              <span className="bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full text-[10px]">
                AUTHENTICATED
              </span>
            </div>
          </div>
        </div>

        {/* Business Rule Checklist Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="font-extrabold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-3 text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Critical Business Guardrails</span>
          </h3>

          <div className="space-y-2.5 text-xs font-semibold text-slate-700">
            <div className="flex items-center space-x-2 text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>LR No. manually accepted from client document (Never auto-generated).</span>
            </div>
            <div className="flex items-center space-x-2 text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Duplicate LR entries in Pending Stock are strictly blocked.</span>
            </div>
            <div className="flex items-center space-x-2 text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Outward requires selecting an existing PENDING stock LR.</span>
            </div>
            <div className="flex items-center space-x-2 text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Cross Stock-Out works as independent manual dispatch.</span>
            </div>
          </div>
        </div>

        {/* Danger Zone: Wipe Database Card */}
        <div className="bg-rose-50/70 p-6 rounded-2xl border border-rose-200 shadow-2xs space-y-4 md:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-rose-200 pb-3 gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-rose-100 rounded-xl text-rose-700 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-black text-rose-950 text-sm">Danger Zone: Complete Database Wipe</h3>
                <p className="text-xs text-rose-700">
                  Permanently delete all business data and masters across Cloud Firestore &amp; browser
                </p>
              </div>
            </div>

            <button
              onClick={handleClearDatabase}
              disabled={isProcessing}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-extrabold flex items-center space-x-2 transition-all disabled:opacity-50 shadow-xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Database Records</span>
            </button>
          </div>

          <p className="text-xs text-rose-800 leading-relaxed font-medium">
            Clicking <strong>Clear All Database Records</strong> will permanently erase all Inward
            entries, Outward entries, Stock-Out, Pending Stock, Accounting vouchers, Expenses,
            Reports, and Masters from live Cloud Firestore and local device memory. Use this button
            only when resetting the application for a clean production setup.
          </p>
        </div>
      </div>
    </div>
  );
};
