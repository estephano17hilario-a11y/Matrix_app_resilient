import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import es from './locales/es.json';

const resources = {
  en: {
    translation: en
  },
  es: {
    translation: es
  }
};

const canUseStorage = (() => {
  try {
    const testKey = '__i18n__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
})();

const getStoredLanguage = () => {
  if (canUseStorage) {
    try {
      const stored = localStorage.getItem('i18nextLng');
      if (stored) {
        if (stored.startsWith('en')) return 'en';
        if (stored.startsWith('es')) return 'es';
      }
    } catch {
      // ignore
    }
  }
  
  // Si no hay idioma guardado, analizamos el del dispositivo
  if (typeof navigator !== 'undefined' && navigator.language) {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('es')) return 'es';
    if (browserLang.startsWith('en')) return 'en';
  }
  
  // "y si no se identifca nada osea el "else" sera en ingles"
  return 'en';
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: getStoredLanguage(), // detecta o usa default
    fallbackLng: 'en', // fallback a inglés
    supportedLngs: ['es', 'en'],
    debug: true, // Enable debug to see what's happening in console
    interpolation: {
      escapeValue: false 
    },
    detection: {
      order: canUseStorage ? ['localStorage', 'navigator'] : ['navigator'],
      caches: canUseStorage ? ['localStorage'] : [],
      lookupLocalStorage: 'i18nextLng'
    },
    react: {
        useSuspense: false
    }
  });

export default i18n;
