import React, { useState, useEffect } from 'react';
import ProfileCard from '../components/ProfileCard';
import MatchAnimation from '../components/MatchAnimation';
import PremiumModal from '../components/PremiumModal';
import PullToRefresh from '../components/PullToRefresh';
import ActionSheetModal from '../components/ActionSheetModal';
import ReportModal from '../components/ReportModal';
import { storage } from '../utils/storage';
import { shareProfile } from '../utils/shareProfile';
import { runPremiumPurchase } from '../utils/premiumPurchase';
import { useToast } from '../hooks/useToast';
import { Profile } from '../types';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { createReport, listenMySwipes, listenProfiles, removeSwipe, setSwipe, type SwipeType } from '../firestore';
import './RightNow.css';

export default function RightNow() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedProfiles, setLikedProfiles] = useState<string[]>([]);
  const [passedProfiles, setPassedProfiles] = useState<string[]>([]);
  const [superLikedProfiles, setSuperLikedProfiles] = useState<string[]>([]);
  const [blockedProfiles, setBlockedProfiles] = useState<string[]>([]);
  const [showMatchAnimation, setShowMatchAnimation] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [premiumFeatures, setPremiumFeatures] = useState(storage.getPremiumFeatures());
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumFeature, setPremiumFeature] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'grid'>('card');
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [actionOptions, setActionOptions] = useState<string[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportProfile, setReportProfile] = useState<Profile | null>(null);
  const { showToast, ToastContainer } = useToast();

  useEffect(() => {
    let unsubProfiles: (() => void) | null = null;
    let unsubSwipes: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubProfiles?.();
      unsubSwipes?.();

      if (!user) {
        setAllProfiles([]);
        setProfiles([]);
        setLikedProfiles([]);
        setPassedProfiles([]);
        setSuperLikedProfiles([]);
        setBlockedProfiles([]);
        return;
      }

      unsubProfiles = listenProfiles((profileRows) => {
        setAllProfiles(profileRows);
      });

      unsubSwipes = listenMySwipes(user.uid, (swipes: Record<string, SwipeType>) => {
        const liked = Object.entries(swipes)
          .filter(([, t]) => t === 'like' || t === 'superlike')
          .map(([id]) => id);
        const passed = Object.entries(swipes)
          .filter(([, t]) => t === 'pass')
          .map(([id]) => id);
        const superLiked = Object.entries(swipes)
          .filter(([, t]) => t === 'superlike')
          .map(([id]) => id);
        const blocked = Object.entries(swipes)
          .filter(([, t]) => t === 'block')
          .map(([id]) => id);

        setLikedProfiles(liked);
        setPassedProfiles(passed);
        setSuperLikedProfiles(superLiked);
        setBlockedProfiles(blocked);
      });
    });

    return () => {
      unsubAuth();
      unsubProfiles?.();
      unsubSwipes?.();
    };
  }, []);

  useEffect(() => {
    const availableNow = allProfiles.filter((profile) =>
      profile.hookUpNow === true && !passedProfiles.includes(profile.id) && !blockedProfiles.includes(profile.id)
    );
    setProfiles(availableNow);
  }, [allProfiles, passedProfiles, blockedProfiles]);

  useEffect(() => {
    if (currentIndex >= profiles.length) {
      setCurrentIndex(0);
    }
  }, [profiles, currentIndex]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleLike = async (profileId: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const res = await setSwipe(uid, profileId, 'like');
    if (res.matchCreated) {
      const profile = allProfiles.find((p) => p.id === profileId);
      if (profile) {
        setMatchedProfile(profile);
        setShowMatchAnimation(true);
      }
    }

    storage.addSwipeToHistory({ type: 'like', profileId });
    moveToNext();
  };

  const handleSuperLike = async (profileId: string) => {
    if (premiumFeatures.superLikesRemaining <= 0 && !premiumFeatures.hasPremium) {
      setPremiumFeature('superlike');
      setShowPremiumModal(true);
      return;
    }

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const res = await setSwipe(uid, profileId, 'superlike');
    if (res.matchCreated) {
      const profile = allProfiles.find((p) => p.id === profileId);
      if (profile) {
        setMatchedProfile(profile);
        setShowMatchAnimation(true);
      }
    }

    if (!premiumFeatures.hasPremium) {
      const updated = { ...premiumFeatures, superLikesRemaining: premiumFeatures.superLikesRemaining - 1 };
      setPremiumFeatures(updated);
      storage.savePremiumFeatures(updated);
    }

    storage.addSwipeToHistory({ type: 'superlike', profileId });
    moveToNext();
  };

  const handlePass = async (profileId: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    await setSwipe(uid, profileId, 'pass');
    storage.addSwipeToHistory({ type: 'pass', profileId });
    moveToNext();
  };

  const moveToNext = () => {
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handleMessage = (profileId?: string) => {
    const targetProfileId = profileId || profiles[currentIndex]?.id;
    if (!targetProfileId) return;
    
    const profile = profiles.find(p => p.id === targetProfileId);
    if (profile && likedProfiles.includes(targetProfileId)) {
      const event = new CustomEvent('openChat', { detail: { profileId: targetProfileId } });
      window.dispatchEvent(event);
      window.dispatchEvent(new CustomEvent('switchTab', { detail: { tab: 'messages' } }));
    } else {
      showToast('Like this profile first to start chatting!', 'info');
    }
  };

  const handleSave = (profileId: string) => {
    const isSaved = storage.getSavedProfiles().includes(profileId);
    if (isSaved) {
      storage.removeSavedProfile(profileId);
    } else {
      storage.addSavedProfile(profileId);
    }
  };

  const handleReportSubmit = async (reason: string) => {
    if (!reportProfile) return;

    try {
      await createReport({
        type: 'profile',
        targetId: reportProfile.id,
        targetName: `${reportProfile.name}, ${reportProfile.age}`,
        reason: reason || undefined,
      });
      showToast('Report submitted. Thanks for helping keep VibeUp safe.', 'success');
    } catch {
      showToast('Failed to submit report. Try again.', 'error');
    }
  };

  const handleMenu = () => {
    const targetProfile = profiles[currentIndex];
    if (!targetProfile) return;
    const isLiked = likedProfiles.includes(targetProfile.id);
    const options = ['Report', 'Block'];
    if (isLiked) {
      options.push('Unmatch');
    }
    options.push('Share', 'Save');

    setActionOptions(options);
    setShowActionSheet(true);
  };

  const handleMenuSelect = async (selected: string) => {
    const targetProfile = profiles[currentIndex];
    if (!targetProfile) return;

    if (selected === 'Report') {
      setReportProfile(targetProfile);
      setShowReportModal(true);
      return;
    }

    if (selected === 'Block') {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      await setSwipe(uid, targetProfile.id, 'block');
      showToast('User blocked.', 'success');
      return;
    }

    if (selected === 'Unmatch') {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      await removeSwipe(uid, targetProfile.id);
      showToast('Match removed.', 'success');
      return;
    }

    if (selected === 'Share') {
      shareProfile(targetProfile);
      return;
    }

    if (selected === 'Save') {
      handleSave(targetProfile.id);
      showToast('Saved status updated.', 'success');
    }
  };

  const handlePurchase = async (feature: string) => {
    const purchase = await runPremiumPurchase(feature);
    if (!purchase.success) {
      showToast(`Purchase failed: ${purchase.message}`, 'error');
      setShowPremiumModal(false);
      return;
    }

    let updated = { ...premiumFeatures };
    
    if (feature === 'premium') {
      updated = {
        hasPremium: true,
        hasBoost: true,
        hasSuperLike: true,
        hasUndo: true,
        boostsRemaining: 999,
        superLikesRemaining: 999,
        undosRemaining: 999,
      };
    } else if (feature === 'superlike') {
      updated.superLikesRemaining += 5;
    }
    
    setPremiumFeatures(updated);
    storage.savePremiumFeatures(updated);
    showToast(`Purchase successful: ${feature} activated.`, 'success');
    setShowPremiumModal(false);
  };

  if (profiles.length === 0) {
    return (
      <div className="rightnow-container">
        <div className="rightnow-empty">
          <div className="empty-icon">🔥</div>
          <div className="empty-title">No one available right now</div>
          <div className="empty-text">Check back soon or enable "Available Now" in your profile to get seen!</div>
          <button className="refresh-button" onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? 'Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
      </div>
    );
  }

  const currentProfile = profiles[currentIndex];
  const canSuperLike = premiumFeatures.hasPremium || premiumFeatures.superLikesRemaining > 0;

  if (!currentProfile) {
    return (
      <div className="rightnow-empty">
        <div>Loading profiles...</div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="rightnow-container">
        <div className="rightnow-title">
          <h2>Right Now (Live)</h2>
          <p>Profiles who are available and active in this moment.</p>
        </div>
        <div className="rightnow-header">
          <div className="rightnow-count">
            {profiles.length} {profiles.length === 1 ? 'person' : 'people'} available now
          </div>
          <button
            className="view-toggle-button"
            onClick={() => setViewMode(prev => (prev === 'card' ? 'grid' : 'card'))}
          >
            {viewMode === 'card' ? '▦ Grid' : '🎴 Card'}
          </button>
        </div>

        {viewMode === 'card' ? (
          // Card view - swipe through profiles
          profiles.map((profile, index) => {
            if (index < currentIndex || index > currentIndex + 1) {
              return null;
            }
            
            return (
              <ProfileCard
                key={profile.id}
                profile={profile}
                onLike={() => handleLike(profile.id)}
                onPass={() => handlePass(profile.id)}
                onSuperLike={() => handleSuperLike(profile.id)}
                onMessage={handleMessage}
                onSave={() => handleSave(profile.id)}
                onReport={() => handleReport(profile)}
                onMenu={handleMenu}
                isLiked={likedProfiles.includes(profile.id)}
                isSaved={storage.getSavedProfiles().includes(profile.id)}
                isSuperLiked={superLikedProfiles.includes(profile.id)}
                canSuperLike={canSuperLike}
              />
            );
          })
        ) : (
          // Grid view - show all available profiles
          <div className="rightnow-grid">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="rightnow-grid-item"
                onClick={() => {
                  const index = profiles.findIndex(p => p.id === profile.id);
                  if (index !== -1) {
                    setCurrentIndex(index);
                    setViewMode('card');
                  }
                }}
              >
                <img src={profile.photo} alt={profile.name} className="grid-item-photo" />
                <div className="grid-item-info">
                  <div className="grid-item-name">{profile.name}, {profile.age}</div>
                  <div className="grid-item-distance">{profile.distance} mi away</div>
                  <div className="grid-item-badge">🔥 Available Now</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showMatchAnimation && matchedProfile && (
          <MatchAnimation
            profileName={matchedProfile.name}
            profilePhoto={matchedProfile.photo}
            profileId={matchedProfile.id}
            onClose={() => {
              setShowMatchAnimation(false);
              setMatchedProfile(null);
            }}
            onMessage={handleMessage}
          />
        )}

        <PremiumModal
          isOpen={showPremiumModal}
          onClose={() => setShowPremiumModal(false)}
          onPurchase={handlePurchase}
          feature={premiumFeature}
        />

        <ActionSheetModal
          isOpen={showActionSheet}
          title="Profile Actions"
          options={actionOptions}
          onSelect={handleMenuSelect}
          onClose={() => setShowActionSheet(false)}
        />

        <ReportModal
          isOpen={showReportModal}
          profileName={reportProfile ? `${reportProfile.name}, ${reportProfile.age}` : undefined}
          onSubmit={handleReportSubmit}
          onClose={() => setShowReportModal(false)}
        />

        <ToastContainer />
      </div>
    </PullToRefresh>
  );
}
