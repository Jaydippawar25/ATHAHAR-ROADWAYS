import React, { useState } from 'react';
import { Settings as SettingsIcon, ShieldCheck, Users, CheckCircle2, Database, RefreshCw, AlertTriangle, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { syncAllToFirestore, testFirestoreConnection } from '../../services/mockStorage';

export const Settings = () => {
  const { user } = useAuth();
  const [syncStatus, setSyncStatus] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncData = async () => {
    setIsSyncing(true);
    setSyncStatus({ type: 'info', message: 'Testing Firestore connection...' });
    
    const connTest = await testFirestoreConnection();
    if (!connTest.success) {
      setIsSyncing(false);
      setSyncStatus({
        type: 'error',
        message: `Firestore connection failed: ${connTest.error}`,
        detail: 'Check Firestore Security Rules in Firebase Console (set Rules to "allow read, write: if true;" for testing) and verify Vite server was restarted after setting .env.'
      });
      return;
    }

    try {
      setSyncStatus({ type: 'info', message: 'Syncing collections to Cloud Firestore...' });
      const count = await syncAllToFirestore();
      setIsSyncing(false);
      setSyncStatus({
        type: 'success',
        message: `Successfully synced ${count} data collections to Cloud Firestore! Refresh Firebase Console to view.`
      });
    } catch (err) {
      setIsSyncing(false);
      setSyncStatus({
        type: 'error',
        message: `Sync failed: ${err?.message || String(err)}`,
        detail: 'Ensure Firestore rules allow writes and network connectivity is active.'
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
        <p className="text-xs text-slate-500">Configure system security, users, and backend parameters</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Firebase Cloud Firestore Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 md:col-span-2">
          <h3 className="font-bold text-slate-900 flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-amber-500" />
              <span>Cloud Firestore Data Sync & Status</span>
            </div>
            <button
              onClick={handleSyncData}
              disabled={isSyncing}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center space-x-2 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync All Data to Firestore'}</span>
            </button>
          </h3>

          <p className="text-xs text-slate-600">
            Push local transport records (Inward, Pending Stock, Outward, Masters) directly to your Google Cloud Firestore database.
          </p>

          {syncStatus && (
            <div className={`p-4 rounded-lg text-xs border ${
              syncStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              syncStatus.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
              'bg-sky-50 border-sky-200 text-sky-800'
            }`}>
              <div className="flex items-start space-x-2 font-semibold">
                {syncStatus.type === 'success' && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />}
                {syncStatus.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />}
                {syncStatus.type === 'info' && <RefreshCw className="w-4 h-4 text-sky-600 animate-spin flex-shrink-0 mt-0.5" />}
                <div>
                  <p>{syncStatus.message}</p>
                  {syncStatus.detail && <p className="mt-1 font-normal text-slate-600">{syncStatus.detail}</p>}
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
            <div><strong>User ID:</strong> {user?.uid}</div>
            <div><strong>Email:</strong> {user?.email}</div>
            <div><strong>Account Status:</strong> <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-xs">Active</span></div>
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
