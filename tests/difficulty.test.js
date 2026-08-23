import { describe, it, expect } from 'vitest';
import { DIFFICULTY_LEVELS, setDifficulty, getDifficulty } from '../src/difficulty.js';

describe('Difficulty System — Rebalanced Progression', () => {
    it('should scale player health to make early levels forgiving on RECRUIT/SURVIVOR', () => {
        expect(DIFFICULTY_LEVELS.EASY.playerHealth).toBe(200);
        expect(DIFFICULTY_LEVELS.MEDIUM.playerHealth).toBe(125);
        expect(DIFFICULTY_LEVELS.HARD.playerHealth).toBe(85);
        expect(DIFFICULTY_LEVELS.NIGHTMARE.playerHealth).toBe(60);
    });

    it('should delay car spawns on easier difficulties to prevent overwhelming early game', () => {
        expect(DIFFICULTY_LEVELS.EASY.carSpawnWave).toBe(3);
        expect(DIFFICULTY_LEVELS.MEDIUM.carSpawnWave).toBe(2);
        expect(DIFFICULTY_LEVELS.HARD.carSpawnWave).toBe(1);
    });

    it('should provide higher medkit drop rates on easier tiers', () => {
        expect(DIFFICULTY_LEVELS.EASY.medkitDropChance).toBeGreaterThan(DIFFICULTY_LEVELS.MEDIUM.medkitDropChance);
        expect(DIFFICULTY_LEVELS.MEDIUM.medkitDropChance).toBeGreaterThan(DIFFICULTY_LEVELS.HARD.medkitDropChance);
    });
});
