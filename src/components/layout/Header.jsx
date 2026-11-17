import React, { useState, useRef, useEffect } from 'react';
import { useAccount } from '../../hooks/useAccount';
import { useAuth } from '../../hooks/useAuth';

const PAGE_TITLES = {
  home: 'Dashboard',
  accounts: 'Accounts',
  content: 'Reels and posts',
  ai: 'AI Studio',
  schedule: 'Schedule',
  automations: 'Automations',
  history: 'History',
};

export default function Header({ currentView }) {
  const {
    accounts,
    activeAccountIndex,
    activeAccount,
    switchAccount,
    setIsConnectModalOpen,
    openNewReelModal,
    setIsAuthModalOpen,
  } = useAccount();

  const { user, isFirebaseLive, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close account dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      className="sticky top-0 z-20 flex items-center gap-3 px-4 md:px-7 py-3 border-b backdrop-blur-md transition-colors"
      style={{
        background: 'var(--bg)',
        borderColor: 'var(--ln)',
      }}
    >
      <h1 className="text-lg md:text-xl font-bold tracking-tight text-[var(--tx)] m-0 flex-1 truncate">
        {PAGE_TITLES[currentView] || 'InstaFlow'}
      </h1>

      {/* Connect Account Button */}
      <button
        type="button"
        onClick={() => setIsConnectModalOpen(true)}
        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all border hover:bg-[var(--sf2)]"
        style={{
          background: 'var(--sf)',
          borderColor: 'var(--ln)',
          color: 'var(--tx)',
        }}
      >
        <span>+</span>
        <span>Connect account</span>
      </button>

      {/* New Reel Button */}
      <button
        type="button"
        onClick={() => openNewReelModal('normal')}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold text-white shadow-md hover:opacity-95 transition-all border-0"
        style={{
          background: 'var(--g)',
          boxShadow: '0 6px 16px -6px rgba(214, 47, 142, 0.6)',
        }}
      >
        <span>+</span>
        <span>New Reel</span>
      </button>

      {/* Active Account Switcher Pill */}
      {activeAccount && (
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 p-1 pr-2.5 rounded-full border text-xs md:text-sm font-semibold hover:bg-[var(--sf2)] transition-all cursor-pointer"
            style={{
              background: 'var(--sf)',
              borderColor: 'var(--ln)',
              color: 'var(--tx)',
            }}
            title="Switch Instagram account"
          >
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
              style={{ background: activeAccount.color }}
            >
              {activeAccount.initials}
            </span>
            <span className="hidden md:inline font-bold truncate max-w-[120px]">
              {activeAccount.name}
            </span>
            <span className="text-[10px] text-[var(--mu)]">▼</span>
          </button>

          {/* Account Dropdown Menu */}
          {isDropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-64 rounded-2xl p-2 shadow-2xl border z-50 animate-fadeIn"
              style={{
                background: 'var(--sf)',
                borderColor: 'var(--ln)',
              }}
            >
              <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--mu)]">
                <span>Switch Account</span>
                <span className="text-[10px] lowercase opacity-70">{accounts.length} linked</span>
              </div>
              <div className="flex flex-col gap-1 my-1">
                {accounts.map((acc, idx) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      switchAccount(idx);
                      setIsDropdownOpen(false);
                    }}
                    className={`flex items-center gap-2.5 p-2 rounded-xl text-left w-full text-xs font-semibold transition-colors cursor-pointer ${
                      idx === activeAccountIndex
                        ? 'bg-[var(--brs)] text-[var(--br)] font-bold'
                        : 'hover:bg-[var(--sf2)] text-[var(--tx)]'
                    }`}
                  >
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                      style={{ background: acc.color }}
                    >
                      {acc.initials}
                    </span>
                    <div className="flex-1 truncate">
                      <div className="truncate font-bold flex items-center gap-1.5">
                        <span>{acc.name}</span>
                        {idx === activeAccountIndex && (
                          <span className="text-[10px] font-normal text-[var(--ok)]">✓ active</span>
                        )}
                      </div>
                      <div className="text-[11px] opacity-75">{acc.handle}</div>
                    </div>
                    {acc.connected ? (
                      <span className="w-2 h-2 rounded-full bg-[var(--ok)]" title="Connected" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-[var(--er)]" title="Reconnect needed" />
                    )}
                  </button>
                ))}
              </div>
              <div className="border-t pt-1 mt-1" style={{ borderColor: 'var(--ln)' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setIsConnectModalOpen(true);
                  }}
                  className="w-full text-left p-2 rounded-xl text-xs font-semibold text-[var(--br)] hover:bg-[var(--brs)] transition-colors"
                >
                  + Link another Instagram account
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sign Out Button */}
      <button
        type="button"
        onClick={async () => {
          await logout();
          sessionStorage.clear();
          window.location.hash = 'signin';
        }}
        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 cursor-pointer"
        style={{
          borderColor: 'var(--ln)',
          color: 'var(--mu)',
        }}
        title="Sign Out to Login Screen"
      >
        <span>Sign Out</span>
        <span>➔</span>
      </button>

      {/* Auth Status & Profile Button */}
      <button
        type="button"
        onClick={() => setIsAuthModalOpen(true)}
        className="w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold transition-all hover:scale-105"
        style={{
          background: 'var(--sf2)',
          borderColor: 'var(--ln)',
          color: 'var(--tx)',
        }}
        title={`Logged in as ${user?.displayName || 'User'} (${
          isFirebaseLive ? 'Live Firebase' : 'Demo Mode'
        })`}
      >
        {user?.displayName ? user.displayName.slice(0, 1).toUpperCase() : '👤'}
      </button>
    </header>
  );
}
