import React, { useState, useEffect } from 'react';
import ProfileCard from '../components/ProfileCard';
import MapView from '../components/MapView';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import ActionSheetModal from '../components/ActionSheetModal';
import ReportModal from '../components/ReportModal';
import { usCities } from '../data/cities';
import { storage } from '../utils/storage';
import { shareProfile } from '../utils/shareProfile';
import { getCurrentLocation, calculateDistance } from '../utils/geolocation';
import { useToast } from '../hooks/useToast';
import { Profile } from '../types';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { createReport, listenMySwipes, listenProfiles, removeSwipe, setSwipe } from '../firestore';
import './Map.css';

export default function Map() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [likedProfiles, setLikedProfiles] = useState<string[]>([]);
  const [blockedProfiles, setBlockedProfiles] = useState<string[]>([]);
  const [premiumFeatures] = useState(storage.getPremiumFeatures());
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchLocation, setSearchLocation] = useState<string>('Near Me');
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [exploreMode, setExploreMode] = useState(false);
  const [sneakyLinks, setSneakyLinks] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [actionOptions, setActionOptions] = useState<string[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const { showToast, ToastContainer } = useToast();

  const cityCoordinates: Record<string, { lat: number; lng: number }> = usCities.reduce(
    (acc, city) => {
      acc[`${city.name}, ${city.state}`] = { lat: city.lat, lng: city.lng };
      return acc;
    },
    { 'Near Me': { lat: 0, lng: 0 } } as Record<string, { lat: number; lng: number }>
  );

  useEffect(() => {
    // Initialize map center immediately with default location
    setMapCenter({ lat: 40.7128, lng: -74.0060 });
    // Then try to get user location
    loadUserLocation();

    // Listen for city change events from Profile tab
    const handleCityChange = (event: any) => {
      const city = event.detail?.city;
      if (city) {
        if (cityCoordinates[city]) {
          handleLocationSelect(city);
          return;
        }

        const match = usCities.find(c => c.name.toLowerCase() === city.toLowerCase());
        if (match) {
          handleLocationSelect(`${match.name}, ${match.state}`);
        }
      }
    };

    window.addEventListener('changeMapLocation', handleCityChange);
    return () => {
      window.removeEventListener('changeMapLocation', handleCityChange);
    };
  }, []);

  useEffect(() => {
    let unsubProfiles: (() => void) | null = null;
    let unsubSwipes: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubProfiles?.();
      unsubSwipes?.();

      if (!user) {
        setProfiles([]);
        setLikedProfiles([]);
        setBlockedProfiles([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      unsubProfiles = listenProfiles((profileRows) => {
        setProfiles(profileRows.filter((profile) => !!profile.lat && !!profile.lng));
        setIsLoading(false);
      });

      unsubSwipes = listenMySwipes(user.uid, (swipes) => {
        const liked = Object.entries(swipes)
          .filter(([, type]) => type === 'like' || type === 'superlike')
          .map(([id]) => id);
        const blocked = Object.entries(swipes)
          .filter(([, type]) => type === 'block')
          .map(([id]) => id);

        setLikedProfiles(liked);
        setBlockedProfiles(blocked);
      });
    });

    return () => {
      unsubAuth();
      unsubProfiles?.();
      unsubSwipes?.();
    };
  }, []);

  const loadUserLocation = async () => {
    try {
      const location = await getCurrentLocation();
      if (location) {
        setUserLocation(location);
        setMapCenter({ lat: location.latitude, lng: location.longitude });
        setLocationError(null);
      } else {
        // Keep default NYC if location not available
        setLocationError('Location not available. Using default location.');
      }
    } catch (error: any) {
      console.error('Error getting location:', error);
      setLocationError('Unable to get your location. Please enable location permissions in settings.');
      // Keep default NYC on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleNearMe = async () => {
    setLocationError(null);
    try {
      const location = await getCurrentLocation();
      if (location) {
        setUserLocation(location);
        setMapCenter({ lat: location.latitude, lng: location.longitude });
        setSearchLocation('Near Me');
        setLocationError(null);
      } else {
        setLocationError('Unable to get your location. Please enable location permissions.');
      }
    } catch (error: any) {
      setLocationError('Location permission denied. Please enable location access in your device settings.');
    }
  };

  const handleLocationSelect = (location: string) => {
    setSearchLocation(location);
    setShowSearchModal(false);
    
    // Set map center based on selected location
    if (location === 'Near Me') {
      handleNearMe();
    } else if (cityCoordinates[location]) {
      setMapCenter(cityCoordinates[location]);
    } else {
      // Fallback to NYC
      setMapCenter({ lat: 40.7128, lng: -74.0060 });
    }
  };

  const handleProfileClick = (profile: Profile) => {
    setSelectedProfile(profile);
  };

  const handleLike = async (profileId: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    await setSwipe(uid, profileId, 'like');
    setSelectedProfile(null);
  };

  const handlePass = async (profileId: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    await setSwipe(uid, profileId, 'pass');
    setSelectedProfile(null);
  };

  const handleSuperLike = async (profileId: string) => {
    if (premiumFeatures.superLikesRemaining <= 0 && !premiumFeatures.hasPremium) {
      showToast('Super Like requires Premium.', 'info');
      return;
    }

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    await setSwipe(uid, profileId, 'superlike');
    setSelectedProfile(null);
  };

  const handleMessage = () => {
    if (selectedProfile && likedProfiles.includes(selectedProfile.id)) {
      // Dispatch event to open messages tab and start chat
      const event = new CustomEvent('openChat', { detail: { profileId: selectedProfile.id } });
      window.dispatchEvent(event);
      setSelectedProfile(null);
    } else {
      showToast('Like this profile first to start chatting!', 'info');
    }
  };

  const handleMenu = () => {
    if (!selectedProfile) return;
    const isLiked = likedProfiles.includes(selectedProfile.id);
    const options = ['Report', 'Block'];
    if (isLiked) {
      options.push('Unmatch');
    }
    options.push('Share', 'Save');

    setActionOptions(options);
    setShowActionSheet(true);
  };

  const handleMenuSelect = async (selected: string) => {
    if (!selectedProfile) return;

    if (selected === 'Report') {
      setShowReportModal(true);
      return;
    }

    if (selected === 'Block') {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      await setSwipe(uid, selectedProfile.id, 'block');
      setSelectedProfile(null);
      showToast('User blocked.', 'success');
      return;
    }

    if (selected === 'Unmatch') {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      await removeSwipe(uid, selectedProfile.id);
      setSelectedProfile(null);
      showToast('Match removed.', 'success');
      return;
    }

    if (selected === 'Share') {
      shareProfile(selectedProfile);
      return;
    }

    if (selected === 'Save') {
      const isSaved = storage.getSavedProfiles().includes(selectedProfile.id);
      if (isSaved) {
        storage.removeSavedProfile(selectedProfile.id);
      } else {
        storage.addSavedProfile(selectedProfile.id);
      }
      showToast('Saved status updated.', 'success');
    }
  };

  const handleReportSubmit = async (reason: string) => {
    if (!selectedProfile) return;

    try {
      await createReport({
        type: 'profile',
        targetId: selectedProfile.id,
        targetName: `${selectedProfile.name}, ${selectedProfile.age}`,
        reason: reason || undefined,
      });
      showToast('Report submitted.', 'success');
    } catch {
      showToast('Failed to submit report. Try again.', 'error');
    }
  };

  if (selectedProfile) {
    const canSuperLike = premiumFeatures.hasPremium || premiumFeatures.superLikesRemaining > 0;
    
    return (
      <div className="map-container">
        <div className="map-profile-view">
          <button className="map-back-button" onClick={() => setSelectedProfile(null)}>
            ← Back to Map
          </button>
          <ProfileCard
            profile={selectedProfile}
            onLike={() => handleLike(selectedProfile.id)}
            onPass={() => handlePass(selectedProfile.id)}
            onSuperLike={() => handleSuperLike(selectedProfile.id)}
            onMessage={handleMessage}
            onSave={() => {
              const isSaved = storage.getSavedProfiles().includes(selectedProfile.id);
              if (isSaved) {
                storage.removeSavedProfile(selectedProfile.id);
              } else {
                storage.addSavedProfile(selectedProfile.id);
              }
            }}
            onReport={handleMenu}
            onMenu={handleMenu}
            isLiked={likedProfiles.includes(selectedProfile.id)}
            isSaved={storage.getSavedProfiles().includes(selectedProfile.id)}
            canSuperLike={canSuperLike}
          />
        </div>
      </div>
    );
  }


  // Filter profiles based on mode
  let profilesToShow = profiles;
  if (sneakyLinks) {
    // Show only hookup now profiles
    profilesToShow = profiles.filter(p => p.hookUpNow === true);
  } else if (exploreMode) {
    // Explore mode - show all profiles with location
    profilesToShow = profiles.filter(p => p.lat && p.lng);
  } else {
    // Cruise mode - default, shows all profiles
    profilesToShow = profiles;
  }

  profilesToShow = profilesToShow.filter((profile) => !blockedProfiles.includes(profile.id));

  // Calculate distances if user location is available
  const profilesWithDistance = profilesToShow.map(profile => {
    if (userLocation && profile.lat && profile.lng) {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        profile.lat,
        profile.lng
      );
      return { ...profile, distance: Math.round(distance) };
    }
    return profile;
  });

  if (isLoading) {
    return <Loading message="Loading map..." fullScreen />;
  }

  return (
    <div className="map-container">
      {locationError && (
        <ErrorMessage 
          message={locationError} 
          onDismiss={() => setLocationError(null)} 
          type="warning"
        />
      )}
      <div className="map-header-controls">
        <button
          className="map-nearme-btn"
          onClick={handleNearMe}
          title="Center map on your location"
        >
          📍 Near Me
        </button>
        <button
          className={`map-explore-btn ${exploreMode ? 'active' : ''}`}
          onClick={() => {
            setExploreMode(true);
            setSneakyLinks(false);
          }}
          title="Explore - View all profiles in this area"
        >
          🔍 Explore {exploreMode && `(${profilesToShow.length})`}
        </button>
        <button
          className={`map-cruise-btn ${!exploreMode && !sneakyLinks ? 'active' : ''}`}
          onClick={() => {
            setExploreMode(false);
            setSneakyLinks(false);
          }}
          title="Cruise - Browse all profiles"
        >
          🚗 Cruise {!exploreMode && !sneakyLinks && `(${profilesToShow.length})`}
        </button>
        <button
          className={`map-sneaky-btn ${sneakyLinks ? 'active' : ''}`}
          onClick={() => {
            setSneakyLinks(true);
            setExploreMode(false);
          }}
          title="Sneaky Links - Show hookup spots only"
        >
          🔥 Sneaky Links {sneakyLinks && `(${profilesToShow.length})`}
        </button>
        <button
          className="map-search-btn"
          onClick={() => setShowSearchModal(true)}
          title="Navigate to city"
        >
          🌎 Navigate
        </button>
      </div>

      <MapView
        profiles={profilesWithDistance}
        onProfileClick={handleProfileClick}
        centerLat={mapCenter?.lat || 40.7128}
        centerLng={mapCenter?.lng || -74.0060}
        zoom={13}
        userLocation={userLocation || undefined}
      />

      {showSearchModal && (
        <SearchLocationModal
          currentLocation={searchLocation}
          onSelect={handleLocationSelect}
          onClose={() => setShowSearchModal(false)}
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
        profileName={selectedProfile ? `${selectedProfile.name}, ${selectedProfile.age}` : undefined}
        onSubmit={handleReportSubmit}
        onClose={() => setShowReportModal(false)}
      />

      <ToastContainer />
    </div>
  );
}

function SearchLocationModal({ currentLocation, onSelect, onClose }: { currentLocation: string; onSelect: (location: string) => void; onClose: () => void }) {
  const locations = [
    'Near Me',
    ...usCities
      .map(city => `${city.name}, ${city.state}`)
      .sort((a, b) => a.localeCompare(b)),
  ];
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content search-location-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Navigate to City</h2>
        <div className="search-location-options">
          {locations.map((location) => (
            <button
              key={location}
              className={`location-option-btn ${currentLocation === location ? 'active' : ''}`}
              onClick={() => onSelect(location)}
            >
              {location === 'Near Me' ? '📍 ' : '🌎 '}{location}
            </button>
          ))}
        </div>
        <button className="modal-btn cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
