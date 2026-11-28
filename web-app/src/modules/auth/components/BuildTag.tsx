import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

/** Tiny "v1.0.59 (59)" tag on the sign-up screens, so anyone can tell at a glance which build is installed. */
export const BuildTag = () => {
  const [label, setLabel] = useState('');
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let alive = true;
    App.getInfo().then(i => { if (alive) setLabel(`v${i.version} (${i.build})`); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  if (!label) return null;
  return (
    <span
      aria-hidden
      className="absolute bottom-[max(var(--sab,0px),6px)] right-3 z-[5] text-[10px] font-bold tabular-nums tracking-wide text-white/25"
      style={{ pointerEvents: 'none' }}
    >
      {label}
    </span>
  );
};
