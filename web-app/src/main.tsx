import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'

// 🛡️ GLOBAL ERROR TRAP
// This swallows the annoying "net::ERR_ABORTED" which is harmless in dev
// but terrifying to users.
window.addEventListener('error', (event) => {
    if (event.message?.includes('net::ERR_ABORTED') || 
        event.message?.includes('Aborted') ||
        event.message?.includes('The user aborted a request')) {
        event.preventDefault();
        // console.debug("🧹 Ignored harmless network abort.");
    }
});

window.addEventListener('unhandledrejection', (event) => {
     if (event.reason?.code === 'aborted' || 
         event.reason?.name === 'AbortError' ||
         event.reason?.message?.includes('Aborted')) {
         event.preventDefault();
         // console.debug("🧹 Ignored harmless promise abort.");
     }
});

console.log('MAIN: Mounting application...');

createRoot(document.getElementById('root')!).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
)
