// Project Meiji - Civic Policies & Imperial Edicts Engine (policyManager.js)
// ponytail: slide-out Japanese scroll ledger, toggleable municipal edicts & simulation hooks

import { SOUND } from './fx.js';
import { i18n } from './i18n.js';

export const POLICY_DEFINITIONS = {
    night_watch: {
        id: 'night_watch',
        nameEn: 'Night Fire Watch (Yakin)',
        nameJa: '夜番火の用心 (夜勤)',
        upkeep: 15,
        commTaxPenaltyRate: 0.05,
        fireRiskReductionRate: 0.40,
    },
    clean_water: {
        id: 'clean_water',
        nameEn: 'Clean Water Mandate (Seisui-rei)',
        nameJa: '清水清掃令 (清水令)',
        upkeep: 10,
        popGrowthBonusRate: 0.10,
    },
    modernization_subsidy: {
        id: 'modernization_subsidy',
        nameEn: 'Modernization Subsidy (Bunmei Kaika)',
        nameJa: '文明開化助成 (近代化助成)',
        subsidyCostPerConversion: 50,
        renovationSpeedBoost: 0.50,
    }
};

export class PolicyManager {
    constructor(stateManager) {
        this.state = stateManager;
        this.isOpen = false;

        // Active policy dictionary
        this.policies = {
            night_watch: false,
            clean_water: false,
            modernization_subsidy: false,
        };

        // Persistence
        this.storageKey = `meiji_policies_${this.state.cityId || 1}`;
        this.loadPolicies();

        this.dom = {
            btnToggle: document.getElementById('btn-policy-ledger'),
            scrim: document.getElementById('policy-drawer-scrim'),
            drawer: document.getElementById('policy-drawer'),
            closeBtn: document.getElementById('policy-close-btn'),
            toggles: {
                night_watch: document.getElementById('toggle-policy-night-watch'),
                clean_water: document.getElementById('toggle-policy-clean-water'),
                modernization_subsidy: document.getElementById('toggle-policy-modernization-subsidy'),
            },
            cards: {
                night_watch: document.getElementById('card-policy-night-watch'),
                clean_water: document.getElementById('card-policy-clean-water'),
                modernization_subsidy: document.getElementById('card-policy-modernization-subsidy'),
            },
            activeCount: document.getElementById('policy-active-count'),
            monthlyCost: document.getElementById('policy-monthly-cost'),
        };

        this.bindEvents();
        this.updateUI();
    }

    loadPolicies() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    for (const key of Object.keys(this.policies)) {
                        this.policies[key] = Boolean(parsed[key]);
                    }
                }
            }
        } catch (_) {}
    }

    resetDefaults() {
        for (const key of Object.keys(this.policies)) {
            this.policies[key] = false;
        }
        this.savePolicies();
        this.updateUI();
    }

    savePolicies() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.policies));
        } catch (_) {}
    }

    bindEvents() {
        // Toggle ledger open/close
        if (this.dom.btnToggle) {
            this.dom.btnToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggle();
            });
        }

        if (this.dom.closeBtn) {
            this.dom.closeBtn.addEventListener('click', () => this.close());
        }

        if (this.dom.scrim) {
            this.dom.scrim.addEventListener('click', (e) => {
                if (e.target === this.dom.scrim) this.close();
            });
        }

        // Policy Switch Checkboxes
        for (const [key, checkbox] of Object.entries(this.dom.toggles)) {
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    this.setPolicyActive(key, e.target.checked);
                });
            }
        }

        // [P] Hotkey to toggle policy ledger
        window.addEventListener('keydown', (e) => {
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
            if (e.key === 'p' || e.key === 'P') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    toggle() {
        if (this.isOpen) this.close();
        else this.open();
    }

    open() {
        this.isOpen = true;
        if (this.dom.scrim) this.dom.scrim.classList.add('open');
        if (this.dom.drawer) this.dom.drawer.classList.add('open');
        if (this.dom.btnToggle) this.dom.btnToggle.classList.add('active');
        this.updateUI();
    }

    close() {
        this.isOpen = false;
        if (this.dom.scrim) this.dom.scrim.classList.remove('open');
        if (this.dom.drawer) this.dom.drawer.classList.remove('open');
        if (this.dom.btnToggle) this.dom.btnToggle.classList.remove('active');
    }

    setPolicyActive(key, isActive) {
        if (this.policies[key] === undefined) return;
        this.policies[key] = !!isActive;
        this.savePolicies();
        SOUND.playWoodClack();

        const def = POLICY_DEFINITIONS[key];
        const isJa = i18n.getLanguage() === 'ja';
        const name = def ? (isJa ? def.nameJa : def.nameEn) : key;
        const status = isActive ? (isJa ? '施行布告' : 'Enacted') : (isJa ? '廃止解除' : 'Repealed');
        this.state.showToast(`📜 Edict: "${name}" ${status}!`);

        this.updateUI();
        if (this.state.simulation) {
            this.state.updateHUD();
        }
    }

    updateUI() {
        let activeCount = 0;
        let totalMonthlyUpkeep = 0;

        for (const [key, isActive] of Object.entries(this.policies)) {
            if (isActive) activeCount++;

            if (this.dom.toggles[key]) {
                this.dom.toggles[key].checked = isActive;
            }
            if (this.dom.cards[key]) {
                this.dom.cards[key].classList.toggle('active', isActive);
            }

            const def = POLICY_DEFINITIONS[key];
            if (isActive && def && def.upkeep) {
                totalMonthlyUpkeep += def.upkeep;
            }
        }

        const isJa = i18n.getLanguage() === 'ja';
        if (this.dom.activeCount) {
            this.dom.activeCount.textContent = isJa ? `施行中勅令: ${activeCount}件` : `${activeCount} Edicts Enacted`;
        }
        if (this.dom.monthlyCost) {
            this.dom.monthlyCost.textContent = isJa ? `月間財政影響: -¥${totalMonthlyUpkeep}/月` : `-¥${totalMonthlyUpkeep}/mo Fiscal Impact`;
        }

        if (this.state && this.state.banner && typeof this.state.banner.updateEdictsBadge === 'function') {
            this.state.banner.updateEdictsBadge();
        }
    }

    getActiveCount() {
        return Object.values(this.policies).filter(Boolean).length;
    }

    // --- Query methods for simulation engines ---
    isNightWatchActive() {
        return !!this.policies.night_watch;
    }

    isCleanWaterActive() {
        return !!this.policies.clean_water;
    }

    isModernizationSubsidyActive() {
        return !!this.policies.modernization_subsidy;
    }

    getMonthlyFiscalImpact() {
        let upkeep = 0;
        if (this.policies.night_watch) upkeep += POLICY_DEFINITIONS.night_watch.upkeep;
        if (this.policies.clean_water) upkeep += POLICY_DEFINITIONS.clean_water.upkeep;
        return upkeep;
    }

    // ponytail: active edicts serialization & rehydration methods
    getActivePolicies() {
        return { ...this.policies };
    }

    setPolicies(policyObj) {
        if (!policyObj || typeof policyObj !== 'object') return;
        for (const [key, val] of Object.entries(policyObj)) {
            if (this.policies[key] !== undefined) {
                this.policies[key] = !!val;
            }
        }
        this.savePolicies();
        this.updateUI();
    }
}

