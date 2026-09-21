// Project Meiji - Stylized Drifting Clouds & Sky Canopy (cloudManager.js)
// ponytail: low-poly clustered cloud puffs, continuous drift wrapping & atmospheric tinting (< 180 lines)

import * as THREE from 'three';

export class CloudManager {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.group.name = 'cloud_canopy';

        this.clouds = [];
        this.material = new THREE.MeshLambertMaterial({
            color: 0xf7f4ed,
            flatShading: true,
            transparent: true,
            opacity: 0.88
        });

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
        const puffGeo = new THREE.DodecahedronGeometry(1, 0); // 12-sided low-poly polyhedron

        // 4 to 6 overlapping puffs with varied scale and position
        const puffCount = 4 + Math.floor(Math.random() * 3);
        for (let i = 0; i < puffCount; i++) {
            const puff = new THREE.Mesh(puffGeo, this.material);
            const scaleX = 2.8 + Math.random() * 2.2;
            const scaleY = 1.2 + Math.random() * 0.9;
            const scaleZ = 2.0 + Math.random() * 1.8;
            puff.scale.set(scaleX, scaleY, scaleZ);

            puff.position.set(
                (i - puffCount / 2) * 2.4 + (Math.random() - 0.5) * 1.5,
                (Math.random() - 0.5) * 0.8,
                (Math.random() - 0.5) * 2.0
            );
            puff.rotation.set(Math.random() * 0.3, Math.random() * Math.PI, 0);
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

    update(delta = 0.016, speedMultiplier = 1, isStormActive = false) {
        const rate = Math.max(0.2, speedMultiplier);
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

        this.applyAtmosphericTint();
    }

    updateDayNight(month) {
        const phaseIndex = (month - 1) % 4;
        if (phaseIndex === 0) this.currentPhase = 'DAWN';
        else if (phaseIndex === 1) this.currentPhase = 'DAY';
        else if (phaseIndex === 2) this.currentPhase = 'TWILIGHT';
        else if (phaseIndex === 3) this.currentPhase = 'NIGHT';

        this.applyAtmosphericTint();
    }

    applyAtmosphericTint() {
        if (!this.material) return;

        if (this.isStorm) {
            // Dark charcoal storm clouds
            this.material.color.setHex(0x3e4247);
            this.material.opacity = 0.95;
            return;
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
