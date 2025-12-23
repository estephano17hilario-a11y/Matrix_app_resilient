# Release Notes - Matrix Resilient

## [1.3.0] - 2025-12-22

### Added
- **Quadratic XP Progression**: Implemented a more challenging and realistic leveling system based on precise time targets (L100 in 1 year and 1 month).
- **Daily Limits HUD**: New real-time visualization in the Dashboard to track XP and Gold limits for Tasks, Habits, and Focus.
- **Separate XP Tracking**: Account and Trait XP now follow independent quadratic growth curves for better character specialization.
- **Enhanced Habit Visualization**: New `HabitWeekView` and improved visual cards for better tracking of daily streaks and rewards.

### Improved
- **Code Quality**: Resolved multiple linter errors and warnings across `Dashboard.tsx`, `TaskList.tsx`, `FocusView.tsx`, and other core modules.
- **UI/UX Consistency**: Refined the "Sentient Glass" aesthetic with optimized `AnimatePresence` and cleaner component structures.
- **Performance**: Removed unused imports and props to reduce bundle size and improve rendering efficiency.

### Fixed
- Duplicate property exports in `useDashboardLogic.ts`.
- Missing state and prop definitions in `Dashboard.tsx` and `StrategicMapView.tsx`.
- Unused component warnings in `QuestModal.tsx` and `HabitVisualView.tsx`.

## [1.2.0] - 2025-12-20

### Added
- **Deployment Nexus (Hangar)**: A new centralized interface for managing and deploying missions.
- **Mission HUD (Combat Dashboard)**:
    - **Engage System**: Integrated focus timer with high-stakes visual feedback.
    - **Ammo Cache**: Dynamic habit tracking within missions.
    - **Objectives**: Integrated task management for active missions.
    - **Field Log**: Real-time note-taking system for mission debriefs.
- **Mission Morphing**: Advanced Framer Motion animations that transition seamlessly from Mission Cards to the full-screen HUD.
- **Navigation Integration**: New `DEPLOY` action added to the main Dock for instant Nexus access.
- **Habit-Project Linkage**: Added `projectId` support to the Habit data model to allow filtering habits by specific missions.

### Improved
- **App Performance**: Implemented lazy loading and background prefetching for the Nexus module.
- **UI/UX**: Enhanced Glassmorphism effects and Aurora background interactions in the Nexus view.
- **Data Architecture**: Updated `MatrixContext` and `persistenceService` to support project-linked habits.

---
*Developed by the Matrix Architect Protocol*
