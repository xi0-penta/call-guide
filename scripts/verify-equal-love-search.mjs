import { readFile } from "node:fs/promises";

const data = JSON.parse(await readFile("data/equal-love.json", "utf8"));
const songs = data.songs;

const kataToHira = s => s.replace(/[ァ-ヶ]/g, ch =>
  String.fromCharCode(ch.charCodeAt(0) - 0x60)
);

const norm = s => kataToHira(String(s || "").normalize("NFKC").toLowerCase())
  .replace(/[「」『』【】()（）\[\]{}｛｝<>〈〉《》“”"'’‘・･,，.。!！?？#＃:：;；_\-—–〜~\/\\\s♡♥]/g, "");

const indexes = songs.map(song => ({
  title: norm([song.title, ...song.aliases].join(" ")),
  content: norm([
    song.rank,
    song.kind,
    song.summary,
    song.colorLabel ? song.colorLabel.replace(/^色：/, "") : "",
    ...song.tags,
    song.flags.tiger ? "イェッタイガー" : ""
  ].filter(Boolean).join(" "))
}));

const search = query => {
  const tokens = String(query || "").trim().split(/\s+/).map(norm).filter(Boolean);
  if (!tokens.length) return songs.map(song => song.title);

  const combined = indexes.map(index => tokens.every(token =>
    index.title.includes(token) || index.content.includes(token)
  ));
  const titleSignals = indexes.map((index, i) =>
    combined[i] && tokens.some(token => index.title.includes(token))
  );
  const preferTitle = titleSignals.some(Boolean);

  return songs
    .filter((song, i) => preferTitle ? titleSignals[i] : combined[i])
    .map(song => song.title);
};

const exactCases = new Map([
  ["イコラブ", ["＝LOVE", "ようこそ！イコラブ沼"]],
  ["いこ", ["＝LOVE", "ようこそ！イコラブ沼"]],
  ["ダイリリ", ["探せ ダイヤモンドリリー"]],
  ["ラスノ", ["ラストノートしか知らない"]],
  ["カメオ", ["CAMEO"]],
  ["クイーンズ", ["Queens"]],
  ["デート", ["トリプルデート", "「ドライブ　デート　都内」"]],
  ["赤", ["記憶のどこかで", "手遅れcaution"]],
  ["家虎", ["＝LOVE", "「部活中に目が合うなって思ってたんだ」", "樹愛羅、助けに来たぞ", "探せ ダイヤモンドリリー"]],
  ["ダイリリ 家虎", ["探せ ダイヤモンドリリー"]]
]);

for (const [query, expected] of exactCases) {
  const actual = search(query);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Search mismatch for "${query}"\nexpected: ${JSON.stringify(expected)}\nactual:   ${JSON.stringify(actual)}`);
  }
}

for (const song of songs) {
  if (!Array.isArray(song.aliases) || song.aliases.length !== 10) {
    throw new Error(`Expected 10 aliases for ${song.title}`);
  }
}

console.log(`Verified ${songs.length} songs and ${exactCases.size} search cases`);
