import { useCallback, useRef, useState } from 'react';

export const useAudioAlarm = () => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const [isEnabled, setIsEnabled] = useState(true);

    const playAlarm = useCallback(() => {
        if (!isEnabled) return;

        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }

            const ctx = audioContextRef.current;
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            const t = ctx.currentTime;

            // Beautiful customized bell-like chord (Fmaj9)
            const notes = [
                { freq: 349.23, delay: 0.0, dur: 2.0, type: 'sine' as OscillatorType }, // F4
                { freq: 440.00, delay: 0.1, dur: 2.0, type: 'sine' as OscillatorType }, // A4
                { freq: 523.25, delay: 0.2, dur: 2.0, type: 'sine' as OscillatorType }, // C5
                { freq: 659.25, delay: 0.3, dur: 2.0, type: 'sine' as OscillatorType }, // E5
                { freq: 880.00, delay: 0.4, dur: 2.5, type: 'sine' as OscillatorType }, // A5
                { freq: 1046.50, delay: 0.5, dur: 3.0, type: 'sine' as OscillatorType } // C6
            ];

            notes.forEach(note => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                // Add a little bit of triangle wave for richness
                const osc2 = ctx.createOscillator();
                osc2.type = 'triangle';
                osc2.frequency.setValueAtTime(note.freq, t + note.delay);
                
                osc.type = note.type;
                osc.frequency.setValueAtTime(note.freq, t + note.delay);

                // Attack and long release (bell-like envelope)
                gain.gain.setValueAtTime(0, t + note.delay);
                gain.gain.linearRampToValueAtTime(0.15, t + note.delay + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, t + note.delay + note.dur);

                osc.connect(gain);
                osc2.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t + note.delay);
                osc2.start(t + note.delay);
                osc.stop(t + note.delay + note.dur);
                osc2.stop(t + note.delay + note.dur);
            });

            // Repeated pulse (like an alarm repeating 3 times)
            for(let i=1; i<3; i++) {
                const offset = i * 1.5;
                notes.forEach(note => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = note.type;
                    osc.frequency.setValueAtTime(note.freq, t + note.delay + offset);
                    
                    gain.gain.setValueAtTime(0, t + note.delay + offset);
                    gain.gain.linearRampToValueAtTime(0.15, t + note.delay + offset + 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + note.delay + offset + note.dur);

                    osc.connect(gain);
                    gain.connect(ctx.destination);

                    osc.start(t + note.delay + offset);
                    osc.stop(t + note.delay + offset + note.dur);
                });
            }

        } catch (e) {
            console.error("Audio playback failed", e);
        }
    }, [isEnabled]);

    const toggleSound = () => {
        setIsEnabled(prev => !prev);
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume().catch(console.error);
        }
    };

    return {
        playAlarm,
        isEnabled,
        toggleSound
    };
};
