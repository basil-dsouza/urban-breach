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
        // Ephemeral in-memory dev cheat gold: Never saved to localStorage!
        this.sessionCheatGold = 0;
    }

    /**
     * Check if hacks or cheats are active or have been used in this session.
     * Opening or unlocking the dev console alone is NOT cheating — only using hacks/cheats is.
     */
    isCheating() {
        if (typeof window !== 'undefined' && (window.testModeHacksUsed || window.testModeUsed)) {
            return true;
        }
        if (this.sessionCheatGold > 0) {
            return true;
        }
        if (testModeState && (
            testModeState.hasUsedHacks ||
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

    /**
     * Legitimate persistent gold stored in localStorage
     */
    getPersistentGold() {
        if (typeof localStorage === 'undefined') return 0;
        try {
            const val = parseInt(localStorage.getItem(this.storageKey), 10);
            return isNaN(val) ? 0 : Math.max(0, val);
        } catch (e) {
            return 0;
        }
    }

    /**
     * Temporary dev cheat gold (ephemeral to current session/tab)
     */
    getDevCheatGold() {
        return this.sessionCheatGold;
    }

    /**
     * Total available gold (persistent + session cheat gold)
     */
    getGold() {
        return this.getPersistentGold() + this.sessionCheatGold;
    }

    /**
     * Legitimate combat gold reward (saved to localStorage).
     * Forfeited if developer console hacks/cheats have been used.
     */
    addGold(amount, reason = '') {
        if (amount <= 0) return false;

        // Anti-cheat verification: Using hacks or cheat gold forfeits legitimate combat gold
        if (this.isCheating()) {
            if (typeof window !== 'undefined' && window.uiManager && typeof window.uiManager.showToast === 'function') {
                if (!window._cheatNoticeShown) {
                    window._cheatNoticeShown = true;
                    window.uiManager.showToast('⚠️ DEV HACKS DETECTED — CREDITS DISABLED (CHEATING)', 3500);
                }
            }
            return false;
        }

        const persistent = this.getPersistentGold();
        const next = persistent + Math.round(amount);
        try {
            localStorage.setItem(this.storageKey, String(next));
        } catch (e) {}

        this.notifyUpdate(this.getGold());
        return true;
    }

    /**
     * Grant temporary cheat gold via developer console.
     * CRITICAL: This is strictly session-only and NEVER saved to localStorage.
     */
    addDevCheatGold(amount) {
        if (amount <= 0) return false;
        this.sessionCheatGold += Math.round(amount);

        // Mark hacks used
        if (typeof window !== 'undefined') {
            window.testModeHacksUsed = true;
        }
        if (testModeState) {
            testModeState.hasUsedHacks = true;
        }

        this.notifyUpdate(this.getGold());
        if (typeof window !== 'undefined' && window.uiManager && typeof window.uiManager.showToast === 'function') {
            window.uiManager.showToast(`🪙 +${amount} DEV CHEAT GOLD (SESSION ONLY)`, 2500);
        }
        return true;
    }

    /**
     * Reset ephemeral session cheat gold back to 0
     */
    resetDevCheatGold() {
        this.sessionCheatGold = 0;
        this.notifyUpdate(this.getGold());
    }

    canAfford(amount) {
        return this.getGold() >= amount;
    }

    spendGold(amount) {
        if (amount <= 0) return false;
        const total = this.getGold();
        if (total < amount) return false;

        let remainingToDeduct = amount;

        // Spend session cheat gold first so persistent gold remains untouched where possible
        if (this.sessionCheatGold > 0) {
            const deductCheat = Math.min(this.sessionCheatGold, remainingToDeduct);
            this.sessionCheatGold -= deductCheat;
            remainingToDeduct -= deductCheat;
        }

        // Deduct any remaining amount from persistent storage
        if (remainingToDeduct > 0) {
            const persistent = this.getPersistentGold();
            const next = Math.max(0, persistent - remainingToDeduct);
            try {
                localStorage.setItem(this.storageKey, String(next));
            } catch (e) {
                return false;
            }
        }

        this.notifyUpdate(this.getGold());
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

if (typeof window !== 'undefined') {
    window.goldManager = goldManager;
}
