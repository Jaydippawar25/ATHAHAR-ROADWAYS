import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Users,
  CheckCircle2,
  Database,
  RefreshCw,
  AlertTriangle,
  Check,
  DownloadCloud,
  UploadCloud,
  Wifi,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

export const Settings = () => {
  const { user } = useAuth();
  const { syncStatus, handlePullFromCloud, handlePushToCloud, testFirestoreConnection } = useApp();
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
          <SettingsIcon className="w-6 h-6 text-sky-600" />
          <span>System Settings & Governance</span>
        </h2>
        <p className="text-xs text-slate-500">
          Configure system security, multi-device sync, and backend parameters
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Firebase Cloud Firestore Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 md:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-slate-900">
                Cloud Firestore Real-Time Multi-Device Sync
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleTestConnection}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition disabled:opacity-50"
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>Test Connection</span>
              </button>

              <button
                onClick={handlePullData}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition disabled:opacity-50"
              >
                <DownloadCloud className="w-3.5 h-3.5" />
                <span>Pull from Cloud</span>
              </button>

              <button
                onClick={handlePushData}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition disabled:opacity-50"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Push to Cloud</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="font-semibold text-slate-600">Current Sync Status: </span>
              <span
                className={`font-bold ${
                  syncStatus?.state === 'connected'
                    ? 'text-emerald-700'
                    : syncStatus?.state === 'syncing'
                    ? 'text-amber-700'
                    : 'text-slate-700'
                }`}
              >
                {syncStatus?.message || 'Ready'}
              </span>
            </div>
            {syncStatus?.lastSync && (
              <span className="text-slate-500">Last Synced: {syncStatus.lastSync}</span>
            )}
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            All Inwards, Outwards, Pending Stock, Expenses, and Masters automatically synchronize
            bidirectionally via Google Cloud Firestore. When an operator updates data on any device,
            all other connected screens update in real-time.
          </p>

          {actionStatus && (
            <div
              className={`p-4 rounded-lg text-xs border ${
                actionStatus.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : actionStatus.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-sky-50 border-sky-200 text-sky-800'
              }`}
            >
              <div className="flex items-start space-x-2 font-semibold">
                {actionStatus.type === 'success' && (
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                )}
                {actionStatus.type === 'error' && (
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                )}
                {actionStatus.type === 'info' && (
                  <RefreshCw className="w-4 h-4 text-sky-600 animate-spin flex-shrink-0 mt-0.5" />
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
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2">
            <Users className="w-5 h-5 text-sky-600" />
            <span>Active Session Information</span>
          </h3>

          <div className="space-y-2 text-sm text-slate-700">
            <div>
              <strong>User ID:</strong> {user?.uid}
            </div>
            <div>
              <strong>Email:</strong> {user?.email}
            </div>
            <div>
              <strong>Account Status:</strong>{' '}
              <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-xs">
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Business Rule Checklist Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Critical Business Rule Guardrails</span>
          </h3>

          <div className="space-y-3 text-xs font-semibold text-slate-700">
            <div className="flex items-center space-x-2 text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>LR No. manually accepted from client document (Never auto-generated).</span>
            </div>
            <div className="flex items-center space-x-2 text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Duplicate LR entries in Pending Stock are strictly blocked.</span>
            </div>
            <div className="flex items-center space-x-2 text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Outward requires selecting an existing PENDING stock LR.</span>
            </div>
            <div className="flex items-center space-x-2 text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Delivered LRs cannot be dispatched again.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
