(() => {
    const alternatives = Array.from(document.querySelectorAll('.language-switch a:not([aria-current])'),
        link => ({ link, path: link.getAttribute('href') }));
    if (alternatives.length === 0) return;

    function updateLinks() {
        for (const { link, path } of alternatives) {
            link.setAttribute('href', path + window.location.hash);
        }
    }
    updateLinks();
    window.addEventListener('hashchange', updateLinks);
})();
