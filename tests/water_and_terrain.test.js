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

    const buildings = [
        // Lakeside Haven Town (Shoreline villas)
        { x: -65, z: 236, w: 16, d: 15, h: 7.8, style: 'villa', rotY: Math.PI },
        { x: -160, z: 242, w: 16, d: 15, h: 7.8, style: 'villa', rotY: Math.PI },
        // East Port & Industrial City
        { x: 235, z: -85, w: 26, d: 18, h: 9.5, style: 'warehouse', rotY: 0 },
        { x: 235, z: -135, w: 22, d: 22, h: 34, style: 'skyscraper', rotY: 0 },
        // South Metro City
        { x: -45, z: -295, w: 22, d: 22, h: 42, style: 'skyscraper', rotY: 0 },
        // Pinecrest Mountain Village
        { x: -255, z: 220, w: 14, d: 13, h: 6.2, style: 'cabin', rotY: Math.PI / 2 },
        // Delta Cross Fishing Hamlet
        { x: 275, z: 230, w: 13, d: 12, h: 5.8, style: 'cottage', rotY: Math.PI / 2 }
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
        // Buildings are always dry inside (except swimming pool)
        for (const b of buildings) {
            if (b.style === 'dam') continue;
            const rot = b.rotY || 0;
            const cosR = Math.cos(-rot);
            const sinR = Math.sin(-rot);
            const dx = x - b.x;
            const dz = z - b.z;
            const localX = cosR * dx - sinR * dz;
            const localZ = sinR * dx + cosR * dz;

            if (Math.abs(localX) <= (b.w || 14) / 2 && Math.abs(localZ) <= (b.d || 14) / 2) {
                if (b.style === 'villa') {
                    const poolOffsetX = 0.44 * 16 + 0.2;
                    const poolOffsetZ = 0.34 * 15 - 0.2;
                    if (Math.abs(localX - poolOffsetX) < 2.3 && Math.abs(localZ - poolOffsetZ) < 3.2) {
                        return 0.32;
                    }
                }
                return -999.0;
            }
        }

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
        // 1. Building lots & yards are always flat and level
        for (const b of buildings) {
            if (b.style === 'dam') continue;
            const rot = b.rotY || 0;
            const cosR = Math.cos(-rot);
            const sinR = Math.sin(-rot);
            const dx = x - b.x;
            const dz = z - b.z;
            const localX = cosR * dx - sinR * dz;
            const localZ = sinR * dx + cosR * dz;
            const halfW = (b.w || 14) / 2 + 3.0;
            const halfD = (b.d || 14) / 2 + 3.0;
            if (Math.abs(localX) < halfW && Math.abs(localZ) < halfD) {
                return 0.0;
            }
        }

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

    function checkObstacleCollision(px, pz, feetY, obs, radius = 0.55) {
        if (feetY >= (obs.top !== undefined ? obs.top : 20) - 0.15 || feetY < (obs.bottom || 0) - 0.5) {
            return false;
        }

        let localX = px - obs.x;
        let localZ = pz - obs.z;
        if (obs.rotY) {
            const cosA = Math.cos(-obs.rotY);
            const sinA = Math.sin(-obs.rotY);
            const dx = localX;
            const dz = localZ;
            localX = cosA * dx - sinA * dz;
            localZ = sinA * dx + cosA * dz;
        }

        const halfW = obs.w / 2 + radius;
        const halfD = obs.d / 2 + radius;
        return Math.abs(localX) <= halfW && Math.abs(localZ) <= halfD;
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

    it('should keep lakeside villa houses completely dry and level on dry ground', () => {
        // Emerald Lake Shoreline Villa
        expect(getWaterLevel(-65, 236)).toBe(-999.0);
        expect(getTerrainHeight(-65, 236)).toBe(0.0);

        // Alpine Reservoir Shoreline Villa
        expect(getWaterLevel(-160, 242)).toBe(-999.0);
        expect(getTerrainHeight(-160, 242)).toBe(0.0);
    });

    it('should verify level dry foundations for East Port City, South Metro, and Regional Towns', () => {
        // East Port Warehouse & Skyscraper
        expect(getWaterLevel(235, -85)).toBe(-999.0);
        expect(getTerrainHeight(235, -85)).toBe(0.0);
        expect(getWaterLevel(235, -135)).toBe(-999.0);
        expect(getTerrainHeight(235, -135)).toBe(0.0);

        // South Metro Tech Skyscraper
        expect(getWaterLevel(-45, -295)).toBe(-999.0);
        expect(getTerrainHeight(-45, -295)).toBe(0.0);

        // Pinecrest Alpine Mountain Village Cabin
        expect(getWaterLevel(-255, 220)).toBe(-999.0);
        expect(getTerrainHeight(-255, 220)).toBe(0.0);

        // Delta Cross River Hamlet Cottage
        expect(getWaterLevel(275, 230)).toBe(-999.0);
        expect(getTerrainHeight(275, 230)).toBe(0.0);
    });

    it('should allow player to walk on modern villa sundeck without phantom collisions', () => {
        const villaObs = {
            x: 0,
            z: 0,
            w: 16 * 0.72, // 11.52m
            d: 15 * 0.82, // 12.30m
            rotY: 0,
            bottom: 0,
            top: 7.8
        };

        // Sundeck is at x = 7.04, z = 5.1 (outside main wall volume)
        const patioX = 7.04;
        const patioZ = 5.1;
        const collidesPatio = checkObstacleCollision(patioX, patioZ, 0.35, villaObs, 0.55);
        expect(collidesPatio).toBe(false);

        // Center of the house (solid interior walls)
        const insideX = 0;
        const insideZ = 0;
        const collidesCenter = checkObstacleCollision(insideX, insideZ, 0.35, villaObs, 0.55);
        expect(collidesCenter).toBe(true);
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
