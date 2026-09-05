import { describe, it, expect, beforeEach } from 'vitest';
import { AchievementManager, ACHIEVEMENTS_CATALOG } from '../src/achievements.js';
import { verifyTestModePassword } from '../src/test-mode.js';

describe('Urban Breach — Achievements System & Victory Logic', () => {
    let mgr;
    let mockStorage = {};

    beforeEach(() => {
        mockStorage = {};
        global.localStorage = {
            getItem: (k) => mockStorage[k] || null,
            setItem: (k, v) => { mockStorage[k] = v; },
            removeItem: (k) => { delete mockStorage[k]; }
        };
        mgr = new AchievementManager();
    });

    it('should have all 69 cleaned achievements cataloged with required metadata', () => {
        const keys = Object.keys(ACHIEVEMENTS_CATALOG);
        expect(keys.length).toBe(69);

        // Core tactical achievements
        expect(ACHIEVEMENTS_CATALOG.FIRST_BLOOD).toBeDefined();
        expect(ACHIEVEMENTS_CATALOG.ROOFTOP_RECON).toBeDefined();
        expect(ACHIEVEMENTS_CATALOG.BUSH_GHOST).toBeDefined();
        expect(ACHIEVEMENTS_CATALOG.COMBAT_MEDIC).toBeDefined();
        expect(ACHIEVEMENTS_CATALOG.COMBAT_MEDIC.category).toBe('tactics');
        expect(ACHIEVEMENTS_CATALOG.VEHICLE_BUSTER).toBeDefined();

        // Wave survival achievements (every 5 up to 50)
        for (let w = 5; w <= 50; w += 5) {
            expect(ACHIEVEMENTS_CATALOG['SURVIVE_WAVE_' + w]).toBeDefined();
            expect(ACHIEVEMENTS_CATALOG['SURVIVE_WAVE_' + w].category).toBe('survival');
        }

        // Enemy kill achievements (every 5 up to 200)
        for (let k = 5; k <= 200; k += 5) {
            expect(ACHIEVEMENTS_CATALOG['KILL_' + k]).toBeDefined();
            expect(ACHIEVEMENTS_CATALOG['KILL_' + k].category).toBe('kills');
        }

        // Death achievements: Drowning is "Oh, So That's What It Does"
        expect(ACHIEVEMENTS_CATALOG.DEATH_WATER).toBeDefined();
        expect(ACHIEVEMENTS_CATALOG.DEATH_WATER.title).toBe("Oh, So That's What It Does");
        expect(ACHIEVEMENTS_CATALOG.DEATH_WATER.desc).toContain('drowning');

        expect(ACHIEVEMENTS_CATALOG.DEATH_FALL).toBeDefined();
        expect(ACHIEVEMENTS_CATALOG.DEATH_FALL.title).toBe('Broken Bones');

        for (let d = 5; d <= 50; d += 5) {
            expect(ACHIEVEMENTS_CATALOG['DEATH_' + d]).toBeDefined();
            expect(ACHIEVEMENTS_CATALOG['DEATH_' + d].category).toBe('deaths');
        }

        // 2 Secret achievements
        expect(ACHIEVEMENTS_CATALOG.SECRET_FOUND.isSecret).toBe(true);
        expect(ACHIEVEMENTS_CATALOG.SECRET_AUTH.isSecret).toBe(true);
    });

    it('should start with 0 achievements unlocked and 0% progress', () => {
        const p = mgr.getProgress();
        expect(p.unlockedCount).toBe(0);
        expect(p.total).toBe(69);
        expect(p.percent).toBe(0);
    });

    it('should unlock First Blood and persist to localStorage', () => {
        expect(mgr.isUnlocked('FIRST_BLOOD')).toBe(false);
        const res = mgr.unlock('FIRST_BLOOD');
        expect(res).toBe(true);
        expect(mgr.isUnlocked('FIRST_BLOOD')).toBe(true);

        // Re-creating manager should load saved state from localStorage
        const newMgr = new AchievementManager();
        expect(newMgr.isUnlocked('FIRST_BLOOD')).toBe(true);
        expect(newMgr.getProgress().unlockedCount).toBe(1);
    });

    it('should not re-unlock an already unlocked achievement', () => {
        expect(mgr.unlock('SURVIVE_WAVE_5')).toBe(true);
        expect(mgr.unlock('SURVIVE_WAVE_5')).toBe(false);
    });

    it('should unlock Secret Achievement 1 when discovering the test thing', () => {
        expect(mgr.isUnlocked('SECRET_FOUND')).toBe(false);
        mgr.unlock('SECRET_FOUND');
        expect(mgr.isUnlocked('SECRET_FOUND')).toBe(true);
    });

    it('should unlock Secret Achievement 2 when authenticating with the developer password', () => {
        expect(verifyTestModePassword('rapha_tester123')).toBe(true);
        expect(mgr.isUnlocked('SECRET_AUTH')).toBe(false);
        mgr.unlock('SECRET_AUTH');
        expect(mgr.isUnlocked('SECRET_AUTH')).toBe(true);
    });

    it('should correctly unlock kill milestone achievements via recordKill', () => {
        mgr.recordKill(1);
        expect(mgr.isUnlocked('FIRST_BLOOD')).toBe(true);
        expect(mgr.isUnlocked('KILL_5')).toBe(false);

        mgr.recordKill(25);
        expect(mgr.isUnlocked('KILL_5')).toBe(true);
        expect(mgr.isUnlocked('KILL_10')).toBe(true);
        expect(mgr.isUnlocked('KILL_25')).toBe(true);
        expect(mgr.isUnlocked('KILL_30')).toBe(false);

        mgr.recordKill(200);
        expect(mgr.isUnlocked('KILL_200')).toBe(true);
    });

    it('should correctly unlock wave milestone achievements via recordWave', () => {
        mgr.recordWave(5);
        expect(mgr.isUnlocked('SURVIVE_WAVE_5')).toBe(true);
        expect(mgr.isUnlocked('SURVIVE_WAVE_10')).toBe(false);

        mgr.recordWave(50);
        expect(mgr.isUnlocked('SURVIVE_WAVE_50')).toBe(true);
    });

    it('should record casualties and award death achievements', () => {
        // First bullet casualty increments deaths, unlocks DEATH_5 at 5 deaths
        mgr.recordDeath('bullet');
        expect(mgr.getTotalDeaths()).toBe(1);
        expect(mgr.isUnlocked('DEATH_5')).toBe(false);

        // Water / drowning death awards "Oh, So That's What It Does"
        mgr.recordDeath('water');
        expect(mgr.getTotalDeaths()).toBe(2);
        expect(mgr.isUnlocked('DEATH_WATER')).toBe(true);
        expect(ACHIEVEMENTS_CATALOG.DEATH_WATER.title).toBe("Oh, So That's What It Does");

        // Fall death (broken bones)
        mgr.recordDeath('fall');
        expect(mgr.getTotalDeaths()).toBe(3);
        expect(mgr.isUnlocked('DEATH_FALL')).toBe(true);
        expect(ACHIEVEMENTS_CATALOG.DEATH_FALL.title).toBe('Broken Bones');

        // Advance to 5 deaths
        mgr.recordDeath('bullet');
        mgr.recordDeath('bullet');
        expect(mgr.getTotalDeaths()).toBe(5);
        expect(mgr.isUnlocked('DEATH_5')).toBe(true);
        expect(mgr.isUnlocked('DEATH_10')).toBe(false);

        // Advance to 50 deaths
        for (let i = 6; i <= 50; i++) {
            mgr.recordDeath('combat');
        }
        expect(mgr.getTotalDeaths()).toBe(50);
        expect(mgr.isUnlocked('DEATH_50')).toBe(true);
    });

    it('should correctly calculate progress percentage as achievements are earned', () => {
        mgr.unlock('FIRST_BLOOD');
        mgr.unlock('SURVIVE_WAVE_5');
        mgr.unlock('SECRET_FOUND');
        const p = mgr.getProgress();
        expect(p.unlockedCount).toBe(3);
        expect(p.total).toBe(69);
        expect(p.percent).toBe(4); // Math.round((3 / 69) * 100) = 4%
    });

    it('should reset all achievement progress, death counts, and minigun unlock state', () => {
        mgr.unlock('FIRST_BLOOD');
        mgr.unlock('SURVIVE_WAVE_5');
        mgr.recordDeath('bullet');
        global.localStorage.setItem('urban_breach_minigun_unlocked', 'true');

        expect(mgr.getProgress().unlockedCount).toBe(2);
        expect(mgr.getTotalDeaths()).toBe(1);
        expect(global.localStorage.getItem('urban_breach_minigun_unlocked')).toBe('true');

        mgr.resetAllProgress();

        expect(mgr.getProgress().unlockedCount).toBe(0);
        expect(mgr.getProgress().percent).toBe(0);
        expect(mgr.getTotalDeaths()).toBe(0);
        expect(mgr.isUnlocked('FIRST_BLOOD')).toBe(false);
        expect(global.localStorage.getItem('urban_breach_minigun_unlocked')).toBeNull();
    });
});
