// Project Meiji - Scene Lighting & 4-Phase Day/Night Cycle (scene_lighting.js)
// Phase 1 Architecture: Smooth sun/hemisphere/fog lerp, O(1) MaterialLibrary emissives & Typhoon sky lock (< 200 lines)

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { MaterialLibrary } from './materialLibrary.js';

export class SceneLighting {
    constructor(scene) {
        this.scene = scene;
        if (this.scene) {
            this.scene.userData = this.scene.userData || {};
            this.scene.userData.lighting = this;
        }

        this.hemiLight = new THREE.HemisphereLight(
            CONFIG.ATMOSPHERE.HEMI_SKY,
            CONFIG.ATMOSPHERE.HEMI_GROUND,
            CONFIG.ATMOSPHERE.HEMI_INTENSITY
        );
        this.scene.add(this.hemiLight);

        this.sunLight = new THREE.DirectionalLight(
            CONFIG.ATMOSPHERE.SUN_COLOR,
            CONFIG.ATMOSPHERE.SUN_INTENSITY
        );
        const gridW = (CONFIG.GRID_WIDTH || 35) * (CONFIG.TILE_SIZE || 2.0);
        const gridH = (CONFIG.GRID_HEIGHT || 35) * (CONFIG.TILE_SIZE || 2.0);
        this.shadowFocus = new THREE.Vector3(gridW * 0.5, 0, gridH * 0.5);
        this.currentSunOffset = new THREE.Vector3(28, 52, 24);
        this.sunLight.position.set(
            this.shadowFocus.x + this.currentSunOffset.x,
            this.currentSunOffset.y,
            this.shadowFocus.z + this.currentSunOffset.z
        );
        if (this.sunLight.target && this.sunLight.target.position) {
            this.sunLight.target.position.copy(this.shadowFocus);
            this.scene.add(this.sunLight.target);
        }

        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 1.0;
        this.sunLight.shadow.camera.far = 220;

        this.currentShadowHalfSize = 44;
        this.sunLight.shadow.camera.left = -this.currentShadowHalfSize;
        this.sunLight.shadow.camera.right = this.currentShadowHalfSize;
        this.sunLight.shadow.camera.top = this.currentShadowHalfSize;
        this.sunLight.shadow.camera.bottom = -this.currentShadowHalfSize;
        this.sunLight.shadow.bias = -0.00018;
        this.sunLight.shadow.normalBias = 0.018;
        this.scene.add(this.sunLight);

        // Pooled real PointLights for closest glowing street lanterns at Dusk/Night
        this.lanternLightPool = [];
        this._lanternPoolScanTimer = 0;
        this._lanternNodes = [];
        this._emissiveMeshTargets = [];
        this._sceneDirty = true;
        this._lastSceneChildrenLen = -1;
        if (typeof THREE.PointLight === 'function') {
            for (let i = 0; i < 6; i++) {
                const pl = new THREE.PointLight(0xff9e4a, 0, 9.0, 2.0);
                pl.castShadow = false;
                pl.position.set(this.shadowFocus.x, -20, this.shadowFocus.z);
                this.scene.add(pl);
                this.lanternLightPool.push(pl);
            }
        }
        this._cachedSunDir = new THREE.Vector3(0.45, 0.78, 0.35).normalize();

        this.currentPhaseKey = 'DAY';
        const initialPreset = CONFIG.ATMOSPHERE.PHASES.DAY;

        this.targetSunColor = new THREE.Color(initialPreset.SUN_COLOR);
        this.targetSunIntensity = initialPreset.SUN_INTENSITY;
        this.targetSunPos = new THREE.Vector3(...initialPreset.SUN_POS);

        this.targetHemiSky = new THREE.Color(initialPreset.HEMI_SKY);
        this.targetHemiGround = new THREE.Color(initialPreset.HEMI_GROUND);
        this.targetHemiIntensity = initialPreset.HEMI_INTENSITY;

        this.targetBgColor = new THREE.Color(initialPreset.BACKGROUND);
        this.targetFogColor = new THREE.Color(initialPreset.FOG);
        this.targetFogDensity = initialPreset.FOG_DENSITY;

        this.stormBgColor = new THREE.Color(0x2c3e50);
        this.isStormOverride = false;

        this.targetEmissiveIntensity = 0.0;
        this.currentEmissiveIntensity = 0.0;
    }

    static initLights(scene) {
        return new SceneLighting(scene);
    }

    setPowerSystem(powerSystem) {
        this._powerSystem = powerSystem;
    }

    setStormOverride(isActive) {
        this.isStormOverride = Boolean(isActive);
    }

    markSceneDirty() {
        this._sceneDirty = true;
    }

    setShadowQuality(enabled, mapSize = 1024) {
        if (!this.sunLight) return;
        this.sunLight.castShadow = Boolean(enabled);
        if (this.sunLight.shadow && this.sunLight.shadow.mapSize) {
            const size = Math.max(256, Number(mapSize) || 1024);
            if (this.sunLight.shadow.mapSize.width !== size || this.sunLight.shadow.mapSize.height !== size) {
                this.sunLight.shadow.mapSize.width = size;
                this.sunLight.shadow.mapSize.height = size;
                if (this.sunLight.shadow.map && typeof this.sunLight.shadow.map.dispose === 'function') {
                    this.sunLight.shadow.map.dispose();
                    this.sunLight.shadow.map = null;
                }
            }
        }
    }

    _refreshSceneNodeCache() {
        if (!this.scene || typeof this.scene.traverse !== 'function') return;
        const childLen = Array.isArray(this.scene.children) ? this.scene.children.length : -1;
        if (!this._sceneDirty && childLen === this._lastSceneChildrenLen) return;
        this._sceneDirty = false;
        this._lastSceneChildrenLen = childLen;
        this._lanternNodes = [];
        this._emissiveMeshTargets = [];
        this.scene.traverse((child) => {
            if (child.userData && child.userData.isLantern) {
                this._lanternNodes.push(child);
            }
            if (child.isMesh && child.material && !child.material.userData?.isSharedLibraryMaterial) {
                const matName = child.material.name || '';
                const nodeName = child.name || '';
                if (matName === 'M_RedLantern' || nodeName.includes('Lantern_Body')) {
                    this._emissiveMeshTargets.push({ material: child.material, scale: 1.0 });
                } else if (nodeName === 'Upper_Window' || nodeName === 'Front_Koushi') {
                    this._emissiveMeshTargets.push({ material: child.material, scale: 0.75 });
                }
            }
        });
    }

    updateMonth(month) {
        const phaseIndex = (month - 1) % 4;
        let phaseKey = 'DAY';
        if (phaseIndex === 0) phaseKey = 'DAWN';
        else if (phaseIndex === 1) phaseKey = 'DAY';
        else if (phaseIndex === 2) phaseKey = 'TWILIGHT';
        else if (phaseIndex === 3) phaseKey = 'NIGHT';

        this.setPhase(phaseKey);
    }

    setPhase(phaseKey) {
        const phases = CONFIG.ATMOSPHERE.PHASES;
        if (!phases || !phases[phaseKey]) return;
        this.currentPhaseKey = phaseKey;
        const p = phases[phaseKey];

        this.targetSunColor.setHex(p.SUN_COLOR);
        this.targetSunIntensity = p.SUN_INTENSITY;
        this.targetSunPos.set(...p.SUN_POS);

        this.targetHemiSky.setHex(p.HEMI_SKY);
        this.targetHemiGround.setHex(p.HEMI_GROUND);
        this.targetHemiIntensity = p.HEMI_INTENSITY;

        this.targetBgColor.setHex(p.BACKGROUND);
        this.targetFogColor.setHex(p.FOG);
        this.targetFogDensity = p.FOG_DENSITY;

        this.targetEmissiveIntensity = p.EMISSIVE_INTENSITY;
    }

    /**
     * Centers the directional shadow frustum cleanly on the active camera look target
     * (texel-snapped to eliminate shadow edge shimmer) and scales frustum tight around zoom.
     */
    updateShadowFocus(cameraTarget, cameraDistance = 42) {
        if (!cameraTarget || !this.sunLight?.shadow?.camera) return;

        const targetHalfSize = Math.max(18, Math.min(46, (cameraDistance || 42) * 0.92));
        if (Math.abs(targetHalfSize - this.currentShadowHalfSize) > 0.35) {
            this.currentShadowHalfSize = targetHalfSize;
            const cam = this.sunLight.shadow.camera;
            cam.left = -targetHalfSize;
            cam.right = targetHalfSize;
            cam.top = targetHalfSize;
            cam.bottom = -targetHalfSize;
            if (typeof cam.updateProjectionMatrix === 'function') {
                cam.updateProjectionMatrix();
            }
        }

        // Snap focus position onto shadow-map texel grid to prevent shimmering silhouettes when panning
        const mapW = this.sunLight.shadow.mapSize?.width || 2048;
        const texelStep = (this.currentShadowHalfSize * 2) / mapW;
        const snappedX = Math.round(cameraTarget.x / texelStep) * texelStep;
        const snappedZ = Math.round(cameraTarget.z / texelStep) * texelStep;
        this.shadowFocus.set(snappedX, 0, snappedZ);

        if (this.sunLight.target?.position) {
            this.sunLight.target.position.copy(this.shadowFocus);
        }
        this.sunLight.position.set(
            this.shadowFocus.x + this.currentSunOffset.x,
            this.currentSunOffset.y,
            this.shadowFocus.z + this.currentSunOffset.z
        );
    }

    /**
     * Refreshes the 6 pooled real PointLights onto the closest active street lanterns
     * during Twilight/Night so warm amber or arc-blue pools illuminate cobblestones and facades.
     */
    updateLanternLightPool(cameraTarget, delta = 0.016) {
        if (!this.lanternLightPool || this.lanternLightPool.length === 0) return;

        const eIntensity = this.currentEmissiveIntensity;
        if (eIntensity <= 0.05) {
            for (const pl of this.lanternLightPool) {
                pl.intensity = 0;
            }
            return;
        }

        this._lanternPoolScanTimer -= delta;
        if (this._lanternPoolScanTimer <= 0 || this._sceneDirty) {
            this._lanternPoolScanTimer = 0.35;
            this._refreshSceneNodeCache();
        } else {
            return;
        }

        const refX = cameraTarget ? cameraTarget.x : this.shadowFocus.x;
        const refZ = cameraTarget ? cameraTarget.z : this.shadowFocus.z;
        const pSys = this._powerSystem || (this.state && this.state.powerSystem);

        // Sort nearest lanterns to camera look point
        const ranked = [];
        for (const node of this._lanternNodes) {
            if (!node.parent) continue;
            const wx = (node.matrixWorld?.elements?.[12]) ?? (node.position?.x || 0);
            const wy = (node.matrixWorld?.elements?.[13]) ?? (node.position?.y || 1.1);
            const wz = (node.matrixWorld?.elements?.[14]) ?? (node.position?.z || 0);
            const d2 = (wx - refX) * (wx - refX) + (wz - refZ) * (wz - refZ);
            if (d2 <= 625) {
                ranked.push({ node, wx, wy: wy + 0.85, wz, d2 });
            }
        }
        ranked.sort((a, b) => a.d2 - b.d2);

        for (let i = 0; i < this.lanternLightPool.length; i++) {
            const pl = this.lanternLightPool[i];
            if (i < ranked.length) {
                const entry = ranked[i];
                const isPowered = (pSys && typeof pSys.hasPower === 'function')
                    ? pSys.hasPower(entry.node.userData.tileX, entry.node.userData.tileY)
                    : false;
                pl.position.set(entry.wx, entry.wy, entry.wz);
                if (pl.color?.setHex) pl.color.setHex(isPowered ? 0xd2eaff : 0xff9a3c);
                pl.intensity = (isPowered ? 2.6 : 1.9) * Math.min(1.2, eIntensity);
            } else {
                pl.intensity = 0;
            }
        }
    }

    /**
     * Returns unified instantaneous lighting state for water, terrain, mountain haze, and IBL.
     */
    getLightingState() {
        const sunOffset = this.currentSunOffset;
        this._cachedSunDir.set(sunOffset.x, Math.max(4, sunOffset.y), sunOffset.z).normalize();
        const nightMix = (this.currentPhaseKey === 'NIGHT') ? 1.0 : (this.currentPhaseKey === 'TWILIGHT' ? 0.55 : (this.currentPhaseKey === 'DAWN' ? 0.25 : 0.0));
        return {
            phaseKey: this.currentPhaseKey,
            isStorm: this.isStormOverride,
            sunDir: this._cachedSunDir,
            sunColor: this.sunLight.color,
            skyZenith: this.scene.background || this.hemiLight.color,
            skyHorizon: this.hemiLight.color,
            fogColor: this.scene.fog ? this.scene.fog.color : this.targetFogColor,
            fogDensity: this.scene.fog ? this.scene.fog.density : this.targetFogDensity,
            nightMix,
            emissiveIntensity: this.currentEmissiveIntensity
        };
    }

    update(delta = 0.016, cameraTarget = null, cameraDistance = 42) {
        const lerpSpeed = Math.min(1.0, delta * 2.2);

        const lerpCol = (cObj, tObj) => {
            if (cObj && typeof cObj.lerp === 'function') cObj.lerp(tObj, lerpSpeed);
            else if (cObj && typeof cObj.setHex === 'function' && tObj && typeof tObj.getHex === 'function') cObj.setHex(tObj.getHex());
        };

        lerpCol(this.sunLight.color, this.targetSunColor);
        this.sunLight.intensity += (this.targetSunIntensity - this.sunLight.intensity) * lerpSpeed;
        if (typeof this.currentSunOffset.lerp === 'function') {
            this.currentSunOffset.lerp(this.targetSunPos, lerpSpeed);
        } else {
            this.currentSunOffset.set(this.targetSunPos.x, this.targetSunPos.y, this.targetSunPos.z);
        }

        if (cameraTarget) {
            this.updateShadowFocus(cameraTarget, cameraDistance);
        } else {
            this.sunLight.position.set(
                this.shadowFocus.x + this.currentSunOffset.x,
                this.currentSunOffset.y,
                this.shadowFocus.z + this.currentSunOffset.z
            );
        }

        lerpCol(this.hemiLight.color, this.targetHemiSky);
        lerpCol(this.hemiLight.groundColor, this.targetHemiGround);
        this.hemiLight.intensity += (this.targetHemiIntensity - this.hemiLight.intensity) * lerpSpeed;

        const activeBgTarget = this.isStormOverride ? this.stormBgColor : this.targetBgColor;
        lerpCol(this.scene.background, activeBgTarget);
        if (this.scene.fog) {
            lerpCol(this.scene.fog.color, this.isStormOverride ? this.stormBgColor : this.targetFogColor);
            this.scene.fog.density += (this.targetFogDensity - this.scene.fog.density) * lerpSpeed;
        }

        const prevEmissive = this.currentEmissiveIntensity;
        this.currentEmissiveIntensity += (this.targetEmissiveIntensity - this.currentEmissiveIntensity) * Math.min(1.0, delta * 3.5);

        if (Math.abs(prevEmissive - this.currentEmissiveIntensity) > 0.005) {
            this.applyEmissivesToScene(this.currentEmissiveIntensity);
        }
        this.updateLanternLightPool(cameraTarget, delta);
    }

    /**
     * Updates shared MaterialLibrary emissives in O(1) time and updates powered street lanterns.
     */
    applyEmissivesToScene(intensity) {
        MaterialLibrary.updateEmissives(intensity);

        const isGlowing = intensity > 0.05;
        const emissiveHex = isGlowing ? 0xffa040 : 0x000000;
        const pSys = this._powerSystem || (this.state && this.state.powerSystem);

        this._refreshSceneNodeCache();

        for (const target of this._emissiveMeshTargets) {
            if (target.material && target.material.emissive) {
                target.material.emissive.setHex(emissiveHex);
                target.material.emissiveIntensity = intensity * target.scale;
            }
        }

        for (const child of this._lanternNodes) {
            if (!child.parent) continue;
            const isPowered = (pSys && typeof pSys.hasPower === 'function')
                ? pSys.hasPower(child.userData.tileX, child.userData.tileY)
                : false;

            const arcEmissive = isGlowing ? (isPowered ? 0xd8eeff : 0xffa040) : 0x000000;
            const arcLightColor = isPowered ? 0xd8eeff : 0xff9e4a;
            const arcLightIntensity = isPowered ? intensity * 2.8 : intensity * 1.8;

            if (child.userData.material && child.userData.material.emissive) {
                child.userData.material.emissive.setHex(arcEmissive);
                child.userData.material.emissiveIntensity = isPowered ? intensity * 1.5 : intensity;
            }
            if (child.userData.light) {
                if (child.userData.light.color?.setHex) child.userData.light.color.setHex(arcLightColor);
                child.userData.light.intensity = isGlowing ? arcLightIntensity : 0.0;
            }
        }
    }
}
