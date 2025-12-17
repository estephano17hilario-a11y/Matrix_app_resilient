import { db, doc, setDoc, arrayUnion, increment } from '../firebase';
import { UserData } from '../types/User';
import { ACHIEVEMENTS, Achievement, AchievementCategory } from '../config/achievements';

/**
 * ACHIEVEMENT LISTENER
 * The watchful eye that rewards progress.
 */
export const checkAchievements = async (
  user: UserData,
  triggerCategory?: AchievementCategory
): Promise<Achievement[]> => {
  if (!user || !user.uid) return [];

  // 1. Identify what we already have
  const unlockedIds = new Set(user.unlockedAchievements || []);
  const newAchievements: Achievement[] = [];

  // 2. Filter relevant candidates (Performance Optimization)
  // If we just gained XP, only check XP or MASTERY achievements.
  // If we just did a task, maybe check COMBAT or STREAK.
  const candidates = ACHIEVEMENTS.filter(ach => 
    !unlockedIds.has(ach.id) && 
    (!triggerCategory || ach.category === triggerCategory || ach.category === 'MASTERY')
  );

  // 3. Evaluate Conditions
  for (const ach of candidates) {
    try {
      if (ach.condition(user)) {
        newAchievements.push(ach);
      }
    } catch (e) {
      console.warn(`Failed to evaluate achievement ${ach.id}`, e);
    }
  }

  // 4. Update "The Source" (Firestore)
  if (newAchievements.length > 0) {
    const userRef = doc(db, 'users', user.uid);
    
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
      console.log('Achievements Unlocked & Saved:', newAchievements.map(a => a.title));
    } catch (error) {
      console.error('Matrix Database Error (Achievements):', error);
      // We don't throw here because we want the user to see the celebration 
      // even if the backend sync is pending (Offline Mode).
    }
  }

  return newAchievements;
};
