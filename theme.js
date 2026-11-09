(() => {
    const root = document.documentElement;
    const storageKey = 'sergeenkov-theme';
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
            <label class="theme-choice" title="Light mode">
                <input type="radio" name="color-theme" value="light" aria-label="Light mode">
                <span class="theme-icon theme-icon-sun" aria-hidden="true"></span>
            </label>
            <label class="theme-choice" title="Dark mode">
                <input type="radio" name="color-theme" value="dark" aria-label="Dark mode">
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
