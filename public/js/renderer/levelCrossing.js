// Project Meiji - Road-Rail Level Crossing Mesh Builder (levelCrossing.js)
// ponytail: authentic timber decking inlaid between rails & black-yellow striped fumikiri warning posts

import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class LevelCrossingMesh {
    static createLevelCrossingMesh(tile, grid, modelCache = null) {
        const group = new THREE.Group();
        const s = CONFIG.TILE_SIZE;

        // Determine track orientation
        let connectsNS = false;
        let connectsEW = false;

        if (grid) {
            const north = grid.getTile(tile.x, tile.y - 1);
            const south = grid.getTile(tile.x, tile.y + 1);
            const east = grid.getTile(tile.x + 1, tile.y);
            const west = grid.getTile(tile.x - 1, tile.y);

            const isRail = t => t && (t.type === CONFIG.TYPES.RAIL || (t.type === CONFIG.TYPES.SERVICE && t.serviceType === CONFIG.SERVICES.TRAIN_DEPOT));
            connectsNS = isRail(north) || isRail(south);
            connectsEW = isRail(east) || isRail(west);
        }

        // Default: Track runs North-South unless strictly East-West
        const isRailNS = connectsNS || !connectsEW;

        // 1. Try Loading Pre-rendered Blender Asset
        if (modelCache && modelCache.has('crossing')) {
            const crossingObj = modelCache.get('crossing').clone();
            crossingObj.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // If rail is East-West, rotate crossing by 90 degrees
            if (!isRailNS) {
                crossingObj.rotation.y = Math.PI / 2;
            }
            group.add(crossingObj);
            return group;
        }

        // 2. Procedural Fallback Level Crossing
        const crossingGroup = new THREE.Group();

        // Wooden Plank Decking Materials
        const timberDeckMat = new THREE.MeshLambertMaterial({ color: 0x6e5238 });
        const timberRampMat = new THREE.MeshLambertMaterial({ color: 0x4a3725 });
        const warnYellowMat = new THREE.MeshLambertMaterial({ color: 0xdfb418 });
        const warnBlackMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });

        // Center timber planks flush with iron rails (between rails, gauge = 0.44)
        const centerPlanks = new THREE.Mesh(
            new THREE.BoxGeometry(0.36, 0.045, s * 0.58),
            timberDeckMat
        );
        centerPlanks.position.set(0, 0.05, 0);
        centerPlanks.receiveShadow = true;
        crossingGroup.add(centerPlanks);

        // Outer timber approach ramps (flanking outside left & right rails)
        const leftRamp = new THREE.Mesh(
            new THREE.BoxGeometry(0.26, 0.038, s * 0.58),
            timberRampMat
        );
        leftRamp.position.set(-0.35, 0.045, 0);
        leftRamp.receiveShadow = true;
        crossingGroup.add(leftRamp);

        const rightRamp = new THREE.Mesh(
            new THREE.BoxGeometry(0.26, 0.038, s * 0.58),
            timberRampMat
        );
        rightRamp.position.set(0.35, 0.045, 0);
        rightRamp.receiveShadow = true;
        crossingGroup.add(rightRamp);

        // 2 Wooden Warning Posts (Fumikiri) with black-and-yellow crossbuck signs
        const postOffsets = [
            { x: 0.58, z: 0.58, rot: 0 },
            { x: -0.58, z: -0.58, rot: Math.PI }
        ];

        postOffsets.forEach(p => {
            const postGroup = new THREE.Group();
            postGroup.position.set(p.x, 0, p.z);

            // Upright cedar post
            const postGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.90, 6);
            const post = new THREE.Mesh(postGeo, timberRampMat);
            post.position.y = 0.45;
            post.castShadow = true;
            postGroup.add(post);

            // Crossbuck warning blades (X shape)
            const bladeGeo = new THREE.BoxGeometry(0.32, 0.04, 0.015);
            const bYellow = new THREE.Mesh(bladeGeo, warnYellowMat);
            bYellow.position.y = 0.82;
            bYellow.rotation.z = 0.70;
            postGroup.add(bYellow);

            const bBlack = new THREE.Mesh(bladeGeo, warnBlackMat);
            bBlack.position.y = 0.82;
            bBlack.rotation.z = -0.70;
            postGroup.add(bBlack);

            postGroup.rotation.y = p.rot;
            crossingGroup.add(postGroup);
        });

        if (!isRailNS) {
            crossingGroup.rotation.y = Math.PI / 2;
        }

        group.add(crossingGroup);
        return group;
    }
}
