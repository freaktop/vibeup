import React, { createContext, useContext } from 'react';
import { usePremium } from '../hooks/usePremium';
import { storage } from '../utils/storage';

const PremiumContext = createContext<ReturnType<typeof usePremium> | null>(null);

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const premium = usePremium();
  return (
    <PremiumContext.Provider value={premium}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremiumContext() {
  const ctx = useContext(PremiumContext);
  return ctx ?? storage.getPremiumFeatures();
}
