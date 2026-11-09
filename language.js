(() => {
    const alternate = document.querySelector('.language-switch a:not([aria-current])');
    if (!alternate) return;

    const path = alternate.getAttribute('href');
    const update = () => alternate.setAttribute('href', path + window.location.hash);
    update();
    window.addEventListener('hashchange', update);
})();
