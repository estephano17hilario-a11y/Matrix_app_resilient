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
      <div className="relative w-full h-full flex flex-col">
        
        {/* Progress Indicator - Fixed at top, doesn't interfere with centering */}
        <AnimatePresence>
          {step !== 'intro' && step !== 'saving' && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-0 left-0 right-0 flex justify-center gap-2 py-10 z-50"
              >
                  <div className={`h-1.5 w-16 rounded-full transition-all duration-500 ${step === 'language' ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'bg-white/10'}`} />
                  <div className={`h-1.5 w-16 rounded-full transition-all duration-500 ${step === 'traits' ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'bg-white/10'}`} />
              </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 w-full relative overflow-hidden">
          <div className="absolute inset-0 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="min-h-full w-full flex flex-col items-center justify-center max-w-4xl mx-auto px-4 py-24">
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
              <GlassCard key="language" className="max-w-md w-full mx-auto">
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
              <div key="traits" className="w-full flex flex-col items-center pb-32">
                  <div className="text-center mb-10 flex-shrink-0 max-w-2xl mx-auto px-4">
                      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">
                          {t('onboarding.traits.title')}
                      </h1>
                      <p className="text-white/60 text-lg">
                          {t('onboarding.traits.subtitle', { count: selectedTraits.length })}
                          {selectedTraits.length < 3 && (
                             <span className="block text-sm text-red-400 mt-2 font-medium">
                               ({t('common.selectAtLeast', { count: 3 }) || `Select at least 3 (Selected: ${selectedTraits.length})`})
                             </span>
                          )}
                      </p>
                  </div>

                  <div className="w-full max-w-5xl mx-auto px-4">
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
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
                                      className={`relative flex flex-col items-center justify-center gap-3 p-4 rounded-3xl transition-all duration-300 aspect-square group overflow-hidden ${
                                          isSelected 
                                              ? 'bg-white/20 ring-2 ring-white shadow-[0_0_30px_rgba(255,255,255,0.2)]' 
                                              : isMaxReached
                                                  ? 'opacity-20 grayscale cursor-not-allowed bg-white/5'
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

                                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 relative z-10 ${
                                          isSelected ? 'bg-white text-black scale-110' : 'bg-white/10 text-white'
                                      }`} style={{ color: isSelected ? trait.color : undefined }}>
                                          <trait.icon size={24} />
                                      </div>
                                      
                                      <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider text-center relative z-10 w-full px-1 leading-tight line-clamp-2 ${
                                          isSelected ? 'text-white' : 'text-white/70'
                                      }`}>
                                          {t(trait.label)}
                                      </span>

                                      {isSelected && (
                                          <div className="absolute top-3 right-3 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-lg z-20">
                                              <CheckCircle2 size={12} className="text-black" />
                                          </div>
                                      )}
                                  </motion.button>
                              );
                          })}
                      </div>
                  </div>

                  <div className="fixed bottom-10 left-0 right-0 flex justify-center z-50 pointer-events-none">
                      <motion.button
                          initial={{ opacity: 0, y: 50 }}
                          animate={{ opacity: selectedTraits.length >= 3 ? 1 : 0.5, y: 0 }}
                          disabled={selectedTraits.length < 3}
                          onClick={handleNext}
                          className="pointer-events-auto bg-white text-black px-12 py-5 rounded-full font-bold text-xl shadow-[0_0_50px_rgba(255,255,255,0.3)] hover:shadow-[0_0_70px_rgba(255,255,255,0.5)] transition-all flex items-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none active:scale-95"
                      >
                          {t('onboarding.traits.button')} <ArrowRight className="w-6 h-6" />
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
                  <div className="w-16 h-16 border-4 border-white/10 border-t-white rounded-full animate-spin mb-6" />
                  <h2 className="text-2xl font-bold text-white tracking-tight">{t('onboarding.saving.title')}</h2>
              </motion.div>
            )}
            
            </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </OnboardingLayout>
  );
}
