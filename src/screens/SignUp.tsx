import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { legalConfig } from '../config/legal';
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
    } catch (err) {
      setError('Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError('');

    try {
      // In mobile WebViews popups often fail; redirect is more reliable.
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

      onSignup();
    } catch (err) {
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

      <div className="auth-form">
        {error && (
          <div className="auth-error">{error}</div>
        )}

        <div className="auth-input-group">
          <label className="auth-label">Name</label>
          <input
            type="text"
            className="auth-input"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          />
        </div>

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
              placeholder="Create a password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

        <div className="auth-input-group">
          <label className="auth-label">Confirm Password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            className="auth-input"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSignup();
              }
            }}
            disabled={loading}
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
          className="auth-button"
          onClick={handleSignup}
          disabled={loading || !email.trim() || !password.trim() || !name.trim()}
        >
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button
          className="auth-button auth-button-social"
          onClick={handlePhoneSignup}
          disabled={loading}
        >
          <span>📱</span>
          Continue with Phone
        </button>

        <button
          className="auth-button auth-button-social"
          onClick={handleGoogleSignup}
          disabled={loading}
        >
          <span>🔵</span>
          Continue with Google
        </button>

        <div className="auth-switch">
          <span>Already have an account? </span>
          <button className="auth-link" onClick={onSwitchToLogin}>
            Log In
          </button>
        </div>
      </div>
    </div>
  );
}
