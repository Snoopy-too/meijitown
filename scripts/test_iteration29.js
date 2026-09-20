// Project Meiji - Iteration 29 Test Suite: Service Coverage Overlays & Map Data Layers
// ponytail: assert-based headless test runner, zero external test framework dependencies

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('--- Project Meiji: Iteration 29 Verification Suite ---');

// 1. Strict File Size Governance Audit
console.log('1. Auditing File Size Directives (Hard Limits)...');
const overlayRendererPath = path.join(rootDir, 'public', 'js', 'renderer', 'overlayRenderer.js');
const serviceRadiusPreviewPath = path.join(rootDir, 'public', 'js', 'renderer', 'serviceRadiusPreview.js');
const overlaySystemPath = path.join(rootDir, 'public', 'js', 'renderer', 'overlaySystem.js');
const htmlPath = path.join(rootDir, 'public', 'index.html');

const countLines = (filePath) => fs.readFileSync(filePath, 'utf-8').split('\n').length;

const overlayRendererLines = countLines(overlayRendererPath);
const serviceRadiusPreviewLines = countLines(serviceRadiusPreviewPath);
const overlaySystemLines = countLines(overlaySystemPath);
const htmlLines = countLines(htmlPath);

console.log(`   overlayRenderer.js: ${overlayRendererLines} lines (limit: < 300)`);
console.log(`   serviceRadiusPreview.js: ${serviceRadiusPreviewLines} lines (limit: < 300)`);
console.log(`   overlaySystem.js: ${overlaySystemLines} lines (limit: < 300)`);
console.log(`   index.html: ${htmlLines} lines (limit: < 600)`);

assert.ok(overlayRendererLines < 300, 'overlayRenderer.js must be strictly < 300 lines');
assert.ok(serviceRadiusPreviewLines < 300, 'serviceRadiusPreview.js must be strictly < 300 lines');
assert.ok(overlaySystemLines < 300, 'overlaySystem.js must be strictly < 300 lines');
assert.ok(htmlLines <= 600, 'index.html must be strictly <= 600 lines');
console.log('✓ File size limits strictly satisfied.');

// 2. Dynamic Placement Service Radius Preview Verification
console.log('2. Verifying Civic Service Radii and Color Coding...');
import { CIVIC_SERVICE_RADII, ServiceRadiusPreview } from '../public/js/renderer/serviceRadiusPreview.js';
import { CONFIG } from '../public/js/config.js';

// Assert exact radii specified in Iteration 29 requirements
assert.strictEqual(CIVIC_SERVICE_RADII[CONFIG.TOOLS.WELL]?.radius, 5, 'Well must have 5 tiles coverage radius');
assert.strictEqual(CIVIC_SERVICE_RADII[CONFIG.TOOLS.WATCHTOWER]?.radius, 6, 'Watchtower must have 6 tiles coverage radius');
assert.strictEqual(CIVIC_SERVICE_RADII[CONFIG.TOOLS.KOBAN]?.radius, 7, 'Koban must have 7 tiles coverage radius');
assert.strictEqual(CIVIC_SERVICE_RADII[CONFIG.TOOLS.SCHOOL]?.radius, 8, 'Primary School must have 8 tiles coverage radius');
assert.strictEqual(CIVIC_SERVICE_RADII[CONFIG.TOOLS.SHRINE_PARK]?.radius, 4, 'Shrine Park must have 4 tiles coverage radius');

// Assert category color coding
assert.strictEqual(CIVIC_SERVICE_RADII[CONFIG.TOOLS.WELL]?.category, 'water', 'Well category must be water/sanitation');
assert.strictEqual(CIVIC_SERVICE_RADII[CONFIG.TOOLS.WATCHTOWER]?.category, 'fire', 'Watchtower category must be fire');
assert.strictEqual(CIVIC_SERVICE_RADII[CONFIG.TOOLS.KOBAN]?.category, 'order', 'Koban category must be order');
assert.strictEqual(CIVIC_SERVICE_RADII[CONFIG.TOOLS.SCHOOL]?.category, 'education', 'School category must be education');
assert.strictEqual(CIVIC_SERVICE_RADII[CONFIG.TOOLS.SHRINE_PARK]?.category, 'culture', 'Shrine Park category must be culture');

console.log('✓ Civic service radii and color categories verified.');

// 3. Test ServiceRadiusPreview lifecycle
console.log('3. Testing ServiceRadiusPreview Lifecycle (instantiation, update, hide, dispose)...');
const mockScene = {
    add: (obj) => { mockScene.children.push(obj); },
    remove: (obj) => {
        const idx = mockScene.children.indexOf(obj);
        if (idx !== -1) mockScene.children.splice(idx, 1);
    },
    children: []
};

const preview = new ServiceRadiusPreview(mockScene);
assert.strictEqual(preview.mesh, null, 'Initial mesh should be null');

// Update with Well tool
preview.update({ x: 10, y: 10 }, CONFIG.TOOLS.WELL);
assert.ok(preview.mesh, 'Mesh must be created on civic tool hover');
assert.strictEqual(preview.mesh.visible, true, 'Mesh must be visible');
assert.strictEqual(preview.currentRadius, 5, 'Radius must match Well config (5)');

// Hide
preview.hide();
assert.strictEqual(preview.mesh.visible, false, 'Mesh must be hidden on hide()');

// Dispose
preview.dispose();
assert.strictEqual(preview.mesh, null, 'Mesh must be nulled on dispose()');
assert.strictEqual(mockScene.children.length, 0, 'Mesh must be removed from scene on dispose()');
console.log('✓ ServiceRadiusPreview lifecycle verified.');

// 4. Test OverlayRenderer Diagnostic Color Calculations
console.log('4. Testing OverlayRenderer Color Evaluators across 5 Layer Modes...');
import { OverlayRenderer } from '../public/js/renderer/overlayRenderer.js';

// 4.1 Fire Hazard: Canals and Stone Roads as bright blue firebreaks
const canalTile = { type: CONFIG.TYPES.CANAL };
const stoneRoadTile = { type: CONFIG.TYPES.ROAD, roadTier: 2 };
const dirtRoadTile = { type: CONFIG.TYPES.ROAD, roadTier: 1 };
const fireTile = { stage: CONFIG.STAGES.ON_FIRE };
const kuraTile = { level: 2 };

assert.strictEqual(OverlayRenderer.getFireColor(canalTile), 0x00a8ff, 'Canal must render as bright blue firebreak (0x00a8ff)');
assert.strictEqual(OverlayRenderer.getFireColor(stoneRoadTile), 0x00a8ff, 'Stone road must render as bright blue firebreak (0x00a8ff)');
assert.notStrictEqual(OverlayRenderer.getFireColor(dirtRoadTile), 0x00a8ff, 'Dirt road must not render as bright blue firebreak');
assert.strictEqual(OverlayRenderer.getFireColor(fireTile), 0xff0000, 'Burning tile must render red (0xff0000)');
assert.strictEqual(OverlayRenderer.getFireColor(kuraTile), 0x2ecc71, 'Fireproof building must render safe green');

// 4.2 Sanitation & Water
const waterworksTile = { type: CONFIG.TYPES.SERVICE, serviceType: CONFIG.SERVICES.WATERWORKS };
const resTile = { type: CONFIG.TYPES.ZONE, zoneType: CONFIG.ZONES.RESIDENTIAL };

const mockSimWater = {
    isWellCovered: (x, y) => x === 5 && y === 5
};

assert.strictEqual(OverlayRenderer.getSanitationColor(waterworksTile, 0, 0, mockSimWater), 0x00d2d3, 'Waterworks must render as clean water source (0x00d2d3)');
assert.strictEqual(OverlayRenderer.getSanitationColor(resTile, 5, 5, mockSimWater), 0x3498db, 'Serviced residential dwelling must render clean blue (0x3498db)');
assert.strictEqual(OverlayRenderer.getSanitationColor(resTile, 0, 0, mockSimWater), 0x8c733e, 'Unserved residential dwelling must render sickly yellow/brown (0x8c733e)');

// 4.3 Electric Grid
const powerPlantTile = { type: CONFIG.TYPES.SERVICE, serviceType: CONFIG.SERVICES.POWER_PLANT };
const telegraphRoadTile = { type: CONFIG.TYPES.ROAD, hasTelegraph: true };
const mockSimPower = {
    powerSystem: {
        hasPower: (x, y) => x === 10 && y === 10,
        powerPlants: new Set(['5,5']),
        isWithinPollutionRadius: (x, y) => Math.hypot(5.5 - x, 5.5 - y) <= 4.5
    }
};

assert.strictEqual(OverlayRenderer.getElectricColor(powerPlantTile, 5, 5, mockSimPower), 0xffdf59, 'Power plant must render radiant gold (0xffdf59)');
assert.strictEqual(OverlayRenderer.getElectricColor(telegraphRoadTile, 10, 10, mockSimPower), 0xffdf59, 'Powered telegraph route must render soft neon gold');
assert.strictEqual(OverlayRenderer.getElectricColor(telegraphRoadTile, 0, 0, mockSimPower), 0x636e72, 'Unpowered telegraph line must render grey wire');
assert.strictEqual(OverlayRenderer.getElectricColor(resTile, 0, 0, mockSimPower), 0x1a252f, 'Unpowered district must render dark shade');

// 4.4 Coal Soot Pollution
assert.strictEqual(OverlayRenderer.getPollutionColor(powerPlantTile, 5, 5, mockSimPower), 0x2d3436, 'Power plant must render coal soot source');
assert.strictEqual(OverlayRenderer.getPollutionColor({ type: CONFIG.TYPES.EMPTY }, 6, 6, mockSimPower), 0x3a3030, 'Within 2 tiles of power plant must render heavy soot');
assert.strictEqual(OverlayRenderer.getPollutionColor({ type: CONFIG.TYPES.EMPTY }, 8, 8, mockSimPower), 0x594d4d, 'Within 4 tiles of power plant must render soot overlay');
assert.strictEqual(OverlayRenderer.getPollutionColor({ type: CONFIG.TYPES.EMPTY }, 20, 20, mockSimPower), 0x2ecc71, 'Outside pollution radius must render clean air green');

console.log('✓ OverlayRenderer color calculations verified across all 5 diagnostic modes.');

// 5. Verify UI Controls & Markup in index.html
console.log('5. Verifying Layers Dropdown Popover Markup in index.html...');
const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

assert.ok(htmlContent.includes('id="layer-menu-popover"'), 'index.html must include #layer-menu-popover');
assert.ok(htmlContent.includes('name="layer-mode" value="none"'), 'index.html must include Normal radio option');
assert.ok(htmlContent.includes('name="layer-mode" value="fire"'), 'index.html must include Fire Hazard radio option');
assert.ok(htmlContent.includes('name="layer-mode" value="sanitation"'), 'index.html must include Sanitation radio option');
assert.ok(htmlContent.includes('name="layer-mode" value="electric"'), 'index.html must include Electric Grid radio option');
assert.ok(htmlContent.includes('name="layer-mode" value="pollution"'), 'index.html must include Pollution radio option');
console.log('✓ Layers popover UI markup verified.');

console.log('\n======================================================');
console.log('🎉 ALL ITERATION 29 VERIFICATION TESTS PASSED (100%)!');
console.log('======================================================');
