import { describe, it, expect } from 'vitest';
import { WEAPON_CONFIGS } from '../Game Code/JavaScript/systems/ui.js';

describe('Weapon Arsenal Configuration (Primaries & Armory Handguns)', () => {
    it('should have all 7 weapons defined including M134 Minigun and the 3 Armory pistols', () => {
        const keys = Object.keys(WEAPON_CONFIGS);
        expect(keys).toContain('AK47');
        expect(keys).toContain('SNIPER');
        expect(keys).toContain('SHOTGUN');
        expect(keys).toContain('MINIGUN');
        expect(keys).toContain('SW_MODEL29');
        expect(keys).toContain('M1911');
        expect(keys).toContain('LUGER_P08');
        expect(keys.length).toBe(7);
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
        expect(shotgun.spread.baseAiming).toBe(80.0); // 100% widened scope spread
        expect(shotgun.spread.maxAimSpread).toBe(120.0);
        expect(shotgun.spread.aimShotKick).toBe(8.0);
    });

    it('should configure M134 Vulcan Minigun with 100 ammo, instant clip reload, and rapid fire', () => {
        const minigun = WEAPON_CONFIGS.MINIGUN;
        expect(minigun.id).toBe('MINIGUN');
        expect(minigun.ammo).toBe(100);
        expect(minigun.maxAmmo).toBe(100);
        expect(minigun.damage).toBe(28);
        expect(minigun.fireRate).toBeLessThan(0.08); // rapid Gatling cycle
        expect(minigun.reloadTime).toBe(0.0); // instant clip reload
        expect(minigun.aimFOV).toBe(70); // no scope (near normal 75 FOV)
        expect(minigun.spread).toBeDefined();
    });

    it('should configure Smith & Wesson Model 29 based on real characteristics at exactly 200 Gold', () => {
        const sw = WEAPON_CONFIGS.SW_MODEL29;
        expect(sw.id).toBe('SW_MODEL29');
        expect(sw.price).toBe(200); // Exactly 200 Gold as required
        expect(sw.ammo).toBe(6); // 6-shot cylinder
        expect(sw.maxAmmo).toBe(6);
        expect(sw.damage).toBe(115); // High kinetic .44 Magnum punch
        expect(sw.isPistol).toBe(true);
        expect(sw.reloadTime).toBe(2.6);
    });

    it('should configure M1911 Pistol based on real characteristics at exactly 400 Gold', () => {
        const colt = WEAPON_CONFIGS.M1911;
        expect(colt.id).toBe('M1911');
        expect(colt.price).toBe(400); // Exactly 400 Gold as required
        expect(colt.ammo).toBe(7); // 7-round single-stack magazine
        expect(colt.maxAmmo).toBe(7);
        expect(colt.damage).toBe(60);
        expect(colt.fireRate).toBe(0.18);
        expect(colt.isPistol).toBe(true);
        expect(colt.reloadTime).toBe(1.8);
    });

    it('should configure Luger P08 based on real characteristics at exactly 600 Gold', () => {
        const luger = WEAPON_CONFIGS.LUGER_P08;
        expect(luger.id).toBe('LUGER_P08');
        expect(luger.price).toBe(600); // Exactly 600 Gold as required
        expect(luger.ammo).toBe(8); // 8-round magazine
        expect(luger.maxAmmo).toBe(8);
        expect(luger.damage).toBe(48);
        expect(luger.fireRate).toBe(0.14);
        expect(luger.isPistol).toBe(true);
        expect(luger.reloadTime).toBe(2.0);
    });
});

