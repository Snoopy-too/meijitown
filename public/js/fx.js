// Project Meiji - Particle FX Engine
// ponytail: Three.js particle systems & backward-compatible audio re-export

import * as THREE from 'three';
import { SOUND, AudioManager, audioManager } from './audioManager.js';

export { SOUND, AudioManager as SoundSynthesizer, AudioManager, audioManager };

export class ParticleManager {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.fireEmitters = new Map(); // key -> group
    }

    // Spawns Machi-Hikeshi firefighting water spray/droplets
    spawnWaterSplash(worldX, worldZ) {
        const count = 20;
        const geo = new THREE.BoxGeometry(0.09, 0.09, 0.09);
        const colors = [0x5bc0de, 0xffffff, 0x8be9fd, 0xd0f4f7];

        for (let i = 0; i < count; i++) {
            const mat = new THREE.MeshLambertMaterial({
                color: colors[i % colors.length],
                transparent: true,
                opacity: 0.9
            });
            const mesh = new THREE.Mesh(geo, mat);
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
        const geo = new THREE.DodecahedronGeometry(0.18, 0);

        for (let i = 0; i < count; i++) {
            const mat = new THREE.MeshLambertMaterial({
                color: 0xf5f8fa,
                transparent: true,
                opacity: 0.75
            });
            const mesh = new THREE.Mesh(geo, mat);
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
        const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
        const colors = [0x8a7050, 0xd4c8b8, 0x5a4632, 0x6e6255];

        for (let i = 0; i < count; i++) {
            const mat = new THREE.MeshLambertMaterial({
                color: colors[i % colors.length],
                transparent: true,
                opacity: 0.95
            });
            const mesh = new THREE.Mesh(geo, mat);
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

        // Multi-tiered upward-licking organic flame tongues (NO upside-down cones!)
        const flames = [];
        const tongueConfigs = [
            { x: 0.00, y: 0.55, z: 0.00, r: 0.26, h: 0.95, color: 0xff3b00, speed: 4.2, phase: 0.0 },
            { x: -0.22, y: 0.48, z: 0.16, r: 0.20, h: 0.78, color: 0xff5500, speed: 5.1, phase: 1.3 },
            { x: 0.24, y: 0.50, z: -0.14, r: 0.21, h: 0.82, color: 0xff4500, speed: 4.7, phase: 2.5 },
            { x: -0.14, y: 0.46, z: -0.22, r: 0.18, h: 0.70, color: 0xff6a00, speed: 5.6, phase: 3.8 },
            { x: 0.15, y: 0.52, z: 0.20, r: 0.19, h: 0.74, color: 0xff7700, speed: 4.9, phase: 4.9 },
            // Inner bright golden-amber & white-hot cores
            { x: 0.02, y: 0.58, z: 0.02, r: 0.16, h: 0.80, color: 0xffaa00, speed: 6.2, phase: 0.7 },
            { x: -0.10, y: 0.52, z: 0.08, r: 0.13, h: 0.65, color: 0xffcc22, speed: 6.8, phase: 2.1 },
            { x: 0.00, y: 0.45, z: 0.00, r: 0.11, h: 0.52, color: 0xfff0aa, speed: 7.5, phase: 1.1 }
        ];

        for (const cfg of tongueConfigs) {
            const tGeo = new THREE.ConeGeometry(cfg.r, cfg.h, 7, 2);
            const tMat = new THREE.MeshBasicMaterial({
                color: cfg.color,
                transparent: true,
                opacity: 0.90
            });
            const mesh = new THREE.Mesh(tGeo, tMat);
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
        this.fireEmitters.delete(key);
    }

    update(delta = 0.016, speedMult = 1, tileMeshes = null, month = 1) {
        // 1. Update demolition, ember, and smoke particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= delta;

            p.mesh.position.addScaledVector(p.velocity, delta);

            if (p.isSmoke) {
                p.mesh.scale.multiplyScalar(1 + delta * 1.15);
                p.mesh.rotation.y += delta * 0.8;
                p.mesh.material.opacity = Math.max(0, (p.life / p.maxLife) * 0.65);
            } else if (p.isEmber) {
                p.mesh.position.x += Math.sin(p.life * 10) * delta * 0.4;
                p.mesh.material.opacity = Math.max(0, p.life / p.maxLife);
            } else if (p.isFoliage) {
                p.mesh.position.x += Math.sin(p.life * 2.4 + p.seed) * delta * 0.5 + delta * 0.35;
                p.mesh.position.z += Math.cos(p.life * 1.9 + p.seed) * delta * 0.4 + delta * 0.25;
                p.mesh.rotation.x += delta * 1.8;
                p.mesh.rotation.y += delta * 1.4;
                p.mesh.rotation.z += delta * 1.6;
                p.mesh.material.opacity = Math.min(0.9, (p.life / p.maxLife) * 1.4);
                if (p.mesh.position.y <= 0.04) p.life = 0;
            } else {
                p.velocity.y -= 9.8 * delta;
                const progress = p.life / p.maxLife;
                p.mesh.material.opacity = Math.max(0, progress);
                p.mesh.scale.setScalar(Math.max(0.01, progress));
            }

            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
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
                    f.scale.set(1.0 + cosWave * 0.18, 0.85 + (wave * 0.5 + 0.5) * 0.45, 1.0 - cosWave * 0.15);
                    f.rotation.z = wave * 0.18;
                    f.rotation.x = cosWave * 0.16;
                    f.rotation.y += delta * 1.5;
                }
            }
        }

        // 3. Billowing smoke puffs & glowing ember sparks from burning structures
        this.smokeTimer = (this.smokeTimer || 0) + delta;
        if (this.smokeTimer > 0.08 && this.fireEmitters.size > 0) {
            this.smokeTimer = 0;
            const smokeGeo = new THREE.DodecahedronGeometry(0.16, 0);
            const emberSparkGeo = new THREE.BoxGeometry(0.045, 0.045, 0.045);
            for (const [_, entry] of this.fireEmitters.entries()) {
                const wx = entry.group.position.x;
                const wz = entry.group.position.z;

                const smokeMat = new THREE.MeshLambertMaterial({
                    color: Math.random() > 0.35 ? 0x262220 : 0x3d3530,
                    transparent: true,
                    opacity: 0.65
                });
                const smokeMesh = new THREE.Mesh(smokeGeo, smokeMat);
                smokeMesh.position.set(
                    wx + (Math.random() - 0.5) * 0.45,
                    0.95 + Math.random() * 0.35,
                    wz + (Math.random() - 0.5) * 0.45
                );
                this.scene.add(smokeMesh);
                this.particles.push({
                    mesh: smokeMesh,
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
                    const sparkMat = new THREE.MeshBasicMaterial({
                        color: Math.random() > 0.5 ? 0xffaa00 : 0xff4500,
                        transparent: true,
                        opacity: 0.95
                    });
                    const sparkMesh = new THREE.Mesh(emberSparkGeo, sparkMat);
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
                        const puffGeo = new THREE.DodecahedronGeometry(0.12, 0);
                        const puffMat = new THREE.MeshLambertMaterial({
                            color: Math.random() > 0.4 ? 0x4a4745 : 0xd8dbde,
                            transparent: true,
                            opacity: 0.55
                        });
                        const puffMesh = new THREE.Mesh(puffGeo, puffMat);
                        puffMesh.position.set(wp.x + (Math.random() - 0.5) * 0.1, wp.y + 0.08, wp.z + (Math.random() - 0.5) * 0.1);
                        this.scene.add(puffMesh);
                        this.particles.push({
                            mesh: puffMesh,
                            velocity: new THREE.Vector3(
                                (Math.random() - 0.35) * 0.25 + 0.15,
                                0.95 + Math.random() * 0.45,
                                (Math.random() - 0.5) * 0.25
                            ),
                            life: 1.6,
                            maxLife: 1.6,
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
                let pGeo = null;
                if (isSpring) {
                    const springColors = [0xf7c4cb, 0xffe6ea, 0xf2b6c1, 0xffffff];
                    pColor = springColors[Math.floor(Math.random() * springColors.length)];
                    pGeo = new THREE.BoxGeometry(0.065, 0.015, 0.045);
                } else if (isAutumn) {
                    const autumnColors = [0xd94e28, 0xc0392b, 0xe67e22, 0xb83b26];
                    pColor = autumnColors[Math.floor(Math.random() * autumnColors.length)];
                    pGeo = new THREE.DodecahedronGeometry(0.045, 0);
                } else {
                    pColor = 0xf4f7fa;
                    pGeo = new THREE.BoxGeometry(0.035, 0.035, 0.035);
                }

                const fMat = new THREE.MeshBasicMaterial({ color: pColor, transparent: true, opacity: 0.85 });
                const fMesh = new THREE.Mesh(pGeo, fMat);
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
