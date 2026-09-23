import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import RadialRevealButton from '../components/RadialRevealButton';

const authButtonFont = {
  fontFamily: '"Rajdhani", sans-serif',
  fontWeight: 600,
  fontSize: 14,
  lineHeight: '1.2em',
  letterSpacing: '0.05em',
  textAlign: 'center' as const,
};

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; displayName?: string }>({});
  const navigate = useNavigate();

  const { login, register } = useStore();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): { valid: boolean; error?: string } => {
    if (password.length < 6) {
      return { valid: false, error: 'Password must be at least 6 characters' };
    }
    if (password.length > 128) {
      return { valid: false, error: 'Password is too long' };
    }
    return { valid: true };
  };

  const validateDisplayName = (name: string): { valid: boolean; error?: string } => {
    if (!name.trim()) {
      return { valid: false, error: 'Hunter name is required' };
    }
    if (name.length < 2) {
      return { valid: false, error: 'Hunter name must be at least 2 characters' };
    }
    if (name.length > 30) {
      return { valid: false, error: 'Hunter name is too long' };
    }
    if (!/^[a-zA-Z0-9_\-\s]+$/.test(name)) {
      return { valid: false, error: 'Hunter name can only contain letters, numbers, spaces, hyphens, and underscores' };
    }
    return { valid: true };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runAuth();
  };

  const runAuth = async () => {
    setError('');
    setFieldErrors({});
    setLoading(true);

    // Validate email
    if (!validateEmail(email)) {
      setFieldErrors({ email: 'Please enter a valid email address' });
      setLoading(false);
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setFieldErrors({ password: passwordValidation.error });
      setLoading(false);
      return;
    }

    // Validate display name for registration
    if (!isLogin) {
      const nameValidation = validateDisplayName(displayName);
      if (!nameValidation.valid) {
        setFieldErrors({ displayName: nameValidation.error });
        setLoading(false);
        return;
      }
    }

    try {
      if (isLogin) {
        await login(email, password);
        navigate('/dashboard');
      } else {
        await register(email, password, displayName.trim());
        navigate('/onboarding');
      }
    } catch (err: any) {
      setError(err.message || (isLogin ? 'Login failed. Please check your credentials.' : 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (loginMode: boolean) => {
    setIsLogin(loginMode);
    setError('');
    setFieldErrors({});
    setEmail('');
    setPassword('');
    setDisplayName('');
  };

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
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
          <div className="flex mb-6 border border-border-subtle rounded-sm overflow-hidden" role="tablist">
            <button
              onClick={() => handleModeChange(true)}
              role="tab"
              aria-selected={isLogin}
              aria-controls="auth-form"
              className={`flex-1 py-2 text-sm font-display tracking-wider transition-fast ${
                isLogin
                  ? 'bg-gold-primary/20 text-gold-primary border-b-2 border-gold-primary'
                  : 'bg-raised text-text-secondary hover:text-text-primary'
              }`}
            >
              LOGIN
            </button>
            <button
              onClick={() => handleModeChange(false)}
              role="tab"
              aria-selected={!isLogin}
              aria-controls="auth-form"
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
            <div 
              className="mb-4 p-3 bg-crimson/10 border border-crimson/30 rounded-sm"
              role="alert"
              aria-live="assertive"
            >
              <p className="text-crimson text-xs font-system">[Error: {error}]</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" id="auth-form" role="form" noValidate>
            {!isLogin && (
              <div>
                <label 
                  htmlFor="displayName"
                  className="block text-xs font-display text-text-secondary mb-1 tracking-wider uppercase"
                >
                  Hunter Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your hunter name"
                  className={`w-full px-3 py-2 bg-raised border rounded-sm focus:outline-none focus:border-gold-primary text-text-primary placeholder:text-text-muted font-system text-sm ${
                    fieldErrors.displayName ? 'border-crimson' : 'border-border-subtle'
                  }`}
                  required={!isLogin}
                  aria-invalid={!!fieldErrors.displayName}
                  aria-describedby={fieldErrors.displayName ? 'displayName-error' : undefined}
                  maxLength={30}
                />
                {fieldErrors.displayName && (
                  <p id="displayName-error" className="text-crimson text-xs mt-1" role="alert">
                    {fieldErrors.displayName}
                  </p>
                )}
              </div>
            )}

            <div>
              <label 
                htmlFor="email"
                className="block text-xs font-display text-text-secondary mb-1 tracking-wider uppercase"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hunter@soloquest.com"
                className={`w-full px-3 py-2 bg-raised border rounded-sm focus:outline-none focus:border-gold-primary text-text-primary placeholder:text-text-muted font-system text-sm ${
                  fieldErrors.email ? 'border-crimson' : 'border-border-subtle'
                }`}
                required
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                autoComplete={isLogin ? 'email' : 'email'}
              />
              {fieldErrors.email && (
                <p id="email-error" className="text-crimson text-xs mt-1" role="alert">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label 
                htmlFor="password"
                className="block text-xs font-display text-text-secondary mb-1 tracking-wider uppercase"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-3 py-2 bg-raised border rounded-sm focus:outline-none focus:border-gold-primary text-text-primary placeholder:text-text-muted font-system text-sm ${
                  fieldErrors.password ? 'border-crimson' : 'border-border-subtle'
                }`}
                required
                minLength={6}
                maxLength={128}
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
              {fieldErrors.password && (
                <p id="password-error" className="text-crimson text-xs mt-1" role="alert">
                  {fieldErrors.password}
                </p>
              )}
              {!isLogin && (
                <p className="text-text-muted text-xs mt-1">
                  Must be at least 6 characters
                </p>
              )}
            </div>

            <RadialRevealButton
              label={
                loading
                  ? (isLogin ? 'Authenticating...' : 'Creating Hunter...')
                  : (isLogin ? 'ENTER THE GATE' : 'BEGIN YOUR QUEST')
              }
              onClick={runAuth}
              disabled={loading}
              font={authButtonFont}
              padding="12px 24px"
              rounded={8}
              colors={{
                fill: 'var(--gold-primary)',
                textColor: 'var(--bg-void)',
                hoverFill: 'var(--crimson)',
                hoverTextColor: '#ffffff',
              }}
              border={{ borderWidth: 0 }}
              style={{ width: '100%', justifyContent: 'center' as const }}
              ariaBusy={loading}
            />
          </form>

          <div className="mt-4 text-center">
            <p className="text-xs text-text-muted">
              {isLogin ? "Don't have an account? " : 'Already a hunter? '}
              <button
                onClick={() => handleModeChange(!isLogin)}
                className="text-gold-primary hover:underline focus:outline-none focus:underline"
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
