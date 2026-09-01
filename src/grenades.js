/**
 * Grenade Physics, Ground Collision and Explosion System
 */

export const GRENADE_CONFIG = {
    radius: 0.22,
    fuseTime: 3.0,
    throwSpeed: 19,
    throwPitchBoost: 6.5,
    gravity: 22,
    restitution: 0.52,
    bounceFriction: 0.75,
    rollingDamping: 3.5,
    stopBounceThreshold: 0.8,
    blastRadius: 7.5,
    maxBlastDamage: 120
};

export class GrenadePhysics {
    constructor(config = GRENADE_CONFIG) {
        this.config = { ...GRENADE_CONFIG, ...config };
    }

    createGrenadeData(cameraPos, cameraDir) {
        const velX = cameraDir.x * this.config.throwSpeed;
        const velY = cameraDir.y * this.config.throwSpeed + this.config.throwPitchBoost;
        const velZ = cameraDir.z * this.config.throwSpeed;

        return {
            x: cameraPos.x,
            y: cameraPos.y,
            z: cameraPos.z,
            vx: velX,
            vy: velY,
            vz: velZ,
            life: this.config.fuseTime,
            isGrounded: false,
            radius: this.config.radius
        };
    }

    /**
     * Updates grenade physics with ground & obstacle collision
     * @param {Object} grenade - Grenade state data
     * @param {number} delta - Frame delta time in seconds
     * @param {Function} getGroundHeight - Function (x, z) => highest surface Y
     * @param {Array} obstacles - Array of obstacle bounding boxes {x, z, w, d, bottom, top}
     * @returns {boolean} True if grenade is still active, False if exploded
     */
    update(grenade, delta, getGroundHeight, obstacles = []) {
        grenade.life -= delta;
        if (grenade.life <= 0) {
            return false; // Exploded
        }

        // Apply gravity
        if (!grenade.isGrounded) {
            grenade.vy -= this.config.gravity * delta;
        }

        // Potential next position
        let nextX = grenade.x + grenade.vx * delta;
        let nextY = grenade.y + grenade.vy * delta;
        let nextZ = grenade.z + grenade.vz * delta;

        // Obstacle side-wall collisions
        for (const obs of obstacles) {
            let localNextX = nextX - obs.x;
            let localNextZ = nextZ - obs.z;
            if (obs.rotY) {
                const cosA = Math.cos(-obs.rotY);
                const sinA = Math.sin(-obs.rotY);
                const dx = nextX - obs.x;
                const dz = nextZ - obs.z;
                localNextX = cosA * dx - sinA * dz;
                localNextZ = sinA * dx + cosA * dz;
            }

            const halfW = obs.w / 2 + grenade.radius;
            const halfD = obs.d / 2 + grenade.radius;

            if (
                Math.abs(localNextX) <= halfW &&
                Math.abs(localNextZ) <= halfD &&
                nextY >= (obs.bottom !== undefined ? obs.bottom : 0) &&
                nextY < (obs.top !== undefined ? obs.top : 20) - 0.1
            ) {
                // Determine collision normal from closest face
                const overlapX = halfW - Math.abs(localNextX);
                const overlapZ = halfD - Math.abs(localNextZ);

                if (overlapX < overlapZ) {
                    grenade.vx = -grenade.vx * this.config.restitution;
                } else {
                    grenade.vz = -grenade.vz * this.config.restitution;
                }
            }
        }

        // Ground / Rooftop collision check
        const groundY = typeof getGroundHeight === 'function' ? getGroundHeight(nextX, nextZ) : 0;
        const floorY = groundY + grenade.radius;

        if (nextY <= floorY) {
            nextY = floorY;

            if (Math.abs(grenade.vy) > this.config.stopBounceThreshold) {
                // Bounce
                grenade.vy = -grenade.vy * this.config.restitution;
                grenade.vx *= this.config.bounceFriction;
                grenade.vz *= this.config.bounceFriction;
                grenade.isGrounded = false;
            } else {
                // Rest on ground & roll
                grenade.vy = 0;
                grenade.isGrounded = true;
                const rollDamp = Math.max(0, 1 - this.config.rollingDamping * delta);
                grenade.vx *= rollDamp;
                grenade.vz *= rollDamp;
            }
        } else {
            grenade.isGrounded = false;
        }

        grenade.x = nextX;
        grenade.y = nextY;
        grenade.z = nextZ;

        return true;
    }

    /**
     * Calculates blast damage based on distance
     */
    calculateDamage(distance) {
        if (distance >= this.config.blastRadius) return 0;
        const factor = 1 - (distance / this.config.blastRadius);
        return Math.max(1, Math.floor(this.config.maxBlastDamage * factor));
    }
}
