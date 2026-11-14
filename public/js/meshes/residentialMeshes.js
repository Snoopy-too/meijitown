// Project Meiji - Residential Zone Mesh Builders (residentialMeshes.js)
// Phase 2 /artisan: Authentic Meiji Bamboo Scaffolding, Machiya L1, Kura-zukuri L2 & Ginza Brick L3

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { MaterialLibrary } from '../renderer/materialLibrary.js';
import { MeijiArchitectureKit as Kit } from './meijiArchitectureKit.js';
import { getFireproofPalette } from './masonryPalette.js';
import { createVariedMachiyaL1Mesh, createVariedKuraL2Mesh } from './machiyaMesh.js';

export class ResidentialMeshes {
    // 0. Bamboo & Timber Construction Scaffolding
    static createScaffoldMesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const sub = new THREE.Group();
        const bambooMat = MaterialLibrary.get('bamboo');
        const woodMat = MaterialLibrary.get('woodDark');
        const plankMat = MaterialLibrary.get('woodLight');
        const hempMat = MaterialLibrary.get('hempMat');

        // 6 vertical lashed bamboo uprights
        const poleH = 1.45;
        const poleGeo = new THREE.CylinderGeometry(0.035, 0.035, poleH, 6);
        for (const px of [-0.62, 0, 0.62]) {
            for (const pz of [-0.58, 0.58]) {
                Kit.addPart(sub, poleGeo, bambooMat, [px, poleH / 2, pz], true);
            }
        }

        // Horizontal ledger rails (front, center, back at 2 tiers)
        const ledgerX = new THREE.BoxGeometry(1.34, 0.04, 0.04);
        for (const py of [0.52, 1.05]) {
            Kit.addPart(sub, ledgerX, woodMat, [0, py, -0.58], true);
            Kit.addPart(sub, ledgerX, woodMat, [0, py, 0.58], true);
        }
        const ledgerZ = new THREE.BoxGeometry(0.04, 0.04, 1.20);
        for (const px of [-0.62, 0.62]) {
            Kit.addPart(sub, ledgerZ, woodMat, [px, 0.52, 0], true);
            Kit.addPart(sub, ledgerZ, woodMat, [px, 1.05, 0], true);
        }

        // Catwalk walking planks on 2 tiers
        Kit.addPart(sub, new THREE.BoxGeometry(1.28, 0.035, 0.36), plankMat, [0, 0.54, -0.22], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.85, 0.035, 0.36), plankMat, [0.20, 1.07, 0.22], true);

        // Hanging hemp canvas wind/dust screen
        Kit.addPart(sub, new THREE.BoxGeometry(0.02, 0.85, 0.95), hempMat, [-0.63, 0.75, 0.05], true);

        // Center construction staging: stacked cedar lumber & carpenter's sawhorse
        Kit.addPart(sub, new THREE.BoxGeometry(0.55, 0.16, 0.35), plankMat, [-0.10, 0.08, -0.05], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.48, 0.14, 0.28), plankMat, [-0.10, 0.23, -0.05], true);

        // Carpenter's sawhorse (horizontal beam + angled A-legs)
        const sawHorseBeam = new THREE.BoxGeometry(0.45, 0.05, 0.07);
        Kit.addPart(sub, sawHorseBeam, woodMat, [0.32, 0.28, 0.10], true);
        const legGeo = new THREE.BoxGeometry(0.04, 0.30, 0.04);
        for (const [lx, lz, rz] of [[0.16, 0.02, 0.15], [0.48, 0.02, -0.15]]) {
            const leg = Kit.addPart(sub, legGeo, woodMat, [lx, 0.14, lz], true);
            leg.rotation.z = rz;
        }

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }

    // 1. Residential Level 1: Traditional Wooden Townhouse (Machiya / 町家) — 4 structural archetypes + finishes
    static createMachiyaL1Mesh(tile, facingAngle = 0) {
        return createVariedMachiyaL1Mesh(tile, facingAngle);
    }

    // 2. Residential Level 2: Fireproof Earthen Storehouse (Kura-zukuri / 蔵造り) — 3 regional styles
    static createKuraL2Mesh(tile, facingAngle = 0) {
        return createVariedKuraL2Mesh(tile, facingAngle);
    }

    // 3. Residential Level 3: Ginza Brick / Stone / Giyōfū Fireproof Residence
    static createGinzaBrickL3Mesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const sub = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const pal = getFireproofPalette(tile, 'residential');
        const trimMat = pal.trimMat;
        const quoinMat = pal.quoinMat;
        const lowerMat = pal.lowerWallMat;
        const upperMat = pal.upperWallMat;
        const glassMat = MaterialLibrary.get('glassWindow');
        const ironMat = MaterialLibrary.get('darkIron');
        const roofMat = pal.roofMat;

        // 1. Granite plinth foundation
        Kit.addStoneFoundation(sub, s * 0.84, s * 0.84, 0.16);

        // 2. Ground floor fireproof masonry facade
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.78, 0.96, s * 0.78), lowerMat, [0, 0.64, 0], true, null, true);

        // Corner quoins (ground floor)
        const quoinGeo = new THREE.BoxGeometry(0.08, 0.96, 0.08);
        for (const qx of [-s * 0.39, s * 0.39]) {
            for (const qz of [-s * 0.39, s * 0.39]) {
                Kit.addPart(sub, quoinGeo, quoinMat, [qx, 0.64, qz]);
            }
        }

        // Ground floor entrance portico & arched sash windows
        Kit.addPart(sub, new THREE.BoxGeometry(0.48, 0.06, 0.20), trimMat, [0, 0.17, s * 0.40]); // Step
        Kit.addPart(sub, new THREE.BoxGeometry(0.42, 0.68, 0.04), MaterialLibrary.get('woodDark'), [0, 0.52, s * 0.39], true); // Front door
        Kit.addPart(sub, new THREE.BoxGeometry(0.36, 0.20, 0.02), glassMat, [0, 0.74, s * 0.395], false, null, false, 'Front_Koushi');

        for (const wx of [-0.44, 0.44]) {
            Kit.addPart(sub, new THREE.BoxGeometry(0.24, 0.48, 0.03), glassMat, [wx, 0.58, s * 0.395], false, null, false, 'Upper_Window');
            Kit.addPart(sub, new THREE.BoxGeometry(0.28, 0.06, 0.07), trimMat, [wx, 0.32, s * 0.40]); // Sill
            const arch = new THREE.CylinderGeometry(0.14, 0.14, 0.05, 8, 1, false, 0, Math.PI);
            arch.rotateZ(Math.PI / 2);
            Kit.addPart(sub, arch, trimMat, [wx, 0.83, s * 0.395]); // Keystone arch
        }

        // 3. Classical stone string course dividing ground and upper floor
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.82, 0.10, s * 0.82), trimMat, [0, 1.17, 0], true);

        // 4. Second floor masonry/stucco facade & corner quoins
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.76, 0.88, s * 0.76), upperMat, [0, 1.66, 0], true, null, true);
        const uQuoinGeo = new THREE.BoxGeometry(0.08, 0.88, 0.08);
        for (const qx of [-s * 0.38, s * 0.38]) {
            for (const qz of [-s * 0.38, s * 0.38]) {
                Kit.addPart(sub, uQuoinGeo, quoinMat, [qx, 1.66, qz]);
            }
        }

        // Second-floor portico balcony with wrought-iron railing
        Kit.addPart(sub, new THREE.BoxGeometry(0.58, 0.06, 0.24), trimMat, [0, 1.17, s * 0.44], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.58, 0.22, 0.02), ironMat, [0, 1.31, s * 0.55]);
        Kit.addPart(sub, new THREE.BoxGeometry(0.02, 0.22, 0.22), ironMat, [-0.28, 1.31, s * 0.44]);
        Kit.addPart(sub, new THREE.BoxGeometry(0.02, 0.22, 0.22), ironMat, [0.28, 1.31, s * 0.44]);

        // Second-floor French doors to balcony & side windows
        Kit.addPart(sub, new THREE.BoxGeometry(0.36, 0.54, 0.03), glassMat, [0, 1.54, s * 0.385], false, null, false, 'Upper_Window');
        for (const wx of [-0.42, 0.42]) {
            Kit.addPart(sub, new THREE.BoxGeometry(0.24, 0.44, 0.03), glassMat, [wx, 1.58, s * 0.385], false, null, false, 'Upper_Window');
            Kit.addPart(sub, new THREE.BoxGeometry(0.28, 0.05, 0.06), trimMat, [wx, 1.34, s * 0.39]);
        }

        // 5. Heavy stone cornice entablature
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.84, 0.12, s * 0.84), trimMat, [0, 2.16, 0], true);

        // 6. Hipped slate/kawara roof with dormer window & masonry chimney
        const roofGeo = new THREE.ConeGeometry(s * 0.64, 0.70, 4);
        roofGeo.rotateY(Math.PI / 4);
        Kit.addPart(sub, roofGeo, roofMat, [0, 2.56, 0], true);

        // Dormer window on front roof slope
        Kit.addPart(sub, new THREE.BoxGeometry(0.26, 0.24, 0.22), trimMat, [0, 2.50, s * 0.28], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.18, 0.16, 0.02), glassMat, [0, 2.50, s * 0.395], false, null, false, 'Upper_Window');

        // Masonry chimney stack with flared stone cap
        Kit.addPart(sub, new THREE.BoxGeometry(0.18, 0.55, 0.18), pal.chimneyMat, [s * 0.24, 2.65, -s * 0.18], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.22, 0.06, 0.22), trimMat, [s * 0.24, 2.94, -s * 0.18], true);

        sub.rotation.y = facingAngle;
        group.userData = { masonryVariant: pal.variantName };
        group.add(sub);
        return group;
    }
}
