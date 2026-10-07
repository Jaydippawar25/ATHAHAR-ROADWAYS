import React from 'react';
import { Clock } from 'lucide-react';

export const TopHeader = () => {
  const currentDateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs sticky top-0 z-30">
      <div>
        <h1 className="text-base font-black tracking-wide text-sky-950 uppercase">
          ATHAHAR ROADWAYS
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          NEXT TO PARVATI CRANE, VAKHAR BHAG, SANGLI-416416 &nbsp;|&nbsp;{' '}
          <span className="font-semibold text-slate-700">MOB: 9370229449 / 9850329449</span>
        </p>
      </div>

      <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-700 w-fit">
        <Clock className="w-3.5 h-3.5 text-sky-600" />
        <span>{currentDateStr}</span>
      </div>
    </header>
  );
};
