import { useState, useEffect } from 'react';
import SafeImage from '../components/SafeImage';
import { Profile } from '../types';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { getCurrentUid } from '../auth';
import { listenMatches, listenProfiles } from '../firestore';
import './Matches.css';

type MatchRow = { id: string; users: string[] };

export default function Matches() {
  const [matches, setMatches] = useState<Profile[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [matchRows, setMatchRows] = useState<MatchRow[]>([]);

  useEffect(() => {
    let unsubProfiles: (() => void) | null = null;
    let unsubMatches: (() => void) | null = null;

    if (!auth) return;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubProfiles?.();
      unsubMatches?.();

      if (!user) {
        setMatches([]);
        setAllProfiles([]);
        setMatchRows([]);
        return;
      }

      unsubProfiles = listenProfiles((p) => setAllProfiles(p));
      unsubMatches = listenMatches(user.uid, (ms) => {
        setMatchRows(ms.map((m) => ({ id: m.id, users: m.users })));
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
    const otherIds = new Set(
      matchRows
        .map((m) => m.users.find((u) => u !== uid))
        .filter((id): id is string => !!id)
    );
    const matchedProfiles = allProfiles.filter((p) => otherIds.has(p.id));
    setMatches(matchedProfiles);
  }, [allProfiles, matchRows]);

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
          <SafeImage src={match.photo || ''} alt={match.name || 'User'} className="match-image" />
          <div className="match-info">
            <div className="match-name">{match.name || 'User'}</div>
            <div className="match-age">{match.age ?? ''}</div>
            {(match.tags?.length ?? 0) > 0 && (
              <div className="match-tags">{(match.tags || []).slice(0, 2).join(' • ')}</div>
            )}
          </div>
          <div className="match-badge">💚</div>
        </div>
      ))}
    </div>
  );
}
