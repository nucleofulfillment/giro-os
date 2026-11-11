/* LiveFood — TROCA DE LOJA (grupo de lojas: ex. Padaria e Restaurante da mesma empresa).
   Só aparece para quem pode entrar em mais de uma loja (o dono vê todas; os outros, as que o dono liberou
   em Usuários). Para os demais clientes nada aparece e nada muda.
   LojaTroca.ligar(elemento): coloca o botão "Trocar loja" logo depois do elemento que mostra o nome da loja. */
(function(){
'use strict';
var API='https://giro-os-api.nucleofull.workers.dev', pr=null;
function tk(){ try{ return localStorage.getItem('dd_jwt')||''; }catch(e){ return ''; } }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function css(){ if(document.getElementById('css-lojas')) return; var s=document.createElement('style'); s.id='css-lojas'; s.textContent=
  '.lt-bt{display:inline-flex;align-items:center;gap:6px;min-height:36px;border-radius:999px;border:1.5px solid #FF5A00;background:#FFF4EC;color:#C2410C;font:inherit;font-size:13.5px;font-weight:800;padding:0 12px;cursor:pointer;margin-left:8px;white-space:nowrap;vertical-align:middle}'+
  '.lt-fd{position:fixed;inset:0;z-index:5000;background:rgba(20,20,22,.55);display:flex;align-items:flex-end;justify-content:center}@media(min-width:700px){.lt-fd{align-items:center}}'+
  '.lt-c{width:100%;max-width:440px;background:#fff;border-radius:22px 22px 0 0;padding:18px 16px 22px;font-family:inherit;color:#1C1C1E;box-shadow:0 -10px 40px rgba(0,0,0,.25)}@media(min-width:700px){.lt-c{border-radius:22px}}'+
  '.lt-c h3{margin:0 0 4px;font-size:19px}.lt-c p{margin:0 0 14px;color:#71717A;font-size:14px;font-weight:600}'+
  '.lt-l{display:flex;align-items:center;gap:12px;width:100%;min-height:60px;border-radius:16px;border:2px solid #E4E4E7;background:#fff;font:inherit;font-size:16.5px;font-weight:800;color:#1C1C1E;padding:0 14px;margin-bottom:10px;cursor:pointer;text-align:left}'+
  '.lt-l.on{border-color:#FF5A00;background:#FFF4EC}.lt-l small{display:block;font-size:12.5px;color:#71717A;font-weight:700}.lt-l i{font-style:normal;font-size:22px}.lt-l span{flex:1}'+
  '.lt-x{width:100%;min-height:50px;border-radius:14px;border:0;background:#F4F4F5;font:inherit;font-weight:800;font-size:15px;cursor:pointer;margin-top:4px}.lt-er{color:#B91C1C;font-weight:700;font-size:13.5px;margin:6px 0}';
  document.head.appendChild(s); }
function carregar(){ if(pr) return pr; var t=tk(); if(!t) return Promise.resolve(null);
  pr=fetch(API+'/painel/lojas',{cache:'no-store',headers:{'Authorization':'Bearer '+t}}).then(function(r){ return r.json(); }).then(function(d){ return d&&d.ok?d:null; }).catch(function(){ pr=null; return null; });
  return pr; }
function trocar(id, caixa){
  var er=caixa&&caixa.querySelector('.lt-er'); if(er) er.textContent='Trocando de loja…';
  fetch(API+'/painel/trocar-loja',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tk()},body:JSON.stringify({loja:id})})
    .then(function(r){ return r.json(); }).then(function(d){
      if(!d||!d.ok){ if(er) er.textContent=(d&&d.mensagem)||'Não foi possível trocar de loja.'; return; }
      try{ localStorage.setItem('dd_jwt',d.token); localStorage.setItem('dd_user',JSON.stringify(d.usuario)); localStorage.removeItem('lf_livepro'); }catch(e){}
      location.reload();
    }).catch(function(){ if(er) er.textContent='Sem internet agora. Tente de novo.'; });
}
function abrir(d){
  css(); var ls=(d.lojas||[]).filter(function(l){ return (d.permitidas||[]).indexOf(l.id)>=0; });
  var fd=document.createElement('div'); fd.className='lt-fd';
  fd.innerHTML='<div class="lt-c" role="dialog" aria-label="Trocar de loja"><h3>Trocar de loja</h3><p>Escolha em qual loja você quer trabalhar agora.</p>'+
    ls.map(function(l){ var on=l.id===d.atual; return '<button class="lt-l'+(on?' on':'')+'" data-id="'+esc(l.id)+'"><i>🏪</i><span>'+esc(l.nome)+(on?'<small>Você está nesta loja</small>':'')+'</span>'+(on?'✓':'›')+'</button>'; }).join('')+
    '<div class="lt-er"></div><button class="lt-x" type="button">Fechar</button></div>';
  document.body.appendChild(fd);
  fd.addEventListener('click',function(e){ var b=e.target.closest('.lt-l'); if(b){ if(b.getAttribute('data-id')!==d.atual) trocar(b.getAttribute('data-id'), fd); else fd.remove(); return; } if(e.target===fd||e.target.closest('.lt-x')) fd.remove(); });
}
window.LojaTroca={
  carregar:carregar, abrir:function(){ carregar().then(function(d){ if(d) abrir(d); }); },
  ligar:function(el){ if(!el||!tk()) return;
    carregar().then(function(d){
      if(!d||(d.permitidas||[]).length<2||el.nextElementSibling&&el.nextElementSibling.classList.contains('lt-bt')) return;
      css(); var b=document.createElement('button'); b.type='button'; b.className='lt-bt'; b.innerHTML='⇄ Trocar loja'; b.title='Trocar de loja';
      b.addEventListener('click',function(e){ e.preventDefault(); e.stopPropagation(); abrir(d); });
      el.insertAdjacentElement('afterend', b);
    }); }
};
})();
