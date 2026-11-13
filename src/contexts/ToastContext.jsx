import React, { useState, useRef, useCallback } from 'react';
import { ToastContext } from './toastContextDef';

export function ToastProvider({ children }) {
  const [toastMessage, setToastMessage] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef(null);

  const showToast = useCallback((msg) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToastMessage(msg);
    setIsVisible(true);
    timerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 2400);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Floating Bottom Toast Container matching prototype */}
      <div
        className={`fixed left-1/2 bottom-6 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 pointer-events-none shadow-xl ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
        style={{
          background: 'var(--tx)',
          color: 'var(--bg)',
        }}
        role="alert"
        aria-live="polite"
      >
        {toastMessage}
      </div>
    </ToastContext.Provider>
  );
}
