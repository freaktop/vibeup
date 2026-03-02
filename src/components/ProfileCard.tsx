import React, { useState, useRef, useEffect } from 'react';
import { Profile } from '../types';
import './ProfileCard.css';

interface ProfileCardProps {
  profile: Profile;
  onLike: () => void;
  onPass: () => void;
  onSuperLike?: () => void;
  onMessage: () => void;
  onSave: () => void;
  onReport: () => void;
  onMenu?: () => void;
  isLiked?: boolean;
  isSaved?: boolean;
  isSuperLiked?: boolean;
  canSuperLike?: boolean;
  showInfo?: boolean;
  onSwipeUp?: () => void;
  showFirstSwipeHint?: boolean;
}

export default function ProfileCard({
  profile,
  onLike,
  onPass,
  onSuperLike,
  onMessage,
  onSave,
  onReport,
  onMenu,
  isLiked = false,
  isSaved = false,
  isSuperLiked = false,
  canSuperLike = false,
  showInfo = false,
  onSwipeUp,
  showFirstSwipeHint = false,
}: ProfileCardProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [swipeUpOffset, setSwipeUpOffset] = useState(0);
  const [showDetails, setShowDetails] = useState(showInfo);
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);

  const photos = profile.photos || [profile.photo];
  const currentPhoto = photos[currentPhotoIndex];

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaX = e.touches[0].clientX - startX.current;
    const deltaY = e.touches[0].clientY - startY.current;
    
    // Vertical swipe for details (swipe up)
    if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY < 0) {
      setSwipeUpOffset(Math.abs(deltaY));
      setSwipeOffset(0); // Reset horizontal swipe
      return;
    }
    
    // Horizontal swipe for like/pass
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setSwipeOffset(deltaX);
      setSwipeUpOffset(0); // Reset vertical swipe
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const horizontalThreshold = 100;
    const verticalThreshold = 50; // Lower threshold for swipe up
    
    // Check vertical swipe first (more lenient)
    if (swipeUpOffset > verticalThreshold && onSwipeUp) {
      setShowDetails(true);
      setSwipeUpOffset(0);
      onSwipeUp();
      return;
    }
    
    // Horizontal swipe
    if (Math.abs(swipeOffset) > horizontalThreshold) {
      if (swipeOffset > 0) {
        onLike();
      } else {
        onPass();
      }
    }
    
    setSwipeOffset(0);
    setSwipeUpOffset(0);
  };

  // Mouse handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX;
    startY.current = e.clientY;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startX.current;
    const deltaY = e.clientY - startY.current;
    
    // Vertical swipe for details (swipe up)
    if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY < 0) {
      setSwipeUpOffset(Math.abs(deltaY));
      setSwipeOffset(0); // Reset horizontal swipe
      return;
    }
    
    // Horizontal swipe for like/pass
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setSwipeOffset(deltaX);
      setSwipeUpOffset(0); // Reset vertical swipe
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const horizontalThreshold = 100;
    const verticalThreshold = 50; // Lower threshold for swipe up
    
    if (swipeUpOffset > verticalThreshold && onSwipeUp) {
      setShowDetails(true);
      setSwipeUpOffset(0);
      onSwipeUp();
      return;
    }
    
    if (Math.abs(swipeOffset) > horizontalThreshold) {
      if (swipeOffset > 0) {
        onLike();
      } else {
        onPass();
      }
    }
    
    setSwipeOffset(0);
    setSwipeUpOffset(0);
  };

  // Photo navigation
  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentPhotoIndex < photos.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    }
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
    }
  };

  // Reset photo index and details when profile changes
  useEffect(() => {
    setCurrentPhotoIndex(0);
    setShowDetails(showInfo);
  }, [profile.id, showInfo]);

  const rotation = swipeOffset * 0.1;
  const opacity = 1 - Math.abs(swipeOffset) / 300;
  const detailsOffset = showDetails ? 0 : -swipeUpOffset;

  return (
    <div
      ref={cardRef}
      className="profile-card"
      style={{
        transform: `translateX(${swipeOffset}px) translateY(${detailsOffset}px) rotate(${rotation}deg)`,
        opacity: Math.max(opacity, 0.5),
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="profile-image-container">
        <img src={currentPhoto} alt={profile.name} className="profile-image" />
        
        {photos.length > 1 && (
          <>
            <div className="photo-nav-bottom">
              {currentPhotoIndex > 0 && (
                <button className="photo-nav-btn photo-nav-left" onClick={prevPhoto}>
                  ‹
                </button>
              )}
              {currentPhotoIndex < photos.length - 1 && (
                <button className="photo-nav-btn photo-nav-right" onClick={nextPhoto}>
                  ›
                </button>
              )}
            </div>
            <div className="photo-indicators">
              {photos.map((_, index) => (
                <span
                  key={index}
                  className={`photo-dot ${index === currentPhotoIndex ? 'active' : ''}`}
                />
              ))}
            </div>
          </>
        )}

        <div className="profile-overlay">
          <div className="profile-info">
            <div className="profile-name-row">
              <span className="profile-name">{profile.name}</span>
              <span className="profile-age">{profile.age}</span>
              {profile.hookUpNow && (
                <span className="hookup-now-badge">🔥 Vibezz</span>
              )}
              {profile.verified && (
                <span className="verified-badge-small">✓ Verified</span>
              )}
            </div>
            <div className="profile-distance">{profile.distance} miles away</div>
            {profile.sexualOrientation && (
              <div className="profile-orientation">
                {profile.sexualOrientation}
                {profile.lookingFor && profile.lookingFor.length > 0 && (
                  <span className="profile-looking-for">
                    • {profile.lookingFor.join(', ')}
                  </span>
                )}
              </div>
            )}
            {(profile.intent || profile.vibeStyle) && !showDetails && (
              <div className="profile-vibe-chips">
                {profile.intent && (
                  <span className="profile-vibe-chip">{profile.intent}</span>
                )}
                {profile.vibeStyle && (
                  <span className="profile-vibe-chip profile-vibe-chip-alt">{profile.vibeStyle}</span>
                )}
              </div>
            )}
            {!showDetails && (
              <div className="profile-tags">
                {profile.tags.slice(0, 3).map((tag, index) => (
                  <span key={index} className="profile-tag">{tag}</span>
                ))}
              </div>
            )}
          </div>

          {showDetails && (
            <div className="profile-details-panel">
              <div className="profile-bio">{profile.bio || 'No bio available'}</div>
              <div className="profile-details-section">
                <div className="profile-details-label">Looking For:</div>
                <div className="profile-details-value">
                  {profile.lookingFor && profile.lookingFor.length > 0
                    ? profile.lookingFor.join(', ')
                    : 'Not specified'}
                </div>
              </div>
              {profile.into && profile.into.length > 0 && (
                <div className="profile-details-section">
                  <div className="profile-details-label">Into:</div>
                  <div className="profile-details-value">{profile.into.join(', ')}</div>
                </div>
              )}
              <div className="profile-details-section">
                <div className="profile-details-label">Interests:</div>
                <div className="profile-tags">
                  {profile.tags.map((tag, index) => (
                    <span key={index} className="profile-tag">{tag}</span>
                  ))}
                </div>
              </div>
              {(profile.intent || profile.vibeStyle) && (
                <div className="profile-details-section">
                  <div className="profile-details-label">Vibe</div>
                  <div className="profile-details-value">
                    {[profile.intent, profile.vibeStyle].filter(Boolean).join(' • ')}
                  </div>
                </div>
              )}
            </div>
          )}

          {!showDetails && showFirstSwipeHint && (
            <div className="first-swipe-hint">Swipe to see who's actually available nearby.</div>
          )}
          {!showDetails && !showFirstSwipeHint && (
            <div className="swipe-up-hint">👆 Tap card for more info</div>
          )}
        </div>
      </div>

      <div className="profile-actions">
        <button
          className="profile-action-btn profile-action-pass"
          onClick={(e) => {
            e.stopPropagation();
            onPass();
          }}
          title="Pass"
        >
          ✕
        </button>

        {onSuperLike && canSuperLike && (
          <button
            className={`profile-action-btn profile-action-super ${isSuperLiked ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onSuperLike();
            }}
            title="Super Like"
          >
            ⭐
          </button>
        )}

        <button
          className={`profile-action-btn ${isLiked ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onLike();
          }}
          title="Like"
        >
          {isLiked ? '❤️' : '🤍'}
        </button>

        <button
          className="profile-action-btn profile-action-message"
          onClick={(e) => {
            e.stopPropagation();
            onMessage();
          }}
          title="Message"
        >
          💬
        </button>

        {onMenu && (
          <button
            className="profile-action-btn profile-action-menu"
            onClick={(e) => {
              e.stopPropagation();
              onMenu();
            }}
            title="More"
          >
            ⋯
          </button>
        )}
      </div>
    </div>
  );
}
