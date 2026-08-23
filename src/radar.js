/**
 * Tactical Radar Minimap System
 * Renders real-time 360-degree radar on canvas tracking hostiles, vehicles, buildings, ladders, and medkits.
 */

export class TacticalRadar {
    constructor(canvas, radius = 85) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.size = radius * 2;
        this.radius = radius;
        this.radarRange = 65; // meters in world coordinates
        this.sweepAngle = 0;

        this.canvas.width = this.size;
        this.canvas.height = this.size;
    }

    worldToRadar(worldX, worldZ, playerX, playerZ, playerYaw) {
        const dx = worldX - playerX;
        const dz = worldZ - playerZ;

        // Heading-Up Projection: Player facing direction is always straight UP on the radar
        const relRight = dx * Math.cos(playerYaw) - dz * Math.sin(playerYaw);
        const relForward = -dx * Math.sin(playerYaw) - dz * Math.cos(playerYaw);

        const scale = this.radius / this.radarRange;
        const screenX = this.radius + relRight * scale;
        const screenY = this.radius - relForward * scale;

        const distSq = (screenX - this.radius) ** 2 + (screenY - this.radius) ** 2;
        return {
            x: screenX,
            y: screenY,
            inRange: distSq <= (this.radius - 4) ** 2
        };
    }

    render({
        playerPos,
        playerYaw,
        enemies = [],
        vehicles = [],
        buildings = [],
        ladders = [],
        medkits = [],
        grenades = []
    }, delta = 0.016) {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const cx = this.radius;
        const cy = this.radius;
        const r = this.radius - 2;

        this.sweepAngle = (this.sweepAngle + delta * 3.2) % (Math.PI * 2);

        // Clear
        ctx.clearRect(0, 0, this.size, this.size);

        // Clip to circular radar
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();

        // 1. Radar Background & Glow
        const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        bgGrad.addColorStop(0, 'rgba(8, 20, 30, 0.85)');
        bgGrad.addColorStop(0.7, 'rgba(5, 14, 22, 0.92)');
        bgGrad.addColorStop(1, 'rgba(2, 6, 10, 0.98)');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, this.size, this.size);

        // 2. Concentric Range Rings
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.18)';
        ctx.lineWidth = 1;

        const rings = [0.33, 0.66, 1.0];
        for (const frac of rings) {
            ctx.beginPath();
            ctx.arc(cx, cy, r * frac, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Crosshairs
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, this.size);
        ctx.moveTo(0, cy);
        ctx.lineTo(this.size, cy);
        ctx.stroke();

        // 3. Rotating Sweep Line with Fade Sector
        const sweepGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        sweepGrad.addColorStop(0, 'rgba(0, 229, 255, 0.35)');
        sweepGrad.addColorStop(1, 'rgba(0, 229, 255, 0.05)');

        ctx.fillStyle = sweepGrad;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, this.sweepAngle - 0.45, this.sweepAngle, false);
        ctx.closePath();
        ctx.fill();

        // 4. Buildings Footprints
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
        ctx.lineWidth = 1.2;
        ctx.fillStyle = 'rgba(0, 229, 255, 0.06)';

        for (const b of buildings) {
            const corners = [
                { x: b.x - b.w / 2, z: b.z - b.d / 2 },
                { x: b.x + b.w / 2, z: b.z - b.d / 2 },
                { x: b.x + b.w / 2, z: b.z + b.d / 2 },
                { x: b.x - b.w / 2, z: b.z + b.d / 2 }
            ].map(c => this.worldToRadar(c.x, c.z, playerPos.x, playerPos.z, playerYaw));

            ctx.beginPath();
            ctx.moveTo(corners[0].x, corners[0].y);
            for (let i = 1; i < corners.length; i++) {
                ctx.lineTo(corners[i].x, corners[i].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        // 5. Ladders (High-Contrast Green Glyph Icons)
        for (const lad of ladders) {
            const pt = this.worldToRadar(lad.x, lad.z, playerPos.x, playerPos.z, playerYaw);
            if (pt.inRange) {
                ctx.fillStyle = '#10b981';
                // Ladder rails
                ctx.fillRect(pt.x - 3.5, pt.y - 4.5, 1.8, 9);
                ctx.fillRect(pt.x + 1.7, pt.y - 4.5, 1.8, 9);
                // Ladder rungs
                ctx.fillRect(pt.x - 3.5, pt.y - 2.5, 7, 1.5);
                ctx.fillRect(pt.x - 3.5, pt.y + 1.5, 7, 1.5);
            }
        }

        // 6. Medkits (Glowing Green Crosses)
        for (const med of medkits) {
            const pt = this.worldToRadar(med.x, med.z, playerPos.x, playerPos.z, playerYaw);
            if (pt.inRange) {
                ctx.fillStyle = '#34d399';
                ctx.fillRect(pt.x - 1, pt.y - 4, 2, 8);
                ctx.fillRect(pt.x - 4, pt.y - 1, 8, 2);
            }
        }

        // 7. Active Grenades (Pulsing Orange)
        for (const g of grenades) {
            const pt = this.worldToRadar(g.x, g.z, playerPos.x, playerPos.z, playerYaw);
            if (pt.inRange) {
                ctx.fillStyle = '#ff9900';
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 8. Hostile Vehicles (Yellow/Red Rectangles)
        for (const car of vehicles) {
            const pt = this.worldToRadar(car.position.x, car.position.z, playerPos.x, playerPos.z, playerYaw);
            if (pt.inRange) {
                ctx.fillStyle = '#fbbf24';
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 1.5;
                ctx.fillRect(pt.x - 4, pt.y - 4, 8, 8);
                ctx.strokeRect(pt.x - 4, pt.y - 4, 8, 8);
            }
        }

        // 9. Hostile Enemies (Gunners = Red, Knife Rushers = Orange)
        for (const enemy of enemies) {
            if (!enemy.parent) continue;
            const pt = this.worldToRadar(enemy.position.x, enemy.position.z, playerPos.x, playerPos.z, playerYaw);
            if (pt.inRange) {
                const isGunner = enemy.userData.archetype === 'gunner';
                ctx.fillStyle = isGunner ? '#ef4444' : '#f97316';
                ctx.shadowColor = ctx.fillStyle;
                ctx.shadowBlur = 4;

                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }

        // 10. Center Player Icon (Cyan Chevron)
        ctx.fillStyle = '#00e5ff';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 6);
        ctx.lineTo(cx - 4, cy + 4);
        ctx.lineTo(cx, cy + 2);
        ctx.lineTo(cx + 4, cy + 4);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Outer Metallic Rim
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        // Cardinal Markers (N, E, S, W) rotated by player yaw
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = '#00e5ff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const dirs = [
            { label: 'N', angle: 0 },
            { label: 'E', angle: Math.PI / 2 },
            { label: 'S', angle: Math.PI },
            { label: 'W', angle: -Math.PI / 2 }
        ];

        for (const d of dirs) {
            const textAngle = d.angle - playerYaw - Math.PI / 2;
            const tx = cx + Math.cos(textAngle) * (r - 9);
            const ty = cy + Math.sin(textAngle) * (r - 9);
            ctx.fillText(d.label, tx, ty);
        }
    }
}
