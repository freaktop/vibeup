import { useState } from 'react';
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
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

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError('');
    setInfo('');

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      onLogin();
    } catch (err) {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    setInfo('');

    try {
      // In mobile WebViews popups often fail; redirect is more reliable.
      // For desktop/PWA, popup is nicer.
      if (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }

      try {
        await signInWithPopup(auth, googleProvider);
      } catch {
        await signInWithRedirect(auth, googleProvider);
        return;
      }

      onLogin();
    } catch (err) {
      setError('Google sign-in failed. Please try again.');
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

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setInfo('Password reset email sent. Check your inbox.');
    } catch {
      setError('Unable to send reset email. Please verify your email and try again.');
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

      <div className="auth-form">
        {error && (
          <div className="auth-error">{error}</div>
        )}
        {info && (
          <div className="auth-success">{info}</div>
        )}

        <div className="auth-input-group">
          <label className="auth-label">Email</label>
          <input
            type="email"
            className="auth-input"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="auth-input-group">
          <label className="auth-label">Password</label>
          <div className="auth-password-container">
            <input
              type={showPassword ? 'text' : 'password'}
              className="auth-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleLogin();
                }
              }}
              disabled={loading}
            />
            <button
              className="auth-password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              type="button"
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        <button
          className="auth-button"
          onClick={handleLogin}
          disabled={loading || !email.trim() || !password.trim()}
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button
          className="auth-button auth-button-social"
          onClick={handlePhoneLogin}
          disabled={loading}
        >
          <span>📱</span>
          Continue with Phone
        </button>

        <button
          className="auth-button auth-button-social"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <span>🔵</span>
          Continue with Google
        </button>

        <div className="auth-footer">
          <button className="auth-link" onClick={handleForgotPassword}>
            Forgot Password?
          </button>
        </div>

        <div className="auth-switch">
          <span>Don't have an account? </span>
          <button className="auth-link" onClick={onSwitchToSignup}>
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}
