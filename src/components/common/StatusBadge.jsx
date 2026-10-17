import React from 'react';
import { STATUS } from '../../utils/constants';

export const StatusBadge = ({ status }) => {
  if (status === STATUS.PENDING) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1 animate-pulse"></span>
        PENDING
      </span>
    );
  }
  if (status === STATUS.DELIVERED) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1"></span>
        DELIVERED
      </span>
    );
  }
  if (status === STATUS.DISPATCHED || status === 'DISPATCHED') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1"></span>
        DISPATCHED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-gray-100 text-gray-700 whitespace-nowrap">
      {status || '-'}
    </span>
  );
};
