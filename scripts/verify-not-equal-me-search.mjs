import { readFile } from "node:fs/promises";

const data = JSON.parse(await readFile("data/not-equal-me.json", "utf8"));
const songs = data.songs;

const kataToHira = s => s.replace(/[ァ-ヶ]/g, ch =>
  String.fromCharCode(ch.charCodeAt(0) - 0x60)
);

const norm = s => kataToHira(String(s || "").normalize("NFKC").toLowerCase())
  .replace(/[「」『』【】()（）\[\]{}｛｝<>〈〉《》“”"'’‘・･,，.。!！?？#＃:：;；_\-—–〜~\/\\\s♡♥]/g, "");

const indexes = songs.map(song => [
  norm(song.title),
  ...song.aliases.map(norm)
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

for (const song of songs) {
  if (!Array.isArray(song.aliases) || song.aliases.length !== 10) {
    throw new Error(`Expected 10 aliases for ${song.title}`);
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
  ["ノイミー", ["≠ME"]],
  ["君僕", ["「君と僕の歌」"]],
  ["きゅんかわ", ["きゅんかわ人生"]],
  ["PIC", ["P.I.C."]],
  ["ピーアイ", ["P.I.C."]],
  ["ラスチャン", ["ラストチャンス、ラストダンス"]],
  ["夏恋", ["君はこの夏、恋をする"]],
  ["チョコレート", ["チョコレートメランコリー", "サマーチョコレート"]],
  ["ヒロイン", ["超絶ヒロイン", "ヒロインとオオカミ"]],
  ["君 僕", ["「君と僕の歌」"]]
]);

for (const [query, expected] of exactCases) {
  const actual = search(query);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Search mismatch for "${query}"\nexpected: ${JSON.stringify(expected)}\nactual:   ${JSON.stringify(actual)}`
    );
  }
}

console.log(`Verified ${songs.length} ≠ME songs, ${songs.length * 10} aliases, and ${exactCases.size} search cases`);
