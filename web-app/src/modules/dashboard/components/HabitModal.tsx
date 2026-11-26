import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Reorder } from 'framer-motion';
import * as LucideIcons from '@/utils/lucideRegistry';
import { Plus, Hash, List, Star, Target, Zap, AlertCircle, Calendar, Palette, Trash2, GripVertical, Sliders, Bell, CheckCircle2, FileText, Layers, Repeat, X, Check } from 'lucide-react';
import { Attribute, Habit, Project } from '../../../types';
import { SmartProject } from '../../../types/SmartGoal';
import { calculateTaskRewards } from '../../../utils/rewardCalculator';
import { getWeekStartDay } from '../../../utils/dateUtils';
import { useTranslation } from 'react-i18next';
import { IconPicker } from './IconPicker';
import { DurationPicker } from './DurationPicker';
import { TimePicker } from '../../../components/ui/TimePicker';
import { usePermissions } from '../../../hooks/usePermissions';
import { SUPER_HABIT_LIST, getSuperTheme, type SuperHabitId } from '../../superHabits/catalog';
import { SuperHabitButton } from '../../superHabits/SuperHabitPicker';
import {
    CupertinoSheet, Stack, Section, Hero, Row, InputRow, Expand, Segmented, Toggle, DayPicker, DateNumberGrid, Notice,
    RewardPreview, Hint, Pad, TraitGrid, OptionList, Swatches, Tiles, Tile, MiniMeter, resolveTraitIcon, traitLabelOf,
} from '../../../components/cupertino';

type Logic = 'SIMPLE' | 'QUANTITY' | 'CHECKLIST' | 'BOOLEAN';
type Panel = null | 'trait' | 'icon' | 'super' | 'project' | 'duration' | 'monthly' | 'split' | 'list';
type SubtaskState = {
    id: string; text: string; completed: boolean; color?: string; days?: number[]; reminderTime?: string;
    intervalType?: 'WEEKLY' | 'MONTHLY' | 'NONE'; intervalCount?: number; allowSkip?: boolean; deleted?: boolean;
};

const ITEM_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];
const IMPACT_COLORS = ['#30d158', '#0a84ff', '#ff9f0a', '#ff453a'];

export const HabitModal = React.memo(({ isOpen, onClose, attributes = [], projects = [], onConfirm, initialData, onSwitchToBadHabit }: { isOpen: boolean, onClose: () => void, attributes?: Attribute[], smartProjects?: SmartProject[], projects?: Project[], onConfirm: (data: Partial<Habit>) => Promise<void> | void, initialData?: Habit & { _initialTab?: 'alarm' | 'checklist', _targetSubtaskId?: string }, onSwitchToBadHabit?: () => void }) => {
    const { t } = useTranslation();
    const { permissions, requestPermissions, openSystemSettings } = usePermissions();
    const [panel, setPanel] = useState<Panel>(null);

    // Identity
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [attrId, setAttrId] = useState('DISCIPLINA');
    const [customColor, setCustomColor] = useState<string | undefined>(undefined);
    const [customIconName, setCustomIconName] = useState<string | null>(null);
    const [subAttrId, setSubAttrId] = useState('');
    const [superId, setSuperId] = useState<SuperHabitId | null>(null);

    // Mechanics
    const [freq, setFreq] = useState('DAILY');
    const [weekDays, setWeekDays] = useState<number[]>([]);
    const [weeklyType, setWeeklyType] = useState<'SPECIFIC_DAYS' | 'FLEXIBLE_COUNT'>('SPECIFIC_DAYS');
    const [weeklyFlexibleCount, setWeeklyFlexibleCount] = useState<number | string>(1);
    const [monthlyType, setMonthlyType] = useState<'SPECIFIC_DATES' | 'FLEXIBLE_COUNT'>('SPECIFIC_DATES');
    const [monthlyFlexibleCount, setMonthlyFlexibleCount] = useState<number | string>(1);
    const [monthlyLastDay, setMonthlyLastDay] = useState<boolean>(false);
    const [logic, setLogic] = useState<Logic>('BOOLEAN');
    const [target, setTarget] = useState('');
    const [unit, setUnit] = useState('');
    const [isDivided, setIsDivided] = useState(false);
    const [dividedMode, setDividedMode] = useState<'INTERVAL' | 'FIXED'>('INTERVAL');
    const [dividedTimes, setDividedTimes] = useState<{ time: string; amount: number; id: string }[]>([]);
    const [dividedQuantity, setDividedQuantity] = useState('1');
    const [dividedInterval, setDividedInterval] = useState('90');
    const [subtasks, setSubtasks] = useState<SubtaskState[]>([]);
    const [openMenu, setOpenMenu] = useState<{ id: string, type: 'COLOR' | 'DAYS' | 'TIME' } | null>(null);
    const [newSubtask, setNewSubtask] = useState('');
    const [impact, setImpact] = useState(1);

    // Commitment
    const [estimatedTime, setEstimatedTime] = useState(0);
    const [reminder, setReminder] = useState('');
    const [smartProjectId, setSmartProjectId] = useState('');
    const [projectId, setProjectId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);

    // Reset or populate the form on open
    useEffect(() => {
        if (!isOpen) return;
        setIsSubmitting(false);
        setPanel(null);
        setOpenMenu(null);
        setNewSubtask('');

        if (initialData) {
            setTitle(initialData.title || '');
            setDesc(initialData.description || '');
            setAttrId(initialData.attribute || '');
            setSmartProjectId(initialData.projectId || '');
            setFreq(initialData.frequency || 'DAILY');
            setWeekDays(initialData.frequencyDays || []);
            setWeeklyType(initialData.weeklyType || 'SPECIFIC_DAYS');
            setWeeklyFlexibleCount(initialData.weeklyFlexibleCount || 1);
            setMonthlyType(initialData.monthlyType || 'SPECIFIC_DATES');
            setMonthlyFlexibleCount(initialData.monthlyFlexibleCount || 1);
            setMonthlyLastDay(initialData.monthlyLastDay || false);
            setLogic(initialData.type || 'BOOLEAN');
            setTarget(initialData.targetValue?.toString() || '');
            setUnit(initialData.unit || '');
            setIsDivided(initialData.isDivided || false);
            setDividedMode(initialData.dividedMode || 'INTERVAL');
            setDividedTimes(initialData.dividedTimes || []);
            setDividedQuantity(initialData.dividedQuantity?.toString() || '1');
            setDividedInterval(initialData.dividedInterval?.toString() || '90');
            setSubtasks(initialData.checklist || []);
            setReminder(initialData.reminderTime || '');
            setEstimatedTime(initialData.estimatedTime || 0);
            setCustomColor(initialData.customColor);
            setCustomIconName(initialData.iconName || null);
            setImpact(initialData.impact || 1);
            setSubAttrId(initialData.subAttribute || '');
            setSuperId(getSuperTheme(initialData.superHabit)?.id ?? null);
            setProjectId('');

            // Direct navigation requests from the Dashboard (chronological view)
            if (initialData._initialTab === 'checklist' && initialData._targetSubtaskId) {
                setOpenMenu({ id: initialData._targetSubtaskId, type: 'TIME' });
            }
            if (initialData._initialTab) {
                const targetId = initialData._initialTab === 'alarm' ? 'cu-habit-commit' : 'cu-habit-track';
                window.setTimeout(() => document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 380);
            }
        } else {
            setTitle('');
            setDesc('');
            setAttrId('DISCIPLINA');
            setSmartProjectId('');
            setProjectId('');
            setEstimatedTime(0);
            setFreq('DAILY');
            setWeekDays([]);
            setWeeklyType('SPECIFIC_DAYS');
            setWeeklyFlexibleCount(1);
            setMonthlyType('SPECIFIC_DATES');
            setMonthlyFlexibleCount(1);
            setMonthlyLastDay(false);
            setLogic('BOOLEAN');
            setTarget('');
            setUnit('');
            setIsDivided(false);
            setDividedMode('INTERVAL');
            setDividedTimes([]);
            setDividedQuantity('1');
            setDividedInterval('90');
            setSubtasks([]);
            setReminder('');
            setImpact(1);
            setCustomColor(undefined);
            setCustomIconName(null);
            setSubAttrId('');
            setSuperId(null);
            scrollRef.current?.scrollTo({ top: 0 });
        }
    }, [isOpen, initialData]);

    // Picking a super habit pre-fills only what the user left empty
    const handleSuperSelect = (id: SuperHabitId | null) => {
        setSuperId(id);
        setPanel(null);
        const theme = getSuperTheme(id);
        if (!theme) return;
        setTitle(prev => prev.trim() ? prev : theme.shortName.slice(0, 15));
        setDesc(prev => prev.trim() ? prev : theme.description);
    };

    // Smart auto-linking by keywords in the title
    useEffect(() => {
        if (!title || initialData?.attribute) return;
        for (const attr of attributes) {
            for (const sub of (attr.subTraits || [])) {
                const subWords = sub.name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
                const lower = title.toLowerCase();
                if (subWords.some(word => lower.includes(word)) || lower.includes(sub.name.toLowerCase())) {
                    setAttrId(attr.id);
                    setSubAttrId(sub.id);
                    return;
                }
            }
        }
    }, [title, attributes, initialData]);

    const registry = LucideIcons as unknown as Record<string, React.ElementType>;
    const selectedAttr = (attributes || []).find((a) => a.id === attrId);
    const activeColor = customColor || (selectedAttr ? selectedAttr.color : '#0a84ff');
    const TraitIcon = useMemo(() => resolveTraitIcon(selectedAttr, registry, Star), [selectedAttr, registry]);
    const SelectedIcon = useMemo(
        () => (customIconName && registry[customIconName]) ? registry[customIconName] : TraitIcon,
        [customIconName, TraitIcon, registry]
    );
    const activeLabel = selectedAttr ? traitLabelOf(selectedAttr, t) : 'Trait';

    const weekDaysRawResult = t('common.weekdays.initials', { returnObjects: true });
    const weekDaysRaw = Array.isArray(weekDaysRawResult) ? weekDaysRawResult : ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    const weekStart = getWeekStartDay();
    const weekDaysList = useMemo(() => (
        weekStart === 1
            ? [...weekDaysRaw.slice(1).map((l, i) => ({ label: l, index: i + 1 })), { label: weekDaysRaw[0], index: 0 }]
            : weekDaysRaw.map((l, i) => ({ label: l, index: i }))
    ), [weekDaysRaw, weekStart]);

    // Reward preview: base reward + the streak bonus for completing today
    const prediction = useMemo(
        () => calculateTaskRewards(estimatedTime, impact, initialData?.streak || 0, 'HABIT'),
        [estimatedTime, impact, initialData?.streak]
    );

    // ── Validation (each flag doubles as a human-readable "missing" reason) ──
    const dividedTotal = dividedTimes.reduce((sum, d) => sum + d.amount, 0);
    const targetNum = parseInt(target);
    const hasName = title.trim() !== '';
    const hasTrait = attrId !== '';
    const scheduleOk = (() => {
        if (freq === 'WEEKLY') {
            if (weeklyType === 'SPECIFIC_DAYS' && weekDays.length === 0) return false;
            if (weeklyType === 'FLEXIBLE_COUNT' && (!weeklyFlexibleCount || Number(weeklyFlexibleCount) < 1)) return false;
        }
        if (freq === 'MONTHLY') {
            if (monthlyType === 'SPECIFIC_DATES' && weekDays.length === 0 && !monthlyLastDay) return false;
            if (monthlyType === 'FLEXIBLE_COUNT' && (!monthlyFlexibleCount || Number(monthlyFlexibleCount) < 1)) return false;
        }
        return true;
    })();
    const targetOk = logic !== 'QUANTITY' || (!!target && !isNaN(targetNum) && targetNum > 0);
    const splitOk = (() => {
        if (logic !== 'QUANTITY' || !isDivided) return true;
        if (dividedMode === 'INTERVAL') {
            return !!dividedQuantity && parseInt(dividedQuantity) > 0 && !!dividedInterval && parseInt(dividedInterval) > 0;
        }
        return dividedTimes.length > 0 && dividedTotal === targetNum;
    })();
    const stepsOk = logic !== 'CHECKLIST' || subtasks.some(s => !s.deleted) || !!newSubtask.trim();
    // Editing: alarm is optional (may predate the requirement). Creating: required.
    const alarmOk = !!initialData?.id ? true : reminder !== '';
    const canSubmit = hasName && hasTrait && scheduleOk && targetOk && splitOk && stepsOk && alarmOk;

    const missing: string[] = [];
    if (!hasName) missing.push(t('cu.missing.name', 'nombre'));
    if (!hasTrait) missing.push(t('cu.missing.trait', 'rasgo'));
    if (!scheduleOk) missing.push(t('cu.missing.days', 'días'));
    if (!targetOk) missing.push(t('cu.missing.goal', 'meta'));
    if (!splitOk) missing.push(t('cu.missing.split', 'reparto de la meta'));
    if (!stepsOk) missing.push(t('cu.missing.steps', 'pasos de la lista'));
    if (!alarmOk) missing.push(t('cu.missing.alarm', 'alarma'));

    const addSubtask = () => {
        if (!newSubtask.trim()) return;
        const defaultDays = freq === 'WEEKLY' ? weekDays : freq === 'MONTHLY' ? [] : undefined;
        setSubtasks(prev => [...prev, { id: Date.now().toString(), text: newSubtask.trim(), completed: false, days: defaultDays }]);
        setNewSubtask('');
    };
    const patchSubtask = (id: string, patch: Partial<SubtaskState>) =>
        setSubtasks(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));

    const clampCount = (setter: (v: number | string) => void, max: number) => (raw: string) => {
        if (raw === '') setter('');
        else setter(Math.max(1, Math.min(max, parseInt(raw) || 1)));
    };

    const handleConfirm = async () => {
        if (isSubmitting || !canSubmit) return;
        setIsSubmitting(true);
        // A pending item typed in the checklist input should not be lost
        let checklist = subtasks;
        if (logic === 'CHECKLIST' && newSubtask.trim()) {
            const defaultDays = freq === 'WEEKLY' ? weekDays : freq === 'MONTHLY' ? [] : undefined;
            checklist = [...subtasks, { id: Date.now().toString(), text: newSubtask.trim(), completed: false, days: defaultDays }];
        }
        try {
            await onConfirm({
                title,
                description: desc,
                attribute: attrId,
                type: logic,
                frequency: freq,
                frequencyDays: (freq === 'WEEKLY' || freq === 'MONTHLY') ? weekDays : undefined,
                weeklyType: freq === 'WEEKLY' ? weeklyType : undefined,
                weeklyFlexibleCount: freq === 'WEEKLY' ? (typeof weeklyFlexibleCount === 'number' ? weeklyFlexibleCount : parseInt(weeklyFlexibleCount) || 1) : undefined,
                monthlyType: freq === 'MONTHLY' ? monthlyType : undefined,
                monthlyFlexibleCount: freq === 'MONTHLY' ? (typeof monthlyFlexibleCount === 'number' ? monthlyFlexibleCount : parseInt(monthlyFlexibleCount) || 1) : undefined,
                monthlyLastDay: freq === 'MONTHLY' ? monthlyLastDay : undefined,
                targetValue: logic === 'QUANTITY' ? parseInt(target) : 1,
                unit: unit || undefined,
                isDivided: logic === 'QUANTITY' ? isDivided : false,
                dividedMode: logic === 'QUANTITY' && isDivided ? dividedMode : undefined,
                dividedQuantity: logic === 'QUANTITY' && isDivided && dividedMode === 'INTERVAL' ? parseInt(dividedQuantity) : undefined,
                dividedInterval: logic === 'QUANTITY' && isDivided && dividedMode === 'INTERVAL' ? parseInt(dividedInterval) : undefined,
                dividedTimes: logic === 'QUANTITY' && isDivided && dividedMode === 'FIXED' ? dividedTimes : undefined,
                checklist: logic === 'CHECKLIST' ? checklist.filter(s => !s.deleted) : [],
                reminderTime: reminder || undefined,
                estimatedTime,
                customColor,
                iconName: customIconName || undefined,
                impact,
                projectId: projectId || undefined,
                smartProjectId: smartProjectId || undefined,
                subAttribute: (subAttrId || null) as any,
                superHabit: superId ?? undefined,
                ...(initialData?.id ? { id: initialData.id } : {})
            });
            onClose();
        } catch (error) {
            console.error('Failed to save habit', error);
            setIsSubmitting(false);
        }
    };

    const onAlarmChange = (val: string) => {
        setReminder(val);
        if (val && permissions.notifications !== 'granted') requestPermissions();
    };
    const linkedProject = projects.find(p => p.id === projectId);
    const isEditing = !!initialData;
    const activeSteps = subtasks.filter(s => !s.deleted);

    const logicOptions = [
        { value: 'BOOLEAN' as Logic, label: t('modals.habit.logics.BOOLEAN'), icon: <CheckCircle2 size={14} /> },
        { value: 'QUANTITY' as Logic, label: t('modals.habit.logics.QUANTITY'), icon: <Hash size={14} /> },
        { value: 'CHECKLIST' as Logic, label: t('modals.habit.logics.CHECKLIST'), icon: <List size={14} /> },
    ];
    const monthlySummary = monthlyType === 'FLEXIBLE_COUNT'
        ? t('cu.timesN', { defaultValue: '{{n}} veces', n: monthlyFlexibleCount })
        : [...weekDays].sort((a, b) => a - b).join(', ') + (monthlyLastDay ? (weekDays.length ? ' + ' : '') + t('cu.lastDayShort', 'último') : '');

    // ── Detail panels: open inside the sheet so the main page never scrolls ──
    const panelTitle: Record<Exclude<Panel, null>, string> = {
        trait: t('cu.trait', 'Rasgo'),
        icon: t('cu.iconColor', 'Icono y color'),
        super: t('cu.superHabit', 'Súper hábito'),
        project: t('cu.project', 'Proyecto'),
        duration: t('cu.duration', 'Duración'),
        monthly: t('cu.monthDays', 'Días del mes'),
        split: t('cu.splitGoal', 'Dividir la meta'),
        list: t('cu.steps', 'Pasos'),
    };

    const itemList = (
        <Section>
            <InputRow
                placeholder={t('modals.quest.addStepPlaceholder', 'Añadir paso…')}
                value={newSubtask}
                onChange={setNewSubtask}
                onEnter={addSubtask}
                trailing={
                    <button type="button" className="cu-icon-btn" style={{ width: 30, height: 30, background: newSubtask.trim() ? 'var(--cu-accent)' : undefined, color: newSubtask.trim() ? '#fff' : undefined }} onClick={addSubtask} aria-label={t('common.add', 'Añadir')}>
                        <Plus size={16} strokeWidth={2.8} />
                    </button>
                }
            />
            <Reorder.Group
                as="div"
                axis="y"
                values={activeSteps}
                onReorder={(active) => setSubtasks([...active, ...subtasks.filter(s => s.deleted)])}
            >
                {activeSteps.map((task) => (
                    <Reorder.Item as="div" key={task.id} value={task} style={{ borderTop: '0.5px solid var(--cu-sep)', background: 'transparent' }}>
                        <div className="cu-row" style={{ minHeight: 48, padding: '4px 8px 4px 10px', gap: 6 }}>
                            <GripVertical size={16} style={{ color: 'var(--cu-label-3)', cursor: 'grab', flex: 'none' }} />
                            <span className="cu-dot" style={{ background: task.color || 'rgba(255,255,255,0.22)' }} />
                            <input className="cu-item-input" value={task.text} onChange={(e) => patchSubtask(task.id, { text: e.target.value })} aria-label={t('checklist.step', 'Paso')} />
                            <button type="button" className={`cu-mini ${task.color ? 'cu-on' : ''}`} onClick={() => setOpenMenu(p => (p?.id === task.id && p.type === 'COLOR') ? null : { id: task.id, type: 'COLOR' })} aria-label="Color"><Palette size={16} /></button>
                            <button type="button" className={`cu-mini ${(task.days && task.days.length > 0) ? 'cu-on' : ''}`} onClick={() => setOpenMenu(p => (p?.id === task.id && p.type === 'DAYS') ? null : { id: task.id, type: 'DAYS' })} aria-label={t('cu.days', 'Días')}><Calendar size={16} /></button>
                            <button type="button" className={`cu-mini cu-warn ${task.reminderTime ? 'cu-on' : ''}`} onClick={() => setOpenMenu(p => (p?.id === task.id && p.type === 'TIME') ? null : { id: task.id, type: 'TIME' })} aria-label={t('cu.alarm', 'Alarma')}><AlertCircle size={16} /></button>
                            <button type="button" className="cu-mini cu-del" onClick={() => patchSubtask(task.id, { deleted: true })} aria-label={t('common.delete', 'Eliminar')}><Trash2 size={16} /></button>
                        </div>
                        <Expand open={openMenu?.id === task.id}>
                            <div className="cu-subpanel">
                                {openMenu?.type === 'COLOR' && (
                                    <div className="cu-swatches" style={{ gap: 10 }}>
                                        <button type="button" className="cu-swatch" style={{ background: 'transparent' }} onClick={() => patchSubtask(task.id, { color: undefined })} aria-label={t('common.clear', 'Quitar')}>
                                            <X size={14} style={{ position: 'absolute', inset: 0, margin: 'auto', color: 'var(--cu-label-2)' }} />
                                        </button>
                                        <Swatches colors={ITEM_COLORS} value={task.color} onChange={(c) => patchSubtask(task.id, { color: c })} />
                                    </div>
                                )}
                                {openMenu?.type === 'DAYS' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <DayPicker
                                            days={weekDaysList}
                                            dimmed={!!(task.intervalType && task.intervalType !== 'NONE')}
                                            selected={task.days ?? [0, 1, 2, 3, 4, 5, 6]}
                                            onToggle={(index) => {
                                                const current = task.days || [0, 1, 2, 3, 4, 5, 6];
                                                const next = current.includes(index) ? current.filter(d => d !== index) : [...current, index];
                                                patchSubtask(task.id, { days: next.length === 7 ? undefined : next });
                                            }}
                                        />
                                        {task.intervalType && task.intervalType !== 'NONE' && (
                                            <>
                                                <Segmented<'WEEKLY' | 'MONTHLY'>
                                                    value={task.intervalType}
                                                    onChange={(v) => patchSubtask(task.id, v === 'WEEKLY'
                                                        ? { intervalType: 'WEEKLY', intervalCount: Math.min(task.intervalCount || 3, 6) }
                                                        : { intervalType: 'MONTHLY', intervalCount: task.intervalCount || 10 })}
                                                    options={[{ value: 'WEEKLY', label: t('cu.weekly', 'Semanal') }, { value: 'MONTHLY', label: t('cu.monthly', 'Mensual') }]}
                                                />
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                                                    <span className="cu-row-sub" style={{ fontSize: 14 }}>
                                                        {task.intervalType === 'WEEKLY' ? t('cu.timesWeek', 'Veces por semana (máx. 6)') : t('cu.timesMonth', 'Veces al mes')}
                                                    </span>
                                                    <div className="cu-stepper">
                                                        <button type="button" onClick={() => patchSubtask(task.id, { intervalCount: Math.max(1, (task.intervalCount || 1) - 1) })}>−</button>
                                                        <i />
                                                        <span style={{ minWidth: 34, textAlign: 'center', fontWeight: 600 }}>{task.intervalCount || (task.intervalType === 'WEEKLY' ? 3 : 10)}</span>
                                                        <i />
                                                        <button type="button" onClick={() => patchSubtask(task.id, { intervalCount: Math.min(task.intervalType === 'WEEKLY' ? 6 : 31, (task.intervalCount || 1) + 1) })}>+</button>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <span className="cu-row-sub" style={{ fontSize: 14 }}>{t('cu.allowSkip', 'Permitir saltarse')}</span>
                                                    <Toggle checked={!!task.allowSkip} onChange={(v) => patchSubtask(task.id, { allowSkip: v })} color="#ff9f0a" />
                                                </div>
                                            </>
                                        )}
                                        <button
                                            type="button"
                                            className="cu-link"
                                            onClick={() => {
                                                const isInterval = !!(task.intervalType && task.intervalType !== 'NONE');
                                                patchSubtask(task.id, { intervalType: isInterval ? 'NONE' : 'WEEKLY', intervalCount: isInterval ? undefined : 3, days: undefined });
                                            }}
                                        >
                                            <Sliders size={14} />
                                            {task.intervalType && task.intervalType !== 'NONE' ? t('cu.useWeekdays', 'Usar días de la semana') : t('cu.useIntervals', 'Usar intervalos')}
                                        </button>
                                    </div>
                                )}
                                {openMenu?.type === 'TIME' && (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span className="cu-row-sub" style={{ fontSize: 14 }}>{t('habits.optionalAlarm', 'Alarma opcional')}</span>
                                        <TimePicker
                                            value={task.reminderTime || ''}
                                            className="cu-time"
                                            onChange={(val) => {
                                                patchSubtask(task.id, { reminderTime: val });
                                                if (val && permissions.notifications !== 'granted') requestPermissions();
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </Expand>
                    </Reorder.Item>
                ))}
            </Reorder.Group>
        </Section>
    );

    const splitPanel = (
        <Stack className="cu-tight">
            <Section footer={t('habits.divideMetaIntervals', 'Recordatorios automáticos durante el día')}>
                <Row
                    icon={<Repeat size={17} />}
                    iconColor="#5e5ce6"
                    label={t('cu.splitGoal', 'Dividir la meta')}
                    trailing={<Toggle checked={isDivided} onChange={setIsDivided} label={t('cu.splitGoal', 'Dividir la meta')} />}
                />
            </Section>
            {isDivided && (
                <Section>
                    <Pad small>
                        <Segmented<'INTERVAL' | 'FIXED'>
                            value={dividedMode}
                            onChange={setDividedMode}
                            options={[
                                { value: 'INTERVAL', label: t('habits.intervals', 'Intervalos') },
                                { value: 'FIXED', label: t('habits.fixedSchedules', 'Horarios fijos') },
                            ]}
                        />
                    </Pad>
                    {dividedMode === 'INTERVAL' ? (
                        <>
                            <InputRow label={t('habits.quantityPerTime', 'Cantidad por vez')} type="number" right inputMode="numeric" value={dividedQuantity} onChange={setDividedQuantity} suffix={unit} />
                            <InputRow label={t('common.every', 'Cada')} type="number" right inputMode="numeric" value={dividedInterval} onChange={setDividedInterval} suffix={t('common.min', 'min')} />
                        </>
                    ) : (
                        <>
                            {dividedTimes.map((item) => (
                                <div key={item.id} className="cu-row" style={{ gap: 10 }}>
                                    <TimePicker
                                        value={item.time}
                                        onChange={(val) => setDividedTimes(dividedTimes.map(d => d.id === item.id ? { ...d, time: val } : d))}
                                        className="cu-time"
                                    />
                                    <input
                                        className="cu-input cu-right cu-num"
                                        type="number"
                                        inputMode="numeric"
                                        value={item.amount || ''}
                                        placeholder="0"
                                        aria-label={t('common.qty', 'Cantidad')}
                                        onChange={(e) => setDividedTimes(dividedTimes.map(d => d.id === item.id ? { ...d, amount: parseInt(e.target.value) || 0 } : d))}
                                    />
                                    <span className="cu-row-sub" style={{ flex: 'none' }}>{unit}</span>
                                    <button type="button" className="cu-mini cu-del" onClick={() => setDividedTimes(dividedTimes.filter(d => d.id !== item.id))} aria-label={t('common.delete', 'Eliminar')}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            <Row
                                icon={<Plus size={17} strokeWidth={2.6} />}
                                iconColor="#30d158"
                                label={t('habits.addSchedule', 'Añadir horario')}
                                disabled={dividedTotal >= (targetNum || 0)}
                                onClick={() => {
                                    const remaining = Math.max(0, (targetNum || 0) - dividedTotal);
                                    if (remaining > 0) {
                                        const next = [...dividedTimes, { id: Date.now().toString(), time: '12:00', amount: remaining }];
                                        next.sort((a, b) => a.time.localeCompare(b.time));
                                        setDividedTimes(next);
                                    }
                                }}
                            />
                            <div className="cu-row" style={{ minHeight: 44 }}>
                                <span className="cu-row-sub">
                                    {dividedTotal > (targetNum || 0)
                                        ? t('cu.overBy', { defaultValue: 'Te pasas por {{n}} {{unit}}', n: dividedTotal - (targetNum || 0), unit })
                                        : dividedTotal < (targetNum || 0)
                                            ? t('cu.remaining', { defaultValue: 'Faltan {{n}} {{unit}} por asignar', n: (targetNum || 0) - dividedTotal, unit })
                                            : t('cu.allAssigned', 'Meta completamente asignada')}
                                </span>
                                <span className="cu-row-value" style={{ color: dividedTotal > (targetNum || 0) ? '#ff453a' : dividedTotal === (targetNum || 0) ? '#30d158' : undefined }}>
                                    {dividedTotal} / {targetNum || 0}
                                </span>
                            </div>
                        </>
                    )}
                </Section>
            )}
        </Stack>
    );

    const panelBody = panel === 'trait' ? (
        <Stack className="cu-tight">
            <div className="cu-group">
                <TraitGrid
                    attributes={attributes}
                    value={attrId}
                    registry={registry}
                    fallbackIcon={Star}
                    t={t}
                    onPick={(id) => {
                        if (id !== attrId) { setAttrId(id); setSubAttrId(''); }
                        const picked = attributes.find(a => a.id === id);
                        if (!picked?.subTraits?.length) setPanel(null);
                    }}
                />
            </div>
            {selectedAttr?.subTraits && selectedAttr.subTraits.length > 0 && (
                <Section label={t('habits.subTrait', 'Sub-rasgo')}>
                    <OptionList<string>
                        value={subAttrId}
                        onPick={(id) => { setSubAttrId(id); setPanel(null); }}
                        options={[
                            { id: '', title: t('common.none', 'Ninguno') },
                            ...selectedAttr.subTraits.map(st => ({ id: st.id, title: st.name, sub: `Lvl ${st.level}` })),
                        ]}
                    />
                </Section>
            )}
        </Stack>
    ) : panel === 'icon' ? (
        <Section>
            <Pad small>
                <IconPicker
                    selectedIcon={customIconName}
                    onSelectIcon={setCustomIconName}
                    selectedColor={customColor}
                    onSelectColor={setCustomColor}
                />
            </Pad>
        </Section>
    ) : panel === 'super' ? (
        <Stack className="cu-tight">
            <div className="cu-group">
                <div className="cu-trait-grid">
                    {SUPER_HABIT_LIST.map((theme) => {
                        const on = superId === theme.id;
                        const Icon = theme.icon;
                        return (
                            <button
                                key={theme.id}
                                type="button"
                                className={`cu-trait ${on ? 'cu-on' : ''}`}
                                style={{ ['--cu-trait' as any]: theme.colors.primary }}
                                onClick={() => handleSuperSelect(theme.id)}
                                aria-pressed={on}
                            >
                                <span className="cu-trait-ico" style={{ background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})` }}>
                                    <Icon size={19} style={{ color: '#fff' }} />
                                </span>
                                <span className="cu-trait-name">{theme.name}</span>
                                {on && <Check size={12} strokeWidth={3} style={{ position: 'absolute', top: 6, right: 6, color: '#fff' }} />}
                            </button>
                        );
                    })}
                </div>
            </div>
            {superId && (
                <Section footer={t('cu.superHabitHint', 'Roadmap de 60 días, insignias y efectos')}>
                    <Row label={t('cu.removeSuper', 'Quitar súper hábito')} danger onClick={() => handleSuperSelect(null)} />
                </Section>
            )}
        </Stack>
    ) : panel === 'project' ? (
        <Section>
            <Row className="cu-option" label={t('habits.noProject', 'Sin proyecto')} selected={!projectId} onClick={() => { setProjectId(''); setPanel(null); }} />
            {projects.map(p => {
                const attr = attributes.find(a => a.id === p.attribute);
                return (
                    <Row
                        key={p.id}
                        className="cu-option"
                        icon={<Target size={16} />}
                        iconColor={attr?.color || '#5e5ce6'}
                        label={p.title}
                        selected={projectId === p.id}
                        onClick={() => {
                            setProjectId(p.id);
                            if (p.attribute) { setAttrId(p.attribute); setSubAttrId(''); }
                            setPanel(null);
                        }}
                    />
                );
            })}
        </Section>
    ) : panel === 'duration' ? (
        <DurationPicker value={estimatedTime} onChange={setEstimatedTime} />
    ) : panel === 'monthly' ? (
        <Stack className="cu-tight">
            <Section>
                <Pad small>
                    <Segmented<'SPECIFIC_DATES' | 'FLEXIBLE_COUNT'>
                        value={monthlyType}
                        onChange={setMonthlyType}
                        options={[
                            { value: 'SPECIFIC_DATES', label: t('cu.specificDates', 'Fechas concretas') },
                            { value: 'FLEXIBLE_COUNT', label: t('cu.flexible', 'Flexible') },
                        ]}
                    />
                </Pad>
                {monthlyType === 'SPECIFIC_DATES' ? (
                    <>
                        <Pad><DateNumberGrid selected={weekDays} onToggle={(d) => setWeekDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d])} /></Pad>
                        <Row
                            label={t('lastDayOfMonth', 'Último día del mes')}
                            trailing={<Toggle checked={monthlyLastDay} onChange={setMonthlyLastDay} label={t('lastDayOfMonth', 'Último día del mes')} />}
                        />
                    </>
                ) : (
                    <InputRow
                        label={t('timesPerMonth', 'Veces al mes')}
                        type="number" right inputMode="numeric" min={1} max={31}
                        value={String(monthlyFlexibleCount)}
                        onChange={clampCount(setMonthlyFlexibleCount, 31)}
                    />
                )}
            </Section>
        </Stack>
    ) : panel === 'split' ? splitPanel
      : panel === 'list' ? itemList
      : null;

    return (
        <CupertinoSheet
            isOpen={isOpen}
            onClose={onClose}
            accent={activeColor}
            title={isEditing ? t('habits.editHabit', 'Editar hábito') : t('habits.newHabit', 'Nuevo hábito')}
            subtitle={t('habits.lifeProtocol', 'Protocolo de vida')}
            primaryLabel={isEditing ? t('cu.save', 'Guardar') : t('cu.create', 'Crear')}
            onPrimary={handleConfirm}
            primaryDisabled={!canSubmit}
            primaryLoading={isSubmitting}
            closeDisabled={isSubmitting}
            scrollRef={scrollRef}
            maxWidth={460}
            doneLabel={t('cu.done', 'Listo')}
            subpanel={panel ? { title: panelTitle[panel], onBack: () => setPanel(null), children: panelBody } : null}
            headerExtra={!isEditing && onSwitchToBadHabit ? (
                <Segmented<'habit' | 'vice'>
                    value="habit"
                    onChange={(v) => { if (v === 'vice') onSwitchToBadHabit(); }}
                    options={[
                        { value: 'habit', label: t('habits.habit', 'Hábito') },
                        { value: 'vice', label: t('habits.vice', 'Vicio'), dataTour: 'habit-modal-vice-switch' },
                    ]}
                />
            ) : undefined}
            footer={canSubmit
                ? (
                    <RewardPreview
                        xp={prediction.xp}
                        traitXp={prediction.traitXp}
                        coins={prediction.coins}
                        traitColor={selectedAttr?.color || activeColor}
                        TraitIcon={TraitIcon}
                        traitLabel={activeLabel}
                        bonus={prediction.bonusApplied}
                        xpLabel={t('common.xp', 'XP')}
                        goldLabel={t('common.gold', 'Oro')}
                    />
                )
                : <Hint>{t('cu.missingPrefix', 'Falta')}: <b>{missing.join(' · ')}</b></Hint>}
        >
            <Stack className="cu-tight">
                {/* Name + super habit */}
                <Hero
                    tile={<SelectedIcon size={28} />}
                    tileColor={activeColor}
                    value={title}
                    onChange={setTitle}
                    maxLength={15}
                    placeholder={t('habits.protocolNamePlaceholder', 'Nombre del hábito')}
                    trailing={
                        <SuperHabitButton
                            value={superId}
                            open={panel === 'super'}
                            onToggle={() => setPanel(p => p === 'super' ? null : 'super')}
                        />
                    }
                />

                <div className="cu-desc">
                    <FileText size={17} />
                    <input
                        className="cu-input"
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        placeholder={t('habits.descriptionPlaceholder', 'Descripción…')}
                        aria-label={t('habits.descriptionPlaceholder', 'Descripción…')}
                    />
                </div>

                {/* When it repeats */}
                <Segmented
                    tall
                    value={freq}
                    onChange={(f) => { if (f !== freq) setWeekDays([]); setFreq(f); }}
                    options={['DAILY', 'WEEKLY', 'MONTHLY'].map(f => ({ value: f, label: t(`modals.habit.frequencies.${f}`) }))}
                />

                {freq === 'WEEKLY' && (
                    <>
                        {weeklyType === 'SPECIFIC_DAYS' ? (
                            <DayPicker days={weekDaysList} selected={weekDays} onToggle={(i) => setWeekDays(p => p.includes(i) ? p.filter(d => d !== i) : [...p, i])} />
                        ) : (
                            <div className="cu-mini-field">
                                <span style={{ flex: 1 }}>{t('timesPerWeek', 'Veces por semana')}</span>
                                <input className="cu-input cu-num" style={{ width: 60 }} type="number" inputMode="numeric" min={1} max={7} value={String(weeklyFlexibleCount)} onChange={(e) => clampCount(setWeeklyFlexibleCount, 7)(e.target.value)} aria-label={t('timesPerWeek', 'Veces por semana')} />
                            </div>
                        )}
                        <div className="cu-linkrow">
                            <button type="button" className="cu-link" style={{ fontSize: 13.5 }} onClick={() => setWeeklyType(weeklyType === 'SPECIFIC_DAYS' ? 'FLEXIBLE_COUNT' : 'SPECIFIC_DAYS')}>
                                {weeklyType === 'SPECIFIC_DAYS' ? t('cu.useCount', 'Prefiero un número de veces por semana') : t('cu.useDays', 'Prefiero elegir los días')}
                            </button>
                        </div>
                    </>
                )}

                {freq === 'MONTHLY' && (
                    <Tiles cols={1}>
                        <Tile
                            icon={<Calendar size={14} />}
                            color="#ff453a"
                            label={t('cu.monthDays', 'Días del mes')}
                            value={monthlySummary || t('cu.choose', 'Elegir')}
                            onClick={() => setPanel('monthly')}
                        />
                    </Tiles>
                )}

                {/* How it is measured */}
                <Segmented<Logic> tall value={logic} onChange={setLogic} options={logicOptions} />

                {logic === 'QUANTITY' && (
                    <>
                        <div className="cu-pair">
                            <div className="cu-mini-field">
                                <span>{t('modals.habit.target', 'Meta')}</span>
                                <input className="cu-input cu-num" type="number" inputMode="numeric" placeholder="10" value={target} onChange={(e) => setTarget(e.target.value)} aria-label={t('modals.habit.target', 'Meta')} />
                            </div>
                            <div className="cu-mini-field">
                                <span>{t('modals.habit.unit', 'Unidad')}</span>
                                <input className="cu-input" placeholder={t('habits.pagesPlaceholder', 'páginas')} value={unit} onChange={(e) => setUnit(e.target.value)} aria-label={t('modals.habit.unit', 'Unidad')} />
                            </div>
                        </div>
                        <div className="cu-linkrow">
                            <button type="button" className="cu-link" style={{ fontSize: 13.5 }} onClick={() => setPanel('split')}>
                                <Repeat size={14} /> {isDivided ? t('cu.splitOn', 'Meta dividida · editar') : t('cu.splitGoal', 'Dividir la meta')}
                            </button>
                        </div>
                    </>
                )}

                {logic === 'CHECKLIST' && (
                    <Tiles cols={1}>
                        <Tile
                            icon={<List size={14} />}
                            color="#ffd60a"
                            label={t('cu.steps', 'Pasos')}
                            value={activeSteps.length ? t('cu.stepsCount', { defaultValue: '{{n}} pasos · editar', n: activeSteps.length }) : t('cu.addSteps', 'Añadir pasos')}
                            onClick={() => setPanel('list')}
                        />
                    </Tiles>
                )}

                {/* Details as tiles */}
                <Tiles cols={3}>
                    <Tile
                        icon={<TraitIcon size={14} />}
                        color={selectedAttr?.color || '#0a84ff'}
                        label={t('cu.trait', 'Rasgo')}
                        value={hasTrait ? activeLabel : t('habits.selectTrait', 'Elegir')}
                        onClick={() => setPanel('trait')}
                    />
                    <Tile
                        icon={<Palette size={14} />}
                        color="#bf5af2"
                        label={t('cu.icon', 'Icono')}
                        value={customIconName || customColor ? t('cu.custom', 'Personal') : t('cu.auto', 'Automático')}
                        onClick={() => setPanel('icon')}
                    />
                    <Tile
                        icon={<Zap size={14} />}
                        color={IMPACT_COLORS[impact - 1]}
                        label={t('cu.impactShort', 'Impacto')}
                        onClick={() => setImpact(impact >= 4 ? 1 : impact + 1)}
                    >
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <MiniMeter value={impact} colors={IMPACT_COLORS} />
                        </span>
                    </Tile>
                    <Tile span={2} icon={<Bell size={14} />} color="#ff9f0a" label={t('modals.habit.alert', 'Alarma')} active={!alarmOk && !isEditing}>
                        <TimePicker value={reminder} onChange={onAlarmChange} className="cu-time" />
                    </Tile>
                    <Tile
                        icon={<Layers size={14} />}
                        color="#5e5ce6"
                        label={t('cu.duration', 'Duración')}
                        value={estimatedTime > 0 ? (estimatedTime >= 60 ? `${+(estimatedTime / 60).toFixed(1)} h` : `${estimatedTime} min`) : t('cu.undefined', 'Sin definir')}
                        onClick={() => setPanel('duration')}
                    />
                    <Tile
                        span={3}
                        icon={<Target size={14} />}
                        color="#64d2ff"
                        label={t('cu.project', 'Proyecto')}
                        value={linkedProject?.title || t('habits.noProject', 'Ninguno')}
                        onClick={() => setPanel('project')}
                    />
                </Tiles>

                {reminder && (permissions.notifications !== 'granted' && permissions.notifications !== 'unknown') && (
                    <Notice tone="danger" icon={<AlertCircle size={16} />} action={t('common.activate', 'Activar')} onClick={requestPermissions}>
                        {t('habits.missingPermissions', 'Faltan permisos de notificación')}
                    </Notice>
                )}
                {reminder && (
                    <div className="cu-linkrow">
                        <button type="button" className="cu-link" style={{ fontSize: 13, color: 'var(--cu-label-2)' }} onClick={openSystemSettings}>
                            <Zap size={13} /> {t('habits.batteryBackground', 'Batería / segundo plano')} · {t('common.review', 'Revisar')}
                        </button>
                    </div>
                )}
            </Stack>
        </CupertinoSheet>
    );
}, (prev, next) => {
    if (!prev.isOpen && !next.isOpen) return true;
    return prev.isOpen === next.isOpen && prev.initialData === next.initialData;
});
