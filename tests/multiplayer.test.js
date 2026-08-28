import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { MultiplayerManager } from '../src/multiplayer.js';

// Mock window.Peer
global.window = global.window || {};
global.window.Peer = class MockPeer {
    constructor(id, options) {
        this.id = id;
        this.options = options;
        this.callbacks = {};
    }
    on(event, cb) {
        this.callbacks[event] = cb;
    }
    destroy() {}
};

describe('MultiplayerManager Core Architecture', () => {
    let manager;
    let scene;
    let camera;

    beforeEach(() => {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera();
        manager = new MultiplayerManager(scene, camera);
    });

    it('should initialize with default multiplayer states disabled', () => {
        expect(manager.isMultiplayer).toBe(false);
        expect(manager.isHost).toBe(false);
        expect(manager.roomCode).toBe('');
    });

    it('should setup host room properties and default player info', () => {
        manager.initHost('CaptainPrice', 'ffa');
        expect(manager.isMultiplayer).toBe(true);
        expect(manager.isHost).toBe(true);
        expect(manager.localNickname).toBe('CaptainPrice');
        expect(manager.gameMode).toBe('ffa');
        expect(manager.roomCode).toMatch(/^UB-\d{4}$/);
    });

    it('should configure PeerJS with Google public STUN servers', () => {
        manager.initHost('CaptainPrice', 'ffa');
        const peerInstance = manager.peer;
        expect(peerInstance.options.config.iceServers[0].urls).toBe('stun:stun.l.google.com:19302');
    });

    it('should shut down correctly, clearing remote players and scoreboard', () => {
        manager.initHost('CaptainPrice', 'ffa');
        manager.shutdown();
        expect(manager.isMultiplayer).toBe(false);
        expect(manager.isHost).toBe(false);
        expect(Object.keys(manager.players).length).toBe(0);
    });
});
