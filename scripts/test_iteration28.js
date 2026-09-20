// Project Meiji - Iteration 28 Automated Verification Test Suite (test_iteration28.js)
// ponytail: speed recalibration verification, tool catalog schema integrity, and file size governance

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('--- Project Meiji: Iteration 28 Verification Test Suite ---');

// 1. Strict File Size Audit
console.log('1. Checking File Size Governance...');
const toolCatalogPath = path.join(rootDir, 'public', 'js', 'config', 'toolCatalogData.js');
assert.strictEqual(fs.existsSync(toolCatalogPath), true, 'toolCatalogData.js must exist');
const toolCatalogContent = fs.readFileSync(toolCatalogPath, 'utf8');
const toolCatalogLines = toolCatalogContent.split('\n').length;
console.log(`   toolCatalogData.js line count: ${toolCatalogLines}`);
assert.strictEqual(toolCatalogLines < 250, true, `toolCatalogData.js must be < 250 lines (currently ${toolCatalogLines})`);

const filesToCheck = [
    'public/js/config.js',
    'public/js/simulation/time_manager.js',
    'public/js/app.js',
    'public/js/ui/keyboard_router.js',
    'public/js/ui/chronicle_banner.js',
    'public/js/ui/build_drawer.js',
    'public/js/tools.js',
    'public/index.html'
];

for (const relPath of filesToCheck) {
    const filePath = path.join(rootDir, relPath);
    if (fs.existsSync(filePath)) {
        const count = fs.readFileSync(filePath, 'utf8').split('\n').length;
        assert.strictEqual(count <= 600, true, `${relPath} must be <= 600 lines (currently ${count})`);
        console.log(`   ✓ ${relPath}: ${count} lines`);
    }
}
console.log('  ✓ File size limits strictly satisfied.');

// 2. Simulation Speed Recalibration
console.log('2. Testing Simulation Speed Recalibration...');
import { CONFIG } from '../public/js/config.js';

assert.strictEqual(CONFIG.SIMULATION.BASE_MONTH_MS, 12000, 'BASE_MONTH_MS must be 12000ms');
assert.strictEqual(CONFIG.SIMULATION.BASE_TICK_MS, 12000, 'BASE_TICK_MS must be 12000ms');
assert.deepStrictEqual(CONFIG.SIMULATION.SPEED_MULTIPLIERS, [1, 2, 3, 5], 'SPEED_MULTIPLIERS must be [1, 2, 3, 5]');
assert.deepStrictEqual(CONFIG.SIMULATION.SPEED_INTERVALS, { 1: 12000, 2: 6000, 3: 3000, 5: 1500 }, 'SPEED_INTERVALS mapping');

import { TimeManager } from '../public/js/simulation/time_manager.js';

let tickCount = 0;
const mockState = {
    currentMonth: 1,
    currentYear: 1872,
    showToast: () => {},
    renderer: null
};

const tm = new TimeManager(mockState, () => { tickCount++; });
assert.strictEqual(tm.speedMultiplier, 1, 'Initial speed multiplier must be 1');

// Test allowed speed adjustments
tm.setSpeed(2);
assert.strictEqual(tm.speedMultiplier, 2, 'Speed multiplier updated to 2');
tm.setSpeed(3);
assert.strictEqual(tm.speedMultiplier, 3, 'Speed multiplier updated to 3');
tm.setSpeed(5);
assert.strictEqual(tm.speedMultiplier, 5, 'Speed multiplier updated to 5');
tm.setSpeed(1);
assert.strictEqual(tm.speedMultiplier, 1, 'Speed multiplier updated to 1');

// Test rejection of invalid speeds
tm.setSpeed(0.5);
assert.strictEqual(tm.speedMultiplier, 1, 'Old 0.5x speed multiplier rejected');
tm.setSpeed(4);
assert.strictEqual(tm.speedMultiplier, 1, 'Old 4x speed multiplier rejected');

// Test pause via setSpeed(0)
tm.setSpeed(0);
assert.strictEqual(tm.isRunning, false, 'Speed 0 successfully pauses simulation');
console.log('  ✓ Simulation speed scale & intervals verified.');

// 3. UI Controls in index.html
console.log('3. Verifying UI Controls in public/index.html...');
const indexHtml = fs.readFileSync(path.join(rootDir, 'public', 'index.html'), 'utf8');

assert.strictEqual(indexHtml.includes('data-speed="0"'), true, 'Pause button (data-speed="0") present');
assert.strictEqual(indexHtml.includes('data-speed="1"'), true, '1x button (data-speed="1") present');
assert.strictEqual(indexHtml.includes('data-speed="2"'), true, '2x button (data-speed="2") present');
assert.strictEqual(indexHtml.includes('data-speed="3"'), true, '3x button (data-speed="3") present');
assert.strictEqual(indexHtml.includes('data-speed="5"'), true, '5x button (data-speed="5") present');

// Verify 1x has active class by default
const button1xMatch = indexHtml.match(/<button[^>]*data-speed=["']1["'][^>]*>/);
assert(button1xMatch, '1x speed button element found');
assert(button1xMatch[0].includes('active'), '1x speed button must have active class by default');

// Verify pause button is NOT active by default
const pauseBtnMatch = indexHtml.match(/<button[^>]*data-speed=["']0["'][^>]*>/);
assert(pauseBtnMatch, 'Pause button element found');
assert(!pauseBtnMatch[0].includes('active'), 'Pause button must not be active by default');

// Verify button text contents: ⏸, 1x, 2x, 3x, 5x
assert.strictEqual(indexHtml.includes('>1x</button>'), true, '1x button label text present');
assert.strictEqual(indexHtml.includes('>2x</button>'), true, '2x button label text present');
assert.strictEqual(indexHtml.includes('>3x</button>'), true, '3x button label text present');
assert.strictEqual(indexHtml.includes('>5x</button>'), true, '5x button label text present');
console.log('  ✓ UI time controls markup verified.');

// 4. Tool Effects & Purpose Data Layer
console.log('4. Verifying Tool Catalog Data Layer (toolCatalogData.js)...');
import { TOOL_CATALOG, getToolCatalogEntry } from '../public/js/config/toolCatalogData.js';

assert(TOOL_CATALOG, 'TOOL_CATALOG exported');
assert.strictEqual(typeof getToolCatalogEntry, 'function', 'getToolCatalogEntry function exported');

// Check spec items
const well = TOOL_CATALOG.well;
assert(well, 'well item present');
assert.strictEqual(well.name.en, 'Well (Ido)');
assert.strictEqual(well.name.ja, '井戸');
assert.strictEqual(well.cost, 80);
assert.strictEqual(well.upkeep, 2);
assert.strictEqual(typeof well.effect.en, 'string');
assert.strictEqual(typeof well.effect.ja, 'string');
assert.strictEqual(well.category, 'civic');

const watchtower = TOOL_CATALOG.fire_watchtower;
assert(watchtower, 'fire_watchtower present');
assert.strictEqual(watchtower.cost, 250);
assert.strictEqual(watchtower.upkeep, 5);
assert.strictEqual(watchtower.category, 'civic');

const shrinePark = TOOL_CATALOG.shrine_park;
assert(shrinePark, 'shrine_park present');
assert.strictEqual(shrinePark.cost, 50);
assert.strictEqual(shrinePark.upkeep, 0);
assert.strictEqual(shrinePark.category, 'leisure');

// Verify total catalog item count
const keys = Object.keys(TOOL_CATALOG);
console.log(`   Total tools defined in catalog: ${keys.length}`);
assert.strictEqual(keys.length >= 20, true, 'At least 20 tools populated');

// Verify all entries have valid schema
for (const [key, item] of Object.entries(TOOL_CATALOG)) {
    assert(item.name && typeof item.name.en === 'string' && typeof item.name.ja === 'string', `${key} must have bilingual name`);
    assert(typeof item.cost === 'number', `${key} cost must be a number`);
    assert(typeof item.upkeep === 'number', `${key} upkeep must be a number`);
    assert(item.effect && typeof item.effect.en === 'string' && typeof item.effect.ja === 'string', `${key} must have bilingual effect`);
    assert(typeof item.category === 'string', `${key} category must be string`);
}

// Test helper lookup
assert.strictEqual(getToolCatalogEntry('well'), TOOL_CATALOG.well);
assert.strictEqual(getToolCatalogEntry('fire_watchtower'), TOOL_CATALOG.fire_watchtower);
assert.strictEqual(getToolCatalogEntry('watchtower'), TOOL_CATALOG.fire_watchtower);
assert.strictEqual(getToolCatalogEntry('ROAD'), TOOL_CATALOG.road);
assert.strictEqual(getToolCatalogEntry('monument_pavilion'), TOOL_CATALOG.monument_pavilion);
assert.strictEqual(getToolCatalogEntry('pavilion'), TOOL_CATALOG.monument_pavilion);
assert.strictEqual(getToolCatalogEntry('non_existent'), null);

console.log('  ✓ Tool catalog metadata, schemas, and lookups verified.');
console.log('\n>>> All Iteration 28 tests passed successfully! <<<');
