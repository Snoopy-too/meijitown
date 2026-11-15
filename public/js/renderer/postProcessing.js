import * as THREE from 'three';

const PhotorealLensShader = {
    uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1280, 720) },
        uClarity: { value: 0.14 },
        uVignette: { value: 0.22 },
        uTiltShiftStrength: { value: 0.24 },
        uFocusY: { value: 0.50 },
        uFocusBand: { value: 0.23 },
        uWarmth: { value: 0.035 },
        uChromatic: { value: 0.00045 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 uResolution;
        uniform float uClarity;
        uniform float uVignette;
        uniform float uTiltShiftStrength;
        uniform float uFocusY;
        uniform float uFocusBand;
        uniform float uWarmth;
        uniform float uChromatic;
        varying vec2 vUv;

        float luma(vec3 c) {
            return dot(c, vec3(0.299, 0.587, 0.114));
        }

        void main() {
            vec2 texel = 1.0 / max(uResolution, vec2(1.0));
            vec2 centered = vUv - 0.5;
            float radial2 = dot(centered, centered);

            // Subtle lens-edge chromatic offset only at far corners
            vec2 caOffset = centered * (radial2 * uChromatic * 4.0);
            vec3 base;
            base.r = texture2D(tDiffuse, clamp(vUv + caOffset, 0.0, 1.0)).r;
            base.g = texture2D(tDiffuse, vUv).g;
            base.b = texture2D(tDiffuse, clamp(vUv - caOffset, 0.0, 1.0)).b;

            // Gentle miniature tilt-shift depth blur above & below center horizontal focus zone
            float focusDist = max(0.0, abs(vUv.y - uFocusY) - uFocusBand);
            float blurFactor = smoothstep(0.0, 0.34, focusDist) * uTiltShiftStrength;
            vec3 col = base;

            if (blurFactor > 0.01) {
                float radius = blurFactor * 3.2;
                vec2 offsets[8];
                offsets[0] = vec2(-0.707, -0.707);
                offsets[1] = vec2( 0.707, -0.707);
                offsets[2] = vec2(-0.707,  0.707);
                offsets[3] = vec2( 0.707,  0.707);
                offsets[4] = vec2(-1.0,    0.0);
                offsets[5] = vec2( 1.0,    0.0);
                offsets[6] = vec2( 0.0,   -1.0);
                offsets[7] = vec2( 0.0,    1.0);

                vec3 blurAccum = base;
                for (int i = 0; i < 8; i++) {
                    vec2 uvSample = clamp(vUv + offsets[i] * texel * radius, 0.001, 0.999);
                    blurAccum += texture2D(tDiffuse, uvSample).rgb;
                }
                col = mix(base, blurAccum / 9.0, clamp(blurFactor * 1.15, 0.0, 0.88));
            }

            // Local micro-contrast clarity in the crisp focal region
            float focalWeight = 1.0 - smoothstep(0.0, 0.12, focusDist);
            if (uClarity > 0.001 && focalWeight > 0.02) {
                vec3 n1 = texture2D(tDiffuse, clamp(vUv + vec2(texel.x, 0.0), 0.0, 1.0)).rgb;
                vec3 n2 = texture2D(tDiffuse, clamp(vUv - vec2(texel.x, 0.0), 0.0, 1.0)).rgb;
                vec3 n3 = texture2D(tDiffuse, clamp(vUv + vec2(0.0, texel.y), 0.0, 1.0)).rgb;
                vec3 n4 = texture2D(tDiffuse, clamp(vUv - vec2(0.0, texel.y), 0.0, 1.0)).rgb;
                vec3 avgN = 0.25 * (n1 + n2 + n3 + n4);
                float detail = clamp(luma(col) - luma(avgN), -0.09, 0.09);
                col = max(vec3(0.0), col + detail * uClarity * 1.35 * focalWeight);
            }

            // Subtle organic Meiji film warmth in mid-highlights + gentle lens vignette
            col.r *= (1.0 + uWarmth * 0.45);
            col.b *= (1.0 - uWarmth * 0.35);

            float vig = 1.0 - smoothstep(0.28, 0.82, length(centered)) * uVignette;
            col *= vig;

            gl_FragColor = vec4(col, 1.0);
        }
    `
};

const BLOOM_PHASE_SETTINGS = {
    DAWN:     { strength: 0.24, radius: 0.45, threshold: 0.88, exposure: 1.08, clarity: 0.15, warmth: 0.06,  vignette: 0.20 },
    DAY:      { strength: 0.16, radius: 0.36, threshold: 0.94, exposure: 1.05, clarity: 0.16, warmth: 0.025, vignette: 0.18 },
    TWILIGHT: { strength: 0.32, radius: 0.52, threshold: 0.80, exposure: 1.12, clarity: 0.14, warmth: 0.075, vignette: 0.24 },
    NIGHT:    { strength: 0.38, radius: 0.58, threshold: 0.76, exposure: 1.18, clarity: 0.12, warmth: 0.04,  vignette: 0.28 },
    STORM:    { strength: 0.25, radius: 0.48, threshold: 0.78, exposure: 0.84, clarity: 0.14, warmth: -0.09, vignette: 0.36 }
};

/**
 * Manages the Three.js WebGL2 MSAA EffectComposer pipeline:
 * RenderPass -> UnrealBloomPass -> PhotorealLensShader -> OutputPass.
 * Loads three/addons post-processing dynamically in browsers and gracefully
 * degrades to direct renderer.render() in Node test environments.
 */
export class PostProcessingPipeline {
    constructor(renderer, scene, camera, options = {}) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.preset = options.preset || 'ultra';
        this.tiltShiftEnabled = options.tiltShiftEnabled !== false;
        this.ready = false;
        this.disposed = false;
        this._initPromise = null;
        this.composer = null;
        this.renderTarget = null;
        this.renderPass = null;
        this.bloomPass = null;
        this.lensPass = null;
        this.outputPass = null;
        this.width = options.width || 1280;
        this.height = options.height || 720;
        this.pixelRatio = options.pixelRatio || 1;
        this.currentPhase = 'DAY';
        this.currentStorm = false;
    }

    async init() {
        if (this.ready) return true;
        if (this._initPromise) return this._initPromise;
        if (
            this.disposed ||
            typeof window === 'undefined' ||
            typeof WebGLRenderingContext === 'undefined' ||
            !this.renderer ||
            typeof this.renderer.getContext !== 'function'
        ) {
            return false;
        }

        this._initPromise = (async () => {
            try {
                const [
                    { EffectComposer },
                    { RenderPass },
                    { UnrealBloomPass },
                    { ShaderPass },
                    { OutputPass }
                ] = await Promise.all([
                    import('three/addons/postprocessing/EffectComposer.js'),
                    import('three/addons/postprocessing/RenderPass.js'),
                    import('three/addons/postprocessing/UnrealBloomPass.js'),
                    import('three/addons/postprocessing/ShaderPass.js'),
                    import('three/addons/postprocessing/OutputPass.js')
                ]);

                if (this.disposed) return false;

                const gl = this.renderer.getContext();
                const isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
                const samples = (isWebGL2 && this.preset === 'ultra') ? 4 : 0;

                const rtParams = {
                    type: THREE.HalfFloatType || THREE.UnsignedByteType,
                    minFilter: THREE.LinearFilter,
                    magFilter: THREE.LinearFilter
                };
                if (samples > 0) {
                    rtParams.samples = samples;
                }

                const bufW = Math.max(1, Math.floor(this.width * this.pixelRatio));
                const bufH = Math.max(1, Math.floor(this.height * this.pixelRatio));
                this.renderTarget = new THREE.WebGLRenderTarget(bufW, bufH, rtParams);

                this.composer = new EffectComposer(this.renderer, this.renderTarget);
                this.composer.setPixelRatio(this.pixelRatio);
                this.composer.setSize(this.width, this.height);

                this.renderPass = new RenderPass(this.scene, this.camera);
                this.composer.addPass(this.renderPass);

                const cfg = BLOOM_PHASE_SETTINGS[this.currentPhase] || BLOOM_PHASE_SETTINGS.DAY;
                this.bloomPass = new UnrealBloomPass(
                    new THREE.Vector2(this.width, this.height),
                    cfg.strength,
                    cfg.radius,
                    cfg.threshold
                );
                this.composer.addPass(this.bloomPass);

                this.lensPass = new ShaderPass(PhotorealLensShader);
                this.lensPass.uniforms.uResolution.value.set(bufW, bufH);
                this.lensPass.uniforms.uTiltShiftStrength.value = this.tiltShiftEnabled ? 0.22 : 0.0;
                this.composer.addPass(this.lensPass);

                this.outputPass = new OutputPass();
                this.composer.addPass(this.outputPass);

                this.ready = true;
                this.setPhase(this.currentPhase, this.currentStorm);
                this.setPreset(this.preset);
                return true;
            } catch {
                this.ready = false;
                return false;
            } finally {
                this._initPromise = null;
            }
        })();

        return this._initPromise;
    }

    setPhase(phaseKey = 'DAY', isStorm = false) {
        this.currentPhase = phaseKey;
        this.currentStorm = !!isStorm;
        const key = isStorm ? 'STORM' : (BLOOM_PHASE_SETTINGS[phaseKey] ? phaseKey : 'DAY');
        const cfg = BLOOM_PHASE_SETTINGS[key];

        if (this.renderer && typeof this.renderer.toneMappingExposure === 'number') {
            this.renderer.toneMappingExposure = cfg.exposure;
        }
        if (this.bloomPass) {
            this.bloomPass.strength = cfg.strength;
            this.bloomPass.radius = cfg.radius;
            this.bloomPass.threshold = cfg.threshold;
        }
        if (this.lensPass && this.lensPass.uniforms) {
            this.lensPass.uniforms.uClarity.value = cfg.clarity;
            this.lensPass.uniforms.uWarmth.value = cfg.warmth;
            this.lensPass.uniforms.uVignette.value = cfg.vignette ?? 0.22;
            this.lensPass.uniforms.uTiltShiftStrength.value = this.tiltShiftEnabled ? 0.22 : 0.0;
        }
    }

    setTiltShift(enabled) {
        this.tiltShiftEnabled = !!enabled;
        if (this.lensPass && this.lensPass.uniforms) {
            this.lensPass.uniforms.uTiltShiftStrength.value = this.tiltShiftEnabled ? 0.22 : 0.0;
        }
    }

    setPreset(preset = 'ultra') {
        this.preset = preset;
        if (this.bloomPass) {
            this.bloomPass.enabled = preset !== 'off';
        }
        if (this.lensPass) {
            this.lensPass.enabled = preset !== 'off';
        }
    }

    resize(width, height, pixelRatio = 1) {
        this.width = Math.max(1, width);
        this.height = Math.max(1, height);
        this.pixelRatio = Math.max(1, pixelRatio);

        if (!this.ready || !this.composer) return;
        this.composer.setPixelRatio(this.pixelRatio);
        this.composer.setSize(this.width, this.height);

        const bufW = Math.max(1, Math.floor(this.width * this.pixelRatio));
        const bufH = Math.max(1, Math.floor(this.height * this.pixelRatio));
        if (this.lensPass && this.lensPass.uniforms) {
            this.lensPass.uniforms.uResolution.value.set(bufW, bufH);
        }
        if (this.bloomPass && typeof this.bloomPass.setSize === 'function') {
            this.bloomPass.setSize(this.width, this.height);
        }
    }

    render() {
        if (this.ready && this.composer && this.preset !== 'off') {
            this.composer.render();
        } else if (this.renderer && typeof this.renderer.render === 'function') {
            this.renderer.render(this.scene, this.camera);
        }
    }

    dispose() {
        this.disposed = true;
        this.ready = false;
        if (this.bloomPass && typeof this.bloomPass.dispose === 'function') {
            this.bloomPass.dispose();
        }
        if (this.outputPass && typeof this.outputPass.dispose === 'function') {
            this.outputPass.dispose();
        }
        if (this.lensPass && typeof this.lensPass.dispose === 'function') {
            this.lensPass.dispose();
        }
        if (this.renderTarget && typeof this.renderTarget.dispose === 'function') {
            this.renderTarget.dispose();
        }
        if (this.composer && typeof this.composer.dispose === 'function') {
            this.composer.dispose();
        }
        this.composer = null;
        this.renderTarget = null;
    }
}
