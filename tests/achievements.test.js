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

    it('should have all 12 achievements cataloged with required metadata', () => {
        const keys = Object.keys(ACHIEVEMENTS_CATALOG);
        expect(keys.length).toBe(12);

        // Core requested achievements
        expect(ACHIEVEMENTS_CATALOG.PENULTIMATE_STAND).toBeDefined();
        expect(ACHIEVEMENTS_CATALOG.PENULTIMATE_STAND.title).toBe('The 95th Frontier');
        expect(ACHIEVEMENTS_CATALOG.PENULTIMATE_STAND.desc).toContain('95');

        expect(ACHIEVEMENTS_CATALOG.CENTURY_VICTORY).toBeDefined();
        expect(ACHIEVEMENTS_CATALOG.CENTURY_VICTORY.title).toBe('Century Conqueror');
        expect(ACHIEVEMENTS_CATALOG.CENTURY_VICTORY.desc).toContain('100');

        // 2 Secret achievements
        expect(ACHIEVEMENTS_CATALOG.SECRET_FOUND.isSecret).toBe(true);
        expect(ACHIEVEMENTS_CATALOG.SECRET_AUTH.isSecret).toBe(true);
    });

    it('should start with 0 achievements unlocked and 0% progress', () => {
        const p = mgr.getProgress();
        expect(p.unlockedCount).toBe(0);
        expect(p.total).toBe(12);
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

    it('should correctly calculate progress percentage as achievements are earned', () => {
        mgr.unlock('FIRST_BLOOD');
        mgr.unlock('ROOKIE_SURVIVOR');
        mgr.unlock('SECRET_FOUND');
        const p = mgr.getProgress();
        expect(p.unlockedCount).toBe(3);
        expect(p.total).toBe(12);
        expect(p.percent).toBe(25); // 3 / 12 = 25%
    });
});
