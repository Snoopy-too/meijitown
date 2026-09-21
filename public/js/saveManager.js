// Project Meiji - Save & Load Pipeline Manager (saveManager.js)
// ponytail: clean serialization, Three.js mesh rehydration, MySQL persistence

export class SaveManager {
    constructor(gameState, apiClient) {
        this.game = gameState;
        this.api = apiClient;
        this.currentSlotId = null;
    }

    async saveCurrentCity(slotId = null) {
        const targetSlot = slotId || this.currentSlotId || null;
        this.game.showToast('Saving settlement to MySQL...');

        try {
            const tilesArray = this.game.grid.exportToArray();
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

            this.game.showToast(`⛩️ Saved! ${tilesArray.length} tiles committed to MySQL (Slot #${this.currentSlotId || 1}).`);
            return res;
        } catch (err) {
            console.error('Save failed:', err);
            this.game.showToast(`Save failed: ${err.message}`, true);
            throw err;
        }
    }

    async loadCity(slotId = null, silent = false) {
        if (!silent) this.game.showToast('Fetching settlement from MySQL...');
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
                // 1. Rehydrate Civic Policies
                const polMgr = this.game.policies || this.game.policyManager;
                if (parsed.activeEdicts && polMgr) {
                    polMgr.setPolicies(parsed.activeEdicts);
                }

                // 2. Rehydrate Metrics
                if (parsed.metrics) {
                    this.game.metrics = parsed.metrics;
                }

                // 3. Rehydrate Grid & Rebuild Three.js Instanced Meshes
                const tiles = parsed.grid || parsed.tiles || [];
                const tilesMapOrArray = Array.isArray(tiles) ? tiles : Object.values(tiles);
                this.game.grid.loadFromMap(tilesMapOrArray);
            }

            // 4. Update HUD and visual ambiance
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
