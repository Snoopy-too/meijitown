// Project Meiji - Three.js Isometric 3D Diorama Renderer (renderer.js)
// Phase 1 Architecture: Strictly-Three.js synchronous pipeline, ACESFilmic PBR, Clock delta & safe GPU disposal (< 420 lines)

import * as THREE from 'three';
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
import { BackdropManager } from './renderer/backdropManager.js';
import { CloudManager } from './renderer/cloudManager.js';
import { MaterialLibrary } from './renderer/materialLibrary.js';

export class WorldRenderer {
    constructor(containerElement, gridModel, rootElement = null) {
        this.root = rootElement || (containerElement && containerElement.getRootNode ? containerElement.getRootNode() : document);
        this.container = containerElement
            || (this.root && this.root.querySelector ? this.root.querySelector('#canvas-container') : null)
            || (typeof document !== 'undefined' ? document.getElementById('canvas-container') : null)
            || (typeof document !== 'undefined' ? document.body : null);
        this.grid = gridModel;
        this.tileMeshes = new Map();
        this.modelCache = new Map();
        this.modelsLoaded = true;
        this.simulation = null;
        this.clock = new THREE.Clock();

        MaterialLibrary.init();
        this.initScene();
        this.cameraManager = new CameraManager(this.container, this.renderer.domElement);
        this.lighting = SceneLighting.initLights(this.scene);
        this.raycast = new RaycastManager(this.scene);
        this.ghostCursor = new GhostCursorManager(this.scene);
        this.backdrop = BackdropManager.init(this.scene);
        this.clouds = CloudManager.init(this.scene);

        this.initGround();

        const initialFoliageColor = (CONFIG.SIMULATION.SEASON_COLORS && CONFIG.SIMULATION.SEASON_COLORS.WINTER) || 0x8c857b;
        this.seasonalFoliageMaterial = new THREE.MeshStandardMaterial({ color: initialFoliageColor, roughness: 0.8 });

        this.instancing = new InstancingManager(this.scene, this.modelCache);
        this.instancing.setSeasonalMaterial(this.seasonalFoliageMaterial);

        this.fx = new ParticleManager(this.scene);
        this.traffic = new TrafficManager(this.scene, this.grid, this.getTileWorldPos.bind(this), this.fx);
        this.canalTraffic = new CanalTrafficManager(this.scene, this.grid, this.getTileWorldPos.bind(this), this.modelCache);
        this.trainTraffic = new TrainTrafficManager(this.scene, this.grid, this.getTileWorldPos.bind(this), this.modelCache);
        this.overlay = new OverlaySystem(this.scene, this.grid, null, this.root);

        this.bindEvents();
        this.loadAssets();

        this.grid.subscribe((event, data) => {
            if (event === 'tile_updated') {
                this.updateTileMesh(data.x, data.y, data.tile);
                this.refreshAdjacentRoads(data.x, data.y);
                this.refreshAdjacentBuildings(data.x, data.y);
                if (this.isFoliageTile(data.x, data.y)) {
                    this.rebuildInstancedBatches();
                }
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
        const width = (this.container && this.container.clientWidth > 0) ? this.container.clientWidth : window.innerWidth;
        const height = (this.container && this.container.clientHeight > 0) ? this.container.clientHeight : window.innerHeight;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(CONFIG.ATMOSPHERE.BACKGROUND);
        this.scene.fog = new THREE.FogExp2(CONFIG.ATMOSPHERE.FOG, CONFIG.ATMOSPHERE.FOG_DENSITY);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.05;
        if (THREE.SRGBColorSpace) {
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        }
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        if (this.container && typeof this.container.appendChild === 'function') {
            this.container.appendChild(this.renderer.domElement);
        } else if (typeof document !== 'undefined' && document.body) {
            document.body.appendChild(this.renderer.domElement);
        }

        if (typeof ResizeObserver !== 'undefined' && this.container) {
            this.resizeObserver = new ResizeObserver(() => {
                if (this.cameraManager) {
                    this.cameraManager.handleResize(this.renderer);
                }
            });
            this.resizeObserver.observe(this.container);
        }
    }

    initGround() {
        const totalSizeX = CONFIG.GRID_WIDTH * CONFIG.TILE_SIZE;
        const totalSizeZ = CONFIG.GRID_HEIGHT * CONFIG.TILE_SIZE;
        this.groundMesh = new THREE.Mesh(
            new THREE.BoxGeometry(totalSizeX, 1.0, totalSizeZ),
            new THREE.MeshStandardMaterial({ color: CONFIG.COLORS.GROUND, roughness: 0.92 })
        );
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
        if (this.backdrop) this.backdrop.updateSeason(month);
        for (const [_, tile] of this.grid.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.AGRICULTURE) this.updateTileMesh(tile.x, tile.y, tile);
        }
    }

    updateDayNight(month) {
        if (this.lighting && typeof this.lighting.updateMonth === 'function') this.lighting.updateMonth(month);
        if (this.clouds && typeof this.clouds.updateDayNight === 'function') this.clouds.updateDayNight(month);
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

    /**
     * Strictly-Three.js synchronous asset initialization (no external .glb HTTP fetches).
     */
    async loadAssets() {
        this.modelsLoaded = true;
        this.rebuildAllMeshes();
        return true;
    }

    getFacingAngleForTile(x, y) {
        const tile = this.grid.getTile(x, y);
        if (tile && (tile.manualRotation || (typeof tile.rotation === 'number' && tile.rotation !== 0))) {
            return (tile.rotation % 4) * (Math.PI / 2);
        }
        const dirs = [{ dx: 0, dy: 1, a: 0 }, { dx: 1, dy: 0, a: Math.PI / 2 }, { dx: 0, dy: -1, a: Math.PI }, { dx: -1, dy: 0, a: -Math.PI / 2 }];
        for (const d of dirs) {
            const t = this.grid.getTile(x + d.dx, y + d.dy);
            if (t && (t.type === CONFIG.TYPES.ROAD || (t.type === CONFIG.TYPES.CANAL && t.hasBridge))) return d.a;
        }
        for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
            const t = this.grid.getTile(x + dx, y + dy);
            if (t && (t.type === CONFIG.TYPES.ROAD || (t.type === CONFIG.TYPES.CANAL && t.hasBridge))) return Math.atan2(dx, dy);
        }
        return (tile?.rotation ? (tile.rotation % 4) * (Math.PI / 2) : 0);
    }

    createServiceMesh(tile, facingAngle) {
        return CivicMeshes.createServiceMesh(tile, facingAngle, this.modelCache);
    }

    createZoneMesh(tile, facingAngle, key, pos) {
        const s = CONFIG.TILE_SIZE;
        const group = new THREE.Group();

        if (tile.stage === CONFIG.STAGES.SCAFFOLDING) {
            group.add(ProceduralMeshes.createScaffoldMesh(tile, facingAngle));
        } else if (tile.stage === CONFIG.STAGES.BUILT) {
            group.add(ProceduralMeshes.createZoneBuildingMesh(tile, facingAngle));
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
                if (!tile || tile.type === CONFIG.TYPES.EMPTY) {
                    if (this.isFoliageTile(x, y)) {
                        const pos = this.getTileWorldPos(x, y);
                        if ((x + y) % 3 === 0) this.instancing.addSakuraTree(pos.x, pos.z);
                        else this.instancing.addPineTree(pos.x, pos.z);
                    }
                }
            }
        }
        this.instancing.commitBatch();
    }

    updateTileMesh(x, y, tile) {
        const key = this.grid.getKey(x, y);
        if (this.tileMeshes.has(key)) {
            const oldMesh = this.tileMeshes.get(key);
            this.scene.remove(oldMesh);
            MaterialLibrary.disposeGroup(oldMesh);
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
        for (const [_, mesh] of this.tileMeshes.entries()) {
            this.scene.remove(mesh);
            MaterialLibrary.disposeGroup(mesh);
        }
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
        if (this.isDestroyed) return;
        this.animFrameId = requestAnimationFrame(this.animate);
        const delta = Math.min(this.clock ? this.clock.getDelta() : 0.016, 0.1) || 0.016;

        this.cameraManager.update();
        const isSimRunning = !this.simulation || this.simulation.isRunning;
        const speedMult = isSimRunning ? (this.simulation ? (this.simulation.speedMultiplier || 1) : 1) : 0;

        this.traffic.update(speedMult, delta);
        if (this.canalTraffic) this.canalTraffic.update(speedMult, delta);
        if (this.trainTraffic) this.trainTraffic.update(delta, speedMult);
        if (this.simulation?.typhoon) this.simulation.typhoon.updateRain(delta);
        if (this.fx) this.fx.update(delta);
        if (this.lighting && typeof this.lighting.update === 'function') this.lighting.update(delta);
        if (this.clouds) this.clouds.update(delta, isSimRunning ? speedMult : 1, !!this.simulation?.typhoon?.isStormActive);
        this.renderer.render(this.scene, this.camera);
    }

    destroy() {
        this.isDestroyed = true;
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        if (this.backdrop?.group) this.scene.remove(this.backdrop.group);
        if (this.clouds?.group) this.scene.remove(this.clouds.group);
        if (this.renderer?.domElement?.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        if (typeof this.renderer?.dispose === 'function') this.renderer.dispose();
    }
}
