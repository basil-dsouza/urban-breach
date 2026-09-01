import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { VehicleManager } from '../src/vehicles.js';
import { DIFFICULTY_LEVELS } from '../src/difficulty.js';

describe('VehicleManager — Active Combat Pursuit & Ramming AI', () => {
    it('should create realistic 3D hostile vehicle mesh with wheels and bullbar ram', () => {
        const scene = new THREE.Scene();
        const manager = new VehicleManager(scene);
        const car = manager.createCarMesh();

        expect(car).toBeDefined();
        expect(car.userData.wheels).toBeDefined();
        expect(car.userData.wheels.length).toBe(4);
    });

    it('should spawn vehicle near player with difficulty stats and sample ground height', () => {
        const scene = new THREE.Scene();
        const manager = new VehicleManager(scene);
        const diff = DIFFICULTY_LEVELS.HARD;
        const playerPos = new THREE.Vector3(0, 1.7, 0);
        const mockGround = (x, z) => 8.5; // 8.5m high hill
        const car = manager.spawnVehicle(playerPos, diff, mockGround);

        expect(manager.vehicles.length).toBe(1);
        expect(car.userData.speed).toBe(diff.carSpeed);
        expect(car.userData.damage).toBe(diff.carDamage);
        expect(car.position.y).toBe(8.5);
    });

    it('should steer and pursue player when in visual detection range', () => {
        const scene = new THREE.Scene();
        const manager = new VehicleManager(scene);
        const playerPos = new THREE.Vector3(0, 1.7, 0);
        const car = manager.spawnVehicle(playerPos, DIFFICULTY_LEVELS.MEDIUM);
        car.position.set(0, 0, 40);

        manager.update(0.1, playerPos, [], () => {}, () => {});
        expect(['pursuit', 'charge']).toContain(car.userData.state);
    });

    it('should dynamically ride over hills and adjust elevation and pitch slope', () => {
        const scene = new THREE.Scene();
        const manager = new VehicleManager(scene);
        const playerPos = new THREE.Vector3(0, 1.7, 0);
        const car = manager.spawnVehicle(playerPos, DIFFICULTY_LEVELS.MEDIUM);
        car.position.set(0, 0, 40);

        // Hill going up along Z: 10m height at z=40
        const mockGround = (x, z) => (z > 20 ? 10.0 : 0.0);

        // Run several update steps
        for (let i = 0; i < 10; i++) {
            manager.update(0.05, playerPos, [], () => {}, () => {}, mockGround);
        }

        // Car position.y should smoothly climb up towards 10m
        expect(car.position.y).toBeGreaterThan(5.0);
    });

    it('should damage player when car rams into player proximity', () => {
        const scene = new THREE.Scene();
        const manager = new VehicleManager(scene);
        const playerPos = new THREE.Vector3(0, 1.7, 0);
        const car = manager.spawnVehicle(playerPos, DIFFICULTY_LEVELS.MEDIUM);
        car.position.set(0, 0, 2); // Very close to player

        let playerDamage = 0;
        manager.update(0.05, playerPos, [], (dmg) => {
            playerDamage = dmg;
        }, () => {});

        expect(playerDamage).toBe(car.userData.damage);
        expect(car.userData.state).toBe('pass');
    });

    it('should deduct health when damaged and explode when health reaches 0', () => {
        const scene = new THREE.Scene();
        const manager = new VehicleManager(scene);
        const playerPos = new THREE.Vector3(0, 1.7, 0);
        const car = manager.spawnVehicle(playerPos, DIFFICULTY_LEVELS.MEDIUM);

        let exploded = false;
        manager.damageVehicle(car, 15, () => { exploded = true; });
        expect(car.userData.health).toBe(20);
        expect(exploded).toBe(false);

        manager.damageVehicle(car, 25, () => { exploded = true; });
        expect(exploded).toBe(true);
        expect(manager.vehicles.length).toBe(0);
    });
});
