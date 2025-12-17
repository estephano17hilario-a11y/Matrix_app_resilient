import React, { createContext, useContext, useState, ReactNode } from 'react';
import { purchaseItem, addGold, StoreItem } from '../services/economyService';
import { useMatrix } from './MatrixContext';

interface EconomyContextType {
  purchase: (item: StoreItem) => Promise<boolean>;
  watchAd: () => Promise<void>;
  isTransactionPending: boolean;
  storeItems: StoreItem[];
}

const EconomyContext = createContext<EconomyContextType | undefined>(undefined);

const STORE_ITEMS: StoreItem[] = [
  // --- POWER UPS (MEJORAS) ---
  {
    id: 'potion_hp_small',
    name: 'Kit de Reparación Neural',
    description: 'Restaura 20 HP al instante. Esencial para el mantenimiento del sistema.',
    price: 150,
    category: 'power_up',
    iconName: 'Zap'
  },
  {
    id: 'potion_xp_restore',
    name: 'Recuperación de Memoria',
    description: 'Restaura XP perdida por inactividad o penalizaciones.',
    price: 400,
    category: 'power_up',
    iconName: 'Brain'
  },
  {
    id: 'redemption_token',
    name: 'Restauración de Racha',
    description: 'Repara una racha rota. Una segunda oportunidad para la perfección.',
    price: 5000,
    category: 'power_up',
    iconName: 'ShieldAlert'
  },
  {
    id: 'freeze_streak',
    name: 'Congelar Tiempo',
    description: 'Congela tu racha por 24 horas. Úsalo antes de un día ocupado.',
    price: 1000,
    category: 'power_up',
    iconName: 'Clock'
  },

  // --- THEMES (TEMAS) ---
  {
    id: 'theme_neon_purple',
    name: 'Protocolo Nébula',
    description: 'Tema UI Púrpura y Rosa Profundo. Estética Cyberpunk.',
    price: 1000,
    category: 'theme',
    iconName: 'Palette'
  },
  {
    id: 'theme_matrix_green',
    name: 'Código Fuente',
    description: 'Verde Matrix Clásico. El flujo de datos crudo.',
    price: 1500,
    category: 'theme',
    iconName: 'Code'
  },
  {
    id: 'theme_apple_minimal',
    name: 'Cristal Cupertino',
    description: 'Estética de cristal esmerilado ultra-limpia. Máxima claridad.',
    price: 2000,
    category: 'theme',
    iconName: 'Smartphone'
  },

  // --- COSMETICS (COSMÉTICOS) ---
  {
    id: 'avatar_cypher',
    name: 'Avatar Cypher',
    description: 'Avatar raro. "La ignorancia es felicidad".',
    price: 2500,
    category: 'cosmetic',
    iconName: 'User'
  },
  {
    id: 'frame_gold',
    name: 'Marco Dorado',
    description: 'Un borde prestigioso para tu avatar.',
    price: 5000,
    category: 'cosmetic',
    iconName: 'Square'
  },
  {
    id: 'banner_cyber_city',
    name: 'Banner Cyber City',
    description: 'Fondo de perfil con un horizonte futurista.',
    price: 1500,
    category: 'cosmetic',
    iconName: 'Image'
  },

  // --- MALOS HÁBITOS (BAD HABITS) ---
  // Category 1: Digital Addiction -> Adicción Digital
  { id: 'bad_habit_shorts', name: 'Doomscrolling Shorts (30m)', description: 'Comprar esto reconoce el hábito de ver videos cortos sin fin.', price: 500, category: 'bad_habit', subCategory: 'Adicción Digital', iconName: 'Smartphone' },
  { id: 'bad_habit_social', name: 'Atracón de Redes Sociales', description: 'Revisar feeds sin propósito.', price: 500, category: 'bad_habit', subCategory: 'Adicción Digital', iconName: 'Share2' },
  { id: 'bad_habit_notifications', name: 'Esclavo de Notificaciones', description: 'Reaccionar instantáneamente a cada pitido.', price: 500, category: 'bad_habit', subCategory: 'Adicción Digital', iconName: 'Bell' },
  { id: 'bad_habit_gaming', name: 'Juego Excesivo', description: 'Jugar cuando deberías estar trabajando.', price: 500, category: 'bad_habit', subCategory: 'Adicción Digital', iconName: 'Gamepad' },
  { id: 'bad_habit_news', name: 'Sobrecarga de Noticias', description: 'Consumir noticias negativas constantemente.', price: 500, category: 'bad_habit', subCategory: 'Adicción Digital', iconName: 'Newspaper' },

  // Category 2: Physical Neglect -> Negligencia Física
  { id: 'bad_habit_sugar', name: 'Subidón de Azúcar', description: 'Consumir bebidas/snacks azucarados en exceso.', price: 500, category: 'bad_habit', subCategory: 'Negligencia Física', iconName: 'Coffee' },
  { id: 'bad_habit_sedentary', name: 'Papa de Sofá', description: 'Sentarse por >2 horas sin moverse.', price: 500, category: 'bad_habit', subCategory: 'Negligencia Física', iconName: 'Armchair' },
  { id: 'bad_habit_sleep', name: 'Venganza del Sueño', description: 'Quedarse despierto tarde sin razón.', price: 500, category: 'bad_habit', subCategory: 'Negligencia Física', iconName: 'Moon' },
  { id: 'bad_habit_posture', name: 'Encorvarse', description: 'Mala postura al trabajar.', price: 500, category: 'bad_habit', subCategory: 'Negligencia Física', iconName: 'UserX' },
  { id: 'bad_habit_water', name: 'Deshidratación', description: 'Olvidar beber agua.', price: 500, category: 'bad_habit', subCategory: 'Negligencia Física', iconName: 'Droplet' },

  // Category 3: Mental Clutter -> Desorden Mental
  { id: 'bad_habit_procrastinate', name: 'Procrastinación', description: 'Retrasar tareas hasta el último minuto.', price: 500, category: 'bad_habit', subCategory: 'Desorden Mental', iconName: 'Clock' },
  { id: 'bad_habit_multitask', name: 'Ilusión de Multitarea', description: 'Hacer todo, no lograr nada.', price: 500, category: 'bad_habit', subCategory: 'Desorden Mental', iconName: 'Layers' },
  { id: 'bad_habit_negative', name: 'Autodiálogo Negativo', description: 'Ser tu propio peor enemigo.', price: 500, category: 'bad_habit', subCategory: 'Desorden Mental', iconName: 'Frown' },
  { id: 'bad_habit_worry', name: 'Preocupación Crónica', description: 'Estresarse por cosas que no puedes controlar.', price: 500, category: 'bad_habit', subCategory: 'Desorden Mental', iconName: 'CloudRain' },
  { id: 'bad_habit_perfection', name: 'Perfeccionismo Paralizante', description: 'Esperar las condiciones "perfectas".', price: 500, category: 'bad_habit', subCategory: 'Desorden Mental', iconName: 'Target' },

  // Category 4: Social/Behavioral -> Social/Comportamiento
  { id: 'bad_habit_interrupt', name: 'Interrumpir a Otros', description: 'Hablar antes de escuchar.', price: 500, category: 'bad_habit', subCategory: 'Social/Comportamiento', iconName: 'MicOff' },
  { id: 'bad_habit_late', name: 'Crónicamente Tarde', description: 'Faltar al respeto al tiempo de los demás.', price: 500, category: 'bad_habit', subCategory: 'Social/Comportamiento', iconName: 'Watch' },
  { id: 'bad_habit_complain', name: 'Quejarse', description: 'Enfocarse en problemas, no soluciones.', price: 500, category: 'bad_habit', subCategory: 'Social/Comportamiento', iconName: 'MessageSquare' },
  { id: 'bad_habit_impulse', name: 'Gasto Impulsivo', description: 'Comprar cosas que no necesitas.', price: 500, category: 'bad_habit', subCategory: 'Social/Comportamiento', iconName: 'CreditCard' },
  { id: 'bad_habit_clutter', name: 'Desorden Físico', description: 'Espacio desordenado, mente desordenada.', price: 500, category: 'bad_habit', subCategory: 'Social/Comportamiento', iconName: 'Trash' },
];

export const EconomyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useMatrix();
  const [isTransactionPending, setIsTransactionPending] = useState(false);

  const purchase = async (item: StoreItem): Promise<boolean> => {
    if (!user?.uid) return false;
    
    setIsTransactionPending(true);
    // Haptic feedback start
    if (navigator.vibrate) navigator.vibrate(20);

    const result = await purchaseItem(user.uid, item);
    
    setIsTransactionPending(false);

    if (result.success) {
      // Success Haptic
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
      return true;
    } else {
      // Error Haptic
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      return false;
    }
  };

  const watchAd = async () => {
    if (!user?.uid) return;
    setIsTransactionPending(true);
    
    // Simulate Ad duration
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await addGold(user.uid, 50);
    setIsTransactionPending(false);
    
    if (navigator.vibrate) navigator.vibrate([50, 50, 50, 50, 100]);
  };

  return (
    <EconomyContext.Provider value={{ purchase, watchAd, isTransactionPending, storeItems: STORE_ITEMS }}>
      {children}
    </EconomyContext.Provider>
  );
};

export const useEconomy = () => {
  const context = useContext(EconomyContext);
  if (context === undefined) {
    throw new Error('useEconomy must be used within an EconomyProvider');
  }
  return context;
};
