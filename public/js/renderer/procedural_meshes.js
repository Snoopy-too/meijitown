// Project Meiji - Procedural Architectural Fallback Meshes & Environment Elements
// ponytail: low-poly Meiji era civic & commercial architecture fallback generators (< 350 lines)

import * as THREE from 'three';
import { CONFIG } from '../config.js';

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

export class ProceduralMeshes {
    static createThreatSprite(seconds) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 48;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(179, 57, 39, 0.92)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(4, 4, 120, 40, 8);
        else ctx.rect(4, 4, 120, 40);
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#b58900';
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`🔥 ${seconds}s`, 64, 25);

        const texture = new THREE.CanvasTexture(canvas);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
        sprite.scale.set(1.4, 0.52, 1);
        sprite.position.set(0, 1.8, 0);
        return sprite;
    }

    static createEmptyZoneDecal(tile) {
        const s = CONFIG.TILE_SIZE;
        const group = new THREE.Group();
        let decalColor = CONFIG.COLORS.ZONE_EMPTY_RES;
        if (tile.zoneType === CONFIG.ZONES.COMMERCIAL) decalColor = CONFIG.COLORS.ZONE_EMPTY_COM;
        if (tile.zoneType === CONFIG.ZONES.INDUSTRIAL) decalColor = CONFIG.COLORS.ZONE_EMPTY_IND;

        const decalGeo = new THREE.PlaneGeometry(s * 0.92, s * 0.92);
        decalGeo.rotateX(-Math.PI / 2);
        const decalMat = new THREE.MeshBasicMaterial({ color: decalColor, transparent: true, opacity: CONFIG.COLORS.ZONE_DECAL_OPACITY, depthWrite: false });
        addPart(group, decalGeo, decalMat, [0, 0.015, 0]);

        const edgesGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(s * 0.92, 0.01, s * 0.92));
        const line = new THREE.LineSegments(edgesGeo, new THREE.LineBasicMaterial({ color: decalColor, transparent: true, opacity: 0.6 }));
        line.position.y = 0.016;
        group.add(line);

        const stakeGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.20, 6);
        const stakeMat = new THREE.MeshLambertMaterial({ color: 0x5a4632 });
        [[-0.44 * s, -0.44 * s], [0.44 * s, -0.44 * s], [-0.44 * s, 0.44 * s], [0.44 * s, 0.44 * s]].forEach(([ox, oz]) => {
            addPart(group, stakeGeo, stakeMat, [ox, 0.10, oz], true);
        });
        return group;
    }

    static isFoliageTile(x, y, gridWidth, gridHeight) {
        const hash = Math.abs(Math.sin(x * 127.1 + y * 311.7) * 43758.5453) % 1;
        const isPerimeter = x < 2 || x >= gridWidth - 2 || y < 2 || y >= gridHeight - 2;
        if (isPerimeter) return hash > 0.40;
        return (x * 11 + y * 17) % 47 === 0;
    }

    static createTreeMesh(x, y, seasonalFoliageMaterial, pos) {
        const group = new THREE.Group();
        group.position.set(pos ? pos.x : (x + 0.5) * CONFIG.TILE_SIZE, 0, pos ? pos.z : (y + 0.5) * CONFIG.TILE_SIZE);

        if ((x + y) % 3 === 0) {
            addPart(group, new THREE.CylinderGeometry(0.06, 0.10, 0.7, 5), new THREE.MeshLambertMaterial({ color: 0x54402e }), [0, 0.35, 0], true);
            addPart(group, new THREE.DodecahedronGeometry(0.52, 0), seasonalFoliageMaterial, [0, 0.95, 0], true, null, true);
        } else {
            addPart(group, new THREE.CylinderGeometry(0.05, 0.09, 0.65, 5), new THREE.MeshLambertMaterial({ color: 0x3d2b1f }), [0, 0.325, 0], true);
            const pineMat = new THREE.MeshLambertMaterial({ color: 0x2e4a28 });
            addPart(group, new THREE.ConeGeometry(0.55, 0.45, 5), pineMat, [0, 0.55, 0], true);
            addPart(group, new THREE.ConeGeometry(0.40, 0.40, 5), pineMat, [0, 0.85, 0], true);
            addPart(group, new THREE.ConeGeometry(0.25, 0.35, 5), pineMat, [0, 1.12, 0], true);
        }
        return group;
    }

    // Procedural Meiji Fire Brigade Depot (Hikeshi-sho 火消し所)
    static createFireDepotMesh(tile, facingAngle) {
        const group = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const sub = new THREE.Group();

        addPart(sub, new THREE.BoxGeometry(s * 0.85, 0.12, s * 0.82), new THREE.MeshLambertMaterial({ color: 0x423d38 }), [0, 0.06, 0], true, null, true);
        addPart(sub, new THREE.BoxGeometry(s * 0.78, 0.48, s * 0.74), new THREE.MeshLambertMaterial({ color: 0x3d2b1f }), [0, 0.36, 0], true);
        addPart(sub, new THREE.BoxGeometry(s * 0.76, 0.30, s * 0.72), new THREE.MeshLambertMaterial({ color: 0xe5e1d8 }), [0, 0.75, 0]);

        const roofMat = new THREE.MeshLambertMaterial({ color: 0x24282d });
        addPart(sub, new THREE.BoxGeometry(s * 0.92, 0.08, s * 0.88), roofMat, [0, 0.94, 0], true);
        addPart(sub, new THREE.BoxGeometry(s * 0.68, 0.22, s * 0.64), roofMat, [0, 1.05, 0], true);

        const bayMat = new THREE.MeshLambertMaterial({ color: 0x2e1f14 });
        const pGeo = new THREE.BoxGeometry(0.08, 0.65, 0.08);
        addPart(sub, pGeo, bayMat, [-0.25 * s, 0.44, 0.38 * s]);
        addPart(sub, pGeo, bayMat, [0.25 * s, 0.44, 0.38 * s]);
        addPart(sub, new THREE.BoxGeometry(0.58 * s, 0.08, 0.08), bayMat, [0, 0.73, 0.38 * s]);

        addPart(sub, new THREE.CylinderGeometry(0.025, 0.035, 2.3, 6), new THREE.MeshLambertMaterial({ color: 0x5a4632 }), [0.36 * s, 1.15, 0.36 * s], true);
        addPart(sub, new THREE.CylinderGeometry(0.16, 0.16, 0.03, 12), new THREE.MeshLambertMaterial({ color: 0xb33927 }), [0.36 * s, 2.15, 0.36 * s], false, [Math.PI / 2, 0, 0]);

        const barenGeo = new THREE.BoxGeometry(0.03, 0.18, 0.03);
        const barenMat = new THREE.MeshLambertMaterial({ color: 0xe8e4dc });
        for (let b = -2; b <= 2; b++) {
            addPart(sub, barenGeo, barenMat, [0.36 * s + b * 0.05, 1.96, 0.36 * s]);
        }

        addPart(sub, new THREE.CylinderGeometry(0.09, 0.07, 0.22, 6), new THREE.MeshLambertMaterial({ color: 0x8a2b1f }), [-0.35 * s, 0.18, 0.34 * s]);
        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }

    // Procedural Ginza Bricktown Giyōfū Commercial L3 (擬洋風 煉瓦街)
    static createCommercialL3Mesh(tile, facingAngle) {
        const group = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const sub = new THREE.Group();

        const trimMat = new THREE.MeshLambertMaterial({ color: 0xd4c8b8 });
        const brickMat = new THREE.MeshLambertMaterial({ color: 0x8c2d19 });
        const glassMat = new THREE.MeshLambertMaterial({ color: 0x1f2b37 });

        addPart(sub, new THREE.BoxGeometry(s * 0.86, 0.14, s * 0.82), new THREE.MeshLambertMaterial({ color: 0x4a4742 }), [0, 0.07, 0], true, null, true);
        addPart(sub, new THREE.BoxGeometry(s * 0.80, 0.65, s * 0.76), brickMat, [0, 0.465, 0], true);

        [-0.25 * s, 0.25 * s].forEach(ox => {
            addPart(sub, new THREE.BoxGeometry(0.38, 0.42, 0.04), glassMat, [ox, 0.45, 0.385 * s]);
            const arch = new THREE.CylinderGeometry(0.22, 0.22, 0.06, 8, 1, false, 0, Math.PI);
            arch.rotateZ(Math.PI / 2);
            addPart(sub, arch, trimMat, [ox, 0.67, 0.385 * s]);
        });

        const quoinGeo = new THREE.BoxGeometry(0.08, 0.65, 0.08);
        [[-0.40 * s, 0.38 * s], [0.40 * s, 0.38 * s], [-0.40 * s, -0.38 * s], [0.40 * s, -0.38 * s]].forEach(([qx, qz]) => {
            addPart(sub, quoinGeo, trimMat, [qx, 0.465, qz]);
        });

        addPart(sub, new THREE.BoxGeometry(s * 0.84, 0.08, s * 0.80), trimMat, [0, 0.83, 0], true);
        addPart(sub, new THREE.BoxGeometry(s * 0.78, 0.58, s * 0.74), brickMat, [0, 1.16, 0], true);

        addPart(sub, new THREE.BoxGeometry(0.32, 0.34, 0.04), glassMat, [-0.24 * s, 1.18, 0.375 * s]);
        addPart(sub, new THREE.BoxGeometry(0.32, 0.34, 0.04), glassMat, [0.24 * s, 1.18, 0.375 * s]);

        const uQuoinGeo = new THREE.BoxGeometry(0.08, 0.58, 0.08);
        [[-0.39 * s, 0.37 * s], [0.39 * s, 0.37 * s], [-0.39 * s, -0.37 * s], [0.39 * s, -0.37 * s]].forEach(([qx, qz]) => {
            addPart(sub, uQuoinGeo, trimMat, [qx, 1.16, qz]);
        });

        addPart(sub, new THREE.BoxGeometry(0.56 * s, 0.06, 0.22 * s), trimMat, [0, 0.87, 0.44 * s], true);
        addPart(sub, new THREE.BoxGeometry(0.56 * s, 0.16, 0.02), new THREE.MeshLambertMaterial({ color: 0x1f2329 }), [0, 0.98, 0.54 * s]);

        addPart(sub, new THREE.BoxGeometry(s * 0.86, 0.08, s * 0.82), trimMat, [0, 1.49, 0], true);
        addPart(sub, new THREE.BoxGeometry(s * 0.76, 0.26, s * 0.72), new THREE.MeshLambertMaterial({ color: 0x24282d }), [0, 1.66, 0], true);

        const pedGeo = new THREE.ConeGeometry(0.25, 0.20, 4);
        pedGeo.rotateY(Math.PI / 4);
        addPart(sub, pedGeo, trimMat, [0, 1.84, 0.32 * s]);

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }

    // Procedural Meiji Communal Well (Ido 井戸)
    static createWellMesh(tile, facingAngle) {
        const group = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const sub = new THREE.Group();

        addPart(sub, new THREE.BoxGeometry(s * 0.74, 0.05, s * 0.74), new THREE.MeshLambertMaterial({ color: 0x58534c }), [0, 0.025, 0], false, null, true);
        addPart(sub, new THREE.CylinderGeometry(0.38, 0.42, 0.42, 8), new THREE.MeshLambertMaterial({ color: 0x483626 }), [0, 0.24, 0], true);
        addPart(sub, new THREE.CylinderGeometry(0.32, 0.32, 0.04, 8), new THREE.MeshLambertMaterial({ color: 0x225566 }), [0, 0.28, 0]);

        const postMat = new THREE.MeshLambertMaterial({ color: 0x3d2b1f });
        const postGeo = new THREE.CylinderGeometry(0.035, 0.04, 1.25, 6);
        addPart(sub, postGeo, postMat, [-0.36, 0.65, 0], true);
        addPart(sub, postGeo, postMat, [0.36, 0.65, 0], true);
        addPart(sub, new THREE.BoxGeometry(0.86, 0.06, 0.06), postMat, [0, 1.26, 0]);

        const roofMat = new THREE.MeshLambertMaterial({ color: 0x2a1e16 });
        const rGeo = new THREE.BoxGeometry(0.52, 0.035, 0.70);
        addPart(sub, rGeo, roofMat, [-0.19, 1.40, 0], true, [0, 0, 0.52]);
        addPart(sub, rGeo, roofMat, [0.19, 1.40, 0], true, [0, 0, -0.52]);
        addPart(sub, new THREE.BoxGeometry(0.10, 0.06, 0.74), roofMat, [0, 1.54, 0]);

        const pulleyGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.03, 8);
        pulleyGeo.rotateZ(Math.PI / 2);
        addPart(sub, pulleyGeo, new THREE.MeshLambertMaterial({ color: 0x1f2329 }), [0, 1.18, 0]);
        addPart(sub, new THREE.CylinderGeometry(0.008, 0.008, 0.55, 4), new THREE.MeshLambertMaterial({ color: 0xc4b38d }), [0, 0.85, 0]);
        addPart(sub, new THREE.CylinderGeometry(0.09, 0.075, 0.16, 6), new THREE.MeshLambertMaterial({ color: 0x5a422d }), [0.16, 0.52, 0.22], true);

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }

    // Procedural Traditional Teahouse (Ochaya お茶屋) Fallback
    static createOchayaMesh(tile, facingAngle) {
        const group = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const sub = new THREE.Group();

        addPart(sub, new THREE.BoxGeometry(s * 0.82, 0.12, s * 0.78), new THREE.MeshLambertMaterial({ color: 0x48423d }), [0, 0.06, 0]);
        const cedarMat = new THREE.MeshLambertMaterial({ color: 0x3d2b1f });
        addPart(sub, new THREE.BoxGeometry(s * 0.75, 0.75, s * 0.70), cedarMat, [0, 0.495, 0]);
        addPart(sub, new THREE.BoxGeometry(s * 0.55, 0.50, 0.04), new THREE.MeshLambertMaterial({ color: 0xbfa36f }), [0, 0.45, -s * 0.36]);

        const roofMat = new THREE.MeshLambertMaterial({ color: 0x2b2e33 });
        addPart(sub, new THREE.BoxGeometry(s * 0.88, 0.08, s * 0.82), roofMat, [0, 0.91, 0]);
        addPart(sub, new THREE.BoxGeometry(s * 0.78, 0.75, s * 0.72), cedarMat, [0, 1.325, 0]);

        const roofGeo = new THREE.ConeGeometry(s * 0.65, 0.45, 4);
        roofGeo.rotateY(Math.PI / 4);
        addPart(sub, roofGeo, roofMat, [0, 1.925, 0]);

        const lanternGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.18, 8);
        const lanternMat = new THREE.MeshLambertMaterial({ color: 0xd9381e, emissive: 0x551105 });
        [-0.35, 0, 0.35].forEach(xOff => {
            addPart(sub, lanternGeo, lanternMat, [xOff, 0.72, -s * 0.42]);
        });

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }

    // Procedural Public Bathhouse (Sentō 銭湯) Fallback
    static createSentoMesh(tile, facingAngle) {
        const group = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const sub = new THREE.Group();

        addPart(sub, new THREE.BoxGeometry(s * 0.84, 0.12, s * 0.80), new THREE.MeshLambertMaterial({ color: 0x4a4742 }), [0, 0.06, 0]);
        addPart(sub, new THREE.BoxGeometry(s * 0.78, 0.35, s * 0.74), new THREE.MeshLambertMaterial({ color: 0x54402e }), [0, 0.295, 0]);
        addPart(sub, new THREE.BoxGeometry(s * 0.76, 0.65, s * 0.72), new THREE.MeshLambertMaterial({ color: 0xeae6dc }), [0, 0.795, 0]);

        const roofGeo = new THREE.ConeGeometry(s * 0.68, 0.52, 4);
        roofGeo.rotateY(Math.PI / 4);
        addPart(sub, roofGeo, new THREE.MeshLambertMaterial({ color: 0x24282c }), [0, 1.38, 0]);

        addPart(sub, new THREE.BoxGeometry(0.24, 0.95, 0.24), new THREE.MeshLambertMaterial({ color: 0x3d2b1f }), [0, 1.60, s * 0.22]);
        addPart(sub, new THREE.BoxGeometry(0.48, 0.28, 0.04), new THREE.MeshLambertMaterial({ color: 0x1e3f66 }), [0, 0.58, -s * 0.39]);

        sub.rotation.y = facingAngle;
        group.add(sub);
        return group;
    }
}
