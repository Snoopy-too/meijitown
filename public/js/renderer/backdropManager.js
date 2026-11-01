// Project Meiji - Landscape Backdrop, Carved River Gorge & Akafuji Sky Horizon (backdropManager.js)
// Phase 3 /artisan: Bokashi SkyDome, Carved Riverbed Gorge, Snow-Capped Alpine Massifs & Akafuji Alpenglow (<= 280 lines, < 4,000 polys)

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { SkyDome } from './skyDome.js';

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
        this.snowMaterial = new THREE.MeshStandardMaterial({ color: 0xf4f6f9, roughness: 0.52, metalness: 0.08, flatShading: true });
        this.riverBankMaterial = new THREE.MeshStandardMaterial({ color: 0x6e685c, roughness: 0.90, metalness: 0.04, flatShading: true });
        this.riverMaterial = new THREE.MeshStandardMaterial({ color: 0x2d6378, roughness: 0.16, metalness: 0.22, transparent: true, opacity: 0.92 });

        this.targetFujiColor = new THREE.Color(0x3b4d6b);
        this.targetSnowColor = new THREE.Color(0xf4f6f9);
        this.targetRiverColor = new THREE.Color(0x2d6378);

        this.skyDome = new SkyDome(this.group);
        this.initRiverCurve();
        this.buildExtendedSkirt();
        this.buildMountainRidges();
        this.buildRiverRibbon();

        this.scene.add(this.group);
    }

    static init(scene) { return new BackdropManager(scene); }

    initRiverCurve() {
        this.riverCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(125, 2.5, -45), new THREE.Vector3(90, 1.35, -32),
            new THREE.Vector3(55, 0.45, -22), new THREE.Vector3(20, -0.05, -16),
            new THREE.Vector3(-15, -0.22, -8), new THREE.Vector3(-45, -0.35, 5)
        ]);
        this.riverSamples = this.riverCurve.getPoints(48);
    }

    sampleRiverGorge(wx, wz) {
        let minDist = Infinity, riverY = 0;
        for (let i = 0; i < this.riverSamples.length; i++) {
            const p = this.riverSamples[i];
            const d = Math.hypot(wx - p.x, wz - p.z);
            if (d < minDist) { minDist = d; riverY = p.y; }
        }
        return { dist: minDist, riverY };
    }

    // 1. Extended rolling valley skirt with carved riverbed canyon pass (Road/River ∩ Terrain compliant)
    buildExtendedSkirt() {
        const skirtGeo = new THREE.PlaneGeometry(280, 280, 24, 24);
        skirtGeo.rotateX(-Math.PI / 2);

        const cx = (CONFIG.GRID_WIDTH * CONFIG.TILE_SIZE) / 2;
        const cz = (CONFIG.GRID_HEIGHT * CONFIG.TILE_SIZE) / 2;
        const halfPlayable = (CONFIG.GRID_WIDTH * CONFIG.TILE_SIZE) / 2;

        const pos = skirtGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const vx = pos.getX(i), vz = pos.getZ(i);
            const wx = vx + cx, wz = vz + cz;
            const dx = Math.max(0, Math.abs(vx) - halfPlayable);
            const dz = Math.max(0, Math.abs(vz) - halfPlayable);
            const distFromPlayable = Math.hypot(dx, dz);

            if (distFromPlayable <= 0.1) {
                pos.setY(i, -0.55);
            } else {
                const normalized = Math.min(1.0, distFromPlayable / 95);
                const elevation = Math.pow(normalized, 1.65) * 15.0;
                const ridgeWave = Math.sin(wx * 0.07) * Math.cos(wz * 0.07) * 2.2 * normalized;
                const detailWave = Math.sin((vx * 0.19) + (vz * 0.15)) * 0.85 * normalized;
                let y = -0.55 + elevation + ridgeWave + detailWave;

                // Carve natural riverbed gorge & terraced banks along river corridor
                const { dist, riverY } = this.sampleRiverGorge(wx, wz);
                if (dist < 18.5) {
                    const channelBedY = riverY - 0.62;
                    if (dist <= 4.4) {
                        y = channelBedY;
                    } else {
                        const u = (dist - 4.4) / (18.5 - 4.4);
                        const smooth = u * u * (3 - 2 * u);
                        y = channelBedY * (1 - smooth) + y * smooth;
                    }
                }
                pos.setY(i, y);
            }
        }

        skirtGeo.computeVertexNormals();
        const skirtMesh = new THREE.Mesh(skirtGeo, this.skirtMaterial);
        skirtMesh.position.set(cx, 0, cz);
        skirtMesh.receiveShadow = true;
        skirtMesh.userData = { isBackdrop: true, ignoreRaycast: true };
        this.group.add(skirtMesh);
    }

    createSculptedMassif(p, seed) {
        const radSegs = p.isFuji ? 18 : 10;
        const heightSegs = p.isFuji ? 6 : 4;
        const topRadius = p.isFuji ? p.r * 0.16 : p.r * 0.04;
        const geo = new THREE.CylinderGeometry(topRadius, p.r, p.h, radSegs, heightSegs, true);
        const pos = geo.attributes.position;

        if (pos && typeof pos.getX === 'function') {
            for (let i = 0; i < pos.count; i++) {
                const vx = pos.getX(i), vy = pos.getY(i), vz = pos.getZ(i);
                const t = Math.max(0, Math.min(1, (vy + p.h / 2) / p.h));
                const angle = Math.atan2(vz, vx);
                const baseRad = Math.hypot(vx, vz);

                if (baseRad > 0.001) {
                    if (p.isFuji) {
                        const targetR = p.r * Math.pow(1 - t * 0.82, 1.75);
                        const flute = Math.sin(angle * 8 + seed) * 0.65 * (1 - t * 0.5);
                        const craterRim = t > 0.95 ? Math.sin(angle * 6) * 0.45 : 0;
                        const scale = (targetR + flute) / baseRad;
                        pos.setX(i, vx * scale);
                        pos.setZ(i, vz * scale);
                        pos.setY(i, vy + craterRim);
                    } else {
                        const elongationX = 1.0 + 0.35 * Math.cos(seed * 1.7);
                        const elongationZ = 1.0 + 0.35 * Math.sin(seed * 1.7);
                        const spur3 = Math.sin(angle * 3 + seed) * (p.r * 0.22) * (1 - t * 0.4);
                        const spur5 = Math.cos(angle * 5 - seed * 2.1) * (p.r * 0.12) * Math.sin(t * Math.PI);
                        const targetR = Math.max(0.5, p.r * Math.pow(1 - t * 0.92, 1.25) + spur3 + spur5);
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

    // 2. Sculpted mountain ranges, forested foothills & snow-capped Mount Fuji + Alpine Summits
    buildMountainRidges() {
        const peaks = [
            { x: -30, z: -62, r: 32, h: 30, snow: true },  { x: 12, z: -72, r: 38, h: 38, snow: true },
            { x: 52, z: -66, r: 34, h: 32, snow: false },  { x: 92, z: -62, r: 38, h: 40, snow: true },
            { x: 125, z: -48, r: 30, h: 28, snow: false }, { x: 138, z: -12, r: 32, h: 30, snow: false },
            { x: 148, z: 32, r: 46, h: 54, isFuji: true }, { x: 134, z: 78, r: 32, h: 30, snow: false },
            { x: 120, z: 115, r: 34, h: 34, snow: true },  { x: 82, z: 132, r: 30, h: 28, snow: false },
            { x: 35, z: 136, r: 36, h: 34, snow: true },   { x: -18, z: 126, r: 32, h: 29, snow: false },
            { x: -60, z: 88, r: 34, h: 32, snow: false },  { x: -68, z: 36, r: 38, h: 38, snow: true },
            { x: -62, z: -18, r: 30, h: 28, snow: false }, { x: -5, z: -46, r: 22, h: 14, isFoothill: true },
            { x: 68, z: -45, r: 24, h: 15, isFoothill: true }, { x: 112, z: 5, r: 20, h: 13, isFoothill: true },
            { x: 110, z: 62, r: 22, h: 14, isFoothill: true }, { x: -42, z: 55, r: 22, h: 14, isFoothill: true }
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

            if (p.isFuji || p.snow) {
                const snowH = p.isFuji ? p.h * 0.42 : p.h * 0.34;
                const snowGeo = new THREE.CylinderGeometry(
                    p.isFuji ? p.r * 0.165 : p.r * 0.05,
                    p.isFuji ? p.r * 0.43 : p.r * 0.36,
                    snowH, p.isFuji ? 18 : 8, p.isFuji ? 4 : 2, true
                );
                const sPos = snowGeo.attributes.position;
                if (sPos && typeof sPos.getX === 'function') {
                    for (let i = 0; i < sPos.count; i++) {
                        const vx = sPos.getX(i), vy = sPos.getY(i), vz = sPos.getZ(i);
                        const t = Math.max(0, Math.min(1, (vy + snowH / 2) / snowH));
                        const angle = Math.atan2(vz, vx), baseRad = Math.hypot(vx, vz);
                        if (baseRad > 0.001) {
                            const globalT = (p.isFuji ? 0.58 : 0.66) + t * (p.isFuji ? 0.42 : 0.34);
                            const curvePow = p.isFuji ? Math.pow(1 - globalT * 0.82, 1.75) : Math.pow(1 - globalT * 0.90, 1.25);
                            const scale = (p.r * curvePow + 0.38) / baseRad;
                            sPos.setX(i, vx * scale + (p.isFuji ? 0 : Math.sin(seed * 3.1) * globalT * 3.2));
                            sPos.setZ(i, vz * scale + (p.isFuji ? 0 : Math.cos(seed * 2.7) * globalT * 3.2));
                            if (t < 0.28) sPos.setY(i, vy + Math.cos(angle * (p.isFuji ? 7 : 5) + seed) * (p.isFuji ? 2.4 : 1.6));
                        }
                    }
                }
                snowGeo.computeVertexNormals();
                const snowMesh = new THREE.Mesh(snowGeo, this.snowMaterial);
                snowMesh.position.set(p.x, (p.h / 2) - 1.5 + p.h * (p.isFuji ? 0.29 : 0.33), p.z);
                snowMesh.userData = { isBackdrop: true, ignoreRaycast: true };
                this.group.add(snowMesh);
            }
        });
    }

    // 3. Natural curving river ribbon & shingle banks nestled inside carved valley gorge
    buildRiverRibbon() {
        const points = this.riverCurve.getPoints(36);
        const buildStrip = (width, yOffset, material) => {
            const ribbonGeo = new THREE.BufferGeometry();
            const vertices = [], indices = [];
            for (let i = 0; i < points.length; i++) {
                const p = points[i];
                const tangent = (i < points.length - 1) ? points[i + 1].clone().sub(p).normalize() : p.clone().sub(points[i - 1]).normalize();
                const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
                vertices.push(
                    p.x + normal.x * (width / 2), p.y + yOffset, p.z + normal.z * (width / 2),
                    p.x - normal.x * (width / 2), p.y + yOffset, p.z - normal.z * (width / 2)
                );
                if (i < points.length - 1) {
                    const b = i * 2;
                    indices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
                }
            }
            ribbonGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            ribbonGeo.setIndex(indices);
            ribbonGeo.computeVertexNormals();
            const mesh = new THREE.Mesh(ribbonGeo, material);
            mesh.receiveShadow = true;
            mesh.userData = { isBackdrop: true, ignoreRaycast: true };
            this.group.add(mesh);
        };
        buildStrip(11.4, -0.08, this.riverBankMaterial);
        buildStrip(7.5, 0.0, this.riverMaterial);
    }

    updateSeason(month) {
        const c = CONFIG.SIMULATION?.SEASON_COLORS;
        if (!c || !this.skirtMaterial) return;
        let ground = 0x5a7d4b, mtn = 0x465b63, foot = 0x35523a;
        if (month >= 3 && month <= 5) { ground = 0x638a53; mtn = 0x4d665c; foot = 0x3d6142; }
        else if (month >= 6 && month <= 8) { ground = 0x4e7840; mtn = 0x3f5954; foot = 0x2d4f33; }
        else if (month >= 9 && month <= 11) { ground = 0x8a724b; mtn = 0x63534b; foot = 0x6e472b; }
        else { ground = 0x7a7d76; mtn = 0x626b73; foot = 0x4f5954; }
        this.skirtMaterial.color.setHex(ground);
        this.mountainMaterial.color.setHex(mtn);
        if (this.foothillMaterial) this.foothillMaterial.color.setHex(foot);
    }

    updateDayNight(month) {
        const phaseIndex = ((month || 1) - 1) % 4;
        const phaseKey = phaseIndex === 0 ? 'DAWN' : phaseIndex === 1 ? 'DAY' : phaseIndex === 2 ? 'TWILIGHT' : 'NIGHT';
        if (this.skyDome) this.skyDome.setPhase(phaseKey);
        if (phaseKey === 'DAWN') {
            this.targetFujiColor.setHex(0x594a66); this.targetSnowColor.setHex(0xffded2); this.targetRiverColor.setHex(0x467487);
        } else if (phaseKey === 'DAY') {
            this.targetFujiColor.setHex(0x3b4d6b); this.targetSnowColor.setHex(0xf4f6f9); this.targetRiverColor.setHex(0x2d6378);
        } else if (phaseKey === 'TWILIGHT') {
            this.targetFujiColor.setHex(0x7d3f38); this.targetSnowColor.setHex(0xffc29e); this.targetRiverColor.setHex(0x525d70);
        } else {
            this.targetFujiColor.setHex(0x1c273d); this.targetSnowColor.setHex(0x9bb2d6); this.targetRiverColor.setHex(0x162e42);
        }
    }

    update(delta = 0.016, isStorm = false) {
        const s = Math.min(1.0, delta * 2.2);
        const lerpC = (c, t) => (typeof c.lerp === 'function') ? c.lerp(t, s) : c.setHex(t.getHex());
        lerpC(this.fujiBodyMaterial.color, this.targetFujiColor);
        lerpC(this.snowMaterial.color, this.targetSnowColor);
        lerpC(this.riverMaterial.color, this.targetRiverColor);
        if (this.skyDome) this.skyDome.update(delta, isStorm);
    }
}
