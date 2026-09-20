// Project Meiji - Procedural Civic Service Mesh Factory (civicMeshFactory.js)
// ponytail: low-poly Meiji civic architecture fallbacks: Kōban, Shōgakkō, Denshin-kyoku, Ginza Brick & Funatsuki-ba Pier (< 300 lines)

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { ParksSystem } from '../renderer/parksSystem.js';
import { RailwaySystem } from '../renderer/railwaySystem.js';
import { ProceduralMeshes } from '../renderer/procedural_meshes.js';

function addPart(parent, geo, mat, pos = [0, 0, 0], cast = false, rot = null, receive = false) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    if (rot) {
        if (rot[0]) mesh.rotation.x = rot[0];
        if (rot[1]) mesh.rotation.y = rot[1];
        if (rot[2]) mesh.rotation.z = rot[2];
    }
    if (cast) mesh.castShadow = true;
    if (receive) mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
}

export class CivicMeshFactory {
    static createKobanMesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const sub = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const woodMat = new THREE.MeshLambertMaterial({ color: 0x422f20 });

        addPart(sub, new THREE.CylinderGeometry(s * 0.36, s * 0.38, 0.12, 6), new THREE.MeshLambertMaterial({ color: 0x4a4742 }), [0, 0.06, 0]);
        addPart(sub, new THREE.CylinderGeometry(s * 0.30, s * 0.30, 1.25, 6), new THREE.MeshLambertMaterial({ color: 0x8a3828 }), [0, 0.745, 0], true);
        addPart(sub, new THREE.CylinderGeometry(s * 0.31, s * 0.31, 0.08, 6), woodMat, [0, 0.24, 0]);
        addPart(sub, new THREE.BoxGeometry(0.38, 0.85, 0.08), woodMat, [0, 0.545, -s * 0.28]);
        addPart(sub, new THREE.BoxGeometry(0.30, 0.78, 0.04), new THREE.MeshLambertMaterial({ color: 0x2e1f14 }), [0, 0.51, -s * 0.29]);
        addPart(sub, new THREE.ConeGeometry(s * 0.42, 0.45, 6), new THREE.MeshLambertMaterial({ color: 0x26282c }), [0, 1.59, 0], true);
        addPart(sub, new THREE.CylinderGeometry(0.02, 0.05, 0.18, 6), new THREE.MeshLambertMaterial({ color: 0xa88c42 }), [0, 1.90, 0]);
        addPart(sub, new THREE.BoxGeometry(0.04, 0.04, 0.26), new THREE.MeshLambertMaterial({ color: 0x1f1f22 }), [0, 1.25, -s * 0.38]);
        addPart(sub, new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshLambertMaterial({ color: 0xd92614, emissive: 0x991808 }), [0, 1.10, -s * 0.45]);

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }

    static createSchoolMesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const sub = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const plasterMat = new THREE.MeshLambertMaterial({ color: 0xe0dcd4 });
        const roofMat = new THREE.MeshLambertMaterial({ color: 0x22252a });

        addPart(sub, new THREE.BoxGeometry(s * 1.65, 0.16, s * 1.35), new THREE.MeshLambertMaterial({ color: 0x484542 }), [0, 0.08, 0]);
        addPart(sub, new THREE.BoxGeometry(s * 1.55, 0.90, s * 1.25), new THREE.MeshLambertMaterial({ color: 0x3d2b1f }), [0, 0.61, 0], true);
        addPart(sub, new THREE.BoxGeometry(s * 1.52, 0.85, s * 1.22), plasterMat, [0, 1.485, 0], true);

        const roofGeo = new THREE.ConeGeometry(s * 1.15, 0.70, 4);
        roofGeo.rotateY(Math.PI / 4);
        addPart(sub, roofGeo, roofMat, [0, 2.26, 0], true);
        addPart(sub, new THREE.BoxGeometry(0.50, 0.45, 0.50), plasterMat, [0, 2.835, 0]);
        addPart(sub, new THREE.ConeGeometry(0.38, 0.35, 6), roofMat, [0, 3.235, 0]);

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }

    static createTelegraphOfficeMesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const sub = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const woodMat = new THREE.MeshLambertMaterial({ color: 0x3d2b1f });
        const ironMat = new THREE.MeshStandardMaterial({ color: 0x1f2022, metalness: 0.7, roughness: 0.3 });

        addPart(sub, new THREE.BoxGeometry(s * 0.76, 0.12, s * 0.76), new THREE.MeshLambertMaterial({ color: 0x5a5652 }), [0, 0.06, 0]);
        addPart(sub, new THREE.BoxGeometry(s * 0.70, 0.85, s * 0.70), new THREE.MeshLambertMaterial({ color: 0x822f24 }), [0, 0.545, 0], true);
        addPart(sub, new THREE.BoxGeometry(s * 0.72, 0.08, s * 0.72), woodMat, [0, 0.98, 0]);
        addPart(sub, new THREE.BoxGeometry(s * 0.68, 0.55, s * 0.68), woodMat, [0, 1.285, 0], true);
        addPart(sub, new THREE.BoxGeometry(0.32, 0.65, 0.06), woodMat, [0, 0.445, -s * 0.355]);
        addPart(sub, new THREE.BoxGeometry(0.38, 0.10, 0.04), new THREE.MeshLambertMaterial({ color: 0x1a2d42 }), [0, 0.82, -s * 0.356]);

        const roofGeo = new THREE.ConeGeometry(s * 0.58, 0.52, 4);
        roofGeo.rotateY(Math.PI / 4);
        addPart(sub, roofGeo, new THREE.MeshLambertMaterial({ color: 0x272a2e }), [0, 1.80, 0], true);
        addPart(sub, new THREE.CylinderGeometry(0.018, 0.024, 1.45, 6), ironMat, [0, 2.65, 0], true);
        addPart(sub, new THREE.BoxGeometry(0.48, 0.025, 0.025), ironMat, [0, 3.10, 0]);

        const pMat = new THREE.MeshLambertMaterial({ color: 0xf5f3ee, emissive: 0x222222 });
        [-0.20, 0, 0.20].forEach(ox => {
            addPart(sub, new THREE.CylinderGeometry(0.02, 0.025, 0.06, 5), pMat, [ox, 3.15, 0]);
        });

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }

    static createGinzaBrickMesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const sub = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const trimMat = new THREE.MeshLambertMaterial({ color: 0xd8d3c5 });
        const brickMat = new THREE.MeshLambertMaterial({ color: 0x882c20 });
        const glassMat = new THREE.MeshStandardMaterial({ color: 0x7694a2, roughness: 0.2, metalness: 0.4 });

        addPart(sub, new THREE.BoxGeometry(s * 0.82, 0.14, s * 0.82), trimMat, [0, 0.07, 0]);
        addPart(sub, new THREE.BoxGeometry(s * 0.78, 1.05, s * 0.78), brickMat, [0, 0.665, 0], true);
        addPart(sub, new THREE.BoxGeometry(s * 0.82, 0.10, s * 0.82), trimMat, [0, 1.24, 0]);
        addPart(sub, new THREE.BoxGeometry(s * 0.74, 0.95, s * 0.74), brickMat, [0, 1.765, 0], true);
        addPart(sub, new THREE.BoxGeometry(s * 0.78, 0.12, s * 0.78), trimMat, [0, 2.30, 0]);

        [-0.32, 0.32].forEach(ox => {
            addPart(sub, new THREE.BoxGeometry(0.30, 0.58, 0.06), trimMat, [ox, 0.66, -s * 0.395]);
            addPart(sub, new THREE.BoxGeometry(0.24, 0.48, 0.04), glassMat, [ox, 0.66, -s * 0.40]);
            addPart(sub, new THREE.BoxGeometry(0.26, 0.50, 0.06), trimMat, [ox, 1.76, -s * 0.375]);
            addPart(sub, new THREE.BoxGeometry(0.20, 0.42, 0.04), glassMat, [ox, 1.76, -s * 0.38]);
        });

        const roofGeo = new THREE.ConeGeometry(s * 0.62, 0.65, 4);
        roofGeo.rotateY(Math.PI / 4);
        addPart(sub, roofGeo, new THREE.MeshLambertMaterial({ color: 0x23262a }), [0, 2.65, 0], true);

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }

    static createHarborPierMesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const sub = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const width = s * 1.85;

        const timberMat = new THREE.MeshLambertMaterial({ color: 0x3d2b1f });
        const ironMat = new THREE.MeshStandardMaterial({ color: 0x222226, metalness: 0.8, roughness: 0.3 });
        const crateMat = new THREE.MeshLambertMaterial({ color: 0x735538 });

        addPart(sub, new THREE.BoxGeometry(width, 0.22, width), new THREE.MeshLambertMaterial({ color: 0x56534c }), [0, 0.11, 0], false, null, true);
        addPart(sub, new THREE.BoxGeometry(width * 0.96, 0.05, width * 0.96), new THREE.MeshLambertMaterial({ color: 0x5a4430 }), [0, 0.245, 0], false, null, true);

        [-0.8 * s, -0.3 * s, 0.3 * s, 0.8 * s].forEach(px => {
            addPart(sub, new THREE.CylinderGeometry(0.06, 0.07, 0.65, 6), timberMat, [px, 0.10, 0.92 * s], true);
            addPart(sub, new THREE.CylinderGeometry(0.04, 0.045, 0.28, 6), ironMat, [px, 0.38, 0.84 * s]);
        });

        addPart(sub, new THREE.CylinderGeometry(0.12, 0.15, 0.25, 6), timberMat, [-0.45 * s, 0.36, 0.45 * s]);
        addPart(sub, new THREE.CylinderGeometry(0.04, 0.05, 1.85, 6), timberMat, [-0.45 * s, 1.15, 0.45 * s], true);
        addPart(sub, new THREE.CylinderGeometry(0.03, 0.035, 1.5, 6), timberMat, [-0.20 * s, 1.85, 0.70 * s], true, [-0.65, 0, 0.35]);
        addPart(sub, new THREE.CylinderGeometry(0.008, 0.008, 1.1, 4), ironMat, [0.02 * s, 1.45, 0.88 * s]);

        const strawMat = new THREE.MeshLambertMaterial({ color: 0xb59b58 });
        const tawaraGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.48, 8);
        tawaraGeo.rotateZ(Math.PI / 2);
        [[0.35 * s, 0.38, -0.25 * s], [0.35 * s, 0.38, 0.15 * s], [0.55 * s, 0.38, -0.05 * s], [0.45 * s, 0.58, -0.05 * s]].forEach(p => {
            addPart(sub, tawaraGeo, strawMat, p, true);
        });

        addPart(sub, new THREE.BoxGeometry(0.40, 0.35, 0.40), crateMat, [-0.35 * s, 0.44, -0.35 * s], true);
        addPart(sub, new THREE.BoxGeometry(0.32, 0.28, 0.32), crateMat, [-0.55 * s, 0.40, -0.05 * s], true);

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }

    static createPowerPlantMesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const sub = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const brickMat = new THREE.MeshLambertMaterial({ color: 0x882c20 });
        const ironMat = new THREE.MeshStandardMaterial({ color: 0x22262a, roughness: 0.4, metalness: 0.7 });

        addPart(sub, new THREE.BoxGeometry(s * 1.85, 0.18, s * 1.85), new THREE.MeshLambertMaterial({ color: 0x484542 }), [0, 0.09, 0], false, null, true);
        addPart(sub, new THREE.BoxGeometry(s * 1.10, 1.45, s * 1.40), brickMat, [-0.25 * s, 0.81, 0], true);
        addPart(sub, new THREE.BoxGeometry(s * 1.18, 0.20, s * 1.45), ironMat, [-0.25 * s, 1.60, 0]);
        addPart(sub, new THREE.CylinderGeometry(0.18, 0.24, 0.50, 8), brickMat, [0.55 * s, 0.34, 0.42 * s]);
        addPart(sub, new THREE.CylinderGeometry(0.14, 0.16, 2.40, 8), ironMat, [0.55 * s, 1.65, 0.42 * s], true);
        addPart(sub, new THREE.CylinderGeometry(0.15, 0.15, 0.45, 8), ironMat, [0.55 * s, 0.35, -0.35 * s], true, [Math.PI / 2, 0, 0]);

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }

    static createWaterworksMesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const sub = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const stoneMat = new THREE.MeshLambertMaterial({ color: 0x585552 });
        const sandMat = new THREE.MeshLambertMaterial({ color: 0xc8b890 });
        const waterMat = new THREE.MeshStandardMaterial({ color: 0x2b546b, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.85 });

        addPart(sub, new THREE.BoxGeometry(s * 1.85, 0.18, s * 0.90), stoneMat, [0, 0.09, 0], false, null, true);
        addPart(sub, new THREE.BoxGeometry(s * 0.90, 0.08, s * 0.72), sandMat, [-0.38 * s, 0.18, 0]);
        addPart(sub, new THREE.BoxGeometry(s * 0.84, 0.04, s * 0.66), waterMat, [-0.38 * s, 0.21, 0]);
        addPart(sub, new THREE.BoxGeometry(s * 0.65, 0.90, s * 0.65), new THREE.MeshLambertMaterial({ color: 0x822f24 }), [0.45 * s, 0.54, 0], true);
        addPart(sub, new THREE.ConeGeometry(s * 0.48, 0.40, 4), stoneMat, [0.45 * s, 1.15, 0], true);

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }

    static createPavilionMesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const sub = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const plasterMat = new THREE.MeshLambertMaterial({ color: 0xe8e4dc });
        const domeMat = new THREE.MeshLambertMaterial({ color: 0x2e485e });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.3 });

        addPart(sub, new THREE.BoxGeometry(s * 2.80, 0.24, s * 2.80), new THREE.MeshLambertMaterial({ color: 0x54524e }), [0, 0.12, 0], false, null, true);
        addPart(sub, new THREE.BoxGeometry(s * 2.20, 1.40, s * 2.00), plasterMat, [0, 0.84, -0.05 * s], true);
        addPart(sub, new THREE.BoxGeometry(s * 1.60, 0.95, s * 1.50), plasterMat, [0, 1.95, -0.05 * s], true);
        addPart(sub, new THREE.CylinderGeometry(0.45, 0.50, 0.60, 8), plasterMat, [0, 2.70, -0.05 * s]);
        addPart(sub, new THREE.ConeGeometry(0.55, 0.70, 8), domeMat, [0, 3.25, -0.05 * s], true);
        addPart(sub, new THREE.CylinderGeometry(0.02, 0.03, 0.50, 6), goldMat, [0, 3.75, -0.05 * s]);

        [-0.8 * s, -0.3 * s, 0.3 * s, 0.8 * s].forEach(cx => {
            addPart(sub, new THREE.CylinderGeometry(0.04, 0.05, 1.30, 8), plasterMat, [cx, 0.75, 1.05 * s], true);
        });

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }

    // Procedural Watergate Sluice (Suimon - 水門・防潮樋)
    static createSuimonMesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const stoneMat = new THREE.MeshLambertMaterial({ color: 0x6e6b65 }); // Granite masonry
        const woodMat = new THREE.MeshLambertMaterial({ color: 0x3d2b1f });  // Sluice timber
        const ironMat = new THREE.MeshStandardMaterial({ color: 0x222428, metalness: 0.8, roughness: 0.3 });

        // Granite abutment pillars (Left and Right piers)
        [-0.45, 0.45].forEach(x => {
            const pier = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.90, 0.70), stoneMat);
            pier.position.set(x, 0.45, 0);
            pier.castShadow = true;
            pier.receiveShadow = true;
            group.add(pier);
        });

        // Heavy timber header beam & winch platform
        const header = new THREE.Mesh(new THREE.BoxGeometry(1.20, 0.14, 0.32), woodMat);
        header.position.set(0, 0.85, 0);
        header.castShadow = true;
        group.add(header);

        // Sliding wooden floodgate board (Sluice leaf)
        const gate = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.75, 0.08), woodMat);
        gate.position.set(0, 0.35, 0);
        gate.castShadow = true;
        group.add(gate);

        // Iron hoist winch wheels on top
        [-0.20, 0.20].forEach(x => {
            const winch = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 8), ironMat);
            winch.rotation.z = Math.PI / 2;
            winch.position.set(x, 0.98, 0);
            group.add(winch);

            const chain = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.30, 0.02), ironMat);
            chain.position.set(x, 0.75, 0);
            group.add(chain);
        });

        group.rotation.y = facingAngle;
        return group;
    }

    static createServiceMesh(tile, facingAngle, modelCache) {
        const s = CONFIG.TILE_SIZE;
        const st = tile.serviceType;
        if (st === CONFIG.SERVICES.SHRINE_PARK) return ParksSystem.createShrineParkMesh(tile, facingAngle);
        if (st === CONFIG.SERVICES.TRAIN_DEPOT) return RailwaySystem.createTrainDepotMesh(tile, facingAngle);
        if (st === (CONFIG.SERVICES.SUIMON || 'suimon')) return this.createSuimonMesh(tile, facingAngle);

        if (st === CONFIG.SERVICES.SCHOOL || st === CONFIG.SERVICES.HARBOR_PIER) {
            if (!tile.isOrigin) return null;
            const isPier = st === CONFIG.SERVICES.HARBOR_PIER;
            const key = isPier ? 'harbor_pier' : 'school';
            const mesh = modelCache.has(key)
                ? modelCache.get(key).clone()
                : (isPier ? this.createHarborPierMesh(tile, facingAngle) : this.createSchoolMesh(tile, facingAngle));
            mesh.position.set(s / 2, 0, s / 2);
            mesh.rotation.y = facingAngle;
            return mesh;
        }

        const multi = {
            [CONFIG.SERVICES.POWER_PLANT]: { k: 'power_plant', fn: () => this.createPowerPlantMesh(tile, facingAngle), p: [s / 2, 0, s / 2] },
            [CONFIG.SERVICES.WATERWORKS]: { k: 'waterworks', fn: () => this.createWaterworksMesh(tile, facingAngle), p: [s / 2, 0, 0] },
            [CONFIG.SERVICES.PAVILION]: { k: 'pavilion', fn: () => this.createPavilionMesh(tile, facingAngle), p: [s, 0, s] }
        }[st];
        if (multi) {
            if (!tile.isOrigin) return null;
            const m = modelCache.has(multi.k) ? modelCache.get(multi.k).clone() : multi.fn();
            m.position.set(...multi.p);
            m.rotation.y = facingAngle;
            return m;
        }

        const key = st === CONFIG.SERVICES.FIRE_DEPOT ? 'fire_depot'
            : st === CONFIG.SERVICES.WELL ? 'well'
            : st === CONFIG.SERVICES.OCHAYA ? 'ochaya'
            : st === CONFIG.SERVICES.SENTO ? 'sento'
            : st === CONFIG.SERVICES.KOBAN ? 'koban'
            : st === CONFIG.SERVICES.TELEGRAPH ? 'telegraph' : 'watchtower';

        let mesh = modelCache.has(key) ? modelCache.get(key).clone() : null;
        if (!mesh) {
            if (st === CONFIG.SERVICES.WELL) mesh = ProceduralMeshes.createWellMesh(tile, facingAngle);
            else if (st === CONFIG.SERVICES.OCHAYA) mesh = ProceduralMeshes.createOchayaMesh(tile, facingAngle);
            else if (st === CONFIG.SERVICES.SENTO) mesh = ProceduralMeshes.createSentoMesh(tile, facingAngle);
            else if (st === CONFIG.SERVICES.KOBAN) mesh = this.createKobanMesh(tile, 0);
            else if (st === CONFIG.SERVICES.TELEGRAPH) mesh = this.createTelegraphOfficeMesh(tile, facingAngle);
            else mesh = ProceduralMeshes.createFireDepotMesh(tile, facingAngle);
        }
        mesh.rotation.y = facingAngle;

        if (st === CONFIG.SERVICES.OCHAYA) {
            const l = new THREE.PointLight(0xff7a30, 1.5, 6.0);
            l.position.set(0, 1.2, -0.7);
            mesh.add(l);
        } else if (st === CONFIG.SERVICES.KOBAN) {
            const l = new THREE.PointLight(0xd92614, 1.2, 5.0);
            l.position.set(0, 1.2, -0.6);
            mesh.add(l);
        }
        return mesh;
    }
}
