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
        medkitDropChance: 0.65,
        scalingBase: 1.30,
        tierMultiplier: 0.80
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
        medkitDropChance: 0.45,
        scalingBase: 1.50, // 1.5x scale every 7 rounds for Survivor baseline
        tierMultiplier: 1.00
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
        medkitDropChance: 0.28,
        scalingBase: 1.68,
        tierMultiplier: 1.30
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
        medkitDropChance: 0.15,
        scalingBase: 1.88,
        tierMultiplier: 1.65
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

/**
 * Calculates progressive wave scaling for enemy counts and attributes.
 * Baseline: 1.5x scale every 7 rounds for SURVIVOR (Medium).
 * Difficulty multipliers dynamically tune growth rate and base numbers.
 *
 * @param {number} wave Current wave number (1-based)
 * @param {object} difficulty Difficulty configuration object
 * @returns {object} Scaled attributes for normal enemies and boss encounters
 */
export function getWaveEnemyScaling(wave = 1, difficulty = currentDifficulty) {
    const diff = difficulty || currentDifficulty;
    const baseRate = diff.scalingBase || 1.50;
    const tierMult = diff.tierMultiplier || 1.00;

    // Continuous 7-round exponential growth factor: (baseRate)^((w - 1) / 7)
    const roundStep = Math.max(0, (wave - 1) / 7.0);
    const waveMultiplier = Math.pow(baseRate, roundStep);

    // Enemy Count Scaling: starts at initialEnemies, compounds per roundStep
    const countMultiplier = Math.pow(baseRate * 0.92, roundStep);
    const enemyCount = Math.min(
        Math.round((diff.initialEnemies * countMultiplier) + (wave - 1) * 0.8),
        Math.round(diff.maxEnemies * Math.min(waveMultiplier, 3.2))
    );

    // Enemy Health Scaling
    const enemyHealth = Math.max(1, Math.round(diff.enemyHealth * waveMultiplier));

    // Enemy Movement Speed Scaling (gradual and capped for playability)
    const speedMultiplier = Math.min(1.0 + (waveMultiplier - 1.0) * 0.20, 1.65);
    const enemySpeedMin = diff.enemySpeedMin * speedMultiplier;
    const enemySpeedMax = diff.enemySpeedMax * speedMultiplier;

    // Enemy Damage Scaling
    const damageMultiplier = Math.min(1.0 + (waveMultiplier - 1.0) * 0.38, 2.6);
    const enemyGunDamage = Math.max(1, Math.round(diff.enemyGunDamage * damageMultiplier));
    const enemyMeleeDamage = Math.max(2, Math.round(diff.enemyMeleeDamage * damageMultiplier));

    // Enemy Shoot Interval Scaling (higher waves fire more aggressively)
    const intervalDivisor = Math.min(1.0 + (waveMultiplier - 1.0) * 0.22, 2.0);
    const enemyShootIntervalMin = Math.max(0.45, diff.enemyShootIntervalMin / intervalDivisor);
    const enemyShootIntervalMax = Math.max(0.90, diff.enemyShootIntervalMax / intervalDivisor);

    // Boss Attributes for Wave 5, 10, 15, 20...
    const isBossWave = (wave % 5 === 0);
    const bossLevel = Math.max(1, Math.floor(wave / 5));
    // Boss scales progressively 1.5x on subsequent boss encounters (Wave 5 = 1x, Wave 10 = 1.5x, Wave 15 = 2.25x)
    const bossMultiplier = Math.pow(1.5, bossLevel - 1) * tierMult;
    const bossHealth = Math.round(350 * bossMultiplier);
    const bossDamage = Math.round((diff.enemyGunDamage * 1.5 + 4) * Math.min(1.0 + (bossLevel - 1) * 0.25, 2.5));
    const bossSpeed = (diff.enemySpeedMin * 1.1) * Math.min(1.0 + (bossLevel - 1) * 0.08, 1.35);

    return {
        wave,
        waveMultiplier,
        tierMult,
        enemyCount,
        enemyHealth,
        enemySpeedMin,
        enemySpeedMax,
        enemyGunDamage,
        enemyMeleeDamage,
        enemyShootIntervalMin,
        enemyShootIntervalMax,
        isBossWave,
        bossLevel,
        bossHealth,
        bossDamage,
        bossSpeed
    };
}
