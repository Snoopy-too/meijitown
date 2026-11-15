// Project Meiji - Typhoon Atmosphere, Overcast Lighting & Lightning Verification Test
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Minimal Node DOM shims for headless Three.js testing
globalThis.document = {
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement: () => ({
        style: {},
        classList: { add: () => {}, remove: () => {} },
        appendChild: () => {},
        addEventListener: () => {}
    })
};
globalThis.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    devicePixelRatio: 1,
    innerWidth: 1280,
    innerHeight: 720
};

import { CONFIG } from '../public/js/config.js';
import { CityGridModel } from '../public/js/grid.js';
import { SceneLighting } from '../public/js/renderer/scene_lighting.js';
import { BackdropManager } from '../public/js/renderer/backdropManager.js';
import { CloudManager } from '../public/js/renderer/cloudManager.js';
import { PostProcessingPipeline } from '../public/js/renderer/postProcessing.js';
import { TyphoonManager } from '../public/js/disaster/typhoonManager.js';
import { SOUND } from '../public/js/audioManager.js';

console.log('================================================================');
console.log('Project Meiji - Typhoon Atmosphere & Lighting Verification');
console.log('================================================================\n');

// 1. Overcast Storm Lighting, Fog Density & Daytime Lanterns
console.log('1. Testing Overcast Storm Lighting, Dense Fog & Daytime Lanterns...');
const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.ATMOSPHERE.BACKGROUND);
scene.fog = new THREE.FogExp2(CONFIG.ATMOSPHERE.FOG, CONFIG.ATMOSPHERE.FOG_DENSITY);
scene.fog.color = new THREE.Color(CONFIG.ATMOSPHERE.FOG);
scene.fog.density = CONFIG.ATMOSPHERE.FOG_DENSITY;

const lanternMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color(0x000000) });
const lanternNode = new THREE.Group();
lanternNode.userData = { isLantern: true, tileX: 2, tileY: 2, material: lanternMat };
lanternNode.parent = scene;
scene.add(lanternNode);

const lighting = SceneLighting.initLights(scene);
lighting.setPhase('DAY');
for (let i = 0; i < 60; i++) lighting.update(0.1);

assert.ok(lighting.sunLight.intensity > 1.5, 'Daytime sun intensity starts bright');
assert.ok(scene.fog.density < 0.005, 'Daytime fog density starts light');
assert.strictEqual(lighting.currentEmissiveIntensity, 0, 'Daytime emissives start off');

lighting.setStormOverride(true);
// Advance enough steps for smooth lerps to settle before next lightning check
lighting._lightningTimer = 99;
for (let i = 0; i < 60; i++) lighting.update(0.1);

assert.ok(lighting.sunLight.intensity <= 0.45, `Storm dims sun intensity (got ${lighting.sunLight.intensity.toFixed(3)})`);
assert.ok(lighting.hemiLight.intensity <= 0.60, `Storm softens hemi intensity (got ${lighting.hemiLight.intensity.toFixed(3)})`);
assert.ok(scene.fog.density >= 0.012, `Storm increases fog density (got ${scene.fog.density.toFixed(4)})`);
assert.strictEqual(scene.background.getHex(), 0x1f2b36, 'Storm background settles to deep slate');
assert.ok(lighting.currentEmissiveIntensity >= 0.62, `Daytime typhoon turns on warm lanterns (got ${lighting.currentEmissiveIntensity.toFixed(3)})`);
assert.ok(lanternMat.emissiveIntensity >= 0.60, 'Street lantern emissive material activates during daytime storm');

// 2. Lightning Flash Envelope & Thunder Hook
console.log('2. Testing Lightning Double-Flicker Envelope & Thunder Delay...');
const baseIntensity = lighting.sunLight.intensity;
let thunderCount = 0;
const origPlayThunder = SOUND.playThunder.bind(SOUND);
SOUND.playThunder = () => { thunderCount++; };

lighting.triggerLightning(1.0);
lighting.update(0.016);
const peakState = lighting.getLightingState();
assert.ok(peakState.lightningFlash > 0.7, `Lightning flash peaks strongly (got ${peakState.lightningFlash.toFixed(3)})`);
assert.ok(lighting.sunLight.intensity > baseIntensity + 1.0, 'Lightning spikes directional illumination');

// Advance past 0.48s lightning duration + thunder delay
for (let i = 0; i < 40; i++) lighting.update(0.02);
assert.strictEqual(lighting.getLightingState().lightningFlash, 0, 'Lightning decays cleanly back to 0');
assert.ok(Math.abs(lighting.sunLight.intensity - baseIntensity) < 0.05, 'Sun intensity returns to overcast baseline');
assert.strictEqual(thunderCount, 1, 'Delayed thunder triggers once per lightning strike');
SOUND.playThunder = origPlayThunder;

// 3. Storm Recovery & Lantern Shutoff
console.log('3. Testing Recovery Back to Daytime & Night Storm Preservation...');
lighting.setStormOverride(false);
for (let i = 0; i < 80; i++) lighting.update(0.1);
assert.ok(lighting.sunLight.intensity > 1.55, 'Sun recovers to daytime intensity');
assert.ok(scene.fog.density < 0.005, 'Fog thins back to daytime density');
assert.ok(lighting.currentEmissiveIntensity <= 0.05, 'Daytime emissives settle back off');
assert.strictEqual(lanternMat.emissive.getHex(), 0x000000, 'Lantern emissive shuts off cleanly when crossing <= 0.05');

// Night + Storm should remain dark
lighting.setPhase('NIGHT');
for (let i = 0; i < 60; i++) lighting.update(0.1);
lighting.setStormOverride(true);
lighting._lightningTimer = 99;
for (let i = 0; i < 60; i++) lighting.update(0.1);
assert.ok(lighting.hemiLight.intensity <= 0.50, `Night storm stays dark (got ${lighting.hemiLight.intensity.toFixed(3)})`);
assert.ok(lighting.currentEmissiveIntensity >= 0.85, 'Night storm keeps full lantern brightness');

// 4. SkyDome, BackdropManager & CloudManager Storm Reactivity
console.log('4. Testing SkyDome, BackdropManager & CloudManager Storm & Lightning...');
const backdrop = new BackdropManager(scene);
backdrop.update(0.5, true, 0.85);
assert.ok(backdrop.skyDome.uniforms.uStormMix.value > 0.5, 'SkyDome uStormMix ramps up during storm');
assert.strictEqual(backdrop.skyDome.uniforms.uLightningFlash.value, 0.85, 'SkyDome receives lightning flash');

const clouds = new CloudManager(scene);
clouds.material.emissive = new THREE.Color(0x000000);
clouds.material.emissiveIntensity = 0;
const xBeforeCalm = clouds.clouds[0].mesh.position.x;
clouds.update(1.0, 1.0, false, 0);
const calmDelta = clouds.clouds[0].mesh.position.x - xBeforeCalm;

const xBeforeStorm = clouds.clouds[0].mesh.position.x;
clouds.update(1.0, 1.0, true, 0.9);
const stormDelta = clouds.clouds[0].mesh.position.x - xBeforeStorm;

assert.ok(stormDelta > calmDelta * 2.5, `Storm clouds drift significantly faster (calm=${calmDelta.toFixed(2)}, storm=${stormDelta.toFixed(2)})`);
assert.strictEqual(clouds.material.color.getHex(), 0x3e4247, 'Storm cloud base color stays 0x3e4247');
assert.ok(clouds.material.emissiveIntensity > 0.7, 'Storm clouds catch lightning rim illumination');
clouds.update(0.1, 1.0, false, 0);
assert.strictEqual(clouds.material.emissiveIntensity, 0, 'Cloud lightning emissive clears after storm');

// 5. PostProcessing Storm Grading & TyphoonManager Lifecycle
console.log('5. Testing PostProcessing Storm Preset & TyphoonManager Lifecycle...');
const post = new PostProcessingPipeline(null, scene, null);
post.lensPass = { uniforms: { uClarity: { value: 0 }, uWarmth: { value: 0 }, uVignette: { value: 0 }, uTiltShiftStrength: { value: 0 } } };
post.bloomPass = { strength: 0, radius: 0, threshold: 0 };
post.setPhase('DAY', true);
assert.ok(post.lensPass.uniforms.uVignette.value >= 0.34, 'Storm vignette deepens');
assert.ok(post.lensPass.uniforms.uWarmth.value < 0, 'Storm color grade shifts cool');

const grid = new CityGridModel(12, 12);
const state = { currentMonth: 9, showToast: () => {}, chronicle: { recordEvent: () => {} } };
const typhoon = new TyphoonManager(grid, state, null, scene);
lighting.setStormOverride(false);
typhoon.startTyphoon();
assert.strictEqual(lighting.isStormOverride, true, 'TyphoonManager.startTyphoon enables SceneLighting storm override');
assert.strictEqual(SOUND.isStormActive, true, 'TyphoonManager.startTyphoon enables storm audio state');
typhoon.endTyphoon();
assert.strictEqual(lighting.isStormOverride, false, 'TyphoonManager.endTyphoon clears SceneLighting storm override');
assert.strictEqual(SOUND.isStormActive, false, 'TyphoonManager.endTyphoon clears storm audio state');

// 6. Verify 600-line file size compliance on modified files
console.log('6. Checking Line Counts on Modified Modules...');
for (const rel of [
    'public/js/audioManager.js',
    'public/js/renderer/scene_lighting.js',
    'public/js/renderer/skyDome.js',
    'public/js/renderer/backdropManager.js',
    'public/js/renderer/cloudManager.js',
    'public/js/renderer/environmentIBL.js',
    'public/js/renderer/postProcessing.js',
    'public/js/disaster/typhoonManager.js'
]) {
    const lines = fs.readFileSync(path.join(rootDir, rel), 'utf8').split('\n').length;
    console.log(`   - ${rel}: ${lines} lines`);
    assert.ok(lines <= 600, `${rel} exceeded 600-line limit (${lines})`);
}

console.log('\n================================================================');
console.log('✓ All Typhoon Atmosphere & Lighting Tests Passed!');
console.log('================================================================');
