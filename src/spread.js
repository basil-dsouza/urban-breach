/**
 * Dynamic Bullet Spread and Crosshair Calculation (Balanced Hip-Fire Spread + 0 Laser ADS)
 */

export const SPREAD_CONFIG = {
    baseStanding: 7.0,
    baseMoving: 12.0,
    baseSprinting: 18.0,
    baseCrouching: 3.5,
    baseCrouchMoving: 6.0,
    baseAiming: 0.0, // Pinpoint laser precision when aiming
    maxSpread: 26.0,
    fireSpreadRate: 20.0, // spread added per second of continuous fire
    firePerShotKick: 2.0, // immediate kick per shot
    recoverySpeed: 16.0,  // recovery rate back to base spread per second
    spreadFactor: 0.0011  // trajectory angle dispersion factor
};

export class SpreadSystem {
    constructor(config = SPREAD_CONFIG) {
        this.config = { ...SPREAD_CONFIG, ...config };
        this.currentSpread = this.config.baseStanding;
        this.targetBase = this.config.baseStanding;
        this.isFiring = false;
    }

    setWeaponConfig(config = {}) {
        if (!config) return;
        this.config = { ...SPREAD_CONFIG, ...config };
        this.currentSpread = this.config.baseStanding;
    }

    getBaseSpread({ moving = false, sprinting = false, aiming = false, crouching = false } = {}) {
        if (aiming) return this.config.baseAiming;
        if (crouching && moving) return this.config.baseCrouchMoving !== undefined ? this.config.baseCrouchMoving : 6.0;
        if (crouching) return this.config.baseCrouching !== undefined ? this.config.baseCrouching : 3.5;
        if (sprinting && moving) return this.config.baseSprinting;
        if (moving) return this.config.baseMoving;
        return this.config.baseStanding;
    }

    onFire(aiming = false, crouching = false) {
        if (aiming) return; // Zero kick when aimed down sights
        const kick = crouching ? this.config.firePerShotKick * 0.65 : this.config.firePerShotKick;
        this.currentSpread = Math.min(
            this.config.maxSpread,
            this.currentSpread + kick
        );
    }

    update(delta, { isFiring = false, moving = false, sprinting = false, aiming = false, crouching = false } = {}) {
        this.targetBase = this.getBaseSpread({ moving, sprinting, aiming, crouching });

        if (aiming) {
            // Instantly snap to 0 spread when aiming
            this.currentSpread = Math.max(0, this.currentSpread - this.config.recoverySpeed * 3 * delta);
            return this.currentSpread;
        }

        if (isFiring) {
            // Continuous fire buildup with crouching stabilization
            const spreadRate = crouching ? this.config.fireSpreadRate * 0.7 : this.config.fireSpreadRate;
            this.currentSpread = Math.min(
                this.config.maxSpread,
                this.currentSpread + spreadRate * delta
            );
        } else {
            // Recovery back to target base spread
            if (this.currentSpread > this.targetBase) {
                this.currentSpread = Math.max(
                    this.targetBase,
                    this.currentSpread - this.config.recoverySpeed * delta
                );
            } else if (this.currentSpread < this.targetBase) {
                this.currentSpread = Math.min(
                    this.targetBase,
                    this.currentSpread + this.config.recoverySpeed * 2 * delta
                );
            }
        }

        return this.currentSpread;
    }

    getCrosshairPositions() {
        const spread = this.currentSpread;
        return {
            spread,
            top: `translate(-1px, -${spread + 8}px)`,
            bottom: `translate(-1px, ${spread}px)`,
            left: `translate(-${spread + 8}px, -1px)`,
            right: `translate(${spread}px, -1px)`
        };
    }

    /**
     * Calculates bullet trajectory with precision dispersion
     */
    calculateSpreadDirection(forward, right, up, customSpread = null) {
        const spreadVal = customSpread !== null ? customSpread : this.currentSpread;
        if (spreadVal <= 0.1) {
            // Absolute laser straight shot when aiming
            return {
                x: forward.x,
                y: forward.y,
                z: forward.z
            };
        }

        const angleRadius = spreadVal * this.config.spreadFactor;
        const r = Math.sqrt(Math.random()) * angleRadius;
        const theta = Math.random() * 2 * Math.PI;

        const offsetX = r * Math.cos(theta);
        const offsetY = r * Math.sin(theta);

        const dirX = forward.x + right.x * offsetX + up.x * offsetY;
        const dirY = forward.y + right.y * offsetX + up.y * offsetY;
        const dirZ = forward.z + right.z * offsetX + up.z * offsetY;

        const len = Math.hypot(dirX, dirY, dirZ) || 1;
        return {
            x: dirX / len,
            y: dirY / len,
            z: dirZ / len
        };
    }
}
