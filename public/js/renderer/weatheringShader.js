import * as THREE from 'three';

const WORLD_POS_VERTEX_EXPR = `
    vec4 meijiWp = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
        meijiWp = instanceMatrix * meijiWp;
    #endif
    meijiWp = modelMatrix * meijiWp;
`;

/**
 * Adds world-space architectural weathering, ground-contact AO/dampness patina,
 * physical glass interior parallax glow, fibrous shoji backlighting, and GPU wind
 * sway for botanical foliage & crops. Safe no-op in headless Node mocks.
 */
class WeatheringShaderRegistry {
    constructor() {
        this._sharedUniforms = {
            uTime: { value: 0 },
            uWindStrength: { value: 1.0 },
            uEmissiveStrength: { value: 0.0 },
            uWarmGlowColor: { value: new THREE.Color(0xff9b3d) },
            uShojiGlowColor: { value: new THREE.Color(0xffbe66) }
        };
    }

    /**
     * Adds per-tile micro-tonal variation and bottom-edge ground contact dampness/AO
     * onto shared architectural MeshStandardMaterials.
     */
    enhanceBuildingMaterial(material, opts = {}) {
        if (!material || typeof material !== 'object') return material;
        if (typeof THREE.ShaderMaterial !== 'function') return material;
        if (material.userData?.weatheringEnhanced) return material;

        const isRoof = !!opts.isRoof;
        const aoHeight = opts.aoHeight ?? 0.42;
        const variationAmt = opts.variation ?? 0.075;
        const shared = this._sharedUniforms;

        material.userData = { ...(material.userData || {}), weatheringEnhanced: true };
        material.customProgramCacheKey = () => `meiji_bldg_v1_${isRoof ? 1 : 0}_${aoHeight}_${variationAmt}`;

        material.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = shared.uTime;

            shader.vertexShader = shader.vertexShader
                .replace(
                    '#include <common>',
                    `#include <common>
                    varying vec3 vBldgWorldPos;
                    varying vec3 vBldgWorldNormal;`
                )
                .replace(
                    '#include <project_vertex>',
                    `#include <project_vertex>
                    ${WORLD_POS_VERTEX_EXPR}
                    vBldgWorldPos = meijiWp.xyz;
                    vec3 bNorm = objectNormal;
                    #ifdef USE_INSTANCING
                        bNorm = mat3(instanceMatrix) * bNorm;
                    #endif
                    vBldgWorldNormal = normalize(mat3(modelMatrix) * bNorm);`
                );

            shader.fragmentShader = shader.fragmentShader
                .replace(
                    '#include <common>',
                    `#include <common>
                    varying vec3 vBldgWorldPos;
                    varying vec3 vBldgWorldNormal;

                    float meijiHash21(vec2 p) {
                        p = fract(p * vec2(127.1, 311.7));
                        p += dot(p, p + 41.23);
                        return fract(p.x * p.y);
                    }
                    float meijiNoise21(vec2 p) {
                        vec2 i = floor(p);
                        vec2 f = fract(p);
                        f = f * f * (3.0 - 2.0 * f);
                        return mix(
                            mix(meijiHash21(i), meijiHash21(i + vec2(1.0, 0.0)), f.x),
                            mix(meijiHash21(i + vec2(0.0, 1.0)), meijiHash21(i + vec2(1.0, 1.0)), f.x),
                            f.y
                        );
                    }`
                )
                .replace(
                    '#include <color_fragment>',
                    `#include <color_fragment>
                    // Subtle per-tile organic tone variance so repeated roofs/walls don't look cloned
                    vec2 tileIdx = floor(vBldgWorldPos.xz * 0.5);
                    float tileRand = meijiHash21(tileIdx);
                    float microPatch = meijiNoise21(vBldgWorldPos.xz * 1.6 + vBldgWorldPos.y * 0.9);
                    vec3 patinaShift = mix(vec3(0.95, 0.97, 1.03), vec3(1.04, 1.00, 0.94), tileRand);
                    diffuseColor.rgb *= mix(vec3(1.0), patinaShift, ${variationAmt.toFixed(3)} * 4.5);
                    diffuseColor.rgb *= (0.94 + 0.12 * microPatch);

                    ${!isRoof ? `
                        // Ground-contact dampness & splash-zone ambient darkening in lowest 0.42m
                        float dampMask = 1.0 - smoothstep(0.02, ${aoHeight.toFixed(2)}, max(0.0, vBldgWorldPos.y));
                        float dampNoise = 0.75 + 0.25 * meijiNoise21(vBldgWorldPos.xz * 3.1);
                        diffuseColor.rgb *= mix(1.0, 0.72, dampMask * dampNoise * 0.72);
                    ` : `
                        // Subtle ridge highlight + eaves drip darkening on pitched Meiji roofs
                        float upward = clamp(vBldgWorldNormal.y, 0.0, 1.0);
                        float eavesPatina = 1.0 - smoothstep(0.35, 0.85, upward);
                        diffuseColor.rgb *= (1.0 - eavesPatina * 0.14);
                    `}`
                )
                .replace(
                    '#include <roughnessmap_fragment>',
                    `#include <roughnessmap_fragment>
                    float rPatch = meijiNoise21(vBldgWorldPos.xz * 2.2 + vBldgWorldPos.y);
                    roughnessFactor = clamp(roughnessFactor + (rPatch - 0.5) * 0.12, 0.14, 0.99);`
                );
        };
        material.needsUpdate = true;
        return material;
    }

    /**
     * Enhances Meiji Western-style glass windows with multi-room warm lamp occupancy
     * and interior transom silhouettes at dusk and night.
     */
    enhanceGlassMaterial(material) {
        if (!material || typeof material !== 'object') return material;
        if (typeof THREE.ShaderMaterial !== 'function') return material;
        if (material.userData?.glassEnhanced) return material;

        const shared = this._sharedUniforms;
        material.userData = { ...(material.userData || {}), glassEnhanced: true };
        material.customProgramCacheKey = () => 'meiji_glass_interior_v1';

        material.onBeforeCompile = (shader) => {
            shader.uniforms.uEmissiveStrength = shared.uEmissiveStrength;
            shader.uniforms.uWarmGlowColor = shared.uWarmGlowColor;

            shader.vertexShader = shader.vertexShader
                .replace(
                    '#include <common>',
                    `#include <common>
                    varying vec3 vGlassWorldPos;
                    varying vec3 vGlassLocalPos;`
                )
                .replace(
                    '#include <project_vertex>',
                    `#include <project_vertex>
                    ${WORLD_POS_VERTEX_EXPR}
                    vGlassWorldPos = meijiWp.xyz;
                    vGlassLocalPos = position;`
                );

            shader.fragmentShader = shader.fragmentShader
                .replace(
                    '#include <common>',
                    `#include <common>
                    uniform float uEmissiveStrength;
                    uniform vec3 uWarmGlowColor;
                    varying vec3 vGlassWorldPos;
                    varying vec3 vGlassLocalPos;

                    float glassHash(vec2 p) {
                        p = fract(p * vec2(127.1, 311.7));
                        p += dot(p, p + 19.19);
                        return fract(p.x * p.y);
                    }`
                )
                .replace(
                    '#include <emissivemap_fragment>',
                    `#include <emissivemap_fragment>
                    // Divide panes into room cells so some rooms are softly lit and others dark
                    vec2 roomCell = floor(vec2(vGlassWorldPos.x + vGlassWorldPos.z * 1.37, vGlassWorldPos.y * 2.4));
                    float roomLit = step(0.24, glassHash(roomCell));
                    float roomWarmth = 0.72 + 0.56 * glassHash(roomCell + vec2(3.1, 7.4));
                    float gradY = smoothstep(0.0, 0.35, fract(vGlassWorldPos.y * 2.4)) * (1.0 - 0.35 * smoothstep(0.65, 1.0, fract(vGlassWorldPos.y * 2.4)));
                    // Subtle wooden mullion bars inside glass
                    float mullionH = smoothstep(0.06, 0.11, abs(fract(vGlassWorldPos.y * 3.2) - 0.5));
                    vec3 interiorRadiance = uWarmGlowColor * (uEmissiveStrength * 1.25 * roomLit * roomWarmth * gradY * (0.45 + 0.55 * mullionH));
                    totalEmissiveRadiance = max(totalEmissiveRadiance * (0.45 + 0.55 * roomLit * mullionH), interiorRadiance);`
                );
        };
        material.needsUpdate = true;
        return material;
    }

    /**
     * Enhances traditional shoji paper sliding screens with fibrous washi paper grain
     * and interior kumiko wood lattice shadow when warm-lit from indoors.
     */
    enhanceShojiMaterial(material) {
        if (!material || typeof material !== 'object') return material;
        if (typeof THREE.ShaderMaterial !== 'function') return material;
        if (material.userData?.shojiEnhanced) return material;

        const shared = this._sharedUniforms;
        material.userData = { ...(material.userData || {}), shojiEnhanced: true };
        material.customProgramCacheKey = () => 'meiji_shoji_kumiko_v1';

        material.onBeforeCompile = (shader) => {
            shader.uniforms.uEmissiveStrength = shared.uEmissiveStrength;
            shader.uniforms.uShojiGlowColor = shared.uShojiGlowColor;

            shader.vertexShader = shader.vertexShader
                .replace(
                    '#include <common>',
                    `#include <common>
                    varying vec3 vShojiWorldPos;`
                )
                .replace(
                    '#include <project_vertex>',
                    `#include <project_vertex>
                    ${WORLD_POS_VERTEX_EXPR}
                    vShojiWorldPos = meijiWp.xyz;`
                );

            shader.fragmentShader = shader.fragmentShader
                .replace(
                    '#include <common>',
                    `#include <common>
                    uniform float uEmissiveStrength;
                    uniform vec3 uShojiGlowColor;
                    varying vec3 vShojiWorldPos;

                    float shojiHash(vec2 p) {
                        p = fract(p * vec2(93.17, 241.51));
                        p += dot(p, p + 31.4);
                        return fract(p.x * p.y);
                    }`
                )
                .replace(
                    '#include <emissivemap_fragment>',
                    `#include <emissivemap_fragment>
                    // Subtle wooden kumiko grid shadows silhouetted through translucent washi paper
                    float gridX = smoothstep(0.04, 0.09, abs(fract((vShojiWorldPos.x + vShojiWorldPos.z) * 7.5) - 0.5));
                    float gridY = smoothstep(0.04, 0.09, abs(fract(vShojiWorldPos.y * 8.0) - 0.5));
                    float kumikoMask = 0.52 + 0.48 * (gridX * gridY);
                    float roomMask = step(0.18, shojiHash(floor(vShojiWorldPos.xz * 0.9)));
                    float lanternCenter = 0.72 + 0.28 * sin(vShojiWorldPos.x * 2.1 + vShojiWorldPos.z * 2.1);
                    vec3 paperGlow = uShojiGlowColor * (uEmissiveStrength * 1.15 * kumikoMask * mix(0.32, 1.0, roomMask) * lanternCenter);
                    totalEmissiveRadiance = max(totalEmissiveRadiance * kumikoMask, paperGlow);`
                );
        };
        material.needsUpdate = true;
        return material;
    }

    /**
     * Adds organic GPU wind vertex sway + warm backlit botanical crown glow
     * to alpha-tested foliage cards and paddy stalks.
     */
    enhanceFoliageMaterial(material, opts = {}) {
        if (!material || typeof material !== 'object') return material;
        if (typeof THREE.ShaderMaterial !== 'function') return material;
        if (material.userData?.foliageEnhanced) return material;

        const swayAmp = opts.swayAmplitude ?? 0.045;
        const speedMult = opts.speedMultiplier ?? 1.0;
        const shared = this._sharedUniforms;

        material.userData = { ...(material.userData || {}), foliageEnhanced: true };
        material.customProgramCacheKey = () => `meiji_foliage_wind_v1_${swayAmp}_${speedMult}`;

        material.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = shared.uTime;
            shader.uniforms.uWindStrength = shared.uWindStrength;

            shader.vertexShader = shader.vertexShader
                .replace(
                    '#include <common>',
                    `#include <common>
                    uniform float uTime;
                    uniform float uWindStrength;
                    varying float vFoliageTipWeight;`
                )
                .replace(
                    '#include <begin_vertex>',
                    `#include <begin_vertex>
                    vec4 fWp = vec4(transformed, 1.0);
                    #ifdef USE_INSTANCING
                        fWp = instanceMatrix * fWp;
                    #endif
                    fWp = modelMatrix * fWp;

                    // Higher vertices sway gently in rolling breeze waves across the town
                    float heightFactor = clamp((transformed.y + 0.35) * 0.85, 0.0, 1.6);
                    vFoliageTipWeight = clamp(heightFactor * 0.75, 0.0, 1.0);
                    float wPhase = uTime * ${(1.85 * speedMult).toFixed(2)} + fWp.x * 0.65 + fWp.z * 0.48;
                    float gust = sin(wPhase) * 0.65 + sin(wPhase * 2.13 + fWp.x * 1.4) * 0.35;
                    float disp = gust * ${swayAmp.toFixed(4)} * uWindStrength * heightFactor;
                    transformed.x += disp;
                    transformed.z += disp * 0.62;`
                );

            shader.fragmentShader = shader.fragmentShader
                .replace(
                    '#include <common>',
                    `#include <common>
                    varying float vFoliageTipWeight;`
                )
                .replace(
                    '#include <color_fragment>',
                    `#include <color_fragment>
                    // Brighten outer sun-kissed canopy tips slightly vs shadowed interior stem
                    diffuseColor.rgb *= mix(0.76, 1.12, vFoliageTipWeight);`
                );
        };
        material.needsUpdate = true;
        return material;
    }

    /**
     * Advances shared wind animation clock and synchronizes emissive/storm intensities.
     */
    update(delta = 0.016, isStorm = false, emissiveStrength = 0.0) {
        this._sharedUniforms.uTime.value += delta;
        const targetWind = isStorm ? 2.45 : 1.0;
        this._sharedUniforms.uWindStrength.value +=
            (targetWind - this._sharedUniforms.uWindStrength.value) * Math.min(1.0, delta * 1.5);
        this._sharedUniforms.uEmissiveStrength.value = Math.max(0.0, emissiveStrength || 0.0);
    }
}

export const WeatheringShaderSystem = new WeatheringShaderRegistry();
