// Project Meiji - Application Controller & State Orchestrator
// ponytail: modular UI composition, native fetch API & state orchestrator

import { CONFIG } from './config.js';
import { CityGridModel } from './grid.js';
import { WorldRenderer } from './renderer.js';
import { ToolController } from './tools.js';
import { SimulationEngine } from './simulation.js';
import { SOUND } from './fx.js';
import { BuildDrawer } from './ui/build_drawer.js';
import { SurveyorScope } from './ui/surveyor_scope.js';
import { ChronicleBanner } from './ui/chronicle_banner.js';
import { ToastManager } from './ui/toast_manager.js';
import { MilestoneManager } from './milestoneManager.js';
import { PolicyManager } from './policyManager.js';
import { AdvisorManager } from './ui/advisorManager.js';
import { ApiClient } from './apiClient.js';
import { AuthModal } from './ui/authModal.js';
import { ChronicleLedger } from './ui/chronicleLedger.js';
import { SaveManager } from './saveManager.js';
import { modalManager } from './ui/modalManager.js';
import { i18n } from './i18n.js';

class GameStateManager {
    constructor() {
        this.cityId = 1;
        this.cityName = 'Edo-Tokyo';
        this.treasury = CONFIG.SIMULATION.INITIAL_TREASURY || 5000;
        this.population = 0;
        this.currentYear = 1872;
        this.currentMonth = 1;

        this.metrics = {
            traditionModernityBalance: 50,
            fireRisk: 20,
            choleraRisk: 10,
            townHappiness: 65,
            industrialDemand: 30,
            commercialDemand: 40,
            residentialDemand: 60,
        };

        this.lastCashflow = 0;

        // Domain & Renderer Core
        this.grid = new CityGridModel(CONFIG.GRID_WIDTH, CONFIG.GRID_HEIGHT);
        this.renderer = new WorldRenderer(document.getElementById('canvas-container'), this.grid);
        this.renderer.setGameState(this);

        // UI Subsystems & Civic Systems
        this.api = new ApiClient();
        this.toast = new ToastManager();
        this.authModal = new AuthModal(this.api, this);
        this.scope = new SurveyorScope(document.getElementById('surveyor-scope'), this);
        this.banner = new ChronicleBanner(this);
        this.milestones = new MilestoneManager(this);
        this.policies = new PolicyManager(this);
        this.edictsManager = this.policies;
        this.advisor = new AdvisorManager(this);
        this.chronicle = new ChronicleLedger(this);
        this.saveManager = new SaveManager(this, this.api);
        this.drawer = new BuildDrawer(
            (tool) => this.tools.setActiveTool(tool, false),
            () => this.tools.rotatePlacement()
        );
        this.drawer.updateTownTier(this.milestones.currentTier);

        // Player Tools & Autonomous Simulation
        this.tools = new ToolController(this.grid, this.renderer, this, this.drawer);
        this.simulation = new SimulationEngine(this.grid, this);

        this.renderer.setSimulation(this.simulation);
        this.renderer.updateSeason(this.currentMonth);
        this.renderer.updateDayNight(this.currentMonth);

        // Web Audio Ambience initiation on user gesture
        const initAudio = () => {
            SOUND.init(true);
            SOUND.startAmbience();
            SOUND.updateAmbience(this.currentMonth);
            window.removeEventListener('pointerdown', initAudio);
            window.removeEventListener('keydown', initAudio);
        };
        window.addEventListener('pointerdown', initAudio);
        window.addEventListener('keydown', initAudio);

        this.initButtons();
        this.loadCityFromApi().then(() => {
            this.simulation.start();
        });
    }

    initButtons() {
        this.dom = {
            dragBadge: document.getElementById('drag-badge'),
            btnSave: document.getElementById('btn-save'),
            btnReload: document.getElementById('btn-reload'),
            btnNewGame: document.getElementById('btn-new-game'),
        };

        if (this.dom.btnSave) this.dom.btnSave.addEventListener('click', () => this.saveCityToApi());
        if (this.dom.btnReload) this.dom.btnReload.addEventListener('click', () => this.loadCityFromApi());
        if (this.dom.btnNewGame) this.dom.btnNewGame.addEventListener('click', () => this.startNewGame());

        this.updateHUD();
    }

    pauseSimulation() {
        this.simulation.pause();
        this.banner.updateTimeControlsUI(0);
        this.showToast('Simulation paused');
    }

    resumeSimulation() {
        const speed = this.simulation.speedMultiplier || 1;
        this.simulation.start();
        this.banner.updateTimeControlsUI(speed);
        this.showToast(`Simulation resumed (${speed}x)`);
    }

    toggleSimulation() {
        if (this.simulation.isRunning) this.pauseSimulation();
        else this.resumeSimulation();
        return this.simulation.isRunning;
    }

    setSimulationSpeed(speed) {
        const allowed = CONFIG.SIMULATION.SPEED_MULTIPLIERS || [1, 2, 3, 5];
        if (!allowed.includes(speed)) return;
        this.simulation.setSpeed(speed);
        this.banner.updateTimeControlsUI(speed);
        this.showToast(`Simulation speed set to ${speed}x`);
    }

    updateHUD() {
        this.banner.update();
    }

    updateInspector(x, y, autoExpand = false) {
        this.inspectedCoord = { x, y };
        this.scope.update(x, y, this.grid, this.simulation);
        if (autoExpand) {
            this.scope.expand();
        }
    }

    rotateInspectedTile() {
        if (!this.inspectedCoord) return false;
        const { x, y } = this.inspectedCoord;
        const tile = this.grid.getTile(x, y);
        if (!tile || tile.type === CONFIG.TYPES.EMPTY) return false;

        const currentRot = typeof tile.rotation === 'number'
            ? tile.rotation
            : Math.round(this.renderer.getFacingAngleForTile(x, y) / (Math.PI / 2));
        tile.rotation = ((currentRot + 1) % 4 + 4) % 4;
        this.grid.notifyChange(x, y);
        this.scope.update(x, y, this.grid, this.simulation);
        const dirs = ['North (0°)', 'East (90°)', 'South (180°)', 'West (270°)'];
        this.showToast(`Rotated structure to ${dirs[tile.rotation]}`);
        return true;
    }

    deductTreasury(amount) {
        if (this.treasury < amount) return false;
        this.treasury -= amount;
        this.updateHUD();
        return true;
    }

    showToast(message, isError = false) {
        this.toast.show(message, isError);
    }

    async loadCityFromApi() {
        if (!this.authModal?.currentUser) {
            try {
                const sess = await this.api.sessionCheck();
                if (sess && sess.authenticated) {
                    this.authModal.currentUser = { id: sess.user_id, username: sess.username };
                    this.authModal.updateBadge();
                }
            } catch (_) {}
        }

        if (this.authModal?.currentUser) {
            try {
                const loaded = await this.saveManager.loadCity();
                if (loaded) return;
                this.showToast('No saved settlement found for Mayor.', true);
                return;
            } catch (err) {
                console.error('Failed to load user city from slot:', err);
                this.showToast(`Failed to load settlement: ${err.message}`, true);
                return;
            }
        }

        this.showToast('Connecting to XAMPP MariaDB...');
        try {
            const data = await this.api.getCity(this.cityId);
            const city = data.city;
            const gridData = data.grid;

            this.cityName = city.cityName;
            this.treasury = city.treasury;
            this.population = city.population;
            this.currentYear = city.currentYear;
            this.currentMonth = city.currentMonth;

            if (city.metrics) this.metrics = city.metrics;
            if (gridData) {
                if (gridData.width) this.grid.width = gridData.width;
                if (gridData.height) this.grid.height = gridData.height;
                if (gridData.tiles) this.grid.loadFromMap(gridData.tiles);
            }

            this.updateHUD();
            if (this.milestones) this.milestones.checkPopulation(this.population);
            this.showToast(`Loaded "${this.cityName}" from database.`);
        } catch (err) {
            console.error('Failed to load city:', err);
            this.showToast(`Failed to load city state: ${err.message}`, true);
        }
    }

    async saveCityToApi() {
        if (!this.authModal?.currentUser) {
            try {
                const sess = await this.api.sessionCheck();
                if (sess && sess.authenticated) {
                    this.authModal.currentUser = { id: sess.user_id, username: sess.username };
                    this.authModal.updateBadge();
                } else {
                    this.showToast('Please sign in as Mayor to save settlement.', true);
                    this.authModal.open();
                    return;
                }
            } catch (e) {
                this.showToast('Please sign in as Mayor to save settlement.', true);
                this.authModal.open();
                return;
            }
        }
        await this.saveManager.saveCurrentCity();
    }

    async onMayorChanged() {
        if (this.saveManager) {
            this.saveManager.currentSlotId = null;
        }

        if (this.authModal?.currentUser) {
            try {
                const loaded = await this.saveManager.loadCity(null, true);
                if (loaded) {
                    return;
                }
            } catch (err) {
                console.warn('Could not load city on mayor change:', err);
            }

            // If this mayor has no saved city yet, present a clean fresh settlement
            const userName = this.authModal.currentUser.username;
            this.cityName = `${userName}'s Edo`;
            this.treasury = CONFIG.SIMULATION.INITIAL_TREASURY || 5000;
            this.population = 0;
            this.currentYear = 1872;
            this.currentMonth = 1;
            this.lastCashflow = 0;
            this.metrics = {
                traditionModernityBalance: 50,
                fireRisk: 0,
                choleraRisk: 0,
                townHappiness: 65,
                industrialDemand: 30,
                commercialDemand: 40,
                residentialDemand: 60,
            };
            this.grid.loadFromMap({});
            if (this.milestones) this.milestones.reset();
            if (this.policies) this.policies.resetDefaults();
            if (this.advisor) this.advisor.hide();
            this.updateHUD();
            if (this.renderer) {
                this.renderer.updateSeason(this.currentMonth);
                this.renderer.updateDayNight(this.currentMonth);
            }
            this.showToast(`✨ Fresh settlement ready for Mayor ${userName}!`);
        }
    }

    async startNewGame() {
        const chosenName = await modalManager.prompt({
            title: i18n.t('confirm.reset_city_title', "Start a New Settlement?"),
            message: i18n.t('confirm.reset_city_msg', "Name your new Meiji settlement to begin in 1872 with ¥5,000 in treasury.\n\nAll existing buildings will be cleared. Do you wish to proceed?"),
            defaultValue: this.cityName || 'Edo-Tokyo',
            placeholder: i18n.t('confirm.reset_city_placeholder', "Settlement Name (e.g. Edo-Tokyo, Yokohama)"),
            confirmText: i18n.t('confirm.reset_city_ok', "Found Settlement"),
            cancelText: i18n.t('confirm.reset_city_cancel', "Keep Building"),
            icon: "⛩️"
        });
        if (!chosenName) return;

        const newCityName = (typeof chosenName === 'string' && chosenName.trim()) ? chosenName.trim() : 'Edo-Tokyo';

        this.simulation.pause();
        this.showToast(i18n.getLanguage() === 'ja' ? `明治五年 (1872年) 「${newCityName}」を開拓中...` : `Founding "${newCityName}" in Meiji Year 5 (1872)...`);

        try {
            await this.api.resetCity(this.cityId, newCityName);

            this.cityName = newCityName;
            this.treasury = CONFIG.SIMULATION.INITIAL_TREASURY || 5000;
            this.population = 0;
            this.currentYear = 1872;
            this.currentMonth = 1;
            this.lastCashflow = 0;
            this.metrics = {
                traditionModernityBalance: 50,
                fireRisk: 0,
                choleraRisk: 0,
                townHappiness: 65,
                industrialDemand: 30,
                commercialDemand: 40,
                residentialDemand: 60,
            };
            this.stats = {
                foundingYear: 1872,
                foundingMonth: 1,
                totalTaxesCollected: 0,
                firesExtinguished: 0,
                peakPopulation: 0,
                recordedEvents: [
                    {
                        year: 1872,
                        month: 1,
                        textEn: `Founding of the ${newCityName} Meiji Settlement.`,
                        textJa: `明治五年一月、${newCityName}開拓草創の布告。`
                    }
                ]
            };

            this.grid.loadFromMap({});
            if (this.milestones) this.milestones.reset();
            if (this.policies) this.policies.resetDefaults();
            if (this.advisor) this.advisor.hide();
            this.updateHUD();
            this.renderer.updateSeason(this.currentMonth);
            this.renderer.updateDayNight(this.currentMonth);
            SOUND.playNewYearBell();
            this.showToast('⛩️ A new settlement begins! Meiji Year 5 (1872).');
            this.simulation.start();
        } catch (err) {
            console.error('Failed to reset settlement:', err);
            this.showToast(`Reset failed: ${err.message}`, true);
            this.simulation.start();
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.game = new GameStateManager();
});
