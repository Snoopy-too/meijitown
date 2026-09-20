// Project Meiji - Dynamic Placement Service Radius Preview (serviceRadiusPreview.js)
// ponytail: instanced circular Three.js ring geometry for civic reach (< 100 lines)

import * as THREE from 'three';
import { CONFIG } from '../config.js';

export const CIVIC_SERVICE_RADII = {
    [CONFIG.TOOLS.WELL]: { radius: 5, color: 0x3498db, category: 'water' },        // Soft Cerulean
    [CONFIG.TOOLS.WATCHTOWER]: { radius: 6, color: 0xe74c3c, category: 'fire' },   // Vermilion
    [CONFIG.TOOLS.KOBAN]: { radius: 7, color: 0xd9534f, category: 'order' },       // Vermilion / Carmine
    [CONFIG.TOOLS.SCHOOL]: { radius: 8, color: 0xf1c40f, category: 'education' },   // Gold
    [CONFIG.TOOLS.SHRINE_PARK]: { radius: 4, color: 0xf39c12, category: 'culture' },// Gold / Amber
    [CONFIG.TOOLS.SENTO]: { radius: 5, color: 0x3498db, category: 'water' },
    [CONFIG.TOOLS.OCHAYA]: { radius: 6, color: 0xf39c12, category: 'culture' },
    [CONFIG.TOOLS.FIRE_DEPOT]: { radius: 10, color: 0xe74c3c, category: 'fire' },
    [CONFIG.TOOLS.WATERWORKS]: { radius: 18, color: 0x2980b9, category: 'water' }
};

export class ServiceRadiusPreview {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.currentTool = null;
        this.currentRadius = 0;
        this.currentColor = 0;
    }

    createMesh(radiusTiles, hexColor) {
        this.dispose();
        const worldRadius = radiusTiles * CONFIG.TILE_SIZE;
        const innerRadius = Math.max(0, worldRadius - 0.25);
        const geo = new THREE.RingGeometry(innerRadius, worldRadius, 64);
        geo.rotateX(-Math.PI / 2);

        const mat = new THREE.MeshBasicMaterial({
            color: hexColor,
            transparent: true,
            opacity: 0.45,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.y = 0.035;
        this.mesh.visible = false;
        this.scene.add(this.mesh);

        this.currentRadius = radiusTiles;
        this.currentColor = hexColor;
    }

    update(tileCoord, toolType, footprint = { w: 1, h: 1 }) {
        if (!tileCoord || !toolType) {
            this.hide();
            return;
        }

        const config = CIVIC_SERVICE_RADII[toolType];
        if (!config) {
            this.hide();
            return;
        }

        if (!this.mesh || this.currentRadius !== config.radius || this.currentColor !== config.color) {
            this.createMesh(config.radius, config.color);
        }

        const centerPos = {
            x: (tileCoord.x + footprint.w / 2) * CONFIG.TILE_SIZE,
            z: (tileCoord.y + footprint.h / 2) * CONFIG.TILE_SIZE
        };

        this.mesh.position.set(centerPos.x, 0.035, centerPos.z);
        this.mesh.visible = true;
        this.currentTool = toolType;
    }

    hide() {
        if (this.mesh) {
            this.mesh.visible = false;
        }
        this.currentTool = null;
    }

    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) this.mesh.material.dispose();
            this.mesh = null;
        }
        this.currentTool = null;
        this.currentRadius = 0;
        this.currentColor = 0;
    }
}
