import React, { startTransition, useEffect, useRef, useState } from 'react';
import { hasArrived } from '@/immersion/engine';

interface ViewContainerProps {
    isActive: boolean;
    children: React.ReactNode;
    className?: string;
    id?: string;
    variant?: 'default' | 'minimal';
}

// Inactive sections are hidden with `content-visibility: hidden` (collapsed to
// zero height) instead of `display: none`. The browser then keeps their style
// and layout, so coming back to a section costs ~1ms instead of laying the
// whole section out again (5–40ms on desktop, several times that on a phone),
// and while hidden they are skipped entirely: not styled, laid out, painted or
// hit-tested. Where content-visibility isn't supported, height 0 + overflow
// hidden still hides them.
const HIDDEN: React.CSSProperties = {
    contentVisibility: 'hidden',
    height: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
};

// The section being left is hidden on the tap, but its content is not
// re-rendered then: it keeps the elements it last showed (React skips the
// subtree), so the tap only renders the section that arrives. Its own update
// (isActive=false for whatever reacts to it) lands once the glide is over, as
// a low-priority render.
const SETTLE_MS = 450;

// Warm-up: a section that was never shown has never been styled or laid out,
// so its first visit paid for all of it on the tap. Once the app is idle, each
// hidden section is laid out once, one per idle period (still collapsed and
// unpainted), and then hidden again. content-visibility keeps that work, so
// even the first visit to a section only has to paint it.
const warmQueue: HTMLElement[] = [];
let warming = false;
const whenIdle = (cb: () => void) => {
    const ric = (window as any).requestIdleCallback as ((cb: () => void, o?: { timeout: number }) => number) | undefined;
    if (ric) ric(cb, { timeout: 1500 }); else window.setTimeout(cb, 300);
};
const pumpWarmup = () => {
    warming = false;
    const el = warmQueue.shift();
    if (el && el.isConnected && el.dataset.viewActive === 'false') {
        // At its real height (sections with full-height layouts depend on it);
        // restored before anything is painted.
        el.style.contentVisibility = 'visible';
        el.style.height = '';
        void el.offsetHeight; // lay the section out now, while nothing else is happening
        el.style.contentVisibility = 'hidden';
        el.style.height = '0px';
    }
    if (warmQueue.length) {
        warming = true;
        // Behind the boot splash nothing is visible yet: warm everything right
        // away. After it, only in idle time.
        if (!hasArrived()) window.setTimeout(pumpWarmup, 0); else whenIdle(pumpWarmup);
    }
};
const warmUp = (el: HTMLElement) => {
    warmQueue.push(el);
    if (!warming) {
        warming = true;
        if (!hasArrived()) window.setTimeout(pumpWarmup, 0); else whenIdle(pumpWarmup);
    }
};

export const ViewContainer = React.memo(({ isActive, children, className = "", id, variant = 'default' }: ViewContainerProps) => {
    const zIndex = variant === 'minimal' ? 20 : 10;
    const [settledInactive, setSettledInactive] = useState(!isActive);
    const shown = useRef<React.ReactNode>(children);
    const el = useRef<HTMLDivElement>(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { if (!isActive && el.current) warmUp(el.current); }, []);

    const frozen = !isActive && !settledInactive;
    if (!frozen) shown.current = children;

    useEffect(() => {
        if (isActive) {
            if (settledInactive) setSettledInactive(false);
            return;
        }
        if (settledInactive) return;
        // After the glide, and only once the phone is idle, so this render
        // never lands in the middle of the travel.
        let cancelled = false;
        const timer = window.setTimeout(() => {
            whenIdle(() => { if (!cancelled) startTransition(() => setSettledInactive(true)); });
        }, SETTLE_MS);
        return () => { cancelled = true; window.clearTimeout(timer); };
    }, [isActive, settledInactive]);

    return (
        <div
            ref={el}
            id={id}
            className={`${className} w-full`}
            data-view-active={isActive ? 'true' : 'false'}
            style={isActive ? { display: 'block', zIndex } : { display: 'block', zIndex, ...HIDDEN }}
            aria-hidden={isActive ? undefined : true}
        >
            {shown.current}
        </div>
    );
}, (prev, next) => {
    // Only re-render if isActive changes
    if (prev.isActive !== next.isActive) return false;
    // If inactive, skip re-renders entirely
    if (!next.isActive) return true;
    // If active, allow re-renders
    return false;
});
