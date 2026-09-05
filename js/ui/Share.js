export class ShareManager {
    static isNative() {
        const cap = window.Capacitor;
        return !!(cap && (
            (typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) ||
            (typeof cap.getPlatform === 'function' && cap.getPlatform() !== 'web')
        ));
    }

    static blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = String(reader.result || '');
                resolve(dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl);
            };
            reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
            reader.readAsDataURL(blob);
        });
    }

    static async drawShareImage(timeStr, ptsStr, eventStr, rank, themeConfig) {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');

        const { pool, isLight, primary } = themeConfig;

        // Роли лика (§2.1 брендбука)
        const C = isLight
            ? { canvas: '#fafafa', inset: '#ececec', surface: '#ffffff', border: '#e4e4e4', slate: '#6b6b6b', soft: '#3d3d3d', text: '#0d0d0d' }
            : { canvas: '#0d0d0d', inset: '#121212', surface: '#1a1a1a', border: '#2e2e2e', slate: '#8a8a8a', soft: '#d1d1d1', text: '#fafafa' };

        const uiFont = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const monoFont = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace';

        try { await document.fonts.load(`700 150px ${monoFont}`); await document.fonts.load(`600 60px ${uiFont}`); } catch (e) { }

        // Канва
        ctx.fillStyle = C.canvas;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Карта — surface с hairline-границей
        const cardX = 70, cardY = 70, cardW = 940, cardH = 940, r = 16;
        ctx.fillStyle = C.surface;
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, r);
        ctx.fill();
        ctx.strokeStyle = C.border;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Шапка — inset
        const headH = 110;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, headH, [r, r, 0, 0]);
        ctx.fillStyle = C.inset;
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = C.border;
        ctx.beginPath();
        ctx.moveTo(cardX, cardY + headH);
        ctx.lineTo(cardX + cardW, cardY + headH);
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = C.slate;
        ctx.font = `500 30px ${uiFont}`;
        ctx.letterSpacing = '4px';
        ctx.fillText('FINA POINTS — BY BOROZDOV', canvas.width / 2, cardY + headH / 2 + 11);

        // Дистанция и бассейн
        const poolStr = pool === 'SCM' ? 'БАССЕЙН 25М' : 'БАССЕЙН 50М';
        ctx.fillStyle = C.text;
        ctx.font = `600 66px ${uiFont}`;
        ctx.letterSpacing = '-1px';
        ctx.fillText(eventStr.toUpperCase(), canvas.width / 2, 320);

        ctx.fillStyle = C.slate;
        ctx.font = `500 28px ${uiFont}`;
        ctx.letterSpacing = '4px';
        ctx.fillText(poolStr, canvas.width / 2, 375);

        // Два блока: вторичный — обычным текстом, главный — инверсией
        const drawSecondary = (label, value, y) => {
            ctx.fillStyle = C.slate;
            ctx.font = `500 26px ${uiFont}`;
            ctx.letterSpacing = '5px';
            ctx.fillText(label, canvas.width / 2, y);
            ctx.fillStyle = C.soft;
            ctx.font = `600 96px ${monoFont}`;
            ctx.letterSpacing = '0px';
            ctx.fillText(value, canvas.width / 2, y + 106);
        };

        // Главная цифра — инверсионная плашка
        const drawPrimary = (label, value, y) => {
            ctx.fillStyle = C.slate;
            ctx.font = `500 26px ${uiFont}`;
            ctx.letterSpacing = '5px';
            ctx.fillText(label, canvas.width / 2, y);

            ctx.font = `700 150px ${monoFont}`;
            ctx.letterSpacing = '0px';
            const tw = ctx.measureText(value).width;
            const padX = 44, plateH = 190;
            ctx.fillStyle = C.text;
            ctx.beginPath();
            ctx.roundRect(canvas.width / 2 - tw / 2 - padX, y + 32, tw + padX * 2, plateH, 8);
            ctx.fill();
            ctx.fillStyle = C.canvas;
            ctx.fillText(value, canvas.width / 2, y + 32 + plateH / 2 + 52);
        };

        if (primary === 'time') {
            drawSecondary('ОЧКИ FINA', ptsStr, 470);
            drawPrimary('ВРЕМЯ', timeStr, 660);
        } else {
            drawSecondary('ВРЕМЯ', timeStr, 470);
            drawPrimary('ОЧКИ FINA', ptsStr, 660);
        }

        // Разряд — инверсионный бейдж, радиус 2
        if (rank) {
            ctx.font = `600 34px ${uiFont}`;
            ctx.letterSpacing = '2px';
            const label = `РАЗРЯД ${rank.toUpperCase()}`;
            const tw = ctx.measureText(label).width;
            const padX = 26;
            ctx.fillStyle = C.text;
            ctx.fillRect(canvas.width / 2 - tw / 2 - padX, 922, tw + padX * 2, 58);
            ctx.fillStyle = C.canvas;
            ctx.fillText(label, canvas.width / 2, 962);
        } else {
            ctx.fillStyle = C.slate;
            ctx.font = `500 26px ${uiFont}`;
            ctx.letterSpacing = '3px';
            ctx.fillText('FINA.BOROZDOV.RU', canvas.width / 2, 958);
        }

        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => {
                if (blob) resolve(blob);
                else reject(new Error('Не удалось создать изображение'));
            }, 'image/png', 1.0);
        });
    }

    static async nativeShare(blob, text) {
        const plugins = window.Capacitor?.Plugins || {};
        const Share = plugins.Share;
        const Filesystem = plugins.Filesystem;

        if (!Share?.share) throw new Error('Native Share plugin is not available');
        if (!Filesystem?.writeFile) {
            await Share.share({
                title: 'Мой результат в FINA Points',
                text,
                dialogTitle: 'Поделиться результатом'
            });
            return;
        }

        const path = `share/fina-result-${Date.now()}.png`;
        const data = await this.blobToBase64(blob);
        const written = await Filesystem.writeFile({
            path,
            data,
            directory: 'CACHE',
            recursive: true
        });
        const uri = written?.uri || (await Filesystem.getUri({ path, directory: 'CACHE' })).uri;

        await Share.share({
            title: 'Мой результат в FINA Points',
            text,
            files: [uri],
            dialogTitle: 'Поделиться результатом'
        });
    }

    static async shareResult(data, onToast) {
        const { timeStr, ptsStr, eventStr, rank, url, themeConfig } = data;

        try {
            const blob = await this.drawShareImage(timeStr, ptsStr, eventStr, rank, themeConfig);
            const file = new File([blob], 'fina_result.png', { type: 'image/png' });
            // Ссылка на сам результат, а не на домен: иначе получатель открывал пустой
            // калькулятор и не видел того, чем с ним поделились.
            const text = `Смотри мой результат: ${eventStr}. Рассчитано в FINA Points by Borozdov.\n\n${url || 'https://fina.borozdov.ru'}`;

            if (this.isNative()) {
                await this.nativeShare(blob, text);
                return;
            }

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Мой результат в FINA Points',
                    text
                });
            } else if (navigator.share) {
                await navigator.share({
                    title: 'Мой результат в FINA Points',
                    text
                });
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `FINA_${eventStr.replace(/\s+/g, '_')}_Result.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                onToast('Картинка скачана');
            }
        } catch (err) {
            const message = String(err?.message || '');
            if (err.name !== 'AbortError' && !message.toLowerCase().includes('cancel')) {
                console.error('Ошибка генерации шеринга', err);
                onToast('Ошибка при отправке');
            }
        }
    }
}
