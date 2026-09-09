/**
 * Urban Breach — Local High Score & Scoring Engine
 * Computes live combat points and persists records locally via localStorage.
 */

const STORAGE_KEY = 'urban_breach_highscore';

export const DIFFICULTY_MULTIPLIERS = {
    EASY: 0.75,
    NORMAL: 1.0,
    HARD: 1.5,
    NIGHTMARE: 2.0
};

export class HighScoreManager {
    constructor() {
        this.currentBossKills = 0;
    }

    recordBossKill() {
        this.currentBossKills++;
    }

    resetRun() {
        this.currentBossKills = 0;
    }

    /**
     * Calculate score based on hostiles eliminated, waves survived, and boss encounters.
     */
    calculateScore({ kills = 0, wave = 1, bossKills, difficultyKey = 'NORMAL' } = {}) {
        const killPoints = Math.max(0, kills) * 100;
        const wavePoints = Math.max(0, wave - 1) * 500;
        const totalBosses = (bossKills !== undefined && bossKills !== null) ? bossKills : this.currentBossKills;
        const bossPoints = Math.max(0, totalBosses) * 1000;

        const mult = DIFFICULTY_MULTIPLIERS[difficultyKey] !== undefined
            ? DIFFICULTY_MULTIPLIERS[difficultyKey]
            : 1.0;

        const raw = killPoints + wavePoints + bossPoints;
        return Math.round(raw * mult);
    }

    /**
     * Retrieve all-time highest record saved locally.
     */
    getHighScore() {
        if (typeof localStorage === 'undefined') {
            return { score: 0, kills: 0, wave: 1, difficulty: 'NORMAL', date: '' };
        }
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return { score: 0, kills: 0, wave: 1, difficulty: 'NORMAL', date: '' };
            const parsed = JSON.parse(raw);
            return {
                score: typeof parsed.score === 'number' ? parsed.score : 0,
                kills: typeof parsed.kills === 'number' ? parsed.kills : 0,
                wave: typeof parsed.wave === 'number' ? parsed.wave : 1,
                difficulty: parsed.difficulty || 'NORMAL',
                date: parsed.date || ''
            };
        } catch (e) {
            return { score: 0, kills: 0, wave: 1, difficulty: 'NORMAL', date: '' };
        }
    }

    /**
     * Submit game session stats. Updates record if current score exceeds previous best.
     */
    submitScore({ kills = 0, wave = 1, bossKills = 0, difficultyKey = 'NORMAL', isCheat = false } = {}) {
        const finalScore = this.calculateScore({ kills, wave, bossKills, difficultyKey });
        const currentBest = this.getHighScore();

        if (isCheat) {
            return {
                score: finalScore,
                highScore: currentBest.score,
                isNewRecord: false,
                isCheat: true
            };
        }

        if (finalScore > currentBest.score) {
            const newRecord = {
                score: finalScore,
                kills,
                wave,
                difficulty: difficultyKey,
                date: new Date().toLocaleDateString()
            };
            if (typeof localStorage !== 'undefined') {
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(newRecord));
                } catch (e) {}
            }
            return {
                score: finalScore,
                highScore: finalScore,
                isNewRecord: true,
                previousScore: currentBest.score
            };
        }

        return {
            score: finalScore,
            highScore: currentBest.score,
            isNewRecord: false,
            previousScore: currentBest.score
        };
    }

    /**
     * Reset highscore (e.g. from the in-game reset button).
     */
    resetHighScore() {
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch (e) {}
        }
    }

    /**
     * Format number with comma separators (e.g. 12,450).
     */
    formatScore(num) {
        return (num || 0).toLocaleString();
    }
}

export const highScoreManager = new HighScoreManager();
