import { db, doc, setDoc, getDoc, arrayUnion, increment } from '@/services/supabase';
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

  // 2. Sync from Firestore
  try {
     const userRef = doc(db, 'users', userId);
     const userSnap = await getDoc(userRef);
     if (userSnap.exists()) {
         const data = userSnap.data();
         if (data.unlockedAchievements && Array.isArray(data.unlockedAchievements)) {
             data.unlockedAchievements.forEach((id: string) => sessionUnlockedAchievements.add(id));
             localStorage.setItem(`matrix_achievements_${userId}`, JSON.stringify(Array.from(sessionUnlockedAchievements)));
         }
     }
  } catch (e) {
     console.warn("Error loading achievements from Firestore:", e);
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

  // 4. Update "The Source" (Firestore)
  if (newAchievements.length > 0) {
    const userRef = doc(db, 'users', user.id);
    
    // Construct the atomic update
    const updates: any = {
      unlockedAchievements: arrayUnion(...newAchievements.map(a => a.id))
    };

    // Calculate total XP reward
    const totalXpReward = newAchievements.reduce((sum, a) => sum + a.xpReward, 0);
    
    if (totalXpReward > 0) {
      updates['stats.xp'] = increment(totalXpReward);
      // Note: Level calculation should ideally happen in a Cloud Function trigger 
      // or we duplicate logic here. For now, we just award XP.
    }

    try {
      // Optimistic UI handled by the caller (React State), 
      // but we ensure the DB catches up.
      await setDoc(userRef, updates, { merge: true });
      localStorage.setItem(`matrix_achievements_${user.id}`, JSON.stringify(Array.from(sessionUnlockedAchievements)));
      console.log('Achievements Unlocked & Saved:', newAchievements.map(a => a.title));
    } catch (error) {
      console.error('Lux Database Error (Achievements):', error);
      // We don't throw here because we want the user to see the celebration 
      // even if the backend sync is pending (Offline Mode).
    }
  }

  return newAchievements;
};
