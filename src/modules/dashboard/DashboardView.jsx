import React from 'react';
import { useAccount } from '../../hooks/useAccount';
import StatusChip from '../../components/common/StatusChip';

export default function DashboardView({ onNavigate }) {
  const { reels, automations, history, accounts } = useAccount();

  const scheduledCount = reels.filter(
    (r) => r.status === 'scheduled' || r.status === 'publishing'
  ).length;
  const liveMediaFromAccounts = accounts.reduce((acc, a) => acc + (a.mediaCount || 0), 0);
  const publishedReelsCount = reels.filter((r) => r.status === 'published').length;
  const publishedCount = Math.max(publishedReelsCount, liveMediaFromAccounts);
  const totalItemsCount = scheduledCount + publishedCount;
  const connectedAccountsCount = accounts.filter((a) => a.connected).length;
  const upNextList = reels
    .filter((r) => r.status === 'scheduled' || r.status === 'publishing')
    .slice(0, 4);
  const totalAutomationRuns = automations.reduce((acc, a) => acc + (a.runs || 0), 0);
  const activeAutomationsCount = automations.filter((a) => a.enabled).length;
  const successHistoryCount = history.filter((h) => h.status === 'success').length;
  const successRate =
    history.length > 0
      ? `${Math.round((successHistoryCount / history.length) * 100)}% success`
      : 'No executions yet';

  const getGradientStyle = (hue = 280) => ({
    background: `linear-gradient(160deg, hsl(${hue} 75% 55%), hsl(${(hue + 50) % 360} 80% 38%))`,
  });

  return (
    <div className="flex flex-col gap-5">
      {/* 4 Stat KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div
          className="p-4 rounded-2xl border transition-all hover:shadow-sm"
          style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
        >
          <small className="font-semibold text-xs text-[var(--mu)] block">Scheduled</small>
          <strong className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--tx)] block my-1">
            {scheduledCount}
          </strong>
          <em className="text-xs font-semibold not-italic text-[var(--ok)]">
            {upNextList[0]?.dateText ? `Next: ${upNextList[0].dateText}` : 'Ready to schedule'}
          </em>
        </div>

        {/* Card 2 */}
        <div
          className="p-4 rounded-2xl border transition-all hover:shadow-sm"
          style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
        >
          <small className="font-semibold text-xs text-[var(--mu)] block">Published</small>
          <strong className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--tx)] block my-1">
            {publishedCount}
          </strong>
          <em className="text-xs font-semibold not-italic text-[var(--ok)]">
            {publishedCount} published · {totalItemsCount} total items
          </em>
        </div>

        {/* Card 3 */}
        <div
          className="p-4 rounded-2xl border transition-all hover:shadow-sm"
          style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
        >
          <small className="font-semibold text-xs text-[var(--mu)] block">Automation runs</small>
          <strong className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--tx)] block my-1">
            {totalAutomationRuns.toLocaleString()}
          </strong>
          <em className="text-xs font-semibold not-italic text-[var(--ok)]">
            {successRate}
          </em>
        </div>

        {/* Card 4 */}
        <div
          className="p-4 rounded-2xl border transition-all hover:shadow-sm"
          style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
        >
          <small className="font-semibold text-xs text-[var(--mu)] block">Connected accounts</small>
          <strong className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--tx)] block my-1">
            {connectedAccountsCount}
          </strong>
          <em className="text-xs font-semibold not-italic text-[var(--ok)]">
            {activeAutomationsCount} active automations
          </em>
        </div>
      </div>

      {/* 2-Column: Up Next & Live Automations */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        {/* Up Next Card */}
        <div
          className="p-5 rounded-2xl border flex flex-col justify-between"
          style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-[var(--tx)] m-0">Up next</h2>
            <button
              type="button"
              onClick={() => onNavigate('schedule')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold border hover:bg-[var(--sf2)] transition-colors"
              style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
            >
              Open schedule
            </button>
          </div>

          <div className="flex flex-col divide-y" style={{ borderColor: 'var(--ln)' }}>
            {upNextList.length > 0 ? (
              upNextList.map((r) => {
                const acc = accounts[r.accountIndex] || accounts[0] || null;
                return (
                  <div key={r.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div
                      className="w-10 h-14 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs"
                      style={getGradientStyle(r.hue)}
                    >
                      ▶
                    </div>
                    <div className="flex-1 min-w-0">
                      <b className="block text-sm font-bold text-[var(--tx)] truncate">{r.title}</b>
                      <span className="text-xs text-[var(--mu)] truncate block">
                        {r.dateText} · {acc?.handle || r.accountHandle || '@unassigned'}
                      </span>
                    </div>
                    <StatusChip status={r.status} />
                  </div>
                );
              })
            ) : (
              <div className="py-5 flex flex-col items-center justify-center text-center gap-1.5">
                <span className="text-2xl">📅</span>
                <p className="text-xs font-semibold text-[var(--tx)] m-0">No scheduled content in queue.</p>
                <p className="text-[11px] text-[var(--mu)] m-0">Plan your next reel or schedule with AI.</p>
                <button
                  type="button"
                  onClick={() => onNavigate('content')}
                  className="mt-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-white shadow-xs border-0 cursor-pointer"
                  style={{ background: 'var(--g)' }}
                >
                  + Create Reel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Live Automations Card */}
        <div
          className="p-5 rounded-2xl border flex flex-col justify-between"
          style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-[var(--tx)] m-0">Live automations</h2>
            <button
              type="button"
              onClick={() => onNavigate('automations')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold border hover:bg-[var(--sf2)] transition-colors"
              style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
            >
              Manage
            </button>
          </div>

          <div className="flex flex-col divide-y" style={{ borderColor: 'var(--ln)' }}>
            {automations.length > 0 ? (
              automations.map((a) => (
                <div key={a.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <b className="block text-sm font-bold text-[var(--tx)] truncate">{a.name}</b>
                    <span className="text-xs text-[var(--mu)] block">
                      {a.runs || 0} runs this month
                    </span>
                  </div>
                  <span className={`chip ${a.enabled ? 'c-ok' : 'c-mu'}`}>
                    {a.enabled ? 'On' : 'Paused'}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-[var(--mu)] py-4 m-0">No automations created yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Account-wise Breakdown */}
      {accounts.length > 0 && (
        <div
          className="p-5 rounded-2xl border"
          style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-[var(--tx)] m-0">Account breakdown</h2>
            <button
              type="button"
              onClick={() => onNavigate('accounts')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold border hover:bg-[var(--sf2)] transition-colors"
              style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
            >
              Manage accounts
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {accounts.map((acc) => {
              const accReels = reels.filter(
                (r) => r.accountId === acc.id || r.accountHandle === acc.handle
              );
              const accSched = accReels.filter((r) => r.status === 'scheduled').length;
              const localPub = accReels.filter((r) => r.status === 'published').length;
              const accPub = Math.max(localPub, acc.mediaCount || 0);
              return (
                <div
                  key={acc.id}
                  className="p-3.5 rounded-xl border flex items-center gap-3"
                  style={{ background: 'var(--sf2)', borderColor: 'var(--ln)' }}
                >
                  <span
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: acc.color }}
                  >
                    {acc.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <b className="block text-xs font-bold text-[var(--tx)] truncate">{acc.handle}</b>
                    <span className="text-[11px] text-[var(--mu)] block truncate">
                      {accSched} scheduled · {accPub} published · {acc.followers} followers
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Activity Card */}
      <div
        className="p-5 rounded-2xl border"
        style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-[var(--tx)] m-0">Recent activity</h2>
          <button
            type="button"
            onClick={() => onNavigate('history')}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold border hover:bg-[var(--sf2)] transition-colors"
            style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
          >
            View all
          </button>
        </div>

        <div className="flex flex-col divide-y" style={{ borderColor: 'var(--ln)' }}>
          {history.length > 0 ? (
            history.slice(0, 4).map((h) => (
              <div key={h.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex-1 min-w-0">
                  <b className="block text-sm font-bold text-[var(--tx)] truncate">{h.message}</b>
                  <span className="text-xs text-[var(--mu)] block">
                    {h.time} · {h.source}
                  </span>
                </div>
                <StatusChip status={h.status} />
              </div>
            ))
          ) : (
            <p className="text-xs text-[var(--mu)] py-4 m-0">No activity recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
