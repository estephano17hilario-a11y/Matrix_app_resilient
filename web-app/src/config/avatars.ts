export interface AvatarConfig {
  id: string;
  path: string;
  name: string;
  rarity: 'COMMON' | 'RARE' | 'LEGENDARY';
}

export const AVAILABLE_AVATARS: AvatarConfig[] = [
  // COPIAR Y PEGAR ESTO PARA AÑADIR MÁS
  {
    id: 'avatar_001',
    path: '/avatars/avatar_01.webp',
    name: 'The Recruit',
    rarity: 'COMMON'
  },
  {
    id: 'avatar_002',
    path: '/avatars/avatar_02.webp',
    name: 'Cyber Monk',
    rarity: 'RARE'
  },
  {
    id: 'avatar_003',
    path: '/avatars/avatar_03.webp',
    name: 'Neon Samurai',
    rarity: 'LEGENDARY'
  },
  // Añade tus avatares aquí...
];

export const getAvatarPath = (avatarId?: string) => {
  const avatar = AVAILABLE_AVATARS.find(a => a.id === avatarId);
  return avatar ? avatar.path : null;
};
