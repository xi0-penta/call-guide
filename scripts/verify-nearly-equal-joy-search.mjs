import { readFile } from "node:fs/promises";

const data = JSON.parse(await readFile("data/nearly-equal-joy.json", "utf8"));
const songs = data.songs;

const kataToHira = s => s.replace(/[ァ-ヶ]/g, ch =>
  String.fromCharCode(ch.charCodeAt(0) - 0x60)
);

const norm = s => kataToHira(String(s || "").normalize("NFKC").toLowerCase())
  .replace(/[「」『』【】()（）\[\]{}｛｝<>〈〉《》“”"'’‘・･,，.。!！?？#＃:：;；_\-—–〜~\/\\\s♡♥]/g, "");

const stripHtml = value => String(value || "")
  .replace(/<[^>]*>/g, " ")
  .replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/\s+/g, " ")
  .trim();

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

const indexes = songs.map(song => [
  norm(song.title),
  ...(song.aliases || []).map(norm),
  norm(searchText(song))
]);

const search = query => {
  const tokens = String(query || "").trim().split(/\s+/).map(norm).filter(Boolean);
  if (!tokens.length) return songs.map(song => song.title);

  return songs
    .filter((song, i) => tokens.every(token =>
      indexes[i].some(keyword => keyword.includes(token))
    ))
    .map(song => song.title);
};

for (const [index, song] of songs.entries()) {
  if (song.id !== index + 1) throw new Error(`Non-sequential id on ${song.title}`);
  if (!Array.isArray(song.aliases) || song.aliases.length === 0) {
    throw new Error(`Expected aliases for ${song.title}`);
  }

  const normalized = song.aliases.map(norm);
  if (new Set(normalized).size !== normalized.length) {
    throw new Error(`Normalized alias duplicate in ${song.title}`);
  }

  for (const alias of song.aliases) {
    const results = search(alias);
    if (!results.includes(song.title)) {
      throw new Error(`Alias "${alias}" does not find ${song.title}`);
    }
  }
}

const exactCases = new Map([
  ["nearly equal joy", ["≒JOY"]],
  ["むぼうじん", ["無謀人"]],
  ["ブルハワ", ["ブルーハワイレモン"]],
  ["今恋", ["今、恋をしている"]],
  ["愛痛", ["愛が痛かった"]],
  ["サマツイ", ["サマーツインテール"]],
  ["おたすけやさん", ["0120お助け屋さん"]],
  ["ビスマルク", ["大空、ビュンと"]],
  ["町中華", ["0120お助け屋さん"]],
  ["ブルハワ 地下系", ["ブルーハワイレモン"]]
]);

for (const [query, expected] of exactCases) {
  const actual = search(query);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Search mismatch for "${query}"\nexpected: ${JSON.stringify(expected)}\nactual:   ${JSON.stringify(actual)}`
    );
  }
}

const aliasCount = songs.reduce((total, song) => total + song.aliases.length, 0);
console.log(`Verified ${songs.length} ≒JOY songs, ${aliasCount} aliases, and ${exactCases.size} search cases`);
