import React, { useState, useEffect } from 'react';
import ProfileCard from '../components/ProfileCard';
import MatchAnimation from '../components/MatchAnimation';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import ActionSheetModal from '../components/ActionSheetModal';
import ReportModal from '../components/ReportModal';
import { storage } from '../utils/storage';
import { shareProfile } from '../utils/shareProfile';
import { useToast } from '../hooks/useToast';
import { Profile } from '../types';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { createReport, listenMySwipes, listenProfiles, listenWhoLikedMe, removeSwipe, setSwipe, type SwipeType } from '../firestore';
import './VibeUp.css';

export default function VibeUp() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedProfiles, setLikedProfiles] = useState<string[]>([]);
  const [passedProfiles, setPassedProfiles] = useState<string[]>([]);
  const [savedProfiles, setSavedProfiles] = useState<string[]>([]);
  const [showMatchAnimation, setShowMatchAnimation] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [premiumFeatures] = useState(storage.getPremiumFeatures());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [whoLikedMeIds, setWhoLikedMeIds] = useState<string[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [blockedProfiles, setBlockedProfiles] = useState<string[]>([]);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [actionOptions, setActionOptions] = useState<string[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportProfile, setReportProfile] = useState<Profile | null>(null);
  const { showToast, ToastContainer } = useToast();

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setSavedProfiles(storage.getSavedProfiles());

    let unsubProfiles: (() => void) | null = null;
    let unsubLikedMe: (() => void) | null = null;
    let unsubSwipes: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubProfiles?.();
      unsubLikedMe?.();
      unsubSwipes?.();

      if (!user) {
        setProfiles([]);
        setAllProfiles([]);
        setWhoLikedMeIds([]);
        setLikedProfiles([]);
        setPassedProfiles([]);
        setSavedProfiles([]);
        setBlockedProfiles([]);
        setIsLoading(false);
        return;
      }

      unsubProfiles = listenProfiles((p) => {
        setAllProfiles(p);
      });

      unsubLikedMe = listenWhoLikedMe(user.uid, (ids) => {
        setWhoLikedMeIds(ids);
        setIsLoading(false);
      });

      unsubSwipes = listenMySwipes(user.uid, (swipes: Record<string, SwipeType>) => {
        const liked = Object.entries(swipes)
          .filter(([, t]) => t === 'like' || t === 'superlike')
          .map(([id]) => id);
        const passed = Object.entries(swipes)
          .filter(([, t]) => t === 'pass')
          .map(([id]) => id);
        const blocked = Object.entries(swipes)
          .filter(([, t]) => t === 'block')
          .map(([id]) => id);

        setLikedProfiles(liked);
        setPassedProfiles(passed);
        setBlockedProfiles(blocked);
      });
    });

    return () => {
      unsubAuth();
      unsubProfiles?.();
      unsubLikedMe?.();
      unsubSwipes?.();
    };
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const passed = new Set(passedProfiles);
    const liked = new Set(likedProfiles);

    const blocked = new Set(blockedProfiles);
    const whoLikedYou = allProfiles.filter((p) => whoLikedMeIds.includes(p.id) && !passed.has(p.id) && !liked.has(p.id) && !blocked.has(p.id));
    setProfiles(whoLikedYou);
  }, [allProfiles, whoLikedMeIds, passedProfiles, likedProfiles, blockedProfiles]);

  useEffect(() => {
    if (currentIndex >= profiles.length) {
      setCurrentIndex(0);
    }
  }, [profiles, currentIndex]);

  const handleLike = async (profileId: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const res = await setSwipe(uid, profileId, 'like');
    if (res.matchCreated) {
      const profile = profiles.find((p) => p.id === profileId);
      if (profile) {
        setMatchedProfile(profile);
        setShowMatchAnimation(true);
      }
    }
    moveToNext();
  };

  const handlePass = async (profileId: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await setSwipe(uid, profileId, 'pass');
    moveToNext();
  };

  const handleSuperLike = async (profileId: string) => {
    if (premiumFeatures.superLikesRemaining <= 0 && !premiumFeatures.hasPremium) {
      showToast('Super Like requires Premium.', 'info');
      return;
    }
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const res = await setSwipe(uid, profileId, 'superlike');
    if (res.matchCreated) {
      const profile = profiles.find((p) => p.id === profileId);
      if (profile) {
        setMatchedProfile(profile);
        setShowMatchAnimation(true);
      }
    }
    moveToNext();
  };

  const moveToNext = () => {
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      showToast('You\'ve seen all profiles for now.', 'info');
    }
  };

  const handleMessage = (profileId?: string) => {
    const targetProfileId = profileId || profiles[currentIndex]?.id;
    if (!targetProfileId) return;
    
    // If it's a match, we can message directly
    const profile = profiles.find(p => p.id === targetProfileId);
    if (profile && (likedProfiles.includes(targetProfileId) || matchedProfile?.id === targetProfileId)) {
      const event = new CustomEvent('openChat', { detail: { profileId: targetProfileId } });
      window.dispatchEvent(event);
      // Switch to messages tab
      window.dispatchEvent(new CustomEvent('switchTab', { detail: { tab: 'messages' } }));
    } else {
      showToast('Like this profile first to start chatting!', 'info');
    }
  };

  const handleSave = () => {
    const targetProfileId = profiles[currentIndex]?.id;
    if (!targetProfileId) return;
    const isSaved = savedProfiles.includes(targetProfileId);
    if (isSaved) {
      storage.removeSavedProfile(targetProfileId);
      setSavedProfiles((prev) => prev.filter((id) => id !== targetProfileId));
    } else {
      storage.addSavedProfile(targetProfileId);
      setSavedProfiles((prev) => [...prev, targetProfileId]);
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
      showToast('Report submitted.', 'success');
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
      setSavedProfiles(prev => prev.filter(id => id !== targetProfile.id));
      showToast('User blocked.', 'success');
      return;
    }

    if (selected === 'Unmatch') {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      await removeSwipe(uid, targetProfile.id);
      setSavedProfiles(prev => prev.filter(id => id !== targetProfile.id));
      showToast('Match removed.', 'success');
      return;
    }

    if (selected === 'Share') {
      shareProfile(targetProfile);
      return;
    }

    if (selected === 'Save') {
      handleSave();
      showToast('Saved status updated.', 'success');
    }
  };

  if (isLoading) {
    return <Loading message="Loading profiles..." fullScreen />;
  }

  if (profiles.length === 0) {
    return (
      <div className="vibeup-container">
        {error && (
          <ErrorMessage 
            message={error} 
            onDismiss={() => setError(null)} 
            retry={() => window.dispatchEvent(new CustomEvent('switchTab', { detail: { tab: 'discover' } }))}
            type="error"
          />
        )}
        <div className="vibeup-empty">
          <div className="empty-icon">💚</div>
          <div className="empty-title">No one has liked you yet</div>
          <div className="empty-text">Start swiping in Discover to get matches!</div>
          <button 
            className="cta-button" 
            onClick={() => window.dispatchEvent(new CustomEvent('switchTab', { detail: { tab: 'discover' } }))}
            style={{
              marginTop: '24px',
              background: '#FF6B9D',
              color: '#fff',
              border: 'none',
              padding: '14px 28px',
              borderRadius: '24px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            🧭 Go to Discover
          </button>
        </div>
      </div>
    );
  }

  const currentProfile = profiles[currentIndex];
  const canSuperLike = premiumFeatures.hasPremium || premiumFeatures.superLikesRemaining > 0;

  if (!currentProfile) {
    return (
      <div className="vibeup-empty">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="vibeup-container">
      {error && (
        <ErrorMessage 
          message={error} 
          onDismiss={() => setError(null)} 
          type="error"
        />
      )}
      {profiles.map((profile, index) => {
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
            onSave={handleSave}
            onReport={() => {
              setReportProfile(profile);
              setShowReportModal(true);
            }}
            onMenu={handleMenu}
            isLiked={likedProfiles.includes(profile.id)}
            canSuperLike={canSuperLike}
          />
        );
      })}

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
  );
}
