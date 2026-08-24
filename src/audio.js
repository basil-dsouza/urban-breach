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
        const buffer = this.ctx.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    /**
     * Player assault rifle gunshot sound
     */
    playRifleShot(scoped = false) {
        this.init();
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;

        // 1. Initial Transient Noise Crack
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(scoped ? 0.35 : 0.25);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(scoped ? 1800 : 2800, t);
        filter.frequency.exponentialRampToValueAtTime(300, t + (scoped ? 0.25 : 0.18));
        filter.Q.setValueAtTime(2.5, t);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.7 * this.masterVolume, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + (scoped ? 0.28 : 0.2));

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);

        noise.start(t);

        // 2. Punchy Low-End Thud
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(scoped ? 140 : 180, t);
        osc.frequency.exponentialRampToValueAtTime(35, t + 0.12);

        oscGain.gain.setValueAtTime(0.6 * this.masterVolume, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.15);
    }

    /**
     * Heavy .50 Cal Sniper Rifle Gunshot (Thunderous Boom & Long Acoustic Reverb)
     */
    playSniperFire(scoped = false) {
        this.init();
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;

        // Heavy Supersonic Noise Whip
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.6);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3200, t);
        filter.frequency.exponentialRampToValueAtTime(120, t + 0.55);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(1.0 * this.masterVolume, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.58);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start(t);

        // Sub-Bass Shockwave
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(120, t);
        sub.frequency.exponentialRampToValueAtTime(25, t + 0.35);

        subGain.gain.setValueAtTime(0.9 * this.masterVolume, t);
        subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

        sub.connect(subGain);
        subGain.connect(this.ctx.destination);
        sub.start(t);
        sub.stop(t + 0.4);
    }

    /**
     * 12-Gauge Shotgun Blast
     */
    playShotgunFire(scoped = false) {
        this.init();
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;

        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.4);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3600, t);
        filter.frequency.exponentialRampToValueAtTime(200, t + 0.35);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.95 * this.masterVolume, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start(t);

        const thud = this.ctx.createOscillator();
        const thudGain = this.ctx.createGain();
        thud.type = 'triangle';
        thud.frequency.setValueAtTime(160, t);
        thud.frequency.exponentialRampToValueAtTime(30, t + 0.18);

        thudGain.gain.setValueAtTime(0.85 * this.masterVolume, t);
        thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        thud.connect(thudGain);
        thudGain.connect(this.ctx.destination);
        thud.start(t);
        thud.stop(t + 0.22);
    }

    /**
     * Rapid .45 SMG Fire
     */
    playSMGFire(scoped = false) {
        this.init();
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;

        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.14);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(3400, t);
        filter.frequency.exponentialRampToValueAtTime(600, t + 0.12);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.55 * this.masterVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(t);
    }

    /**
     * .44 Magnum Heavy Gunshot
     */
    playMagnumFire(scoped = false) {
        this.init();
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;

        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.35);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2200, t);
        filter.frequency.exponentialRampToValueAtTime(250, t + 0.3);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.85 * this.masterVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(t);
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

        // Sub bass drop
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();

        sub.type = 'sine';
        sub.frequency.setValueAtTime(130, t);
        sub.frequency.exponentialRampToValueAtTime(22, t + 0.8);

        subGain.gain.setValueAtTime(0.9 * this.masterVolume, t);
        subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);

        sub.connect(subGain);
        subGain.connect(this.ctx.destination);

        sub.start(t);
        sub.stop(t + 0.9);

        // Debris / Fireblast noise
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(1.1);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, t);
        filter.frequency.exponentialRampToValueAtTime(90, t + 1.0);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.8 * this.masterVolume, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 1.1);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);

        noise.start(t);
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
