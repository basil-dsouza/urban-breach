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

        window.uiManagerGlobal = this;

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
                <div class="ctrl-row"><span>C / CTRL</span> Crouch (Reduces Spread & Edge Lock)</div>
                <div class="ctrl-row"><span>SPACE</span> Jump / Climb Up</div>
                <div class="ctrl-row"><span>LMB (Hold)</span> Full-Auto Shooting</div>
                <div class="ctrl-row"><span>RMB</span> Aim Down Sights (Pinpoint Optical Zoom)</div>
                <div class="ctrl-row"><span>G</span> Throw Grenade (Bounces on Ground)</div>
                <div class="ctrl-row alert-row"><span>RADAR</span> Tracks hostiles, buildings, vehicles, and climbable ladders</div>
            </div>
        `;
        this.uiRoot.appendChild(this.titleScreen);

        // 1b. Lobby Select Screen (Singleplayer / Multiplayer Selection)
        this.lobbySelectScreen = document.createElement('div');
        this.lobbySelectScreen.id = 'lobby-select-screen';
        this.lobbySelectScreen.className = 'screen-overlay';
        this.lobbySelectScreen.style.display = 'none';
        this.lobbySelectScreen.innerHTML = `
            <div class="game-logo">URBAN BREACH</div>
            <div class="game-subtitle">SELECT GAME FORMAT</div>

            <div class="lobby-select-grid">
                <div class="lobby-select-card" id="card-singleplayer">
                    <h3>SINGLEPLAYER</h3>
                    <p>Standard tactical survival vs enemy waves. Climb buildings, throw grenades, and set highscores solo.</p>
                </div>
                <div class="lobby-select-card" id="card-multiplayer">
                    <h3>MULTIPLAYER</h3>
                    <p>Deploy with up to 5 players. Select FFA Deathmatch (PvP) with active hostile bots, or play cooperative PvE.</p>
                </div>
            </div>

            <button id="btn-back-to-title" class="btn-secondary">
                ← BACK TO MAIN MENU
            </button>
        `;
        this.uiRoot.appendChild(this.lobbySelectScreen);

        // 1c. Multiplayer Lobby Screen
        this.lobbyScreen = document.createElement('div');
        this.lobbyScreen.id = 'lobby-screen';
        this.lobbyScreen.className = 'screen-overlay';
        this.lobbyScreen.style.display = 'none';
        this.lobbyScreen.innerHTML = `
            <div class="game-logo">MULTIPLAYER LOBBY</div>
            <div class="game-subtitle" id="lobby-status-subtitle">DEPLOY WITH YOUR SQUAD (MAX 5 PLAYERS)</div>

            <div style="display: flex; gap: 32px; justify-content: center; align-items: flex-start; margin-bottom: 24px;">
                <!-- Column 1: Settings -->
                <div class="lobby-form">
                    <h3>OPERATOR SETTINGS</h3>
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <label style="font-size: 13px; font-weight: 800; color: #cbd5e1;">NICKNAME</label>
                        <input type="text" id="input-nickname" class="lobby-input" value="Operator-${Math.floor(100 + Math.random() * 900)}" maxlength="14" />
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 6px;" id="mode-settings-block">
                        <label style="font-size: 13px; font-weight: 800; color: #cbd5e1;">GAME MODE</label>
                        <div class="mode-selection">
                            <button id="btn-mode-pve" class="mode-btn selected">PVE CO-OP</button>
                            <button id="btn-mode-ffa" class="mode-btn">FFA PVP</button>
                        </div>
                    </div>

                    <div style="border-top: 1.5px solid rgba(255,255,255,0.1); padding-top: 16px; margin-top: 8px; display: flex; flex-direction: column; gap: 12px;">
                        <button id="btn-host-lobby" class="btn-primary" style="font-size:16px; padding: 12px 24px;">
                            HOST GAME
                        </button>
                        
                        <div style="display: flex; gap: 10px; align-items: center; justify-content: center;">
                            <input type="text" id="input-lobby-code" class="lobby-input" placeholder="ROOM CODE" style="width: 140px; font-size:15px; padding: 10px;" />
                            <button id="btn-join-lobby" class="btn-secondary" style="font-size:15px; padding: 10px 20px;">
                                JOIN
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Column 2: Squad Roster -->
                <div class="lobby-form" style="width: 320px;">
                    <h3>SQUAD ROSTER</h3>
                    <div class="lobby-player-list" id="lobby-roster-list">
                        <div style="color:#94a3b8; font-size: 14px; text-align: center; padding: 10px;">Lobby uninitialized. Host or join a room.</div>
                    </div>
                    <div id="lobby-code-display" style="display:none; text-align:center; font-size: 18px; font-weight:900; color:#00e5ff; letter-spacing:2px; padding:10px; background: rgba(0,229,255,0.08); border: 1px dashed #00e5ff; border-radius:6px; margin-top: 12px;">
                        CODE: -
                    </div>
                </div>
            </div>

            <div class="diff-actions">
                <button id="btn-lobby-back" class="btn-secondary">
                    ← LEAVE LOBBY
                </button>
                <button id="btn-lobby-launch" class="btn-primary" style="display:none;">
                    PROCEED TO WEAPON SELECT →
                </button>
            </div>
        `;
        this.uiRoot.appendChild(this.lobbyScreen);

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

            <!-- Stealth, Ladder & Crouch prompts -->
            <div id="hud-stealth-prompt" class="hud-stealth-prompt" style="display:none;">
                🌿 <span>STEALTH</span> HIDDEN IN FOLIAGE
            </div>
            <div id="hud-ladder-prompt" class="hud-ladder-prompt" style="display:none;">
                🧗 <span>[W]</span> CLIMB UP &nbsp;|&nbsp; <span>[S]</span> CLIMB DOWN
            </div>
            <div id="hud-crouch-prompt" class="hud-crouch-prompt" style="display:none;">
                🛡️ <span>CROUCH</span> STEADY AIM & EDGE LOCK
            </div>

            <div class="hud-bottom-right">
                <div class="hud-weapon-card">
                    <div id="hud-weapon-name" class="weapon-name">M16/M4A1 CARBINE</div>
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

        // Chat Panel on the Bottom Left (Attached to document.body above WebGL)
        this.chatPanel = document.createElement('div');
        this.chatPanel.id = 'chat-box';
        this.chatPanel.className = 'hud-chat-panel';
        this.chatPanel.style.display = 'none'; // Hidden by default
        this.chatPanel.innerHTML = `
            <div id="chat-log" class="hud-chat-log"></div>
            <input id="chat-input" class="hud-chat-input" placeholder="Press ENTER or T to chat..." maxlength="100" autocomplete="off" style="display:none;" />
        `;
        document.body.appendChild(this.chatPanel);

        // Focus / Blur listeners to disable game controls while typing
        const chatInput = this.chatPanel.querySelector('#chat-input');
        if (chatInput) {
            chatInput.addEventListener('focus', () => {
                window.chatInputActive = true;
                console.log("[CHAT] Input focused. Game controls suspended.");
            });
            chatInput.addEventListener('blur', () => {
                window.chatInputActive = false;
                chatInput.style.display = 'none';
                chatInput.value = '';
                console.log("[CHAT] Input blurred. Game controls restored.");
            });
        }

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
                this.lobbySelectScreen.style.display = 'flex';
            };
        }

        // Singleplayer selection
        const cardSingleplayer = document.getElementById('card-singleplayer');
        if (cardSingleplayer) {
            cardSingleplayer.onclick = () => {
                this.lobbySelectScreen.style.display = 'none';
                this.difficultyScreen.style.display = 'flex';
                this.resetSingleplayerUI();
            };
        }

        // Multiplayer selection
        const cardMultiplayer = document.getElementById('card-multiplayer');
        if (cardMultiplayer) {
            cardMultiplayer.onclick = () => {
                this.lobbySelectScreen.style.display = 'none';
                this.lobbyScreen.style.display = 'flex';
                this.isMultiplayerMode = true;
            };
        }

        // Back from format screen
        const btnBackToTitle = document.getElementById('btn-back-to-title');
        if (btnBackToTitle) {
            btnBackToTitle.onclick = () => {
                this.lobbySelectScreen.style.display = 'none';
                this.titleScreen.style.display = 'flex';
            };
        }

        // Back from Lobby screen
        const btnLobbyBack = document.getElementById('btn-lobby-back');
        if (btnLobbyBack) {
            btnLobbyBack.onclick = () => {
                if (typeof this.onLeaveLobby === 'function') {
                    this.onLeaveLobby();
                }
                this.lobbyScreen.style.display = 'none';
                this.lobbySelectScreen.style.display = 'flex';
                this.isClientConnected = false;
                
                // Reset lobby UI state
                document.getElementById('lobby-roster-list').innerHTML = `
                    <div style="color:#94a3b8; font-size: 14px; text-align: center; padding: 10px;">Lobby uninitialized. Host or join a room.</div>
                `;
                document.getElementById('lobby-code-display').style.display = 'none';
                document.getElementById('btn-lobby-launch').style.display = 'none';
                document.getElementById('mode-settings-block').style.display = 'flex';
                document.getElementById('btn-host-lobby').style.display = 'inline-block';
            };
        }

        // Game Mode Toggle (PVE / FFA)
        const btnModePve = document.getElementById('btn-mode-pve');
        const btnModeFfa = document.getElementById('btn-mode-ffa');
        if (btnModePve && btnModeFfa) {
            btnModePve.onclick = () => {
                if (this.isMultiplayerMode && !this.isClientConnected) {
                    btnModePve.classList.add('selected');
                    btnModeFfa.classList.remove('selected');
                    this.selectedGameMode = 'pve';
                    if (typeof this.onGameModeSelect === 'function') this.onGameModeSelect('pve');
                }
            };
            btnModeFfa.onclick = () => {
                if (this.isMultiplayerMode && !this.isClientConnected) {
                    btnModeFfa.classList.add('selected');
                    btnModePve.classList.remove('selected');
                    this.selectedGameMode = 'ffa';
                    if (typeof this.onGameModeSelect === 'function') this.onGameModeSelect('ffa');
                }
            };
        }

        // Host secure lobby click
        const btnHostLobby = document.getElementById('btn-host-lobby');
        if (btnHostLobby) {
            btnHostLobby.onclick = () => {
                const nickname = document.getElementById('input-nickname').value || 'Host';
                const gameMode = btnModePve.classList.contains('selected') ? 'pve' : 'ffa';
                this.isHost = true;
                
                document.getElementById('btn-lobby-launch').style.display = 'inline-block';

                if (typeof this.onHostLobby === 'function') {
                    this.onHostLobby(nickname, gameMode);
                }
            };
        }

        // Join lobby click
        const btnJoinLobby = document.getElementById('btn-join-lobby');
        if (btnJoinLobby) {
            btnJoinLobby.onclick = () => {
                const code = document.getElementById('input-lobby-code').value;
                const nickname = document.getElementById('input-nickname').value || 'Client';
                if (!code) {
                    alert('Please enter a room code!');
                    return;
                }
                this.isHost = false;
                this.isClientConnected = true;
                document.getElementById('btn-lobby-launch').style.display = 'none';
                document.getElementById('mode-settings-block').style.display = 'none';
                document.getElementById('btn-host-lobby').style.display = 'none';

                if (typeof this.onJoinLobby === 'function') {
                    this.onJoinLobby(code, nickname);
                }
            };
        }

        // Launch Lobby click (Host proceeds to Weapon Select)
        const btnLobbyLaunch = document.getElementById('btn-lobby-launch');
        if (btnLobbyLaunch) {
            btnLobbyLaunch.onclick = () => {
                if (typeof this.onLobbyLaunch === 'function') {
                    this.onLobbyLaunch();
                }
            };
        }

        const btnBackTitle = document.getElementById('btn-back-title');
        if (btnBackTitle) {
            btnBackTitle.onclick = () => {
                this.difficultyScreen.style.display = 'none';
                this.lobbySelectScreen.style.display = 'flex';
            };
        }

        const diffCards = this.difficultyScreen.querySelectorAll('.diff-card');
        diffCards.forEach(card => {
            card.onclick = () => {
                if (this.isMultiplayerMode && !this.isHost) return; // Clients locked out of diff selection
                diffCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedDifficultyKey = card.dataset.key;

                if (this.isMultiplayerMode && this.isHost && typeof this.onDifficultySelect === 'function') {
                    this.onDifficultySelect(this.selectedDifficultyKey);
                }
            };
        });

        const wepCards = this.difficultyScreen.querySelectorAll('.wep-card');
        wepCards.forEach(card => {
            card.onclick = () => {
                wepCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedWeaponKey = card.dataset.key;

                if (typeof this.onWeaponSelect === 'function') {
                    this.onWeaponSelect(this.selectedWeaponKey);
                }
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

    renderMessage(senderId, text) {
        console.log(`[CHAT] Message received from ${senderId}: "${text}"`);
        const chatLog = document.getElementById('chat-log');
        if (!chatLog) {
            console.warn("[CHAT] Cannot render message - #chat-log not found in DOM.");
            return;
        }

        const msgEl = document.createElement('div');
        msgEl.className = 'chat-message';

        if (senderId === 'System') {
            msgEl.classList.add('system');
            msgEl.innerHTML = `[SYSTEM] ${text}`;
        } else {
            const senderSpan = document.createElement('span');
            senderSpan.className = 'sender';
            senderSpan.textContent = senderId + ":";
            msgEl.appendChild(senderSpan);

            const textNode = document.createTextNode(" " + text);
            msgEl.appendChild(textNode);
        }

        chatLog.appendChild(msgEl);
        chatLog.scrollTop = chatLog.scrollHeight;
        console.log("[CHAT] DOM element created and appended to log.");

        // Auto-fade message after 8 seconds
        setTimeout(() => {
            msgEl.style.transition = 'opacity 1.5s ease-out';
            msgEl.style.opacity = '0';
            setTimeout(() => {
                if (msgEl.parentNode) {
                    msgEl.parentNode.removeChild(msgEl);
                }
            }, 1500);
        }, 8000);
    }

    addChatMessage(sender, text) {
        this.renderMessage(sender, text);
    }

    showChatPanel(visible) {
        if (this.chatPanel) {
            this.chatPanel.style.display = visible ? 'flex' : 'none';
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
        isCrouching = false,
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

        const crouchEl = document.getElementById('hud-crouch-prompt');
        if (crouchEl) {
            crouchEl.style.display = isCrouching ? 'flex' : 'none';
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

    setDifficultyKey(key) {
        this.selectedDifficultyKey = key;
        const diffCards = this.difficultyScreen.querySelectorAll('.diff-card');
        diffCards.forEach(card => {
            if (card.dataset.key === key) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
    }

    setMultiplayerRole(isHost) {
        this.isHost = isHost;
        const btnLaunch = document.getElementById('btn-launch-game');
        let waitingEl = document.getElementById('mp-lobby-waiting');

        if (!waitingEl) {
            waitingEl = document.createElement('div');
            waitingEl.id = 'mp-lobby-waiting';
            waitingEl.className = 'diff-title';
            waitingEl.style.marginTop = '20px';
            waitingEl.style.color = '#f59e0b';
            waitingEl.textContent = 'WAITING FOR HOST TO DEPLOY...';
            btnLaunch.parentNode.insertBefore(waitingEl, btnLaunch.nextSibling);
        }

        if (isHost) {
            btnLaunch.style.display = 'inline-block';
            waitingEl.style.display = 'none';
        } else {
            btnLaunch.style.display = 'none';
            waitingEl.style.display = 'block';
        }
    }

    resetSingleplayerUI() {
        this.isMultiplayerMode = false;
        this.isHost = false;
        const btnLaunch = document.getElementById('btn-launch-game');
        if (btnLaunch) btnLaunch.style.display = 'inline-block';
        const waitingEl = document.getElementById('mp-lobby-waiting');
        if (waitingEl) waitingEl.style.display = 'none';
    }
}
