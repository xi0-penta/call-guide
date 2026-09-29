(() => {
  'use strict';

  const input = document.getElementById('songSearch');
  const clear = document.getElementById('searchClear');
  const count = document.getElementById('searchCount');
  const empty = document.getElementById('searchEmpty');
  const cards = [...document.querySelectorAll('.song-card')];
  if (!input || !cards.length) return;

  const kataToHira = s => s.replace(/[ァ-ヶ]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );

  const norm = s => kataToHira((s || '').toString().normalize('NFKC').toLowerCase())
    .replace(/[「」『』【】()（）\[\]{}｛｝<>〈〉《》“”"'’‘・･,，.。!！?？#＃:：;；_\-—–〜~\/\\\s♡♥]/g, '');

  const indexes = cards.map(card => {
    const title = norm(card.dataset.title || '');
    const aliases = (card.dataset.aliases || '').split('|').map(norm).filter(Boolean);
    return [...new Set([title, ...aliases])];
  });

  const render = () => {
    const tokens = input.value.trim().split(/\s+/).map(norm).filter(Boolean);
    let shown = 0;

    cards.forEach((card, i) => {
      const ok = !tokens.length || tokens.every(token =>
        indexes[i].some(keyword => keyword.includes(token))
      );
      card.classList.toggle('search-hidden', !ok);
      if (ok) shown++;
    });

    if (count) count.textContent = tokens.length ? `${shown}曲ヒット` : `${cards.length}曲`;
    if (empty) empty.classList.toggle('show', tokens.length > 0 && shown === 0);
  };

  input.addEventListener('input', render, {passive:true});
  input.addEventListener('search', render, {passive:true});

  if (clear) {
    clear.addEventListener('click', () => {
      input.value = '';
      render();
      input.focus();
    });
  }

  render();
})();
