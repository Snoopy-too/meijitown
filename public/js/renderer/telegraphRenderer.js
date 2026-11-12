// Project Meiji - Procedural Telegraph Renderer (telegraphRenderer.js)
// Phase 3 /artisan: In-scale Meiji cedar pole (2.05m), Ne-maki ground guard, dual Gaishi tiers & true Math.cosh catenary wires

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { MaterialLibrary } from './materialLibrary.js';

export class TelegraphRenderer {
    static getMaterials() {
        if (this._materials) return this._materials;
        this._materials = {
            wood: new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.85, metalness: 0.04 }),
            nemaki: new THREE.MeshStandardMaterial({ color: 0x6e5438, roughness: 0.88, metalness: 0.02 }),
            rope: new THREE.MeshStandardMaterial({ color: 0x1d1a17, roughness: 0.92, metalness: 0.0 }),
            crossarm: new THREE.MeshStandardMaterial({ color: 0x5c4330, roughness: 0.82, metalness: 0.04 }),
            brace: new THREE.MeshStandardMaterial({ color: 0x26292e, roughness: 0.45, metalness: 0.68 }),
            copperCap: new THREE.MeshStandardMaterial({ color: 0x3b6e66, roughness: 0.42, metalness: 0.48 }),
            insulator: new THREE.MeshStandardMaterial({
                color: 0xf4f1ea,
                roughness: 0.18,
                metalness: 0.12
            }),
            wire: new THREE.MeshStandardMaterial({
                color: 0x24282e,
                roughness: 0.38,
                metalness: 0.78
            })
        };
        return this._materials;
    }

    // Build proportional Meiji telegraph pole (2.05 units tall, matching 1-2 story eaves)
    static createTelegraphPole(orientation = 'NS', s = CONFIG.TILE_SIZE, spanOptions = null) {
        const poleGroup = new THREE.Group();
        const mats = this.getMaterials();

        // 1. Stone base plinth, Ne-maki (根巻き) timber ground-protector & shuro-nawa rope bindings
        const baseCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.072, 0.12, 8), MaterialLibrary.get('stoneGranite'));
        baseCollar.position.y = 0.06;
        baseCollar.receiveShadow = true;
        poleGroup.add(baseCollar);

        const nemaki = new THREE.Mesh(new THREE.CylinderGeometry(0.050, 0.056, 0.34, 8), mats.nemaki);
        nemaki.position.y = 0.25;
        nemaki.castShadow = true;
        poleGroup.add(nemaki);

        for (const ry of [0.16, 0.26, 0.36]) {
            const ropeBand = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.055, 0.018, 8), mats.rope);
            ropeBand.position.y = ry;
            poleGroup.add(ropeBand);
        }

        const poleH = 2.05;
        const poleGeo = new THREE.CylinderGeometry(0.028, 0.046, poleH, 8);
        const pole = new THREE.Mesh(poleGeo, mats.wood);
        pole.position.y = poleH / 2;
        pole.castShadow = true;
        poleGroup.add(pole);

        // Conical copper rain-cap finial at pole apex
        const cap = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.06, 8), mats.copperCap);
        cap.position.y = poleH + 0.025;
        poleGroup.add(cap);

        // 2. Dual horizontal timber crossarms (upper & lower tiers)
        const armLength = 0.52;
        const armWidth = orientation === 'NS' ? armLength : 0.055;
        const armHeight = 0.045;
        const armDepth = orientation === 'NS' ? 0.055 : armLength;

        for (const armY of [1.88, 1.70]) {
            const crossarm = new THREE.Mesh(new THREE.BoxGeometry(armWidth, armHeight, armDepth), mats.crossarm);
            crossarm.position.y = armY;
            crossarm.castShadow = true;
            poleGroup.add(crossarm);
        }

        // 3. Diagonal wrought-iron angle braces
        const braceGeo = new THREE.BoxGeometry(0.018, 0.20, 0.018);
        const braceL = new THREE.Mesh(braceGeo, mats.brace);
        const braceR = new THREE.Mesh(braceGeo, mats.brace);

        if (orientation === 'NS') {
            braceL.position.set(-0.11, 1.78, 0);
            braceL.rotation.z = 0.65;
            braceR.position.set(0.11, 1.78, 0);
            braceR.rotation.z = -0.65;
        } else {
            braceL.position.set(0, 1.78, -0.11);
            braceL.rotation.x = -0.65;
            braceR.position.set(0, 1.78, 0.11);
            braceR.rotation.x = 0.65;
        }
        poleGroup.add(braceL);
        poleGroup.add(braceR);

        // 4. Glazed white porcelain insulators (Gaishi / 碍子) on both upper and lower crossarms
        const insGeo = new THREE.CylinderGeometry(0.018, 0.022, 0.048, 6);
        const upperOffsets = [-0.20, -0.08, 0.08, 0.20];
        const lowerOffsets = [-0.16, 0.16];

        for (const off of upperOffsets) {
            const insMesh = new THREE.Mesh(insGeo, mats.insulator);
            if (orientation === 'NS') insMesh.position.set(off, 1.92, 0);
            else insMesh.position.set(0, 1.92, off);
            poleGroup.add(insMesh);
        }
        for (const off of lowerOffsets) {
            const insMesh = new THREE.Mesh(insGeo, mats.insulator);
            if (orientation === 'NS') insMesh.position.set(off, 1.74, 0);
            else insMesh.position.set(0, 1.74, off);
            poleGroup.add(insMesh);
        }

        // 5. True hyperbolic-cosine (Math.cosh) catenary sagging wires along road channel
        const wireMeshes = this.createCatenaryWires(orientation, s, mats.wire, spanOptions);
        for (const w of wireMeshes) {
            poleGroup.add(w);
        }

        return poleGroup;
    }

    // Generate true Math.cosh catenary wire geometry across upper & lower insulator tiers
    static createCatenaryWires(orientation = 'NS', s = CONFIG.TILE_SIZE, wireMat = null, spanOptions = null) {
        const mat = wireMat || this.getMaterials().wire;
        const wires = [];

        const spanStart = (spanOptions && typeof spanOptions.spanStart === 'number') ? spanOptions.spanStart : -s / 2;
        const spanEnd = (spanOptions && typeof spanOptions.spanEnd === 'number') ? spanOptions.spanEnd : s / 2;
        const spanLength = Math.max(0.5, spanEnd - spanStart);
        const midCoord = (spanStart + spanEnd) / 2;

        // Upper tier (2 outer wires) + Lower tier (1 inner wire) with authentic catenary sag
        const wireSpecs = [
            { off: -0.20, pinY: 1.935, sag: 0.085 * (spanLength / s) },
            { off:  0.20, pinY: 1.935, sag: 0.085 * (spanLength / s) },
            { off: -0.16, pinY: 1.755, sag: 0.075 * (spanLength / s) },
        ];

        const k = 1.35; // Catenary curvature parameter
        const coshNorm = Math.cosh(k) - 1.0;

        for (const spec of wireSpecs) {
            const samplePoints = [];
            const numSamples = 9;
            for (let i = 0; i <= numSamples; i++) {
                const t = i / numSamples;
                const u = (t - 0.5) * 2.0; // [-1, 1]
                const coord = midCoord + u * (spanLength / 2);
                const catenaryDrop = spec.sag * (1.0 - (Math.cosh(k * u) - 1.0) / coshNorm);
                const y = spec.pinY - catenaryDrop;

                if (orientation === 'NS') {
                    samplePoints.push(new THREE.Vector3(spec.off, y, coord));
                } else {
                    samplePoints.push(new THREE.Vector3(coord, y, spec.off));
                }
            }
            const curve = new THREE.CatmullRomCurve3(samplePoints);
            const wireGeo = new THREE.TubeGeometry(curve, 8, 0.0065, 4, false);
            wires.push(new THREE.Mesh(wireGeo, mat));
        }

        return wires;
    }

    // Attach positioned pole to road mesh group and compute continuous multi-tile catenary wire span
    static attachToRoad(group, orientation, trackWidth, s = CONFIG.TILE_SIZE, x = null, y = null, grid = null) {
        let spanOptions = { spanStart: -s / 2, spanEnd: s / 2 };

        if (grid && typeof x === 'number' && typeof y === 'number') {
            const isRoad = (tx, ty) => {
                if (!grid.isValidCoord(tx, ty)) return false;
                const t = grid.getTile(tx, ty);
                return grid.isRoadTile ? grid.isRoadTile(t) : Boolean(t && t.type === CONFIG.TYPES.ROAD);
            };
            // Since poles spawn every 2 tiles ((x + y) % 2 === 0), extend forward wire span 1.5 tiles to meet the next pole
            if (orientation === 'NS') {
                const hasNorth2 = isRoad(x, y - 1) && isRoad(x, y - 2);
                const hasSouth2 = isRoad(x, y + 1) && isRoad(x, y + 2);
                spanOptions = {
                    spanStart: hasNorth2 ? -s : -s * 0.48,
                    spanEnd: hasSouth2 ? s : s * 0.48,
                };
            } else {
                const hasWest2 = isRoad(x - 1, y) && isRoad(x - 2, y);
                const hasEast2 = isRoad(x + 1, y) && isRoad(x + 2, y);
                spanOptions = {
                    spanStart: hasWest2 ? -s : -s * 0.48,
                    spanEnd: hasEast2 ? s : s * 0.48,
                };
            }
        }

        const poleGroup = this.createTelegraphPole(orientation, s, spanOptions);
        const offsetDist = trackWidth / 2 + 0.16;
        if (orientation === 'NS') {
            poleGroup.position.set(offsetDist, 0, 0);
        } else {
            poleGroup.position.set(0, 0, offsetDist);
        }
        group.add(poleGroup);
    }
}
