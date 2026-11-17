import React, { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { AccountProvider } from './contexts/AccountContext';
import { ToastProvider } from './contexts/ToastContext';
import { useAccount } from './hooks/useAccount';
import { useAuth } from './hooks/useAuth';
import { useToast } from './hooks/useToast';

// Layout Components
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import LoginPage from './components/auth/LoginPage';
import ConnectInstagramOnboarding from './components/onboarding/ConnectInstagramOnboarding';

// Modals
import ConnectAccountModal from './components/modals/ConnectAccountModal';
import NewReelModal from './components/modals/NewReelModal';
import AuthModal from './components/modals/AuthModal';

// Module Views
import DashboardView from './modules/dashboard/DashboardView';
import AccountsView from './modules/accounts/AccountsView';
import ReelsView from './modules/reels/ReelsView';
import AIStudioView from './modules/aiStudio/AIStudioView';
import ScheduleView from './modules/schedule/ScheduleView';
import AutomationsView from './modules/automations/AutomationsView';
import HistoryView from './modules/history/HistoryView';

function AppContent() {
  const [currentView, setCurrentView] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return hash || 'home';
  });

  const { user, loading, isFirebaseLive } = useAuth();
  const { showToast: _showToast } = useToast();
  const [authPromptDismissed, setAuthPromptDismissed] = useState(false);

  const {
    accounts,
    isConnectModalOpen,
    setIsConnectModalOpen,
    isNewReelModalOpen,
    setIsNewReelModalOpen,
    newReelInitialTab,
    editingReel,
    setEditingReel,
    isAuthModalOpen,
    setIsAuthModalOpen,
  } = useAccount();

  const [hasSkippedOnboarding, setHasSkippedOnboarding] = useState(() => {
    return sessionStorage.getItem('instaflow_skipped_onboarding') === 'true';
  });

  const hasConnectedInstagram = accounts && accounts.some((a) => a.connected);

  const showAuthModal =
    isAuthModalOpen || (isFirebaseLive && !loading && !user && !authPromptDismissed);

  // Check if URL has Meta OAuth callback query parameters (?code=... or ?error=...)
  const hasOAuthParams = Boolean(
    new URLSearchParams(window.location.search).get('code') ||
      new URLSearchParams(window.location.search).get('error') ||
      new URLSearchParams(window.location.search).get('error_description')
  );

  // Listen to hash changes for browser back/forward buttons
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) setCurrentView(hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (viewId) => {
    window.location.hash = viewId;
    setCurrentView(viewId);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'home':
        return <DashboardView onNavigate={handleNavigate} />;
      case 'accounts':
        return <AccountsView />;
      case 'content':
        return <ReelsView />;
      case 'ai':
        return <AIStudioView onNavigate={handleNavigate} />;
      case 'schedule':
        return <ScheduleView />;
      case 'automations':
        return <AutomationsView />;
      case 'history':
        return <HistoryView />;
      default:
        return <DashboardView onNavigate={handleNavigate} />;
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen w-full flex flex-col items-center justify-center p-4 select-none"
        style={{ background: 'var(--bg)', color: 'var(--tx)' }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl animate-pulse shadow-xl mb-4"
          style={{ background: 'var(--g)' }}
        >
          ⚡
        </div>
        <p className="text-xs font-semibold text-[var(--mu)] tracking-wide">
          Loading InstaFlow Workspace...
        </p>
      </div>
    );
  }

  // 1. Instagram Connection & Meta OAuth Gate:
  // Shown when explicitly onboarding (#onboarding) or handling Meta OAuth callback (?code=...)
  const isOnboardingRoute = currentView === 'onboarding';
  const shouldShowOnboarding = isOnboardingRoute || hasOAuthParams;

  if (shouldShowOnboarding) {
    return (
      <ConnectInstagramOnboarding
        onComplete={() => {
          sessionStorage.setItem('instaflow_skipped_onboarding', 'true');
          setHasSkippedOnboarding(true);
          setCurrentView('home');
          window.location.hash = 'home';
        }}
        onSkip={() => {
          sessionStorage.setItem('instaflow_skipped_onboarding', 'true');
          setHasSkippedOnboarding(true);
          setCurrentView('home');
          window.location.hash = 'home';
        }}
      />
    );
  }

  // 2. Authentication Gate:
  // If user is not logged in, OR if user specifically navigated to #signin or #signup:
  const isAuthRoute =
    currentView === 'signin' ||
    currentView === 'signup' ||
    currentView === 'login' ||
    currentView === 'register';

  if (!user || isAuthRoute) {
    return (
      <LoginPage
        onLoginSuccess={(authMode) => {
          if (authMode === 'signin') {
            sessionStorage.setItem('instaflow_skipped_onboarding', 'true');
            setHasSkippedOnboarding(true);
            setCurrentView('home');
            window.location.hash = 'home';
          } else {
            // New user Signup -> Enforce Instagram Connection & Business Verification Onboarding
            sessionStorage.removeItem('instaflow_skipped_onboarding');
            setHasSkippedOnboarding(false);
            setCurrentView('onboarding');
            window.location.hash = 'onboarding';
          }
        }}
      />
    );
  }

  return (
    <div
      className="min-h-screen grid grid-cols-1 md:grid-cols-[auto_1fr] transition-colors"
      style={{ background: 'var(--bg)', color: 'var(--tx)' }}
    >
      {/* Responsive Sidebar */}
      <Sidebar currentView={currentView} onNavigate={handleNavigate} />

      {/* Main Content Area */}
      <div className="flex flex-col min-w-0">
        <Header currentView={currentView} />

        <main className="flex-1 p-4 md:p-7 max-w-[1280px] w-full mx-auto pb-24 md:pb-12">
          {renderCurrentView()}
        </main>
      </div>

      {/* Global Modals */}
      <ConnectAccountModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
      />

      <NewReelModal
        key={`${isNewReelModalOpen ? 'open' : 'closed'}_${editingReel?.id || 'new'}_${newReelInitialTab}`}
        isOpen={isNewReelModalOpen}
        onClose={() => {
          setIsNewReelModalOpen(false);
          setEditingReel(null);
        }}
        initialTab={newReelInitialTab}
        editingReel={editingReel}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthPromptDismissed(true);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AccountProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AccountProvider>
    </AuthProvider>
  );
}
