import { useEffect, useRef, useState } from 'react';
import { App } from '@capacitor/app';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Palette, Quote, Sparkles } from 'lucide-react';
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
import { NotificationTone } from '../../services/notificationTonesService';
import { ASSISTANT_NAME_KEY, cleanAssistantName, setAssistantName as persistAssistantName } from '../coach/coachIdentity';
import { WELCOME_PENDING_KEY } from '../coach/coachMessages';
import { LuxToMonitorCinematic } from './components/LuxToMonitorCinematic';
import { ThemePickerStep, DEFAULT_ONBOARDING_THEME } from './components/ThemePickerStep';
import { StepFooter, StepShell, TopBar } from './components/OnboardingChrome';
import { TraitsStep } from './components/TraitsStep';
import { CoachStep } from './components/CoachStep';
import { PhrasesStep } from './components/PhrasesStep';
import { useTheme } from '@/context/ThemeContext';
import { DEFAULT_UNLOCKED_THEMES, type ThemeId } from '../../config/themes';

type Step = 'avatar' | 'traits' | 'notification_tone' | 'theme' | 'custom_phrases' | 'cinematic' | 'saving';
const STEP_ORDER = ['avatar', 'traits', 'notification_tone', 'theme', 'custom_phrases'] as const;

export function OnboardingFlow() {
  const { user, profile, updateProfileLocally } = useAuth();
  const { i18n, t } = useTranslation();
  const { setTheme } = useTheme();
  const lockedTraitIds = ['DISCIPLINA', 'RESILIENCIA'];
  // Everyone starts with the 2 base traits and picks 3–4 more (5–6 in total).
  const MIN_EXTRA_TRAITS = 3;
  const MAX_EXTRA_TRAITS = 4;
  
  const [step, setStep] = useState<Step>('avatar');
  
  const [selectedTraits, setSelectedTraits] = useState<string[]>(lockedTraitIds);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Custom Tone and Phrases State
  const [selectedTone, setSelectedTone] = useState<NotificationTone>('NEUTRAL');
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>(DEFAULT_ONBOARDING_THEME);
  const [antiProcrastinationPhrase, setAntiProcrastinationPhrase] = useState<string>('');
  const [splashPhrase, setSplashPhrase] = useState<string>('Sin Excusas');
  const [assistantName, setAssistantName] = useState<string>(() => {
    try { return localStorage.getItem(ASSISTANT_NAME_KEY) || 'Nova'; } catch { return 'Nova'; }
  });
  const assistantReady = cleanAssistantName(assistantName).length >= 2;
  const cinematicDone = useRef(false);

  const currentLanguage = profile?.onboarding?.language || i18n.language || 'es';
  const freeSelectedCount = selectedTraits.filter(t => !lockedTraitIds.includes(t)).length;
  // The button, the guard in handleNext and the counter all use this, so they
  // can never disagree again (the button used to count the 2 base traits too,
  // which made it impossible to continue with 3–4 picked).
  const traitsReady = freeSelectedCount >= MIN_EXTRA_TRAITS && freeSelectedCount <= MAX_EXTRA_TRAITS;
  const traitsMissing = Math.max(0, MIN_EXTRA_TRAITS - freeSelectedCount);

  useEffect(() => {
    return () => {
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    };
  }, []);

  const goBack = () => {
    if (step === 'traits') setStep('avatar');
    else if (step === 'notification_tone') setStep('traits');
    else if (step === 'theme') setStep('notification_tone');
    else if (step === 'custom_phrases') setStep('theme');
  };

  // Hardware back button handler
  useEffect(() => {
    const handleBackButton = async () => {
        if (step === 'avatar') App.exitApp();
        else goBack();
    };

    const setupListener = async () => {
        try { return await App.addListener('backButton', handleBackButton); } catch (e) {}
    };

    const listenerPromise = setupListener();
    return () => { listenerPromise.then(h => h && h.remove()).catch(() => {}); };
  }, [step]);

  const handleNext = async () => {
    if (step === 'traits') {
      if (!traitsReady) return;
      setStep('notification_tone');
    } else if (step === 'notification_tone') {
      if (!assistantReady) return;
      setStep('theme');
    } else if (step === 'theme') {
      setStep('custom_phrases');
    } else if (step === 'custom_phrases') {
      setStep('cinematic');
    }
  };

  const toggleTrait = (id: string) => {
    if (lockedTraitIds.includes(id)) return;
    // Functional update: rapid taps (before React re-renders) never overwrite each other.
    setSelectedTraits(prev => {
      if (prev.includes(id)) return prev.filter(t => t !== id);
      if (prev.filter(t => !lockedTraitIds.includes(t)).length >= MAX_EXTRA_TRAITS) return prev;
      return [...prev, id];
    });
  };

  const handleAvatarSelect = (avatarId: string) => {
    setSelectedAvatarId(avatarId);
    setStep('traits');
  };

  const finishCinematic = () => {
    if (cinematicDone.current) return;
    cinematicDone.current = true;
    handleSubmit();
  };

  const handleSubmit = async () => {
    const userId = user?.id || profile?.uid;
    if (!userId) return;
    const cleanAssistant = cleanAssistantName(assistantName) || 'Lux';
    persistAssistantName(cleanAssistant);
    try { localStorage.setItem(WELCOME_PENDING_KEY, '1'); } catch { /* ignore */ }

    setStep('saving');
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);

    const completionTs = Date.now();
    const cleanSplashPhrase = (splashPhrase || 'Sin Excusas').trim().slice(0, 20);
    const cleanAntiPhrase = (antiProcrastinationPhrase || '').trim().slice(0, 50);

    const updatedOnboarding = {
       ...(profile?.onboarding || {
         successDefinition: "Becoming the One",
         obstacles: [],
         coachingTone: selectedTone,
         language: currentLanguage
       }),
       completedAt: completionTs,
       language: currentLanguage
    };

    // Welcome gift: the chosen theme is unlocked for free (default themes are
    // already free, so there is nothing to grant for those).
    const existingUnlocked: string[] = profile?.unlocked_store_items || profile?.unlockedStoreItems || [];
    const unlockedStoreItems = DEFAULT_UNLOCKED_THEMES.includes(selectedTheme) || existingUnlocked.includes(selectedTheme)
      ? existingUnlocked
      : [...existingUnlocked, selectedTheme];

    const localUpdates = {
       onboarding: updatedOnboarding,
       avatarId: selectedAvatarId ?? profile?.avatarId,
       unlocked_store_items: unlockedStoreItems,
       preferences: {
         ...(profile?.preferences || {}),
         theme: selectedTheme,
         notificationTone: selectedTone,
         antiProcrastinationPhrase: cleanAntiPhrase,
         splashPhrase: cleanSplashPhrase,
         assistantName: cleanAssistant
       }
    };

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

    PersistenceService.saveCollection(userId, 'attributes', attributesToSave);

    if (typeof window !== 'undefined') {
        localStorage.setItem('lux_last_view', 'TASKS');
        localStorage.setItem('matrix_last_view', 'TASKS');
        localStorage.setItem('matrix_notification_tone', selectedTone);
        localStorage.setItem('matrix_anti_procrastination_phrase', cleanAntiPhrase);
        localStorage.setItem('matrix_splash_phrase', cleanSplashPhrase);
        localStorage.setItem(`matrix_stats_tutorial_seen_${userId}`, 'true');
        localStorage.setItem(`matrix_tour_seen_${userId}`, 'true');
    }

    // Apply the theme first (it also writes preferences remotely); the full
    // update below runs after it so it always has the last word.
    try { await setTheme(selectedTheme); } catch { /* the full update below also stores it */ }

    if (profile) {
        updateProfileLocally(localUpdates);
    }
    
    const mergedProfile = { ...profile, ...localUpdates };
    PersistenceService.saveProfile(mergedProfile as any);
    
    try {
        const onboardingDataToSave = {
            avatar_id: selectedAvatarId ?? profile?.avatarId,
            onboarding: updatedOnboarding,
            unlocked_store_items: unlockedStoreItems,
            preferences: {
              ...(profile?.preferences || {}),
              theme: selectedTheme,
              notificationTone: selectedTone,
              antiProcrastinationPhrase: cleanAntiPhrase,
              splashPhrase: cleanSplashPhrase,
              assistantName: cleanAssistant
            },
            updated_at: new Date().toISOString()
        };
        
        await supabase
            .from('users')
            .update(onboardingDataToSave)
            .eq('id', userId);

        const attrPromises = attributesToSave.map(attr => 
            persistenceService.attributes.save(userId, attr)
        );
        await Promise.all(attrPromises);

        if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    } catch (e) {
        console.error("[Onboarding] Save error:", e);
    }
  };

  const stepIndex = STEP_ORDER.indexOf(step as (typeof STEP_ORDER)[number]);
  const inFlow = stepIndex >= 0;
  const showFooter = inFlow && step !== 'avatar';

  let cta = t('onboarding.flow.continue', 'Continuar');
  let ctaDisabled = false;
  if (step === 'traits' && !traitsReady) {
    cta = t('onboarding.traits.missing', 'Elige {{count}} más', { count: traitsMissing });
    ctaDisabled = true;
  } else if (step === 'notification_tone' && !assistantReady) {
    cta = t('onboarding.flow.coach.needName', 'Ponle nombre a tu coach');
    ctaDisabled = true;
  } else if (step === 'custom_phrases') {
    cta = t('onboarding.flow.finish', '¡Terminar registro!');
  }

  const slide = {
    initial: { opacity: 0, x: 28 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -28 },
    transition: { duration: 0.2, ease: 'easeOut' as const },
  };

  return (
    <OnboardingLayout still={step === 'avatar'}>
      <div className="relative h-full w-full">
        {inFlow && <TopBar index={stepIndex} onBack={step === 'avatar' ? undefined : goBack} />}

        <div className="absolute inset-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {/* 1 · CHARACTER */}
            {step === 'avatar' && (
              <motion.div key="avatar-carousel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40">
                <AvatarCarousel onSelect={handleAvatarSelect} initialAvatarId={selectedAvatarId ?? undefined} />
              </motion.div>
            )}

            {/* 2 · TRAITS */}
            {step === 'traits' && (
              <motion.div key="traits" {...slide} className="absolute inset-0 z-50">
                <StepShell
                  icon={<Sparkles size={24} />}
                  tone="bg-violet-500/15 text-violet-300"
                  title={t('onboarding.flow.traits.title', '¿En qué quieres subir de nivel?')}
                  sub={t('onboarding.flow.traits.sub', 'Elige 3 o 4 áreas de tu vida que quieres mejorar.')}
                >
                  <TraitsStep selected={selectedTraits} lockedIds={lockedTraitIds} min={MIN_EXTRA_TRAITS} max={MAX_EXTRA_TRAITS} onToggle={toggleTrait} />
                </StepShell>
              </motion.div>
            )}

            {/* 3 · COACH (name + personality + live chat preview) */}
            {step === 'notification_tone' && (
              <motion.div key="notification_tone" {...slide} className="absolute inset-0 z-50">
                <StepShell
                  icon={<MessageCircle size={24} />}
                  tone="bg-emerald-500/15 text-emerald-300"
                  title={t('onboarding.flow.coach.title', 'Tu coach')}
                  sub={t('onboarding.flow.coach.sub', 'Te escribe como en un chat para empujarte cada día.')}
                >
                  <CoachStep name={assistantName} onName={setAssistantName} tone={selectedTone} onTone={setSelectedTone} />
                </StepShell>
              </motion.div>
            )}

            {/* 4 · THEME — free welcome pick */}
            {step === 'theme' && (
              <motion.div key="theme" {...slide} className="absolute inset-0 z-50">
                <StepShell
                  icon={<Palette size={24} />}
                  tone="bg-fuchsia-500/15 text-fuchsia-300"
                  title={t('onboarding.flow.theme.title', 'Tu tema')}
                  sub={t('onboarding.flow.theme.sub', 'Regalo de bienvenida. Toca el ojo para verlo.')}
                >
                  <ThemePickerStep selected={selectedTheme} onSelect={setSelectedTheme} />
                </StepShell>
              </motion.div>
            )}

            {/* 5 · PHRASES (optional, one-tap suggestions) */}
            {step === 'custom_phrases' && (
              <motion.div key="custom_phrases" {...slide} className="absolute inset-0 z-50">
                <StepShell
                  icon={<Quote size={24} />}
                  tone="bg-amber-500/15 text-amber-300"
                  title={t('onboarding.flow.phrases.title', 'Tus frases')}
                  sub={t('onboarding.flow.phrases.sub', 'Opcional: toca una sugerencia o escribe la tuya.')}
                >
                  <PhrasesStep anti={antiProcrastinationPhrase} onAnti={setAntiProcrastinationPhrase} splash={splashPhrase} onSplash={setSplashPhrase} />
                </StepShell>
              </motion.div>
            )}

            {/* CINEMATIC — Lux glitches into El Monitor */}
            {step === 'cinematic' && (
              <motion.div key="cinematic" className="absolute inset-0" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <LuxToMonitorCinematic
                  name={profile?.displayName || (user as any)?.user_metadata?.display_name}
                  lang={currentLanguage.startsWith('en') ? 'en' : 'es'}
                  onDone={finishCinematic}
                />
              </motion.div>
            )}

            {/* SAVING */}
            {step === 'saving' && (
              <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
                <div className="flex flex-col items-center px-6 text-center">
                  <div className="relative mb-8 h-24 w-24">
                    <div className="absolute inset-0 animate-spin rounded-full border-t-2 border-indigo-500" />
                    <div className="animate-spin-reverse absolute inset-2 rounded-full border-r-2 border-purple-500" />
                    <div className="absolute inset-4 animate-spin rounded-full border-b-2 border-cyan-500" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <h2 className="mb-2 text-2xl font-bold tracking-tight text-white">{t('onboarding.flow.saving', 'Preparando tu Matriz Lux…')}</h2>
                  <p className="text-sm uppercase tracking-widest text-white/50">{t('onboarding.flow.savingSub', 'Guardando tu configuración')}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* One big action, always above the gesture bar */}
        {showFooter && <StepFooter label={cta} disabled={ctaDisabled} final={step === 'custom_phrases'} onClick={handleNext} />}
      </div>
    </OnboardingLayout>
  );
}
