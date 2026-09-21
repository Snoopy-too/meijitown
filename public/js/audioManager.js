// Project Meiji - Procedural Web Audio Synthesis & Ambience Engine (audioManager.js)
// ponytail: zero-asset Web Audio synthesis, master gain mute toggle & seasonal countryside soundscape

export class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.isAmbienceActive = false;
        this.isSummerActive = false;
        this.isAutumnActive = false;
        this.cicadaSwellTimer = null;
        this.cricketTimer = null;
        this.hasInteracted = false;

        // Restore mute state from local storage
        try {
            this.isMuted = localStorage.getItem('meiji_sound_muted') === 'true';
        } catch (_) {
            this.isMuted = false;
        }
    }

    init(fromGesture = false) {
        if (fromGesture) {
            this.hasInteracted = true;
        }
        if (!this.ctx && this.hasInteracted) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(this.isMuted ? 0.0 : 1.0, this.ctx.currentTime);
                this.masterGain.connect(this.ctx.destination);
            }
        }
        if (this.ctx && this.ctx.state === 'suspended' && this.hasInteracted) {
            this.ctx.resume().catch(() => {});
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        try {
            localStorage.setItem('meiji_sound_muted', this.isMuted ? 'true' : 'false');
        } catch (_) {}

        if (this.masterGain && this.ctx) {
            const now = this.ctx.currentTime;
            this.masterGain.gain.cancelScheduledValues(now);
            this.masterGain.gain.linearRampToValueAtTime(this.isMuted ? 0.0 : 1.0, now + 0.05);
        }
        return this.isMuted;
    }

    setMute(mute) {
        this.isMuted = !!mute;
        try {
            localStorage.setItem('meiji_sound_muted', this.isMuted ? 'true' : 'false');
        } catch (_) {}
        if (this.masterGain && this.ctx) {
            const now = this.ctx.currentTime;
            this.masterGain.gain.cancelScheduledValues(now);
            this.masterGain.gain.linearRampToValueAtTime(this.isMuted ? 0.0 : 1.0, now + 0.05);
        }
    }

    getDestination() {
        return this.masterGain || (this.ctx ? this.ctx.destination : null);
    }

    // Crisp wooden block / mallet clack on tile placement
    playWoodClack() {
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(680, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.05);

        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(this.getDestination());
        osc.start(now);
        osc.stop(now + 0.06);
    }

    // Alias for backward compatibility
    playMalletClack() {
        this.playWoodClack();
    }

    playBuild() {
        this.playWoodClack();
    }

    // Traditional wooden fire patrol clappers (Hyōshigi 拍子木)
    playHyoshigiClappers() {
        this.playWoodClack();
        setTimeout(() => this.playWoodClack(), 220);
    }

    // Subtle bronze bell chime on simulation month advance
    playMonthAdvance() {
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        // Dual soft harmonics (E6: 1318Hz, B6: 1975Hz)
        const harmonics = [1318, 1975];
        for (const f of harmonics) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, now);

            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.65);

            osc.connect(gain);
            gain.connect(this.getDestination());
            osc.start(now);
            osc.stop(now + 0.7);
        }
    }

    // Deep temple bell (Bonshō / Kane 梵鐘) for New Year calendar rollover
    playNewYearBell() {
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const harmonics = [
            { f: 164, g: 0.55, dur: 3.8 },
            { f: 298, g: 0.35, dur: 3.0 },
            { f: 472, g: 0.22, dur: 2.4 },
            { f: 680, g: 0.12, dur: 1.6 }
        ];

        for (const h of harmonics) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(h.f, now);

            gain.gain.setValueAtTime(h.g, now);
            gain.gain.exponentialRampToValueAtTime(0.0005, now + h.dur);

            osc.connect(gain);
            gain.connect(this.getDestination());
            osc.start(now);
            osc.stop(now + h.dur);
        }
    }

    // Historical bronze fire alarm bell (Hanshō / 半鐘 - rapid emergency double strike)
    playBellChime() {
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const strikes = [
            { timeOffset: 0.00, freqs: [784, 1175, 1568], gainLevel: 0.28 },
            { timeOffset: 0.16, freqs: [880, 1320, 1760], gainLevel: 0.24 }
        ];

        for (const s of strikes) {
            const t = now + s.timeOffset;
            for (const f of s.freqs) {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(f, t);

                gain.gain.setValueAtTime(s.gainLevel, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);

                osc.connect(gain);
                gain.connect(this.getDestination());
                osc.start(t);
                osc.stop(t + 0.78);
            }
        }
    }

    // Crunchy demolition thud
    playDemolish() {
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.25;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, now);
        filter.frequency.exponentialRampToValueAtTime(80, now + 0.25);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.6, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        whiteNoise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.getDestination());
        whiteNoise.start(now);

        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.2);

        oscGain.gain.setValueAtTime(0.7, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc.connect(oscGain);
        oscGain.connect(this.getDestination());
        osc.start(now);
        osc.stop(now + 0.22);
    }

    // Volunteer bucket water douse
    playWaterSplash() {
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.35;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, now);
        filter.frequency.exponentialRampToValueAtTime(320, now + 0.35);
        filter.Q.setValueAtTime(2.0, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.55, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(this.getDestination());
        whiteNoise.start(now);
    }

    // Ambient Countryside Soundscape (Gentle Wind Breeze + Seasonal Insects)
    startAmbience() {
        this.init();
        if (!this.ctx || this.isAmbienceActive) return;
        this.isAmbienceActive = true;

        try {
            // 1. Procedural Wind Breeze (Lowpassed noise with subtle LFO modulation)
            const bufferSize = this.ctx.sampleRate * 2.0;
            const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

            this.windSource = this.ctx.createBufferSource();
            this.windSource.buffer = noiseBuffer;
            this.windSource.loop = true;

            this.windFilter = this.ctx.createBiquadFilter();
            this.windFilter.type = 'lowpass';
            this.windFilter.frequency.setValueAtTime(220, this.ctx.currentTime);

            this.windGain = this.ctx.createGain();
            this.windGain.gain.setValueAtTime(0.035, this.ctx.currentTime);

            this.windSource.connect(this.windFilter);
            this.windFilter.connect(this.windGain);
            this.windGain.connect(this.getDestination());
            this.windSource.start();

            // 2. Seasonal Summer Cicada Synthesizer (Dual bandpass resonators)
            const cicadaBufferLen = this.ctx.sampleRate * 2.0;
            const cicadaNoiseBuffer = this.ctx.createBuffer(1, cicadaBufferLen, this.ctx.sampleRate);
            const cicadaData = cicadaNoiseBuffer.getChannelData(0);
            for (let i = 0; i < cicadaBufferLen; i++) cicadaData[i] = Math.random() * 2 - 1;

            this.cicadaNoiseSource = this.ctx.createBufferSource();
            this.cicadaNoiseSource.buffer = cicadaNoiseBuffer;
            this.cicadaNoiseSource.loop = true;

            const bp1 = this.ctx.createBiquadFilter();
            bp1.type = 'bandpass';
            bp1.frequency.setValueAtTime(4300, this.ctx.currentTime);
            bp1.Q.setValueAtTime(3.8, this.ctx.currentTime);

            const bp2 = this.ctx.createBiquadFilter();
            bp2.type = 'bandpass';
            bp2.frequency.setValueAtTime(5800, this.ctx.currentTime);
            bp2.Q.setValueAtTime(5.5, this.ctx.currentTime);

            this.cicadaNoiseSource.connect(bp1);
            this.cicadaNoiseSource.connect(bp2);

            this.cicadaTremoloGain = this.ctx.createGain();
            this.cicadaTremoloGain.gain.setValueAtTime(0.5, this.ctx.currentTime);

            bp1.connect(this.cicadaTremoloGain);
            bp2.connect(this.cicadaTremoloGain);

            this.cicadaLfo = this.ctx.createOscillator();
            this.cicadaLfo.type = 'sine';
            this.cicadaLfo.frequency.setValueAtTime(24, this.ctx.currentTime);

            const lfoDepth = this.ctx.createGain();
            lfoDepth.gain.setValueAtTime(0.42, this.ctx.currentTime);
            this.cicadaLfo.connect(lfoDepth);
            lfoDepth.connect(this.cicadaTremoloGain.gain);

            this.cicadaMasterGain = this.ctx.createGain();
            this.cicadaMasterGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

            this.cicadaTremoloGain.connect(this.cicadaMasterGain);
            this.cicadaMasterGain.connect(this.getDestination());

            this.cicadaNoiseSource.start();
            this.cicadaLfo.start();
        } catch (e) {
            console.warn('Procedural ambience init skipped:', e);
        }
    }

    triggerCicadaWave() {
        if (!this.ctx || !this.isSummerActive || !this.cicadaMasterGain) return;
        const now = this.ctx.currentTime;
        const peakGain = 0.015;

        this.cicadaMasterGain.gain.cancelScheduledValues(now);
        this.cicadaMasterGain.gain.setValueAtTime(0.0001, now);
        this.cicadaMasterGain.gain.linearRampToValueAtTime(peakGain, now + 3.0);
        this.cicadaMasterGain.gain.setValueAtTime(peakGain, now + 7.5);
        this.cicadaMasterGain.gain.linearRampToValueAtTime(0.0001, now + 10.5);
        this.cicadaMasterGain.gain.setValueAtTime(0.0, now + 11.0);

        if (this.cicadaSwellTimer) clearTimeout(this.cicadaSwellTimer);
        this.cicadaSwellTimer = setTimeout(() => {
            if (this.isSummerActive) this.triggerCicadaWave();
        }, 17000);
    }

    updateAmbience(month) {
        if (!this.ctx || !this.isAmbienceActive) return;
        const isSummer = (month >= 6 && month <= 8);

        if (isSummer) {
            if (!this.isSummerActive) {
                this.isSummerActive = true;
                this.triggerCicadaWave();
            }
        } else {
            this.isSummerActive = false;
            if (this.cicadaSwellTimer) {
                clearTimeout(this.cicadaSwellTimer);
                this.cicadaSwellTimer = null;
            }
            if (this.cicadaMasterGain) {
                const now = this.ctx.currentTime;
                this.cicadaMasterGain.gain.cancelScheduledValues(now);
                this.cicadaMasterGain.gain.linearRampToValueAtTime(0.0, now + 1.2);
            }
        }
    }
}

export const SOUND = new AudioManager();
export const audioManager = SOUND;
