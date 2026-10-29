// Project Meiji - Procedural Architectural Meshes & Environment Facade (procedural_meshes.js)
// Phase 1 Architecture: Strictly-Three.js zone & service mesh router + cached threat sprites (< 160 lines)

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { MaterialLibrary } from './materialLibrary.js';
import { MeijiArchitectureKit as Kit } from '../meshes/meijiArchitectureKit.js';
import { ResidentialMeshes } from '../meshes/residentialMeshes.js';
import { CommercialMeshes } from '../meshes/commercialMeshes.js';
import { IndustrialMeshes } from '../meshes/industrialMeshes.js';
import { CivicBuildingMeshes } from '../meshes/civicMeshes.js';

export class ProceduralMeshes {
    static createThreatSprite(seconds) {
        return MaterialLibrary.createThreatSprite(seconds);
    }

    static createEmptyZoneDecal(tile) {
        const s = CONFIG.TILE_SIZE;
        const group = new THREE.Group();
        let decalColor = CONFIG.COLORS.ZONE_EMPTY_RES;
        if (tile.zoneType === CONFIG.ZONES.COMMERCIAL) decalColor = CONFIG.COLORS.ZONE_EMPTY_COM;
        if (tile.zoneType === CONFIG.ZONES.INDUSTRIAL) decalColor = CONFIG.COLORS.ZONE_EMPTY_IND;

        const decalGeo = new THREE.PlaneGeometry(s * 0.92, s * 0.92);
        decalGeo.rotateX(-Math.PI / 2);
        const decalMat = new THREE.MeshBasicMaterial({
            color: decalColor,
            transparent: true,
            opacity: CONFIG.COLORS.ZONE_DECAL_OPACITY,
            depthWrite: false
        });
        Kit.addPart(group, decalGeo, decalMat, [0, 0.015, 0]);

        const edgesGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(s * 0.92, 0.01, s * 0.92));
        const line = new THREE.LineSegments(
            edgesGeo,
            new THREE.LineBasicMaterial({ color: decalColor, transparent: true, opacity: 0.6 })
        );
        line.position.y = 0.016;
        group.add(line);

        const stakeGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.20, 6);
        const stakeMat = MaterialLibrary.get('woodMedium');
        for (const [ox, oz] of [[-0.44 * s, -0.44 * s], [0.44 * s, -0.44 * s], [-0.44 * s, 0.44 * s], [0.44 * s, 0.44 * s]]) {
            Kit.addPart(group, stakeGeo, stakeMat, [ox, 0.10, oz], true);
        }
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
            Kit.addPart(group, new THREE.CylinderGeometry(0.06, 0.10, 0.7, 5), MaterialLibrary.get('woodMedium'), [0, 0.35, 0], true);
            Kit.addPart(group, new THREE.DodecahedronGeometry(0.52, 0), seasonalFoliageMaterial, [0, 0.95, 0], true, null, true);
        } else {
            Kit.addPart(group, new THREE.CylinderGeometry(0.05, 0.09, 0.65, 5), MaterialLibrary.get('woodDark'), [0, 0.325, 0], true);
            const pineMat = new THREE.MeshLambertMaterial({ color: 0x2e4a28 });
            Kit.addPart(group, new THREE.ConeGeometry(0.55, 0.45, 5), pineMat, [0, 0.55, 0], true);
            Kit.addPart(group, new THREE.ConeGeometry(0.40, 0.40, 5), pineMat, [0, 0.85, 0], true);
            Kit.addPart(group, new THREE.ConeGeometry(0.25, 0.35, 5), pineMat, [0, 1.12, 0], true);
        }
        return group;
    }

    static createScaffoldMesh(tile, facingAngle = 0) {
        return ResidentialMeshes.createScaffoldMesh(tile, facingAngle);
    }

    static createZoneBuildingMesh(tile, facingAngle = 0) {
        const level = tile.level || 1;
        if (tile.zoneType === CONFIG.ZONES.RESIDENTIAL) {
            if (level >= 3) return ResidentialMeshes.createGinzaBrickL3Mesh(tile, facingAngle);
            if (level >= 2) return ResidentialMeshes.createKuraL2Mesh(tile, facingAngle);
            return ResidentialMeshes.createMachiyaL1Mesh(tile, facingAngle);
        }
        if (tile.zoneType === CONFIG.ZONES.COMMERCIAL) {
            if (level >= 4) return CommercialMeshes.createGinzaCommercialL4Mesh(tile, facingAngle);
            if (level >= 3) return CommercialMeshes.createGiyofuL3Mesh(tile, facingAngle);
            if (level >= 2) return CommercialMeshes.createMerchantMachiyaL2Mesh(tile, facingAngle);
            return CommercialMeshes.createShoutenL1Mesh(tile, facingAngle);
        }
        if (tile.zoneType === CONFIG.ZONES.INDUSTRIAL) {
            if (level >= 2) return IndustrialMeshes.createTextileMillL2Mesh(tile, facingAngle);
            return IndustrialMeshes.createWorkshopL1Mesh(tile, facingAngle);
        }
        return ResidentialMeshes.createMachiyaL1Mesh(tile, facingAngle);
    }

    // Backward-compatible static delegates
    static createFireDepotMesh(tile, facingAngle = 0) {
        return CivicBuildingMeshes.createFireDepotMesh(tile, facingAngle);
    }

    static createCommercialL3Mesh(tile, facingAngle = 0) {
        return CommercialMeshes.createGiyofuL3Mesh(tile, facingAngle);
    }

    static createWellMesh(tile, facingAngle = 0) {
        return CivicBuildingMeshes.createWellMesh(tile, facingAngle);
    }

    static createOchayaMesh(tile, facingAngle = 0) {
        return CivicBuildingMeshes.createOchayaMesh(tile, facingAngle);
    }

    static createSentoMesh(tile, facingAngle = 0) {
        return CivicBuildingMeshes.createSentoMesh(tile, facingAngle);
    }
}
