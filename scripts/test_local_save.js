// Project Meiji - Local Game Persistence Test Suite (test_local_save.js)
// Tests: Guest localStorage save & load, schema validation & sanitization,
// full rehydration (grid, vitals, chronicle, policies, milestones, stats), and API routing.

import assert from 'node:assert';
import { SaveManager } from '../public/js/saveManager.js';
import { CityGridModel } from '../public/js/grid.js';
import { CONFIG } from '../public/js/config.js';

console.log('=== Project Meiji: Local Storage Persistence Test Suite ===\n');

// 1. Mock LocalStorage Environment for Node.js
class MockLocalStorage {
    constructor() {
        this.store = new Map();
    }
    getItem(key) {
        return this.store.has(key) ? this.store.get(key) : null;
    }
    setItem(key, value) {
        this.store.set(String(key), String(value));
    }
    removeItem(key) {
        this.store.delete(key);
    }
    clear() {
        this.store.clear();
    }
}

globalThis.localStorage = new MockLocalStorage();

// Helper to create mock GameState
function createMockGame(isLoggedIn = false) {
    const grid = new CityGridModel(CONFIG.GRID_WIDTH, CONFIG.GRID_HEIGHT);
    const mockState = {
        cityName: 'Edo-Tokyo',
        treasury: 5000,
        population: 120,
        currentYear: 1874,
        currentMonth: 5,
        lastCashflow: 45,
        metrics: {
            traditionModernityBalance: 55,
            fireRisk: 15,
            choleraRisk: 5,
            townHappiness: 78,
            industrialDemand: 40,
            commercialDemand: 50,
            residentialDemand: 60,
        },
        grid: grid,
        policies: {
            policies: { night_watch: true, clean_water: false, modernization_subsidy: false },
            getActivePolicies() {
                return { ...this.policies };
            },
            setPolicies(p) {
                this.policies = { ...this.policies, ...p };
            }
        },
        milestones: {
            currentTier: 2,
            claimedTiers: [1, 2],
            hasTriumphCompleted: false,
            updateBadgeCalled: false,
            updateBadge() {
                this.updateBadgeCalled = true;
            }
        },
        drawer: {
            currentTier: 1,
            updateTownTier(tier) {
                this.currentTier = tier;
            }
        },
        stats: {
            foundingYear: 1872,
            foundingMonth: 1,
            totalTaxesCollected: 1250,
            firesExtinguished: 2,
            peakPopulation: 140,
            recordedEvents: [
                { year: 1872, month: 1, textEn: 'Founding of settlement.' }
            ]
        },
        authModal: {
            currentUser: isLoggedIn ? { id: 1, username: 'Mayor' } : null
        },
        toasts: [],
        showToast(msg, isError = false) {
            this.toasts.push({ msg, isError });
        },
        hudUpdated: false,
        updateHUD() {
            this.hudUpdated = true;
        }
    };
    return mockState;
}

// -------------------------------------------------------------
// Test 1: Empty State Detection
// -------------------------------------------------------------
console.log('Test 1: Empty Local Save Detection...');
localStorage.clear();
const game1 = createMockGame(false);
const saveMgr1 = new SaveManager(game1, null);

assert.strictEqual(saveMgr1.hasLocalSave(), false, 'hasLocalSave should return false when storage is empty');
assert.strictEqual(saveMgr1.getLocalSaveInfo(), null, 'getLocalSaveInfo should return null when storage is empty');
assert.strictEqual(saveMgr1.isUserLoggedIn(), false, 'Guest user should report isUserLoggedIn = false');
console.log('✓ Test 1 Passed: Empty state properly detected.\n');

// -------------------------------------------------------------
// Test 2: Local Save Export and Persistence
// -------------------------------------------------------------
console.log('Test 2: Export and Save Local Settlement...');
// Place a road and residential zone
game1.grid.setTile(5, 5, CONFIG.TYPES.ROAD);
game1.grid.setTile(5, 6, CONFIG.TYPES.ZONE, 'residential', 1, true);

const exported = saveMgr1.exportCityState();
assert.strictEqual(exported.cityName, 'Edo-Tokyo', 'Exported city name matches');
assert.strictEqual(exported.treasury, 5000, 'Exported treasury matches');
assert.strictEqual(exported.population, 120, 'Exported population matches');
assert.strictEqual(exported.currentYear, 1874, 'Exported year matches');
assert.strictEqual(exported.currentMonth, 5, 'Exported month matches');
assert.strictEqual(exported.activeEdicts.night_watch, true, 'Exported policies match');
assert.strictEqual(exported.milestones.currentTier, 2, 'Exported milestones match');
assert.strictEqual(exported.stats.totalTaxesCollected, 1250, 'Exported stats match');
assert.ok(exported.grid.length >= 2, 'Exported grid contains tiles');

saveMgr1.saveLocalCity(false);
assert.strictEqual(saveMgr1.hasLocalSave(), true, 'hasLocalSave should now return true');

const info = saveMgr1.getLocalSaveInfo();
assert.ok(info !== null, 'Local save metadata must exist');
assert.strictEqual(info.cityName, 'Edo-Tokyo', 'Metadata city name matches');
assert.strictEqual(info.currentYear, 1874, 'Metadata year matches');
assert.strictEqual(info.population, 120, 'Metadata population matches');
console.log('✓ Test 2 Passed: Local save exported and stored successfully.\n');

// -------------------------------------------------------------
// Test 3: Rehydration & Restoration from Local Save
// -------------------------------------------------------------
console.log('Test 3: Restoration and Rehydration on New Instance...');
// Create a new fresh game instance (as if player refreshed or reopened browser)
const freshGame = createMockGame(false);
// Reset vitals to blank state
freshGame.cityName = 'Unnamed';
freshGame.treasury = 0;
freshGame.population = 0;
freshGame.currentYear = 1872;
freshGame.currentMonth = 1;
freshGame.policies.policies.night_watch = false;
freshGame.milestones.currentTier = 1;
freshGame.stats.totalTaxesCollected = 0;
freshGame.grid = new CityGridModel(CONFIG.GRID_WIDTH, CONFIG.GRID_HEIGHT);

const freshSaveMgr = new SaveManager(freshGame, null);
assert.strictEqual(freshSaveMgr.hasLocalSave(), true, 'Fresh instance should see existing local save');

const loaded = freshSaveMgr.loadLocalCity(false);
assert.ok(loaded !== null, 'loadLocalCity should return loaded data');
assert.strictEqual(freshGame.cityName, 'Edo-Tokyo', 'City name rehydrated');
assert.strictEqual(freshGame.treasury, 5000, 'Treasury rehydrated');
assert.strictEqual(freshGame.population, 120, 'Population rehydrated');
assert.strictEqual(freshGame.currentYear, 1874, 'Year rehydrated');
assert.strictEqual(freshGame.currentMonth, 5, 'Month rehydrated');
assert.strictEqual(freshGame.policies.policies.night_watch, true, 'Policy rehydrated');
assert.strictEqual(freshGame.milestones.currentTier, 2, 'Milestones rehydrated');
assert.strictEqual(freshGame.drawer.currentTier, 2, 'Drawer tier updated');
assert.strictEqual(freshGame.stats.totalTaxesCollected, 1250, 'Historical stats rehydrated');

// Verify grid rehydration
const roadTile = freshGame.grid.getTile(5, 5);
assert.strictEqual(roadTile.type, CONFIG.TYPES.ROAD, 'Road tile rehydrated at (5,5)');
const zoneTile = freshGame.grid.getTile(5, 6);
assert.strictEqual(zoneTile.type, CONFIG.TYPES.ZONE, 'Zone tile rehydrated at (5,6)');
assert.strictEqual(zoneTile.zoneType, 'residential', 'Zone type is residential');
assert.strictEqual(zoneTile.level, 1, 'Zone level is 1');
console.log('✓ Test 3 Passed: Rehydration accurately restores full city state.\n');

// -------------------------------------------------------------
// Test 4: Security & Input Sanitization
// -------------------------------------------------------------
console.log('Test 4: Security & Input Sanitization...');
const dirtySave = {
    cityName: '<script>alert("xss")</script>Yokohama Town<b>',
    treasury: '99999',
    population: -50,
    currentYear: 1800, // before 1868
    currentMonth: 15,   // beyond 12
    metrics: { townHappiness: 150, fireRisk: -30 }
};

const sanitizationGame = createMockGame(false);
const sanitizationMgr = new SaveManager(sanitizationGame, null);
sanitizationMgr.applyCityState(dirtySave);

assert.strictEqual(sanitizationGame.cityName.includes('<script>'), false, 'HTML/Script tags must be stripped');
assert.strictEqual(sanitizationGame.cityName, 'alert("xss")Yokohama Town', 'Sanitized name matches stripped content');
assert.strictEqual(sanitizationGame.treasury, 99999, 'Treasury parsed to valid number');
assert.strictEqual(sanitizationGame.population, 0, 'Negative population clamped to >= 0');
assert.strictEqual(sanitizationGame.currentYear, 1868, 'Pre-Meiji year clamped to >= 1868');
assert.strictEqual(sanitizationGame.currentMonth, 12, 'Month 15 clamped to 12');
assert.strictEqual(sanitizationGame.metrics.townHappiness, 100, 'Happiness clamped to <= 100');
assert.strictEqual(sanitizationGame.metrics.fireRisk, 0, 'Fire risk clamped to >= 0');
console.log('✓ Test 4 Passed: Input sanitization, XSS stripping, and numeric clamping verified.\n');

// -------------------------------------------------------------
// Test 5: Guest vs Authenticated User Routing
// -------------------------------------------------------------
console.log('Test 5: Guest vs Authenticated User Routing...');
let apiSaveCalled = false;
const mockApi = {
    async saveCity(payload) {
        apiSaveCalled = true;
        return { success: true, slot_id: 1 };
    }
};

// 1. Guest save: should NOT call API
const guestGame = createMockGame(false);
const guestMgr = new SaveManager(guestGame, mockApi);
await guestMgr.saveCurrentCity();
assert.strictEqual(apiSaveCalled, false, 'Guest save must not call API');
assert.strictEqual(guestMgr.hasLocalSave(), true, 'Guest save must write to local storage');

// 2. Logged-in save: should call API
const loggedInGame = createMockGame(true);
const memberMgr = new SaveManager(loggedInGame, mockApi);
await memberMgr.saveCurrentCity();
assert.strictEqual(apiSaveCalled, true, 'Logged in member save must call API');
console.log('✓ Test 5 Passed: Routing cleanly distinguishes guests from authenticated players.\n');

// -------------------------------------------------------------
// Test 6: Clear Local Save on Reset
// -------------------------------------------------------------
console.log('Test 6: Clear Local Save...');
assert.strictEqual(guestMgr.hasLocalSave(), true, 'Local save exists before clear');
guestMgr.clearLocalSave();
assert.strictEqual(guestMgr.hasLocalSave(), false, 'Local save removed after clearLocalSave()');
console.log('✓ Test 6 Passed: Clear local save functionality verified.\n');

console.log('================================================================');
console.log('🎉 ALL LOCAL STORAGE PERSISTENCE TESTS PASSED (100%)!');
console.log('================================================================\n');
