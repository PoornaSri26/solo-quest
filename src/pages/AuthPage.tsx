import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { login, register } = useStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        if (!displayName.trim()) {
          setError('Display name is required');
          setLoading(false);
          return;
        }
        await register(email, password, displayName);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || (isLogin ? 'Login failed' : 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-gate/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gold-primary/5 rounded-full blur-3xl" style={{ animationDelay: '1s', animationDuration: '3s' }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-surface border-2 border-gold-dim rounded-sm mb-4">
            <span className="font-display text-gold-primary text-3xl">SQ</span>
          </div>
          <h1 className="font-display text-2xl text-text-primary tracking-wide">Solo Quest</h1>
          <p className="font-system text-text-system text-xs mt-2">
            [System: {isLogin ? 'Hunter identification required.' : 'New hunter registration.'}]
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-surface border border-border-subtle rounded-md p-6 shadow-2xl">
          {/* Tab Toggle */}
          <div className="flex mb-6 border border-border-subtle rounded-sm overflow-hidden">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2 text-sm font-display tracking-wider transition-fast ${
                isLogin
                  ? 'bg-gold-primary/20 text-gold-primary border-b-2 border-gold-primary'
                  : 'bg-raised text-text-secondary hover:text-text-primary'
              }`}
            >
              LOGIN
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2 text-sm font-display tracking-wider transition-fast ${
                !isLogin
                  ? 'bg-gold-primary/20 text-gold-primary border-b-2 border-gold-primary'
                  : 'bg-raised text-text-secondary hover:text-text-primary'
              }`}
            >
              REGISTER
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-crimson/10 border border-crimson/30 rounded-sm">
              <p className="text-crimson text-xs font-system">[Error: {error}]</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-display text-text-secondary mb-1 tracking-wider uppercase">
                  Hunter Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your hunter name"
                  className="w-full px-3 py-2 bg-raised border border-border-subtle rounded-sm focus:outline-none focus:border-gold-primary text-text-primary placeholder:text-text-muted font-system text-sm"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-display text-text-secondary mb-1 tracking-wider uppercase">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hunter@soloquest.com"
                className="w-full px-3 py-2 bg-raised border border-border-subtle rounded-sm focus:outline-none focus:border-gold-primary text-text-primary placeholder:text-text-muted font-system text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-display text-text-secondary mb-1 tracking-wider uppercase">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-raised border border-border-subtle rounded-sm focus:outline-none focus:border-gold-primary text-text-primary placeholder:text-text-muted font-system text-sm"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gold-primary text-void font-display tracking-wider rounded-sm hover:bg-gold-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-fast text-sm"
            >
              {loading
                ? (isLogin ? 'Authenticating...' : 'Creating Hunter...')
                : (isLogin ? 'ENTER THE GATE' : 'BEGIN YOUR QUEST')
              }
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-xs text-text-muted">
              {isLogin ? "Don't have an account? " : 'Already a hunter? '}
              <button
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-gold-primary hover:underline"
              >
                {isLogin ? 'Register' : 'Login'}
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-text-muted mt-6">
          © 2025 Solo Quest. Arise, Hunter.
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
