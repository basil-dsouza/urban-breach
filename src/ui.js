import { DIFFICULTY_LEVELS, setDifficulty, getDifficulty } from './difficulty.js';
import { TacticalRadar } from './radar.js';
import { startManualHost, startManualClient, applyManualAnswer } from './manual-webrtc.js';
import { achievementManager } from './achievements.js';
import { soundEngine } from './audio.js';

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
            baseStanding: 7.0,
            baseMoving: 12.0,
            baseSprinting: 18.0,
            baseCrouching: 3.5,
            baseCrouchMoving: 6.0,
            baseAiming: 1.8, // Realistic slight spread instead of zero
            maxAimSpread: 5.2,
            aimShotKick: 0.35,
            maxSpread: 26.0,
            fireSpreadRate: 20.0,
            firePerShotKick: 2.0,
            recoverySpeed: 16.0
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
            baseStanding: 18.0,
            baseMoving: 30.0,
            baseSprinting: 45.0,
            baseCrouching: 10.0,
            baseCrouchMoving: 16.0,
            baseAiming: 0.0,
            maxSpread: 50.0,
            fireSpreadRate: 50.0,
            firePerShotKick: 15.0,
            recoverySpeed: 10.0
        }
    },
    SHOTGUN: {
        id: 'SHOTGUN',
        name: 'M590 PUMP-ACTION SHOTGUN',
        desc: '12-gauge tactical pump-action shotgun. Fires 8 high-velocity buckshot pellets in a devastating close-range spread.',
        icon: '💥',
        color: '#ef4444',
        ammo: 8,
        maxAmmo: 8,
        damage: 15,
        pellets: 8,
        fireRate: 0.72,
        reloadTime: 2.5,
        aimFOV: 58,
        recoilKick: 0.16,
        spread: {
            baseStanding: 65.0,
            baseMoving: 85.0,
            baseSprinting: 120.0,
            baseCrouching: 50.0,
            baseCrouchMoving: 65.0,
            baseAiming: 40.0,
            maxSpread: 140.0,
            fireSpreadRate: 0.0,
            firePerShotKick: 5.0,
            recoverySpeed: 25.0
        }
    },
    MINIGUN: {
        id: 'MINIGUN',
        name: 'M134 VULCAN MINIGUN',
        desc: '6-barrel heavy rotary cannon. Devastating rapid fire, 100-round capacity, barrel spin-up & sustained-fire overheat.',
        icon: '⚙️',
        color: '#10b981',
        ammo: 100,
        maxAmmo: 100,
        damage: 28,
        fireRate: 0.055,
        reloadTime: 3.4,
        aimFOV: 70, // No scope! (Normal FOV is 75)
        recoilKick: 0.042,
        spread: {
            baseStanding: 10.0,
            baseMoving: 16.0,
            baseSprinting: 24.0,
            baseCrouching: 6.0,
            baseCrouchMoving: 10.0,
            baseAiming: 8.0,
            maxAimSpread: 18.0,
            aimShotKick: 0.5,
            maxSpread: 35.0,
            fireSpreadRate: 15.0,
            firePerShotKick: 0.6,
            recoverySpeed: 18.0
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
            <div class="title-header-group">
                <div class="game-logo">URBAN BREACH</div>
                <div class="game-subtitle">TACTICAL SPECIAL OPS SURVIVAL</div>
                
                <!-- Premium Creator Credit Badge in Good-Looking Prime Position -->
                <div class="creator-badge">
                    <span class="creator-icon">⚡</span>
                    <span class="creator-label">MADE BY</span>
                    <span class="creator-name">RAPHAEL DSOUZA</span>
                    <span class="creator-sparkle">✦</span>
                </div>
            </div>

            <div style="display: flex; gap: 14px; justify-content: center; align-items: center; margin-bottom: 20px; flex-wrap: wrap;">
                <button id="btn-to-difficulty" class="btn-primary" style="margin-bottom: 0;">
                    START GAME
                </button>
                <button id="btn-open-achievements" class="btn-secondary" style="font-size: 14px; padding: 14px 22px; border-color: rgba(0, 229, 255, 0.45); color: #00e5ff; background: rgba(0, 229, 255, 0.08); font-weight: 700; letter-spacing: 0.8px;">
                    🏆 ACHIEVEMENTS
                </button>
                <button id="btn-toggle-music" class="btn-secondary" style="font-size: 14px; padding: 14px 20px; border-color: rgba(255, 255, 255, 0.2); color: #cbd5e1; background: rgba(255, 255, 255, 0.05); font-weight: 700; letter-spacing: 0.8px;">
                    🎵 MUSIC: ON
                </button>
            </div>

            <div class="controls-guide">
                <div class="ctrl-row"><span>WASD</span> Move / Ladder Climb</div>
                <div class="ctrl-row"><span>SHIFT</span> Sprint</div>
                <div class="ctrl-row"><span>C / CTRL</span> Crouch (Reduces Spread & Edge Lock)</div>
                <div class="ctrl-row"><span>SPACE</span> Jump / Climb Up</div>
                <div class="ctrl-row"><span>LMB (Hold)</span> Full-Auto Shooting</div>
                <div class="ctrl-row"><span>RMB</span> Aim Down Sights (Pinpoint Optical Zoom)</div>
                <div class="ctrl-row"><span>G</span> Throw Grenade (Bounces on Ground)</div>
                <div class="ctrl-row"><span>M</span> Toggle Background Music On / Off</div>
                <div class="ctrl-row alert-row"><span>RADAR</span> Tracks hostiles, buildings, vehicles, and climbable ladders</div>
            </div>

            <div class="title-footer">
                <span>URBAN BREACH</span>
                <span class="footer-separator">•</span>
                <span>MADE BY <strong class="footer-author">RAPHAEL DSOUZA</strong></span>
                <span class="footer-separator">•</span>
                <span>TACTICAL 3D SURVIVAL</span>
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
            const isLocked = key === 'MINIGUN' && (typeof localStorage === 'undefined' || localStorage.getItem('urban_breach_minigun_unlocked') !== 'true');
            const badgeText = isLocked ? '🔒 BEAT WAVE 50' : `${wep.ammo} RDS`;
            const badgeBg = isLocked ? 'rgba(239, 68, 68, 0.2)' : `${wep.color}22`;
            const badgeBorder = isLocked ? 'rgba(239, 68, 68, 0.4)' : `${wep.color}66`;
            const badgeColor = isLocked ? '#ef4444' : wep.color;

            weaponsHTML += `
                <div class="wep-card ${isSelected}" data-key="${key}" data-locked="${isLocked ? 'true' : 'false'}" style="--accent-color:${wep.color}; ${isLocked ? 'opacity: 0.72;' : ''}">
                    <div class="diff-header">
                        <span class="diff-name">${wep.icon} ${wep.name}</span>
                        <span class="diff-badge" style="background:${badgeBg}; color:${badgeColor}; border:1px solid ${badgeBorder}">${badgeText}</span>
                    </div>
                    <div class="diff-desc">${isLocked ? '⚠️ CLASSIFIED HEAVY ARMAMENT. Survive 50 waves in Urban Breach to unlock and deploy this weapon.' : wep.desc}</div>
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

        // 5. In-Game HUD with Tactical Minimap & Ladder Prompt
        this.hud = document.createElement('div');
        this.hud.id = 'game-hud';
        this.hud.style.display = 'none';
        this.hud.innerHTML = `
            <div class="hud-top-right" style="position: fixed; top: 20px; right: 20px; display: flex; gap: 10px; align-items: center; z-index: 100; pointer-events: auto;">
                <button id="hud-btn-toggle-music" class="btn-secondary" style="font-size: 13px; padding: 6px 12px; border-radius: 6px; border-color: rgba(255,255,255,0.2); color: #cbd5e1; background: rgba(10,15,25,0.7); cursor: pointer;" title="Toggle Music (M)">
                    🎵
                </button>
            </div>

            <div class="hud-top-left">
                <div class="hud-item hud-hp">
                    <span class="hud-icon">❤️</span>
                    <span class="hud-label">HP:</span>
                    <span id="hud-hp-val" class="hud-number">125</span>
                </div>
                <div class="hud-item hud-diff">
                    <span id="hud-diff-badge" class="hud-badge">SURVIVOR</span>
                </div>

                <!-- Biometric Anatomical Skeleton & Bone Fracture Paperdoll -->
                <div id="skeleton-hud-card" class="skeleton-hud-card">
                    <div class="skeleton-paperdoll-wrapper">
                        <svg class="skeleton-svg" viewBox="0 0 100 160" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <radialGradient id="xray-glow" cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stop-color="#00cec9" stop-opacity="0.35"/>
                                    <stop offset="100%" stop-color="#00cec9" stop-opacity="0"/>
                                </radialGradient>
                            </defs>
                            
                            <!-- Ghost Human Body Silhouette Contour -->
                            <path class="body-silhouette" d="
                                M50,4 C42,4 37,9 37,17 C37,23 40,28 44,30
                                C36,33 26,42 22,54 L14,76 L11,96 L15,97 L18,80 L23,66 L25,48
                                L26,76 L23,104 L21,126 L19,148 L25,150 L27,132 L31,108 L34,88
                                L42,88 L46,88 L49,108 L53,132 L55,150 L61,148 L59,126 L57,104
                                L54,76 L55,48 L57,66 L62,80 L65,97 L69,96 L66,76 L58,54
                                C54,42 44,33 36,30 C60,28 63,23 63,17 C63,9 58,4 50,4 Z
                            " />

                            <!-- Background Grid Scan Lines -->
                            <line x1="10" y1="35" x2="90" y2="35" class="scan-grid-line" />
                            <line x1="10" y1="70" x2="90" y2="70" class="scan-grid-line" />
                            <line x1="10" y1="120" x2="90" y2="120" class="scan-grid-line" />

                            <!-- 1. Head / Skull (Cranium, Orbits, Nasal, Cheekbones, Mandible) -->
                            <g id="bone-group-head">
                                <!-- Neurocranium Dome -->
                                <path id="bone-head" class="bone-part bone-skull" d="
                                    M39,16 C39,7.5 44,4 50,4 C56,4 61,7.5 61,16
                                    C61,21.5 58.5,24 56,25.5 L55.5,28 L44.5,28 L44,25.5
                                    C41.5,24 39,21.5 39,16 Z
                                " />
                                <!-- Eye Orbits -->
                                <ellipse cx="45.5" cy="15" rx="3.0" ry="3.6" class="bone-cavity" />
                                <ellipse cx="54.5" cy="15" rx="3.0" ry="3.6" class="bone-cavity" />
                                <!-- Nasal Aperture -->
                                <path d="M50,16.5 L48.4,20.8 L51.6,20.8 Z" class="bone-cavity" />
                                <!-- Zygomatic Arches / Cheekbones & Maxilla Arch -->
                                <path d="M41,18.5 C43,21.5 45,22.5 47,22.5 M59,18.5 C57,21.5 55,22.5 53,22.5" class="bone-accent" />
                                <!-- Articulated Mandible (Jawbone) & Teeth Rows -->
                                <path class="bone-part bone-jaw" d="M44.5,25.5 L44.5,29 C44.5,32 46.8,33 50,33 C53.2,33 55.5,32 55.5,29 L55.5,25.5" />
                                <path d="M46.5,26.5 L53.5,26.5 M46.5,28 L53.5,28 M48,25.5 L48,29 M50,25.5 L50,29 M52,25.5 L52,29" class="bone-accent" />
                                <!-- Branching Skull Fracture Crack -->
                                <path id="crack-head" class="bone-crack" d="M41,10 L47,13 L44,17 L52,20 L48,25 M47,13 L53,12 M44,17 L41,19" />
                            </g>

                            <!-- Cervical Spine (C1 - C7) -->
                            <path class="bone-vertebrae" d="M48.5,30 L51.5,30 M48,32 L52,32 M48,34 L52,34 M47.5,36 L52.5,36" />

                            <!-- 2. Torso (Clavicles, Sternum, Curved Ribcage, Spine & Pelvis) -->
                            <g id="bone-group-torso">
                                <!-- Clavicles (Collarbones) -->
                                <path class="bone-clavicle" d="M50,36 C43,34 37,35 31,38 M50,36 C57,34 63,35 69,38" />
                                <!-- Scapular Shoulder Blades -->
                                <path class="bone-scapula" d="M33,39 L27,45 L32,53 L35,46 Z M67,39 L73,45 L68,53 L65,46 Z" />
                                <!-- Sternum (Breastbone with Manubrium & Xiphoid Process) -->
                                <path class="bone-sternum" d="M48.5,37 L51.5,37 L52.5,43 L51.5,57 L50,60 L48.5,57 L47.5,43 Z" />
                                <!-- Thoracic & Lumbar Segmented Spine -->
                                <path class="bone-vertebrae" d="M48,63 L52,63 M48,66 L52,66 M48,69 L52,69" />
                                <!-- 7 Pairs of Anatomical Curved Costal Ribs -->
                                <path id="bone-torso" class="bone-part bone-ribs" d="
                                    M48.5,39.5 C42,38.5 35,41 31,45 M51.5,39.5 C58,38.5 65,41 69,45
                                    M48.5,43 C40,42 32,45 29,50 M51.5,43 C60,42 68,45 71,50
                                    M48.5,46.5 C39,45.5 30,49 28,55 M51.5,46.5 C61,45.5 70,49 72,55
                                    M48.5,50 C39,49.5 29,53.5 28,60 M51.5,50 C61,49.5 71,53.5 72,60
                                    M48.5,53.5 C40,53.5 31,58.5 30,65 M51.5,53.5 C60,53.5 69,58.5 70,65
                                    M48.5,57 C42,57.5 34,62.5 33,69 M51.5,57 C58,57.5 66,62.5 67,69
                                    M49,60.5 C44,61.5 38,65.5 37,71 M51,60.5 C56,61.5 62,65.5 63,71
                                " />
                                <!-- Pelvic Girdle (Iliac Crests, Sacrum & Pubic Symphysis) -->
                                <path class="bone-pelvis" d="
                                    M47,70 L53,70 L51.5,81 L48.5,81 Z
                                    M47,70 C40,68 32,70 30,76 C28,82 33,86 38,85 C43,84 45,80 46,76 Z
                                    M53,70 C60,68 68,70 70,76 C72,82 67,86 62,85 C57,84 55,80 54,76 Z
                                    M45,83 C48,87 52,87 55,83
                                " />
                                <ellipse cx="38.5" cy="80.5" rx="3.5" ry="3.5" class="bone-cavity" />
                                <ellipse cx="61.5" cy="80.5" rx="3.5" ry="3.5" class="bone-cavity" />
                                <!-- Comminuted Ribs & Spinal Fracture Crack -->
                                <path id="crack-torso" class="bone-crack" d="M33,46 L42,49 L49,48 L57,54 M49,48 L48,57 L52,63 M42,49 L40,56" />
                            </g>

                            <!-- 3. Left Arm (Humerus, Dual Radius/Ulna, Wrist & Hand) -->
                            <g id="bone-group-arm-l">
                                <circle cx="30" cy="39" r="2.2" class="bone-joint" />
                                <path id="bone-arm-l" class="bone-part bone-limb" d="
                                    M30,40 C27,48 23,56 19,65
                                    M18,66 L14,85 M20,67 L16,86
                                    M15,87 L12,95 M14,87 L11,96 M16,87 L14,97 M18,87 L17,95
                                " />
                                <circle cx="19" cy="65.5" r="2" class="bone-joint" />
                                <!-- Arm Fracture Fissure Crack -->
                                <path id="crack-arm-l" class="bone-crack" d="M28,50 L23,53 L26,58 L20,60 M20,73 L16,76 L19,80 L14,83" />
                            </g>

                            <!-- 4. Right Arm (Humerus, Dual Radius/Ulna, Wrist & Hand) -->
                            <g id="bone-group-arm-r">
                                <circle cx="70" cy="39" r="2.2" class="bone-joint" />
                                <path id="bone-arm-r" class="bone-part bone-limb" d="
                                    M70,40 C73,48 77,56 81,65
                                    M82,66 L86,85 M80,67 L84,86
                                    M85,87 L88,95 M86,87 L89,96 M84,87 L86,97 M82,87 L83,95
                                " />
                                <circle cx="81" cy="65.5" r="2" class="bone-joint" />
                                <!-- Arm Fracture Fissure Crack -->
                                <path id="crack-arm-r" class="bone-crack" d="M72,50 L77,53 L74,58 L80,60 M80,73 L84,76 L81,80 L86,83" />
                            </g>

                            <!-- 5. Left Leg (Femur, Trochanter, Patella, Tibia/Fibula, Foot) -->
                            <g id="bone-group-leg-l">
                                <circle cx="36" cy="84" r="2.4" class="bone-joint" />
                                <path id="bone-leg-l" class="bone-part bone-limb" d="
                                    M36,85 C33,96 31,108 31,119
                                    M30,124 L26,148 M27,126 L23,147
                                    M25,149 L21,157 L18,158 M25,149 L23,158
                                " />
                                <ellipse cx="31" cy="120.5" rx="2.5" ry="2.5" class="bone-patella" />
                                <!-- Femur / Tibia Compound Fracture Crack -->
                                <path id="crack-leg-l" class="bone-crack" d="M36,98 L30,102 L34,108 L28,112 M29,133 L24,137 L28,141 L23,145" />
                            </g>

                            <!-- 6. Right Leg (Femur, Trochanter, Patella, Tibia/Fibula, Foot) -->
                            <g id="bone-group-leg-r">
                                <circle cx="64" cy="84" r="2.4" class="bone-joint" />
                                <path id="bone-leg-r" class="bone-part bone-limb" d="
                                    M64,85 C67,96 69,108 69,119
                                    M70,124 L74,148 M73,126 L77,147
                                    M75,149 L79,157 L82,158 M75,149 L77,158
                                " />
                                <ellipse cx="69" cy="120.5" rx="2.5" ry="2.5" class="bone-patella" />
                                <!-- Femur / Tibia Compound Fracture Crack -->
                                <path id="crack-leg-r" class="bone-crack" d="M64,98 L70,102 L66,108 L72,112 M71,133 L76,137 L72,141 L77,145" />
                            </g>
                        </svg>
                        <div id="skeleton-wounds-layer" class="wounds-layer"></div>
                    </div>
                    <div class="skeleton-info-col">
                        <div class="skeleton-header-row">
                            <span>BIOMETRICS</span>
                            <span id="skeleton-status-badge" class="skeleton-status-tag">OPTIMAL</span>
                        </div>
                        <div class="skeleton-ecg-container">
                            <svg class="skeleton-ecg-svg" viewBox="0 0 100 20">
                                <path class="ecg-line" d="M0,10 L25,10 L30,3 L35,17 L40,6 L45,14 L50,10 L75,10 L80,3 L85,17 L90,6 L95,14 L100,10" />
                            </svg>
                        </div>
                        <div class="skeleton-vitals-row">
                            <span class="vital-item">PULSE: <b id="vital-pulse">76</b> BPM</span>
                            <span class="vital-item">O₂: <b id="vital-o2">99%</b></span>
                        </div>
                        <div id="skeleton-debuff-list" class="skeleton-debuff-list"></div>
                    </div>
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

            <!-- Top-Center Boss Health Bar HUD -->
            <div id="hud-boss-container" class="hud-boss-container" style="display:none;">
                <div class="hud-boss-header">
                    <span class="hud-boss-icon">💀</span>
                    <span id="hud-boss-title" class="hud-boss-title">JUGGERNAUT MACHINE GUNNER</span>
                    <span id="hud-boss-wave-badge" class="hud-boss-badge">WAVE 5 BOSS</span>
                    <span id="hud-boss-hp-text" class="hud-boss-hp-text">350 / 350 HP</span>
                </div>
                <div class="hud-boss-bar-bg">
                    <div id="hud-boss-bar-fill" class="hud-boss-bar-fill" style="width: 100%;"></div>
                    <div id="hud-boss-bar-pulse" class="hud-boss-bar-pulse"></div>
                </div>
            </div>

            <!-- Stealth, Ladder, Crouch & Oxygen prompts -->
            <div id="hud-stealth-prompt" class="hud-stealth-prompt" style="display:none;">
                🌿 <span>STEALTH</span> HIDDEN IN FOLIAGE
            </div>
            <div id="hud-ladder-prompt" class="hud-ladder-prompt" style="display:none;">
                🧗 <span>[W]</span> CLIMB UP &nbsp;|&nbsp; <span>[S]</span> CLIMB DOWN
            </div>
            <div id="hud-crouch-prompt" class="hud-crouch-prompt" style="display:none;">
                🛡️ <span>CROUCH</span> STEADY AIM & EDGE LOCK
            </div>

            <!-- Swimming Oxygen & Suffocation Gauge -->
            <div id="hud-oxygen-container" class="hud-oxygen-container" style="display:none;">
                <div class="hud-oxygen-header">
                    <span class="hud-oxygen-icon">🫧</span>
                    <span class="hud-oxygen-label">OXYGEN</span>
                    <span id="hud-oxygen-val" class="hud-oxygen-val">100%</span>
                </div>
                <div class="hud-oxygen-bar-bg">
                    <div id="hud-oxygen-bar-fill" class="hud-oxygen-bar-fill" style="width: 100%;"></div>
                </div>
            </div>

            <div class="hud-bottom-right">
                <!-- Tactical Topographic Minimap Canvas -->
                <div class="minimap-wrapper">
                    <canvas id="radar-canvas"></canvas>
                    <div class="minimap-header">
                        <span class="minimap-title">GPS MINIMAP</span>
                        <span class="minimap-sub">TACTICAL OPS</span>
                    </div>
                </div>

                <!-- Weapon & Ammo Card -->
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
                    <div id="hud-minigun-heat-row" style="display:none; margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.08);">
                        <div style="display:flex; justify-content:space-between; font-size: 10px; font-weight:800; color: #94a3b8; letter-spacing: 0.5px; margin-bottom: 3px;">
                            <span>🔥 BARREL TEMP</span>
                            <span id="hud-minigun-heat-pct" style="color: #00e5ff;">0%</span>
                        </div>
                        <div style="width: 100%; height: 5px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow:hidden;">
                            <div id="hud-minigun-heat-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #00e5ff, #f59e0b, #ef4444); transition: width 0.08s linear;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        this.uiRoot.appendChild(this.hud);

        // Chat Panel on the Bottom Left (Attached to document.body above WebGL)
        this.chatPanel = document.getElementById('chat-box');
        if (!this.chatPanel) {
            this.chatPanel = document.createElement('div');
            this.chatPanel.id = 'chat-box';
            this.chatPanel.className = 'hud-chat-panel';
            this.chatPanel.style.display = 'flex'; // Always visible
            this.chatPanel.innerHTML = `
                <div id="chat-log" class="hud-chat-log"></div>
                <input id="chat-input" class="hud-chat-input" placeholder="Press ENTER or T to chat..." maxlength="100" autocomplete="off" style="display:none;" />
            `;
            document.body.appendChild(this.chatPanel);
        }

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

        // 6b. Underwater Visual Screen Overlay
        this.underwaterOverlay = document.createElement('div');
        this.underwaterOverlay.id = 'underwater-overlay';
        this.underwaterOverlay.className = 'underwater-screen-overlay';
        this.underwaterOverlay.style.display = 'none';
        this.uiRoot.appendChild(this.underwaterOverlay);

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

        // 7b. Wave 50 Victory Screen & Minigun Unlock
        this.victoryScreen = document.createElement('div');
        this.victoryScreen.id = 'victory-screen';
        this.victoryScreen.className = 'screen-overlay';
        this.victoryScreen.style.display = 'none';
        this.victoryScreen.innerHTML = `
            <div class="game-logo" style="color: #f1c40f; text-shadow: 0 0 35px rgba(241, 196, 15, 0.7); font-size: 38px;">
                👑 TOTAL VICTORY ACHIEVED!
            </div>
            <div class="game-subtitle" style="color: #00e5ff; letter-spacing: 2px; font-size: 16px; margin-bottom: 16px;">
                URBAN BREACH LIBERATED — WAVE 50 CONQUERED!
            </div>

            <div style="max-width: 580px; margin: 0 auto 20px auto; color: #e2e8f0; font-size: 15px; line-height: 1.6; text-align: center; background: rgba(0, 229, 255, 0.06); border: 1px solid rgba(0, 229, 255, 0.25); border-radius: 10px; padding: 14px 20px;">
                Against impossible tactical odds, you held the urban frontline for 50 waves! As reward for your supreme defense, the <strong>M134 VULCAN MINIGUN</strong> (100-round capacity, high-speed rotary fire) is now permanently unlocked in your arsenal!
            </div>

            <div class="game-over-stats" style="border-color: rgba(241, 196, 15, 0.45); box-shadow: 0 0 30px rgba(241, 196, 15, 0.25); margin-bottom: 24px;">
                <div class="go-stat">DIFFICULTY: <span id="vic-diff" style="color:#00e5ff">NORMAL</span></div>
                <div class="go-stat">WAVES CONQUERED: <span id="vic-waves" style="color:#ffd700; font-weight: 800;">50 / 50</span></div>
                <div class="go-stat">TOTAL HOSTILES PURGED: <span id="vic-kills" style="color:#ff4757; font-weight: 800;">0</span></div>
            </div>

            <div style="display: flex; gap: 16px; justify-content: center; align-items: center; flex-wrap: wrap;">
                <button id="btn-vic-restart" class="btn-primary" style="background: linear-gradient(135deg, #f1c40f, #e67e22); color: #000; font-weight: 800; padding: 14px 28px;">
                    DEPLOY AGAIN
                </button>
                <button id="btn-vic-achievements" class="btn-secondary" style="border-color: rgba(0, 229, 255, 0.5); color: #00e5ff; font-weight: 700; padding: 14px 24px;">
                    🏆 VIEW ACHIEVEMENTS
                </button>
            </div>
        `;
        this.uiRoot.appendChild(this.victoryScreen);

        // 8. Connection Environment Modal
        this.envModal = document.createElement('div');
        this.envModal.id = 'mp-env-modal';
        this.envModal.className = 'env-modal-overlay';
        this.envModal.style.display = 'none';
        this.envModal.innerHTML = `
            <div class="env-modal-content">
                <button class="env-modal-close" id="btn-close-env-modal">×</button>
                <div class="env-modal-logo">MULTIPLAYER CONNECT</div>
                <div class="env-modal-subtitle">Select Connection Protocol</div>
                
                <!-- Screen 1: Environment Options -->
                <div id="env-selector-view">
                    <div class="env-options-grid">
                        <div class="env-card" id="env-card-home">
                            <div class="env-card-icon">🏠</div>
                            <h3>HOME MODE</h3>
                            <p>Connect via online lobby matchmaking servers. Suitable for residential or unblocked networks.</p>
                        </div>
                        <div class="env-card" id="env-card-school">
                            <div class="env-card-icon">🏫</div>
                            <h3>SCHOOL MODE</h3>
                            <p>Connect directly peer-to-peer using SDP descriptions. Suitable for school or highly restricted networks.</p>
                        </div>
                    </div>
                </div>

                <!-- Screen 2: WebRTC Workspace -->
                <div id="webrtc-workspace-view" class="webrtc-workspace">
                    <div class="webrtc-info-tooltip">
                        <strong>⚠️ Why are codes so long?</strong> Without a central signaling server to match players and negotiate addresses, players must manually exchange full Session Description Protocol (SDP) details. An SDP contains routing details, ICE candidates, and security keys, which cannot be compressed into a short 4-6 digit code.
                    </div>

                    <div style="display: flex; gap: 16px; margin-bottom: 8px;">
                        <div class="webrtc-form-row" style="flex: 1;">
                            <label style="font-size: 12px; font-weight: 800; color: #cbd5e1;">NICKNAME</label>
                            <input type="text" id="webrtc-nickname" class="lobby-input" style="padding: 8px; font-size:13px;" value="Operator-${Math.floor(100 + Math.random() * 900)}" maxlength="14" />
                        </div>
                        <div class="webrtc-form-row" style="flex: 1;">
                            <label style="font-size: 12px; font-weight: 800; color: #cbd5e1;">GAME MODE</label>
                            <select id="webrtc-gamemode" class="lobby-input" style="padding: 8px; font-size:13px; height: 35px; background: rgba(10, 18, 28, 0.95); color: #fff; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 4px;">
                                <option value="pve">PVE CO-OP</option>
                                <option value="ffa">FFA PVP</option>
                            </select>
                        </div>
                    </div>

                    <div class="webrtc-role-select">
                        <button id="btn-webrtc-host-mode" class="btn-primary" style="font-size: 13px; padding: 8px 16px;">HOST A MATCH</button>
                        <button id="btn-webrtc-join-mode" class="btn-primary" style="font-size: 13px; padding: 8px 16px;">JOIN A MATCH</button>
                    </div>

                    <!-- Host Section -->
                    <div id="webrtc-host-section" style="display: none; flex-direction: column; gap: 12px;">
                        <div class="webrtc-form-row">
                            <div class="webrtc-header-row">
                                <label style="font-size: 12px; font-weight: 800; color: #00e5ff; margin: 0;">1. YOUR OFFER CODE (SEND TO CLIENT)</label>
                                <button id="btn-webrtc-copy-offer" class="webrtc-copy-btn">COPY CODE</button>
                            </div>
                            <textarea id="webrtc-host-offer" class="webrtc-textarea" readonly placeholder="Generating code..."></textarea>
                        </div>
                        <div class="webrtc-form-row">
                            <label style="font-size: 12px; font-weight: 800; color: #cbd5e1; margin-bottom: 4px;">2. PASTE CLIENT'S ANSWER CODE</label>
                            <textarea id="webrtc-host-answer" class="webrtc-textarea" placeholder="Paste the Base64 answer code here..."></textarea>
                        </div>
                        <button id="btn-webrtc-apply-answer" class="btn-primary" style="font-size: 14px; padding: 10px; width: 100%;">ESTABLISH CONNECTION</button>
                    </div>
 
                    <!-- Client Section -->
                    <div id="webrtc-client-section" style="display: none; flex-direction: column; gap: 12px;">
                        <div class="webrtc-form-row">
                            <label style="font-size: 12px; font-weight: 800; color: #cbd5e1; margin-bottom: 4px;">1. PASTE HOST'S OFFER CODE</label>
                            <textarea id="webrtc-client-offer" class="webrtc-textarea" placeholder="Paste the Base64 offer code here..."></textarea>
                        </div>
                        <button id="btn-webrtc-import-offer" class="btn-primary" style="font-size: 14px; padding: 10px; width: 100%;">IMPORT OFFER & GENERATE ANSWER</button>
                        <div class="webrtc-form-row" id="webrtc-client-answer-row" style="display: none;">
                            <div class="webrtc-header-row">
                                <label style="font-size: 12px; font-weight: 800; color: #00e5ff; margin: 0;">2. YOUR ANSWER CODE (SEND TO HOST)</label>
                                <button id="btn-webrtc-copy-answer" class="webrtc-copy-btn">COPY CODE</button>
                            </div>
                            <textarea id="webrtc-client-answer" class="webrtc-textarea" readonly placeholder="Generating answer..."></textarea>
                        </div>
                    </div>
                    </div>

                    <div id="webrtc-status" class="webrtc-status-banner">STATUS: IDLE</div>
                    
                    <button id="btn-webrtc-back" class="btn-secondary" style="font-size: 12px; padding: 6px 12px; align-self: flex-start;">← BACK</button>
                </div>
            </div>
        `;
        this.uiRoot.appendChild(this.envModal);

        // Initialize Radar
        const radarCanvas = document.getElementById('radar-canvas');
        if (radarCanvas) {
            this.radar = new TacticalRadar(radarCanvas, 130);
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

        const btnOpenAchieve = document.getElementById('btn-open-achievements');
        if (btnOpenAchieve) {
            btnOpenAchieve.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                achievementManager.openModal();
            };
        }

        const updateMusicButtonsUI = (isMuted) => {
            const titleBtn = document.getElementById('btn-toggle-music');
            if (titleBtn) {
                titleBtn.innerHTML = isMuted ? '🔇 MUSIC: OFF' : '🎵 MUSIC: ON';
                titleBtn.style.color = isMuted ? '#ef4444' : '#00ff88';
                titleBtn.style.borderColor = isMuted ? 'rgba(239, 68, 68, 0.4)' : 'rgba(0, 255, 136, 0.4)';
            }
            const hudBtn = document.getElementById('hud-btn-toggle-music');
            if (hudBtn) {
                hudBtn.innerHTML = isMuted ? '🔇' : '🎵';
                hudBtn.title = isMuted ? 'Turn Music ON (M)' : 'Turn Music OFF (M)';
                hudBtn.style.borderColor = isMuted ? 'rgba(239, 68, 68, 0.4)' : 'rgba(0, 255, 136, 0.4)';
            }
        };
        this.updateMusicButtonsUI = updateMusicButtonsUI;

        const initialMuted = typeof localStorage !== 'undefined' && localStorage.getItem('urban_breach_music_muted') === 'true';
        updateMusicButtonsUI(initialMuted);

        const btnToggleMusic = document.getElementById('btn-toggle-music');
        if (btnToggleMusic) {
            btnToggleMusic.onclick = (e) => {
                e.preventDefault();
                const sEngine = soundEngine || window.soundEngine;
                if (sEngine && typeof sEngine.toggleMusic === 'function') {
                    const enabled = sEngine.toggleMusic(false);
                    updateMusicButtonsUI(!enabled);
                }
            };
        }

        const hudBtnToggleMusic = document.getElementById('hud-btn-toggle-music');
        if (hudBtnToggleMusic) {
            hudBtnToggleMusic.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const sEngine = soundEngine || window.soundEngine;
                if (sEngine && typeof sEngine.toggleMusic === 'function') {
                    const enabled = sEngine.toggleMusic(true);
                    updateMusicButtonsUI(!enabled);
                }
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
                this.showEnvironmentModal();
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
                if (card.dataset.locked === 'true') {
                    if (this.addChatMessage) {
                        this.addChatMessage('HQ', '⚠️ CLASSIFIED ARMAMENT: Survive 50 waves in Urban Breach to unlock the M134 Minigun!');
                    } else {
                        alert('⚠️ LOCKED: Survive 50 waves in Urban Breach to unlock the M134 Vulcan Minigun!');
                    }
                    return;
                }
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

        const btnVicRestart = document.getElementById('btn-vic-restart');
        if (btnVicRestart) {
            btnVicRestart.onclick = () => {
                this.victoryScreen.style.display = 'none';
                if (typeof this.onRestart === 'function') {
                    this.onRestart();
                } else {
                    location.reload();
                }
            };
        }

        const btnVicAchieve = document.getElementById('btn-vic-achievements');
        if (btnVicAchieve) {
            btnVicAchieve.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                achievementManager.openModal();
            };
        }

        // ==================== MANUAL WEBRTC MODAL EVENT BINDINGS ====================
        
        // Close modal button
        const btnCloseEnvModal = document.getElementById('btn-close-env-modal');
        if (btnCloseEnvModal) {
            btnCloseEnvModal.onclick = () => {
                this.envModal.style.display = 'none';
                if (this.currentManualPC) {
                    this.currentManualPC.close();
                    this.currentManualPC = null;
                }
            };
        }

        // Option A: Home (Automatic)
        const cardHome = document.getElementById('env-card-home');
        if (cardHome) {
            cardHome.onclick = () => {
                this.startExistingHomeMultiplayer();
            };
        }

        // Option B: School (Manual Code)
        const cardSchool = document.getElementById('env-card-school');
        const selectorView = document.getElementById('env-selector-view');
        const workspaceView = document.getElementById('webrtc-workspace-view');
        if (cardSchool && selectorView && workspaceView) {
            cardSchool.onclick = () => {
                selectorView.style.display = 'none';
                workspaceView.style.display = 'flex';
                document.getElementById('webrtc-status').textContent = 'STATUS: IDLE';
                document.getElementById('webrtc-status').className = 'webrtc-status-banner';
                document.getElementById('webrtc-host-section').style.display = 'none';
                document.getElementById('webrtc-client-section').style.display = 'none';
            };
        }

        // Back button in workspace
        const btnWebrtcBack = document.getElementById('btn-webrtc-back');
        if (btnWebrtcBack && selectorView && workspaceView) {
            btnWebrtcBack.onclick = () => {
                workspaceView.style.display = 'none';
                selectorView.style.display = 'block';
                if (this.currentManualPC) {
                    this.currentManualPC.close();
                    this.currentManualPC = null;
                }
            };
        }

        // Host section toggle
        const btnHostMode = document.getElementById('btn-webrtc-host-mode');
        const btnJoinMode = document.getElementById('btn-webrtc-join-mode');
        const hostSection = document.getElementById('webrtc-host-section');
        const clientSection = document.getElementById('webrtc-client-section');
        
        if (btnHostMode && btnJoinMode && hostSection && clientSection) {
            btnHostMode.onclick = () => {
                hostSection.style.display = 'flex';
                clientSection.style.display = 'none';
                document.getElementById('webrtc-status').textContent = 'STATUS: GENERATING OFFER (GATHERING ICE)...';
                document.getElementById('webrtc-status').className = 'webrtc-status-banner';
                document.getElementById('webrtc-host-offer').value = '';
                document.getElementById('webrtc-host-answer').value = '';

                if (this.currentManualPC) {
                    try { this.currentManualPC.close(); } catch(e) {}
                }

                this.currentManualPC = startManualHost(
                    (offerCode) => {
                        const offerTex = document.getElementById('webrtc-host-offer');
                        offerTex.value = offerCode;
                        navigator.clipboard.writeText(offerCode).then(() => {
                            document.getElementById('webrtc-status').textContent = 'STATUS: OFFER COPIED! SEND TO CLIENT AND WAIT FOR ANSWER.';
                            document.getElementById('webrtc-status').className = 'webrtc-status-banner';
                        }).catch(() => {
                            document.getElementById('webrtc-status').textContent = 'STATUS: OFFER GENERATED. COPY CODE MANUALLY.';
                            document.getElementById('webrtc-status').className = 'webrtc-status-banner';
                        });
                    },
                    (pc, channel) => {
                        document.getElementById('webrtc-status').textContent = 'STATUS: CONNECTED!';
                        document.getElementById('webrtc-status').className = 'webrtc-status-banner connected';
                        setTimeout(() => {
                            this.envModal.style.display = 'none';
                            const nickname = document.getElementById('webrtc-nickname').value || 'Manual-Host';
                            const gameMode = document.getElementById('webrtc-gamemode').value || 'pve';
                            if (typeof this.onHostLobbyManual === 'function') {
                                this.onHostLobbyManual(nickname, gameMode, pc, channel);
                            }
                        }, 500);
                    }
                );
            };

            btnJoinMode.onclick = () => {
                clientSection.style.display = 'flex';
                hostSection.style.display = 'none';
                document.getElementById('webrtc-status').textContent = 'STATUS: PASTE HOST OFFER TO START';
                document.getElementById('webrtc-status').className = 'webrtc-status-banner';
                document.getElementById('webrtc-client-offer').value = '';
                document.getElementById('webrtc-client-answer').value = '';
                document.getElementById('webrtc-client-answer-row').style.display = 'none';

                if (this.currentManualPC) {
                    try { this.currentManualPC.close(); } catch(e) {}
                    this.currentManualPC = null;
                }
            };
        }

        // Import offer and generate answer
        const btnImportOffer = document.getElementById('btn-webrtc-import-offer');
        if (btnImportOffer) {
            btnImportOffer.onclick = () => {
                const offerCode = document.getElementById('webrtc-client-offer').value.trim();
                if (!offerCode) {
                    alert('Please paste the host offer code!');
                    return;
                }

                document.getElementById('webrtc-status').textContent = 'STATUS: GENERATING ANSWER (GATHERING ICE)...';
                document.getElementById('webrtc-status').className = 'webrtc-status-banner';

                if (this.currentManualPC) {
                    try { this.currentManualPC.close(); } catch(e) {}
                }

                this.currentManualPC = startManualClient(
                    offerCode,
                    (answerCode) => {
                        document.getElementById('webrtc-client-answer-row').style.display = 'flex';
                        const answerTex = document.getElementById('webrtc-client-answer');
                        answerTex.value = answerCode;
                        navigator.clipboard.writeText(answerCode).then(() => {
                            document.getElementById('webrtc-status').textContent = 'STATUS: ANSWER COPIED! SEND TO HOST TO CONNECT.';
                            document.getElementById('webrtc-status').className = 'webrtc-status-banner';
                        }).catch(() => {
                            document.getElementById('webrtc-status').textContent = 'STATUS: ANSWER GENERATED. COPY CODE MANUALLY.';
                            document.getElementById('webrtc-status').className = 'webrtc-status-banner';
                        });
                    },
                    (pc, channel) => {
                        document.getElementById('webrtc-status').textContent = 'STATUS: CONNECTED!';
                        document.getElementById('webrtc-status').className = 'webrtc-status-banner connected';
                        setTimeout(() => {
                            this.envModal.style.display = 'none';
                            const nickname = document.getElementById('webrtc-nickname').value || 'Manual-Client';
                            if (typeof this.onJoinLobbyManual === 'function') {
                                this.onJoinLobbyManual(nickname, pc, channel);
                            }
                        }, 500);
                    }
                );
            };
        }

        // Apply Answer
        const btnApplyAnswer = document.getElementById('btn-webrtc-apply-answer');
        if (btnApplyAnswer) {
            btnApplyAnswer.onclick = () => {
                const answerCode = document.getElementById('webrtc-host-answer').value.trim();
                if (!answerCode) {
                    alert('Please paste the client answer code!');
                    return;
                }

                if (!this.currentManualPC) {
                    alert('No host peer connection active! Click "Host a Match" first.');
                    return;
                }

                document.getElementById('webrtc-status').textContent = 'STATUS: APPLYING ANSWER...';
                document.getElementById('webrtc-status').className = 'webrtc-status-banner';
                applyManualAnswer(this.currentManualPC, answerCode);
            };
        }

        // Copy Offer button
        const btnCopyOffer = document.getElementById('btn-webrtc-copy-offer');
        if (btnCopyOffer) {
            btnCopyOffer.onclick = () => {
                const offerVal = document.getElementById('webrtc-host-offer').value;
                if (offerVal) {
                    navigator.clipboard.writeText(offerVal).then(() => {
                        btnCopyOffer.textContent = 'COPIED!';
                        setTimeout(() => btnCopyOffer.textContent = 'COPY', 1500);
                    });
                }
            };
        }

        // Copy Answer button
        const btnCopyAnswer = document.getElementById('btn-webrtc-copy-answer');
        if (btnCopyAnswer) {
            btnCopyAnswer.onclick = () => {
                const answerVal = document.getElementById('webrtc-client-answer').value;
                if (answerVal) {
                    navigator.clipboard.writeText(answerVal).then(() => {
                        btnCopyAnswer.textContent = 'COPIED!';
                        setTimeout(() => btnCopyAnswer.textContent = 'COPY', 1500);
                    });
                }
            };
        }
    }

    showEnvironmentModal() {
        this.envModal.style.display = 'flex';
        document.getElementById('env-selector-view').style.display = 'block';
        document.getElementById('webrtc-workspace-view').style.display = 'none';
        if (this.currentManualPC) {
            try { this.currentManualPC.close(); } catch(e) {}
            this.currentManualPC = null;
        }
    }

    startExistingHomeMultiplayer() {
        this.lobbySelectScreen.style.display = 'none';
        this.lobbyScreen.style.display = 'flex';
        this.isMultiplayerMode = true;
        this.envModal.style.display = 'none';
    }

    updateCrosshair(crosshairData, aiming, weaponKey) {
        if (aiming) {
            this.crosshair.style.opacity = '0';
            if (weaponKey === 'SNIPER') {
                this.scope.style.display = 'block';
            } else {
                this.scope.style.display = 'none';
            }
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
            this.chatPanel.style.display = 'flex';
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
        weapon = null,
        oxygen = 100,
        isSubmerged = false,
        inWater = false,
        bodyBones = null,
        bulletWounds = null,
        isBleeding = false
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

        // Oxygen / Breath Meter UI
        const oxyContainer = document.getElementById('hud-oxygen-container');
        const oxyValEl = document.getElementById('hud-oxygen-val');
        const oxyFillEl = document.getElementById('hud-oxygen-bar-fill');
        const underOverlay = document.getElementById('underwater-overlay');

        if (oxyContainer && oxyFillEl && oxyValEl) {
            if (inWater || oxygen < 99.5) {
                oxyContainer.style.display = 'flex';
                const pct = Math.max(0, Math.min(100, Math.round(oxygen)));
                oxyValEl.textContent = `${pct}%`;
                oxyFillEl.style.width = `${pct}%`;
                if (pct <= 25) {
                    oxyValEl.style.color = '#ff3344';
                    oxyFillEl.style.background = '#ff3344';
                } else {
                    oxyValEl.style.color = '#00cec9';
                    oxyFillEl.style.background = 'linear-gradient(90deg, #0984e3, #00cec9)';
                }
            } else {
                oxyContainer.style.display = 'none';
            }
        }

        if (underOverlay) {
            underOverlay.style.display = isSubmerged ? 'block' : 'none';
        }

        if (difficulty) {
            const diffBadge = document.getElementById('hud-diff-badge');
            if (diffBadge) {
                diffBadge.textContent = difficulty.name;
                diffBadge.style.color = difficulty.color;
                diffBadge.style.borderColor = difficulty.color;
            }
        }

        // Weapon & Ammo UI
        if (wepNameEl && weapon) {
            wepNameEl.textContent = weapon.name;
        }

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

        // Minigun Overheat Bar
        const heatRowEl = document.getElementById('hud-minigun-heat-row');
        const heatValEl = document.getElementById('hud-minigun-heat-pct');
        const heatFillEl = document.getElementById('hud-minigun-heat-bar');
        if (heatRowEl) {
            if (weapon && weapon.id === 'MINIGUN') {
                heatRowEl.style.display = 'block';
                const heatPct = Math.min(100, Math.round((state.minigunHeat || 0) * 100));
                if (heatValEl) {
                    heatValEl.textContent = `${heatPct}%`;
                    heatValEl.style.color = heatPct > 75 ? '#ff3344' : (heatPct > 45 ? '#f59e0b' : '#00e5ff');
                }
                if (heatFillEl) heatFillEl.style.width = `${heatPct}%`;
            } else {
                heatRowEl.style.display = 'none';
            }
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

        // Biometric Anatomical Skeleton & Bone Fracture UI
        const boneHeadEl = document.getElementById('bone-head');
        const boneTorsoEl = document.getElementById('bone-torso');
        const boneArmLEl = document.getElementById('bone-arm-l');
        const boneArmREl = document.getElementById('bone-arm-r');
        const boneLegLEl = document.getElementById('bone-leg-l');
        const boneLegREl = document.getElementById('bone-leg-r');

        const crackHeadEl = document.getElementById('crack-head');
        const crackTorsoEl = document.getElementById('crack-torso');
        const crackArmLEl = document.getElementById('crack-arm-l');
        const crackArmREl = document.getElementById('crack-arm-r');
        const crackLegLEl = document.getElementById('crack-leg-l');
        const crackLegREl = document.getElementById('crack-leg-r');

        const woundsLayer = document.getElementById('skeleton-wounds-layer');
        const skeletonCard = document.getElementById('skeleton-hud-card');
        const statusBadge = document.getElementById('skeleton-status-badge');
        const debuffListEl = document.getElementById('skeleton-debuff-list');

        if (bodyBones) {
            if (boneHeadEl) boneHeadEl.classList.toggle('bone-fractured', !!bodyBones.head);
            if (boneTorsoEl) boneTorsoEl.classList.toggle('bone-fractured', !!bodyBones.torso);
            if (boneArmLEl) boneArmLEl.classList.toggle('bone-fractured', !!bodyBones.leftArm);
            if (boneArmREl) boneArmREl.classList.toggle('bone-fractured', !!bodyBones.rightArm);
            if (boneLegLEl) boneLegLEl.classList.toggle('bone-fractured', !!bodyBones.leftLeg);
            if (boneLegREl) boneLegREl.classList.toggle('bone-fractured', !!bodyBones.rightLeg);

            if (crackHeadEl) crackHeadEl.classList.toggle('crack-visible', !!bodyBones.head);
            if (crackTorsoEl) crackTorsoEl.classList.toggle('crack-visible', !!bodyBones.torso);
            if (crackArmLEl) crackArmLEl.classList.toggle('crack-visible', !!bodyBones.leftArm);
            if (crackArmREl) crackArmREl.classList.toggle('crack-visible', !!bodyBones.rightArm);
            if (crackLegLEl) crackLegLEl.classList.toggle('crack-visible', !!bodyBones.leftLeg);
            if (crackLegREl) crackLegREl.classList.toggle('crack-visible', !!bodyBones.rightLeg);
        }

        let totalWounds = 0;
        if (bulletWounds) {
            for (const zone in bulletWounds) {
                totalWounds += (bulletWounds[zone] || 0);
            }
        }

        // Render Bullet Wound Markers
        if (woundsLayer && bulletWounds) {
            const woundPos = {
                head: [ { top: '12%', left: '50%' } ],
                torso: [ { top: '34%', left: '50%' }, { top: '42%', left: '44%' }, { top: '38%', left: '58%' } ],
                leftArm: [ { top: '38%', left: '22%' }, { top: '50%', left: '16%' } ],
                rightArm: [ { top: '38%', left: '78%' }, { top: '50%', left: '84%' } ],
                leftLeg: [ { top: '65%', left: '32%' }, { top: '82%', left: '26%' } ],
                rightLeg: [ { top: '65%', left: '68%' }, { top: '82%', left: '74%' } ]
            };

            let woundHtml = '';
            for (const zone in bulletWounds) {
                const count = bulletWounds[zone] || 0;
                const positions = woundPos[zone] || [{ top: '50%', left: '50%' }];
                for (let i = 0; i < Math.min(count, positions.length); i++) {
                    const pos = positions[i];
                    woundHtml += `<div class="bullet-wound-marker" style="top:${pos.top}; left:${pos.left};"></div>`;
                }
            }
            woundsLayer.innerHTML = woundHtml;
        }

        // Generate Debuffs & Status Badges
        const debuffs = [];
        const hasFractures = !!(bodyBones && (bodyBones.head || bodyBones.torso || bodyBones.leftArm || bodyBones.rightArm || bodyBones.leftLeg || bodyBones.rightLeg));

        if (bodyBones) {
            if (bodyBones.head) debuffs.push('⚡ CRANIAL FRACTURE (+40% SWAY)');
            if (bodyBones.torso) debuffs.push('⚡ RIBS CRACKED (-50% BREATH)');
            if (bodyBones.leftArm || bodyBones.rightArm) debuffs.push('⚡ ARM FRACTURED (+50% RELOAD)');
            if (bodyBones.leftLeg || bodyBones.rightLeg) debuffs.push('⚡ LEG FRACTURED (-35% SPD)');
        }
        if (isBleeding || totalWounds > 0) {
            debuffs.push(`🩸 BLEEDING (${totalWounds} WOUND${totalWounds > 1 ? 'S' : ''})`);
        }

        // Dynamic ECG Pulse and Vitals
        const pulseEl = document.getElementById('vital-pulse');
        const o2El = document.getElementById('vital-o2');
        if (pulseEl) {
            let bpm = 74;
            if (isBleeding) bpm += 35;
            if (hasFractures) bpm += 25;
            if (totalWounds > 0) bpm += totalWounds * 8;
            pulseEl.textContent = `${Math.min(175, bpm)}`;
            pulseEl.style.color = (hasFractures || isBleeding) ? '#ff4757' : '#00e5ff';
        }
        if (o2El) {
            const oxyVal = isBleeding ? Math.max(70, 99 - totalWounds * 7) : 99;
            o2El.textContent = `${oxyVal}%`;
            o2El.style.color = oxyVal < 85 ? '#ff4757' : '#00cec9';
        }

        if (skeletonCard) {
            skeletonCard.classList.toggle('has-critical-fracture', hasFractures || isBleeding);
        }
        if (statusBadge) {
            if (hasFractures || isBleeding) {
                statusBadge.textContent = isBleeding ? 'BLEEDING' : 'FRACTURED';
                statusBadge.className = 'skeleton-status-tag status-impaired';
            } else {
                statusBadge.textContent = 'OPTIMAL';
                statusBadge.className = 'skeleton-status-tag';
            }
        }
        if (debuffListEl) {
            debuffListEl.innerHTML = debuffs.map(d => `<div class="skeleton-debuff-item ${d.includes('BLEEDING') ? 'debuff-bleed' : ''}">${d}</div>`).join('');
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

    showBossHP(bossName = 'JUGGERNAUT MACHINE GUNNER', currentHp = 350, maxHp = 350, wave = 5) {
        const bossContainer = document.getElementById('hud-boss-container');
        const titleEl = document.getElementById('hud-boss-title');
        const badgeEl = document.getElementById('hud-boss-wave-badge');
        const textEl = document.getElementById('hud-boss-hp-text');
        const fillEl = document.getElementById('hud-boss-bar-fill');

        if (titleEl) titleEl.textContent = bossName;
        if (badgeEl) badgeEl.textContent = `WAVE ${wave} BOSS`;
        if (textEl) textEl.textContent = `${Math.max(0, Math.round(currentHp))} / ${Math.round(maxHp)} HP`;
        if (fillEl) {
            const pct = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
            fillEl.style.width = `${pct}%`;
            fillEl.style.background = 'linear-gradient(90deg, #ff1744, #ff5252, #ffb142)';
        }
        if (bossContainer) {
            bossContainer.style.display = 'flex';
            bossContainer.classList.remove('boss-defeated');
        }
    }

    updateBossHP(currentHp, maxHp) {
        const bossContainer = document.getElementById('hud-boss-container');
        const textEl = document.getElementById('hud-boss-hp-text');
        const fillEl = document.getElementById('hud-boss-bar-fill');

        if (bossContainer && bossContainer.style.display !== 'none') {
            const pct = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
            if (textEl) textEl.textContent = `${Math.max(0, Math.round(currentHp))} / ${Math.round(maxHp)} HP`;
            if (fillEl) fillEl.style.width = `${pct}%`;

            if (currentHp <= 0) {
                this.hideBossHP(true);
            }
        }
    }

    hideBossHP(isVictory = false) {
        const bossContainer = document.getElementById('hud-boss-container');
        const textEl = document.getElementById('hud-boss-hp-text');
        const fillEl = document.getElementById('hud-boss-bar-fill');

        if (bossContainer) {
            if (isVictory) {
                if (textEl) textEl.textContent = 'BOSS DEFEATED!';
                if (fillEl) {
                    fillEl.style.width = '0%';
                    fillEl.style.background = '#2ed573';
                }
                bossContainer.classList.add('boss-defeated');
                setTimeout(() => {
                    bossContainer.style.display = 'none';
                    bossContainer.classList.remove('boss-defeated');
                }, 2400);
            } else {
                bossContainer.style.display = 'none';
            }
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

    showVictoryScreen({ kills, wave = 50, difficulty }) {
        this.hud.style.display = 'none';
        this.crosshair.style.display = 'none';
        this.scope.style.display = 'none';

        if (typeof document !== 'undefined' && document.pointerLockElement) {
            document.exitPointerLock();
        }

        // Permanently unlock Minigun on wave 50 win
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem('urban_breach_minigun_unlocked', 'true');
            } catch (e) {}
        }
        this.unlockMinigunUI();

        const vicDiff = document.getElementById('vic-diff');
        if (vicDiff && difficulty) {
            vicDiff.textContent = difficulty.name;
            vicDiff.style.color = difficulty.color;
        }

        const vicWaves = document.getElementById('vic-waves');
        if (vicWaves) vicWaves.textContent = `${wave} / 50`;

        const vicKills = document.getElementById('vic-kills');
        if (vicKills) vicKills.textContent = kills;

        this.victoryScreen.style.display = 'flex';
    }

    unlockMinigunUI() {
        const minigunCard = this.difficultyScreen?.querySelector('.wep-card[data-key="MINIGUN"]');
        if (minigunCard) {
            minigunCard.dataset.locked = 'false';
            minigunCard.style.opacity = '1';
            const badge = minigunCard.querySelector('.diff-badge');
            if (badge) {
                badge.textContent = '100 RDS';
                badge.style.background = 'rgba(16, 185, 129, 0.2)';
                badge.style.color = '#10b981';
                badge.style.borderColor = 'rgba(16, 185, 129, 0.5)';
            }
            const desc = minigunCard.querySelector('.diff-desc');
            if (desc && WEAPON_CONFIGS.MINIGUN) {
                desc.textContent = WEAPON_CONFIGS.MINIGUN.desc;
            }
        }
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
