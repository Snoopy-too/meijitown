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
import { RoadTextureManager } from './renderer/road_texture.js';
import { RailAutoTiler } from './renderer/railAutoTiler.js';
import { PBRTextureGenerator } from './renderer/pbrTextureGenerator.js';
import { EnvironmentIBL } from './renderer/environmentIBL.js';
import { PostProcessingPipeline } from './renderer/postProcessing.js';
import { WaterShaderSystem } from './renderer/waterShader.js';
import { TerrainShaderSystem } from './renderer/terrainShader.js';
import { WeatheringShaderSystem } from './renderer/weatheringShader.js';
import {
    GRAPHICS_PRESETS,
    normalizeGraphicsPreset,
    loadSavedGraphicsPreset,
    saveGraphicsPreset
} from './renderer/graphicsSettings.js';

export class WorldRenderer {
    constructor(containerElement, gridModel, rootElement = null, options = {}) {
        this.root = rootElement || (containerElement && containerElement.getRootNode ? containerElement.getRootNode() : document);
        this.container = containerElement
            || (this.root && this.root.querySelector ? this.root.querySelector('#canvas-container') : null)
            || (typeof document !== 'undefined' ? document.getElementById('canvas-container') : null)
            || (typeof document !== 'undefined' ? document.body : null);
        this.grid = gridModel;
        this.tileMeshes = new Map();
        this.modelCache = new Map();
        this.modelsLoaded = true;
        this.hasBuiltInitialMeshes = false;
        this._deferInitialBuild = Boolean(options.deferInitialBuild);
        this._lastCanalSig = null;
        this._lastPixelRatio = null;
        this.simulation = null;
        this.clock = new THREE.Clock();

        this.graphicsPreset = normalizeGraphicsPreset(options.graphicsPreset || loadSavedGraphicsPreset());
        const presetCfg = GRAPHICS_PRESETS[this.graphicsPreset] || GRAPHICS_PRESETS.medium;
        this.pixelRatioCap = presetCfg.pixelRatioCap;

        MaterialLibrary.init();
        this.initScene();
        this.cameraManager = new CameraManager(this.container, this.renderer.domElement);
        this.lighting = SceneLighting.initLights(this.scene);
        this.lighting.setShadowQuality(presetCfg.shadowsEnabled, presetCfg.shadowMapSize);
        this.envIBL = new EnvironmentIBL(this.renderer, this.scene);
        if (!this._deferInitialBuild) {
            this.envIBL.setPhase('DAY', false, this.lighting.currentSunOffset);
        }

        const initW = (this.container && this.container.clientWidth > 0) ? this.container.clientWidth : (typeof window !== 'undefined' ? window.innerWidth : 1280);
        const initH = (this.container && this.container.clientHeight > 0) ? this.container.clientHeight : (typeof window !== 'undefined' ? window.innerHeight : 720);
        const initPR = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, this.pixelRatioCap) : 1;
        this.postProcessing = new PostProcessingPipeline(this.renderer, this.scene, this.camera, {
            width: initW,
            height: initH,
            pixelRatio: initPR,
            preset: presetCfg.postPreset,
            tiltShiftEnabled: presetCfg.tiltShiftEnabled
        });
        if (presetCfg.postPreset !== 'off') {
            this.postProcessing.init();
        }
        this._lastEnvSyncKey = this._deferInitialBuild ? '' : 'DAY_0';

        if (typeof window !== 'undefined') {
            window.meijiGraphics = {
                getPreset: () => this.graphicsPreset,
                setPreset: (preset) => this.setGraphicsPreset(preset),
                setTiltShift: (enabled) => this.setTiltShift(enabled)
            };
        }

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
        this.trainTraffic = new TrainTrafficManager(this.scene, this.grid, this.getTileWorldPos.bind(this), this.modelCache, {
            traffic: this.traffic,
            getFacingAngle: this.getFacingAngleForTile.bind(this)
        });
        this.overlay = new OverlaySystem(this.scene, this.grid, null, this.root);
        this.overlay.renderer = this;
        this.overlay.syncGraphicsSelector(this.graphicsPreset);

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

        const presetCfg = GRAPHICS_PRESETS[this.graphicsPreset] || GRAPHICS_PRESETS.medium;
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        const initPR = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, this.pixelRatioCap) : 1;
        this._lastPixelRatio = initPR;
        this.renderer.setPixelRatio(initPR);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.05;
        if (THREE.SRGBColorSpace) {
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        }
        const maxAniso = (this.renderer.capabilities && typeof this.renderer.capabilities.getMaxAnisotropy === 'function')
            ? Math.min(16, this.renderer.capabilities.getMaxAnisotropy())
            : 8;
        PBRTextureGenerator.setMaxAnisotropy(maxAniso);

        this.renderer.shadowMap.enabled = presetCfg.shadowsEnabled;
        this.renderer.shadowMap.type = THREE[presetCfg.shadowTypeKey] || THREE.PCFShadowMap;
        if (this.container && typeof this.container.appendChild === 'function') {
            this.container.appendChild(this.renderer.domElement);
        } else if (typeof document !== 'undefined' && document.body) {
            document.body.appendChild(this.renderer.domElement);
        }

        if (typeof ResizeObserver !== 'undefined' && this.container) {
            this.resizeObserver = new ResizeObserver(() => this.handleResize());
            this.resizeObserver.observe(this.container);
        }
    }

    handleResize(force = false) {
        if (!this.renderer || !this.cameraManager) return;
        const rw = (this.container && this.container.clientWidth > 0)
            ? this.container.clientWidth
            : (typeof window !== 'undefined' ? window.innerWidth : 1280);
        const rh = (this.container && this.container.clientHeight > 0)
            ? this.container.clientHeight
            : (typeof window !== 'undefined' ? window.innerHeight : 720);
        const rpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, this.pixelRatioCap) : 1;
        const prChanged = rpr !== this._lastPixelRatio;
        if (prChanged) {
            this._lastPixelRatio = rpr;
            this.renderer.setPixelRatio(rpr);
        }
        const resized = this.cameraManager.handleResize(this.renderer, force || prChanged);
        if ((resized || prChanged || force) && this.postProcessing) {
            this.postProcessing.resize(rw, rh, rpr);
        }
    }

    initGround() {
        const totalSizeX = CONFIG.GRID_WIDTH * CONFIG.TILE_SIZE;
        const totalSizeZ = CONFIG.GRID_HEIGHT * CONFIG.TILE_SIZE;
        const segsX = CONFIG.GRID_WIDTH * 4;
        const segsZ = CONFIG.GRID_HEIGHT * 4;

        const groundGeo = new THREE.PlaneGeometry(totalSizeX, totalSizeZ, segsX, segsZ);
        groundGeo.rotateX(-Math.PI / 2);
        const groundMat = this.backdrop?.skirtMaterial || TerrainShaderSystem.enhanceGroundMaterial(MaterialLibrary.get('meadowGround').clone());
        this.groundMesh = new THREE.Mesh(
            groundGeo,
            groundMat
        );
        this.groundMesh.position.set(totalSizeX / 2, 0.0, totalSizeZ / 2);
        this.groundMesh.receiveShadow = true;
        this.scene.add(this.groundMesh);

        const gridHelper = new THREE.GridHelper(totalSizeX, CONFIG.GRID_WIDTH, 0x3b4d30, 0x455939);
        gridHelper.position.set(totalSizeX / 2, 0.012, totalSizeZ / 2);
        if (gridHelper.material) {
            gridHelper.material.transparent = true;
            gridHelper.material.opacity = 0.0;
            gridHelper.material.depthWrite = false;
        }
        gridHelper.visible = false;
        this.gridHelper = gridHelper;
        this.scene.add(gridHelper);
    }

    syncGroundTopography() {
        if (!this.groundMesh?.geometry?.attributes?.position || !this.grid) return;
        const pos = this.groundMesh.geometry.attributes.position;
        if (typeof pos.getX !== 'function' || typeof pos.setY !== 'function') return;

        const s = CONFIG.TILE_SIZE;
        const halfX = (CONFIG.GRID_WIDTH * s) / 2;
        const halfZ = (CONFIG.GRID_HEIGHT * s) / 2;

        const isCanal = (x, y) => {
            if (!this.grid.isValidCoord(x, y)) return false;
            const t = this.grid.getTile(x, y);
            return Boolean(t && t.type === CONFIG.TYPES.CANAL);
        };

        for (let i = 0; i < pos.count; i++) {
            const wx = pos.getX(i) + halfX;
            const wz = pos.getZ(i) + halfZ;
            const tx = Math.min(CONFIG.GRID_WIDTH - 1, Math.max(0, Math.floor(wx / s)));
            const ty = Math.min(CONFIG.GRID_HEIGHT - 1, Math.max(0, Math.floor(wz / s)));
            const tile = this.grid.getTile(tx, ty);

            const lx = wx - (tx + 0.5) * s;
            const lz = wz - (ty + 0.5) * s;
            const edgeDist = Math.max(Math.abs(lx), Math.abs(lz));

            // Check all tiles sharing this vertex (handles borders between adjacent canal squares)
            const eps = 0.02;
            const tx0 = Math.max(0, Math.min(CONFIG.GRID_WIDTH - 1, Math.floor((wx - eps) / s)));
            const tx1 = Math.max(0, Math.min(CONFIG.GRID_WIDTH - 1, Math.floor((wx + eps) / s)));
            const ty0 = Math.max(0, Math.min(CONFIG.GRID_HEIGHT - 1, Math.floor((wz - eps) / s)));
            const ty1 = Math.max(0, Math.min(CONFIG.GRID_HEIGHT - 1, Math.floor((wz + eps) / s)));
            const allTouchingCanal = isCanal(tx0, ty0) && isCanal(tx1, ty0) && isCanal(tx0, ty1) && isCanal(tx1, ty1);

            let targetY = 0.0;
            if (allTouchingCanal || (tile && tile.type === CONFIG.TYPES.CANAL && edgeDist < (s * 0.48))) {
                // Physical canal excavation: carve terrain down to -0.20m across interior & shared canal boundaries
                targetY = -0.20;
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

        // Cut out groundMesh grass triangles inside CANAL tiles only when canal layout changed
        let canalSig = '';
        const gw = CONFIG.GRID_WIDTH;
        const gh = CONFIG.GRID_HEIGHT;
        for (let y = 0; y < gh; y++) {
            for (let x = 0; x < gw; x++) {
                if (isCanal(x, y)) canalSig += `${x},${y};`;
            }
        }
        const canalChanged = canalSig !== this._lastCanalSig;
        this._lastCanalSig = canalSig;

        if (canalChanged && this.groundMesh.geometry.index && typeof this.groundMesh.geometry.setIndex === 'function') {
            const segsX = gw * 4;
            const segsZ = gh * 4;
            const stride = segsX + 1;
            const indices = [];
            for (let iz = 0; iz < segsZ; iz++) {
                const ty = Math.floor(iz / 4);
                for (let ix = 0; ix < segsX; ix++) {
                    const tx = Math.floor(ix / 4);
                    if (isCanal(tx, ty)) continue;
                    const a = iz * stride + ix;
                    const b = iz * stride + (ix + 1);
                    const c = (iz + 1) * stride + ix;
                    const d = (iz + 1) * stride + (ix + 1);
                    indices.push(a, c, b, c, d, b);
                }
            }
            this.groundMesh.geometry.setIndex(indices);
        }

        if (typeof this.groundMesh.geometry.computeVertexNormals === 'function') {
            this.groundMesh.geometry.computeVertexNormals();
        }

        // Prevent gridHelper lines (y = 0.012) from floating in mid-air across recessed canal trenches
        if (canalChanged && this.gridHelper?.geometry && typeof this.gridHelper.geometry.setAttribute === 'function' && THREE.Float32BufferAttribute) {
            const verts = [];
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
        window.addEventListener('resize', () => this.handleResize());
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
        if (this.gridHelper) {
            this.gridHelper.visible = isBuilding;
            if (this.gridHelper.material) {
                this.gridHelper.material.opacity = isBuilding ? 0.36 : 0.0;
            }
        }
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
        WeatheringShaderSystem.setSeasonSnow(month);
        if (this.groundMesh?.material && this.groundMesh.material !== this.backdrop?.skirtMaterial) {
            const gCol = (month >= 3 && month <= 5) ? 0x638a53 : (month >= 6 && month <= 8) ? 0x4e7840 : (month >= 9 && month <= 11) ? 0x8a724b : 0x7a7d76;
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
        this._syncEnvironmentPhase(!!this.simulation?.typhoon?.isStormActive);
    }

    setGraphicsPreset(preset = 'medium') {
        const normalized = saveGraphicsPreset(preset);
        this.graphicsPreset = normalized;
        const cfg = GRAPHICS_PRESETS[normalized] || GRAPHICS_PRESETS.medium;
        this.pixelRatioCap = cfg.pixelRatioCap;

        if (this.renderer?.shadowMap) {
            this.renderer.shadowMap.enabled = cfg.shadowsEnabled;
            this.renderer.shadowMap.type = THREE[cfg.shadowTypeKey] || THREE.PCFShadowMap;
            this.renderer.shadowMap.needsUpdate = true;
        }
        if (this.lighting && typeof this.lighting.setShadowQuality === 'function') {
            this.lighting.setShadowQuality(cfg.shadowsEnabled, cfg.shadowMapSize);
        }
        this.handleResize(true);

        if (this.postProcessing) {
            this.postProcessing.setPreset(cfg.postPreset);
            this.postProcessing.setTiltShift(cfg.tiltShiftEnabled);
            if (cfg.postPreset !== 'off' && !this.postProcessing.ready) {
                this.postProcessing.init();
            }
        }
        if (this.overlay && typeof this.overlay.syncGraphicsSelector === 'function') {
            this.overlay.syncGraphicsSelector(normalized);
        }
        return normalized;
    }

    setTiltShift(enabled = true) {
        if (this.postProcessing) {
            this.postProcessing.setTiltShift(enabled);
        }
    }

    _syncEnvironmentPhase(isStorm = false) {
        if (!this.lighting) return;
        const phaseKey = this.lighting.currentPhaseKey || 'DAY';
        const syncKey = `${phaseKey}_${isStorm ? 1 : 0}`;
        if (this._lastEnvSyncKey === syncKey) return;
        this._lastEnvSyncKey = syncKey;

        if (this.envIBL) {
            this.envIBL.setPhase(phaseKey, isStorm, this.lighting.targetSunPos || this.lighting.currentSunOffset);
        }
        if (this.postProcessing) {
            this.postProcessing.setPhase(phaseKey, isStorm);
        }
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
        if (!this._deferInitialBuild) {
            this.rebuildAllMeshes();
        }
        return true;
    }

    getFacingAngleForTile(x, y) {
        const rawTile = this.grid.getTile(x, y);
        const bx = (rawTile && rawTile.isOrigin === false && typeof rawTile.originX === 'number') ? rawTile.originX : x;
        const by = (rawTile && rawTile.isOrigin === false && typeof rawTile.originY === 'number') ? rawTile.originY : y;
        const tile = (bx === x && by === y) ? rawTile : (this.grid.getTile(bx, by) || rawTile);

        if (tile && tile.manualRotation) {
            return ((tile.rotation || 0) % 4) * (Math.PI / 2);
        }

        const isRoadTile = (tx, ty) => {
            const t = this.grid.getTile(tx, ty);
            return Boolean(t && !t.submerged && (t.type === CONFIG.TYPES.ROAD || (t.type === CONFIG.TYPES.CANAL && t.hasBridge) || (t.type === CONFIG.TYPES.RAIL && t.hasCrossing)));
        };

        // Train Depot: prioritize snapping centerline through-track to adjacent RAIL / TRAIN_DEPOT tiles first
        if (tile && tile.type === CONFIG.TYPES.SERVICE && tile.serviceType === CONFIG.SERVICES.TRAIN_DEPOT) {
            const isRailLink = (dx, dy) => {
                const t = this.grid.getTile(bx + dx, by + dy);
                return Boolean(t && (t.type === CONFIG.TYPES.RAIL || (t.type === CONFIG.TYPES.SERVICE && t.serviceType === CONFIG.SERVICES.TRAIN_DEPOT)));
            };
            const railNS = isRailLink(0, -1) || isRailLink(0, 1);
            const railEW = isRailLink(-1, 0) || isRailLink(1, 0);

            if (railNS && !railEW) {
                // Track runs North-South (rotation Math.PI/2 or -Math.PI/2); place station house toward adjacent road
                return isRoadTile(bx + 1, by) ? -Math.PI / 2 : Math.PI / 2;
            }
            if (railEW && !railNS) {
                // Track runs East-West (rotation 0 or Math.PI); place station house (-Z local) toward North road (0) or South road (Math.PI)
                return isRoadTile(bx, by + 1) ? Math.PI : 0;
            }
        }

        let fw = 1, fh = 1;
        if (tile) {
            if (tile.footprintW && tile.footprintH) {
                fw = tile.footprintW;
                fh = tile.footprintH;
            } else if (tile.type === CONFIG.TYPES.SERVICE) {
                const st = tile.serviceType;
                if (st === CONFIG.SERVICES.SCHOOL && tile.multiSize === 6) {
                    fw = (tile.rotation % 2 === 1) ? 2 : 3;
                    fh = (tile.rotation % 2 === 1) ? 3 : 2;
                } else if (st === CONFIG.SERVICES.SCHOOL || st === CONFIG.SERVICES.POWER_PLANT || st === CONFIG.SERVICES.HARBOR_PIER) {
                    fw = 2; fh = 2;
                } else if (st === CONFIG.SERVICES.WATERWORKS) {
                    fw = 2; fh = 1;
                } else if (st === CONFIG.SERVICES.PAVILION) {
                    fw = 3; fh = 3;
                }
            }
        }

        const allEdges = [
            { a: 0,           axis: 'NS', coords: Array.from({ length: fw }, (_, i) => [bx + i, by + fh]) }, // South (+Z)
            { a: Math.PI / 2, axis: 'EW', coords: Array.from({ length: fh }, (_, i) => [bx + fw, by + i]) }, // East (+X)
            { a: Math.PI,     axis: 'NS', coords: Array.from({ length: fw }, (_, i) => [bx + i, by - 1]) },  // North (-Z)
            { a: -Math.PI / 2, axis: 'EW', coords: Array.from({ length: fh }, (_, i) => [bx - 1, by + i]) }, // West (-X)
        ];

        // Harbor Pier front (+Z) holds waterfront pilings & crane boom; face toward adjacent canal
        if (tile && tile.type === CONFIG.TYPES.SERVICE && tile.serviceType === CONFIG.SERVICES.HARBOR_PIER) {
            const isCanalTile = (tx, ty) => {
                const t = this.grid.getTile(tx, ty);
                return Boolean(t && t.type === CONFIG.TYPES.CANAL);
            };
            let bestAngle = null;
            let bestCanals = 0;
            for (const edge of allEdges) {
                let count = 0;
                for (const [cx, cy] of edge.coords) if (isCanalTile(cx, cy)) count++;
                if (count > bestCanals) {
                    bestCanals = count;
                    bestAngle = edge.a;
                }
            }
            if (bestAngle !== null) return bestAngle;
        }

        // Non-square footprints (e.g., 3x2, 2x3, 2x1) must stay aligned with their placed grid dimensions
        const edgeChecks = (fw > fh)
            ? allEdges.filter(e => e.axis === 'NS')
            : ((fh > fw) ? allEdges.filter(e => e.axis === 'EW') : allEdges);

        let bestAngle = null;
        let bestCount = 0;
        for (const edge of edgeChecks) {
            let count = 0;
            for (const [cx, cy] of edge.coords) {
                if (isRoadTile(cx, cy)) count++;
            }
            if (count > bestCount) {
                bestCount = count;
                bestAngle = edge.a;
            }
        }
        if (bestAngle !== null) return bestAngle;

        if (fw === 1 && fh === 1) {
            for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
                if (isRoadTile(bx + dx, by + dy)) return Math.atan2(dx, dy);
            }
        }
        if (tile && typeof tile.rotation === 'number' && tile.rotation !== 0) {
            return (tile.rotation % 4) * (Math.PI / 2);
        }
        return (fh > fw) ? Math.PI / 2 : 0;
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
                const isTrainDepot = t && t.type === CONFIG.TYPES.SERVICE && t.serviceType === CONFIG.SERVICES.TRAIN_DEPOT;
                if (t && (t.type === CONFIG.TYPES.ROAD || t.type === CONFIG.TYPES.CANAL || t.type === CONFIG.TYPES.RAIL || isTrainDepot)) {
                    this.updateTileMesh(nx, ny, t);
                }
            }
        }
        // Canal corner bastions depend on diagonal neighbors as well
        for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
            const nx = x + dx, ny = y + dy;
            if (this.grid.isValidCoord(nx, ny)) {
                const t = this.grid.getTile(nx, ny);
                if (t && t.type === CONFIG.TYPES.CANAL) {
                    this.updateTileMesh(nx, ny, t);
                }
            }
        }
    }

    refreshAdjacentBuildings(x, y) {
        const refreshed = new Set();
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx, ny = y + dy;
                if (this.grid.isValidCoord(nx, ny)) {
                    const t = this.grid.getTile(nx, ny);
                    if (!t) continue;
                    if (t.type === CONFIG.TYPES.ZONE && (t.stage === CONFIG.STAGES.BUILT || t.stage === CONFIG.STAGES.SCAFFOLDING || t.stage === CONFIG.STAGES.ON_FIRE)) {
                        const key = this.grid.getKey(nx, ny);
                        if (!refreshed.has(key)) {
                            refreshed.add(key);
                            this.updateTileMesh(nx, ny, t);
                        }
                    } else if (t.type === CONFIG.TYPES.SERVICE) {
                        const ox = (t.isOrigin === false && typeof t.originX === 'number') ? t.originX : nx;
                        const oy = (t.isOrigin === false && typeof t.originY === 'number') ? t.originY : ny;
                        const originTile = this.grid.getTile(ox, oy);
                        const key = this.grid.getKey(ox, oy);
                        if (originTile && !refreshed.has(key)) {
                            refreshed.add(key);
                            this.updateTileMesh(ox, oy, originTile);
                        }
                    }
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
        if (this.lighting && typeof this.lighting.markSceneDirty === 'function') {
            this.lighting.markSceneDirty();
        }
    }

    rebuildAllMeshes() {
        this.hasBuiltInitialMeshes = true;
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
        if (this.lighting && typeof this.lighting.markSceneDirty === 'function') {
            this.lighting.markSceneDirty();
        }
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
        const camTarget = this.cameraManager?.controls?.target || null;
        const camDist = (camTarget && this.camera?.position && typeof this.camera.position.distanceTo === 'function')
            ? this.camera.position.distanceTo(camTarget)
            : 42;

        if (this.lighting && typeof this.lighting.update === 'function') {
            this.lighting.update(delta, camTarget, camDist);
        }
        this._syncEnvironmentPhase(isStorm);

        const lightingState = this.lighting && typeof this.lighting.getLightingState === 'function'
            ? this.lighting.getLightingState()
            : null;
        const waterDelta = delta * (isSimRunning ? Math.max(0.5, speedMult * 0.6) : 0.3);
        WaterShaderSystem.update(waterDelta, lightingState, isStorm);
        TerrainShaderSystem.update(lightingState, this.state?.currentMonth || 4);
        WeatheringShaderSystem.update(delta, isStorm, lightingState ? lightingState.emissiveIntensity : 0.0, this.state?.currentMonth || 4);

        const lightningFlash = lightingState ? (lightingState.lightningFlash || 0) : 0;
        if (this.backdrop && typeof this.backdrop.update === 'function') this.backdrop.update(delta, isStorm, lightningFlash);
        if (this.clouds) this.clouds.update(delta, isSimRunning ? speedMult : 1, isStorm, lightningFlash);

        if (this.postProcessing) {
            this.postProcessing.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    destroy() {
        this.isDestroyed = true;
        if (this.animFrameId) { cancelAnimationFrame(this.animFrameId); this.animFrameId = null; }
        if (this.resizeObserver) { this.resizeObserver.disconnect(); this.resizeObserver = null; }
        this.trainTraffic?.dispose();
        if (this.postProcessing) { this.postProcessing.dispose(); this.postProcessing = null; }
        if (this.envIBL) { this.envIBL.dispose(); this.envIBL = null; }
        WaterShaderSystem.disposeAll();
        MaterialLibrary.disposeAll();
        RoadTextureManager.disposeAll();
        CanalMesh.disposeAll();
        ParksSystem._cached = null;
        RailAutoTiler._railMats = null;
        AgricultureManager._paddyMats = null;
        PBRTextureGenerator.disposeAll();
        if (this.backdrop?.group) this.scene.remove(this.backdrop.group);
        if (this.clouds?.group) this.scene.remove(this.clouds.group);
        if (this.renderer?.domElement?.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        if (typeof this.renderer?.dispose === 'function') this.renderer.dispose();
    }
}
