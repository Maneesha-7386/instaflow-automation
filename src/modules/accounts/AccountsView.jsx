import React, { useState } from 'react';
import { useAccount } from '../../hooks/useAccount';
import { useToast } from '../../hooks/useToast';
import StatusChip from '../../components/common/StatusChip';

export default function AccountsView() {
  const {
    accounts,
    activeAccountIndex,
    switchAccount,
    reels,
    disconnectAccount,
    removeAccount,
    updateAccount,
    setIsConnectModalOpen,
  } = useAccount();
  const { showToast } = useToast();

  const [editingAcc, setEditingAcc] = useState(null);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editFollowers, setEditFollowers] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [editAccountType, setEditAccountType] = useState('Creator');
  const [editCategory, setEditCategory] = useState('Digital Creator');

  const handleDisconnect = async (idx, acc) => {
    await disconnectAccount(idx);
    showToast(`Disconnected ${acc.handle}. You can reconnect anytime.`);
  };

  const handleReconnect = () => {
    setIsConnectModalOpen(true);
  };

  const handleRemove = async (idx, acc) => {
    await removeAccount(idx);
    showToast(`Removed ${acc.handle} from workspace`);
  };

  const handleOpenEdit = (acc) => {
    setEditingAcc(acc);
    setEditName(acc.name || '');
    setEditBio(acc.bio || '');
    setEditFollowers(acc.followers || '');
    setEditPhotoUrl(acc.profilePictureUrl || '');
    setEditAccountType(acc.accountType || 'Creator');
    setEditCategory(acc.category || 'Digital Creator');
  };

  const handleSaveEdit = async () => {
    if (!editingAcc) return;
    const updates = {
      name: editName.trim() || editingAcc.name,
      bio: editBio.trim(),
      followers: editFollowers.trim() || '',
      profilePictureUrl: editPhotoUrl.trim(),
      accountType: editAccountType,
      category: editCategory,
    };
    if (updateAccount) {
      await updateAccount(editingAcc.id, updates);
    }
    showToast(`Updated profile details for ${editingAcc.handle}!`);
    setEditingAcc(null);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header Description */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-[var(--mu)] m-0">
          Link the Instagram professional accounts you want to publish and automate for.
        </p>
        <button
          type="button"
          onClick={() => setIsConnectModalOpen(true)}
          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white shadow-xs hover:opacity-95 transition-all border-0"
          style={{ background: 'var(--g)' }}
        >
          + Connect new account
        </button>
      </div>

      {/* Security Architecture Callout */}
      <div
        className="p-4 rounded-2xl border text-xs leading-relaxed"
        style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
      >
        <div className="flex items-center gap-2 font-bold text-[var(--tx)] mb-1">
          <span>🔒 Secure Token Vault Architecture</span>
          <span className="chip c-ok text-[10px]">Meta Verified</span>
        </div>
        <p className="m-0 text-[var(--mu)]">
          InstaFlow vaults your 60-day Meta Long-Lived Page tokens strictly on secure backend Cloud Functions.
          Tokens are never sent to or stored in client-side code, guaranteeing complete account safety under Meta Developer policies.
        </p>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc, idx) => {
          const accountReels = reels.filter(
            (r) => r.accountId === acc.id || r.accountHandle === acc.handle
          );
          const scheduledNum = accountReels.filter((r) => r.status === 'scheduled').length;
          const localPublished = accountReels.filter((r) => r.status === 'published').length;
          const publishedNum = Math.max(localPublished, acc.mediaCount || 0);
          const totalNum = scheduledNum + publishedNum;

          return (
          <div
            key={acc.id}
            className="p-5 rounded-2xl border flex flex-col justify-between transition-all hover:shadow-xs"
            style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
          >
            <div>
              <div className="flex items-center gap-3.5">
                {acc.profilePictureUrl ? (
                  <img
                    src={acc.profilePictureUrl}
                    alt={acc.handle}
                    className="w-12 h-12 rounded-full object-cover shrink-0 shadow-xs border"
                    style={{ borderColor: 'var(--ln)' }}
                  />
                ) : (
                  <span
                    className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white shrink-0 shadow-xs"
                    style={{ background: acc.color }}
                  >
                    {acc.initials}
                  </span>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-base font-bold text-[var(--tx)] m-0 truncate">
                      {acc.name}
                    </h3>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                      style={{
                        background: 'var(--sf2)',
                        borderColor: 'var(--ln)',
                        color: 'var(--br)',
                      }}
                    >
                      {acc.accountType ? `Instagram ${acc.accountType}` : acc.category || 'Instagram Business'}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--mu)] m-0 truncate mt-0.5">
                    {acc.handle} {acc.followers ? `· ${acc.followers} followers` : ''}
                  </p>
                </div>
              </div>

              {acc.bio && (
                <div
                  className="mt-3 px-3 py-2 rounded-xl text-xs border"
                  style={{ background: 'var(--sf2)', borderColor: 'var(--ln)', color: 'var(--tx)' }}
                >
                  <p className="m-0 italic text-[11px] leading-relaxed">
                    "{acc.bio}"
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3 mt-3 text-[11px] text-[var(--mu)]">
                <span>{totalNum} total</span>
                <span>·</span>
                <span>{scheduledNum} scheduled</span>
                <span>·</span>
                <span>{publishedNum} published</span>
              </div>

              {/* Active Workspace Switcher Action */}
              <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t" style={{ borderColor: 'var(--ln)' }}>
                {idx === activeAccountIndex ? (
                  <span className="text-[11px] font-bold text-[var(--ok)] flex items-center gap-1.5 py-0.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--ok)]"></span>
                    <span>Active in Workspace</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      switchAccount(idx);
                      showToast(`Switched active account to ${acc.handle}`);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[var(--tx)] border hover:bg-[var(--sf2)] transition-colors cursor-pointer flex items-center gap-1.5"
                    style={{ background: 'var(--sf2)', borderColor: 'var(--ln)' }}
                    title="Switch active workspace account"
                  >
                    <span>🔄</span>
                    <span>Switch to this account</span>
                  </button>
                )}
              </div>
            </div>

            <div
              className="flex items-center justify-between gap-2 mt-3 pt-3 border-t"
              style={{ borderColor: 'var(--ln)' }}
            >
              <StatusChip
                status={acc.connected ? 'connected' : 'reconnect_needed'}
              />
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(acc)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border hover:bg-[var(--sf2)] text-[var(--tx)] transition-colors"
                  style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
                  title="Edit profile display details"
                >
                  Edit
                </button>
                {acc.connected ? (
                  <button
                    type="button"
                    onClick={() => handleDisconnect(idx, acc)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border hover:bg-[var(--ers)] text-[var(--er)] transition-colors"
                    style={{
                      background: 'var(--sf)',
                      borderColor: 'var(--ln)',
                    }}
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleReconnect}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border hover:bg-[var(--sf2)] text-[var(--tx)] transition-colors"
                    style={{
                      background: 'var(--sf)',
                      borderColor: 'var(--ln)',
                    }}
                  >
                    Reconnect
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(idx, acc)}
                  className="px-2 py-1.5 rounded-lg text-xs font-semibold border hover:bg-[var(--sf2)] text-[var(--mu)] hover:text-[var(--er)] transition-colors"
                  style={{ background: 'var(--sf)', borderColor: 'var(--ln)' }}
                  title="Remove from workspace"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
          );
        })}

        {/* Dashed Add Account Card */}
        <button
          type="button"
          onClick={() => setIsConnectModalOpen(true)}
          className="p-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center min-h-[140px] text-center font-bold text-xs md:text-sm text-[var(--mu)] hover:text-[var(--br)] hover:border-[var(--br)] hover:bg-[var(--brs)] transition-all cursor-pointer"
          style={{ borderColor: 'var(--ln)', background: 'var(--sf)' }}
        >
          <span className="text-2xl mb-1">+</span>
          <span>Connect Instagram account</span>
          <span className="text-[11px] font-normal text-[var(--mu)] mt-0.5">
            Meta OAuth 2.0 Professional
          </span>
        </button>
      </div>

      {/* Edit Account Modal */}
      {editingAcc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div
            className="w-full max-w-md p-6 rounded-2xl border shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            style={{
              background: 'var(--sf)',
              borderColor: 'var(--ln)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[var(--tx)] m-0">
                  Edit Account Details
                </h3>
                <p className="text-xs text-[var(--mu)] m-0 mt-0.5">
                  Update display information for {editingAcc.handle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAcc(null)}
                className="p-1 rounded-lg hover:bg-[var(--sf2)] text-[var(--mu)] hover:text-[var(--tx)] transition-colors border-0"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--tx)] mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Display Name"
                  className="w-full px-3 py-2 rounded-xl text-xs border outline-none text-[var(--tx)] focus:border-[var(--br)]"
                  style={{
                    background: 'var(--sf2)',
                    borderColor: 'var(--ln)',
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--tx)] mb-1">
                  Account Type (Professional)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditAccountType('Creator')}
                    className={`p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      editAccountType === 'Creator'
                        ? 'border-[var(--br)] bg-[var(--brs)] text-[var(--tx)]'
                        : 'border-[var(--ln)] bg-[var(--sf2)] text-[var(--mu)]'
                    }`}
                  >
                    👑 Creator
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditAccountType('Business')}
                    className={`p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      editAccountType === 'Business'
                        ? 'border-[var(--br)] bg-[var(--brs)] text-[var(--tx)]'
                        : 'border-[var(--ln)] bg-[var(--sf2)] text-[var(--mu)]'
                    }`}
                  >
                    💼 Business
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--tx)] mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  placeholder="e.g. Digital Creator, Video Creator"
                  className="w-full px-3 py-2 rounded-xl text-xs border outline-none text-[var(--tx)] focus:border-[var(--br)]"
                  style={{
                    background: 'var(--sf2)',
                    borderColor: 'var(--ln)',
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--tx)] mb-1">
                  Instagram Bio
                </label>
                <textarea
                  rows={2}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Write your account bio or description"
                  className="w-full px-3 py-2 rounded-xl text-xs border outline-none text-[var(--tx)] focus:border-[var(--br)] resize-none"
                  style={{
                    background: 'var(--sf2)',
                    borderColor: 'var(--ln)',
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--tx)] mb-1">
                  Followers Count (Display)
                </label>
                <input
                  type="text"
                  value={editFollowers}
                  onChange={(e) => setEditFollowers(e.target.value)}
                  placeholder="e.g. 150 or 1.2K (leave blank to hide)"
                  className="w-full px-3 py-2 rounded-xl text-xs border outline-none text-[var(--tx)] focus:border-[var(--br)]"
                  style={{
                    background: 'var(--sf2)',
                    borderColor: 'var(--ln)',
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--tx)] mb-1">
                  Profile Picture URL
                </label>
                <input
                  type="url"
                  value={editPhotoUrl}
                  onChange={(e) => setEditPhotoUrl(e.target.value)}
                  placeholder="Paste direct image URL or leave empty for initials avatar"
                  className="w-full px-3 py-2 rounded-xl text-xs border outline-none text-[var(--tx)] focus:border-[var(--br)]"
                  style={{
                    background: 'var(--sf2)',
                    borderColor: 'var(--ln)',
                  }}
                />
                <p className="text-[11px] text-[var(--mu)] mt-1">
                  Tip: Clear this box to use a clean gradient badge with your initials (no random stranger photo).
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t" style={{ borderColor: 'var(--ln)' }}>
              <button
                type="button"
                onClick={() => setEditingAcc(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border hover:bg-[var(--sf2)] text-[var(--tx)] transition-colors"
                style={{
                  background: 'var(--sf)',
                  borderColor: 'var(--ln)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-xs hover:opacity-95 transition-all border-0"
                style={{ background: 'var(--g)' }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
