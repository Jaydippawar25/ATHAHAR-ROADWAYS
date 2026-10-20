import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User, Truck } from 'lucide-react';

export const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-sky-500 p-2 rounded-lg text-white font-bold">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wide text-white">ATHAHAR ROADWAYS</h1>
            <p className="text-xs text-sky-400 font-medium">Transport Management System</p>
          </div>
        </div>

        {user && (
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-slate-300">
              <User className="w-4 h-4 text-slate-400" />
              <span className="font-medium hidden sm:inline">{user.displayName}</span>
            </div>

            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
