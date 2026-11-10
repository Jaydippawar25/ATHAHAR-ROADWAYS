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
    <header
      style={{ backgroundColor: '#FFFFFF' }}
      className="hidden lg:flex bg-white text-[#061944] border-b border-[#E1E5EE] px-6 py-2.5 items-center justify-between gap-3 shadow-xs sticky top-0 z-30 relative"
    >
      {/* Top Brand Accent Line in Electric Royal Blue */}
      <div className="h-[2px] bg-[#3956D4] absolute top-0 left-0 right-0" />

      <div className="flex items-center space-x-3.5">
        <div className="w-9 h-9 rounded-xl bg-white border border-[#E1E5EE] shadow-2xs p-1 flex items-center justify-center flex-shrink-0 overflow-hidden ring-1 ring-[#3956D4]/20">
          <img src="/logo.png" alt="ATHAHAR ROADWAYS" className="w-full h-full object-contain" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-sm font-black tracking-wide text-[#061944] uppercase">
              ATHAHAR ROADWAYS
            </h1>
            <span className="bg-[#EEF2F8] border border-[#DCE4F0] text-[#061944] px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-tight inline-flex items-center gap-1 shadow-2xs">
              Godown Hub 01
              <span className="text-[8px] text-slate-500">&#x25BC;</span>
            </span>
            <span className="hidden md:inline-flex items-center text-[10px] font-bold text-slate-500 tracking-wider uppercase">
              <span className="text-[#FF7A00] mr-1.5 font-black">&bull;</span>
              Safe &bull; On Time &bull; Always
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono tracking-tight font-medium mt-0.5">
            NEXT TO PARVATI CRANE, VAKHAR BHAG, SANGLI-416416 &nbsp;|&nbsp; MOB: 9370229449 / 9850329449
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3 w-fit self-end sm:self-auto">
        {/* Calendar Date Pill */}
        <div className="flex items-center space-x-1.5 text-xs text-[#061944] font-bold px-3 py-1.5 bg-[#F6F7F9] border border-[#E1E5EE] rounded-xl shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-[#3956D4]" />
          <span>{currentDateStr}</span>
        </div>

        {/* User Session */}
        <Link
          to="/settings"
          className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#061944] hover:bg-[#3956D4] text-white text-xs font-bold transition-all shadow-xs hover:shadow-md"
          title={user?.email || 'Settings'}
        >
          <div className="w-5 h-5 rounded-full bg-[#3956D4] text-white flex items-center justify-center text-[10px] font-black">
            <User className="w-3 h-3 text-white" />
          </div>
          <span className="hidden sm:inline text-xs font-black tracking-wide uppercase">
            {user?.displayName || 'ATHARVA'}
          </span>
        </Link>
      </div>
    </header>
  );
};
