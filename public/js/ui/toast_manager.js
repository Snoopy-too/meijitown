// Project Meiji - Toast Notification Manager
// ponytail: native DOM toasts capped to 3, self-cleaning CSS transitions

export class ToastManager {
    constructor(containerElement) {
        this.container = containerElement || document.getElementById('toast-container');
    }

    show(message, isError = false) {
        if (!this.container) return;

        // Cap visible toasts to 3, purge oldest if exceeded
        while (this.container.children.length >= 3) {
            this.container.removeChild(this.container.firstElementChild);
        }

        const toast = document.createElement('div');
        toast.className = 'toast';
        if (isError) toast.style.borderLeftColor = '#f14668';
        toast.textContent = message;
        toast.title = 'Click to dismiss';
        this.container.appendChild(toast);

        // Native CSS transition fade-in
        requestAnimationFrame(() => {
            toast.classList.add('toast-visible');
        });

        // Dynamic human reading duration:
        // ~200-250 wpm + visual acquisition time: min 4.5s, up to 8.0s based on message length (+1.0s for alerts)
        const charCount = typeof message === 'string' ? message.length : 20;
        const duration = Math.max(4500, Math.min(8000, 3800 + charCount * 45)) + (isError ? 1000 : 0);

        let fadeTimer = null;
        let removeTimer = null;
        let isDismissed = false;

        const dismiss = () => {
            if (isDismissed) return;
            isDismissed = true;
            if (fadeTimer) clearTimeout(fadeTimer);
            if (removeTimer) clearTimeout(removeTimer);
            toast.classList.remove('toast-visible');
            toast.classList.add('toast-fade');
            setTimeout(() => {
                if (toast.parentNode) toast.remove();
            }, 260);
        };

        const startTimers = (delay) => {
            fadeTimer = setTimeout(() => {
                toast.classList.remove('toast-visible');
                toast.classList.add('toast-fade');
                removeTimer = setTimeout(() => {
                    if (toast.parentNode) toast.remove();
                }, 260);
            }, delay);
        };

        startTimers(duration);

        // Hover pause so players can read comfortably without it vanishing
        toast.addEventListener('mouseenter', () => {
            if (fadeTimer) clearTimeout(fadeTimer);
            if (removeTimer) clearTimeout(removeTimer);
            toast.classList.remove('toast-fade');
            toast.classList.add('toast-visible');
        });

        toast.addEventListener('mouseleave', () => {
            if (!isDismissed) {
                startTimers(2500); // 2.5s grace period upon unhovering
            }
        });

        // Click to dismiss immediately if user finished reading
        toast.addEventListener('click', dismiss);
    }
}
