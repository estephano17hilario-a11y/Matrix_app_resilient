import { useEffect, useRef, useState } from 'react';
import { App } from '@capacitor/app';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Palette, Sparkles } from 'lucide-react';
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
import { DEFAULT_UNLOCKED_THEMES, type ThemeId } from '../../config/themes';

type Step = 'avatar' | 'traits' | 'notification_tone' | 'theme' | 'cinematic' | 'saving';
const STEP_ORDER = ['avatar', 'traits', 'notification_tone', 'theme'] as const;

export function OnboardingFlow() {
  const { user, profile } = useAuth();
  const { i18n, t } = useTranslation();
  const lockedTraitIds = ['DISCIPLINA', 'RESILIENCIA'];
  // Everyone starts with the 2 base traits and picks exactly 3 more (5 in total). A 4th or more is Deluxe.
  const MIN_EXTRA_TRAITS = 3;
  const MAX_EXTRA_TRAITS = 3;
  
  const [step, setStep] = useState<Step>('avatar');
  
  const [selectedTraits, setSelectedTraits] = useState<string[]>(lockedTraitIds);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Coach tone + theme
  const [selectedTone, setSelectedTone] = useState<NotificationTone>('NEUTRAL');
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>(DEFAULT_ONBOARDING_THEME);
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
    // The sign-up no longer asks for phrases: the app keeps its own default tagline and the coach
    // uses her own lines. (Both can still be edited later in Settings.)
    const cleanSplashPhrase = 'Sin Excusas';
    const cleanAntiPhrase = '';

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

    const preferences = {
      ...(profile?.preferences || {}),
      theme: selectedTheme,
      notificationTone: selectedTone,
      antiProcrastinationPhrase: cleanAntiPhrase,
      splashPhrase: cleanSplashPhrase,
      assistantName: cleanAssistant
    };

    const localUpdates = {
       onboarding: updatedOnboarding,
       avatarId: selectedAvatarId ?? profile?.avatarId,
       unlocked_store_items: unlockedStoreItems,
       preferences
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

    // 1 · Everything on this phone first (synchronous): if anything goes wrong after this point the
    //     account is already complete locally, and the next launch repairs the server.
    PersistenceService.saveCollection(userId, 'attributes', attributesToSave);
    if (typeof window !== 'undefined') {
        localStorage.setItem('lux_last_view', 'TASKS');
        localStorage.setItem('matrix_last_view', 'TASKS');
        localStorage.setItem('matrix_notification_tone', selectedTone);
        localStorage.setItem('matrix_anti_procrastination_phrase', cleanAntiPhrase);
        localStorage.setItem('matrix_splash_phrase', cleanSplashPhrase);
        localStorage.setItem('matrix-theme', selectedTheme);
    }
    PersistenceService.saveProfile({ ...profile, ...localUpdates } as any);

    // 2 · Then the server, with a cap so a slow network never traps the user here.
    const serverWrites = (async () => {
        try {
            const { error } = await supabase
                .from('users')
                .update({
                    avatar_id: selectedAvatarId ?? profile?.avatarId,
                    onboarding: updatedOnboarding,
                    unlocked_store_items: unlockedStoreItems,
                    preferences,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);
            if (error) console.error("[Onboarding] Profile save error:", error);
            await Promise.all(attributesToSave.map(attr => persistenceService.attributes.save(userId, attr)));
        } catch (e) {
            console.error("[Onboarding] Save error:", e);
        }
    })();
    await Promise.race([serverWrites, new Promise(resolve => setTimeout(resolve, 6000))]);

    // 3 · Start the app on a clean slate. Registration leaves a lot in memory (character art, the
    //     cinematic, animated backdrops); mounting the whole Dashboard on top of that used to run
    //     weak phones out of memory and Android closed the app. A reload boots exactly like every
    //     normal launch (cached profile → splash → Dashboard), which is the path that is proven.
    window.location.reload();
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
  } else if (step === 'theme') {
    cta = t('onboarding.flow.finish', '¡Terminar registro!');
  }

  const slide = {
    initial: { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.2, ease: 'easeOut' as const } },
    // Leaves fast so the next step is never waited for (no empty frame between steps).
    exit: { opacity: 0, transition: { duration: 0.08 } },
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
                  sub={t('onboarding.flow.traits.sub', 'Elige 3 áreas de tu vida que quieres mejorar.')}
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

            {/* SAVING — only the wordmark (same as the boot screen) so the restart that follows is seamless */}
            {step === 'saving' && (
              <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: '#020204' }}>
                <h1
                  style={{
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontWeight: 100,
                    fontSize: 'clamp(2.5rem, 8vw, 4rem)',
                    letterSpacing: '0.45em',
                    marginRight: '-0.45em',
                    color: 'rgba(255,255,255,0.94)',
                    lineHeight: 1,
                    textShadow: '0 0 32px rgba(129,140,248,0.35)',
                  }}
                >
                  LUX
                </h1>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* One big action, always above the gesture bar */}
        {showFooter && <StepFooter label={cta} disabled={ctaDisabled} final={step === 'theme'} onClick={handleNext} />}
      </div>
    </OnboardingLayout>
  );
}
