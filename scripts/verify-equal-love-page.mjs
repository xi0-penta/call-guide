import { readFile } from "node:fs/promises";

const data = JSON.parse(await readFile("data/equal-love.json", "utf8"));
const html = await readFile("equal-love/index.html", "utf8");
const app = await readFile("equal-love/app.js", "utf8");
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

const cards = [...html.matchAll(/<article class="song-card"[\s\S]*?<\/article>/g)].map(m => m[0]);
const learnedInputs = [...html.matchAll(/<input[^>]*class="state-toggle learned-toggle-global"[^>]*>/g)].map(m => m[0]);
const favoriteInputs = [...html.matchAll(/<input[^>]*class="state-toggle fav-toggle"[^>]*>/g)].map(m => m[0]);

const parsed = cards.map(card => ({
  title: attr(card, "data-title"),
  priority: Number(attr(card, "data-priority")),
  generic: attr(card, "data-generic") === "1",
  tiger: attr(card, "data-tiger") === "1",
  color: attr(card, "data-color") === "1",
  quiet: attr(card, "data-quiet") === "1",
  participation: attr(card, "data-participation") === "1",
  style: attr(card, "style"),
  favId: (card.match(/id="fav-(\d+)"/) || [])[1] || null,
  learnedFor: (card.match(/for="learned-(\d+)"/) || [])[1] || null
}));

const fail = message => { throw new Error(message); };
const expect = (condition, message) => { if (!condition) fail(message); };

expect(cards.length === songs.length, `Expected ${songs.length} cards, got ${cards.length}`);
expect(learnedInputs.length === songs.length, `Expected ${songs.length} learned inputs, got ${learnedInputs.length}`);
expect(favoriteInputs.length === songs.length, `Expected ${songs.length} favorite inputs, got ${favoriteInputs.length}`);

for (const id of [
  "filter-all", "filter-special", "filter-priority", "filter-generic",
  "filter-tiger", "filter-color", "filter-quiet", "filter-participation",
  "sort-original", "sort-priority", "sort-tiger", "sort-color", "sort-title"
]) {
  expect(html.includes(`id="${id}"`), `Missing control: ${id}`);
}

parsed.forEach((card, index) => {
  const id = String(index + 1);
  expect(card.favId === id, `Favorite control mismatch for card ${id}`);
  expect(card.learnedFor === id, `Learned control mismatch for card ${id}`);
});

const learnedIds = learnedInputs.map(input => (input.match(/id="learned-(\d+)"/) || [])[1]);
expect(new Set(learnedIds).size === songs.length, "Learned input ids are not unique");
expect(
  learnedIds.join(",") === [...songs].reverse().map(song => String(song.id)).join(","),
  "Learned inputs are not in the required reverse order"
);

const orderValue = (style, name) => {
  const match = style.match(new RegExp(`--${name}:(\\d+)`));
  return match ? Number(match[1]) : NaN;
};

const titlesByOrder = name => [...parsed]
  .sort((a, b) => orderValue(a.style, name) - orderValue(b.style, name))
  .map(card => card.title);

const expectedPriority = [...songs]
  .sort((a, b) => (b.priority - a.priority) || (a.id - b.id))
  .map(song => song.title);
const expectedTiger = [...songs]
  .sort((a, b) => (Number(b.flags.tiger) - Number(a.flags.tiger)) || (a.id - b.id))
  .map(song => song.title);
const expectedColor = [...songs]
  .sort((a, b) => (Number(b.flags.color) - Number(a.flags.color)) || (a.id - b.id))
  .map(song => song.title);
const expectedTitle = [...songs]
  .sort((a, b) => a.title < b.title ? -1 : a.title > b.title ? 1 : a.id - b.id)
  .map(song => song.title);

expect(JSON.stringify(titlesByOrder("ord-original")) === JSON.stringify(songs.map(song => song.title)), "Original sort order mismatch");
expect(JSON.stringify(titlesByOrder("ord-priority")) === JSON.stringify(expectedPriority), "Priority sort order mismatch");
expect(JSON.stringify(titlesByOrder("ord-tiger")) === JSON.stringify(expectedTiger), "Tiger sort order mismatch");
expect(JSON.stringify(titlesByOrder("ord-color")) === JSON.stringify(expectedColor), "Color sort order mismatch");
expect(JSON.stringify(titlesByOrder("ord-title")) === JSON.stringify(expectedTitle), "Title sort order mismatch");

expect(html.includes('<script src="./app.js"></script>'), "app.js is not referenced");
expect(!html.includes("var search=document.getElementById('search');"), "Legacy inline search script remains");
expect(app.includes("equalLoveCallGuide_favorites"), "Favorite localStorage key changed");
expect(app.includes("equalLoveCallGuide_learned"), "Learned localStorage key changed");
expect(app.includes("data-search-title"), "Split title search is missing");
expect(app.includes("data-search-content"), "Split content search is missing");

const counts = {
  special: parsed.filter(card => card.priority === 2 || card.priority === 3).length,
  priority3: parsed.filter(card => card.priority === 3).length,
  generic: parsed.filter(card => card.generic).length,
  tiger: parsed.filter(card => card.tiger).length,
  color: parsed.filter(card => card.color).length,
  quiet: parsed.filter(card => card.quiet).length,
  participation: parsed.filter(card => card.participation).length
};

console.log(`Verified =LOVE page: ${songs.length} cards, filters ${JSON.stringify(counts)}, sorting/state/search wiring OK`);
