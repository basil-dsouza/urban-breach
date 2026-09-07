import { describe, it, expect } from 'vitest';
import {
    sanitizeSDP,
    sanitizeCandidateString,
    sanitizeCandidates,
    compressSessionToken,
    decompressSessionToken
} from '../Game Code/JavaScript/systems/webrtc-compression.js';

describe('WebRTC SDP & ICE Compression Engine', () => {
    const sampleRawSDP = [
        'v=0',
        'o=- 729182749817294812 2 IN IP4 127.0.0.1',
        's=-',
        't=0 0',
        'a=group:BUNDLE 0',
        'a=extmap-allow-mixed',
        'a=msid-semantic: WMS',
        'm=application 9 UDP/DTLS/SCTP webrtc-datachannel',
        'c=IN IP4 0.0.0.0',
        'a=candidate:842163049 1 udp 2122260223 192.168.1.105 52341 typ host generation 0 ufrag 7abc network-id 1 network-cost 10',
        'a=candidate:842163050 1 udp 1686052607 203.0.113.195 52341 typ srflx raddr 192.168.1.105 rport 52341 generation 0 ufrag 7abc network-id 1 network-cost 10',
        'a=ice-ufrag:7abc',
        'a=ice-pwd:abcdefghijklmnopqrstuvwx',
        'a=ice-options:trickle',
        'a=fingerprint:sha-256 00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF',
        'a=setup:actpass',
        'a=mid:0',
        'a=sctp-port:5000',
        'a=max-message-size:262144'
    ].join('\r\n');

    it('sanitizes SDP by stripping redundant media headers and metadata', () => {
        const cleaned = sanitizeSDP(sampleRawSDP);

        // Check stripped lines
        expect(cleaned).not.toContain('a=extmap-allow-mixed');
        expect(cleaned).not.toContain('a=msid-semantic:');
        expect(cleaned).not.toContain('a=ice-options:trickle');
        expect(cleaned).not.toContain('generation 0');
        expect(cleaned).not.toContain('network-id 1');
        expect(cleaned).not.toContain('network-cost 10');

        // Check preserved essential lines
        expect(cleaned).toContain('m=application 9 UDP/DTLS/SCTP webrtc-datachannel');
        expect(cleaned).toContain('a=setup:actpass');
        expect(cleaned).toContain('a=mid:0');
        expect(cleaned).toContain('a=candidate:842163049 1 udp 2122260223 192.168.1.105 52341 typ host ufrag 7abc');
        expect(cleaned.endsWith('\r\n')).toBe(true);
    });

    it('strips non-datachannel audio/video tracks if present', () => {
        const sdpWithMedia = [
            'v=0',
            'm=audio 54312 RTP/SAVPF 111',
            'c=IN IP4 0.0.0.0',
            'a=rtpmap:111 opus/48000/2',
            'm=application 9 UDP/DTLS/SCTP webrtc-datachannel',
            'c=IN IP4 0.0.0.0',
            'a=mid:0'
        ].join('\r\n');

        const cleaned = sanitizeSDP(sdpWithMedia);
        expect(cleaned).not.toContain('m=audio');
        expect(cleaned).not.toContain('opus/48000/2');
        expect(cleaned).toContain('m=application 9 UDP/DTLS/SCTP webrtc-datachannel');
    });

    it('sanitizes candidate strings correctly', () => {
        const raw = 'candidate:1 1 udp 2122260223 192.168.1.1 50000 typ host generation 0 network-id 2 network-cost 50';
        const cleaned = sanitizeCandidateString(raw);
        expect(cleaned).toBe('candidate:1 1 udp 2122260223 192.168.1.1 50000 typ host');
    });

    it('sanitizes candidate arrays and deduplicates them', () => {
        const candidates = [
            'candidate:1 1 udp 2122260223 192.168.1.1 50000 typ host generation 0',
            'candidate:1 1 udp 2122260223 192.168.1.1 50000 typ host generation 1', // duplicate when cleaned
            { candidate: 'candidate:2 1 udp 1686052607 203.0.113.1 50000 typ srflx network-id 1', sdpMid: '0', sdpMLineIndex: 0 }
        ];

        const cleaned = sanitizeCandidates(candidates);
        expect(cleaned.length).toBe(2);
        expect(cleaned[0]).toBe('candidate:1 1 udp 2122260223 192.168.1.1 50000 typ host');
        expect(cleaned[1].c).toBe('candidate:2 1 udp 1686052607 203.0.113.1 50000 typ srflx');
    });

    it('compresses and decompresses session token with high compression ratio', () => {
        const payload = {
            type: 'offer',
            sdp: sampleRawSDP,
            candidates: [
                { candidate: 'candidate:1 1 udp 2122260223 192.168.1.105 52341 typ host', sdpMid: '0', sdpMLineIndex: 0 }
            ]
        };

        const legacyBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
        const compressed = compressSessionToken(payload);

        // Verify URL safety (lz-string URI encoded character set: letters, digits, +, -, $)
        expect(compressed).toMatch(/^[A-Za-z0-9_\+\-$]+$/);
        // Verify size reduction
        expect(compressed.length).toBeLessThan(legacyBase64.length * 0.7);

        // Decompress
        const restored = decompressSessionToken(compressed);
        expect(restored.type).toBe('offer');
        expect(restored.sdp).toContain('m=application 9 UDP/DTLS/SCTP webrtc-datachannel');
        expect(restored.candidates.length).toBe(1);
        expect(restored.candidates[0].candidate).toContain('typ host');
    });

    it('handles backwards-compatibility with legacy uncompressed Base64 tokens', () => {
        const legacyPayload = {
            type: 'answer',
            sdp: sampleRawSDP
        };
        const legacyBase64 = Buffer.from(JSON.stringify(legacyPayload)).toString('base64');

        const restored = decompressSessionToken(legacyBase64);
        expect(restored.type).toBe('answer');
        expect(restored.sdp).toContain('m=application');
    });

    it('robustly throws errors on corrupted or invalid tokens', () => {
        expect(() => decompressSessionToken('')).toThrow('token must be a non-empty string');
        expect(() => decompressSessionToken(null)).toThrow('token must be a non-empty string');
        expect(() => decompressSessionToken('!!!NotAValidToken---###')).toThrow('Failed to decode token');

        // Invalid JSON or invalid type
        const invalidTypeJSON = Buffer.from(JSON.stringify({ type: 'invalid_mode', sdp: 'test' })).toString('base64');
        expect(() => decompressSessionToken(invalidTypeJSON)).toThrow('invalid or missing session type');

        // Missing SDP
        const missingSDPJSON = Buffer.from(JSON.stringify({ type: 'offer' })).toString('base64');
        expect(() => decompressSessionToken(missingSDPJSON)).toThrow('missing or invalid SDP string');
    });
});
