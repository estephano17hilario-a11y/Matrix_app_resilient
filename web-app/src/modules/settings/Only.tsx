import type { ReactNode } from 'react';
import { useSettings } from './SettingsContext';

/** Renders its children only while the given settings page is open. */
export const Only = ({ page, children }: { page: string | string[]; children: ReactNode }) => {
  const { page: current } = useSettings();
  const match = Array.isArray(page) ? page.includes(current as string) : page === current;
  return match ? <>{children}</> : null;
};
