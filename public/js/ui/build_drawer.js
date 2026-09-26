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
    constructor(onToolSelectCallback, onRotateCallback = null, rootContainer = null) {
        this.root = rootContainer || (typeof document !== 'undefined' ? document : null);
        const getEl = (id) => (this.root && this.root.getElementById ? this.root.getElementById(id) : (this.root && this.root.querySelector ? this.root.querySelector('#' + id) : (typeof document !== 'undefined' ? document.getElementById(id) : null)));
        const getAll = (sel) => (this.root && this.root.querySelectorAll ? this.root.querySelectorAll(sel) : (typeof document !== 'undefined' ? document.querySelectorAll(sel) : []));

        this.onToolSelect = onToolSelectCallback;
        this.onRotate = onRotateCallback;
        this.currentTool = CONFIG.TOOLS.INSPECT;
        this.currentTownTier = 1;
        this.isOpen = false;
        this._inspectorDebounce = null;

        this.dom = {
            fab: getEl('active-tool-btn'),
            fabIcon: getEl('fab-tool-icon'),
            fabName: getEl('fab-tool-name'),
            fabRotate: getEl('fab-rotate-btn'),
            fabRotateDeg: getEl('fab-rotate-deg'),
            fabCancel: getEl('fab-cancel-btn'),
            drawer: getEl('build-drawer'),
            drawerOverlay: getEl('drawer-overlay'),
            tabButtons: getAll('.drawer-tab-btn'),
            tabPanels: getAll('.drawer-tab-panel'),
            itemButtons: getAll('.drawer-item-btn'),
            closeBtn: getEl('drawer-close-btn'),
            inspector: getEl('drawer-tool-inspector'),
            inspectorName: getEl('inspector-tool-name'),
            inspectorCost: getEl('inspector-tool-cost'),
            inspectorEffect: getEl('inspector-tool-effect'),
            inspectorLock: getEl('inspector-tool-lock-status'),
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

    updateTabs() {
        if (!this.dom.tabButtons) return;
        const tabLabels = {
            infra: i18n.t('tab.infra', '🛣️ Infrastructure'),
            zones: i18n.t('tab.zones', '🏡 Zones'),
            civic: i18n.t('tab.civic', '🏯 Public Services'),
            leisure: i18n.t('tab.leisure', '🍵 Leisure & Culture')
        };
        this.dom.tabButtons.forEach(btn => {
            const k = btn.dataset.tab;
            if (k && tabLabels[k]) btn.textContent = tabLabels[k];
        });
    }

    updateDrawerHeader() {
        const titleEl = this.dom.drawer ? this.dom.drawer.querySelector('.drawer-title') : null;
        if (!titleEl) return;
        const isJa = i18n.getLanguage() === 'ja';
        const sub = titleEl.querySelector('.drawer-subtitle') || titleEl.querySelector('span:not(.kanji)');
        if (sub) {
            sub.textContent = isJa ? '(都市造営・普請)' : 'Construction Catalogue';
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
        this.updateTabs();
        this.updateDrawerHeader();
    }

    getToolMetadata(toolName) {
        const key = toolName === 'monument_pavilion' ? CONFIG.TOOLS.PAVILION : toolName;
        const entry = getToolCatalogEntry(key);
        const lang = i18n.getLanguage() === 'ja' ? 'ja' : 'en';
        const icons = {
            [CONFIG.TOOLS.ROAD]: '🛣️', [CONFIG.TOOLS.STONE_ROAD]: '🧱', [CONFIG.TOOLS.CANAL]: '🌊',
            [CONFIG.TOOLS.RAIL_TRACK]: '🛤️', [CONFIG.TOOLS.TRAIN_DEPOT]: '🚉', [CONFIG.TOOLS.TREE_WILLOW]: '🌸',
            [CONFIG.TOOLS.SHRINE_PARK]: '⛩️', [CONFIG.TOOLS.RESIDENTIAL]: '🏡', [CONFIG.TOOLS.COMMERCIAL]: '🏬',
            [CONFIG.TOOLS.INDUSTRIAL]: '⚒️', [CONFIG.TOOLS.RICE_PADDY]: '🌾', [CONFIG.TOOLS.WATCHTOWER]: '🏯',
            [CONFIG.TOOLS.FIRE_DEPOT]: '🚒', [CONFIG.TOOLS.WELL]: '💧', [CONFIG.TOOLS.OCHAYA]: '🍵',
            [CONFIG.TOOLS.SENTO]: '♨️', [CONFIG.TOOLS.KOBAN]: '🏮', [CONFIG.TOOLS.SCHOOL]: '🏫',
            [CONFIG.TOOLS.TELEGRAPH]: '⚡', [CONFIG.TOOLS.HARBOR_PIER]: '⚓', [CONFIG.TOOLS.POWER_PLANT]: '🏭',
            [CONFIG.TOOLS.WATERWORKS]: '💧', [CONFIG.TOOLS.PAVILION]: '🏛️', [CONFIG.TOOLS.SUIMON]: '⛩️',
            [CONFIG.TOOLS.BULLDOZER]: '🪓', [CONFIG.TOOLS.INSPECT]: '🧭'
        };
        const defaultName = entry?.name?.[lang] || i18n.t(`tool.${key}`, key);
        return { name: defaultName, iconHtml: icons[key] || '🧭' };
    }
}
