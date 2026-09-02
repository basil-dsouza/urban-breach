/**
 * Tactical Topographic Minimap System
 * Renders real-time 360-degree topographic minimap with terrain contours, mountains/hills,
 * rivers, lakes, roads, building footprints, and combat hostiles.
 */

export class TacticalRadar {
    constructor(canvas, radius = 90) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.size = radius * 2;
        this.radius = radius;
        this.radarRange = 120; // 120 meters in world coordinates
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
            inRange: distSq <= (this.radius - 3) ** 2
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
        grenades = [],
        waterBodies = [],
        riverWaypoints = [],
        getTerrainHeight = null
    }, delta = 0.016) {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const cx = this.radius;
        const cy = this.radius;
        const r = this.radius - 2;
        const scale = this.radius / this.radarRange;

        this.sweepAngle = (this.sweepAngle + delta * 2.8) % (Math.PI * 2);

        // Clear
        ctx.clearRect(0, 0, this.size, this.size);

        // Clip to circular / tactical rounded minimap
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();

        // 1. Tactical Ground Base Shading
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, this.size, this.size);

        // 2. Topographic Terrain Elevation Grid (Hills, Mountains, Valleys)
        if (getTerrainHeight) {
            const stepMeters = 16;
            const steps = Math.ceil(this.radarRange / stepMeters) + 1;
            const pxBase = Math.floor(playerPos.x / stepMeters) * stepMeters;
            const pzBase = Math.floor(playerPos.z / stepMeters) * stepMeters;

            for (let gx = -steps; gx <= steps; gx++) {
                for (let gz = -steps; gz <= steps; gz++) {
                    const wx = pxBase + gx * stepMeters;
                    const wz = pzBase + gz * stepMeters;
                    const elev = getTerrainHeight(wx, wz);

                    if (Math.abs(elev) > 0.5) {
                        const pt = this.worldToRadar(wx, wz, playerPos.x, playerPos.z, playerYaw);
                        const radiusPx = stepMeters * scale * 0.9;

                        if (elev > 8.0) {
                            // High Alpine Mountains & Plateaus (Rocky slate / charcoal)
                            ctx.fillStyle = 'rgba(100, 116, 139, 0.45)';
                        } else if (elev > 3.0) {
                            // Rolling Hills & Ridges (Olive ridge)
                            ctx.fillStyle = 'rgba(74, 107, 65, 0.35)';
                        } else if (elev < -0.5) {
                            // River Valley / Depression
                            ctx.fillStyle = 'rgba(2, 132, 199, 0.25)';
                        } else {
                            ctx.fillStyle = 'rgba(30, 41, 59, 0.3)';
                        }

                        ctx.beginPath();
                        ctx.arc(pt.x, pt.y, radiusPx, 0, Math.PI * 2);
                        ctx.fill();

                        // Topographic Elevation Contour Lines
                        if (elev > 4.0) {
                            ctx.strokeStyle = elev > 8.0 ? 'rgba(148, 163, 184, 0.3)' : 'rgba(74, 222, 128, 0.25)';
                            ctx.lineWidth = 1;
                            ctx.beginPath();
                            ctx.arc(pt.x, pt.y, radiusPx * 0.6, 0, Math.PI * 2);
                            ctx.stroke();
                        }
                    }
                }
            }
        }

        // 3. Water Bodies (Lakes, Alpine Reservoir, Eastern Delta)
        const defaultLakes = waterBodies.length > 0 ? waterBodies : [
            { name: 'alpine_reservoir', x: -270, z: 270, radius: 45 },
            { name: 'emerald_lake', x: -90, z: 260, radius: 34 },
            { name: 'eastern_delta', x: 260, z: 180, radius: 38 }
        ];

        for (const lake of defaultLakes) {
            const pt = this.worldToRadar(lake.x, lake.z, playerPos.x, playerPos.z, playerYaw);
            const radPx = lake.radius * scale;

            ctx.fillStyle = '#0284c7';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, radPx, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        // 4. Winding Valley River Channel
        const defaultWaypoints = riverWaypoints.length > 0 ? riverWaypoints : [
            { x: -180, z: 230 },
            { x: -140, z: 245 },
            { x: -90, z: 260 },
            { x: -30, z: 275 },
            { x: 40, z: 260 },
            { x: 120, z: 230 },
            { x: 200, z: 195 },
            { x: 260, z: 180 }
        ];

        if (defaultWaypoints.length > 1) {
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 10 * scale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();

            const p0 = this.worldToRadar(defaultWaypoints[0].x, defaultWaypoints[0].z, playerPos.x, playerPos.z, playerYaw);
            ctx.moveTo(p0.x, p0.y);

            for (let i = 1; i < defaultWaypoints.length; i++) {
                const pi = this.worldToRadar(defaultWaypoints[i].x, defaultWaypoints[i].z, playerPos.x, playerPos.z, playerYaw);
                ctx.lineTo(pi.x, pi.y);
            }
            ctx.stroke();

            // Shoreline highlight
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // 5. Major Highway Grid & Roads
        const roads = [
            // Metro Central Avenues & Boulevards
            { x1: 0, z1: -480, x2: 0, z2: 480, w: 16 },
            { x1: -120, z1: -480, x2: -120, z2: 480, w: 14 },
            { x1: 120, z1: -480, x2: 120, z2: 480, w: 14 },
            { x1: -480, z1: 0, x2: 480, z2: 0, w: 16 },
            { x1: -480, z1: -120, x2: 480, z2: -120, w: 14 },
            { x1: -480, z1: 120, x2: 480, z2: 120, w: 14 },
            // Regional District Connecting Roads
            { x1: -230, z1: 185, x2: 230, z2: 185, w: 8.5 }, // North Lakeside Haven Road
            { x1: 280, z1: -145, x2: 280, z2: 65, w: 9.5 },  // East Port City Ave
            { x1: 195, z1: -40, x2: 365, z2: -40, w: 9.5 },  // East Port Freight Blvd
            { x1: -70, z1: -340, x2: 190, z2: -340, w: 9.5 }, // South Metro Tech Blvd
            { x1: -285, z1: 150, x2: -285, z2: 290, w: 7.5 }, // Pinecrest Mountain Road
            { x1: -185, z1: -105, x2: -185, z2: 105, w: 8.5 }, // Palm Valley Road
            { x1: -185, z1: -260, x2: -185, z2: -140, w: 8.5 }, // Oakridge Suburb Road
            { x1: 310, z1: 170, x2: 310, z2: 290, w: 7.5 }   // Delta Cross River Road
        ];

        for (const rd of roads) {
            const p1 = this.worldToRadar(rd.x1, rd.z1, playerPos.x, playerPos.z, playerYaw);
            const p2 = this.worldToRadar(rd.x2, rd.z2, playerPos.x, playerPos.z, playerYaw);

            ctx.strokeStyle = '#334155';
            ctx.lineWidth = Math.max(3, rd.w * scale);
            ctx.lineCap = 'square';
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            // Road center dashed line
            ctx.strokeStyle = 'rgba(241, 245, 249, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }

        // 6. Buildings & Landmark Footprints
        for (const b of buildings) {
            const halfW = (b.w || 14) / 2;
            const halfD = (b.d || 14) / 2;
            const rot = b.rotY || 0;
            const cosR = Math.cos(rot);
            const sinR = Math.sin(rot);

            const corners = [
                { x: b.x + (-halfW * cosR - -halfD * sinR), z: b.z + (-halfW * sinR + -halfD * cosR) },
                { x: b.x + (halfW * cosR - -halfD * sinR), z: b.z + (halfW * sinR + -halfD * cosR) },
                { x: b.x + (halfW * cosR - halfD * sinR), z: b.z + (halfW * sinR + halfD * cosR) },
                { x: b.x + (-halfW * cosR - halfD * sinR), z: b.z + (-halfW * sinR + halfD * cosR) }
            ].map(c => this.worldToRadar(c.x, c.z, playerPos.x, playerPos.z, playerYaw));

            let strokeCol = 'rgba(0, 229, 255, 0.5)';
            let fillCol = 'rgba(0, 229, 255, 0.15)';

            if (b.style === 'skyscraper') {
                strokeCol = '#00cec9';
                fillCol = 'rgba(0, 206, 201, 0.35)';
            } else if (b.style === 'warehouse') {
                strokeCol = '#94a3b8';
                fillCol = 'rgba(148, 163, 184, 0.3)';
            } else if (b.style === 'hospital') {
                strokeCol = '#ef4444';
                fillCol = 'rgba(239, 68, 68, 0.35)';
            } else if (b.style === 'police') {
                strokeCol = '#3b82f6';
                fillCol = 'rgba(59, 130, 246, 0.35)';
            } else if (b.style === 'donut') {
                strokeCol = '#f59e0b';
                fillCol = 'rgba(245, 158, 11, 0.35)';
            } else if (b.style === 'villa' || b.style === 'cottage' || b.style === 'cabin') {
                strokeCol = '#cbd5e1';
                fillCol = 'rgba(203, 213, 225, 0.2)';
            }

            ctx.fillStyle = fillCol;
            ctx.strokeStyle = strokeCol;
            ctx.lineWidth = 1.2;

            ctx.beginPath();
            ctx.moveTo(corners[0].x, corners[0].y);
            for (let i = 1; i < corners.length; i++) {
                ctx.lineTo(corners[i].x, corners[i].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        // 7. Tactical Ladders (Emerald Green Icon)
        for (const lad of ladders) {
            const pt = this.worldToRadar(lad.x, lad.z, playerPos.x, playerPos.z, playerYaw);
            if (pt.inRange) {
                ctx.fillStyle = '#10b981';
                ctx.fillRect(pt.x - 3.5, pt.y - 4.5, 1.8, 9);
                ctx.fillRect(pt.x + 1.7, pt.y - 4.5, 1.8, 9);
                ctx.fillRect(pt.x - 3.5, pt.y - 2.5, 7, 1.5);
                ctx.fillRect(pt.x - 3.5, pt.y + 1.5, 7, 1.5);
            }
        }

        // 8. Medkits (Glowing Green Crosses)
        for (const med of medkits) {
            const pt = this.worldToRadar(med.x, med.z, playerPos.x, playerPos.z, playerYaw);
            if (pt.inRange) {
                ctx.fillStyle = '#34d399';
                ctx.fillRect(pt.x - 1, pt.y - 4, 2, 8);
                ctx.fillRect(pt.x - 4, pt.y - 1, 8, 2);
            }
        }

        // 9. Active Grenades (Pulsing Red/Amber)
        for (const g of grenades) {
            const pt = this.worldToRadar(g.x, g.z, playerPos.x, playerPos.z, playerYaw);
            if (pt.inRange) {
                ctx.fillStyle = '#f97316';
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
        }

        // 10. Hostile Vehicles (Yellow/Red Box)
        for (const car of vehicles) {
            const pt = this.worldToRadar(car.position.x, car.position.z, playerPos.x, playerPos.z, playerYaw);
            if (pt.inRange) {
                ctx.fillStyle = '#fbbf24';
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 1.5;
                ctx.fillRect(pt.x - 4.5, pt.y - 4.5, 9, 9);
                ctx.strokeRect(pt.x - 4.5, pt.y - 4.5, 9, 9);
            }
        }

        // 11. Hostile Enemies (Gunners = Red, Rushers = Orange)
        for (const enemy of enemies) {
            if (!enemy.parent) continue;
            const pt = this.worldToRadar(enemy.position.x, enemy.position.z, playerPos.x, playerPos.z, playerYaw);
            if (pt.inRange) {
                const isGunner = enemy.userData.archetype === 'gunner';
                ctx.fillStyle = isGunner ? '#ef4444' : '#f97316';
                ctx.shadowColor = ctx.fillStyle;
                ctx.shadowBlur = 5;

                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }

        // 12. Range Rings & Concentric Markers
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.2)';
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

        // 13. Rotating Radar Sweep Line
        const sweepGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        sweepGrad.addColorStop(0, 'rgba(0, 229, 255, 0.35)');
        sweepGrad.addColorStop(1, 'rgba(0, 229, 255, 0.02)');
        ctx.fillStyle = sweepGrad;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, this.sweepAngle - 0.45, this.sweepAngle, false);
        ctx.closePath();
        ctx.fill();

        // 14. Player Forward Vision Cone (FOV)
        ctx.fillStyle = 'rgba(0, 229, 255, 0.12)';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - 24, cy - 50);
        ctx.lineTo(cx + 24, cy - 50);
        ctx.closePath();
        ctx.fill();

        // 15. Center Player Icon (Cyan Chevron)
        ctx.fillStyle = '#00e5ff';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 7);
        ctx.lineTo(cx - 5, cy + 5);
        ctx.lineTo(cx, cy + 2.5);
        ctx.lineTo(cx + 5, cy + 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();

        // Outer Tactical Bezel Rim
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        // Cardinal Markers (N, E, S, W) rotated by player yaw
        ctx.font = 'bold 10px monospace';
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
            const tx = cx + Math.cos(textAngle) * (r - 10);
            const ty = cy + Math.sin(textAngle) * (r - 10);
            ctx.fillText(d.label, tx, ty);
        }
    }
}
