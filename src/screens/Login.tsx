import { useState } from 'react';
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { testAuthConnection, getAuthDiagnosticsHelp } from '../utils/authDiagnostics';
import './Login.css';

interface LoginProps {
  onLogin: () => void;
  onSwitchToSignup: () => void;
}

export default function Login({ onLogin, onSwitchToSignup }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    if (!auth) {
      setError('Firebase authentication is not configured. Running in demo mode.');
      return;
    }

    setLoading(true);
    setError('');
    setInfo('');

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      onLogin();
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      const code = e?.code;
      const msg = e?.message || '';
      console.error('[Auth] Login failed:', code, msg, err);

      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-login-credentials') {
        setError('Invalid email or password. Please try again.');
      } else if (code === 'auth/invalid-api-key' || code === 'auth/configuration-not-found') {
        setError('API key invalid or restricted. In Google Cloud Console → APIs & Services → Credentials, check your API key has no restrictions, or add http://localhost:3000/* to HTTP referrers.');
      } else if (code === 'auth/operation-not-allowed') {
        setError('Email/password sign-in is disabled. Enable it in Firebase Console → Authentication → Sign-in method.');
      } else if (code === 'auth/firebase-app-check-token-is-invalid') {
        setError('App Check is blocking auth. Firebase Console → App Check → uncheck "Enforce" for Authentication, or register a debug token for localhost.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else if (msg.includes('401') || msg.includes('Unauthorized')) {
        setError('Auth request rejected (401). Check: 1) API key in Google Cloud has no HTTP referrer restrictions blocking localhost, 2) Identity Toolkit API is enabled for your project.');
      } else {
        setError(`Sign-in failed: ${code || 'unknown'}. Please try again or use a different sign-in method.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!auth || !googleProvider) {
      setError('Firebase authentication is not configured. Running in demo mode.');
      return;
    }

    setLoading(true);
    setError('');
    setInfo('');

    try {
      // Try popup first - stays on page, no redirect. Fall back to redirect if popup blocked.
      try {
        await signInWithPopup(auth, googleProvider);
        onLogin();
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
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-blocked-by-browser') {
        setError('Popup blocked. Allow popups or use Email sign-in.');
      } else if (code === 'auth/invalid-api-key' || code === 'auth/configuration-not-found') {
        setError('Auth is not configured. Check your Firebase setup.');
      } else {
        setError('Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneLogin = async () => {
    setError('Phone sign-in is not enabled yet. Use Email or Google for now.');
    setInfo('');
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email first, then tap Forgot Password.');
      setInfo('');
      return;
    }

    setLoading(true);
    setError('');
    setInfo('');

    if (!auth) {
      setError('Firebase authentication is not configured. Running in demo mode.');
      setLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setInfo('Password reset email sent. Check your inbox.');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/invalid-api-key' || code === 'auth/configuration-not-found') {
        setError('Auth is not configured. Check your Firebase setup.');
      } else {
        setError('Unable to send reset email. Please verify your email and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-header">
        <h1 className="auth-logo">VibeUp</h1>
        <p className="auth-subtitle">Welcome back!</p>
      </div>

      <form
        className="auth-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleLogin();
        }}
      >
        {error && (
          <div className="auth-error">{error}</div>
        )}
        {info && (
          <div className="auth-success">{info}</div>
        )}

        <div className="auth-input-group">
          <label className="auth-label" htmlFor="login-email">Email</label>
          <input
            id="login-email"
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
          <label className="auth-label" htmlFor="login-password">Password</label>
          <div className="auth-password-container">
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              className="auth-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
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

        <button
          type="submit"
          className="auth-button"
          disabled={loading || !email.trim() || !password.trim()}
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="auth-button auth-button-social"
          onClick={handlePhoneLogin}
          disabled={loading}
        >
          <span>📱</span>
          Continue with Phone
        </button>

        <button
          type="button"
          className="auth-button auth-button-social"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <span>🔵</span>
          Continue with Google
        </button>

        <div className="auth-footer">
          <button type="button" className="auth-link" onClick={handleForgotPassword}>
            Forgot Password?
          </button>
        </div>

        {!import.meta.env.PROD && (
          <button
            type="button"
            className="auth-link"
            style={{ marginTop: 8, fontSize: 12 }}
            onClick={async () => {
              setDiagnostic('Testing...');
              const result = await testAuthConnection();
              if (result.ok) {
                setDiagnostic('Connection OK. If sign-in still fails, check email/password.');
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
          <span>Don't have an account? </span>
          <button type="button" className="auth-link" onClick={onSwitchToSignup}>
            Sign Up
          </button>
        </div>
      </form>
    </div>
  );
}
