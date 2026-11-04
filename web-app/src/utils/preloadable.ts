import { createElement, lazy, type ComponentType } from 'react';

// React.lazy that can be warmed up ahead of time.
//
// `preload()` fetches the chunk (e.g. behind the boot splash). Once loaded,
// the component renders directly, without React.lazy: a lazy component
// suspends on its first render even when its module is already in memory,
// which flashed the Suspense fallback the first time a screen was opened.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const preloadable = <T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): T & { preload: () => Promise<unknown> } => {
  let loaded: T | null = null;
  let pending: Promise<{ default: T }> | null = null;
  const load = () => (pending ??= factory().then(m => { loaded = m.default; return m; }));
  const Lazy = lazy(load);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Component = (props: any) => createElement((loaded ?? Lazy) as ComponentType<any>, props);
  return Object.assign(Component, { preload: load }) as unknown as T & { preload: () => Promise<unknown> };
};
