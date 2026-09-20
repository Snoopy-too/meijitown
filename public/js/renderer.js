// Project Meiji - Three.js Isometric 3D Diorama Renderer (renderer.js)
// ponytail: modular renderer orchestrator, procedural architecture, asset cache & traffic loop (< 420 lines)

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from './config.js';
import { ParticleManager } from './fx.js';
import { CameraManager } from './renderer/camera_manager.js';
import { SceneLighting } from './renderer/scene_lighting.js';
import { RaycastManager } from './renderer/raycast_manager.js';
import { GhostCursorManager } from './renderer/ghost_cursor.js';
import { RoadAutotiler } from './renderer/road_autotiler.js';
import { ProceduralMeshes } from './renderer/procedural_meshes.js';
import { CanalMesh } from './renderer/canal_mesh.js';
import { CivicMeshes } from './renderer/civic_meshes.js';
import { TrafficManager } from './renderer/traffic_manager.js';
import { CanalTrafficManager } from './renderer/canalTraffic.js';
import { ParksSystem } from './renderer/parksSystem.js';
import { RailwaySystem } from './renderer/railwaySystem.js';
import { TrainTrafficManager } from './renderer/trainTraffic.js';
import { OverlaySystem } from './renderer/overlaySystem.js';
import { InstancingManager } from './renderer/instancingManager.js';
import { AgricultureManager } from './agricultureManager.js';

export class WorldRenderer {
    constructor(containerElement, gridModel) {
        this.container = containerElement;
        this.grid = gridModel;
        this.tileMeshes = new Map();
        this.modelCache = new Map();
        this.modelsLoaded = false;
        this.simulation = null;

        this.initScene();
        this.cameraManager = new CameraManager(this.container, this.renderer.domElement);
        this.lighting = SceneLighting.initLights(this.scene);
        this.raycast = new RaycastManager(this.scene);
        this.ghostCursor = new GhostCursorManager(this.scene);

        this.initGround();

        const initialFoliageColor = (CONFIG.SIMULATION.SEASON_COLORS && CONFIG.SIMULATION.SEASON_COLORS.WINTER) || 0x8c857b;
        this.seasonalFoliageMaterial = new THREE.MeshLambertMaterial({ color: initialFoliageColor });

        this.instancing = new InstancingManager(this.scene, this.modelCache);
        this.instancing.setSeasonalMaterial(this.seasonalFoliageMaterial);

        this.fx = new ParticleManager(this.scene);
        this.traffic = new TrafficManager(this.scene, this.grid, this.getTileWorldPos.bind(this), this.fx);
        this.canalTraffic = new CanalTrafficManager(this.scene, this.grid, this.getTileWorldPos.bind(this), this.modelCache);
        this.overlay = new OverlaySystem(this.scene, this.grid, null);

        this.bindEvents();
        this.loadAssets();

        this.grid.subscribe((event, data) => {
            if (event === 'tile_updated') {
                this.updateTileMesh(data.x, data.y, data.tile);
                this.refreshAdjacentRoads(data.x, data.y);
                this.refreshAdjacentBuildings(data.x, data.y);
                this.rebuildInstancedBatches();
                if (this.overlay && this.overlay.currentMode !== 'none') this.overlay.refresh();
            } else if (event === 'grid_reset') {
                this.rebuildAllMeshes();
                if (this.overlay && this.overlay.currentMode !== 'none') this.overlay.refresh();
            }
        });

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    get camera() { return this.cameraManager.camera; }
    get controls() { return this.cameraManager.controls; }

    initScene() {
        const width = this.container.clientWidth || window.innerWidth;
        const height = this.container.clientHeight || window.innerHeight;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(CONFIG.ATMOSPHERE.BACKGROUND);
        this.scene.fog = new THREE.FogExp2(CONFIG.ATMOSPHERE.FOG, CONFIG.ATMOSPHERE.FOG_DENSITY);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
    }

    initGround() {
        const totalSizeX = CONFIG.GRID_WIDTH * CONFIG.TILE_SIZE;
        const totalSizeZ = CONFIG.GRID_HEIGHT * CONFIG.TILE_SIZE;
        this.groundMesh = new THREE.Mesh(new THREE.BoxGeometry(totalSizeX, 1.0, totalSizeZ), new THREE.MeshLambertMaterial({ color: CONFIG.COLORS.GROUND }));
        this.groundMesh.position.set(totalSizeX / 2, -0.5, totalSizeZ / 2);
        this.groundMesh.receiveShadow = true;
        this.scene.add(this.groundMesh);

        const gridHelper = new THREE.GridHelper(totalSizeX, CONFIG.GRID_WIDTH, 0x3d5c31, 0x4a6b3c);
        gridHelper.position.set(totalSizeX / 2, 0.01, totalSizeZ / 2);
        this.scene.add(gridHelper);
    }

    bindEvents() {
        window.addEventListener('resize', () => this.cameraManager.handleResize(this.renderer));
    }

    setSimulation(simulation) {
        this.simulation = simulation;
        if (this.overlay) this.overlay.setSimulation(simulation);
        if (simulation?.typhoon) simulation.typhoon.setScene(this.scene);
    }

    setGameState(state) {
        this.state = state;
        if (this.overlay) this.overlay.state = state;
    }

    setBuildMode(isBuilding) { this.cameraManager.setBuildMode(isBuilding); }
    rotateCameraBy(angleDelta, durationMs = 200) { this.cameraManager.rotateCameraBy(angleDelta, durationMs); }

    updateSeason(month) {
        let color = 0x8c857b;
        const c = CONFIG.SIMULATION.SEASON_COLORS;
        if (c) {
            if (month >= 3 && month <= 5) color = c.SPRING;
            else if (month >= 6 && month <= 8) color = c.SUMMER;
            else if (month >= 9 && month <= 11) color = c.AUTUMN;
            else color = c.WINTER;
        }
        if (this.seasonalFoliageMaterial) this.seasonalFoliageMaterial.color.setHex(color);
        if (this.instancing) this.instancing.setSeasonalMaterial(this.seasonalFoliageMaterial);
        for (const [_, tile] of this.grid.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.AGRICULTURE) this.updateTileMesh(tile.x, tile.y, tile);
        }
    }

    updateDayNight(month) {
        if (this.lighting && typeof this.lighting.updateMonth === 'function') this.lighting.updateMonth(month);
    }

    getTileWorldPos(x, y) {
        return { x: (x + 0.5) * CONFIG.TILE_SIZE, z: (y + 0.5) * CONFIG.TILE_SIZE };
    }

    raycastTile(screenX, screenY) {
        return this.raycast.raycastTile(screenX, screenY, this.cameraManager.camera, this.renderer.domElement, this.grid);
    }

    updateCursor(tileCoord, toolType, isValid = true, rotation = 0) {
        this.ghostCursor.update(tileCoord, toolType, isValid, this.getTileWorldPos.bind(this), rotation);
    }

    async loadAssets() {
        const loader = new GLTFLoader();
        const loadModel = (key, url) => {
            if (!url) return Promise.resolve(false);
            return new Promise((resolve) => {
                loader.load(url, (gltf) => {
                    gltf.scene.traverse((child) => {
                        if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
                    });
                    this.modelCache.set(key, gltf.scene);
                    resolve(true);
                }, undefined, () => resolve(false));
            });
        };

        const assetList = [
            ['scaffold', CONFIG.MODELS.SCAFFOLD], ['residential_l1', CONFIG.MODELS.RESIDENTIAL_L1],
            ['residential_l2', CONFIG.MODELS.RESIDENTIAL_L2], ['commercial_l1', CONFIG.MODELS.COMMERCIAL_L1],
            ['commercial_l2', CONFIG.MODELS.COMMERCIAL_L2], ['commercial_l3', CONFIG.MODELS.COMMERCIAL_L3],
            ['commercial_l4', CONFIG.MODELS.COMMERCIAL_L4], ['industrial_l1', CONFIG.MODELS.INDUSTRIAL_L1],
            ['industrial_l2', CONFIG.MODELS.INDUSTRIAL_L2], ['watchtower', CONFIG.MODELS.WATCHTOWER],
            ['fire_depot', CONFIG.MODELS.FIRE_DEPOT], ['well', CONFIG.MODELS.WELL],
            ['ochaya', CONFIG.MODELS.OCHAYA], ['sento', CONFIG.MODELS.SENTO],
            ['koban', CONFIG.MODELS.KOBAN], ['school', CONFIG.MODELS.SCHOOL],
            ['telegraph', CONFIG.MODELS.TELEGRAPH], ['harbor_pier', CONFIG.MODELS.HARBOR_PIER],
            ['power_plant', CONFIG.MODELS.POWER_PLANT], ['pavilion', CONFIG.MODELS.PAVILION],
            ['barge', CONFIG.MODELS.BARGE], ['crossing', CONFIG.MODELS.CROSSING],
            ['train', CONFIG.MODELS.TRAIN]
        ];

        await Promise.all(assetList.map(([k, u]) => loadModel(k, u)));
        this.modelsLoaded = true;
        this.trainTraffic = new TrainTrafficManager(this.scene, this.grid, this.getTileWorldPos.bind(this), this.modelCache);
        this.rebuildAllMeshes();
    }

    getFacingAngleForTile(x, y) {
        const tile = this.grid.getTile(x, y);
        if (tile && typeof tile.rotation === 'number') return (tile.rotation % 4) * (Math.PI / 2);
        const dirs = [{ dx: 0, dy: 1, a: 0 }, { dx: 0, dy: -1, a: Math.PI }, { dx: 1, dy: 0, a: Math.PI / 2 }, { dx: -1, dy: 0, a: -Math.PI / 2 }];
        for (const d of dirs) {
            const t = this.grid.getTile(x + d.dx, y + d.dy);
            if (t && (t.type === CONFIG.TYPES.ROAD || (t.type === CONFIG.TYPES.CANAL && t.hasBridge))) return d.a;
        }
        for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
            const t = this.grid.getTile(x + dx, y + dy);
            if (t && (t.type === CONFIG.TYPES.ROAD || (t.type === CONFIG.TYPES.CANAL && t.hasBridge))) return Math.atan2(dx, dy);
        }
        return 0;
    }

    createServiceMesh(tile, facingAngle) {
        return CivicMeshes.createServiceMesh(tile, facingAngle, this.modelCache);
    }

    createZoneMesh(tile, facingAngle, key, pos) {
        const s = CONFIG.TILE_SIZE;
        const group = new THREE.Group();

        if (tile.stage === CONFIG.STAGES.SCAFFOLDING) {
            if (this.modelCache.has('scaffold')) {
                const sc = this.modelCache.get('scaffold').clone();
                sc.rotation.y = facingAngle;
                group.add(sc);
            } else {
                const fm = new THREE.Mesh(new THREE.BoxGeometry(s * 0.7, 0.7, s * 0.7), new THREE.MeshLambertMaterial({ color: 0x8a7752, wireframe: true }));
                fm.position.y = 0.35;
                fm.rotation.y = facingAngle;
                group.add(fm);
            }
        } else if (tile.stage === CONFIG.STAGES.BUILT) {
            let mk = 'residential_l1';
            if (tile.zoneType === CONFIG.ZONES.RESIDENTIAL) mk = tile.level >= 3 ? 'residential_l3' : (tile.level >= 2 ? 'residential_l2' : 'residential_l1');
            else if (tile.zoneType === CONFIG.ZONES.COMMERCIAL) mk = tile.level >= 4 ? 'commercial_l4' : (tile.level >= 3 ? 'commercial_l3' : (tile.level >= 2 ? 'commercial_l2' : 'commercial_l1'));
            else if (tile.zoneType === CONFIG.ZONES.INDUSTRIAL) mk = tile.level >= 2 ? 'industrial_l2' : 'industrial_l1';

            if (this.modelCache.has(mk)) {
                const bldg = this.modelCache.get(mk).clone();
                bldg.rotation.y = facingAngle;
                group.add(bldg);
            } else if (tile.zoneType === CONFIG.ZONES.RESIDENTIAL && tile.level >= 3) {
                group.add(CivicMeshes.createGinzaBrickMesh(tile, facingAngle));
            } else if (tile.zoneType === CONFIG.ZONES.COMMERCIAL && tile.level >= 4) {
                group.add(CivicMeshes.createGinzaBrickMesh(tile, facingAngle));
            } else if (tile.zoneType === CONFIG.ZONES.COMMERCIAL && tile.level >= 3) {
                group.add(ProceduralMeshes.createCommercialL3Mesh(tile, facingAngle));
            }
        } else if (tile.stage === CONFIG.STAGES.ON_FIRE) {
            const ch = new THREE.Mesh(new THREE.BoxGeometry(s * 0.8, 0.35, s * 0.8), new THREE.MeshLambertMaterial({ color: 0x241e1a }));
            ch.position.y = 0.18;
            group.add(ch);
            this.fx.attachFire(key, pos.x, pos.z);
        } else if (tile.stage === CONFIG.STAGES.BURNED) {
            this.fx.detachFire(key);
            const rn = new THREE.Mesh(new THREE.BoxGeometry(s * 0.75, 0.16, s * 0.75), new THREE.MeshLambertMaterial({ color: 0x1c1917 }));
            rn.position.y = 0.08;
            group.add(rn);
        }

        if (tile.threatTimer && tile.threatTimer > 0 && tile.stage !== CONFIG.STAGES.ON_FIRE && tile.stage !== CONFIG.STAGES.BURNED) {
            const speed = (this.simulation && this.simulation.speedMultiplier) ? this.simulation.speedMultiplier : 1;
            const scaledSec = Math.max(1, Math.round((tile.threatTimer * ((CONFIG.SIMULATION.BASE_MONTH_MS || 6000) / 1000)) / speed));
            group.add(ProceduralMeshes.createThreatSprite(scaledSec));
        }
        return group;
    }

    createMeshForTile(tile) {
        const group = new THREE.Group();
        const pos = this.getTileWorldPos(tile.x, tile.y);
        group.position.set(pos.x, 0, pos.z);
        const key = `${tile.x}_${tile.y}`;

        if (tile.type === CONFIG.TYPES.ROAD) {
            group.add(RoadAutotiler.buildRoadMesh(tile.x, tile.y, this.grid));
            return group;
        }
        if (tile.type === CONFIG.TYPES.CANAL) {
            group.add(CanalMesh.createCanalMesh(tile, this.grid));
            return group;
        }
        if (tile.type === CONFIG.TYPES.RAIL) {
            group.add(RailwaySystem.createRailTrackMesh(tile, this.grid, this.modelCache));
            return group;
        }
        if (tile.type === CONFIG.TYPES.PARK) {
            group.add(ParksSystem.createTreeMesh(tile, this.seasonalFoliageMaterial));
            return group;
        }
        if (tile.type === CONFIG.TYPES.SERVICE) {
            const facingAngle = this.getFacingAngleForTile(tile.x, tile.y);
            const serviceMesh = this.createServiceMesh(tile, facingAngle);
            if (serviceMesh) group.add(serviceMesh);
            return group;
        }
        if (tile.type === CONFIG.TYPES.AGRICULTURE) {
            const currentMonth = (this.state && this.state.currentMonth) ? this.state.currentMonth : 1;
            const isIrrigated = (this.state && this.state.agriculture && typeof this.state.agriculture.isIrrigated === 'function')
                ? this.state.agriculture.isIrrigated(tile.x, tile.y)
                : this.grid.hasAdjacentCanal(tile.x, tile.y);
            group.add(AgricultureManager.createRicePaddyMesh(tile, currentMonth, isIrrigated));
            return group;
        }
        if (tile.type === CONFIG.TYPES.ZONE) {
            if (tile.stage === CONFIG.STAGES.NONE) {
                group.add(ProceduralMeshes.createEmptyZoneDecal(tile));
                return group;
            }
            const facingAngle = this.getFacingAngleForTile(tile.x, tile.y);
            group.add(this.createZoneMesh(tile, facingAngle, key, pos));
        }
        return group;
    }

    refreshAdjacentRoads(x, y) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy;
            if (this.grid.isValidCoord(nx, ny)) {
                const t = this.grid.getTile(nx, ny);
                if (t && (t.type === CONFIG.TYPES.ROAD || t.type === CONFIG.TYPES.CANAL || t.type === CONFIG.TYPES.RAIL)) this.updateTileMesh(nx, ny, t);
            }
        }
    }

    refreshAdjacentBuildings(x, y) {
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx, ny = y + dy;
                if (this.grid.isValidCoord(nx, ny)) {
                    const t = this.grid.getTile(nx, ny);
                    if (t && t.type === CONFIG.TYPES.ZONE && (t.stage === CONFIG.STAGES.BUILT || t.stage === CONFIG.STAGES.SCAFFOLDING)) this.updateTileMesh(nx, ny, t);
                }
            }
        }
    }

    isFoliageTile(x, y) { return ProceduralMeshes.isFoliageTile(x, y, this.grid.width, this.grid.height); }

    rebuildInstancedBatches() {
        if (!this.instancing) return;
        this.instancing.beginBatch();
        for (let x = 0; x < this.grid.width; x++) {
            for (let y = 0; y < this.grid.height; y++) {
                const tile = this.grid.getTile(x, y);
                const pos = this.getTileWorldPos(x, y);
                if (!tile || tile.type === CONFIG.TYPES.EMPTY) {
                    if (this.isFoliageTile(x, y)) {
                        if ((x + y) % 3 === 0) this.instancing.addSakuraTree(pos.x, pos.z);
                        else this.instancing.addPineTree(pos.x, pos.z);
                    }
                } else if (tile.type === CONFIG.TYPES.PARK && (tile.subType === 'willow' || tile.subType === 'tree_willow')) {
                    this.instancing.addWillowTree(pos.x, pos.z);
                }
            }
        }
        this.instancing.commitBatch();
    }

    updateTileMesh(x, y, tile) {
        const key = this.grid.getKey(x, y);
        if (this.tileMeshes.has(key)) {
            this.scene.remove(this.tileMeshes.get(key));
            this.tileMeshes.delete(key);
        }
        if (tile && tile.stage !== CONFIG.STAGES.ON_FIRE && this.fx?.fireEmitters?.has(key)) {
            this.fx.detachFire(key);
            const pos = this.getTileWorldPos(x, y);
            this.fx.spawnWaterSteam(pos.x, pos.z);
        }
        if (tile && tile.type !== CONFIG.TYPES.EMPTY) {
            const mesh = this.createMeshForTile(tile);
            this.scene.add(mesh);
            this.tileMeshes.set(key, mesh);
        }
    }

    rebuildAllMeshes() {
        if (this.fx?.fireEmitters) {
            for (const key of Array.from(this.fx.fireEmitters.keys())) this.fx.detachFire(key);
        }
        for (const [_, mesh] of this.tileMeshes.entries()) this.scene.remove(mesh);
        this.tileMeshes.clear();
        for (let x = 0; x < this.grid.width; x++) {
            for (let y = 0; y < this.grid.height; y++) {
                try {
                    this.updateTileMesh(x, y, this.grid.getTile(x, y));
                } catch (err) {
                    console.error(`Failed to build mesh at (${x}, ${y}):`, err);
                }
            }
        }
        this.rebuildInstancedBatches();
    }

    dispatchBrigadeCart(roadPath, onArrival) { this.traffic.dispatchBrigadeCart(roadPath, onArrival); }

    animate() {
        requestAnimationFrame(this.animate);
        this.cameraManager.update();
        const isSimRunning = !this.simulation || this.simulation.isRunning;
        const speedMult = isSimRunning ? (this.simulation ? (this.simulation.speedMultiplier || 1) : 1) : 0;

        this.traffic.update(speedMult, 0.016);
        if (this.canalTraffic) this.canalTraffic.update(speedMult, 0.016);
        if (this.trainTraffic) this.trainTraffic.update(0.016, speedMult);
        if (this.simulation?.typhoon) this.simulation.typhoon.updateRain(0.016);
        if (this.fx) this.fx.update(0.016);
        if (this.lighting && typeof this.lighting.update === 'function') this.lighting.update(0.016);
        this.renderer.render(this.scene, this.camera);
    }
}
