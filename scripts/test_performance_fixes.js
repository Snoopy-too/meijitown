// Project Meiji - Performance & Camera Rotation Fixes Verification Suite
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Minimal global shims for headless Node execution
const windowListeners = new Map();
globalThis.window = {
    addEventListener: (type, fn) => {
        if (!windowListeners.has(type)) windowListeners.set(type, []);
        windowListeners.get(type).push(fn);
    },
    removeEventListener: () => {},
    devicePixelRatio: 2,
    innerWidth: 1280,
    innerHeight: 720,
};

const storageMap = new Map();
globalThis.localStorage = {
    getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k),
};

import { CONFIG } from '../public/js/config.js';
import { bindKeyboardHotkeys } from '../public/js/ui/keyboard_router.js';
import {
    GRAPHICS_PRESETS,
    normalizeGraphicsPreset,
    loadSavedGraphicsPreset,
    saveGraphicsPreset
} from '../public/js/renderer/graphicsSettings.js';
import { SceneLighting } from '../public/js/renderer/scene_lighting.js';

console.log('================================================================');
console.log('Project Meiji - Performance & Camera Rotation Verification');
console.log('================================================================\n');

// 1. Graphics Presets & Persistence
console.log('1. Testing Graphics Quality Presets & Persistence...');
assert.strictEqual(loadSavedGraphicsPreset(), 'medium', 'Default preset must be balanced medium');
assert.strictEqual(normalizeGraphicsPreset('ultra'), 'high', 'ultra alias maps to high');
assert.strictEqual(normalizeGraphicsPreset('off'), 'low', 'off alias maps to low');
assert.strictEqual(normalizeGraphicsPreset('invalid'), 'medium', 'invalid preset falls back to medium');
assert.strictEqual(GRAPHICS_PRESETS.low.shadowsEnabled, false, 'Low preset disables shadow casting');
assert.strictEqual(GRAPHICS_PRESETS.medium.pixelRatioCap, 1.5, 'Medium preset caps pixelRatio at 1.5');
assert.strictEqual(GRAPHICS_PRESETS.high.postPreset, 'ultra', 'High preset enables ultra post-FX');

saveGraphicsPreset('low');
assert.strictEqual(loadSavedGraphicsPreset(), 'low', 'Saved preset must persist cleanly');
saveGraphicsPreset('high');
assert.strictEqual(loadSavedGraphicsPreset(), 'high', 'Updated preset must persist cleanly');
console.log('   ✓ Graphics presets & localStorage persistence verified.');

// 2. Keyboard Q/E Rotation vs Telegraph [N] Collision Fix
console.log('\n2. Testing Q/E Camera Rotation & Telegraph [N] Non-Collision...');
const toolCalls = [];
const rotateCalls = [];
const mockTools = {
    currentTool: CONFIG.TOOLS.INSPECT,
    setActiveTool: (t) => toolCalls.push(t),
    rotatePlacement: () => {},
};
const mockState = {
    toggleSimulation: () => {},
    setSimulationSpeed: () => {},
    rotateInspectedTile: () => {},
};
const mockRenderer = {
    cameraManager: { cameraAnim: null },
    rotateCameraBy: (delta, dur) => rotateCalls.push({ delta, dur }),
};

bindKeyboardHotkeys(mockTools, mockState, mockRenderer);
const keyHandlers = windowListeners.get('keydown') || [];
assert.ok(keyHandlers.length >= 1, 'keydown listener must be registered');
const dispatchKey = (key, repeat = false) => {
    let prevented = false;
    const ev = {
        key,
        code: '',
        repeat,
        shiftKey: false,
        target: { tagName: 'BODY' },
        preventDefault: () => { prevented = true; }
    };
    keyHandlers[keyHandlers.length - 1](ev);
    return prevented;
};

assert.strictEqual(dispatchKey('e'), true, 'Pressing E must call preventDefault');
assert.strictEqual(rotateCalls.length, 1, 'Pressing E must rotate camera once');
assert.strictEqual(rotateCalls[0].delta, Math.PI / 4, 'E rotates +45 degrees');
assert.strictEqual(toolCalls.length, 0, 'Pressing E must NOT activate Telegraph tool');

// Repeat while cameraAnim is active should be skipped
mockRenderer.cameraManager.cameraAnim = { active: true };
dispatchKey('e', true);
assert.strictEqual(rotateCalls.length, 1, 'Key repeat during active cameraAnim must be throttled');

mockRenderer.cameraManager.cameraAnim = null;
dispatchKey('q', false);
assert.strictEqual(rotateCalls.length, 2, 'Pressing Q rotates camera');
assert.strictEqual(rotateCalls[1].delta, -Math.PI / 4, 'Q rotates -45 degrees');

dispatchKey('n', false);
assert.deepStrictEqual(toolCalls, [CONFIG.TOOLS.TELEGRAPH], 'Pressing N activates Telegraph tool');
console.log('   ✓ Q/E rotation separation & repeat throttling verified.');

// 3. SceneLighting Cached Traversal & Shadow Quality
console.log('\n3. Testing SceneLighting Traversal Caching & Shadow Quality...');
const scene = new THREE.Scene();
let traverseCount = 0;
const origTraverse = scene.traverse.bind(scene);
scene.traverse = (cb) => {
    traverseCount++;
    return origTraverse(cb);
};
const lanternGroup = new THREE.Group();
lanternGroup.userData = { isLantern: true, tileX: 2, tileY: 3, material: { emissive: new THREE.Color(0) } };
scene.add(lanternGroup);

const lighting = SceneLighting.initLights(scene);
lighting.setShadowQuality(false, 512);
assert.strictEqual(lighting.sunLight.castShadow, false, 'setShadowQuality disables sun shadow');
assert.strictEqual(lighting.sunLight.shadow.mapSize.width, 512, 'setShadowQuality updates shadow map width');

lighting.setShadowQuality(true, 1024);
assert.strictEqual(lighting.sunLight.castShadow, true, 'setShadowQuality enables sun shadow');
assert.strictEqual(lighting.sunLight.shadow.mapSize.width, 1024, 'setShadowQuality sets shadow map to 1024');

const countBefore = traverseCount;
lighting.applyEmissivesToScene(0.8);
lighting.currentEmissiveIntensity = 0.8;
lighting.updateLanternLightPool({ x: 0, z: 0 }, 0.4);
lighting.applyEmissivesToScene(0.9);
lighting.updateLanternLightPool({ x: 0, z: 0 }, 0.4);
assert.strictEqual(traverseCount - countBefore, 1, 'Repeated emissive & lantern updates must reuse cached node list without re-traversing scene');

lighting.markSceneDirty();
lighting.applyEmissivesToScene(0.95);
assert.strictEqual(traverseCount - countBefore, 2, 'markSceneDirty must allow a single clean cache refresh');
console.log('   ✓ SceneLighting node cache and shadow scaling verified.');

// 4. DOM, Lounge Template & CSS Checks
console.log('\n4. Testing Standalone & Lounge UI Markup + CSS Optimizations...');
const indexHtml = fs.readFileSync(path.join(rootDir, 'public', 'index.html'), 'utf8');
const clientJs = fs.readFileSync(path.join(rootDir, 'client.js'), 'utf8');
const rootCss = fs.readFileSync(path.join(rootDir, 'style.css'), 'utf8');

for (const [name, content] of [['public/index.html', indexHtml], ['client.js', clientJs]]) {
    assert.ok(content.includes('id="meiji-loading-overlay"'), `${name} must include loading overlay`);
    assert.ok(content.includes('id="select-graphics-quality"'), `${name} must include graphics quality selector`);
}
assert.ok(indexHtml.includes('data-tool="telegraph"') && indexHtml.includes('<span class="item-hotkey">N</span>'), 'index.html Telegraph hotkey badge must show N');
assert.ok(!rootCss.includes('@import url('), 'style.css must not duplicate @import CSS loads');

for (const cssFile of ['style.css', 'hud.css', 'drawer.css', 'civic.css']) {
    const css = fs.readFileSync(path.join(rootDir, 'public', 'css', cssFile), 'utf8');
    assert.ok(!css.includes('backdrop-filter'), `public/css/${cssFile} must not use costly backdrop-filter blur over WebGL canvas`);
}
console.log('   ✓ Loading overlay, graphics UI, hotkeys, and CSS optimizations verified.');

console.log('\n================================================================');
console.log('🎉 ALL PERFORMANCE & ROTATION FIX VERIFICATION CHECKS PASSED!');
console.log('================================================================');
