import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMatrix } from '../../context/MatrixContext';
import { ACHIEVEMENTS, AchievementCategory, Achievement } from '../../config/achievements';
import { Lock, Trophy } from 'lucide-react';
import { AuroraBackground } from '../../components/AuroraBackground';
import { useTranslation } from 'react-i18next';

// --- COMPONENTS ---

const CategoryTab = ({ 
  label, 
  isActive, 
  onClick 
}: { 
  label: string; 
  isActive: boolean; 
  onClick: () => void; 
}) => (
  <button
    onClick={onClick}
    className={`
      relative px-4 py-2 rounded-full text-xs font-medium tracking-wide transition-all duration-300
      ${isActive 
        ? 'text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
        : 'text-white/40 hover:text-white/80'}
    `}
  >
    {/* Active Background Pill */}
    {isActive && (
      <motion.div
        layoutId="activeTab"
        className="absolute inset-0 bg-white/10 border border-white/10 rounded-full backdrop-blur-md"
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    )}
    <span className="relative z-10">{label}</span>
  </button>
);

const AchievementNode: React.FC<{ achievement: Achievement; isUnlocked: boolean }> = ({ achievement, isUnlocked }) => {
  const { t } = useTranslation();
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ 
        opacity: isUnlocked ? 1 : 0.5, 
        scale: 1,
        filter: isUnlocked ? 'grayscale(0%)' : 'grayscale(100%)'
      }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative group flex flex-col items-center p-6 text-center
        rounded-[32px] border transition-all duration-500 overflow-hidden
        ${isUnlocked 
          ? 'bg-gray-900/40 backdrop-blur-3xl backdrop-saturate-150 border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_20px_50px_-12px_rgba(79,70,229,0.15)]' 
          : 'bg-black/20 backdrop-blur-sm border-white/5'}
      `}
    >
      {/* Glow Effect for Unlocked */}
      {isUnlocked && (
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      )}

      {/* Icon Container */}
      <div className={`
        relative z-10 mb-4 p-4 rounded-full transition-all duration-700
        ${isUnlocked 
          ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 shadow-[0_0_40px_rgba(99,102,241,0.2)] ring-1 ring-white/20' 
          : 'bg-white/5 ring-1 ring-white/5'}
      `}>
        {isUnlocked 
          ? <achievement.icon className="w-8 h-8 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" strokeWidth={1.5} />
          : <Lock className="w-8 h-8 text-white/20" strokeWidth={1.5} />
        }
      </div>

      {/* Text Content */}
      <div className="relative z-10">
        <h3 className={`text-sm font-semibold tracking-tight mb-1 ${isUnlocked ? 'text-white' : 'text-white/30'}`}>
          {t(achievement.title)}
        </h3>
        <p className={`text-[11px] leading-relaxed font-medium ${isUnlocked ? 'text-white/60' : 'text-white/20'}`}>
          {t(achievement.description, { level: achievement.level })}
        </p>
      </div>

      {/* XP Reward Badge */}
      {isUnlocked && (
        <div className="absolute top-4 right-4">
           <span className="text-[10px] font-mono font-bold text-emerald-400 drop-shadow-sm">
             +{Math.floor(achievement.xpReward)} {t('achievements.currency')}
           </span>
        </div>
      )}
    </motion.div>
  );
};

// --- MAIN SCREEN ---

const categoryLabels: Record<string, string> = {
  ALL: 'achievements.categories.all',
  LEVEL: 'achievements.categories.level',
  STREAK: 'achievements.categories.streak',
  TRAIT: 'achievements.categories.trait',
  RANK: 'achievements.categories.rank'
};

export const AchievementsScreen: React.FC = () => {
  const { user } = useMatrix();
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'ALL'>('ALL');

  if (!user) return <div className="p-10 text-white/50 text-center animate-pulse">{t('achievements.loading')}</div>;

  const unlockedSet = new Set(user.unlockedAchievements || []);
  const categories: (AchievementCategory | 'ALL')[] = ['ALL', 'LEVEL', 'STREAK', 'TRAIT'];

  const filteredAchievements = ACHIEVEMENTS.filter(ach => 
    selectedCategory === 'ALL' || ach.category === selectedCategory
  );

  const completionPercentage = Math.floor((unlockedSet.size / ACHIEVEMENTS.length) * 100);

  return (
    <div className="min-h-screen text-white p-6 pb-32 overflow-y-auto overflow-x-hidden relative">
      
      <AuroraBackground />

      {/* Content Container */}
      <div className="relative z-10 max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="mb-10 mt-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-2 text-white drop-shadow-lg">
              {t('achievements.title')}
            </h1>
            <p className="text-white/60 text-sm md:text-base font-medium max-w-md">
              {t('achievements.subtitle')}
            </p>
          </motion.div>
          
          {/* Progress Pill */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-4 bg-gray-900/40 backdrop-blur-xl border border-white/10 px-5 py-3 rounded-2xl shadow-lg"
          >
            <div className="text-right">
              <span className="block text-xs font-bold text-white/40 uppercase tracking-widest">{t('achievements.sync')}</span>
              <span className="block text-xl font-mono font-bold text-white">{completionPercentage}%</span>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center relative">
               <Trophy className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" size={24} />
            </div>
          </motion.div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar mask-linear-fade">
          {categories.map((cat) => (
            <CategoryTab 
              key={cat} 
              label={t(categoryLabels[cat] || cat)} 
              isActive={selectedCategory === cat} 
              onClick={() => setSelectedCategory(cat)} 
            />
          ))}
        </div>

        {/* Masonry Grid */}
        <motion.div 
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          <AnimatePresence mode='popLayout'>
            {filteredAchievements.map((ach) => {
              const isUnlocked = unlockedSet.has(ach.id);
              return (
                <AchievementNode 
                  key={ach.id} 
                  achievement={ach} 
                  isUnlocked={isUnlocked} 
                />
              );
            })}
          </AnimatePresence>
        </motion.div>

        {filteredAchievements.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Lock className="text-white/20" />
            </div>
            <p className="text-white/30 font-medium">{t('achievements.empty')}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};
