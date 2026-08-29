import * as THREE from 'three';
import { soundEngine } from './audio.js';
import { EnemyManager } from './enemies.js';

export class MultiplayerManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.isMultiplayer = false;
        this.isHost = false;
        this.peer = null;
        this.roomCode = '';
        this.localNickname = 'Player';
        this.gameMode = 'pve'; // 'ffa' or 'pve'
        this.maxPlayers = 5;

        // Connections mapping
        this.connections = {}; // peerId -> DataConnection (Host only)
        this.hostConnection = null; // DataConnection (Client only)

        // Player states
        this.players = {}; // peerId -> player state data (including local)
        this.remotePlayers = {}; // peerId -> { mesh, targetPos, targetYaw, targetPitch, nameplate, name, health, kills, targetAiming, targetCrouching }

        // Local kills count
        this.localKills = 0;

        // Shared scene entities (Host mirrors these to clients)
        this.sharedEnemies = {}; // id -> mesh
        this.sharedVehicles = {}; // id -> mesh
        this.sharedMedkits = {}; // id -> mesh

        // Dummy enemy manager to instantiate helper meshes
        this.dummyEnemyManager = new EnemyManager(scene);

        // Network update throttling
        this.lastStateSend = 0;
        this.sendInterval = 0.045; // ~22 sends per second
    }

    initHost(nickname, gameMode, onReadyCallback) {
        this.isMultiplayer = true;
        this.isHost = true;
        this.localNickname = nickname || 'Host';
        this.gameMode = gameMode || 'pve';
        this.roomCode = 'UB' + Math.floor(1000 + Math.random() * 9000);

        this.players = {
            'host': {
                id: 'host',
                nickname: this.localNickname,
                isHost: true,
                isReady: true,
                pos: { x: 0, y: 1.7, z: 20 },
                yaw: 0,
                pitch: 0,
                weaponKey: 'AK47',
                aiming: false,
                crouching: false,
                health: 100,
                kills: 0
            }
        };

        this.peer = new window.Peer(this.roomCode, {
            host: '0.peerjs.com',
            port: 443,
            secure: true,
            path: '/',
            debug: 2,
            config: {
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            }
        });

        this.peer.on('open', () => {
            console.log(`Hosted lobby with code: ${this.roomCode}`);
            if (window.uiManagerGlobal) {
                window.uiManagerGlobal.showChatPanel(true);
            }
            if (onReadyCallback) onReadyCallback(this.roomCode);
        });

        this.peer.on('connection', conn => {
            const currentPlayersCount = Object.keys(this.connections).length + 1; // +1 for host
            if (currentPlayersCount >= this.maxPlayers) {
                console.log(`Lobby full. Rejecting connection from ${conn.peer}`);
                conn.on('open', () => {
                    conn.send({ type: 'rejected', reason: 'Lobby is full (Max 5 players).' });
                    setTimeout(() => conn.close(), 500);
                });
                return;
            }

            conn.on('open', () => {
                console.log(`Player connected: ${conn.peer}`);
                this.connections[conn.peer] = conn;

                this.players[conn.peer] = {
                    id: conn.peer,
                    nickname: 'Connecting...',
                    isHost: false,
                    isReady: false,
                    pos: { x: 0, y: 1.7, z: 20 },
                    yaw: 0,
                    pitch: 0,
                    weaponKey: 'AK47',
                    aiming: false,
                    crouching: false,
                    health: 100,
                    kills: 0
                };

                this.broadcastLobbyInfo();
            });

            conn.on('data', data => {
                this.handleData(conn.peer, data);
            });

            conn.on('close', () => {
                console.log(`Player disconnected: ${conn.peer}`);
                delete this.connections[conn.peer];
                delete this.players[conn.peer];
                this.removeRemotePlayer(conn.peer);
                this.broadcastLobbyInfo();
            });
        });

        this.peer.on('error', err => {
            console.error('PeerJS Host Error:', err);
            if (err.type === 'unavailable-id') {
                console.log('ID unavailable. Retrying with a new room code...');
                this.initHost(nickname, gameMode, onReadyCallback);
            }
        });
    }

    initClient(code, nickname, onConnectSuccess, onConnectFailed) {
        this.isMultiplayer = true;
        this.isHost = false;
        this.localNickname = nickname || 'Client';
        this.roomCode = code.toUpperCase().trim();

        this.peer = new window.Peer(undefined, {
            host: '0.peerjs.com',
            port: 443,
            secure: true,
            path: '/',
            debug: 2,
            config: {
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            }
        });

        this.peer.on('open', myId => {
            console.log(`Client PeerJS initialized with ID: ${myId}`);
            const conn = this.peer.connect(this.roomCode);
            this.hostConnection = conn;

            conn.on('open', () => {
                console.log('Successfully connected to Host!');
                if (window.uiManagerGlobal) {
                    window.uiManagerGlobal.showChatPanel(true);
                }
                conn.send({ type: 'join', nickname: this.localNickname });
                if (onConnectSuccess) onConnectSuccess();
            });

            conn.on('data', data => {
                this.handleData('host', data);
            });

            conn.on('error', err => {
                console.error('Connection channel error:', err);
                if (onConnectFailed) onConnectFailed('Channel error: ' + (err.message || err));
            });

            conn.on('close', () => {
                console.log('Disconnected from host.');
                if (onConnectFailed) onConnectFailed('Host disconnected.');
            });
        });

        this.peer.on('error', err => {
            console.error('PeerJS Client Error:', err);
            let msg = err.message || 'Connection failed.';
            if (err.type === 'peer-unavailable') {
                msg = 'Room code not found. Make sure the Host is active!';
            }
            if (onConnectFailed) onConnectFailed(msg);
        });
    }

    broadcast(data) {
        if (!this.isHost) return;
        for (const connId in this.connections) {
            this.connections[connId].send(data);
        }
    }

    sendChatMessage(text) {
        if (!this.isMultiplayer) return;
        if (this.isHost) {
            this.broadcast({
                type: 'chat',
                sender: this.localNickname,
                text: text
            });
            if (window.uiManagerGlobal) {
                window.uiManagerGlobal.addChatMessage(this.localNickname, text);
            }
        } else {
            this.sendToHost({
                type: 'chat',
                sender: this.localNickname,
                text: text
            });
        }
    }

    sendToHost(data) {
        if (this.isHost || !this.hostConnection) return;
        this.hostConnection.send(data);
    }

    broadcastLobbyInfo() {
        if (!this.isHost) return;
        const playerList = Object.values(this.players).map(p => ({
            id: p.id,
            nickname: p.nickname,
            isHost: p.isHost,
            isReady: p.isReady
        }));
        this.broadcast({
            type: 'lobby_info',
            players: playerList,
            gameMode: this.gameMode
        });

        // Trigger local callback for Lobby UI refresh
        if (this.onLobbyUpdate) this.onLobbyUpdate(playerList, this.gameMode);
    }

    handleData(senderId, data) {
        if (data.type === 'rejected') {
            console.warn(`Lobby join rejected: ${data.reason}`);
            alert(data.reason);
            return;
        }

        if (data.type === 'join') {
            if (this.isHost) {
                this.players[senderId].nickname = data.nickname;
                this.broadcastLobbyInfo();
            }
        }

        else if (data.type === 'lobby_info') {
            if (!this.isHost) {
                this.gameMode = data.gameMode;
                if (this.onLobbyUpdate) this.onLobbyUpdate(data.players, data.gameMode);
            }
        }

        else if (data.type === 'lobby_next') {
            if (!this.isHost && this.onLobbyNext) {
                this.onLobbyNext();
            }
        }

        else if (data.type === 'difficulty_sync') {
            if (!this.isHost && this.onDifficultySync) {
                this.onDifficultySync(data.difficultyKey);
            }
        }

        else if (data.type === 'game_start') {
            if (!this.isHost && this.onGameStartSync) {
                this.onGameStartSync(data.difficultyKey);
            }
        }

        else if (data.type === 'chat') {
            if (this.isHost) {
                this.broadcast({
                    type: 'chat',
                    sender: data.sender,
                    text: data.text
                });
            }
            if (window.uiManagerGlobal) {
                window.uiManagerGlobal.addChatMessage(data.sender, data.text);
            }
        }

        else if (data.type === 'state') {
            if (this.isHost) {
                // Update client state
                if (this.players[senderId]) {
                    Object.assign(this.players[senderId], data);
                }
            }
        }

        else if (data.type === 'multi_state') {
            if (!this.isHost) {
                // Client updates all players & shared entities
                this.players = data.players;
                this.syncSharedEnemies(data.enemies);
                this.syncSharedVehicles(data.vehicles);
                this.syncSharedMedkits(data.medkits);
                this.syncScores(data.scores);
            }
        }

        else if (data.type === 'shoot') {
            if (this.isHost) {
                // Host broadcasts shooting event to everyone else
                this.broadcast({
                    type: 'shoot_relay',
                    peerId: senderId,
                    origin: data.origin,
                    direction: data.direction,
                    weaponKey: data.weaponKey
                });
                this.spawnRemoteShootEffect(senderId, data.origin, data.direction, data.weaponKey);
            }
        }

        else if (data.type === 'shoot_relay') {
            if (!this.isHost) {
                this.spawnRemoteShootEffect(data.peerId, data.origin, data.direction, data.weaponKey);
            }
        }

        else if (data.type === 'grenade') {
            if (this.isHost) {
                this.broadcast({
                    type: 'grenade_relay',
                    peerId: senderId,
                    pos: data.pos,
                    velocity: data.velocity
                });
                this.spawnRemoteGrenade(senderId, data.pos, data.velocity);
            }
        }

        else if (data.type === 'grenade_relay') {
            if (!this.isHost) {
                this.spawnRemoteGrenade(data.peerId, data.pos, data.velocity);
            }
        }

        else if (data.type === 'hit_player') {
            if (this.isHost) {
                // Apply PvP damage
                const target = data.targetPeerId;
                const damage = data.damage;
                if (target === 'host') {
                    if (this.gameMode === 'ffa') {
                        if (typeof window.damagePlayerLocal === 'function') {
                            window.damagePlayerLocal(damage, 'pvp');
                        }
                    }
                } else if (this.connections[target]) {
                    this.connections[target].send({
                        type: 'damage_taken',
                        amount: damage,
                        source: 'pvp'
                    });
                }
            }
        }

        else if (data.type === 'damage_taken') {
            if (!this.isHost) {
                if (typeof window.damagePlayerLocal === 'function') {
                    window.damagePlayerLocal(data.amount, data.source);
                }
            }
        }

        else if (data.type === 'hit_enemy') {
            if (this.isHost) {
                if (typeof window.damageEnemyLocal === 'function') {
                    window.damageEnemyLocal(data.enemyId, data.damage);
                }
            }
        }

        else if (data.type === 'hit_vehicle') {
            if (this.isHost) {
                if (typeof window.damageVehicleLocal === 'function') {
                    window.damageVehicleLocal(data.vehicleId, data.damage);
                }
            }
        }

        else if (data.type === 'score_update') {
            if (this.isHost) {
                if (this.players[senderId]) {
                    this.players[senderId].kills = data.kills;
                }
            }
        }

        else if (data.type === 'pickup_medkit') {
            if (this.isHost) {
                const globalEnemyManager = window.enemyManagerGlobal;
                if (globalEnemyManager) {
                    const med = globalEnemyManager.medkits.find(m => m.userData.id === data.medkitId);
                    if (med) {
                        this.scene.remove(med);
                        const idx = globalEnemyManager.medkits.indexOf(med);
                        if (idx !== -1) globalEnemyManager.medkits.splice(idx, 1);
                    }
                }
            }
        }
    }

    sendLocalPlayerState(pos, yaw, pitch, weaponKey, aiming, crouching, health, kills) {
        if (!this.isMultiplayer) return;
        this.localKills = kills;

        const stateObj = {
            pos: { x: pos.x, y: pos.y, z: pos.z },
            yaw,
            pitch,
            weaponKey,
            aiming,
            crouching,
            health,
            kills
        };

        if (this.isHost) {
            if (this.players['host']) {
                Object.assign(this.players['host'], stateObj);
            }
            this.broadcastHostGameStates();
        } else {
            this.sendToHost({
                type: 'state',
                ...stateObj
            });
        }
    }

    broadcastHostGameStates() {
        if (!this.isHost) return;

        // Gather enemy updates
        const enemyList = [];
        if (window.enemyManagerGlobal && window.enemyManagerGlobal.enemies) {
            for (const enemy of window.enemyManagerGlobal.enemies) {
                if (!enemy.userData.id) {
                    enemy.userData.id = 'enemy-' + Math.random().toString(36).substr(2, 9);
                }
                enemyList.push({
                    id: enemy.userData.id,
                    archetype: enemy.userData.archetype,
                    x: enemy.position.x,
                    y: enemy.position.y,
                    z: enemy.position.z,
                    yaw: enemy.rotation.y,
                    pitch: enemy.userData.head ? enemy.userData.head.rotation.x : 0,
                    hp: enemy.userData.health || 0,
                    isMoving: !!enemy.userData.isMoving,
                    onLadder: !!enemy.userData.onLadder,
                    animTime: enemy.userData.time || 0
                });
            }
        }

        // Gather vehicle updates
        const vehicleList = [];
        if (window.vehicleManagerGlobal && window.vehicleManagerGlobal.vehicles) {
            for (const car of window.vehicleManagerGlobal.vehicles) {
                if (!car.userData.id) {
                    car.userData.id = 'car-' + Math.random().toString(36).substr(2, 9);
                }
                vehicleList.push({
                    id: car.userData.id,
                    x: car.position.x,
                    y: car.position.y,
                    z: car.position.z,
                    yaw: car.rotation.y,
                    hp: car.userData.health || 0,
                    speed: car.userData.speed || 0
                });
            }
        }

        // Gather medkit updates
        const medkitList = [];
        if (window.enemyManagerGlobal && window.enemyManagerGlobal.medkits) {
            for (const med of window.enemyManagerGlobal.medkits) {
                if (!med.userData.id) {
                    med.userData.id = 'medkit-' + Math.random().toString(36).substr(2, 9);
                }
                medkitList.push({
                    id: med.userData.id,
                    x: med.position.x,
                    y: med.position.y - 0.35,
                    z: med.position.z,
                    heal: med.userData.heal || 40
                });
            }
        }

        // Aggregate scores
        const scores = Object.values(this.players).map(p => ({
            nickname: p.nickname,
            kills: p.kills || 0,
            isLocal: p.id === 'host'
        }));

        this.broadcast({
            type: 'multi_state',
            players: this.players,
            enemies: enemyList,
            vehicles: vehicleList,
            medkits: medkitList,
            scores
        });

        // Host update local scoreboard
        this.syncScores(scores);
    }

    sendLocalShoot(origin, direction, weaponKey) {
        if (!this.isMultiplayer) return;
        if (this.isHost) {
            this.broadcast({
                type: 'shoot_relay',
                peerId: 'host',
                origin: { x: origin.x, y: origin.y, z: origin.z },
                direction: { x: direction.x, y: direction.y, z: direction.z },
                weaponKey
            });
        } else {
            this.sendToHost({
                type: 'shoot',
                origin: { x: origin.x, y: origin.y, z: origin.z },
                direction: { x: direction.x, y: direction.y, z: direction.z },
                weaponKey
            });
        }
    }

    sendLocalGrenade(pos, velocity) {
        if (!this.isMultiplayer) return;
        if (this.isHost) {
            this.broadcast({
                type: 'grenade_relay',
                peerId: 'host',
                pos: { x: pos.x, y: pos.y, z: pos.z },
                velocity: { x: velocity.x, y: velocity.y, z: velocity.z }
            });
        } else {
            this.sendToHost({
                type: 'grenade',
                pos: { x: pos.x, y: pos.y, z: pos.z },
                velocity: { x: velocity.x, y: velocity.y, z: velocity.z }
            });
        }
    }

    sendLobbyNext() {
        if (this.isHost) {
            this.broadcast({ type: 'lobby_next' });
        }
    }

    sendDifficultySync(difficultyKey) {
        if (this.isHost) {
            this.broadcast({ type: 'difficulty_sync', difficultyKey });
        }
    }

    sendGameStartSync(difficultyKey) {
        if (this.isHost) {
            this.broadcast({ type: 'game_start', difficultyKey });
        }
    }

    update(delta) {
        if (!this.isMultiplayer) return;

        // Perform client-side interpolation of remote players
        const lerpFactor = delta * 12.0;

        for (const peerId in this.players) {
            // Skip updating local player
            if (peerId === 'host' && this.isHost) continue;
            if (peerId !== 'host' && !this.isHost && peerId === this.peer.id) continue;

            const pData = this.players[peerId];
            if (!pData || !pData.pos) continue;

            let rp = this.remotePlayers[peerId];
            if (!rp) {
                // Spawn remote player model
                rp = this.spawnRemotePlayer(peerId, pData);
            }

            // Interpolate position and yaw/pitch
            rp.targetPos.set(pData.pos.x, pData.pos.y, pData.pos.z);
            rp.targetYaw = pData.yaw;
            rp.targetPitch = pData.pitch;
            rp.targetAiming = pData.aiming;
            rp.targetCrouching = pData.crouching;
            rp.health = pData.health;
            rp.kills = pData.kills || 0;

            // Apply smooth interpolation to mesh position/rotation
            const finalTargetY = rp.targetPos.y - (rp.targetCrouching ? 1.0 : 1.6); // Align mesh root to player feet
            const currentMeshPos = rp.mesh.position;
            currentMeshPos.x = THREE.MathUtils.lerp(currentMeshPos.x, rp.targetPos.x, lerpFactor);
            currentMeshPos.y = THREE.MathUtils.lerp(currentMeshPos.y, finalTargetY, lerpFactor);
            currentMeshPos.z = THREE.MathUtils.lerp(currentMeshPos.z, rp.targetPos.z, lerpFactor);

            rp.mesh.rotation.y = THREE.MathUtils.lerp(rp.mesh.rotation.y, rp.targetYaw, lerpFactor);

            if (rp.head) {
                rp.head.rotation.x = THREE.MathUtils.lerp(rp.head.rotation.x, rp.targetPitch, lerpFactor);
            }

            // Sync held weapon model visually if changed
            if (rp.currentWeaponKey !== pData.weaponKey) {
                this.updateRemotePlayerWeapon(rp, pData.weaponKey);
            }

            // Visual stance logic (crouching, aiming, locomotion)
            this.animateRemotePlayer(rp, delta);

            // Update floating nameplate text & position
            if (rp.nameplate) {
                // Keep nameplate sprite above head
                rp.nameplate.position.copy(rp.mesh.position);
                rp.nameplate.position.y += 2.9;

                // Update canvas health indicator dynamically
                if (rp.lastHealth !== rp.health) {
                    this.updateNameplateTexture(rp);
                }
            }
        }

        // Clean up remote players that left
        for (const peerId in this.remotePlayers) {
            if (!this.players[peerId]) {
                this.removeRemotePlayer(peerId);
            }
        }

        // If client, smoothly interpolate shared enemies & vehicles
        if (!this.isHost) {
            this.interpolateSharedEntities(delta);
        }
    }

    spawnRemotePlayer(peerId, data) {
        console.log(`Spawning remote player model for: ${data.nickname} (${peerId})`);

        // Create humanoid mesh via the dummy manager prototype helper
        const archetype = data.weaponKey === 'SNIPER' ? 'gunner' : 'gunner';
        const mesh = this.dummyEnemyManager.createEnemyMesh(archetype, {});

        // Color uniform differently (e.g. bright blue/cyan suit) for remote allies / enemies
        mesh.traverse(child => {
            if (child.isMesh && child.material) {
                // Change body cloth uniforms to blue-grey tactical color
                if (child.material.color && (child.material.color.getHex() === 0x2d3436 || child.material.color.getHex() === 0x223127 || child.material.color.getHex() === 0x3d2727 || child.material.color.getHex() === 0x1e272e)) {
                    child.material = child.material.clone();
                    child.material.color.setHex(0x1e3799); // Blue team tactical uniform
                }
            }
        });

        mesh.userData.isPlayer = true;
        mesh.userData.peerId = peerId;

        this.scene.add(mesh);

        // Build nameplate
        const rp = {
            mesh,
            head: mesh.userData.head,
            armR: mesh.userData.armR,
            armL: mesh.userData.armL,
            legRThigh: mesh.userData.legRThigh,
            legLThigh: mesh.userData.legLThigh,
            legRShin: mesh.userData.legRShin,
            legLShin: mesh.userData.legLShin,
            torsoGroup: mesh.userData.torsoGroup,
            targetPos: new THREE.Vector3().copy(data.pos),
            targetYaw: data.yaw,
            targetPitch: data.pitch,
            targetAiming: data.aiming,
            targetCrouching: data.crouching,
            health: data.health,
            lastHealth: data.health,
            kills: data.kills || 0,
            nickname: data.nickname,
            currentWeaponKey: data.weaponKey,
            animTime: 0
        };

        // Add sprite nameplate
        this.updateNameplateTexture(rp);

        this.remotePlayers[peerId] = rp;
        return rp;
    }

    updateNameplateTexture(rp) {
        if (rp.nameplate) {
            this.scene.remove(rp.nameplate);
            if (rp.nameplate.material) {
                if (rp.nameplate.material.map) {
                    rp.nameplate.material.map.dispose();
                }
                rp.nameplate.material.dispose();
            }
        }

        if (typeof document === 'undefined') return;

        const canvas = document.createElement('canvas');
        canvas.width = 384;
        canvas.height = 80;
        const ctx = canvas.getContext('2d');

        // Draw transparent backdrop
        ctx.fillStyle = 'rgba(10, 16, 24, 0.65)';
        ctx.fillRect(0, 0, 384, 80);

        // Border
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, 382, 78);

        // Nickname
        ctx.font = 'bold 24px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(rp.nickname, 192, 32);

        // Healthbar fill status
        const pct = Math.max(0, Math.min(100, rp.health)) / 100;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(48, 48, 288, 16);

        ctx.fillStyle = pct < 0.3 ? '#ef4444' : '#10b981';
        ctx.fillRect(48, 48, 288 * pct, 16);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(1.92, 0.4, 1.0);

        // Set position immediately to prevent (0,0,0) pop in the character chest
        if (rp.mesh) {
            sprite.position.copy(rp.mesh.position);
            sprite.position.y += 2.9;
        }

        rp.nameplate = sprite;
        this.scene.add(sprite); // Make sure it is added back to the scene!
        rp.lastHealth = rp.health;
    }

    updateRemotePlayerWeapon(rp, weaponKey) {
        // Swap remote player weapon model visually
        if (rp.mesh) {
            // Find existing gun attachment
            let existingRifle = null;
            rp.mesh.traverse(child => {
                if (child.name === 'rifle' || child.userData.isRifle) {
                    existingRifle = child;
                }
            });
            if (existingRifle) {
                existingRifle.parent.remove(existingRifle);
            }

            // Create and attach correct gun model
            const isSniper = weaponKey === 'SNIPER';
            const rifleGroup = isSniper
                ? this.createSniperWeaponModel()
                : this.dummyEnemyManager.createRifleMesh();

            rifleGroup.name = 'rifle';
            rifleGroup.userData.isRifle = true;

            // Attach to right arm
            if (rp.armR) {
                rp.armR.add(rifleGroup);
            }
            rp.currentWeaponKey = weaponKey;
        }
    }

    createSniperWeaponModel() {
        const sniper = new THREE.Group();
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x181a1c, metalness: 0.8, roughness: 0.3 });
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.85, 6), metalMat);
        barrel.rotation.z = Math.PI / 2;
        barrel.position.set(0.42, 0.05, 0);
        sniper.add(barrel);
        const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.07, 0.05), metalMat);
        receiver.position.set(0.1, 0.05, 0);
        sniper.add(receiver);
        return sniper;
    }

    animateRemotePlayer(rp, delta) {
        rp.animTime += delta * 6.5;

        // Is moving if target pos differs from mesh pos significantly
        const moveDist = rp.mesh.position.distanceTo(rp.targetPos);
        const isMoving = moveDist > 0.02;

        const isSniper = rp.currentWeaponKey === 'SNIPER';

        // 1. Locomotion running swing
        if (isMoving) {
            const stride = Math.sin(rp.animTime);
            const strideCos = Math.cos(rp.animTime);
            const strideAngle = stride * 0.42;

            rp.legLThigh.rotation.x = strideAngle;
            rp.legLShin.rotation.x = Math.max(0, -stride * 0.6);
            rp.legRThigh.rotation.x = -strideAngle;
            rp.legRShin.rotation.x = Math.max(0, stride * 0.6);

            rp.torsoGroup.rotation.x = rp.targetCrouching ? 0.22 : 0.08;
            rp.torsoGroup.rotation.y = -stride * 0.05;
        } else {
            // Breath bobbing
            const breath = Math.sin(rp.animTime * 0.4) * 0.02;
            rp.legLThigh.rotation.x = THREE.MathUtils.lerp(rp.legLThigh.rotation.x, 0, delta * 8);
            rp.legLShin.rotation.x = THREE.MathUtils.lerp(rp.legLShin.rotation.x, 0, delta * 8);
            rp.legRThigh.rotation.x = THREE.MathUtils.lerp(rp.legRThigh.rotation.x, 0, delta * 8);
            rp.legRShin.rotation.x = THREE.MathUtils.lerp(rp.legRShin.rotation.x, 0, delta * 8);

            rp.torsoGroup.rotation.x = rp.targetCrouching ? 0.18 : breath;
            rp.torsoGroup.rotation.y = THREE.MathUtils.lerp(rp.torsoGroup.rotation.y, 0, delta * 6);
        }

        // 2. Aim Stance
        if (rp.targetAiming) {
            rp.armR.rotation.x = -rp.targetPitch - 0.45;
            rp.armR.rotation.y = -0.15;
            rp.armL.rotation.x = -rp.targetPitch - 0.55;
            rp.armL.rotation.y = 0.55;
        } else {
            // Normal resting hold
            rp.armR.rotation.x = -0.3;
            rp.armR.rotation.y = -0.05;
            rp.armL.rotation.x = -0.2;
            rp.armL.rotation.y = 0.1;
        }
    }

    removeRemotePlayer(peerId) {
        const rp = this.remotePlayers[peerId];
        if (rp) {
            console.log(`Cleaning up remote player model for ${peerId}`);
            this.scene.remove(rp.mesh);
            if (rp.nameplate) {
                this.scene.remove(rp.nameplate);
            }
            delete this.remotePlayers[peerId];
        }
    }

    spawnRemoteShootEffect(peerId, origin, direction, weaponKey) {
        console.log(`Replicating gunshot for remote peer: ${peerId}`);

        // Fire audio at the position of the shooter
        const shooterPos = new THREE.Vector3(origin.x, origin.y, origin.z);
        const dist = this.camera.position.distanceTo(shooterPos);

        // Attenuate volume based on distance
        const volumeFactor = Math.max(0, Math.min(1.0, 1 - (dist / 140)));

        if (weaponKey === 'SNIPER') {
            soundEngine.playSniperFire(false); // Can just trigger normal audio
            soundEngine.playShellCasingDrop();
        } else {
            soundEngine.playRifleShot(false);
            if (Math.random() < 0.3) soundEngine.playShellCasingDrop();
        }

        // Spawn visual bullet tracer
        const bulletMat = new THREE.MeshBasicMaterial({
            color: weaponKey === 'SNIPER' ? 0xffbb00 : 0xffffff,
            transparent: true,
            opacity: 0.8
        });

        const bulletDir = new THREE.Vector3(direction.x, direction.y, direction.z).normalize();
        const tracerGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.8, 4);
        const tracer = new THREE.Mesh(tracerGeo, bulletMat);

        // Position tracer along the raycast trajectory path
        tracer.position.copy(shooterPos).add(bulletDir.clone().multiplyScalar(0.9));
        tracer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bulletDir);

        this.scene.add(tracer);

        // Animate tracer forward
        const speed = weaponKey === 'SNIPER' ? 240 : 160;
        let life = 0.45;

        const updateTracer = () => {
            if (life <= 0) {
                this.scene.remove(tracer);
                tracerGeo.dispose();
                bulletMat.dispose();
            } else {
                tracer.position.add(bulletDir.clone().multiplyScalar(speed * 0.016));
                life -= 0.016;
                requestAnimationFrame(updateTracer);
            }
        };
        updateTracer();
    }

    spawnRemoteGrenade(peerId, pos, velocity) {
        console.log(`Replicating grenade throw from peer: ${peerId}`);
        soundEngine.playGrenadeBounce();

        const grenadeGeo = new THREE.SphereGeometry(0.18, 12, 12);
        const grenadeMat = new THREE.MeshStandardMaterial({ color: 0x22262a, metalness: 0.85, roughness: 0.3 });
        const grenadeMesh = new THREE.Mesh(grenadeGeo, grenadeMat);
        grenadeMesh.position.set(pos.x, pos.y, pos.z);
        this.scene.add(grenadeMesh);

        // Simple local gravity projection on client
        let localPos = new THREE.Vector3(pos.x, pos.y, pos.z);
        let localVel = new THREE.Vector3(velocity.x, velocity.y, velocity.z);
        let life = 3.0;

        const updateGrenade = () => {
            if (life <= 0) {
                this.scene.remove(grenadeMesh);
                grenadeGeo.dispose();
                grenadeMat.dispose();

                // Trigger client explosion effect locally
                soundEngine.playGrenadeExplosion();
                const flashGeo = new THREE.SphereGeometry(3.5, 16, 16);
                const flashMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.85 });
                const flash = new THREE.Mesh(flashGeo, flashMat);
                flash.position.copy(localPos);
                this.scene.add(flash);
                setTimeout(() => {
                    this.scene.remove(flash);
                    flashGeo.dispose();
                    flashMat.dispose();
                }, 180);
            } else {
                localVel.y -= 9.8 * 0.016 * 1.5; // Custom gravity match
                localPos.add(localVel.clone().multiplyScalar(0.016));

                // Bouncing logic locally
                if (localPos.y <= 0.18) {
                    localPos.y = 0.18;
                    localVel.y = -localVel.y * 0.45;
                    localVel.x *= 0.8;
                    localVel.z *= 0.8;
                }

                grenadeMesh.position.copy(localPos);
                life -= 0.016;
                requestAnimationFrame(updateGrenade);
            }
        };
        updateGrenade();
    }

    syncSharedEnemies(enemiesData) {
        const receivedIds = new Set();
        const globalEnemyManager = window.enemyManagerGlobal;

        for (const e of enemiesData) {
            receivedIds.add(e.id);
            let mesh = this.sharedEnemies[e.id];

            if (!mesh) {
                // Spawn client-side enemy mesh
                mesh = this.dummyEnemyManager.createEnemyMesh(e.archetype, {});
                mesh.userData.isEnemy = true;
                mesh.userData.id = e.id;
                this.scene.add(mesh);
                this.sharedEnemies[e.id] = mesh;

                // Push to global enemyManager so local bullets hit it!
                if (globalEnemyManager) {
                    globalEnemyManager.enemies.push(mesh);
                }
            }

            // Save target states for interpolation
            mesh.userData.targetPos = new THREE.Vector3(e.x, e.y, e.z); // Root alignment offset
            mesh.userData.targetYaw = e.yaw;
            mesh.userData.targetPitch = e.pitch;
            mesh.userData.isMoving = e.isMoving;
            mesh.userData.onLadder = e.onLadder;
            mesh.userData.time = e.animTime;
            mesh.userData.health = e.hp;

            // Update anim state visually
            this.animateSharedEnemy(mesh);
        }

        // Delete dead/removed enemies
        for (const id in this.sharedEnemies) {
            if (!receivedIds.has(id)) {
                const mesh = this.sharedEnemies[id];
                this.scene.remove(mesh);
                if (globalEnemyManager) {
                    const idx = globalEnemyManager.enemies.indexOf(mesh);
                    if (idx !== -1) globalEnemyManager.enemies.splice(idx, 1);
                }
                delete this.sharedEnemies[id];
            }
        }
    }

    animateSharedEnemy(mesh) {
        // Humanoid limb animations based on motion
        const isGunner = mesh.userData.archetype === 'gunner';
        const isMoving = mesh.userData.isMoving;
        const onLadder = mesh.userData.onLadder;
        const time = mesh.userData.time;

        const armR = mesh.userData.armR;
        const armL = mesh.userData.armL;
        const legRThigh = mesh.userData.legRThigh;
        const legLThigh = mesh.userData.legLThigh;
        const legRShin = mesh.userData.legRShin;
        const legLShin = mesh.userData.legLShin;
        const torsoGroup = mesh.userData.torsoGroup;

        if (onLadder) {
            const climbPhase = Math.sin(time);
            legLThigh.rotation.x = climbPhase * 0.6;
            legLShin.rotation.x = Math.max(0, -climbPhase * 0.7);
            legRThigh.rotation.x = -climbPhase * 0.6;
            legRShin.rotation.x = Math.max(0, climbPhase * 0.7);
            torsoGroup.rotation.x = 0.15;
            torsoGroup.rotation.y = 0;
        } else if (isMoving) {
            const stride = Math.sin(time);
            const strideAngle = stride * (isGunner ? 0.38 : 0.52);

            legLThigh.rotation.x = strideAngle;
            legLShin.rotation.x = Math.max(0, -stride * 0.65);
            legRThigh.rotation.x = -strideAngle;
            legRShin.rotation.x = Math.max(0, stride * 0.65);

            torsoGroup.rotation.x = isGunner ? 0.05 : 0.18;
            torsoGroup.rotation.y = -stride * 0.08;
        } else {
            legLThigh.rotation.x = 0;
            legLShin.rotation.x = 0;
            legRThigh.rotation.x = 0;
            legRShin.rotation.x = 0;
            torsoGroup.rotation.x = 0;
            torsoGroup.rotation.y = 0;
        }
    }

    syncSharedVehicles(vehiclesData) {
        const receivedIds = new Set();
        const globalVehicleManager = window.vehicleManagerGlobal;

        for (const v of vehiclesData) {
            receivedIds.add(v.id);
            let mesh = this.sharedVehicles[v.id];

            if (!mesh) {
                // Load vehicle mesh via dummy vehicle manager
                if (globalVehicleManager) {
                    mesh = globalVehicleManager.createCarMesh();
                    mesh.userData.isVehicle = true;
                    mesh.userData.id = v.id;
                    this.scene.add(mesh);
                    this.sharedVehicles[v.id] = mesh;
                    globalVehicleManager.vehicles.push(mesh);
                }
            }

            if (mesh) {
                mesh.userData.targetPos = new THREE.Vector3(v.x, v.y, v.z);
                mesh.userData.targetYaw = v.yaw;
                mesh.userData.health = v.hp;
            }
        }

        // Clean up dead/removed vehicles
        for (const id in this.sharedVehicles) {
            if (!receivedIds.has(id)) {
                const mesh = this.sharedVehicles[id];
                this.scene.remove(mesh);
                if (globalVehicleManager) {
                    const idx = globalVehicleManager.vehicles.indexOf(mesh);
                    if (idx !== -1) globalVehicleManager.vehicles.splice(idx, 1);
                }
                delete this.sharedVehicles[id];
            }
        }
    }

    syncSharedMedkits(medkitsData) {
        if (!medkitsData) return;
        const receivedIds = new Set();
        const globalEnemyManager = window.enemyManagerGlobal;

        for (const m of medkitsData) {
            receivedIds.add(m.id);
            let mesh = this.sharedMedkits[m.id];

            if (!mesh && globalEnemyManager) {
                mesh = globalEnemyManager.createMedkitMesh(m.x, m.y, m.z);
                mesh.userData.id = m.id;
                mesh.userData.heal = m.heal;
                this.sharedMedkits[m.id] = mesh;
            }
        }

        for (const id in this.sharedMedkits) {
            if (!receivedIds.has(id)) {
                const mesh = this.sharedMedkits[id];
                this.scene.remove(mesh);
                if (globalEnemyManager) {
                    const idx = globalEnemyManager.medkits.indexOf(mesh);
                    if (idx !== -1) globalEnemyManager.medkits.splice(idx, 1);
                }
                delete this.sharedMedkits[id];
            }
        }
    }

    interpolateSharedEntities(delta) {
        const lerpFactor = delta * 12.0;

        // Interpolate enemies
        for (const id in this.sharedEnemies) {
            const mesh = this.sharedEnemies[id];
            if (mesh.userData.targetPos) {
                mesh.position.lerp(mesh.userData.targetPos, lerpFactor);
                mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, mesh.userData.targetYaw, lerpFactor);
                if (mesh.userData.head) {
                    mesh.userData.head.rotation.x = THREE.MathUtils.lerp(mesh.userData.head.rotation.x, mesh.userData.targetPitch, lerpFactor);
                }
            }
        }

        // Interpolate vehicles
        for (const id in this.sharedVehicles) {
            const mesh = this.sharedVehicles[id];
            if (mesh.userData.targetPos) {
                mesh.position.lerp(mesh.userData.targetPos, lerpFactor);
                mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, mesh.userData.targetYaw, lerpFactor);
            }
        }
    }

    syncScores(scores) {
        if (!scores || typeof document === 'undefined') return;

        const scoresStr = JSON.stringify(scores);
        if (this.lastScoresStr === scoresStr) return;
        this.lastScoresStr = scoresStr;

        // Render dynamic scoreboard UI
        let scoreboardContainer = document.getElementById('mp-scoreboard');
        if (!scoreboardContainer) {
            scoreboardContainer = document.createElement('div');
            scoreboardContainer.id = 'mp-scoreboard';
            scoreboardContainer.className = 'scoreboard-container';
            document.body.appendChild(scoreboardContainer);
        }

        scoreboardContainer.innerHTML = `
            <div class="scoreboard-title">Scoreboard (${this.gameMode === 'ffa' ? 'Deathmatch' : 'Co-op'})</div>
            ${scores
                .sort((a, b) => b.kills - a.kills)
                .map(s => {
                    const rowClass = s.isLocal ? 'scoreboard-row local-player' : 'scoreboard-row';
                    return `
                        <div class="${rowClass}">
                            <span>${s.nickname}</span>
                            <span>${s.kills} Kills</span>
                        </div>
                    `;
                })
                .join('')}
        `;
    }

    shutdown() {
        console.log('Shutting down PeerJS connection.');
        if (window.uiManagerGlobal) {
            window.uiManagerGlobal.showChatPanel(false);
        }
        const chatLog = typeof document !== 'undefined' ? document.getElementById('chat-log') : null;
        if (chatLog) {
            chatLog.innerHTML = '';
        }
        if (this.peer) {
            this.peer.destroy();
        }

        // Clean up remote player meshes
        for (const peerId in this.remotePlayers) {
            this.removeRemotePlayer(peerId);
        }

        // Clean up client shared meshes
        for (const id in this.sharedEnemies) {
            this.scene.remove(this.sharedEnemies[id]);
        }
        for (const id in this.sharedVehicles) {
            this.scene.remove(this.sharedVehicles[id]);
        }
        for (const id in this.sharedMedkits) {
            this.scene.remove(this.sharedMedkits[id]);
        }
        this.sharedMedkits = {};

        const scoreboard = typeof document !== 'undefined' ? document.getElementById('mp-scoreboard') : null;
        if (scoreboard) {
            scoreboard.remove();
        }

        this.isMultiplayer = false;
        this.isHost = false;
        this.players = {};
    }
}
