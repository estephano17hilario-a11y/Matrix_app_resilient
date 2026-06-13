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

// 2. Beautiful bell-chime E-maj9 chord sound for completing a habit
export function playHabitCompleteSound() {
    try {
        const ctx = getAudioContext();
        const t = ctx.currentTime;
        
        // E-major 9th/C#minor 11th-like beautiful chime notes
        const notes = [329.63, 415.30, 493.88, 622.25, 739.99, 987.77, 1318.51];
        
        // Dynamic lowpass filter to warm up the decay
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.setValueAtTime(1.5, t);
        filter.frequency.setValueAtTime(6000, t);
        filter.frequency.exponentialRampToValueAtTime(1500, t + 1.8);
        filter.connect(ctx.destination);

        notes.forEach((freq, index) => {
            // Arpeggiate slightly for an elegant strum effect
            const delay = index * 0.04;
            const dur = 2.0 - (index * 0.15); // Higher notes decay faster
            
            // Create stereo pan if supported
            let targetNode: AudioNode = filter;
            if (ctx.createStereoPanner) {
                const panner = ctx.createStereoPanner();
                // Pan notes left-to-right based on frequency/index
                const panVal = (index / (notes.length - 1)) * 1.4 - 0.7; // Range -0.7 to 0.7
                panner.pan.setValueAtTime(panVal, t + delay);
                panner.connect(filter);
                targetNode = panner;
            }

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, t + delay);
            // Soft click-free attack
            gain.gain.linearRampToValueAtTime(0.04, t + delay + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);

            // 1. Primary oscillator (sine)
            const osc1 = ctx.createOscillator();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(freq, t + delay);
            // Micro-detuning for chorus texture
            osc1.detune.setValueAtTime(-4, t + delay);

            // 2. Unison oscillator (triangle) detuned positive
            const osc2 = ctx.createOscillator();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(freq, t + delay);
            osc2.detune.setValueAtTime(4, t + delay);

            // 3. High-pitch "Glass Tine" (metallic attack strike)
            const oscTine = ctx.createOscillator();
            oscTine.type = 'sine';
            // Inharmonic frequency multiplier for glass chime metallic strike
            oscTine.frequency.setValueAtTime(freq * 3.14, t + delay);
            
            const tineGain = ctx.createGain();
            tineGain.gain.setValueAtTime(0.04, t + delay);
            tineGain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.1); // very fast decay

            // Connections
            osc1.connect(gain);
            osc2.connect(gain);
            
            oscTine.connect(tineGain);
            tineGain.connect(gain);

            gain.connect(targetNode);

            osc1.start(t + delay);
            osc2.start(t + delay);
            oscTine.start(t + delay);

            osc1.stop(t + delay + dur);
            osc2.stop(t + delay + dur);
            oscTine.stop(t + delay + dur);
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

// 4. Soft stellar constellation aura sound for app entry
export function playStellarSound() {
    try {
        const ctx = getAudioContext();
        const t = ctx.currentTime;
        
        // A. Low detuned warm drone pad (F# major triad)
        // F#2 (92.50 Hz), C#3 (138.59 Hz), F#3 (185.00 Hz), A#3 (233.08 Hz)
        const padFreqs = [92.50, 138.59, 185.00, 233.08];
        const padGain = ctx.createGain();
        padGain.gain.setValueAtTime(0, t);
        padGain.gain.linearRampToValueAtTime(0.04, t + 0.5); // Very soft rise
        padGain.gain.exponentialRampToValueAtTime(0.001, t + 3.0); // Smooth decay
        padGain.connect(ctx.destination);

        padFreqs.forEach(freq => {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t);
            osc.detune.setValueAtTime(Math.random() * 10 - 5, t); // Slight detune for chorus
            osc.connect(padGain);
            osc.start(t);
            osc.stop(t + 3.0);
        });

        // B. Sparkling high stellar notes (F# maj9 arpeggio sweep)
        // F#4 (369.99), A#4 (466.16), C#5 (554.37), F5 (698.46), G#5 (830.61), C#6 (1108.73)
        const sparkleNotes = [369.99, 466.16, 554.37, 698.46, 830.61, 1108.73];
        sparkleNotes.forEach((freq, index) => {
            const delay = 0.2 + index * 0.12; // Slow arpeggiator sweep
            const dur = 1.6 - index * 0.12; // Higher notes decay faster
            
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t + delay);
            
            gain.gain.setValueAtTime(0, t + delay);
            gain.gain.linearRampToValueAtTime(0.025, t + delay + 0.1); // Soft attack
            gain.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);
            
            // Stereo panning
            if (ctx.createStereoPanner) {
                const panner = ctx.createStereoPanner();
                const panVal = index % 2 === 0 ? -0.55 : 0.55;
                panner.pan.setValueAtTime(panVal, t + delay);
                osc.connect(panner);
                panner.connect(gain);
            } else {
                osc.connect(gain);
            }
            
            gain.connect(ctx.destination);
            
            osc.start(t + delay);
            osc.stop(t + delay + dur);
        });
    } catch (e) {
        console.warn("Stellar sound playback failed", e);
    }
}
