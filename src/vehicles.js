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

        // Materials
        const bodyColor = Math.random() > 0.5 ? 0x8b1e1e : 0x222d36;
        const bodyMat = new THREE.MeshStandardMaterial({
            color: bodyColor,
            metalness: 0.85,
            roughness: 0.35
        });
        const trimMat = new THREE.MeshStandardMaterial({
            color: 0x0d0f12,
            metalness: 0.9,
            roughness: 0.2
        });
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x22384a,
            metalness: 0.5,
            roughness: 0.1,
            transparent: true,
            opacity: 0.85
        });
        const wheelMat = new THREE.MeshStandardMaterial({
            color: 0x151618,
            roughness: 0.9
        });
        const rimMat = new THREE.MeshStandardMaterial({
            color: 0x889098,
            metalness: 0.85,
            roughness: 0.3
        });
        const ramMat = new THREE.MeshStandardMaterial({
            color: 0xbf3020,
            metalness: 0.7,
            roughness: 0.4
        });
        const lightGlowMat = new THREE.MeshBasicMaterial({ color: 0xffe680 });
        const tailGlowMat = new THREE.MeshBasicMaterial({ color: 0xff1a1a });

        // 1. Chassis / Main Body (Front is along +Z)
        const mainBody = new THREE.Mesh(
            new THREE.BoxGeometry(2.4, 0.85, 4.8),
            bodyMat
        );
        mainBody.position.y = 0.85;
        mainBody.castShadow = true;
        mainBody.receiveShadow = true;
        car.add(mainBody);

        // 2. Cabin / Roof
        const cabin = new THREE.Mesh(
            new THREE.BoxGeometry(2.1, 0.75, 2.4),
            glassMat
        );
        cabin.position.set(0, 1.55, -0.2);
        cabin.castShadow = true;
        car.add(cabin);

        const roofPlate = new THREE.Mesh(
            new THREE.BoxGeometry(2.15, 0.08, 2.45),
            trimMat
        );
        roofPlate.position.set(0, 1.95, -0.2);
        roofPlate.castShadow = true;
        car.add(roofPlate);

        // 3. Heavy Ram Bumper (Front Bullbar at +Z)
        const ramBar = new THREE.Mesh(
            new THREE.BoxGeometry(2.6, 0.65, 0.45),
            ramMat
        );
        ramBar.position.set(0, 0.75, 2.55);
        ramBar.castShadow = true;
        car.add(ramBar);

        // Reinforced Spikes on Ram Bar
        for (let i = -1.0; i <= 1.0; i += 0.65) {
            const spike = new THREE.Mesh(
                new THREE.ConeGeometry(0.12, 0.45, 6),
                trimMat
            );
            spike.rotation.x = Math.PI / 2;
            spike.position.set(i, 0.75, 2.82);
            car.add(spike);
        }

        // 4. Headlights (at +Z)
        const headL = new THREE.Mesh(
            new THREE.BoxGeometry(0.45, 0.25, 0.1),
            lightGlowMat
        );
        headL.position.set(-0.85, 0.9, 2.42);
        car.add(headL);

        const headR = headL.clone();
        headR.position.x = 0.85;
        car.add(headR);

        // Headlight Spotlights
        const spotLight = new THREE.SpotLight(0xfff0b3, 4.0, 45, Math.PI / 6, 0.4);
        spotLight.position.set(0, 1.0, 2.6);
        const spotTarget = new THREE.Object3D();
        spotTarget.position.set(0, 0.5, 30);
        car.add(spotTarget);
        spotLight.target = spotTarget;
        car.add(spotLight);

        // 5. Taillights (at -Z)
        const tailL = new THREE.Mesh(
            new THREE.BoxGeometry(0.45, 0.2, 0.08),
            tailGlowMat
        );
        tailL.position.set(-0.85, 0.9, -2.42);
        car.add(tailL);

        const tailR = tailL.clone();
        tailR.position.x = 0.85;
        car.add(tailR);

        // 6. Wheels
        const wheelPositions = [
            [-1.25, 0.5, 1.45],
            [1.25, 0.5, 1.45],
            [-1.25, 0.5, -1.45],
            [1.25, 0.5, -1.45]
        ];

        car.userData.wheels = [];

        for (const [wx, wy, wz] of wheelPositions) {
            const wheelGroup = new THREE.Group();
            wheelGroup.position.set(wx, wy, wz);

            const tire = new THREE.Mesh(
                new THREE.CylinderGeometry(0.52, 0.52, 0.45, 16),
                wheelMat
            );
            tire.rotation.z = Math.PI / 2;
            tire.castShadow = true;
            wheelGroup.add(tire);

            const rim = new THREE.Mesh(
                new THREE.CylinderGeometry(0.3, 0.3, 0.47, 8),
                rimMat
            );
            rim.rotation.z = Math.PI / 2;
            wheelGroup.add(rim);

            car.add(wheelGroup);
            car.userData.wheels.push(wheelGroup);
        }

        // 7. Armored Turret & Gunner Silhouette
        const turretRing = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.2, 10), trimMat);
        turretRing.position.set(0, 2.05, 0.2);
        car.add(turretRing);

        const gunnerBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.45, 4, 8), trimMat);
        gunnerBody.position.set(0, 2.35, 0.2);
        car.add(gunnerBody);

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
