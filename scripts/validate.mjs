import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const groups=["equal-love","not-equal-me","nearly-equal-joy"];
let failed=false;

for(const group of groups){
  const file=path.join(root,"data",group+".json");
  const data=JSON.parse(fs.readFileSync(file,"utf8"));
  const songs=data.songs;
  const errors=[];
  if(data.group!==group) errors.push("group mismatch");
  if(!Array.isArray(songs)||songs.length===0) errors.push("songs must be a non-empty array");
  const ids=new Set(),titles=new Set();
  for(const [i,s] of (songs||[]).entries()){
    if(!Number.isInteger(s.id)||s.id<=0) errors.push("song "+i+": invalid id");
    if(ids.has(s.id)) errors.push("duplicate id "+s.id); ids.add(s.id);
    if(!s.title||typeof s.title!=="string") errors.push("song "+s.id+": missing title");
    if(titles.has(s.title)) errors.push("duplicate title "+s.title); titles.add(s.title);
    if(group==="equal-love" && (!s.flags||typeof s.priority!=="number")) errors.push("song "+s.id+": missing equal-love flags/priority");
    if(group==="not-equal-me" && (!Array.isArray(s.categories)||!Array.isArray(s.calls))) errors.push("song "+s.id+": missing ≠ME categories/calls");
    if(group==="nearly-equal-joy" && (!Array.isArray(s.filters)||!Array.isArray(s.basic))) errors.push("song "+s.id+": missing ≒JOY filters/basic");
  }
  const template=fs.readFileSync(path.join(root,"templates",group+".html"),"utf8");
  for(const marker of ["{{COUNT}}","{{LEARNED_INPUTS}}","{{SONG_CARDS}}","{{METER_SCRIPT}}"]){
    if(!template.includes(marker)) errors.push("template missing "+marker);
  }
  if(errors.length){
    failed=true;
    console.error(group+" validation failed:\n- "+errors.join("\n- "));
  }else{
    console.log(group+": "+songs.length+" songs OK");
  }
}
if(failed) process.exit(1);
