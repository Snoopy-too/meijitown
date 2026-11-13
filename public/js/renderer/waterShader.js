import * as THREE from 'three';

const WATER_VERTEX_SHADER = `
    uniform float uTime;
    uniform float uMode; // 0 = canal, 1 = river, 2 = paddy
    uniform float uStorm;

    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying vec3 vWorldNormal;

    void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);

        // Subtle physical vertex micro-swell (barely noticeable at shore edges, organic motion)
        float amp = (uMode < 0.5) ? 0.008 : ((uMode < 1.5) ? 0.018 : 0.004);
        amp *= (1.0 + uStorm * 1.35);
        float swell = sin(worldPos.x * 2.7 + uTime * 1.9) * cos(worldPos.z * 2.3 - uTime * 1.4);
        worldPos.y += swell * amp;

        vWorldPos = worldPos.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);

        gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
`;

const WATER_FRAGMENT_SHADER = `
    uniform float uTime;
    uniform float uMode; // 0 = canal, 1 = river, 2 = paddy
    uniform float uStorm;
    uniform float uNightMix;
    uniform vec3 uSunDir;
    uniform vec3 uSunColor;
    uniform vec3 uSkyZenith;
    uniform vec3 uSkyHorizon;
    uniform vec3 uFogColor;
    uniform float uFogDensity;
    uniform vec3 uDeepColor;
    uniform vec3 uShallowColor;
    uniform float uBaseOpacity;

    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying vec3 vWorldNormal;

    float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
    }

    float noise2D(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbmWave(vec2 p) {
        float val = 0.0;
        float amp = 0.52;
        mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);
        for (int i = 0; i < 4; i++) {
            val += amp * noise2D(p);
            p = rot * p * 2.08;
            amp *= 0.48;
        }
        return val;
    }

    // Heightfield of dual-scrolling capillary ripples for analytical normal extraction
    float waveHeight(vec2 xz) {
        float flowSpeed = (uMode > 0.5 && uMode < 1.5) ? 0.55 : ((uMode < 0.5) ? 0.22 : 0.08);
        float stormBoost = 1.0 + uStorm * 0.9;
        vec2 flowA = vec2(0.42, 0.78) * uTime * flowSpeed * stormBoost;
        vec2 flowB = vec2(-0.62, 0.46) * uTime * flowSpeed * 1.15 * stormBoost;

        float scale = (uMode > 1.5) ? 4.4 : 2.9;
        float w1 = fbmWave(xz * scale + flowA);
        float w2 = fbmWave(xz * (scale * 1.65) - flowB);
        float detail = sin(xz.x * 7.5 + xz.y * 5.2 - uTime * 2.4 * stormBoost) * 0.14;
        return (w1 * 0.58 + w2 * 0.42 + detail * 0.35);
    }

    void main() {
        vec3 viewVec = cameraPosition - vWorldPos;
        float viewDist = length(viewVec);
        vec3 V = viewVec / max(viewDist, 0.0001);

        // Analytical finite-difference normal from world-space scrolling capillary waves
        vec2 p = vWorldPos.xz;
        float eps = 0.045;
        float hC = waveHeight(p);
        float hX = waveHeight(p + vec2(eps, 0.0));
        float hZ = waveHeight(p + vec2(0.0, eps));

        float chop = (uMode > 1.5) ? 0.18 : ((uMode > 0.5) ? 0.44 : 0.34);
        chop *= (1.0 + uStorm * 0.85);
        vec3 N = normalize(vec3((hC - hX) / eps * chop, 1.0, (hC - hZ) / eps * chop));
        N = normalize(mix(normalize(vWorldNormal), N, 0.85));

        vec3 L = normalize(uSunDir);
        vec3 R = reflect(-V, N);
        float NdotV = max(dot(N, V), 0.001);
        float NdotL = max(dot(N, L), 0.0);

        // Schlick Fresnel (water IOR ~ 1.333 => F0 = 0.0204)
        float fresnel = 0.022 + 0.978 * pow(1.0 - NdotV, 4.6);

        // Procedural sky + warm horizon gradient reflected across R
        float reflUp = clamp(R.y, 0.0, 1.0);
        vec3 reflectedSky = mix(uSkyHorizon, uSkyZenith, smoothstep(0.0, 0.65, reflUp));

        // Subsurface Beer-Lambert water absorption + shallow solar caustic lattice
        float causticTime = uTime * ((uMode < 1.5) ? 0.65 : 0.25);
        float c1 = noise2D(p * 3.8 + vec2(causticTime * 0.5, -causticTime * 0.4));
        float c2 = noise2D(p * 4.9 - vec2(causticTime * 0.45, causticTime * 0.55));
        float caustic = pow(clamp(1.0 - abs(c1 - c2) * 3.1, 0.0, 1.0), 3.0);
        float causticVis = (1.0 - uNightMix * 0.82) * (1.0 - uStorm * 0.65) * clamp(NdotL * 1.4, 0.08, 1.0);

        vec3 bodyColor = mix(uDeepColor, uShallowColor, clamp(hC * 0.8 + 0.15, 0.0, 1.0));
        bodyColor += uSunColor * (caustic * 0.11 * causticVis);
        // Subtle ambient diffuse sky tint on body
        bodyColor *= (0.45 + 0.55 * NdotL) + uSkyHorizon * 0.22;

        // Sharp GGX solar/lunar specular sun-glint highlight
        vec3 H = normalize(V + L);
        float NdotH = max(dot(N, H), 0.0);
        float rough = mix(0.048, 0.13, uStorm);
        float a2 = rough * rough;
        float denom = (NdotH * NdotH * (a2 - 1.0) + 1.0);
        float ggx = a2 / max(3.14159 * denom * denom, 0.0001);
        float specStrength = mix(0.32, 0.14, uStorm);
        vec3 specGlint = uSunColor * ggx * specStrength * NdotL;

        // Combine subsurface water body + sky reflection + GGX sun glints
        vec3 color = mix(bodyColor, reflectedSky, clamp(fresnel * 1.05, 0.02, 0.94)) + specGlint;

        // Nighttime warm reflected lantern shimmer on water surface
        if (uNightMix > 0.05) {
            float lanternNoise = noise2D(p * 0.95 + vec2(uTime * 0.15, 0.0));
            float shimmer = smoothstep(0.62, 0.92, lanternNoise) * smoothstep(0.55, 0.85, hC);
            color += vec3(0.42, 0.21, 0.05) * shimmer * uNightMix * (1.0 - uStorm * 0.5);
        }

        // Meniscus shoreline / bank foam (river lateral banks, canal quay lip, or wave crests in storm)
        float foam = 0.0;
        if (uMode > 0.5 && uMode < 1.5) {
            // Gorge river: UV.x in [0..1] across river width -> foam near 0.0 and 1.0 banks + rapid crests
            float edgeDist = min(vUv.x, 1.0 - vUv.x);
            float bankMask = 1.0 - smoothstep(0.01, 0.17, edgeDist);
            float foamNoise = noise2D(p * 3.6 - vec2(0.0, uTime * 1.3));
            foam = max(bankMask * smoothstep(0.28, 0.72, foamNoise), smoothstep(0.76, 0.93, hC) * 0.45);
        } else if (uMode < 0.5) {
            // Urban canal: subtle quay edge ripple highlight & gentle crest froth in storm
            float edgeDist = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
            float quayRim = (1.0 - smoothstep(0.0, 0.055, edgeDist)) * smoothstep(0.42, 0.78, hC);
            float stormCrest = smoothstep(0.77 - uStorm * 0.14, 0.92, hC) * (0.12 + uStorm * 0.42);
            foam = max(quayRim * 0.35, stormCrest);
        } else {
            // Inundated paddy: organic muddy edge shimmer only
            float edgeDist = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
            foam = (1.0 - smoothstep(0.0, 0.07, edgeDist)) * 0.14;
        }
        vec3 foamCol = mix(vec3(0.85, 0.90, 0.92), vec3(0.42, 0.46, 0.50), uNightMix * 0.75);
        color = mix(color, foamCol, clamp(foam, 0.0, 0.68));

        // Exact FogExp2 atmospheric integration matching scene.fog
        float fogDist = uFogDensity * viewDist;
        float fogFactor = 1.0 - exp(-(fogDist * fogDist));
        color = mix(color, uFogColor, clamp(fogFactor, 0.0, 1.0));

        float alpha = clamp(uBaseOpacity + fresnel * 0.14 + foam * 0.25, 0.55, 0.98);
        gl_FragColor = vec4(color, alpha);
    }
`;

function buildSharedUniforms(mode, deepHex, shallowHex, baseOpacity) {
    return {
        uTime: { value: 0 },
        uMode: { value: mode },
        uStorm: { value: 0 },
        uNightMix: { value: 0 },
        uSunDir: { value: new THREE.Vector3(0.45, 0.75, 0.35).normalize() },
        uSunColor: { value: new THREE.Color(0xfff5e0) },
        uSkyZenith: { value: new THREE.Color(0x3b76b8) },
        uSkyHorizon: { value: new THREE.Color(0xcce2f0) },
        uFogColor: { value: new THREE.Color(0xcfe0eb) },
        uFogDensity: { value: 0.0022 },
        uDeepColor: { value: new THREE.Color(deepHex) },
        uShallowColor: { value: new THREE.Color(shallowHex) },
        uBaseOpacity: { value: baseOpacity }
    };
}

/**
 * Shared GLSL photorealistic water system across Meiji canals, the backdrop mountain gorge river,
 * and flooded spring rice paddies. Safely degrades to MeshStandardMaterial in Node mocks.
 */
class WaterShaderRegistry {
    constructor() {
        this._materials = new Map();
        this._elapsed = 0;
        this._targetStorm = 0;
        this._currentStorm = 0;
    }

    _createWaterMaterial(key, mode, deepHex, shallowHex, baseOpacity, fallbackOpts) {
        if (this._materials.has(key)) {
            return this._materials.get(key);
        }

        if (typeof THREE.ShaderMaterial !== 'function') {
            const fallback = new THREE.MeshStandardMaterial(fallbackOpts);
            fallback.userData = { isSharedLibraryMaterial: true, isWaterShaderFallback: true, waterMode: key };
            this._materials.set(key, fallback);
            return fallback;
        }

        const uniforms = buildSharedUniforms(mode, deepHex, shallowHex, baseOpacity);
        const mat = new THREE.ShaderMaterial({
            uniforms,
            vertexShader: WATER_VERTEX_SHADER,
            fragmentShader: WATER_FRAGMENT_SHADER,
            transparent: true,
            depthWrite: false
        });
        mat.userData = { isSharedLibraryMaterial: true, isWaterShader: true, waterMode: key };
        this._materials.set(key, mat);
        return mat;
    }

    getCanalMaterial() {
        return this._createWaterMaterial(
            'canal',
            0.0,
            0x0c3442, // Deep Meiji Aoi-mizu teal-indigo (linearized subtly by Color)
            0x1d6876,
            0.89,
            { color: 0x1d6878, roughness: 0.08, metalness: 0.25, transparent: true, opacity: 0.89 }
        );
    }

    getRiverMaterial() {
        return this._createWaterMaterial(
            'river',
            1.0,
            0x113d4d,
            0x2d7488,
            0.93,
            { color: 0x2d6378, roughness: 0.14, metalness: 0.22, transparent: true, opacity: 0.92 }
        );
    }

    getPaddyMaterial() {
        return this._createWaterMaterial(
            'paddy',
            2.0,
            0x2d3a2c, // Muddy submerged terrace bed + shallow spring sky reflection
            0x4c6248,
            0.86,
            { color: 0x4b7078, roughness: 0.08, metalness: 0.24, transparent: true, opacity: 0.84 }
        );
    }

    /**
     * Advances animation time and syncs lighting / fog / storm uniforms across all water materials.
     */
    update(delta = 0.016, lightingState = null, isStorm = false) {
        this._elapsed += delta;
        this._targetStorm = isStorm ? 1.0 : 0.0;
        this._currentStorm += (this._targetStorm - this._currentStorm) * Math.min(1.0, delta * 1.8);

        for (const mat of this._materials.values()) {
            const u = mat.uniforms;
            if (!u) continue;
            u.uTime.value = this._elapsed;
            u.uStorm.value = this._currentStorm;

            if (lightingState) {
                if (lightingState.sunDir && u.uSunDir.value.copy) {
                    u.uSunDir.value.copy(lightingState.sunDir).normalize();
                }
                if (lightingState.sunColor && u.uSunColor.value.copy) {
                    u.uSunColor.value.copy(lightingState.sunColor);
                }
                if (lightingState.skyZenith && u.uSkyZenith.value.copy) {
                    u.uSkyZenith.value.copy(lightingState.skyZenith);
                }
                if (lightingState.skyHorizon && u.uSkyHorizon.value.copy) {
                    u.uSkyHorizon.value.copy(lightingState.skyHorizon);
                }
                if (lightingState.fogColor && u.uFogColor.value.copy) {
                    u.uFogColor.value.copy(lightingState.fogColor);
                }
                if (typeof lightingState.fogDensity === 'number') {
                    u.uFogDensity.value = lightingState.fogDensity;
                }
                if (typeof lightingState.nightMix === 'number') {
                    u.uNightMix.value = lightingState.nightMix;
                }
            }
        }
    }

    disposeAll() {
        for (const mat of this._materials.values()) {
            if (mat && typeof mat.dispose === 'function') {
                mat.dispose();
            }
        }
        this._materials.clear();
    }
}

export const WaterShaderSystem = new WaterShaderRegistry();
