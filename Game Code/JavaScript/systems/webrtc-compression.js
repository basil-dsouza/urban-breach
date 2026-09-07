/**
 * Urban Breach — Optimized WebRTC SDP & ICE Candidate Compression Engine
 * 
 * Compresses WebRTC signaling payloads for School Mode / Serverless peer connections.
 * Achieves maximum compression via:
 * 1. SDP sanitization: strips media lines, unused extmap/msid/trickle attributes, and redundant ICE candidate metadata.
 * 2. Minified JSON bundling: maps session descriptors to compact keys.
 * 3. URL-safe LZ compression: utilizes lz-string's compressToEncodedURIComponent.
 * 4. Robust decompression: backward-compatible with legacy Base64 payloads and robust error validation.
 */

import LZString from 'lz-string';

/**
 * Strips non-essential attributes and redundant headers from an SDP string.
 * Tailored specifically for RTCDataChannel-only synchronization.
 * 
 * @param {string} sdp - Raw SDP string
 * @returns {string} Sanitized, compact SDP
 */
export function sanitizeSDP(sdp) {
    if (!sdp || typeof sdp !== 'string') return '';

    const lines = sdp.split(/\r?\n/);
    const cleanedLines = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        // 1. Strip non-DataChannel media streams (audio, video) if present
        if (line.startsWith('m=audio') || line.startsWith('m=video')) {
            // Skip until next media line or end
            while (i + 1 < lines.length && !lines[i + 1].trim().startsWith('m=')) {
                i++;
            }
            continue;
        }

        // 2. Strip RTP header extensions (only used for media tracks)
        if (line.startsWith('a=extmap') || line.startsWith('a=extmap-allow-mixed')) {
            continue;
        }

        // 3. Strip Media Stream IDs (irrelevant for RTCDataChannel)
        if (line.startsWith('a=msid-semantic:') || line.startsWith('a=msid:')) {
            continue;
        }

        // 4. Strip trickle ICE options since manual copy-paste gathers completely before exchange
        if (line.startsWith('a=ice-options:trickle')) {
            continue;
        }

        // 5. Sanitize ICE candidate lines (strip proprietary / non-essential vendor tags)
        if (line.startsWith('a=candidate:')) {
            line = sanitizeCandidateString(line);
        }

        cleanedLines.push(line);
    }

    // RFC 4566 requires CRLF line endings
    return cleanedLines.join('\r\n') + '\r\n';
}

/**
 * Strips non-essential vendor attributes (generation, network-id, network-cost) from candidate string.
 * Preserves standard RFC 5245 / 8445 candidate structure.
 * 
 * @param {string} candidateStr 
 * @returns {string} Cleaned candidate string
 */
export function sanitizeCandidateString(candidateStr) {
    if (!candidateStr || typeof candidateStr !== 'string') return '';
    return candidateStr
        .replace(/\s+(generation|network-id|network-cost)\s+[^\s]+/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

/**
 * Sanitizes an array of ICE candidate objects or strings.
 * 
 * @param {Array<Object|string>} candidates 
 * @returns {Array<Object|string>}
 */
export function sanitizeCandidates(candidates) {
    if (!Array.isArray(candidates) || candidates.length === 0) return [];

    const seen = new Set();
    const result = [];

    for (const cand of candidates) {
        if (!cand) continue;

        if (typeof cand === 'string') {
            const cleaned = sanitizeCandidateString(cand);
            if (cleaned && !seen.has(cleaned)) {
                seen.add(cleaned);
                result.push(cleaned);
            }
        } else if (typeof cand === 'object') {
            const rawStr = cand.candidate || '';
            const cleanedStr = sanitizeCandidateString(rawStr);
            const key = `${cleanedStr}|${cand.sdpMid}|${cand.sdpMLineIndex}`;
            if (!seen.has(key)) {
                seen.add(key);
                result.push({
                    c: cleanedStr,
                    m: cand.sdpMid !== undefined ? cand.sdpMid : null,
                    i: cand.sdpMLineIndex !== undefined ? cand.sdpMLineIndex : null
                });
            }
        }
    }

    return result;
}

/**
 * Bundles sanitized SDP and gathered ICE candidates into a compact, URL-safe LZ-compressed string.
 * 
 * @param {Object} payload 
 * @param {string} payload.type - 'offer' | 'answer'
 * @param {string} payload.sdp - The raw or pre-sanitized SDP
 * @param {Array} [payload.candidates] - Optional gathered ICE candidates
 * @returns {string} Compact URL-safe session token
 */
export function compressSessionToken(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('[WebRTC Compression] Invalid payload: expected an object with type and sdp.');
    }

    const type = payload.type || (payload.localDescription && payload.localDescription.type);
    const sdp = payload.sdp || (payload.localDescription && payload.localDescription.sdp);

    if (!type || !sdp) {
        throw new Error('[WebRTC Compression] Payload must contain both "type" and "sdp".');
    }

    if (type !== 'offer' && type !== 'answer') {
        throw new Error(`[WebRTC Compression] Unsupported session type: "${type}". Expected "offer" or "answer".`);
    }

    const cleanSDP = sanitizeSDP(sdp);
    const candidates = payload.candidates ? sanitizeCandidates(payload.candidates) : [];

    // Minified bundle format
    const bundle = {
        t: type,
        s: cleanSDP
    };

    if (candidates.length > 0) {
        bundle.c = candidates;
    }

    const json = JSON.stringify(bundle);
    const compressed = LZString.compressToEncodedURIComponent(json);

    return compressed;
}

/**
 * Decompresses and validates a session token with error handling and backwards-compatibility.
 * 
 * @param {string} token - The compressed session token (or legacy base64 string)
 * @returns {{ type: 'offer'|'answer', sdp: string, candidates: Array }}
 */
export function decompressSessionToken(token) {
    if (!token || typeof token !== 'string') {
        throw new Error('[WebRTC Decompression] Invalid session token: token must be a non-empty string.');
    }

    const sanitizedToken = token.trim();
    if (!sanitizedToken) {
        throw new Error('[WebRTC Decompression] Token is empty.');
    }

    let parsed = null;

    // 1. Attempt LZ-String decompression
    try {
        const decompressed = LZString.decompressFromEncodedURIComponent(sanitizedToken);
        if (decompressed) {
            parsed = JSON.parse(decompressed);
        }
    } catch (lzErr) {
        // Continue to fallback check below
    }

    // 2. Fallback check: Legacy uncompressed Base64 JSON token
    if (!parsed) {
        try {
            const rawDecoded = typeof atob === 'function' 
                ? atob(sanitizedToken) 
                : Buffer.from(sanitizedToken, 'base64').toString('utf-8');
            parsed = JSON.parse(rawDecoded);
        } catch (b64Err) {
            throw new Error('[WebRTC Decompression] Failed to decode token. Ensure the code was copied completely without missing characters.');
        }
    }

    if (!parsed || typeof parsed !== 'object') {
        throw new Error('[WebRTC Decompression] Invalid payload structure: expected a JSON object.');
    }

    // 3. Extract and normalize fields (handles both minified keys and standard keys)
    const type = parsed.t || parsed.type;
    let sdp = parsed.s || parsed.sdp;

    if (!type || (type !== 'offer' && type !== 'answer')) {
        throw new Error(`[WebRTC Decompression] Malformed token: invalid or missing session type ("${type}").`);
    }

    if (!sdp || typeof sdp !== 'string') {
        throw new Error('[WebRTC Decompression] Malformed token: missing or invalid SDP string.');
    }

    // Ensure CRLF endings per SDP specification
    sdp = sdp.replace(/\r?\n/g, '\r\n');
    if (!sdp.endsWith('\r\n')) {
        sdp += '\r\n';
    }

    // 4. Reconstitute candidate objects if present
    const rawCandidates = parsed.c || parsed.candidates || [];
    const candidates = [];

    if (Array.isArray(rawCandidates)) {
        for (const item of rawCandidates) {
            if (typeof item === 'string') {
                candidates.push({ candidate: item, sdpMid: '0', sdpMLineIndex: 0 });
            } else if (item && typeof item === 'object') {
                candidates.push({
                    candidate: item.c || item.candidate || '',
                    sdpMid: item.m !== undefined ? item.m : (item.sdpMid !== undefined ? item.sdpMid : '0'),
                    sdpMLineIndex: item.i !== undefined ? item.i : (item.sdpMLineIndex !== undefined ? item.sdpMLineIndex : 0)
                });
            }
        }
    }

    return {
        type,
        sdp,
        candidates
    };
}

/**
 * Creates an offer on the provided RTCPeerConnection, gathers all ICE candidates,
 * and resolves with the compressed session token.
 * 
 * @param {RTCPeerConnection} pc 
 * @param {number} [timeoutMs=8000] 
 * @returns {Promise<string>} Compressed offer session token
 */
export async function createCompressedOffer(pc, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
        let isDone = false;
        const timer = setTimeout(() => {
            if (!isDone && pc.localDescription) {
                isDone = true;
                console.warn('[WebRTC Compression] ICE gathering timed out, proceeding with current candidates.');
                resolve(compressSessionToken({
                    type: pc.localDescription.type,
                    sdp: pc.localDescription.sdp
                }));
            }
        }, timeoutMs);

        pc.onicecandidate = (event) => {
            if (!event.candidate && !isDone) {
                isDone = true;
                clearTimeout(timer);
                try {
                    const token = compressSessionToken({
                        type: pc.localDescription.type,
                        sdp: pc.localDescription.sdp
                    });
                    resolve(token);
                } catch (err) {
                    reject(err);
                }
            }
        };

        pc.createOffer()
            .then(offer => pc.setLocalDescription(offer))
            .catch(err => {
                clearTimeout(timer);
                reject(err);
            });
    });
}

/**
 * Applies a compressed offer token, creates an answer, gathers all ICE candidates,
 * and resolves with the compressed answer token.
 * 
 * @param {RTCPeerConnection} pc 
 * @param {string} offerToken 
 * @param {number} [timeoutMs=8000] 
 * @returns {Promise<string>} Compressed answer session token
 */
export async function createCompressedAnswer(pc, offerToken, timeoutMs = 8000) {
    const remote = decompressSessionToken(offerToken);
    await pc.setRemoteDescription(new RTCSessionDescription({
        type: remote.type,
        sdp: remote.sdp
    }));

    if (remote.candidates && remote.candidates.length > 0) {
        for (const cand of remote.candidates) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (candErr) {
                console.warn('[WebRTC Compression] Could not add candidate:', candErr);
            }
        }
    }

    return new Promise((resolve, reject) => {
        let isDone = false;
        const timer = setTimeout(() => {
            if (!isDone && pc.localDescription) {
                isDone = true;
                console.warn('[WebRTC Compression] Answer ICE gathering timed out, proceeding with current candidates.');
                resolve(compressSessionToken({
                    type: pc.localDescription.type,
                    sdp: pc.localDescription.sdp
                }));
            }
        }, timeoutMs);

        pc.onicecandidate = (event) => {
            if (!event.candidate && !isDone) {
                isDone = true;
                clearTimeout(timer);
                try {
                    const token = compressSessionToken({
                        type: pc.localDescription.type,
                        sdp: pc.localDescription.sdp
                    });
                    resolve(token);
                } catch (err) {
                    reject(err);
                }
            }
        };

        pc.createAnswer()
            .then(answer => pc.setLocalDescription(answer))
            .catch(err => {
                clearTimeout(timer);
                reject(err);
            });
    });
}

/**
 * Applies a compressed answer token to the host RTCPeerConnection.
 * 
 * @param {RTCPeerConnection} pc 
 * @param {string} answerToken 
 * @returns {Promise<void>}
 */
export async function applyCompressedAnswer(pc, answerToken) {
    const remote = decompressSessionToken(answerToken);
    await pc.setRemoteDescription(new RTCSessionDescription({
        type: remote.type,
        sdp: remote.sdp
    }));

    if (remote.candidates && remote.candidates.length > 0) {
        for (const cand of remote.candidates) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (candErr) {
                console.warn('[WebRTC Compression] Could not add answer candidate:', candErr);
            }
        }
    }
}
