export interface AvatarConfig {
  id: string;
  path: string;
  name: string;
  rarity: 'COMMON' | 'RARE' | 'LEGENDARY';
  themeColor?: string;
}

export const AVAILABLE_AVATARS: AvatarConfig[] = [
  // COPIAR Y PEGAR ESTO PARA AÑADIR MÁS
  {
    id: 'avatar_cafe_programadora',
    path: '/avatars/manhwa/avatar_cafe_programadora.webp',
    name: 'Coffee Coder',
    rarity: 'COMMON',
    themeColor: '#e0aaff' // Soft Purple
  },
  {
    id: 'avatar_ceo_ajedrez',
    path: '/avatars/manhwa/avatar_ceo_ajedrez.webp',
    name: 'Mastermind CEO',
    rarity: 'LEGENDARY',
    themeColor: '#fbbf24' // Amber Gold
  },
  {
    id: 'avatar_chica_mariposa',
    path: '/avatars/manhwa/avatar_chica_mariposa_morada.webp',
    name: 'Butterfly Effect',
    rarity: 'RARE',
    themeColor: '#d8b4fe' // Lavender
  },
  {
    id: 'avatar_chico_azul',
    path: '/avatars/manhwa/avatar_chico_azul_libro.webp',
    name: 'The Scholar',
    rarity: 'COMMON',
    themeColor: '#60a5fa' // Blue
  },
  {
    id: 'avatar_chico_combatiente',
    path: '/avatars/manhwa/avatar_chico_combatiente.webp',
    name: 'Street Fighter',
    rarity: 'RARE',
    themeColor: '#f87171' // Red
  },
  {
    id: 'avatar_chico_vino',
    path: '/avatars/manhwa/avatar_chico_con_el_vino.webp',
    name: 'The Connoisseur',
    rarity: 'LEGENDARY',
    themeColor: '#9f1239' // Wine Red
  },
  {
    id: 'avatar_chico_sueno',
    path: '/avatars/manhwa/avatar_chico_con_sueno.webp',
    name: 'Dream Walker',
    rarity: 'COMMON',
    themeColor: '#94a3b8' // Slate
  },
  {
    id: 'avatar_rojo_psicopata',
    path: '/avatars/manhwa/avatar_rojo_psicopata.webp',
    name: 'Chaos Agent',
    rarity: 'LEGENDARY',
    themeColor: '#dc2626' // Deep Red
  },
];

export const getAvatarPath = (avatarId?: string) => {
  const avatar = AVAILABLE_AVATARS.find(a => a.id === avatarId);
  return avatar ? avatar.path : null;
};

export const getAvatarConfig = (avatarId?: string) => {
  return AVAILABLE_AVATARS.find(a => a.id === avatarId);
};
