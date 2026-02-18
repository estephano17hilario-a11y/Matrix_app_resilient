import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'; // Import i18n configuration
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'

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

createRoot(document.getElementById('root')!).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
)
