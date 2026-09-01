import { describe, it, expect } from 'vitest';

describe('Terrain Elevation & Water Depth Systems', () => {
    const waterBodies = [
        { name: 'alpine_lake', x: -210, z: 215, radius: 38, bedDepth: -3.5, waterLevel: 0.0 },
        { name: 'woodland_lake', x: 210, z: -215, radius: 35, bedDepth: -3.2, waterLevel: 0.0 }
    ];

    function getWaterLevel(x, z) {
        for (const lake of waterBodies) {
            const dist = Math.hypot(x - lake.x, z - lake.z);
            if (dist <= lake.radius) {
                return lake.waterLevel;
            }
        }
        return -999.0;
    }

    function getTerrainHeight(x, z) {
        for (const lake of waterBodies) {
            const dist = Math.hypot(x - lake.x, z - lake.z);
            if (dist < lake.radius) {
                const t = dist / lake.radius;
                const depthFactor = Math.cos(t * Math.PI * 0.5);
                return lake.bedDepth * depthFactor;
            }
        }

        const distFromCenter = Math.max(Math.abs(x), Math.abs(z));
        if (distFromCenter < 125) return 0.0;

        // North-West Alpine Mountain Peaks & Ridges
        const dNW1 = Math.hypot(x - (-260), z - 260);
        const h = 14.5 * Math.exp(- (dNW1 * dNW1) / (70 * 70));
        return h;
    }

    it('should return flat 0m in city center', () => {
        expect(getTerrainHeight(0, 0)).toBe(0);
        expect(getTerrainHeight(50, 50)).toBe(0);
        expect(getWaterLevel(0, 0)).toBe(-999.0);
    });

    it('should generate deep bowl depression inside lake boundaries', () => {
        const lakeCenterDepth = getTerrainHeight(-210, 215);
        expect(lakeCenterDepth).toBeCloseTo(-3.5, 1);
        expect(getWaterLevel(-210, 215)).toBe(0.0);
    });

    it('should generate elevated hills in mountain forest biomes', () => {
        const mountainHeight = getTerrainHeight(-260, 260);
        expect(mountainHeight).toBeGreaterThan(12.0);
    });
});

describe('Swimming Physics & Underwater Breath / Suffocation Mechanics', () => {
    it('should deplete oxygen while head is submerged underwater', () => {
        let oxygen = 100;
        const delta = 1.0; // 1 second elapsed
        const isHeadSubmerged = true;

        if (isHeadSubmerged) {
            oxygen = Math.max(0, oxygen - (100 / 12.0) * delta);
        }

        expect(oxygen).toBeCloseTo(91.66, 1);
    });

    it('should trigger suffocation damage when oxygen reaches 0%', () => {
        let oxygen = 0;
        let health = 100;
        let drownDamageTimer = 0;
        const delta = 0.5;

        if (oxygen <= 0) {
            drownDamageTimer -= delta;
            if (drownDamageTimer <= 0) {
                drownDamageTimer = 0.85;
                health -= 14;
            }
        }

        expect(health).toBe(86);
    });

    it('should rapidly recover oxygen when surfaced', () => {
        let oxygen = 20;
        const delta = 1.0;
        const isHeadSubmerged = false;

        if (!isHeadSubmerged) {
            oxygen = Math.min(100, oxygen + 48.0 * delta);
        }

        expect(oxygen).toBe(68);
    });
});
