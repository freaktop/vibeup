import React, { useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { Viewer } from '../types';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { listenProfiles } from '../firestore';
import './WhoViewedYou.css';

export default function WhoViewedYou() {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [premiumFeatures] = useState(storage.getPremiumFeatures());
  const [profileMap, setProfileMap] = useState<Record<string, { name: string; photo: string }>>({});

  useEffect(() => {
    let unsubProfiles: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubProfiles?.();

      if (!user) {
        setProfileMap({});
        return;
      }

      unsubProfiles = listenProfiles((profiles) => {
        const index: Record<string, { name: string; photo: string }> = {};
        for (const profile of profiles) {
          index[profile.id] = {
            name: profile.name,
            photo: profile.photo,
          };
        }
        setProfileMap(index);
      });
    });

    return () => {
      unsubAuth();
      unsubProfiles?.();
    };
  }, []);

  useEffect(() => {
    loadViewers();
  }, [profileMap, premiumFeatures.hasPremium, premiumFeatures.canSeeViewers]);

  const loadViewers = () => {
    if (!premiumFeatures.hasPremium && !premiumFeatures.canSeeViewers) {
      return;
    }
    
    const savedViewers = storage.getProfileViewers();
    const blockedProfiles = storage.getBlockedProfiles();
    // Convert to full viewer objects with profile data
    const fullViewers: Viewer[] = savedViewers
      .filter(viewer => !blockedProfiles.includes(viewer.profileId))
      .map(viewer => {
      const profile = profileMap[viewer.profileId];
      return {
        ...viewer,
        profileName: profile?.name || 'Unknown',
        profilePhoto: profile?.photo || '',
      };
    });
    setViewers(fullViewers);
  };

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
          <p>Upgrade to Premium to see who viewed your profile!</p>
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

  if (viewers.length === 0) {
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
        <span className="viewers-count">{viewers.length} views</span>
      </div>
      <div className="viewers-list">
        {viewers.map((viewer) => (
          <div key={viewer.profileId} className="viewer-item">
            <img src={viewer.profilePhoto} alt={viewer.profileName} className="viewer-photo" />
            <div className="viewer-info">
              <div className="viewer-name">{viewer.profileName}</div>
              <div className="viewer-time">{formatTime(viewer.viewedAt)}</div>
            </div>
            <button 
              className="viewer-action-btn" 
              onClick={() => {
                window.dispatchEvent(new CustomEvent('switchTab', { detail: { tab: 'discover' } }));
              }}
            >
              View Profile
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
