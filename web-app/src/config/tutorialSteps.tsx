import { Step } from 'react-joyride';

export interface TutorialStep extends Step {
  delay?: number;
}

export const tutorialSteps: TutorialStep[] = [
  // --- INTRO ---
  {
    target: 'body',
    title: 'Welcome to Matrix',
    content: 'Experience the ultimate productivity OS. This is not just a todo list; it is a gamified reality architect. Let me show you how to master your life.',
    placement: 'center',
    disableBeacon: true,
  },
  
  // --- PLAYER HUD ---
  {
    target: '[data-tour="player-hud"]',
    title: 'Your Status',
    content: 'This is your HUD. Here you see your Level, XP, Health, and Streak. Everything you do in real life affects these stats.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="hud-health"]',
    title: 'Health (HP)',
    content: 'Your vitality. Miss your daily habits, and you will lose HP. If it hits zero, you lose a level. Stay consistent to stay alive.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="hud-xp"]',
    title: 'Experience (XP)',
    content: 'Earn XP by completing tasks and habits. Level up to unlock new features and cosmetic rewards.',
    placement: 'bottom',
  },
  
  // --- SETTINGS (System Config) ---
  {
    target: '[data-tour="settings-trigger"]',
    title: 'System Config',
    content: 'Customize the Matrix. Change themes, adjust difficulty, and manage your account.',
    placement: 'left',
  },
  // Note: We'd typically guide them to open settings and click profile toggle, 
  // but to keep it smooth, we'll explain traits when we get to tasks or just point to the toggle.
  
  // --- NAVIGATION ---
  {
    target: '[data-tour="nav-dock"]',
    title: 'The Dock',
    content: 'Your command center. Switch between Tasks, Focus Mode, Notes, Journaling, and Inventory instantly.',
    placement: 'top',
    disableOverlay: true,
  },

  // --- TASK CREATION (The "Forced" Interaction) ---
  {
    target: '[data-tour="fab-add"]',
    title: 'Create Reality',
    content: 'Press this button now to open your command dock.',
    spotlightClicks: true,
    disableOverlay: true,
    placement: 'top',
  },
  {
    target: '[data-tour="new-mission-btn"]',
    title: 'New Mission',
    content: 'Select "New Mission" to initialize a task protocol.',
    spotlightClicks: true,
    disableOverlay: true,
    placement: 'top',
  },

  // --- TASK MODAL EXPLANATION (Will be triggered after modal opens) ---
  {
    target: '[data-tour="modal-title-input"]',
    title: 'Task Name',
    content: 'Be specific. "Read Book" is better than "Read".',
    placement: 'right', // Avoid covering the input
    disableOverlay: true,
    delay: 500, // Wait for modal animation
  },
  {
    target: '[data-tour="modal-difficulty"]',
    title: 'Difficulty',
    content: 'Harder tasks give more XP and Gold. Be honest with yourself.',
    placement: 'top',
    disableOverlay: true,
  },
  {
    target: '[data-tour="modal-attributes"]',
    title: 'Linked Attribute',
    content: 'Does this task improve your Body (Strength) or your Mind (Intellect)? Choose wisely to level up specific stats.',
    placement: 'left',
    disableOverlay: true,
  },
  
  // --- STRATEGY & AI ---
  {
    target: '[data-tour="view-toggle-strategy"]',
    title: 'Smart Task (AI)',
    content: 'A mysterious power... Let AI break down your complex goals into manageable steps. You have to try it to believe it.',
    placement: 'bottom',
  },

  // --- HABIT CREATION ---
  // We will force the user to switch to habit tab or close task and open habit
  {
    target: '[data-tour="habit-modal-trigger"]', // Logic will need to handle this
    title: 'Habits',
    content: 'Habits are recurring. Good habits heal you; bad habits hurt you.',
    placement: 'center',
  },

  // --- STORE ---
  {
    target: '[data-tour="nav-store"]', // Logic triggers view change
    title: 'The Store',
    content: 'Spend your hard-earned coins here on cosmetics, themes, and power-ups.',
    placement: 'top',
  },

  // --- INVENTORY ---
  {
    target: '[data-tour="nav-inventory"]',
    title: 'Inventory',
    content: 'Your collected items and rewards live here.',
    placement: 'top',
  },
  

  // --- END ---
  {
    target: 'body',
    title: 'Begin',
    content: 'You are ready. The Matrix awaits your command.',
    placement: 'center',
  }
];
