import { describe, it, expect, beforeEach } from 'vitest';
import { SpreadSystem, SPREAD_CONFIG } from '../src/spread.js';

describe('SpreadSystem — Balanced Hip-Fire & Pinpoint ADS', () => {
    let spread;

    beforeEach(() => {
        spread = new SpreadSystem();
    });

    it('should initialize with balanced standing spread (7px)', () => {
        expect(spread.currentSpread).toBe(7.0);
    });

    it('should calculate higher base spread when walking (12px) or sprinting (18px)', () => {
        expect(spread.getBaseSpread({ moving: false })).toBe(7.0);
        expect(spread.getBaseSpread({ moving: true, sprinting: false })).toBe(12.0);
        expect(spread.getBaseSpread({ moving: true, sprinting: true })).toBe(18.0);
    });

    it('should produce 0 spread when aiming down sights (pinpoint laser ADS)', () => {
        expect(spread.getBaseSpread({ aiming: true })).toBe(0.0);
        spread.update(0.1, { aiming: true });
        expect(spread.currentSpread).toBeLessThanOrEqual(0.1);
    });

    it('should increase spread on hip fire shot but NOT when aimed', () => {
        const initial = spread.currentSpread;
        spread.onFire(false);
        expect(spread.currentSpread).toBe(initial + SPREAD_CONFIG.firePerShotKick);

        spread.currentSpread = 0;
        spread.onFire(true);
        expect(spread.currentSpread).toBe(0);
    });

    it('should continuously increase spread when holding LMB and clamp at max limit (26px)', () => {
        for (let i = 0; i < 50; i++) {
            spread.update(0.1, { isFiring: true });
        }
        expect(spread.currentSpread).toBe(SPREAD_CONFIG.maxSpread);
    });

    it('should calculate perfectly straight trajectory when aimed (spread <= 0.1)', () => {
        const forward = { x: 0, y: 0, z: -1 };
        const right = { x: 1, y: 0, z: 0 };
        const up = { x: 0, y: 1, z: 0 };

        const dir = spread.calculateSpreadDirection(forward, right, up, 0.0);
        expect(dir.x).toBe(0);
        expect(dir.y).toBe(0);
        expect(dir.z).toBe(-1);
    });
});
