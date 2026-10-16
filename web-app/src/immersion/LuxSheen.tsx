import { useEffect, useRef } from 'react';
import { registerSheen } from './engine';
import { isLiteDevice, useImmersionPrefs } from './immersionPrefs';

// A specular highlight for glass surfaces. The light source is fixed in the
// world, so when the phone tilts the reflection glides across the surface.
// Drop it inside any positioned container; it clips itself to the rounded box.
export const LuxSheen = ({ intensity = 1 }: { intensity?: number }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const prefs = useImmersionPrefs();
  const tracking = prefs.enabled && prefs.motion && !isLiteDevice;

  useEffect(() => {
    if (!tracking || !ref.current) return;
    return registerSheen(ref.current);
  }, [tracking]);

  if (!prefs.enabled) return null;

  return (
    <span aria-hidden="true" className="lux-sheen-clip">
      <span ref={ref} className={tracking ? 'lux-sheen lux-sheen-live' : 'lux-sheen'} style={{ opacity: intensity }} />
    </span>
  );
};
