import React from 'react';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061944]/60 backdrop-blur-sm overflow-y-auto">
      <div className={`bg-white rounded-2xl shadow-2xl border border-[#E1E5EE] w-full ${maxWidth} overflow-hidden my-8 transform transition-all`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E1E5EE] bg-[#061944] text-white">
          <h3 className="text-base sm:text-lg font-black tracking-wide text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto bg-white">{children}</div>
      </div>
    </div>
  );
};
