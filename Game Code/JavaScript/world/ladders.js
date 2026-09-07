import * as THREE from 'three';

export const ladders = [];

export function buildLadders(scene, buildings = [], staticRaycastTargets = []) {
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
        rotY,
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
    if (b.style === 'dam') continue;

    const rot = b.rotY || 0;
    let x_l = 0, z_l = 0, theta_l = 0;

    if (b.style === 'police') {
        // Police HQ: Right Wing Side Wall (East exterior wall, completely clear of central tower)
        x_l = (b.w / 2) + 0.22;
        z_l = 0;
        theta_l = Math.PI / 2;
    } else if (b.style === 'donut') {
        // Donut Diner: Rear Wall (North exterior wall)
        x_l = 4.5;
        z_l = -(b.d / 2) - 0.22;
        theta_l = Math.PI;
    } else if (b.style === 'hospital') {
        // City Hospital: West exterior side wall leading to helipad
        x_l = -(b.w / 2) - 0.22;
        z_l = -5.0;
        theta_l = -Math.PI / 2;
    } else if (b.style === 'warehouse') {
        // Industrial Warehouse: East exterior wall
        x_l = (b.w / 2) + 0.20;
        z_l = 0;
        theta_l = Math.PI / 2;
    } else if (b.style === 'skyscraper') {
        // Corporate Skyscraper: South exterior wall leading to rooftop helipad
        x_l = 0;
        z_l = (b.d || 22) / 2 + 0.20;
        theta_l = 0;
    } else if (b.style === 'flat') {
        // Downtown High-Rise: South exterior wall
        x_l = 0;
        z_l = (b.d || 14) / 2 + 0.20;
        theta_l = 0;
    } else if (b.style === 'villa') {
        // Luxury Villa: West side wall (opposite swimming pool)
        x_l = -(b.w || 16) / 2 - 0.20;
        z_l = 0;
        theta_l = -Math.PI / 2;
    } else {
        // Suburban Cottages and Log Cabins: East side wall
        x_l = (b.w || 14) / 2 + 0.20;
        z_l = 0;
        theta_l = Math.PI / 2;
    }

    const lx = b.x + x_l * Math.cos(rot) + z_l * Math.sin(rot);
    const lz = b.z - x_l * Math.sin(rot) + z_l * Math.cos(rot);
    const ladderAngle = rot + theta_l;

    createLadder(lx, lz, b.h, ladderAngle, b);
}

    return ladders;
}
