import React, { useState, useMemo } from 'react';
import { useAccount } from '../../hooks/useAccount';
import { useToast } from '../../hooks/useToast';
import StatusChip from '../../components/common/StatusChip';

const STATUS_FILTERS = ['all', 'success', 'failed', 'publishing', 'running'];

export default function HistoryView() {
  const { history, retryHistoryItem } = useAccount();
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return history.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (item.source || '').toLowerCase().includes(q) ||
        (item.message || '').toLowerCase().includes(q) ||
        (item.account || '').toLowerCase().includes(q)
      );
    });
  }, [history, statusFilter, searchQuery]);

  const handleRetry = async (id, message) => {
    await retryHistoryItem(id);
    showToast(`Processed retry check for: ${message.slice(0, 36)}...`);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Table Container */}
      <div
        className="p-5 rounded-2xl border flex flex-col gap-4"
        style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-bold text-[var(--tx)] m-0">
              Automation & Publishing History
            </h2>
            <p className="text-xs text-[var(--mu)] m-0 mt-0.5">
              Real-time audit log of all scheduled posts, container publishes, and automation runs.
            </p>
          </div>
          <span className="text-xs font-semibold text-[var(--mu)]">
            {filteredHistory.length} of {history.length} events
          </span>
        </div>

        {/* Filters & Search */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_FILTERS.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all capitalize ${
                  statusFilter === st
                    ? 'bg-[var(--tx)] text-[var(--bg)] border-[var(--tx)]'
                    : 'bg-[var(--sf)] text-[var(--mu)] border-[var(--ln)] hover:text-[var(--tx)]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Search events or @account..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 rounded-xl border text-xs w-full sm:w-60"
            style={{ background: 'var(--sf)', borderColor: 'var(--ln)', color: 'var(--tx)' }}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--ln)' }}>
                <th className="py-2.5 px-3 font-bold text-[var(--mu)]">When</th>
                <th className="py-2.5 px-3 font-bold text-[var(--mu)]">Source</th>
                <th className="py-2.5 px-3 font-bold text-[var(--mu)]">What happened</th>
                <th className="py-2.5 px-3 font-bold text-[var(--mu)]">Account</th>
                <th className="py-2.5 px-3 font-bold text-[var(--mu)]">Status</th>
                <th className="py-2.5 px-3 font-bold text-[var(--mu)] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--ln)' }}>
              {filteredHistory.length > 0 ? (
                filteredHistory.map((h) => (
                  <tr key={h.id} className="hover:bg-[var(--sf2)] transition-colors">
                    <td className="py-3 px-3 text-[var(--mu)] whitespace-nowrap">{h.time}</td>
                    <td className="py-3 px-3 font-bold text-[var(--tx)] whitespace-nowrap">{h.source}</td>
                    <td className="py-3 px-3 font-medium text-[var(--tx)] max-w-[320px]">
                      <div className="flex flex-col gap-0.5">
                        <span className="truncate block" title={h.message}>
                          {h.message}
                        </span>
                        {h.errorDetails && (
                          <small
                            className="text-[10px] text-[var(--er)] opacity-85 truncate block"
                            title={h.errorDetails.message || JSON.stringify(h.errorDetails)}
                          >
                            {h.errorDetails.code ? `Meta #${h.errorDetails.code}: ` : ''}
                            {h.errorDetails.message || h.errorDetails.type || 'Publishing error'}
                          </small>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-[var(--mu)] whitespace-nowrap">
                      {h.account}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <StatusChip status={h.status} />
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      {h.status === 'failed' ? (
                        <button
                          type="button"
                          onClick={() => handleRetry(h.id, h.message)}
                          className="px-2.5 py-1 rounded-md text-[11px] font-bold border hover:bg-[var(--sf)] transition-colors text-[var(--br)]"
                          style={{ borderColor: 'var(--ln)' }}
                        >
                          Retry
                        </button>
                      ) : (
                        <span className="text-[11px] text-[var(--mu)] opacity-40">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 px-3 text-center text-[var(--mu)]">
                    No matching publishing or automation history events found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
