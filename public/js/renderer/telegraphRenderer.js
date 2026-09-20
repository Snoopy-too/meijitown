// Project Meiji - Procedural Telegraph Renderer (telegraphRenderer.js)
// ponytail: reusable cedar pole, catenary sagging wire geometry & Gaishi porcelain insulators

import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class TelegraphRenderer {
    static getMaterials() {
        if (this._materials) return this._materials;
        this._materials = {
            wood: new THREE.MeshLambertMaterial({ color: 0x423326 }),
            crossarm: new THREE.MeshLambertMaterial({ color: 0x54402e }),
            brace: new THREE.MeshLambertMaterial({ color: 0x2e2722 }),
            insulator: new THREE.MeshLambertMaterial({
                color: 0xf4f1ea,
                emissive: 0x222222
            }),
            wire: new THREE.MeshBasicMaterial({ color: 0x1a1a1a })
        };
        return this._materials;
    }

    // Build procedural telegraph pole with crossarm, iron angle braces & Gaishi insulators
    static createTelegraphPole(orientation = 'NS', s = CONFIG.TILE_SIZE) {
        const poleGroup = new THREE.Group();
        const mats = this.getMaterials();

        // 1. Cedar pole (4.5m tall, tapered)
        const poleGeo = new THREE.CylinderGeometry(0.05, 0.08, 4.5, 6);
        const pole = new THREE.Mesh(poleGeo, mats.wood);
        pole.position.y = 2.25;
        pole.castShadow = true;
        poleGroup.add(pole);

        // 2. Horizontal timber crossarm
        const armLength = 0.88;
        const armWidth = orientation === 'NS' ? armLength : 0.11;
        const armHeight = 0.10;
        const armDepth = orientation === 'NS' ? 0.11 : armLength;

        const crossarm = new THREE.Mesh(new THREE.BoxGeometry(armWidth, armHeight, armDepth), mats.crossarm);
        crossarm.position.y = 4.20;
        crossarm.castShadow = true;
        poleGroup.add(crossarm);

        // 3. Diagonal angle braces
        const braceGeo = new THREE.BoxGeometry(0.035, 0.36, 0.035);
        const braceL = new THREE.Mesh(braceGeo, mats.brace);
        const braceR = new THREE.Mesh(braceGeo, mats.brace);

        if (orientation === 'NS') {
            braceL.position.set(-0.20, 3.96, 0);
            braceL.rotation.z = 0.65;
            braceR.position.set(0.20, 3.96, 0);
            braceR.rotation.z = -0.65;
        } else {
            braceL.position.set(0, 3.96, -0.20);
            braceL.rotation.x = -0.65;
            braceR.position.set(0, 3.96, 0.20);
            braceR.rotation.x = 0.65;
        }
        poleGroup.add(braceL);
        poleGroup.add(braceR);

        // 4. Glazed porcelain insulators (Gaishi / 碍子)
        const insGeo = new THREE.CylinderGeometry(0.035, 0.042, 0.09, 6);
        const insOffsets = [-0.32, -0.12, 0.12, 0.32];
        const insY = 4.29;

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

    // Generate catenary wire geometry with natural gravity sag
    static createCatenaryWires(orientation = 'NS', s = CONFIG.TILE_SIZE, wireMat = null) {
        const mat = wireMat || this.getMaterials().wire;
        const wires = [];
        const wireY = 4.30;
        const sagY = 4.22;
        const wireOffsets = [-0.22, 0.22];

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
            const wireGeo = new THREE.TubeGeometry(curve, 6, 0.012, 4, false);
            wires.push(new THREE.Mesh(wireGeo, mat));
        }

        return wires;
    }

    // Attach positioned pole to road mesh group
    static attachToRoad(group, orientation, trackWidth, s = CONFIG.TILE_SIZE) {
        const poleGroup = this.createTelegraphPole(orientation, s);
        const offsetDist = trackWidth / 2 + 0.18;
        if (orientation === 'NS') {
            poleGroup.position.set(offsetDist, 0, 0);
        } else {
            poleGroup.position.set(0, 0, offsetDist);
        }
        group.add(poleGroup);
    }
}
