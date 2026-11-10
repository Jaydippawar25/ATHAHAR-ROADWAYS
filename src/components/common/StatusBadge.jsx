import React from 'react';
import { STATUS } from '../../utils/constants';

export const StatusBadge = ({ status }) => {
  const norm = String(status || '').toUpperCase();

  if (norm === STATUS.PENDING || norm === 'PENDING') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-[#7A4F05]/10 text-[#7A4F05] border border-[#7A4F05]/30 whitespace-nowrap shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-[#7A4F05] mr-1.5 animate-pulse"></span>
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
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-[#3956D4]/10 text-[#3956D4] border border-[#3956D4]/30 whitespace-nowrap shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-[#3956D4] mr-1.5"></span>
        DISPATCHED
      </span>
    );
  }
  if (norm === 'CANCELLED' || norm === 'UNPAID') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-[#CF1113]/10 text-[#CF1113] border border-[#CF1113]/30 whitespace-nowrap shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-[#CF1113] mr-1.5"></span>
        {norm}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#E1E5EE]/60 text-[#2D3661] border border-[#E1E5EE] whitespace-nowrap">
      {status || '-'}
    </span>
  );
};
