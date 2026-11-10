(() => {
    const inlinePrompt = document.querySelector('.support-prompt');
    if (!inlinePrompt) return;

    const scrollDelay = 240;
    const pagePath = location.pathname.replace(/(?:\/index\.html)?\/?$/, '/');
    const storageKey = 'sergeenkov-support-dismissed:' + pagePath;
    function wasDismissed() {
        try {
            return sessionStorage.getItem(storageKey) === '1';
        } catch {
            return false;
        }
    }

    if (wasDismissed()) return;

    const prompt = inlinePrompt.cloneNode(true);
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
    prompt.hidden = true;
    document.body.append(prompt);

    const root = document.documentElement;
    const heightObserver = new ResizeObserver(() => {
        const height = Math.ceil(prompt.getBoundingClientRect().height);
        root.style.setProperty('--support-prompt-height', height + 'px');
    });
    heightObserver.observe(prompt);

    function updatePrompt() {
        // Keep the inline invitation visible once the reader reaches it.
        prompt.hidden = window.scrollY < scrollDelay ||
            inlinePrompt.getBoundingClientRect().bottom <= root.clientHeight - 8;
    }

    const inlineObserver = new IntersectionObserver(updatePrompt, { threshold: [0, 1] });
    inlineObserver.observe(inlinePrompt);
    const listeners = new AbortController();
    window.addEventListener('scroll', updatePrompt, { passive: true, signal: listeners.signal });
    window.addEventListener('resize', updatePrompt, { signal: listeners.signal });
    updatePrompt();

    function hidePrompt() {
        listeners.abort();
        heightObserver.disconnect();
        inlineObserver.disconnect();
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
        if (wasDismissed()) {
            hidePrompt();
        } else {
            updatePrompt();
        }
    }, { signal: listeners.signal });
})();
