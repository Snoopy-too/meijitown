// Project Meiji - 3x3 Imperial Exhibition Pavilion Landmark (pavilionMesh.js)
// /artisan Option A: 1881 Meiji Museum / Venetian-Gothic Polychrome Brick, Buff Stone, Glazed Arcades & Ribbed Copper Dome

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { MaterialLibrary } from '../renderer/materialLibrary.js';
import { MeijiArchitectureKit as Kit } from './meijiArchitectureKit.js';

function addArchedWindowBay(parent, pos, rotY, width, height, mats) {
    const bay = new THREE.Group();
    bay.position.set(pos[0], pos[1], pos[2]);
    bay.rotation.y = rotY;

    // Dark iron frame, warm glass pane & stone sill proud of wall face (+Z local outward)
    Kit.addPart(bay, new THREE.BoxGeometry(width + 0.06, height + 0.04, 0.035), mats.iron, [0, 0, 0.015]);
    Kit.addPart(bay, new THREE.BoxGeometry(width, height, 0.025), mats.glass, [0, 0, 0.028], false, null, false, 'Upper_Window');
    Kit.addPart(bay, new THREE.BoxGeometry(0.022, height, 0.03), mats.iron, [0, 0, 0.034]);
    Kit.addPart(bay, new THREE.BoxGeometry(width, 0.022, 0.03), mats.iron, [0, height * 0.14, 0.034]);
    Kit.addPart(bay, new THREE.BoxGeometry(width + 0.10, 0.055, 0.075), mats.trim, [0, -height * 0.5 - 0.025, 0.032]);

    // True outward-facing semicircular brick arch with carved stone keystone
    const archGeo = new THREE.CylinderGeometry(width * 0.54, width * 0.54, 0.055, 10, 1, false, Math.PI / 2, Math.PI);
    archGeo.rotateX(Math.PI / 2);
    Kit.addPart(bay, archGeo, mats.redBrick, [0, height * 0.5, 0.024]);
    Kit.addPart(bay, new THREE.BoxGeometry(0.065, 0.10, 0.068), mats.trim, [0, height * 0.5 + width * 0.48, 0.032]);

    parent.add(bay);
}

function addGasLampStandard(parent, pos, mats) {
    Kit.addPart(parent, new THREE.BoxGeometry(0.16, 0.24, 0.16), mats.granite, [pos[0], pos[1] + 0.12, pos[2]], true);
    Kit.addPart(parent, new THREE.CylinderGeometry(0.026, 0.042, 0.52, 8), mats.iron, [pos[0], pos[1] + 0.50, pos[2]], true);
    Kit.addPart(parent, new THREE.CylinderGeometry(0.065, 0.052, 0.12, 6), mats.gasLantern, [pos[0], pos[1] + 0.80, pos[2]], false, null, false, 'Lantern_Body');
    Kit.addPart(parent, new THREE.ConeGeometry(0.085, 0.065, 6), mats.copper, [pos[0], pos[1] + 0.89, pos[2]]);
}

export function createExhibitionPavilionMesh(facingAngle = 0) {
    const group = new THREE.Group();
    const sub = new THREE.Group();
    const s = CONFIG.TILE_SIZE;
    const zCtr = -0.06 * s;

    const mats = {
        redBrick: MaterialLibrary.get('redBrick'),
        buffBrick: MaterialLibrary.get('buffBrick'),
        limestone: MaterialLibrary.get('pavilionLimestone'),
        granite: MaterialLibrary.get('stoneGranite'),
        trim: MaterialLibrary.get('stoneTrim'),
        slate: MaterialLibrary.get('slateRoof'),
        copper: MaterialLibrary.get('copperRoof'),
        bronze: MaterialLibrary.get('bronze'),
        gold: MaterialLibrary.get('goldLeaf'),
        iron: MaterialLibrary.get('darkIron'),
        wood: MaterialLibrary.get('woodDark'),
        glass: MaterialLibrary.get('glassWindow'),
        banner: MaterialLibrary.get('crimsonBanner'),
        gasLantern: MaterialLibrary.get('gasLantern')
    };

    // 1. Two-tier dressed granite & sandstone plaza with grand front stairs and gas lamps
    Kit.addPart(sub, new THREE.BoxGeometry(s * 2.86, 0.16, s * 2.86), mats.granite, [0, 0.08, 0], false, null, true);
    Kit.addPart(sub, new THREE.BoxGeometry(s * 2.66, 0.14, s * 2.66), mats.limestone, [0, 0.23, 0], false, null, true);
    for (let st = 0; st < 3; st++) {
        Kit.addPart(sub, new THREE.BoxGeometry(2.15 + st * 0.14, 0.06, 0.18), mats.trim, [0, 0.24 - st * 0.06, 2.46 + st * 0.16], false, null, true);
    }
    for (const cx of [-1.18, 1.18]) {
        Kit.addPart(sub, new THREE.BoxGeometry(0.18, 0.24, 0.56), mats.granite, [cx, 0.16, 2.58], true);
        addGasLampStandard(sub, [cx, 0.28, 2.74], mats);
    }
    for (const lx of [-2.36, 2.36]) {
        addGasLampStandard(sub, [lx, 0.30, 2.38], mats);
    }

    // 2. Ground floor arcade hall in dressed sandstone + granite plinth & Conder brick frieze
    const gW = 4.60;
    const gD = 3.50;
    const gHalfW = gW / 2;
    const gFrontZ = zCtr + gD / 2;
    const gBackZ = zCtr - gD / 2;

    Kit.addPart(sub, new THREE.BoxGeometry(gW, 1.36, gD), mats.limestone, [0, 0.98, zCtr], true, null, true);
    Kit.addPart(sub, new THREE.BoxGeometry(gW + 0.06, 0.30, gD + 0.06), mats.granite, [0, 0.45, zCtr], true, null, true);
    Kit.addPart(sub, new THREE.BoxGeometry(gW + 0.04, 0.16, gD + 0.04), mats.redBrick, [0, 1.56, zCtr], true);

    // Ceremonial arched main portal & portico sidelight windows
    Kit.addPart(sub, new THREE.BoxGeometry(0.74, 1.10, 0.06), mats.wood, [0, 0.85, gFrontZ + 0.01], true);
    Kit.addPart(sub, new THREE.BoxGeometry(0.60, 0.42, 0.04), mats.glass, [0, 1.10, gFrontZ + 0.035], false, null, false, 'Front_Koushi');
    Kit.addPart(sub, new THREE.BoxGeometry(0.06, 1.10, 0.07), mats.bronze, [-0.38, 0.85, gFrontZ + 0.02]);
    Kit.addPart(sub, new THREE.BoxGeometry(0.06, 1.10, 0.07), mats.bronze, [0.38, 0.85, gFrontZ + 0.02]);
    for (const bx of [-0.98, 0.98]) {
        addArchedWindowBay(sub, [bx, 0.98, gFrontZ], 0, 0.24, 0.52, mats);
    }

    // Clear rear bays between corner turrets (|x| < 1.60)
    for (const bx of [-1.22, -0.44, 0.44, 1.22]) {
        addArchedWindowBay(sub, [bx, 0.98, gBackZ], Math.PI, 0.28, 0.56, mats);
    }
    for (const px of [-0.84, 0, 0.84]) {
        Kit.addPart(sub, new THREE.BoxGeometry(0.14, 1.36, 0.08), mats.redBrick, [px, 0.98, gBackZ - 0.01]);
    }

    // Side flank arcade bays clear of corner turrets (|z - zCtr| < 1.10)
    for (const bz of [-0.76, 0, 0.76]) {
        addArchedWindowBay(sub, [-gHalfW, 0.98, zCtr + bz], -Math.PI / 2, 0.28, 0.56, mats);
        addArchedWindowBay(sub, [gHalfW, 0.98, zCtr + bz], Math.PI / 2, 0.28, 0.56, mats);
    }
    for (const pz of [-0.38, 0.38]) {
        Kit.addPart(sub, new THREE.BoxGeometry(0.08, 1.36, 0.14), mats.redBrick, [-gHalfW - 0.01, 0.98, zCtr + pz]);
        Kit.addPart(sub, new THREE.BoxGeometry(0.08, 1.36, 0.14), mats.redBrick, [gHalfW + 0.01, 0.98, zCtr + pz]);
    }

    // 3. Four projecting corner pavilion towers with arched windows & verdigris copper caps
    for (const tx of [-2.22, 2.22]) {
        for (const tz of [zCtr + 1.62, zCtr - 1.62]) {
            const isFront = tz > zCtr;
            const isRight = tx > 0;
            Kit.addPart(sub, new THREE.BoxGeometry(0.84, 1.38, 0.84), mats.redBrick, [tx, 0.99, tz], true, null, true);
            Kit.addPart(sub, new THREE.BoxGeometry(0.88, 0.30, 0.88), mats.granite, [tx, 0.45, tz], true);
            Kit.addPart(sub, new THREE.BoxGeometry(0.90, 0.10, 0.90), mats.trim, [tx, 1.70, tz], true);
            Kit.addPart(sub, new THREE.BoxGeometry(0.76, 0.84, 0.76), mats.buffBrick, [tx, 2.16, tz], true, null, true);
            Kit.addPart(sub, new THREE.BoxGeometry(0.80, 0.12, 0.80), mats.redBrick, [tx, 2.16, tz]);
            Kit.addPart(sub, new THREE.BoxGeometry(0.84, 0.08, 0.84), mats.trim, [tx, 2.60, tz], true);

            // Ground & upper arched windows on outward faces of each turret
            addArchedWindowBay(sub, [tx, 0.98, tz + (isFront ? 0.42 : -0.42)], isFront ? 0 : Math.PI, 0.22, 0.48, mats);
            addArchedWindowBay(sub, [tx + (isRight ? 0.42 : -0.42), 0.98, tz], isRight ? Math.PI / 2 : -Math.PI / 2, 0.22, 0.48, mats);
            addArchedWindowBay(sub, [tx, 2.16, tz + (isFront ? 0.38 : -0.38)], isFront ? 0 : Math.PI, 0.18, 0.38, mats);
            addArchedWindowBay(sub, [tx + (isRight ? 0.38 : -0.38), 2.16, tz], isRight ? Math.PI / 2 : -Math.PI / 2, 0.18, 0.38, mats);

            const capGeo = new THREE.ConeGeometry(0.56, 0.48, 4);
            capGeo.rotateY(Math.PI / 4);
            Kit.addPart(sub, capGeo, mats.copper, [tx, 2.88, tz], true);
            Kit.addPart(sub, new THREE.CylinderGeometry(0.018, 0.032, 0.24, 6), mats.gold, [tx, 3.18, tz]);
        }
    }

    // 4. Triumphal 6-column front portico with triangular Conder pediment & crimson banners
    Kit.addPart(sub, new THREE.BoxGeometry(2.90, 0.12, 0.84), mats.granite, [0, 0.34, gFrontZ + 0.36], false, null, true);
    for (const cx of [-1.26, -0.78, -0.44, 0.44, 0.78, 1.26]) {
        Kit.addPart(sub, new THREE.BoxGeometry(0.18, 0.12, 0.18), mats.granite, [cx, 0.44, gFrontZ + 0.62], true);
        Kit.addPart(sub, new THREE.CylinderGeometry(0.068, 0.082, 1.18, 10), mats.limestone, [cx, 1.07, gFrontZ + 0.62], true);
        Kit.addPart(sub, new THREE.CylinderGeometry(0.085, 0.072, 0.06, 8), mats.bronze, [cx, 1.62, gFrontZ + 0.62]);
        Kit.addPart(sub, new THREE.BoxGeometry(0.20, 0.07, 0.20), mats.trim, [cx, 1.68, gFrontZ + 0.62]);
    }
    for (const bx of [-1.02, 1.02]) {
        Kit.addPart(sub, new THREE.BoxGeometry(0.24, 0.70, 0.03), mats.banner, [bx, 1.24, gFrontZ + 0.46], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.28, 0.035, 0.04), mats.gold, [bx, 1.60, gFrontZ + 0.46]);
    }
    Kit.addPart(sub, new THREE.BoxGeometry(2.98, 0.14, 0.86), mats.trim, [0, 1.76, gFrontZ + 0.36], true);
    Kit.addTriangularPediment(sub, 2.48, 0.56, 0.70, mats.redBrick, mats.trim, [0, 1.83, gFrontZ + 0.36]);
    Kit.addPart(sub, new THREE.CylinderGeometry(0.14, 0.14, 0.04, 12), mats.gold, [0, 2.04, gFrontZ + 0.73], false, [Math.PI / 2, 0, 0]);

    // 5. Upper polychrome red-brick & buff-stone banded hall with clerestory glazing
    Kit.addPart(sub, new THREE.BoxGeometry(gW + 0.16, 0.10, gD + 0.16), mats.trim, [0, 1.70, zCtr], true);
    for (const sx of [-1.86, 1.86]) {
        Kit.addPart(sub, new THREE.BoxGeometry(0.84, 0.18, 2.36), mats.slate, [sx, 1.82, zCtr], true);
        Kit.addPart(sub, new THREE.BoxGeometry(0.88, 0.04, 2.40), mats.copper, [sx, 1.92, zCtr]);
    }

    const uW = 3.30;
    const uD = 2.74;
    Kit.addPart(sub, new THREE.BoxGeometry(uW, 0.98, uD), mats.redBrick, [0, 2.24, zCtr], true, null, true);
    Kit.addPart(sub, new THREE.BoxGeometry(uW + 0.05, 0.12, uD + 0.05), mats.buffBrick, [0, 1.98, zCtr]);
    Kit.addPart(sub, new THREE.BoxGeometry(uW + 0.05, 0.12, uD + 0.05), mats.buffBrick, [0, 2.48, zCtr]);

    for (const wx of [-1.08, -0.46, 0.46, 1.08]) {
        addArchedWindowBay(sub, [wx, 2.24, zCtr + uD / 2], 0, 0.24, 0.48, mats);
        addArchedWindowBay(sub, [wx, 2.24, zCtr - uD / 2], Math.PI, 0.24, 0.48, mats);
    }
    for (const wz of [-0.72, 0, 0.72]) {
        addArchedWindowBay(sub, [-uW / 2, 2.24, zCtr + wz], -Math.PI / 2, 0.24, 0.48, mats);
        addArchedWindowBay(sub, [uW / 2, 2.24, zCtr + wz], Math.PI / 2, 0.24, 0.48, mats);
    }
    Kit.addPart(sub, new THREE.BoxGeometry(uW + 0.12, 0.07, uD + 0.12), mats.bronze, [0, 2.74, zCtr]);
    Kit.addPart(sub, new THREE.BoxGeometry(uW + 0.22, 0.12, uD + 0.22), mats.trim, [0, 2.82, zCtr], true);

    // 6. Glazed cylindrical rotunda drum with radial limestone pilasters
    Kit.addPart(sub, new THREE.CylinderGeometry(1.08, 1.12, 0.18, 16), mats.limestone, [0, 2.96, zCtr], true);
    Kit.addPart(sub, new THREE.CylinderGeometry(0.92, 0.94, 0.68, 16), mats.redBrick, [0, 3.36, zCtr], true);
    for (let i = 0; i < 12; i++) {
        const pilAng = (i / 12) * Math.PI * 2;
        const winAng = pilAng + Math.PI / 12;
        Kit.addPart(sub, new THREE.BoxGeometry(0.11, 0.68, 0.11), mats.limestone, [Math.sin(pilAng) * 0.96, 3.36, zCtr + Math.cos(pilAng) * 0.96], true, [0, pilAng, 0]);
        Kit.addPart(sub, new THREE.BoxGeometry(0.18, 0.44, 0.05), mats.glass, [Math.sin(winAng) * 0.93, 3.36, zCtr + Math.cos(winAng) * 0.93], false, [0, winAng, 0], false, 'Upper_Window');
    }
    Kit.addPart(sub, new THREE.CylinderGeometry(1.06, 1.04, 0.10, 16), mats.trim, [0, 3.74, zCtr], true);

    // 7. Hemispherical verdigris copper dome, 8 bronze meridian ribs & illuminated lantern cupola
    const dome = Kit.addPart(
        sub,
        new THREE.SphereGeometry(0.98, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
        mats.copper,
        [0, 3.76, zCtr],
        true
    );
    dome.scale.set(1.0, 0.90, 1.0);

    if (typeof THREE.TorusGeometry === 'function') {
        const ribGeo = new THREE.TorusGeometry(0.99, 0.024, 6, 20, Math.PI);
        for (let r = 0; r < 4; r++) {
            const rib = Kit.addPart(sub, ribGeo, mats.bronze, [0, 3.76, zCtr], false, [0, (r * Math.PI) / 4, 0]);
            rib.scale.set(1.0, 0.90, 1.0);
        }
    }

    Kit.addPart(sub, new THREE.CylinderGeometry(0.34, 0.38, 0.10, 12), mats.trim, [0, 4.62, zCtr], true);
    Kit.addPart(sub, new THREE.CylinderGeometry(0.21, 0.21, 0.28, 10), mats.glass, [0, 4.80, zCtr], false, null, false, 'Upper_Window');
    for (let c = 0; c < 6; c++) {
        const ca = (c / 6) * Math.PI * 2;
        Kit.addPart(sub, new THREE.CylinderGeometry(0.025, 0.03, 0.28, 6), mats.limestone, [Math.sin(ca) * 0.26, 4.80, zCtr + Math.cos(ca) * 0.26], true);
    }
    const lanternCap = Kit.addPart(sub, new THREE.SphereGeometry(0.30, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), mats.copper, [0, 4.94, zCtr], true);
    lanternCap.scale.set(1.0, 0.78, 1.0);
    Kit.addPart(sub, new THREE.SphereGeometry(0.085, 8, 8), mats.gold, [0, 5.20, zCtr]);
    Kit.addPart(sub, new THREE.CylinderGeometry(0.015, 0.032, 0.42, 6), mats.gold, [0, 5.42, zCtr]);

    sub.rotation.y = facingAngle;
    group.add(sub);
    return group;
}
