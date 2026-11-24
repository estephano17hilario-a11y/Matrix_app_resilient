// Boot warm-up registry.
//
// Anything that should be in memory before the user sees the app (screen
// chunks, fonts, the ranks screen, a mounted-but-hidden section…) registers its
// promise here at module load, so the work starts the moment the bundle runs —
// in parallel with persistence/auth — instead of after the first render.
// The boot splash then waits for the registry (bounded), so the interface is
// revealed only once everything behind it is ready, however fast or slow the
// device is.

const tasks: Promise<unknown>[] = [];

/** Starts tracking a promise. Failures never block boot. */
export const registerWarmup = <T>(p: Promise<T> | (() => Promise<T>)): Promise<T | undefined> => {
  const tracked = Promise.resolve(typeof p === 'function' ? p() : p).catch(() => undefined);
  tasks.push(tracked);
  return tracked;
};

/** A task finished by someone else later (e.g. a section mounting). */
export const deferredWarmup = (): (() => void) => {
  let done!: () => void;
  tasks.push(new Promise<void>(resolve => { done = resolve; }));
  return done;
};

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * Resolves when every registered task is done, but never before `minMs` (the
 * brand moment) and never later than `maxMs` (a slow network must not trap the user).
 */
export const whenWarm = async (minMs: number, maxMs: number): Promise<void> => {
  // Tasks may be registered while we wait (late imports): re-check until stable.
  const settled = (async () => {
    let seen = -1;
    while (seen !== tasks.length) {
      seen = tasks.length;
      await Promise.all(tasks.slice());
    }
  })();
  await Promise.all([wait(minMs), Promise.race([settled, wait(maxMs)])]);
};

// Fonts are part of "ready": text must not swap after the reveal.
try {
  const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
  if (fonts?.ready) registerWarmup(fonts.ready);
} catch { /* no FontFaceSet */ }
