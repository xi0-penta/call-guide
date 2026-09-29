import { readFile } from "node:fs/promises";

const data = JSON.parse(await readFile("data/nearly-equal-joy.json", "utf8"));
const html = await readFile("nearly-equal-joy/index.html", "utf8");
const template = await readFile("templates/nearly-equal-joy.html", "utf8");
const app = await readFile("nearly-equal-joy/app.js", "utf8");
const fragment = await readFile("generated/nearly-equal-joy-song-cards.html", "utf8");
const songs = data.songs;

const decode = value => String(value || "")
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">");

const stripHtml = value => decode(String(value || "").replace(/<[^>]*>/g, " "))
  .replace(/\s+/g, " ")
  .trim();

const attr = (source, name) => {
  const match = source.match(new RegExp(`${name}="([^"]*)"`));
  return match ? decode(match[1]) : "";
};

const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

const cards = [...html.matchAll(/<article class="song-card"[\s\S]*?<\/article>/g)].map(m => m[0]);
const fragmentCards = [...fragment.matchAll(/<article class="song-card"[\s\S]*?<\/article>/g)].map(m => m[0]);
const learnedInputs = [...html.matchAll(/<input[^>]*class="state-toggle learned-toggle-global"[^>]*>/g)].map(m => m[0]);
const favoriteInputs = [...html.matchAll(/<input[^>]*class="state-toggle fav-toggle"[^>]*>/g)].map(m => m[0]);
const datalistOptions = [...html.matchAll(/<option /g)];

expect(cards.length === songs.length, `Expected ${songs.length} cards, got ${cards.length}`);
expect(fragmentCards.length === songs.length, `Expected ${songs.length} fragment cards, got ${fragmentCards.length}`);
expect(learnedInputs.length === songs.length, `Expected ${songs.length} learned inputs, got ${learnedInputs.length}`);
expect(favoriteInputs.length === songs.length, `Expected ${songs.length} favorite inputs, got ${favoriteInputs.length}`);

const expectedOptions = songs.reduce((total, song) => total + 1 + song.aliases.length, 0);
expect(datalistOptions.length === expectedOptions, `Expected ${expectedOptions} datalist options, got ${datalistOptions.length}`);

for (const id of [
  "filter-all",
  "filter-basic",
  "filter-special",
  "filter-underground",
  "filter-participation",
  "filter-variable",
  "filter-quiet",
  "filter-favorite"
]) {
  expect(html.includes(`id="${id}"`), `Missing filter control: ${id}`);
}

cards.forEach((card, index) => {
  const song = songs[index];
  const num = String(song.id).padStart(2, "0");

  expect(attr(card, "data-title") === song.title, `Title mismatch on card ${index + 1}`);
  expect(attr(card, "data-song") === String(song.id), `data-song mismatch on ${song.title}`);
  expect(attr(card, "data-tags") === song.filters.join(" "), `Filters mismatch on ${song.title}`);
  expect(attr(card, "data-aliases") === song.aliases.join(" | "), `Aliases mismatch on ${song.title}`);
  expect(card.includes(`id="song-${num}"`), `Song id mismatch on ${song.title}`);
  expect(card.includes(`id="fav-${song.id}"`), `Favorite control mismatch on ${song.title}`);
  expect(card.includes(`for="learned-${song.id}"`), `Learned control mismatch on ${song.title}`);

  const release = stripHtml((card.match(/<div class="release-chip">([\s\S]*?)<\/div>/) || [])[1]);
  expect(release === song.release, `Release mismatch on ${song.title}`);

  const badges = [...card.matchAll(/<span class="mini-tag">([\s\S]*?)<\/span>/g)].map(m => stripHtml(m[1]));
  expect(JSON.stringify(badges) === JSON.stringify(song.badges), `Badges mismatch on ${song.title}`);

  const basicSection = (card.match(/<section class="basic-section">([\s\S]*?)<\/section>/) || [])[1] || "";
  const basic = [...basicSection.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m => stripHtml(m[1]));
  expect(JSON.stringify(basic) === JSON.stringify(song.basic), `Basic call mismatch on ${song.title}`);

  expect(card.includes('<details class="variant-box">') === Boolean(song.variant), `Variant presence mismatch on ${song.title}`);

  for (const source of song.sources) {
    expect(card.includes(`href="${source.url.replaceAll("&", "&amp;")}"`), `Source URL missing on ${song.title}`);
    expect(card.includes(`>${source.label}</a>`), `Source label missing on ${song.title}`);
  }
});

const filterCounts = songs.reduce((out, song) => {
  for (const filter of song.filters) out[filter] = (out[filter] || 0) + 1;
  return out;
}, {});

expect(html.includes('<script src="./app.js"></script>'), "app.js is not referenced");
expect(!html.includes("const input = document.getElementById('songSearch');"), "Legacy inline search remains");
expect(app.includes("card.dataset.title"), "Search does not index title");
expect(app.includes("card.dataset.aliases"), "Search does not index aliases");
expect(app.includes("card.dataset.search"), "Search does not index generated content");
expect(app.includes("learnedToggles.length"), "Meter total is not data-driven");
expect(app.includes("nearlyEqualJoyCallGuide_favorites"), "Favorite storage key changed");
expect(app.includes("nearlyEqualJoyCallGuide_learned"), "Learned storage key changed");
expect(html.includes(`for="filter-all">全${songs.length}曲</label>`), "All-song filter count is not data-driven");
expect(html.includes(`id="searchCount">${songs.length}曲表示</div>`), "Initial search count is not data-driven");
expect(!template.includes("全30曲"), "Template still hardcodes all-song count");
expect(!template.includes("30曲表示"), "Template still hardcodes search count");
expect(!template.includes('" / 30"'), "Template still hardcodes meter denominator");

console.log(
  `Verified ≒JOY page: ${songs.length} cards, ${expectedOptions} search options, filters ${JSON.stringify(filterCounts)}, dynamic meter/storage/search wiring OK`
);
