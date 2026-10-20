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
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs sticky top-0 z-30 relative">
      {/* Top Brand Highway Accent Line */}
      <div className="h-[2.5px] highway-accent-line absolute top-0 left-0 right-0" />

      <div className="flex items-center space-x-3.5">
        <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-xs p-1 flex items-center justify-center flex-shrink-0 overflow-hidden ring-1 ring-orange-500/10">
          <img src="/logo.png" alt="ATHAHAR ROADWAYS" className="w-full h-full object-contain" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-sm font-black tracking-wide text-slate-900 uppercase">
              ATHAHAR ROADWAYS
            </h1>
            <span className="bg-orange-50 border border-orange-200/90 text-orange-700 px-2 py-0.5 rounded text-[10px] font-mono font-extrabold tracking-tight">
              Godown Hub 01
            </span>
            <span className="hidden md:inline-flex items-center text-[10px] font-bold text-slate-500 tracking-wider uppercase">
              <span className="text-orange-500 mr-1">&bull;</span>
              Safe &bull; On Time &bull; Always
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono tracking-tight">
            NEXT TO PARVATI CRANE, VAKHAR BHAG, SANGLI-416416 &nbsp;|&nbsp; MOB: 9370229449 / 9850329449
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3 w-fit self-end sm:self-auto">
        {/* Calendar Date Pill */}
        <div className="flex items-center space-x-1.5 text-xs text-slate-600 font-semibold px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg">
          <Calendar className="w-3.5 h-3.5 text-orange-600" />
          <span>{currentDateStr}</span>
        </div>

        {/* User Session */}
        <Link
          to="/settings"
          className="flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-[#0b2545] text-white text-xs font-bold transition-all shadow-2xs hover:ring-2 hover:ring-orange-500/40"
          title={user?.email || 'Settings'}
        >
          <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-black">
            <User className="w-3 h-3" />
          </div>
          <span className="hidden sm:inline text-[11px] max-w-[120px] truncate">
            {user?.displayName || 'Operator'}
          </span>
        </Link>
      </div>
    </header>
  );
};
