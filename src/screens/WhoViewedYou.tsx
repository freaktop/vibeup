import React, { useState, useEffect } from 'react';
import SafeImage from '../components/SafeImage';
import ErrorBoundary from '../components/ErrorBoundary';
import { usePremiumContext } from '../contexts/PremiumContext';
import { Profile, Viewer } from '../types';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { getCurrentUid } from '../auth';
import { followUser, getProfile, listenBlockedIds, listenMySwipes, listenProfileViewers, listenUserFollows, recordProfileView, setSwipe, unfollowUser, type SwipeType } from '../firestore';
import { normalizeProfile } from '../utils/normalizeProfile';
import './WhoViewedYou.css';

export default function WhoViewedYou() {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [ProfileDetailModalComponent, setProfileDetailModalComponent] = useState<React.ComponentType<{
    profile: Profile;
    onClose: () => void;
    onLike?: () => void;
    onMessage?: () => void;
    onFollow?: () => void;
    onUnfollow?: () => void;
    isLiked?: boolean;
    isFollowing?: boolean;
    isOwnProfile?: boolean;
  }> | null>(null);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [likedProfileIds, setLikedProfileIds] = useState<string[]>([]);
  const premiumFeatures = usePremiumContext();

  useEffect(() => {
    if (selectedProfile) {
      import('../components/ProfileDetailModal').then((mod) => setProfileDetailModalComponent(() => mod.default));
    } else {
      setProfileDetailModalComponent(null);
    }
  }, [selectedProfile]);

  useEffect(() => {
    const uid = getCurrentUid();
    if (!uid || !selectedProfile) return;
    const unsubSwipes = listenMySwipes(uid, (swipes: Record<string, SwipeType>) => {
      const liked = Object.entries(swipes || {}).filter(([, t]) => t === 'like' || t === 'superlike').map(([id]) => id);
      setLikedProfileIds(liked);
    });
    const unsubFollows = listenUserFollows(uid, setFollowingIds);
    return () => {
      unsubSwipes();
      unsubFollows();
    };
  }, [selectedProfile]);

  const handleViewProfile = async (viewer: Viewer) => {
    const profile = await getProfile(viewer.profileId);
    if (profile) {
      recordProfileView(viewer.profileId).catch(() => {});
      setSelectedProfile(profile);
    }
  };

  useEffect(() => {
    let unsub: (() => void) | null = null;
    let unsubBlocked: (() => void) | null = null;

    // If Firebase auth is not available, use demo mode
    if (!auth) {
      console.log('[WhoViewedYou] Firebase auth not configured, using demo mode');
      const uid = getCurrentUid();
      if (uid) {
        unsubBlocked = listenBlockedIds(uid, (ids) => setBlockedIds(new Set(ids)));
        unsub = listenProfileViewers(uid, (rows) => {
          setViewers(rows.map((r) => ({
            profileId: r.profileId,
            profileName: r.profileName,
            profilePhoto: r.profilePhoto,
            viewedAt: r.viewedAt,
          })));
        });
      }
      return () => {
        unsub?.();
        unsubBlocked?.();
      };
    }

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsub?.();
      unsubBlocked?.();

      if (!user || !premiumFeatures.hasPremium && !premiumFeatures.canSeeViewers) {
        setViewers([]);
        setBlockedIds(new Set());
        return;
      }

      const uid = getCurrentUid();
      if (!uid) {
        setViewers([]);
        setBlockedIds(new Set());
        return;
      }

      unsubBlocked = listenBlockedIds(uid, (ids) => setBlockedIds(new Set(ids)));
      unsub = listenProfileViewers(uid, (rows) => {
        setViewers(rows.map((r) => ({
          profileId: r.profileId,
          profileName: r.profileName,
          profilePhoto: r.profilePhoto,
          viewedAt: r.viewedAt,
        })));
      });
    });

    return () => {
      unsubAuth();
      unsub?.();
      unsubBlocked?.();
    };
  }, [premiumFeatures.hasPremium, premiumFeatures.canSeeViewers]);

  const filteredViewers = viewers.filter((v) => !blockedIds.has(v.profileId));

  const formatTime = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (!premiumFeatures.hasPremium && !premiumFeatures.canSeeViewers) {
    return (
      <div className="who-viewed-container">
        <div className="premium-required">
          <div className="premium-icon">👑</div>
          <h2>Premium Feature</h2>
          <p>See who viewed your profile. Premium from $9.99/mo at vibeup.gay</p>
          <button
            className="upgrade-button"
            onClick={() => window.dispatchEvent(new CustomEvent('switchTab', { detail: { tab: 'profile' } }))}
          >
            Upgrade Now
          </button>
        </div>
      </div>
    );
  }

  if (filteredViewers.length === 0) {
    return (
      <div className="who-viewed-container">
        <div className="empty-state">
          <div className="empty-icon">👀</div>
          <h2>No views yet</h2>
          <p>When people view your profile, they'll appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="who-viewed-container">
      <div className="viewers-header">
        <h2>Who Viewed You</h2>
        <span className="viewers-count">{filteredViewers.length} views</span>
      </div>
      <div className="viewers-list">
        {filteredViewers.map((viewer) => (
          <div key={viewer.profileId} className="viewer-item">
            <SafeImage src={viewer.profilePhoto || ''} alt={viewer.profileName || 'User'} className="viewer-photo" />
            <div className="viewer-info">
              <div className="viewer-name">{viewer.profileName || 'User'}</div>
              <div className="viewer-time">{formatTime(viewer.viewedAt)}</div>
            </div>
            <button 
              className="viewer-action-btn" 
              onClick={() => handleViewProfile(viewer)}
            >
              View Profile
            </button>
          </div>
        ))}
      </div>

      {selectedProfile && !ProfileDetailModalComponent && (
        <div className="profile-modal-error" onClick={() => setSelectedProfile(null)}>
          <div className="profile-modal-error-content" onClick={(e) => e.stopPropagation()}>
            <p>Loading profile...</p>
            <button onClick={() => setSelectedProfile(null)}>Cancel</button>
          </div>
        </div>
      )}
      {selectedProfile && ProfileDetailModalComponent && (
        <ErrorBoundary
          key={selectedProfile.id}
          fallback={
            <div className="profile-modal-error" onClick={() => setSelectedProfile(null)}>
              <div className="profile-modal-error-content" onClick={(e) => e.stopPropagation()}>
                <p>Could not load profile. Tap to close.</p>
                <button onClick={() => setSelectedProfile(null)}>Close</button>
              </div>
            </div>
          }
        >
          <ProfileDetailModalComponent
            profile={normalizeProfile(selectedProfile)}
            onClose={() => setSelectedProfile(null)}
            onLike={() => {
              const uid = getCurrentUid();
              if (uid && selectedProfile) {
                setSwipe(uid, selectedProfile.id, 'like').catch(() => null);
                setLikedProfileIds((prev) => (prev.includes(selectedProfile.id) ? prev : [...prev, selectedProfile.id]));
              }
            }}
            onMessage={() => {
              if (selectedProfile) {
                window.dispatchEvent(new CustomEvent('openChat', { detail: { profileId: selectedProfile.id } }));
                setSelectedProfile(null);
              }
            }}
            onFollow={() => {
              const uid = getCurrentUid();
              if (uid && selectedProfile) {
                followUser(uid, selectedProfile.id).catch(() => null);
              }
            }}
            onUnfollow={() => {
              const uid = getCurrentUid();
              if (uid && selectedProfile) {
                unfollowUser(uid, selectedProfile.id).catch(() => null);
              }
            }}
            isLiked={selectedProfile ? likedProfileIds.includes(selectedProfile.id) : false}
            isFollowing={selectedProfile ? followingIds.includes(selectedProfile.id) : false}
            isOwnProfile={selectedProfile ? getCurrentUid() === selectedProfile.id : false}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}
