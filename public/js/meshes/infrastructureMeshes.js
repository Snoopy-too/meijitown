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

    // 2. Train Depot Platform & Waiting Shed (驛舎 - Seamless Centerline Through-Station)
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
        const whiteMat = MaterialLibrary.get('plasterWhite');
        const warmPlaster = MaterialLibrary.get('plasterWarm');
        const brassMat = new THREE.MeshStandardMaterial({ color: 0xc2a24a, metalness: 0.82, roughness: 0.26 });

        // 1. Centerline Mainline Through-Track (z = 0, exact 0.44m gauge & y = 0.065 rail height matching RailAutoTiler)
        const ballastBaseMat = new THREE.MeshLambertMaterial({ color: 0x3d3a36 });
        const ballastCrownMat = new THREE.MeshLambertMaterial({ color: 0x4c4843 });
        const tieMat = new THREE.MeshLambertMaterial({ color: 0x362518 });
        const plateMat = new THREE.MeshStandardMaterial({ color: 0x26282c, metalness: 0.75, roughness: 0.40 });
        const railMat = new THREE.MeshStandardMaterial({ color: 0x43474d, metalness: 0.72, roughness: 0.30 });

        Kit.addPart(group, new THREE.BoxGeometry(s * 1.01, 0.018, 1.22), ballastBaseMat, [0, 0.009, 0], false, null, true);
        Kit.addPart(group, new THREE.BoxGeometry(s * 1.01, 0.018, 0.96), ballastCrownMat, [0, 0.022, 0], false, null, true);

        const gauge = 0.44;
        const tieCount = 6;
        const tieSpacing = s / tieCount;
        const tieGeo = new THREE.BoxGeometry(0.11, 0.03, 0.84);
        const plateGeo = new THREE.BoxGeometry(0.13, 0.012, 0.08);

        for (let i = 0; i < tieCount; i++) {
            const x = (i + 0.5) * tieSpacing - (s / 2);
            Kit.addPart(group, tieGeo, tieMat, [x, 0.036, 0], true, null, true);
            Kit.addPart(group, plateGeo, plateMat, [x, 0.052, -gauge / 2]);
            Kit.addPart(group, plateGeo, plateMat, [x, 0.052, gauge / 2]);
        }

        const railGeo = new THREE.BoxGeometry(s * 1.02, 0.05, 0.042);
        Kit.addPart(group, railGeo, railMat, [0, 0.065, -gauge / 2], true);
        Kit.addPart(group, railGeo, railMat, [0, 0.065, gauge / 2], true);

        // Inlaid cedar plank passenger barrow crossing at East end of platform (x = +0.72)
        Kit.addPart(group, new THREE.BoxGeometry(0.32, 0.046, 0.36), lightWood, [0.72, 0.048, 0], false, null, true);

        // 2. Main Dressed-Granite Passenger Platform (z = -0.28 to -0.96, clear of locomotive loading gauge)
        Kit.addPart(group, new THREE.BoxGeometry(s * 0.96, 0.15, 0.66), stoneMat, [0, 0.075, -0.62], true, null, true);
        Kit.addPart(group, new THREE.BoxGeometry(s * 0.98, 0.026, 0.68), trimMat, [0, 0.15, -0.62], false, null, true);
        // White safety curb along trackside edge (z = -0.31)
        Kit.addPart(group, new THREE.BoxGeometry(s * 0.96, 0.028, 0.06), whiteMat, [0, 0.154, -0.31]);

        // Stepped granite access stairs at West & East platform ends
        for (const endX of [-0.92, 0.92]) {
            Kit.addPart(group, new THREE.BoxGeometry(0.08, 0.10, 0.42), trimMat, [endX, 0.05, -0.58], true);
            Kit.addPart(group, new THREE.BoxGeometry(0.08, 0.05, 0.42), stoneMat, [endX + (endX > 0 ? 0.06 : -0.06), 0.025, -0.58], true);
        }

        // 3. Meiji Giyōfū Red-Brick & Timber Station House (驛舎) on Main Platform
        Kit.addPart(group, new THREE.BoxGeometry(0.64, 0.68, 0.44), brickMat, [-0.34, 0.49, -0.71], true, null, true);
        // Quoined white stone corner pilasters & cornice belt
        for (const qx of [-0.64, -0.04]) {
            Kit.addPart(group, new THREE.BoxGeometry(0.05, 0.69, 0.46), trimMat, [qx, 0.49, -0.71]);
        }
        Kit.addPart(group, new THREE.BoxGeometry(0.68, 0.04, 0.48), trimMat, [-0.34, 0.84, -0.71]);
        // Pitched slate station roof & ridge cresting
        Kit.addPart(group, new THREE.BoxGeometry(0.74, 0.06, 0.54), roofMat, [-0.34, 0.89, -0.71], true);
        Kit.addPart(group, new THREE.BoxGeometry(0.68, 0.06, 0.34), roofMat, [-0.34, 0.95, -0.71], true);
        // Glazed ticket wicket & entrance doorway facing trackside platform walkway
        Kit.addPart(group, new THREE.BoxGeometry(0.22, 0.32, 0.02), MaterialLibrary.get('shojiWindow'), [-0.46, 0.52, -0.485], false, null, false, 'Front_Koushi');
        Kit.addPart(group, new THREE.BoxGeometry(0.18, 0.44, 0.025), woodMat, [-0.18, 0.38, -0.485]);
        // Brass station clock on gable facade
        Kit.addPart(group, new THREE.CylinderGeometry(0.055, 0.055, 0.025, 10), brassMat, [-0.34, 0.74, -0.48], false, [Math.PI / 2, 0, 0]);
        Kit.addPart(group, new THREE.CylinderGeometry(0.042, 0.042, 0.028, 10), warmPlaster, [-0.34, 0.74, -0.478], false, [Math.PI / 2, 0, 0]);

        // 4. Open Timber Passenger Waiting Canopy & Slatted Bench (East half of main platform)
        const postGeo = new THREE.CylinderGeometry(0.032, 0.036, 0.82, 6);
        for (const px of [0.10, 0.46, 0.78]) {
            for (const pz of [-0.84, -0.38]) {
                Kit.addPart(group, postGeo, woodMat, [px, 0.56, pz], true);
            }
        }
        const canopyRoof = Kit.addPart(group, new THREE.BoxGeometry(0.82, 0.045, 0.58), roofMat, [0.44, 0.98, -0.60], true);
        canopyRoof.rotation.x = 0.10; // Slopes gently toward back drainage gutter

        // Slatted cedar waiting bench beneath canopy
        Kit.addPart(group, new THREE.BoxGeometry(0.46, 0.035, 0.15), lightWood, [0.30, 0.24, -0.74], true);
        Kit.addPart(group, new THREE.BoxGeometry(0.46, 0.16, 0.03), lightWood, [0.30, 0.33, -0.80], true);

        // Emissive station bracket gas lamp on canopy post
        Kit.addPart(group, new THREE.CylinderGeometry(0.015, 0.015, 0.20, 4), ironMat, [0.10, 0.80, -0.36]);
        Kit.addPart(group, new THREE.CylinderGeometry(0.04, 0.05, 0.12, 6), MaterialLibrary.get('gasLantern'), [0.10, 0.72, -0.36], false, null, false, 'Lantern_Body');

        // 5. Opposite-Side Wayside Boarding Platform (z = +0.28 to +0.62) & Traditional Ekimei-hyō Signboard
        Kit.addPart(group, new THREE.BoxGeometry(s * 0.88, 0.12, 0.34), stoneMat, [0, 0.06, 0.45], true, null, true);
        Kit.addPart(group, new THREE.BoxGeometry(s * 0.88, 0.022, 0.05), whiteMat, [0, 0.125, 0.305]);

        // Ekimei-hyō (駅名標) timber station nameboard & wayside gas lamp post on opposite platform
        Kit.addPart(group, new THREE.CylinderGeometry(0.022, 0.022, 0.66, 6), woodMat, [-0.42, 0.42, 0.48], true);
        Kit.addPart(group, new THREE.CylinderGeometry(0.022, 0.022, 0.66, 6), woodMat, [-0.14, 0.42, 0.48], true);
        Kit.addPart(group, new THREE.BoxGeometry(0.36, 0.16, 0.025), whiteMat, [-0.28, 0.62, 0.48], true);
        Kit.addPart(group, new THREE.BoxGeometry(0.40, 0.03, 0.045), woodMat, [-0.28, 0.71, 0.48]);

        Kit.addPart(group, new THREE.CylinderGeometry(0.022, 0.028, 0.76, 6), ironMat, [0.46, 0.48, 0.48], true);
        Kit.addPart(group, new THREE.CylinderGeometry(0.045, 0.055, 0.13, 6), MaterialLibrary.get('gasLantern'), [0.46, 0.88, 0.48], false, null, false, 'Lantern_Body');

        group.rotation.y = facingAngle;
        return group;
    }
}
