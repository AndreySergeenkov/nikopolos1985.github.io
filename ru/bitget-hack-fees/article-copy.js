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
    const article = [...document.querySelectorAll('.update-line, .tldr-context, .tldr ul > li, article > p, article > h2, #methodology > p, #methodology > ul > li')]
      .map(element => ({type: element.tagName === 'H2' ? 'heading' : 'paragraph', text: element.textContent.trim()}));
    const links = new Map();
    for (const anchor of document.querySelectorAll('article a[href]')) {
      if (anchor.closest('.commission-box, .author-box, .toc') || anchor.getAttribute('href').startsWith('#')) continue;
      const url = new URL(anchor.dataset.sourceHref || anchor.getAttribute('href'), publication.article_url).href;
      links.set(url, {text: anchor.textContent.trim(), url});
    }
    for (const row of saved.linked) for (const evidence of row.evidence) for (const url of evidence.urls)
      if (!links.has(url)) links.set(url, {text: 'Транзакции, подтверждающие связи для ' + row.address, url});
    for (const row of saved.oneinch_fee_transfers || [])
      if (!links.has(row.explorer)) links.set(row.explorer, {text: 'Перевод на 1inch FeeCollector', url: row.explorer});
    return {
      source_note: 'Независимое исследование Андрея Сергеенкова. При использовании данных укажите автора и дайте ссылку на оригинал.',
      ...publication, author_url: 'https://sergeenkov.com/', author_contact: 'andrey@sergeenkov.com',
      snapshot_id: saved.snapshot_id, data_cutoff_utc: saved.cutoff_utc,
      report_generated_utc: saved.published_utc, evidence_checked_utc: saved.evidence_checked_utc,
      registry_version: saved.registry_version, currency: 'USD', valuation: 'Исторические цены',
      accounting_note: 'Суммы записаны десятичными строками с точностью до цента. Зафиксированные комиссии не равны чистой прибыли. Подтверждённые связи не доказывают общего владельца. Суммы по вложенным наборам данных нельзя складывать.',
      article, links: [...links.values()],
      datasets: {
        protocol_and_service_fees: {total_usd: saved.totals.protocols_services_usd, rows: saved.protocol_mechanisms},
        linked_affiliate_recipients: {total_usd: saved.totals.linked_affiliates_usd, rows: saved.linked},
        other_affiliate_recipients: {total_usd: saved.totals.unresolved_affiliates_usd, rows: saved.other_affiliates, unassigned: saved.affiliate_unassigned},
        protocol_recipient_allocations: {total_usd: saved.totals.protocols_services_usd, rows: saved.protocol_recipients, unassigned: saved.protocol_unassigned},
        oneinch_fee_transfers: {rows: saved.oneinch_fee_transfers || [], note: 'Эти суммы уже включены в категорию 1inch.'}
      }
    };
  }
  button.addEventListener('click', async () => {
    button.disabled = true;
    const text = JSON.stringify(copyPayload(), null, 2);
    try {
      await navigator.clipboard.writeText(text);
      document.getElementById('llm-copy-fallback').hidden = true;
      label.textContent = 'Скопировано'; button.classList.add('copied');
      status.textContent = 'Скопированы статья, точные суммы, все строки получателей и подтверждающие транзакции.';
      setTimeout(() => {label.textContent = originalLabel; button.classList.remove('copied');}, 2000);
    } catch {
      const field = document.getElementById('llm-copy-text');
      field.value = text; document.getElementById('llm-copy-fallback').hidden = false;
      field.focus(); field.select();
      status.textContent = 'Буфер обмена недоступен. Полный текст выделен ниже для ручного копирования.';
    } finally { button.disabled = false; }
  });
  // The site include uses this handler for its contact-copy buttons.
  window.commissionCopy = async contact => {
    try {
      await navigator.clipboard.writeText(contact.dataset.copy);
      contact.classList.add('copied');
      contact.setAttribute('aria-label', 'Скопировано: ' + contact.dataset.copy);
      setTimeout(() => {contact.classList.remove('copied'); contact.setAttribute('aria-label', contact.dataset.copy.includes('@sergeenkov.com') ? 'Скопировать адрес почты' : 'Скопировать имя пользователя в Telegram');}, 2000);
    } catch { status.textContent = 'Скопируйте контакт вручную: ' + contact.dataset.copy; }
  };
})();
