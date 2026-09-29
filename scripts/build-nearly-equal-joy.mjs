import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const DATA_PATH = "data/nearly-equal-joy.json";
const TEMPLATE_PATH = "templates/nearly-equal-joy.html";
const FRAGMENT_PATH = "generated/nearly-equal-joy-song-cards.html";
const PAGE_PATH = "nearly-equal-joy/index.html";

const escapeText = value => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

const escapeAttr = value => escapeText(value).replaceAll('"', "&quot;");

const stripHtml = value => String(value ?? "")
  .replace(/<[^>]*>/g, " ")
  .replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/\s+/g, " ")
  .trim();

const data = JSON.parse(await readFile(DATA_PATH, "utf8"));
const songs = data.songs;

if (data.group !== "nearly-equal-joy") {
  throw new Error("data/nearly-equal-joy.json has unexpected group");
}
if (!Array.isArray(songs) || songs.length === 0) {
  throw new Error("data/nearly-equal-joy.json has no songs");
}

for (const [index, song] of songs.entries()) {
  if (song.id !== index + 1) throw new Error(`Song ids must be sequential: ${song.title}`);
  if (!song.title || !song.release) throw new Error(`Missing title/release at id ${song.id}`);
  if (!Array.isArray(song.aliases) || song.aliases.length === 0) {
    throw new Error(`Missing aliases for ${song.title}`);
  }
  if (!Array.isArray(song.badges) || !Array.isArray(song.filters) || !Array.isArray(song.basic)) {
    throw new Error(`Missing badges/filters/basic for ${song.title}`);
  }
  if (!song.fieldNoteHtml || !Array.isArray(song.sources) || song.sources.length === 0) {
    throw new Error(`Missing field note/sources for ${song.title}`);
  }
  if (song.variant) {
    if (!Array.isArray(song.variant.items) || !Array.isArray(song.variant.glossary)) {
      throw new Error(`Invalid variant data for ${song.title}`);
    }
  }
}

const searchText = song => {
  const variant = song.variant || {};
  const glossaryTerms = (variant.glossary || []).map(item =>
    stripHtml(item.termHtml).replace(/[:：]\s*$/, "")
  );

  return [
    song.title,
    ...(song.aliases || []),
    song.release,
    ...(song.badges || []),
    ...(song.basic || []),
    ...(variant.items || []),
    stripHtml(song.fieldNoteHtml),
    ...glossaryTerms
  ].filter(Boolean).join(" ");
};

const cardHtml = song => {
  const num = String(song.id).padStart(2, "0");
  const badges = song.badges.map(badge =>
    `<span class="mini-tag">${escapeText(badge)}</span>`
  ).join("");
  const basic = song.basic.map(item =>
    `<li>${escapeText(item)}</li>`
  ).join("");

  let variant = "";
  if (song.variant) {
    const items = song.variant.items.map(item =>
      `<li>${escapeText(item)}</li>`
    ).join("");

    const glossary = song.variant.glossary.map(item =>
      `<p class="variant-term"><strong>${item.termHtml}</strong>${item.bodyHtml}</p>`
    ).join("");

    variant = `<details class="variant-box">
<summary><span>特殊・派生を見る</span><span class="summary-plus">＋</span></summary>
<div class="variant-body"><ul>${items}</ul>${glossary ? `<div class="variant-glossary"><div class="variant-glossary-title">用語補足</div>${glossary}</div>` : ""}${song.variant.cautionHtml ? `<p class="variant-caution">${song.variant.cautionHtml}</p>` : ""}</div>
</details>`;
  }

  const sources = song.sources.map(source =>
    `<a href="${escapeAttr(source.url)}" rel="noopener noreferrer" target="_blank">${escapeText(source.label)}</a>`
  ).join("");

  return `<article class="song-card" data-aliases="${escapeAttr(song.aliases.join(" | "))}" data-search="${escapeAttr(searchText(song))}" data-song="${song.id}" data-tags="${escapeAttr(song.filters.join(" "))}" data-title="${escapeAttr(song.title)}" id="song-${num}"><input aria-hidden="true" class="state-toggle fav-toggle" id="fav-${song.id}" type="checkbox"/>
<div class="song-head">
<div class="song-num">${num}</div>
<div class="song-title-wrap">
<div class="release-chip">${escapeText(song.release)}</div>
<h2>${escapeText(song.title)}</h2>
<div class="tag-row">${badges}</div>
</div>
<div class="card-actions">
<label aria-label="${escapeAttr(song.title)}をお気に入りにする" class="fav-btn" for="fav-${song.id}" title="お気に入り">☆</label>
<label aria-label="${escapeAttr(song.title)}を覚えた曲にする" class="learned-btn" for="learned-${song.id}" title="覚えた">覚えた</label>
</div>
</div>
<section class="basic-section">
<div class="section-label">まず覚える</div>
<ul>${basic}</ul>
</section>
${variant}
<section class="field-note">
<div class="section-label">現場補足</div>
<p>${song.fieldNoteHtml}</p>
</section>
<div class="source-row">${sources}</div>
</article>`;
};

const cards = songs.map(cardHtml).join("\n");

const learnedInputs = songs.map(song =>
  `<input aria-hidden="true" class="state-toggle learned-toggle-global" id="learned-${song.id}" type="checkbox"/>`
).join("");

const datalist = songs.flatMap(song => [
  `<option value="${escapeAttr(song.title)}"></option>`,
  ...song.aliases.map(alias =>
    `<option label="${escapeAttr(song.title)}" value="${escapeAttr(alias)}"></option>`
  )
]).join("");

const template = await readFile(TEMPLATE_PATH, "utf8");
for (const marker of ["{{LEARNED_INPUTS}}", "{{SONG_CARDS}}", "{{DATALIST}}", "{{COUNT}}"]) {
  if (!template.includes(marker)) throw new Error(`Missing template marker: ${marker}`);
}

const page = template
  .replace("{{LEARNED_INPUTS}}", learnedInputs)
  .replace("{{SONG_CARDS}}", cards)
  .replace("{{DATALIST}}", datalist)
  .replaceAll("{{COUNT}}", String(songs.length));

await mkdir(dirname(FRAGMENT_PATH), { recursive: true });
await writeFile(FRAGMENT_PATH, cards + "\n", "utf8");
await writeFile(PAGE_PATH, page, "utf8");

console.log(`Generated ${songs.length} ≒JOY cards`);
console.log(`Generated ≒JOY page -> ${PAGE_PATH}`);
