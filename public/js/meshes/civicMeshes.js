// Project Meiji - Civic & Cultural Landmark Mesh Builders (civicMeshes.js)
// Phase 2 /artisan: Authentic Meiji Hinomi Watchtower, Fire Depot, Well, Ochaya, Sentō, Kōban, Kaichi School, Telegraph, Waterworks, Suimon & Pavilion

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { MaterialLibrary } from '../renderer/materialLibrary.js';
import { MeijiArchitectureKit as Kit } from './meijiArchitectureKit.js';

export class CivicBuildingMeshes {
    // 1. Fire Watchtower (Hinomi-yagura / 火の見櫓)
    static createWatchtowerMesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const sub = new THREE.Group();
        const woodMat = MaterialLibrary.get('woodDark');
        const lightWood = MaterialLibrary.get('woodLight');
        const bambooMat = MaterialLibrary.get('bamboo');
        const bronzeMat = MaterialLibrary.get('bronze');

        // Granite footing corner pedestals
        Kit.addStoneFoundation(sub, 1.44, 1.44, 0.12);

        // 4 inward-tapered structural timber corner posts
        const legGeo = new THREE.CylinderGeometry(0.038, 0.052, 2.45, 6);
        for (const [lx, lz, rx, rz] of [
            [-0.44, -0.44, 0.05, -0.05],
            [0.44, -0.44, 0.05, 0.05],
            [-0.44, 0.44, -0.05, -0.05],
            [0.44, 0.44, -0.05, 0.05]
        ]) {
            Kit.addPart(sub, legGeo, woodMat, [lx, 1.25, lz], true, [rx, 0, rz]);
        }

        // Horizontal perimeter ties & diagonal X-bracing across 3 tiers
        for (const h of [0.72, 1.45, 2.18]) {
            const span = 0.96 - h * 0.12;
            Kit.addPart(sub, new THREE.BoxGeometry(span, 0.04, 0.04), woodMat, [0, h, -span / 2]);
            Kit.addPart(sub, new THREE.BoxGeometry(span, 0.04, 0.04), woodMat, [0, h, span / 2]);
            Kit.addPart(sub, new THREE.BoxGeometry(0.04, 0.04, span), woodMat, [-span / 2, h, 0]);
            Kit.addPart(sub, new THREE.BoxGeometry(0.04, 0.04, span), woodMat, [span / 2, h, 0]);
        }

        // Central vertical bamboo climbing ladder
        for (let rh = 0.35; rh <= 2.25; rh += 0.22) {
            Kit.addPart(sub, new THREE.BoxGeometry(0.24, 0.025, 0.025), bambooMat, [0, rh, 0.22]);
        }
        Kit.addPart(sub, new THREE.CylinderGeometry(0.015, 0.015, 2.30, 4), bambooMat, [-0.12, 1.20, 0.22]);
        Kit.addPart(sub, new THREE.CylinderGeometry(0.015, 0.015, 2.30, 4), bambooMat, [0.12, 1.20, 0.22]);

        // Cantilevered wooden lookout platform & balustrade
        Kit.addPart(sub, new THREE.BoxGeometry(0.92, 0.06, 0.92), lightWood, [0, 2.38, 0], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.92, 0.22, 0.03), woodMat, [0, 2.52, -0.44]);
        Kit.addPart(sub, new THREE.BoxGeometry(0.92, 0.22, 0.03), woodMat, [0, 2.52, 0.44]);
        Kit.addPart(sub, new THREE.BoxGeometry(0.03, 0.22, 0.92), woodMat, [-0.44, 2.52, 0]);
        Kit.addPart(sub, new THREE.BoxGeometry(0.03, 0.22, 0.92), woodMat, [0.44, 2.52, 0]);

        // Suspended bronze Hanshō fire alarm bell
        Kit.addPart(sub, new THREE.CylinderGeometry(0.10, 0.13, 0.24, 8), bronzeMat, [0, 2.72, 0], true);
        Kit.addPart(sub, new THREE.CylinderGeometry(0.015, 0.015, 0.15, 4), bronzeMat, [0, 2.88, 0]);

        // Hipped Kawara canopy roof
        Kit.addGabledRoof(sub, 1.15, 1.15, 0.35, 2.95);

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }

    // 2. Fire Brigade Depot (Machi-Hikeshi / 火消し所)
    static createFireDepotMesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const sub = new THREE.Group();
        const woodMat = MaterialLibrary.get('woodDark');
        const plasterMat = MaterialLibrary.get('plasterWhite');
        const redMat = MaterialLibrary.get('crimsonBanner');
        const ironMat = MaterialLibrary.get('darkIron');

        // Foundation
        Kit.addStoneFoundation(sub, s * 0.88, s * 0.84, 0.12);

        // Ground floor apparatus station (open double-door bay)
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.80, 0.55, s * 0.74), woodMat, [0, 0.40, 0], true);
        // Open front doorway revealing red pump cart frame inside
        Kit.addPart(sub, new THREE.BoxGeometry(0.55, 0.42, 0.04), MaterialLibrary.get('plasterBlack'), [0, 0.35, s * 0.375]);
        // Parked Ryūtosui pump box inside
        Kit.addPart(sub, new THREE.BoxGeometry(0.32, 0.22, 0.24), redMat, [0, 0.25, s * 0.28], true);
        Kit.addPart(sub, new THREE.CylinderGeometry(0.08, 0.08, 0.04, 8), ironMat, [-0.18, 0.20, s * 0.28], true, [0, 0, Math.PI / 2]);
        Kit.addPart(sub, new THREE.CylinderGeometry(0.08, 0.08, 0.04, 8), ironMat, [0.18, 0.20, s * 0.28], true, [0, 0, Math.PI / 2]);

        // Second-story white shikkui plaster loft with kōshi windows
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.76, 0.45, s * 0.70), plasterMat, [0, 0.90, 0], true, null, true);
        Kit.addKoushiLattice(sub, 0.54, 0.28, [0, 0.90, s * 0.355]);

        // Hose drying rack & red water buckets
        Kit.addPart(sub, new THREE.BoxGeometry(0.04, 0.50, 0.24), woodMat, [-0.34 * s, 0.92, -0.15], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.02, 0.40, 0.06), MaterialLibrary.get('norenIndigo'), [-0.34 * s, 0.92, -0.15]); // Hose
        Kit.addPart(sub, new THREE.CylinderGeometry(0.08, 0.06, 0.18, 6), redMat, [-0.34 * s, 0.22, 0.34 * s]); // Bucket
        Kit.addPart(sub, new THREE.CylinderGeometry(0.08, 0.06, 0.18, 6), redMat, [-0.34 * s, 0.38, 0.34 * s]); // Bucket

        // Roof
        Kit.addGabledRoof(sub, s * 0.88, s * 0.82, 0.42, 1.12);

        // Tall brigade Matoi standard pole
        const matoiX = 0.36 * s;
        const matoiZ = 0.36 * s;
        Kit.addPart(sub, new THREE.CylinderGeometry(0.025, 0.035, 2.30, 6), woodMat, [matoiX, 1.20, matoiZ], true);
        // Gilded brigade crest standard with cascading baren strips
        Kit.addPart(sub, new THREE.CylinderGeometry(0.16, 0.16, 0.05, 10), MaterialLibrary.get('goldLeaf'), [matoiX, 2.25, matoiZ], false, [Math.PI / 2, 0, 0]);
        Kit.addPart(sub, new THREE.BoxGeometry(0.04, 0.30, 0.28), plasterMat, [matoiX, 2.05, matoiZ]);

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }

    // 3. Communal Well (Ido / 井戸)
    static createWellMesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const sub = new THREE.Group();
        const woodMat = MaterialLibrary.get('woodDark');
        const lightWood = MaterialLibrary.get('woodLight');
        const stoneMat = MaterialLibrary.get('stoneGranite');

        // Octagonal dressed granite stone apron
        Kit.addStoneFoundation(sub, s * 0.80, s * 0.80, 0.08);

        // Interlocked square timber well crib (Idogawa / 井戸側)
        Kit.addPart(sub, new THREE.BoxGeometry(0.82, 0.44, 0.82), MaterialLibrary.get('woodMedium'), [0, 0.26, 0], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.68, 0.44, 0.68), woodMat, [0, 0.26, 0]);
        // Shimmering dark water surface inside
        Kit.addPart(sub, new THREE.BoxGeometry(0.64, 0.02, 0.64), MaterialLibrary.get('waterSurface'), [0, 0.34, 0]);

        // Dual cedar vertical upright posts
        const postGeo = new THREE.CylinderGeometry(0.04, 0.045, 1.35, 6);
        Kit.addPart(sub, postGeo, woodMat, [-0.42, 0.72, 0], true);
        Kit.addPart(sub, postGeo, woodMat, [0.42, 0.72, 0], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.96, 0.07, 0.07), woodMat, [0, 1.35, 0]); // Ridge tie

        // Traditional gabled well-roof (Idoyane)
        Kit.addGabledRoof(sub, 1.15, 0.88, 0.32, 1.38);

        // Bronze pulley wheel & hemp rope
        const pulleyGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.04, 10);
        pulleyGeo.rotateZ(Math.PI / 2);
        Kit.addPart(sub, pulleyGeo, MaterialLibrary.get('bronze'), [0, 1.26, 0]);
        Kit.addPart(sub, new THREE.CylinderGeometry(0.009, 0.009, 0.65, 4), MaterialLibrary.get('bamboo'), [0, 0.90, 0]);

        // Wooden Tsurube water buckets (one suspended, one resting on apron)
        Kit.addPart(sub, new THREE.CylinderGeometry(0.09, 0.075, 0.18, 6), lightWood, [0, 0.58, 0], true);
        Kit.addPart(sub, new THREE.CylinderGeometry(0.09, 0.075, 0.18, 6), lightWood, [0.26, 0.17, 0.28], true);

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }

    // 4. Traditional Geisha Teahouse (Ochaya / お茶屋)
    static createOchayaMesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const sub = new THREE.Group();
        const cedarMat = MaterialLibrary.get('woodDark');
        const screenMat = MaterialLibrary.get('reedScreen');
        const lightWood = MaterialLibrary.get('woodLight');

        // Foundation
        Kit.addStoneFoundation(sub, s * 0.86, s * 0.82, 0.12);

        // Ground floor: Sukiya-zukuri cedar lattice & bamboo reed screens (sudare)
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.78, 0.78, s * 0.74), cedarMat, [0, 0.51, 0], true, null, true);
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.58, 0.54, 0.03), screenMat, [0, 0.46, s * 0.38]);

        // Entrance porch lintel & 3 hanging vermilion Chōchin lanterns
        Kit.addPart(sub, new THREE.BoxGeometry(0.85, 0.05, 0.20), cedarMat, [0, 0.88, s * 0.42], true);
        for (const xOff of [-0.32, 0, 0.32]) {
            Kit.addChochinLantern(sub, [xOff, 0.74, s * 0.42], true);
        }

        // Intermediate Hisashi awning
        Kit.addHisashiAwning(sub, s * 0.92, 0.38, 0.94, s * 0.42);

        // Second floor: Elegant banquet room with wrap-around balcony balustrade
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.76, 0.76, s * 0.72), cedarMat, [0, 1.34, 0], true, null, true);
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.86, 0.05, 0.24), lightWood, [0, 0.97, s * 0.42], true);
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.86, 0.22, 0.03), cedarMat, [0, 1.10, s * 0.52], true); // Railing

        // Glowing Shoji lattice panels on upper banquet room
        Kit.addKoushiLattice(sub, s * 0.60, 0.46, [0, 1.38, s * 0.37]);
        Kit.addKoushiLattice(sub, s * 0.52, 0.46, [-s * 0.39, 1.38, 0], true);

        // Main Japanese Kawara roof
        Kit.addGabledRoof(sub, s * 0.94, s * 0.88, 0.45, 1.72);

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }

    // 5. Public Bathhouse (Sentō / 銭湯)
    static createSentoMesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const sub = new THREE.Group();

        Kit.addStoneFoundation(sub, s * 0.88, s * 0.84, 0.12);

        // Lower timber wainscot & upper white plaster bathhouse hall
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.80, 0.40, s * 0.76), MaterialLibrary.get('woodMedium'), [0, 0.32, 0], true);
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.78, 0.70, s * 0.74), MaterialLibrary.get('plasterWhite'), [0, 0.87, 0], true, null, true);

        // Main Kawara roof
        Kit.addGabledRoof(sub, s * 0.94, s * 0.88, 0.46, 1.22);

        // Clerestory steam-vent roof monitor along ridge
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.45, 0.16, s * 0.32), MaterialLibrary.get('woodDark'), [0, 1.68, 0], true);
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.48, 0.04, s * 0.36), MaterialLibrary.get('kawaraRoof'), [0, 1.78, 0]);

        // Ornate Karahafu (curved cusped gable) entrance porch
        Kit.addKarahafuGable(sub, 0.62, 0.28, 0.20, [0, 0.72, s * 0.42]);

        // Split indigo Sentō Noren curtain at doorway
        Kit.addPart(sub, new THREE.BoxGeometry(0.50, 0.32, 0.03), MaterialLibrary.get('norenIndigo'), [0, 0.46, s * 0.40], true);

        // Tall rear timber-and-brick boiler chimney
        Kit.addPart(sub, new THREE.BoxGeometry(0.30, 0.60, 0.30), MaterialLibrary.get('redBrick'), [0, 0.42, -s * 0.38], true);
        Kit.addPart(sub, new THREE.CylinderGeometry(0.09, 0.12, 1.70, 8), MaterialLibrary.get('woodDark'), [0, 1.45, -s * 0.38], true);

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }

    // 6. Police Box (Kōban / 交番)
    static createKobanMesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const sub = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const woodMat = MaterialLibrary.get('woodDark');
        const trimMat = MaterialLibrary.get('stoneTrim');
        const glassMat = MaterialLibrary.get('glassWindow');

        // Octagonal granite plinth
        Kit.addPart(sub, new THREE.CylinderGeometry(s * 0.38, s * 0.40, 0.14, 8), MaterialLibrary.get('stoneGranite'), [0, 0.07, 0], true);

        // Octagonal red-brick body with stone quoins
        Kit.addPart(sub, new THREE.CylinderGeometry(s * 0.32, s * 0.32, 1.30, 8), MaterialLibrary.get('redBrick'), [0, 0.79, 0], true, null, true);
        Kit.addPart(sub, new THREE.CylinderGeometry(s * 0.33, 0.33, 0.08, 8), trimMat, [0, 0.26, 0]); // Dado trim
        Kit.addPart(sub, new THREE.CylinderGeometry(s * 0.34, 0.34, 0.08, 8), trimMat, [0, 1.38, 0]); // Cornice

        // Wooden front door
        Kit.addPart(sub, new THREE.BoxGeometry(0.36, 0.88, 0.08), woodMat, [0, 0.58, s * 0.30], true);

        // Flanking arched glass windows
        for (const wx of [-0.28, 0.28]) {
            Kit.addPart(sub, new THREE.BoxGeometry(0.20, 0.40, 0.04), glassMat, [wx, 0.82, s * 0.22], false, null, false, 'Upper_Window');
        }

        // Pointed octagonal slate roof with brass finial
        Kit.addPart(sub, new THREE.ConeGeometry(s * 0.44, 0.55, 8), MaterialLibrary.get('slateRoof'), [0, 1.70, 0], true);
        Kit.addPart(sub, new THREE.CylinderGeometry(0.02, 0.05, 0.22, 6), MaterialLibrary.get('goldLeaf'), [0, 2.05, 0]);

        // Signature glowing red police globe lamp on wrought-iron bracket over entrance
        Kit.addPart(sub, new THREE.BoxGeometry(0.04, 0.04, 0.28), MaterialLibrary.get('darkIron'), [0, 1.28, s * 0.40]);
        Kit.addPart(sub, new THREE.SphereGeometry(0.10, 8, 8), MaterialLibrary.get('redLantern'), [0, 1.15, s * 0.48], false, null, false, 'Lantern_Body');

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }

    // 7. 2x2 Giyōfū Primary School (Shōgakkō / 小学校 — Kaichi Style)
    static createSchoolMesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const sub = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const plasterMat = MaterialLibrary.get('plasterWhite');
        const woodMat = MaterialLibrary.get('woodDark');
        const trimMat = MaterialLibrary.get('stoneTrim');
        const roofMat = MaterialLibrary.get('slateRoof');
        const glassMat = MaterialLibrary.get('glassWindow');

        // Symmetrical 2-story Giyōfū landmark
        Kit.addStoneFoundation(sub, s * 1.70, s * 1.40, 0.16);

        // Ground floor: White plaster with dark timber framing
        Kit.addPart(sub, new THREE.BoxGeometry(s * 1.60, 0.88, s * 1.30), plasterMat, [0, 0.60, 0], true, null, true);
        Kit.addCornerPillars(sub, s * 1.62, s * 1.32, 0.88, 0.60, 0, 0.10, woodMat);

        // String course dividing floors
        Kit.addPart(sub, new THREE.BoxGeometry(s * 1.64, 0.08, s * 1.34), trimMat, [0, 1.08, 0], true);

        // Second floor: White plaster with timber corner pilasters
        Kit.addPart(sub, new THREE.BoxGeometry(s * 1.56, 0.84, s * 1.26), plasterMat, [0, 1.54, 0], true, null, true);
        Kit.addCornerPillars(sub, s * 1.58, s * 1.28, 0.84, 1.54, 0, 0.10, woodMat);

        // Arched Western sash windows across facade
        for (const wx of [-0.60 * s, -0.32 * s, 0.32 * s, 0.60 * s]) {
            Kit.addPart(sub, new THREE.BoxGeometry(0.24, 0.44, 0.03), glassMat, [wx, 0.58, s * 0.655], false, null, false, 'Upper_Window');
            Kit.addPart(sub, new THREE.BoxGeometry(0.24, 0.44, 0.03), glassMat, [wx, 1.52, s * 0.635], false, null, false, 'Upper_Window');
        }

        // Central entrance portico & balcony
        Kit.addPart(sub, new THREE.BoxGeometry(0.48 * s, 0.06, 0.25 * s), trimMat, [0, 1.08, 0.72 * s], true);
        Kit.addPart(sub, new THREE.CylinderGeometry(0.04, 0.05, 0.88, 8), plasterMat, [-0.20 * s, 0.60, 0.72 * s], true);
        Kit.addPart(sub, new THREE.CylinderGeometry(0.04, 0.05, 0.88, 8), plasterMat, [0.20 * s, 0.60, 0.72 * s], true);

        // Main hipped slate roof
        const roofGeo = new THREE.ConeGeometry(s * 1.20, 0.75, 4);
        roofGeo.rotateY(Math.PI / 4);
        Kit.addPart(sub, roofGeo, roofMat, [0, 2.34, 0], true);

        // Iconic octagonal rooftop belfry / clock cupola
        Kit.addPart(sub, new THREE.CylinderGeometry(0.32, 0.34, 0.45, 8), plasterMat, [0, 2.92, 0], true);
        Kit.addPart(sub, new THREE.ConeGeometry(0.38, 0.40, 8), roofMat, [0, 3.35, 0], true);
        Kit.addPart(sub, new THREE.CylinderGeometry(0.015, 0.015, 0.35, 4), MaterialLibrary.get('goldLeaf'), [0, 3.65, 0]); // Spire

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }

    // 8. Telegraph Office (Denshin-kyoku / 電信局)
    static createTelegraphOfficeMesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const sub = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const brickMat = MaterialLibrary.get('redBrick');
        const trimMat = MaterialLibrary.get('stoneTrim');
        const ironMat = MaterialLibrary.get('darkIron');
        const glassMat = MaterialLibrary.get('glassWindow');

        // Foundation
        Kit.addStoneFoundation(sub, s * 0.80, s * 0.80, 0.12);

        // Red-brick facade with white stone corner quoins
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.72, 1.25, s * 0.72), brickMat, [0, 0.74, 0], true, null, true);
        for (const qx of [-s * 0.36, s * 0.36]) {
            for (const qz of [-s * 0.36, s * 0.36]) {
                Kit.addPart(sub, new THREE.BoxGeometry(0.08, 1.25, 0.08), trimMat, [qx, 0.74, qz]);
            }
        }

        // Arched windows & copper entrance canopy
        Kit.addPart(sub, new THREE.BoxGeometry(0.24, 0.44, 0.03), glassMat, [-0.22, 0.72, s * 0.365], false, null, false, 'Upper_Window');
        Kit.addPart(sub, new THREE.BoxGeometry(0.24, 0.44, 0.03), glassMat, [0.22, 0.72, s * 0.365], false, null, false, 'Upper_Window');
        Kit.addPart(sub, new THREE.BoxGeometry(0.40, 0.05, 0.22), MaterialLibrary.get('copperRoof'), [0, 0.88, s * 0.44], true);

        // Classical cornice & hipped slate roof
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.76, 0.08, s * 0.76), trimMat, [0, 1.40, 0], true);
        const roofGeo = new THREE.ConeGeometry(s * 0.60, 0.55, 4);
        roofGeo.rotateY(Math.PI / 4);
        Kit.addPart(sub, roofGeo, MaterialLibrary.get('slateRoof'), [0, 1.72, 0], true);

        // Rooftop iron telegraph mast with triple crossarms & porcelain insulators
        Kit.addPart(sub, new THREE.CylinderGeometry(0.02, 0.026, 1.65, 6), ironMat, [0, 2.78, 0], true);
        for (const [my, mw] of [[2.85, 0.52], [3.15, 0.42], [3.45, 0.32]]) {
            Kit.addPart(sub, new THREE.BoxGeometry(mw, 0.025, 0.025), ironMat, [0, my, 0]);
            for (const ix of [-mw * 0.42, 0, mw * 0.42]) {
                Kit.addPart(sub, new THREE.CylinderGeometry(0.018, 0.022, 0.06, 5), MaterialLibrary.get('plasterWhite'), [ix, my + 0.04, 0]);
            }
        }

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }

    // 9. 2x1 Municipal Waterworks (水道局)
    static createWaterworksMesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const sub = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const stoneMat = MaterialLibrary.get('stoneGranite');
        const trimMat = MaterialLibrary.get('stoneTrim');
        const brickMat = MaterialLibrary.get('redBrick');
        const glassMat = MaterialLibrary.get('glassWindow');

        // Spanning 2x1 footprint
        Kit.addPart(sub, new THREE.BoxGeometry(s * 1.85, 0.18, s * 0.90), stoneMat, [0, 0.09, 0], false, null, true);

        // Left half: Slow-sand filtration basin with granite coping & water surface
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.92, 0.16, s * 0.76), trimMat, [-0.42 * s, 0.22, 0]);
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.82, 0.08, s * 0.66), MaterialLibrary.get('strawTawara'), [-0.42 * s, 0.20, 0]); // Sand bed
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.80, 0.02, s * 0.64), MaterialLibrary.get('waterSurface'), [-0.42 * s, 0.26, 0]);

        // Right half: Red-brick steam pumping station hall & standpipe tower
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.68, 0.96, s * 0.70), brickMat, [0.45 * s, 0.58, 0], true, null, true);
        Kit.addPart(sub, new THREE.BoxGeometry(s * 0.72, 0.06, s * 0.74), trimMat, [0.45 * s, 1.08, 0]);
        Kit.addPart(sub, new THREE.ConeGeometry(s * 0.50, 0.44, 4), MaterialLibrary.get('slateRoof'), [0.45 * s, 1.34, 0], true);

        // Pumping hall arched windows
        Kit.addPart(sub, new THREE.BoxGeometry(0.22, 0.42, 0.03), glassMat, [0.45 * s, 0.62, s * 0.355], false, null, false, 'Upper_Window');

        // Iron standpipe tank
        Kit.addPart(sub, new THREE.CylinderGeometry(0.12, 0.12, 1.40, 8), MaterialLibrary.get('darkIron'), [0.72 * s, 0.80, -0.22 * s], true);

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }

    // 10. Canal Watergate Sluice (Suimon / 水門)
    static createSuimonMesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const stoneMat = MaterialLibrary.get('stoneGranite');
        const trimMat = MaterialLibrary.get('stoneTrim');
        const woodMat = MaterialLibrary.get('woodDark');
        const ironMat = MaterialLibrary.get('darkIron');

        // Heavy twin granite abutment piers straddling canal
        for (const x of [-0.48, 0.48]) {
            Kit.addPart(group, new THREE.BoxGeometry(0.32, 0.95, 0.76), stoneMat, [x, 0.475, 0], true, null, true);
            Kit.addPart(group, new THREE.BoxGeometry(0.36, 0.06, 0.80), trimMat, [x, 0.96, 0], true);
        }

        // Heavy timber winch bridge across the top
        Kit.addPart(group, new THREE.BoxGeometry(1.24, 0.16, 0.36), woodMat, [0, 0.92, 0], true);
        Kit.addGabledRoof(group, 1.35, 0.48, 0.22, 1.02);

        // Banded oak sluice floodgate leaf
        Kit.addPart(group, new THREE.BoxGeometry(0.68, 0.78, 0.08), woodMat, [0, 0.38, 0], true);
        Kit.addPart(group, new THREE.BoxGeometry(0.70, 0.04, 0.10), ironMat, [0, 0.65, 0]);
        Kit.addPart(group, new THREE.BoxGeometry(0.70, 0.04, 0.10), ironMat, [0, 0.20, 0]);

        // Dual vertical iron rack gears & winch gear wheels
        for (const x of [-0.22, 0.22]) {
            Kit.addPart(group, new THREE.CylinderGeometry(0.09, 0.09, 0.05, 8), ironMat, [x, 1.08, 0], false, [0, 0, Math.PI / 2]);
            Kit.addPart(group, new THREE.BoxGeometry(0.025, 0.45, 0.025), ironMat, [x, 0.75, 0]);
        }

        group.rotation.y = facingAngle;
        return group;
    }

    // 11. 3x3 Imperial Industrial Exhibition Pavilion (内国勧業博覧会 パビリオン)
    static createPavilionMesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const sub = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const plasterMat = MaterialLibrary.get('plasterWhite');
        const trimMat = MaterialLibrary.get('stoneTrim');
        const domeMat = MaterialLibrary.get('copperRoof');
        const goldMat = MaterialLibrary.get('goldLeaf');

        // 1. Grand stepped granite plaza
        Kit.addPart(sub, new THREE.BoxGeometry(s * 2.80, 0.22, s * 2.80), MaterialLibrary.get('stoneGranite'), [0, 0.11, 0], false, null, true);
        Kit.addPart(sub, new THREE.BoxGeometry(s * 2.50, 0.08, s * 2.50), trimMat, [0, 0.26, 0], false, null, true);

        // 2. Colonnaded central wing & flanking palace wings
        Kit.addPart(sub, new THREE.BoxGeometry(s * 2.25, 1.35, s * 1.90), plasterMat, [0, 0.95, -0.05 * s], true, null, true);
        Kit.addPart(sub, new THREE.BoxGeometry(s * 2.30, 0.08, s * 1.95), trimMat, [0, 1.65, -0.05 * s]);

        // 3. Central triumphal portico with classical Tuscan columns
        for (const cx of [-0.65 * s, -0.22 * s, 0.22 * s, 0.65 * s]) {
            Kit.addPart(sub, new THREE.CylinderGeometry(0.06, 0.07, 1.35, 8), plasterMat, [cx, 0.95, 0.95 * s], true);
            Kit.addPart(sub, new THREE.BoxGeometry(0.18, 0.06, 0.18), trimMat, [cx, 1.64, 0.95 * s]);
        }
        Kit.addPart(sub, new THREE.BoxGeometry(1.55 * s, 0.10, 0.40 * s), trimMat, [0, 1.70, 0.95 * s], true);

        // Portico pediment
        const porticoPed = new THREE.ConeGeometry(0.85 * s, 0.42, 4);
        porticoPed.rotateY(Math.PI / 4);
        Kit.addPart(sub, porticoPed, trimMat, [0, 1.94, 0.95 * s]);

        // 4. Second drum tier & soaring ribbed copper dome
        Kit.addPart(sub, new THREE.BoxGeometry(s * 1.65, 0.90, s * 1.50), plasterMat, [0, 2.10, -0.05 * s], true, null, true);
        Kit.addPart(sub, new THREE.CylinderGeometry(0.55, 0.60, 0.65, 12), plasterMat, [0, 2.85, -0.05 * s], true);

        // Copper dome with ribs
        Kit.addPart(sub, new THREE.ConeGeometry(0.68, 0.85, 12), domeMat, [0, 3.50, -0.05 * s], true);

        // Gilded imperial spire & bronze finial
        Kit.addPart(sub, new THREE.CylinderGeometry(0.02, 0.04, 0.65, 6), goldMat, [0, 4.10, -0.05 * s]);
        Kit.addPart(sub, new THREE.SphereGeometry(0.08, 8, 8), goldMat, [0, 4.45, -0.05 * s]);

        // Stone corner lanterns on plaza
        for (const [lx, lz] of [[-1.25 * s, 1.25 * s], [1.25 * s, 1.25 * s]]) {
            Kit.addPart(sub, new THREE.BoxGeometry(0.14, 0.40, 0.14), trimMat, [lx, 0.45, lz], true);
            Kit.addPart(sub, new THREE.BoxGeometry(0.10, 0.10, 0.10), MaterialLibrary.get('redLantern'), [lx, 0.70, lz]);
        }

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }
}
