// ─────────────────────────────────────────────────────────────────────────────
// EL MONITOR — root. Mounted once in the Dashboard: renders the intro and the
// live guided scripts (the lightbulb of each section starts that section's tour).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MonitorIntro } from './MonitorIntro';
import { MonitorStage } from './MonitorStage';
import { monitor, useMonitor } from './monitorStore';
import type { Lang } from './scripts';

export const useMonitorLang = (): Lang => {
  const { i18n } = useTranslation();
  return (i18n.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
};

export const MonitorRoot: React.FC<{ userName?: string | null }> = ({ userName }) => {
  const state = useMonitor();
  const lang = useMonitorLang();

  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__monitor = { monitor };
  }, []);

  return (
    <>
      <style>{'@keyframes monitor-caret { 0%,100% { opacity: 1 } 50% { opacity: 0 } }'}</style>
      <AnimatePresence>
        {state.kind === 'intro' && (
          <MonitorIntro key="intro" lang={lang} name={userName} onStart={() => monitor.run(state.then)} onSkip={monitor.close} />
        )}
      </AnimatePresence>
      {state.kind === 'script' && <MonitorStage script={state.script} run={state.run} lang={lang} />}
    </>
  );
};
