export type ThemeId = 'ether' | 'matrix' | 'sunset' | 'stealth' | 'apple' | 'apple_intelligence' | 'revolut' | 'cupertino' | 'vision_pro' | 'glassmorphism_premium' | 'cristales' | 'liquid_glass' | 'neon' | 'enterprise' | 'dorado' | 'serio' | 'oled' | 'spotlight' | 'nebula' | 'aurora';

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
      bgDepth: '5 4 12', // Deeper indigo tint
      primaryGlow: '99 102 241', // Indigo-500 (Boosted)
      secondaryGlow: '236 72 153', // Pink-500
      glassTint: '224 231 255', // Indigo-100 tint
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
  },
  matrix: {
    id: 'matrix',
    name: 'The Matrix',
    description: 'Digital Rain',
    colors: {
      bgDepth: '0 10 0', // Very dark green, not black
      primaryGlow: '0 255 70', // Neon Green
      secondaryGlow: '0 180 50', // Darker Green
      glassTint: '150 255 150', // Greenish tint
      textPrimary: '220 255 220',
    },
    gradient: 'linear-gradient(135deg, #00ff46 0%, #004d00 100%)',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    description: 'Solar warmth',
    colors: {
      bgDepth: '25 10 10', // Deep reddish brown
      primaryGlow: '255 80 0', // Bright Orange
      secondaryGlow: '168 85 247', // Purple
      glassTint: '255 210 180',
      textPrimary: '255 245 240',
    },
    gradient: 'linear-gradient(135deg, #ff5000 0%, #a855f7 100%)',
  },
  stealth: {
    id: 'stealth',
    name: 'Stealth',
    description: 'Tactical Monochrome',
    colors: {
      bgDepth: '8 8 8', // Dark Grey
      primaryGlow: '255 255 255', // Pure White
      secondaryGlow: '80 80 80', // Grey
      glassTint: '200 200 200',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #ffffff 0%, #404040 100%)',
  },
  apple: {
    id: 'apple',
    name: 'Apple',
    description: 'Titanium & Silver',
    colors: {
      bgDepth: '25 25 28', // Titanium Grey
      primaryGlow: '255 255 255',
      secondaryGlow: '0 122 255', // Apple Blue
      glassTint: '240 240 255',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #e5e5ea 0%, #1c1c1e 100%)',
  },
  apple_intelligence: {
    id: 'apple_intelligence',
    name: 'Intelligence',
    description: 'Siri Reborn',
    colors: {
      bgDepth: '10 15 35', // Deep Blue-Black
      primaryGlow: '0 220 255', // Cyan
      secondaryGlow: '255 50 150', // Pink
      glassTint: '200 230 255',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #00d2ff 0%, #ff3296 100%)',
  },
  revolut: {
    id: 'revolut',
    name: 'Revolut',
    description: 'Fintech Ultra',
    colors: {
      bgDepth: '5 5 15', // Dark Navy
      primaryGlow: '255 255 255',
      secondaryGlow: '80 140 255', // Revolut Blue
      glassTint: '230 240 255',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #ffffff 0%, #508cff 100%)',
  },
  cupertino: {
    id: 'cupertino',
    name: 'Cupertino',
    description: 'California Dream',
    colors: {
      bgDepth: '0 40 60', // Deep Teal
      primaryGlow: '0 220 255', // Cyan
      secondaryGlow: '255 0 100', // Hot Pink
      glassTint: '200 255 255',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #00dcff 0%, #ff0064 100%)',
  },
  vision_pro: {
    id: 'vision_pro',
    name: 'Vision',
    description: 'Spatial Computing',
    colors: {
      bgDepth: '15 15 25', // Deep Space Grey
      primaryGlow: '60 160 255', // Vision Blue
      secondaryGlow: '255 110 160', // Vision Pink
      glassTint: '240 240 255',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #3cafff 0%, #ff6ea0 100%)',
  },
  glassmorphism_premium: {
    id: 'glassmorphism_premium',
    name: 'Glass Premium',
    description: 'Crystal Clear',
    colors: {
      bgDepth: '40 40 50', // Lighter Grey-Blue for contrast
      primaryGlow: '255 255 255',
      secondaryGlow: '180 180 255',
      glassTint: '255 255 255',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #ffffff 0%, #b4b4ff 100%)',
  },
  cristales: {
    id: 'cristales',
    name: 'Crystals',
    description: 'Prismatic Light',
    colors: {
      bgDepth: '25 20 40', // Deep Purple
      primaryGlow: '0 255 255', // Cyan
      secondaryGlow: '255 0 255', // Magenta
      glassTint: '220 255 255',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #00ffff 0%, #ff00ff 100%)',
  },
  liquid_glass: {
    id: 'liquid_glass',
    name: 'Liquid',
    description: 'Flowing State',
    colors: {
      bgDepth: '10 25 35', // Deep Ocean
      primaryGlow: '50 200 255', // Light Blue
      secondaryGlow: '0 150 255', // Ocean Blue
      glassTint: '200 250 255',
      textPrimary: '240 250 255',
    },
    gradient: 'linear-gradient(135deg, #32c8ff 0%, #0096ff 100%)',
  },
  neon: {
    id: 'neon',
    name: 'Neon',
    description: 'Cyberpunk City',
    colors: {
      bgDepth: '10 0 20', // Dark Purple
      primaryGlow: '255 0 120', // Neon Pink
      secondaryGlow: '0 255 220', // Neon Cyan
      glassTint: '255 150 220',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #ff0078 0%, #00ffdc 100%)',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Corporate Blue',
    colors: {
      bgDepth: '10 20 45', // Strong Navy
      primaryGlow: '60 120 255', // Royal Blue
      secondaryGlow: '100 180 255', // Sky Blue
      glassTint: '210 230 255',
      textPrimary: '245 250 255',
    },
    gradient: 'linear-gradient(135deg, #3c78ff 0%, #64b4ff 100%)',
  },
  dorado: {
    id: 'dorado',
    name: 'Dorado',
    description: 'Golden Hour',
    colors: {
      bgDepth: '30 20 5', // Dark Gold/Brown
      primaryGlow: '255 200 0', // Gold
      secondaryGlow: '218 165 32', // Goldenrod
      glassTint: '255 240 180',
      textPrimary: '255 245 210',
    },
    gradient: 'linear-gradient(135deg, #ffc800 0%, #daa520 100%)',
  },
  serio: {
    id: 'serio',
    name: 'Serio',
    description: 'Minimal Dark',
    colors: {
      bgDepth: '0 0 0', // Pure Black
      primaryGlow: '160 160 160', // Light Grey
      secondaryGlow: '80 80 80', // Dark Grey
      glassTint: '180 180 180',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #a0a0a0 0%, #505050 100%)',
  },
  oled: {
    id: 'oled',
    name: 'OLED Deep',
    description: 'Pure Black Contrast',
    colors: {
      bgDepth: '0 0 0',
      primaryGlow: '255 255 255',
      secondaryGlow: '150 150 150',
      glassTint: '255 255 255',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #ffffff 0%, #000000 100%)',
  },
  spotlight: {
    id: 'spotlight',
    name: 'Spotlight',
    description: 'Focus Blue',
    colors: {
      bgDepth: '5 10 20', // Very Dark Blue
      primaryGlow: '56 189 248', // Sky Blue
      secondaryGlow: '15 23 42', // Slate 900
      glassTint: '200 240 255',
      textPrimary: '255 255 255',
    },
    gradient: 'radial-gradient(circle at 50% 0%, #38bdf8 0%, #0f172a 100%)',
  },
  nebula: {
    id: 'nebula',
    name: 'Nebula',
    description: 'Cosmic Purple',
    colors: {
      bgDepth: '15 5 30', // Deep Purple
      primaryGlow: '160 100 255', // Purple
      secondaryGlow: '80 0 150', // Deep Indigo
      glassTint: '220 200 255',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #a064ff 0%, #500096 100%)',
  },
  aurora: {
    id: 'aurora',
    name: 'Aurora',
    description: 'Northern Lights',
    colors: {
      bgDepth: '5 20 20', // Dark Teal
      primaryGlow: '30 220 180', // Teal
      secondaryGlow: '0 100 100', // Dark Teal
      glassTint: '200 255 250',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #1edcb4 0%, #006464 100%)',
  },
};
