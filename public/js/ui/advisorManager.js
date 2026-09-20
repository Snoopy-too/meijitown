// Project Meiji - Beginner Municipal Advisor Guidance System (advisorManager.js)
// ponytail: lightweight 2-month state evaluator, contextual alerts & interactive action triggers (< 250 lines)

import { i18n } from '../i18n.js';
import { SOUND } from '../fx.js';

export class AdvisorManager {
    constructor(stateManager) {
        this.state = stateManager;
        this.enabled = this.loadPreference();
        this.lastEvaluationMonth = 0;
        this.consecutiveNegativeMonths = 0;
        this.treasuryHistory = [];
        this.cooldowns = {};
        this.activeNotification = null;

        this.dom = null;
        if (typeof document !== 'undefined') {
            this.initDOM();
            this.bindEvents();
        }
    }

    loadPreference() {
        try {
            if (typeof localStorage !== 'undefined') {
                const val = localStorage.getItem('meiji_advisor_enabled');
                return val !== null ? val === 'true' : true;
            }
        } catch (_) {}
        return true;
    }

    setPreference(enabled) {
        this.enabled = Boolean(enabled);
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('meiji_advisor_enabled', String(this.enabled));
            }
        } catch (_) {}
        if (this.dom && this.dom.toggleCheckbox) {
            this.dom.toggleCheckbox.checked = this.enabled;
        }
        if (!this.enabled) {
            this.hide();
        }
    }

    initDOM() {
        let container = document.getElementById('advisor-notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'advisor-notification-container';
            container.className = 'advisor-container washi-card hidden';
            container.innerHTML = `
                <div class="advisor-header">
                    <span class="advisor-avatar">🧑‍💼</span>
                    <span class="advisor-title" data-i18n="advisor.title">Municipal Advisor</span>
                    <button class="advisor-close-btn" id="advisor-btn-dismiss-x" title="Dismiss">✕</button>
                </div>
                <div class="advisor-body" id="advisor-message-body"></div>
                <div class="advisor-actions">
                    <button class="advisor-btn-action" id="advisor-btn-open-edicts">📜 <span data-i18n="advisor.open_edicts">Open Edicts</span></button>
                    <button class="advisor-btn-dismiss" id="advisor-btn-dismiss">✕ <span data-i18n="advisor.dismiss">Dismiss</span></button>
                </div>
            `;
            document.body.appendChild(container);
        }

        this.dom = {
            container,
            message: document.getElementById('advisor-message-body'),
            btnOpenEdicts: document.getElementById('advisor-btn-open-edicts'),
            btnDismiss: document.getElementById('advisor-btn-dismiss'),
            btnCloseX: document.getElementById('advisor-btn-dismiss-x'),
            toggleCheckbox: document.getElementById('toggle-advisor-guidance')
        };

        if (this.dom.toggleCheckbox) {
            this.dom.toggleCheckbox.checked = this.enabled;
        }
    }

    bindEvents() {
        this.dom.btnOpenEdicts?.addEventListener('click', () => {
            this.hide();
            const pm = this.state.policies || this.state.edictsManager;
            if (pm && typeof pm.open === 'function') {
                pm.open();
            }
        });

        this.dom.btnDismiss?.addEventListener('click', () => this.hide());
        this.dom.btnCloseX?.addEventListener('click', () => this.hide());

        if (this.dom.toggleCheckbox) {
            this.dom.toggleCheckbox.addEventListener('change', (e) => {
                this.setPreference(e.target.checked);
                const isJa = i18n.getLanguage() === 'ja';
                this.state.showToast?.(
                    this.enabled
                        ? (isJa ? '助言役の案内を有効にしました' : 'Advisor Guidance Enabled')
                        : (isJa ? '助言役の案内を無効にしました' : 'Advisor Guidance Disabled')
                );
            });
        }
    }

    show(key, textEn, textJa) {
        if (!this.enabled) return;
        const totalMonths = (this.state.currentYear || 1872) * 12 + (this.state.currentMonth || 1);
        if (this.cooldowns[key] && totalMonths < this.cooldowns[key]) {
            return;
        }
        this.cooldowns[key] = totalMonths + 4; // 4-month debounce cooldown
        this.activeNotification = { key, textEn, textJa };

        if (this.dom && this.dom.container && this.dom.message) {
            const isJa = i18n.getLanguage() === 'ja';
            this.dom.message.textContent = isJa ? textJa : textEn;
            this.dom.container.classList.remove('hidden');
            SOUND?.playWoodClack?.();
        }
    }

    hide() {
        this.activeNotification = null;
        if (this.dom && this.dom.container) {
            this.dom.container.classList.add('hidden');
        }
    }

    evaluate() {
        if (!this.enabled) return null;

        const month = this.state.currentMonth || 1;
        const totalMonths = (this.state.currentYear || 1872) * 12 + month;

        // Cashflow tracking
        if ((this.state.lastCashflow || 0) < 0) {
            this.consecutiveNegativeMonths++;
        } else {
            this.consecutiveNegativeMonths = 0;
        }

        // Treasury drop history tracking
        this.treasuryHistory.push({ totalMonths, treasury: this.state.treasury || 0 });
        if (this.treasuryHistory.length > 3) this.treasuryHistory.shift();

        // 2-month evaluation cadence
        if (this.lastEvaluationMonth > 0 && (totalMonths - this.lastEvaluationMonth < 2)) {
            return null;
        }
        this.lastEvaluationMonth = totalMonths;

        const pm = this.state.policies || this.state.edictsManager;
        if (!pm) return null;

        // 1. Dry Season Fire Risk (Winter: Nov, Dec, Jan, Feb)
        const isWinter = (month === 11 || month === 12 || month === 1 || month === 2);
        const isNightWatchActive = pm.isNightWatchActive ? pm.isNightWatchActive() : false;
        if (isWinter && !isNightWatchActive && this.hasDenseWoodenMachiya()) {
            const textEn = "Dry winter winds threaten wooden wards! Enacting Night Watch (Yakin) reduces outbreak chance by 40%.";
            const textJa = "冬の乾いた風が木造長屋町を脅かしています！「夜番火の用心」を布告して火災発生を40%低減させましょう。";
            this.show('dry_season_fire', textEn, textJa);
            return 'dry_season_fire';
        }

        // 2. Fiscal Bleed (2 consecutive negative months and active edicts > 0)
        const activeCount = pm.getActiveCount ? pm.getActiveCount() : 0;
        if (this.consecutiveNegativeMonths >= 2 && activeCount > 0) {
            const textEn = "Civic upkeep exceeds tax revenue! Review active edicts to curb treasury drain.";
            const textJa = "勅令の維持費が税収を超過しています！政策録を見直し、国庫の流出を抑えてください。";
            this.show('fiscal_bleed', textEn, textJa);
            return 'fiscal_bleed';
        }

        // 3. Rapid Modernization Subsidy Drain (Subsidy active and treasury dropped > ¥150)
        const isSubsidyActive = pm.isModernizationSubsidyActive ? pm.isModernizationSubsidyActive() : false;
        if (isSubsidyActive && this.treasuryHistory.length >= 2) {
            const startTreasury = this.treasuryHistory[0].treasury;
            const currentTreasury = this.state.treasury || 0;
            if (startTreasury - currentTreasury > 150) {
                const textEn = "Brick subsidies are draining reserves rapidly! Consider pausing Bunmei Kaika until coffers recover.";
                const textJa = "煉瓦助成金が国庫を急激に圧迫しています！蓄えが回復するまで文明開化助成の一時停止をご検討ください。";
                this.show('subsidy_drain', textEn, textJa);
                return 'subsidy_drain';
            }
        }

        return null;
    }

    hasDenseWoodenMachiya() {
        if (!this.state.grid || !this.state.grid.tiles) return false;
        let woodenCount = 0;
        for (const [_, tile] of this.state.grid.tiles.entries()) {
            // Zone residential built
            if (tile.type === 2 && tile.zoneType === 1 && tile.stage === 3) {
                if (tile.buildingType !== 'brick' && tile.buildingType !== 'kura') {
                    woodenCount++;
                    if (woodenCount >= 3) return true;
                }
            }
        }
        return woodenCount >= 3;
    }
}
