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
  // --- POWER UPS ---
  {
    id: 'potion_hp_small',
    name: 'Neural Repair Kit',
    description: 'Restores 20 HP instantly. Essential for system maintenance.',
    price: 150,
    category: 'power_up',
    iconName: 'Zap'
  },
  {
    id: 'potion_xp_restore',
    name: 'Memory Recovery',
    description: 'Restores XP lost due to inactivity or penalties.',
    price: 400,
    category: 'power_up',
    iconName: 'Brain'
  },
  {
    id: 'redemption_token',
    name: 'Streak Restoration',
    description: 'Repair a broken streak. A second chance at perfection.',
    price: 5000,
    category: 'power_up',
    iconName: 'ShieldAlert'
  },
  {
    id: 'freeze_streak',
    name: 'Time Freeze',
    description: 'Freeze your streak for 24 hours. Use before a busy day.',
    price: 1000,
    category: 'power_up',
    iconName: 'Clock'
  },

  // --- THEMES ---
  {
    id: 'theme_neon_purple',
    name: 'Nebula Protocol',
    description: 'Deep Purple & Pink UI theme. Cyberpunk aesthetics.',
    price: 1000,
    category: 'theme',
    iconName: 'Palette'
  },
  {
    id: 'theme_matrix_green',
    name: 'Source Code',
    description: 'Classic Matrix Green. The raw data stream.',
    price: 1500,
    category: 'theme',
    iconName: 'Code'
  },
  {
    id: 'theme_apple_minimal',
    name: 'Cupertino Glass',
    description: 'Ultra-clean, frosted glass aesthetic. Maximum clarity.',
    price: 2000,
    category: 'theme',
    iconName: 'Smartphone'
  },

  // --- COSMETICS ---
  {
    id: 'avatar_cypher',
    name: 'Cypher Avatar',
    description: 'Rare avatar. "Ignorance is bliss".',
    price: 2500,
    category: 'cosmetic',
    iconName: 'User'
  },
  {
    id: 'frame_gold',
    name: 'Golden Frame',
    description: 'A prestigious border for your avatar.',
    price: 5000,
    category: 'cosmetic',
    iconName: 'Square'
  },
  {
    id: 'banner_cyber_city',
    name: 'Cyber City Banner',
    description: 'Profile background featuring a futuristic skyline.',
    price: 1500,
    category: 'cosmetic',
    iconName: 'Image'
  },

  // --- MALOS HABITOS (BAD HABITS) ---
  // Category 1: Digital Addiction
  { id: 'bad_habit_shorts', name: 'Doomscrolling Shorts (30m)', description: 'Buying this acknowledges the habit of watching short videos endlessly.', price: 500, category: 'bad_habit', iconName: 'Smartphone' },
  { id: 'bad_habit_social', name: 'Social Media Binge', description: 'Checking feeds without purpose.', price: 500, category: 'bad_habit', iconName: 'Share2' },
  { id: 'bad_habit_notifications', name: 'Notification Slave', description: 'Reacting instantly to every beep.', price: 500, category: 'bad_habit', iconName: 'Bell' },
  { id: 'bad_habit_gaming', name: 'Excessive Gaming', description: 'Playing when you should be working.', price: 500, category: 'bad_habit', iconName: 'Gamepad' },
  { id: 'bad_habit_news', name: 'News Overload', description: 'Consuming negative news constantly.', price: 500, category: 'bad_habit', iconName: 'Newspaper' },

  // Category 2: Physical Neglect
  { id: 'bad_habit_sugar', name: 'Sugar Rush', description: 'Consuming excessive sugary drinks/snacks.', price: 500, category: 'bad_habit', iconName: 'Coffee' },
  { id: 'bad_habit_sedentary', name: 'Chair Potato', description: 'Sitting for >2 hours without moving.', price: 500, category: 'bad_habit', iconName: 'Armchair' },
  { id: 'bad_habit_sleep', name: 'Revenge Bedtime', description: 'Staying up late for no reason.', price: 500, category: 'bad_habit', iconName: 'Moon' },
  { id: 'bad_habit_posture', name: 'Slouching', description: 'Bad posture while working.', price: 500, category: 'bad_habit', iconName: 'UserX' },
  { id: 'bad_habit_water', name: 'Dehydration', description: 'Forgetting to drink water.', price: 500, category: 'bad_habit', iconName: 'Droplet' },

  // Category 3: Mental Clutter
  { id: 'bad_habit_procrastinate', name: 'Procrastination', description: 'Delaying tasks until the last minute.', price: 500, category: 'bad_habit', iconName: 'Clock' },
  { id: 'bad_habit_multitask', name: 'Multitasking Illusion', description: 'Doing everything, achieving nothing.', price: 500, category: 'bad_habit', iconName: 'Layers' },
  { id: 'bad_habit_negative', name: 'Negative Self-Talk', description: 'Being your own worst enemy.', price: 500, category: 'bad_habit', iconName: 'Frown' },
  { id: 'bad_habit_worry', name: 'Chronic Worrying', description: 'Stressing over things you can\'t control.', price: 500, category: 'bad_habit', iconName: 'CloudRain' },
  { id: 'bad_habit_perfection', name: 'Paralyzing Perfectionism', description: 'Waiting for "perfect" conditions.', price: 500, category: 'bad_habit', iconName: 'Target' },

  // Category 4: Social/Behavioral
  { id: 'bad_habit_interrupt', name: 'Interrupting Others', description: 'Speaking before listening.', price: 500, category: 'bad_habit', iconName: 'MicOff' },
  { id: 'bad_habit_late', name: 'Chronically Late', description: 'Disrespecting others\' time.', price: 500, category: 'bad_habit', iconName: 'Watch' },
  { id: 'bad_habit_complain', name: 'Complaining', description: 'Focusing on problems, not solutions.', price: 500, category: 'bad_habit', iconName: 'MessageSquare' },
  { id: 'bad_habit_impulse', name: 'Impulse Spending', description: 'Buying things you don\'t need.', price: 500, category: 'bad_habit', iconName: 'CreditCard' },
  { id: 'bad_habit_clutter', name: 'Physical Clutter', description: 'Messy workspace, messy mind.', price: 500, category: 'bad_habit', iconName: 'Trash' },
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
