import { describe, it, expect, beforeEach } from 'vitest';
import { goldManager, BASE_OWNED_WEAPONS } from '../Game Code/JavaScript/systems/gold.js';
import { testModeState } from '../Game Code/JavaScript/systems/test-mode.js';
import { WEAPON_CONFIGS } from '../Game Code/JavaScript/systems/ui.js';

describe('Gold Economy & Weapons Shop System', () => {
    let mockStorage = {};

    beforeEach(() => {
        mockStorage = {};
        globalThis.localStorage = {
            getItem: (key) => mockStorage[key] || null,
            setItem: (key, val) => { mockStorage[key] = String(val); },
            removeItem: (key) => { delete mockStorage[key]; },
            clear: () => { mockStorage = {}; }
        };
        if (!globalThis.window) {
            globalThis.window = {};
        }
        globalThis.window.testModeUsed = false;
        globalThis.window.testModeHacksUsed = false;
        globalThis.window.dispatchEvent = () => true;
        testModeState.godMode = false;
        testModeState.infiniteAmmo = false;
        testModeState.isOpen = false;
        testModeState.isUnlocked = false;
        testModeState.hasUsedHacks = false;
        goldManager.resetDevCheatGold();
    });

    describe('Gold Kill Awards & Accrual', () => {
        it('should start with 0 gold', () => {
            expect(goldManager.getGold()).toBe(0);
        });

        it('should award exactly 5 Gold for normal enemies', () => {
            goldManager.addGold(5, 'Enemy Eliminated');
            expect(goldManager.getGold()).toBe(5);
        });

        it('should award exactly 10 Gold for pursuit cars', () => {
            goldManager.addGold(10, 'Pursuit Car Destroyed');
            expect(goldManager.getGold()).toBe(10);
        });

        it('should award exactly 50 Gold for bosses', () => {
            goldManager.addGold(50, 'Boss Defeated');
            expect(goldManager.getGold()).toBe(50);
        });

        it('should award 25 Gold for the Giant Donut Easter Egg', () => {
            goldManager.addGold(25, 'Giant Donut Easter Egg');
            expect(goldManager.getGold()).toBe(25);
        });
    });

    describe('Anti-Cheat Enforcement: Dev Console Cheating Forfeits Credits', () => {
        it('should block all gold awards when window.testModeUsed is true', () => {
            window.testModeUsed = true;
            expect(goldManager.isCheating()).toBe(true);

            const added = goldManager.addGold(50, 'Boss Defeated');
            expect(added).toBe(false);
            expect(goldManager.getGold()).toBe(0);
        });

        it('should block all gold awards when testModeState cheats are active', () => {
            testModeState.godMode = true;
            expect(goldManager.isCheating()).toBe(true);

            const added = goldManager.addGold(10, 'Pursuit Car Destroyed');
            expect(added).toBe(false);
            expect(goldManager.getGold()).toBe(0);
        });

        it('should block all gold awards when testModeState.hasUsedHacks is true', () => {
            testModeState.hasUsedHacks = true;
            expect(goldManager.isCheating()).toBe(true);

            const added = goldManager.addGold(50, 'Boss Defeated');
            expect(added).toBe(false);
            expect(goldManager.getGold()).toBe(0);
        });

        it('should NOT block gold awards when simply unlocking or opening dev console without hacks', () => {
            testModeState.isUnlocked = true;
            testModeState.isOpen = true;
            testModeState.hasUsedHacks = false;
            expect(goldManager.isCheating()).toBe(false);

            const added = goldManager.addGold(5, 'Enemy Eliminated');
            expect(added).toBe(true);
            expect(goldManager.getGold()).toBe(5);
        });

        it('should allow legitimate gold earning when no cheats or dev console was used', () => {
            expect(goldManager.isCheating()).toBe(false);

            goldManager.addGold(5);
            goldManager.addGold(10);
            goldManager.addGold(50);
            expect(goldManager.getGold()).toBe(65);
        });
    });

    describe('Dev Console Gold Cheat (Session Ephemeral)', () => {
        it('should grant temporary cheat gold without saving to localStorage', () => {
            goldManager.addDevCheatGold(500);
            expect(goldManager.getGold()).toBe(500);
            expect(goldManager.getDevCheatGold()).toBe(500);
            // Must NOT write to localStorage!
            expect(mockStorage['urban_breach_gold']).toBeUndefined();
            expect(goldManager.getPersistentGold()).toBe(0);
        });

        it('should discard cheat gold when leaving the tab (resetting session cheat gold)', () => {
            goldManager.addGold(50); // legitimate persistent gold
            expect(mockStorage['urban_breach_gold']).toBe('50');

            goldManager.addDevCheatGold(1000); // dev console cheat
            expect(goldManager.getGold()).toBe(1050);
            expect(mockStorage['urban_breach_gold']).toBe('50');

            // Leaving tab discards session cheat gold
            goldManager.resetDevCheatGold();
            expect(goldManager.getGold()).toBe(50);
            expect(goldManager.getDevCheatGold()).toBe(0);
            expect(mockStorage['urban_breach_gold']).toBe('50');
        });

        it('should spend session cheat gold first before touching persistent gold', () => {
            goldManager.addGold(100); // 100 legitimate
            goldManager.addDevCheatGold(300); // 300 cheat gold -> 400 total
            expect(goldManager.getGold()).toBe(400);

            // Buy S&W Model 29 (200g)
            const spent = goldManager.spendGold(200);
            expect(spent).toBe(true);
            // 200 deducted from cheat gold
            expect(goldManager.getDevCheatGold()).toBe(100);
            // Persistent gold in localStorage untouched
            expect(goldManager.getPersistentGold()).toBe(100);
            expect(mockStorage['urban_breach_gold']).toBe('100');
            expect(goldManager.getGold()).toBe(200);
        });

        it('should deduct remaining amount from persistent gold if cheat gold is partially depleted', () => {
            goldManager.addGold(100); // 100 legitimate
            goldManager.addDevCheatGold(50); // 50 cheat gold -> 150 total
            const spent = goldManager.spendGold(120);
            expect(spent).toBe(true);
            // 50 cheat gold spent
            expect(goldManager.getDevCheatGold()).toBe(0);
            // 70 deducted from persistent gold (100 - 70 = 30)
            expect(goldManager.getPersistentGold()).toBe(30);
            expect(mockStorage['urban_breach_gold']).toBe('30');
            expect(goldManager.getGold()).toBe(30);
        });

        it('should flag cheating and block combat kill gold when dev cheat gold is granted', () => {
            goldManager.addDevCheatGold(500);
            expect(goldManager.isCheating()).toBe(true);

            const added = goldManager.addGold(5, 'Enemy Eliminated');
            expect(added).toBe(false);
            expect(goldManager.getPersistentGold()).toBe(0);
        });
    });

    describe('Weapons Shop Purchases & Price Integrity', () => {
        it('should enforce exact user-specified prices for the 3 pistols', () => {
            expect(WEAPON_CONFIGS.SW_MODEL29.price).toBe(200);
            expect(WEAPON_CONFIGS.M1911.price).toBe(400);
            expect(WEAPON_CONFIGS.LUGER_P08.price).toBe(600);
        });

        it('should verify affordability and prevent purchase when gold is insufficient', () => {
            goldManager.addGold(150);
            expect(goldManager.canAfford(WEAPON_CONFIGS.SW_MODEL29.price)).toBe(false);
            const spent = goldManager.spendGold(WEAPON_CONFIGS.SW_MODEL29.price);
            expect(spent).toBe(false);
            expect(goldManager.getGold()).toBe(150);
        });

        it('should purchase and unlock Smith & Wesson Model 29 for 200 Gold', () => {
            goldManager.addGold(250);
            expect(goldManager.canAfford(200)).toBe(true);

            const spent = goldManager.spendGold(200);
            expect(spent).toBe(true);
            expect(goldManager.getGold()).toBe(50);

            goldManager.unlockWeapon('SW_MODEL29');
            expect(goldManager.isWeaponOwned('SW_MODEL29')).toBe(true);
        });

        it('should purchase and unlock M1911 Pistol for 400 Gold', () => {
            goldManager.addGold(500);
            const spent = goldManager.spendGold(400);
            expect(spent).toBe(true);
            expect(goldManager.getGold()).toBe(100);

            goldManager.unlockWeapon('M1911');
            expect(goldManager.isWeaponOwned('M1911')).toBe(true);
        });

        it('should purchase and unlock Luger P08 for 600 Gold', () => {
            goldManager.addGold(600);
            const spent = goldManager.spendGold(600);
            expect(spent).toBe(true);
            expect(goldManager.getGold()).toBe(0);

            goldManager.unlockWeapon('LUGER_P08');
            expect(goldManager.isWeaponOwned('LUGER_P08')).toBe(true);
        });

        it('should equip and retrieve sidearms cleanly', () => {
            expect(goldManager.getEquippedPistol()).toBe(null);
            goldManager.setEquippedPistol('SW_MODEL29');
            expect(goldManager.getEquippedPistol()).toBe('SW_MODEL29');

            goldManager.setEquippedPistol('M1911');
            expect(goldManager.getEquippedPistol()).toBe('M1911');
        });
    });
});
