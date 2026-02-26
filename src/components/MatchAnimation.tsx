import React, { useEffect, useState } from 'react';
import './MatchAnimation.css';

interface MatchAnimationProps {
  profileName: string;
  profilePhoto: string;
  profileId?: string;
  onClose: () => void;
  onMessage?: (profileId: string) => void;
}

export default function MatchAnimation({ profileName, profilePhoto, profileId, onClose, onMessage }: MatchAnimationProps) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onClose, 500);
    }, 5000); // Increased to 5 seconds so user has time to click

    return () => clearTimeout(timer);
  }, [onClose]);

  const handleMessage = () => {
    if (profileId && onMessage) {
      onMessage(profileId);
      setShow(false);
      setTimeout(onClose, 200);
    } else {
      onClose();
    }
  };

  if (!show) return null;

  return (
    <div className="match-animation-overlay">
      <div className="match-animation-content">
        <div className="match-hearts">
          <span className="heart heart-1">💚</span>
          <span className="heart heart-2">💚</span>
          <span className="heart heart-3">💚</span>
        </div>
        <h1 className="match-title">It's a Match!</h1>
        <p className="match-subtitle">You and {profileName} liked each other</p>
        <div className="match-photos">
          <div className="match-photo-circle">
            <img src={profilePhoto} alt={profileName} />
          </div>
          <div className="match-photo-circle">
            <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop" alt="You" />
          </div>
        </div>
        <button className="match-button" onClick={handleMessage}>
          Send a Message
        </button>
        <button className="match-button match-button-secondary" onClick={onClose}>
          Keep Swiping
        </button>
      </div>
    </div>
  );
}
