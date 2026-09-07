import * as THREE from 'three';
import { getTerrainHeight, getWaterLevel } from './terrain.js';

export const trees = [];
export const stealthBushes = [];

export function buildVegetation(scene, buildings = [], residentialRoadSegments = []) {
// 7. Dense Low-Poly Forest Ecosystems & Wilderness Biomes
function isValidTreeLocation(x, z) {
    const roadClearMargin = 11.5;
    if (Math.abs(x) < roadClearMargin || Math.abs(z) < roadClearMargin) return false;
    if (Math.abs(x - 120) < roadClearMargin || Math.abs(x + 120) < roadClearMargin) return false;
    if (Math.abs(z - 120) < roadClearMargin || Math.abs(z + 120) < roadClearMargin) return false;

    // Check lake water bodies
    if (getWaterLevel(x, z) > -900 && getTerrainHeight(x, z) < 0.25) {
        return false;
    }

    // Check residential connecting streets and driveways
    for (const seg of residentialRoadSegments) {
        const halfW = seg.width / 2 + 2.5;
        const halfL = seg.length / 2 + 2.5;
        const dx = x - seg.x;
        const dz = z - seg.z;
        const cosA = Math.cos(-seg.angle);
        const sinA = Math.sin(-seg.angle);
        const localX = cosA * dx - sinA * dz;
        const localZ = sinA * dx + cosA * dz;
        if (Math.abs(localX) < halfW && Math.abs(localZ) < halfL) {
            return false;
        }
    }

    for (const b of buildings) {
        const buffer = 3.5;
        if (
            x >= b.x - b.w / 2 - buffer &&
            x <= b.x + b.w / 2 + buffer &&
            z >= b.z - b.d / 2 - buffer &&
            z <= b.z + b.d / 2 + buffer
        ) {
            return false;
        }
    }

    return true;
}

// Low-Poly Hyper-Realistic Coniferous Pine & Fir Tree (Image 5)
function createLowPolyPine(x, z, h = 10.5) {
    if (!isValidTreeLocation(x, z)) return;
    const gy = getTerrainHeight(x, z);

    const group = new THREE.Group();
    group.position.set(x, gy, z);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2717, roughness: 0.94 });
    const pineMats = [
        new THREE.MeshStandardMaterial({ color: 0x1b4332, roughness: 0.82, flatShading: true }),
        new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.82, flatShading: true }),
        new THREE.MeshStandardMaterial({ color: 0x40916c, roughness: 0.82, flatShading: true }),
        new THREE.MeshStandardMaterial({ color: 0x52b788, roughness: 0.82, flatShading: true })
    ];

    const trunkH = h * 0.95;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.46, trunkH, 7), trunkMat);
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    group.add(trunk);

    const numTiers = 5;
    for (let t = 0; t < numTiers; t++) {
        const tierProgress = t / (numTiers - 1);
        const tierY = h * 0.32 + tierProgress * (h * 0.58);
        const tierR = (h * 0.32) * (1.0 - tierProgress * 0.65);
        const tierH = h * 0.28;
        const mat = pineMats[t % pineMats.length];

        const cone = new THREE.Mesh(new THREE.ConeGeometry(tierR, tierH, 7), mat);
        cone.position.y = tierY;
        cone.rotation.y = (t * 0.75);
        cone.castShadow = true;
        group.add(cone);
    }

    obstacles.push({
        x,
        z,
        w: 1.1,
        d: 1.1,
        bottom: gy,
        top: gy + h
    });

    trees.push(group);
    scene.add(group);
    staticRaycastTargets.push(group);
}

// Low-Poly Hyper-Realistic Deciduous Woodland Oak / Birch Tree (Image 4)
function createLowPolyDeciduous(x, z, scale = 1.0) {
    if (!isValidTreeLocation(x, z)) return;
    const gy = getTerrainHeight(x, z);

    const group = new THREE.Group();
    group.position.set(x, gy, z);

    const barkMat = new THREE.MeshStandardMaterial({ color: 0x4a3321, roughness: 0.92 });
    const leafMats = [
        new THREE.MeshStandardMaterial({ color: 0x558b2f, roughness: 0.82, flatShading: true }),
        new THREE.MeshStandardMaterial({ color: 0x689f38, roughness: 0.82, flatShading: true }),
        new THREE.MeshStandardMaterial({ color: 0x33691e, roughness: 0.82, flatShading: true }),
        new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.82, flatShading: true })
    ];

    const trunkH = 4.5 * scale;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.26 * scale, 0.54 * scale, trunkH, 8), barkMat);
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    group.add(trunk);

    for (let b = 0; b < 4; b++) {
        const ang = (b * Math.PI * 2) / 4 + 0.3;
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.11 * scale, 0.20 * scale, 2.6 * scale, 6), barkMat);
        branch.position.set(Math.cos(ang) * 0.7 * scale, trunkH * 0.78, Math.sin(ang) * 0.7 * scale);
        branch.rotation.z = Math.cos(ang) * 0.52;
        branch.rotation.x = Math.sin(ang) * 0.52;
        branch.castShadow = true;
        group.add(branch);

        const cluster = new THREE.Mesh(new THREE.DodecahedronGeometry(1.9 * scale, 1), leafMats[b % leafMats.length]);
        cluster.position.set(Math.cos(ang) * 2.1 * scale, trunkH * 0.92 + 1.2 * scale, Math.sin(ang) * 2.1 * scale);
        cluster.castShadow = true;
        group.add(cluster);
    }

    const topCanopy = new THREE.Mesh(new THREE.IcosahedronGeometry(2.8 * scale, 1), leafMats[1]);
    topCanopy.position.y = trunkH + 2.0 * scale;
    topCanopy.castShadow = true;
    group.add(topCanopy);

    obstacles.push({
        x,
        z,
        w: 1.2 * scale,
        d: 1.2 * scale,
        bottom: gy,
        top: gy + trunkH + 2.8 * scale
    });

    trees.push(group);
    scene.add(group);
    staticRaycastTargets.push(group);
}

// Low-Poly Faceted Granite Boulder (Tactical Combat Cover)
function createLowPolyBoulder(x, z, radius = 1.4) {
    if (!isValidTreeLocation(x, z)) return;
    const gy = getTerrainHeight(x, z);

    const rockMat = new THREE.MeshStandardMaterial({
        color: Math.random() > 0.5 ? 0x57606f : 0x718093,
        roughness: 0.95,
        flatShading: true
    });

    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(radius, 1), rockMat);
    rock.position.set(x, gy + radius * 0.45, z);
    rock.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    rock.scale.set(1.0 + Math.random() * 0.3, 0.75 + Math.random() * 0.3, 1.0 + Math.random() * 0.3);
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);

    obstacles.push({
        x,
        z,
        w: radius * 1.8,
        d: radius * 1.8,
        bottom: gy,
        top: gy + radius * 1.2
    });

    staticRaycastTargets.push(rock);
}

// Plant Stealth Foliage Bushes
function createStealthBush(x, z) {
    if (!isValidTreeLocation(x, z)) return;
    const gy = getTerrainHeight(x, z);

    const group = new THREE.Group();
    group.position.set(x, gy, z);

    const bushMat1 = new THREE.MeshStandardMaterial({ color: 0x1f5425, roughness: 0.9, flatShading: true });
    const bushMat2 = new THREE.MeshStandardMaterial({ color: 0x2b6e32, roughness: 0.9, flatShading: true });

    const cluster1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.9, 1), bushMat1);
    cluster1.position.set(0, 1.1, 0);
    cluster1.castShadow = true;
    group.add(cluster1);

    const cluster2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.5, 1), bushMat2);
    cluster2.position.set(0.7, 0.9, -0.5);
    cluster2.castShadow = true;
    group.add(cluster2);

    const cluster3 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4, 1), bushMat1);
    cluster3.position.set(-0.6, 0.8, 0.5);
    cluster3.castShadow = true;
    group.add(cluster3);

    scene.add(group);
    stealthBushes.push({ x, z, y: gy, radius: 2.3 });
}

// 1. North-West Dense Alpine Pine Forest Biome
for (let i = 0; i < 55; i++) {
    const px = -280 + Math.random() * 150;
    const pz = 130 + Math.random() * 160;
    createLowPolyPine(px, pz, 8.5 + Math.random() * 6.5);
}
for (let i = 0; i < 20; i++) {
    const bx = -270 + Math.random() * 140;
    const bz = 140 + Math.random() * 150;
    createLowPolyBoulder(bx, bz, 1.2 + Math.random() * 1.2);
}

// 2. South-East Sunlit Deciduous Woodland Biome
for (let i = 0; i < 50; i++) {
    const dx = 130 + Math.random() * 160;
    const dz = -280 + Math.random() * 150;
    createLowPolyDeciduous(dx, dz, 0.9 + Math.random() * 0.4);
}
for (let i = 0; i < 18; i++) {
    const rx = 140 + Math.random() * 150;
    const rz = -270 + Math.random() * 140;
    createLowPolyBoulder(rx, rz, 1.0 + Math.random() * 1.0);
}

// 3. Suburban Tree & Stealth Bush Fringes
for (let i = 0; i < 45; i++) {
    const tx = THREE.MathUtils.randFloatSpread(460);
    const tz = THREE.MathUtils.randFloatSpread(460);
    if (i % 2 === 0) {
        createLowPolyPine(tx, tz, 8.0 + Math.random() * 4.0);
    } else {
        createLowPolyDeciduous(tx, tz, 0.85 + Math.random() * 0.3);
    }
}

for (let i = 0; i < 40; i++) {
    const bx = THREE.MathUtils.randFloatSpread(440);
    const bz = THREE.MathUtils.randFloatSpread(440);
    createStealthBush(bx, bz);
}

    return { trees, stealthBushes };
}
