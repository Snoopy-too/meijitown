// Project Meiji - Autonomous Simulation & Growth Engine
// ponytail: modular domain composition, RCI demand curves, upgrade evaluation & construction lifecycle

import { CONFIG } from './config.js';
import { DisasterSimulation } from './disaster.js';
import { TimeManager } from './simulation/time_manager.js';
import { SanitationSystem } from './simulation/sanitation_system.js';
import { HappinessSystem } from './simulation/happiness_system.js';
import { EconomySystem } from './simulation/economy_system.js';
import { SchoolSystem } from './schoolSystem.js';
import { AgricultureManager } from './agricultureManager.js';
import { TelegraphSystem } from './telegraphSystem.js';
import { TradePierManager } from './tradePierManager.js';
import { PowerSystem } from './powerSystem.js';
import { LeisureSystem } from './simulation/leisureSystem.js';
import { TyphoonManager } from './disaster/typhoonManager.js';

export class SimulationEngine {
    constructor(gridModel, stateManager) {
        this.grid = gridModel;
        this.state = stateManager;

        // Subsystems
        this.time = new TimeManager(this.state, () => this.tick());
        this.sanitation = new SanitationSystem(this.grid, this.state);
        this.telegraph = new TelegraphSystem(this.grid, this.state);
        this.powerSystem = new PowerSystem(this.grid, this.state);
        this.disaster = new DisasterSimulation(this.grid, this.state, this);
        this.leisure = new LeisureSystem(this.grid, this.state);
        this.happiness = new HappinessSystem(this.grid, this.state, this.sanitation, this.disaster);
        this.happiness.leisure = this.leisure;
        this.economy = new EconomySystem(this.grid, this.state, this.happiness);
        this.schoolSystem = new SchoolSystem(this.grid, this.state);
        this.agriculture = new AgricultureManager(this.grid, this.state);
        this.tradePier = new TradePierManager(this.grid, this.state);
        this.typhoon = new TyphoonManager(this.grid, this.state, this, this.state?.renderer?.scene);
        this.state.leisureSystem = this.leisure;
        this.state.schoolSystem = this.schoolSystem;
        this.state.agriculture = this.agriculture;
        this.state.telegraph = this.telegraph;
        this.state.powerSystem = this.powerSystem;
        this.state.tradePierManager = this.tradePier;
        this.state.typhoonManager = this.typhoon;
        if (this.state.renderer && this.state.renderer.lighting) {
            this.state.renderer.lighting.setPowerSystem(this.powerSystem);
        }
    }

    // --- TimeManager Delegation ---
    get isRunning() { return this.time.isRunning; }
    get speedMultiplier() { return this.time.speedMultiplier; }
    setSpeed(m) { this.time.setSpeed(m); }
    start() { this.time.start(); }
    pause() { this.time.pause(); }
    toggle() { return this.time.toggle(); }

    // --- Sanitation, Happiness & Education Delegation ---
    isWellCovered(x, y) { return this.sanitation.isWellCovered(x, y); }
    isOchayaCovered(x, y) { return this.happiness.isOchayaCovered(x, y); }
    isSentoCovered(x, y) { return this.happiness.isSentoCovered(x, y); }
    isShrineCovered(x, y) { return this.leisure.isShrineCovered(x, y); }
    isOrderCovered(x, y) { return this.happiness.isOrderCovered(x, y); }
    isEducationCovered(x, y) { return this.schoolSystem.isEducationCovered(x, y); }
    isEntertainmentCovered(x, y) { return this.happiness.isEntertainmentCovered(x, y); }
    getResidentialHappiness(tile, y) { return this.happiness.getResidentialHappiness(tile, y); }
    calculateTownHappiness() { return this.happiness.calculateTownHappiness(); }

    // --- Disaster Delegation ---
    isWatchtowerCovered(x, y) {
        for (const [_, tile] of this.grid.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.SERVICE && tile.serviceType === CONFIG.SERVICES.WATCHTOWER) {
                if (Math.hypot(tile.x - x, tile.y - y) <= CONFIG.SIMULATION.WATCHTOWER_RADIUS) {
                    return true;
                }
            }
        }
        return false;
    }
    getTileFireRiskDetails(tile, y) { return this.disaster.getTileFireRiskDetails(tile, y); }
    hasTwoTileRoadFirebreak(fx, fy, tx, ty) { return this.disaster.hasTwoTileRoadFirebreak(fx, fy, tx, ty); }
    updateCityFireRiskMetric() { return this.disaster.updateCityFireRiskMetric(); }
    extinguishFire(x, y) { return this.disaster.extinguishFire(x, y); }
    findAvailableFireDepot(x, y) { return this.disaster.findAvailableFireDepot(x, y); }
    processFires() { return this.disaster.processFires(); }

    // --- Economy Delegation ---
    processEconomy() { return this.economy.processEconomy(); }

    // --- Transit Delegation ---
    isTrainDepotRoadConnected() {
        for (const [_, tile] of this.grid.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.SERVICE && tile.serviceType === CONFIG.SERVICES.TRAIN_DEPOT) {
                if (this.grid.hasAdjacentRoad(tile.x, tile.y)) {
                    return true;
                }
            }
        }
        return false;
    }

    // --- Master Simulation Step ---
    tick() {
        if (this.telegraph) this.telegraph.updateNetwork();
        if (this.powerSystem) this.powerSystem.updateNetwork();
        if (this.state.milestones && typeof this.state.milestones.progressPavilionConstruction === 'function') {
            this.state.milestones.progressPavilionConstruction();
        }
        this.ageActiveBuildings();
        this.progressConstruction();
        this.processFires();
        if (this.typhoon) this.typhoon.checkSeasonalTrigger(this.state.currentMonth);
        this.evaluateUpgrades();
        this.attemptAutonomousSpawning();
        this.processEconomy();
        this.recalculateDemands();
        if (this.state.advisor && typeof this.state.advisor.evaluate === 'function') {
            this.state.advisor.evaluate();
        }
        if (this.state.milestones) {
            this.state.milestones.checkPopulation(this.state.population);
        }
        if (this.state.renderer && this.state.renderer.overlay) {
            this.state.renderer.overlay.refresh();
        }
        this.state.updateHUD();
    }

    ageActiveBuildings() {
        for (const [_, tile] of this.grid.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.ZONE && tile.stage === CONFIG.STAGES.BUILT) {
                tile.ageTicks = (tile.ageTicks || 0) + 1;
            }
        }
    }

    progressConstruction() {
        const isSubsidyActive = this.state.policies && typeof this.state.policies.isModernizationSubsidyActive === 'function' && this.state.policies.isModernizationSubsidyActive();
        const isCleanWaterActive = this.state.policies && typeof this.state.policies.isCleanWaterActive === 'function' && this.state.policies.isCleanWaterActive();

        for (const [_, tile] of this.grid.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.ZONE && tile.stage === CONFIG.STAGES.SCAFFOLDING) {
                tile.constructionTicks = (tile.constructionTicks || 0) + 1;

                // Modernization Subsidy speeds up Level 2 (Kura) & Level 3 (Brick) construction by 50%
                const targetTicks = (tile.targetLevel >= 2 && isSubsidyActive)
                    ? Math.max(1, Math.ceil(CONFIG.SIMULATION.SCAFFOLD_TICKS * 0.5))
                    : CONFIG.SIMULATION.SCAFFOLD_TICKS;

                if (tile.constructionTicks >= targetTicks) {
                    const targetLevel = tile.targetLevel || 1;
                    this.grid.completeConstruction(tile.x, tile.y, targetLevel);

                    // If Modernization Subsidy active, deduct ¥50 conversion cost from municipal treasury
                    if (targetLevel >= 2 && isSubsidyActive) {
                        this.state.deductTreasury(50);
                    }

                    if (targetLevel >= 4) {
                        if (tile.zoneType === CONFIG.ZONES.COMMERCIAL) {
                            this.state.population += (CONFIG.SIMULATION.POP_GAIN_L4 || 25);
                            this.state.showToast(`🏛️ Western Brick Arcade (Ginza Rengagai) opened at (${tile.x}, ${tile.y})! +25 pop & high trade revenue.`);
                        }
                    } else if (targetLevel >= 3) {
                        if (tile.zoneType === CONFIG.ZONES.COMMERCIAL) {
                            this.state.population += (CONFIG.SIMULATION.POP_GAIN_L3 || 15);
                            this.state.showToast(`🏛️ Grand Giyōfū Red Brick arcade opened at (${tile.x}, ${tile.y})! +15 pop (Fireproof)`);
                        } else if (tile.zoneType === CONFIG.ZONES.RESIDENTIAL) {
                            const popGain = CONFIG.SIMULATION.POP_GAIN_L3_RES || 16;
                            this.state.population += popGain;
                            this.state.showToast(`🏛️ Modern Western-style Brick Residence completed at (${tile.x}, ${tile.y})! +${popGain} pop.`);
                        }
                    } else if (targetLevel >= 2) {
                        if (tile.zoneType === CONFIG.ZONES.RESIDENTIAL) {
                            const isWatered = this.isWellCovered(tile.x, tile.y);
                            let popGain = isWatered ? CONFIG.SIMULATION.POP_GAIN_L2 : Math.floor(CONFIG.SIMULATION.POP_GAIN_L2 * 0.5);
                            if (isWatered && isCleanWaterActive) {
                                popGain = Math.round(popGain * 1.10); // +10% Clean Water population growth
                            }
                            this.state.population += popGain;
                            const note = isWatered ? (isCleanWaterActive ? ' (Clean Water Mandate: +10% growth)' : '') : ' (No well: population influx dampened)';
                            this.state.showToast(`Upgraded to fireproof Kura-zukuri at (${tile.x}, ${tile.y})! +${popGain} pop${note}`);
                        } else if (tile.zoneType === CONFIG.ZONES.COMMERCIAL) {
                            this.state.showToast(`Grand 2-story Machiya merchant shop opened at (${tile.x}, ${tile.y})!`);
                        } else if (tile.zoneType === CONFIG.ZONES.INDUSTRIAL) {
                            this.state.population += (CONFIG.SIMULATION.POP_GAIN_L2_IND || 12);
                            this.state.showToast(`🏭 Modern Silk Reeling Mill (Seishi-jō) opened at (${tile.x}, ${tile.y})! +12 jobs & export trade surge.`);
                        }
                    } else {
                        if (tile.zoneType === CONFIG.ZONES.RESIDENTIAL) {
                            const isWatered = this.isWellCovered(tile.x, tile.y);
                            let popGain = isWatered ? CONFIG.SIMULATION.POP_PER_RESIDENCE_L1 : Math.floor(CONFIG.SIMULATION.POP_PER_RESIDENCE_L1 * 0.5);
                            if (isWatered && isCleanWaterActive) {
                                popGain = Math.round(popGain * 1.10); // +10% Clean Water population growth
                            }
                            this.state.population += popGain;
                            const note = isWatered ? (isCleanWaterActive ? ' (Clean Water Mandate: +10% growth)' : '') : ' (No well: population influx dampened)';
                            this.state.showToast(`Nagaya townhouse completed at (${tile.x}, ${tile.y})! +${popGain} pop${note}`);
                        } else if (tile.zoneType === CONFIG.ZONES.COMMERCIAL) {
                            this.state.showToast(`Shouten merchant store opened at (${tile.x}, ${tile.y})!`);
                        } else if (tile.zoneType === CONFIG.ZONES.INDUSTRIAL) {
                            this.state.showToast(`Craft workshop started production at (${tile.x}, ${tile.y})!`);
                        }
                    }
                }
            }
        }
    }

    evaluateUpgrades() {
        const treasury = this.state.treasury || 0;
        const currentTier = this.state.milestones?.currentTier
            || (this.state.population >= 600 ? 4 : (this.state.population >= 300 ? 3 : (this.state.population >= 100 ? 2 : 1)));

        const maxUpgrades = currentTier >= 4 ? (CONFIG.SIMULATION.UPGRADE_BATCH_LIMIT_T4 || 5)
            : (currentTier === 3 ? (CONFIG.SIMULATION.UPGRADE_BATCH_LIMIT_T3 || 3)
            : (currentTier === 2 ? (CONFIG.SIMULATION.UPGRADE_BATCH_LIMIT_T2 || 2)
            : (CONFIG.SIMULATION.UPGRADE_BATCH_LIMIT_T1 || 1)));

        const reqT1 = CONFIG.SIMULATION.PROSPERITY_TREASURY_T1_MIN || 1000;
        const reqT2 = CONFIG.SIMULATION.PROSPERITY_TREASURY_T2_MIN || 2500;
        const reqT3 = CONFIG.SIMULATION.PROSPERITY_TREASURY_T3_MIN || 4500;

        let upgradeCount = 0;

        for (const [_, tile] of this.grid.tiles.entries()) {
            if (upgradeCount >= maxUpgrades) break;

            if (
                tile.type === CONFIG.TYPES.ZONE &&
                tile.stage === CONFIG.STAGES.BUILT &&
                (tile.ageTicks || 0) >= CONFIG.SIMULATION.UPGRADE_MIN_AGE_TICKS &&
                this.grid.hasAdjacentRoad(tile.x, tile.y)
            ) {
                if (tile.level === 1) {
                    if (treasury < reqT1) continue;

                    if (tile.zoneType === CONFIG.ZONES.RESIDENTIAL) {
                        this.grid.startRenovation(tile.x, tile.y, 2);
                        if (upgradeCount === 0) this.state.showToast(`Townhouse at (${tile.x}, ${tile.y}) renovating into fireproof Kura-zukuri...`);
                        upgradeCount++;
                        continue;
                    } else if (tile.zoneType === CONFIG.ZONES.COMMERCIAL) {
                        this.grid.startRenovation(tile.x, tile.y, 2);
                        if (upgradeCount === 0) this.state.showToast(`Merchant shop at (${tile.x}, ${tile.y}) renovating into two-story Machiya...`);
                        upgradeCount++;
                        continue;
                    } else if (tile.zoneType === CONFIG.ZONES.INDUSTRIAL && (this.grid.hasAdjacentRail(tile.x, tile.y) || this.grid.hasAdjacentCanal(tile.x, tile.y) || this.isTrainDepotRoadConnected() || (this.schoolSystem && (this.schoolSystem.isSchoolAdjacent(tile.x, tile.y) || this.schoolSystem.isEducationCovered(tile.x, tile.y))))) {
                        this.grid.startRenovation(tile.x, tile.y, 2);
                        if (upgradeCount === 0) this.state.showToast(`🏭 Meiji Industry! Workshop at (${tile.x}, ${tile.y}) upgrading into red-brick Silk Reeling Mill (Seishi-jō)...`);
                        upgradeCount++;
                        continue;
                    }
                } else if (tile.zoneType === CONFIG.ZONES.RESIDENTIAL) {
                    if (tile.level === 2 && treasury >= reqT2 && this.sanitation && this.sanitation.isBrickResidenceEligible(tile.x, tile.y)) {
                        this.grid.startRenovation(tile.x, tile.y, 3);
                        if (upgradeCount === 0) this.state.showToast(`🏛️ Modern Sanitation! Townhouse at (${tile.x}, ${tile.y}) renovating into Western-style Brick Residence...`);
                        upgradeCount++;
                        continue;
                    }
                } else if (tile.zoneType === CONFIG.ZONES.COMMERCIAL) {
                    if (tile.level >= 2 && tile.level < 4 && treasury >= reqT3 && this.telegraph && this.telegraph.isGinzaBrickEligible(tile.x, tile.y)) {
                        this.grid.startRenovation(tile.x, tile.y, 4);
                        if (upgradeCount === 0) this.state.showToast(`🏛️ Ginza Rengagai! Commercial shop at (${tile.x}, ${tile.y}) upgrading into Western Brick Arcade...`);
                        upgradeCount++;
                        continue;
                    } else if (tile.level === 2 && treasury >= reqT2) {
                        const hasFireProtection = this.isWatchtowerCovered(tile.x, tile.y) || !!this.findAvailableFireDepot(tile.x, tile.y);
                        const isEducated = this.schoolSystem ? (this.schoolSystem.isEducationCovered(tile.x, tile.y) || this.schoolSystem.isSchoolAdjacent(tile.x, tile.y)) : false;
                        if (hasFireProtection && (treasury >= 3500 || (isEducated && treasury >= 2500))) {
                            this.grid.startRenovation(tile.x, tile.y, 3);
                            if (upgradeCount === 0) this.state.showToast(`🏛️ Modernization Era! Commercial shop at (${tile.x}, ${tile.y}) upgrading into Western Giyōfū Red Brick arcade...`);
                            upgradeCount++;
                            continue;
                        }
                    }
                }
            }
        }
        return upgradeCount;
    }

    attemptAutonomousSpawning() {
        let spawnedCount = 0;
        const happiness = this.state.metrics.townHappiness !== undefined ? this.state.metrics.townHappiness : (CONFIG.SIMULATION.DEFAULT_HAPPINESS || 65);
        const zones = [
            { type: CONFIG.ZONES.RESIDENTIAL, demand: this.state.metrics.residentialDemand },
            { type: CONFIG.ZONES.COMMERCIAL, demand: this.state.metrics.commercialDemand },
            { type: CONFIG.ZONES.INDUSTRIAL, demand: this.state.metrics.industrialDemand },
        ];

        for (const z of zones) {
            if (z.type === CONFIG.ZONES.RESIDENTIAL && happiness < 40) continue;

            if (z.demand >= 15) {
                const eligibleLots = this.grid.findEligibleZoneLots(z.type);
                if (eligibleLots.length > 0) {
                    const chosen = eligibleLots[0];
                    this.grid.startConstruction(chosen.x, chosen.y);
                    spawnedCount++;

                    if (z.type === CONFIG.ZONES.RESIDENTIAL) {
                        this.state.metrics.residentialDemand = Math.max(10, this.state.metrics.residentialDemand - 4);
                    } else if (z.type === CONFIG.ZONES.COMMERCIAL) {
                        this.state.metrics.commercialDemand = Math.max(10, this.state.metrics.commercialDemand - 5);
                    } else if (z.type === CONFIG.ZONES.INDUSTRIAL) {
                        this.state.metrics.industrialDemand = Math.max(10, this.state.metrics.industrialDemand - 5);
                    }
                }
            }
        }
        return spawnedCount;
    }

    recalculateDemands() {
        const counts = this.grid.getBuildingCounts();
        const totalRes = counts.resL1 + (counts.resL2 * 2);
        const totalCom = counts.comL1 + (counts.comL2 * 2) + ((counts.comL3 || 0) * 3);
        const totalJobs = (totalCom * 3) + (counts.industrial * 4);

        // 1. Sanitation & Cholera
        this.sanitation.updateCholeraRisk();

        // 2. Welfare & Happiness
        const happiness = this.happiness.calculateTownHappiness();

        // 3. Residential Demand
        const jobRatio = totalRes > 0 ? (totalJobs / totalRes) : 1.2;
        let targetResDemand = 50;
        if (jobRatio >= 1.0) {
            targetResDemand += Math.min(30, Math.round((jobRatio - 1.0) * 25));
        } else if (jobRatio < 0.6) {
            targetResDemand -= Math.min(20, Math.round((0.6 - jobRatio) * 30));
        }

        targetResDemand -= Math.round(this.state.metrics.choleraRisk * 0.4);
        if (happiness > 75) targetResDemand = Math.round(targetResDemand * 1.25);
        else if (happiness < 40) targetResDemand = Math.round(targetResDemand * 0.20);

        targetResDemand = Math.max(happiness < 40 ? 0 : 22, Math.min(95, targetResDemand));
        this.state.metrics.residentialDemand = Math.round(
            this.state.metrics.residentialDemand * 0.7 + targetResDemand * 0.3
        );

        // 4. Commercial Demand
        let targetComDemand = 35;
        if (this.state.population > (totalCom * 12)) {
            targetComDemand += Math.min(45, Math.round((this.state.population - totalCom * 12) / 4));
        }
        if (this.isTrainDepotRoadConnected()) {
            targetComDemand = Math.min(100, targetComDemand * 2);
        }
        targetComDemand = Math.max(15, Math.min(95, targetComDemand));
        this.state.metrics.commercialDemand = Math.round(
            this.state.metrics.commercialDemand * 0.7 + targetComDemand * 0.3
        );

        // 5. Industrial Demand
        let targetIndDemand = 35;
        if (this.state.population > (counts.industrial * 16)) {
            targetIndDemand += Math.min(45, Math.round((this.state.population - counts.industrial * 16) / 5));
        }
        if (this.isTrainDepotRoadConnected()) {
            targetIndDemand = Math.min(100, targetIndDemand * 2);
        }
        targetIndDemand = Math.max(15, Math.min(95, targetIndDemand));
        this.state.metrics.industrialDemand = Math.round(
            this.state.metrics.industrialDemand * 0.7 + targetIndDemand * 0.3
        );
    }
}
