import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from '../pages/Login';
import { Dashboard } from '../pages/Dashboard';
import { InwardCreate } from '../pages/Inward/InwardCreate';
import { PendingStock } from '../pages/PendingStock/PendingStock';
import { OutwardCreate } from '../pages/Outward/OutwardCreate';
import { CrossOutwardCreate } from '../pages/Outward/CrossOutwardCreate';
import { AllEntries } from '../pages/AllEntries/AllEntries';
import { Masters } from '../pages/Masters/Masters';
import { Reports } from '../pages/Reports/Reports';
import { Accounting } from '../pages/Accounting/Accounting';
import { Settings } from '../pages/Settings/Settings';
import { ProtectedRoute } from './ProtectedRoute';

export const AppRoutes = () => {
  return (
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
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
