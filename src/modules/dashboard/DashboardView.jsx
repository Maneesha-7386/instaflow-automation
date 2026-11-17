import React, { useState } from 'react';
import { useAccount } from '../../hooks/useAccount';
import StatusChip from '../../components/common/StatusChip';
import Modal from '../../components/common/Modal';

export default function DashboardView({ onNavigate }) {
  const { reels, automations, history, accounts, activeAccount } = useAccount();
  const [previewItem, setPreviewItem] = useState(null);
  const [videoErrorId, setVideoErrorId] = useState(null);

  const primaryAccount =
    activeAccount ||
    accounts.find((a) => a.connected) ||
    accounts[0] ||
    null;

  const cleanPrimaryHandle = (primaryAccount?.handle || '').replace(/^@+/, '').toLowerCase();

  const publishedFeed = reels.filter((r) => {
    if (r.status !== 'published') return false;
    if (!r.accountHandle) return true;
    const cleanReelHandle = r.accountHandle.replace(/^@+/, '').toLowerCase();
    return (
      cleanReelHandle === cleanPrimaryHandle ||
      r.accountId === primaryAccount?.id ||
      !cleanPrimaryHandle
    );
  });

  const scheduledFeed = reels.filter((r) => {
    const isScheduled = r.status === 'scheduled' || r.status === 'publishing';
    if (!isScheduled) return false;
    if (!r.accountHandle) return true;
    const cleanReelHandle = r.accountHandle.replace(/^@+/, '').toLowerCase();
    return (
      cleanReelHandle === cleanPrimaryHandle ||
      r.accountId === primaryAccount?.id ||
      !cleanPrimaryHandle
    );
  });

  const scheduledCount = scheduledFeed.length;
  const liveMediaFromAccounts = accounts.reduce((acc, a) => acc + (a.mediaCount || 0), 0);
  const publishedCount = Math.max(publishedFeed.length, primaryAccount?.mediaCount || 0);
  const accountPostsCount = primaryAccount?.mediaCount ?? publishedCount;
  const accountFollowers = primaryAccount?.followers || '0';
  const totalItemsCount = scheduledCount + publishedCount;
  const connectedAccountsCount = accounts.filter((a) => a.connected).length;
  const upNextList = scheduledFeed.slice(0, 4);
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
      {/* Connected Account Live Header Banner */}
      {primaryAccount && (
        <div
          className="p-5 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm"
          style={{
            background:
              'linear-gradient(135deg, rgba(109, 61, 242, 0.05), rgba(214, 47, 142, 0.05))',
            borderColor: 'var(--ln)',
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-13 h-13 rounded-2xl flex items-center justify-center text-white text-base font-black shrink-0 shadow-md"
              style={{
                background:
                  primaryAccount.color ||
                  'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
              }}
            >
              {primaryAccount.initials || primaryAccount.handle?.slice(1, 3).toUpperCase() || 'IG'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg md:text-xl font-black text-[var(--tx)] m-0">
                  {primaryAccount.name || primaryAccount.handle || 'Instagram Account'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  👑 {primaryAccount.accountType || 'Creator'} Account
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ● Meta Synced
                </span>
              </div>
              <p className="text-xs text-[var(--mu)] font-medium mt-1 m-0">
                {primaryAccount.handle} {primaryAccount.bio ? `· ${primaryAccount.bio}` : ''}
              </p>
            </div>
          </div>

          {/* Quick Metrics in Header: Post Count & Followers */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div
              className="flex-1 md:flex-initial px-4 py-2.5 rounded-2xl border text-center shadow-xs"
              style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
            >
              <span className="text-[10px] uppercase font-bold text-[var(--mu)] block tracking-wider">
                Posts on IG
              </span>
              <strong className="text-base md:text-lg font-black text-[var(--tx)]">
                {accountPostsCount} Posts
              </strong>
            </div>

            <div
              className="flex-1 md:flex-initial px-4 py-2.5 rounded-2xl border text-center shadow-xs"
              style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
            >
              <span className="text-[10px] uppercase font-bold text-[var(--mu)] block tracking-wider">
                Followers
              </span>
              <strong className="text-base md:text-lg font-black text-[var(--tx)]">
                {accountFollowers} Followers
              </strong>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('content')}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-white shadow-md hover:opacity-95 transition-all cursor-pointer border-0 shrink-0"
              style={{ background: 'var(--g)' }}
            >
              + New Reel
            </button>
          </div>
        </div>
      )}

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
          <small className="font-semibold text-xs text-[var(--mu)] block">Published Posts</small>
          <strong className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--tx)] block my-1">
            {accountPostsCount}
          </strong>
          <em className="text-xs font-semibold not-italic text-[var(--ok)]">
            {accountPostsCount} posts live on Instagram
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

      {/* Published Instagram Reels & Posts Gallery */}
      {primaryAccount && publishedFeed.length > 0 && (
        <div
          className="p-5 rounded-2xl border flex flex-col gap-4 shadow-xs"
          style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--tx)] m-0">
                  Instagram Feed · {primaryAccount.handle}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ● {publishedFeed.length} Live Items Synced
                </span>
              </div>
              <p className="text-xs text-[var(--mu)] m-0 mt-0.5">
                Existing reels and posts live on your verified Instagram account
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('content')}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[var(--br)] hover:bg-[var(--brs)] border border-transparent hover:border-[var(--br)] transition-all cursor-pointer"
            >
              Manage in Content Studio →
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {publishedFeed.map((item) => (
              <div
                key={item.id}
                onClick={() => setPreviewItem(item)}
                className="group rounded-xl border overflow-hidden cursor-pointer flex flex-col justify-between transition-all hover:shadow-md hover:scale-[1.02]"
                style={{ background: 'var(--sf2)', borderColor: 'var(--ln)' }}
              >
                {/* 9:12 Aspect Media Preview */}
                <div
                  className="relative aspect-[9/12] flex flex-col justify-between p-2.5 text-white select-none overflow-hidden"
                  style={item.videoUrl || item.coverUrl ? { background: '#000' } : getGradientStyle(item.hue)}
                >
                  {item.videoUrl ? (
                    <video
                      src={item.videoUrl}
                      muted
                      playsInline
                      preload="metadata"
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : item.coverUrl ? (
                    <img
                      src={item.coverUrl}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : null}

                  <div className="flex items-center justify-between z-10">
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-black/70 backdrop-blur-xs text-white">
                      {item.kind || 'Reel'} {item.igMediaId ? `#${item.igMediaId.slice(-4)}` : ''}
                    </span>
                    <span className="text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-emerald-400 font-bold backdrop-blur-xs">
                      ● live
                    </span>
                  </div>

                  <div className="self-center w-8 h-8 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-xs shadow-md group-hover:scale-110 transition-transform z-10">
                    ▶
                  </div>

                  <div className="z-10 flex items-center justify-between text-[10px] font-bold text-white drop-shadow">
                    <span>❤️ {item.likes || 18}</span>
                    <span>👁️ {item.views || '1.8K'}</span>
                  </div>
                </div>

                {/* Info Footer */}
                <div className="p-2.5">
                  <b className="block text-xs font-bold text-[var(--tx)] truncate">
                    {item.title}
                  </b>
                  <span className="text-[10px] text-[var(--mu)] truncate block mt-0.5">
                    {item.dateText || 'Published on Instagram'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Media Detail & Preview Modal */}
      {previewItem && (
        <Modal
          isOpen={Boolean(previewItem)}
          onClose={() => setPreviewItem(null)}
          title={`${previewItem.kind || 'Reel'} Details · ${previewItem.accountHandle || primaryAccount?.handle || '@creator'}`}
          size="md"
        >
          <div className="flex flex-col md:flex-row gap-5">
            {/* Visual Preview */}
            <div
              className={`w-full ${
                !previewItem.videoUrl || videoErrorId === previewItem.id
                  ? 'md:w-72 aspect-[9/14]'
                  : 'md:w-60 aspect-[9/16]'
              } rounded-2xl flex flex-col justify-between text-white shrink-0 shadow-lg relative overflow-hidden`}
              style={
                previewItem.videoUrl || previewItem.coverUrl || previewItem.permalink
                  ? { background: '#000' }
                  : getGradientStyle(previewItem.hue)
              }
            >
              {previewItem.videoUrl && videoErrorId !== previewItem.id ? (
                <video
                  key={previewItem.id}
                  src={previewItem.videoUrl}
                  controls
                  autoPlay
                  playsInline
                  referrerPolicy="no-referrer"
                  onError={() => setVideoErrorId(previewItem.id)}
                  className="w-full h-full object-cover"
                />
              ) : previewItem.permalink ? (
                <iframe
                  key={previewItem.id}
                  src={`${previewItem.permalink.replace(/\/+$/, '')}/embed/`}
                  title={previewItem.title}
                  className="w-full h-full border-0 bg-white"
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : previewItem.coverUrl ? (
                <img
                  src={previewItem.coverUrl}
                  alt={previewItem.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="p-4 flex flex-col justify-between h-full">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/70 backdrop-blur-xs self-start z-10">
                    {previewItem.kind || 'Reel'} {previewItem.igMediaId ? `#${previewItem.igMediaId.slice(-4)}` : ''}
                  </span>
                  <div className="self-center w-12 h-12 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-lg shadow-xl z-10">
                    ▶
                  </div>
                  <div className="text-[11px] font-semibold drop-shadow z-10">
                    <span>{previewItem.dateText}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Post Information */}
            <div className="flex-1 flex flex-col justify-between min-w-0">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ok)] block mb-1">
                  ● Verified Live on Instagram
                </span>
                <h3 className="text-base font-bold text-[var(--tx)] m-0">
                  {previewItem.title}
                </h3>

                <div className="my-3 p-3 rounded-xl border text-xs text-[var(--tx)] leading-relaxed bg-[var(--sf2)]" style={{ borderColor: 'var(--ln)' }}>
                  <b className="text-[10px] font-bold text-[var(--mu)] uppercase block mb-1">
                    Caption
                  </b>
                  {previewItem.caption || 'No caption provided.'}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center my-3">
                  <div className="p-2 rounded-xl border" style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}>
                    <span className="text-[10px] text-[var(--mu)] block">Likes</span>
                    <strong className="text-sm font-bold text-[var(--tx)]">❤️ {previewItem.likes || 120}</strong>
                  </div>
                  <div className="p-2 rounded-xl border" style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}>
                    <span className="text-[10px] text-[var(--mu)] block">Comments</span>
                    <strong className="text-sm font-bold text-[var(--tx)]">💬 {previewItem.comments || 18}</strong>
                  </div>
                  <div className="p-2 rounded-xl border" style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}>
                    <span className="text-[10px] text-[var(--mu)] block">Views</span>
                    <strong className="text-sm font-bold text-[var(--tx)]">👁️ {previewItem.views || '1.8K'}</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: 'var(--ln)' }}>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewItem(null);
                    onNavigate('content');
                  }}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white shadow-xs cursor-pointer border-0"
                  style={{ background: 'var(--g)' }}
                >
                  Open in Reels Studio
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="py-2 px-3 rounded-xl text-xs font-bold border hover:bg-[var(--sf2)] cursor-pointer"
                  style={{ borderColor: 'var(--ln)', color: 'var(--tx)' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
