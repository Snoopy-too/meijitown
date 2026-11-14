// Project Meiji - 3x2 Rectangular Primary School & Schoolyard Verification Suite
import assert from 'node:assert';
import * as THREE from 'three';

const drawnCalls = { fillRect: 0, fillText: [] };
globalThis.document = {
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement: (tag) => {
        if (tag !== 'canvas') {
            return {
                style: {},
                classList: { add: () => {}, remove: () => {} },
                appendChild: () => {},
                addEventListener: () => {}
            };
        }
        return {
            width: 128,
            height: 128,
            getContext: () => ({
                fillStyle: '',
                font: '',
                textAlign: '',
                textBaseline: '',
                fillRect: () => { drawnCalls.fillRect++; },
                beginPath: () => {},
                rect: () => {},
                roundRect: () => {},
                fill: () => {},
                stroke: () => {},
                createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
                putImageData: () => {},
                fillText: (txt) => { drawnCalls.fillText.push(txt); }
            })
        };
    }
};
globalThis.window = { addEventListener: () => {}, removeEventListener: () => {}, devicePixelRatio: 1, innerWidth: 1280, innerHeight: 720 };

import { CONFIG } from '../public/js/config.js';
import { CityGridModel } from '../public/js/grid.js';
import { getFootprint, getFootprintTiles } from '../public/js/footprintPreview.js';
import { SchoolSystem } from '../public/js/schoolSystem.js';
import { MaterialLibrary } from '../public/js/renderer/materialLibrary.js';
import { CivicMeshFactory } from '../public/js/meshes/civicMeshFactory.js';
import { GhostCursorManager } from '../public/js/renderer/ghost_cursor.js';

console.log('--- Testing 3x2 Meiji Elementary School & Schoolyard Compound ---');

// 1. MaterialLibrary school textures & shared tags
const mats = MaterialLibrary.init();
for (const key of ['schoolClapboard', 'schoolYardDirt', 'schoolPlaque']) {
    assert.ok(mats[key], `MaterialLibrary initializes '${key}'`);
    assert.strictEqual(mats[key].userData?.isSharedLibraryMaterial, true, `${key} is tagged shared`);
}
assert.ok(drawnCalls.fillRect > 50, 'School clapboard and yard textures rendered via fillRect');
assert.ok(drawnCalls.fillText.includes('小学校'), 'School plaque calligraphy 小学校 drawn');
console.log('  ✓ School clapboard, dirt yard, and 小学校 plaque materials verified');

// 2. Footprint & Rotation-aware Placement / Demolition
assert.deepStrictEqual(getFootprint(CONFIG.TOOLS.SCHOOL, 0), { w: 3, h: 2 }, 'Rotation 0 yields 3x2 footprint');
assert.deepStrictEqual(getFootprint(CONFIG.TOOLS.SCHOOL, 1), { w: 2, h: 3 }, 'Rotation 1 yields 2x3 footprint');
assert.strictEqual(getFootprintTiles(5, 5, CONFIG.TOOLS.SCHOOL, 0).length, 6, 'School expands to 6 tiles');

const grid = new CityGridModel(32, 32);
const state = {
    treasury: 2000,
    deductTreasury: (amt) => { if (state.treasury < amt) return false; state.treasury -= amt; return true; },
    showToast: () => {}
};
const schoolSys = new SchoolSystem(grid, state);

// Boundary check: x=30 cannot fit 3-wide (30..32) at rot 0, CAN fit 2-wide (30..31) at rot 1
assert.strictEqual(schoolSys.canPlaceSchool(30, 5, 0), false, '3x2 at x=30 exceeds right edge');
assert.strictEqual(schoolSys.canPlaceSchool(30, 5, 1), true, '2x3 rotated school fits at x=30');

assert.strictEqual(schoolSys.placeSchool(5, 5, 0), true, 'Places 3x2 school at (5,5)');
for (let dy = 0; dy < 2; dy++) {
    for (let dx = 0; dx < 3; dx++) {
        const t = grid.getTile(5 + dx, 5 + dy);
        assert.strictEqual(t.serviceType, CONFIG.SERVICES.SCHOOL);
        assert.strictEqual(t.footprintW, 3);
        assert.strictEqual(t.footprintH, 2);
        assert.strictEqual(t.multiSize, 6);
        assert.strictEqual(t.manualRotation, false);
        assert.strictEqual(t.isOrigin, dx === 0 && dy === 0);
    }
}
assert.strictEqual(schoolSys.isEducationCovered(12, 5), true, 'Educates 8 tiles from compound center');
assert.strictEqual(schoolSys.clearSchoolAt(7, 6), true, 'Demolishing corner sub-tile (7,6) clears entire 3x2 lot');
for (let dy = 0; dy < 2; dy++) {
    for (let dx = 0; dx < 3; dx++) {
        assert.strictEqual(grid.getTile(5 + dx, 5 + dy).type, CONFIG.TYPES.EMPTY, `(${5+dx},${5+dy}) cleared`);
    }
}
console.log('  ✓ 3x2 / 2x3 placement, boundary check, and 6-tile demolition verified');

// 3. Save/Load Round-Trip + Legacy 2x2 Compatibility
schoolSys.placeSchool(10, 10, 1, true); // 2x3 manually rotated
const exported = grid.exportToArray();
const reloadGrid = new CityGridModel(32, 32);
reloadGrid.loadFromMap(exported);
assert.strictEqual(reloadGrid.getTile(10, 10).footprintW, 2);
assert.strictEqual(reloadGrid.getTile(10, 10).footprintH, 3);

// Simulated legacy 2x2 save (no footprintW/H)
const legacyData = [];
for (let dy = 0; dy < 2; dy++) {
    for (let dx = 0; dx < 2; dx++) {
        legacyData.push({
            x: 20 + dx, y: 20 + dy, type: CONFIG.TYPES.SERVICE, stage: CONFIG.STAGES.BUILT,
            occupied: true, serviceType: CONFIG.SERVICES.SCHOOL, isOrigin: dx === 0 && dy === 0,
            multiSize: 2, originX: 20, originY: 20
        });
    }
}
const legacyGrid = new CityGridModel(32, 32);
legacyGrid.loadFromMap(legacyData);
assert.strictEqual(legacyGrid.getTile(20, 20).footprintW, 2, 'Legacy 2x2 save preserves W=2');
assert.strictEqual(legacyGrid.getTile(20, 20).footprintH, 2, 'Legacy 2x2 save preserves H=2');

const s = CONFIG.TILE_SIZE;
const m3x2 = CivicMeshFactory.createServiceMesh(reloadGrid.getTile(10, 10), Math.PI / 2);
assert.strictEqual(m3x2.position.x, s / 2, '2x3 center X = s/2');
assert.strictEqual(m3x2.position.z, s, '2x3 center Z = s');
const mLeg = CivicMeshFactory.createServiceMesh(legacyGrid.getTile(20, 20), 0);
assert.strictEqual(mLeg.position.x, s / 2, 'Legacy 2x2 center X = s/2');
assert.strictEqual(mLeg.position.z, s / 2, 'Legacy 2x2 center Z = s/2');
assert.strictEqual(CivicMeshFactory.createServiceMesh(reloadGrid.getTile(11, 11), 0), null, 'Child tiles return null mesh');
console.log('  ✓ Serialization & legacy 2x2 compatibility verified');

// 4. Ghost Cursor non-square scaling consistency
const dummyScene = new THREE.Scene ? new THREE.Scene() : new THREE.Group();
dummyScene.add = (o) => { (dummyScene.children = dummyScene.children || []).push(o); };
const cursor = new GhostCursorManager(dummyScene);
cursor.update({ x: 4, y: 4 }, CONFIG.TOOLS.SCHOOL, true, null, 0);
assert.deepStrictEqual([cursor.cursorBox.scale.x, cursor.cursorBox.scale.z], [3, 2]);
assert.strictEqual(cursor.ghostMesh.rotation.y, 0);
assert.ok(Math.abs(cursor.ghostMesh.scale.x - 2.7) < 1e-6 && Math.abs(cursor.ghostMesh.scale.z - 1.8) < 1e-6);

cursor.update({ x: 4, y: 4 }, CONFIG.TOOLS.SCHOOL, true, null, 1);
assert.deepStrictEqual([cursor.cursorBox.scale.x, cursor.cursorBox.scale.z], [2, 3]);
assert.ok(Math.abs(cursor.ghostMesh.rotation.y - Math.PI / 2) < 1e-6);
assert.ok(Math.abs(cursor.ghostMesh.scale.x - 2.7) < 1e-6 && Math.abs(cursor.ghostMesh.scale.z - 1.8) < 1e-6,
    'GhostMesh keeps unrotated base dimensions so rotation.y matches 2x3 cursorBox');
console.log('  ✓ Ghost cursor 3x2 <-> 2x3 rotation alignment verified');

// 5. 3D Schoolhouse + Yard Hierarchy & Plot Bounds Audit
const school3x2 = CivicMeshFactory.createSchoolMesh({ x: 5, y: 5 }, 0, 3, 2);
let parts = 0, windows = 0, hasYard = false, hasFlag = false, hasRoof = false;
const usedMats = new Set();
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
function audit(o, ox = 0, oy = 0, oz = 0, rotY = 0) {
    const lx = o.position?.x || 0, ly = o.position?.y || 0, lz = o.position?.z || 0;
    const cos = Math.cos(rotY), sin = Math.sin(rotY);
    const px = ox + lx * cos + lz * sin;
    const py = oy + ly;
    const pz = oz - lx * sin + lz * cos;
    const nextRotY = rotY + (o.rotation?.y || 0);
    if (o.isMesh) {
        parts++;
        if (o.material?.name) usedMats.add(o.material.name);
        if (o.name === 'Upper_Window') windows++;
        if (o.name === 'School_Yard') hasYard = true;
        if (o.name === 'Hinomaru_Flag') hasFlag = true;
        if (o.name === 'Kawara_Roof') hasRoof = true;
        minX = Math.min(minX, px); maxX = Math.max(maxX, px);
        minY = Math.min(minY, py); maxY = Math.max(maxY, py);
        minZ = Math.min(minZ, pz); maxZ = Math.max(maxZ, pz);
    }
    if (o.children) for (const c of o.children) audit(c, px, py, pz, nextRotY);
}
audit(school3x2);

assert.ok(parts >= 120, `School must be high-craft composite geometry (got ${parts} parts)`);
assert.ok(windows >= 30, `School must feature multi-bay sash windows (got ${windows})`);
assert.ok(hasYard && hasFlag && hasRoof, 'School includes dirt yard, Hinomaru flag, and Kawara roof');
for (const m of ['M_SchoolClapboard', 'M_SchoolYardDirt', 'M_SchoolPlaque', 'M_KawaraRoof', 'M_Stone', 'M_StoneTrim', 'M_GasLantern', 'M_Torii']) {
    assert.ok(usedMats.has(m), `School uses expected material '${m}'`);
}
assert.ok(minX >= -2.92 && maxX <= 2.92, `School compound X (${minX.toFixed(2)}..${maxX.toFixed(2)}) fits within 3x2 lot`);
assert.ok(minZ >= -1.92 && maxZ <= 1.92, `School compound Z (${minZ.toFixed(2)}..${maxZ.toFixed(2)}) fits within 3x2 lot`);
assert.ok(minY >= 0 && maxY > 4.0, `School grounded with tall cupola (${minY.toFixed(2)}..${maxY.toFixed(2)})`);

console.log(`  ✓ 3x2 Giyōfū School mesh verified (${parts} parts, ${windows} window panes, bounds X=${minX.toFixed(2)}..${maxX.toFixed(2)}, Z=${minZ.toFixed(2)}..${maxZ.toFixed(2)})`);
console.log('✅ 3x2 Elementary School & Schoolyard verification PASSED');
