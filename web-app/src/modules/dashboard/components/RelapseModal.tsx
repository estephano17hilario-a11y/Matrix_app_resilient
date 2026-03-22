import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Skull, Coins, Heart, AlertTriangle, ShieldCheck, Sparkles, RotateCcw, Check, ArrowDown } from 'lucide-react';
import { BadHabit } from '../../../types';
import { useTranslation } from 'react-i18next';

const STREAK_TARGETS = [1, 3, 7, 14, 30, 60, 90, 130, 180, 240, 310, 365];

interface RelapseModalProps {
    isOpen: boolean;
    onClose: () => void;
    habit: BadHabit;
    onConfirm: (method: 'GOLD' | 'HP') => void;
    userGold: number;
}

const AuroraBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full opacity-30" style={{ background: 'radial-gradient(circle, rgba(225,29,72,0.2) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] rounded-full opacity-30" style={{ background: 'radial-gradient(circle, rgba(127,29,29,0.2) 0%, transparent 70%)' }} />
    </div>
);

export const RelapseModal: React.FC<RelapseModalProps> = ({
    isOpen,
    onClose,
    habit,
    onConfirm,
    userGold
}) => {
    const { t } = useTranslation();
    if (!isOpen || typeof document === 'undefined') return null;

    const isIntelligent = habit.intelligentStreak;
    const currentTarget = habit.currentTarget || 1;
    const reachedDays = habit.reachedDays || 0;
    const isOpportunityDay = isIntelligent && reachedDays === currentTarget;

    const targetIndex = STREAK_TARGETS.indexOf(currentTarget);
    const previousTarget = targetIndex > 0 ? STREAK_TARGETS[targetIndex - 1] : 1;
    const nextTarget = targetIndex < STREAK_TARGETS.length - 1 ? STREAK_TARGETS[targetIndex + 1] : null;
    const { penalties } = habit;
    const canAffordGold = userGold >= penalties.gold && !isIntelligent;
    // HP Penalty should be based on impact or default to a reasonable value for intelligent vice
    const hpPenalty = isIntelligent ? Math.max(5, Math.floor(penalties.hp * 0.5)) : Math.max(1, Math.floor(penalties.hp * 0.5));

    return createPortal(
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#020204]/90"
                onClick={onClose}
            />

            <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 10 }}
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
                className="relative w-full max-w-md overflow-hidden rounded-[28px] border shadow-2xl max-h-[90vh] overflow-y-auto"
                style={{
                    borderColor: isIntelligent ? 'rgba(139, 92, 246, 0.25)' : 'rgba(225, 29, 72, 0.2)',
                    background: isIntelligent
                        ? 'linear-gradient(180deg, #0f0d17 0%, #0d0b14 100%)'
                        : 'linear-gradient(180deg, #1a0a0a 0%, #0d0b0d 100%)',
                    boxShadow: isIntelligent
                        ? '0 25px 50px -12px rgba(139, 92, 246, 0.2)'
                        : '0 25px 50px -12px rgba(225, 29, 72, 0.25)'
                }}
            >
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>
                <AuroraBackground />

                <div className="relative p-7 text-center space-y-5">
                    {isIntelligent ? (
                        <>
                            <div className="relative">
                                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-violet-500/20 to-indigo-500/20 rounded-full flex items-center justify-center border border-violet-500/30 shadow-[0_0_30px_rgba(139,92,246,0.2)]">
                                    <Sparkles className="text-violet-400 drop-shadow-[0_0_10px_rgba(139,92,246,0.8)]" size={36} />
                                </div>
                                {isOpportunityDay && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute -top-1 -right-1 w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg"
                                    >
                                        <Check size={14} className="text-white" />
                                    </motion.div>
                                )}
                            </div>

                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight mb-2">
                                    {isOpportunityDay ? t('badHabits.opportunityDay', 'Opportunity Day') : t('badHabits.intelligentFall', 'Intelligent Fall')}
                                </h2>
                                <p className="text-violet-200/80 font-medium text-[14px]">
                                    {isOpportunityDay
                                        ? t('badHabits.opportunityDesc', { defaultValue: `You can use "${habit.title}" without consequences. Congratulations!`, title: habit.title })
                                        : t('badHabits.relapseDesc', { defaultValue: `You have relapsed in "${habit.title}". The system is analyzing your progress...`, title: habit.title })}
                                </p>
                            </div>

                            {isOpportunityDay ? (
                                <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-2xl p-5 space-y-4">
                                    <div className="flex items-center justify-center gap-2 text-emerald-400">
                                        <Check size={20} />
                                        <span className="font-bold text-[15px]">{t('badHabits.noPenalty', 'No Penalty')}</span>
                                    </div>
                                    <div className="text-[13px] text-white/60 leading-relaxed">
                                        {t('badHabits.completedDays', { defaultValue: `You have completed ${currentTarget} days without the vice. You can take a free day and your progress remains intact.`, count: currentTarget })}
                                    </div>
                                    {nextTarget && (
                                        <div className="flex items-center justify-center gap-2 pt-2 border-t border-white/5">
                                            <span className="text-[11px] text-white/40">{t('badHabits.nextTarget', 'Next target:')}</span>
                                            <span className="text-[13px] font-bold text-violet-300">{nextTarget} {t('common.days', 'days')}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-4 space-y-3">
                                        <div className="flex items-center justify-center gap-2 text-rose-400">
                                            <RotateCcw size={18} />
                                            <span className="font-bold text-[13px]">{t('badHabits.streakRetrogressed', 'Streak Retrogressed')}</span>
                                        </div>

                                        <div className="flex items-center justify-center gap-4">
                                            <div className="text-center">
                                                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">{t('badHabits.previous', 'Previous')}</div>
                                                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                                    <span className="text-base font-black text-white/50">{currentTarget}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <ArrowDown size={16} className="text-rose-400/60" />
                                            </div>
                                            <div className="text-center">
                                                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">{t('badHabits.newGoal', 'New Goal')}</div>
                                                <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
                                                    <span className="text-base font-black text-rose-400">{previousTarget}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-4 space-y-3">
                                        <div className="flex items-center justify-center gap-2 text-rose-400">
                                            <Heart size={18} />
                                            <span className="font-bold text-[13px]">{t('badHabits.hpPenalty', 'HP Penalty')}</span>
                                        </div>
                                        <div className="flex items-center justify-center gap-3">
                                            <div className="w-14 h-14 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
                                                <span className="text-xl font-black text-rose-400">-{hpPenalty}</span>
                                            </div>
                                            <div className="text-[11px] text-white/50 leading-relaxed text-left">
                                                {t('badHabits.hpPenaltyDesc', 'Health reduced as a consequence of breaking your streak before completing the goal.')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                {isOpportunityDay ? (
                                    <motion.button
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => onConfirm('GOLD')}
                                        className="flex-1 py-3.5 rounded-xl font-bold text-[13px] bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg hover:shadow-emerald-500/25 transition-all"
                                    >
                                        {t('badHabits.confirmKeepProgress', 'Confirm & Keep Progress')}
                                    </motion.button>
                                ) : (
                                    <motion.button
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => onConfirm('HP')}
                                        className="flex-1 py-3.5 rounded-xl font-bold text-[13px] bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-lg hover:shadow-rose-500/25 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Heart size={16} />
                                        {t('badHabits.acceptPenalty', 'Accept Penalty')}
                                    </motion.button>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="relative">
                                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-rose-500/20 to-red-900/20 rounded-full flex items-center justify-center border border-rose-500/30 shadow-[0_0_30px_rgba(225,29,72,0.3)]">
                                    <div className="absolute inset-0 rounded-full border border-white/10 animate-ping opacity-20" />
                                    <Skull className="text-rose-500 drop-shadow-[0_0_10px_rgba(225,29,72,0.8)]" size={36} />
                                </div>
                            </div>

                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight mb-2">
                                    {t('badHabits.protocolFailure', 'Protocol Failure')}
                                </h2>
                                <p className="text-rose-200/80 font-medium text-[14px]">
                                    {t('badHabits.succumbed', { defaultValue: `You have succumbed to "${habit.title}".`, title: habit.title })}
                                </p>
                                <p className="text-white/40 text-[12px] mt-1">
                                    {t('badHabits.demandsCompensation', 'The system demands compensation.')}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => onConfirm('GOLD')}
                                    disabled={!canAffordGold}
                                    className={`relative p-4 rounded-xl border transition-all group overflow-hidden ${
                                        canAffordGold
                                            ? 'bg-amber-950/20 border-amber-500/30 hover:bg-amber-500/20 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                                            : 'bg-white/5 border-white/5 opacity-40 cursor-not-allowed grayscale'
                                    }`}
                                >
                                    <div className="absolute top-2 right-2">
                                        <Coins size={16} className={canAffordGold ? "text-amber-400" : "text-slate-500"} />
                                    </div>
                                    <div className="text-amber-400 font-black text-2xl mb-1 tracking-tight">
                                        {penalties.gold}
                                    </div>
                                    <div className="text-[10px] uppercase font-bold text-amber-200/60 tracking-wider mb-2">
                                        {t('common.gold', 'Gold')}
                                    </div>

                                    {canAffordGold ? (
                                        <div className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                                            <ShieldCheck size={9} />
                                            NO DMG
                                        </div>
                                    ) : (
                                        <div className="text-[9px] text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded-full inline-block">
                                            {t('badHabits.missingGold', 'MISSING')}
                                        </div>
                                    )}
                                </button>

                                <button
                                    onClick={() => onConfirm('HP')}
                                    className="relative p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 hover:bg-rose-900/30 hover:scale-[1.02] transition-all group hover:shadow-[0_0_20px_rgba(225,29,72,0.15)]"
                                >
                                    <div className="absolute top-2 right-2">
                                        <Heart size={16} className="text-rose-500" />
                                    </div>
                                    <div className="text-rose-500 font-black text-2xl mb-1 tracking-tight">
                                        -{penalties.hp}
                                    </div>
                                    <div className="text-[10px] uppercase font-bold text-rose-200/60 tracking-wider mb-2">
                                        HP
                                    </div>

                                    <div className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-full border border-indigo-500/20">
                                        <AlertTriangle size={9} />
                                        -{penalties.xp} XP
                                    </div>
                                </button>
                            </div>

                            <button
                                onClick={onClose}
                                className="text-white/30 text-[12px] hover:text-white transition-colors py-2 px-4 rounded-full hover:bg-white/5"
                            >
                                {t('badHabits.cancelFalseAlarm', 'Cancel (False Alarm)')}
                            </button>
                        </>
                    )}
                </div>
            </motion.div>
        </div>,
        document.body
    );
};