// The expanded "+" menu is owned by the Dock itself. It used to report every
// open/close to the Dashboard, whose render (hundreds of ms on a phone, plus a
// style recalculation of the whole page) landed right at the end of the dock's
// animation — that was the stutter on "+" and on entering a section from it.
//
// Nothing in the Dashboard needs to *render* on it: the interface recedes via
// the `lux:dock` event (useDepthRecede), and the back button only has to know
// whether the menu is open and to be able to close it. Both go through here.

let open = false;

export const isDockOpenNow = () => open;

/** Called by the Dock whenever its state changes. */
export const publishDockOpen = (next: boolean) => {
  open = next;
  window.dispatchEvent(new CustomEvent('lux:dock', { detail: next }));
};

/** Asks the Dock to close (back button, a modal opening, a navigation…). No-op if it is closed. */
export const requestDockClose = () => {
  if (open) window.dispatchEvent(new Event('lux:dock-close'));
};
