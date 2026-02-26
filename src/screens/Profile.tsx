import React, { useState, useEffect, useRef } from 'react';
import PremiumModal from '../components/PremiumModal';
import ProfileCompletion from '../components/ProfileCompletion';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import { storage } from '../utils/storage';
import { runPremiumPurchase } from '../utils/premiumPurchase';
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
  const [intent, setIntent] = useState('Just Browsing');
  const [vibeStyle, setVibeStyle] = useState('Chill');
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
  const [premiumFeatures, setPremiumFeatures] = useState(storage.getPremiumFeatures());
  const [currentCity, setCurrentCity] = useState('New York, NY');
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const intentOptions = ['Friends', 'Events', 'Dating', 'Just Browsing'];
  const vibeOptions = ['Chill', 'Wild', 'Dom', 'Sub', 'Artistic', 'Techie'];

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const profile = storage.getUserProfile();
      if (profile) {
        setName(profile.name || 'You');
        setAge(profile.age?.toString() || '');
        setBio(profile.bio || 'Add a bio to tell others about yourself...');
        setInterests(profile.interests || []);
        setPhotos(profile.photos || []);
        setSexualOrientation(profile.sexualOrientation || 'Gay');
        setLookingFor(profile.lookingFor || []);
        setIntent(profile.intent || 'Just Browsing');
        setVibeStyle(profile.vibeStyle || 'Chill');
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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, etc.)');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      setError('Image size must be less than 5MB. Please compress your image.');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const photoUrl = reader.result as string;
        setPhotos([...photos, photoUrl]);
        setError(null);
      };
      reader.onerror = () => {
        setError('Failed to load image. Please try again.');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError('Failed to upload photo. Please try again.');
    }
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
      setError('Please add at least one photo to your profile');
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
        intent,
        vibeStyle,
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
      
      // Simulate save delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setIsEditing(false);
      setIsSaving(false);
      showToast('Profile updated successfully!', 'success');
      
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
    if (!city) return 'New York, NY';
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

    window.dispatchEvent(new CustomEvent('switchTab', { detail: { tab: 'map' } }));
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('changeMapLocation', { detail: { city: selectedCity } }));
    }, 500);

    showToast(`Location changed to ${selectedCity}. Opening Map...`, 'success');
    setShowCityModal(false);
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
    }
    
    setPremiumFeatures(updated);
    storage.savePremiumFeatures(updated);
    showToast(`Thank you for your purchase! ${feature} has been activated.`, 'success');
    setShowPremiumModal(false);
  };

  const filteredCities = usCities
    .map((city) => `${city.name}, ${city.state}`)
    .filter((cityLabel) => cityLabel.toLowerCase().includes(citySearch.toLowerCase()))
    .slice(0, 25);

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
      <div className="profile-header">
        <div className="profile-photos-section">
          {photos.length > 0 ? (
            <div className="profile-photos-grid">
              {photos.map((photo, index) => (
                <div key={index} className="profile-photo-item">
                  <img src={photo} alt={`Photo ${index + 1}`} className="profile-photo" />
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
          ) : (
            <div className="profile-photo-placeholder">
              <div className="placeholder-icon">📷</div>
              <div className="placeholder-text">Add at least one photo</div>
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
          <label className="profile-label">Vibe Style</label>
          {isEditing ? (
            <div className="profile-looking-for-options">
              {vibeOptions.map((option) => (
                <button
                  key={option}
                  className={`profile-looking-for-btn ${vibeStyle === option ? 'active' : ''}`}
                  onClick={() => setVibeStyle(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <div className="profile-value">{vibeStyle || 'Not specified'}</div>
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
          <label className="profile-label">Location</label>
          <div className="profile-value">{currentCity}</div>
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
                <div className="premium-feature-desc">Unlimited likes, Super Likes & more</div>
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
