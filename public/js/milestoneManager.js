// Project Meiji - Settlement Milestones & Historical Eras Engine (milestoneManager.js)
// ponytail: deterministic thresholds, charter grants & capstone pavilion triumph (< 300 lines)

import { CONFIG } from './config.js';
import { SOUND } from './fx.js';
import { i18n } from './i18n.js';

export const MILESTONE_TIERS = [
    {
        id: 1,
        nameEn: 'Outpost Village (Mura)',
        nameJa: '草創の村 (村)',
        popMin: 0,
        popMax: 100,
        grant: 0,
        featuresEn: ['Basic dirt roads & rice paddies', 'Traditional Machiya & Craft Workshops', 'Surveyor Scope & Land Clearance'],
        featuresJa: ['往来土道・灌漑水田', '伝統的長屋・町家・職人工房', '測量手帳・区画整理'],
        badgeEn: 'Village (T1)',
        badgeJa: '村 (第1段階)'
    },
    {
        id: 2,
        nameEn: 'Bustling Post Town (Shukuba-machi)',
        nameJa: '活況の宿場町 (宿場町)',
        popMin: 100,
        popMax: 300,
        grant: 1000,
        featuresEn: ['Canal Waterways & Stone Paving firebreaks', 'Communal Wells & Fire Depots', 'Traditional Teahouses & Shrine Parks'],
        featuresJa: ['通船堀水路・石畳防火帯', '共同井戸・消防屯所・火の見櫓', '伝統茶屋・神社鎮守の杜'],
        badgeEn: 'Town (T2)',
        badgeJa: '宿場町 (第2段階)'
    },
    {
        id: 3,
        nameEn: 'Industrial District (Kōgyō-chiku)',
        nameJa: '殖産興業区 (工業地区)',
        popMin: 300,
        popMax: 600,
        grant: 2500,
        featuresEn: ['Iron Rail Tracks & Train Depots', 'Police Box (Kōban) & Primary Schools', 'Telegraph Network, Cargo Piers & Bathhouses'],
        featuresJa: ['鉄道路線・停車場', '警視庁交番派出所・尋常小学校', '電信分局・港湾船着場・銭湯'],
        badgeEn: 'District (T3)',
        badgeJa: '工業地区 (第3段階)'
    },
    {
        id: 4,
        nameEn: 'Modern Imperial City (Daitokai)',
        nameJa: '帝都近代都市 (大都会)',
        popMin: 600,
        popMax: Infinity,
        grant: 5000,
        featuresEn: ['Coal Steam Power Plants & Electrical Grid', 'Water Filtration Basins & Piped Sanitation', 'Western Brick Architecture & National Exposition Pavilion'],
        featuresJa: ['石炭火力発電所・送電網', '加圧浄水場・沈殿池上水網', '西洋銀座風煉瓦街・内国勧業博覧会パビリオン'],
        badgeEn: 'Metropolis (T4)',
        badgeJa: '大都会 (第4段階)'
    }
];

export class MilestoneManager {
    constructor(stateManager) {
        this.state = stateManager;
        this.currentTier = 1;
        this.pendingTier = null;
        this.hasTriumphCompleted = false;

        this.storageKey = `meiji_claimed_milestones_${this.state.cityId || 1}`;
        this.plaqueKey = `meiji_hof_plaque_${this.state.cityId || 1}`;
        try {
            const raw = localStorage.getItem(this.storageKey);
            this.claimedTiers = raw ? JSON.parse(raw) : [1];
            this.hasTriumphCompleted = !!localStorage.getItem(this.plaqueKey);
        } catch (_) {
            this.claimedTiers = [1];
            this.hasTriumphCompleted = false;
        }

        const root = this.state?.root || (typeof document !== 'undefined' ? document : null);
        const getEl = (id) => (root && root.getElementById ? root.getElementById(id) : (root && root.querySelector ? root.querySelector('#' + id) : (typeof document !== 'undefined' ? document.getElementById(id) : null)));

        this.dom = {
            badge: getEl('val-tier-badge'),
            modalScrim: getEl('milestone-modal-scrim'),
            modalTitle: getEl('milestone-title'),
            modalBody: getEl('milestone-body'),
            featuresList: getEl('milestone-features-list'),
            rewardVal: getEl('milestone-reward-val'),
            claimBtn: getEl('btn-milestone-claim'),
            triumphScrim: getEl('triumph-modal-scrim'),
            triumphCloseBtn: getEl('btn-triumph-close'),
        };

        this.bindEvents();
        this.updateBadge();
        i18n.onChange(() => this.updateBadge());
    }

    bindEvents() {
        if (this.dom.claimBtn) {
            this.dom.claimBtn.addEventListener('click', () => this.claimPendingGrant());
        }
        if (this.dom.triumphCloseBtn) {
            this.dom.triumphCloseBtn.addEventListener('click', () => {
                if (this.dom.triumphScrim) this.dom.triumphScrim.classList.remove('visible');
            });
        }
    }

    get grid() { return this.state.grid; }

    getTierForPopulation(pop) {
        for (let i = MILESTONE_TIERS.length - 1; i >= 0; i--) {
            if (pop >= MILESTONE_TIERS[i].popMin) return MILESTONE_TIERS[i];
        }
        return MILESTONE_TIERS[0];
    }

    checkPopulation(population) {
        const tier = this.getTierForPopulation(population);
        if (tier.id > this.currentTier) {
            this.currentTier = tier.id;
            this.updateBadge();
            if (!this.claimedTiers.includes(tier.id)) this.showCelebration(tier);
        } else if (tier.id !== this.currentTier) {
            this.currentTier = tier.id;
            this.updateBadge();
        }
    }

    showCelebration(tier) {
        this.pendingTier = tier;
        const isJa = i18n.getLanguage() === 'ja';
        if (this.dom.modalTitle) this.dom.modalTitle.textContent = isJa ? tier.nameJa : tier.nameEn;
        if (this.dom.modalBody) {
            this.dom.modalBody.textContent = isJa
                ? `集落人口が ${tier.popMin} 名を突破し、街は新たな繁栄の時代「${tier.nameJa}」へと進展しました！太政官政府より開拓勅令が交付されます。`
                : `Settlement population reached ${tier.popMin}! Advancing to "${tier.nameEn}". The Meiji government grants an Imperial Charter.`;
        }
        if (this.dom.featuresList) {
            this.dom.featuresList.innerHTML = '';
            const list = isJa ? tier.featuresJa : tier.featuresEn;
            for (const item of list) {
                const li = document.createElement('li');
                li.textContent = item;
                this.dom.featuresList.appendChild(li);
            }
        }
        if (this.dom.rewardVal) this.dom.rewardVal.textContent = `+¥${tier.grant.toLocaleString()}`;
        if (this.dom.modalScrim) this.dom.modalScrim.classList.add('visible');
        if (this.dom.badge) this.dom.badge.classList.add('tier-glow');
        SOUND.playNewYearBell();
    }

    claimPendingGrant() {
        if (this.pendingTier) {
            if (this.pendingTier.grant > 0) {
                this.state.treasury += this.pendingTier.grant;
                this.state.updateHUD();
                this.state.showToast(`Charter grant accepted: +¥${this.pendingTier.grant.toLocaleString()} added to Treasury!`);
            }
            if (!this.claimedTiers.includes(this.pendingTier.id)) {
                this.claimedTiers.push(this.pendingTier.id);
                try { localStorage.setItem(this.storageKey, JSON.stringify(this.claimedTiers)); } catch (_) {}
                if (this.state.chronicle?.recordEvent) {
                    this.state.chronicle.recordEvent(`Settlement achieved ${this.pendingTier.nameEn} charter status.`, `集落が「${this.pendingTier.nameJa}」の勅許特例地位を達成。`);
                }
            }
            this.pendingTier = null;
        }
        if (this.dom.modalScrim) this.dom.modalScrim.classList.remove('visible');
        if (this.dom.badge) this.dom.badge.classList.remove('tier-glow');
    }

    // --- End-Game Capstone: National Industrial Exhibition Pavilion (Hakurankai) ---
    isPavilionUnlocked() {
        const pop = this.state.population || 0;
        if (this.currentTier < 4 && pop < 600) return false;
        if (!this.grid?.tiles) return false;
        let [rail, telegraph, pier] = [false, false, false];
        for (const [_, t] of this.grid.tiles.entries()) {
            if (t.type === CONFIG.TYPES.RAIL || t.serviceType === CONFIG.SERVICES.TRAIN_DEPOT) rail = true;
            if (t.serviceType === CONFIG.SERVICES.TELEGRAPH || t.hasTelegraph) telegraph = true;
            if (t.serviceType === CONFIG.SERVICES.HARBOR_PIER) pier = true;
            if (rail && telegraph && pier) break;
        }
        return rail && telegraph && pier;
    }

    canPlacePavilion(ox, oy) {
        if (!this.isPavilionUnlocked()) return false;
        for (let dy = 0; dy < 3; dy++) {
            for (let dx = 0; dx < 3; dx++) {
                if (!this.grid.isValidCoord(ox + dx, oy + dy)) return false;
                const t = this.grid.getTile(ox + dx, oy + dy);
                if (t.occupied || t.type === CONFIG.TYPES.ROAD || t.type === CONFIG.TYPES.SERVICE || t.type === CONFIG.TYPES.RAIL || t.type === CONFIG.TYPES.CANAL) return false;
            }
        }
        return true;
    }

    placePavilion(ox, oy, rotation = 0) {
        if (!this.canPlacePavilion(ox, oy)) {
            this.state.showToast("Exhibition Pavilion requires Tier 4 Metropolis (Pop 600+, Rail, Telegraph, Pier) and a clear 3×3 plot!", true);
            return false;
        }
        const cost = CONFIG.COSTS.PAVILION || 6000;
        if (!this.state.deductTreasury(cost)) {
            this.state.showToast(`Insufficient funds for Pavilion (¥${cost} needed)!`, true);
            return false;
        }
        for (let dy = 0; dy < 3; dy++) {
            for (let dx = 0; dx < 3; dx++) {
                this.grid.setTile(ox + dx, oy + dy, CONFIG.TYPES.SERVICE, null, 1, true, CONFIG.STAGES.SCAFFOLDING, 1, false, null, rotation);
                const t = this.grid.getTile(ox + dx, oy + dy);
                t.serviceType = CONFIG.SERVICES.PAVILION;
                t.isOrigin = (dx === 0 && dy === 0);
                t.multiSize = 3;
                t.originX = ox;
                t.originY = oy;
                t.constructionMonths = 0;
                t.targetMonths = CONFIG.SIMULATION.PAVILION_CONSTRUCTION_MONTHS || 6;
                this.grid.notifyChange(ox + dx, oy + dy);
            }
        }
        SOUND.playBellChime();
        this.state.showToast(`🏛️ Broke ground on National Industrial Exhibition Pavilion! [-¥${cost}]`);
        return true;
    }

    clearPavilionAt(x, y) {
        const tile = this.grid.getTile(x, y);
        if (!tile || tile.serviceType !== CONFIG.SERVICES.PAVILION) return false;
        const ox = tile.originX ?? x;
        const oy = tile.originY ?? y;
        for (let dy = 0; dy < 3; dy++) {
            for (let dx = 0; dx < 3; dx++) {
                if (this.grid.isValidCoord(ox + dx, oy + dy)) this.grid.clearTile(ox + dx, oy + dy);
            }
        }
        return true;
    }

    progressPavilionConstruction() {
        if (!this.grid?.tiles) return;
        for (const [_, tile] of this.grid.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.SERVICE && tile.serviceType === CONFIG.SERVICES.PAVILION && tile.isOrigin && tile.stage === CONFIG.STAGES.SCAFFOLDING) {
                tile.constructionMonths = (tile.constructionMonths || 0) + 1;
                const target = tile.targetMonths || 6;
                if (tile.constructionMonths >= target) {
                    const ox = tile.originX ?? tile.x;
                    const oy = tile.originY ?? tile.y;
                    for (let dy = 0; dy < 3; dy++) {
                        for (let dx = 0; dx < 3; dx++) {
                            const part = this.grid.getTile(ox + dx, oy + dy);
                            if (part) { part.stage = CONFIG.STAGES.BUILT; this.grid.notifyChange(ox + dx, oy + dy); }
                        }
                    }
                    this.completeTriumph();
                } else {
                    this.state.showToast(`🏛️ Pavilion Construction: Month ${tile.constructionMonths}/${target} completed.`);
                }
            }
        }
    }

    completeTriumph() {
        this.hasTriumphCompleted = true;
        try {
            localStorage.setItem(this.plaqueKey, JSON.stringify({
                date: new Date().toISOString(),
                year: this.state.currentYear || 1878,
                pop: this.state.population || 600,
                mayor: 'Imperial Mayor'
            }));
        } catch (_) {}
        if (this.state.chronicle?.recordEvent) {
            this.state.chronicle.recordEvent(
                "National Industrial Exhibition Pavilion completed: Imperial Meiji Restoration Triumph achieved!",
                "内国勧業博覧会パビリオン落成：明治文明開化の偉業を達成！"
            );
        }
        this.showTriumphModal();
        SOUND.playNewYearBell();
    }

    showTriumphModal() {
        if (this.dom.triumphScrim) this.dom.triumphScrim.classList.add('visible');
        this.state.showToast("🏆 Grand Triumph: The National Industrial Exhibition is now open!", false);
    }

    updateBadge() {
        if (this.state?.drawer?.updateTownTier) this.state.drawer.updateTownTier(this.currentTier);
        if (!this.dom.badge) return;
        const tier = MILESTONE_TIERS.find(t => t.id === this.currentTier) || MILESTONE_TIERS[0];
        const isJa = i18n.getLanguage() === 'ja';
        this.dom.badge.textContent = isJa ? tier.badgeJa : tier.badgeEn;
        this.dom.badge.title = isJa ? `集落発展段階: ${tier.nameJa}` : `Settlement Tier: ${tier.nameEn}`;
    }

    reset() {
        this.currentTier = 1;
        this.claimedTiers = [1];
        this.hasTriumphCompleted = false;
        try {
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.plaqueKey);
        } catch (_) {}
        this.updateBadge();
    }
}
