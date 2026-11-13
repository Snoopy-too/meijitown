import * as THREE from 'three';

const PHASE_ENV_CONFIG = {
    DAWN: {
        zenith: 0x3b5882,
        midSky: 0x9b7e8a,
        horizon: 0xf4ae78,
        ground: 0x3d3328,
        sunColor: 0xffc68a,
        sunStrength: 3.4,
        hemiIntensity: 1.15
    },
    DAY: {
        zenith: 0x3f79b8,
        midSky: 0x7fb5e2,
        horizon: 0xd6e8f2,
        ground: 0x4b533b,
        sunColor: 0xfff7e6,
        sunStrength: 2.8,
        hemiIntensity: 1.2
    },
    TWILIGHT: {
        zenith: 0x161f3d,
        midSky: 0x5b3b62,
        horizon: 0xd96b43,
        ground: 0x29211d,
        sunColor: 0xff8f52,
        sunStrength: 2.6,
        hemiIntensity: 0.95
    },
    NIGHT: {
        zenith: 0x050914,
        midSky: 0x0c1528,
        horizon: 0x1a2844,
        ground: 0x0c0e14,
        sunColor: 0x9dbbff,
        sunStrength: 1.35,
        hemiIntensity: 0.72
    },
    STORM: {
        zenith: 0x1e2833,
        midSky: 0x394552,
        horizon: 0x5d6a75,
        ground: 0x262b24,
        sunColor: 0xaab8c4,
        sunStrength: 0.85,
        hemiIntensity: 1.0
    }
};

function canCreatePMREM(renderer) {
    return (
        typeof THREE.PMREMGenerator === 'function' &&
        typeof THREE.ShaderMaterial === 'function' &&
        typeof THREE.SphereGeometry === 'function' &&
        renderer &&
        typeof renderer.getContext === 'function'
    );
}

/**
 * Generates procedural sky/sun/ground Image-Based Lighting (PMREM) cubemaps
 * cached per atmospheric phase so PBR roofs, water, brass, and glass receive
 * accurate physical sky & warm horizon reflections without external HDR assets.
 */
export class EnvironmentIBL {
    constructor(renderer, scene) {
        this.renderer = renderer;
        this.scene = scene;
        this.supported = canCreatePMREM(renderer);
        this.pmremGenerator = null;
        this.cache = new Map();
        this.currentKey = null;
        this.envScene = null;
        this.domeMaterial = null;
        this.sunDisc = null;
        this.sunMat = null;
        this.bounceDisc = null;
        this.bounceMat = null;
        this.envHemi = null;
        this._tempDir = new THREE.Vector3(0.4, 0.75, 0.35);

        if (this.supported) {
            try {
                this.pmremGenerator = new THREE.PMREMGenerator(renderer);
                if (typeof this.pmremGenerator.compileEquirectangularShader === 'function') {
                    this.pmremGenerator.compileEquirectangularShader();
                }
                this._buildEnvScene();
            } catch {
                this.supported = false;
                this.pmremGenerator = null;
            }
        }
    }

    _buildEnvScene() {
        this.envScene = new THREE.Scene();

        this.domeMaterial = new THREE.ShaderMaterial({
            side: THREE.BackSide,
            depthWrite: false,
            uniforms: {
                uZenith: { value: new THREE.Color(0x3f79b8) },
                uMidSky: { value: new THREE.Color(0x7fb5e2) },
                uHorizon: { value: new THREE.Color(0xd6e8f2) },
                uGround: { value: new THREE.Color(0x4b533b) },
                uSunDir: { value: new THREE.Vector3(0.4, 0.75, 0.35).normalize() },
                uSunGlow: { value: new THREE.Color(0xfff7e6) },
                uSunStrength: { value: 2.8 }
            },
            vertexShader: `
                varying vec3 vWorldDir;
                void main() {
                    vWorldDir = normalize(position);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 uZenith;
                uniform vec3 uMidSky;
                uniform vec3 uHorizon;
                uniform vec3 uGround;
                uniform vec3 uSunDir;
                uniform vec3 uSunGlow;
                uniform float uSunStrength;
                varying vec3 vWorldDir;

                void main() {
                    vec3 d = normalize(vWorldDir);
                    float y = d.y;
                    vec3 col;
                    if (y >= 0.0) {
                        float lowBand = smoothstep(0.0, 0.24, y);
                        float highBand = smoothstep(0.20, 0.92, y);
                        col = mix(uHorizon, uMidSky, lowBand);
                        col = mix(col, uZenith, highBand);
                    } else {
                        float gBand = smoothstep(0.0, -0.35, y);
                        col = mix(uHorizon * 0.72, uGround, gBand);
                    }

                    // Broad atmospheric Mie glow + crisp solar specular hotspot for PBR reflections
                    float sunDot = max(dot(d, normalize(uSunDir)), 0.0);
                    float mieHalo = pow(sunDot, 12.0) * 0.45 * uSunStrength;
                    float coreSpec = smoothstep(0.9965, 0.9994, sunDot) * 9.0 * uSunStrength;
                    col += uSunGlow * (mieHalo + coreSpec);

                    gl_FragColor = vec4(col, 1.0);
                }
            `
        });

        const dome = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 20), this.domeMaterial);
        this.envScene.add(dome);

        // Warm opposing horizon bounce card so shaded eaves get gentle sky warmth
        this.bounceMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
        this.bounceDisc = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), this.bounceMat);
        this.envScene.add(this.bounceDisc);

        this.envHemi = new THREE.HemisphereLight(0xffffff, 0x444433, 1.0);
        this.envScene.add(this.envHemi);
    }

    /**
     * Generates or retrieves the cached PMREM cubemap for the active phase and binds it
     * to scene.environment.
     */
    setPhase(phaseKey = 'DAY', isStorm = false, sunPos = null) {
        if (!this.supported || !this.pmremGenerator || !this.envScene) return;

        const key = isStorm ? 'STORM' : (PHASE_ENV_CONFIG[phaseKey] ? phaseKey : 'DAY');
        if (this.currentKey === key && this.cache.has(key)) {
            const target = this.cache.get(key);
            if (this.scene.environment !== target.texture) {
                this.scene.environment = target.texture;
            }
            return;
        }

        if (this.cache.has(key)) {
            const cached = this.cache.get(key);
            this.scene.environment = cached.texture;
            this.currentKey = key;
            return;
        }

        const cfg = PHASE_ENV_CONFIG[key];
        const u = this.domeMaterial.uniforms;
        u.uZenith.value.setHex(cfg.zenith);
        u.uMidSky.value.setHex(cfg.midSky);
        u.uHorizon.value.setHex(cfg.horizon);
        u.uGround.value.setHex(cfg.ground);
        u.uSunGlow.value.setHex(cfg.sunColor);
        u.uSunStrength.value = cfg.sunStrength;

        if (sunPos && typeof sunPos.x === 'number') {
            this._tempDir.set(sunPos.x, Math.max(4, sunPos.y), sunPos.z).normalize();
        } else {
            this._tempDir.set(0.45, key === 'TWILIGHT' || key === 'DAWN' ? 0.3 : 0.78, 0.35).normalize();
        }
        u.uSunDir.value.copy(this._tempDir);

        // Place subtle warm horizon bounce card opposite the sun
        this.bounceDisc.position.set(-this._tempDir.x * 12, 2.5, -this._tempDir.z * 12);
        this.bounceDisc.lookAt(0, 0, 0);
        this.bounceMat.color.setHex(cfg.horizon).multiplyScalar(key === 'NIGHT' ? 0.55 : 0.95);
        this.envHemi.color.setHex(cfg.midSky);
        this.envHemi.groundColor.setHex(cfg.ground);
        this.envHemi.intensity = cfg.hemiIntensity;

        try {
            const pmremRT = this.pmremGenerator.fromScene(this.envScene, 0.035);
            this.cache.set(key, pmremRT);
            this.scene.environment = pmremRT.texture;
            this.currentKey = key;
        } catch {
            // Leave existing lighting intact if PMREM generation fails on constrained GPUs
        }
    }

    /**
     * Releases all cached PMREM textures and internal scene resources.
     */
    dispose() {
        for (const rt of this.cache.values()) {
            if (rt && typeof rt.dispose === 'function') {
                rt.dispose();
            }
        }
        this.cache.clear();
        if (this.domeMaterial && typeof this.domeMaterial.dispose === 'function') {
            this.domeMaterial.dispose();
        }
        if (this.bounceMat && typeof this.bounceMat.dispose === 'function') {
            this.bounceMat.dispose();
        }
        if (this.envScene && typeof this.envScene.traverse === 'function') {
            this.envScene.traverse((obj) => {
                if (obj.geometry && typeof obj.geometry.dispose === 'function') {
                    obj.geometry.dispose();
                }
            });
        }
        if (this.pmremGenerator && typeof this.pmremGenerator.dispose === 'function') {
            this.pmremGenerator.dispose();
        }
        if (this.scene) {
            this.scene.environment = null;
        }
        this.pmremGenerator = null;
        this.supported = false;
    }
}
