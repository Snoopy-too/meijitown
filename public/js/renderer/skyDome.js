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
        zenith: 0x0d1319,
        midSky: 0x16202a,
        horizon: 0x1f2b36,
        haloColor: 0x45586b,
        haloStrength: 0.08,
        starIntensity: 0.0,
        sunColor: 0x8ea1b3,
        sunHalo: 0x566878,
        sunOpacity: 0.0,
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
            uStormMix: { value: 0.0 },
            uLightningFlash: { value: 0.0 },
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
        const domeGeo = new THREE.SphereGeometry(235, 36, 18, 0, Math.PI * 2, 0, Math.PI * 0.56);
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
                    uniform float uStormMix;
                    uniform float uLightningFlash;
                    uniform float uTime;
                    varying vec3 vWorldOffset;

                    float hash21(vec2 p) {
                        p = fract(p * vec2(127.1, 311.7));
                        p += dot(p, p + 41.23);
                        return fract(p.x * p.y);
                    }

                    float noise2D(vec2 p) {
                        vec2 i = floor(p);
                        vec2 f = fract(p);
                        f = f * f * (3.0 - 2.0 * f);
                        return mix(
                            mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
                            mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
                            f.y
                        );
                    }

                    float fbmCirrus(vec2 p) {
                        float v = 0.0;
                        float a = 0.52;
                        mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
                        for (int i = 0; i < 4; i++) {
                            v += a * noise2D(p);
                            p = rot * p * 2.15;
                            a *= 0.48;
                        }
                        return v;
                    }

                    void main() {
                        vec3 dir = normalize(vWorldOffset);
                        float elev = clamp(dir.y, 0.0, 1.0);

                        // Natural Rayleigh sky dome vertical curve + warm horizon dust belt
                        float horizonBlend = smoothstep(0.0, 0.28, elev);
                        float zenithBlend = smoothstep(0.20, 0.88, elev);
                        vec3 skyCol = mix(uHorizonColor, uMidSkyColor, horizonBlend);
                        skyCol = mix(skyCol, uZenithColor, zenithBlend);

                        // Delicate high-altitude wind-sheared cirrus cloud wisps & turbulent typhoon thunderheads
                        if (elev > 0.03) {
                            vec2 cUv = dir.xz / (elev + 0.22);
                            float drift = uTime * mix(0.008, 0.055, uStormMix);
                            float wisp = fbmCirrus(vec2(cUv.x * 1.4 + drift, cUv.y * 3.8 + drift * 0.25));
                            float wispyMask = smoothstep(0.56, 0.82, wisp) * smoothstep(0.06, 0.35, elev) * (1.0 - smoothstep(0.75, 0.98, elev));
                            vec3 cirrusCol = mix(uHorizonColor, vec3(1.0, 0.97, 0.93), 0.45);
                            skyCol = mix(skyCol, cirrusCol, wispyMask * 0.22 * (1.0 - uStarIntensity * 0.65) * (1.0 - uStormMix));

                            if (uStormMix > 0.01) {
                                float stormBillow = fbmCirrus(vec2(cUv.x * 2.2 + drift * 1.5, cUv.y * 2.4 - drift * 0.4));
                                float cloudCover = smoothstep(0.32, 0.76, stormBillow * 0.72 + wisp * 0.38);
                                float elevBand = smoothstep(0.03, 0.28, elev);
                                vec3 stormDark = uZenithColor * 0.68;
                                vec3 stormRidge = mix(uHorizonColor * 1.15, vec3(0.32, 0.39, 0.46), 0.45);
                                vec3 stormCloudCol = mix(stormDark, stormRidge, smoothstep(0.45, 0.85, stormBillow));
                                float sheetLight = uLightningFlash * (0.35 + 0.65 * smoothstep(0.42, 0.82, stormBillow));
                                stormCloudCol += vec3(0.68, 0.82, 1.0) * sheetLight;
                                skyCol = mix(skyCol, stormCloudCol, cloudCover * elevBand * uStormMix * 0.82);
                                skyCol += vec3(0.36, 0.48, 0.64) * uLightningFlash * (1.0 - smoothstep(0.0, 0.55, elev)) * uStormMix * 0.55;
                            }
                        }

                        // Mie forward solar/lunar scattering halo + golden/peach horizon scatter
                        float sunDot = max(0.0, dot(dir, normalize(uCelestialDir)));
                        float wideMie = pow(sunDot, 3.5) * 0.35 + pow(sunDot, 14.0) * 0.45;
                        float coreMie = pow(sunDot, 56.0) * 0.65;
                        skyCol = mix(skyCol, uHaloColor, clamp((wideMie + coreMie) * uHaloStrength, 0.0, 0.84));

                        // Crisp circular sub-pixel twinkling stars with multi-temperature tints
                        if (uStarIntensity > 0.01 && elev > 0.12) {
                            vec2 starUV = dir.xz / (dir.y + 0.38) * 52.0;
                            vec2 cell = floor(starUV);
                            vec2 f = fract(starUV);
                            float h1 = hash21(cell);
                            if (h1 > 0.94) {
                                float h2 = hash21(cell + vec2(7.3, 19.1));
                                vec2 starCenter = vec2(0.25 + 0.5 * h1, 0.25 + 0.5 * h2);
                                float dist = length(f - starCenter);
                                float pin = 1.0 - smoothstep(0.03, 0.14, dist);
                                float twinkle = 0.65 + 0.35 * sin(uTime * 2.6 + h1 * 90.0);
                                float elevMask = smoothstep(0.12, 0.38, elev);
                                vec3 starTint = mix(vec3(0.78, 0.88, 1.0), vec3(1.0, 0.92, 0.78), h2);
                                skyCol += starTint * pin * twinkle * elevMask * uStarIntensity * 1.15;
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
        const hasShader = typeof THREE.ShaderMaterial === 'function';
        const sunPlane = new THREE.PlaneGeometry(54, 54);
        const moonPlane = new THREE.PlaneGeometry(38, 38);

        if (hasShader) {
            this.sunMat = new THREE.ShaderMaterial({
                uniforms: {
                    uCoreColor: { value: new THREE.Color(0xfff6d8) },
                    uHaloColor: { value: new THREE.Color(0xffeab3) },
                    uOpacity: { value: 0.88 }
                },
                transparent: true,
                depthWrite: false,
                fog: false,
                blending: THREE.AdditiveBlending,
                vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
                fragmentShader: `
                    uniform vec3 uCoreColor;
                    uniform vec3 uHaloColor;
                    uniform float uOpacity;
                    varying vec2 vUv;
                    void main() {
                        float r = length(vUv - 0.5) * 2.0;
                        if (r > 1.0) discard;
                        float disc = 1.0 - smoothstep(0.16, 0.28, r);
                        float glow = pow(clamp(1.0 - r, 0.0, 1.0), 2.8) * 0.52;
                        vec3 col = uCoreColor * disc * 1.35 + uHaloColor * glow;
                        float alpha = clamp((disc * 0.95 + glow) * uOpacity, 0.0, 1.0);
                        gl_FragColor = vec4(col, alpha);
                    }
                `
            });
            // Expose color/opacity adapters for uniform compatibility
            this.sunMat.color = this.sunMat.uniforms.uCoreColor.value;
            this.sunMat._opacityVal = 0.88;
            Object.defineProperty(this.sunMat, 'opacity', {
                get: () => this.sunMat._opacityVal,
                set: (v) => {
                    this.sunMat._opacityVal = v;
                    this.sunMat.uniforms.uOpacity.value = v;
                }
            });

            this.moonMat = new THREE.ShaderMaterial({
                uniforms: {
                    uMoonColor: { value: new THREE.Color(0xf4f7fc) },
                    uHaloColor: { value: new THREE.Color(0x9ab8e6) },
                    uOpacity: { value: 0.0 }
                },
                transparent: true,
                depthWrite: false,
                fog: false,
                vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
                fragmentShader: `
                    uniform vec3 uMoonColor;
                    uniform vec3 uHaloColor;
                    uniform float uOpacity;
                    varying vec2 vUv;
                    void main() {
                        vec2 p = (vUv - 0.5) * 2.0;
                        float r = length(p);
                        if (r > 1.0) discard;
                        float disc = 1.0 - smoothstep(0.22, 0.27, r);
                        // Subtle lunar sea mottling across face + limb darkening
                        float mare = sin(p.x * 13.0 + p.y * 9.0) * cos(p.y * 17.0 - p.x * 7.0);
                        float shade = (0.88 + 0.12 * mare) * (1.0 - 0.25 * smoothstep(0.0, 0.25, r));
                        float halo = pow(clamp(1.0 - r, 0.0, 1.0), 3.4) * 0.42;
                        vec3 col = mix(uHaloColor, uMoonColor * shade, clamp(disc * 1.1, 0.0, 1.0));
                        float alpha = clamp((disc * 0.95 + halo) * uOpacity, 0.0, 1.0);
                        gl_FragColor = vec4(col, alpha);
                    }
                `
            });
            this.moonMat.color = this.moonMat.uniforms.uMoonColor.value;
            this.moonMat._opacityVal = 0.0;
            Object.defineProperty(this.moonMat, 'opacity', {
                get: () => this.moonMat._opacityVal,
                set: (v) => {
                    this.moonMat._opacityVal = v;
                    this.moonMat.uniforms.uOpacity.value = v;
                }
            });

            this.sunMesh = new THREE.Mesh(sunPlane, this.sunMat);
            this.moonMesh = new THREE.Mesh(moonPlane, this.moonMat);
        } else {
            this.sunMat = new THREE.MeshBasicMaterial({ color: 0xfff6d8, transparent: true, opacity: 0.88, side: THREE.DoubleSide, fog: false, depthWrite: false });
            this.sunMesh = new THREE.Mesh(sunPlane, this.sunMat);
            this.moonMat = new THREE.MeshBasicMaterial({ color: 0xf4f7fc, transparent: true, opacity: 0.0, side: THREE.DoubleSide, fog: false, depthWrite: false });
            this.moonMesh = new THREE.Mesh(moonPlane, this.moonMat);
        }

        this.sunMesh.position.set(this.cx + 95, 92, this.cz + 18);
        if (typeof this.sunMesh.lookAt === 'function') this.sunMesh.lookAt(this.cx, 0, this.cz);
        this.sunMesh.userData = { isBackdrop: true, ignoreRaycast: true };
        this.parentGroup.add(this.sunMesh);

        // Keep lightweight corona/halo wrappers hidden when ShaderMaterial handles corona directly
        this.sunCoronaMat = new THREE.MeshBasicMaterial({ color: 0xffeab3, transparent: true, opacity: 0.0, side: THREE.DoubleSide, fog: false, depthWrite: false });
        this.sunCoronaMesh = new THREE.Mesh(new THREE.RingGeometry(13.2, 25.0, 16), this.sunCoronaMat);
        this.sunCoronaMesh.position.copy(this.sunMesh.position);
        this.sunCoronaMesh.visible = false;
        this.sunCoronaMesh.userData = { isBackdrop: true, ignoreRaycast: true };

        this.moonMesh.position.set(this.cx - 110, 62, this.cz - 48);
        if (typeof this.moonMesh.lookAt === 'function') this.moonMesh.lookAt(this.cx, 0, this.cz);
        this.moonMesh.userData = { isBackdrop: true, ignoreRaycast: true };
        this.parentGroup.add(this.moonMesh);

        this.moonHaloMat = new THREE.MeshBasicMaterial({ color: 0x9ab8e6, transparent: true, opacity: 0.0, side: THREE.DoubleSide, fog: false, depthWrite: false });
        this.moonHaloMesh = new THREE.Mesh(new THREE.RingGeometry(9.3, 18.5, 16), this.moonHaloMat);
        this.moonHaloMesh.position.copy(this.moonMesh.position);
        this.moonHaloMesh.visible = false;
        this.moonHaloMesh.userData = { isBackdrop: true, ignoreRaycast: true };
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

    update(delta = 0.016, isStorm = false, lightningFlash = 0.0) {
        this.time += delta;
        this.uniforms.uTime.value = this.time;
        this.setPhase(this.currentPhase, isStorm);
        const lerpSpeed = Math.min(1.0, delta * 2.2);
        this.uniforms.uStormMix.value += ((isStorm ? 1.0 : 0.0) - this.uniforms.uStormMix.value) * lerpSpeed;
        this.uniforms.uLightningFlash.value = Math.max(0.0, Math.min(1.4, lightningFlash || 0.0));

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
        if (this.sunMat.uniforms?.uHaloColor?.value?.copy) {
            this.sunMat.uniforms.uHaloColor.value.copy(this.sunCoronaMat.color);
        }
        this.sunMat.opacity += (this.targetSunOpacity - this.sunMat.opacity) * lerpSpeed;
        this.sunCoronaMat.opacity = this.sunMat.opacity * 0.36;
        this.sunMesh.visible = this.sunMat.opacity > 0.02;
        this.sunCoronaMesh.visible = false;

        this.moonMat.opacity += (this.targetMoonOpacity - this.moonMat.opacity) * lerpSpeed;
        this.moonHaloMat.opacity = this.moonMat.opacity * 0.32;
        this.moonMesh.visible = this.moonMat.opacity > 0.02;
        this.moonHaloMesh.visible = false;

        const activeCelestial = this.moonMat.opacity > this.sunMat.opacity ? this.moonMesh.position : this.sunMesh.position;
        this.uniforms.uCelestialDir.value
            .set(activeCelestial.x - this.cx, Math.max(8, activeCelestial.y), activeCelestial.z - this.cz)
            .normalize();
    }
}
