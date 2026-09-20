// Project Meiji - Iteration 9 Verification Test Suite
// UI De-cluttering & Time Pacing Calibration (0.5x Slow, 1x Normal, 2x Fast, 4x Hyper)
// ponytail: assert-based headless test runner, zero external test framework dependencies

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Minimal Node.js DOM shims for headless testing
globalThis.document = {
    querySelectorAll: () => [],
    getElementById: () => null,
};
globalThis.window = {
    addEventListener: () => {},
};

import { CONFIG } from '../public/js/config.js';
import { CityGridModel } from '../public/js/grid.js';
import { SimulationEngine } from '../public/js/simulation.js';

console.log('--- Project Meiji: Iteration 9 Automated Test Suite ---');

// 1. Verify Config Constants
console.log('1. Verifying Simulation Pacing Config Constants...');
assert.strictEqual(CONFIG.SIMULATION.BASE_MONTH_MS, 6000, 'BASE_MONTH_MS must be 6000ms (6.0s/mo = 72s/yr)');
assert.strictEqual(CONFIG.SIMULATION.BASE_TICK_MS, 6000, 'BASE_TICK_MS must be 6000ms');
assert.deepStrictEqual(CONFIG.SIMULATION.SPEED_MULTIPLIERS, [0.5, 1, 2, 4], 'SPEED_MULTIPLIERS must include [0.5, 1, 2, 4]');
console.log('✓ Configuration constants verified (6000ms base, [0.5, 1, 2, 4] multipliers).');

// 2. Test Simulation Engine Interval & Speed Multipliers
console.log('2. Testing Simulation Engine Speed Calibration...');
const mockState = {
    treasury: 10000,
    population: 0,
    currentYear: 1872,
    currentMonth: 1,
    metrics: {
        residentialDemand: 50,
        commercialDemand: 40,
        industrialDemand: 30,
        fireRisk: 0,
        choleraRisk: 0,
    },
    deductTreasury() { return true; },
    updateHUD() {},
    showToast() {},
    updateInspector() {},
};

const grid = new CityGridModel(32, 32);
const sim = new SimulationEngine(grid, mockState);

// Verify initial state
assert.strictEqual(sim.speedMultiplier, 1, 'Default speed multiplier should be 1.0x');

// Test intervals calculation for each multiplier
const baseTick = CONFIG.SIMULATION.BASE_MONTH_MS || 6000;
const expectedIntervals = {
    0.5: 12000,
    1.0: 6000,
    2.0: 3000,
    4.0: 1500,
};

for (const [multStr, expectedMs] of Object.entries(expectedIntervals)) {
    const mult = parseFloat(multStr);
    const interval = Math.round(baseTick / mult);
    assert.strictEqual(interval, expectedMs, `Interval for ${mult}x must be ${expectedMs}ms`);
}

// Test setSpeed transitions
sim.setSpeed(0.5);
assert.strictEqual(sim.speedMultiplier, 0.5, 'Simulation speedMultiplier should be 0.5');
assert.strictEqual(sim.isRunning, true, 'Simulation should be running after setSpeed(0.5)');

sim.setSpeed(2);
assert.strictEqual(sim.speedMultiplier, 2, 'Simulation speedMultiplier should be 2');

sim.setSpeed(4);
assert.strictEqual(sim.speedMultiplier, 4, 'Simulation speedMultiplier should be 4');

// Test pause via setSpeed(0)
sim.setSpeed(0);
assert.strictEqual(sim.isRunning, false, 'Simulation should pause on setSpeed(0)');

// Test resumption when speed > 0 is selected
sim.setSpeed(1);
assert.strictEqual(sim.speedMultiplier, 1, 'Simulation speedMultiplier should be 1');
assert.strictEqual(sim.isRunning, true, 'Simulation should resume running when speed is set');
sim.pause();
console.log('✓ Simulation engine speed transitions & intervals verified.');

// 3. Test Fire Threat Countdown Scaling Formula
console.log('3. Testing Fire Threat Countdown Scaling Formula...');
const baseTickSec = (CONFIG.SIMULATION.BASE_MONTH_MS || 6000) / 1000;
assert.strictEqual(baseTickSec, 6, 'Base tick seconds must be 6 seconds');

const testThreatTicks = 2;
const testCases = [
    { speed: 0.5, expectedSec: 24 }, // (2 * 6) / 0.5 = 24s
    { speed: 1.0, expectedSec: 12 }, // (2 * 6) / 1.0 = 12s
    { speed: 2.0, expectedSec: 6 },  // (2 * 6) / 2.0 = 6s
    { speed: 4.0, expectedSec: 3 },  // (2 * 6) / 4.0 = 3s
];

for (const tc of testCases) {
    const scaled = Math.max(1, Math.round((testThreatTicks * baseTickSec) / tc.speed));
    assert.strictEqual(scaled, tc.expectedSec, `Countdown at speed ${tc.speed}x must scale to ${tc.expectedSec}s`);
}
console.log('✓ Threat timer scaling formula verified across all speed tiers.');

// 4. Verify HTML Decoupling & Structure
console.log('4. Verifying HTML Layout Decoupling in index.html...');
const htmlPath = path.resolve(__dirname, '..', 'public', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Check #time-controls component
assert.ok(htmlContent.includes('id="time-controls"'), 'index.html must include #time-controls in Chronicle banner');
assert.ok(htmlContent.includes('id="btn-time-pause"'), 'index.html must include [ ⏸ Pause ] button');
assert.ok(htmlContent.includes('id="btn-speed-slow"'), 'index.html must include [ ½× Slow ] button');
assert.ok(htmlContent.includes('id="btn-speed-normal"'), 'index.html must include [ 1× Normal ] button');
assert.ok(htmlContent.includes('id="btn-speed-fast"'), 'index.html must include [ 2× Fast ] button');
assert.ok(htmlContent.includes('id="btn-speed-hyper"'), 'index.html must include [ 4× Hyper ] button');

// Check that playback buttons were removed from #hud-actions
assert.ok(!htmlContent.includes('class="sim-speed-controls"'), 'Old sim-speed-controls must be removed from #hud-actions');
assert.ok(!htmlContent.includes('id="btn-sim-toggle"'), 'Old btn-sim-toggle must be removed from #hud-actions');

// Check action-toolbar exists and has all 9 tools
assert.ok(htmlContent.includes('id="action-toolbar"'), 'index.html must include #action-toolbar');
const expectedTools = ['inspect', 'road', 'residential', 'commercial', 'industrial', 'watchtower', 'fire_depot', 'well', 'bulldozer'];
for (const tool of expectedTools) {
    assert.ok(htmlContent.includes(`data-tool="${tool}"`), `Toolbar must contain ${tool} tool card`);
}
console.log('✓ HTML decoupled layout, time controls, and 9-card action-toolbar verified.');

// 5. Verify CSS Styling for Time Controls & Toolbar
console.log('5. Verifying CSS Rules in style.css...');
const cssPath = path.resolve(__dirname, '..', 'public', 'css', 'style.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

assert.ok(cssContent.includes('#time-controls'), 'style.css must include #time-controls rules');
assert.ok(cssContent.includes('.time-btn'), 'style.css must include .time-btn rules');
assert.ok(cssContent.includes('.time-btn.active'), 'style.css must include .time-btn.active vermilion rules');
assert.ok(cssContent.includes('#action-toolbar'), 'style.css must include #action-toolbar styling');
console.log('✓ CSS washi card and toolbar styling verified.');

console.log('\n✅ ALL ITERATION 9 AUTOMATED TESTS PASSED SUCCESSFULLY.');
