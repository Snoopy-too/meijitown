// Project Meiji - Economic Simulation & Taxation Engine
// ponytail: deterministic monthly cashflow, tiered taxation & maintenance balance

import { CONFIG } from '../config.js';

export class EconomySystem {
    constructor(gridModel, stateManager, happinessSystem = null) {
        this.grid = gridModel;
        this.state = stateManager;
        this.happiness = happinessSystem;
    }

    // Check if tile has an adjacent Stone Paved Road (Tier 2)
    hasAdjacentStoneRoad(x, y) {
        const neighbors = [
            { x: x + 1, y }, { x: x - 1, y },
            { x, y: y + 1 }, { x, y: y - 1 }
        ];
        for (const n of neighbors) {
            if (this.grid.isValidCoord(n.x, n.y)) {
                const t = this.grid.getTile(n.x, n.y);
                if (t && t.type === CONFIG.TYPES.ROAD && t.roadTier === 2) {
                    return true;
                }
            }
        }
        return false;
    }

    processEconomy() {
        const counts = this.grid.getBuildingCounts();

        let watchtowerCount = 0;
        let fireDepotCount = 0;
        let wellCount = 0;
        let ochayaCount = 0;
        let sentoCount = 0;
        let kobanCount = 0;
        let trainDepotCount = 0;
        let schoolCount = 0;
        let telegraphCount = 0;
        let harborPierCount = 0;
        let powerPlantCount = 0;
        let waterworksCount = 0;
        let suimonCount = 0;
        let pavilionCount = 0;
        let dirtRoadCount = 0;
        let stoneRoadCount = 0;
        let railCount = 0;
        let canalCount = 0;
        let stoneRoadCommercialBonus = 0;
        let kobanCommercialBonus = 0;
        let orderDeficitPenalty = 0;
        let educationDeficitPenalty = 0;

        for (const [_, tile] of this.grid.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.ROAD) {
                if (tile.roadTier === 2) {
                    stoneRoadCount++;
                } else {
                    dirtRoadCount++;
                }
            } else if (tile.type === CONFIG.TYPES.RAIL) {
                railCount++;
            } else if (tile.type === CONFIG.TYPES.CANAL) {
                canalCount++;
            } else if (tile.type === CONFIG.TYPES.SERVICE) {
                if (tile.serviceType === CONFIG.SERVICES.WATCHTOWER) watchtowerCount++;
                else if (tile.serviceType === CONFIG.SERVICES.FIRE_DEPOT) fireDepotCount++;
                else if (tile.serviceType === CONFIG.SERVICES.WELL) wellCount++;
                else if (tile.serviceType === CONFIG.SERVICES.OCHAYA) ochayaCount++;
                else if (tile.serviceType === CONFIG.SERVICES.SENTO) sentoCount++;
                else if (tile.serviceType === CONFIG.SERVICES.KOBAN) kobanCount++;
                else if (tile.serviceType === CONFIG.SERVICES.TRAIN_DEPOT) trainDepotCount++;
                else if (tile.serviceType === CONFIG.SERVICES.SCHOOL && tile.isOrigin) schoolCount++;
                else if (tile.serviceType === CONFIG.SERVICES.TELEGRAPH) telegraphCount++;
                else if (tile.serviceType === CONFIG.SERVICES.HARBOR_PIER && tile.isOrigin) harborPierCount++;
                else if (tile.serviceType === CONFIG.SERVICES.POWER_PLANT && tile.isOrigin) powerPlantCount++;
                else if (tile.serviceType === CONFIG.SERVICES.WATERWORKS && tile.isOrigin) waterworksCount++;
                else if (tile.serviceType === CONFIG.SERVICES.SUIMON) suimonCount++;
                else if (tile.serviceType === CONFIG.SERVICES.PAVILION && tile.isOrigin && tile.stage === CONFIG.STAGES.BUILT) pavilionCount++;
            } else if (tile.type === CONFIG.TYPES.ZONE && tile.zoneType === CONFIG.ZONES.COMMERCIAL && tile.stage === CONFIG.STAGES.BUILT) {
                const baseTax = tile.level >= 4 ? (CONFIG.SIMULATION.TAX_COMMERCIAL_L4 || 70) :
                                (tile.level >= 3 ? (CONFIG.SIMULATION.TAX_COMMERCIAL_L3 || 45) :
                                (tile.level >= 2 ? CONFIG.SIMULATION.TAX_COMMERCIAL_L2 : CONFIG.SIMULATION.TAX_COMMERCIAL_L1));
                // Stone Road Tier 2 boosts commercial land value and revenue by +25%
                if (this.hasAdjacentStoneRoad(tile.x, tile.y)) {
                    stoneRoadCommercialBonus += Math.round(baseTax * 0.25);
                }
                // Kōban Public Order boosts commercial revenue / satisfaction by +10%
                const isOrderCovered = this.happiness && this.happiness.isOrderCovered(tile.x, tile.y);
                if (isOrderCovered) {
                    kobanCommercialBonus += Math.round(baseTax * 0.10);
                } else if (tile.level >= 2) {
                    // Expectation Deficit: Unpatrolled commercial district suffers street crime and robberies
                    const penaltyRate = tile.level >= 3 ? 0.30 : 0.15;
                    orderDeficitPenalty += Math.round(baseTax * penaltyRate);
                }

                // Expectation Deficit: Level 3+ modern commercial arcades require literate clerks & accounting
                const hasEdu = (this.state.schoolSystem && typeof this.state.schoolSystem.isEducationCovered === 'function')
                    ? (this.state.schoolSystem.isEducationCovered(tile.x, tile.y) || this.state.schoolSystem.isSchoolAdjacent(tile.x, tile.y))
                    : false;
                if (!hasEdu && tile.level >= 3) {
                    educationDeficitPenalty += Math.round(baseTax * 0.20);
                }
            }
        }

        const resTax =
            (counts.resL1 * CONFIG.SIMULATION.TAX_RESIDENTIAL_L1) +
            (counts.resL2 * CONFIG.SIMULATION.TAX_RESIDENTIAL_L2) +
            ((counts.resL3 || 0) * (CONFIG.SIMULATION.TAX_RESIDENTIAL_L3 || 18));

        let comTax =
            (counts.comL1 * CONFIG.SIMULATION.TAX_COMMERCIAL_L1) +
            (counts.comL2 * CONFIG.SIMULATION.TAX_COMMERCIAL_L2) +
            ((counts.comL3 || 0) * (CONFIG.SIMULATION.TAX_COMMERCIAL_L3 || 45)) +
            ((counts.comL4 || 0) * (CONFIG.SIMULATION.TAX_COMMERCIAL_L4 || 70)) +
            stoneRoadCommercialBonus +
            kobanCommercialBonus -
            orderDeficitPenalty -
            educationDeficitPenalty;

        comTax = Math.max(0, comTax);

        // Policy: Night Fire Watch dampens night commercial revenue by -5%
        if (this.state.policies && typeof this.state.policies.isNightWatchActive === 'function' && this.state.policies.isNightWatchActive()) {
            comTax = Math.round(comTax * 0.95);
        }

        const indL1 = counts.indL1 !== undefined ? counts.indL1 : counts.industrial;
        const indL2 = counts.indL2 !== undefined ? counts.indL2 : 0;
        const indTax = (indL1 * CONFIG.SIMULATION.TAX_INDUSTRIAL_L1) +
                       (indL2 * (CONFIG.SIMULATION.TAX_INDUSTRIAL_L2 || 38));

        // Autumn Rice Harvest Yield (+¥20 per irrigated paddy tile)
        const harvestYield = (this.state.agriculture && typeof this.state.agriculture.calculateHarvestYield === 'function')
            ? this.state.agriculture.calculateHarvestYield(this.state.currentMonth)
            : 0;

        // Maritime Export Dividends (+¥150 to +¥400 per active connected pier)
        const maritimeDividends = (this.state.tradePierManager && typeof this.state.tradePierManager.calculateTotalMonthlyDividends === 'function')
            ? this.state.tradePierManager.calculateTotalMonthlyDividends(this.state.currentMonth)
            : 0;

        let totalTax = resTax + comTax + indTax + harvestYield + maritimeDividends;
        const happiness = this.state.metrics.townHappiness !== undefined ? this.state.metrics.townHappiness : (CONFIG.SIMULATION.DEFAULT_HAPPINESS || 65);
        if (happiness > 75) {
            totalTax = Math.round(totalTax * 1.10);
        }

        const dirtMaintenance = dirtRoadCount * CONFIG.SIMULATION.ROAD_MAINTENANCE;
        const stoneMaintenance = stoneRoadCount * (CONFIG.SIMULATION.STONE_ROAD_MAINTENANCE || 2);
        const roadMaintenance = dirtMaintenance + stoneMaintenance;
        const railMaintenance = railCount * (CONFIG.SIMULATION.RAIL_MAINTENANCE || 1);
        const canalMaintenance = canalCount * (CONFIG.SIMULATION.CANAL_MAINTENANCE || 1);
        const infraMaintenance = roadMaintenance + railMaintenance + canalMaintenance;

        const civicUpkeep = (watchtowerCount * CONFIG.SIMULATION.WATCHTOWER_MAINTENANCE) +
                            (fireDepotCount * (CONFIG.SIMULATION.FIRE_DEPOT_MAINTENANCE || 5)) +
                            (wellCount * (CONFIG.SIMULATION.WELL_MAINTENANCE || 1)) +
                            (ochayaCount * (CONFIG.SIMULATION.OCHAYA_MAINTENANCE || 3)) +
                            (sentoCount * (CONFIG.SIMULATION.SENTO_MAINTENANCE || 2)) +
                            (kobanCount * (CONFIG.SIMULATION.KOBAN_MAINTENANCE || 3)) +
                            (trainDepotCount * (CONFIG.SIMULATION.TRAIN_DEPOT_MAINTENANCE || 30)) +
                            (schoolCount * (CONFIG.SIMULATION.SCHOOL_MAINTENANCE || 20)) +
                            (telegraphCount * (CONFIG.SIMULATION.TELEGRAPH_MAINTENANCE || 6)) +
                            (harborPierCount * (CONFIG.SIMULATION.HARBOR_PIER_MAINTENANCE || 35)) +
                            (powerPlantCount * (CONFIG.SIMULATION.POWER_PLANT_MAINTENANCE || 75)) +
                            (waterworksCount * (CONFIG.SIMULATION.WATERWORKS_MAINTENANCE || 45)) +
                            (suimonCount * (CONFIG.SIMULATION.SUIMON_MAINTENANCE || 4)) +
                            (pavilionCount * (CONFIG.SIMULATION.PAVILION_MAINTENANCE || 50));

        // Policy Upkeep (Night Watch: ¥15/mo, Clean Water: ¥10/mo)
        const policyUpkeep = (this.state.policies && typeof this.state.policies.getMonthlyFiscalImpact === 'function')
            ? this.state.policies.getMonthlyFiscalImpact()
            : 0;

        const netIncome = totalTax - (infraMaintenance + civicUpkeep + policyUpkeep);

        this.state.treasury += netIncome;
        this.state.lastCashflow = netIncome;
        this.state.lastBudget = {
            totalTax,
            resTax,
            comTax,
            indTax,
            orderDeficitPenalty,
            educationDeficitPenalty,
            harvestYield,
            maritimeDividends,
            infraMaintenance,
            roadMaintenance,
            railMaintenance,
            canalMaintenance,
            civicUpkeep,
            policyUpkeep,
            netIncome
        };

        // Municipal Historical Stats Tracking
        if (!this.state.stats) this.state.stats = {};
        this.state.stats.totalTaxesCollected = (this.state.stats.totalTaxesCollected || 0) + totalTax;
        this.state.stats.peakPopulation = Math.max(this.state.stats.peakPopulation || 0, this.state.population || 0);

        if (harvestYield > 0 && this.state.currentMonth === 10) {
            this.state.showToast(`🌾 Autumn Rice Harvest! +¥${harvestYield} tax revenue collected.`);
        }
        if (maritimeDividends > 0 && this.state.showToast) {
            const season = (this.state.currentMonth >= 9 && this.state.currentMonth <= 11) ? 'Autumn Harvest Trade' : 'Maritime Trade Export';
            this.state.showToast(`🚢 ${season}! +¥${maritimeDividends} trade dividend collected.`);
        }

        // Low happiness (<40%) triggers abandonment (prevented by Kōban public order)
        if (happiness < 40) {
            for (const [_, tile] of this.grid.tiles.entries()) {
                if (tile.type === CONFIG.TYPES.ZONE && tile.zoneType === CONFIG.ZONES.RESIDENTIAL && tile.stage === CONFIG.STAGES.BUILT) {
                    if (this.happiness && this.happiness.isOrderCovered(tile.x, tile.y)) {
                        continue; // Public Order secures block against abandonment
                    }
                    if (Math.random() < 0.20) {
                        tile.stage = CONFIG.STAGES.NONE;
                        tile.occupied = false;
                        tile.ageTicks = 0;
                        const popLoss = tile.level >= 2 ? (CONFIG.SIMULATION.POP_GAIN_L2 || 10) : (CONFIG.SIMULATION.POP_PER_RESIDENCE_L1 || 8);
                        this.state.population = Math.max(0, this.state.population - popLoss);
                        this.grid.notifyChange(tile.x, tile.y);
                        this.state.showToast(`🏚️ Squalor alert! Citizens abandoned home at (${tile.x}, ${tile.y}) [-${popLoss} pop]`, true);
                        break;
                    }
                }
            }
        }

        return netIncome;
    }
}
