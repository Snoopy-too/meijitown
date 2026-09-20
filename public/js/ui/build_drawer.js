// Project Meiji - Build Drawer & Active Tool Floating Action Button (FAB)
// ponytail: slide-up drawer with 4 thumb-friendly category tabs & persistent FAB

import { CONFIG } from '../config.js';
import { i18n } from '../i18n.js';
import { getToolCatalogEntry } from '../config/toolCatalogData.js';

export const TOOL_TIER_REQUIREMENTS = {
    [CONFIG.TOOLS.INSPECT]: { tier: 1, pop: 0 },
    [CONFIG.TOOLS.ROAD]: { tier: 1, pop: 0 },
    [CONFIG.TOOLS.RESIDENTIAL]: { tier: 1, pop: 0 },
    [CONFIG.TOOLS.COMMERCIAL]: { tier: 1, pop: 0 },
    [CONFIG.TOOLS.INDUSTRIAL]: { tier: 1, pop: 0 },
    [CONFIG.TOOLS.RICE_PADDY]: { tier: 1, pop: 0 },
    [CONFIG.TOOLS.BULLDOZER]: { tier: 1, pop: 0 },

    [CONFIG.TOOLS.CANAL]: { tier: 2, pop: 100 },
    [CONFIG.TOOLS.STONE_ROAD]: { tier: 2, pop: 100 },
    [CONFIG.TOOLS.WATCHTOWER]: { tier: 2, pop: 100 },
    [CONFIG.TOOLS.FIRE_DEPOT]: { tier: 2, pop: 100 },
    [CONFIG.TOOLS.WELL]: { tier: 2, pop: 100 },
    [CONFIG.TOOLS.OCHAYA]: { tier: 2, pop: 100 },
    [CONFIG.TOOLS.SHRINE_PARK]: { tier: 2, pop: 100 },
    [CONFIG.TOOLS.TREE_WILLOW]: { tier: 2, pop: 100 },
    [CONFIG.TOOLS.SUIMON]: { tier: 2, pop: 100 },

    [CONFIG.TOOLS.RAIL_TRACK]: { tier: 3, pop: 300 },
    [CONFIG.TOOLS.TRAIN_DEPOT]: { tier: 3, pop: 300 },
    [CONFIG.TOOLS.KOBAN]: { tier: 3, pop: 300 },
    [CONFIG.TOOLS.SCHOOL]: { tier: 3, pop: 300 },
    [CONFIG.TOOLS.TELEGRAPH]: { tier: 3, pop: 300 },
    [CONFIG.TOOLS.HARBOR_PIER]: { tier: 3, pop: 300 },
    [CONFIG.TOOLS.SENTO]: { tier: 3, pop: 300 },

    [CONFIG.TOOLS.POWER_PLANT]: { tier: 4, pop: 600 },
    [CONFIG.TOOLS.WATERWORKS]: { tier: 4, pop: 600 },
    [CONFIG.TOOLS.PAVILION]: { tier: 4, pop: 600 },
    monument_pavilion: { tier: 4, pop: 600 },
    pavilion: { tier: 4, pop: 600 }
};

export class BuildDrawer {
    constructor(onToolSelectCallback, onRotateCallback = null) {
        this.onToolSelect = onToolSelectCallback;
        this.onRotate = onRotateCallback;
        this.currentTool = CONFIG.TOOLS.INSPECT;
        this.currentTownTier = 1;
        this.isOpen = false;
        this._inspectorDebounce = null;

        this.dom = {
            fab: document.getElementById('active-tool-btn'),
            fabIcon: document.getElementById('fab-tool-icon'),
            fabName: document.getElementById('fab-tool-name'),
            fabRotate: document.getElementById('fab-rotate-btn'),
            fabRotateDeg: document.getElementById('fab-rotate-deg'),
            fabCancel: document.getElementById('fab-cancel-btn'),
            drawer: document.getElementById('build-drawer'),
            drawerOverlay: document.getElementById('drawer-overlay'),
            tabButtons: document.querySelectorAll('.drawer-tab-btn'),
            tabPanels: document.querySelectorAll('.drawer-tab-panel'),
            itemButtons: document.querySelectorAll('.drawer-item-btn'),
            closeBtn: document.getElementById('drawer-close-btn'),
            inspector: document.getElementById('drawer-tool-inspector'),
            inspectorName: document.getElementById('inspector-tool-name'),
            inspectorCost: document.getElementById('inspector-tool-cost'),
            inspectorEffect: document.getElementById('inspector-tool-effect'),
            inspectorLock: document.getElementById('inspector-tool-lock-status'),
        };

        this.bindEvents();
        i18n.onChange(() => {
            this.updateFAB(this.currentTool);
            this.updateDrawerItems();
            this.updateInspector();
        });
        this.updateDrawerItems();
        this.updateInspector();
    }

    bindEvents() {
        // FAB Click -> Toggle Drawer (unless cancel or rotate clicked)
        if (this.dom.fab) {
            this.dom.fab.addEventListener('click', (e) => {
                if (e.target.closest('#fab-cancel-btn') || e.target.closest('#fab-rotate-btn')) return;
                this.toggle();
            });
        }

        // Rotate Button -> Rotate Placement
        if (this.dom.fabRotate) {
            this.dom.fabRotate.addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof this.onRotate === 'function') {
                    this.onRotate();
                }
            });
        }

        // Cancel Button -> Revert to Survey Mode
        if (this.dom.fabCancel) {
            this.dom.fabCancel.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectTool(CONFIG.TOOLS.INSPECT);
                this.close();
            });
        }

        // Drawer Close Button
        if (this.dom.closeBtn) {
            this.dom.closeBtn.addEventListener('click', () => this.close());
        }

        // Click outside (scrim / overlay) -> Close
        if (this.dom.drawerOverlay) {
            this.dom.drawerOverlay.addEventListener('click', () => this.close());
        }

        // Tab Switching
        if (this.dom.tabButtons) {
            this.dom.tabButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const targetTab = btn.dataset.tab;
                    this.switchTab(targetTab);
                });
            });
        }

        // Drawer Item Buttons -> Hover, Focus & Selection Handling
        if (this.dom.itemButtons) {
            this.dom.itemButtons.forEach(btn => {
                const tool = btn.dataset.tool;
                if (!tool) return;

                btn.addEventListener('mouseenter', () => {
                    if (this._inspectorDebounce) clearTimeout(this._inspectorDebounce);
                    this.updateInspector(tool);
                });
                btn.addEventListener('mouseleave', () => {
                    if (this._inspectorDebounce) clearTimeout(this._inspectorDebounce);
                    this._inspectorDebounce = setTimeout(() => {
                        this.updateInspector(null);
                    }, 80);
                });
                btn.addEventListener('focus', () => {
                    if (this._inspectorDebounce) clearTimeout(this._inspectorDebounce);
                    this.updateInspector(tool);
                });
                btn.addEventListener('blur', () => this.updateInspector(null));

                btn.addEventListener('click', (e) => {
                    const req = TOOL_TIER_REQUIREMENTS[tool];
                    if (req && this.currentTownTier < req.tier) {
                        e.stopPropagation();
                        this.updateInspector(tool);
                        return;
                    }
                    this.selectTool(tool);
                    this.close();
                });
            });
        }

        // Reset inspector immediately when mouse leaves drawer entirely
        if (this.dom.drawer) {
            this.dom.drawer.addEventListener('mouseleave', () => {
                if (this._inspectorDebounce) clearTimeout(this._inspectorDebounce);
                this.updateInspector(null);
            });
        }
    }

    toggle() {
        if (this.isOpen) this.close();
        else this.open();
    }

    open() {
        this.isOpen = true;
        if (this.dom.drawer) this.dom.drawer.classList.add('drawer-open');
        if (this.dom.drawerOverlay) this.dom.drawerOverlay.classList.add('overlay-active');
        this.updateInspector();
    }

    close() {
        this.isOpen = false;
        if (this.dom.drawer) this.dom.drawer.classList.remove('drawer-open');
        if (this.dom.drawerOverlay) this.dom.drawerOverlay.classList.remove('overlay-active');
    }

    switchTab(tabName) {
        if (this.dom.tabButtons) {
            this.dom.tabButtons.forEach(btn => {
                if (btn.dataset.tab === tabName) btn.classList.add('active');
                else btn.classList.remove('active');
            });
        }

        if (this.dom.tabPanels) {
            this.dom.tabPanels.forEach(panel => {
                if (panel.id === `tab-panel-${tabName}`) panel.classList.add('active');
                else panel.classList.remove('active');
            });
        }
    }

    updateTownTier(currentTier) {
        this.currentTownTier = currentTier || 1;
        this.updateDrawerItems();
        this.updateInspector();
    }

    selectTool(toolName) {
        const req = TOOL_TIER_REQUIREMENTS[toolName];
        if (req && this.currentTownTier < req.tier) {
            this.updateInspector(toolName);
            return;
        }

        this.currentTool = toolName;

        // Update active class on drawer items
        if (this.dom.itemButtons) {
            this.dom.itemButtons.forEach(btn => {
                if (btn.dataset.tool === toolName) btn.classList.add('active');
                else btn.classList.remove('active');
            });
        }

        // Update FAB icon, label, and cancel button visibility
        this.updateFAB(toolName);
        this.updateInspector(toolName);

        // Notify ToolController
        if (typeof this.onToolSelect === 'function') {
            this.onToolSelect(toolName);
        }
    }

    updateInspector(toolName = null) {
        if (this._inspectorDebounce) {
            clearTimeout(this._inspectorDebounce);
            this._inspectorDebounce = null;
        }
        if (!this.dom.inspector) return;
        const targetTool = toolName || (this.currentTool !== CONFIG.TOOLS.INSPECT ? this.currentTool : null);
        const isJa = i18n.getLanguage() === 'ja';
        const lang = isJa ? 'ja' : 'en';

        if (!targetTool) {
            if (this.dom.inspectorName) {
                this.dom.inspectorName.textContent = isJa ? '項目を選択またはカーソルを合わせる' : 'Select or hover over an item';
            }
            if (this.dom.inspectorCost) {
                this.dom.inspectorCost.textContent = '';
            }
            if (this.dom.inspectorEffect) {
                this.dom.inspectorEffect.textContent = isJa
                    ? '建物や道具にカーソルを合わせると、効果や費用を確認できます。'
                    : 'Hover over any building or tool (including locked items) to view its purpose and municipal benefits.';
            }
            if (this.dom.inspectorLock) {
                this.dom.inspectorLock.textContent = '';
                this.dom.inspectorLock.style.display = 'none';
            }
            return;
        }

        const entry = getToolCatalogEntry(targetTool);

        if (this.dom.inspectorName) {
            const meta = this.getToolMetadata(targetTool);
            this.dom.inspectorName.textContent = entry?.name?.[lang] || meta?.name || targetTool;
        }

        if (this.dom.inspectorCost) {
            if (entry && (entry.cost !== undefined || entry.upkeep !== undefined)) {
                this.dom.inspectorCost.textContent = isJa
                    ? `費用: ¥${entry.cost} | 維持費: ¥${entry.upkeep}/月`
                    : `Cost: ¥${entry.cost} | Upkeep: ¥${entry.upkeep}/mo`;
            } else {
                this.dom.inspectorCost.textContent = '';
            }
        }

        if (this.dom.inspectorEffect) {
            this.dom.inspectorEffect.textContent = entry?.effect?.[lang] || entry?.effect?.en || '';
        }

        if (this.dom.inspectorLock) {
            const req = TOOL_TIER_REQUIREMENTS[targetTool];
            if (req && this.currentTownTier < req.tier) {
                const tierNames = { 1: { en: 'Hamlet', ja: '集落' }, 2: { en: 'Post Town', ja: '宿場町' }, 3: { en: 'Modern Town', ja: '地方都市' }, 4: { en: 'Metropolis', ja: '帝都大都市' } };
                const tierName = tierNames[req.tier]?.[lang] || `Tier ${req.tier}`;
                const lockMsg = isJa
                    ? `🔒 第${req.tier}段階「${tierName}」(人口 ${req.pop}名) 到達で開放`
                    : `🔒 Unlocks at ${tierName} (Tier ${req.tier} - Population ${req.pop})`;
                this.dom.inspectorLock.textContent = lockMsg;
                this.dom.inspectorLock.style.display = 'block';
            } else if (targetTool === 'monument_pavilion' || targetTool === CONFIG.TOOLS.PAVILION) {
                this.dom.inspectorLock.textContent = isJa
                    ? '🏛️ 開放要件: 人口600名以上・鉄道路線・電信局・船着場'
                    : '🏛️ Requires: Pop 600+, active Rail, Telegraph, and Cargo Pier';
                this.dom.inspectorLock.style.display = 'block';
            } else {
                this.dom.inspectorLock.textContent = '';
                this.dom.inspectorLock.style.display = 'none';
            }
        }
    }

    updateFAB(toolName) {
        const metadata = this.getToolMetadata(toolName);

        if (this.dom.fabName) {
            this.dom.fabName.textContent = metadata.name;
        }

        if (this.dom.fabIcon) {
            this.dom.fabIcon.innerHTML = metadata.iconHtml;
        }

        if (this.dom.fabCancel) {
            if (toolName === CONFIG.TOOLS.INSPECT) {
                this.dom.fabCancel.style.display = 'none';
            } else {
                this.dom.fabCancel.style.display = 'inline-flex';
            }
        }

        if (this.dom.fabRotate) {
            const rotatableTools = [
                CONFIG.TOOLS.TRAIN_DEPOT,
                CONFIG.TOOLS.KOBAN,
                CONFIG.TOOLS.WATCHTOWER,
                CONFIG.TOOLS.FIRE_DEPOT,
                CONFIG.TOOLS.WELL,
                CONFIG.TOOLS.OCHAYA,
                CONFIG.TOOLS.SENTO,
                CONFIG.TOOLS.SHRINE_PARK,
                CONFIG.TOOLS.RESIDENTIAL,
                CONFIG.TOOLS.COMMERCIAL,
                CONFIG.TOOLS.INDUSTRIAL,
                CONFIG.TOOLS.SCHOOL,
                CONFIG.TOOLS.TELEGRAPH,
                CONFIG.TOOLS.HARBOR_PIER,
                CONFIG.TOOLS.POWER_PLANT,
                CONFIG.TOOLS.WATERWORKS,
                CONFIG.TOOLS.PAVILION,
                CONFIG.TOOLS.SUIMON,
            ];
            this.dom.fabRotate.style.display = rotatableTools.includes(toolName) ? 'inline-flex' : 'none';
        }
    }

    updateRotateBtn(rotation = 0) {
        if (this.dom.fabRotateDeg) {
            this.dom.fabRotateDeg.textContent = `${(rotation % 4) * 90}°`;
        }
    }

    updateDrawerItems() {
        if (!this.dom.itemButtons) return;
        this.dom.itemButtons.forEach(btn => {
            const tool = btn.dataset.tool;
            const nameSpan = btn.querySelector('.item-name');
            if (nameSpan && tool) {
                const meta = this.getToolMetadata(tool);
                if (meta && meta.name) nameSpan.textContent = meta.name;
            }

            // Milestone Gating Enforcement
            const req = TOOL_TIER_REQUIREMENTS[tool];
            if (req && this.currentTownTier < req.tier) {
                btn.classList.add('tool-locked');
                let badge = btn.querySelector('.item-lock-badge');
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'item-lock-badge';
                    btn.appendChild(badge);
                }
                badge.textContent = `🔒 T${req.tier} (${req.pop})`;
            } else {
                btn.classList.remove('tool-locked');
                const badge = btn.querySelector('.item-lock-badge');
                if (badge) badge.remove();
            }
        });
    }

    getToolMetadata(toolName) {
        switch (toolName) {
            case CONFIG.TOOLS.ROAD:
                return { name: i18n.t('tool.road', 'Dirt Road'), iconHtml: '🛣️' };
            case CONFIG.TOOLS.STONE_ROAD:
                return { name: i18n.t('tool.stone_road', 'Stone Paving'), iconHtml: '🧱' };
            case CONFIG.TOOLS.CANAL:
                return { name: i18n.t('tool.canal', 'Canal (Hori)'), iconHtml: '🌊' };
            case CONFIG.TOOLS.RAIL_TRACK:
                return { name: i18n.t('tool.rail_track', 'Rail Tracks'), iconHtml: '🛤️' };
            case CONFIG.TOOLS.TRAIN_DEPOT:
                return { name: i18n.t('tool.train_depot', 'Train Depot'), iconHtml: '🚉' };
            case CONFIG.TOOLS.TREE_WILLOW:
                return { name: i18n.t('tool.tree_willow', 'Canal Tree'), iconHtml: '🌸' };
            case CONFIG.TOOLS.SHRINE_PARK:
                return { name: i18n.t('tool.shrine_park', 'Shrine Park'), iconHtml: '⛩️' };
            case CONFIG.TOOLS.RESIDENTIAL:
                return { name: i18n.t('tool.residential', 'Machiya (R)'), iconHtml: '🏡' };
            case CONFIG.TOOLS.COMMERCIAL:
                return { name: i18n.t('tool.commercial', 'Shouten (C)'), iconHtml: '🏬' };
            case CONFIG.TOOLS.INDUSTRIAL:
                return { name: i18n.t('tool.industrial', 'Workshop (I)'), iconHtml: '⚒️' };
            case CONFIG.TOOLS.RICE_PADDY:
                return { name: i18n.t('tool.rice_paddy', 'Rice Paddy'), iconHtml: '🌾' };
            case CONFIG.TOOLS.WATCHTOWER:
                return { name: i18n.t('tool.watchtower', 'Watchtower'), iconHtml: '🏯' };
            case CONFIG.TOOLS.FIRE_DEPOT:
                return { name: i18n.t('tool.fire_depot', 'Fire Depot'), iconHtml: '🚒' };
            case CONFIG.TOOLS.WELL:
                return { name: i18n.t('tool.well', 'Well (Ido)'), iconHtml: '💧' };
            case CONFIG.TOOLS.OCHAYA:
                return { name: i18n.t('tool.ochaya', 'Teahouse'), iconHtml: '🍵' };
            case CONFIG.TOOLS.SENTO:
                return { name: i18n.t('tool.sento', 'Bathhouse'), iconHtml: '♨️' };
            case CONFIG.TOOLS.KOBAN:
                return { name: i18n.t('tool.koban', 'Police (Kōban)'), iconHtml: '🏮' };
            case CONFIG.TOOLS.SCHOOL:
                return { name: i18n.t('tool.school', 'Primary School'), iconHtml: '🏫' };
            case CONFIG.TOOLS.TELEGRAPH:
                return { name: i18n.t('tool.telegraph', 'Telegraph'), iconHtml: '⚡' };
            case CONFIG.TOOLS.HARBOR_PIER:
                return { name: i18n.t('tool.harbor_pier', 'Cargo Pier'), iconHtml: '⚓' };
            case CONFIG.TOOLS.POWER_PLANT:
                return { name: i18n.t('tool.power_plant', 'Power Plant'), iconHtml: '🏭' };
            case CONFIG.TOOLS.WATERWORKS:
                return { name: i18n.t('tool.waterworks', 'Waterworks'), iconHtml: '💧' };
            case CONFIG.TOOLS.PAVILION:
                return { name: i18n.t('tool.pavilion', 'Pavilion (Exposition)'), iconHtml: '🏛️' };
            case CONFIG.TOOLS.SUIMON:
                return { name: i18n.t('tool.suimon', 'Watergate Sluice'), iconHtml: '⛩️' };
            case CONFIG.TOOLS.BULLDOZER:
                return { name: i18n.t('tool.bulldozer', 'Demolish'), iconHtml: '🪓' };
            case CONFIG.TOOLS.INSPECT:
            default:
                return { name: i18n.t('tool.survey', 'Survey Mode'), iconHtml: '🧭' };
        }
    }
}
