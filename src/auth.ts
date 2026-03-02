/**
 * Auth abstraction: provides current user from Firebase or demo mode.
 * Use getCurrentUid() / getCurrentUser() instead of auth.currentUser for app-wide consistency.
 */
import { auth } from './firebase';
import { storage } from './utils/storage';

export const DEMO_UID = 'demo-user-vibeup';

export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isDemo: boolean;
};

export function getCurrentUid(): string | null {
  const demo = storage.getDemoUser();
  if (demo) return demo.uid;
  return auth.currentUser?.uid ?? null;
}

export function getCurrentUser(): AuthUser | null {
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
  const u = auth.currentUser;
  if (!u) return null;
  return {
    uid: u.uid,
    email: u.email ?? null,
    displayName: u.displayName ?? null,
    photoURL: u.photoURL ?? null,
    isDemo: false,
  };
}

export function isDemoMode(): boolean {
  return storage.isDemoMode();
}

export function signInDemo(): void {
  storage.setDemoUser({
    uid: DEMO_UID,
    email: 'demo@vibeup.app',
    displayName: 'Demo User',
  });
  window.dispatchEvent(new CustomEvent('auth:demoLogin'));
}

export function signOutDemo(): void {
  storage.setDemoUser(null);
  window.dispatchEvent(new CustomEvent('auth:demoLogout'));
}
