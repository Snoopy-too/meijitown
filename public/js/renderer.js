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
                this.syncGroundTopography();
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
        const segsX = CONFIG.GRID_WIDTH * 4;
        const segsZ = CONFIG.GRID_HEIGHT * 4;

        const groundGeo = new THREE.PlaneGeometry(totalSizeX, totalSizeZ, segsX, segsZ);
        groundGeo.rotateX(-Math.PI / 2);
        this.groundMesh = new THREE.Mesh(
            groundGeo,
            MaterialLibrary.get('meadowGround').clone()
        );
        this.groundMesh.position.set(totalSizeX / 2, 0.0, totalSizeZ / 2);
        this.groundMesh.receiveShadow = true;
        this.scene.add(this.groundMesh);

        // Sub-surface diorama earthen plinth below recessed canal bed level (y = -0.22 to -1.0)
        this.groundPlinth = new THREE.Mesh(
            new THREE.BoxGeometry(totalSizeX, 0.78, totalSizeZ),
            MaterialLibrary.get('stoneGranite')
        );
        this.groundPlinth.position.set(totalSizeX / 2, -0.61, totalSizeZ / 2);
        this.groundPlinth.receiveShadow = true;
        this.scene.add(this.groundPlinth);

        const gridHelper = new THREE.GridHelper(totalSizeX, CONFIG.GRID_WIDTH, 0x3b4d30, 0x455939);
        gridHelper.position.set(totalSizeX / 2, 0.012, totalSizeZ / 2);
        if (gridHelper.material) {
            gridHelper.material.transparent = true;
            gridHelper.material.opacity = 0.14;
            gridHelper.material.depthWrite = false;
        }
        this.gridHelper = gridHelper;
        this.scene.add(gridHelper);
        this.syncGroundTopography();
    }

    syncGroundTopography() {
        if (!this.groundMesh?.geometry?.attributes?.position || !this.grid) return;
        const pos = this.groundMesh.geometry.attributes.position;
        if (typeof pos.getX !== 'function' || typeof pos.setY !== 'function') return;

        const s = CONFIG.TILE_SIZE;
        const halfX = (CONFIG.GRID_WIDTH * s) / 2;
        const halfZ = (CONFIG.GRID_HEIGHT * s) / 2;

        for (let i = 0; i < pos.count; i++) {
            const wx = pos.getX(i) + halfX;
            const wz = pos.getZ(i) + halfZ;
            const tx = Math.min(CONFIG.GRID_WIDTH - 1, Math.max(0, Math.floor(wx / s)));
            const ty = Math.min(CONFIG.GRID_HEIGHT - 1, Math.max(0, Math.floor(wz / s)));
            const tile = this.grid.getTile(tx, ty);

            const lx = wx - (tx + 0.5) * s;
            const lz = wz - (ty + 0.5) * s;
            const edgeDist = Math.max(Math.abs(lx), Math.abs(lz));

            let targetY = 0.0;
            if (tile && tile.type === CONFIG.TYPES.CANAL) {
                // Physical canal excavation: carve terrain down to -0.20m inside canal envelope
                targetY = edgeDist < (s * 0.48) ? -0.20 : -0.04;
            } else if (tile && tile.type === CONFIG.TYPES.AGRICULTURE) {
                // Gently recessed irrigated rice paddy basin interior
                targetY = edgeDist < (s * 0.38) ? -0.022 : 0.0;
            } else if (!tile || tile.type === CONFIG.TYPES.EMPTY) {
                // Subtle natural turf micro-relief on unbuilt meadow tiles (zero on tile borders)
                if (edgeDist < s * 0.40) {
                    targetY = Math.sin(wx * 1.35 + wz * 0.95) * Math.cos(wx * 0.85 - wz * 1.25) * 0.012;
                }
            }
            pos.setY(i, targetY);
        }
        pos.needsUpdate = true;
        if (typeof this.groundMesh.geometry.computeVertexNormals === 'function') {
            this.groundMesh.geometry.computeVertexNormals();
        }

        // Prevent gridHelper lines (y = 0.012) from floating in mid-air across recessed canal trenches
        if (this.gridHelper?.geometry && typeof this.gridHelper.geometry.setAttribute === 'function' && THREE.Float32BufferAttribute) {
            const verts = [];
            const gw = CONFIG.GRID_WIDTH;
            const gh = CONFIG.GRID_HEIGHT;
            const isCanal = (x, y) => {
                if (!this.grid.isValidCoord(x, y)) return false;
                const t = this.grid.getTile(x, y);
                return Boolean(t && t.type === CONFIG.TYPES.CANAL);
            };
            for (let x = 0; x <= gw; x++) {
                const lx = x * s - halfX;
                for (let y = 0; y < gh; y++) {
                    if (isCanal(x - 1, y) && isCanal(x, y)) continue;
                    verts.push(lx, 0, y * s - halfZ, lx, 0, (y + 1) * s - halfZ);
                }
            }
            for (let y = 0; y <= gh; y++) {
                const lz = y * s - halfZ;
                for (let x = 0; x < gw; x++) {
                    if (isCanal(x, y - 1) && isCanal(x, y)) continue;
                    verts.push(x * s - halfX, 0, lz, (x + 1) * s - halfX, 0, lz);
                }
            }
            this.gridHelper.geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
            if (this.gridHelper.geometry.attributes?.color && typeof this.gridHelper.geometry.deleteAttribute === 'function') {
                this.gridHelper.geometry.deleteAttribute('color');
            }
            if (this.gridHelper.material) {
                this.gridHelper.material.vertexColors = false;
            }
        }
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

    setBuildMode(isBuilding) {
        this.cameraManager.setBuildMode(isBuilding);
        if (this.gridHelper?.material) this.gridHelper.material.opacity = isBuilding ? 0.36 : 0.14;
    }
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
        if (this.groundMesh?.material) {
            const gCol = (month >= 3 && month <= 5) ? 0xddebd4 : (month >= 6 && month <= 8) ? 0xffffff : (month >= 9 && month <= 11) ? 0xdec49b : 0xd2d6cf;
            this.groundMesh.material.color.setHex(gCol);
        }
        for (const [_, tile] of this.grid.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.AGRICULTURE) this.updateTileMesh(tile.x, tile.y, tile);
        }
    }

    updateDayNight(month) {
        if (this.lighting && typeof this.lighting.updateMonth === 'function') this.lighting.updateMonth(month);
        if (this.clouds && typeof this.clouds.updateDayNight === 'function') this.clouds.updateDayNight(month);
        if (this.backdrop && typeof this.backdrop.updateDayNight === 'function') this.backdrop.updateDayNight(month);
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
            group.add(ProceduralMeshes.createZoneBuildingMesh(tile, facingAngle));
            this.fx.attachFire(key, pos.x, pos.z);
        } else if (tile.stage === CONFIG.STAGES.BURNED) {
            this.fx.detachFire(key);
            const charMat = MaterialLibrary.get('plasterBlack');
            const rn = new THREE.Mesh(new THREE.BoxGeometry(s * 0.78, 0.14, s * 0.78), MaterialLibrary.get('stoneGranite'));
            rn.position.y = 0.07;
            group.add(rn);
            for (const [bx, by, bz, rz] of [[-0.25, 0.20, 0.12, 0.25], [0.22, 0.18, -0.15, -0.32], [0, 0.22, 0, 0.15]]) {
                const beam = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.07, 0.09), charMat);
                beam.position.set(bx, by, bz);
                beam.rotation.set(0.1, bx, rz);
                group.add(beam);
            }
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
        this.syncGroundTopography();
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
        CanalMesh.updateWater(delta * (isSimRunning ? Math.max(0.5, speedMult * 0.6) : 0.3));
        if (this.trainTraffic) this.trainTraffic.update(delta, speedMult);
        if (this.simulation?.typhoon) this.simulation.typhoon.updateRain(delta);
        if (this.fx) this.fx.update(delta, speedMult, this.tileMeshes, this.state?.currentMonth || 1);
        const isStorm = !!this.simulation?.typhoon?.isStormActive;
        if (this.lighting && typeof this.lighting.update === 'function') this.lighting.update(delta);
        if (this.backdrop && typeof this.backdrop.update === 'function') this.backdrop.update(delta, isStorm);
        if (this.clouds) this.clouds.update(delta, isSimRunning ? speedMult : 1, isStorm);
        this.renderer.render(this.scene, this.camera);
    }

    destroy() {
        this.isDestroyed = true;
        if (this.animFrameId) { cancelAnimationFrame(this.animFrameId); this.animFrameId = null; }
        if (this.resizeObserver) { this.resizeObserver.disconnect(); this.resizeObserver = null; }
        if (this.backdrop?.group) this.scene.remove(this.backdrop.group);
        if (this.clouds?.group) this.scene.remove(this.clouds.group);
        if (this.renderer?.domElement?.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        if (typeof this.renderer?.dispose === 'function') this.renderer.dispose();
    }
}
