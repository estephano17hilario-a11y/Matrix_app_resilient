# Matrix App Theme System - Holo Category Extension

## Overview
This document details the implementation of the new **Holo** theme category, designed to replicate the "Hyper-Glass" and "VisionOS" aesthetic with vibrant gradients, blurs, and holographic effects.

## New Category: Holo
The `holo` category has been added to the `ThemeCategory` type in `src/config/themes.ts`.

### Themes Added
The following themes have been implemented under the `holo` category:

1.  **Holo Spectrum** (`holo_spectrum`): A prismatic blur effect with Cyan, Magenta, and Yellow accents.
2.  **Holo Vision** (`holo_vision`): A teal and deep blue theme focusing on clarity and "future focus".
3.  **Holo Midnight** (`holo_midnight`): Deep indigo and blue for a space-like atmosphere.
4.  **Holo Blush** (`holo_blush`): Soft pink and peach gradients for a warmer, radiant look.
5.  **Holo Frost** (`holo_frost`): A cool, icy blue theme with high clarity.

## Implementation Details

### 1. Configuration (`src/config/themes.ts`)
-   Updated `ThemeCategory` to include `'holo'`.
-   Updated `ThemeId` to include the new theme IDs.
-   Added theme configuration objects to the `THEMES` constant.

### 2. UI Integration (`src/modules/settings/sections/VisualsSection.tsx`)
-   Added `'holo'` to the `DisplayCategory` type.
-   Added a new filter tab "Holographic" using the `Layers` icon.
-   Updated the filtering logic to display themes with `category: 'holo'` when the tab is selected.

## Usage
To activate a Holo theme:
1.  Navigate to **Settings** > **Visual Core**.
2.  Select the **Holographic** tab in the theme category selector.
3.  Click on any of the new themes (Spectrum, Vision, Midnight, Blush, Frost).

## Customization
To adjust the colors of the Holo themes, edit the `colors` object in `src/config/themes.ts`. 
-   `bgDepth`: Controls the base background color.
-   `primaryGlow` & `secondaryGlow`: Control the orb/gradient colors.
-   `glassTint`: Controls the tint of the glass panels.
