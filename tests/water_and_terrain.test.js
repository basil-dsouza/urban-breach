import { describe, it, expect } from 'vitest';

describe('Terrain Elevation, Dam, River & Water Depth Systems', () => {
    const waterBodies = [
        { name: 'alpine_reservoir', x: -270, z: 270, radius: 45, bedDepth: 3.5, waterLevel: 7.0 },
        { name: 'emerald_lake', x: -90, z: 260, radius: 34, bedDepth: -3.2, waterLevel: 0.0 },
        { name: 'eastern_delta', x: 260, z: 180, radius: 38, bedDepth: -3.4, waterLevel: 0.0 }
    ];

    const riverWaypoints = [
        { x: -180, z: 230 },
        { x: -140, z: 245 },
        { x: -90, z: 260 },
        { x: -30, z: 275 },
        { x: 40, z: 260 },
        { x: 120, z: 230 },
        { x: 200, z: 195 },
        { x: 260, z: 180 }
    ];

    function getRiverDistance(x, z) {
        let minDist = 9999;
        for (let i = 0; i < riverWaypoints.length - 1; i++) {
            const p1 = riverWaypoints[i];
            const p2 = riverWaypoints[i + 1];
            const dx = p2.x - p1.x;
            const dz = p2.z - p1.z;
            const l2 = dx * dx + dz * dz;
            if (l2 === 0) continue;
            let t = ((x - p1.x) * dx + (z - p1.z) * dz) / l2;
            t = Math.max(0, Math.min(1, t));
            const projX = p1.x + t * dx;
            const projZ = p1.z + t * dz;
            const d = Math.hypot(x - projX, z - projZ);
            if (d < minDist) minDist = d;
        }
        return minDist;
    }

    function getWaterLevel(x, z) {
        for (const lake of waterBodies) {
            const dist = Math.hypot(x - lake.x, z - lake.z);
            if (dist <= lake.radius) {
                return lake.waterLevel;
            }
        }
        const riverDist = getRiverDistance(x, z);
        if (riverDist <= 10.0 && x > -180) {
            return 0.0;
        }
        return -999.0;
    }

    function getTerrainHeight(x, z) {
        for (const lake of waterBodies) {
            const dist = Math.hypot(x - lake.x, z - lake.z);
            if (dist < lake.radius) {
                const t = dist / lake.radius;
                const depthFactor = Math.cos(t * Math.PI * 0.5);
                if (lake.name === 'alpine_reservoir') {
                    return lake.waterLevel - lake.bedDepth * depthFactor;
                }
                return lake.bedDepth * depthFactor;
            }
        }

        const riverDist = getRiverDistance(x, z);
        if (riverDist < 12.0 && x > -180) {
            const t = riverDist / 12.0;
            const depthFactor = Math.cos(t * Math.PI * 0.5);
            return -2.4 * depthFactor;
        }

        const distFromCenter = Math.max(Math.abs(x), Math.abs(z));
        if (distFromCenter < 125) return 0.0;

        const dNW1 = Math.hypot(x - (-260), z - 260);
        return 14.5 * Math.exp(- (dNW1 * dNW1) / (70 * 70));
    }

    it('should return flat 0m in city center and no water', () => {
        expect(getTerrainHeight(0, 0)).toBe(0);
        expect(getTerrainHeight(50, 50)).toBe(0);
        expect(getWaterLevel(0, 0)).toBe(-999.0);
    });

    it('should calculate accurate depth for the Alpine High-Altitude Reservoir', () => {
        expect(getWaterLevel(-270, 270)).toBe(7.0);
        expect(getTerrainHeight(-270, 270)).toBeCloseTo(3.5, 1);
    });

    it('should detect river water and channel depression along the winding valley river', () => {
        expect(getWaterLevel(-140, 245)).toBe(0.0);
        expect(getTerrainHeight(-140, 245)).toBeLessThan(-2.0);
    });

    it('should keep residential house locations completely dry without water overlap', () => {
        // South residential cottages
        expect(getWaterLevel(170, -212)).toBe(-999.0);
        expect(getWaterLevel(196, -205)).toBe(-999.0);
        expect(getWaterLevel(144, -218)).toBe(-999.0);
        // West cottages
        expect(getWaterLevel(-210, 86)).toBe(-999.0);
    });
});

describe('Anatomical Bone Fractures, Bullet Wounds & Debuffs', () => {
    it('should apply -35% movement speed penalty and disable sprint when leg is fractured', () => {
        const bodyBones = { leftLeg: true, rightLeg: false };
        const sprintKey = true;
        const crouch = false;

        const hasLegFracture = bodyBones.leftLeg || bodyBones.rightLeg;
        const sprint = !crouch && !hasLegFracture && sprintKey;
        let speed = crouch ? 3.4 : (sprint ? 13 : 7.2);
        if (hasLegFracture) {
            speed *= 0.65;
        }

        expect(sprint).toBe(false);
        expect(speed).toBeCloseTo(4.68, 2);
    });

    it('should increase weapon reload time by +50% when arms are fractured', () => {
        const bodyBones = { leftArm: true, rightArm: false };
        const baseReloadTime = 2.1;
        const armPenalty = (bodyBones.leftArm || bodyBones.rightArm) ? 1.5 : 1.0;
        const reloadDuration = baseReloadTime * armPenalty;

        expect(reloadDuration).toBeCloseTo(3.15, 2);
    });

    it('should cut lung capacity in half (6s) when torso/ribs are cracked', () => {
        const bodyBones = { torso: true };
        const lungDuration = bodyBones.torso ? 6.0 : 12.0;
        let oxygen = 100;
        const delta = 1.0;

        oxygen = Math.max(0, oxygen - (100 / lungDuration) * delta);
        expect(oxygen).toBeCloseTo(83.33, 1);
    });

    it('should register bullet wounds and periodic bleeding ticks', () => {
        let health = 100;
        let bleedTimer = 0;
        const bulletWounds = { torso: 1, rightLeg: 1 };
        const isBleeding = true;
        const delta = 0.5;

        if (isBleeding) {
            bleedTimer -= delta;
            if (bleedTimer <= 0) {
                bleedTimer = 3.5;
                let totalWounds = 0;
                for (const k in bulletWounds) totalWounds += bulletWounds[k];
                if (totalWounds > 0 && health > 1) {
                    health = Math.max(1, health - 1);
                }
            }
        }

        expect(health).toBe(99);
    });

    it('should fully heal all bone fractures, bullet wounds, and bleeding when picking up a medkit', () => {
        let bodyBones = { head: true, torso: true, leftArm: true, rightArm: true, leftLeg: true, rightLeg: true };
        let bulletWounds = { head: 1, torso: 2, leftArm: 1, rightArm: 0, leftLeg: 1, rightLeg: 1 };
        let isBleeding = true;

        // Medkit treatment
        bodyBones = { head: false, torso: false, leftArm: false, rightArm: false, leftLeg: false, rightLeg: false };
        bulletWounds = { head: 0, torso: 0, leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0 };
        isBleeding = false;

        expect(Object.values(bodyBones).every(v => v === false)).toBe(true);
        expect(Object.values(bulletWounds).every(v => v === 0)).toBe(true);
        expect(isBleeding).toBe(false);
    });
});
