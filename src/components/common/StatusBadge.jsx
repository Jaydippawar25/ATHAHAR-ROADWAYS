import React from 'react';
import { STATUS } from '../../utils/constants';

export const StatusBadge = ({ status }) => {
  const norm = String(status || '').toUpperCase();

  if (norm === STATUS.PENDING || norm === 'PENDING') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-50 text-amber-700 border border-amber-200/90 whitespace-nowrap shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>
        PENDING
      </span>
    );
  }
  if (norm === STATUS.DELIVERED || norm === 'DELIVERED') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/90 whitespace-nowrap shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
        DELIVERED
      </span>
    );
  }
  if (norm === STATUS.DISPATCHED || norm === 'DISPATCHED') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-blue-50 text-blue-700 border border-blue-200/90 whitespace-nowrap shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
        DISPATCHED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
      {status || '-'}
    </span>
  );
};
