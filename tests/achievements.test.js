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

    it('should have all 75 achievements cataloged with required metadata', () => {
        const keys = Object.keys(ACHIEVEMENTS_CATALOG);
        expect(keys.length).toBe(75);

        // Core requested achievements
        expect(ACHIEVEMENTS_CATALOG.PENULTIMATE_STAND).toBeDefined();
        expect(ACHIEVEMENTS_CATALOG.PENULTIMATE_STAND.title).toBe('The 95th Frontier');
        expect(ACHIEVEMENTS_CATALOG.PENULTIMATE_STAND.desc).toContain('95');

        expect(ACHIEVEMENTS_CATALOG.CENTURY_VICTORY).toBeDefined();
        expect(ACHIEVEMENTS_CATALOG.CENTURY_VICTORY.title).toBe('Century Conqueror');
        expect(ACHIEVEMENTS_CATALOG.CENTURY_VICTORY.desc).toContain('100');

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

        // Death achievements (multiples of 5 up to 50, first death, water, broken bones)
        expect(ACHIEVEMENTS_CATALOG.DEATH_FIRST).toBeDefined();
        expect(ACHIEVEMENTS_CATALOG.DEATH_FIRST.title).toBe("Oh, So That's What It Does");

        expect(ACHIEVEMENTS_CATALOG.DEATH_WATER).toBeDefined();
        expect(ACHIEVEMENTS_CATALOG.DEATH_WATER.title).toBe('Watery Grave');

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
        expect(p.total).toBe(75);
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
        expect(mgr.unlock('ROOKIE_SURVIVOR')).toBe(true);
        expect(mgr.unlock('ROOKIE_SURVIVOR')).toBe(false);
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

    it('should unlock Survive 95 Waves (PENULTIMATE_STAND)', () => {
        mgr.unlock('PENULTIMATE_STAND');
        expect(mgr.isUnlocked('PENULTIMATE_STAND')).toBe(true);
    });

    it('should unlock Century Conqueror (CENTURY_VICTORY) on wave 100 win', () => {
        mgr.unlock('CENTURY_VICTORY');
        expect(mgr.isUnlocked('CENTURY_VICTORY')).toBe(true);
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
        expect(mgr.isUnlocked('ROOKIE_SURVIVOR')).toBe(true);

        mgr.recordWave(50);
        expect(mgr.isUnlocked('SURVIVE_WAVE_50')).toBe(true);
        expect(mgr.isUnlocked('ELITE_DEFENDER')).toBe(true);
        expect(mgr.isUnlocked('PENULTIMATE_STAND')).toBe(false);

        mgr.recordWave(95);
        expect(mgr.isUnlocked('PENULTIMATE_STAND')).toBe(true);
    });

    it('should record casualties and award death achievements', () => {
        // First death awards "Oh, So That's What It Does"
        mgr.recordDeath('bullet');
        expect(mgr.getTotalDeaths()).toBe(1);
        expect(mgr.isUnlocked('DEATH_FIRST')).toBe(true);
        expect(mgr.isUnlocked('DEATH_5')).toBe(false);

        // Water death
        mgr.recordDeath('water');
        expect(mgr.getTotalDeaths()).toBe(2);
        expect(mgr.isUnlocked('DEATH_WATER')).toBe(true);

        // Fall death (broken bones)
        mgr.recordDeath('fall');
        expect(mgr.getTotalDeaths()).toBe(3);
        expect(mgr.isUnlocked('DEATH_FALL')).toBe(true);

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
        mgr.unlock('ROOKIE_SURVIVOR');
        mgr.unlock('SECRET_FOUND');
        const p = mgr.getProgress();
        expect(p.unlockedCount).toBe(3);
        expect(p.total).toBe(75);
        expect(p.percent).toBe(4); // Math.round((3 / 75) * 100) = 4%
    });
});
