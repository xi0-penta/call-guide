import { readFile } from "node:fs/promises";

const data = JSON.parse(await readFile("data/not-equal-me.json", "utf8"));
const html = await readFile("not-equal-me/index.html", "utf8");
const app = await readFile("not-equal-me/app.js", "utf8");
const songs = data.songs;

const decode = s => String(s || "")
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">");

const attr = (source, name) => {
  const match = source.match(new RegExp(`${name}="([^"]*)"`));
  return match ? decode(match[1]) : "";
};

const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

const cards = [...html.matchAll(/<article class="song-card[^"]*"[\s\S]*?<\/article>/g)].map(m => m[0]);
const learnedInputs = [...html.matchAll(/<input[^>]*class="state-toggle learned-toggle-global"[^>]*>/g)].map(m => m[0]);
const favoriteInputs = [...html.matchAll(/<input[^>]*class="state-toggle fav-toggle"[^>]*>/g)].map(m => m[0]);
const batches = [...html.matchAll(/<section aria-label="\d+〜\d+曲" class="song-batch[^"]*">/g)].map(m => m[0]);
const datalistOptions = [...html.matchAll(/<option /g)];

expect(cards.length === songs.length, `Expected ${songs.length} cards, got ${cards.length}`);
expect(learnedInputs.length === songs.length, `Expected ${songs.length} learned inputs, got ${learnedInputs.length}`);
expect(favoriteInputs.length === songs.length, `Expected ${songs.length} favorite inputs, got ${favoriteInputs.length}`);
expect(batches.length === Math.ceil(songs.length / 10), `Expected 6 song batches, got ${batches.length}`);
expect(datalistOptions.length === songs.length * 11, `Expected ${songs.length * 11} datalist options, got ${datalistOptions.length}`);

for (const id of [
  "filter-all",
  "filter-active",
  "filter-participation",
  "filter-variable",
  "filter-mixed",
  "filter-listen",
  "filter-unknown"
]) {
  expect(html.includes(`id="${id}"`), `Missing filter control: ${id}`);
}

const parsed = cards.map((card, index) => {
  const classMatch = card.match(/<article class="([^"]*)"/);
  const className = classMatch ? classMatch[1] : "";
  const categoryMatch = className.match(/\bcat-([^\s"]+)/);

  return {
    title: attr(card, "data-title"),
    aliases: attr(card, "data-aliases").split("|").map(v => v.trim()).filter(Boolean),
    category: categoryMatch ? categoryMatch[1] : "",
    favId: (card.match(/id="fav-(\d+)"/) || [])[1] || "",
    learnedFor: (card.match(/for="learned-(\d+)"/) || [])[1] || "",
    songId: (card.match(/id="song-(\d+)"/) || [])[1] || "",
    expectedId: String(index + 1),
    expectedSongId: String(index + 1).padStart(2, "0")
  };
});

parsed.forEach((card, index) => {
  expect(card.title === songs[index].title, `Title mismatch at card ${index + 1}`);
  expect(card.aliases.length === 10, `Expected 10 aliases on ${card.title}`);
  expect(card.category === songs[index].category, `Category mismatch on ${card.title}`);
  expect(card.favId === card.expectedId, `Favorite control mismatch on ${card.title}`);
  expect(card.learnedFor === card.expectedId, `Learned control mismatch on ${card.title}`);
  expect(card.songId === card.expectedSongId, `Song id mismatch on ${card.title}`);
});

const counts = parsed.reduce((out, card) => {
  out[card.category] = (out[card.category] || 0) + 1;
  return out;
}, {});

const expectedCounts = songs.reduce((out, song) => {
  out[song.category] = (out[song.category] || 0) + 1;
  return out;
}, {});

expect(JSON.stringify(counts) === JSON.stringify(expectedCounts), "Category counts do not match JSON data");
expect(html.includes('<script src="./app.js"></script>'), "app.js is not referenced");
expect(!html.includes("const input = document.getElementById('songSearch');"), "Legacy inline search script remains");
expect(app.includes("card.dataset.title"), "Search script does not index titles");
expect(app.includes("card.dataset.aliases"), "Search script does not index aliases");
expect(html.includes(`<span id="searchCount">${songs.length}曲</span>`), "Search count is not data-driven");
expect(html.includes(`for="filter-all">全${songs.length}曲</label>`), "All-song filter count is not data-driven");

console.log(`Verified ≠ME page: ${songs.length} cards, ${batches.length} batches, filters ${JSON.stringify(counts)}, search/button wiring OK`);
