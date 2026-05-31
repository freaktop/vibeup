import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { browserLocalPersistence, getRedirectResult, onAuthStateChanged, setPersistence } from 'firebase/auth';
import { auth } from '../firebase';
import { storage } from '../utils/storage';
import {
  getCurrentUser,
  signInDemo,
  signOutDemo,
  type AuthUser,
} from '../auth';

type AuthContextValue = {
  user: AuthUser | null;
  authResolved: boolean;
  signInDemo: () => void;
  signOutDemo: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const demo = storage.getDemoUser();
    if (demo) {
      return {
        uid: demo.uid,
        email: demo.email,
        displayName: demo.displayName,
        photoURL: null,
        isDemo: true,
      };
    }
    return null;
  });
  const [authResolved, setAuthResolved] = useState(false);

  const handleDemoLogin = useCallback(() => {
    signInDemo();
    setUser({
      uid: 'demo-user-vibeup',
      email: 'demo@vibeup.app',
      displayName: 'Demo User',
      photoURL: null,
      isDemo: true,
    });
  }, []);

  const handleDemoLogout = useCallback(() => {
    signOutDemo();
    setUser(null);
  }, []);

  useEffect(() => {
    const handleDemoEvent = () => {
      const u = getCurrentUser();
      setUser(u);
    };

    window.addEventListener('auth:demoLogin', handleDemoEvent);
    window.addEventListener('auth:demoLogout', handleDemoEvent);

    let unsub: (() => void) | undefined;

    const init = async () => {
      // If Firebase is not configured, auto-enable demo mode
      if (!auth) {
        console.log('[AuthContext] Firebase not configured, enabling demo mode');
        const demo = storage.getDemoUser();
        if (!demo) {
          // Auto-enable demo mode for first-time users
          handleDemoLogin();
        } else {
          setUser({
            uid: demo.uid,
            email: demo.email,
            displayName: demo.displayName,
            photoURL: null,
            isDemo: true,
          });
        }
        setAuthResolved(true);
        return;
      }

      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch {
        // Ignore - may already be set
      }
      // Must call getRedirectResult when app loads to complete Google sign-in
      // when user returns from redirect (otherwise they stay on login screen)
      try {
        await getRedirectResult(auth);
      } catch (err) {
        console.error('Redirect sign-in error:', err);
      }

      unsub = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          // Clear demo user so getCurrentUid() returns real uid, not demo
          storage.setDemoUser(null);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email ?? null,
            displayName: firebaseUser.displayName ?? null,
            photoURL: firebaseUser.photoURL ?? null,
            isDemo: false,
          });
        } else {
          const demo = storage.getDemoUser();
          if (demo) {
            setUser({
              uid: demo.uid,
              email: demo.email,
              displayName: demo.displayName,
              photoURL: null,
              isDemo: true,
            });
          } else {
            setUser(null);
          }
        }
        setAuthResolved(true);
      });
    };

    init();

    return () => {
      unsub?.();
      window.removeEventListener('auth:demoLogin', handleDemoEvent);
      window.removeEventListener('auth:demoLogout', handleDemoEvent);
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        authResolved,
        signInDemo: handleDemoLogin,
        signOutDemo: handleDemoLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
