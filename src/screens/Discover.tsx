import React, { useState, useEffect } from 'react';
import ProfileCard from '../components/ProfileCard';
import Filters, { FilterSettings } from '../components/Filters';
import MatchAnimation from '../components/MatchAnimation';
import PremiumModal from '../components/PremiumModal';
import PullToRefresh from '../components/PullToRefresh';
import ActionSheetModal from '../components/ActionSheetModal';
import ReportModal from '../components/ReportModal';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import { storage } from '../utils/storage';
import { shareProfile } from '../utils/shareProfile';
import { runPremiumPurchase } from '../utils/premiumPurchase';
import { useToast } from '../hooks/useToast';
import { Profile } from '../types';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { createReport, listenMySwipes, listenProfiles, removeSwipe, setSwipe, type SwipeType } from '../firestore';
import './Discover.css';

type DiscoveryMode = 'nearme' | 'rightnow' | 'dating' | 'goingout';
type ViewMode = 'grid' | 'card';

export default function Discover() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedProfiles, setLikedProfiles] = useState<string[]>([]);
  const [savedProfiles, setSavedProfiles] = useState<string[]>([]);
  const [passedProfiles, setPassedProfiles] = useState<string[]>([]);
  const [superLikedProfiles, setSuperLikedProfiles] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showMatchAnimation, setShowMatchAnimation] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumFeature, setPremiumFeature] = useState<string>('');
  const [premiumFeatures, setPremiumFeatures] = useState(storage.getPremiumFeatures());
  const [lastSwipe, setLastSwipe] = useState<{ type: string; profileId: string } | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid'); // DEFAULT TO GRID
  const [discoveryMode, setDiscoveryMode] = useState<DiscoveryMode>('nearme');
  const [selectedProfileForCard, setSelectedProfileForCard] = useState<Profile | null>(null);
  const [selectedProfileForDetail, setSelectedProfileForDetail] = useState<Profile | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSwiped, setHasSwiped] = useState(false);
  const [blockedProfiles, setBlockedProfiles] = useState<string[]>([]);
  const [mySwipes, setMySwipes] = useState<Record<string, SwipeType>>({});
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [actionOptions, setActionOptions] = useState<string[]>([]);
  const [actionProfileId, setActionProfileId] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportProfile, setReportProfile] = useState<Profile | null>(null);
  const { showToast, ToastContainer } = useToast();
  const [filters, setFilters] = useState<FilterSettings>({
    minAge: 18,
    maxAge: 100,
    maxDistance: 100,
    interests: [],
    kinks: [],
    lookingFor: [],
    sexualOrientation: [],
    genderIdentity: [],
  });

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const savedFilters = storage.getFilters();
    const defaultFilters: FilterSettings = {
      minAge: savedFilters?.minAge || 18,
      maxAge: savedFilters?.maxAge || 100,
      maxDistance: savedFilters?.maxDistance || 100,
      interests: savedFilters?.interests || [],
      kinks: savedFilters?.kinks || [],
      lookingFor: savedFilters?.lookingFor || [],
      sexualOrientation: savedFilters?.sexualOrientation || [],
      genderIdentity: savedFilters?.genderIdentity || [],
    };
    setFilters(defaultFilters);
    storage.saveFilters(defaultFilters);

    let unsubProfiles: (() => void) | null = null;
    let unsubSwipes: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubProfiles?.();
      unsubSwipes?.();

      if (!user) {
        setProfiles([]);
        setMySwipes({});
        setIsLoading(false);
        setError(null);
        return;
      }

      unsubProfiles = listenProfiles((p) => {
        setProfiles(p);
        setIsLoading(false);
        if (p.length === 0) {
          // If Firestore read is blocked, listenProfiles falls back to []
          // Show a helpful error so the UI doesn't look "stuck"
          setError((prev) => prev || 'Unable to load profiles. Check Firestore rules / network.');
        }
      });

      unsubSwipes = listenMySwipes(user.uid, (swipes) => {
        setMySwipes(swipes);
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
        const saved = Object.entries(swipes)
          .filter(([, t]) => t === 'save')
          .map(([id]) => id);

        setLikedProfiles(liked);
        setPassedProfiles(passed);
        setSuperLikedProfiles(superLiked);
        setBlockedProfiles(blocked);
        setSavedProfiles(saved);
      });
    });

    return () => {
      unsubAuth();
      unsubProfiles?.();
      unsubSwipes?.();
    };
  }, []);

  useEffect(() => {
    if (profiles.length > 0) {
      applyFilters();
    }
  }, [profiles, filters, passedProfiles, discoveryMode]);

  useEffect(() => {
    if (viewMode === 'card' && profilesToShowRef.current.length > 0 && currentIndex >= profilesToShowRef.current.length) {
      setCurrentIndex(0);
      setViewMode('grid');
    }
  }, [viewMode, currentIndex]);

  const applyFilters = () => {
    if (profiles.length === 0) {
      setFilteredProfiles([]);
      return;
    }

    let filtered = profiles.filter(profile => 
      !passedProfiles.includes(profile.id) && !blockedProfiles.includes(profile.id)
    );

    // Apply discovery mode filters
    switch (discoveryMode) {
      case 'rightnow':
        filtered = filtered.filter(profile => profile.hookUpNow === true);
        break;
      case 'dating':
        filtered = filtered.filter(profile => 
          profile.lookingFor && (
            profile.lookingFor.includes('Dates') || 
            profile.lookingFor.includes('Relationship')
          )
        );
        break;
      case 'goingout':
        filtered = filtered.filter(profile => 
          profile.lookingFor && (
            profile.lookingFor.includes('Friends') ||
            profile.tags?.some(tag => ['Music', 'Dancing', 'Art', 'Comedy'].includes(tag))
          )
        );
        break;
      case 'nearme':
      default:
        // Show all profiles near me
        break;
    }

    // Age filter
    if (filters.minAge !== undefined && filters.maxAge !== undefined) {
      filtered = filtered.filter(profile => 
        profile.age >= filters.minAge && profile.age <= filters.maxAge
      );
    }

    // Distance filter
    if (filters.maxDistance && filters.maxDistance > 0) {
      filtered = filtered.filter(profile => 
        profile.distance === undefined || profile.distance <= filters.maxDistance
      );
    }

    // Interests filter
    if (filters.interests && filters.interests.length > 0) {
      filtered = filtered.filter(profile =>
        profile.tags && profile.tags.length > 0 && filters.interests.some(interest => profile.tags.includes(interest))
      );
    }

    // Kinks filter
    if (filters.kinks && filters.kinks.length > 0) {
      filtered = filtered.filter(profile =>
        profile.kinks && profile.kinks.length > 0 && filters.kinks!.some(kink => profile.kinks!.includes(kink))
      );
    }

    // Looking For filter
    if (filters.lookingFor && filters.lookingFor.length > 0) {
      filtered = filtered.filter(profile =>
        profile.lookingFor && profile.lookingFor.length > 0 && filters.lookingFor!.some(looking => profile.lookingFor!.includes(looking))
      );
    }

    // Sexual orientation filter
    if (filters.sexualOrientation && filters.sexualOrientation.length > 0) {
      filtered = filtered.filter(profile =>
        profile.sexualOrientation && filters.sexualOrientation!.includes(profile.sexualOrientation)
      );
    }

    setFilteredProfiles(filtered);
    if (currentIndex >= filtered.length) {
      setCurrentIndex(0);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleApplyFilters = (newFilters: FilterSettings) => {
    setFilters(newFilters);
    storage.saveFilters(newFilters);
  };

  const handleLike = async (profileId: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const res = await setSwipe(uid, profileId, 'like');
    storage.addSwipeToHistory({ type: 'like', profileId });
    setLastSwipe({ type: 'like', profileId });
    setHasSwiped(true);

    if (res.matchCreated) {
      const profile = profiles.find((p) => p.id === profileId);
      if (profile) {
        setMatchedProfile(profile);
        setShowMatchAnimation(true);
      }
    }

    if (viewMode === 'card') {
      moveToNext();
    }
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

    if (!premiumFeatures.hasPremium) {
      const updated = { ...premiumFeatures, superLikesRemaining: premiumFeatures.superLikesRemaining - 1 };
      setPremiumFeatures(updated);
      storage.savePremiumFeatures(updated);
    }

    storage.addSwipeToHistory({ type: 'superlike', profileId });
    setLastSwipe({ type: 'superlike', profileId });
    setHasSwiped(true);

    if (res.matchCreated) {
      const profile = profiles.find((p) => p.id === profileId);
      if (profile) {
        setMatchedProfile(profile);
        setShowMatchAnimation(true);
      }
    }

    if (viewMode === 'card') {
      moveToNext();
    }
  };

  const handleUndo = () => {
    if (premiumFeatures.undosRemaining <= 0 && !premiumFeatures.hasPremium) {
      setPremiumFeature('undo');
      setShowPremiumModal(true);
      return;
    }

    const lastSwipe = storage.removeLastSwipe();
    if (lastSwipe) {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      removeSwipe(uid, lastSwipe.profileId).catch(() => null);

      if (!premiumFeatures.hasPremium) {
        const updated = { ...premiumFeatures, undosRemaining: premiumFeatures.undosRemaining - 1 };
        setPremiumFeatures(updated);
        storage.savePremiumFeatures(updated);
      }

      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
      setLastSwipe(null);
    }
  };

  const handlePass = async (profileId: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await setSwipe(uid, profileId, 'pass');
    storage.addSwipeToHistory({ type: 'pass', profileId });
    setLastSwipe({ type: 'pass', profileId });
    setHasSwiped(true);
    if (viewMode === 'card') {
      moveToNext();
    }
  };

  const moveToNext = () => {
    setShowInfo(false);
    if (currentIndex < filteredProfiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Reset to beginning or switch to grid view
      setCurrentIndex(0);
      if (viewMode === 'card') {
        setViewMode('grid');
      }
    }
  };

  const handleMessage = (profileId?: string) => {
    const targetProfileId = profileId || filteredProfiles[currentIndex]?.id;
    if (!targetProfileId) return;

    if (likedProfiles.includes(targetProfileId)) {
      const event = new CustomEvent('openChat', { detail: { profileId: targetProfileId } });
      window.dispatchEvent(event);
    } else {
      showToast('Like this profile first to start chatting!', 'info');
    }
  };

  const handleProfileClick = (profile: Profile) => {
    if (viewMode === 'grid') {
      // In grid view, clicking shows detail modal
      setSelectedProfileForDetail(profile);
    }
  };

  const handleSave = async (profileId: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const isSaved = savedProfiles.includes(profileId);
    if (isSaved) {
      await removeSwipe(uid, profileId);
    } else {
      await setSwipe(uid, profileId, 'save');
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

  const handleMenu = (profileId?: string) => {
    const targetProfileId = profileId || filteredProfiles[currentIndex]?.id;
    if (!targetProfileId) return;
    const isLiked = likedProfiles.includes(targetProfileId);
    const options = ['Report', 'Block'];
    if (isLiked) {
      options.push('Unmatch');
    }
    options.push('Share', 'Save');

    setActionProfileId(targetProfileId);
    setActionOptions(options);
    setShowActionSheet(true);
  };

  const handleMenuSelect = (selected: string) => {
    const targetProfileId = actionProfileId;
    if (!targetProfileId) return;
    const targetProfile = profiles.find(p => p.id === targetProfileId);

    if (selected === 'Report') {
      if (targetProfile) {
        setReportProfile(targetProfile);
        setShowReportModal(true);
      }
      return;
    }

    if (selected === 'Block') {
      const uid = auth.currentUser?.uid;
      if (uid) {
        setSwipe(uid, targetProfileId, 'block').catch(() => null);
      }
      showToast('User blocked.', 'success');
      return;
    }

    if (selected === 'Unmatch') {
      storage.unmatchProfile(targetProfileId);
      setLikedProfiles(prev => prev.filter(id => id !== targetProfileId));
      setSuperLikedProfiles(prev => prev.filter(id => id !== targetProfileId));
      setSavedProfiles(prev => prev.filter(id => id !== targetProfileId));
      showToast('Match removed.', 'success');
      return;
    }

    if (selected === 'Share') {
      if (targetProfile) {
        shareProfile(targetProfile);
      }
      return;
    }

    if (selected === 'Save') {
      handleSave(targetProfileId);
      showToast('Saved status updated.', 'success');
    }
  };

  const handleSwipeUp = () => {
    setShowInfo(true);
  };

  const handlePurchase = async (feature: string) => {
    const purchase = await runPremiumPurchase(feature);
    if (!purchase.success) {
      showToast(`Purchase failed: ${purchase.message}`, 'error');
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
    } else if (feature === 'undo') {
      updated.undosRemaining += 5;
    } else if (feature === 'boost') {
      updated.boostsRemaining += 1;
    }
    
    setPremiumFeatures(updated);
    storage.savePremiumFeatures(updated);
    showToast(`Purchase successful: ${feature} activated.`, 'success');
  };

  const handleResetAll = () => {
    storage.clearPassedProfiles();
    setPassedProfiles([]);
    
    const defaultFilters: FilterSettings = {
      minAge: 18,
      maxAge: 100,
      maxDistance: 100,
      interests: [],
      kinks: [],
      lookingFor: [],
      sexualOrientation: [],
      genderIdentity: [],
    };
    setFilters(defaultFilters);
    storage.saveFilters(defaultFilters);
    showToast('Filters and passed profiles reset.', 'success');
  };

  const allInterests = Array.from(new Set(profiles.flatMap(profile => profile.tags))).sort();
  const allKinks = Array.from(new Set(profiles.flatMap(profile => profile.kinks || []))).sort();
  const allLookingFor = Array.from(new Set(profiles.flatMap(profile => profile.lookingFor || []))).sort();

  // Ensure we always have profiles - if filtered list is empty but we have profiles, show them all
  const profilesToShow = filteredProfiles.length > 0
    ? filteredProfiles
    : profiles.filter(p => !passedProfiles.includes(p.id) && !blockedProfiles.includes(p.id));

  const profilesToShowRef = React.useRef<Profile[]>([]);
  profilesToShowRef.current = profilesToShow;

  if (isLoading) {
    return (
      <div className="discover-container">
        <Loading message="Loading profiles..." fullScreen />
      </div>
    );
  }

  if (profilesToShow.length === 0 && profiles.length === 0) {
    return (
      <div className="discover-container">
        {error && (
          <ErrorMessage 
            message={error} 
            onDismiss={() => setError(null)} 
            retry={() => window.location.reload()}
            type="error"
          />
        )}
        <div className="discover-empty">
          <div className="empty-icon">🔍</div>
          <div className="empty-title">No profiles found</div>
            <div className="empty-text">Try adjusting filters or check back later.</div>
          <button 
            className="filters-button" 
            onClick={() => window.location.reload()}
            style={{ marginTop: '12px' }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>
    );
  }

  if (profilesToShow.length === 0) {
    return (
      <div className="discover-container">
        <div className="discover-empty">
          <div className="empty-icon">🔍</div>
          <div className="empty-title">No profiles match your filters</div>
            <div className="empty-text">Try adjusting your filters or reset them.</div>
          <button className="filters-button" onClick={handleResetAll} style={{ marginTop: '12px' }}>
            🔄 Reset All
          </button>
          <button className="filters-button" onClick={() => setShowFilters(true)}>
            Adjust Filters
          </button>
        </div>
        <Filters
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          filters={filters}
          onApply={handleApplyFilters}
          availableInterests={allInterests}
          availableKinks={allKinks}
          availableLookingFor={allLookingFor}
        />
      </div>
    );
  }

  const canSuperLike = premiumFeatures.hasPremium || premiumFeatures.superLikesRemaining > 0;
  const canUndo = lastSwipe && (premiumFeatures.hasPremium || premiumFeatures.undosRemaining > 0);

  // Card view - show single profile to swipe
  if (viewMode === 'card') {
    const currentProfile = profilesToShow[currentIndex];
    if (!currentProfile) {
      return (
        <div className="discover-container">
          <Loading message="Loading profiles..." fullScreen />
        </div>
      );
    }

    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="discover-container">
          <div className="discover-header-actions">
            <button className="back-button" onClick={() => setViewMode('grid')}>← Back</button>
            <button className="view-toggle-button" onClick={() => setViewMode('grid')}>Grid</button>
          </div>

          {profilesToShow.map((profile, index) => {
            if (index < currentIndex || index > currentIndex + 1) return null;
            
            return (
              <ProfileCard
                key={profile.id}
                profile={profile}
                onLike={() => handleLike(profile.id)}
                onPass={() => handlePass(profile.id)}
                onSuperLike={() => handleSuperLike(profile.id)}
                onMessage={() => handleMessage(profile.id)}
                onSave={() => handleSave(profile.id)}
                onReport={() => {
                  setReportProfile(profile);
                  setShowReportModal(true);
                }}
                onMenu={() => handleMenu(profile.id)}
                isLiked={likedProfiles.includes(profile.id)}
                isSaved={savedProfiles.includes(profile.id)}
                isSuperLiked={superLikedProfiles.includes(profile.id)}
                canSuperLike={canSuperLike}
                showInfo={showInfo && index === currentIndex}
                onSwipeUp={handleSwipeUp}
                showFirstSwipeHint={index === currentIndex && currentIndex === 0 && !hasSwiped}
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

          <PremiumModal
            isOpen={showPremiumModal}
            onClose={() => setShowPremiumModal(false)}
            onPurchase={handlePurchase}
            feature={premiumFeature}
          />
        </div>
      </PullToRefresh>
    );
  }

  // Grid view - DEFAULT view showing all profiles
  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="discover-container">
        {error && (
          <ErrorMessage 
            message={error} 
            onDismiss={() => setError(null)} 
            type="error"
          />
        )}
        {/* Header */}
        <div className="discover-header-text">
          <h1 className="discover-title">Who's out near you — right now</h1>
          <p className="discover-helper-text">Profiles update in real time based on activity and location.</p>
        </div>

        {/* Sub-tabs for discovery modes */}
        <div className="discover-subtabs">
          <button
            className={`discover-subtab ${discoveryMode === 'nearme' ? 'active' : ''}`}
            onClick={() => setDiscoveryMode('nearme')}
            title="Near Me (Active) - See profiles nearby who are currently active"
          >
            📍 Near Me (Active)
          </button>
          <button
            className={`discover-subtab ${discoveryMode === 'rightnow' ? 'active' : ''}`}
            onClick={() => setDiscoveryMode('rightnow')}
            title="Right Now (Live) - Profiles available right now, looking to meet up"
          >
            🔥 Right Now (Live)
          </button>
          <button
            className={`discover-subtab ${discoveryMode === 'dating' ? 'active' : ''}`}
            onClick={() => setDiscoveryMode('dating')}
            title="Dating Intent - Profiles looking for dates and relationships"
          >
            💕 Dating Intent
          </button>
          <button
            className={`discover-subtab ${discoveryMode === 'goingout' ? 'active' : ''}`}
            onClick={() => setDiscoveryMode('goingout')}
            title="Going Out Tonight - Profiles looking to go out, socialize, or hang out"
          >
            🎉 Going Out Tonight
          </button>
        </div>

        {/* Header actions */}
        <div className="discover-header-actions">
          <div className="discover-actions-left">
            {canUndo && (
              <button className="undo-button" onClick={handleUndo} title="Undo">
                ↩️
              </button>
            )}
          </div>
          <button
            className="view-toggle-button"
            onClick={() => {
              if (profilesToShow.length > 0) {
                setCurrentIndex(0);
                setViewMode('card');
              }
            }}
            title="Switch to card view"
          >
            🎴 Card
          </button>
          <button className="filters-button" onClick={() => setShowFilters(true)}>
            🔍 Filters
          </button>
        </div>

        {/* Grid view of profiles */}
        <div className="discover-grid">
          {profilesToShow.map((profile) => (
            <div
              key={profile.id}
              className="discover-grid-item"
              onClick={() => handleProfileClick(profile)}
            >
              <div className="grid-item-image-container">
                <img src={profile.photo} alt={profile.name} className="grid-item-image" />
                {profile.hookUpNow && (
                  <div className="grid-item-badge">🔥</div>
                )}
                {likedProfiles.includes(profile.id) && (
                  <div className="grid-item-liked">✓</div>
                )}
              </div>
              <div className="grid-item-info">
                <div className="grid-item-name">{profile.name}, {profile.age}</div>
                <div className="grid-item-distance">{profile.distance !== undefined ? `${profile.distance} mi` : 'Nearby'}</div>
                {profile.lookingFor && profile.lookingFor.length > 0 && (
                  <div className="grid-item-tags">
                    {profile.lookingFor.slice(0, 2).join(' • ')}
                  </div>
                )}
              </div>
              <div className="grid-item-actions">
                <button
                  className="grid-action-btn like-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLike(profile.id);
                  }}
                  title="Like"
                >
                  ❤️
                </button>
                <button
                  className="grid-action-btn message-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMessage(profile.id);
                  }}
                  title="Message"
                  disabled={!likedProfiles.includes(profile.id)}
                >
                  💬
                </button>
              </div>
            </div>
          ))}
        </div>

        {showMatchAnimation && matchedProfile && (
          <MatchAnimation
            profileName={matchedProfile.name}
            profilePhoto={matchedProfile.photo}
            onClose={() => {
              setShowMatchAnimation(false);
              setMatchedProfile(null);
            }}
          />
        )}

        <Filters
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          filters={filters}
          onApply={handleApplyFilters}
          availableInterests={allInterests}
          availableKinks={allKinks}
          availableLookingFor={allLookingFor}
        />

        <PremiumModal
          isOpen={showPremiumModal}
          onClose={() => setShowPremiumModal(false)}
          onPurchase={handlePurchase}
          feature={premiumFeature}
        />

        {selectedProfileForDetail && (
          <ProfileDetailModal
            profile={selectedProfileForDetail}
            onClose={() => setSelectedProfileForDetail(null)}
            onLike={() => {
              if (selectedProfileForDetail) {
                handleLike(selectedProfileForDetail.id);
                setSelectedProfileForDetail(null);
              }
            }}
            onMessage={() => {
              if (selectedProfileForDetail) {
                handleMessage(selectedProfileForDetail.id);
                setSelectedProfileForDetail(null);
              }
            }}
            isLiked={selectedProfileForDetail ? likedProfiles.includes(selectedProfileForDetail.id) : false}
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
    </PullToRefresh>
  );
}
