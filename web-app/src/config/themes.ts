export type ThemeId = 'ether' | 'matrix' | 'sunset' | 'stealth';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  colors: {
    bgDepth: string;      // RGB values like "2 2 4"
    primaryGlow: string;  // RGB values
    secondaryGlow: string;// RGB values
    glassTint: string;    // RGB values
    textPrimary: string;  // RGB values
  };
  gradient: string; // CSS gradient for preview
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  ether: {
    id: 'ether',
    name: 'Ether',
    description: 'Sentient Glass Default',
    colors: {
      bgDepth: '2 2 4',
      primaryGlow: '79 70 229', // Indigo
      secondaryGlow: '236 72 153', // Pink
      glassTint: '255 255 255',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #4f46e5 0%, #ec4899 100%)',
  },
  matrix: {
    id: 'matrix',
    name: 'The Matrix',
    description: 'Digital Rain',
    colors: {
      bgDepth: '0 5 0',
      primaryGlow: '0 255 65', // Matrix Green
      secondaryGlow: '0 100 0', // Dark Green
      glassTint: '20 255 50', // Greenish tint
      textPrimary: '220 255 220',
    },
    gradient: 'linear-gradient(135deg, #00ff41 0%, #003b00 100%)',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    description: 'Solar warmth',
    colors: {
      bgDepth: '20 10 10',
      primaryGlow: '234 88 12', // Burnt Orange
      secondaryGlow: '147 51 234', // Purple
      glassTint: '255 200 150',
      textPrimary: '255 240 230',
    },
    gradient: 'linear-gradient(135deg, #ea580c 0%, #9333ea 100%)',
  },
  stealth: {
    id: 'stealth',
    name: 'Stealth',
    description: 'Tactical Monochrome',
    colors: {
      bgDepth: '5 5 5',
      primaryGlow: '255 255 255', // White
      secondaryGlow: '100 100 100', // Grey
      glassTint: '200 200 200',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #ffffff 0%, #525252 100%)',
  },
};
