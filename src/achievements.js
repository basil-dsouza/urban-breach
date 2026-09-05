/**
 * Urban Breach — Achievements System & Victory Engine
 * 
 * Features:
 * - Comprehensive Military Achievements:
 *   - Enemy Kills: Every 5 kills from 5 all the way to 200 (40 tiers).
 *   - Wave Survival: Every 5 waves up to Wave 50 (10 tiers).
 *   - Casualties & Deaths: Milestones in multiples of 5 up to 50, including "Oh, So That's What It Does".
 *   - Environmental & Hazard Deaths: "Watery Grave" (water/drowning) and "Broken Bones" (fall impact).
 *   - 2 Secret Achievements: finding the test console & logging into test mode (masked until unlocked).
 * - Animated sliding HUD notification toasts with audio cues.
 * - Interactive Cyberpunk Achievements Viewer modal with category filter tabs.
 * - LocalStorage persistence across sessions.
 */

// 1. Core Tactical & Special Ops Achievements
const BASE_CATALOG = {
    FIRST_BLOOD: {
        id: 'FIRST_BLOOD',
        title: 'First Blood',
        desc: 'Eliminate your first hostile operative in combat.',
        icon: '🎯',
        category: 'combat',
        isSecret: false
    },
    ROOKIE_SURVIVOR: {
        id: 'ROOKIE_SURVIVOR',
        title: 'Rookie Survivor',
        desc: 'Survive 5 waves of hostile urban breach incursions.',
        icon: '🛡️',
        category: 'survival',
        isSecret: false
    },
    VETERAN_SURVIVOR: {
        id: 'VETERAN_SURVIVOR',
        title: 'Combat Veteran',
        desc: 'Endure and survive 25 waves of relentless assaults.',
        icon: '⚔️',
        category: 'survival',
        isSecret: false
    },
    ELITE_DEFENDER: {
        id: 'ELITE_DEFENDER',
        title: 'Apex Defender',
        desc: 'Survive 50 waves against elite armored forces.',
        icon: '🏅',
        category: 'survival',
        isSecret: false
    },
    PENULTIMATE_STAND: {
        id: 'PENULTIMATE_STAND',
        title: 'The 95th Frontier',
        desc: 'Survive 95 brutal waves of hostile aggression.',
        icon: '🔥',
        category: 'survival',
        isSecret: false
    },
    CENTURY_VICTORY: {
        id: 'CENTURY_VICTORY',
        title: 'Century Conqueror',
        desc: 'Survive all 100 waves and achieve total victory in Urban Breach!',
        icon: '👑',
        category: 'victory',
        isSecret: false
    },
    ROOFTOP_RECON: {
        id: 'ROOFTOP_RECON',
        title: 'High-Rise Overwatch',
        desc: 'Climb a tactical rooftop ladder and secure high ground.',
        icon: '🪜',
        category: 'tactics',
        isSecret: false
    },
    BUSH_GHOST: {
        id: 'BUSH_GHOST',
        title: 'Guerilla Ghost',
        desc: 'Evade hostile detection using stealth vegetation camouflage.',
        icon: '🌿',
        category: 'tactics',
        isSecret: false
    },
    COMBAT_MEDIC: {
        id: 'COMBAT_MEDIC',
        title: 'Combat Medic',
        desc: 'Treat bone fractures and stop bullet bleeding using a field medkit.',
        icon: '💉',
        category: 'survival',
        isSecret: false
    },
    VEHICLE_BUSTER: {
        id: 'VEHICLE_BUSTER',
        title: 'Road Demolisher',
        desc: 'Neutralize and destroy an enemy combat pursuit vehicle.',
        icon: '💥',
        category: 'combat',
        isSecret: false
    },
    SECRET_FOUND: {
        id: 'SECRET_FOUND',
        title: 'Classified Anomaly',
        desc: 'Discover the hidden developer test mode terminal hotspot.',
        icon: '🕵️',
        category: 'secret',
        isSecret: true,
        maskedTitle: 'Classified Anomaly',
        maskedDesc: 'Secret Objective: Discover the hidden terminal anomaly.'
    },
    SECRET_AUTH: {
        id: 'SECRET_AUTH',
        title: 'Developer Cleared',
        desc: 'Successfully authenticate into the classified test console with developer credentials.',
        icon: '🔓',
        category: 'secret',
        isSecret: true,
        maskedTitle: 'Developer Clearance',
        maskedDesc: 'Secret Objective: Log in to the classified test mode console.'
    }
};

// 2. Wave Survival Achievements in multiples of 5 up to 50
const WAVE_TITLES = {
    5: 'Frontline Initiate',
    10: 'Decade Defender',
    15: 'Fortified Vanguard',
    20: 'Iron Bulwark',
    25: 'Quarter Century Vanguard',
    30: 'Relentless Bastion',
    35: 'Storm Breaker',
    40: 'Fortress Supreme',
    45: 'The Threshold',
    50: 'Half Century Victor'
};

const WAVE_CATALOG = {};
for (let w = 5; w <= 50; w += 5) {
    WAVE_CATALOG['SURVIVE_WAVE_' + w] = {
        id: 'SURVIVE_WAVE_' + w,
        title: WAVE_TITLES[w] || ('Wave ' + w + ' Veteran'),
        desc: w === 50 ? 'Survive all 50 waves, conquer the urban breach, and unlock the M134 Minigun!' : ('Endure and survive ' + w + ' consecutive waves of hostile incursions.'),
        icon: w === 50 ? '👑' : (w >= 30 ? '🎖️' : '🛡️'),
        category: 'survival',
        isSecret: false
    };
}

// 3. Enemy Kill Achievements: Multiples of 5 from 5 up to 200 (40 distinct milestones)
const KILL_CATALOG = {};
for (let k = 5; k <= 200; k += 5) {
    let icon = '🎯';
    if (k >= 150) icon = '☠️';
    else if (k >= 100) icon = '💀';
    else if (k >= 50) icon = '💥';
    else if (k >= 25) icon = '⚔️';

    KILL_CATALOG['KILL_' + k] = {
        id: 'KILL_' + k,
        title: 'Hostiles Down: ' + k,
        desc: 'Eliminate ' + k + ' enemy combatants in tactical combat.',
        icon,
        category: 'kills',
        isSecret: false
    };
}

// 4. Death & Casualty Achievements: Up to 50, plus special deaths (water, broken bones)
const DEATH_CATALOG = {
    DEATH_FIRST: {
        id: 'DEATH_FIRST',
        title: "Oh, So That's What It Does",
        desc: "Suffer your first combat casualty or discover lethal hazards the hard way.",
        icon: '💀',
        category: 'deaths',
        isSecret: false
    },
    DEATH_WATER: {
        id: 'DEATH_WATER',
        title: 'Watery Grave',
        desc: 'Perish from drowning or succumb to wounds while submerged in deep water.',
        icon: '🌊',
        category: 'deaths',
        isSecret: false
    },
    DEATH_FALL: {
        id: 'DEATH_FALL',
        title: 'Broken Bones',
        desc: 'Succumb to fatal fall impact damage with multiple compound bone fractures.',
        icon: '🦴',
        category: 'deaths',
        isSecret: false
    }
};

for (let d = 5; d <= 50; d += 5) {
    DEATH_CATALOG['DEATH_' + d] = {
        id: 'DEATH_' + d,
        title: 'Casualty Report: ' + d + ' Deaths',
        desc: d === 50 ? 'Suffer 50 combat casualties. Immortal endurance achieved!' : ('Endure ' + d + ' cumulative casualties in the line of duty.'),
        icon: d === 50 ? '⚰️' : '🪦',
        category: 'deaths',
        isSecret: false
    };
}

export const ACHIEVEMENTS_CATALOG = {
    ...BASE_CATALOG,
    ...WAVE_CATALOG,
    ...KILL_CATALOG,
    ...DEATH_CATALOG
};

const STORAGE_KEY = 'urban_breach_achievements_v1';
const STORAGE_DEATHS_KEY = 'urban_breach_total_deaths';

export class AchievementManager {
    constructor(soundEngine = null) {
        this.soundEngine = soundEngine;
        this.unlocked = {};
        this.totalDeaths = 0;
        this.toastQueue = [];
        this.isToastActive = false;
        
        this.load();
        this.initDOM();
    }

    setSoundEngine(soundEngine) {
        this.soundEngine = soundEngine;
    }

    load() {
        if (typeof localStorage === 'undefined') return;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                this.unlocked = JSON.parse(raw);
            }
            const deathsRaw = localStorage.getItem(STORAGE_DEATHS_KEY);
            if (deathsRaw) {
                this.totalDeaths = parseInt(deathsRaw, 10) || 0;
            }
        } catch (e) {
            this.unlocked = {};
            this.totalDeaths = 0;
        }
    }

    save() {
        if (typeof localStorage === 'undefined') return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.unlocked));
            localStorage.setItem(STORAGE_DEATHS_KEY, this.totalDeaths.toString());
        } catch (e) {}
    }

    isUnlocked(id) {
        return !!this.unlocked[id];
    }

    getTotalDeaths() {
        return this.totalDeaths;
    }

    unlock(id) {
        const achievement = ACHIEVEMENTS_CATALOG[id];
        if (!achievement) {
            console.warn('[ACHIEVEMENTS] Unknown achievement ID: ' + id);
            return false;
        }

        if (this.unlocked[id]) {
            return false; // Already unlocked
        }

        this.unlocked[id] = {
            unlockedAt: Date.now()
        };
        this.save();

        console.log('[ACHIEVEMENTS] UNLOCKED: ' + achievement.title + ' (' + id + ')');
        this.enqueueToast(achievement);

        if (this.soundEngine && typeof this.soundEngine.playLevelUp === 'function') {
            try {
                this.soundEngine.playLevelUp();
            } catch (e) {}
        }

        return true;
    }

    /**
     * Check and award enemy kill milestone achievements (5 to 200 in multiples of 5)
     */
    recordKill(totalKills) {
        if (totalKills >= 1) {
            this.unlock('FIRST_BLOOD');
        }
        for (let k = 5; k <= 200; k += 5) {
            if (totalKills >= k) {
                this.unlock('KILL_' + k);
            }
        }
    }

    /**
     * Check and award wave survival milestone achievements (5 to 50 in multiples of 5)
     */
    recordWave(waveNumber) {
        if (waveNumber >= 5) this.unlock('ROOKIE_SURVIVOR');
        if (waveNumber >= 25) this.unlock('VETERAN_SURVIVOR');
        if (waveNumber >= 50) this.unlock('ELITE_DEFENDER');
        if (waveNumber >= 95) this.unlock('PENULTIMATE_STAND');
        if (waveNumber >= 100) this.unlock('CENTURY_VICTORY');

        for (let w = 5; w <= 50; w += 5) {
            if (waveNumber >= w) {
                this.unlock('SURVIVE_WAVE_' + w);
            }
        }
    }

    /**
     * Record a player death and check death milestones (multiples of 5 up to 50, water, fall)
     */
    recordDeath(cause = 'generic') {
        this.totalDeaths++;
        this.save();

        // 1. "Oh, So That's What It Does" - awarded on first death
        this.unlock('DEATH_FIRST');

        // 2. Cumulative death count milestones (5, 10, 15, ..., 50)
        for (let d = 5; d <= 50; d += 5) {
            if (this.totalDeaths >= d) {
                this.unlock('DEATH_' + d);
            }
        }

        // 3. Environmental & trauma death causes
        if (cause === 'water' || cause === 'drowning') {
            this.unlock('DEATH_WATER');
        } else if (cause === 'fall' || cause === 'broken_bones') {
            this.unlock('DEATH_FALL');
        }

        return this.totalDeaths;
    }

    getProgress() {
        const total = Object.keys(ACHIEVEMENTS_CATALOG).length;
        const unlockedCount = Object.keys(this.unlocked).length;
        const percent = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;
        return { total, unlockedCount, percent };
    }

    enqueueToast(achievement) {
        this.toastQueue.push(achievement);
        if (!this.isToastActive) {
            this.processToastQueue();
        }
    }

    processToastQueue() {
        if (this.toastQueue.length === 0) {
            this.isToastActive = false;
            return;
        }

        this.isToastActive = true;
        const ach = this.toastQueue.shift();
        this.renderToast(ach, () => {
            setTimeout(() => {
                this.processToastQueue();
            }, 300);
        });
    }

    initDOM() {
        if (typeof document === 'undefined') return;

        if (!document.getElementById('achievement-toast-container')) {
            const container = document.createElement('div');
            container.id = 'achievement-toast-container';
            container.className = 'achievement-toast-container';
            document.body.appendChild(container);
        }

        if (!document.getElementById('achievements-injected-styles')) {
            const style = document.createElement('style');
            style.id = 'achievements-injected-styles';
            style.textContent = `
                .achievement-toast-container {
                    position: fixed;
                    top: 24px;
                    right: 24px;
                    z-index: 9999999;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    pointer-events: none;
                    width: 90%;
                    max-width: 440px;
                }
                .achievement-toast {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    background: linear-gradient(135deg, rgba(8, 14, 24, 0.95), rgba(16, 26, 42, 0.95));
                    border: 1.5px solid rgba(0, 229, 255, 0.6);
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(0, 229, 255, 0.3);
                    border-radius: 12px;
                    padding: 14px 18px;
                    color: #fff;
                    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                    opacity: 0;
                    transform: translateY(-30px) scale(0.95);
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    backdrop-filter: blur(8px);
                }
                .achievement-toast.achievement-toast-secret {
                    border-color: rgba(243, 156, 18, 0.85);
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7), 0 0 25px rgba(243, 156, 18, 0.4);
                }
                .achievement-toast-show {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
                .achievement-toast-hide {
                    opacity: 0;
                    transform: translateY(-20px) scale(0.95);
                }
                .achievement-toast-icon {
                    font-size: 32px;
                    line-height: 1;
                    flex-shrink: 0;
                    filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.6));
                }
                .achievement-toast-body {
                    flex-grow: 1;
                }
                .achievement-toast-badge {
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 1.5px;
                    color: #00e5ff;
                    margin-bottom: 2px;
                }
                .achievement-toast-secret .achievement-toast-badge {
                    color: #f39c12;
                }
                .achievement-toast-title {
                    font-size: 15px;
                    font-weight: 700;
                    color: #ffffff;
                    margin-bottom: 2px;
                }
                .achievement-toast-desc {
                    font-size: 12px;
                    color: #94a3b8;
                    line-height: 1.3;
                }

                /* Modal Viewer */
                .achieve-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(5, 8, 14, 0.88);
                    backdrop-filter: blur(12px);
                    z-index: 9999998;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    box-sizing: border-box;
                    animation: achieveFadeIn 0.25s ease-out;
                }
                @keyframes achieveFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .achieve-modal-card {
                    background: linear-gradient(160deg, #0b111e 0%, #0d1728 100%);
                    border: 1.5px solid rgba(0, 229, 255, 0.4);
                    border-radius: 16px;
                    width: 100%;
                    max-width: 760px;
                    max-height: 88vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 25px 60px rgba(0,0,0,0.85), 0 0 35px rgba(0, 229, 255, 0.2);
                    color: #f1f5f9;
                    font-family: 'Segoe UI', system-ui, sans-serif;
                    overflow: hidden;
                    position: relative;
                }
                .achieve-modal-header {
                    padding: 18px 24px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(0, 0, 0, 0.25);
                }
                .achieve-modal-title-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .achieve-modal-title {
                    font-size: 20px;
                    font-weight: 800;
                    letter-spacing: 1px;
                    color: #fff;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .achieve-modal-close {
                    background: none;
                    border: none;
                    color: #94a3b8;
                    font-size: 22px;
                    cursor: pointer;
                    padding: 4px 8px;
                    border-radius: 6px;
                    transition: all 0.2s;
                }
                .achieve-modal-close:hover {
                    color: #fff;
                    background: rgba(255, 255, 255, 0.1);
                }
                .achieve-progress-banner {
                    padding: 12px 24px;
                    background: rgba(0, 229, 255, 0.06);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .achieve-progress-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 13px;
                    font-weight: 600;
                }
                .achieve-progress-bar-bg {
                    width: 100%;
                    height: 8px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                    overflow: hidden;
                }
                .achieve-progress-bar-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #00e5ff, #00ff88);
                    border-radius: 4px;
                    transition: width 0.4s ease;
                }

                /* Category Filter Tabs */
                .achieve-tabs-bar {
                    display: flex;
                    gap: 8px;
                    padding: 10px 24px;
                    background: rgba(0, 0, 0, 0.35);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                    overflow-x: auto;
                    scrollbar-width: none;
                }
                .achieve-tabs-bar::-webkit-scrollbar {
                    display: none;
                }
                .achieve-tab-btn {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 20px;
                    color: #94a3b8;
                    padding: 6px 14px;
                    font-size: 12px;
                    font-weight: 700;
                    letter-spacing: 0.5px;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: all 0.2s;
                }
                .achieve-tab-btn:hover {
                    color: #fff;
                    border-color: rgba(0, 229, 255, 0.4);
                    background: rgba(0, 229, 255, 0.1);
                }
                .achieve-tab-btn.active {
                    color: #000;
                    background: #00e5ff;
                    border-color: #00e5ff;
                    box-shadow: 0 0 10px rgba(0, 229, 255, 0.4);
                }

                .achieve-list {
                    padding: 16px 24px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    scrollbar-width: thin;
                    scrollbar-color: rgba(0, 229, 255, 0.3) transparent;
                }
                .achieve-item {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    background: rgba(18, 27, 43, 0.7);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    border-radius: 12px;
                    padding: 12px 16px;
                    transition: all 0.2s;
                }
                .achieve-item.unlocked {
                    border-color: rgba(0, 229, 255, 0.4);
                    background: rgba(10, 28, 48, 0.85);
                }
                .achieve-item.unlocked.secret {
                    border-color: rgba(243, 156, 18, 0.5);
                    background: rgba(38, 25, 10, 0.85);
                }
                .achieve-item-icon {
                    font-size: 28px;
                    width: 44px;
                    height: 44px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                    flex-shrink: 0;
                }
                .achieve-item.unlocked .achieve-item-icon {
                    background: rgba(0, 229, 255, 0.15);
                }
                .achieve-item.unlocked.secret .achieve-item-icon {
                    background: rgba(243, 156, 18, 0.2);
                }
                .achieve-item-locked-icon {
                    filter: grayscale(1) opacity(0.4);
                }
                .achieve-item-info {
                    flex-grow: 1;
                }
                .achieve-item-title {
                    font-size: 15px;
                    font-weight: 700;
                    color: #fff;
                    margin-bottom: 3px;
                }
                .achieve-item-desc {
                    font-size: 12px;
                    color: #94a3b8;
                    line-height: 1.35;
                }
                .achieve-item-badge {
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 1px;
                    padding: 6px 12px;
                    border-radius: 6px;
                    white-space: nowrap;
                }
                .achieve-badge-locked {
                    background: rgba(255, 255, 255, 0.06);
                    color: #64748b;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                .achieve-badge-unlocked {
                    background: rgba(0, 229, 255, 0.15);
                    color: #00e5ff;
                    border: 1px solid rgba(0, 229, 255, 0.4);
                }
                .achieve-badge-secret {
                    background: rgba(243, 156, 18, 0.2);
                    color: #f39c12;
                    border: 1px solid rgba(243, 156, 18, 0.4);
                }
            `;
            document.head.appendChild(style);
        }
    }

    renderToast(achievement, onComplete) {
        if (typeof document === 'undefined') {
            if (onComplete) onComplete();
            return;
        }

        const container = document.getElementById('achievement-toast-container');
        if (!container) {
            if (onComplete) onComplete();
            return;
        }

        const toast = document.createElement('div');
        toast.className = 'achievement-toast ' + (achievement.isSecret ? 'achievement-toast-secret' : '');
        
        toast.innerHTML = `
            <div class="achievement-toast-icon">${achievement.icon}</div>
            <div class="achievement-toast-body">
                <div class="achievement-toast-badge">${achievement.isSecret ? '✦ SECRET ACHIEVEMENT UNLOCKED' : '🏆 ACHIEVEMENT UNLOCKED'}</div>
                <div class="achievement-toast-title">${achievement.title}</div>
                <div class="achievement-toast-desc">${achievement.desc}</div>
            </div>
        `;

        container.appendChild(toast);

        // Force reflow then animate in
        void toast.offsetWidth;
        toast.classList.add('achievement-toast-show');

        setTimeout(() => {
            toast.classList.remove('achievement-toast-show');
            toast.classList.add('achievement-toast-hide');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
                if (onComplete) onComplete();
            }, 450);
        }, 3600);
    }

    openModal() {
        if (typeof document === 'undefined') return;
        this.closeModal();

        const progress = this.getProgress();
        const modal = document.createElement('div');
        modal.id = 'achievements-viewer-modal';
        modal.className = 'achieve-modal-overlay';

        modal.innerHTML = `
            <div class="achieve-modal-card">
                <div class="achieve-modal-header">
                    <div class="achieve-modal-title-row">
                        <span style="font-size: 24px;">🏆</span>
                        <div class="achieve-modal-title">MISSION ACHIEVEMENTS</div>
                    </div>
                    <button class="achieve-modal-close" id="btn-close-achievements">✕</button>
                </div>
                <div class="achieve-progress-banner">
                    <div class="achieve-progress-row">
                        <span>OVERALL CLEARANCE</span>
                        <span style="color: #00e5ff;">${progress.unlockedCount} / ${progress.total} (${progress.percent}%)</span>
                    </div>
                    <div class="achieve-progress-bar-bg">
                        <div class="achieve-progress-bar-fill" style="width: ${progress.percent}%;"></div>
                    </div>
                </div>
                <div class="achieve-tabs-bar">
                    <button class="achieve-tab-btn active" data-cat="all">ALL (${progress.total})</button>
                    <button class="achieve-tab-btn" data-cat="kills">KILLS (40)</button>
                    <button class="achieve-tab-btn" data-cat="survival">SURVIVAL (10)</button>
                    <button class="achieve-tab-btn" data-cat="deaths">DEATHS & HAZARDS (13)</button>
                    <button class="achieve-tab-btn" data-cat="special">TACTICS & SECRETS</button>
                </div>
                <div class="achieve-list" id="achieve-modal-list"></div>
            </div>
        `;

        document.body.appendChild(modal);

        const listEl = modal.querySelector('#achieve-modal-list');
        const tabBtns = modal.querySelectorAll('.achieve-tab-btn');

        const renderItems = (category = 'all') => {
            let listHTML = '';
            for (const key of Object.keys(ACHIEVEMENTS_CATALOG)) {
                const ach = ACHIEVEMENTS_CATALOG[key];
                const unlocked = this.isUnlocked(key);

                // Category filter check
                if (category === 'kills' && ach.category !== 'kills') continue;
                if (category === 'survival' && ach.category !== 'survival' && ach.category !== 'victory') continue;
                if (category === 'deaths' && ach.category !== 'deaths') continue;
                if (category === 'special' && ach.category !== 'tactics' && ach.category !== 'secret' && ach.category !== 'combat') continue;

                let icon = ach.icon;
                let title = ach.title;
                let desc = ach.desc;
                let badgeClass = 'achieve-badge-locked';
                let badgeText = 'LOCKED';

                if (unlocked) {
                    if (ach.isSecret) {
                        badgeClass = 'achieve-badge-secret';
                        badgeText = 'SECRET CLEARED';
                    } else {
                        badgeClass = 'achieve-badge-unlocked';
                        badgeText = 'UNLOCKED';
                    }
                } else {
                    if (ach.isSecret) {
                        icon = '❓';
                        title = 'Classified Secret';
                        desc = 'Classified intelligence. Discover and unlock in-game to reveal.';
                        badgeText = 'CLASSIFIED';
                    }
                }

                listHTML += `
                    <div class="achieve-item ${unlocked ? 'unlocked' : ''} ${ach.isSecret ? 'secret' : ''}" data-cat="${ach.category}">
                        <div class="achieve-item-icon ${!unlocked ? 'achieve-item-locked-icon' : ''}">${icon}</div>
                        <div class="achieve-item-info">
                            <div class="achieve-item-title">${title}</div>
                            <div class="achieve-item-desc">${desc}</div>
                        </div>
                        <div class="achieve-item-badge ${badgeClass}">${badgeText}</div>
                    </div>
                `;
            }
            listEl.innerHTML = listHTML;
        };

        renderItems('all');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderItems(btn.getAttribute('data-cat'));
            });
        });

        modal.querySelector('#btn-close-achievements').addEventListener('click', () => {
            this.closeModal();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }

    closeModal() {
        if (typeof document === 'undefined') return;
        const modal = document.getElementById('achievements-viewer-modal');
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }
}

export const achievementManager = new AchievementManager();
