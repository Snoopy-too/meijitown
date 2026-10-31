// Project Meiji - Save & Load Pipeline Manager (saveManager.js)
// Clean Architecture & Local Storage Adapter for non-logged-in guest players

export class SaveManager {
    static LOCAL_STORAGE_KEY = 'meijitown_local_save';
    static FALLBACK_STORAGE_KEY = 'meiji_local_game_save';

    constructor(gameState, apiClient) {
        this.game = gameState;
        this.api = apiClient;
        this.currentSlotId = null;
    }

    /**
     * Determines whether the active player is an authenticated member.
     */
    isUserLoggedIn() {
        return Boolean(this.game?.authModal?.currentUser && this.game.authModal.currentUser.id);
    }

    /**
     * Checks if a local game save exists on this device.
     */
    hasLocalSave() {
        try {
            if (typeof localStorage === 'undefined') return false;
            return Boolean(
                localStorage.getItem(SaveManager.LOCAL_STORAGE_KEY) ||
                localStorage.getItem(SaveManager.FALLBACK_STORAGE_KEY)
            );
        } catch (_) {
            return false;
        }
    }

    /**
     * Retrieves lightweight metadata of the local save without full rehydration.
     */
    getLocalSaveInfo() {
        try {
            if (typeof localStorage === 'undefined') return null;
            const raw = localStorage.getItem(SaveManager.LOCAL_STORAGE_KEY) || localStorage.getItem(SaveManager.FALLBACK_STORAGE_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            return {
                cityName: data.cityName || 'Edo-Tokyo',
                currentYear: Number(data.currentYear || 1872),
                currentMonth: Number(data.currentMonth || 1),
                treasury: Number(data.treasury || 5000),
                population: Number(data.population || 0),
                savedAt: data.savedAt || null,
            };
        } catch (_) {
            return null;
        }
    }

    /**
     * Exports a sanitized complete snapshot of the game state.
     */
    exportCityState() {
        const tilesArray = this.game.grid ? this.game.grid.exportToArray() : [];
        const polMgr = this.game.policies || this.game.policyManager;
        const activeEdicts = (polMgr && typeof polMgr.getActivePolicies === 'function')
            ? polMgr.getActivePolicies()
            : {};

        return {
            version: 1,
            savedAt: Date.now(),
            cityName: this.game.cityName || 'Edo-Tokyo',
            treasury: Number(this.game.treasury || 0),
            population: Number(this.game.population || 0),
            currentYear: Number(this.game.currentYear || 1872),
            currentMonth: Number(this.game.currentMonth || 1),
            lastCashflow: Number(this.game.lastCashflow || 0),
            metrics: { ...(this.game.metrics || {}) },
            grid: tilesArray,
            activeEdicts: activeEdicts,
            milestones: {
                currentTier: this.game.milestones?.currentTier || 1,
                claimedTiers: Array.isArray(this.game.milestones?.claimedTiers) ? [...this.game.milestones.claimedTiers] : [1],
                hasTriumphCompleted: Boolean(this.game.milestones?.hasTriumphCompleted),
            },
            stats: this.game.stats ? {
                foundingYear: this.game.stats.foundingYear || 1872,
                foundingMonth: this.game.stats.foundingMonth || 1,
                totalTaxesCollected: Number(this.game.stats.totalTaxesCollected || 0),
                firesExtinguished: Number(this.game.stats.firesExtinguished || 0),
                peakPopulation: Number(this.game.stats.peakPopulation || 0),
                recordedEvents: Array.isArray(this.game.stats.recordedEvents) ? [...this.game.stats.recordedEvents] : []
            } : null
        };
    }

    /**
     * Applies and rehydrates a saved game state with sanitization and validation.
     */
    applyCityState(state) {
        if (!state || typeof state !== 'object') {
            throw new Error('Invalid save state data.');
        }

        // 1. Sanitize & Apply Vitals
        const rawName = String(state.cityName || 'Edo-Tokyo');
        this.game.cityName = rawName.replace(/<[^>]*>?/gm, '').trim().slice(0, 40) || 'Edo-Tokyo';

        if (state.treasury !== undefined) {
            const t = Number(state.treasury);
            this.game.treasury = Number.isFinite(t) ? t : 5000;
        }
        if (state.population !== undefined) {
            const p = Number(state.population);
            this.game.population = Number.isFinite(p) ? Math.max(0, Math.floor(p)) : 0;
        }
        if (state.currentYear !== undefined) {
            const y = Number(state.currentYear);
            this.game.currentYear = Number.isFinite(y) ? Math.max(1868, Math.floor(y)) : 1872;
        }
        if (state.currentMonth !== undefined) {
            const m = Number(state.currentMonth);
            this.game.currentMonth = Number.isFinite(m) ? Math.min(12, Math.max(1, Math.floor(m))) : 1;
        }
        if (state.lastCashflow !== undefined) {
            const c = Number(state.lastCashflow);
            this.game.lastCashflow = Number.isFinite(c) ? c : 0;
        }

        // 2. Metrics Sanitization & Clamping
        if (state.metrics && typeof state.metrics === 'object') {
            this.game.metrics = {
                traditionModernityBalance: Math.min(100, Math.max(0, Number(state.metrics.traditionModernityBalance ?? 50))),
                fireRisk: Math.min(100, Math.max(0, Number(state.metrics.fireRisk ?? 20))),
                choleraRisk: Math.min(100, Math.max(0, Number(state.metrics.choleraRisk ?? 10))),
                townHappiness: Math.min(100, Math.max(0, Number(state.metrics.townHappiness ?? 65))),
                industrialDemand: Math.min(100, Math.max(0, Number(state.metrics.industrialDemand ?? 30))),
                commercialDemand: Math.min(100, Math.max(0, Number(state.metrics.commercialDemand ?? 40))),
                residentialDemand: Math.min(100, Math.max(0, Number(state.metrics.residentialDemand ?? 60))),
            };
        }

        // 3. Civic Policies
        const polMgr = this.game.policies || this.game.policyManager;
        if (polMgr && state.activeEdicts && typeof polMgr.setPolicies === 'function') {
            polMgr.setPolicies(state.activeEdicts);
        }

        // 4. Milestones
        if (state.milestones && this.game.milestones) {
            if (Array.isArray(state.milestones.claimedTiers)) {
                this.game.milestones.claimedTiers = state.milestones.claimedTiers.map(t => parseInt(t, 10)).filter(Number.isFinite);
            }
            if (state.milestones.currentTier !== undefined) {
                this.game.milestones.currentTier = Math.min(4, Math.max(1, parseInt(state.milestones.currentTier, 10) || 1));
            }
            if (state.milestones.hasTriumphCompleted !== undefined) {
                this.game.milestones.hasTriumphCompleted = Boolean(state.milestones.hasTriumphCompleted);
            }
            if (typeof this.game.milestones.updateBadge === 'function') {
                this.game.milestones.updateBadge();
            }
            if (this.game.drawer && typeof this.game.drawer.updateTownTier === 'function') {
                this.game.drawer.updateTownTier(this.game.milestones.currentTier);
            }
        }

        // 5. Municipal Ledger Stats
        if (state.stats && typeof state.stats === 'object') {
            this.game.stats = {
                foundingYear: Number(state.stats.foundingYear || 1872),
                foundingMonth: Number(state.stats.foundingMonth || 1),
                totalTaxesCollected: Number(state.stats.totalTaxesCollected || 0),
                firesExtinguished: Number(state.stats.firesExtinguished || 0),
                peakPopulation: Number(state.stats.peakPopulation || 0),
                recordedEvents: Array.isArray(state.stats.recordedEvents) ? state.stats.recordedEvents : []
            };
        }

        // 6. Grid Rehydration
        if (this.game.grid && (state.grid || state.tiles)) {
            const rawTiles = state.grid || state.tiles;
            const tiles = Array.isArray(rawTiles) ? rawTiles : Object.values(rawTiles);
            this.game.grid.loadFromMap(tiles);
        }

        // 7. Visual Render & HUD Updates
        if (this.game.renderer) {
            if (typeof this.game.renderer.updateSeason === 'function') {
                this.game.renderer.updateSeason(this.game.currentMonth);
            }
            if (typeof this.game.renderer.updateDayNight === 'function') {
                this.game.renderer.updateDayNight(this.game.currentMonth);
            }
        }

        if (typeof this.game.updateHUD === 'function') {
            this.game.updateHUD();
        }

        return true;
    }

    /**
     * Saves game state to the player's own machine via localStorage.
     */
    saveLocalCity(isAuto = false) {
        if (typeof localStorage === 'undefined') {
            console.warn('[Meiji] localStorage is unavailable on this device.');
            return null;
        }

        try {
            const state = this.exportCityState();
            const serialized = JSON.stringify(state);
            localStorage.setItem(SaveManager.LOCAL_STORAGE_KEY, serialized);

            if (this.game?.showToast) {
                const isJa = typeof this.game.isJa === 'function' ? this.game.isJa() : false;
                if (isAuto) {
                    this.game.showToast(isJa ? '💾 街の状態を自動保存しました (端末)' : '💾 Auto-saved settlement to your device.');
                } else {
                    const tileCount = state.grid ? state.grid.length : 0;
                    this.game.showToast(isJa
                        ? `⛩️ 保存完了！${tileCount}区画の状態をお使いの端末に保存しました。`
                        : `⛩️ Saved! ${tileCount} structures saved to your device.`);
                }
            }

            return state;
        } catch (err) {
            console.error('[Meiji] Failed to save locally:', err);
            if (this.game?.showToast && !isAuto) {
                this.game.showToast(`Local save failed: ${err.message}`, true);
            }
            return null;
        }
    }

    /**
     * Loads game state from the player's own machine via localStorage.
     */
    loadLocalCity(silent = false) {
        if (typeof localStorage === 'undefined') {
            return null;
        }

        try {
            const raw = localStorage.getItem(SaveManager.LOCAL_STORAGE_KEY) || localStorage.getItem(SaveManager.FALLBACK_STORAGE_KEY);
            if (!raw) {
                if (!silent && this.game?.showToast) {
                    this.game.showToast('No saved settlement found on this device.', true);
                }
                return null;
            }

            const parsed = JSON.parse(raw);
            this.applyCityState(parsed);

            if (!silent && this.game?.showToast) {
                const isJa = typeof this.game.isJa === 'function' ? this.game.isJa() : false;
                this.game.showToast(isJa
                    ? `⛩️ お使いの端末から「${this.game.cityName}」を読み込みました！`
                    : `⛩️ Restored "${this.game.cityName}" from your device!`);
            }

            return parsed;
        } catch (err) {
            console.error('[Meiji] Failed to load local save:', err);
            if (!silent && this.game?.showToast) {
                this.game.showToast(`Failed to load local save: ${err.message}`, true);
            }
            return null;
        }
    }

    /**
     * Clears any local save data stored on this machine.
     */
    clearLocalSave() {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem(SaveManager.LOCAL_STORAGE_KEY);
                localStorage.removeItem(SaveManager.FALLBACK_STORAGE_KEY);
            }
        } catch (e) {
            console.warn('[Meiji] Error clearing local save:', e);
        }
    }

    /**
     * Saves city state: delegates to local storage for guests, or API for logged-in users.
     */
    async saveCurrentCity(slotId = null) {
        if (!this.isUserLoggedIn()) {
            return this.saveLocalCity(false);
        }

        const targetSlot = slotId || this.currentSlotId || null;
        this.game.showToast('Saving settlement to database...');

        try {
            const tilesArray = this.game.grid ? this.game.grid.exportToArray() : [];
            const payload = {
                slotId: targetSlot,
                cityName: this.game.cityName || 'Edo-Tokyo',
                treasury: this.game.treasury,
                population: this.game.population,
                chronicleDate: {
                    year: this.game.currentYear,
                    month: this.game.currentMonth,
                },
                grid: tilesArray,
                activeEdicts: (this.game.policies || this.game.policyManager) ? (this.game.policies || this.game.policyManager).getActivePolicies() : {},
                metrics: this.game.metrics,
            };

            const res = await this.api.saveCity(payload);
            if (res && res.slot_id) {
                this.currentSlotId = res.slot_id;
            }

            this.game.showToast(`⛩️ Saved! ${tilesArray.length} tiles committed to database (Slot #${this.currentSlotId || 1}).`);
            return res;
        } catch (err) {
            console.error('Save failed:', err);
            this.game.showToast(`Save failed: ${err.message}`, true);
            throw err;
        }
    }

    /**
     * Loads city state: delegates to local storage for guests, or API for logged-in users.
     */
    async loadCity(slotId = null, silent = false) {
        if (!this.isUserLoggedIn()) {
            return this.loadLocalCity(silent);
        }

        if (!silent) this.game.showToast('Fetching settlement from database...');
        try {
            const res = await this.api.loadCity(slotId);
            const city = res.city;
            if (!city) {
                if (!silent) this.game.showToast('No saved settlement found.', true);
                return null;
            }

            this.currentSlotId = parseInt(city.id, 10);
            this.game.cityName = city.city_name || 'Edo-Tokyo';
            this.game.treasury = parseInt(city.treasury, 10);
            this.game.population = parseInt(city.population, 10);
            this.game.currentYear = parseInt(city.chronicle_year, 10);
            this.game.currentMonth = parseInt(city.chronicle_month, 10);

            const parsed = city.parsed_data || (typeof city.city_data === 'string' ? JSON.parse(city.city_data) : city.city_data);

            if (parsed) {
                const polMgr = this.game.policies || this.game.policyManager;
                if (parsed.activeEdicts && polMgr) {
                    polMgr.setPolicies(parsed.activeEdicts);
                }

                if (parsed.metrics) {
                    this.game.metrics = parsed.metrics;
                }

                const tiles = parsed.grid || parsed.tiles || [];
                const tilesMapOrArray = Array.isArray(tiles) ? tiles : Object.values(tiles);
                this.game.grid.loadFromMap(tilesMapOrArray);
            }

            if (this.game.renderer) {
                this.game.renderer.updateSeason(this.game.currentMonth);
                this.game.renderer.updateDayNight(this.game.currentMonth);
            }
            this.game.updateHUD();

            this.game.showToast(`⛩️ Rehydrated "${this.game.cityName}" (Slot #${this.currentSlotId})!`);
            return city;
        } catch (err) {
            console.error('Load failed:', err);
            this.game.showToast(`Load failed: ${err.message}`, true);
            throw err;
        }
    }
}
