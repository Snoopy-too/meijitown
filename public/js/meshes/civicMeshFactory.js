// Project Meiji - Procedural Civic Service Mesh Factory Facade (civicMeshFactory.js)
// Phase 1 Architecture: Strictly-Three.js delegator to domain mesh builders (< 120 lines)

import { CONFIG } from '../config.js';
import { ParksSystem } from '../renderer/parksSystem.js';
import { ResidentialMeshes } from './residentialMeshes.js';
import { IndustrialMeshes } from './industrialMeshes.js';
import { CivicBuildingMeshes } from './civicMeshes.js';
import { InfrastructureMeshes } from './infrastructureMeshes.js';

export class CivicMeshFactory {
    static createKobanMesh(tile, facingAngle = 0) {
        return CivicBuildingMeshes.createKobanMesh(tile, facingAngle);
    }

    static createSchoolMesh(tile, facingAngle = 0) {
        return CivicBuildingMeshes.createSchoolMesh(tile, facingAngle);
    }

    static createTelegraphOfficeMesh(tile, facingAngle = 0) {
        return CivicBuildingMeshes.createTelegraphOfficeMesh(tile, facingAngle);
    }

    static createGinzaBrickMesh(tile, facingAngle = 0) {
        return ResidentialMeshes.createGinzaBrickL3Mesh(tile, facingAngle);
    }

    static createHarborPierMesh(tile, facingAngle = 0) {
        return InfrastructureMeshes.createHarborPierMesh(tile, facingAngle);
    }

    static createPowerPlantMesh(tile, facingAngle = 0) {
        return IndustrialMeshes.createPowerPlantMesh(tile, facingAngle);
    }

    static createWaterworksMesh(tile, facingAngle = 0) {
        return CivicBuildingMeshes.createWaterworksMesh(tile, facingAngle);
    }

    static createPavilionMesh(tile, facingAngle = 0) {
        return CivicBuildingMeshes.createPavilionMesh(tile, facingAngle);
    }

    static createSuimonMesh(tile, facingAngle = 0) {
        return CivicBuildingMeshes.createSuimonMesh(tile, facingAngle);
    }

    static createWatchtowerMesh(tile, facingAngle = 0) {
        return CivicBuildingMeshes.createWatchtowerMesh(tile, facingAngle);
    }

    static createServiceMesh(tile, facingAngle = 0, _modelCache = null) {
        const s = CONFIG.TILE_SIZE;
        const st = tile.serviceType;

        if (st === CONFIG.SERVICES.SHRINE_PARK) return ParksSystem.createShrineParkMesh(tile, facingAngle);
        if (st === CONFIG.SERVICES.TRAIN_DEPOT) return InfrastructureMeshes.createTrainDepotMesh(tile, facingAngle);
        if (st === (CONFIG.SERVICES.SUIMON || 'suimon')) return this.createSuimonMesh(tile, facingAngle);

        if (st === CONFIG.SERVICES.SCHOOL || st === CONFIG.SERVICES.HARBOR_PIER) {
            if (!tile.isOrigin) return null;
            const isPier = st === CONFIG.SERVICES.HARBOR_PIER;
            const mesh = isPier
                ? this.createHarborPierMesh(tile, facingAngle)
                : this.createSchoolMesh(tile, facingAngle);
            mesh.position.set(s / 2, 0, s / 2);
            return mesh;
        }

        const multi = {
            [CONFIG.SERVICES.POWER_PLANT]: { fn: () => this.createPowerPlantMesh(tile, facingAngle), p: [s / 2, 0, s / 2] },
            [CONFIG.SERVICES.WATERWORKS]: { fn: () => this.createWaterworksMesh(tile, facingAngle), p: [s / 2, 0, 0] },
            [CONFIG.SERVICES.PAVILION]: { fn: () => this.createPavilionMesh(tile, facingAngle), p: [s, 0, s] }
        }[st];

        if (multi) {
            if (!tile.isOrigin) return null;
            const m = multi.fn();
            m.position.set(...multi.p);
            return m;
        }

        if (st === CONFIG.SERVICES.WELL) return CivicBuildingMeshes.createWellMesh(tile, facingAngle);
        if (st === CONFIG.SERVICES.OCHAYA) return CivicBuildingMeshes.createOchayaMesh(tile, facingAngle);
        if (st === CONFIG.SERVICES.SENTO) return CivicBuildingMeshes.createSentoMesh(tile, facingAngle);
        if (st === CONFIG.SERVICES.KOBAN) return CivicBuildingMeshes.createKobanMesh(tile, facingAngle);
        if (st === CONFIG.SERVICES.TELEGRAPH) return CivicBuildingMeshes.createTelegraphOfficeMesh(tile, facingAngle);
        if (st === CONFIG.SERVICES.FIRE_DEPOT) return CivicBuildingMeshes.createFireDepotMesh(tile, facingAngle);
        return CivicBuildingMeshes.createWatchtowerMesh(tile, facingAngle);
    }
}
