import * as THREE from 'three';
import { DIFFICULTY_LEVELS, setDifficulty, getDifficulty, getWaveEnemyScaling } from '../systems/difficulty.js';
import { SpreadSystem } from '../systems/spread.js';
import { GrenadePhysics } from '../systems/grenades.js';
import { EnemyManager } from '../systems/enemies.js';
import { VehicleManager } from '../systems/vehicles.js';
import { UIManager, WEAPON_CONFIGS } from '../systems/ui.js';
import { soundEngine } from '../systems/audio.js';
import { MultiplayerManager } from '../systems/multiplayer.js';
import { TestModeManager, testModeState } from '../systems/test-mode.js';
import { achievementManager } from '../systems/achievements.js';
import { highScoreManager } from '../systems/highscore.js';

// Pre-Generated World & River Bridges (Zero Z-Fighting)
import { buildBridges, getBridgeElevation, isOverBridge } from '../world/bridges.js';
import { getTerrainHeight, getWaterLevel as getRawWaterLevel, createTerrainMesh, waterBodies, riverWaypoints, waterInstances } from '../world/terrain.js';
import { buildRoadNetwork, makeRoadSpan, makeResidentialRoad, makeDriveway, residentialRoadSegments } from '../world/roads.js';
import { buildMassiveCity, buildings, obstacles } from '../world/buildings.js';
import { buildVegetation, trees, stealthBushes } from '../world/vegetation.js';
import { buildLadders, ladders } from '../world/ladders.js';

if (typeof window !== 'undefined') {
    window.soundEngine = soundEngine;
}

/* =========================================================
   SURVIVAL FPS — EXPANDED 3D CITY ENGINE
   ========================================================= */

// 1. Scene & Camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8bb9d8);
scene.fog = new THREE.Fog(0x8bb9d8, 120, 650);

const camera = new THREE.PerspectiveCamera(
    75,
    innerWidth / innerHeight,
    0.05,
    900
);
camera.rotation.order = "YXZ";
camera.position.set(0, 4, 8);
scene.add(camera);

// 2. Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// 3. Lighting
const hemi = new THREE.HemisphereLight(0xdceeff, 0x304020, 1.8);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.position.set(120, 180, 80);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -260;
sun.shadow.camera.right = 260;
sun.shadow.camera.top = 260;
sun.shadow.camera.bottom = -260;
scene.add(sun);

// 4. World Collections & Materials (obstacles imported from ../world/buildings.js)
const activeGrenades = [];

// High-Performance Object Pools & Static Caching Globals
const staticRaycastTargets = [];
const shootRaycaster = new THREE.Raycaster();
const centerScreenVec = new THREE.Vector2(0, 0);
const targetMap = new Map();

// Pre-created geometries and materials
const defaultBulletGeo = new THREE.SphereGeometry(0.045, 8, 8);
const sniperBulletGeo = new THREE.SphereGeometry(0.09, 8, 8);
const hitFlashGeo = new THREE.SphereGeometry(0.16, 8, 8);
const bulletHoleGeo = new THREE.CircleGeometry(0.08, 8);
const bulletHoleMat = new THREE.MeshBasicMaterial({
    color: 0x1a1a1a,
    side: THREE.DoubleSide,
    depthWrite: false,
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: -1.0,
    polygonOffsetUnits: -4.0
});

// Object Pools Configuration
const BULLET_POOL_SIZE = 128;
const bulletPool = [];
let bulletPoolIndex = 0;

const FLASH_POOL_SIZE = 32;
const flashPool = [];
let flashPoolIndex = 0;

const HOLE_POOL_SIZE = 128;
const holePool = [];
let holePoolIndex = 0;

const groundMat = new THREE.MeshStandardMaterial({ color: 0x47693e, roughness: 1 });
const roadMat = new THREE.MeshStandardMaterial({ color: 0x24282c, roughness: 0.92 });
const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x686e72, roughness: 0.88 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x16181b, roughness: 0.7 });
const slateRoofMat = new THREE.MeshStandardMaterial({ color: 0x2b333d, roughness: 0.8 });
const terracottaRoofMat = new THREE.MeshStandardMaterial({ color: 0x8b3a2b, roughness: 0.85 });
const glassMat = new THREE.MeshStandardMaterial({
    color: 0x3f7894,
    roughness: 0.15,
    metalness: 0.35,
    transparent: true,
    opacity: 0.75
});
const bulletMat = new THREE.MeshBasicMaterial({ color: 0xffff55 });

// 4b. Water Bodies & Terrain Elevation Declarations (Imported from terrain.js)
let ground = null;

// Initialize Pools
function initObjectPools() {
    for (let i = 0; i < BULLET_POOL_SIZE; i++) {
        const mesh = new THREE.Mesh(defaultBulletGeo, bulletMat);
        mesh.name = 'bullet';
        mesh.visible = false;
        mesh.userData.isBullet = true;
        scene.add(mesh);
        bulletPool.push(mesh);
    }

    for (let i = 0; i < FLASH_POOL_SIZE; i++) {
        const mesh = new THREE.Mesh(hitFlashGeo, new THREE.MeshBasicMaterial({ color: 0xff3300 }));
        mesh.name = 'hit-flash';
        mesh.visible = false;
        scene.add(mesh);
        flashPool.push(mesh);
    }

    for (let i = 0; i < HOLE_POOL_SIZE; i++) {
        const mesh = new THREE.Mesh(bulletHoleGeo, bulletHoleMat);
        mesh.name = 'bullet-hole';
        mesh.visible = false;
        scene.add(mesh);
        holePool.push(mesh);
    }
}
initObjectPools();


// =========================================================
// BUILD PRE-GENERATED DETERMINISTIC WORLD & RIVER BRIDGES
// =========================================================
buildBridges(scene, staticRaycastTargets);
buildRoadNetwork(scene, staticRaycastTargets);
buildMassiveCity(scene, staticRaycastTargets);
createTerrainMesh(scene, buildings, residentialRoadSegments);
buildVegetation(scene, buildings, residentialRoadSegments, staticRaycastTargets);
buildLadders(scene, buildings, staticRaycastTargets);

function getWaterLevel(x, z) {
    return getRawWaterLevel(x, z, buildings);
}


// 9. Game Subsystems
const spreadSystem = new SpreadSystem();
const grenadePhysics = new GrenadePhysics();
const enemyManager = new EnemyManager(scene);
const vehicleManager = new VehicleManager(scene);
const multiplayerManager = new MultiplayerManager(scene, camera);

// Expose globals for network manager access
window.enemyManagerGlobal = enemyManager;
window.vehicleManagerGlobal = vehicleManager;
window.damagePlayerLocal = (amount, source) => {
    damagePlayer(amount, source);
};

function handleEnemyDamage(enemy, damage) {
    if (!enemy) return;
    enemy.userData.health -= damage;
    enemy.userData.alertTimer = 15.0;
    if (typeof enemyManager !== 'undefined' && enemyManager && enemyManager.alertEnemiesNear) {
        enemyManager.alertEnemiesNear(enemy.position, 35);
    }

    if (enemy.userData.isBoss) {
        uiManager.updateBossHP(enemy.userData.health, enemy.userData.maxHealth);
    }

    if (enemy.userData.health <= 0) {
        if (enemy.userData.isBoss) {
            kills += 5;
            highScoreManager.recordBossKill();
            achievementManager.recordKill(kills);
            uiManager.hideBossHP(true);
            soundEngine.playBossDefeated();
            if (multiplayerManager?.chatPanel) {
                multiplayerManager.addSystemMessage(`🏆 VICTORY: ${enemy.userData.bossName} DEFEATED! (+5 KILLS)`);
            }
            // Drop 3x High-Tier Medkits
            for (let m = 0; m < 3; m++) {
                const ox = (m - 1) * 1.6;
                const oz = (m === 1 ? 1.0 : -0.6);
                enemyManager.createMedkitMesh(enemy.position.x + ox, enemy.position.y, enemy.position.z + oz);
            }
        } else {
            const diff = getDifficulty();
            if (Math.random() < (diff.medkitDropChance || 0.4)) {
                enemyManager.createMedkitMesh(enemy.position.x, enemy.position.y, enemy.position.z);
            }
            kills++;
            achievementManager.recordKill(kills);
        }

        scene.remove(enemy);
        const idx = enemyManager.enemies.indexOf(enemy);
        if (idx !== -1) {
            enemyManager.enemies.splice(idx, 1);
        }
        uiManager.updateHUD(getHUDState());
    }
}

window.damageEnemyLocal = (enemyId, damage) => {
    const enemy = enemyManager.enemies.find(e => e.userData.id === enemyId);
    if (enemy) {
        soundEngine.playEnemyHit();
        createHitEffect(enemy.position);
        handleEnemyDamage(enemy, damage);
    }
};
window.damageVehicleLocal = (vehicleId, damage) => {
    const car = vehicleManager.vehicles.find(c => c.userData.id === vehicleId);
    if (car) {
        vehicleManager.damageVehicle(car, damage, () => {
            kills += 3;
            achievementManager.unlock('VEHICLE_BUSTER');
            uiManager.updateHUD(getHUDState());
        });
        createHitEffect(car.position, 0xffaa00);
    }
};

// Ground & Slanted Roof Surface Height Calculation
function getSimpleGround(x, z, queryY = null) {
    let highest = getTerrainHeight(x, z);

    let curY = queryY;
    if (curY === null || curY === undefined) {
        if (typeof camera !== 'undefined' && camera && camera.position) {
            curY = camera.position.y - eyeHeight;
        }
    }

    for (const b of buildings) {
        const rot = b.rotY || 0;
        const cosR = Math.cos(-rot);
        const sinR = Math.sin(-rot);
        const dx = x - b.x;
        const dz = z - b.z;
        const localX = cosR * dx - sinR * dz;
        const localZ = sinR * dx + cosR * dz;

        const halfW = (b.w || 14) / 2 + 0.35;
        const halfD = (b.d || 14) / 2 + 0.35;

        if (Math.abs(localX) <= halfW && Math.abs(localZ) <= halfD) {
            let roofFloor = b.h + 0.35;

            if (b.style === 'cottage') {
                const normX = Math.abs(localX) / ((b.w || 13) / 2);
                const normZ = Math.abs(localZ) / ((b.d || 12) / 2);
                const edgeDist = Math.max(normX, normZ);
                const slopeFactor = Math.max(0, 1 - edgeDist);
                roofFloor = b.h + 0.35 + (b.roofHeight || 2.2) * slopeFactor;
            } else if (b.style === 'cabin') {
                const normX = Math.abs(localX) / ((b.w || 14) / 2);
                const slopeFactor = Math.max(0, 1 - normX);
                roofFloor = b.h + 0.35 + (b.roofHeight || 2.4) * slopeFactor;
            } else if (b.style === 'villa') {
                roofFloor = b.h + 0.35;
            }

            if (b.hvac &&
                Math.abs(x - b.hvac.x) <= b.hvac.w / 2 &&
                Math.abs(z - b.hvac.z) <= b.hvac.d / 2) {
                roofFloor = Math.max(roofFloor, b.hvac.top);
            }
            if (b.tower &&
                Math.hypot(x - b.tower.x, z - b.tower.z) <= b.tower.radius) {
                roofFloor = Math.max(roofFloor, b.tower.top);
            }

            // Only consider roof floor if entity's feet are at or above roof level (or within 1.2m of roof)
            // If the entity is on the ground below the building (curY < b.h - 1.2), the roof is high overhead
            // and must NOT pull the entity up into the sky!
            if (curY === null || curY === undefined || curY >= b.h - 1.2) {
                highest = Math.max(highest, roofFloor);
            }
        }
    }
    return highest;
}

// 10. Game State Variables, Ammo, Grenades & Bush Stealth System
let gameStarted = false;
let maxHealth = 125;
let health = 125;
let kills = 0;
let wave = 1;
let yaw = 0;
let pitch = 0;
let velocityY = 0;
let grounded = false;
let onLadder = false;
let ladderAttachCooldown = 0;
let isPlayerHidden = false;
let stealthBreakTimer = 0;
let ladderSoundCooldown = 0;
let mouseHeld = false;
let aiming = false;
let fireCooldown = 0;
let gunRecoil = 0;
const keys = {};

// Ammo & Reload State
let currentWeaponKey = 'AK47';
let currentWeapon = WEAPON_CONFIGS.AK47;
let ammo = 30;
let maxAmmo = 30;
let isReloading = false;
let reloadTimer = 0;
let reloadDuration = 2.1;
let reloadPhase = 0;
let pumpTimer = 0;
let minigunHeat = 0.0;
let minigunSpinSpeed = 0.0;
let minigunRotorAngle = 0.0;
let minigunBarrelMeshes = [];

// Grenade Replenishing System (5s replenish timer, caps at 5)
let grenadeCount = 3;
const maxGrenades = 5;
let grenadeReplenishTimer = 5.0;

const gravity = 25;
const jumpPower = 9;
const STANDING_EYE_HEIGHT = 1.7;
const CROUCH_EYE_HEIGHT = 1.0;
let eyeHeight = STANDING_EYE_HEIGHT;
let isCrouching = false;
const playerRadius = 0.35;
const normalFOV = 75;
let aimFOV = 48;

let waveTimer = 0;
let enemySpawnTimer = 0;
let carSpawnTimer = 18;

// Swimming, Water & Suffocation State
let oxygen = 100;
let wasInWater = false;
let wasHeadSubmerged = false;
let drownDamageTimer = 0;

// Biometric Anatomical Skeleton & Bullet Wound State
let bodyBones = {
    head: false,
    torso: false,
    leftArm: false,
    rightArm: false,
    leftLeg: false,
    rightLeg: false
};
let bulletWounds = {
    head: 0,
    torso: 0,
    leftArm: 0,
    rightArm: 0,
    leftLeg: 0,
    rightLeg: 0
};
let isBleeding = false;
let bleedTimer = 0;

function getHUDState() {
    const waterSurface = getWaterLevel(camera.position.x, camera.position.z);
    const inWater = waterSurface > -900 && (camera.position.y - eyeHeight < waterSurface);
    const isSubmerged = waterSurface > -900 && (camera.position.y < waterSurface);

    const diff = getDifficulty();
    const diffKey = diff ? diff.name : 'NORMAL';
    const score = highScoreManager.calculateScore({ kills, wave, difficultyKey: diffKey });
    const bestRecord = highScoreManager.getHighScore();
    const bestScore = Math.max(bestRecord.score, score);

    return {
        health,
        maxHealth,
        wave,
        kills,
        score,
        bestScore,
        difficulty: diff,
        onLadder,
        isStealth: isPlayerHidden,
        isCrouching,
        ammo,
        maxAmmo,
        isReloading,
        grenadeCount,
        maxGrenades,
        grenadeTimer: grenadeReplenishTimer,
        weapon: currentWeapon,
        minigunHeat,
        oxygen,
        isSubmerged,
        inWater,
        bodyBones,
        bulletWounds,
        isBleeding
    };
}

// 11. PROCEDURAL 3D WEAPON VIEWMODELS
const gunGroup = new THREE.Group();
gunGroup.position.set(0.24, -0.22, -0.48);
gunGroup.rotation.set(-0.02, -0.04, 0.03);
let muzzleFlashLight = new THREE.PointLight(0xffcc33, 0, 14);
gunGroup.add(muzzleFlashLight);
camera.add(gunGroup);

function applyWeaponModel(weaponKey = 'AK47') {
    while (gunGroup.children.length > 0) {
        gunGroup.remove(gunGroup.children[0]);
    }

    muzzleFlashLight = new THREE.PointLight(0xffcc33, 0, 14);
    gunGroup.add(muzzleFlashLight);

    const matReceiver = new THREE.MeshStandardMaterial({ color: 0x22262a, metalness: 0.88, roughness: 0.32 });
    const matSteelDark = new THREE.MeshStandardMaterial({ color: 0x141618, metalness: 0.94, roughness: 0.20 });
    const matSteelSatin = new THREE.MeshStandardMaterial({ color: 0xc4cdd6, metalness: 0.95, roughness: 0.18 });
    const matWood = new THREE.MeshStandardMaterial({ color: 0x5a2d12, roughness: 0.65 });
    const matPolymer = new THREE.MeshStandardMaterial({ color: 0x181a1d, metalness: 0.22, roughness: 0.88 });
    const matGlove = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.94 });

    if (weaponKey === 'SNIPER') {
        // =========================================================
        // SUPREME BARRETT .50 CAL ANTI-MATERIEL HEAVY SNIPER RIFLE
        // =========================================================
        const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.12, 0.68), matReceiver);
        receiver.position.set(0, 0.04, 0.05);
        gunGroup.add(receiver);

        const boltHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.09, 8), matSteelDark);
        boltHandle.name = 'bolt';
        boltHandle.rotation.z = Math.PI / 2;
        boltHandle.position.set(0.07, 0.07, 0.12);
        gunGroup.add(boltHandle);

        const boltKnob = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), matSteelDark);
        boltKnob.name = 'bolt_knob';
        boltKnob.position.set(0.115, 0.07, 0.12);
        gunGroup.add(boltKnob);

        // Long Fluted 29" Match Heavy Barrel
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.026, 1.05, 16), matSteelDark);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.045, -0.78);
        gunGroup.add(barrel);

        // Dual-Baffle Arrowhead Muzzle Brake with 45-deg Gas Deflectors
        const brake = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.052, 0.14), matSteelDark);
        brake.position.set(0, 0.045, -1.36);
        gunGroup.add(brake);

        // Full-Length Straight Monolithic Top Picatinny Rail (MIL-STD-1913)
        const picatinnyRail = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.022, 0.74), matSteelDark);
        picatinnyRail.position.set(0, 0.106, 0.02);
        gunGroup.add(picatinnyRail);

        // Machined Picatinny Cross-Slots
        for (let rz = -0.30; rz <= 0.34; rz += 0.045) {
            const slot = new THREE.Mesh(new THREE.BoxGeometry(0.050, 0.008, 0.018), matReceiver);
            slot.position.set(0, 0.116, rz);
            gunGroup.add(slot);
        }

        // Mounted 8-32x56 Precision Optical Sniper Scope with Sunshade
        const scopeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.44, 16), matSteelDark);
        scopeBody.rotation.x = Math.PI / 2;
        scopeBody.position.set(0, 0.170, 0.02);
        gunGroup.add(scopeBody);

        const scopeObjective = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.024, 0.12, 16), matSteelDark);
        scopeObjective.rotation.x = Math.PI / 2;
        scopeObjective.position.set(0, 0.170, -0.24);
        gunGroup.add(scopeObjective);

        const scopeEyepiece = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.024, 0.08, 16), matSteelDark);
        scopeEyepiece.rotation.x = Math.PI / 2;
        scopeEyepiece.position.set(0, 0.170, 0.28);
        gunGroup.add(scopeEyepiece);

        // Knurled Elevation / Windage Turrets
        const turretTop = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.024, 12), matSteelDark);
        turretTop.position.set(0, 0.205, 0.02);
        gunGroup.add(turretTop);

        const turretSide = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.024, 12), matSteelDark);
        turretSide.rotation.z = Math.PI / 2;
        turretSide.position.set(0.036, 0.170, 0.02);
        gunGroup.add(turretSide);

        // Hex Mounting Rings Clamped Directly onto Picatinny Rail
        for (const z of [-0.10, 0.14]) {
            const ring = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.065, 0.032), matReceiver);
            ring.position.set(0, 0.145, z);
            gunGroup.add(ring);
        }

        // Heavy Folded Steel Bipod
        for (const side of [-1, 1]) {
            const bipodLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.30, 8), matSteelDark);
            bipodLeg.rotation.x = Math.PI / 2 - 0.15;
            bipodLeg.rotation.z = side * 0.2;
            bipodLeg.position.set(side * 0.055, -0.04, -0.60);
            gunGroup.add(bipodLeg);
        }

        // Heavy Steel .50 BMG 10-Round Box Magazine
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.26, 0.16), matSteelDark);
        mag.name = 'magazine';
        mag.position.set(0, -0.14, -0.04);
        gunGroup.add(mag);

        // Skeletonized Sniper Stock with Adjustable Cheek Riser
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.074, 0.18, 0.38), matReceiver);
        stock.position.set(0, 0.02, 0.50);
        gunGroup.add(stock);

        const cheekPad = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.045, 0.18), matPolymer);
        cheekPad.position.set(0, 0.125, 0.44);
        gunGroup.add(cheekPad);

        muzzleFlashLight.position.set(0, 0.045, -1.42);

    } else if (weaponKey === 'SHOTGUN') {
        // =========================================================
        // M590 HYPER-REALISTIC DETAILED PUMP-ACTION SHOTGUN
        // =========================================================
        // 1. Receiver
        const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.10, 0.46), matReceiver);
        receiver.position.set(0, 0.02, 0.02);
        gunGroup.add(receiver);

        // Ejection Port on Right Side
        const ejectionPort = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.038, 0.14), matSteelDark);
        ejectionPort.position.set(0.036, 0.035, -0.04);
        gunGroup.add(ejectionPort);

        // 2. Main 12-Gauge Steel Barrel
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.72, 12), matSteelDark);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.054, -0.48);
        gunGroup.add(barrel);

        // Picatinny Rail on top of Receiver
        const picatinnyBase = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.016, 0.32), matReceiver);
        picatinnyBase.position.set(0, 0.078, 0.02);
        gunGroup.add(picatinnyBase);

        // Machined cross slots for the rail
        for (let rz = -0.12; rz <= 0.16; rz += 0.04) {
            const slot = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.008, 0.018), matSteelDark);
            slot.position.set(0, 0.086, rz);
            gunGroup.add(slot);
        }

        // Tactical Rear Orientation Sights (Ghost Ring Sight on Picatinny)
        const rearSightBlock = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.028, 0.02), matSteelDark);
        rearSightBlock.position.set(0, 0.098, 0.12);
        gunGroup.add(rearSightBlock);

        // Green fiber-optic dots on rear sight block for visual alignment reference
        const greenMat = new THREE.MeshBasicMaterial({ color: 0x33ff33 });
        for (const side of [-1, 1]) {
            const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.008, 6), greenMat);
            dot.rotation.x = Math.PI / 2;
            dot.position.set(side * 0.012, 0.106, 0.12);
            gunGroup.add(dot);
        }

        // Raised Ventilated Rib on top of the barrel
        const ventRib = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.72), matSteelDark);
        ventRib.position.set(0, 0.078, -0.48);
        gunGroup.add(ventRib);

        // Vertical support posts for the ventilated rib
        for (let rz = -0.80; rz <= -0.16; rz += 0.16) {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.012, 0.016), matSteelDark);
            post.position.set(0, 0.068, rz);
            gunGroup.add(post);
        }

        // Red fiber-optic front post sight (instead of just brass bead)
        const frontSightBase = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.024, 0.02), matSteelDark);
        frontSightBase.position.set(0, 0.09, -0.80);
        gunGroup.add(frontSightBase);

        const redMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
        const fiberOpticRod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.024, 6), redMat);
        fiberOpticRod.rotation.x = Math.PI / 2;
        fiberOpticRod.position.set(0, 0.102, -0.80);
        gunGroup.add(fiberOpticRod);

        // 3. Under-barrel Magazine Tube
        const magTube = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.58, 12), matSteelDark);
        magTube.rotation.x = Math.PI / 2;
        magTube.position.set(0, 0.022, -0.41);
        gunGroup.add(magTube);

        // Double-ring Barrel Clamp
        const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.046, 0.042), matReceiver);
        clamp.position.set(0, 0.038, -0.66);
        gunGroup.add(clamp);

        // 4. Wood Pump Forearm (Ribbed)
        const pumpForearm = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.054, 0.26), matWood);
        pumpForearm.name = 'forearm';
        pumpForearm.position.set(0, 0.018, -0.32);
        gunGroup.add(pumpForearm);

        // Ribbed grooves on forearm for realistic texture
        for (let gz = -0.42; gz <= -0.22; gz += 0.04) {
            const groove = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.058, 0.012), matWood);
            groove.name = 'forearm_groove';
            groove.position.set(0, 0.018, gz);
            gunGroup.add(groove);
        }

        // Metal pump slide rails
        for (const side of [-1, 1]) {
            const rail = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.012, 0.16), matSteelSatin);
            rail.name = 'forearm_rail';
            rail.position.set(side * 0.028, 0.012, -0.16);
            gunGroup.add(rail);
        }

        // 5. Classic Curved Wooden Buttstock
        const stockAdapter = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.065, 0.14), matWood);
        stockAdapter.position.set(0, 0.01, 0.22);
        stockAdapter.rotation.x = -0.06;
        gunGroup.add(stockAdapter);

        const stockButt = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.28), matWood);
        stockButt.position.set(0, -0.055, 0.38);
        stockButt.rotation.x = -0.13;
        gunGroup.add(stockButt);

        // Soft recoil pad
        const recoilPad = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.142, 0.025), matPolymer);
        recoilPad.position.set(0, -0.055, 0.52);
        recoilPad.rotation.x = -0.13;
        gunGroup.add(recoilPad);

        // 6. Trigger Guard & Trigger
        const triggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.042, 0.09), matSteelDark);
        triggerGuard.position.set(0, -0.045, 0.06);
        gunGroup.add(triggerGuard);

        const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.022, 0.016), matSteelSatin);
        trigger.position.set(0, -0.045, 0.06);
        trigger.rotation.x = -0.25;
        gunGroup.add(trigger);

        // 7. Red Shotgun Shell for reload animation
        const matShellRed = new THREE.MeshStandardMaterial({ color: 0xcc1111, roughness: 0.5 });
        const matShellBrass = new THREE.MeshStandardMaterial({ color: 0xccaa33, metalness: 0.8, roughness: 0.2 });

        const shellGroup = new THREE.Group();
        shellGroup.name = 'shell';

        const shellBody = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.045, 8), matShellRed);
        shellBody.rotation.x = Math.PI / 2;
        shellGroup.add(shellBody);

        const shellBase = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.010, 8), matShellBrass);
        shellBase.rotation.x = Math.PI / 2;
        shellBase.position.z = 0.025;
        shellGroup.add(shellBase);

        // Hide it by default
        shellGroup.position.set(0.0, -0.15, 0.0);
        shellGroup.visible = false;
        gunGroup.add(shellGroup);

        muzzleFlashLight.position.set(0, 0.054, -0.85);

    } else if (weaponKey !== 'MINIGUN') {
        // =========================================================
        // AK-47 SOVIET TACTICAL ASSAULT RIFLE
        // =========================================================
        const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.096, 0.44), matSteelDark);
        receiver.position.set(0, 0.02, 0.02);
        gunGroup.add(receiver);

        // Leveled Stamped Steel Top Dust Cover
        const dustCover = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.048, 0.44), matSteelDark);
        dustCover.position.set(0, 0.076, 0.02);
        gunGroup.add(dustCover);

        // Full-Length Picatinny Rail
        const picatinnyBase = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.016, 0.50), matReceiver);
        picatinnyBase.position.set(0, 0.104, -0.02);
        gunGroup.add(picatinnyBase);

        // Machined Rail Cross-Slots
        for (let rz = -0.24; rz <= 0.18; rz += 0.04) {
            const slot = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.008, 0.018), matSteelDark);
            slot.position.set(0, 0.112, rz);
            gunGroup.add(slot);
        }

        // Curved 30-Round Banana Magazine
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.30, 0.12), matSteelDark);
        mag.name = 'magazine';
        mag.position.set(0, -0.17, -0.08);
        mag.rotation.x = 0.32;
        gunGroup.add(mag);

        // Charging Handle (Bolt)
        const boltHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.04, 8), matSteelDark);
        boltHandle.name = 'bolt';
        boltHandle.rotation.z = Math.PI / 2;
        boltHandle.position.set(0.042, 0.045, -0.08);
        gunGroup.add(boltHandle);

        // Gas Tube & Wooden Handguard
        const handguardBottom = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.058, 0.28), matWood);
        handguardBottom.position.set(0, -0.005, -0.34);
        gunGroup.add(handguardBottom);

        const handguardTop = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.042, 0.26), matWood);
        handguardTop.position.set(0, 0.042, -0.34);
        gunGroup.add(handguardTop);

        // Chrome-Lined Barrel & Slant Muzzle Brake
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.60, 12), matSteelDark);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.026, -0.66);
        gunGroup.add(barrel);

        const muzzleSlant = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.06, 10), matSteelDark);
        muzzleSlant.rotation.x = Math.PI / 2;
        muzzleSlant.rotation.z = -0.3;
        muzzleSlant.position.set(0, 0.026, -0.98);
        gunGroup.add(muzzleSlant);

        // Hooded Front Sight Post
        const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.075, 0.035), matSteelDark);
        frontSight.position.set(0, 0.075, -0.88);
        gunGroup.add(frontSight);

        // Low-Profile Notch Rear Sight
        const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.032, 0.045), matSteelDark);
        rearSight.position.set(0, 0.122, 0.18);
        gunGroup.add(rearSight);

        // Classic Wooden Buttstock
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.15, 0.35), matWood);
        stock.position.set(0, -0.015, 0.40);
        stock.rotation.x = 0.05;
        gunGroup.add(stock);

        // Wooden / Bakelite Pistol Grip
        const pistolGrip = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.16, 0.075), matWood);
        pistolGrip.position.set(0, -0.12, 0.13);
        pistolGrip.rotation.x = -0.42;
        gunGroup.add(pistolGrip);

        muzzleFlashLight.position.set(0, 0.026, -1.02);
    } else {
        // =========================================================
        // M134 VULCAN 6-BARREL ROTARY MINIGUN (MATCHING REFERENCE IMAGE)
        // =========================================================
        const matReceiverDark = new THREE.MeshStandardMaterial({ color: 0x181a1d, metalness: 0.90, roughness: 0.35 });
        const matBarrelSteel = new THREE.MeshStandardMaterial({ color: 0x101214, metalness: 0.95, roughness: 0.20 });
        const matAmmoDrum = new THREE.MeshStandardMaterial({ color: 0x475549, metalness: 0.40, roughness: 0.65 });
        const matDrumCap = new THREE.MeshStandardMaterial({ color: 0x242826, metalness: 0.85, roughness: 0.40 });
        const matClampRing = new THREE.MeshStandardMaterial({ color: 0x141618, metalness: 0.95, roughness: 0.15 });
        const matDriveMotor = new THREE.MeshStandardMaterial({ color: 0x2a2e34, metalness: 0.80, roughness: 0.45 });

        // 1. Heavy Rectangular Receiver Body
        const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.42), matReceiverDark);
        receiver.position.set(0, 0.02, 0.04);
        gunGroup.add(receiver);

        // Electric Drive Motor on top of receiver
        const driveMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.24, 16), matDriveMotor);
        driveMotor.rotation.x = Math.PI / 2;
        driveMotor.position.set(0, 0.11, 0.02);
        gunGroup.add(driveMotor);

        // Top Carrying Handle (Heavy arch bracket)
        const handleLeftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.08, 0.022), matReceiverDark);
        handleLeftLeg.position.set(0, 0.16, -0.06);
        gunGroup.add(handleLeftLeg);

        const handleRightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.08, 0.022), matReceiverDark);
        handleRightLeg.position.set(0, 0.16, 0.06);
        gunGroup.add(handleRightLeg);

        const handleBar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.15, 12), matPolymer);
        handleBar.rotation.x = Math.PI / 2;
        handleBar.position.set(0, 0.20, 0);
        gunGroup.add(handleBar);

        // Rear Spade Grip / Pistol Trigger Block
        const spadeMount = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.06, 0.09), matReceiverDark);
        spadeMount.position.set(0, 0.02, 0.28);
        gunGroup.add(spadeMount);

        const spadeGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.16, 12), matPolymer);
        spadeGrip.position.set(0, -0.05, 0.32);
        spadeGrip.rotation.x = -0.3;
        gunGroup.add(spadeGrip);

        // Olive-drab Cylindrical Ammunition Feed Canister / Drum (mounted lower left/rear)
        const ammoDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.16, 24), matAmmoDrum);
        ammoDrum.rotation.z = Math.PI / 2;
        ammoDrum.position.set(-0.11, -0.10, 0.05);
        gunGroup.add(ammoDrum);

        const drumCap1 = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.02, 24), matDrumCap);
        drumCap1.rotation.z = Math.PI / 2;
        drumCap1.position.set(-0.19, -0.10, 0.05);
        gunGroup.add(drumCap1);

        const drumCap2 = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.02, 24), matDrumCap);
        drumCap2.rotation.z = Math.PI / 2;
        drumCap2.position.set(-0.03, -0.10, 0.05);
        gunGroup.add(drumCap2);

        // Ammo Chute / Flex Feed Bracket to Receiver
        const ammoChute = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.10), matReceiverDark);
        ammoChute.position.set(-0.07, -0.02, 0.05);
        gunGroup.add(ammoChute);

        // Rotor Central Axle Hub (Enlarged)
        const rotorRotor = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.14, 16), matSteelDark);
        rotorRotor.rotation.x = Math.PI / 2;
        rotorRotor.position.set(0, 0.02, -0.22);
        gunGroup.add(rotorRotor);

        // =========================================================
        // ROTATING 6-BARREL GATLING ASSEMBLY (Enlarged Heavy Rotor)
        // =========================================================
        const minigunRotorGroup = new THREE.Group();
        minigunRotorGroup.name = 'minigunRotor';
        minigunRotorGroup.position.set(0, 0.02, -0.22);

        const numBarrels = 6;
        const barrelRadius = 0.076; // Expanded heavy rotary radius
        const barrelLength = 0.85;  // Extended barrel length
        minigunBarrelMeshes = [];

        for (let b = 0; b < numBarrels; b++) {
            const angle = (b / numBarrels) * Math.PI * 2;
            const bx = Math.cos(angle) * barrelRadius;
            const by = Math.sin(angle) * barrelRadius;

            // Individual Heavy Barrel Tube (Enlarged 0.019 radius)
            const bMesh = new THREE.Mesh(
                new THREE.CylinderGeometry(0.019, 0.019, barrelLength, 12),
                matBarrelSteel.clone()
            );
            bMesh.rotation.x = Math.PI / 2;
            bMesh.position.set(bx, by, -barrelLength / 2);
            minigunRotorGroup.add(bMesh);
            minigunBarrelMeshes.push(bMesh);
        }

        // Barrel Retaining Rings / Support Collars (3 rings along the length)
        for (const rz of [-0.22, -0.48, -0.74]) {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(barrelRadius, 0.016, 8, 24), matClampRing);
            ring.position.set(0, 0, rz);
            minigunRotorGroup.add(ring);
        }

        // Front Slotted Heavy Muzzle Shroud / Flash Suppressor Cage
        const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.098, 0.098, 0.14, 16, 1, true), matClampRing);
        cage.rotation.x = Math.PI / 2;
        cage.position.set(0, 0, -barrelLength - 0.04);
        minigunRotorGroup.add(cage);

        gunGroup.add(minigunRotorGroup);

        muzzleFlashLight.position.set(0, 0.02, -1.16);
    }

    // Operator Gloved Hands
    const handRight = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), matGlove);
    handRight.name = 'handRight';
    if (weaponKey === 'MINIGUN') {
        handRight.position.set(0, -0.05, 0.32);
    } else {
        handRight.position.set(0, -0.12, 0.11);
    }
    gunGroup.add(handRight);

    const handLeft = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), matGlove);
    handLeft.name = 'handLeft';
    if (weaponKey === 'SNIPER') {
        handLeft.position.set(-0.05, 0.0, -0.33);
    } else if (weaponKey === 'SHOTGUN') {
        handLeft.position.set(0.0, 0.01, -0.32); // Holds the forearm pump directly!
    } else if (weaponKey === 'MINIGUN') {
        handLeft.position.set(0, 0.20, 0); // Holds top carry handle bar!
    } else {
        handLeft.position.set(-0.05, 0.0, -0.33);
    }
    gunGroup.add(handLeft);
}

function switchPlayerWeapon(weaponKey) {
    if (!WEAPON_CONFIGS[weaponKey]) return;
    if (weaponKey === 'MINIGUN') {
        const isUnlocked = typeof localStorage !== 'undefined' && localStorage.getItem('urban_breach_minigun_unlocked') === 'true';
        if (!isUnlocked && !testModeState.godMode) {
            if (typeof uiManager !== 'undefined' && uiManager && typeof uiManager.addChatMessage === 'function') {
                uiManager.addChatMessage('HQ', '⚠️ M134 Minigun is LOCKED! Survive Wave 50 to unlock.');
            }
            return;
        }
    }
    soundEngine.stopRifleBurst();
    if (typeof soundEngine.stopMinigunBurst === 'function') {
        soundEngine.stopMinigunBurst();
    }
    currentWeaponKey = weaponKey;
    currentWeapon = WEAPON_CONFIGS[weaponKey];
    ammo = currentWeapon.ammo;
    maxAmmo = currentWeapon.maxAmmo;
    aimFOV = currentWeapon.aimFOV || 48;
    isReloading = false;
    reloadTimer = 0;
    minigunHeat = 0.0;
    spreadSystem.setWeaponConfig(currentWeapon.spread);
    applyWeaponModel(weaponKey);
    uiManager.updateHUD(getHUDState());
}
window.switchPlayerWeapon = switchPlayerWeapon;

// Listen for achievement and arsenal progress resets
window.addEventListener('urban_breach_progress_reset', () => {
    uiManager.lockMinigunUI();
    if (currentWeapon && currentWeapon.id === 'MINIGUN') {
        switchPlayerWeapon('AK47');
    }
    soundEngine.stopRifleBurst();
    if (typeof soundEngine.stopMinigunBurst === 'function') {
        soundEngine.stopMinigunBurst();
    }
    minigunHeat = 0.0;
    endlessPlayOn = false;
    gameWon = false;
    if (typeof uiManager !== 'undefined' && uiManager && typeof uiManager.addChatMessage === 'function') {
        uiManager.addChatMessage('HQ', '🔄 Achievement milestones and M134 Minigun have been reset!');
    }
});

applyWeaponModel('AK47');

// 12. UI Manager Initializer
const uiManager = new UIManager({
    onStartGame: (selectedDifficulty, selectedWeaponKey) => {
        soundEngine.init();
        soundEngine.resume();

        maxHealth = selectedDifficulty.playerHealth;
        health = maxHealth;
        kills = 0;
        wave = 1;
        highScoreManager.resetRun();

        currentWeaponKey = selectedWeaponKey || 'AK47';
        currentWeapon = WEAPON_CONFIGS[currentWeaponKey] || WEAPON_CONFIGS.AK47;

        ammo = currentWeapon.ammo;
        maxAmmo = currentWeapon.maxAmmo;
        reloadDuration = currentWeapon.reloadTime;
        aimFOV = currentWeapon.aimFOV || 48;

        spreadSystem.setWeaponConfig(currentWeapon.spread);
        applyWeaponModel(currentWeaponKey);

        isReloading = false;
        grenadeCount = 3;
        grenadeReplenishTimer = 5.0;
        isPlayerHidden = false;
        stealthBreakTimer = 0;
        gameStarted = true;

        if (multiplayerManager.isMultiplayer && !multiplayerManager.isHost) {
            // Clients spawn close (5-9 meters offset) but not on top of the host
            const spawnX = (Math.random() > 0.5 ? 1 : -1) * (5.0 + Math.random() * 4.0);
            const spawnZ = 20.0 + (Math.random() - 0.5) * 4.0;
            camera.position.set(spawnX, eyeHeight, spawnZ);
        } else {
            camera.position.set(0, eyeHeight, 20);
        }
        camera.fov = normalFOV;
        camera.updateProjectionMatrix();

        document.body.requestPointerLock();

        if (multiplayerManager.isMultiplayer && multiplayerManager.isHost) {
            multiplayerManager.sendGameStartSync(uiManager.selectedDifficultyKey);
        }

        if (!multiplayerManager.isMultiplayer || multiplayerManager.isHost) {
            spawnWave(selectedDifficulty);
        }
        uiManager.updateHUD(getHUDState());
        soundEngine.playGameMusic();
    },
    onRestart: () => {
        location.reload();
    },
    onPlayOn: () => {
        endlessPlayOn = true;
        gameWon = false;
        try {
            renderer.domElement.requestPointerLock();
        } catch (e) {}
        uiManager.showToast('🔥 ENDLESS COMBAT ENGAGED — BEYOND WAVE 50!');
        if (soundEngine && typeof soundEngine.playLevelUp === 'function') {
            soundEngine.playLevelUp();
        }
        const diff = getDifficulty();
        spawnWave(diff);
        uiManager.updateHUD(getHUDState());
    }
});
window.uiManager = uiManager;
achievementManager.setSoundEngine(soundEngine);

// 12.5. Secret Test Mode Controller Initializer
const testModeManager = new TestModeManager({
    getGameState: () => ({
        wave: typeof wave !== 'undefined' ? wave : 1,
        difficultyName: typeof getDifficulty === 'function' ? getDifficulty().name : 'SURVIVOR',
        aliveEnemies: typeof enemyManager !== 'undefined' && enemyManager ? enemyManager.enemies.length : 0,
        aliveBosses: typeof enemyManager !== 'undefined' && enemyManager ? enemyManager.enemies.filter(e => e.userData && e.userData.isBoss).length : 0,
        aliveCars: typeof vehicleManager !== 'undefined' && vehicleManager ? vehicleManager.vehicles.length : 0,
        health: typeof health !== 'undefined' ? health : 100,
        maxHealth: typeof maxHealth !== 'undefined' ? maxHealth : 100,
        playerPos: camera.position
    }),
    setWave: (targetWave) => {
        wave = Math.max(1, targetWave);
        waveTimer = 0;
        enemySpawnTimer = 0;
        gameWon = false;
        if (targetWave < 50) {
            endlessPlayOn = false;
        }
        checkWaveMilestones();
        if (!gameWon) {
            const diff = getDifficulty();
            spawnWave(diff);
            uiManager.updateHUD(getHUDState());
        }
        if (multiplayerManager?.addSystemMessage) {
            multiplayerManager.addSystemMessage(`⚡ TEST MODE: JUMPED TO WAVE ${wave}`);
        }
    },
    spawnWaveNow: () => {
        spawnWave(getDifficulty());
        uiManager.updateHUD(getHUDState());
    },
    clearAllEnemies: () => {
        if (typeof enemyManager !== 'undefined' && enemyManager) {
            for (const e of enemyManager.enemies) {
                scene.remove(e);
            }
            enemyManager.enemies = [];
            uiManager.hideBossHP();
        }
        if (typeof vehicleManager !== 'undefined' && vehicleManager) {
            for (const v of vehicleManager.vehicles) {
                scene.remove(v);
            }
            vehicleManager.vehicles = [];
        }
        uiManager.updateHUD(getHUDState());
    },
    setWaveTimerFrozen: (isFrozen) => {
        testModeState.freezeWaveTimer = isFrozen;
    },
    spawnEnemy: (archetype, count = 1, location = 'front') => {
        const diff = getDifficulty();
        const scaling = getWaveEnemyScaling(wave, diff);
        for (let i = 0; i < count; i++) {
            let spawnPos = camera.position.clone();
            if (location === 'front') {
                const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
                spawnPos.add(forward.multiplyScalar(10 + Math.random() * 4));
            } else if (location === 'around') {
                const angle = Math.random() * Math.PI * 2;
                spawnPos.x += Math.sin(angle) * (20 + Math.random() * 8);
                spawnPos.z += Math.cos(angle) * (20 + Math.random() * 8);
            }

            const enemy = enemyManager.spawnEnemy(
                location === 'random' ? camera.position : spawnPos,
                archetype === 'knife' ? 'knife' : 'gunner',
                diff,
                getSimpleGround,
                scaling
            );
            if (location !== 'random') {
                enemy.position.x = spawnPos.x;
                enemy.position.z = spawnPos.z;
                enemy.position.y = getSimpleGround(spawnPos.x, spawnPos.z);
            }
            if (testModeState.enemyHealthMult !== 1.0) {
                enemy.userData.health = Math.max(1, Math.round(enemy.userData.health * testModeState.enemyHealthMult));
                enemy.userData.maxHealth = enemy.userData.health;
            }
        }
    },
    spawnBoss: (tier = 1, location = 'front') => {
        const diff = getDifficulty();
        const scaling = getWaveEnemyScaling(wave, diff);
        const customScaling = { ...scaling, bossLevel: tier, bossMultiplier: Math.pow(1.5, tier - 1) };
        const boss = enemyManager.spawnBossGunner(
            camera.position,
            diff,
            getSimpleGround,
            wave,
            customScaling
        );
        if (location === 'front') {
            const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
            boss.position.copy(camera.position).add(forward.multiplyScalar(15));
            boss.position.y = getSimpleGround(boss.position.x, boss.position.z);
        }
        if (testModeState.enemyHealthMult !== 1.0) {
            boss.userData.health = Math.max(1, Math.round(boss.userData.health * testModeState.enemyHealthMult));
            boss.userData.maxHealth = boss.userData.health;
        }
        uiManager.showBossHP(boss.userData.bossName, boss.userData.health, boss.userData.maxHealth, wave);
        soundEngine.playBossAlarm();
    },
    spawnVehicle: (count = 1) => {
        const diff = getDifficulty();
        for (let i = 0; i < count; i++) {
            vehicleManager.spawnVehicle(camera.position, diff, getSimpleGround);
        }
    },
    applyModifiers: (mods) => {
        if (typeof enemyManager !== 'undefined' && enemyManager) {
            for (const enemy of enemyManager.enemies) {
                if (mods.enemyHealthMult && mods.enemyHealthMult !== 1.0) {
                    enemy.userData.health = Math.max(1, Math.round(enemy.userData.health * mods.enemyHealthMult));
                }
            }
        }
    },
    alertAllEnemies: () => {
        if (typeof enemyManager !== 'undefined' && enemyManager) {
            for (const enemy of enemyManager.enemies) {
                enemy.userData.alertTimer = 9999;
            }
        }
    },
    setGodMode: (val) => {
        testModeState.godMode = val;
        if (val) {
            health = maxHealth;
            uiManager.updateHUD(getHUDState());
        }
    },
    setInfiniteAmmo: (val) => {
        testModeState.infiniteAmmo = val;
        if (val) {
            ammo = maxAmmo;
            uiManager.updateHUD(getHUDState());
        }
    },
    setSuperSpeed: (val) => {
        testModeState.superSpeed = val;
    },
    setSuperJump: (val) => {
        testModeState.superJump = val;
    },
    healPlayer: () => {
        health = maxHealth;
        isBleeding = false;
        bodyBones.head = false;
        bodyBones.torso = false;
        bodyBones.leftArm = false;
        bodyBones.rightArm = false;
        bodyBones.leftLeg = false;
        bodyBones.rightLeg = false;
        bulletWounds = { head: 0, torso: 0, leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0 };
        uiManager.updateHUD(getHUDState());
        soundEngine.playMedkitUse();
    },
    refillGrenades: () => {
        grenadeCount = 5;
        uiManager.updateHUD(getHUDState());
    },
    switchWeapon: (weaponKey) => {
        switchPlayerWeapon(weaponKey);
    },
    teleport: (destination) => {
        if (destination === 'origin') {
            camera.position.set(0, 4, 20);
        } else if (destination === 'roof') {
            camera.position.set(0, 32, 0);
        } else if (destination === 'bridge') {
            camera.position.set(0, 4, -40);
        }
        velocityY = 0;
    }
});
window.testModeManager = testModeManager;

// Configure multiplayer callbacks on uiManager and multiplayerManager
uiManager.onHostLobby = (nickname, gameMode) => {
    multiplayerManager.initHost(nickname, gameMode, (code) => {
        const displayEl = document.getElementById('lobby-code-display');
        if (displayEl) {
            displayEl.style.display = 'block';
            displayEl.textContent = `CODE: ${code}`;
        }
        const statusEl = document.getElementById('lobby-status-subtitle');
        if (statusEl) {
            statusEl.textContent = `HOST ONLINE (CODE: ${code})`;
            statusEl.style.color = '#10b981'; // Green
        }
    });
};

uiManager.onJoinLobby = (code, nickname) => {
    const statusEl = document.getElementById('lobby-status-subtitle');
    if (statusEl) {
        statusEl.textContent = 'CONNECTING TO PEER HOST...';
        statusEl.style.color = '#8faec4';
    }
    multiplayerManager.initClient(code, nickname, () => {
        if (statusEl) {
            statusEl.textContent = `JOINED ROOM SUCCESSFULLY (CODE: ${code.toUpperCase()})`;
            statusEl.style.color = '#10b981'; // Green
        }
        const displayEl = document.getElementById('lobby-code-display');
        if (displayEl) {
            displayEl.style.display = 'block';
            displayEl.textContent = `CODE: ${code.toUpperCase()}`;
        }
    }, (err) => {
        if (statusEl) {
            statusEl.textContent = `CONNECTION FAILED: ${err}`;
            statusEl.style.color = '#ef4444'; // Red
        }
        alert(`Failed to connect: ${err}`);
        
        const hostBtn = document.getElementById('btn-host-lobby');
        if (hostBtn) hostBtn.style.display = 'inline-block';
        const block = document.getElementById('mode-settings-block');
        if (block) block.style.display = 'flex';
    });
};

uiManager.onHostLobbyManual = (nickname, gameMode, pc, dataChannel) => {
    uiManager.lobbySelectScreen.style.display = 'none';
    uiManager.lobbyScreen.style.display = 'flex';
    uiManager.isMultiplayerMode = true;
    uiManager.isHost = true;

    document.getElementById('btn-lobby-launch').style.display = 'inline-block';
    document.getElementById('mode-settings-block').style.display = 'none';
    document.getElementById('btn-host-lobby').style.display = 'none';

    const statusEl = document.getElementById('lobby-status-subtitle');
    if (statusEl) {
        statusEl.textContent = 'SCHOOL MODE ACTIVE (SERVERLESS HOST)';
        statusEl.style.color = '#00e5ff';
    }
    const displayEl = document.getElementById('lobby-code-display');
    if (displayEl) {
        displayEl.style.display = 'block';
        displayEl.textContent = 'ROOM: SCHOOL';
    }

    multiplayerManager.initManualHost(nickname, gameMode, pc, dataChannel);
};

uiManager.onJoinLobbyManual = (nickname, pc, dataChannel) => {
    uiManager.lobbySelectScreen.style.display = 'none';
    uiManager.lobbyScreen.style.display = 'flex';
    uiManager.isMultiplayerMode = true;
    uiManager.isHost = false;
    uiManager.isClientConnected = true;

    document.getElementById('btn-lobby-launch').style.display = 'none';
    document.getElementById('mode-settings-block').style.display = 'none';
    document.getElementById('btn-host-lobby').style.display = 'none';

    const statusEl = document.getElementById('lobby-status-subtitle');
    if (statusEl) {
        statusEl.textContent = 'SCHOOL MODE ACTIVE (SERVERLESS CLIENT)';
        statusEl.style.color = '#00e5ff';
    }
    const displayEl = document.getElementById('lobby-code-display');
    if (displayEl) {
        displayEl.style.display = 'block';
        displayEl.textContent = 'ROOM: SCHOOL';
    }

    multiplayerManager.initManualClient(nickname, pc, dataChannel);
};


uiManager.onLobbyUpdate = (playersList, gameMode) => {
    const listEl = document.getElementById('lobby-roster-list');
    if (listEl) {
        listEl.innerHTML = playersList.map(p => {
            const statusText = p.isHost ? 'HOST' : (p.isReady ? 'READY' : 'JOINED');
            const statusClass = p.isHost ? 'status-host' : 'status-ready';
            return `
                <div class="lobby-player-item">
                    <span class="lobby-player-name">${p.nickname}</span>
                    <span class="lobby-player-status ${statusClass}">${statusText}</span>
                </div>
            `;
        }).join('');
    }

    const btnModePve = document.getElementById('btn-mode-pve');
    const btnModeFfa = document.getElementById('btn-mode-ffa');
    if (btnModePve && btnModeFfa) {
        if (gameMode === 'pve') {
            btnModePve.classList.add('selected');
            btnModeFfa.classList.remove('selected');
        } else {
            btnModeFfa.classList.add('selected');
            btnModePve.classList.remove('selected');
        }
    }
};

uiManager.onGameModeSelect = (gameMode) => {
    if (multiplayerManager.isMultiplayer) {
        multiplayerManager.gameMode = gameMode;
        if (multiplayerManager.isHost) {
            multiplayerManager.broadcastLobbyInfo();
        }
    }
};

uiManager.onLeaveLobby = () => {
    multiplayerManager.shutdown();
    const statusEl = document.getElementById('lobby-status-subtitle');
    if (statusEl) {
        statusEl.textContent = 'DEPLOY WITH YOUR SQUAD (MAX 5 PLAYERS)';
        statusEl.style.color = '#8faec4';
    }
};

uiManager.onLobbyLaunch = () => {
    multiplayerManager.sendLobbyNext();
    uiManager.lobbyScreen.style.display = 'none';
    uiManager.difficultyScreen.style.display = 'flex';
    uiManager.setMultiplayerRole(true);
};

uiManager.onDifficultySelect = (difficultyKey) => {
    multiplayerManager.sendDifficultySync(difficultyKey);
};

uiManager.onWeaponSelect = (weaponKey) => {
    // Local weapon update selection is allowed
};

// Sync callbacks back from multiplayer manager
multiplayerManager.onLobbyUpdate = (playersList, gameMode) => {
    uiManager.onLobbyUpdate(playersList, gameMode);
};

multiplayerManager.onLobbyNext = () => {
    uiManager.lobbyScreen.style.display = 'none';
    uiManager.difficultyScreen.style.display = 'flex';
    uiManager.setMultiplayerRole(false);
};

multiplayerManager.onDifficultySync = (difficultyKey) => {
    uiManager.setDifficultyKey(difficultyKey);
};

multiplayerManager.onGameStartSync = (difficultyKey) => {
    const diff = setDifficulty(difficultyKey);
    uiManager.difficultyScreen.style.display = 'none';
    uiManager.hud.style.display = 'block';
    uiManager.crosshair.style.display = 'block';

    const diffBadge = document.getElementById('hud-diff-badge');
    if (diffBadge) {
        diffBadge.textContent = diff.name;
        diffBadge.style.color = diff.color;
        diffBadge.style.borderColor = diff.color;
    }

    uiManager.onStartGame(diff, uiManager.selectedWeaponKey);
};

// 13. Reload Mechanics
function startReload() {
    soundEngine.stopRifleBurst();
    if (isReloading || ammo >= maxAmmo) return;
    isReloading = true;
    aiming = false;
    const armPenalty = (bodyBones.leftArm || bodyBones.rightArm) ? 1.5 : 1.0;
    reloadDuration = currentWeapon.reloadTime * armPenalty;
    reloadTimer = reloadDuration;
    reloadPhase = 0;
    if (currentWeapon.id === 'SHOTGUN') {
        soundEngine.playShotgunShellInsert();
    } else if (currentWeapon.id === 'SNIPER') {
        soundEngine.playSniperReload();
    } else {
        soundEngine.playReloadMagOut();
    }
    uiManager.updateHUD(getHUDState());
}

function updateReload(delta) {
    if (!isReloading) return;

    const prevTimer = reloadTimer;
    reloadTimer -= delta;

    if (currentWeapon.id === 'SHOTGUN') {
        // Rhythmic shotgun chambering / tube inserting ("chk-chk-chk-chk-") across 2.5s duration
        const prevCount = Math.floor(prevTimer / 0.35);
        const currentCount = Math.floor(reloadTimer / 0.35);
        if (currentCount < prevCount && currentCount >= 0) {
            soundEngine.playShotgunShellInsert();
        }

        // Final chambering slide pump as reload finishes (last 0.4s)
        if (reloadTimer <= 0.40 && reloadPhase === 0) {
            soundEngine.playShotgunPump();
            reloadPhase = 1;
        }
    } else if (currentWeapon.id === 'SNIPER') {
        // Handled via soundEngine.playSniperReload()
    } else {
        if (reloadTimer <= 1.2 && reloadPhase === 0) {
            soundEngine.playReloadMagIn();
            reloadPhase = 1;
        }

        if (reloadTimer <= 0.4 && reloadPhase === 1) {
            soundEngine.playBoltRelease();
            reloadPhase = 2;
        }
    }

    if (reloadTimer <= 0) {
        isReloading = false;
        ammo = maxAmmo;
        reloadPhase = 0;
        uiManager.updateHUD(getHUDState());
    }
}

// 14. Grenade Replenishment Loop
function updateGrenadeReplenish(delta) {
    if (grenadeCount < maxGrenades) {
        grenadeReplenishTimer -= delta;
        if (grenadeReplenishTimer <= 0) {
            grenadeCount++;
            grenadeReplenishTimer = 5.0;
            soundEngine.playMedkitPickup();
            uiManager.updateHUD(getHUDState());
        }
    } else {
        grenadeReplenishTimer = 5.0;
    }
}

// 15. Bush Stealth System Loop
function updateBushStealth(delta) {
    if (stealthBreakTimer > 0) {
        stealthBreakTimer -= delta;
        isPlayerHidden = false;
        return;
    }

    let inBush = false;
    for (const bush of stealthBushes) {
        const dist = Math.hypot(camera.position.x - bush.x, camera.position.z - bush.z);
        if (dist < bush.radius) {
            inBush = true;
            break;
        }
    }

    if (inBush !== isPlayerHidden) {
        isPlayerHidden = inBush;
        if (inBush) {
            achievementManager.unlock('BUSH_GHOST');
        }
        uiManager.updateHUD(getHUDState());
    }
}

// 16. Input Listeners
window.addEventListener('keydown', e => {
    const chatInput = document.getElementById('chat-input');
    const chatPanel = document.getElementById('chat-box');

    if (chatInput && document.activeElement === chatInput) {
        if (e.code === 'Enter') {
            e.preventDefault();
            const text = chatInput.value.trim();
            if (text.length > 0) {
                console.log("[CHAT] Sending payload:", text);
                try {
                    if (multiplayerManager.isMultiplayer) {
                        multiplayerManager.sendChatMessage(text);
                    } else {
                        uiManager.addChatMessage('You', text);
                    }
                } catch (err) {
                    console.error("[CHAT] Transmission error:", err);
                    uiManager.addChatMessage('System', 'Failed to send message.');
                }
            }
            chatInput.value = '';
            chatInput.style.display = 'none';
            chatInput.blur();
            if (gameStarted) {
                document.body.requestPointerLock();
            }
        } else if (e.code === 'Escape') {
            e.preventDefault();
            console.log("[CHAT] Escape pressed. Canceling input.");
            chatInput.value = '';
            chatInput.style.display = 'none';
            chatInput.blur();
            if (gameStarted) {
                document.body.requestPointerLock();
            }
        }
        return;
    }

    // Prevent opening chat if player is typing in another input field (e.g. host code)
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') && document.activeElement !== chatInput) {
        return;
    }

    if ((e.code === 'Enter' || e.code === 'KeyT') && chatPanel) {
        e.preventDefault();
        if (chatInput) {
            console.log("[CHAT] Key pressed to open chat input.");
            chatInput.style.display = 'block';
            chatInput.focus();
            if (gameStarted) {
                document.exitPointerLock();
            }
        }
        return;
    }

    // Prevent default browser shortcuts that interfere with crouch controls (Ctrl/Cmd + WASD/R/G/F/P) only in Fullscreen or Pointer Lock
    const isFullscreenOrLocked = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement ||
        document.pointerLockElement
    );

    if (isFullscreenOrLocked) {
        if (e.ctrlKey || e.metaKey) {
            const conflictingCodes = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyR', 'KeyG', 'KeyF', 'KeyP'];
            if (conflictingCodes.includes(e.code) || ['w', 's', 'a', 'd', 'r', 'g', 'f', 'p'].includes(e.key.toLowerCase())) {
                e.preventDefault();
            }
        }
    }

    if (e.code === 'Tab') {
        e.preventDefault();
        const scoreboard = document.getElementById('mp-scoreboard');
        if (scoreboard) {
            scoreboard.style.display = 'flex';
        }
    }

    keys[e.code] = true;

    if (e.code === 'KeyM') {
        const isEnabled = soundEngine.toggleMusic(gameStarted);
        if (uiManager && typeof uiManager.updateMusicButtonsUI === 'function') {
            uiManager.updateMusicButtonsUI(!isEnabled);
        }
        if (uiManager && typeof uiManager.addChatMessage === 'function') {
            uiManager.addChatMessage('System', isEnabled ? '🎵 Background Music: ENABLED' : '🔇 Background Music: MUTED');
        }
    }

    if (gameStarted && !window.chatInputActive) {
        if (e.code === 'Digit1') switchPlayerWeapon('AK47');
        else if (e.code === 'Digit2') switchPlayerWeapon('SNIPER');
        else if (e.code === 'Digit3') switchPlayerWeapon('SHOTGUN');
        else if (e.code === 'Digit4') switchPlayerWeapon('MINIGUN');
    }

    if (e.code === 'KeyR' && gameStarted) {
        startReload();
    }

    if (e.code === 'KeyG' && gameStarted) {
        throwPlayerGrenade();
    }
});

window.addEventListener('keyup', e => {
    if (window.chatInputActive) {
        return;
    }

    keys[e.code] = false;

    if (e.code === 'Tab') {
        const scoreboard = document.getElementById('mp-scoreboard');
        if (scoreboard) {
            scoreboard.style.display = 'none';
        }
    }
});

window.addEventListener('mousemove', e => {
    if (document.pointerLockElement === document.body && gameStarted && !window.chatInputActive && !window.testModeOpen) {
        const sens = aiming ? 0.0010 : 0.0022;
        yaw -= e.movementX * sens;
        pitch -= e.movementY * sens;
        pitch = THREE.MathUtils.clamp(pitch, -1.45, 1.45);
    }
});

document.addEventListener('mousedown', e => {
    soundEngine.init();
    soundEngine.resume();

    if (window.chatInputActive || window.testModeOpen || (e.target && e.target.closest && e.target.closest('#test-mode-panel, #test-mode-auth-modal, #btn-secret-test-mode, button, input, textarea, a, .screen-overlay, #hud-btn-toggle-music, #btn-toggle-music, #achievements-modal'))) {
        return;
    }

    if (e.button === 0) {
        mouseHeld = true;
        if (gameStarted && document.pointerLockElement !== document.body) {
            document.body.requestPointerLock();
        }
    }
    if (e.button === 2 && gameStarted) {
        aiming = true;
    }
});

document.addEventListener('mouseup', e => {
    if (e.button === 0) {
        mouseHeld = false;
        soundEngine.stopRifleBurst();
    }
    if (e.button === 2) aiming = false;
});

document.addEventListener('contextmenu', e => e.preventDefault());

// 16.5. Center-Screen Raycasting Hitscan Helper
function performShootRaycast(bulletDir) {
    camera.updateMatrixWorld();
    
    // Bind raycaster to center-screen (0, 0)
    shootRaycaster.setFromCamera(centerScreenVec, camera);
    shootRaycaster.camera = camera;
    
    // Apply calculated weapon spread to the ray direction
    shootRaycaster.ray.direction.copy(bulletDir).normalize();

    const targets = [...staticRaycastTargets];
    targetMap.clear();

    // 1. Enemies
    for (const enemy of enemyManager.enemies) {
        targets.push(enemy);
        targetMap.set(enemy, { type: 'enemy', object: enemy });
    }

    // 2. Vehicles
    for (const car of vehicleManager.vehicles) {
        targets.push(car);
        targetMap.set(car, { type: 'vehicle', object: car });
    }

    // 3. Remote Players
    if (multiplayerManager.isMultiplayer) {
        for (const peerId in multiplayerManager.remotePlayers) {
            const rp = multiplayerManager.remotePlayers[peerId];
            if (rp && rp.mesh) {
                targets.push(rp.mesh);
                targetMap.set(rp.mesh, { type: 'player', peerId: peerId, object: rp });
            }
        }
    }

    const hits = shootRaycaster.intersectObjects(targets, true);
    if (hits.length > 0) {
        const firstHit = hits[0];
        
        // Traverse up the parent tree to match our root target map entry
        let rootObj = firstHit.object;
        let mapping = targetMap.get(rootObj);
        while (rootObj.parent && !mapping) {
            rootObj = rootObj.parent;
            mapping = targetMap.get(rootObj);
        }

        if (mapping) {
            return {
                hit: true,
                point: firstHit.point,
                face: firstHit.face,
                distance: firstHit.distance,
                type: mapping.type,
                peerId: mapping.peerId,
                object: mapping.object
            };
        } else {
            return {
                hit: true,
                point: firstHit.point,
                face: firstHit.face,
                distance: firstHit.distance,
                type: 'obstacle',
                object: firstHit.object
            };
        }
    }

    return { hit: false };
}

// 17. Player Shooting with Multi-Weapon Support & Stealth Break
// 17. Player Shooting with Multi-Weapon Support & Stealth Break
function shoot() {
    if (fireCooldown > 0 || isReloading) return;

    if (ammo <= 0) {
        soundEngine.stopRifleBurst(true);
        soundEngine.playDryFire();
        startReload();
        fireCooldown = 0.3;
        return;
    }

    if (testModeState.infiniteAmmo) {
        ammo = maxAmmo;
    } else {
        ammo--;
    }
    stealthBreakTimer = 4.0; // Shooting breaks stealth
    isPlayerHidden = false;
    uiManager.updateHUD(getHUDState());
    if (typeof enemyManager !== 'undefined' && enemyManager && enemyManager.alertEnemiesNear) {
        enemyManager.alertEnemiesNear(camera.position, 60);
    }

    fireCooldown = currentWeapon.fireRate;
    spreadSystem.onFire(aiming, isCrouching);

    if (currentWeapon.id === 'MINIGUN') {
        minigunHeat = Math.min(1.0, minigunHeat + 0.018);
        minigunSpinSpeed = 48.0;
    }

    const isShotgun = currentWeapon.id === 'SHOTGUN';
    const pellets = isShotgun ? 8 : 1;

    // Multi-Weapon Sound Effects (Clean, dedicated weapon samples without extraneous noise)
    if (currentWeapon.id === 'SNIPER') {
        soundEngine.playSniperFire(aiming);
    } else if (isShotgun) {
        soundEngine.playShotgunFire(aiming);
        pumpTimer = 0.50; // Trigger procedural pump-action cocking slide animation
        setTimeout(() => {
            soundEngine.playShotgunPump();
        }, 220);
    } else if (currentWeapon.id === 'MINIGUN') {
        if (typeof soundEngine.playMinigunFire === 'function') {
            soundEngine.playMinigunFire();
        } else {
            soundEngine.playRifleShot(aiming);
        }
    } else {
        soundEngine.playRifleShot(aiming);
    }

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

    // Track hits to consolidate network messages
    const enemyHits = new Map();   // enemy -> accumulated damage
    const vehicleHits = new Map(); // car -> accumulated damage
    const playerHits = new Map();  // peerId -> accumulated damage

    for (let p = 0; p < pellets; p++) {
        const customSpread = currentWeapon.id === 'MINIGUN' ? (spreadSystem.currentSpread + (minigunHeat * 22.0)) : null;
        const spreadDirObj = spreadSystem.calculateSpreadDirection(forward, right, up, customSpread);
        const bulletDir = new THREE.Vector3(spreadDirObj.x, spreadDirObj.y, spreadDirObj.z);

        // Perform hitscan raycasting
        const hitData = performShootRaycast(bulletDir);

        if (hitData.hit) {
            if (hitData.type === 'enemy') {
                const enemy = hitData.object;
                const baseDmg = currentWeapon.damage;
                const enemyDmg = baseDmg >= 100 ? 10 : (baseDmg >= 50 ? 3 : 1);
                soundEngine.playEnemyHit();
                createHitEffect(hitData.point);

                enemyHits.set(enemy, (enemyHits.get(enemy) || 0) + enemyDmg);
            } else if (hitData.type === 'vehicle') {
                const car = hitData.object;
                const baseDmg = currentWeapon.damage;
                const carDmg = baseDmg >= 100 ? 35 : (baseDmg >= 50 ? 18 : 6);
                createHitEffect(hitData.point, 0xffaa00);

                vehicleHits.set(car, (vehicleHits.get(car) || 0) + carDmg);
            } else if (hitData.type === 'player') {
                if (multiplayerManager.gameMode === 'ffa') {
                    createHitEffect(hitData.point);
                    playerHits.set(hitData.peerId, (playerHits.get(hitData.peerId) || 0) + currentWeapon.damage);
                }
            } else if (hitData.type === 'obstacle') {
                let worldNormal = new THREE.Vector3(0, 1, 0);
                if (hitData.face && hitData.object) {
                    worldNormal.copy(hitData.face.normal).transformDirection(hitData.object.matrixWorld);
                }
                createBulletHole(hitData.point, worldNormal);
            }
        }

        // Spawn cosmetic tracer bullet
        const bullet = bulletPool[bulletPoolIndex];
        bulletPoolIndex = (bulletPoolIndex + 1) % BULLET_POOL_SIZE;

        bullet.geometry = currentWeapon.id === 'SNIPER' ? sniperBulletGeo : defaultBulletGeo;
        bullet.position.copy(camera.position);
        bullet.visible = true;

        const bulletSpeed = currentWeapon.id === 'SNIPER' ? 340 : (isShotgun ? 160 : 175);
        bullet.userData.velocity = bulletDir.clone().multiplyScalar(bulletSpeed);
        bullet.userData.life = hitData.hit ? (hitData.distance / bulletSpeed) : 2.5;
    }

    // Apply and network accumulated hits
    // 1. Enemy Hits
    for (const [enemy, dmg] of enemyHits.entries()) {
        if (multiplayerManager.isMultiplayer && !multiplayerManager.isHost) {
            multiplayerManager.sendToHost({
                type: 'hit_enemy',
                enemyId: enemy.userData.id,
                damage: dmg
            });
        } else {
            handleEnemyDamage(enemy, dmg);
        }
    }

    // 2. Vehicle Hits
    for (const [car, dmg] of vehicleHits.entries()) {
        if (multiplayerManager.isMultiplayer && !multiplayerManager.isHost) {
            multiplayerManager.sendToHost({
                type: 'hit_vehicle',
                vehicleId: car.userData.id,
                damage: dmg
            });
        } else {
            vehicleManager.damageVehicle(car, dmg, () => {
                kills += 3;
                achievementManager.unlock('VEHICLE_BUSTER');
                uiManager.updateHUD(getHUDState());
            });
        }
    }

    // 3. Player Hits (FFA)
    for (const [peerId, dmg] of playerHits.entries()) {
        if (multiplayerManager.isHost) {
            const targetConn = multiplayerManager.connections[peerId];
            if (targetConn) {
                targetConn.send({
                    type: 'damage_taken',
                    amount: dmg,
                    source: 'pvp'
                });
            }
        } else {
            multiplayerManager.sendToHost({
                type: 'hit_player',
                targetPeerId: peerId,
                damage: dmg
            });
        }
    }

    if (multiplayerManager.isMultiplayer) {
        multiplayerManager.sendLocalShoot(camera.position, forward, currentWeapon.id);
    }

    muzzleFlashLight.intensity = currentWeapon.id === 'SNIPER' ? 16 : 8;
    muzzleFlashLight.userData.timer = 0.04;

    const armRecoilMult = (bodyBones.leftArm || bodyBones.rightArm) ? 1.4 : 1.0;
    gunRecoil = (aiming ? currentWeapon.recoilKick * 0.35 : currentWeapon.recoilKick) * armRecoilMult;
}

// 18. Bullet Holes & Impacts
function createBulletHole(position, normal) {
    const hole = holePool[holePoolIndex];
    holePoolIndex = (holePoolIndex + 1) % HOLE_POOL_SIZE;

    hole.position.copy(position).add(normal.clone().multiplyScalar(0.02));
    hole.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    hole.visible = true;
    hole.userData.life = 40.0;
}

function createHitEffect(position, color = 0xff3300) {
    const flash = flashPool[flashPoolIndex];
    flashPoolIndex = (flashPoolIndex + 1) % FLASH_POOL_SIZE;

    flash.material.color.setHex(color);
    flash.position.copy(position);
    flash.visible = true;
    flash.userData.life = 0.09;
}

// 19. Grenades System (Capped at 5, Replenishes every 5s)
function throwPlayerGrenade() {
    if (grenadeCount <= 0) {
        soundEngine.playDryFire();
        return;
    }

    grenadeCount--;
    stealthBreakTimer = 3.0;
    isPlayerHidden = false;
    uiManager.updateHUD(getHUDState());

    soundEngine.playGrenadeBounce();

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);

    const grenadeData = grenadePhysics.createGrenadeData(camera.position, forward);

    const grenadeMesh = new THREE.Mesh(
        new THREE.SphereGeometry(grenadePhysics.config.radius, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0x22262a, metalness: 0.85, roughness: 0.3 })
    );
    grenadeMesh.position.set(grenadeData.x, grenadeData.y, grenadeData.z);
    grenadeMesh.castShadow = true;
    scene.add(grenadeMesh);

    grenadeData.mesh = grenadeMesh;
    activeGrenades.push(grenadeData);

    if (multiplayerManager.isMultiplayer) {
        multiplayerManager.sendLocalGrenade(camera.position, grenadeData.velocity);
    }
}

function explodeGrenadeAt(grenadeData) {
    soundEngine.playGrenadeExplosion();
    const pos = new THREE.Vector3(grenadeData.x, grenadeData.y, grenadeData.z);

    const flash = new THREE.Mesh(
        new THREE.SphereGeometry(3.5, 16, 16),
        new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.85
        })
    );
    flash.position.copy(pos);
    scene.add(flash);
    setTimeout(() => scene.remove(flash), 180);

    for (let i = enemyManager.enemies.length - 1; i >= 0; i--) {
        const enemy = enemyManager.enemies[i];
        if (!enemy) continue;
        const dist = enemy.position.distanceTo(pos);
        const dmg = grenadePhysics.calculateDamage(dist);
        if (dmg > 0) {
            createHitEffect(enemy.position);
            handleEnemyDamage(enemy, dmg);
        }
    }

    for (const car of [...vehicleManager.vehicles]) {
        const dist = car.position.distanceTo(pos);
        const dmg = grenadePhysics.calculateDamage(dist);
        if (dmg > 0) {
            vehicleManager.damageVehicle(car, dmg, () => {
                kills += 3;
                achievementManager.unlock('VEHICLE_BUSTER');
            });
        }
    }

    // Player blast self-damage
    const distToPlayer = camera.position.distanceTo(pos);
    const playerBlastDmg = grenadePhysics.calculateDamage(distToPlayer);
    if (playerBlastDmg > 0) {
        soundEngine.playPlayerHurt();
        damagePlayer(playerBlastDmg, 'grenade');
    }

    uiManager.updateHUD(getHUDState());
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

// 20. Player Movement, Physics & Ladder Climbing Loop
function updatePlayer(delta) {
    if (window.chatInputActive) {
        isCrouching = false;
        const groundLevel = getSimpleGround(camera.position.x, camera.position.z);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, groundLevel + STANDING_EYE_HEIGHT, delta * 14.0);
        return { moving: false, sprint: false, crouching: false };
    }

    const crouch = (keys["KeyC"] || keys["ControlLeft"] || keys["ControlRight"]) && !onLadder;
    isCrouching = crouch;

    const hasLegFracture = bodyBones.leftLeg || bodyBones.rightLeg;
    const sprint = !crouch && !hasLegFracture && (keys["ShiftLeft"] || keys["ShiftRight"]);
    const moving = keys["KeyW"] || keys["KeyA"] || keys["KeyS"] || keys["KeyD"];
    let speed = crouch ? 3.4 : (sprint ? 13 : 7.2);
    if (hasLegFracture) {
        speed *= 0.65;
    }
    if (testModeState.superSpeed) {
        speed *= 2.5;
    }

    const targetEyeHeight = crouch ? CROUCH_EYE_HEIGHT : STANDING_EYE_HEIGHT;
    eyeHeight = THREE.MathUtils.lerp(eyeHeight, targetEyeHeight, delta * 14.0);

    if (ladderAttachCooldown > 0) {
        ladderAttachCooldown -= delta;
    }

    const curY = camera.position.y - eyeHeight;
    let nearbyLadder = null;
    let minLadderDist = Infinity;

    for (const lad of ladders) {
        const dx = camera.position.x - lad.x;
        const dz = camera.position.z - lad.z;
        const distHoriz = Math.hypot(dx, dz);

        if (distHoriz < 2.0 && curY >= -0.5 && curY <= lad.top + 0.8) {
            if (distHoriz < minLadderDist) {
                minLadderDist = distHoriz;
                nearbyLadder = lad;
            }
        }
    }

    // Attach to ladder logic (prevents rooftop softlock)
    if (nearbyLadder && ladderAttachCooldown <= 0) {
        if (!onLadder) {
            const isAtRoofLevel = (curY >= nearbyLadder.buildingHeight - 0.5);
            if (!isAtRoofLevel) {
                // Below roof level: W, Space, or walking into ladder attaches
                if (keys["KeyW"] || keys["Space"] || minLadderDist < 1.1) {
                    onLadder = true;
                }
            } else {
                // ON TOP OF ROOFTOP: ONLY pressing S (moving backwards toward ladder) attaches!
                // 'W' will NEVER attach while on the roof, allowing free rooftop movement.
                if (keys["KeyS"] && minLadderDist < 1.5) {
                    onLadder = true;
                }
            }
        }
    } else if (ladderAttachCooldown > 0) {
        onLadder = false;
    }

    if (onLadder && nearbyLadder) {
        velocityY = 0;
        grounded = true;
        ladderSoundCooldown -= delta;

        const ladderAngle = nearbyLadder.rotY || 0;
        const normX = Math.sin(ladderAngle);
        const normZ = Math.cos(ladderAngle);
        const standX = nearbyLadder.x + normX * 0.40;
        const standZ = nearbyLadder.z + normZ * 0.40;

        const isNearRoof = (camera.position.y - eyeHeight >= nearbyLadder.buildingHeight - 0.35);

        // Only lock horizontally while climbing between ground and roof level
        if (!isNearRoof) {
            camera.position.x = THREE.MathUtils.lerp(camera.position.x, standX, delta * 18.0);
            camera.position.z = THREE.MathUtils.lerp(camera.position.z, standZ, delta * 18.0);
        }

        // Climbing UP
        if (keys["KeyW"] || keys["Space"]) {
            camera.position.y += 6.5 * delta;
            if (ladderSoundCooldown <= 0) {
                soundEngine.playLadderClimb();
                ladderSoundCooldown = 0.24;
            }

            // Stepping forward onto rooftop terrace safely
            if (isNearRoof) {
                achievementManager.unlock('ROOFTOP_RECON');
                const stepIntoRoofX = -normX;
                const stepIntoRoofZ = -normZ;

                camera.position.x = nearbyLadder.x + stepIntoRoofX * 2.2;
                camera.position.z = nearbyLadder.z + stepIntoRoofZ * 2.2;

                const roofGround = getSimpleGround(camera.position.x, camera.position.z);
                camera.position.y = Math.max(nearbyLadder.buildingHeight + 0.35, roofGround) + eyeHeight;
                onLadder = false;
                grounded = true;
                velocityY = 0;
                ladderAttachCooldown = 0.6; // 600ms cooldown so player can move freely across the roof
            }
        }
        // Climbing DOWN
        else if (keys["KeyS"]) {
            camera.position.y -= 6.5 * delta;
            if (ladderSoundCooldown <= 0) {
                soundEngine.playLadderClimb();
                ladderSoundCooldown = 0.24;
            }

            // Once feet reach ground level, cleanly dismount
            const groundY = getSimpleGround(camera.position.x, camera.position.z);
            if (camera.position.y - eyeHeight <= groundY + 0.15) {
                camera.position.y = groundY + eyeHeight;
                onLadder = false;
                velocityY = 0;
                grounded = true;
                ladderAttachCooldown = 0.3;
            }
        }
        // Strafing / Jumping off ladder
        else if (keys["KeyA"] || keys["KeyD"]) {
            const strafeDir = keys["KeyA"] ? -1 : 1;
            const sideX = -normZ * strafeDir;
            const sideZ = normX * strafeDir;
            camera.position.x += sideX * 3.5 * delta;
            camera.position.z += sideZ * 3.5 * delta;
            onLadder = false;
            grounded = false;
            ladderAttachCooldown = 0.4;
        }
    } else {
        const moveVector = new THREE.Vector3();
        if (keys["KeyW"]) moveVector.z -= 1;
        if (keys["KeyS"]) moveVector.z += 1;
        if (keys["KeyA"]) moveVector.x -= 1;
        if (keys["KeyD"]) moveVector.x += 1;

        if (moveVector.lengthSq() > 0) {
            moveVector.normalize();
            moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

            const nextX = camera.position.x + moveVector.x * speed * delta;
            const nextZ = camera.position.z + moveVector.z * speed * delta;
            const playerFeetY = camera.position.y - eyeHeight;
            const currentGround = getSimpleGround(camera.position.x, camera.position.z, playerFeetY);

            // Check X Movement
            let collidesX = false;
            for (const obs of obstacles) {
                if (checkObstacleCollision(nextX, camera.position.z, playerFeetY, obs, playerRadius)) {
                    collidesX = true;
                    break;
                }
            }

            // Crouch Edge Protection along X (Prevents walking off rooftops, ledges & heights)
            if (!collidesX && crouch && grounded) {
                const probeDistX = Math.sign(moveVector.x) * 0.28;
                const groundNextX = getSimpleGround(nextX + probeDistX, camera.position.z, playerFeetY);
                if (currentGround - groundNextX > 0.85) {
                    collidesX = true;
                }
            }

            if (!collidesX) camera.position.x = nextX;

            // Check Z Movement
            let collidesZ = false;
            for (const obs of obstacles) {
                if (checkObstacleCollision(camera.position.x, nextZ, playerFeetY, obs, playerRadius)) {
                    collidesZ = true;
                    break;
                }
            }

            // Crouch Edge Protection along Z (Prevents walking off rooftops, ledges & heights)
            if (!collidesZ && crouch && grounded) {
                const probeDistZ = Math.sign(moveVector.z) * 0.28;
                const groundNextZ = getSimpleGround(camera.position.x, nextZ + probeDistZ, playerFeetY);
                if (currentGround - groundNextZ > 0.85) {
                    collidesZ = true;
                }
            }

            if (!collidesZ) camera.position.z = nextZ;
        }

        const waterSurfaceLevel = getWaterLevel(camera.position.x, camera.position.z);
        const playerFeetY = camera.position.y - eyeHeight;
        const inWater = waterSurfaceLevel > -900 && (playerFeetY < waterSurfaceLevel);
        const isHeadSubmerged = waterSurfaceLevel > -900 && (camera.position.y < waterSurfaceLevel);

        if (inWater) {
            // Water Entry Splash Sound
            if (!wasInWater && velocityY < -1.5) {
                soundEngine.playWaterSplash();
            }
            wasInWater = true;

            // Swimming Physics & Buoyancy
            velocityY -= (gravity * 0.25) * delta;
            velocityY *= Math.pow(0.35, delta * 4);

            if (keys["Space"]) {
                velocityY = Math.min(4.2, velocityY + 16.0 * delta);
            }
            if (keys["KeyC"] || keys["ControlLeft"] || keys["ControlRight"]) {
                velocityY = Math.max(-4.2, velocityY - 16.0 * delta);
            }

            camera.position.y += velocityY * delta;

            const maxSwimY = waterSurfaceLevel + eyeHeight * 0.6;
            if (camera.position.y > maxSwimY && !keys["Space"]) {
                camera.position.y = maxSwimY;
                velocityY = 0;
            }

            const groundLevel = getSimpleGround(camera.position.x, camera.position.z, playerFeetY);
            const targetY = groundLevel + eyeHeight;
            if (camera.position.y <= targetY) {
                camera.position.y = targetY;
                velocityY = 0;
                grounded = true;
            } else {
                grounded = false;
            }
        } else {
            wasInWater = false;
            const groundLevel = getSimpleGround(camera.position.x, camera.position.z, playerFeetY);
            const targetY = groundLevel + eyeHeight;

            if (keys["Space"] && grounded) {
                velocityY = testModeState.superJump ? jumpPower * 2.8 : jumpPower;
                grounded = false;
            }

            velocityY -= gravity * delta;
            camera.position.y += velocityY * delta;

            if (camera.position.y <= targetY) {
                // Realistic Fall Damage upon hard landing
                if (!grounded && velocityY < -14.5) {
                    const fallSpeed = Math.abs(velocityY);
                    const fallDmg = Math.round((fallSpeed - 13.5) * 4.5);
                    if (fallDmg > 0) {
                        soundEngine.playPlayerHurt();
                        damagePlayer(fallDmg, 'fall');
                    }
                }

                camera.position.y = targetY;
                velocityY = 0;
                grounded = true;
            } else {
                grounded = false;
            }
        }

        // Oxygen & Suffocation / Drowning Management
        const lungDuration = bodyBones.torso ? 6.0 : 12.0; // Cracked ribs cut lung capacity in half
        if (isHeadSubmerged) {
            oxygen = Math.max(0, oxygen - (100 / lungDuration) * delta);
            if (oxygen <= 0) {
                drownDamageTimer -= delta;
                if (drownDamageTimer <= 0) {
                    drownDamageTimer = 0.85;
                    soundEngine.playDrownGasp();
                    damagePlayer(14, 'drowning');
                }
            }
            wasHeadSubmerged = true;
        } else {
            if (wasHeadSubmerged && oxygen < 95) {
                soundEngine.playSurfacingGasp();
                wasHeadSubmerged = false;
            }
            oxygen = Math.min(100, oxygen + 48.0 * delta); // Rapidly recovers when breathing on surface
        }

        // Bleeding Tick Management
        if (isBleeding) {
            bleedTimer -= delta;
            if (bleedTimer <= 0) {
                bleedTimer = 3.5;
                let totalWounds = 0;
                for (const k in bulletWounds) totalWounds += bulletWounds[k];
                if (totalWounds > 0 && health > 1) {
                    health = Math.max(1, health - 1);
                    uiManager.updateHUD(getHUDState());
                }
            }
        }
    }

    for (let i = enemyManager.medkits.length - 1; i >= 0; i--) {
        const med = enemyManager.medkits[i];
        const dist = Math.hypot(camera.position.x - med.position.x, camera.position.z - med.position.z);
        if (dist < 1.6) {
            health = Math.min(maxHealth, health + med.userData.heal);
            // Treat and repair all bone fractures, close bullet wounds, stop bleeding
            bodyBones = { head: false, torso: false, leftArm: false, rightArm: false, leftLeg: false, rightLeg: false };
            bulletWounds = { head: 0, torso: 0, leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0 };
            isBleeding = false;
            soundEngine.playMedkitPickup();
            achievementManager.unlock('COMBAT_MEDIC');
            scene.remove(med);
            enemyManager.medkits.splice(i, 1);
            uiManager.updateHUD(getHUDState());

            if (multiplayerManager.isMultiplayer && !multiplayerManager.isHost) {
                multiplayerManager.sendToHost({
                    type: 'pickup_medkit',
                    medkitId: med.userData.id
                });
            }
        }
    }

    return { moving, sprint, crouching: crouch };
}

// 21. Player Damage Handler
function damagePlayer(amount, source = 'generic') {
    if (!gameStarted || testModeState.godMode || window.testModeOpen) return;

    health -= amount;
    uiManager.triggerDamageFlash(source === 'ram' ? 0.95 : 0.65);

    // Anatomical Bone Fractures & Bullet Wound Bleeding
    if (source === 'fall') {
        bodyBones.leftLeg = true;
        bodyBones.rightLeg = true;
    } else if (source === 'ram' || source === 'car') {
        bodyBones.torso = true;
        if (Math.random() < 0.65) bodyBones.leftLeg = true;
        if (Math.random() < 0.65) bodyBones.rightLeg = true;
    } else if (source === 'enemy' || source === 'player' || source === 'gunshot') {
        const roll = Math.random();
        let hitZone = 'torso';
        if (roll < 0.10) hitZone = 'head';
        else if (roll < 0.22) hitZone = 'leftArm';
        else if (roll < 0.35) hitZone = 'rightArm';
        else if (roll < 0.50) hitZone = 'leftLeg';
        else if (roll < 0.65) hitZone = 'rightLeg';
        else hitZone = 'torso';

        bulletWounds[hitZone] = (bulletWounds[hitZone] || 0) + 1;
        isBleeding = true;

        if (amount >= 20 || Math.random() < 0.40) {
            bodyBones[hitZone] = true;
        }
    } else if (source === 'explosion') {
        bodyBones.torso = true;
        if (Math.random() < 0.5) bodyBones.leftLeg = true;
        if (Math.random() < 0.5) bodyBones.rightLeg = true;
        if (Math.random() < 0.5) bodyBones.leftArm = true;
        if (Math.random() < 0.5) bodyBones.rightArm = true;
        isBleeding = true;
        bulletWounds.torso = (bulletWounds.torso || 0) + 1;
    }

    uiManager.updateHUD(getHUDState());

    if (health <= 0) {
        health = 0;
        gameStarted = false;
        if (document.pointerLockElement) document.exitPointerLock();

        // Check death cause for achievements
        let deathCause = 'generic';
        const waterSurface = getWaterLevel(camera.position.x, camera.position.z);
        const inWater = waterSurface > -900 && (camera.position.y - eyeHeight < waterSurface);
        if (source === 'drowning' || inWater) {
            deathCause = 'water';
        } else if (source === 'fall' || bodyBones.leftLeg || bodyBones.rightLeg) {
            deathCause = 'fall';
        }

        achievementManager.recordDeath(deathCause);

        const isCheat = !!(testModeState && (testModeState.godMode || testModeState.infiniteAmmo || testModeState.instaKill));
        uiManager.showGameOver({ kills, wave, difficulty: getDifficulty(), isCheat });
        soundEngine.stopMusic();
    }
}

// 22. Wave & Spawning Management
function spawnWave(difficulty) {
    const diff = difficulty || getDifficulty();
    const scaling = getWaveEnemyScaling(wave, diff);
    const wantedEnemies = scaling.enemyCount;

    // 1. Machine Gunner Boss Spawn (Every 5 rounds: Wave 5, 10, 15, 20...)
    if (scaling.isBossWave) {
        const existingBoss = enemyManager.enemies.find(e => e.userData.isBoss);
        if (!existingBoss) {
            const boss = enemyManager.spawnBossGunner(
                camera.position,
                diff,
                getSimpleGround,
                wave,
                scaling
            );
            uiManager.showBossHP(boss.userData.bossName, boss.userData.health, boss.userData.maxHealth, wave);
            soundEngine.playBossAlarm();
            if (multiplayerManager?.chatPanel) {
                multiplayerManager.addSystemMessage(`⚠️ ALERT: ${boss.userData.bossName} SPAWNED ON WAVE ${wave}!`);
            }
        }
    }

    // 2. Regular Enemies with Progressive Wave & Difficulty Scaling
    while (enemyManager.enemies.length < wantedEnemies) {
        const isKnife = Math.random() < diff.knifeEnemyRatio;
        enemyManager.spawnEnemy(
            camera.position,
            isKnife ? 'knife' : 'gunner',
            diff,
            getSimpleGround,
            scaling
        );
    }

    // 3. Pursuit Vehicles
    if (wave >= (diff.carSpawnWave || 1)) {
        if (vehicleManager.vehicles.length < Math.min(Math.floor(wave / 2) + 1, 2)) {
            vehicleManager.spawnVehicle(camera.position, diff, getSimpleGround);
        }
    }
}

let gameWon = false;
let endlessPlayOn = false;

function checkWaveMilestones() {
    achievementManager.recordWave(wave);

    if (wave >= 50 && !endlessPlayOn) {
        if (!gameWon) {
            gameWon = true;
            try {
                localStorage.setItem('urban_breach_minigun_unlocked', 'true');
            } catch (e) {}
            const isCheat = !!(testModeState && (testModeState.godMode || testModeState.infiniteAmmo || testModeState.instaKill));
            uiManager.showVictoryScreen({ kills, wave: 50, difficulty: getDifficulty(), isCheat });
            if (soundEngine && typeof soundEngine.playLevelUp === 'function') {
                soundEngine.playLevelUp();
            }
        }
    }
}

function updateWaves(delta) {
    if (gameWon) return;
    if (testModeState.freezeWaveTimer) {
        return;
    }
    const diff = getDifficulty();
    waveTimer += delta;
    if (waveTimer > 25) {
        wave++;
        waveTimer = 0;
        checkWaveMilestones();
        if (!gameWon) {
            spawnWave(diff);
            uiManager.updateHUD(getHUDState());
        }
    }

    if (gameWon) return;

    enemySpawnTimer -= delta;
    if (enemySpawnTimer <= 0) {
        spawnWave(diff);
        enemySpawnTimer = THREE.MathUtils.randFloat(4, 7);
    }

    carSpawnTimer -= delta;
    if (carSpawnTimer <= 0 && wave >= (diff.carSpawnWave || 1)) {
        if (vehicleManager.vehicles.length < 2) {
            vehicleManager.spawnVehicle(camera.position, diff, getSimpleGround);
        }
        carSpawnTimer = diff.carSpawnInterval || 14;
    }
}

// 23. Bullets Update Loop
function updateBullets(delta) {
    for (let i = 0; i < BULLET_POOL_SIZE; i++) {
        const bullet = bulletPool[i];
        if (bullet.visible && bullet.userData.velocity) {
            bullet.position.add(
                bullet.userData.velocity.clone().multiplyScalar(delta)
            );
            bullet.userData.life -= delta;
            if (bullet.userData.life <= 0) {
                bullet.visible = false;
            }
        }
    }
}

// 24. Grenades Physics Loop
function updateActiveGrenades(delta) {
    for (let i = activeGrenades.length - 1; i >= 0; i--) {
        const g = activeGrenades[i];
        const prevVy = g.vy;
        const isAlive = grenadePhysics.update(g, delta, getSimpleGround, obstacles);

        if (prevVy < -2 && g.vy > 0) {
            soundEngine.playGrenadeBounce();
        }

        if (g.mesh) {
            g.mesh.position.set(g.x, g.y, g.z);
            g.mesh.rotation.x += g.vx * delta * 2;
            g.mesh.rotation.z += g.vz * delta * 2;
        }

        if (!isAlive) {
            explodeGrenadeAt(g);
            if (g.mesh) scene.remove(g.mesh);
            activeGrenades.splice(i, 1);
        }
    }
}

// 25. Bullet Holes Cleanup
function updateBulletHoles(delta) {
    for (let i = 0; i < HOLE_POOL_SIZE; i++) {
        const hole = holePool[i];
        if (hole.visible) {
            hole.userData.life -= delta;
            if (hole.userData.life <= 0) {
                hole.visible = false;
            }
        }
    }

    // Update Hit Flashes in Pool
    for (let i = 0; i < FLASH_POOL_SIZE; i++) {
        const flash = flashPool[i];
        if (flash.visible) {
            flash.userData.life -= delta;
            if (flash.userData.life <= 0) {
                flash.visible = false;
            }
        }
    }

    // Update Muzzle Flash Light Timer
    if (muzzleFlashLight && muzzleFlashLight.userData.timer > 0) {
        muzzleFlashLight.userData.timer -= delta;
        if (muzzleFlashLight.userData.timer <= 0) {
            muzzleFlashLight.intensity = 0;
        }
    }
}

// 26. Aim, Viewmodel Visibility & Reload Viewmodel Animation
function updateAimAndGun(delta, moving, sprint) {
    const targetFOV = aiming ? (currentWeapon.aimFOV || aimFOV) : normalFOV;
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, delta * 14);
    camera.updateProjectionMatrix();

    gunRecoil = THREE.MathUtils.lerp(gunRecoil, 0, delta * 16);

    // Hide viewmodel gun while aiming only for Sniper (full screen scope overlay)
    gunGroup.visible = !(aiming && currentWeapon.id === 'SNIPER');

    const bob = moving ? Math.sin(Date.now() * 0.008) * 0.015 : 0;
    let targetGunX = 0.24;
    let targetGunY = -0.22 + bob;
    let targetGunZ = -0.48 + gunRecoil;

    let targetRotX = -0.02;
    let targetRotY = -0.04;
    let targetRotZ = 0.03;

    if (aiming && currentWeapon.id !== 'SNIPER') {
        targetGunX = 0.0;
        targetRotY = 0.0;
        targetRotZ = 0.0;
        if (currentWeapon.id === 'AK47') {
            targetGunY = -0.165;
            targetGunZ = -0.44 + gunRecoil;
            targetRotX = 0.0;
        } else if (currentWeapon.id === 'SHOTGUN') {
            targetGunY = -0.198;
            targetGunZ = -0.38 + gunRecoil;
            targetRotX = 0.0;
        } else if (currentWeapon.id === 'MINIGUN') {
            targetGunX = 0.08;
            targetGunY = -0.22;
            targetGunZ = -0.46 + gunRecoil;
            targetRotX = 0.01;
        }
    }

    // Minigun Real-Time Heat Dissipation, Gatling Spin & Emissive Glow
    if (currentWeapon.id === 'MINIGUN') {
        minigunHeat = Math.max(0, minigunHeat - delta * 0.35);
        minigunSpinSpeed = Math.max(0, minigunSpinSpeed - delta * 25.0);

        const rotor = gunGroup.getObjectByName('minigunRotor');
        if (rotor && minigunSpinSpeed > 0) {
            minigunRotorAngle += minigunSpinSpeed * delta;
            rotor.rotation.z = minigunRotorAngle;
        }

        if (minigunBarrelMeshes && minigunBarrelMeshes.length > 0) {
            for (const bMesh of minigunBarrelMeshes) {
                if (bMesh.material && bMesh.material.emissive) {
                    bMesh.material.emissive.setRGB(minigunHeat * 0.9, minigunHeat * 0.25, 0);
                }
            }
        }
    }

    // Reset viewmodel children base poses
    gunGroup.traverse(child => {
        if (child !== gunGroup) {
            if (!child.userData.basePos) {
                child.userData.basePos = child.position.clone();
                child.userData.baseRot = child.rotation.clone();
            } else {
                child.position.copy(child.userData.basePos);
                child.rotation.copy(child.userData.baseRot);
            }
            if (child.name === 'shell') {
                child.visible = false;
            }
        }
    });

    // Procedural shotgun pump-action cocking slide animation
    if (pumpTimer > 0) {
        pumpTimer -= delta;
        const p = pumpTimer / 0.50;
        const slideAmt = Math.sin(p * Math.PI) * 0.08;
        gunGroup.traverse(child => {
            if (child.name === 'forearm' || child.name === 'forearm_groove' || child.name === 'forearm_rail' || child.name === 'handLeft') {
                child.position.z = child.userData.basePos.z + slideAmt;
            }
        });
    }

    if (isReloading) {
        const reloadProgress = 1 - (reloadTimer / reloadDuration);
        
        if (currentWeapon.id === 'AK47') {
            const reloadDip = Math.sin(reloadProgress * Math.PI) * 0.12;
            targetGunY -= reloadDip;
            targetRotX -= Math.sin(reloadProgress * Math.PI) * 0.28;
            targetRotZ += Math.sin(reloadProgress * Math.PI) * 0.42;
            targetGunX += Math.sin(reloadProgress * Math.PI) * 0.06;

            const mag = gunGroup.getObjectByName('magazine');
            const bolt = gunGroup.getObjectByName('bolt');
            const handLeft = gunGroup.getObjectByName('handLeft');

            if (reloadProgress < 0.35) {
                const t = reloadProgress / 0.35;
                if (mag && mag.userData.basePos) {
                    mag.position.y = mag.userData.basePos.y - t * 0.45;
                    mag.position.z = mag.userData.basePos.z + t * 0.10;
                }
                if (handLeft && handLeft.userData.basePos) {
                    handLeft.position.y = handLeft.userData.basePos.y - t * 0.45;
                    handLeft.position.z = handLeft.userData.basePos.z + t * 0.10;
                }
            } else if (reloadProgress < 0.70) {
                const t = (reloadProgress - 0.35) / 0.35;
                if (mag && mag.userData.basePos) {
                    mag.position.y = mag.userData.basePos.y - (1 - t) * 0.45;
                    mag.position.z = mag.userData.basePos.z + (1 - t) * 0.10;
                }
                if (handLeft && handLeft.userData.basePos) {
                    handLeft.position.y = handLeft.userData.basePos.y - (1 - t) * 0.45;
                    handLeft.position.z = handLeft.userData.basePos.z + (1 - t) * 0.10;
                }
            } else {
                const t = (reloadProgress - 0.70) / 0.30;
                const boltSlide = Math.sin(t * Math.PI) * 0.08;
                if (bolt && bolt.userData.basePos) {
                    bolt.position.z = bolt.userData.basePos.z + boltSlide;
                }
                if (handLeft && bolt && bolt.userData.basePos) {
                    handLeft.position.set(0.045, 0.045, bolt.userData.basePos.z + boltSlide);
                }
            }
        } else if (currentWeapon.id === 'SNIPER') {
            const reloadDip = Math.sin(reloadProgress * Math.PI) * 0.10;
            targetGunY -= reloadDip;
            targetRotX -= Math.sin(reloadProgress * Math.PI) * 0.22;

            if (reloadProgress < 0.3) {
                const t = reloadProgress / 0.3;
                gunGroup.traverse(child => {
                    if (child.name === 'bolt' || child.name === 'bolt_knob') {
                        child.position.z = child.userData.basePos.z + t * 0.08;
                        child.rotation.z = child.userData.baseRot.z + t * 0.5;
                    }
                });
            } else if (reloadProgress < 0.7) {
                gunGroup.traverse(child => {
                    if (child.name === 'bolt' || child.name === 'bolt_knob') {
                        child.position.z = child.userData.basePos.z + 0.08;
                        child.rotation.z = child.userData.baseRot.z + 0.5;
                    }
                });

                const t = (reloadProgress - 0.3) / 0.4;
                const magOffset = t < 0.5 ? (t * 2) : ((1 - t) * 2);
                gunGroup.traverse(child => {
                    if (child.name === 'magazine') {
                        child.position.y = child.userData.basePos.y - magOffset * 0.3;
                    }
                });
            } else {
                const t = (reloadProgress - 0.7) / 0.3;
                gunGroup.traverse(child => {
                    if (child.name === 'bolt' || child.name === 'bolt_knob') {
                        child.position.z = child.userData.basePos.z + (1 - t) * 0.08;
                        child.rotation.z = child.userData.baseRot.z + (1 - t) * 0.5;
                    }
                });
            }
        } else if (currentWeapon.id === 'SHOTGUN') {
            targetRotZ -= 0.85; // Tilt the other way so bottom port is highly visible!
            targetRotX -= 0.12;
            targetGunY -= 0.05;
            targetGunX += 0.08; // Adjust side centering

            const cycle = (reloadTimer * 2.5) % 1.0;
            
            // Find shell and make it slide into the receiver
            const shell = gunGroup.getObjectByName('shell');
            if (shell) {
                shell.visible = true;
                // Slide red shell from below/behind into the receiver load gate
                const t = cycle;
                shell.position.y = -0.16 + t * 0.12;
                shell.position.z = 0.18 - t * 0.22;
                
                // Animate left hand following the shell
                const handLeft = gunGroup.getObjectByName('handLeft');
                if (handLeft) {
                    handLeft.position.copy(shell.position);
                    handLeft.position.x += 0.01;
                }
            }
        }
    }

    gunGroup.position.x = THREE.MathUtils.lerp(gunGroup.position.x, targetGunX, delta * 14);
    gunGroup.position.y = THREE.MathUtils.lerp(gunGroup.position.y, targetGunY, delta * 14);
    gunGroup.position.z = THREE.MathUtils.lerp(gunGroup.position.z, targetGunZ, delta * 16);

    gunGroup.rotation.x = THREE.MathUtils.lerp(gunGroup.rotation.x, targetRotX, delta * 14);
    gunGroup.rotation.y = THREE.MathUtils.lerp(gunGroup.rotation.y, targetRotY, delta * 14);
    gunGroup.rotation.z = THREE.MathUtils.lerp(gunGroup.rotation.z, targetRotZ, delta * 14);
}

// 27. Master Game Animation Loop
const clock = new THREE.Clock();
let radarUpdateTimer = 0;

function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.05);

    if (gameStarted) {
        if (window.testModeOpen) {
            soundEngine.stopRifleBurst();
            mouseHeld = false;
            renderer.render(scene, camera);
            return;
        }

        camera.rotation.y = yaw;
        camera.rotation.x = pitch;
        camera.updateMatrixWorld();

        const { moving, sprint, crouching } = updatePlayer(delta);

        spreadSystem.update(delta, {
            isFiring: mouseHeld,
            moving,
            sprinting: sprint,
            aiming,
            crouching
        });
        uiManager.updateCrosshair(spreadSystem.getCrosshairPositions(), aiming, currentWeapon.id);
        uiManager.updateHUD(getHUDState());

        if (mouseHeld && !window.chatInputActive) {
            shoot();
        } else {
            soundEngine.stopRifleBurst();
        }

        if (fireCooldown > 0) {
            fireCooldown = Math.max(0, fireCooldown - delta);
        }

        updateReload(delta);
        updateGrenadeReplenish(delta);
        updateBushStealth(delta);

        if (!multiplayerManager.isMultiplayer || multiplayerManager.isHost) {
            const playersList = [{
                id: 'host',
                pos: camera.position,
                isCrouching: isCrouching,
                isPlayerHidden: isPlayerHidden,
                damageFn: (amount, source) => {
                    damagePlayer(amount, source || 'enemy');
                }
            }];

            if (multiplayerManager.isMultiplayer && multiplayerManager.isHost) {
                for (const peerId in multiplayerManager.players) {
                    if (peerId === 'host') continue;
                    const pData = multiplayerManager.players[peerId];
                    if (pData && pData.pos) {
                        playersList.push({
                            id: peerId,
                            pos: new THREE.Vector3(pData.pos.x, pData.pos.y, pData.pos.z),
                            isCrouching: !!pData.crouching,
                            isPlayerHidden: false,
                            damageFn: (amount, source) => {
                                const conn = multiplayerManager.connections[peerId];
                                if (conn) {
                                    conn.send({
                                        type: 'damage_taken',
                                        amount: amount,
                                        source: source || 'enemy'
                                    });
                                }
                            }
                        });
                    }
                }
            }

            // Update enemies with stealth state, solid obstacle line-of-sight & ladder climbing
            if (!testModeState.freezeEnemies) {
                const effectiveDelta = delta * (testModeState.enemySpeedMult !== undefined ? testModeState.enemySpeedMult : 1.0);
                enemyManager.update(
                    effectiveDelta,
                    playersList,
                    getSimpleGround,
                    (dmg, src) => {
                        if (testModeState.passiveAI) return;
                        const mult = testModeState.enemyDamageMult !== undefined ? testModeState.enemyDamageMult : 1.0;
                        damagePlayer(dmg * mult, src);
                    },
                    false,
                    obstacles,
                    ladders
                );
            }

            vehicleManager.update(delta, camera.position, obstacles, (dmg, src) => {
                damagePlayer(dmg, src);
            }, null, getSimpleGround);
        } else {
            // Client only updates bullets visually
            enemyManager.bulletManager.update(delta, camera.position, () => {}, obstacles);
        }

        updateBullets(delta);
        updateActiveGrenades(delta);
        updateBulletHoles(delta);

        if (!multiplayerManager.isMultiplayer || multiplayerManager.isHost) {
            updateWaves(delta);
        }

        // Periodically send local player state to peer / host
        if (multiplayerManager.isMultiplayer) {
            const timeNow = clock.getElapsedTime();
            if (timeNow - multiplayerManager.lastStateSend > multiplayerManager.sendInterval) {
                multiplayerManager.sendLocalPlayerState(
                    camera.position,
                    yaw,
                    pitch,
                    currentWeaponKey,
                    aiming,
                    isCrouching,
                    health,
                    kills
                );
                multiplayerManager.lastStateSend = timeNow;
            }
            multiplayerManager.update(delta);
        }
        updateAimAndGun(delta, moving, sprint);

        // Render Heading-Up Tactical Topographic Minimap (Throttled to 20 FPS for silky performance)
        radarUpdateTimer += delta;
        if (radarUpdateTimer >= 0.05) {
            radarUpdateTimer = 0;
            uiManager.updateRadar({
                playerPos: camera.position,
                playerYaw: yaw,
                enemies: enemyManager.enemies,
                vehicles: vehicleManager.vehicles,
                buildings,
                ladders,
                medkits: enemyManager.medkits.map(m => m.position),
                grenades: activeGrenades,
                waterBodies,
                riverWaypoints,
                getTerrainHeight
            }, 0.05);
        }

    }

    // High-Performance Three.js Water Library Simulation
    const animTime = clock.getElapsedTime();
    for (const water of waterInstances) {
        if (water.material && water.material.uniforms && water.material.uniforms['time']) {
            water.material.uniforms['time'].value = animTime * 0.5;
        }
    }

    uiManager.updateDamageFlash(delta);
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});

// Start loop
animate();