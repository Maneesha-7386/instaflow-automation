import React, { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, subtitle, children, maxWidth = 'max-w-[760px]' }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(10,9,24,0.65)] backdrop-blur-xs overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full ${maxWidth} rounded-2xl p-6 max-h-[90vh] overflow-y-auto transition-all shadow-2xl relative`}
        style={{
          background: 'var(--sf)',
          color: 'var(--tx)',
          border: '1px solid var(--ln)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            {title && (
              <h2 className="text-xl font-bold tracking-tight text-[var(--tx)] m-0">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-sm text-[var(--mu)] mt-1 m-0">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--mu)] hover:bg-[var(--sf2)] hover:text-[var(--tx)] transition-colors border-0"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

