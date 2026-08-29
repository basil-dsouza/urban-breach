/**
 * Procedural Web Audio Sound Engine
 * Zero external asset dependencies — synthesized in real-time.
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterVolume = 0.65;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
                this.initialized = true;
            }
        } catch (e) {
            console.warn('Web Audio API not supported', e);
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    createNoiseBuffer(duration = 0.5) {
        if (!this.ctx) return null;
        const sampleRate = this.ctx.sampleRate;
        const numSamples = Math.max(1, Math.floor(sampleRate * duration));
        const buffer = this.ctx.createBuffer(1, numSamples, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    createDistortion(amount = 0.5) {
        if (!this.ctx) return null;
        const shaper = this.ctx.createWaveShaper();
        const n_samples = 256;
        const curve = new Float32Array(n_samples);
        for (let i = 0; i < n_samples; i++) {
            const x = (i * 2) / n_samples - 1;
            curve[i] = Math.tanh(x * amount * 5);
        }
        shaper.curve = curve;
        try {
            shaper.oversample = '4x';
        } catch (e) {
            console.warn('Oversampling not supported on WaveShaperNode', e);
        }
        return shaper;
    }

    /**
     * Player assault rifle gunshot sound
     */
    playRifleShot(scoped = false) {
        this.init();
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const mainGain = this.ctx.createGain();
        mainGain.gain.setValueAtTime(this.masterVolume * 0.9, t);

        // 1. Initial Transient Noise Crack
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(scoped ? 0.38 : 0.28);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(scoped ? 1400 : 2200, t);
        filter.frequency.exponentialRampToValueAtTime(320, t + 0.16);
        filter.Q.setValueAtTime(3.0, t);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(1.2, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(mainGain);

        // 2. Punchy Low-End Thud
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(scoped ? 160 : 200, t);
        osc.frequency.exponentialRampToValueAtTime(45, t + 0.1);

        oscGain.gain.setValueAtTime(0.95, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(oscGain);
        oscGain.connect(mainGain);

        // 3. High-frequency crack/bolt slam
        const crackOsc = this.ctx.createOscillator();
        const crackGain = this.ctx.createGain();
        crackOsc.type = 'triangle';
        crackOsc.frequency.setValueAtTime(400, t);
        crackOsc.frequency.linearRampToValueAtTime(80, t + 0.05);
        crackGain.gain.setValueAtTime(0.6, t);
        crackGain.gain.linearRampToValueAtTime(0.001, t + 0.05);
        crackOsc.connect(crackGain);
        crackGain.connect(mainGain);

        // Routing through Analog Compression and Waveshaper Distortion
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.setValueAtTime(-14, t);
        comp.knee.setValueAtTime(12, t);
        comp.ratio.setValueAtTime(16, t);
        comp.attack.setValueAtTime(0.001, t);
        comp.release.setValueAtTime(0.08, t);

        const dist = this.createDistortion(0.85);

        mainGain.connect(comp);
        comp.connect(dist);
        dist.connect(this.ctx.destination);

        noise.start(t);
        noise.stop(t + (scoped ? 0.28 : 0.38));
        osc.start(t);
        osc.stop(t + 0.14);
        crackOsc.start(t);
        crackOsc.stop(t + 0.06);
    }

    /**
     * Heavy .50 Cal Sniper Rifle Gunshot (Thunderous Boom & Long Acoustic Reverb)
     */
    playSniperFire(scoped = false) {
        this.init();
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const mainGain = this.ctx.createGain();
        mainGain.gain.setValueAtTime(this.masterVolume * 1.35, t);

        // 1. Supersonic whip & heavy noise blast
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.85);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(4500, t);
        filter.frequency.exponentialRampToValueAtTime(80, t + 0.65);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(1.6, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(mainGain);

        // 2. Heavy Sub-Bass Shockwave (Boom)
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sawtooth';
        sub.frequency.setValueAtTime(140, t);
        sub.frequency.exponentialRampToValueAtTime(20, t + 0.45);

        subGain.gain.setValueAtTime(1.8, t);
        subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.48);

        sub.connect(subGain);
        subGain.connect(mainGain);

        // Routing sniper through heavy distortion and compression
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.setValueAtTime(-8, t);
        comp.knee.setValueAtTime(8, t);
        comp.ratio.setValueAtTime(20, t);
        comp.attack.setValueAtTime(0.001, t);
        comp.release.setValueAtTime(0.24, t);

        const dist = this.createDistortion(1.4);

        mainGain.connect(comp);
        comp.connect(dist);
        dist.connect(this.ctx.destination);

        noise.start(t);
        noise.stop(t + 0.85);
        sub.start(t);
        sub.stop(t + 0.5);
    }

    /**
     * 12-Gauge Shotgun Blast
     */
    playShotgunFire(scoped = false) {
        this.init();
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const mainGain = this.ctx.createGain();
        mainGain.gain.setValueAtTime(this.masterVolume * 1.15, t);

        // Scatter blast noise
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.55);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3200, t);
        filter.frequency.exponentialRampToValueAtTime(150, t + 0.42);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(1.5, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(mainGain);

        // Bass thud
        const thud = this.ctx.createOscillator();
        const thudGain = this.ctx.createGain();
        thud.type = 'sawtooth';
        thud.frequency.setValueAtTime(180, t);
        thud.frequency.exponentialRampToValueAtTime(30, t + 0.22);

        thudGain.gain.setValueAtTime(1.4, t);
        thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

        thud.connect(thudGain);
        thudGain.connect(mainGain);

        // Routing
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.setValueAtTime(-12, t);
        comp.knee.setValueAtTime(15, t);
        comp.ratio.setValueAtTime(18, t);
        comp.attack.setValueAtTime(0.001, t);
        comp.release.setValueAtTime(0.14, t);

        const dist = this.createDistortion(0.95);

        mainGain.connect(comp);
        comp.connect(dist);
        dist.connect(this.ctx.destination);

        noise.start(t);
        noise.stop(t + 0.55);
        thud.start(t);
        thud.stop(t + 0.26);
    }

    /**
     * Rapid .45 SMG Fire
     */
    playSMGFire(scoped = false) {
        this.init();
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const mainGain = this.ctx.createGain();
        mainGain.gain.setValueAtTime(this.masterVolume * 0.7, t);

        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.18);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2600, t);
        filter.frequency.exponentialRampToValueAtTime(450, t + 0.12);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.9, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(mainGain);

        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.08);

        oscGain.gain.setValueAtTime(0.5, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

        osc.connect(oscGain);
        oscGain.connect(mainGain);

        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.setValueAtTime(-15, t);
        comp.ratio.setValueAtTime(10, t);
        comp.attack.setValueAtTime(0.001, t);
        comp.release.setValueAtTime(0.05, t);

        const dist = this.createDistortion(0.55);

        mainGain.connect(comp);
        comp.connect(dist);
        dist.connect(this.ctx.destination);

        noise.start(t);
        noise.stop(t + 0.18);
        osc.start(t);
        osc.stop(t + 0.1);
    }

    /**
     * .44 Magnum Heavy Gunshot
     */
    playMagnumFire(scoped = false) {
        this.init();
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const mainGain = this.ctx.createGain();
        mainGain.gain.setValueAtTime(this.masterVolume * 1.1, t);

        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.45);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1800, t);
        filter.frequency.exponentialRampToValueAtTime(200, t + 0.28);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(1.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(mainGain);

        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.15);

        oscGain.gain.setValueAtTime(1.1, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

        osc.connect(oscGain);
        oscGain.connect(mainGain);

        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.setValueAtTime(-10, t);
        comp.ratio.setValueAtTime(14, t);
        comp.attack.setValueAtTime(0.001, t);
        comp.release.setValueAtTime(0.1, t);

        const dist = this.createDistortion(0.85);

        mainGain.connect(comp);
        comp.connect(dist);
        dist.connect(this.ctx.destination);

        noise.start(t);
        noise.stop(t + 0.45);
        osc.start(t);
        osc.stop(t + 0.2);
    }

    /**
     * Spent Brass Shell Casing Tink
     */
    playShellCasingDrop() {
        this.init();
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime + 0.25;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(3200 + Math.random() * 800, t);
        osc.frequency.exponentialRampToValueAtTime(1800, t + 0.06);

        gain.gain.setValueAtTime(0.12 * this.masterVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.08);
    }

    /**
     * Enemy rifle gunshot (spatialized snap)
     */
    playEnemyShot(pan = 0) {
        this.init();
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.2);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1400, t);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.35 * this.masterVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        let dest = this.ctx.destination;
        if (this.ctx.createStereoPanner) {
            const panner = this.ctx.createStereoPanner();
            panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), t);
            gain.connect(panner);
            panner.connect(dest);
        } else {
            gain.connect(dest);
        }

        noise.connect(filter);
        filter.connect(gain);

        noise.start(t);
        noise.stop(t + 0.2);
    }

    /**
     * Knife slash whoosh & slice
     */
    playKnifeSlash() {
        this.init();
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.18);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2400, t);
        filter.frequency.exponentialRampToValueAtTime(800, t + 0.15);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4 * this.masterVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start(t);
        noise.stop(t + 0.18);
    }

    /**
     * Player damage / hurt impact
     */
    playPlayerHurt() {
        this.init();
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;

        // Heavy body impact thud
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.22);

        oscGain.gain.setValueAtTime(0.7 * this.masterVolume, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.26);
    }

    /**
     * Enemy hit confirmation marker tick
     */
    playEnemyHit() {
        this.init();
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1800, t);
        osc.frequency.setValueAtTime(2400, t + 0.02);

        gain.gain.setValueAtTime(0.3 * this.masterVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.06);
    }

    /**
     * Grenade explosion (heavy detonation + sub-bass rumble)
     */
    playGrenadeExplosion() {
        this.init();
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const mainGain = this.ctx.createGain();
        mainGain.gain.setValueAtTime(this.masterVolume * 1.5, t);

        // Sub bass drop
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();

        sub.type = 'sawtooth';
        sub.frequency.setValueAtTime(140, t);
        sub.frequency.exponentialRampToValueAtTime(15, t + 0.85);

        subGain.gain.setValueAtTime(1.8, t);
        subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

        sub.connect(subGain);
        subGain.connect(mainGain);

        // Debris / Fireblast noise
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(1.2);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, t);
        filter.frequency.exponentialRampToValueAtTime(80, t + 1.1);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(1.4, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(mainGain);

        // Explosive Compression & Saturation
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.setValueAtTime(-6, t);
        comp.knee.setValueAtTime(5, t);
        comp.ratio.setValueAtTime(20, t);
        comp.attack.setValueAtTime(0.001, t);
        comp.release.setValueAtTime(0.35, t);

        const dist = this.createDistortion(1.5);

        mainGain.connect(comp);
        comp.connect(dist);
        dist.connect(this.ctx.destination);

        sub.start(t);
        sub.stop(t + 0.95);
        noise.start(t);
        noise.stop(t + 1.2);
    }

    /**
     * Grenade ground bounce click
     */
    playGrenadeBounce() {
        this.init();
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, t);
        osc.frequency.exponentialRampToValueAtTime(110, t + 0.06);

        gain.gain.setValueAtTime(0.35 * this.masterVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.08);
    }

    /**
     * Ladder rung climbing clink
     */
    playLadderClimb() {
        this.init();
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(540, t);
        osc.frequency.exponentialRampToValueAtTime(280, t + 0.07);

        gain.gain.setValueAtTime(0.2 * this.masterVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.09);
    }

    /**
     * Medkit pickup chime
     */
    playMedkitPickup() {
        this.init();
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const startTime = t + idx * 0.06;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(0.25 * this.masterVolume, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + 0.2);
        });
    }

    /**
     * Vehicle crash / ram sound
     */
    playCarCrash() {
        this.init();
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.5);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, t);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.7 * this.masterVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start(t);
        noise.stop(t + 0.5);
    }

    /**
     * Weapon reload sounds: Mag Out click
     */
    playReloadMagOut() {
        this.init();
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(450, t);
        osc.frequency.exponentialRampToValueAtTime(180, t + 0.08);

        gain.gain.setValueAtTime(0.35 * this.masterVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.1);
    }

    /**
     * Weapon reload sounds: Mag In slap
     */
    playReloadMagIn() {
        this.init();
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(360, t + 0.06);

        gain.gain.setValueAtTime(0.45 * this.masterVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.13);
    }

    /**
     * Weapon reload sounds: Bolt Release / Charge
     */
    playBoltRelease() {
        this.init();
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(220, t + 0.07);

        gain.gain.setValueAtTime(0.4 * this.masterVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.09);
    }

    /**
     * Dry fire click when out of ammo
     */
    playDryFire() {
        this.init();
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.03);

        gain.gain.setValueAtTime(0.25 * this.masterVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.05);
    }
}

export const soundEngine = new SoundEngine();
