// Project Meiji - Raycast & Screen-to-Grid Coordinate Conversion
// ponytail: single invisible plane raycast with clamped grid coordinates

import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class RaycastManager {
    constructor(scene) {
        this.scene = scene;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2(-999, -999);

        // Invisible 2D ground collision plane at y = 0 for spatial intersection
        const totalSizeX = CONFIG.GRID_WIDTH * CONFIG.TILE_SIZE;
        const totalSizeZ = CONFIG.GRID_HEIGHT * CONFIG.TILE_SIZE;
        const planeGeo = new THREE.PlaneGeometry(totalSizeX, totalSizeZ);
        planeGeo.rotateX(-Math.PI / 2);
        const planeMat = new THREE.MeshBasicMaterial({ visible: false });
        this.planeMesh = new THREE.Mesh(planeGeo, planeMat);
        this.planeMesh.position.set(totalSizeX / 2, 0, totalSizeZ / 2);
        this.scene.add(this.planeMesh);
        this.raycastPlane = this.planeMesh; // backward-compatibility alias
    }

    raycastTile(screenX, screenY, camera, domElement, grid) {
        const rect = domElement.getBoundingClientRect();
        this.mouse.x = ((screenX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((screenY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, camera);
        const intersects = this.raycaster.intersectObject(this.planeMesh);

        if (intersects.length > 0) {
            const hit = intersects[0].point;
            const tileX = Math.floor(hit.x / CONFIG.TILE_SIZE);
            const tileY = Math.floor(hit.z / CONFIG.TILE_SIZE);

            if (grid.isValidCoord(tileX, tileY)) {
                return { x: tileX, y: tileY, hitPoint: hit };
            }
        }
        return null;
    }
}
