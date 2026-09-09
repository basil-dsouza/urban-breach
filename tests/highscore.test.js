import { describe, it, expect, beforeEach } from 'vitest';
import { HighScoreManager, DIFFICULTY_MULTIPLIERS } from '../Game Code/JavaScript/systems/highscore.js';

describe('Local High Score System & Scoring Engine', () => {
    let manager;
    let mockStorage = {};

    beforeEach(() => {
        mockStorage = {};
        globalThis.localStorage = {
            getItem: (key) => mockStorage[key] || null,
            setItem: (key, val) => { mockStorage[key] = String(val); },
            removeItem: (key) => { delete mockStorage[key]; },
            clear: () => { mockStorage = {}; }
        };
        manager = new HighScoreManager();
    });

    it('should compute base scores accurately for standard runs', () => {
        // 10 kills (1000) + wave 3 (2 waves survived * 500 = 1000) * 1.0 (NORMAL) = 2000
        const score = manager.calculateScore({ kills: 10, wave: 3, bossKills: 0, difficultyKey: 'NORMAL' });
        expect(score).toBe(2000);
    });

    it('should apply difficulty multipliers correctly', () => {
        const recruit = manager.calculateScore({ kills: 10, wave: 3, difficultyKey: 'EASY' });
        const survivor = manager.calculateScore({ kills: 10, wave: 3, difficultyKey: 'NORMAL' });
        const veteran = manager.calculateScore({ kills: 10, wave: 3, difficultyKey: 'HARD' });
        const nightmare = manager.calculateScore({ kills: 10, wave: 3, difficultyKey: 'NIGHTMARE' });

        expect(recruit).toBe(1500); // 2000 * 0.75
        expect(survivor).toBe(2000); // 2000 * 1.0
        expect(veteran).toBe(3000); // 2000 * 1.5
        expect(nightmare).toBe(4000); // 2000 * 2.0
    });

    it('should award bonus points for boss juggernaut eliminations', () => {
        manager.recordBossKill();
        // 5 kills (500) + wave 6 (2500) + 1 boss (1000) = 4000 * 1.0
        const score = manager.calculateScore({ kills: 5, wave: 6, difficultyKey: 'NORMAL' });
        expect(score).toBe(4000);
    });

    it('should persist new high records to localStorage and detect record flags', () => {
        const initialBest = manager.getHighScore();
        expect(initialBest.score).toBe(0);

        const run1 = manager.submitScore({ kills: 20, wave: 5, difficultyKey: 'NORMAL' });
        expect(run1.isNewRecord).toBe(true);
        expect(run1.score).toBe(4000); // 2000 + 2000 = 4000
        expect(manager.getHighScore().score).toBe(4000);

        // Run with lower score does not overwrite
        const run2 = manager.submitScore({ kills: 5, wave: 2, difficultyKey: 'NORMAL' });
        expect(run2.isNewRecord).toBe(false);
        expect(run2.score).toBe(1000);
        expect(manager.getHighScore().score).toBe(4000);

        // Run with higher score updates record
        const run3 = manager.submitScore({ kills: 50, wave: 10, difficultyKey: 'NORMAL' });
        expect(run3.isNewRecord).toBe(true);
        expect(run3.score).toBe(9500); // 5000 + 4500
        expect(manager.getHighScore().score).toBe(9500);
    });

    it('should ignore cheat sessions from overwriting legitimate records', () => {
        manager.submitScore({ kills: 10, wave: 2, difficultyKey: 'NORMAL' }); // score: 1500
        expect(manager.getHighScore().score).toBe(1500);

        const cheatRun = manager.submitScore({ kills: 9999, wave: 50, isCheat: true });
        expect(cheatRun.isNewRecord).toBe(false);
        expect(cheatRun.isCheat).toBe(true);
        expect(manager.getHighScore().score).toBe(1500);
    });

    it('should cleanly reset local high scores when requested', () => {
        manager.submitScore({ kills: 10, wave: 5, difficultyKey: 'NORMAL' });
        expect(manager.getHighScore().score).toBeGreaterThan(0);

        manager.resetHighScore();
        expect(manager.getHighScore().score).toBe(0);
    });
});
