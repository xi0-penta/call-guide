(function(){
  'use strict';

  var search=document.getElementById('search');
  var clear=document.getElementById('clear');
  var count=document.getElementById('count');
  var cards=Array.prototype.slice.call(document.querySelectorAll('#songList .song-card'));
  var timer=0;

  function kataToHira(s){
    return s.replace(/[ァ-ヶ]/g,function(ch){
      return String.fromCharCode(ch.charCodeAt(0)-0x60);
    });
  }

  function norm(s){
    try{
      return kataToHira((s||'').toString().normalize('NFKC').toLowerCase())
        .replace(/[「」『』【】()（）\[\]{}｛｝<>〈〉《》“”"'’‘・･,，.。!！?？#＃:：;；_\-—–〜~\/\\\s♡♥]/g,'');
    }catch(e){
      return kataToHira((s||'').toString().toLowerCase())
        .replace(/\s+/g,'');
    }
  }

  function queryTokens(value){
    return (value||'').trim().split(/\s+/).map(norm).filter(Boolean);
  }

  function loadSet(key){
    try{
      var raw=localStorage.getItem(key);
      if(!raw) return {};
      var arr=JSON.parse(raw),out={};
      if(Array.isArray(arr)) arr.forEach(function(v){out[v]=true;});
      return out;
    }catch(e){return {};}
  }

  function saveSet(key,obj){
    try{
      localStorage.setItem(
        key,
        JSON.stringify(Object.keys(obj).filter(function(k){return obj[k];}))
      );
    }catch(e){}
  }

  var favs=loadSet('equalLoveCallGuide_favorites');
  var learned=loadSet('equalLoveCallGuide_learned');

  cards.forEach(function(card,idx){
    var key=card.getAttribute('data-key')||card.getAttribute('data-title')||'';
    var fav=card.querySelector('.fav-toggle');
    var learnedBox=document.getElementById('learned-'+(idx+1));

    if(fav){
      fav.checked=!!favs[key];
      fav.addEventListener('change',function(){
        if(fav.checked) favs[key]=true; else delete favs[key];
        saveSet('equalLoveCallGuide_favorites',favs);
      });
    }

    if(learnedBox){
      learnedBox.checked=!!learned[key];
      learnedBox.addEventListener('change',function(){
        if(learnedBox.checked) learned[key]=true; else delete learned[key];
        saveSet('equalLoveCallGuide_learned',learned);
      });
    }
  });

  var indexes=cards.map(function(card){
    return {
      title:norm(card.getAttribute('data-search-title')||card.getAttribute('data-title')||''),
      content:norm(card.getAttribute('data-search-content')||card.getAttribute('data-search')||'')
    };
  });

  function matchesAll(tokens,index){
    return tokens.every(function(token){
      return index.title.indexOf(token)!==-1 || index.content.indexOf(token)!==-1;
    });
  }

  function hasTitleSignal(tokens,index){
    return tokens.some(function(token){
      return index.title.indexOf(token)!==-1;
    });
  }

  function applySearch(){
    if(!search) return;
    var tokens=queryTokens(search.value);
    if(!tokens.length){
      cards.forEach(function(card){card.classList.remove('search-hidden');});
      if(count) count.textContent='全'+cards.length+'曲';
      return;
    }

    var combined=cards.map(function(card,i){return matchesAll(tokens,indexes[i]);});
    var titleSignals=cards.map(function(card,i){return combined[i]&&hasTitleSignal(tokens,indexes[i]);});
    var preferTitle=titleSignals.some(Boolean);
    var shown=0;

    cards.forEach(function(card,i){
      var show=preferTitle ? titleSignals[i] : combined[i];
      card.classList.toggle('search-hidden',!show);
      if(show) shown++;
    });

    if(count) count.textContent=shown+'曲ヒット';
  }

  if(search){
    search.addEventListener('input',function(){
      clearTimeout(timer);
      timer=setTimeout(applySearch,60);
    });
    search.addEventListener('search',applySearch);
  }

  if(clear){
    clear.addEventListener('click',function(){
      if(!search) return;
      search.value='';
      applySearch();
      search.focus();
    });
  }

  applySearch();
})();
