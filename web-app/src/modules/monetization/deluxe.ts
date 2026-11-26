// Single place that decides "is this account Deluxe (PRO)?" and how a locked feature asks the user to upgrade.
//
// Gating is intentionally dumb: call `useIsDeluxe()` and, when a free user taps something locked, call
// `promptDeluxe('<feature>')`. A global sheet (DeluxePromptHost) explains the feature and sends the user to the
// purchase screen. Non-React code can call `promptDeluxe` / `openDeluxe` too.

import { useAuth } from '../../context/AuthContext';

/** Locked features that have their own explanation in the Deluxe sheet. */
export type DeluxeFeature = 'superHabits' | 'routineCalendar' | 'routineCustom' | 'widgets';

export const DELUXE_PROMPT_EVENT = 'deluxe-prompt';
export const OPEN_PRO_EVENT = 'open-pro-modal';

/** Same rule the rest of the app uses (the server is the only writer of `plan`). */
export const isDeluxePlan = (plan: string | null | undefined): boolean => plan === 'PRO';

export const useIsDeluxe = (): boolean => {
  const { profile } = useAuth();
  return isDeluxePlan(profile?.plan);
};

/** Explain a locked feature and offer the upgrade. */
export const promptDeluxe = (feature: DeluxeFeature): void => {
  try {
    window.dispatchEvent(new CustomEvent(DELUXE_PROMPT_EVENT, { detail: { feature } }));
  } catch { /* no window (tests / SSR) */ }
};

/** Go straight to the purchase screen. */
export const openDeluxe = (): void => {
  try {
    window.dispatchEvent(new CustomEvent(OPEN_PRO_EVENT));
  } catch { /* no window (tests / SSR) */ }
};
