export class ShareManager {
    static async drawShareImage(timeStr, ptsStr, eventStr, rank, themeConfig) {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');

        const { pool, isLight, acHex } = themeConfig;
        const bgHex = isLight ? '#ffffff' : '#101014';
        const textMainHex = isLight ? '#18181b' : '#ffffff';
        const textMutedHex = isLight ? '#71717a' : '#a1a1aa';

        // Background 
        ctx.fillStyle = bgHex;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Accent Line
        ctx.fillStyle = acHex;
        ctx.fillRect(0, 0, canvas.width, 24);

        // Fonts setup
        const sysFont = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

        // Header (FINA Points Borozdov)
        ctx.fillStyle = textMutedHex;
        ctx.font = `600 44px ${sysFont}`;
        ctx.textAlign = 'center';
        ctx.fillText('FINA Points / Borozdov.ru', canvas.width / 2, 100);

        // Event & Pool
        const poolStr = pool === 'SCM' ? 'Бассейн 25м' : 'Бассейн 50м';
        ctx.fillStyle = textMainHex;
        ctx.font = `700 76px ${sysFont}`;
        ctx.fillText(eventStr, canvas.width / 2, 270);

        ctx.fillStyle = acHex;
        ctx.font = `600 40px ${sysFont}`;
        ctx.fillText(poolStr, canvas.width / 2, 340);

        // TIME
        ctx.fillStyle = textMutedHex;
        ctx.font = `800 32px ${sysFont}`;
        ctx.letterSpacing = '4px';
        ctx.fillText('ВРЕМЯ', canvas.width / 2, 450);

        ctx.fillStyle = textMainHex;
        ctx.font = `900 160px ${sysFont}`;
        ctx.letterSpacing = '0px';
        ctx.fillText(timeStr, canvas.width / 2, 600);

        // POINTS
        ctx.fillStyle = textMutedHex;
        ctx.font = `800 32px ${sysFont}`;
        ctx.letterSpacing = '4px';
        ctx.fillText('ОЧКИ FINA', canvas.width / 2, 730);

        ctx.fillStyle = acHex;
        ctx.font = `900 160px ${sysFont}`;
        ctx.letterSpacing = '0px';
        ctx.fillText(ptsStr, canvas.width / 2, 880);

        // Rank Badge
        if (rank) {
            ctx.font = `900 40px ${sysFont}`;
            ctx.letterSpacing = '0px';
            const tw = ctx.measureText(rank).width;
            const pLen = 30;

            ctx.fillStyle = acHex + (isLight ? '22' : '33');
            ctx.beginPath();
            ctx.roundRect((canvas.width / 2) - (tw / 2) - pLen, 960, tw + (pLen * 2), 68, 16);
            ctx.fill();

            ctx.fillStyle = acHex;
            ctx.fillText(rank, canvas.width / 2, 1006);
        } else {
            ctx.fillStyle = isLight ? '#f4f4f5' : '#27272a';
            ctx.fillRect((canvas.width / 2) - 80, 1000, 160, 6);
        }

        return new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
    }

    static async shareResult(data, onToast) {
        const { timeStr, ptsStr, eventStr, rank, themeConfig } = data;

        try {
            const blob = await this.drawShareImage(timeStr, ptsStr, eventStr, rank, themeConfig);
            const file = new File([blob], 'fina_result.png', { type: 'image/png' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Мой результат в FINA Points',
                    text: `Смотри мой результат: ${eventStr}! Рассчитано в калькуляторе FINA Points Borozdov 🏊\n\nУзнай свои очки: https://fina.borozdov.ru`
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
                onToast('Картинка сохранена!');
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Ошибка генерации шеринга', err);
                onToast('Ошибка при отправке');
            }
        }
    }
}
