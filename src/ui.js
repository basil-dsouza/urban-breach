import { DIFFICULTY_LEVELS, setDifficulty, getDifficulty } from './difficulty.js';
import { TacticalRadar } from './radar.js';

export const WEAPON_CONFIGS = {
    AK47: {
        id: 'AK47',
        name: 'AK-47 TACTICAL RIFLE',
        desc: 'Rugged Soviet 7.62x39mm assault rifle. Full-auto rapid fire with balanced tactical zoom.',
        icon: '🔫',
        color: '#00e5ff',
        ammo: 30,
        maxAmmo: 30,
        damage: 35,
        fireRate: 0.095,
        reloadTime: 2.1,
        aimFOV: 48,
        recoilKick: 0.065,
        spread: {
            baseSpread: 0.016,
            movementSpreadMultiplier: 2.4,
            sprintSpreadMultiplier: 4.2,
            aimSpreadMultiplier: 0.12,
            spreadRecoverySpeed: 4.8
        }
    },
    SNIPER: {
        id: 'SNIPER',
        name: 'BARRETT .50 CAL SNIPER',
        desc: 'Supreme anti-materiel sniper rifle. 5x high-magnification optical zoom, instant velocity & 1-shot lethality.',
        icon: '🎯',
        color: '#f59e0b',
        ammo: 10,
        maxAmmo: 10,
        damage: 200,
        fireRate: 0.85,
        reloadTime: 2.8,
        aimFOV: 15,
        recoilKick: 0.22,
        spread: {
            baseSpread: 0.035,
            movementSpreadMultiplier: 3.0,
            sprintSpreadMultiplier: 5.0,
            aimSpreadMultiplier: 0.001,
            spreadRecoverySpeed: 3.5
        }
    }
};

/**
 * UI Component Manager: Title, Difficulty Selection, Weapon Selection, Dynamic Crosshair, HUD, Radar, Game Over
 */

export class UIManager {
    constructor({ onStartGame, onRestart }) {
        this.onStartGame = onStartGame;
        this.onRestart = onRestart;
        this.selectedDifficultyKey = 'MEDIUM';
        this.selectedWeaponKey = 'AK47';
        this.radar = null;

        this.initDOM();
    }

    initDOM() {
        this.uiRoot = document.createElement('div');
        this.uiRoot.id = 'ui-root';
        document.body.appendChild(this.uiRoot);

        // 1. Title Screen
        this.titleScreen = document.createElement('div');
        this.titleScreen.id = 'title-screen';
        this.titleScreen.className = 'screen-overlay';
        this.titleScreen.innerHTML = `
            <div class="game-logo">URBAN BREACH</div>
            <div class="game-subtitle">TACTICAL SPECIAL OPS SURVIVAL</div>

            <button id="btn-to-difficulty" class="btn-primary">
                START GAME
            </button>

            <div class="controls-guide">
                <div class="ctrl-row"><span>WASD</span> Move / Ladder Climb</div>
                <div class="ctrl-row"><span>SHIFT</span> Sprint</div>
                <div class="ctrl-row"><span>SPACE</span> Jump / Climb Up</div>
                <div class="ctrl-row"><span>LMB (Hold)</span> Full-Auto Shooting</div>
                <div class="ctrl-row"><span>RMB</span> Aim Down Sights (Pinpoint Optical Zoom)</div>
                <div class="ctrl-row"><span>G</span> Throw Grenade (Bounces on Ground)</div>
                <div class="ctrl-row alert-row"><span>RADAR</span> Tracks hostiles, buildings, vehicles, and climbable ladders</div>
            </div>
        `;
        this.uiRoot.appendChild(this.titleScreen);

        // 2. Difficulty & Weapon Select Screen
        this.difficultyScreen = document.createElement('div');
        this.difficultyScreen.id = 'difficulty-screen';
        this.difficultyScreen.className = 'screen-overlay';
        this.difficultyScreen.style.display = 'none';

        let cardsHTML = '';
        for (const [key, tier] of Object.entries(DIFFICULTY_LEVELS)) {
            const isSelected = key === 'MEDIUM' ? 'selected' : '';
            cardsHTML += `
                <div class="diff-card ${isSelected}" data-key="${key}" style="--accent-color:${tier.color}">
                    <div class="diff-header">
                        <span class="diff-name">${tier.name}</span>
                        <span class="diff-badge" style="background:${tier.color}22; color:${tier.color}; border:1px solid ${tier.color}66">${key}</span>
                    </div>
                    <div class="diff-desc">${tier.description}</div>
                    <div class="diff-stats">
                        <div class="diff-stat-item">
                            <span class="stat-label">PLAYER HP</span>
                            <span class="stat-val">${tier.playerHealth}</span>
                        </div>
                        <div class="diff-stat-item">
                            <span class="stat-label">ENEMY HP</span>
                            <span class="stat-val">${tier.enemyHealth}</span>
                        </div>
                        <div class="diff-stat-item">
                            <span class="stat-label">ACCURACY</span>
                            <span class="stat-val">${Math.round(tier.enemyAccuracy * 100)}%</span>
                        </div>
                    </div>
                </div>
            `;
        }

        let weaponsHTML = '';
        for (const [key, wep] of Object.entries(WEAPON_CONFIGS)) {
            const isSelected = key === 'AK47' ? 'selected' : '';
            weaponsHTML += `
                <div class="wep-card ${isSelected}" data-key="${key}" style="--accent-color:${wep.color}">
                    <div class="diff-header">
                        <span class="diff-name">${wep.icon} ${wep.name}</span>
                        <span class="diff-badge" style="background:${wep.color}22; color:${wep.color}; border:1px solid ${wep.color}66">${wep.ammo} RDS</span>
                    </div>
                    <div class="diff-desc">${wep.desc}</div>
                    <div class="diff-stats">
                        <div class="diff-stat-item">
                            <span class="stat-label">DAMAGE</span>
                            <span class="stat-val">${wep.damage}${wep.pellets ? 'x8' : ''}</span>
                        </div>
                        <div class="diff-stat-item">
                            <span class="stat-label">FIRE RATE</span>
                            <span class="stat-val">${wep.fireRate}s</span>
                        </div>
                        <div class="diff-stat-item">
                            <span class="stat-label">ZOOM</span>
                            <span class="stat-val">${Math.round((75 / wep.aimFOV) * 10) / 10}x</span>
                        </div>
                    </div>
                </div>
            `;
        }

        this.difficultyScreen.innerHTML = `
            <div class="diff-title">SELECT DIFFICULTY</div>
            <div class="diff-cards-grid">
                ${cardsHTML}
            </div>

            <div class="diff-title" style="margin-top: 20px;">SELECT PRIMARY WEAPON</div>
            <div class="wep-cards-grid">
                ${weaponsHTML}
            </div>

            <div class="diff-actions" style="margin-top: 18px;">
                <button id="btn-back-title" class="btn-secondary">
                    ← BACK
                </button>
                <button id="btn-launch-game" class="btn-primary">
                    DEPLOY TO COMBAT
                </button>
            </div>
        `;
        this.uiRoot.appendChild(this.difficultyScreen);

        // 3. Dynamic Crosshair
        this.crosshair = document.createElement('div');
        this.crosshair.id = 'dynamic-crosshair';
        this.crosshair.innerHTML = `
            <div class="ch-bar ch-top"></div>
            <div class="ch-bar ch-bottom"></div>
            <div class="ch-bar ch-left"></div>
            <div class="ch-bar ch-right"></div>
            <div class="ch-dot"></div>
        `;
        this.uiRoot.appendChild(this.crosshair);

        this.chBars = {
            top: this.crosshair.querySelector('.ch-top'),
            bottom: this.crosshair.querySelector('.ch-bottom'),
            left: this.crosshair.querySelector('.ch-left'),
            right: this.crosshair.querySelector('.ch-right'),
            dot: this.crosshair.querySelector('.ch-dot')
        };

        // 4. Scope Overlay
        this.scope = document.createElement('div');
        this.scope.id = 'sniper-scope';
        this.scope.innerHTML = `
            <div class="scope-vignette"></div>
            <div class="scope-ring"></div>
            <div class="scope-cross-h"></div>
            <div class="scope-cross-v"></div>
            <div class="scope-center-circle"></div>
        `;
        this.scope.style.display = 'none';
        this.uiRoot.appendChild(this.scope);

        // 5. In-Game HUD with Tactical Radar & Ladder Prompt
        this.hud = document.createElement('div');
        this.hud.id = 'game-hud';
        this.hud.style.display = 'none';
        this.hud.innerHTML = `
            <div class="hud-top-left">
                <!-- Tactical Radar Canvas -->
                <div class="radar-wrapper">
                    <canvas id="radar-canvas"></canvas>
                    <div class="radar-label">TACTICAL SCANNER</div>
                </div>

                <div class="hud-item hud-hp">
                    <span class="hud-icon">❤️</span>
                    <span class="hud-label">HP:</span>
                    <span id="hud-hp-val" class="hud-number">125</span>
                </div>
                <div class="hud-item hud-diff">
                    <span id="hud-diff-badge" class="hud-badge">SURVIVOR</span>
                </div>
            </div>

            <div class="hud-top-right">
                <div class="hud-item">
                    <span class="hud-label">WAVE:</span>
                    <span id="hud-wave-val" class="hud-number">1</span>
                </div>
                <div class="hud-item">
                    <span class="hud-label">KILLS:</span>
                    <span id="hud-kills-val" class="hud-number">0</span>
                </div>
            </div>

            <!-- Stealth & Ladder prompts -->
            <div id="hud-stealth-prompt" class="hud-stealth-prompt" style="display:none;">
                🌿 <span>STEALTH</span> HIDDEN IN FOLIAGE
            </div>
            <div id="hud-ladder-prompt" class="hud-ladder-prompt" style="display:none;">
                🧗 <span>[W]</span> CLIMB UP &nbsp;|&nbsp; <span>[S]</span> CLIMB DOWN
            </div>

            <div class="hud-bottom-right">
                <div class="hud-weapon-card">
                    <div class="weapon-name">M16/M4A1 CARBINE</div>
                    <div class="weapon-ammo-row">
                        <span class="hud-icon">⚡</span>
                        <span class="hud-label">AMMO:</span>
                        <span id="hud-ammo-val" class="hud-ammo-num">30</span>
                        <span class="hud-ammo-slash">/</span>
                        <span id="hud-maxammo-val" class="hud-ammo-max">30</span>
                        <span id="hud-reload-tag" class="hud-reload-badge" style="display:none;">RELOADING...</span>
                    </div>
                    <div class="weapon-grenade-row">
                        <span id="hud-grenade-count">💣 3 / 5</span>
                        <span id="hud-grenade-timer" class="hud-timer-badge"></span>
                    </div>
                </div>
            </div>
        `;
        this.uiRoot.appendChild(this.hud);

        // 6. Damage Flash Overlay
        this.damageFlash = document.createElement('div');
        this.damageFlash.id = 'damage-flash';
        this.uiRoot.appendChild(this.damageFlash);

        // 7. Game Over Screen
        this.gameOverScreen = document.createElement('div');
        this.gameOverScreen.id = 'game-over-screen';
        this.gameOverScreen.className = 'screen-overlay';
        this.gameOverScreen.style.display = 'none';
        this.gameOverScreen.innerHTML = `
            <div class="game-over-title">YOU DIED</div>
            <div class="game-over-stats">
                <div class="go-stat">DIFFICULTY: <span id="go-diff" style="color:#00e5ff">SURVIVOR</span></div>
                <div class="go-stat">WAVES SURVIVED: <span id="go-waves" style="color:#ffd700">1</span></div>
                <div class="go-stat">HOSTILES ELIMINATED: <span id="go-kills" style="color:#ff3344">0</span></div>
            </div>
            <button id="btn-restart" class="btn-primary">
                PLAY AGAIN
            </button>
        `;
        this.uiRoot.appendChild(this.gameOverScreen);

        // Initialize Radar
        const radarCanvas = document.getElementById('radar-canvas');
        if (radarCanvas) {
            this.radar = new TacticalRadar(radarCanvas, 75);
        }

        this.bindEvents();
    }

    bindEvents() {
        const btnToDiff = document.getElementById('btn-to-difficulty');
        if (btnToDiff) {
            btnToDiff.onclick = () => {
                this.titleScreen.style.display = 'none';
                this.difficultyScreen.style.display = 'flex';
            };
        }

        const btnBackTitle = document.getElementById('btn-back-title');
        if (btnBackTitle) {
            btnBackTitle.onclick = () => {
                this.difficultyScreen.style.display = 'none';
                this.titleScreen.style.display = 'flex';
            };
        }

        const diffCards = this.difficultyScreen.querySelectorAll('.diff-card');
        diffCards.forEach(card => {
            card.onclick = () => {
                diffCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedDifficultyKey = card.dataset.key;
            };
        });

        const wepCards = this.difficultyScreen.querySelectorAll('.wep-card');
        wepCards.forEach(card => {
            card.onclick = () => {
                wepCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedWeaponKey = card.dataset.key;
            };
        });

        const btnLaunch = document.getElementById('btn-launch-game');
        if (btnLaunch) {
            btnLaunch.onclick = () => {
                const diff = setDifficulty(this.selectedDifficultyKey);
                this.difficultyScreen.style.display = 'none';
                this.hud.style.display = 'block';
                this.crosshair.style.display = 'block';

                const diffBadge = document.getElementById('hud-diff-badge');
                if (diffBadge) {
                    diffBadge.textContent = diff.name;
                    diffBadge.style.color = diff.color;
                    diffBadge.style.borderColor = diff.color;
                }

                if (typeof this.onStartGame === 'function') {
                    this.onStartGame(diff, this.selectedWeaponKey);
                }
            };
        }

        const btnRestart = document.getElementById('btn-restart');
        if (btnRestart) {
            btnRestart.onclick = () => {
                if (typeof this.onRestart === 'function') {
                    this.onRestart();
                } else {
                    location.reload();
                }
            };
        }
    }

    updateCrosshair(crosshairData, aiming) {
        if (aiming) {
            this.crosshair.style.opacity = '0';
            this.scope.style.display = 'block';
        } else {
            this.crosshair.style.opacity = '1';
            this.scope.style.display = 'none';

            this.chBars.top.style.transform = crosshairData.top;
            this.chBars.bottom.style.transform = crosshairData.bottom;
            this.chBars.left.style.transform = crosshairData.left;
            this.chBars.right.style.transform = crosshairData.right;
        }
    }

    updateHUD({
        health,
        maxHealth = 100,
        wave,
        kills,
        difficulty,
        onLadder = false,
        isStealth = false,
        ammo = 30,
        maxAmmo = 30,
        isReloading = false,
        grenadeCount = 3,
        maxGrenades = 5,
        grenadeTimer = 0,
        weapon = null
    }) {
        const hpEl = document.getElementById('hud-hp-val');
        if (hpEl) {
            hpEl.textContent = Math.max(0, Math.round(health));
            if (health < maxHealth * 0.3) {
                hpEl.style.color = '#ff3344';
            } else {
                hpEl.style.color = '#4ade80';
            }
        }

        const wepNameEl = document.getElementById('hud-weapon-name');
        if (wepNameEl && weapon) {
            wepNameEl.textContent = weapon.name;
            wepNameEl.style.color = weapon.color || '#00e5ff';
        }

        const waveEl = document.getElementById('hud-wave-val');
        if (waveEl) waveEl.textContent = wave;

        const killsEl = document.getElementById('hud-kills-val');
        if (killsEl) killsEl.textContent = kills;

        const ladderEl = document.getElementById('hud-ladder-prompt');
        if (ladderEl) {
            ladderEl.style.display = onLadder ? 'flex' : 'none';
        }

        const stealthEl = document.getElementById('hud-stealth-prompt');
        if (stealthEl) {
            stealthEl.style.display = isStealth ? 'flex' : 'none';
        }

        if (difficulty) {
            const diffBadge = document.getElementById('hud-diff-badge');
            if (diffBadge) {
                diffBadge.textContent = difficulty.name;
                diffBadge.style.color = difficulty.color;
                diffBadge.style.borderColor = difficulty.color;
            }
        }

        // Ammo & Reload UI
        const ammoValEl = document.getElementById('hud-ammo-val');
        const maxAmmoValEl = document.getElementById('hud-maxammo-val');
        const reloadTagEl = document.getElementById('hud-reload-tag');

        if (ammoValEl) {
            ammoValEl.textContent = ammo;
            ammoValEl.style.color = ammo <= 5 ? '#ff3344' : '#00e5ff';
        }
        if (maxAmmoValEl) maxAmmoValEl.textContent = maxAmmo;
        if (reloadTagEl) {
            reloadTagEl.style.display = isReloading ? 'inline-block' : 'none';
        }

        // Grenades UI
        const grenadeCountEl = document.getElementById('hud-grenade-count');
        const grenadeTimerEl = document.getElementById('hud-grenade-timer');

        if (grenadeCountEl) {
            grenadeCountEl.textContent = `💣 ${grenadeCount} / ${maxGrenades}`;
            grenadeCountEl.style.color = grenadeCount > 0 ? '#fbbf24' : '#94a3b8';
        }
        if (grenadeTimerEl) {
            if (grenadeCount < maxGrenades && grenadeTimer > 0) {
                grenadeTimerEl.textContent = `(+1 in ${grenadeTimer.toFixed(1)}s)`;
                grenadeTimerEl.style.display = 'inline-block';
            } else {
                grenadeTimerEl.style.display = 'none';
            }
        }
    }

    updateRadar(radarData, delta) {
        if (this.radar) {
            this.radar.render(radarData, delta);
        }
    }

    triggerDamageFlash(intensity = 0.8) {
        this.damageFlash.style.background = `rgba(255, 0, 0, ${intensity})`;
    }

    updateDamageFlash(delta) {
        const currentOpacity = parseFloat(this.damageFlash.style.background.split(',')[3]) || 0;
        if (currentOpacity > 0.01) {
            const nextOpacity = Math.max(0, currentOpacity - delta * 4.5);
            this.damageFlash.style.background = `rgba(255, 0, 0, ${nextOpacity})`;
        }
    }

    showGameOver({ kills, wave, difficulty }) {
        this.hud.style.display = 'none';
        this.crosshair.style.display = 'none';
        this.scope.style.display = 'none';

        const goDiff = document.getElementById('go-diff');
        if (goDiff && difficulty) {
            goDiff.textContent = difficulty.name;
            goDiff.style.color = difficulty.color;
        }

        const goWaves = document.getElementById('go-waves');
        if (goWaves) goWaves.textContent = wave;

        const goKills = document.getElementById('go-kills');
        if (goKills) goKills.textContent = kills;

        this.gameOverScreen.style.display = 'flex';
    }
}
