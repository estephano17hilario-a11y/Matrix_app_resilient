import { useEffect, useRef, useState } from 'react';
import { App } from '@capacitor/app';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle2, Sparkles, ChevronDown, Target, Flame, Zap, Coins } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '@/context/AuthContext';
import { OnboardingLayout } from './components/OnboardingLayout';
import { TRAITS_LIST } from '../dashboard/constants';
import { persistenceService } from '../../services/persistenceService';
import { PersistenceService } from '../../services/persistence';
import { Attribute } from '../../types';
import { useTranslation } from 'react-i18next';
import { AvatarCarousel } from './components/avatar-carousel/AvatarCarousel';
import { calculateAttributeMaxXp } from '../../utils/leveling';
import { useTheme } from '@/context/ThemeContext';
import { ThemeId } from '../../config/themes';

// Modified steps: Removed 'intro' and 'language' as they are now pre-auth
type Step = 'avatar' | 'traits' | 'background' | 'tutorial' | 'saving';

export function OnboardingFlow() {
  const { user, profile, updateProfileLocally } = useAuth();
  const { i18n, t } = useTranslation();
  const { setTheme } = useTheme();
  const lockedTraitIds = ['DISCIPLINA', 'RESILIENCIA'];
  
  // Initialize step directly to 'avatar'
  const [step, setStep] = useState<Step>('avatar');
  
  const [selectedTraits, setSelectedTraits] = useState<string[]>(lockedTraitIds);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<ThemeId>('ether');
  const [showScrollHint, setShowScrollHint] = useState(true);
  const traitsScrollRef = useRef<HTMLDivElement | null>(null);
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Explicit step management - No complex derived states
  const isTraitsStep = step === 'traits';
  const [tutorialSlide, setTutorialSlide] = useState(0);

  const slides = [
    {
      title: "Misiones y Estrategia",
      description: "Convierte tus metas en misiones diarias. Suma XP y Oro al completarlas, y sube el nivel de tus rasgos.",
      icon: Target,
      color: "#f43f5e", // Rose
    },
    {
      title: "Hábitos y Rachas",
      description: "El pilar de la disciplina. Completa tus hábitos diarios para mantener viva tu racha global y desbloquear recompensas.",
      icon: Flame,
      color: "#f97316", // Orange
    },
    {
      title: "Focus y Productividad",
      description: "Utiliza el temporizador de Enfoque para concentrarte en tus proyectos. Cada minuto cuenta para tus estadísticas.",
      icon: Zap,
      color: "#eab308", // Yellow
    },
    {
      title: "Tienda y Recompensas",
      description: "Usa tu oro acumulado para comprar cosméticos premium y personalizar tu espacio de automejora.",
      icon: Coins,
      color: "#10b981", // Emerald
    }
  ];

  // Cleanup safety timer on unmount
  useEffect(() => {
    return () => {
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
      }
    };
  }, []);

  // --- HARDWARE BACK BUTTON HANDLER ---
  useEffect(() => {
    const handleBackButton = async () => {
        if (step === 'traits') {
            setStep('avatar');
        } else if (step === 'avatar') {
            App.exitApp();
        }
    };

    const setupListener = async () => {
        try {
            return await App.addListener('backButton', handleBackButton);
        } catch (e) {
            console.warn('Back button listener failed', e);
        }
    };

    const listenerPromise = setupListener();

    return () => {
        listenerPromise.then(handle => handle && handle.remove()).catch(() => {});
    };
  }, [step]);

  // Initialize language from profile or i18n
  const currentLanguage = profile?.onboarding?.language || i18n.language || 'en';

  const freeSelectedCount = selectedTraits.filter(t => !lockedTraitIds.includes(t)).length;

  const handleNext = async () => {
    if (step === 'traits') {
      // Must select at least 3 and at most 4 free/additional traits
      if (freeSelectedCount < 3 || freeSelectedCount > 4) {
         return;
      }
      handleSubmit();
    }
  };

  const toggleTrait = (id: string) => {
    console.log('[Onboarding] Toggling trait:', id);
    if (lockedTraitIds.includes(id)) return;
    if (selectedTraits.includes(id)) {
      setSelectedTraits(selectedTraits.filter(t => t !== id));
    } else {
      // Limit to 4 additional selected traits
      if (freeSelectedCount >= 4) {
        return;
      }
      setSelectedTraits([...selectedTraits, id]);
    }
  };

  const handleAvatarSelect = (avatarId: string) => {
    console.log('[Onboarding] Avatar selected:', avatarId);
    setSelectedAvatarId(avatarId);
    setStep('traits');
  };

  const handleSubmit = async () => {
    const userId = user?.id || profile?.uid;
    
    if (!userId) {
      console.error('[Onboarding] No user ID found');
      alert("Authentication Error: User ID missing. Please refresh.");
      return;
    }

    // 1. VISUAL FEEDBACK: INSTANT
    setStep('saving');

    // Remove the window.location.reload() failsafe as it causes infinite loops 
    // if the network is just slow or offline but optimistic UI worked.
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);

    // 3. OPTIMISTIC UPDATE: The Critical Path
    const completionTs = Date.now();
    
    const updatedOnboarding = {
       ...(profile?.onboarding || {
         successDefinition: "Becoming the One",
         obstacles: [],
         coachingTone: "Stoic",
         language: currentLanguage
       }),
       completedAt: completionTs,
       language: currentLanguage
    };

    const localUpdates = {
       onboarding: updatedOnboarding,
       avatarId: selectedAvatarId ?? profile?.avatarId,
       theme: selectedThemeId,
       preferences: {
         ...(profile?.preferences || {}),
         theme: selectedThemeId
       }
    };

    console.log("[Onboarding] ⚡ PREPARING FIRESTORE UPDATE", localUpdates);
    
    // 🔥 1. PREPARE ATTRIBUTES FIRST (Prevent Race Condition with Dashboard)
    const attributesToSave = selectedTraits.reduce<Attribute[]>((acc, id) => {
        const trait = TRAITS_LIST.find(t => t.id === id);
        if (!trait) return acc;
        acc.push({
            id: trait.id,
            label: trait.label,
            level: 1,
            xp: 0,
            maxXp: calculateAttributeMaxXp(1),
            color: trait.color
        });
        return acc;
    }, []);

    // 🚀 FIX: Save to Local Cache FIRST so Dashboard has them instantly when it mounts!
    PersistenceService.saveCollection(userId, 'attributes', attributesToSave);

    if (typeof window !== 'undefined') {
        localStorage.setItem('lux_last_view', 'TASKS');
        localStorage.setItem('matrix_last_view', 'TASKS');
        // Mark tutorial keys as seen so they do NOT automatically appear for this user
        localStorage.setItem(`matrix_stats_tutorial_seen_${userId}`, 'true');
        localStorage.setItem(`matrix_tour_seen_${userId}`, 'true');
    }

    // 🔥 2. OPTIMISTIC UPDATE: Instantly trigger navigation and update UI
    if (profile) {
        updateProfileLocally(localUpdates);
    }
    
    // Also save directly to PersistenceService to guarantee it's there on next boot
    // even if Firestore is slow.
    const mergedProfile = { ...profile, ...localUpdates };
    PersistenceService.saveProfile(mergedProfile as any);
    
    try {
        // Background Save process (does not block UI)
        const onboardingDataToSave = {
            avatar_id: selectedAvatarId ?? profile?.avatarId,
            onboarding: updatedOnboarding,
            theme: selectedThemeId,
            preferences: {
              ...(profile?.preferences || {}),
              theme: selectedThemeId
            },
            archetype: 'NEO',
            updated_at: new Date().toISOString()
        };
        
        // 🚀 FIX: Update Supabase directly instead of mocked setDoc
        const { error: updateError } = await supabase
            .from('users')
            .update(onboardingDataToSave)
            .eq('id', userId);

        if (updateError) {
            console.error("[Onboarding] Supabase update error:", updateError);
            throw updateError;
        }

        // Save Background Firebase Attributes
        // Since persistenceService handles attributes, we leave it as is if it uses Supabase under the hood
        // Or if it's local only. Let's make sure it doesn't crash.
        const attrPromises = attributesToSave.map(attr => 
            persistenceService.attributes.save(userId, attr)
        );

        await Promise.all(attrPromises);
        console.log("[Onboarding] ✅ Background save complete");

        // Clear safety timer early since we are successfully processing
        if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
        
        console.log("[Onboarding] ✅ Supabase save resolved successfully");

    } catch (e) {
        console.error("[Onboarding] Error saving data:", e);
        // Clear safety timer even on error, navigation was already triggered
        if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
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
                key="progress-indicator"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-0 left-0 right-0 flex justify-center gap-2 py-10 z-[60] pointer-events-none"
              >
                  {/* Visual Steps: Avatar -> Traits */}
                  <div className={`h-1.5 w-16 rounded-full transition-all duration-200 ${step === 'avatar' ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'bg-white/10'}`} />
                  <div className={`h-1.5 w-16 rounded-full transition-all duration-200 ${step === 'traits' ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'bg-white/10'}`} />
              </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 w-full relative overflow-hidden">
          <AnimatePresence mode="wait">
            {/* STEP 1: AVATAR SELECTION */}
            {step === 'avatar' && (
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
                className="absolute inset-0 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] z-50 pointer-events-auto"
                style={{ opacity: 1, visibility: 'visible' }}
                ref={traitsScrollRef}
                onScroll={(event) => {
                  if (showScrollHint && event.currentTarget.scrollTop > 24) {
                    setShowScrollHint(false);
                  }
                }}
              >
                <div className="min-h-full w-full flex flex-col items-center justify-start max-w-4xl mx-auto px-4 py-24">
                  <div className="text-center mb-10 flex-shrink-0 max-w-2xl mx-auto px-4">
                      <motion.div
                        key="traits-title"
                        initial={{ opacity: 1, y: 0 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4"
                      >
                        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4 drop-shadow-md">
                            {t('onboarding.traits.title', 'Choose your Traits')}
                        </h1>
                        <p className="text-white/60 text-lg font-light tracking-wide">
                            {t('onboarding.traits.subtitle', `Elige tus rasgos para empezar`)}
                        </p>
                        <p className="text-white/35 text-sm mt-1 font-bold">
                            {t('onboarding.traits.maxHint', 'Mínimo 3 y máximo 4 rasgos adicionales (ya tienes 2 fijos)')}
                        </p>
                      </motion.div>
                      
                      {freeSelectedCount < 3 && (
                         <motion.div 
                            key="traits-validation"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-sm text-red-300 mt-2 font-medium bg-red-500/15 py-2 px-4 rounded-full inline-block border border-red-500/30 bg-gradient-to-b from-white/5 to-transparent"
                         >
                           {t('common.selectAtLeastThree', 'Selecciona al menos 3 rasgos')}
                         </motion.div>
                      )}
                  </div>

                  <div className="w-full max-w-5xl mx-auto px-4 pb-24">
                      {(!TRAITS_LIST || TRAITS_LIST.length === 0) ? (
                          <div className="flex flex-col items-center justify-center py-20 gap-4">
                              <p className="text-white/50">{t('onboarding.traitsOfflineError', 'System Error: Traits module offline.')}</p>
                              <button 
                                  onClick={() => window.location.reload()}
                                  className="px-6 py-2 bg-white/10 rounded-full text-white text-sm hover:bg-white/20 transition-all border border-white/10"
                              >
                                  {t('onboarding.reinitialize', 'Reinitialize')}
                              </button>
                          </div>
                      ) : (
                      <div className="relative rounded-3xl border border-white/10 bg-[#0a0a0f] p-4 sm:p-6">
                        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none rounded-3xl" />
                        <div className="relative grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {TRAITS_LIST.filter(trait => !lockedTraitIds.includes(trait.id)).map((trait, index) => {
                              const isSelected = selectedTraits.includes(trait.id);
                              // Count only free (non-locked) selected traits
                              const freeSelected = selectedTraits.filter(t => !lockedTraitIds.includes(t));
                              const isAtMax = freeSelected.length >= 4;
                              const isGreyedOut = isAtMax && !isSelected;
                              const Icon = (trait.icon || Sparkles) as any;
                              const backgroundColor = isSelected ? `${trait.color}15` : 'rgba(255,255,255,0.03)';
                              
                              return (
                                    <motion.button
                                        key={trait.id}
                                        type="button"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ 
                                            opacity: isGreyedOut ? 0.3 : 1, 
                                            scale: 1,
                                            filter: isGreyedOut ? 'grayscale(100%)' : 'grayscale(0%)'
                                        }}
                                        whileHover={!isGreyedOut ? { scale: 1.05, y: -5 } : undefined}
                                        whileTap={!isGreyedOut ? { scale: 0.95 } : undefined}
                                        transition={{ delay: index * 0.03, type: "spring", stiffness: 400, damping: 17 }}
                                        onClick={() => { 
                                          if (isGreyedOut) return;
                                          toggleTrait(trait.id); 
                                        }}
                                        disabled={isGreyedOut && !isSelected}
                                        className={`
                                            relative aspect-square rounded-2xl p-3 flex flex-col items-center justify-center gap-2 transition-all duration-200 group
                                            border
                                            ${isGreyedOut ? 'cursor-not-allowed' : 'cursor-pointer'}
                                            ${isSelected 
                                                ? 'shadow-lg border-opacity-100' 
                                                : isGreyedOut
                                                    ? 'border-white/5'
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
                                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-transform duration-200 group-hover:scale-110"
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
                      key="scroll-hint"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ type: 'spring', stiffness: 450 }}
                      className="pointer-events-none absolute bottom-6 left-0 right-0 flex justify-center"
                    >
                      <motion.div
                        animate={{ y: [0, 6, 0], opacity: [0.8, 1, 0.8] }}
                        transition={{ duration: 0.15, repeat: Infinity, type: 'spring', stiffness: 450 }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 border border-white/10 shadow-sm"
                      >
                        <ChevronDown size={16} className="text-white/80" />
                        <span className="text-[10px] uppercase tracking-widest text-white/60 font-medium">{t('onboarding.scroll', 'Scroll')}</span>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </motion.div>
            )}

            {/* STEP 2.5: BACKGROUND SELECTION */}
            {step === 'background' && (
              <motion.div
                key="background-selection"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="absolute inset-0 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] z-50 pointer-events-auto"
              >
                <div className="min-h-full w-full flex flex-col items-center justify-start max-w-4xl mx-auto px-4 py-24">
                  <div className="text-center mb-8 flex-shrink-0 max-w-2xl mx-auto px-4">
                    <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4 drop-shadow-md">
                      Elige tu Fondo Estelar
                    </h1>
                    <p className="text-white/60 text-lg font-light tracking-wide">
                      Personaliza tu espacio de automejora. Selecciona un tema y previsualízalo en tiempo real.
                    </p>
                  </div>

                  <div className="w-full max-w-5xl mx-auto px-4 pb-24">
                    <div className="relative rounded-3xl border border-white/10 bg-[#0a0a0f] p-4 sm:p-6">
                      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none rounded-3xl" />
                      <div className="relative grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                          { id: 'ether', name: 'Ether', desc: 'Sentient Glass Default', gradient: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)' },
                          { id: 'matrix', name: 'Matrix', desc: 'Neon Code Stream', gradient: 'linear-gradient(135deg, #00ff88 0%, #004d2b 100%)' },
                          { id: 'sunset', name: 'Sunset', desc: 'Solar warmth', gradient: 'linear-gradient(135deg, #ff5000 0%, #a855f7 100%)' },
                          { id: 'neon', name: 'Neon', desc: 'Cyberpunk City', gradient: 'linear-gradient(135deg, #ff0078 0%, #00ffdc 100%)' },
                          { id: 'aurora', name: 'Aurora', desc: 'Northern Lights', gradient: 'linear-gradient(135deg, #00ffb4 0%, #8c3cff 100%)' },
                          { id: 'midnight_flow', name: 'Midnight Flow', desc: 'Deep Horizon', gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 100%)' },
                          { id: 'holo_spectrum', name: 'Holo Spectrum', desc: 'Prismatic Blur', gradient: 'linear-gradient(135deg, #ff00ff 0%, #00ffff 100%)' },
                          { id: 'cosmic_void', name: 'Cosmic Void', desc: 'Deep Space', gradient: 'radial-gradient(circle at 50% 0%, #2e1065 0%, #000000 100%)' },
                          { id: 'luxury', name: 'Luxury', desc: 'Gold & Velvet', gradient: 'linear-gradient(135deg, #ffd700 0%, #8b4513 100%)' },
                          { id: 'stealth', name: 'Stealth', desc: 'Tactical Monochrome', gradient: 'linear-gradient(135deg, #ffffff 0%, #404040 100%)' }
                        ].map((themeItem) => {
                          const isSelected = selectedThemeId === themeItem.id;
                          return (
                            <div
                              key={themeItem.id}
                              className={`relative rounded-2xl p-4 border flex flex-col justify-between transition-all duration-300 ${
                                isSelected ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className="w-10 h-10 rounded-xl shrink-0 border border-white/10"
                                  style={{ background: themeItem.gradient }}
                                />
                                <div className="min-w-0">
                                  <h3 className="text-white font-bold text-sm truncate">{themeItem.name}</h3>
                                  <p className="text-white/40 text-xs truncate mt-0.5">{themeItem.desc}</p>
                                </div>
                              </div>
                              <div className="flex gap-2 mt-4">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedThemeId(themeItem.id as ThemeId);
                                    setTheme(themeItem.id as ThemeId);
                                  }}
                                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    isSelected ? 'bg-indigo-500 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'
                                  }`}
                                >
                                  Seleccionar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTheme(themeItem.id as ThemeId);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold transition-all"
                                >
                                  Previsualizar
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* STEP 3: TUTORIAL VIGNETTES */}
            {step === 'tutorial' && (
              <motion.div
                key="tutorial"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-6 z-[60] pointer-events-auto"
              >
                <div 
                  className="w-full max-w-md p-8 rounded-[2rem] flex flex-col items-center text-center relative overflow-hidden"
                  style={{
                    background: 'rgba(20, 20, 25, 0.75)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                  }}
                >
                  {/* Dynamic background glow */}
                  <div 
                    className="absolute -top-20 -left-20 w-40 h-40 rounded-full opacity-25 blur-[50px] transition-all duration-500"
                    style={{ background: slides[tutorialSlide].color }}
                  />

                  {/* Icon with glowing border */}
                  <div 
                    className="w-20 h-20 rounded-2xl flex items-center justify-center mb-8 relative transition-all duration-300"
                    style={{
                      background: `${slides[tutorialSlide].color}15`,
                      border: `1px solid ${slides[tutorialSlide].color}30`,
                      boxShadow: `0 10px 30px -5px ${slides[tutorialSlide].color}20`
                    }}
                  >
                    {(() => {
                      const IconComponent = slides[tutorialSlide].icon;
                      return <IconComponent size={36} style={{ color: slides[tutorialSlide].color }} />;
                    })()}
                  </div>

                  <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">
                    {slides[tutorialSlide].title}
                  </h2>
                  
                  <p className="text-white/60 text-sm leading-relaxed mb-8 max-w-[280px] font-medium">
                    {slides[tutorialSlide].description}
                  </p>

                  {/* Indicator Dots */}
                  <div className="flex gap-2 mb-8">
                    {slides.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setTutorialSlide(idx)}
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: idx === tutorialSlide ? '1.5rem' : '0.5rem',
                          background: idx === tutorialSlide ? slides[tutorialSlide].color : 'rgba(255,255,255,0.15)'
                        }}
                      />
                    ))}
                  </div>

                  {/* Next / Finish Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (tutorialSlide < slides.length - 1) {
                        setTutorialSlide(tutorialSlide + 1);
                      } else {
                        handleSubmit();
                      }
                    }}
                    className="w-full py-4 rounded-xl font-bold text-sm tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2"
                    style={{
                      background: slides[tutorialSlide].color,
                      color: '#000000',
                      boxShadow: `0 8px 25px -5px ${slides[tutorialSlide].color}50`
                    }}
                  >
                    <span>{tutorialSlide === slides.length - 1 ? "Comenzar" : "Siguiente"}</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: SAVING */}
            {step === 'saving' && (
                 <motion.div 
                    key="saving"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/80 z-50"
                 >
                    <div className="flex flex-col items-center">
                        {/* VisionOS Spinner - Optimized */}
                        <div className="relative w-24 h-24 mb-8">
                            <div className="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin" />
                            <div className="absolute inset-2 rounded-full border-r-2 border-purple-500 animate-spin-reverse" />
                            <div className="absolute inset-4 rounded-full border-b-2 border-cyan-500 animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Sparkles className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        
                        <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">{t('onboarding.initializingMatrix', 'Initializing Matrix...')}</h2>
                        <p className="text-white/50 text-sm tracking-widest uppercase">{t('onboarding.syncNeuralInterface', 'Synchronizing Neural Interface')}</p>
                    </div>
                 </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {step === 'traits' && (
            <motion.div
              key="traits-action"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="fixed bottom-0 left-0 right-0 p-6 flex justify-center z-[9999] pointer-events-none bg-gradient-to-t from-black/80 to-transparent"
            >
              <motion.button
                key="traits-action-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                disabled={selectedTraits.length < 3 || selectedTraits.length > 4}
                whileHover={selectedTraits.length >= 3 && selectedTraits.length <= 4 ? { scale: 1.02 } : {}}
                whileTap={selectedTraits.length >= 3 && selectedTraits.length <= 4 ? { scale: 0.98 } : {}}
                className={`
                  pointer-events-auto relative px-8 py-4 rounded-full font-bold text-lg transition-all flex items-center gap-3 overflow-hidden border
                  ${(selectedTraits.length < 3 || selectedTraits.length > 4)
                    ? 'bg-gray-800/50 text-white/30 border-white/5 cursor-not-allowed grayscale'
                    : 'bg-white text-black border-white/50 shadow-lg shadow-indigo-500/10'
                  }
                `}
              >
                {/* Glow Effect - Optimized */}
                {selectedTraits.length >= 3 && selectedTraits.length <= 4 && (
                   <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] transition-transform duration-200 group-hover:translate-x-[100%]" />
                 )}
                
                <span>
                  {t('common.continue', 'Continuar')}
                </span>
                <ArrowRight className={`w-5 h-5 transition-transform ${selectedTraits.length >= 3 && selectedTraits.length <= 4 ? 'group-hover:translate-x-1' : ''}`} />
              </motion.button>
            </motion.div>
          )}

          {step === 'background' && (
            <motion.div
              key="background-action"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="fixed bottom-0 left-0 right-0 p-6 flex justify-center z-[9999] pointer-events-none bg-gradient-to-t from-black/80 to-transparent"
            >
              <motion.button
                key="background-action-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="pointer-events-auto relative px-8 py-4 rounded-full font-bold text-lg transition-all flex items-center gap-3 overflow-hidden border bg-white text-black border-white/50 shadow-lg shadow-indigo-500/10 animate-fade-in"
              >
                <span>
                  {t('common.continue', 'Continuar')}
                </span>
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </OnboardingLayout>
  );
}
