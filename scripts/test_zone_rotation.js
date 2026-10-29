// Project Meiji - Zone Placement Rotation & Facing Verification Suite
import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Minimal Node.js DOM shims
globalThis.document = {
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement: () => ({
        style: {},
        classList: { add: () => {}, remove: () => {} },
        appendChild: () => {},
        addEventListener: () => {},
    }),
};
globalThis.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    devicePixelRatio: 1,
    innerWidth: 1280,
    innerHeight: 720,
};

import * as THREE from 'three';
import { CONFIG } from '../public/js/config.js';
import { CityGridModel } from '../public/js/grid.js';
import { ToolController } from '../public/js/tools.js';
import { GhostCursorManager } from '../public/js/renderer/ghost_cursor.js';
import { ResidentialMeshes } from '../public/js/meshes/residentialMeshes.js';
import { IndustrialMeshes } from '../public/js/meshes/industrialMeshes.js';

console.log('================================================================');
console.log('Project Meiji - Zone Placement & Mesh Facing Direction Tests');
console.log('================================================================\n');

// Mock state manager
const mockState = {
    treasury: 10000,
    deductTreasury(amount) {
        if (this.treasury >= amount) {
            this.treasury -= amount;
            return true;
        }
        return false;
    },
    showToast() {},
    dom: { dragBadge: null },
    milestones: { currentTier: 1 },
};

// Mock renderer
const mockRenderer = {
    renderer: { domElement: { addEventListener: () => {} } },
    setBuildMode() {},
    updateCursor() {},
    raycastTile: () => null,
    getTileWorldPos: (x, y) => ({ x: x * CONFIG.TILE_SIZE, z: y * CONFIG.TILE_SIZE }),
    fx: { detachFire() {}, spawnDemolishPuff() {} },
    grid: null,
    getFacingAngleForTile(x, y) {
        const tile = this.grid.getTile(x, y);
        if (tile && (tile.manualRotation || (typeof tile.rotation === 'number' && tile.rotation !== 0))) {
            return (tile.rotation % 4) * (Math.PI / 2);
        }
        const dirs = [
            { dx: 0, dy: 1, a: 0 },
            { dx: 1, dy: 0, a: Math.PI / 2 },
            { dx: 0, dy: -1, a: Math.PI },
            { dx: -1, dy: 0, a: -Math.PI / 2 }
        ];
        for (const d of dirs) {
            const t = this.grid.getTile(x + d.dx, y + d.dy);
            if (t && (t.type === CONFIG.TYPES.ROAD || (t.type === CONFIG.TYPES.CANAL && t.hasBridge))) return d.a;
        }
        return (tile?.rotation ? (tile.rotation % 4) * (Math.PI / 2) : 0);
    }
};

const grid = new CityGridModel();
mockRenderer.grid = grid;

console.log('1. Testing Ghost Cursor Directional Marker Alignment...');
const scene = new THREE.Scene();
const ghost = new GhostCursorManager(scene);
assert.ok(ghost.dirMarker, 'Ghost cursor must have dirMarker attached');
assert.strictEqual(ghost.dirMarker.position.x, 0, 'Marker must be centered along X');
assert.ok(ghost.dirMarker.position.z > 0, 'Marker must face positive Z (local front)');

// Test ghost cursor rotation across all 4 quadrants
for (let rot = 0; rot < 4; rot++) {
    ghost.update({ x: 5, y: 5 }, CONFIG.TOOLS.RESIDENTIAL, true, null, rot);
    const expectedAngle = (rot % 4) * (Math.PI / 2);
    assert.strictEqual(ghost.ghostMesh.rotation.y, expectedAngle, `Ghost mesh rotation at rot=${rot} must be ${expectedAngle}`);
    assert.strictEqual(ghost.markerMat.color.getHex(), 0x39ff14, 'Marker bar color must be vibrant green when valid');
}
console.log('   ✓ Ghost cursor marker sits on front face (+Z) and rotates consistently (0, π/2, π, 3π/2)');

console.log('2. Testing Residential & Industrial Manual Placement Rotation...');
const toolCtrl = new ToolController(grid, mockRenderer, mockState, null);

// Cycle rotation to 1 (East)
toolCtrl.setActiveTool(CONFIG.TOOLS.RESIDENTIAL);
assert.strictEqual(toolCtrl.placementRotation, 0);
assert.strictEqual(toolCtrl.hasManuallyRotated, false);

toolCtrl.rotatePlacement();
assert.strictEqual(toolCtrl.placementRotation, 1, 'Rotation must advance to 1');
assert.strictEqual(toolCtrl.hasManuallyRotated, true, 'Manual rotation flag must be set');

// Place residential at (10, 10)
toolCtrl.dispatcher.dispatch(CONFIG.TOOLS.RESIDENTIAL, 10, 10, false);
const resTile = grid.getTile(10, 10);
assert.strictEqual(resTile.type, CONFIG.TYPES.ZONE);
assert.strictEqual(resTile.zoneType, CONFIG.ZONES.RESIDENTIAL);
assert.strictEqual(resTile.rotation, 1, 'Tile rotation must be preserved on placement');
assert.strictEqual(resTile.manualRotation, true, 'Tile manualRotation flag must be preserved');

// Complete construction
grid.startConstruction(10, 10);
grid.completeConstruction(10, 10, 1);
assert.strictEqual(resTile.rotation, 1, 'Tile rotation must survive scaffolding & construction');
const resAngle = mockRenderer.getFacingAngleForTile(10, 10);
assert.strictEqual(resAngle, Math.PI / 2, 'Facing angle must evaluate to π/2');

// Cycle rotation to 3 (West) and place Industrial
toolCtrl.setActiveTool(CONFIG.TOOLS.INDUSTRIAL);
toolCtrl.rotatePlacement(); // 1
toolCtrl.rotatePlacement(); // 2
toolCtrl.rotatePlacement(); // 3
assert.strictEqual(toolCtrl.placementRotation, 3);

toolCtrl.dispatcher.dispatch(CONFIG.TOOLS.INDUSTRIAL, 12, 10, false);
const indTile = grid.getTile(12, 10);
assert.strictEqual(indTile.rotation, 3, 'Industrial tile rotation must be 3');
assert.strictEqual(indTile.manualRotation, true);
const indAngle = mockRenderer.getFacingAngleForTile(12, 10);
assert.strictEqual(indAngle, (3 * Math.PI) / 2, 'Facing angle must evaluate to 3π/2');
console.log('   ✓ Residential and Industrial tiles retain manual placement rotation upon build completion');

console.log('3. Testing Smart Road Auto-Facing when Unrotated...');
toolCtrl.setActiveTool(CONFIG.TOOLS.RESIDENTIAL);
assert.strictEqual(toolCtrl.hasManuallyRotated, false);

// Lay road at (20, 19) [North of (20, 20)]
grid.setTile(20, 19, CONFIG.TYPES.ROAD, null, 0, false, CONFIG.STAGES.NONE, 1);
// Effective rotation on hover should face North (rot = 2)
const effectiveRotNorth = toolCtrl.getEffectiveRotation(20, 20);
assert.strictEqual(effectiveRotNorth, 2, 'Auto-facing effective rotation should detect North road (rot=2)');

toolCtrl.dispatcher.dispatch(CONFIG.TOOLS.RESIDENTIAL, 20, 20, false);
const autoTile = grid.getTile(20, 20);
grid.startConstruction(20, 20);
grid.completeConstruction(20, 20, 1);
const autoAngle = mockRenderer.getFacingAngleForTile(20, 20);
assert.strictEqual(autoAngle, Math.PI, 'Building adjacent to North road must face North (π)');
console.log('   ✓ Unrotated zones auto-orient towards adjacent roads (effective rotation on hover & placement)');

console.log('4. Testing Procedural Building Mesh Construction Orientation...');
// Create Machiya L1 with facing angle π/2
const machiyaMesh = ResidentialMeshes.createMachiyaL1Mesh(resTile, resAngle);
assert.ok(machiyaMesh, 'Machiya mesh instantiated');
assert.strictEqual(machiyaMesh.children[0].rotation.y, Math.PI / 2, 'Machiya mesh root must rotate by π/2');

// Create Workshop L1 with facing angle 3π/2
const workshopMesh = IndustrialMeshes.createWorkshopL1Mesh(indTile, indAngle);
assert.ok(workshopMesh, 'Workshop mesh instantiated');
assert.strictEqual(workshopMesh.children[0].rotation.y, (3 * Math.PI) / 2, 'Workshop mesh root must rotate by 3π/2');
console.log('   ✓ 3D Mesh internal hierarchy applies facingAngle to root container sub-group');

console.log('\n================================================================');
console.log('🎉 ALL ZONE PLACEMENT ROTATION TESTS PASSED (100%)!');
console.log('================================================================');
