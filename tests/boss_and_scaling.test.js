import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { DIFFICULTY_LEVELS, getWaveEnemyScaling } from '../src/difficulty.js';
import { EnemyManager } from '../src/enemies.js';

describe('Progressive Wave & Difficulty Scaling Engine', () => {
    it('should scale Survivor baseline attributes by 1.5x every 7 rounds', () => {
        const diff = DIFFICULTY_LEVELS.MEDIUM;
        const wave1 = getWaveEnemyScaling(1, diff);
        const wave8 = getWaveEnemyScaling(8, diff);
        const wave15 = getWaveEnemyScaling(15, diff);

        expect(wave1.waveMultiplier).toBeCloseTo(1.0, 2);
        expect(wave8.waveMultiplier).toBeCloseTo(1.5, 2);
        expect(wave15.waveMultiplier).toBeCloseTo(2.25, 2);

        expect(wave1.enemyHealth).toBe(diff.enemyHealth);
        expect(wave8.enemyHealth).toBe(Math.round(diff.enemyHealth * 1.5));
        expect(wave15.enemyHealth).toBe(Math.round(diff.enemyHealth * 2.25));

        expect(wave8.enemyCount).toBeGreaterThan(wave1.enemyCount);
        expect(wave15.enemyCount).toBeGreaterThan(wave8.enemyCount);
    });

    it('should scale difficulty tiers proportionally (Recruit slower, Apocalypse faster)', () => {
        const recruitWave8 = getWaveEnemyScaling(8, DIFFICULTY_LEVELS.EASY);
        const survivorWave8 = getWaveEnemyScaling(8, DIFFICULTY_LEVELS.MEDIUM);
        const veteranWave8 = getWaveEnemyScaling(8, DIFFICULTY_LEVELS.HARD);
        const apocWave8 = getWaveEnemyScaling(8, DIFFICULTY_LEVELS.NIGHTMARE);

        expect(recruitWave8.waveMultiplier).toBeLessThan(survivorWave8.waveMultiplier);
        expect(survivorWave8.waveMultiplier).toBeLessThan(veteranWave8.waveMultiplier);
        expect(veteranWave8.waveMultiplier).toBeLessThan(apocWave8.waveMultiplier);

        expect(apocWave8.enemyHealth).toBeGreaterThan(survivorWave8.enemyHealth);
        expect(apocWave8.enemyGunDamage).toBeGreaterThan(survivorWave8.enemyGunDamage);
    });

    it('should designate boss waves every 5 rounds and scale boss attributes', () => {
        const diff = DIFFICULTY_LEVELS.MEDIUM;
        expect(getWaveEnemyScaling(1, diff).isBossWave).toBe(false);
        expect(getWaveEnemyScaling(4, diff).isBossWave).toBe(false);
        expect(getWaveEnemyScaling(5, diff).isBossWave).toBe(true);
        expect(getWaveEnemyScaling(10, diff).isBossWave).toBe(true);
        expect(getWaveEnemyScaling(15, diff).isBossWave).toBe(true);

        const bossWave5 = getWaveEnemyScaling(5, diff);
        const bossWave10 = getWaveEnemyScaling(10, diff);

        expect(bossWave5.bossLevel).toBe(1);
        expect(bossWave10.bossLevel).toBe(2);
        expect(bossWave10.bossHealth).toBeGreaterThan(bossWave5.bossHealth);
        expect(bossWave10.bossDamage).toBeGreaterThanOrEqual(bossWave5.bossDamage);
    });
});

describe('Machine Gunner Boss 3D Entity & AI', () => {
    it('should create an imposing 1.4x scale Heavy Juggernaut model with minigun and titanium armor', () => {
        const scene = new THREE.Scene();
        const manager = new EnemyManager(scene);
        const boss = manager.createBossGunnerMesh(DIFFICULTY_LEVELS.MEDIUM, { bossHealth: 500, bossDamage: 12 });

        expect(boss.userData.isBoss).toBe(true);
        expect(boss.userData.archetype).toBe('boss_gunner');
        expect(boss.userData.bossName).toBe('JUGGERNAUT MACHINE GUNNER');
        expect(boss.userData.health).toBe(500);
        expect(boss.userData.maxHealth).toBe(500);
        expect(boss.scale.x).toBeGreaterThanOrEqual(1.35);
        expect(boss.userData.minigun).toBeDefined();
        expect(boss.userData.minigun.userData.barrelGroup).toBeDefined();
        expect(boss.userData.minigun.userData.barrelGroup.children.length).toBeGreaterThanOrEqual(5);
    });

    it('should spawn boss into scene and register in enemies list', () => {
        const scene = new THREE.Scene();
        const manager = new EnemyManager(scene);
        const playerPos = new THREE.Vector3(0, 1.7, 0);
        const boss = manager.spawnBossGunner(playerPos, DIFFICULTY_LEVELS.MEDIUM, () => 0, 5, { bossHealth: 450 });
        expect(manager.enemies).toContain(boss);
        expect(boss.position.distanceTo(playerPos)).toBeGreaterThan(20);
        expect(boss.userData.isBoss).toBe(true);
    });

    it('should calculate scaled enemy health and damage when passed to createEnemyMesh', () => {
        const scene = new THREE.Scene();
        const manager = new EnemyManager(scene);
        const scaling = getWaveEnemyScaling(8, DIFFICULTY_LEVELS.MEDIUM);
        const enemy = manager.createEnemyMesh('gunner', DIFFICULTY_LEVELS.MEDIUM, scaling);

        expect(enemy.userData.health).toBe(scaling.enemyHealth);
        expect(enemy.userData.damage).toBe(scaling.enemyGunDamage);
    });
});
