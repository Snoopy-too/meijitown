// Project Meiji - Industrial & Power Mesh Builders (industrialMeshes.js)
// Phase 2 /artisan: Artisan Workshop L1, Tomioka Silk Mill L2 & 2x2 Coal Steam Power Plant

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { MaterialLibrary } from '../renderer/materialLibrary.js';
import { MeijiArchitectureKit as Kit } from './meijiArchitectureKit.js';

export class IndustrialMeshes {
    // 1. Industrial Level 1: Craft & Kiln Workshop (工房 / 登り窯)
    static createWorkshopL1Mesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const sub = new THREE.Group();
        const woodMat = MaterialLibrary.get('woodDark');
        const lightWood = MaterialLibrary.get('woodLight');
        const brickMat = MaterialLibrary.get('redBrick');
        const stoneMat = MaterialLibrary.get('stoneGranite');
        const ironMat = MaterialLibrary.get('darkIron');

        // 1. Cut-stone foundation plinth
        Kit.addStoneFoundation(sub, 1.54, 1.54, 0.12);

        // 2. Open timber-framed work shed (left wing)
        Kit.addPart(sub, new THREE.BoxGeometry(0.88, 0.72, 1.25), woodMat, [-0.26, 0.48, 0], true, null, true);
        Kit.addCornerPillars(sub, 0.90, 1.27, 0.72, 0.48, 0, 0.08);

        // Open bay workbench & pottery wheels
        Kit.addPart(sub, new THREE.BoxGeometry(0.70, 0.28, 0.35), lightWood, [-0.26, 0.26, 0.38], true);
        Kit.addPart(sub, new THREE.CylinderGeometry(0.12, 0.12, 0.08, 8), lightWood, [-0.42, 0.44, 0.38]);
        Kit.addPart(sub, new THREE.CylinderGeometry(0.08, 0.10, 0.14, 8), MaterialLibrary.get('plasterWarm'), [-0.15, 0.47, 0.38]); // Ceramic pot

        // Workshop shed gabled roof (offset over left wing shed at x = -0.26)
        Kit.addGabledRoof(sub, 1.08, 1.45, 0.38, 0.84, 0, null, -0.26);

        // 3. Stepped climbing kiln (Noborigama / 登り窯) in right yard
        // Chamber 1 (lower firebox)
        Kit.addPart(sub, new THREE.BoxGeometry(0.44, 0.38, 0.42), brickMat, [0.46, 0.31, 0.32], true);
        // Chamber 2 (middle firing chamber)
        Kit.addPart(sub, new THREE.BoxGeometry(0.44, 0.44, 0.42), brickMat, [0.46, 0.34, -0.08], true);
        // Chamber 3 (upper firing chamber)
        Kit.addPart(sub, new THREE.BoxGeometry(0.44, 0.50, 0.42), brickMat, [0.46, 0.37, -0.46], true);

        // Tapered brick smokestack with banded iron collar
        Kit.addPart(sub, new THREE.CylinderGeometry(0.09, 0.13, 1.35, 8), brickMat, [0.46, 1.04, -0.52], true);
        Kit.addPart(sub, new THREE.CylinderGeometry(0.14, 0.14, 0.08, 8), ironMat, [0.46, 1.70, -0.52]);

        // 4. Yard staging: Stacked cordwood logs & timber drying racks
        const logGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.52, 6);
        logGeo.rotateX(Math.PI / 2);
        Kit.addPart(sub, logGeo, lightWood, [0.18, 0.18, -0.42], true);
        Kit.addPart(sub, logGeo, lightWood, [0.18, 0.28, -0.42], true);
        Kit.addPart(sub, logGeo, lightWood, [0.18, 0.23, -0.32], true);

        // Wooden water soaking trough
        Kit.addPart(sub, new THREE.BoxGeometry(0.32, 0.18, 0.24), woodMat, [-0.26, 0.21, -0.52], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.28, 0.02, 0.20), MaterialLibrary.get('waterSurface'), [-0.26, 0.28, -0.52]);

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }

    // 2. Industrial Level 2: Modern Meiji Red-Brick Silk Reeling Mill (製糸場)
    static createTextileMillL2Mesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const sub = new THREE.Group();
        const brickMat = MaterialLibrary.get('redBrick');
        const trimMat = MaterialLibrary.get('stoneTrim');
        const glassMat = MaterialLibrary.get('glassWindow');
        const roofMat = MaterialLibrary.get('slateRoof');
        const ironMat = MaterialLibrary.get('darkIron');
        const woodMat = MaterialLibrary.get('woodDark');

        // 1. Granite plinth foundation
        Kit.addStoneFoundation(sub, 1.62, 1.62, 0.14);

        // 2. Main 2-story brick reeling hall with white timber truss framework
        Kit.addPart(sub, new THREE.BoxGeometry(1.38, 0.88, 1.06), brickMat, [-0.06, 0.58, 0.14], true, null, true);
        Kit.addPart(sub, new THREE.BoxGeometry(1.42, 0.06, 1.10), trimMat, [-0.06, 0.58, 0.14]); // Belt course

        // Clerestory roof monitor along ridge for natural silk-sorting daylight
        Kit.addGabledRoof(sub, 1.48, 1.16, 0.34, 1.02, 0.14, roofMat, -0.06);
        Kit.addPart(sub, new THREE.BoxGeometry(0.85, 0.18, 0.32), trimMat, [-0.06, 1.42, 0.14], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.80, 0.10, 0.34), glassMat, [-0.06, 1.42, 0.14], false, null, false, 'Upper_Window');

        // Multi-pane factory windows (ground & upper floor)
        const winGeo = new THREE.BoxGeometry(0.18, 0.22, 0.04);
        for (const wx of [-0.52, -0.28, -0.04, 0.20, 0.44]) {
            Kit.addPart(sub, winGeo, glassMat, [wx - 0.06, 0.36, 0.68], false, null, false, 'Upper_Window');
            Kit.addPart(sub, winGeo, glassMat, [wx - 0.06, 0.78, 0.68], false, null, false, 'Upper_Window');
            Kit.addPart(sub, new THREE.BoxGeometry(0.22, 0.04, 0.06), trimMat, [wx - 0.06, 0.23, 0.69]); // Sill
            Kit.addPart(sub, new THREE.BoxGeometry(0.22, 0.04, 0.06), trimMat, [wx - 0.06, 0.65, 0.69]); // Sill
        }

        // 3. Side boiler annex & tall tapered brick smokestack
        Kit.addPart(sub, new THREE.BoxGeometry(0.40, 0.46, 0.70), brickMat, [0.54, 0.37, 0.14], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.44, 0.06, 0.74), trimMat, [0.54, 0.61, 0.14]);
        Kit.addPart(sub, new THREE.BoxGeometry(0.40, 0.42, 0.42), brickMat, [0.54, 0.35, -0.45], true);

        // Tapered smokestack with banded iron collar
        Kit.addPart(sub, new THREE.CylinderGeometry(0.10, 0.16, 1.75, 8), brickMat, [0.54, 1.30, -0.45], true);
        Kit.addPart(sub, new THREE.CylinderGeometry(0.16, 0.16, 0.10, 8), ironMat, [0.54, 2.15, -0.45]);

        // 4. Detailed multi-spoke waterwheel attached to child group named 'wheel_hub'
        const wheelGroup = new THREE.Group();
        wheelGroup.name = 'wheel_hub';
        wheelGroup.position.set(-0.78, 0.38, 0.14);

        // Central iron shaft & axle hub
        const axleGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.14, 8);
        axleGeo.rotateZ(Math.PI / 2);
        Kit.addPart(wheelGroup, axleGeo, ironMat, [0, 0, 0]);

        // Outer rim
        const rimGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.06, 12);
        rimGeo.rotateZ(Math.PI / 2);
        Kit.addPart(wheelGroup, rimGeo, ironMat, [0, 0, 0], true);

        // 8 radiating timber spokes & buckets
        for (let i = 0; i < 4; i++) {
            const spoke = Kit.addPart(wheelGroup, new THREE.BoxGeometry(0.03, 0.54, 0.04), woodMat, [0, 0, 0]);
            spoke.rotation.x = (i * Math.PI) / 4;
        }

        sub.add(wheelGroup);

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }

    // 3. 2x2 Coal Steam Power Plant (火力発電所)
    static createPowerPlantMesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const sub = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const brickMat = MaterialLibrary.get('redBrick');
        const ironMat = MaterialLibrary.get('darkIron');
        const trimMat = MaterialLibrary.get('stoneTrim');
        const glassMat = MaterialLibrary.get('glassWindow');
        const coalMat = MaterialLibrary.get('plasterBlack');

        // 1. Heavy granite foundation apron
        Kit.addPart(sub, new THREE.BoxGeometry(s * 1.85, 0.20, s * 1.85), MaterialLibrary.get('stoneGranite'), [0, 0.10, 0], false, null, true);

        // 2. Massive brick turbine generator hall
        Kit.addPart(sub, new THREE.BoxGeometry(s * 1.12, 1.48, s * 1.42), brickMat, [-0.26 * s, 0.84, 0], true, null, true);
        Kit.addPart(sub, new THREE.BoxGeometry(s * 1.16, 0.08, s * 1.46), trimMat, [-0.26 * s, 0.88, 0]); // String course
        Kit.addPart(sub, new THREE.BoxGeometry(s * 1.20, 0.22, s * 1.48), ironMat, [-0.26 * s, 1.66, 0], true); // Entablature / roof plate

        // Arched turbine clerestory windows along outer flank
        for (const wz of [-0.48 * s, -0.16 * s, 0.16 * s, 0.48 * s]) {
            Kit.addPart(sub, new THREE.BoxGeometry(0.05, 0.58, 0.24), glassMat, [-0.83 * s, 0.90, wz], false, null, false, 'Upper_Window');
            Kit.addPart(sub, new THREE.BoxGeometry(0.07, 0.05, 0.28), trimMat, [-0.83 * s, 0.58, wz]);
        }

        // Ceramic high-voltage roof insulators
        for (const ix of [-0.45 * s, -0.25 * s, -0.05 * s]) {
            for (const iz of [-0.40 * s, 0.40 * s]) {
                Kit.addPart(sub, new THREE.CylinderGeometry(0.035, 0.045, 0.18, 6), MaterialLibrary.get('plasterWhite'), [ix, 1.86, iz]);
            }
        }

        // 3. Coal storage bunker yard with black coal mound
        Kit.addPart(sub, new THREE.BoxGeometry(0.65 * s, 0.35, 0.06), trimMat, [0.55 * s, 0.28, -0.72 * s]); // Wall
        Kit.addPart(sub, new THREE.BoxGeometry(0.06, 0.35, 0.70 * s), trimMat, [0.88 * s, 0.28, -0.37 * s]); // Wall
        // Irregular faceted coal heap
        const coalGeo = new THREE.DodecahedronGeometry(0.38 * s, 0);
        coalGeo.scale(1.2, 0.6, 1.0);
        Kit.addPart(sub, coalGeo, coalMat, [0.55 * s, 0.24, -0.36 * s], true);

        // 4. Heavy boiler house & twin industrial smokestacks
        Kit.addPart(sub, new THREE.BoxGeometry(0.55 * s, 0.75, 0.65 * s), brickMat, [0.52 * s, 0.48, 0.36 * s], true);

        // Overhead steel steam header manifold connecting boiler to turbine hall
        const pipeGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.50 * s, 8);
        pipeGeo.rotateZ(Math.PI / 2);
        Kit.addPart(sub, pipeGeo, ironMat, [0.12 * s, 1.25, 0.20 * s], true);
        Kit.addPart(sub, pipeGeo, ironMat, [0.12 * s, 1.25, 0.45 * s], true);

        // Twin iron smokestacks on brick octagonal pedestals
        for (const sz of [0.18 * s, 0.54 * s]) {
            Kit.addPart(sub, new THREE.CylinderGeometry(0.18, 0.22, 0.45, 8), brickMat, [0.55 * s, 0.95, sz], true);
            Kit.addPart(sub, new THREE.CylinderGeometry(0.13, 0.16, 2.50, 8), ironMat, [0.55 * s, 2.40, sz], true);
            Kit.addPart(sub, new THREE.CylinderGeometry(0.17, 0.17, 0.08, 8), ironMat, [0.55 * s, 3.62, sz]); // Top rim
        }

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }
}
