// Project Meiji - Map Data Overlays & Heatmap System (overlaySystem.js)
// ponytail: single Three.js InstancedMesh for 0-extra-draw-call heatmaps, reactive color lerping (< 180 lines)

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { OverlayRenderer } from './overlayRenderer.js';

export class OverlaySystem {
    constructor(scene, gridModel, stateManager) {
        this.scene = scene;
        this.grid = gridModel;
        this.state = stateManager;
        this.currentMode = 'none'; // 'none' | 'fire' | 'sanitation' | 'electric' | 'pollution'
        this.simulation = null;

        this.initMesh();
        this.initUI();
    }

    setSimulation(simulation) {
        this.simulation = simulation;
    }

    initMesh() {
        const totalTiles = this.grid.width * this.grid.height;
        const size = CONFIG.TILE_SIZE * 0.96;
        const geometry = new THREE.PlaneGeometry(size, size);
        geometry.rotateX(-Math.PI / 2);

        const material = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0.65,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        this.instancedMesh = new THREE.InstancedMesh(geometry, material, totalTiles);
        this.instancedMesh.position.y = 0.025; // Floating slightly above ground/grid
        this.instancedMesh.visible = false;

        const dummy = new THREE.Object3D();
        const defaultColor = new THREE.Color(0x000000);

        for (let x = 0; x < this.grid.width; x++) {
            for (let y = 0; y < this.grid.height; y++) {
                const idx = y * this.grid.width + x;
                dummy.position.set(
                    (x + 0.5) * CONFIG.TILE_SIZE,
                    0,
                    (y + 0.5) * CONFIG.TILE_SIZE
                );
                dummy.updateMatrix();
                this.instancedMesh.setMatrixAt(idx, dummy.matrix);
                this.instancedMesh.setColorAt(idx, defaultColor);
            }
        }

        this.instancedMesh.instanceMatrix.needsUpdate = true;
        if (this.instancedMesh.instanceColor) {
            this.instancedMesh.instanceColor.needsUpdate = true;
        }

        this.scene.add(this.instancedMesh);
    }

    initUI() {
        this.dom = {
            btnToggle: document.getElementById('btn-layers-toggle'),
            popover: document.getElementById('layer-menu-popover'),
            optionBtns: document.querySelectorAll('.layer-option-btn'),
            radioInputs: document.querySelectorAll('input[name="layer-mode"]')
        };

        if (this.dom.btnToggle && this.dom.popover) {
            this.dom.btnToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = this.dom.popover.style.display === 'none';
                this.dom.popover.style.display = isHidden ? 'flex' : 'none';
                this.dom.btnToggle.classList.toggle('active', isHidden);
            });

            // Close popover when clicking outside
            window.addEventListener('click', (e) => {
                if (this.dom.popover && !this.dom.popover.contains(e.target) && e.target !== this.dom.btnToggle) {
                    this.dom.popover.style.display = 'none';
                    if (this.dom.btnToggle) this.dom.btnToggle.classList.toggle('active', this.currentMode !== 'none');
                }
            });
        }

        if (this.dom.optionBtns) {
            this.dom.optionBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    this.setMode(btn.dataset.layer);
                    if (this.dom.popover) this.dom.popover.style.display = 'none';
                });
            });
        }

        if (this.dom.radioInputs) {
            this.dom.radioInputs.forEach(radio => {
                radio.addEventListener('change', () => {
                    if (radio.checked) {
                        this.setMode(radio.value);
                    }
                });
            });
        }

        // [O] Hotkey to cycle layers
        window.addEventListener('keydown', (e) => {
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
            if (e.key === 'o' || e.key === 'O') {
                e.preventDefault();
                this.cycleNextMode();
            }
        });
    }

    cycleNextMode() {
        const modes = ['none', 'fire', 'sanitation', 'electric', 'pollution', 'flood'];
        const currentIdx = modes.indexOf(this.currentMode);
        const nextMode = modes[(currentIdx + 1) % modes.length];
        this.setMode(nextMode);
    }

    setMode(mode) {
        // Normalize backward-compatibility aliases
        if (mode === 'water') mode = 'sanitation';
        if (mode === 'power') mode = 'electric';

        this.currentMode = mode;

        if (this.dom.optionBtns) {
            this.dom.optionBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.layer === mode);
            });
        }

        const activeRadio = document.querySelector(`input[name="layer-mode"][value="${mode}"]`);
        if (activeRadio) {
            activeRadio.checked = true;
        }

        if (this.dom.btnToggle) {
            this.dom.btnToggle.classList.toggle('active', mode !== 'none');
        }

        if (mode === 'none') {
            this.instancedMesh.visible = false;
            this.state?.showToast('Layer overlay deactivated (Normal View)');
            return;
        }

        this.instancedMesh.visible = true;
        this.refresh();

        const labels = {
            fire: '🔥 Fire Hazard Heatmap Active',
            sanitation: '💧 Clean Water & Sanitation Overlay Active',
            electric: '⚡ Electric Power Grid Active',
            pollution: '🏭 Coal Soot Pollution Active',
            happiness: '🌸 Citizen Welfare & Land Value Overlay Active',
            flood: '🌊 Flood Inundation Risk Overlay Active'
        };
        this.state?.showToast(labels[mode] || 'Layer updated');
    }

    refresh() {
        if (this.currentMode === 'none' || !this.instancedMesh.visible) return;
        OverlayRenderer.refreshLayerBuffer(this.instancedMesh, this.currentMode, this.grid, this.simulation);
    }

    getFireColor(tile, x, y) {
        return OverlayRenderer.getFireColor(tile, this.simulation);
    }

    getWaterColor(tile, x, y) {
        return OverlayRenderer.getSanitationColor(tile, x, y, this.simulation);
    }

    getSanitationColor(tile, x, y) {
        return OverlayRenderer.getSanitationColor(tile, x, y, this.simulation);
    }

    getElectricColor(tile, x, y) {
        return OverlayRenderer.getElectricColor(tile, x, y, this.simulation);
    }

    getPollutionColor(tile, x, y) {
        return OverlayRenderer.getPollutionColor(tile, x, y, this.simulation);
    }

    getHappinessColor(tile, x, y) {
        return OverlayRenderer.getHappinessColor(tile, this.simulation);
    }

    getFloodColor(tile, x, y) {
        return OverlayRenderer.getFloodColor(tile, x, y, this.simulation);
    }
}
