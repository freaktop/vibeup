import React, { useState, useEffect } from 'react';
import { Profile } from '../types';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { getCurrentUid } from '../auth';
import { listenMatches, listenProfiles } from '../firestore';
import './Matches.css';

export default function Matches() {
  const [matches, setMatches] = useState<Profile[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    let unsubProfiles: (() => void) | null = null;
    let unsubMatches: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubProfiles?.();
      unsubMatches?.();

      if (!user) {
        setMatches([]);
        setAllProfiles([]);
        return;
      }

      unsubProfiles = listenProfiles((p) => setAllProfiles(p));

      unsubMatches = listenMatches(user.uid, (ms) => {
        const otherIds = ms
          .map((m) => m.users.find((u) => u !== user.uid))
          .filter((id): id is string => !!id);
        const otherSet = new Set(otherIds);
        const matchedProfiles = allProfiles.filter((p) => otherSet.has(p.id));
        setMatches(matchedProfiles);
      });
    });

    return () => {
      unsubAuth();
      unsubProfiles?.();
      unsubMatches?.();
    };
  }, []);

  useEffect(() => {
    const uid = getCurrentUid();
    if (!uid) return;
    // matches are derived from allProfiles + listenMatches; this effect ensures UI updates when profiles load
  }, [allProfiles]);

  if (matches.length === 0) {
    return (
      <div className="matches-empty">
        <div className="empty-icon">💚</div>
        <div className="empty-title">No matches yet</div>
        <div className="empty-text">Start swiping to find your match!</div>
      </div>
    );
  }

  return (
    <div className="matches-container">
      {matches.map((match) => (
        <div key={match.id} className="match-card">
          <img src={match.photo} alt={match.name} className="match-image" />
          <div className="match-info">
            <div className="match-name">{match.name}</div>
            <div className="match-age">{match.age}</div>
            {match.tags.length > 0 && (
              <div className="match-tags">{match.tags.slice(0, 2).join(' • ')}</div>
            )}
          </div>
          <div className="match-badge">💚</div>
        </div>
      ))}
    </div>
  );
}
