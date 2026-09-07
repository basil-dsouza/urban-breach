import * as THREE from 'three';
import { PREGENERATED_BRIDGES } from './bridges.js';

/**
 * Pre-Generated Non-Overlapping Road Network
 * Layered elevations prevent Z-fighting:
 * - Base Ground: y = 0.0
 * - Asphalt: y = 0.04 (top at y = 0.06)
 * - Lines & Markings: y = 0.068
 * - Curbs: y = 0.12
 * - Sidewalks: y = 0.14
 */

export const residentialRoadSegments = [];

export function makeRoadSpan(scene, staticRaycastTargets, x1, z1, x2, z2, width) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.hypot(dx, dz);
    if (length < 0.5) return;
    const angle = Math.atan2(dx, dz);
    const midX = (x1 + x2) / 2;
    const midZ = (z1 + z2) / 2;

    const roadGroup = new THREE.Group();
    roadGroup.position.set(midX, 0, midZ);
    roadGroup.rotation.y = angle;

    // Dark Asphalt Surface
    const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x1f2429, roughness: 0.90 });
    const road = new THREE.Mesh(
        new THREE.BoxGeometry(width, 0.05, length),
        asphaltMat
    );
    road.position.set(0, 0.035, 0);
    road.receiveShadow = true;
    roadGroup.add(road);

    const sideW = 2.4;
    const yellowLineMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.7 });
    const whiteLineMat = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.7 });
    const curbStoneMat = new THREE.MeshStandardMaterial({ color: 0x57606f, roughness: 0.92 });
    const concreteSidewalkMat = new THREE.MeshStandardMaterial({ color: 0x95a5a6, roughness: 0.88 });

    // Concrete Sidewalks & Curbs
    for (const side of [-1, 1]) {
        const sideX = side * (width / 2 + sideW / 2);
        const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(sideW, 0.14, length), concreteSidewalkMat);
        sidewalk.position.set(sideX, 0.08, 0);
        sidewalk.receiveShadow = true;
        roadGroup.add(sidewalk);

        const curb = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, length), curbStoneMat);
        curb.position.set(side * (width / 2 + 0.12), 0.09, 0);
        curb.receiveShadow = true;
        roadGroup.add(curb);
    }

    // Outer White Fog Lines
    for (const side of [-1, 1]) {
        const fogLine = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.015, length), whiteLineMat);
        fogLine.position.set(side * (width / 2 - 0.45), 0.068, 0);
        roadGroup.add(fogLine);
    }

    // Double Solid Yellow Centerlines
    for (const offset of [-0.25, 0.25]) {
        const doubleYellow = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.015, length),
            yellowLineMat
        );
        doubleYellow.position.set(offset, 0.068, 0);
        roadGroup.add(doubleYellow);
    }

    // Dashed Lane Dividers
    if (width >= 12) {
        for (const laneOffset of [-width / 4, width / 4]) {
            for (let i = -length / 2 + 4; i < length / 2 - 4; i += 7) {
                const dash = new THREE.Mesh(
                    new THREE.BoxGeometry(0.18, 0.015, 3.5),
                    whiteLineMat
                );
                dash.position.set(laneOffset, 0.068, i);
                roadGroup.add(dash);
            }
        }
    }

    scene.add(roadGroup);
    if (staticRaycastTargets) staticRaycastTargets.push(roadGroup);
}

export function createIntersection(scene, staticRaycastTargets, x, z, widthX = 16, widthZ = 16) {
    const interGroup = new THREE.Group();
    interGroup.position.set(x, 0, z);

    const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x1f2429, roughness: 0.90 });
    const whiteLineMat = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.7 });
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x95a5a6, roughness: 0.88 });
    const curbStoneMat = new THREE.MeshStandardMaterial({ color: 0x57606f, roughness: 0.92 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, metalness: 0.7, roughness: 0.5 });
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2f3640, metalness: 0.75, roughness: 0.4 });

    // Center Junction Asphalt Box
    const asphalt = new THREE.Mesh(new THREE.BoxGeometry(widthX, 0.05, widthZ), asphaltMat);
    asphalt.position.set(0, 0.035, 0);
    asphalt.receiveShadow = true;
    interGroup.add(asphalt);

    // Cast-iron manhole cover
    const manhole = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.02, 16), ironMat);
    manhole.position.set(1.4, 0.062, -1.2);
    interGroup.add(manhole);

    // 4-Corner Sidewalk Pedestrian Plazas
    const cornerSize = 7.0;
    const cornerH = 0.14;
    const halfX = widthX / 2;
    const halfZ = widthZ / 2;

    for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
            const plazaX = sx * (halfX + cornerSize / 2);
            const plazaZ = sz * (halfZ + cornerSize / 2);
            const plaza = new THREE.Mesh(new THREE.BoxGeometry(cornerSize, cornerH, cornerSize), sidewalkMat);
            plaza.position.set(plazaX, 0.08, plazaZ);
            plaza.receiveShadow = true;
            interGroup.add(plaza);

            const curbX = new THREE.Mesh(new THREE.BoxGeometry(cornerSize, 0.16, 0.24), curbStoneMat);
            curbX.position.set(plazaX, 0.09, sz * (halfZ + 0.12));
            interGroup.add(curbX);

            const curbZ = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, cornerSize), curbStoneMat);
            curbZ.position.set(sx * (halfX + 0.12), 0.09, plazaZ);
            interGroup.add(curbZ);

            // Traffic Signal Post
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 4.8, 12), poleMat);
            post.position.set(sx * (halfX + 1.2), 2.4, sz * (halfZ + 1.2));
            interGroup.add(post);
        }
    }

    // Continental Zebra Pedestrian Crosswalks & Stop Bars
    for (const zSign of [-1, 1]) {
        const crossZ = zSign * (halfZ + 1.2);
        const stopZ = zSign * (halfZ + 2.3);
        const numStripes = Math.floor((widthX - 2.4) / 1.35);

        for (let i = 0; i < numStripes; i++) {
            const sX = -widthX / 2 + 1.2 + (i + 0.5) * ((widthX - 2.4) / numStripes);
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.015, 2.2), whiteLineMat);
            stripe.position.set(sX, 0.068, crossZ);
            interGroup.add(stripe);
        }

        const stopBar = new THREE.Mesh(new THREE.BoxGeometry(widthX * 0.44, 0.015, 0.45), whiteLineMat);
        stopBar.position.set(zSign > 0 ? widthX * 0.24 : -widthX * 0.24, 0.068, stopZ);
        interGroup.add(stopBar);
    }

    for (const xSign of [-1, 1]) {
        const crossX = xSign * (halfX + 1.2);
        const stopX = xSign * (halfX + 2.3);
        const numStripes = Math.floor((widthZ - 2.4) / 1.35);

        for (let i = 0; i < numStripes; i++) {
            const sZ = -widthZ / 2 + 1.2 + (i + 0.5) * ((widthZ - 2.4) / numStripes);
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.015, 0.7), whiteLineMat);
            stripe.position.set(crossX, 0.068, sZ);
            interGroup.add(stripe);
        }

        const stopBar = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.015, widthZ * 0.44), whiteLineMat);
        stopBar.position.set(stopX, 0.068, xSign > 0 ? widthZ * 0.24 : -widthZ * 0.24);
        interGroup.add(stopBar);
    }

    scene.add(interGroup);
    if (staticRaycastTargets) staticRaycastTargets.push(interGroup);
}

export function buildRoadNetwork(scene, staticRaycastTargets = []) {
    // 1. Build Grand Intersections at All 9 Grid Crossings
    createIntersection(scene, staticRaycastTargets, 0, 0, 16, 16);             // Grand Central
    createIntersection(scene, staticRaycastTargets, 120, 0, 14, 16);           // East Ave & Central
    createIntersection(scene, staticRaycastTargets, -120, 0, 14, 16);          // West Ave & Central
    createIntersection(scene, staticRaycastTargets, 0, 120, 16, 14);           // Central & North
    createIntersection(scene, staticRaycastTargets, 0, -120, 16, 14);          // Central & South
    createIntersection(scene, staticRaycastTargets, 120, 120, 14, 14);         // North-East
    createIntersection(scene, staticRaycastTargets, -120, 120, 14, 14);        // North-West
    createIntersection(scene, staticRaycastTargets, 120, -120, 14, 14);        // South-East
    createIntersection(scene, staticRaycastTargets, -120, -120, 14, 14);       // South-West

    // 2. East-West Highway Boulevards (Z = -120, 0, 120) strictly between intersections
    for (const bvdZ of [-120, 0, 120]) {
        const w = bvdZ === 0 ? 16 : 14;
        makeRoadSpan(scene, staticRaycastTargets, -480, bvdZ, -128, bvdZ, w);
        makeRoadSpan(scene, staticRaycastTargets, -112, bvdZ, -8, bvdZ, w);
        makeRoadSpan(scene, staticRaycastTargets, 8, bvdZ, 112, bvdZ, w);
        makeRoadSpan(scene, staticRaycastTargets, 128, bvdZ, 480, bvdZ, w);
    }

    // 3. North-South Highway Avenues (X = -120, 0, 120)
    // IMPORTANT: Northern spans split cleanly around PREGENERATED_BRIDGES to eliminate all water overlap & Z-fighting!
    for (const aveX of [-120, 0, 120]) {
        const w = aveX === 0 ? 16 : 14;
        // South segments
        makeRoadSpan(scene, staticRaycastTargets, aveX, -480, aveX, -128, w);
        makeRoadSpan(scene, staticRaycastTargets, aveX, -112, aveX, -8, w);
        makeRoadSpan(scene, staticRaycastTargets, aveX, 8, aveX, 112, w);

        // North segments: find matching bridge
        const bridge = PREGENERATED_BRIDGES.find(b => Math.abs(b.x - aveX) < 1.0);
        if (bridge) {
            const bridgeStart = bridge.zCenter - bridge.spanLength / 2 - bridge.rampLength;
            const bridgeEnd = bridge.zCenter + bridge.spanLength / 2 + bridge.rampLength;

            // Pre-bridge span
            makeRoadSpan(scene, staticRaycastTargets, aveX, 128, aveX, bridgeStart, w);
            // Post-bridge span
            makeRoadSpan(scene, staticRaycastTargets, aveX, bridgeEnd, aveX, 480, w);
        } else {
            makeRoadSpan(scene, staticRaycastTargets, aveX, 128, aveX, 480, w);
        }
    }
}

export function makeResidentialRoad(scene, staticRaycastTargets, x1, z1, x2, z2, width = 8) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.hypot(dx, dz);
    if (length < 0.5) return;
    const angle = Math.atan2(dx, dz);
    const midX = (x1 + x2) / 2;
    const midZ = (z1 + z2) / 2;

    const roadGroup = new THREE.Group();
    roadGroup.position.set(midX, 0, midZ);
    roadGroup.rotation.y = angle;

    const roadMat = new THREE.MeshStandardMaterial({ color: 0x222f3e, roughness: 0.90 });
    const road = new THREE.Mesh(new THREE.BoxGeometry(width, 0.05, length), roadMat);
    road.position.set(0, 0.035, 0);
    road.receiveShadow = true;
    roadGroup.add(road);

    const curbStoneMat = new THREE.MeshStandardMaterial({ color: 0x57606f, roughness: 0.92 });
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x95a5a6, roughness: 0.88 });

    for (const side of [-1, 1]) {
        const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, length), sidewalkMat);
        sidewalk.position.set(side * (width / 2 + 0.8), 0.08, 0);
        sidewalk.receiveShadow = true;
        roadGroup.add(sidewalk);

        const curb = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, length), curbStoneMat);
        curb.position.set(side * (width / 2 + 0.12), 0.09, 0);
        curb.receiveShadow = true;
        roadGroup.add(curb);
    }

    const yellowLineMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f });
    for (let i = -length / 2 + 4; i < length / 2 - 4; i += 6) {
        const dash = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.015, 3.0), yellowLineMat);
        dash.position.set(0, 0.068, i);
        roadGroup.add(dash);
    }

    scene.add(roadGroup);
    if (staticRaycastTargets) staticRaycastTargets.push(roadGroup);

    residentialRoadSegments.push({ x: midX, z: midZ, width, length, angle });
}

export function makeDriveway(scene, staticRaycastTargets, x1, z1, x2, z2, width = 4.2) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    if (len < 0.5) return;
    const angle = Math.atan2(dx, dz);

    const drivewayMat = new THREE.MeshStandardMaterial({ color: 0x222f3e, roughness: 0.88 });
    const driveway = new THREE.Mesh(new THREE.BoxGeometry(width, 0.04, len), drivewayMat);
    driveway.position.set((x1 + x2) / 2, 0.035, (z1 + z2) / 2);
    driveway.rotation.y = angle;
    driveway.receiveShadow = true;
    scene.add(driveway);
    if (staticRaycastTargets) staticRaycastTargets.push(driveway);

    residentialRoadSegments.push({ x: (x1 + x2) / 2, z: (z1 + z2) / 2, width, length: len, angle });
}
