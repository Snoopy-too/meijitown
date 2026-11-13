// Project Meiji - Street Trees & Pocket Parks System (parksSystem.js)
// Phase 2 /artisan: Gnarled Multi-Cluster Sakura, Cascading Weeping Willows & Authentic Myōjin Shrine Parks

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { SOUND } from '../fx.js';
import { MaterialLibrary } from './materialLibrary.js';
import { PBRTextureGenerator } from './pbrTextureGenerator.js';
import { WeatheringShaderSystem } from './weatheringShader.js';
import { WaterShaderSystem } from './waterShader.js';

function getParkMaterials() {
    if (ParksSystem._cached) return ParksSystem._cached;

    const stonePBR = PBRTextureGenerator.getStoneSet();
    const pineTex = PBRTextureGenerator.getFoliageTexture('pine');
    const willowTex = PBRTextureGenerator.getFoliageTexture('willow');

    const stoneOpts = { color: 0x736f66, roughness: 0.84, metalness: 0.06, envMapIntensity: 0.70 };
    if (stonePBR.normalMap) {
        stoneOpts.normalMap = stonePBR.normalMap;
        stoneOpts.normalScale = new THREE.Vector2(0.45, 0.45);
    }
    if (stonePBR.roughnessMap) stoneOpts.roughnessMap = stonePBR.roughnessMap;

    const leafPBR = (colorHex, tex, swayAmp) => {
        const opts = { color: colorHex, roughness: 0.72, metalness: 0.02, envMapIntensity: 0.65, flatShading: false };
        if (tex) {
            opts.map = tex;
            opts.alphaTest = 0.34;
            opts.side = THREE.DoubleSide;
        }
        return WeatheringShaderSystem.enhanceFoliageMaterial(new THREE.MeshStandardMaterial(opts), { swayAmplitude: swayAmp });
    };

    ParksSystem._cached = {
        willowTrunk: new THREE.MeshStandardMaterial({ color: 0x3d2c1e, roughness: 0.88, envMapIntensity: 0.52 }),
        willowCanopy: new THREE.MeshStandardMaterial({ color: 0x5a7a3e, roughness: 0.78, envMapIntensity: 0.62 }),
        willowFrond: leafPBR(0x88b058, willowTex, 0.055),
        sakuraTrunk: new THREE.MeshStandardMaterial({ color: 0x4a3422, roughness: 0.88, envMapIntensity: 0.52 }),
        baseDisc: new THREE.MeshStandardMaterial({ color: 0x5a7a42, roughness: 0.92, envMapIntensity: 0.50 }),
        petal: new THREE.MeshStandardMaterial({ color: 0xf8d0d5, roughness: 0.75, envMapIntensity: 0.60 }),
        plinth: new THREE.MeshStandardMaterial({ color: 0x615d56, roughness: 0.90, metalness: 0.04, envMapIntensity: 0.60, ...stoneOpts }),
        pathStone: new THREE.MeshStandardMaterial({ color: 0x827d75, roughness: 0.80, metalness: 0.05, envMapIntensity: 0.68, ...stoneOpts }),
        blackTrim: new THREE.MeshStandardMaterial({ color: 0x1a1816, roughness: 0.62, metalness: 0.14, envMapIntensity: 0.85 }),
        stone: new THREE.MeshStandardMaterial(stoneOpts),
        pineTrunk: new THREE.MeshStandardMaterial({ color: 0x2e2016, roughness: 0.90, envMapIntensity: 0.50 }),
        pinePad: leafPBR(0x284d27, pineTex, 0.022),
    };
    for (const m of Object.values(ParksSystem._cached)) {
        m.userData = { ...(m.userData || {}), isSharedLibraryMaterial: true };
    }
    return ParksSystem._cached;
}

export class ParksSystem {
    // 1. Standalone Weeping Willow (Yanagi) or Clustered Sakura Cherry Tree
    static createTreeMesh(tile, seasonalFoliageMaterial) {
        const group = new THREE.Group();
        const mats = getParkMaterials();
        const isWillow = tile.subType === 'willow' || tile.subType === 'tree_willow';

        if (isWillow) {
            // Weeping Willow (Yanagi / 柳) - Curved trunk, spreading boughs & cascading frond curtains
            const trunkMat = mats.willowTrunk;
            const trunkGeo = new THREE.CylinderGeometry(0.06, 0.12, 0.75, 8);
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.set(0, 0.375, 0);
            trunk.rotation.z = -0.08;
            trunk.castShadow = true;
            group.add(trunk);

            // 3 spreading upper branch boughs
            const boughGeo = new THREE.CylinderGeometry(0.035, 0.05, 0.38, 6);
            for (let b = 0; b < 3; b++) {
                const ang = (b * Math.PI * 2) / 3;
                const bough = new THREE.Mesh(boughGeo, trunkMat);
                bough.position.set(Math.cos(ang) * 0.12, 0.72, Math.sin(ang) * 0.12);
                bough.rotation.set(Math.sin(ang) * 0.55, 0, -Math.cos(ang) * 0.55);
                bough.castShadow = true;
                group.add(bough);
            }

            // Soft organic canopy core
            const canopyGeo = new THREE.SphereGeometry(0.52, 12, 8);
            canopyGeo.scale(1.1, 0.58, 1.1);
            const canopy = new THREE.Mesh(canopyGeo, mats.willowCanopy);
            canopy.position.y = 0.92;
            canopy.castShadow = true;
            group.add(canopy);

            // 16 swaying alpha-card willow frond curtains hanging at varied radial angles
            const frondGeo = new THREE.PlaneGeometry(0.24, 0.52);
            const frondMat = mats.willowFrond;
            for (let i = 0; i < 16; i++) {
                const ang = (i * Math.PI * 2) / 16;
                const rad = 0.44 + (Math.sin(i * 1.7) * 0.08);
                const pend = new THREE.Mesh(frondGeo, frondMat);
                const px = Math.cos(ang) * rad;
                const pz = Math.sin(ang) * rad;
                const py = 0.65 + (Math.cos(i * 2.3) * 0.08);
                pend.position.set(px, py, pz);
                pend.rotation.y = ang + Math.PI * 0.5;
                pend.rotation.x = 0.12;
                pend.castShadow = true;
                group.add(pend);
            }
        } else {
            // Sakura Cherry Tree (桜) - Gnarled angled trunk, 3 secondary boughs & 14 blossom clusters
            const trunkMat = mats.sakuraTrunk;
            const trunkGeo = new THREE.CylinderGeometry(0.065, 0.11, 0.72, 8);
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.set(0, 0.36, 0);
            trunk.rotation.z = 0.07;
            trunk.castShadow = true;
            group.add(trunk);

            // 3 branching boughs
            const boughGeo = new THREE.CylinderGeometry(0.035, 0.05, 0.36, 6);
            for (let b = 0; b < 3; b++) {
                const ang = (b * Math.PI * 2) / 3 + 0.3;
                const bough = new THREE.Mesh(boughGeo, trunkMat);
                bough.position.set(Math.cos(ang) * 0.14, 0.68, Math.sin(ang) * 0.14);
                bough.rotation.set(Math.sin(ang) * 0.52, 0, -Math.cos(ang) * 0.52);
                bough.castShadow = true;
                group.add(bough);
            }

            // 14 organic blossom clusters (smooth + wind swaying)
            const flowerMat = seasonalFoliageMaterial || WeatheringShaderSystem.enhanceFoliageMaterial(
                new THREE.MeshStandardMaterial({ color: 0xf4c2c2, roughness: 0.76, envMapIntensity: 0.64 })
            );
            const clusterGeo = new THREE.SphereGeometry(0.24, 10, 8);
            const clusterOffsets = [
                [0, 1.05, 0, 1.3],
                [-0.24, 0.98, -0.15, 1.1],
                [0.26, 0.96, 0.14, 1.15],
                [-0.18, 0.90, 0.28, 1.0],
                [0.22, 0.92, -0.24, 1.05],
                [0.34, 0.82, 0, 0.95],
                [-0.32, 0.84, 0.05, 0.9],
                [0, 0.95, 0.32, 1.0],
                [0.12, 1.14, -0.10, 0.85],
                [-0.10, 1.12, 0.15, 0.9],
                [0.28, 0.75, 0.24, 0.8],
                [-0.25, 0.76, -0.26, 0.85],
                [0, 0.82, -0.34, 0.85],
                [-0.12, 1.22, -0.05, 0.75]
            ];

            for (const [cx, cy, cz, cscale] of clusterOffsets) {
                const cluster = new THREE.Mesh(clusterGeo, flowerMat);
                cluster.position.set(cx, cy, cz);
                cluster.scale.set(cscale, cscale * 0.85, cscale);
                cluster.castShadow = true;
                cluster.receiveShadow = true;
                group.add(cluster);
            }

            // Ground base disc with scattered blossom petal flecks
            const baseGeo = new THREE.CylinderGeometry(0.42, 0.46, 0.03, 12);
            const baseMesh = new THREE.Mesh(baseGeo, mats.baseDisc);
            baseMesh.position.y = 0.015;
            group.add(baseMesh);

            const petalGeo = new THREE.BoxGeometry(0.04, 0.01, 0.04);
            for (const [px, pz] of [[-0.18, 0.15], [0.22, -0.12], [-0.12, -0.20], [0.25, 0.18], [0.05, 0.28]]) {
                const petal = new THREE.Mesh(petalGeo, mats.petal);
                petal.position.set(px, 0.035, pz);
                group.add(petal);
            }
        }

        return group;
    }

    // 2. Neighborhood Shrine Park (Jinjanoki 1x1 Plot)
    // Vermilion Myōjin Torii, Stone Tōrō Lantern, Temizuya Basin & Cloud-Pruned Pine
    static createShrineParkMesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const mats = getParkMaterials();
        const s = CONFIG.TILE_SIZE;

        // Base Plinth (Gravel apron & moss border)
        const plinthGeo = new THREE.BoxGeometry(s * 0.94, 0.04, s * 0.94);
        const plinth = new THREE.Mesh(plinthGeo, mats.plinth);
        plinth.position.y = 0.02;
        plinth.receiveShadow = true;
        group.add(plinth);

        // Stone Approach Path (Sandō)
        const pathGeo = new THREE.BoxGeometry(0.42, 0.045, s * 0.90);
        const path = new THREE.Mesh(pathGeo, mats.pathStone);
        path.position.set(0, 0.025, 0);
        path.receiveShadow = true;
        group.add(path);

        // Authentic Myōjin Torii Gate (Front entrance at z = -0.28)
        const toriiMat = MaterialLibrary ? MaterialLibrary.get('toriiVermilion') : new THREE.MeshStandardMaterial({ color: 0xb52818, roughness: 0.48, metalness: 0.12 });
        const blackTrimMat = mats.blackTrim;

        // Two Torii Pillars (Hashira) with black base pedestals (kamebara)
        const postGeo = new THREE.CylinderGeometry(0.035, 0.042, 0.88, 8);
        const baseStoneGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.08, 8);
        for (const px of [-0.28, 0.28]) {
            const post = new THREE.Mesh(postGeo, toriiMat);
            post.position.set(px, 0.46, -0.28);
            post.castShadow = true;
            group.add(post);

            const base = new THREE.Mesh(baseStoneGeo, blackTrimMat);
            base.position.set(px, 0.06, -0.28);
            group.add(base);
        }

        // Lower Crossbeam (Nuki) with central wooden name tablet (Gakuzuka)
        const nuki = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.035, 0.04), toriiMat);
        nuki.position.set(0, 0.70, -0.28);
        group.add(nuki);

        const gaku = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.045), blackTrimMat);
        gaku.position.set(0, 0.78, -0.28);
        group.add(gaku);

        // Upper Lintels (Kasagi & Shimaki) with upturned curved tips
        const kasagi = new THREE.Mesh(new THREE.BoxGeometry(0.90, 0.055, 0.065), toriiMat);
        kasagi.position.set(0, 0.89, -0.28);
        kasagi.castShadow = true;
        group.add(kasagi);

        // Carved Stone Lantern (Tōrō) at right flank (x = 0.32, z = 0.15)
        const stoneMat = mats.stone;
        const lanternGeo = new THREE.CylinderGeometry(0.07, 0.09, 0.45, 8);
        const lantern = new THREE.Mesh(lanternGeo, stoneMat);
        lantern.position.set(0.32, 0.24, 0.15);
        lantern.castShadow = true;
        group.add(lantern);

        // Lantern Roof Cap (Kasa) with pointed jewel finial (Hōju)
        const kasa = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.08, 8), stoneMat);
        kasa.position.set(0.32, 0.52, 0.15);
        group.add(kasa);
        const hoju = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), stoneMat);
        hoju.position.set(0.32, 0.58, 0.15);
        group.add(hoju);

        // Emissive Stone Lantern Firebox (Tōrō-Hibukuro) - zero PointLight overhead
        const candleCore = new THREE.Mesh(
            new THREE.CylinderGeometry(0.055, 0.055, 0.09, 6),
            MaterialLibrary ? MaterialLibrary.get('redLantern') : new THREE.MeshStandardMaterial({
                name: 'M_RedLantern',
                color: 0xffddaa,
                emissive: new THREE.Color(0xff8833),
                emissiveIntensity: 0.85,
                roughness: 0.4
            })
        );
        candleCore.name = 'Lantern_Body';
        candleCore.position.set(0.32, 0.44, 0.15);
        group.add(candleCore);

        // Stone Temizuya Water Basin at left flank (x = -0.32, z = -0.05)
        const basin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.18), stoneMat);
        basin.position.set(-0.32, 0.13, -0.05);
        basin.castShadow = true;
        group.add(basin);
        const waterMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(0.18, 0.14),
            WaterShaderSystem ? WaterShaderSystem.getCanalMaterial() : (MaterialLibrary ? MaterialLibrary.get('waterSurface') : new THREE.MeshStandardMaterial({ color: 0x3a7888, roughness: 0.12 }))
        );
        waterMesh.rotation.x = -Math.PI / 2;
        waterMesh.position.set(-0.32, 0.222, -0.05);
        group.add(waterMesh);

        // Evergreen Japanese Black Pine (Matsu) with 6 cloud-pruned foliage pads
        const pineTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.78, 8), mats.pineTrunk);
        pineTrunk.position.set(-0.30, 0.39, 0.28);
        pineTrunk.rotation.z = -0.14;
        pineTrunk.castShadow = true;
        group.add(pineTrunk);

        const padGeo = new THREE.SphereGeometry(0.18, 10, 7);
        padGeo.scale(1.2, 0.42, 1.2);

        const padOffsets = [
            [-0.38, 0.60, 0.28],
            [-0.22, 0.72, 0.32],
            [-0.42, 0.84, 0.22],
            [-0.26, 0.94, 0.20],
            [-0.15, 0.80, 0.36],
            [-0.30, 1.05, 0.25]
        ];

        for (const [px, py, pz] of padOffsets) {
            const pad = new THREE.Mesh(padGeo, mats.pinePad);
            pad.position.set(px, py, pz);
            pad.castShadow = true;
            group.add(pad);
        }

        group.rotation.y = facingAngle;
        return group;
    }

    // Check if a tile is adjacent to any Shrine Park
    static isShrineParkAdjacent(grid, x, y) {
        const neighbors = [
            { x: x + 1, y }, { x: x - 1, y },
            { x, y: y + 1 }, { x, y: y - 1 },
            { x: x + 1, y: y + 1 }, { x: x - 1, y: y - 1 },
            { x: x + 1, y: y - 1 }, { x: x - 1, y: y + 1 }
        ];

        for (const n of neighbors) {
            if (grid.isValidCoord(n.x, n.y)) {
                const t = grid.getTile(n.x, n.y);
                if (t && t.type === CONFIG.TYPES.SERVICE && t.serviceType === CONFIG.SERVICES.SHRINE_PARK) {
                    return true;
                }
            }
        }
        return false;
    }
}
