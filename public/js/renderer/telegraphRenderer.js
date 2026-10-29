// Project Meiji - Procedural Telegraph Renderer (telegraphRenderer.js)
// Phase 2 /artisan: In-scale Meiji cedar pole (2.05m), copper rain cap, dual crossarms, Gaishi insulators & catenary wires

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { MaterialLibrary } from './materialLibrary.js';

export class TelegraphRenderer {
    static getMaterials() {
        if (this._materials) return this._materials;
        this._materials = {
            wood: new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.85 }),
            crossarm: new THREE.MeshStandardMaterial({ color: 0x5c4330, roughness: 0.82 }),
            brace: new THREE.MeshStandardMaterial({ color: 0x26292e, roughness: 0.5, metalness: 0.6 }),
            copperCap: new THREE.MeshStandardMaterial({ color: 0x3b6e66, roughness: 0.5, metalness: 0.4 }),
            insulator: new THREE.MeshStandardMaterial({
                color: 0xf4f1ea,
                roughness: 0.25,
                metalness: 0.1
            }),
            wire: new THREE.MeshBasicMaterial({ color: 0x22252a })
        };
        return this._materials;
    }

    // Build proportional Meiji telegraph pole (2.05 units tall, matching 1-2 story eaves)
    static createTelegraphPole(orientation = 'NS', s = CONFIG.TILE_SIZE) {
        const poleGroup = new THREE.Group();
        const mats = this.getMaterials();

        // 1. Stone base plinth & tapered cedar pole (2.05m tall, not 4.5m!)
        const baseCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.068, 0.16, 7), MaterialLibrary.get('stoneGranite'));
        baseCollar.position.y = 0.08;
        poleGroup.add(baseCollar);

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

        // 4. Glazed white porcelain insulators (Gaishi / 碍子)
        const insGeo = new THREE.CylinderGeometry(0.018, 0.022, 0.048, 6);
        const insOffsets = [-0.20, -0.08, 0.08, 0.20];
        const insY = 1.92;

        for (const off of insOffsets) {
            const insMesh = new THREE.Mesh(insGeo, mats.insulator);
            if (orientation === 'NS') {
                insMesh.position.set(off, insY, 0);
            } else {
                insMesh.position.set(0, insY, off);
            }
            poleGroup.add(insMesh);
        }

        // 5. Twin catenary sagging wires along road channel
        const wireMeshes = this.createCatenaryWires(orientation, s, mats.wire);
        for (const w of wireMeshes) {
            poleGroup.add(w);
        }

        return poleGroup;
    }

    // Generate catenary wire geometry with proportional height and natural gravity sag
    static createCatenaryWires(orientation = 'NS', s = CONFIG.TILE_SIZE, wireMat = null) {
        const mat = wireMat || this.getMaterials().wire;
        const wires = [];
        const wireY = 1.93;
        const sagY = 1.86;
        const wireOffsets = [-0.14, 0.14];

        for (const wOff of wireOffsets) {
            let curve;
            if (orientation === 'NS') {
                curve = new THREE.QuadraticBezierCurve3(
                    new THREE.Vector3(wOff, wireY, -s / 2),
                    new THREE.Vector3(wOff, sagY, 0),
                    new THREE.Vector3(wOff, wireY, s / 2)
                );
            } else {
                curve = new THREE.QuadraticBezierCurve3(
                    new THREE.Vector3(-s / 2, wireY, wOff),
                    new THREE.Vector3(0, sagY, wOff),
                    new THREE.Vector3(s / 2, wireY, wOff)
                );
            }
            const wireGeo = new THREE.TubeGeometry(curve, 6, 0.007, 4, false);
            wires.push(new THREE.Mesh(wireGeo, mat));
        }

        return wires;
    }

    // Attach positioned pole to road mesh group
    static attachToRoad(group, orientation, trackWidth, s = CONFIG.TILE_SIZE) {
        const poleGroup = this.createTelegraphPole(orientation, s);
        const offsetDist = trackWidth / 2 + 0.16;
        if (orientation === 'NS') {
            poleGroup.position.set(offsetDist, 0, 0);
        } else {
            poleGroup.position.set(0, 0, offsetDist);
        }
        group.add(poleGroup);
    }
}
