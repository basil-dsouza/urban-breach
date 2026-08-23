import { describe, it, expect, beforeEach } from 'vitest';
import { GrenadePhysics, GRENADE_CONFIG } from '../src/grenades.js';

describe('GrenadePhysics — Ground Collision & Bounce Mechanics', () => {
    let physics;

    beforeEach(() => {
        physics = new GrenadePhysics();
    });

    it('should create grenade with forward trajectory and pitch boost', () => {
        const cameraPos = { x: 0, y: 1.7, z: 0 };
        const cameraDir = { x: 0, y: 0, z: -1 };
        const g = physics.createGrenadeData(cameraPos, cameraDir);

        expect(g.x).toBe(0);
        expect(g.y).toBe(1.7);
        expect(g.vz).toBeLessThan(0);
        expect(g.vy).toBeGreaterThan(0); // Upward pitch boost
        expect(g.life).toBe(GRENADE_CONFIG.fuseTime);
    });

    it('should NEVER fall below ground level (y >= groundY + radius)', () => {
        const g = {
            x: 0,
            y: 0.5,
            z: 0,
            vx: 5,
            vy: -15, // Falling rapidly towards ground
            vz: 5,
            life: 2.0,
            isGrounded: false,
            radius: 0.22
        };

        const getGroundHeight = () => 0; // Flat ground at Y=0

        // Step physics through multiple frames
        for (let i = 0; i < 20; i++) {
            physics.update(g, 0.05, getGroundHeight, []);
            expect(g.y).toBeGreaterThanOrEqual(0 + g.radius);
        }
    });

    it('should bounce when hitting ground with vertical velocity above threshold', () => {
        const g = {
            x: 0,
            y: 0.5,
            z: 0,
            vx: 0,
            vy: -10,
            vz: 0,
            life: 2.0,
            isGrounded: false,
            radius: 0.22
        };

        physics.update(g, 0.06, () => 0, []);
        expect(g.vy).toBeGreaterThan(0); // Bounced upwards
        expect(g.y).toBeGreaterThanOrEqual(0.22);
    });

    it('should settle on ground when vertical speed becomes small (vy = 0, isGrounded = true)', () => {
        const g = {
            x: 0,
            y: 0.23,
            z: 0,
            vx: 2,
            vy: -0.2, // Below stopBounceThreshold
            vz: 2,
            life: 2.0,
            isGrounded: false,
            radius: 0.22
        };

        physics.update(g, 0.05, () => 0, []);
        expect(g.isGrounded).toBe(true);
        expect(g.vy).toBe(0);
        expect(g.y).toBe(0.22);
    });

    it('should collide with and land on elevated building rooftops', () => {
        const roofHeight = 12.0;
        const g = {
            x: 10,
            y: 13.0,
            z: 10,
            vx: 0,
            vy: -8,
            vz: 0,
            life: 2.0,
            isGrounded: false,
            radius: 0.22
        };

        physics.update(g, 0.1, () => roofHeight, []);
        expect(g.y).toBeGreaterThanOrEqual(roofHeight + g.radius);
    });

    it('should calculate distance-scaled blast damage within radius', () => {
        const directHitDmg = physics.calculateDamage(0);
        const midHitDmg = physics.calculateDamage(physics.config.blastRadius / 2);
        const outsideDmg = physics.calculateDamage(physics.config.blastRadius + 2);

        expect(directHitDmg).toBe(physics.config.maxBlastDamage);
        expect(midHitDmg).toBeGreaterThan(0);
        expect(midHitDmg).toBeLessThan(directHitDmg);
        expect(outsideDmg).toBe(0);
    });
});
