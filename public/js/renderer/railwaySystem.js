// Project Meiji - Early Modern Steam Railway Transit (railwaySystem.js)
// Phase 1 Architecture: Strictly-Three.js rail autotiler & depot delegator (< 50 lines)

import { CONFIG } from '../config.js';
import { RailAutoTiler } from './railAutoTiler.js';
import { InfrastructureMeshes } from '../meshes/infrastructureMeshes.js';

export class RailwaySystem {
    // 1. Procedural Rail Track Mesh (Bitmasking autotiler via RailAutoTiler)
    static createRailTrackMesh(tile, grid, modelCache = null) {
        return RailAutoTiler.createRailTrackMesh(tile, grid, modelCache);
    }

    // 2. Rural Train Depot (Inaka no Eki)
    static createTrainDepotMesh(tile, facingAngle = 0) {
        return InfrastructureMeshes.createTrainDepotMesh(tile, facingAngle);
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
