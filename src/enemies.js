import * as THREE from 'three';
import { soundEngine } from './audio.js';

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

    update(delta, playerPos, onPlayerHit) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];

            bullet.position.add(
                bullet.userData.velocity.clone().multiplyScalar(delta)
            );

            // Check collision with player
            const playerCenter = playerPos.clone();
            playerCenter.y -= 0.85;

            const distToPlayer = bullet.position.distanceTo(playerCenter);
            if (distToPlayer < 1.35) {
                if (typeof onPlayerHit === 'function') {
                    onPlayerHit(bullet.userData.damage || 6);
                }
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
     * Creates an articulated enemy model with realistic facial features and two-handed weapon grip
     */
    createEnemyMesh(archetype = 'gunner', difficulty = {}) {
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

        // 6. Two-Handed Tactical Weapon Grip (Rifle held by BOTH hands)
        if (isGunner) {
            const rifle = this.createRifleMesh();
            rifle.position.set(0.04, -0.22, 0.42);
            rifle.rotation.set(0, 0, 0);
            armRGroup.add(rifle);
            enemy.userData.rifle = rifle;

            // Right Arm holds trigger & stock
            armRGroup.rotation.set(-0.35, -0.10, -0.05);

            // Left Arm reaches across chest to hold handguard underneath with two hands
            armLGroup.rotation.set(-0.45, 0.50, 0.18);
            foreArmL.position.set(0, -0.30, 0.18);
            foreArmL.rotation.set(-0.50, 0.22, 0);
            handL.position.set(0.06, -0.40, 0.42);
        } else {
            const knife = this.createKnifeMesh();
            knife.position.set(0, -0.52, 0.22);
            knife.rotation.set(-Math.PI / 2, 0, 0);
            armRGroup.add(knife);
            enemy.userData.knife = knife;

            armRGroup.rotation.set(-0.2, 0.05, -0.05);
            armLGroup.rotation.set(-0.2, -0.05, 0.05);
        }

        // Stats & Animation State
        const diff = difficulty || { enemyHealth: 3, enemySpeed: 3.5 };
        enemy.userData.health = diff.enemyHealth || 3;
        enemy.userData.maxHealth = diff.enemyHealth || 3;
        enemy.userData.speed = (diff.enemySpeed || 3.5) * (isGunner ? 1.0 : 1.35);
        enemy.userData.damage = isGunner ? (diff.enemyGunDamage || 5) : (diff.enemyMeleeDamage || 12);
        enemy.userData.accuracy = diff.enemyAccuracy || 0.6;
        enemy.userData.shootInterval = diff.enemyShootInterval || 1.8;
        enemy.userData.shootTimer = THREE.MathUtils.randFloat(1.0, 2.5);
        enemy.userData.attackCooldown = 0;
        enemy.userData.attackAnim = 0;
        enemy.userData.time = Math.random() * 10;

        enemy.traverse(child => {
            if (child.isMesh) {
                child.userData.enemy = enemy;
            }
        });

        return enemy;
    }

    spawnEnemy(playerPos, archetype = 'gunner', difficulty) {
        const enemy = this.createEnemyMesh(archetype, difficulty);
        const spawnDistance = THREE.MathUtils.randFloat(28, 55);
        const spawnAngle = Math.random() * Math.PI * 2;

        const sx = playerPos.x + Math.sin(spawnAngle) * spawnDistance;
        const sz = playerPos.z + Math.cos(spawnAngle) * spawnDistance;

        enemy.position.set(sx, 0, sz);
        this.scene.add(enemy);
        this.enemies.push(enemy);
        return enemy;
    }

    update(delta, playerPos, getGroundHeight, onPlayerDamaged, isPlayerHidden = false) {
        // 1. Update Enemy Bullets
        this.bulletManager.update(delta, playerPos, onPlayerDamaged);

        // 2. Medkits Bobbing & Rotation
        for (const med of this.medkits) {
            med.position.y += Math.sin(Date.now() * 0.005) * 0.002;
            med.rotation.y += delta * 1.5;
        }

        // 3. Humanoid AI & Natural Skeletal Locomotion
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (!enemy.parent) {
                this.enemies.splice(i, 1);
                continue;
            }

            const dx = playerPos.x - enemy.position.x;
            const dz = playerPos.z - enemy.position.z;
            const distToPlayer = Math.hypot(dx, dz);

            const isGunner = enemy.userData.archetype === 'gunner';

            // Bush Stealth Detection
            const detectionRange = isPlayerHidden ? (isGunner ? 5.0 : 4.0) : 75.0;
            const canSeePlayer = distToPlayer <= detectionRange;

            // Smooth Facing Rotation towards player
            const targetFacingYaw = Math.atan2(dx, dz);
            let diffAngle = targetFacingYaw - enemy.rotation.y;
            while (diffAngle < -Math.PI) diffAngle += Math.PI * 2;
            while (diffAngle > Math.PI) diffAngle -= Math.PI * 2;
            enemy.rotation.y += diffAngle * Math.min(delta * 6.0, 1.0);

            // Movement AI
            let isMoving = false;
            let moveSpeed = enemy.userData.speed;

            if (canSeePlayer) {
                let shouldMove = true;
                if (isGunner && distToPlayer < 24 && distToPlayer > 8) {
                    shouldMove = false; // Gunner holds firing range
                }

                if (shouldMove && distToPlayer > 1.2) {
                    isMoving = true;
                    let dirX = dx / distToPlayer;
                    let dirZ = dz / distToPlayer;

                    // Knife Rusher Tactical Weave when approaching from a distance
                    if (!isGunner && distToPlayer > 3.5) {
                        const perpX = -dirZ;
                        const perpZ = dirX;
                        const weave = Math.sin(enemy.userData.time * 2.8) * 0.45;
                        dirX += perpX * weave;
                        dirZ += perpZ * weave;
                        const len = Math.hypot(dirX, dirZ) || 1;
                        dirX /= len;
                        dirZ /= len;
                    }

                    enemy.position.x += dirX * moveSpeed * delta;
                    enemy.position.z += dirZ * moveSpeed * delta;
                }
            }

            // Natural Humanoid Locomotion Cycles
            enemy.userData.time += delta * (isMoving ? 6.5 : 1.8);
            const stride = Math.sin(enemy.userData.time);
            const strideCos = Math.cos(enemy.userData.time);

            if (isMoving) {
                const thighAngle = stride * (isGunner ? 0.38 : 0.52);

                // Left Leg Cycle (Thigh forward -> Shin bends back on return)
                enemy.userData.legLThigh.rotation.x = thighAngle;
                enemy.userData.legLShin.rotation.x = Math.max(0, -stride * 0.65);

                // Right Leg Cycle
                enemy.userData.legRThigh.rotation.x = -thighAngle;
                enemy.userData.legRShin.rotation.x = Math.max(0, stride * 0.65);

                // Torso Natural Sway
                const forwardLean = isGunner ? 0.05 : 0.18;
                enemy.userData.torsoGroup.rotation.x = forwardLean;
                enemy.userData.torsoGroup.rotation.y = -stride * 0.08;
                enemy.userData.torsoGroup.position.y = 0.12 + Math.abs(strideCos) * 0.03;

                if (!isGunner && enemy.userData.attackAnim <= 0) {
                    enemy.userData.armL.rotation.x = -stride * 0.45;
                    enemy.userData.armR.rotation.x = stride * 0.45 - 0.2;
                }
            } else {
                // Natural Idle Stance & Breathing
                enemy.userData.legLThigh.rotation.x = THREE.MathUtils.lerp(enemy.userData.legLThigh.rotation.x, 0, delta * 8);
                enemy.userData.legLShin.rotation.x = THREE.MathUtils.lerp(enemy.userData.legLShin.rotation.x, 0, delta * 8);
                enemy.userData.legRThigh.rotation.x = THREE.MathUtils.lerp(enemy.userData.legRThigh.rotation.x, 0, delta * 8);
                enemy.userData.legRShin.rotation.x = THREE.MathUtils.lerp(enemy.userData.legRShin.rotation.x, 0, delta * 8);

                const breath = Math.sin(enemy.userData.time) * 0.025;
                enemy.userData.torsoGroup.rotation.x = THREE.MathUtils.lerp(enemy.userData.torsoGroup.rotation.x, breath, delta * 6);
                enemy.userData.torsoGroup.rotation.y = THREE.MathUtils.lerp(enemy.userData.torsoGroup.rotation.y, 0, delta * 6);
                enemy.userData.torsoGroup.position.y = 0.12 + breath * 0.4;
            }

            // Head Dynamic Pitch Tracking
            if (enemy.userData.head && canSeePlayer) {
                const pitchToPlayer = Math.atan2(playerPos.y - (enemy.position.y + 1.8), distToPlayer);
                enemy.userData.head.rotation.x = THREE.MathUtils.clamp(-pitchToPlayer, -0.4, 0.4);
            }

            // Gunner Ranged Aim & Two-Handed Hold (Both arms track pitch together)
            if (isGunner) {
                if (canSeePlayer) {
                    const pitchToPlayer = Math.atan2(playerPos.y - (enemy.position.y + 1.4), distToPlayer);

                    // Right arm holds trigger & stock aimed forward at player
                    enemy.userData.armR.rotation.x = THREE.MathUtils.lerp(enemy.userData.armR.rotation.x, -pitchToPlayer - 0.35, delta * 12);
                    enemy.userData.armR.rotation.y = -0.10;

                    // Left arm supports handguard in two-handed grip
                    enemy.userData.armL.rotation.x = THREE.MathUtils.lerp(enemy.userData.armL.rotation.x, -pitchToPlayer - 0.45, delta * 12);
                    enemy.userData.armL.rotation.y = 0.50;

                    enemy.userData.shootTimer -= delta;
                    if (distToPlayer < 55 && enemy.userData.shootTimer <= 0) {
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

                        // Target direction towards player camera
                        const targetDir = playerPos.clone().sub(muzzleWorldPos).normalize();
                        targetDir.x += (Math.random() - 0.5) * spreadAmount;
                        targetDir.y += (Math.random() - 0.5) * spreadAmount * 0.5;
                        targetDir.z += (Math.random() - 0.5) * spreadAmount;
                        targetDir.normalize();

                        const bullet = this.bulletManager.spawnBullet(muzzleWorldPos, targetDir);
                        bullet.userData.damage = enemy.userData.damage || 5;

                        // Recoil kick
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
                } else {
                    // Idle two-handed carry when not seeing player
                    enemy.userData.armR.rotation.x = THREE.MathUtils.lerp(enemy.userData.armR.rotation.x, -0.35, delta * 6);
                    enemy.userData.armL.rotation.x = THREE.MathUtils.lerp(enemy.userData.armL.rotation.x, -0.45, delta * 6);
                }
            }

            // Knife Rusher Melee Attack (Smooth, deterministic state-driven animation)
            if (!isGunner) {
                enemy.userData.attackCooldown -= delta;

                if (canSeePlayer && distToPlayer < 2.2 && enemy.userData.attackCooldown <= 0) {
                    soundEngine.playKnifeSlash();
                    soundEngine.playPlayerHurt();
                    enemy.userData.attackAnim = 1.0;
                    enemy.userData.attackCooldown = 1.1;

                    if (typeof onPlayerDamaged === 'function') {
                        onPlayerDamaged(enemy.userData.damage || 12, 'melee');
                    }
                }

                if (enemy.userData.attackAnim > 0) {
                    enemy.userData.attackAnim -= delta * 3.2;
                    const slashPhase = Math.sin(Math.max(0, enemy.userData.attackAnim) * Math.PI);
                    enemy.userData.armR.rotation.x = -0.2 - slashPhase * 1.1;
                    enemy.userData.armR.rotation.y = 0.05 - slashPhase * 0.4;
                }
            }

            // Ground Clamping
            const groundY = typeof getGroundHeight === 'function'
                ? getGroundHeight(enemy.position.x, enemy.position.z)
                : 0;

            enemy.position.y = THREE.MathUtils.lerp(
                enemy.position.y,
                groundY,
                delta * 8
            );
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
