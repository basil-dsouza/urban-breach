import { describe, it, expect } from 'vitest';

describe('Player Crouching & Edge Lock Mechanics', () => {
    // Simulated getSimpleGround function with a 15m building between -10 and +10
    const getSimpleGround = (x, z) => {
        if (x >= -10 && x <= 10 && z >= -10 && z <= 10) {
            return 15.0; // Rooftop height
        }
        return 0.0; // Street ground level
    };

    function simulateMovementStep({
        currentPos,
        moveDir,
        speed = 3.4,
        delta = 0.016,
        isCrouching = false,
        grounded = true,
        obstacles = []
    }) {
        const nextX = currentPos.x + moveDir.x * speed * delta;
        const nextZ = currentPos.z + moveDir.z * speed * delta;
        const currentGround = getSimpleGround(currentPos.x, currentPos.z);
        const playerRadius = 0.35;

        let collidesX = false;
        for (const obs of obstacles) {
            const halfW = obs.w / 2 + playerRadius;
            const halfD = obs.d / 2 + playerRadius;
            if (
                nextX >= obs.x - halfW && nextX <= obs.x + halfW &&
                currentPos.z >= obs.z - halfD && currentPos.z <= obs.z + halfD
            ) {
                collidesX = true;
                break;
            }
        }

        if (!collidesX && isCrouching && grounded) {
            const probeDistX = Math.sign(moveDir.x) * 0.28;
            const groundNextX = getSimpleGround(nextX + probeDistX, currentPos.z);
            if (currentGround - groundNextX > 0.85) {
                collidesX = true; // Block walking off ledge
            }
        }

        let collidesZ = false;
        for (const obs of obstacles) {
            const halfW = obs.w / 2 + playerRadius;
            const halfD = obs.d / 2 + playerRadius;
            if (
                currentPos.x >= obs.x - halfW && currentPos.x <= obs.x + halfW &&
                nextZ >= obs.z - halfD && nextZ <= obs.z + halfD
            ) {
                collidesZ = true;
                break;
            }
        }

        if (!collidesZ && isCrouching && grounded) {
            const probeDistZ = Math.sign(moveDir.z) * 0.28;
            const groundNextZ = getSimpleGround(currentPos.x, nextZ + probeDistZ);
            if (currentGround - groundNextZ > 0.85) {
                collidesZ = true; // Block walking off ledge
            }
        }

        return {
            x: collidesX ? currentPos.x : nextX,
            z: collidesZ ? currentPos.z : nextZ,
            stoppedByEdgeX: collidesX,
            stoppedByEdgeZ: collidesZ
        };
    }

    it('should prevent crouched player from walking off a high rooftop edge', () => {
        // Player is at x = 9.9m on a 15m high rooftop (edge is at x = 10.0m)
        const startPos = { x: 9.9, z: 0.0 };
        const moveDir = { x: 1.0, z: 0.0 }; // Moving towards edge (+X)

        const result = simulateMovementStep({
            currentPos: startPos,
            moveDir,
            isCrouching: true,
            grounded: true
        });

        // Edge lock should trigger and freeze X position
        expect(result.stoppedByEdgeX).toBe(true);
        expect(result.x).toBe(9.9);
    });

    it('should allow standing player to fall off edges normally', () => {
        const startPos = { x: 9.9, z: 0.0 };
        const moveDir = { x: 1.0, z: 0.0 };

        const result = simulateMovementStep({
            currentPos: startPos,
            moveDir,
            isCrouching: false, // Standing
            grounded: true
        });

        expect(result.stoppedByEdgeX).toBe(false);
        expect(result.x).toBeGreaterThan(9.9);
    });

    it('should allow smooth diagonal sliding along the edge when crouching', () => {
        // Player at edge (+X) moving diagonally (+X, +Z)
        const startPos = { x: 9.9, z: 0.0 };
        const moveDir = { x: 0.707, z: 0.707 };

        const result = simulateMovementStep({
            currentPos: startPos,
            moveDir,
            isCrouching: true,
            grounded: true
        });

        // X movement is locked at the edge, but Z movement glides smoothly
        expect(result.stoppedByEdgeX).toBe(true);
        expect(result.x).toBe(9.9);
        expect(result.stoppedByEdgeZ).toBe(false);
        expect(result.z).toBeGreaterThan(0.0);
    });

    it('should allow free movement across flat ground and small steps (< 0.85m)', () => {
        const startPos = { x: 0.0, z: 0.0 };
        const moveDir = { x: 1.0, z: 0.0 };

        const result = simulateMovementStep({
            currentPos: startPos,
            moveDir,
            isCrouching: true,
            grounded: true
        });

        expect(result.stoppedByEdgeX).toBe(false);
        expect(result.x).toBeGreaterThan(0.0);
    });
});
