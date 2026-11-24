import { createRoot } from 'react-dom/client'
import './index.css'
import i18n from './i18n'; // Import i18n configuration
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { PersistenceService } from './services/persistence'
import { installSyncedPrefs, bootSyncedPrefs } from './services/syncedPrefs'

// 🛡️ CONSOLE SILENCER
// We keep this lightweight to avoid specific noise, but we should not suppress critical network errors 
// unless we are sure they are harmless.
const originalConsoleError = console.error;
console.error = (...args) => {
    // Pass through by default
    originalConsoleError(...args);
};

console.log('MAIN: Mounting application...');

if (/Android/i.test(navigator.userAgent)) {
    document.documentElement.classList.add('android-webview');
}

const initApp = async () => {
  await PersistenceService.initialize();
  // Preferences that used to live only on this phone follow the account (VPS). Never block launch on failure.
  try {
    await installSyncedPrefs();
    const replaced = await bootSyncedPrefs();
    if (replaced > 0) {
      const lng = localStorage.getItem('i18nextLng');
      if (lng && lng !== i18n.language) await i18n.changeLanguage(lng);
    }
  } catch (e) {
    console.warn('SYNCED PREFS: skipped', e);
  }
  createRoot(document.getElementById('root')!).render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>,
  );
};

initApp();
