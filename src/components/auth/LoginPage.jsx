import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

export default function LoginPage({ onLoginSuccess }) {
  const {
    loginWithEmail,
    registerWithEmail,
    resetPassword,
    loginWithGoogle,
    setDemoSession,
    isFirebaseLive,
  } = useAuth();
  const { showToast } = useToast();

  // Mode: 'signin' | 'signup' synced with URL hash
  const [mode, setMode] = useState(() => {
    const hash = window.location.hash.toLowerCase();
    if (hash === '#signup' || hash === '#register') return 'signup';
    return 'signin';
  });

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('instaflow_remembered_email') || '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('instaflow_remember_me') === 'true';
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState(null);

  // Sync mode with browser URL hash for real-world navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#signup' || hash === '#register') {
        setMode('signup');
        setErrorMsg('');
      } else if (hash === '#signin' || hash === '#login') {
        setMode('signin');
        setErrorMsg('');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const switchMode = (newMode) => {
    setMode(newMode);
    setErrorMsg('');
    window.location.hash = newMode === 'signup' ? 'signup' : 'signin';
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMsg('Please enter a valid email address (e.g. name@domain.com).');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    // Save remember me preference
    if (rememberMe) {
      localStorage.setItem('instaflow_remembered_email', trimmedEmail);
      localStorage.setItem('instaflow_remember_me', 'true');
    } else {
      localStorage.removeItem('instaflow_remembered_email');
      localStorage.setItem('instaflow_remember_me', 'false');
    }

    setLoading(true);

    try {
      const res =
        mode === 'signin'
          ? await loginWithEmail(trimmedEmail, password, rememberMe)
          : await registerWithEmail(trimmedEmail, password, displayName.trim());

      setLoading(false);
      if (res.success) {
        showToast(
          mode === 'signin'
            ? `Welcome back, ${displayName || trimmedEmail.split('@')[0]}!`
            : 'Account created successfully! Welcome to InstaFlow.'
        );
        if (onLoginSuccess) onLoginSuccess(mode);
      } else {
        setErrorMsg(res.error || 'Authentication failed. Please verify your credentials.');
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
        if (onLoginSuccess) onLoginSuccess(mode);
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
    if (onLoginSuccess) onLoginSuccess('signin');
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes('@')) {
      setForgotMsg({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    setForgotLoading(true);
    setForgotMsg(null);

    const res = await resetPassword(forgotEmail.trim());
    setForgotLoading(false);

    if (res.success) {
      setForgotMsg({
        type: 'success',
        text: res.message || `Password reset link sent to ${forgotEmail}. Check your inbox!`,
      });
      showToast('Password reset email sent!');
    } else {
      setForgotMsg({ type: 'error', text: res.error || 'Failed to send reset email.' });
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 md:p-6 relative overflow-x-hidden select-none bg-gradient-to-br from-[#f8f5fe] via-[#f1eafd] to-[#e8defb]">
      {/* Background Soft Glow Accents */}
      <div className="absolute top-[-12%] left-[15%] w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none opacity-40 bg-purple-300" />
      <div className="absolute bottom-[-10%] right-[15%] w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none opacity-40 bg-pink-300" />

      {/* Main Centered Wrapper */}
      <div className="w-full max-w-[480px] z-10 flex flex-col items-center">
        {/* Centered Auth Card */}
        <div className="w-full bg-white rounded-[32px] p-7 md:p-8 shadow-[0_25px_70px_rgba(112,50,230,0.13)] border border-purple-100/90 relative">
          {/* Top Bar: Live Status & Free Forever Badge */}
          <div className="flex items-center justify-between mb-5">
            <span
              className="text-[11px] font-extrabold px-3 py-1 rounded-full border flex items-center gap-1.5 shadow-xs"
              style={{
                background: isFirebaseLive ? '#ecfdf5' : '#f5f3ff',
                borderColor: isFirebaseLive ? '#10b981' : '#c4b5fd',
                color: isFirebaseLive ? '#047857' : '#6b21a8',
              }}
            >
              <span className="text-xs">{isFirebaseLive ? '🟢' : '⚡'}</span>
              <span>{isFirebaseLive ? 'Live Firebase Connected' : 'Instant Demo Ready'}</span>
            </span>

            {/* Free Forever Badge */}
            <span
              className="text-[11px] font-extrabold px-3 py-1 rounded-full border flex items-center gap-1.5 shadow-xs"
              style={{
                background: '#faf5ff',
                borderColor: '#d8b4fe',
                color: '#7e22ce',
              }}
            >
              <span>✨</span>
              <span>Free Forever</span>
            </span>
          </div>

          {/* Segmented Navigation Tabs: Sign In / Sign Up */}
          <div className="flex p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200/90 mb-6 gap-1 shadow-inner">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs md:text-sm font-extrabold rounded-xl transition-all cursor-pointer border-0"
              style={{
                background: mode === 'signin' ? '#ffffff' : 'transparent',
                color: mode === 'signin' ? '#6d28d9' : '#475569',
                boxShadow: mode === 'signin' ? '0 2px 8px rgba(109, 40, 217, 0.16)' : 'none',
              }}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => switchMode('signup')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs md:text-sm font-extrabold rounded-xl transition-all cursor-pointer border-0"
              style={{
                background: mode === 'signup' ? '#ffffff' : 'transparent',
                color: mode === 'signup' ? '#6d28d9' : '#475569',
                boxShadow: mode === 'signup' ? '0 2px 8px rgba(109, 40, 217, 0.16)' : 'none',
              }}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span>Sign Up</span>
            </button>
          </div>

          {/* Header Title & Subtitle */}
          <div className="mb-5">
            <h3 className="text-2xl font-black text-slate-900 m-0 tracking-tight" style={{ color: '#0f172a' }}>
              {mode === 'signin' ? 'Welcome Back!' : 'Create Your Account'}
            </h3>
            <p className="text-xs md:text-sm font-semibold mt-1.5 m-0" style={{ color: '#475569' }}>
              {mode === 'signin'
                ? 'Sign in to access your InstaFlow workspace'
                : 'Start growing your Instagram creator workspace with InstaFlow'}
            </p>
          </div>

          {/* Error Message Alert */}
          {errorMsg && (
            <div
              className="mb-4 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border animate-fadeIn"
              style={{
                background: '#fff1f2',
                borderColor: '#fecdd3',
                color: '#be123c',
              }}
            >
              <span className="text-sm">⚠️</span>
              <span className="flex-1">{errorMsg}</span>
            </div>
          )}

          {/* Main Form */}
          <form onSubmit={handleFormSubmit} className="flex flex-col gap-3.5">
            {/* Full Name Field (Sign Up Only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#1e293b' }}>
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#7c3aed' }}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-semibold outline-none transition-all shadow-xs"
                    style={{
                      background: '#ffffff',
                      color: '#0f172a',
                      border: '1.5px solid #cbd5e1',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Email Input Field with Mail Icon */}
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: '#1e293b' }}>
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#7c3aed' }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-semibold outline-none transition-all shadow-xs"
                  style={{
                    background: '#ffffff',
                    color: '#0f172a',
                    border: '1.5px solid #cbd5e1',
                  }}
                />
              </div>
            </div>

            {/* Password Input Field with Lock & Eye Toggle Icon */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold" style={{ color: '#1e293b' }}>
                  Password
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPasswordOpen(true);
                      setForgotEmail(email);
                      setForgotMsg(null);
                    }}
                    className="text-xs font-extrabold hover:underline border-0 bg-transparent p-0 cursor-pointer"
                    style={{ color: '#7c3aed' }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#7c3aed' }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3 rounded-xl text-sm font-semibold outline-none transition-all shadow-xs"
                  style={{
                    background: '#ffffff',
                    color: '#0f172a',
                    border: '1.5px solid #cbd5e1',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer p-0 border-0 bg-transparent transition-colors"
                  style={{ color: '#64748b' }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox Row */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-xs" style={{ color: '#334155' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 border-slate-300 focus:ring-purple-500 cursor-pointer"
                />
                <span>Remember me on this browser</span>
              </label>
            </div>

            {/* Primary Action Button with Gradient */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-xl font-extrabold text-sm shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer border-0 disabled:opacity-50 mt-1.5"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 45%, #ec4899 100%)',
                color: '#ffffff',
                boxShadow: '0 10px 25px -4px rgba(139, 92, 246, 0.45)',
              }}
            >
              {loading ? (
                <span>Processing...</span>
              ) : (
                <>
                  <span className="text-base font-black">➔</span>
                  <span className="tracking-wide">{mode === 'signin' ? 'Sign In to Workspace' : 'Create Free Account'}</span>
                </>
              )}
            </button>
          </form>

          {/* Divider OR */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[11px] uppercase font-black tracking-widest text-slate-400" style={{ color: '#64748b' }}>
              OR
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Social Logins: Google & Demo Mode */}
          <div className="flex flex-col gap-3">
            {/* Continue with Google */}
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleAuth}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl transition-all cursor-pointer hover:bg-slate-50 shadow-xs"
              style={{
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                color: '#0f172a',
                fontWeight: 700,
                fontSize: '14px',
              }}
            >
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

            {/* Try Demo Mode Button */}
            <button
              type="button"
              onClick={handleQuickDemo}
              className="w-full py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:opacity-95"
              style={{
                background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                border: '1.5px solid #c4b5fd',
                color: '#581c87',
                fontWeight: 800,
                fontSize: '14px',
              }}
            >
              <span className="text-xs" style={{ color: '#7c3aed' }}>▶</span>
              <span>Try Demo Mode (Instant Access)</span>
            </button>
          </div>

          {/* Bottom Switch Link */}
          <div className="text-center pt-5 mt-5 border-t border-slate-200">
            <p className="text-xs font-semibold m-0" style={{ color: '#475569' }}>
              {mode === 'signin' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="font-extrabold hover:underline border-0 bg-transparent p-0 cursor-pointer"
                    style={{ color: '#7c3aed' }}
                  >
                    Sign Up for Free
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="font-extrabold hover:underline border-0 bg-transparent p-0 cursor-pointer"
                    style={{ color: '#7c3aed' }}
                  >
                    Sign In Here
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* REAL-WORLD FORGOT PASSWORD MODAL                          */}
      {/* ========================================================= */}
      {isForgotPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-purple-100 relative">
            <button
              type="button"
              onClick={() => setIsForgotPasswordOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer border-0 bg-transparent text-lg"
            >
              ✕
            </button>

            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl mb-4">
              🔑
            </div>

            <h3 className="text-xl font-black text-slate-900 m-0">
              Reset Your Password
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Enter your email and we'll send you an official reset link.
            </p>

            {forgotMsg && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                  forgotMsg.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}
              >
                <span>{forgotMsg.type === 'success' ? '✅' : '⚠️'}</span>
                <span className="flex-1">{forgotMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#1e293b' }}>
                  Your Account Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold outline-none transition-all"
                  style={{
                    background: '#ffffff',
                    color: '#0f172a',
                    border: '1.5px solid #cbd5e1',
                  }}
                />
              </div>

              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer transition-colors"
                  style={{
                    color: '#334155',
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold shadow-md cursor-pointer border-0 disabled:opacity-50 transition-opacity"
                  style={{
                    color: '#ffffff',
                    background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                  }}
                >
                  {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
