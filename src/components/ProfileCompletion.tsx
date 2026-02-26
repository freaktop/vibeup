import React, { useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import './ProfileCompletion.css';

export default function ProfileCompletion() {
  const [, setUpdateTrigger] = useState(0);
  
  useEffect(() => {
    const handleProfileUpdate = () => {
      setUpdateTrigger(prev => prev + 1);
    };
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, []);

  const profile = storage.getUserProfile();

  const calculateCompletion = () => {
    if (!profile) return 0;

    let completed = 0;
    const total = 11;

    if (profile.name && profile.name !== 'You') completed++;
    if (profile.age) completed++;
    if (profile.bio && profile.bio !== 'Add a bio to tell others about yourself...') completed++;
    if (profile.photos && profile.photos.length > 0) completed++;
    if (profile.interests && profile.interests.length > 0) completed++;
    if (profile.sexualOrientation) completed++;
    if (profile.lookingFor && profile.lookingFor.length > 0) completed++;
    if (profile.pronouns) completed++;
    if (profile.intent) completed++;
    if (profile.vibeStyle) completed++;
    if (profile.photoRulesAccepted) completed++;

    return Math.round((completed / total) * 100);
  };

  const completion = calculateCompletion();

  if (completion === 100) {
    return null; // Don't show if complete
  }

  const getMissingItems = () => {
    const missing: string[] = [];
    if (!profile?.name || profile.name === 'You') missing.push('Name');
    if (!profile?.age) missing.push('Age');
    if (!profile?.photos || profile.photos.length === 0) missing.push('Photos');
    if (!profile?.bio || profile.bio === 'Add a bio to tell others about yourself...') missing.push('Bio');
    if (!profile?.interests || profile.interests.length === 0) missing.push('Interests');
    if (!profile?.sexualOrientation) missing.push('Orientation');
    if (!profile?.lookingFor || profile.lookingFor.length === 0) missing.push('Looking For');
    if (!profile?.pronouns) missing.push('Pronouns');
    if (!profile?.intent) missing.push('Intent');
    if (!profile?.vibeStyle) missing.push('Vibe');
    if (!profile?.photoRulesAccepted) missing.push('Photo Rules');
    return missing;
  };

  const missing = getMissingItems();

  return (
    <div className="profile-completion">
      <div className="completion-header">
        <span className="completion-label">Profile Completion</span>
        <span className="completion-percentage">{completion}%</span>
      </div>
      <div className="completion-bar">
        <div
          className="completion-fill"
          style={{ width: `${completion}%` }}
        />
      </div>
      {missing.length > 0 && (
        <div className="completion-missing">
          <span className="missing-label">Add: {missing.slice(0, 3).join(', ')}{missing.length > 3 ? '...' : ''}</span>
        </div>
      )}
    </div>
  );
}
