import { describe, it, expect, beforeEach, vi } from 'vitest';
import { soundEngine } from '../src/audio.js';

// Mock Web Audio Context
class MockAudioParam {
    setValueAtTime = vi.fn();
    exponentialRampToValueAtTime = vi.fn();
    linearRampToValueAtTime = vi.fn();
}

class MockAudioNode {
    connect = vi.fn();
}

class MockAudioBufferSourceNode extends MockAudioNode {
    start = vi.fn();
    stop = vi.fn();
    buffer = null;
}

class MockOscillatorNode extends MockAudioNode {
    start = vi.fn();
    stop = vi.fn();
    frequency = new MockAudioParam();
}

class MockGainNode extends MockAudioNode {
    gain = new MockAudioParam();
}

class MockBiquadFilterNode extends MockAudioNode {
    frequency = new MockAudioParam();
    Q = new MockAudioParam();
}

class MockDynamicsCompressorNode extends MockAudioNode {
    threshold = new MockAudioParam();
    knee = new MockAudioParam();
    ratio = new MockAudioParam();
    attack = new MockAudioParam();
    release = new MockAudioParam();
}

class MockWaveShaperNode extends MockAudioNode {
    curve = null;
    oversample = 'none';
}

class MockAudioContext {
    sampleRate = 44100;
    currentTime = 0;
    state = 'suspended';
    destination = new MockAudioNode();
    
    resume = vi.fn().mockResolvedValue();
    createBuffer = vi.fn().mockReturnValue({
        getChannelData: () => new Float32Array(100)
    });
    createBufferSource = vi.fn().mockReturnValue(new MockAudioBufferSourceNode());
    createOscillator = vi.fn().mockReturnValue(new MockOscillatorNode());
    createGain = vi.fn().mockReturnValue(new MockGainNode());
    createBiquadFilter = vi.fn().mockReturnValue(new MockBiquadFilterNode());
    createDynamicsCompressor = vi.fn().mockReturnValue(new MockDynamicsCompressorNode());
    createWaveShaper = vi.fn().mockReturnValue(new MockWaveShaperNode());
}

global.window = global.window || {};
global.window.AudioContext = MockAudioContext;

describe('Procedural Sound Engine', () => {
    beforeEach(() => {
        soundEngine.initialized = false;
        soundEngine.ctx = null;
    });

    it('should initialize AudioContext successfully', () => {
        soundEngine.init();
        expect(soundEngine.initialized).toBe(true);
        expect(soundEngine.ctx).toBeDefined();
    });

    it('should play Rifle Shot without crashing', () => {
        soundEngine.playRifleShot();
        expect(soundEngine.ctx.createOscillator).toHaveBeenCalled();
        expect(soundEngine.ctx.createDynamicsCompressor).toHaveBeenCalled();
    });

    it('should play Sniper Fire without crashing', () => {
        soundEngine.playSniperFire();
        expect(soundEngine.ctx.createOscillator).toHaveBeenCalled();
    });

    it('should play Shotgun Fire without crashing', () => {
        soundEngine.playShotgunFire();
        expect(soundEngine.ctx.createOscillator).toHaveBeenCalled();
    });

    it('should play SMG Fire without crashing', () => {
        soundEngine.playSMGFire();
        expect(soundEngine.ctx.createOscillator).toHaveBeenCalled();
    });

    it('should play Magnum Fire without crashing', () => {
        soundEngine.playMagnumFire();
        expect(soundEngine.ctx.createOscillator).toHaveBeenCalled();
    });

    it('should play Grenade Explosion without crashing', () => {
        soundEngine.playGrenadeExplosion();
        expect(soundEngine.ctx.createOscillator).toHaveBeenCalled();
    });

    it('should play Water Splash sound without crashing', () => {
        soundEngine.playWaterSplash();
        expect(soundEngine.ctx.createOscillator).toHaveBeenCalled();
        expect(soundEngine.ctx.createBufferSource).toHaveBeenCalled();
    });

    it('should play Drowning Gasp sound without crashing', () => {
        soundEngine.playDrownGasp();
        expect(soundEngine.ctx.createOscillator).toHaveBeenCalled();
    });

    it('should play Surfacing Gasp sound without crashing', () => {
        soundEngine.playSurfacingGasp();
        expect(soundEngine.ctx.createBufferSource).toHaveBeenCalled();
    });
});
