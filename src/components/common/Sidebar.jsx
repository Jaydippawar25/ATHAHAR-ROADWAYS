import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowDownLeft,
  PackageCheck,
  ArrowUpRight,
  Shuffle,
  ArrowLeftRight,
  FileText,
  Wallet,
  Receipt,
  Database,
  Settings,
  Truck,
  User,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const { pendingStock } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Inward', path: '/inward', icon: ArrowDownLeft },
    {
      label: 'Pending Stock',
      path: '/pending',
      icon: PackageCheck,
      badge: pendingStock.length > 0 ? pendingStock.length : null,
    },
    { label: 'Outward', path: '/outward', icon: ArrowUpRight },
    { label: 'Cross Stock Out', path: '/cross-outward', icon: Shuffle },
    { label: 'All Entries', path: '/all-entries', icon: ArrowLeftRight },
    { label: 'Reports', path: '/reports', icon: FileText },
    { label: 'Accounting', path: '/accounting', icon: Wallet },
    { label: 'Expenses', path: '/expenses', icon: Receipt },
    { label: 'Masters', path: '/masters', icon: Database },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden bg-white text-slate-800 p-4 flex items-center justify-between border-b border-slate-200 sticky top-0 z-50 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="bg-[#0284c7] p-2 rounded-xl text-white font-bold shadow-xs">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 leading-tight tracking-wide uppercase">
              ATHAHAR ROADWAYS
            </h1>
            <p className="text-[10px] text-[#0284c7] font-bold uppercase tracking-wider">SANGLI - 416416</p>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Overlay backdrop for mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40"
        />
      )}

      {/* Modern Light Sidebar matching reference design */}
      <aside
        className={`fixed top-0 left-0 bottom-0 h-screen z-50 w-64 bg-white text-slate-700 border-r border-slate-200/90 flex flex-col justify-between transition-transform duration-300 no-scrollbar ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Branding Section */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="bg-[#0284c7] p-2.5 rounded-xl text-white font-black shadow-md shadow-sky-500/15 flex-shrink-0 flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-black tracking-tight text-slate-900 leading-none uppercase truncate">
                ATHAHAR ROADWAYS
              </h1>
              <p className="text-[11px] text-[#0284c7] font-bold tracking-wider uppercase mt-1">
                SANGLI - 416416
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items List */}
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto no-scrollbar">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2.5">
            Management
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                    isActive
                      ? 'bg-[#1d4ed8] text-white shadow-sm shadow-blue-600/20'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                  }`
                }
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-4 h-4 transition-transform group-hover:scale-105" />
                  <span className="tracking-wide">{item.label}</span>
                </div>

                {item.badge && (
                  <span className="bg-[#e0f2fe] text-[#0369a1] font-black text-[11px] px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Footer User Profile & Logout */}
        {user && (
          <div className="p-3.5 border-t border-slate-100 bg-slate-50/70">
            <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="flex items-center space-x-2.5 truncate">
                <div className="w-8 h-8 rounded-full bg-[#0f172a] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-black text-slate-900 leading-tight truncate">
                    {user.displayName || 'ATHAHAR'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium truncate">
                    {user.email || 'athahar@admin.com'}
                  </p>
                </div>
              </div>

              <button
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1.5 flex-shrink-0"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
