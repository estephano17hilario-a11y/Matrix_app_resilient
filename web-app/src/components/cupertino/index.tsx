import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Check, Minus, Plus, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import './cupertino.css';

/* ─────────────────────────────────────────────────────────────────────────────
   Cupertino · visionOS glass kit
   Small, dependency-free building blocks shared by the create/edit flows.
   ───────────────────────────────────────────────────────────────────────────── */

const EASE = [0.32, 0.72, 0, 1] as const;

const useIsDesktop = () => {
    const query = '(min-width: 640px)';
    const [matches, setMatches] = useState(() =>
        typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false
    );
    useEffect(() => {
        if (typeof window.matchMedia !== 'function') return;
        const mql = window.matchMedia(query);
        const onChange = () => setMatches(mql.matches);
        onChange();
        mql.addEventListener?.('change', onChange);
        return () => mql.removeEventListener?.('change', onChange);
    }, []);
    return matches;
};

/* ── Sheet ───────────────────────────────────────────────────────────────── */

export interface CupertinoSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    accent?: string;
    /** Primary pill in the header (Crear / Guardar) */
    primaryLabel?: string;
    onPrimary?: () => void;
    primaryDisabled?: boolean;
    primaryLoading?: boolean;
    /** Rendered under the title row (e.g. a segmented switch) */
    headerExtra?: React.ReactNode;
    /** Sticky area under the scroll body */
    footer?: React.ReactNode;
    /** Extra portal content that must sit above the sheet (date picker modals…) */
    overlays?: React.ReactNode;
    /** Blocks closing while saving */
    closeDisabled?: boolean;
    maxWidth?: number;
    zIndex?: number;
    scrollRef?: React.Ref<HTMLDivElement>;
    /** In-sheet detail panel: tap a tile, edit, tap Listo (replaces long scrolling forms) */
    subpanel?: { title: React.ReactNode; onBack: () => void; children: React.ReactNode } | null;
    doneLabel?: string;
    children: React.ReactNode;
}

/** Keeps a sheet mounted while it animates out, then ALWAYS unmounts it on a timer.
 *  (No dependency on animation-complete callbacks: a stuck exit can never leave an invisible layer
 *  swallowing taps.) */
const useSheetPresence = (open: boolean, ms = 360) => {
    const [mounted, setMounted] = useState(open);
    useEffect(() => {
        if (open) { setMounted(true); return; }
        const id = window.setTimeout(() => setMounted(false), ms);
        return () => window.clearTimeout(id);
    }, [open, ms]);
    return { visible: open || mounted, closing: !open };
};

/** Lock page scroll underneath while a sheet is up; always restored on close/unmount. */
const useBodyLock = (active: boolean) => {
    useEffect(() => {
        if (!active) return;
        const prev = document.body.style.overscrollBehavior;
        document.body.style.overscrollBehavior = 'none';
        return () => { document.body.style.overscrollBehavior = prev; };
    }, [active]);
};

export const CupertinoSheet: React.FC<CupertinoSheetProps> = ({
    isOpen, onClose, title, subtitle, accent = '#0a84ff', primaryLabel, onPrimary, primaryDisabled, primaryLoading,
    headerExtra, footer, overlays, closeDisabled, maxWidth, zIndex = 99999, scrollRef, subpanel, doneLabel = 'Listo', children,
}) => {
    const isDesktop = useIsDesktop();
    const reduce = useReducedMotion();
    const controls = useDragControls();
    const pointerStartedOnBackdrop = useRef(false);
    const titleId = useId();
    const { visible, closing } = useSheetPresence(isOpen);
    useBodyLock(isOpen);

    // Escape closes (the detail panel first)
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (subpanel) subpanel.onBack();
            else if (!closeDisabled) onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, closeDisabled, onClose, subpanel]);

    if (typeof document === 'undefined' || !document.body || !visible) return null;

    const spring = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 420, damping: 38, mass: 0.9 };
    const enter = isDesktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 };
    const leave = isDesktop ? { opacity: 0, scale: 0.97, y: 10 } : { y: '100%' };
    const start = isDesktop ? { opacity: 0, scale: 0.96, y: 18 } : { y: '100%' };

    return createPortal(
        <div
            className="cu-root cu-layer"
            data-closing={closing || undefined}
            style={{ zIndex, pointerEvents: closing ? 'none' : 'auto', ['--cu-accent' as any]: accent }}
        >
            <div
                className="cu-backdrop"
                data-closing={closing || undefined}
                onPointerDown={() => { pointerStartedOnBackdrop.current = true; }}
                onClick={() => {
                    // Ignore ghost clicks that did not start on this backdrop
                    if (!pointerStartedOnBackdrop.current) return;
                    pointerStartedOnBackdrop.current = false;
                    if (!closeDisabled) onClose();
                }}
            />
            <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className={cn('cu-sheet', subpanel && 'cu-has-sub')}
                style={maxWidth ? { maxWidth } : undefined}
                initial={start}
                animate={closing ? leave : enter}
                transition={spring}
                drag={isDesktop ? false : 'y'}
                dragListener={false}
                dragControls={controls}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.55 }}
                onDragEnd={(_, info) => {
                    if (!closeDisabled && (info.offset.y > 120 || info.velocity.y > 700)) onClose();
                }}
            >
                <div
                    className="cu-header"
                    onPointerDown={(e) => {
                        // Never start a drag from a button: taps must stay plain taps
                        if (isDesktop || (e.target as HTMLElement).closest('button,input,a')) return;
                        controls.start(e);
                    }}
                >
                    <div className="cu-grabber" />
                    <div className="cu-header-row">
                        <button type="button" className="cu-icon-btn" onClick={onClose} disabled={closeDisabled} aria-label="Cerrar">
                            <X size={18} strokeWidth={2.4} />
                        </button>
                        <div className="cu-header-title">
                            <h2 id={titleId}>{title}</h2>
                            {subtitle ? <p>{subtitle}</p> : null}
                        </div>
                        {primaryLabel ? (
                            <button type="button" className="cu-primary-btn" onClick={onPrimary} disabled={primaryDisabled || primaryLoading}>
                                {primaryLoading ? <Loader2 size={16} className="animate-spin" /> : primaryLabel}
                            </button>
                        ) : <span style={{ width: 36, flex: 'none' }} />}
                    </div>
                    {headerExtra ? <div className="cu-header-extra">{headerExtra}</div> : null}
                </div>

                <div ref={scrollRef} className="cu-scroll">{children}</div>
                {footer ? <div className="cu-footer">{footer}</div> : null}

                {subpanel && (
                    <div className="cu-subsheet">
                        <div className="cu-header-row" style={{ padding: '14px 16px 8px' }}>
                            <button type="button" className="cu-icon-btn" onClick={subpanel.onBack} aria-label="Volver"><ChevronLeft size={20} strokeWidth={2.4} /></button>
                            <div className="cu-header-title"><h2>{subpanel.title}</h2></div>
                            <button type="button" className="cu-primary-btn" onClick={subpanel.onBack}>{doneLabel}</button>
                        </div>
                        <div className="cu-scroll" style={{ paddingTop: 8 }}>{subpanel.children}</div>
                    </div>
                )}
            </motion.div>
            {overlays}
        </div>,
        document.body
    );
};

/* ── Wizard (creation by blocks) ─────────────────────────────────────────── */

export interface WizardStep {
    key: string;
    title: string;
    hint: string;
    icon: React.ReactNode;
    /** The "Siguiente" button is enabled only when the block is complete */
    valid: boolean;
    /** Short human reason shown above the button while the block is incomplete */
    missing?: string;
    content: React.ReactNode;
}

export interface WizardSheetProps {
    isOpen: boolean;
    onClose: () => void;
    accent: string;
    steps: WizardStep[];
    index: number;
    onIndex: (i: number) => void;
    onFinish: () => void;
    finishLabel: string;
    finishing?: boolean;
    /** Big glyph shown in the hero (trait icon) and the live name chip */
    glyph: React.ReactNode;
    name?: string;
    /** Shown above the button on the last block (reward preview) */
    lastExtra?: React.ReactNode;
    subpanel?: CupertinoSheetProps['subpanel'];
    overlays?: React.ReactNode;
    nextLabel?: string;
    backLabel?: string;
    doneLabel?: string;
    stepOf?: (i: number, n: number) => string;
    zIndex?: number;
    /** Which creator this is ('task' | 'habit' | 'project'): lets El Monitor follow the wizard step by step. */
    tourKind?: string;
}

export const WizardSheet: React.FC<WizardSheetProps> = ({
    isOpen, onClose, accent, steps, index, onIndex, onFinish, finishLabel, finishing, glyph, name, lastExtra, subpanel, overlays,
    nextLabel = 'Siguiente', backLabel = 'Atrás', doneLabel = 'Listo', stepOf = (i, n) => `Paso ${i + 1} de ${n}`, zIndex = 99999, tourKind,
}) => {
    const { visible, closing } = useSheetPresence(isOpen);
    useBodyLock(isOpen);
    const prevIndex = useRef(index);
    const dir = index >= prevIndex.current ? 'fwd' : 'back';
    useEffect(() => { prevIndex.current = index; }, [index]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (subpanel) subpanel.onBack();
            else if (index > 0) onIndex(index - 1);
            else onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, subpanel, index, onIndex, onClose]);

    if (typeof document === 'undefined' || !document.body || !visible) return null;

    const step = steps[Math.min(index, steps.length - 1)];
    const isLast = index >= steps.length - 1;
    const canAdvance = step.valid && !finishing;

    return createPortal(
        <div
            className="cu-root cu-wiz-layer"
            data-closing={closing || undefined}
            data-tour="wiz"
            data-wiz-kind={tourKind}
            data-wiz-step={step.key}
            data-wiz-index={index}
            data-wiz-valid={step.valid ? '1' : '0'}
            data-wiz-last={isLast ? '1' : '0'}
            data-wiz-sub={subpanel ? '1' : '0'}
            style={{ zIndex, pointerEvents: closing ? 'none' : 'auto', ['--cu-accent' as any]: accent }}
        >
            <div className="cu-wiz-top">
                <button
                    type="button"
                    className="cu-icon-btn"
                    onClick={() => (index > 0 ? onIndex(index - 1) : onClose())}
                    disabled={finishing}
                    aria-label={index > 0 ? backLabel : 'Cerrar'}
                >
                    {index > 0 ? <ChevronLeft size={20} strokeWidth={2.4} /> : <X size={18} strokeWidth={2.4} />}
                </button>
                <div className="cu-wiz-bars" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={index + 1}>
                    {steps.map((s, i) => (
                        <i key={s.key} className={cn(i < index && 'cu-done', i === index && 'cu-on')} />
                    ))}
                </div>
                <button type="button" className="cu-icon-btn" onClick={onClose} disabled={finishing} aria-label="Cerrar" style={{ visibility: index > 0 ? 'visible' : 'hidden' }}>
                    <X size={18} strokeWidth={2.4} />
                </button>
            </div>

            <div className="cu-wiz-hero" key={`hero-${index}`} data-dir={dir} data-tour="wiz-hero">
                <div className="cu-wiz-glyph">{glyph}</div>
                {name && index > 0 ? <span className="cu-wiz-chip">{name}</span> : null}
                <p className="cu-wiz-step">{stepOf(index, steps.length)}</p>
                <h2 className="cu-wiz-title">{step.title}</h2>
                <p className="cu-wiz-hint">{step.hint}</p>
            </div>

            <div className={cn('cu-wiz-panel', subpanel && 'cu-has-sub')}>
                <div className="cu-wiz-body" key={`body-${index}`} data-dir={dir} data-tour="wiz-body">{step.content}</div>

                <div className="cu-wiz-foot">
                    {isLast && lastExtra ? lastExtra : null}
                    {!step.valid && step.missing ? <p className="cu-hint" style={{ margin: 0 }}>{step.missing}</p> : null}
                    <button
                        type="button"
                        className="cu-cta"
                        data-tour="wiz-cta"
                        disabled={!canAdvance}
                        onClick={() => { if (isLast) onFinish(); else onIndex(index + 1); }}
                    >
                        {finishing ? <Loader2 size={20} className="animate-spin" /> : (isLast ? finishLabel : <>{nextLabel} <ChevronRight size={20} strokeWidth={2.6} /></>)}
                    </button>
                </div>

                {subpanel && (
                    <div className="cu-subsheet">
                        <div className="cu-header-row" style={{ padding: '14px 16px 8px' }}>
                            <button type="button" className="cu-icon-btn" onClick={subpanel.onBack} aria-label="Volver"><ChevronLeft size={20} strokeWidth={2.4} /></button>
                            <div className="cu-header-title"><h2>{subpanel.title}</h2></div>
                            <button type="button" className="cu-primary-btn" onClick={subpanel.onBack}>{doneLabel}</button>
                        </div>
                        <div className="cu-scroll" style={{ paddingTop: 8 }}>{subpanel.children}</div>
                    </div>
                )}
            </div>
            {overlays}
        </div>,
        document.body
    );
};

/* ── Tiles (compact one-page layout) ─────────────────────────────────────── */

export const Tiles: React.FC<{ cols?: 1 | 2 | 3 | 4; children: React.ReactNode }> = ({ cols = 3, children }) => (
    <div className="cu-tiles" style={{ ['--cols' as any]: cols }}>{children}</div>
);

export const Tile: React.FC<{
    icon: React.ReactNode; color?: string; label: React.ReactNode; value?: React.ReactNode; onClick?: () => void;
    span?: 2 | 3; active?: boolean; children?: React.ReactNode; disabled?: boolean; 'data-tour'?: string;
}> = ({ icon, color, label, value, onClick, span, active, children, disabled, ...rest }) => {
    const inner = (
        <>
            <span className="cu-tile-top">
                <span className="cu-tile-ico" style={color ? { background: color } : undefined}>{icon}</span>
                <span className="cu-tile-label">{label}</span>
            </span>
            {children ?? <span className="cu-tile-value">{value}</span>}
        </>
    );
    const cls = cn('cu-tile', span === 2 && 'cu-span-2', span === 3 && 'cu-span-3', active && 'cu-active');
    return onClick
        ? <button type="button" className={cls} onClick={onClick} disabled={disabled} {...rest}>{inner}</button>
        : <div className={cls} {...rest}>{inner}</div>;
};

/** Level bars used as a tile body (tap the tile to cycle) */
export const MiniMeter: React.FC<{ value: number; levels?: number; colors: string[] }> = ({ value, levels = 4, colors }) => (
    <span className="cu-minimeter">
        {Array.from({ length: levels }, (_, i) => (
            <i key={i} style={i < value ? { background: colors[value - 1], boxShadow: `0 0 8px -1px ${colors[value - 1]}` } : undefined} />
        ))}
    </span>
);

/* ── Layout ──────────────────────────────────────────────────────────────── */

export const Stack: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={cn('cu-stack', className)}>{children}</div>
);

export const Section: React.FC<{ label?: React.ReactNode; footer?: React.ReactNode; children: React.ReactNode; className?: string; id?: string }> = ({ label, footer, children, className, id }) => (
    <section className={cn('cu-section', className)} id={id}>
        {label ? <h3 className="cu-section-label">{label}</h3> : null}
        <div className="cu-group">{children}</div>
        {footer ? <p className="cu-section-footer">{footer}</p> : null}
    </section>
);

/** Heading + free-form content (no grouped background) */
export const Plain: React.FC<{ label?: React.ReactNode; footer?: React.ReactNode; children: React.ReactNode }> = ({ label, footer, children }) => (
    <section className="cu-section">
        {label ? <h3 className="cu-section-label">{label}</h3> : null}
        {children}
        {footer ? <p className="cu-section-footer">{footer}</p> : null}
    </section>
);

export const Pad: React.FC<{ children: React.ReactNode; small?: boolean; className?: string }> = ({ children, small, className }) => (
    <div className={cn(small ? 'cu-pad-sm' : 'cu-pad', className)}>{children}</div>
);

export const Hero: React.FC<{
    tile: React.ReactNode; tileColor: string; value: string; onChange: (v: string) => void;
    placeholder?: string; maxLength?: number; autoFocus?: boolean;
    /** Sits beside the title (e.g. the "Activar super hábito" button). */
    trailing?: React.ReactNode;
}> = ({ tile, tileColor, value, onChange, placeholder, maxLength, autoFocus, trailing }) => (
    <div className={`cu-hero${trailing ? ' sh-hero' : ''}`}>
        <div className="cu-hero-tile" style={{ background: `linear-gradient(145deg, ${tileColor}, color-mix(in srgb, ${tileColor} 70%, #000))`, ['--cu-tile' as any]: tileColor }}>
            {tile}
        </div>
        <input
            className="cu-hero-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            autoFocus={autoFocus}
            aria-label={placeholder}
        />
        {maxLength && !trailing ? <span className="cu-counter">{value.length}/{maxLength}</span> : null}
        {trailing}
    </div>
);

/* ── Row ─────────────────────────────────────────────────────────────────── */

export interface RowProps {
    icon?: React.ReactNode;
    iconColor?: string;
    label?: React.ReactNode;
    sub?: React.ReactNode;
    value?: React.ReactNode;
    onClick?: () => void;
    /** Show a chevron; "open" rotates it */
    chevron?: boolean;
    open?: boolean;
    trailing?: React.ReactNode;
    selected?: boolean;
    danger?: boolean;
    disabled?: boolean;
    className?: string;
    children?: React.ReactNode;
    'data-tour'?: string;
}

export const Row: React.FC<RowProps> = ({
    icon, iconColor, label, sub, value, onClick, chevron, open, trailing, selected, danger, disabled, className, children, ...rest
}) => {
    const body = (
        <>
            {icon ? <span className="cu-row-tile" style={iconColor ? { background: iconColor } : undefined}>{icon}</span> : null}
            {children ?? (
                <span className="cu-row-main">
                    {label ? <span className="cu-row-label">{label}</span> : null}
                    {sub ? <span className="cu-row-sub">{sub}</span> : null}
                </span>
            )}
            {value !== undefined && value !== null ? <span className="cu-row-value">{value}</span> : null}
            {trailing}
            {selected ? <Check size={18} strokeWidth={2.8} className="cu-check" /> : null}
            {chevron ? <ChevronRight size={18} className={cn('cu-chevron', open && 'cu-open')} /> : null}
        </>
    );
    const cls = cn('cu-row', danger && 'cu-danger', className);
    if (onClick) {
        return <button type="button" className={cls} onClick={onClick} disabled={disabled} aria-expanded={open} {...rest}>{body}</button>;
    }
    return <div className={cls} {...rest}>{body}</div>;
};

/** Row hosting a text input */
export const InputRow: React.FC<{
    icon?: React.ReactNode; iconColor?: string; value: string; onChange: (v: string) => void;
    placeholder?: string; type?: string; right?: boolean; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
    maxLength?: number; onEnter?: () => void; trailing?: React.ReactNode; label?: React.ReactNode; min?: number; max?: number;
    autoFocus?: boolean; ariaLabel?: string; suffix?: React.ReactNode; disabled?: boolean;
}> = ({ icon, iconColor, value, onChange, placeholder, type = 'text', right, inputMode, maxLength, onEnter, trailing, label, min, max, autoFocus, ariaLabel, suffix, disabled }) => (
    <div className="cu-row">
        {icon ? <span className="cu-row-tile" style={iconColor ? { background: iconColor } : undefined}>{icon}</span> : null}
        {label ? <span className="cu-row-label" style={{ flex: right ? 'none' : undefined }}>{label}</span> : null}
        <input
            className={cn('cu-input', right && 'cu-right', type === 'number' && 'cu-num')}
            type={type}
            value={value}
            placeholder={placeholder}
            inputMode={inputMode}
            maxLength={maxLength}
            min={min}
            max={max}
            autoFocus={autoFocus}
            disabled={disabled}
            aria-label={ariaLabel ?? (typeof label === 'string' ? label : placeholder)}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter(); } }}
        />
        {suffix ? <span className="cu-row-value" style={{ maxWidth: 'none' }}>{suffix}</span> : null}
        {trailing}
    </div>
);

/** Animated height disclosure — sits as a direct child of a Section/group */
export const Expand: React.FC<{ open: boolean; children: React.ReactNode }> = ({ open, children }) => {
    const reduce = useReducedMotion();
    return (
        <AnimatePresence initial={false}>
            {open && (
                <motion.div
                    key="cu-expand"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
                    style={{ overflow: 'hidden' }}
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

/* ── Controls ────────────────────────────────────────────────────────────── */

export interface SegmentedOption<T> { value: T; label: React.ReactNode; icon?: React.ReactNode; dataTour?: string; }

export function Segmented<T extends string | number>({ options, value, onChange, tall, accentThumb, className }: {
    options: SegmentedOption<T>[]; value: T; onChange: (v: T) => void; tall?: boolean; accentThumb?: boolean; className?: string;
}) {
    const id = useId();
    return (
        <div className={cn('cu-seg', tall && 'cu-tall', accentThumb && 'cu-accent', className)} role="tablist">
            {options.map((o) => {
                const on = o.value === value;
                return (
                    <button
                        key={String(o.value)}
                        type="button"
                        role="tab"
                        aria-selected={on}
                        data-tour={o.dataTour}
                        className={cn('cu-seg-btn', on && 'cu-on')}
                        onClick={() => onChange(o.value)}
                    >
                        {on && <motion.span layoutId={`cu-seg-${id}`} className="cu-seg-thumb" transition={{ type: 'spring', stiffness: 520, damping: 40 }} />}
                        {o.icon}
                        <span>{o.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

export const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label?: string; color?: string }> = ({ checked, onChange, label, color }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className="cu-switch"
        style={color ? ({ ['--cu-switch-on' as any]: color }) : undefined}
        onClick={() => onChange(!checked)}
    />
);

export const Stepper: React.FC<{ value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; label?: string }> = ({ value, onChange, min = 0, max = 999, step = 1, label }) => (
    <div className="cu-stepper" role="group" aria-label={label}>
        <button type="button" aria-label="−" disabled={value <= min} onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}><Minus size={16} strokeWidth={2.6} /></button>
        <i />
        <button type="button" aria-label="+" disabled={value >= max} onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))}><Plus size={16} strokeWidth={2.6} /></button>
    </div>
);

/** Large centred value with round − / + buttons (durations, goals) */
export const BigStepper: React.FC<{
    value: number | string; unit?: React.ReactNode; onMinus: () => void; onPlus: () => void; minusDisabled?: boolean; plusDisabled?: boolean;
}> = ({ value, unit, onMinus, onPlus, minusDisabled, plusDisabled }) => (
    <div className="cu-bigvalue">
        <button type="button" className="cu-round-step" onClick={onMinus} disabled={minusDisabled} aria-label="−"><Minus size={20} strokeWidth={2.6} /></button>
        <div style={{ textAlign: 'center', minWidth: 0 }}>
            <span className="cu-bigvalue-num">{value}</span>
            {unit ? <span className="cu-bigvalue-unit">{unit}</span> : null}
        </div>
        <button type="button" className="cu-round-step" onClick={onPlus} disabled={plusDisabled} aria-label="+"><Plus size={20} strokeWidth={2.6} /></button>
    </div>
);

export const Chip: React.FC<{ on?: boolean; soft?: boolean; onClick?: () => void; children: React.ReactNode; color?: string }> = ({ on, soft, onClick, children, color }) => (
    <button
        type="button"
        className={cn('cu-chip', on && 'cu-on', soft && 'cu-soft')}
        style={color ? ({ ['--cu-accent' as any]: color }) : undefined}
        onClick={onClick}
        aria-pressed={on}
    >
        {children}
    </button>
);

export const DayPicker: React.FC<{ days: { label: string; index: number }[]; selected: number[]; onToggle: (i: number) => void; dimmed?: boolean }> = ({ days, selected, onToggle, dimmed }) => (
    <div className="cu-days" style={dimmed ? { opacity: 0.35, pointerEvents: 'none' } : undefined}>
        {days.map(({ label, index }) => (
            <button key={index} type="button" className={cn('cu-day', selected.includes(index) && 'cu-on')} onClick={() => onToggle(index)} aria-pressed={selected.includes(index)}>
                {label}
            </button>
        ))}
    </div>
);

export const DateNumberGrid: React.FC<{ count?: number; selected: number[]; onToggle: (n: number) => void }> = ({ count = 31, selected, onToggle }) => (
    <div className="cu-day-grid">
        {Array.from({ length: count }, (_, i) => i + 1).map((d) => (
            <button key={d} type="button" className={cn('cu-day', selected.includes(d) && 'cu-on')} onClick={() => onToggle(d)} aria-pressed={selected.includes(d)}>
                {d}
            </button>
        ))}
    </div>
);

export const Swatches: React.FC<{ colors: string[]; value?: string; onChange: (c: string) => void }> = ({ colors, value, onChange }) => (
    <div className="cu-swatches">
        {colors.map((c) => (
            <button key={c} type="button" className={cn('cu-swatch', value === c && 'cu-on')} style={{ background: c }} onClick={() => onChange(c)} aria-label={c} aria-pressed={value === c} />
        ))}
    </div>
);

export const LevelMeter: React.FC<{ value: number; onChange: (v: number) => void; colors?: string[]; levels?: number }> = ({
    value, onChange, levels = 4, colors = ['#30d158', '#0a84ff', '#ff9f0a', '#ff453a'],
}) => (
    <div className="cu-meter" role="radiogroup">
        {Array.from({ length: levels }, (_, i) => i + 1).map((lvl) => (
            <button
                key={lvl}
                type="button"
                role="radio"
                aria-checked={value === lvl}
                aria-label={String(lvl)}
                className={cn('cu-meter-bar', value >= lvl && 'cu-on')}
                style={{ ['--bar' as any]: colors[Math.min(value, levels) - 1] ?? colors[0] }}
                onClick={() => onChange(lvl)}
            />
        ))}
    </div>
);

/* ── Feedback ────────────────────────────────────────────────────────────── */

export const Notice: React.FC<{
    tone?: 'warn' | 'danger' | 'info' | 'good'; icon?: React.ReactNode; children: React.ReactNode; action?: string; onClick?: () => void;
}> = ({ tone = 'info', icon, children, action, onClick }) => {
    const color = { warn: '#ffd60a', danger: '#ff453a', info: '#0a84ff', good: '#30d158' }[tone];
    const content = (<>{icon}<span>{children}</span>{action ? <b>{action}</b> : null}</>);
    return onClick
        ? <button type="button" className="cu-notice" style={{ ['--tone' as any]: color }} onClick={onClick}>{content}</button>
        : <div className="cu-notice" style={{ ['--tone' as any]: color }}>{content}</div>;
};

export const RewardPreview: React.FC<{
    xp: number; traitXp: number; coins: number; traitColor: string; TraitIcon: React.ElementType; traitLabel: string; bonus?: boolean;
    xpLabel?: string; goldLabel?: string;
}> = ({ xp, traitXp, coins, traitColor, TraitIcon, traitLabel, bonus, xpLabel = 'XP', goldLabel = 'Oro' }) => (
    <div className="cu-reward" aria-label="Recompensa estimada">
        <span className="cu-reward-item"><strong>{xp}</strong><span>{xpLabel}</span></span>
        <i className="cu-reward-sep" />
        <span className="cu-reward-item">
            <TraitIcon size={14} style={{ color: traitColor }} />
            <strong style={{ color: traitColor }}>+{traitXp}</strong>
            <span>{typeof traitLabel === 'string' ? traitLabel.slice(0, 4) : ''}</span>
        </span>
        <i className="cu-reward-sep" />
        <span className="cu-reward-item"><strong style={{ color: '#ffd60a' }}>{coins}</strong><span>{goldLabel}</span></span>
        {bonus ? <span className="cu-reward-bonus">+20%</span> : null}
    </div>
);

export const Hint: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className="cu-hint">{children}</p>;

export const SheetSkeleton: React.FC = () => (
    <div className="cu-stack" aria-hidden>
        <div className="cu-skel" style={{ height: 60 }} />
        <div className="cu-skel" style={{ height: 150 }} />
        <div className="cu-skel" style={{ height: 110 }} />
        <div className="cu-skel" style={{ height: 150 }} />
    </div>
);

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/** Resolve a trait (Attribute) icon from a lucide registry, falling back to its own `icon` field */
export const resolveTraitIcon = (attr: any, registry?: Record<string, any> | null, fallback?: React.ElementType): React.ElementType => {
    if (attr) {
        const name = attr.iconName as string | undefined;
        if (name && registry && registry[name]) return registry[name];
        const icon = attr.icon;
        if (icon) {
            if (typeof icon === 'function') return icon;
            if (typeof icon === 'object' && '$$typeof' in icon) return icon;
        }
    }
    return (fallback ?? (() => null)) as React.ElementType;
};

type TFn = (...args: any[]) => any;

export const traitLabelOf = (attr: any, t: TFn): string => {
    if (!attr?.label) return '';
    return String(t(attr.label, typeof attr.label === 'string' ? attr.label.replace('traits.', '') : ''));
};

/** Grid of traits to pick from (rendered inside an <Expand/> in a group) */
export const TraitGrid: React.FC<{
    attributes: any[]; value: string; onPick: (id: string) => void; registry?: Record<string, any> | null;
    fallbackIcon: React.ElementType; t: TFn;
}> = ({ attributes, value, onPick, registry, fallbackIcon, t }) => (
    <div className="cu-trait-grid">
        {(Array.isArray(attributes) ? attributes : []).filter(Boolean).map((attr) => {
            const Icon = resolveTraitIcon(attr, registry, fallbackIcon);
            const on = value === attr.id;
            return (
                <button
                    key={attr.id}
                    type="button"
                    className={cn('cu-trait', on && 'cu-on')}
                    style={{ ['--cu-trait' as any]: attr.color }}
                    onClick={() => onPick(attr.id)}
                    aria-pressed={on}
                >
                    <span className="cu-trait-ico"><Icon size={20} style={{ color: attr.color }} /></span>
                    <span className="cu-trait-name">{traitLabelOf(attr, t)}</span>
                </button>
            );
        })}
    </div>
);

/** Generic single-choice list rendered as rows with a check mark */
export function OptionList<T extends string>({ options, value, onPick }: {
    options: { id: T; title: React.ReactNode; sub?: React.ReactNode; color?: string; icon?: React.ReactNode }[];
    value: T; onPick: (id: T) => void;
}) {
    return (
        <>
            {options.map((o) => (
                <Row
                    key={o.id}
                    className="cu-option"
                    icon={o.icon}
                    iconColor={o.color}
                    label={o.title}
                    sub={o.sub}
                    selected={value === o.id}
                    onClick={() => onPick(o.id)}
                />
            ))}
        </>
    );
}
