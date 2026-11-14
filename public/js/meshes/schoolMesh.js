// Project Meiji - Meiji Giyōfū Primary School & Schoolyard Compound (schoolMesh.js)
// Phase 2 /artisan: Elongated Rectangular Shōgakkō with Karahafu Portico, Cupola, Gate Pillars & Yard

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { MaterialLibrary } from '../renderer/materialLibrary.js';
import { MeijiArchitectureKit as Kit } from './meijiArchitectureKit.js';

function createHippedRoofGeometry(width, depth, height, ridgeLen) {
    const hw = width / 2;
    const hd = depth / 2;
    const hr = ridgeLen / 2;
    const h = height;

    const positions = new Float32Array([
        // Left long trapezoid slope (-X)
        -hw, 0,  hd,  -hw, 0, -hd,   0, h, -hr,
        -hw, 0,  hd,   0,  h, -hr,   0, h,  hr,
        // Right long trapezoid slope (+X)
         hw, 0, -hd,   hw, 0,  hd,   0, h,  hr,
         hw, 0, -hd,   0,  h,  hr,   0, h, -hr,
        // Front triangular hip (+Z)
        -hw, 0,  hd,   0,  h,  hr,  hw, 0,  hd,
        // Rear triangular hip (-Z)
         hw, 0, -hd,   0,  h, -hr, -hw, 0, -hd,
        // Bottom soffit
        -hw, 0, -hd,   hw, 0, -hd,  hw, 0,  hd,
        -hw, 0, -hd,   hw, 0,  hd, -hw, 0,  hd
    ]);

    const uSide = Math.max(1, Math.round(depth * 1.6));
    const uEnd = Math.max(1, Math.round(width * 1.5));
    const uvs = new Float32Array([
        0, 0,  uSide, 0,  uSide * 0.78, 1,
        0, 0,  uSide * 0.78, 1,  uSide * 0.22, 1,
        0, 0,  uSide, 0,  uSide * 0.78, 1,
        0, 0,  uSide * 0.78, 1,  uSide * 0.22, 1,
        0, 0,  uEnd * 0.5, 1,  uEnd, 0,
        0, 0,  uEnd * 0.5, 1,  uEnd, 0,
        0, 0,  1, 0,  1, 1,
        0, 0,  1, 1,  0, 1
    ]);

    const geo = new THREE.BufferGeometry();
    const AttrClass = THREE.Float32BufferAttribute || THREE.BufferAttribute;
    if (AttrClass) {
        geo.setAttribute('position', new AttrClass(positions, 3));
        geo.setAttribute('uv', new AttrClass(uvs, 2));
    }
    geo.computeVertexNormals();
    return geo;
}

function addHipRibSegment(parent, [x1, y1, z1], [x2, y2, z2], mat) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dy, dz);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.055, len), mat);
    mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2 + 0.02, (z1 + z2) / 2);
    const dir = new THREE.Vector3(dx, dy, dz).normalize();
    if (mesh.quaternion && typeof mesh.quaternion.setFromUnitVectors === 'function') {
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    } else {
        mesh.rotation.y = Math.atan2(dx, dz);
    }
    mesh.castShadow = true;
    parent.add(mesh);
}

function addCornerQuoins(parent, cx, cz, width, depth, yStart, floors = 2, floorStep = 0.94, quoinMat) {
    const hx = width / 2;
    const hz = depth / 2;
    const longX = new THREE.BoxGeometry(0.18, 0.13, 0.11);
    const longZ = new THREE.BoxGeometry(0.11, 0.13, 0.18);
    for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
            for (let f = 0; f < floors; f++) {
                const yBase = yStart + f * floorStep;
                for (let q = 0; q < 4; q++) {
                    const isEven = (q % 2) === 0;
                    const geo = isEven ? longX : longZ;
                    const qx = cx + sx * (hx - (isEven ? 0.05 : 0.02));
                    const qz = cz + sz * (hz - (isEven ? 0.02 : 0.05));
                    Kit.addPart(parent, geo, quoinMat, [qx, yBase + 0.11 + q * 0.21, qz], true);
                }
            }
        }
    }
}

function addSashWindow(parent, pos, rotY, whiteMat, glassMat, trimMat) {
    const win = new THREE.Group();
    win.position.set(pos[0], pos[1], pos[2]);
    if (rotY) win.rotation.y = rotY;

    // White sash frame, stone sill ledge, glowing panes, and crisp cross-mullions
    Kit.addPart(win, new THREE.BoxGeometry(0.28, 0.032, 0.06), trimMat, [0, -0.23, 0.012], true);
    Kit.addPart(win, new THREE.BoxGeometry(0.26, 0.45, 0.025), whiteMat, [0, 0, 0], true);
    Kit.addPart(win, new THREE.BoxGeometry(0.19, 0.39, 0.028), glassMat, [0, 0, 0.004], false, null, false, 'Upper_Window');
    Kit.addPart(win, new THREE.BoxGeometry(0.21, 0.022, 0.036), whiteMat, [0, 0.01, 0.008]);
    Kit.addPart(win, new THREE.BoxGeometry(0.018, 0.40, 0.036), whiteMat, [0, 0, 0.008]);
    parent.add(win);
}

function addPortico(parent, cx, zFront, wallMat, woodMat, whiteMat, trimMat, stoneMat, roofMat, glassMat) {
    const plaqueMat = MaterialLibrary.get('schoolPlaque');
    const goldMat = MaterialLibrary.get('goldLeaf');
    const cedarMat = MaterialLibrary.get('woodMedium');

    // Stone entrance steps & apron
    Kit.addPart(parent, new THREE.BoxGeometry(1.06, 0.11, 0.42), stoneMat, [cx, 0.055, zFront + 0.28], true, null, true);
    Kit.addPart(parent, new THREE.BoxGeometry(0.94, 0.12, 0.30), trimMat, [cx, 0.17, zFront + 0.20], true, null, true);

    // Side projecting portico piers & arched entryway
    for (const sx of [-1, 1]) {
        Kit.addPart(parent, new THREE.BoxGeometry(0.14, 0.90, 0.30), wallMat, [cx + sx * 0.38, 0.71, zFront + 0.14], true, null, true);
        Kit.addPart(parent, new THREE.BoxGeometry(0.16, 0.14, 0.32), trimMat, [cx + sx * 0.38, 0.33, zFront + 0.14], true);
    }
    const archGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.12, 12, 1, false, 0, Math.PI);
    Kit.addPart(parent, archGeo, trimMat, [cx, 0.78, zFront + 0.24], true, [Math.PI / 2, 0, 0]);
    const fanGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.13, 12, 1, false, 0, Math.PI);
    Kit.addPart(parent, fanGeo, glassMat, [cx, 0.78, zFront + 0.24], false, [Math.PI / 2, 0, 0], false, 'Upper_Window');

    // Double wooden school entry doors with brass pulls
    for (const sx of [-1, 1]) {
        Kit.addPart(parent, new THREE.BoxGeometry(0.21, 0.54, 0.045), cedarMat, [cx + sx * 0.11, 0.52, zFront + 0.24], true);
        Kit.addPart(parent, new THREE.BoxGeometry(0.02, 0.05, 0.06), goldMat, [cx + sx * 0.04, 0.50, zFront + 0.25]);
    }

    // Upper recessed loggia balcony & carved dark-wood te-suri balustrade
    Kit.addPart(parent, new THREE.BoxGeometry(0.94, 0.075, 0.36), trimMat, [cx, 1.205, zFront + 0.15], true);
    for (const sx of [-1, 1]) {
        Kit.addPart(parent, new THREE.BoxGeometry(0.12, 0.88, 0.12), whiteMat, [cx + sx * 0.38, 1.68, zFront + 0.25], true);
        Kit.addPart(parent, new THREE.BoxGeometry(0.14, 0.62, 0.22), wallMat, [cx + sx * 0.38, 1.68, zFront + 0.10], true);
    }
    Kit.addPart(parent, new THREE.BoxGeometry(0.38, 0.62, 0.025), glassMat, [cx, 1.62, zFront + 0.02], false, null, false, 'Upper_Window');
    Kit.addPart(parent, new THREE.BoxGeometry(0.70, 0.038, 0.045), woodMat, [cx, 1.56, zFront + 0.27], true);
    Kit.addPart(parent, new THREE.BoxGeometry(0.70, 0.028, 0.042), woodMat, [cx, 1.28, zFront + 0.27]);
    for (let i = -3; i <= 3; i++) {
        Kit.addPart(parent, new THREE.BoxGeometry(0.028, 0.26, 0.028), woodMat, [cx + i * 0.10, 1.42, zFront + 0.27]);
    }

    // Curved Karahafu gable roof crown & framed 小学校 nameplate plaque
    const karahafuGeo = new THREE.CylinderGeometry(0.49, 0.49, 0.44, 16, 1, false, 0, Math.PI);
    karahafuGeo.rotateZ(Math.PI / 2);
    karahafuGeo.scale(1.0, 0.68, 1.0);
    Kit.addPart(parent, karahafuGeo, roofMat, [cx, 2.13, zFront + 0.12], true, null, true);

    const tympGeo = new THREE.CylinderGeometry(0.43, 0.43, 0.05, 14, 1, false, 0, Math.PI);
    tympGeo.rotateZ(Math.PI / 2);
    tympGeo.scale(1.0, 0.64, 1.0);
    Kit.addPart(parent, tympGeo, woodMat, [cx, 2.13, zFront + 0.32], true);

    const trimArc = new THREE.CylinderGeometry(0.47, 0.47, 0.04, 16, 1, false, 0, Math.PI);
    trimArc.rotateZ(Math.PI / 2);
    trimArc.scale(1.0, 0.67, 1.0);
    Kit.addPart(parent, trimArc, cedarMat, [cx, 2.13, zFront + 0.34]);

    Kit.addPart(parent, new THREE.BoxGeometry(0.46, 0.20, 0.03), plaqueMat, [cx, 2.25, zFront + 0.35], true);
}

function addBelfryCupola(parent, cx, cz, whiteMat, woodMat, roofMat, trimMat, glassMat) {
    // Skirted base penetrating main ridge cleanly
    Kit.addPart(parent, new THREE.BoxGeometry(0.70, 0.28, 0.70), roofMat, [cx, 2.86, cz], true);
    Kit.addPart(parent, new THREE.CylinderGeometry(0.39, 0.41, 0.08, 8), trimMat, [cx, 3.03, cz], true);

    // Octagonal white louver drum + 8 dark mullions & interior glow
    Kit.addPart(parent, new THREE.CylinderGeometry(0.31, 0.33, 0.48, 8), whiteMat, [cx, 3.31, cz], true);
    Kit.addPart(parent, new THREE.CylinderGeometry(0.28, 0.28, 0.32, 8), glassMat, [cx, 3.31, cz], false, null, false, 'Upper_Window');
    for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2 + Math.PI / 8;
        Kit.addPart(parent, new THREE.BoxGeometry(0.032, 0.48, 0.032), woodMat, [cx + Math.cos(ang) * 0.32, 3.31, cz + Math.sin(ang) * 0.32]);
        const winAng = (i / 8) * Math.PI * 2;
        Kit.addPart(parent, new THREE.BoxGeometry(0.11, 0.28, 0.025), woodMat, [cx + Math.sin(winAng) * 0.305, 3.31, cz + Math.cos(winAng) * 0.305], false, [0, winAng, 0]);
    }

    // Eave cornice + octagonal kawara spire + gilded finial
    Kit.addPart(parent, new THREE.CylinderGeometry(0.41, 0.35, 0.07, 8), trimMat, [cx, 3.58, cz], true);
    Kit.addPart(parent, new THREE.ConeGeometry(0.43, 0.52, 8), roofMat, [cx, 3.87, cz], true);
    Kit.addPart(parent, new THREE.SphereGeometry(0.045, 8, 8), MaterialLibrary.get('goldLeaf'), [cx, 4.15, cz]);
    Kit.addPart(parent, new THREE.CylinderGeometry(0.015, 0.02, 0.28, 6), MaterialLibrary.get('goldLeaf'), [cx, 4.29, cz]);
}

function addFenceSpan(parent, [x1, z1], [x2, z2], woodMat, trimMat) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);
    const group = new THREE.Group();
    group.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
    group.rotation.y = angle;
    Kit.addPart(group, new THREE.BoxGeometry(0.035, 0.04, len), woodMat, [0, 0.16, 0]);
    Kit.addPart(group, new THREE.BoxGeometry(0.035, 0.04, len), woodMat, [0, 0.31, 0]);
    const postCount = Math.max(2, Math.round(len / 0.85) + 1);
    for (let i = 0; i < postCount; i++) {
        const t = postCount === 1 ? 0 : (i / (postCount - 1) - 0.5) * len;
        Kit.addPart(group, new THREE.BoxGeometry(0.08, 0.40, 0.08), trimMat, [0, 0.20, t], true);
    }
    parent.add(group);
}

function addSchoolyard(parent, woodMat, whiteMat, roofMat, trimMat, stoneMat, ironMat) {
    // 1. Dirt playground (left half) & stone/gravel courtyard apron (right half)
    Kit.addPart(parent, new THREE.BoxGeometry(3.04, 0.05, 3.68), MaterialLibrary.get('schoolYardDirt'), [-1.32, 0.025, 0], false, null, true, 'School_Yard');
    Kit.addPart(parent, new THREE.BoxGeometry(2.65, 0.04, 3.68), MaterialLibrary.get('gravel'), [1.525, 0.02, 0], false, null, true);

    // 2. Low perimeter compound fence leaving open front entrance between Kōmon gate pillars
    addFenceSpan(parent, [-2.82, -1.80], [2.78, -1.80], woodMat, trimMat);
    addFenceSpan(parent, [-2.82, -1.80], [-2.82, 1.80], woodMat, trimMat);
    addFenceSpan(parent, [-2.82, 1.80], [-0.72, 1.80], woodMat, trimMat);
    addFenceSpan(parent, [2.78, -1.80], [2.78, 1.80], woodMat, trimMat);

    // 3. Twin White Kōmon Gate Pillars + night gate gas lanterns & school plaque
    for (const [gx, hasSign] of [[-0.56, false], [0.26, true]]) {
        Kit.addPart(parent, new THREE.BoxGeometry(0.26, 0.14, 0.26), stoneMat, [gx, 0.07, 1.74], true);
        Kit.addPart(parent, new THREE.BoxGeometry(0.20, 0.62, 0.20), whiteMat, [gx, 0.45, 1.74], true);
        Kit.addPart(parent, new THREE.BoxGeometry(0.25, 0.05, 0.25), trimMat, [gx, 0.785, 1.74], true);
        Kit.addPart(parent, new THREE.ConeGeometry(0.18, 0.10, 4), roofMat, [gx, 0.86, 1.74], true, [0, Math.PI / 4, 0]);
        Kit.addPart(parent, new THREE.BoxGeometry(0.06, 0.07, 0.06), MaterialLibrary.get('gasLantern'), [gx, 0.945, 1.74]);
        if (hasSign) {
            Kit.addPart(parent, new THREE.BoxGeometry(0.065, 0.28, 0.025), MaterialLibrary.get('woodHinoki'), [gx, 0.46, 1.855]);
        }
    }

    // 4. Hinomaru Flagpole with crisp crimson sun disc in dirt yard
    const fx = -2.02, fz = 0.96;
    Kit.addPart(parent, new THREE.CylinderGeometry(0.11, 0.13, 0.08, 8), stoneMat, [fx, 0.04, fz], true);
    Kit.addPart(parent, new THREE.CylinderGeometry(0.026, 0.038, 2.50, 8), MaterialLibrary.get('woodMedium'), [fx, 1.29, fz], true);
    Kit.addPart(parent, new THREE.SphereGeometry(0.045, 8, 8), MaterialLibrary.get('goldLeaf'), [fx, 2.57, fz]);
    const flagGroup = new THREE.Group();
    flagGroup.position.set(fx, 2.34, fz);
    flagGroup.rotation.y = 0.16;
    Kit.addPart(flagGroup, new THREE.BoxGeometry(0.48, 0.30, 0.014), whiteMat, [0.245, 0, 0], true, null, false, 'Hinomaru_Flag');
    Kit.addPart(flagGroup, new THREE.CylinderGeometry(0.08, 0.08, 0.020, 14), MaterialLibrary.get('toriiVermilion'), [0.245, 0, 0], false, [Math.PI / 2, 0, 0]);
    parent.add(flagGroup);

    // 5. Iron Horizontal Gymnastics Bar (Two-height Tetsubō)
    const tx = -1.75, tz = -0.55;
    for (const [px, ph] of [[-0.38, 0.74], [0.38, 0.74], [0.80, 0.54]]) {
        Kit.addPart(parent, new THREE.BoxGeometry(0.035, ph, 0.035), ironMat, [tx + px, ph / 2, tz], true);
    }
    Kit.addPart(parent, new THREE.CylinderGeometry(0.015, 0.015, 0.80, 6), ironMat, [tx, 0.70, tz], true, [0, 0, Math.PI / 2]);
    Kit.addPart(parent, new THREE.CylinderGeometry(0.014, 0.014, 0.44, 6), ironMat, [tx + 0.59, 0.50, tz], true, [0, 0, Math.PI / 2]);

    // 6. Covered courtyard water trough / hand-wash stand along back-left yard
    Kit.addPart(parent, new THREE.BoxGeometry(0.46, 0.16, 0.26), stoneMat, [-0.95, 0.08, -1.45], true);
    Kit.addPart(parent, new THREE.BoxGeometry(0.36, 0.02, 0.18), MaterialLibrary.get('waterSurface'), [-0.95, 0.165, -1.45]);
}

/**
 * 3x2 Rectangular Meiji Giyōfū Primary School (Shōgakkō / 小学校) with schoolyard.
 * Automatically scales down cleanly if rendering a legacy 2x2 saved compound.
 */
export function createMeijiSchoolMesh(tile, facingAngle = 0, footprintW = 3, footprintH = 2) {
    const group = new THREE.Group();
    const sub = new THREE.Group();

    const clapboardMat = MaterialLibrary.get('schoolClapboard');
    const woodMat = MaterialLibrary.get('woodDark');
    const whiteMat = MaterialLibrary.get('plasterWhite');
    const stoneMat = MaterialLibrary.get('stoneGranite');
    const trimMat = MaterialLibrary.get('stoneTrim');
    const roofMat = MaterialLibrary.get('kawaraRoof');
    const glassMat = MaterialLibrary.get('glassWindow');
    const ironMat = MaterialLibrary.get('darkIron');

    addSchoolyard(sub, woodMat, whiteMat, roofMat, trimMat, stoneMat, ironMat);

    // Rectangular 2-story Giyōfū Schoolhouse (width = 2.26m, depth = 3.10m -> 6-bay long yard wall)
    const cx = 1.58, cz = -0.14;
    const bodyW = 2.26, bodyD = 3.10;
    Kit.addPart(sub, new THREE.BoxGeometry(bodyW + 0.12, 0.22, bodyD + 0.12), stoneMat, [cx, 0.15, cz], true, null, true);
    Kit.addPart(sub, new THREE.BoxGeometry(bodyW + 0.14, 0.05, bodyD + 0.14), trimMat, [cx, 0.26, cz], true);
    Kit.addPart(sub, new THREE.BoxGeometry(bodyW, 0.90, bodyD), clapboardMat, [cx, 0.71, cz], true, null, true);
    Kit.addPart(sub, new THREE.BoxGeometry(bodyW + 0.08, 0.08, bodyD + 0.08), trimMat, [cx, 1.20, cz], true);
    Kit.addPart(sub, new THREE.BoxGeometry(bodyW - 0.02, 0.88, bodyD - 0.02), clapboardMat, [cx, 1.68, cz], true, null, true);
    Kit.addPart(sub, new THREE.BoxGeometry(bodyW + 0.16, 0.06, bodyD + 0.16), woodMat, [cx, 2.15, cz], true);
    Kit.addPart(sub, new THREE.BoxGeometry(bodyW + 0.22, 0.04, bodyD + 0.22), trimMat, [cx, 2.19, cz], true);

    addCornerQuoins(sub, cx, cz, bodyW, bodyD, 0.26, 2, 0.98, stoneMat);

    // 6-bay long sides (-X overlooking dirt yard & +X outer flank)
    for (const dz of [-1.175, -0.705, -0.235, 0.235, 0.705, 1.175]) {
        for (const [xSide, rotY] of [[cx - bodyW / 2 - 0.012, -Math.PI / 2], [cx + bodyW / 2 + 0.012, Math.PI / 2]]) {
            addSashWindow(sub, [xSide, 0.72, cz + dz], rotY, whiteMat, glassMat, trimMat);
            addSashWindow(sub, [xSide, 1.68, cz + dz], rotY, whiteMat, glassMat, trimMat);
        }
    }
    // 4-bay rear & 2 flanking bays on front street facade
    for (const dx of [-0.72, -0.24, 0.24, 0.72]) {
        addSashWindow(sub, [cx + dx, 0.72, cz - bodyD / 2 - 0.012], Math.PI, whiteMat, glassMat, trimMat);
        addSashWindow(sub, [cx + dx, 1.68, cz - bodyD / 2 - 0.012], Math.PI, whiteMat, glassMat, trimMat);
    }
    for (const dx of [-0.72, 0.72]) {
        addSashWindow(sub, [cx + dx, 0.72, cz + bodyD / 2 + 0.012], 0, whiteMat, glassMat, trimMat);
        addSashWindow(sub, [cx + dx, 1.68, cz + bodyD / 2 + 0.012], 0, whiteMat, glassMat, trimMat);
    }

    addPortico(sub, cx, cz + bodyD / 2, clapboardMat, woodMat, whiteMat, trimMat, stoneMat, roofMat, glassMat);

    // Rectangular hipped kawara roof + shikkui hip ribs + octagonal clock cupola
    const roofW = 2.58, roofD = 3.44, roofH = 0.80, ridgeLen = 0.96;
    const yRoof = 2.20;
    const roofGeo = createHippedRoofGeometry(roofW, roofD, roofH, ridgeLen);
    Kit.addPart(sub, roofGeo, roofMat, [cx, yRoof, cz], true, null, true, 'Kawara_Roof');

    const rTop = yRoof + roofH;
    const hr = ridgeLen / 2;
    Kit.addPart(sub, new THREE.BoxGeometry(0.11, 0.07, ridgeLen + 0.06), trimMat, [cx, rTop + 0.02, cz], true);
    for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
            addHipRibSegment(sub, [cx, rTop, cz + sz * hr], [cx + sx * (roofW / 2 - 0.06), yRoof, cz + sz * (roofD / 2 - 0.06)], trimMat);
        }
    }
    addBelfryCupola(sub, cx, cz + 0.36, whiteMat, woodMat, roofMat, trimMat, glassMat);

    if (footprintW === 2 && footprintH === 2) {
        sub.scale.set(0.64, 0.72, 0.72);
    }
    sub.rotation.y = facingAngle;
    group.add(sub);
    return group;
}
