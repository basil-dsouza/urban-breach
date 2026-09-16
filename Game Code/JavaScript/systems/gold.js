/**
 * Urban Breach — Persistent Gold Economy & Weapon Arsenal Shop System
 * 
 * Earn gold from combat kills:
 * - 5 Gold for Normal Enemies
 * - 10 Gold for Pursuit Cars
 * - 50 Gold for Bosses
 * - 25 Gold for Donut Easter Egg
 * 
 * Strict cheat protection: If developer console or cheats are used,
 * credit/gold awards are permanently disabled for that run.
 */

import { testModeState } from './test-mode.js';

export const BASE_OWNED_WEAPONS = ['AK47', 'SNIPER', 'SHOTGUN', 'MINIGUN'];

class GoldManager {
    constructor() {
        this.storageKey = 'urban_breach_gold';
        this.weaponsKey = 'urban_breach_owned_weapons';
        this.equippedPistolKey = 'urban_breach_equipped_pistol';
    }

    /**
     * Check if dev console or any cheat is or was active in this session/run
     */
    isCheating() {
        if (typeof window !== 'undefined' && window.testModeUsed) {
            return true;
        }
        if (testModeState && (
            testModeState.isUnlocked ||
            testModeState.isOpen ||
            testModeState.godMode ||
            testModeState.infiniteAmmo ||
            testModeState.superSpeed ||
            testModeState.superJump ||
            testModeState.freezeEnemies ||
            testModeState.passiveAI ||
            testModeState.freezeWaveTimer ||
            testModeState.enemyHealthMult !== 1.0 ||
            testModeState.enemySpeedMult !== 1.0 ||
            testModeState.enemyDamageMult !== 1.0
        )) {
            return true;
        }
        return false;
    }

    getGold() {
        if (typeof localStorage === 'undefined') return 0;
        try {
            const val = parseInt(localStorage.getItem(this.storageKey), 10);
            return isNaN(val) ? 0 : Math.max(0, val);
        } catch (e) {
            return 0;
        }
    }

    addGold(amount, reason = '') {
        if (amount <= 0) return false;

        // Anti-cheat verification: Dev console usage forfeits all credits/gold
        if (this.isCheating()) {
            if (typeof window !== 'undefined' && window.uiManager && typeof window.uiManager.showToast === 'function') {
                if (!window._cheatNoticeShown) {
                    window._cheatNoticeShown = true;
                    window.uiManager.showToast('⚠️ DEV CONSOLE DETECTED — CREDITS DISABLED (CHEATING)', 3500);
                }
            }
            return false;
        }

        const current = this.getGold();
        const next = current + Math.round(amount);
        try {
            localStorage.setItem(this.storageKey, String(next));
        } catch (e) {}

        this.notifyUpdate(next);
        return true;
    }

    canAfford(amount) {
        return this.getGold() >= amount;
    }

    spendGold(amount) {
        if (amount <= 0) return false;
        const current = this.getGold();
        if (current < amount) return false;

        const next = current - amount;
        try {
            localStorage.setItem(this.storageKey, String(next));
        } catch (e) {
            return false;
        }

        this.notifyUpdate(next);
        return true;
    }

    getOwnedWeapons() {
        if (typeof localStorage === 'undefined') return [...BASE_OWNED_WEAPONS];
        try {
            const raw = localStorage.getItem(this.weaponsKey);
            if (!raw) return [...BASE_OWNED_WEAPONS];
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return Array.from(new Set([...BASE_OWNED_WEAPONS, ...parsed]));
            }
        } catch (e) {}
        return [...BASE_OWNED_WEAPONS];
    }

    isWeaponOwned(weaponKey) {
        return this.getOwnedWeapons().includes(weaponKey);
    }

    unlockWeapon(weaponKey) {
        const owned = this.getOwnedWeapons();
        if (!owned.includes(weaponKey)) {
            owned.push(weaponKey);
            try {
                localStorage.setItem(this.weaponsKey, JSON.stringify(owned));
            } catch (e) {}
            this.notifyUpdate(this.getGold());
        }
        return true;
    }

    getEquippedPistol() {
        if (typeof localStorage === 'undefined') return null;
        try {
            return localStorage.getItem(this.equippedPistolKey) || null;
        } catch (e) {
            return null;
        }
    }

    setEquippedPistol(weaponKey) {
        try {
            if (weaponKey) {
                localStorage.setItem(this.equippedPistolKey, weaponKey);
            } else {
                localStorage.removeItem(this.equippedPistolKey);
            }
        } catch (e) {}
        this.notifyUpdate(this.getGold());
    }

    notifyUpdate(currentGold) {
        if (typeof window !== 'undefined') {
            if (typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
                window.dispatchEvent(new CustomEvent('urban_breach_gold_updated', {
                    detail: {
                        gold: currentGold,
                        ownedWeapons: this.getOwnedWeapons(),
                        equippedPistol: this.getEquippedPistol()
                    }
                }));
            }
            if (window.uiManager && typeof window.uiManager.updateGoldDisplay === 'function') {
                window.uiManager.updateGoldDisplay(currentGold);
            }
        }
    }
}

export const goldManager = new GoldManager();
