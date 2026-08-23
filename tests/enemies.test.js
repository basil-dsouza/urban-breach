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

        const spawnPos = new THREE.Vector3(0, 1.5, 5);
        const targetDir = new THREE.Vector3(0, 0, -1);
        const bullet = bulletManager.spawnBullet(spawnPos, targetDir, 50);

        expect(bulletManager.bullets.length).toBe(1);

        let playerHitDamage = 0;
        const playerPos = new THREE.Vector3(0, 1.7, 0);

        bulletManager.update(0.1, playerPos, (dmg) => {
            playerHitDamage = dmg;
        });
        expect(bulletManager.bullets.length).toBe(1);

        bulletManager.update(0.1, playerPos, (dmg) => {
            playerHitDamage = dmg;
        });

        expect(playerHitDamage).toBeGreaterThan(0);
        expect(bulletManager.bullets.length).toBe(0);
    });
});
