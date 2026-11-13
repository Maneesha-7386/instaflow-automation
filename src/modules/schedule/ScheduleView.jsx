import React, { useState, useMemo } from 'react';
import { useAccount } from '../../hooks/useAccount';
import { useToast } from '../../hooks/useToast';
import StatusChip from '../../components/common/StatusChip';

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function ScheduleView() {
  const {
    reels,
    accounts,
    moveReelToDrafts,
    openNewReelModal,
    openEditReelModal,
    publishReelNow,
    checkAndProcessDueScheduled,
  } = useAccount();
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState('week'); // 'week' | 'month' | 'day'
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [publishingId, setPublishingId] = useState(null);
  const [isCheckingDue, setIsCheckingDue] = useState(false);

  const scheduledReels = useMemo(
    () => reels.filter((r) => r.status === 'scheduled' || r.status === 'publishing'),
    [reels]
  );

  const reelsByDate = useMemo(() => {
    const map = {};
    for (const r of scheduledReels) {
      let key = '';
      if (r.scheduledTimestamp && r.scheduledTimestamp.length >= 10) {
        key = r.scheduledTimestamp.slice(0, 10);
      }
      if (key) {
        if (!map[key]) map[key] = [];
        map[key].push(r);
      }
    }
    return map;
  }, [scheduledReels]);

  const [todayKey] = useState(() => toDateKey(new Date()));

  const calendarDays = useMemo(() => {
    if (viewMode === 'day') {
      const d = new Date(anchorDate);
      d.setHours(0, 0, 0, 0);
      return [d];
    }

    if (viewMode === 'month') {
      const firstOfMonth = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
      const start = getMondayOfWeek(firstOfMonth);
      return Array.from({ length: 35 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
      });
    }

    const monday = getMondayOfWeek(anchorDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [viewMode, anchorDate]);

  const handleShiftDate = (direction) => {
    const next = new Date(anchorDate);
    if (viewMode === 'day') next.setDate(next.getDate() + direction);
    else if (viewMode === 'week') next.setDate(next.getDate() + direction * 7);
    else next.setMonth(next.getMonth() + direction);
    setAnchorDate(next);
  };

  const rangeLabel = useMemo(() => {
    if (viewMode === 'day') {
      return anchorDate.toLocaleDateString('en-IN', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    if (viewMode === 'month') {
      return anchorDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    }
    const start = calendarDays[0];
    const end = calendarDays[calendarDays.length - 1];
    return `${start.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, [viewMode, anchorDate, calendarDays]);

  const getGradientStyle = (hue = 280) => ({
    background: `linear-gradient(160deg, hsl(${hue} 75% 55%), hsl(${(hue + 50) % 360} 80% 38%))`,
  });

  const handlePublish = async (reel) => {
    setPublishingId(reel.id);
    try {
      await publishReelNow(reel.id);
      showToast(`Published "${reel.title}" to Instagram!`);
    } catch (err) {
      showToast(err?.message || 'Publishing requires live Meta OAuth & backend API');
    } finally {
      setPublishingId(null);
    }
  };

  const handleSyncDue = async () => {
    setIsCheckingDue(true);
    try {
      const res = await checkAndProcessDueScheduled();
      if (res?.processed > 0) {
        showToast(`Processed ${res.processed} due scheduled item(s).`);
      } else {
        showToast('All scheduled items are up to date. No due posts right now.');
      }
    } catch (err) {
      showToast(err?.message || 'Failed to check due schedules');
    } finally {
      setIsCheckingDue(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-1 rounded-xl border bg-[var(--sf)]" style={{ borderColor: 'var(--ln)' }}>
            {['month', 'week', 'day'].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  viewMode === mode
                    ? 'bg-[var(--brs)] text-[var(--br)]'
                    : 'text-[var(--mu)] hover:text-[var(--tx)]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleShiftDate(-1)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold border hover:bg-[var(--sf2)]"
              style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => setAnchorDate(new Date())}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border hover:bg-[var(--sf2)]"
              style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleShiftDate(1)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold border hover:bg-[var(--sf2)]"
              style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
            >
              →
            </button>
          </div>

          <p className="text-xs md:text-sm font-semibold text-[var(--mu)] m-0 ml-1">
            {rangeLabel} · IST
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isCheckingDue}
            onClick={handleSyncDue}
            className="px-3 py-2 rounded-xl text-xs md:text-sm font-semibold border hover:bg-[var(--sf2)] transition-colors flex items-center gap-1.5"
            style={{ background: 'var(--sf)', borderColor: 'var(--ln)', color: 'var(--tx)' }}
            title="Checks if any scheduled posts have reached their publish time"
          >
            <span className={isCheckingDue ? 'animate-spin' : ''}>🔄</span>
            <span>{isCheckingDue ? 'Checking…' : 'Sync Due Posts'}</span>
          </button>
          <button
            type="button"
            onClick={() => openNewReelModal('normal')}
            className="px-4 py-2 rounded-xl text-xs md:text-sm font-semibold text-white shadow-xs hover:opacity-95 transition-all border-0"
            style={{ background: 'var(--g)' }}
          >
            + Schedule content
          </button>
        </div>
      </div>

      {/* Dynamic Calendar Grid */}
      <div
        className={
          viewMode === 'day'
            ? 'grid grid-cols-1 gap-2'
            : 'grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 overflow-x-auto'
        }
      >
        {calendarDays.map((dayObj, idx) => {
          const dateKey = toDateKey(dayObj);
          const isToday = dateKey === todayKey;
          const isOutsideMonth =
            viewMode === 'month' && dayObj.getMonth() !== anchorDate.getMonth();
          const dayLabel = DAYS_SHORT[(dayObj.getDay() + 6) % 7];
          const dayEvents = reelsByDate[dateKey] || [];

          return (
            <div
              key={`${dateKey}_${idx}`}
              className={`p-3 rounded-2xl flex flex-col border transition-all ${
                viewMode === 'month' ? 'min-h-[120px]' : 'min-h-[190px]'
              } ${isToday ? 'ring-2 ring-[var(--br)] bg-[var(--sf)]' : 'bg-[var(--sf2)]'} ${
                isOutsideMonth ? 'opacity-50' : ''
              }`}
              style={{ borderColor: 'var(--ln)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs font-bold ${
                    isToday ? 'text-[var(--br)]' : 'text-[var(--mu)]'
                  }`}
                >
                  {dayLabel}
                </span>
                <span
                  className={`text-xs font-bold ${
                    isToday
                      ? 'w-5 h-5 rounded-full bg-[var(--br)] text-white flex items-center justify-center text-[10px]'
                      : 'text-[var(--mu)]'
                  }`}
                >
                  {dayObj.getDate()}
                </span>
              </div>

              <div className="flex flex-col gap-2 mt-1">
                {dayEvents.map((r) => {
                  const acc =
                    accounts.find((a) => a.id === r.accountId) ||
                    accounts[r.accountIndex] ||
                    accounts[0] ||
                    null;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => openEditReelModal(r)}
                      className="p-2 rounded-xl text-xs border border-l-4 shadow-xs transition-transform hover:-translate-y-0.5 text-left w-full"
                      style={{
                        background: 'var(--sf)',
                        borderColor: 'var(--ln)',
                        borderLeftColor: `hsl(${r.hue || 260}, 75%, 50%)`,
                      }}
                    >
                      <b className="block text-[11px] font-bold text-[var(--tx)] truncate leading-tight">
                        {r.title}
                      </b>
                      <span className="text-[10px] text-[var(--mu)] block truncate mt-0.5">
                        {r.scheduledTimestamp?.slice(11, 16) || '18:30'} ·{' '}
                        {acc?.handle || r.accountHandle || '@unassigned'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Publishing Queue */}
      <div
        className="p-5 rounded-2xl border"
        style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
      >
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-[var(--tx)] m-0">Publishing queue</h2>
            <p className="text-[11px] text-[var(--mu)] m-0 mt-0.5">
              Automatic background cron execution requires Firebase Blaze Cloud Scheduler; use Publish Now when Meta OAuth is active.
            </p>
          </div>
          <span className="text-xs font-semibold text-[var(--mu)]">
            {scheduledReels.length} items queued
          </span>
        </div>

        <div className="flex flex-col divide-y" style={{ borderColor: 'var(--ln)' }}>
          {scheduledReels.length > 0 ? (
            scheduledReels.map((r) => {
              const acc =
                accounts.find((a) => a.id === r.accountId) ||
                accounts[r.accountIndex] ||
                accounts[0] ||
                null;

              return (
                <div key={r.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 flex-wrap sm:flex-nowrap">
                  <div
                    className="w-10 h-14 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs overflow-hidden"
                    style={getGradientStyle(r.hue)}
                  >
                    ▶
                  </div>
                  <div className="flex-1 min-w-0">
                    <b className="block text-sm font-bold text-[var(--tx)] truncate">{r.title}</b>
                    <span className="text-xs text-[var(--mu)] block">
                      {r.dateText} · {acc?.handle || r.accountHandle || '@unassigned'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusChip status={r.status} />
                    <button
                      type="button"
                      onClick={() => openEditReelModal(r)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border hover:bg-[var(--sf2)] transition-colors"
                      style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
                    >
                      Reschedule
                    </button>
                    <button
                      type="button"
                      disabled={publishingId === r.id || r.status === 'publishing'}
                      onClick={() => handlePublish(r)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white border-0 disabled:opacity-50"
                      style={{ background: 'var(--g)' }}
                    >
                      {publishingId === r.id || r.status === 'publishing' ? 'Publishing...' : 'Publish'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        moveReelToDrafts(r.id);
                        showToast(`Moved "${r.title}" to drafts`);
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border hover:bg-[var(--sf2)] transition-colors"
                      style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
                    >
                      Draft
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-[var(--mu)] py-4 m-0">No scheduled posts in the queue yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
