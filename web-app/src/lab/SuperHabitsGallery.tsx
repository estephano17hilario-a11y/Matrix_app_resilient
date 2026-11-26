// DEV-ONLY: ?flames → every flame tier, every badge, and the 15 themes at a glance.
import React from 'react';
import { StreakFlame } from '@/modules/superHabits/StreakFlame';
import { BadgeEmblem, BADGE_METALS } from '@/modules/superHabits/BadgeEmblem';
import { BannerBackdrop } from '@/modules/superHabits/BannerBackdrop';
import { FLAME_TIERS } from '@/modules/superHabits/engine';
import { SUPER_HABIT_LIST } from '@/modules/superHabits/catalog';
import { SUPER_HABIT_EVENT } from '@/modules/superHabits/superHabitEvents';
import { SuperHabitFX } from '@/modules/superHabits/SuperHabitFX';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section style={{ padding: 16 }}>
    <h2 style={{ color: '#fff', font: '700 12px Inter', letterSpacing: 2, textTransform: 'uppercase', opacity: 0.6, margin: '0 0 12px' }}>{title}</h2>
    {children}
  </section>
);

export const SuperHabitsGallery = () => {
  const fire = (i: number, before: number, after: number) =>
    window.dispatchEvent(new CustomEvent(SUPER_HABIT_EVENT, { detail: { habitId: 'x', superHabit: SUPER_HABIT_LIST[i].id, title: 'x', streak: after, before } }));
  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#05050a', color: '#fff', font: '12px Inter' }}>
      <SuperHabitFX />
      <Section title="Llama por racha (apagada / encendida)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {FLAME_TIERS.map(t => (
            <div key={t.key} style={{ textAlign: 'center' }}>
              <StreakFlame streak={t.min} size={72} />
              <div style={{ marginTop: 6, fontWeight: 700 }}>{t.name} · {t.min}d</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 4 }}>
                <StreakFlame streak={t.min} size={16} lit={false} /><StreakFlame streak={t.min} size={16} />
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Insignias del roadmap">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {BADGE_METALS.map((m, i) => (
            <div key={m.name} style={{ textAlign: 'center' }}>
              <BadgeEmblem level={i} icon={SUPER_HABIT_LIST[i].icon} size={64} accent={SUPER_HABIT_LIST[i].colors.primary} />
              <div style={{ marginTop: 4 }}>{m.name}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <BadgeEmblem level={2} icon={SUPER_HABIT_LIST[0].icon} size={64} state="next" />
          <BadgeEmblem level={2} icon={SUPER_HABIT_LIST[0].icon} size={64} state="locked" />
        </div>
      </Section>
      <Section title="Los 15 + prueba de efectos (toca para probar un día normal / un hito)">
        <div style={{ display: 'grid', gap: 10 }}>
          {SUPER_HABIT_LIST.map((t, i) => (
            <div key={t.id} style={{ position: 'relative', height: 64, borderRadius: 16, overflow: 'hidden', border: `1px solid ${t.colors.primary}88` }}>
              <BannerBackdrop motif={t.motif} primary={t.colors.primary} secondary={t.colors.secondary} deep={t.colors.deep} />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', height: '100%' }}>
                <t.icon size={22} />
                <b style={{ flex: 1 }}>{t.name}</b>
                <button onClick={() => fire(i, 4, 5)} style={{ padding: '4px 8px', borderRadius: 8, background: '#0008', color: '#fff', border: '1px solid #fff4' }}>día</button>
                <button onClick={() => fire(i, 13, 14)} style={{ padding: '4px 8px', borderRadius: 8, background: '#0008', color: '#fff', border: '1px solid #fff4' }}>hito 14</button>
                <button onClick={() => fire(i, 59, 60)} style={{ padding: '4px 8px', borderRadius: 8, background: '#0008', color: '#fff', border: '1px solid #fff4' }}>hito 60</button>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};
