import * as THREE from 'three';

/**
 * 3D Architectural Road Bridges over River Channels
 * Prevents roads from overlapping waterways and provides elevated crossings.
 */

export const PREGENERATED_BRIDGES = [
    {
        id: 'west_ave_bridge',
        name: 'West Avenue River Bridge',
        x: -120,
        zCenter: 252,
        width: 14,
        spanLength: 28,
        rampLength: 14,
        deckY: 1.90,
        axis: 'z'
    },
    {
        id: 'central_ave_bridge',
        name: 'Grand Central River Bridge',
        x: 0,
        zCenter: 272,
        width: 16,
        spanLength: 30,
        rampLength: 14,
        deckY: 1.95,
        axis: 'z'
    },
    {
        id: 'east_ave_bridge',
        name: 'East Boulevard River Bridge',
        x: 120,
        zCenter: 234,
        width: 14,
        spanLength: 28,
        rampLength: 14,
        deckY: 1.90,
        axis: 'z'
    }
];

export function getBridgeElevation(x, z) {
    for (const b of PREGENERATED_BRIDGES) {
        const halfW = b.width / 2 + 1.2;
        if (Math.abs(x - b.x) <= halfW) {
            const zRel = z - b.zCenter;
            const halfSpan = b.spanLength / 2;
            const totalHalf = halfSpan + b.rampLength;

            if (Math.abs(zRel) <= halfSpan) {
                // On flat elevated bridge deck
                return b.deckY;
            } else if (Math.abs(zRel) <= totalHalf) {
                // On linear transition approach ramp
                const rampDist = totalHalf - Math.abs(zRel);
                const t = Math.max(0, Math.min(1, rampDist / b.rampLength));
                return 0.04 + (b.deckY - 0.04) * t;
            }
        }
    }
    return null;
}

export function isOverBridge(x, z) {
    return getBridgeElevation(x, z) !== null;
}

export function buildBridges(scene, staticRaycastTargets = []) {
    const bridgeGroup = new THREE.Group();

    const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x1a1e24, roughness: 0.88 });
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x8395a7, roughness: 0.92 });
    const pierMat = new THREE.MeshStandardMaterial({ color: 0x576574, roughness: 0.95 });
    const steelRailingMat = new THREE.MeshStandardMaterial({ color: 0x222f3e, metalness: 0.85, roughness: 0.35 });
    const lineWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.7 });
    const lineYellowMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.7 });
    const reflectorMat = new THREE.MeshBasicMaterial({ color: 0xff4757 });

    for (const b of PREGENERATED_BRIDGES) {
        const bGroup = new THREE.Group();
        bGroup.position.set(b.x, 0, b.zCenter);

        const halfSpan = b.spanLength / 2;
        const deckThickness = 0.55;

        // 1. Concrete Under-Deck Structure
        const underDeckGeo = new THREE.BoxGeometry(b.width + 1.6, deckThickness, b.spanLength);
        const underDeck = new THREE.Mesh(underDeckGeo, concreteMat);
        underDeck.position.set(0, b.deckY - deckThickness / 2, 0);
        underDeck.receiveShadow = true;
        underDeck.castShadow = true;
        bGroup.add(underDeck);

        // 2. Asphalt Road Surface on Deck
        const roadGeo = new THREE.BoxGeometry(b.width, 0.06, b.spanLength);
        const road = new THREE.Mesh(roadGeo, asphaltMat);
        road.position.set(0, b.deckY + 0.03, 0);
        road.receiveShadow = true;
        bGroup.add(road);

        // 3. Concrete Sidewalks & Curbs
        const sideW = 1.6;
        for (const side of [-1, 1]) {
            const sideX = side * (b.width / 2 + sideW / 2);
            const walk = new THREE.Mesh(new THREE.BoxGeometry(sideW, 0.22, b.spanLength), concreteMat);
            walk.position.set(sideX, b.deckY + 0.11, 0);
            walk.receiveShadow = true;
            bGroup.add(walk);

            // Heavy Steel Guardrails
            const railH = 1.05;
            const topRail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, b.spanLength), steelRailingMat);
            topRail.rotation.x = Math.PI / 2;
            topRail.position.set(side * (b.width / 2 + sideW - 0.1), b.deckY + railH, 0);
            bGroup.add(topRail);

            const midRail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, b.spanLength), steelRailingMat);
            midRail.rotation.x = Math.PI / 2;
            midRail.position.set(side * (b.width / 2 + sideW - 0.1), b.deckY + railH * 0.55, 0);
            bGroup.add(midRail);

            // Vertical Stanchion Posts every 3.5m
            for (let pz = -halfSpan + 1; pz <= halfSpan - 1; pz += 3.5) {
                const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, railH, 0.12), steelRailingMat);
                post.position.set(side * (b.width / 2 + sideW - 0.1), b.deckY + railH / 2, pz);
                bGroup.add(post);

                const refl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.12), reflectorMat);
                refl.position.set(side * (b.width / 2 + sideW - 0.03), b.deckY + railH * 0.8, pz);
                bGroup.add(refl);
            }
        }

        // 4. Markings
        for (const yOff of [-0.25, 0.25]) {
            const line = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.015, b.spanLength), lineYellowMat);
            line.position.set(yOff, b.deckY + 0.068, 0);
            bGroup.add(line);
        }
        for (const side of [-1, 1]) {
            const edgeLine = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.015, b.spanLength), lineWhiteMat);
            edgeLine.position.set(side * (b.width / 2 - 0.45), b.deckY + 0.068, 0);
            bGroup.add(edgeLine);
        }

        // 5. Riverbed Support Piers
        const pierH = b.deckY + 2.4;
        for (const pz of [-halfSpan * 0.55, halfSpan * 0.55]) {
            for (const px of [-b.width * 0.32, b.width * 0.32]) {
                const column = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, pierH, 16), pierMat);
                column.position.set(px, (b.deckY - 2.4) / 2 - 0.15, pz);
                column.receiveShadow = true;
                column.castShadow = true;
                bGroup.add(column);
            }
            const crosshead = new THREE.Mesh(new THREE.BoxGeometry(b.width + 1.2, 0.65, 1.8), pierMat);
            crosshead.position.set(0, b.deckY - deckThickness - 0.32, pz);
            bGroup.add(crosshead);
        }

        // 6. Smooth Approach Ramps
        const rampL = b.rampLength;
        const rampAngle = Math.atan2(b.deckY - 0.04, rampL);

        for (const rDir of [-1, 1]) {
            const rampZ = rDir * (halfSpan + rampL / 2);
            const rampGroup = new THREE.Group();
            rampGroup.position.set(0, 0, rampZ);

            const rampMesh = new THREE.Mesh(new THREE.BoxGeometry(b.width, 0.06, rampL), asphaltMat);
            rampMesh.position.set(0, (b.deckY + 0.04) / 2 + 0.03, 0);
            rampMesh.rotation.x = rDir * rampAngle;
            rampMesh.receiveShadow = true;
            rampGroup.add(rampMesh);

            for (const side of [-1, 1]) {
                const sideX = side * (b.width / 2 + sideW / 2);
                const rampCurb = new THREE.Mesh(new THREE.BoxGeometry(sideW, 0.20, rampL), concreteMat);
                rampCurb.position.set(sideX, (b.deckY + 0.04) / 2 + 0.10, 0);
                rampCurb.rotation.x = rDir * rampAngle;
                rampCurb.receiveShadow = true;
                rampGroup.add(rampCurb);
            }

            bGroup.add(rampGroup);
        }

        bridgeGroup.add(bGroup);
        if (staticRaycastTargets) {
            bGroup.traverse(child => {
                if (child.isMesh) staticRaycastTargets.push(child);
            });
        }
    }

    scene.add(bridgeGroup);
    return bridgeGroup;
}
