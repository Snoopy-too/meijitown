// Project Meiji - Parametric Machiya (L1) & Kura-zukuri (L2) Architectural Builders
// Phase 2 /artisan: Deterministic Edo-Meiji Residential Archetypes with Spatial Grounding

import * as THREE from 'three';
import { MaterialLibrary } from '../renderer/materialLibrary.js';
import { MeijiArchitectureKit as Kit } from './meijiArchitectureKit.js';
import { getMachiyaPalette, getKuraPalette } from './masonryPalette.js';

function createRotatedWrapper(facingAngle, archetypeName, flip) {
    const group = new THREE.Group();
    const sub = new THREE.Group();
    group.userData = { residentialVariant: archetypeName, flip };
    return {
        group,
        sub,
        finalize() {
            sub.rotation.y = facingAngle;
            group.add(sub);
            return group;
        }
    };
}

function addWainscot(sub, width, depth, h, yBottom, zOffset, wainscotMat, trimMat, xOffset = 0) {
    Kit.addPart(sub, new THREE.BoxGeometry(width + 0.025, h, depth + 0.025), wainscotMat, [xOffset, yBottom + h / 2, zOffset], true, null, true);
    Kit.addPart(sub, new THREE.BoxGeometry(width + 0.045, 0.028, depth + 0.045), trimMat, [xOffset, yBottom + h + 0.01, zOffset]);
}

function addTiledHisashi(sub, width, depth, yPos, zFront, roofMat, timberMat, xOffset = 0) {
    const awning = Kit.addPart(sub, new THREE.BoxGeometry(width, 0.055, depth), roofMat, [xOffset, yPos, zFront], true);
    awning.rotation.x = 0.22;
    Kit.addPart(sub, new THREE.BoxGeometry(width + 0.02, 0.035, 0.035), timberMat, [xOffset, yPos - depth * 0.10, zFront + depth * 0.48]);
    for (const bx of [-width * 0.40, -width * 0.14, width * 0.14, width * 0.40]) {
        Kit.addPart(sub, new THREE.BoxGeometry(0.038, 0.12, depth * 0.72), timberMat, [xOffset + bx, yPos - 0.07, zFront - depth * 0.12], true);
    }
}

function addGroundStreetFacade(sub, { pal, wallW, wallFrontZ, yBase = 0.13, groundH = 0.72, hasNoren = false }) {
    const { flip, timberMat } = pal;
    const stoneMat = MaterialLibrary.get('stoneGranite');
    const shojiMat = MaterialLibrary.get('shojiWindow');
    const hinokiMat = MaterialLibrary.get('woodHinoki');

    // Center dividing pillar & horizontal nageshi tie-beam
    Kit.addPart(sub, new THREE.BoxGeometry(0.055, groundH, 0.055), timberMat, [-0.10 * flip, yBase + groundH / 2, wallFrontZ + 0.005], true);
    Kit.addPart(sub, new THREE.BoxGeometry(wallW + 0.03, 0.045, 0.05), timberMat, [0, yBase + groundH - 0.06, wallFrontZ + 0.005], true);

    // Kōshi lattice window bay on one side
    const koushiX = 0.28 * flip;
    Kit.addKoushiLattice(sub, 0.62, 0.46, [koushiX, yBase + 0.33, wallFrontZ + 0.016]);
    if (pal.hasSudare) {
        Kit.addPart(sub, new THREE.BoxGeometry(0.58, 0.16, 0.024), MaterialLibrary.get('reedScreen'), [koushiX, yBase + 0.50, wallFrontZ + 0.042], true);
    }

    // Genkan sliding lattice doorway on opposite side
    const doorX = -0.38 * flip;
    Kit.addPart(sub, new THREE.BoxGeometry(0.50, 0.08, 0.20), stoneMat, [doorX, 0.07, wallFrontZ + 0.06]);
    Kit.addPart(sub, new THREE.BoxGeometry(0.42, 0.58, 0.015), shojiMat, [doorX, yBase + 0.30, wallFrontZ + 0.012], false, null, false, 'Front_Koushi');
    Kit.addPart(sub, new THREE.BoxGeometry(0.46, 0.04, 0.04), timberMat, [doorX, yBase + 0.59, wallFrontZ + 0.022], true);
    Kit.addPart(sub, new THREE.BoxGeometry(0.46, 0.03, 0.035), timberMat, [doorX, yBase + 0.30, wallFrontZ + 0.022]);
    for (const dx of [-0.20, -0.07, 0, 0.07, 0.20]) {
        Kit.addPart(sub, new THREE.BoxGeometry(0.022, 0.58, 0.035), timberMat, [doorX + dx, yBase + 0.295, wallFrontZ + 0.022]);
    }

    // Optional hanging indigo noren shop curtain & nameplate
    if (hasNoren) {
        const norenMat = MaterialLibrary.get('norenIndigo');
        Kit.addPart(sub, new THREE.BoxGeometry(0.46, 0.016, 0.016), MaterialLibrary.get('bamboo'), [doorX, yBase + 0.57, wallFrontZ + 0.05]);
        for (const nx of [-0.14, 0, 0.14]) {
            Kit.addPart(sub, new THREE.BoxGeometry(0.125, 0.19, 0.012), norenMat, [doorX + nx, yBase + 0.48, wallFrontZ + 0.052], true);
        }
    }
    Kit.addPart(sub, new THREE.BoxGeometry(0.05, 0.14, 0.02), hinokiMat, [doorX + 0.24 * flip, yBase + 0.43, wallFrontZ + 0.03]);
    Kit.addChochinLantern(sub, [doorX + 0.25 * flip, yBase + 0.54, wallFrontZ + 0.10], pal.lanternIsRed);
}

function addMushikoWindows(sub, count, yCenter, wallFrontZ, timberMat) {
    const shojiMat = MaterialLibrary.get('shojiWindow');
    const xs = count === 2 ? [-0.34, 0.34] : [-0.38, 0, 0.38];
    for (const wx of xs) {
        Kit.addPart(sub, new THREE.BoxGeometry(0.20, 0.16, 0.015), shojiMat, [wx, yCenter, wallFrontZ + 0.012], false, null, false, 'Upper_Window');
        Kit.addPart(sub, new THREE.BoxGeometry(0.24, 0.028, 0.034), timberMat, [wx, yCenter + 0.08, wallFrontZ + 0.022]);
        Kit.addPart(sub, new THREE.BoxGeometry(0.24, 0.028, 0.034), timberMat, [wx, yCenter - 0.08, wallFrontZ + 0.022]);
        for (const mx of [-0.085, -0.028, 0.028, 0.085]) {
            Kit.addPart(sub, new THREE.BoxGeometry(0.02, 0.16, 0.03), timberMat, [wx + mx, yCenter, wallFrontZ + 0.022]);
        }
    }
}

function addYardDetail(sub, variant, center, timberMat) {
    const [cx, , cz] = center;
    const stoneMat = MaterialLibrary.get('stoneGranite');
    const trimMat = MaterialLibrary.get('stoneTrim');
    if (variant === 0) {
        Kit.addPart(sub, new THREE.CylinderGeometry(0.08, 0.06, 0.08, 8), stoneMat, [cx, 0.04, cz]);
        Kit.addPart(sub, new THREE.CylinderGeometry(0.02, 0.025, 0.16, 6), timberMat, [cx, 0.15, cz]);
        Kit.addPart(sub, new THREE.DodecahedronGeometry(0.11, 0), MaterialLibrary.get('toriiVermilion'), [cx, 0.27, cz], true);
    } else if (variant === 1) {
        const bambooMat = MaterialLibrary.get('bamboo');
        Kit.addPart(sub, new THREE.BoxGeometry(0.24, 0.04, 0.22), stoneMat, [cx, 0.02, cz]);
        for (const [bx, bz, bh] of [[-0.05, -0.04, 0.44], [0.05, 0.02, 0.54], [0.01, -0.06, 0.38]]) {
            Kit.addPart(sub, new THREE.CylinderGeometry(0.016, 0.018, bh, 6), bambooMat, [cx + bx, 0.04 + bh / 2, cz + bz], true);
        }
    } else if (variant === 2) {
        Kit.addPart(sub, new THREE.BoxGeometry(0.10, 0.06, 0.10), stoneMat, [cx, 0.03, cz]);
        Kit.addPart(sub, new THREE.CylinderGeometry(0.028, 0.036, 0.16, 6), trimMat, [cx, 0.14, cz]);
        Kit.addPart(sub, new THREE.BoxGeometry(0.08, 0.08, 0.08), MaterialLibrary.get('shojiWindow'), [cx, 0.25, cz]);
        Kit.addPart(sub, new THREE.ConeGeometry(0.10, 0.07, 4), stoneMat, [cx, 0.325, cz], true, [0, Math.PI / 4, 0]);
    } else {
        // Coopered rainwater tub + laundry drying rack
        Kit.addPart(sub, new THREE.CylinderGeometry(0.075, 0.065, 0.15, 8), MaterialLibrary.get('woodHinoki'), [cx - 0.14, 0.075, cz], true);
        for (const px of [-0.04, 0.22]) {
            Kit.addPart(sub, new THREE.BoxGeometry(0.025, 0.42, 0.025), timberMat, [cx + px, 0.21, cz], true);
        }
        Kit.addPart(sub, new THREE.BoxGeometry(0.32, 0.016, 0.016), MaterialLibrary.get('bamboo'), [cx + 0.09, 0.40, cz]);
        Kit.addPart(sub, new THREE.BoxGeometry(0.11, 0.22, 0.015), MaterialLibrary.get('norenIndigo'), [cx + 0.03, 0.29, cz + 0.01]);
        Kit.addPart(sub, new THREE.BoxGeometry(0.10, 0.20, 0.015), MaterialLibrary.get('plasterWhite'), [cx + 0.15, 0.30, cz + 0.01]);
    }
}

function addMachiyaShellAndYard(sub, pal, spec) {
    const { bodyW, bodyD, wallH, zOffset, frontZ, wainscotH, fenceW, fenceZ, propCenter, hasBench } = spec;
    const { plasterMat, wainscotMat, timberMat, trimMat, roofMat, flip } = pal;

    Kit.addStoneFoundation(sub, bodyW + 0.20, bodyD + 0.20, 0.13, zOffset);
    Kit.addPart(sub, new THREE.BoxGeometry(bodyW, wallH, bodyD), plasterMat, [0, 0.13 + wallH / 2, zOffset], true, null, true);
    addWainscot(sub, bodyW, bodyD, wainscotH, 0.13, zOffset, wainscotMat, timberMat);
    Kit.addCornerPillars(sub, bodyW + 0.04, bodyD + 0.04, wallH + 0.02, 0.13 + wallH / 2, zOffset, 0.085, timberMat);
    addGroundStreetFacade(sub, { pal, wallW: bodyW, wallFrontZ: frontZ, hasNoren: pal.propVariant !== 0 });

    if (hasBench) {
        const bx = flip * 0.28;
        Kit.addPart(sub, new THREE.BoxGeometry(0.42, 0.04, 0.20), MaterialLibrary.get('stoneGranite'), [bx, 0.02, frontZ + 0.14]);
        Kit.addPart(sub, new THREE.BoxGeometry(0.36, 0.032, 0.14), MaterialLibrary.get('woodHinoki'), [bx, 0.14, frontZ + 0.14], true);
        for (const lx of [-0.14, 0.14]) {
            Kit.addPart(sub, new THREE.BoxGeometry(0.03, 0.10, 0.12), timberMat, [bx + lx, 0.08, frontZ + 0.14]);
        }
        // Timber storm-shutter tobukuro box beside window
        Kit.addPart(sub, new THREE.BoxGeometry(0.13, 0.54, 0.055), trimMat, [flip * 0.58, 0.46, frontZ + 0.025], true);
    }

    if (fenceW > 0) {
        Kit.addPart(sub, new THREE.BoxGeometry(fenceW, 0.46, 0.04), timberMat, [0, 0.32, fenceZ], true);
    }
    addYardDetail(sub, pal.propVariant, propCenter, timberMat);
}

function buildHiraCottage(sub, pal) {
    addMachiyaShellAndYard(sub, pal, {
        bodyW: 1.38, bodyD: 1.14, wallH: 0.72, zOffset: 0.02, frontZ: 0.59,
        wainscotH: 0.30, fenceW: 1.32, fenceZ: -0.79,
        propCenter: [-pal.flip * 0.32, 0, -0.68], hasBench: true
    });
    addTiledHisashi(sub, 1.56, 0.38, 0.84, 0.64, pal.roofMat, pal.timberMat);
    Kit.addGabledRoof(sub, 1.68, 1.40, 0.42, 0.85, 0.02, pal.roofMat);
}

function buildTsushiNikai(sub, pal) {
    addMachiyaShellAndYard(sub, pal, {
        bodyW: 1.36, bodyD: 1.24, wallH: 0.72, zOffset: 0, frontZ: 0.62,
        wainscotH: 0.30, fenceW: 1.30, fenceZ: -0.80,
        propCenter: [pal.flip * 0.36, 0, -0.71], hasBench: false
    });
    addTiledHisashi(sub, 1.58, 0.36, 0.86, 0.67, pal.roofMat, pal.timberMat);

    // Mezzanine tsushi-nikai level + udatsu firewall wings
    Kit.addPart(sub, new THREE.BoxGeometry(1.32, 0.44, 1.20), pal.plasterMat, [0, 1.08, 0], true, null, true);
    Kit.addPart(sub, new THREE.BoxGeometry(1.36, 0.045, 1.24), pal.timberMat, [0, 0.88, 0], true);
    const udatsuSides = pal.upperWindowCount === 3 ? [-0.66, 0.66] : [pal.flip * 0.66];
    for (const ux of udatsuSides) {
        Kit.addPart(sub, new THREE.BoxGeometry(0.08, 0.48, 0.26), pal.plasterMat, [ux, 1.08, 0.53], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.11, 0.04, 0.30), pal.roofMat, [ux, 1.33, 0.53], true);
    }
    addMushikoWindows(sub, pal.upperWindowCount, 1.10, 0.60, pal.timberMat);
    Kit.addGabledRoof(sub, 1.68, 1.50, 0.46, 1.30, 0, pal.roofMat);
}

function buildHonNikai(sub, pal) {
    addMachiyaShellAndYard(sub, pal, {
        bodyW: 1.38, bodyD: 1.24, wallH: 0.72, zOffset: 0.01, frontZ: 0.63,
        wainscotH: 0.32, fenceW: 1.32, fenceZ: -0.80,
        propCenter: [-pal.flip * 0.34, 0, -0.71], hasBench: false
    });
    addTiledHisashi(sub, 1.58, 0.30, 0.85, 0.66, pal.roofMat, pal.timberMat);

    // Full 2-story upper body with 4-bay shoji gallery & te-suri veranda rail
    Kit.addPart(sub, new THREE.BoxGeometry(1.38, 0.72, 1.24), pal.plasterMat, [0, 1.21, 0.01], true, null, true);
    Kit.addCornerPillars(sub, 1.42, 1.28, 0.72, 1.21, 0.01, 0.085, pal.timberMat);
    Kit.addPart(sub, new THREE.BoxGeometry(1.42, 0.045, 1.28), pal.timberMat, [0, 0.87, 0.01], true);

    const shojiMat = MaterialLibrary.get('shojiWindow');
    Kit.addPart(sub, new THREE.BoxGeometry(1.06, 0.44, 0.02), shojiMat, [0, 1.22, 0.638], false, null, false, 'Upper_Window');
    Kit.addPart(sub, new THREE.BoxGeometry(1.12, 0.035, 0.04), pal.timberMat, [0, 1.45, 0.646]);
    Kit.addPart(sub, new THREE.BoxGeometry(1.12, 0.035, 0.04), pal.timberMat, [0, 0.99, 0.646]);
    for (const mx of [-0.52, -0.26, 0, 0.26, 0.52]) {
        Kit.addPart(sub, new THREE.BoxGeometry(0.024, 0.44, 0.038), pal.timberMat, [mx, 1.22, 0.646]);
    }
    // Cantilevered te-suri wooden rail above ground hisashi
    Kit.addPart(sub, new THREE.BoxGeometry(1.14, 0.03, 0.14), pal.timberMat, [0, 0.92, 0.69], true);
    Kit.addPart(sub, new THREE.BoxGeometry(1.16, 0.026, 0.032), pal.timberMat, [0, 1.08, 0.74], true);
    Kit.addPart(sub, new THREE.BoxGeometry(1.16, 0.02, 0.025), pal.timberMat, [0, 1.00, 0.74]);
    for (const px of [-0.54, -0.18, 0.18, 0.54]) {
        Kit.addPart(sub, new THREE.BoxGeometry(0.028, 0.16, 0.028), pal.timberMat, [px, 1.00, 0.74]);
    }

    Kit.addGabledRoof(sub, 1.68, 1.52, 0.48, 1.57, 0.01, pal.roofMat);
}

function buildCourtyardMachiya(sub, pal) {
    const { plasterMat, wainscotMat, timberMat, roofMat, flip } = pal;
    const gravelMat = MaterialLibrary.get('gravel');
    const stoneMat = MaterialLibrary.get('stoneTrim');

    // Front wing street foundation + rear okuzashiki foundation
    Kit.addStoneFoundation(sub, 1.54, 0.84, 0.13, 0.34);
    const xRear = flip * 0.35;
    const zRear = -0.44;
    Kit.addPart(sub, new THREE.BoxGeometry(0.84, 0.11, 0.76), MaterialLibrary.get('stoneGranite'), [xRear, 0.055, zRear], true, null, true);

    // Front 1.5-story street wing
    Kit.addPart(sub, new THREE.BoxGeometry(1.38, 1.12, 0.72), plasterMat, [0, 0.69, 0.34], true, null, true);
    addWainscot(sub, 1.38, 0.72, 0.30, 0.13, 0.34, wainscotMat, timberMat);
    Kit.addCornerPillars(sub, 1.42, 0.76, 1.12, 0.69, 0.34, 0.08, timberMat);
    addGroundStreetFacade(sub, { pal, wallW: 1.38, wallFrontZ: 0.70, hasNoren: true });
    addTiledHisashi(sub, 1.56, 0.30, 0.84, 0.74, roofMat, timberMat);
    addMushikoWindows(sub, 2, 1.04, 0.70, timberMat);
    Kit.addGabledRoof(sub, 1.68, 0.94, 0.38, 1.25, 0.34, roofMat);

    // Stepped 1-story rear okuzashiki wing + veranda overlooking pocket garden
    Kit.addPart(sub, new THREE.BoxGeometry(0.72, 0.68, 0.70), plasterMat, [xRear, 0.47, zRear], true, null, true);
    addWainscot(sub, 0.72, 0.70, 0.28, 0.13, zRear, wainscotMat, timberMat, xRear);
    Kit.addPart(sub, new THREE.BoxGeometry(0.14, 0.06, 0.60), timberMat, [xRear - flip * 0.41, 0.15, zRear], true);
    Kit.addPart(sub, new THREE.BoxGeometry(0.02, 0.44, 0.48), MaterialLibrary.get('shojiWindow'), [xRear - flip * 0.365, 0.44, zRear], false, null, false, 'Front_Koushi');
    Kit.addGabledRoof(sub, 0.92, 0.86, 0.28, 0.81, zRear, roofMat, xRear);

    // Open tsuboniwa gravel garden + stepping stones + corner fence + yard feature
    const cxGarden = -flip * 0.38;
    Kit.addPart(sub, new THREE.BoxGeometry(0.68, 0.05, 0.72), gravelMat, [cxGarden, 0.025, zRear], false, null, true);
    for (const [sx, sz] of [[0.10, 0.16], [0.02, -0.02], [-0.08, -0.18]]) {
        Kit.addPart(sub, new THREE.CylinderGeometry(0.065, 0.07, 0.03, 7), stoneMat, [cxGarden + sx * flip, 0.055, zRear + sz]);
    }
    Kit.addPart(sub, new THREE.BoxGeometry(0.68, 0.44, 0.04), timberMat, [cxGarden, 0.28, -0.80], true);
    Kit.addPart(sub, new THREE.BoxGeometry(0.04, 0.44, 0.74), timberMat, [-flip * 0.72, 0.28, zRear], true);
    addYardDetail(sub, pal.propVariant, [cxGarden - flip * 0.12, 0, zRear - 0.10], timberMat);
}

const MACHIYA_BUILDERS = [buildHiraCottage, buildTsushiNikai, buildHonNikai, buildCourtyardMachiya];

/**
 * Residential Level 1: 4 structurally distinct Machiya archetypes + palette + flip.
 */
export function createVariedMachiyaL1Mesh(tile, facingAngle = 0) {
    const pal = getMachiyaPalette(tile);
    const { sub, finalize } = createRotatedWrapper(facingAngle, pal.archetypeName, pal.flip);
    MACHIYA_BUILDERS[pal.archetypeIndex](sub, pal);
    return finalize();
}

function addKuraUpperVault(sub, pal, wallMat, quoinMat, yFloorBase, zFrontHood) {
    const ironMat = MaterialLibrary.get('darkIron');
    const shojiMat = MaterialLibrary.get('shojiWindow');

    Kit.addPart(sub, new THREE.BoxGeometry(1.68, 0.08, 1.68), pal.roofMat, [0, yFloorBase, 0], true);
    Kit.addPart(sub, new THREE.BoxGeometry(1.36, 0.76, 1.36), wallMat, [0, yFloorBase + 0.42, 0], true, null, true);
    Kit.addCornerPillars(sub, 1.38, 1.38, 0.76, yFloorBase + 0.42, 0, 0.09, quoinMat);

    for (const wx of [-0.32, 0.32]) {
        Kit.addPart(sub, new THREE.BoxGeometry(0.34, 0.05, 0.14), pal.roofMat, [wx, yFloorBase + 0.66, zFrontHood], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.24, 0.28, 0.02), shojiMat, [wx, yFloorBase + 0.46, 0.685], false, null, false, 'Upper_Window');
        Kit.addPart(sub, new THREE.BoxGeometry(0.02, 0.26, 0.04), ironMat, [wx - 0.06, yFloorBase + 0.46, 0.69]);
        Kit.addPart(sub, new THREE.BoxGeometry(0.02, 0.26, 0.04), ironMat, [wx + 0.06, yFloorBase + 0.46, 0.69]);
    }
    Kit.addGabledRoof(sub, 1.78, 1.78, 0.54, yFloorBase + 0.80, 0, pal.roofMat);
}

function addVaultDoors(sub, doorMat, ironMat, stoneMat, withHood) {
    Kit.addPart(sub, new THREE.BoxGeometry(0.66, 0.08, 0.16), stoneMat, [0, 0.18, 0.74]);
    Kit.addPart(sub, new THREE.BoxGeometry(0.30, 0.70, 0.06), doorMat, [-0.16, 0.57, 0.72], true);
    Kit.addPart(sub, new THREE.BoxGeometry(0.30, 0.70, 0.06), doorMat, [0.16, 0.57, 0.72], true);
    Kit.addPart(sub, new THREE.BoxGeometry(0.64, 0.04, 0.08), ironMat, [0, 0.72, 0.73]);
    Kit.addPart(sub, new THREE.BoxGeometry(0.64, 0.04, 0.08), ironMat, [0, 0.42, 0.73]);
    if (withHood) {
        Kit.addPart(sub, new THREE.BoxGeometry(0.72, 0.08, 0.18), doorMat, [0, 0.96, 0.76], true);
    }
}

/**
 * Residential Level 2: 3 authentic Meiji Kura-zukuri storehouse variants.
 */
export function createVariedKuraL2Mesh(tile, facingAngle = 0) {
    const pal = getKuraPalette(tile);
    const { sub, finalize } = createRotatedWrapper(facingAngle, pal.archetypeName, pal.flip);
    const stoneMat = MaterialLibrary.get('stoneGranite');
    const ironMat = MaterialLibrary.get('darkIron');

    Kit.addStoneFoundation(sub, 1.62, 1.62, 0.18);

    if (pal.archetypeName === 'mise_gura_ochre') {
        // Hybrid street-level timber storefront below a heavy umber earthen upper vault
        Kit.addPart(sub, new THREE.BoxGeometry(1.42, 0.98, 1.42), pal.mainWallMat, [0, 0.67, 0], true, null, true);
        addWainscot(sub, 1.42, 1.42, 0.44, 0.18, 0, pal.dadoMat, pal.woodMat);
        Kit.addCornerPillars(sub, 1.46, 1.46, 0.98, 0.67, 0, 0.10, pal.quoinMat);
        const shopPal = { ...pal, timberMat: pal.woodMat, hasSudare: false, lanternIsRed: pal.propVariant === 0 };
        addGroundStreetFacade(sub, { pal: shopPal, wallW: 1.42, wallFrontZ: 0.71, yBase: 0.18, groundH: 0.72, hasNoren: true });
        addTiledHisashi(sub, 1.60, 0.30, 0.94, 0.74, pal.roofMat, pal.woodMat);
    } else if (pal.archetypeName === 'edo_kuro_shikkui') {
        Kit.addPart(sub, new THREE.BoxGeometry(1.44, 0.46, 1.44), pal.dadoMat, [0, 0.41, 0], true, null, true);
        Kit.addPart(sub, new THREE.BoxGeometry(1.42, 0.52, 1.42), pal.mainWallMat, [0, 0.90, 0], true, null, true);
        Kit.addCornerPillars(sub, 1.46, 1.46, 0.98, 0.67, 0, 0.11, pal.quoinMat);
        addVaultDoors(sub, pal.doorWallMat, ironMat, stoneMat, true);
    } else {
        // Kawagoe white namako classic with side storehouse goods barrel/bale accent
        Kit.addNamakoDado(sub, 1.44, 0.46, 1.44, 0.18);
        Kit.addPart(sub, new THREE.BoxGeometry(1.42, 0.52, 1.42), pal.mainWallMat, [0, 0.90, 0], true, null, true);
        Kit.addCornerPillars(sub, 1.46, 1.46, 0.98, 0.67, 0, 0.11, pal.quoinMat);
        addVaultDoors(sub, pal.doorWallMat, ironMat, stoneMat, false);
        Kit.addPart(sub, new THREE.CylinderGeometry(0.065, 0.065, 0.22, 8), MaterialLibrary.get('strawTawara'), [pal.flip * 0.77, 0.245, 0.10], true, [Math.PI / 2, 0, 0]);
    }

    addKuraUpperVault(sub, pal, pal.mainWallMat, pal.quoinMat, 1.18, 0.71);
    return finalize();
}
