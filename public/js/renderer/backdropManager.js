// Project Meiji - Landscape Backdrop & Mountain Perimeter (backdropManager.js)
// ponytail: procedural terrain skirt, faceted low-poly peaks & winding river (< 280 lines)

import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class BackdropManager {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.group.name = 'backdrop_environment';

        const groundColor = (CONFIG.COLORS && CONFIG.COLORS.GROUND) || 0x5a7d4b;
        this.skirtMaterial = new THREE.MeshLambertMaterial({
            color: groundColor,
            flatShading: true
        });

        this.mountainMaterial = new THREE.MeshLambertMaterial({
            color: 0x4f6354, // Misty moss green / slate ridge
            flatShading: true
        });

        this.riverMaterial = new THREE.MeshStandardMaterial({
            color: 0x35687d,
            roughness: 0.25,
            metalness: 0.15,
            transparent: true,
            opacity: 0.92
        });

        this.buildExtendedSkirt();
        this.buildMountainRidges();
        this.buildRiverRibbon();

        this.scene.add(this.group);
    }

    static init(scene) {
        return new BackdropManager(scene);
    }

    // 1. Extended meadow skirt sloping upward into valley foothills
    buildExtendedSkirt() {
        const segs = 28;
        const size = 260; // Outer span enclosing 70x70 playable board
        const skirtGeo = new THREE.PlaneGeometry(size, size, segs, segs);
        skirtGeo.rotateX(-Math.PI / 2);

        // Center of playable board is (35, 35)
        const cx = (CONFIG.GRID_WIDTH * CONFIG.TILE_SIZE) / 2; // 35
        const cz = (CONFIG.GRID_HEIGHT * CONFIG.TILE_SIZE) / 2; // 35
        const halfPlayable = (CONFIG.GRID_WIDTH * CONFIG.TILE_SIZE) / 2; // 35

        const pos = skirtGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const vx = pos.getX(i);
            const vz = pos.getZ(i);

            // Distance outside playable boundary relative to origin
            const dx = Math.max(0, Math.abs(vx) - halfPlayable);
            const dz = Math.max(0, Math.abs(vz) - halfPlayable);
            const distFromPlayable = Math.hypot(dx, dz);

            if (distFromPlayable <= 0.1) {
                pos.setY(i, -0.55); // Flush beneath board
            } else {
                // Smooth sinusoidal elevation upward toward basin rim
                const normalized = Math.min(1.0, distFromPlayable / 95);
                const elevation = Math.pow(normalized, 1.6) * 14.0;
                const undulation = Math.sin((vx + cx) * 0.08) * Math.cos((vz + cz) * 0.08) * 1.5;
                pos.setY(i, -0.55 + elevation + undulation);
            }
        }

        skirtGeo.computeVertexNormals();
        const skirtMesh = new THREE.Mesh(skirtGeo, this.skirtMaterial);
        skirtMesh.position.set(cx, 0, cz);
        skirtMesh.receiveShadow = true;
        skirtMesh.userData = { isBackdrop: true, ignoreRaycast: true };
        this.group.add(skirtMesh);
    }

    // 2. Low-poly mountain ridgeline enclosing valley perimeter
    buildMountainRidges() {
        const peaks = [
            // Northern Ridge
            { x: -25, z: -55, r: 24, h: 32, segs: 6 },
            { x: 10, z: -68, r: 30, h: 42, segs: 7 },
            { x: 45, z: -62, r: 28, h: 38, segs: 6 },
            { x: 80, z: -58, r: 32, h: 44, segs: 7 },
            { x: 115, z: -50, r: 26, h: 36, segs: 6 },

            // Eastern Foothills & Mount Fuji silhouette in far East
            { x: 130, z: -15, r: 30, h: 40, segs: 7 },
            { x: 135, z: 25, r: 34, h: 46, segs: 6 },
            { x: 128, z: 65, r: 28, h: 38, segs: 7 },
            { x: 122, z: 105, r: 30, h: 42, segs: 6 },

            // Southern & Western Basin Shoulders
            { x: 85, z: 125, r: 26, h: 34, segs: 6 },
            { x: 35, z: 130, r: 32, h: 40, segs: 7 },
            { x: -15, z: 120, r: 28, h: 36, segs: 6 },
            { x: -55, z: 85, r: 28, h: 38, segs: 6 },
            { x: -62, z: 35, r: 32, h: 44, segs: 7 },
            { x: -58, z: -15, r: 26, h: 34, segs: 6 }
        ];

        for (const p of peaks) {
            const geo = new THREE.ConeGeometry(p.r, p.h, p.segs, 1);
            // Slight jitter for organic faceted mountain slopes
            const pos = geo.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                if (pos.getY(i) < p.h * 0.4) {
                    pos.setX(i, pos.getX(i) + (Math.sin(i * 3.7) * 1.8));
                    pos.setZ(i, pos.getZ(i) + (Math.cos(i * 4.3) * 1.8));
                }
            }
            geo.computeVertexNormals();

            const peakMesh = new THREE.Mesh(geo, this.mountainMaterial);
            peakMesh.position.set(p.x, (p.h / 2) - 1.0, p.z);
            peakMesh.castShadow = true;
            peakMesh.receiveShadow = true;
            peakMesh.userData = { isBackdrop: true, ignoreRaycast: true };
            this.group.add(peakMesh);
        }
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

    // Seasonal foliage sync
    updateSeason(month) {
        const c = CONFIG.SIMULATION?.SEASON_COLORS;
        if (!c || !this.skirtMaterial) return;
        let ground = 0x5a7d4b;
        let mtn = 0x4f6354;

        if (month >= 3 && month <= 5) {
            ground = 0x638a53; // Fresh spring lawn
            mtn = 0x546c59;
        } else if (month >= 6 && month <= 8) {
            ground = 0x4e7840; // Vibrant summer green
            mtn = 0x3f5c46;
        } else if (month >= 9 && month <= 11) {
            ground = 0x8a724b; // Russet autumn field
            mtn = 0x6e5241;
        } else {
            ground = 0x7a7d76; // Pale winter tundra
            mtn = 0x696e70;
        }
        this.skirtMaterial.color.setHex(ground);
        this.mountainMaterial.color.setHex(mtn);
    }

    updateDayNight(month) {
        // Ambient fog/horizon balance
    }
}
