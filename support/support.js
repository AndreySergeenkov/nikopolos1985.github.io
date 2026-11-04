(function () {
    'use strict';

    function selectAddress(address) {
        var selection = window.getSelection();
        if (!selection) return;
        var range = document.createRange();
        range.selectNodeContents(address);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function fallbackCopy(text) {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        var copied = false;
        try { copied = document.execCommand('copy'); } catch (_) { /* Manual selection remains available. */ }
        textarea.remove();
        return copied;
    }

    document.querySelectorAll('[data-copy-address]').forEach(function (button) {
        button.addEventListener('click', async function () {
            var address = document.getElementById(button.getAttribute('data-copy-address'));
            var card = button.closest('.wallet-card');
            var status = card.querySelector('.wallet-status');
            var text = address.textContent.trim();
            var copied = false;
            try {
                if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(text);
                    copied = true;
                }
            } catch (_) { /* Try the synchronous fallback below. */ }
            if (!copied) copied = fallbackCopy(text);
            clearTimeout(button.copyResetTimer);
            if (copied) {
                button.textContent = 'Copied';
                status.textContent = card.getAttribute('data-coin') + ' address copied.';
                button.focus({ preventScroll: true });
                button.copyResetTimer = setTimeout(function () {
                    button.textContent = 'Copy address';
                    status.textContent = '';
                }, 2500);
            } else {
                selectAddress(address);
                status.textContent = 'Address selected. Please copy it manually.';
            }
        });
    });
})();
