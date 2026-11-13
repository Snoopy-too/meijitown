import * as THREE from 'three';

const TERRAIN_NOISE_GLSL = `
float terrainHash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 34.45);
    return fract(p.x * p.y);
}

float terrainNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = terrainHash(i);
    float b = terrainHash(i + vec2(1.0, 0.0));
    float c = terrainHash(i + vec2(0.0, 1.0));
    float d = terrainHash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float terrainFBM(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 4; i++) {
        v += a * terrainNoise(p);
        p = rot * p * 2.05;
        a *= 0.5;
    }
    return v;
}
`;

/**
 * Enhances ground, soil, and backdrop mountain MeshStandardMaterials via
 * world-space FBM splatting, canal-bank soil moisture, cliff strata, snowlines,
 * and Rayleigh distance aerial perspective.
 */
class TerrainShaderRegistry {
    constructor() {
        this._sharedUniforms = {
            uHazeColor: { value: new THREE.Color(0xcbdbe8) },
            uSnowAmount: { value: 0.0 },
            uNightMix: { value: 0.0 },
            uAutumnMix: { value: 0.0 }
        };
    }

    /**
     * Enhances playable terrain / skirt MeshStandardMaterial with world-space multi-octave
     * grass/clover/loam micro-detail and damp soil darkening near carved canal basins.
     */
    enhanceGroundMaterial(material) {
        if (!material || typeof material !== 'object') return material;
        if (typeof THREE.ShaderMaterial !== 'function') return material;
        if (material.userData?.terrainEnhanced) return material;

        const shared = this._sharedUniforms;
        material.userData = { ...(material.userData || {}), terrainEnhanced: true };
        material.customProgramCacheKey = () => 'meiji_ground_fbm_v1';

        material.onBeforeCompile = (shader) => {
            shader.uniforms.uSnowAmount = shared.uSnowAmount;
            shader.uniforms.uHazeColor = shared.uHazeColor;
            shader.uniforms.uNightMix = shared.uNightMix;
            shader.uniforms.uAutumnMix = shared.uAutumnMix;

            shader.vertexShader = shader.vertexShader
                .replace(
                    '#include <common>',
                    `#include <common>
                    varying vec3 vTerrainWorldPos;
                    varying vec3 vTerrainWorldNormal;`
                )
                .replace(
                    '#include <project_vertex>',
                    `#include <project_vertex>
                    vTerrainWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
                    vTerrainWorldNormal = normalize(mat3(modelMatrix) * objectNormal);`
                );

            shader.fragmentShader = shader.fragmentShader
                .replace(
                    '#include <common>',
                    `#include <common>
                    uniform float uSnowAmount;
                    uniform vec3 uHazeColor;
                    uniform float uNightMix;
                    uniform float uAutumnMix;
                    varying vec3 vTerrainWorldPos;
                    varying vec3 vTerrainWorldNormal;
                    ${TERRAIN_NOISE_GLSL}`
                )
                .replace(
                    '#include <color_fragment>',
                    `#include <color_fragment>
                    vec2 wp = vTerrainWorldPos.xz;
                    float macroMeadow = terrainFBM(wp * 0.14);
                    float midClover = terrainFBM(wp * 0.58 + vec2(17.3, 9.1));
                    float fineTuft = terrainNoise(wp * 3.4);

                    // Subtle organic variation preserving seasonal palette tint from diffuseColor
                    vec3 lushTint = vec3(0.86, 1.06, 0.84);
                    vec3 warmLoam = mix(vec3(0.95, 0.84, 0.68), vec3(0.92, 0.72, 0.50), uAutumnMix);
                    float meadowMix = smoothstep(0.28, 0.74, macroMeadow);
                    diffuseColor.rgb *= mix(warmLoam, lushTint, meadowMix);
                    diffuseColor.rgb *= (0.88 + 0.24 * midClover) * (0.94 + 0.12 * fineTuft);

                    // Darken damp earth soil near submerged canal edges (y < -0.01)
                    float dampFactor = smoothstep(0.015, -0.18, vTerrainWorldPos.y);
                    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.48, 0.44, 0.39), dampFactor);

                    // Soft winter frost patches on uneven micro-mounds
                    if (uSnowAmount > 0.02) {
                        float frostMask = smoothstep(1.0 - uSnowAmount * 0.85, 1.05 - uSnowAmount * 0.45, midClover * 0.75 + macroMeadow * 0.35);
                        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.94, 0.98), frostMask * uSnowAmount * 0.82);
                    }`
                )
                .replace(
                    '#include <roughnessmap_fragment>',
                    `#include <roughnessmap_fragment>
                    float tDamp = smoothstep(0.01, -0.16, vTerrainWorldPos.y);
                    roughnessFactor = mix(roughnessFactor, 0.42, tDamp * 0.78);
                    roughnessFactor = clamp(roughnessFactor + (terrainNoise(vTerrainWorldPos.xz * 2.2) - 0.5) * 0.08, 0.28, 0.99);`
                )
                .replace(
                    '#include <dithering_fragment>',
                    `#include <dithering_fragment>
                    float skirtDist = length(cameraPosition - vTerrainWorldPos);
                    float farHaze = smoothstep(75.0, 260.0, skirtDist) * 0.55;
                    gl_FragColor.rgb = mix(gl_FragColor.rgb, uHazeColor, farHaze);`
                );
        };
        material.needsUpdate = true;
        return material;
    }

    /**
     * Enhances mountain massifs, cedar foothills, Mount Fuji, and gorge riverbanks
     * with slope/elevation biome transitions (cedar forest -> basalt rock strata ->
     * jagged FBM snowline) plus smooth atmospheric aerial perspective.
     */
    enhanceMountainMaterial(material, opts = {}) {
        if (!material || typeof material !== 'object') return material;
        if (typeof THREE.ShaderMaterial !== 'function') return material;
        if (material.userData?.mountainEnhanced) return material;

        const shared = this._sharedUniforms;
        const snowLine = opts.snowLine ?? 13.5;
        const hasSnowCap = !!opts.hasSnowCap;
        const isFuji = !!opts.isFuji;
        const isBank = !!opts.isBank;

        material.userData = { ...(material.userData || {}), mountainEnhanced: true };
        material.customProgramCacheKey = () => `meiji_mtn_v1_${snowLine}_${hasSnowCap ? 1 : 0}_${isFuji ? 1 : 0}_${isBank ? 1 : 0}`;

        material.onBeforeCompile = (shader) => {
            shader.uniforms.uHazeColor = shared.uHazeColor;
            shader.uniforms.uSnowAmount = shared.uSnowAmount;
            shader.uniforms.uAutumnMix = shared.uAutumnMix;

            shader.vertexShader = shader.vertexShader
                .replace(
                    '#include <common>',
                    `#include <common>
                    varying vec3 vMtnWorldPos;
                    varying vec3 vMtnWorldNormal;`
                )
                .replace(
                    '#include <project_vertex>',
                    `#include <project_vertex>
                    vMtnWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
                    vMtnWorldNormal = normalize(mat3(modelMatrix) * objectNormal);`
                );

            shader.fragmentShader = shader.fragmentShader
                .replace(
                    '#include <common>',
                    `#include <common>
                    uniform vec3 uHazeColor;
                    uniform float uSnowAmount;
                    uniform float uAutumnMix;
                    varying vec3 vMtnWorldPos;
                    varying vec3 vMtnWorldNormal;
                    ${TERRAIN_NOISE_GLSL}`
                )
                .replace(
                    '#include <color_fragment>',
                    `#include <color_fragment>
                    vec2 mXZ = vMtnWorldPos.xz;
                    float ridgeFbm = terrainFBM(mXZ * 0.19);
                    float strata = terrainNoise(vec2(vMtnWorldPos.y * 1.35 + ridgeFbm * 1.4, (mXZ.x + mXZ.y) * 0.12));
                    float slope = clamp(vMtnWorldNormal.y, 0.0, 1.0);

                    ${isBank ? `
                        // Riverbank wet river cobbles + gravel bar variation
                        float pebble = terrainNoise(mXZ * 2.8);
                        diffuseColor.rgb *= (0.76 + 0.34 * strata) * (0.88 + 0.20 * pebble);
                        float waterEdge = smoothstep(0.02, -0.09, vMtnWorldPos.y);
                        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.48, waterEdge);
                    ` : `
                        // Tri-biome mountain shader: cedar forest slope -> stratified rock -> snowline
                        vec3 forestTone = mix(diffuseColor.rgb * vec3(0.74, 0.92, 0.68), diffuseColor.rgb * vec3(1.06, 0.78, 0.48), uAutumnMix * 0.72);
                        vec3 basaltRock = diffuseColor.rgb * (0.68 + 0.38 * strata);
                        float rockMask = 1.0 - smoothstep(0.54, 0.82, slope + (ridgeFbm - 0.5) * 0.25);
                        diffuseColor.rgb = mix(forestTone, basaltRock, rockMask);

                        ${hasSnowCap || isFuji ? `
                            float effectiveSnowLine = ${snowLine.toFixed(2)} - uSnowAmount * 3.8 + (ridgeFbm - 0.5) * 4.2;
                            float snowBlend = smoothstep(effectiveSnowLine - 1.2, effectiveSnowLine + 2.4, vMtnWorldPos.y);
                            float slopeStay = smoothstep(0.32, 0.62, slope);
                            float snowMask = snowBlend * mix(0.35, 1.0, slopeStay);
                            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.95, 0.98), snowMask);
                        ` : `
                            if (uSnowAmount > 0.05) {
                                float winSnow = smoothstep(4.5, 9.5, vMtnWorldPos.y + ridgeFbm * 2.5) * smoothstep(0.5, 0.8, slope) * uSnowAmount;
                                diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.90, 0.92, 0.96), winSnow * 0.78);
                            }
                        `}
                    `}`
                )
                .replace(
                    '#include <roughnessmap_fragment>',
                    `#include <roughnessmap_fragment>
                    ${isBank ? `
                        float wetCobble = smoothstep(0.03, -0.08, vMtnWorldPos.y);
                        roughnessFactor = mix(roughnessFactor, 0.30, wetCobble * 0.8);
                    ` : `
                        roughnessFactor = clamp(roughnessFactor + (terrainNoise(vMtnWorldPos.xz * 0.65) - 0.5) * 0.14, 0.38, 0.98);
                    `}`
                )
                .replace(
                    '#include <dithering_fragment>',
                    `#include <dithering_fragment>
                    float mtnDist = length(cameraPosition - vMtnWorldPos);
                    // Rayleigh distance haze creates layered atmospheric mountain silhouettes
                    float aerial = smoothstep(48.0, 225.0, mtnDist) * ${isFuji ? '0.68' : '0.58'};
                    gl_FragColor.rgb = mix(gl_FragColor.rgb, uHazeColor, clamp(aerial, 0.0, 0.78));`
                );
        };
        material.needsUpdate = true;
        return material;
    }

    /**
     * Syncs seasonal snowline, autumn warmth, and atmospheric haze tint with lighting.
     */
    update(lightingState = null, month = 4) {
        if (lightingState && lightingState.fogColor && this._sharedUniforms.uHazeColor.value.copy) {
            this._sharedUniforms.uHazeColor.value.copy(lightingState.fogColor);
        }
        if (lightingState && typeof lightingState.nightMix === 'number') {
            this._sharedUniforms.uNightMix.value = lightingState.nightMix;
        }
        const m = Math.max(1, Math.min(12, Math.round(month || 4)));
        const isWinter = (m === 12 || m <= 2);
        const isAutumn = (m >= 9 && m <= 11);
        this._sharedUniforms.uSnowAmount.value = isWinter ? 0.85 : (m === 3 || m === 11 ? 0.25 : 0.0);
        this._sharedUniforms.uAutumnMix.value = isAutumn ? 1.0 : 0.0;
    }
}

export const TerrainShaderSystem = new TerrainShaderRegistry();
