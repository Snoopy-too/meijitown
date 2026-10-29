// Project Meiji - Landscape Backdrop & Mountain Perimeter (backdropManager.js)
// Phase 2 /artisan: Concave Mount Fuji Stratovolcano, Multi-Strata Ridges & Foothill Spurs (<= 280 lines, < 4,000 polys)

import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class BackdropManager {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.group.name = 'backdrop_environment';

        const groundColor = (CONFIG.COLORS && CONFIG.COLORS.GROUND) || 0x5a7d4b;
        this.skirtMaterial = new THREE.MeshStandardMaterial({ color: groundColor, roughness: 0.92, metalness: 0.02, flatShading: true });
        this.foothillMaterial = new THREE.MeshStandardMaterial({ color: 0x35523a, roughness: 0.88, metalness: 0.02, flatShading: true });
        this.mountainMaterial = new THREE.MeshStandardMaterial({ color: 0x465b63, roughness: 0.82, metalness: 0.05, flatShading: true });
        this.fujiBodyMaterial = new THREE.MeshStandardMaterial({ color: 0x3b4d6b, roughness: 0.78, metalness: 0.06, flatShading: true });
        this.snowMaterial = new THREE.MeshStandardMaterial({ color: 0xf4f6f9, roughness: 0.55, metalness: 0.08, flatShading: true });
        this.riverMaterial = new THREE.MeshStandardMaterial({ color: 0x2d6378, roughness: 0.22, metalness: 0.18, transparent: true, opacity: 0.92 });

        this.buildExtendedSkirt();
        this.buildMountainRidges();
        this.buildRiverRibbon();

        this.scene.add(this.group);
    }

    static init(scene) {
        return new BackdropManager(scene);
    }

    // 1. Extended rolling valley skirt sloping upward into foothill terraces
    buildExtendedSkirt() {
        const segs = 32;
        const size = 280;
        const skirtGeo = new THREE.PlaneGeometry(size, size, segs, segs);
        skirtGeo.rotateX(-Math.PI / 2);

        const cx = (CONFIG.GRID_WIDTH * CONFIG.TILE_SIZE) / 2;
        const cz = (CONFIG.GRID_HEIGHT * CONFIG.TILE_SIZE) / 2;
        const halfPlayable = (CONFIG.GRID_WIDTH * CONFIG.TILE_SIZE) / 2;

        const pos = skirtGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const vx = pos.getX(i);
            const vz = pos.getZ(i);

            const dx = Math.max(0, Math.abs(vx) - halfPlayable);
            const dz = Math.max(0, Math.abs(vz) - halfPlayable);
            const distFromPlayable = Math.hypot(dx, dz);

            if (distFromPlayable <= 0.1) {
                pos.setY(i, -0.55);
            } else {
                const normalized = Math.min(1.0, distFromPlayable / 95);
                const elevation = Math.pow(normalized, 1.65) * 15.0;
                const ridgeWave = Math.sin((vx + cx) * 0.07) * Math.cos((vz + cz) * 0.07) * 2.2 * normalized;
                const detailWave = Math.sin((vx * 0.19) + (vz * 0.15)) * 0.85 * normalized;
                pos.setY(i, -0.55 + elevation + ridgeWave + detailWave);
            }
        }

        skirtGeo.computeVertexNormals();
        const skirtMesh = new THREE.Mesh(skirtGeo, this.skirtMaterial);
        skirtMesh.position.set(cx, 0, cz);
        skirtMesh.receiveShadow = true;
        skirtMesh.userData = { isBackdrop: true, ignoreRaycast: true };
        this.group.add(skirtMesh);
    }

    // Helper: Sculpt a multi-ring organic ridge massif or concave stratovolcano
    createSculptedMassif(p, seed) {
        const radSegs = p.isFuji ? 18 : 12;
        const heightSegs = p.isFuji ? 6 : 5;
        const topRadius = p.isFuji ? p.r * 0.16 : p.r * 0.05;
        const geo = new THREE.CylinderGeometry(topRadius, p.r, p.h, radSegs, heightSegs);
        const pos = geo.attributes.position;

        if (pos && typeof pos.getX === 'function') {
            for (let i = 0; i < pos.count; i++) {
                const vx = pos.getX(i);
                const vy = pos.getY(i);
                const vz = pos.getZ(i);
                const t = Math.max(0, Math.min(1, (vy + p.h / 2) / p.h)); // 0 at base, 1 at summit
                const angle = Math.atan2(vz, vx);
                const baseRad = Math.hypot(vx, vz);

                if (baseRad > 0.001) {
                    if (p.isFuji) {
                        // Sweeping concave hyperbolic stratovolcano curve (Mount Fuji)
                        const fujiCurve = Math.pow(1 - t * 0.82, 1.75);
                        const targetR = p.r * fujiCurve;
                        const flute = Math.sin(angle * 8 + seed) * 0.65 * (1 - t * 0.5);
                        const craterRim = t > 0.95 ? Math.sin(angle * 6) * 0.45 : 0;
                        const scale = (targetR + flute) / baseRad;
                        pos.setX(i, vx * scale);
                        pos.setZ(i, vz * scale);
                        pos.setY(i, vy + craterRim);
                    } else {
                        // Elongated asymmetric mountain massif with craggy spurs & valleys
                        const elongationX = 1.0 + 0.35 * Math.cos(seed * 1.7);
                        const elongationZ = 1.0 + 0.35 * Math.sin(seed * 1.7);
                        const spur3 = Math.sin(angle * 3 + seed) * (p.r * 0.22) * (1 - t * 0.4);
                        const spur5 = Math.cos(angle * 5 - seed * 2.1) * (p.r * 0.12) * Math.sin(t * Math.PI);
                        const ridgePower = Math.pow(1 - t * 0.92, 1.25);
                        const targetR = Math.max(0.6, p.r * ridgePower + spur3 + spur5);
                        const scale = targetR / baseRad;
                        const leanX = Math.sin(seed * 3.1) * t * 3.2;
                        const leanZ = Math.cos(seed * 2.7) * t * 3.2;
                        const cragY = (t > 0.15 && t < 0.95) ? Math.sin(angle * 4 + t * 5 + seed) * 1.6 : 0;

                        pos.setX(i, vx * scale * elongationX + leanX);
                        pos.setZ(i, vz * scale * elongationZ + leanZ);
                        pos.setY(i, vy + cragY);
                    }
                }
            }
        }
        geo.computeVertexNormals();
        return geo;
    }

    // 2. Sculpted mountain ranges, forested foothills & iconic snow-capped Mount Fuji
    buildMountainRidges() {
        const peaks = [
            // Distant Alpine Massifs (North, East, South, West)
            { x: -30, z: -62, r: 32, h: 30, snow: true },
            { x: 12, z: -72, r: 38, h: 38, snow: true },
            { x: 52, z: -66, r: 34, h: 32, snow: false },
            { x: 92, z: -62, r: 38, h: 40, snow: true },
            { x: 125, z: -48, r: 30, h: 28, snow: false },
            { x: 138, z: -12, r: 32, h: 30, snow: false },
            { x: 148, z: 32, r: 46, h: 54, isFuji: true }, // Iconic Mount Fuji
            { x: 134, z: 78, r: 32, h: 30, snow: false },
            { x: 120, z: 115, r: 34, h: 34, snow: true },
            { x: 82, z: 132, r: 30, h: 28, snow: false },
            { x: 35, z: 136, r: 36, h: 34, snow: true },
            { x: -18, z: 126, r: 32, h: 29, snow: false },
            { x: -60, z: 88, r: 34, h: 32, snow: false },
            { x: -68, z: 36, r: 38, h: 38, snow: true },
            { x: -62, z: -18, r: 30, h: 28, snow: false },

            // Foreground Forested Foothill Spurs (breaking up the horizon line)
            { x: -5, z: -46, r: 22, h: 14, isFoothill: true },
            { x: 68, z: -45, r: 24, h: 15, isFoothill: true },
            { x: 112, z: 5, r: 20, h: 13, isFoothill: true },
            { x: 110, z: 62, r: 22, h: 14, isFoothill: true },
            { x: -42, z: 55, r: 22, h: 14, isFoothill: true }
        ];

        peaks.forEach((p, idx) => {
            const seed = (idx + 1) * 1.618;
            const geo = this.createSculptedMassif(p, seed);
            const mat = p.isFuji ? this.fujiBodyMaterial : (p.isFoothill ? this.foothillMaterial : this.mountainMaterial);
            const peakMesh = new THREE.Mesh(geo, mat);
            peakMesh.position.set(p.x, (p.h / 2) - 1.5, p.z);
            peakMesh.castShadow = true;
            peakMesh.receiveShadow = true;
            peakMesh.userData = { isBackdrop: true, ignoreRaycast: true };
            this.group.add(peakMesh);

            if (p.isFuji) {
                const snowH = p.h * 0.42;
                const snowGeo = new THREE.CylinderGeometry(p.r * 0.165, p.r * 0.43, snowH, 18, 4);
                const sPos = snowGeo.attributes.position;
                if (sPos && typeof sPos.getX === 'function') {
                    for (let i = 0; i < sPos.count; i++) {
                        const vx = sPos.getX(i), vy = sPos.getY(i), vz = sPos.getZ(i);
                        const t = Math.max(0, Math.min(1, (vy + snowH / 2) / snowH));
                        const angle = Math.atan2(vz, vx);
                        const baseRad = Math.hypot(vx, vz);
                        if (baseRad > 0.001) {
                            const globalT = 0.58 + t * 0.42;
                            const targetR = p.r * Math.pow(1 - globalT * 0.82, 1.75) + 0.35;
                            const scale = targetR / baseRad;
                            sPos.setX(i, vx * scale);
                            sPos.setZ(i, vz * scale);
                            if (t < 0.25) {
                                sPos.setY(i, vy + Math.cos(angle * 7) * 2.4); // Jagged snow gullies
                            }
                        }
                    }
                }
                snowGeo.computeVertexNormals();
                const snowMesh = new THREE.Mesh(snowGeo, this.snowMaterial);
                snowMesh.position.set(p.x, (p.h / 2) - 1.5 + p.h * 0.29, p.z);
                snowMesh.userData = { isBackdrop: true, ignoreRaycast: true };
                this.group.add(snowMesh);
            }
        });
    }

    // 3. Natural curving river ribbon supplying town waterways
    buildRiverRibbon() {
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(125, 0.4, -45),
            new THREE.Vector3(90, 0.2, -32),
            new THREE.Vector3(55, 0.1, -22),
            new THREE.Vector3(20, -0.1, -16),
            new THREE.Vector3(-15, -0.3, -8),
            new THREE.Vector3(-45, -0.4, 5)
        ]);

        const points = curve.getPoints(36);
        const width = 7.5;
        const ribbonGeo = new THREE.BufferGeometry();
        const vertices = [];
        const indices = [];

        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            const tangent = (i < points.length - 1)
                ? points[i + 1].clone().sub(p).normalize()
                : p.clone().sub(points[i - 1]).normalize();
            const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

            vertices.push(
                p.x + normal.x * (width / 2), p.y, p.z + normal.z * (width / 2),
                p.x - normal.x * (width / 2), p.y, p.z - normal.z * (width / 2)
            );

            if (i < points.length - 1) {
                const base = i * 2;
                indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
            }
        }

        ribbonGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        ribbonGeo.setIndex(indices);
        ribbonGeo.computeVertexNormals();

        const riverMesh = new THREE.Mesh(ribbonGeo, this.riverMaterial);
        riverMesh.receiveShadow = true;
        riverMesh.userData = { isBackdrop: true, ignoreRaycast: true };
        this.group.add(riverMesh);
    }

    updateSeason(month) {
        const c = CONFIG.SIMULATION?.SEASON_COLORS;
        if (!c || !this.skirtMaterial) return;
        let ground = 0x5a7d4b, mtn = 0x465b63, foot = 0x35523a;

        if (month >= 3 && month <= 5) {
            ground = 0x638a53; mtn = 0x4d665c; foot = 0x3d6142;
        } else if (month >= 6 && month <= 8) {
            ground = 0x4e7840; mtn = 0x3f5954; foot = 0x2d4f33;
        } else if (month >= 9 && month <= 11) {
            ground = 0x8a724b; mtn = 0x63534b; foot = 0x6e472b;
        } else {
            ground = 0x7a7d76; mtn = 0x626b73; foot = 0x4f5954;
        }
        this.skirtMaterial.color.setHex(ground);
        this.mountainMaterial.color.setHex(mtn);
        if (this.foothillMaterial) this.foothillMaterial.color.setHex(foot);
    }

    updateDayNight(month) {}
}
