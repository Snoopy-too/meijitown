// Project Meiji - Iteration 26 Automated Verification Test Suite (test_iteration26.js)
// Tests: File size audit, Multi-tile footprint previews & clearance, Tile identity fix in Surveyor's Scope,
// and Milestone tier gating enforcement in catalogue.

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Node.js DOM & Web API shims for tests
const mockElements = new Map();
function createMockElement(tag, id = '') {
    const classes = new Set();
    const children = [];
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
            if (sel === '.item-name') return el._nameSpan || null;
            if (sel === '.item-lock-badge') return children.find(c => c.classList && c.classList.contains('item-lock-badge')) || null;
            return null;
        },
        querySelectorAll: () => [],
        addEventListener: () => {},
        remove: () => {
            if (el._parent && el._parent.children) {
                const idx = el._parent.children.indexOf(el);
                if (idx !== -1) el._parent.children.splice(idx, 1);
            }
        }
    };
    return el;
}

globalThis.document = {
    documentElement: { lang: 'en' },
    querySelectorAll: (sel) => {
        if (sel === '.drawer-item-btn') return Array.from(mockElements.values());
        return [];
    },
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
import * as THREE from 'three';
import { CONFIG } from '../public/js/config.js';
import { CityGridModel } from '../public/js/grid.js';
import { ToolController } from '../public/js/tools.js';
import { PowerSystem } from '../public/js/powerSystem.js';
import { SanitationSystem } from '../public/js/simulation/sanitation_system.js';
import { MilestoneManager } from '../public/js/milestoneManager.js';
import { SurveyorScope } from '../public/js/ui/surveyor_scope.js';
import { BuildDrawer, TOOL_TIER_REQUIREMENTS } from '../public/js/ui/build_drawer.js';
import { getFootprint, getFootprintTiles, isFootprintClear, TOOL_FOOTPRINTS } from '../public/js/footprintPreview.js';
import { GhostCursorManager } from '../public/js/renderer/ghost_cursor.js';
import { i18n } from '../public/js/i18n.js';

console.log("=== Project Meiji: Iteration 26 Automated Test Suite ===\n");

function createMockState(grid) {
    const state = {
        treasury: 15000,
        population: 12,
        currentYear: 1878,
        currentMonth: 1,
        showToast: () => {},
        deductTreasury: (amt) => {
            if (state.treasury >= amt) {
                state.treasury -= amt;
                return true;
            }
            return false;
        }
    };
    state.powerSystem = new PowerSystem(grid, state);
    state.sanitation = new SanitationSystem(grid, state);
    state.milestoneManager = new MilestoneManager(state);
    state.milestones = state.milestoneManager;
    return state;
}

// ---------------------------------------------------------------------------
// Test 1: File Size Audit & Governance Limits
// ---------------------------------------------------------------------------
console.log("Test 1: File Size Audit & Governance Limits...");
const criticalLimits = {
    'public/js/footprintPreview.js': 100,
    'public/js/tools.js': 300,
    'public/js/toolActionDispatcher.js': 300,
    'public/js/ui/build_drawer.js': 350,
    'public/js/ui/surveyor_scope.js': 400,
    'public/js/renderer/ghost_cursor.js': 200,
    'public/js/meshes/civicMeshFactory.js': 300,
    'public/js/milestoneManager.js': 350,
    'public/js/powerSystem.js': 200,
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
// Test 2: Multi-Tile Footprint Previews & Clearance Checks (Issue A)
// ---------------------------------------------------------------------------
console.log("Test 2: Multi-Tile Footprint Previews & Vacancy Checks...");

// 1. Validate footprint dimensions
assert.deepStrictEqual(getFootprint(CONFIG.TOOLS.ROAD), { w: 1, h: 1 });
assert.deepStrictEqual(getFootprint(CONFIG.TOOLS.WATCHTOWER), { w: 1, h: 1 });
assert.deepStrictEqual(getFootprint(CONFIG.TOOLS.SCHOOL), { w: 2, h: 2 });
assert.deepStrictEqual(getFootprint(CONFIG.TOOLS.HARBOR_PIER), { w: 2, h: 2 });
assert.deepStrictEqual(getFootprint(CONFIG.TOOLS.POWER_PLANT), { w: 2, h: 2 });
assert.deepStrictEqual(getFootprint(CONFIG.TOOLS.WATERWORKS), { w: 2, h: 1 });
assert.deepStrictEqual(getFootprint(CONFIG.TOOLS.WATERWORKS, 1), { w: 1, h: 2 }); // Rotated 90°
assert.deepStrictEqual(getFootprint(CONFIG.TOOLS.PAVILION), { w: 3, h: 3 });

// 2. Validate tile coordinate expansion
const tiles2x2 = getFootprintTiles(5, 5, CONFIG.TOOLS.POWER_PLANT);
assert.strictEqual(tiles2x2.length, 4);
assert.deepStrictEqual(tiles2x2, [
    { x: 5, y: 5 }, { x: 6, y: 5 },
    { x: 5, y: 6 }, { x: 6, y: 6 }
]);

const tiles3x3 = getFootprintTiles(10, 10, CONFIG.TOOLS.PAVILION);
assert.strictEqual(tiles3x3.length, 9);
assert.strictEqual(tiles3x3[0].x, 10);
assert.strictEqual(tiles3x3[8].x, 12);
assert.strictEqual(tiles3x3[8].y, 12);

// 3. Validate footprint clearance against obstacle tiles
const grid = new CityGridModel(32, 32);
assert.strictEqual(isFootprintClear(grid, 5, 5, CONFIG.TOOLS.POWER_PLANT), true);

// Place road obstruction on one tile of the 2x2 footprint
grid.setTile(6, 6, CONFIG.TYPES.ROAD, null, 1);
assert.strictEqual(isFootprintClear(grid, 5, 5, CONFIG.TOOLS.POWER_PLANT), false);
grid.clearTile(6, 6);
assert.strictEqual(isFootprintClear(grid, 5, 5, CONFIG.TOOLS.POWER_PLANT), true);

// Check out of bounds
assert.strictEqual(isFootprintClear(grid, 31, 31, CONFIG.TOOLS.POWER_PLANT), false);

// 4. GhostCursorManager scaling and opacity checks
const sceneMock = { add: () => {} };
const ghost = new GhostCursorManager(sceneMock);
ghost.update({ x: 4, y: 4 }, CONFIG.TOOLS.POWER_PLANT, true, null, 0);
assert.strictEqual(ghost.cursorBox.scale.x, 2);
assert.strictEqual(ghost.cursorBox.scale.z, 2);
assert.strictEqual(ghost.cursorBox.material.color.getHex(), 0x2ecc71);
assert.strictEqual(ghost.cursorBox.material.opacity, 0.45);

ghost.update({ x: 4, y: 4 }, CONFIG.TOOLS.POWER_PLANT, false, null, 0);
assert.strictEqual(ghost.cursorBox.material.color.getHex(), 0xe74c3c);
assert.strictEqual(ghost.cursorBox.material.opacity, 0.55);

console.log("✓ Test 2 Passed: Dynamic footprint dimensions, coordinate expansions, and cursor preview verified.\n");

// ---------------------------------------------------------------------------
// Test 3: Tile Identity Audit in Surveyor's Scope (Issue B)
// ---------------------------------------------------------------------------
console.log("Test 3: Tile Identity & Surveyor's Scope Inspection...");

const state = createMockState(grid);
const domType = createMockElement('span', 'insp-type');
const domStage = createMockElement('span', 'insp-stage');
mockElements.set('insp-type', domType);
mockElements.set('insp-stage', domStage);

const scope = new SurveyorScope(createMockElement('div'), state);

// 1. Power Plant Inspection
i18n.setLanguage('en');
grid.setTile(5, 5, CONFIG.TYPES.SERVICE, null, 1);
const powerTile = grid.getTile(5, 5);
powerTile.serviceType = CONFIG.SERVICES.POWER_PLANT;
powerTile.isOrigin = true;
powerTile.multiSize = 2;

scope.update(5, 5, grid, null);
assert.ok(scope.dom.type.textContent.includes("Coal Steam Power Plant"), `Expected Coal Steam Power Plant, got: ${scope.dom.type.textContent}`);
assert.ok(!scope.dom.type.textContent.includes("Watchtower"), "Must NOT report Watchtower!");
assert.ok(scope.dom.stage.textContent.includes("Active Grid Generator") && scope.dom.stage.textContent.includes("4-Tile Radius"), `Expected grid & pollution status, got: ${scope.dom.stage.textContent}`);

i18n.setLanguage('ja');
scope.update(5, 5, grid, null);
assert.ok(scope.dom.type.textContent.includes("火力発電所"), `Expected 火力発電所, got: ${scope.dom.type.textContent}`);
assert.ok(scope.dom.stage.textContent.includes("送電網供給中") && scope.dom.stage.textContent.includes("4町範囲"), `Expected Japanese grid status, got: ${scope.dom.stage.textContent}`);
i18n.setLanguage('en');

// 2. Waterworks Inspection
grid.setTile(8, 8, CONFIG.TYPES.SERVICE, null, 1);
const waterTile = grid.getTile(8, 8);
waterTile.serviceType = CONFIG.SERVICES.WATERWORKS;
waterTile.isOrigin = true;
waterTile.multiSize = 2;

scope.update(8, 8, grid, null);
assert.ok(scope.dom.type.textContent.includes("Modern Water Filtration Basin"), `Expected Water Filtration Basin, got: ${scope.dom.type.textContent}`);
assert.ok(scope.dom.stage.textContent.includes("18-Tile Clean Water Network Active"), `Expected 18-tile status, got: ${scope.dom.stage.textContent}`);

// 3. Pavilion Inspection
grid.setTile(12, 12, CONFIG.TYPES.SERVICE, null, 1);
const pavTile = grid.getTile(12, 12);
pavTile.serviceType = CONFIG.SERVICES.PAVILION;
pavTile.isOrigin = true;
pavTile.multiSize = 3;

scope.update(12, 12, grid, null);
assert.ok(scope.dom.type.textContent.includes("National Industrial Exhibition Pavilion"), `Expected Exhibition Pavilion, got: ${scope.dom.type.textContent}`);

// 4. Fire Watchtower Inspection
grid.setTile(16, 16, CONFIG.TYPES.SERVICE, null, 1);
const watchTile = grid.getTile(16, 16);
watchTile.serviceType = CONFIG.SERVICES.WATCHTOWER;

scope.update(16, 16, grid, null);
assert.ok(scope.dom.type.textContent.includes("Fire Watchtower"), `Expected Fire Watchtower, got: ${scope.dom.type.textContent}`);

console.log("✓ Test 3 Passed: Coal Steam Plant correctly identified, Watchtower confusion eliminated.\n");

// ---------------------------------------------------------------------------
// Test 4: Milestone Gating Enforcement in Catalogue (Issue C)
// ---------------------------------------------------------------------------
console.log("Test 4: Milestone Gating Enforcement in Catalogue...");

// Verify Tier Requirements Table
assert.strictEqual(TOOL_TIER_REQUIREMENTS[CONFIG.TOOLS.ROAD].tier, 1);
assert.strictEqual(TOOL_TIER_REQUIREMENTS[CONFIG.TOOLS.RESIDENTIAL].tier, 1);
assert.strictEqual(TOOL_TIER_REQUIREMENTS[CONFIG.TOOLS.CANAL].tier, 2);
assert.strictEqual(TOOL_TIER_REQUIREMENTS[CONFIG.TOOLS.WATCHTOWER].tier, 2);
assert.strictEqual(TOOL_TIER_REQUIREMENTS[CONFIG.TOOLS.RAIL_TRACK].tier, 3);
assert.strictEqual(TOOL_TIER_REQUIREMENTS[CONFIG.TOOLS.SCHOOL].tier, 3);
assert.strictEqual(TOOL_TIER_REQUIREMENTS[CONFIG.TOOLS.POWER_PLANT].tier, 4);
assert.strictEqual(TOOL_TIER_REQUIREMENTS[CONFIG.TOOLS.WATERWORKS].tier, 4);
assert.strictEqual(TOOL_TIER_REQUIREMENTS[CONFIG.TOOLS.PAVILION].tier, 4);

// Setup Mock Drawer Elements
mockElements.clear();
const btnRoad = createMockElement('button');
btnRoad.dataset.tool = 'road';
btnRoad._nameSpan = createMockElement('span');
btnRoad.appendChild(btnRoad._nameSpan);
mockElements.set('btn-road', btnRoad);

const btnCanal = createMockElement('button');
btnCanal.dataset.tool = 'canal';
btnCanal._nameSpan = createMockElement('span');
btnCanal.appendChild(btnCanal._nameSpan);
mockElements.set('btn-canal', btnCanal);

const btnSchool = createMockElement('button');
btnSchool.dataset.tool = 'school';
btnSchool._nameSpan = createMockElement('span');
btnSchool.appendChild(btnSchool._nameSpan);
mockElements.set('btn-school', btnSchool);

const btnPower = createMockElement('button');
btnPower.dataset.tool = 'power_plant';
btnPower._nameSpan = createMockElement('span');
btnPower.appendChild(btnPower._nameSpan);
mockElements.set('btn-power', btnPower);

const drawer = new BuildDrawer();

// At Tier 1 (Village):
drawer.updateTownTier(1);
assert.strictEqual(btnRoad.classList.contains('tool-locked'), false, "Road must be unlocked at T1");
assert.strictEqual(btnCanal.classList.contains('tool-locked'), true, "Canal must be locked at T1");
assert.strictEqual(btnSchool.classList.contains('tool-locked'), true, "School must be locked at T1");
assert.strictEqual(btnPower.classList.contains('tool-locked'), true, "Power plant must be locked at T1");

const canalBadge = btnCanal.querySelector('.item-lock-badge');
assert.ok(canalBadge, "Canal must show lock badge at T1");
assert.strictEqual(canalBadge.textContent, "🔒 T2 (100)");

const powerBadge = btnPower.querySelector('.item-lock-badge');
assert.ok(powerBadge, "Power plant must show lock badge at T1");
assert.strictEqual(powerBadge.textContent, "🔒 T4 (600)");

// Selecting locked tool via drawer is prevented
drawer.selectTool(CONFIG.TOOLS.POWER_PLANT);
assert.notStrictEqual(drawer.currentTool, CONFIG.TOOLS.POWER_PLANT, "Selecting locked tool in drawer must be blocked");

// At Tier 2 (Post Town):
drawer.updateTownTier(2);
assert.strictEqual(btnCanal.classList.contains('tool-locked'), false, "Canal must be unlocked at T2");
assert.strictEqual(btnCanal.querySelector('.item-lock-badge'), null, "Lock badge must be removed once unlocked");
assert.strictEqual(btnSchool.classList.contains('tool-locked'), true, "School must remain locked at T2");
assert.strictEqual(btnPower.classList.contains('tool-locked'), true, "Power plant must remain locked at T2");

// At Tier 4 (Metropolis):
drawer.updateTownTier(4);
assert.strictEqual(btnPower.classList.contains('tool-locked'), false, "Power plant must be unlocked at T4");
assert.strictEqual(btnPower.querySelector('.item-lock-badge'), null);

// Test ToolController enforcement:
const mockCanvas = createMockElement('canvas');
const toolCtrl = new ToolController(grid, { renderer: { domElement: mockCanvas }, updateCursor: () => {}, setBuildMode: () => {} }, state, drawer);
state.milestones.currentTier = 1;

// Attempt to set locked tool at T1
toolCtrl.setActiveTool(CONFIG.TOOLS.POWER_PLANT, false);
assert.notStrictEqual(toolCtrl.currentTool, CONFIG.TOOLS.POWER_PLANT, "ToolController must reject locked tool");

// Check placement validation returns false for locked tool
toolCtrl.currentTool = CONFIG.TOOLS.POWER_PLANT; // Forced assignment test
assert.strictEqual(toolCtrl.checkPlacementValid(10, 10), false, "Placement must fail when tier is insufficient");

console.log("✓ Test 4 Passed: Tier gating strictly enforced in drawer and tool controller.\n");

// ---------------------------------------------------------------------------
console.log("=================================================");
console.log("🎉 ALL ITERATION 26 AUTOMATED TESTS PASSED (4/4)");
console.log("=================================================\n");
