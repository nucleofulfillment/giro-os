/* LiveFood — FOTO DO ESPAÇO (entrega na praia). Configuração do DONO, no Painel (Mesas).
   Foto aérea/drone da área + 2 pontos de referência (lugar na foto + coordenada). Com isso o Atendimento
   põe o cliente e o garçom em cima da foto, mesmo se ela estiver girada.
   EspacoCfg.abrir() */
(function(){
'use strict';
var API='https://giro-os-api.nucleofull.workers.dev', S=null;
function tk(){ try{ return localStorage.getItem('dd_jwt')||''; }catch(e){ return ''; } }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function $(i){ return document.getElementById(i); }
function req(m,c,b){ return fetch(API+c,{method:m,headers:{'Content-Type':'application/json','Authorization':'Bearer '+tk()},body:b?JSON.stringify(b):undefined}).then(function(r){ return r.json().catch(function(){ return {ok:false}; }); }).catch(function(){ return {ok:false,mensagem:'Sem internet agora.'}; }); }
function aviso(t){ if(typeof window.aviso==='function'&&window.aviso!==aviso) return window.aviso(t); var d=document.createElement('div'); d.textContent=t; d.style.cssText='position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9100;background:#1C1C1E;color:#fff;padding:12px 16px;border-radius:12px;font:600 14px/1.4 system-ui,sans-serif;max-width:90vw;text-align:center'; document.body.appendChild(d); setTimeout(function(){ d.remove(); },3200); }
function dist(a,b){ var R=6371000,r=Math.PI/180,dLa=(b.lat-a.lat)*r,dLn=(b.lng-a.lng)*r,x=Math.sin(dLa/2)*Math.sin(dLa/2)+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLn/2)*Math.sin(dLn/2); return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)); }
function mt(m){ return m<1000?Math.round(m)+' m':(m/1000).toFixed(1).replace('.',',')+' km'; }
function cxM(a,b){ return [a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]]; }
function cxD(a,b){ var q=b[0]*b[0]+b[1]*b[1]; return [(a[0]*b[0]+a[1]*b[1])/q,(a[1]*b[0]-a[0]*b[1])/q]; }
function trans(pts,an){ var A=pts[0],B=pts[1],k=Math.cos(A.lat*Math.PI/180)*111320, zf=function(la,ln){ return [(ln-A.lng)*k,(la-A.lat)*110540]; }, pf=function(u,v){ return [u,-v*an]; };
  var pA=pf(A.u,A.v),pB=pf(B.u,B.v),zA=zf(A.lat,A.lng),zB=zf(B.lat,B.lng),dp=[pB[0]-pA[0],pB[1]-pA[1]]; if(!dp[0]&&!dp[1]) return null; var a=cxD([zB[0]-zA[0],zB[1]-zA[1]],dp),b=[zA[0]-cxM(a,pA)[0],zA[1]-cxM(a,pA)[1]];
  return function(u,v){ var z=cxM(a,pf(u,v)); return {lat:A.lat+(z[1]+b[1])/110540,lng:A.lng+(z[0]+b[0])/k}; }; }
function fechar(){ var o=$('espCfg'); if(o) o.remove(); S=null; }
function arquivo(f){ if(!f) return; var u=URL.createObjectURL(f), im=new Image(); im.onload=function(){ var m=Math.max(im.width,im.height), k=Math.min(1,2400/m), cv=document.createElement('canvas'); cv.width=Math.round(im.width*k); cv.height=Math.round(im.height*k); cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height); URL.revokeObjectURL(u);
  S.img=cv.toDataURL('image/jpeg',0.85); S.w=cv.width; S.h=cv.height; S.nova=true; S.pts=[]; S.passo=0; pinta(); }; im.onerror=function(){ aviso('Não consegui abrir essa foto.'); }; im.src=u; }
function ponto(lat,lng){ var q=S.pts[S.passo]; q.lat=lat; q.lng=lng; S.passo++; pinta(); }
function gps(){ if(!navigator.geolocation){ aviso('Este aparelho não tem GPS no navegador.'); return; } aviso('Pegando sua localização…');
  navigator.geolocation.getCurrentPosition(function(p){ if(p.coords.accuracy>25) aviso('GPS com precisão de '+Math.round(p.coords.accuracy)+' m: ao ar livre fica mais certo.'); ponto(p.coords.latitude,p.coords.longitude); },
    function(e){ aviso(e&&e.code===1?'Localização bloqueada: libere no cadeado ao lado do endereço.':'Não consegui o GPS agora.'); },{enableHighAccuracy:true,timeout:20000,maximumAge:0}); }
function coord(){ var m=/(-?\d{1,2}[.,]\d+)\s*[,; ]\s*(-?\d{1,3}[.,]\d+)/.exec(($('espCoord').value||'').trim()); if(!m){ aviso('Cole a coordenada como no Google Maps: -26.9512, -48.6321'); return; } var la=Number(m[1].replace(',','.')), ln=Number(m[2].replace(',','.')); if(!(la>=-90&&la<=90&&ln>=-180&&ln<=180)){ aviso('Coordenada inválida.'); return; } ponto(la,ln); }
function salvar(){ var b=$('espSalva'); b.disabled=true; b.textContent='Salvando…';
  req('POST','/painel/atend-area',{img:S.nova?S.img:undefined,w:S.w,h:S.h,pts:S.pts}).then(function(r){ if(r&&r.ok){ aviso('Foto do espaço salva ✅ O Atendimento já usa.'); fechar(); return; } b.disabled=false; b.textContent='Salvar'; aviso((r&&r.mensagem)||'Não consegui salvar.'); }); }
var BT='display:inline-flex;align-items:center;justify-content:center;min-height:48px;border-radius:14px;border:0;font:inherit;font-weight:800;font-size:15px;padding:0 16px;cursor:pointer';
function pinta(){
  if(!S) return; var F=$('espFoto'), P=$('espPainel');
  if(!S.img){ F.innerHTML='<div style="color:#ddd;padding:30px;text-align:center;font-size:15px;line-height:1.55;max-width:520px;margin:0 auto">Envie uma foto aérea do espaço: um print do satélite do Google Maps ou uma foto de drone.<br><br>Depois marque 2 pontos fáceis de achar, como a porta do quiosque e o guarda-sol mais perto do mar.</div>'; P.innerHTML='<button style="'+BT+';width:100%;background:#FF5A00;color:#fff" onclick="EspacoCfg._arq()">📷 Escolher a foto</button>'; return; }
  F.innerHTML='<div style="position:relative;max-width:900px;margin:0 auto"><img id="espImg" src="'+S.img+'" style="width:100%;display:block;cursor:crosshair">'+S.pts.map(function(q,i){ return '<div style="position:absolute;left:'+(q.u*100)+'%;top:'+(q.v*100)+'%;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;background:'+(i?'#2563EB':'#FF5A00')+';border:3px solid #fff;color:#fff;font-weight:900;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,.5);pointer-events:none">'+(i+1)+'</div>'; }).join('')+'</div>';
  var im=$('espImg'); im.onload=function(){ if(!S.w){ S.w=im.naturalWidth; S.h=im.naturalHeight; } };
  im.onclick=function(ev){ if(S.passo>1) return; var r=im.getBoundingClientRect(); S.pts[S.passo]={u:(ev.clientX-r.left)/r.width,v:(ev.clientY-r.top)/r.height}; pinta(); };
  var n=S.passo, q=S.pts[n], sec='background:#F2F2F4;color:#1C1C1E', pri='background:#FF5A00;color:#fff';
  if(n<2){ P.innerHTML='<b style="font-size:16px">Ponto '+(n+1)+' de 2</b><div style="font-size:14px;color:#555;margin:4px 0 10px">'+(q?'Agora diga onde fica esse ponto:':(n?'Toque na foto num ponto longe do primeiro (ex.: o guarda-sol mais perto do mar).':'Toque na foto num ponto fácil de achar (ex.: a porta do quiosque).'))+'</div>'
      +(q?'<button style="'+BT+';width:100%;margin-bottom:8px;'+pri+'" onclick="EspacoCfg._gps()">📡 Estou nesse ponto agora (usar meu GPS)</button><div style="display:flex;gap:8px"><input id="espCoord" placeholder="ou cole do Google Maps: -26.9512, -48.6321" style="flex:1;min-width:0;min-height:48px;border-radius:14px;border:2px solid #DFDFE4;padding:0 12px;font:inherit;font-size:15px"><button style="'+BT+';'+sec+'" onclick="EspacoCfg._coord()">OK</button></div>':'')
      +'<div style="display:flex;gap:8px;margin-top:10px"><button style="'+BT+';min-height:40px;font-size:13.5px;'+sec+'" onclick="EspacoCfg._arq()">Trocar foto</button>'+(n?'<button style="'+BT+';min-height:40px;font-size:13.5px;'+sec+'" onclick="EspacoCfg._de()">Recomeçar</button>':'')+'</div>'; return; }
  var an=S.h&&S.w?S.h/S.w:1, T=trans(S.pts,an), d=dist(S.pts[0],S.pts[1]), lg=T?dist(T(0,0),T(1,0)):0;
  P.innerHTML='<b style="font-size:16px">✅ Pontos marcados</b><div style="font-size:14px;color:#555;margin:4px 0 10px">Distância entre os pontos: <b>'+mt(d)+'</b> · largura da foto: <b>'+mt(lg)+'</b>. Se os números parecerem certos, salve.</div>'
    +'<div style="display:flex;gap:8px"><button id="espSalva" style="'+BT+';flex:1;'+pri+'" onclick="EspacoCfg._salva()">Salvar</button><button style="'+BT+';'+sec+'" onclick="EspacoCfg._de()">Remarcar</button><button style="'+BT+';'+sec+'" onclick="EspacoCfg._arq()">Trocar foto</button></div>';
}
window.EspacoCfg={
  abrir:function(){
    fechar(); S={img:'',w:0,h:0,pts:[],passo:0,nova:false};
    var o=document.createElement('div'); o.id='espCfg'; o.style.cssText='position:fixed;inset:0;z-index:9000;background:#fff;display:flex;flex-direction:column;font-family:inherit;color:#1C1C1E';
    o.innerHTML='<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid #eee"><b style="flex:1;font-size:17px">🏖️ Foto do espaço · entrega na praia</b><button style="'+BT+';min-height:40px;background:#F2F2F4;color:#1C1C1E" onclick="EspacoCfg.fechar()">Fechar</button></div>'
      +'<div id="espFoto" style="flex:1;min-height:0;overflow:auto;background:#1b1b1b"></div><div id="espPainel" style="padding:12px 16px 16px;box-shadow:0 -6px 20px rgba(0,0,0,.12);max-width:900px;width:100%;margin:0 auto;box-sizing:border-box"></div><input type="file" id="espArq" accept="image/*" style="display:none">';
    document.body.appendChild(o); $('espArq').onchange=function(){ arquivo(this.files[0]); this.value=''; };
    pinta();
    req('GET','/painel/atend-area').then(function(d){ if(!S||!d||!d.ok||!d.area) return;
      fetch(API+'/painel/atend-area-img?v='+encodeURIComponent(d.area.v),{headers:{'Authorization':'Bearer '+tk()}}).then(function(r){ return r.ok?r.blob():null; }).then(function(b){ if(!b||!S) return; S.img=URL.createObjectURL(b); S.pts=d.area.pts.slice(); S.passo=2; S.an=d.area.an; var im=new Image(); im.onload=function(){ S.w=im.naturalWidth; S.h=im.naturalHeight; pinta(); }; im.src=S.img; }); });
  },
  fechar:fechar, _arq:function(){ $('espArq').click(); }, _gps:gps, _coord:coord, _salva:salvar, _de:function(){ S.passo=0; S.pts=[]; pinta(); }
};
})();
