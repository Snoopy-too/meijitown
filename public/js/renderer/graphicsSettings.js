// Project Meiji - Graphics Quality Presets & Persistence (graphicsSettings.js)
// Clean configuration presets separating Balanced (default), Fast (low), and Photoreal (high/ultra)

const GRAPHICS_STORAGE_KEY = 'meiji_graphics_quality';

export const GRAPHICS_PRESETS = {
    low: {
        id: 'low',
        pixelRatioCap: 1.0,
        shadowsEnabled: false,
        shadowMapSize: 512,
        shadowTypeKey: 'BasicShadowMap',
        postPreset: 'off',
        tiltShiftEnabled: false
    },
    medium: {
        id: 'medium',
        pixelRatioCap: 1.5,
        shadowsEnabled: true,
        shadowMapSize: 1024,
        shadowTypeKey: 'PCFShadowMap',
        postPreset: 'off',
        tiltShiftEnabled: false
    },
    high: {
        id: 'high',
        pixelRatioCap: 2.0,
        shadowsEnabled: true,
        shadowMapSize: 2048,
        shadowTypeKey: 'PCFSoftShadowMap',
        postPreset: 'ultra',
        tiltShiftEnabled: true
    }
};

export function normalizeGraphicsPreset(preset) {
    if (!preset) return 'medium';
    const key = String(preset).toLowerCase().trim();
    if (key === 'low' || key === 'off' || key === 'fast') return 'low';
    if (key === 'high' || key === 'ultra' || key === 'photoreal') return 'high';
    if (key === 'medium' || key === 'balanced') return 'medium';
    return 'medium';
}

export function loadSavedGraphicsPreset() {
    try {
        if (typeof localStorage === 'undefined') return 'medium';
        return normalizeGraphicsPreset(localStorage.getItem(GRAPHICS_STORAGE_KEY));
    } catch (_) {
        return 'medium';
    }
}

export function saveGraphicsPreset(preset) {
    const normalized = normalizeGraphicsPreset(preset);
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(GRAPHICS_STORAGE_KEY, normalized);
        }
    } catch (_) {}
    return normalized;
}
