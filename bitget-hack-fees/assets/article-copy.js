/* Copy the saved snapshot, including rows hidden by search and closed evidence. */
(() => {
  'use strict';
  const button = document.getElementById('llm-copy');
  if (!button) return;
  const publication = JSON.parse(document.getElementById('article-publication').textContent);
  const saved = JSON.parse(document.getElementById('article-fees-seed').textContent);
  const label = button.querySelector('span'), originalLabel = label.textContent;
  const status = document.getElementById('llm-copy-status');
  function copyPayload() {
    const article = [...document.querySelectorAll('.tldr-context, .tldr ul > li, article > p, article > h2, #methodology > p, #methodology > ul > li')]
      .map(element => ({type: element.tagName === 'H2' ? 'heading' : 'paragraph', text: element.textContent.trim()}));
    const links = new Map();
    for (const anchor of document.querySelectorAll('article a[href]')) {
      if (anchor.closest('.commission-box, .author-box, .toc') || anchor.getAttribute('href').startsWith('#')) continue;
      const url = new URL(anchor.getAttribute('href'), publication.article_url).href;
      links.set(url, {text: anchor.textContent.trim(), url});
    }
    for (const row of saved.linked) for (const evidence of row.evidence) for (const url of evidence.urls)
      if (!links.has(url)) links.set(url, {text: 'Transaction evidence for ' + row.address, url});
    return {
      source_note: 'Independent research by Andrey Sergeenkov. Cite the author and link to the original article when using these data.',
      ...publication, author_url: 'https://sergeenkov.com/', author_contact: 'andrey@sergeenkov.com',
      snapshot_id: saved.snapshot_id, data_cutoff_utc: saved.cutoff_utc,
      report_generated_utc: saved.published_utc, evidence_checked_utc: saved.evidence_checked_utc,
      registry_version: saved.registry_version, currency: 'USD', valuation: 'Historical prices',
      accounting_note: 'Amounts are decimal strings with cents. Recorded fees are not net profit; reviewed links do not establish common ownership. Dataset totals are not additive where one is a subset of another.',
      article, links: [...links.values()],
      datasets: {
        protocol_and_service_fees: {total_usd: saved.totals.protocols_services_usd, rows: saved.protocol_mechanisms},
        linked_affiliate_recipients: {total_usd: saved.totals.linked_affiliates_usd, rows: saved.linked},
        other_affiliate_recipients: {total_usd: saved.totals.unresolved_affiliates_usd, rows: saved.other_affiliates, unassigned: saved.affiliate_unassigned},
        protocol_recipient_allocations: {total_usd: saved.totals.protocols_services_usd, rows: saved.protocol_recipients, unassigned: saved.protocol_unassigned}
      }
    };
  }
  button.addEventListener('click', async () => {
    button.disabled = true;
    const text = JSON.stringify(copyPayload(), null, 2);
    try {
      await navigator.clipboard.writeText(text);
      document.getElementById('llm-copy-fallback').hidden = true;
      label.textContent = 'Copied!'; button.classList.add('copied');
      status.textContent = 'Copied the article, exact amounts, all recipient rows and transaction evidence.';
      setTimeout(() => {label.textContent = originalLabel; button.classList.remove('copied');}, 2000);
    } catch {
      const field = document.getElementById('llm-copy-text');
      field.value = text; document.getElementById('llm-copy-fallback').hidden = false;
      field.focus(); field.select();
      status.textContent = 'Clipboard access is unavailable. The full text is selected below for manual copying.';
    } finally { button.disabled = false; }
  });
  // The site include uses this handler for its contact-copy buttons.
  window.commissionCopy = async contact => {
    try {
      await navigator.clipboard.writeText(contact.dataset.copy);
      contact.classList.add('copied');
      contact.setAttribute('aria-label', 'Copied ' + contact.dataset.copy);
      setTimeout(() => {contact.classList.remove('copied'); contact.setAttribute('aria-label', contact.dataset.copy.includes('@sergeenkov.com') ? 'Copy email' : 'Copy Telegram handle');}, 2000);
    } catch { status.textContent = 'Copy this contact manually: ' + contact.dataset.copy; }
  };
})();
