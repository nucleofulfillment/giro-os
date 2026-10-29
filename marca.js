/* GIRO OS — MARCA DO RESTAURANTE (marca.js · MARCA-09)
   Uma logo + uma cor por restaurante, valendo pra todas as telas.
   Como a tela descobre o restaurante:
     1) pelo link:  ...html?c=cinquenta  (o aparelho guarda e nas próximas vezes já sabe)
     2) depois do login: GiroMarca.set(id do restaurante)
   Marcação nas telas:
     <img data-marca-logo data-fundo="claro">   → recebe a logo (fundo claro ou escuro)
     <span data-marca-nome></span>              → recebe o nome do restaurante
   Sem restaurante conhecido a tela fica exatamente como era. */
(function(){
  var BASE=((document.currentScript&&document.currentScript.src)||'').replace(/[^\/]*$/,'');
  var API='https://giro-os-api.nucleofull.workers.dev', KC='giro_marca_cli', KM='giro_marca_dados_';
  var M={cli:'',d:null,lum:{},exp:false,logado:false};
  function ls(k,v){ try{ if(v===undefined) return localStorage.getItem(k)||''; if(v===null) localStorage.removeItem(k); else localStorage.setItem(k,v); }catch(e){ return ''; } return ''; }
  function limpa(c){ return String(c||'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,40); }

  /* ---- cor ---- */
  function rgb(h){ return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]; }
  function hex(a){ return '#'+a.map(function(x){ x=Math.max(0,Math.min(255,Math.round(x))); return ('0'+x.toString(16)).slice(-2); }).join(''); }
  function mistura(a,b,t){ return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]; }
  function aplicaCor(c){
    if(!/^#[0-9a-fA-F]{6}$/.test(c||'')) return;
    var b=rgb(c), claro=hex(mistura(b,[255,255,255],.28)), escuro=hex(mistura(b,[0,0,0],.38)), medio=hex(mistura(b,[0,0,0],.10)), s=document.documentElement.style;
    s.setProperty('--pri',medio); s.setProperty('--roxo',medio); s.setProperty('--rosa',claro); s.setProperty('--roxo-esc',escuro);
    s.setProperty('--grad',c);
    s.setProperty('--grad-arte',c);
    var mt=document.querySelector('meta[name="theme-color"]'); if(mt) mt.setAttribute('content',c);
  }

  /* ---- logo ---- */
  function urlLogo(d){ return API+'/food/foto/'+encodeURIComponent(d.cli)+'/_logop?v='+(d.v||0); }
  /* luminância média da logo (0 escura … 1 clara): logo branca some em fundo claro, logo preta some em fundo escuro */
  function luminancia(url,cb){
    if(M.lum[url]!==undefined) return cb(M.lum[url]);
    var im=new Image(); im.crossOrigin='anonymous';
    im.onload=function(){
      try{
        var w=64,h=Math.max(1,Math.round(64*im.height/im.width)),cv=document.createElement('canvas'); cv.width=w; cv.height=h;
        var cx=cv.getContext('2d'); cx.drawImage(im,0,0,w,h); var px=cx.getImageData(0,0,w,h).data,t=0,n=0,i;
        for(i=0;i<px.length;i+=4){ if(px[i+3]>128){ t+=(0.299*px[i]+0.587*px[i+1]+0.114*px[i+2])/255; n++; } }
        M.lum[url]=n?t/n:0.5;
      }catch(e){ M.lum[url]=-1; }
      cb(M.lum[url]);
    };
    im.onerror=function(){ M.lum[url]=-1; cb(-1); };
    im.src=url;
  }
  function cardBranco(c){ c.style.background='#fff'; c.style.boxShadow='0 6px 18px rgba(31,35,41,.16)'; c.style.padding='9px 16px'; }
  function aplicaLogos(d){
    var imgs=document.querySelectorAll('[data-marca-logo]'), k;
    for(k=0;k<imgs.length;k++) (function(el){
      if(el.hasAttribute('data-marca-login')&&!M.exp) return; var pai=el.closest?el.closest('.gos-card'):null;
      if(!el.dataset.marcaOrig) el.dataset.marcaOrig=el.getAttribute('src')||'-';
      el.setAttribute('alt',d.nome||'');
      if(d.logo){
        var u=urlLogo(d), fundo=el.getAttribute('data-fundo')||'claro';
        luminancia(u,function(l){
          var f='';
          if(l>=0){ if(fundo==='claro'&&l>0.72) f='brightness(0)'; else if(fundo==='escuro'&&l<0.22) f='brightness(0) invert(1)'; }
          el.style.filter=f; el.style.display=''; if(el.getAttribute('src')!==u) el.setAttribute('src',u);
          if(pai){ pai.style.display=''; if(el.hasAttribute('data-marca-sobre')) cardBranco(pai); }
        });
      } else {
        /* restaurante conhecido, mas ainda sem logo: some a logo velha e mostra o nome */
        el.style.display='none'; if(pai&&!d.nome) pai.style.display='none';
      }
    })(imgs[k]);
    var pw=document.querySelectorAll('[data-marca-powered]'); for(k=0;k<pw.length;k++) pw[k].style.display=(M.exp&&d.logo)?'':'none';
    var nm=document.querySelectorAll('[data-marca-nome]'); for(k=0;k<nm.length;k++){ nm[k].textContent=d.nome||''; if(!d.logo&&d.nome) nm[k].style.display=''; }
    /* sem logo, o cartão branco do login vira o nome do restaurante */
    if(!d.logo&&d.nome&&M.exp){ var cards=document.querySelectorAll('.gos-card'); for(k=0;k<cards.length;k++){ if(!cards[k].querySelector('.marca-txt')){ cardBranco(cards[k]); var sp=document.createElement('b'); sp.className='marca-txt'; sp.style.cssText='font-size:22px;font-weight:800;color:#29231E;padding:4px 2px'; sp.textContent=d.nome; cards[k].appendChild(sp); } } }
  }
  /* telas de login: sem identificador do restaurante no link, aparece a marca LiveFood */
  function liveLogos(){
    var im=document.querySelectorAll('[data-marca-login]'),k,pw=document.querySelectorAll('[data-marca-powered]');
    for(k=0;k<im.length;k++){ var sc=im[k].hasAttribute('data-marca-sobre'); im[k].setAttribute('src',BASE+(sc?'livefood-logo-branca.png':'livefood-logo.png')); im[k].setAttribute('alt','LiveFood'); im[k].style.filter=''; im[k].style.height=sc?'62px':'46px'; im[k].style.display=''; var pc=im[k].closest?im[k].closest('.gos-card'):null; if(!sc&&!pc){ im[k].style.display='block'; im[k].style.margin='0 auto 12px'; } if(pc){ pc.style.display=''; if(sc){ pc.style.background='transparent'; pc.style.boxShadow='none'; pc.style.padding='0'; } } }
    for(k=0;k<pw.length;k++) pw[k].style.display='none';
  }
  function aplica(d){
    if(!d||!d.ok) return; M.d=d; if(M.exp||M.logado) aplicaCor(d.cor); aplicaLogos(d);
    try{ document.documentElement.setAttribute('data-marca',d.cli||''); }catch(e){}
  }

  function carrega(){
    if(!M.cli) return;
    var c=ls(KM+M.cli); if(c){ try{ aplica(JSON.parse(c)); }catch(e){} }
    fetch(API+'/food/marca/'+encodeURIComponent(M.cli)).then(function(r){ return r.json(); }).then(function(d){
      if(!d||!d.ok){ return; } M.cli=d.cli||M.cli; ls(KC,M.cli); ls(KM+M.cli,JSON.stringify(d)); aplica(d);
    }).catch(function(){});
  }
  function set(cli){ cli=limpa(cli); M.logado=true; if(!cli) return; if(cli===M.cli){ if(M.d) aplica(M.d); return; } M.cli=cli; ls(KC,cli); carrega(); }
  /* restaurante ainda desconhecido (primeiro acesso sem ?c=): login neutro, nunca a logo de outro restaurante */
  function neutro(){
    var cards=document.querySelectorAll('.gos-card'),k;
    for(k=0;k<cards.length;k++){ if(!cards[k].querySelector('.marca-txt')){ cardBranco(cards[k]); var sp=document.createElement('b'); sp.className='marca-txt'; sp.style.cssText='font-size:22px;font-weight:800;color:#29231E;padding:4px 2px'; sp.textContent='Giro OS'; cards[k].appendChild(sp); } }
  }
  function init(){
    var q=new URLSearchParams(location.search), c=limpa(q.get('c')||q.get('cli')||q.get('loja')||'');
    M.exp=!!c; M.cli=c||limpa(ls(KC)); if(!M.exp) liveLogos(); carrega();
  }
  /* logo montada pela própria tela (ex.: barra de cima): escurece se for clara em fundo claro, clareia se for escura em fundo escuro */
  function ajusta(el,fundo){
    if(!el||!el.getAttribute) return; var u=el.getAttribute('src')||''; if(!u) return;
    luminancia(u,function(l){ var f=''; if(l>=0){ if(fundo==='claro'&&l>0.72) f='brightness(0)'; else if(fundo==='escuro'&&l<0.22) f='brightness(0) invert(1)'; } el.style.filter=f; });
  }
  window.GiroMarca={ajusta:ajusta,init:init,set:set,refresh:function(){ if(M.cli){ ls(KM+M.cli,null); carrega(); } },dados:function(){ return M.d; },cli:function(){ return M.cli; },
    /* aceita o objeto do usuário logado (várias telas guardam o restaurante com nomes diferentes) */
    deUsuario:function(u){ if(u) set(u.cliente_id||u.cli||u.cliente||''); }};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
