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
  apple: {
    id: 'apple',
    name: 'Apple',
    description: 'Titanium & Silver',
    colors: {
      bgDepth: '20 20 22',
      primaryGlow: '255 255 255',
      secondaryGlow: '0 122 255',
      glassTint: '255 255 255',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #f5f5f7 0%, #1c1c1e 100%)',
  },
  apple_intelligence: {
    id: 'apple_intelligence',
    name: 'Intelligence',
    description: 'Siri Reborn',
    colors: {
      bgDepth: '10 10 20',
      primaryGlow: '0 198 255',
      secondaryGlow: '255 59 154',
      glassTint: '200 200 255',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #00c6ff 0%, #ff3b9a 100%)',
  },
  revolut: {
    id: 'revolut',
    name: 'Revolut',
    description: 'Fintech Ultra',
    colors: {
      bgDepth: '10 10 10',
      primaryGlow: '255 255 255',
      secondaryGlow: '64 120 240',
      glassTint: '255 255 255',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #ffffff 0%, #4078f0 100%)',
  },
  cupertino: {
    id: 'cupertino',
    name: 'Cupertino',
    description: 'California Dream',
    colors: {
      bgDepth: '0 30 50',
      primaryGlow: '0 200 255',
      secondaryGlow: '255 0 100',
      glassTint: '200 255 255',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #00c8ff 0%, #ff0064 100%)',
  },
  vision_pro: {
    id: 'vision_pro',
    name: 'Vision',
    description: 'Spatial Computing',
    colors: {
      bgDepth: '10 10 15',
      primaryGlow: '50 150 255',
      secondaryGlow: '255 100 150',
      glassTint: '255 255 255',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #3296ff 0%, #ff6496 100%)',
  },
  glassmorphism_premium: {
    id: 'glassmorphism_premium',
    name: 'Glass Premium',
    description: 'Crystal Clear',
    colors: {
      bgDepth: '30 30 40',
      primaryGlow: '255 255 255',
      secondaryGlow: '200 200 255',
      glassTint: '255 255 255',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #ffffff 0%, #c8c8ff 100%)',
  },
  cristales: {
    id: 'cristales',
    name: 'Crystals',
    description: 'Prismatic Light',
    colors: {
      bgDepth: '20 20 30',
      primaryGlow: '0 255 255',
      secondaryGlow: '255 0 255',
      glassTint: '200 255 255',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #00ffff 0%, #ff00ff 100%)',
  },
  liquid_glass: {
    id: 'liquid_glass',
    name: 'Liquid',
    description: 'Flowing State',
    colors: {
      bgDepth: '15 20 25',
      primaryGlow: '100 200 255',
      secondaryGlow: '100 200 255',
      glassTint: '200 240 255',
      textPrimary: '240 250 255',
    },
    gradient: 'linear-gradient(135deg, #64c8ff 0%, #3296ff 100%)',
  },
  neon: {
    id: 'neon',
    name: 'Neon',
    description: 'Cyberpunk City',
    colors: {
      bgDepth: '5 5 10',
      primaryGlow: '255 0 100',
      secondaryGlow: '0 255 200',
      glassTint: '255 100 200',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #ff0064 0%, #00ffc8 100%)',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Corporate Blue',
    colors: {
      bgDepth: '10 15 30',
      primaryGlow: '50 100 200',
      secondaryGlow: '100 150 200',
      glassTint: '200 220 255',
      textPrimary: '240 245 255',
    },
    gradient: 'linear-gradient(135deg, #3264c8 0%, #6496c8 100%)',
  },
  dorado: {
    id: 'dorado',
    name: 'Dorado',
    description: 'Golden Hour',
    colors: {
      bgDepth: '20 15 5',
      primaryGlow: '255 215 0',
      secondaryGlow: '218 165 32',
      glassTint: '255 230 150',
      textPrimary: '255 240 200',
    },
    gradient: 'linear-gradient(135deg, #ffd700 0%, #daa520 100%)',
  },
  serio: {
    id: 'serio',
    name: 'Serio',
    description: 'Minimal Dark',
    colors: {
      bgDepth: '0 0 0',
      primaryGlow: '128 128 128',
      secondaryGlow: '64 64 64',
      glassTint: '150 150 150',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #808080 0%, #404040 100%)',
  },
  oled: {
    id: 'oled',
    name: 'OLED Deep',
    description: 'Pure Black Contrast',
    colors: {
      bgDepth: '0 0 0',
      primaryGlow: '255 255 255',
      secondaryGlow: '100 100 100',
      glassTint: '255 255 255',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
  },
  spotlight: {
    id: 'spotlight',
    name: 'Spotlight',
    description: 'Focus Blue',
    colors: {
      bgDepth: '0 0 0',
      primaryGlow: '56 189 248',
      secondaryGlow: '0 0 0',
      glassTint: '200 240 255',
      textPrimary: '255 255 255',
    },
    gradient: 'radial-gradient(circle at 50% 0%, #38bdf8 0%, #000000 100%)',
  },
  nebula: {
    id: 'nebula',
    name: 'Nebula',
    description: 'Cosmic Purple',
    colors: {
      bgDepth: '10 5 20',
      primaryGlow: '139 92 246',
      secondaryGlow: '50 0 100',
      glassTint: '200 200 255',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
  },
  aurora: {
    id: 'aurora',
    name: 'Aurora',
    description: 'Northern Lights',
    colors: {
      bgDepth: '0 10 10',
      primaryGlow: '20 184 166',
      secondaryGlow: '0 50 50',
      glassTint: '200 255 255',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
  },
};
