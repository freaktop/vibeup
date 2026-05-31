import { useState } from 'react';
import { Profile } from '../types';
import SafeImage from './SafeImage';
import './ProfileDetailModal.css';

interface ProfileDetailModalProps {
  profile: Profile;
  onClose: () => void;
  onLike?: () => void;
  onMessage?: () => void;
  onFollow?: () => void;
  onUnfollow?: () => void;
  isLiked?: boolean;
  isFollowing?: boolean;
  isOwnProfile?: boolean;
}

const DEFAULT_PHOTO = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop';

export default function ProfileDetailModal({ 
  profile, 
  onClose, 
  onLike, 
  onMessage,
  onFollow,
  onUnfollow,
  isLiked,
  isFollowing,
  isOwnProfile,
}: ProfileDetailModalProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const photos = (profile?.photos?.length ? profile.photos : [profile?.photo].filter(Boolean)) as string[];
  const safePhotos = photos.length > 0 ? photos : [DEFAULT_PHOTO];
  const displayName = profile?.name ?? 'User';
  const displayAge = profile?.age ?? '';

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % safePhotos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + safePhotos.length) % safePhotos.length);
  };

  if (!profile) return null;

  return (
    <div className="profile-detail-modal-overlay" onClick={onClose}>
      <div className="profile-detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="profile-detail-close" onClick={onClose}>✕</button>
        
        <div className="profile-detail-photos">
          <SafeImage 
            src={safePhotos[currentPhotoIndex] || DEFAULT_PHOTO} 
            alt={displayName}
            className="profile-detail-main-photo"
            loading="eager"
          />
          {safePhotos.length > 1 && (
            <>
              <button className="profile-detail-nav profile-detail-nav-left" onClick={prevPhoto}>
                ←
              </button>
              <button className="profile-detail-nav profile-detail-nav-right" onClick={nextPhoto}>
                →
              </button>
              <div className="profile-detail-photo-indicator">
                {currentPhotoIndex + 1} / {safePhotos.length}
              </div>
            </>
          )}
        </div>

        <div className="profile-detail-content">
          <div className="profile-detail-header">
            <h2>{displayName}{displayAge ? `, ${displayAge}` : ''}</h2>
            {profile.distance !== undefined && (
              <div className="profile-detail-distance">{profile.distance} mi away</div>
            )}
          {profile.verified && (
            <div className="profile-detail-verified">✓ Verified</div>
          )}
            {profile.hookUpNow && (
              <div className="profile-detail-badge">🔥 Available Now</div>
            )}
          </div>

          {profile.bio && (
            <div className="profile-detail-section">
              <h3>About</h3>
              <p>{profile.bio}</p>
            </div>
          )}

          {profile.sexualOrientation && (
            <div className="profile-detail-section">
              <h3>Orientation</h3>
              <p>{profile.sexualOrientation}</p>
            </div>
          )}

          {Array.isArray(profile.lookingFor) && profile.lookingFor.length > 0 && (
            <div className="profile-detail-section">
              <h3>Looking For</h3>
              <div className="profile-detail-tags">
                {profile.lookingFor.map((item, index) => (
                  <span key={index} className="profile-detail-tag">{item}</span>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(profile.into) && profile.into.length > 0 && (
            <div className="profile-detail-section">
              <h3>Into</h3>
              <div className="profile-detail-tags">
                {profile.into.map((item, index) => (
                  <span key={index} className="profile-detail-tag">{item}</span>
                ))}
              </div>
            </div>
          )}

          {(profile.intent || profile.vibeStyle) && (
            <div className="profile-detail-section">
              <h3>Vibe</h3>
              <div className="profile-detail-tags">
                {profile.intent && (
                  <span className="profile-detail-tag profile-detail-vibe">{profile.intent}</span>
                )}
                {profile.vibeStyle && (
                  <span className="profile-detail-tag profile-detail-vibe-alt">{profile.vibeStyle}</span>
                )}
              </div>
            </div>
          )}

          {Array.isArray(profile.tags) && profile.tags.length > 0 && (
            <div className="profile-detail-section">
              <h3>Interests</h3>
              <div className="profile-detail-tags">
                {profile.tags.map((tag, index) => (
                  <span key={index} className="profile-detail-tag">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(profile.kinks) && profile.kinks.length > 0 && (
            <div className="profile-detail-section">
              <h3>Kinks / Preferences</h3>
              <div className="profile-detail-tags">
                {profile.kinks.map((kink, index) => (
                  <span key={index} className="profile-detail-tag profile-detail-kink">{kink}</span>
                ))}
              </div>
            </div>
          )}

          <div className="profile-detail-actions">
            {!isOwnProfile && onFollow && onUnfollow && (
              <button 
                className={`profile-detail-action-btn follow-btn ${isFollowing ? 'following' : ''}`}
                onClick={isFollowing ? onUnfollow : onFollow}
              >
                {isFollowing ? '✓ Following' : '+ Follow'}
              </button>
            )}
            {onLike && (
              <button 
                className={`profile-detail-action-btn ${isLiked ? 'liked' : ''}`}
                onClick={onLike}
              >
                {isLiked ? '❤️ Liked' : '❤️ Like'}
              </button>
            )}
            {onMessage && isLiked && (
              <button 
                className="profile-detail-action-btn message-btn"
                onClick={onMessage}
              >
                💬 Message
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
