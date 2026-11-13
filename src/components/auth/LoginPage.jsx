import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

export default function LoginPage({ onLoginSuccess }) {
  const {
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    setDemoSession,
    isFirebaseLive,
  } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email address and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res =
        mode === 'login'
          ? await loginWithEmail(email.trim(), password)
          : await registerWithEmail(email.trim(), password, displayName.trim());

      setLoading(false);
      if (res.success) {
        showToast(
          mode === 'login'
            ? `Welcome back, ${email.split('@')[0]}!`
            : 'Account created successfully! Welcome to InstaFlow.'
        );
        if (onLoginSuccess) onLoginSuccess();
      } else {
        setErrorMsg(res.error || 'Authentication failed. Please check your credentials.');
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg(err.message || 'Authentication error. Please try again.');
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await loginWithGoogle();
      setLoading(false);
      if (res.success) {
        showToast('Signed in successfully with Google!');
        if (onLoginSuccess) onLoginSuccess();
      } else {
        setErrorMsg(res.error || 'Google sign-in could not be completed.');
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg(err.message || 'Google sign-in error.');
    }
  };

  const handleQuickDemo = () => {
    setDemoSession();
    showToast('Entered Demo Workspace as Creator (Lumen Studio)');
    if (onLoginSuccess) onLoginSuccess();
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden select-none"
      style={{
        background: 'var(--bg)',
        color: 'var(--tx)',
      }}
    >
      {/* Background Decorative Ambient Glows */}
      <div
        className="absolute top-[-15%] left-[20%] w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none opacity-20"
        style={{ background: 'radial-gradient(circle, #d6249f, #7f0df2)' }}
      />
      <div
        className="absolute bottom-[-10%] right-[15%] w-[450px] h-[450px] rounded-full blur-[140px] pointer-events-none opacity-20"
        style={{ background: 'radial-gradient(circle, #285AEB, #d6249f)' }}
      />

      <div className="w-full max-w-[440px] z-10 flex flex-col gap-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl shadow-xl mb-3 shrink-0"
            style={{
              background: 'var(--g)',
              boxShadow: '0 10px 25px -5px rgba(214, 47, 142, 0.5)',
            }}
          >
            ⚡
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--tx)] m-0">
            InstaFlow
          </h1>
          <p className="text-xs md:text-sm text-[var(--mu)] font-medium mt-1 m-0">
            Create. Automate. Publish.
          </p>
        </div>

        {/* Login / Register Card */}
        <div
          className="rounded-3xl border p-6 md:p-8 backdrop-blur-xl shadow-2xl flex flex-col gap-5 transition-all"
          style={{
            background: 'var(--sf)',
            borderColor: 'var(--ln)',
          }}
        >
          {/* Card Top Title & Mode Switcher */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-[var(--tx)] m-0">
                {mode === 'login' ? 'Sign In to Workspace' : 'Create Free Account'}
              </h2>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                style={{
                  background: isFirebaseLive ? 'var(--oks)' : 'var(--sf2)',
                  borderColor: isFirebaseLive ? 'var(--ok)' : 'var(--ln)',
                  color: isFirebaseLive ? 'var(--ok)' : 'var(--mu)',
                }}
              >
                {isFirebaseLive ? '● Live Firebase' : '⚡ Local Auth'}
              </span>
            </div>
            <p className="text-xs text-[var(--mu)] m-0 leading-relaxed">
              {mode === 'login'
                ? 'Enter your credentials to manage your Instagram reels and automations.'
                : 'Get started with automated DMs, AI reel studio and scheduled publishing.'}
            </p>
          </div>

          {/* Error Message Box */}
          {errorMsg && (
            <div
              className="p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border animate-fadeIn"
              style={{
                background: 'var(--ers)',
                borderColor: 'var(--er)',
                color: 'var(--er)',
              }}
            >
              <span>⚠️</span>
              <span className="flex-1">{errorMsg}</span>
            </div>
          )}

          {/* Google 1-Click Login Button */}
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleAuth}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border text-xs md:text-sm font-semibold hover:bg-[var(--sf2)] transition-all cursor-pointer shadow-xs"
            style={{
              background: 'var(--sf2)',
              borderColor: 'var(--ln)',
              color: 'var(--tx)',
            }}
          >
            {/* Official Google G Logo */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'var(--ln)' }} />
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--mu)]">
              or with email
            </span>
            <div className="flex-1 h-px" style={{ background: 'var(--ln)' }} />
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-[var(--mu)] mb-1">
                  Full Name / Creator Handle
                </label>
                <input
                  type="text"
                  placeholder="e.g. Eesha Verse"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-colors"
                  style={{
                    background: 'var(--sf2)',
                    borderColor: 'var(--ln)',
                    color: 'var(--tx)',
                  }}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[var(--mu)] mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="creator@lumenstudio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-colors"
                style={{
                  background: 'var(--sf2)',
                  borderColor: 'var(--ln)',
                  color: 'var(--tx)',
                }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-[var(--mu)]">
                  Password
                </label>
                {mode === 'login' && (
                  <span className="text-[11px] text-[var(--mu)] hover:underline cursor-pointer">
                    Forgot?
                  </span>
                )}
              </div>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-colors"
                style={{
                  background: 'var(--sf2)',
                  borderColor: 'var(--ln)',
                  color: 'var(--tx)',
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-xs md:text-sm font-bold text-white shadow-lg hover:opacity-95 transition-all mt-1 border-0 cursor-pointer disabled:opacity-50"
              style={{
                background: 'var(--g)',
                boxShadow: '0 8px 20px -6px rgba(214, 47, 142, 0.5)',
              }}
            >
              {loading
                ? 'Processing...'
                : mode === 'login'
                ? 'Sign In to Workspace →'
                : 'Create Account & Continue →'}
            </button>
          </form>

          {/* Toggle Login <-> Register */}
          <div className="text-center pt-2 border-t" style={{ borderColor: 'var(--ln)' }}>
            <p className="text-xs text-[var(--mu)] m-0">
              {mode === 'login' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setErrorMsg('');
                    }}
                    className="font-bold text-[var(--tx)] hover:underline border-0 bg-transparent p-0 cursor-pointer"
                  >
                    Create one for free
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMsg('');
                    }}
                    className="font-bold text-[var(--tx)] hover:underline border-0 bg-transparent p-0 cursor-pointer"
                  >
                    Sign in here
                  </button>
                </>
              )}
            </p>
          </div>

          {/* Quick Demo Access Bypass Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleQuickDemo}
              className="w-full py-2 px-3 rounded-xl border text-xs font-semibold transition-all hover:bg-[var(--sf2)] text-[var(--mu)] hover:text-[var(--tx)]"
              style={{
                background: 'transparent',
                borderColor: 'var(--ln)',
              }}
              title="Quickly test the workspace without entering credentials"
            >
              ⚡ Instant Demo Access (One-Click)
            </button>
          </div>
        </div>

        {/* Value Props & Security Badges (CreatorFlow-inspired) */}
        <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-[var(--mu)] px-2">
          <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[var(--sf)] border" style={{ borderColor: 'var(--ln)' }}>
            <span className="text-sm">💬</span>
            <span className="font-semibold text-[var(--tx)]">Auto DMs</span>
            <span className="text-[10px] opacity-75">Comment to DM</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[var(--sf)] border" style={{ borderColor: 'var(--ln)' }}>
            <span className="text-sm">🎬</span>
            <span className="font-semibold text-[var(--tx)]">Reel Studio</span>
            <span className="text-[10px] opacity-75">Direct Publish</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[var(--sf)] border" style={{ borderColor: 'var(--ln)' }}>
            <span className="text-sm">🔒</span>
            <span className="font-semibold text-[var(--tx)]">Meta Vault</span>
            <span className="text-[10px] opacity-75">Official Graph API</span>
          </div>
        </div>
      </div>
    </div>
  );
}

