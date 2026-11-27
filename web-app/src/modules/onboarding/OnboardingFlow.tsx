import { useEffect, useRef, useState } from 'react';
import { App } from '@capacitor/app';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle2, Sparkles, Bell, MessageSquare, Quote, Volume2, ShieldAlert, Lock } from 'lucide-react';
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
import { NotificationTone, TONE_DEFINITIONS } from '../../services/notificationTonesService';
import { ChatPreview } from '../coach/ChatUI';
import { ASSISTANT_NAME_KEY, ASSISTANT_NAME_MAX, ASSISTANT_SUGGESTIONS, cleanAssistantName, setAssistantName as persistAssistantName } from '../coach/coachIdentity';
import { WELCOME_PENDING_KEY } from '../coach/coachMessages';
import { LuxToMonitorCinematic } from './components/LuxToMonitorCinematic';
import { ThemePickerStep, DEFAULT_ONBOARDING_THEME } from './components/ThemePickerStep';
import { useTheme } from '@/context/ThemeContext';
import { DEFAULT_UNLOCKED_THEMES, type ThemeId } from '../../config/themes';

type Step = 'avatar' | 'traits' | 'notification_tone' | 'theme' | 'custom_phrases' | 'cinematic' | 'saving';

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
  const [, setShowScrollHint] = useState(true);
  const traitsScrollRef = useRef<HTMLDivElement | null>(null);
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Custom Tone and Phrases State
  const [selectedTone, setSelectedTone] = useState<NotificationTone>('NEUTRAL');
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>(DEFAULT_ONBOARDING_THEME);
  const [antiProcrastinationPhrase, setAntiProcrastinationPhrase] = useState<string>('');
  const [splashPhrase, setSplashPhrase] = useState<string>('Sin Excusas');
  const [assistantName, setAssistantName] = useState<string>(() => {
    try { return localStorage.getItem(ASSISTANT_NAME_KEY) || ''; } catch { return ''; }
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

  // Hardware back button handler
  useEffect(() => {
    const handleBackButton = async () => {
        if (step === 'traits') setStep('avatar');
        else if (step === 'notification_tone') setStep('traits');
        else if (step === 'theme') setStep('notification_tone');
        else if (step === 'custom_phrases') setStep('theme');
        else if (step === 'avatar') App.exitApp();
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
    if (selectedTraits.includes(id)) {
      setSelectedTraits(selectedTraits.filter(t => t !== id));
    } else {
      if (freeSelectedCount >= MAX_EXTRA_TRAITS) return;
      setSelectedTraits([...selectedTraits, id]);
    }
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
          {step !== 'saving' && step !== 'cinematic' && (
              <motion.div 
                key="progress-indicator"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-0 left-0 right-0 flex justify-center gap-2 py-10 z-[60] pointer-events-none"
              >
                  <div className={`h-1.5 w-12 rounded-full transition-all duration-200 ${step === 'avatar' ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'bg-white/10'}`} />
                  <div className={`h-1.5 w-12 rounded-full transition-all duration-200 ${step === 'traits' ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'bg-white/10'}`} />
                  <div className={`h-1.5 w-12 rounded-full transition-all duration-200 ${step === 'notification_tone' ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'bg-white/10'}`} />
                  <div className={`h-1.5 w-12 rounded-full transition-all duration-200 ${step === 'theme' ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'bg-white/10'}`} />
                  <div className={`h-1.5 w-12 rounded-full transition-all duration-200 ${step === 'custom_phrases' ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'bg-white/10'}`} />
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
            {step === 'traits' && (
              <motion.div 
                key="traits" 
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 overflow-y-auto overflow-x-hidden z-50 pointer-events-auto scrollbar-none"
                ref={traitsScrollRef}
              >
                <div className="min-h-full w-full flex flex-col items-center justify-start max-w-4xl mx-auto px-4 py-24">
                  <div className="text-center mb-10 flex-shrink-0 max-w-2xl mx-auto px-4">
                      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4 drop-shadow-md">
                          Selecciona tus Rasgos
                      </h1>
                      <p className="text-white/60 text-lg font-light tracking-wide">
                          {t('onboarding.traits.lead', 'Ya tienes 2 rasgos base. Elige 3 o 4 más para completar tu matriz.')}
                      </p>
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5">
                          <span className={`text-sm font-black tabular-nums ${traitsReady ? 'text-emerald-300' : 'text-white'}`}>
                              {freeSelectedCount} / {MAX_EXTRA_TRAITS}
                          </span>
                          <span className="text-xs font-semibold text-white/45">
                              {traitsReady
                                  ? t('onboarding.traits.ready', 'Listo, puedes continuar')
                                  : t('onboarding.traits.missing', 'Elige {{count}} más', { count: traitsMissing })}
                          </span>
                      </div>
                  </div>

                  <div className="w-full max-w-5xl mx-auto px-4 pb-24">
                      <div className="relative rounded-3xl border border-white/10 bg-[#0a0a0f] p-4 sm:p-6">
                        <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                          {t('onboarding.traits.base', 'Rasgos base (incluidos)')}
                        </div>
                        <div className="relative grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
                          {TRAITS_LIST.filter(trait => lockedTraitIds.includes(trait.id)).map(trait => {
                              const Icon = (trait.icon || Sparkles) as any;
                              return (
                                  <div
                                      key={trait.id}
                                      className="relative aspect-square rounded-2xl p-3 flex flex-col items-center justify-center gap-2 border"
                                      style={{ borderColor: `${trait.color}80`, backgroundColor: `${trait.color}12` }}
                                  >
                                      <Lock size={12} className="absolute top-2.5 right-2.5 text-white/40" />
                                      <div
                                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                                          style={{ backgroundColor: trait.color, color: '#fff' }}
                                      >
                                          <Icon size={20} />
                                      </div>
                                      <span className="text-xs font-bold text-center text-white">{t(trait.label)}</span>
                                  </div>
                              );
                          })}
                        </div>
                        <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                          {t('onboarding.traits.pick', 'Elige 3 o 4')}
                        </div>
                        <div className="relative grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {TRAITS_LIST.filter(trait => !lockedTraitIds.includes(trait.id)).map((trait) => {
                              const isSelected = selectedTraits.includes(trait.id);
                              const isGreyedOut = freeSelectedCount >= MAX_EXTRA_TRAITS && !isSelected;
                              const Icon = (trait.icon || Sparkles) as any;
                              const backgroundColor = isSelected ? `${trait.color}15` : 'rgba(255,255,255,0.03)';
                              
                              return (
                                  <motion.button
                                      key={trait.id}
                                      type="button"
                                      onClick={() => { if (!isGreyedOut) toggleTrait(trait.id); }}
                                      aria-pressed={isSelected}
                                      className={`
                                          relative aspect-square rounded-2xl p-3 flex flex-col items-center justify-center gap-2 border transition-all
                                          ${isSelected ? 'shadow-lg' : 'hover:bg-white/10 border-white/10'}
                                          ${isGreyedOut ? 'opacity-35' : ''}
                                      `}
                                      style={{
                                          borderColor: isSelected ? trait.color : 'rgba(255,255,255,0.1)',
                                          backgroundColor
                                      }}
                                  >
                                      <div 
                                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                                          style={{ 
                                              backgroundColor: isSelected ? trait.color : 'rgba(255,255,255,0.05)',
                                              color: isSelected ? '#fff' : trait.color
                                          }}
                                      >
                                          <Icon size={20} />
                                      </div>
                                      <span className={`text-xs font-bold text-center ${isSelected ? 'text-white' : 'text-white/60'}`}>
                                          {t(trait.label)}
                                      </span>
                                  </motion.button>
                              );
                          })}
                        </div>
                      </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: NOTIFICATION TONE SELECTION WITH 3 LIVE SAMPLES PER TONE */}
            {step === 'notification_tone' && (
              <motion.div
                key="notification_tone"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="absolute inset-0 overflow-y-auto z-50 pointer-events-auto scrollbar-none"
              >
                <div className="min-h-full w-full flex flex-col items-center justify-start max-w-4xl mx-auto px-4 py-20 pb-32">
                  <div className="text-center mb-8 max-w-2xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold mb-3 uppercase tracking-widest">
                      <Bell size={14} /> Estilo de Notificaciones
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
                      Tu coach personal
                    </h1>
                    <p className="text-white/60 text-sm font-medium">
                      Ponle nombre y elige cómo te hablará. Te escribirá como en un chat para motivarte y avisarte de tus tareas urgentes.
                    </p>
                  </div>

                  {/* Coach name + live chat preview */}
                  <div className="w-full mb-6 space-y-4">
                    <div className="rounded-3xl border border-emerald-400/25 bg-zinc-900/90 p-5 shadow-xl">
                      <div className="flex items-center justify-between">
                        <label htmlFor="assistant-name" className="text-xs font-black uppercase tracking-wider text-emerald-300">
                          ¿Cómo se llamará tu coach?
                        </label>
                        <span className="text-xs font-mono font-bold text-white/40">{assistantName.length} / {ASSISTANT_NAME_MAX}</span>
                      </div>
                      <input
                        id="assistant-name"
                        type="text"
                        maxLength={ASSISTANT_NAME_MAX}
                        value={assistantName}
                        onChange={(e) => setAssistantName(e.target.value)}
                        placeholder="Ej: Nova"
                        autoComplete="off"
                        className="mt-3 w-full rounded-2xl border-2 border-white/15 bg-black/60 px-4 py-3.5 text-[17px] font-bold text-white placeholder:text-white/25 outline-none transition-colors focus:border-emerald-400"
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        {ASSISTANT_SUGGESTIONS.map(sug => (
                          <button key={sug} type="button" onClick={() => setAssistantName(sug)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors active:scale-95 ${cleanAssistantName(assistantName) === sug ? 'border-emerald-400 bg-emerald-400/15 text-emerald-200' : 'border-white/10 bg-white/5 text-white/60'}`}>
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                    <ChatPreview
                      name={cleanAssistantName(assistantName) || 'Tu coach'}
                      messages={TONE_DEFINITIONS[selectedTone].sampleMessages}
                    />
                    <p className="text-center text-[11px] font-semibold text-white/40">
                      Así se verán sus mensajes. Elige su personalidad abajo 👇
                    </p>
                  </div>

                  <div className="w-full space-y-4">
                    {(Object.keys(TONE_DEFINITIONS) as NotificationTone[]).map((toneKey) => {
                      const tone = TONE_DEFINITIONS[toneKey];
                      const isSelected = selectedTone === toneKey;

                      return (
                        <motion.div
                          key={toneKey}
                          onClick={() => setSelectedTone(toneKey)}
                          whileHover={{ scale: 1.01 }}
                          className={`
                            relative rounded-3xl border p-5 cursor-pointer transition-all overflow-hidden
                            ${isSelected
                              ? 'bg-zinc-900/90 border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.2)]'
                              : 'bg-zinc-950/60 border-white/10 hover:border-white/20'
                            }
                          `}
                        >
                          <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4 mb-4">
                            <div>
                              <span className="text-[10px] font-black tracking-widest uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2.5 py-0.5 rounded-full">
                                {tone.badge}
                              </span>
                              <h3 className="text-lg font-black text-white mt-1.5">
                                {tone.name}
                              </h3>
                              <p className="text-xs text-white/60 mt-0.5">
                                {tone.description}
                              </p>
                            </div>

                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'bg-cyan-400 border-cyan-400 text-black' : 'border-white/20'}`}>
                              {isSelected && <CheckCircle2 size={16} />}
                            </div>
                          </div>

                          <div className="flex items-start gap-2 rounded-xl bg-white/5 border border-white/5 p-2.5 text-xs text-white/75 font-medium">
                            <MessageSquare size={14} className="mt-0.5 shrink-0 text-cyan-400" />
                            <span>{tone.sampleMessages[0]}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: THEME — free welcome pick (gradients, Ether, Nebula, Dorado) */}
            {step === 'theme' && (
              <motion.div
                key="theme"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="absolute inset-0 overflow-y-auto z-50 pointer-events-auto scrollbar-none"
              >
                <ThemePickerStep selected={selectedTheme} onSelect={setSelectedTheme} />
              </motion.div>
            )}

            {/* STEP 5: CUSTOM PHRASES (ANTI-PROCRASTINATION & SPLASH SUBTITLE) */}
            {step === 'custom_phrases' && (
              <motion.div
                key="custom_phrases"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="absolute inset-0 overflow-y-auto z-50 pointer-events-auto scrollbar-none"
              >
                <div className="min-h-full w-full flex flex-col items-center justify-start max-w-2xl mx-auto px-4 py-20 pb-32">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold mb-3 uppercase tracking-widest">
                      <Quote size={14} /> Frases Personalizadas
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
                      Define tus Frases de Poder
                    </h1>
                    <p className="text-white/60 text-sm font-medium">
                      Personaliza tus alertas personales para vencer la procrastinación y decorar tu pantalla de carga.
                    </p>
                  </div>

                  <div className="w-full space-y-6">
                    {/* Input 1: Anti-Procrastination Phrase (Max 50 chars) */}
                    <div className="bg-zinc-900/90 border border-white/15 rounded-3xl p-5 space-y-3 shadow-xl">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                          <ShieldAlert size={16} className="text-amber-400" />
                          Frase Anti-Procrastinación / Abandono
                        </label>
                        <span className="text-xs font-mono font-bold text-white/40">
                          {antiProcrastinationPhrase.length} / 50
                        </span>
                      </div>
                      <p className="text-[11px] text-white/50">
                        Esta frase se te recordará en notificaciones cuando lleves tiempo sin entrar o estés procrastinando.
                      </p>
                      <input
                        type="text"
                        maxLength={50}
                        value={antiProcrastinationPhrase}
                        onChange={(e) => setAntiProcrastinationPhrase(e.target.value)}
                        placeholder="Ej: ¿Vas a dejar que te ganen hoy? ¡Demuestra quién manda!"
                        className="w-full bg-black/60 border border-white/20 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-400 transition-colors"
                      />
                    </div>

                    {/* Input 2: Splash Screen Subtitle Phrase (Max 20 chars) */}
                    <div className="bg-zinc-900/90 border border-white/15 rounded-3xl p-5 space-y-3 shadow-xl">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                          <Volume2 size={16} className="text-cyan-400" />
                          Frase de Pantalla de Carga LUX
                        </label>
                        <span className="text-xs font-mono font-bold text-white/40">
                          {splashPhrase.length} / 20
                        </span>
                      </div>
                      <p className="text-[11px] text-white/50">
                        Aparecerá siempre debajo de la línea del logo "LUX" al iniciar la app.
                      </p>
                      <input
                        type="text"
                        maxLength={20}
                        value={splashPhrase}
                        onChange={(e) => setSplashPhrase(e.target.value)}
                        placeholder="Ej: Sin Excusas"
                        className="w-full bg-black/60 border border-white/20 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400 transition-colors font-semibold"
                      />
                    </div>

                    {/* Live Splash Preview Box */}
                    <div className="bg-black border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-2 relative overflow-hidden">
                      <span className="text-[9px] uppercase font-mono font-bold text-white/30 tracking-widest absolute top-2 left-3">
                        Vista Previa de Carga
                      </span>
                      <h2 className="text-2xl font-extralight tracking-[0.45em] text-white/90 mr-[-0.45em] pt-2">
                        LUX
                      </h2>
                      <div className="w-20 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
                      <p className="text-xs font-semibold text-cyan-300 tracking-wider font-mono pt-1">
                        {splashPhrase.trim() || 'Sin Excusas'}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 5: CINEMATIC — Lux glitches into El Monitor */}
            {step === 'cinematic' && (
              <motion.div key="cinematic" className="absolute inset-0" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <LuxToMonitorCinematic
                  name={profile?.displayName || (user as any)?.user_metadata?.display_name}
                  lang={currentLanguage.startsWith('en') ? 'en' : 'es'}
                  onDone={finishCinematic}
                />
              </motion.div>
            )}

            {/* STEP 6: SAVING */}
            {step === 'saving' && (
                 <motion.div 
                    key="saving"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/80 z-50"
                 >
                    <div className="flex flex-col items-center">
                        <div className="relative w-24 h-24 mb-8">
                            <div className="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin" />
                            <div className="absolute inset-2 rounded-full border-r-2 border-purple-500 animate-spin-reverse" />
                            <div className="absolute inset-4 rounded-full border-b-2 border-cyan-500 animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Sparkles className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        
                        <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Inicializando Matriz Lux...</h2>
                        <p className="text-white/50 text-sm tracking-widest uppercase">Guardando Preferencias & Tonos</p>
                    </div>
                 </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Global Bottom Navigation Button */}
        <AnimatePresence>
          {['traits', 'notification_tone', 'theme', 'custom_phrases'].includes(step) && (
            <motion.div
              key="step-action"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="fixed bottom-0 left-0 right-0 p-6 flex justify-center z-[9999] pointer-events-none bg-gradient-to-t from-black/90 to-transparent"
            >
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                disabled={(step === 'traits' && !traitsReady) || (step === 'notification_tone' && !assistantReady)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  pointer-events-auto relative px-8 py-4 rounded-full font-bold text-base sm:text-lg transition-all flex items-center gap-3 overflow-hidden border cursor-pointer
                  ${((step === 'traits' && !traitsReady) || (step === 'notification_tone' && !assistantReady))
                    ? 'bg-gray-800/50 text-white/30 border-white/5 cursor-not-allowed grayscale'
                    : 'bg-white text-black border-white/50 shadow-lg shadow-indigo-500/10'
                  }
                `}
              >
                <span>
                  {step === 'custom_phrases'
                    ? 'Finalizar Registro'
                    : step === 'traits' && !traitsReady
                      ? t('onboarding.traits.missing', 'Elige {{count}} más', { count: traitsMissing })
                      : step === 'notification_tone' && !assistantReady
                        ? 'Ponle nombre a tu coach'
                        : 'Continuar'}
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
