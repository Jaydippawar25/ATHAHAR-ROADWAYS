import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

// Route-level code splitting with lazy loading
const Login = lazy(() => import('../pages/Login').then((m) => ({ default: m.Login })));
const Dashboard = lazy(() => import('../pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const InwardCreate = lazy(() => import('../pages/Inward/InwardCreate').then((m) => ({ default: m.InwardCreate })));
const PendingStock = lazy(() => import('../pages/PendingStock/PendingStock').then((m) => ({ default: m.PendingStock })));
const OutwardCreate = lazy(() => import('../pages/Outward/OutwardCreate').then((m) => ({ default: m.OutwardCreate })));
const CrossOutwardCreate = lazy(() => import('../pages/Outward/CrossOutwardCreate').then((m) => ({ default: m.CrossOutwardCreate })));
const AllEntries = lazy(() => import('../pages/AllEntries/AllEntries').then((m) => ({ default: m.AllEntries })));
const Masters = lazy(() => import('../pages/Masters/Masters').then((m) => ({ default: m.Masters })));
const Reports = lazy(() => import('../pages/Reports/Reports').then((m) => ({ default: m.Reports })));
const Accounting = lazy(() => import('../pages/Accounting/Accounting').then((m) => ({ default: m.Accounting })));
const Expenses = lazy(() => import('../pages/Expenses/Expenses').then((m) => ({ default: m.Expenses })));
const Settings = lazy(() => import('../pages/Settings/Settings').then((m) => ({ default: m.Settings })));

const RouteLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[50vh] w-full">
    <div className="flex flex-col items-center space-y-3">
      <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase">Loading...</span>
    </div>
  </div>
);

export const AppRoutes = () => {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inward"
        element={
          <ProtectedRoute>
            <InwardCreate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inward/list"
        element={<Navigate to="/all-entries" state={{ tab: 'inward_headers' }} replace />}
      />
      <Route
        path="/inward/new"
        element={
          <ProtectedRoute>
            <InwardCreate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pending"
        element={
          <ProtectedRoute>
            <PendingStock />
          </ProtectedRoute>
        }
      />
      <Route
        path="/outward"
        element={
          <ProtectedRoute>
            <OutwardCreate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/outward/list"
        element={<Navigate to="/all-entries" state={{ tab: 'outward_headers' }} replace />}
      />
      <Route
        path="/outward/new"
        element={
          <ProtectedRoute>
            <OutwardCreate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cross-outward"
        element={
          <ProtectedRoute>
            <CrossOutwardCreate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cross-outward/list"
        element={<Navigate to="/all-entries" state={{ tab: 'stock_out_headers' }} replace />}
      />
      <Route
        path="/all-entries"
        element={
          <ProtectedRoute>
            <AllEntries />
          </ProtectedRoute>
        }
      />
      <Route
        path="/masters"
        element={
          <ProtectedRoute>
            <Masters />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/accounting"
        element={
          <ProtectedRoute>
            <Accounting />
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <Expenses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </Suspense>
);
};
