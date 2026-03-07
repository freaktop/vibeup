import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { getCurrentUid } from '../auth';
import { listenPremiumFromFirestore } from '../firestore';
import { storage } from '../utils/storage';

/** Merges local premium with Firestore (Stripe webhook). Firestore wins when hasPremium. */
export function usePremium() {
  const [premiumFeatures, setPremiumFeatures] = useState(storage.getPremiumFeatures());

  useEffect(() => {
    const handlePremiumUpdated = () => setPremiumFeatures(storage.getPremiumFeatures());
    window.addEventListener('premiumUpdated', handlePremiumUpdated);

    const local = storage.getPremiumFeatures();
    let unsubPremium: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubPremium?.();

      if (!user) {
        setPremiumFeatures(local);
        return;
      }

      unsubPremium = listenPremiumFromFirestore(user.uid, (hasPremiumFromFirestore) => {
        const currentLocal = storage.getPremiumFeatures();
        if (hasPremiumFromFirestore) {
          const merged = {
            ...currentLocal,
            hasPremium: true,
            hasBoost: true,
            hasSuperLike: true,
            hasUndo: true,
            boostsRemaining: 999,
            superLikesRemaining: 999,
            undosRemaining: 999,
            canSeeViewers: true,
            canJoinExclusiveCommunities: true,
          };
          setPremiumFeatures(merged);
          storage.savePremiumFeatures(merged);
        } else {
          setPremiumFeatures(currentLocal);
        }
      });
    });

    return () => {
      window.removeEventListener('premiumUpdated', handlePremiumUpdated);
      unsubAuth();
      unsubPremium?.();
    };
  }, []);

  return premiumFeatures;
}
