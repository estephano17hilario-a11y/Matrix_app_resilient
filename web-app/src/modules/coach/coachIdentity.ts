// The user's coach: the "person" who writes motivational messages and urgent-task alerts.
// Its name is chosen in onboarding (notification-tone step) and synced with the other prefs.

export const ASSISTANT_NAME_KEY = 'matrix_assistant_name';
export const DEFAULT_ASSISTANT_NAME = 'Lux';
export const ASSISTANT_NAME_MAX = 16;
export const ASSISTANT_SUGGESTIONS = ['Leo', 'Nova', 'Max', 'Sofía', 'Atlas', 'Kai'];

export const cleanAssistantName = (name: string) => name.replace(/\s+/g, ' ').trim().slice(0, ASSISTANT_NAME_MAX);

export const getAssistantName = (): string => {
  try {
    return cleanAssistantName(localStorage.getItem(ASSISTANT_NAME_KEY) || '') || DEFAULT_ASSISTANT_NAME;
  } catch {
    return DEFAULT_ASSISTANT_NAME;
  }
};

export const setAssistantName = (name: string) => {
  const clean = cleanAssistantName(name);
  try {
    if (clean) localStorage.setItem(ASSISTANT_NAME_KEY, clean);
  } catch { /* private mode */ }
  window.dispatchEvent(new CustomEvent('lux:assistant-name', { detail: clean }));
};
