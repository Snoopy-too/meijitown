// Project Meiji - Mayor Authentication & Dev Switcher Modal (authModal.js)
// ponytail: minimal DOM modal, direct session check, dev switcher wire-up

export class AuthModal {
    constructor(apiClient, gameState) {
        this.api = apiClient;
        this.game = gameState;
        this.currentUser = null;

        this.ensureDOM();
        this.init();
    }

    ensureDOM() {
        if (!document.getElementById('auth-modal')) {
            const modalHtml = `
            <div id="auth-modal" class="modal-overlay hidden" style="display:none;">
              <div class="modal-card washi-card">
                <h3>Mayor Credentials & Dev Profiles</h3>
                <div class="dev-profiles">
                  <button id="dev-user-fidel" class="btn-wood">👤 Fidel (ID: 1)</button>
                  <button id="dev-user-mia" class="btn-wood">👤 Mia (ID: 2)</button>
                  <button id="dev-user-guest" class="btn-wood">👥 Guest</button>
                </div>
                <button id="auth-modal-close" class="btn-close">Close</button>
              </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }
    }

    init() {
        const btn = document.getElementById('btn-mayor-auth');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.open();
            });
        }
        this.badgeBtn = btn;

        const fidelBtn = document.getElementById('dev-user-fidel');
        if (fidelBtn) {
            fidelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchProfile('fidel');
            });
        }

        const miaBtn = document.getElementById('dev-user-mia');
        if (miaBtn) {
            miaBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchProfile('mia');
            });
        }

        const guestBtn = document.getElementById('dev-user-guest');
        if (guestBtn) {
            guestBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchProfile('guest');
            });
        }

        const closeBtn = document.getElementById('auth-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.close();
            });
        }

        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.close();
            });
        }

        this.checkAuthStatus();
    }

    open() {
        const modal = document.getElementById('auth-modal');
        if (!modal) return;
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.style.zIndex = '10000';
    }

    close() {
        const modal = document.getElementById('auth-modal');
        if (!modal) return;
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }

    async switchProfile(profile) {
        try {
            const data = await this.api.devLogin(profile);
            if (data && data.authenticated) {
                this.currentUser = { id: data.user_id, username: data.username };
                this.updateBadge();
                if (this.game?.showToast) {
                    this.game.showToast(`👤 Mayor: ${data.username} active`);
                }
            } else {
                this.currentUser = null;
                this.updateBadge();
                if (this.game?.showToast) {
                    this.game.showToast('👤 Mayor (Guest) mode active');
                }
            }
            this.close();
        } catch (err) {
            console.error('Dev login switcher error:', err);
            if (this.game?.showToast) {
                this.game.showToast(`Dev switch failed: ${err.message}`, true);
            }
        }
    }

    updateBadge() {
        const btn = document.getElementById('btn-mayor-auth') || this.badgeBtn;
        if (!btn) return;
        if (this.currentUser) {
            btn.textContent = `👤 Mayor: ${this.currentUser.username}`;
            btn.classList.add('logged-in');
        } else {
            btn.textContent = `👤 Mayor (Guest) - Sign In`;
            btn.classList.remove('logged-in');
        }
    }

    async checkAuthStatus() {
        try {
            const data = await this.api.sessionCheck();
            if (data && data.authenticated) {
                this.currentUser = { id: data.user_id, username: data.username };
            } else {
                this.currentUser = null;
            }
            this.updateBadge();
        } catch (e) {
            console.warn('Session status check failed:', e);
            this.currentUser = null;
            this.updateBadge();
        }
    }
}