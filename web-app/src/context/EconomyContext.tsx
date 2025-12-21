import React, { createContext, useContext, useState, ReactNode } from 'react';
import { purchaseItem, addGold, consumeItem, StoreItem } from '../services/economyService';
import { useMatrix } from './MatrixContext';

interface EconomyContextType {
  purchase: (item: StoreItem) => Promise<boolean>;
  consume: (itemId: string) => Promise<boolean>;
  watchAd: () => Promise<void>;
  isTransactionPending: boolean;
  storeItems: StoreItem[];
}

const EconomyContext = createContext<EconomyContextType | undefined>(undefined);

const STORE_ITEMS: StoreItem[] = [
  // --- POWER UPS (MEJORAS) ---
  {
    id: 'potion_hp_small',
    name: 'store.items.potion_hp_small.name',
    description: 'store.items.potion_hp_small.desc',
    price: 150,
    category: 'power_up',
    iconName: 'Zap',
    effect: { type: 'heal', value: 20 }
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

  // --- THEMES (TEMAS) ---
  {
    id: 'theme_neon_purple',
    name: 'store.items.theme_neon_purple.name',
    description: 'store.items.theme_neon_purple.desc',
    price: 1000,
    category: 'theme',
    iconName: 'Palette'
  },
  {
    id: 'theme_matrix_green',
    name: 'store.items.theme_matrix_green.name',
    description: 'store.items.theme_matrix_green.desc',
    price: 1500,
    category: 'theme',
    iconName: 'Code'
  },
  {
    id: 'theme_apple_minimal',
    name: 'store.items.theme_apple_minimal.name',
    description: 'store.items.theme_apple_minimal.desc',
    price: 2000,
    category: 'theme',
    iconName: 'Smartphone'
  },

  // --- COSMETICS REMOVED AS PER REQUEST ---


  // --- MALOS HÁBITOS (BAD HABITS) ---
  // Category 1: Digital Addiction -> digital_addiction
  { id: 'bad_habit_shorts', name: 'store.items.bad_habit_shorts.name', description: 'store.items.bad_habit_shorts.desc', price: 500, category: 'bad_habit', subCategory: 'digital_addiction', iconName: 'Smartphone' },
  { id: 'bad_habit_social', name: 'store.items.bad_habit_social.name', description: 'store.items.bad_habit_social.desc', price: 500, category: 'bad_habit', subCategory: 'digital_addiction', iconName: 'Share2' },
  { id: 'bad_habit_notifications', name: 'store.items.bad_habit_notifications.name', description: 'store.items.bad_habit_notifications.desc', price: 500, category: 'bad_habit', subCategory: 'digital_addiction', iconName: 'Bell' },
  { id: 'bad_habit_gaming', name: 'store.items.bad_habit_gaming.name', description: 'store.items.bad_habit_gaming.desc', price: 500, category: 'bad_habit', subCategory: 'digital_addiction', iconName: 'Gamepad' },
  { id: 'bad_habit_news', name: 'store.items.bad_habit_news.name', description: 'store.items.bad_habit_news.desc', price: 500, category: 'bad_habit', subCategory: 'digital_addiction', iconName: 'Newspaper' },

  // Category 2: Physical Neglect -> physical_neglect
  { id: 'bad_habit_sugar', name: 'store.items.bad_habit_sugar.name', description: 'store.items.bad_habit_sugar.desc', price: 500, category: 'bad_habit', subCategory: 'physical_neglect', iconName: 'Coffee' },
  { id: 'bad_habit_sedentary', name: 'store.items.bad_habit_sedentary.name', description: 'store.items.bad_habit_sedentary.desc', price: 500, category: 'bad_habit', subCategory: 'physical_neglect', iconName: 'Armchair' },
  { id: 'bad_habit_sleep', name: 'store.items.bad_habit_sleep.name', description: 'store.items.bad_habit_sleep.desc', price: 500, category: 'bad_habit', subCategory: 'physical_neglect', iconName: 'Moon' },
  { id: 'bad_habit_posture', name: 'store.items.bad_habit_posture.name', description: 'store.items.bad_habit_posture.desc', price: 500, category: 'bad_habit', subCategory: 'physical_neglect', iconName: 'UserX' },
  { id: 'bad_habit_water', name: 'store.items.bad_habit_water.name', description: 'store.items.bad_habit_water.desc', price: 500, category: 'bad_habit', subCategory: 'physical_neglect', iconName: 'Droplet' },

  // Category 3: Mental Clutter -> mental_clutter
  { id: 'bad_habit_procrastinate', name: 'store.items.bad_habit_procrastinate.name', description: 'store.items.bad_habit_procrastinate.desc', price: 500, category: 'bad_habit', subCategory: 'mental_clutter', iconName: 'Clock' },
  { id: 'bad_habit_multitask', name: 'store.items.bad_habit_multitask.name', description: 'store.items.bad_habit_multitask.desc', price: 500, category: 'bad_habit', subCategory: 'mental_clutter', iconName: 'Layers' },
  { id: 'bad_habit_negative', name: 'store.items.bad_habit_negative.name', description: 'store.items.bad_habit_negative.desc', price: 500, category: 'bad_habit', subCategory: 'mental_clutter', iconName: 'Frown' },
  { id: 'bad_habit_worry', name: 'store.items.bad_habit_worry.name', description: 'store.items.bad_habit_worry.desc', price: 500, category: 'bad_habit', subCategory: 'mental_clutter', iconName: 'CloudRain' },
  { id: 'bad_habit_perfection', name: 'store.items.bad_habit_perfection.name', description: 'store.items.bad_habit_perfection.desc', price: 500, category: 'bad_habit', subCategory: 'mental_clutter', iconName: 'Target' },

  // Category 4: Social/Behavioral -> social_behavioral
  { id: 'bad_habit_interrupt', name: 'store.items.bad_habit_interrupt.name', description: 'store.items.bad_habit_interrupt.desc', price: 500, category: 'bad_habit', subCategory: 'social_behavioral', iconName: 'MicOff' },
  { id: 'bad_habit_late', name: 'store.items.bad_habit_late.name', description: 'store.items.bad_habit_late.desc', price: 500, category: 'bad_habit', subCategory: 'social_behavioral', iconName: 'Watch' },
  { id: 'bad_habit_complain', name: 'store.items.bad_habit_complain.name', description: 'store.items.bad_habit_complain.desc', price: 500, category: 'bad_habit', subCategory: 'social_behavioral', iconName: 'MessageSquare' },
  { id: 'bad_habit_impulse', name: 'store.items.bad_habit_impulse.name', description: 'store.items.bad_habit_impulse.desc', price: 500, category: 'bad_habit', subCategory: 'social_behavioral', iconName: 'CreditCard' },
  { id: 'bad_habit_clutter', name: 'store.items.bad_habit_clutter.name', description: 'store.items.bad_habit_clutter.desc', price: 500, category: 'bad_habit', subCategory: 'social_behavioral', iconName: 'Trash' },
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

  const consume = async (itemId: string): Promise<boolean> => {
    if (!user?.uid) return false;
    
    const item = STORE_ITEMS.find(i => i.id === itemId);
    if (!item) {
        console.error("Item not found in store definitions:", itemId);
        return false;
    }

    setIsTransactionPending(true);
    
    const result = await consumeItem(user.uid, item);
    
    setIsTransactionPending(false);
    return result.success;
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
    <EconomyContext.Provider value={{ purchase, consume, watchAd, isTransactionPending, storeItems: STORE_ITEMS }}>
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
