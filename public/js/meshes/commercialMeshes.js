// Project Meiji - Commercial Zone Mesh Builders (commercialMeshes.js)
// Phase 2 /artisan: Shouten L1, Merchant Ōdana L2, Giyōfū Arcade L3 & Ginza Exchange L4

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { MaterialLibrary } from '../renderer/materialLibrary.js';
import { MeijiArchitectureKit as Kit } from './meijiArchitectureKit.js';

export class CommercialMeshes {
    // 1. Commercial Level 1: Corner Merchant Shop (Shouten / 商店)
    static createShoutenL1Mesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const sub = new THREE.Group();
        const plasterMat = MaterialLibrary.get('plasterWarm');
        const woodMat = MaterialLibrary.get('woodDark');
        const lightWood = MaterialLibrary.get('woodLight');
        const norenMat = MaterialLibrary.get('norenIndigo');
        const stoneMat = MaterialLibrary.get('stoneGranite');
        const bambooMat = MaterialLibrary.get('bamboo');

        // 1. Granite plinth foundation
        Kit.addStoneFoundation(sub, 1.54, 1.48, 0.12);

        // 2. Enclosed rear & side storehouse walls
        Kit.addPart(sub, new THREE.BoxGeometry(1.36, 0.84, 1.05), plasterMat, [0, 0.54, -0.16], true, null, true);
        Kit.addCornerPillars(sub, 1.38, 1.07, 0.84, 0.54, -0.16);

        // 3. Open street-front shop stall
        // Raised wooden merchandise counter & display risers
        Kit.addPart(sub, new THREE.BoxGeometry(1.10, 0.32, 0.40), lightWood, [0, 0.28, 0.42], true);
        Kit.addPart(sub, new THREE.BoxGeometry(1.02, 0.12, 0.22), lightWood, [0, 0.44, 0.34], true);

        // Merchant goods: Ceramic sake casks, woven bamboo produce baskets
        Kit.addPart(sub, new THREE.CylinderGeometry(0.08, 0.09, 0.18, 8), MaterialLibrary.get('stoneTrim'), [-0.36, 0.53, 0.34], true);
        Kit.addPart(sub, new THREE.CylinderGeometry(0.08, 0.09, 0.18, 8), MaterialLibrary.get('stoneTrim'), [-0.18, 0.53, 0.34], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.24, 0.10, 0.16), bambooMat, [0.18, 0.49, 0.34], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.22, 0.08, 0.16), MaterialLibrary.get('hempMat'), [0.38, 0.36, 0.44], true);

        // Front timber support pillars
        Kit.addPart(sub, new THREE.BoxGeometry(0.08, 0.88, 0.08), woodMat, [-0.60, 0.56, 0.58], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.08, 0.88, 0.08), woodMat, [0.60, 0.56, 0.58], true);

        // Split indigo Noren shop curtains hanging from a bamboo pole
        Kit.addPart(sub, new THREE.CylinderGeometry(0.015, 0.015, 1.24, 4), bambooMat, [0, 0.88, 0.58]);
        Kit.addPart(sub, new THREE.BoxGeometry(0.52, 0.28, 0.02), norenMat, [-0.28, 0.74, 0.58], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.52, 0.28, 0.02), norenMat, [0.28, 0.74, 0.58], true);

        // Hanging wooden signboard (Kanban)
        Kit.addPart(sub, new THREE.BoxGeometry(0.18, 0.36, 0.03), lightWood, [-0.62, 0.72, 0.38], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.20, 0.03, 0.04), woodMat, [-0.62, 0.90, 0.38]);

        // Corner hanging Chōchin lantern
        Kit.addChochinLantern(sub, [0.62, 0.78, 0.60], true);

        // Intermediate Hisashi awning & Main Kawara roof
        Kit.addHisashiAwning(sub, 1.56, 0.38, 0.98, 0.60);
        Kit.addGabledRoof(sub, 1.68, 1.48, 0.45, 1.02, -0.12);

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }

    // 2. Commercial Level 2: Two-Story Merchant House (Ōdana Machiya / 大店)
    static createMerchantMachiyaL2Mesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const sub = new THREE.Group();
        const plasterMat = MaterialLibrary.get('plasterWarm');
        const woodMat = MaterialLibrary.get('woodDark');
        const lightWood = MaterialLibrary.get('woodLight');
        const norenMat = MaterialLibrary.get('norenIndigo');
        const hempMat = MaterialLibrary.get('hempMat');
        const bronzeMat = MaterialLibrary.get('bronze');

        // 1. Granite plinth foundation
        Kit.addStoneFoundation(sub, 1.64, 1.64, 0.14);

        // 2. Ground floor: Spacious merchant shopfront & accounting chōba
        Kit.addPart(sub, new THREE.BoxGeometry(1.42, 0.92, 1.28), plasterMat, [0, 0.60, -0.10], true, null, true);
        Kit.addCornerPillars(sub, 1.44, 1.30, 0.92, 0.60, -0.10);

        // Raised tatami accounting platform (chōba)
        Kit.addPart(sub, new THREE.BoxGeometry(1.18, 0.16, 0.44), hempMat, [0, 0.22, 0.44], true);
        // Brass-bound merchant chest (chōba-dansu)
        Kit.addPart(sub, new THREE.BoxGeometry(0.28, 0.32, 0.20), woodMat, [-0.40, 0.32, 0.44], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.30, 0.04, 0.22), bronzeMat, [-0.40, 0.48, 0.44]);

        // Wide indigo shop Noren awning & street pillars
        Kit.addPart(sub, new THREE.BoxGeometry(0.09, 0.96, 0.09), woodMat, [-0.64, 0.62, 0.62], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.09, 0.96, 0.09), woodMat, [0.64, 0.62, 0.62], true);
        Kit.addPart(sub, new THREE.BoxGeometry(1.22, 0.32, 0.03), norenMat, [0, 0.88, 0.64], true);

        // Twin hanging vermilion Chōchin lanterns
        Kit.addChochinLantern(sub, [-0.65, 0.92, 0.64], true);
        Kit.addChochinLantern(sub, [0.65, 0.92, 0.64], true);

        // Intermediate Hisashi awning
        Kit.addHisashiAwning(sub, 1.70, 0.44, 1.14, 0.64);

        // 3. Second floor: Upper living quarters with wrap-around Engawa veranda
        Kit.addPart(sub, new THREE.BoxGeometry(1.36, 0.82, 1.22), plasterMat, [0, 1.55, -0.08], true, null, true);

        // Veranda planking and railings
        Kit.addPart(sub, new THREE.BoxGeometry(1.48, 0.05, 0.24), lightWood, [0, 1.165, 0.60], true);
        Kit.addPart(sub, new THREE.BoxGeometry(1.48, 0.24, 0.03), woodMat, [0, 1.30, 0.71], true);

        // Glowing Kōshi lattice screens
        Kit.addKoushiLattice(sub, 1.16, 0.56, [0, 1.56, 0.54]);
        Kit.addKoushiLattice(sub, 0.78, 0.56, [-0.69, 1.56, -0.08], true);

        // 4. Main Kawara roof with rafters & onigawara
        Kit.addGabledRoof(sub, 1.76, 1.54, 0.50, 1.96, -0.08);

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }

    // 3. Commercial Level 3: Ginza Bricktown Giyōfū Arcade (擬洋風 煉瓦街)
    static createGiyofuL3Mesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const sub = new THREE.Group();

        const trimMat = MaterialLibrary.get('stoneTrim');
        const brickMat = MaterialLibrary.get('redBrick');
        const glassMat = MaterialLibrary.get('glassWindow');
        const roofMat = MaterialLibrary.get('kawaraRoof');
        const bronzeMat = MaterialLibrary.get('bronze');
        const ironMat = MaterialLibrary.get('darkIron');

        // 1. Granite plinth foundation
        Kit.addStoneFoundation(sub, s * 0.88, s * 0.84, 0.16);

        // 2. Ground floor: Brick arcade colonnade with pilasters
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.82, 0.72, s * 0.78), brickMat, [0, 0.52, 0], true, null, true);

        // Arched display windows with keystones
        for (const ox of [-0.26 * s, 0.26 * s]) {
            Kit.addPart(sub, new THREE.BoxGeometry(0.42, 0.46, 0.04), glassMat, [ox, 0.48, 0.395 * s], false, null, false, 'Upper_Window');
            Kit.addPart(sub, new THREE.BoxGeometry(0.46, 0.05, 0.08), trimMat, [ox, 0.23, 0.40 * s]);
            const arch = new THREE.CylinderGeometry(0.24, 0.24, 0.06, 8, 1, false, 0, Math.PI);
            arch.rotateZ(Math.PI / 2);
            Kit.addPart(sub, arch, trimMat, [ox, 0.71, 0.395 * s]);
        }

        // Brick pilasters with stone bases & capitals
        for (const px of [-0.40 * s, 0, 0.40 * s]) {
            Kit.addPart(sub, new THREE.BoxGeometry(0.12, 0.72, 0.08), brickMat, [px, 0.52, 0.40 * s]);
            Kit.addPart(sub, new THREE.BoxGeometry(0.14, 0.06, 0.10), trimMat, [px, 0.89, 0.40 * s]);
        }

        // 3. Classical stone string course & second-story balcony
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.86, 0.10, s * 0.82), trimMat, [0, 0.93, 0], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.65 * s, 0.06, 0.22 * s), trimMat, [0, 0.98, 0.45 * s], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.65 * s, 0.20, 0.02), ironMat, [0, 1.11, 0.56 * s]);

        // 4. Second floor: Red-brick facade with corner quoins & arched windows
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.80, 0.62, s * 0.76), brickMat, [0, 1.29, 0], true, null, true);
        const quoinGeo = new THREE.BoxGeometry(0.08, 0.62, 0.08);
        for (const qx of [-s * 0.40, s * 0.40]) {
            for (const qz of [-s * 0.38, s * 0.38]) {
                Kit.addPart(sub, quoinGeo, trimMat, [qx, 1.29, qz]);
            }
        }

        Kit.addPart(sub, new THREE.BoxGeometry(0.34, 0.38, 0.04), glassMat, [-0.25 * s, 1.30, 0.385 * s], false, null, false, 'Upper_Window');
        Kit.addPart(sub, new THREE.BoxGeometry(0.34, 0.38, 0.04), glassMat, [0.25 * s, 1.30, 0.385 * s], false, null, false, 'Upper_Window');
        Kit.addPart(sub, new THREE.BoxGeometry(0.38, 0.52, 0.04), glassMat, [0, 1.32, 0.385 * s], false, null, false, 'Upper_Window'); // Balcony doors

        // 5. Classical cornice entablature
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.88, 0.10, s * 0.84), trimMat, [0, 1.65, 0], true);

        // 6. Giyōfū hybrid: Japanese Kawara Roof + Western Pediment with Brass Clock Face
        Kit.addGabledRoof(sub, s * 0.86, s * 0.80, 0.42, 1.70, 0, roofMat);

        // Classical triangular pediment
        const pedGeo = new THREE.ConeGeometry(0.36, 0.28, 4);
        pedGeo.rotateY(Math.PI / 4);
        Kit.addPart(sub, pedGeo, trimMat, [0, 1.96, 0.36 * s]);

        // Brass clock face
        Kit.addPart(sub, new THREE.CylinderGeometry(0.11, 0.11, 0.04, 12), bronzeMat, [0, 1.94, 0.42 * s], false, [Math.PI / 2, 0, 0]);
        Kit.addPart(sub, new THREE.CylinderGeometry(0.085, 0.085, 0.05, 12), MaterialLibrary.get('plasterWhite'), [0, 1.94, 0.425 * s], false, [Math.PI / 2, 0, 0]);

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }

    // 4. Commercial Level 4: Grand Ginza Brick Exchange (銀座 煉瓦為替座)
    static createGinzaCommercialL4Mesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const sub = new THREE.Group();

        const trimMat = MaterialLibrary.get('stoneTrim');
        const brickMat = MaterialLibrary.get('redBrick');
        const glassMat = MaterialLibrary.get('glassWindow');
        const copperMat = MaterialLibrary.get('copperRoof');
        const bronzeMat = MaterialLibrary.get('bronze');
        const ironMat = MaterialLibrary.get('darkIron');

        // 1. Dressed granite plinth
        Kit.addStoneFoundation(sub, s * 0.90, s * 0.88, 0.18);

        // 2. Colonnaded ground floor with rusticated brickwork
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.84, 0.80, s * 0.82), brickMat, [0, 0.58, 0], true, null, true);

        // 4 classical Tuscan pilasters
        for (const px of [-0.36 * s, -0.12 * s, 0.12 * s, 0.36 * s]) {
            Kit.addPart(sub, new THREE.BoxGeometry(0.12, 0.80, 0.09), trimMat, [px, 0.58, 0.42 * s], true);
        }

        // Grand arched center entrance & flanking display windows
        Kit.addPart(sub, new THREE.BoxGeometry(0.38, 0.60, 0.04), MaterialLibrary.get('woodDark'), [0, 0.48, 0.415 * s], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.32, 0.20, 0.02), glassMat, [0, 0.70, 0.42 * s], false, null, false, 'Front_Koushi');
        Kit.addPart(sub, new THREE.BoxGeometry(0.30, 0.48, 0.03), glassMat, [-0.24 * s, 0.52, 0.415 * s], false, null, false, 'Upper_Window');
        Kit.addPart(sub, new THREE.BoxGeometry(0.30, 0.48, 0.03), glassMat, [0.24 * s, 0.52, 0.415 * s], false, null, false, 'Upper_Window');

        // Gas bracket lanterns flanking entrance
        Kit.addPart(sub, new THREE.CylinderGeometry(0.04, 0.04, 0.12, 6), MaterialLibrary.get('gasLantern'), [-0.14 * s, 0.64, 0.46 * s]);
        Kit.addPart(sub, new THREE.CylinderGeometry(0.04, 0.04, 0.12, 6), MaterialLibrary.get('gasLantern'), [0.14 * s, 0.64, 0.46 * s]);

        // 3. Stone string course & full-width iron balcony
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.88, 0.10, s * 0.86), trimMat, [0, 1.03, 0], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.78 * s, 0.06, 0.22 * s), trimMat, [0, 1.08, 0.47 * s], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.78 * s, 0.20, 0.02), ironMat, [0, 1.21, 0.58 * s]);

        // 4. Second floor: Red-brick facade with stone quoins & 4 arched sash windows
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.82, 0.74, s * 0.80), brickMat, [0, 1.45, 0], true, null, true);
        for (const qx of [-s * 0.41, s * 0.41]) {
            Kit.addPart(sub, new THREE.BoxGeometry(0.08, 0.74, 0.08), trimMat, [qx, 1.45, 0.40 * s]);
            Kit.addPart(sub, new THREE.BoxGeometry(0.08, 0.74, 0.08), trimMat, [qx, 1.45, -0.40 * s]);
        }
        for (const wx of [-0.28 * s, -0.09 * s, 0.09 * s, 0.28 * s]) {
            Kit.addPart(sub, new THREE.BoxGeometry(0.22, 0.44, 0.03), glassMat, [wx, 1.46, 0.405 * s], false, null, false, 'Upper_Window');
            Kit.addPart(sub, new THREE.BoxGeometry(0.26, 0.05, 0.06), trimMat, [wx, 1.22, 0.41 * s]);
        }

        // 5. Classical cornice entablature
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.90, 0.12, s * 0.88), trimMat, [0, 1.88, 0], true);

        // 6. Classical triangular pediment with clock
        const pedGeo = new THREE.ConeGeometry(0.42, 0.32, 4);
        pedGeo.rotateY(Math.PI / 4);
        Kit.addPart(sub, pedGeo, trimMat, [0, 2.20, 0.38 * s]);
        Kit.addPart(sub, new THREE.CylinderGeometry(0.12, 0.12, 0.04, 12), bronzeMat, [0, 2.18, 0.45 * s], false, [Math.PI / 2, 0, 0]);
        Kit.addPart(sub, new THREE.CylinderGeometry(0.095, 0.095, 0.05, 12), MaterialLibrary.get('plasterWhite'), [0, 2.18, 0.455 * s], false, [Math.PI / 2, 0, 0]);

        // 7. Western Mansard Roof & Soaring Copper Cupola
        const mansardGeo = new THREE.ConeGeometry(s * 0.65, 0.75, 4);
        mansardGeo.rotateY(Math.PI / 4);
        Kit.addPart(sub, mansardGeo, MaterialLibrary.get('slateRoof'), [0, 2.32, 0], true);

        // Copper-domed cupola with gilded weathervane spire
        Kit.addPart(sub, new THREE.CylinderGeometry(0.26, 0.28, 0.30, 8), trimMat, [0, 2.82, 0]);
        Kit.addPart(sub, new THREE.SphereGeometry(0.28, 8, 8), copperMat, [0, 3.05, 0]);
        Kit.addPart(sub, new THREE.CylinderGeometry(0.015, 0.015, 0.35, 4), MaterialLibrary.get('goldLeaf'), [0, 3.32, 0]); // Spire

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }
}
