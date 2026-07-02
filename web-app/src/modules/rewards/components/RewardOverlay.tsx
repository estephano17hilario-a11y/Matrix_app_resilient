import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, animate } from 'framer-motion';
import { Zap, Star, Coins, ArrowRight } from 'lucide-react';
import { useReward } from '../context/RewardContext';
import { useTranslation } from 'react-i18next';
import { calculateNextLevelXp, calculateXpForLevel } from '../../../utils/leveling';

// --- Constants ---
const STEP_DURATION = 1500;

export const RewardOverlay: React.FC = () => {
  const { t } = useTranslation();
  const { queue, dismissReward, setIsAnimating } = useReward();
  const [currentReward, setCurrentReward] = useState<any>(null);
  const [step, setStep] = useState<'IDLE' | 'XP' | 'TRAIT' | 'SUBTRAIT' | 'GOLD'>('IDLE');

  const traitLabel: string | null =
    typeof currentReward?.traitName === 'string' ? currentReward.traitName : null;
  const subTraitLabel: string | null =
    typeof currentReward?.subTraitName === 'string' ? currentReward.subTraitName : null;

  // Visual State for animations
  const [visualState, setVisualState] = useState({
    level: 0,
    currentXp: 0,
    maxXp: 100,
    percent: 0,
    isLevelUpAnimating: false,
  });

  // ── Pick next reward from queue ──────────────────────────────────────────
  useEffect(() => {
    if (queue.length > 0 && !currentReward) {
      const reward = queue[0];
      setCurrentReward(reward);
      setIsAnimating(true);
      if (reward.xpGained !== 0) {
        setStep('XP');
      } else if (reward.traitId && reward.traitXpGained !== 0) {
        setStep('TRAIT');
      } else if (reward.subTraitId && reward.subTraitXpGained !== 0) {
        setStep('SUBTRAIT');
      } else if (reward.goldGained !== 0) {
        setStep('GOLD');
      } else {
        setStep('XP');
      }
    }
  }, [queue, currentReward, setIsAnimating]);

  // ── Sequence controller ──────────────────────────────────────────────────
  useEffect(() => {
    if (!currentReward) return;
    let cancelled = false;

    const run = async () => {
      try {
        if (step === 'XP') {
          await runXpAnimation();
          if (!cancelled) advanceFromXp();
        } else if (step === 'TRAIT') {
          await wait(STEP_DURATION);
          if (!cancelled) advanceFromTrait();
        } else if (step === 'SUBTRAIT') {
          await wait(STEP_DURATION);
          if (!cancelled) advanceFromSubTrait();
        } else if (step === 'GOLD') {
          await wait(STEP_DURATION);
          if (!cancelled) finish();
        }
      } catch {
        if (!cancelled) finish();
      }
    };

    run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, currentReward]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

  const runXpAnimation = async () => {
    const startLevel = currentReward.initialLevel ?? currentReward.level;
    const endLevel   = currentReward.level;
    const isNeg      = currentReward.xpGained < 0;

    if (isNeg) {
      const base    = calculateXpForLevel(endLevel);
      const nextTot = calculateNextLevelXp(endLevel);
      const max     = nextTot - base;
      setVisualState({ level: endLevel, currentXp: currentReward.currentXp, maxXp: max, percent: (currentReward.currentXp / max) * 100, isLevelUpAnimating: false });
      await wait(1500);
      return;
    }

    let lvl = startLevel;
    let relXp =
      currentReward.initialXp !== undefined
        ? currentReward.initialXp
        : startLevel === endLevel
          ? Math.max(0, currentReward.currentXp - currentReward.xpGained)
          : 0;

    while (lvl <= endLevel) {
      const isLast  = lvl === endLevel;
      const base    = calculateXpForLevel(lvl);
      const nextTot = calculateNextLevelXp(lvl);
      const max     = nextTot - base;
      const target  = isLast ? currentReward.currentXp : max;

      setVisualState({ level: lvl, currentXp: relXp, maxXp: max, percent: (relXp / max) * 100, isLevelUpAnimating: false });
      await wait(300);

      await animate(relXp, target, {
        duration: 1,
        ease: 'circOut',
        onUpdate: v =>
          setVisualState(p => ({ ...p, currentXp: v, percent: (v / max) * 100 })),
      });

      if (!isLast) {
        setVisualState(p => ({ ...p, isLevelUpAnimating: true }));
        await wait(800);
        lvl++;
        relXp = 0;
      } else {
        break;
      }
    }

    await wait(500);
  };

  const advanceFromXp = () => {
    if (currentReward.traitId && currentReward.traitXpGained !== 0) setStep('TRAIT');
    else if (currentReward.subTraitId && currentReward.subTraitXpGained !== 0) setStep('SUBTRAIT');
    else if (currentReward.goldGained !== 0) setStep('GOLD');
    else finish();
  };

  const advanceFromTrait = () => {
    if (currentReward.subTraitId && currentReward.subTraitXpGained !== 0) setStep('SUBTRAIT');
    else if (currentReward.goldGained !== 0) setStep('GOLD');
    else finish();
  };

  const advanceFromSubTrait = () => {
    if (currentReward.goldGained !== 0) setStep('GOLD');
    else finish();
  };

  const finish = () => {
    setStep('IDLE');
    setTimeout(() => {
      dismissReward(currentReward.id);
      setCurrentReward(null);
      setIsAnimating(false);
    }, 300);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  // Rendered INLINE (no portal) with position:fixed at very high z-index.
  // This guarantees the card is ALWAYS visible regardless of parent overflow.
  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        left: 0,
        right: 0,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence mode="sync">
        {currentReward && step !== 'IDLE' && (
          <motion.div
            key="reward-toast"
            initial={{ opacity: 0, scale: 0.88, y: -24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -10 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26, mass: 0.9 }}
            style={{ pointerEvents: 'auto', width: 320 }}
          >
            {/* Card */}
            <div
              style={{
                position: 'relative',
                borderRadius: 24,
                overflow: 'hidden',
                backgroundColor: 'rgba(6, 6, 12, 0.96)',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 24px 48px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
              }}
            >
              {/* Accent gradient top */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background:
                    step === 'XP'
                      ? 'linear-gradient(90deg, #6366f1, #a855f7)'
                      : step === 'TRAIT'
                        ? 'linear-gradient(90deg, #22d3ee, #3b82f6)'
                        : step === 'SUBTRAIT'
                          ? 'linear-gradient(90deg, #10b981, #06b6d4)'
                          : 'linear-gradient(90deg, #fbbf24, #f59e0b)',
                  opacity: 0.8,
                }}
              />

              <div style={{ padding: 20 }}>
                <AnimatePresence mode="wait">

                  {/* ── XP STEP ─────────────────────────────────────────── */}
                  {step === 'XP' && currentReward && (
                    <motion.div
                      key="xp-step"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                    >
                      {/* Row: label + delta */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.16em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                          {currentReward.source}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 900, fontFamily: 'monospace', color: currentReward.xpGained < 0 ? '#f87171' : '#a5b4fc' }}>
                          {currentReward.xpGained > 0 ? '+' : ''}{currentReward.xpGained} XP
                        </span>
                      </div>

                      {/* XP bar */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ padding: 4, borderRadius: 6, background: currentReward.xpGained < 0 ? 'linear-gradient(135deg,#ef4444,#f97316)' : 'linear-gradient(135deg,#6366f1,#a855f7)', display: 'flex' }}>
                              <Zap size={11} color="white" />
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {currentReward.xpGained < 0 ? 'Regression' : 'Experience'}
                            </span>
                          </div>
                          <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
                            {Math.floor(visualState.currentXp)} <span style={{ color: 'rgba(255,255,255,0.3)' }}>/ {Math.floor(visualState.maxXp)}</span>
                          </span>
                        </div>
                        <div style={{ width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                          <motion.div
                            style={{ height: '100%', background: currentReward.xpGained < 0 ? 'linear-gradient(90deg,#ef4444,#f97316)' : 'linear-gradient(90deg,#6366f1,#a855f7)', borderRadius: 99 }}
                            animate={{ width: `${Math.min(100, Math.max(0, (visualState.currentXp / visualState.maxXp) * 100))}%` }}
                            transition={{ duration: 0.08 }}
                          />
                        </div>
                      </div>

                      {/* Level row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 28 }}>
                        {!visualState.isLevelUpAnimating ? (
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.18em', fontFamily: 'monospace' }}>Level</span>
                            <span style={{ fontSize: 22, fontWeight: 700, color: 'white', lineHeight: 1 }}>{visualState.level}</span>
                          </div>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{visualState.level}</span>
                              <ArrowRight size={14} color="rgba(255,255,255,0.3)" />
                              <span style={{ fontSize: 26, fontWeight: 800, color: '#facc15', textShadow: '0 0 16px rgba(250,204,21,0.5)' }}>{visualState.level + 1}</span>
                            </div>
                            <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 900, color: '#eab308', backgroundColor: 'rgba(234,179,8,0.12)', padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(234,179,8,0.25)', letterSpacing: '0.2em', fontFamily: 'monospace' }}>
                              LEVEL UP
                            </span>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* ── TRAIT STEP ───────────────────────────────────────── */}
                  {step === 'TRAIT' && currentReward && (
                    <motion.div
                      key="trait-step"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.16em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                          {traitLabel ? t(traitLabel, traitLabel) : 'Trait'}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 900, fontFamily: 'monospace', color: '#22d3ee' }}>
                          +{currentReward.traitXpGained} TP
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ padding: 4, borderRadius: 6, background: 'linear-gradient(135deg,#22d3ee,#3b82f6)', display: 'flex' }}>
                              <Star size={11} color="white" />
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {traitLabel ? t(traitLabel, traitLabel) : 'Growth'}
                            </span>
                          </div>
                          <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
                            {Math.floor(currentReward.traitCurrentXp || 0)} <span style={{ color: 'rgba(255,255,255,0.3)' }}>/ {Math.floor(currentReward.traitMaxXp || 100)}</span>
                          </span>
                        </div>
                        <div style={{ width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                          <motion.div
                            style={{ height: '100%', background: 'linear-gradient(90deg,#22d3ee,#3b82f6)', borderRadius: 99 }}
                            initial={{ width: `${Math.max(0, Math.min(100, (((currentReward.traitCurrentXp || 0) - (currentReward.traitXpGained || 0)) / (currentReward.traitMaxXp || 100)) * 100))}%` }}
                            animate={{ width: `${Math.min(100, ((currentReward.traitCurrentXp || 0) / (currentReward.traitMaxXp || 100)) * 100)}%` }}
                            transition={{ duration: 1, ease: 'circOut' }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ── SUB-TRAIT STEP ────────────────────────────────────── */}
                  {step === 'SUBTRAIT' && currentReward && (
                    <motion.div
                      key="subtrait-step"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.16em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                          {subTraitLabel ? t(subTraitLabel, subTraitLabel) : 'Sub-Trait'}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 900, fontFamily: 'monospace', color: '#10b981' }}>
                          +{currentReward.subTraitXpGained} TP
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ padding: 4, borderRadius: 6, background: 'linear-gradient(135deg,#10b981,#06b6d4)', display: 'flex' }}>
                              <Star size={11} color="white" />
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {subTraitLabel ? t(subTraitLabel, subTraitLabel) : 'Sub Growth'}
                            </span>
                          </div>
                          <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
                            {Math.floor(currentReward.subTraitCurrentXp || 0)} <span style={{ color: 'rgba(255,255,255,0.3)' }}>/ {Math.floor(currentReward.subTraitMaxXp || 100)}</span>
                          </span>
                        </div>
                        <div style={{ width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                          <motion.div
                            style={{ height: '100%', background: 'linear-gradient(90deg,#10b981,#06b6d4)', borderRadius: 99 }}
                            initial={{ width: `${Math.max(0, Math.min(100, (((currentReward.subTraitCurrentXp || 0) - (currentReward.subTraitXpGained || 0)) / (currentReward.subTraitMaxXp || 100)) * 100))}%` }}
                            animate={{ width: `${Math.min(100, ((currentReward.subTraitCurrentXp || 0) / (currentReward.subTraitMaxXp || 100)) * 100)}%` }}
                            transition={{ duration: 1, ease: 'circOut' }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ── GOLD STEP ────────────────────────────────────────── */}
                  {step === 'GOLD' && currentReward && (
                    <motion.div
                      key="gold-step"
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      transition={{ duration: 0.2 }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 0' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 18, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: '12px 24px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', background: currentReward.goldGained < 0 ? 'linear-gradient(135deg,#6b7280,#475569)' : 'linear-gradient(135deg,#fcd34d,#d97706)', boxShadow: currentReward.goldGained >= 0 ? '0 0 20px rgba(251,191,36,0.35)' : 'none' }}>
                          <Coins size={20} color="white" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 24, fontWeight: 900, fontFamily: 'monospace', letterSpacing: '-0.02em', color: currentReward.goldGained < 0 ? '#fca5a5' : 'white' }}>
                            {currentReward.goldGained > 0 ? '+' : ''}{currentReward.goldGained}
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: 'monospace' }}>Coins</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
