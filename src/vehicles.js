import * as THREE from 'three';
import { soundEngine } from './audio.js';

/**
 * Hostile Combat Vehicle System: High-Threat Ramming Technicals with Active Pursuit & Obstacle Recovery
 */

export class VehicleManager {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.vehicles = [];
        this.options = options;
    }

    createCarMesh() {
        const car = new THREE.Group();

        // 1. High-Threat Tactical Materials Palette
        const palette = [
            0x2d3a29, // Matte Tactical Olive Drab
            0x1e242b, // Urban Digital Charcoal
            0x78654c, // Desert Sandstorm Tan
            0x16181b, // Blackout Stealth Armor
            0x421c1c  // Ops Crimson Dark
        ];
        const bodyColor = palette[Math.floor(Math.random() * palette.length)];

        const bodyMat = new THREE.MeshStandardMaterial({
            color: bodyColor,
            metalness: 0.65,
            roughness: 0.45
        });
        const armorDarkMat = new THREE.MeshStandardMaterial({
            color: 0x14171b,
            metalness: 0.88,
            roughness: 0.28
        });
        const trimMat = new THREE.MeshStandardMaterial({
            color: 0x0c0e10,
            metalness: 0.35,
            roughness: 0.85
        });
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x14222f,
            metalness: 0.6,
            roughness: 0.12,
            transparent: true,
            opacity: 0.88
        });
        const wheelMat = new THREE.MeshStandardMaterial({
            color: 0x121315,
            roughness: 0.95
        });
        const rimMat = new THREE.MeshStandardMaterial({
            color: 0x2b3038,
            metalness: 0.9,
            roughness: 0.25
        });
        const beadlockMat = new THREE.MeshStandardMaterial({
            color: 0x7c8590,
            metalness: 0.95,
            roughness: 0.2
        });
        const ramMat = new THREE.MeshStandardMaterial({
            color: 0x181a1d,
            metalness: 0.85,
            roughness: 0.35
        });
        const lightGlowMat = new THREE.MeshBasicMaterial({ color: 0xfffae6 });
        const amberGlowMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        const tailGlowMat = new THREE.MeshBasicMaterial({ color: 0xff1e1e });
        const redJerryMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.6 });
        const gunMat = new THREE.MeshStandardMaterial({ color: 0x15171a, metalness: 0.92, roughness: 0.22 });

        // 2. Chassis & Lower Armored Hull
        const mainHull = new THREE.Mesh(
            new THREE.BoxGeometry(2.35, 0.58, 4.9),
            bodyMat
        );
        mainHull.position.y = 0.68;
        mainHull.castShadow = true;
        mainHull.receiveShadow = true;
        car.add(mainHull);

        // Underbody Blast Skid Plate
        const skidPlate = new THREE.Mesh(
            new THREE.BoxGeometry(1.95, 0.16, 4.3),
            armorDarkMat
        );
        skidPlate.position.y = 0.35;
        car.add(skidPlate);

        // 3. Upper Armored Hull & Sloped Engine Bonnet (+Z is Front)
        const rearHull = new THREE.Mesh(
            new THREE.BoxGeometry(2.30, 0.56, 2.5),
            bodyMat
        );
        rearHull.position.set(0, 1.18, -1.0);
        rearHull.castShadow = true;
        car.add(rearHull);

        const hood = new THREE.Mesh(
            new THREE.BoxGeometry(2.26, 0.46, 1.9),
            bodyMat
        );
        hood.position.set(0, 1.08, 1.25);
        hood.rotation.x = 0.08;
        hood.castShadow = true;
        car.add(hood);

        // Twin Recessed Engine Cooling Cowl Louvers
        for (const side of [-0.55, 0.55]) {
            const louver = new THREE.Mesh(
                new THREE.BoxGeometry(0.52, 0.04, 0.9),
                armorDarkMat
            );
            louver.position.set(side, 1.26, 1.25);
            louver.rotation.x = 0.08;
            car.add(louver);
        }

        // 4. Aggressive Bolted Armored Fender Flares over Wheels
        for (const sx of [-1.20, 1.20]) {
            for (const sz of [-1.45, 1.45]) {
                const flare = new THREE.Mesh(
                    new THREE.BoxGeometry(0.22, 0.42, 1.35),
                    armorDarkMat
                );
                flare.position.set(sx, 0.90, sz);
                flare.castShadow = true;
                car.add(flare);
            }

            // Heavy Tubular Side Rock Sliders & Step Plates
            const rockSlider = new THREE.Mesh(
                new THREE.BoxGeometry(0.18, 0.10, 1.4),
                trimMat
            );
            rockSlider.position.set(sx * 1.05, 0.48, 0);
            car.add(rockSlider);
        }

        // 5. Armored Cabin with Fastback Raked A-Pillars & Vision Slits
        const cabin = new THREE.Mesh(
            new THREE.BoxGeometry(2.08, 0.78, 2.3),
            bodyMat
        );
        cabin.position.set(0, 1.70, -0.15);
        cabin.castShadow = true;
        car.add(cabin);

        // Sloped Ballistic Windshield
        const windshield = new THREE.Mesh(
            new THREE.BoxGeometry(1.92, 0.54, 0.06),
            glassMat
        );
        windshield.position.set(0, 1.74, 0.98);
        windshield.rotation.x = -0.38;
        car.add(windshield);

        const centerApost = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.56, 0.08),
            armorDarkMat
        );
        centerApost.position.set(0, 1.74, 0.98);
        centerApost.rotation.x = -0.38;
        car.add(centerApost);

        // Side Armored Vision Ports
        for (const side of [-1.05, 1.05]) {
            const sideGlass = new THREE.Mesh(
                new THREE.BoxGeometry(0.04, 0.38, 1.6),
                glassMat
            );
            sideGlass.position.set(side, 1.74, -0.15);
            car.add(sideGlass);

            // Ballistic Louver Guards
            for (let lz = -0.6; lz <= 0.6; lz += 0.4) {
                const louver = new THREE.Mesh(
                    new THREE.BoxGeometry(0.06, 0.03, 0.3),
                    armorDarkMat
                );
                louver.position.set(side * 1.01, 1.74, -0.15 + lz);
                car.add(louver);
            }
        }

        // Armored Roof Cap
        const roofCap = new THREE.Mesh(
            new THREE.BoxGeometry(2.14, 0.08, 2.38),
            armorDarkMat
        );
        roofCap.position.set(0, 2.10, -0.15);
        roofCap.castShadow = true;
        car.add(roofCap);

        // 6. Tactical Roof Basket, Fuel Jerry Cans & Spare Tire
        const roofBasket = new THREE.Mesh(
            new THREE.BoxGeometry(1.85, 0.16, 1.3),
            trimMat
        );
        roofBasket.position.set(0, 2.22, -0.65);
        car.add(roofBasket);

        // Dual Military Jerry Cans
        for (const jx of [-0.62, -0.32]) {
            const can = new THREE.Mesh(
                new THREE.BoxGeometry(0.20, 0.36, 0.30),
                redJerryMat
            );
            can.position.set(jx, 2.32, -0.65);
            car.add(can);
        }

        // Roof-Mounted Spare Off-Road Wheel
        const spareTire = new THREE.Mesh(
            new THREE.CylinderGeometry(0.44, 0.44, 0.30, 14),
            wheelMat
        );
        spareTire.position.set(0.42, 2.28, -0.65);
        car.add(spareTire);

        // 7. Heavy Combat Push-Bumper (Bullbar) & Ram Plates at +Z
        const ramBumper = new THREE.Mesh(
            new THREE.BoxGeometry(2.55, 0.42, 0.45),
            ramMat
        );
        ramBumper.position.set(0, 0.72, 2.58);
        ramBumper.castShadow = true;
        car.add(ramBumper);

        const pushPlate = new THREE.Mesh(
            new THREE.BoxGeometry(2.35, 0.65, 0.15),
            armorDarkMat
        );
        pushPlate.position.set(0, 0.95, 2.78);
        pushPlate.castShadow = true;
        car.add(pushPlate);

        const radiatorGuard = new THREE.Mesh(
            new THREE.BoxGeometry(2.2, 0.08, 0.08),
            ramMat
        );
        radiatorGuard.position.set(0, 1.36, 2.72);
        car.add(radiatorGuard);

        // Bumper Struts & Recovery D-Rings
        for (const side of [-0.85, 0.85]) {
            const strut = new THREE.Mesh(
                new THREE.BoxGeometry(0.08, 0.45, 0.08),
                ramMat
            );
            strut.position.set(side, 1.15, 2.72);
            car.add(strut);

            const dRing = new THREE.Mesh(
                new THREE.TorusGeometry(0.06, 0.018, 6, 12),
                armorDarkMat
            );
            dRing.position.set(side * 0.85, 0.55, 2.82);
            car.add(dRing);
        }

        // Heavy Winch Drum
        const winch = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.12, 0.55, 10),
            armorDarkMat
        );
        winch.rotation.z = Math.PI / 2;
        winch.position.set(0, 0.72, 2.82);
        car.add(winch);

        // 8. Quad LED Auxiliary Fog Lights on Bullbar
        for (let fx = -0.6; fx <= 0.6; fx += 0.4) {
            const fogPod = new THREE.Mesh(
                new THREE.CylinderGeometry(0.07, 0.07, 0.06, 8),
                amberGlowMat
            );
            fogPod.rotation.x = Math.PI / 2;
            fogPod.position.set(fx, 1.36, 2.78);
            car.add(fogPod);
        }

        // 9. Sleek Angular Headlights & Tail Lights
        for (const side of [-0.88, 0.88]) {
            const headlamp = new THREE.Mesh(
                new THREE.BoxGeometry(0.46, 0.18, 0.08),
                lightGlowMat
            );
            headlamp.position.set(side, 1.02, 2.46);
            car.add(headlamp);

            const marker = new THREE.Mesh(
                new THREE.BoxGeometry(0.12, 0.18, 0.08),
                amberGlowMat
            );
            marker.position.set(side + (side > 0 ? 0.28 : -0.28), 1.02, 2.46);
            car.add(marker);
        }

        // Forward Projecting Headlight Spotlight
        const spotLight = new THREE.SpotLight(0xfffae6, 4.5, 55, Math.PI / 5, 0.4);
        spotLight.position.set(0, 1.1, 2.7);
        const spotTarget = new THREE.Object3D();
        spotTarget.position.set(0, 0.5, 35);
        car.add(spotTarget);
        spotLight.target = spotTarget;
        car.add(spotLight);

        // Full-Width Rear LED Tail Light Bar at -Z
        const tailBar = new THREE.Mesh(
            new THREE.BoxGeometry(2.05, 0.14, 0.06),
            tailGlowMat
        );
        tailBar.position.set(0, 1.08, -2.48);
        car.add(tailBar);

        // 10. Heavy Mounted Twin-Barrel .50 HMG Roof Turret
        const turretRing = new THREE.Mesh(
            new THREE.CylinderGeometry(0.62, 0.68, 0.18, 16),
            armorDarkMat
        );
        turretRing.position.set(0, 2.16, 0.35);
        car.add(turretRing);

        // Angular Armored Gun Shield
        const gunShield = new THREE.Mesh(
            new THREE.BoxGeometry(0.88, 0.68, 0.10),
            armorDarkMat
        );
        gunShield.position.set(0, 2.58, 0.62);
        gunShield.castShadow = true;
        car.add(gunShield);

        const opticSlit = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.07, 0.12),
            glassMat
        );
        opticSlit.position.set(0, 2.72, 0.62);
        car.add(opticSlit);

        // Twin .50 Cal Heavy Machine Gun Barrels
        for (const gx of [-0.12, 0.12]) {
            const barrel = new THREE.Mesh(
                new THREE.CylinderGeometry(0.024, 0.024, 0.85, 10),
                gunMat
            );
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(gx, 2.52, 0.90);
            car.add(barrel);

            const brake = new THREE.Mesh(
                new THREE.CylinderGeometry(0.038, 0.038, 0.10, 8),
                gunMat
            );
            brake.rotation.x = Math.PI / 2;
            brake.position.set(gx, 2.52, 1.34);
            car.add(brake);
        }

        // Steel Ammo Can Drum
        const ammoDrum = new THREE.Mesh(
            new THREE.BoxGeometry(0.28, 0.28, 0.22),
            armorDarkMat
        );
        ammoDrum.position.set(-0.36, 2.48, 0.35);
        car.add(ammoDrum);

        // Tactical Gunner Silhouette
        const gunnerBody = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.22, 0.44, 4, 8),
            trimMat
        );
        gunnerBody.position.set(0, 2.50, 0.12);
        car.add(gunnerBody);

        // 11. All-Terrain Heavy Beadlock Wheels
        const wheelPositions = [
            [-1.25, 0.52, 1.45],
            [1.25, 0.52, 1.45],
            [-1.25, 0.52, -1.45],
            [1.25, 0.52, -1.45]
        ];

        car.userData.wheels = [];

        for (const [wx, wy, wz] of wheelPositions) {
            const wheelGroup = new THREE.Group();
            wheelGroup.position.set(wx, wy, wz);

            // Mud-Terrain Off-Road Tire
            const tire = new THREE.Mesh(
                new THREE.CylinderGeometry(0.54, 0.54, 0.48, 18),
                wheelMat
            );
            tire.rotation.z = Math.PI / 2;
            tire.castShadow = true;
            wheelGroup.add(tire);

            // Deep Concave Rim
            const rim = new THREE.Mesh(
                new THREE.CylinderGeometry(0.34, 0.34, 0.50, 10),
                rimMat
            );
            rim.rotation.z = Math.PI / 2;
            wheelGroup.add(rim);

            // Outer Beadlock Bolt Ring
            const beadlock = new THREE.Mesh(
                new THREE.TorusGeometry(0.32, 0.032, 6, 16),
                beadlockMat
            );
            beadlock.rotation.y = Math.PI / 2;
            beadlock.position.x = wx > 0 ? 0.24 : -0.24;
            wheelGroup.add(beadlock);

            car.add(wheelGroup);
            car.userData.wheels.push(wheelGroup);
        }

        car.traverse(child => {
            if (child.isMesh) {
                child.userData.vehicle = car;
            }
        });

        return car;
    }

    spawnVehicle(playerPos = new THREE.Vector3(0, 1.7, 0), difficulty) {
        const car = this.createCarMesh();
        const diff = difficulty || { carSpeed: 22, carDamage: 40 };

        // Available road lines in city grid: X = 0, X = 120, X = -120, Z = 0, Z = 120, Z = -120
        const roadAxes = [
            { type: 'z', x: 0 },
            { type: 'z', x: 120 },
            { type: 'z', x: -120 },
            { type: 'x', z: 0 },
            { type: 'x', z: 120 },
            { type: 'x', z: -120 }
        ];

        const chosenRoad = roadAxes[Math.floor(Math.random() * roadAxes.length)];
        let sx = 0;
        let sz = 0;
        let yaw = 0;

        if (chosenRoad.type === 'z') {
            sx = chosenRoad.x + (Math.random() > 0.5 ? 3.2 : -3.2);
            // Spawn 80m to 120m away from player along Z
            const spawnDirZ = (playerPos.z > 0 && Math.random() > 0.3) ? 1 : -1;
            sz = playerPos.z + spawnDirZ * THREE.MathUtils.randFloat(75, 110);
            sz = THREE.MathUtils.clamp(sz, -420, 420);
            yaw = sz > playerPos.z ? Math.PI : 0; // Face toward player
        } else {
            sz = chosenRoad.z + (Math.random() > 0.5 ? 3.2 : -3.2);
            const spawnDirX = (playerPos.x > 0 && Math.random() > 0.3) ? 1 : -1;
            sx = playerPos.x + spawnDirX * THREE.MathUtils.randFloat(75, 110);
            sx = THREE.MathUtils.clamp(sx, -420, 420);
            yaw = sx > playerPos.x ? -Math.PI / 2 : Math.PI / 2; // Face toward player
        }

        car.position.set(sx, 0, sz);
        car.rotation.y = yaw;

        car.userData.health = 35;
        car.userData.maxHealth = 35;
        car.userData.speed = diff.carSpeed || 22;
        car.userData.damage = diff.carDamage || 40;
        car.userData.state = 'pursuit'; // 'pursuit' | 'charge' | 'reverse' | 'pass'
        car.userData.stateTimer = 0;
        car.userData.ramCooldown = 0;
        car.userData.radius = 1.8;

        this.scene.add(car);
        this.vehicles.push(car);
        return car;
    }

    update(delta, playerPos, obstacles = [], onPlayerDamaged, onCarExploded) {
        for (let i = this.vehicles.length - 1; i >= 0; i--) {
            const car = this.vehicles[i];
            if (!car.parent) {
                this.vehicles.splice(i, 1);
                continue;
            }

            car.userData.ramCooldown -= delta;
            car.userData.stateTimer -= delta;

            const dx = playerPos.x - car.position.x;
            const dz = playerPos.z - car.position.z;
            const distToPlayer = Math.hypot(dx, dz);

            let targetYaw = car.rotation.y;
            let currentSpeed = car.userData.speed;
            let turnSpeed = 4.0;

            // 1. Combat State Machine
            if (car.userData.state === 'reverse') {
                // Reversing away from stuck wall/obstacle
                currentSpeed = -10.0;
                targetYaw += 0.8;
                turnSpeed = 2.0;

                if (car.userData.stateTimer <= 0) {
                    car.userData.state = 'pursuit';
                }
            } else if (car.userData.state === 'pass') {
                // Driving straight past player after ram attempt before turning around
                currentSpeed = car.userData.speed * 1.2;
                turnSpeed = 1.0;

                if (car.userData.stateTimer <= 0 || distToPlayer > 28) {
                    car.userData.state = 'pursuit';
                }
            } else if (distToPlayer < 18) {
                // Ram Surge: High speed charge directly through player
                car.userData.state = 'charge';
                currentSpeed = car.userData.speed * 1.45;
                turnSpeed = 1.5; // Lock heading for straight ram surge
                targetYaw = Math.atan2(dx, dz);

                if (distToPlayer < 3.2 && car.userData.ramCooldown <= 0) {
                    soundEngine.playCarCrash();
                    if (typeof onPlayerDamaged === 'function') {
                        onPlayerDamaged(car.userData.damage || 40, 'ram');
                    }
                    car.userData.ramCooldown = 2.0;
                    car.userData.state = 'pass';
                    car.userData.stateTimer = 1.8;
                }
            } else {
                // Active Pursuit: Steer towards player
                car.userData.state = 'pursuit';
                targetYaw = Math.atan2(dx, dz);
                currentSpeed = car.userData.speed;
                turnSpeed = 3.5;
            }

            // 2. Smooth Steering Rotation
            let diffAngle = targetYaw - car.rotation.y;
            while (diffAngle < -Math.PI) diffAngle += Math.PI * 2;
            while (diffAngle > Math.PI) diffAngle -= Math.PI * 2;
            car.rotation.y += diffAngle * Math.min(delta * turnSpeed, 1.0);

            // 3. Forward / Reverse Kinematic Movement
            const forwardX = Math.sin(car.rotation.y);
            const forwardZ = Math.cos(car.rotation.y);

            const nextX = car.position.x + forwardX * currentSpeed * delta;
            const nextZ = car.position.z + forwardZ * currentSpeed * delta;

            // 4. Obstacle Collision & Auto-Reverse Recovery
            const carRadius = car.userData.radius || 1.8;
            let hitObstacle = false;

            for (const obs of obstacles) {
                // Only test obstacles at ground level (exclude rooftop chimneys/towers)
                if ((obs.bottom || 0) > 2.0) continue;

                const halfW = obs.w / 2 + carRadius;
                const halfD = obs.d / 2 + carRadius;

                if (
                    nextX >= obs.x - halfW && nextX <= obs.x + halfW &&
                    nextZ >= obs.z - halfD && nextZ <= obs.z + halfD
                ) {
                    hitObstacle = true;
                    break;
                }
            }

            if (hitObstacle) {
                if (car.userData.state !== 'reverse') {
                    car.userData.state = 'reverse';
                    car.userData.stateTimer = 1.2;
                    soundEngine.playCarCrash();
                }
            } else {
                car.position.x = nextX;
                car.position.z = nextZ;
            }

            // 5. Spin Wheels
            for (const wheel of car.userData.wheels) {
                wheel.children[0].rotation.x += currentSpeed * delta * 2.2;
            }

            // Despawn only if drove completely off the 1000m map
            if (Math.abs(car.position.x) > 460 || Math.abs(car.position.z) > 460) {
                this.scene.remove(car);
                this.vehicles.splice(i, 1);
            }
        }
    }

    damageVehicle(car, amount, onCarExploded) {
        if (!car || !car.userData) return false;
        car.userData.health -= amount;

        if (car.userData.health <= 0) {
            this.destroyVehicle(car, onCarExploded);
            return true;
        }
        return false;
    }

    destroyVehicle(car, onCarExploded) {
        const index = this.vehicles.indexOf(car);
        if (index !== -1) {
            this.vehicles.splice(index, 1);
        }

        soundEngine.playGrenadeExplosion();

        const explosion = new THREE.Mesh(
            new THREE.SphereGeometry(3.8, 16, 16),
            new THREE.MeshBasicMaterial({
                color: 0xff4400,
                transparent: true,
                opacity: 0.9
            })
        );
        explosion.position.copy(car.position);
        explosion.position.y += 1.2;
        this.scene.add(explosion);

        setTimeout(() => {
            if (explosion.parent) this.scene.remove(explosion);
        }, 220);

        this.scene.remove(car);

        if (typeof onCarExploded === 'function') {
            onCarExploded(car.position);
        }
    }

    clear() {
        for (const car of this.vehicles) {
            this.scene.remove(car);
        }
        this.vehicles = [];
    }
}
