// Project Meiji - Procedural 1872 Meiji Era Steam Locomotive & Passenger Carriage Meshes (trainMeshes.js)
// /artisan: Shimbashi-Yokohama 2-4-0 Class 150 tank locomotive, articulated coupling rods, teak & Prussian-green passenger car with clerestory roof & visible riders

import * as THREE from 'three';
import { MaterialLibrary } from './materialLibrary.js';
import { PBRTextureGenerator } from './pbrTextureGenerator.js';

function getTrainMaterials() {
    if (TrainMeshes._mats) return TrainMeshes._mats;

    const woodPBR = PBRTextureGenerator.getWoodWallSet();
    const safeShared = (mat) => {
        mat.userData = { ...(mat.userData || {}), isSharedLibraryMaterial: true };
        return mat;
    };

    TrainMeshes._mats = {
        ironFrame: safeShared(new THREE.MeshStandardMaterial({ color: 0x1e2124, metalness: 0.80, roughness: 0.34, envMapIntensity: 1.35 })),
        darkIron: safeShared(new THREE.MeshStandardMaterial({ color: 0x121417, metalness: 0.76, roughness: 0.40, envMapIntensity: 1.25 })),
        steelRod: safeShared(new THREE.MeshStandardMaterial({ color: 0x8e959c, metalness: 0.90, roughness: 0.22, envMapIntensity: 1.55 })),
        locoGreen: safeShared(new THREE.MeshStandardMaterial({ color: 0x1b3a2b, metalness: 0.28, roughness: 0.38, envMapIntensity: 1.05 })),
        crimsonWheel: safeShared(new THREE.MeshStandardMaterial({ color: 0x7c201a, metalness: 0.36, roughness: 0.42, envMapIntensity: 1.05 })),
        brass: safeShared(new THREE.MeshStandardMaterial({ color: 0xc59a32, metalness: 0.90, roughness: 0.22, envMapIntensity: 1.60 })),
        copper: safeShared(new THREE.MeshStandardMaterial({ color: 0xb06338, metalness: 0.85, roughness: 0.28, envMapIntensity: 1.40 })),
        coal: safeShared(new THREE.MeshStandardMaterial({ color: 0x161618, metalness: 0.12, roughness: 0.92, envMapIntensity: 0.45 })),
        teakPanel: safeShared(new THREE.MeshStandardMaterial({
            color: 0x6f3e24,
            roughness: 0.46,
            metalness: 0.08,
            envMapIntensity: 0.92,
            ...(woodPBR.normalMap ? { normalMap: woodPBR.normalMap, normalScale: new THREE.Vector2(0.35, 0.35) } : {})
        })),
        coachGreen: safeShared(new THREE.MeshStandardMaterial({ color: 0x1c3a32, roughness: 0.42, metalness: 0.12, envMapIntensity: 0.95 })),
        coachCream: safeShared(new THREE.MeshStandardMaterial({ color: 0xefe3cb, roughness: 0.52, metalness: 0.05, envMapIntensity: 0.78 })),
        coachInterior: safeShared(new THREE.MeshStandardMaterial({ color: 0xd9b47c, roughness: 0.72, metalness: 0.02, emissive: new THREE.Color(0x3a2410), emissiveIntensity: 0.18 })),
        roofSlate: safeShared(new THREE.MeshStandardMaterial({ color: 0x332c28, roughness: 0.78, metalness: 0.10, envMapIntensity: 0.68 })),
        clereGlass: safeShared(new THREE.MeshStandardMaterial({ color: 0xf4e4bd, roughness: 0.45, metalness: 0.05, emissive: new THREE.Color(0x553310), emissiveIntensity: 0.22 })),
        headlampLens: safeShared(new THREE.MeshStandardMaterial({
            name: 'M_HeadlampLens',
            color: 0xfff4c2,
            emissive: new THREE.Color(0xffb844),
            emissiveIntensity: 1.15,
            roughness: 0.20
        })),
        windowGlass: MaterialLibrary.get('glassWindow'),
        skin: safeShared(new THREE.MeshStandardMaterial({ color: 0xe2be98, roughness: 0.75 })),
        hair: safeShared(new THREE.MeshStandardMaterial({ color: 0x181615, roughness: 0.80 })),
        kimonoA: safeShared(new THREE.MeshStandardMaterial({ color: 0x264466, roughness: 0.82 })),
        kimonoB: safeShared(new THREE.MeshStandardMaterial({ color: 0x8a3022, roughness: 0.82 })),
        kimonoC: safeShared(new THREE.MeshStandardMaterial({ color: 0x3a5e44, roughness: 0.82 }))
    };

    return TrainMeshes._mats;
}

function addBox(parent, w, h, d, mat, pos, castShadow = true, name = '') {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    if (castShadow) mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (name) mesh.name = name;
    parent.add(mesh);
    return mesh;
}

function addCyl(parent, rt, rb, h, segs, mat, pos, rot = null, castShadow = true, name = '') {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segs), mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
    if (castShadow) mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (name) mesh.name = name;
    parent.add(mesh);
    return mesh;
}

/**
 * Builds a spoked iron railway wheel with outer steel tire flange and hub.
 */
function createSpokedWheel(radius, tireMat, hubMat, centerMat) {
    const wheel = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.028, 12), tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wheel.add(tire);

    const flange = new THREE.Mesh(new THREE.CylinderGeometry(radius + 0.012, radius + 0.012, 0.008, 12), tireMat);
    flange.rotation.z = Math.PI / 2;
    flange.position.x = -0.010;
    wheel.add(flange);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.78, radius * 0.78, 0.032, 10), centerMat);
    rim.rotation.z = Math.PI / 2;
    wheel.add(rim);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.28, radius * 0.28, 0.040, 8), hubMat);
    hub.rotation.z = Math.PI / 2;
    wheel.add(hub);

    return wheel;
}

export class TrainMeshes {
    static _mats = null;

    /**
     * Local Y offset from rail centerline (0.065) to top of steel rail head (0.090).
     */
    static RAIL_TOP_LOCAL_Y = 0.025;

    /**
     * Center-to-center coupling spacing between locomotive and trailing passenger coach.
     */
    static CAR_SPACING = 1.06;

    /**
     * Builds an authentic 1872 Shimbashi-Yokohama Class 150 (2-4-0) tank steam locomotive.
     * Forward nose faces -Z.
     */
    static createLocomotiveMesh() {
        const m = getTrainMaterials();
        const group = new THREE.Group();
        const railY = TrainMeshes.RAIL_TOP_LOCAL_Y; // +0.025 => wheel bottoms rest exactly on rail top

        // 1. Heavy Cast-Iron Main Frame & Front/Rear Buffer Beams
        addBox(group, 0.34, 0.048, 0.92, m.ironFrame, [0, railY + 0.09, 0.01]);
        addBox(group, 0.42, 0.055, 0.045, m.crimsonWheel, [0, railY + 0.09, -0.455]); // Front buffer beam
        addBox(group, 0.42, 0.055, 0.045, m.crimsonWheel, [0, railY + 0.09, 0.465]);  // Rear buffer beam

        // Spring Buffers & Iron Coupler Hooks
        for (const bz of [-0.48, 0.49]) {
            const dir = bz < 0 ? -1 : 1;
            for (const bx of [-0.13, 0.13]) {
                addCyl(group, 0.022, 0.026, 0.04, 8, m.darkIron, [bx, railY + 0.09, bz], [Math.PI / 2, 0, 0]);
                addCyl(group, 0.032, 0.032, 0.012, 8, m.steelRod, [bx, railY + 0.09, bz + dir * 0.022], [Math.PI / 2, 0, 0]);
            }
            addBox(group, 0.03, 0.022, 0.06, m.ironFrame, [0, railY + 0.085, bz + dir * 0.015]);
        }

        // Front Sloped Wrought-Iron Railguards / Cowcatcher
        const guardL = addBox(group, 0.08, 0.04, 0.08, m.darkIron, [-0.11, railY + 0.045, -0.46]);
        guardL.rotation.x = 0.55;
        const guardR = addBox(group, 0.08, 0.04, 0.08, m.darkIron, [0.11, railY + 0.045, -0.46]);
        guardR.rotation.x = 0.55;

        // 2. Boiler, Smokebox & Side Water Tanks
        addCyl(group, 0.135, 0.135, 0.40, 12, m.locoGreen, [0, railY + 0.25, -0.06], [Math.PI / 2, 0, 0]);
        addCyl(group, 0.142, 0.142, 0.18, 12, m.darkIron, [0, railY + 0.25, -0.34], [Math.PI / 2, 0, 0]); // Smokebox
        // Smokebox circular door & brass dart latch
        addCyl(group, 0.115, 0.125, 0.03, 12, m.ironFrame, [0, railY + 0.25, -0.435], [Math.PI / 2, 0, 0]);
        addCyl(group, 0.022, 0.022, 0.035, 8, m.brass, [0, railY + 0.25, -0.45], [Math.PI / 2, 0, 0]);

        // 3 Polished Brass Boiler Bands
        for (const bz of [-0.22, -0.10, 0.02]) {
            addCyl(group, 0.140, 0.140, 0.016, 12, m.brass, [0, railY + 0.25, bz], [Math.PI / 2, 0, 0]);
        }

        // Twin Side Water Tanks & Running Boards (Meiji 2-4-0 tank silhouette)
        for (const sx of [-0.16, 0.16]) {
            addBox(group, 0.075, 0.145, 0.34, m.locoGreen, [sx, railY + 0.20, -0.02]);
            addBox(group, 0.082, 0.014, 0.345, m.brass, [sx, railY + 0.275, -0.02]);
            addBox(group, 0.06, 0.016, 0.88, m.ironFrame, [sx * 1.15, railY + 0.12, 0.0]); // Running board
            // Outside Steam Cylinders at Front
            addCyl(group, 0.048, 0.048, 0.15, 8, m.darkIron, [sx * 1.15, railY + 0.10, -0.30], [Math.PI / 2, 0, 0]);
            addCyl(group, 0.050, 0.050, 0.02, 8, m.brass, [sx * 1.15, railY + 0.10, -0.375], [Math.PI / 2, 0, 0]);
        }

        // 3. Flared Chimney Smokestack, Brass Steam Dome & Safety Whistles
        addCyl(group, 0.044, 0.052, 0.22, 10, m.darkIron, [0, railY + 0.45, -0.33]);
        addCyl(group, 0.066, 0.046, 0.042, 10, m.brass, [0, railY + 0.56, -0.33]); // Capuchon brass rim
        addCyl(group, 0.062, 0.068, 0.11, 10, m.brass, [0, railY + 0.41, -0.10]); // Brass steam dome
        addCyl(group, 0.056, 0.060, 0.04, 10, m.brass, [0, railY + 0.47, -0.10]);
        // Twin Brass Safety Valves
        addCyl(group, 0.012, 0.014, 0.07, 6, m.brass, [-0.022, railY + 0.41, 0.05]);
        addCyl(group, 0.012, 0.014, 0.07, 6, m.brass, [0.022, railY + 0.41, 0.05]);

        // 4. Front Brass Oil Headlamp (glows at Dusk/Night)
        addBox(group, 0.075, 0.085, 0.075, m.brass, [0, railY + 0.36, -0.435]);
        addCyl(group, 0.032, 0.032, 0.02, 8, m.headlampLens, [0, railY + 0.36, -0.475], [Math.PI / 2, 0, 0], false, 'Lantern_Body');
        addBox(group, 0.06, 0.025, 0.06, m.brass, [0, railY + 0.415, -0.435]);

        // 5. Open-Sided Engineer Cab, Coal Bunker & Driver Silhouette
        addBox(group, 0.38, 0.18, 0.26, m.locoGreen, [0, railY + 0.21, 0.24]); // Cab lower body
        addBox(group, 0.38, 0.14, 0.03, m.locoGreen, [0, railY + 0.36, 0.12]); // Front spectacle plate
        // Twin round brass-rimmed spectacle windows on cab front
        for (const wx of [-0.09, 0.09]) {
            addCyl(group, 0.034, 0.034, 0.035, 8, m.brass, [wx, railY + 0.36, 0.12], [Math.PI / 2, 0, 0]);
            addCyl(group, 0.026, 0.026, 0.038, 8, m.windowGlass, [wx, railY + 0.36, 0.12], [Math.PI / 2, 0, 0], false, 'Upper_Window');
        }
        // Cab corner stanchions & curved iron roof
        for (const cx of [-0.175, 0.175]) {
            addBox(group, 0.025, 0.15, 0.025, m.ironFrame, [cx, railY + 0.36, 0.35]);
        }
        addBox(group, 0.42, 0.028, 0.32, m.darkIron, [0, railY + 0.445, 0.25]);
        // Coal bunker with heaped coal at rear
        addBox(group, 0.34, 0.13, 0.11, m.ironFrame, [0, railY + 0.19, 0.40]);
        addBox(group, 0.28, 0.05, 0.08, m.coal, [0, railY + 0.265, 0.40]);
        // Engineer silhouette inside cab
        addCyl(group, 0.042, 0.048, 0.13, 8, m.darkIron, [0.06, railY + 0.28, 0.24]);
        addCyl(group, 0.032, 0.032, 0.05, 8, m.skin, [0.06, railY + 0.37, 0.24]);
        addCyl(group, 0.036, 0.036, 0.024, 8, m.darkIron, [0.06, railY + 0.398, 0.24]);

        // 6. 2-4-0 Wheels & Articulated Coupling Side-Rods
        const wheels = [];
        const sideRods = [];

        // 2 Leading Pony Wheels (radius 0.065)
        for (const px of [-0.21, 0.21]) {
            const pw = createSpokedWheel(0.065, m.steelRod, m.darkIron, m.darkIron);
            pw.position.set(px, railY + 0.065, -0.32);
            if (px > 0) pw.rotation.y = Math.PI;
            group.add(pw);
            wheels.push({ mesh: pw, radius: 0.065 });
        }

        // 4 Large Crimson Driving Wheels (radius 0.11)
        for (const [wx, wz] of [[-0.21, -0.08], [0.21, -0.08], [-0.21, 0.16], [0.21, 0.16]]) {
            const dw = createSpokedWheel(0.11, m.steelRod, m.brass, m.crimsonWheel);
            dw.position.set(wx, railY + 0.11, wz);
            if (wx > 0) dw.rotation.y = Math.PI;
            group.add(dw);
            wheels.push({ mesh: dw, radius: 0.11 });
        }

        // Horizontal Steel Side Connecting Rods on left & right drivers
        for (const rx of [-0.232, 0.232]) {
            const rod = addBox(group, 0.014, 0.024, 0.26, m.steelRod, [rx, railY + 0.08, 0.04]);
            sideRods.push({ mesh: rod, baseX: rx, baseY: railY + 0.11, baseZ: 0.04, crankRadius: 0.042 });
        }

        group.userData = { wheels, sideRods, crankAngle: 0, isLocomotive: true };
        return group;
    }

    /**
     * Builds an authentic Meiji-era varnished teak & cream-trimmed passenger carriage
     * with recessed windows, seated passengers inside, open boarding balconies, and clerestory roof.
     */
    static createPassengerCoachMesh() {
        const m = getTrainMaterials();
        const group = new THREE.Group();
        const railY = TrainMeshes.RAIL_TOP_LOCAL_Y; // +0.025

        // 1. Iron Truss Underframe, Buffers, Steps & Boarding Footboards
        addBox(group, 0.40, 0.042, 1.04, m.ironFrame, [0, railY + 0.11, 0]);
        for (const bz of [-0.535, 0.535]) {
            const dir = bz < 0 ? -1 : 1;
            addBox(group, 0.44, 0.048, 0.036, m.ironFrame, [0, railY + 0.11, bz]);
            for (const bx of [-0.13, 0.13]) {
                addCyl(group, 0.024, 0.024, 0.035, 8, m.steelRod, [bx, railY + 0.11, bz + dir * 0.028], [Math.PI / 2, 0, 0]);
            }
            addBox(group, 0.028, 0.02, 0.06, m.ironFrame, [0, railY + 0.105, bz + dir * 0.025]);
        }

        // Full-length wooden side boarding footboards (running boards)
        for (const fx of [-0.235, 0.235]) {
            addBox(group, 0.06, 0.018, 0.96, m.teakPanel, [fx, railY + 0.082, 0]);
        }

        // 4 Spoked Carriage Wheels (radius 0.075) + Axlebox Pedestals
        const wheels = [];
        for (const [wx, wz] of [[-0.21, -0.30], [0.21, -0.30], [-0.21, 0.30], [0.21, 0.30]]) {
            const cw = createSpokedWheel(0.075, m.steelRod, m.darkIron, m.darkIron);
            cw.position.set(wx, railY + 0.075, wz);
            if (wx > 0) cw.rotation.y = Math.PI;
            group.add(cw);
            wheels.push({ mesh: cw, radius: 0.075 });
            // W-iron axlebox
            addBox(group, 0.032, 0.055, 0.06, m.darkIron, [wx * 1.06, railY + 0.085, wz]);
        }

        // 2. Main Passenger Cabin Body (z in [-0.39, +0.39], leaving open end balconies!)
        // Lower varnished teak wainscoting & chassis sill
        addBox(group, 0.44, 0.125, 0.78, m.teakPanel, [0, railY + 0.195, 0]);
        // Warm illuminated interior floor/cabin backdrop visible behind windows
        addBox(group, 0.37, 0.155, 0.75, m.coachInterior, [0, railY + 0.33, 0], false);
        // Upper window lintel band (deep Meiji green + cream trim)
        addBox(group, 0.445, 0.055, 0.785, m.coachGreen, [0, railY + 0.43, 0]);
        addBox(group, 0.452, 0.018, 0.79, m.coachCream, [0, railY + 0.258, 0]); // Brass/cream waist belt
        addBox(group, 0.452, 0.014, 0.79, m.brass, [0, railY + 0.402, 0]);

        // Vertical Teak Window Pillars & End Walls (creating 5 distinct recessed glass bays per side!)
        const pillarZs = [-0.375, -0.225, -0.075, 0.075, 0.225, 0.375];
        for (const pz of pillarZs) {
            for (const px of [-0.21, 0.21]) {
                addBox(group, 0.028, 0.16, 0.036, m.teakPanel, [px, railY + 0.335, pz]);
            }
        }
        // End bulkheads with central arched entry doorway
        for (const ez of [-0.382, 0.382]) {
            for (const ex of [-0.145, 0.145]) {
                addBox(group, 0.15, 0.27, 0.024, m.teakPanel, [ex, railY + 0.27, ez]);
            }
            addBox(group, 0.14, 0.09, 0.022, m.teakPanel, [0, railY + 0.20, ez]);
            addBox(group, 0.12, 0.11, 0.016, m.windowGlass, [0, railY + 0.31, ez], false, 'Upper_Window');
        }

        // 5 Glass Window Panes per side (recessed behind pillars, glowing warmly at Twilight/Night)
        const windowCenters = [-0.30, -0.15, 0.0, 0.15, 0.30];
        for (const wz of windowCenters) {
            for (const wx of [-0.202, 0.202]) {
                addBox(group, 0.012, 0.125, 0.112, m.windowGlass, [wx, railY + 0.335, wz], false, 'Upper_Window');
            }
        }

        // 3. Seated Passenger Silhouettes Inside Cabin (toggled dynamically as riders board/alight!)
        const passengerSeats = [];
        const kimonoMats = [m.kimonoA, m.kimonoB, m.kimonoC];
        const seatCoords = [
            [-0.10, -0.28], [0.10, -0.28],
            [-0.10, -0.06], [0.10, 0.06],
            [-0.10, 0.24],  [0.10, 0.24]
        ];
        seatCoords.forEach(([sx, sz], idx) => {
            const rider = new THREE.Group();
            rider.position.set(sx, railY + 0.245, sz);
            addCyl(rider, 0.032, 0.040, 0.08, 6, kimonoMats[idx % kimonoMats.length], [0, 0.04, 0], null, false);
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.028, 7, 7), m.skin);
            head.position.set(0, 0.102, 0);
            rider.add(head);
            const hair = new THREE.Mesh(new THREE.SphereGeometry(0.030, 7, 6), m.hair);
            hair.position.set(0, 0.112, 0);
            rider.add(hair);
            rider.visible = idx < 2; // Baseline 2 travelers unless overridden by live boarding count
            group.add(rider);
            passengerSeats.push(rider);
        });

        // 4. Open Vestibule End-Balconies with Wrought-Iron Railings & Corner Stanchions
        for (const bz of [-0.455, 0.455]) {
            const sign = bz < 0 ? -1 : 1;
            // End handrail bar & safety gate
            addBox(group, 0.40, 0.016, 0.018, m.ironFrame, [0, railY + 0.275, bz + sign * 0.055]);
            for (const rx of [-0.19, -0.08, 0.08, 0.19]) {
                addCyl(group, 0.010, 0.010, 0.15, 6, m.ironFrame, [rx, railY + 0.20, bz + sign * 0.055]);
            }
            // Roof support corner stanchions up to canopy eaves
            for (const cx of [-0.195, 0.195]) {
                addCyl(group, 0.012, 0.012, 0.31, 6, m.brass, [cx, railY + 0.295, bz + sign * 0.045]);
            }
        }

        // 5. Classic Meiji Double-Tier Clerestory Monitor Roof & Oil-Lamp Ventilator Cowls
        addBox(group, 0.48, 0.032, 1.04, m.roofSlate, [0, railY + 0.468, 0]);
        addBox(group, 0.24, 0.048, 0.78, m.clereGlass, [0, railY + 0.502, 0], false, 'Upper_Window'); // Clerestory clerestory transom glow
        addBox(group, 0.27, 0.026, 0.82, m.roofSlate, [0, railY + 0.532, 0]);
        for (const vz of [-0.26, 0.0, 0.26]) {
            addCyl(group, 0.022, 0.026, 0.036, 8, m.brass, [0, railY + 0.558, vz]);
        }

        group.userData = { wheels, passengerSeats, isPassengerCoach: true };
        return group;
    }

    /**
     * Creates a complete 2-part articulated Meiji passenger train consist (locomotive + passenger coach).
     */
    static createTrainConsist() {
        return {
            locoMesh: TrainMeshes.createLocomotiveMesh(),
            coachMesh: TrainMeshes.createPassengerCoachMesh(),
            carSpacing: TrainMeshes.CAR_SPACING
        };
    }

    /**
     * Animates spinning driving/coach wheels, reciprocating coupling rods, and visible seated passengers.
     */
    static updateTrainVisuals(locoMesh, coachMesh, distMoved = 0, passengerCount = 2) {
        if (locoMesh?.userData) {
            const u = locoMesh.userData;
            if (distMoved !== 0) {
                u.crankAngle = (u.crankAngle || 0) + distMoved / 0.11;
                if (Array.isArray(u.wheels)) {
                    for (const w of u.wheels) {
                        w.mesh.rotation.x -= distMoved / (w.radius || 0.10);
                    }
                }
                if (Array.isArray(u.sideRods)) {
                    for (const r of u.sideRods) {
                        r.mesh.position.y = r.baseY + Math.sin(u.crankAngle) * r.crankRadius;
                        r.mesh.position.z = r.baseZ + Math.cos(u.crankAngle) * r.crankRadius * 0.55;
                    }
                }
            }
        }

        if (coachMesh?.userData) {
            const cu = coachMesh.userData;
            if (distMoved !== 0 && Array.isArray(cu.wheels)) {
                for (const w of cu.wheels) {
                    w.mesh.rotation.x -= distMoved / (w.radius || 0.075);
                }
            }
            if (Array.isArray(cu.passengerSeats)) {
                const visibleSeats = Math.min(cu.passengerSeats.length, Math.max(0, passengerCount));
                for (let i = 0; i < cu.passengerSeats.length; i++) {
                    cu.passengerSeats[i].visible = i < visibleSeats;
                }
            }
        }
    }
}
