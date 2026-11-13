import React, { useState } from 'react';
import Modal from '../common/Modal';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

export default function AuthModal({ isOpen, onClose }) {
  const { user, isFirebaseLive, loginWithEmail, registerWithEmail, loginWithGoogle, logout, setDemoSession } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const res =
      mode === 'login'
        ? await loginWithEmail(email, password)
        : await registerWithEmail(email, password, displayName);

    setLoading(false);
    if (res.success) {
      showToast(mode === 'login' ? `Welcome back, ${email.split('@')[0]}!` : 'Account created successfully!');
      onClose();
    } else {
      setErrorMsg(res.error || 'Authentication failed');
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    const res = await loginWithGoogle();
    setLoading(false);
    if (res.success) {
      showToast('Signed in with Google!');
      onClose();
    } else {
      setErrorMsg(res.error || 'Google sign-in failed');
    }
  };

  const handleLogout = async () => {
    await logout();
    showToast('Signed out of InstaFlow.');
    onClose();
  };

  const handleUseDemo = () => {
    setDemoSession();
    showToast('Switched to Demo Session: Lumen Studio');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? 'User Profile & Authentication' : mode === 'login' ? 'Sign In to InstaFlow' : 'Create an Account'}
      subtitle={
        isFirebaseLive
          ? 'Connected to live Firebase Authentication'
          : 'Running in Local Demo Mode (configure .env with Firebase keys for live auth)'
      }
      maxWidth="max-w-[480px]"
    >
      <div className="flex flex-col gap-4">
        {/* Firebase Live Status Badge */}
        <div
          className="p-3 rounded-xl border text-xs flex items-center justify-between"
          style={{
            background: isFirebaseLive ? 'var(--oks)' : 'var(--brs)',
            borderColor: isFirebaseLive ? 'var(--ok)' : 'var(--br)',
            color: isFirebaseLive ? 'var(--ok)' : 'var(--br)',
          }}
        >
          <span className="font-bold">
            {isFirebaseLive ? '● Live Firebase Auth Connected' : '⚡ Local Demo Mode Active'}
          </span>
          <span className="text-[11px] opacity-80">
            {isFirebaseLive ? 'Production Mode' : 'No API keys required'}
          </span>
        </div>

        {user ? (
          /* Logged In View */
          <div className="flex flex-col gap-4">
            <div
              className="p-4 rounded-xl border flex items-center gap-3.5"
              style={{ background: 'var(--sf2)', borderColor: 'var(--ln)' }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white"
                style={{ background: 'var(--g)' }}
              >
                {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
              </div>
              <div className="flex-1 truncate">
                <div className="font-bold text-sm text-[var(--tx)] truncate">
                  {user.displayName || 'InstaFlow User'}
                </div>
                <div className="text-xs text-[var(--mu)] truncate">{user.email}</div>
                <div className="text-[11px] text-[var(--br)] font-semibold mt-0.5">
                  {user.plan} · {user.runsUsed} / {user.runsLimit} runs
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 py-2 px-3 rounded-xl border font-semibold text-xs text-[var(--er)] hover:bg-[var(--ers)] transition-colors"
                style={{ borderColor: 'var(--ln)' }}
              >
                Sign Out
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 px-3 rounded-xl font-semibold text-xs text-white"
                style={{ background: 'var(--tx)' }}
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Sign In / Sign Up Form */
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {errorMsg && (
              <div className="p-2.5 rounded-lg text-xs bg-[var(--ers)] text-[var(--er)] font-medium">
                {errorMsg}
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-[var(--mu)] mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="Lumen Studio"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm"
                  style={{ background: 'var(--sf)', borderColor: 'var(--ln)', color: 'var(--tx)' }}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[var(--mu)] mb-1">Email Address</label>
              <input
                type="email"
                placeholder="creator@lumenstudio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-sm"
                style={{ background: 'var(--sf)', borderColor: 'var(--ln)', color: 'var(--tx)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--mu)] mb-1">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-sm"
                style={{ background: 'var(--sf)', borderColor: 'var(--ln)', color: 'var(--tx)' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-sm text-white shadow-md hover:opacity-95 transition-all border-0 mt-1"
              style={{ background: 'var(--g)' }}
            >
              {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>

            <div className="relative my-2 text-center">
              <span className="px-2 text-xs text-[var(--mu)] bg-[var(--sf)] relative z-10">or</span>
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" style={{ borderColor: 'var(--ln)' }} />
              </div>
            </div>

            {/* Google Sign In */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-2 px-3 rounded-xl border font-semibold text-xs md:text-sm flex items-center justify-center gap-2 hover:bg-[var(--sf2)] transition-colors"
              style={{ background: 'var(--sf)', borderColor: 'var(--ln)', color: 'var(--tx)' }}
            >
              <span>🌐</span>
              <span>Continue with Google</span>
            </button>

            {/* Demo Mode Button (only shown when Firebase env config is absent) */}
            {!isFirebaseLive && (
              <button
                type="button"
                onClick={handleUseDemo}
                className="w-full py-2 px-3 rounded-xl border font-semibold text-xs text-[var(--br)] bg-[var(--brs)] hover:opacity-90 transition-colors border-0"
              >
                ⚡ Use Demo Account (Lumen Studio)
              </button>
            )}

            <div className="text-center text-xs text-[var(--mu)] mt-1">
              {mode === 'login' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className="font-bold text-[var(--br)] underline border-0 bg-transparent p-0"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="font-bold text-[var(--br)] underline border-0 bg-transparent p-0"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
