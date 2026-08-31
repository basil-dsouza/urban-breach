/**
 * Procedural Web Audio Sound Engine
 * Zero external asset dependencies — synthesized in real-time.
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterVolume = 0.65;
        this.gunVolume = 0.30; // Polished 30% volume scale for all gun sounds
        this.initialized = false;
        
        // Background Music track state properties
        this.currentMusic = null;
        this.currentTrack = '';

        // Audio sample pools for rapid fire gun sounds
        this.samplePools = {};
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
        
        // Trigger menu music play on first user interaction
        this.playMenuMusic();
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
     * Play a gun sound effect from file with 30% volume and zero-latency audio pooling
     */
    playGunSample(key, fallbackFn = null) {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            if (fallbackFn) fallbackFn();
            return;
        }

        const pathMap = {
            'ak47Fire': 'gun-sounds/ak47-fire.mp3',
            'shotgunFire': 'gun-sounds/shotgun-fire.mp3',
            'shotgunPump': 'gun-sounds/shotgun-reload.mp3',
            'sniperFire': 'gun-sounds/sniper-fire.mp3',
            'sniperReload': 'gun-sounds/sniper-reload.mp3'
        };

        const src = pathMap[key];
        if (!src) {
            if (fallbackFn) fallbackFn();
            return;
        }

        try {
            // Lazy init sample pool (up to 8 audio elements per sound for high-speed polyphony)
            if (!this.samplePools[key]) {
                this.samplePools[key] = {
                    pool: [],
                    index: 0
                };
                for (let i = 0; i < 8; i++) {
                    const audio = new Audio(src);
                    audio.volume = this.gunVolume; // exactly 30% of original volume
                    audio.preload = 'auto';
                    this.samplePools[key].pool.push(audio);
                }
            }

            const poolObj = this.samplePools[key];
            const audio = poolObj.pool[poolObj.index];
            poolObj.index = (poolObj.index + 1) % poolObj.pool.length;

            audio.volume = this.gunVolume; // 30% volume
            audio.currentTime = 0;
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(() => {
                    if (fallbackFn) fallbackFn();
                });
            }
        } catch (e) {
            if (fallbackFn) fallbackFn();
        }
    }

    /**
     * Player assault rifle gunshot sound (AK-47)
     */
    playRifleShot(scoped = false) {
        this.init();
        this.resume();
        this.playGunSample('ak47Fire');
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const mainGain = this.ctx.createGain();
        mainGain.gain.setValueAtTime(this.gunVolume * 0.4, t);

        // 1. Initial Transient Noise Crack
        const noise = this.ctx.createBufferSource();
        noise.loop = false;
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

        // 4. Hyper-Realistic Metallic Bolt Cycle Clink
        const metalOsc = this.ctx.createOscillator();
        const metalGain = this.ctx.createGain();
        metalOsc.type = 'sine';
        metalOsc.frequency.setValueAtTime(2800, t);
        metalGain.gain.setValueAtTime(0.12, t);
        metalGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        metalOsc.connect(metalGain);
        metalGain.connect(mainGain);

        // 5. Spacious Reverb Tail (Spacious urban echo)
        const reverbTail = this.ctx.createBufferSource();
        reverbTail.loop = false;
        reverbTail.buffer = this.createNoiseBuffer(0.55);
        const reverbFilter = this.ctx.createBiquadFilter();
        reverbFilter.type = 'lowpass';
        reverbFilter.frequency.setValueAtTime(1000, t);
        reverbFilter.frequency.exponentialRampToValueAtTime(80, t + 0.5);

        const reverbGain = this.ctx.createGain();
        reverbGain.gain.setValueAtTime(0.15, t);
        reverbGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

        reverbTail.connect(reverbFilter);
        reverbFilter.connect(reverbGain);
        reverbGain.connect(mainGain);

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
        noise.stop(t + (scoped ? 0.38 : 0.28));
        osc.start(t);
        osc.stop(t + 0.14);
        crackOsc.start(t);
        crackOsc.stop(t + 0.06);
        metalOsc.start(t);
        metalOsc.stop(t + 0.09);
        reverbTail.start(t);
        reverbTail.stop(t + 0.55);
    }

    /**
     * Heavy .50 Cal Sniper Rifle Gunshot (Thunderous Boom & Long Acoustic Reverb)
     */
    playSniperFire(scoped = false) {
        this.init();
        this.resume();
        this.playGunSample('sniperFire');
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const mainGain = this.ctx.createGain();
        mainGain.gain.setValueAtTime(this.gunVolume * 0.5, t);

        // 1. Supersonic whip & heavy noise blast
        const noise = this.ctx.createBufferSource();
        noise.loop = false;
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

        // 3. Hyper-Realistic Metallic Bolt Cycle Clink
        const metalOsc = this.ctx.createOscillator();
        const metalGain = this.ctx.createGain();
        metalOsc.type = 'sine';
        metalOsc.frequency.setValueAtTime(3200, t);
        metalGain.gain.setValueAtTime(0.2, t);
        metalGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        metalOsc.connect(metalGain);
        metalGain.connect(mainGain);

        // 4. Spacious Reverb Tail (Decayed heavy echo)
        const reverbTail = this.ctx.createBufferSource();
        reverbTail.loop = false;
        reverbTail.buffer = this.createNoiseBuffer(1.2);
        const reverbFilter = this.ctx.createBiquadFilter();
        reverbFilter.type = 'lowpass';
        reverbFilter.frequency.setValueAtTime(800, t);
        reverbFilter.frequency.exponentialRampToValueAtTime(50, t + 1.1);

        const reverbGain = this.ctx.createGain();
        reverbGain.gain.setValueAtTime(0.3, t);
        reverbGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

        reverbTail.connect(reverbFilter);
        reverbFilter.connect(reverbGain);
        reverbGain.connect(mainGain);

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
        metalOsc.start(t);
        metalOsc.stop(t + 0.15);
        reverbTail.start(t);
        reverbTail.stop(t + 1.2);
    }

    /**
     * Sniper rifle full reload sound
     */
    playSniperReload() {
        this.init();
        this.resume();
        this.playGunSample('sniperReload', () => {
            this.playReloadMagOut();
            setTimeout(() => this.playReloadMagIn(), 800);
            setTimeout(() => this.playBoltRelease(), 1800);
        });
    }

    /**
     * 12-Gauge Shotgun Blast
     */
    playShotgunFire(scoped = false) {
        this.init();
        this.resume();
        this.playGunSample('shotgunFire');
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const mainGain = this.ctx.createGain();
        mainGain.gain.setValueAtTime(this.gunVolume * 0.5, t); // 30% volume

        // 1. Crisp Muzzle Crack (High-frequency noise burst)
        const crack = this.ctx.createBufferSource();
        crack.buffer = this.createNoiseBuffer(0.1);
        const crackFilter = this.ctx.createBiquadFilter();
        crackFilter.type = 'highpass';
        crackFilter.frequency.setValueAtTime(1500, t);
        const crackGain = this.ctx.createGain();
        crackGain.gain.setValueAtTime(2.0, t);
        crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        crack.connect(crackFilter);
        crackFilter.connect(crackGain);
        crackGain.connect(mainGain);

        // 2. Main Blast Wave (Wide white noise decay)
        const blast = this.ctx.createBufferSource();
        blast.buffer = this.createNoiseBuffer(0.65);
        const blastFilter = this.ctx.createBiquadFilter();
        blastFilter.type = 'lowpass';
        blastFilter.frequency.setValueAtTime(2800, t);
        blastFilter.frequency.exponentialRampToValueAtTime(80, t + 0.5);
        const blastGain = this.ctx.createGain();
        blastGain.gain.setValueAtTime(1.8, t);
        blastGain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

        blast.connect(blastFilter);
        blastFilter.connect(blastGain);
        blastGain.connect(mainGain);

        // 3. Ultra Sub-Bass Punch (Clean low frequency sine sweep)
        const sub = this.ctx.createOscillator();
        sub.type = 'triangle'; // triangle is punchier than sine but cleaner than sawtooth
        sub.frequency.setValueAtTime(130, t);
        sub.frequency.exponentialRampToValueAtTime(15, t + 0.18);
        const subGain = this.ctx.createGain();
        subGain.gain.setValueAtTime(2.2, t);
        subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        sub.connect(subGain);
        subGain.connect(mainGain);

        // 4. Action Metal Resonance (Detuned mechanical clatters)
        const ring1 = this.ctx.createOscillator();
        ring1.type = 'sine';
        ring1.frequency.setValueAtTime(1800, t);
        const ringGain1 = this.ctx.createGain();
        ringGain1.gain.setValueAtTime(0.15, t);
        ringGain1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        ring1.connect(ringGain1);
        ringGain1.connect(mainGain);

        const ring2 = this.ctx.createOscillator();
        ring2.type = 'triangle';
        ring2.frequency.setValueAtTime(650, t);
        const ringGain2 = this.ctx.createGain();
        ringGain2.gain.setValueAtTime(0.25, t);
        ringGain2.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        ring2.connect(ringGain2);
        ringGain2.connect(mainGain);

        // 5. Environmental Reverb Tail
        const reverb = this.ctx.createBufferSource();
        reverb.buffer = this.createNoiseBuffer(1.2);
        const reverbFilter = this.ctx.createBiquadFilter();
        reverbFilter.type = 'bandpass';
        reverbFilter.frequency.setValueAtTime(350, t);
        reverbFilter.frequency.exponentialRampToValueAtTime(90, t + 1.0);
        const reverbGain = this.ctx.createGain();
        reverbGain.gain.setValueAtTime(0.35, t);
        reverbGain.gain.exponentialRampToValueAtTime(0.001, t + 1.1);

        reverb.connect(reverbFilter);
        reverbFilter.connect(reverbGain);
        reverbGain.connect(mainGain);

        // Routing & Compression
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.setValueAtTime(-18, t);
        comp.knee.setValueAtTime(10, t);
        comp.ratio.setValueAtTime(20, t);
        comp.attack.setValueAtTime(0.001, t);
        comp.release.setValueAtTime(0.18, t);

        const distortion = this.createDistortion(0.25);

        mainGain.connect(comp);
        comp.connect(distortion);
        distortion.connect(this.ctx.destination);

        crack.start(t);
        crack.stop(t + 0.1);
        blast.start(t);
        blast.stop(t + 0.65);
        sub.start(t);
        sub.stop(t + 0.22);
        ring1.start(t);
        ring1.stop(t + 0.15);
        ring2.start(t);
        ring2.stop(t + 0.18);
        reverb.start(t);
        reverb.stop(t + 1.25);
    }

    playShotgunPump() {
        this.init();
        this.resume();
        this.playGunSample('shotgunPump');
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const mainGain = this.ctx.createGain();
        mainGain.gain.setValueAtTime(this.gunVolume * 0.4, t);

        // --- PART 1: Slide Back (t to t + 0.2s) ---
        const slideBackNoise = this.ctx.createBufferSource();
        slideBackNoise.buffer = this.createNoiseBuffer(0.16);
        const filterBack = this.ctx.createBiquadFilter();
        filterBack.type = 'bandpass';
        filterBack.frequency.setValueAtTime(1400, t);
        filterBack.Q.setValueAtTime(4, t);
        const gainBackNoise = this.ctx.createGain();
        gainBackNoise.gain.setValueAtTime(0.35, t);
        gainBackNoise.gain.linearRampToValueAtTime(0.001, t + 0.16);

        slideBackNoise.connect(filterBack);
        filterBack.connect(gainBackNoise);
        gainBackNoise.connect(mainGain);

        const metalBack = this.ctx.createOscillator();
        metalBack.type = 'triangle';
        metalBack.frequency.setValueAtTime(600, t);
        metalBack.frequency.linearRampToValueAtTime(350, t + 0.14);
        const gainBackMetal = this.ctx.createGain();
        gainBackMetal.gain.setValueAtTime(0.22, t);
        gainBackMetal.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

        metalBack.connect(gainBackMetal);
        gainBackMetal.connect(mainGain);

        // --- PART 2: Slide Forward (t + 0.22s to t + 0.38s) ---
        const slideForwardNoise = this.ctx.createBufferSource();
        slideForwardNoise.buffer = this.createNoiseBuffer(0.14);
        const filterForward = this.ctx.createBiquadFilter();
        filterForward.type = 'lowpass';
        filterForward.frequency.setValueAtTime(1600, t + 0.22);
        const gainForwardNoise = this.ctx.createGain();
        gainForwardNoise.gain.setValueAtTime(0, t);
        gainForwardNoise.gain.setValueAtTime(0.45, t + 0.22);
        gainForwardNoise.gain.linearRampToValueAtTime(0.001, t + 0.36);

        slideForwardNoise.connect(filterForward);
        filterForward.connect(gainForwardNoise);
        gainForwardNoise.connect(mainGain);

        const clickHigh = this.ctx.createOscillator();
        clickHigh.type = 'sine';
        clickHigh.frequency.setValueAtTime(2800, t + 0.22);
        const gainClickHigh = this.ctx.createGain();
        gainClickHigh.gain.setValueAtTime(0, t);
        gainClickHigh.gain.setValueAtTime(0.28, t + 0.22);
        gainClickHigh.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

        clickHigh.connect(gainClickHigh);
        gainClickHigh.connect(mainGain);

        const clickLow = this.ctx.createOscillator();
        clickLow.type = 'triangle';
        clickLow.frequency.setValueAtTime(800, t + 0.24);
        clickLow.frequency.exponentialRampToValueAtTime(200, t + 0.34);
        const gainClickLow = this.ctx.createGain();
        gainClickLow.gain.setValueAtTime(0, t);
        gainClickLow.gain.setValueAtTime(0.5, t + 0.24);
        gainClickLow.gain.exponentialRampToValueAtTime(0.001, t + 0.34);

        clickLow.connect(gainClickLow);
        gainClickLow.connect(mainGain);

        mainGain.connect(this.ctx.destination);

        slideBackNoise.start(t);
        slideBackNoise.stop(t + 0.17);
        metalBack.start(t);
        metalBack.stop(t + 0.15);

        slideForwardNoise.start(t + 0.22);
        slideForwardNoise.stop(t + 0.37);
        clickHigh.start(t + 0.22);
        clickHigh.stop(t + 0.29);
        clickLow.start(t + 0.24);
        clickLow.stop(t + 0.35);
    }

    /**
     * Mechanical clink and spring latch shove for inserting shotgun shells into chamber ("chk-chk")
     */
    playShotgunShellInsert() {
        this.init();
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const mainGain = this.ctx.createGain();
        mainGain.gain.setValueAtTime(this.gunVolume * 0.8, t); // 30% volume scale

        // 1. First "chk": Spring-loaded gate depress & brass shell friction
        const noise1 = this.ctx.createBufferSource();
        noise1.buffer = this.createNoiseBuffer(0.06);
        const filter1 = this.ctx.createBiquadFilter();
        filter1.type = 'bandpass';
        filter1.frequency.setValueAtTime(1300, t);
        filter1.Q.setValueAtTime(4.0, t);
        const noiseGain1 = this.ctx.createGain();
        noiseGain1.gain.setValueAtTime(0.4, t);
        noiseGain1.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

        noise1.connect(filter1);
        filter1.connect(noiseGain1);
        noiseGain1.connect(mainGain);

        const click1 = this.ctx.createOscillator();
        const clickGain1 = this.ctx.createGain();
        click1.type = 'triangle';
        click1.frequency.setValueAtTime(1600, t);
        click1.frequency.exponentialRampToValueAtTime(600, t + 0.04);
        clickGain1.gain.setValueAtTime(0.5, t);
        clickGain1.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

        click1.connect(clickGain1);
        clickGain1.connect(mainGain);

        // 2. Second "chk": Magazine tube latch lock snap & chamber seating (0.08s later)
        const t2 = t + 0.08;
        const noise2 = this.ctx.createBufferSource();
        noise2.buffer = this.createNoiseBuffer(0.07);
        const filter2 = this.ctx.createBiquadFilter();
        filter2.type = 'lowpass';
        filter2.frequency.setValueAtTime(1800, t2);
        const noiseGain2 = this.ctx.createGain();
        noiseGain2.gain.setValueAtTime(0, t);
        noiseGain2.gain.setValueAtTime(0.45, t2);
        noiseGain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.06);

        noise2.connect(filter2);
        filter2.connect(noiseGain2);
        noiseGain2.connect(mainGain);

        const snapOsc = this.ctx.createOscillator();
        const snapGain = this.ctx.createGain();
        snapOsc.type = 'triangle';
        snapOsc.frequency.setValueAtTime(900, t2);
        snapOsc.frequency.exponentialRampToValueAtTime(220, t2 + 0.05);
        snapGain.gain.setValueAtTime(0, t);
        snapGain.gain.setValueAtTime(0.6, t2);
        snapGain.gain.exponentialRampToValueAtTime(0.001, t2 + 0.05);

        snapOsc.connect(snapGain);
        snapGain.connect(mainGain);

        const ringOsc = this.ctx.createOscillator();
        const ringGain = this.ctx.createGain();
        ringOsc.type = 'sine';
        ringOsc.frequency.setValueAtTime(2600, t2);
        ringGain.gain.setValueAtTime(0, t);
        ringGain.gain.setValueAtTime(0.3, t2);
        ringGain.gain.exponentialRampToValueAtTime(0.001, t2 + 0.04);

        ringOsc.connect(ringGain);
        ringGain.connect(mainGain);

        mainGain.connect(this.ctx.destination);

        noise1.start(t);
        noise1.stop(t + 0.06);
        click1.start(t);
        click1.stop(t + 0.05);

        noise2.start(t2);
        noise2.stop(t2 + 0.07);
        snapOsc.start(t2);
        snapOsc.stop(t2 + 0.06);
        ringOsc.start(t2);
        ringOsc.stop(t2 + 0.05);
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
        noise.loop = false;
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
        noise.loop = false;
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
        noise.loop = false;
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
        noise.loop = false;
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
        noise.loop = false;
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
        noise.loop = false;
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
        const mainGain = this.ctx.createGain();
        mainGain.gain.setValueAtTime(this.gunVolume * 0.7, t);

        // 1. Friction sound (magazine rubbing against magwell)
        const friction = this.ctx.createBufferSource();
        friction.buffer = this.createNoiseBuffer(0.16);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, t);
        filter.Q.setValueAtTime(3, t);
        const frictionGain = this.ctx.createGain();
        frictionGain.gain.setValueAtTime(0.3, t);
        frictionGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        friction.connect(filter);
        filter.connect(frictionGain);
        frictionGain.connect(mainGain);

        // 2. Latch release click
        const click = this.ctx.createOscillator();
        click.type = 'sine';
        click.frequency.setValueAtTime(2200, t);
        const clickGain = this.ctx.createGain();
        clickGain.gain.setValueAtTime(0.2, t);
        clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

        click.connect(clickGain);
        clickGain.connect(mainGain);

        mainGain.connect(this.ctx.destination);

        friction.start(t);
        friction.stop(t + 0.16);
        click.start(t);
        click.stop(t + 0.06);
    }

    playReloadMagIn() {
        this.init();
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const mainGain = this.ctx.createGain();
        mainGain.gain.setValueAtTime(this.gunVolume * 0.75, t);

        // 1. Sliding slam noise (mag fully seated friction)
        const slamNoise = this.ctx.createBufferSource();
        slamNoise.buffer = this.createNoiseBuffer(0.15);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, t);
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.4, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

        slamNoise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(mainGain);

        // 2. Locking latch click (metal clack)
        const click = this.ctx.createOscillator();
        click.type = 'triangle';
        click.frequency.setValueAtTime(600, t + 0.04);
        click.frequency.exponentialRampToValueAtTime(150, t + 0.12);
        const clickGain = this.ctx.createGain();
        clickGain.gain.setValueAtTime(0, t);
        clickGain.gain.setValueAtTime(0.4, t + 0.04);
        clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        click.connect(clickGain);
        clickGain.connect(mainGain);

        mainGain.connect(this.ctx.destination);

        slamNoise.start(t);
        slamNoise.stop(t + 0.15);
        click.start(t + 0.04);
        click.stop(t + 0.13);
    }

    playBoltRelease() {
        this.init();
        this.resume();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const mainGain = this.ctx.createGain();
        mainGain.gain.setValueAtTime(this.gunVolume * 0.8, t);

        // 1. Bolt sliding back (first stage rack)
        const rackNoise = this.ctx.createBufferSource();
        rackNoise.buffer = this.createNoiseBuffer(0.1);
        const filterBack = this.ctx.createBiquadFilter();
        filterBack.type = 'bandpass';
        filterBack.frequency.setValueAtTime(1800, t);
        const gainBack = this.ctx.createGain();
        gainBack.gain.setValueAtTime(0.25, t);
        gainBack.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

        rackNoise.connect(filterBack);
        filterBack.connect(gainBack);
        gainBack.connect(mainGain);

        // 2. Bolt slamming forward into chamber (battery locking click)
        const slamNoise = this.ctx.createBufferSource();
        slamNoise.buffer = this.createNoiseBuffer(0.12);
        const filterForward = this.ctx.createBiquadFilter();
        filterForward.type = 'lowpass';
        filterForward.frequency.setValueAtTime(2000, t + 0.12);
        const gainForward = this.ctx.createGain();
        gainForward.gain.setValueAtTime(0, t);
        gainForward.gain.setValueAtTime(0.4, t + 0.12);
        gainForward.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

        slamNoise.connect(filterForward);
        filterForward.connect(gainForward);
        gainForward.connect(mainGain);

        // Metal lock ring clink
        const clink = this.ctx.createOscillator();
        clink.type = 'sine';
        clink.frequency.setValueAtTime(2400, t + 0.12);
        const clinkGain = this.ctx.createGain();
        clinkGain.gain.setValueAtTime(0, t);
        clinkGain.gain.setValueAtTime(0.25, t + 0.12);
        clinkGain.gain.exponentialRampToValueAtTime(0.001, t + 0.17);

        clink.connect(clinkGain);
        clinkGain.connect(mainGain);

        mainGain.connect(this.ctx.destination);

        rackNoise.start(t);
        rackNoise.stop(t + 0.1);
        slamNoise.start(t + 0.12);
        slamNoise.stop(t + 0.24);
        clink.start(t + 0.12);
        clink.stop(t + 0.18);
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

        gain.gain.setValueAtTime(0.25 * this.gunVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.05);
    }

    /**
     * Start playing menu background music
     */
    playMenuMusic() {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;
        if (this.currentTrack === 'menu') return;
        this.stopMusic();

        console.log("[MUSIC] Initiating Menu Music...");
        this.currentTrack = 'menu';
        
        try {
            const audio = new Audio("background-sounds/superepic.mp3");
            audio.volume = 0.50; // set to 50% original volume
            audio.loop = true;
            
            this.currentMusic = audio;
            audio.play().catch(err => console.warn("[MUSIC] Autoplay blocked or failed:", err));
        } catch (e) {
            console.error("[MUSIC] HTML5 Audio constructor error:", e);
        }

        this.showCreditsBanner(`Superepic by Alexander Nakarada | https://creatorchords.com/ | Music promoted by https://www.chosic.com/free-music/all/ | Attribution 4.0 International (CC BY 4.0) https://creativecommons.org/licenses/by/4.0/`);
    }

    /**
     * Start playing gameplay background music
     */
    playGameMusic() {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;
        if (this.currentTrack && this.currentTrack.startsWith('game')) return;
        this.stopMusic();

        // Select a track at random to rotate game music dynamically
        const tracks = ['game1', 'game2', 'game3', 'game4'];
        const selection = tracks[Math.floor(Math.random() * tracks.length)];
        this.currentTrack = selection;

        let src = "";
        let credits = "";

        if (selection === 'game1') {
            console.log("[MUSIC] Initiating Game Music track: Ultra Lag");
            src = "background-sounds/ultra-lag.mp3";
            credits = `Ultra Lag by Alex-Productions | https://onsound.eu/ | Music promoted by https://www.chosic.com/free-music/all/ | Creative Commons CC BY 3.0 https://creativecommons.org/licenses/by/3.0/`;
        } else if (selection === 'game2') {
            console.log("[MUSIC] Initiating Game Music track: Thunder Unison");
            src = "background-sounds/thunder-unison.mp3";
            credits = `Thunder Unison by Keys of Moon | https://soundcloud.com/keysofmoon | Music promoted by https://www.chosic.com/free-music/all/ | Creative Commons CC BY 4.0 https://creativecommons.org/licenses/by/4.0/`;
        } else if (selection === 'game3') {
            console.log("[MUSIC] Initiating Game Music track: Cherry Metal");
            src = "background-sounds/cherry-metal.mp3";
            credits = `Cherry Metal by Arthur Vyncke | https://soundcloud.com/arthurvost | Music promoted by https://www.chosic.com/free-music/all/ | Creative Commons Attribution-ShareAlike 3.0 Unported https://creativecommons.org/licenses/by-sa/3.0/deed.en_US`;
        } else {
            console.log("[MUSIC] Initiating Game Music track: Film");
            src = "background-sounds/film.mp3";
            credits = `Film by Alex-Productions | https://onsound.eu/ | Music promoted by https://www.chosic.com/free-music/all/ | Creative Commons CC BY 3.0 https://creativecommons.org/licenses/by/3.0/`;
        }

        try {
            console.log("[MUSIC] Loading audio source: " + src);
            const audio = new Audio(src);
            audio.volume = 0.30; // set to 30% original volume
            
            audio.onended = () => {
                console.log("[MUSIC] Game track ended. Playing next song...");
                this.currentTrack = '';
                this.playGameMusic(); // Loop/swap to next game track on completion
            };

            this.currentMusic = audio;
            audio.play()
                .then(() => console.log("[MUSIC] Game music playback started successfully for: " + src))
                .catch(err => console.error("[MUSIC] Game music playback promise rejected:", err));
        } catch (e) {
            console.error("[MUSIC] HTML5 Audio constructor error:", e);
        }

        this.showCreditsBanner(credits);
    }

    /**
     * Terminate active music stream and clear banner display
     */
    stopMusic() {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;
        if (this.currentMusic) {
            try {
                this.currentMusic.pause();
            } catch (e) {}
            this.currentMusic.onended = null;
            this.currentMusic = null;
        }
        this.currentTrack = '';
        this.hideCreditsBanner();
    }

    /**
     * Display scrolling credits marquee ticker on starting/gameplay overlays
     */
    showCreditsBanner(text) {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;
        
        // Print message to in-game chat log for instant visual diagnostics
        try {
            if (window.uiManager && typeof window.uiManager.addChatMessage === 'function') {
                window.uiManager.addChatMessage('System', 'Now Playing: ' + text.split('|')[0].trim());
            }
        } catch (e) {
            console.warn("Could not add chat message:", e);
        }

        let banner = document.getElementById('music-credits-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'music-credits-banner';
            banner.className = 'music-credits-banner';
            banner.innerHTML = `<div id="music-credits-text" class="music-credits-text"></div>`;
            document.body.appendChild(banner);
        }

        const textEl = banner.querySelector('#music-credits-text');
        if (textEl) {
            textEl.textContent = `${text}       ★       ${text}       ★       ${text}`;
        }
        banner.style.display = 'block';
    }

    /**
     * Remove credits banner from viewport
     */
    hideCreditsBanner() {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;
        const banner = document.getElementById('music-credits-banner');
        if (banner) {
            banner.style.display = 'none';
        }
    }
}

export const soundEngine = new SoundEngine();
