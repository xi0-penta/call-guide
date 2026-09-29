import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const DATA_PATH = "data/equal-love.json";
const TEMPLATE_PATH = "templates/equal-love.html";
const FRAGMENT_PATH = "generated/equal-love-song-cards.html";
const PAGE_PATH = "equal-love/index.html";

const escapeText = value => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

const escapeAttr = value => escapeText(value)
  .replaceAll('"', "&quot;");

const rankBy = (songs, compare) => {
  const ordered = [...songs].sort(compare);
  return new Map(ordered.map((song, index) => [song.id, index + 1]));
};

const source = JSON.parse(await readFile(DATA_PATH, "utf8"));
const songs = source.songs;

if (!Array.isArray(songs) || songs.length === 0) {
  throw new Error("data/equal-love.json has no songs");
}

for (const [index, song] of songs.entries()) {
  if (song.id !== index + 1) throw new Error(`Song ids must be sequential: ${song.title}`);
  if (!song.title || !song.key) throw new Error(`Missing title/key at id ${song.id}`);
  if (!Array.isArray(song.aliases) || song.aliases.length !== 10) {
    throw new Error(`Expected 10 aliases for ${song.title}`);
  }
}

const originalOrder = new Map(songs.map(song => [song.id, song.id]));
const priorityOrder = rankBy(songs, (a, b) => (b.priority - a.priority) || (a.id - b.id));
const tigerOrder = rankBy(songs, (a, b) =>
  (Number(b.flags.tiger) - Number(a.flags.tiger)) || (a.id - b.id)
);
const colorOrder = rankBy(songs, (a, b) =>
  (Number(b.flags.color) - Number(a.flags.color)) || (a.id - b.id)
);
const titleOrder = rankBy(songs, (a, b) =>
  a.title < b.title ? -1 : a.title > b.title ? 1 : a.id - b.id
);

const cardHtml = song => {
  const tags = song.tags.map(tag => `<span class="tag">${escapeText(tag)}</span>`).join("");
  const tigerChip = song.flags.tiger
    ? '<span aria-label="家虎あり" class="tiger-chip" title="家虎（イェッタイガー系）あり">🐯 家虎</span>'
    : "";
  const colorChip = song.colorLabel
    ? `<span class="color-chip">${escapeText(song.colorLabel)}</span>`
    : "";

  const titleSearchText = [
    song.title,
    ...song.aliases
  ].filter(Boolean).join(" ").toLowerCase();

  const contentSearchText = [
    song.rank,
    song.kind,
    song.summary,
    song.colorLabel ? song.colorLabel.replace(/^色：/, "") : "",
    ...song.tags,
    song.flags.tiger ? "イェッタイガー" : ""
  ].filter(Boolean).join(" ").toLowerCase();

  const searchText = [titleSearchText, contentSearchText].filter(Boolean).join(" ");

  const attrs = [
    `data-color="${song.flags.color ? 1 : 0}"`,
    `data-generic="${song.flags.generic ? 1 : 0}"`,
    `data-key="${escapeAttr(song.key)}"`,
    `data-original="${song.id}"`,
    `data-participation="${song.flags.participation ? 1 : 0}"`,
    `data-priority="${song.priority}"`,
    `data-quiet="${song.flags.quiet ? 1 : 0}"`,
    `data-search="${escapeAttr(searchText)}"`,
    `data-search-title="${escapeAttr(titleSearchText)}"`,
    `data-search-content="${escapeAttr(contentSearchText)}"`,
    `data-tags="${escapeAttr(song.tags.join(" "))}"`,
    `data-tiger="${song.flags.tiger ? 1 : 0}"`,
    `data-title="${escapeAttr(song.title)}"`,
    `style="--ord-original:${originalOrder.get(song.id)};--ord-priority:${priorityOrder.get(song.id)};--ord-tiger:${tigerOrder.get(song.id)};--ord-color:${colorOrder.get(song.id)};--ord-title:${titleOrder.get(song.id)};"`
  ].join(" ");

  return `<article class="song-card" ${attrs}>
<input class="state-toggle fav-toggle" id="fav-${song.id}" type="checkbox"/><div class="song-top">
<div class="song-title-wrap">
<span class="index">${song.id}</span>
<div class="song-main">
<h2>${escapeText(song.title)}</h2>
<div class="meta-row">
<span class="rank rank-${song.priority}">${escapeText(song.rank)}</span>
<span class="kind">${escapeText(song.kind)}</span>
${tigerChip}${colorChip}
</div>
</div>
</div>
<div class="card-state-actions"><label aria-label="${escapeAttr(song.title)}をお気に入りにする" class="fav-btn" for="fav-${song.id}" title="お気に入り">☆</label><label aria-label="${escapeAttr(song.title)}を覚えた曲にする" class="learned-btn" for="learned-${song.id}" title="覚えた">覚えた</label></div></div>
<p class="summary">${escapeText(song.summary)}</p>
<div class="tags">${tags}</div>
<div class="actions"><a href="${escapeAttr(song.source.url)}" rel="noopener noreferrer" target="_blank">${escapeText(song.source.label)}</a></div>
</article>`;
};

const output = songs.map(cardHtml).join("\n") + "\n";

const learnedInputs = [...songs]
  .reverse()
  .map(song =>
    `<input aria-hidden="true" class="state-toggle learned-toggle-global" data-key="${escapeAttr(song.key)}" id="learned-${song.id}" type="checkbox"/>`
  )
  .join("");

const template = await readFile(TEMPLATE_PATH, "utf8");
const required = ["{{LEARNED_INPUTS}}", "{{SONG_CARDS}}", "{{COUNT}}"];
for (const marker of required) {
  if (!template.includes(marker)) {
    throw new Error(`Missing template marker: ${marker}`);
  }
}

const page = template
  .replace("{{LEARNED_INPUTS}}", learnedInputs)
  .replace("{{SONG_CARDS}}", output.trimEnd())
  .replaceAll("{{COUNT}}", String(songs.length));

await mkdir(dirname(FRAGMENT_PATH), { recursive: true });
await writeFile(FRAGMENT_PATH, output, "utf8");
await writeFile(PAGE_PATH, page, "utf8");

console.log(`Generated ${songs.length} =LOVE cards -> ${FRAGMENT_PATH}`);
console.log(`Generated =LOVE page -> ${PAGE_PATH}`);
