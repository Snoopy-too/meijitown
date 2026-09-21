// Project Meiji - Beginner Municipal Advisor Guidance System (advisorManager.js)
// ponytail: lightweight 2-month state evaluator, contextual alerts & interactive action triggers (< 250 lines)

import { CONFIG } from '../config.js';
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
            container.innerHTML = `<div class="advisor-header"><span class="advisor-avatar">🧑‍💼</span><span class="advisor-title" data-i18n="advisor.title">Municipal Advisor</span><button class="advisor-close-btn" id="advisor-btn-dismiss-x" title="Dismiss">✕</button></div><div class="advisor-body" id="advisor-message-body"></div><div class="advisor-actions"><button class="advisor-btn-action" id="advisor-btn-open-edicts">📜 <span data-i18n="advisor.open_edicts">Open Edicts</span></button><button class="advisor-btn-dismiss" id="advisor-btn-dismiss">✕ <span data-i18n="advisor.dismiss">Dismiss</span></button></div>`;
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
        if (this.dom.toggleCheckbox) this.dom.toggleCheckbox.checked = this.enabled;
    }

    bindEvents() {
        this.dom.btnOpenEdicts?.addEventListener('click', () => {
            this.hide();
            const pm = this.state.policies || this.state.edictsManager;
            if (pm && typeof pm.open === 'function') pm.open();
        });
        this.dom.btnDismiss?.addEventListener('click', () => this.hide());
        this.dom.btnCloseX?.addEventListener('click', () => this.hide());

        if (this.dom.toggleCheckbox) {
            this.dom.toggleCheckbox.addEventListener('change', (e) => {
                this.setPreference(e.target.checked);
                const isJa = i18n.getLanguage() === 'ja';
                this.state.showToast?.(this.enabled ? (isJa ? '助言役の案内を有効にしました' : 'Advisor Guidance Enabled') : (isJa ? '助言役の案内を無効にしました' : 'Advisor Guidance Disabled'));
            });
        }
    }

    show(key, textEn, textJa) {
        if (!this.enabled) return;
        const totalMonths = (this.state.currentYear || 1872) * 12 + (this.state.currentMonth || 1);
        if (this.cooldowns[key] && totalMonths < this.cooldowns[key]) return;
        this.cooldowns[key] = totalMonths + 4; // 4-month debounce cooldown
        this.activeNotification = { key, textEn, textJa };

        const msg = i18n.getLanguage() === 'ja' ? textJa : textEn;
        if (this.dom?.container && this.dom?.message) {
            this.dom.message.textContent = msg;
            this.dom.container.classList.remove('hidden');
            SOUND?.playWoodClack?.();
        }
        if (typeof this.state?.showToast === 'function') {
            this.state.showToast(`🧑‍💼 ${msg}`, true);
        }
    }

    hide() {
        this.activeNotification = null;
        if (this.dom?.container) this.dom.container.classList.add('hidden');
    }

    evaluate() {
        if (!this.enabled) return null;
        const month = this.state.currentMonth || 1;
        const totalMonths = (this.state.currentYear || 1872) * 12 + month;

        this.consecutiveNegativeMonths = ((this.state.lastCashflow || 0) < 0) ? this.consecutiveNegativeMonths + 1 : 0;
        this.treasuryHistory.push({ totalMonths, treasury: this.state.treasury || 0 });
        if (this.treasuryHistory.length > 3) this.treasuryHistory.shift();

        if (this.lastEvaluationMonth > 0 && (totalMonths - this.lastEvaluationMonth < 2)) return null;
        this.lastEvaluationMonth = totalMonths;

        const pm = this.state.policies || this.state.edictsManager;

        // 1. Dry Season Fire Risk (Winter: Nov, Dec, Jan, Feb)
        const isWinter = (month === 11 || month === 12 || month === 1 || month === 2);
        if (isWinter && !(pm?.isNightWatchActive?.() || false) && this.hasDenseWoodenMachiya()) {
            this.show('dry_season_fire', "Dry winter winds threaten wooden wards! Enacting Night Watch (Yakin) reduces outbreak chance by 40%.", "冬の乾いた風が木造長屋町を脅かしています！「夜番火の用心」を布告して火災発生を40%低減させましょう。");
            return 'dry_season_fire';
        }

        // 2. Fiscal Bleed (2 consecutive negative months and active edicts > 0)
        if (this.consecutiveNegativeMonths >= 2 && (pm?.getActiveCount?.() || 0) > 0) {
            this.show('fiscal_bleed', "Civic upkeep exceeds tax revenue! Review active edicts to curb treasury drain.", "勅令の維持費が税収を超過しています！政策録を見直し、国庫の流出を抑えてください。");
            return 'fiscal_bleed';
        }

        // 3. Rapid Modernization Subsidy Drain
        if ((pm?.isModernizationSubsidyActive?.() || false) && this.treasuryHistory.length >= 2) {
            if ((this.treasuryHistory[0].treasury - (this.state.treasury || 0)) > 150) {
                this.show('subsidy_drain', "Brick subsidies are draining reserves rapidly! Consider pausing Bunmei Kaika until coffers recover.", "煉瓦助成金が国庫を急激に圧迫しています！蓄えが回復するまで文明開化助成の一時停止をご検討ください。");
                return 'subsidy_drain';
            }
        }

        // 4. Citizen Expectation Deficits
        const deficit = this.checkExpectations();
        const DEFICIT_MSGS = {
            order_deficit: ["Rising crime and unpatrolled streets! Build a Police Box (Kōban) to secure growing wards.", "治安悪化と夜盗被害の訴え！交番・派出所を設置して町を警ら巡回し、商業と町民の安全を守ってください。"],
            education_deficit: ["Education deficit in modern wards! Construct a Primary School (Shōgakkō) to satisfy children's schooling.", "近代区画で就学難の声！尋常小学校を設立し、児童の教育と帳簿人材の育成を進めてください。"],
            sanitation_deficit: ["Severe water shortage! Dig Communal Wells (Ido) or expand Waterworks to prevent cholera outbreaks.", "生活用水の欠乏！共同井戸を掘るか加圧上水を配備して清浄な飲料水を確保し、コレラを防いでください。"],
            leisure_deficit: ["Citizens lament cultural exhaustion! Build Public Bathhouses (Sentō) or Teahouses (Ochaya) to lift morale.", "町民が娯楽と休息の不足を訴えています！銭湯や伝統茶屋を開いて日々の労苦を癒やしてください。"]
        };
        if (deficit && DEFICIT_MSGS[deficit]) {
            this.show(deficit, DEFICIT_MSGS[deficit][0], DEFICIT_MSGS[deficit][1]);
            return deficit;
        }

        return null;
    }

    checkExpectations() {
        if (!this.state.grid?.tiles || !this.state.simulation) return null;
        let [unwatered, l2Total, l2Unpatrolled, l3Total, l3Uneducated, resTotal, noLeisure] = [0, 0, 0, 0, 0, 0, 0];
        const schoolSys = this.state.schoolSystem || this.state.simulation?.schoolSystem;

        for (const [_, tile] of this.state.grid.tiles.entries()) {
            const isZone = tile.type === CONFIG.TYPES.ZONE || tile.type === 2;
            const isBuilt = tile.stage === CONFIG.STAGES.BUILT || tile.stage === 3;
            if (!isZone || !isBuilt) continue;

            const isRes = tile.zoneType === CONFIG.ZONES.RESIDENTIAL || tile.zoneType === 1;
            const lvl = tile.level || 1;

            if (isRes) {
                resTotal++;
                if (!this.state.simulation.isWellCovered(tile.x, tile.y)) unwatered++;
                const hasL = this.state.simulation.isEntertainmentCovered?.(tile.x, tile.y) || this.state.simulation.isShrineCovered?.(tile.x, tile.y);
                if (!hasL) noLeisure++;
            }
            if (lvl >= 2) {
                l2Total++;
                if (!this.state.simulation.isOrderCovered(tile.x, tile.y)) l2Unpatrolled++;
            }
            if (lvl >= 3) {
                l3Total++;
                const hasEdu = schoolSys ? (schoolSys.isEducationCovered(tile.x, tile.y) || schoolSys.isSchoolAdjacent(tile.x, tile.y)) : false;
                if (!hasEdu) l3Uneducated++;
            }
        }

        if (l2Total >= 3 && (l2Unpatrolled / l2Total) >= 0.35) return 'order_deficit';
        if (l3Total >= 2 && (l3Uneducated / l3Total) >= 0.40) return 'education_deficit';
        if (unwatered >= 2) return 'sanitation_deficit';
        if ((this.state.population || 0) >= 120 && resTotal >= 5 && (noLeisure / resTotal) >= 0.50) return 'leisure_deficit';
        return null;
    }

    checkOrderDeficit() { return this.checkExpectations() === 'order_deficit'; }
    checkEducationDeficit() { return this.checkExpectations() === 'education_deficit'; }
    checkSanitationDeficit() { return this.checkExpectations() === 'sanitation_deficit'; }
    checkLeisureDeficit() { return this.checkExpectations() === 'leisure_deficit'; }

    hasDenseWoodenMachiya() {
        if (!this.state.grid?.tiles) return false;
        let c = 0;
        for (const [_, t] of this.state.grid.tiles.entries()) {
            const isRes = t.type === CONFIG.TYPES.ZONE ? t.zoneType === CONFIG.ZONES.RESIDENTIAL : (t.type === 2 && t.zoneType === 1);
            if (isRes && (t.stage === CONFIG.STAGES.BUILT || t.stage === 3) && (t.level || 1) === 1 && t.buildingType !== 'brick' && t.buildingType !== 'kura') {
                if (++c >= 3) return true;
            }
        }
        return false;
    }
}
