import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import Dashboard from './components/Dashboard';
import AuthPage from './pages/AuthPage';
import LandingPage from './pages/LandingPage';
import OnboardingPage from './pages/OnboardingPage';
import SystemToastContainer from './components/SystemToastContainer';
import QuestFeedback from './components/QuestFeedback';
import { getAvatarUrl } from './lib/avatars';
import { Swords, ScrollText, DoorOpen, User, Ghost, Store, LogOut, Menu, X, Trophy, Gem, Target, Brain, Users, Flag } from 'lucide-react';

// Lazy load pages for code splitting
const QuestLogPage = lazy(() => import('./pages/QuestLogPage'));
const HunterProfilePage = lazy(() => import('./pages/HunterProfilePage'));
const GatesPage = lazy(() => import('./pages/GatesPage'));
const ShadowRealmPage = lazy(() => import('./pages/ShadowRealmPage'));
const ShopPage = lazy(() => import('./pages/ShopPage'));
const MilestonesPage = lazy(() => import('./pages/MilestonesPage'));
const MasteryChallengesPage = lazy(() => import('./pages/MasteryChallengesPage'));
const MementosPage = lazy(() => import('./pages/MementosPage'));
const KnowledgePage = lazy(() => import('./pages/KnowledgePage'));
const SocialPage = lazy(() => import('./pages/SocialPage'));
const ProgressionPage = lazy(() => import('./pages/ProgressionPage'));

// Loading component for lazy-loaded pages
const PageLoader = () => (
  <div className="flex items-center justify-center p-6">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-gold-primary border-t-transparent"></div>
  </div>
);

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = useStore((s) => s.token);
  const isLoading = useStore((s) => s.isLoading);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-void">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gold-primary border-t-transparent"></div>
      </div>
    );
  }
  
  if (!token) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const AppLayout: React.FC = () => {
  const { token, stats, hunter, logout, initializeApp, connectWebSocket, feedbackIntensity } = useStore();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  useEffect(() => {
    if (token) {
      connectWebSocket();
      initializeApp();
    }
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen bg-void text-text-primary">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-surface border-b border-border-subtle flex items-center justify-between px-4 z-40">
        <div className="font-display text-gold-primary text-xl tracking-wider">Solo Quest</div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-text-secondary hover:text-text-primary transition-fast"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border-subtle flex flex-col p-4 flex-shrink-0 transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex items-center space-x-3 mb-6">
          <img
            src={hunter?.avatarUrl || getAvatarUrl(hunter?.hunterId || hunter?.displayName || 'Hunter')}
            alt="Avatar"
            className="w-12 h-12 rounded-sm border border-border-subtle bg-raised"
            onError={(e) => {
              (e.target as HTMLImageElement).src = getAvatarUrl(hunter?.hunterId || hunter?.displayName || 'Hunter');
            }}
          />
          <div>
            <p className="font-display text-text-primary tracking-wide">Solo Quest</p>
            <p className="text-sm text-text-secondary truncate max-w-[140px]">
              {hunter?.displayName || 'Hunter'}
            </p>
          </div>
        </div>

        {/* Rank Badge */}
        {stats && (
          <div className="mb-4 p-3 bg-raised rounded-sm border border-border-subtle">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">Rank</span>
              <span className="font-display text-gold-primary">{stats.rank}</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-text-secondary">Level</span>
              <span className="font-data text-text-primary">{stats.level}</span>
            </div>
            <div className="mt-2 bg-gold-dim rounded-sm h-1">
              <div
                className="bg-gold-primary h-1 rounded-sm transition-slow"
                style={{ width: `${stats.progressPercent || 0}%` }}
              />
            </div>
          </div>
        )}

        <nav className="flex-1 space-y-1">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-all duration-200
              ${isActive
                ? 'bg-gradient-to-r from-violet-gate/20 to-transparent text-white font-medium border-l-2 border-violet-gate'
                : 'text-text-secondary hover:bg-raised hover:text-text-primary'
              }
            `}
          >
            <Swords className="w-4 h-4" />
            Dashboard
          </NavLink>
          <NavLink
            to="/quests"
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-all duration-200
              ${isActive
                ? 'bg-gradient-to-r from-gold-primary/20 to-transparent text-white font-medium border-l-2 border-gold-primary'
                : 'text-text-secondary hover:bg-raised hover:text-text-primary'
              }
            `}
          >
            <ScrollText className="w-4 h-4" />
            Quest Log
          </NavLink>
          <NavLink
            to="/gates"
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-fast
              ${isActive ? 'bg-raised text-text-primary border-l-2 border-gold-primary' : 'text-text-secondary hover:bg-raised hover:text-text-primary'}
            `}
          >
            <DoorOpen className="w-4 h-4" />
            Gates
          </NavLink>
          <NavLink
            to="/profile"
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-fast
              ${isActive ? 'bg-raised text-text-primary border-l-2 border-gold-primary' : 'text-text-secondary hover:bg-raised hover:text-text-primary'}
            `}
          >
            <User className="w-4 h-4" />
            Hunter Profile
          </NavLink>
          <NavLink
            to="/shadow"
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-fast
              ${isActive ? 'bg-raised text-text-primary border-l-2 border-gold-primary' : 'text-text-secondary hover:bg-raised hover:text-text-primary'}
            `}
          >
            <Ghost className="w-4 h-4" />
            Shadow Realm
          </NavLink>
          <NavLink
            to="/shop"
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-fast
              ${isActive ? 'bg-raised text-text-primary border-l-2 border-gold-primary' : 'text-text-secondary hover:bg-raised hover:text-text-primary'}
            `}
          >
            <Store className="w-4 h-4" />
            Shop
          </NavLink>
          <NavLink
            to="/milestones"
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-fast
              ${isActive ? 'bg-raised text-text-primary border-l-2 border-gold-primary' : 'text-text-secondary hover:bg-raised hover:text-text-primary'}
            `}
          >
            <Trophy className="w-4 h-4" />
            Milestones
          </NavLink>
          <NavLink
            to="/mastery"
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-fast
              ${isActive ? 'bg-raised text-text-primary border-l-2 border-gold-primary' : 'text-text-secondary hover:bg-raised hover:text-text-primary'}
            `}
          >
            <Target className="w-4 h-4" />
            Mastery
          </NavLink>
          <NavLink
            to="/mementos"
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-fast
              ${isActive ? 'bg-raised text-text-primary border-l-2 border-gold-primary' : 'text-text-secondary hover:bg-raised hover:text-text-primary'}
            `}
          >
            <Gem className="w-4 h-4" />
            Mementos
          </NavLink>
          <NavLink
            to="/knowledge"
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-fast
              ${isActive ? 'bg-raised text-text-primary border-l-2 border-gold-primary' : 'text-text-secondary hover:bg-raised hover:text-text-primary'}
            `}
          >
            <Brain className="w-4 h-4" />
            Knowledge
          </NavLink>
          <NavLink
            to="/social"
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-fast
              ${isActive ? 'bg-raised text-text-primary border-l-2 border-gold-primary' : 'text-text-secondary hover:bg-raised hover:text-text-primary'}
            `}
          >
            <Users className="w-4 h-4" />
            Social
          </NavLink>
          <NavLink
            to="/progression"
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-fast
              ${isActive ? 'bg-raised text-text-primary border-l-2 border-gold-primary' : 'text-text-secondary hover:bg-raised hover:text-text-primary'}
            `}
          >
            <Flag className="w-4 h-4" />
            Progression
          </NavLink>
        </nav>

        {/* Gold + Logout */}
        <div className="mt-4 pt-4 border-t border-border-subtle">
          <p className="font-data text-gold-primary text-center text-sm mb-3">
            {stats?.gold ?? 0}g
          </p>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-text-secondary hover:text-crimson hover:bg-crimson/10 rounded-sm transition-fast border border-border-subtle"
          >
            <LogOut className="w-3 h-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/quests" element={
            <Suspense fallback={<PageLoader />}>
              <QuestLogPage />
            </Suspense>
          } />
          <Route path="/profile" element={
            <Suspense fallback={<PageLoader />}>
              <HunterProfilePage />
            </Suspense>
          } />
          <Route path="/gates" element={
            <Suspense fallback={<PageLoader />}>
              <GatesPage />
            </Suspense>
          } />
          <Route path="/shadow" element={
            <Suspense fallback={<PageLoader />}>
              <ShadowRealmPage />
            </Suspense>
          } />
          <Route path="/shop" element={
            <Suspense fallback={<PageLoader />}>
              <ShopPage />
            </Suspense>
          } />
          <Route path="/milestones" element={
            <Suspense fallback={<PageLoader />}>
              <MilestonesPage />
            </Suspense>
          } />
          <Route path="/mastery" element={
            <Suspense fallback={<PageLoader />}>
              <MasteryChallengesPage />
            </Suspense>
          } />
          <Route path="/mementos" element={
            <Suspense fallback={<PageLoader />}>
              <MementosPage />
            </Suspense>
          } />
          <Route path="/knowledge" element={
            <Suspense fallback={<PageLoader />}>
              <KnowledgePage />
            </Suspense>
          } />
          <Route path="/social" element={
            <Suspense fallback={<PageLoader />}>
              <SocialPage />
            </Suspense>
          } />
          <Route path="/progression" element={
            <Suspense fallback={<PageLoader />}>
              <ProgressionPage />
            </Suspense>
          } />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>

      <SystemToastContainer />
      
      {/* Game Design: Quest Feedback System */}
      {feedbackIntensity && (
        <QuestFeedback 
          intensity={feedbackIntensity}
          onComplete={() => useStore.getState().setFeedbackIntensity(null)}
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  const { token } = useStore();
  
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={token ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/welcome" element={<LandingPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        
        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }
        />
        <Route
          path="/quests"
          element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }
        />
        <Route
          path="/profile"
          element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }
        />
        <Route
          path="/gates"
          element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }
        />
        <Route
          path="/shadow"
          element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }
        />
        <Route
          path="/shop"
          element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }
        />
        <Route
          path="/milestones"
          element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }
        />
        <Route
          path="/mastery"
          element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }
        />
        <Route
          path="/mementos"
          element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }
        />
        <Route
          path="/knowledge"
          element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }
        />
        <Route
          path="/social"
          element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }
        />
        <Route
          path="/progression"
          element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;