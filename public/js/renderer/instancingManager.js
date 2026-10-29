// Project Meiji - GPU Instanced Tree Manager (instancingManager.js)
// Phase 2 /artisan: Cloud-Pruned Japanese Black Pines (Matsu) & Wide-Bough Sakura/Momiji Canopies (< 280 lines)

import * as THREE from 'three';

export class InstancingManager {
    constructor(scene, modelCache) {
        this.scene = scene;
        this.modelCache = modelCache || new Map();
        this.maxInstances = 4096;
        this.dummy = new THREE.Object3D();

        this.batches = new Map();
        this.counts = new Map();
        this.seasonalMaterial = null;

        this.initMaterials();
        this.initMeshes();
    }

    initMaterials() {
        this.materials = {
            pineTrunk: new THREE.MeshStandardMaterial({ color: 0x3b281c, roughness: 0.90 }),
            pineFoliage: new THREE.MeshStandardMaterial({ color: 0x234425, roughness: 0.80, flatShading: true }),
            sakuraTrunk: new THREE.MeshStandardMaterial({ color: 0x453124, roughness: 0.88 }),
            willowTrunk: new THREE.MeshStandardMaterial({ color: 0x3b2a1d, roughness: 0.88 }),
            willowFoliage: new THREE.MeshStandardMaterial({ color: 0x567a3a, roughness: 0.78, flatShading: true }),
        };
    }

    setSeasonalMaterial(mat) {
        if (mat) {
            mat.flatShading = true;
        }
        this.seasonalMaterial = mat;
        if (this.batches.has('sakuraFoliage')) {
            this.batches.get('sakuraFoliage').material = mat;
        }
    }

    createInstancedMesh(key, geometry, material, count = this.maxInstances) {
        const mesh = new THREE.InstancedMesh(geometry, material, count);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.count = 0;
        mesh.visible = false;
        this.scene.add(mesh);
        this.batches.set(key, mesh);
        this.counts.set(key, 0);
        return mesh;
    }

    initMeshes() {
        // 1. Japanese Black Pine (Kuro-matsu): gnarled trunk & flattened cloud-pruned foliage pads (NO cones!)
        const pineTrunkGeo = new THREE.CylinderGeometry(0.045, 0.10, 0.85, 7);
        this.createInstancedMesh('pineTrunk', pineTrunkGeo, this.materials.pineTrunk);

        const pinePadGeo = new THREE.DodecahedronGeometry(0.38, 1);
        pinePadGeo.scale(1.25, 0.36, 1.15);
        pinePadGeo.computeVertexNormals();
        this.createInstancedMesh('pineFoliage', pinePadGeo, this.materials.pineFoliage);

        // 2. Sakura / Momiji Deciduous Trees: forked trunk & flattened layered canopy clouds
        const sakuraTrunkGeo = new THREE.CylinderGeometry(0.05, 0.11, 0.82, 7);
        this.createInstancedMesh('sakuraTrunk', sakuraTrunkGeo, this.materials.sakuraTrunk);

        const sakuraCloudGeo = new THREE.DodecahedronGeometry(0.36, 1);
        sakuraCloudGeo.scale(1.20, 0.52, 1.15);
        sakuraCloudGeo.computeVertexNormals();
        const sakuraMat = this.seasonalMaterial || new THREE.MeshStandardMaterial({ color: 0xf4c2c2, roughness: 0.8, flatShading: true });
        this.createInstancedMesh('sakuraFoliage', sakuraCloudGeo, sakuraMat);

        // 3. Weeping Willows
        const willowTrunkGeo = new THREE.CylinderGeometry(0.055, 0.11, 0.88, 7);
        this.createInstancedMesh('willowTrunk', willowTrunkGeo, this.materials.willowTrunk);

        const willowFoliageGeo = new THREE.DodecahedronGeometry(0.42, 1);
        willowFoliageGeo.scale(1.15, 0.55, 1.15);
        willowFoliageGeo.computeVertexNormals();
        this.createInstancedMesh('willowFoliage', willowFoliageGeo, this.materials.willowFoliage);
    }

    beginBatch() {
        for (const key of this.counts.keys()) {
            this.counts.set(key, 0);
        }
    }

    addInstance(key, x, y, z, rotY = 0, scaleX = 1, scaleY = 1, scaleZ = 1, rotX = 0, rotZ = 0) {
        const mesh = this.batches.get(key);
        if (!mesh) return;

        const idx = this.counts.get(key) || 0;
        if (idx >= this.maxInstances) return;

        this.dummy.position.set(x, y, z);
        this.dummy.rotation.set(rotX, rotY, rotZ);
        this.dummy.scale.set(scaleX, scaleY, scaleZ);
        this.dummy.updateMatrix();

        mesh.setMatrixAt(idx, this.dummy.matrix);
        this.counts.set(key, idx + 1);
    }

    // Authentic Cloud-Pruned Japanese Black Pine (Matsu) with cantilevered horizontal pads
    addPineTree(x, z, rotY = 0) {
        const seed = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 6.283;
        const hScale = 0.88 + (seed % 0.35);
        const baseRot = rotY || seed;

        // Main gnarled trunk with slight windward lean + 2 angled structural boughs
        this.addInstance('pineTrunk', x, 0.40 * hScale, z, baseRot, 1.0, hScale, 1.0, 0.08, -0.06);
        this.addInstance('pineTrunk', x + Math.cos(baseRot) * 0.16, 0.68 * hScale, z + Math.sin(baseRot) * 0.16, baseRot + 0.8, 0.55, 0.55 * hScale, 0.55, 0.48, 0.25);
        this.addInstance('pineTrunk', x - Math.cos(baseRot) * 0.15, 0.78 * hScale, z - Math.sin(baseRot) * 0.15, baseRot - 0.9, 0.50, 0.50 * hScale, 0.50, -0.42, -0.22);

        // 5 asymmetric cantilevered horizontal cloud-pruned foliage pads
        const pads = [
            { r: 0.36, a: 0.0,  y: 0.74, sx: 1.15, sy: 0.95, sz: 1.05 },
            { r: 0.34, a: 2.1,  y: 0.88, sx: 1.05, sy: 0.90, sz: 1.10 },
            { r: 0.30, a: 4.2,  y: 1.02, sx: 0.96, sy: 0.88, sz: 0.95 },
            { r: 0.22, a: 1.1,  y: 1.18, sx: 0.85, sy: 0.85, sz: 0.88 },
            { r: 0.06, a: 3.3,  y: 1.34, sx: 0.78, sy: 0.82, sz: 0.78 }
        ];
        for (const p of pads) {
            const px = x + Math.cos(baseRot + p.a) * p.r;
            const pz = z + Math.sin(baseRot + p.a) * p.r;
            this.addInstance('pineFoliage', px, p.y * hScale, pz, baseRot + p.a * 0.7, p.sx, p.sy, p.sz);
        }
    }

    // Wide-spreading multi-bough Sakura / Momiji canopy (zero lollipop spheres)
    addSakuraTree(x, z, rotY = 0) {
        const seed = Math.abs(Math.cos(x * 19.31 + z * 41.17) * 29381.13) % 6.283;
        const hScale = 0.86 + (seed % 0.34);
        const baseRot = rotY || seed;

        // Main trunk + 3 outward-forking secondary boughs
        this.addInstance('sakuraTrunk', x, 0.38 * hScale, z, baseRot, 1.05, hScale, 1.05, 0.04, 0.05);
        this.addInstance('sakuraTrunk', x + Math.cos(baseRot) * 0.18, 0.68 * hScale, z + Math.sin(baseRot) * 0.18, baseRot, 0.55, 0.58 * hScale, 0.55, 0.52, 0.18);
        this.addInstance('sakuraTrunk', x + Math.cos(baseRot + 2.1) * 0.17, 0.72 * hScale, z + Math.sin(baseRot + 2.1) * 0.17, baseRot + 2.1, 0.52, 0.54 * hScale, 0.52, -0.45, 0.32);
        this.addInstance('sakuraTrunk', x + Math.cos(baseRot + 4.2) * 0.16, 0.75 * hScale, z + Math.sin(baseRot + 4.2) * 0.16, baseRot + 4.2, 0.48, 0.50 * hScale, 0.48, 0.38, -0.42);

        // 6 wide-spread flattened blossom/foliage tiers creating an umbrella-like woodblock canopy
        const clouds = [
            { r: 0.42, a: 0.0,  y: 0.86, sx: 1.05, sy: 0.88, sz: 0.95 },
            { r: 0.40, a: 1.3,  y: 0.94, sx: 0.95, sy: 0.85, sz: 1.05 },
            { r: 0.42, a: 2.6,  y: 0.88, sx: 1.02, sy: 0.86, sz: 0.92 },
            { r: 0.38, a: 3.9,  y: 0.98, sx: 0.90, sy: 0.82, sz: 0.96 },
            { r: 0.36, a: 5.1,  y: 0.92, sx: 0.94, sy: 0.84, sz: 0.90 },
            { r: 0.10, a: 0.7,  y: 1.18, sx: 1.12, sy: 0.80, sz: 1.08 }
        ];
        for (const c of clouds) {
            const cx = x + Math.cos(baseRot + c.a) * c.r;
            const cz = z + Math.sin(baseRot + c.a) * c.r;
            this.addInstance('sakuraFoliage', cx, c.y * hScale, cz, baseRot + c.a, c.sx, c.sy, c.sz);
        }
    }

    // Cascading weeping willow canopy
    addWillowTree(x, z, rotY = 0) {
        const seed = Math.abs(Math.sin(x * 27.1 + z * 13.7) * 19482.7) % 6.283;
        const baseRot = rotY || seed;
        this.addInstance('willowTrunk', x, 0.42, z, baseRot, 1.0, 1.0, 1.0, 0.08, 0.05);
        for (let i = 0; i < 5; i++) {
            const a = baseRot + (i * Math.PI * 2) / 5;
            const r = i === 4 ? 0.05 : 0.32;
            const y = i === 4 ? 1.12 : 0.82 + (i % 2) * 0.12;
            this.addInstance('willowFoliage', x + Math.cos(a) * r, y, z + Math.sin(a) * r, a, 0.95, 0.85, 0.95);
        }
    }

    // Backward-compatible no-ops
    addRoadSlab() {}
    addMachiyaL1() {}
    addKuraL2() {}

    commitBatch() {
        for (const [key, mesh] of this.batches.entries()) {
            const count = this.counts.get(key) || 0;
            mesh.count = count;
            mesh.visible = count > 0;
            if (count > 0) {
                mesh.instanceMatrix.needsUpdate = true;
            }
        }
    }

    clear() {
        this.beginBatch();
        this.commitBatch();
    }
}
