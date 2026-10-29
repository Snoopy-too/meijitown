// Project Meiji - GPU Instanced Tree Manager (instancingManager.js)
// Phase 2 /artisan: Multi-Tiered Pagoda Pines & Clustered Blossom Canopies (< 280 lines)

import * as THREE from 'three';

export class InstancingManager {
    constructor(scene, modelCache) {
        this.scene = scene;
        this.modelCache = modelCache || new Map();
        this.maxInstances = 1536;
        this.dummy = new THREE.Object3D();

        this.batches = new Map();
        this.counts = new Map();
        this.seasonalMaterial = null;

        this.initMaterials();
        this.initMeshes();
    }

    initMaterials() {
        this.materials = {
            pineTrunk: new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.88 }),
            pineFoliage: new THREE.MeshStandardMaterial({ color: 0x244220, roughness: 0.82, flatShading: true }),
            sakuraTrunk: new THREE.MeshStandardMaterial({ color: 0x54402e, roughness: 0.85 }),
            willowTrunk: new THREE.MeshStandardMaterial({ color: 0x3d2c1e, roughness: 0.85 }),
            willowFoliage: new THREE.MeshStandardMaterial({ color: 0x5a7a3e, roughness: 0.80, flatShading: true }),
        };
    }

    setSeasonalMaterial(mat) {
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
        // 1. Pines (Perimeter & Unbuilt Meadow)
        const pineTrunkGeo = new THREE.CylinderGeometry(0.05, 0.09, 0.65, 6);
        this.createInstancedMesh('pineTrunk', pineTrunkGeo, this.materials.pineTrunk);

        const pineFoliageGeo = new THREE.ConeGeometry(0.50, 0.55, 6);
        this.createInstancedMesh('pineFoliage', pineFoliageGeo, this.materials.pineFoliage);

        // 2. Sakura (Cherry Blossom)
        const sakuraTrunkGeo = new THREE.CylinderGeometry(0.06, 0.10, 0.70, 6);
        this.createInstancedMesh('sakuraTrunk', sakuraTrunkGeo, this.materials.sakuraTrunk);

        const sakuraFoliageGeo = new THREE.DodecahedronGeometry(0.42, 1);
        const sakuraMat = this.seasonalMaterial || new THREE.MeshStandardMaterial({ color: 0xf4c2c2, roughness: 0.8 });
        this.createInstancedMesh('sakuraFoliage', sakuraFoliageGeo, sakuraMat);

        // 3. Weeping Willows
        const willowTrunkGeo = new THREE.CylinderGeometry(0.06, 0.11, 0.75, 6);
        this.createInstancedMesh('willowTrunk', willowTrunkGeo, this.materials.willowTrunk);

        const willowFoliageGeo = new THREE.SphereGeometry(0.55, 6, 5);
        willowFoliageGeo.scale(1.0, 0.65, 1.0);
        this.createInstancedMesh('willowFoliage', willowFoliageGeo, this.materials.willowFoliage);
    }

    beginBatch() {
        for (const key of this.counts.keys()) {
            this.counts.set(key, 0);
        }
    }

    addInstance(key, x, y, z, rotY = 0, scaleX = 1, scaleY = 1, scaleZ = 1) {
        const mesh = this.batches.get(key);
        if (!mesh) return;

        const idx = this.counts.get(key) || 0;
        if (idx >= this.maxInstances) return;

        this.dummy.position.set(x, y, z);
        this.dummy.rotation.set(0, rotY, 0);
        this.dummy.scale.set(scaleX, scaleY, scaleZ);
        this.dummy.updateMatrix();

        mesh.setMatrixAt(idx, this.dummy.matrix);
        this.counts.set(key, idx + 1);
    }

    // Multi-tiered organic pagoda pine
    addPineTree(x, z, rotY = 0) {
        this.addInstance('pineTrunk', x, 0.325, z, rotY);
        // 3 stacked tiered foliage cones with decreasing size
        this.addInstance('pineFoliage', x, 0.68, z, rotY, 1.15, 1.0, 1.15);
        this.addInstance('pineFoliage', x, 0.95, z, rotY + 0.45, 0.90, 0.90, 0.90);
        this.addInstance('pineFoliage', x, 1.20, z, rotY + 0.90, 0.65, 0.75, 0.65);
    }

    // Multi-clustered organic cherry blossom canopy
    addSakuraTree(x, z, rotY = 0) {
        this.addInstance('sakuraTrunk', x, 0.35, z, rotY);
        // 3 overlapping blossom clusters creating a billowy cloud canopy
        this.addInstance('sakuraFoliage', x, 0.98, z, rotY, 1.05, 0.95, 1.05);
        this.addInstance('sakuraFoliage', x - 0.16, 0.88, z + 0.14, rotY + 0.5, 0.85, 0.80, 0.85);
        this.addInstance('sakuraFoliage', x + 0.16, 0.90, z - 0.12, rotY + 1.2, 0.80, 0.78, 0.80);
    }

    // Cascading weeping willow canopy
    addWillowTree(x, z, rotY = 0) {
        this.addInstance('willowTrunk', x, 0.375, z, rotY);
        this.addInstance('willowFoliage', x, 0.92, z, rotY, 1.0, 1.0, 1.0);
        this.addInstance('willowFoliage', x, 0.78, z, rotY + 0.6, 1.22, 0.65, 1.22);
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
