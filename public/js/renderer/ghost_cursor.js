// Project Meiji - 3D Architectural Ghost Placement Indicator & Survey Cartouche (ghost_cursor.js)
// Phase 3 /artisan: Blueprint Wireframe Gable Silhouette, Corner Survey Brackets & Entrance Chevron (< 200 lines)

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { getFootprint } from '../footprintPreview.js';
import { ServiceRadiusPreview } from './serviceRadiusPreview.js';

export class GhostCursorManager {
    constructor(scene) {
        this.scene = scene;
        const s = CONFIG.TILE_SIZE;

        // 1. Base tile cursor footprint pad + 4 brass/emerald survey corner brackets
        const cursorGeo = new THREE.BoxGeometry(s, 0.08, s);
        const cursorMat = new THREE.MeshBasicMaterial({
            color: 0x2ecc71,
            transparent: true,
            opacity: 0.45,
            depthWrite: false
        });
        this.cursorBox = new THREE.Mesh(cursorGeo, cursorMat);
        this.cursorBox.visible = false;

        this.wireMat = new THREE.LineBasicMaterial({ color: 0xa8ffdb, transparent: true, opacity: 0.85 });
        const baseEdges = new THREE.LineSegments(new THREE.EdgesGeometry(cursorGeo), this.wireMat);
        this.cursorBox.add(baseEdges);

        const bracketMat = new THREE.MeshBasicMaterial({ color: 0xf5d76e, transparent: true, opacity: 0.90, depthWrite: false });
        const cornerOff = s * 0.46;
        for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.14, 0.10), bracketMat);
            post.position.set(cx * cornerOff, 0.04, cz * cornerOff);
            this.cursorBox.add(post);
        }
        this.scene.add(this.cursorBox);

        // 2. 3D Translucent Architectural Ghost Preview (Wall Core + Pitched Gable Roof + Wireframe)
        const ghostGeo = new THREE.BoxGeometry(s * 0.85, 0.8, s * 0.85);
        this.ghostMat = new THREE.MeshLambertMaterial({
            color: 0x2ecc71,
            transparent: true,
            opacity: 0.45,
            depthWrite: false
        });
        this.ghostMesh = new THREE.Mesh(ghostGeo, this.ghostMat);
        this.ghostMesh.visible = false;

        const bodyWire = new THREE.LineSegments(new THREE.EdgesGeometry(ghostGeo), this.wireMat);
        this.ghostMesh.add(bodyWire);

        // Architectural eave skirt & pitched gable roof prism (hidden for flat road/canal/paddy tools)
        this.archCrownGroup = new THREE.Group();
        const eaveGeo = new THREE.BoxGeometry(s * 0.96, 0.06, s * 0.96);
        const eaveMesh = new THREE.Mesh(eaveGeo, this.ghostMat);
        eaveMesh.position.set(0, 0.42, 0);
        this.archCrownGroup.add(eaveMesh);

        const roofPrismGeo = new THREE.CylinderGeometry(0.02, s * 0.62, s * 0.88, 4, 1);
        roofPrismGeo.rotateY(Math.PI / 4);
        roofPrismGeo.rotateZ(Math.PI / 2);
        roofPrismGeo.scale(1.0, 0.42, 1.0);
        const roofMesh = new THREE.Mesh(roofPrismGeo, this.ghostMat);
        roofMesh.position.set(0, 0.56, 0);
        const roofWire = new THREE.LineSegments(new THREE.EdgesGeometry(roofPrismGeo), this.wireMat);
        roofMesh.add(roofWire);
        this.archCrownGroup.add(roofMesh);
        this.ghostMesh.add(this.archCrownGroup);

        // 3. Directional Entrance Threshold & Forward Chevron Cartouche on front edge (+Z)
        const markerGeo = new THREE.BoxGeometry(s * 0.65, 0.22, 0.14);
        this.markerMat = new THREE.MeshLambertMaterial({
            color: 0x39ff14,
            transparent: true,
            opacity: 0.95,
            depthWrite: false
        });
        this.dirMarker = new THREE.Mesh(markerGeo, this.markerMat);
        this.dirMarker.position.set(0, 0.32, (s * 0.85) / 2 - 0.04);

        // Forward-pointing entrance arrow chevron attached to dirMarker
        const chevronGeo = new THREE.ConeGeometry(0.24, 0.28, 3);
        chevronGeo.rotateX(Math.PI / 2);
        const chevronMesh = new THREE.Mesh(chevronGeo, this.markerMat);
        chevronMesh.position.set(0, -0.18, 0.20);
        this.dirMarker.add(chevronMesh);

        this.ghostMesh.add(this.dirMarker);
        this.scene.add(this.ghostMesh);

        // 4. Dynamic Civic Service Reach Radius Preview
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

        this.cursorBox.scale.set(w, 1, h);
        this.cursorBox.position.set(centerPos.x, 0.04, centerPos.z);
        this.cursorBox.visible = true;

        const activeColor = isValid ? 0x2ecc71 : 0xe74c3c;
        const activeOpacity = isValid ? 0.45 : 0.55;
        this.cursorBox.material.color.setHex(activeColor);
        this.cursorBox.material.opacity = activeOpacity;
        if (this.wireMat && this.wireMat.color) {
            const wireCol = isValid ? 0xa8ffdb : 0xff948a;
            if (typeof this.wireMat.color.setHex === 'function') {
                this.wireMat.color.setHex(wireCol);
            } else {
                this.wireMat.color = wireCol;
            }
        }

        if (toolType && toolType !== CONFIG.TOOLS.INSPECT) {
            this.ghostMesh.visible = true;
            this.ghostMat.color.setHex(activeColor);
            this.ghostMat.opacity = activeOpacity;
            this.ghostMesh.rotation.y = (rotation % 4) * (Math.PI / 2);
            if (this.markerMat) {
                this.markerMat.color.setHex(isValid ? 0x39ff14 : 0xe74c3c);
                this.markerMat.opacity = 0.95;
            }

            const isLinearOrFlat = toolType === CONFIG.TOOLS.ROAD || toolType === CONFIG.TOOLS.STONE_ROAD || toolType === CONFIG.TOOLS.CANAL || toolType === CONFIG.TOOLS.RAIL_TRACK || toolType === CONFIG.TOOLS.BULLDOZER || toolType === CONFIG.TOOLS.RICE_PADDY;
            if (this.dirMarker) this.dirMarker.visible = !isLinearOrFlat;
            if (this.archCrownGroup) this.archCrownGroup.visible = !isLinearOrFlat;

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

        this.serviceRadiusPreview.update(tileCoord, toolType, { w, h });
    }
}
