/**
 * Urban Breach — Achievements System & Victory Engine
 * 
 * Features:
 * - 12 Named Tactical Achievements including surviving 95 waves and wave 100 victory.
 * - 2 Secret Achievements: finding the test console & logging into test mode.
 * - Secret achievements remain masked until unlocked.
 * - Animated sliding HUD notification toasts with audio cues.
 * - Interactive Cyberpunk Achievements Viewer modal.
 * - LocalStorage persistence across sessions.
 */

export const ACHIEVEMENTS_CATALOG = {
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

const STORAGE_KEY = 'urban_breach_achievements_v1';

export class AchievementManager {
    constructor(soundEngine = null) {
        this.soundEngine = soundEngine;
        this.unlocked = {};
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
        } catch (e) {
            this.unlocked = {};
        }
    }

    save() {
        if (typeof localStorage === 'undefined') return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.unlocked));
        } catch (e) {}
    }

    isUnlocked(id) {
        return !!this.unlocked[id];
    }

    unlock(id) {
        const achievement = ACHIEVEMENTS_CATALOG[id];
        if (!achievement) return false;
        if (this.unlocked[id]) return false;

        this.unlocked[id] = {
            unlockedAt: Date.now()
        };
        this.save();

        if (this.soundEngine && typeof this.soundEngine.playLevelUp === 'function') {
            try { this.soundEngine.playLevelUp(); } catch (e) {}
        }

        this.queueToast(achievement);
        this.updateModalIfOpen();
        return true;
    }

    getProgress() {
        const allKeys = Object.keys(ACHIEVEMENTS_CATALOG);
        const unlockedCount = allKeys.filter(k => this.isUnlocked(k)).length;
        const total = allKeys.length;
        const percent = Math.round((unlockedCount / total) * 100);
        return { unlockedCount, total, percent };
    }

    queueToast(achievement) {
        this.toastQueue.push(achievement);
        if (!this.isToastActive) {
            this.processNextToast();
        }
    }

    processNextToast() {
        if (this.toastQueue.length === 0) {
            this.isToastActive = false;
            return;
        }

        this.isToastActive = true;
        const item = this.toastQueue.shift();

        if (typeof document === 'undefined') return;
        let container = document.getElementById('achievement-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'achievement-toast-container';
            document.body.appendChild(container);
        }

        const isSecret = item.isSecret;
        const toast = document.createElement('div');
        toast.className = `achievement-toast ${isSecret ? 'achievement-toast-secret' : ''}`;
        toast.innerHTML = `
            <div class="achievement-toast-icon">${item.icon}</div>
            <div class="achievement-toast-body">
                <div class="achievement-toast-badge">${isSecret ? '🔒 SECRET UNLOCKED' : '🏆 ACHIEVEMENT UNLOCKED'}</div>
                <div class="achievement-toast-title">${item.title}</div>
                <div class="achievement-toast-desc">${item.desc}</div>
            </div>
        `;

        container.appendChild(toast);

        // Animate entrance
        requestAnimationFrame(() => {
            toast.classList.add('achievement-toast-show');
        });

        // Hold and remove
        setTimeout(() => {
            toast.classList.remove('achievement-toast-show');
            toast.classList.add('achievement-toast-hide');
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
                this.processNextToast();
            }, 500);
        }, 4200);
    }

    initDOM() {
        if (typeof document === 'undefined') return;

        // Stylesheet for Achievements Toasts & Viewer Modal
        if (!document.getElementById('achievement-styles')) {
            const style = document.createElement('style');
            style.id = 'achievement-styles';
            style.textContent = `
                #achievement-toast-container {
                    position: fixed;
                    top: 24px;
                    left: 50%;
                    transform: translateX(-50%);
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
                    max-width: 680px;
                    max-height: 85vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 25px 60px rgba(0,0,0,0.85), 0 0 35px rgba(0, 229, 255, 0.2);
                    color: #f1f5f9;
                    font-family: 'Segoe UI', system-ui, sans-serif;
                    overflow: hidden;
                    position: relative;
                }
                .achieve-modal-header {
                    padding: 20px 24px;
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
                    padding: 14px 24px;
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
                .achieve-list {
                    padding: 20px 24px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
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
                    padding: 14px 16px;
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
                    margin-bottom: 3px;
                    color: #94a3b8;
                }
                .achieve-item.unlocked .achieve-item-title {
                    color: #ffffff;
                }
                .achieve-item-desc {
                    font-size: 12px;
                    color: #64748b;
                    line-height: 1.35;
                }
                .achieve-item.unlocked .achieve-item-desc {
                    color: #cbd5e1;
                }
                .achieve-item-badge {
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.5px;
                    flex-shrink: 0;
                }
                .achieve-badge-locked {
                    background: rgba(255, 255, 255, 0.06);
                    color: #64748b;
                }
                .achieve-badge-unlocked {
                    background: rgba(0, 229, 255, 0.2);
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

    openModal() {
        if (typeof document === 'undefined') return;
        this.closeModal();

        const progress = this.getProgress();
        const modal = document.createElement('div');
        modal.id = 'achievements-viewer-modal';
        modal.className = 'achieve-modal-overlay';

        let listHTML = '';
        for (const key of Object.keys(ACHIEVEMENTS_CATALOG)) {
            const ach = ACHIEVEMENTS_CATALOG[key];
            const unlocked = this.isUnlocked(key);

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
                <div class="achieve-item ${unlocked ? 'unlocked' : ''} ${ach.isSecret ? 'secret' : ''}">
                    <div class="achieve-item-icon ${!unlocked ? 'achieve-item-locked-icon' : ''}">${icon}</div>
                    <div class="achieve-item-info">
                        <div class="achieve-item-title">${title}</div>
                        <div class="achieve-item-desc">${desc}</div>
                    </div>
                    <div class="achieve-item-badge ${badgeClass}">${badgeText}</div>
                </div>
            `;
        }

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
                <div class="achieve-list">
                    ${listHTML}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

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

    updateModalIfOpen() {
        if (typeof document === 'undefined') return;
        const modal = document.getElementById('achievements-viewer-modal');
        if (modal) {
            this.openModal();
        }
    }
}

export const achievementManager = new AchievementManager();
if (typeof window !== 'undefined') {
    window.achievementManager = achievementManager;
}
