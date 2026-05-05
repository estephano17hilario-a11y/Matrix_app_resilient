import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLux } from '@/context/LuxContext';
import { ACHIEVEMENTS, AchievementCategory, Achievement, TRAIT_ICONS } from '../../config/achievements';
import { Lock, Trophy } from 'lucide-react';
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
 relative px-5 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200
 ${isActive 
 ? 'text-white shadow-[0_0_20px_rgba(255,255,255,0.2)] scale-105' 
 : 'text-white/40 hover:text-white/80 hover:bg-white/5'}
 `}
 >
 {/* Active Background Pill */}
 {isActive && (
 <motion.div
 layoutId="activeTab"
 className="absolute inset-0 bg-white/20 border border-white/20 rounded-full"
 transition={{ type: "spring", stiffness: 450, damping: 25 }}
 />
 )}
 <span className="relative z-10 flex items-center gap-2">
 {label}
 </span>
 </button>
);

const TraitFilterPill = ({
 traitId,
 isActive,
 onClick
}: {
 traitId: string;
 isActive: boolean;
 onClick: () => void;
}) => {
 const { t } = useTranslation();
 const Icon = TRAIT_ICONS[traitId];
 
 return (
 <button
 onClick={onClick}
 className={`
 flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase transition-all duration-200 border
 ${isActive 
 ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-105' 
 : 'bg-black/40 text-white/50 border-white/10 hover:border-white/30 hover:text-white'}
 `}
 >
 {Icon && <Icon size={12} className={isActive ? "text-black" : "text-white/50"} />}
 <span>{t(`traits.${traitId}`, traitId)}</span>
 </button>
 );
};

const AchievementNode: React.FC<{ achievement: Achievement; isUnlocked: boolean }> = React.memo(({ achievement, isUnlocked }) => {
 const { t } = useTranslation();
 
 return (
 <motion.div
 initial={{ opacity: 0, scale: 0.9, y: 20 }}
 animate={{ 
 opacity: isUnlocked ? 1 : 0.6, 
 scale: 1, 
 y: 0
 }}
 whileHover={{ 
 scale: 1.02, 
 y: -5,
 backgroundColor: isUnlocked ? 'rgba(17, 24, 39, 0.7)' : 'rgba(0, 0, 0, 0.3)'
 }}
 whileTap={{ scale: 0.98 }}
 className={`
 relative group flex flex-col p-4 sm:p-5 text-left h-full min-w-0
 rounded-[24px] border transition-all duration-200 overflow-hidden
 ${isUnlocked 
 ? 'bg-gradient-to-b from-gray-800/80 to-gray-900/80 border-white/10 shadow-md hover:shadow-md grayscale-0' 
 : 'bg-black/60 border-white/5 opacity-70 grayscale'}
 `}
 >
 {/* Shine Effect */}
 <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

 {/* Top Section: Icon & Reward */}
 <div className="flex justify-between items-center mb-4 relative z-10">
 <div className={`
 p-3 rounded-2xl transition-all duration-200
 ${isUnlocked 
 ? 'bg-gradient-to-br from-white/10 to-white/5 border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]' 
 : 'bg-white/5 border border-white/5'}
 `}>
 {isUnlocked 
 ? <achievement.icon className="w-6 h-6 text-white" strokeWidth={1.5} />
 : <Lock className="w-6 h-6 text-white/20" strokeWidth={1.5} />
 }
 </div>

 {isUnlocked && (
 <span className="px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400 drop-shadow-sm leading-none">
 +{Math.floor(achievement.xpReward)} XP
 </span>
 )}
 </div>

 {/* Text Content */}
 <div className="relative z-10 mt-auto">
 <h3 className={`text-sm font-bold tracking-tight mb-1.5 leading-tight ${isUnlocked ? 'text-white' : 'text-white/30'}`}>
 {t(achievement.title)}
 </h3>
 <p className={`text-[11px] leading-relaxed font-medium line-clamp-2 ${isUnlocked ? 'text-white/60' : 'text-white/20'}`}>
 {t(achievement.description, { level: achievement.level })}
 </p>
 </div>
 
 {/* Level Indicator for Traits */}
 {achievement.category === 'TRAIT' && achievement.level && (
 <div className="absolute bottom-4 right-4 text-[9px] font-bold text-white/10 uppercase tracking-widest pointer-events-none">
 LVL {achievement.level}
 </div>
 )}
 </motion.div>
 );
});

// --- MAIN SCREEN ---

const categoryLabels: Record<string, string> = {
 ALL: 'achievements.categories.all',
 LEVEL: 'achievements.categories.level',
 STREAK: 'achievements.categories.streak',
 TRAIT: 'achievements.categories.trait',
 RANK: 'achievements.categories.rank'
};

export const AchievementsScreen: React.FC = () => {
 const { user } = useLux();
 const { t } = useTranslation();
 const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'ALL'>('ALL');
 const [selectedTrait, setSelectedTrait] = useState<string | null>(null);

 // Memoize filters for performance
 const { unlockedSet, completionPercentage } = useMemo(() => {
 if (!user) return { unlockedSet: new Set(), completionPercentage: 0 };
 
 let achList = user.unlockedAchievements;
 if (!achList || achList.length === 0) {
 try {
 const localAch = localStorage.getItem(`matrix_achievements_${user.id}`);
 if (localAch) {
 achList = JSON.parse(localAch);
 }
 } catch(e) {}
 }
 
 const set = new Set(achList || []);
 const pct = Math.floor((set.size / ACHIEVEMENTS.length) * 100);
 return { unlockedSet: set, completionPercentage: pct };
 }, [user]);

 const filteredAchievements = useMemo(() => {
 return ACHIEVEMENTS.filter(ach => {
 // 1. Filter by Category
 if (selectedCategory !== 'ALL' && ach.category !== selectedCategory) return false;
 
 // 2. Filter by Specific Trait (if Trait category is selected and a trait filter is active)
 if (selectedCategory === 'TRAIT' && selectedTrait) {
 return ach.id.includes(`_${selectedTrait}_`);
 }
 
 return true;
 });
 }, [selectedCategory, selectedTrait]);

 const categories: (AchievementCategory | 'ALL')[] = ['ALL', 'LEVEL', 'STREAK', 'TRAIT'];
 const traitKeys = useMemo(() => Object.keys(TRAIT_ICONS), []);

 if (!user) return <div className="p-10 text-white/50 text-center animate-pulse">{t('achievements.loading')}</div>;

 return (
 <div className="min-h-full w-full text-white px-4 sm:px-6 lg:px-10 pb-24 overflow-x-hidden relative font-sans bg-transparent">
 
 {/* Content Container */}
 <div className="relative z-10 w-full max-w-7xl mx-auto">
 
 {/* Header Section */}
 <div className="mb-8 mt-4 flex flex-col md:flex-row md:items-end justify-between gap-6">
 <motion.div 
 initial={{ opacity: 0, x: -20 }}
 animate={{ opacity: 1, x: 0 }}
 className="flex-1"
 >
 <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/50 drop-shadow-sm">
 {t('achievements.title')}
 </h1>
 <p className="text-white/60 text-sm md:text-lg font-medium max-w-md leading-relaxed">
 {t('achievements.subtitle')}
 </p>
 </motion.div>
 
 {/* Progress Card */}
 <motion.div 
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 className="flex items-center gap-4 bg-black/90 border border-white/10 px-4 sm:px-6 py-4 rounded-[24px] shadow-md"
 >
 <div className="text-right">
 <span className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">{t('achievements.sync')}</span>
 <span className="block text-3xl font-mono font-bold text-white tracking-tighter">{completionPercentage}%</span>
 </div>
 <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border border-yellow-400/30 flex items-center justify-center relative shadow-[0_0_30px_rgba(250,204,21,0.2)]">
 <Trophy className="text-yellow-400 drop-shadow-sm" size={24} strokeWidth={2} />
 </div>
 </motion.div>
 </div>

 {/* Primary Filter Tabs */}
 <div className="sticky top-0 z-50 py-3 bg-gradient-to-b from-black/0 via-black/0 to-transparent">
 <div className="flex items-center gap-2 overflow-x-auto no-scrollbar p-1">
 {categories.map((cat) => (
 <CategoryTab 
 key={cat} 
 label={t(categoryLabels[cat] || cat)} 
 isActive={selectedCategory === cat} 
 onClick={() => {
 setSelectedCategory(cat);
 // Reset sub-filter when changing main category, unless it's TRAIT
 if (cat !== 'TRAIT') setSelectedTrait(null);
 }} 
 />
 ))}
 </div>
 </div>

 {/* Secondary Trait Filter (Only visible when TRAIT is selected) */}
 <AnimatePresence>
 {selectedCategory === 'TRAIT' && (
 <motion.div
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -10 }}
 className="mb-8 overflow-hidden"
 >
 <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 pt-1">
 <button
 onClick={() => setSelectedTrait(null)}
 className={`
 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase transition-all duration-200 border
 ${!selectedTrait 
 ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.4)]' 
 : 'bg-black/40 text-white/50 border-white/10 hover:border-white/30 hover:text-white'}
 `}
 >
 ALL
 </button>
 <div className="w-px h-6 bg-white/10 mx-1" />
 {traitKeys.map(trait => (
 <TraitFilterPill
 key={trait}
 traitId={trait}
 isActive={selectedTrait === trait}
 onClick={() => setSelectedTrait(trait === selectedTrait ? null : trait)}
 />
 ))}
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Masonry Grid */}
 <div 
 className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 pb-20"
 >
 <AnimatePresence>
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
 </div>

 {filteredAchievements.length === 0 && (
 <motion.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }}
 className="text-center py-32"
 >
 <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6 border border-white/5">
 <Lock className="text-white/20 w-8 h-8" />
 </div>
 <p className="text-white/30 font-medium text-lg">{t('achievements.empty')}</p>
 </motion.div>
 )}
 </div>
 </div>
 );
};
