/* (170) conta travada por falta de pagamento: qualquer tela da equipe mostra o aviso. O painel tem a tela própria, com o Pix */
(function(){
  var f0=window.fetch, feito=false;
  function tela(){
    if(feito) return; feito=true;
    var d=document.createElement('div');
    d.setAttribute('style','position:fixed;inset:0;z-index:99999;background:rgba(10,10,12,.92);display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif');
    d.innerHTML='<div style="background:#fff;color:#1c1c1e;border-radius:18px;padding:26px 22px;max-width:360px;text-align:center"><div style="font-size:34px;margin-bottom:8px">🔒</div><b style="font-size:17px">Sistema bloqueado</b><p style="font-size:14px;line-height:1.5;color:#555;margin:10px 0 0">Há uma fatura em aberto. O responsável pela conta pode regularizar no painel; o acesso volta sozinho depois do pagamento.</p></div>';
    (document.body||document.documentElement).appendChild(d);
  }
  window.fetch=function(u,o){ return f0.apply(this,arguments).then(function(r){ if(r&&r.status===402&&!window.travaTela){ r.clone().json().then(function(j){ if(j&&j.erro==='conta_bloqueada') tela(); }).catch(function(){}); } return r; }); };
})();
