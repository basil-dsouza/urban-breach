import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { EnemyManager, EnemyBulletManager } from '../src/enemies.js';
import { DIFFICULTY_LEVELS } from '../src/difficulty.js';

describe('EnemyManager & Lifelike Humanoid Modeling', () => {
    it('should generate lifelike human face features (eyes, eyebrows, nose, lips, ears, headset)', () => {
        const scene = new THREE.Scene();
        const manager = new EnemyManager(scene);
        const enemy = manager.createEnemyMesh('gunner', DIFFICULTY_LEVELS.MEDIUM);

        expect(enemy.userData.head).toBeDefined();
        // Head must contain facial feature meshes
        expect(enemy.userData.head.children.length).toBeGreaterThanOrEqual(10);
    });

    it('should create Gunner with authentic two-handed rifle grip', () => {
        const scene = new THREE.Scene();
        const manager = new EnemyManager(scene);
        const diff = DIFFICULTY_LEVELS.HARD;
        const gunner = manager.createEnemyMesh('gunner', diff);

        expect(gunner.userData.archetype).toBe('gunner');
        expect(gunner.userData.rifle).toBeDefined();
        expect(gunner.userData.armR).toBeDefined();
        expect(gunner.userData.armL).toBeDefined();

        // Right arm holds trigger, left arm reaches across in supporting grip
        expect(gunner.userData.armR.rotation.x).toBeLessThan(0.0);
        expect(gunner.userData.armL.rotation.y).toBeGreaterThan(0.2);
    });

    it('should create articulated multi-joint leg skeleton with bending knees', () => {
        const scene = new THREE.Scene();
        const manager = new EnemyManager(scene);
        const enemy = manager.createEnemyMesh('gunner', DIFFICULTY_LEVELS.MEDIUM);

        expect(enemy.userData.pelvis).toBeDefined();
        expect(enemy.userData.legLThigh).toBeDefined();
        expect(enemy.userData.legLShin).toBeDefined();
        expect(enemy.userData.legRThigh).toBeDefined();
        expect(enemy.userData.legRShin).toBeDefined();

        // Shin must be child of Thigh (multi-joint kinematics)
        expect(enemy.userData.legLThigh.children).toContain(enemy.userData.legLShin);
        expect(enemy.userData.legRThigh.children).toContain(enemy.userData.legRShin);
    });

    it('should execute melee attack animation cleanly with state timers', () => {
        const scene = new THREE.Scene();
        const manager = new EnemyManager(scene);
        const knifeRusher = manager.createEnemyMesh('knife', DIFFICULTY_LEVELS.EASY);
        knifeRusher.position.set(0, 0, 2);
        scene.add(knifeRusher);
        manager.enemies.push(knifeRusher);

        let damagedCount = 0;
        const playerPos = new THREE.Vector3(0, 1.7, 0);

        manager.update(0.016, playerPos, () => 0, () => {
            damagedCount++;
        });

        expect(damagedCount).toBe(1);
        expect(knifeRusher.userData.attackAnim).toBeGreaterThan(0.8);
        expect(knifeRusher.userData.attackCooldown).toBeGreaterThan(0.5);
    });

    it('should respect bush stealth camouflage (ignores player beyond 5m when hidden)', () => {
        const scene = new THREE.Scene();
        const manager = new EnemyManager(scene);
        const gunner = manager.createEnemyMesh('gunner', DIFFICULTY_LEVELS.MEDIUM);
        gunner.position.set(0, 0, 15);
        scene.add(gunner);
        manager.enemies.push(gunner);

        const playerPos = new THREE.Vector3(0, 1.7, 0);
        gunner.userData.shootTimer = 0;

        // Hidden in foliage: no shot fired
        manager.update(0.016, playerPos, () => 0, () => {}, true);
        expect(manager.bulletManager.bullets.length).toBe(0);

        // Open field: shot fired
        manager.update(0.016, playerPos, () => 0, () => {}, false);
        expect(manager.bulletManager.bullets.length).toBe(1);
    });

    it('should spawn enemy bullets and detect player hits', () => {
        const scene = new THREE.Scene();
        const bulletManager = new EnemyBulletManager(scene);

        const spawnPos = new THREE.Vector3(0, 1.5, 10);
        const targetDir = new THREE.Vector3(0, 0, -1);
        const bullet = bulletManager.spawnBullet(spawnPos, targetDir, 50);

        expect(bulletManager.bullets.length).toBe(1);

        let playerHitDamage = 0;
        const playerPos = new THREE.Vector3(0, 1.7, 0);

        // Move bullet 5m forward (z = 5m)
        bulletManager.update(0.1, playerPos, (dmg) => {
            playerHitDamage = dmg;
        });
        expect(bulletManager.bullets.length).toBe(1);

        // Move bullet remaining 5m forward (z = 0m, impacts player)
        bulletManager.update(0.1, playerPos, (dmg) => {
            playerHitDamage = dmg;
        });

        expect(playerHitDamage).toBeGreaterThan(0);
        expect(bulletManager.bullets.length).toBe(0);
    });

    it('should block line of sight and prevent shooting through solid buildings', () => {
        const scene = new THREE.Scene();
        const manager = new EnemyManager(scene);
        const gunner = manager.createEnemyMesh('gunner', DIFFICULTY_LEVELS.MEDIUM);
        gunner.position.set(0, 0, 20);
        scene.add(gunner);
        manager.enemies.push(gunner);

        const playerPos = new THREE.Vector3(0, 1.7, 0);
        gunner.userData.shootTimer = 0;

        const obstacles = [
            { x: 0, z: 10, w: 12, d: 8, bottom: 0, top: 15 } // Building directly between player and enemy
        ];

        // Obstructed by building: enemy cannot see player and does not fire
        manager.update(0.016, playerPos, () => 0, () => {}, false, obstacles);
        expect(manager.bulletManager.bullets.length).toBe(0);

        // Building removed: clear line of sight, enemy fires
        manager.update(0.016, playerPos, () => 0, () => {}, false, []);
        expect(manager.bulletManager.bullets.length).toBe(1);
    });

    it('should destroy enemy bullets when colliding with solid building obstacles', () => {
        const scene = new THREE.Scene();
        const bulletManager = new EnemyBulletManager(scene);

        const spawnPos = new THREE.Vector3(0, 1.5, 20);
        const targetDir = new THREE.Vector3(0, 0, -1);
        bulletManager.spawnBullet(spawnPos, targetDir, 60);

        const obstacles = [
            { x: 0, z: 10, w: 8, d: 8, bottom: 0, top: 10 }
        ];

        const playerPos = new THREE.Vector3(0, 1.7, 0);

        // Move bullet into building obstacle
        bulletManager.update(0.2, playerPos, () => {}, obstacles);

        // Bullet should be destroyed on building collision
        expect(bulletManager.bullets.length).toBe(0);
    });

    it('should navigate to and climb ladders when player is on a rooftop', () => {
        const scene = new THREE.Scene();
        const manager = new EnemyManager(scene);
        const enemy = manager.createEnemyMesh('knife', DIFFICULTY_LEVELS.MEDIUM);
        enemy.position.set(5, 0, 5);
        scene.add(enemy);
        manager.enemies.push(enemy);

        // Player is elevated on rooftop at y = 14m
        const playerPos = new THREE.Vector3(0, 14, 0);

        const ladders = [
            { x: 2, z: 2, buildingHeight: 12, height: 13.4, bottom: 0, top: 13.4 }
        ];

        // Enemy should move towards ladder base
        manager.update(0.1, playerPos, () => 0, () => {}, false, [], ladders);
        expect(enemy.position.x).toBeLessThan(5);
        expect(enemy.position.z).toBeLessThan(5);

        // Place enemy at ladder base
        enemy.position.set(2.2, 0, 2.2);
        manager.update(0.1, playerPos, () => 0, () => {}, false, [], ladders);

        // Enemy should enter ladder climb mode and ascend vertically
        expect(enemy.userData.onLadder).toBe(true);
        expect(enemy.position.y).toBeGreaterThan(0);
    });
});
