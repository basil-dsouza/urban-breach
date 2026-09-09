import * as THREE from 'three';
import { getBridgeElevation, isOverBridge } from './bridges.js';

export const waterBodies = [
    { name: 'alpine_reservoir', x: -245, z: 230, radius: 46, waterLevel: 8.5, bedDepth: 6.5 },
    { name: 'emerald_lake', x: -90, z: 260, radius: 34, waterLevel: 0.0, bedDepth: -3.8 },
    { name: 'delta_lagoon', x: 280, z: 180, radius: 48, waterLevel: 0.0, bedDepth: -4.2 }
];

export const riverWaypoints = [
    { x: -180, z: 230 }, // Dam spillway outlet
    { x: -145, z: 246 },
    { x: -110, z: 255 },
    { x: -90, z: 260 },  // Passes smoothly through Emerald Lake
    { x: -55, z: 270 },
    { x: -15, z: 276 },
    { x: 30, z: 268 },
    { x: 85, z: 250 },
    { x: 140, z: 225 },
    { x: 195, z: 200 },
    { x: 260, z: 180 }   // Empties into Eastern Delta lagoon
];

export const riverSplinePoints = riverWaypoints.map(p => new THREE.Vector3(p.x, 0, p.z));
export const riverSpline = new THREE.CatmullRomCurve3(riverSplinePoints, false, 'catmullrom', 0.5);
export const riverSplineSamples = riverSpline.getPoints(128);
export const waterInstances = [];

export function getRiverDistance(x, z) {
    let minDist = 9999;
    for (let i = 0; i < riverSplineSamples.length - 1; i++) {
        const p1 = riverSplineSamples[i];
        const p2 = riverSplineSamples[i + 1];
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

export function getWaterLevel(x, z, buildings = []) {
    // Bridges are always above water level (dry)
    if (isOverBridge(x, z)) {
        return -999.0;
    }

    // Buildings are always dry inside (except luxury villa swimming pools)
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

    // Winding river channel
    const riverDist = getRiverDistance(x, z);
    if (riverDist <= 10.0 && x > -180) {
        return 0.0;
    }

    return -999.0;
}

export function getTerrainHeight(x, z, buildings = [], residentialRoadSegments = []) {
    // Check if on elevated bridge first
    const bridgeElev = getBridgeElevation(x, z);
    if (bridgeElev !== null) {
        return bridgeElev;
    }

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

    // 2. Lake Depressions
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

    // 3. Riverbed Channel (Depressed under water)
    const riverDist = getRiverDistance(x, z);
    if (riverDist < 12.0 && x > -180) {
        const t = riverDist / 12.0;
        const depthFactor = Math.cos(t * Math.PI * 0.5);
        return -2.4 * depthFactor;
    }

    // 4. City Core & Road Flattening Factor
    let elevationFactor = 1.0;
    const distFromCenter = Math.max(Math.abs(x), Math.abs(z));
    if (distFromCenter < 125) {
        return 0.0;
    } else if (distFromCenter < 145) {
        elevationFactor = (distFromCenter - 125) / 20.0;
    }

    // Main Avenues & Boulevards
    const nearRoadX = Math.min(Math.abs(x), Math.abs(x - 120), Math.abs(x + 120));
    const nearRoadZ = Math.min(Math.abs(z), Math.abs(z - 120), Math.abs(z + 120));
    if (nearRoadX < 14 || nearRoadZ < 14) return 0.0;
    if (nearRoadX < 24) elevationFactor = Math.min(elevationFactor, (nearRoadX - 14) / 10.0);
    if (nearRoadZ < 24) elevationFactor = Math.min(elevationFactor, (nearRoadZ - 14) / 10.0);

    // Residential Roads
    if (residentialRoadSegments) {
        for (const seg of residentialRoadSegments) {
            const halfW = seg.width / 2 + 3.0;
            const halfL = seg.length / 2 + 3.0;
            const dx = x - seg.x;
            const dz = z - seg.z;
            const cosA = Math.cos(-seg.angle);
            const sinA = Math.sin(-seg.angle);
            const localX = Math.abs(cosA * dx - sinA * dz);
            const localZ = Math.abs(sinA * dx + cosA * dz);
            if (localX < halfW && localZ < halfL) {
                return 0.0;
            }
        }
    }

    // 5. One Uniform Clean Mountain Hill (North-West Highlands)
    let mountainHeight = 0.0;
    const hillCenterX = -260;
    const hillCenterZ = 240;
    const hillRadius = 180;
    const distFromHillCenter = Math.hypot(x - hillCenterX, z - hillCenterZ);
    if (distFromHillCenter < hillRadius) {
        const u = distFromHillCenter / hillRadius;
        const cleanDomeCurve = Math.pow(Math.cos(u * Math.PI * 0.5), 2.0);
        mountainHeight = 44.0 * cleanDomeCurve;

        if (x < -210 && Math.abs(z - 230) < 40) {
            mountainHeight = Math.max(mountainHeight, 14.0);
        }
    }

    // Periphery Mountain Ring Boundary
    const distFromOrigin = Math.hypot(x, z);
    let borderWallHeight = 0;
    if (distFromOrigin > 380) {
        const t = Math.min(1.0, (distFromOrigin - 380) / 100.0);
        borderWallHeight = Math.pow(t, 2) * 55.0;
    }

    return (mountainHeight + borderWallHeight) * elevationFactor;
}

export function getSimpleGround(x, z, buildings = [], residentialRoadSegments = []) {
    return getTerrainHeight(x, z, buildings, residentialRoadSegments);
}

export function createTerrainMesh(scene, buildings = [], residentialRoadSegments = []) {
    const terrainGroup = new THREE.Group();
    waterInstances.length = 0;

    // 1. High-Resolution Ground Elevation Grid
    const segs = 140;
    const size = 960;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vz = pos.getZ(i);
        // Depress terrain slightly under bridges for water channel clearance
        const isBridge = isOverBridge(vx, vz);
        let h = getTerrainHeight(vx, vz, buildings, residentialRoadSegments);
        if (isBridge) {
            h = -2.4; // Terrain under bridge is riverbed
        }
        pos.setY(i, h);
    }
    geo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x3d6e3d,
        roughness: 0.95,
        metalness: 0.05
    });

    const groundMesh = new THREE.Mesh(geo, groundMat);
    groundMesh.receiveShadow = true;
    terrainGroup.add(groundMesh);

    // 2. Realistic Water Surfaces
    const waterMat = new THREE.MeshStandardMaterial({
        color: 0x0984e3,
        roughness: 0.12,
        metalness: 0.85,
        transparent: true,
        opacity: 0.85
    });

    // Lakes
    for (const lake of waterBodies) {
        const waterGeo = new THREE.CircleGeometry(lake.radius, 32);
        waterGeo.rotateX(-Math.PI / 2);
        const waterMesh = new THREE.Mesh(waterGeo, waterMat);
        waterMesh.position.set(lake.x, lake.waterLevel, lake.z);
        waterMesh.receiveShadow = true;
        terrainGroup.add(waterMesh);
        waterInstances.push(waterMesh);
    }

    // Continuous River Water Channel
    for (let i = 0; i < riverSplineSamples.length - 1; i++) {
        const p1 = riverSplineSamples[i];
        const p2 = riverSplineSamples[i + 1];
        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const len = Math.hypot(dx, dz);
        const angle = Math.atan2(dx, dz);

        const rGeo = new THREE.PlaneGeometry(16, len + 0.4);
        rGeo.rotateX(-Math.PI / 2);
        const rMesh = new THREE.Mesh(rGeo, waterMat);
        rMesh.position.set((p1.x + p2.x) / 2, 0.0, (p1.z + p2.z) / 2);
        rMesh.rotation.y = angle;
        rMesh.receiveShadow = true;
        terrainGroup.add(rMesh);
        waterInstances.push(rMesh);
    }

    scene.add(terrainGroup);
    return terrainGroup;
}
