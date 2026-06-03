// Vibe types for nightlife-driven matching
export type VibeType = 'Party' | 'Chill' | 'Romantic' | 'Wild' | 'Travel';
export type TonightLookingFor = 'Hookup' | 'Date' | 'Going Out' | 'Friends' | 'Clubbing';
export type BodyType = 'Slim' | 'Athletic' | 'Average' | 'Muscular' | 'Bear' | 'Dad bod' | 'Prefer not to say';
export type Role = 'Top' | 'Bottom' | 'Versatile' | 'Side' | 'Prefer not to say';
export type Tribe = 'Bear' | 'Otter' | 'Jock' | 'Twink' | 'Daddy' | 'Trans' | 'Leather' | 'Punk' | 'Geek' | 'Gym' | 'Muscle' | 'Chub' | 'Skinny' | 'Drag' | 'Queer' | 'Bi';
export type RelationshipStatus = 'Single' | 'Dating' | 'Open relationship' | 'Married' | 'Polyamorous' | 'Prefer not to say';
export type HivStatus = 'Negative' | 'Positive' | 'Undetectable' | 'On PrEP' | 'Prefer not to say';

export interface Profile {
  id: string;
  name: string;
  age: number;
  distance: number;
  photo: string;
  photos?: string[];
  tags: string[];
  bio?: string;
  lat?: number;
  lng?: number;
  sexualOrientation?: string;
  lookingFor?: string[];
  into?: string[];
  hookUpNow?: boolean;
  pronouns?: string;
  genderIdentity?: string;
  kinks?: string[];
  intent?: string;
  vibeStyle?: string;
  verified?: boolean;
  photoBlurEnabled?: boolean;
  anonymous?: boolean;
  safeMode?: boolean;
  // Nightlife / Scruff-style depth
  vibeType?: VibeType;
  tonightLookingFor?: TonightLookingFor;
  height?: string;
  bodyType?: BodyType;
  role?: Role;
  instagram?: string;
  lastActive?: number;
  online?: boolean;
  goingOutTonight?: boolean;
  visibleOnMap?: boolean;
  ghostMode?: boolean;
  tribe?: Tribe;
  relationshipStatus?: RelationshipStatus;
  hivStatus?: HivStatus;
  video?: string;
  albums?: { name: string; photos: string[] }[];
  boostExpiresAt?: number;
  prompts?: { question: string; answer: string }[];
}

export interface Match {
  id: string;
  profile: Profile;
  matchedAt: number;
}

export interface Message {
  id: string;
  profileId: string;
  profileName: string;
  profilePhoto: string;
  lastMessage: string;
  timestamp: number;
  unread: number;
  isGroup?: boolean;
  groupName?: string;
}

export interface ChatMessage {
  id: string;
  text?: string;
  imageUrl?: string;
  gifUrl?: string;
  voiceNoteUrl?: string;
  senderId: string;
  timestamp: number;
  isRead: boolean;
  reactions?: { [key: string]: string[] };
  messageType: 'text' | 'image' | 'voice' | 'gif';
}

export interface LinkUpRequest {
  id: string;
  profileId: string;
  createdBy: string;
  intent: string;
  place: string;
  time: number;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'canceled';
  createdAt: number;
  expiresAt: number;
}

export interface ChatThread {
  profileId: string;
  profileName: string;
  profilePhoto: string;
  messages: ChatMessage[];
  lastActivity: number;
  isGroup?: boolean;
  groupMembers?: string[];
  typingUsers?: string[];
}

export interface Location {
  id: string;
  name: string;
  type: 'hotel' | 'bar' | 'party' | 'restaurant' | 'event' | 'venue';
  address: string;
  distance: number;
  photo: string;
  rating?: number;
  description?: string;
  lat?: number;
  lng?: number;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  organizerId: string;
  organizerName: string;
  organizerPhoto: string;
  date: number;
  endDate?: number;
  location: string;
  city?: string;
  lat?: number;
  lng?: number;
  isPublic: boolean;
  rsvps: {
    going: string[];
    interested: string[];
    notGoing: string[];
  };
  tags: string[];
  photo?: string;
  maxAttendees?: number;
  nsfw?: boolean;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  image?: string;
  video?: string;
  timestamp: number;
  likes: string[]; // User IDs
  comments: Comment[];
  shares: number;
  bookmarks: string[]; // User IDs
  nsfw: boolean;
  tags: string[];
  type: 'text' | 'image' | 'video' | 'story';
  storyExpiresAt?: number; // For stories
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  text: string;
  timestamp: number;
  likes: string[];
}

export interface Notification {
  id: string;
  type: 'message' | 'match' | 'like' | 'event' | 'rsvp' | 'comment' | 'mention';
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  profileId?: string;
  eventId?: string;
  postId?: string;
  actionUrl?: string;
}

export interface Report {
  id: string;
  type: 'profile' | 'content' | 'room' | 'event' | 'bug';
  targetId?: string;
  targetName?: string;
  reason?: string;
  details?: string;
  reporterId: string;
  createdAt: number;
  status: 'open' | 'resolved';
}

export interface UserProfile {
  name: string;
  age: string;
  bio: string;
  interests: string[];
  photos: string[];
  sexualOrientation?: string;
  lookingFor?: string[];
  into?: string[];
  hookUpNow?: boolean;
  pronouns?: string;
  genderIdentity?: string;
  kinks?: string[];
  intent?: string;
  vibeStyle?: string;
  verified?: boolean;
  photoBlurEnabled?: boolean;
  anonymous?: boolean;
  safeMode?: boolean;
  vibeType?: VibeType;
  tonightLookingFor?: TonightLookingFor;
  height?: string;
  bodyType?: BodyType;
  role?: Role;
  instagram?: string;
  goingOutTonight?: boolean;
  visibleOnMap?: boolean;
  ghostMode?: boolean;
  tribe?: Tribe;
  relationshipStatus?: RelationshipStatus;
  hivStatus?: HivStatus;
  video?: string;
  albums?: { name: string; photos: string[] }[];
  boostExpiresAt?: number;
  prompts?: { question: string; answer: string }[];
  currentCity?: string;
  isProfileHidden?: boolean;
  nsfwEnabled?: boolean;
  photoRulesAccepted?: boolean;
  allowBlurredBody?: boolean;
  notificationPreferences?: {
    messages: boolean;
    matches: boolean;
    likes: boolean;
    events: boolean;
    comments: boolean;
  };
}

export interface PremiumFeatures {
  hasBoost: boolean;
  hasSuperLike: boolean;
  hasUndo: boolean;
  hasPremium: boolean;
  hasPremier?: boolean;
  hasElite?: boolean;
  boostsRemaining: number;
  superLikesRemaining: number;
  undosRemaining: number;
  canSeeViewers?: boolean;
  canJoinExclusiveCommunities?: boolean;
  verifiedBadge?: boolean;
}

export interface Viewer {
  profileId: string;
  profileName: string;
  profilePhoto: string;
  viewedAt: number;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  photo: string;
  memberCount: number;
  isExclusive: boolean;
  tags: string[];
  nsfw: boolean;
}
