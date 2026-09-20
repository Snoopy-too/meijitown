// Project Meiji - Top Chronicle Banner & HUD Metrics
// ponytail: native DOM updates for treasury, population, era date, RCI meters & time buttons

import { CONFIG } from '../config.js';
import { audioManager } from '../audioManager.js';
import { i18n } from '../i18n.js';

export class ChronicleBanner {
    constructor(stateManager) {
        this.state = stateManager;

        this.dom = {
            cityName: document.getElementById('val-cityname'),
            treasury: document.getElementById('val-treasury'),
            cashflow: document.getElementById('val-cashflow'),
            population: document.getElementById('val-population'),
            date: document.getElementById('val-date'),
            fillRes: document.getElementById('fill-res'),
            fillCom: document.getElementById('fill-com'),
            fillInd: document.getElementById('fill-ind'),
            valHappiness: document.getElementById('val-happiness'),
            timeButtons: document.querySelectorAll('#time-controls .time-btn'),
            btnAudioMute: document.getElementById('audio-toggle-btn') || document.getElementById('btn-audio-mute'),
            btnLang: document.getElementById('lang-toggle-btn'),
            btnPolicyLedger: document.getElementById('btn-policy-ledger'),
        };

        this.bindTimeControls();
        this.bindAudioControls();
        this.bindLanguageControls();

        if (this.dom.date) {
            this.dom.date.style.cursor = 'pointer';
            this.dom.date.title = 'View Historical Chronicle Ledger [H] / 歴史年代記を開く';
            this.dom.date.addEventListener('click', () => {
                if (this.state && this.state.chronicle) {
                    this.state.chronicle.open();
                }
            });
        }
    }

    bindLanguageControls() {
        if (this.dom.btnLang) {
            this.dom.btnLang.addEventListener('click', () => {
                const newLang = i18n.toggleLanguage();
                this.state.showToast(newLang === 'ja' ? '言語を日本語に切り替えました' : 'Language switched to English');
            });
        }

        window.addEventListener('keydown', (e) => {
            if (e.key === 'l' || e.key === 'L') {
                if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
                if (this.dom.btnLang) {
                    this.dom.btnLang.click();
                }
            }
        });

        i18n.onChange(() => {
            this.update();
            this.updateAudioIcon(audioManager.isMuted);
        });

        i18n.updateDOM();
    }

    updateAudioIcon(isMuted) {
        if (!this.dom.btnAudioMute) return;
        this.dom.btnAudioMute.textContent = isMuted ? i18n.t('hud.audio_mute') : i18n.t('hud.audio_on');
        this.dom.btnAudioMute.title = isMuted ? 'Unmute Sound [M]' : 'Mute Sound [M]';
        if (isMuted) {
            this.dom.btnAudioMute.classList.add('muted');
        } else {
            this.dom.btnAudioMute.classList.remove('muted');
        }
    }

    bindAudioControls() {
        if (!this.dom.btnAudioMute) return;
        this.updateAudioIcon(audioManager.isMuted);

        this.dom.btnAudioMute.addEventListener('click', () => {
            const isMuted = audioManager.toggleMute();
            this.updateAudioIcon(isMuted);
            this.state.showToast(isMuted ? '🔇 Sound Muted' : '🔊 Sound Unmuted');
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'm' || e.key === 'M') {
                if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
                if (this.dom.btnAudioMute) {
                    this.dom.btnAudioMute.click();
                }
            }
        });
    }

    bindTimeControls() {
        if (!this.dom.timeButtons) return;
        this.dom.timeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const speed = parseFloat(btn.dataset.speed);
                if (isNaN(speed)) return;
                if (speed === 0) {
                    this.state.pauseSimulation();
                } else {
                    this.state.setSimulationSpeed(speed);
                }
            });
        });
    }

    updateTimeControlsUI(speed) {
        if (!this.dom.timeButtons) return;
        this.dom.timeButtons.forEach(btn => {
            const btnSpeed = parseFloat(btn.dataset.speed);
            if (btnSpeed === speed) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    update() {
        if (this.dom.cityName) this.dom.cityName.textContent = this.state.cityName;
        if (this.dom.treasury) this.dom.treasury.textContent = `¥${this.state.treasury.toLocaleString()}`;

        if (this.dom.cashflow) {
            const prefix = this.state.lastCashflow >= 0 ? '+¥' : '-¥';
            this.dom.cashflow.textContent = `${prefix}${Math.abs(this.state.lastCashflow)}/mo`;
            this.dom.cashflow.style.color = this.state.lastCashflow >= 0 ? '#3a6332' : '#b33927';
        }

        if (this.dom.population) this.dom.population.textContent = this.state.population.toLocaleString();

        if (this.dom.date) {
            this.dom.date.textContent = i18n.formatEraDate(this.state.currentYear, this.state.currentMonth);
        }

        if (this.dom.fillRes) this.dom.fillRes.style.height = `${this.state.metrics.residentialDemand}%`;
        if (this.dom.fillCom) this.dom.fillCom.style.height = `${this.state.metrics.commercialDemand}%`;
        if (this.dom.fillInd) this.dom.fillInd.style.height = `${this.state.metrics.industrialDemand}%`;

        if (this.dom.valHappiness) {
            const happiness = this.state.metrics.townHappiness !== undefined
                ? this.state.metrics.townHappiness
                : (CONFIG.SIMULATION.DEFAULT_HAPPINESS || 65);
            this.dom.valHappiness.textContent = `${happiness}%`;
            if (happiness > 75) this.dom.valHappiness.style.color = '#3a6332';
            else if (happiness < 40) this.dom.valHappiness.style.color = '#b33927';
            else this.dom.valHappiness.style.color = '#b58900';
        }

        this.updateEdictsBadge();
    }

    updateEdictsBadge() {
        if (!this.dom.btnPolicyLedger) return;
        const pm = this.state.policies || this.state.edictsManager;
        const activeCount = (pm && typeof pm.getActiveCount === 'function') ? pm.getActiveCount() : 0;
        const isNegativeCashflow = (this.state.lastCashflow || 0) < 0;

        const isJa = i18n.getLanguage() === 'ja';
        const label = isJa ? '政策録' : 'Edicts';
        const badge = activeCount > 0 ? ` (${activeCount})` : '';
        this.dom.btnPolicyLedger.innerHTML = `📜 <span>${label}${badge}</span>`;

        if (activeCount > 0) {
            this.dom.btnPolicyLedger.classList.add('edicts-active');
        } else {
            this.dom.btnPolicyLedger.classList.remove('edicts-active');
        }

        if (activeCount > 0 && isNegativeCashflow) {
            this.dom.btnPolicyLedger.classList.add('edicts-cashflow-warning');
            this.dom.btnPolicyLedger.title = isJa
                ? `勅令維持費による赤字警告 [P] (赤字: -¥${Math.abs(this.state.lastCashflow)}/月)`
                : `Civic Edict Deficit Warning [P] (-¥${Math.abs(this.state.lastCashflow)}/mo)`;
        } else {
            this.dom.btnPolicyLedger.classList.remove('edicts-cashflow-warning');
            this.dom.btnPolicyLedger.title = isJa
                ? '政策録・布告 [P]'
                : 'Civic Policies & Imperial Edicts [P]';
        }
    }
}
