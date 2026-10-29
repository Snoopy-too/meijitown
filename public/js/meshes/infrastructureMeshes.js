// Project Meiji - Maritime & Railway Infrastructure Mesh Builders (infrastructureMeshes.js)
// Phase 2 /artisan: 2x2 Harbor Trade Pier (Funatsuki-ba) & Meiji Railway Station Depot

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { MaterialLibrary } from '../renderer/materialLibrary.js';
import { MeijiArchitectureKit as Kit } from './meijiArchitectureKit.js';

export class InfrastructureMeshes {
    // 1. 2x2 Harbor Cargo Pier (Funatsuki-ba / 船着場)
    static createHarborPierMesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const sub = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const width = s * 1.85;

        const timberMat = MaterialLibrary.get('woodDark');
        const deckMat = MaterialLibrary.get('woodMedium');
        const ironMat = MaterialLibrary.get('darkIron');
        const crateMat = MaterialLibrary.get('woodLight');
        const strawMat = MaterialLibrary.get('strawTawara');
        const stoneMat = MaterialLibrary.get('stoneGranite');
        const trimMat = MaterialLibrary.get('stoneTrim');

        // 1. Heavy stone seawall embankment with dressed granite coping
        Kit.addPart(sub, new THREE.BoxGeometry(width, 0.22, width), stoneMat, [0, 0.11, 0], false, null, true);
        Kit.addPart(sub, new THREE.BoxGeometry(width + 0.04, 0.05, width + 0.04), trimMat, [0, 0.23, 0], false, null, true);

        // 2. Heavy timber plank wharf decking
        Kit.addPart(sub, new THREE.BoxGeometry(width * 0.94, 0.04, width * 0.94), deckMat, [0, 0.27, 0], false, null, true);

        // 3. Weathered mooring pilings & iron tie-bollards along water front
        for (const px of [-0.80 * s, -0.40 * s, 0, 0.40 * s, 0.80 * s]) {
            Kit.addPart(sub, new THREE.CylinderGeometry(0.065, 0.075, 0.70, 8), timberMat, [px, 0.12, 0.92 * s], true);
            Kit.addPart(sub, new THREE.CylinderGeometry(0.04, 0.045, 0.28, 6), ironMat, [px, 0.40, 0.86 * s]);
            Kit.addPart(sub, new THREE.CylinderGeometry(0.055, 0.055, 0.04, 6), ironMat, [px, 0.52, 0.86 * s]); // Cap
        }

        // 4. Braced timber A-frame derrick crane with hoist winch & iron hook
        const craneX = -0.45 * s;
        const craneZ = 0.45 * s;
        // Crane turntable base
        Kit.addPart(sub, new THREE.CylinderGeometry(0.18, 0.20, 0.20, 8), ironMat, [craneX, 0.38, craneZ]);
        // Vertical mast
        Kit.addPart(sub, new THREE.CylinderGeometry(0.05, 0.06, 2.05, 6), timberMat, [craneX, 1.30, craneZ], true);
        // Angled timber jib boom extending toward water
        const boom = Kit.addPart(sub, new THREE.CylinderGeometry(0.04, 0.045, 1.85, 6), timberMat, [craneX + 0.28 * s, 1.95, craneZ + 0.32 * s], true);
        boom.rotation.set(-0.65, 0, 0.32);
        // Diagonal timber back-stays
        const stay = Kit.addPart(sub, new THREE.CylinderGeometry(0.035, 0.035, 1.55, 6), timberMat, [craneX - 0.20 * s, 1.25, craneZ - 0.25 * s], true);
        stay.rotation.set(0.60, 0, -0.38);

        // Hoist winch drum & cable with cargo hook
        Kit.addPart(sub, new THREE.CylinderGeometry(0.08, 0.08, 0.22, 8), ironMat, [craneX, 0.65, craneZ + 0.12 * s], true, [0, 0, Math.PI / 2]);
        Kit.addPart(sub, new THREE.CylinderGeometry(0.008, 0.008, 1.35, 4), ironMat, [craneX + 0.55 * s, 1.45, craneZ + 0.60 * s]);
        Kit.addPart(sub, new THREE.BoxGeometry(0.08, 0.10, 0.08), ironMat, [craneX + 0.55 * s, 0.75, craneZ + 0.60 * s]); // Hook block

        // 5. Stacked Kome-dawara straw rice bales & tea export crates
        const tawaraGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.50, 8);
        tawaraGeo.rotateZ(Math.PI / 2);
        for (const [tx, tz] of [[0.35 * s, -0.25 * s], [0.35 * s, 0.15 * s], [0.58 * s, -0.05 * s]]) {
            Kit.addPart(sub, tawaraGeo, strawMat, [tx, 0.40, tz], true);
        }
        Kit.addPart(sub, tawaraGeo, strawMat, [0.46 * s, 0.62, -0.05 * s], true); // Top pyramid bale

        // Wooden stenciled export crates & barrels
        Kit.addPart(sub, new THREE.BoxGeometry(0.42, 0.38, 0.42), crateMat, [-0.35 * s, 0.47, -0.35 * s], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.34, 0.30, 0.34), crateMat, [-0.58 * s, 0.43, -0.05 * s], true);
        Kit.addPart(sub, new THREE.CylinderGeometry(0.14, 0.16, 0.36, 8), timberMat, [-0.20 * s, 0.46, -0.15 * s], true);

        // 6. Harbor master's watch booth with warm gas lantern
        Kit.addPart(sub, new THREE.BoxGeometry(0.55 * s, 0.65, 0.45 * s), MaterialLibrary.get('plasterWarm'), [0.55 * s, 0.60, -0.60 * s], true, null, true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.58 * s, 0.08, 0.48 * s), MaterialLibrary.get('slateRoof'), [0.55 * s, 0.96, -0.60 * s], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.24, 0.30, 0.02), MaterialLibrary.get('glassWindow'), [0.55 * s, 0.62, -0.37 * s], false, null, false, 'Upper_Window');

        // Hanging gas lamp at booth entrance
        Kit.addPart(sub, new THREE.CylinderGeometry(0.015, 0.015, 0.18, 4), ironMat, [0.32 * s, 0.82, -0.42 * s]);
        Kit.addPart(sub, new THREE.CylinderGeometry(0.05, 0.06, 0.12, 6), MaterialLibrary.get('gasLantern'), [0.32 * s, 0.72, -0.42 * s], false, null, false, 'Lantern_Body');

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }

    // 2. Train Depot Platform & Waiting Shed (驛舎)
    static createTrainDepotMesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const woodMat = MaterialLibrary.get('woodDark');
        const lightWood = MaterialLibrary.get('woodLight');
        const roofMat = MaterialLibrary.get('slateRoof');
        const ironMat = MaterialLibrary.get('darkIron');
        const brickMat = MaterialLibrary.get('redBrick');
        const stoneMat = MaterialLibrary.get('stoneGranite');
        const trimMat = MaterialLibrary.get('stoneTrim');

        // 1. Cut-stone passenger platform with white safety edge curb
        Kit.addPart(group, new THREE.BoxGeometry(s * 0.96, 0.14, 0.90), stoneMat, [0, 0.07, -0.32], true, null, true);
        Kit.addPart(group, new THREE.BoxGeometry(s * 0.96, 0.025, 0.08), MaterialLibrary.get('plasterWhite'), [0, 0.145, 0.12]); // White safety curb

        // 2. Timber-and-brick station building & waiting shed
        Kit.addPart(group, new THREE.BoxGeometry(0.50, 0.68, 0.48), brickMat, [-0.22, 0.48, -0.52], true, null, true);
        Kit.addPart(group, new THREE.BoxGeometry(0.22, 0.34, 0.02), MaterialLibrary.get('shojiWindow'), [-0.22, 0.52, -0.27], false, null, false, 'Front_Koushi'); // Ticket window

        // Gabled wooden waiting canopy posts
        const postGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.88, 6);
        for (const px of [0.12, 0.44]) {
            for (const pz of [-0.68, -0.22]) {
                Kit.addPart(group, postGeo, woodMat, [px, 0.55, pz], true);
            }
        }

        // Slanted corrugated/slate passenger canopy roof
        const canopyRoof = Kit.addPart(group, new THREE.BoxGeometry(0.68, 0.04, 0.64), roofMat, [0.28, 1.02, -0.45], true);
        canopyRoof.rotation.x = -0.12;

        // Waiting bench (slatted cedar)
        Kit.addPart(group, new THREE.BoxGeometry(0.48, 0.04, 0.16), lightWood, [0.28, 0.22, -0.50], true);
        Kit.addPart(group, new THREE.BoxGeometry(0.48, 0.18, 0.03), lightWood, [0.28, 0.33, -0.58], true);

        // Ekimei-hyō traditional station name signpost
        Kit.addPart(group, new THREE.CylinderGeometry(0.02, 0.02, 0.70, 4), woodMat, [0.42, 0.45, -0.10], true);
        Kit.addPart(group, new THREE.BoxGeometry(0.24, 0.14, 0.02), MaterialLibrary.get('plasterWhite'), [0.42, 0.68, -0.10]);
        Kit.addPart(group, new THREE.BoxGeometry(0.26, 0.02, 0.03), woodMat, [0.42, 0.76, -0.10]);

        // Emissive station bracket gas lamp
        Kit.addPart(group, new THREE.CylinderGeometry(0.015, 0.015, 0.22, 4), ironMat, [0.12, 0.82, -0.22]);
        Kit.addPart(group, new THREE.CylinderGeometry(0.04, 0.05, 0.12, 6), MaterialLibrary.get('gasLantern'), [0.12, 0.72, -0.22], false, null, false, 'Lantern_Body');

        // 3. Ballasted siding track with wooden sleepers and steel rails
        const tieGeo = new THREE.BoxGeometry(0.12, 0.028, 0.72);
        for (let i = 0; i < 5; i++) {
            const x = (i - 2) * (s / 4.5);
            Kit.addPart(group, tieGeo, woodMat, [x, 0.015, 0.50]);
        }

        const railGeo = new THREE.BoxGeometry(s * 0.98, 0.045, 0.035);
        Kit.addPart(group, railGeo, ironMat, [0, 0.045, 0.34]);
        Kit.addPart(group, railGeo, ironMat, [0, 0.045, 0.66]);

        group.rotation.y = facingAngle;
        return group;
    }
}
