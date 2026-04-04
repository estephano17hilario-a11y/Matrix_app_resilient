import { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { App } from '@capacitor/app';
import { ArrowUp, AlertTriangle, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { isWithinInterval } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { toLocalISOString, startOfWeek, endOfWeek } from './utils/dateUtils';
import { PlayerHUD } from './modules/dashboard/PlayerHUD';
import { TaskList } from './modules/tasks/TaskList';
import { AchievementToast } from './components/AchievementToast';
import { StatsHeader } from './modules/dashboard/components/StatsHeader';
import { Dock } from './modules/dashboard/components/Dock';
import { DockConfigModal } from './components/ui/DockConfigModal';
import { QuestModal } from './modules/dashboard/components/QuestModal';
import { HabitModal } from './modules/dashboard/components/HabitModal';
import { ProjectModal } from './modules/dashboard/components/ProjectModal';
import { ValidationModal } from './modules/dashboard/components/ValidationModal';
import { BadHabitWizard } from './modules/dashboard/components/BadHabitWizard';
import { RelapseModal } from './modules/dashboard/components/RelapseModal';
import { GlobalStyles } from './styles/GlobalStyles';
import { useDashboardLogic } from './modules/dashboard/hooks/useDashboardLogic';
import { Quest, Habit, BadHabit, Project } from './types';
import { PersistenceService } from './services/persistence';
import { persistenceService } from './services/persistenceService';
import { StrategicNode } from './types/SmartGoal';
import { FREE_LIMITS } from './config/limits';

import { ConfirmationModal } from './components/ui/ConfirmationModal';
import { HabitActionsModal } from './modules/dashboard/components/HabitActionsModal';
import { BadHabitActionsModal } from './modules/dashboard/components/BadHabitActionsModal';

import { ViewContainer } from './modules/dashboard/components/ViewContainer';
import { ParticleLayer } from './modules/dashboard/components/ParticleLayer';
import { StreakCelebrationOverlay } from './modules/dashboard/components/StreakCelebrationOverlay';
import { StatsTutorialOverlay } from './components/StatsTutorialOverlay';
import { cn } from './utils/cn';

// Lazy Load Heavy Views
const HabitVisualView = lazy(() => import('./modules/dashboard/HabitVisualView').then(m => ({ default: m.HabitVisualView })));
const FocusView = lazy(() => import('./modules/focus/FocusView').then(m => ({ default: m.FocusView })));
const NotesView = lazy(() => import('./modules/notes/NotesView').then(m => ({ default: m.NotesView })));
import { updateDoc, doc } from './services/firebase';
import { db } from './services/firebase';
import toast from 'react-hot-toast';
import { verifySubscriptionStatus } from './services/mercadoPagoService';

const AchievementsScreen = lazy(() => import('./modules/achievements/AchievementsScreen').then(m => ({ default: m.AchievementsScreen })));
const StoreScreen = lazy(() => import('./modules/store/StoreScreen').then(m => ({ default: m.StoreScreen })));
const SmartTaskWizard = lazy(() => import('./modules/smart-tasks/SmartTaskWizard').then(m => ({ default: m.SmartTaskWizard })));
const StrategicMapView = lazy(() => import('./modules/smart-tasks/components/StrategicMapView').then(m => ({ default: m.StrategicMapView })));
const SettingsView = lazy(() => import('./modules/dashboard/SettingsView').then(m => ({ default: m.SettingsView })));
const ProUpgradeModal = lazy(() => import('./modules/monetization/ProUpgradeModal').then(m => ({ default: m.ProUpgradeModal })));
const StreakRoadmapView = lazy(() => import('./modules/dashboard/StreakRoadmapView').then(m => ({ default: m.StreakRoadmapView })));
const PomodoroView = lazy(() => import('./modules/focus/PomodoroView').then(m => ({ default: m.PomodoroView })));
import { DeluxSuccessOverlay } from './modules/monetization/DeluxSuccessOverlay';

const SuspenseFallback = () => (
    <div className="flex items-center justify-center h-full w-full min-h-[200px]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
);

// Helper to convert SmartProject nodes to Real Quests
const ARCHETYPE_THEMES = {
    NEO: {
        bg: 'bg-indigo-600',
        ring: 'ring-indigo-500/50',
        bgLight: 'bg-indigo-500/20',
        text: 'text-indigo-400',
        shadow: 'shadow-[0_0_40px_-10px_rgba(99,102,241,0.3)]',
        btnShadow: 'shadow-[0_0_30px_-5px_rgba(99,102,241,0.5)]'
    },
    SPARTAN: {
        bg: 'bg-rose-600',
        ring: 'ring-rose-500/50',
        bgLight: 'bg-rose-500/20',
        text: 'text-rose-400',
        shadow: 'shadow-[0_0_40px_-10px_rgba(244,63,94,0.3)]',
        btnShadow: 'shadow-[0_0_30px_-5px_rgba(244,63,94,0.5)]'
    },
    HACKER: {
        bg: 'bg-emerald-600',
        ring: 'ring-emerald-500/50',
        bgLight: 'bg-emerald-500/20',
        text: 'text-emerald-400',
        shadow: 'shadow-[0_0_40px_-10px_rgba(16,185,129,0.3)]',
        btnShadow: 'shadow-[0_0_30px_-5px_rgba(16,185,129,0.5)]'
    },
    MONK: {
        bg: 'bg-cyan-600',
        ring: 'ring-cyan-500/50',
        bgLight: 'bg-cyan-500/20',
        text: 'text-cyan-400',
        shadow: 'shadow-[0_0_40px_-10px_rgba(6,182,212,0.3)]',
        btnShadow: 'shadow-[0_0_30px_-5px_rgba(6,182,212,0.5)]'
    }
};

const convertNodeToQuests = (node: StrategicNode, traitId: string, smartProjectId: string): Quest[] => {
    const quests: Quest[] = [];
    
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);

    // Map level to difficulty
    const difficultyMap: Record<string, 'S'|'A'|'B'|'C'> = {
        'YEAR': 'S',
        'SEMESTER': 'A',
        'QUARTER': 'B',
        'MONTH': 'C',
        'WEEK': 'C',
        'DAY': 'C'
    };

    // Filter Logic:
    // 1. Always include Root (YEAR) - The Main Goal
    // 2. Include DAY nodes only if within current week
    // 3. Include intermediate levels (SEMESTER, QUARTER, MONTH, WEEK) to ensure visibility
    
    const isRoot = node.level === 'YEAR';
    const isDay = node.level === 'DAY';
    // const isIntermediate = ['SEMESTER', 'QUARTER', 'MONTH', 'WEEK'].includes(node.level);
    
    let shouldInclude = false;
    
    if (isRoot) {
        shouldInclude = true;
    } else if (isDay) {
        if (node.dueDate) {
            const date = node.dueDate.toDate();
            // Check if it's in the current week OR if it's today/overdue (if we want to show past due)
            // User requirement: "tareas pasadas que aun se ven" -> Maybe they WANT to see them if not done?
            // "quiero que este todo actualizado... coherencia de datos"
            // Let's stick to current week window for now, but maybe expand if not completed?
            if (isWithinInterval(date, { start: weekStart, end: weekEnd })) {
                shouldInclude = true;
            }
        }
    } else {
        // Intermediate nodes: Always include them if they have a title, so we can see the hierarchy/progress
        shouldInclude = true;
    }

    // Create quest for current node (skip if it's a placeholder)
    if (shouldInclude && node.title && !node.placeholder) {
        const quest: Quest = {
            id: node.id, // Use the same ID to link them
            title: node.title,
            description: `Smart Goal: ${node.level}`, 
            attribute: traitId || 'intelligence', // Default fallback
            difficulty: difficultyMap[node.level] || 'C',
            completed: node.isCompleted,
            xpReward: node.reward?.xp || 100,
            gold: node.reward?.coins || 0,
            deadline: node.dueDate ? node.dueDate.toDate().toISOString().split('T')[0] : undefined,
            subtasks: [],
            isSmartQuest: true,
            smartProjectId: smartProjectId
        };
        quests.push(quest);
    }

    // Recursively process children
    if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
            quests.push(...convertNodeToQuests(child, traitId, smartProjectId));
        });
    }

    return quests;
};

export default function Dashboard() {
    useEffect(() => {
        console.log("💎 MATRIX: Dashboard Mounted Successfully");
    }, []);

    const { t, i18n } = useTranslation();
    // ⚡ PERFORMANCE: Track loaded views to keep them alive (Cache)
    const [loadedViews, setLoadedViews] = useState<Set<string>>(new Set(['TASKS']));
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsInitialTab, setSettingsInitialTab] = useState<string | undefined>(undefined);
    const [showDeluxSuccess, setShowDeluxSuccess] = useState(false);
    const [showStatsTutorial, setShowStatsTutorial] = useState(false);

    // Force re-render on language change
    useEffect(() => {
        const handleLanguageChanged = () => {
            // This is a bit of a hack to force re-render if deep components are memoized too aggressively
            setLoadedViews(prev => new Set(prev)); 
        };
        i18n.on('languageChanged', handleLanguageChanged);
        return () => {
            i18n.off('languageChanged', handleLanguageChanged);
        };
    }, [i18n]);

    // ⚡ PERFORMANCE: Pre-load all heavy views after initial render for "Flash" switching
    useEffect(() => {
        const checkSubscriptionStatus = async () => {
            const params = new URLSearchParams(window.location.search);
            const paymentStatus = params.get('payment_status');
            const plan = params.get('plan');
            const preapprovalId = params.get('preapproval_id'); // MP appends this to the URL

            if (paymentStatus === 'success' && plan && user?.uid) {
                // Remove params from URL immediately to prevent refreshes from triggering it again
                window.history.replaceState({}, document.title, window.location.pathname);

                // AUDITORIA EXTREMA: Validate preapproval ID before giving PRO
                if (!preapprovalId) {
                    toast.error("Transacción inválida: No se detectó ID de suscripción.");
                    return;
                }

                const toastId = toast.loading('Verificando pago en la bóveda de Mercado Pago...');
                
                try {
                    const isAuthorized = await verifySubscriptionStatus(preapprovalId);
                    
                    if (!isAuthorized) {
                        toast.dismiss(toastId); // Just dismiss quietly if they didn't pay
                        return;
                    }

                    const now = new Date();
                    if (plan === 'monthly') {
                        now.setMonth(now.getMonth() + 1);
                    } else if (plan === 'yearly') {
                        now.setFullYear(now.getFullYear() + 1);
                    }

                    const userRef = doc(db, 'users', user.uid);
                    await updateDoc(userRef, {
                        plan: 'PRO',
                        planExpiryDate: now.getTime(),
                        subscriptionType: plan,
                        subscriptionId: preapprovalId // Save it for future backend webhooks/audits
                    });

                    toast.success('Auditoría Completada: Autenticidad verificada.', { id: toastId });
                    setShowDeluxSuccess(true);
                } catch (e) {
                    console.error("Failed to verify/update subscription status", e);
                    toast.error('Error de red al verificar pago. Contacte a soporte.', { id: toastId });
                }
            }
        };

        checkSubscriptionStatus();

        let idleId: number | null = null;
        let prefetchTimeout: ReturnType<typeof setTimeout> | null = null;
        const prefetch = async () => {
            try {
                await Promise.all([
                    import('./modules/dashboard/HabitVisualView'),
                    import('./modules/focus/FocusView'),
                    import('./modules/notes/NotesView'),
                    import('./modules/achievements/AchievementsScreen'),
                    import('./modules/store/StoreScreen'),
                    import('./modules/smart-tasks/components/StrategicMapView')
                ]);
            } catch (e) {
                console.warn("Prefetch failed", e);
            }
        };

        const schedule = () => {
            const idleCallback = (globalThis as any).requestIdleCallback;
            if (typeof idleCallback === 'function') {
                idleId = idleCallback(() => prefetch());
            } else {
                prefetchTimeout = setTimeout(() => prefetch(), 0);
            }
        };

        const delayId = setTimeout(schedule, 3000);

        return () => {
            clearTimeout(delayId);
            const cancelIdle = (globalThis as any).cancelIdleCallback;
            if (idleId && typeof cancelIdle === 'function') {
                cancelIdle(idleId);
            }
            if (prefetchTimeout) {
                clearTimeout(prefetchTimeout);
            }
        };
    }, []);

    const {
        user,
        lastAchievement,
        setLastAchievement,
        currentTheme,
        setCurrentTheme,
        currentView,
        setCurrentView,
        isDockOpen,
        setIsDockOpen,
        isFocusMode,
        isNoteTaking,
        setIsNoteTaking,
        isPomodoroActive,
        setIsPomodoroActive,
        showProfile,
        setShowProfile,
        player,
        health,
        attributes,
        quests,
        setQuests,
        habits,
        projects,
        smartProjects,
        setSmartProjects,
        notifications,
        particles,
        activeModal,
        setActiveModal,
        validationHabit,
        setValidationHabit,
        valTempValue,
        setValTempValue,
        handleFocusModeChange,
        addNotification,
        handleCompleteSession,
        handleAddManualSession,
        handleDeleteSession,
        completeQuest,
        handleHabitClick,
        handleToggleHabitDay,
        validateHabitProgress,
        handleQuestConfirm,
        handleDeleteQuest,
        handleDeleteHabit,
        handleHabitConfirm,
        handleHabitUpdate,
        handleProjectConfirm,
        handleDeleteProject,
        handleUpdateProject,
        handleUpdateSmartProject,
        defaultChartMode,
        setDefaultChartMode,
        updateAttributeMetadata,
        addAttribute,
        removeAttribute,
        dashboardStyle,
        updateDashboardStyle,
        avatarShape,
        updateAvatarShape,
        badHabits,
        handleBadHabitConfirm,
        handleBadHabitRelapse,
        handleDeleteBadHabit,
        vividMode,
        setVividMode,
        habitSectionControl,
        updateHabitSectionControl,
        allowDockSectionSwitch,
        updateAllowDockSectionSwitch,
        dockConfig,
        updateDockConfig,
        weekStartDay,
        updateWeekStartDay,
        dailyLimits,
        handleEditSession,
        handleReorderHabits,
        handleReorderProjects,
        handleReorderBadHabits,
        showStreakCelebration,
        setShowStreakCelebration
    } = useDashboardLogic();

    useEffect(() => {
        if (user?.uid) {
            const tutorialKey = `matrix_stats_tutorial_seen_${user.uid}`;
            const hasSeen = localStorage.getItem(tutorialKey);
            const storedLang = localStorage.getItem('i18nextLng') || i18n.language || 'en';
            if (!hasSeen) {
                if (storedLang.startsWith('en')) {
                    i18n.changeLanguage('en');
                } else {
                    i18n.changeLanguage('es');
                }
                setShowStatsTutorial(true);
                localStorage.setItem(tutorialKey, 'true');
            }
        }
    }, [user?.uid]);

    const archetypeTheme = user?.archetype ? ARCHETYPE_THEMES[user.archetype] || ARCHETYPE_THEMES['NEO'] : ARCHETYPE_THEMES['NEO'];

    // ==========================================
    // ESCUCHA DE EVENTOS DEL TOUR GUIDE
    // ==========================================
    useEffect(() => {
        const handleOpenQuest = () => setActiveModal('QUEST');
        const handleOpenHabit = () => setActiveModal('HABIT');
        const handleOpenProject = () => {
            setActiveModal('PROJECT');
        };
        const handleOpenBadHabit = () => setActiveModal('BAD_HABIT');
        const handleNavigateToStore = () => setCurrentView('STORE');
        const handleOpenProModal = () => setIsProModalOpen(true);
        
        window.addEventListener('open-quest-modal', handleOpenQuest);
        window.addEventListener('open-habit-modal', handleOpenHabit);
        window.addEventListener('open-project-modal', handleOpenProject);
        window.addEventListener('open-bad-habit-modal', handleOpenBadHabit);
        window.addEventListener('navigate-to-store', handleNavigateToStore);
        window.addEventListener('open-pro-modal', handleOpenProModal);
        
        return () => {
            window.removeEventListener('open-quest-modal', handleOpenQuest);
            window.removeEventListener('open-habit-modal', handleOpenHabit);
            window.removeEventListener('open-project-modal', handleOpenProject);
            window.removeEventListener('open-bad-habit-modal', handleOpenBadHabit);
            window.removeEventListener('navigate-to-store', handleNavigateToStore);
            window.removeEventListener('open-pro-modal', handleOpenProModal);
        };
    }, [setActiveModal, setCurrentView]);

    // 🛡️ RECOVERED LOGIC: Fixed Max Health to 100 as per user request
    const maxHealth = 100;

    const [isFullScreenFocus, setIsFullScreenFocus] = useState(false);
    const [isNotesStatsOpen, setIsNotesStatsOpen] = useState(false);
    const [isDockConfigOpen, setIsDockConfigOpen] = useState(false);
    const [modalInitialContext, setModalInitialContext] = useState<any>(null);
    const [activeSmartProjectId, setActiveSmartProjectId] = useState<string | null>(null); // Added state for active project
    const [relapsingHabit, setRelapsingHabit] = useState<BadHabit | null>(null);
    const [editingBadHabit, setEditingBadHabit] = useState<BadHabit | null>(null);

    // --- NAVIGATION HISTORY STACK ---
    // Tracks the history of views to support "Back to Previous Page" functionality
    const [viewHistory, setViewHistory] = useState<string[]>(['TASKS']);
    const isBackNavigating = useRef(false);

    useEffect(() => {
        if (!currentView) return;
        
        // If this navigation was triggered by the Back Button, don't push it to history again
        if (isBackNavigating.current) {
            isBackNavigating.current = false;
            return;
        }

        setViewHistory(prev => {
            // Prevent duplicate entries if the view didn't actually change
            if (prev[prev.length - 1] === currentView) return prev;
            
            // Limit history size to 20 to prevent memory leaks
            const newHistory = [...prev, currentView];
            if (newHistory.length > 20) {
                return newHistory.slice(newHistory.length - 20);
            }
            return newHistory;
        });
    }, [currentView]);

    const isOverlayActive = activeModal || validationHabit || isDockOpen;

    // ⚡ PERFORMANCE: Add current view to loaded set
    useEffect(() => {
        if (currentView) {
            setLoadedViews(prev => {
                const newSet = new Set(prev);
                newSet.add(currentView);
                return newSet;
            });
        }
    }, [currentView]);

    useEffect(() => {
        if (currentView !== 'NOTES' && isNotesStatsOpen) {
            setIsNotesStatsOpen(false);
        }
    }, [currentView, isNotesStatsOpen]);

    // SMART PROJECT SELECTION
    // FIX: Do not default to the first project if activeSmartProjectId is null
    const smartProject = activeSmartProjectId 
        ? smartProjects.find(p => p.id === activeSmartProjectId) || null
        : null;
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const isProModalOpen = activeModal === 'PRO';
    const setIsProModalOpen = (open: boolean) => open ? setActiveModal('PRO') : setActiveModal(null);
    const [taskViewMode, setTaskViewMode] = useState<'LIST' | 'STRATEGY'>('LIST');
    const [habitViewMode, setHabitViewMode] = useState<'PROTOCOLS' | 'VICES'>('PROTOCOLS');
    const [noteViewMode, setNoteViewMode] = useState<'NOTES' | 'JOURNAL'>('NOTES');
    const [smartTaskProps, setSmartTaskProps] = useState<{ lockedDate?: string, lockedAttributeId?: string, lockedSmartProjectId?: string } | null>(null);
    const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
    const [focusTargetProjectId, setFocusTargetProjectId] = useState<string | null>(null);
    const [focusOpenArchived, setFocusOpenArchived] = useState(false);
    
    // PERSIST FOCUS PROJECT ID
    const [focusAutoStartProjectId, setFocusAutoStartProjectId] = useState<string | null>(() => {
        try {
            if (typeof window !== 'undefined') {
                return localStorage.getItem('matrix_focus_project_id') || null;
            }
        } catch (e) { console.error("LS Error", e); }
        return null;
    });

    useEffect(() => {
        if (focusAutoStartProjectId) {
            localStorage.setItem('matrix_focus_project_id', focusAutoStartProjectId);
        } else {
            localStorage.removeItem('matrix_focus_project_id');
        }
    }, [focusAutoStartProjectId]);

    const [forceFocusOpen, setForceFocusOpen] = useState(false);

    // FIX: Lift Focus State to Dashboard
    const handleOpenModal = useCallback((modal: string) => {
        setModalInitialContext(null);
        setActiveModal(modal as any);
    }, []);

    const handleExitFocusSession = useCallback(() => {
        setFocusTargetProjectId(null);
        setFocusAutoStartProjectId(null);
        setForceFocusOpen(false);
        handleFocusModeChange(null);
    }, [handleFocusModeChange]);

    const handleFocusProject = useCallback((projectId: string | null) => {
        const target = projectId ? projects.find(p => p.id === projectId) : undefined;
        
        if (projectId && !target) {
            console.error("❌ Dashboard: Target project not found for focus", projectId);
            addNotification({ 
                type: 'SYSTEM', 
                label: 'Project not found', 
                icon: AlertTriangle, 
                color: '#ef4444' 
            });
            return;
        }

        console.log("⚡ Dashboard: handleFocusProject", { projectId, target, allProjects: projects.length });
        setFocusTargetProjectId(target ? projectId : null);
        setFocusOpenArchived(!!target?.archived);
        setCurrentView('FOCUS');
        setIsDockOpen(false);
        setForceFocusOpen(true);
        handleFocusModeChange(target?.attribute || 'FOCUS');
    }, [projects, handleFocusModeChange, addNotification]);

    const handleStartFocusProject = useCallback((payload: { projectId?: string | null; smartProjectId?: string | null } | null) => {
        const explicitProjectId = payload?.projectId ?? null;
        let target = explicitProjectId ? projects.find(p => p.id === explicitProjectId) : undefined;
        
        if (explicitProjectId && !target) {
             // Try to recover if smartProjectId is present
             if (payload?.smartProjectId) {
                target = projects.find(p => p.smartProjectId === payload.smartProjectId);
             }
             
             if (!target) {
                console.warn("⚠️ Dashboard: requested missing project", payload);
                addNotification({ 
                    type: 'SYSTEM', 
                    label: 'Project Link Broken', 
                    icon: AlertTriangle, 
                    color: '#f59e0b' 
                });
                return;
             }
        }

        if (!target && payload?.smartProjectId) {
            target = projects.find(p => p.smartProjectId === payload.smartProjectId);
        }
        
        const resolvedProjectId = target?.id ?? null;
        setFocusAutoStartProjectId(resolvedProjectId);
        setFocusTargetProjectId(resolvedProjectId);
        setFocusOpenArchived(!!target?.archived);
        setCurrentView('FOCUS');
        setIsDockOpen(false);
        setActiveSmartProjectId(null);
        setForceFocusOpen(true);
        handleFocusModeChange(target?.attribute || 'FOCUS');
        
        if (!target) {
            setModalInitialContext(payload?.smartProjectId ? { smartProjectId: payload.smartProjectId } : null);
            setActiveModal('PROJECT');
        }
    }, [handleFocusModeChange, projects, addNotification]);

    useEffect(() => {
        const handler = (event: Event) => {
            const detail = (event as CustomEvent<{ projectId?: string | null; smartProjectId?: string | null }>).detail ?? null;
            handleStartFocusProject(detail);
        };
        window.addEventListener('matrix:focus', handler);
        return () => window.removeEventListener('matrix:focus', handler);
    }, [handleStartFocusProject]);

    useEffect(() => {
        if (forceFocusOpen && currentView !== 'FOCUS') {
            setCurrentView('FOCUS');
        }
    }, [forceFocusOpen, currentView]);

    // --- HABIT ACTIONS & CONFIRMATION ---
    const [habitActionsHabit, setHabitActionsHabit] = useState<Habit | null>(null);
    const [badHabitActionsHabit, setBadHabitActionsHabit] = useState<BadHabit | null>(null);
    const [confirmationModal, setConfirmationModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        confirmText?: string;
        variant?: 'danger' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
    });

    const handleShowHabitActions = (habit: Habit) => {
        setHabitActionsHabit(habit);
    };

    const handleShowBadHabitActions = (habit: BadHabit) => {
        setBadHabitActionsHabit(habit);
    };

    const handleArchiveHabit = (habit: Habit) => {
        handleHabitUpdate(habit.id, { archived: !habit.archived });
    };

    const handleArchiveBadHabit = (habit: BadHabit) => {
        if (!user?.uid) return;
        const newHabits = badHabits.map(h => h.id === habit.id ? { ...h, archived: !h.archived } : h);
        PersistenceService.saveCollection(user.uid, 'badHabits', newHabits);
        // Dispatch custom event to trigger logic reload
        window.dispatchEvent(new CustomEvent('reload-dashboard'));
    };

    const handleDeleteHabitRequest = (habit: Habit) => {
        setConfirmationModal({
            isOpen: true,
            title: t('habits.deleteTitle', '¿Eliminar Hábito?'),
            message: t('common.deleteHabitConfirm', { title: habit.title }),
            confirmText: t('common.delete', 'Eliminar'),
            variant: 'danger',
            onConfirm: () => handleDeleteHabit(habit.id),
        });
    };

    const handleDeleteBadHabitRequest = (habit: BadHabit) => {
        setConfirmationModal({
            isOpen: true,
            title: '¿Eliminar Vicio?',
            message: `¿Estás seguro de que quieres eliminar "${habit.title}" permanentemente?`,
            confirmText: 'Eliminar',
            variant: 'danger',
            onConfirm: () => handleDeleteBadHabit(habit.id),
        });
    };

    const handleDeleteProjectRequest = useCallback((projectId: string) => {
        const targetProject = projects.find(p => p.id === projectId);
        const title = targetProject?.title || 'este proyecto';
        setConfirmationModal({
            isOpen: true,
            title: t('projects.deleteTitle', '¿Eliminar Proyecto?'),
            message: t('common.deleteProjectConfirm', { title }),
            confirmText: t('common.delete', 'Eliminar'),
            variant: 'danger',
            onConfirm: () => {
                handleDeleteProject(projectId);
                setActiveModal(null);
                setModalInitialContext(null);
                setConfirmationModal(prev => ({ ...prev, isOpen: false }));
            },
        });
    }, [handleDeleteProject, projects, t]);

    useEffect(() => {
        if (currentView !== 'FOCUS') {
            handleFocusModeChange(null);
        }
    }, [currentView, handleFocusModeChange]);

    useEffect(() => {
        if (currentView !== 'FOCUS' && focusOpenArchived) {
            setFocusOpenArchived(false);
        }
    }, [currentView, focusOpenArchived]);

    useEffect(() => {
        // Only clear if we are NOT in FOCUS view AND NOT in POMODORO view
        // Because POMODORO view needs this ID to initialize
        if (currentView !== 'FOCUS' && currentView !== 'POMODORO' && focusAutoStartProjectId) {
            setFocusAutoStartProjectId(null);
        }
    }, [currentView, focusAutoStartProjectId]);

    const handleStartPomodoro = (projectId: string) => {
        setFocusAutoStartProjectId(projectId);
        setIsPomodoroActive(true);
    };

    const handleOpenSmartTaskCreator = (date: Date, smartProjectId?: string) => {
        const targetProject = smartProjectId ? smartProjects.find(p => p.id === smartProjectId) : smartProject;
        if (!targetProject) return;
        setEditingQuest(null);
        setSmartTaskProps({
            lockedDate: toLocalISOString(date),
            lockedAttributeId: targetProject.traitId,
            lockedSmartProjectId: targetProject.id
        });
        setActiveModal('QUEST');
    };

    const handleEditQuest = (quest: Quest) => {
        setSmartTaskProps(null);
        setEditingQuest(quest);
        setActiveModal('QUEST');
    };

    const handleEditHabit = (habit: Habit) => {
        setEditingHabit(habit);
        setActiveModal('HABIT');
    };

    const handleEditBadHabit = (habit: BadHabit) => {
        setEditingBadHabit(habit);
        setActiveModal('BAD_HABIT');
    };

    const handleProjectConfirmAndReset = useCallback(async (data: Partial<Project>) => {
        await handleProjectConfirm(data);
        setModalInitialContext(null);
    }, [handleProjectConfirm]);

    const handleQuestModalClose = () => {
        setActiveModal(null);
        setEditingQuest(null);
        setSmartTaskProps(null);
    };

    const handleQuestSave = useCallback(async (quest: Partial<Quest>) => {
        await handleQuestConfirm(quest);
        setEditingQuest(null);
        setSmartTaskProps(null);
    }, [handleQuestConfirm]);

    const handleDeleteSmartProject = async (projectId?: string) => {
        const targetId = projectId || smartProject?.id;
        const targetProject = projectId ? smartProjects.find(p => p.id === projectId) : smartProject;

        if (!targetId || !targetProject || !user?.uid) return;

        try {
            // 1. Delete the Project itself
            await persistenceService.smartProjects.delete(user.uid, targetId);
            
            // Update Local State
            setSmartProjects(prev => prev.filter(p => p.id !== targetId));
            
            // 2. Collect all Node IDs to delete associated Quests
            const idsToDelete: string[] = [];
            const collectIds = (node: StrategicNode) => {
                idsToDelete.push(node.id);
                if (node.children) {
                    node.children.forEach(collectIds);
                }
            };
            collectIds(targetProject.rootNode);

            // 3. Delete all associated quests from Persistence
            // We run these in parallel for speed, but catching errors individually to ensure best effort
            await Promise.all(idsToDelete.map(id => 
                persistenceService.quests.delete(user.uid, id).catch((e: any) => console.warn(`Failed to delete quest ${id}`, e))
            ));

            // 4. Update State
            if (activeSmartProjectId === targetId) {
                setActiveSmartProjectId(null);
            }
            setQuests(prev => prev.filter(q => !idsToDelete.includes(q.id)));
            
        } catch (error) {
            console.error("Failed to delete smart project:", error);
            alert(t('common.errorDeletingProject'));
        }
    };

    const handleDeleteSmartTaskNode = async (projectId: string, nodeId: string) => {
        const targetProject = smartProjects.find(p => p.id === projectId);
        if (!targetProject || !user?.uid) return;

        try {
             // 1. Logic to find and remove node, collecting all deleted IDs (including children)
             const deletedIds: string[] = [];
             
             const collectIds = (node: StrategicNode) => {
                 deletedIds.push(node.id);
                 if (node.children) {
                     node.children.forEach(collectIds);
                 }
             };

             const removeNode = (node: StrategicNode): StrategicNode | null => {
                 // If this is the node to delete
                 if (node.id === nodeId) {
                     collectIds(node);
                     return null; // Remove it
                 }

                 // If it has children, filter them
                 if (node.children) {
                     const newChildren = node.children
                        .map(removeNode)
                        .filter((n): n is StrategicNode => n !== null);
                     
                     // Check if children changed (length or reference)
                     const hasChanges = newChildren.length !== node.children.length || 
                                        newChildren.some((child, i) => child !== node.children[i]);

                     if (hasChanges) {
                         return { ...node, children: newChildren };
                     }
                 }

                 return node;
             };

             // Execute removal on root
             const newRoot = removeNode(targetProject.rootNode);

             // If root itself was deleted (should be handled by deleteProject, but safe to handle here)
             if (!newRoot) {
                 handleDeleteSmartProject(projectId);
                 return;
             }

             // 2. Update Project in Persistence
             const newProject = { ...targetProject, rootNode: newRoot };
             await persistenceService.smartProjects.update(user.uid, targetProject.id, newProject);

             // 3. Delete associated quests from Persistence
             if (deletedIds.length > 0) {
                await Promise.all(deletedIds.map(id => 
                    persistenceService.quests.delete(user.uid, id).catch((e: any) => console.warn(`Failed to delete quest ${id}`, e))
                ));
             }

             // 4. Update State
             setSmartProjects(prev => prev.map(p => p.id === projectId ? newProject : p));
             setQuests(prev => prev.filter(q => !deletedIds.includes(q.id)));

        } catch (error) {
            console.error("Failed to delete smart task node:", error);
            alert(t('common.errorDeletingTask'));
        }
    };

    const handleDockViewChange = (view: string) => {
        setFocusOpenArchived(false);
        if (view !== 'FOCUS') {
            setForceFocusOpen(false);
        }

        if (view === 'STRATEGY') {
            setCurrentView('TASKS');
            setTaskViewMode('STRATEGY');
            return;
        }

        if (view === 'POMODORO') {
            setIsPomodoroActive(true);
            return;
        }

        if (view === currentView) {
            // Toggle logic for active view
            if (view === 'TASKS') {
                if (allowDockSectionSwitch) {
                    setTaskViewMode(prev => prev === 'LIST' ? 'STRATEGY' : 'LIST');
                }
            } else if (view === 'HABITS') {
                if (allowDockSectionSwitch) {
                    setHabitViewMode(prev => prev === 'PROTOCOLS' ? 'VICES' : 'PROTOCOLS');
                }
            } else if (view === 'NOTES') {
                if (allowDockSectionSwitch) {
                    setNoteViewMode(prev => prev === 'NOTES' ? 'JOURNAL' : 'NOTES');
                }
            }
        } else {
            // Switching to new view - Reset sub-views to default
            setCurrentView(view);
            if (view === 'TASKS') setTaskViewMode('LIST');
            if (view === 'HABITS') setHabitViewMode('PROTOCOLS');
            if (view === 'NOTES') setNoteViewMode('NOTES');
        }
    };

    // Scroll Reset on View Change
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [currentView, taskViewMode]);

    // Calculate if all daily requirements are met (Streak Logic)
    const isStreakActiveToday = (() => {
        // ROBUSTNESS UPDATE: Visual state must reflect REALITY, not just DB state.
        // Even if DB says "today is done", if the user unchecked a habit, 
        // the UI must show it as pending.
        
        if (!dailyLimits) return false;

        const {
            tasksCompleted = 0,
            habitsCompleted = 0,
            focusSeconds = 0
        } = dailyLimits;

        return (
            tasksCompleted >= 2 &&
            habitsCompleted >= 1 &&
            focusSeconds >= 3600
        );
    })();

    const [isProjectDetailOpen, setIsProjectDetailOpen] = useState(false); // State to track detail view

    const notificationRoot = typeof document !== 'undefined' ? document.getElementById('notification-stack-root') : null;

    // Visual Streak Calculation (Strict Mode)
    const displayStreak = (() => {
        const dbStreak = user?.stats?.streak || 0;
        const lastStreakDate = user?.stats?.lastStreakDate;
        const todayStr = toLocalISOString(new Date());
        
        // If DB says "today is counted" (lastStreakDate === today),
        // but our real-time check says "incomplete" (!isStreakActiveToday),
        // we subtract 1 to show the true pending state.
        if (lastStreakDate === todayStr) {
            if (!isStreakActiveToday) {
                return Math.max(0, dbStreak - 1);
            }
            // If DB says it's 0 but it's active today, force at least 1
            return Math.max(1, dbStreak);
        } else {
            // If they just met requirements but DB hasn't synced yet
            if (isStreakActiveToday) {
                return dbStreak + 1;
            }
            return dbStreak;
        }
    })();

    // --- HARDWARE BACK BUTTON HANDLER ---
    useEffect(() => {
        const handleBackButton = async () => {
            // 1. Modals & Overlays (Highest Priority)
            if (activeModal) {
                setActiveModal(null);
                return;
            }
            if (validationHabit) {
                setValidationHabit(null);
                return;
            }
            if (relapsingHabit) {
                setRelapsingHabit(null);
                return;
            }
            if (isWizardOpen) {
                setIsWizardOpen(false);
                return;
            }
            if (habitActionsHabit) {
                setHabitActionsHabit(null);
                return;
            }
            if (confirmationModal.isOpen) {
                setConfirmationModal(prev => ({ ...prev, isOpen: false }));
                return;
            }
            if (editingQuest) {
                setEditingQuest(null);
                return;
            }
            if (editingHabit) {
                setEditingHabit(null);
                return;
            }
            if (isProModalOpen) {
                setIsProModalOpen(false);
                return;
            }
            if (isSettingsOpen) {
                setIsSettingsOpen(false);
                return;
            }
            if (isProjectDetailOpen) {
                setIsProjectDetailOpen(false);
                return;
            }

            // 2. Side Panels / Dock
            if (isNotesStatsOpen) {
                setIsNotesStatsOpen(false);
                return;
            }
            if (isDockOpen) {
                setIsDockOpen(false);
                return;
            }

            if (isFullScreenFocus) {
                setIsFullScreenFocus(false);
                return;
            }
            if (forceFocusOpen) {
                handleExitFocusSession();
                return;
            }

            // 4. Navigation (Smart History)
            if (viewHistory.length > 1) {
                // If we have history, pop the current view and go to the previous one
                const newHistory = [...viewHistory];
                newHistory.pop(); // Remove current view
                const previousView = newHistory[newHistory.length - 1];

                // Set flag so we don't re-add this back navigation to history
                isBackNavigating.current = true;
                
                // Update History State immediately for sync
                setViewHistory(newHistory);
                
                // Navigate
                setCurrentView(previousView);
                return;
            }

            // Fallback: If history is empty/corrupted but we are not at home, go home
            if (currentView !== 'TASKS') {
                setCurrentView('TASKS');
                return;
            }

            // 5. Exit App
            App.exitApp();
        };

        const setupListener = async () => {
            try {
                return await App.addListener('backButton', handleBackButton);
            } catch (e) {
                console.warn('Back button listener failed', e);
            }
        };

        const listenerPromise = setupListener();

        return () => {
            listenerPromise.then(handle => handle && handle.remove()).catch(() => {});
        };
    }, [
        activeModal, 
        validationHabit, 
        relapsingHabit, 
        isWizardOpen, 
        habitActionsHabit, 
        confirmationModal.isOpen,
        editingQuest, 
        editingHabit, 
        isProModalOpen,
        isSettingsOpen,
        isProjectDetailOpen,
        isNotesStatsOpen, 
        isDockOpen, 
        isFullScreenFocus, 
        forceFocusOpen,
        currentView,
        handleExitFocusSession,
        setCurrentView,
        setActiveModal,
        setValidationHabit,
        setRelapsingHabit,
        setIsWizardOpen,
        setHabitActionsHabit,
        setConfirmationModal,
        setEditingQuest,
        setEditingHabit,
        setIsProModalOpen,
        setIsSettingsOpen,
        setIsProjectDetailOpen,
        setIsNotesStatsOpen,
        setIsDockOpen,
        setIsFullScreenFocus
    ]);

    return (
        <div className="fixed inset-0 w-full h-full text-slate-200 selection:bg-cyan-500/30 overflow-hidden">
            <GlobalStyles />
            
            <Suspense fallback={null}>
                <ProUpgradeModal 
                    isOpen={isProModalOpen || activeModal === 'PRO'}
                    onClose={() => {
                        setIsProModalOpen(false);
                        if (activeModal === 'PRO') setActiveModal(null);
                    }}
                />
            </Suspense>

            {/* Global Streak Celebration Overlay */}
            <StreakCelebrationOverlay 
                isOpen={showStreakCelebration}
                onClose={() => setShowStreakCelebration(false)}
                streak={displayStreak}
                lastStreakDate={user?.stats?.lastStreakDate}
            />

            <DeluxSuccessOverlay 
                isOpen={showDeluxSuccess}
                onClose={() => setShowDeluxSuccess(false)}
            />

            <StatsTutorialOverlay 
                isOpen={showStatsTutorial}
                onClose={() => {
                    setShowStatsTutorial(false);
                    // Start interactive tour after stats tutorial
                    if (user?.uid && !localStorage.getItem(`matrix_tour_seen_${user.uid}`)) {
                        window.dispatchEvent(new CustomEvent('start-onboarding-tour'));
                        localStorage.setItem(`matrix_tour_seen_${user.uid}`, 'true');
                    }
                }}
            />

            {notificationRoot && createPortal(
                <AnimatePresence mode="sync">
                    {notifications.map(n => {
                        const NotifIcon = n.icon;
                        return (
                            <motion.div 
                                layout
                                key={n.id}
                                initial={{ opacity: 0, scale: 0.9, y: -40 }} 
                                animate={{ opacity: 1, scale: 1, y: 0 }} 
                                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2, ease: "backIn" } }} 
                                transition={{ type: "spring", stiffness: 400, damping: 28, mass: 0.8 }}
                                className="relative overflow-hidden backdrop-blur-sm border border-yellow-500/20 bg-[#0a0a0a]/80 px-5 py-4 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex items-center gap-4 min-w-[320px] pointer-events-auto group ring-1 ring-white/5"
                                style={{ willChange: 'transform, opacity' }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-yellow-500/5 to-transparent opacity-100" />
                                
                                <div className="relative w-11 h-11 rounded-xl flex items-center justify-center bg-yellow-500/10 border border-yellow-500/20 shadow-[inset_0_0_10px_rgba(234,179,8,0.1)]" style={{ color: n.color }}>
                                    <div className="absolute inset-0 bg-yellow-400/20 rounded-full animate-pulse opacity-50" />
                                    <NotifIcon size={20} className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" strokeWidth={2} />
                                </div>
                                
                                <div className="flex-1 relative z-10">
                                    <p className="text-[10px] font-bold text-yellow-500/80 uppercase tracking-[0.15em] mb-1 drop-shadow-sm">{t(n.label, n.label)} LEVEL UP</p>
                                    <div className="flex items-center gap-3 text-xl font-black text-white leading-none tracking-tight">
                                        <span className="text-white/40 font-mono text-lg">{n.fromLevel}</span>
                                        <ArrowUp size={14} className="text-yellow-400 animate-bounce drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" strokeWidth={3} />
                                        <span className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.4)]">{n.toLevel}</span>
                                    </div>
                                </div>
                                
                                <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-yellow-500/5 to-transparent pointer-events-none" />
                            </motion.div>
                        )
                    })}
                </AnimatePresence>,
                notificationRoot
            )}

            {/* SCROLLABLE CONTENT LAYER - OPTIMIZED: Added will-change and contain for high-speed scrolling */}
            <div 
                ref={scrollContainerRef} 
                className={cn(
                    "absolute inset-0 z-10 w-full h-full overflow-x-hidden scroll-smooth",
                    (isSettingsOpen || activeModal || isWizardOpen || validationHabit || habitActionsHabit || isProjectDetailOpen) 
                        ? "overflow-y-hidden" 
                        : "overflow-y-auto"
                )}
                style={{ 
                    willChange: 'scroll-position',
                    contain: 'size layout style' 
                }}
            >
                <AchievementToast 
                    achievement={lastAchievement} 
                    onClose={() => setLastAchievement(null)} 
                />

                {/* FX LAYER */}
                <ParticleLayer particles={particles} />

                {/* PERSISTENT HUD - OUTSIDE MAIN TO PREVENT RE-LAYOUT JUMPS */}
                {!isWizardOpen && !isFocusMode && !isFullScreenFocus && !isNotesStatsOpen && !isProjectDetailOpen && currentView !== 'STREAK' && !isPomodoroActive && (
                    <>
                        <div className="relative z-[300] w-full bg-transparent transition-all duration-300 pt-safe">
                            <div className="max-w-md mx-auto px-4 sm:px-6">
                                <StatsHeader 
                                    level={player.level} 
                                    xp={player.xp} 
                                    gold={player.gold}
                                    nextXp={player.nextXp} 
                                    health={health}
                                    maxHealth={maxHealth}
                                    streak={displayStreak}
                                    lastStreakDate={user?.stats?.lastStreakDate}
                                    isHidden={false} // Always visible in Dashboard
                                    showProfile={showProfile}
                                    onShowStore={() => setCurrentView(prev => prev === 'STORE' ? 'TASKS' : 'STORE')}
                                    onShowPro={() => setIsProModalOpen(true)}
                                    onShowSettings={() => setIsSettingsOpen(true)}
                                    onShowSettingsWithTab={(tab) => {
                                        setSettingsInitialTab(tab);
                                        setIsSettingsOpen(true);
                                    }}
                                    displayName={user?.displayName}
                                    email={user?.email}
                                    isPro={user?.plan === 'PRO'}
                                    avatarId={user?.avatarId}
                                    avatarShape={avatarShape}
                                    isHabitsCompleted={isStreakActiveToday}
                                    dailyLimits={dailyLimits}
                                    onNavigate={handleDockViewChange}
                                />
                            </div>
                        </div>



                        {/* 💎 STATUS HUD - THE MIRROR (GLOBAL POSITION) */}
                        {showProfile && (currentView === 'TASKS' && taskViewMode !== 'STRATEGY') && (
                             <div className={cn(
                                "px-4 sm:px-6 max-w-md mx-auto mt-1 mb-1",
                                "relative z-[290]"
                             )}>
                                <PlayerHUD 
                                    attributes={attributes}
                                    defaultChartMode={defaultChartMode}
                                />
                            </div>
                        )}
                    </>
                )}

                
                <main className={`relative ${isOverlayActive ? 'z-[400]' : (currentView === 'FOCUS' ? 'z-[200]' : 'z-10')} ${currentView === 'ACHIEVEMENTS' ? 'max-w-none' : 'max-w-md'} mx-auto min-h-screen pt-2 pb-0 flex flex-col ${currentView === 'FOCUS' || currentView === 'ACHIEVEMENTS' || currentView === 'HABITS' ? 'px-0 gap-0' : `px-4 sm:px-6 ${showProfile ? 'gap-4' : 'gap-2'}`}`}>

                    <div className={`h-full flex-1 w-full relative ${currentView === 'FOCUS' ? 'z-10' : 'z-0'}`}>
                        {/* ⚡ TASKS VIEW (Always loaded initially) */}
                        <ViewContainer isActive={currentView === 'TASKS'} className="h-full">
                            <div className="flex flex-col gap-4 h-full min-h-0">

                                {/* ⚡ TASK SECTION SWITCHER */}
                                <div className="flex justify-center pt-1 pb-0 z-10 relative shrink-0">
                                    <div className="flex p-1 bg-white/5 rounded-full border border-white/10 shadow-sm w-full max-w-[280px]">
                                        <button
                                            onClick={() => setTaskViewMode('LIST')}
                                            className={`flex-1 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider transition-all duration-300 ${taskViewMode === 'LIST' ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white'}`}
                                            style={{ transform: 'translateZ(0)' }}
                                        >
                                            {t('dashboard.tasks', 'TASKS')}
                                        </button>
                                        <button
                                            onClick={() => setTaskViewMode('STRATEGY')}
                                            className={`flex-1 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider transition-all duration-300 ${taskViewMode === 'STRATEGY' ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-500/20' : 'text-white/60 hover:text-white'}`}
                                            style={{ transform: 'translateZ(0)' }}
                                        >
                                            {t('dashboard.strategy', 'STRATEGY')}
                                        </button>
                                    </div>
                                </div>

                                {taskViewMode === 'LIST' ? (
                                    <>
                                        {/* ACTIVE MISSIONS */}
                                        <TaskList 
                                            quests={quests} 
                                            attributes={attributes} 
                                            smartProjects={smartProjects}
                                            onCompleteQuest={completeQuest} 
                                            onDeleteQuest={handleDeleteQuest} 
                                            onEditQuest={handleEditQuest}
                                            onAddQuest={() => {
                                                setEditingQuest(null);
                                                setSmartTaskProps(null);
                                                setActiveModal('QUEST');
                                            }}
                                            onFocusProject={handleFocusProject}
                                            projects={projects}
                                            dailyLimits={dailyLimits}
                                        />
                                    </>
                                ) : (
                                    <div className="h-full flex-1 min-h-[500px] flex flex-col gap-8 pb-32 overflow-y-auto pr-2 no-scrollbar">
                                         {smartProjects.length > 0 ? (
                                            <>
                                                {smartProjects.map((project) => (
                                                    <div key={project.id} className="rounded-3xl overflow-hidden border border-white/10 relative min-h-[500px] shrink-0 bg-gradient-to-br from-white/[0.05] via-transparent to-white/[0.02] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
                                                        <Suspense fallback={<SuspenseFallback />}>
                                                            <StrategicMapView 
                                                                project={project} 
                                                                quests={quests}
                                                                attributes={attributes}
                                                                onUpdateProject={handleUpdateSmartProject}
                                                                onDeleteProject={() => handleDeleteSmartProject(project.id)}
                                                                onDeleteNode={(nodeId) => handleDeleteSmartTaskNode(project.id, nodeId)}
                                                                onAddSmartTask={(date) => handleOpenSmartTaskCreator(date, project.id)}
                                                                onCompleteQuest={completeQuest}
                                                                onDeleteQuest={handleDeleteQuest}
                                                                onEditQuest={handleEditQuest}
                                                            />
                                                        </Suspense>
                                                    </div>
                                                ))}
                                                <button
                                                    onClick={() => {
                                                        const currentActive = smartProjects.filter(p => p.status === 'ACTIVE' || !p.status).length;
                                                        if (user?.plan !== 'PRO' && currentActive >= FREE_LIMITS.ACTIVE_STRATEGIES) {
                                                            setIsProModalOpen(true);
                                                            return;
                                                        }
                                                        setIsWizardOpen(true);
                                                    }}
                                                    className="w-full rounded-3xl overflow-hidden border-2 border-dashed border-white/10 relative min-h-[500px] shrink-0 bg-white/[0.02] hover:bg-white/[0.05] transition-colors flex flex-col items-center justify-center gap-4 group cursor-pointer"
                                                >
                                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 group-hover:bg-white/10">
                                                        <Plus size={32} className="text-white/40 group-hover:text-white transition-colors" />
                                                    </div>
                                                    <span className="text-white/40 group-hover:text-white font-bold tracking-widest uppercase text-sm transition-colors">
                                                        {t('dashboard.newStrategy', 'Create Strategy')}
                                                    </span>
                                                </button>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-center p-8 border border-white/5 rounded-3xl bg-white/5">
                                                <div className={`w-20 h-20 rounded-full ${archetypeTheme.bgLight} ring-1 ${archetypeTheme.ring} flex items-center justify-center mb-6 ${archetypeTheme.shadow}`}>
                                                    <ArrowUp className={`w-10 h-10 ${archetypeTheme.text} rotate-45`} />
                                                </div>
                                                <h2 className="text-3xl font-bold mb-4">{t('dashboard.noStrategy')}</h2>
                                                <p className="text-white/60 mb-8 max-w-md">{t('dashboard.noStrategyDesc')}</p>
                                                <button 
                                                    onClick={() => {
                                                        const currentActive = smartProjects.filter(p => p.status === 'ACTIVE' || !p.status).length;
                                                        if (user?.plan !== 'PRO' && currentActive >= FREE_LIMITS.ACTIVE_STRATEGIES) {
                                                            setIsProModalOpen(true);
                                                            return;
                                                        }
                                                        setIsWizardOpen(true);
                                                    }}
                                                    className={`px-8 py-3 ${archetypeTheme.bg} rounded-full font-bold text-white ${archetypeTheme.btnShadow} hover:scale-105 transition-transform`}
                                                >
                                                    Initialize Protocol
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </ViewContainer>

                        {/* SETTINGS - MOVED TO MODAL LAYER */}

                        {/* HABITS */}
                        {(loadedViews.has('HABITS') || currentView === 'HABITS') && (
                            <ViewContainer isActive={currentView === 'HABITS'}>
                                {/* SECTION SWITCHER (RESTORED) */}
                                {habitSectionControl === 'VISIBLE' && (
                                    <div className="flex justify-center pt-2 pb-1 z-10 relative">
                                        <div className="flex p-1 bg-white/5 rounded-full border border-white/10 shadow-sm">
                                            <button
                                            onClick={() => setHabitViewMode('PROTOCOLS')}
                                            className={`flex-1 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider transition-all duration-300 ${habitViewMode === 'PROTOCOLS' ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white'}`}
                                        >
                                            {t('dashboard.protocols', 'PROTOCOLS')}
                                        </button>
                                        <button
                                            data-tour="habit-vices-tab"
                                            onClick={() => setHabitViewMode('VICES')}
                                            className={`flex-1 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider transition-all duration-300 ${habitViewMode === 'VICES' ? 'bg-red-500 text-white shadow-sm shadow-red-500/20' : 'text-white/60 hover:text-white'}`}
                                        >
                                            {t('dashboard.vices', 'VICES')}
                                        </button>
                                        </div>
                                    </div>
                                )}

                                <Suspense fallback={<SuspenseFallback />}>
                                    <HabitVisualView 
                            habits={habits} 
                            badHabits={badHabits}
                            attributes={attributes} 
                            onCompleteHabit={handleHabitClick}
                            onToggleHabitDay={handleToggleHabitDay as any}
                            onCreateHabit={() => setActiveModal('HABIT')}
                            onCreateBadHabit={() => setActiveModal('BAD_HABIT')}
                            onDeleteHabit={handleDeleteHabit}
                            onEditHabit={handleEditHabit}
                            onUpdateHabit={handleHabitUpdate}
                            onShowActions={handleShowHabitActions}
                            onShowBadHabitActions={handleShowBadHabitActions}
                            onRelapseBadHabit={(habit) => {
                                setRelapsingHabit(habit);
                                setActiveModal('RELAPSE');
                            }}
                            currentSection={habitViewMode}
                            isActive={currentView === 'HABITS'}
                            onOpenStreak={() => setCurrentView('STREAK')}
                            onReorder={handleReorderHabits}
                            onReorderBadHabits={handleReorderBadHabits}
                            isPro={user?.plan === 'PRO'}
                            onOpenPro={() => setIsProModalOpen(true)}
                        />
                                </Suspense>
                            </ViewContainer>
                        )}

                        {/* FOCUS */}
                        <ViewContainer isActive={currentView === 'FOCUS'} className="h-full pt-0" variant="minimal">
                            <Suspense fallback={<SuspenseFallback />}>
                                <FocusView 
                                    projects={projects} 
                                    attributes={attributes} 
                                    onCompleteSession={handleCompleteSession} 
                                    onAddManualSession={handleAddManualSession}
                                    onDeleteSession={handleDeleteSession}
                                    onDeleteProject={handleDeleteProject}
                                    onOpenProjectModal={(project) => {
                                        setModalInitialContext(project || null);
                                        setActiveModal('PROJECT');
                                    }} 
                                    onUpdateProject={handleUpdateProject}
                                    initialProjectId={focusTargetProjectId}
                                    autoStartProjectId={focusAutoStartProjectId}
                                    onAutoStartConsumed={() => setFocusAutoStartProjectId(null)}
                                    openArchived={focusOpenArchived}
                                    onToggleFullScreen={setIsFullScreenFocus}
                                    isActive={currentView === 'FOCUS'}
                                    onExitSession={handleExitFocusSession}
                                    onSelectProject={handleFocusProject}
                                    onStartFocus={handleStartPomodoro}
                                    onDetailViewChange={setIsProjectDetailOpen}
                                    onReorder={handleReorderProjects}
                                    isPro={user?.plan === 'PRO'}
                                    onOpenPro={() => setIsProModalOpen(true)}
                                />
                            </Suspense>
                        </ViewContainer>

                        {/* NOTES */}
                        {(loadedViews.has('NOTES') || currentView === 'NOTES') && (
                            <ViewContainer isActive={currentView === 'NOTES'} id="NOTES" className="h-full pt-0 relative flex-1">
                                <Suspense fallback={<SuspenseFallback />}>
                                    <NotesView 
                                        onInteractionStart={() => setIsNoteTaking(true)}
                                        onInteractionEnd={() => setIsNoteTaking(false)}
                                        projects={projects}
                                        onShowPro={() => setActiveModal('PRO')}
                                        currentSubView={noteViewMode}
                                        sectionControl={habitSectionControl}
                                        onStatsOpenChange={setIsNotesStatsOpen}
                                        onClose={() => setCurrentView('TASKS')}
                                        isActive={currentView === 'NOTES'}
                                        isPro={user?.plan === 'PRO'}
                                    />
                                </Suspense>
                            </ViewContainer>
                        )}

                        {/* ACHIEVEMENTS */}
                        {(loadedViews.has('ACHIEVEMENTS') || currentView === 'ACHIEVEMENTS') && (
                            <ViewContainer isActive={currentView === 'ACHIEVEMENTS'} id="ACHIEVEMENTS" className="h-full pt-0 relative flex-1">
                                <Suspense fallback={<SuspenseFallback />}>
                                    <AchievementsScreen />
                                </Suspense>
                            </ViewContainer>
                        )}

                        {/* STORE */}
                        {(loadedViews.has('STORE') || currentView === 'STORE') && (
                            <ViewContainer isActive={currentView === 'STORE'} id="STORE" className="h-full pt-0">
                                <Suspense fallback={<SuspenseFallback />}>
                                    <StoreScreen onNavigate={(view) => setCurrentView(view)} />
                                </Suspense>
                            </ViewContainer>
                        )}

                            {/* --- STRATEGY SECTION --- */}
                        <AnimatePresence>
                            {isWizardOpen && (
                                <Suspense fallback={null}>
                                    <SmartTaskWizard 
                                        availableTraits={attributes}
                                        activeSmartTasksCount={smartProjects.filter(p => p.status === 'ACTIVE' || !p.status).length}
                                        isPro={user?.plan === 'PRO'}
                                        onOpenPro={() => setIsProModalOpen(true)}
                                        onComplete={(project) => {
                                            let newQuests = convertNodeToQuests(project.rootNode, project.traitId || '', project.id);
                                            
                                            // LIMIT CHECK: Enforce max active tasks
                                            if (user?.plan !== 'PRO') {
                                                const currentActive = smartProjects.filter(p => p.status === 'ACTIVE' || !p.status).length;
                                                const remainingSlots = Math.max(0, FREE_LIMITS.ACTIVE_STRATEGIES - currentActive);
                                                
                                                if (remainingSlots <= 0) {
                                                    setIsProModalOpen(true); // Show upgrade prompt
                                                    return;
                                                }
                                            }

                                        setSmartProjects(prev => [...prev, project]);
                                        setActiveSmartProjectId(project.id);
                                        setTaskViewMode('STRATEGY');
                                        setQuests(prev => [...newQuests, ...prev]);
                                        
                                        // Save to Reality (Persistence)
                                        if (user?.uid) {
                                            // Save Quests
                                            newQuests.forEach(q => {
                                                persistenceService.quests.save(user.uid, q).catch((err: any) => 
                                                    console.error("Failed to save smart quest:", err)
                                                );
                                            });
                                            
                                            // Save Strategic Map
                                            persistenceService.smartProjects.save(user.uid, project).catch((err: any) => 
                                                    console.error("Failed to save smart project:", err)
                                                );
                                            }

                                            setIsWizardOpen(false);
                                        }}
                                        onCancel={() => setIsWizardOpen(false)}
                                    />
                                </Suspense>
                            )}
                        </AnimatePresence>
                    </div>

                    {typeof document !== 'undefined' && createPortal(
                        <Dock 
                            currentView={currentView} 
                            onChangeView={handleDockViewChange} 
                            onOpenModal={handleOpenModal} 
                            isOpen={isDockOpen} 
                            onToggle={setIsDockOpen} 
                            isHidden={isSettingsOpen || isFocusMode || isNoteTaking || isWizardOpen || isFullScreenFocus || isProjectDetailOpen || isPomodoroActive || !!activeModal || currentView === 'STREAK'}
                            pointerEvents={isSettingsOpen || isDockConfigOpen ? 'none' : 'auto'}
                            dashboardStyle={dashboardStyle}
                            taskViewMode={taskViewMode}
                            habitViewMode={habitViewMode}
                            noteViewMode={noteViewMode}
                            dockConfig={dockConfig}
                        />,
                        document.body
                    )}
                    
                    <DockConfigModal
                        isOpen={isDockConfigOpen}
                        onClose={() => setIsDockConfigOpen(false)}
                        config={dockConfig}
                        onSave={updateDockConfig}
                    />
                    
                    {/* --- GLOBAL BACKDROP (OPTIMIZED) --- */}
                    <AnimatePresence>
                        {((activeModal && activeModal !== 'BAD_HABIT') || validationHabit || (isDockOpen && !isSettingsOpen && !isDockConfigOpen)) && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="fixed inset-0 z-[350] bg-black/60 gpu-accelerated"
                                onPointerDown={(e) => { 
                                    // NO PROPAGATION IF SETTINGS ARE OPEN
                                    if (isSettingsOpen || isDockConfigOpen) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        return;
                                    }
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setActiveModal(null); 
                                    setValidationHabit(null); 
                                    setIsDockOpen(false); 
                                    setModalInitialContext(null); 
                                }} 
                            />
                        )}
                    </AnimatePresence>

                    {/* MODALS */}
                    <QuestModal 
                        isOpen={activeModal === 'QUEST'} 
                        onClose={handleQuestModalClose} 
                        attributes={attributes} 
                        projects={projects} 
                        smartProjects={smartProjects}
                        onConfirm={handleQuestSave}
                        lockedAttributeId={smartTaskProps?.lockedAttributeId}
                        lockedDate={smartTaskProps?.lockedDate}
                        lockedSmartProjectId={smartTaskProps?.lockedSmartProjectId}
                        isSmartTask={!!smartTaskProps}
                        initialValues={editingQuest || undefined}
                    />
                    <HabitModal 
                        isOpen={activeModal === 'HABIT'} 
                        onClose={() => { setActiveModal(null); setEditingHabit(null); setModalInitialContext(null); }} 
                        attributes={attributes} 
                        smartProjects={smartProjects}
                        projects={projects}
                        onConfirm={handleHabitConfirm}
                        initialData={editingHabit || modalInitialContext || undefined}
                        onSwitchToBadHabit={() => setActiveModal('BAD_HABIT')}
                    />
                    <ProjectModal 
                        isOpen={activeModal === 'PROJECT'} 
                        onClose={() => { setActiveModal(null); setModalInitialContext(null); }} 
                        attributes={attributes} 
                        smartProjects={smartProjects} 
                        onConfirm={handleProjectConfirmAndReset} 
                        onDelete={handleDeleteProjectRequest}
                        initialData={modalInitialContext || undefined}
                    />

                    <BadHabitWizard 
                        isOpen={activeModal === 'BAD_HABIT'}
                        onClose={() => { setActiveModal(null); setEditingBadHabit(null); }}
                        onConfirm={handleBadHabitConfirm}
                        attributes={attributes}
                        isFirstIdentify={badHabits.length === 0}
                        onSwitchToHabit={() => setActiveModal('HABIT')}
                        initialData={editingBadHabit || undefined}
                    />

                    {activeModal === 'RELAPSE' && relapsingHabit && (
                        <RelapseModal 
                            isOpen={true}
                            onClose={() => { setActiveModal(null); setRelapsingHabit(null); }}
                            habit={relapsingHabit}
                            onConfirm={(method) => {
                                handleBadHabitRelapse(relapsingHabit, method);
                                setActiveModal(null);
                                setRelapsingHabit(null);
                            }}
                            userGold={player.gold}
                        />
                    )}
                    
                    {/* Validation Modal */}
                    <ValidationModal 
                        habit={validationHabit} 
                        onClose={() => setValidationHabit(null)} 
                        attributes={attributes} 
                        valTempValue={valTempValue} 
                        setValTempValue={setValTempValue} 
                        setValidationHabit={setValidationHabit} 
                        onValidate={validateHabitProgress} 
                    />

                    {/* --- HABIT ACTIONS & CONFIRMATION --- */}
                    <HabitActionsModal 
                        habit={habitActionsHabit}
                        onClose={() => setHabitActionsHabit(null)}
                        onEdit={(h) => handleEditHabit(h)}
                        onArchive={handleArchiveHabit}
                        onDelete={handleDeleteHabitRequest}
                    />

                    <BadHabitActionsModal 
                        habit={badHabitActionsHabit}
                        onClose={() => setBadHabitActionsHabit(null)}
                        onEdit={(h) => handleEditBadHabit(h)}
                        onArchive={handleArchiveBadHabit}
                        onDelete={handleDeleteBadHabitRequest}
                    />

                    <ConfirmationModal
                        isOpen={confirmationModal.isOpen}
                        onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
                        onConfirm={confirmationModal.onConfirm}
                        title={confirmationModal.title}
                        message={confirmationModal.message}
                        confirmText={confirmationModal.confirmText}
                        variant={confirmationModal.variant}
                    />

                </main>

                {/* --- SETTINGS OVERLAY --- */}
                <AnimatePresence>
                    {isSettingsOpen && (
                        <Suspense fallback={null}>
                            <SettingsView 
                                currentTheme={currentTheme}
                                onThemeToggle={(id) => setCurrentTheme(id as any)}
                                showProfile={showProfile}
                                onToggleProfile={setShowProfile}
                                onClose={() => setIsSettingsOpen(false)}
                                initialTab={settingsInitialTab}
                                defaultChartMode={defaultChartMode}
                                onSetDefaultChartMode={setDefaultChartMode}
                                attributes={attributes}
                                onUpdateAttribute={updateAttributeMetadata}
                                onAddAttribute={addAttribute}
                                onRemoveAttribute={removeAttribute}
                                onShowPro={() => setActiveModal('PRO')}
                                isPro={user?.plan === 'PRO'}
                                dashboardStyle={dashboardStyle}
                                onDashboardStyleChange={updateDashboardStyle}
                                avatarShape={avatarShape}
                                onAvatarShapeChange={updateAvatarShape}
                                vividMode={vividMode}
                                onToggleVividMode={setVividMode}
                                habitSectionControl={habitSectionControl}
                                onUpdateHabitSectionControl={updateHabitSectionControl}
                                allowDockSectionSwitch={allowDockSectionSwitch}
                                onUpdateAllowDockSectionSwitch={updateAllowDockSectionSwitch}
                                onOpenDockConfig={() => {
                                    setIsSettingsOpen(false);
                                    setIsDockConfigOpen(true);
                                }}
                                weekStartDay={weekStartDay}
                                onWeekStartDayChange={updateWeekStartDay}
                            />
                        </Suspense>
                    )}
                </AnimatePresence>

                {/* STREAK ROADMAP OVERLAY - Root Level */}
                <AnimatePresence>
                    {currentView === 'STREAK' && (
                        <Suspense fallback={<div className="fixed inset-0 z-[500] bg-black" />}>
                            <StreakRoadmapView
                                habits={habits}
                                onClose={() => setCurrentView('HABITS')}
                            />
                        </Suspense>
                    )}
                </AnimatePresence>

                {/* POMODORO OVERLAY - Root Level */}
                <AnimatePresence>
                    {isPomodoroActive && (
                        <Suspense fallback={<div className="fixed inset-0 z-[500] bg-black" />}>
                            <PomodoroView 
                                projects={projects}
                                attributes={attributes}
                                onExit={() => setIsPomodoroActive(false)}
                                onCompleteSession={handleCompleteSession}
                                onUpdateProject={handleUpdateProject}
                                onDeleteSession={handleDeleteSession}
                                onAddManualSession={handleAddManualSession}
                                onEditSession={handleEditSession}
                                initialProjectId={focusAutoStartProjectId}
                            />
                        </Suspense>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
