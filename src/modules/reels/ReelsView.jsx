import React, { useState } from 'react';
import { useAccount } from '../../hooks/useAccount';
import { useToast } from '../../hooks/useToast';
import StatusChip from '../../components/common/StatusChip';
import Modal from '../../components/common/Modal';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'draft', label: 'Draft' },
  { id: 'published', label: 'Published' },
  { id: 'publishing', label: 'Publishing' },
  { id: 'failed', label: 'Failed' },
];

export default function ReelsView() {
  const {
    reels,
    syncLiveReels,
    accounts,
    activeAccount,
    moveReelToDrafts,
    deleteReel,
    duplicateReel,
    publishReelNow,
    retryPublish,
    openNewReelModal,
    openEditReelModal,
  } = useAccount();
  const { showToast } = useToast();
  const [activeFilter, setActiveFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [previewReel, setPreviewReel] = useState(null);
  const [videoErrorId, setVideoErrorId] = useState(null);
  const [isPublishingId, setIsPublishingId] = useState(null);

  // Filter reels by status and account
  const filteredReels = reels.filter((r) => {
    const matchesStatus = activeFilter === 'all' || r.status === activeFilter;
    const matchesAccount =
      accountFilter === 'all' ||
      r.accountId === accountFilter ||
      r.accountHandle === accountFilter;
    return matchesStatus && matchesAccount;
  });

  // Dynamic counts for tab badges
  const counts = {
    all: reels.filter(
      (r) =>
        accountFilter === 'all' ||
        r.accountId === accountFilter ||
        r.accountHandle === accountFilter
    ).length,
    scheduled: reels.filter(
      (r) =>
        r.status === 'scheduled' &&
        (accountFilter === 'all' ||
          r.accountId === accountFilter ||
          r.accountHandle === accountFilter)
    ).length,
    draft: reels.filter(
      (r) =>
        r.status === 'draft' &&
        (accountFilter === 'all' ||
          r.accountId === accountFilter ||
          r.accountHandle === accountFilter)
    ).length,
    published: reels.filter(
      (r) =>
        r.status === 'published' &&
        (accountFilter === 'all' ||
          r.accountId === accountFilter ||
          r.accountHandle === accountFilter)
    ).length,
    publishing: reels.filter(
      (r) =>
        r.status === 'publishing' &&
        (accountFilter === 'all' ||
          r.accountId === accountFilter ||
          r.accountHandle === accountFilter)
    ).length,
    failed: reels.filter(
      (r) =>
        r.status === 'failed' &&
        (accountFilter === 'all' ||
          r.accountId === accountFilter ||
          r.accountHandle === accountFilter)
    ).length,
  };

  const getGradientStyle = (hue = 280) => ({
    background: `linear-gradient(160deg, hsl(${hue} 75% 55%), hsl(${(hue + 50) % 360} 80% 38%))`,
  });

  const handlePublishNow = async (reel) => {
    setIsPublishingId(reel.id);
    try {
      await publishReelNow(reel.id);
      showToast(`Published "${reel.title}" to Instagram!`);
    } catch (err) {
      showToast(err?.message || 'Publishing requires Meta OAuth & backend API');
    } finally {
      setIsPublishingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top Banner: Account Context & Quick Stats */}
      <div
        className="p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-4"
        style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
      >
        <div className="flex items-center gap-3">
          <span
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-xs"
            style={{ background: activeAccount?.color || 'var(--g)' }}
          >
            {activeAccount?.initials || 'EV'}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[var(--tx)] m-0">
                {activeAccount?.name || 'Main Workspace Account'}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--oks)] text-[var(--ok)] border border-[var(--ok)]">
                ● Live Synced
              </span>
            </div>
            <p className="text-xs text-[var(--mu)] m-0 mt-0.5">
              {activeAccount?.handle || 'All accounts'} · {counts.published} published reels ·{' '}
              {counts.scheduled} scheduled in queue
            </p>
          </div>
        </div>

        {/* Account Selector Dropdown & Create Button */}
        <div className="flex items-center gap-2.5">
          {accounts.length > 1 && (
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs font-semibold border outline-none text-[var(--tx)] cursor-pointer"
              style={{ background: 'var(--sf2)', borderColor: 'var(--ln)' }}
            >
              <option value="all">All Accounts ({reels.length})</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.handle}>
                  {acc.name} ({acc.handle})
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => {
              if (syncLiveReels) {
                syncLiveReels(activeAccount);
                showToast('Synced real Instagram reels directly from Meta Graph API!');
              }
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Sync latest live Instagram reels from Meta Graph API"
          >
            <span>🔄</span>
            <span>Sync Live Reels</span>
          </button>

          <button
            type="button"
            onClick={() => openNewReelModal('normal')}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md hover:opacity-95 transition-all border-0 flex items-center gap-1.5 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #6d3df2 0%, #d62f8e 50%, #ff7a45 100%)',
            }}
          >
            <span>+</span>
            <span>Create Reel</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs with Dynamic Counts */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {TABS.map((tab) => {
            const count = counts[tab.id] || 0;
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[var(--tx)] text-[var(--bg)] border-[var(--tx)] font-bold shadow-xs'
                    : 'bg-[var(--sf)] text-[var(--mu)] border-[var(--ln)] hover:text-[var(--tx)] hover:bg-[var(--sf2)]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? 'bg-[var(--bg)] text-[var(--tx)] font-extrabold' : 'bg-[var(--sf2)] text-[var(--mu)]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Reels & Posts */}
      {filteredReels.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredReels.map((reel) => {
            const acc =
              accounts.find((a) => a.id === reel.accountId || a.handle === reel.accountHandle) ||
              activeAccount ||
              accounts[0] ||
              null;

            return (
              <div
                key={reel.id}
                className="rounded-2xl border overflow-hidden flex flex-col justify-between transition-all hover:shadow-lg group"
                style={{
                  background: 'var(--sf)',
                  borderColor: 'var(--ln)',
                }}
              >
                {/* 9:12 Cover Aspect Ratio */}
                <div
                  onClick={() => {
                    setVideoErrorId(null);
                    setPreviewReel(reel);
                  }}
                  className="relative aspect-[9/12] flex flex-col justify-between p-3 text-white overflow-hidden select-none cursor-pointer"
                  style={reel.videoUrl || reel.coverUrl ? { background: '#000' } : getGradientStyle(reel.hue)}
                >
                  {reel.videoUrl ? (
                    <video
                      src={reel.videoUrl}
                      muted
                      playsInline
                      preload="metadata"
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : reel.coverUrl ? (
                    <img
                      src={reel.coverUrl}
                      alt={reel.title}
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : null}

                  {/* Header badges */}
                  <div className="flex items-center justify-between z-10">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-xs text-white">
                      {reel.kind || 'Reel'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteReel(reel.id);
                        showToast(`Deleted "${reel.title}"`);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-[10px] hover:bg-red-500 border-0 cursor-pointer"
                      title="Delete content"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Preview Button Overlay */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setVideoErrorId(null);
                      setPreviewReel(reel);
                    }}
                    className="w-11 h-11 rounded-full bg-white/30 backdrop-blur-md self-center flex items-center justify-center text-white text-base shadow-xl group-hover:scale-110 transition-transform z-10 border-0 cursor-pointer"
                    title="Play Reel"
                  >
                    ▶
                  </button>

                  {/* Footer metadata */}
                  <div className="flex items-center justify-between z-10 drop-shadow-md">
                    <small className="text-[11px] font-semibold text-white/95 truncate">
                      {acc?.handle || reel.accountHandle || activeAccount?.handle || '@creator'}
                    </small>
                    {reel.igMediaId && (
                      <span className="text-[9px] font-mono text-white/80 bg-black/40 px-1 rounded">
                        #{reel.igMediaId.slice(-4)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Info Body */}
                <div className="p-3 flex flex-col gap-2.5 flex-1 justify-between">
                  <div>
                    <b className="block text-xs font-bold text-[var(--tx)] line-clamp-2 leading-tight">
                      {reel.title}
                    </b>
                    <div className="flex items-center gap-1.5 mt-1">
                      {reel.status === 'scheduled' && <span className="text-[10px]">⏰</span>}
                      {reel.status === 'published' && <span className="text-[10px] text-[var(--ok)]">✓</span>}
                      {reel.status === 'draft' && <span className="text-[10px]">📝</span>}
                      {reel.status === 'failed' && <span className="text-[10px] text-[var(--er)]">⚠️</span>}
                      <small className="text-[11px] text-[var(--mu)] truncate">
                        {reel.dateText || (reel.status === 'published' ? 'Published on Instagram' : 'Not scheduled')}
                      </small>
                    </div>
                  </div>

                  {/* Card Bottom Bar & Dynamic Actions per Status */}
                  <div className="flex items-center justify-between gap-1 pt-2 border-t" style={{ borderColor: 'var(--ln)' }}>
                    <StatusChip status={reel.status} />

                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      {/* DRAFT ACTIONS: Schedule | Publish Now | Edit */}
                      {reel.status === 'draft' && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditReelModal(reel)}
                            className="text-[10px] font-bold text-[var(--br)] hover:underline border-0 bg-transparent p-1 cursor-pointer"
                            title="Schedule for date & time"
                          >
                            Schedule
                          </button>
                          <button
                            type="button"
                            disabled={isPublishingId === reel.id}
                            onClick={() => handlePublishNow(reel)}
                            className="text-[10px] font-bold text-[var(--ok)] hover:underline border-0 bg-transparent p-1 cursor-pointer"
                            title="Publish immediately to Instagram"
                          >
                            Publish
                          </button>
                        </>
                      )}

                      {/* SCHEDULED ACTIONS: Publish Now | Move to Draft | Edit */}
                      {reel.status === 'scheduled' && (
                        <>
                          <button
                            type="button"
                            disabled={isPublishingId === reel.id}
                            onClick={() => handlePublishNow(reel)}
                            className="text-[10px] font-bold text-[var(--br)] hover:underline border-0 bg-transparent p-1 cursor-pointer"
                            title="Publish immediately"
                          >
                            {isPublishingId === reel.id ? 'Publishing...' : 'Publish'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              moveReelToDrafts(reel.id);
                              showToast('Moved to drafts');
                            }}
                            className="text-[10px] font-semibold text-[var(--mu)] hover:text-[var(--tx)] border-0 bg-transparent p-1 cursor-pointer"
                            title="Move to draft"
                          >
                            Draft
                          </button>
                        </>
                      )}

                      {/* FAILED ACTIONS: Retry */}
                      {reel.status === 'failed' && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await retryPublish(reel.id);
                              showToast(`Retrying publish for "${reel.title}"...`);
                            } catch (err) {
                              showToast(err?.message || 'Retry failed');
                            }
                          }}
                          className="text-[10px] font-bold text-[var(--er)] hover:underline border-0 bg-transparent p-1 cursor-pointer"
                        >
                          Retry
                        </button>
                      )}

                      {/* ALL: Edit & Copy */}
                      <button
                        type="button"
                        onClick={() => openEditReelModal(reel)}
                        className="text-[10px] font-semibold text-[var(--mu)] hover:text-[var(--tx)] border-0 bg-transparent p-1 cursor-pointer"
                        title="Edit reel details"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await duplicateReel(reel.id);
                          showToast('Duplicated to drafts');
                        }}
                        className="text-[10px] font-semibold text-[var(--mu)] hover:text-[var(--tx)] border-0 bg-transparent p-1 cursor-pointer"
                        title="Duplicate as new draft"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Clean Friendly Empty State */
        <div
          className="p-12 text-center rounded-2xl border flex flex-col items-center justify-center gap-2 animate-fadeIn"
          style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
        >
          <span className="text-3xl mb-1">
            {activeFilter === 'scheduled' ? '⏰' : activeFilter === 'draft' ? '📝' : activeFilter === 'failed' ? '🎉' : '🎬'}
          </span>
          <p className="text-sm font-bold text-[var(--tx)] m-0">
            {activeFilter === 'scheduled'
              ? 'No scheduled reels in the queue.'
              : activeFilter === 'draft'
              ? 'No draft content saved yet.'
              : activeFilter === 'failed'
              ? 'No failed reels! All your media published cleanly.'
              : 'No content found in this filter.'}
          </p>
          <p className="text-xs text-[var(--mu)] m-0 max-w-[340px]">
            {activeFilter === 'scheduled'
              ? 'Plan and schedule your next Instagram reel with automated publishing.'
              : 'Create a new Reel or let InstaFlow AI Studio script one for you.'}
          </p>
          <button
            type="button"
            onClick={() => openNewReelModal(activeFilter === 'scheduled' ? 'normal' : 'normal')}
            className="mt-3 px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer shadow-md border-0"
            style={{
              background: 'linear-gradient(135deg, #6d3df2 0%, #d62f8e 50%, #ff7a45 100%)',
            }}
          >
            + Create New Reel
          </button>
        </div>
      )}

      {/* Content Preview Modal */}
      {previewReel && (
        <Modal
          isOpen={Boolean(previewReel)}
          onClose={() => setPreviewReel(null)}
          title={previewReel.title}
          subtitle={`${previewReel.kind || 'Reel'} · ${previewReel.accountHandle || activeAccount?.handle || '@creator'} · ${previewReel.dateText}`}
          maxWidth="max-w-[540px]"
        >
          <div className="flex flex-col gap-4">
            <div
              className={`w-full ${
                !previewReel.videoUrl || videoErrorId === previewReel.id
                  ? 'max-w-[330px] aspect-[9/14]'
                  : 'max-w-[270px] aspect-[9/16]'
              } mx-auto rounded-2xl overflow-hidden flex items-center justify-center relative text-white shadow-2xl`}
              style={
                previewReel.videoUrl || previewReel.coverUrl || previewReel.permalink
                  ? { background: '#000' }
                  : getGradientStyle(previewReel.hue)
              }
            >
              {previewReel.videoUrl && videoErrorId !== previewReel.id ? (
                <video
                  key={previewReel.id}
                  src={previewReel.videoUrl}
                  controls
                  autoPlay
                  playsInline
                  referrerPolicy="no-referrer"
                  onError={() => setVideoErrorId(previewReel.id)}
                  className="w-full h-full object-cover"
                />
              ) : previewReel.permalink ? (
                <iframe
                  key={previewReel.id}
                  src={`${previewReel.permalink.replace(/\/+$/, '')}/embed/`}
                  title={previewReel.title}
                  className="w-full h-full border-0 bg-white"
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : previewReel.coverUrl ? (
                <img src={previewReel.coverUrl} alt={previewReel.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center p-5 text-center">
                  <span className="text-3xl mb-2">🎬</span>
                  <span className="text-xs font-semibold px-2 opacity-95">
                    {previewReel.title}
                  </span>
                  <span className="text-[11px] mt-2 opacity-80 line-clamp-3">
                    {previewReel.caption || 'Published on Instagram'}
                  </span>
                </div>
              )}
            </div>

            {previewReel.caption && (
              <div
                className="p-3.5 rounded-xl border text-xs leading-relaxed"
                style={{ background: 'var(--sf2)', borderColor: 'var(--ln)' }}
              >
                <b className="block mb-1 text-[var(--tx)]">Caption</b>
                <p className="m-0 text-[var(--mu)] whitespace-pre-wrap">{previewReel.caption}</p>
              </div>
            )}

            {previewReel.igMediaId && (
              <div
                className="p-3 rounded-xl border text-xs flex items-center justify-between flex-wrap gap-2"
                style={{ background: 'var(--sf2)', borderColor: 'var(--ln)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[var(--ok)] font-bold">✓</span>
                  <span className="text-[var(--tx)] font-semibold">Live on Instagram</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-[var(--mu)]">ID: {previewReel.igMediaId}</span>
                  {previewReel.permalink && (
                    <a
                      href={previewReel.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-[var(--br)] hover:underline no-underline"
                    >
                      Open on Instagram ↗
                    </a>
                  )}
                </div>
              </div>
            )}

            {(previewReel.errorMessage || previewReel.errorDetails) && (
              <div
                className="p-3 rounded-xl border text-xs flex flex-col gap-1"
                style={{ background: 'var(--ers)', borderColor: 'var(--er)', color: 'var(--er)' }}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>Meta Error {previewReel.errorDetails?.code ? `(#${previewReel.errorDetails.code})` : ''}</span>
                  {previewReel.errorDetails?.type && (
                    <span className="text-[10px] opacity-75">{previewReel.errorDetails.type}</span>
                  )}
                </div>
                <p className="m-0 leading-relaxed">{previewReel.errorMessage || previewReel.errorDetails?.message}</p>
                {previewReel.retryCount > 0 && (
                  <span className="text-[10px] opacity-75">Attempts: {previewReel.retryCount}</span>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t flex-wrap" style={{ borderColor: 'var(--ln)' }}>
              <button
                type="button"
                onClick={() => {
                  const target = previewReel;
                  setPreviewReel(null);
                  openEditReelModal(target);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold border hover:bg-[var(--sf2)] cursor-pointer"
                style={{ background: 'var(--sf)', borderColor: 'var(--ln)', color: 'var(--tx)' }}
              >
                Edit & Reschedule
              </button>

              {previewReel.status === 'failed' && (
                <button
                  type="button"
                  disabled={isPublishingId === previewReel.id}
                  onClick={async () => {
                    const target = previewReel;
                    setPreviewReel(null);
                    try {
                      await retryPublish(target.id);
                      showToast(`Retrying publish for "${target.title}"...`);
                    } catch (err) {
                      showToast(err?.message || 'Retry failed');
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white border-0 cursor-pointer"
                  style={{ background: 'var(--er)' }}
                >
                  Retry Publish
                </button>
              )}

              {previewReel.status !== 'published' && previewReel.status !== 'failed' && (
                <button
                  type="button"
                  disabled={isPublishingId === previewReel.id}
                  onClick={() => handlePublishNow(previewReel)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white border-0 cursor-pointer shadow-md"
                  style={{ background: 'var(--g)' }}
                >
                  {isPublishingId === previewReel.id ? 'Publishing...' : 'Publish Now'}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
