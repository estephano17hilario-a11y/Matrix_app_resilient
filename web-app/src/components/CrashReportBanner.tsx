import { useEffect, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';

interface LuxCrashPlugin {
  get(): Promise<{ ts?: number; text?: string }>;
  clear(): Promise<void>;
}
const LuxCrash = registerPlugin<LuxCrashPlugin>('LuxCrash');

/**
 * If Lux closed by itself last time, the native side saved why (an exception or the WebView being killed).
 * This shows a small strip to copy that report, so it can be shared without a computer or adb.
 */
export const CrashReportBanner = () => {
  const [report, setReport] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let alive = true;
    LuxCrash.get().then(r => { if (alive && r?.text) setReport(`Lux ${new Date(r.ts || Date.now()).toISOString()}\n${r.text}`); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!report) return null;

  const copy = async () => {
    try { await navigator.clipboard.writeText(report); setCopied(true); }
    catch { /* clipboard blocked: the text stays on screen via the title */ }
  };
  const dismiss = () => { setReport(null); LuxCrash.clear().catch(() => {}); };

  return (
    <div
      className="fixed inset-x-3 z-[100900] flex items-center gap-2 rounded-2xl border border-amber-300/30 bg-[#1a1408] px-3 py-2 text-[12px] font-bold text-amber-100"
      style={{ top: 'max(var(--sat, 0px), 8px)' }}
      role="status"
    >
      <button type="button" onClick={copy} className="min-w-0 flex-1 touch-manipulation text-left leading-tight">
        {copied ? 'Informe copiado. Pégalo en el chat.' : 'Lux se cerró la última vez. Toca para copiar el informe.'}
      </button>
      <button type="button" onClick={dismiss} aria-label="Cerrar" className="h-8 w-8 flex-none touch-manipulation rounded-full bg-white/10 text-[16px] leading-none">×</button>
    </div>
  );
};
