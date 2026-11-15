// Project Meiji - Stylized Drifting Clouds & Sky Canopy (cloudManager.js)
// ponytail: low-poly clustered cloud puffs, continuous drift wrapping & atmospheric tinting (< 180 lines)

import * as THREE from 'three';

export class CloudManager {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.group.name = 'cloud_canopy';

        this.clouds = [];
        this.material = new THREE.MeshStandardMaterial({
            color: 0xf7f4ed,
            roughness: 0.96,
            metalness: 0.0,
            envMapIntensity: 0.58,
            flatShading: false,
            transparent: true,
            opacity: 0.86,
            depthWrite: false
        });
        if (typeof THREE.ShaderMaterial === 'function') {
            this.material.customProgramCacheKey = () => 'meiji_soft_cloud_v1';
            this.material.onBeforeCompile = (shader) => {
                shader.vertexShader = shader.vertexShader
                    .replace(
                        '#include <common>',
                        `#include <common>
                        varying vec3 vCloudLocalPos;
                        varying vec3 vCloudViewNormal;`
                    )
                    .replace(
                        '#include <begin_vertex>',
                        `#include <begin_vertex>
                        vCloudLocalPos = position;
                        vCloudViewNormal = normalize(normalMatrix * objectNormal);`
                    );
                shader.fragmentShader = shader.fragmentShader
                    .replace(
                        '#include <common>',
                        `#include <common>
                        varying vec3 vCloudLocalPos;
                        varying vec3 vCloudViewNormal;`
                    )
                    .replace(
                        '#include <color_fragment>',
                        `#include <color_fragment>
                        // Volumetric height gradient: luminous silver crest, softly shaded blue-grey base
                        float hNorm = clamp(vCloudLocalPos.y * 0.55 + 0.55, 0.0, 1.0);
                        diffuseColor.rgb *= mix(0.74, 1.12, smoothstep(0.1, 0.92, hNorm));`
                    )
                    .replace(
                        '#include <dithering_fragment>',
                        `#include <dithering_fragment>
                        // Soft grazing-edge cloud billow fade so spheres merge organically without hard rims
                        float edgeFade = pow(clamp(abs(normalize(vCloudViewNormal).z) * 0.78 + 0.22, 0.0, 1.0), 1.4);
                        gl_FragColor.a *= edgeFade;`
                    );
            };
        }

        this.currentPhase = 'DAY';
        this.isStorm = false;

        this.spawnClouds(10);
        this.scene.add(this.group);
    }

    static init(scene) {
        return new CloudManager(scene);
    }

    createCloudCluster() {
        const cloudGroup = new THREE.Group();
        const puffGeo = (typeof THREE.SphereGeometry === 'function')
            ? new THREE.SphereGeometry(1, 14, 10)
            : new THREE.DodecahedronGeometry(1, 0);

        // 5 to 8 overlapping soft volumetric billows with varied scale and flat bottom cumulus posture
        const puffCount = 5 + Math.floor(Math.random() * 4);
        for (let i = 0; i < puffCount; i++) {
            const puff = new THREE.Mesh(puffGeo, this.material);
            const scaleX = 2.6 + Math.random() * 2.4;
            const scaleY = 1.0 + Math.random() * 1.1;
            const scaleZ = 2.0 + Math.random() * 2.0;
            puff.scale.set(scaleX, scaleY, scaleZ);

            puff.position.set(
                (i - puffCount / 2) * 2.1 + (Math.random() - 0.5) * 1.6,
                (Math.random() - 0.35) * 0.9,
                (Math.random() - 0.5) * 2.2
            );
            puff.rotation.set(0, Math.random() * Math.PI, 0);
            puff.userData = { isBackdrop: true, ignoreRaycast: true };
            cloudGroup.add(puff);
        }

        cloudGroup.userData = { isBackdrop: true, ignoreRaycast: true };
        return cloudGroup;
    }

    spawnClouds(count = 10) {
        for (let i = 0; i < count; i++) {
            const mesh = this.createCloudCluster();

            // Spread across [X: -50..120, Z: -40..110] at elevations Y: 46..62
            const x = -50 + Math.random() * 170;
            const y = 46 + Math.random() * 16;
            const z = -40 + Math.random() * 150;

            mesh.position.set(x, y, z);
            this.group.add(mesh);

            this.clouds.push({
                mesh,
                speed: 1.8 + Math.random() * 1.6, // Drift speed units/sec
                baseY: y,
                wobbleOffset: Math.random() * Math.PI * 2
            });
        }
    }

    update(delta = 0.016, speedMultiplier = 1, isStormActive = false, lightningFlash = 0.0) {
        const rate = Math.max(0.2, speedMultiplier) * (isStormActive ? 3.0 : 1.0);
        this.isStorm = !!isStormActive;

        const minX = -65;
        const maxX = 135;

        for (const c of this.clouds) {
            // Translate along wind vector (towards East +X with subtle +Z angle)
            c.mesh.position.x += c.speed * rate * delta;
            c.mesh.position.z += (c.speed * 0.15) * rate * delta;

            // Subtle vertical float
            c.wobbleOffset += delta * 0.5;
            c.mesh.position.y = c.baseY + Math.sin(c.wobbleOffset) * 0.6;

            // Wrap around seamlessly
            if (c.mesh.position.x > maxX) {
                c.mesh.position.x = minX;
                c.mesh.position.z = -30 + Math.random() * 130;
                c.baseY = 46 + Math.random() * 16;
            }
        }

        this.applyAtmosphericTint(lightningFlash);
    }

    updateDayNight(month) {
        const phaseIndex = (month - 1) % 4;
        if (phaseIndex === 0) this.currentPhase = 'DAWN';
        else if (phaseIndex === 1) this.currentPhase = 'DAY';
        else if (phaseIndex === 2) this.currentPhase = 'TWILIGHT';
        else if (phaseIndex === 3) this.currentPhase = 'NIGHT';

        this.applyAtmosphericTint(0);
    }

    applyAtmosphericTint(lightningFlash = 0.0) {
        if (!this.material) return;

        if (this.isStorm) {
            // Dark charcoal storm clouds with brief lightning illumination
            this.material.color.setHex(0x3e4247);
            this.material.opacity = 0.96;
            if (this.material.emissive && typeof this.material.emissive.setHex === 'function') {
                const flash = Math.max(0, Number(lightningFlash) || 0);
                this.material.emissive.setHex(flash > 0.01 ? 0x6e88a6 : 0x000000);
                this.material.emissiveIntensity = flash * 0.9;
            }
            return;
        }
        if (this.material.emissive && typeof this.material.emissive.setHex === 'function') {
            this.material.emissive.setHex(0x000000);
            this.material.emissiveIntensity = 0.0;
        }

        switch (this.currentPhase) {
            case 'DAWN':
                this.material.color.setHex(0xffe6d6); // Rosy sunrise peach
                this.material.opacity = 0.88;
                break;
            case 'TWILIGHT':
                this.material.color.setHex(0xf5b57f); // Golden amber dusk
                this.material.opacity = 0.85;
                break;
            case 'NIGHT':
                this.material.color.setHex(0x36334a); // Deep moonlight navy/indigo
                this.material.opacity = 0.75;
                break;
            case 'DAY':
            default:
                this.material.color.setHex(0xf7f4ed); // Warm historical parchment off-white
                this.material.opacity = 0.88;
                break;
        }
    }
}
