import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowDownLeft,
  PackageCheck,
  ArrowUpRight,
  FileText,
  Database,
  Settings,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Navigation = () => {
  const { pendingStock } = useApp();

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
    { label: 'Reports', path: '/reports', icon: FileText },
    { label: 'Masters', path: '/masters', icon: Database },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <nav className="bg-slate-800 text-slate-300 border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 overflow-x-auto py-2 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'hover:bg-slate-700 hover:text-white text-slate-300'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="bg-amber-500 text-slate-950 font-extrabold text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
