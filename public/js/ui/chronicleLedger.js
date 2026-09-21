// Project Meiji - Historical Chronicle & Municipal Ledger Modal (chronicleLedger.js)
// ponytail: interactive date modal, historical event log & high-level municipal statistics

import { i18n } from '../i18n.js';
import { MILESTONE_TIERS } from '../milestoneManager.js';

export class ChronicleLedger {
    constructor(stateManager) {
        this.state = stateManager;
        this.isOpen = false;

        // Ensure state has stats initialized
        if (!this.state.stats) {
            this.state.stats = {
                foundingYear: 1872,
                foundingMonth: 1,
                totalTaxesCollected: 0,
                firesExtinguished: 0,
                peakPopulation: this.state.population || 0,
                recordedEvents: []
            };
        }
        if (!this.state.stats.recordedEvents || this.state.stats.recordedEvents.length === 0) {
            this.state.stats.recordedEvents = [
                {
                    year: this.state.stats.foundingYear || 1872,
                    month: this.state.stats.foundingMonth || 1,
                    textEn: 'Founding of the Edo-Tokyo Meiji Settlement.',
                    textJa: '明治五年一月、江戸東京開拓草創の布告。'
                }
            ];
        }

        const root = this.state?.root || (typeof document !== 'undefined' ? document : null);
        const getEl = (id) => (root && root.getElementById ? root.getElementById(id) : (root && root.querySelector ? root.querySelector('#' + id) : (typeof document !== 'undefined' ? document.getElementById(id) : null)));
        this.dom = {
            modalScrim: getEl('chronicle-ledger-modal'),
            closeBtn: getEl('chronicle-close-btn'),
            dateTrigger: getEl('val-date'),
            foundingDate: getEl('ledger-founding-date'),
            currentDate: getEl('ledger-current-date'),
            statTaxes: getEl('ledger-stat-taxes'),
            statFires: getEl('ledger-stat-fires'),
            statPeakPop: getEl('ledger-stat-peak-pop'),
            chartersList: getEl('ledger-charters-list'),
            eventsList: getEl('ledger-events-list'),
        };

        if (root) {
            this.bindEvents();
        }
    }

    bindEvents() {
        // Date trigger click opens the ledger
        if (this.dom.dateTrigger) {
            this.dom.dateTrigger.style.cursor = 'pointer';
            this.dom.dateTrigger.title = 'Open Historical Chronicle Ledger [H] / 歴史年代記を開く';
            this.dom.dateTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                this.open();
            });
        }

        // Close button
        if (this.dom.closeBtn) {
            this.dom.closeBtn.addEventListener('click', () => this.close());
        }

        // Click outside scrim closes
        if (this.dom.modalScrim) {
            this.dom.modalScrim.addEventListener('click', (e) => {
                if (e.target === this.dom.modalScrim) {
                    this.close();
                }
            });
        }

        // Keyboard 'h' to open/toggle, 'Escape' to close
        if (typeof window !== 'undefined') {
            window.addEventListener('keydown', (e) => {
                if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
                if (e.key === 'h' || e.key === 'H') {
                    if (this.isOpen) this.close();
                    else this.open();
                } else if (e.key === 'Escape' && this.isOpen) {
                    this.close();
                }
            });
        }

        i18n.onChange(() => {
            if (this.isOpen) this.render();
        });
    }

    recordEvent(textEn, textJa) {
        if (!this.state.stats) return;
        this.state.stats.recordedEvents.unshift({
            year: this.state.currentYear,
            month: this.state.currentMonth,
            textEn,
            textJa
        });
        // Keep latest 25 events
        if (this.state.stats.recordedEvents.length > 25) {
            this.state.stats.recordedEvents.pop();
        }
        if (this.isOpen) this.render();
    }

    open() {
        this.isOpen = true;
        this.render();
        if (this.dom.modalScrim) {
            this.dom.modalScrim.style.display = 'flex';
            this.dom.modalScrim.classList.add('visible');
        }
    }

    close() {
        this.isOpen = false;
        if (this.dom.modalScrim) {
            this.dom.modalScrim.classList.remove('visible');
            this.dom.modalScrim.style.display = 'none';
        }
    }

    render() {
        const isJa = i18n.getLanguage() === 'ja';
        const stats = this.state.stats || {};

        // Update peak population
        stats.peakPopulation = Math.max(stats.peakPopulation || 0, this.state.population || 0);

        // Founding Date & Current Date
        if (this.dom.foundingDate) {
            this.dom.foundingDate.textContent = i18n.formatEraDate(stats.foundingYear || 1872, stats.foundingMonth || 1);
        }
        if (this.dom.currentDate) {
            this.dom.currentDate.textContent = i18n.formatEraDate(this.state.currentYear, this.state.currentMonth);
        }

        // Stats
        if (this.dom.statTaxes) {
            this.dom.statTaxes.textContent = `¥${(stats.totalTaxesCollected || 0).toLocaleString()}`;
        }
        if (this.dom.statFires) {
            this.dom.statFires.textContent = (stats.firesExtinguished || 0).toLocaleString();
        }
        if (this.dom.statPeakPop) {
            this.dom.statPeakPop.textContent = `${(stats.peakPopulation || 0).toLocaleString()} ${isJa ? '人' : 'citizens'}`;
        }

        // Imperial Charters Earned
        if (this.dom.chartersList) {
            this.dom.chartersList.innerHTML = '';
            const claimed = (this.state.milestones && this.state.milestones.claimedTiers) || [1];

            MILESTONE_TIERS.forEach(tier => {
                const isEarned = claimed.includes(tier.id);
                const li = document.createElement('li');
                li.className = isEarned ? 'charter-item earned' : 'charter-item unearned';

                const icon = isEarned ? '📜' : '🔒';
                const name = isJa ? tier.nameJa : tier.nameEn;
                const status = isEarned ? (isJa ? '勅許授与済' : 'Decreed') : (isJa ? `未達成 (${tier.popMin}人以上)` : `Locked (${tier.popMin}+ pop)`);

                li.innerHTML = `
                    <div class="charter-badge">${icon} ${name}</div>
                    <div class="charter-status">${status}</div>
                `;
                this.dom.chartersList.appendChild(li);
            });
        }

        // Historic Events Log
        if (this.dom.eventsList) {
            this.dom.eventsList.innerHTML = '';
            const events = stats.recordedEvents || [];
            if (events.length === 0) {
                const li = document.createElement('li');
                li.className = 'event-empty';
                li.textContent = isJa ? '記録された歴史的事件はありません' : 'No recorded historical events yet.';
                this.dom.eventsList.appendChild(li);
            } else {
                events.forEach(ev => {
                    const li = document.createElement('li');
                    li.className = 'event-item';
                    const eraStr = i18n.formatEraDate(ev.year, ev.month);
                    const desc = isJa ? (ev.textJa || ev.textEn) : (ev.textEn || ev.textJa);
                    li.innerHTML = `
                        <span class="event-date">${eraStr}</span>
                        <span class="event-desc">${desc}</span>
                    `;
                    this.dom.eventsList.appendChild(li);
                });
            }
        }
    }
}
