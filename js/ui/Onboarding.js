export class Onboarding {
    constructor() {
        this.currentStep = 0;
        this.steps = [
            {
                target: '.row',
                title: '👋 Добро пожаловать!',
                text: 'Выберите бассейн (25м или 50м) и пол спортсмена',
                position: 'bottom'
            },
            {
                target: '.events-row',
                title: '🏊 Стиль и дистанция',
                text: 'Выберите стиль плавания и дистанцию для расчёта',
                position: 'bottom'
            },
            {
                target: '.calc',
                title: '⏱ Рассчитайте очки',
                text: 'Введите время — и получите очки FINA. Или наоборот!',
                position: 'top'
            }
        ];
    }

    init() {
        // Only show for first-time visitors
        try {
            if (localStorage.getItem('fina_onboarding_done') === '1') return;
        } catch (e) { return; }

        this.createOverlay();
        this.show();
    }

    createOverlay() {
        // Backdrop
        this.overlay = document.createElement('div');
        this.overlay.className = 'onboarding-overlay';
        this.overlay.setAttribute('role', 'dialog');
        this.overlay.setAttribute('aria-label', 'Обучение');

        // Tooltip
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'onboarding-tooltip';

        this.tooltip.innerHTML = `
            <div class="onboarding-header">
                <span class="onboarding-title"></span>
                <button type="button" class="onboarding-skip" aria-label="Пропустить">✕</button>
            </div>
            <p class="onboarding-text"></p>
            <div class="onboarding-footer">
                <div class="onboarding-dots"></div>
                <div class="onboarding-btns">
                    <button type="button" class="onboarding-btn onboarding-prev">Назад</button>
                    <button type="button" class="onboarding-btn onboarding-next">Далее</button>
                </div>
            </div>
        `;

        // Spotlight SVG overlay
        this.spotlightSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.spotlightSvg.classList.add('onboarding-spotlight');
        this.spotlightSvg.setAttribute('width', '100%');
        this.spotlightSvg.setAttribute('height', '100%');
        this.spotlightSvg.innerHTML = `
            <defs>
                <mask id="onboarding-mask">
                    <rect width="100%" height="100%" fill="white"/>
                    <rect id="onboarding-hole" rx="14" ry="14" fill="black"/>
                </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(0,0,0,0.65)" mask="url(#onboarding-mask)"/>
        `;

        this.overlay.appendChild(this.spotlightSvg);
        this.overlay.appendChild(this.tooltip);
        document.body.appendChild(this.overlay);

        // Bind events
        this.tooltip.querySelector('.onboarding-skip').onclick = () => this.finish();
        this.tooltip.querySelector('.onboarding-prev').onclick = () => this.prev();
        this.tooltip.querySelector('.onboarding-next').onclick = () => this.next();
        this.overlay.onclick = (e) => {
            if (e.target === this.overlay || e.target === this.spotlightSvg) this.finish();
        };
    }

    show() {
        this.overlay.classList.add('active');
        this.goToStep(0);
    }

    goToStep(idx) {
        this.currentStep = idx;
        const step = this.steps[idx];
        const el = document.querySelector(step.target);

        if (!el) { this.finish(); return; }

        // Update tooltip content
        this.tooltip.querySelector('.onboarding-title').textContent = step.title;
        this.tooltip.querySelector('.onboarding-text').textContent = step.text;

        // Dots
        const dotsEl = this.tooltip.querySelector('.onboarding-dots');
        dotsEl.innerHTML = this.steps.map((_, i) =>
            `<span class="onboarding-dot${i === idx ? ' active' : ''}"></span>`
        ).join('');

        // Buttons
        const prevBtn = this.tooltip.querySelector('.onboarding-prev');
        const nextBtn = this.tooltip.querySelector('.onboarding-next');
        prevBtn.style.visibility = idx === 0 ? 'hidden' : 'visible';
        nextBtn.textContent = idx === this.steps.length - 1 ? 'Начать!' : 'Далее';

        // Position spotlight
        const rect = el.getBoundingClientRect();
        const pad = 8;
        const hole = this.spotlightSvg.querySelector('#onboarding-hole');
        hole.setAttribute('x', rect.left - pad);
        hole.setAttribute('y', rect.top - pad);
        hole.setAttribute('width', rect.width + pad * 2);
        hole.setAttribute('height', rect.height + pad * 2);

        // Position tooltip
        this.positionTooltip(rect, step.position);

        // Scroll into view if needed
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    positionTooltip(rect, position) {
        const gap = 16;
        this.tooltip.style.left = '';
        this.tooltip.style.right = '';
        this.tooltip.style.top = '';
        this.tooltip.style.bottom = '';
        this.tooltip.style.transform = '';

        const centerX = rect.left + rect.width / 2;
        const tooltipWidth = Math.min(320, window.innerWidth - 32);
        let left = centerX - tooltipWidth / 2;
        left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));

        this.tooltip.style.width = tooltipWidth + 'px';
        this.tooltip.style.left = left + 'px';

        if (position === 'bottom') {
            this.tooltip.style.top = (rect.bottom + gap) + 'px';
        } else {
            this.tooltip.style.top = (rect.top - gap) + 'px';
            this.tooltip.style.transform = 'translateY(-100%)';
        }
    }

    next() {
        if (this.currentStep < this.steps.length - 1) {
            this.goToStep(this.currentStep + 1);
        } else {
            this.finish();
        }
    }

    prev() {
        if (this.currentStep > 0) {
            this.goToStep(this.currentStep - 1);
        }
    }

    finish() {
        this.overlay.classList.remove('active');
        setTimeout(() => {
            this.overlay.remove();
        }, 300);
        try {
            localStorage.setItem('fina_onboarding_done', '1');
        } catch (e) { /* ignore */ }
    }
}
