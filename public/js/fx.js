// Project Meiji - Particle FX Engine
// ponytail: Three.js particle systems & backward-compatible audio re-export

import * as THREE from 'three';
import { SOUND, AudioManager, audioManager } from './audioManager.js';
import { PBRTextureGenerator } from './renderer/pbrTextureGenerator.js';

export { SOUND, AudioManager as SoundSynthesizer, AudioManager, audioManager };

export class ParticleManager {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.fireEmitters = new Map(); // key -> group
    }

    _makeSoftSprite(kind, colorHex, baseScale, opacity = 0.8, additive = false) {
        const tex = PBRTextureGenerator.getParticleTexture(kind);
        if (tex && typeof THREE.Sprite === 'function' && typeof THREE.SpriteMaterial === 'function') {
            const mat = new THREE.SpriteMaterial({
                map: tex,
                color: colorHex,
                transparent: true,
                opacity,
                depthWrite: false,
                ...(additive ? { blending: THREE.AdditiveBlending } : {})
            });
            const sprite = new THREE.Sprite(mat);
            sprite.scale.set(baseScale, baseScale, 1);
            return sprite;
        }
        return null;
    }

    // Spawns Machi-Hikeshi firefighting water spray/droplets
    spawnWaterSplash(worldX, worldZ) {
        const count = 20;
        const geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
        const colors = [0x6fd4ec, 0xffffff, 0x99eeff, 0xd8f8fc];

        for (let i = 0; i < count; i++) {
            const c = colors[i % colors.length];
            let mesh = this._makeSoftSprite('spark', c, 0.16, 0.9, false);
            if (!mesh) {
                const mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.2, transparent: true, opacity: 0.9 });
                mesh = new THREE.Mesh(geo, mat);
            }
            mesh.position.set(
                worldX + (Math.random() - 0.5) * 0.6,
                0.8 + Math.random() * 0.4,
                worldZ + (Math.random() - 0.5) * 0.6
            );

            const speed = 1.5 + Math.random() * 2.0;
            const angle = Math.random() * Math.PI * 2;
            const velocity = new THREE.Vector3(
                Math.cos(angle) * speed,
                2.5 + Math.random() * 2.0,
                Math.sin(angle) * speed
            );

            this.scene.add(mesh);
            this.particles.push({
                mesh,
                baseScale: mesh.isSprite ? 0.16 : 1.0,
                velocity,
                life: 0.55,
                maxLife: 0.55,
                isSmoke: false
            });
        }
    }

    // Spawns white water/steam particle burst when extinguishing fires
    spawnWaterSteam(worldX, worldZ) {
        this.spawnWaterSplash(worldX, worldZ);
        const count = 12;
        const geo = new THREE.SphereGeometry(0.16, 6, 5);

        for (let i = 0; i < count; i++) {
            let mesh = this._makeSoftSprite('smoke', 0xf5f8fa, 0.42, 0.72, false);
            if (!mesh) {
                const mat = new THREE.MeshStandardMaterial({ color: 0xf5f8fa, roughness: 0.95, transparent: true, opacity: 0.75 });
                mesh = new THREE.Mesh(geo, mat);
            }
            mesh.position.set(
                worldX + (Math.random() - 0.5) * 0.5,
                0.6 + Math.random() * 0.4,
                worldZ + (Math.random() - 0.5) * 0.5
            );

            this.scene.add(mesh);
            this.particles.push({
                mesh,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.6,
                    1.4 + Math.random() * 0.8,
                    (Math.random() - 0.5) * 0.6
                ),
                life: 1.5,
                maxLife: 1.5,
                isSmoke: true
            });
        }
    }

    // Spawns bursting demolition dust/wood chips
    spawnDemolishPuff(worldX, worldZ) {
        const count = 16;
        const geo = new THREE.BoxGeometry(0.11, 0.11, 0.11);
        const colors = [0x8a7050, 0xd4c8b8, 0x5a4632, 0x6e6255];

        for (let i = 0; i < count; i++) {
            const c = colors[i % colors.length];
            let mesh = (i % 3 === 0) ? this._makeSoftSprite('smoke', c, 0.34, 0.78, false) : null;
            if (!mesh) {
                const mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, transparent: true, opacity: 0.95 });
                mesh = new THREE.Mesh(geo, mat);
            }
            mesh.position.set(
                worldX + (Math.random() - 0.5) * 0.8,
                0.3 + Math.random() * 0.5,
                worldZ + (Math.random() - 0.5) * 0.8
            );

            const speed = 1.8 + Math.random() * 2.2;
            const angle = Math.random() * Math.PI * 2;
            const velocity = new THREE.Vector3(
                Math.cos(angle) * speed,
                2.0 + Math.random() * 2.5,
                Math.sin(angle) * speed
            );

            this.scene.add(mesh);
            this.particles.push({
                mesh,
                velocity,
                life: 0.6,
                maxLife: 0.6
            });
        }
    }

    // Attach dynamic multi-layered fire, embers, and smoke to a burning tile
    attachFire(key, worldX, worldZ) {
        if (this.fireEmitters.has(key)) return;

        const group = new THREE.Group();
        group.position.set(worldX, 0, worldZ);

        // Warm flickering firelight
        const fireLight = new THREE.PointLight(0xff5500, 2.8, 7.5);
        fireLight.position.set(0, 1.35, 0);
        group.add(fireLight);

        // Glowing ember bed at base of structure
        const emberGeo = new THREE.DodecahedronGeometry(0.42, 1);
        emberGeo.scale(1.2, 0.25, 1.2);
        const emberMat = new THREE.MeshBasicMaterial({ color: 0xcc2900 });
        const emberBed = new THREE.Mesh(emberGeo, emberMat);
        emberBed.position.set(0, 0.22, 0);
        group.add(emberBed);

        // Multi-tiered soft billowing additive fire sprites (no hard cone silhouettes!)
        const flames = [];
        const tongueConfigs = [
            { x: 0.00, y: 0.65, z: 0.00, r: 0.34, h: 1.05, color: 0xff4500, speed: 4.2, phase: 0.0 },
            { x: -0.22, y: 0.56, z: 0.16, r: 0.26, h: 0.85, color: 0xff6200, speed: 5.1, phase: 1.3 },
            { x: 0.24, y: 0.58, z: -0.14, r: 0.28, h: 0.90, color: 0xff5200, speed: 4.7, phase: 2.5 },
            { x: -0.14, y: 0.54, z: -0.22, r: 0.24, h: 0.78, color: 0xff7818, speed: 5.6, phase: 3.8 },
            { x: 0.15, y: 0.60, z: 0.20, r: 0.25, h: 0.82, color: 0xff8424, speed: 4.9, phase: 4.9 },
            // Inner bright golden-amber & white-hot luminous cores
            { x: 0.02, y: 0.64, z: 0.02, r: 0.22, h: 0.82, color: 0xffb328, speed: 6.2, phase: 0.7 },
            { x: -0.10, y: 0.58, z: 0.08, r: 0.18, h: 0.68, color: 0xffd54a, speed: 6.8, phase: 2.1 },
            { x: 0.00, y: 0.52, z: 0.00, r: 0.16, h: 0.58, color: 0xfff3bc, speed: 7.5, phase: 1.1 }
        ];

        for (const cfg of tongueConfigs) {
            let mesh = this._makeSoftSprite('flame', cfg.color, 1.0, 0.92, true);
            if (mesh) {
                mesh.scale.set(cfg.r * 2.5, cfg.h * 1.15, 1.0);
                cfg.baseScaleX = cfg.r * 2.5;
                cfg.baseScaleY = cfg.h * 1.15;
            } else {
                const tGeo = new THREE.ConeGeometry(cfg.r, cfg.h, 7, 2);
                const tMat = new THREE.MeshBasicMaterial({
                    color: cfg.color,
                    transparent: true,
                    opacity: 0.90
                });
                mesh = new THREE.Mesh(tGeo, tMat);
                cfg.baseScaleX = 1.0;
                cfg.baseScaleY = 1.0;
            }
            mesh.position.set(cfg.x, cfg.y, cfg.z);
            mesh.userData = cfg;
            group.add(mesh);
            flames.push(mesh);
        }

        const flame1 = flames[0];
        const flame2 = flames[5];
        this.scene.add(group);
        this.fireEmitters.set(key, { group, fireLight, flame1, flame2, flames });
    }

    detachFire(key) {
        if (!this.fireEmitters.has(key)) return;
        const entry = this.fireEmitters.get(key);
        this.scene.remove(entry.group);
        if (entry.group?.traverse) {
            entry.group.traverse((c) => {
                c.geometry?.dispose?.();
                c.material?.dispose?.();
            });
        }
        this.fireEmitters.delete(key);
    }

    update(delta = 0.016, speedMult = 1, tileMeshes = null, month = 1) {
        // 1. Update demolition, ember, and smoke particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= delta;

            p.mesh.position.addScaledVector(p.velocity, delta);

            if (p.isSmoke) {
                if (typeof p.mesh.scale?.multiplyScalar === 'function') {
                    p.mesh.scale.multiplyScalar(1 + delta * 1.12);
                }
                if (!p.mesh.isSprite) {
                    p.mesh.rotation.y += delta * 0.8;
                }
                p.mesh.material.opacity = Math.max(0, (p.life / p.maxLife) * (p.initialOpacity || 0.65));
            } else if (p.isEmber) {
                p.mesh.position.x += Math.sin(p.life * 10) * delta * 0.4;
                p.mesh.material.opacity = Math.max(0, p.life / p.maxLife);
            } else if (p.isFoliage) {
                p.mesh.position.x += Math.sin(p.life * 2.4 + p.seed) * delta * 0.5 + delta * 0.35;
                p.mesh.position.z += Math.cos(p.life * 1.9 + p.seed) * delta * 0.4 + delta * 0.25;
                if (!p.mesh.isSprite) {
                    p.mesh.rotation.x += delta * 1.8;
                    p.mesh.rotation.y += delta * 1.4;
                    p.mesh.rotation.z += delta * 1.6;
                }
                p.mesh.material.opacity = Math.min(0.9, (p.life / p.maxLife) * 1.4);
                if (p.mesh.position.y <= 0.04) p.life = 0;
            } else {
                p.velocity.y -= 9.8 * delta;
                const progress = Math.max(0, p.life / p.maxLife);
                p.mesh.material.opacity = progress;
                const bScale = p.baseScale || 1.0;
                p.mesh.scale.set(bScale * Math.max(0.05, progress), bScale * Math.max(0.05, progress), bScale);
            }

            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                if (p.mesh.geometry) p.mesh.geometry.dispose();
                if (p.mesh.material) p.mesh.material.dispose();
                this.particles.splice(i, 1);
            }
        }

        // 2. Animate multi-tongue organic fire flicker & sway
        const time = performance.now() * 0.008;
        for (const [_, entry] of this.fireEmitters.entries()) {
            const flicker = Math.sin(time * 3.5 + entry.group.position.x) * 0.3 + 0.7;
            entry.fireLight.intensity = 2.2 + flicker * 1.4;
            if (entry.flames) {
                for (const f of entry.flames) {
                    const cfg = f.userData;
                    const wave = Math.sin(time * cfg.speed + cfg.phase);
                    const cosWave = Math.cos(time * (cfg.speed * 0.85) + cfg.phase);
                    const bx = cfg.baseScaleX || 1.0;
                    const by = cfg.baseScaleY || 1.0;
                    f.scale.set(
                        bx * (1.0 + cosWave * 0.16),
                        by * (0.86 + (wave * 0.5 + 0.5) * 0.36),
                        bx * (1.0 - cosWave * 0.14)
                    );
                    if (!f.isSprite) {
                        f.rotation.z = wave * 0.18;
                        f.rotation.x = cosWave * 0.16;
                        f.rotation.y += delta * 1.5;
                    } else {
                        f.position.x = cfg.x + wave * 0.04;
                    }
                }
            }
        }

        // 3. Billowing smoke puffs & glowing ember sparks from burning structures
        this.smokeTimer = (this.smokeTimer || 0) + delta;
        if (this.smokeTimer > 0.08 && this.fireEmitters.size > 0) {
            this.smokeTimer = 0;
            const smokeGeo = new THREE.SphereGeometry(0.14, 6, 5);
            const emberSparkGeo = new THREE.BoxGeometry(0.045, 0.045, 0.045);
            for (const [_, entry] of this.fireEmitters.entries()) {
                const wx = entry.group.position.x;
                const wz = entry.group.position.z;

                const smokeColor = Math.random() > 0.35 ? 0x262220 : 0x3d3530;
                let smokeMesh = this._makeSoftSprite('smoke', smokeColor, 0.44, 0.62, false);
                if (!smokeMesh) {
                    const smokeMat = new THREE.MeshStandardMaterial({ color: smokeColor, roughness: 0.95, transparent: true, opacity: 0.65 });
                    smokeMesh = new THREE.Mesh(smokeGeo, smokeMat);
                }
                smokeMesh.position.set(
                    wx + (Math.random() - 0.5) * 0.45,
                    0.95 + Math.random() * 0.35,
                    wz + (Math.random() - 0.5) * 0.45
                );
                this.scene.add(smokeMesh);
                this.particles.push({
                    mesh: smokeMesh,
                    initialOpacity: 0.62,
                    velocity: new THREE.Vector3(
                        (Math.random() - 0.35) * 0.35,
                        1.25 + Math.random() * 0.75,
                        (Math.random() - 0.5) * 0.35
                    ),
                    life: 1.45,
                    maxLife: 1.45,
                    isSmoke: true
                });

                // Rising orange/gold ember sparks
                if (Math.random() < 0.65) {
                    const sparkCol = Math.random() > 0.5 ? 0xffaa22 : 0xff5212;
                    let sparkMesh = this._makeSoftSprite('spark', sparkCol, 0.14, 0.95, true);
                    if (!sparkMesh) {
                        const sparkMat = new THREE.MeshBasicMaterial({ color: sparkCol, transparent: true, opacity: 0.95 });
                        sparkMesh = new THREE.Mesh(emberSparkGeo, sparkMat);
                    }
                    sparkMesh.position.set(
                        wx + (Math.random() - 0.5) * 0.5,
                        0.55 + Math.random() * 0.4,
                        wz + (Math.random() - 0.5) * 0.5
                    );
                    this.scene.add(sparkMesh);
                    this.particles.push({
                        mesh: sparkMesh,
                        velocity: new THREE.Vector3(
                            (Math.random() - 0.5) * 0.8,
                            1.8 + Math.random() * 1.4,
                            (Math.random() - 0.5) * 0.8
                        ),
                        life: 0.75,
                        maxLife: 0.75,
                        isEmber: true
                    });
                }
            }
        }

        // 4. Ambient Industrial Motion: Waterwheels & Working Smokestacks
        if (tileMeshes && tileMeshes.size > 0) {
            this.ambientTimer = (this.ambientTimer || 0) + delta;
            const shouldEmitStack = this.ambientTimer > 0.24 && this.particles.length < 45;
            if (shouldEmitStack) this.ambientTimer = 0;

            for (const [_, meshGroup] of tileMeshes) {
                if (!meshGroup || !meshGroup.traverse) continue;
                meshGroup.traverse((child) => {
                    if (child.name === 'wheel_hub') {
                        child.rotation.x += delta * (1.6 + (speedMult || 1) * 0.8);
                    }
                    if (shouldEmitStack && child.userData && child.userData.isSmokestack) {
                        const wp = new THREE.Vector3();
                        if (typeof child.getWorldPosition === 'function') {
                            child.getWorldPosition(wp);
                        } else {
                            wp.copy(meshGroup.position);
                            wp.y += (child.userData.stackHeight || 1.8);
                        }
                        const stackColor = Math.random() > 0.4 ? 0x524e4b : 0xdce0e4;
                        let puffMesh = this._makeSoftSprite('smoke', stackColor, 0.34, 0.52, false);
                        if (!puffMesh) {
                            const puffGeo = new THREE.SphereGeometry(0.11, 6, 5);
                            const puffMat = new THREE.MeshStandardMaterial({ color: stackColor, roughness: 0.95, transparent: true, opacity: 0.55 });
                            puffMesh = new THREE.Mesh(puffGeo, puffMat);
                        }
                        puffMesh.position.set(wp.x + (Math.random() - 0.5) * 0.1, wp.y + 0.08, wp.z + (Math.random() - 0.5) * 0.1);
                        this.scene.add(puffMesh);
                        this.particles.push({
                            mesh: puffMesh,
                            initialOpacity: 0.52,
                            velocity: new THREE.Vector3(
                                (Math.random() - 0.35) * 0.25 + 0.15,
                                0.95 + Math.random() * 0.45,
                                (Math.random() - 0.5) * 0.25
                            ),
                            life: 1.65,
                            maxLife: 1.65,
                            isSmoke: true
                        });
                    }
                });
            }
        }

        // 5. Seasonal Drifting Foliage Petals, Momiji Leaves & Winter Snow Flurries
        this.foliageTimer = (this.foliageTimer || 0) + delta;
        if (this.foliageTimer > 0.18 && this.particles.length < 40) {
            this.foliageTimer = 0;
            const isSpring = month >= 3 && month <= 5;
            const isAutumn = month >= 9 && month <= 11;
            const isWinter = month === 12 || month <= 2;

            if (isSpring || isAutumn || isWinter) {
                let pColor = 0xf7c4cb;
                let fMesh = null;
                if (isSpring) {
                    const springColors = [0xf7c4cb, 0xffe6ea, 0xf2b6c1, 0xffffff];
                    pColor = springColors[Math.floor(Math.random() * springColors.length)];
                    const pGeo = new THREE.PlaneGeometry(0.06, 0.04);
                    const fMat = new THREE.MeshBasicMaterial({ color: pColor, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
                    fMesh = new THREE.Mesh(pGeo, fMat);
                } else if (isAutumn) {
                    const autumnColors = [0xd94e28, 0xc0392b, 0xe67e22, 0xb83b26];
                    pColor = autumnColors[Math.floor(Math.random() * autumnColors.length)];
                    const pGeo = new THREE.PlaneGeometry(0.065, 0.055);
                    const fMat = new THREE.MeshBasicMaterial({ color: pColor, side: THREE.DoubleSide, transparent: true, opacity: 0.88 });
                    fMesh = new THREE.Mesh(pGeo, fMat);
                } else {
                    pColor = 0xf4f7fa;
                    fMesh = this._makeSoftSprite('spark', pColor, 0.11, 0.82, false);
                    if (!fMesh) {
                        const pGeo = new THREE.SphereGeometry(0.03, 5, 4);
                        const fMat = new THREE.MeshBasicMaterial({ color: pColor, transparent: true, opacity: 0.85 });
                        fMesh = new THREE.Mesh(pGeo, fMat);
                    }
                }

                fMesh.position.set(
                    Math.random() * 70,
                    10.0 + Math.random() * 6.0,
                    Math.random() * 70
                );
                this.scene.add(fMesh);
                this.particles.push({
                    mesh: fMesh,
                    velocity: new THREE.Vector3(
                        0.25 + Math.random() * 0.35,
                        -(0.55 + Math.random() * 0.45),
                        0.20 + Math.random() * 0.30
                    ),
                    seed: Math.random() * 6.28,
                    life: 8.0,
                    maxLife: 8.0,
                    isFoliage: true
                });
            }
        }
    }
}
