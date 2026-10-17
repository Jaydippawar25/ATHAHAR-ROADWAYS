import React from 'react';
import { Calendar, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

export const TopHeader = () => {
  const { user } = useAuth();

  const currentDateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <header className="bg-white border-b border-slate-200/90 px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs sticky top-0 z-30">
      <div className="flex items-center space-x-3">
        <div className="bg-[#0284c7] text-white w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm shadow-2xs flex-shrink-0">
          A
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-sm font-black tracking-wide text-slate-900 uppercase">
              ATHARVA ROADWAYS
            </h1>
            <span className="bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-tight">
              Godown Hub 01
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono tracking-tight">
            NEXT TO PARVATI CRANE, VAKHAR BHAG, SANGLI-416416 &nbsp;|&nbsp; MOB: 9370229449 / 9850329449
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3 w-fit self-end sm:self-auto">
        {/* Calendar Date Pill */}
        <div className="flex items-center space-x-1.5 text-xs text-slate-600 font-medium px-2 py-1">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{currentDateStr}</span>
        </div>

        {/* User Avatar Circle */}
        <Link
          to="/settings"
          className="w-7 h-7 rounded-full bg-[#0f172a] text-white flex items-center justify-center font-bold text-xs hover:ring-2 hover:ring-blue-500/50 transition-all flex-shrink-0"
          title={user?.email || 'Settings'}
        >
          <User className="w-3.5 h-3.5" />
        </Link>
      </div>
    </header>
  );
};
