// Project Meiji - Residential Zone Mesh Builders (residentialMeshes.js)
// Phase 2 /artisan: Authentic Meiji Bamboo Scaffolding, Machiya L1, Kura-zukuri L2 & Ginza Brick L3

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { MaterialLibrary } from '../renderer/materialLibrary.js';
import { MeijiArchitectureKit as Kit } from './meijiArchitectureKit.js';

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

    // 1. Residential Level 1: Traditional Wooden Townhouse (Machiya / 町家)
    static createMachiyaL1Mesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const sub = new THREE.Group();
        const plasterMat = MaterialLibrary.get('plasterWarm');
        const woodMat = MaterialLibrary.get('woodDark');
        const stoneMat = MaterialLibrary.get('stoneGranite');

        // Granite plinth foundation
        Kit.addStoneFoundation(sub, 1.54, 1.54, 0.12);

        // Structural framework & ground floor body
        Kit.addPart(sub, new THREE.BoxGeometry(1.36, 0.72, 1.34), plasterMat, [0, 0.48, -0.02], true, null, true);
        Kit.addCornerPillars(sub, 1.38, 1.36, 0.74, 0.49, -0.02);

        // Right side: Fine vertical Kōshi lattice window with warm interior Shoji glow
        Kit.addKoushiLattice(sub, 0.72, 0.48, [0.28, 0.45, 0.655]);

        // Left side: Recessed Genkan entrance with stone stepping sill & dark sliding shoji door
        Kit.addPart(sub, new THREE.BoxGeometry(0.48, 0.07, 0.20), stoneMat, [-0.36, 0.06, 0.70]);
        Kit.addPart(sub, new THREE.BoxGeometry(0.44, 0.60, 0.03), MaterialLibrary.get('shojiWindow'), [-0.36, 0.42, 0.61], false, null, false, 'Front_Koushi');
        Kit.addPart(sub, new THREE.BoxGeometry(0.48, 0.05, 0.08), woodMat, [-0.36, 0.72, 0.62], true); // Entrance lintel

        // Intermediate Hisashi awning sheltering ground floor street front
        Kit.addHisashiAwning(sub, 1.56, 0.35, 0.86, 0.68);

        // Second-story low mezzanine storage loft (Tsushi-nikai) with mushiko-mado slit windows
        Kit.addPart(sub, new THREE.BoxGeometry(1.30, 0.44, 1.28), plasterMat, [0, 1.08, -0.02], true, null, true);
        Kit.addPart(sub, new THREE.BoxGeometry(1.32, 0.04, 1.30), woodMat, [0, 0.88, -0.02], true); // Girth beam
        for (const wx of [-0.34, 0, 0.34]) {
            Kit.addPart(sub, new THREE.BoxGeometry(0.18, 0.16, 0.02), MaterialLibrary.get('shojiWindow'), [wx, 1.10, 0.625], false, null, false, 'Upper_Window');
            Kit.addPart(sub, new THREE.BoxGeometry(0.22, 0.20, 0.03), woodMat, [wx, 1.10, 0.62]);
        }

        // Main Japanese Kawara gabled roof with taruki rafters and onigawara
        Kit.addGabledRoof(sub, 1.66, 1.58, 0.46, 1.30, -0.02);

        // Rear courtyard wooden board fence (Hei) & miniature potted garden accent
        Kit.addPart(sub, new THREE.BoxGeometry(1.30, 0.48, 0.04), woodMat, [0, 0.36, -0.70], true);
        Kit.addPart(sub, new THREE.CylinderGeometry(0.08, 0.06, 0.09, 8), stoneMat, [0.42, 0.165, -0.62]);
        Kit.addPart(sub, new THREE.SphereGeometry(0.09, 6, 6), MaterialLibrary.get('toriiVermilion'), [0.42, 0.26, -0.62]); // Maple accent

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }

    // 2. Residential Level 2: Fireproof Earthen Storehouse (Kura-zukuri / 蔵造り)
    static createKuraL2Mesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const sub = new THREE.Group();
        const blackPlaster = MaterialLibrary.get('plasterBlack');
        const whitePlaster = MaterialLibrary.get('plasterWhite');
        const stoneMat = MaterialLibrary.get('stoneGranite');
        const ironMat = MaterialLibrary.get('darkIron');

        // 1. Heavy cut-granite foundation
        Kit.addStoneFoundation(sub, 1.62, 1.62, 0.18);

        // 2. Ground floor: Namako-kabe diamond tile wainscoting dado
        Kit.addNamakoDado(sub, 1.44, 0.46, 1.44, 0.18);

        // White shikkui plaster mid-body
        Kit.addPart(sub, new THREE.BoxGeometry(1.42, 0.52, 1.42), whitePlaster, [0, 0.90, 0], true, null, true);
        Kit.addCornerPillars(sub, 1.46, 1.46, 0.98, 0.67, 0, 0.11, blackPlaster);

        // Recessed double-leaf plaster fire doors with heavy iron hinges
        Kit.addPart(sub, new THREE.BoxGeometry(0.66, 0.08, 0.16), stoneMat, [0, 0.18, 0.74]);
        Kit.addPart(sub, new THREE.BoxGeometry(0.30, 0.70, 0.06), blackPlaster, [-0.16, 0.57, 0.72], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.30, 0.70, 0.06), blackPlaster, [0.16, 0.57, 0.72], true);
        // Iron hinge straps and latch
        Kit.addPart(sub, new THREE.BoxGeometry(0.64, 0.04, 0.08), ironMat, [0, 0.72, 0.73]);
        Kit.addPart(sub, new THREE.BoxGeometry(0.64, 0.04, 0.08), ironMat, [0, 0.42, 0.73]);

        // 3. Intermediate kawara roof eave (Hisashi) separating floors
        Kit.addPart(sub, new THREE.BoxGeometry(1.68, 0.08, 1.68), MaterialLibrary.get('kawaraRoof'), [0, 1.18, 0], true);

        // 4. Second floor: White shikkui plaster with corner quoins
        Kit.addPart(sub, new THREE.BoxGeometry(1.36, 0.76, 1.36), whitePlaster, [0, 1.60, 0], true, null, true);
        Kit.addCornerPillars(sub, 1.38, 1.38, 0.76, 1.60, 0, 0.09, blackPlaster);

        // Deeply hooded upper Mushiko-mado windows with dark iron security bars & night glow
        for (const wx of [-0.32, 0.32]) {
            // Hood eave
            Kit.addPart(sub, new THREE.BoxGeometry(0.34, 0.05, 0.14), MaterialLibrary.get('kawaraRoof'), [wx, 1.84, 0.71], true);
            // Window aperture with shoji glow
            Kit.addPart(sub, new THREE.BoxGeometry(0.24, 0.28, 0.02), MaterialLibrary.get('shojiWindow'), [wx, 1.64, 0.685], false, null, false, 'Upper_Window');
            // Iron security bars
            Kit.addPart(sub, new THREE.BoxGeometry(0.02, 0.26, 0.04), ironMat, [wx - 0.06, 1.64, 0.69]);
            Kit.addPart(sub, new THREE.BoxGeometry(0.02, 0.26, 0.04), ironMat, [wx + 0.06, 1.64, 0.69]);
        }

        // 5. Massive Kawara roof with taruki rafters and onigawara
        Kit.addGabledRoof(sub, 1.78, 1.78, 0.54, 1.98);

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }

    // 3. Residential Level 3: Ginza Brick Residence (煉瓦住宅)
    static createGinzaBrickL3Mesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const sub = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const trimMat = MaterialLibrary.get('stoneTrim');
        const brickMat = MaterialLibrary.get('redBrick');
        const glassMat = MaterialLibrary.get('glassWindow');
        const ironMat = MaterialLibrary.get('darkIron');
        const roofMat = MaterialLibrary.get('slateRoof');

        // 1. Granite plinth foundation
        Kit.addStoneFoundation(sub, s * 0.84, s * 0.84, 0.16);

        // 2. Ground floor red-brick facade
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.78, 0.96, s * 0.78), brickMat, [0, 0.64, 0], true, null, true);

        // Stone corner quoins (ground floor)
        const quoinGeo = new THREE.BoxGeometry(0.08, 0.96, 0.08);
        for (const qx of [-s * 0.39, s * 0.39]) {
            for (const qz of [-s * 0.39, s * 0.39]) {
                Kit.addPart(sub, quoinGeo, trimMat, [qx, 0.64, qz]);
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

        // 4. Second floor red-brick facade & corner quoins
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.76, 0.88, s * 0.76), brickMat, [0, 1.66, 0], true, null, true);
        const uQuoinGeo = new THREE.BoxGeometry(0.08, 0.88, 0.08);
        for (const qx of [-s * 0.38, s * 0.38]) {
            for (const qz of [-s * 0.38, s * 0.38]) {
                Kit.addPart(sub, uQuoinGeo, trimMat, [qx, 1.66, qz]);
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

        // 6. Hipped slate roof with dormer window & red-brick chimney
        const roofGeo = new THREE.ConeGeometry(s * 0.64, 0.70, 4);
        roofGeo.rotateY(Math.PI / 4);
        Kit.addPart(sub, roofGeo, roofMat, [0, 2.56, 0], true);

        // Dormer window on front roof slope
        Kit.addPart(sub, new THREE.BoxGeometry(0.26, 0.24, 0.22), trimMat, [0, 2.50, s * 0.28], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.18, 0.16, 0.02), glassMat, [0, 2.50, s * 0.395], false, null, false, 'Upper_Window');

        // Red brick chimney stack with flared stone cap
        Kit.addPart(sub, new THREE.BoxGeometry(0.18, 0.55, 0.18), brickMat, [s * 0.24, 2.65, -s * 0.18], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.22, 0.06, 0.22), trimMat, [s * 0.24, 2.94, -s * 0.18], true);

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }
}
