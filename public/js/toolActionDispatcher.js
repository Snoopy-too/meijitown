// Project Meiji - Tool Action Dispatcher (toolActionDispatcher.js)
// ponytail: extracted tool execution routines for roads, zones, civics & capstone (< 250 lines)

import { CONFIG } from './config.js';
import { SOUND } from './fx.js';

export class ToolActionDispatcher {
    constructor(toolController) {
        this.ctrl = toolController;
    }

    get grid() { return this.ctrl.grid; }
    get state() { return this.ctrl.state; }
    get renderer() { return this.ctrl.renderer; }

    dispatch(tool, x, y, isDrag) {
        const tileKey = `${x}_${y}`;
        const existing = this.grid.getTile(x, y);

        if (existing?.stage === CONFIG.STAGES.ON_FIRE) return this.handleFirefight(tileKey, x, y);
        if (tool === CONFIG.TOOLS.BULLDOZER) return this.handleDemolish(tileKey, existing, x, y, isDrag);
        if (tool === CONFIG.TOOLS.ROAD || tool === CONFIG.TOOLS.STONE_ROAD) return this.handleRoadPlacement(tileKey, existing, x, y, tool, isDrag);
        if (tool === CONFIG.TOOLS.CANAL) return this.handleCanalPlacement(tileKey, existing, x, y, isDrag);
        if (tool === CONFIG.TOOLS.RAIL_TRACK) return this.handleRailPlacement(tileKey, existing, x, y, isDrag);
        if (tool === CONFIG.TOOLS.TREE_WILLOW) return this.handleTreePlacement(tileKey, existing, x, y, isDrag);
        if (this.handleMultiTilePloppables(tool, tileKey, x, y, isDrag)) return;
        if (this.handleSingleTileServices(tool, tileKey, existing, x, y)) return;
        this.handleZoning(tool, tileKey, existing, x, y, isDrag);
    }

    handleFirefight(tileKey, x, y) {
        const cost = CONFIG.COSTS.FIREFIGHT || 25;
        if (!this.state.deductTreasury(cost)) {
            this.state.showToast("Not enough funds for volunteer firefighting brigade!", true);
            return;
        }
        this.renderer.fx.detachFire(tileKey);
        const worldPos = this.renderer.getTileWorldPos(x, y);
        this.renderer.fx.spawnWaterSplash(worldPos.x, worldPos.z);
        SOUND.playWaterSplash();
        if (this.state.simulation?.extinguishFire) {
            this.state.simulation.extinguishFire(x, y);
        } else {
            const existing = this.grid.getTile(x, y);
            existing.stage = CONFIG.STAGES.BUILT;
            existing.fireTicks = 0;
            existing.threatTimer = 0;
            this.grid.notifyChange(x, y);
        }
        this.state.showToast(`町火消し! Volunteer brigade doused blaze at (${x}, ${y}) [-¥${cost}]`);
        this.ctrl.lastPaintedTile = tileKey;
    }

    handleDemolish(tileKey, existing, x, y, isDrag) {
        if (existing.type === CONFIG.TYPES.EMPTY) return;
        if (!this.state.deductTreasury(CONFIG.COSTS.BULLDOZE)) {
            this.state.showToast("Not enough funds to bulldoze!", true);
            return;
        }

        SOUND.playDemolish();
        const worldPos = this.renderer.getTileWorldPos(x, y);
        this.renderer.fx.spawnDemolishPuff(worldPos.x, worldPos.z);
        const wasBurned = existing.stage === CONFIG.STAGES.BURNED;
        if (existing.stage === CONFIG.STAGES.ON_FIRE) this.renderer.fx.detachFire(tileKey);

        const st = existing.serviceType;
        if (existing.type === CONFIG.TYPES.SERVICE) {
            if (st === CONFIG.SERVICES.SCHOOL && this.state.schoolSystem) this.state.schoolSystem.clearSchoolAt(x, y);
            else if (st === CONFIG.SERVICES.HARBOR_PIER && this.state.tradePierManager) this.state.tradePierManager.clearPierAt(x, y);
            else if (st === CONFIG.SERVICES.POWER_PLANT && this.state.powerSystem) this.state.powerSystem.clearPowerPlantAt(x, y);
            else if (st === CONFIG.SERVICES.WATERWORKS && this.state.sanitation) this.state.sanitation.clearWaterworksAt(x, y);
            else if (st === CONFIG.SERVICES.PAVILION && this.state.milestones) this.state.milestones.clearPavilionAt(x, y);
            else this.grid.clearTile(x, y);
        } else if (existing.type === CONFIG.TYPES.CANAL) {
            if (existing.hasBridge) {
                existing.hasBridge = false;
                delete existing.roadTier;
                this.grid.notifyChange(x, y);
            } else {
                this.grid.clearTile(x, y);
            }
        } else if (existing.type === CONFIG.TYPES.ZONE && existing.stage !== CONFIG.STAGES.NONE) {
            existing.occupied = false;
            existing.stage = CONFIG.STAGES.NONE;
            existing.level = 0;
            existing.ageTicks = 0;
            existing.threatTimer = 0;
            this.grid.notifyChange(x, y);
        } else {
            this.grid.clearTile(x, y);
        }

        this.ctrl.recordPlacement(tileKey, CONFIG.COSTS.BULLDOZE, wasBurned ? `Cleared ruins at (${x}, ${y})` : `Demolished tile (${x}, ${y})`, isDrag);
    }

    handleRoadPlacement(tileKey, existing, x, y, tool, isDrag) {
        const tier = tool === CONFIG.TOOLS.STONE_ROAD ? 2 : 1;
        const isStone = tier === 2;

        if (existing.type === CONFIG.TYPES.CANAL || existing.type === CONFIG.TYPES.RAIL) {
            const isCanal = existing.type === CONFIG.TYPES.CANAL;
            const hasCross = isCanal ? existing.hasBridge : existing.hasCrossing;
            if (!hasCross || existing.roadTier !== tier) {
                const cost = (hasCross && isStone) ? (CONFIG.COSTS.STONE_UPGRADE || 20) : (isStone ? CONFIG.COSTS.STONE_ROAD : CONFIG.COSTS.ROAD);
                if (this.state.deductTreasury(cost)) {
                    if (isCanal) existing.hasBridge = true; else existing.hasCrossing = true;
                    existing.roadTier = tier;
                    this.ctrl.lastPaintedTile = tileKey;
                    SOUND.playMalletClack();
                    this.grid.notifyChange(x, y);
                    this.state.showToast(isStone ? `Built stone crossing/bridge [-¥${cost}]` : `Built wooden crossing/bridge [-¥${cost}]`);
                } else {
                    this.state.showToast("Insufficient treasury for crossing!", true);
                }
            }
            return;
        }

        if (existing.occupied || existing.stage === CONFIG.STAGES.SCAFFOLDING || existing.stage === CONFIG.STAGES.BUILT) {
            this.state.showToast("Cannot lay road over occupied structures!", true);
            return;
        }

        if (existing.type !== CONFIG.TYPES.ROAD || existing.roadTier !== tier) {
            const isUpgrade = existing.type === CONFIG.TYPES.ROAD && isStone;
            const cost = isUpgrade ? (CONFIG.COSTS.STONE_UPGRADE || 20) : (isStone ? CONFIG.COSTS.STONE_ROAD : CONFIG.COSTS.ROAD);
            if (this.state.deductTreasury(cost)) {
                this.grid.setTile(x, y, CONFIG.TYPES.ROAD, null, 0, false, CONFIG.STAGES.NONE, tier);
                SOUND.playMalletClack();
                const label = isUpgrade ? `Upgraded to Stone Paving [-¥${cost}]` : (isStone ? `Constructed stone road [-¥${cost}]` : `Constructed dirt road [-¥${cost}]`);
                this.ctrl.recordPlacement(tileKey, cost, label, isDrag);
            } else {
                this.state.showToast("Insufficient treasury for road construction!", true);
            }
        }
    }

    handleCanalPlacement(tileKey, existing, x, y, isDrag) {
        if (existing.occupied || existing.stage === CONFIG.STAGES.SCAFFOLDING || existing.stage === CONFIG.STAGES.BUILT || existing.type === CONFIG.TYPES.SERVICE) {
            this.state.showToast("Cannot excavate canal over structures! Demolish first.", true);
            return;
        }
        if (existing.type === CONFIG.TYPES.ROAD) {
            if (this.state.deductTreasury(CONFIG.COSTS.CANAL)) {
                this.grid.setTile(x, y, CONFIG.TYPES.CANAL, null, 0, false, CONFIG.STAGES.NONE, existing.roadTier || 1, true);
                this.ctrl.lastPaintedTile = tileKey;
                SOUND.playMalletClack();
                this.state.showToast(`Excavated canal beneath road [-¥${CONFIG.COSTS.CANAL}]`);
            }
            return;
        }
        if (existing.type !== CONFIG.TYPES.CANAL && this.state.deductTreasury(CONFIG.COSTS.CANAL)) {
            this.grid.setTile(x, y, CONFIG.TYPES.CANAL, null, 0, false, CONFIG.STAGES.NONE, 1, false);
            SOUND.playMalletClack();
            this.ctrl.recordPlacement(tileKey, CONFIG.COSTS.CANAL, `Excavated canal [-¥${CONFIG.COSTS.CANAL}]`, isDrag);
        }
    }

    handleRailPlacement(tileKey, existing, x, y, isDrag) {
        if (existing.type === CONFIG.TYPES.ROAD) {
            if (this.state.deductTreasury(CONFIG.COSTS.RAIL)) {
                this.grid.setTile(x, y, CONFIG.TYPES.RAIL, null, 1, true, CONFIG.STAGES.BUILT, existing.roadTier || 1, false, null, 0, true);
                this.ctrl.lastPaintedTile = tileKey;
                SOUND.playMalletClack();
                this.state.showToast(`Laid rail across road [-¥${CONFIG.COSTS.RAIL}]`);
            }
            return;
        }
        if (existing.type !== CONFIG.TYPES.RAIL && this.state.deductTreasury(CONFIG.COSTS.RAIL)) {
            this.grid.setTile(x, y, CONFIG.TYPES.RAIL, null, 1, true, CONFIG.STAGES.BUILT);
            SOUND.playMalletClack();
            this.ctrl.recordPlacement(tileKey, CONFIG.COSTS.RAIL, `Laid rail track [-¥${CONFIG.COSTS.RAIL}]`, isDrag);
        }
    }

    handleTreePlacement(tileKey, existing, x, y, isDrag) {
        if (existing.type !== CONFIG.TYPES.PARK && this.state.deductTreasury(CONFIG.COSTS.CANAL_TREE)) {
            const isCanalAdj = this.grid.getNeighbors(x, y).some(n => n && n.type === CONFIG.TYPES.CANAL);
            const subType = isCanalAdj ? 'willow' : 'sakura';
            this.grid.setTile(x, y, CONFIG.TYPES.PARK, null, 1, true, CONFIG.STAGES.BUILT, 1, false, subType);
            SOUND.playMalletClack();
            this.ctrl.recordPlacement(tileKey, CONFIG.COSTS.CANAL_TREE, `Planted ${subType} tree [-¥${CONFIG.COSTS.CANAL_TREE}]`, isDrag);
        }
    }

    handleMultiTilePloppables(tool, tileKey, x, y, isDrag) {
        const rot = this.ctrl.placementRotation;
        if (tool === CONFIG.TOOLS.SCHOOL && this.state.schoolSystem?.placeSchool(x, y, rot)) {
            this.ctrl.lastPaintedTile = tileKey;
            return true;
        }
        if (tool === CONFIG.TOOLS.HARBOR_PIER && this.state.tradePierManager?.placePier(x, y, rot)) {
            this.ctrl.lastPaintedTile = tileKey;
            return true;
        }
        if (tool === CONFIG.TOOLS.RICE_PADDY && this.state.agriculture?.placePaddy(x, y, isDrag)) {
            this.ctrl.lastPaintedTile = tileKey;
            this.ctrl.recordPlacement(tileKey, CONFIG.COSTS.RICE_PADDY || 10, `Cultivated Rice Paddy`, isDrag);
            return true;
        }
        if (tool === CONFIG.TOOLS.POWER_PLANT && this.state.powerSystem?.placePowerPlant(x, y, rot)) {
            this.ctrl.lastPaintedTile = tileKey;
            return true;
        }
        if (tool === CONFIG.TOOLS.WATERWORKS && this.state.sanitation?.placeWaterworks(x, y, rot)) {
            this.ctrl.lastPaintedTile = tileKey;
            return true;
        }
        if (tool === CONFIG.TOOLS.PAVILION && this.state.milestones?.placePavilion(x, y, rot)) {
            this.ctrl.lastPaintedTile = tileKey;
            return true;
        }
        return false;
    }

    handleSingleTileServices(tool, tileKey, existing, x, y) {
        const services = [
            { tool: CONFIG.TOOLS.WATCHTOWER, type: CONFIG.SERVICES.WATCHTOWER, cost: CONFIG.COSTS.WATCHTOWER, name: 'Fire Watchtower' },
            { tool: CONFIG.TOOLS.FIRE_DEPOT, type: CONFIG.SERVICES.FIRE_DEPOT, cost: CONFIG.COSTS.FIRE_DEPOT, name: 'Fire Brigade Depot' },
            { tool: CONFIG.TOOLS.WELL, type: CONFIG.SERVICES.WELL, cost: CONFIG.COSTS.WELL, name: 'Communal Well' },
            { tool: CONFIG.TOOLS.OCHAYA, type: CONFIG.SERVICES.OCHAYA, cost: CONFIG.COSTS.OCHAYA, name: 'Teahouse' },
            { tool: CONFIG.TOOLS.SENTO, type: CONFIG.SERVICES.SENTO, cost: CONFIG.COSTS.SENTO, name: 'Bathhouse' },
            { tool: CONFIG.TOOLS.KOBAN, type: CONFIG.SERVICES.KOBAN, cost: CONFIG.COSTS.KOBAN || 110, name: 'Police Box' },
            { tool: CONFIG.TOOLS.SHRINE_PARK, type: CONFIG.SERVICES.SHRINE_PARK, cost: CONFIG.COSTS.SHRINE_PARK || 50, name: 'Shrine Park' },
            { tool: CONFIG.TOOLS.TRAIN_DEPOT, type: CONFIG.SERVICES.TRAIN_DEPOT, cost: CONFIG.COSTS.TRAIN_DEPOT || 350, name: 'Train Depot' },
            { tool: CONFIG.TOOLS.TELEGRAPH, type: CONFIG.SERVICES.TELEGRAPH, cost: CONFIG.COSTS.TELEGRAPH || 220, name: 'Telegraph Office' },
            { tool: CONFIG.TOOLS.SUIMON, type: CONFIG.SERVICES.SUIMON, cost: CONFIG.COSTS.SUIMON || 180, name: 'Watergate Sluice' },
        ];

        const s = services.find(item => item.tool === tool);
        if (!s) return false;

        if (existing.occupied || existing.type === CONFIG.TYPES.ROAD || existing.type === CONFIG.TYPES.SERVICE || existing.type === CONFIG.TYPES.RAIL || existing.type === CONFIG.TYPES.CANAL) {
            this.state.showToast(`Cannot build ${s.name} on occupied land!`, true);
            return true;
        }

        if (this.state.deductTreasury(s.cost)) {
            this.grid.setTile(x, y, CONFIG.TYPES.SERVICE, null, 1, true, CONFIG.STAGES.BUILT, 1, false, null, this.ctrl.placementRotation);
            const tile = this.grid.getTile(x, y);
            tile.serviceType = s.type;
            tile.rotation = this.ctrl.placementRotation;
            this.grid.notifyChange(x, y);
            SOUND.playBellChime();
            this.ctrl.lastPaintedTile = tileKey;
            this.state.showToast(`Erected ${s.name}! [-¥${s.cost}]`);
        } else {
            this.state.showToast(`Insufficient treasury for ${s.name}!`, true);
        }
        return true;
    }

    handleZoning(tool, tileKey, existing, x, y, isDrag) {
        const zoneMap = {
            [CONFIG.TOOLS.RESIDENTIAL]: { zone: CONFIG.ZONES.RESIDENTIAL, cost: CONFIG.COSTS.RESIDENTIAL, label: 'Machiya (Residential)' },
            [CONFIG.TOOLS.COMMERCIAL]: { zone: CONFIG.ZONES.COMMERCIAL, cost: CONFIG.COSTS.COMMERCIAL, label: 'Shouten (Commercial)' },
            [CONFIG.TOOLS.INDUSTRIAL]: { zone: CONFIG.ZONES.INDUSTRIAL, cost: CONFIG.COSTS.INDUSTRIAL, label: 'Workshop (Industrial)' },
        };
        const z = zoneMap[tool];
        if (z && (existing.type !== CONFIG.TYPES.ZONE || existing.zoneType !== z.zone)) {
            if (this.state.deductTreasury(z.cost)) {
                this.grid.setTile(x, y, CONFIG.TYPES.ZONE, z.zone, 0, false, CONFIG.STAGES.NONE);
                SOUND.playMalletClack();
                if (isDrag && this.ctrl.dragBatch) this.ctrl.dragBatch.label = z.label;
                this.ctrl.recordPlacement(tileKey, z.cost, `Platted ${z.label} [-¥${z.cost}]`, isDrag);
            } else {
                this.state.showToast(`Insufficient treasury for ${z.label}!`, true);
            }
        }
    }
}
