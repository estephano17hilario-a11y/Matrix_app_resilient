import { PROGRESSION_CONFIG } from './engine/config';
import type { CompletionKind } from './report';

/** Base XP per completion kind (FOCUS is per minute). */
export const XP_BASE: Record<CompletionKind, number> = {
  FOCUS: PROGRESSION_CONFIG.XP.PER_FOCUS_MINUTE,
  HABIT: PROGRESSION_CONFIG.XP.PER_HABIT,
  TASK: PROGRESSION_CONFIG.XP.PER_TASK,
  SUBTASK: PROGRESSION_CONFIG.XP.PER_SUBTASK,
};
