let audioCtx: AudioContext | null = null;

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

// 1. Light sound for subtask completion / habit quantity increment
export function playLightSound() {
    try {
        const ctx = getAudioContext();
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.08);
        
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.08, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(t);
        osc.stop(t + 0.08);
    } catch (e) {
        console.warn("Sound playback failed", e);
    }
}

// 2. Beautiful bell-chime Fmaj9 chord sound for completing a habit
export function playHabitCompleteSound() {
    try {
        const ctx = getAudioContext();
        const t = ctx.currentTime;
        
        // Fmaj9-like bell sound
        const notes = [349.23, 440.00, 523.25, 659.25, 880.00]; // F4, A4, C5, E5, A5
        notes.forEach((freq, index) => {
            const delay = index * 0.06;
            const dur = 1.5;
            
            const osc = ctx.createOscillator();
            const oscTriangle = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t + delay);
            
            oscTriangle.type = 'triangle';
            oscTriangle.frequency.setValueAtTime(freq, t + delay);
            
            gain.gain.setValueAtTime(0, t + delay);
            gain.gain.linearRampToValueAtTime(0.05, t + delay + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);
            
            osc.connect(gain);
            oscTriangle.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(t + delay);
            oscTriangle.start(t + delay);
            
            osc.stop(t + delay + dur);
            oscTriangle.stop(t + delay + dur);
        });
    } catch (e) {
        console.warn("Sound playback failed", e);
    }
}

// 3. Uplifting major arpeggio sound for completing a task/quest
export function playQuestCompleteSound() {
    try {
        const ctx = getAudioContext();
        const t = ctx.currentTime;
        
        // Uplifting major arpeggio
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 1046.50]; // C4, E4, G4, C5, E5, C6
        notes.forEach((freq, index) => {
            const delay = index * 0.08;
            const dur = 1.0;
            
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t + delay);
            
            gain.gain.setValueAtTime(0, t + delay);
            gain.gain.linearRampToValueAtTime(0.08, t + delay + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(t + delay);
            osc.stop(t + delay + dur);
        });
    } catch (e) {
        console.warn("Sound playback failed", e);
    }
}
