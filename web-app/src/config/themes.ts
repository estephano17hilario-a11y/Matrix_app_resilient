export type ThemeCategory = 'orbs' | 'minimal' | 'nature' | 'flow';

export type ThemeId = 
  | 'ether' | 'matrix' | 'digital_rain' | 'sunset' | 'stealth' | 'apple' | 'apple_intelligence' 
  | 'revolut' | 'cupertino' | 'vision_pro' | 'glassmorphism_premium' | 'cristales' 
  | 'liquid_glass' | 'neon' | 'enterprise' | 'dorado' | 'serio' | 'oled' 
  | 'spotlight' | 'nebula' | 'aurora' | 'amy' | 'modern_dark' | 'modern_light' 
  | 'luxury' | 'graphite' | 'simple_dark'
  | 'midnight_flow' | 'titanium_flow' | 'velvet_flow' | 'oceanic_flow' | 'phantom_flow' | 'ember_flow';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  category: ThemeCategory;
  colors: {
    bgDepth: string;      // RGB values like "2 2 4"
    primaryGlow: string;  // RGB values
    secondaryGlow: string;// RGB values
    glassTint: string;    // RGB values
    textPrimary: string;  // RGB values
  };
  gradient: string; // CSS gradient for preview
  bgStyle?: string; // Optional full background override (e.g., gradient)
  isSolid?: boolean; // If true, disables orbs/aurora effects for a flat look
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  ether: {
    id: 'ether',
    name: 'Ether',
    description: 'Sentient Glass Default',
    category: 'orbs',
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
    name: 'Matrix',
    description: 'Neon Code Stream',
    category: 'orbs',
    colors: {
      bgDepth: '2 6 4',
      primaryGlow: '0 255 120',
      secondaryGlow: '0 120 80',
      glassTint: '120 255 200',
      textPrimary: '230 255 240',
    },
    gradient: 'linear-gradient(135deg, #00ff88 0%, #004d2b 100%)',
  },
  digital_rain: {
    id: 'digital_rain',
    name: 'Digital Rain',
    description: 'Digital Rain',
    category: 'orbs',
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
    category: 'nature',
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
    category: 'minimal',
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
    category: 'minimal',
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
    category: 'orbs',
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
    category: 'minimal',
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
    category: 'minimal',
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
    category: 'orbs',
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
    category: 'minimal',
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
    category: 'orbs',
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
    category: 'orbs',
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
    category: 'orbs',
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
    category: 'minimal',
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
    category: 'nature',
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
    description: 'Executive Black',
    category: 'minimal',
    colors: {
      bgDepth: '10 10 12',
      primaryGlow: '200 200 200',
      secondaryGlow: '100 100 100',
      glassTint: '150 150 160',
      textPrimary: '240 240 245',
    },
    gradient: 'linear-gradient(135deg, #e2e2e2 0%, #404040 100%)',
  },
  oled: {
    id: 'oled',
    name: 'OLED',
    description: 'True Black Mastery',
    category: 'minimal',
    colors: {
      bgDepth: '0 0 0',
      primaryGlow: '255 255 255',
      secondaryGlow: '30 30 30',
      glassTint: '50 50 50',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
  },
  amy: {
    id: 'amy',
    name: 'Amy',
    description: 'Nature & Serenity',
    category: 'nature',
    colors: {
      bgDepth: '5 20 18', // Much darker/subtler Jungle Green (Less overwhelming)
      primaryGlow: '52 211 153', // Emerald-400 (Kept Bright)
      secondaryGlow: '20 184 166', // Teal-500
      glassTint: '15 40 35', // Darker tint
      textPrimary: '240 253 244', // Mint cream
    },
    gradient: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)', // Darker gradient (Emerald-900 to almost black)
  },
  spotlight: {
    id: 'spotlight',
    name: 'Spotlight',
    description: 'Focus Blue',
    category: 'orbs',
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
    category: 'orbs',
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
    category: 'orbs',
    colors: {
      bgDepth: '5 15 25', // Deep Aurora Blue
      primaryGlow: '0 255 180', // Aurora Green
      secondaryGlow: '140 60 255', // Aurora Purple
      glassTint: '200 255 245',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #00ffb4 0%, #8c3cff 100%)',
  },
  modern_dark: {
    id: 'modern_dark',
    name: 'Modern Dark',
    description: 'Serious & Solid',
    category: 'minimal',
    isSolid: true,
    colors: {
      bgDepth: '26 27 30', // Slightly Darker Cool Grey (User requested "a bit more black")
      primaryGlow: '255 255 255', // Pure White
      secondaryGlow: '71 85 105', // Slate-600
      glassTint: '45 55 75', // Darker Slate tint
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #1a1b1e 0%, #374151 100%)',
  },
  modern_light: {
    id: 'modern_light',
    name: 'Modern Light',
    description: 'Clean Minimalist',
    category: 'minimal',
    isSolid: true,
    colors: {
      bgDepth: '252 252 252', // Almost Pure White for max contrast
      primaryGlow: '0 0 0', // Black
      secondaryGlow: '60 60 60', // Darker Grey for visibility
      glassTint: '240 240 240', // Slightly visible glass
      textPrimary: '0 0 0', // Pure Black Text
    },
    gradient: 'linear-gradient(135deg, #ffffff 0%, #e5e5ea 100%)',
  },
  simple_dark: {
    id: 'simple_dark',
    name: 'To-Do Dark',
    description: 'Pure Focus',
    category: 'minimal',
    isSolid: true,
    colors: {
      bgDepth: '10 10 10', // Almost Black
      primaryGlow: '255 255 255', // White
      secondaryGlow: '40 40 40', // Dark Grey
      glassTint: '20 20 20',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
  },
  luxury: {
    id: 'luxury',
    name: 'Luxury',
    description: 'Gold & Velvet',
    category: 'nature',
    colors: {
      bgDepth: '15 10 5', // Deep Brown/Black
      primaryGlow: '255 215 0', // Gold
      secondaryGlow: '184 134 11', // Dark Goldenrod
      glassTint: '40 30 20',
      textPrimary: '255 245 230',
    },
    gradient: 'linear-gradient(135deg, #ffd700 0%, #8b4513 100%)',
  },
  graphite: {
    id: 'graphite',
    name: 'Graphite',
    description: 'Industrial Focus',
    category: 'minimal',
    colors: {
      bgDepth: '30 32 34', // Gunmetal
      primaryGlow: '160 170 180', // Steel Blue-Grey
      secondaryGlow: '80 90 100', // Slate
      glassTint: '50 55 60',
      textPrimary: '240 245 250',
    },
    gradient: 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)',
  },
  
  // --- NEW FLOW THEMES (APPLE DESIGN) ---
  midnight_flow: {
    id: 'midnight_flow',
    name: 'Midnight Flow',
    description: 'Deep Horizon',
    category: 'flow',
    isSolid: true,
    bgStyle: 'linear-gradient(135deg, #0f0c29 0%, #302b63 100%)',
    colors: {
      bgDepth: '15 12 41',
      primaryGlow: '100 100 255',
      secondaryGlow: '48 43 99',
      glassTint: '40 40 60',
      textPrimary: '240 240 255',
    },
    gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 100%)',
  },
  titanium_flow: {
    id: 'titanium_flow',
    name: 'Titanium Flow',
    description: 'Metallic Silence',
    category: 'flow',
    isSolid: true,
    bgStyle: 'linear-gradient(135deg, #2b2b2b 0%, #4a4a4a 100%)',
    colors: {
      bgDepth: '35 37 38',
      primaryGlow: '200 200 200',
      secondaryGlow: '100 100 100',
      glassTint: '60 60 60',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #2b2b2b 0%, #4a4a4a 100%)',
  },
  velvet_flow: {
    id: 'velvet_flow',
    name: 'Velvet Flow',
    description: 'Royal Touch',
    category: 'flow',
    isSolid: true,
    bgStyle: 'linear-gradient(135deg, #1a0b2e 0%, #4a148c 100%)',
    colors: {
      bgDepth: '33 5 21',
      primaryGlow: '200 100 200',
      secondaryGlow: '100 20 60',
      glassTint: '60 20 40',
      textPrimary: '255 240 250',
    },
    gradient: 'linear-gradient(135deg, #1a0b2e 0%, #4a148c 100%)',
  },
  oceanic_flow: {
    id: 'oceanic_flow',
    name: 'Oceanic Flow',
    description: 'Deep Waters',
    category: 'flow',
    isSolid: true,
    bgStyle: 'linear-gradient(135deg, #0f2027 0%, #2c5364 100%)',
    colors: {
      bgDepth: '15 32 39',
      primaryGlow: '0 200 255',
      secondaryGlow: '0 100 150',
      glassTint: '20 50 60',
      textPrimary: '240 255 255',
    },
    gradient: 'linear-gradient(135deg, #0f2027 0%, #2c5364 100%)',
  },
  phantom_flow: {
    id: 'phantom_flow',
    name: 'Phantom Flow',
    description: 'Shadow Essence',
    category: 'flow',
    isSolid: true,
    bgStyle: 'linear-gradient(135deg, #000000 0%, #434343 100%)',
    colors: {
      bgDepth: '10 10 10',
      primaryGlow: '255 255 255',
      secondaryGlow: '50 50 50',
      glassTint: '30 30 30',
      textPrimary: '255 255 255',
    },
    gradient: 'linear-gradient(135deg, #000000 0%, #434343 100%)',
  },
  ember_flow: {
    id: 'ember_flow',
    name: 'Ember Flow',
    description: 'Subtle Heat',
    category: 'flow',
    isSolid: true,
    bgStyle: 'linear-gradient(135deg, #3E0E0E 0%, #752814 100%)',
    colors: {
      bgDepth: '62 18 8',
      primaryGlow: '255 100 50',
      secondaryGlow: '150 50 20',
      glassTint: '80 30 20',
      textPrimary: '255 240 230',
    },
    gradient: 'linear-gradient(135deg, #3E0E0E 0%, #752814 100%)',
  },
};
