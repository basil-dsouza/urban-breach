import { describe, it, expect } from 'vitest';
import { WEAPON_CONFIGS } from '../src/ui.js';

describe('Weapon Arsenal Configuration (AK-47, Barrett .50 Cal, & M590 Shotgun)', () => {
    it('should have exactly the three primary weapons defined (AK47, SNIPER, and SHOTGUN)', () => {
        const keys = Object.keys(WEAPON_CONFIGS);
        expect(keys).toContain('AK47');
        expect(keys).toContain('SNIPER');
        expect(keys).toContain('SHOTGUN');
        expect(keys.length).toBe(3);
    });

    it('should configure AK-47 for tactical rapid assault rifle combat', () => {
        const ak = WEAPON_CONFIGS.AK47;
        expect(ak.id).toBe('AK47');
        expect(ak.ammo).toBe(30);
        expect(ak.maxAmmo).toBe(30);
        expect(ak.damage).toBe(35);
        expect(ak.fireRate).toBeLessThan(0.12); // rapid fire
        expect(ak.aimFOV).toBe(48); // moderate tactical ADS zoom
    });

    it('should configure Barrett .50 Cal for extreme lethal anti-materiel sniping', () => {
        const sniper = WEAPON_CONFIGS.SNIPER;
        expect(sniper.id).toBe('SNIPER');
        expect(sniper.ammo).toBe(10);
        expect(sniper.maxAmmo).toBe(10);
        expect(sniper.damage).toBe(200); // 1-shot lethality on standard hostiles
        expect(sniper.fireRate).toBeGreaterThan(0.5); // heavy bolt cycle
        expect(sniper.aimFOV).toBe(15); // high magnification 5x optical scope
    });

    it('should configure M590 Pump-Action Shotgun for close-quarter tactical damage', () => {
        const shotgun = WEAPON_CONFIGS.SHOTGUN;
        expect(shotgun.id).toBe('SHOTGUN');
        expect(shotgun.ammo).toBe(8);
        expect(shotgun.maxAmmo).toBe(8);
        expect(shotgun.damage).toBe(15);
        expect(shotgun.pellets).toBe(8);
        expect(shotgun.fireRate).toBe(0.72);
        expect(shotgun.aimFOV).toBe(58);
    });
});
