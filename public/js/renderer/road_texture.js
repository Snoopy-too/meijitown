// Project Meiji - Procedural Road Textures & Materials (Ishidatami)
// ponytail: offscreen canvas normal map generator (zero image assets) & cached standard materials

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { PBRTextureGenerator } from './pbrTextureGenerator.js';

let cachedNormalTexture = null;
let cachedDirtNormalTexture = null;
let cachedStoneRoadMat = null;
let cachedStoneKerbMat = null;
let cachedStoneShoulderMat = null;
let cachedDirtRoadMat = null;
let cachedDirtShoulderMat = null;
let cachedGutterWaterMat = null;

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
            const pbr = PBRTextureGenerator.getFlagstoneSet();
            const opts = {
                color: pbr.map ? 0xffffff : (CONFIG.COLORS.STONE_ROAD || 0x8e8b82),
                roughness: CONFIG.COLORS.STONE_ROAD_ROUGHNESS || 0.84,
                metalness: 0.05,
                envMapIntensity: 0.85,
                normalMap: pbr.normalMap || RoadTextureManager.getFlagstoneNormalMap(),
                normalScale: new THREE.Vector2(0.72, 0.72),
            };
            if (pbr.map) opts.map = pbr.map;
            if (pbr.roughnessMap) opts.roughnessMap = pbr.roughnessMap;
            cachedStoneRoadMat = new THREE.MeshStandardMaterial(opts);
            cachedStoneRoadMat.userData = { isSharedLibraryMaterial: true };
        }
        return cachedStoneRoadMat;
    }

    static getStoneKerbMaterial() {
        if (!cachedStoneKerbMat) {
            const stone = PBRTextureGenerator.getStoneSet();
            const opts = {
                color: stone.map ? 0xd2cec4 : (CONFIG.COLORS.STONE_ROAD_BORDER || 0x6e6b65),
                roughness: 0.78,
                metalness: 0.06,
                envMapIntensity: 0.78,
            };
            if (stone.map) opts.map = stone.map;
            if (stone.normalMap) {
                opts.normalMap = stone.normalMap;
                opts.normalScale = new THREE.Vector2(0.45, 0.45);
            }
            if (stone.roughnessMap) opts.roughnessMap = stone.roughnessMap;
            cachedStoneKerbMat = new THREE.MeshStandardMaterial(opts);
            cachedStoneKerbMat.userData = { isSharedLibraryMaterial: true };
        }
        return cachedStoneKerbMat;
    }

    static getStoneShoulderMaterial() {
        if (!cachedStoneShoulderMat) {
            const dirt = PBRTextureGenerator.getDirtRoadSet();
            const opts = {
                color: dirt.map ? 0xafa696 : (CONFIG.COLORS.STONE_ROAD_SHOULDER || 0x6e6b65),
                roughness: 0.90,
                metalness: 0.03,
                envMapIntensity: 0.58,
            };
            if (dirt.map) opts.map = dirt.map;
            if (dirt.normalMap) {
                opts.normalMap = dirt.normalMap;
                opts.normalScale = new THREE.Vector2(0.32, 0.32);
            }
            cachedStoneShoulderMat = new THREE.MeshStandardMaterial(opts);
            cachedStoneShoulderMat.userData = { isSharedLibraryMaterial: true };
        }
        return cachedStoneShoulderMat;
    }

    /**
     * Generates a 128x128 compacted earth & wagon-rut normal map for Meiji dirt roads.
     */
    static getDirtNormalMap() {
        if (cachedDirtNormalTexture) return cachedDirtNormalTexture;
        if (typeof document === 'undefined' || typeof document.createElement !== 'function') return null;

        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx || typeof ctx.createImageData !== 'function') return null;

        const imgData = ctx.createImageData(size, size);
        const data = imgData.data;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const u = x / size;
                // Twin subtle wheel-rut depressions at u = 0.30 and u = 0.70
                const rut1 = (u - 0.30) * Math.exp(-Math.pow((u - 0.30) / 0.08, 2)) * 3.2;
                const rut2 = (u - 0.70) * Math.exp(-Math.pow((u - 0.70) / 0.08, 2)) * 3.2;
                const pebbleX = Math.sin(x * 17.3 + y * 43.7) * 0.18 + Math.cos(x * 31.1 - y * 19.3) * 0.12;
                const pebbleY = Math.cos(x * 23.9 + y * 37.1) * 0.18 + Math.sin(x * 13.7 + y * 29.3) * 0.12;

                let nx = rut1 + rut2 + pebbleX;
                let ny = pebbleY;
                let nz = Math.sqrt(Math.max(0.2, 1.0 - Math.min(0.8, nx * nx + ny * ny)));
                const len = Math.hypot(nx, ny, nz) || 1;

                const idx = (y * size + x) * 4;
                data[idx] = Math.floor(((nx / len) * 0.5 + 0.5) * 255);
                data[idx + 1] = Math.floor(((ny / len) * 0.5 + 0.5) * 255);
                data[idx + 2] = Math.floor(((nz / len) * 0.5 + 0.5) * 255);
                data[idx + 3] = 255;
            }
        }

        ctx.putImageData(imgData, 0, 0);
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        if (texture.repeat) texture.repeat.set(2, 2);
        cachedDirtNormalTexture = texture;
        return texture;
    }

    static getDirtRoadMaterial() {
        if (!cachedDirtRoadMat) {
            const dirt = PBRTextureGenerator.getDirtRoadSet();
            const normalMap = dirt.normalMap || RoadTextureManager.getDirtNormalMap();
            const opts = {
                color: dirt.map ? 0xffffff : (CONFIG.COLORS.ROAD || 0x7c6348),
                roughness: 0.90,
                metalness: 0.02,
                envMapIntensity: 0.60,
            };
            if (dirt.map) opts.map = dirt.map;
            if (dirt.roughnessMap) opts.roughnessMap = dirt.roughnessMap;
            if (normalMap) {
                opts.normalMap = normalMap;
                opts.normalScale = new THREE.Vector2(0.55, 0.55);
            }
            cachedDirtRoadMat = new THREE.MeshStandardMaterial(opts);
            cachedDirtRoadMat.userData = { isSharedLibraryMaterial: true };
        }
        return cachedDirtRoadMat;
    }

    static getDirtShoulderMaterial() {
        if (!cachedDirtShoulderMat) {
            const dirt = PBRTextureGenerator.getDirtRoadSet();
            const opts = {
                color: dirt.map ? 0xc2b096 : (CONFIG.COLORS.ROAD_SHOULDER || 0x6e5840),
                roughness: 0.94,
                metalness: 0.01,
                envMapIntensity: 0.52,
            };
            if (dirt.map) opts.map = dirt.map;
            cachedDirtShoulderMat = new THREE.MeshStandardMaterial(opts);
            cachedDirtShoulderMat.userData = { isSharedLibraryMaterial: true };
        }
        return cachedDirtShoulderMat;
    }

    static getGutterChannelMaterial() {
        if (!cachedGutterWaterMat) {
            const stone = PBRTextureGenerator.getStoneSet();
            const opts = {
                color: 0x263230,
                roughness: 0.24,
                metalness: 0.22,
                envMapIntensity: 1.25,
            };
            if (stone.normalMap) {
                opts.normalMap = stone.normalMap;
                opts.normalScale = new THREE.Vector2(0.28, 0.28);
            }
            cachedGutterWaterMat = new THREE.MeshStandardMaterial(opts);
            cachedGutterWaterMat.userData = { isSharedLibraryMaterial: true };
        }
        return cachedGutterWaterMat;
    }

    static disposeAll() {
        for (const mat of [cachedStoneRoadMat, cachedStoneKerbMat, cachedStoneShoulderMat, cachedDirtRoadMat, cachedDirtShoulderMat, cachedGutterWaterMat]) {
            mat?.dispose?.();
        }
        cachedNormalTexture?.dispose?.();
        cachedDirtNormalTexture?.dispose?.();
        cachedNormalTexture = null;
        cachedDirtNormalTexture = null;
        cachedStoneRoadMat = null;
        cachedStoneKerbMat = null;
        cachedStoneShoulderMat = null;
        cachedDirtRoadMat = null;
        cachedDirtShoulderMat = null;
        cachedGutterWaterMat = null;
    }
}
