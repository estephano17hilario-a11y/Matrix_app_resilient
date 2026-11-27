import { LuxMascot, type MascotMood } from './LuxMascot';
import { SpeechBubble } from './AuthUI';

interface MascotSaysProps {
  mood: MascotMood;
  look?: { x: number; y: number } | null;
  bubbleId: string;
  text: string;
  tone?: 'default' | 'error';
  size?: number;
}

/** Duolingo-style row: Lux on the left, its speech bubble on the right. */
export const MascotSays = ({ mood, look, bubbleId, text, tone, size = 100 }: MascotSaysProps) => (
  <div className="flex items-center gap-3.5 min-h-[112px]">
    <LuxMascot mood={mood} look={look} size={size} className="shrink-0 -ml-1" />
    <div className="flex-1 min-w-0">
      <SpeechBubble id={bubbleId} text={text} tone={tone} />
    </div>
  </div>
);

/** Maps a text length to a horizontal gaze so Lux "reads along" while you type. */
export const gazeFor = (text: string) => ({ x: Math.max(-1, Math.min(1, (text.length / 24) * 2 - 1)), y: 0.75 });
