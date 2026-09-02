import { trackGoal } from '../helpers/analytics.js';

export class PWAInstall {
    constructor() {
        this.installBtn = document.getElementById('install-btn');
        this.installModal = document.getElementById('install-modal');
        this.closeModal = document.getElementById('close-modal');
        this.installActionBtn = document.getElementById('install-action-btn');
        this.iosInstruction = document.getElementById('ios-instruction');
        this.installText = document.getElementById('install-text');

        // Banner elements
        this.banner = document.getElementById('install-banner');
        this.bannerClose = document.getElementById('install-banner-close');
        this.bannerAction = document.getElementById('install-banner-action');
        this.bannerNever = document.getElementById('install-banner-never');

        this.deferredPrompt = null;
    }

    init() {
        if (this.isNativeApp()) {
            this.hideInstallUi();
            return;
        }

        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

        if (!isStandalone) {
            this.installBtn.style.display = 'flex';
            this.showBannerIfAllowed();
        }

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
        });

        // Установить приложение можно и мимо нашего UI — через меню браузера.
        // Без этого обработчика кнопка и баннер продолжали висеть в открытой
        // вкладке до перезагрузки, предлагая установить уже установленное.
        window.addEventListener('appinstalled', () => {
            this.deferredPrompt = null;
            trackGoal('pwa_installed');
            this.hideInstallUi();
            this.hideModal();
            this.hideBanner();
        });

        this.installBtn.onclick = () => {
            trackGoal('install_open');
            if (this.isIOS()) {
                this.iosInstruction.style.display = 'block';
                this.installActionBtn.style.display = 'none';
                this.installText.style.display = 'none';
            } else {
                this.iosInstruction.style.display = 'none';
                this.installActionBtn.style.display = 'block';
                this.installText.style.display = 'block';
            }
            this.installModal.classList.add('active');
        };

        this.closeModal.onclick = () => {
            trackGoal('install_modal_close');
            this.hideModal();
        };
        this.installModal.onclick = (e) => {
            if (e.target === this.installModal) this.hideModal();
        };

        this.installActionBtn.onclick = async () => {
            trackGoal('install_modal_action');
            await this.promptInstall();
        };

        // Banner events
        this.bannerClose.onclick = () => {
            trackGoal('install_banner_close');
            this.hideBanner();
        };

        this.bannerAction.onclick = async () => {
            trackGoal('install_banner_action');
            if (this.deferredPrompt) {
                await this.promptInstall();
            } else {
                // Fallback: open the full modal with instructions
                this.hideBanner();
                this.installBtn.click();
            }
        };

        this.bannerNever.onclick = () => {
            trackGoal('install_banner_never');
            try {
                localStorage.setItem('fina_install_never', '1');
            } catch (e) { /* ignore */ }
            this.hideBanner();
        };
    }

    async promptInstall() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                trackGoal('pwa_install_accepted');
                this.installBtn.style.display = 'none';
                this.hideModal();
                this.hideBanner();
            }
            this.deferredPrompt = null;
        } else {
            alert("Чтобы установить приложение, откройте меню браузера и нажмите «Добавить на главный экран»");
        }
    }

    showBannerIfAllowed() {
        try {
            if (localStorage.getItem('fina_install_never') === '1') return;
        } catch (e) { /* ignore */ }

        // Show banner with a small delay after page load for a smooth experience
        setTimeout(() => {
            if (this.banner) {
                this.banner.classList.add('show');
                this.watchUpdateToast();
            }
        }, 1500);
    }

    watchUpdateToast() {
        const updateToast = document.getElementById('update-toast');
        if (!updateToast) return;

        const check = () => {
            if (updateToast.classList.contains('show')) {
                this.banner.classList.add('banner-shifted');
            } else {
                this.banner.classList.remove('banner-shifted');
            }
        };

        // Check immediately
        check();

        // Observe class changes on the toast
        const observer = new MutationObserver(check);
        observer.observe(updateToast, { attributes: true, attributeFilter: ['class'] });
    }

    hideBanner() {
        if (!this.banner) return;
        this.banner.classList.remove('show');
        this.banner.classList.add('hiding');
        setTimeout(() => {
            this.banner.classList.remove('hiding');
        }, 400);
    }

    hideModal() {
        this.installModal.classList.remove('active');
    }

    hideInstallUi() {
        if (this.installBtn) this.installBtn.style.display = 'none';
        if (this.banner) {
            this.banner.classList.remove('show', 'hiding', 'banner-shifted');
            this.banner.hidden = true;
        }
        if (this.installModal) {
            this.installModal.classList.remove('active');
            this.installModal.hidden = true;
        }
    }

    isNativeApp() {
        const Capacitor = window.Capacitor;
        if (!Capacitor) return false;
        if (typeof Capacitor.isNativePlatform === 'function') {
            return Capacitor.isNativePlatform();
        }
        if (typeof Capacitor.getPlatform === 'function') {
            return Capacitor.getPlatform() !== 'web';
        }
        return Boolean(Capacitor.Plugins);
    }

    isIOS() {
        return [
            'iPad Simulator', 'iPhone Simulator', 'iPod Simulator',
            'iPad', 'iPhone', 'iPod'
        ].includes(navigator.platform) || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
    }
}
