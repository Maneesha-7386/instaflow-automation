import React from 'react';
import { NAV_ITEMS } from '../../config/constants';
import { useAuth } from '../../hooks/useAuth';

export default function Sidebar({ currentView, onNavigate }) {
  const { user, isFirebaseLive } = useAuth();
  const runsUsed = user?.runsUsed ?? (isFirebaseLive ? 0 : 1860);
  const runsLimit = user?.runsLimit ?? 3000;
  const percentage = runsLimit > 0 ? Math.min(100, Math.round((runsUsed / runsLimit) * 100)) : 0;

  return (
    <>
      {/* Desktop & Tablet Sidebar */}
      <aside
        className="hidden md:flex flex-col gap-2 p-4 border-r sticky top-0 h-screen transition-all select-none z-30"
        style={{
          width: 'var(--sidebar-width, 232px)',
          borderColor: 'var(--ln)',
          background: 'var(--sf)',
        }}
      >
        {/* Brand Logo & Tagline */}
        <div className="flex flex-col px-2 pt-1 pb-4">
          <div className="flex items-center gap-2.5 font-extrabold text-[17px] tracking-tight text-[var(--tx)]">
            <span
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-base shadow-sm shrink-0"
              style={{ background: 'var(--g)' }}
            >
              ⚡
            </span>
            <div className="hidden lg:flex flex-col">
              <span className="leading-tight">InstaFlow</span>
              <span className="text-[10px] font-semibold text-[var(--mu)] tracking-normal">
                Create. Automate. Publish.
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1 mt-1">
          {NAV_ITEMS.map((item) => {
            const isActive = currentView === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(item.id);
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                  isActive
                    ? 'text-[var(--br)] bg-[var(--brs)]'
                    : 'text-[var(--mu)] hover:text-[var(--tx)] hover:bg-[var(--sf2)]'
                }`}
                title={item.label}
              >
                <span className="w-5 text-center text-base shrink-0 group-hover:scale-110 transition-transform">
                  {item.icon}
                </span>
                <span className="hidden lg:inline">{item.label}</span>
              </a>
            );
          })}
        </nav>

        {/* Plan Usage Indicator (Desktop only) */}
        <div
          className="hidden lg:block mt-auto p-3.5 rounded-xl text-xs transition-colors"
          style={{
            background: 'var(--sf2)',
            color: 'var(--mu)',
            border: '1px solid var(--ln)',
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <strong className="text-xs font-bold text-[var(--tx)]">
              {user?.plan || 'Growth plan'}
            </strong>
            <span className="text-[11px] font-semibold text-[var(--br)]">
              {percentage}%
            </span>
          </div>
          <p className="m-0 leading-tight">
            {runsUsed.toLocaleString()} of {runsLimit.toLocaleString()} automation runs used
          </p>
          <div
            className="w-full h-1.5 rounded-full overflow-hidden mt-2"
            style={{ background: 'var(--ln)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${percentage}%`,
                background: 'var(--g)',
              }}
            />
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Dock */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around py-1.5 px-2 border-t backdrop-blur-md transition-colors"
        style={{
          background: 'var(--sf)',
          borderColor: 'var(--ln)',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = currentView === item.id;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(item.id);
              }}
              className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-bold transition-colors ${
                isActive
                  ? 'text-[var(--br)]'
                  : 'text-[var(--mu)] hover:text-[var(--tx)]'
              }`}
            >
              <span className="text-base leading-none mb-0.5">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>
    </>
  );
}
