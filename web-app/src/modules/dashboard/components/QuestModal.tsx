import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Star, Circle, Square, Triangle, Target, Repeat, Hexagon, Hourglass, CalendarDays, Clock, BookOpen, FileText, Palette, X, Timer } from 'lucide-react';
import { Attribute, Quest, Project } from '../../../types';
import { SmartProject } from '../../../types/SmartGoal';
import { Difficulty, calculateTaskRewards } from '../../../utils/rewardCalculator';
import { useTranslation } from 'react-i18next';
import { DurationPicker } from './DurationPicker';
import { toLocalISOString, parseLocalDate } from '../../../utils/dateUtils';
import { DateSelectionModal } from './DateSelectionModal';
import { TimePicker } from '../../../components/ui/TimePicker';
import {
    CupertinoSheet, Stack, Section, Hero, Row, Segmented, Toggle, Stepper, Chip, DateNumberGrid, Swatches, TraitGrid,
    OptionList, RewardPreview, SheetSkeleton, Pad, Tiles, Tile, WizardSheet, resolveTraitIcon, traitLabelOf,
    type WizardStep,
} from '../../../components/cupertino';

// Full lucide set is loaded lazily the first time the trait picker opens (keeps modal entry light on Android).
let LucideIconsCache: Record<string, React.ElementType> | null = null;
const loadLucideIcons = async (): Promise<Record<string, React.ElementType>> => {
    if (LucideIconsCache) return LucideIconsCache;
    const mod = await import('@/utils/lucideRegistry');
    LucideIconsCache = mod as unknown as Record<string, React.ElementType>;
    return LucideIconsCache;
};

const JOURNAL_COLORS = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#eab308'];
const ALL_MONTHS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

type RecurrenceKind = 'NONE' | 'INTERVAL' | 'WEEKLY' | 'MONTHLY';
type Panel = null | 'duration' | 'trait' | 'project' | 'repeat';
type DateMode = 'today' | 'tomorrow' | 'custom';

const formatMinutes = (m: number) => (m >= 60 ? `${+(m / 60).toFixed(1)} h` : `${m} min`);

export const QuestModal = React.memo(({
    isOpen,
    onClose,
    attributes = [],
    projects = [],
    smartProjects = [],
    onConfirm,
    lockedAttributeId,
    lockedDate,
    lockedSmartProjectId,
    isSmartTask,
    initialValues
}: {
    isOpen: boolean,
    onClose: () => void,
    attributes?: Attribute[],
    projects?: Project[],
    smartProjects?: SmartProject[],
    onConfirm: (data: Partial<Quest>) => Promise<void> | void,
    lockedAttributeId?: string,
    lockedDate?: string,
    lockedSmartProjectId?: string,
    isSmartTask?: boolean,
    initialValues?: Partial<Quest> | null
}) => {
    const { t } = useTranslation();

    // Render only the sheet shell on the first frame; the form mounts one frame later so the entry
    // animation stays smooth on low-end Android devices.
    const [isContentReady, setIsContentReady] = useState(false);
    useEffect(() => {
        if (!isOpen) { setIsContentReady(false); return; }
        const rafId = requestAnimationFrame(() => setIsContentReady(true));
        return () => cancelAnimationFrame(rafId);
    }, [isOpen]);

    // Form state
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [attrId, setAttrId] = useState('DISCIPLINA');
    const [subAttrId, setSubAttrId] = useState('');
    const [projectId, setProjectId] = useState('');
    const [difficulty, setDifficulty] = useState<Difficulty>('C');
    const [deadline, setDeadline] = useState(toLocalISOString(new Date()));
    const [deadlineTime, setDeadlineTime] = useState<string>('');
    const [recurrenceType, setRecurrenceType] = useState<RecurrenceKind>('NONE');
    const [recurrenceInterval, setRecurrenceInterval] = useState<number>(1);
    const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
    const [recurrenceMonths, setRecurrenceMonths] = useState<number[]>(ALL_MONTHS);
    const [monthlyType, setMonthlyType] = useState<'SPECIFIC_DATES' | 'LAST_DAY'>('SPECIFIC_DATES');
    const [showInJournaling, setShowInJournaling] = useState<boolean>(false);
    const [journalIconColor, setJournalIconColor] = useState<string>('#3b82f6');
    const [estimatedTime, setEstimatedTime] = useState(0);
    const [pomodoroTarget, setPomodoroTarget] = useState<number>(0);
    const [pomodoroCompleted, setPomodoroCompleted] = useState<number>(0);
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [panel, setPanel] = useState<Panel>(null);
    const [step, setStep] = useState(0);
    const [, setIconsLoaded] = useState(false);

    const openPanel = useCallback(async (next: Exclude<Panel, null>) => {
        if (next === 'trait' && !LucideIconsCache) {
            await loadLucideIcons();
            setIconsLoaded(true); // re-render so the picker icons resolve
        }
        setPanel(next);
    }, []);

    // Smart auto-linking by keywords in the title
    useEffect(() => {
        if (!title || initialValues?.attribute || lockedAttributeId) return;
        for (const attr of (attributes || [])) {
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
    }, [title, attributes, lockedAttributeId, initialValues]);

    // Apply locked props / initial values whenever the sheet opens
    useEffect(() => {
        if (!isOpen) return;
        setIsSubmitting(false);
        setPanel(null);
        setStep(0);
        if (initialValues) {
            setTitle(initialValues.title || '');
            setDesc(initialValues.description || '');
            setAttrId(initialValues.attribute || '');
            setSubAttrId(initialValues.subAttribute || '');
            setProjectId(initialValues.projectId || initialValues.smartProjectId || '');
            setDifficulty((initialValues.difficulty as Difficulty) || 'C');
            setDeadline(initialValues.deadline || toLocalISOString(new Date()));
            setDeadlineTime(initialValues.deadlineTime || '');
            setEstimatedTime(initialValues.estimatedTime || 0);
            setPomodoroTarget(initialValues.pomodoroTarget || 0);
            setPomodoroCompleted(initialValues.pomodoroCompleted || 0);
            setShowInJournaling(initialValues.showInJournaling || false);
            setJournalIconColor(initialValues.journalIconColor || '#3b82f6');
            if (initialValues.recurrence) {
                setRecurrenceType(initialValues.recurrence.type || 'NONE');
                setRecurrenceInterval(initialValues.recurrence.interval || 1);
                setRecurrenceDays(initialValues.recurrence.days || []);
                setRecurrenceMonths(initialValues.recurrence.months || ALL_MONTHS);
                setMonthlyType(initialValues.recurrence.monthlyType || 'SPECIFIC_DATES');
            } else {
                setRecurrenceType('NONE');
                setRecurrenceInterval(1);
                setRecurrenceDays([]);
                setRecurrenceMonths(ALL_MONTHS);
                setMonthlyType('SPECIFIC_DATES');
            }
        } else {
            setTitle('');
            setDesc('');
            setAttrId('DISCIPLINA');
            setSubAttrId('');
            setProjectId('');
            setDifficulty('C');
            setDeadline(toLocalISOString(new Date()));
            setDeadlineTime('');
            setEstimatedTime(0);
            setPomodoroTarget(0);
            setPomodoroCompleted(0);
            setRecurrenceType('NONE');
            setRecurrenceInterval(1);
            setRecurrenceDays([]);
            setRecurrenceMonths(ALL_MONTHS);
            setMonthlyType('SPECIFIC_DATES');
            setShowInJournaling(false);
            setJournalIconColor('#3b82f6');
        }
        if (lockedAttributeId) setAttrId(lockedAttributeId);
        if (lockedDate) setDeadline(lockedDate);
    }, [isOpen, lockedAttributeId, lockedDate, initialValues]);

    const selectedAttr = attributes?.find((a) => a.id === attrId);
    const activeColor = selectedAttr ? selectedAttr.color : '#0a84ff';
    const SelectedIcon = useMemo(
        () => resolveTraitIcon(selectedAttr, LucideIconsCache, Star),
        [selectedAttr, panel] // `panel` changes after the lazy icon registry loads
    );
    const activeLabel = selectedAttr ? traitLabelOf(selectedAttr, t) : t('modals.project.traitDefault', 'Trait');

    const selectedProject = projects.find(p => p.id === projectId);
    const selectedSmartProject = smartProjects.find(p => p.id === (lockedSmartProjectId || initialValues?.smartProjectId));
    const linkedProjectTitle = projectId
        ? (selectedProject?.title || smartProjects.find(p => p.id === projectId)?.mainGoal || '')
        : '';

    const prediction = useMemo(() => {
        const multipliers: Record<Difficulty, number> = { 'C': 1, 'B': 2, 'A': 3, 'S': 4 };
        return calculateTaskRewards(estimatedTime, multipliers[difficulty], 0, 'TASK');
    }, [estimatedTime, difficulty]);

    const difficulties = useMemo(() => [
        { value: 'C' as Difficulty, label: t('modals.quest.difficulties.Basic'), icon: <Circle size={11} style={{ color: '#64d2ff' }} /> },
        { value: 'B' as Difficulty, label: t('modals.quest.difficulties.Medium'), icon: <Square size={11} style={{ color: '#30d158' }} /> },
        { value: 'A' as Difficulty, label: t('modals.quest.difficulties.Hard'), icon: <Triangle size={11} style={{ color: '#ff9f0a' }} /> },
        { value: 'S' as Difficulty, label: t('modals.quest.difficulties.Epic'), icon: <Star size={11} style={{ color: '#bf5af2' }} /> },
    ], [t]);

    const canSubmit = !!title.trim() && !!attrId && !isSubmitting;

    const handleConfirm = async () => {
        if (!canSubmit) return;
        setIsSubmitting(true);

        const finalSmartProjectId = lockedSmartProjectId ||
            smartProjects.find(p => p.id === projectId)?.id ||
            initialValues?.smartProjectId;
        const finalProjectId = smartProjects.find(p => p.id === projectId) ? '' : projectId;

        try {
            await onConfirm({
                ...(initialValues?.id ? { id: initialValues.id } : {}),
                title,
                description: desc,
                attribute: attrId,
                subAttribute: (subAttrId || null) as any,
                projectId: finalProjectId,
                smartProjectId: finalSmartProjectId,
                difficulty,
                deadline,
                deadlineTime: deadlineTime || undefined,
                estimatedTime,
                pomodoroTarget,
                pomodoroCompleted,
                subtasks: [],
                xpReward: prediction.xp,
                gold: prediction.coins,
                isSmartQuest: isSmartTask || !!finalSmartProjectId,
                showInJournaling,
                journalIconColor,
                recurrence: recurrenceType !== 'NONE' ? {
                    type: recurrenceType,
                    interval: recurrenceInterval,
                    days: recurrenceDays,
                    monthlyType,
                    months: recurrenceMonths
                } : { type: 'NONE' }
            });
        } catch (error) {
            console.error('Failed to save quest', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isEditing = !!initialValues;
    const sheetTitle = isEditing ? t('modals.quest.titleEdit') : (isSmartTask ? t('modals.quest.titleSmart') : t('modals.quest.titleNew'));
    const sheetSubtitle = lockedSmartProjectId
        ? `${t('cu.mission', 'Misión')}: ${selectedSmartProject?.mainGoal || t('cu.active', 'Activa')}`
        : lockedDate
            ? t('cu.linkedTo', { defaultValue: 'Para el {{date}}', date: lockedDate })
            : (isSmartTask ? t('modals.quest.linkedStrategy') : undefined);

    // Quick date: Today / Tomorrow / custom
    const todayISO = toLocalISOString(new Date());
    const tomorrowISO = useMemo(() => { const d = new Date(); d.setDate(d.getDate() + 1); return toLocalISOString(d); }, [todayISO]);
    const dateMode: DateMode = deadline === todayISO ? 'today' : deadline === tomorrowISO ? 'tomorrow' : 'custom';
    const dateObj = parseLocalDate(deadline);
    const customLabel = dateMode === 'custom'
        ? dateObj.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: dateObj.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined })
        : t('cu.pickDate', 'Elegir fecha');

    const toggleIn = (setter: React.Dispatch<React.SetStateAction<number[]>>, n: number) =>
        setter(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n].sort((a, b) => a - b));

    const repeatValue = recurrenceType === 'NONE'
        ? t('tasks.recurrence.none', 'Nunca')
        : recurrenceType === 'INTERVAL'
            ? t('cu.everyNDays', { defaultValue: 'Cada {{count}} día(s)', count: recurrenceInterval })
            : t('tasks.recurrence.monthly', 'Mensual');

    // ── Detail panels (open inside the sheet — no scrolling the main page) ──
    const panelTitle: Record<Exclude<Panel, null>, string> = {
        duration: t('cu.duration', 'Duración'),
        trait: t('cu.trait', 'Rasgo'),
        project: t('cu.project', 'Proyecto'),
        repeat: t('cu.repeat', 'Repetición'),
    };

    const panelBody = panel === 'duration' ? (
        <DurationPicker value={estimatedTime} onChange={setEstimatedTime} />
    ) : panel === 'trait' ? (
        <Stack className="cu-tight">
            <div className="cu-group">
                <TraitGrid
                    attributes={attributes}
                    value={attrId}
                    registry={LucideIconsCache}
                    fallbackIcon={Hexagon}
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
    ) : panel === 'project' ? (
        <Stack className="cu-tight">
            <Section>
                <Row className="cu-option" label={t('modals.quest.noProject')} selected={!projectId} onClick={() => { setProjectId(''); setPanel(null); }} />
                {smartProjects.filter(Boolean).map(p => (
                    <Row
                        key={p.id}
                        className="cu-option"
                        icon={<Target size={16} />}
                        iconColor={p.traitColor || attributes.find(a => a?.id === p.traitId)?.color || '#5e5ce6'}
                        label={p.mainGoal}
                        sub={t('quests.strategy', 'Estrategia')}
                        selected={projectId === p.id}
                        onClick={() => {
                            setProjectId(p.id);
                            if (p.traitId) { setAttrId(p.traitId); setSubAttrId(''); }
                            setPanel(null);
                        }}
                    />
                ))}
                {projects.filter(Boolean).map(p => {
                    const attr = attributes.find(a => a?.id === p.attribute);
                    return (
                        <Row
                            key={p.id}
                            className="cu-option"
                            icon={<Target size={16} />}
                            iconColor={attr?.color || '#5e5ce6'}
                            label={p.title}
                            sub={attr ? traitLabelOf(attr, t) : t('quests.protocols', 'Protocolo')}
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
            {projectId && projectId !== 'none' && (
                <Section footer={t('cu.pomodorosHint', 'Guía de pomodoros para completar la tarea')}>
                    <Row
                        icon={<Hourglass size={17} />}
                        iconColor="#ff9f0a"
                        label={t('cu.pomodoros', 'Pomodoros objetivo')}
                        value={pomodoroTarget || t('cu.noLimit', 'Sin límite')}
                        trailing={<Stepper value={pomodoroTarget} min={0} max={10} onChange={setPomodoroTarget} label="Pomodoros" />}
                    />
                </Section>
            )}
        </Stack>
    ) : panel === 'repeat' ? (
        <Stack className="cu-tight">
            <Section>
                <Pad small>
                    <Segmented<RecurrenceKind>
                        value={recurrenceType}
                        onChange={(type) => { setRecurrenceType(type); setRecurrenceDays([]); }}
                        options={[
                            { value: 'NONE', label: t('tasks.recurrence.none', 'Nunca') },
                            { value: 'INTERVAL', label: t('tasks.recurrence.interval', 'Intervalo') },
                            { value: 'MONTHLY', label: t('tasks.recurrence.monthly', 'Mensual') },
                        ]}
                    />
                </Pad>
                {recurrenceType === 'INTERVAL' && (
                    <Row
                        icon={<Repeat size={17} />}
                        iconColor="#30d158"
                        label={t('tasks.recurrence.everyDays', 'Repetir cada X días')}
                        value={recurrenceInterval}
                        trailing={<Stepper value={recurrenceInterval} min={1} max={365} onChange={setRecurrenceInterval} label="Interval" />}
                    />
                )}
                {recurrenceType === 'MONTHLY' && (
                    <>
                        <Pad>
                            <div className="cu-section-label" style={{ padding: '0 0 8px' }}>
                                {t('tasks.recurrence.months', 'Meses')} · {recurrenceMonths.length === 12 ? t('common.all', 'Todos') : recurrenceMonths.length}
                            </div>
                            <div className="cu-month-grid">
                                {ALL_MONTHS.map((index) => (
                                    <Chip key={index} soft on={recurrenceMonths.includes(index)} onClick={() => toggleIn(setRecurrenceMonths, index)}>
                                        {new Date(2024, index, 1).toLocaleDateString(undefined, { month: 'short' }).replace('.', '')}
                                    </Chip>
                                ))}
                            </div>
                        </Pad>
                        <Pad>
                            <div className="cu-section-label" style={{ padding: '0 0 8px' }}>{t('tasks.recurrence.days', 'Días')}</div>
                            <DateNumberGrid selected={recurrenceDays} onToggle={(d) => toggleIn(setRecurrenceDays, d)} />
                        </Pad>
                        <Row
                            label={t('habits.lastDayOfMonth', 'Último día del mes')}
                            trailing={<Toggle checked={monthlyType === 'LAST_DAY'} onChange={(v) => setMonthlyType(v ? 'LAST_DAY' : 'SPECIFIC_DATES')} label={t('habits.lastDayOfMonth', 'Último día del mes')} />}
                        />
                    </>
                )}
            </Section>
            {recurrenceType !== 'NONE' && (
                <Section>
                    <Row
                        icon={<BookOpen size={17} />}
                        iconColor="#30d158"
                        label={t('quests.showInJournaling', 'Mostrar en el Journaling')}
                        sub={t('quests.addToJournalCalendar', 'Agrega esta tarea al calendario de Journal')}
                        trailing={<Toggle checked={showInJournaling} onChange={setShowInJournaling} label={t('quests.showInJournaling', 'Mostrar en el Journaling')} />}
                    />
                    {showInJournaling && (
                        <Pad>
                            <div className="cu-section-label" style={{ padding: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Palette size={13} /> {t('quests.iconColor', 'Color del icono')}
                            </div>
                            <Swatches colors={JOURNAL_COLORS} value={journalIconColor} onChange={setJournalIconColor} />
                        </Pad>
                    )}
                </Section>
            )}
        </Stack>
    ) : null;

    const useWizard = !initialValues?.id;
    const dateRow = lockedDate ? (
        <div className="cu-desc" style={{ justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><CalendarDays size={17} />{t('modals.quest.dueDate')}</span>
            <b style={{ fontWeight: 600 }}>{dateObj.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</b>
        </div>
    ) : (
        <Segmented<DateMode>
            tall
            value={dateMode}
            onChange={(m) => {
                if (m === 'today') setDeadline(todayISO);
                else if (m === 'tomorrow') setDeadline(tomorrowISO);
                else setIsDateModalOpen(true);
            }}
            options={[
                { value: 'today', label: t('dashboard.today', 'Hoy') },
                { value: 'tomorrow', label: t('cu.tomorrow', 'Mañana') },
                { value: 'custom', label: customLabel, icon: <CalendarDays size={13} /> },
            ]}
        />
    );
    const timeTile = (
        <Tile icon={<Clock size={14} />} color="#ff9f0a" label={t('modals.quest.dueTime', 'Hora')}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <TimePicker value={deadlineTime} onChange={setDeadlineTime} className="cu-time" label={t('modals.quest.dueTime', 'Hora')} />
                {deadlineTime && (
                    <button type="button" className="cu-mini" style={{ width: 22, height: 22 }} onClick={() => setDeadlineTime('')} aria-label={t('common.clear', 'Quitar')}>
                        <X size={12} strokeWidth={2.6} />
                    </button>
                )}
            </span>
        </Tile>
    );
    const repeatTile = (span?: 2) => (
        <Tile span={span} icon={<Repeat size={14} />} color="#30d158" label={t('cu.repeat', 'Repetición')} value={repeatValue} onClick={() => openPanel('repeat')} />
    );
    const traitTile = (
        <Tile
            icon={<SelectedIcon size={14} />}
            color={activeColor}
            label={t('cu.trait', 'Rasgo')}
            value={activeLabel}
            onClick={() => !lockedAttributeId && openPanel('trait')}
            disabled={!!lockedAttributeId}
        />
    );
    const projectTile = (
        <Tile
            icon={<Target size={14} />}
            color="#0a84ff"
            label={t('cu.project', 'Proyecto')}
            value={linkedProjectTitle || t('modals.quest.noProject')}
            onClick={() => openPanel('project')}
        />
    );
    const subpanel = panel ? { title: panelTitle[panel], onBack: () => setPanel(null), children: panelBody } : null;
    const dateOverlay = (
        <DateSelectionModal
            isOpen={isDateModalOpen}
            onClose={() => setIsDateModalOpen(false)}
            onSelect={(date) => setDeadline(toLocalISOString(date))}
            mode="DAY"
            currentDate={parseLocalDate(deadline)}
        />
    );
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

    // ── Creation: four blocks, one at a time ─────────────────────────────────
    if (useWizard) {
        const steps: WizardStep[] = [
            {
                key: 'what',
                title: t('cu.wiz.task.t1', '¿Qué quieres hacer?'),
                hint: t('cu.wiz.task.h1', 'Dale un nombre claro a tu tarea. Puedes añadir una nota si quieres.'),
                icon: <Star size={16} />,
                valid: !!title.trim(),
                missing: t('cu.wiz.nameFirst', 'Escribe un nombre para continuar'),
                content: (
                    <>
                        <div>
                            <p className="cu-field-label">{t('cu.wiz.name', 'Nombre')}</p>
                            <div className="cu-bigfield">
                                <input
                                    className="cu-input"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder={t('modals.quest.namePlaceholder')}
                                    aria-label={t('cu.wiz.name', 'Nombre')}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div>
                            <p className="cu-field-label">{t('cu.wiz.note', 'Nota (opcional)')}</p>
                            <div className="cu-desc">
                                <FileText size={17} />
                                <input className="cu-input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t('modals.quest.briefingPlaceholder')} aria-label={t('cu.wiz.note', 'Nota (opcional)')} />
                            </div>
                        </div>
                    </>
                ),
            },
            {
                key: 'when',
                title: t('cu.wiz.task.t2', '¿Cuándo lo harás?'),
                hint: t('cu.wiz.task.h2', 'Elige el día y, si quieres, la hora y si se repite.'),
                icon: <CalendarDays size={16} />,
                valid: true,
                content: (
                    <>
                        {dateRow}
                        <Tiles cols={2}>{timeTile}{repeatTile()}</Tiles>
                    </>
                ),
            },
            {
                key: 'effort',
                title: t('cu.wiz.task.t3', '¿Cuánto esfuerzo requiere?'),
                hint: t('cu.wiz.task.h3', 'Esto define cuánta recompensa recibes al completarla.'),
                icon: <Timer size={16} />,
                valid: true,
                content: (
                    <>
                        <Segmented<Difficulty> tall value={difficulty} onChange={setDifficulty} options={difficulties} />
                        <DurationPicker value={estimatedTime} onChange={setEstimatedTime} />
                    </>
                ),
            },
            {
                key: 'organize',
                title: t('cu.wiz.task.t4', 'Organízala'),
                hint: t('cu.wiz.task.h4', 'Elige a qué rasgo pertenece y si forma parte de un proyecto.'),
                icon: <Target size={16} />,
                valid: !!attrId,
                missing: t('cu.wiz.traitFirst', 'Elige un rasgo para continuar'),
                content: <Tiles cols={2}>{traitTile}{projectTile}</Tiles>,
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
                finishLabel={t('cu.wiz.createTask', 'Crear tarea')}
                finishing={isSubmitting}
                glyph={<SelectedIcon size={34} />}
                name={title}
                lastExtra={rewardPreview}
                subpanel={subpanel}
                overlays={dateOverlay}
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
            title={sheetTitle}
            subtitle={sheetSubtitle}
            primaryLabel={t('cu.save', 'Guardar')}
            onPrimary={handleConfirm}
            primaryDisabled={!canSubmit}
            primaryLoading={isSubmitting}
            maxWidth={460}
            doneLabel={t('cu.done', 'Listo')}
            subpanel={subpanel}
            footer={isContentReady ? rewardPreview : undefined}
            overlays={dateOverlay}
        >
            {!isContentReady ? <SheetSkeleton /> : (
                <Stack className="cu-tight">
                    <Hero
                        tile={<SelectedIcon size={28} />}
                        tileColor={activeColor}
                        value={title}
                        onChange={setTitle}
                        placeholder={t('modals.quest.namePlaceholder')}
                    />
                    <div className="cu-desc">
                        <FileText size={17} />
                        <input
                            className="cu-input"
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            placeholder={t('modals.quest.briefingPlaceholder')}
                            aria-label={t('modals.quest.briefingPlaceholder')}
                        />
                    </div>
                    {dateRow}
                    <Segmented<Difficulty> tall value={difficulty} onChange={setDifficulty} options={difficulties} />
                    <Tiles cols={3}>
                        {timeTile}
                        <Tile
                            icon={<Timer size={14} />}
                            color="#5e5ce6"
                            label={t('cu.duration', 'Duración')}
                            value={estimatedTime > 0 ? formatMinutes(estimatedTime) : t('cu.undefined', 'Sin definir')}
                            onClick={() => openPanel('duration')}
                        />
                        {traitTile}
                        {projectTile}
                        {repeatTile(2)}
                    </Tiles>
                </Stack>
            )}
        </CupertinoSheet>
    );
}, (prev, next) => {
    if (!prev.isOpen && !next.isOpen) return true;
    return false;
});
