// Project Meiji - Hiroshige Bokashi Woodblock Sky Dome & Celestial Bodies (skyDome.js)
// Phase 3 /artisan: Multi-stop ukiyo-e sky gradient shader, starlight zenith & orbiting Sun/Moon discs (< 240 lines)

import * as THREE from 'three';
import { CONFIG } from '../config.js';

const SKY_PALETTES = {
    DAWN: {
        zenith: 0x2c4268,     // Deep indigo morning zenith (Ai-iro)
        midSky: 0x8fa8be,     // Soft celadon-slate mid-sky
        horizon: 0xf2bba0,    // Warm peach-apricot dawn horizon wash
        haloColor: 0xff9466,  // Crimson-gold solar rim glow
        haloStrength: 0.65,
        starIntensity: 0.12,
        sunColor: 0xff6238,   // Vermilion woodblock rising sun
        sunHalo: 0xffa878,
        sunOpacity: 0.94,
        moonOpacity: 0.15,
        sunPos: [155, 28, -28],
        moonPos: [-135, 18, 85]
    },
    DAY: {
        zenith: 0x3a6491,     // Classic Hiroshige Prussian blue zenith (Bero-ai)
        midSky: 0x8db6d4,     // Clear sky azure
        horizon: 0xe6ece4,    // Warm washi paper horizon mist
        haloColor: 0xfff8e0,  // Warm ivory day solar glow
        haloStrength: 0.35,
        starIntensity: 0.0,
        sunColor: 0xfff6d8,
        sunHalo: 0xffeab3,
        sunOpacity: 0.88,
        moonOpacity: 0.0,
        sunPos: [95, 92, 18],
        moonPos: [-140, -30, 80]
    },
    TWILIGHT: {
        zenith: 0x222c4a,     // Deep dusk violet-indigo zenith
        midSky: 0x7d5866,     // Warm plum-russet twilight band
        horizon: 0xe88554,    // Glowing persimmon-vermilion sunset horizon
        haloColor: 0xff5e2b,  // Intense sunset Akafuji glow
        haloStrength: 0.78,
        starIntensity: 0.28,
        sunColor: 0xff451c,   // Deep vermilion setting sun disc
        sunHalo: 0xff8547,
        sunOpacity: 0.96,
        moonOpacity: 0.55,
        sunPos: [158, 19, 58],
        moonPos: [-125, 36, -45]
    },
    NIGHT: {
        zenith: 0x091021,     // Midnight sumi-indigo zenith
        midSky: 0x162442,     // Deep Prussian night blue
        horizon: 0x263859,    // Lantern-hazed distant horizon
        haloColor: 0x8aa8d6,  // Cool silver lunar atmospheric glow
        haloStrength: 0.42,
        starIntensity: 0.95,
        sunColor: 0xff451c,
        sunHalo: 0xff8547,
        sunOpacity: 0.0,
        moonOpacity: 0.96,
        sunPos: [150, -45, 35],
        moonPos: [-110, 62, -48]
    },
    STORM: {
        zenith: 0x1a2228,
        midSky: 0x2c3942,
        horizon: 0x435058,
        haloColor: 0x52616b,
        haloStrength: 0.12,
        starIntensity: 0.0,
        sunColor: 0xc8d2d8,
        sunHalo: 0x7d8b94,
        sunOpacity: 0.08,
        moonOpacity: 0.0,
        sunPos: [95, 75, 25],
        moonPos: [-110, 45, -48]
    }
};

function lerpColor(colorObj, targetObj, alpha) {
    if (!colorObj || !targetObj) return;
    if (typeof colorObj.lerp === 'function') {
        colorObj.lerp(targetObj, alpha);
    } else if (typeof colorObj.setHex === 'function' && typeof targetObj.getHex === 'function') {
        colorObj.setHex(targetObj.getHex());
    }
}

function lerpVec3(vec, target, alpha) {
    if (!vec || !target) return;
    if (typeof vec.lerp === 'function') {
        vec.lerp(target, alpha);
    } else if (typeof vec.lerpVectors === 'function') {
        vec.lerpVectors(vec, target, alpha);
    }
}

export class SkyDome {
    constructor(parentGroup) {
        this.parentGroup = parentGroup;
        this.cx = (CONFIG.GRID_WIDTH * CONFIG.TILE_SIZE) / 2;
        this.cz = (CONFIG.GRID_HEIGHT * CONFIG.TILE_SIZE) / 2;
        this.currentPhase = 'DAY';
        this.time = 0;

        const initP = SKY_PALETTES.DAY;
        this.uniforms = {
            uZenithColor: { value: new THREE.Color(initP.zenith) },
            uMidSkyColor: { value: new THREE.Color(initP.midSky) },
            uHorizonColor: { value: new THREE.Color(initP.horizon) },
            uHaloColor: { value: new THREE.Color(initP.haloColor) },
            uCelestialDir: { value: new THREE.Vector3(0.7, 0.5, 0.2).normalize() },
            uHaloStrength: { value: initP.haloStrength },
            uStarIntensity: { value: initP.starIntensity },
            uTime: { value: 0.0 }
        };

        this.targetZenith = new THREE.Color(initP.zenith);
        this.targetMidSky = new THREE.Color(initP.midSky);
        this.targetHorizon = new THREE.Color(initP.horizon);
        this.targetHaloColor = new THREE.Color(initP.haloColor);
        this.targetHaloStrength = initP.haloStrength;
        this.targetStarIntensity = initP.starIntensity;

        this.targetSunPos = new THREE.Vector3(this.cx + initP.sunPos[0], initP.sunPos[1], this.cz + initP.sunPos[2]);
        this.targetMoonPos = new THREE.Vector3(this.cx + initP.moonPos[0], initP.moonPos[1], this.cz + initP.moonPos[2]);
        this.targetSunColor = new THREE.Color(initP.sunColor);
        this.targetSunHalo = new THREE.Color(initP.sunHalo);
        this.targetSunOpacity = initP.sunOpacity;
        this.targetMoonOpacity = initP.moonOpacity;

        this.buildSkyHemisphere();
        this.buildCelestialBodies();
    }

    buildSkyHemisphere() {
        const domeGeo = new THREE.SphereGeometry(235, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.54);
        if (typeof THREE.ShaderMaterial === 'function') {
            this.skyMaterial = new THREE.ShaderMaterial({
                uniforms: this.uniforms,
                side: THREE.BackSide,
                depthWrite: false,
                fog: false,
                vertexShader: `
                    varying vec3 vWorldOffset;
                    void main() {
                        vec4 worldPos = modelMatrix * vec4(position, 1.0);
                        vWorldOffset = position;
                        gl_Position = projectionMatrix * viewMatrix * worldPos;
                    }
                `,
                fragmentShader: `
                    uniform vec3 uZenithColor;
                    uniform vec3 uMidSkyColor;
                    uniform vec3 uHorizonColor;
                    uniform vec3 uHaloColor;
                    uniform vec3 uCelestialDir;
                    uniform float uHaloStrength;
                    uniform float uStarIntensity;
                    uniform float uTime;
                    varying vec3 vWorldOffset;

                    float hash(vec2 p) {
                        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
                    }

                    void main() {
                        vec3 dir = normalize(vWorldOffset);
                        float elev = clamp(dir.y, 0.0, 1.0);

                        float horizonBlend = smoothstep(0.0, 0.30, elev);
                        float zenithBlend = smoothstep(0.24, 0.88, elev);
                        vec3 skyCol = mix(uHorizonColor, uMidSkyColor, horizonBlend);
                        skyCol = mix(skyCol, uZenithColor, zenithBlend);

                        float grain = sin(elev * 140.0) * 0.008;
                        skyCol += vec3(grain);

                        float sunDot = max(0.0, dot(dir, normalize(uCelestialDir)));
                        float halo = pow(sunDot, 5.0) * 0.45 + pow(sunDot, 24.0) * 0.55;
                        skyCol = mix(skyCol, uHaloColor, clamp(halo * uHaloStrength, 0.0, 0.75));

                        if (uStarIntensity > 0.01 && elev > 0.14) {
                            vec2 starGrid = floor(dir.xz / (dir.y + 0.35) * 95.0);
                            float h = hash(starGrid);
                            if (h > 0.9915) {
                                float twinkle = 0.65 + 0.35 * sin(uTime * 2.4 + h * 62.8);
                                float starMask = smoothstep(0.14, 0.42, elev) * uStarIntensity * twinkle;
                                skyCol += vec3(0.95, 0.97, 1.0) * starMask;
                            }
                        }

                        gl_FragColor = vec4(skyCol, 1.0);
                    }
                `
            });
        } else {
            this.skyMaterial = new THREE.MeshBasicMaterial({ color: SKY_PALETTES.DAY.zenith, depthWrite: false });
        }

        this.domeMesh = new THREE.Mesh(domeGeo, this.skyMaterial);
        this.domeMesh.position.set(this.cx, -8, this.cz);
        this.domeMesh.renderOrder = -10;
        this.domeMesh.userData = { isBackdrop: true, ignoreRaycast: true };
        this.parentGroup.add(this.domeMesh);
    }

    buildCelestialBodies() {
        const sunGeo = new THREE.RingGeometry(0.01, 13.5, 16);
        this.sunMat = new THREE.MeshBasicMaterial({ color: 0xfff6d8, transparent: true, opacity: 0.88, side: THREE.DoubleSide, fog: false, depthWrite: false });
        this.sunMesh = new THREE.Mesh(sunGeo, this.sunMat);
        this.sunMesh.position.set(this.cx + 95, 92, this.cz + 18);
        if (typeof this.sunMesh.lookAt === 'function') this.sunMesh.lookAt(this.cx, 0, this.cz);
        this.sunMesh.userData = { isBackdrop: true, ignoreRaycast: true };
        this.parentGroup.add(this.sunMesh);

        const coronaGeo = new THREE.RingGeometry(13.2, 25.0, 16);
        this.sunCoronaMat = new THREE.MeshBasicMaterial({ color: 0xffeab3, transparent: true, opacity: 0.32, side: THREE.DoubleSide, fog: false, depthWrite: false });
        this.sunCoronaMesh = new THREE.Mesh(coronaGeo, this.sunCoronaMat);
        this.sunCoronaMesh.position.copy(this.sunMesh.position);
        if (typeof this.sunCoronaMesh.lookAt === 'function') this.sunCoronaMesh.lookAt(this.cx, 0, this.cz);
        this.sunCoronaMesh.userData = { isBackdrop: true, ignoreRaycast: true };
        this.parentGroup.add(this.sunCoronaMesh);

        const moonGeo = new THREE.RingGeometry(0.01, 9.5, 16);
        this.moonMat = new THREE.MeshBasicMaterial({ color: 0xf4f7fc, transparent: true, opacity: 0.0, side: THREE.DoubleSide, fog: false, depthWrite: false });
        this.moonMesh = new THREE.Mesh(moonGeo, this.moonMat);
        this.moonMesh.position.set(this.cx - 110, 62, this.cz - 48);
        if (typeof this.moonMesh.lookAt === 'function') this.moonMesh.lookAt(this.cx, 0, this.cz);
        this.moonMesh.userData = { isBackdrop: true, ignoreRaycast: true };
        this.parentGroup.add(this.moonMesh);

        const moonHaloGeo = new THREE.RingGeometry(9.3, 18.5, 16);
        this.moonHaloMat = new THREE.MeshBasicMaterial({ color: 0x9ab8e6, transparent: true, opacity: 0.0, side: THREE.DoubleSide, fog: false, depthWrite: false });
        this.moonHaloMesh = new THREE.Mesh(moonHaloGeo, this.moonHaloMat);
        this.moonHaloMesh.position.copy(this.moonMesh.position);
        if (typeof this.moonHaloMesh.lookAt === 'function') this.moonHaloMesh.lookAt(this.cx, 0, this.cz);
        this.moonHaloMesh.userData = { isBackdrop: true, ignoreRaycast: true };
        this.parentGroup.add(this.moonHaloMesh);
    }

    setPhase(phaseKey, isStorm = false) {
        this.currentPhase = phaseKey || 'DAY';
        const p = isStorm ? SKY_PALETTES.STORM : (SKY_PALETTES[this.currentPhase] || SKY_PALETTES.DAY);

        this.targetZenith.setHex(p.zenith);
        this.targetMidSky.setHex(p.midSky);
        this.targetHorizon.setHex(p.horizon);
        this.targetHaloColor.setHex(p.haloColor);
        this.targetHaloStrength = p.haloStrength;
        this.targetStarIntensity = p.starIntensity;

        this.targetSunPos.set(this.cx + p.sunPos[0], p.sunPos[1], this.cz + p.sunPos[2]);
        this.targetMoonPos.set(this.cx + p.moonPos[0], p.moonPos[1], this.cz + p.moonPos[2]);
        this.targetSunColor.setHex(p.sunColor);
        this.targetSunHalo.setHex(p.sunHalo);
        this.targetSunOpacity = p.sunOpacity;
        this.targetMoonOpacity = p.moonOpacity;
    }

    update(delta = 0.016, isStorm = false) {
        this.time += delta;
        this.uniforms.uTime.value = this.time;
        this.setPhase(this.currentPhase, isStorm);
        const lerpSpeed = Math.min(1.0, delta * 2.2);

        lerpColor(this.uniforms.uZenithColor.value, this.targetZenith, lerpSpeed);
        lerpColor(this.uniforms.uMidSkyColor.value, this.targetMidSky, lerpSpeed);
        lerpColor(this.uniforms.uHorizonColor.value, this.targetHorizon, lerpSpeed);
        lerpColor(this.uniforms.uHaloColor.value, this.targetHaloColor, lerpSpeed);
        this.uniforms.uHaloStrength.value += (this.targetHaloStrength - this.uniforms.uHaloStrength.value) * lerpSpeed;
        this.uniforms.uStarIntensity.value += (this.targetStarIntensity - this.uniforms.uStarIntensity.value) * lerpSpeed;

        lerpVec3(this.sunMesh.position, this.targetSunPos, lerpSpeed);
        this.sunCoronaMesh.position.copy(this.sunMesh.position);
        lerpVec3(this.moonMesh.position, this.targetMoonPos, lerpSpeed);
        this.moonHaloMesh.position.copy(this.moonMesh.position);

        if (typeof this.sunMesh.lookAt === 'function') {
            this.sunMesh.lookAt(this.cx, 0, this.cz);
            this.sunCoronaMesh.lookAt(this.cx, 0, this.cz);
            this.moonMesh.lookAt(this.cx, 0, this.cz);
            this.moonHaloMesh.lookAt(this.cx, 0, this.cz);
        }

        lerpColor(this.sunMat.color, this.targetSunColor, lerpSpeed);
        lerpColor(this.sunCoronaMat.color, this.targetSunHalo, lerpSpeed);
        this.sunMat.opacity += (this.targetSunOpacity - this.sunMat.opacity) * lerpSpeed;
        this.sunCoronaMat.opacity = this.sunMat.opacity * 0.36;
        this.sunMesh.visible = this.sunMat.opacity > 0.02;
        this.sunCoronaMesh.visible = this.sunMesh.visible;

        this.moonMat.opacity += (this.targetMoonOpacity - this.moonMat.opacity) * lerpSpeed;
        this.moonHaloMat.opacity = this.moonMat.opacity * 0.32;
        this.moonMesh.visible = this.moonMat.opacity > 0.02;
        this.moonHaloMesh.visible = this.moonMesh.visible;

        const activeCelestial = this.moonMat.opacity > this.sunMat.opacity ? this.moonMesh.position : this.sunMesh.position;
        this.uniforms.uCelestialDir.value
            .set(activeCelestial.x - this.cx, Math.max(8, activeCelestial.y), activeCelestial.z - this.cz)
            .normalize();
    }
}
