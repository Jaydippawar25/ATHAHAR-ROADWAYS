import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  FileText,
  ArrowLeftRight,
} from 'lucide-react';

export const BottomNav = () => {
  const handleNavClick = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
    const main = document.querySelector('main');
    if (main) main.scrollTop = 0;
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Inward', path: '/inward', icon: ArrowDownLeft },
    { label: 'Outward', path: '/outward', icon: ArrowUpRight },
    { label: 'Accounting', path: '/accounting', icon: Wallet },
    { label: 'Reports', path: '/reports', icon: FileText },
    { label: 'All Entries', path: '/all-entries', icon: ArrowLeftRight },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(11,37,69,0.08)] pb-[max(0.35rem,env(safe-area-inset-bottom))]"
    >
      <div className="grid grid-cols-6 items-center h-14 px-1 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center h-full py-1 px-0.5 rounded-lg transition-all active:scale-95 group ${
                  isActive
                    ? 'text-orange-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-[2.5px] bg-gradient-to-r from-orange-600 to-orange-400 rounded-b-full shadow-xs" />
                  )}
                  <div
                    className={`p-1 rounded-lg transition-colors ${
                      isActive ? 'bg-orange-50' : 'group-hover:bg-slate-100/60'
                    }`}
                  >
                    <Icon
                      className={`w-[18px] h-[18px] transition-transform ${
                        isActive ? 'stroke-[2.4] scale-105' : 'stroke-[1.8]'
                      }`}
                    />
                  </div>
                  <span
                    className={`text-[9.5px] tracking-tight leading-none mt-0.5 truncate max-w-full ${
                      isActive ? 'font-black text-orange-600' : 'font-bold text-slate-500'
                    }`}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
