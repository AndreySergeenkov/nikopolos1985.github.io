(() => {
    const root = document.documentElement;
    const storageKey = 'sergeenkov-theme';
    const labels = {
        en: ['Light mode', 'Dark mode'],
        ru: ['Светлая тема', 'Тёмная тема'],
        'zh-Hans': ['浅色主题', '深色主题'],
    };
    const [lightLabel, darkLabel] = labels[root.lang] ?? labels.en;
    let control;

    function applyTheme(theme) {
        root.dataset.theme = theme;
        if (control) control.querySelector(`[value="${theme}"]`).checked = true;
    }

    function restoreTheme() {
        try {
            applyTheme(localStorage.getItem(storageKey) === 'dark' ? 'dark' : 'light');
        } catch {
            // The switch still works for this page when storage is unavailable.
        }
    }

    restoreTheme();
    document.addEventListener('DOMContentLoaded', () => {
        control = document.querySelector('.theme-control');
        if (!control) return;
        control.innerHTML = `
            <label class="theme-choice" title="${lightLabel}">
                <input type="radio" name="color-theme" value="light" aria-label="${lightLabel}">
                <span class="theme-icon theme-icon-sun" aria-hidden="true"></span>
            </label>
            <label class="theme-choice" title="${darkLabel}">
                <input type="radio" name="color-theme" value="dark" aria-label="${darkLabel}">
                <span class="theme-icon theme-icon-moon" aria-hidden="true"></span>
            </label>
        `;
        applyTheme(root.dataset.theme || 'light');
        control.hidden = false;
        control.addEventListener('change', event => {
            const theme = event.target.value;
            applyTheme(theme);
            try {
                localStorage.setItem(storageKey, theme);
            } catch {
                // Keep the selected theme for this page.
            }
        });
    });

    window.addEventListener('pageshow', event => {
        if (event.persisted) restoreTheme();
    });
    window.addEventListener('storage', event => {
        if (event.key === storageKey) restoreTheme();
    });
})();
