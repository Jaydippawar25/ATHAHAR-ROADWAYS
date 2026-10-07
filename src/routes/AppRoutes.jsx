import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from '../pages/Login';
import { Dashboard } from '../pages/Dashboard';
import { InwardList } from '../pages/Inward/InwardList';
import { InwardCreate } from '../pages/Inward/InwardCreate';
import { PendingStock } from '../pages/PendingStock/PendingStock';
import { OutwardList } from '../pages/Outward/OutwardList';
import { OutwardCreate } from '../pages/Outward/OutwardCreate';
import { Masters } from '../pages/Masters/Masters';
import { Reports } from '../pages/Reports/Reports';
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
            <InwardList />
          </ProtectedRoute>
        }
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
            <OutwardList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/outward/list"
        element={
          <ProtectedRoute>
            <OutwardList />
          </ProtectedRoute>
        }
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
