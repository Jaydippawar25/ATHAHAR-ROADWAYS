import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
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
      <div className="lg:hidden bg-white text-[#061944] px-3.5 py-2.5 flex items-center justify-between border-b border-[#E1E5EE] sticky top-0 z-50 shadow-xs relative">
        <div className="h-[2px] bg-[#3956D4] absolute top-0 left-0 right-0" />
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-white border border-[#E1E5EE] p-0.5 flex items-center justify-center shadow-2xs flex-shrink-0 overflow-hidden ring-1 ring-[#3956D4]/30">
            <img src="/logo.png" alt="ATHAHAR ROADWAYS" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <h1 className="text-xs sm:text-sm font-black text-[#061944] leading-tight tracking-wide uppercase truncate">
                ATHAHAR ROADWAYS
              </h1>
              <span className="bg-[#3956D4]/10 border border-[#3956D4]/30 text-[#3956D4] px-1.5 py-0.2 rounded text-[9px] font-mono font-black tracking-tight">
                Hub 01
              </span>
            </div>
            <p className="text-[9px] sm:text-[10px] text-slate-500 font-extrabold uppercase tracking-wider truncate">
              SAFE &bull; ON TIME &bull; ALWAYS
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 flex-shrink-0">
          <Link
            to="/settings"
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#061944] hover:bg-[#3956D4] text-white text-xs transition-all shadow-xs"
            title={user?.email || 'Settings'}
          >
            <User className="w-3.5 h-3.5 text-white" />
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 text-[#061944] hover:text-[#3956D4] rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Overlay backdrop for mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-[#061944]/70 backdrop-blur-xs z-40"
        />
      )}

      {/* Modern Midnight Navy Sidebar matching reference design */}
      <aside
        style={{ backgroundColor: '#061944' }}
        className={`fixed top-0 left-0 bottom-0 h-screen z-50 w-64 bg-[#061944] text-slate-300 border-r border-[#1B2A5E] flex flex-col justify-between transition-transform duration-300 no-scrollbar ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Branding Section */}
        <div className="p-4 border-b border-[#1B2A5E]">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-white border border-[#1B2A5E] p-1 flex items-center justify-center shadow-md flex-shrink-0 overflow-hidden ring-2 ring-[#3956D4]/40">
              <img src="/logo.png" alt="ATHAHAR ROADWAYS" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-black tracking-tight text-white leading-none uppercase truncate">
                ATHAHAR ROADWAYS
              </h1>
              <p className="text-[10px] text-blue-300 font-extrabold tracking-wider uppercase mt-1 flex items-center">
                <span>SANGLI</span>
                <span className="mx-1 text-blue-400/50">&bull;</span>
                <span className="text-[9px] text-blue-200/80">416416</span>
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items List */}
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto no-scrollbar">
          <div className="text-[10px] font-extrabold text-blue-200/60 uppercase tracking-widest px-3 mb-2.5 flex items-center justify-between">
            <span>Management</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF8A00]"></span>
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  setMobileOpen(false);
                  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                }}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all group ${
                    isActive
                      ? 'bg-gradient-to-r from-[#FF7A00] to-[#EA580C] text-white shadow-lg shadow-orange-500/30 font-bold'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-4 h-4 transition-transform group-hover:scale-105" />
                  <span className="tracking-wide">{item.label}</span>
                </div>

                {item.badge && (
                  <span className="bg-[#CF1113] text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-xs">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Footer User Profile & Logout */}
        {user && (
          <div className="p-3.5 border-t border-[#1B2A5E] bg-[#04102e]">
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#0B1E4A] border border-[#1B2A5E] shadow-2xs">
              <div className="flex items-center space-x-2.5 truncate">
                <div className="w-8 h-8 rounded-full bg-[#3956D4] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 ring-1 ring-white/30">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-black text-white leading-tight truncate">
                    {user.displayName || 'ATHAHAR'}
                  </p>
                  <p className="text-[10px] text-blue-200/70 font-medium truncate">
                    {user.email || 'athahar@admin.com'}
                  </p>
                </div>
              </div>

              <button
                onClick={logout}
                className="p-1.5 text-blue-300 hover:text-[#CF1113] hover:bg-[#CF1113]/20 rounded-lg transition-colors ml-1.5 flex-shrink-0"
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
