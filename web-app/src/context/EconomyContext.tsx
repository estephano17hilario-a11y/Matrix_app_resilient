import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { purchaseItem, consumeItem, StoreItem, InventoryItem } from '@/services/economyService';
import { useLux } from '@/context/LuxContext';
import { toast } from 'react-hot-toast';

export interface EconomyContextType {
  purchase: (item: StoreItem) => Promise<boolean>;
  useItem: (itemId: string) => Promise<boolean>;
  consume: (itemId: string) => Promise<boolean>; // Alias for backward compatibility
  isTransactionPending: boolean;
  storeItems: StoreItem[];
  inventory: InventoryItem[];
}

const EconomyContext = createContext<EconomyContextType | undefined>(undefined);

const STORE_ITEMS: StoreItem[] = [
  // --- POWER UPS (MEJORAS) ---
  {
    id: 'potion_hp_small',
    name: 'store.items.potion_hp_small.name',
    description: 'store.items.potion_hp_small.desc',
    price: 500,
    category: 'power_up',
    iconName: 'Zap',
    effect: { type: 'heal', value: 10 }
  },
  {
    id: 'potion_xp_restore',
    name: 'store.items.potion_xp_restore.name',
    description: 'store.items.potion_xp_restore.desc',
    price: 400,
    category: 'power_up',
    iconName: 'Brain',
    effect: { type: 'xp_boost', value: 100 }
  },
  {
    id: 'redemption_token',
    name: 'store.items.redemption_token.name',
    description: 'store.items.redemption_token.desc',
    price: 5000,
    category: 'power_up',
    iconName: 'ShieldAlert',
    effect: { type: 'restore_streak', value: 1 }
  },
  {
    id: 'freeze_streak',
    name: 'store.items.freeze_streak.name',
    description: 'store.items.freeze_streak.desc',
    price: 1000,
    category: 'power_up',
    iconName: 'Clock',
    effect: { type: 'freeze_streak', value: 1, duration: 24 }
  },

  // --- THEMES (TEMAS) REMOVED ---
];

export const EconomyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useLux();
  const [isTransactionPending, setIsTransactionPending] = useState(false);

  const purchase = useCallback(async (item: StoreItem): Promise<boolean> => {
    if (!user?.id) return false;
    
    setIsTransactionPending(true);
    // Haptic feedback start
    if (navigator.vibrate) navigator.vibrate(20);

    const result = await purchaseItem(user.id, item);
    
    setIsTransactionPending(false);

    if (result.success) {
      // Success Haptic
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
      return true;
    } else {
      // Error Haptic
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      
      let errorMsg = result.error || 'Error al realizar la compra';
      if (errorMsg === 'Insufficient funds') {
        errorMsg = 'Fondos insuficientes (Oro)';
      } else if (errorMsg === 'User not found') {
        errorMsg = 'Usuario no encontrado';
      }
      toast.error(errorMsg);
      
      return false;
    }
  }, [user?.id]);

  const useItem = useCallback(async (itemId: string): Promise<boolean> => {
      if (!user?.id) return false;
      setIsTransactionPending(true);
      
      const storeItem = STORE_ITEMS.find(i => i.id === itemId);
      const result = await consumeItem(user.id, itemId, storeItem?.effect);
      
      setIsTransactionPending(false);
      
      if (!result.success && result.error) {
          alert(result.error);
      }
      
      return result.success;
  }, [user?.id]);

  const consume = useItem;
  const inventory = useMemo(() => (user?.inventory || []) as InventoryItem[], [user?.inventory]);
  const value = useMemo(() => ({ 
    purchase, 
    useItem, 
    consume,
    isTransactionPending, 
    storeItems: STORE_ITEMS,
    inventory
  }), [purchase, useItem, consume, isTransactionPending, inventory]);

  return (
    <EconomyContext.Provider value={value}>
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
