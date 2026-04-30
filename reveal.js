(function () {
    var STAGES = ['█', '▓', '▒', '░'];

    function reduced() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function buildElement(target, el) {
        // Group characters into word-spans (white-space: nowrap) so the
        // browser can't break a word in the middle. Real space characters
        // sit as plain text nodes between the word-spans, so wrapping
        // happens at word boundaries the way it would for normal text.
        el.textContent = '';
        var nodes = [];
        var i = 0;
        while (i < target.length) {
            var ch = target[i];
            if (/\s/.test(ch)) {
                el.appendChild(document.createTextNode(ch));
                nodes.push({ to: ch, real: null, space: true });
                i++;
                continue;
            }
            var word = document.createElement('span');
            word.className = 'rv-word';
            while (i < target.length && !/\s/.test(target[i])) {
                var c = target[i];
                var wrap = document.createElement('span');
                wrap.className = 'rv-ch';
                var ghost = document.createElement('span');
                ghost.className = 'rv-ghost';
                ghost.textContent = c;
                var real = document.createElement('span');
                real.className = 'rv-real';
                real.textContent = '';
                wrap.appendChild(ghost);
                wrap.appendChild(real);
                word.appendChild(wrap);
                nodes.push({ to: c, real: real, space: false });
                i++;
            }
            el.appendChild(word);
        }
        return nodes;
    }

    function settle(el, target) {
        // Drop the wrapper spans and put the plain text back. This keeps
        // the DOM clean for crawlers, screen readers, share-card parsers,
        // and any other tool that reads h1.textContent — once the effect
        // has finished playing they all see exactly the original heading.
        el.textContent = target;
        el.removeAttribute('aria-label');
    }

    function animate(el) {
        var target = el.dataset.revealText || el.textContent;
        if (!target) { el.style.visibility = ''; return; }
        // While the effect is running, h1.textContent reads as ghost+real
        // chars. Set aria-label so accessibility tools and any tool that
        // checks the labelled name still see the clean heading.
        el.setAttribute('aria-label', target);
        var nodes = buildElement(target, el);
        el.style.visibility = '';
        if (reduced()) { settle(el, target); return; }
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
            if (settled < queue.length) {
                frame++;
                requestAnimationFrame(tick);
            } else {
                settle(el, target);
            }
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
