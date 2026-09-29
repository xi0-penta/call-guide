import fs from "node:fs";
import path from "node:path";

function escAttr(s="") {
  return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function escText(s="") {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function renderLearnedInputs(data) {
  return data.songs.map(s=>`<input aria-hidden="true" class="state-toggle learned-toggle-global"${data.group==="equal-love"?` data-key="${escAttr(s.key||s.title)}"`:""} id="learned-${s.id}" type="checkbox"/>`).join("");
}

function renderDatalist(data) {
  const lines=[];
  for(const s of data.songs) {
    const aliases=(s.aliases||[]).filter(Boolean);
    if(aliases.length) lines.push(`<option label="${escAttr(aliases.join(" / "))}" value="${escAttr(s.title)}"></option>`);
    for(const a of aliases) lines.push(`<option label="${escAttr(s.title)}" value="${escAttr(a)}"></option>`);
  }
  return lines.join("");
}

function renderEqual(data) {
  const songs=data.songs;
  const orderMap=(arr)=>new Map(arr.map((s,i)=>[s.id,i+1]));
  const byPriority=orderMap([...songs].sort((a,b)=>(b.priority-a.priority)||(a.id-b.id)));
  const byTiger=orderMap([...songs].sort((a,b)=>(Number(b.flags.tiger)-Number(a.flags.tiger))||(a.id-b.id)));
  const byColor=orderMap([...songs].sort((a,b)=>(Number(b.flags.color)-Number(a.flags.color))||(a.id-b.id)));
  const byTitle=orderMap([...songs].sort((a,b)=>a.title.localeCompare(b.title,"ja")||(a.id-b.id)));
  return songs.map(s=>{
    const tags=(s.tags||[]).map(t=>`<span class="tag">${escText(t)}</span>`).join("");
    const tiger=s.flags.tiger?`<span aria-label="家虎あり" class="tiger-chip" title="家虎（イェッタイガー系）あり">🐯 家虎</span>`:"";
    const color=s.colorChip?`<span class="color-chip">${escText(s.colorChip)}</span>`:"";
    const search=s.searchText||[s.title,s.rank,s.kind,s.summaryHtml,(s.tags||[]).join(" ")].join(" ");
    const source=s.source?`<div class="actions"><a href="${escAttr(s.source.url)}" rel="noopener noreferrer" target="_blank">${escText(s.source.label)}</a></div>`:"";
    return `<article class="song-card" data-color="${s.flags.color?1:0}" data-generic="${s.flags.generic?1:0}" data-key="${escAttr(s.key||s.title)}" data-original="${s.id}" data-participation="${s.flags.participation?1:0}" data-priority="${s.priority}" data-quiet="${s.flags.quiet?1:0}" data-search="${escAttr(search)}" data-tags="${escAttr((s.tags||[]).join(" "))}" data-tiger="${s.flags.tiger?1:0}" data-title="${escAttr(s.title)}" style="--ord-original:${s.id};--ord-priority:${byPriority.get(s.id)};--ord-tiger:${byTiger.get(s.id)};--ord-color:${byColor.get(s.id)};--ord-title:${byTitle.get(s.id)};">
<input class="state-toggle fav-toggle" id="fav-${s.id}" type="checkbox"/><div class="song-top">
<div class="song-title-wrap">
<span class="index">${s.id}</span>
<div class="song-main">
<h2>${escText(s.title)}</h2>
<div class="meta-row">
<span class="rank rank-${s.priority}">${escText(s.rank)}</span>
<span class="kind">${escText(s.kind)}</span>
${color}${tiger}
</div>
</div>
</div>
<div class="card-state-actions"><label aria-label="${escAttr(s.title)}をお気に入りにする" class="fav-btn" for="fav-${s.id}" title="お気に入り">☆</label><label aria-label="${escAttr(s.title)}を覚えた曲にする" class="learned-btn" for="learned-${s.id}" title="覚えた">覚えた</label></div></div>
<p class="summary">${s.summaryHtml||""}</p>
<div class="tags">${tags}</div>
${source}
</article>`;
  }).join("\n");
}

function renderNotEqual(data) {
  const cards=data.songs.map(s=>{
    const cls=["song-card",...(s.categories||[]).map(c=>`cat-${c}`)].join(" ");
    const calls=(s.calls||[]).map(x=>`<li>${x}</li>`).join("");
    const video=s.video?`<a class="video-btn" href="${escAttr(s.video.url)}" rel="noopener noreferrer" target="_blank"><span class="play">▶</span><span><strong>${escText(s.video.label)}</strong><small>${escText(s.video.caption)}</small></span></a>`:"";
    const source=s.source?`<a class="source-btn" href="${escAttr(s.source.url)}" rel="noopener noreferrer" target="_blank">${escText(s.source.label)}</a>`:"";
    const n=String(s.id).padStart(2,"0");
    return `<article class="${cls}" data-aliases="${escAttr((s.aliases||[]).join(" | "))}" data-title="${escAttr(s.title)}" id="song-${n}"><input aria-hidden="true" class="state-toggle fav-toggle" id="fav-${s.id}" type="checkbox"/>
<div class="song-head">
<div class="song-num">${n}</div>
<div class="song-title-wrap">
<h2>${escText(s.title)}</h2>
<div class="badge-row">
<span class="status ${escAttr(s.statusClass)}">${escText(s.statusText)}</span>
<span class="confidence">${escText(s.confidence)}</span>
</div>
</div>
<div class="card-state-actions"><label aria-label="${escAttr(s.title)}をお気に入りにする" class="fav-btn" for="fav-${s.id}" title="お気に入り">☆</label><label aria-label="${escAttr(s.title)}を覚えた曲にする" class="learned-btn" for="learned-${s.id}" title="覚えた">覚えた</label></div></div>
<section class="call-section"><div class="section-label">想定コール</div><ul>${calls}</ul></section>
<section class="field-note"><div class="section-label">現場補足</div><p>${s.fieldNoteHtml||""}</p></section>
<div class="actions">
${video}
${source}
</div>
</article>`;
  });
  const batches=[];
  for(let i=0;i<cards.length;i+=10){
    const start=i+1,end=Math.min(i+10,cards.length);
    batches.push(`<section aria-label="${start}〜${end}曲" class="song-batch${i===0?" first-batch":""}">${cards.slice(i,i+10).join("\n")}</section>`);
  }
  return batches.join("\n");
}

function renderNearly(data) {
  return data.songs.map(s=>{
    const n=String(s.id).padStart(2,"0");
    const badges=(s.badges||[]).map(x=>`<span class="mini-tag">${escText(x)}</span>`).join("");
    const basic=(s.basic||[]).map(x=>`<li>${x}</li>`).join("");
    let variant="";
    if(s.variant){
      const items=(s.variant.items||[]).map(x=>`<li>${x}</li>`).join("");
      const glossary=(s.variant.glossary||[]).map(g=>`<p class="variant-term"><strong>${g.termHtml}</strong>${g.bodyHtml}</p>`).join("");
      variant=`<details class="variant-box">
<summary><span>特殊・派生を見る</span><span class="summary-plus">＋</span></summary>
<div class="variant-body"><ul>${items}</ul>${glossary?`<div class="variant-glossary"><div class="variant-glossary-title">用語補足</div>${glossary}</div>`:""}${s.variant.cautionHtml?`<p class="variant-caution">${s.variant.cautionHtml}</p>`:""}</div>
</details>`;
    }
    const sources=(s.sources||[]).map(x=>`<a href="${escAttr(x.url)}" rel="noopener noreferrer" target="_blank">${escText(x.label)}</a>`).join("");
    const search=s.searchText||[s.title,...(s.aliases||[]),s.release,...(s.badges||[]),...(s.basic||[]),s.fieldNoteHtml].join(" ");
    return `<article class="song-card" data-aliases="${escAttr(search)}" data-search="${escAttr(search)}" data-song="${s.id}" data-tags="${escAttr((s.filters||[]).join(" "))}" data-title="${escAttr(s.title)}" id="song-${n}"><input aria-hidden="true" class="state-toggle fav-toggle" id="fav-${s.id}" type="checkbox"/>
<div class="song-head">
<div class="song-num">${n}</div>
<div class="song-title-wrap">
<div class="release-chip">${escText(s.release)}</div>
<h2>${escText(s.title)}</h2>
<div class="tag-row">${badges}</div>
</div>
<div class="card-actions">
<label aria-label="${escAttr(s.title)}をお気に入りにする" class="fav-btn" for="fav-${s.id}" title="お気に入り">☆</label>
<label aria-label="${escAttr(s.title)}を覚えた曲にする" class="learned-btn" for="learned-${s.id}" title="覚えた">覚えた</label>
</div>
</div>
<section class="basic-section">
<div class="section-label">まず覚える</div>
<ul>${basic}</ul>
</section>
${variant}
<section class="field-note">
<div class="section-label">現場補足</div>
<p>${s.fieldNoteHtml||""}</p>
</section>
<div class="source-row">${sources}</div>
</article>`;
  }).join("\n");
}

function meterScript(group) {
  return `<script>
(() => {
  const toggles = [...document.querySelectorAll('.learned-toggle-global')];
  const total = toggles.length;
  const body = document.body;
  const update = () => {
    let learned = 0;
    toggles.forEach(toggle => {
      if (toggle.checked) learned++;
      const label = document.querySelector('label[for="' + toggle.id + '"]');
      const card = label ? label.closest('.song-card') : null;
      if (card) card.classList.toggle('is-learned', toggle.checked);
    });
    const pct = total ? (learned / total) * 100 : 0;
    ${group==="equal-love"?`
    body.style.setProperty('--numa-progress', pct + '%');
    const value = document.getElementById('numaValue');
    const bottom = document.getElementById('numaBottom');
    if (value) value.textContent = Math.round(pct) + '%';
    if (bottom) bottom.textContent = total && learned === total ? 'COMPLETE!' : learned + ' / ' + total;
    if (pct >= 100) {
      body.style.setProperty('--numa-fill', '#ffd95c');
      body.style.setProperty('--numa-text', '#ffe680');
      body.style.setProperty('--numa-bg', 'linear-gradient(135deg,#2a2412,#4d3d12)');
      body.style.setProperty('--numa-border', '#c59a2e');
    } else if (pct >= 80) {
      body.style.setProperty('--numa-fill', '#e8327b');
      body.style.setProperty('--numa-text', '#ff4d93');
      body.style.setProperty('--numa-bg', 'var(--panel)');
      body.style.setProperty('--numa-border', 'var(--border)');
    } else if (pct >= 50) {
      body.style.setProperty('--numa-fill', '#ff6fae');
      body.style.setProperty('--numa-text', '#ff8fbd');
      body.style.setProperty('--numa-bg', 'var(--panel)');
      body.style.setProperty('--numa-border', 'var(--border)');
    } else {
      body.style.setProperty('--numa-fill', '#f6b9d0');
      body.style.setProperty('--numa-text', '#ffd1e3');
      body.style.setProperty('--numa-bg', 'var(--panel)');
      body.style.setProperty('--numa-border', 'var(--border)');
    }`:""}
    ${group==="not-equal-me"?`
    body.style.setProperty('--meter-angle', (pct * 3.6) + 'deg');
    const count = document.querySelector('.understanding-count');
    const complete = document.querySelector('.diamond-complete');
    if (count) count.textContent = learned + ' / ' + total;
    if (complete) complete.style.opacity = total && learned === total ? '1' : '0';`:""}
    ${group==="nearly-equal-joy"?`
    body.style.setProperty('--meter-progress', pct + '%');
    const count = document.querySelector('.understanding-count');
    const complete = document.querySelector('.crown-complete');
    if (count) count.textContent = learned + ' / ' + total;
    if (complete) complete.style.opacity = total && learned === total ? '1' : '0';`:""}
  };
  toggles.forEach(toggle => toggle.addEventListener('change', update));
  update();
})();
</script>`;
}

function buildPage(template,data) {
  const cards=data.group==="equal-love"?renderEqual(data):data.group==="not-equal-me"?renderNotEqual(data):renderNearly(data);
  return template
    .replaceAll("{{COUNT}}", String(data.songs.length))
    .replace("{{LEARNED_INPUTS}}", renderLearnedInputs(data))
    .replace("{{DATALIST}}", renderDatalist(data))
    .replace("{{SONG_CARDS}}", cards)
    .replace("{{METER_SCRIPT}}", meterScript(data.group));
}

const root=process.cwd();
const jobs=[
  ["equal-love","equal-love/index.html"],
  ["not-equal-me","not-equal-me/index.html"],
  ["nearly-equal-joy","nearly-equal-joy/index.html"]
];

for(const [group,outPath] of jobs){
  const data=JSON.parse(fs.readFileSync(path.join(root,"data",group+".json"),"utf8"));
  const template=fs.readFileSync(path.join(root,"templates",group+".html"),"utf8");
  const output=buildPage(template,data);
  fs.mkdirSync(path.dirname(path.join(root,outPath)),{recursive:true});
  fs.writeFileSync(path.join(root,outPath),output);
  console.log(group+": "+data.songs.length+" songs -> "+outPath);
}
