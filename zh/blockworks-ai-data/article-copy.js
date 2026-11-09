(() => {
    const article = document.querySelector('article');
    const source = document.querySelector('link[rel="alternate"][hreflang="en"]').href;
    const button = document.querySelector('#copy-article');
    const label = button.querySelector('.copy-label');
    const status = document.querySelector('#copy-status');
    const originalLabel = label.textContent;
    let timer;
    const plainText = value => value.replace(/\s+/g, ' ').trim();
    const escapeMarkdown = value => value.replace(/[\\\[\]]/g, '\\$&');

    function sourceLink(href) {
        return new URL(href, source).href;
    }
    function format(node) {
        if (node.nodeType === Node.TEXT_NODE) return node.nodeValue.replace(/\s+/g, ' ');
        if (node.nodeType !== Node.ELEMENT_NODE) return '';
        if (node.matches('img, svg, [aria-hidden="true"]')) return '';
        if (node.matches('br')) return '\n';
        const value = Array.from(node.childNodes, format).join('');
        if (node.matches('a')) {
            const target = node.dataset.sourceHref || sourceLink(node.getAttribute('href'));
            return /^https?:\/\//.test(target) ? '[' + escapeMarkdown(plainText(node.textContent)) + '](' + target + ')' : value;
        }
        if (node.matches('strong')) return '**' + value + '**';
        if (node.matches('div')) return value + '\n';
        return value;
    }
    function clean(value) {
        return value.split('\n').map(plainText).filter(Boolean).join('\n');
    }
    function markdown() {
        const out = [
            '# ' + article.querySelector('h1').textContent,
            plainText(article.querySelector('.article-meta').textContent),
            '[英文原文]' + '(' + source + ')'
        ];
        const selector = ':scope > p, :scope > h2, :scope > ul, :scope > table, :scope > details > summary, :scope > details > p, :scope > details > ul, figure';
        for (const el of article.querySelectorAll(selector)) {
            if (el.matches('ul')) {
                out.push(Array.from(el.children, li => '- ' + clean(format(li))).join('\n'));
            } else if (el.matches('table')) {
                const rows = Array.from(el.rows, row => Array.from(row.cells, cell => plainText(format(cell)).replaceAll('|', '\\|')));
                rows.splice(1, 0, rows[0].map(() => '---'));
                out.push(plainText(format(el.caption)) + '\n\n' + rows.map(row => '| ' + row.join(' | ') + ' |').join('\n'));
            } else if (el.matches('figure')) {
                const caption = el.querySelector('figcaption');
                const descriptions = Array.from(el.querySelectorAll('img[alt], svg[role="img"][aria-label]'))
                    .map(image => image.getAttribute('alt') ?? image.getAttribute('aria-label')).filter(Boolean);
                const title = '**插图**' + (caption ? '\n\n' + clean(format(caption)) : '');
                const screenshot = el.querySelector('a:has(img, svg[role="img"])');
                const url = screenshot && (screenshot.dataset.sourceHref || sourceLink(screenshot.getAttribute('href')));
                const imageLink = url && !title.includes(url) ? '[截图]' + '(' + url + ')' : '';
                out.push([title, descriptions.map(value => '- ' + value).join('\n'), imageLink].filter(Boolean).join('\n\n'));
            } else {
                out.push((el.matches('h2') ? '## ' : el.matches('summary') ? '### ' : '') + clean(format(el)));
            }
        }
        return out.join('\n\n') + '\n';
    }
    async function copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            const field = document.createElement('textarea');
            field.value = text;
            field.setAttribute('readonly', '');
            field.style.cssText = 'position:fixed;inset:0 auto auto 0;opacity:0;pointer-events:none';
            document.body.append(field);
            field.select();
            try {
                return document.execCommand('copy');
            } catch {
                return false;
            } finally {
                field.remove();
                button.focus({ preventScroll: true });
            }
        }
    }
    button.addEventListener('click', async () => {
        const ok = await copyText(markdown());
        clearTimeout(timer);
        const result = ok ? '已复制' : '无法复制';
        status.textContent = label.textContent = result;
        button.classList.toggle('copied', ok);
        timer = setTimeout(() => {
            label.textContent = originalLabel;
            status.textContent = '';
            button.classList.remove('copied');
        }, 2200);
    });
})();
