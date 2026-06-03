import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  where,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { getCurrentUid, getCurrentUser, isDemoMode } from './auth';
import { storage } from './utils/storage';
import type { ChatMessage, Comment, Community, Event, Location, Notification, Post, Profile, Report, UserProfile } from './types';
import { mockProfiles } from './data/mockProfiles';

export type SwipeType = 'like' | 'pass' | 'superlike' | 'block' | 'save';

// Helper to check if Firestore is available
function requireDb(): Firestore {
  if (!db) {
    throw new Error('Firestore not configured. Running in demo mode.');
  }
  return db;
}

export function requireUid(): string {
  const uid = getCurrentUid();
  if (!uid) {
    throw new Error('Not authenticated');
  }
  return uid;
}

export function matchIdFor(a: string, b: string): string {
  return [a, b].sort().join('_');
}

export async function upsertMyProfile(userProfile: UserProfile | null | undefined): Promise<void> {
  if (isDemoMode() || !db) return; // Skip Firestore in demo mode
  const uid = requireUid();

  const currentUser = getCurrentUser();
  const displayName = currentUser?.displayName || userProfile?.name || 'New User';
  const photo = currentUser?.photoURL || userProfile?.photos?.[0] || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.name || 'User')}&background=ff2d95&color=fff&size=400&rounded=true&bold=true`;

  const age = (() => {
    const n = Number.parseInt(userProfile?.age || '', 10);
    return Number.isFinite(n) ? n : 18;
  })();

  const tags = userProfile?.interests || [];

  // Resolve lat/lng from currentCity
  let lat: number | undefined;
  let lng: number | undefined;
  if (userProfile?.currentCity && userProfile.currentCity !== 'Near Me') {
    const { getCityCoords } = await import('./utils/geolocation');
    const coords = getCityCoords(userProfile.currentCity);
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
    }
  }
  // Try browser geolocation for precise coords
  if (!lat || !lng) {
    try {
      const { getCurrentLocation } = await import('./utils/geolocation');
      const loc = await getCurrentLocation();
      if (loc) {
        lat = loc.latitude;
        lng = loc.longitude;
      }
    } catch {
      // Non-fatal
    }
  }

  await setDoc(
    doc(requireDb(), 'profiles', uid),
    {
      name: displayName,
      age,
      distance: 0,
      photo,
      photos: userProfile?.photos || (currentUser?.photoURL ? [currentUser.photoURL] : []),
      tags,
      lat: lat ?? null,
      lng: lng ?? null,
      bio: userProfile?.bio || '',
      sexualOrientation: userProfile?.sexualOrientation || null,
      lookingFor: userProfile?.lookingFor || [],
      into: userProfile?.into || [],
      hookUpNow: userProfile?.hookUpNow || false,
      pronouns: userProfile?.pronouns || null,
      genderIdentity: userProfile?.genderIdentity || null,
      kinks: userProfile?.kinks || [],
      intent: userProfile?.intent || null,
      vibeStyle: userProfile?.vibeStyle || null,
      verified: userProfile?.verified || false,
      photoBlurEnabled: userProfile?.photoBlurEnabled || false,
      anonymous: userProfile?.anonymous || false,
      safeMode: userProfile?.safeMode || false,
      vibeType: userProfile?.vibeType || null,
      tonightLookingFor: userProfile?.tonightLookingFor || null,
      height: userProfile?.height || null,
      bodyType: userProfile?.bodyType || null,
      role: userProfile?.role || null,
      instagram: userProfile?.instagram || null,
      goingOutTonight: userProfile?.goingOutTonight || false,
      visibleOnMap: userProfile?.visibleOnMap || false,
      ghostMode: userProfile?.ghostMode || false,
      currentCity: userProfile?.currentCity || null,
      isProfileHidden: userProfile?.isProfileHidden || false,
      nsfwEnabled: userProfile?.nsfwEnabled || false,
      photoRulesAccepted: userProfile?.photoRulesAccepted || false,
      allowBlurredBody: userProfile?.allowBlurredBody ?? true,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function seedMockProfilesIfEmpty(): Promise<{ seeded: boolean; count: number }> {
  if (isDemoMode() || !db) return { seeded: false, count: 0 };
  requireUid();

  const existing = await getDocs(query(collection(requireDb(), 'profiles'), limit(1)));
  if (!existing.empty) {
    return { seeded: false, count: 0 };
  }

  const batch = writeBatch(requireDb());
  for (const p of mockProfiles) {
    const id = `seed_${p.id}`;
    const ref = doc(requireDb(), 'profiles', id);
    batch.set(ref, {
      name: p.name,
      age: p.age,
      distance: p.distance,
      photo: p.photo,
      photos: p.photos || [],
      tags: p.tags || [],
      bio: p.bio || '',
      lat: p.lat ?? null,
      lng: p.lng ?? null,
      sexualOrientation: p.sexualOrientation ?? null,
      lookingFor: p.lookingFor || [],
      hookUpNow: p.hookUpNow || false,
      pronouns: p.pronouns ?? null,
      genderIdentity: p.genderIdentity ?? null,
      kinks: p.kinks || [],
      intent: p.intent ?? null,
      vibeStyle: p.vibeStyle ?? null,
      verified: p.verified || false,
      photoBlurEnabled: p.photoBlurEnabled || false,
      anonymous: p.anonymous || false,
      safeMode: p.safeMode || false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
  return { seeded: true, count: mockProfiles.length };
}

export function listenProfiles(onChange: (profiles: Profile[]) => void): Unsubscribe {
  if (isDemoMode() || !db) {
    const mock = mockProfiles.map((p) => ({ ...p, id: p.id, online: true })) as Profile[];
    onChange(mock);
    return () => {};
  }
  const uid = getCurrentUid();
  const q = query(collection(requireDb(), 'profiles'), limit(200));
  return onSnapshot(
    q,
    (snap) => {
      try {
        const profiles = snap.docs
          .map((d) => {
            const data = d.data() as Omit<Profile, 'id'>;
            const lastActive = data.lastActive
              ? (typeof data.lastActive === 'object' && 'toMillis' in data.lastActive
                ? (data.lastActive as any).toMillis()
                : data.lastActive as number)
              : 0;
            return {
              id: d.id,
              ...data,
              online: lastActive > Date.now() - 300000,
            };
          })
          .filter((p) => (uid ? p.id !== uid : true))
          .filter((p) => !p.ghostMode);
        
        if (profiles.length === 0) {
          console.warn('[Discover] No profiles returned from Firestore query (0 docs present)');
        }
        onChange(profiles);
      } catch (err) {
        console.error('[Discover] Error processing profiles snapshot:', err);
        onChange([]);
      }
    },
    (err) => {
      console.error('[Discover] Firebase listen error:', err?.code, err?.message);
      onChange([]);
    },
  );
}

/** Same as listenProfiles but includes the current user's profile (for map) */
export function listenProfilesRaw(onChange: (profiles: Profile[]) => void): Unsubscribe {
  if (isDemoMode() || !db) {
    const mock = mockProfiles.map((p) => ({ ...p, id: p.id, online: true })) as Profile[];
    onChange(mock);
    return () => {};
  }
  const q = query(collection(requireDb(), 'profiles'), limit(200));
  return onSnapshot(
    q,
    (snap) => {
      try {
        const profiles = snap.docs.map((d) => {
          const data = d.data() as Omit<Profile, 'id'>;
          const lastActive = data.lastActive
            ? (typeof data.lastActive === 'object' && 'toMillis' in data.lastActive
              ? (data.lastActive as any).toMillis()
              : data.lastActive as number)
            : 0;
          return {
            id: d.id,
            ...data,
            online: lastActive > Date.now() - 300000,
          };
        });
        onChange(profiles);
      } catch (err) {
        console.error('[Map] Error processing profiles snapshot:', err);
        onChange([]);
      }
    },
    (err) => {
      console.error('[Map] Firebase listen error:', err?.code, err?.message);
      onChange([]);
    },
  );
}

export async function getProfile(profileId: string): Promise<Profile | null> {
  if (isDemoMode()) {
    return mockProfiles.find(p => p.id === profileId) || null;
  }
  if (!db) return null;
  const ref = doc(db, 'profiles', profileId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Profile, 'id'>) };
}

export function listenMySwipes(
  uid: string,
  onChange: (swipes: Record<string, SwipeType>) => void,
): Unsubscribe {
  if (isDemoMode() || !db) {
    onChange({});
    return () => {};
  }
  const q = query(collection(requireDb(), 'users', uid, 'swipes'));
  return onSnapshot(
    q,
    (snap) => {
      const swipes: Record<string, SwipeType> = {};
      for (const d of snap.docs) {
        const data = d.data() as any;
        if (data?.type) {
          swipes[d.id] = data.type;
        }
      }
      onChange(swipes);
    },
    () => {
      onChange({});
    },
  );
}

/** Listen to premium status from Firestore (set by Stripe webhook → Cloud Function) */
export function listenPremiumFromFirestore(
  uid: string,
  onChange: (hasPremium: boolean) => void,
): Unsubscribe {
  if (isDemoMode() || !db) {
    onChange(false);
    return () => {};
  }
  const ref = doc(requireDb(), 'users', uid, 'premium', 'status');
  return onSnapshot(
    ref,
    (snap) => {
      const data = snap.data() as { hasPremium?: boolean; expiresAt?: { toMillis: () => number } | number } | undefined;
      const expiresAt = typeof data?.expiresAt === 'object' && data?.expiresAt?.toMillis
        ? data.expiresAt.toMillis()
        : (data?.expiresAt as number | undefined);
      const hasPremium = !!data?.hasPremium && (!expiresAt || expiresAt > Date.now());
      onChange(hasPremium);
    },
    () => onChange(false),
  );
}

/** Listen to blocked profile IDs (persisted in Firestore as swipes with type 'block') */
export function listenBlockedIds(uid: string, onChange: (ids: string[]) => void): Unsubscribe {
  if (isDemoMode() || !db) {
    const ids = storage.getBlockedProfiles();
    onChange(ids);
    return () => {};
  }
  const q = query(
    collection(requireDb(), 'users', uid, 'swipes'),
    where('type', '==', 'block'),
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => d.id)),
    () => onChange([]),
  );
}

export async function setSwipe(uid: string, targetId: string, type: SwipeType): Promise<{ matchCreated: boolean }> {
  if (!db) {
    if (type === 'block') {
      storage.addBlockedProfile(targetId);
    }
    return { matchCreated: false };
  }
  const ref = doc(requireDb(), 'users', uid, 'swipes', targetId);
  await setDoc(
    ref,
    {
      type,
      targetId,
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );

  if (type === 'like' || type === 'superlike') {
    const matchCreated = await ensureMatchIfMutual(uid, targetId);
    if (!matchCreated) {
      const myProfile = await getProfile(uid);
      const myName = myProfile?.name || 'Someone';
      addNotification({
        uid: targetId,
        type: 'like',
        title: type === 'superlike' ? 'Super like!' : 'New like',
        body: `${myName} ${type === 'superlike' ? 'super liked' : 'liked'} you`,
        profileId: uid,
      }).catch(() => {});
    }
    return { matchCreated };
  }

  return { matchCreated: false };
}

export async function removeSwipe(uid: string, targetId: string): Promise<void> {
  if (!db) {
    storage.removeBlockedProfile(targetId);
    return;
  }
  const ref = doc(requireDb(), 'users', uid, 'swipes', targetId);
  await deleteDoc(ref);
}

// ─── Follow / Friends ───────────────────────────────────────────────────────

export async function followUser(uid: string, targetId: string): Promise<void> {
  if (isDemoMode() || !db) return;
  if (uid === targetId) return;
  const ref = doc(requireDb(), 'users', uid, 'follows', targetId);
  await setDoc(ref, { targetId, createdAt: serverTimestamp() }, { merge: true });
}

export async function unfollowUser(uid: string, targetId: string): Promise<void> {
  if (isDemoMode() || !db) return;
  const ref = doc(requireDb(), 'users', uid, 'follows', targetId);
  await deleteDoc(ref);
}

export function listenUserFollows(uid: string, onChange: (ids: string[]) => void): Unsubscribe {
  if (isDemoMode() || !db) {
    onChange([]);
    return () => {};
  }
  const q = query(collection(requireDb(), 'users', uid, 'follows'));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => d.id)),
    () => onChange([]),
  );
}

/** Listen to who follows a given profile (users who have profileId in their follows) */
export function listenFollowedBy(profileId: string, onChange: (followerIds: string[]) => void): Unsubscribe {
  if (isDemoMode() || !db) {
    onChange([]);
    return () => {};
  }
  const q = query(
    collectionGroup(requireDb(), 'follows'),
    where('targetId', '==', profileId),
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => d.ref.parent.parent?.id).filter(Boolean) as string[]),
    () => onChange([]),
  );
}

/** Call when a new user completes onboarding - auto-follows owner so mass messages reach them */
export async function ensureNewUserFollowsOwner(uid: string): Promise<void> {
  if (isDemoMode()) return;
  const { config } = await import('./config/api');
  const ownerId = config.ownerProfileId?.trim();
  if (!ownerId || ownerId === uid) return;
  await followUser(uid, ownerId);
}

// ─── Check-ins (events & places) ────────────────────────────────────────────

export interface CheckIn {
  id: string;
  userId: string;
  eventId?: string;
  locationId?: string;
  placeName: string;
  lat?: number;
  lng?: number;
  checkInAt: number;
}

export async function addCheckIn(
  uid: string,
  opts: { eventId?: string; locationId?: string; placeName: string; lat?: number; lng?: number },
): Promise<string> {
  if (isDemoMode() || !db) return '';
  const ref = doc(collection(requireDb(), 'checkIns'));
  await setDoc(ref, {
    userId: uid,
    eventId: opts.eventId || null,
    locationId: opts.locationId || null,
    placeName: opts.placeName || 'Unknown',
    lat: opts.lat ?? null,
    lng: opts.lng ?? null,
    checkInAt: serverTimestamp(),
  });
  return ref.id;
}

export function listenCheckInsAtEvent(eventId: string, onChange: (checkIns: CheckIn[]) => void): Unsubscribe {
  if (isDemoMode() || !db) {
    onChange([]);
    return () => {};
  }
  const q = query(
    collection(requireDb(), 'checkIns'),
    where('eventId', '==', eventId),
    orderBy('checkInAt', 'desc'),
    limit(50),
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          userId: data.userId || '',
          eventId: data.eventId,
          locationId: data.locationId,
          placeName: data.placeName || 'Unknown',
          lat: data.lat,
          lng: data.lng,
          checkInAt: data.checkInAt?.toMillis?.() ?? Date.now(),
        };
      });
      onChange(items);
    },
    () => onChange([]),
  );
}

export function listenCheckInsAtLocation(locationId: string, onChange: (checkIns: CheckIn[]) => void): Unsubscribe {
  if (isDemoMode() || !db) {
    onChange([]);
    return () => {};
  }
  const q = query(
    collection(requireDb(), 'checkIns'),
    where('locationId', '==', locationId),
    orderBy('checkInAt', 'desc'),
    limit(50),
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          userId: data.userId || '',
          eventId: data.eventId,
          locationId: data.locationId,
          placeName: data.placeName || 'Unknown',
          lat: data.lat,
          lng: data.lng,
          checkInAt: data.checkInAt?.toMillis?.() ?? Date.now(),
        };
      });
      onChange(items);
    },
    () => onChange([]),
  );
}

/** Remove match and our swipe so neither user sees the match anymore */
export async function unmatch(uid: string, targetId: string): Promise<void> {
  if (!db) return;
  const matchId = matchIdFor(uid, targetId);
  const matchRef = doc(requireDb(), 'matches', matchId);
  const matchSnap = await getDoc(matchRef);
  if (matchSnap.exists()) {
    await deleteDoc(matchRef);
  }
  await removeSwipe(uid, targetId);
}

export async function ensureMatchIfMutual(uid: string, targetId: string): Promise<boolean> {
  if (!db) return false;
  const theirSwipeRef = doc(requireDb(), 'users', targetId, 'swipes', uid);
  const theirSwipeSnap = await getDoc(theirSwipeRef);
  if (!theirSwipeSnap.exists()) return false;

  const theirType = (theirSwipeSnap.data() as any)?.type as SwipeType | undefined;
  if (theirType !== 'like' && theirType !== 'superlike') return false;

  const matchId = matchIdFor(uid, targetId);
  const matchRef = doc(requireDb(), 'matches', matchId);
  const matchSnap = await getDoc(matchRef);
  if (matchSnap.exists()) return false;

  await setDoc(matchRef, {
    users: [uid, targetId],
    createdAt: serverTimestamp(),
    lastMessage: null,
    lastMessageAt: null,
  });

  // Notify both users about the new match
  const [myProfile, theirProfile] = await Promise.all([getProfile(uid), getProfile(targetId)]);
  const myName = myProfile?.name || 'Someone';
  const theirName = theirProfile?.name || 'Someone';
  await Promise.all([
    addNotification({
      uid: targetId,
      type: 'match',
      title: "It's a match!",
      body: `You and ${myName} liked each other. Say hi!`,
      profileId: uid,
      actionUrl: `match:${matchId}`,
    }),
    addNotification({
      uid,
      type: 'match',
      title: "It's a match!",
      body: `You and ${theirName} liked each other. Say hi!`,
      profileId: targetId,
      actionUrl: `match:${matchId}`,
    }),
  ]);

  return true;
}

export function listenMatches(
  uid: string,
  onChange: (matches: { id: string; users: string[]; lastMessage: string | null; lastMessageAt: number | null; typingBy: string | null }[]) => void,
): Unsubscribe {
  if (!db) {
    onChange([]);
    return () => {};
  }
  const q = query(collection(requireDb(), 'matches'), where('users', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      onChange(
        snap.docs.map((d) => {
          const data = d.data() as any;
          const lastMessageAt = data?.lastMessageAt?.toMillis ? data.lastMessageAt.toMillis() : null;
          return {
            id: d.id,
            users: (data?.users as string[]) || [],
            lastMessage: (data?.lastMessage as string | null) ?? null,
            lastMessageAt,
            typingBy: (data?.typingBy as string | null) ?? null,
          };
        }),
      );
    },
    () => {
      onChange([]);
    },
  );
}

export function listenWhoLikedMe(
  uid: string,
  onChange: (profileIds: string[]) => void,
): Unsubscribe {
  if (!db) {
    onChange([]);
    return () => {};
  }
  const q = query(
    collectionGroup(requireDb(), 'swipes'),
    where('targetId', '==', uid),
    where('type', 'in', ['like', 'superlike']),
  );

  return onSnapshot(
    q,
    (snap) => {
      const ids = Array.from(
        new Set(
          snap.docs
            .map((d) => d.ref.parent.parent?.id)
            .filter((id): id is string => !!id),
        ),
      );
      onChange(ids);
    },
    () => {
      onChange([]);
    },
  );
}

export function listenChatMessages(matchId: string, onChange: (messages: ChatMessage[]) => void): Unsubscribe {
  if (!db) {
    const stored = storage.getChatMessages(matchId);
    onChange(stored);
    return () => {};
  }
  const q = query(collection(requireDb(), 'matches', matchId, 'messages'), orderBy('timestamp', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const messages: ChatMessage[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          text: data.text,
          imageUrl: data.imageUrl,
          gifUrl: data.gifUrl,
          voiceNoteUrl: data.voiceNoteUrl,
          senderId: data.senderId,
          timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : Date.now(),
          isRead: !!data.isRead,
          messageType: data.messageType || (data.text ? 'text' : data.imageUrl ? 'image' : 'voice'),
          reactions: data.reactions || {},
        };
      });
      onChange(messages);
    },
    () => {
      onChange([]);
    },
  );
}

export async function sendChatMessage(params: {
  matchId: string;
  senderId: string;
  text?: string;
  imageUrl?: string;
  gifUrl?: string;
  voiceNoteUrl?: string;
  messageType: 'text' | 'image' | 'voice' | 'gif';
}): Promise<void> {
  const { matchId, senderId, text, imageUrl, gifUrl, voiceNoteUrl, messageType } = params;

  if (!db || isDemoMode()) {
    const messages = storage.getChatMessages(matchId);
    messages.push({
      id: `local_${Date.now()}`,
      text: text ?? '',
      imageUrl: imageUrl ?? null,
      gifUrl: gifUrl ?? null,
      voiceNoteUrl: voiceNoteUrl ?? null,
      senderId,
      timestamp: Date.now(),
      isRead: false,
      messageType,
      reactions: {},
    });
    storage.saveChatMessages(matchId, messages);
    return;
  }

  const matchRef = doc(requireDb(), 'matches', matchId);
  const matchSnap = await getDoc(matchRef);
  const users = (matchSnap.data() as any)?.users as string[] | undefined;
  const recipientId = users?.find((u) => u !== senderId);

  const msgRef = collection(requireDb(), 'matches', matchId, 'messages');
  await addDoc(msgRef, {
    senderId,
    text: text ?? null,
    imageUrl: imageUrl ?? null,
    gifUrl: gifUrl ?? null,
    voiceNoteUrl: voiceNoteUrl ?? null,
    messageType,
    isRead: false,
    reactions: {},
    timestamp: serverTimestamp(),
  });

  const preview = text ?? (messageType === 'image' ? '📷 Photo' : messageType === 'gif' ? '🎞️ GIF' : messageType === 'voice' ? '🎤 Voice note' : '');
  await updateDoc(matchRef, {
    lastMessage: preview,
    lastMessageAt: serverTimestamp(),
  });

  if (recipientId) {
    const senderProfile = await getProfile(senderId);
    const senderName = senderProfile?.name || 'Someone';
    addNotification({
      uid: recipientId,
      type: 'message',
      title: senderName,
      body: preview || 'Sent a message',
      profileId: senderId,
      actionUrl: `match:${matchId}`,
    }).catch(() => {});
  }
}

export async function toggleMessageReaction(
  matchId: string,
  messageId: string,
  userId: string,
  emoji: string,
): Promise<void> {
  if (!db || isDemoMode()) return;
  const msgRef = doc(requireDb(), 'matches', matchId, 'messages', messageId);
  const snap = await getDoc(msgRef);
  if (!snap.exists()) return;
  const data = snap.data() as any;
  const reactions = data.reactions || {};
  if (!reactions[emoji]) reactions[emoji] = [];
  if (reactions[emoji].includes(userId)) {
    reactions[emoji] = reactions[emoji].filter((id: string) => id !== userId);
    if (reactions[emoji].length === 0) delete reactions[emoji];
  } else {
    reactions[emoji].push(userId);
  }
  await updateDoc(msgRef, { reactions });
}

export async function updateTypingStatus(matchId: string, userId: string, isTyping: boolean): Promise<void> {
  if (!db || isDemoMode()) return;
  const matchRef = doc(requireDb(), 'matches', matchId);
  await updateDoc(matchRef, {
    typingBy: isTyping ? userId : null,
  });
}

export async function markMessagesAsRead(matchId: string, currentUserId: string): Promise<void> {
  if (!db || isDemoMode()) return;
  const q = query(
    collection(requireDb(), 'matches', matchId, 'messages'),
    where('senderId', '!=', currentUserId),
    where('isRead', '==', false),
  );
  const snap = await getDocs(q);
  const batch = writeBatch(requireDb());
  snap.docs.forEach(d => {
    batch.update(d.ref, { isRead: true });
  });
  if (snap.docs.length > 0) {
    await batch.commit();
  }
}

export async function listMySwipes(uid: string): Promise<Record<string, SwipeType>> {
  if (!db) return {};
  const snap = await getDocs(collection(requireDb(), 'users', uid, 'swipes'));
  const swipes: Record<string, SwipeType> = {};
  for (const d of snap.docs) {
    const data = d.data() as any;
    if (data?.type) swipes[d.id] = data.type;
  }
  return swipes;
}

export function listenWallPosts(onChange: (posts: Post[]) => void): Unsubscribe {
  if (!db) {
    onChange([]);
    return () => {};
  }
  const q = query(collection(requireDb(), 'posts'), orderBy('timestamp', 'desc'), limit(200));

  return onSnapshot(
    q,
    (snap) => {
      const posts: Post[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          authorId: data.authorId || '',
          authorName: data.authorName || 'User',
          authorPhoto: data.authorPhoto || '',
          content: data.content || '',
          image: data.image || undefined,
          video: data.video || undefined,
          timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : Date.now(),
          likes: Array.isArray(data.likes) ? data.likes : [],
          comments: Array.isArray(data.comments) ? data.comments : [],
          shares: typeof data.shares === 'number' ? data.shares : 0,
          bookmarks: Array.isArray(data.bookmarks) ? data.bookmarks : [],
          nsfw: !!data.nsfw,
          tags: Array.isArray(data.tags) ? data.tags : [],
          type: (data.type as Post['type']) || 'text',
          storyExpiresAt: data.storyExpiresAt?.toMillis ? data.storyExpiresAt.toMillis() : data.storyExpiresAt,
        };
      });

      onChange(posts);
    },
    () => {
      onChange([]);
    },
  );
}

export async function createWallPost(input: {
  content: string;
  image?: string;
  video?: string;
  nsfw: boolean;
  tags: string[];
  type: Post['type'];
}): Promise<void> {
  if (isDemoMode() || !db) return;
  const uid = requireUid();
  const profile = await getProfile(uid);
  const currentUser = getCurrentUser();

  await addDoc(collection(requireDb(), 'posts'), {
    authorId: uid,
    authorName: profile?.name || currentUser?.displayName || 'You',
    authorPhoto:
      profile?.photo ||
      profile?.photos?.[0] ||
      currentUser?.photoURL ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || currentUser?.displayName || 'User')}&background=ff2d95&color=fff&size=200&rounded=true&bold=true`,
    content: input.content,
    image: input.image || null,
    video: input.video || null,
    timestamp: serverTimestamp(),
    likes: [],
    comments: [],
    shares: 0,
    bookmarks: [],
    nsfw: input.nsfw,
    tags: input.tags,
    type: input.type,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function toggleWallPostLike(postId: string, userId: string, isLiked: boolean): Promise<void> {
  if (!db) return;
  const ref = doc(requireDb(), 'posts', postId);
  await updateDoc(ref, {
    likes: isLiked ? arrayRemove(userId) : arrayUnion(userId),
    updatedAt: serverTimestamp(),
  });
}

export async function addWallPostComment(postId: string, comment: Comment): Promise<void> {
  if (!db) return;
  const ref = doc(requireDb(), 'posts', postId);
  const postSnap = await getDoc(ref);
  const postAuthorId = (postSnap.data() as any)?.authorId;

  await updateDoc(ref, {
    comments: arrayUnion(comment),
    updatedAt: serverTimestamp(),
  });

  if (postAuthorId && postAuthorId !== comment.authorId) {
    addNotification({
      uid: postAuthorId,
      type: 'comment',
      title: 'New comment',
      body: `${comment.authorName} commented on your post`,
      profileId: comment.authorId,
      postId,
    }).catch(() => {});
  }
}

export function listenLocations(onChange: (locations: Location[]) => void): Unsubscribe {
  if (!db) {
    onChange([]);
    return () => {};
  }
  const q = query(collection(requireDb(), 'locations'), limit(300));
  return onSnapshot(
    q,
    (snap) => {
      const locations: Location[] = snap.docs
        .filter((d) => (d.data() as any).status !== 'pending')
        .map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            name: data.name || 'Unnamed location',
            type: (data.type as Location['type']) || 'venue',
            address: data.address || '',
            distance: typeof data.distance === 'number' ? data.distance : 0,
            photo: data.photo || '',
            rating: typeof data.rating === 'number' ? data.rating : undefined,
            description: data.description || undefined,
            lat: typeof data.lat === 'number' ? data.lat : undefined,
            lng: typeof data.lng === 'number' ? data.lng : undefined,
          };
        });
      onChange(locations);
    },
    () => onChange([]),
  );
}

export async function createLocation(location: Omit<Location, 'id'> & { id?: string }): Promise<string> {
  if (isDemoMode() || !db) {
    return `demo_${Date.now()}`;
  }
  const uid = requireUid();
  const ref = await addDoc(collection(requireDb(), 'locations'), {
    name: location.name || 'Unnamed',
    type: location.type || 'venue',
    address: location.address || '',
    distance: typeof location.distance === 'number' ? location.distance : 0,
    photo: location.photo || '',
    rating: location.rating,
    description: location.description || '',
    lat: location.lat,
    lng: location.lng,
    city: (location as any).city || '',
    state: (location as any).state || '',
    createdBy: uid,
    createdAt: serverTimestamp(),
    status: 'approved',
  });
  return ref.id;
}

export function listenEvents(onChange: (events: Event[]) => void): Unsubscribe {
  if (!db) {
    onChange([]);
    return () => {};
  }
  const q = query(collection(requireDb(), 'events'), orderBy('date', 'asc'), limit(300));
  return onSnapshot(
    q,
    (snap) => {
      const events: Event[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          title: data.title || 'Untitled event',
          description: data.description || '',
          organizerId: data.organizerId || '',
          organizerName: data.organizerName || 'Host',
          organizerPhoto: data.organizerPhoto || '',
          date: data.date?.toMillis ? data.date.toMillis() : Number(data.date) || Date.now(),
          endDate: data.endDate?.toMillis ? data.endDate.toMillis() : data.endDate,
          location: data.location || '',
          city: data.city || undefined,
          lat: typeof data.lat === 'number' ? data.lat : undefined,
          lng: typeof data.lng === 'number' ? data.lng : undefined,
          isPublic: data.isPublic !== false,
          rsvps: {
            going: Array.isArray(data.rsvps?.going) ? data.rsvps.going : [],
            interested: Array.isArray(data.rsvps?.interested) ? data.rsvps.interested : [],
            notGoing: Array.isArray(data.rsvps?.notGoing) ? data.rsvps.notGoing : [],
          },
          tags: Array.isArray(data.tags) ? data.tags : [],
          photo: data.photo || undefined,
          maxAttendees: typeof data.maxAttendees === 'number' ? data.maxAttendees : undefined,
          nsfw: !!data.nsfw,
        };
      });
      onChange(events);
    },
    () => onChange([]),
  );
}

export async function createEvent(event: Event): Promise<void> {
  if (isDemoMode() || !db) return;
  const uid = requireUid();
  const profile = await getProfile(uid);

  const currentUser = getCurrentUser();
  await setDoc(
    doc(requireDb(), 'events', event.id),
    {
      ...event,
      organizerId: uid,
      organizerName: profile?.name || currentUser?.displayName || event.organizerName,
      organizerPhoto: profile?.photo || profile?.photos?.[0] || currentUser?.photoURL || event.organizerPhoto,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function setEventRsvp(eventId: string, userId: string, status: 'going' | 'interested' | 'notGoing'): Promise<void> {
  if (!db) return;
  const eventRef = doc(requireDb(), 'events', eventId);
  const snap = await getDoc(eventRef);
  if (!snap.exists()) return;

  const data = snap.data() as any;
  const organizerId = data.organizerId;
  const eventTitle = data.title || 'Your event';

  const going = (Array.isArray(data.rsvps?.going) ? data.rsvps.going : []).filter((id: string) => id !== userId);
  const interested = (Array.isArray(data.rsvps?.interested) ? data.rsvps.interested : []).filter((id: string) => id !== userId);
  const notGoing = (Array.isArray(data.rsvps?.notGoing) ? data.rsvps.notGoing : []).filter((id: string) => id !== userId);

  if (status === 'going') going.push(userId);
  if (status === 'interested') interested.push(userId);
  if (status === 'notGoing') notGoing.push(userId);

  await updateDoc(eventRef, {
    rsvps: {
      going,
      interested,
      notGoing,
    },
    updatedAt: serverTimestamp(),
  });

  if (organizerId && organizerId !== userId && status === 'going') {
    const userProfile = await getProfile(userId);
    const userName = userProfile?.name || 'Someone';
    addNotification({
      uid: organizerId,
      type: 'rsvp',
      title: 'New RSVP',
      body: `${userName} is going to ${eventTitle}`,
      profileId: userId,
      eventId,
    }).catch(() => {});
  }
}

const SEED_COMMUNITIES: Omit<Community, 'id'>[] = [
  { name: 'Pride & Joy', description: 'A safe space for LGBTQ+ individuals to connect and share', photo: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=300&fit=crop', memberCount: 0, isExclusive: false, tags: ['LGBTQ+', 'Community', 'Support'], nsfw: false },
  { name: 'Kink & Fetish', description: 'Open discussion about kinks, fetishes, and BDSM', photo: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=400&h=300&fit=crop', memberCount: 0, isExclusive: true, tags: ['Kink', 'BDSM', 'Fetish'], nsfw: true },
  { name: 'Bear Community', description: 'For bears, cubs, and admirers', photo: 'https://images.unsplash.com/photo-1478147427282-58a87a120781?w=400&h=300&fit=crop', memberCount: 0, isExclusive: false, tags: ['Bears', 'Community'], nsfw: false },
  { name: 'Leather & Denim', description: 'Exclusive community for leather and denim enthusiasts', photo: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop', memberCount: 0, isExclusive: true, tags: ['Leather', 'Denim', 'Exclusive'], nsfw: true },
];

export interface Room {
  id: string;
  name: string;
  description: string;
  tags: string[];
  isPublic: boolean;
  inviteCode?: string;
  members: string[];
  createdBy: string;
  createdAt: number;
  lastMessage: string | null;
  lastMessageAt: number | null;
  pinnedMessageId?: string | null;
  mutedMembers?: string[];
  kickedMembers?: string[];
}

export function listenRooms(onChange: (rooms: Room[]) => void): Unsubscribe {
  if (!db) {
    onChange([]);
    return () => {};
  }
  const q = query(collection(requireDb(), 'rooms'), orderBy('createdAt', 'desc'), limit(300));
  return onSnapshot(
    q,
    (snap) => {
      const rooms: Room[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          name: data.name || 'Room',
          description: data.description || '',
          tags: Array.isArray(data.tags) ? data.tags : [],
          isPublic: data.isPublic !== false,
          inviteCode: data.inviteCode || undefined,
          members: Array.isArray(data.members) ? data.members : [],
          createdBy: data.createdBy || '',
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
          lastMessage: data.lastMessage ?? null,
          lastMessageAt: data.lastMessageAt?.toMillis ? data.lastMessageAt.toMillis() : null,
          pinnedMessageId: data.pinnedMessageId || null,
          mutedMembers: Array.isArray(data.mutedMembers) ? data.mutedMembers : [],
          kickedMembers: Array.isArray(data.kickedMembers) ? data.kickedMembers : [],
        };
      });
      onChange(rooms);
    },
    () => onChange([]),
  );
}

export function listenMyRooms(uid: string, onChange: (rooms: Room[]) => void): Unsubscribe {
  if (!db) {
    onChange([]);
    return () => {};
  }
  const q = query(collection(requireDb(), 'rooms'), where('members', 'array-contains', uid), limit(300));
  return onSnapshot(
    q,
    (snap) => {
      const rooms: Room[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          name: data.name || 'Room',
          description: data.description || '',
          tags: Array.isArray(data.tags) ? data.tags : [],
          isPublic: data.isPublic !== false,
          inviteCode: data.inviteCode || undefined,
          members: Array.isArray(data.members) ? data.members : [],
          createdBy: data.createdBy || '',
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
          lastMessage: data.lastMessage ?? null,
          lastMessageAt: data.lastMessageAt?.toMillis ? data.lastMessageAt.toMillis() : null,
          pinnedMessageId: data.pinnedMessageId || null,
          mutedMembers: Array.isArray(data.mutedMembers) ? data.mutedMembers : [],
          kickedMembers: Array.isArray(data.kickedMembers) ? data.kickedMembers : [],
        };
      });

      rooms.sort((a, b) => (b.lastMessageAt || b.createdAt) - (a.lastMessageAt || a.createdAt));
      onChange(rooms);
    },
    () => onChange([]),
  );
}

export async function getRoom(roomId: string): Promise<Room | null> {
  if (!db) return null;
  const ref = doc(requireDb(), 'rooms', roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as any;
  return {
    id: snap.id,
    name: data.name || 'Room',
    description: data.description || '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    isPublic: data.isPublic !== false,
    inviteCode: data.inviteCode || undefined,
    members: Array.isArray(data.members) ? data.members : [],
    createdBy: data.createdBy || '',
    createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
    lastMessage: data.lastMessage ?? null,
    lastMessageAt: data.lastMessageAt?.toMillis ? data.lastMessageAt.toMillis() : null,
    pinnedMessageId: data.pinnedMessageId || null,
    mutedMembers: Array.isArray(data.mutedMembers) ? data.mutedMembers : [],
    kickedMembers: Array.isArray(data.kickedMembers) ? data.kickedMembers : [],
  };
}

export function listenRoom(roomId: string, onChange: (room: Room | null) => void): Unsubscribe {
  if (!db) {
    onChange(null);
    return () => {};
  }
  const ref = doc(requireDb(), 'rooms', roomId);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }

      const data = snap.data() as any;
      onChange({
        id: snap.id,
        name: data.name || 'Room',
        description: data.description || '',
        tags: Array.isArray(data.tags) ? data.tags : [],
        isPublic: data.isPublic !== false,
        inviteCode: data.inviteCode || undefined,
        members: Array.isArray(data.members) ? data.members : [],
        createdBy: data.createdBy || '',
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
        lastMessage: data.lastMessage ?? null,
        lastMessageAt: data.lastMessageAt?.toMillis ? data.lastMessageAt.toMillis() : null,
        pinnedMessageId: data.pinnedMessageId || null,
        mutedMembers: Array.isArray(data.mutedMembers) ? data.mutedMembers : [],
        kickedMembers: Array.isArray(data.kickedMembers) ? data.kickedMembers : [],
      });
    },
    () => onChange(null),
  );
}

export async function createRoom(input: {
  name: string;
  description: string;
  tags: string[];
  isPublic: boolean;
  inviteCode?: string;
  memberIds: string[];
}): Promise<string> {
  if (!db) return '';
  const uid = requireUid();
  const roomRef = doc(collection(requireDb(), 'rooms'));
  const members = Array.from(new Set([uid, ...input.memberIds]));

  await setDoc(roomRef, {
    name: input.name,
    description: input.description,
    tags: input.tags,
    isPublic: input.isPublic,
    inviteCode: input.inviteCode || null,
    members,
    createdBy: uid,
    createdAt: serverTimestamp(),
    lastMessage: null,
    lastMessageAt: null,
    pinnedMessageId: null,
    mutedMembers: [],
    kickedMembers: [],
  });

  return roomRef.id;
}

export async function joinRoom(roomId: string, uid: string): Promise<void> {
  if (!db) return;
  const roomRef = doc(requireDb(), 'rooms', roomId);
  await updateDoc(roomRef, {
    members: arrayUnion(uid),
    updatedAt: serverTimestamp(),
  });
}

export async function leaveRoom(roomId: string, uid: string): Promise<void> {
  if (!db) return;
  const roomRef = doc(requireDb(), 'rooms', roomId);
  await updateDoc(roomRef, {
    members: arrayRemove(uid),
    updatedAt: serverTimestamp(),
  });
}

export async function updateRoomMeta(roomId: string, updates: Record<string, any>): Promise<void> {
  if (!db) return;
  const roomRef = doc(requireDb(), 'rooms', roomId);
  await updateDoc(roomRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export function listenRoomMessages(roomId: string, onChange: (messages: ChatMessage[]) => void): Unsubscribe {
  if (!db) {
    onChange([]);
    return () => {};
  }
  const q = query(collection(requireDb(), 'rooms', roomId, 'messages'), orderBy('timestamp', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const messages: ChatMessage[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          text: data.text,
          senderId: data.senderId,
          timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : Date.now(),
          isRead: !!data.isRead,
          messageType: data.messageType || 'text',
          reactions: data.reactions || {},
        };
      });
      onChange(messages);
    },
    () => onChange([]),
  );
}

export async function sendRoomMessage(params: {
  roomId: string;
  senderId: string;
  text: string;
}): Promise<void> {
  if (!db) return;
  const { roomId, senderId, text } = params;
  await addDoc(collection(requireDb(), 'rooms', roomId, 'messages'), {
    senderId,
    text,
    isRead: false,
    messageType: 'text',
    reactions: {},
    timestamp: serverTimestamp(),
  });

  await updateDoc(doc(db, 'rooms', roomId), {
    lastMessage: text,
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function listenReports(onChange: (reports: Report[]) => void): Unsubscribe {
  if (!db) {
    onChange([]);
    return () => {};
  }
  const q = query(collection(requireDb(), 'reports'), orderBy('createdAt', 'desc'), limit(300));
  return onSnapshot(
    q,
    (snap) => {
      const reports: Report[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          type: data.type || 'bug',
          targetId: data.targetId || undefined,
          targetName: data.targetName || undefined,
          reason: data.reason || undefined,
          details: data.details || undefined,
          reporterId: data.reporterId || '',
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
          status: data.status === 'resolved' ? 'resolved' : 'open',
        };
      });
      onChange(reports);
    },
    () => onChange([]),
  );
}

export async function createReport(input: {
  type: Report['type'];
  targetId?: string;
  targetName?: string;
  reason?: string;
  details?: string;
}): Promise<void> {
  if (isDemoMode() || !db) {
    storage.addReport({
      id: `report_${Date.now()}`,
      ...input,
      reporterId: getCurrentUid() || 'anonymous',
      status: 'open',
      createdAt: Date.now(),
    });
    return;
  }
  const uid = getCurrentUid() || 'anonymous';
  await addDoc(collection(requireDb(), 'reports'), {
    type: input.type,
    targetId: input.targetId || null,
    targetName: input.targetName || null,
    reason: input.reason || null,
    details: input.details || null,
    reporterId: uid,
    status: 'open',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function resolveReport(reportId: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(requireDb(), 'reports', reportId), {
    status: 'resolved',
    updatedAt: serverTimestamp(),
  });
}

export async function clearAllReports(): Promise<void> {
  if (!db) return;
  const snap = await getDocs(collection(requireDb(), 'reports'));
  const batch = writeBatch(requireDb());
  snap.docs.forEach((d) => {
    batch.delete(doc(requireDb(), 'reports', d.id));
  });
  await batch.commit();
}

export function listenNotifications(uid: string, onChange: (notifications: Notification[]) => void): Unsubscribe {
  if (!db) {
    onChange([]);
    return () => {};
  }
  const q = query(collection(requireDb(), 'users', uid, 'notifications'), orderBy('timestamp', 'desc'), limit(300));
  return onSnapshot(
    q,
    (snap) => {
      const notifications: Notification[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          type: data.type || 'message',
          title: data.title || '',
          body: data.body || '',
          timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : Date.now(),
          read: !!data.read,
          profileId: data.profileId || undefined,
          eventId: data.eventId || undefined,
          postId: data.postId || undefined,
          actionUrl: data.actionUrl || undefined,
        };
      });
      onChange(notifications);
    },
    () => onChange([]),
  );
}

export async function addNotification(input: {
  uid: string;
  type: Notification['type'];
  title: string;
  body: string;
  profileId?: string;
  eventId?: string;
  postId?: string;
  actionUrl?: string;
}): Promise<void> {
  if (!db) return;
  await addDoc(collection(requireDb(), 'users', input.uid, 'notifications'), {
    type: input.type,
    title: input.title,
    body: input.body,
    read: false,
    profileId: input.profileId || null,
    eventId: input.eventId || null,
    postId: input.postId || null,
    actionUrl: input.actionUrl || null,
    timestamp: serverTimestamp(),
  });
}

export async function markNotificationRead(uid: string, notificationId: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(requireDb(), 'users', uid, 'notifications', notificationId), {
    read: true,
    updatedAt: serverTimestamp(),
  });
}

export async function seedCommunitiesIfEmpty(): Promise<{ seeded: boolean; count: number }> {
  if (isDemoMode() || !db) return { seeded: false, count: 0 };
  const existing = await getDocs(query(collection(requireDb(), 'communities'), limit(1)));
  if (!existing.empty) return { seeded: false, count: 0 };
  const batch = writeBatch(requireDb());
  for (let i = 0; i < SEED_COMMUNITIES.length; i++) {
    const c = SEED_COMMUNITIES[i];
    const ref = doc(requireDb(), 'communities', `seed_${i + 1}`);
    batch.set(ref, {
      name: c.name,
      description: c.description,
      photo: c.photo,
      isExclusive: c.isExclusive,
      tags: c.tags,
      nsfw: c.nsfw,
      members: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
  return { seeded: true, count: SEED_COMMUNITIES.length };
}

export function listenCommunities(onChange: (communities: Community[]) => void): Unsubscribe {
  if (isDemoMode() || !db) {
    onChange(SEED_COMMUNITIES.map((c, i) => ({ ...c, id: `seed_${i + 1}`, memberCount: 0 })));
    return () => {};
  }
  const q = query(collection(requireDb(), 'communities'), orderBy('createdAt', 'asc'), limit(100));
  return onSnapshot(
    q,
    (snap) => {
      const communities: Community[] = snap.docs.map((d) => {
        const data = d.data() as any;
        const members = Array.isArray(data.members) ? data.members : [];
        return {
          id: d.id,
          name: data.name || 'Community',
          description: data.description || '',
          photo: data.photo || '',
          memberCount: members.length,
          isExclusive: !!data.isExclusive,
          tags: Array.isArray(data.tags) ? data.tags : [],
          nsfw: !!data.nsfw,
        };
      });
      onChange(communities);
    },
    () => onChange([]),
  );
}

export async function joinCommunity(communityId: string, uid: string): Promise<void> {
  if (isDemoMode() || !db) return;
  const ref = doc(requireDb(), 'communities', communityId);
  await updateDoc(ref, { members: arrayUnion(uid), updatedAt: serverTimestamp() });
}

export async function leaveCommunity(communityId: string, uid: string): Promise<void> {
  if (isDemoMode() || !db) return;
  const ref = doc(requireDb(), 'communities', communityId);
  await updateDoc(ref, { members: arrayRemove(uid), updatedAt: serverTimestamp() });
}

export function listenMyCommunityIds(uid: string, onChange: (ids: string[]) => void): Unsubscribe {
  if (isDemoMode() || !db) {
    onChange([]);
    return () => {};
  }
  const q = query(collection(requireDb(), 'communities'), where('members', 'array-contains', uid), limit(100));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => d.id)),
    () => onChange([]),
  );
}

export async function markAllNotificationsRead(uid: string): Promise<void> {
  if (!db) return;
  const snap = await getDocs(collection(requireDb(), 'users', uid, 'notifications'));
  const batch = writeBatch(requireDb());
  snap.docs.forEach((d) => {
    const data = d.data() as any;
    if (!data.read) {
      batch.update(doc(requireDb(), 'users', uid, 'notifications', d.id), {
        read: true,
        updatedAt: serverTimestamp(),
      });
    }
  });
  await batch.commit();
}

// Profile views (Who Viewed You)
export async function recordProfileView(viewedProfileId: string): Promise<void> {
  if (isDemoMode() || !db) return;
  const viewerId = requireUid();
  if (viewerId === viewedProfileId) return;

  const viewerProfile = await getProfile(viewerId);
  const currentUser = getCurrentUser();
  const id = `${viewerId}_${viewedProfileId}_${Date.now()}`;
  await setDoc(doc(requireDb(), 'profileViews', id), {
    viewerId,
    viewerName: viewerProfile?.name || currentUser?.displayName || 'Someone',
    viewerPhoto: viewerProfile?.photo || viewerProfile?.photos?.[0] || currentUser?.photoURL || '',
    profileId: viewedProfileId,
    viewedAt: serverTimestamp(),
  }, { merge: true });
}

export function listenProfileViewers(
  profileId: string,
  onChange: (viewers: { profileId: string; profileName: string; profilePhoto: string; viewedAt: number }[]) => void,
): Unsubscribe {
  if (isDemoMode() || !db) {
    onChange([]);
    return () => {};
  }

  const q = query(
    collection(requireDb(), 'profileViews'),
    where('profileId', '==', profileId),
    orderBy('viewedAt', 'desc'),
    limit(50),
  );

  return onSnapshot(
    q,
    (snap) => {
      const viewers = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          profileId: data.viewerId,
          profileName: data.viewerName || 'Unknown',
          profilePhoto: data.viewerPhoto || '',
          viewedAt: data.viewedAt?.toMillis?.() ?? Date.now(),
        };
      });
      onChange(viewers);
    },
    () => onChange([]),
  );
}

export async function verifyProfile(profileId: string, verified: boolean): Promise<void> {
  if (!db || isDemoMode()) return;
  await updateDoc(doc(requireDb(), 'users', profileId), { verified });
}
