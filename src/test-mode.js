/**
 * Urban Breach — Secret Test Mode & Wave Customization Console
 * 
 * Password protected: 'rapha_tester123'
 * Triggered via invisible bottom-right corner hotspot or F2 shortcut.
 */

import { achievementManager } from './achievements.js';

export const TEST_MODE_PASSWORD = 'rapha_tester123';

export const testModeState = {
    isUnlocked: false,
    isOpen: false,
    // Cheats
    godMode: false,
    infiniteAmmo: false,
    laserSpread: false,
    superSpeed: false,
    superJump: false,
    // Modifiers
    freezeEnemies: false,
    passiveAI: false,
    freezeWaveTimer: false,
    enemyHealthMult: 1.0,
    enemySpeedMult: 1.0,
    enemyDamageMult: 1.0,
    // Spawner Settings
    spawnCount: 1,
    spawnLocation: 'front', // 'front', 'around', 'random'
    bossLevel: 1
};

// Check if previously unlocked in this browser session
if (typeof sessionStorage !== 'undefined') {
    try {
        if (sessionStorage.getItem('ub_test_mode_unlocked') === '1') {
            testModeState.isUnlocked = true;
        }
    } catch (e) {}
}

export function verifyTestModePassword(input) {
    if (typeof input !== 'string') return false;
    return input.trim() === TEST_MODE_PASSWORD;
}

export class TestModeManager {
    constructor(api = {}) {
        this.api = api;
        this.activeTab = 'waves';
        this.telemetryInterval = null;
        this.initDOM();
        this.setupKeyboard();
        
        // Expose globally for runtime inspection & game loop checks
        if (typeof window !== 'undefined') {
            window.testModeState = testModeState;
            window.testModeManager = this;
        }
    }

    setAPI(api) {
        this.api = { ...this.api, ...api };
    }

    initDOM() {
        if (typeof document === 'undefined') return;

        // 1. Invisible Bottom-Right Trigger Hotspot
        let secretBtn = document.getElementById('btn-secret-test-mode');
        if (!secretBtn) {
            secretBtn = document.createElement('button');
            secretBtn.id = 'btn-secret-test-mode';
            secretBtn.setAttribute('aria-label', 'Secret Test Hotspot');
            secretBtn.tabIndex = -1;
            document.body.appendChild(secretBtn);
        }
        secretBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggle();
        });

        // 2. Authentication Modal
        let authModal = document.getElementById('test-mode-auth-modal');
        if (!authModal) {
            authModal = document.createElement('div');
            authModal.id = 'test-mode-auth-modal';
            authModal.className = 'test-modal-overlay';
            authModal.style.display = 'none';
            authModal.innerHTML = `
                <div class="test-modal-card">
                    <button class="test-modal-close" id="btn-close-test-auth">✕</button>
                    <div class="test-badge-lock">🔒 RESTRICTED TERMINAL</div>
                    <div class="test-modal-title">CLASSIFIED TEST MODE</div>
                    <div class="test-modal-sub">Enter Developer Authorization Passcode</div>
                    
                    <form id="test-auth-form" autocomplete="off">
                        <div class="test-input-wrapper">
                            <input 
                                type="password" 
                                id="test-auth-input" 
                                placeholder="ENTER PASSCODE..." 
                                autocomplete="current-password"
                                spellcheck="false"
                            />
                            <button type="submit" id="btn-submit-test-auth" class="btn-test-submit">AUTHORIZE</button>
                        </div>
                        <div id="test-auth-feedback" class="test-auth-feedback"></div>
                    </form>
                    
                    <div class="test-hint-row">
                        <span>SECURITY PROTOCOL LEVEL 5</span>
                        <span>•</span>
                        <span>URBAN BREACH ENGINE</span>
                    </div>
                </div>
            `;
            document.body.appendChild(authModal);

            const authForm = authModal.querySelector('#test-auth-form');
            const authInput = authModal.querySelector('#test-auth-input');
            const authFeedback = authModal.querySelector('#test-auth-feedback');
            const closeBtn = authModal.querySelector('#btn-close-test-auth');

            authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const entered = authInput.value;
                if (verifyTestModePassword(entered)) {
                    testModeState.isUnlocked = true;
                    try { sessionStorage.setItem('ub_test_mode_unlocked', '1'); } catch (err) {}
                    achievementManager.unlock('SECRET_AUTH');
                    authFeedback.textContent = 'ACCESS GRANTED // INITIALIZING TEST CONSOLE...';
                    authFeedback.className = 'test-auth-feedback success';
                    setTimeout(() => {
                        this.hideAuthModal();
                        this.showPanel();
                    }, 400);
                } else {
                    authFeedback.textContent = 'ACCESS DENIED // INVALID AUTHORIZATION PASSCODE';
                    authFeedback.className = 'test-auth-feedback error';
                    authInput.value = '';
                    authInput.focus();
                    authModal.querySelector('.test-modal-card').classList.add('shake');
                    setTimeout(() => {
                        authModal.querySelector('.test-modal-card').classList.remove('shake');
                    }, 500);
                }
            });

            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideAuthModal();
            });

            authModal.addEventListener('click', (e) => {
                if (e.target === authModal) {
                    this.hideAuthModal();
                }
            });
        }
        this.authModal = authModal;

        // 3. Test Mode Command Console Panel
        let panel = document.getElementById('test-mode-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'test-mode-panel';
            panel.className = 'test-console-panel';
            panel.style.display = 'none';
            panel.innerHTML = `
                <div class="test-panel-header">
                    <div class="test-panel-title-group">
                        <span class="test-panel-icon">⚡</span>
                        <div class="test-panel-title">COMMAND TEST CONSOLE</div>
                        <span class="test-panel-version">⏸ GAME PAUSED // DEV BUILD</span>
                    </div>
                    <div class="test-header-actions">
                        <button id="btn-minimize-test-panel" class="test-btn-icon" title="Minimize">─</button>
                        <button id="btn-close-test-panel" class="test-btn-icon" title="Close (F2)">✕</button>
                    </div>
                </div>

                <!-- Navigation Tabs -->
                <div class="test-tabs-bar">
                    <button class="test-tab active" data-tab="waves">WAVE DIRECTOR</button>
                    <button class="test-tab" data-tab="spawner">CUSTOM SPAWNER</button>
                    <button class="test-tab" data-tab="modifiers">AI & STAT TUNING</button>
                    <button class="test-tab" data-tab="cheats">TESTER CHEATS</button>
                    <button class="test-tab" data-tab="telemetry">LIVE TELEMETRY</button>
                </div>

                <!-- Tab 1: Wave Director -->
                <div class="test-tab-content active" id="tab-content-waves">
                    <div class="test-section-title">WAVE NAVIGATION & PROGRESSION</div>
                    <div class="test-row">
                        <div class="test-quick-waves-group">
                            <button class="test-btn-pill" data-wave="1">Wave 1</button>
                            <button class="test-btn-pill" data-wave="2">Wave 2</button>
                            <button class="test-btn-pill" data-wave="3">Wave 3</button>
                            <button class="test-btn-pill boss" data-wave="5">Wave 5 ☠ BOSS</button>
                            <button class="test-btn-pill boss" data-wave="10">Wave 10 ☠ BOSS</button>
                            <button class="test-btn-pill boss" data-wave="15">Wave 15 ☠ BOSS</button>
                            <button class="test-btn-pill boss" data-wave="20">Wave 20 ☠ BOSS</button>
                            <button class="test-btn-pill" data-wave="95" style="border-color: rgba(230, 126, 34, 0.6); color: #e67e22;">Wave 95 🔥</button>
                            <button class="test-btn-pill" data-wave="100" style="border-color: rgba(241, 196, 15, 0.8); color: #f1c40f; font-weight: 700;">Wave 100 👑 WIN</button>
                        </div>
                    </div>

                    <div class="test-row-form">
                        <label>Jump to Custom Wave:</label>
                        <div class="test-input-inline">
                            <input type="number" id="test-wave-input" min="1" max="999" value="1" />
                            <button id="btn-test-jump-wave" class="test-btn-action cyan">JUMP TO WAVE</button>
                            <button id="btn-test-prev-wave" class="test-btn-action gray">-1</button>
                            <button id="btn-test-next-wave" class="test-btn-action gray">+1</button>
                        </div>
                    </div>

                    <div class="test-divider"></div>
                    <div class="test-section-title">WAVE FLOW CONTROLS</div>
                    <div class="test-button-grid">
                        <button id="btn-test-spawn-wave" class="test-btn-action green">⚡ FORCE SPAWN WAVE NOW</button>
                        <button id="btn-test-clear-wave" class="test-btn-action red">☠ CLEAR ALL ACTIVE HOSTILES</button>
                        <button id="btn-test-freeze-timer" class="test-btn-action amber">⏸ FREEZE WAVE TIMER: OFF</button>
                    </div>
                </div>

                <!-- Tab 2: Custom Spawner -->
                <div class="test-tab-content" id="tab-content-spawner">
                    <div class="test-section-title">SPAWN CONFIGURATION</div>
                    <div class="test-config-row">
                        <div class="test-config-col">
                            <label>Quantity to Spawn:</label>
                            <div class="test-pill-select" id="group-spawn-count">
                                <button class="test-pill active" data-val="1">1x</button>
                                <button class="test-pill" data-val="3">3x</button>
                                <button class="test-pill" data-val="5">5x</button>
                                <button class="test-pill" data-val="10">10x</button>
                            </div>
                        </div>
                        <div class="test-config-col">
                            <label>Spawn Location:</label>
                            <div class="test-pill-select" id="group-spawn-loc">
                                <button class="test-pill active" data-val="front">In Front (10m)</button>
                                <button class="test-pill" data-val="around">Around (25m)</button>
                                <button class="test-pill" data-val="random">Standard Spawns</button>
                            </div>
                        </div>
                    </div>

                    <div class="test-divider"></div>
                    <div class="test-section-title">INSTANT ENEMY SPAWNERS</div>
                    <div class="test-button-grid">
                        <button id="btn-spawn-gunner" class="test-btn-action cyan">
                            <span class="btn-icon">🔫</span> SPAWN SOLDIER GUNNER
                        </button>
                        <button id="btn-spawn-knifer" class="test-btn-action amber">
                            <span class="btn-icon">🔪</span> SPAWN KNIFE STALKER
                        </button>
                        <button id="btn-spawn-car" class="test-btn-action purple">
                            <span class="btn-icon">🚓</span> SPAWN PATROL CAR
                        </button>
                        <button id="btn-spawn-boss" class="test-btn-action red">
                            <span class="btn-icon">☠</span> SPAWN BOSS GUNNER
                        </button>
                    </div>

                    <div class="test-boss-tier-row">
                        <label>Boss Tier Level:</label>
                        <div class="test-pill-select" id="group-boss-tier">
                            <button class="test-pill active" data-val="1">Tier 1 (W5)</button>
                            <button class="test-pill" data-val="2">Tier 2 (W10)</button>
                            <button class="test-pill" data-val="3">Tier 3 (W15)</button>
                            <button class="test-pill" data-val="4">Tier 4 (W20)</button>
                        </div>
                    </div>
                </div>

                <!-- Tab 3: AI & Stat Tuning -->
                <div class="test-tab-content" id="tab-content-modifiers">
                    <div class="test-section-title">ENEMY STAT MULTIPLIERS (REAL-TIME)</div>
                    
                    <div class="test-mod-row">
                        <div class="test-mod-label">Enemy Health Multiplier:</div>
                        <div class="test-pill-select" id="group-mod-health">
                            <button class="test-pill" data-val="0.1">0.1x (1-Hit)</button>
                            <button class="test-pill" data-val="0.5">0.5x</button>
                            <button class="test-pill active" data-val="1.0">1.0x Normal</button>
                            <button class="test-pill" data-val="2.0">2.0x</button>
                            <button class="test-pill" data-val="5.0">5.0x Tank</button>
                        </div>
                    </div>

                    <div class="test-mod-row">
                        <div class="test-mod-label">Enemy Speed Multiplier:</div>
                        <div class="test-pill-select" id="group-mod-speed">
                            <button class="test-pill" data-val="0.0">0x Frozen</button>
                            <button class="test-pill" data-val="0.5">0.5x Slow</button>
                            <button class="test-pill active" data-val="1.0">1.0x Normal</button>
                            <button class="test-pill" data-val="1.5">1.5x Fast</button>
                            <button class="test-pill" data-val="2.5">2.5x Hyper</button>
                        </div>
                    </div>

                    <div class="test-mod-row">
                        <div class="test-mod-label">Enemy Damage Multiplier:</div>
                        <div class="test-pill-select" id="group-mod-damage">
                            <button class="test-pill" data-val="0.0">0x Peaceful</button>
                            <button class="test-pill" data-val="0.5">0.5x Half</button>
                            <button class="test-pill active" data-val="1.0">1.0x Normal</button>
                            <button class="test-pill" data-val="2.0">2.0x Lethal</button>
                            <button class="test-pill" data-val="5.0">5.0x Instakill</button>
                        </div>
                    </div>

                    <div class="test-divider"></div>
                    <div class="test-section-title">AI BEHAVIOR TOGGLES</div>
                    <div class="test-button-grid">
                        <button id="btn-toggle-freeze-ai" class="test-btn-action cyan">⏸ FREEZE AI LOCOMOTION: OFF</button>
                        <button id="btn-toggle-passive-ai" class="test-btn-action green">🕊 PASSIVE / BLIND AI: OFF</button>
                        <button id="btn-alert-all-ai" class="test-btn-action amber">🚨 ALERT ALL HOSTILES</button>
                    </div>
                </div>

                <!-- Tab 4: Tester Cheats & Arsenal -->
                <div class="test-tab-content" id="tab-content-cheats">
                    <div class="test-section-title">PLAYER COMBAT CHEATS</div>
                    <div class="test-button-grid">
                        <button id="btn-cheat-godmode" class="test-btn-action amber">🛡 GOD MODE (INVULNERABLE): OFF</button>
                        <button id="btn-cheat-infinite-ammo" class="test-btn-action cyan">♾ INFINITE AMMO: OFF</button>
                        <button id="btn-cheat-super-speed" class="test-btn-action green">🏃 SUPER SPEED (2.5x): OFF</button>
                        <button id="btn-cheat-super-jump" class="test-btn-action purple">🦘 SUPER JUMP (3x): OFF</button>
                    </div>

                    <div class="test-divider"></div>
                    <div class="test-section-title">ARSENAL & RESTORATION</div>
                    <div class="test-button-grid">
                        <button id="btn-cheat-heal" class="test-btn-action green">💚 FULL HEAL & REPAIR BONES</button>
                        <button id="btn-cheat-grenades" class="test-btn-action amber">💣 REFILL GRENADES (5x MAX)</button>
                    </div>

                    <div class="test-section-title" style="margin-top:10px;">WEAPON SWITCHER</div>
                    <div class="test-weapon-switch-row">
                        <button class="test-btn-pill weapon active" data-weapon="AK47">🔫 AK-47 RIFLE</button>
                        <button class="test-btn-pill weapon" data-weapon="SNIPER">🎯 BARRETT .50 SNIPER</button>
                        <button class="test-btn-pill weapon" data-weapon="SHOTGUN">💥 M590 SHOTGUN</button>
                    </div>

                    <div class="test-section-title" style="margin-top:10px;">TACTICAL TELEPORTATION</div>
                    <div class="test-button-grid">
                        <button class="test-btn-action gray" data-teleport="origin">📍 Origin (0, 4, 20)</button>
                        <button class="test-btn-action gray" data-teleport="roof">🏢 High Rooftop (0, 32, 0)</button>
                        <button class="test-btn-action gray" data-teleport="bridge">🌉 Canal Bridge (0, 4, -40)</button>
                    </div>
                </div>

                <!-- Tab 5: Live Telemetry -->
                <div class="test-tab-content" id="tab-content-telemetry">
                    <div class="test-section-title">REAL-TIME ENGINE TELEMETRY</div>
                    <div class="test-telemetry-grid">
                        <div class="telemetry-card">
                            <div class="telemetry-label">CURRENT WAVE</div>
                            <div class="telemetry-value cyan" id="tele-wave">1</div>
                        </div>
                        <div class="telemetry-card">
                            <div class="telemetry-label">ALIVE HOSTILES</div>
                            <div class="telemetry-value red" id="tele-enemies">0</div>
                        </div>
                        <div class="telemetry-card">
                            <div class="telemetry-label">ACTIVE BOSSES</div>
                            <div class="telemetry-value amber" id="tele-bosses">0</div>
                        </div>
                        <div class="telemetry-card">
                            <div class="telemetry-label">PATROL CARS</div>
                            <div class="telemetry-value purple" id="tele-cars">0</div>
                        </div>
                        <div class="telemetry-card">
                            <div class="telemetry-label">PLAYER HEALTH</div>
                            <div class="telemetry-value green" id="tele-hp">125 / 125</div>
                        </div>
                        <div class="telemetry-card">
                            <div class="telemetry-label">COORDINATES (X, Y, Z)</div>
                            <div class="telemetry-value gray" id="tele-pos">0.0, 4.0, 20.0</div>
                        </div>
                    </div>
                </div>

                <!-- Footer Status -->
                <div class="test-panel-footer">
                    <span>RAPHAEL DSOUZA // SECRET TEST SUITE</span>
                    <span class="footer-dot">•</span>
                    <span>PRESS F2 TO TOGGLE</span>
                </div>
            `;
            document.body.appendChild(panel);

            this.setupPanelEvents(panel);
        }
        this.panel = panel;
    }

    setupPanelEvents(panel) {
        // Tab switching
        const tabs = panel.querySelectorAll('.test-tab');
        const contents = panel.querySelectorAll('.test-tab-content');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                const targetId = `tab-content-${tab.dataset.tab}`;
                const target = panel.querySelector(`#${targetId}`);
                if (target) target.classList.add('active');
                this.activeTab = tab.dataset.tab;
                if (this.activeTab === 'telemetry') {
                    this.updateTelemetry();
                }
            });
        });

        // Close / Minimize
        panel.querySelector('#btn-close-test-panel').addEventListener('click', () => this.hidePanel());
        panel.querySelector('#btn-minimize-test-panel').addEventListener('click', () => this.hidePanel());

        // Quick Wave Pills
        panel.querySelectorAll('.test-quick-waves-group .test-btn-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                const w = parseInt(btn.dataset.wave, 10);
                if (this.api.setWave) this.api.setWave(w);
                panel.querySelector('#test-wave-input').value = w;
            });
        });

        // Jump Wave Button & Inputs
        const waveInput = panel.querySelector('#test-wave-input');
        panel.querySelector('#btn-test-jump-wave').addEventListener('click', () => {
            const w = parseInt(waveInput.value, 10);
            if (!isNaN(w) && w >= 1 && this.api.setWave) {
                this.api.setWave(w);
            }
        });
        panel.querySelector('#btn-test-prev-wave').addEventListener('click', () => {
            let w = parseInt(waveInput.value, 10) || 1;
            w = Math.max(1, w - 1);
            waveInput.value = w;
            if (this.api.setWave) this.api.setWave(w);
        });
        panel.querySelector('#btn-test-next-wave').addEventListener('click', () => {
            let w = parseInt(waveInput.value, 10) || 1;
            w = w + 1;
            waveInput.value = w;
            if (this.api.setWave) this.api.setWave(w);
        });

        // Wave Flow Controls
        panel.querySelector('#btn-test-spawn-wave').addEventListener('click', () => {
            if (this.api.spawnWaveNow) this.api.spawnWaveNow();
        });
        panel.querySelector('#btn-test-clear-wave').addEventListener('click', () => {
            if (this.api.clearAllEnemies) this.api.clearAllEnemies();
        });

        // Freeze Wave Timer Toggle
        const btnFreezeTimer = panel.querySelector('#btn-test-freeze-timer');
        btnFreezeTimer.addEventListener('click', () => {
            testModeState.freezeWaveTimer = !testModeState.freezeWaveTimer;
            btnFreezeTimer.textContent = testModeState.freezeWaveTimer ? '▶ FREEZE WAVE TIMER: ON (FROZEN)' : '⏸ FREEZE WAVE TIMER: OFF';
            btnFreezeTimer.classList.toggle('active', testModeState.freezeWaveTimer);
            if (this.api.setWaveTimerFrozen) this.api.setWaveTimerFrozen(testModeState.freezeWaveTimer);
        });

        // Spawner Settings: Count
        panel.querySelectorAll('#group-spawn-count .test-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                panel.querySelectorAll('#group-spawn-count .test-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                testModeState.spawnCount = parseInt(pill.dataset.val, 10);
            });
        });

        // Spawner Settings: Location
        panel.querySelectorAll('#group-spawn-loc .test-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                panel.querySelectorAll('#group-spawn-loc .test-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                testModeState.spawnLocation = pill.dataset.val;
            });
        });

        // Spawner Settings: Boss Tier
        panel.querySelectorAll('#group-boss-tier .test-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                panel.querySelectorAll('#group-boss-tier .test-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                testModeState.bossLevel = parseInt(pill.dataset.val, 10);
            });
        });

        // Spawn Buttons
        panel.querySelector('#btn-spawn-gunner').addEventListener('click', () => {
            if (this.api.spawnEnemy) this.api.spawnEnemy('gunner', testModeState.spawnCount, testModeState.spawnLocation);
        });
        panel.querySelector('#btn-spawn-knifer').addEventListener('click', () => {
            if (this.api.spawnEnemy) this.api.spawnEnemy('knife', testModeState.spawnCount, testModeState.spawnLocation);
        });
        panel.querySelector('#btn-spawn-boss').addEventListener('click', () => {
            if (this.api.spawnBoss) this.api.spawnBoss(testModeState.bossLevel, testModeState.spawnLocation);
        });
        panel.querySelector('#btn-spawn-car').addEventListener('click', () => {
            if (this.api.spawnVehicle) this.api.spawnVehicle(testModeState.spawnCount, testModeState.spawnLocation);
        });

        // Modifiers: Health
        panel.querySelectorAll('#group-mod-health .test-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                panel.querySelectorAll('#group-mod-health .test-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                testModeState.enemyHealthMult = parseFloat(pill.dataset.val);
                if (this.api.applyModifiers) this.api.applyModifiers(testModeState);
            });
        });

        // Modifiers: Speed
        panel.querySelectorAll('#group-mod-speed .test-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                panel.querySelectorAll('#group-mod-speed .test-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                testModeState.enemySpeedMult = parseFloat(pill.dataset.val);
                if (this.api.applyModifiers) this.api.applyModifiers(testModeState);
            });
        });

        // Modifiers: Damage
        panel.querySelectorAll('#group-mod-damage .test-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                panel.querySelectorAll('#group-mod-damage .test-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                testModeState.enemyDamageMult = parseFloat(pill.dataset.val);
                if (this.api.applyModifiers) this.api.applyModifiers(testModeState);
            });
        });

        // Modifiers: AI Toggles
        const btnFreezeAI = panel.querySelector('#btn-toggle-freeze-ai');
        btnFreezeAI.addEventListener('click', () => {
            testModeState.freezeEnemies = !testModeState.freezeEnemies;
            btnFreezeAI.textContent = testModeState.freezeEnemies ? '⏸ FREEZE AI LOCOMOTION: ON' : '⏸ FREEZE AI LOCOMOTION: OFF';
            btnFreezeAI.classList.toggle('active', testModeState.freezeEnemies);
        });

        const btnPassiveAI = panel.querySelector('#btn-toggle-passive-ai');
        btnPassiveAI.addEventListener('click', () => {
            testModeState.passiveAI = !testModeState.passiveAI;
            btnPassiveAI.textContent = testModeState.passiveAI ? '🕊 PASSIVE / BLIND AI: ON' : '🕊 PASSIVE / BLIND AI: OFF';
            btnPassiveAI.classList.toggle('active', testModeState.passiveAI);
        });

        panel.querySelector('#btn-alert-all-ai').addEventListener('click', () => {
            if (this.api.alertAllEnemies) this.api.alertAllEnemies();
        });

        // Tester Cheats: God Mode
        const btnGodMode = panel.querySelector('#btn-cheat-godmode');
        btnGodMode.addEventListener('click', () => {
            testModeState.godMode = !testModeState.godMode;
            btnGodMode.textContent = testModeState.godMode ? '🛡 GOD MODE (INVULNERABLE): ON' : '🛡 GOD MODE (INVULNERABLE): OFF';
            btnGodMode.classList.toggle('active', testModeState.godMode);
            if (this.api.setGodMode) this.api.setGodMode(testModeState.godMode);
        });

        // Tester Cheats: Infinite Ammo
        const btnInfAmmo = panel.querySelector('#btn-cheat-infinite-ammo');
        btnInfAmmo.addEventListener('click', () => {
            testModeState.infiniteAmmo = !testModeState.infiniteAmmo;
            btnInfAmmo.textContent = testModeState.infiniteAmmo ? '♾ INFINITE AMMO: ON' : '♾ INFINITE AMMO: OFF';
            btnInfAmmo.classList.toggle('active', testModeState.infiniteAmmo);
            if (this.api.setInfiniteAmmo) this.api.setInfiniteAmmo(testModeState.infiniteAmmo);
        });

        // Tester Cheats: Super Speed
        const btnSpeed = panel.querySelector('#btn-cheat-super-speed');
        btnSpeed.addEventListener('click', () => {
            testModeState.superSpeed = !testModeState.superSpeed;
            btnSpeed.textContent = testModeState.superSpeed ? '🏃 SUPER SPEED (2.5x): ON' : '🏃 SUPER SPEED (2.5x): OFF';
            btnSpeed.classList.toggle('active', testModeState.superSpeed);
            if (this.api.setSuperSpeed) this.api.setSuperSpeed(testModeState.superSpeed);
        });

        // Tester Cheats: Super Jump
        const btnJump = panel.querySelector('#btn-cheat-super-jump');
        btnJump.addEventListener('click', () => {
            testModeState.superJump = !testModeState.superJump;
            btnJump.textContent = testModeState.superJump ? '🦘 SUPER JUMP (3x): ON' : '🦘 SUPER JUMP (3x): OFF';
            btnJump.classList.toggle('active', testModeState.superJump);
            if (this.api.setSuperJump) this.api.setSuperJump(testModeState.superJump);
        });

        // Actions: Heal & Grenades
        panel.querySelector('#btn-cheat-heal').addEventListener('click', () => {
            if (this.api.healPlayer) this.api.healPlayer();
        });
        panel.querySelector('#btn-cheat-grenades').addEventListener('click', () => {
            if (this.api.refillGrenades) this.api.refillGrenades();
        });

        // Weapon Switch
        panel.querySelectorAll('.test-weapon-switch-row .test-btn-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                panel.querySelectorAll('.test-weapon-switch-row .test-btn-pill').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (this.api.switchWeapon) this.api.switchWeapon(btn.dataset.weapon);
            });
        });

        // Teleport
        panel.querySelectorAll('[data-teleport]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.api.teleport) this.api.teleport(btn.dataset.teleport);
            });
        });
    }

    setupKeyboard() {
        if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;

        window.addEventListener('keydown', (e) => {
            // F2 key toggles the secret test console
            if (e.code === 'F2') {
                e.preventDefault();
                this.toggle();
                return;
            }

            // Escape closes test panel if open
            if (e.code === 'Escape' && testModeState.isOpen) {
                e.preventDefault();
                this.hidePanel();
            }
        });
    }

    toggle() {
        // Automatically exit pointer lock so user has mouse control
        if (typeof document !== 'undefined' && document.pointerLockElement) {
            document.exitPointerLock();
        }

        if (testModeState.isOpen) {
            this.hidePanel();
        } else {
            achievementManager.unlock('SECRET_FOUND');
            if (testModeState.isUnlocked) {
                this.showPanel();
            } else {
                this.showAuthModal();
            }
        }
    }

    showAuthModal() {
        if (typeof document !== 'undefined' && document.pointerLockElement) {
            document.exitPointerLock();
        }
        if (!this.authModal && typeof document !== 'undefined') this.initDOM();
        if (this.authModal) {
            this.authModal.style.display = 'flex';
            const input = this.authModal.querySelector('#test-auth-input');
            if (input) {
                input.value = '';
                setTimeout(() => input.focus(), 50);
            }
            const feedback = this.authModal.querySelector('#test-auth-feedback');
            if (feedback) {
                feedback.textContent = '';
                feedback.className = 'test-auth-feedback';
            }
        }
        testModeState.isOpen = true;
        if (typeof window !== 'undefined') {
            window.testModeOpen = true;
        }
    }

    hideAuthModal() {
        if (this.authModal) {
            this.authModal.style.display = 'none';
        }
        if (!this.panel || this.panel.style.display !== 'flex') {
            testModeState.isOpen = false;
            if (typeof window !== 'undefined') {
                window.testModeOpen = false;
            }
        }
    }

    showPanel() {
        if (typeof document !== 'undefined' && document.pointerLockElement) {
            document.exitPointerLock();
        }
        if (!this.panel && typeof document !== 'undefined') this.initDOM();
        if (this.panel) {
            this.panel.style.display = 'flex';
        }
        testModeState.isOpen = true;
        if (typeof window !== 'undefined') {
            window.testModeOpen = true;
        }

        // Sync wave input with current game wave
        if (this.api.getGameState) {
            const state = this.api.getGameState();
            const input = this.panel.querySelector('#test-wave-input');
            if (input && state && state.wave) input.value = state.wave;
        }

        this.updateTelemetry();
        if (!this.telemetryInterval) {
            this.telemetryInterval = setInterval(() => {
                if (testModeState.isOpen && this.activeTab === 'telemetry') {
                    this.updateTelemetry();
                }
            }, 500);
        }
    }

    hidePanel() {
        if (this.panel) {
            this.panel.style.display = 'none';
        }
        testModeState.isOpen = false;
        if (typeof window !== 'undefined') {
            window.testModeOpen = false;
        }
        if (this.telemetryInterval) {
            clearInterval(this.telemetryInterval);
            this.telemetryInterval = null;
        }
    }

    updateTelemetry() {
        if (!this.panel || !this.api.getGameState) return;
        const state = this.api.getGameState();
        if (!state) return;

        const setTxt = (id, val) => {
            const el = this.panel.querySelector(`#${id}`);
            if (el) el.textContent = val;
        };

        setTxt('tele-wave', `${state.wave || 1} (${state.difficultyName || 'SURVIVOR'})`);
        setTxt('tele-enemies', state.aliveEnemies || 0);
        setTxt('tele-bosses', state.aliveBosses || 0);
        setTxt('tele-cars', state.aliveCars || 0);
        setTxt('tele-hp', `${Math.round(state.health || 0)} / ${Math.round(state.maxHealth || 100)}`);
        if (state.playerPos) {
            setTxt('tele-pos', `${state.playerPos.x.toFixed(1)}, ${state.playerPos.y.toFixed(1)}, ${state.playerPos.z.toFixed(1)}`);
        }
    }
}
