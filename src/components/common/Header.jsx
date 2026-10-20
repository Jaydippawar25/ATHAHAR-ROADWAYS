import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User } from 'lucide-react';

export const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-gradient-to-r from-[#07182e] via-[#0b2545] to-[#133e87] text-white shadow-lg border-b border-orange-500/30 sticky top-0 z-40 relative">
      <div className="h-[2.5px] highway-accent-line absolute top-0 left-0 right-0" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-md flex-shrink-0 overflow-hidden ring-2 ring-orange-500/20">
            <img src="/logo.png" alt="ATHAHAR ROADWAYS" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-wide text-white uppercase">ATHAHAR ROADWAYS</h1>
            <p className="text-[10px] text-orange-400 font-extrabold uppercase tracking-widest">
              Safe &bull; On Time &bull; Always
            </p>
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
