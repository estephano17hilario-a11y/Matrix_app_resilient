import React, { createContext, useContext, useState, ReactNode } from 'react';
import { purchaseItem, addGold, StoreItem } from '../services/economyService';
import { useMatrix } from './MatrixContext';

interface EconomyContextType {
  purchase: (item: StoreItem) => Promise<boolean>;
  watchAd: () => Promise<void>;
  isTransactionPending: boolean;
  storeItems: StoreItem[];
}

const EconomyContext = createContext<EconomyContextType | undefined>(undefined);

const STORE_ITEMS: StoreItem[] = [
  // BOOSTS
  {
    id: 'potion_hp_small',
    name: 'Neural Stimulant',
    description: 'Restores 20 HP instantly. A quick fix for system fatigue.',
    price: 150,
    category: 'boost',
    iconName: 'Zap'
  },
  {
    id: 'potion_xp_boost',
    name: 'Cognitive Enhancer',
    description: '+10% XP gain for 1 hour. Overclock your brain.',
    price: 300,
    category: 'boost',
    iconName: 'Brain'
  },
  // COSMETICS
  {
    id: 'theme_neon_purple',
    name: 'Nebula Protocol',
    description: 'Unlocks the Deep Purple & Pink UI theme.',
    price: 1000,
    category: 'cosmetic',
    iconName: 'Palette'
  },
  {
    id: 'avatar_cypher',
    name: 'Cypher Avatar',
    description: 'Rare avatar. "Ignorance is bliss".',
    price: 2500,
    category: 'cosmetic',
    iconName: 'User'
  },
  // BLACK MARKET
  {
    id: 'redemption_token',
    name: 'Glitch Patch',
    description: 'Restore a broken streak. Cheating the system comes at a cost.',
    price: 5000,
    category: 'black_market',
    iconName: 'ShieldAlert'
  }
];

export const EconomyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useMatrix();
  const [isTransactionPending, setIsTransactionPending] = useState(false);

  const purchase = async (item: StoreItem): Promise<boolean> => {
    if (!user?.uid) return false;
    
    setIsTransactionPending(true);
    // Haptic feedback start
    if (navigator.vibrate) navigator.vibrate(20);

    const result = await purchaseItem(user.uid, item);
    
    setIsTransactionPending(false);

    if (result.success) {
      // Success Haptic
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
      return true;
    } else {
      // Error Haptic
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      return false;
    }
  };

  const watchAd = async () => {
    if (!user?.uid) return;
    setIsTransactionPending(true);
    
    // Simulate Ad duration
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await addGold(user.uid, 50);
    setIsTransactionPending(false);
    
    if (navigator.vibrate) navigator.vibrate([50, 50, 50, 50, 100]);
  };

  return (
    <EconomyContext.Provider value={{ purchase, watchAd, isTransactionPending, storeItems: STORE_ITEMS }}>
      {children}
    </EconomyContext.Provider>
  );
};

export const useEconomy = () => {
  const context = useContext(EconomyContext);
  if (context === undefined) {
    throw new Error('useEconomy must be used within an EconomyProvider');
  }
  return context;
};
