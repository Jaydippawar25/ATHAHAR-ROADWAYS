import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowDownLeft,
  PackageCheck,
  ArrowUpRight,
  ArrowLeftRight,
  FileText,
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
    { label: 'All Entries', path: '/all-entries', icon: ArrowLeftRight },
    { label: 'Reports', path: '/reports', icon: FileText },
    { label: 'Masters', path: '/masters', icon: Database },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden bg-[#072440] text-white p-4 flex items-center justify-between border-b border-[#103052] sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="bg-sky-500 p-1.5 rounded-lg text-white font-bold">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">ATHAHAR ROADWAYS</h1>
            <p className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">SANGLI-416416</p>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-sky-950"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Overlay backdrop for mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40"
        />
      )}

      {/* Sidebar Container with Image 2 Deep Navy Gradient */}
      <aside
        className={`fixed top-0 left-0 bottom-0 h-screen z-50 w-64 bg-gradient-to-b from-[#072440] via-[#091b30] to-[#061220] text-slate-200 border-r border-[#103052] flex flex-col justify-between transition-transform duration-300 no-scrollbar ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Branding Section */}
        <div className="p-5 border-b border-[#103052]">
          <div className="flex items-center space-x-3">
            <div className="bg-sky-500 p-2.5 rounded-xl text-white font-bold shadow-lg shadow-sky-500/20 flex-shrink-0">
              <span className="text-sm font-black tracking-tighter">AR</span>
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wider text-white leading-snug uppercase">
                ATHAHAR ROADWAYS
              </h1>
              <p className="text-[11px] text-sky-400 font-bold tracking-wider uppercase">SANGLI-416416</p>
            </div>
          </div>
        </div>

        {/* Navigation Items List */}
        <div className="flex-1 py-4 px-4 space-y-1 overflow-y-auto no-scrollbar">
          <div className="text-[11px] font-bold text-sky-300/60 uppercase tracking-wider px-3 mb-2">
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
                  `flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all group ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                      : 'text-slate-300 hover:bg-sky-950/60 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className="bg-amber-500 text-slate-950 font-black text-xs px-2 py-0.5 rounded-full shadow-sm">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Footer User Profile & Logout */}
        {user && (
          <div className="p-4 border-t border-[#103052] bg-[#05111f]/60">
            <div className="flex items-center justify-between bg-[#0b2847]/80 p-3 rounded-xl border border-[#143a63]">
              <div className="flex items-center space-x-3 truncate">
                <div className="p-2 bg-sky-900/60 rounded-lg text-sky-200">
                  <User className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-white truncate">{user.displayName}</p>
                  <p className="text-[10px] text-sky-300/70 truncate">{user.email}</p>
                </div>
              </div>

              <button
                onClick={logout}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-sky-950/80 rounded-lg transition-colors ml-2"
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
