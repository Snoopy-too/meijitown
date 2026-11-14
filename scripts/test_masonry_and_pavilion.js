// Project Meiji - Fireproof Masonry Diversity & Exhibition Pavilion Reskin Test Suite
import assert from 'node:assert';
import * as THREE from 'three';

const capturedImages = [];
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
                fillRect: () => {},
                beginPath: () => {},
                rect: () => {},
                roundRect: () => {},
                fill: () => {},
                stroke: () => {},
                moveTo: () => {},
                lineTo: () => {},
                ellipse: () => {},
                arc: () => {},
                closePath: () => {},
                clearRect: () => {},
                createRadialGradient: () => ({ addColorStop: () => {} }),
                createLinearGradient: () => ({ addColorStop: () => {} }),
                createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
                putImageData: (img) => { capturedImages.push(img); },
                fillText: () => {}
            })
        };
    }
};
globalThis.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    devicePixelRatio: 1,
    innerWidth: 1280,
    innerHeight: 720
};

import { MaterialLibrary } from '../public/js/renderer/materialLibrary.js';
import { PBRTextureGenerator } from '../public/js/renderer/pbrTextureGenerator.js';
import { ResidentialMeshes } from '../public/js/meshes/residentialMeshes.js';
import { CommercialMeshes } from '../public/js/meshes/commercialMeshes.js';
import { IndustrialMeshes } from '../public/js/meshes/industrialMeshes.js';
import { CivicBuildingMeshes } from '../public/js/meshes/civicMeshes.js';
import { getFireproofPalette } from '../public/js/meshes/masonryPalette.js';

function avgRGB(img) {
    assert.ok(img && img.data.length > 0, 'Canvas image data must be populated');
    let r = 0, g = 0, b = 0;
    const count = img.data.length / 4;
    for (let i = 0; i < img.data.length; i += 4) {
        r += img.data[i];
        g += img.data[i + 1];
        b += img.data[i + 2];
    }
    return [r / count, g / count, b / count];
}

console.log('--- Testing Fireproof Masonry Variants & Pavilion Overhaul ---');

// 1. Verify MaterialLibrary & PBR pixel synthesis for brick variants and ashlar stone
const mats = MaterialLibrary.init();
for (const key of ['redBrick', 'buffBrick', 'clinkerBrick', 'ashlarStone', 'pavilionLimestone', 'stuccoOchre', 'stuccoSage']) {
    assert.ok(mats[key], `MaterialLibrary must initialize '${key}'`);
    assert.strictEqual(mats[key].userData?.isSharedLibraryMaterial, true, `${key} must be tagged shared`);
}

PBRTextureGenerator._sets.clear();
capturedImages.length = 0;
const redSet = PBRTextureGenerator.getBrickSet('red');
const redAvg = avgRGB(capturedImages[0]); // [albedo, normal, rough] -> albedo is index 0
capturedImages.length = 0;
const buffSet = PBRTextureGenerator.getBrickSet('buff');
const buffAvg = avgRGB(capturedImages[0]);
capturedImages.length = 0;
const clinkerSet = PBRTextureGenerator.getBrickSet('clinker');
const clinkerAvg = avgRGB(capturedImages[0]);
capturedImages.length = 0;
const ashlarSet = PBRTextureGenerator.getAshlarSet();
const ashlarAvg = avgRGB(capturedImages[0]);
assert.ok(redSet.map && buffSet.map && clinkerSet.map && ashlarSet.map, 'Brick variants & ashlar textures should synthesize');

assert.ok(redAvg[0] > redAvg[1] * 1.6, `Red brick should remain terracotta red-dominant (${redAvg.map(n => n.toFixed(0))})`);
assert.ok(buffAvg[1] > redAvg[1] + 50, `Buff brick should be lighter ochre-sandstone than red brick (${buffAvg.map(n => n.toFixed(0))})`);
assert.ok(clinkerAvg[0] < redAvg[0] - 25, `Clinker brick should be darker smoked iron-brown (${clinkerAvg.map(n => n.toFixed(0))})`);
assert.ok(ashlarAvg[1] > 165 && ashlarAvg[2] > 155, `Ashlar stone should be pale cut stone (${ashlarAvg.map(n => n.toFixed(0))})`);
console.log('  ✓ MaterialLibrary & PBR pixel palettes verified (red / buff / clinker / ashlar)');

// 2. Verify deterministic 4-variant diversity & null-tile resilience
for (const role of ['residential', 'commercial', 'industrial']) {
    const seen = new Set();
    for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
            seen.add(getFireproofPalette({ x, y }, role).variantName);
        }
    }
    assert.strictEqual(seen.size, 4, `${role} palette should distribute all 4 deterministic variants (got ${[...seen].join(', ')})`);
    assert.ok(getFireproofPalette(null, role).lowerWallMat, `${role} palette must tolerate null tile`);
}

const resVariants = new Set();
const com3Variants = new Set();
const com4Variants = new Set();
const ind2Variants = new Set();
for (let i = 0; i < 16; i++) {
    const t = { x: i % 4, y: Math.floor(i / 4) };
    resVariants.add(ResidentialMeshes.createGinzaBrickL3Mesh(t, 0).userData.masonryVariant);
    com3Variants.add(CommercialMeshes.createGiyofuL3Mesh(t, 0).userData.masonryVariant);
    com4Variants.add(CommercialMeshes.createGinzaCommercialL4Mesh(t, 0).userData.masonryVariant);
    ind2Variants.add(IndustrialMeshes.createTextileMillL2Mesh(t, 0).userData.masonryVariant);
}
assert.ok(resVariants.size >= 3, 'Residential L3 builds multiple masonry variants across lots');
assert.ok(com3Variants.size >= 3, 'Commercial L3 builds multiple masonry variants across lots');
assert.ok(com4Variants.size >= 3, 'Commercial L4 builds multiple masonry variants across lots');
assert.ok(ind2Variants.size >= 3, 'Industrial L2 builds multiple masonry variants across lots');
assert.ok(ResidentialMeshes.createGinzaBrickL3Mesh(null, 0) instanceof THREE.Group, 'Null tile safe for Res L3');
assert.ok(IndustrialMeshes.createWorkshopL1Mesh({ x: 3, y: 5 }, 0) instanceof THREE.Group, 'Industrial L1 builds cleanly');
console.log('  ✓ Zone masonry variety verified across Res L3, Com L3/L4, Ind L1/L2');

// 3. Verify PowerPlant differentiates from plain redBrick
const pp = IndustrialMeshes.createPowerPlantMesh({ x: 4, y: 4 }, 0);
const ppMats = new Set();
pp.traverse((child) => { if (child.isMesh && child.material?.name) ppMats.add(child.material.name); });
assert.ok(ppMats.has('M_ClinkerBrick'), 'Power Plant must use dark industrial clinker brick');
assert.ok(ppMats.has('M_AshlarStone'), 'Power Plant must include ashlar stone buttress piers');
console.log('  ✓ Power Plant industrial clinker + ashlar contrast verified');

// 4. Verify Kōban stone lower wainscot
const koban = CivicBuildingMeshes.createKobanMesh({ x: 5, y: 5 }, 0);
const kobanMats = new Set();
koban.traverse((child) => { if (child.isMesh && child.material?.name) kobanMats.add(child.material.name); });
assert.ok(kobanMats.has('M_AshlarStone') && kobanMats.has('M_Brick'), 'Koban combines dressed stone wainscot and brick');
console.log('  ✓ Koban stone wainscot + brick upper verified');

// 5. Full audit of Option A Exhibition Pavilion (geometry hierarchy, polychrome materials & bounds)
const pavilion = CivicBuildingMeshes.createPavilionMesh({ x: 10, y: 10 }, 0);
const pavMats = new Set();
let glassCount = 0;
let partCount = 0;
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;

function collectWorldBounds(obj, offsetX = 0, offsetY = 0, offsetZ = 0) {
    const px = offsetX + (obj.position?.x || 0);
    const py = offsetY + (obj.position?.y || 0);
    const pz = offsetZ + (obj.position?.z || 0);
    if (obj.isMesh) {
        partCount++;
        if (obj.material?.name) pavMats.add(obj.material.name);
        if (obj.name === 'Upper_Window' || obj.name === 'Front_Koushi') glassCount++;
        minX = Math.min(minX, px); maxX = Math.max(maxX, px);
        minY = Math.min(minY, py); maxY = Math.max(maxY, py);
        minZ = Math.min(minZ, pz); maxZ = Math.max(maxZ, pz);
    }
    if (obj.children) {
        for (const c of obj.children) collectWorldBounds(c, px, py, pz);
    }
}
collectWorldBounds(pavilion);

assert.ok(partCount >= 80, `Pavilion must have rich composite geometry (got ${partCount} parts)`);
assert.ok(!pavMats.has('M_Plaster'), 'Pavilion must NOT use flat blank M_Plaster');
for (const req of ['M_PavilionStone', 'M_Brick', 'M_BuffBrick', 'M_Stone', 'M_StoneTrim', 'M_CopperRoof', 'M_SlateRoof', 'M_Bronze', 'M_Gold', 'M_GlassWindow', 'M_GasLantern', 'M_Crimson']) {
    assert.ok(pavMats.has(req), `Pavilion must incorporate polychrome material '${req}'`);
}
assert.ok(glassCount >= 32, `Pavilion must feature glazed arcade & rotunda windows (got ${glassCount})`);
assert.ok(minX >= -2.95 && maxX <= 2.95, `Pavilion centers stay cleanly inside 3x3 plot X (${minX.toFixed(2)}..${maxX.toFixed(2)})`);
assert.ok(minZ >= -2.95 && maxZ <= 2.95, `Pavilion centers stay cleanly inside 3x3 plot Z (${minZ.toFixed(2)}..${maxZ.toFixed(2)})`);
assert.ok(minY >= 0 && maxY > 5.0, `Pavilion grounded and crowned cleanly (${minY.toFixed(2)}..${maxY.toFixed(2)})`);

for (const ang of [Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const rotPav = CivicBuildingMeshes.createPavilionMesh({ x: 10, y: 10 }, ang);
    assert.strictEqual(rotPav.children[0].rotation.y, ang, `Rotated Pavilion must preserve facingAngle=${ang}`);
}
console.log(`  ✓ Exhibition Pavilion Option A verified (${partCount} parts, ${glassCount} glazed bays, heights ${minY.toFixed(2)}..${maxY.toFixed(2)})`);
console.log('✅ Masonry variety & Pavilion overhaul tests PASSED');
