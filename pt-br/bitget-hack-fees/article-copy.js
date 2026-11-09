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
      if (!links.has(url)) links.set(url, {text: 'Evidências de transações de ' + row.address, url});
    for (const row of saved.oneinch_fee_transfers || [])
      if (!links.has(row.explorer)) links.set(row.explorer, {text: 'Transferência para o FeeCollector da 1inch', url: row.explorer});
    return {
      source_note: 'Pesquisa independente de Andrey Sergeenkov. Se usar os dados, cite o autor e inclua um link para o artigo original.',
      ...publication, author_url: 'https://sergeenkov.com/', author_contact: 'andrey@sergeenkov.com',
      snapshot_id: saved.snapshot_id, data_cutoff_utc: saved.cutoff_utc,
      report_generated_utc: saved.published_utc, evidence_checked_utc: saved.evidence_checked_utc,
      registry_version: saved.registry_version, currency: 'USD', valuation: 'Preços históricos',
      accounting_note: 'Os valores são expressos como texto decimal com centavos. As taxas registradas não equivalem a lucro líquido. Os vínculos analisados não comprovam que os endereços tenham o mesmo dono. Os totais não devem ser somados se um conjunto de dados estiver contido no outro.',
      article, links: [...links.values()],
      datasets: {
        protocol_and_service_fees: {total_usd: saved.totals.protocols_services_usd, rows: saved.protocol_mechanisms},
        linked_affiliate_recipients: {total_usd: saved.totals.linked_affiliates_usd, rows: saved.linked},
        other_affiliate_recipients: {total_usd: saved.totals.unresolved_affiliates_usd, rows: saved.other_affiliates, unassigned: saved.affiliate_unassigned},
        protocol_recipient_allocations: {total_usd: saved.totals.protocols_services_usd, rows: saved.protocol_recipients, unassigned: saved.protocol_unassigned},
        oneinch_fee_transfers: {rows: saved.oneinch_fee_transfers || [], note: 'Já incluído na categoria da 1inch acima. Evite a dupla contagem.'}
      }
    };
  }
  button.addEventListener('click', async () => {
    button.disabled = true;
    const text = JSON.stringify(copyPayload(), null, 2);
    try {
      await navigator.clipboard.writeText(text);
      document.getElementById('llm-copy-fallback').hidden = true;
      label.textContent = 'Copiado!'; button.classList.add('copied');
      status.textContent = 'Artigo copiado com os valores exatos, todos os destinatários e as evidências das transações.';
      setTimeout(() => {label.textContent = originalLabel; button.classList.remove('copied');}, 2000);
    } catch {
      const field = document.getElementById('llm-copy-text');
      field.value = text; document.getElementById('llm-copy-fallback').hidden = false;
      field.focus(); field.select();
      status.textContent = 'A área de transferência está indisponível. O texto completo está selecionado abaixo para cópia manual.';
    } finally { button.disabled = false; }
  });
  // The site include uses this handler for its contact-copy buttons.
  window.commissionCopy = async contact => {
    try {
      await navigator.clipboard.writeText(contact.dataset.copy);
      contact.classList.add('copied');
      contact.setAttribute('aria-label', 'Copiado: ' + contact.dataset.copy);
      setTimeout(() => {contact.classList.remove('copied'); contact.setAttribute('aria-label', contact.dataset.copy.includes('@sergeenkov.com') ? 'Copiar e-mail' : 'Copiar nome de usuário do Telegram');}, 2000);
    } catch { status.textContent = 'Copie este contato manualmente: ' + contact.dataset.copy; }
  };
})();
