/* LiveFood Intelligence — NOTAS FISCAIS DE ENTRADA
   Upload (XML NF-e / PDF DANFE) → leitura simulada → conferência com correspondência de produtos,
   fator de conversão, impostos destacados e comparação com a OC → pré-visualização → LFI.lancarNota.
   Notas lançadas: documento (resumo DANFE), rastreabilidade (movimentos, conta a pagar, OC), XML e PDF. */
(function(){
'use strict';
var LFI=window.LFI, UI=LFI.ui, F=LFI.fmt, esc=UI.esc;
var r2=LFI.dataUtil.r2, r3=LFI.dataUtil.r3;

function st(){ return LFI.estado.notas = LFI.estado.notas || {q:'', forn:'', status:'', per:'90d', dep:''}; }

/* ---------- estilos próprios da tela (injetados uma vez) ---------- */
function css2(){ if(document.getElementById('css-notas2')) return; var c=document.createElement('style'); c.id='css-notas2'; c.textContent='.nt-fotos{display:flex;gap:10px;flex-wrap:wrap}.nt-ft{position:relative;width:110px;display:flex;flex-direction:column;gap:4px}.nt-ft img{width:110px;height:82px;object-fit:cover;border-radius:10px;border:1px solid var(--border2);display:block}.nt-ft.av img{border-color:#F5C2C2}.nt-ft small{font-size:11px;font-weight:700;color:var(--muted)}.nt-ft.av small{color:var(--red)}.nt-ft .cf-x{position:absolute;top:4px;right:4px;width:24px;height:24px;font-size:11px}.nt-bloco{margin-bottom:12px}.nt-tit{font-size:12px;font-weight:800;color:var(--texto2);margin-bottom:8px}label.nt-add{margin:0;width:110px;height:82px;border:2px dashed var(--border2);border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer;color:var(--roxo);background:var(--s2);text-align:center}label.nt-add:hover{border-color:var(--roxo);background:var(--lf-soft)}.nt-add svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2}.nt-add b{font-size:11.5px;font-weight:800;color:var(--text);line-height:1.2}.nt-add input{display:none}.nt-ex{font-size:11px;text-align:center}.nt-can{display:grid;grid-template-columns:1fr 1fr;gap:10px}.nt-op{display:flex;gap:10px;align-items:center;border:1.5px solid var(--border2);border-radius:12px;padding:12px;cursor:pointer}.nt-op input{width:18px;height:18px;accent-color:var(--roxo)}.nt-op span{display:grid;grid-template-columns:auto 1fr;column-gap:8px;align-items:center}.nt-op svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;grid-row:span 2}.nt-op b{font-size:14px}.nt-op small{font-size:12px;color:var(--muted);font-weight:600}@media (max-width:700px){.nt-can{grid-template-columns:1fr}.cf-revtx{flex-wrap:wrap}.cf-revtx .btn{width:100%}}.cf-top{position:sticky;top:calc(var(--navh) + var(--abash));z-index:20;display:flex;align-items:center;gap:16px;flex-wrap:wrap;background:rgba(244,244,245,.94);backdrop-filter:blur(8px);margin:-22px -26px 14px;padding:12px 26px;border-bottom:1px solid var(--border)}.cf-x{width:38px;height:38px;border-radius:50%;border:1px solid var(--border2);background:#fff;cursor:pointer;font-size:15px;color:var(--muted2);flex:none}.cf-tit{min-width:0;flex:1 1 260px}.cf-tit b{display:block;font-size:17px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cf-tit small{font-size:12.5px;color:var(--muted);font-weight:600}.cf-prog{flex:1 1 240px;max-width:360px}.cf-prog .bar{height:9px}.cf-prog small{display:block;margin-top:5px;font-size:12px;font-weight:700;color:var(--muted2)}.cf-acs{display:flex;gap:8px;flex-wrap:wrap}.cf-info{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;background:var(--s1);border:1px solid var(--border);border-radius:var(--r);padding:14px 18px;margin-bottom:14px}.cf-info span{display:block;font-size:10.5px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px}.cf-info b{font-size:14px;font-weight:800}.cf-itens{display:flex;flex-direction:column;gap:12px;margin-bottom:16px}.cf-it{background:var(--s1);border:1px solid var(--border);border-radius:var(--r);padding:16px 18px;box-shadow:var(--sh1)}.cf-it.ok{border-color:#BBE5C8;background:#FAFEFB}.cf-it.rev{border-color:#F3DD9B;background:#FFFDF5}.cf-l1{display:grid;grid-template-columns:32px minmax(0,1.5fr) minmax(0,1.3fr) minmax(0,.9fr) minmax(0,.9fr);gap:18px;align-items:start}.cf-n{width:28px;height:28px;border-radius:8px;background:var(--s3);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:var(--muted2)}.cf-it.ok .cf-n{background:var(--green);color:#fff}.cf-it.rev .cf-n{background:#E9A80B;color:#fff}.cf-it .lb{display:flex;align-items:center;gap:6px;font-size:10.5px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px}.cf-it small{display:block;font-size:12px;color:var(--muted);font-weight:600;margin-top:4px;line-height:1.4}.cf-a .ds{display:block;font-size:14px;font-weight:800}.cf-a .qv{font-size:13px;font-weight:600;margin:4px 0 6px}.cf-c .fx{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700}.cf-c .fx input{width:74px}.cf-d .cu{font-size:17px;font-weight:800;display:flex;align-items:center;gap:6px;flex-wrap:wrap}.cf-d .cu small{display:inline;margin:0;font-size:12px}.cf-l2{display:grid;grid-template-columns:140px 150px 170px minmax(0,1fr);gap:18px;align-items:start;margin:14px 0 0 50px;padding-top:14px;border-top:1px dashed var(--border2)}.cf-rp{display:grid;grid-template-columns:1fr 1fr;gap:6px}.cf-rp input[readonly]{background:var(--s3);color:var(--text);cursor:default}.cf-ean input{font-size:12px;padding-left:8px;padding-right:8px}.cf-l2 small{white-space:normal}.cf-bt{display:flex;gap:8px;align-items:center;align-self:start;margin-top:20px;flex-wrap:nowrap;justify-content:flex-end}.cf-bt .btn{min-height:42px}.cf-okst{pointer-events:none}.cf-it.ok .inp:disabled{background:var(--s2);color:var(--text);opacity:1;-webkit-text-fill-color:var(--text)}.btn.wtb{background:#FEF3C7;color:#7A5A00;border:1px solid #F3DD9B}.cf-th{width:42px;height:42px;border-radius:10px;border:1px solid var(--border2);background-size:cover;background-position:center;cursor:pointer;flex:none}.cf-ok{color:var(--green)!important;font-weight:700!important}.cf-wt{color:#946C00!important;font-weight:700!important}.cf-in{color:var(--blue)!important;font-weight:700!important}.cf-revtx{display:flex;gap:10px;margin:12px 0 0 50px;padding:10px 12px;border-radius:10px;background:#FEF3C7;color:#5C4300;font-size:13px}.cf-revtx svg{width:16px;height:16px;flex:none;stroke:currentColor;fill:none;stroke-width:2;margin-top:2px}.cf-revtx small{color:#7A5A00!important}.cf-falta{margin:10px 0 0 50px;font-size:12px;color:var(--muted2);font-weight:600}.cf-impg{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}.cf-impg div{background:var(--s2);border-radius:10px;padding:10px 12px}.cf-impg span{display:block;font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase}.cf-impg b{font-size:15px;font-weight:800}.cf-impg .tt{background:var(--text);color:#fff}.cf-impg .tt span{color:#B9B9C0}.cf-obs{font-size:12px;color:var(--muted);font-weight:600;margin:10px 0 0}.cf-rod{display:flex;justify-content:flex-end;margin:12px 0 40px}.cf-ftres{display:grid;grid-template-columns:200px 1fr;gap:16px;align-items:start}.cf-ftres img{width:100%;border-radius:12px;display:block}@media (max-width:1320px){.cf-bt .btn{padding:10px 11px;font-size:13px}.cf-l2{gap:12px}}@media (max-width:1180px){.cf-l1{grid-template-columns:32px minmax(0,1fr) minmax(0,1fr)}.cf-c{grid-column:2}.cf-l2{grid-template-columns:140px 150px 170px}.cf-bt{grid-column:1/-1;justify-content:flex-end;margin-top:0;flex-wrap:wrap}}@media (max-width:959px){.cf-top{margin:-16px -16px 12px;padding:10px 16px}}@media (max-width:700px){ .cf-top{position:static;backdrop-filter:none;-webkit-backdrop-filter:none}.cf-prog{flex:1 1 100%;max-width:none}.cf-acs{position:fixed;left:0;right:0;bottom:0;z-index:60;background:#fff;border-top:1px solid var(--border);padding:10px 12px calc(10px + env(safe-area-inset-bottom));box-shadow:0 -8px 24px rgba(0,0,0,.08)}.cf-acs .btn{flex:1} .cf-info{grid-template-columns:1fr 1fr}.cf-l1{grid-template-columns:28px minmax(0,1fr)}.cf-b,.cf-c,.cf-d{grid-column:2} .cf-l2{grid-template-columns:1fr;margin-left:0}.cf-bt{display:flex;flex-direction:column;align-items:stretch;gap:8px}.cf-bt .btn{width:100%}.cf-bt .cf-th{display:none}.cf-bt .btn{min-height:50px;font-size:14px} .cf-revtx,.cf-falta{margin-left:0}.cf-impg{grid-template-columns:1fr 1fr}.cf-rod{margin-bottom:110px}.cf-ftres{grid-template-columns:1fr}}'+'.ft-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.ft-grid.um{grid-template-columns:minmax(0,420px);justify-content:center}.ft-slot{border:1.5px solid var(--border2);border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:10px}.ft-slot.ok{border-color:#BBE5C8;background:#FAFEFB}.ft-hd{display:flex;justify-content:space-between;align-items:center}.ft-hd b{font-size:14px;font-weight:800}.ft-slot img{width:100%;border-radius:10px;display:block}.ft-drop{padding:26px 12px}.ft-lido{font-size:12.5px;color:var(--muted2);font-weight:600}.ft-acs{display:flex;justify-content:center}.ft-pags{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}.ft-pag{position:relative;border:1px solid var(--border2);border-radius:12px;overflow:hidden;background:var(--s2)}.ft-pag img{width:100%;display:block;aspect-ratio:3/4;object-fit:cover}.ft-pag span{display:block;font-size:12px;font-weight:800;padding:6px 10px}.ft-pag .cf-x{position:absolute;top:6px;right:6px;width:28px;height:28px;font-size:12px}.ft-mais{display:flex!important;flex-direction:column;justify-content:center;min-height:200px;padding:12px}@media (max-width:700px){.ft-grid{grid-template-columns:1fr}}.cf-res{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:var(--s1);border:1px solid var(--border);border-radius:var(--r);padding:12px 16px;cursor:pointer;font:inherit;color:inherit;box-shadow:var(--sh1)}.cf-res.ok{border-color:#BBE5C8;background:#FAFEFB}.cf-res.rev{border-color:#F3DD9B;background:#FFFDF5}.cf-res.ok .cf-n{background:var(--green);color:#fff}.cf-res.rev .cf-n{background:#E9A80B;color:#fff}.cf-rt{flex:1;min-width:0}.cf-rt b{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cf-rt small{font-size:12.5px;color:var(--muted);font-weight:700}.cf-chev{color:var(--muted);font-size:12px}.cf-it.cf-aberto{position:relative;border-color:var(--roxo);box-shadow:0 0 0 3px rgba(255,90,0,.10)}.cf-rec{position:absolute;right:12px;top:10px;border:0;background:var(--s3);border-radius:8px;padding:5px 10px;font:inherit;font-size:12px;font-weight:800;color:var(--muted2);cursor:pointer;z-index:2}.cf-dest{grid-column:span 2}.cf-destb{display:flex;gap:8px;flex-wrap:wrap}.cf-destb button{display:flex;align-items:center;gap:8px;min-height:44px;padding:0 16px;border-radius:12px;border:1.5px solid var(--border2);background:#fff;font:inherit;font-size:14px;font-weight:800;cursor:pointer}.cf-destb button i{width:9px;height:9px;border-radius:3px}.cf-destb button.on{border-color:var(--roxo);background:var(--lf-soft)}.rc-cta{display:flex;align-items:center;gap:16px;width:100%;text-align:left;border:0;border-radius:var(--r);background:var(--text);color:#fff;padding:18px 22px;margin-bottom:12px;cursor:pointer;font:inherit}.rc-cta>svg{width:30px;height:30px;stroke:#FF8A33;fill:none;stroke-width:2;flex:none}.rc-cta span{flex:1}.rc-cta b{display:block;font-size:19px}.rc-cta small{color:#C9C9CF;font-weight:600;font-size:13px}.rcx{max-width:620px;margin:0 auto;padding-bottom:40px}.rc-hd{display:flex;align-items:center;gap:12px;margin-bottom:14px}.rc-hd b{display:block;font-size:21px;font-weight:800}.rc-hd small{font-size:13.5px;color:var(--muted);font-weight:700}.rc-x{width:48px;height:48px;border-radius:14px;border:1px solid var(--border2);background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;flex:none}.rc-x svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2}.rc-pass{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:16px}.rc-pass div{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:11.5px;font-weight:800;color:var(--muted);text-align:center}.rc-pass i{font-style:normal;width:28px;height:28px;border-radius:50%;border:2px solid var(--border2);display:flex;align-items:center;justify-content:center;background:#fff}.rc-pass .on{color:var(--text)}.rc-pass .on i{border-color:var(--roxo);color:var(--roxo)}.rc-pass .ok i{background:var(--roxo);border-color:var(--roxo);color:#fff}.rc-busca{display:flex;align-items:center;gap:10px;border:2px solid var(--border2);border-radius:16px;background:#fff;padding:0 14px;min-height:58px;margin-bottom:12px}.rc-busca:focus-within{border-color:var(--roxo)}.rc-busca svg{width:20px;height:20px;stroke:var(--muted);fill:none;stroke-width:2}.rc-busca input{flex:1;border:0;outline:none;font:inherit;font-size:17px;font-weight:700;background:transparent;min-width:0}.rc-lista{display:flex;flex-direction:column;gap:10px}.rc-ped{text-align:left;border:1.5px solid var(--border2);border-radius:18px;background:#fff;padding:14px 16px;cursor:pointer;font:inherit;color:inherit}.rc-ped:hover{border-color:var(--roxo)}.rc-l1{display:flex;justify-content:space-between;align-items:center;gap:8px}.rc-l1 b{font-size:18px}.rc-f{font-size:15px;font-weight:700;margin:4px 0 8px}.rc-its{display:flex;align-items:center;gap:6px}.rc-its span{font-size:13px;color:var(--muted);font-weight:700;margin-left:4px}.rc-sel{background:#fff;border:1px solid var(--border);border-radius:16px;padding:12px 16px;margin-bottom:12px}.rc-sel b{display:block;font-size:16px}.rc-sel small{color:var(--muted);font-weight:700}.rc-cam{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:200px;border:3px dashed var(--roxo);border-radius:22px;background:var(--lf-soft);color:var(--roxo-esc);cursor:pointer;text-align:center;padding:18px;margin-bottom:10px}.rc-cam input{display:none}.rc-cam svg{width:52px;height:52px;stroke:currentColor;fill:none;stroke-width:1.8}.rc-cam b{font-size:21px}.rc-cam small{font-size:14px;font-weight:700;color:#8A3A0A}.rc-pags{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px}.rc-pags:empty{display:none}.rc-pg{position:relative;border-radius:12px;overflow:hidden;border:1px solid var(--border2);background:#fff}.rc-pg img{width:100%;aspect-ratio:3/4;object-fit:cover;display:block}.rc-pg span{display:block;font-size:12px;font-weight:800;padding:4px 8px}.rc-pg button{position:absolute;top:6px;right:6px;width:28px;height:28px;border-radius:50%;border:0;background:#fff;cursor:pointer}.rc-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:62px;border-radius:18px;border:0;font:inherit;font-size:18px;font-weight:800;cursor:pointer;margin-top:10px}.rc-btn svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2.2}.rc-btn.pri{background:var(--roxo);color:#fff}.rc-btn.sec{background:#fff;border:1.5px solid var(--border2)}.rc-up input{display:none}.rc-cam.on{background:#FFE3D1}.rc-arq{display:flex;align-items:center;gap:12px;max-width:620px;margin:0 auto 10px;background:#fff;border:1.5px solid #BBE5C8;border-radius:18px;padding:14px 16px}.rc-arq .fi{color:#fff;font-size:12px;font-weight:800;border-radius:8px;padding:8px 9px;flex:none}.rc-arq div{flex:1;min-width:0}.rc-arq b{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rc-arq small{color:var(--green);font-weight:700}.rc-arq button{width:34px;height:34px;border-radius:50%;border:1px solid var(--border2);background:#fff;cursor:pointer;flex:none}.rcx>.rc-up{max-width:620px;margin-left:auto;margin-right:auto}.rc-btn.gh{background:transparent;color:var(--muted2);font-size:15px;min-height:48px}.rc-spin{width:18px;height:18px;border:3px solid rgba(255,255,255,.5);border-top-color:#fff;border-radius:50%;animation:gira .8s linear infinite}@media (max-width:700px){.cf-it .inp{min-height:48px;font-size:16px}.cf-dest{grid-column:1/-1}.cf-destb button{flex:1;min-height:52px;justify-content:center}.cf-info{grid-template-columns:1fr}.cf-res{padding:12px}.rc-cta{padding:16px}}.cf-res{position:relative;padding-right:120px}.cf-tag{position:absolute;top:10px;right:12px}.nl-hd{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:18px 0 10px}.nl-hd b{font-size:18px;font-weight:800}.nl-hd small{color:var(--muted);font-weight:700}.nl-fil{display:grid;gap:10px;margin-bottom:14px}.nl-q{margin:0}.nl-per{display:flex;gap:6px;flex-wrap:wrap}.nl-per button{flex:1 1 auto;min-height:46px;border-radius:14px;border:1.5px solid var(--border2);background:#fff;font:inherit;font-size:14.5px;font-weight:800;cursor:pointer;padding:0 14px}.nl-per button.on{background:var(--text);color:#fff;border-color:var(--text)}.nl-datas{display:grid;grid-template-columns:1fr 1fr;gap:10px}.nl-datas label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:800;color:var(--muted2)}.nl-datas input,.nl-sel select{min-height:50px;border-radius:14px;border:1.5px solid var(--border2);background:#fff;font:inherit;font-size:15px;font-weight:700;padding:0 12px;width:100%}.nl-sel{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.nl-lista{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}.nl-c.pend{border-color:#F3B27A;background:#FFFBF7}.nl-meta{display:flex;gap:12px;flex-wrap:wrap;font-size:13px;font-weight:700;color:var(--muted2);margin-bottom:10px}.nl-pe{display:flex;justify-content:space-between;align-items:center}.nl-pe b{font-size:18px}.nl-pe small{color:var(--muted);font-weight:700}.nl-cf{display:inline-flex;align-items:center;gap:6px;background:var(--roxo);color:#fff;border-radius:12px;padding:8px 14px;font-weight:800;font-size:14px}.nl-cf svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2.2}.rcx{max-width:1180px}.rcx>.rc-hd,.rcx>.rc-pass,.rcx>.rc-busca,.rcx>.rc-sel,.rcx>.rc-pags,.rcx>.rc-cam,.rcx>.rc-btn{max-width:620px;margin-left:auto;margin-right:auto}.rcx>.rc-lista{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}@media (max-width:700px){.nl-sel{grid-template-columns:1fr}.nl-lista,.rcx>.rc-lista{grid-template-columns:1fr}.cf-res{padding-right:12px;padding-top:34px}.cf-tag{top:8px;right:10px}}.cf-psel{display:flex;align-items:center;gap:8px}.cf-psel select{flex:1;min-width:0}.nf-drop1{display:flex!important;align-items:center;justify-content:center;gap:16px;text-align:left;padding:26px 20px}.nf-drop1 .ic{margin:0}.nf-perg{margin:0 0 14px;font-weight:700;color:var(--muted2)}.nf-emps{display:grid;gap:10px}.nf-emp{display:flex;gap:12px;align-items:center;text-align:left;border:1.5px solid var(--border2);background:var(--s1);border-radius:14px;padding:14px;cursor:pointer;font:inherit;color:inherit}.nf-emp:hover{border-color:var(--muted)}.nf-emp.on{border-color:var(--roxo);background:var(--lf-soft)}.nf-emp b{display:block;font-size:14.5px}.nf-emp small{display:block;color:var(--muted);font-weight:600;font-size:12px}.nf-emp em{display:inline-block;margin-top:4px;font-style:normal;font-size:11px;font-weight:800;color:var(--roxo-esc)}.nf-emp .emp-ic{width:36px;height:36px;font-size:12px;border-radius:9px}'; document.head.appendChild(c); }
function css(){ css2();
  if(document.getElementById('css-notas')) return;
  var s=document.createElement('style'); s.id='css-notas';
  s.textContent=[
    '.tela-notas .grid>.card+.card{margin-top:0}',
    '.tela-notas .kv span.badge,.tela-notas .kv span.tag,.tela-notas .kv span.dep{display:inline-flex;text-transform:none;letter-spacing:0;margin:0}',
    '.tela-notas .kv span.badge{font-size:10.5px}.tela-notas .kv span.tag{font-size:11px;color:var(--muted2)}',
    '.tela-notas .kv small{display:block;font-size:11.5px;color:var(--muted);font-weight:600;margin-top:2px}',
    '.nf-up{display:flex;flex-direction:column;height:100%}',
    '.nf-up .drop{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:34px 20px;background:linear-gradient(180deg,#FFFFFF,#FAFAFA)}',
    '.nf-up .drop .ic{width:60px;height:60px;border-radius:16px;box-shadow:var(--sh2)}',
    '.nf-up .drop b{font-size:16px}',
    '.nf-fmt{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:14px}',
    '.nf-fmt span{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:800;color:var(--muted2);background:#fff;border:1px solid var(--border);border-radius:8px;padding:5px 9px}',
    '.nf-fmt span i{font-style:normal;font-size:9.5px;color:#fff;border-radius:4px;padding:1px 5px}',
    '.nf-ben{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}',
    '.nf-ben div{font-size:11.5px;font-weight:700;color:var(--muted2);background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:8px 10px;line-height:1.35}',
    '.nf-ben b{display:block;color:var(--text);font-size:12px}',
    '.nfin{display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--border);border-radius:14px;cursor:pointer;background:var(--s1);transition:border-color .15s,box-shadow .15s}',
    '.nfin+.nfin{margin-top:10px}',
    '.nfin:hover{border-color:var(--border2);box-shadow:var(--sh2)}',
    '.nfin.dm{border-color:#FFC9A6;background:linear-gradient(90deg,var(--lf-soft),#fff 60%)}',
    '.nfin .gr{flex:1;min-width:0}',
    '.nfin .tt{font-size:13.5px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.nfin .dd{font-size:11.5px;color:var(--muted);font-weight:700;margin-top:2px;display:flex;gap:6px;flex-wrap:wrap;align-items:center}',
    '.nfin .rt{text-align:right;flex:none}',
    '.nfin .rt b{display:block;font-size:14.5px;font-weight:800;font-variant-numeric:tabular-nums;margin-bottom:4px}',
    /* conferência: linha do item */
    '.nfi{display:grid;grid-template-columns:26px minmax(0,1.45fr) 16px minmax(0,1.35fr) minmax(0,1fr) minmax(0,.95fr) 118px;gap:14px;align-items:start;padding:14px 16px;border-top:1px solid var(--border)}',
    '.nfi:first-child{border-top:0}',
    '.nfi.ok{background:#F6FCF8}',
    '.nfi.sem{background:#FFF9F9}',
    '.nfi .ix{width:24px;height:24px;border-radius:7px;background:var(--s3);font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;color:var(--muted2)}',
    '.nfi.ok .ix{background:var(--green);color:#fff}',
    '.nfi .lb{font-size:10px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.45px;margin-bottom:5px;display:flex;gap:6px;align-items:center;flex-wrap:wrap}',
    '.nfi .ds{font-size:13px;font-weight:800;line-height:1.3;word-break:break-word}',
    '.nfi small{display:block;font-size:11.5px;color:var(--muted);font-weight:600;margin-top:3px;line-height:1.4}',
    '.nfi small b{color:var(--text)}',
    '.nfi .qv{font-size:12.5px;font-weight:700;margin-top:6px;font-variant-numeric:tabular-nums}',
    '.nfi .tx,.cf-a .tx{display:flex;gap:4px;flex-wrap:wrap;margin-top:7px}',
    '.nfi .tx span,.cf-a .tx span{font-size:10.5px;font-weight:800;border-radius:6px;padding:2px 6px;background:var(--s3);color:var(--muted2);font-variant-numeric:tabular-nums}',
    '.nfi .tx span.on,.cf-a .tx span.on{background:#EEF3FF;color:var(--blue)}',
    '.nfi .sta{color:var(--muted);padding-top:22px;font-size:14px;font-weight:800}',
    '.nfi .fx{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;white-space:nowrap}',
    '.nfi .fx input{width:78px}',
    '.nfi .cu{font-size:15px;font-weight:800;font-variant-numeric:tabular-nums;display:flex;gap:6px;align-items:center;flex-wrap:wrap}',
    '.nfi .cf{display:flex;flex-direction:column;gap:6px;align-items:stretch}',
    '.nfi .tgl{display:flex;align-items:center;justify-content:center;gap:7px;font-size:12px;font-weight:800;border:1.5px solid var(--border2);border-radius:10px;padding:8px 8px;cursor:pointer;background:#fff;user-select:none}',
    '.nfi .tgl input{width:15px;height:15px;accent-color:var(--green);margin:0}',
    '.nfi .tgl.on{border-color:var(--green);background:var(--g-soft);color:var(--green)}',
    '.nfi .tgl.dis{opacity:.5;cursor:not-allowed}',
    '.nf-prog{display:flex;align-items:center;gap:14px;flex-wrap:wrap}',
    '.nf-prog .bar{flex:1;min-width:140px}',
    '.nf-chave{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;letter-spacing:.6px;font-weight:700;word-spacing:3px}',
    '.nf-tot{display:flex;flex-direction:column;gap:2px}',
    '.nf-trib{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}',
    '.nf-trib .bx{border:1px solid var(--border);border-radius:14px;padding:14px 16px}',
    '.nf-trib .bx.cr{border-color:#BBE5C8;background:#F6FCF8}',
    '.nf-trib .bx h4{margin:0 0 4px;font-size:13px;font-weight:800;display:flex;justify-content:space-between;gap:8px}',
    '.nf-trib .bx .vv{font-size:22px;font-weight:800;font-variant-numeric:tabular-nums;margin:2px 0 8px}',
    '.nf-trib .bx p{margin:0 0 8px;font-size:11.5px;color:var(--muted);font-weight:600;line-height:1.45}',
    /* resumo DANFE */
    '.danfe{border:1.5px solid #2A2A2D;border-radius:12px;overflow:hidden;background:#fff;font-size:12px}',
    '.danfe .dr{display:grid;border-top:1px solid #2A2A2D}',
    '.danfe .dr:first-child{border-top:0}',
    '.danfe .dc{padding:8px 11px;border-left:1px solid #2A2A2D;min-width:0}',
    '.danfe .dc:first-child{border-left:0}',
    '.danfe .dc span{display:block;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.4px;color:var(--muted);margin-bottom:2px}',
    '.danfe .dc b{font-size:12.5px;font-weight:800;display:block;overflow:hidden;text-overflow:ellipsis}',
    '.danfe .dc small{font-size:11px;color:var(--muted2);font-weight:600;display:block}',
    '.danfe .tit{font-size:20px;font-weight:800;letter-spacing:1px}',
    '.danfe .bc svg{display:block;width:100%;height:38px}',
    '.danfe .sec{background:var(--s3);font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--muted2);padding:5px 11px;border-top:1px solid #2A2A2D}',
    '.nf-res-hd{display:flex;gap:14px;align-items:center;padding:14px 16px;border-radius:14px;background:linear-gradient(120deg,#EAF8EF,#F6FCF8);border:1px solid #BBE5C8;margin-bottom:16px}',
    '.nf-res-hd .ok{width:42px;height:42px;border-radius:50%;background:var(--green);color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;flex:none}',
    '.nf-res-hd b{font-size:15px;font-weight:800;display:block}',
    '.nf-res-hd small{font-size:12px;color:#166534;font-weight:600}',
    '.nf-arq{display:flex;align-items:center;gap:14px;padding:16px;border:1px solid var(--border);border-radius:14px;background:var(--s2)}',
    '.nf-arq .fi{width:46px;height:56px;border-radius:8px;color:#fff;display:flex;align-items:flex-end;justify-content:center;font-size:11px;font-weight:800;padding-bottom:7px;flex:none;position:relative}',
    '.nf-arq .fi:before{content:"";position:absolute;right:0;top:0;border-style:solid;border-width:0 12px 12px 0;border-color:transparent #fff transparent transparent;opacity:.9}',
    '.nf-arq b{display:block;font-size:13px;font-weight:800;word-break:break-all}',
    '.nf-arq small{font-size:11.5px;color:var(--muted);font-weight:600}',
    '@media (max-width:1280px){.nfi{grid-template-columns:26px minmax(0,1fr) minmax(0,1fr) minmax(0,.9fr);}.nfi .sta{display:none}.nfi>.nfi-c{grid-column:2}.nfi>.nfi-e{grid-column:3/5}}',
    '@media (max-width:1100px){.nf-ben{grid-template-columns:minmax(0,1fr)}}',
    '@media (max-width:760px){.nfi{grid-template-columns:26px minmax(0,1fr)}.nfi>*{grid-column:2!important}.nfi>.ix{grid-column:1!important;grid-row:1}.nf-trib{grid-template-columns:minmax(0,1fr)}.danfe .dr{grid-template-columns:minmax(0,1fr)!important}.danfe .dc{border-left:0;border-top:1px solid var(--border)}}'
  ].join('\n');
  document.head.appendChild(s);
}

/* ---------- utilidades de nota ---------- */
function qtdBase(it){ return r3(it.qtd*(it.fator||1)); }
/* custo unitário de entrada: mesma composição usada por LFI.lancarNota (produtos + IPI + ST) */
function custoUnit(it){ var q=qtdBase(it); return q? r2((it.vProd+(it.ipi.v||0)+(it.st.v||0))/q) : 0; }
function impNota(n){ var t={icms:0,ipi:0,pis:0,cofins:0,st:0,bc:0,prod:0}; n.itens.forEach(function(it){ t.icms+=it.icms.v; t.ipi+=it.ipi.v; t.pis+=it.pis.v; t.cofins+=it.cofins.v; t.st+=it.st.v; t.bc+=it.icms.bc||0; t.prod+=it.vProd; }); for(var k in t) t[k]=r2(t[k]); t.total=r2(t.icms+t.ipi+t.pis+t.cofins+t.st); return t; }
/* crédito potencial: mesmo critério de LFI.impostosDestacados (LFI.creditoItem) */
function credItem(it, n){ return LFI.creditoItem(it, n); }
function fmtChave(c){ return String(c||'').replace(/\D/g,'').replace(/(\d{4})(?=\d)/g,'$1 '); }
function pendentes(n){ return n.status!=='lancada'&&n.status!=='cancelada'; }
function unBase(p){ return p?p.un:''; }
function notaVisivel(n){ return LFI.empresaVisivel(n.empresa); }

/* fator sugerido: usa LFI.sugerirFator e descarta leituras impossíveis (ex.: "350ML" num produto controlado por unidade) */
function fatorSugerido(it, p){
  var f=LFI.sugerirFator(it.desc, it.un, p);
  if(p && p.un==='un' && (f<1 || f%1)) f = p.conv&&p.conv.fator ? p.conv.fator : 1;
  return f||1;
}
/* correspondência automática na primeira abertura da conferência */
function preparar(n){
  var mudou=false;
  n.itens.forEach(function(it){
    if(it.sugs) return; mudou=true;
    var sug=LFI.sugerirProduto(it.desc, 5);
    it.sugs=sug.map(function(s){ return {prod:s.prod.id, score:s.score}; });
    if(it.prod){ var x=it.sugs.filter(function(s){ return s.prod===it.prod; })[0]; it.score=x?x.score:100; if(!it.fator) it.fator=fatorSugerido(it, LFI.prod(it.prod)); }
    else if(sug[0] && sug[0].score>=60){ it.prod=sug[0].prod.id; it.score=sug[0].score; it.fator=fatorSugerido(it, sug[0].prod); }
    else { it.prod=null; it.score=sug[0]?sug[0].score:0; }
    it.conf=false;
  });
  if(mudou) LFI.salvar();
}
function itemOk(it){ return it.ignorar || it.revisao || (it.prod && it.conf); }

/* ---------- roteador ---------- */
function render(el, arg){
  css();
  if(arg==='receber') return receber(el);
  if(arg){
    var n=LFI.nota(arg);
    if(!n){ el.innerHTML=UI.cabecalho({titulo:'Nota não encontrada', migalha:[{t:'Notas Fiscais', ir:'notas'},{t:'Não encontrada'}]})+'<div class="card">'+UI.vazio('A nota solicitada não existe nesta base de demonstração.','🔎')+'</div>'; UI.liga(el, UI.navHandlers({})); return; }
    if(pendentes(n)) return conferencia(el, n.id);
    return detalhe(el, n.id);
  }
  lista(el);
}

/* =====================================================================
   LISTA: KPIs, upload, caixa de entrada, histórico
   ===================================================================== */
function periodoFiltro(per){ var D=LFI.dataUtil.D, h=LFI.hoje();
  if(per==='custom'){ var x=st(); return {de:x.de||D(-29), ate:x.ate||h}; }
  if(per==='30d') return {de:D(-29), ate:h}; if(per==='mes') return LFI.periodo('mes'); if(per==='90d') return {de:D(-89), ate:h}; return null; }

function lista(el){
  var s=st(), db=LFI.db, pm=LFI.periodo('mes');
  var vis=db.notas.filter(notaVisivel);
  var caixa=vis.filter(pendentes).sort(function(a,b){ return (a.id==='nf_demo'?-1:0)-(b.id==='nf_demo'?-1:0) || (a.emissao<b.emissao?1:-1); });
  var lancMes=vis.filter(function(n){ return n.status==='lancada' && (n.entrada||n.emissao)>=pm.de && (n.entrada||n.emissao)<=pm.ate; });
  var vMes=0, impMes={icms:0,ipi:0,pis:0,cofins:0,st:0,total:0}; lancMes.forEach(function(n){ vMes+=n.valor; var t=impNota(n); for(var k in impMes) impMes[k]+=t[k]; });
  var vCaixa=0; caixa.forEach(function(n){ vCaixa+=n.valor; });
  var emp=LFI.empresaAtual();

  var h=UI.cabecalho({titulo:'Recebimento', sub:(emp?esc(emp.fantasia)+' · CNPJ '+emp.cnpj:esc(db.grupo.nome)+' · todas as empresas')+' · conferência das entregas pela nota fiscal'});

  h+='<button class="rc-cta" data-act="rcb">'+UI.ic('caminhao')+'<span><b>Receber pedido</b><small>Escolha o pedido que chegou, fotografe ou envie a nota e confira os itens</small></span>'+UI.ic('seta')+'</button>';
  h+='<div class="kpis">'+
    UI.kpi({lb:'<span style="color:#E9A80B">●</span> Aguardando conferência', vl:caixa.length+' <small>'+(caixa.length===1?'nota':'notas')+'</small>', dl:F.moeda(vCaixa)+' a lançar', act:caixa.length?'abrir':'', id:caixa[0]?caixa[0].id:'', hl:caixa.length>0})+
    UI.kpi({lb:'Lançadas no mês', vl:String(lancMes.length), dl:'Notas que já entraram no estoque'})+
    UI.kpi({lb:'Valor de entradas · mês', vl:F.moeda(vMes), dl:Object.keys(fornMes(lancMes)).length+' fornecedores'})+
    UI.kpi({lb:'Impostos destacados · mês', vl:F.moeda(impMes.total), dl:'Informados pelos fornecedores nas notas'})+
  '</div>';


  /* notas importadas */
  var forns={}; vis.forEach(function(n){ forns[n.forn]=1; });
  h+='<div class="nl-hd"><b>Notas importadas</b><small id="nf-cont"></small></div>'+
    '<div class="nl-fil"><div class="rc-busca nl-q">'+UI.ic('busca')+'<input id="nf-q" placeholder="Número, fornecedor ou produto" value="'+esc(s.q)+'"></div>'+
      '<div class="nl-per">'+[['30d','30 dias'],['mes','Mês'],['90d','90 dias'],['todas','Todas'],['custom','Período']].map(function(x){ return '<button class="'+(s.per===x[0]?'on':'')+'" data-act="per" data-id="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</div>'+
      (s.per==='custom'?'<div class="nl-datas"><label>De<input type="date" data-chg="fDe" value="'+periodoFiltro('custom').de+'"></label><label>Até<input type="date" data-chg="fAte" value="'+periodoFiltro('custom').ate+'"></label></div>':'')+
      '<div class="nl-sel"><select data-chg="fFor"><option value="">Todos os fornecedores</option>'+Object.keys(forns).map(function(f){ return '<option value="'+f+'"'+(s.forn===f?' selected':'')+'>'+esc(LFI.forn(f).nome)+'</option>'; }).join('')+'</select>'+
      '<select data-chg="fSt"><option value="">Todas as situações</option>'+['recebida','lancada','cancelada'].map(function(k){ return '<option value="'+k+'"'+(s.status===k?' selected':'')+'>'+LFI.STATUS.nf[k][0]+'</option>'; }).join('')+'</select>'+
      '<select data-chg="fDep"><option value="">Todos os destinos</option>'+LFI.depsVisiveis().map(function(d){ return '<option value="'+d.id+'"'+(s.dep===d.id?' selected':'')+'>'+esc(d.nome)+'</option>'; }).join('')+'</select></div></div>'+
    '<div class="rc-lista nl-lista" id="nf-hist"></div>';
  el.innerHTML=h;
  function cartao(n){ var f=LFI.forn(n.forn), o=n.oc&&LFI.ordem(n.oc), p=pendentes(n);
    return '<button class="rc-ped nl-c'+(p?' pend':'')+'" data-act="abrir" data-id="'+n.id+'"><div class="rc-l1"><b>NF '+esc(n.numero)+'</b>'+UI.status('nf', n.status==='conferencia'?'recebida':n.status)+'</div><div class="rc-f">'+esc(f.nome)+'</div>'+
      '<div class="nl-meta"><span>'+UI.dep(n.dep)+'</span><span>'+F.data(n.emissao)+'</span>'+(o?'<span>'+esc(o.num)+'</span>':'')+'</div>'+
      '<div class="nl-pe"><b>'+F.moeda(n.valor)+'</b>'+(p?'<span class="nl-cf">Conferir'+UI.ic('seta')+'</span>':'<small>'+n.itens.length+(n.itens.length===1?' item':' itens')+'</small>')+'</div></button>'; }
  var tab={redesenha:function(ls){ ls=ls.slice().sort(function(a,b){ var pa=pendentes(a)?1:0, pb=pendentes(b)?1:0; if(pa!==pb) return pb-pa; return a.emissao<b.emissao?1:-1; }); el.querySelector('#nf-hist').innerHTML=ls.length?ls.map(cartao).join(''):'<div class="card">'+UI.vazio('Nenhuma nota encontrada com estes filtros.','🔎')+'</div>'; }};
  function atualiza(){ var ls=filtrar(vis); tab.redesenha(ls); var t=0; ls.forEach(function(n){ t+=n.valor; }); el.querySelector('#nf-cont').textContent=ls.length+(ls.length===1?' nota':' notas')+' · '+F.moeda(t); }
  atualiza();
  el.querySelector('#nf-q').addEventListener('input', function(ev){ s.q=ev.target.value; atualiza(); });

  ligaUpload(el);
  UI.liga(el, UI.navHandlers({
    abrir:function(id){ if(id) LFI.ir('notas', id); },
    rcb:function(){ st().rcb=null; LFI.ir('notas','receber'); },
    up:function(){ el.querySelector('#nf-arq').click(); },
    per:function(id){ s.per=id; LFI.recarregar(); },
    fFor:function(_,ev){ s.forn=ev.target.value; atualiza(); },
    fSt:function(_,ev){ s.status=ev.target.value; atualiza(); },
    fDep:function(_,ev){ s.dep=ev.target.value; atualiza(); },
    fDe:function(_,ev){ s.de=ev.target.value; atualiza(); },
    fAte:function(_,ev){ s.ate=ev.target.value; atualiza(); },
    forn:function(id){ LFI.ir('fornecedores', id); },
    exp:function(){ exportar(filtrar(vis)); }
  }));
}
function fornMes(ls){ var o={}; ls.forEach(function(n){ o[n.forn]=o[n.forn]||{v:0,n:0}; o[n.forn].v+=n.valor; o[n.forn].n++; }); return o; }
function filtrar(ls){
  var s=st(), p=periodoFiltro(s.per), q=String(s.q||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim(), qd=q.replace(/\D/g,'');
  return ls.filter(function(n){
    if(s.forn&&n.forn!==s.forn) return false;
    if(s.status&&(s.status==='recebida'?!pendentes(n):n.status!==s.status)) return false;
    if(s.dep&&n.dep!==s.dep) return false;
    if(p&&(n.emissao<p.de||n.emissao>p.ate)&&!pendentes(n)) return false;
    if(q){ var f=LFI.forn(n.forn), txt=(n.numero+' '+f.nome+' '+f.razao+' '+n.itens.map(function(i){ return i.desc; }).join(' ')).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
      if(txt.indexOf(q)<0 && !(qd.length>=3&&(String(n.chave).indexOf(qd)>=0||n.numero.replace(/\D/g,'').indexOf(qd)>=0))) return false; }
    return true; });
}
function exportar(ls){
  UI.exportarExcel('notas_fiscais_entrada', ['Número','Série','Fornecedor','CNPJ fornecedor','Empresa destinatária','CNPJ destinatário','Destino','Emissão','Entrada','Itens','Valor produtos','ICMS','IPI','PIS','COFINS','ICMS-ST','Valor total','OC','Status','Chave de acesso'],
    ls.map(function(n){ var f=LFI.forn(n.forn), e=LFI.emp(n.empresa), t=impNota(n), o=n.oc&&LFI.ordem(n.oc); return [n.numero, n.serie, f.nome, f.cnpj, e.fantasia, e.cnpj, LFI.dep(n.dep).nome, F.data(n.emissao), n.entrada?F.data(n.entrada):'', n.itens.length, t.prod, t.icms, t.ipi, t.pis, t.cofins, t.st, n.valor, o?o.num:'', LFI.STATUS.nf[n.status][0], n.chave]; }), 'Notas fiscais');
  UI.toast('Histórico exportado', ls.length+' notas');
}

/* ---------- upload e leitura simulada ---------- */
function ligaUpload(el){
  var dz=el.querySelector('#nf-drop'), inp=el.querySelector('#nf-arq'); if(!dz) return;
  ['dragenter','dragover'].forEach(function(e){ dz.addEventListener(e, function(ev){ ev.preventDefault(); dz.classList.add('on'); }); });
  ['dragleave','drop'].forEach(function(e){ dz.addEventListener(e, function(ev){ ev.preventDefault(); dz.classList.remove('on'); }); });
  function recebe(lista){ var fs=Array.prototype.slice.call(lista||[]); if(!fs.length) return; var imgs=fs.filter(function(f){ return /^image\//.test(f.type)||/\.(jpe?g|png|heic|webp)$/i.test(f.name); }); if(imgs.length) fotosNota(imgs); else ler(fs[0]); }
  dz.addEventListener('drop', function(ev){ recebe(ev.dataTransfer&&ev.dataTransfer.files); });
  inp.addEventListener('change', function(){ recebe(inp.files); inp.value=''; });
}
var ETAPAS=['Validando XML e assinatura digital','Lendo emitente e destinatário','Identificando produtos','Impostos e NCM','Correspondência com o cadastro'];
function ler(arq){
  var nome=arq.name||'nota.xml', foto=/^image/.test(arq.type||''), pdf=!foto&&(/\.pdf$/i.test(nome)||/pdf/.test(arq.type||'')), kb=Math.max(1,Math.round((arq.size||18000)/1024));
  var demo=LFI.nota('nf_demo'), usaDemo=demo&&pendentes(demo);
  var m=UI.modal({titulo:'Lendo nota fiscal', sub:foto?'Foto da nota · '+(PAGINAS?PAGINAS.length:1)+' página(s)':pdf?'DANFE em PDF · reconhecimento do documento':'XML NF-e · leitura estruturada', tam:'lg', fixo:true, botoes:'<button class="btn sec" data-act="_fechar">Cancelar</button>',
    corpo:'<div class="grid g2" style="align-items:start"><div><div class="nf-arq scan"><span class="fi" style="background:'+(foto?'#1D4ED8':pdf?'#DC2626':'#16A34A')+'">'+(foto?'FOTO':pdf?'PDF':'XML')+'</span><div style="min-width:0"><b>'+esc(nome)+'</b><small>'+kb+' KB · recebido agora</small></div></div>'+
      '<div id="lt-info" style="margin-top:14px"></div></div>'+
      '<div><div class="leitura" id="lt">'+ETAPAS.map(function(t,i){ return '<div class="lt-it" data-i="'+i+'"><span class="bo"></span>'+esc(t)+'</div>'; }).join('')+'</div></div></div>'});
  var cancelado=false; var fecharOrig=m.fechar; m.fechar=function(){ cancelado=true; fecharOrig(); if(LFI.atual().id==='notas'&&!LFI.atual().arg) LFI.recarregar(); };
  var n = usaDemo ? demo : null, info=m.corpo.querySelector('#lt-info');
  var passo=0;
  (function prox(){
    if(cancelado) return;
    var its=UI.els('.lt-it', m.corpo);
    its.forEach(function(x,i){ x.className='lt-it'+(i<passo?' ok':i===passo?' on':''); if(i<passo) x.querySelector('.bo').textContent='✓'; });
    if(passo===1 && !n){ n=gerarNota(nome, pdf); }
    if(passo>=2 && n){ var f=LFI.forn(n.forn);
      info.innerHTML='<div class="kv"><div><span>Emitente</span><b>'+esc(f.nome)+'</b><small class="mono">'+f.cnpj+'</small></div><div><span>NF / série</span><b>'+esc(n.numero)+' / '+esc(n.serie)+'</b></div>'+
        (passo>=3?'<div><span>Itens</span><b>'+n.itens.length+' produtos</b></div><div><span>Valor total</span><b>'+F.moeda(n.valor)+'</b></div>':'')+'</div>'; }
    if(passo>=ETAPAS.length){ if(foto&&PAGINAS){ n.paginas=PAGINAS; n.origem='foto'; PAGINAS=null; LFI.salvar(); } preparar(n); terminou(m, n); return; }
    passo++; setTimeout(prox, passo===1?520:640);
  })();
}
function terminou(m, n){
  var f=LFI.forn(n.forn), sel=n.empresa;
  m.el.querySelector('.mdl-hd h3').textContent='De qual empresa é esta nota?'; var sb=m.el.querySelector('.mdl-hd small'); if(sb) sb.textContent='Os produtos entram no estoque da empresa escolhida';
  function des(){
    m.corpoHTML('<p class="nf-perg">NF '+esc(n.numero)+' · '+esc(f.nome)+' · '+F.moeda(n.valor)+'</p><div class="nf-emps">'+LFI.db.empresas.map(function(e){
      return '<button type="button" class="nf-emp'+(e.id===sel?' on':'')+'" data-act="emp" data-id="'+e.id+'"><span class="emp-ic" style="background:'+e.cor+'">'+e.sigla+'</span><span><b>'+esc(e.fantasia)+'</b><small>CNPJ '+e.cnpj+'</small>'+(e.id===n.empresa?'<em>CNPJ que está na nota</em>':'')+'</span></button>'; }).join('')+'</div>');
  }
  des();
  m.rodapeHTML('<button class="btn sec" data-act="_fechar">Conferir depois</button><button class="btn pri" data-act="conf">Continuar'+UI.ic('seta')+'</button>');
  UI.liga(m.el, {emp:function(id){ sel=id; des(); }, conf:function(){
    var x=LFI.nota(n.id); if(x.empresa!==sel){ x.empresa=sel; var d=LFI.db.departamentos.filter(function(dd){ return dd.empresa===sel; }); x.dep=(d.filter(function(dd){ return dd.id==='cen'; })[0]||d[0]).id; }
    LFI.salvar(); m.fechar(); LFI.ir('notas', n.id); }});
}

/* gera uma NF plausível de um fornecedor com itens das suas categorias (sem vínculo de produto: a correspondência vem depois) */
var NOVOS={mer:['MOLHO BARBECUE DEFUMADO GL 3,6KG','2103.90.21','GL',3.6,58.9], far:['FARINHA CENTEIO INTEGRAL 5KG','1102.90.00','PC',5,46.5], ori:['MISSO SHIRO PASTA SOJA 1KG','2103.90.91','PC',1,29.8], lat:['PARMESAO RALADO FRESCO 1KG','0406.20.00','PC',1,78.4], pes:['CAMARAO CINZA LIMPO CONG 1KG','0306.17.10','PC',1,74.9], car:['BACON CUBOS DEFUMADO 1KG','0210.12.00','PC',1,39.9], hor:['RUCULA HIDROPONICA MACO','0709.99.90','MC',1,3.9], beb:['CHA GELADO PESSEGO 340ML FD6','2202.99.00','FD',6,21.6], emb:['POTE PP 250ML C/TAMPA CX100','3923.30.00','CX',100,48.0], ole:['OLEO GERGELIM TORRADO 900ML','1515.50.00','FR',0.9,42.0]};
var MARCAS=['PREMIUM','QUALITA','BOM SABOR','SELECAO','TOP LINE'];
function semAcento(s){ return String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase(); }
function abrevUn(conv){ var w=semAcento(String(conv||'').split(' ')[0]); return {SACO:'SC',FARDO:'FD',CAIXA:'CX',PACOTE:'PC',BALDE:'BD',GALAO:'GL',LATA:'LT',BLOCO:'BL',PECA:'PC',BARRA:'BR',POTE:'PT',BISNAGA:'BN',BANDEJA:'BJ',ENGRADADO:'EG',GARRAFA:'GF',ROLO:'RL'}[w]||'CX'; }
function gerarNota(nomeArq, pdf){
  var R=Math.random, db=LFI.db;
  var forns=db.fornecedores.filter(function(f){ return db.produtos.some(function(p){ return LFI.compravel(p)&&(p.forn===f.id||(p.fornAlt||[]).indexOf(f.id)>=0); }); });
  var f=forns[Math.floor(R()*forns.length)];
  var prods=db.produtos.filter(function(p){ return LFI.compravel(p)&&(p.forn===f.id||(p.fornAlt||[]).indexOf(f.id)>=0); });
  prods.sort(function(){ return R()-.5; }); prods=prods.slice(0, Math.min(prods.length, 3+Math.floor(R()*3)));
  var deps=LFI.depIds(), dep=deps.indexOf('cen')>=0?'cen':deps[0], empresa=LFI.dep(dep).empresa, inter=f.uf!=='SP';
  var itens=prods.map(function(p,i){
    var ap=(p.apelidos&&p.apelidos.length)?p.apelidos[Math.floor(R()*p.apelidos.length)]:semAcento(p.nome);
    var desc=semAcento(ap)+(i===1?' '+MARCAS[Math.floor(R()*MARCAS.length)]:'');
    var temTam=/(\d+(?:[,.]\d+)?)\s*(KG|L|LT|G|ML)\b/.test(desc)||/(\d+)\s*(FOLHAS|UN|UNID|LATAS)/.test(desc), un, fator, qtd;
    if(p.conv&&p.conv.fator>1&&(temTam||p.un==='un')){ un=abrevUn(p.conv.un); fator=p.un==='un'?p.conv.fator:LFI.sugerirFator(desc,un,p); if(fator!==p.conv.fator&&p.un!=='un') un='PC'; qtd=2+Math.floor(R()*6); }
    else { un=p.un==='L'?'LT':p.un.toUpperCase(); fator=1; qtd=Math.max(1, Math.round(Math.max(p.estMin*0.6, 2))); }
    var vUn=r2(p.ultimoCusto*(0.95+R()*0.11)*fator);
    return itemNovo(desc, f, p.ncm, un, qtd, vUn, p, inter);
  });
  var cat=f.cats.filter(function(c){ return NOVOS[c]; })[0];
  if(cat&&R()<0.8){ var x=NOVOS[cat]; itens.push(itemNovo(x[0], f, x[1], x[2], 2+Math.floor(R()*4), x[4], null, inter)); }
  var num=LFI.proximo('nf'), frete=R()<0.45?r2(35+R()*90):0;
  var t=0; itens.forEach(function(i){ t+=i.vProd+i.ipi.v+i.st.v; });
  var d=new Date(), yymm=String(d.getFullYear()).slice(2)+String(d.getMonth()+1).padStart(2,'0');
  var chave=('35'+yymm+f.cnpj.replace(/\D/g,'')+'55'+'001'+num.replace(/\D/g,'').padStart(9,'0')+'1'+String(Math.floor(R()*1e8)).padStart(8,'0')+Math.floor(R()*10)).slice(0,44);
  var n={id:LFI.novoId('nf'), numero:num, serie:'1', forn:f.id, empresa:empresa, dep:dep, emissao:LFI.hoje(), entrada:null, status:'recebida', origem:pdf?'pdf':'xml', arquivo:nomeArq, oc:null, frete:frete, desconto:0,
    natOp:itens.some(function(i){ return i.cfop==='5405'; })?'Venda de mercadoria sujeita a ST':'Venda de mercadoria adquirida de terceiros', itens:itens, valor:r2(t+frete), chave:chave, cp:null};
  LFI.db.notas.unshift(n);
  LFI.atividade('nf','NF '+num+' importada ('+f.nome+') · aguardando conferência',{tela:'notas',id:n.id});
  LFI.salvar();
  return n;
}
function itemNovo(desc, f, ncm, un, qtd, vUn, p, inter){
  var vProd=r2(qtd*vUn), rg=p?LFI.regraDoProduto(p):null, ok=rg&&rg.status!=='pendente'&&rg.icms!=null;
  var it={id:LFI.novoId('i'), desc:desc, cod:f.nome.replace(/[^A-Z]/g,'').slice(0,2)+'-'+(1000+Math.floor(Math.random()*9000)), ncm:ncm, cfop:inter?'6102':'5102', un:un, qtd:qtd, vUn:vUn, vProd:vProd, prod:null, fator:1, conf:false};
  var icms=ok?rg.icms:12, ipi=ok?rg.ipi||0:0, pis=ok?rg.pis||0:0, cofins=ok?rg.cofins||0:0, stv=ok&&rg.st;
  if(stv){ it.cfop=inter?'6404':'5405'; it.icms={cst:'60', bc:0, p:0, v:0}; it.st={v:r2(vProd*0.2)}; }
  else { it.icms={cst:icms?'00':'40', bc:icms?vProd:0, p:icms, v:r2(vProd*icms/100)}; it.st={v:0}; }
  it.ipi={p:ipi, v:r2(vProd*ipi/100)}; it.pis={p:pis, v:r2(vProd*pis/100)}; it.cofins={p:cofins, v:r2(vProd*cofins/100)};
  return it;
}

/* =====================================================================
   CONFERÊNCIA
   ===================================================================== */
/* =====================================================================
   CONFERÊNCIA (nota ocupando a tela, item a item: foto, revisão, confirmar)
   ===================================================================== */
function itemFeito(it){ return it.ignorar || it.revisao || (it.prod && it.conf); }
/* o que falta para liberar o CONFIRMAR */
function faltas(it){ var f=[]; if(it.ignorar) return f; if(!it.prod) f.push('produto'); if(it.foto&&!it.fotoEan){ it.fotoEan=it.foto; it.fotoVal=it.foto; } if(!it.fotoEan) f.push('foto do código de barras'); if(!it.fotoVal) f.push('foto da validade'); if(!it.validade) f.push('validade'); if(!it.rua||!it.pos) f.push('rua e posição'); return f; }

function conferencia(el, id){
  var n=LFI.nota(id); preparar(n); n=LFI.nota(id);
  document.body.classList.add('foco');
  n.itens.forEach(function(it){ var p=it.prod&&LFI.prod(it.prod); if(p&&p.end&&!it.realocar){ it.rua=p.end.rua; it.pos=p.end.pos; } });
  var f=LFI.forn(n.forn), e=LFI.emp(n.empresa), t=impNota(n);
  var tot=n.itens.length, conf=n.itens.filter(function(i){ return i.conf||i.ignorar; }).length, rev=n.itens.filter(function(i){ return i.revisao; }).length, feitos=conf+rev, pronto=feitos===tot;

  var h='<div class="cf-top"><button class="cf-x" data-act="_ir" data-id="notas" title="Fechar" aria-label="Fechar">✕</button>'+
    '<div class="cf-tit"><b>NF '+esc(n.numero)+' · '+esc(f.nome)+'</b><small>'+F.data(n.emissao)+' · '+F.moeda(n.valor)+' · '+esc(e.fantasia)+'</small></div>'+
    '<div class="cf-prog">'+UI.bar(feitos/tot, pronto?'ok':'')+'<small><b>'+conf+' de '+tot+'</b> conferidos'+(rev?' · <span style="color:#946C00">'+rev+' em revisão</span>':'')+'</small></div>'+
    '<div class="cf-acs"><button class="btn sec sm" data-act="det">Ver detalhes da nota</button><button class="btn '+(pronto?'ok':'sec')+'" data-act="prev"'+(pronto?'':' disabled')+'>'+UI.ic('check')+'Aprovar nota'+(rev&&pronto?' ('+rev+' em revisão)':'')+'</button></div></div>';

  var depOpts=LFI.db.departamentos.filter(function(d){ return d.empresa===n.empresa; });
  h+='<div class="cf-info"><div><span>Fornecedor</span><b>'+esc(f.nome)+'</b></div><div><span>Data</span><b>'+F.data(n.emissao)+'</b></div><div><span>Empresa</span><b>'+esc(e.fantasia)+'</b></div>'+
    '<div class="cf-dest"><span>Destino no estoque</span><div class="cf-destb">'+depOpts.map(function(d){ return '<button class="'+(d.id===n.dep?'on':'')+'" data-act="depb" data-id="'+d.id+'"><i style="background:'+d.cor+'"></i>'+esc(d.nome)+'</button>'; }).join('')+'</div></div>'+
    '<div><span>'+(n.oc&&LFI.ordem(n.oc)?'Pedido':'Valor da nota')+'</span><b>'+(n.oc&&LFI.ordem(n.oc)?esc(LFI.ordem(n.oc).num)+' · ':'')+F.moeda(n.valor)+'</b></div></div>';

  var AB=st().abre=st().abre||{}; if(!AB[n.id]||(AB[n.id]!=='-'&&!n.itens.some(function(x){ return x.id===AB[n.id]; }))){ AB[n.id]='-'; }
  var ruas={}; LFI.db.produtos.forEach(function(p){ if(p.end){ (ruas[p.end.rua]=ruas[p.end.rua]||{})[p.end.pos]=1; } }); n.itens.forEach(function(x){ if(x.rua&&x.pos) (ruas[x.rua]=ruas[x.rua]||{})[x.pos]=1; });
  h+='<datalist id="dl-rua">'+Object.keys(ruas).sort().map(function(r){ return '<option value="'+esc(r)+'">'; }).join('')+'</datalist>'+Object.keys(ruas).map(function(r){ return '<datalist id="dl-pos-'+esc(r)+'">'+Object.keys(ruas[r]).sort().map(function(p){ return '<option value="'+esc(p)+'">'; }).join('')+'</datalist>'; }).join('');
  h+='<div class="cf-itens">'+n.itens.map(function(it,i){ return AB[n.id]===it.id ? itemConf(n,it,i).replace('<div class="cf-l1">','<button class="cf-rec" data-act="abreIt" data-id="-" aria-label="Recolher">▲ Recolher</button><div class="cf-l1">') : itemResumo(n,it,i); }).join('')+'</div>';

  h+='<div class="card cf-imp"><h3><span class="lft">'+UI.ic('tributo')+' Impostos da nota</span><button class="btn sec sm" data-act="cred">Ver crédito tributário</button></h3>'+
    '<div class="cf-impg">'+[['ICMS',t.icms],['IPI',t.ipi],['PIS',t.pis],['COFINS',t.cofins],['ICMS-ST',t.st]].map(function(x){ return '<div><span>'+x[0]+'</span><b>'+F.moeda(x[1])+'</b></div>'; }).join('')+'<div class="tt"><span>Total destacado</span><b>'+F.moeda(t.total)+'</b></div></div>'+
    '<p class="cf-obs">Valores informados pelo fornecedor na nota.</p></div>';
  h+='<div class="cf-rod"><button class="btn gh sm" data-act="cancelar">'+UI.ic('x')+'Recusar nota</button></div>';
  el.innerHTML=h;

  function N(){ return LFI.nota(id); }
  function IT(iid){ var x=N(); for(var i=0;i<x.itens.length;i++) if(x.itens[i].id===iid) return x.itens[i]; return null; }
  function toca(){ var x=N(); if(x.status==='recebida') x.status='conferencia'; LFI.salvar(); LFI.recarregar(); }
  UI.liga(el, UI.navHandlers({
    prod:function(iid,ev){ var it=IT(iid), v=ev.target.value;
      if(v==='__novo'){ ev.target.value=it.prod||''; return novoProduto(N(), it); }
      if(v==='__ign'){ it.prod=null; it.ignorar=true; it.conf=true; it.revisao=null; return toca(); }
      it.ignorar=false; it.conf=false;
      if(!v){ it.prod=null; return toca(); }
      var p=LFI.prod(v), sg=(it.sugs||[]).filter(function(s){ return s.prod===v; })[0];
      it.prod=v; it.score=sg?sg.score:Math.round(LFI.similaridade(it.desc,p.nome)*100); it.manual=true; it.fator=fatorSugerido(it,p); it.eanAtualizar=false; toca(); },
    fator:function(iid,ev){ var it=IT(iid), v=UI.num(ev.target.value); if(!(v>0)){ UI.toast('Informe um número maior que zero','','wt'); LFI.recarregar(); return; } it.fator=r3(v); toca(); },
    val:function(iid,ev){ IT(iid).validade=ev.target.value||null; toca(); },
    ean:function(iid,ev){ var it=IT(iid); it.ean=ev.target.value.replace(/\D/g,'')||null; it.eanAtualizar=false; toca(); },
    eanAtu:function(iid){ var it=IT(iid); it.eanAtualizar=true; UI.toast('Código será atualizado no cadastro','Ao aprovar a nota','in'); toca(); },
    rua:function(iid,ev){ local(IT(iid),'rua',ev.target.value); },
    pos:function(iid,ev){ local(IT(iid),'pos',ev.target.value); },
    manter:function(iid){ var it=IT(iid), p=LFI.prod(it.prod); it.realocar=false; it.rua=p.end.rua; it.pos=p.end.pos; toca(); },
    realocar:function(iid){ var it=IT(iid); it.realocar=true; it.rua=''; it.pos=''; toca(); setTimeout(function(){ var i=document.querySelector('[data-chg=rua][data-id="'+iid+'"]'); if(i) i.focus(); },60); },
    foto:function(iid){ fotoItem(N(), IT(iid), toca); },
    verFoto:function(iid){ var it=IT(iid), fs=[['Código de barras',it.fotoEan],['Validade',it.fotoVal]].filter(function(x){ return x[1]; }); if(fs.length===2&&fs[0][1].img===fs[1][1].img) fs=[['Código e validade',fs[0][1]]];
      UI.modal({titulo:'Fotos do recebimento', sub:esc(it.desc), tam:'lg', corpo:'<div class="ft-grid'+(fs.length===1?' um':'')+'">'+fs.map(function(x){ return '<div class="ft-slot ok"><div class="ft-hd"><b>'+x[0]+'</b></div><img src="'+x[1].img+'" alt=""><div class="ft-lido">'+F.dataHora(x[1].em)+' · '+esc(x[1].por)+'</div></div>'; }).join('')+'</div>'}); },
    rev:function(iid){ revisaoItem(IT(iid), function(){ if(IT(iid).revisao) st().abre[id]='-'; toca(); }); },
    conf:function(iid){ var it=IT(iid), fl=faltas(it); if(fl.length){ UI.toast('Falta preencher: '+fl.join(', '),'','wt'); return; } it.conf=true; it.revisao=null; st().abre[id]='-'; toca(); },
    editar:function(iid){ IT(iid).conf=false; toca(); },
    notif:function(iid){ notificarForn(N(), IT(iid), toca); },
    det:function(){ detalhesNota(N()); },
    cred:function(){ creditoNota(N()); },
    dep:function(_,ev){ N().dep=ev.target.value; toca(); },
    depb:function(iid){ N().dep=iid; toca(); },
    abreIt:function(iid){ st().abre[id]=iid; LFI.recarregar(); var c=document.querySelector('[data-item="'+iid+'"] .cf-bt')||document.querySelector('[data-item="'+iid+'"]'); if(c) c.scrollIntoView({block:'center'}); },
    prev:function(){ previa(N().id); },
    cancelar:function(){ UI.confirmar('Recusar nota fiscal','A NF '+esc(n.numero)+' será marcada como <b>recusada</b> e não movimentará o estoque.','Recusar nota',function(){ var x=N(); x.status='cancelada'; LFI.atividade('nf','NF '+x.numero+' recusada na conferência',{tela:'notas',id:x.id}); LFI.salvar(); UI.toast('Nota recusada','NF '+x.numero,'wt'); LFI.ir('notas'); },'no'); }
  }));
  /* se o produto já tem lugar no estoque e o operador digita outro, pergunta: manter ou realocar */
  function local(it, campo, v){
    it[campo]=String(v||'').trim().toUpperCase(); if(campo==='pos'&&it.pos) it.pos=it.pos.padStart(2,'0');
    toca();
  }
}

/* item recolhido: só o essencial; toque para abrir */
function itemResumo(n, it, i){
  var p=it.prod&&LFI.prod(it.prod), ok=it.conf||it.ignorar, cls=it.revisao?'rev':ok?'ok':'';
  var st2=it.revisao?UI.badge('Em revisão','wt'):ok?UI.badge('Conferido','ok'):UI.badge('Conferir','nu');
  return '<button class="cf-res '+cls+'" data-act="abreIt" data-id="'+it.id+'" data-item="'+it.id+'"><span class="cf-n">'+(ok?'✓':it.revisao?'!':(i+1))+'</span>'+(p?UI.fotoProd(p,40):'')+
    '<span class="cf-rt"><b>'+esc(p?p.nome:it.desc)+'</b><small>'+(p?F.qtd(qtdBase(it),p.un):F.num(it.qtd)+' '+esc(it.un))+(it.rua&&it.pos?' · Rua '+esc(it.rua)+' · Pos. '+esc(it.pos):'')+(it.validade?' · val. '+F.dataC(it.validade):'')+'</small></span><span class="cf-tag">'+st2+'</span></button>';
}
function itemConf(n, it, i){
  var p=it.prod&&LFI.prod(it.prod), fl=faltas(it), trav=!!it.conf&&!it.ignorar, dis=trav?' disabled':'';
  var cls=it.revisao?'rev':(it.conf||it.ignorar)?'ok':'';
  var h='<div class="cf-it cf-aberto '+cls+'" data-item="'+it.id+'"><div class="cf-l1">';
  h+='<span class="cf-n">'+((it.conf||it.ignorar)?'✓':it.revisao?'!':(i+1))+'</span>';
  /* na nota */
  h+='<div class="cf-a"><span class="lb">Na nota</span><b class="ds">'+esc(it.desc)+'</b><div class="qv">'+F.num(it.qtd)+' '+esc(it.un)+' × '+F.moeda(it.vUn)+' = <b>'+F.moeda(it.vProd)+'</b></div>'+chipsImp(it)+'</div>';
  /* produto do cadastro */
  var sugs=(it.sugs||[]).filter(function(s){ return LFI.prod(s.prod); });
  var opts='<option value="">'+(sugs.length?'Selecione o produto…':'Nenhuma correspondência')+'</option>';
  if(sugs.length) opts+='<optgroup label="Sugestões">'+sugs.map(function(s){ return '<option value="'+s.prod+'"'+(s.prod===it.prod?' selected':'')+'>'+esc(LFI.prod(s.prod).nome)+' — '+s.score+'%</option>'; }).join('')+'</optgroup>';
  var naSug=sugs.some(function(s){ return s.prod===it.prod; });
  opts+=UI.selProdutos(naSug?null:it.prod).replace('<option value="">Selecione o produto…</option>','');
  opts+='<optgroup label="Outras ações"><option value="__novo">+ Cadastrar novo produto…</option><option value="__ign"'+(it.ignorar?' selected':'')+'>Não entra no estoque (uso e consumo)</option></optgroup>';
  h+='<div class="cf-b"><span class="lb">Produto no cadastro '+(p?(it.manual?UI.badge('Escolhido','in'):UI.match(it.score||0)):it.ignorar?'':UI.badge('Sem vínculo','no'))+'</span><div class="cf-psel">'+(p?UI.fotoProd(p,34):'')+'<select class="inp sm" data-chg="prod" data-id="'+it.id+'"'+dis+'>'+opts+'</select></div>'+
    (p?'<small>Estoque atual '+F.qtd(LFI.estoqueGeral(p),p.un)+'</small>':it.ignorar?'<small>Só vai para o financeiro.</small>':'<button class="btn sec xs" style="margin-top:6px" data-act="novo" data-id="'+it.id+'">'+UI.ic('mais')+'Cadastrar produto</button>')+'</div>';
  /* conversão e custo */
  if(p){
    var q=qtdBase(it), cu=custoUnit(it), vr=p.ultimoCusto?cu/p.ultimoCusto-1:0;
    h+='<div class="cf-c"><span class="lb">Entra no estoque</span><div class="fx">1 '+esc(it.un)+' = <input class="inp sm num" data-chg="fator" data-id="'+it.id+'" value="'+UI.numBR(it.fator||1)+'"'+dis+'> '+esc(p.un)+'</div><small>Total: <b>'+F.qtd(q,p.un)+'</b></small></div>';
    h+='<div class="cf-d"><span class="lb">Custo</span><div class="cu">'+F.moeda(cu)+'<small>/'+esc(p.un)+'</small> '+(Math.abs(vr)>0.0005?UI.variacao(cu,p.ultimoCusto,true):'')+'</div><small>Antes '+F.moeda(p.ultimoCusto)+'</small>'+(Math.abs(vr)>0.15?'<small style="color:var(--red);font-weight:800">Subiu mais de 15%: confira a conversão</small>':'')+'</div>';
  } else h+='<div class="cf-c"></div><div class="cf-d"></div>';
  h+='</div>';
  if(it.ignorar) return h+'</div>';

  /* linha 2: validade, código de barras, local e botões */
  var eanSt='';
  if(p&&it.ean){ eanSt = (!p.ean||it.ean===p.ean) ? '<small class="cf-ok">✓ Código confere com o cadastro</small>'
      : it.eanAtualizar ? '<small class="cf-in">Será atualizado no cadastro ao aprovar</small>'
      : '<small class="cf-wt">⚠ Diferente do cadastro ('+esc(p.ean)+') <a class="vertodos" data-act="eanAtu" data-id="'+it.id+'">Atualizar cadastro</a></small>'; }
  else eanSt='<small>Leia pela foto ou digite</small>';
  var fixo=p&&p.end&&!it.realocar, locSug='';
  if(fixo) locSug='<small class="cf-ok">✓ Local atual do produto</small>';
  else if(p&&p.end) locSug='<small class="cf-in">Novo local · antes '+LFI.textoEnd(p.end)+'</small>';
  else if(p) locSug='<small>Produto ainda sem local: informe Rua e Posição</small>';
  h+='<div class="cf-l2">'+
    '<div class="cf-f"><span class="lb">Validade *</span><input type="date" class="inp sm" data-chg="val" data-id="'+it.id+'" value="'+(it.validade||'')+'"'+dis+'></div>'+
    '<div class="cf-f cf-ean"><span class="lb">Código de barras</span><input class="inp sm mono" inputmode="numeric" data-chg="ean" data-id="'+it.id+'" value="'+esc(it.ean||'')+'" placeholder="0000000000000"'+dis+'>'+eanSt+'</div>'+
    '<div class="cf-f cf-loc"><span class="lb">Local no estoque *</span><div class="cf-rp"><input class="inp sm" list="dl-rua" data-chg="rua" data-id="'+it.id+'" value="'+esc(it.rua||'')+'" placeholder="Rua"><input class="inp sm" list="dl-pos-'+esc(it.rua||'')+'" data-chg="pos" data-id="'+it.id+'" value="'+esc(it.pos||'')+'" placeholder="Posição"></div>'+locSug+'</div>'+
    '<div class="cf-bt">'+
      (it.fotoEan?'<button class="cf-th" data-act="verFoto" data-id="'+it.id+'" style="background-image:url('+it.fotoEan.img+')" title="Ver fotos"></button>':'')+
      (trav ? '<button class="btn sec" data-act="editar" data-id="'+it.id+'">'+UI.ic('editar')+'Editar</button><span class="btn ok cf-okst">'+UI.ic('check')+'Confirmado</span>' :
      (p&&p.end?(it.realocar?'<button class="btn sec" data-act="manter" data-id="'+it.id+'">'+UI.ic('voltar')+'Manter local</button>':'<button class="btn sec" data-act="realocar" data-id="'+it.id+'">'+UI.ic('estoque')+'Trocar localização</button>'):'')+
      '<button class="btn '+(fotosOk(it)?'sec':'esc')+'" data-act="foto" data-id="'+it.id+'"'+(p?'':' disabled')+'>'+UI.ic('foto')+(fotosOk(it)?'Fotos ✓':(it.fotoEan||it.fotoVal?'Fotos 1/2':'Fotos'))+'</button>'+
      '<button class="btn '+(it.revisao?'wtb':'sec')+'" data-act="rev" data-id="'+it.id+'">'+UI.ic('alerta')+'Revisão</button>'+
      '<button class="btn pri" data-act="conf" data-id="'+it.id+'"'+(fl.length?' disabled title="Falta: '+fl.join(', ')+'"':'')+'>'+UI.ic('check')+'Confirmar</button>')+
    '</div></div>';
  if(it.revisao){ var nts=it.revisao.notif||[], ult=nts[nts.length-1];
    h+='<div class="cf-revtx">'+UI.ic('alerta')+'<div style="flex:1;min-width:0"><b>Em revisão: '+esc(it.revisao.motivo)+'</b>'+(it.revisao.obs?' · '+esc(it.revisao.obs):'')+'<small>Este item não entra no estoque até ser resolvido. Os outros itens podem ser aprovados normalmente.</small>'+
      (ult?'<small style="color:#166534!important;font-weight:700!important">✓ Fornecedor notificado por '+ult.canais.join(' e ')+' · '+F.dataHora(ult.em)+'</small>':'')+'</div>'+
      '<button class="btn sec sm" data-act="notif" data-id="'+it.id+'">'+UI.ic('enviar')+(ult?'Notificar de novo':'Notificar fornecedor')+'</button></div>'; }
  else if(fl.length&&!it.conf) h+='<div class="cf-falta">Para confirmar falta: <b>'+fl.join(', ')+'</b></div>';
  return h+'</div>';
}

/* fotos do item: 1) código de barras e 2) validade (ou uma só, quando estão na mesma etiqueta) */
function fotosOk(it){ return !!(it.fotoEan && it.fotoVal); }
function fotoItem(n, it, depois){
  var p=LFI.prod(it.prod), r=leitura(p);
  var st={ean:it.fotoEan||null, val:it.fotoVal||null, mesma:!!(it.fotoEan&&it.fotoVal&&it.fotoEan.img===it.fotoVal.img)};
  var m=UI.modal({titulo:'Fotos do item', sub:esc(p.nome), tam:'lg', corpo:'', botoes:''});
  function slot(k, tit, dica){
    var f=st[k];
    return '<div class="ft-slot'+(f?' ok':'')+'"><div class="ft-hd"><b>'+tit+'</b>'+(f?'<span class="badge b-ok"><i></i>Feita</span>':'')+'</div>'+
      (f?'<img src="'+f.img+'" alt="'+tit+'"><div class="ft-lido">'+(k==='ean'?'Código lido: <b class="mono">'+r.ean+'</b>':'Validade lida: <b>'+F.data(r.validade)+'</b>')+'</div>'
        :'<label class="drop ft-drop"><div class="ic">'+UI.ic('foto')+'</div><b>Tirar foto</b><small>'+dica+'</small><input type="file" accept="image/*" capture="environment" data-k="'+k+'"></label>')+
      '<div class="ft-acs">'+(f?'<button class="btn sec sm" data-act="refaz" data-id="'+k+'">'+UI.ic('foto')+'Refazer</button>':'<button class="btn gh sm" data-act="ex" data-id="'+k+'">Usar foto de exemplo</button>')+'</div></div>';
  }
  function des(){
    var h='<label class="chk" style="margin-bottom:12px"><input type="checkbox" data-chg="mesma"'+(st.mesma?' checked':'')+'> O código de barras e a validade estão na mesma etiqueta (uma foto só)</label>';
    h+= st.mesma ? '<div class="ft-grid um">'+slot('ean','Etiqueta (código e validade)','Enquadre o código de barras e a validade')+'</div>'
                 : '<div class="ft-grid">'+slot('ean','1. Código de barras','Enquadre o código de barras')+slot('val','2. Validade','Enquadre a data de validade')+'</div>';
    if(st.ean&&p.ean&&r.ean!==p.ean) h+=UI.nota('<b>Código diferente do cadastro.</b> No cadastro está '+p.ean+'. Na conferência você escolhe se atualiza.','wt','alerta');
    h+='<p class="cf-obs">As fotos ficam guardadas como comprovante do recebimento. Nesta demonstração a leitura é simulada.</p>';
    m.corpoHTML(h);
    var pronto = st.mesma ? !!st.ean : !!(st.ean&&st.val);
    m.rodapeHTML('<button class="btn sec" data-act="_fechar">Cancelar</button><button class="btn pri" data-act="ok"'+(pronto?'':' disabled')+'>'+UI.ic('check')+'Salvar fotos</button>');
    UI.els('input[type=file][data-k]', m.corpo).forEach(function(inp){ inp.addEventListener('change',function(){ var a=inp.files&&inp.files[0]; if(!a) return; var k=inp.getAttribute('data-k'), rd=new FileReader(); rd.onload=function(){ reduz(rd.result, function(img){ st[k]=reg(img); des(); }); }; rd.readAsDataURL(a); }); });
  }
  function reg(img){ return {img:img, em:LFI.agoraISO(), por:LFI.usuario().nome}; }
  UI.liga(m.el,{
    mesma:function(_,ev){ st.mesma=ev.target.checked; if(st.mesma) st.val=null; des(); },
    ex:function(k){ st[k]=reg(etiqueta(p, r.validade, r.ean, st.mesma?'ambos':k)); des(); },
    refaz:function(k){ st[k]=null; des(); },
    ok:function(){ it.fotoEan=st.ean; it.fotoVal=st.mesma?st.ean:st.val; delete it.foto;
      if(!it.validade) it.validade=r.validade; if(!it.ean){ it.ean=r.ean; it.eanAtualizar=false; }
      m.fechar(); UI.toast('Fotos registradas', p.nome); depois(); }
  });
  des();
}
/* leitura simulada da etiqueta: validade conforme o tipo de produto; o cream cheese veio com embalagem nova (código mudou) */
function leitura(p){
  var dias={pes:4,hor:6,lat:20,car:7,aca:2}[p.cat]||180, d=LFI.dataUtil.D(dias);
  var ean = p.id==='p14' ? LFI.ean13('789'+String(55120000+7).slice(-9)) : (p.ean||LFI.ean13('789000'+String(Date.now()).slice(-6)));
  return {validade:d, ean:ean};
}
function reduz(src, cb, max){ var im=new Image(); im.onload=function(){ var k=Math.min(1,(max||520)/Math.max(im.width,im.height)), c=document.createElement('canvas'); c.width=Math.round(im.width*k); c.height=Math.round(im.height*k); c.getContext('2d').drawImage(im,0,0,c.width,c.height); cb(c.toDataURL('image/jpeg',0.7)); }; im.onerror=function(){ cb(src); }; im.src=src; }
/* etiqueta de exemplo: só código de barras, só validade, ou as duas */
function etiqueta(p, val, ean, modo){
  var c=document.createElement('canvas'); c.width=480; c.height=300; var x=c.getContext('2d');
  x.fillStyle=modo==='val'?'#5B4A3A':'#8B7355'; x.fillRect(0,0,480,300); x.fillStyle='#FFFDF6'; x.save(); x.translate(240,150); x.rotate(modo==='val'?0.04:-0.03); x.fillRect(-200,-115,400,230);
  x.fillStyle='#1C1C1E'; x.font='800 20px Manrope, Arial'; x.fillText(p.nome.toUpperCase().slice(0,28),-180,-78);
  if(modo!=='ean'){ x.font='800 30px monospace'; x.fillText('VAL '+F.data(val),-180,-25); x.font='700 16px monospace'; x.fillText('FAB '+F.data(LFI.hoje())+'   LOTE '+String(Date.now()).slice(-5),-180,5); }
  if(modo!=='val'){ var s=String(ean), y0=modo==='ean'?-45:25, hh=modo==='ean'?110:55, bx=-170; for(var i=0;i<95;i++){ if(((+s[i%13]+i)%3===0)||i%7===0||i<3||i>91||(i>45&&i<49)) x.fillRect(bx+i*3.5,y0,i%5===0?3:2,hh); } x.font='700 17px monospace'; x.fillText(s,-110,y0+hh+20); }
  x.restore(); return c.toDataURL('image/jpeg',0.72);
}
/* fotos da nota (uma ou mais páginas) */
var PAGINAS=null;
function fotosNota(arqs){
  var pags=[];
  var m=UI.modal({titulo:'Fotos da nota fiscal', sub:'Fotografe todas as páginas da nota', tam:'lg', fixo:true, corpo:'', botoes:''});
  function des(){
    m.corpoHTML('<div class="ft-pags">'+pags.map(function(src,i){ return '<div class="ft-pag"><img src="'+src+'" alt="Página '+(i+1)+'"><span>Página '+(i+1)+'</span><button class="cf-x" data-act="tira" data-id="'+i+'" aria-label="Remover página">✕</button></div>'; }).join('')+
      '<label class="drop ft-mais"><div class="ic">'+UI.ic('mais')+'</div><b>'+(pags.length?'Adicionar página':'Tirar foto da nota')+'</b><small>No celular abre a câmera</small><input type="file" accept="image/*" capture="environment" multiple id="ft-pg"></label></div>'+
      (pags.length?'':'<div style="text-align:center;margin-top:10px"><button class="btn gh sm" data-act="ex">Usar fotos de exemplo (2 páginas)</button></div>'));
    m.rodapeHTML('<button class="btn sec" data-act="_fechar">Cancelar</button><button class="btn pri" data-act="ler"'+(pags.length?'':' disabled')+'>'+UI.ic('ia')+'Ler nota'+(pags.length?' ('+pags.length+(pags.length===1?' página':' páginas')+')':'')+'</button>');
    var inp=m.corpo.querySelector('#ft-pg'); inp.addEventListener('change',function(){ add(Array.prototype.slice.call(inp.files||[])); });
  }
  function add(fs){ var falta=fs.length; if(!falta) return; fs.forEach(function(a){ var rd=new FileReader(); rd.onload=function(){ reduz(rd.result,function(img){ pags.push(img); if(--falta===0) des(); },900); }; rd.readAsDataURL(a); }); }
  UI.liga(m.el,{tira:function(i){ pags.splice(+i,1); des(); }, ex:function(){ pags=[paginaEx(1),paginaEx(2)]; des(); },
    ler:function(){ PAGINAS=pags.slice(); m.fechar(); ler({name:'foto_nota_'+pags.length+'pag.jpg', type:'image/jpeg', size:pags.join('').length*0.75}); }});
  des(); if(arqs&&arqs.length) add(arqs);
}
function paginaEx(n){
  var c=document.createElement('canvas'); c.width=420; c.height=560; var x=c.getContext('2d');
  x.fillStyle='#6E6253'; x.fillRect(0,0,420,560); x.save(); x.translate(210,280); x.rotate(n===1?-0.02:0.025); x.fillStyle='#FFFFFF'; x.fillRect(-180,-250,360,500);
  x.strokeStyle='#1C1C1E'; x.lineWidth=1.2; x.strokeRect(-168,-238,336,476); x.fillStyle='#1C1C1E'; x.font='800 18px Arial'; x.fillText('DANFE',-30,-210); x.font='600 10px Arial'; x.fillText('Página '+n+' de 2',90,-212);
  for(var i=0;i<(n===1?18:9);i++){ x.fillStyle=i%2?'#E8E8EB':'#F3F3F5'; x.fillRect(-160,-180+i*22,320,18); x.fillStyle='#8E8E93'; x.fillRect(-152,-175+i*22,120,6); x.fillRect(60,-175+i*22,80,6); }
  x.restore(); return c.toDataURL('image/jpeg',0.7);
}
function revisaoItem(it, depois){
  var mot=['Produto avariado ou amassado','Quantidade diferente da nota','Produto diferente do pedido','Validade muito curta','Temperatura fora do ideal','Outro motivo'];
  var atual=it.revisao||{};
  var m=UI.modal({titulo:'Enviar item para revisão', sub:esc(it.desc), tam:'sm', corpo:
    '<div class="field"><label>Motivo</label><select class="inp" id="rv-m">'+mot.map(function(x){ return '<option'+(x===atual.motivo?' selected':'')+'>'+x+'</option>'; }).join('')+'</select></div>'+
    '<div class="field"><label>Observação</label><textarea class="inp" id="rv-o" placeholder="Ex.: faltou 1 saco, embalagem rasgada">'+esc(atual.obs||'')+'</textarea></div>'+
    UI.nota('O item fica fora do estoque até ser resolvido. Os outros itens podem ser aprovados.','in'),
    botoes:(it.revisao?'<button class="btn sec esq" data-act="tirar">Tirar da revisão</button>':'')+'<button class="btn sec" data-act="_fechar">Cancelar</button><button class="btn pri" data-act="ok">Marcar para revisão</button>',
    acoes:{ok:function(){ it.revisao={motivo:m.el.querySelector('#rv-m').value, obs:m.el.querySelector('#rv-o').value.trim(), em:LFI.agoraISO(), por:LFI.usuario().nome}; it.conf=false; m.fechar(); UI.toast('Item enviado para revisão', it.revisao.motivo,'wt'); depois(); var nn=LFI.db.notas.filter(function(x){ return x.itens.some(function(y){ return y.id===it.id; }); })[0]; if(nn) notificarForn(nn, it, depois); },
      tirar:function(){ it.revisao=null; m.fechar(); depois(); }}});
}

/* avisa o fornecedor sobre avaria ou divergência (WhatsApp e/ou e-mail; envio simulado nesta fase) */
function notificarForn(n, it, depois){
  var f=LFI.forn(n.forn), e=LFI.emp(n.empresa), p=it.prod&&LFI.prod(it.prod), r=it.revisao||{};
  var nome=p?p.nome:it.desc, fotos=[it.fotoEan,it.fotoVal].filter(Boolean).filter(function(x,i,a){ return a.indexOf(x)===i; });
  var txt='Olá, '+f.contato.split(' ')[0]+'! Aqui é da '+e.fantasia+'.\n\nNo recebimento da NF '+n.numero+' encontramos um problema:\n\n• Produto: '+nome+' ('+F.num(it.qtd)+' '+it.un+')\n• Problema: '+(r.motivo||'')+(r.obs?'\n• Detalhe: '+r.obs:'')+'\n\n'+(fotos.length?'Seguem as fotos do recebimento.\n\n':'')+'Por favor, nos retorne sobre a troca, reposição ou abatimento.\n\nObrigado,\n'+LFI.usuario().nome;
  var cfg=LFI.db.notifCfg=LFI.db.notifCfg||{whats:true, email:false};
  var m=UI.modal({titulo:'Notificar fornecedor', sub:esc(f.nome)+' · NF '+esc(n.numero), tam:'lg', corpo:
    '<div class="field"><label>Enviar por</label><div class="nt-can">'+
      '<label class="nt-op"><input type="checkbox" id="nt-w"'+(cfg.whats?' checked':'')+'><span>'+UI.ic('whats')+'<b>WhatsApp</b><small>'+esc(f.whats)+'</small></span></label>'+
      '<label class="nt-op"><input type="checkbox" id="nt-e"'+(cfg.email?' checked':'')+'><span>'+UI.ic('enviar')+'<b>E-mail</b><small>'+esc(f.email)+'</small></span></label></div></div>'+
    '<div class="field"><label>Mensagem</label><textarea class="inp" id="nt-t" style="min-height:220px">'+esc(txt)+'</textarea></div>'+
    '<div class="nt-bloco"><div class="nt-tit">Fotos anexadas</div><div class="nt-fotos" id="nt-fotos"></div></div>'+
    '<p class="cf-obs">Nesta demonstração o envio é simulado: nada sai do sistema.</p>',
    botoes:'<button class="btn sec" data-act="_fechar">Agora não</button><button class="btn pri" data-act="env">'+UI.ic('enviar')+'Enviar</button>',
    acoes:{env:function(){
      var w=m.el.querySelector('#nt-w').checked, em=m.el.querySelector('#nt-e').checked; if(!w&&!em){ UI.toast('Escolha WhatsApp, e-mail ou os dois','','wt'); return; }
      cfg.whats=w; cfg.email=em; var can=[]; if(w) can.push('WhatsApp'); if(em) can.push('e-mail');
      var x=LFI.nota(n.id), alvo=x.itens.filter(function(y){ return y.id===it.id; })[0]||it;
      alvo.revisao=alvo.revisao||{}; alvo.revisao.fotosAvaria=avarias.slice(); (alvo.revisao.notif=alvo.revisao.notif||[]).push({em:LFI.agoraISO(), canais:can, por:LFI.usuario().nome, msg:m.el.querySelector('#nt-t').value, fotos:fotos.length+avarias.length});
      LFI.atividade('nf','Fornecedor '+f.nome+' notificado ('+can.join(' e ')+'): '+nome+' · NF '+n.numero,{tela:'notas',id:n.id});
      m.fechar(); UI.toast('Fornecedor notificado', f.nome+' por '+can.join(' e ')); depois(); },
      exAv:function(){ avarias.push({img:fotoAvariaEx(nome), em:LFI.agoraISO(), por:LFI.usuario().nome}); desFotos(); },
      tiraAv:function(i){ avarias.splice(+i,1); desFotos(); }}});
  var avarias=((it.revisao&&it.revisao.fotosAvaria)||[]).slice();
  function desFotos(){
    var box=m.el.querySelector('#nt-fotos');
    box.innerHTML=fotos.map(function(x){ return '<div class="nt-ft"><img src="'+x.img+'" alt=""><small>Recebimento</small></div>'; }).join('')+
      avarias.map(function(x,i){ return '<div class="nt-ft av"><img src="'+x.img+'" alt=""><small>Avaria</small><button class="cf-x" data-act="tiraAv" data-id="'+i+'" aria-label="Remover foto">✕</button></div>'; }).join('')+
      '<div class="nt-ft"><label class="nt-add">'+UI.ic('foto')+'<b>Foto da avaria</b><input type="file" accept="image/*" capture="environment" multiple id="nt-av"></label><a class="vertodos nt-ex" data-act="exAv">usar exemplo</a></div>';
    var inp=box.querySelector('#nt-av'); inp.addEventListener('change',function(){ Array.prototype.slice.call(inp.files||[]).forEach(function(a){ var rd=new FileReader(); rd.onload=function(){ reduz(rd.result,function(img){ avarias.push({img:img, em:LFI.agoraISO(), por:LFI.usuario().nome}); desFotos(); },800); }; rd.readAsDataURL(a); }); });
  }
  desFotos();
}
/* foto de exemplo de uma embalagem avariada */
function fotoAvariaEx(nome){
  var c=document.createElement('canvas'); c.width=480; c.height=360; var x=c.getContext('2d');
  x.fillStyle='#6B5E50'; x.fillRect(0,0,480,360); x.save(); x.translate(240,190); x.rotate(-0.06);
  x.fillStyle='#E9E4D8'; x.fillRect(-150,-110,300,220); x.fillStyle='#D8D1C0'; x.fillRect(-150,-110,300,40);
  x.fillStyle='#1C1C1E'; x.font='800 18px Arial'; x.fillText(String(nome).toUpperCase().slice(0,22),-135,-60);
  x.strokeStyle='#5A3A1E'; x.lineWidth=5; x.beginPath(); x.moveTo(40,-110); x.lineTo(70,-40); x.lineTo(45,10); x.lineTo(95,70); x.lineTo(80,110); x.stroke();
  x.fillStyle='rgba(120,70,30,.35)'; x.beginPath(); x.ellipse(-60,60,70,30,0.2,0,Math.PI*2); x.fill();
  x.restore(); x.fillStyle='#DC2626'; x.font='800 16px Arial'; x.fillText('AVARIA',20,340);
  return c.toDataURL('image/jpeg',0.72);
}
function detalhesNota(n){
  var f=LFI.forn(n.forn), e=LFI.emp(n.empresa), oc=n.oc&&LFI.ordem(n.oc);
  var m=UI.modal({titulo:'Detalhes da nota', sub:'NF '+esc(n.numero), tam:'lg', corpo:
    '<div class="kv c3"><div><span>Fornecedor</span><b>'+esc(f.razao)+'</b><small class="mono">CNPJ '+f.cnpj+'</small></div><div><span>Número / série</span><b>'+esc(n.numero)+' / '+esc(n.serie)+'</b></div><div><span>Emissão</span><b>'+F.data(n.emissao)+'</b></div>'+
    '<div><span>Destinatário</span><b>'+esc(e.razao)+'</b><small class="mono">CNPJ '+e.cnpj+'</small></div><div><span>Natureza da operação</span><b style="white-space:normal">'+esc(n.natOp)+'</b></div><div><span>Ordem de compra</span><b>'+(oc?esc(oc.num):'—')+'</b></div>'+
    '<div style="grid-column:1/-1"><span>Chave de acesso</span><b class="mono" style="white-space:normal;font-size:12.5px">'+fmtChave(n.chave)+'</b></div><div style="grid-column:1/-1"><span>Arquivo</span><b style="white-space:normal;font-size:12.5px">'+esc(n.arquivo||'')+'</b></div></div>',
    botoes:'<button class="btn sec" data-act="xml">'+UI.ic('baixar')+'Baixar XML</button><button class="btn pri" data-act="_fechar">Fechar</button>', acoes:{xml:function(){ baixarXML(n); }}});
}
function creditoNota(n){
  var emp=LFI.emp(n.empresa), cred=0, ls=n.itens.map(function(it){ var c=credItem(it,n), p=it.prod&&LFI.prod(it.prod); if(!it.ignorar) cred+=c.v; return {it:it,p:p,c:c}; });
  UI.modal({titulo:'Crédito tributário', sub:'Parte do imposto da nota que pode ser descontada depois', corpo:
    '<div class="kpi" style="margin-bottom:12px"><div class="lb">Crédito possível nesta nota</div><div class="vl" style="color:var(--green)">'+F.moeda(cred)+'</div><div class="dl">'+esc(emp.fantasia)+' · '+esc(emp.regime)+'</div></div>'+
    '<div class="lst">'+ls.map(function(l){ var rg=l.c.regra, b; if(l.it.ignorar) b=UI.badge('Uso e consumo','nu'); else if(!l.p) b=UI.badge('Sem produto','no'); else if(!rg) b=UI.badge('Sem regra','nu'); else if(rg.status!=='validada') b=UI.status('trib',rg.status); else if(!rg.creditavel) b=UI.badge('Não gera crédito','nu'); else b='<b style="color:var(--green)">'+F.moeda(l.c.v)+'</b>';
      return '<div class="li"><div class="gr"><div class="tt">'+esc(l.p?l.p.nome:l.it.desc)+'</div></div><div class="rt">'+b+'</div></div>'; }).join('')+'</div>'+
    UI.nota('Só conta crédito quando o contador validou a regra do produto. As regras ficam no módulo Tributário.','in')});
}

function chipsImp(it){
  function c(rot, v, p){ return '<span class="'+(v?'on':'')+'" title="'+rot+(p?' '+F.pctN(p,2):'')+'">'+rot+(v?' '+F.moeda(v):' —')+'</span>'; }
  return '<div class="tx">'+c('ICMS'+(it.icms.p?' '+F.num(it.icms.p,2)+'%':''), it.icms.v)+c('IPI', it.ipi.v)+c('PIS', it.pis.v)+c('COFINS', it.cofins.v)+c('ST', it.st.v)+'</div>';
}
function comparaOC(n, oc){
  var rows=[], usados={};
  n.itens.forEach(function(it){ if(!it.prod) return; var x=oc.itens.filter(function(o){ return o.prod===it.prod; })[0], p=LFI.prod(it.prod), q=qtdBase(it), pu=q?r2(it.vProd/q):0;
    if(x){ usados[x.prod]=1; var pend=r3(x.qtd-x.recebido), dq=r3(q-pend), dp=x.preco?pu/x.preco-1:0; rows.push({p:p, ped:pend, fat:q, pOc:x.preco, pNf:pu, dq:dq, dp:dp}); }
    else rows.push({p:p, ped:null, fat:q, pOc:null, pNf:pu}); });
  oc.itens.forEach(function(x){ if(!usados[x.prod]&&x.qtd-x.recebido>0.001) rows.push({p:LFI.prod(x.prod), ped:r3(x.qtd-x.recebido), fat:0, pOc:x.preco, pNf:null, faltou:true}); });
  var div=rows.filter(function(r){ return r.ped==null||r.faltou||Math.abs(r.dq)>0.001||Math.abs(r.dp)>0.005; }).length;
  var h='<div class="tb-wrap"><table class="tb cp"><thead><tr><th>Produto</th><th class="r">Pedido</th><th class="r">Faturado</th><th class="r">Preço OC</th><th class="r">Preço NF</th><th>Situação</th></tr></thead><tbody>'+
    rows.map(function(r){ var s;
      if(r.ped==null) s=UI.badge('Fora da OC','wt'); else if(r.faltou) s=UI.badge('Não faturado','no');
      else { var b=[]; if(Math.abs(r.dq)>0.001) b.push(UI.badge((r.dq>0?'+':'')+F.qtd(r.dq,r.p.un),'wt')); if(Math.abs(r.dp)>0.005) b.push(UI.badge('Preço '+(r.dp>0?'+':'−')+F.pct(Math.abs(r.dp)), r.dp>0?'no':'ok')); s=b.length?b.join(' '):UI.badge('Conforme','ok'); }
      return '<tr><td><b>'+esc(r.p.nome)+'</b></td><td class="r">'+(r.ped==null?'—':F.qtd(r.ped,r.p.un))+'</td><td class="r">'+F.qtd(r.fat,r.p.un)+'</td><td class="r">'+(r.pOc==null?'—':F.moeda(r.pOc))+'</td><td class="r">'+(r.pNf==null?'—':F.moeda(r.pNf))+'</td><td>'+s+'</td></tr>'; }).join('')+
    '</tbody></table></div>';
  h+= div ? UI.nota('<b>'+div+' divergência(s)</b> entre o pedido e o faturado. Confira com o recebimento físico antes de aprovar; a OC ficará como entrega parcial se faltar quantidade.','wt','alerta')
          : UI.nota('Quantidades e preços <b>conferem com a ordem de compra</b>. Itens ainda sem vínculo de produto aparecem aqui após a correspondência.','ok','check');
  h+='<div class="kv c3" style="margin-top:4px"><div><span>Fornecedor</span><b>'+esc(LFI.forn(oc.forn).nome)+'</b></div><div><span>Emitida em</span><b>'+F.data(oc.emissao)+'</b></div><div><span>Total da OC</span><b>'+F.moeda(LFI.totalOrdem(oc))+'</b></div></div>';
  return h;
}

function vincularOC(n){
  var ocs=LFI.db.ordens.filter(function(o){ return o.forn===n.forn&&['enviada','aguardando_entrega','parcial','aprovada'].indexOf(o.status)>=0; });
  var m=UI.modal({titulo:'Vincular a uma ordem de compra', sub:'Ordens em aberto de '+esc(LFI.forn(n.forn).nome), corpo: ocs.length? '<div class="lst">'+ocs.map(function(o){ return '<div class="li cl" data-act="v" data-id="'+o.id+'"><span class="av">'+UI.ic('ordem')+'</span><div class="gr"><div class="tt">'+esc(o.num)+'</div><div class="dd">'+o.itens.length+' itens · emitida '+F.data(o.emissao)+'</div></div><div class="rt">'+F.moeda(LFI.totalOrdem(o))+'<small>'+LFI.STATUS.oc[o.status][0]+'</small></div></div>'; }).join('')+'</div>' : UI.vazio('Não há ordens em aberto para este fornecedor.','📄'),
    acoes:{v:function(id){ n.oc=id; if(n.status==='recebida') n.status='conferencia'; LFI.salvar(); m.fechar(); UI.toast('Nota vinculada', LFI.ordem(id).num); LFI.recarregar(); }}});
}

/* cadastro rápido de produto a partir do item da nota */
function novoProduto(n, it){
  var mt=it.desc.match(/(\d+(?:[,.]\d+)?)\s*(KG|L|LT|G|ML)\b/i), base='un', fat=1;
  if(mt){ var v=parseFloat(mt[1].replace(',','.')), u=mt[2].toUpperCase(); base=(u==='KG'||u==='G')?'kg':'L'; fat=(u==='G'||u==='ML')?v/1000:v; }
  else if(/^(KG)$/i.test(it.un)){ base='kg'; } else if(/^(L|LT)$/i.test(it.un)){ base='L'; }
  var nome=it.desc.replace(/\s*\d+(?:[,.]\d+)?\s*(KG|L|LT|G|ML)\b/ig,'').replace(/\b(CX|FD|PC|GL|SC|BD)\s*\d+\b/ig,'').replace(/\s+/g,' ').trim().toLowerCase().replace(/(^|\s)\S/g,function(c){ return c.toUpperCase(); }).replace(/\b(De|Da|Do|Com|C\/)\b/g,function(c){ return c.toLowerCase(); });
  var f=LFI.forn(n.forn), cat=(f.cats||[])[0]||'mer';
  var o={nome:nome, cat:cat, un:base, ncm:it.ncm, conv:{un:it.un+(fat!==1?' '+F.num(fat)+' '+base:''), fator:fat}, forn:n.forn, custo:r2((it.vProd+it.ipi.v+it.st.v)/(it.qtd*fat)), apelido:it.desc};
  if(LFI.formProduto) return LFI.formProduto(o, function(p){ vincula(p); });
  /* contingência (tela de estoque indisponível): cadastro mínimo */
  var p={id:LFI.novoId('p'), nome:o.nome, cat:o.cat, un:o.un, custoMedio:o.custo, ultimoCusto:o.custo, estMin:0, ncm:o.ncm, cest:'', forn:o.forn, fornAlt:[], local:'Despensa seca A', validade:null, conv:o.conv, est:{cen:0,pad:0,res:0,sus:0}, apelidos:[o.apelido], ultMov:LFI.hoje(), tipo:'insumo', contado:null, hist:[]};
  LFI.db.produtos.push(p); vincula(p);
  function vincula(p){ var x=LFI.nota(n.id); x.itens.forEach(function(i){ if(i.id===it.id){ i.prod=p.id; i.score=100; i.fator=o.conv.fator; i.conf=true; i.manual=true; i.ignorar=false; } }); if(x.status==='recebida') x.status='conferencia'; LFI.salvar(); UI.toast('Produto cadastrado e vinculado', p.nome); LFI.recarregar(); }
}

/* ---------- pré-visualização (simulação exata com LFI.lancarNota em uma cópia da base) ---------- */
function simular(id){
  var copia=JSON.stringify(LFI.db), sv=LFI.salvar, out=null;
  LFI.salvar=function(){};
  try{
    var r=LFI.lancarNota(id);
    if(r) out={itens:r.itens.map(function(x){ return {id:x.prod.id, nome:x.prod.nome, un:x.prod.un, qtd:x.qtd, custoUn:x.custoUn, custoAnt:x.custoAnt, custoNovo:x.custoNovo, ultimoAnt:x.ultimoAnt, estAntes:r3(LFI.estoqueGeral(x.prod)-x.qtd), recs:LFI.receitasComProduto(x.prod.id).length}; }),
      receitas:r.receitas.map(function(x){ return {id:x.rec.id, nome:x.rec.nome, dep:x.rec.dep, antes:x.antes, depois:x.depois, precoAntes:x.precoAntes, precoDepois:x.precoDepois, preco:x.rec.preco}; }),
      cp:r.cp?{venc:r.cp.venc, valor:r.cp.valor, forn:r.cp.forn}:null, oc:r.oc?{id:r.oc.id, num:r.oc.num, status:r.oc.status}:null};
  }catch(e){ console.error(e); }
  finally{ LFI.db=JSON.parse(copia); LFI.salvar=sv; }
  return out;
}
function tabEntradas(itens, dep){
  return '<div class="tb-wrap"><table class="tb cp"><thead><tr><th>Produto</th><th>Destino</th><th class="r">Entrada</th><th class="r">Custo da nota</th><th class="r">Custo médio</th><th class="r">Variação</th><th class="r">Receitas</th></tr></thead><tbody>'+
    itens.map(function(x){ return '<tr><td><b>'+esc(x.nome)+'</b><small>Estoque '+F.qtd(x.estAntes,x.un)+' → '+F.qtd(r3(x.estAntes+x.qtd),x.un)+'</small></td><td>'+UI.dep(dep)+'</td><td class="r">+'+F.qtd(x.qtd,x.un)+'</td><td class="r">'+F.moeda(x.custoUn)+'<small>último '+F.moeda(x.ultimoAnt)+'</small></td><td class="r">'+F.moeda(x.custoAnt)+' → <b>'+F.moeda(x.custoNovo)+'</b></td><td class="r">'+UI.variacao(x.custoNovo,x.custoAnt,true)+'</td><td class="r">'+(x.recs||'—')+'</td></tr>'; }).join('')+'</tbody></table></div>';
}
function tabReceitas(recs){
  if(!recs.length) return UI.vazio('Nenhuma ficha técnica usa estes produtos.','🧾');
  return '<div class="tb-wrap"><table class="tb cp"><thead><tr><th>Receita</th><th class="r">Custo por porção</th><th class="r">Variação</th><th class="r">Preço sugerido</th><th class="r">Preço praticado</th></tr></thead><tbody>'+
    recs.map(function(x){ return '<tr class="cl" data-act="rec" data-id="'+x.id+'"><td><b>'+esc(x.nome)+'</b><small>'+UI.dep(x.dep)+'</small></td><td class="r">'+F.moeda(x.antes)+' → <b>'+F.moeda(x.depois)+'</b></td><td class="r">'+UI.variacao(x.depois,x.antes,true)+'</td><td class="r">'+F.moeda(x.precoAntes)+' → <b>'+F.moeda(x.precoDepois)+'</b></td><td class="r">'+(x.preco?F.moeda(x.preco):'<small>por kg</small>')+'</td></tr>'; }).join('')+'</tbody></table></div>';
}
function previa(id){
  var n=LFI.nota(id), pend=n.itens.filter(function(i){ return !itemOk(i); });
  if(pend.length){
    UI.modal({titulo:'Conferência incompleta', sub:'NF '+esc(n.numero), tam:'sm', corpo:UI.nota('Confirme todos os itens antes de lançar. Itens pendentes:','wt','alerta')+'<div class="lst">'+pend.map(function(i){ return '<div class="li"><span class="av">'+UI.ic('alerta')+'</span><div class="gr"><div class="tt" style="white-space:normal">'+esc(i.desc)+'</div><div class="dd">'+(i.prod?'Correspondência '+i.score+'% · aguardando confirmação':'Sem produto vinculado')+'</div></div></div>'; }).join('')+'</div>'});
    return;
  }
  var s=simular(id); n=LFI.nota(id);
  if(!s){ UI.toast('Não foi possível simular o lançamento','','no'); return; }
  var f=LFI.forn(n.forn), ign=n.itens.filter(function(i){ return i.ignorar; }).length, revs=n.itens.filter(function(i){ return i.revisao; });
  var h='<div class="kpis">'+UI.kpi({lb:'Entradas no estoque', vl:String(s.itens.length), dl:esc(LFI.dep(n.dep).nome)+(ign?' · '+ign+' sem estoque':'')})+UI.kpi({lb:'Valor da nota', vl:F.moeda(n.valor), dl:'Impostos '+F.moeda(impNota(n).total)})+
    UI.kpi({lb:'Receitas recalculadas', vl:String(s.receitas.length), dl:'Fichas técnicas afetadas'})+UI.kpi({lb:'Conta a pagar', vl:s.cp?F.moeda(s.cp.valor):'—', dl:s.cp?'Vence '+F.data(s.cp.venc)+' · '+esc(f.cond):''})+'</div>';
  if(revs.length) h+=UI.nota('<b>'+revs.length+' '+(revs.length===1?'item fica':'itens ficam')+' em revisão</b> e não '+(revs.length===1?'entra':'entram')+' no estoque agora: '+revs.map(function(i){ return esc(LFI.prod(i.prod)?LFI.prod(i.prod).nome:i.desc)+' ('+esc(i.revisao.motivo)+')'; }).join(', ')+'.','wt','alerta');
  h+='<h4 style="margin:4px 0 8px;font-size:13px;font-weight:800">Entradas no estoque e novo custo médio</h4>'+tabEntradas(s.itens, n.dep);
  h+='<h4 style="margin:18px 0 8px;font-size:13px;font-weight:800">Receitas afetadas</h4>'+tabReceitas(s.receitas);
  h+='<div class="grid g2" style="margin-top:16px"><div class="card flat"><h3 style="margin-bottom:8px">Financeiro</h3><div class="lnr"><span class="k">Fornecedor</span><span class="v">'+esc(f.nome)+'</span></div><div class="lnr"><span class="k">Empresa</span><span class="v">'+esc(LFI.emp(n.empresa).fantasia)+'</span></div><div class="lnr"><span class="k">Vencimento</span><span class="v">'+(s.cp?F.data(s.cp.venc):'—')+'</span></div><div class="lnr tot"><span class="k">Conta a pagar</span><span class="v">'+(s.cp?F.moeda(s.cp.valor):'—')+'</span></div></div>'+
    '<div class="card flat"><h3 style="margin-bottom:8px">Ordem de compra</h3>'+(s.oc?'<div class="lnr"><span class="k">'+esc(s.oc.num)+'</span><span class="v">'+UI.status('oc',LFI.ordem(s.oc.id).status)+' → '+UI.status('oc',s.oc.status)+'</span></div><div class="nota" style="margin:10px 0 0;font-size:11.5px">'+UI.ic('info')+'<div>Quantidades recebidas atualizadas na OC; '+(s.oc.status==='recebida'?'pedido concluído.':'restante continua em aberto.')+'</div></div>':UI.vazio('Nota sem OC vinculada','📄'))+'</div></div>';
  h+=UI.nota('Simulação exata do lançamento. Nada foi alterado ainda: ao aprovar, o sistema registra as entradas com rastreio desta nota, atualiza custo médio e último custo, recalcula as fichas técnicas e gera a conta a pagar.','in');
  var m=UI.modal({titulo:'Pré-visualização do lançamento', sub:'NF '+esc(n.numero)+' · '+esc(f.nome), tam:'xl', corpo:h,
    botoes:'<button class="btn sec" data-act="_fechar">Voltar à conferência</button><button class="btn ok" data-act="lancar">'+UI.ic('check')+'Aprovar e lançar</button>',
    acoes:{lancar:function(){ m.fechar(); lancar(id); }, rec:function(rid){ m.fechar(); LFI.ir('receitas', rid); }}});
}
function lancar(id){
  var r=LFI.lancarNota(id); if(!r){ UI.toast('Esta nota já foi lançada','','wt'); return; }
  var n=LFI.nota(id), f=LFI.forn(n.forn);
  UI.toast('NF '+n.numero+' lançada', r.itens.length+' entradas no estoque · '+r.receitas.length+' receitas recalculadas');
  var itens=r.itens.map(function(x){ return {id:x.prod.id, nome:x.prod.nome, un:x.prod.un, qtd:x.qtd, custoUn:x.custoUn, custoAnt:x.custoAnt, custoNovo:x.custoNovo, ultimoAnt:x.ultimoAnt, estAntes:r3(LFI.estoqueGeral(x.prod)-x.qtd), recs:LFI.receitasComProduto(x.prod.id).length}; });
  var recs=r.receitas.map(function(x){ return {id:x.rec.id, nome:x.rec.nome, dep:x.rec.dep, antes:x.antes, depois:x.depois, precoAntes:x.precoAntes, precoDepois:x.precoDepois, preco:x.rec.preco}; });
  var h='<div class="nf-res-hd"><span class="ok">✓</span><div><b>Nota lançada com sucesso</b><small>NF '+esc(n.numero)+' · '+esc(f.nome)+' · '+F.moeda(n.valor)+' · por '+esc(n.lancadaPor)+' em '+F.dataHora(n.lancadaEm)+'</small></div></div>';
  h+='<div class="kpis">'+UI.kpi({lb:'Itens que entraram', vl:String(itens.length), dl:esc(LFI.dep(n.dep).nome)})+UI.kpi({lb:'Receitas recalculadas', vl:String(recs.length), dl:recs[0]?esc(recs[0].nome)+' '+UI.variacao(recs[0].depois,recs[0].antes,true):'—'})+UI.kpi({lb:'Conta a pagar gerada', vl:F.moeda(r.cp.valor), dl:'Vencimento '+F.data(r.cp.venc)})+UI.kpi({lb:'Ordem de compra', vl:r.oc?esc(r.oc.num):'—', dl:r.oc?UI.status('oc',r.oc.status):'Sem OC'})+'</div>';
  h+='<h4 style="margin:4px 0 8px;font-size:13px;font-weight:800">Itens que entraram no estoque</h4>'+tabEntradas(itens, n.dep);
  h+='<h4 style="margin:18px 0 8px;font-size:13px;font-weight:800">Receitas recalculadas <small style="color:var(--muted);font-weight:600">custo por porção e preço sugerido (markup)</small></h4>'+tabReceitas(recs);
  var m=UI.modal({titulo:'Resultado do lançamento', sub:'Estoque, custos, receitas, financeiro e compras atualizados', tam:'xl', corpo:h,
    botoes:'<button class="btn sec esq" data-act="ver">'+UI.ic('nota')+'Ver nota lançada</button><button class="btn sec" data-act="est">'+UI.ic('estoque')+'Estoque</button><button class="btn sec" data-act="recs">'+UI.ic('receita')+'Receitas</button>'+(r.oc?'<button class="btn pri" data-act="oc">'+UI.ic('ordem')+'Ver '+esc(r.oc.num)+'</button>':'<button class="btn pri" data-act="_fechar">Concluir</button>'),
    acoes:{ver:function(){ m.fechar(); LFI.ir('notas',id); }, est:function(){ m.fechar(); LFI.ir('estoque'); }, recs:function(){ m.fechar(); LFI.ir('receitas', recs[0]?recs[0].id:null); }, oc:function(){ m.fechar(); LFI.ir('ordens', r.oc.id); }, rec:function(rid){ m.fechar(); LFI.ir('receitas', rid); }},
    aoFechar:function(){ if(LFI.atual().id==='notas'&&LFI.atual().arg===id) LFI.recarregar(); }});
  LFI.recarregar();
}

/* =====================================================================
   DETALHE DA NOTA LANÇADA
   ===================================================================== */
function barras(chave){
  var s='', x=0, d=String(chave||'').replace(/\D/g,'');
  for(var i=0;i<d.length;i++){ var c=+d[i], w1=1+(c%3), w2=1+((c*7+i)%3), g=1+((c+i)%2); s+='<rect x="'+x+'" y="0" width="'+w1+'" height="38" fill="#1C1C1E"/>'; x+=w1+g; s+='<rect x="'+x+'" y="0" width="'+w2+'" height="38" fill="#1C1C1E"/>'; x+=w2+1+(c%2); }
  return '<svg viewBox="0 0 '+x+' 38" preserveAspectRatio="none">'+s+'</svg>';
}
function detalhe(el, id){
  var n=LFI.nota(id), f=LFI.forn(n.forn), e=LFI.emp(n.empresa), t=impNota(n), oc=n.oc&&LFI.ordem(n.oc);
  var movs=LFI.db.movs.filter(function(m){ return m.origem&&m.origem.tipo==='nf'&&m.origem.id===n.id; });
  var cp=LFI.db.contasPagar.filter(function(c){ return c.nf===n.id; })[0];
  var dest=LFI.impostosDestacados(function(i,x){ return x.id===n.id; }), cred=0; for(var k in dest) cred+=dest[k].cred;
  var canc=n.status==='cancelada';
  var h=UI.cabecalho({titulo:'NF '+esc(n.numero)+' · '+esc(f.nome), migalha:[{t:'Notas Fiscais', ir:'notas'},{t:'NF '+n.numero}],
    sub:UI.status('nf',n.status)+' · '+(canc?'Recusada na conferência':'Lançada '+(n.lancadaEm?'em '+F.dataHora(n.lancadaEm)+' por '+esc(n.lancadaPor):'em '+F.data(n.entrada)))+' · '+UI.dep(n.dep),
    acoes:'<button class="btn sec sm" data-act="xml">'+UI.ic('baixar')+'Baixar XML</button><button class="btn sec sm" data-act="pdf">'+UI.ic('pdf')+'DANFE em PDF</button>'+(oc?'<button class="btn sec sm" data-act="_ir" data-id="ordens/'+oc.id+'">'+UI.ic('ordem')+esc(oc.num)+'</button>':'')});
  if(canc) h+=UI.nota('Esta nota foi <b>recusada</b> e não movimentou estoque, custos nem financeiro.','wt','alerta');
  h+='<div class="kpis">'+UI.kpi({lb:'Valor total', vl:F.moeda(n.valor), dl:n.itens.length+' itens · produtos '+F.moeda(t.prod)})+UI.kpi({lb:'Impostos destacados', vl:F.moeda(t.total), dl:F.pct(t.prod?t.total/t.prod:0)+' sobre produtos'})+
    UI.kpi({lb:'Crédito potencial', vl:F.moeda(cred), dl:'Regras validadas e creditáveis'})+UI.kpi({lb:'Conta a pagar', vl:cp?F.moeda(cp.valor):'—', dl:cp?UI.status('cp',cp.status)+' vence '+F.data(cp.venc):'Não gerada'})+'</div>';

  /* DANFE */
  h+='<div class="grid g21 mb"><div class="card"><h3><span class="lft">'+UI.ic('nota')+' Documento auxiliar (DANFE)</span><small>'+(n.origem==='pdf'?'Importada do PDF':'Importada do XML')+' · '+esc(n.arquivo||'')+'</small></h3>'+
    '<div class="danfe">'+
      '<div class="dr" style="grid-template-columns:1.5fr 1fr 1.6fr"><div class="dc"><span>Emitente</span><b>'+esc(f.razao)+'</b><small>'+esc(f.cidade)+'/'+f.uf+'</small><small class="mono">CNPJ '+f.cnpj+'</small></div>'+
        '<div class="dc" style="text-align:center"><div class="tit">DANFE</div><small>Documento auxiliar da NF-e</small><small><b style="display:inline">1 - Entrada</b> · Nº '+esc(n.numero)+' · Série '+esc(n.serie)+'</small></div>'+
        '<div class="dc bc">'+barras(n.chave)+'<span style="margin-top:5px">Chave de acesso</span><b class="nf-chave" style="font-size:10.5px;white-space:normal">'+fmtChave(n.chave)+'</b></div></div>'+
      '<div class="dr" style="grid-template-columns:2fr 1fr"><div class="dc"><span>Natureza da operação</span><b>'+esc(n.natOp)+'</b></div><div class="dc"><span>Protocolo de autorização</span><b class="mono">1352'+String(n.chave).slice(-11)+'</b></div></div>'+
      '<div class="sec">Destinatário</div>'+
      '<div class="dr" style="grid-template-columns:2fr 1.2fr 1fr 1fr"><div class="dc"><span>Razão social</span><b>'+esc(e.razao)+'</b><small>'+esc(e.endereco)+' · '+esc(e.cidade)+'/'+e.uf+'</small></div><div class="dc"><span>CNPJ</span><b class="mono">'+e.cnpj+'</b><small>IE '+esc(e.ie)+'</small></div><div class="dc"><span>Emissão</span><b>'+F.data(n.emissao)+'</b></div><div class="dc"><span>Entrada</span><b>'+(n.entrada?F.data(n.entrada):'—')+'</b></div></div>'+
      '<div class="sec">Cálculo do imposto</div>'+
      '<div class="dr" style="grid-template-columns:repeat(4,1fr)"><div class="dc"><span>Base ICMS</span><b>'+F.moeda(t.bc)+'</b></div><div class="dc"><span>Valor ICMS</span><b>'+F.moeda(t.icms)+'</b></div><div class="dc"><span>ICMS-ST</span><b>'+F.moeda(t.st)+'</b></div><div class="dc"><span>Valor IPI</span><b>'+F.moeda(t.ipi)+'</b></div></div>'+
      '<div class="dr" style="grid-template-columns:repeat(4,1fr)"><div class="dc"><span>PIS / COFINS</span><b>'+F.moeda(t.pis)+' / '+F.moeda(t.cofins)+'</b></div><div class="dc"><span>Frete</span><b>'+F.moeda(n.frete||0)+'</b></div><div class="dc"><span>Valor dos produtos</span><b>'+F.moeda(t.prod)+'</b></div><div class="dc" style="background:var(--lf-soft)"><span>Valor total da nota</span><b style="font-size:15px">'+F.moeda(n.valor)+'</b></div></div>'+
    '</div></div>';
  /* rastreabilidade */
  h+='<div class="card"><h3><span class="lft">'+UI.ic('link')+' Rastreabilidade</span></h3><div class="tl">'+
    '<div class="tl-it ok"><b>Nota emitida</b><small>'+F.data(n.emissao)+' · '+esc(f.nome)+'</small></div>'+
    (oc?'<div class="tl-it ok"><b>Vinculada à '+esc(oc.num)+'</b><small><a class="vertodos" data-act="_ir" data-id="ordens/'+oc.id+'">Abrir ordem</a> · '+LFI.STATUS.oc[oc.status][0]+'</small></div>':'')+
    (canc?'<div class="tl-it on"><b>Recusada</b><small>Sem movimentação</small></div>':
    '<div class="tl-it ok"><b>Conferida e lançada</b><small>'+(n.lancadaEm?F.dataHora(n.lancadaEm)+' · '+esc(n.lancadaPor):F.data(n.entrada))+'</small></div>'+
    '<div class="tl-it ok"><b>'+movs.length+' entradas no estoque</b><small>'+esc(LFI.dep(n.dep).nome)+' · origem NF '+esc(n.numero)+'</small></div>'+
    (cp?'<div class="tl-it '+(cp.status==='pago'?'ok':'on')+'"><b>Conta a pagar '+F.moeda(cp.valor)+'</b><small>Vencimento '+F.data(cp.venc)+' · '+LFI.STATUS.cp[cp.status][0]+'</small></div>':''))+
    '</div>'+(n.chave?'<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border)"><div class="kv"><div><span>Arquivo original</span><b style="font-size:12px;word-break:break-all;white-space:normal">'+esc(n.arquivo||'—')+'</b></div><div><span>Formato</span><b>'+(n.origem==='pdf'?'PDF (DANFE)':'XML NF-e 4.00')+'</b></div></div></div>':'')+'</div></div>';

  /* itens */
  h+='<div class="card mb"><h3><span class="lft">'+UI.ic('lista')+' Itens da nota e produtos vinculados</span><small>clique para abrir o produto</small></h3><div id="nf-it"></div></div>';
  /* movimentações + tributos */
  h+='<div class="grid g2 mb"><div class="card"><h3><span class="lft">'+UI.ic('estoque')+' Movimentos de estoque gerados <span class="n">'+movs.length+'</span></span></h3><div id="nf-mv"></div></div>'+
     '<div class="card"><h3><span class="lft">'+UI.ic('tributo')+' Destacado × crédito potencial</span></h3>'+tribLancada(n, dest)+'</div></div>';
  el.innerHTML=h;

  UI.tabela(el.querySelector('#nf-it'), {linhas:n.itens, linhaAct:'prod', linhaId:function(it){ return it.prod||''; }, colunas:[
    {t:'Descrição na nota', v:function(it){ return '<b>'+esc(it.desc)+'</b><small>Cód. '+esc(it.cod||'—')+' · NCM '+esc(it.ncm)+' · CFOP '+esc(it.cfop)+'</small>'; }, ord:function(it){ return it.desc; }},
    {t:'Produto vinculado', v:function(it){ var p=it.prod&&LFI.prod(it.prod); return p?'<b>'+esc(p.nome)+'</b><small>'+esc(LFI.cat(p.cat).nome)+'</small>':'<span class="tag">'+(it.ignorar?'Uso e consumo':'Sem vínculo')+'</span>'; }, ord:function(it){ var p=it.prod&&LFI.prod(it.prod); return p?p.nome:''; }},
    {t:'Qtd. nota', r:true, v:function(it){ return F.num(it.qtd)+' '+esc(it.un)+'<small>'+F.moeda(it.vUn)+'</small>'; }, ord:function(it){ return it.qtd; }},
    {t:'Entrada estoque', r:true, v:function(it){ var p=it.prod&&LFI.prod(it.prod); return p?F.qtd(qtdBase(it),p.un)+'<small>fator '+F.num(it.fator)+'</small>':'—'; }, ord:function(it){ return qtdBase(it); }},
    {t:'Custo unit.', r:true, v:function(it){ var p=it.prod&&LFI.prod(it.prod); return p?F.moeda(custoUnit(it))+'<small>/'+esc(p.un)+'</small>':'—'; }, ord:function(it){ return custoUnit(it); }},
    {t:'Impostos', r:true, v:function(it){ var v=it.icms.v+it.ipi.v+it.pis.v+it.cofins.v+it.st.v; return F.moeda(v)+'<small>'+(it.st.v?'ST '+F.moeda(it.st.v):'ICMS '+F.pctN(it.icms.p,0))+'</small>'; }, ord:function(it){ return it.icms.v+it.st.v; }},
    {t:'Valor', r:true, v:function(it){ return '<b>'+F.moeda(it.vProd)+'</b>'; }, ord:function(it){ return it.vProd; }}
  ], rodape:'<tr><td colspan="6">Total dos produtos'+(n.frete?' (frete '+F.moeda(n.frete)+' à parte)':'')+'</td><td class="r">'+F.moeda(t.prod)+'</td></tr>'});
  el.querySelector('#nf-mv').innerHTML = movs.length ? '<div class="tb-wrap"><table class="tb cp"><thead><tr><th>Data</th><th>Produto</th><th>Destino</th><th class="r">Qtd.</th><th class="r">Custo</th></tr></thead><tbody>'+
    movs.map(function(m){ var p=LFI.prod(m.prod); return '<tr class="cl" data-act="prod" data-id="'+m.prod+'"><td class="nw">'+F.dataHora(m.d)+'<small>'+esc(m.usuario)+'</small></td><td><b>'+esc(p?p.nome:m.prod)+'</b><small>'+UI.badge(LFI.TIPOS_MOV[m.tipo][0],LFI.TIPOS_MOV[m.tipo][1])+'</small></td><td>'+UI.dep(m.dep)+'</td><td class="r" style="color:var(--green);font-weight:800">+'+F.qtd(m.qtd,p?p.un:'')+'</td><td class="r">'+F.moeda(m.custo)+'</td></tr>'; }).join('')+'</tbody></table></div>'
    : UI.vazio(canc?'Nota recusada: nenhum movimento.':'Nenhum movimento vinculado a esta nota.','📦');

  UI.liga(el, UI.navHandlers({
    prod:function(pid){ if(pid) LFI.ir('estoque', pid); else UI.toast('Item sem produto vinculado','','wt'); },
    xml:function(){ baixarXML(LFI.nota(id)); },
    pdf:function(){ pdfDanfe(LFI.nota(id)); }
  }));
}
function tribLancada(n, dest){
  var t=impNota(n), cred=0, regras={}; for(var k in dest) cred+=dest[k].cred;
  n.itens.forEach(function(it){ var p=it.prod&&LFI.prod(it.prod), rg=p?LFI.regraDoProduto(p):null; var key=rg?rg.status:'sem'; regras[key]=(regras[key]||0)+1; });
  return '<div class="nf-trib" style="margin-bottom:12px"><div class="bx"><h4>Destacado na nota</h4><div class="vv">'+F.moeda(t.total)+'</div>'+
    [['ICMS',t.icms],['ICMS-ST',t.st],['IPI',t.ipi],['PIS',t.pis],['COFINS',t.cofins]].map(function(x){ return '<div class="lnr"><span class="k">'+x[0]+'</span><span class="v">'+F.moeda(x[1])+'</span></div>'; }).join('')+'</div>'+
    '<div class="bx cr"><h4>Crédito potencial</h4><div class="vv" style="color:var(--green)">'+F.moeda(cred)+'</div><p>Calculado pelas regras tributárias cadastradas para os produtos desta nota.</p>'+
    [['validada','Itens com regra validada'],['em_revisao','Regra em revisão'],['pendente','Regra pendente'],['sem','Sem regra cadastrada']].filter(function(x){ return regras[x[0]]; }).map(function(x){ return '<div class="lnr"><span class="k">'+x[1]+'</span><span class="v">'+regras[x[0]]+'</span></div>'; }).join('')+'</div></div>'+
    UI.nota('Regras pendentes ou em revisão não entram na estimativa de crédito até a validação do contador.','in');
}

/* ---------- arquivos ---------- */
function xmlEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function baixarXML(n){
  var f=LFI.forn(n.forn), e=LFI.emp(n.empresa), t=impNota(n), d=function(v){ return Number(v||0).toFixed(2); };
  var x='<?xml version="1.0" encoding="UTF-8"?>\n<!-- Documento de DEMONSTRACAO gerado pelo LiveFood Intelligence. Dados ficticios, sem validade fiscal. -->\n'+
  '<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">\n <NFe>\n  <infNFe Id="NFe'+n.chave+'" versao="4.00">\n'+
  '   <ide><cUF>35</cUF><natOp>'+xmlEsc(n.natOp)+'</natOp><mod>55</mod><serie>'+n.serie+'</serie><nNF>'+n.numero.replace(/\D/g,'').replace(/^0+/,'')+'</nNF><dhEmi>'+n.emissao+'T08:00:00-03:00</dhEmi><tpNF>1</tpNF><tpAmb>2</tpAmb></ide>\n'+
  '   <emit><CNPJ>'+f.cnpj.replace(/\D/g,'')+'</CNPJ><xNome>'+xmlEsc(f.razao)+'</xNome><xFant>'+xmlEsc(f.nome)+'</xFant><enderEmit><xMun>'+xmlEsc(f.cidade)+'</xMun><UF>'+f.uf+'</UF></enderEmit></emit>\n'+
  '   <dest><CNPJ>'+e.cnpj.replace(/\D/g,'')+'</CNPJ><xNome>'+xmlEsc(e.razao)+'</xNome><enderDest><xLgr>'+xmlEsc(e.endereco)+'</xLgr><xMun>'+xmlEsc(e.cidade)+'</xMun><UF>'+e.uf+'</UF></enderDest><IE>'+e.ie.replace(/\D/g,'')+'</IE></dest>\n'+
  n.itens.map(function(it,i){ return '   <det nItem="'+(i+1)+'">\n    <prod><cProd>'+xmlEsc(it.cod)+'</cProd><xProd>'+xmlEsc(it.desc)+'</xProd><NCM>'+it.ncm.replace(/\D/g,'')+'</NCM><CFOP>'+it.cfop+'</CFOP><uCom>'+it.un+'</uCom><qCom>'+Number(it.qtd).toFixed(4)+'</qCom><vUnCom>'+Number(it.vUn).toFixed(4)+'</vUnCom><vProd>'+d(it.vProd)+'</vProd></prod>\n'+
    '    <imposto><ICMS><CST>'+it.icms.cst+'</CST><vBC>'+d(it.icms.bc)+'</vBC><pICMS>'+d(it.icms.p)+'</pICMS><vICMS>'+d(it.icms.v)+'</vICMS><vICMSST>'+d(it.st.v)+'</vICMSST></ICMS><IPI><pIPI>'+d(it.ipi.p)+'</pIPI><vIPI>'+d(it.ipi.v)+'</vIPI></IPI><PIS><pPIS>'+d(it.pis.p)+'</pPIS><vPIS>'+d(it.pis.v)+'</vPIS></PIS><COFINS><pCOFINS>'+d(it.cofins.p)+'</pCOFINS><vCOFINS>'+d(it.cofins.v)+'</vCOFINS></COFINS></imposto>\n   </det>\n'; }).join('')+
  '   <total><ICMSTot><vBC>'+d(t.bc)+'</vBC><vICMS>'+d(t.icms)+'</vICMS><vST>'+d(t.st)+'</vST><vProd>'+d(t.prod)+'</vProd><vFrete>'+d(n.frete)+'</vFrete><vDesc>'+d(n.desconto)+'</vDesc><vIPI>'+d(t.ipi)+'</vIPI><vPIS>'+d(t.pis)+'</vPIS><vCOFINS>'+d(t.cofins)+'</vCOFINS><vNF>'+d(n.valor)+'</vNF></ICMSTot></total>\n'+
  '  </infNFe>\n </NFe>\n <protNFe versao="4.00"><infProt><chNFe>'+n.chave+'</chNFe><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e (simulado)</xMotivo></infProt></protNFe>\n</nfeProc>\n';
  UI.baixarArquivo('NFe'+n.chave+'.xml', x, 'application/xml;charset=utf-8');
  UI.toast('XML gerado', 'NFe'+n.chave.slice(0,10)+'….xml');
}
function pdfDanfe(n){
  var f=LFI.forn(n.forn), e=LFI.emp(n.empresa), t=impNota(n);
  var h='<div class="kp"><div><span>Emitente</span><b>'+esc(f.razao)+'</b><br>CNPJ '+f.cnpj+'</div><div><span>Destinatário</span><b>'+esc(e.razao)+'</b><br>CNPJ '+e.cnpj+'</div><div><span>NF / série</span><b>'+esc(n.numero)+' / '+esc(n.serie)+'</b><br>Emissão '+F.data(n.emissao)+'</div></div>'+
    '<p style="font-family:monospace;font-size:11px;letter-spacing:1px">Chave de acesso: '+fmtChave(n.chave)+'</p><p>Natureza da operação: '+esc(n.natOp)+'</p>'+
    '<h2>Itens</h2><table><thead><tr><th>Código</th><th>Descrição</th><th>NCM</th><th>CFOP</th><th>Un</th><th class="r">Qtd.</th><th class="r">V. unit.</th><th class="r">V. total</th><th class="r">ICMS</th><th class="r">IPI</th><th class="r">ST</th></tr></thead><tbody>'+
    n.itens.map(function(it){ return '<tr><td>'+esc(it.cod)+'</td><td>'+esc(it.desc)+'</td><td>'+it.ncm+'</td><td>'+it.cfop+'</td><td>'+it.un+'</td><td class="r">'+F.num(it.qtd)+'</td><td class="r">'+F.moeda(it.vUn)+'</td><td class="r">'+F.moeda(it.vProd)+'</td><td class="r">'+F.moeda(it.icms.v)+'</td><td class="r">'+F.moeda(it.ipi.v)+'</td><td class="r">'+F.moeda(it.st.v)+'</td></tr>'; }).join('')+
    '</tbody></table><h2>Cálculo do imposto</h2><div class="kp"><div><span>Base ICMS</span><b>'+F.moeda(t.bc)+'</b></div><div><span>ICMS</span><b>'+F.moeda(t.icms)+'</b></div><div><span>ICMS-ST</span><b>'+F.moeda(t.st)+'</b></div><div><span>IPI</span><b>'+F.moeda(t.ipi)+'</b></div><div><span>PIS/COFINS</span><b>'+F.moeda(t.pis+t.cofins)+'</b></div><div><span>Frete</span><b>'+F.moeda(n.frete)+'</b></div><div><span>Total da nota</span><b>'+F.moeda(n.valor)+'</b></div></div>';
  UI.exportarPDF('DANFE · NF '+n.numero, f.nome+' → '+e.fantasia+' · '+LFI.STATUS.nf[n.status][0], h);
}


/* =====================================================================
   RECEBER PEDIDO (passo a passo, feito para o celular)
   1. escolher o pedido  2. fotografar a nota  3. conferir itens  4. aprovar
   ===================================================================== */
function rcbSt(){ var s=st(); s.rcb=s.rcb||{passo:'pedido', oc:null, q:'', pags:[]}; return s.rcb; }
function pedidosAbertos(){ return LFI.db.ordens.filter(function(o){ return ['recebida','cancelada'].indexOf(o.status)<0&&LFI.empresaVisivel(o.empresa); }).sort(function(a,b){ return a.previsao<b.previsao?-1:1; }); }
function receber(el){
  css(); document.body.classList.add('foco'); var R=rcbSt();
  var pass='<div class="rc-pass">'+['Pedido','Nota fiscal','Conferir itens','Aprovar'].map(function(t,i){ var at=R.passo==='pedido'?0:1; return '<div class="'+(i<at?'ok':i===at?'on':'')+'"><i>'+(i<at?'✓':i+1)+'</i><span>'+t+'</span></div>'; }).join('')+'</div>';
  var h='<div class="rcx"><div class="rc-hd"><button class="rc-x" data-act="'+(R.passo==='pedido'?'_ir':'volta')+'" data-id="notas" aria-label="Voltar">'+UI.ic('voltar')+'</button><div><b>Receber pedido</b><small>'+(R.passo==='pedido'?'Qual pedido chegou?':'Fotografe ou envie a nota fiscal da entrega')+'</small></div></div>'+pass;
  if(R.passo==='pedido'){
    var q=semAcento(R.q||'').toLowerCase(), ls=pedidosAbertos().filter(function(o){ if(!q) return true; var cot=o.cot&&LFI.cotacao(o.cot);
      var t=semAcento(o.num+' '+LFI.forn(o.forn).nome+' '+(cot?cot.num:'')+' '+o.itens.map(function(i){ var p=LFI.prod(i.prod); return p?p.nome:''; }).join(' ')).toLowerCase(); return t.indexOf(q)>=0; });
    h+='<div class="rc-busca">'+UI.ic('busca')+'<input id="rc-q" placeholder="Número do pedido, fornecedor ou produto" value="'+esc(R.q||'')+'" autocomplete="off"></div>';
    h+='<div class="rc-lista">'+(ls.length?ls.map(function(o){ var f=LFI.forn(o.forn), nf=LFI.db.notas.filter(function(n){ return n.oc===o.id&&pendentes(n); })[0], atr=o.previsao<LFI.hoje(), hj=o.previsao===LFI.hoje();
      return '<button class="rc-ped" data-act="ped" data-id="'+o.id+'"><div class="rc-l1"><b>'+esc(o.num)+'</b>'+(nf?UI.badge('Nota já recebida','in'):atr?UI.badge('Atrasado','no'):hj?UI.badge('Chega hoje','lf'):UI.badge('Entrega '+F.dataC(o.previsao),'nu'))+'</div><div class="rc-f">'+esc(f.nome)+'</div>'+
        '<div class="rc-its">'+o.itens.slice(0,4).map(function(i){ var p=LFI.prod(i.prod); return UI.fotoProd(p,26); }).join('')+'<span>'+o.itens.length+(o.itens.length===1?' item':' itens')+' · '+F.moeda(LFI.totalOrdem(o))+'</span></div></button>'; }).join(''):UI.vazio('Nenhum pedido encontrado.','🔎'))+'</div>';
  } else {
    var o=LFI.ordem(R.oc), f=LFI.forn(o.forn);
    h+='<div class="rc-sel"><b>'+esc(o.num)+' · '+esc(f.nome)+'</b><small>'+o.itens.length+' itens · '+F.moeda(LFI.totalOrdem(o))+'</small></div>';
    h+='<div class="rc-pags">'+R.pags.map(function(src,i){ return '<div class="rc-pg"><img src="'+src+'" alt="Página '+(i+1)+'"><span>Página '+(i+1)+'</span><button data-act="tira" data-id="'+i+'" aria-label="Remover página">✕</button></div>'; }).join('')+'</div>';
    if(R.arq){
      h+='<div class="rc-arq"><span class="fi" style="background:'+(R.arq.tipo==='XML'?'#16A34A':'#DC2626')+'">'+R.arq.tipo+'</span><div><b>'+esc(R.arq.nome)+'</b><small>Arquivo da nota recebido</small></div><button data-act="tiraArq" aria-label="Remover arquivo">✕</button></div>';
    } else {
      h+='<label class="rc-cam" id="rc-drop"><input type="file" accept="image/*" capture="environment" multiple id="rc-f">'+UI.ic('foto')+'<b>'+(R.pags.length?'Fotografar mais uma página':'Fotografar a nota fiscal')+'</b><small>Uma foto por página</small></label>';
      if(!R.pags.length) h+='<label class="rc-btn sec rc-up"><input type="file" accept=".pdf,.xml,application/pdf,text/xml,application/xml" id="rc-a">'+UI.ic('upload')+'Enviar PDF ou XML da nota</label>';
    }
    if(!R.pags.length&&!R.arq) h+='<button class="rc-btn gh" data-act="ex">Usar foto de exemplo</button><button class="rc-btn gh" data-act="semfoto">Conferir sem a nota</button>';
    else h+='<button class="rc-btn pri" data-act="ler">'+UI.ic('ia')+'Ler a nota e conferir os itens</button>';
  }
  h+='</div>';
  el.innerHTML=h;
  var qi=el.querySelector('#rc-q'); if(qi){ qi.addEventListener('input',function(){ R.q=qi.value; var pos=qi.selectionStart; LFI.recarregar(); var n2=document.getElementById('rc-q'); if(n2){ n2.focus(); n2.setSelectionRange(pos,pos); } }); }
  function recebeArqs(lista){ var fs=Array.prototype.slice.call(lista||[]); if(!fs.length) return;
    var doc=fs.filter(function(a){ return /\.(pdf|xml)$/i.test(a.name)||/pdf|xml/.test(a.type||''); })[0];
    if(doc){ R.arq={nome:doc.name, tipo:/\.xml$/i.test(doc.name)||/xml/.test(doc.type||'')?'XML':'PDF'}; R.pags=[]; LFI.recarregar(); return; }
    var imgs=fs.filter(function(a){ return /^image\//.test(a.type)||/\.(jpe?g|png|heic|webp)$/i.test(a.name); }), falta=imgs.length;
    imgs.forEach(function(a){ var rd=new FileReader(); rd.onload=function(){ reduz(rd.result,function(img){ R.pags.push(img); if(--falta===0) LFI.recarregar(); },900); }; rd.readAsDataURL(a); }); }
  var fi=el.querySelector('#rc-f'); if(fi) fi.addEventListener('change',function(){ recebeArqs(fi.files); });
  var fa=el.querySelector('#rc-a'); if(fa) fa.addEventListener('change',function(){ recebeArqs(fa.files); });
  var dz=el.querySelector('#rc-drop'); if(dz){ ['dragenter','dragover'].forEach(function(e){ dz.addEventListener(e,function(ev){ ev.preventDefault(); dz.classList.add('on'); }); }); ['dragleave','drop'].forEach(function(e){ dz.addEventListener(e,function(ev){ ev.preventDefault(); dz.classList.remove('on'); }); }); dz.addEventListener('drop',function(ev){ recebeArqs(ev.dataTransfer&&ev.dataTransfer.files); }); }
  function abrir(){ var o=LFI.ordem(R.oc), n=LFI.db.notas.filter(function(x){ return x.oc===o.id&&pendentes(x); })[0];
    if(!n){ var falt={}; o.itens.forEach(function(i){ var q2=Math.max(0,i.qtd-i.recebido); if(q2>0) falt[i.prod]=q2; }); n=LFI.notaDaOrdem(o.id, falt); }
    if(R.pags.length){ n.paginas=R.pags.slice(); n.origem='foto'; }
    else if(R.arq){ n.origem=R.arq.tipo.toLowerCase(); n.arquivo=R.arq.nome; }
    LFI.salvar(); st().rcb=null; LFI.ir('notas', n.id); }
  UI.liga(el, UI.navHandlers({
    ped:function(id){ R.oc=id; R.passo='foto'; R.pags=[]; R.arq=null; LFI.recarregar(); window.scrollTo(0,0); },
    volta:function(){ R.passo='pedido'; LFI.recarregar(); },
    tiraArq:function(){ R.arq=null; LFI.recarregar(); },
    tira:function(i){ R.pags.splice(+i,1); LFI.recarregar(); },
    ex:function(){ R.pags=[paginaEx(1),paginaEx(2)]; LFI.recarregar(); },
    semfoto:function(){ abrir(); },
    ler:function(){ var b=el.querySelector('[data-act=ler]'); b.disabled=true; b.innerHTML='<span class="rc-spin"></span>Lendo a nota…'; setTimeout(abrir, 1100); }
  }));
}

LFI.registrar('notas',{titulo:'Recebimento', render:render});
})();
