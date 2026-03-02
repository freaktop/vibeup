import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { legalConfig } from '../config/legal';
import { testAuthConnection, getAuthDiagnosticsHelp } from '../utils/authDiagnostics';
import './Login.css';

interface SignUpProps {
  onSignup: () => void;
  onSwitchToLogin: () => void;
}

export default function SignUp({ onSignup, onSwitchToLogin }: SignUpProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);

  const handleSignup = async () => {
    if (!email.trim() || !password.trim() || !name.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }
      onSignup();
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      const code = e?.code;
      const msg = e?.message || '';
      console.error('[Auth] Sign up failed:', code, msg, err);

      if (code === 'auth/invalid-api-key' || code === 'auth/configuration-not-found') {
        setError('API key invalid or restricted. In Google Cloud Console → APIs & Services → Credentials, check your API key has no restrictions, or add http://localhost:3000/* to HTTP referrers.');
      } else if (code === 'auth/operation-not-allowed') {
        setError('Email/password sign-up is disabled. Enable it in Firebase Console → Authentication → Sign-in method.');
      } else if (code === 'auth/firebase-app-check-token-is-invalid') {
        setError('App Check is blocking auth. Firebase Console → App Check → uncheck "Enforce" for Authentication, or register a debug token for localhost.');
      } else if (code === 'auth/email-already-in-use') {
        setError('This email is already registered. Try logging in instead.');
      } else if (code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else if (msg.includes('401') || msg.includes('Unauthorized')) {
        setError('Auth request rejected (401). Check: 1) API key in Google Cloud has no HTTP referrer restrictions blocking localhost, 2) Identity Toolkit API is enabled for your project.');
      } else {
        setError(`Sign up failed: ${code || 'unknown'}. Please try again or use a different sign-in method.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError('');

    try {
      // Try popup first - stays on page. Fall back to redirect if popup blocked.
      try {
        await signInWithPopup(auth, googleProvider);
        onSignup();
        return;
      } catch (popupErr: unknown) {
        const code = (popupErr as { code?: string })?.code;
        if (code === 'auth/popup-blocked-by-browser' || code === 'auth/cancelled-popup-request') {
          await signInWithRedirect(auth, googleProvider);
          return;
        }
        throw popupErr;
      }
    } catch (err: unknown) {
      setError('Google sign-up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSignup = async () => {
    setError('Phone sign-up is not enabled yet. Use Email or Google for now.');
  };

  return (
    <div className="auth-container">
      <div className="auth-header">
        <h1 className="auth-logo">VibeUp</h1>
        <p className="auth-subtitle">Create your account</p>
      </div>

      <form
        className="auth-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSignup();
        }}
      >
        {error && (
          <div className="auth-error">{error}</div>
        )}

        <div className="auth-input-group">
          <label className="auth-label" htmlFor="signup-name">Name</label>
          <input
            id="signup-name"
            type="text"
            className="auth-input"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            autoComplete="name"
          />
        </div>

        <div className="auth-input-group">
          <label className="auth-label" htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            name="email"
            type="email"
            className="auth-input"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            autoComplete="email"
          />
        </div>

        <div className="auth-input-group">
          <label className="auth-label" htmlFor="signup-password">Password</label>
          <div className="auth-password-container">
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              className="auth-input"
              placeholder="Create a password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
            />
            <button
              className="auth-password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        <div className="auth-input-group">
          <label className="auth-label" htmlFor="signup-confirm">Confirm Password</label>
          <input
            id="signup-confirm"
            name="confirm-password"
            type={showPassword ? 'text' : 'password'}
            className="auth-input"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
          />
        </div>

        <div className="auth-terms">
          <label className="auth-checkbox">
            <input type="checkbox" required />
            <span>
              I agree to the{' '}
              <button
                type="button"
                className="auth-link-inline"
                onClick={() => window.open(legalConfig.termsUrl, '_blank')}
              >
                Terms of Service
              </button>{' '}
              and{' '}
              <button
                type="button"
                className="auth-link-inline"
                onClick={() => window.open(legalConfig.privacyUrl, '_blank')}
              >
                Privacy Policy
              </button>
            </span>
          </label>
        </div>

        <button
          type="submit"
          className="auth-button"
          disabled={loading || !email.trim() || !password.trim() || !name.trim()}
        >
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="auth-button auth-button-social"
          onClick={handlePhoneSignup}
          disabled={loading}
        >
          <span>📱</span>
          Continue with Phone
        </button>

        <button
          type="button"
          className="auth-button auth-button-social"
          onClick={handleGoogleSignup}
          disabled={loading}
        >
          <span>🔵</span>
          Continue with Google
        </button>

        {!import.meta.env.PROD && (
          <button
            type="button"
            className="auth-link"
            style={{ marginTop: 8, fontSize: 12 }}
            onClick={async () => {
              setDiagnostic('Testing...');
              const result = await testAuthConnection();
              if (result.ok) {
                setDiagnostic('Connection OK. If sign-up still fails, check the error message.');
              } else {
                setDiagnostic([result.error, result.details, getAuthDiagnosticsHelp()].filter(Boolean).join('\n\n'));
              }
            }}
          >
            {diagnostic ? 'Diagnostic result' : 'Diagnose auth connection'}
          </button>
        )}
        {diagnostic && (
          <div className="auth-diagnostic" style={{ marginTop: 12, padding: 12, background: '#f5f5f5', borderRadius: 8, fontSize: 12, whiteSpace: 'pre-wrap', textAlign: 'left' }}>
            {diagnostic}
            <button type="button" className="auth-link" style={{ display: 'block', marginTop: 8 }} onClick={() => setDiagnostic(null)}>Close</button>
          </div>
        )}

        <div className="auth-switch">
          <span>Already have an account? </span>
          <button type="button" className="auth-link" onClick={onSwitchToLogin}>
            Log In
          </button>
        </div>
      </form>
    </div>
  );
}
