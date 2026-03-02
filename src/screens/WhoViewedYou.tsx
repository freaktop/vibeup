import React, { useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { Viewer } from '../types';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { getCurrentUid } from '../auth';
import { listenBlockedIds, listenProfileViewers } from '../firestore';
import './WhoViewedYou.css';

export default function WhoViewedYou() {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [premiumFeatures] = useState(storage.getPremiumFeatures());

  useEffect(() => {
    let unsub: (() => void) | null = null;
    let unsubBlocked: (() => void) | null = null;

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
