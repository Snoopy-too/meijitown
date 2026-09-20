// Project Meiji - Stylized Washi Confirmation Modal Service (modalManager.js)
// ponytail: promise-based modal service replacing window.confirm/alert (< 100 lines)

export class ModalManager {
    constructor() {
        this.dom = null;
        this.activeResolve = null;
    }

    ensureDOM() {
        if (this.dom) return this.dom;
        let overlay = document.getElementById('confirmation-modal');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'confirmation-modal';
            overlay.className = 'modal-overlay hidden';
            overlay.style.display = 'none';
            overlay.innerHTML = `
                <div class="modal-card washi-card confirmation-card">
                    <div id="confirm-modal-icon" class="modal-seal" style="font-size: 2.2rem; margin-bottom: 8px;">⛩️</div>
                    <h3 id="confirm-modal-title" style="margin-top: 0;"></h3>
                    <p id="confirm-modal-message" class="confirm-modal-message" style="margin: 14px 0 12px; font-size: 0.92rem; line-height: 1.5; color: #3c2a1d; white-space: pre-line;"></p>
                    <div id="confirm-modal-input-container" style="display: none; margin-bottom: 18px;">
                        <input type="text" id="confirm-modal-input" maxlength="40" style="width: 85%; padding: 8px 12px; font-family: inherit; font-size: 1rem; border: 1.5px solid #8c7355; border-radius: 4px; background: #fffdf9; color: #2b1f14; text-align: center;" />
                    </div>
                    <div class="modal-actions" style="display: flex; gap: 12px; justify-content: center;">
                        <button id="confirm-modal-cancel" class="btn-wood-cancel">Cancel</button>
                        <button id="confirm-modal-ok" class="btn-wood-confirm">Confirm</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
        }

        this.dom = {
            overlay,
            icon: document.getElementById('confirm-modal-icon'),
            title: document.getElementById('confirm-modal-title'),
            message: document.getElementById('confirm-modal-message'),
            inputContainer: document.getElementById('confirm-modal-input-container'),
            input: document.getElementById('confirm-modal-input'),
            cancelBtn: document.getElementById('confirm-modal-cancel'),
            okBtn: document.getElementById('confirm-modal-ok'),
        };

        this.dom.cancelBtn?.addEventListener('click', () => this.resolve(false));
        this.dom.okBtn?.addEventListener('click', () => {
            if (this.isPromptMode) {
                const val = (this.dom.input?.value || '').trim();
                this.resolve(val || this.defaultPromptValue || '');
            } else {
                this.resolve(true);
            }
        });
        this.dom.input?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.dom.okBtn?.click();
            }
        });
        this.dom.overlay.addEventListener('click', (e) => {
            if (e.target === this.dom.overlay) this.resolve(false);
        });

        return this.dom;
    }

    resolve(value) {
        if (this.dom?.overlay) {
            this.dom.overlay.classList.add('hidden');
            this.dom.overlay.style.display = 'none';
        }
        if (this.activeResolve) {
            const cb = this.activeResolve;
            this.activeResolve = null;
            cb(value);
        }
    }

    confirm({ title = 'Confirm', message = '', confirmText = 'Confirm', cancelText = 'Cancel', icon = '⛩️' }) {
        this.ensureDOM();
        this.isPromptMode = false;
        if (this.dom.inputContainer) this.dom.inputContainer.style.display = 'none';
        if (this.dom.icon) this.dom.icon.textContent = icon;
        if (this.dom.title) this.dom.title.textContent = title;
        if (this.dom.message) this.dom.message.textContent = message;
        if (this.dom.okBtn) this.dom.okBtn.textContent = confirmText;
        if (this.dom.cancelBtn) {
            this.dom.cancelBtn.textContent = cancelText;
            this.dom.cancelBtn.style.display = 'inline-block';
        }

        this.dom.overlay.classList.remove('hidden');
        this.dom.overlay.style.display = 'flex';

        return new Promise((resolve) => {
            this.activeResolve = resolve;
        });
    }

    prompt({ title = 'Name Settlement', message = '', defaultValue = '', placeholder = '', confirmText = 'Found Settlement', cancelText = 'Cancel', icon = '⛩️' }) {
        this.ensureDOM();
        this.isPromptMode = true;
        this.defaultPromptValue = defaultValue;

        if (this.dom.icon) this.dom.icon.textContent = icon;
        if (this.dom.title) this.dom.title.textContent = title;
        if (this.dom.message) this.dom.message.textContent = message;
        if (this.dom.okBtn) this.dom.okBtn.textContent = confirmText;
        if (this.dom.cancelBtn) {
            this.dom.cancelBtn.textContent = cancelText;
            this.dom.cancelBtn.style.display = 'inline-block';
        }

        if (this.dom.inputContainer && this.dom.input) {
            this.dom.inputContainer.style.display = 'block';
            this.dom.input.value = defaultValue;
            this.dom.input.placeholder = placeholder;
        }

        this.dom.overlay.classList.remove('hidden');
        this.dom.overlay.style.display = 'flex';

        setTimeout(() => {
            this.dom.input?.focus();
            this.dom.input?.select();
        }, 50);

        return new Promise((resolve) => {
            this.activeResolve = resolve;
        });
    }

    alert({ title = 'Notice', message = '', okText = 'OK', icon = '📜' }) {
        this.ensureDOM();
        this.isPromptMode = false;
        if (this.dom.inputContainer) this.dom.inputContainer.style.display = 'none';
        if (this.dom.icon) this.dom.icon.textContent = icon;
        if (this.dom.title) this.dom.title.textContent = title;
        if (this.dom.message) this.dom.message.textContent = message;
        if (this.dom.okBtn) this.dom.okBtn.textContent = okText;
        if (this.dom.cancelBtn) this.dom.cancelBtn.style.display = 'none';

        this.dom.overlay.classList.remove('hidden');
        this.dom.overlay.style.display = 'flex';

        return new Promise((resolve) => {
            this.activeResolve = () => resolve();
        });
    }
}

export const modalManager = new ModalManager();
