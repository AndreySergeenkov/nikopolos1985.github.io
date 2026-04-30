(function () {
    var STAGES = ['█', '▓', '▒', '░'];

    function reduced() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function buildElement(target, el) {
        el.textContent = '';
        var nodes = [];
        for (var i = 0; i < target.length; i++) {
            var ch = target[i];
            var wrap = document.createElement('span');
            wrap.className = 'rv-ch';
            var ghost = document.createElement('span');
            ghost.className = 'rv-ghost';
            ghost.textContent = ch === ' ' ? ' ' : ch;
            var real = document.createElement('span');
            real.className = 'rv-real';
            real.textContent = ch === ' ' ? ' ' : '';
            wrap.appendChild(ghost);
            wrap.appendChild(real);
            el.appendChild(wrap);
            nodes.push({ to: ch, real: real, space: ch === ' ' });
        }
        return nodes;
    }

    function animate(el) {
        var target = el.dataset.revealText || el.textContent;
        if (!target) { el.style.visibility = ''; return; }
        var nodes = buildElement(target, el);
        // Reveal the heading now that the spans are in place.
        el.style.visibility = '';
        if (reduced()) { nodes.forEach(function (n) { n.real.textContent = n.to; }); return; }
        var queue = nodes.map(function (n) {
            return { node: n, start: Math.floor(Math.random() * 24), stage: 0, lastChange: -99 };
        });
        var frame = 0;
        var settled = 0;
        (function tick() {
            for (var i = 0; i < queue.length; i++) {
                var q = queue[i];
                if (q.done) continue;
                var n = q.node;
                if (n.space) { q.done = true; settled++; continue; }
                if (frame < q.start) {
                    if (n.real.textContent !== '█') {
                        n.real.textContent = '█';
                        n.real.style.opacity = '0.8';
                    }
                    continue;
                }
                if (frame - q.lastChange > 5) { q.stage++; q.lastChange = frame; }
                if (q.stage > STAGES.length) {
                    n.real.textContent = n.to;
                    n.real.style.opacity = '1';
                    q.done = true;
                    settled++;
                    continue;
                }
                n.real.textContent = STAGES[q.stage - 1];
                n.real.style.opacity = String(0.85 - q.stage * 0.15);
            }
            if (settled < queue.length) { frame++; requestAnimationFrame(tick); }
        })();
    }

    function run() {
        // Apply only to the article h1 — the title of the article. Skip
        // every other heading (section h2s, chart-box h3s, headings on
        // non-article pages aren't loading this script anyway).
        document.querySelectorAll('article > header h1, article h1').forEach(function (el) {
            el.style.visibility = 'hidden';
            if (!el.dataset.revealText) {
                el.dataset.revealText = el.textContent;
            } else {
                el.textContent = el.dataset.revealText;
            }
            requestAnimationFrame(function () { animate(el); });
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
})();
