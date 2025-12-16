export type ThemeId = 'ether' | 'matrix' | 'sunset' | 'stealth' | 'apple' | 'apple_intelligence' | 'revolut' | 'cupertino' | 'vision_pro' | 'glassmorphism_premium' | 'cristales' | 'liquid_glass' | 'neon' | 'enterprise' | 'dorado' | 'serio';

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
    gradient: 'linear-gradient(135deg, #000000 0%, #ffffff 100%)',
  },
  cupertino: {
    id: 'cupertino',
    name: 'Cupertino',
    description: 'Big Sur Vibes',
    colors: {
      bgDepth: '0 30 50',
      primaryGlow: '0 200 255',
      secondaryGlow: '255 0 100',
      glassTint: '200 255 255',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #ef4444 100%)',
  },
  vision_pro: {
    id: 'vision_pro',
    name: 'Vision Pro',
    description: 'Spatial Computing',
    colors: {
      bgDepth: '10 10 15',
      primaryGlow: '50 150 255',
      secondaryGlow: '255 100 150',
      glassTint: '255 255 255',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #60a5fa 0%, #f472b6 100%)',
  },
  glassmorphism_premium: {
    id: 'glassmorphism_premium',
    name: 'Glass Premium',
    description: 'Frosted Elegance',
    colors: {
      bgDepth: '30 30 40',
      primaryGlow: '255 255 255',
      secondaryGlow: '200 200 255',
      glassTint: '255 255 255',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)',
  },
  cristales: {
    id: 'cristales',
    name: 'Cristales',
    description: 'Light Prism',
    colors: {
      bgDepth: '20 20 30',
      primaryGlow: '0 255 255',
      secondaryGlow: '255 0 255',
      glassTint: '200 255 255',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #22d3ee 0%, #e879f9 100%)',
  },
  liquid_glass: {
    id: 'liquid_glass',
    name: 'Liquid Glass',
    description: 'Molten Flow',
    colors: {
      bgDepth: '15 20 25',
      primaryGlow: '100 200 255',
      secondaryGlow: '100 200 255',
      glassTint: '200 240 255',
      textPrimary: '240 250 255',
    },
    gradient: 'linear-gradient(135deg, #7dd3fc 0%, #38bdf8 100%)',
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
    gradient: 'linear-gradient(135deg, #f0abfc 0%, #2dd4bf 100%)',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Professional Blue',
    colors: {
      bgDepth: '10 15 30',
      primaryGlow: '50 100 200',
      secondaryGlow: '100 150 200',
      glassTint: '200 220 255',
      textPrimary: '240 245 255',
    },
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
  },
  dorado: {
    id: 'dorado',
    name: 'Dorado',
    description: 'Luxury Gold',
    colors: {
      bgDepth: '20 15 5',
      primaryGlow: '255 215 0',
      secondaryGlow: '218 165 32',
      glassTint: '255 230 150',
      textPrimary: '255 240 200',
    },
    gradient: 'linear-gradient(135deg, #fcd34d 0%, #d97706 100%)',
  },
  serio: {
    id: 'serio',
    name: 'Serio',
    description: 'Absolute Monochrome',
    colors: {
      bgDepth: '0 0 0',
      primaryGlow: '128 128 128',
      secondaryGlow: '64 64 64',
      glassTint: '150 150 150',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #000000 0%, #737373 100%)',
  },
};
