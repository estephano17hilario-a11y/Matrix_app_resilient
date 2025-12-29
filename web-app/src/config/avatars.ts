export interface AvatarConfig {
  id: string;
  path: string;
  name: string;
  rarity: 'COMMON' | 'RARE' | 'LEGENDARY';
  themeColor?: string;
  themeColorRgb?: string; // For CSS Variables (Space separated RGB)
}

export const AVAILABLE_AVATARS: AvatarConfig[] = [
  // COPIAR Y PEGAR ESTO PARA AÑADIR MÁS
  {
    id: 'avatar_cafe_programadora',
    path: '/avatars/manhwa/avatar_cafe_programadora.webp',
    name: 'Coffee Coder',
    rarity: 'COMMON',
    themeColor: '#fb923c', // Orange
    themeColorRgb: '251 146 60'
  },
  {
    id: 'avatar_ceo_ajedrez',
    path: '/avatars/manhwa/avatar_ceo_ajedrez.webp',
    name: 'Mastermind CEO',
    rarity: 'LEGENDARY',
    themeColor: '#facc15', // Amber Gold -> Yellow
    themeColorRgb: '250 204 21'
  },
  {
    id: 'avatar_chica_mariposa',
    path: '/avatars/manhwa/avatar_chica_mariposa_morada.webp',
    name: 'Butterfly Effect',
    rarity: 'RARE',
    themeColor: '#a855f7', // Purple
    themeColorRgb: '168 85 247'
  },
  {
    id: 'avatar_chico_azul',
    path: '/avatars/manhwa/avatar_chico_azul_libro.webp',
    name: 'The Scholar',
    rarity: 'COMMON',
    themeColor: '#38bdf8', // Celeste (Sky 400)
    themeColorRgb: '56 189 248'
  },
  {
    id: 'avatar_chico_combatiente',
    path: '/avatars/manhwa/avatar_chico_combatiente.webp',
    name: 'Street Fighter',
    rarity: 'RARE',
    themeColor: '#3b82f6', // Blue 500
    themeColorRgb: '59 130 246'
  },
  {
    id: 'avatar_chico_vino',
    path: '/avatars/manhwa/avatar_chico_con_el_vino.webp',
    name: 'The Connoisseur',
    rarity: 'LEGENDARY',
    themeColor: '#fb7185', // Soft Red/Rose
    themeColorRgb: '251 113 133'
  },
  {
    id: 'avatar_chico_sueno',
    path: '/avatars/manhwa/avatar_chico_con_sueno.webp',
    name: 'Dream Walker',
    rarity: 'COMMON',
    themeColor: '#bae6fd', // Light Sky/White-ish
    themeColorRgb: '186 230 253'
  },
  {
    id: 'avatar_rojo_psicopata',
    path: '/avatars/manhwa/avatar_rojo_psicopata.webp',
    name: 'Chaos Agent',
    rarity: 'LEGENDARY',
    themeColor: '#ef4444', // Red
    themeColorRgb: '239 68 68'
  },
];

export const getAvatarPath = (avatarId?: string) => {
  const avatar = AVAILABLE_AVATARS.find(a => a.id === avatarId);
  return avatar ? avatar.path : null;
};

export const getAvatarConfig = (avatarId?: string) => {
  return AVAILABLE_AVATARS.find(a => a.id === avatarId);
};
