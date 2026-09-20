// Project Meiji - Map Data Overlay Renderer (overlayRenderer.js)
// ponytail: isolated heatmap color buffers, ground quad tinting & layer blending routines (< 160 lines)

import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class OverlayRenderer {
    // 1. Fire Hazard: Green = 0%, Yellow/Orange/Red = Hazard, Bright Blue = Canals & Stone Roads (Firebreaks)
    static getFireColor(tile, simulation) {
        if (!tile || tile.type === CONFIG.TYPES.EMPTY) return 0x2e3d24;
        if (tile.type === CONFIG.TYPES.CANAL) return 0x00a8ff; // Natural water firebreak
        if (tile.type === CONFIG.TYPES.ROAD) {
            return tile.roadTier === 2 ? 0x00a8ff : 0x4a5d3f; // Stone paving firebreak vs dirt
        }
        if (tile.type === CONFIG.TYPES.SERVICE) return 0x2ecc71; // Civic protection
        if (tile.stage === CONFIG.STAGES.ON_FIRE) return 0xff0000;
        if (tile.level >= 2) return 0x2ecc71; // Fireproof Kura / Brick

        if (simulation?.disaster) {
            const risk = simulation.disaster.getTileFireRiskDetails(tile).risk;
            if (risk <= 10) return 0x2ecc71; // Safe green
            if (risk <= 30) return 0xf1c40f; // Moderate yellow
            if (risk <= 60) return 0xe67e22; // High hazard orange
            return 0xe74c3c; // Severe danger red
        }
        return 0x2ecc71;
    }

    // 2. Sanitation & Water: Cyan = Sources, Blue = Serviced, Sickly Yellow/Brown = Unserved Dwellings
    static getSanitationColor(tile, x, y, simulation) {
        if (tile && (tile.type === CONFIG.TYPES.CANAL || (tile.type === CONFIG.TYPES.SERVICE &&
            (tile.serviceType === CONFIG.SERVICES.WELL || tile.serviceType === CONFIG.SERVICES.SENTO || tile.serviceType === CONFIG.SERVICES.WATERWORKS)))) {
            return 0x00d2d3; // Clean water source node
        }

        const isCovered = simulation ? simulation.isWellCovered(x, y) : false;

        if (tile && tile.type === CONFIG.TYPES.ZONE) {
            return isCovered ? 0x3498db : 0x8c733e; // Clean blue vs sickly yellow/brown unserved
        }

        return isCovered ? 0x2471a3 : 0x2c3e50;
    }

    static getWaterColor(tile, x, y, simulation) {
        return this.getSanitationColor(tile, x, y, simulation);
    }

    // 3. Electric Grid: Soft Neon Gold = Powered Telegraph & Buildings, Dark Shade = Unpowered Districts
    static getElectricColor(tile, x, y, simulation) {
        const isPowerPlant = tile && tile.type === CONFIG.TYPES.SERVICE && tile.serviceType === CONFIG.SERVICES.POWER_PLANT;
        if (isPowerPlant) return 0xffdf59;

        const hasPower = simulation?.powerSystem ? simulation.powerSystem.hasPower(x, y) : !!(tile && tile.hasPower);

        if (tile && tile.hasTelegraph) {
            return hasPower ? 0xffdf59 : 0x636e72; // Soft neon gold vs unpowered wire
        }

        if (tile && (tile.type === CONFIG.TYPES.ZONE || tile.type === CONFIG.TYPES.SERVICE)) {
            return hasPower ? 0xf1c40f : 0x1a252f; // Soft gold vs dark unpowered district
        }

        return 0x111921; // Dark shaded ground
    }

    // 4. Coal Soot Pollution: Soft Soot Overlay 4 tiles around Coal Steam Power Plant
    static getPollutionColor(tile, x, y, simulation) {
        const isPowerPlant = tile && tile.type === CONFIG.TYPES.SERVICE && tile.serviceType === CONFIG.SERVICES.POWER_PLANT;
        if (isPowerPlant) return 0x2d3436;

        if (simulation?.powerSystem) {
            const powerSystem = simulation.powerSystem;
            const radius = CONFIG.SIMULATION.POWER_POLLUTION_RADIUS || 4;

            for (const plantKey of powerSystem.powerPlants) {
                const [px, py] = plantKey.split(',').map(Number);
                const dist = Math.hypot((px + 0.5) - x, (py + 0.5) - y);
                if (dist <= 2.0) return 0x3a3030; // Heavy soot core
                if (dist <= radius + 0.5) return 0x594d4d; // Soft soot haze
            }
        }

        return 0x2ecc71; // Clean air
    }

    // 5. Citizen Welfare (Backward compatibility)
    static getHappinessColor(tile, simulation) {
        if (!tile || tile.type === CONFIG.TYPES.EMPTY) return 0x2c3e50;
        if (tile.type === CONFIG.TYPES.PARK || (tile.type === CONFIG.TYPES.SERVICE && tile.serviceType === CONFIG.SERVICES.SHRINE_PARK)) {
            return 0x2ecc71;
        }
        if (tile.type === CONFIG.TYPES.ZONE && tile.zoneType === CONFIG.ZONES.RESIDENTIAL && simulation) {
            const score = simulation.getResidentialHappiness(tile);
            if (score >= 80) return 0xffd700;
            if (score >= 60) return 0xf1c40f;
            if (score >= 40) return 0xd4ac0d;
            return 0x7f8c8d;
        }
        if (tile.type === CONFIG.TYPES.ZONE && tile.zoneType === CONFIG.ZONES.COMMERCIAL) {
            return tile.level >= 3 ? 0xffd700 : (tile.level >= 2 ? 0xf39c12 : 0xd68910);
        }
        return 0x34495e;
    }

    // 6. Typhoon Flood Inundation Risk: Deep Blue = Canals, Green = Protected Banks, Amber = Vulnerable Lowland
    static getFloodColor(tile, x, y, simulation) {
        if (tile && (tile.submerged || tile.isFlooded)) return 0x2980b9; // Submerged / flooded
        if (tile && tile.type === CONFIG.TYPES.CANAL) return 0x0984e3;    // Deep blue canal waterway

        if (simulation?.typhoon) {
            const risk = simulation.typhoon.getTileFloodRisk(tile, x, y);
            if (risk === 'protected') return 0x2ecc71; // Green protected stone embankment, willow, or sluice
            if (risk === 'vulnerable') return 0xf39c12; // Flashing amber vulnerable dirt bank
            if (risk === 'flooded') return 0x2980b9;
        }

        return 0x2c3e50; // Neutral ground
    }

    // Refresh InstancedMesh buffer colors across entire grid
    static refreshLayerBuffer(instancedMesh, mode, grid, simulation) {
        if (!instancedMesh || mode === 'none') return;

        const dummyColor = new THREE.Color();
        for (let x = 0; x < grid.width; x++) {
            for (let y = 0; y < grid.height; y++) {
                const idx = y * grid.width + x;
                const tile = grid.getTile(x, y);

                let hex = 0x222222;
                if (mode === 'fire') {
                    hex = this.getFireColor(tile, simulation);
                } else if (mode === 'sanitation' || mode === 'water') {
                    hex = this.getSanitationColor(tile, x, y, simulation);
                } else if (mode === 'electric' || mode === 'power') {
                    hex = this.getElectricColor(tile, x, y, simulation);
                } else if (mode === 'pollution') {
                    hex = this.getPollutionColor(tile, x, y, simulation);
                } else if (mode === 'happiness') {
                    hex = this.getHappinessColor(tile, simulation);
                } else if (mode === 'flood') {
                    hex = this.getFloodColor(tile, x, y, simulation);
                }

                dummyColor.setHex(hex);
                instancedMesh.setColorAt(idx, dummyColor);
            }
        }

        if (instancedMesh.instanceColor) {
            instancedMesh.instanceColor.needsUpdate = true;
        }
    }
}
