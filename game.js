import * as THREE from 'three';
import { DIFFICULTY_LEVELS, setDifficulty, getDifficulty } from './src/difficulty.js';
import { SpreadSystem } from './src/spread.js';
import { GrenadePhysics } from './src/grenades.js';
import { EnemyManager } from './src/enemies.js';
import { VehicleManager } from './src/vehicles.js';
import { UIManager, WEAPON_CONFIGS } from './src/ui.js';
import { soundEngine } from './src/audio.js';
import { MultiplayerManager } from './src/multiplayer.js';

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
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
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

// 4. World Collections & Materials
const buildings = [];
const trees = [];
const stealthBushes = [];
const obstacles = [];
const ladders = [];
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

// Ground Mesh (Expanded 1000m x 1000m)
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
staticRaycastTargets.push(ground);

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

// 5. Multi-Lane Road System with Clean Non-Intersecting Markings
function makeRoad(x, z, width, length, rotation = 0) {
    const roadGroup = new THREE.Group();
    roadGroup.position.set(x, 0, z);
    roadGroup.rotation.y = rotation;

    // Pristine dark asphalt surface
    const road = new THREE.Mesh(
        new THREE.BoxGeometry(width, 0.05, length),
        roadMat
    );
    road.position.set(0, 0.025, 0);
    road.receiveShadow = true;
    roadGroup.add(road);

    // Segmented Non-Intersecting Spans (Stops 12m before intersections to eliminate overlaps)
    const sideW = 2.4;
    const laneSpans = [
        [-length / 2 + 10, -132],
        [-108, -12],
        [12, 108],
        [132, length / 2 - 10]
    ];

    const yellowLineMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f });
    const whiteLineMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

    for (const [startZ, endZ] of laneSpans) {
        const spanLength = endZ - startZ;
        const centerZ = (startZ + endZ) / 2;

        // Sidewalk Curbs
        const side1 = new THREE.Mesh(new THREE.BoxGeometry(sideW, 0.14, spanLength), sidewalkMat);
        side1.position.set(-width / 2 - sideW / 2, 0.07, centerZ);
        side1.receiveShadow = true;
        roadGroup.add(side1);

        const side2 = new THREE.Mesh(new THREE.BoxGeometry(sideW, 0.14, spanLength), sidewalkMat);
        side2.position.set(width / 2 + sideW / 2, 0.07, centerZ);
        side2.receiveShadow = true;
        roadGroup.add(side2);

        // Double Solid Yellow Centerlines (Segmented)
        for (let offset of [-0.25, 0.25]) {
            const doubleYellow = new THREE.Mesh(
                new THREE.BoxGeometry(0.14, 0.065, spanLength),
                yellowLineMat
            );
            doubleYellow.position.set(offset, 0.06, centerZ);
            roadGroup.add(doubleYellow);
        }

        // White Dashed Lane Dividers (Segmented)
        for (let laneOffset of [-width / 4, width / 4]) {
            for (let i = startZ + 4; i < endZ - 4; i += 7) {
                const dash = new THREE.Mesh(
                    new THREE.BoxGeometry(0.18, 0.065, 3.5),
                    whiteLineMat
                );
                dash.position.set(laneOffset, 0.06, i);
                roadGroup.add(dash);
            }
        }
    }

    scene.add(roadGroup);
    staticRaycastTargets.push(roadGroup);
}

// Build Grand Road Grid
makeRoad(0, 0, 16, 960, 0);                 // Main North-South Central Avenue
makeRoad(0, 0, 16, 960, Math.PI / 2);       // Main East-West Central Boulevard
makeRoad(120, 0, 14, 960, 0);               // East Avenue
makeRoad(-120, 0, 14, 960, 0);              // West Avenue
makeRoad(0, 120, 14, 960, Math.PI / 2);     // North Boulevard
makeRoad(0, -120, 14, 960, Math.PI / 2);    // South Boulevard

// 6. Enterable Low-Poly Architecture: Yellow Cottages, Alpine Log Cabins, Modern Pool Villas & High-Rises
function createLowPolyCottage({ x, z, width = 12, depth = 11, height = 5.8 }) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const yellowWallMat = new THREE.MeshStandardMaterial({ color: 0xf5cd79, roughness: 0.82 });
    const stonePlinthMat = new THREE.MeshStandardMaterial({ color: 0x718093, roughness: 0.95 });
    const coralRoofMat = new THREE.MeshStandardMaterial({ color: 0xe55039, roughness: 0.8 });
    const trimWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.7 });
    const woodFloorMat = new THREE.MeshStandardMaterial({ color: 0xc49660, roughness: 0.85 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.85 });
    const cyanGlassMat = new THREE.MeshStandardMaterial({ color: 0x74b9ff, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.55 });
    const brickChimneyMat = new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.9 });
    const smokeMat = new THREE.MeshStandardMaterial({ color: 0xecf0f1, transparent: true, opacity: 0.65, flatShading: true });
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x8a6240, roughness: 0.9 });
    const pathMat = new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.95 });

    const wallThick = 0.38;
    const doorW = 2.2;
    const doorH = 2.8;
    const doorX = -2.2;

    // 1. Interior Hardwood Floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(width - 0.2, 0.08, depth - 0.2), woodFloorMat);
    floor.position.set(0, 0.04, 0);
    floor.receiveShadow = true;
    group.add(floor);

    // 2. Outer Hollow Walls
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(width, height, wallThick), yellowWallMat);
    backWall.position.set(0, height / 2, -depth / 2 + wallThick / 2);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    group.add(backWall);

    const backPlinth = new THREE.Mesh(new THREE.BoxGeometry(width + 0.15, 1.2, wallThick + 0.15), stonePlinthMat);
    backPlinth.position.set(0, 0.6, -depth / 2 + wallThick / 2);
    group.add(backPlinth);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, height, depth - wallThick * 2), yellowWallMat);
    leftWall.position.set(-width / 2 + wallThick / 2, height / 2, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    group.add(leftWall);

    const leftPlinth = new THREE.Mesh(new THREE.BoxGeometry(wallThick + 0.15, 1.2, depth), stonePlinthMat);
    leftPlinth.position.set(-width / 2 + wallThick / 2, 0.6, 0);
    group.add(leftPlinth);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, height, depth - wallThick * 2), yellowWallMat);
    rightWall.position.set(width / 2 - wallThick / 2, height / 2, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    group.add(rightWall);

    const rightPlinth = new THREE.Mesh(new THREE.BoxGeometry(wallThick + 0.15, 1.2, depth), stonePlinthMat);
    rightPlinth.position.set(width / 2 - wallThick / 2, 0.6, 0);
    group.add(rightPlinth);

    const frontLeftW = (width / 2 + doorX - doorW / 2);
    const frontLeftX = -width / 2 + frontLeftW / 2;
    const frontLeftWall = new THREE.Mesh(new THREE.BoxGeometry(frontLeftW, height, wallThick), yellowWallMat);
    frontLeftWall.position.set(frontLeftX, height / 2, depth / 2 - wallThick / 2);
    frontLeftWall.castShadow = true;
    group.add(frontLeftWall);

    const frontLeftPlinth = new THREE.Mesh(new THREE.BoxGeometry(frontLeftW, 1.2, wallThick + 0.15), stonePlinthMat);
    frontLeftPlinth.position.set(frontLeftX, 0.6, depth / 2 - wallThick / 2);
    group.add(frontLeftPlinth);

    const frontRightW = (width / 2 - (doorX + doorW / 2));
    const frontRightX = width / 2 - frontRightW / 2;
    const frontRightWall = new THREE.Mesh(new THREE.BoxGeometry(frontRightW, height, wallThick), yellowWallMat);
    frontRightWall.position.set(frontRightX, height / 2, depth / 2 - wallThick / 2);
    frontRightWall.castShadow = true;
    group.add(frontRightWall);

    const frontRightPlinth = new THREE.Mesh(new THREE.BoxGeometry(frontRightW, 1.2, wallThick + 0.15), stonePlinthMat);
    frontRightPlinth.position.set(frontRightX, 0.6, depth / 2 - wallThick / 2);
    group.add(frontRightPlinth);

    const lintelH = height - doorH;
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW, lintelH, wallThick), yellowWallMat);
    lintel.position.set(doorX, doorH + lintelH / 2, depth / 2 - wallThick / 2);
    lintel.castShadow = true;
    group.add(lintel);

    const awning = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.6, 0.16, 1.3), coralRoofMat);
    awning.position.set(doorX, doorH + 0.2, depth / 2 + 0.55);
    awning.rotation.x = 0.2;
    awning.castShadow = true;
    group.add(awning);

    const doorFrameL = new THREE.Mesh(new THREE.BoxGeometry(0.12, doorH, 0.12), trimWhiteMat);
    doorFrameL.position.set(doorX - doorW / 2, doorH / 2, depth / 2 + 0.02);
    group.add(doorFrameL);
    const doorFrameR = new THREE.Mesh(new THREE.BoxGeometry(0.12, doorH, 0.12), trimWhiteMat);
    doorFrameR.position.set(doorX + doorW / 2, doorH / 2, depth / 2 + 0.02);
    group.add(doorFrameR);

    const step = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.4, 0.15, 0.8), stonePlinthMat);
    step.position.set(doorX, 0.075, depth / 2 + 0.4);
    step.receiveShadow = true;
    group.add(step);

    // 3. Coral Red Pitched Gable Roof
    const roofH = 3.6;
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-width / 2 - 0.5, 0);
    roofShape.lineTo(0, roofH);
    roofShape.lineTo(width / 2 + 0.5, 0);
    roofShape.closePath();

    const extrudeSettings = {
        depth: depth + 1.0,
        bevelEnabled: true,
        bevelSegments: 1,
        steps: 1,
        bevelSize: 0.12,
        bevelThickness: 0.12
    };
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
    const roof = new THREE.Mesh(roofGeo, coralRoofMat);
    roof.position.set(0, height, -depth / 2 - 0.5);
    roof.castShadow = true;
    roof.receiveShadow = true;
    group.add(roof);

    const gableShape = new THREE.Shape();
    gableShape.moveTo(-width / 2, 0);
    gableShape.lineTo(0, roofH - 0.1);
    gableShape.lineTo(width / 2, 0);
    gableShape.closePath();
    const gableGeo = new THREE.ShapeGeometry(gableShape);

    const frontGable = new THREE.Mesh(gableGeo, yellowWallMat);
    frontGable.position.set(0, height, depth / 2 - 0.02);
    group.add(frontGable);

    const backGable = frontGable.clone();
    backGable.rotation.y = Math.PI;
    backGable.position.z = -depth / 2 + 0.02;
    group.add(backGable);

    const atticWin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.1), cyanGlassMat);
    atticWin.position.set(0, height + roofH * 0.45, depth / 2 + 0.05);
    group.add(atticWin);

    // 4. Windows with Transparent Glass & White Framing
    const winFX = frontRightX;
    const winF = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.8, 0.08), cyanGlassMat);
    winF.position.set(winFX, 2.8, depth / 2);
    group.add(winF);

    const frameF = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.1, 0.04), trimWhiteMat);
    frameF.position.set(winFX, 2.8, depth / 2 + 0.02);
    group.add(frameF);

    for (let side = -1; side <= 1; side += 2) {
        const sWin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.8, 2.2), cyanGlassMat);
        sWin.position.set(side * (width / 2), 2.8, 0);
        group.add(sWin);
        const sFrame = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.1, 2.5), trimWhiteMat);
        sFrame.position.set(side * (width / 2 + 0.02), 2.8, 0);
        group.add(sFrame);
    }

    // 5. Interior Furnishings & Tactical Cover
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 1.3), darkWoodMat);
    tableTop.position.set(1.8, 0.85, -1.5);
    tableTop.castShadow = true;
    group.add(tableTop);

    const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.85, 0.12), darkWoodMat);
    leg1.position.set(1.8 - 1.0, 0.425, -1.5 - 0.5);
    group.add(leg1);
    const leg2 = leg1.clone();
    leg2.position.set(1.8 + 1.0, 0.425, -1.5 - 0.5);
    group.add(leg2);
    const leg3 = leg1.clone();
    leg3.position.set(1.8 - 1.0, 0.425, -1.5 + 0.5);
    group.add(leg3);
    const leg4 = leg1.clone();
    leg4.position.set(1.8 + 1.0, 0.425, -1.5 + 0.5);
    group.add(leg4);

    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 1.2), fenceMat);
    crate.position.set(-2.6, 0.55, -2.4);
    crate.castShadow = true;
    group.add(crate);

    const ceilingLamp = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffd32a }));
    ceilingLamp.position.set(0, height - 0.4, 0);
    group.add(ceilingLamp);

    // 6. Chimney & Smoke
    const chX = width / 3.2;
    const chZ = -depth / 4;
    const chH = 4.8;
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.2, chH, 1.2), brickChimneyMat);
    chimney.position.set(chX, height + roofH * 0.45, chZ);
    chimney.castShadow = true;
    group.add(chimney);

    const chimneyCap = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.2, 1.4), stonePlinthMat);
    chimneyCap.position.set(chX, height + roofH * 0.45 + chH / 2, chZ);
    group.add(chimneyCap);

    for (let p = 0; p < 3; p++) {
        const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35 + p * 0.15, 1), smokeMat);
        puff.position.set(chX + p * 0.18, height + roofH * 0.45 + chH / 2 + 0.5 + p * 0.7, chZ - p * 0.15);
        group.add(puff);
    }

    // 7. Stone Walkway
    const pathOffsets = [
        [doorX, depth / 2 + 1.2, 1.6, 0.9],
        [doorX - 0.3, depth / 2 + 2.2, 1.5, 0.9],
        [doorX - 0.1, depth / 2 + 3.2, 1.6, 0.9]
    ];
    for (const [px, pz, pw, pd] of pathOffsets) {
        const paver = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.06, pd), pathMat);
        paver.position.set(px, 0.03, pz);
        paver.receiveShadow = true;
        group.add(paver);
    }

    // 8. Garden Fence
    const fenceStartX = width / 2 + 0.3;
    const fenceZ = depth / 2 + 0.3;
    for (let f = 0; f < 5; f++) {
        const picket = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.06), fenceMat);
        picket.position.set(fenceStartX - f * 0.45, 0.55, fenceZ);
        group.add(picket);
    }
    const fenceRail = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.04), fenceMat);
    fenceRail.position.set(fenceStartX - 1.0, 0.7, fenceZ);
    group.add(fenceRail);

    // 9. Obstacles Registration
    obstacles.push({
        x: x,
        z: z - depth / 2 + wallThick / 2,
        w: width,
        d: wallThick + 0.1,
        bottom: 0,
        top: height
    });
    obstacles.push({
        x: x - width / 2 + wallThick / 2,
        z: z,
        w: wallThick + 0.1,
        d: depth,
        bottom: 0,
        top: height
    });
    obstacles.push({
        x: x + width / 2 - wallThick / 2,
        z: z,
        w: wallThick + 0.1,
        d: depth,
        bottom: 0,
        top: height
    });
    obstacles.push({
        x: x + frontLeftX,
        z: z + depth / 2 - wallThick / 2,
        w: frontLeftW,
        d: wallThick + 0.1,
        bottom: 0,
        top: height
    });
    obstacles.push({
        x: x + frontRightX,
        z: z + depth / 2 - wallThick / 2,
        w: frontRightW,
        d: wallThick + 0.1,
        bottom: 0,
        top: height
    });
    obstacles.push({
        x: x + doorX,
        z: z + depth / 2 - wallThick / 2,
        w: doorW,
        d: wallThick + 0.1,
        bottom: doorH,
        top: height
    });
    obstacles.push({
        x: x + 1.8,
        z: z - 1.5,
        w: 2.5,
        d: 1.4,
        bottom: 0,
        top: 0.95
    });
    obstacles.push({
        x: x - 2.6,
        z: z - 2.4,
        w: 1.3,
        d: 1.3,
        bottom: 0,
        top: 1.15
    });
    const chimneyTop = height + roofH * 0.45 + chH / 2 + 0.25;
    obstacles.push({
        x: x + chX,
        z: z + chZ,
        w: 1.4,
        d: 1.4,
        bottom: height,
        top: chimneyTop
    });

    buildings.push({
        x,
        z,
        w: width,
        d: depth,
        h: height,
        style: 'cottage',
        isEnterable: true,
        floorY: 0.05,
        roofHeight: roofH,
        chimney: { x: x + chX, z: z + chZ, w: 1.4, d: 1.4, top: chimneyTop }
    });

    scene.add(group);
    staticRaycastTargets.push(group);
}

function createLowPolyLogCabin({ x, z, width = 11, depth = 11, height = 5.6 }) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const logMat1 = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.92 });
    const logMat2 = new THREE.MeshStandardMaterial({ color: 0x6e3b18, roughness: 0.95 });
    const slateShingleMat = new THREE.MeshStandardMaterial({ color: 0x3d444b, roughness: 0.88 });
    const woodTrimMat = new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.85 });
    const woodFloorMat = new THREE.MeshStandardMaterial({ color: 0x7c4e2a, roughness: 0.9 });
    const stoneBoulderMat = new THREE.MeshStandardMaterial({ color: 0x57606f, roughness: 0.96, flatShading: true });
    const cabinGlassMat = new THREE.MeshStandardMaterial({ color: 0xf6e58d, roughness: 0.2, metalness: 0.2, transparent: true, opacity: 0.6 });

    const logRadius = 0.28;
    const numLogs = 9;
    const logH = height / numLogs;
    const doorW = 2.2;
    const doorH = 2.8;

    // 1. Rustic Timber Floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(width - 0.2, 0.08, depth - 0.2), woodFloorMat);
    floor.position.set(0, 0.04, 0);
    floor.receiveShadow = true;
    group.add(floor);

    // 2. Base Boulder Ring
    const boulderCoords = [
        [-width / 2, depth / 2, 0.9],
        [width / 2, depth / 2, 1.1],
        [-width / 2, -depth / 2, 1.0],
        [width / 2, -depth / 2, 0.95],
        [-width / 2 - 0.2, 0, 0.85],
        [width / 2 + 0.2, 0, 0.9]
    ];
    for (const [bx, bz, br] of boulderCoords) {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(br, 1), stoneBoulderMat);
        rock.position.set(bx, br * 0.45, bz);
        rock.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
        rock.castShadow = true;
        rock.receiveShadow = true;
        group.add(rock);
    }

    // 3. Hollow Stacked Log Walls
    for (let i = 0; i < numLogs; i++) {
        const logY = 0.3 + i * logH;
        const curMat = i % 2 === 0 ? logMat1 : logMat2;

        const backLog = new THREE.Mesh(new THREE.CylinderGeometry(logRadius, logRadius, width + 1.0, 7), curMat);
        backLog.rotation.z = Math.PI / 2;
        backLog.position.set(0, logY, -depth / 2 + logRadius);
        backLog.castShadow = true;
        group.add(backLog);

        const leftLog = new THREE.Mesh(new THREE.CylinderGeometry(logRadius, logRadius, depth + 1.0, 7), curMat);
        leftLog.rotation.x = Math.PI / 2;
        leftLog.position.set(-width / 2 + logRadius, logY + logH * 0.5, 0);
        leftLog.castShadow = true;
        group.add(leftLog);

        const rightLog = leftLog.clone();
        rightLog.position.x = width / 2 - logRadius;
        group.add(rightLog);

        if (logY < doorH) {
            const frontSegW = (width - doorW) / 2;
            const frontLogL = new THREE.Mesh(new THREE.CylinderGeometry(logRadius, logRadius, frontSegW + 0.5, 7), curMat);
            frontLogL.rotation.z = Math.PI / 2;
            frontLogL.position.set(-width / 2 + frontSegW / 2, logY, depth / 2 - logRadius);
            frontLogL.castShadow = true;
            group.add(frontLogL);

            const frontLogR = new THREE.Mesh(new THREE.CylinderGeometry(logRadius, logRadius, frontSegW + 0.5, 7), curMat);
            frontLogR.rotation.z = Math.PI / 2;
            frontLogR.position.set(width / 2 - frontSegW / 2, logY, depth / 2 - logRadius);
            frontLogR.castShadow = true;
            group.add(frontLogR);
        } else {
            const headerLog = new THREE.Mesh(new THREE.CylinderGeometry(logRadius, logRadius, width + 1.0, 7), curMat);
            headerLog.rotation.z = Math.PI / 2;
            headerLog.position.set(0, logY, depth / 2 - logRadius);
            headerLog.castShadow = true;
            group.add(headerLog);
        }
    }

    // 4. Steep A-Frame Roof
    const roofH = 4.4;
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-width / 2 - 0.8, 0);
    roofShape.lineTo(0, roofH);
    roofShape.lineTo(width / 2 + 0.8, 0);
    roofShape.closePath();

    const extrudeSettings = {
        depth: depth + 1.4,
        bevelEnabled: true,
        bevelSegments: 1,
        steps: 1,
        bevelSize: 0.15,
        bevelThickness: 0.15
    };
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
    const roof = new THREE.Mesh(roofGeo, slateShingleMat);
    roof.position.set(0, height - 0.2, -depth / 2 - 0.7);
    roof.castShadow = true;
    roof.receiveShadow = true;
    group.add(roof);

    const ridgeBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, depth + 1.8, 6), woodTrimMat);
    ridgeBeam.rotation.x = Math.PI / 2;
    ridgeBeam.position.set(0, height + roofH - 0.1, 0);
    group.add(ridgeBeam);

    const gableShape = new THREE.Shape();
    gableShape.moveTo(-width / 2, 0);
    gableShape.lineTo(0, roofH - 0.2);
    gableShape.lineTo(width / 2, 0);
    gableShape.closePath();
    const gableGeo = new THREE.ShapeGeometry(gableShape);

    const frontGable = new THREE.Mesh(gableGeo, logMat1);
    frontGable.position.set(0, height - 0.2, depth / 2 - 0.05);
    group.add(frontGable);

    const backGable = frontGable.clone();
    backGable.rotation.y = Math.PI;
    backGable.position.z = -depth / 2 + 0.05;
    group.add(backGable);

    // 5. Porch Platform & Steps
    const porch = new THREE.Mesh(new THREE.BoxGeometry(doorW + 1.2, 0.22, 1.8), woodTrimMat);
    porch.position.set(0, 0.11, depth / 2 + 0.9);
    porch.receiveShadow = true;
    group.add(porch);

    const porchStep = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.8, 0.11, 0.6), woodTrimMat);
    porchStep.position.set(0, 0.055, depth / 2 + 1.9);
    group.add(porchStep);

    const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(doorW + 1.4, 0.14, 1.5), slateShingleMat);
    porchRoof.position.set(0, doorH + 0.4, depth / 2 + 0.85);
    porchRoof.rotation.x = 0.28;
    group.add(porchRoof);

    // 6. Windows
    for (let side = -1; side <= 1; side += 2) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 0.12), cabinGlassMat);
        win.position.set(side * (width / 3), 2.4, depth / 2 + 0.1);
        group.add(win);
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.65, 0.08), woodTrimMat);
        frame.position.set(side * (width / 3), 2.4, depth / 2 + 0.06);
        group.add(frame);
    }

    // 7. Interior Fireplace & Cover Crate
    const fireplace = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.2, 1.1), stoneBoulderMat);
    fireplace.position.set(0, 1.6, -depth / 2 + 0.7);
    fireplace.castShadow = true;
    group.add(fireplace);

    const hearthEmber = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.6), new THREE.MeshBasicMaterial({ color: 0xff6348 }));
    hearthEmber.position.set(0, 0.25, -depth / 2 + 0.95);
    group.add(hearthEmber);

    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.2), woodTrimMat);
    crate.position.set(-2.4, 0.5, 0);
    crate.castShadow = true;
    group.add(crate);

    // 8. Chimney
    const chX = -width / 3.2;
    const chZ = -depth / 4;
    const chH = 5.2;
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.3, chH, 1.3), stoneBoulderMat);
    chimney.position.set(chX, height + roofH * 0.45, chZ);
    chimney.castShadow = true;
    group.add(chimney);

    // 9. Precision Obstacles
    const wallThick = 0.55;
    const frontSegW = (width - doorW) / 2;

    obstacles.push({
        x: x,
        z: z - depth / 2 + wallThick / 2,
        w: width,
        d: wallThick,
        bottom: 0,
        top: height
    });
    obstacles.push({
        x: x - width / 2 + wallThick / 2,
        z: z,
        w: wallThick,
        d: depth,
        bottom: 0,
        top: height
    });
    obstacles.push({
        x: x + width / 2 - wallThick / 2,
        z: z,
        w: wallThick,
        d: depth,
        bottom: 0,
        top: height
    });
    obstacles.push({
        x: x - width / 2 + frontSegW / 2,
        z: z + depth / 2 - wallThick / 2,
        w: frontSegW,
        d: wallThick,
        bottom: 0,
        top: height
    });
    obstacles.push({
        x: x + width / 2 - frontSegW / 2,
        z: z + depth / 2 - wallThick / 2,
        w: frontSegW,
        d: wallThick,
        bottom: 0,
        top: height
    });
    obstacles.push({
        x: x,
        z: z + depth / 2 - wallThick / 2,
        w: doorW,
        d: wallThick,
        bottom: doorH,
        top: height
    });
    obstacles.push({
        x: x,
        z: z - depth / 2 + 0.7,
        w: 2.3,
        d: 1.2,
        bottom: 0,
        top: 3.2
    });
    obstacles.push({
        x: x - 2.4,
        z: z,
        w: 1.3,
        d: 1.3,
        bottom: 0,
        top: 1.05
    });
    const chimneyTop = height + roofH * 0.45 + chH / 2;
    obstacles.push({
        x: x + chX,
        z: z + chZ,
        w: 1.6,
        d: 1.6,
        bottom: height,
        top: chimneyTop
    });

    buildings.push({
        x,
        z,
        w: width,
        d: depth,
        h: height,
        style: 'cabin',
        isEnterable: true,
        floorY: 0.05,
        roofHeight: roofH,
        chimney: { x: x + chX, z: z + chZ, w: 1.6, d: 1.6, top: chimneyTop }
    });

    scene.add(group);
    staticRaycastTargets.push(group);
}

function createLowPolyModernVilla({ x, z, width = 16, depth = 15, height = 7.6 }) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const whiteWallMat = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.65 });
    const slateWallMat = new THREE.MeshStandardMaterial({ color: 0x2f3640, roughness: 0.7 });
    const darkTrimMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.8 });
    const tileFloorMat = new THREE.MeshStandardMaterial({ color: 0xdcdde1, roughness: 0.5 });
    const deckWoodMat = new THREE.MeshStandardMaterial({ color: 0xc89666, roughness: 0.78 });
    const poolWaterMat = new THREE.MeshStandardMaterial({ color: 0x00d2d3, roughness: 0.08, metalness: 0.6, transparent: true, opacity: 0.88 });
    const poolBorderMat = new THREE.MeshStandardMaterial({ color: 0xdcdde1, roughness: 0.8 });
    const panoramicGlassMat = new THREE.MeshStandardMaterial({ color: 0x4a69bd, roughness: 0.1, metalness: 0.45, transparent: true, opacity: 0.5 });
    const couchMat = new THREE.MeshStandardMaterial({ color: 0x2f3640, roughness: 0.8 });
    const loungerMat = new THREE.MeshStandardMaterial({ color: 0x718093, roughness: 0.8 });
    const palmLeafMat = new THREE.MeshStandardMaterial({ color: 0x2ed573, roughness: 0.75, flatShading: true });
    const palmTrunkMat = new THREE.MeshStandardMaterial({ color: 0x573b23, roughness: 0.9 });

    const groundH = 3.8;
    const upperH = height - groundH;
    const wallThick = 0.4;

    // 1. Polished Ground Floor Interior Tile
    const floor = new THREE.Mesh(new THREE.BoxGeometry(width * 0.7, 0.08, depth * 0.8), tileFloorMat);
    floor.position.set(-width * 0.12, 0.04, 0);
    floor.receiveShadow = true;
    group.add(floor);

    // 2. Ground Floor Hollow Walls
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(width * 0.7, groundH, wallThick), whiteWallMat);
    backWall.position.set(-width * 0.12, groundH / 2, -depth * 0.4 + wallThick / 2);
    backWall.castShadow = true;
    group.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, groundH, depth * 0.8), whiteWallMat);
    leftWall.position.set(-width * 0.47 + wallThick / 2, groundH / 2, 0);
    leftWall.castShadow = true;
    group.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, groundH, depth * 0.8), slateWallMat);
    rightWall.position.set(width * 0.23 - wallThick / 2, groundH / 2, 0);
    rightWall.castShadow = true;
    group.add(rightWall);

    const doorW = 3.6;
    const doorH = 3.2;
    const frontSegW = width * 0.7 - doorW;
    const frontWallLeft = new THREE.Mesh(new THREE.BoxGeometry(frontSegW, groundH, wallThick), whiteWallMat);
    frontWallLeft.position.set(-width * 0.47 + frontSegW / 2, groundH / 2, depth * 0.4 - wallThick / 2);
    frontWallLeft.castShadow = true;
    group.add(frontWallLeft);

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW, groundH - doorH, wallThick), darkTrimMat);
    lintel.position.set(width * 0.23 - doorW / 2, doorH + (groundH - doorH) / 2, depth * 0.4 - wallThick / 2);
    group.add(lintel);

    // 3. Interior Modern Couch & Coffee Table
    const couch = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.8, 1.4), couchMat);
    couch.position.set(-width * 0.2, 0.4, -depth * 0.15);
    couch.castShadow = true;
    group.add(couch);

    const table = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 1.0), darkTrimMat);
    table.position.set(-width * 0.2, 0.225, depth * 0.1);
    group.add(table);

    // 4. Cantilevered Upper Second Floor (Balcony Deck + Room)
    const upperDeck = new THREE.Mesh(new THREE.BoxGeometry(width * 0.75, 0.25, depth * 0.85), deckWoodMat);
    upperDeck.position.set(0, groundH + 0.125, depth * 0.05);
    upperDeck.receiveShadow = true;
    group.add(upperDeck);

    const upperRoom = new THREE.Mesh(new THREE.BoxGeometry(width * 0.5, upperH, depth * 0.6), slateWallMat);
    upperRoom.position.set(-width * 0.1, groundH + upperH / 2, -depth * 0.05);
    upperRoom.castShadow = true;
    group.add(upperRoom);

    const upperGlass = new THREE.Mesh(new THREE.BoxGeometry(width * 0.45, upperH * 0.75, 0.08), panoramicGlassMat);
    upperGlass.position.set(-width * 0.1, groundH + upperH * 0.5, depth * 0.25 + 0.04);
    group.add(upperGlass);

    const railing = new THREE.Mesh(new THREE.BoxGeometry(width * 0.75, 1.1, 0.06), panoramicGlassMat);
    railing.position.set(0, groundH + 0.65, depth * 0.47);
    group.add(railing);

    for (let s = 0; s < 6; s++) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.12, upperH * 0.9, 0.35), whiteWallMat);
        slat.position.set(width * 0.18 + s * 0.35, groundH + upperH * 0.5, depth * 0.47);
        group.add(slat);
    }

    // 5. Raised Teak Sundeck Patio
    const deckW = width * 0.52;
    const deckD = depth * 0.7;
    const deckH = 0.35;
    const deckX = width * 0.42;
    const deckZ = depth * 0.35;
    const sundeck = new THREE.Mesh(new THREE.BoxGeometry(deckW, deckH, deckD), deckWoodMat);
    sundeck.position.set(deckX, deckH / 2, deckZ);
    sundeck.receiveShadow = true;
    group.add(sundeck);

    const deckStep = new THREE.Mesh(new THREE.BoxGeometry(deckW, deckH * 0.5, 0.8), deckWoodMat);
    deckStep.position.set(deckX, deckH * 0.25, deckZ + deckD / 2 + 0.4);
    group.add(deckStep);

    // 6. Crystal-Blue Swimming Pool
    const poolW = 4.5;
    const poolD = 6.5;
    const poolX = deckX + 0.2;
    const poolZ = deckZ - 0.2;

    const poolRim = new THREE.Mesh(new THREE.BoxGeometry(poolW + 0.8, 0.38, poolD + 0.8), poolBorderMat);
    poolRim.position.set(poolX, 0.19, poolZ);
    group.add(poolRim);

    const poolWater = new THREE.Mesh(new THREE.BoxGeometry(poolW, 0.1, poolD), poolWaterMat);
    poolWater.position.set(poolX, 0.32, poolZ);
    group.add(poolWater);

    for (let l = 0; l < 2; l++) {
        const lounger = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 1.8), loungerMat);
        lounger.position.set(deckX - deckW / 2 + 1.2 + l * 1.1, deckH + 0.12, deckZ + deckD / 2 - 1.2);
        group.add(lounger);
    }

    const pergolaPost = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3.2, 0.15), darkTrimMat);
    pergolaPost.position.set(deckX - deckW / 2 + 0.3, 1.6, deckZ - deckD / 2 + 0.3);
    group.add(pergolaPost);

    const pergolaRoof = new THREE.Mesh(new THREE.BoxGeometry(deckW, 0.12, deckD * 0.45), darkTrimMat);
    pergolaRoof.position.set(deckX, 3.2, deckZ - deckD / 4);
    group.add(pergolaRoof);

    // Palm Tree
    const palm = new THREE.Group();
    palm.position.set(deckX - deckW / 2 + 0.8, deckH, deckZ - deckD / 2 + 0.8);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 3.2, 6), palmTrunkMat);
    trunk.position.y = 1.6;
    palm.add(trunk);

    for (let p = 0; p < 5; p++) {
        const ang = (p * Math.PI * 2) / 5;
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 1.6), palmLeafMat);
        leaf.position.set(Math.cos(ang) * 0.7, 3.2, Math.sin(ang) * 0.7);
        leaf.rotation.y = ang;
        leaf.rotation.x = 0.5;
        palm.add(leaf);
    }
    group.add(palm);

    // 7. Obstacles Registration
    obstacles.push({
        x: x - width * 0.12,
        z: z - depth * 0.4 + wallThick / 2,
        w: width * 0.7,
        d: wallThick,
        bottom: 0,
        top: groundH
    });
    obstacles.push({
        x: x - width * 0.47 + wallThick / 2,
        z: z,
        w: wallThick,
        d: depth * 0.8,
        bottom: 0,
        top: groundH
    });
    obstacles.push({
        x: x + width * 0.23 - wallThick / 2,
        z: z,
        w: wallThick,
        d: depth * 0.8,
        bottom: 0,
        top: groundH
    });
    obstacles.push({
        x: x - width * 0.47 + frontSegW / 2,
        z: z + depth * 0.4 - wallThick / 2,
        w: frontSegW,
        d: wallThick,
        bottom: 0,
        top: groundH
    });
    obstacles.push({
        x: x + width * 0.23 - doorW / 2,
        z: z + depth * 0.4 - wallThick / 2,
        w: doorW,
        d: wallThick,
        bottom: doorH,
        top: groundH
    });
    obstacles.push({
        x: x - width * 0.1,
        z: z - depth * 0.05,
        w: width * 0.5,
        d: depth * 0.6,
        bottom: groundH,
        top: height
    });
    obstacles.push({
        x: x - width * 0.2,
        z: z - depth * 0.15,
        w: 2.9,
        d: 1.5,
        bottom: 0,
        top: 0.85
    });

    buildings.push({
        x,
        z,
        w: width,
        d: depth,
        h: height,
        style: 'villa',
        isEnterable: true,
        floorY: 0.05,
        upperDeck: { x: x, z: z + depth * 0.05, w: width * 0.75, d: depth * 0.85, y: groundH + 0.25 },
        sundeck: { x: x + deckX, z: z + deckZ, w: deckW, d: deckD, y: deckH },
        roofHeight: 0
    });

    scene.add(group);
    staticRaycastTargets.push(group);
}

// Master Building Creator
function createBuilding({ x, z, width, depth, height, style = 'flat' }) {
    if (style === 'cottage') {
        createLowPolyCottage({ x, z, width, depth, height });
        return;
    }
    if (style === 'cabin') {
        createLowPolyLogCabin({ x, z, width, depth, height });
        return;
    }
    if (style === 'villa') {
        createLowPolyModernVilla({ x, z, width, depth, height });
        return;
    }

    // Downtown Flat High-Rises
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const houseColor = new THREE.Color(
        0.38 + Math.random() * 0.16,
        0.39 + Math.random() * 0.16,
        0.41 + Math.random() * 0.16
    );
    const bodyMat = new THREE.MeshStandardMaterial({ color: houseColor, roughness: 0.85 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), bodyMat);
    body.position.y = height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const roofBorder = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, 0.4, depth + 0.4), darkMat);
    roofBorder.position.y = height + 0.2;
    roofBorder.castShadow = true;
    group.add(roofBorder);

    const hvac = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 2.4), darkMat);
    hvac.position.set(width / 4, height + 0.8, depth / 4);
    hvac.castShadow = true;
    group.add(hvac);

    const hvacTop = height + 1.6;
    obstacles.push({
        x: x + width / 4,
        z: z + depth / 4,
        w: 2.6,
        d: 2.6,
        bottom: height - 0.5,
        top: hvacTop
    });

    let towerData = null;
    if (height > 16) {
        const tower = new THREE.Mesh(
            new THREE.CylinderGeometry(1.8, 1.8, 2.8, 10),
            new THREE.MeshStandardMaterial({ color: 0x5a483a, roughness: 0.9 })
        );
        tower.position.set(-width / 4, height + 2.2, -depth / 4);
        tower.castShadow = true;
        group.add(tower);

        const towerTop = height + 2.2 + 1.4;
        obstacles.push({
            x: x - width / 4,
            z: z - depth / 4,
            w: 3.8,
            d: 3.8,
            bottom: height - 0.5,
            top: towerTop
        });

        towerData = {
            x: x - width / 4,
            z: z - depth / 4,
            radius: 1.9,
            top: towerTop
        };
    }

    const bldgData = {
        x,
        z,
        w: width,
        d: depth,
        h: height,
        style: 'flat',
        roofHeight: 0,
        hvac: { x: x + width / 4, z: z + depth / 4, w: 2.6, d: 2.6, top: height + 1.6 },
        tower: towerData
    };

    obstacles.push({
        x,
        z,
        w: width,
        d: depth,
        bottom: 0,
        top: height
    });

    buildings.push(bldgData);

    const floors = Math.max(1, Math.floor(height / 3.2));
    const columns = Math.max(2, Math.floor(width / 3.2));

    for (let floor = 0; floor < floors; floor++) {
        for (let col = 0; col < columns; col++) {
            const win = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.08), glassMat);
            const wx = -width / 2 + (col + 0.6) * (width / columns);
            const wy = 2 + floor * 3.2;
            const wz = depth / 2 + 0.04;
            win.position.set(wx, wy, wz);
            group.add(win);

            const winBack = win.clone();
            winBack.position.z = -depth / 2 - 0.04;
            group.add(winBack);
        }
    }

    scene.add(group);
    staticRaycastTargets.push(group);
}

// Generate Massive Urban & Suburban Districts
function generateMassiveCity() {
    const blockRanges = [
        // Inner Downtown Blocks (High-Rises)
        { xs: [28, 56, 84], zs: [28, 56, 84], style: 'flat', minH: 14, maxH: 34 },
        { xs: [-84, -56, -28], zs: [28, 56, 84], style: 'flat', minH: 14, maxH: 34 },
        { xs: [28, 56, 84], zs: [-84, -56, -28], style: 'flat', minH: 14, maxH: 34 },
        { xs: [-84, -56, -28], zs: [-84, -56, -28], style: 'flat', minH: 14, maxH: 34 },

        // North Suburb District (Modern Luxury Pool Villas)
        { xs: [28, 68, 148, 192], zs: [148, 188, 228], style: 'villa', minH: 7.2, maxH: 8.4 },
        { xs: [-192, -148, -68, -28], zs: [148, 188, 228], style: 'villa', minH: 7.2, maxH: 8.4 },

        // West Suburb District (Yellow Suburban Cottages)
        { xs: [-238, -204, -170, -136], zs: [28, 58, 88], style: 'cottage', minH: 5.6, maxH: 6.8 },
        { xs: [-238, -204, -170, -136], zs: [-88, -58, -28], style: 'cottage', minH: 5.6, maxH: 6.8 },

        // East Alpine District (Alpine Timber Log Cabins)
        { xs: [136, 170, 204, 238], zs: [28, 58, 88], style: 'cabin', minH: 5.4, maxH: 6.4 },
        { xs: [136, 170, 204, 238], zs: [-88, -58, -28], style: 'cabin', minH: 5.4, maxH: 6.4 },

        // South Suburb District (Mixed Cottages & Cabins)
        { xs: [28, 64, 148, 188], zs: [-228, -188, -148], style: 'cottage', minH: 5.6, maxH: 6.8 },
        { xs: [-188, -148, -64, -28], zs: [-228, -188, -148], style: 'cabin', minH: 5.4, maxH: 6.4 }
    ];

    for (const range of blockRanges) {
        for (const x of range.xs) {
            for (const z of range.zs) {
                const isNearRoadX = Math.abs(x) < 14 || Math.abs(x - 120) < 12 || Math.abs(x + 120) < 12;
                const isNearRoadZ = Math.abs(z) < 14 || Math.abs(z - 120) < 12 || Math.abs(z + 120) < 12;
                if (isNearRoadX || isNearRoadZ) continue;

                let w = 12;
                let d = 11;
                if (range.style === 'villa') {
                    w = 16;
                    d = 15;
                } else if (range.style === 'flat') {
                    w = 14 + Math.random() * 6;
                    d = 14 + Math.random() * 6;
                }
                const h = range.minH + Math.random() * (range.maxH - range.minH);

                createBuilding({
                    x,
                    z,
                    width: w,
                    depth: d,
                    height: h,
                    style: range.style
                });
            }
        }
    }
}
generateMassiveCity();

// 7. Dense Low-Poly Forest Ecosystems & Wilderness Biomes
function isValidTreeLocation(x, z) {
    const roadClearMargin = 11.5;
    if (Math.abs(x) < roadClearMargin || Math.abs(z) < roadClearMargin) return false;
    if (Math.abs(x - 120) < roadClearMargin || Math.abs(x + 120) < roadClearMargin) return false;
    if (Math.abs(z - 120) < roadClearMargin || Math.abs(z + 120) < roadClearMargin) return false;

    for (const b of buildings) {
        const buffer = 4.0;
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

// Low-Poly Coniferous Pine Tree (Image 5)
function createLowPolyPine(x, z, h = 9.5) {
    if (!isValidTreeLocation(x, z)) return;

    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x332014, roughness: 0.95 });
    const pineMats = [
        new THREE.MeshStandardMaterial({ color: 0x143d24, roughness: 0.8, flatShading: true }),
        new THREE.MeshStandardMaterial({ color: 0x1f5431, roughness: 0.8, flatShading: true }),
        new THREE.MeshStandardMaterial({ color: 0x296e3b, roughness: 0.8, flatShading: true })
    ];

    const trunkH = h * 0.9;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.44, trunkH, 6), trunkMat);
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    group.add(trunk);

    const numTiers = 4;
    for (let t = 0; t < numTiers; t++) {
        const tierY = h * 0.38 + t * (h * 0.18);
        const tierR = (h * 0.28) * (1.0 - t * 0.2);
        const tierH = h * 0.32;
        const mat = pineMats[t % pineMats.length];

        const cone = new THREE.Mesh(new THREE.ConeGeometry(tierR, tierH, 6), mat);
        cone.position.y = tierY;
        cone.rotation.y = (t * 0.6);
        cone.castShadow = true;
        group.add(cone);
    }

    obstacles.push({
        x,
        z,
        w: 1.0,
        d: 1.0,
        bottom: 0,
        top: h
    });

    trees.push(group);
    scene.add(group);
    staticRaycastTargets.push(group);
}

// Low-Poly Deciduous Oak / Birch Tree (Image 4)
function createLowPolyDeciduous(x, z, scale = 1.0) {
    if (!isValidTreeLocation(x, z)) return;

    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const barkMat = new THREE.MeshStandardMaterial({ color: 0x6e472a, roughness: 0.9 });
    const leafMat1 = new THREE.MeshStandardMaterial({ color: 0x608038, roughness: 0.8, flatShading: true });
    const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x3e7a34, roughness: 0.8, flatShading: true });
    const leafMat3 = new THREE.MeshStandardMaterial({ color: 0x78a832, roughness: 0.8, flatShading: true });

    const trunkH = 4.2 * scale;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * scale, 0.52 * scale, trunkH, 7), barkMat);
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    group.add(trunk);

    for (let b = 0; b < 3; b++) {
        const ang = (b * Math.PI * 2) / 3 + 0.2;
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * scale, 0.18 * scale, 2.4 * scale, 6), barkMat);
        branch.position.set(Math.cos(ang) * 0.6 * scale, trunkH * 0.75, Math.sin(ang) * 0.6 * scale);
        branch.rotation.z = Math.cos(ang) * 0.55;
        branch.rotation.x = Math.sin(ang) * 0.55;
        branch.castShadow = true;
        group.add(branch);

        const mats = [leafMat1, leafMat2, leafMat3];
        const cluster = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8 * scale, 1), mats[b % mats.length]);
        cluster.position.set(Math.cos(ang) * 1.9 * scale, trunkH * 0.9 + 1.2 * scale, Math.sin(ang) * 1.9 * scale);
        cluster.castShadow = true;
        group.add(cluster);
    }

    const topCanopy = new THREE.Mesh(new THREE.IcosahedronGeometry(2.6 * scale, 1), leafMat2);
    topCanopy.position.y = trunkH + 1.8 * scale;
    topCanopy.castShadow = true;
    group.add(topCanopy);

    obstacles.push({
        x,
        z,
        w: 1.1 * scale,
        d: 1.1 * scale,
        bottom: 0,
        top: trunkH + 2.5 * scale
    });

    trees.push(group);
    scene.add(group);
    staticRaycastTargets.push(group);
}

// Low-Poly Faceted Granite Boulder (Tactical Combat Cover)
function createLowPolyBoulder(x, z, radius = 1.4) {
    if (!isValidTreeLocation(x, z)) return;

    const rockMat = new THREE.MeshStandardMaterial({
        color: Math.random() > 0.5 ? 0x57606f : 0x718093,
        roughness: 0.95,
        flatShading: true
    });

    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(radius, 1), rockMat);
    rock.position.set(x, radius * 0.45, z);
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
        bottom: 0,
        top: radius * 1.2
    });

    staticRaycastTargets.push(rock);
}

// Plant Stealth Foliage Bushes
function createStealthBush(x, z) {
    if (!isValidTreeLocation(x, z)) return;

    const group = new THREE.Group();
    group.position.set(x, 0, z);

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
    stealthBushes.push({ x, z, radius: 2.3 });
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

// 8. Ladders on Buildings (Extends 1.4m above roof for smooth mounting/dismounting)
function createLadder(x, z, buildingHeight, rotY = 0, building = null) {
    const totalHeight = buildingHeight + 1.4;
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotY;

    const barMat = new THREE.MeshStandardMaterial({ color: 0xc8963e, metalness: 0.8, roughness: 0.3 });
    const rungMat = new THREE.MeshStandardMaterial({ color: 0x9e732b, metalness: 0.85, roughness: 0.3 });

    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.06, totalHeight, 0.06), barMat);
    railL.position.set(-0.35, totalHeight / 2, 0);
    group.add(railL);

    const railR = new THREE.Mesh(new THREE.BoxGeometry(0.06, totalHeight, 0.06), barMat);
    railR.position.set(0.35, totalHeight / 2, 0);
    group.add(railR);

    for (let y = 0.45; y < totalHeight; y += 0.42) {
        const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.65, 8), rungMat);
        rung.rotation.z = Math.PI / 2;
        rung.position.set(0, y, 0);
        group.add(rung);
    }

    ladders.push({
        x,
        z,
        buildingHeight,
        height: totalHeight,
        bottom: 0,
        top: totalHeight,
        buildingX: building ? building.x : x,
        buildingZ: building ? building.z : z
    });

    scene.add(group);
    staticRaycastTargets.push(group);
}

for (const b of buildings) {
    if (b.style === 'flat' || Math.random() < 0.12) {
        createLadder(b.x, b.z + b.d / 2 + 0.15, b.h, 0, b);
    }
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
window.damageEnemyLocal = (enemyId, damage) => {
    const enemy = enemyManager.enemies.find(e => e.userData.id === enemyId);
    if (enemy) {
        enemy.userData.health -= damage;
        soundEngine.playEnemyHit();
        createHitEffect(enemy.position);

        if (enemy.userData.health <= 0) {
            const diff = getDifficulty();
            if (Math.random() < (diff.medkitDropChance || 0.4)) {
                enemyManager.createMedkitMesh(enemy.position.x, enemy.position.y, enemy.position.z);
            }

            scene.remove(enemy);
            const idx = enemyManager.enemies.indexOf(enemy);
            if (idx !== -1) {
                enemyManager.enemies.splice(idx, 1);
            }
            kills++;
            uiManager.updateHUD(getHUDState());
        }
    }
};
window.damageVehicleLocal = (vehicleId, damage) => {
    const car = vehicleManager.vehicles.find(c => c.userData.id === vehicleId);
    if (car) {
        vehicleManager.damageVehicle(car, damage, () => {
            kills += 3;
            uiManager.updateHUD(getHUDState());
        });
        createHitEffect(car.position, 0xffaa00);
    }
};

// Ground, Multi-Level & Slanted Roof Surface Height Calculation
function getSimpleGround(x, z, currentFeetY = (typeof camera !== 'undefined' && camera ? (camera.position.y - eyeHeight) : 0)) {
    let highest = 0;
    for (const b of buildings) {
        if (
            x >= b.x - b.w / 2 - 0.2 &&
            x <= b.x + b.w / 2 + 0.2 &&
            z >= b.z - b.d / 2 - 0.2 &&
            z <= b.z + b.d / 2 + 0.2
        ) {
            if (b.isEnterable) {
                // If standing on roof / upper level:
                if (currentFeetY >= b.h - 1.2) {
                    if (b.style === 'cottage' || b.style === 'cabin') {
                        if (b.chimney &&
                            Math.abs(x - b.chimney.x) <= b.chimney.w / 2 &&
                            Math.abs(z - b.chimney.z) <= b.chimney.d / 2) {
                            highest = Math.max(highest, b.chimney.top);
                        } else {
                            const distFromRidge = Math.abs(x - b.x);
                            const halfW = b.w / 2;
                            const slopeFactor = Math.max(0, 1 - (distFromRidge / halfW));
                            const surfaceY = b.h + b.roofHeight * slopeFactor;
                            highest = Math.max(highest, surfaceY);
                        }
                    } else if (b.style === 'villa') {
                        highest = Math.max(highest, b.h + 0.2);
                    }
                } else if (b.style === 'villa' && b.upperDeck &&
                           x >= b.upperDeck.x - b.upperDeck.w / 2 && x <= b.upperDeck.x + b.upperDeck.w / 2 &&
                           z >= b.upperDeck.z - b.upperDeck.d / 2 && z <= b.upperDeck.z + b.upperDeck.d / 2 &&
                           currentFeetY >= b.upperDeck.y - 0.6) {
                    highest = Math.max(highest, b.upperDeck.y);
                } else if (b.sundeck &&
                           x >= b.sundeck.x - b.sundeck.w / 2 && x <= b.sundeck.x + b.sundeck.w / 2 &&
                           z >= b.sundeck.z - b.sundeck.d / 2 && z <= b.sundeck.z + b.sundeck.d / 2 &&
                           currentFeetY < 2.0) {
                    highest = Math.max(highest, b.sundeck.y);
                } else {
                    // Inside ground floor room
                    highest = Math.max(highest, b.floorY || 0.05);
                }
            } else {
                // Downtown Flat High-Rise Rooftops
                let roofFloor = b.h + 0.35;
                if (b.hvac &&
                    Math.abs(x - b.hvac.x) <= b.hvac.w / 2 &&
                    Math.abs(z - b.hvac.z) <= b.hvac.d / 2) {
                    roofFloor = Math.max(roofFloor, b.hvac.top);
                }
                if (b.tower &&
                    Math.hypot(x - b.tower.x, z - b.tower.z) <= b.tower.radius) {
                    roofFloor = Math.max(roofFloor, b.tower.top);
                }
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

function getHUDState() {
    return {
        health,
        maxHealth,
        wave,
        kills,
        difficulty: getDifficulty(),
        onLadder,
        isStealth: isPlayerHidden,
        isCrouching,
        ammo,
        maxAmmo,
        isReloading,
        grenadeCount,
        maxGrenades,
        grenadeTimer: grenadeReplenishTimer,
        weapon: currentWeapon
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

    } else {
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
    }

    // Operator Gloved Hands
    const handRight = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), matGlove);
    handRight.name = 'handRight';
    handRight.position.set(0, -0.12, 0.11);
    gunGroup.add(handRight);

    const handLeft = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), matGlove);
    handLeft.name = 'handLeft';
    if (weaponKey === 'SNIPER') {
        handLeft.position.set(-0.05, 0.0, -0.33);
    } else if (weaponKey === 'SHOTGUN') {
        handLeft.position.set(0.0, 0.01, -0.32); // Holds the forearm pump directly!
    } else {
        handLeft.position.set(-0.05, 0.0, -0.33);
    }
    gunGroup.add(handLeft);
}

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
    }
});
window.uiManager = uiManager;

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
    if (document.pointerLockElement === document.body && gameStarted && !window.chatInputActive) {
        const sens = aiming ? 0.0010 : 0.0022;
        yaw -= e.movementX * sens;
        pitch -= e.movementY * sens;
        pitch = THREE.MathUtils.clamp(pitch, -1.45, 1.45);
    }
});

document.addEventListener('mousedown', e => {
    soundEngine.init();
    soundEngine.resume();

    if (window.chatInputActive) return;

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
        soundEngine.stopRifleBurst();
        soundEngine.playDryFire();
        startReload();
        fireCooldown = 0.3;
        return;
    }

    ammo--;
    stealthBreakTimer = 4.0; // Shooting breaks stealth
    isPlayerHidden = false;
    uiManager.updateHUD(getHUDState());

    fireCooldown = currentWeapon.fireRate;
    spreadSystem.onFire(aiming, isCrouching);

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
        const spreadDirObj = spreadSystem.calculateSpreadDirection(forward, right, up);
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
            enemy.userData.health -= dmg;
            if (enemy.userData.health <= 0) {
                const diff = getDifficulty();
                if (Math.random() < (diff.medkitDropChance || 0.4)) {
                    enemyManager.createMedkitMesh(enemy.position.x, enemy.position.y, enemy.position.z);
                }
                scene.remove(enemy);
                const idx = enemyManager.enemies.indexOf(enemy);
                if (idx !== -1) {
                    enemyManager.enemies.splice(idx, 1);
                }
                kills++;
                uiManager.updateHUD(getHUDState());
            }
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

    gunRecoil = aiming ? currentWeapon.recoilKick * 0.35 : currentWeapon.recoilKick;
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
        const dist = enemy.position.distanceTo(pos);
        const dmg = grenadePhysics.calculateDamage(dist);
        if (dmg > 0) {
            enemy.userData.health -= dmg;
            createHitEffect(enemy.position);

            if (enemy.userData.health <= 0) {
                const diff = getDifficulty();
                if (Math.random() < (diff.medkitDropChance || 0.4)) {
                    enemyManager.createMedkitMesh(enemy.position.x, enemy.position.y, enemy.position.z);
                }

                scene.remove(enemy);
                enemyManager.enemies.splice(i, 1);
                kills++;
            }
        }
    }

    for (const car of [...vehicleManager.vehicles]) {
        const dist = car.position.distanceTo(pos);
        const dmg = grenadePhysics.calculateDamage(dist);
        if (dmg > 0) {
            vehicleManager.damageVehicle(car, dmg, () => {
                kills += 3;
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

    const sprint = !crouch && (keys["ShiftLeft"] || keys["ShiftRight"]);
    const moving = keys["KeyW"] || keys["KeyA"] || keys["KeyS"] || keys["KeyD"];
    const speed = crouch ? 3.4 : (sprint ? 13 : 7.2);

    const targetEyeHeight = crouch ? CROUCH_EYE_HEIGHT : STANDING_EYE_HEIGHT;
    eyeHeight = THREE.MathUtils.lerp(eyeHeight, targetEyeHeight, delta * 14.0);

    const curY = camera.position.y - eyeHeight;
    let nearbyLadder = null;

    for (const lad of ladders) {
        const dx = Math.abs(camera.position.x - lad.x);
        const dz = Math.abs(camera.position.z - lad.z);

        if (dx < 1.2 && dz < 1.2 && curY >= -0.3 && curY <= lad.top + 0.6) {
            nearbyLadder = lad;
            break;
        }
    }

    // Attach to ladder logic
    if (nearbyLadder) {
        if (!onLadder) {
            // From ground: W or Space attaches
            if (curY < 2.5 && (keys["KeyW"] || keys["Space"])) {
                onLadder = true;
            }
            // From roof: S attaches to climb down
            else if (curY >= nearbyLadder.buildingHeight - 0.6 && keys["KeyS"]) {
                onLadder = true;
            }
            // Mid-ladder: attaches automatically
            else if (curY >= 2.5 && curY < nearbyLadder.buildingHeight - 0.6) {
                onLadder = true;
            }
        }
    } else {
        onLadder = false;
    }

    if (onLadder && nearbyLadder) {
        velocityY = 0;
        grounded = true;
        ladderSoundCooldown -= delta;

        // Climbing UP
        if (keys["KeyW"] || keys["Space"]) {
            camera.position.y += 6.0 * delta;
            if (ladderSoundCooldown <= 0) {
                soundEngine.playLadderClimb();
                ladderSoundCooldown = 0.26;
            }

            // Once at or above roof height, allow stepping forward onto the roof terrace!
            if (camera.position.y - eyeHeight >= nearbyLadder.buildingHeight) {
                const forward = new THREE.Vector3();
                camera.getWorldDirection(forward);
                forward.y = 0;
                forward.normalize();

                camera.position.x += forward.x * 4.5 * delta;
                camera.position.z += forward.z * 4.5 * delta;

                const groundY = getSimpleGround(camera.position.x, camera.position.z);
                if (groundY >= nearbyLadder.buildingHeight - 0.2) {
                    if (Math.hypot(camera.position.x - nearbyLadder.x, camera.position.z - nearbyLadder.z) > 0.65) {
                        onLadder = false;
                    }
                }
            }

            if (camera.position.y - eyeHeight > nearbyLadder.top) {
                camera.position.y = nearbyLadder.top + eyeHeight;
            }
        }
        // Climbing DOWN
        else if (keys["KeyS"]) {
            camera.position.y -= 6.0 * delta;
            if (ladderSoundCooldown <= 0) {
                soundEngine.playLadderClimb();
                ladderSoundCooldown = 0.26;
            }

            // Once feet reach ground, cleanly dismount to ground walking
            if (camera.position.y - eyeHeight <= 0.1) {
                camera.position.y = eyeHeight;
                onLadder = false;
            }
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

            const playerHeight = crouch ? 1.15 : 1.75;
            const nextX = camera.position.x + moveVector.x * speed * delta;
            const nextZ = camera.position.z + moveVector.z * speed * delta;
            const playerFeetY = camera.position.y - eyeHeight;
            const currentGround = getSimpleGround(camera.position.x, camera.position.z, playerFeetY);

            // Check X Movement
            let collidesX = false;
            for (const obs of obstacles) {
                const halfW = obs.w / 2 + playerRadius;
                const halfD = obs.d / 2 + playerRadius;
                const obsBottom = obs.bottom !== undefined ? obs.bottom : 0;
                const obsTop = obs.top;
                if (
                    nextX >= obs.x - halfW && nextX <= obs.x + halfW &&
                    camera.position.z >= obs.z - halfD && camera.position.z <= obs.z + halfD &&
                    playerFeetY < obsTop - 0.08 &&
                    (playerFeetY + playerHeight) > obsBottom + 0.08
                ) {
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
                const halfW = obs.w / 2 + playerRadius;
                const halfD = obs.d / 2 + playerRadius;
                const obsBottom = obs.bottom !== undefined ? obs.bottom : 0;
                const obsTop = obs.top;
                if (
                    camera.position.x >= obs.x - halfW && camera.position.x <= obs.x + halfW &&
                    nextZ >= obs.z - halfD && nextZ <= obs.z + halfD &&
                    playerFeetY < obsTop - 0.08 &&
                    (playerFeetY + playerHeight) > obsBottom + 0.08
                ) {
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

        const groundLevel = getSimpleGround(camera.position.x, camera.position.z, camera.position.y - eyeHeight);
        const targetY = groundLevel + eyeHeight;

        if (keys["Space"] && grounded) {
            velocityY = jumpPower;
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

    for (let i = enemyManager.medkits.length - 1; i >= 0; i--) {
        const med = enemyManager.medkits[i];
        const dist = Math.hypot(camera.position.x - med.position.x, camera.position.z - med.position.z);
        if (dist < 1.6) {
            health = Math.min(maxHealth, health + med.userData.heal);
            soundEngine.playMedkitPickup();
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
    if (!gameStarted) return;

    health -= amount;
    uiManager.triggerDamageFlash(source === 'ram' ? 0.95 : 0.65);
    uiManager.updateHUD(getHUDState());

    if (health <= 0) {
        health = 0;
        gameStarted = false;
        if (document.pointerLockElement) document.exitPointerLock();
        uiManager.showGameOver({ kills, wave, difficulty: getDifficulty() });
        soundEngine.stopMusic();
    }
}

// 22. Wave & Spawning Management
function spawnWave(difficulty) {
    const diff = difficulty || getDifficulty();
    const wantedEnemies = Math.min(diff.initialEnemies + (wave - 1) * 2, diff.maxEnemies);

    while (enemyManager.enemies.length < wantedEnemies) {
        const isKnife = Math.random() < diff.knifeEnemyRatio;
        enemyManager.spawnEnemy(
            camera.position,
            isKnife ? 'knife' : 'gunner',
            diff,
            getSimpleGround
        );
    }

    if (wave >= (diff.carSpawnWave || 1)) {
        if (vehicleManager.vehicles.length < Math.min(Math.floor(wave / 2) + 1, 2)) {
            vehicleManager.spawnVehicle(camera.position, diff);
        }
    }
}

function updateWaves(delta) {
    const diff = getDifficulty();
    waveTimer += delta;
    if (waveTimer > 25) {
        wave++;
        waveTimer = 0;
        spawnWave(diff);
        uiManager.updateHUD(getHUDState());
    }

    enemySpawnTimer -= delta;
    if (enemySpawnTimer <= 0) {
        spawnWave(diff);
        enemySpawnTimer = THREE.MathUtils.randFloat(4, 7);
    }

    carSpawnTimer -= delta;
    if (carSpawnTimer <= 0 && wave >= (diff.carSpawnWave || 1)) {
        if (vehicleManager.vehicles.length < 2) {
            vehicleManager.spawnVehicle(camera.position, diff);
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
            targetRotX -= Math.sin(reloadProgress * Math.PI) * 0.32;
            targetRotZ -= Math.sin(reloadProgress * Math.PI) * 0.18;

            if (reloadProgress < 0.4) {
                const t = reloadProgress / 0.4;
                gunGroup.traverse(child => {
                    if (child.name === 'magazine') {
                        child.position.y = child.userData.basePos.y - t * 0.35;
                    }
                });
            } else if (reloadProgress < 0.8) {
                const t = (reloadProgress - 0.4) / 0.4;
                gunGroup.traverse(child => {
                    if (child.name === 'magazine') {
                        child.position.y = child.userData.basePos.y - (1 - t) * 0.35;
                    }
                });
            } else {
                const t = (reloadProgress - 0.8) / 0.2;
                const boltSlide = Math.sin(t * Math.PI) * 0.06;
                gunGroup.traverse(child => {
                    if (child.name === 'bolt') {
                        child.position.z = child.userData.basePos.z + boltSlide;
                    }
                });
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

function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.05);

    if (gameStarted) {
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
            enemyManager.update(delta, playersList, getSimpleGround, null, false, obstacles, ladders);

            vehicleManager.update(delta, camera.position, obstacles, (dmg, src) => {
                damagePlayer(dmg, src);
            });
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

        // Render Heading-Up Tactical Radar
        uiManager.updateRadar({
            playerPos: camera.position,
            playerYaw: yaw,
            enemies: enemyManager.enemies,
            vehicles: vehicleManager.vehicles,
            buildings,
            ladders,
            medkits: enemyManager.medkits.map(m => m.position),
            grenades: activeGrenades
        }, delta);

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