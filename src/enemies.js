import * as THREE from 'three';
import { soundEngine } from './audio.js';

/**
 * Solid Obstacle Raycast & Line-of-Sight Detection
 */
export function lineIntersectsBox(p1, p2, box) {
    let p1x = p1.x;
    let p1z = p1.z;
    let p2x = p2.x;
    let p2z = p2.z;

    let minX = box.x - box.w / 2;
    let maxX = box.x + box.w / 2;
    let minZ = box.z - box.d / 2;
    let maxZ = box.z + box.d / 2;

    if (box.rotY) {
        const cosA = Math.cos(-box.rotY);
        const sinA = Math.sin(-box.rotY);
        const d1x = p1.x - box.x;
        const d1z = p1.z - box.z;
        p1x = cosA * d1x - sinA * d1z;
        p1z = sinA * d1x + cosA * d1z;

        const d2x = p2.x - box.x;
        const d2z = p2.z - box.z;
        p2x = cosA * d2x - sinA * d2z;
        p2z = sinA * d2x + cosA * d2z;

        minX = -box.w / 2;
        maxX = box.w / 2;
        minZ = -box.d / 2;
        maxZ = box.d / 2;
    }

    const minY = box.bottom !== undefined ? box.bottom : 0;
    const maxY = box.top !== undefined ? box.top : (box.h || 20);

    const dx = p2x - p1x;
    const dy = p2.y - p1.y;
    const dz = p2z - p1z;

    let tmin = 0;
    let tmax = 1;

    // X slab
    if (Math.abs(dx) > 1e-6) {
        let t1 = (minX - p1x) / dx;
        let t2 = (maxX - p1x) / dx;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) return false;
    } else {
        if (p1x < minX || p1x > maxX) return false;
    }

    // Y slab
    if (Math.abs(dy) > 1e-6) {
        let t1 = (minY - p1.y) / dy;
        let t2 = (maxY - p1.y) / dy;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) return false;
    } else {
        if (p1.y < minY || p1.y > maxY) return false;
    }

    // Z slab
    if (Math.abs(dz) > 1e-6) {
        let t1 = (minZ - p1z) / dz;
        let t2 = (maxZ - p1z) / dz;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) return false;
    } else {
        if (p1z < minZ || p1z > maxZ) return false;
    }

    return tmin <= tmax && tmax >= 0 && tmin <= 1;
}

export function hasLineOfSight(p1, p2, obstacles = []) {
    if (!obstacles || obstacles.length === 0) return true;
    for (let i = 0; i < obstacles.length; i++) {
        const obs = obstacles[i];
        if (lineIntersectsBox(p1, p2, obs)) {
            return false;
        }
    }
    return true;
}

/**
 * Slide-and-Collide Horizontal Obstacle Movement for Ground Humanoids
 */
export function moveEnemyWithCollision(enemy, moveX, moveZ, obstacles = []) {
    const radius = 0.40;
    const targetX = enemy.position.x + moveX;
    const targetZ = enemy.position.z + moveZ;
    const currentY = enemy.position.y;

    let canMoveX = true;
    if (obstacles && obstacles.length > 0) {
        for (let i = 0; i < obstacles.length; i++) {
            const obs = obstacles[i];
            const obsBottom = obs.bottom !== undefined ? obs.bottom : 0;
            const obsTop = obs.top !== undefined ? obs.top : 20;
            // Ignore obstacles above or below enemy
            if (currentY + 1.8 < obsBottom || currentY > obsTop - 0.2) continue;

            let localTargetX = targetX - obs.x;
            let localEnemyZ = enemy.position.z - obs.z;
            if (obs.rotY) {
                const cosA = Math.cos(-obs.rotY);
                const sinA = Math.sin(-obs.rotY);
                const dtx = targetX - obs.x;
                const dez = enemy.position.z - obs.z;
                localTargetX = cosA * dtx - sinA * dez;
                localEnemyZ = sinA * dtx + cosA * dez;
            }

            const halfW = obs.w / 2 + radius;
            const halfD = obs.d / 2 + radius;

            if (Math.abs(localTargetX) <= halfW && Math.abs(localEnemyZ) <= halfD) {
                canMoveX = false;
                break;
            }
        }
    }

    if (canMoveX) {
        enemy.position.x = targetX;
    }

    let canMoveZ = true;
    if (obstacles && obstacles.length > 0) {
        for (let i = 0; i < obstacles.length; i++) {
            const obs = obstacles[i];
            const obsBottom = obs.bottom !== undefined ? obs.bottom : 0;
            const obsTop = obs.top !== undefined ? obs.top : 20;
            if (currentY + 1.8 < obsBottom || currentY > obsTop - 0.2) continue;

            let localEnemyX = enemy.position.x - obs.x;
            let localTargetZ = targetZ - obs.z;
            if (obs.rotY) {
                const cosA = Math.cos(-obs.rotY);
                const sinA = Math.sin(-obs.rotY);
                const dex = enemy.position.x - obs.x;
                const dtz = targetZ - obs.z;
                localEnemyX = cosA * dex - sinA * dtz;
                localTargetZ = sinA * dex + cosA * dtz;
            }

            const halfW = obs.w / 2 + radius;
            const halfD = obs.d / 2 + radius;

            if (Math.abs(localEnemyX) <= halfW && Math.abs(localTargetZ) <= halfD) {
                canMoveZ = false;
                break;
            }
        }
    }

    if (canMoveZ) {
        enemy.position.z = targetZ;
    }
}

/**
 * Humanoid Enemy System with Lifelike Human Faces, Two-Handed Weapon Grips & Natural Locomotion
 */

export class EnemyBulletManager {
    constructor(scene) {
        this.scene = scene;
        this.bullets = [];
    }

    spawnBullet(position, targetDirection, speed = 85) {
        const dirNormalized = targetDirection.clone().normalize();

        const bullet = new THREE.Group();
        bullet.position.copy(position);

        // Aerodynamic tracer cone: apex points along +Y, tail trails at -Y
        const tracer = new THREE.Mesh(
            new THREE.ConeGeometry(0.045, 0.85, 8),
            new THREE.MeshBasicMaterial({ color: 0xff3b30 })
        );
        bullet.add(tracer);

        // Glowing golden core cylinder along Y
        const core = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 0.65, 6),
            new THREE.MeshBasicMaterial({ color: 0xffea00 })
        );
        bullet.add(core);

        bullet.userData.velocity = dirNormalized.clone().multiplyScalar(speed);
        bullet.userData.life = 2.5;

        // Perfectly align +Y of cone and cylinder with flight direction vector
        bullet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirNormalized);

        this.scene.add(bullet);
        this.bullets.push(bullet);
        return bullet;
    }

    update(delta, players, onPlayerHit, obstacles = []) {
        let playersList = [];
        if (Array.isArray(players)) {
            playersList = players;
        } else {
            const pPos = (players && players.clone) ? players.clone() : new THREE.Vector3();
            playersList = [{
                id: 'host',
                pos: pPos,
                damageFn: (amount) => {
                    if (typeof onPlayerHit === 'function') {
                        onPlayerHit(amount);
                    }
                }
            }];
        }

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            const oldPos = bullet.position.clone();

            bullet.position.add(
                bullet.userData.velocity.clone().multiplyScalar(delta)
            );

            // Check collision with all players in the list
            let hitPlayer = false;
            for (const p of playersList) {
                if (!p || !p.pos) continue;
                const playerCenter = p.pos.clone();
                playerCenter.y -= 0.85;

                const distToPlayer = bullet.position.distanceTo(playerCenter);
                if (distToPlayer < 1.35) {
                    if (typeof p.damageFn === 'function') {
                        p.damageFn(bullet.userData.damage || 6);
                    }
                    this.scene.remove(bullet);
                    this.bullets.splice(i, 1);
                    hitPlayer = true;
                    break;
                }
            }
            if (hitPlayer) continue;

            // Check collision with building walls / solid obstacles
            let hitObstacle = false;
            if (obstacles && obstacles.length > 0) {
                for (let k = 0; k < obstacles.length; k++) {
                    if (lineIntersectsBox(oldPos, bullet.position, obstacles[k])) {
                        hitObstacle = true;
                        break;
                    }
                }
            }

            if (hitObstacle) {
                this.scene.remove(bullet);
                this.bullets.splice(i, 1);
                continue;
            }

            bullet.userData.life -= delta;
            if (bullet.userData.life <= 0) {
                this.scene.remove(bullet);
                this.bullets.splice(i, 1);
            }
        }
    }

    clear() {
        for (const bullet of this.bullets) {
            this.scene.remove(bullet);
        }
        this.bullets = [];
    }
}

export class EnemyManager {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.enemies = [];
        this.medkits = [];
        this.bulletManager = new EnemyBulletManager(scene);
        this.options = options;
    }

    createRifleMesh() {
        const rifle = new THREE.Group();

        const metalMat = new THREE.MeshStandardMaterial({
            color: 0x1a1d20,
            metalness: 0.85,
            roughness: 0.35
        });
        const darkPolymerMat = new THREE.MeshStandardMaterial({
            color: 0x111315,
            roughness: 0.8
        });
        const magMat = new THREE.MeshStandardMaterial({
            color: 0x2b2e32,
            metalness: 0.7,
            roughness: 0.5
        });

        // Main Receiver
        const receiver = new THREE.Mesh(
            new THREE.BoxGeometry(0.09, 0.14, 0.65),
            metalMat
        );
        receiver.castShadow = true;
        rifle.add(receiver);

        // Barrel & Handguard
        const handguard = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.10, 0.40),
            darkPolymerMat
        );
        handguard.position.set(0, 0.01, 0.42);
        handguard.castShadow = true;
        rifle.add(handguard);

        const barrel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.022, 0.022, 0.35, 8),
            metalMat
        );
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.01, 0.72);
        barrel.castShadow = true;
        rifle.add(barrel);

        // Muzzle brake
        const muzzle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 0.07, 8),
            metalMat
        );
        muzzle.rotation.x = Math.PI / 2;
        muzzle.position.set(0, 0.01, 0.90);
        rifle.add(muzzle);

        // Curved Magazine
        const mag = new THREE.Mesh(
            new THREE.BoxGeometry(0.065, 0.24, 0.12),
            magMat
        );
        mag.position.set(0, -0.14, 0.12);
        mag.rotation.x = 0.22;
        mag.castShadow = true;
        rifle.add(mag);

        // Stock
        const stock = new THREE.Mesh(
            new THREE.BoxGeometry(0.075, 0.15, 0.35),
            darkPolymerMat
        );
        stock.position.set(0, -0.02, -0.42);
        stock.castShadow = true;
        rifle.add(stock);

        // Red Dot Optic
        const optic = new THREE.Mesh(
            new THREE.BoxGeometry(0.07, 0.08, 0.16),
            metalMat
        );
        optic.position.set(0, 0.10, 0.05);
        rifle.add(optic);

        // Muzzle Flash Sprite
        const muzzleFlash = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 8, 8),
            new THREE.MeshBasicMaterial({
                color: 0xffaa22,
                transparent: true,
                opacity: 0
            })
        );
        muzzleFlash.position.set(0, 0.01, 0.96);
        rifle.add(muzzleFlash);

        rifle.userData.muzzleFlash = muzzleFlash;
        return rifle;
    }

    createKnifeMesh() {
        const knife = new THREE.Group();

        const steelMat = new THREE.MeshStandardMaterial({
            color: 0xd8e0e8,
            metalness: 0.95,
            roughness: 0.2
        });
        const handleMat = new THREE.MeshStandardMaterial({
            color: 0x181c20,
            roughness: 0.85
        });

        // Blade pointing along +Z
        const blade = new THREE.Mesh(
            new THREE.BoxGeometry(0.03, 0.09, 0.38),
            steelMat
        );
        blade.position.set(0, 0, 0.20);
        blade.castShadow = true;
        knife.add(blade);

        const tip = new THREE.Mesh(
            new THREE.ConeGeometry(0.045, 0.10, 4),
            steelMat
        );
        tip.rotation.x = Math.PI / 2;
        tip.position.set(0, 0, 0.44);
        knife.add(tip);

        // Guard & Handle
        const guard = new THREE.Mesh(
            new THREE.BoxGeometry(0.045, 0.16, 0.04),
            handleMat
        );
        guard.position.set(0, 0, 0.01);
        knife.add(guard);

        const handle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.035, 0.035, 0.22, 8),
            handleMat
        );
        handle.rotation.x = Math.PI / 2;
        handle.position.set(0, 0, -0.12);
        handle.castShadow = true;
        knife.add(handle);

        return knife;
    }

    createMinigunMesh() {
        const minigun = new THREE.Group();
        const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x181a1c, metalness: 0.85, roughness: 0.35 });
        const gunMetalMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.90, roughness: 0.25 });
        const hazardMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.3, roughness: 0.6 });

        // 1. Main Heavy Receiver Housing
        const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.46), darkSteelMat);
        receiver.castShadow = true;
        minigun.add(receiver);

        // 2. Motor Housing / Battery Drive
        const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.22, 12), gunMetalMat);
        motor.rotation.x = Math.PI / 2;
        motor.position.set(0, 0.08, -0.15);
        minigun.add(motor);

        // 3. Ammo Drum / Box Container Attached
        const ammoDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.22, 14), darkSteelMat);
        ammoDrum.position.set(-0.16, -0.12, 0.02);
        minigun.add(ammoDrum);

        const drumBand = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.04, 14), hazardMat);
        drumBand.position.set(-0.16, -0.12, 0.02);
        minigun.add(drumBand);

        // 4. Rotating 4-Barrel Gatling Assembly
        const barrelGroup = new THREE.Group();
        barrelGroup.position.set(0, 0, 0.23);
        minigun.add(barrelGroup);
        minigun.userData.barrelGroup = barrelGroup;

        // Central rotor shaft
        const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.65, 8), darkSteelMat);
        rotor.rotation.x = Math.PI / 2;
        rotor.position.set(0, 0, 0.32);
        barrelGroup.add(rotor);

        // 4 Circular Barrels around perimeter
        const barrelRadius = 0.065;
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const bx = Math.cos(angle) * barrelRadius;
            const by = Math.sin(angle) * barrelRadius;

            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.72, 8), gunMetalMat);
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(bx, by, 0.36);
            barrel.castShadow = true;
            barrelGroup.add(barrel);
        }

        // Barrel stabilization clamp rings
        for (const zOffset of [0.18, 0.42, 0.68]) {
            const clamp = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.035, 12), darkSteelMat);
            clamp.rotation.x = Math.PI / 2;
            clamp.position.set(0, 0, zOffset);
            barrelGroup.add(clamp);
        }

        // Heavy Muzzle Brake Flash Point
        const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.06, 12), darkSteelMat);
        muzzle.rotation.x = Math.PI / 2;
        muzzle.position.set(0, 0, 0.74);
        barrelGroup.add(muzzle);

        // Muzzle flash point
        const flashMat = new THREE.MeshBasicMaterial({ color: 0xffeaa7, transparent: true, opacity: 0 });
        const flash = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), flashMat);
        flash.position.set(0, 0, 0.85);
        barrelGroup.add(flash);
        minigun.userData.muzzleFlash = flash;

        // Top tactical carry handle
        const topHandle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.28), darkSteelMat);
        topHandle.position.set(0, 0.20, -0.05);
        minigun.add(topHandle);

        return minigun;
    }

    createMedkitMesh(x, y, z) {
        const medkit = new THREE.Group();
        medkit.position.set(x, y + 0.35, z);

        const boxMat = new THREE.MeshStandardMaterial({ color: 0x1a3322, roughness: 0.5 });
        const crossMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.5), boxMat);
        body.castShadow = true;
        medkit.add(body);

        const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.35), crossMat);
        crossV.position.y = 0.23;
        medkit.add(crossV);

        const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 0.12), crossMat);
        crossH.position.y = 0.23;
        medkit.add(crossH);

        medkit.userData.isMedkit = true;
        medkit.userData.heal = 35;

        this.scene.add(medkit);
        this.medkits.push(medkit);
        return medkit;
    }

    /**
     * Creates an imposing 1.4x scale Heavy Juggernaut Machine Gunner Boss with titanium armor & minigun
     */
    createBossGunnerMesh(difficulty = {}, bossStats = {}) {
        const boss = new THREE.Group();
        boss.scale.set(1.38, 1.38, 1.38); // Imposing boss stature
        boss.userData.archetype = 'boss_gunner';
        boss.userData.isBoss = true;
        boss.userData.bossName = 'JUGGERNAUT MACHINE GUNNER';

        const titanArmorMat = new THREE.MeshStandardMaterial({ color: 0x1a1d20, metalness: 0.85, roughness: 0.32 });
        const underSuitMat = new THREE.MeshStandardMaterial({ color: 0x24282c, roughness: 0.85 });
        const hazardMat = new THREE.MeshStandardMaterial({ color: 0xf39c12, metalness: 0.4, roughness: 0.5 });
        const coreGlowMat = new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xff1744, emissiveIntensity: 1.2 });
        const visorGlowMat = new THREE.MeshStandardMaterial({ color: 0xff3b30, emissive: 0xff3b30, emissiveIntensity: 1.5 });
        const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x111315, metalness: 0.9, roughness: 0.25 });

        // 1. Pelvis Root
        const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.28, 0.42), titanArmorMat);
        pelvis.position.y = 1.05;
        pelvis.castShadow = true;
        boss.add(pelvis);
        boss.userData.pelvis = pelvis;

        // 2. Torso Group
        const torsoGroup = new THREE.Group();
        torsoGroup.position.set(0, 0.14, 0);
        pelvis.add(torsoGroup);
        boss.userData.torsoGroup = torsoGroup;

        const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.58, 6, 10), underSuitMat);
        torso.position.y = 0.38;
        torso.castShadow = true;
        torsoGroup.add(torso);

        // Heavy Reinforced Titanium Chestplate
        const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.68, 0.56), titanArmorMat);
        chestPlate.position.set(0, 0.40, 0.02);
        chestPlate.castShadow = true;
        torsoGroup.add(chestPlate);

        // Glowing Cybernetic Core Reactor on chest
        const reactor = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 16), coreGlowMat);
        reactor.rotation.x = Math.PI / 2;
        reactor.position.set(0, 0.46, 0.31);
        torsoGroup.add(reactor);

        // Heavy Ammo Backpack Drum on back
        const ammoBackpack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.34), darkMetalMat);
        ammoBackpack.position.set(0, 0.42, -0.38);
        ammoBackpack.castShadow = true;
        torsoGroup.add(ammoBackpack);

        // Flexible Ammo Feeder Belt connecting backpack to weapon
        for (let i = 0; i < 5; i++) {
            const t = i / 4;
            const link = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.09), hazardMat);
            const lx = -0.22 - t * 0.08;
            const ly = 0.30 - t * 0.15;
            const lz = -0.25 + t * 0.50;
            link.position.set(lx, ly, lz);
            torsoGroup.add(link);
        }

        // 3. Neck & Juggernaut Heavy Ballistic Helmet
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.18, 8), darkMetalMat);
        neck.position.y = 0.78;
        torsoGroup.add(neck);

        const headGroup = new THREE.Group();
        headGroup.position.set(0, 1.02, 0);
        torsoGroup.add(headGroup);
        boss.userData.head = headGroup;

        // Armored Helmet Shell
        const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 14), titanArmorMat);
        helmet.scale.set(0.96, 1.08, 1.02);
        helmet.castShadow = true;
        headGroup.add(helmet);

        // Reinforced Jaw Guard
        const jawGuard = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.22, 0.42), darkMetalMat);
        jawGuard.position.set(0, -0.10, 0.12);
        headGroup.add(jawGuard);

        // Glowing Red Ocular Visor
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.06), visorGlowMat);
        visor.position.set(0, 0.06, 0.33);
        headGroup.add(visor);

        // 4. Arms & Heavy Shoulder Pauldrons
        const armLGroup = new THREE.Group();
        armLGroup.position.set(-0.48, 0.65, 0);
        torsoGroup.add(armLGroup);
        boss.userData.armL = armLGroup;

        // Left Heavy Shoulder Pauldron
        const pauldronL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.32), titanArmorMat);
        pauldronL.position.set(-0.06, 0.08, 0);
        pauldronL.castShadow = true;
        armLGroup.add(pauldronL);

        const bicepL = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.38, 4, 6), underSuitMat);
        bicepL.position.set(0, -0.22, 0);
        armLGroup.add(bicepL);

        const foreArmL = new THREE.Group();
        foreArmL.position.set(0, -0.38, 0);
        armLGroup.add(foreArmL);
        boss.userData.foreArmL = foreArmL;

        const armGuardL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.32, 0.22), darkMetalMat);
        armGuardL.position.set(0, -0.16, 0);
        foreArmL.add(armGuardL);

        const handL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), darkMetalMat);
        handL.position.set(0, -0.38, 0);
        foreArmL.add(handL);

        const armRGroup = new THREE.Group();
        armRGroup.position.set(0.48, 0.65, 0);
        torsoGroup.add(armRGroup);
        boss.userData.armR = armRGroup;

        // Right Heavy Shoulder Pauldron
        const pauldronR = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.32), titanArmorMat);
        pauldronR.position.set(0.06, 0.08, 0);
        pauldronR.castShadow = true;
        armRGroup.add(pauldronR);

        const bicepR = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.38, 4, 6), underSuitMat);
        bicepR.position.set(0, -0.22, 0);
        armRGroup.add(bicepR);

        const foreArmR = new THREE.Group();
        foreArmR.position.set(0, -0.38, 0);
        armRGroup.add(foreArmR);
        boss.userData.foreArmR = foreArmR;

        const armGuardR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.32, 0.22), darkMetalMat);
        armGuardR.position.set(0, -0.16, 0);
        foreArmR.add(armGuardR);

        // 5. Heavy Armored Legs & Boots
        const legLThigh = new THREE.Group();
        legLThigh.position.set(-0.24, 0.0, 0);
        pelvis.add(legLThigh);
        boss.userData.legLThigh = legLThigh;

        const thighMeshL = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.44, 4, 6), underSuitMat);
        thighMeshL.position.set(0, -0.24, 0);
        thighMeshL.castShadow = true;
        legLThigh.add(thighMeshL);

        const legLShin = new THREE.Group();
        legLShin.position.set(0, -0.46, 0);
        legLThigh.add(legLShin);
        boss.userData.legLShin = legLShin;

        const shinGuardL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.38, 0.24), titanArmorMat);
        shinGuardL.position.set(0, -0.20, 0.02);
        shinGuardL.castShadow = true;
        legLShin.add(shinGuardL);

        const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.48), darkMetalMat);
        bootL.position.set(0, -0.44, 0.10);
        bootL.castShadow = true;
        legLShin.add(bootL);

        const legRThigh = new THREE.Group();
        legRThigh.position.set(0.24, 0.0, 0);
        pelvis.add(legRThigh);
        boss.userData.legRThigh = legRThigh;

        const thighMeshR = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.44, 4, 6), underSuitMat);
        thighMeshR.position.set(0, -0.24, 0);
        thighMeshR.castShadow = true;
        legRThigh.add(thighMeshR);

        const legRShin = new THREE.Group();
        legRShin.position.set(0, -0.46, 0);
        legRThigh.add(legRShin);
        boss.userData.legRShin = legRShin;

        const shinGuardR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.38, 0.24), titanArmorMat);
        shinGuardR.position.set(0, -0.20, 0.02);
        shinGuardR.castShadow = true;
        legRShin.add(shinGuardR);

        const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.48), darkMetalMat);
        bootR.position.set(0, -0.44, 0.10);
        bootR.castShadow = true;
        legRShin.add(bootR);

        // 6. Heavy Rotary Gatling Minigun
        const minigun = this.createMinigunMesh();
        minigun.position.set(0.06, -0.28, 0.52);
        minigun.rotation.set(0, 0, 0);
        armRGroup.add(minigun);
        boss.userData.minigun = minigun;
        boss.userData.rifle = minigun; // Compatible with bullet muzzle calculations

        // Right Arm holds weapon, Left Arm grips top stabilization handle
        armRGroup.rotation.set(-0.20, -0.05, -0.05);
        armLGroup.rotation.set(-0.40, 0.45, 0.15);
        foreArmL.position.set(0, -0.32, 0.20);
        foreArmL.rotation.set(-0.45, 0.25, 0);
        handL.position.set(0.08, -0.42, 0.48);

        // Boss Combat Stats & Suppressing Fire State
        const hp = bossStats.bossHealth || 350;
        boss.userData.health = hp;
        boss.userData.maxHealth = hp;
        boss.userData.speed = bossStats.bossSpeed || 2.2;
        boss.userData.damage = bossStats.bossDamage || 8;
        boss.userData.accuracy = 0.70;
        boss.userData.shootInterval = 1.35;
        boss.userData.shootTimer = 1.2;
        boss.userData.burstCount = 0;
        boss.userData.burstTimer = 0;
        boss.userData.attackCooldown = 0;
        boss.userData.attackAnim = 0;
        boss.userData.alertTimer = 9999; // Boss is always actively alerted & tracking
        boss.userData.time = Math.random() * 10;

        boss.traverse(child => {
            if (child.isMesh) {
                child.userData.enemy = boss;
            }
        });

        return boss;
    }

    spawnBossGunner(playerPos, difficulty = {}, getGroundHeight, wave = 5, bossStats = null) {
        const boss = this.createBossGunnerMesh(difficulty, bossStats || {});
        const spawnDistance = THREE.MathUtils.randFloat(35, 50);
        const spawnAngle = Math.random() * Math.PI * 2;

        const sx = playerPos.x + Math.sin(spawnAngle) * spawnDistance;
        const sz = playerPos.z + Math.cos(spawnAngle) * spawnDistance;

        let sy = 0;
        if (typeof getGroundHeight === 'function') {
            sy = getGroundHeight(sx, sz);
        }

        boss.position.set(sx, sy, sz);
        this.scene.add(boss);
        this.enemies.push(boss);
        return boss;
    }

    /**
     * Creates an articulated enemy model with realistic facial features and two-handed weapon grip
     */
    createEnemyMesh(archetype = 'gunner', difficulty = {}, scaledStats = null) {
        if (archetype === 'boss_gunner') {
            return this.createBossGunnerMesh(difficulty, scaledStats || {});
        }
        const enemy = new THREE.Group();
        enemy.userData.archetype = archetype;

        const isGunner = archetype === 'gunner';

        const uniformColor = isGunner
            ? (Math.random() > 0.5 ? 0x2d3436 : 0x223127)
            : (Math.random() > 0.5 ? 0x3d2727 : 0x1e272e);

        const vestColor = 0x15181a;
        const skinColors = [0xd39a72, 0xc6865b, 0xa96d4d, 0x8c583f];
        const skinColor = skinColors[Math.floor(Math.random() * skinColors.length)];

        const uniformMat = new THREE.MeshStandardMaterial({ color: uniformColor, roughness: 0.88 });
        const vestMat = new THREE.MeshStandardMaterial({ color: vestColor, roughness: 0.8, metalness: 0.2 });
        const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.82 });
        const lipMat = new THREE.MeshStandardMaterial({ color: 0x9b5847, roughness: 0.7 });
        const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf4f6f8 });
        const irisMat = new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0x2a3e52 : 0x3d2817 });
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
        const browMat = new THREE.MeshStandardMaterial({ color: 0x18120e, roughness: 0.9 });
        const gearMat = new THREE.MeshStandardMaterial({ color: 0x101214, roughness: 0.7, metalness: 0.4 });
        const helmetMat = new THREE.MeshStandardMaterial({ color: 0x252a2e, metalness: 0.5, roughness: 0.5 });
        const commsMat = new THREE.MeshStandardMaterial({ color: 0x151719, roughness: 0.6, metalness: 0.3 });

        // 1. Pelvis Root (Y = 1.05)
        const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.22, 0.34), uniformMat);
        pelvis.position.y = 1.05;
        pelvis.castShadow = true;
        enemy.add(pelvis);
        enemy.userData.pelvis = pelvis;

        // 2. Torso Group
        const torsoGroup = new THREE.Group();
        torsoGroup.position.set(0, 0.12, 0);
        pelvis.add(torsoGroup);
        enemy.userData.torsoGroup = torsoGroup;

        const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.52, 6, 10), uniformMat);
        torso.position.y = 0.35;
        torso.castShadow = true;
        torsoGroup.add(torso);

        const tacticalVest = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.58, 0.44), vestMat);
        tacticalVest.position.set(0, 0.36, 0);
        tacticalVest.castShadow = true;
        torsoGroup.add(tacticalVest);

        // Tactical Pouches
        for (let i = -0.20; i <= 0.20; i += 0.20) {
            const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.20, 0.10), gearMat);
            pouch.position.set(i, 0.26, 0.24);
            torsoGroup.add(pouch);
        }

        // 3. Neck & Lifelike Realistic Head with Defined Facial Anatomy
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.16, 8), skinMat);
        neck.position.y = 0.74;
        torsoGroup.add(neck);

        const headGroup = new THREE.Group();
        headGroup.position.set(0, 0.96, 0);
        torsoGroup.add(headGroup);
        enemy.userData.head = headGroup;

        // Realistic Head Geometry
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.30, 16, 14), skinMat);
        head.scale.set(0.92, 1.08, 0.98);
        head.castShadow = true;
        headGroup.add(head);

        // --- REALISTIC FACIAL FEATURES ---
        // A. Eyes (Sclera + Iris + Pupil + Eyelids)
        for (const side of [-1, 1]) {
            const eyeX = side * 0.095;

            // White Sclera
            const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), eyeWhiteMat);
            sclera.position.set(eyeX, 0.04, 0.26);
            headGroup.add(sclera);

            // Colored Iris
            const iris = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), irisMat);
            iris.position.set(eyeX, 0.04, 0.285);
            headGroup.add(iris);

            // Black Pupil
            const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), pupilMat);
            pupil.position.set(eyeX, 0.04, 0.298);
            headGroup.add(pupil);

            // Upper Eyelid / Crease
            const eyelid = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.018, 0.03), skinMat);
            eyelid.position.set(eyeX, 0.075, 0.27);
            headGroup.add(eyelid);

            // Defined Eyebrow
            const brow = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.022, 0.035), browMat);
            brow.position.set(eyeX, 0.098, 0.28);
            brow.rotation.z = -side * 0.08;
            headGroup.add(brow);

            // Ear
            const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.08, 4, 6), skinMat);
            ear.position.set(side * 0.28, 0.02, 0.02);
            ear.rotation.z = side * 0.15;
            headGroup.add(ear);

            // Tactical Headset Earpad
            const earpad = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 8), commsMat);
            earpad.position.set(side * 0.30, 0.02, 0.02);
            earpad.rotation.z = Math.PI / 2;
            headGroup.add(earpad);
        }

        // B. Sculpted Nose Bridge & Tip
        const noseBridge = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.12, 0.055), skinMat);
        noseBridge.position.set(0, 0.02, 0.285);
        headGroup.add(noseBridge);

        const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 8), skinMat);
        noseTip.position.set(0, -0.04, 0.315);
        headGroup.add(noseTip);

        // Nostril Flares
        for (const side of [-1, 1]) {
            const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.020, 6, 6), skinMat);
            nostril.position.set(side * 0.032, -0.048, 0.295);
            headGroup.add(nostril);
        }

        // C. Sculpted Lips & Chin
        const lipUpper = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.020, 0.03), lipMat);
        lipUpper.position.set(0, -0.115, 0.275);
        headGroup.add(lipUpper);

        const lipLower = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.024, 0.03), lipMat);
        lipLower.position.set(0, -0.142, 0.27);
        headGroup.add(lipLower);

        const chin = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), skinMat);
        chin.position.set(0, -0.21, 0.24);
        headGroup.add(chin);

        // D. Tactical Comms Boom Microphone
        const micBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.18, 6), commsMat);
        micBoom.position.set(0.18, -0.06, 0.16);
        micBoom.rotation.set(-0.4, 0.3, 0.8);
        headGroup.add(micBoom);

        const micTip = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 6), commsMat);
        micTip.position.set(0.08, -0.12, 0.28);
        headGroup.add(micTip);

        // E. Headgear / Helmet
        if (isGunner) {
            const helmet = new THREE.Mesh(
                new THREE.SphereGeometry(0.33, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6),
                helmetMat
            );
            helmet.position.set(0, 0.08, 0);
            helmet.castShadow = true;
            headGroup.add(helmet);

            const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.10, 0.12), gearMat);
            goggles.position.set(0, 0.18, 0.22);
            goggles.rotation.x = -0.3;
            headGroup.add(goggles);
        } else {
            // Military Tactical Hair Cut
            const hair = new THREE.Mesh(
                new THREE.SphereGeometry(0.31, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
                browMat
            );
            hair.position.set(0, 0.06, -0.02);
            headGroup.add(hair);
        }

        // 4. Arms with Two-Handed Tactical Weapon Grip
        const armLGroup = new THREE.Group();
        armLGroup.position.set(-0.44, 0.58, 0);
        torsoGroup.add(armLGroup);
        enemy.userData.armL = armLGroup;

        const upperArmL = new THREE.Mesh(new THREE.CapsuleGeometry(0.10, 0.30, 4, 6), uniformMat);
        upperArmL.position.set(0, -0.16, 0);
        armLGroup.add(upperArmL);

        const foreArmL = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.28, 4, 6), uniformMat);
        foreArmL.position.set(0, -0.38, 0.08);
        foreArmL.rotation.x = -0.25;
        armLGroup.add(foreArmL);

        const handL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), skinMat);
        handL.position.set(0, -0.52, 0.16);
        armLGroup.add(handL);

        const armRGroup = new THREE.Group();
        armRGroup.position.set(0.44, 0.58, 0);
        torsoGroup.add(armRGroup);
        enemy.userData.armR = armRGroup;

        const upperArmR = new THREE.Mesh(new THREE.CapsuleGeometry(0.10, 0.30, 4, 6), uniformMat);
        upperArmR.position.set(0, -0.16, 0);
        armRGroup.add(upperArmR);

        const foreArmR = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.28, 4, 6), uniformMat);
        foreArmR.position.set(0, -0.38, 0.08);
        foreArmR.rotation.x = -0.25;
        armRGroup.add(foreArmR);

        const handR = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), skinMat);
        handR.position.set(0, -0.52, 0.16);
        armRGroup.add(handR);

        // 5. Multi-Joint Legs (Thigh -> Knee -> Shin -> Boot)
        const legLThigh = new THREE.Group();
        legLThigh.position.set(-0.20, 0.0, 0);
        pelvis.add(legLThigh);
        enemy.userData.legLThigh = legLThigh;

        const thighMeshL = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.40, 4, 6), uniformMat);
        thighMeshL.position.set(0, -0.22, 0);
        thighMeshL.castShadow = true;
        legLThigh.add(thighMeshL);

        const legLShin = new THREE.Group();
        legLShin.position.set(0, -0.42, 0);
        legLThigh.add(legLShin);
        enemy.userData.legLShin = legLShin;

        const shinMeshL = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.38, 4, 6), uniformMat);
        shinMeshL.position.set(0, -0.20, 0);
        shinMeshL.castShadow = true;
        legLShin.add(shinMeshL);

        const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.42), gearMat);
        shoeL.position.set(0, -0.42, 0.08);
        shoeL.castShadow = true;
        legLShin.add(shoeL);

        const legRThigh = new THREE.Group();
        legRThigh.position.set(0.20, 0.0, 0);
        pelvis.add(legRThigh);
        enemy.userData.legRThigh = legRThigh;

        const thighMeshR = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.40, 4, 6), uniformMat);
        thighMeshR.position.set(0, -0.22, 0);
        thighMeshR.castShadow = true;
        legRThigh.add(thighMeshR);

        const legRShin = new THREE.Group();
        legRShin.position.set(0, -0.42, 0);
        legRThigh.add(legRShin);
        enemy.userData.legRShin = legRShin;

        const shinMeshR = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.38, 4, 6), uniformMat);
        shinMeshR.position.set(0, -0.20, 0);
        shinMeshR.castShadow = true;
        legRShin.add(shinMeshR);

        const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.42), gearMat);
        shoeR.position.set(0, -0.42, 0.08);
        shoeR.castShadow = true;
        legRShin.add(shoeR);

        // 6. Two-Handed Tactical Weapon Grip (Rifle / Knife held facing forward)
        if (isGunner) {
            const rifle = this.createRifleMesh();
            rifle.position.set(0.04, -0.22, 0.42);
            rifle.rotation.set(0, 0, 0);
            armRGroup.add(rifle);
            enemy.userData.rifle = rifle;

            // Right Arm holds trigger & stock aimed forward
            armRGroup.rotation.set(-0.15, -0.05, -0.05);

            // Left Arm reaches across chest to hold handguard underneath with two hands
            armLGroup.rotation.set(-0.35, 0.45, 0.15);
            foreArmL.position.set(0, -0.30, 0.18);
            foreArmL.rotation.set(-0.50, 0.22, 0);
            handL.position.set(0.06, -0.40, 0.42);
        } else {
            const knife = this.createKnifeMesh();
            knife.position.set(0, -0.42, 0.20);
            knife.rotation.set(0, 0, 0); // Blade points forward (+Z) directly at targets
            armRGroup.add(knife);
            enemy.userData.knife = knife;

            armRGroup.rotation.set(-0.30, 0.05, -0.05);
            armLGroup.rotation.set(-0.20, -0.05, 0.05);
        }

        // Stats & Animation State
        const diff = difficulty || { enemyHealth: 3, enemySpeedMin: 2.0, enemyGunDamage: 5, enemyMeleeDamage: 10 };
        const baseHealth = scaledStats ? (scaledStats.enemyHealth || diff.enemyHealth || 3) : (diff.enemyHealth || 3);
        const baseSpeed = scaledStats ? (scaledStats.enemySpeedMin || diff.enemySpeedMin || 2.0) : (diff.enemySpeedMin || diff.enemySpeed || 2.0);
        const baseDamage = isGunner
            ? (scaledStats ? (scaledStats.enemyGunDamage || diff.enemyGunDamage || 5) : (diff.enemyGunDamage || 5))
            : (scaledStats ? (scaledStats.enemyMeleeDamage || diff.enemyMeleeDamage || 10) : (diff.enemyMeleeDamage || 10));
        const shootInterval = scaledStats ? (scaledStats.enemyShootIntervalMin || diff.enemyShootIntervalMin || 1.8) : (diff.enemyShootIntervalMin || diff.enemyShootInterval || 1.8);

        enemy.userData.health = baseHealth;
        enemy.userData.maxHealth = baseHealth;
        enemy.userData.speed = baseSpeed * (isGunner ? 1.0 : 1.35);
        enemy.userData.damage = baseDamage;
        enemy.userData.accuracy = diff.enemyAccuracy || 0.6;
        enemy.userData.shootInterval = shootInterval;
        enemy.userData.shootTimer = THREE.MathUtils.randFloat(1.0, 2.5);
        enemy.userData.attackCooldown = 0;
        enemy.userData.attackAnim = 0;
        enemy.userData.alertTimer = 0;
        enemy.userData.time = Math.random() * 10;

        enemy.traverse(child => {
            if (child.isMesh) {
                child.userData.enemy = enemy;
            }
        });

        return enemy;
    }

    spawnEnemy(playerPos, archetype = 'gunner', difficulty, getGroundHeight, scaledStats = null) {
        const enemy = this.createEnemyMesh(archetype, difficulty, scaledStats);
        const spawnDistance = THREE.MathUtils.randFloat(28, 55);
        const spawnAngle = Math.random() * Math.PI * 2;

        const sx = playerPos.x + Math.sin(spawnAngle) * spawnDistance;
        const sz = playerPos.z + Math.cos(spawnAngle) * spawnDistance;

        let sy = 0;
        if (typeof getGroundHeight === 'function') {
            sy = getGroundHeight(sx, sz);
        }

        enemy.position.set(sx, sy, sz);
        this.scene.add(enemy);
        this.enemies.push(enemy);
        return enemy;
    }

    alertEnemiesNear(pos, radius = 50) {
        for (const enemy of this.enemies) {
            if (enemy.position.distanceTo(pos) <= radius) {
                enemy.userData.alertTimer = Math.max(enemy.userData.alertTimer || 0, 9.0);
            }
        }
    }

    update(delta, players, getGroundHeight, onPlayerDamaged, isPlayerHidden = false, obstacles = [], ladders = []) {
        let playersList = [];
        if (Array.isArray(players)) {
            playersList = players;
        } else {
            const pPos = (players && players.clone) ? players.clone() : new THREE.Vector3();
            playersList = [{
                id: 'host',
                pos: pPos,
                isCrouching: false,
                isPlayerHidden: isPlayerHidden,
                damageFn: (amount, source) => {
                    if (typeof onPlayerDamaged === 'function') {
                        onPlayerDamaged(amount, source || 'enemy');
                    }
                }
            }];
        }

        // 1. Update Enemy Bullets with Solid Obstacle Collision Checks
        this.bulletManager.update(delta, playersList, onPlayerDamaged, obstacles);

        // 2. Medkits Bobbing & Rotation
        for (const med of this.medkits) {
            med.position.y += Math.sin(Date.now() * 0.005) * 0.002;
            med.rotation.y += delta * 1.5;
        }

        // 3. Humanoid AI & Skeletal Locomotion with Ladder Climbing & LOS Detection
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (!enemy.parent) {
                this.enemies.splice(i, 1);
                continue;
            }

            if (enemy.userData.alertTimer > 0) {
                enemy.userData.alertTimer -= delta;
            }
            const isAlerted = (enemy.userData.alertTimer || 0) > 0;

            // Find closest visible player
            let closestPlayer = null;
            let minDistance = Infinity;

            for (const p of playersList) {
                if (!p || !p.pos) continue;
                const dx = p.pos.x - enemy.position.x;
                const dz = p.pos.z - enemy.position.z;
                const dist = Math.hypot(dx, dz);

                const enemyEyePos = enemy.position.clone();
                enemyEyePos.y += 1.6;
                const playerChestPos = p.pos.clone();
                playerChestPos.y -= 0.5;

                const hasLOS = hasLineOfSight(enemyEyePos, playerChestPos, obstacles);
                // When alerted (e.g. from taking damage or gunfire), enemies maintain active pursuit even if player enters a bush
                const effectiveHidden = p.isPlayerHidden && !isAlerted;
                const detectionRange = effectiveHidden ? (enemy.userData.archetype === 'gunner' ? 5.0 : 4.0) : 75.0;

                if (dist <= detectionRange && hasLOS) {
                    if (dist < minDistance) {
                        minDistance = dist;
                        closestPlayer = p;
                    }
                }
            }

            if (closestPlayer) {
                enemy.userData.alertTimer = 9.0;
            }

            const targetPlayer = closestPlayer || playersList[0] || { pos: new THREE.Vector3(0, 1.6, 20), isCrouching: false, damageFn: () => {} };
            const playerPos = targetPlayer.pos;
            const canSeePlayer = !!closestPlayer;
            const onPlayerHitCallback = targetPlayer.damageFn;

            const dx = playerPos.x - enemy.position.x;
            const dz = playerPos.z - enemy.position.z;
            const distToPlayer = Math.hypot(dx, dz);
            const dyToPlayer = playerPos.y - enemy.position.y;

            const isGunner = enemy.userData.archetype === 'gunner';
            const effectiveTargetHidden = targetPlayer.isPlayerHidden && !isAlerted;
            const inDetectionRange = canSeePlayer || isAlerted || distToPlayer <= (effectiveTargetHidden ? (isGunner ? 5.0 : 4.0) : 75.0);

            // Decrement ladder cooldown
            if (enemy.userData.ladderCooldown > 0) {
                enemy.userData.ladderCooldown -= delta;
            }

            // Target ladder search if player is vertically separated (e.g. on roof or below)
            let activeLadder = null;
            if (ladders && ladders.length > 0 && !enemy.userData.onLadder && (!enemy.userData.ladderCooldown || enemy.userData.ladderCooldown <= 0)) {
                if (dyToPlayer > 2.0) {
                    // Player is above: find nearest ladder leading up towards player's height
                    let bestDist = Infinity;
                    for (const lad of ladders) {
                        if (lad.top >= playerPos.y - 2.5) {
                            const dLad = Math.hypot(enemy.position.x - lad.x, enemy.position.z - lad.z);
                            if (dLad < bestDist && dLad < 90) {
                                bestDist = dLad;
                                activeLadder = lad;
                            }
                        }
                    }
                } else if (dyToPlayer < -3.0 && enemy.position.y > 3.0) {
                    // Player is below, enemy is on roof: find nearest ladder leading down
                    let bestDist = Infinity;
                    for (const lad of ladders) {
                        const dLad = Math.hypot(enemy.position.x - lad.x, enemy.position.z - lad.z);
                        if (dLad < bestDist && dLad < 40) {
                            bestDist = dLad;
                            activeLadder = lad;
                        }
                    }
                }
            }

            let isClimbing = false;
            let isMoving = false;
            let moveSpeed = enemy.userData.speed;

            // Handle Ladder Climbing State
            if (enemy.userData.onLadder && enemy.userData.climbLadder) {
                const lad = enemy.userData.climbLadder;
                isClimbing = true;
                const isClimbingUp = dyToPlayer >= -0.5;

                // Snap (x, z) smoothly to ladder
                enemy.position.x = THREE.MathUtils.lerp(enemy.position.x, lad.x, delta * 14);
                enemy.position.z = THREE.MathUtils.lerp(enemy.position.z, lad.z, delta * 14);

                if (isClimbingUp) {
                    enemy.position.y += 4.8 * delta;
                    if (enemy.position.y >= lad.buildingHeight) {
                        // Reached the roof! Step firmly onto rooftop inside building footprint
                        enemy.userData.onLadder = false;
                        enemy.userData.climbLadder = null;
                        enemy.userData.ladderCooldown = 2.5;

                        const bX = lad.buildingX !== undefined ? lad.buildingX : lad.x;
                        const bZ = lad.buildingZ !== undefined ? lad.buildingZ : lad.z - 2.0;
                        const dirInX = (bX - lad.x) || 0;
                        const dirInZ = (bZ - lad.z) || -1;
                        const len = Math.hypot(dirInX, dirInZ) || 1;

                        enemy.position.x = lad.x + (dirInX / len) * 1.8;
                        enemy.position.z = lad.z + (dirInZ / len) * 1.8;
                        enemy.position.y = lad.buildingHeight;
                    }
                } else {
                    enemy.position.y -= 5.2 * delta;
                    const gY = typeof getGroundHeight === 'function' ? getGroundHeight(enemy.position.x, enemy.position.z) : 0;
                    if (enemy.position.y <= gY + 0.3) {
                        // Reached the ground!
                        enemy.userData.onLadder = false;
                        enemy.userData.climbLadder = null;
                        enemy.userData.ladderCooldown = 2.5;
                        enemy.position.y = gY;
                    }
                }
            } else if (activeLadder) {
                // Navigate towards ladder
                const distToLadder = Math.hypot(enemy.position.x - activeLadder.x, enemy.position.z - activeLadder.z);
                if (distToLadder <= 1.3) {
                    // Mount ladder
                    enemy.userData.onLadder = true;
                    enemy.userData.climbLadder = activeLadder;
                    isClimbing = true;
                    const isClimbingUp = dyToPlayer >= -0.5;
                    enemy.position.y += (isClimbingUp ? 4.8 : -5.2) * delta;
                } else {
                    // Walk to ladder base / entry with collision
                    isMoving = true;
                    const ladDirX = (activeLadder.x - enemy.position.x) / distToLadder;
                    const ladDirZ = (activeLadder.z - enemy.position.z) / distToLadder;

                    const targetFacingYaw = Math.atan2(ladDirX, ladDirZ);
                    let diffAngle = targetFacingYaw - enemy.rotation.y;
                    while (diffAngle < -Math.PI) diffAngle += Math.PI * 2;
                    while (diffAngle > Math.PI) diffAngle -= Math.PI * 2;
                    enemy.rotation.y += diffAngle * Math.min(delta * 14.0, 1.0);

                    moveEnemyWithCollision(enemy, ladDirX * moveSpeed * delta, ladDirZ * moveSpeed * delta, obstacles);
                }
            } else {
                // Normal Ground / Roof Pursuit & Direct Face Tracking
                const targetFacingYaw = Math.atan2(dx, dz);
                let diffAngle = targetFacingYaw - enemy.rotation.y;
                while (diffAngle < -Math.PI) diffAngle += Math.PI * 2;
                while (diffAngle > Math.PI) diffAngle -= Math.PI * 2;
                enemy.rotation.y += diffAngle * Math.min(delta * 14.0, 1.0); // Fast responsive tracking directly facing player

                if (inDetectionRange) {
                    let shouldMove = true;
                    if (isGunner && distToPlayer < 24 && distToPlayer > 8 && canSeePlayer) {
                        shouldMove = false; // Gunner holds firing position if having clear LOS
                    }

                    if (shouldMove && distToPlayer > 1.2) {
                        isMoving = true;
                        let dirX = dx / distToPlayer;
                        let dirZ = dz / distToPlayer;

                        // Knife Rusher Tactical Weave when approaching from a distance
                        if (!isGunner && distToPlayer > 3.5 && canSeePlayer) {
                            const perpX = -dirZ;
                            const perpZ = dirX;
                            const weave = Math.sin(enemy.userData.time * 2.8) * 0.45;
                            dirX += perpX * weave;
                            dirZ += perpZ * weave;
                            const len = Math.hypot(dirX, dirZ) || 1;
                            dirX /= len;
                            dirZ /= len;
                        }

                        moveEnemyWithCollision(enemy, dirX * moveSpeed * delta, dirZ * moveSpeed * delta, obstacles);
                    }
                }
            }

            // Skeletal Locomotion / Ladder Animation Cycles
            if (isClimbing) {
                enemy.userData.time += delta * 9.0;
                const climbPhase = Math.sin(enemy.userData.time);

                // Alternating arm climb
                enemy.userData.armL.rotation.x = -Math.PI / 2 + climbPhase * 0.5;
                enemy.userData.armL.rotation.y = 0.2;
                enemy.userData.armR.rotation.x = -Math.PI / 2 - climbPhase * 0.5;
                enemy.userData.armR.rotation.y = -0.2;

                // Alternating leg rung steps
                enemy.userData.legLThigh.rotation.x = climbPhase * 0.6;
                enemy.userData.legLShin.rotation.x = Math.max(0, -climbPhase * 0.7);
                enemy.userData.legRThigh.rotation.x = -climbPhase * 0.6;
                enemy.userData.legRShin.rotation.x = Math.max(0, climbPhase * 0.7);

                enemy.userData.torsoGroup.rotation.x = 0.15;
                enemy.userData.torsoGroup.rotation.y = 0;
            } else if (isMoving) {
                enemy.userData.time += delta * 6.5;
                const stride = Math.sin(enemy.userData.time);
                const strideCos = Math.cos(enemy.userData.time);
                const thighAngle = stride * (isGunner ? 0.38 : 0.52);

                enemy.userData.legLThigh.rotation.x = thighAngle;
                enemy.userData.legLShin.rotation.x = Math.max(0, -stride * 0.65);
                enemy.userData.legRThigh.rotation.x = -thighAngle;
                enemy.userData.legRShin.rotation.x = Math.max(0, stride * 0.65);

                const forwardLean = isGunner ? 0.05 : 0.18;
                enemy.userData.torsoGroup.rotation.x = forwardLean;
                enemy.userData.torsoGroup.rotation.y = -stride * 0.08;
                enemy.userData.torsoGroup.position.y = 0.12 + Math.abs(strideCos) * 0.03;

                if (!isGunner && enemy.userData.attackAnim <= 0 && !canSeePlayer && !isAlerted) {
                    enemy.userData.armL.rotation.x = -stride * 0.45;
                    enemy.userData.armR.rotation.x = stride * 0.45 - 0.2;
                }
            } else {
                enemy.userData.legLThigh.rotation.x = THREE.MathUtils.lerp(enemy.userData.legLThigh.rotation.x, 0, delta * 8);
                enemy.userData.legLShin.rotation.x = THREE.MathUtils.lerp(enemy.userData.legLShin.rotation.x, 0, delta * 8);
                enemy.userData.legRThigh.rotation.x = THREE.MathUtils.lerp(enemy.userData.legRThigh.rotation.x, 0, delta * 8);
                enemy.userData.legRShin.rotation.x = THREE.MathUtils.lerp(enemy.userData.legRShin.rotation.x, 0, delta * 8);

                const breath = Math.sin(enemy.userData.time) * 0.025;
                enemy.userData.torsoGroup.rotation.x = THREE.MathUtils.lerp(enemy.userData.torsoGroup.rotation.x, breath, delta * 6);
                enemy.userData.torsoGroup.rotation.y = THREE.MathUtils.lerp(enemy.userData.torsoGroup.rotation.y, 0, delta * 6);
                enemy.userData.torsoGroup.position.y = 0.12 + breath * 0.4;
            }

            // Dynamic Pitch Tracking (Head & Weapon point directly at player chest, NOT upwards!)
            const pitchToPlayer = Math.atan2(playerPos.y - (enemy.position.y + 1.4), Math.max(0.5, distToPlayer));
            if (enemy.userData.head && (canSeePlayer || isAlerted)) {
                enemy.userData.head.rotation.x = THREE.MathUtils.clamp(-pitchToPlayer, -0.6, 0.6);
            }

            // Gunner / Boss Gunner Ranged Aim & Weapon Hold (Only when not climbing)
            if (isGunner && !isClimbing) {
                if (canSeePlayer || isAlerted) {
                    // Right arm aims weapon dead-on at player's chest (pitchToPlayer)
                    enemy.userData.armR.rotation.x = THREE.MathUtils.lerp(enemy.userData.armR.rotation.x, -pitchToPlayer, delta * 14);
                    enemy.userData.armR.rotation.y = -0.05;
                    enemy.userData.armL.rotation.x = THREE.MathUtils.lerp(enemy.userData.armL.rotation.x, -pitchToPlayer - 0.15, delta * 14);
                    enemy.userData.armL.rotation.y = 0.45;

                    enemy.userData.shootTimer -= delta;
                    if (distToPlayer < (enemy.userData.isBoss ? 75 : 55) && enemy.userData.shootTimer <= 0 && (canSeePlayer || isAlerted)) {
                        if (enemy.userData.isBoss) {
                            // Boss Machine Gun Suppressing Fire Burst (8 rapid shots per burst cycle)
                            enemy.userData.burstTimer = (enemy.userData.burstTimer || 0) - delta;
                            if (enemy.userData.burstTimer <= 0) {
                                const accuracy = enemy.userData.accuracy || 0.70;
                                const spreadAmount = (1 - accuracy) * 0.22;

                                const muzzleWorldPos = new THREE.Vector3();
                                if (enemy.userData.rifle?.userData?.muzzleFlash) {
                                    enemy.userData.rifle.userData.muzzleFlash.getWorldPosition(muzzleWorldPos);
                                    enemy.userData.rifle.userData.muzzleFlash.material.opacity = 1;
                                    setTimeout(() => {
                                        if (enemy.userData.rifle?.userData?.muzzleFlash?.material) {
                                            enemy.userData.rifle.userData.muzzleFlash.material.opacity = 0;
                                        }
                                    }, 40);
                                } else {
                                    muzzleWorldPos.copy(enemy.position);
                                    muzzleWorldPos.y += 1.6;
                                }

                                const targetDir = playerPos.clone().sub(muzzleWorldPos).normalize();
                                targetDir.x += (Math.random() - 0.5) * spreadAmount;
                                targetDir.y += (Math.random() - 0.5) * spreadAmount * 0.5;
                                targetDir.z += (Math.random() - 0.5) * spreadAmount;
                                targetDir.normalize();

                                const bullet = this.bulletManager.spawnBullet(muzzleWorldPos, targetDir, 75);
                                bullet.userData.damage = enemy.userData.damage || 8;

                                // Spin minigun barrel assembly
                                if (enemy.userData.minigun?.userData?.barrelGroup) {
                                    enemy.userData.minigun.userData.barrelGroup.rotation.z += 0.85;
                                }

                                soundEngine.playBossMachineGun();

                                enemy.userData.burstCount = (enemy.userData.burstCount || 0) + 1;
                                enemy.userData.burstTimer = 0.08; // High-rate burst interval

                                if (enemy.userData.burstCount >= 8) {
                                    enemy.userData.burstCount = 0;
                                    enemy.userData.shootTimer = enemy.userData.shootInterval + (Math.random() - 0.5) * 0.3;
                                }
                            }
                        } else {
                            // Standard Rifle Single Shot
                            const accuracy = enemy.userData.accuracy || 0.6;
                            const spreadAmount = (1 - accuracy) * 0.18;

                            const muzzleWorldPos = new THREE.Vector3();
                            if (enemy.userData.rifle?.userData?.muzzleFlash) {
                                enemy.userData.rifle.userData.muzzleFlash.getWorldPosition(muzzleWorldPos);
                                enemy.userData.rifle.userData.muzzleFlash.material.opacity = 1;
                                setTimeout(() => {
                                    if (enemy.userData.rifle?.userData?.muzzleFlash?.material) {
                                        enemy.userData.rifle.userData.muzzleFlash.material.opacity = 0;
                                    }
                                }, 50);
                            } else {
                                muzzleWorldPos.copy(enemy.position);
                                muzzleWorldPos.y += 1.4;
                            }

                            const targetDir = playerPos.clone().sub(muzzleWorldPos).normalize();
                            targetDir.x += (Math.random() - 0.5) * spreadAmount;
                            targetDir.y += (Math.random() - 0.5) * spreadAmount * 0.5;
                            targetDir.z += (Math.random() - 0.5) * spreadAmount;
                            targetDir.normalize();

                            const bullet = this.bulletManager.spawnBullet(muzzleWorldPos, targetDir);
                            bullet.userData.damage = enemy.userData.damage || 5;

                            if (enemy.userData.rifle) {
                                enemy.userData.rifle.position.z -= 0.07;
                                setTimeout(() => {
                                    if (enemy.userData?.rifle) enemy.userData.rifle.position.z += 0.07;
                                }, 70);
                            }

                            const pan = Math.sin(Math.atan2(dx, dz));
                            soundEngine.playEnemyShot(pan);

                            enemy.userData.shootTimer = enemy.userData.shootInterval + (Math.random() - 0.5) * 0.4;
                        }
                    }
                } else {
                    enemy.userData.armR.rotation.x = THREE.MathUtils.lerp(enemy.userData.armR.rotation.x, -0.15, delta * 6);
                    enemy.userData.armL.rotation.x = THREE.MathUtils.lerp(enemy.userData.armL.rotation.x, -0.35, delta * 6);
                }
            }

            // Knife Rusher Melee Attack & Stance (Only when not climbing)
            if (!isGunner && !isClimbing) {
                enemy.userData.attackCooldown -= delta;

                if (canSeePlayer || isAlerted) {
                    // Point knife arm forward directly towards player
                    if (enemy.userData.attackAnim <= 0) {
                        enemy.userData.armR.rotation.x = THREE.MathUtils.lerp(enemy.userData.armR.rotation.x, -pitchToPlayer - 0.15, delta * 12);
                        enemy.userData.armR.rotation.y = 0.05;
                    }
                }

                if (canSeePlayer && distToPlayer < 2.2 && enemy.userData.attackCooldown <= 0) {
                    soundEngine.playKnifeSlash();
                    soundEngine.playPlayerHurt();
                    enemy.userData.attackAnim = 1.0;
                    enemy.userData.attackCooldown = 1.1;

                    if (typeof onPlayerHitCallback === 'function') {
                        onPlayerHitCallback(enemy.userData.damage || 12, 'melee');
                    }
                }

                if (enemy.userData.attackAnim > 0) {
                    enemy.userData.attackAnim -= delta * 3.2;
                    const slashPhase = Math.sin(Math.max(0, enemy.userData.attackAnim) * Math.PI);
                    enemy.userData.armR.rotation.x = -0.3 - slashPhase * 1.2;
                    enemy.userData.armR.rotation.y = 0.05 - slashPhase * 0.4;
                }
            }

            // Ground Clamping (Disabled during active ladder climbing)
            if (!enemy.userData.onLadder) {
                let targetGroundY = 0;
                if (typeof getGroundHeight === 'function') {
                    const sampleGround = getGroundHeight(enemy.position.x, enemy.position.z);
                    // Only snap up if surface is within 1.6m step height; higher surfaces are overhead roofs!
                    if (sampleGround <= enemy.position.y + 1.6) {
                        targetGroundY = sampleGround;
                    }
                }

                enemy.position.y = THREE.MathUtils.lerp(
                    enemy.position.y,
                    targetGroundY,
                    delta * 8
                );
            }
            enemy.userData.isMoving = isMoving;
        }
    }

    clear() {
        for (const enemy of this.enemies) {
            this.scene.remove(enemy);
        }
        this.enemies = [];
        for (const med of this.medkits) {
            this.scene.remove(med);
        }
        this.medkits = [];
        this.bulletManager.clear();
    }
}
