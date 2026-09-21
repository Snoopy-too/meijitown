// Project Meiji - Iteration 34 Landscape Backdrop & Drifting Clouds Verification Test Suite
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as THREE from 'three';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('Project Meiji - Iteration 34 Verification Test Suite');
console.log('Landscape Backdrop: Distant Mountains, Rivers & Drifting Clouds');
console.log('================================================================\n');

// 1. Check File Size Governance
console.log('1. Checking File Size Governance...');
const checkFileSize = (relPath, maxLines) => {
    const fullPath = path.join(rootDir, relPath);
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n').length;
    console.log(`   ✓ ${relPath}: ${lines} lines (max: ${maxLines})`);
    assert.ok(lines <= maxLines, `${relPath} exceeded line limit of ${maxLines}: got ${lines}`);
};

checkFileSize('public/js/renderer/backdropManager.js', 280);
checkFileSize('public/js/renderer/cloudManager.js', 180);
checkFileSize('public/js/renderer.js', 450);

// 2. Test BackdropManager & Triangle Budget
console.log('\n2. Testing BackdropManager & Mountain Perimeter...');
import { BackdropManager } from '../public/js/renderer/backdropManager.js';

const mockScene = new THREE.Scene();
const backdrop = new BackdropManager(mockScene);

assert.ok(backdrop.group, 'BackdropManager must have a root group');
assert.ok(mockScene.children.includes(backdrop.group), 'Backdrop group must be added to the scene');

let totalTriangles = 0;
let meshCount = 0;
let allBackdropsFlagged = true;

backdrop.group.traverse((child) => {
    if (child.isMesh) {
        meshCount++;
        const geo = child.geometry;
        if (geo.index) {
            totalTriangles += geo.index.count / 3;
        } else if (geo.attributes.position) {
            totalTriangles += geo.attributes.position.count / 3;
        }
        if (!child.userData.isBackdrop || !child.userData.ignoreRaycast) {
            allBackdropsFlagged = false;
        }
    }
});

console.log(`   Backdrop meshes: ${meshCount}`);
console.log(`   Total backdrop polygons: ${totalTriangles} triangles`);
assert.ok(meshCount >= 15, 'Backdrop should have skirt, mountains, and river ribbon');
assert.ok(totalTriangles < 4000, `Total backdrop polygons must be < 4,000 (got ${totalTriangles})`);
assert.ok(allBackdropsFlagged, 'All backdrop meshes must have userData.isBackdrop and ignoreRaycast = true');
console.log('   ✓ BackdropManager successfully verified within 4,000 polygon budget.');

// Test seasonal update
backdrop.updateSeason(4); // Spring
assert.strictEqual(backdrop.skirtMaterial.color.getHex(), 0x638a53, 'Spring skirt color should be fresh green');
backdrop.updateSeason(10); // Autumn
assert.strictEqual(backdrop.skirtMaterial.color.getHex(), 0x8a724b, 'Autumn skirt color should be russet');
console.log('   ✓ BackdropManager seasonal foliage transitions verified.');

// 3. Test CloudManager & Atmospheric Motion
console.log('\n3. Testing CloudManager & Drifting Canopy...');
import { CloudManager } from '../public/js/renderer/cloudManager.js';

const cloudScene = new THREE.Scene();
const clouds = new CloudManager(cloudScene);

assert.strictEqual(clouds.clouds.length, 10, 'CloudManager must spawn 10 cloud clusters');
for (const c of clouds.clouds) {
    assert.ok(c.baseY >= 45 && c.baseY <= 65, `Cloud Y elevation (${c.baseY}) must be between 45 and 65`);
    assert.ok(c.speed > 0, 'Cloud drift speed must be positive');
}

// Test drifting
const initialX = clouds.clouds[0].mesh.position.x;
clouds.update(1.0, 1.0, false); // Advance 1 second at 1x
assert.ok(clouds.clouds[0].mesh.position.x > initialX, 'Clouds must drift forward along wind vector');

// Test wrap-around
clouds.clouds[0].mesh.position.x = 136; // past maxX (135)
clouds.update(0.1, 1.0, false);
assert.strictEqual(clouds.clouds[0].mesh.position.x, -65, 'Clouds passing maxX must wrap to -65');
console.log('   ✓ Cloud drift and seamless boundary wrapping verified.');

// Test day/night reactivity
clouds.updateDayNight(1); // Dawn
assert.strictEqual(clouds.material.color.getHex(), 0xffe6d6, 'Dawn cloud color should be rosy peach');

clouds.updateDayNight(2); // Day
assert.strictEqual(clouds.material.color.getHex(), 0xf7f4ed, 'Day cloud color should be warm off-white');

clouds.updateDayNight(3); // Twilight
assert.strictEqual(clouds.material.color.getHex(), 0xf5b57f, 'Twilight cloud color should be golden amber');

clouds.updateDayNight(4); // Night
assert.strictEqual(clouds.material.color.getHex(), 0x36334a, 'Night cloud color should be moonlight navy/indigo');

// Test typhoon darkening
clouds.update(0.016, 1.0, true); // storm active
assert.strictEqual(clouds.material.color.getHex(), 0x3e4247, 'Storm cloud color should darken to charcoal slate');
console.log('   ✓ CloudManager Day/Night and Typhoon reactivity verified.');

console.log('\n================================================================');
console.log('🎉 ALL ITERATION 34 ACCEPTANCE TESTS PASSED (100%)');
console.log('================================================================\n');
