// Project Meiji - Keyboard Shortcuts & Simulation Hotkeys Router
// ponytail: native keydown router for tool selection, speed control, camera rotation

import { CONFIG } from '../config.js';

export function bindKeyboardHotkeys(toolController, stateManager, renderer) {
    window.addEventListener('keydown', (e) => {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
        const key = e.key.toLowerCase();

        // Space: Toggle Pause / Resume
        if (e.code === 'Space' || key === ' ') {
            e.preventDefault();
            stateManager.toggleSimulation();
            return;
        }

        // ~ or \ : Reset to Baseline Speed (1x)
        if (key === '~' || key === '`' || key === '\\' || e.code === 'Backquote' || e.code === 'Backslash') {
            e.preventDefault();
            stateManager.setSimulationSpeed(1);
            return;
        }

        // Shift + 1/2/3/5: Simulation Speeds (1x, 2x, 3x, 5x)
        if (e.shiftKey) {
            if (e.code === 'Digit1' || key === '!' || key === '1') {
                e.preventDefault();
                stateManager.setSimulationSpeed(1);
                return;
            }
            if (e.code === 'Digit2' || key === '@' || key === '2') {
                e.preventDefault();
                stateManager.setSimulationSpeed(2);
                return;
            }
            if (e.code === 'Digit3' || key === '#' || key === '3') {
                e.preventDefault();
                stateManager.setSimulationSpeed(3);
                return;
            }
            if (e.code === 'Digit5' || key === '%' || key === '5') {
                e.preventDefault();
                stateManager.setSimulationSpeed(5);
                return;
            }
        }

        // Q & E Camera Rotation
        if (key === 'q') renderer.rotateCameraBy(-Math.PI / 4, 200);
        if (key === 'e') renderer.rotateCameraBy(Math.PI / 4, 200);

        // R: Rotate Structure (Placement in Build mode, or Inspected structure in Survey mode)
        if (key === 'r') {
            e.preventDefault();
            if (toolController.currentTool !== CONFIG.TOOLS.INSPECT) {
                toolController.rotatePlacement();
            } else if (stateManager && typeof stateManager.rotateInspectedTile === 'function') {
                stateManager.rotateInspectedTile();
            }
            return;
        }

        // Tool shortcuts
        if (key === '1' || key === 'i') toolController.setActiveTool(CONFIG.TOOLS.INSPECT);
        if (key === '2') toolController.setActiveTool(CONFIG.TOOLS.ROAD);
        if (key === 's') toolController.setActiveTool(CONFIG.TOOLS.STONE_ROAD);
        if (key === 'c') toolController.setActiveTool(CONFIG.TOOLS.CANAL);
        if (key === 't') toolController.setActiveTool(CONFIG.TOOLS.RAIL_TRACK);
        if (key === 'd') toolController.setActiveTool(CONFIG.TOOLS.TRAIN_DEPOT);
        if (key === 'w') toolController.setActiveTool(CONFIG.TOOLS.TREE_WILLOW);
        if (key === 'j') toolController.setActiveTool(CONFIG.TOOLS.SHRINE_PARK);
        if (key === '3') toolController.setActiveTool(CONFIG.TOOLS.RESIDENTIAL);
        if (key === '4') toolController.setActiveTool(CONFIG.TOOLS.COMMERCIAL);
        if (key === '5') toolController.setActiveTool(CONFIG.TOOLS.INDUSTRIAL);
        if (key === '6') toolController.setActiveTool(CONFIG.TOOLS.WATCHTOWER);
        if (key === '7' || key === 'f') toolController.setActiveTool(CONFIG.TOOLS.FIRE_DEPOT);
        if (key === '8') toolController.setActiveTool(CONFIG.TOOLS.WELL);
        if (key === '9') toolController.setActiveTool(CONFIG.TOOLS.OCHAYA);
        if (key === '0') toolController.setActiveTool(CONFIG.TOOLS.SENTO);
        if (key === 'k') toolController.setActiveTool(CONFIG.TOOLS.KOBAN);
        if (key === 'g') toolController.setActiveTool(CONFIG.TOOLS.SCHOOL);
        if (key === 'h') toolController.setActiveTool(CONFIG.TOOLS.HARBOR_PIER);
        if (key === 'e') toolController.setActiveTool(CONFIG.TOOLS.TELEGRAPH);
        if (key === 'p') toolController.setActiveTool(CONFIG.TOOLS.RICE_PADDY);
        if (key === 'b' || key === 'x') toolController.setActiveTool(CONFIG.TOOLS.BULLDOZER);
    });
}
