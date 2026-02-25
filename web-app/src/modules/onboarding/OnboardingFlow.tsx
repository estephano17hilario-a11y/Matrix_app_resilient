import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle2, Sparkles, Lock, ChevronDown } from 'lucide-react';
import { doc, setDoc, db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { OnboardingLayout } from './components/OnboardingLayout';
import { TRAITS_LIST } from '../dashboard/constants';
import { persistenceService } from '../../services/persistenceService';
import { PersistenceService } from '../../services/persistence';
import { Attribute } from '../../types';
import { useTranslation } from 'react-i18next';
import { AvatarCarousel } from './components/avatar-carousel/AvatarCarousel';
import { ThemeId, THEMES } from '../../config/themes';

// Modified steps: Removed 'intro' and 'language' as they are now pre-auth
type Step = 'avatar' | 'traits' | 'saving';

export function OnboardingFlow() {
  const { user, profile, refreshProfile, updateProfileLocally } = useAuth();
  const { i18n, t } = useTranslation();
  const lockedTraitId = 'DISCIPLINA';
  
  // Initialize step directly to 'avatar'
  const [step, setStep] = useState<Step>('avatar');
  
  const [selectedTraits, setSelectedTraits] = useState<string[]>([lockedTraitId]);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const traitsScrollRef = useRef<HTMLDivElement | null>(null);
  const isTraitsStep = step === 'traits' || (step === 'avatar' && !!selectedAvatarId);
  const [traitThemeId] = useState<ThemeId>(() => {
    const ids = Object.keys(THEMES) as ThemeId[];
    return ids[Math.floor(Math.random() * ids.length)];
  });
  const traitTheme = THEMES[traitThemeId];
  const traitBackground = traitTheme?.bgStyle || traitTheme?.gradient || 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 100%)';

  // Initialize language from profile or i18n, but we don't need a step for it anymore
  // We will preserve the existing language in the final save
  const currentLanguage = profile?.onboarding?.language || i18n.language || 'en';

  const handleNext = () => {
    // If we are in the traits step (which includes avatar selected state),
    // we should proceed to submit. The button is only visible when isTraitsStep is true.
    if (isTraitsStep) {
      handleSubmit();
    } else if (step === 'avatar') {
      setStep('traits');
    }
  };

  const toggleTrait = (id: string) => {
    console.log('[Onboarding] Toggling trait:', id);
    if (id === lockedTraitId) return;
    if (selectedTraits.includes(id)) {
      setSelectedTraits(selectedTraits.filter(t => t !== id));
    } else {
      if (selectedTraits.length < 5) {
        setSelectedTraits([...selectedTraits, id]);
      }
    }
  };

  const handleAvatarSelect = (avatarId: string) => {
    console.log('[Onboarding] Avatar selected:', avatarId);
    setSelectedAvatarId(avatarId);
    setStep('traits');
  };

  const handleSubmit = async () => {
    const userId = user?.uid || profile?.uid;
    console.log('[Onboarding] Submitting traits for user:', userId);
    if (!userId) {
      alert(t('auth.errors.generic'));
      return;
    }
    
    // Immediately set saving state to show spinner
    setStep('saving');
    const completionTs = Date.now();
    
    // Optimistic Update
    if (profile) {
      const baseOnboarding = profile.onboarding || {
        successDefinition: "Becoming the One",
        obstacles: [],
        coachingTone: "Stoic",
        completedAt: 0,
        language: currentLanguage
      };
      updateProfileLocally({
        onboarding: { ...baseOnboarding, completedAt: completionTs },
        avatarId: selectedAvatarId ?? profile.avatarId
      });
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('lux_last_view', 'TASKS');
      localStorage.setItem('matrix_last_view', 'TASKS');
    }
    
    try {
      const userRef = doc(db, "users", userId);
      
      // 1. Save Onboarding Data
      await setDoc(userRef, {
        avatarId: selectedAvatarId,
        onboarding: {
          completedAt: completionTs,
          language: currentLanguage // Preserve language
        },
        archetype: 'NEO',
        updatedAt: Date.now()
      }, { merge: true });

      // 2. Save Selected Attributes
      const attributesToSave = selectedTraits.reduce<Attribute[]>((acc, id) => {
          const trait = TRAITS_LIST.find(t => t.id === id);
          if (!trait) return acc;
          acc.push({
              id: trait.id,
              label: trait.label,
              level: 1,
              xp: 0,
              maxXp: 100,
              color: trait.color,
              icon: trait.icon 
          });
          return acc;
      }, []);

      PersistenceService.saveCollection(userId, 'attributes', attributesToSave);

      await Promise.all(attributesToSave.map(attr => 
          persistenceService.attributes.save(userId, attr)
      ));
      
      if (user) {
        await refreshProfile();
      }
      
    } catch (error) {
      console.error("Error saving onboarding:", error);
      try {
        if (user) {
          await refreshProfile();
        } else if (!profile) {
          setStep('traits');
          alert("Error saving data. Please check your connection.");
        }
      } catch (e) {
        setStep('traits');
        alert("Error saving data. Please check your connection.");
      }
    }
  };

  useEffect(() => {
    if (step !== 'traits') return;
    const el = traitsScrollRef.current;
    if (!el) return;
    const canScroll = el.scrollHeight - el.clientHeight > 8;
    setShowScrollHint(canScroll);
  }, [step]);

  return (
    <OnboardingLayout>
      <div className="relative w-full h-full flex flex-col">
        
        {/* Progress Indicator */}
        <AnimatePresence>
          {step !== 'saving' && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-0 left-0 right-0 flex justify-center gap-2 py-10 z-[60] pointer-events-none"
              >
                  {/* Visual Steps: Avatar -> Traits */}
                  <div className={`h-1.5 w-16 rounded-full transition-all duration-500 ${!isTraitsStep ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'bg-white/10'}`} />
                  <div className={`h-1.5 w-16 rounded-full transition-all duration-500 ${isTraitsStep ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'bg-white/10'}`} />
              </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 w-full relative overflow-hidden">
          <AnimatePresence mode="wait">
            {/* STEP 1: AVATAR SELECTION */}
            {step === 'avatar' && !selectedAvatarId && (
               <motion.div 
                 key="avatar-carousel"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="absolute inset-0 z-40"
               >
                  <AvatarCarousel onSelect={handleAvatarSelect} />
               </motion.div>
            )}

            {/* STEP 2: TRAITS */}
            {isTraitsStep && (
              <motion.div 
                key="traits" 
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                ref={traitsScrollRef}
                onScroll={(event) => {
                  if (showScrollHint && event.currentTarget.scrollTop > 24) {
                    setShowScrollHint(false);
                  }
                }}
                className="absolute inset-0 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] z-50 pointer-events-auto"
                style={{ opacity: 1, visibility: 'visible' }}
              >
                <div className="min-h-full w-full flex flex-col items-center justify-center max-w-4xl mx-auto px-4 py-24">
                  <div className="text-center mb-10 flex-shrink-0 max-w-2xl mx-auto px-4">
                      <motion.div
                        initial={{ opacity: 1, y: 0 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4"
                      >
                        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4 drop-shadow-xl">
                            {t('onboarding.traits.title', 'Choose your Traits')}
                        </h1>
                        <p className="text-white/60 text-lg font-light tracking-wide">
                            {t('onboarding.traits.subtitle', { count: selectedTraits.length })}
                        </p>
                      </motion.div>
                      
                      {selectedTraits.length < 3 && (
                         <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="text-sm text-red-300 mt-2 font-medium bg-red-500/15 py-2 px-4 rounded-full inline-block border border-red-500/30 bg-gradient-to-b from-white/5 to-transparent"
                         >
                           {t('common.selectAtLeast', { count: 3 }) || `Select at least 3 (Selected: ${selectedTraits.length})`}
                         </motion.div>
                      )}
                  </div>

                  <div className="w-full max-w-5xl mx-auto px-4 pb-32">
                      {(!TRAITS_LIST || TRAITS_LIST.length === 0) ? (
                          <div className="flex flex-col items-center justify-center py-20 gap-4">
                              <p className="text-white/50">System Error: Traits module offline.</p>
                              <button 
                                  onClick={() => window.location.reload()}
                                  className="px-6 py-2 bg-white/10 rounded-full text-white text-sm hover:bg-white/20 transition-all border border-white/10"
                              >
                                  Reinitialize
                              </button>
                          </div>
                      ) : (
                      <div className="relative rounded-3xl border border-white/10 bg-black/40 p-4 sm:p-6 overflow-hidden">
                        <div className="absolute inset-0 opacity-50" style={{ background: traitBackground }} />
                        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                        <div className="relative grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          {TRAITS_LIST.map((trait, index) => {
                              const isSelected = selectedTraits.includes(trait.id);
                              const isMaxReached = !isSelected && selectedTraits.length >= 5;
                              const isLocked = trait.id === lockedTraitId;
                              const Icon = (trait.icon || Sparkles) as any;
                              const backgroundColor = isSelected ? `${trait.color}15` : 'rgba(255,255,255,0.03)';
                              
                              return (
                                    <motion.button
                                        key={trait.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ 
                                            opacity: isMaxReached ? 0.5 : 1, 
                                            scale: 1,
                                            filter: isMaxReached ? 'grayscale(100%)' : 'grayscale(0%)'
                                        }}
                                        whileHover={!isMaxReached && !isLocked ? { scale: 1.05, y: -5 } : undefined}
                                        whileTap={!isMaxReached && !isLocked ? { scale: 0.95 } : undefined}
                                        transition={{ delay: index * 0.03, type: "spring", stiffness: 400, damping: 17 }}
                                        onClick={() => { 
                                          if (isLocked) {
                                            return;
                                          }
                                          toggleTrait(trait.id); 
                                        }}
                                        disabled={isMaxReached && !isSelected}
                                        className={`
                                            relative aspect-square rounded-2xl p-3 flex flex-col items-center justify-center gap-2 transition-all duration-300 group cursor-pointer
                                            border
                                            ${isSelected 
                                                ? 'shadow-lg border-opacity-100' 
                                                : 'hover:bg-white/10 hover:border-white/30 hover:shadow-md border-white/10'
                                            }
                                        `}
                                        style={{
                                            borderColor: isSelected ? trait.color : 'rgba(255,255,255,0.1)',
                                            boxShadow: isSelected ? `0 0 20px ${trait.color}40` : undefined,
                                            backgroundColor
                                        }}
                                    >
                                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                                      {isSelected && (
                                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                                      )}

                                      <div 
                                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-transform duration-300 group-hover:scale-110"
                                          style={{ 
                                              backgroundColor: isSelected ? trait.color : 'rgba(255,255,255,0.05)',
                                              color: isSelected ? '#fff' : trait.color,
                                              boxShadow: isSelected ? `0 0 20px ${trait.color}60` : 'none'
                                          }}
                                      >
                                          <Icon size={20} />
                                      </div>
                                      <span className={`text-xs font-bold text-center leading-tight tracking-wide ${isSelected ? 'text-white' : 'text-white/60'}`}>
                                          {t(trait.label)}
                                      </span>
                                      {isLocked && (
                                          <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/60 border border-white/15 flex items-center justify-center">
                                              <Lock size={12} className="text-white/80" />
                                          </div>
                                      )}
                                      
                                      {isSelected && (
                                          <motion.div 
                                              initial={{ scale: 0 }}
                                              animate={{ scale: 1 }}
                                              className="absolute top-2 right-2 text-white drop-shadow-md"
                                          >
                                              <CheckCircle2 className="w-5 h-5 fill-current" />
                                          </motion.div>
                                      )}
                                  </motion.button>
                              );
                          })}
                        </div>
                      </div>
                      )}
                  </div>
                </div>

                <AnimatePresence>
                  {showScrollHint && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                      className="pointer-events-none absolute bottom-6 left-0 right-0 flex justify-center"
                    >
                      <motion.div
                        animate={{ y: [0, 6, 0], opacity: [0.8, 1, 0.8] }}
                        transition={{ duration: 1.6, repeat: Infinity, type: 'spring', stiffness: 300 }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 border border-white/10 shadow-sm"
                      >
                        <ChevronDown size={16} className="text-white/80" />
                        <span className="text-[10px] uppercase tracking-widest text-white/60 font-medium">Scroll</span>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </motion.div>
            )}
            
            {/* STEP 3: SAVING */}
            {step === 'saving' && (
                 <motion.div 
                    key="saving"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50"
                 >
                    <div className="flex flex-col items-center">
                        {/* VisionOS Spinner */}
                        <div className="relative w-24 h-24 mb-8">
                            <div className="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin" />
                            <div className="absolute inset-2 rounded-full border-r-2 border-purple-500 animate-spin-reverse" />
                            <div className="absolute inset-4 rounded-full border-b-2 border-cyan-500 animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Sparkles className="w-8 h-8 text-white animate-pulse" />
                            </div>
                        </div>
                        
                        <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Initializing Matrix...</h2>
                        <p className="text-white/50 text-sm tracking-widest uppercase">Synchronizing Neural Interface</p>
                    </div>
                 </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {isTraitsStep && (
            <motion.div
              key="traits-action"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="fixed bottom-8 left-0 right-0 flex justify-center z-[100] pointer-events-none"
            >
              <motion.button
                onClick={handleNext}
                disabled={selectedTraits.length < 3}
                whileTap={{ scale: 0.95 }}
                className={`group pointer-events-auto cursor-pointer relative px-8 py-4 rounded-full font-bold text-lg transition-all flex items-center gap-3 overflow-hidden border ${
                  selectedTraits.length < 3
                    ? 'bg-white/60 text-black/60 border-white/30 cursor-not-allowed'
                    : 'bg-white text-black border-white/80 shadow-md hover:shadow-lg'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <span>{t('common.continue', 'Continuar')}</span>
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </OnboardingLayout>
  );
}
