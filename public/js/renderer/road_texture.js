// Project Meiji - Procedural Road Textures & Materials (Ishidatami)
// ponytail: offscreen canvas normal map generator (zero image assets) & cached standard materials

import * as THREE from 'three';
import { CONFIG } from '../config.js';

let cachedNormalTexture = null;
let cachedStoneRoadMat = null;
let cachedStoneKerbMat = null;
let cachedStoneShoulderMat = null;
let cachedDirtRoadMat = null;
let cachedDirtShoulderMat = null;

export class RoadTextureManager {
    /**
     * Generates a 256x256 flagstone (Ishidatami) normal map via offscreen canvas.
     * Staggered granite block masonry with beveled edges and mineral grain.
     */
    static getFlagstoneNormalMap() {
        if (cachedNormalTexture) return cachedNormalTexture;

        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx || typeof ctx.createImageData !== 'function') return null;
        const imgData = ctx.createImageData(size, size);
        const data = imgData.data;

        // Grid parameters: 4 rows, 2 columns per row with alternating 0.5 offset
        const rows = 4;
        const cols = 2;
        const rowHeight = size / rows;
        const colWidth = size / cols;
        const bevelSize = 4; // pixels for joint bevel

        for (let y = 0; y < size; y++) {
            const row = Math.floor(y / rowHeight);
            const yInRow = y % rowHeight;
            const xOffset = (row % 2 === 1) ? (colWidth * 0.5) : 0;

            for (let x = 0; x < size; x++) {
                const adjustedX = (x + xOffset) % size;
                const xInCol = adjustedX % colWidth;

                // Distance to nearest stone edge
                const distLeft = xInCol;
                const distRight = colWidth - xInCol;
                const distTop = yInRow;
                const distBottom = rowHeight - yInRow;
                const minDist = Math.min(distLeft, distRight, distTop, distBottom);

                let nx = 0;
                let ny = 0;
                let nz = 1;

                if (minDist <= 1) {
                    // Deep indented mortar joint
                    nx = 0;
                    ny = 0;
                    nz = 0.4;
                } else if (minDist < bevelSize) {
                    // Beveled stone perimeter
                    const t = minDist / bevelSize;
                    if (minDist === distLeft) nx = -(1 - t);
                    else if (minDist === distRight) nx = (1 - t);

                    if (minDist === distTop) ny = (1 - t);
                    else if (minDist === distBottom) ny = -(1 - t);

                    nz = Math.sqrt(Math.max(0.1, 1 - (nx * nx + ny * ny)));
                } else {
                    // Flat stone face with subtle granite mineral surface noise
                    const noise = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
                    nx = (noise - 0.5) * 0.12;
                    ny = ((noise * 1.7) % 1 - 0.5) * 0.12;
                    nz = Math.sqrt(Math.max(0.1, 1 - (nx * nx + ny * ny)));
                }

                // Normalize vector
                const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
                nx /= len;
                ny /= len;
                nz /= len;

                // Tangent space normal map encoding: [-1, 1] -> [0, 255]
                const idx = (y * size + x) * 4;
                data[idx] = Math.floor((nx * 0.5 + 0.5) * 255);     // R
                data[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255); // G
                data[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255); // B
                data[idx + 3] = 255;                                // A
            }
        }

        ctx.putImageData(imgData, 0, 0);

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
        cachedNormalTexture = texture;
        return texture;
    }

    static getStoneRoadMaterial() {
        if (!cachedStoneRoadMat) {
            cachedStoneRoadMat = new THREE.MeshStandardMaterial({
                color: CONFIG.COLORS.STONE_ROAD || 0x8e8b82,
                roughness: CONFIG.COLORS.STONE_ROAD_ROUGHNESS || 0.85,
                metalness: 0.05,
                normalMap: RoadTextureManager.getFlagstoneNormalMap(),
                normalScale: new THREE.Vector2(0.65, 0.65),
            });
        }
        return cachedStoneRoadMat;
    }

    static getStoneKerbMaterial() {
        if (!cachedStoneKerbMat) {
            cachedStoneKerbMat = new THREE.MeshStandardMaterial({
                color: CONFIG.COLORS.STONE_ROAD_BORDER || 0x6e6b65,
                roughness: 0.85,
                metalness: 0.05,
            });
        }
        return cachedStoneKerbMat;
    }

    static getStoneShoulderMaterial() {
        if (!cachedStoneShoulderMat) {
            cachedStoneShoulderMat = new THREE.MeshStandardMaterial({
                color: CONFIG.COLORS.STONE_ROAD_SHOULDER || 0x6e6b65,
                roughness: 0.85,
                metalness: 0.05,
            });
        }
        return cachedStoneShoulderMat;
    }

    static getDirtRoadMaterial() {
        if (!cachedDirtRoadMat) {
            cachedDirtRoadMat = new THREE.MeshLambertMaterial({
                color: CONFIG.COLORS.ROAD || 0x7c6348,
            });
        }
        return cachedDirtRoadMat;
    }

    static getDirtShoulderMaterial() {
        if (!cachedDirtShoulderMat) {
            cachedDirtShoulderMat = new THREE.MeshLambertMaterial({
                color: CONFIG.COLORS.ROAD_SHOULDER || 0x6e5840,
            });
        }
        return cachedDirtShoulderMat;
    }
}
