// Project Meiji - Early Modern Steam Railway Transit (railwaySystem.js)
// ponytail: ballast gravel, wooden ties, iron rails autotiler & rural station depot

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { LevelCrossingMesh } from './levelCrossing.js';
import { RailAutoTiler } from './railAutoTiler.js';

export class RailwaySystem {
    // 1. Procedural Rail Track Mesh (Bitmasking autotiler via RailAutoTiler)
    static createRailTrackMesh(tile, grid, modelCache = null) {
        return RailAutoTiler.createRailTrackMesh(tile, grid, modelCache);
    }

    // 2. Rural Train Depot (Inaka no Eki 1x1 Plot)
    // Timber waiting shed, passenger platform, station sign, lamp & track siding
    static createTrainDepotMesh(tile, facingAngle = 0) {
        const group = new THREE.Group();
        const s = CONFIG.TILE_SIZE;

        // Raised Platform (Stone foundation with timber decking)
        const platMat = new THREE.MeshLambertMaterial({ color: 0x6e685f });
        const platGeo = new THREE.BoxGeometry(s * 0.95, 0.12, 0.85);
        const plat = new THREE.Mesh(platGeo, platMat);
        plat.position.set(0, 0.06, -0.32);
        plat.castShadow = true;
        plat.receiveShadow = true;
        group.add(plat);

        // Platform Edge Safety Curb (White painted timber rim)
        const curbMat = new THREE.MeshLambertMaterial({ color: 0xdedcd7 });
        const curbGeo = new THREE.BoxGeometry(s * 0.95, 0.02, 0.06);
        const curb = new THREE.Mesh(curbGeo, curbMat);
        curb.position.set(0, 0.125, 0.08);
        group.add(curb);

        // Timber Passenger Waiting Shed
        const woodMat = new THREE.MeshLambertMaterial({ color: 0x3d2b1f });
        const cedarMat = new THREE.MeshLambertMaterial({ color: 0x291d15 });
        const roofMat = new THREE.MeshLambertMaterial({ color: 0x222426 });

        // Shed Posts (4 cedar posts)
        const postGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.85, 4);
        [-0.45, 0.45].forEach(x => {
            [-0.65, -0.25].forEach(z => {
                const post = new THREE.Mesh(postGeo, cedarMat);
                post.position.set(x, 0.52, z);
                post.castShadow = true;
                group.add(post);
            });
        });

        // Shed Back Wall
        const wallGeo = new THREE.BoxGeometry(0.96, 0.55, 0.04);
        const wall = new THREE.Mesh(wallGeo, woodMat);
        wall.position.set(0, 0.45, -0.66);
        wall.castShadow = true;
        group.add(wall);

        // Slanted Gabled Roof
        const roofGeo = new THREE.BoxGeometry(1.10, 0.04, 0.60);
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(0, 0.96, -0.45);
        roof.rotation.x = -0.12;
        roof.castShadow = true;
        group.add(roof);

        // Passenger Waiting Bench
        const benchGeo = new THREE.BoxGeometry(0.65, 0.10, 0.18);
        const bench = new THREE.Mesh(benchGeo, woodMat);
        bench.position.set(0, 0.17, -0.55);
        bench.castShadow = true;
        group.add(bench);

        // Station Signboard (Ekimei-hyō / 驛名標)
        const signGeo = new THREE.BoxGeometry(0.35, 0.14, 0.02);
        const signMat = new THREE.MeshLambertMaterial({ color: 0xf0ece1 });
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(0, 0.72, -0.25);
        group.add(sign);

        // Station Gas/Kerosene Lantern on iron bracket
        const ironMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
        const bracketGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.20, 4);
        const bracket = new THREE.Mesh(bracketGeo, ironMat);
        bracket.position.set(0.45, 0.75, -0.20);
        group.add(bracket);

        const lanternGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.12, 6);
        const lanternMat = new THREE.MeshLambertMaterial({ color: 0xffe6aa });
        const lantern = new THREE.Mesh(lanternGeo, lanternMat);
        lantern.position.set(0.45, 0.68, -0.20);
        group.add(lantern);

        const stationLight = new THREE.PointLight(0xffaa44, 1.2, 4.0);
        stationLight.position.set(0.45, 0.68, -0.20);
        group.add(stationLight);

        // Rail Siding along front of platform (z = 0.45)
        const sidingGroup = new THREE.Group();
        const tieGeo = new THREE.BoxGeometry(0.12, 0.025, 0.70);
        const tieMat = new THREE.MeshLambertMaterial({ color: 0x362518 });
        for (let i = 0; i < 4; i++) {
            const x = (i - 1.5) * (s / 4);
            const tie = new THREE.Mesh(tieGeo, tieMat);
            tie.position.set(x, 0.015, 0.48);
            sidingGroup.add(tie);
        }

        const railMat = new THREE.MeshStandardMaterial({ color: 0x3a3d42, metalness: 0.65 });
        const trackGeo = new THREE.BoxGeometry(s * 0.98, 0.04, 0.035);
        const r1 = new THREE.Mesh(trackGeo, railMat);
        r1.position.set(0, 0.04, 0.32);
        sidingGroup.add(r1);

        const r2 = new THREE.Mesh(trackGeo, railMat);
        r2.position.set(0, 0.04, 0.64);
        sidingGroup.add(r2);

        group.add(sidingGroup);
        group.rotation.y = facingAngle;
        return group;
    }

    // Check if any Rural Train Depot exists and is connected to the road network
    static isTrainDepotRoadConnected(grid) {
        if (!grid) return false;
        for (const [_, tile] of grid.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.SERVICE && tile.serviceType === CONFIG.SERVICES.TRAIN_DEPOT) {
                if (grid.hasAdjacentRoad(tile.x, tile.y)) {
                    return true;
                }
            }
        }
        return false;
    }
}
