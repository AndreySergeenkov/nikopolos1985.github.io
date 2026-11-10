(() => {
    const prompt = document.querySelector('.support-prompt');
    if (!prompt) return;

    const storageKey = 'sergeenkov-support-dismissed';
    function wasDismissed() {
        try {
            return sessionStorage.getItem(storageKey) === '1';
        } catch {
            return false;
        }
    }

    if (wasDismissed()) {
        prompt.remove();
        return;
    }

    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'support-prompt-dismiss';
    dismiss.setAttribute('aria-label', prompt.dataset.dismissLabel);
    dismiss.textContent = '×';

    const inner = document.createElement('div');
    inner.className = 'support-prompt-inner';
    inner.append(prompt.querySelector('p'), dismiss);
    prompt.append(inner);
    prompt.classList.add('is-sticky');
    document.body.append(prompt);

    const root = document.documentElement;
    function reserveSpace() {
        const height = Math.ceil(prompt.getBoundingClientRect().height);
        root.style.setProperty('--support-prompt-height', height + 'px');
    }
    const observer = new ResizeObserver(reserveSpace);
    observer.observe(prompt);
    reserveSpace();

    function hidePrompt() {
        observer.disconnect();
        prompt.remove();
        root.style.removeProperty('--support-prompt-height');
    }
    dismiss.addEventListener('click', () => {
        hidePrompt();
        try {
            sessionStorage.setItem(storageKey, '1');
        } catch {
            // Dismissing still works when storage is unavailable.
        }
    });
    window.addEventListener('pageshow', () => {
        if (wasDismissed()) hidePrompt();
    });
})();
