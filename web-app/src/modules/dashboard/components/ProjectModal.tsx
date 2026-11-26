import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Briefcase, Target, Hourglass, Bell, Calendar, Calculator, Zap, FileText, Plus, Trash2, Sparkles, Timer, AlertCircle, Palette } from 'lucide-react';
import * as LucideIcons from '@/utils/lucideRegistry';
import { Attribute, Project } from '../../../types';
import { SmartProject } from '../../../types/SmartGoal';
import { calculateTaskRewards } from '../../../utils/rewardCalculator';
import { getWeekStartDay } from '../../../utils/dateUtils';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../../../hooks/usePermissions';
import { TimePicker } from '../../../components/ui/TimePicker';
import { ColorPicker } from './ColorPicker';
import {
    CupertinoSheet, Stack, Section, Hero, Row, InputRow, Segmented, Toggle, Stepper, BigStepper, Chip, DayPicker,
    DateNumberGrid, Notice, RewardPreview, Hint, Pad, TraitGrid, Tiles, Tile, MiniMeter, WizardSheet, resolveTraitIcon, traitLabelOf,
    type WizardStep,
} from '../../../components/cupertino';

type Panel = null | 'trait' | 'color' | 'monthly' | 'pomo' | 'smart';
type RoutineStep = { id: string; type: 'FOCUS' | 'BREAK'; duration: number; subAttribute?: string };

const IMPACT_COLORS = ['#30d158', '#0a84ff', '#ff453a', '#ffd60a'];

export const ProjectModal = React.memo(({ isOpen, onClose, attributes = [], smartProjects, onConfirm, onDelete, initialData }: { isOpen: boolean, onClose: () => void, attributes?: Attribute[], smartProjects?: SmartProject[], onConfirm: (data: Partial<Project>) => Promise<void> | void, onDelete?: (projectId: string) => void, initialData?: Partial<Project> }) => {
    const { t } = useTranslation();
    const { permissions, requestPermissions, openSystemSettings } = usePermissions();
    const [panel, setPanel] = useState<Panel>(null);
    const [step, setStep] = useState(0);

    // Identity
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [attrId, setAttrId] = useState('DISCIPLINA');
    const [customColor, setCustomColor] = useState<string | undefined>(undefined);
    const [smartProjectId, setSmartProjectId] = useState('');

    // Goal
    const [goalTarget, setGoalTarget] = useState(1);
    const [goalUnit, setGoalUnit] = useState<'HOURS' | 'MINUTES'>('HOURS');
    const [goalFreq, setGoalFreq] = useState('DAILY');
    const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default
    const [monthlyType, setMonthlyType] = useState<'SPECIFIC_DATES' | 'FLEXIBLE_COUNT'>('SPECIFIC_DATES');
    const [monthlyFlexibleCount, setMonthlyFlexibleCount] = useState<number | string>(10);
    const [monthlyLastDay, setMonthlyLastDay] = useState(false);

    // Focus session
    const [pomoDuration, setPomoDuration] = useState<number | string>(25);
    const [reminder, setReminder] = useState('');
    const [impact, setImpact] = useState(1);
    const [focusRoutine, setFocusRoutine] = useState<RoutineStep[]>([]);
    const [focusRoutineDays, setFocusRoutineDays] = useState<number[]>([]);
    const [showAdvancedPomo, setShowAdvancedPomo] = useState(false);
    const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
    const [timelineFocusDuration, setTimelineFocusDuration] = useState<number>(25);
    const [timelineBreakDuration, setTimelineBreakDuration] = useState<number>(5);
    const [timelineStepType, setTimelineStepType] = useState<'FOCUS' | 'BREAK'>('FOCUS');
    const [timelineSubTrait, setTimelineSubTrait] = useState<string | undefined>(undefined);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Reset or populate the form on open
    useEffect(() => {
        if (!isOpen) return;
        setPanel(null);
        setStep(0);
        setIsSubmitting(false);
        setSelectedStepId(null);
        if (initialData) {
            setTitle(initialData.title || '');
            setDesc(initialData.description || '');
            setAttrId(initialData.attribute || '');
            setCustomColor(initialData.color);
            setSmartProjectId(initialData.smartProjectId || '');

            // Frequency restoration
            const freq = initialData.uiFrequency || initialData.goalFrequency || 'DAILY';
            setGoalFreq(freq);
            if (initialData.monthlyType) setMonthlyType(initialData.monthlyType);
            if (initialData.monthlyFlexibleCount) setMonthlyFlexibleCount(initialData.monthlyFlexibleCount);
            if (initialData.monthlyLastDay) setMonthlyLastDay(initialData.monthlyLastDay);

            // Target restoration
            if (initialData.uiTarget) {
                setGoalTarget(initialData.uiTarget);
                setGoalUnit(initialData.uiUnit || 'HOURS');
            } else if (initialData.goalTarget) {
                // Legacy projects: rebuild the UI value from the stored daily minutes
                const days = initialData.workingDays?.length || 5;
                if (freq === 'WEEKLY') setGoalTarget(Math.round((initialData.goalTarget * days) / 60));
                else if (freq === 'MONTHLY') setGoalTarget(Math.round((initialData.goalTarget * (initialData.workingDays?.length || 20)) / 60));
                else setGoalTarget(Math.round(initialData.goalTarget / 60));
                setGoalUnit('HOURS');
            } else {
                setGoalTarget(1);
                setGoalUnit('HOURS');
            }

            setPomoDuration(initialData.pomoDuration || 25);
            setReminder(initialData.reminder || '');
            setImpact(initialData.impact || 1);
            if (initialData.workingDays) setWorkingDays(initialData.workingDays);
            setFocusRoutine((initialData.focusRoutine as RoutineStep[]) || []);
            setFocusRoutineDays(initialData.focusRoutineDays || []);
            setShowAdvancedPomo(!!(initialData.focusRoutine && initialData.focusRoutine.length > 0));
        } else {
            setTitle('');
            setDesc('');
            setAttrId('DISCIPLINA');
            setCustomColor(undefined);
            setSmartProjectId('');
            setGoalTarget(1);
            setGoalUnit('HOURS');
            setGoalFreq('DAILY');
            setWorkingDays([1, 2, 3, 4, 5]);
            setMonthlyType('SPECIFIC_DATES');
            setMonthlyFlexibleCount(10);
            setMonthlyLastDay(false);
            setPomoDuration(25);
            setReminder('');
            setImpact(1);
            setFocusRoutine([]);
            setFocusRoutineDays([]);
            setShowAdvancedPomo(false);
            scrollRef.current?.scrollTo({ top: 0 });
        }
    }, [isOpen, initialData]);

    const registry = LucideIcons as unknown as Record<string, React.ElementType>;
    const selectedAttr = attributes?.find((a) => a.id === attrId);
    const subTraits = selectedAttr?.subTraits || [];
    const activeColor = customColor || (selectedAttr ? selectedAttr.color : '#0a84ff');
    const SelectedIcon = useMemo(() => resolveTraitIcon(selectedAttr, registry, Briefcase), [selectedAttr, registry]);
    const activeLabel = selectedAttr ? traitLabelOf(selectedAttr, t) : t('modals.project.traitDefault', 'Trait');

    // Daily goal derived from the weekly / monthly target
    const calculatedDailyGoal = useMemo(() => {
        const valueInHours = goalUnit === 'MINUTES' ? goalTarget / 60 : goalTarget;
        if (goalFreq === 'DAILY') return valueInHours;
        let daily = valueInHours;
        if (goalFreq === 'WEEKLY') {
            daily = valueInHours / (workingDays.length || 1);
        } else if (goalFreq === 'MONTHLY') {
            if (monthlyType === 'SPECIFIC_DATES') {
                // Each marked day is one working day; "last day" counts as an extra one
                const count = workingDays.length + (monthlyLastDay && !workingDays.includes(31) ? 1 : 0);
                daily = valueInHours / (count || 1);
            } else {
                daily = valueInHours / Number(monthlyFlexibleCount);
            }
        }
        return Math.round(daily * 100) / 100;
    }, [goalTarget, goalFreq, workingDays, goalUnit, monthlyType, monthlyFlexibleCount, monthlyLastDay]);

    const prediction = useMemo(
        () => calculateTaskRewards(calculatedDailyGoal * 60, impact, 0, 'PROJECT'),
        [calculatedDailyGoal, impact]
    );

    const toggleDay = (dayIndex: number) => {
        setWorkingDays(prev => prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex].sort((a, b) => a - b));
    };

    const daysRawResult = t('modals.project.daysInitials', { returnObjects: true });
    const DAYS_RAW = Array.isArray(daysRawResult) ? daysRawResult : ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    const weekStart = getWeekStartDay();
    const DAYS = useMemo(() => (
        weekStart === 1
            ? [...DAYS_RAW.slice(1).map((l, i) => ({ label: l, index: i + 1 })), { label: DAYS_RAW[0], index: 0 }]
            : DAYS_RAW.map((l, i) => ({ label: l, index: i }))
    ), [DAYS_RAW, weekStart]);

    // ── Validation ────────────────────────────────────────────────────────────
    const hasName = title.trim() !== '';
    const hasTrait = attrId !== '';
    const goalOk = (() => {
        if (goalTarget <= 0) return false;
        if (goalFreq === 'DAILY') return true;
        if (goalFreq === 'WEEKLY') return workingDays.length > 0;
        if (goalFreq === 'MONTHLY') {
            if (monthlyType === 'SPECIFIC_DATES') return workingDays.length > 0 || monthlyLastDay;
            return Number(monthlyFlexibleCount) > 0;
        }
        return false;
    })();
    const sessionOk = typeof pomoDuration === 'number' && pomoDuration > 0;
    // Editing: alarm optional. Creating: alarm required.
    const alarmOk = !!initialData?.id ? true : reminder !== '';
    const canSubmit = hasName && hasTrait && goalOk && sessionOk && alarmOk && !isSubmitting;

    const missing: string[] = [];
    if (!hasName) missing.push(t('cu.missing.name', 'nombre'));
    if (!hasTrait) missing.push(t('cu.missing.trait', 'rasgo'));
    if (!goalOk) missing.push(t('cu.missing.goal', 'meta'));
    if (!sessionOk) missing.push(t('cu.missing.session', 'duración de sesión'));
    if (!alarmOk) missing.push(t('cu.missing.alarm', 'alarma'));

    const handleConfirm = async () => {
        if (!canSubmit) return;
        setIsSubmitting(true);
        try {
            const isUpdate = !!initialData?.id;
            await onConfirm({
                id: isUpdate ? initialData!.id : undefined,
                title,
                description: desc,
                attribute: attrId,
                color: customColor,
                goalTarget: calculatedDailyGoal * 60, // saved as minutes (user inputs hours)
                goalFrequency: 'DAILY', // always DAILY so the tracker works per day
                uiFrequency: goalFreq, // UI preference
                uiTarget: goalTarget, // UI input
                uiUnit: goalUnit, // UI unit
                monthlyType: goalFreq === 'MONTHLY' ? monthlyType : undefined,
                monthlyFlexibleCount: goalFreq === 'MONTHLY' && monthlyType === 'FLEXIBLE_COUNT' ? (typeof monthlyFlexibleCount === 'number' ? monthlyFlexibleCount : parseInt(monthlyFlexibleCount) || 1) : undefined,
                pomoDuration: typeof pomoDuration === 'number' ? pomoDuration : parseInt(pomoDuration) || 25,
                breakDuration: 5,
                reminder,
                impact,
                workingDays: goalFreq === 'DAILY' ? undefined : workingDays,
                smartProjectId: smartProjectId || undefined,
                focusRoutine,
                focusRoutineDays
            });
            onClose();
        } catch (error) {
            console.error('Failed to create project:', error);
            setIsSubmitting(false);
        }
    };

    // ── Advanced pomodoro timeline helpers ───────────────────────────────────
    const currentStepMinutes = timelineStepType === 'FOCUS' ? timelineFocusDuration : timelineBreakDuration;
    const setCurrentStepMinutes = (v: number) => {
        const clamped = Math.max(1, Math.min(180, v));
        if (timelineStepType === 'FOCUS') setTimelineFocusDuration(clamped);
        else setTimelineBreakDuration(clamped);
    };
    const selectStep = (step: RoutineStep) => {
        if (selectedStepId === step.id) { setSelectedStepId(null); return; }
        setSelectedStepId(step.id);
        if (step.type === 'FOCUS') setTimelineFocusDuration(step.duration);
        else setTimelineBreakDuration(step.duration);
        setTimelineStepType(step.type);
        setTimelineSubTrait(step.subAttribute);
    };
    const insertAfter = (idx: number) => {
        const step = focusRoutine[idx];
        const nextType = step.type === 'FOCUS' ? 'BREAK' : 'FOCUS';
        const inserted: RoutineStep = { id: Math.random().toString(), type: nextType, duration: nextType === 'FOCUS' ? timelineFocusDuration : timelineBreakDuration };
        const next = [...focusRoutine];
        next.splice(idx + 1, 0, inserted);
        setFocusRoutine(next);
    };
    const saveStep = () => {
        const subAttribute = timelineStepType === 'FOCUS' ? timelineSubTrait : undefined;
        if (selectedStepId) {
            setFocusRoutine(focusRoutine.map(s => s.id === selectedStepId ? { ...s, type: timelineStepType, duration: currentStepMinutes, subAttribute } : s));
            setSelectedStepId(null);
        } else {
            setFocusRoutine([...focusRoutine, { id: Math.random().toString(), type: timelineStepType, duration: currentStepMinutes, subAttribute }]);
            setTimelineSubTrait(undefined);
        }
    };
    const routineTotal = focusRoutine.reduce((sum, s) => sum + s.duration, 0);

    const isEditing = !!initialData;
    const linkedSmart = smartProjects?.find(p => p.id === smartProjectId);
    const unitLabel = goalUnit === 'HOURS' ? t('modals.project.hrs', 'HRS') : 'MIN';
    const perLabel = goalFreq === 'DAILY' ? t('modals.project.day') : goalFreq === 'WEEKLY' ? t('modals.project.week') : t('modals.project.month');
    const pomoPresets = [25, 45, 60];
    const hasSmart = !!(smartProjects && smartProjects.length > 0);
    const monthlySummary = monthlyType === 'FLEXIBLE_COUNT'
        ? t('cu.timesN', { defaultValue: '{{n}} veces', n: monthlyFlexibleCount })
        : [...workingDays].sort((a, b) => a - b).join(', ') + (monthlyLastDay ? (workingDays.length ? ' + ' : '') + t('cu.lastDayShort', 'último') : '');

    // ── Detail panels: open inside the sheet so the main page never scrolls ──
    const panelTitle: Record<Exclude<Panel, null>, string> = {
        trait: t('cu.trait', 'Rasgo'),
        color: t('cu.color', 'Color'),
        monthly: t('cu.monthDays', 'Días del mes'),
        pomo: t('modals.project.pomodoro', 'Sesión de enfoque'),
        smart: t('cu.strategy', 'Estrategia'),
    };

    const pomoPanel = (
        <Stack className="cu-tight">
            <Section footer={t('cu.pomoHint', 'Duración de cada bloque de enfoque en minutos.')}>
                <Pad>
                    <div className="cu-chips" style={{ justifyContent: 'center' }}>
                        {pomoPresets.map(p => (
                            <Chip key={p} on={pomoDuration === p} onClick={() => setPomoDuration(p)}>{p} min</Chip>
                        ))}
                    </div>
                </Pad>
                <InputRow
                    icon={<Timer size={17} />}
                    iconColor="#ff9f0a"
                    label={t('modals.project.custom', 'Personalizado')}
                    type="number" right inputMode="numeric" suffix="min"
                    value={String(pomoDuration)}
                    onChange={(v) => setPomoDuration(v === '' ? '' : (parseInt(v) || 25))}
                    onEnter={() => pomoDuration === '' && setPomoDuration(25)}
                />
                <Row
                    icon={<Sparkles size={17} />}
                    iconColor="#5e5ce6"
                    label={t('cu.advancedPomo', 'Pomodoro avanzado')}
                    sub={focusRoutine.length ? t('cu.stepsTotal', { defaultValue: '{{n}} pasos · {{m}} min', n: focusRoutine.length, m: routineTotal }) : t('cu.advancedPomoHint', 'Diseña tu propia rutina de enfoque y descansos')}
                    trailing={<Toggle checked={showAdvancedPomo} onChange={setShowAdvancedPomo} label={t('cu.advancedPomo', 'Pomodoro avanzado')} />}
                />
            </Section>

            {showAdvancedPomo && (
                <Section>
                    {focusRoutine.map((step, idx) => {
                        const isFocus = step.type === 'FOCUS';
                        const subName = step.subAttribute ? subTraits.find(st => st.id === step.subAttribute)?.name : null;
                        const selected = selectedStepId === step.id;
                        return (
                            <div key={step.id} className="cu-row" style={{ padding: '4px 8px 4px 16px', background: selected ? 'color-mix(in srgb, var(--cu-accent) 16%, transparent)' : undefined }}>
                                <button type="button" onClick={() => selectStep(step)} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, background: 'transparent', border: 0, padding: '8px 0', color: 'inherit', textAlign: 'left' }}>
                                    <span className="cu-dot" style={{ width: 12, height: 12, background: isFocus ? '#0a84ff' : '#ff9f0a' }} />
                                    <span className="cu-row-main">
                                        <span className="cu-row-label" style={{ fontSize: 16 }}>{step.duration} min · {isFocus ? t('cu.focus', 'Enfoque') : t('cu.break', 'Descanso')}</span>
                                        {subName ? <span className="cu-row-sub">{subName}</span> : null}
                                    </span>
                                </button>
                                {idx < focusRoutine.length - 1 && (
                                    <button type="button" className="cu-mini cu-on" onClick={() => insertAfter(idx)} aria-label={t('cu.insertStep', 'Insertar paso')}><Plus size={16} strokeWidth={2.6} /></button>
                                )}
                                <button type="button" className="cu-mini cu-del" onClick={() => { setFocusRoutine(focusRoutine.filter(s => s.id !== step.id)); if (selected) setSelectedStepId(null); }} aria-label={t('common.delete', 'Eliminar')}><Trash2 size={16} /></button>
                            </div>
                        );
                    })}

                    <div className="cu-subpanel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div className="cu-section-label" style={{ padding: 0 }}>
                            {selectedStepId ? t('cu.editStep', 'Editar paso') : t('cu.newStep', 'Nuevo paso')}
                        </div>
                        <Segmented<'FOCUS' | 'BREAK'>
                            value={timelineStepType}
                            onChange={setTimelineStepType}
                            options={[{ value: 'FOCUS', label: t('cu.focus', 'Enfoque') }, { value: 'BREAK', label: t('cu.break', 'Descanso') }]}
                        />
                        {timelineStepType === 'FOCUS' && subTraits.length > 0 && (
                            <div className="cu-chips">
                                <Chip soft on={timelineSubTrait === undefined} onClick={() => setTimelineSubTrait(undefined)}>{t('cu.mainTrait', 'Principal')}</Chip>
                                {subTraits.map(st => (
                                    <Chip key={st.id} soft on={timelineSubTrait === st.id} onClick={() => setTimelineSubTrait(st.id)}>{st.name}</Chip>
                                ))}
                            </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <input
                                className="cu-input cu-num"
                                type="number"
                                inputMode="numeric"
                                style={{ fontSize: 22, fontWeight: 700 }}
                                value={currentStepMinutes}
                                onChange={(e) => setCurrentStepMinutes(parseInt(e.target.value) || 1)}
                                aria-label="min"
                            />
                            <span className="cu-row-sub" style={{ flex: 'none' }}>min</span>
                            <Stepper value={currentStepMinutes} min={1} max={180} onChange={setCurrentStepMinutes} label="min" />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" className="cu-primary-btn cu-block" style={{ height: 44, fontSize: 16 }} onClick={saveStep}>
                                {selectedStepId ? t('cu.saveStep', 'Guardar paso') : t('cu.addStep', 'Agregar paso')}
                            </button>
                            {selectedStepId && (
                                <button type="button" className="cu-danger-btn" style={{ width: 'auto', height: 44, padding: '0 16px', fontSize: 16, color: 'var(--cu-label)' }} onClick={() => setSelectedStepId(null)}>
                                    {t('common.cancel', 'Cancelar')}
                                </button>
                            )}
                        </div>
                        {focusRoutine.length > 0 && (
                            <button type="button" className="cu-link" style={{ color: 'var(--cu-red)' }} onClick={() => { setFocusRoutine([]); setSelectedStepId(null); }}>
                                <Trash2 size={14} /> {t('cu.clearRoutine', 'Borrar rutina')}
                            </button>
                        )}
                    </div>

                    <Pad>
                        <div className="cu-section-label" style={{ padding: '0 0 10px' }}>{t('cu.routineDays', 'Días activos de la rutina')}</div>
                        <DayPicker
                            days={DAYS}
                            selected={focusRoutineDays}
                            onToggle={(i) => setFocusRoutineDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i].sort((a, b) => a - b))}
                        />
                    </Pad>
                </Section>
            )}
        </Stack>
    );

    const panelBody = panel === 'trait' ? (
        <div className="cu-group">
            <TraitGrid
                attributes={attributes}
                value={attrId}
                registry={registry}
                fallbackIcon={Target}
                t={t}
                onPick={(id) => { setAttrId(id); setPanel(null); }}
            />
        </div>
    ) : panel === 'color' ? (
        <Section>
            <Pad small>
                <ColorPicker selectedColor={customColor} onSelectColor={setCustomColor} />
            </Pad>
        </Section>
    ) : panel === 'monthly' ? (
        <Stack className="cu-tight">
            <Section>
                <Pad small>
                    <Segmented<'SPECIFIC_DATES' | 'FLEXIBLE_COUNT'>
                        value={monthlyType}
                        onChange={setMonthlyType}
                        options={[
                            { value: 'SPECIFIC_DATES', label: t('cu.specificDays', 'Días concretos') },
                            { value: 'FLEXIBLE_COUNT', label: t('cu.flexible', 'Flexible') },
                        ]}
                    />
                </Pad>
                {monthlyType === 'SPECIFIC_DATES' ? (
                    <>
                        <Pad>
                            <DateNumberGrid
                                selected={workingDays}
                                onToggle={(d) => {
                                    if (workingDays.length >= 28 && !workingDays.includes(d)) return; // limit to 28 days
                                    toggleDay(d);
                                }}
                            />
                        </Pad>
                        <Row
                            label={t('dashboard.lastDayOfMonth', 'Último día del mes')}
                            sub={t('dashboard.lastDayOption')}
                            trailing={<Toggle checked={monthlyLastDay} onChange={setMonthlyLastDay} label={t('dashboard.lastDayOfMonth', 'Último día del mes')} />}
                        />
                    </>
                ) : (
                    <Row
                        label={t('common.daysPerMonth', 'Días al mes')}
                        value={monthlyFlexibleCount}
                        trailing={<Stepper value={Number(monthlyFlexibleCount)} min={1} max={28} onChange={setMonthlyFlexibleCount} label={t('common.daysPerMonth', 'Días al mes')} />}
                    />
                )}
            </Section>
        </Stack>
    ) : panel === 'pomo' ? pomoPanel
      : panel === 'smart' ? (
        <Section>
            <Row className="cu-option" label={t('common.none', 'Ninguna')} selected={!smartProjectId} onClick={() => { setSmartProjectId(''); setPanel(null); }} />
            {(smartProjects || []).map(p => (
                <Row
                    key={p.id}
                    className="cu-option"
                    icon={<Target size={16} />}
                    iconColor={p.traitColor || '#5e5ce6'}
                    label={p.mainGoal}
                    selected={smartProjectId === p.id}
                    onClick={() => { setSmartProjectId(p.id); setPanel(null); }}
                />
            ))}
        </Section>
    ) : null;

    const useWizard = !initialData?.id;
    const subpanel = panel ? { title: panelTitle[panel], onBack: () => setPanel(null), children: panelBody } : null;

    const rewardPreview = (
        <RewardPreview
            xp={prediction.xp}
            traitXp={prediction.traitXp}
            coins={prediction.coins}
            traitColor={activeColor}
            TraitIcon={SelectedIcon}
            traitLabel={activeLabel}
            bonus={prediction.bonusApplied}
            xpLabel={t('common.xp', 'XP')}
            goldLabel={t('common.gold', 'Oro')}
        />
    );

    // ── Shared fragments ─────────────────────────────────────────────────────
    const goalBlock = (
        <>
            <Segmented
                tall
                value={goalFreq}
                onChange={(f) => {
                    setGoalFreq(f);
                    if (f === 'WEEKLY') setWorkingDays([1, 2, 3, 4, 5]);
                    else if (f === 'MONTHLY') setWorkingDays([]);
                }}
                options={['DAILY', 'WEEKLY', 'MONTHLY'].map(f => ({ value: f, label: t(`modals.project.frequencies.${f}`) }))}
            />
            <div className="cu-group">
                <div className="cu-row" style={{ minHeight: 48 }}>
                    <span className="cu-row-tile" style={{ background: '#0a84ff' }}><Hourglass size={17} /></span>
                    <span className="cu-row-main"><span className="cu-row-label">{t('cu.goalTime', 'Meta de tiempo')}</span></span>
                    <div style={{ width: 118, flex: 'none' }}>
                        <Segmented<'HOURS' | 'MINUTES'>
                            value={goalUnit}
                            onChange={(u) => {
                                setGoalUnit(u);
                                if (u === 'HOURS' && (goalTarget > 24 || goalTarget < 1)) setGoalTarget(1);
                                if (u === 'MINUTES' && goalTarget < 15) setGoalTarget(30);
                            }}
                            options={[
                                { value: 'HOURS', label: t('common.hoursShort', 'HRS') },
                                { value: 'MINUTES', label: t('common.minUpper', 'MIN') },
                            ]}
                        />
                    </div>
                </div>
                <BigStepper
                    value={goalTarget}
                    unit={`${unitLabel} / ${perLabel}`}
                    onMinus={() => setGoalTarget(Math.max(goalUnit === 'HOURS' ? 0.5 : 5, goalTarget - (goalUnit === 'HOURS' ? 0.5 : 5)))}
                    onPlus={() => setGoalTarget(Math.min(goalUnit === 'HOURS' ? 24 : 720, goalTarget + (goalUnit === 'HOURS' ? 0.5 : 5)))}
                />
            </div>
            {goalFreq === 'WEEKLY' && <DayPicker days={DAYS} selected={workingDays} onToggle={toggleDay} />}
            {goalFreq === 'MONTHLY' && (
                <Tiles cols={1}>
                    <Tile icon={<Calendar size={14} />} color="#ff453a" label={t('cu.monthDays', 'Días del mes')} value={monthlySummary || t('cu.choose', 'Elegir')} onClick={() => setPanel('monthly')} />
                </Tiles>
            )}
            {goalFreq !== 'DAILY' && (
                <Notice tone="info" icon={<Calculator size={16} />}>
                    {t('modals.project.dailyTarget', 'Objetivo diario')}:{' '}
                    <b style={{ marginLeft: 0, textDecoration: 'none' }}>
                        {calculatedDailyGoal < 1 ? `${Math.round(calculatedDailyGoal * 60)} ${t('modals.project.minutes', 'minutos')}` : `${calculatedDailyGoal} ${t('modals.project.hours', 'horas')}`}
                    </b>{' '}/ {String(t('modals.project.day')).toLowerCase()}
                </Notice>
            )}
        </>
    );

    const traitTile = (
        <Tile icon={<SelectedIcon size={14} />} color={selectedAttr?.color || '#0a84ff'} label={t('cu.trait', 'Rasgo')} value={hasTrait ? activeLabel : t('habits.selectTrait', 'Elegir')} onClick={() => setPanel('trait')} />
    );
    const colorTile = (
        <Tile icon={<Palette size={14} />} color={customColor || '#bf5af2'} label={t('cu.color', 'Color')} value={customColor ? t('cu.custom', 'Personal') : t('cu.auto', 'Automático')} onClick={() => setPanel('color')} />
    );
    const impactTile = (
        <Tile icon={<Zap size={14} />} color={IMPACT_COLORS[impact - 1]} label={t('cu.impactShort', 'Impacto')} onClick={() => setImpact(impact >= 4 ? 1 : impact + 1)}>
            <MiniMeter value={impact} colors={IMPACT_COLORS} />
        </Tile>
    );
    const focusTile = (
        <Tile
            icon={<Timer size={14} />}
            color="#ff9f0a"
            label={useWizard ? t('cu.advanced', 'Avanzado') : t('cu.focus', 'Enfoque')}
            value={useWizard ? (focusRoutine.length ? t('cu.routine', 'Rutina') : t('cu.customize', 'Personalizar')) : (focusRoutine.length ? t('cu.routine', 'Rutina') : `${pomoDuration || 25} min`)}
            onClick={() => setPanel('pomo')}
        />
    );
    const alarmTile = (span?: 2) => (
        <Tile span={span} icon={<Bell size={14} />} color="#bf5af2" label={t('modals.project.alert', 'Alarma')} active={!alarmOk && !isEditing}>
            <TimePicker
                value={reminder}
                className="cu-time"
                onChange={(val) => {
                    setReminder(val);
                    if (val && permissions.notifications !== 'granted') requestPermissions();
                }}
            />
        </Tile>
    );
    const smartTile = hasSmart ? (
        <Tile icon={<Target size={14} />} color="#5e5ce6" label={t('cu.strategy', 'Estrategia')} value={linkedSmart?.mainGoal || t('common.none', 'Ninguna')} onClick={() => setPanel('smart')} />
    ) : null;
    const alarmNotices = (
        <>
            {reminder && (permissions.notifications !== 'granted' && permissions.notifications !== 'unknown') && (
                <Notice tone="danger" icon={<AlertCircle size={16} />} action={t('common.fix', 'Arreglar')} onClick={requestPermissions}>
                    {t('habits.activateNotifications', 'Activa las notificaciones')}
                </Notice>
            )}
            {reminder && (
                <div className="cu-linkrow">
                    <button type="button" className="cu-link" style={{ fontSize: 13, color: 'var(--cu-label-2)' }} onClick={openSystemSettings}>
                        <Zap size={13} /> {t('habits.batteryOptimization', 'Optimización de batería')} · {t('common.review', 'Revisar')}
                    </button>
                </div>
            )}
        </>
    );

    // ── Creation: four blocks, one at a time ─────────────────────────────────
    if (useWizard) {
        const steps: WizardStep[] = [
            {
                key: 'what',
                title: t('cu.wiz.project.t1', '¿Qué proyecto quieres avanzar?'),
                hint: t('cu.wiz.project.h1', 'Ponle nombre y elige el rasgo que fortalece.'),
                icon: <Briefcase size={16} />,
                valid: hasName && hasTrait,
                missing: !hasName ? t('cu.wiz.nameFirst', 'Escribe un nombre para continuar') : t('cu.wiz.traitFirst', 'Elige un rasgo para continuar'),
                content: (
                    <>
                        <div>
                            <p className="cu-field-label">{t('cu.wiz.name', 'Nombre')}</p>
                            <div className="cu-bigfield">
                                <input className="cu-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('modals.project.namePlaceholder')} aria-label={t('cu.wiz.name', 'Nombre')} autoFocus />
                            </div>
                        </div>
                        <div className="cu-desc">
                            <FileText size={17} />
                            <input className="cu-input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t('cu.wiz.note', 'Nota (opcional)')} aria-label={t('cu.wiz.note', 'Nota (opcional)')} />
                        </div>
                        <Tiles cols={2}>{traitTile}{colorTile}</Tiles>
                    </>
                ),
            },
            {
                key: 'goal',
                title: t('cu.wiz.project.t2', '¿Cuánto tiempo le dedicarás?'),
                hint: t('cu.wiz.project.h2', 'Elige tu meta de tiempo; la repartimos en días.'),
                icon: <Hourglass size={16} />,
                valid: goalOk,
                missing: t('cu.wiz.pickDays', 'Elige al menos un día para continuar'),
                content: goalBlock,
            },
            {
                key: 'focus',
                title: t('cu.wiz.project.t3', 'Tus sesiones de enfoque'),
                hint: t('cu.wiz.project.h3', 'Define cuánto dura cada bloque de trabajo.'),
                icon: <Timer size={16} />,
                valid: sessionOk,
                missing: t('cu.wiz.sessionFirst', 'Define la duración de la sesión'),
                content: (
                    <>
                        <div className="cu-chips" style={{ justifyContent: 'center' }}>
                            {pomoPresets.map(p => (
                                <Chip key={p} on={pomoDuration === p} onClick={() => setPomoDuration(p)}>{p} min</Chip>
                            ))}
                        </div>
                        <div className="cu-mini-field">
                            <span style={{ flex: 1 }}>{t('modals.project.custom', 'Personalizado')}</span>
                            <input
                                className="cu-input cu-num"
                                style={{ width: 64 }}
                                type="number"
                                inputMode="numeric"
                                value={String(pomoDuration)}
                                onChange={(e) => setPomoDuration(e.target.value === '' ? '' : (parseInt(e.target.value) || 25))}
                                aria-label="min"
                            />
                            <span>min</span>
                        </div>
                        <Tiles cols={2}>{impactTile}{focusTile}</Tiles>
                    </>
                ),
            },
            {
                key: 'remind',
                title: t('cu.wiz.project.t4', 'Recordatorio y listo'),
                hint: t('cu.wiz.project.h4', 'Pon una alarma para no olvidarlo.'),
                icon: <Bell size={16} />,
                valid: alarmOk,
                missing: t('cu.wiz.alarmFirstProject', 'Elige la hora de tu alarma para crear el proyecto'),
                content: (
                    <>
                        <Tiles cols={2}>{alarmTile(hasSmart ? undefined : 2)}{smartTile}</Tiles>
                        {alarmNotices}
                    </>
                ),
            },
        ];
        return (
            <WizardSheet
                isOpen={isOpen}
                onClose={onClose}
                accent={activeColor}
                steps={steps}
                index={step}
                onIndex={setStep}
                onFinish={handleConfirm}
                finishLabel={t('cu.wiz.createProject', 'Crear proyecto')}
                finishing={isSubmitting}
                glyph={<SelectedIcon size={34} />}
                name={title}
                lastExtra={canSubmit ? rewardPreview : null}
                subpanel={subpanel}
                nextLabel={t('cu.wiz.next', 'Siguiente')}
                backLabel={t('cu.wiz.back', 'Atrás')}
                doneLabel={t('cu.done', 'Listo')}
                stepOf={(i, n) => t('cu.wiz.stepOf', { defaultValue: 'Paso {{i}} de {{n}}', i: i + 1, n })}
            />
        );
    }

    // ── Editing: every control on one page ───────────────────────────────────
    return (
        <CupertinoSheet
            isOpen={isOpen}
            onClose={onClose}
            accent={activeColor}
            title={t('projects.editProject', 'Editar proyecto')}
            subtitle={t('modals.project.subtitle')}
            primaryLabel={t('cu.save', 'Guardar')}
            onPrimary={handleConfirm}
            primaryDisabled={!canSubmit}
            primaryLoading={isSubmitting}
            closeDisabled={isSubmitting}
            scrollRef={scrollRef}
            maxWidth={460}
            doneLabel={t('cu.done', 'Listo')}
            subpanel={subpanel}
            footer={canSubmit ? rewardPreview : <Hint>{t('cu.missingPrefix', 'Falta')}: <b>{missing.join(' · ')}</b></Hint>}
        >
            <Stack className="cu-tight">
                <Hero
                    tile={<SelectedIcon size={28} />}
                    tileColor={activeColor}
                    value={title}
                    onChange={setTitle}
                    placeholder={t('modals.project.namePlaceholder')}
                />
                <div className="cu-desc">
                    <FileText size={17} />
                    <input
                        className="cu-input"
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        placeholder={t('modals.project.descPlaceholder')}
                        aria-label={t('modals.project.descPlaceholder')}
                    />
                </div>
                {goalBlock}
                <Tiles cols={3}>
                    {traitTile}
                    {colorTile}
                    {impactTile}
                    {focusTile}
                    {alarmTile(hasSmart ? undefined : 2)}
                    {smartTile}
                </Tiles>
                {alarmNotices}
                {initialData?.id && onDelete && (
                    <div className="cu-linkrow">
                        <button type="button" className="cu-link" style={{ color: 'var(--cu-red)' }} disabled={isSubmitting} onClick={() => onDelete(initialData.id as string)}>
                            <Trash2 size={14} /> {t('common.delete', 'Eliminar')}
                        </button>
                    </div>
                )}
            </Stack>
        </CupertinoSheet>
    );
}, (prev, next) => {
    if (!prev.isOpen && !next.isOpen) return true;
    return prev.isOpen === next.isOpen && prev.initialData === next.initialData && prev.smartProjects === next.smartProjects;
});
