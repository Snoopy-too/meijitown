// Project Meiji - Iteration 27 Automated Verification Test Suite (test_iteration27.js)
// Tests: File size audit, Washi Confirmation Modal service, Shrine Park 4-tile leisure propagation,
// and Surveyor's Scope leisure inspection strings.

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Node.js DOM & Web API shims
const mockElements = new Map();
function createMockElement(tag, id = '') {
    const classes = new Set();
    const children = [];
    const eventListeners = new Map();
    const el = {
        tagName: tag.toUpperCase(),
        id,
        _className: '',
        set className(val) {
            this._className = val;
            classes.clear();
            val.split(' ').filter(Boolean).forEach(c => classes.add(c));
        },
        get className() {
            return this._className || Array.from(classes).join(' ');
        },
        classList: {
            add: (c) => classes.add(c),
            remove: (c) => classes.delete(c),
            contains: (c) => classes.has(c)
        },
        dataset: {},
        style: {},
        textContent: '',
        innerHTML: '',
        children,
        appendChild: (child) => {
            child._parent = el;
            children.push(child);
            return child;
        },
        querySelector: (sel) => {
            if (sel.startsWith('#')) {
                const searchId = sel.slice(1);
                return mockElements.get(searchId) || null;
            }
            return null;
        },
        querySelectorAll: () => [],
        addEventListener: (event, cb) => {
            if (!eventListeners.has(event)) eventListeners.set(event, []);
            eventListeners.get(event).push(cb);
        },
        dispatchEvent: (event) => {
            const list = eventListeners.get(event.type) || [];
            list.forEach(cb => cb(event));
        },
        click: () => {
            const list = eventListeners.get('click') || [];
            list.forEach(cb => cb({ target: el }));
        }
    };
    return el;
}

globalThis.document = {
    documentElement: { lang: 'en' },
    body: {
        appendChild: (child) => child
    },
    querySelectorAll: () => [],
    getElementById: (id) => {
        if (!mockElements.has(id)) mockElements.set(id, createMockElement('div', id));
        return mockElements.get(id);
    },
    createElement: (tag) => createMockElement(tag),
};

globalThis.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    devicePixelRatio: 1,
    innerWidth: 1280,
    innerHeight: 720,
};

const mockStorage = new Map();
globalThis.localStorage = {
    getItem: (k) => mockStorage.get(k) || null,
    setItem: (k, v) => mockStorage.set(k, String(v)),
    removeItem: (k) => mockStorage.delete(k),
    clear: () => mockStorage.clear()
};

// Module imports
import { CONFIG } from '../public/js/config.js';
import { CityGridModel } from '../public/js/grid.js';
import { ModalManager, modalManager } from '../public/js/ui/modalManager.js';
import { LeisureSystem, LEISURE_PROVIDERS } from '../public/js/simulation/leisureSystem.js';
import { HappinessSystem } from '../public/js/simulation/happiness_system.js';
import { SurveyorScope } from '../public/js/ui/surveyor_scope.js';
import { i18n } from '../public/js/i18n.js';

console.log("=== Project Meiji: Iteration 27 Automated Test Suite ===\n");

// ---------------------------------------------------------------------------
// Test 1: File Size Audit & Governance Limits
// ---------------------------------------------------------------------------
console.log("Test 1: File Size Audit & Governance Limits...");
const criticalLimits = {
    'public/js/ui/modalManager.js': 300,
    'public/js/simulation/leisureSystem.js': 300,
    'public/js/leisureSystem.js': 100,
    'public/js/ui/surveyor_scope.js': 400,
    'public/js/simulation.js': 350,
    'public/js/simulation/happiness_system.js': 200,
    'public/js/app.js': 350,
};

for (const [relPath, maxLines] of Object.entries(criticalLimits)) {
    const fullPath = path.join(rootDir, relPath);
    assert.ok(fs.existsSync(fullPath), `Critical file missing: ${relPath}`);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const lineCount = content.split('\n').length;
    assert.ok(
        lineCount <= maxLines,
        `File ${relPath} exceeded line limit: ${lineCount} > ${maxLines}`
    );
    console.log(`  ✓ ${relPath}: ${lineCount} lines (Budget <= ${maxLines})`);
}
console.log("✓ Test 1 Passed: All modified and new modules strictly comply with file size governance.\n");

// ---------------------------------------------------------------------------
// Test 2: Stylized Washi Confirmation Modal Service (Issue 1)
// ---------------------------------------------------------------------------
console.log("Test 2: Stylized Washi Confirmation Modal Service...");

const modal = new ModalManager();

// 1. Confirm dialog resolves true on confirm button click
const confirmPromiseTrue = modal.confirm({
    title: "Reset Settlement?",
    message: "Clear all tiles?",
    confirmText: "Reset",
    cancelText: "Cancel"
});
assert.strictEqual(modal.dom.title.textContent, "Reset Settlement?");
assert.strictEqual(modal.dom.message.textContent, "Clear all tiles?");
assert.strictEqual(modal.dom.overlay.style.display, "flex");
assert.strictEqual(modal.dom.overlay.classList.contains('hidden'), false);

modal.dom.okBtn.click();
const resultTrue = await confirmPromiseTrue;
assert.strictEqual(resultTrue, true, "Confirm dialog must resolve true when Confirm button is clicked");
assert.strictEqual(modal.dom.overlay.style.display, "none");
assert.strictEqual(modal.dom.overlay.classList.contains('hidden'), true);

// 2. Confirm dialog resolves false on cancel button click
const confirmPromiseFalse = modal.confirm({
    title: "Overwrite Save?",
    message: "Overwrite Slot #1?"
});
modal.dom.cancelBtn.click();
const resultFalse = await confirmPromiseFalse;
assert.strictEqual(resultFalse, false, "Confirm dialog must resolve false when Cancel button is clicked");

// 3. Confirm dialog resolves false on overlay scrim click
const confirmPromiseScrim = modal.confirm({
    title: "Quit to Title?",
    message: "Unsaved progress will be lost."
});
modal.dom.overlay.dispatchEvent({ type: 'click', target: modal.dom.overlay });
const resultScrim = await confirmPromiseScrim;
assert.strictEqual(resultScrim, false, "Confirm dialog must resolve false on scrim click");

// 4. Alert dialog resolves on OK
const alertPromise = modal.alert({
    title: "Imperial Notice",
    message: "Meiji Charter Received!"
});
assert.strictEqual(modal.dom.cancelBtn.style.display, "none");
modal.dom.okBtn.click();
await alertPromise;

console.log("✓ Test 2 Passed: ModalManager confirm/alert lifecycle and promise resolutions verified.\n");

// ---------------------------------------------------------------------------
// Test 3: Shrine Park (Jinja) 4-Tile Radial Walking Aura & Satisfaction (Issue 2)
// ---------------------------------------------------------------------------
console.log("Test 3: Shrine Park 4-Tile Radial Walking Aura & Satisfaction...");

const grid = new CityGridModel(32, 32);
const mockState = {
    metrics: { townHappiness: 65 },
    showToast: () => {}
};

const leisure = new LeisureSystem(grid, mockState);
const happiness = new HappinessSystem(grid, mockState);
happiness.leisure = leisure;

// Place a Shrine Park at (10, 10)
grid.setTile(10, 10, CONFIG.TYPES.SERVICE, null, 1);
const shrineTile = grid.getTile(10, 10);
shrineTile.serviceType = CONFIG.SERVICES.SHRINE_PARK;

// Test 4-tile radial aura:
// Within 4 tiles:
assert.strictEqual(leisure.isShrineCovered(10, 10), true, "Center tile is covered");
assert.strictEqual(leisure.isShrineCovered(10, 14), true, "Tile at distance 4 (10, 14) is covered");
assert.strictEqual(leisure.isShrineCovered(14, 10), true, "Tile at distance 4 (14, 10) is covered");
assert.strictEqual(leisure.isShrineCovered(7, 10), true, "Tile at distance 3 (7, 10) is covered");

// Outside 4 tiles:
assert.strictEqual(leisure.isShrineCovered(10, 15), false, "Tile at distance 5 (10, 15) must NOT be covered");
assert.strictEqual(leisure.isShrineCovered(13, 13), false, "Tile at distance ~4.24 (13, 13) must NOT be covered");

// Verify residential happiness bonus (+10% satisfaction)
// Place residential zone at (10, 12) (distance 2, inside shrine aura)
grid.setTile(10, 12, CONFIG.TYPES.ZONE, null, 1);
const resNearShrine = grid.getTile(10, 12);
resNearShrine.zoneType = CONFIG.ZONES.RESIDENTIAL;
resNearShrine.stage = CONFIG.STAGES.BUILT;
resNearShrine.level = 1;

const scoreWithShrine = happiness.getResidentialHappiness(resNearShrine);

// Place isolated residential zone at (25, 25) (far away, outside shrine aura)
grid.setTile(25, 25, CONFIG.TYPES.ZONE, null, 1);
const resFarAway = grid.getTile(25, 25);
resFarAway.zoneType = CONFIG.ZONES.RESIDENTIAL;
resFarAway.stage = CONFIG.STAGES.BUILT;
resFarAway.level = 1;

const scoreWithoutShrine = happiness.getResidentialHappiness(resFarAway);

// Both have base score 25, so resNearShrine gets 25 + 10 = 35, while resFarAway gets 25
assert.strictEqual(scoreWithShrine - scoreWithoutShrine, 10, "Shrine aura must grant exactly +10% residential satisfaction");

console.log("✓ Test 3 Passed: 4-tile radial walking aura and +10% residential satisfaction verified.\n");

// ---------------------------------------------------------------------------
// Test 4: Surveyor's Scope Inspection for Shrine Leisure (Issue 2)
// ---------------------------------------------------------------------------
console.log("Test 4: Surveyor's Scope Inspection for Shrine Leisure...");

const domType = createMockElement('span', 'insp-type');
const domStage = createMockElement('span', 'insp-stage');
const domLeisure = createMockElement('span', 'insp-leisure');
mockElements.set('insp-type', domType);
mockElements.set('insp-stage', domStage);
mockElements.set('insp-leisure', domLeisure);

const scope = new SurveyorScope(createMockElement('div'), mockState);

const mockSim = {
    isOchayaCovered: () => false,
    isSentoCovered: () => false,
    isShrineCovered: (x, y) => leisure.isShrineCovered(x, y),
    isWellCovered: () => false,
    isOrderCovered: () => false,
    isEducationCovered: () => false,
    getTileFireRiskDetails: () => ({ risk: 0, protected: true }),
    happiness
};

// 1. Inspect house covered only by Shrine in English
i18n.setLanguage('en');
scope.update(10, 12, grid, mockSim);
assert.strictEqual(
    scope.dom.leisure.textContent,
    "Shrine (Blessed / +10% Satisfaction)",
    `Expected EN shrine string, got: ${scope.dom.leisure.textContent}`
);

// 2. Inspect house covered only by Shrine in Japanese
i18n.setLanguage('ja');
scope.update(10, 12, grid, mockSim);
assert.strictEqual(
    scope.dom.leisure.textContent,
    "鎮守の杜 (参拝圏内 / 満足度+10%)",
    `Expected JA shrine string, got: ${scope.dom.leisure.textContent}`
);
i18n.setLanguage('en');

// 3. Inspect house outside shrine radius (no leisure)
scope.update(25, 25, grid, mockSim);
assert.strictEqual(scope.dom.leisure.textContent, "None", "Far away house must show 'None' leisure");

console.log("✓ Test 4 Passed: Surveyor's Scope displays exact bilingual blessed shrine strings.\n");

// ---------------------------------------------------------------------------
console.log("=================================================");
console.log("🎉 ALL ITERATION 27 AUTOMATED TESTS PASSED (4/4)");
console.log("=================================================\n");
