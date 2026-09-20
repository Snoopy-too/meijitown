// Project Meiji - Street Trees & Pocket Parks System (parksSystem.js)
// ponytail: weeping willows, sakura, neighborhood shrine parks (Jinjanoki) with torii & lantern

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { SOUND } from '../fx.js';

export class ParksSystem {
    // 1. Standalone Weeping Willow (Yanagi) or Sakura Cherry Tree
    static createTreeMesh(tile, seasonalFoliageMaterial) {
        const group = new THREE.Group();
        const isWillow = tile.subType === 'willow' || tile.subType === 'tree_willow';

        if (isWillow) {
            // Weeping Willow (Yanagi) - Drooping branches & cascading foliage
            const trunkMat = new THREE.MeshLambertMaterial({ color: 0x3d2c1e });
            const trunkGeo = new THREE.CylinderGeometry(0.06, 0.11, 0.75, 6);
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = 0.375;
            trunk.castShadow = true;
            group.add(trunk);

            // Willow Canopy Dome
            const foliageMat = new THREE.MeshLambertMaterial({ color: 0x5a7a3e });
            const canopyGeo = new THREE.SphereGeometry(0.55, 6, 5);
            canopyGeo.scale(1.0, 0.65, 1.0);
            const canopy = new THREE.Mesh(canopyGeo, foliageMat);
            canopy.position.y = 0.90;
            canopy.castShadow = true;
            group.add(canopy);

            // Cascading Drooping Leaf Pendants around rim
            const pendantGeo = new THREE.CylinderGeometry(0.04, 0.08, 0.45, 5);
            const pendantMat = new THREE.MeshLambertMaterial({ color: 0x6e8e4a });
            const pendantAngles = [0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3];
            for (const ang of pendantAngles) {
                const pend = new THREE.Mesh(pendantGeo, pendantMat);
                const px = Math.cos(ang) * 0.42;
                const pz = Math.sin(ang) * 0.42;
                pend.position.set(px, 0.65, pz);
                pend.rotation.z = (Math.cos(ang) * 0.15);
                pend.castShadow = true;
                group.add(pend);
            }
        } else {
            // Sakura Cherry Tree
            const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a3422 });
            const trunkGeo = new THREE.CylinderGeometry(0.06, 0.10, 0.70, 5);
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = 0.35;
            trunk.castShadow = true;
            group.add(trunk);

            const blossomGeo = new THREE.DodecahedronGeometry(0.54, 0);
            const blossom = new THREE.Mesh(blossomGeo, seasonalFoliageMaterial || new THREE.MeshLambertMaterial({ color: 0xf4c2c2 }));
            blossom.position.y = 0.95;
            blossom.castShadow = true;
            blossom.receiveShadow = true;
            group.add(blossom);
        }

        return group;
    }

    // 2. Neighborhood Shrine Park (Jinjanoki 1x1 Plot)
    // Vermillion Torii gate, Stone Lantern (Tōrō), and Japanese Evergreen Pine
    static createShrineParkMesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const s = CONFIG.TILE_SIZE;

        // Base Plinth (Stone gravel & moss border)
        const plinthMat = new THREE.MeshLambertMaterial({ color: 0x615d56 });
        const plinthGeo = new THREE.BoxGeometry(s * 0.94, 0.04, s * 0.94);
        const plinth = new THREE.Mesh(plinthGeo, plinthMat);
        plinth.position.y = 0.02;
        plinth.receiveShadow = true;
        group.add(plinth);

        // Stone Approach Path (Sandō)
        const pathMat = new THREE.MeshLambertMaterial({ color: 0x7a766e });
        const pathGeo = new THREE.BoxGeometry(0.40, 0.045, s * 0.90);
        const path = new THREE.Mesh(pathGeo, pathMat);
        path.position.set(0, 0.025, 0);
        path.receiveShadow = true;
        group.add(path);

        // Vermillion Torii Gate (Front entrance at z = -0.30)
        const toriiMat = new THREE.MeshLambertMaterial({ color: 0xb52818 });
        const blackTrimMat = new THREE.MeshLambertMaterial({ color: 0x1a1816 });

        // Two Torii Pillars (Hashira)
        const postGeo = new THREE.CylinderGeometry(0.035, 0.04, 0.85, 6);
        const leftPost = new THREE.Mesh(postGeo, toriiMat);
        leftPost.position.set(-0.28, 0.44, -0.28);
        leftPost.castShadow = true;
        group.add(leftPost);

        const rightPost = new THREE.Mesh(postGeo, toriiMat);
        rightPost.position.set(0.28, 0.44, -0.28);
        rightPost.castShadow = true;
        group.add(rightPost);

        // Base Plinth Stones for posts
        const baseStoneGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.08, 6);
        const baseL = new THREE.Mesh(baseStoneGeo, blackTrimMat);
        baseL.position.set(-0.28, 0.06, -0.28);
        group.add(baseL);

        const baseR = new THREE.Mesh(baseStoneGeo, blackTrimMat);
        baseR.position.set(0.28, 0.06, -0.28);
        group.add(baseR);

        // Lower Crossbeam (Nuki)
        const nukiGeo = new THREE.BoxGeometry(0.72, 0.035, 0.04);
        const nuki = new THREE.Mesh(nukiGeo, toriiMat);
        nuki.position.set(0, 0.68, -0.28);
        group.add(nuki);

        // Upper Lintels (Kasagi & Shimaki)
        const kasagiGeo = new THREE.BoxGeometry(0.86, 0.05, 0.06);
        const kasagi = new THREE.Mesh(kasagiGeo, toriiMat);
        kasagi.position.set(0, 0.86, -0.28);
        kasagi.castShadow = true;
        group.add(kasagi);

        // Stone Lantern (Tōrō) at right flank (x = 0.35, z = 0.15)
        const stoneMat = new THREE.MeshLambertMaterial({ color: 0x736f66 });
        const lanternGeo = new THREE.CylinderGeometry(0.07, 0.09, 0.45, 6);
        const lantern = new THREE.Mesh(lanternGeo, stoneMat);
        lantern.position.set(0.32, 0.24, 0.15);
        lantern.castShadow = true;
        group.add(lantern);

        // Lantern Roof Cap (Kasa)
        const kasaGeo = new THREE.ConeGeometry(0.12, 0.08, 6);
        const kasa = new THREE.Mesh(kasaGeo, stoneMat);
        kasa.position.set(0.32, 0.50, 0.15);
        group.add(kasa);

        // Warm Spiritual Candle Light
        const lampLight = new THREE.PointLight(0xff8833, 1.2, 3.5);
        lampLight.position.set(0.32, 0.46, 0.15);
        group.add(lampLight);

        // Evergreen Japanese Pine (Matsu) at rear flank (x = -0.30, z = 0.25)
        const pineTrunkMat = new THREE.MeshLambertMaterial({ color: 0x2e2016 });
        const pineTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.70, 5), pineTrunkMat);
        pineTrunk.position.set(-0.30, 0.35, 0.25);
        pineTrunk.rotation.z = -0.12;
        pineTrunk.castShadow = true;
        group.add(pineTrunk);

        const pineMat = new THREE.MeshLambertMaterial({ color: 0x1f3b1e });
        const tuftGeo = new THREE.SphereGeometry(0.24, 5, 4);
        tuftGeo.scale(1.2, 0.5, 1.2);

        const tuft1 = new THREE.Mesh(tuftGeo, pineMat);
        tuft1.position.set(-0.34, 0.65, 0.25);
        group.add(tuft1);

        const tuft2 = new THREE.Mesh(tuftGeo, pineMat);
        tuft2.position.set(-0.24, 0.85, 0.20);
        group.add(tuft2);

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
