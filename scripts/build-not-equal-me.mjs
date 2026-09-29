import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const DATA_PATH = "data/not-equal-me.json";
const TEMPLATE_PATH = "templates/not-equal-me.html";
const FRAGMENT_PATH = "generated/not-equal-me-song-batches.html";
const PAGE_PATH = "not-equal-me/index.html";

const escapeText = value => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

const escapeAttr = value => escapeText(value).replaceAll('"', "&quot;");

const data = JSON.parse(await readFile(DATA_PATH, "utf8"));
const songs = data.songs;

if (!Array.isArray(songs) || songs.length === 0) {
  throw new Error("data/not-equal-me.json has no songs");
}

for (const [index, song] of songs.entries()) {
  if (song.id !== index + 1) throw new Error(`Song ids must be sequential: ${song.title}`);
  if (!song.title || !song.key) throw new Error(`Missing title/key at id ${song.id}`);
  if (!Array.isArray(song.aliases) || song.aliases.length !== 10) {
    throw new Error(`Expected 10 aliases for ${song.title}`);
  }
  if (!song.category || !song.status?.className || !song.status?.label) {
    throw new Error(`Missing category/status for ${song.title}`);
  }
  if (!Array.isArray(song.calls) || song.calls.length === 0) {
    throw new Error(`Missing call list for ${song.title}`);
  }
  if (!song.fieldNote || !song.video?.url || !song.source?.url) {
    throw new Error(`Missing notes/source for ${song.title}`);
  }
}

const cardHtml = song => {
  const num = String(song.id).padStart(2, "0");
  const aliases = song.aliases.join(" | ");
  const calls = song.calls.map(call => `<li>${escapeText(call)}</li>`).join("");

  return `<article class="song-card cat-${escapeAttr(song.category)}" data-aliases="${escapeAttr(aliases)}" data-title="${escapeAttr(song.title)}" id="song-${num}"><input aria-hidden="true" class="state-toggle fav-toggle" id="fav-${song.id}" type="checkbox"/>
<div class="song-head">
<div class="song-num">${num}</div>
<div class="song-title-wrap">
<h2>${escapeText(song.title)}</h2>
<div class="badge-row">
<span class="status ${escapeAttr(song.status.className)}">${escapeText(song.status.label)}</span>
<span class="confidence">確度：${escapeText(song.confidence)}</span>
</div>
</div>
<div class="card-state-actions"><label aria-label="${escapeAttr(song.title)}をお気に入りにする" class="fav-btn" for="fav-${song.id}" title="お気に入り">☆</label><label aria-label="${escapeAttr(song.title)}を覚えた曲にする" class="learned-btn" for="learned-${song.id}" title="覚えた">覚えた</label></div></div>
<section class="call-section"><div class="section-label">想定コール</div><ul>${calls}</ul></section>
<section class="field-note"><div class="section-label">現場補足</div><p>${escapeText(song.fieldNote)}</p></section>
<div class="actions">
<a class="video-btn" href="${escapeAttr(song.video.url)}" rel="noopener noreferrer" target="_blank"><span class="play">▶</span><span><strong>${escapeText(song.video.label)}</strong><small>${escapeText(song.video.note)}</small></span></a>
<a class="source-btn" href="${escapeAttr(song.source.url)}" rel="noopener noreferrer" target="_blank">${escapeText(song.source.label)}</a>
</div>
</article>`;
};

const batches = [];
for (let start = 0; start < songs.length; start += 10) {
  const batch = songs.slice(start, start + 10);
  const from = batch[0].id;
  const to = batch.at(-1).id;
  const cls = start === 0 ? "song-batch first-batch" : "song-batch lazy-batch";
  batches.push(`<section aria-label="${from}〜${to}曲" class="${cls}">${batch.map(cardHtml).join("\n")}
</section>`);
}
const batchHtml = batches.join("");

const learnedInputs = songs.map(song =>
  `<input aria-hidden="true" class="state-toggle learned-toggle-global" id="learned-${song.id}" type="checkbox"/>`
).join("");

const datalistOptions = songs.flatMap(song => {
  const aliases = song.aliases.join(" / ");
  return [
    `<option label="${escapeAttr(aliases)}" value="${escapeAttr(song.title)}"></option>`,
    ...song.aliases.map(alias =>
      `<option label="${escapeAttr(song.title)}" value="${escapeAttr(alias)}"></option>`
    )
  ];
}).join("");

const template = await readFile(TEMPLATE_PATH, "utf8");
for (const marker of ["{{LEARNED_INPUTS}}", "{{SONG_BATCHES}}", "{{DATALIST_OPTIONS}}", "{{COUNT}}"]) {
  if (!template.includes(marker)) throw new Error(`Missing template marker: ${marker}`);
}

const page = template
  .replace("{{LEARNED_INPUTS}}", learnedInputs)
  .replace("{{SONG_BATCHES}}", batchHtml)
  .replace("{{DATALIST_OPTIONS}}", datalistOptions)
  .replaceAll("{{COUNT}}", String(songs.length));

await mkdir(dirname(FRAGMENT_PATH), { recursive: true });
await writeFile(FRAGMENT_PATH, batchHtml + "\n", "utf8");
await writeFile(PAGE_PATH, page, "utf8");

console.log(`Generated ${songs.length} ≠ME cards in ${batches.length} batches`);
console.log(`Generated ≠ME page -> ${PAGE_PATH}`);
