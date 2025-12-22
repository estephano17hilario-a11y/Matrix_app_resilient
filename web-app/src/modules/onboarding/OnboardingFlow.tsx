import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Globe, Sparkles, CheckCircle2 } from 'lucide-react';
import { doc, updateDoc, db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { OnboardingLayout } from './components/OnboardingLayout';
import { GlassCard } from './components/GlassCard';
import { TRAITS_LIST } from '../dashboard/constants';
import { persistenceService } from '../../services/persistenceService';
import { useTranslation } from 'react-i18next';

type Step = 'intro' | 'language' | 'traits' | 'saving';

export function OnboardingFlow() {
  const { user, refreshProfile } = useAuth();
  const { i18n, t } = useTranslation();
  const [step, setStep] = useState<Step>('intro');
  
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [language, setLanguage] = useState<string>('en');

  const handleNext = () => {
    if (step === 'intro') setStep('language');
    else if (step === 'language') setStep('traits');
    else if (step === 'traits') handleSubmit();
  };

  const toggleTrait = (id: string) => {
    if (selectedTraits.includes(id)) {
      setSelectedTraits(selectedTraits.filter(t => t !== id));
    } else {
      if (selectedTraits.length < 5) {
        setSelectedTraits([...selectedTraits, id]);
      }
    }
  };

  const handleLanguageSelect = (lang: string) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    // Auto advance after short delay
    setTimeout(() => {
        handleNext();
    }, 400);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setStep('saving');
    
    try {
      const userRef = doc(db, "users", user.uid);
      
      // 1. Save Basic Onboarding Data
      await updateDoc(userRef, {
        onboarding: {
          completedAt: Date.now(),
          language: language
        }
      });

      // 2. Save Selected Attributes
      // First, get the full attribute objects for selected IDs
      const attributesToSave = selectedTraits.map(id => {
          const trait = TRAITS_LIST.find(t => t.id === id);
          if (!trait) return null;
          return {
              id: trait.id,
              label: trait.label,
              level: 1,
              xp: 0,
              maxXp: 100,
              color: trait.color,
              icon: trait.icon // Note: Icon component won't persist to Firestore, but that's fine, we re-hydrate on load
          };
      }).filter(Boolean);

      // Save each attribute
      await Promise.all(attributesToSave.map(attr => 
          persistenceService.attributes.save(user.uid, attr!)
      ));
      
      // Update local state to redirect to dashboard
      await refreshProfile();
      
    } catch (error) {
      console.error("Error saving onboarding:", error);
      // Fail-safe: Even if it fails, try to refresh profile and hope for the best, 
      // or at least let the user know.
      try {
        await refreshProfile();
      } catch (e) {
        setStep('traits'); // Go back so they can try again
        alert("Error saving data. Please check your connection.");
      }
    }
  };

  return (
    <OnboardingLayout>
      <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full relative h-full">
        
        {/* Progress Indicator */}
        {step !== 'intro' && step !== 'saving' && (
            <div className="absolute top-0 left-0 right-0 flex justify-center gap-2 py-6">
                <div className={`h-1 w-16 rounded-full transition-colors duration-500 ${step === 'language' ? 'bg-white' : 'bg-white/20'}`} />
                <div className={`h-1 w-16 rounded-full transition-colors duration-500 ${step === 'traits' ? 'bg-white' : 'bg-white/20'}`} />
            </div>
        )}

        <AnimatePresence mode="wait">
          
          {/* STEP 0: INTRO */}
          {step === 'intro' && (
            <GlassCard key="intro" className="text-center py-12 max-w-md mx-auto">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="mb-8 flex justify-center"
              >
                <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.1)] border border-white/10">
                   <Sparkles className="w-10 h-10 text-white" />
                </div>
              </motion.div>
              
              <h1 className="text-5xl font-bold text-white mb-6 tracking-tighter">
                {t('onboarding.intro.title')}
              </h1>
              <p className="text-white/60 text-lg mb-10 leading-relaxed font-light">
                {t('onboarding.intro.subtitle')}
              </p>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNext}
                className="bg-white text-black px-10 py-4 rounded-full font-bold text-lg shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all"
              >
                {t('onboarding.intro.button')}
              </motion.button>
            </GlassCard>
          )}

          {/* STEP 1: LANGUAGE */}
          {step === 'language' && (
            <GlassCard key="language" className="max-w-md mx-auto">
              <div className="mb-8 text-center">
                <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-400">
                    <Globe size={24} />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-2">{t('onboarding.language.title')}</h1>
                <p className="text-white/40">{t('onboarding.language.subtitle')}</p>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={() => handleLanguageSelect('en')}
                  className={`w-full p-6 rounded-3xl border flex items-center justify-between transition-all group ${
                    language === 'en' 
                      ? 'bg-white text-black border-white shadow-[0_0_30px_rgba(255,255,255,0.2)]' 
                      : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">🇺🇸</span>
                    <div className="text-left">
                        <div className="font-bold text-lg">{t('onboarding.language.en.name')}</div>
                        <div className="text-xs opacity-60">{t('onboarding.language.en.region')}</div>
                    </div>
                  </div>
                  {language === 'en' && <CheckCircle2 className="w-6 h-6" />}
                </button>
                
                <button 
                  onClick={() => handleLanguageSelect('es')}
                  className={`w-full p-6 rounded-3xl border flex items-center justify-between transition-all group ${
                    language === 'es' 
                      ? 'bg-white text-black border-white shadow-[0_0_30px_rgba(255,255,255,0.2)]' 
                      : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">🇪🇸</span>
                    <div className="text-left">
                        <div className="font-bold text-lg">{t('onboarding.language.es.name')}</div>
                        <div className="text-xs opacity-60">{t('onboarding.language.es.region')}</div>
                    </div>
                  </div>
                  {language === 'es' && <CheckCircle2 className="w-6 h-6" />}
                </button>
              </div>
            </GlassCard>
          )}

          {/* STEP 2: TRAITS */}
          {step === 'traits' && (
            <div key="traits" className="w-full h-full flex flex-col items-center justify-center">
                <div className="text-center mb-8 flex-shrink-0 max-w-2xl mx-auto px-4">
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
                        {t('onboarding.traits.title')}
                    </h1>
                    <p className="text-white/60 text-lg">
                        {t('onboarding.traits.subtitle', { count: selectedTraits.length })}
                        {selectedTraits.length < 3 && (
                           <span className="block text-sm text-red-400 mt-1 font-medium">
                             ({t('common.selectAtLeast', { count: 3 }) || `Select at least 3 (Selected: ${selectedTraits.length})`})
                           </span>
                        )}
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 w-full px-4 pb-24 custom-scrollbar">
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 w-full max-w-4xl mx-auto">
                        {TRAITS_LIST.map((trait) => {
                            const isSelected = selectedTraits.includes(trait.id);
                            const isMaxReached = !isSelected && selectedTraits.length >= 5;
                            
                            return (
                                <motion.button
                                    key={trait.id}
                                    layoutId={trait.id}
                                    onClick={() => toggleTrait(trait.id)}
                                    disabled={isMaxReached}
                                    whileHover={!isMaxReached ? { scale: 1.05 } : {}}
                                    whileTap={!isMaxReached ? { scale: 0.95 } : {}}
                                    className={`relative flex flex-col items-center justify-center gap-2 p-3 rounded-2xl transition-all duration-300 aspect-[3/4] group overflow-hidden ${
                                        isSelected 
                                            ? 'bg-white/20 ring-2 ring-white shadow-[0_0_20px_rgba(255,255,255,0.3)]' 
                                            : isMaxReached
                                                ? 'opacity-30 grayscale cursor-not-allowed bg-white/5'
                                                : 'bg-white/5 hover:bg-white/10 opacity-70 hover:opacity-100'
                                    }`}
                                >
                                    <div 
                                        className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300"
                                        style={{ backgroundColor: trait.color }}
                                    />
                                    {isSelected && (
                                        <div 
                                            className="absolute inset-0 opacity-20 animate-pulse"
                                            style={{ backgroundColor: trait.color }}
                                        />
                                    )}

                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors relative z-10 ${
                                        isSelected ? 'bg-white text-black' : 'bg-white/10 text-white'
                                    }`} style={{ color: isSelected ? trait.color : undefined }}>
                                        <trait.icon size={20} />
                                    </div>
                                    
                                    <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider text-center relative z-10 w-full px-1 leading-tight line-clamp-2 ${
                                        isSelected ? 'text-white' : 'text-white/70'
                                    }`}>
                                        {t(trait.label)}
                                    </span>

                                    {isSelected && (
                                        <div className="absolute top-2 right-2 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm z-20">
                                            <CheckCircle2 size={10} className="text-black" />
                                        </div>
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>
                </div>

                <div className="fixed bottom-8 left-0 right-0 flex justify-center z-50 pointer-events-none">
                    <motion.button
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: selectedTraits.length >= 3 ? 1 : 0.5, y: 0 }}
                        disabled={selectedTraits.length < 3}
                        onClick={handleNext}
                        className="pointer-events-auto bg-white text-black px-12 py-4 rounded-full font-bold text-lg shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                        {t('onboarding.traits.button')} <ArrowRight className="w-5 h-5" />
                    </motion.button>
                </div>
            </div>
          )}

          {/* LOADING STATE */}
          {step === 'saving' && (
            <motion.div
                key="saving"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-64"
            >
                <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-6" />
                <h2 className="text-xl font-bold text-white">{t('onboarding.saving.title')}</h2>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </OnboardingLayout>
  );
}
