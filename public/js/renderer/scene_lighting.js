// Project Meiji - Scene Lighting & 4-Phase Day/Night Cycle
// ponytail: smooth directional sun pitch/color lerp, atmospheric indigo night fog & warm emissive glow

import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class SceneLighting {
    constructor(scene) {
        this.scene = scene;

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
        this.sunLight.position.set(28, 52, 24);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 220;

        const d = 52;
        this.sunLight.shadow.camera.left = -d;
        this.sunLight.shadow.camera.right = d;
        this.sunLight.shadow.camera.top = d;
        this.sunLight.shadow.camera.bottom = -d;
        this.sunLight.shadow.bias = -0.0003;
        this.scene.add(this.sunLight);

        // Target state for smooth frame-by-frame lerping
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

        this.targetEmissiveIntensity = 0.0;
        this.currentEmissiveIntensity = 0.0;

        this.emissiveColor = new THREE.Color(0xffa040);
        this.offColor = new THREE.Color(0x000000);
    }

    // Static factory for backward compatibility
    static initLights(scene) {
        const lighting = new SceneLighting(scene);
        return lighting;
    }

    setPowerSystem(powerSystem) {
        this._powerSystem = powerSystem;
    }

    /**
     * Map simulation calendar month (1..12) into 4 distinct historical day/night phases.
     * M1, M5, M9: Dawn / Morning
     * M2, M6, M10: Daytime (Bright warm white)
     * M3, M7, M11: Twilight / Golden Hour (Warm amber)
     * M4, M8, M12: Night (Deep indigo moonlit)
     */
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
     * Smooth per-frame interpolation of lighting, fog, and lantern/shoji emissives.
     */
    update(delta = 0.016) {
        const lerpSpeed = Math.min(1.0, delta * 2.2);

        // 1. Directional Sun/Moon Lerp
        this.sunLight.color.lerp(this.targetSunColor, lerpSpeed);
        this.sunLight.intensity += (this.targetSunIntensity - this.sunLight.intensity) * lerpSpeed;
        this.sunLight.position.lerp(this.targetSunPos, lerpSpeed);

        // 2. Ambient Hemisphere Lerp
        this.hemiLight.color.lerp(this.targetHemiSky, lerpSpeed);
        this.hemiLight.groundColor.lerp(this.targetHemiGround, lerpSpeed);
        this.hemiLight.intensity += (this.targetHemiIntensity - this.hemiLight.intensity) * lerpSpeed;

        // 3. Scene Background & Fog Lerp
        if (this.scene.background) {
            this.scene.background.lerp(this.targetBgColor, lerpSpeed);
        }
        if (this.scene.fog) {
            this.scene.fog.color.lerp(this.targetFogColor, lerpSpeed);
            this.scene.fog.density += (this.targetFogDensity - this.scene.fog.density) * lerpSpeed;
        }

        // 4. Lantern & Window Emissive Intensity Lerp
        const prevEmissive = this.currentEmissiveIntensity;
        this.currentEmissiveIntensity += (this.targetEmissiveIntensity - this.currentEmissiveIntensity) * Math.min(1.0, delta * 3.5);

        // Update emissives on tiles when value changes noticeably
        if (Math.abs(prevEmissive - this.currentEmissiveIntensity) > 0.005) {
            this.applyEmissivesToScene(this.currentEmissiveIntensity);
        }
    }

    /**
     * Toggles emissive properties on teahouse red lanterns, shoji windows, and street lamps.
     */
    applyEmissivesToScene(intensity) {
        const isGlowing = intensity > 0.05;
        const emissiveHex = isGlowing ? 0xffa040 : 0x000000;

        this.scene.traverse((child) => {
            // A. Traditional Teahouse Red Lanterns
            if (child.isMesh && child.material) {
                const matName = child.material.name || '';
                const nodeName = child.name || '';

                if (matName === 'M_RedLantern' || nodeName.includes('Lantern_Body')) {
                    if (!child.material.emissive) return;
                    child.material.emissive.setHex(emissiveHex);
                    child.material.emissiveIntensity = intensity;
                }

                // B. Residential Shoji Windows & Machiya Facade Glow
                if (nodeName === 'Upper_Window' || nodeName === 'Front_Koushi') {
                    if (child.material && child.material.emissive) {
                        child.material.emissive.setHex(emissiveHex);
                        child.material.emissiveIntensity = intensity * 0.75;
                    }
                }
            }

            // C. Stone Road Intersection Street Lanterns (userData.isLantern)
            if (child.userData && child.userData.isLantern) {
                const pSys = this._powerSystem || (this.state && this.state.powerSystem);
                const isPowered = (pSys && typeof pSys.hasPower === 'function')
                    ? pSys.hasPower(child.userData.tileX, child.userData.tileY)
                    : false;

                // Electric Arc Lamp: Cool-white high intensity (0xd8eeff) vs Amber gas lantern (0xffa040)
                const arcEmissive = isGlowing ? (isPowered ? 0xd8eeff : 0xffa040) : 0x000000;
                const arcLightColor = isPowered ? 0xd8eeff : 0xff9e4a;
                const arcLightIntensity = isPowered ? intensity * 2.8 : intensity * 1.8;

                if (child.userData.material) {
                    child.userData.material.emissive.setHex(arcEmissive);
                    child.userData.material.emissiveIntensity = isPowered ? intensity * 1.5 : intensity;
                }
                if (child.userData.light) {
                    child.userData.light.color.setHex(arcLightColor);
                    child.userData.light.intensity = isGlowing ? arcLightIntensity : 0.0;
                }
            }
        });
    }
}
