/**
 * Serverless WebRTC Copy-Paste Connection Manager
 * Zero backend signaling via Base64-encoded SDP strings.
 */

// ICE / NAT Configuration
export const WEBRTC_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ]
};

// DataChannel settings optimized for low-latency FPS/physics sync
export const DATA_CHANNEL_CONFIG = {
    ordered: false,
    maxRetransmits: 0
};

// Clearly marked hook functions for the user to connect to the game loop
export const manualWebRTCHooks = {
    /**
     * Triggered when the peer connection and data channel are successfully opened.
     * @param {RTCDataChannel} dataChannel The active data channel.
     * @param {boolean} isHost True if this peer is the host.
     */
    onPeerConnected: (dataChannel, isHost) => {
        console.log(`[manualWebRTCHooks] onPeerConnected: Active as ${isHost ? 'Host' : 'Client'}`);
    },

    /**
     * Triggered when incoming raw game packets are received from the peer.
     * @param {Object} data The parsed message object.
     */
    handleIncomingGameData: (data) => {
        console.log('[manualWebRTCHooks] handleIncomingGameData:', data);
    },

    /**
     * Call this function to send game state packets over the established data channel.
     * @param {RTCDataChannel} dataChannel The active data channel.
     * @param {Object} data The message object to serialize and send.
     */
    sendGameData: (dataChannel, data) => {
        if (dataChannel && dataChannel.readyState === 'open') {
            dataChannel.send(JSON.stringify(data));
        }
    }
};

/**
 * Wrapper for manual WebRTC connection to mimic the PeerJS DataConnection interface.
 * This allows the existing MultiplayerManager to work without extensive modifications.
 */
export class ManualConnection {
    constructor(peerId, dataChannel, peerConnection) {
        this.peer = peerId;
        this.channel = dataChannel;
        this.pc = peerConnection;
        this.callbacks = {};

        this.channel.onmessage = (event) => {
            let data;
            try {
                data = JSON.parse(event.data);
            } catch (err) {
                console.error("[ManualConnection] Failed to parse incoming game data:", err);
                return;
            }
            
            // Trigger manualWebRTCHooks
            manualWebRTCHooks.handleIncomingGameData(data);

            if (this.callbacks['data']) {
                this.callbacks['data'](data);
            }
        };

        this.channel.onclose = () => {
            console.log(`[ManualConnection] DataChannel closed for peer: ${this.peer}`);
            if (this.callbacks['close']) {
                this.callbacks['close']();
            }
        };

        this.channel.onerror = (err) => {
            console.error(`[ManualConnection] DataChannel error for peer: ${this.peer}`, err);
            if (this.callbacks['error']) {
                this.callbacks['error'](err);
            }
        };
    }

    on(event, callback) {
        this.callbacks[event] = callback;
        // If they register an 'open' event and the channel is already open, fire it immediately
        if (event === 'open' && this.channel.readyState === 'open') {
            setTimeout(() => callback(), 0);
        }
    }

    send(data) {
        manualWebRTCHooks.sendGameData(this.channel, data);
    }

    close() {
        try {
            this.channel.close();
        } catch (e) {}
        try {
            this.pc.close();
        } catch (e) {}
    }
}

/**
 * Host Flow Helper:
 * Creates the RTCPeerConnection and the local DataChannel, generates the SDP Offer,
 * and waits for full ICE gathering before resolving the Base64 offer string.
 */
export function startManualHost(onOfferCreated, onConnectionSuccess) {
    const pc = new RTCPeerConnection(WEBRTC_CONFIG);
    const channel = pc.createDataChannel('game-data', DATA_CHANNEL_CONFIG);

    let isGatheringDone = false;

    // Handle data channel events
    channel.onopen = () => {
        console.log("[WebRTC Host] Data channel opened!");
        manualWebRTCHooks.onPeerConnected(channel, true);
        onConnectionSuccess(pc, channel);
    };

    pc.onicecandidate = (event) => {
        // ICE candidate gathering completes when event.candidate is null
        if (!event.candidate && !isGatheringDone) {
            isGatheringDone = true;
            console.log("[WebRTC Host] ICE candidate gathering complete.");
            const localDescription = pc.localDescription;
            const base64Offer = btoa(JSON.stringify(localDescription));
            onOfferCreated(base64Offer);
        }
    };

    // Keep track of connection state for logging/debugging
    pc.onconnectionstatechange = () => {
        console.log(`[WebRTC Host] Connection State: ${pc.connectionState}`);
    };

    pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .catch(err => {
            console.error("[WebRTC Host] Error creating offer:", err);
        });

    return pc;
}

/**
 * Client Flow Helper:
 * Accepts Host's Base64 SDP Offer, sets remote description, generates SDP Answer,
 * and waits for full ICE gathering before resolving the Base64 answer string.
 */
export function startManualClient(base64Offer, onAnswerCreated, onConnectionSuccess) {
    const pc = new RTCPeerConnection(WEBRTC_CONFIG);
    let isGatheringDone = false;

    // Listen for the incoming data channel created by the host
    pc.ondatachannel = (event) => {
        const channel = event.channel;
        channel.onopen = () => {
            console.log("[WebRTC Client] Data channel opened!");
            manualWebRTCHooks.onPeerConnected(channel, false);
            onConnectionSuccess(pc, channel);
        };
    };

    pc.onicecandidate = (event) => {
        if (!event.candidate && !isGatheringDone) {
            isGatheringDone = true;
            console.log("[WebRTC Client] ICE candidate gathering complete.");
            const localDescription = pc.localDescription;
            const base64Answer = btoa(JSON.stringify(localDescription));
            onAnswerCreated(base64Answer);
        }
    };

    pc.onconnectionstatechange = () => {
        console.log(`[WebRTC Client] Connection State: ${pc.connectionState}`);
    };

    // Process host offer
    try {
        const offerDesc = JSON.parse(atob(base64Offer));
        pc.setRemoteDescription(new RTCSessionDescription(offerDesc))
            .then(() => pc.createAnswer())
            .then(answer => pc.setLocalDescription(answer))
            .catch(err => {
                console.error("[WebRTC Client] Error in setRemoteDescription or createAnswer:", err);
                alert("Failed to process host offer code. Make sure it was copied completely.");
            });
    } catch (err) {
        console.error("[WebRTC Client] Error decoding host offer:", err);
        alert("Invalid offer code format. Make sure you copied the correct base64 code.");
    }

    return pc;
}

/**
 * Host Flow Part 2:
 * Applies the client's Base64 SDP Answer to establish connection.
 */
export function applyManualAnswer(pc, base64Answer) {
    try {
        const answerDesc = JSON.parse(atob(base64Answer));
        pc.setRemoteDescription(new RTCSessionDescription(answerDesc))
            .then(() => {
                console.log("[WebRTC Host] Successfully applied remote answer description.");
            })
            .catch(err => {
                console.error("[WebRTC Host] Error applying client answer:", err);
                alert("Failed to apply answer description. Ensure the code was copied completely.");
            });
    } catch (err) {
        console.error("[WebRTC Host] Error decoding client answer:", err);
        alert("Invalid answer code format. Make sure you copied the correct base64 code.");
    }
}
