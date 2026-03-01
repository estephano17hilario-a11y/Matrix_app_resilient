import { Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import { SettingsSidebar } from './SettingsSidebar';

// Lazy load sections for performance
const VisualsSection = lazy(() => import('../sections/VisualsSection').then(m => ({ default: m.VisualsSection })));
const SystemSection = lazy(() => import('../sections/SystemSection').then(m => ({ default: m.SystemSection })));
const AccountSection = lazy(() => import('../sections/AccountSection').then(m => ({ default: m.AccountSection })));
const NeuralSection = lazy(() => import('../sections/NeuralSection').then(m => ({ default: m.NeuralSection })));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-full w-full">
    <div className="w-8 h-8 border-2 border-white/10 border-t-white/60 rounded-full animate-spin" />
  </div>
);

export const SettingsModal = () => {
  const { closeSettings, activeTab } = useSettings();

  // Mapping of tabs to components
  const renderContent = () => {
    switch (activeTab) {
      case 'visuals':
        return <VisualsSection />;
      case 'neural':
        return <NeuralSection />;
      case 'system':
        return <SystemSection />;
      case 'account':
        return <AccountSection />;
      default:
        return <VisualsSection />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[1000] flex items-center justify-center"
    >
      {/* BACKDROP - Iron Rule: No blur here to save GPU if modal has blur */}
      <div 
        className="absolute inset-0 bg-black/60" 
        onClick={closeSettings}
      />

      {/* MODAL CONTAINER */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-[95%] max-w-lg md:max-w-4xl h-[85vh] md:h-[80vh] flex flex-col md:flex-row overflow-hidden rounded-3xl border border-white/10 bg-[#050505]/90 backdrop-blur-sm shadow-md shadow-indigo-500/10 relative z-10"
      >
        {/* SIDEBAR */}
        <SettingsSidebar />

        {/* CONTENT AREA */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gradient-to-b from-white/5 to-transparent">
          
          {/* Close Button - Mobile: Top Right, Desktop: Top Right of content */}
          <div className="absolute top-4 right-4 z-50">
            <button
              onClick={closeSettings}
              className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors border border-white/5"
            >
              <X size={18} />
            </button>
          </div>

          {/* SCROLLABLE CONTENT */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar overscroll-contain">
            <div className="p-4 md:p-8 md:pr-16 min-h-full pb-24 md:pb-8">
              <Suspense fallback={<LoadingSpinner />}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="h-full"
                  >
                    {renderContent()}
                  </motion.div>
                </AnimatePresence>
              </Suspense>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
