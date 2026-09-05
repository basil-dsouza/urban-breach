import { describe, it, expect, beforeEach } from 'vitest';
import { 
    TEST_MODE_PASSWORD, 
    verifyTestModePassword, 
    TestModeManager, 
    testModeState 
} from '../src/test-mode.js';

describe('Secret Test Mode & Wave Customization Console', () => {

    beforeEach(() => {
        testModeState.isUnlocked = false;
        testModeState.isOpen = false;
        testModeState.godMode = false;
        testModeState.infiniteAmmo = false;
        testModeState.laserSpread = false;
        testModeState.superSpeed = false;
        testModeState.superJump = false;
        testModeState.freezeEnemies = false;
        testModeState.passiveAI = false;
        testModeState.freezeWaveTimer = false;
        testModeState.enemyHealthMult = 1.0;
        testModeState.enemySpeedMult = 1.0;
        testModeState.enemyDamageMult = 1.0;
    });

    describe('Passcode Authentication', () => {
        it('should require the exact password "rapha_tester123"', () => {
            expect(TEST_MODE_PASSWORD).toBe('rapha_tester123');
        });

        it('should return true for the valid password', () => {
            expect(verifyTestModePassword('rapha_tester123')).toBe(true);
            expect(verifyTestModePassword('  rapha_tester123  ')).toBe(true);
        });

        it('should return false for invalid passwords', () => {
            expect(verifyTestModePassword('')).toBe(false);
            expect(verifyTestModePassword('admin')).toBe(false);
            expect(verifyTestModePassword('rapha')).toBe(false);
            expect(verifyTestModePassword('rapha_tester')).toBe(false);
            expect(verifyTestModePassword('123456')).toBe(false);
            expect(verifyTestModePassword(null)).toBe(false);
            expect(verifyTestModePassword(undefined)).toBe(false);
        });
    });

    describe('TestModeManager API and State Controls', () => {
        it('should properly bind and invoke wave director methods', () => {
            let currentWave = 1;
            let cleared = false;
            let spawned = false;

            const manager = new TestModeManager({
                setWave: (w) => { currentWave = w; },
                clearAllEnemies: () => { cleared = true; },
                spawnWaveNow: () => { spawned = true; }
            });

            manager.api.setWave(5);
            expect(currentWave).toBe(5);

            manager.api.clearAllEnemies();
            expect(cleared).toBe(true);

            manager.api.spawnWaveNow();
            expect(spawned).toBe(true);
        });

        it('should toggle God Mode and update state', () => {
            const manager = new TestModeManager({
                setGodMode: (val) => { testModeState.godMode = val; }
            });

            expect(testModeState.godMode).toBe(false);
            manager.api.setGodMode(true);
            expect(testModeState.godMode).toBe(true);
            manager.api.setGodMode(false);
            expect(testModeState.godMode).toBe(false);
        });

        it('should toggle Infinite Ammo and update state', () => {
            const manager = new TestModeManager({
                setInfiniteAmmo: (val) => { testModeState.infiniteAmmo = val; }
            });

            expect(testModeState.infiniteAmmo).toBe(false);
            manager.api.setInfiniteAmmo(true);
            expect(testModeState.infiniteAmmo).toBe(true);
        });

        it('should toggle Super Speed and Super Jump', () => {
            const manager = new TestModeManager({
                setSuperSpeed: (val) => { testModeState.superSpeed = val; },
                setSuperJump: (val) => { testModeState.superJump = val; }
            });

            manager.api.setSuperSpeed(true);
            expect(testModeState.superSpeed).toBe(true);

            manager.api.setSuperJump(true);
            expect(testModeState.superJump).toBe(true);
        });

        it('should handle wave timer freeze', () => {
            const manager = new TestModeManager({
                setWaveTimerFrozen: (val) => { testModeState.freezeWaveTimer = val; }
            });

            expect(testModeState.freezeWaveTimer).toBe(false);
            manager.api.setWaveTimerFrozen(true);
            expect(testModeState.freezeWaveTimer).toBe(true);
        });

        it('should handle custom enemy spawning parameters', () => {
            let spawnedArchetype = null;
            let spawnedCount = 0;
            let spawnedLocation = null;

            const manager = new TestModeManager({
                spawnEnemy: (arch, count, loc) => {
                    spawnedArchetype = arch;
                    spawnedCount = count;
                    spawnedLocation = loc;
                }
            });

            manager.api.spawnEnemy('knife', 5, 'around');
            expect(spawnedArchetype).toBe('knife');
            expect(spawnedCount).toBe(5);
            expect(spawnedLocation).toBe('around');
        });

        it('should handle custom boss spawning tier', () => {
            let bossTier = 0;
            let bossLoc = null;

            const manager = new TestModeManager({
                spawnBoss: (tier, loc) => {
                    bossTier = tier;
                    bossLoc = loc;
                }
            });

            manager.api.spawnBoss(3, 'front');
            expect(bossTier).toBe(3);
            expect(bossLoc).toBe('front');
        });

        it('should pause game state when auth modal or panel is open', () => {
            globalThis.window = globalThis.window || {};
            const manager = new TestModeManager();
            expect(testModeState.isOpen).toBe(false);

            manager.showAuthModal();
            expect(testModeState.isOpen).toBe(true);
            expect(globalThis.window.testModeOpen).toBe(true);

            manager.hideAuthModal();
            expect(testModeState.isOpen).toBe(false);
            expect(globalThis.window.testModeOpen).toBe(false);

            manager.showPanel();
            expect(testModeState.isOpen).toBe(true);
            expect(globalThis.window.testModeOpen).toBe(true);

            manager.hidePanel();
            expect(testModeState.isOpen).toBe(false);
            expect(globalThis.window.testModeOpen).toBe(false);
        });
    });
});
