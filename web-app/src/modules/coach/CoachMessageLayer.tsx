import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import { CoachHeadsUp } from './ChatUI';
import { coachInbox, scheduleCoachMessages, welcomeMessage, WELCOME_PENDING_KEY, type CoachMessage } from './coachMessages';
import { monitor } from '../monitor/monitorStore';

/**
 * Mounted once in the Dashboard: schedules the coach's messages and shows them as chat heads-up
 * cards while the app is open. Right after onboarding, the coach says hello once the tutorial is over.
 */
export const CoachMessageLayer = ({ userName }: { userName?: string | null }) => {
  const [queue, setQueue] = useState<CoachMessage[]>([]);
  const current = queue[0];
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => coachInbox.subscribe(m => setQueue(q => (q.some(x => x.id === m.id) ? q : [...q, m]))), []);

  useEffect(() => {
    scheduleCoachMessages();
    const resched = () => scheduleCoachMessages();
    window.addEventListener('lux:assistant-name', resched);
    window.addEventListener('lux:coach-tone', resched);
    return () => {
      window.removeEventListener('lux:assistant-name', resched);
      window.removeEventListener('lux:coach-tone', resched);
    };
  }, []);

  // Welcome after onboarding: wait for El Monitor's intro/tour to finish (or never start).
  useEffect(() => {
    let pending = false;
    try { pending = localStorage.getItem(WELCOME_PENDING_KEY) === '1'; } catch { /* ignore */ }
    if (!pending) return;
    let sawMonitor = false;
    let idleSince = Date.now();
    const started = Date.now();
    const id = setInterval(() => {
      const busy = monitor.get().kind !== 'idle';
      if (busy) { sawMonitor = true; idleSince = Date.now(); return; }
      const idleFor = Date.now() - idleSince;
      if ((sawMonitor && idleFor > 1800) || (!sawMonitor && Date.now() - started > 9000)) {
        clearInterval(id);
        try { localStorage.removeItem(WELCOME_PENDING_KEY); } catch { /* ignore */ }
        coachInbox.push(welcomeMessage(userName));
      }
    }, 400);
    return () => clearInterval(id);
  }, [userName]);

  useEffect(() => {
    if (!current) return;
    timer.current = setTimeout(() => setQueue(q => q.slice(1)), 7000);
    return () => clearTimeout(timer.current);
  }, [current]);

  const dismiss = () => setQueue(q => q.slice(1));

  return createPortal(
    <div className="fixed inset-x-0 top-0 z-[100700] flex justify-center px-3 pt-[max(env(safe-area-inset-top),10px)]" style={{ pointerEvents: 'none' }}>
      <AnimatePresence mode="wait">
        {current && <CoachHeadsUp key={current.id} name={current.name} body={current.body} onOpen={dismiss} onDismiss={dismiss} />}
      </AnimatePresence>
    </div>,
    document.body,
  );
};
