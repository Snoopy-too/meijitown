// Project Meiji - Tools & Player Interactions Controller
// ponytail: pointer & touch gesture routing, drag-batching, placement validation & delegation (< 250 lines)

import { CONFIG } from './config.js';
import { bindKeyboardHotkeys } from './ui/keyboard_router.js';
import { ToolActionDispatcher } from './toolActionDispatcher.js';
import { i18n } from './i18n.js';
import { TOOL_TIER_REQUIREMENTS } from './ui/build_drawer.js';
import { isFootprintClear } from './footprintPreview.js';

export class ToolController {
    constructor(gridModel, renderer, stateManager, buildDrawer) {
        this.grid = gridModel;
        this.renderer = renderer;
        this.state = stateManager;
        this.drawer = buildDrawer;
        this.dispatcher = new ToolActionDispatcher(this);

        this.currentTool = CONFIG.TOOLS.INSPECT;
        this.placementRotation = 0;
        this.lastHoverCoord = null;
        this.isPainting = false;
        this.lastPaintedTile = null;
        this.dragBatch = null;
        this.paintedInBatch = new Set();

        this.bindEvents();
    }

    rotatePlacement() {
        this.placementRotation = (this.placementRotation + 1) % 4;
        const dirKeys = ['dir.north', 'dir.east', 'dir.south', 'dir.west'];
        const dirStr = i18n.t(dirKeys[this.placementRotation]);
        this.state.showToast(i18n.getLanguage() === 'ja' ? `配置方角: ${dirStr}` : `Orientation: ${dirStr}`);
        if (this.drawer && typeof this.drawer.updateRotateBtn === 'function') {
            this.drawer.updateRotateBtn(this.placementRotation);
        }
        if (this.lastHoverCoord) {
            const isValid = this.checkPlacementValid(this.lastHoverCoord.x, this.lastHoverCoord.y);
            this.renderer.updateCursor(this.lastHoverCoord, this.currentTool, isValid, this.placementRotation);
        }
        return this.placementRotation;
    }

    setActiveTool(toolName, updateDrawer = true) {
        const tierReq = TOOL_TIER_REQUIREMENTS[toolName];
        const currentTier = this.state?.milestones?.currentTier || this.state?.milestoneManager?.currentTier || 1;
        if (tierReq && currentTier < tierReq.tier) {
            const isJa = i18n.getLanguage() === 'ja';
            this.state?.showToast(isJa
                ? `第${tierReq.tier}段階 (人口 ${tierReq.pop}名) 到達まで未開放`
                : `Locked until Tier ${tierReq.tier} (Pop ${tierReq.pop})!`, true);
            return;
        }

        this.currentTool = toolName;
        this.placementRotation = 0;
        if (this.drawer && typeof this.drawer.updateRotateBtn === 'function') {
            this.drawer.updateRotateBtn(this.placementRotation);
        }
        const isBuild = toolName !== CONFIG.TOOLS.INSPECT;
        this.renderer.setBuildMode(isBuild);

        if (updateDrawer && this.drawer) {
            this.drawer.selectTool(toolName);
        }
    }

    updateDragBadge(clientX, clientY) {
        const badge = this.state.dom ? this.state.dom.dragBadge : null;
        if (!badge) return;

        if (clientX !== undefined && clientY !== undefined) {
            badge.style.left = `${clientX}px`;
            badge.style.top = `${clientY}px`;
        }

        if (this.isPainting && this.dragBatch && this.dragBatch.count > 0) {
            const isRoad = this.currentTool === CONFIG.TOOLS.ROAD || this.currentTool === CONFIG.TOOLS.STONE_ROAD;
            const prefix = isRoad ? 'Length' : 'Tiles';
            badge.textContent = `${prefix}: ${this.dragBatch.count} | Cost: ¥${this.dragBatch.cost}`;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }

    recordPlacement(tileKey, cost, toastMsg, isDrag) {
        this.lastPaintedTile = tileKey;
        if (isDrag && this.dragBatch) {
            this.paintedInBatch.add(tileKey);
            this.dragBatch.count++;
            this.dragBatch.cost += cost;
            this.updateDragBadge();
        } else if (toastMsg) {
            this.state.showToast(toastMsg);
        }
    }

    bindEvents() {
        const dom = this.renderer.renderer.domElement;

        dom.addEventListener('pointermove', (e) => {
            this.updateDragBadge(e.clientX, e.clientY);

            const tileCoord = this.renderer.raycastTile(e.clientX, e.clientY);
            this.lastHoverCoord = tileCoord;
            if (tileCoord) {
                const isValid = this.checkPlacementValid(tileCoord.x, tileCoord.y);
                this.renderer.updateCursor(tileCoord, this.currentTool, isValid, this.placementRotation);

                if (this.isPainting) {
                    this.applyTool(tileCoord.x, tileCoord.y, true);
                }
            } else {
                this.renderer.updateCursor(null, this.currentTool, false, this.placementRotation);
            }
        });

        dom.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;

            const tileCoord = this.renderer.raycastTile(e.clientX, e.clientY);
            if (tileCoord) {
                const existing = this.grid.getTile(tileCoord.x, tileCoord.y);

                if (existing && existing.stage === CONFIG.STAGES.ON_FIRE) {
                    this.applyTool(tileCoord.x, tileCoord.y, false);
                    return;
                }

                if (this.currentTool !== CONFIG.TOOLS.INSPECT) {
                    this.isPainting = true;
                    this.dragBatch = { count: 0, cost: 0, tool: this.currentTool, label: '' };
                    this.paintedInBatch = new Set();
                    this.updateDragBadge(e.clientX, e.clientY);
                    this.applyTool(tileCoord.x, tileCoord.y, true);
                } else {
                    this.state.updateInspector(tileCoord.x, tileCoord.y, true);
                }
            }
        });

        const stopPaint = () => {
            if (this.dragBatch && this.dragBatch.count > 0) {
                if (this.dragBatch.tool === CONFIG.TOOLS.ROAD) {
                    this.state.showToast(`Built ${this.dragBatch.count} dirt road tiles [-¥${this.dragBatch.cost}]`);
                } else if (this.dragBatch.tool === CONFIG.TOOLS.STONE_ROAD) {
                    this.state.showToast(`Paved ${this.dragBatch.count} stone road tiles [-¥${this.dragBatch.cost}]`);
                } else if (this.dragBatch.tool === CONFIG.TOOLS.BULLDOZER) {
                    this.state.showToast(`Demolished ${this.dragBatch.count} tiles [-¥${this.dragBatch.cost}]`);
                } else if (this.dragBatch.label) {
                    this.state.showToast(`Platted ${this.dragBatch.count} ${this.dragBatch.label} [-¥${this.dragBatch.cost}]`);
                }
            }
            this.isPainting = false;
            this.lastPaintedTile = null;
            this.dragBatch = null;
            this.paintedInBatch.clear();
            this.updateDragBadge();
        };

        window.addEventListener('pointerup', stopPaint);
        window.addEventListener('pointercancel', stopPaint);
        dom.addEventListener('pointerleave', stopPaint);

        bindKeyboardHotkeys(this, this.state, this.renderer);
    }

    checkPlacementValid(x, y) {
        if (!this.grid.isValidCoord(x, y)) return false;
        if (this.currentTool === CONFIG.TOOLS.INSPECT) return true;

        const tierReq = TOOL_TIER_REQUIREMENTS[this.currentTool];
        const currentTier = this.state?.milestones?.currentTier || this.state?.milestoneManager?.currentTier || 1;
        if (tierReq && currentTier < tierReq.tier) return false;

        const multiTools = [CONFIG.TOOLS.SCHOOL, CONFIG.TOOLS.HARBOR_PIER, CONFIG.TOOLS.POWER_PLANT, CONFIG.TOOLS.WATERWORKS, CONFIG.TOOLS.PAVILION];
        if (multiTools.includes(this.currentTool) && !isFootprintClear(this.grid, x, y, this.currentTool, this.placementRotation)) {
            return false;
        }

        const existing = this.grid.getTile(x, y);

        if (existing && existing.stage === CONFIG.STAGES.ON_FIRE) {
            return this.state.treasury >= (CONFIG.COSTS.FIREFIGHT || 25);
        }

        if (this.currentTool === CONFIG.TOOLS.BULLDOZER) {
            return existing.type !== CONFIG.TYPES.EMPTY;
        }

        if (this.currentTool === CONFIG.TOOLS.ROAD || this.currentTool === CONFIG.TOOLS.STONE_ROAD) {
            const tier = this.currentTool === CONFIG.TOOLS.STONE_ROAD ? 2 : 1;
            const isUpgrade = (existing.type === CONFIG.TYPES.ROAD && tier === 2) || (existing.hasBridge && tier === 2) || (existing.hasCrossing && tier === 2);
            const cost = isUpgrade ? (CONFIG.COSTS.STONE_UPGRADE || 20) : (tier === 2 ? CONFIG.COSTS.STONE_ROAD : CONFIG.COSTS.ROAD);
            if (existing.type === CONFIG.TYPES.CANAL) return (!existing.hasBridge || existing.roadTier !== tier) && this.state.treasury >= cost;
            if (existing.type === CONFIG.TYPES.RAIL) return (!existing.hasCrossing || existing.roadTier !== tier) && this.state.treasury >= cost;
            if (existing.type === CONFIG.TYPES.ROAD && existing.roadTier === tier) return false;
            if (existing.type === CONFIG.TYPES.SERVICE || existing.occupied || existing.stage === CONFIG.STAGES.SCAFFOLDING || existing.stage === CONFIG.STAGES.BUILT) return false;
            return this.state.treasury >= cost;
        }

        if (this.currentTool === CONFIG.TOOLS.CANAL) {
            if (existing.type === CONFIG.TYPES.CANAL) return false;
            if (existing.occupied || existing.type === CONFIG.TYPES.SERVICE) return false;
            if (existing.stage === CONFIG.STAGES.SCAFFOLDING || existing.stage === CONFIG.STAGES.BUILT) return false;
            return this.state.treasury >= (CONFIG.COSTS.CANAL || 15);
        }

        // Multi-tile ploppables check
        if (this.currentTool === CONFIG.TOOLS.SCHOOL) {
            return this.state.schoolSystem
                ? (this.state.schoolSystem.canPlaceSchool(x, y) && this.state.treasury >= (CONFIG.COSTS.SCHOOL || 280))
                : (this.state.treasury >= (CONFIG.COSTS.SCHOOL || 280));
        }
        if (this.currentTool === CONFIG.TOOLS.HARBOR_PIER) {
            const hasTech = !this.state.milestones || this.state.milestones.currentTier >= 3 || (this.state.population && this.state.population >= 300);
            if (!hasTech) return false;
            return this.state.tradePierManager
                ? (this.state.tradePierManager.canPlacePier(x, y) && this.state.treasury >= (CONFIG.COSTS.HARBOR_PIER || 450))
                : (this.state.treasury >= (CONFIG.COSTS.HARBOR_PIER || 450));
        }
        if (this.currentTool === CONFIG.TOOLS.POWER_PLANT) {
            return this.state.powerSystem
                ? (this.state.powerSystem.canPlacePowerPlant(x, y) && this.state.treasury >= (CONFIG.COSTS.POWER_PLANT || 600))
                : (this.state.treasury >= (CONFIG.COSTS.POWER_PLANT || 600));
        }
        if (this.currentTool === CONFIG.TOOLS.WATERWORKS) {
            return this.state.sanitation
                ? (this.state.sanitation.canPlaceWaterworks(x, y) && this.state.treasury >= (CONFIG.COSTS.WATERWORKS || 350))
                : (this.state.treasury >= (CONFIG.COSTS.WATERWORKS || 350));
        }
        if (this.currentTool === CONFIG.TOOLS.PAVILION) {
            return this.state.milestones
                ? (this.state.milestones.canPlacePavilion(x, y) && this.state.treasury >= (CONFIG.COSTS.PAVILION || 2000))
                : (this.state.treasury >= (CONFIG.COSTS.PAVILION || 2000));
        }

        if (this.currentTool === CONFIG.TOOLS.RICE_PADDY) {
            if (existing.occupied || existing.type === CONFIG.TYPES.ROAD || existing.type === CONFIG.TYPES.SERVICE || existing.type === CONFIG.TYPES.CANAL || existing.type === CONFIG.TYPES.RAIL) return false;
            return this.state.treasury >= (CONFIG.COSTS.RICE_PADDY || 10);
        }

        if (this.currentTool === CONFIG.TOOLS.RAIL_TRACK) {
            if (existing.type === CONFIG.TYPES.RAIL) return false;
            if (existing.type === CONFIG.TYPES.ROAD) return this.state.treasury >= (CONFIG.COSTS.RAIL || 20);
            if (existing.occupied || existing.type === CONFIG.TYPES.SERVICE || existing.type === CONFIG.TYPES.CANAL) return false;
            return this.state.treasury >= (CONFIG.COSTS.RAIL || 20);
        }

        if (this.currentTool === CONFIG.TOOLS.TREE_WILLOW) {
            if (existing.type === CONFIG.TYPES.PARK) return false;
            if (existing.occupied || existing.type === CONFIG.TYPES.ROAD || existing.type === CONFIG.TYPES.SERVICE || existing.type === CONFIG.TYPES.CANAL || existing.type === CONFIG.TYPES.RAIL) return false;
            return this.state.treasury >= (CONFIG.COSTS.CANAL_TREE || 15);
        }

        const serviceCosts = {
            [CONFIG.TOOLS.WATCHTOWER]: CONFIG.COSTS.WATCHTOWER,
            [CONFIG.TOOLS.FIRE_DEPOT]: CONFIG.COSTS.FIRE_DEPOT,
            [CONFIG.TOOLS.WELL]: CONFIG.COSTS.WELL,
            [CONFIG.TOOLS.OCHAYA]: CONFIG.COSTS.OCHAYA,
            [CONFIG.TOOLS.SENTO]: CONFIG.COSTS.SENTO,
            [CONFIG.TOOLS.KOBAN]: CONFIG.COSTS.KOBAN || 110,
            [CONFIG.TOOLS.SHRINE_PARK]: CONFIG.COSTS.SHRINE_PARK || 50,
            [CONFIG.TOOLS.TRAIN_DEPOT]: CONFIG.COSTS.TRAIN_DEPOT || 350,
            [CONFIG.TOOLS.TELEGRAPH]: CONFIG.COSTS.TELEGRAPH || 220,
            [CONFIG.TOOLS.SUIMON]: CONFIG.COSTS.SUIMON || 180,
        };
        if (serviceCosts[this.currentTool] !== undefined) {
            if (existing.occupied || existing.type === CONFIG.TYPES.ROAD || existing.type === CONFIG.TYPES.SERVICE || existing.type === CONFIG.TYPES.CANAL || existing.type === CONFIG.TYPES.RAIL) return false;
            return this.state.treasury >= serviceCosts[this.currentTool];
        }

        const zoneCosts = {
            [CONFIG.TOOLS.RESIDENTIAL]: { zone: CONFIG.ZONES.RESIDENTIAL, cost: CONFIG.COSTS.RESIDENTIAL },
            [CONFIG.TOOLS.COMMERCIAL]: { zone: CONFIG.ZONES.COMMERCIAL, cost: CONFIG.COSTS.COMMERCIAL },
            [CONFIG.TOOLS.INDUSTRIAL]: { zone: CONFIG.ZONES.INDUSTRIAL, cost: CONFIG.COSTS.INDUSTRIAL },
        };
        if (zoneCosts[this.currentTool]) {
            const z = zoneCosts[this.currentTool];
            if (existing.type === CONFIG.TYPES.ROAD || existing.type === CONFIG.TYPES.SERVICE || existing.type === CONFIG.TYPES.CANAL) return false;
            if (existing.type === CONFIG.TYPES.ZONE && existing.zoneType === z.zone) return false;
            return this.state.treasury >= z.cost;
        }

        return true;
    }

    applyTool(x, y, isDrag = false) {
        const tileKey = `${x}_${y}`;
        if (this.lastPaintedTile === tileKey) return;
        if (isDrag && this.paintedInBatch.has(tileKey)) return;

        this.dispatcher.dispatch(this.currentTool, x, y, isDrag);
    }
}
