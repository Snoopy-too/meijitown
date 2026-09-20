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

    // Attach dynamic fire and smoke to a burning tile
    attachFire(key, worldX, worldZ) {
        if (this.fireEmitters.has(key)) return;

        const group = new THREE.Group();
        group.position.set(worldX, 0, worldZ);

        // Core flame light
        const fireLight = new THREE.PointLight(0xff6600, 2.5, 6.0);
        fireLight.position.set(0, 1.2, 0);
        group.add(fireLight);

        // Flame meshes
        const flameGeo = new THREE.ConeGeometry(0.35, 1.1, 5);
        flameGeo.rotateX(Math.PI);
        const flameMat = new THREE.MeshBasicMaterial({ color: 0xff4500 });
        const flame1 = new THREE.Mesh(flameGeo, flameMat);
        flame1.position.set(0, 0.6, 0);
        group.add(flame1);

        const flame2 = new THREE.Mesh(flameGeo, new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
        flame2.position.set(0.2, 0.5, -0.15);
        flame2.scale.set(0.75, 0.85, 0.75);
        group.add(flame2);

        this.scene.add(group);
        this.fireEmitters.set(key, { group, fireLight, flame1, flame2 });
    }

    detachFire(key) {
        if (!this.fireEmitters.has(key)) return;
        const entry = this.fireEmitters.get(key);
        this.scene.remove(entry.group);
        this.fireEmitters.delete(key);
    }

    update(delta = 0.016) {
        // 1. Update demolition and smoke particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= delta;

            p.mesh.position.addScaledVector(p.velocity, delta);

            if (p.isSmoke) {
                // Smoke drifts up and expands
                p.mesh.scale.multiplyScalar(1 + delta * 1.1);
                p.mesh.material.opacity = Math.max(0, (p.life / p.maxLife) * 0.7);
            } else {
                // Demolition dust falls with gravity
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

        // 2. Animate fire flicker
        const time = performance.now() * 0.008;
        for (const [_, entry] of this.fireEmitters.entries()) {
            const flicker = Math.sin(time * 3 + entry.group.position.x) * 0.3 + 0.7;
            entry.fireLight.intensity = 2.0 + flicker * 1.5;
            entry.flame1.scale.y = 1.0 + flicker * 0.35;
            entry.flame2.scale.y = 0.8 + Math.cos(time * 4) * 0.3;
        }

        // 3. Smoke particle emission from burning structures
        this.smokeTimer = (this.smokeTimer || 0) + delta;
        if (this.smokeTimer > 0.09 && this.fireEmitters.size > 0) {
            this.smokeTimer = 0;
            const smokeGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
            for (const [_, entry] of this.fireEmitters.entries()) {
                const wx = entry.group.position.x;
                const wz = entry.group.position.z;

                const smokeMat = new THREE.MeshLambertMaterial({
                    color: 0x292421,
                    transparent: true,
                    opacity: 0.7
                });
                const smokeMesh = new THREE.Mesh(smokeGeo, smokeMat);
                smokeMesh.position.set(
                    wx + (Math.random() - 0.5) * 0.3,
                    0.8 + Math.random() * 0.3,
                    wz + (Math.random() - 0.5) * 0.3
                );
                this.scene.add(smokeMesh);
                this.particles.push({
                    mesh: smokeMesh,
                    velocity: new THREE.Vector3(
                        (Math.random() - 0.5) * 0.25,
                        1.1 + Math.random() * 0.7,
                        (Math.random() - 0.5) * 0.25
                    ),
                    life: 1.2,
                    maxLife: 1.2,
                    isSmoke: true
                });
            }
        }
    }
}
