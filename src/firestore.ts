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
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type { ChatMessage, Comment, Event, Location, Notification, Post, Profile, Report, UserProfile } from './types';
import { mockProfiles } from './data/mockProfiles';

export type SwipeType = 'like' | 'pass' | 'superlike' | 'block' | 'save';

export function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('Not authenticated');
  }
  return uid;
}

export function matchIdFor(a: string, b: string): string {
  return [a, b].sort().join('_');
}

export async function upsertMyProfile(userProfile: UserProfile | null | undefined): Promise<void> {
  const uid = requireUid();

  const displayName = auth.currentUser?.displayName || userProfile?.name || 'New User';
  const photo = auth.currentUser?.photoURL || userProfile?.photos?.[0] || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop';

  const age = (() => {
    const n = Number.parseInt(userProfile?.age || '', 10);
    return Number.isFinite(n) ? n : 18;
  })();

  const tags = userProfile?.interests || [];

  await setDoc(
    doc(db, 'profiles', uid),
    {
      name: displayName,
      age,
      distance: 0,
      photo,
      photos: userProfile?.photos || (auth.currentUser?.photoURL ? [auth.currentUser.photoURL] : []),
      tags,
      bio: userProfile?.bio || '',
      sexualOrientation: userProfile?.sexualOrientation || null,
      lookingFor: userProfile?.lookingFor || [],
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
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function seedMockProfilesIfEmpty(): Promise<{ seeded: boolean; count: number }> {
  // Only seed when authenticated so rules can be `request.auth != null`
  requireUid();

  const existing = await getDocs(query(collection(db, 'profiles'), limit(1)));
  if (!existing.empty) {
    return { seeded: false, count: 0 };
  }

  const batch = writeBatch(db);
  for (const p of mockProfiles) {
    const id = `seed_${p.id}`;
    const ref = doc(db, 'profiles', id);
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
  const uid = auth.currentUser?.uid;
  const q = query(collection(db, 'profiles'), limit(200));
  return onSnapshot(
    q,
    (snap) => {
      const profiles = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Profile, 'id'>) }))
        .filter((p) => (uid ? p.id !== uid : true));
      onChange(profiles);
    },
    () => {
      // caller can still show an empty state; this prevents silent hangs
      onChange([]);
    },
  );
}

export async function getProfile(profileId: string): Promise<Profile | null> {
  const ref = doc(db, 'profiles', profileId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Profile, 'id'>) };
}

export function listenMySwipes(
  uid: string,
  onChange: (swipes: Record<string, SwipeType>) => void,
): Unsubscribe {
  const q = query(collection(db, 'users', uid, 'swipes'));
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

export async function setSwipe(uid: string, targetId: string, type: SwipeType): Promise<{ matchCreated: boolean }> {
  const ref = doc(db, 'users', uid, 'swipes', targetId);
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
    return { matchCreated };
  }

  return { matchCreated: false };
}

export async function removeSwipe(uid: string, targetId: string): Promise<void> {
  const ref = doc(db, 'users', uid, 'swipes', targetId);
  await deleteDoc(ref);
}

export async function ensureMatchIfMutual(uid: string, targetId: string): Promise<boolean> {
  const theirSwipeRef = doc(db, 'users', targetId, 'swipes', uid);
  const theirSwipeSnap = await getDoc(theirSwipeRef);
  if (!theirSwipeSnap.exists()) return false;

  const theirType = (theirSwipeSnap.data() as any)?.type as SwipeType | undefined;
  if (theirType !== 'like' && theirType !== 'superlike') return false;

  const matchId = matchIdFor(uid, targetId);
  const matchRef = doc(db, 'matches', matchId);
  const matchSnap = await getDoc(matchRef);
  if (matchSnap.exists()) return false;

  await setDoc(matchRef, {
    users: [uid, targetId],
    createdAt: serverTimestamp(),
    lastMessage: null,
    lastMessageAt: null,
  });

  return true;
}

export function listenMatches(
  uid: string,
  onChange: (matches: { id: string; users: string[]; lastMessage: string | null; lastMessageAt: number | null }[]) => void,
): Unsubscribe {
  const q = query(collection(db, 'matches'), where('users', 'array-contains', uid));
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
  const q = query(
    collectionGroup(db, 'swipes'),
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
  const q = query(collection(db, 'matches', matchId, 'messages'), orderBy('timestamp', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const messages: ChatMessage[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          text: data.text,
          imageUrl: data.imageUrl,
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
  voiceNoteUrl?: string;
  messageType: 'text' | 'image' | 'voice';
}): Promise<void> {
  const { matchId, senderId, text, imageUrl, voiceNoteUrl, messageType } = params;

  const msgRef = collection(db, 'matches', matchId, 'messages');
  await addDoc(msgRef, {
    senderId,
    text: text ?? null,
    imageUrl: imageUrl ?? null,
    voiceNoteUrl: voiceNoteUrl ?? null,
    messageType,
    isRead: false,
    reactions: {},
    timestamp: serverTimestamp(),
  });

  const matchRef = doc(db, 'matches', matchId);
  await updateDoc(matchRef, {
    lastMessage: text ?? (messageType === 'image' ? 'Image' : messageType === 'voice' ? 'Voice note' : ''),
    lastMessageAt: serverTimestamp(),
  });
}

export async function listMySwipes(uid: string): Promise<Record<string, SwipeType>> {
  const snap = await getDocs(collection(db, 'users', uid, 'swipes'));
  const swipes: Record<string, SwipeType> = {};
  for (const d of snap.docs) {
    const data = d.data() as any;
    if (data?.type) swipes[d.id] = data.type;
  }
  return swipes;
}

export function listenWallPosts(onChange: (posts: Post[]) => void): Unsubscribe {
  const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'), limit(200));

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
  const uid = requireUid();
  const profile = await getProfile(uid);

  await addDoc(collection(db, 'posts'), {
    authorId: uid,
    authorName: profile?.name || auth.currentUser?.displayName || 'You',
    authorPhoto:
      profile?.photo ||
      profile?.photos?.[0] ||
      auth.currentUser?.photoURL ||
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop',
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
  const ref = doc(db, 'posts', postId);
  await updateDoc(ref, {
    likes: isLiked ? arrayRemove(userId) : arrayUnion(userId),
    updatedAt: serverTimestamp(),
  });
}

export async function addWallPostComment(postId: string, comment: Comment): Promise<void> {
  const ref = doc(db, 'posts', postId);
  await updateDoc(ref, {
    comments: arrayUnion(comment),
    updatedAt: serverTimestamp(),
  });
}

export function listenLocations(onChange: (locations: Location[]) => void): Unsubscribe {
  const q = query(collection(db, 'locations'), limit(300));
  return onSnapshot(
    q,
    (snap) => {
      const locations: Location[] = snap.docs.map((d) => {
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

export function listenEvents(onChange: (events: Event[]) => void): Unsubscribe {
  const q = query(collection(db, 'events'), orderBy('date', 'asc'), limit(300));
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
  const uid = requireUid();
  const profile = await getProfile(uid);

  await setDoc(
    doc(db, 'events', event.id),
    {
      ...event,
      organizerId: uid,
      organizerName: profile?.name || auth.currentUser?.displayName || event.organizerName,
      organizerPhoto: profile?.photo || profile?.photos?.[0] || auth.currentUser?.photoURL || event.organizerPhoto,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function setEventRsvp(eventId: string, userId: string, status: 'going' | 'interested' | 'notGoing'): Promise<void> {
  const eventRef = doc(db, 'events', eventId);
  const snap = await getDoc(eventRef);
  if (!snap.exists()) return;

  const data = snap.data() as any;
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
}

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
  const q = query(collection(db, 'rooms'), orderBy('createdAt', 'desc'), limit(300));
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
  const q = query(collection(db, 'rooms'), where('members', 'array-contains', uid), limit(300));
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
  const ref = doc(db, 'rooms', roomId);
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
  const ref = doc(db, 'rooms', roomId);
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
  const uid = requireUid();
  const roomRef = doc(collection(db, 'rooms'));
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
  const roomRef = doc(db, 'rooms', roomId);
  await updateDoc(roomRef, {
    members: arrayUnion(uid),
    updatedAt: serverTimestamp(),
  });
}

export async function leaveRoom(roomId: string, uid: string): Promise<void> {
  const roomRef = doc(db, 'rooms', roomId);
  await updateDoc(roomRef, {
    members: arrayRemove(uid),
    updatedAt: serverTimestamp(),
  });
}

export async function updateRoomMeta(roomId: string, updates: Record<string, any>): Promise<void> {
  const roomRef = doc(db, 'rooms', roomId);
  await updateDoc(roomRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export function listenRoomMessages(roomId: string, onChange: (messages: ChatMessage[]) => void): Unsubscribe {
  const q = query(collection(db, 'rooms', roomId, 'messages'), orderBy('timestamp', 'asc'));
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
  const { roomId, senderId, text } = params;
  await addDoc(collection(db, 'rooms', roomId, 'messages'), {
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
  const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(300));
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
  const uid = auth.currentUser?.uid || 'anonymous';
  await addDoc(collection(db, 'reports'), {
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
  await updateDoc(doc(db, 'reports', reportId), {
    status: 'resolved',
    updatedAt: serverTimestamp(),
  });
}

export async function clearAllReports(): Promise<void> {
  const snap = await getDocs(collection(db, 'reports'));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.delete(doc(db, 'reports', d.id));
  });
  await batch.commit();
}

export function listenNotifications(uid: string, onChange: (notifications: Notification[]) => void): Unsubscribe {
  const q = query(collection(db, 'users', uid, 'notifications'), orderBy('timestamp', 'desc'), limit(300));
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
  await addDoc(collection(db, 'users', input.uid, 'notifications'), {
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
  await updateDoc(doc(db, 'users', uid, 'notifications', notificationId), {
    read: true,
    updatedAt: serverTimestamp(),
  });
}

export async function markAllNotificationsRead(uid: string): Promise<void> {
  const snap = await getDocs(collection(db, 'users', uid, 'notifications'));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    const data = d.data() as any;
    if (!data.read) {
      batch.update(doc(db, 'users', uid, 'notifications', d.id), {
        read: true,
        updatedAt: serverTimestamp(),
      });
    }
  });
  await batch.commit();
}
