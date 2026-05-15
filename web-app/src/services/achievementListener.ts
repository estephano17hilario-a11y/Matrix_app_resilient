import { supabase } from '@/services/supabase';
import { UserData } from '../types/User';
import { Attribute } from '../types';
import { ACHIEVEMENTS, Achievement, AchievementCategory } from '../config/achievements';

/**
 * ACHIEVEMENT LISTENER
 * The watchful eye that rewards progress.
 */
const sessionUnlockedAchievements = new Set<string>();
let firestoreAchievementsPromise: Promise<void> | null = null;

const loadAchievements = async (userId: string) => {
  // 1. Fast boot from local storage
  const localAch = localStorage.getItem(`matrix_achievements_${userId}`);
  if (localAch) {
      try {
          JSON.parse(localAch).forEach((id: string) => sessionUnlockedAchievements.add(id));
      } catch(e) {}
  }

  // 2. Sync from Supabase (using preferences JSONB column to store unlockedAchievements)
  try {
     const { data, error } = await supabase
       .from('users')
       .select('preferences')
       .eq('id', userId)
       .maybeSingle();

     if (data && !error && data.preferences?.unlockedAchievements) {
         const unlocked = data.preferences.unlockedAchievements;
         if (Array.isArray(unlocked)) {
             unlocked.forEach((id: string) => sessionUnlockedAchievements.add(id));
             localStorage.setItem(`matrix_achievements_${userId}`, JSON.stringify(Array.from(sessionUnlockedAchievements)));
         }
     }
  } catch (e) {
     console.warn("Error loading achievements from Supabase:", e);
  }
};

export const checkAchievements = async (
  user: UserData,
  attributes?: Attribute[],
  triggerCategory?: AchievementCategory
): Promise<Achievement[]> => {
  if (!user || !user.id) return [];

  if (!firestoreAchievementsPromise) {
      firestoreAchievementsPromise = loadAchievements(user.id);
  }
  await firestoreAchievementsPromise;

  // 1. Identify what we already have (DB + Session Cache)
  const unlockedIds = new Set([
    ...(user.unlockedAchievements || []),
    ...Array.from(sessionUnlockedAchievements)
  ]);
  
  const newAchievements: Achievement[] = [];

  // 2. Filter relevant candidates (Performance Optimization)
  const candidates = ACHIEVEMENTS.filter(ach => 
    !unlockedIds.has(ach.id) && 
    (!triggerCategory || ach.category === triggerCategory || ach.category === 'RANK' || ach.category === 'TRAIT')
  );

  // 3. Evaluate Conditions
  for (const ach of candidates) {
    try {
      if (ach.condition(user, attributes)) {
        newAchievements.push(ach);
        sessionUnlockedAchievements.add(ach.id); // Add to session cache immediately
      }
    } catch (e) {
      console.warn(`Failed to evaluate achievement ${ach.id}`, e);
    }
  }

  // 4. Update "The Source" (Supabase)
  if (newAchievements.length > 0) {
    // Calculate total XP reward
    const totalXpReward = newAchievements.reduce((sum, a) => sum + a.xpReward, 0);

    try {
      // First fetch current preferences and stats
      const { data: currentUserData, error: fetchError } = await supabase
        .from('users')
        .select('preferences, stats')
        .eq('id', user.id)
        .maybeSingle();

      if (!fetchError && currentUserData) {
        const currentPrefs = currentUserData.preferences || {};
        const currentStats = currentUserData.stats || { xp: 0, level: 1 };
        
        const existingUnlocked = currentPrefs.unlockedAchievements || [];
        const newUnlockedList = Array.from(new Set([...existingUnlocked, ...newAchievements.map(a => a.id)]));
        
        const updatedPrefs = {
          ...currentPrefs,
          unlockedAchievements: newUnlockedList
        };

        const updatedStats = {
          ...currentStats,
          xp: currentStats.xp + totalXpReward
        };

        const updatePayload: any = {
          preferences: updatedPrefs
        };

        if (totalXpReward > 0) {
          updatePayload.stats = updatedStats;
        }

        await supabase.from('users').update(updatePayload).eq('id', user.id);
        localStorage.setItem(`matrix_achievements_${user.id}`, JSON.stringify(Array.from(sessionUnlockedAchievements)));
        console.log('Achievements Unlocked & Saved:', newAchievements.map(a => a.title));
      }
    } catch (error) {
      console.error('Lux Database Error (Achievements):', error);
      // We don't throw here because we want the user to see the celebration 
      // even if the backend sync is pending (Offline Mode).
    }
  }

  return newAchievements;
};
