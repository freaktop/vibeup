import type { Profile } from '../types';

const DEFAULT_PHOTO = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop';

/** Ensures profile has safe defaults - prevents crashes from incomplete Firestore data */
export function normalizeProfile(p: Partial<Profile> | null | undefined): Profile {
  if (!p || !p.id) {
    return {
      id: '',
      name: 'User',
      age: 18,
      distance: 0,
      photo: DEFAULT_PHOTO,
      photos: [DEFAULT_PHOTO],
      tags: [],
    };
  }
  const photos = Array.isArray(p.photos) ? p.photos.filter(Boolean) : [];
  const photo = p.photo || photos[0] || DEFAULT_PHOTO;
  return {
    id: String(p.id),
    name: String(p.name ?? 'User'),
    age: typeof p.age === 'number' ? p.age : parseInt(String(p.age), 10) || 18,
    distance: typeof p.distance === 'number' ? p.distance : 0,
    photo: String(photo || DEFAULT_PHOTO),
    photos: photos.length > 0 ? photos : [photo || DEFAULT_PHOTO],
    tags: Array.isArray(p.tags) ? p.tags : [],
    bio: p.bio,
    lat: p.lat,
    lng: p.lng,
    sexualOrientation: p.sexualOrientation,
    lookingFor: Array.isArray(p.lookingFor) ? p.lookingFor : [],
    into: Array.isArray(p.into) ? p.into : [],
    hookUpNow: !!p.hookUpNow,
    pronouns: p.pronouns,
    genderIdentity: p.genderIdentity,
    kinks: Array.isArray(p.kinks) ? p.kinks : [],
    intent: p.intent,
    vibeStyle: p.vibeStyle,
    verified: !!p.verified,
    photoBlurEnabled: !!p.photoBlurEnabled,
    anonymous: !!p.anonymous,
    safeMode: !!p.safeMode,
    vibeType: p.vibeType,
    tonightLookingFor: p.tonightLookingFor,
    height: p.height,
    bodyType: p.bodyType,
    role: p.role,
    instagram: p.instagram,
    lastActive: p.lastActive,
    online: !!p.online,
    goingOutTonight: !!p.goingOutTonight,
    visibleOnMap: !!p.visibleOnMap,
    ghostMode: !!p.ghostMode,
    tribe: p.tribe,
    relationshipStatus: p.relationshipStatus,
    hivStatus: p.hivStatus,
    video: p.video,
    albums: p.albums ? p.albums.map(a => ({ name: a.name, photos: [...a.photos] })) : undefined,
    prompts: p.prompts ? p.prompts.map(pr => ({ question: pr.question, answer: pr.answer })) : undefined,
    boostExpiresAt: p.boostExpiresAt,
  };
}
