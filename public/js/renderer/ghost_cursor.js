// Project Meiji - 3D Ghost Placement Indicator & Cursor Manager
// ponytail: translucent preview mesh (y + 0.05) with #2ECC71 green / #E74C3C red tint & service radius rings

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { getFootprint } from '../footprintPreview.js';

import { ServiceRadiusPreview } from './serviceRadiusPreview.js';

export class GhostCursorManager {
    constructor(scene) {
        this.scene = scene;

        // Base tile cursor outline/box
        const cursorGeo = new THREE.BoxGeometry(CONFIG.TILE_SIZE, 0.08, CONFIG.TILE_SIZE);
        const cursorMat = new THREE.MeshBasicMaterial({
            color: 0x2ecc71,
            transparent: true,
            opacity: 0.45,
            depthWrite: false
        });
        this.cursorBox = new THREE.Mesh(cursorGeo, cursorMat);
        this.cursorBox.visible = false;
        this.scene.add(this.cursorBox);

        // 3D Translucent Ghost Placement Preview Mesh (y + 0.05)
        const ghostGeo = new THREE.BoxGeometry(CONFIG.TILE_SIZE * 0.85, 0.8, CONFIG.TILE_SIZE * 0.85);
        this.ghostMat = new THREE.MeshLambertMaterial({
            color: 0x2ecc71,
            transparent: true,
            opacity: 0.45,
            depthWrite: false
        });
        this.ghostMesh = new THREE.Mesh(ghostGeo, this.ghostMat);
        this.ghostMesh.visible = false;

        // Directional Facing Marker on front edge (+Z)
        const markerGeo = new THREE.BoxGeometry(CONFIG.TILE_SIZE * 0.65, 0.22, 0.14);
        this.markerMat = new THREE.MeshLambertMaterial({
            color: 0xffdf59,
            transparent: true,
            opacity: 0.85,
            depthWrite: false
        });
        this.dirMarker = new THREE.Mesh(markerGeo, this.markerMat);
        this.dirMarker.position.set(0, 0.32, (CONFIG.TILE_SIZE * 0.85) / 2 - 0.04);
        this.ghostMesh.add(this.dirMarker);

        this.scene.add(this.ghostMesh);

        // Dynamic Civic Service Reach Radius Preview
        this.serviceRadiusPreview = new ServiceRadiusPreview(this.scene);

        this.currentTool = CONFIG.TOOLS.INSPECT;
    }

    update(tileCoord, toolType, isValid = true, worldPosFn = null, rotation = 0) {
        this.currentTool = toolType;

        if (!tileCoord) {
            this.cursorBox.visible = false;
            this.ghostMesh.visible = false;
            this.serviceRadiusPreview.hide();
            return;
        }

        const { w, h } = getFootprint(toolType, rotation);
        const centerPos = {
            x: (tileCoord.x + w / 2) * CONFIG.TILE_SIZE,
            z: (tileCoord.y + h / 2) * CONFIG.TILE_SIZE
        };

        // Position & scale base cursor footprint box
        this.cursorBox.scale.set(w, 1, h);
        this.cursorBox.position.set(centerPos.x, 0.04, centerPos.z);
        this.cursorBox.visible = true;

        // Validity color & opacity: #2ECC71 (0.45) green or #E74C3C (0.55) red
        const activeColor = isValid ? 0x2ecc71 : 0xe74c3c;
        const activeOpacity = isValid ? 0.45 : 0.55;
        this.cursorBox.material.color.setHex(activeColor);
        this.cursorBox.material.opacity = activeOpacity;

        // 3D Ghost Placement Indicator (Active when tool is not Survey/Inspect)
        if (toolType && toolType !== CONFIG.TOOLS.INSPECT) {
            this.ghostMesh.visible = true;
            this.ghostMat.color.setHex(activeColor);
            this.ghostMat.opacity = activeOpacity;
            this.ghostMesh.rotation.y = (rotation % 4) * (Math.PI / 2);

            const isLinearOrFlat = toolType === CONFIG.TOOLS.ROAD || toolType === CONFIG.TOOLS.STONE_ROAD || toolType === CONFIG.TOOLS.CANAL || toolType === CONFIG.TOOLS.RAIL_TRACK || toolType === CONFIG.TOOLS.BULLDOZER || toolType === CONFIG.TOOLS.RICE_PADDY;
            if (this.dirMarker) this.dirMarker.visible = !isLinearOrFlat;

            if (toolType === CONFIG.TOOLS.ROAD || toolType === CONFIG.TOOLS.STONE_ROAD) {
                this.ghostMesh.scale.set(1.0, 0.12, 1.0);
                this.ghostMesh.position.set(centerPos.x, 0.10, centerPos.z);
            } else if (toolType === CONFIG.TOOLS.RICE_PADDY) {
                this.ghostMesh.scale.set(1.0, 0.15, 1.0);
                this.ghostMesh.position.set(centerPos.x, 0.11, centerPos.z);
            } else if (toolType === CONFIG.TOOLS.BULLDOZER) {
                this.ghostMesh.scale.set(1.0, 0.25, 1.0);
                this.ghostMesh.position.set(centerPos.x, 0.15, centerPos.z);
            } else if (toolType === CONFIG.TOOLS.WATCHTOWER) {
                this.ghostMesh.scale.set(0.6, 2.2, 0.6);
                this.ghostMesh.position.set(centerPos.x, 0.95, centerPos.z);
            } else if (w >= 3 && h >= 3) {
                this.ghostMesh.scale.set(2.8, 1.8, 2.8);
                this.ghostMesh.position.set(centerPos.x, 0.95, centerPos.z);
            } else if (w >= 2 && h >= 2) {
                this.ghostMesh.scale.set(1.9, toolType === CONFIG.TOOLS.HARBOR_PIER ? 0.6 : 1.4, 1.9);
                this.ghostMesh.position.set(centerPos.x, 0.65, centerPos.z);
            } else if (w >= 2 || h >= 2) {
                this.ghostMesh.scale.set(w * 0.9, 0.8, h * 0.9);
                this.ghostMesh.position.set(centerPos.x, 0.45, centerPos.z);
            } else {
                this.ghostMesh.scale.set(0.9, 1.2, 0.9);
                this.ghostMesh.position.set(centerPos.x, 0.55, centerPos.z);
            }
        } else {
            this.ghostMesh.visible = false;
        }

        // Dynamic Civic Service Radius Preview Hook
        this.serviceRadiusPreview.update(tileCoord, toolType, { w, h });
    }
}
