import { logger } from './logger';

const STORAGE_KEYS = {
  LIKED_PROFILES: '@vibeup:likedProfiles',
  SAVED_PROFILES: '@vibeup:savedProfiles',
  PASSED_PROFILES: '@vibeup:passedProfiles',
  BLOCKED_PROFILES: '@vibeup:blockedProfiles',
  USER_PROFILE: '@vibeup:userProfile',
};

// Check if localStorage is available (handles SSR and private browsing)
const isLocalStorageAvailable = (): boolean => {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return false;
    }
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

// Fallback in-memory storage for when localStorage is unavailable
const memoryStorage: { [key: string]: string } = {};

const safeGetItem = (key: string): string | null => {
  if (!isLocalStorageAvailable()) {
    return memoryStorage[key] || null;
  }
  try {
    return localStorage.getItem(key);
  } catch (error) {
    logger.error('localStorage.getItem failed:', error);
    return memoryStorage[key] || null;
  }
};

const safeSetItem = (key: string, value: string): boolean => {
  if (!isLocalStorageAvailable()) {
    memoryStorage[key] = value;
    return true;
  }
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    logger.error('localStorage.setItem failed (quota exceeded?):', error);
    // Fallback to memory storage
    memoryStorage[key] = value;
    return false;
  }
};

const safeRemoveItem = (key: string): void => {
  if (!isLocalStorageAvailable()) {
    delete memoryStorage[key];
    return;
  }
  try {
    localStorage.removeItem(key);
  } catch (error) {
    logger.error('localStorage.removeItem failed:', error);
    delete memoryStorage[key];
  }
};

export const storage = {
  getLikedProfiles(): string[] {
    try {
      const data = safeGetItem(STORAGE_KEYS.LIKED_PROFILES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.error('Error getting liked profiles:', error);
      return [];
    }
  },

  addLikedProfile(profileId: string): void {
    try {
      const liked = this.getLikedProfiles();
      if (!liked.includes(profileId)) {
        liked.push(profileId);
        safeSetItem(STORAGE_KEYS.LIKED_PROFILES, JSON.stringify(liked));
      }
    } catch (error) {
      logger.error('Error adding liked profile:', error);
    }
  },

  removeLikedProfile(profileId: string): void {
    try {
      const liked = this.getLikedProfiles();
      const filtered = liked.filter(id => id !== profileId);
      safeSetItem(STORAGE_KEYS.LIKED_PROFILES, JSON.stringify(filtered));
    } catch (error) {
      logger.error('Error removing liked profile:', error);
    }
  },

  getSavedProfiles(): string[] {
    try {
      const data = safeGetItem(STORAGE_KEYS.SAVED_PROFILES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.error('Error getting saved profiles:', error);
      return [];
    }
  },

  addSavedProfile(profileId: string): void {
    try {
      const saved = this.getSavedProfiles();
      if (!saved.includes(profileId)) {
        saved.push(profileId);
        safeSetItem(STORAGE_KEYS.SAVED_PROFILES, JSON.stringify(saved));
      }
    } catch (error) {
      logger.error('Error adding saved profile:', error);
    }
  },

  removeSavedProfile(profileId: string): void {
    try {
      const saved = this.getSavedProfiles();
      const filtered = saved.filter(id => id !== profileId);
      safeSetItem(STORAGE_KEYS.SAVED_PROFILES, JSON.stringify(filtered));
    } catch (error) {
      logger.error('Error removing saved profile:', error);
    }
  },

  getUserProfile(): any {
    try {
      const data = safeGetItem(STORAGE_KEYS.USER_PROFILE);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Error getting user profile:', error);
      return null;
    }
  },

  saveUserProfile(profile: any): void {
    try {
      safeSetItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    } catch (error) {
      logger.error('Error saving user profile:', error);
    }
  },

  // Passed profiles
  getPassedProfiles(): string[] {
    try {
      const data = safeGetItem(STORAGE_KEYS.PASSED_PROFILES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.error('Error getting passed profiles:', error);
      return [];
    }
  },

  addPassedProfile(profileId: string): void {
    try {
      const passed = this.getPassedProfiles();
      if (!passed.includes(profileId)) {
        passed.push(profileId);
        safeSetItem(STORAGE_KEYS.PASSED_PROFILES, JSON.stringify(passed));
      }
    } catch (error) {
      logger.error('Error adding passed profile:', error);
    }
  },

  removePassedProfile(profileId: string): void {
    try {
      const passed = this.getPassedProfiles();
      const filtered = passed.filter(id => id !== profileId);
      safeSetItem(STORAGE_KEYS.PASSED_PROFILES, JSON.stringify(filtered));
    } catch (error) {
      logger.error('Error removing passed profile:', error);
    }
  },

  clearPassedProfiles(): void {
    try {
      safeRemoveItem(STORAGE_KEYS.PASSED_PROFILES);
    } catch (error) {
      logger.error('Error clearing passed profiles:', error);
    }
  },

  // Chat messages
  getChatMessages(profileId: string): any[] {
    try {
      const key = `${STORAGE_KEYS.USER_PROFILE}_chat_${profileId}`;
      const data = safeGetItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.error('Error getting chat messages:', error);
      return [];
    }
  },

  saveChatMessages(profileId: string, messages: any[]): void {
    try {
      const key = `${STORAGE_KEYS.USER_PROFILE}_chat_${profileId}`;
      safeSetItem(key, JSON.stringify(messages));
    } catch (error) {
      logger.error('Error saving chat messages:', error);
    }
  },

  // Filters
  getFilters(): any {
    try {
      const key = '@vibeup:filters';
      const data = safeGetItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        // Ensure all fields exist with defaults
        return {
          minAge: parsed.minAge || 18,
          maxAge: parsed.maxAge || 50,
          maxDistance: parsed.maxDistance || 100,
          interests: parsed.interests || [],
          kinks: parsed.kinks || [],
          sexualOrientation: parsed.sexualOrientation || [],
          genderIdentity: parsed.genderIdentity || [],
          lookingFor: parsed.lookingFor || [],
          vibeType: parsed.vibeType || [],
          outTonightOnly: parsed.outTonightOnly || false,
          verifiedOnly: parsed.verifiedOnly || false,
          bodyType: parsed.bodyType || [],
        };
      }
      return {
        minAge: 18,
        maxAge: 50,
        maxDistance: 100,
        interests: [],
        kinks: [],
        sexualOrientation: [],
        genderIdentity: [],
        lookingFor: [],
        vibeType: [],
        outTonightOnly: false,
        verifiedOnly: false,
        bodyType: [],
      };
    } catch (error) {
      logger.error('Error getting filters:', error);
      return {
        minAge: 18,
        maxAge: 50,
        maxDistance: 100,
        interests: [],
        kinks: [],
        sexualOrientation: [],
        genderIdentity: [],
        lookingFor: [],
        vibeType: [],
        outTonightOnly: false,
        verifiedOnly: false,
        bodyType: [],
      };
    }
  },

  saveFilters(filters: any): void {
    try {
      const key = '@vibeup:filters';
      safeSetItem(key, JSON.stringify(filters));
    } catch (error) {
      logger.error('Error saving filters:', error);
    }
  },

  // Onboarding
  isOnboardingComplete(): boolean {
    try {
      const data = safeGetItem('@vibeup:onboardingComplete');
      return data === 'true';
    } catch (error) {
      return false;
    }
  },

  setOnboardingComplete(complete: boolean): void {
    try {
      safeSetItem('@vibeup:onboardingComplete', String(complete));
    } catch (error) {
      logger.error('Error saving onboarding status:', error);
    }
  },

  // Premium features
  getPremiumFeatures(): any {
    try {
      const data = safeGetItem('@vibeup:premium');
      return data ? JSON.parse(data) : {
        hasBoost: false,
        hasSuperLike: false,
        hasUndo: false,
        hasPremium: false,
        boostsRemaining: 0,
        superLikesRemaining: 0,
        undosRemaining: 0,
      };
    } catch (error) {
      return {
        hasBoost: false,
        hasSuperLike: false,
        hasUndo: false,
        hasPremium: false,
        boostsRemaining: 0,
        superLikesRemaining: 0,
        undosRemaining: 0,
      };
    }
  },

  savePremiumFeatures(features: any): void {
    try {
      safeSetItem('@vibeup:premium', JSON.stringify(features));
    } catch (error) {
      logger.error('Error saving premium features:', error);
    }
  },

  // Swipe history for undo
  getSwipeHistory(): any[] {
    try {
      const data = safeGetItem('@vibeup:swipeHistory');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return [];
    }
  },

  addSwipeToHistory(swipe: any): void {
    try {
      const history = this.getSwipeHistory();
      history.push({ ...swipe, timestamp: Date.now() });
      // Keep only last 10 swipes
      if (history.length > 10) {
        history.shift();
      }
      safeSetItem('@vibeup:swipeHistory', JSON.stringify(history));
    } catch (error) {
      logger.error('Error saving swipe history:', error);
    }
  },

  removeLastSwipe(): any | null {
    try {
      const history = this.getSwipeHistory();
      if (history.length === 0) return null;
      const lastSwipe = history.pop();
      safeSetItem('@vibeup:swipeHistory', JSON.stringify(history));
      return lastSwipe;
    } catch (error) {
      logger.error('Error removing swipe from history:', error);
      return null;
    }
  },

  // Super liked profiles
  getSuperLikedProfiles(): string[] {
    try {
      const data = safeGetItem('@vibeup:superLikedProfiles');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return [];
    }
  },

  addSuperLikedProfile(profileId: string): void {
    try {
      const superLiked = this.getSuperLikedProfiles();
      if (!superLiked.includes(profileId)) {
        superLiked.push(profileId);
        safeSetItem('@vibeup:superLikedProfiles', JSON.stringify(superLiked));
      }
    } catch (error) {
      logger.error('Error adding super liked profile:', error);
    }
  },

  removeSuperLikedProfile(profileId: string): void {
    try {
      const superLiked = this.getSuperLikedProfiles();
      const filtered = superLiked.filter(id => id !== profileId);
      safeSetItem('@vibeup:superLikedProfiles', JSON.stringify(filtered));
    } catch (error) {
      logger.error('Error removing super liked profile:', error);
    }
  },

  // Blocked profiles
  getBlockedProfiles(): string[] {
    try {
      const data = safeGetItem(STORAGE_KEYS.BLOCKED_PROFILES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.error('Error getting blocked profiles:', error);
      return [];
    }
  },

  addBlockedProfile(profileId: string): void {
    try {
      const blocked = this.getBlockedProfiles();
      if (!blocked.includes(profileId)) {
        blocked.push(profileId);
        safeSetItem(STORAGE_KEYS.BLOCKED_PROFILES, JSON.stringify(blocked));
      }
    } catch (error) {
      logger.error('Error adding blocked profile:', error);
    }
  },

  removeBlockedProfile(profileId: string): void {
    try {
      const blocked = this.getBlockedProfiles();
      const filtered = blocked.filter(id => id !== profileId);
      safeSetItem(STORAGE_KEYS.BLOCKED_PROFILES, JSON.stringify(filtered));
    } catch (error) {
      logger.error('Error removing blocked profile:', error);
    }
  },

  isBlocked(profileId: string): boolean {
    return this.getBlockedProfiles().includes(profileId);
  },

  // Unmatch / cleanup
  unmatchProfile(profileId: string): void {
    try {
      this.removeLikedProfile(profileId);
      this.removeSuperLikedProfile(profileId);
      this.removeSavedProfile(profileId);
      // Remove chat history
      const chatKey = `${STORAGE_KEYS.USER_PROFILE}_chat_${profileId}`;
      safeRemoveItem(chatKey);
    } catch (error) {
      logger.error('Error unmatching profile:', error);
    }
  },

  // Profile viewers (Premium)
  addProfileViewer(viewer: any): void {
    try {
      const viewers = this.getProfileViewers();
      viewers.unshift(viewer);
      if (viewers.length > 50) {
        viewers.pop();
      }
      safeSetItem('@vibeup:profileViewers', JSON.stringify(viewers));
    } catch (error) {
      logger.error('Error adding profile viewer:', error);
    }
  },

  getProfileViewers(): any[] {
    try {
      const data = safeGetItem('@vibeup:profileViewers');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return [];
    }
  },

  // Bookmarked posts
  getBookmarkedPosts(): string[] {
    try {
      const data = safeGetItem('@vibeup:bookmarkedPosts');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return [];
    }
  },

  addBookmarkedPost(postId: string): void {
    try {
      const bookmarks = this.getBookmarkedPosts();
      if (!bookmarks.includes(postId)) {
        bookmarks.push(postId);
        safeSetItem('@vibeup:bookmarkedPosts', JSON.stringify(bookmarks));
      }
    } catch (error) {
      logger.error('Error adding bookmarked post:', error);
    }
  },

  removeBookmarkedPost(postId: string): void {
    try {
      const bookmarks = this.getBookmarkedPosts();
      const filtered = bookmarks.filter(id => id !== postId);
      safeSetItem('@vibeup:bookmarkedPosts', JSON.stringify(filtered));
    } catch (error) {
      logger.error('Error removing bookmarked post:', error);
    }
  },

  // Community memberships
  getJoinedCommunities(): string[] {
    try {
      const data = safeGetItem('@vibeup:joinedCommunities');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.error('Error getting joined communities:', error);
      return [];
    }
  },

  saveJoinedCommunities(ids: string[]): void {
    try {
      safeSetItem('@vibeup:joinedCommunities', JSON.stringify(ids));
    } catch (error) {
      logger.error('Error saving joined communities:', error);
    }
  },

  // Demo mode (when Firebase auth fails or is not configured)
  DEMO_USER_ID: 'demo-user-vibeup',

  getDemoUser(): { uid: string; email: string; displayName: string } | null {
    try {
      const data = safeGetItem('@vibeup:demoUser');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setDemoUser(user: { uid: string; email: string; displayName: string } | null): void {
    try {
      if (user) {
        safeSetItem('@vibeup:demoUser', JSON.stringify(user));
      } else {
        safeRemoveItem('@vibeup:demoUser');
      }
    } catch (error) {
      logger.error('Error saving demo user:', error);
    }
  },

  isDemoMode(): boolean {
    return this.getDemoUser() !== null;
  },

  // User session
  saveUserSession(session: any): void {
    try {
      safeSetItem('@vibeup:userSession', JSON.stringify(session));
    } catch (error) {
      logger.error('Error saving user session:', error);
    }
  },

  getUserSession(): any {
    try {
      const data = safeGetItem('@vibeup:userSession');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  },

  setIsLoggedIn(loggedIn: boolean): void {
    try {
      safeSetItem('@vibeup:isLoggedIn', String(loggedIn));
    } catch (error) {
      logger.error('Error saving login status:', error);
    }
  },

  isLoggedIn(): boolean {
    try {
      return safeGetItem('@vibeup:isLoggedIn') === 'true';
    } catch (error) {
      return false;
    }
  },

  logout(): void {
    try {
      safeRemoveItem('@vibeup:userSession');
      safeSetItem('@vibeup:isLoggedIn', 'false');
    } catch (error) {
      logger.error('Error during logout:', error);
    }
  },
};
