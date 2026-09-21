// Project Meiji - Simulation Time & Calendar Manager
// ponytail: native setInterval timer, dynamic speed multipliers & calendar rollover

import { CONFIG } from '../config.js';
import { SOUND } from '../fx.js';

export class TimeManager {
    constructor(stateManager, onTickCallback) {
        this.state = stateManager;
        this.onTick = onTickCallback;

        this.isRunning = true;
        this.timer = null;
        this.tickCount = 0;
        this.speedMultiplier = 1;
    }

    setSpeed(multiplier) {
        if (multiplier === 0) {
            this.pause();
            return;
        }
        const allowed = CONFIG.SIMULATION.SPEED_MULTIPLIERS || [1, 2, 3, 5];
        if (!allowed.includes(multiplier)) return;
        this.speedMultiplier = multiplier;
        if (this.isRunning) {
            this.pause();
            this.start();
        } else {
            this.start();
        }
    }

    start() {
        if (this.timer) return;
        this.isRunning = true;
        const intervals = CONFIG.SIMULATION.SPEED_INTERVALS || { 1: 12000, 2: 6000, 3: 3000, 5: 1500 };
        const currentInterval = intervals[this.speedMultiplier] || Math.round((CONFIG.SIMULATION.BASE_MONTH_MS || 12000) / this.speedMultiplier);
        this.timer = setInterval(() => this.step(), currentInterval);
    }

    pause() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.isRunning = false;
    }

    toggle() {
        if (this.isRunning) {
            this.pause();
        } else {
            this.start();
        }
        return this.isRunning;
    }

    step() {
        this.tickCount++;

        // 1. Advance Calendar (1 Month per tick)
        this.state.currentMonth++;
        let isNewYear = false;
        if (this.state.currentMonth > 12) {
            this.state.currentMonth = 1;
            this.state.currentYear++;
            isNewYear = true;
        }

        // 2. Play month advance chime on all 12 transitions; add Bonshō bell on New Year
        SOUND.playMonthAdvance();
        if (isNewYear) {
            SOUND.playNewYearBell();
            if (typeof this.state.showToast === 'function') {
                this.state.showToast(`🔔 New Year Dawn! Welcome to Meiji ${this.state.currentYear - 1867} (${this.state.currentYear})`);
            }
        }

        // 3. Immediately synchronize visual HUD date display with the chime
        if (typeof this.state.updateHUD === 'function') {
            this.state.updateHUD();
        }

        // 4. Dynamic Seasonality foliage, Day/Night lighting & ambient cues
        if (this.state.renderer) {
            if (typeof this.state.renderer.updateSeason === 'function') {
                this.state.renderer.updateSeason(this.state.currentMonth);
            }
            if (typeof this.state.renderer.updateDayNight === 'function') {
                this.state.renderer.updateDayNight(this.state.currentMonth);
            }
        }
        SOUND.updateAmbience(this.state.currentMonth);

        // 5. Delegate tick execution to simulation orchestrator
        if (typeof this.onTick === 'function') {
            try {
                this.onTick();
            } catch (err) {
                console.error('[TimeManager] Error during simulation tick:', err);
            }
        }
    }
}
