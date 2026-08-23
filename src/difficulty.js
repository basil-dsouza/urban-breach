/**
 * Difficulty System and Configuration (Rebalanced Progression)
 */

export const DIFFICULTY_LEVELS = {
    EASY: {
        id: 'EASY',
        name: 'RECRUIT',
        badge: 'RECRUIT (EASY)',
        color: '#4ade80',
        description: 'Casual survival. Slower hostiles, lower firearm accuracy, higher player health, and frequent medkits.',
        playerHealth: 200,
        enemyHealth: 3,
        enemySpeedMin: 1.5,
        enemySpeedMax: 2.1,
        enemyGunDamage: 3,
        enemyMeleeDamage: 4,
        enemyAccuracy: 0.35,
        enemyShootIntervalMin: 2.8,
        enemyShootIntervalMax: 4.2,
        initialEnemies: 2,
        maxEnemies: 8,
        knifeEnemyRatio: 0.2,
        carSpawnWave: 3, // Cars don't appear until Wave 3 on Easy
        carSpawnInterval: 30,
        carSpeed: 12,
        carDamage: 20,
        medkitDropChance: 0.65
    },
    MEDIUM: {
        id: 'MEDIUM',
        name: 'SURVIVOR',
        badge: 'SURVIVOR (NORMAL)',
        color: '#38bdf8',
        description: 'Standard survival experience. Balanced hostile squads, stalkers, and tactical traffic.',
        playerHealth: 125,
        enemyHealth: 4,
        enemySpeedMin: 1.9,
        enemySpeedMax: 2.7,
        enemyGunDamage: 5,
        enemyMeleeDamage: 6,
        enemyAccuracy: 0.55,
        enemyShootIntervalMin: 1.8,
        enemyShootIntervalMax: 3.2,
        initialEnemies: 3,
        maxEnemies: 14,
        knifeEnemyRatio: 0.3,
        carSpawnWave: 2, // Cars appear starting Wave 2
        carSpawnInterval: 20,
        carSpeed: 18,
        carDamage: 35,
        medkitDropChance: 0.45
    },
    HARD: {
        id: 'HARD',
        name: 'VETERAN',
        badge: 'VETERAN (HARD)',
        color: '#fbbf24',
        description: 'Hardened combat. Fast-moving hostiles, aggressive marksmen, and rapid ramming vehicles.',
        playerHealth: 85,
        enemyHealth: 6,
        enemySpeedMin: 2.5,
        enemySpeedMax: 3.4,
        enemyGunDamage: 9,
        enemyMeleeDamage: 10,
        enemyAccuracy: 0.80,
        enemyShootIntervalMin: 1.2,
        enemyShootIntervalMax: 2.2,
        initialEnemies: 5,
        maxEnemies: 20,
        knifeEnemyRatio: 0.4,
        carSpawnWave: 1,
        carSpawnInterval: 14,
        carSpeed: 25,
        carDamage: 55,
        medkitDropChance: 0.28
    },
    NIGHTMARE: {
        id: 'NIGHTMARE',
        name: 'APOCALYPSE',
        badge: 'APOCALYPSE (NIGHTMARE)',
        color: '#f87171',
        description: 'Brutal and unforgiving. Swarming hostiles, deadly accuracy, and relentless road rammers.',
        playerHealth: 60,
        enemyHealth: 8,
        enemySpeedMin: 3.0,
        enemySpeedMax: 4.2,
        enemyGunDamage: 14,
        enemyMeleeDamage: 16,
        enemyAccuracy: 0.92,
        enemyShootIntervalMin: 0.8,
        enemyShootIntervalMax: 1.5,
        initialEnemies: 7,
        maxEnemies: 26,
        knifeEnemyRatio: 0.5,
        carSpawnWave: 1,
        carSpawnInterval: 9,
        carSpeed: 32,
        carDamage: 75,
        medkitDropChance: 0.15
    }
};

let currentDifficulty = DIFFICULTY_LEVELS.MEDIUM;

export function setDifficulty(difficultyKey) {
    if (DIFFICULTY_LEVELS[difficultyKey]) {
        currentDifficulty = DIFFICULTY_LEVELS[difficultyKey];
    }
    return currentDifficulty;
}

export function getDifficulty() {
    return currentDifficulty;
}
