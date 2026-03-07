import React, { useState, useEffect, useRef } from 'react';
import PremiumModal from '../components/PremiumModal';
import ProfileCompletion from '../components/ProfileCompletion';
import SafeImage from '../components/SafeImage';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import { storage } from '../utils/storage';
import { runPremiumPurchase } from '../utils/premiumPurchase';
import { getCurrentUid, isDemoMode } from '../auth';
import { usePremiumContext } from '../contexts/PremiumContext';
import { getProfile, upsertMyProfile } from '../firestore';
import { uploadProfilePhoto } from '../utils/uploadImage';
import { usCities } from '../data/cities';
import { useToast } from '../hooks/useToast';
import './Profile.css';

export default function Profile() {
  const { showToast, ToastContainer } = useToast();
  const [name, setName] = useState('You');
  const [age, setAge] = useState('');
  const [bio, setBio] = useState('Add a bio to tell others about yourself...');
  const [interests, setInterests] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [sexualOrientation, setSexualOrientation] = useState('Gay');
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [into, setInto] = useState<string[]>([]);
  const [intent, setIntent] = useState('Just Browsing');
  const [vibeStyle, setVibeStyle] = useState('Chill');
  const [vibeType, setVibeType] = useState<string>('Chill');
  const [tonightLookingFor, setTonightLookingFor] = useState<string>('');
  const [height, setHeight] = useState('');
  const [bodyType, setBodyType] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [instagram, setInstagram] = useState('');
  const [goingOutTonight, setGoingOutTonight] = useState(false);
  const [hookUpNow, setHookUpNow] = useState(false);
  const [pronouns, setPronouns] = useState('He/Him');
  const [genderIdentity, setGenderIdentity] = useState('Man');
  const [kinks, setKinks] = useState<string[]>([]);
  const [photoBlurEnabled, setPhotoBlurEnabled] = useState(false);
  const [verified, setVerified] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [safeMode, setSafeMode] = useState(false);
  const [nsfwEnabled, setNsfwEnabled] = useState(false);
  const [photoRulesAccepted, setPhotoRulesAccepted] = useState(false);
  const [allowBlurredBody, setAllowBlurredBody] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumFeature, setPremiumFeature] = useState('');
  const premiumFeatures = usePremiumContext();
  const [currentCity, setCurrentCity] = useState('');
  const [isProfileHidden, setIsProfileHidden] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [newInterest, setNewInterest] = useState('');
  const [showKinkModal, setShowKinkModal] = useState(false);
  const [newKink, setNewKink] = useState('');
  const [showCityModal, setShowCityModal] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [cityModalFromNavigate, setCityModalFromNavigate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const intentOptions = ['Friends', 'Events', 'Dating', 'Just Browsing', 'Hookups', 'Clubbing'];
  const vibeOptions = ['Party', 'Chill', 'Romantic', 'Wild', 'Travel'];
  const tonightOptions = ['Hookup', 'Date', 'Going Out', 'Friends', 'Clubbing'];
  const bodyTypeOptions = ['Slim', 'Athletic', 'Average', 'Muscular', 'Bear', 'Dad bod', 'Prefer not to say'];
  const roleOptions = ['Top', 'Bottom', 'Versatile', 'Side', 'Prefer not to say'];
  const intoOptions = ['Men', 'Women', 'Trans', 'Non-binary', 'Everyone'];

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      let profile = storage.getUserProfile() || {};
      
      // Load from Firestore for real users (source of truth)
      if (!isDemoMode()) {
        const uid = getCurrentUid();
        if (uid) {
          const firestoreProfile = await getProfile(uid);
          if (firestoreProfile) {
            profile = {
              ...profile,
              name: firestoreProfile.name || profile?.name,
              age: firestoreProfile.age?.toString() ?? profile?.age?.toString(),
              bio: firestoreProfile.bio ?? profile?.bio,
              interests: firestoreProfile.tags ?? profile?.interests ?? [],
              photos: firestoreProfile.photos ?? profile?.photos ?? [],
              sexualOrientation: firestoreProfile.sexualOrientation ?? profile?.sexualOrientation,
              lookingFor: firestoreProfile.lookingFor ?? profile?.lookingFor ?? [],
              into: (firestoreProfile as any).into ?? profile?.into ?? [],
              intent: firestoreProfile.intent ?? profile?.intent,
              vibeStyle: firestoreProfile.vibeStyle ?? profile?.vibeStyle,
              vibeType: firestoreProfile.vibeType ?? profile?.vibeType,
              tonightLookingFor: firestoreProfile.tonightLookingFor ?? profile?.tonightLookingFor,
              height: firestoreProfile.height ?? profile?.height,
              bodyType: firestoreProfile.bodyType ?? profile?.bodyType,
              role: firestoreProfile.role ?? profile?.role,
              instagram: firestoreProfile.instagram ?? profile?.instagram,
              goingOutTonight: firestoreProfile.goingOutTonight ?? profile?.goingOutTonight,
              hookUpNow: firestoreProfile.hookUpNow ?? profile?.hookUpNow,
              pronouns: firestoreProfile.pronouns ?? profile?.pronouns,
              genderIdentity: firestoreProfile.genderIdentity ?? profile?.genderIdentity,
              kinks: firestoreProfile.kinks ?? profile?.kinks ?? [],
              photoBlurEnabled: firestoreProfile.photoBlurEnabled ?? profile?.photoBlurEnabled,
              verified: firestoreProfile.verified ?? profile?.verified,
              anonymous: firestoreProfile.anonymous ?? profile?.anonymous,
              safeMode: firestoreProfile.safeMode ?? profile?.safeMode,
              nsfwEnabled: (firestoreProfile as any).nsfwEnabled ?? profile?.nsfwEnabled,
              photoRulesAccepted: (firestoreProfile as any).photoRulesAccepted ?? profile?.photoRulesAccepted,
              allowBlurredBody: (firestoreProfile as any).allowBlurredBody ?? profile?.allowBlurredBody,
              currentCity: (firestoreProfile as any).currentCity ?? profile?.currentCity,
              isProfileHidden: (firestoreProfile as any).isProfileHidden ?? profile?.isProfileHidden,
            };
            storage.saveUserProfile(profile);
          }
        }
      }
      
      if (profile) {
        setName(profile.name || 'You');
        setAge(profile.age?.toString() || '');
        setBio(profile.bio || 'Add a bio to tell others about yourself...');
        setInterests(profile.interests || []);
        setPhotos(profile.photos || []);
        setSexualOrientation(profile.sexualOrientation || 'Gay');
        setLookingFor(profile.lookingFor || []);
        setInto(profile.into || []);
        setIntent(profile.intent || 'Just Browsing');
        setVibeStyle(profile.vibeStyle || 'Chill');
        setVibeType(profile.vibeType || profile.vibeStyle || 'Chill');
        setTonightLookingFor(profile.tonightLookingFor || '');
        setHeight(profile.height || '');
        setBodyType(profile.bodyType || '');
        setRole(profile.role || '');
        setInstagram(profile.instagram || '');
        setGoingOutTonight(profile.goingOutTonight || false);
        setHookUpNow(profile.hookUpNow || false);
        setCurrentCity(normalizeCityName(profile.currentCity));
        setIsProfileHidden(profile.isProfileHidden || false);
        setPronouns(profile.pronouns || 'He/Him');
        setGenderIdentity(profile.genderIdentity || 'Man');
        setKinks(profile.kinks || []);
        setPhotoBlurEnabled(profile.photoBlurEnabled || false);
        setVerified(profile.verified || false);
        setAnonymous(profile.anonymous || false);
        setSafeMode(profile.safeMode || false);
        setNsfwEnabled(profile.nsfwEnabled || false);
        setPhotoRulesAccepted(profile.photoRulesAccepted || false);
        setAllowBlurredBody(profile.allowBlurredBody ?? true);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, etc.)');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('Image size must be less than 5MB. Please compress your image.');
      return;
    }

    try {
      setError(null);
      const photoUrl = await uploadProfilePhoto(file);
      setPhotos((prev) => [...prev, photoUrl]);
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError('Failed to upload photo. Please try again.');
    }
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const saveProfile = async () => {
    // Validation
    if (!name || name.trim() === '' || name === 'You') {
      setError('Please enter your name');
      return;
    }

    if (!age || parseInt(age) < 18) {
      setError('You must be at least 18 years old');
      return;
    }

    if (photos.length === 0) {
      setError('Please add at least one photo. Your first photo must be a clear face picture.');
      return;
    }

    if (!photoRulesAccepted) {
      setError('Please accept the photo rules. Your first photo must be a clear face picture.');
      return;
    }

    if (!currentCity || currentCity.trim() === '') {
      setError('Please choose your location');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const profile = { 
        name: name.trim(), 
        age: parseInt(age), 
        bio, 
        interests, 
        photos, 
        sexualOrientation, 
        lookingFor, 
        into,
        intent,
        vibeStyle,
        vibeType,
        tonightLookingFor: tonightLookingFor || undefined,
        height: height || undefined,
        bodyType: bodyType || undefined,
        role: role || undefined,
        instagram: instagram || undefined,
        goingOutTonight,
        hookUpNow,
        currentCity,
        isProfileHidden,
        pronouns,
        genderIdentity,
        kinks,
        photoBlurEnabled,
        verified,
        anonymous,
        safeMode,
        nsfwEnabled,
        photoRulesAccepted,
        allowBlurredBody,
      };
      
      storage.saveUserProfile(profile);
      
      // Sync to Firestore so profile is visible to others
      if (!isDemoMode()) {
        try {
          await upsertMyProfile({
            ...profile,
            age: profile.age?.toString?.() ?? String(profile.age),
          });
          showToast('Profile saved and synced to cloud!', 'success');
        } catch (err) {
          console.error('Failed to sync profile to cloud:', err);
          showToast('Saved locally. Sync to cloud failed – try again.', 'error');
          setIsSaving(false);
          return;
        }
      } else {
        showToast('Saved locally. Sign in with email/Google to sync to Firebase.', 'info');
      }
      
      setIsEditing(false);
      setIsSaving(false);
      
      // Force ProfileCompletion to re-render by triggering a state update
      window.dispatchEvent(new CustomEvent('profileUpdated'));
      // Reload profile to ensure state is synced
      loadProfile();
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile. Please try again.');
      setIsSaving(false);
    }
  };

  const addInterest = () => {
    const interest = newInterest.trim();
    if (!interest) {
      showToast('Add an interest before saving.', 'info');
      return;
    }
    setInterests([...interests, interest]);
    setNewInterest('');
    setShowInterestModal(false);
  };

  const removeInterest = (index: number) => {
    setInterests(interests.filter((_, i) => i !== index));
  };

  const toggleLookingFor = (item: string) => {
    if (lookingFor.includes(item)) {
      setLookingFor(lookingFor.filter(i => i !== item));
    } else {
      setLookingFor([...lookingFor, item]);
    }
  };

  const addKink = () => {
    const kink = newKink.trim();
    if (!kink) {
      showToast('Add a kink before saving.', 'info');
      return;
    }
    setKinks([...kinks, kink]);
    setNewKink('');
    setShowKinkModal(false);
  };

  const removeKink = (index: number) => {
    setKinks(kinks.filter((_, i) => i !== index));
  };

  const handleHideProfile = () => {
    if (!premiumFeatures.hasPremium) {
      setPremiumFeature('premium');
      setShowPremiumModal(true);
      return;
    }
    setIsProfileHidden(!isProfileHidden);
    const profile = storage.getUserProfile();
    storage.saveUserProfile({ ...profile, isProfileHidden: !isProfileHidden });
    showToast(isProfileHidden ? 'Profile is now visible.' : 'Profile is now hidden.', 'success');
  };

  const normalizeCityName = (city?: string) => {
    if (!city) return '';
    if (city === 'Near Me') return city;
    if (city.includes(',')) return city;

    const match = usCities.find(c => c.name.toLowerCase() === city.toLowerCase());
    if (match) {
      return `${match.name}, ${match.state}`;
    }

    return city;
  };

  const handleNavigateCity = () => {
    setCitySearch('');
    setCityModalFromNavigate(true);
    setShowCityModal(true);
  };

  const handleChooseLocation = () => {
    setCitySearch('');
    setCityModalFromNavigate(false);
    setShowCityModal(true);
  };

  const handleSelectCity = (city: string) => {
    if (city === 'Near Me') {
      navigator.geolocation.getCurrentPosition(
        () => {
          setCurrentCity('Near Me');
          const profile = storage.getUserProfile() || {};
          storage.saveUserProfile({ ...profile, currentCity: 'Near Me' });
          window.dispatchEvent(new CustomEvent('switchTab', { detail: { tab: 'map' } }));
          showToast('Location set to your current location. Opening Map...', 'success');
          setShowCityModal(false);
        },
        () => {
          showToast('Unable to get your location. Please enable location permissions.', 'error');
        }
      );
      return;
    }

    const selectedCity = normalizeCityName(city);
    setCurrentCity(selectedCity);
    const profile = storage.getUserProfile() || {};
    const updatedProfile = { ...profile, currentCity: selectedCity };
    storage.saveUserProfile(updatedProfile);

    if (cityModalFromNavigate) {
      window.dispatchEvent(new CustomEvent('switchTab', { detail: { tab: 'map' } }));
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('changeMapLocation', { detail: { city: selectedCity } }));
      }, 500);
      showToast(`Location changed to ${selectedCity}. Opening Map...`, 'success');
    } else {
      showToast(`Location set to ${selectedCity}. Tap Save to update your profile.`, 'success');
    }
    setShowCityModal(false);
  };

  const handlePurchase = async (feature: string) => {
    const purchase = await runPremiumPurchase(feature);
    if (!purchase.success) {
      showToast(`Purchase failed: ${purchase.message}`, 'error');
      setShowPremiumModal(false);
      return;
    }
    // Web: opening Stripe link - do NOT grant premium. Webhook → Firestore will update when paid.
    if ((purchase as { webOpened?: boolean }).webOpened) {
      showToast(purchase.message || 'Complete checkout in the new tab. Premium activates when payment is confirmed.', 'info');
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
    }
    
    storage.savePremiumFeatures(updated);
    showToast(`Thank you for your purchase! ${feature} has been activated.`, 'success');
    setShowPremiumModal(false);
  };

  const filteredCities = usCities
    .map((city) => `${city.name}, ${city.state}`)
    .filter((cityLabel) => cityLabel.toLowerCase().includes(citySearch.toLowerCase()))
    .slice(0, 50);

  if (isLoading) {
    return <Loading message="Loading profile..." fullScreen />;
  }

  return (
    <div className="profile-container">
      <ToastContainer />
      {error && (
        <ErrorMessage 
          message={error} 
          onDismiss={() => setError(null)} 
          type="error"
        />
      )}
      <ProfileCompletion />
      {isDemoMode() && (
        <div className="profile-demo-banner">
          Demo mode – profile saved locally only. Sign out and sign in with email or Google to sync to Firebase.
        </div>
      )}
      <div className="profile-header">
        <div className="profile-photos-section">
          {photos.length > 0 ? (
            <>
            <div className="profile-photo-face-hint">First photo: clear face picture</div>
            <div className="profile-photos-grid">
              {photos.map((photo, index) => (
                <div key={index} className="profile-photo-item">
                  <SafeImage src={photo} alt={`Photo ${index + 1}`} className="profile-photo" />
                  {isEditing && (
                    <button
                      className="profile-remove-photo"
                      onClick={() => removePhoto(index)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            </>
          ) : (
            <div className="profile-photo-placeholder">
              <div className="placeholder-icon">📷</div>
              <div className="placeholder-text">Add at least one photo</div>
              <div className="placeholder-hint">First photo must be a clear face picture</div>
            </div>
          )}
          {isEditing && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                style={{ display: 'none' }}
              />
              <button
                className="profile-add-photo-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                + Add Photo
              </button>
            </>
          )}
        </div>
        
        <button
          className="profile-edit-button"
          onClick={() => isEditing ? saveProfile() : setIsEditing(true)}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : isEditing ? 'Save' : 'Edit'}
        </button>
      </div>

      <div className="profile-content">
        <div className="profile-section">
          <label className="profile-label">Intent</label>
          {isEditing ? (
            <div className="profile-looking-for-options">
              {intentOptions.map((option) => (
                <button
                  key={option}
                  className={`profile-looking-for-btn ${intent === option ? 'active' : ''}`}
                  onClick={() => setIntent(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <div className="profile-value">{intent || 'Not specified'}</div>
          )}
        </div>

        <div className="profile-section">
          <label className="profile-label">Vibe Type</label>
          {isEditing ? (
            <div className="profile-looking-for-options">
              {vibeOptions.map((option) => (
                <button
                  key={option}
                  className={`profile-looking-for-btn ${vibeType === option ? 'active' : ''}`}
                  onClick={() => setVibeType(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <div className="profile-value">{vibeType || 'Not specified'}</div>
          )}
        </div>

        <div className="profile-section">
          <label className="profile-label">Tonight I'm looking for</label>
          {isEditing ? (
            <div className="profile-looking-for-options">
              {tonightOptions.map((option) => (
                <button
                  key={option}
                  className={`profile-looking-for-btn ${tonightLookingFor === option ? 'active' : ''}`}
                  onClick={() => setTonightLookingFor(tonightLookingFor === option ? '' : option)}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <div className="profile-value">{tonightLookingFor || 'Not set'}</div>
          )}
        </div>

        <div className="profile-section">
          <label className="profile-label">Going Out Tonight</label>
          {isEditing ? (
            <div className="profile-toggle">
              <button
                className={`toggle-btn ${goingOutTonight ? 'active' : ''}`}
                onClick={() => setGoingOutTonight(!goingOutTonight)}
              >
                {goingOutTonight ? '🌙 Yes' : 'No'}
              </button>
            </div>
          ) : (
            <div className="profile-value">{goingOutTonight ? '🌙 Going out tonight' : 'Not going out'}</div>
          )}
        </div>
        <div className="profile-section">
          <label className="profile-label">Name</label>
          {isEditing ? (
            <input
              className="profile-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          ) : (
            <div className="profile-value">{name}</div>
          )}
        </div>

        <div className="profile-section">
          <label className="profile-label">Age</label>
          {isEditing ? (
            <input
              className="profile-input"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Your age"
            />
          ) : (
            <div className="profile-value">{age || 'Not set'}</div>
          )}
        </div>

        <div className="profile-section">
          <label className="profile-label">Height</label>
          {isEditing ? (
            <input
              className="profile-input"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="e.g. 5'10&quot;"
            />
          ) : (
            <div className="profile-value">{height || 'Not set'}</div>
          )}
        </div>

        <div className="profile-section">
          <label className="profile-label">Body Type</label>
          {isEditing ? (
            <div className="profile-looking-for-options">
              {bodyTypeOptions.map((option) => (
                <button
                  key={option}
                  className={`profile-looking-for-btn ${bodyType === option ? 'active' : ''}`}
                  onClick={() => setBodyType(bodyType === option ? '' : option)}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <div className="profile-value">{bodyType || 'Not set'}</div>
          )}
        </div>

        <div className="profile-section">
          <label className="profile-label">Role</label>
          {isEditing ? (
            <div className="profile-looking-for-options">
              {roleOptions.map((option) => (
                <button
                  key={option}
                  className={`profile-looking-for-btn ${role === option ? 'active' : ''}`}
                  onClick={() => setRole(role === option ? '' : option)}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <div className="profile-value">{role || 'Not set'}</div>
          )}
        </div>

        <div className="profile-section">
          <label className="profile-label">Instagram</label>
          {isEditing ? (
            <input
              className="profile-input"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@username"
            />
          ) : (
            <div className="profile-value">{instagram ? (instagram.startsWith('@') ? instagram : `@${instagram}`) : 'Not set'}</div>
          )}
        </div>

        <div className="profile-section">
          <label className="profile-label">Location</label>
          <div className="profile-value">
            {currentCity || 'Not set – tap to choose'}
          </div>
          <button
            type="button"
            className="auth-link"
            style={{ marginTop: 4, display: 'block' }}
            onClick={handleChooseLocation}
          >
            {currentCity ? 'Change location' : 'Choose your location'}
          </button>
        </div>

        <div className="profile-section">
          <label className="profile-label">Sexual Orientation</label>
          {isEditing ? (
            <select
              className="profile-input"
              value={sexualOrientation}
              onChange={(e) => setSexualOrientation(e.target.value)}
            >
              <option value="Gay">Gay</option>
              <option value="Bisexual">Bisexual</option>
              <option value="Pansexual">Pansexual</option>
              <option value="Queer">Queer</option>
              <option value="Questioning">Questioning</option>
            </select>
          ) : (
            <div className="profile-value">{sexualOrientation}</div>
          )}
        </div>

        <div className="profile-section">
          <label className="profile-label">Looking For</label>
          {isEditing ? (
            <div className="profile-looking-for-options">
              {['Dates', 'Friends', 'Relationship', 'Hookups', 'Fun'].map((option) => (
                <button
                  key={option}
                  className={`profile-looking-for-btn ${lookingFor.includes(option) ? 'active' : ''}`}
                  onClick={() => toggleLookingFor(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <div className="profile-value">
              {lookingFor.length > 0 ? lookingFor.join(', ') : 'Not specified'}
            </div>
          )}
        </div>

        <div className="profile-section">
          <label className="profile-label">Into</label>
          <span className="profile-hint">Who you're attracted to</span>
          {isEditing ? (
            <div className="profile-looking-for-options">
              {intoOptions.map((option) => (
                <button
                  key={option}
                  className={`profile-looking-for-btn ${into.includes(option) ? 'active' : ''}`}
                  onClick={() => {
                    setInto(prev =>
                      prev.includes(option) ? prev.filter((x) => x !== option) : [...prev, option]
                    );
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <div className="profile-value">
              {into.length > 0 ? into.join(', ') : 'Not specified'}
            </div>
          )}
        </div>

        <div className="profile-section">
          <label className="profile-label">Hook Up Now</label>
          {isEditing ? (
            <div className="profile-toggle">
              <button
                className={`toggle-btn ${hookUpNow ? 'active' : ''}`}
                onClick={() => {
                  const newValue = !hookUpNow;
                  setHookUpNow(newValue);
                  const profile = storage.getUserProfile() || {};
                  const updatedProfile = { ...profile, hookUpNow: newValue };
                  storage.saveUserProfile(updatedProfile);
                  window.dispatchEvent(new CustomEvent('profileUpdated'));
                }}
              >
                {hookUpNow ? '🔥 ON' : 'OFF'}
              </button>
              <span className="toggle-label">Show you're available right now</span>
            </div>
          ) : (
            <div className="profile-value">
              {hookUpNow ? '🔥 Available Now' : 'Not available'}
            </div>
          )}
        </div>

        <div className="profile-section">
          <label className="profile-label">Bio</label>
          {isEditing ? (
            <textarea
              className="profile-input profile-bio-input"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others about yourself..."
              rows={4}
            />
          ) : (
            <div className="profile-value">{bio}</div>
          )}
        </div>

        <div className="profile-section">
          <div className="profile-interests-header">
            <label className="profile-label">Interests</label>
            {isEditing && (
              <button className="profile-add-interest" onClick={() => setShowInterestModal(true)}>
                ➕
              </button>
            )}
          </div>
          <div className="profile-interests">
            {interests.length === 0 ? (
              <div className="profile-empty-interests">No interests added yet</div>
            ) : (
              interests.map((interest, index) => (
                <span key={index} className="profile-interest-tag">
                  {interest}
                  {isEditing && (
                    <button
                      className="profile-remove-interest"
                      onClick={() => removeInterest(index)}
                    >
                      ✕
                    </button>
                  )}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="profile-section">
          <div className="profile-interests-header">
            <label className="profile-label">Kinks / Fetishes</label>
            {isEditing && (
              <button className="profile-add-interest" onClick={() => setShowKinkModal(true)}>
                ➕
              </button>
            )}
          </div>
          <div className="profile-interests">
            {kinks.length === 0 ? (
              <div className="profile-empty-interests">No kinks added yet</div>
            ) : (
              kinks.map((kink, index) => (
                <span key={index} className="profile-interest-tag profile-kink-tag">
                  {kink}
                  {isEditing && (
                    <button
                      className="profile-remove-interest"
                      onClick={() => removeKink(index)}
                    >
                      ✕
                    </button>
                  )}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="profile-section">
          <label className="profile-label">Privacy & Safety</label>
          <div className="profile-toggle-section">
            <div className="profile-toggle-item">
              <span>Photo Blur</span>
              <button
                className={`toggle-btn ${photoBlurEnabled ? 'active' : ''}`}
                onClick={() => {
                  const newValue = !photoBlurEnabled;
                  setPhotoBlurEnabled(newValue);
                  const profile = storage.getUserProfile() || {};
                  const updatedProfile = { ...profile, photoBlurEnabled: newValue };
                  storage.saveUserProfile(updatedProfile);
                  window.dispatchEvent(new CustomEvent('profileUpdated'));
                }}
              >
                {photoBlurEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="profile-toggle-item">
              <span>Anonymous Mode</span>
              <button
                className={`toggle-btn ${anonymous ? 'active' : ''}`}
                onClick={() => {
                  const newValue = !anonymous;
                  setAnonymous(newValue);
                  const profile = storage.getUserProfile() || {};
                  const updatedProfile = { ...profile, anonymous: newValue };
                  storage.saveUserProfile(updatedProfile);
                  window.dispatchEvent(new CustomEvent('profileUpdated'));
                }}
              >
                {anonymous ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="profile-toggle-item">
              <span>Safe Mode (Hide Location)</span>
              <button
                className={`toggle-btn ${safeMode ? 'active' : ''}`}
                onClick={() => {
                  const newValue = !safeMode;
                  setSafeMode(newValue);
                  const profile = storage.getUserProfile() || {};
                  const updatedProfile = { ...profile, safeMode: newValue };
                  storage.saveUserProfile(updatedProfile);
                  window.dispatchEvent(new CustomEvent('profileUpdated'));
                }}
              >
                {safeMode ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="profile-toggle-item">
              <span>NSFW Content</span>
              <button
                className={`toggle-btn ${nsfwEnabled ? 'active' : ''}`}
                onClick={() => {
                  const newValue = !nsfwEnabled;
                  setNsfwEnabled(newValue);
                  const profile = storage.getUserProfile() || {};
                  const updatedProfile = { ...profile, nsfwEnabled: newValue };
                  storage.saveUserProfile(updatedProfile);
                  window.dispatchEvent(new CustomEvent('profileUpdated'));
                }}
              >
                {nsfwEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="profile-toggle-item">
              <span>Photo Rules Accepted</span>
              <button
                className={`toggle-btn ${photoRulesAccepted ? 'active' : ''}`}
                onClick={() => {
                  const newValue = !photoRulesAccepted;
                  setPhotoRulesAccepted(newValue);
                  const profile = storage.getUserProfile() || {};
                  const updatedProfile = { ...profile, photoRulesAccepted: newValue };
                  storage.saveUserProfile(updatedProfile);
                }}
              >
                {photoRulesAccepted ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="profile-toggle-item">
              <span>Allow Blurred Body Photos</span>
              <button
                className={`toggle-btn ${allowBlurredBody ? 'active' : ''}`}
                onClick={() => {
                  const newValue = !allowBlurredBody;
                  setAllowBlurredBody(newValue);
                  const profile = storage.getUserProfile() || {};
                  const updatedProfile = { ...profile, allowBlurredBody: newValue };
                  storage.saveUserProfile(updatedProfile);
                }}
              >
                {allowBlurredBody ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="profile-toggle-item">
              <span>Face Verification</span>
              <button
                className={`toggle-btn ${verified ? 'active' : ''}`}
                onClick={() => {
                  const newValue = !verified;
                  setVerified(newValue);
                  const profile = storage.getUserProfile() || {};
                  const updatedProfile = { ...profile, verified: newValue };
                  storage.saveUserProfile(updatedProfile);
                  showToast(newValue ? 'Verification request submitted.' : 'Verification removed.', 'info');
                }}
              >
                {verified ? 'ON' : 'OFF'}
              </button>
            </div>
            {verified && (
              <div className="verified-badge-section">
                <span className="verified-badge">✓ Verified</span>
              </div>
            )}
          </div>
        </div>

        <div className="profile-section">
          <label className="profile-label">Premium Features</label>
          <div className="premium-section">
            <button
              className="premium-feature-btn"
              onClick={() => {
                if (premiumFeatures.hasPremium) {
                  showToast('You already have Premium.', 'info');
                } else {
                  setPremiumFeature('premium');
                  setShowPremiumModal(true);
                }
              }}
            >
              <span>👑</span>
              <div>
                <div className="premium-feature-title">VibeUp Premium</div>
                <div className="premium-feature-desc">$9.99/mo · Who viewed you, unlimited likes & more</div>
              </div>
              <span>→</span>
            </button>
          </div>
        </div>

        {premiumFeatures.hasPremium && (
          <>
            <div className="profile-section">
              <button
                className="profile-premium-btn"
                onClick={handleHideProfile}
              >
                <span>👁️</span>
                <span>{isProfileHidden ? 'Show Profile' : 'Hide Profile'}</span>
                <span>→</span>
              </button>
            </div>

            <div className="profile-section">
              <button
                className="profile-premium-btn"
                onClick={handleNavigateCity}
              >
                <span>✈️</span>
                <span>Navigate to City</span>
                <span>→</span>
              </button>
            </div>

            <div className="profile-section">
              <button
                className="profile-premium-btn"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('showWhoViewed'));
                }}
              >
                <span>👀</span>
                <span>Who Viewed You</span>
                <span>→</span>
              </button>
            </div>

            <div className="profile-section">
              <button
                className="profile-premium-btn"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('showCommunities'));
                }}
              >
                <span>👥</span>
                <span>Exclusive Communities</span>
                <span>→</span>
              </button>
            </div>
          </>
        )}

        <div className="profile-section">
          <button
            className="profile-settings-button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('showSettings'));
            }}
          >
            <span>⚙️</span>
            <span>Settings</span>
            <span>→</span>
          </button>
        </div>
      </div>

      <PremiumModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onPurchase={handlePurchase}
        feature={premiumFeature}
      />

      {showInterestModal && (
        <div className="profile-modal-overlay" onClick={() => setShowInterestModal(false)}>
          <div className="profile-modal-content" onClick={(event) => event.stopPropagation()}>
            <h3>Add Interest</h3>
            <input
              className="profile-modal-input"
              value={newInterest}
              onChange={(event) => setNewInterest(event.target.value)}
              placeholder="e.g. Travel, Gym, Gaming"
            />
            <div className="profile-modal-actions">
              <button className="profile-modal-btn cancel" onClick={() => setShowInterestModal(false)}>Cancel</button>
              <button className="profile-modal-btn save" onClick={addInterest}>Add</button>
            </div>
          </div>
        </div>
      )}

      {showKinkModal && (
        <div className="profile-modal-overlay" onClick={() => setShowKinkModal(false)}>
          <div className="profile-modal-content" onClick={(event) => event.stopPropagation()}>
            <h3>Add Kink / Fetish</h3>
            <input
              className="profile-modal-input"
              value={newKink}
              onChange={(event) => setNewKink(event.target.value)}
              placeholder="Enter your preference"
            />
            <div className="profile-modal-actions">
              <button className="profile-modal-btn cancel" onClick={() => setShowKinkModal(false)}>Cancel</button>
              <button className="profile-modal-btn save" onClick={addKink}>Add</button>
            </div>
          </div>
        </div>
      )}

      {showCityModal && (
        <div className="profile-modal-overlay" onClick={() => setShowCityModal(false)}>
          <div className="profile-modal-content" onClick={(event) => event.stopPropagation()}>
            <h3>Navigate to City</h3>
            <input
              className="profile-modal-input"
              value={citySearch}
              onChange={(event) => setCitySearch(event.target.value)}
              placeholder="Search city..."
            />
            <div className="profile-city-list">
              <button className="profile-city-item" onClick={() => handleSelectCity('Near Me')}>
                Near Me
              </button>
              {filteredCities.map((cityLabel) => (
                <button key={cityLabel} className="profile-city-item" onClick={() => handleSelectCity(cityLabel)}>
                  {cityLabel}
                </button>
              ))}
            </div>
            <div className="profile-modal-actions">
              <button className="profile-modal-btn cancel" onClick={() => setShowCityModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
