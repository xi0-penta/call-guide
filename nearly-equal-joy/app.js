(() => {
  'use strict';

  const favToggles = [...document.querySelectorAll('.fav-toggle')];
  const learnedToggles = [...document.querySelectorAll('.learned-toggle-global')];
  const favKey = 'nearlyEqualJoyCallGuide_favorites';
  const learnedKey = 'nearlyEqualJoyCallGuide_learned';

  const readSet = key => {
    try { return new Set(JSON.parse(localStorage.getItem(key) || '[]').map(String)); }
    catch (e) { return new Set(); }
  };

  const saveSet = (key, set) => {
    try { localStorage.setItem(key, JSON.stringify([...set])); }
    catch (e) {}
  };

  const favorites = readSet(favKey);
  const learned = readSet(learnedKey);

  const cardForLearnedToggle = toggle => {
    const label = document.querySelector('label[for="' + toggle.id + '"]');
    return label ? label.closest('.song-card') : null;
  };

  const updateMeter = () => {
    const total = learnedToggles.length;
    let learnedCount = 0;

    learnedToggles.forEach(toggle => {
      if (toggle.checked) learnedCount++;
      const card = cardForLearnedToggle(toggle);
      if (card) card.classList.toggle('is-learned', toggle.checked);
    });

    const pct = total ? (learnedCount / total) * 100 : 0;
    document.body.style.setProperty('--meter-progress', pct + '%');

    const count = document.querySelector('.understanding-count');
    if (count) count.textContent = learnedCount + ' / ' + total;

    const complete = document.querySelector('.crown-complete');
    if (complete) {
      const isComplete = total > 0 && learnedCount === total;
      complete.style.opacity = isComplete ? '1' : '0';
      complete.style.transform = isComplete
        ? 'translate(-50%,-50%) scale(1)'
        : 'translate(-50%,-50%) scale(.88)';
    }
  };

  favToggles.forEach(toggle => {
    const id = toggle.id.replace('fav-', '');
    toggle.checked = favorites.has(id);
    toggle.closest('.song-card')?.classList.toggle('is-favorite', toggle.checked);

    toggle.addEventListener('change', () => {
      if (toggle.checked) favorites.add(id);
      else favorites.delete(id);
      toggle.closest('.song-card')?.classList.toggle('is-favorite', toggle.checked);
      saveSet(favKey, favorites);
    });
  });

  learnedToggles.forEach(toggle => {
    const id = toggle.id.replace('learned-', '');
    toggle.checked = learned.has(id);

    toggle.addEventListener('change', () => {
      if (toggle.checked) learned.add(id);
      else learned.delete(id);
      saveSet(learnedKey, learned);
      updateMeter();
    });
  });

  updateMeter();

  const input = document.getElementById('songSearch');
  const clear = document.getElementById('searchClear');
  const count = document.getElementById('searchCount');
  const empty = document.getElementById('searchEmpty');
  const cards = [...document.querySelectorAll('.song-card')];
  if (!input || !cards.length) return;

  const kataToHira = s => s.replace(/[ァ-ヶ]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );

  const norm = s => kataToHira(String(s || '').normalize('NFKC').toLowerCase())
    .replace(/[「」『』【】()（）\[\]{}｛｝<>〈〉《》“”"'’‘・･,，.。!！?？#＃:：;；_\-—–〜~\/\\\s♡♥]/g, '');

  const indexes = cards.map(card => {
    const values = [
      card.dataset.title || '',
      card.dataset.aliases || '',
      card.dataset.search || ''
    ];
    return [...new Set(values.flatMap(value =>
      value.split('|').map(norm).filter(Boolean)
    ))];
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

    if (count) count.textContent = tokens.length ? shown + '曲ヒット' : cards.length + '曲';
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
