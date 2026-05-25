const STATUS_BAR_COLORS = {
    dark: {
        background: '#101014',
        style: 'DARK'
    },
    light: {
        background: '#f4f4f8',
        style: 'LIGHT'
    }
};

function getStatusBar() {
    return window.Capacitor?.Plugins?.StatusBar || null;
}

function statusBarHeightToCssPx(height) {
    if (!Number.isFinite(height) || height <= 0) return 0;

    const dpr = window.devicePixelRatio || 1;
    if (height > 48 && dpr > 1) {
        return Math.round(height / dpr);
    }

    return Math.round(height);
}

export function syncNativeChrome(theme) {
    const statusBar = getStatusBar();
    if (!statusBar) return;

    const config = STATUS_BAR_COLORS[theme] || STATUS_BAR_COLORS.dark;
    document.body.classList.add('native-app');

    Promise.resolve()
        .then(() => statusBar.show?.())
        .then(() => statusBar.setOverlaysWebView?.({ overlay: true }))
        .then(() => statusBar.setBackgroundColor?.({ color: config.background }))
        .then(() => statusBar.setStyle?.({ style: config.style }))
        .then(() => statusBar.getInfo?.())
        .then(info => {
            if (!info || typeof info.height !== 'number') return;
            document.body.classList.add('native-statusbar-overlay');
            document.documentElement.style.setProperty('--native-statusbar-height', `${statusBarHeightToCssPx(info.height)}px`);
        })
        .catch(() => {});
}
