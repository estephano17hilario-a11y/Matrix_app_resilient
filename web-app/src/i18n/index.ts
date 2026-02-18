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
  if (!canUseStorage) return null;
  try {
    return localStorage.getItem('i18nextLng');
  } catch {
    return null;
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    // Start with Spanish if no language is detected/stored
    lng: getStoredLanguage() || 'es', 
    fallbackLng: 'es', 
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
