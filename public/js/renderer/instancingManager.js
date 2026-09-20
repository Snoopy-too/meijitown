// Project Meiji - GPU Instanced Mesh Manager (instancingManager.js)
// ponytail: collapses 500+ draw calls for repeating trees, roads, and houses into <10 instanced batches

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { RoadTextureManager } from './road_texture.js';

export class InstancingManager {
    constructor(scene, modelCache) {
        this.scene = scene;
        this.modelCache = modelCache || new Map();
        this.maxInstances = 512;
        this.dummy = new THREE.Object3D();

        this.batches = new Map();
        this.counts = new Map();
        this.seasonalMaterial = null;

        this.initMaterials();
        this.initMeshes();
    }

    initMaterials() {
        this.materials = {
            pineTrunk: new THREE.MeshLambertMaterial({ color: 0x3d2b1f }),
            pineFoliage: new THREE.MeshLambertMaterial({ color: 0x2e4a28 }),
            sakuraTrunk: new THREE.MeshLambertMaterial({ color: 0x54402e }),
            willowTrunk: new THREE.MeshLambertMaterial({ color: 0x3d2c1e }),
            willowFoliage: new THREE.MeshLambertMaterial({ color: 0x5a7a3e }),
            machiyaWall: new THREE.MeshLambertMaterial({ color: 0x8a7752 }),
            machiyaRoof: new THREE.MeshLambertMaterial({ color: 0x2c2c2c }),
            kuraWall: new THREE.MeshLambertMaterial({ color: 0xdedede }),
            kuraRoof: new THREE.MeshLambertMaterial({ color: 0x1a1a1a }),
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
        const s = CONFIG.TILE_SIZE;

        // 1. Pines (Perimeter & Parks)
        const pineTrunkGeo = new THREE.CylinderGeometry(0.05, 0.09, 0.65, 5);
        this.createInstancedMesh('pineTrunk', pineTrunkGeo, this.materials.pineTrunk);

        const pineFoliageGeo = new THREE.ConeGeometry(0.55, 0.90, 5);
        this.createInstancedMesh('pineFoliage', pineFoliageGeo, this.materials.pineFoliage);

        // 2. Sakura (Cherry Blossom)
        const sakuraTrunkGeo = new THREE.CylinderGeometry(0.06, 0.10, 0.70, 5);
        this.createInstancedMesh('sakuraTrunk', sakuraTrunkGeo, this.materials.sakuraTrunk);

        const sakuraFoliageGeo = new THREE.DodecahedronGeometry(0.52, 0);
        const sakuraMat = this.seasonalMaterial || new THREE.MeshLambertMaterial({ color: 0xf4c2c2 });
        this.createInstancedMesh('sakuraFoliage', sakuraFoliageGeo, sakuraMat);

        // 3. Weeping Willows (Canals)
        const willowTrunkGeo = new THREE.CylinderGeometry(0.06, 0.11, 0.75, 6);
        this.createInstancedMesh('willowTrunk', willowTrunkGeo, this.materials.willowTrunk);

        const willowFoliageGeo = new THREE.SphereGeometry(0.55, 6, 5);
        willowFoliageGeo.scale(1.0, 0.65, 1.0);
        this.createInstancedMesh('willowFoliage', willowFoliageGeo, this.materials.willowFoliage);

        // 4. Standard Road Tracks & Paving Slabs
        const trackWidth = s * 0.58;
        const shoulderWidth = s * 0.82;

        const dirtTrackGeo = new THREE.BoxGeometry(trackWidth, 0.05, s);
        this.createInstancedMesh('roadDirtTrack', dirtTrackGeo, RoadTextureManager.getDirtRoadMaterial());

        const dirtShoulderGeo = new THREE.BoxGeometry(shoulderWidth, 0.02, s);
        this.createInstancedMesh('roadDirtShoulder', dirtShoulderGeo, RoadTextureManager.getDirtShoulderMaterial());

        const stoneTrackGeo = new THREE.BoxGeometry(trackWidth, 0.06, s);
        this.createInstancedMesh('roadStoneTrack', stoneTrackGeo, RoadTextureManager.getStoneRoadMaterial());

        const stoneShoulderGeo = new THREE.BoxGeometry(shoulderWidth, 0.02, s);
        this.createInstancedMesh('roadStoneShoulder', stoneShoulderGeo, RoadTextureManager.getStoneShoulderMaterial());

        // 5. Level 1 Machiya & Level 2 Kura Meshes (Fallback / Instanced)
        this.initBuildingInstancedMeshes(s);
    }

    initBuildingInstancedMeshes(s) {
        // Machiya L1 Base & Roof
        const mBodyGeo = new THREE.BoxGeometry(s * 0.72, 0.60, s * 0.72);
        this.createInstancedMesh('machiyaBody', mBodyGeo, this.materials.machiyaWall);

        const mRoofGeo = new THREE.ConeGeometry(s * 0.55, 0.35, 4);
        mRoofGeo.rotateY(Math.PI / 4);
        this.createInstancedMesh('machiyaRoof', mRoofGeo, this.materials.machiyaRoof);

        // Kura L2 Base & Fireproof Tile Roof
        const kBodyGeo = new THREE.BoxGeometry(s * 0.75, 0.90, s * 0.75);
        this.createInstancedMesh('kuraBody', kBodyGeo, this.materials.kuraWall);

        const kRoofGeo = new THREE.ConeGeometry(s * 0.60, 0.40, 4);
        kRoofGeo.rotateY(Math.PI / 4);
        this.createInstancedMesh('kuraRoof', kRoofGeo, this.materials.kuraRoof);
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

    addPineTree(x, z, rotY = 0) {
        this.addInstance('pineTrunk', x, 0.325, z, rotY);
        this.addInstance('pineFoliage', x, 0.85, z, rotY);
    }

    addSakuraTree(x, z, rotY = 0) {
        this.addInstance('sakuraTrunk', x, 0.35, z, rotY);
        this.addInstance('sakuraFoliage', x, 0.95, z, rotY);
    }

    addWillowTree(x, z, rotY = 0) {
        this.addInstance('willowTrunk', x, 0.375, z, rotY);
        this.addInstance('willowFoliage', x, 0.90, z, rotY);
    }

    addRoadSlab(tier, x, z, isEW = false) {
        const rotY = isEW ? Math.PI / 2 : 0;
        const trackKey = tier === 2 ? 'roadStoneTrack' : 'roadDirtTrack';
        const shoulderKey = tier === 2 ? 'roadStoneShoulder' : 'roadDirtShoulder';
        const trackY = tier === 2 ? 0.04 : 0.035;

        this.addInstance(trackKey, x, trackY, z, rotY);
        this.addInstance(shoulderKey, x, 0.015, z, rotY);
    }

    addMachiyaL1(x, z, rotY = 0) {
        this.addInstance('machiyaBody', x, 0.30, z, rotY);
        this.addInstance('machiyaRoof', x, 0.78, z, rotY);
    }

    addKuraL2(x, z, rotY = 0) {
        this.addInstance('kuraBody', x, 0.45, z, rotY);
        this.addInstance('kuraRoof', x, 1.10, z, rotY);
    }

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