/* LiveFood Intelligence — COMPRAS INTELIGENTES VIA WHATSAPP
   Central de cotações · nova solicitação (foto da lista, texto ou seleção) · rodada de cotação pelo WhatsApp ·
   recebimento de propostas (PDF, Excel, mensagem) com conferência · comparador ponderado · OCs consolidadas.
   Toda alteração passa por LFI.criarCotacao / LFI.criarOrdem ou altera LFI.db e chama LFI.salvar(). */
(function(){
'use strict';
var LFI=window.LFI, UI=LFI.ui, F=LFI.fmt, esc=UI.esc, U=LFI.dataUtil, r2=U.r2, r3=U.r3;

/* ---------- estilos próprios da tela (injetados uma vez) ---------- */
var CSS=[
'.cq-pipe{display:flex;gap:8px;margin-bottom:16px;overflow-x:auto;scrollbar-width:none;padding:1px 1px 3px}',
'.cq-pipe::-webkit-scrollbar{display:none}',
'.wa-tag svg,.wa-doc svg{fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
'.tela-compras label.drop{display:block}',
'.tela-compras .grid>.card+.card,.tela-compras .grid>div>.card:first-child{margin-top:0}',
'.cq-pipe button{display:flex;flex-direction:column;justify-content:flex-start;flex:1 0 108px;border:1px solid var(--border);background:var(--s1);border-radius:12px;padding:12px 12px 10px;text-align:left;cursor:pointer;font:inherit;color:var(--text);position:relative;overflow:hidden;box-shadow:var(--sh1);transition:border-color .15s,box-shadow .15s}',
'.cq-pipe button:hover{border-color:var(--border2);box-shadow:var(--sh2)}',
'.cq-pipe button.on{border-color:var(--text);box-shadow:0 0 0 1px var(--text)}',
'.cq-pipe button:before{content:"";position:absolute;left:0;top:0;right:0;height:3px;background:var(--c,var(--s4))}',
'.cq-pipe b{display:block;font-size:21px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1.1}',
'.cq-pipe span{display:block;font-size:11px;font-weight:700;color:var(--muted);margin-top:4px;line-height:1.25}',
'.cq-pipe button.tot{background:var(--s3);flex-basis:96px}',
'.cq-pipe button.z b{color:var(--muted)}',
'.cq-lista{display:flex;flex-direction:column;gap:10px}',
'.cq-cot{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1.45fr) minmax(150px,.75fr);gap:18px;align-items:center;background:var(--s1);border:1px solid var(--border);border-radius:14px;padding:14px 16px 14px 18px;cursor:pointer;box-shadow:var(--sh1);transition:border-color .15s,box-shadow .15s,transform .15s;position:relative}',
'.cq-cot:hover{border-color:var(--border2);box-shadow:var(--sh2);transform:translateY(-1px)}',
'.cq-cot:before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:3px;border-radius:0 3px 3px 0;background:var(--c,transparent)}',
'.cq-cot .n{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
'.cq-cot .n b{font-size:14.5px;font-weight:800;letter-spacing:-.1px}',
'.cq-cot .mt{font-size:11.5px;color:var(--muted);font-weight:600;margin-top:6px;line-height:1.6}',
'.cq-cot .mt svg{width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2;vertical-align:-2px;margin-right:3px}',
'.cq-chips{display:flex;flex-wrap:wrap;gap:5px}',
'.cq-chip{font-size:11.5px;font-weight:700;background:var(--s3);color:var(--texto2);border-radius:7px;padding:3px 8px;white-space:nowrap}',
'.cq-chip b{font-weight:800;color:var(--text)}',
'.cq-fs{display:flex;align-items:center;gap:8px;margin-top:9px;font-size:11.5px;font-weight:700;color:var(--muted);flex-wrap:wrap}',
'.cq-avs{display:flex;padding-left:6px}',
'.cq-avs span{width:24px;height:24px;border-radius:50%;border:2px solid #fff;margin-left:-6px;font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;background:var(--s4);color:var(--muted2)}',
'.cq-avs span.ok{background:#DCFCE7;color:var(--green)}',
'.cq-pr{text-align:right}',
'.cq-pr .x{font-size:18px;font-weight:800;font-variant-numeric:tabular-nums}',
'.cq-pr .x small,.cq-pr .x .de{display:inline;font-size:12px;color:var(--muted);font-weight:700}',
'.cq-pr .bar{margin:6px 0 6px auto;max-width:150px}',
'.cq-pr small{display:block;font-size:11.5px;color:var(--muted);font-weight:600;line-height:1.45}',
'.cq-pr .venc{color:var(--red);font-weight:800}',
'.cq-pr .val{color:var(--text);font-weight:800}',
'.cq-modos{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:16px}',
'.cq-modo{border:1.5px solid var(--border);border-radius:14px;padding:14px 16px;background:var(--s1);cursor:pointer;display:flex;gap:12px;align-items:flex-start;text-align:left;font:inherit;color:inherit;box-shadow:var(--sh1);transition:border-color .15s,box-shadow .15s}',
'.cq-modo:hover{border-color:var(--border2)}',
'.cq-modo.on{border-color:var(--roxo);box-shadow:0 0 0 3px rgba(255,90,0,.12)}',
'.cq-modo b{display:block;font-size:13.5px;font-weight:800;margin-bottom:3px}',
'.cq-modo small{display:block;font-size:12px;color:var(--muted);font-weight:600;line-height:1.4}',
'.cq-fchip{display:inline-flex;align-items:center;gap:8px;border:1.5px solid var(--border2);border-radius:11px;padding:7px 11px 7px 9px;cursor:pointer;background:var(--s1);font-size:12.5px;font-weight:700;min-width:0;transition:border-color .15s,background .15s}',
'.cq-fchip input{width:15px;height:15px;accent-color:var(--roxo);flex:none;margin:0}',
'.cq-fchip.on{border-color:var(--roxo);background:var(--lf-soft)}',
'.cq-fchip b{display:block;font-size:12.5px;font-weight:800;white-space:nowrap}',
'.cq-fchip small{display:block;font-size:11px;color:var(--muted);font-weight:600;white-space:nowrap}',
'.cq-fi{display:grid;grid-template-columns:minmax(170px,.8fr) minmax(0,2fr);gap:14px;padding:13px 0;border-bottom:1px solid var(--border);align-items:start}',
'.cq-fi:last-child{border-bottom:0}',
'.cq-fi b{font-size:13.5px;font-weight:800;display:block}',
'.cq-fi small{font-size:11.5px;color:var(--muted);font-weight:600;display:block;margin-top:2px}',
'.cq-fi-f{display:flex;flex-wrap:wrap;gap:7px;align-items:center}',
'.cq-fi-f select{width:auto;max-width:210px}',
'.papel div.cq-lida{background:linear-gradient(90deg,rgba(255,90,0,.18),rgba(255,90,0,0) 85%);transition:background .3s}',
'.papel div.cq-ok:after{content:"  ✓";color:#16A34A;font-family:Manrope,sans-serif;font-size:14px;font-weight:800}',
'.cq-mao{white-space:nowrap;font-family:Caveat,cursive;font-size:20px;color:#1E3A8A;line-height:1;font-weight:700}',
'.cq-sm .papel{font-size:21px;padding:16px 18px 18px}',
'.cq-sm .papel .tit{font-size:23px}',
'.cq-sm.foto-moldura{padding:18px 16px}',
'.cq-scanw{border-radius:8px}',
'.cq-thumb{display:flex;align-items:center;gap:10px;background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:8px;margin-bottom:12px;font-size:12px;font-weight:700}',
'.cq-thumb img{width:48px;height:48px;object-fit:cover;border-radius:7px;flex:none}',
'.cq-doc{background:#fff;border:1px solid var(--border2);border-radius:6px;box-shadow:0 12px 28px -16px rgba(0,0,0,.35);padding:18px 20px;font-size:11px;color:#333;font-family:Arial,Helvetica,sans-serif}',
'.cq-doc-hd{display:flex;justify-content:space-between;gap:12px;border-bottom:2px solid #333;padding-bottom:8px;margin-bottom:8px}',
'.cq-doc-hd b{font-size:12px;display:block}',
'.cq-doc-hd small{display:block;color:#666;font-size:10px;margin-top:1px}',
'.cq-doc-hd .r{text-align:right}',
'.cq-doc-to{font-size:10.5px;color:#555;margin-bottom:8px}',
'.cq-doc table{width:100%;border-collapse:collapse}',
'.cq-doc th{background:#F1F1F1;font-size:9.5px;text-transform:uppercase;text-align:left;padding:5px 6px;border-bottom:1px solid #ccc}',
'.cq-doc td{padding:5px 6px;border-bottom:1px solid #eee;font-size:10.5px}',
'.cq-doc .r{text-align:right}',
'.cq-doc .ind{color:#B91C1C;font-weight:700}',
'.cq-doc-ft{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:10px;font-size:10px;color:#444}',
'.cq-doc-tot{text-align:right;font-weight:700;font-size:12px;margin-top:8px}',
'.cq-docf{display:flex;align-items:center;gap:10px;background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:9px 11px;margin-bottom:10px;font-size:12.5px;font-weight:700}',
'.cq-docf .ic{width:30px;height:36px;border-radius:5px;color:#fff;font-size:9.5px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:none}',
'.cq-docf small{display:block;color:var(--muted);font-weight:600;font-size:11px}',
'.cq-xl{border:1px solid #C9D3CC;border-radius:8px;overflow:hidden;background:#fff;font-size:11.5px}',
'.cq-xl-bar{background:#107C41;color:#fff;padding:7px 11px;font-weight:800;font-size:12px;display:flex;gap:8px;align-items:center}',
'.cq-xl-bar span{opacity:.75;font-weight:600;margin-left:auto;font-size:11px}',
'.cq-xl .w{overflow-x:auto}',
'.cq-xl table{border-collapse:collapse;width:100%}',
'.cq-xl td,.cq-xl th{border:1px solid #E1E5E2;padding:4px 7px;white-space:nowrap;font-family:Calibri,Arial,sans-serif}',
'.cq-xl th{background:#F3F5F4;color:#666;font-weight:700;text-align:center;font-size:10.5px}',
'.cq-xl td.rn{background:#F3F5F4;color:#888;text-align:center;width:26px;font-size:10.5px}',
'.cq-xl tr.h td{font-weight:800;background:#E9F5EE}',
'.cq-xl tr.t td{font-weight:800;font-size:12.5px}',
'.cq-xl td.n{text-align:right}',
'.cq-xl td.sel{box-shadow:inset 0 0 0 2px #107C41}',
'mark.cq-nlp{border-radius:4px;padding:0 2px;color:inherit;font-weight:700}',
'mark.cq-nlp.pr{background:#DCFCE7;box-shadow:inset 0 0 0 1px #86EFAC}',
'mark.cq-nlp.qt{background:#DBEAFE;box-shadow:inset 0 0 0 1px #93C5FD}',
'mark.cq-nlp.pz{background:#FEF3C7;box-shadow:inset 0 0 0 1px #FCD34D}',
'mark.cq-nlp.no{background:#FEE2E2;box-shadow:inset 0 0 0 1px #FCA5A5}',
'.cq-leg{display:flex;gap:10px;flex-wrap:wrap;font-size:11px;font-weight:700;color:var(--muted2);margin-top:8px}',
'.cq-leg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:4px;vertical-align:-1px}',
'.cq-rx{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:20px;align-items:start}',
'.cq-env{display:grid;grid-template-columns:270px minmax(0,1fr);gap:18px;align-items:start}',
'.cq-env .lst .li{padding:8px 8px;border-radius:10px;cursor:pointer}',
'.cq-env .lst .li.on{background:var(--lf-soft)}',
'.cq-cmp th.fo{vertical-align:bottom}',
'.cq-cmp th.fo b{display:block;font-size:12.5px;color:var(--text);text-transform:none;letter-spacing:0;white-space:normal}',
'.cq-cmp th.fo small{display:block;font-size:10.5px;text-transform:none;letter-spacing:0;font-weight:700;color:var(--muted);margin-top:2px}',
'.cq-cmp td.cel{padding:10px 8px 9px;min-width:138px}',
'.cq-cmp td.cel .q.parc{color:#946C00}',
'.cq-cmp .cq-tags{display:flex;gap:4px;justify-content:center;min-height:15px;margin-bottom:3px;flex-wrap:wrap}',
'.cq-cmp .cq-tags span{font-size:9px;font-weight:800;border-radius:4px;padding:1px 5px;text-transform:uppercase;letter-spacing:.3px}',
'.cq-cmp .cq-tags .tr{background:var(--text);color:#fff}',
'.cq-cmp .cq-tags .tm{background:var(--g-soft);color:var(--green)}',
'.cq-cmp .cq-sc{height:4px;border-radius:99px;background:var(--s4);width:64px;margin:6px auto 2px;overflow:hidden}',
'.cq-cmp .cq-sc i{display:block;height:100%;background:var(--muted2);border-radius:99px}',
'.cq-cmp td.cel.esc .cq-sc i{background:var(--roxo)}',
'.cq-cmp .cq-nt{font-size:10.5px;font-weight:800;color:var(--muted)}',
'.cq-cmp td.cel.ind{background:repeating-linear-gradient(135deg,var(--s2),var(--s2) 6px,#fff 6px,#fff 12px);font-size:11.5px;font-weight:700}',
'.cq-cmp tfoot td{font-size:12px;text-align:center;font-weight:700}',
'.cq-cmp tfoot td:first-child{text-align:left}',
'.cq-cmp tfoot tr.tt td{font-size:13.5px;font-weight:800}',
'.cq-cmp td.cel.esc:after{content:"✓";position:absolute;left:6px;bottom:6px;width:16px;height:16px;border-radius:50%;background:var(--roxo);color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center}',
'.cq-cesta{background:linear-gradient(160deg,#1C1C1E,#2E2E33);color:#fff;border-color:#1C1C1E}',
'.cq-cesta h3{color:#fff}',
'.cq-cesta h3 small{color:#B9B9C0}',
'.cq-cesta .tt{font-size:30px;font-weight:800;letter-spacing:-.5px;font-variant-numeric:tabular-nums;line-height:1.1}',
'.cq-cesta .st{font-size:12px;color:#B9B9C0;font-weight:600;margin:3px 0 12px}',
'.cq-cesta .lnr{border-color:rgba(255,255,255,.1)}',
'.cq-cesta .lnr .k{color:#C9C9CF}',
'.cq-cesta .eco{color:#6EE7A0}',
'.cq-cesta .neg{color:#FCA5A5}',
'.cq-cesta .cq-gf{background:rgba(255,255,255,.06);border-radius:10px;padding:9px 11px;margin-top:8px;font-size:12px}',
'.cq-cesta .cq-gf b{font-weight:800}',
'.cq-cesta .cq-gf small{display:block;color:#B9B9C0;font-weight:600;font-size:11px;margin-top:2px}',
'.cq-cesta .nota{margin:10px 0 0}',
'.cq-peso{display:grid;grid-template-columns:minmax(0,1fr) 44px;gap:3px 10px;align-items:center;margin-bottom:12px}',
'.cq-peso label{font-size:12.5px;font-weight:700}',
'.cq-peso label small{display:block;font-size:11px;color:var(--muted);font-weight:600}',
'.cq-peso b{text-align:right;font-size:13px;font-variant-numeric:tabular-nums}',
'.cq-peso input{grid-column:1/-1;width:100%;accent-color:var(--roxo);margin:2px 0 0}',
'.cq-ml{max-height:520px;overflow:auto;margin:0 -4px;padding:0 4px}',
'.cq-mp{display:grid;grid-template-columns:minmax(0,1fr) 104px 84px 92px;gap:10px;align-items:center;padding:9px 2px;border-bottom:1px solid var(--border)}',
'.cq-mp b{font-size:13px;font-weight:800;display:block}',
'.cq-mp small{font-size:11.5px;color:var(--muted);font-weight:600;display:flex;gap:6px;align-items:center;margin-top:2px;flex-wrap:wrap}',
'.cq-mp .e{text-align:right;font-size:12.5px;font-weight:800;font-variant-numeric:tabular-nums}',
'.cq-mp .e small{justify-content:flex-end}',
'.cq-pc{border:1px solid var(--border);border-radius:14px;padding:14px 16px;background:var(--s1)}',
'.cq-pc+.cq-pc{margin-top:0}',
'.cq-pc .hd{display:flex;align-items:center;gap:10px;margin-bottom:12px}',
'.cq-pc .hd .gr{flex:1;min-width:0}',
'.cq-pc .hd b{font-size:14px;font-weight:800;display:block}',
'.cq-pc .hd small{font-size:11.5px;color:var(--muted);font-weight:600}',
'.cq-ch{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:800;border-radius:99px;padding:3px 9px}',
'.cq-ch svg{width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2}',
'.cq-ch.pdf{background:#FEE2E2;color:#B91C1C}.cq-ch.excel{background:#DCFCE7;color:#107C41}.cq-ch.whatsapp{background:#E7F8EE;color:#128C4A}',
'.cq-step{display:flex;gap:16px;flex-wrap:wrap;font-size:12px;font-weight:700;color:var(--muted2);border-top:1px solid var(--border);padding-top:12px;margin-top:-4px}',
'.cq-step span{display:inline-flex;align-items:center;gap:6px}',
'.cq-step svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;color:var(--muted)}',
'.cq-step b{color:var(--text)}',
'.cq-pass{display:flex;flex-direction:column;gap:12px}',
'.cq-pass .it{display:flex;gap:10px;align-items:flex-start;font-size:12.5px;font-weight:600;color:var(--muted2);line-height:1.4}',
'.cq-pass .it b{color:var(--text);display:block;font-size:12.5px}',
'.cq-pass .bo{flex:none;width:24px;height:24px;border-radius:8px;background:var(--lf-soft);color:var(--roxo);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800}',
'.cq-ft{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:16px;flex-wrap:wrap}',
'.cq-mini{display:flex;gap:18px;flex-wrap:wrap;margin-bottom:14px}',
'.cq-mini div{font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.4px}',
'.cq-mini b{display:block;font-size:18px;color:var(--text);letter-spacing:0;text-transform:none;margin-top:2px}',
'.cq-dg{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}',
'@media (max-width:1100px){.cq-dg{grid-template-columns:minmax(0,1fr)}.cq-dica{display:none}}',
'.cq-wa-ft{display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:11.5px;font-weight:700;color:var(--muted)}',
'@media (max-width:1100px){.cq-env{grid-template-columns:minmax(0,1fr)}.tela-compras .grid.g12{grid-template-columns:minmax(0,1fr)!important}}',
'@media (max-width:900px){.cq-rx,.cq-modos{grid-template-columns:minmax(0,1fr)}.cq-fi{grid-template-columns:minmax(0,1fr)}}',
'@media (max-width:760px){.cq-cot{grid-template-columns:minmax(0,1fr);gap:10px}.cq-pr{text-align:left}.cq-pr .bar{margin-left:0}.cq-mp{grid-template-columns:minmax(0,1fr) 80px;}.cq-mp .e{display:none}}'
].join('\n');
function css(){ if(document.getElementById('css-compras')) return; var s=document.createElement('style'); s.id='css-compras'; s.textContent=CSS; document.head.appendChild(s); }

/* ---------- constantes ---------- */
var PESOS0={preco:40, disp:20, prazo:15, cond:10, qual:15};
var ROT_PESO={preco:['Preço unitário','menor preço entre as propostas'], disp:['Disponibilidade','cobre a quantidade solicitada?'], prazo:['Prazo de entrega','dias até a entrega'], cond:['Condição de pagamento','prazo para pagar'], qual:['Qualidade e pontualidade','histórico do fornecedor']};
var CANAL={pdf:['PDF','pdf','#DC2626'], excel:['Planilha Excel','excel','#107C41'], whatsapp:['Mensagem de WhatsApp','whats','#25D366']};
var ORIGEM={foto:['Foto da lista','foto'], lista:['Lista digitada','lista'], manual:['Seleção manual','estoque'], producao:['Falta na produção','producao'], estoque:['Reposição de estoque','estoque']};
var ATIVOS=['preparacao','aguardando_envio','enviada','aguardando_propostas','propostas_recebidas','comparacao','aprovada'];
var TODOS=LFI.COT_FLUXO.concat(['cancelada']);
var COR_ST={nu:'#8E8E93', wt:'#E9A80B', in:'#1D4ED8', lf:'#FF5A00', ok:'#16A34A', dk:'#1C1C1E', no:'#DC2626'};
var COR_F=['#FF5A00','#1C1C1E','#1D4ED8','#16A34A','#C2185B','#B08A00','#7C3AED','#0891B2'];
var EXEMPLO_FOTO=['20 kg de salmão','15 kg cream cheese','30 kg arroz japonês','10 litros de shoyu','300 folhas de nori'];
var EXEMPLO_TXT='Pedido da padaria para sexta:\n- 8 sacos farinha de trigo\n200 kg de farinha de trigo\n30 kg açúcar cristal\n10 kg manteiga sem sal\n24 litros de leite integral\n30 dúzias de ovos';

function st(){ var s=LFI.estado.compras=LFI.estado.compras||{filtro:'todas', busca:'', abas:{}, pesos:null, nova:null}; if(!s.pesos) s.pesos=JSON.parse(JSON.stringify(PESOS0)); return s; }

/* ---------- utilidades ---------- */
function pad(n){ return (n<10?'0':'')+n; }
function isoMin(d){ return U.iso(d)+'T'+pad(d.getHours())+':'+pad(d.getMinutes()); }
function aData(s){ s=String(s||''); return new Date(s.length>10?s:s+'T12:00'); }
function somaMin(s,m){ var d=aData(s); d.setMinutes(d.getMinutes()+m); return isoMin(d); }
function difMin(a,b){ return Math.round((aData(b)-aData(a))/6e4); }
function dur(m){ if(m==null||isNaN(m)||m<0) return '—'; if(m<60) return m+' min'; var h=Math.floor(m/60), x=m%60; if(h<48) return h+'h'+(x?pad(x):''); return Math.round(h/24)+' dias'; }
function curto(n){ return String(n||'').replace(/\s*\([^)]*\)/,'').trim(); }
function prodN(id){ var p=LFI.prod(id); return p?p.nome:'Produto removido'; }
function unP(id){ var p=LFI.prod(id); return p?p.un:''; }
function qtdP(id,q){ return F.qtd(q,unP(id)); }
function ini(nome){ var w=String(nome||'?').split(/\s+/).filter(function(x){ return x.length>2; }); if(!w.length) w=[String(nome||'?')]; return (w[0][0]+((w[1]||'')[0]||'')).toUpperCase(); }
function primeiro(n){ var w=String(n||'').split(/[\s(]+/).filter(Boolean); if(w.length>1&&/^(chef|seu|dona|sr|sra)\.?$/i.test(w[0])) return w[0]+' '+w[1]; return w[0]||''; }
function hash(s){ var h=2166136261; s=String(s); for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
function slug(s){ return String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9]+/g,''); }
function norm(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); }
function nomeC(n){ return String(n||'').split(' ').slice(0,2).join(' '); }
function cap(s){ s=String(s||''); return s.charAt(0).toUpperCase()+s.slice(1); }
function plural(n,a,b){ return n+' '+(n===1?a:b); }
function cots(){ return LFI.db.cotacoes.filter(function(c){ return LFI.empresaVisivel(c.empresa); }); }
function fornDoProd(prodId){ return LFI.fornecedoresDoProduto(prodId).filter(Boolean); }
function stCot(s){ return (LFI.STATUS.cot[s]||[s,'nu']); }
function canalIc(k){ var c=CANAL[k]||CANAL.whatsapp; return '<span class="cq-ch '+k+'">'+UI.ic(c[1])+(k==='whatsapp'?'WhatsApp':k==='excel'?'Excel':'PDF')+'</span>'; }
function sugQtd(p){ var e=LFI.estoqueGeral(p), q=Math.max(p.estMin*2-e, p.estMin); return p.un==='un'?Math.ceil(q):Math.ceil(q); }

/* último preço praticado por um fornecedor (notas lançadas e propostas) */
function ultPreco(prod, f){
  var best=null;
  LFI.db.notas.forEach(function(n){ if(n.forn!==f||n.status!=='lancada') return; n.itens.forEach(function(it){ if(it.prod===prod&&it.qtd){ var v=r2(it.vProd/(it.qtd*(it.fator||1))); if(!best||n.emissao>best.d) best={d:n.emissao, v:v, o:'NF '+n.numero}; } }); });
  LFI.db.cotacoes.forEach(function(c){ c.propostas.forEach(function(p){ if(p.forn!==f) return; p.itens.forEach(function(it){ if(it.prod===prod&&it.preco>0){ var d=String(p.recebida).slice(0,10); if(!best||d>best.d) best={d:d, v:it.preco, o:c.num}; } }); }); });
  return best;
}

/* ---------- cotação: consultas ---------- */
function propDe(c,f){ for(var i=0;i<c.propostas.length;i++) if(c.propostas[i].forn===f) return c.propostas[i]; return null; }
function propostasOk(c){ return c.propostas.filter(function(p){ return p.conferida!==false; }); }
function enviadaEm(c){ if(c.enviadaEm) return c.enviadaEm; if(c.status==='preparacao'||c.status==='aguardando_envio') return null; if(c.status==='cancelada'&&!c.propostas.length) return null; return somaMin(c.data,12); }
function fornsItem(c, prod){
  if(c.itemForn&&c.itemForn[prod]) return c.itemForn[prod];
  var lig=fornDoProd(prod).map(function(f){ return f.id; });
  var r=c.fornecedores.filter(function(f){ return lig.indexOf(f)>=0; });
  return r.length?r:c.fornecedores.slice();
}
function itensForn(c, f){ return c.itens.filter(function(i){ return fornsItem(c,i.prod).indexOf(f)>=0; }); }
function garantirItemForn(c){ if(c.itemForn) return; c.itemForn={}; c.itens.forEach(function(i){ c.itemForn[i.prod]=fornsItem(c,i.prod).slice(); }); }
function sincForn(c){ var u=[]; c.itens.forEach(function(i){ (c.itemForn[i.prod]||[]).forEach(function(f){ if(u.indexOf(f)<0) u.push(f); }); }); c.fornecedores=u; }
function hist(c, k, t, s){ c.hist=c.hist||[]; c.hist.push({d:LFI.agoraISO(), k:k, t:t, s:s||'', u:LFI.usuario().nome}); }
function temHist(c,k){ return (c.hist||[]).some(function(h){ return h.k===k; }); }
function atualizaStatus(c){
  if(['enviada','aguardando_propostas','propostas_recebidas'].indexOf(c.status)<0) return;
  var resp=c.fornecedores.filter(function(f){ return propDe(c,f); }).length;
  c.status = resp>=c.fornecedores.length ? 'propostas_recebidas' : 'aguardando_propostas';
}

/* oferta de um fornecedor para um item (só propostas conferidas e itens disponíveis) */
function oferta(c, prod, f){
  var p=propDe(c,f); if(!p||p.conferida===false) return null;
  var it=null; p.itens.forEach(function(x){ if(x.prod===prod) it=x; });
  if(!it||!(it.preco>0)||!(it.qtdDisp>0)) return null;
  return {forn:f, prop:p, preco:it.preco, qtdDisp:it.qtdDisp, prazo:p.prazo, cond:p.cond, frete:p.frete||0};
}
function diasCond(s){ var n=(String(s||'').match(/\d+/g)||[]).map(Number); if(!n.length) return /semanal/i.test(s)?7:/vista/i.test(s)?0:14; return n.reduce(function(a,b){ return a+b; },0)/n.length; }
function qualF(fo){ return (fo.qualidade/5)*0.6+(fo.pontualidade/100)*0.4; }

/* análise ponderada: nota de 0 a 100 por item × fornecedor */
function analise(c){
  var W=st().pesos, tw=(W.preco+W.disp+W.prazo+W.cond+W.qual)||1;
  var fs=propostasOk(c).map(function(p){ return p.forn; }).filter(function(f){ return LFI.forn(f); });
  var linhas=c.itens.map(function(i){
    var ofs=fs.map(function(f){ return oferta(c,i.prod,f); }).filter(Boolean), por={};
    var minP=Infinity, maxP=0, soma=0, minPz=Infinity, maxC=0;
    ofs.forEach(function(o){ minP=Math.min(minP,o.preco); maxP=Math.max(maxP,o.preco); soma+=o.preco; minPz=Math.min(minPz,o.prazo); maxC=Math.max(maxC,diasCond(o.cond)); });
    ofs.forEach(function(o){ var fo=LFI.forn(o.forn);
      o.s={preco:minP/o.preco, disp:Math.min(1,o.qtdDisp/i.qtd), prazo:(1+minPz)/(1+o.prazo), cond:maxC?diasCond(o.cond)/maxC:1, qual:qualF(fo)};
      o.score=Math.round((W.preco*o.s.preco+W.disp*o.s.disp+W.prazo*o.s.prazo+W.cond*o.s.cond+W.qual*o.s.qual)/tw*100);
      por[o.forn]=o; });
    var rec=null, men=null;
    ofs.forEach(function(o){ if(!rec||o.score>rec.score||(o.score===rec.score&&o.preco<rec.preco)) rec=o; if(!men||o.preco<men.preco||(o.preco===men.preco&&o.qtdDisp>men.qtdDisp)) men=o; });
    return {item:i, prod:LFI.prod(i.prod), ofs:ofs, por:por, minP:ofs.length?minP:0, maxP:maxP, media:ofs.length?soma/ofs.length:0, rec:rec?rec.forn:null, menor:men?men.forn:null};
  });
  return {fs:fs, linhas:linhas};
}
function mapaRec(A){ var m={}; A.linhas.forEach(function(l){ if(l.rec) m[l.item.prod]=l.rec; }); return m; }
function mapaMenor(A){ var m={}; A.linhas.forEach(function(l){ if(l.menor) m[l.item.prod]=l.menor; }); return m; }
/* cesta: valor, economia e logística para um conjunto de escolhas {prod: forn} */
function cesta(A, E){
  var porF={}, ordem=[], K={itens:0, fretes:0, total:0, econMed:0, econPior:0, econCM:0, maxPrazo:0, sem:0, parciais:[], n:0};
  A.linhas.forEach(function(l){
    var f=E[l.item.prod], o=f&&l.por[f]; if(!o){ if(l.ofs.length) K.sem++; else K.sem++; return; }
    var q=Math.min(l.item.qtd,o.qtdDisp), v=r2(q*o.preco);
    if(o.qtdDisp<l.item.qtd-0.0001) K.parciais.push({l:l, o:o, falta:r3(l.item.qtd-o.qtdDisp)});
    if(!porF[f]){ porF[f]={forn:f, itens:[], valor:0, frete:o.frete, prazo:o.prazo, cond:o.cond}; ordem.push(f); }
    porF[f].itens.push({prod:l.item.prod, qtd:r3(q), preco:o.preco}); porF[f].valor=r2(porF[f].valor+v);
    K.econMed+=(l.media-o.preco)*q; K.econPior+=(l.maxP-o.preco)*q; K.econCM+=((l.prod?l.prod.custoMedio:o.preco)-o.preco)*q;
  });
  ordem.forEach(function(f){ var g=porF[f]; K.itens+=g.valor; K.fretes+=g.frete; K.maxPrazo=Math.max(K.maxPrazo,g.prazo); });
  K.itens=r2(K.itens); K.fretes=r2(K.fretes); K.total=r2(K.itens+K.fretes); K.econMed=r2(K.econMed); K.econPior=r2(K.econPior); K.econCM=r2(K.econCM);
  K.porF=porF; K.ordem=ordem; K.n=ordem.length; K.entrega=K.n?U.D(K.maxPrazo):null;
  return K;
}
function cestaAtual(c, A){ var E=c.escolhas&&Object.keys(c.escolhas).length?c.escolhas:mapaRec(A); return cesta(A,E); }
function totalProposta(c, p){ var t=0, n=0; p.itens.forEach(function(it){ var ci=null; c.itens.forEach(function(x){ if(x.prod===it.prod) ci=x; }); if(ci&&it.preco>0&&it.qtdDisp>0){ t+=Math.min(ci.qtd,it.qtdDisp)*it.preco; n++; } }); return {valor:r2(t), total:r2(t+(n?(p.frete||0):0)), n:n}; }

/* ---------- simulação de proposta de fornecedor ---------- */
function gerarProposta(c, f, canal){
  var R=U.rng(hash(c.id+'|'+f+'|'+c.propostas.length)), fo=LFI.forn(f), pedidos=itensForn(c,f).map(function(i){ return i.prod; });
  var itens=c.itens.map(function(i){
    var p=LFI.prod(i.prod);
    if(pedidos.indexOf(i.prod)<0) return {prod:i.prod, preco:0, qtdDisp:0, disp:false};
    var atende=fo.cats.indexOf(p.cat)>=0||p.forn===f||(p.fornAlt||[]).indexOf(f)>=0, x=R();
    if(!atende||x<0.12) return {prod:i.prod, preco:0, qtdDisp:0, disp:false};
    var preco=r2(p.custoMedio*(0.93+R()*0.16)), q=i.qtd;
    if(R()<0.22){ q=i.qtd*(0.5+R()*0.3); q = p.un==='un'?Math.round(q):Math.round(q); if(q<1) q=1; }
    return {prod:i.prod, preco:preco, qtdDisp:r3(q), disp:true};
  });
  if(!itens.some(function(x){ return x.disp; })){ var k=c.itens.findIndex(function(i){ return pedidos.indexOf(i.prod)>=0; }); if(k<0) k=0; var p0=LFI.prod(c.itens[k].prod); itens[k]={prod:p0.id, preco:r2(p0.custoMedio*1.04), qtdDisp:c.itens[k].qtd, disp:true}; }
  var num=c.num.split('-').pop();
  var pr={forn:f, canal:canal, recebida:LFI.agoraISO(), prazo:(fo.prazo||2)+(R()<0.3?1:0), cond:fo.cond, frete:R()<0.5?0:r2(25+Math.round(R()*5)*7), arquivo:null, msg:null, conferida:false, itens:itens};
  if(canal==='pdf') pr.arquivo='Proposta_'+slug(fo.nome)+'_COT'+num+'.pdf';
  if(canal==='excel') pr.arquivo='Cotacao_'+slug(fo.nome)+'_'+num+'.xlsx';
  if(canal==='whatsapp') pr.msg=msgProposta(c,pr);
  return pr;
}
function msgProposta(c, pr){
  var linhas=[], falta=[], pedidos=itensForn(c,pr.forn).map(function(i){ return i.prod; });
  pr.itens.forEach(function(it){ if(pedidos.indexOf(it.prod)<0) return; var p=LFI.prod(it.prod), nm=curto(p.nome).toLowerCase(), ped=0; c.itens.forEach(function(i){ if(i.prod===it.prod) ped=i.qtd; });
    if(!(it.preco>0)||!(it.qtdDisp>0)){ falta.push(nm); return; }
    var und=p.un==='un'?'a unidade':p.un==='L'?'o litro':'o kg';
    linhas.push(cap(nm)+' R$ '+F.num(it.preco,2)+' '+und+(it.qtdDisp<ped?', só tenho '+F.qtd(it.qtdDisp,p.un):', tenho os '+F.qtd(it.qtdDisp,p.un)));
  });
  return 'Bom dia, '+primeiro(c.resp)+'! Segue a cotação ('+c.num+'):\n'+linhas.join('\n')+(falta.length?'\n'+cap(falta.join(', '))+' não temos no momento.':'')+'\nEntrega em '+pr.prazo+' dia'+(pr.prazo>1?'s':'')+', pagamento '+pr.cond+(pr.frete?', frete R$ '+F.num(pr.frete,2):', frete grátis')+'.';
}
/* destaca o que a leitura de linguagem natural extraiu da mensagem */
function realca(txt){
  return esc(txt).replace(/(R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)|(\b\d+(?:,\d+)?\s?(?:kg|L|litros?|un|folhas|unidades)\b)|(\b\d+(?:\/\d+)?\s?dias?\b|frete grátis)|(não temos|não trabalhamos|em falta|sem estoque)/gi,
    function(m,a,b,c2,d){ var k=a?'pr':b?'qt':c2?'pz':'no'; return '<mark class="cq-nlp '+k+'">'+m+'</mark>'; });
}
function legendaNlp(){ return '<div class="cq-leg"><span><i style="background:#86EFAC"></i>Preço</span><span><i style="background:#93C5FD"></i>Quantidade</span><span><i style="background:#FCD34D"></i>Prazo e condições</span><span><i style="background:#FCA5A5"></i>Indisponível</span></div>'; }

/* ---------- mensagens de WhatsApp ---------- */
function msgCot(c, f){
  var fo=LFI.forn(f), dep=LFI.dep(c.dep), emp=LFI.emp(c.empresa), its=itensForn(c,f);
  return 'Olá, '+primeiro(fo.contato)+'! Aqui é '+primeiro(c.resp)+', do setor de compras do '+LFI.db.grupo.nome+' ('+emp.fantasia+').\n\n'+
    'Gostaríamos de uma cotação para:\n'+its.map(function(i){ return '• '+curto(prodN(i.prod))+' — '+qtdP(i.prod,i.qtd); }).join('\n')+
    '\n\nEntrega: '+(dep?dep.nome:'')+' — '+emp.endereco+' ('+emp.cidade+'/'+emp.uf+')\nResponder até: '+F.dataHora(c.prazoRetorno)+
    '\n\nPor favor, informe preço unitário, quantidade disponível, prazo de entrega, condição de pagamento e frete. Pode responder por aqui, em PDF ou planilha.\n\nRef.: '+c.num;
}
function waHd(fo, sub){ return '<div class="wa-hd"><span class="av">'+esc(ini(fo.nome))+'</span><div><b>'+esc(fo.nome)+'</b><small>'+esc(sub||(fo.whats+' · '+fo.contato))+'</small></div><span style="margin-left:auto" class="wa-tag">'+UI.ic('whats')+'WhatsApp Business</span></div>'; }
function waConversa(c, f, o){
  o=o||{}; var fo=LFI.forn(f), env=c.envios&&c.envios[f]||enviadaEm(c), p=propDe(c,f);
  var h='<div class="wa">'+waHd(fo)+'<div class="wa-b out">'+esc(msgCot(c,f))+'<span class="h">'+(env?F.hora(env)+' ✓✓':'prévia · não enviada')+'</span></div>';
  if(p&&!o.semResposta){
    if(p.canal==='whatsapp') h+='<div class="wa-b in">'+(o.realce?realca(p.msg||''):esc(p.msg||''))+'<span class="h">'+F.hora(p.recebida)+'</span></div>';
    else h+='<div class="wa-b in"><div class="wa-doc"><span class="ic" style="background:'+CANAL[p.canal][2]+'">'+(p.canal==='pdf'?'PDF':'XLS')+'</span><span>'+esc(p.arquivo||'arquivo')+'<small style="display:block;color:#667781;font-weight:600">'+(p.canal==='pdf'?'1 página · PDF':'Planilha do Excel')+'</small></span></div>Segue nossa proposta para a '+esc(c.num)+'.<span class="h">'+F.hora(p.recebida)+'</span></div>';
  }
  return h+'</div>';
}

/* ---------- documentos originais (PDF, planilha, mensagem) ---------- */
function docPdf(c, pr){
  var fo=LFI.forn(pr.forn), emp=LFI.emp(c.empresa), tot=0, n=0, pedidos=itensForn(c,pr.forn).map(function(i){ return i.prod; });
  var rows=pr.itens.filter(function(it){ return pedidos.indexOf(it.prod)>=0; }).map(function(it){ var p=LFI.prod(it.prod); n++; var ok=it.preco>0&&it.qtdDisp>0, v=ok?it.preco*it.qtdDisp:0; tot+=v;
    return '<tr><td>'+pad(n)+'</td><td>'+esc(((p.apelidos&&p.apelidos[0])||p.nome).toUpperCase())+'</td><td>'+p.un.toUpperCase()+'</td><td class="r">'+(ok?F.num(it.qtdDisp):'—')+'</td><td class="r">'+(ok?F.num(it.preco,2):'<span class="ind">SEM ESTOQUE</span>')+'</td><td class="r">'+(ok?F.num(v,2):'—')+'</td></tr>'; }).join('');
  return '<div class="cq-doc"><div class="cq-doc-hd"><div><b>'+esc(fo.razao.toUpperCase())+'</b><small>CNPJ '+fo.cnpj+' · '+esc(fo.cidade)+'/'+fo.uf+'</small><small>'+esc(fo.email)+' · '+fo.whats+'</small></div><div class="r"><b>PROPOSTA COMERCIAL</b><small>Nº '+(1000+hash(c.id+pr.forn)%9000)+'/26</small><small>Ref.: '+esc(c.num)+'</small></div></div>'+
    '<div class="cq-doc-to">A/C: '+esc(c.resp)+' — '+esc(emp.razao)+' · CNPJ '+emp.cnpj+'</div>'+
    '<table><thead><tr><th>Item</th><th>Descrição</th><th>Un</th><th class="r">Qtd</th><th class="r">Vlr unit.</th><th class="r">Total</th></tr></thead><tbody>'+rows+'</tbody></table>'+
    '<div class="cq-doc-ft"><span><b>Prazo de entrega:</b> '+pr.prazo+' dia(s)</span><span><b>Pagamento:</b> '+esc(pr.cond)+'</span><span><b>Frete:</b> '+(pr.frete?F.moeda(pr.frete):'CIF (incluso)')+'</span><span><b>Validade:</b> 3 dias</span></div>'+
    '<div class="cq-doc-tot">Valor total: '+F.moeda(tot+(pr.frete||0))+'</div></div>';
}
function docXls(c, pr){
  var fo=LFI.forn(pr.forn), pedidos=itensForn(c,pr.forn).map(function(i){ return i.prod; }), r=3;
  var h='<div class="cq-xl"><div class="cq-xl-bar">'+UI.ic('excel')+esc(pr.arquivo||'planilha.xlsx')+'<span>Planilha1</span></div><div class="w"><table><tr><th></th><th>A</th><th>B</th><th>C</th><th>D</th><th>E</th><th>F</th></tr>'+
    '<tr class="t"><td class="rn">1</td><td colspan="6">COTAÇÃO '+esc(fo.nome.toUpperCase())+' — REF. '+esc(c.num)+'</td></tr>'+
    '<tr class="h"><td class="rn">2</td><td>Código</td><td>Produto</td><td>Un</td><td class="n">Qtd disp.</td><td class="n">Preço unit.</td><td class="n">Prazo (dias)</td></tr>';
  pr.itens.forEach(function(it){ if(pedidos.indexOf(it.prod)<0) return; var p=LFI.prod(it.prod), ok=it.preco>0&&it.qtdDisp>0;
    h+='<tr><td class="rn">'+r+'</td><td>'+esc(slug(fo.nome).slice(0,2).toUpperCase()+'-'+(100+hash(it.prod)%900))+'</td><td>'+esc(curto(p.nome))+'</td><td>'+p.un+'</td><td class="n">'+(ok?F.num(it.qtdDisp):'0')+'</td><td class="n sel">'+(ok?F.num(it.preco,2):'em falta')+'</td><td class="n">'+pr.prazo+'</td></tr>'; r++; });
  h+='<tr><td class="rn">'+r+'</td><td colspan="6"></td></tr><tr><td class="rn">'+(r+1)+'</td><td>Pagamento</td><td colspan="5">'+esc(pr.cond)+'</td></tr><tr><td class="rn">'+(r+2)+'</td><td>Frete</td><td colspan="5">'+(pr.frete?F.num(pr.frete,2):'Grátis')+'</td></tr></table></div></div>';
  return h;
}
function original(c, pr, realce){
  if(pr.canal==='pdf') return '<div class="cq-docf"><span class="ic" style="background:#DC2626">PDF</span><div>'+esc(pr.arquivo||'proposta.pdf')+'<small>Recebido pelo WhatsApp · '+F.dataHora(pr.recebida)+'</small></div></div>'+docPdf(c,pr);
  if(pr.canal==='excel') return '<div class="cq-docf"><span class="ic" style="background:#107C41">XLS</span><div>'+esc(pr.arquivo||'cotacao.xlsx')+'<small>Recebido pelo WhatsApp · '+F.dataHora(pr.recebida)+'</small></div></div>'+docXls(c,pr);
  var fo=LFI.forn(pr.forn);
  return '<div class="wa">'+waHd(fo)+'<div class="wa-b out" style="max-width:70%">Olá, '+esc(primeiro(fo.contato))+'! Pode nos passar a cotação da '+esc(c.num)+'?<span class="h">'+F.hora(enviadaEm(c)||c.data)+' ✓✓</span></div><div class="wa-b in">'+(realce?realca(pr.msg||''):esc(pr.msg||''))+'<span class="h">'+F.hora(pr.recebida)+'</span></div></div>'+(realce?legendaNlp():'');
}
function papel(linhas, titulo, cls, lidas){
  return '<div class="foto-moldura '+(cls||'')+'"><span class="cam">IMG_'+(2041+linhas.length)+'.jpg</span><div class="cq-scanw" id="cq-scan"><div class="papel"><div class="tit">'+esc(titulo||'Pedido do sushi')+'</div>'+
    linhas.map(function(l,i){ return '<div data-l="'+i+'" class="'+(lidas?'cq-ok':'')+'">'+esc(l)+'</div>'; }).join('')+'<div style="text-align:right;font-size:.85em;padding-right:8px">— Hiro</div></div></div></div>';
}
function linhasFoto(c){ if(c.fotoTexto&&c.fotoTexto.length) return c.fotoTexto; return c.itens.map(function(i){ var p=LFI.prod(i.prod), u=p.un==='L'?(i.qtd>1?'litros':'litro'):p.un==='un'?'un':'kg'; return F.num(i.qtd)+' '+u+' de '+curto(p.nome).toLowerCase(); }); }

/* =====================================================================
   CENTRAL DE COTAÇÕES
   ===================================================================== */
function render(el, arg){
  css();
  if(arg==='nova') return renderNova2(el);
  if(arg){ var c=LFI.cotacao(arg); if(c) return renderDetalhe2(el, c);
    el.innerHTML=UI.cabecalho({migalha:[{t:'Compras',ir:'compras'},{t:'Não encontrada'}], titulo:'Cotação não encontrada'})+'<div class="card">'+UI.vazio('A cotação solicitada não existe ou foi removida.','🔎')+'</div>'; UI.liga(el,UI.navHandlers()); return; }
  renderLista2(el);
}

function renderLista(el){
  var s=st(), todas=cots(), emp=LFI.empresaAtual(), cont={};
  todas.forEach(function(c){ cont[c.status]=(cont[c.status]||0)+1; });
  var q=norm(s.busca);
  var ls=todas.filter(function(c){
    if(s.filtro==='ativas'&&ATIVOS.indexOf(c.status)<0) return false;
    if(s.filtro!=='todas'&&s.filtro!=='ativas'&&c.status!==s.filtro) return false;
    if(q){ var txt=norm(c.num+' '+c.resp+' '+c.itens.map(function(i){ return prodN(i.prod); }).join(' ')+' '+c.fornecedores.map(function(f){ var fo=LFI.forn(f); return fo?fo.nome:''; }).join(' ')); if(txt.indexOf(q)<0) return false; }
    return true; }).sort(function(a,b){ return a.data<b.data?1:-1; });

  /* indicadores */
  var ativas=todas.filter(function(c){ return ATIVOS.indexOf(c.status)>=0; });
  var aguard=todas.filter(function(c){ return c.status==='enviada'||c.status==='aguardando_propostas'; });
  var pend=0; aguard.forEach(function(c){ pend+=c.fornecedores.filter(function(f){ return !propDe(c,f); }).length; });
  var econ=0, econN=0; ativas.forEach(function(c){ if(!propostasOk(c).length) return; var K=cestaAtual(c, analise(c)); econ+=K.econPior; econN++; });
  var tm=[], porCanal={pdf:0, excel:0, whatsapp:0};
  todas.forEach(function(c){ var e=enviadaEm(c); c.propostas.forEach(function(p){ porCanal[p.canal]=(porCanal[p.canal]||0)+1; if(e){ var m=difMin(e,p.recebida); if(m>0) tm.push(m); } }); });
  var tMed=tm.length?Math.round(tm.reduce(function(a,b){ return a+b; },0)/tm.length):null;

  var h=UI.cabecalho({titulo:'Compras Inteligentes', sub:'Cotações pelo WhatsApp com leitura automática de propostas · '+(emp?esc(emp.fantasia)+' · CNPJ '+emp.cnpj:'consolidado de '+LFI.db.empresas.length+' CNPJs'),
    acoes:'<button class="btn sec sm" data-act="novaModo" data-id="texto">'+UI.ic('lista')+'Lista digitada</button><button class="btn sec sm" data-act="novaModo" data-id="foto">'+UI.ic('foto')+'Foto da lista</button><button class="btn pri sm" data-act="novaModo" data-id="manual">'+UI.ic('mais')+'Nova solicitação</button>'});
  h+='<div class="kpis">'+
    UI.kpi({lb:'Cotações em andamento', vl:String(ativas.length), dl:(cont.comparacao||0)+' em comparação · '+(cont.preparacao||0)+' em preparação', act:'filtro', id:'ativas'})+
    UI.kpi({lb:'Aguardando propostas', vl:String(aguard.length), dl:plural(pend,'fornecedor sem resposta','fornecedores sem resposta'), act:'filtro', id:'aguardando_propostas'})+
    UI.kpi({lb:'Economia potencial', vl:F.moeda(econ), dl:'vs. maior preço cotado · '+plural(econN,'cotação','cotações'), hl:true})+
    UI.kpi({lb:'Tempo médio de resposta', vl:tMed==null?'—':dur(tMed), dl:tm.length+' propostas recebidas por WhatsApp, PDF e Excel'})+
  '</div>';

  /* funil de status */
  h+='<div class="cq-pipe"><button class="tot'+(s.filtro==='todas'?' on':'')+'" data-act="filtro" data-id="todas" style="--c:var(--text)"><b>'+todas.length+'</b><span>Todas as cotações</span></button>'+
    TODOS.map(function(k){ var d=stCot(k), n=cont[k]||0; return '<button class="'+(s.filtro===k?'on':'')+(n?'':' z')+'" data-act="filtro" data-id="'+k+'" style="--c:'+COR_ST[d[1]]+'"><b>'+n+'</b><span>'+esc(k==='convertida'?'Convertida em ordem de compra':d[0])+'</span></button>'; }).join('')+'</div>';

  h+='<div class="grid g21"><div>';
  h+='<div class="barra"><div class="search">'+UI.ic('busca')+'<input id="cq-busca" placeholder="Buscar por número, produto, fornecedor ou responsável" value="'+esc(s.busca)+'" data-inp="busca"></div><span class="sp"></span><span style="font-size:12.5px;font-weight:700;color:var(--muted)">'+plural(ls.length,'cotação','cotações')+(s.filtro!=='todas'?' · '+esc(s.filtro==='ativas'?'em andamento':stCot(s.filtro)[0])+' <button class="vertodos" data-act="filtro" data-id="todas">limpar filtro</button>':'')+'</span></div>';
  h+='<div class="cq-lista" id="cq-lista">'+(ls.length?ls.map(cardCot).join(''):'<div class="card">'+UI.vazio(s.busca?'Nenhuma cotação encontrada para "'+s.busca+'".':'Nenhuma cotação neste status.','🗂️')+'</div>')+'</div>';
  h+='</div><div>';

  /* reposição sugerida */
  var baixos=LFI.alertas().filter(function(a){ return a.tipo==='critico'||a.tipo==='baixo'; }).map(function(a){ return LFI.prod(a.prod); }).filter(function(p){ return p&&p.tipo==='insumo'; });
  h+='<div class="card"><h3><span class="lft">'+UI.ic('estoque')+' Reposição sugerida <span class="n">'+baixos.length+'</span></span><button class="vertodos" data-act="_ir" data-id="estoque">Estoque</button></h3>';
  h+=baixos.length?'<div class="lst">'+baixos.slice(0,6).map(function(p){ return '<div class="li cl" data-act="_ir" data-id="estoque/'+p.id+'"><div class="gr"><div class="tt">'+esc(p.nome)+'</div><div class="dd">Estoque '+F.qtd(LFI.estoqueGeral(p),p.un)+' · mínimo '+F.qtd(p.estMin,p.un)+'</div></div><div class="rt">'+UI.situacao(p)+'<small>sugerido '+F.qtd(sugQtd(p),p.un)+'</small></div></div>'; }).join('')+'</div>'+
      '<button class="btn pri sm wide" style="margin-top:12px" data-act="cotarBaixos">'+UI.ic('raio')+'Cotar '+plural(baixos.length,'item abaixo do mínimo','itens abaixo do mínimo')+'</button>' : UI.vazio('Nenhum item abaixo do mínimo','✅');
  h+='</div>';
  h+='<div class="card"><h3><span class="lft">'+UI.ic('whats')+' Propostas por canal</span><small>leitura automática</small></h3><div id="cq-canal"></div></div>';
  h+='<div class="card"><h3><span class="lft">'+UI.ic('ia')+' Como funciona a rodada</span></h3><div class="cq-pass">'+
    [['Lista da cozinha','Foto do papel, texto livre ou seleção pelo estoque mínimo.'],['Fornecedores vinculados','Cada produto já sabe quem o fornece (principal e alternativos).'],['WhatsApp automático','Mensagem personalizada com itens, quantidades e prazo de retorno.'],['Propostas lidas','PDF, planilha ou mensagem: preços extraídos e conferidos.'],['Comparador ponderado','Preço, disponibilidade, prazo, pagamento e qualidade.'],['OC consolidada','Uma compra, uma ordem por fornecedor.']].map(function(x,i){ return '<div class="it"><span class="bo">'+(i+1)+'</span><div><b>'+x[0]+'</b>'+x[1]+'</div></div>'; }).join('')+'</div></div>';
  h+='</div></div>';
  el.innerHTML=h;

  UI.grafRosca(el.querySelector('#cq-canal'),{itens:[{nome:'WhatsApp', valor:porCanal.whatsapp, cor:'#25D366'},{nome:'PDF', valor:porCanal.pdf, cor:'#DC2626'},{nome:'Excel', valor:porCanal.excel, cor:'#107C41'}], fmt:function(v){ return String(v); }, centro:{valor:String(porCanal.whatsapp+porCanal.pdf+porCanal.excel), rotulo:'propostas'}});

  UI.liga(el, UI.navHandlers({
    filtro:function(id){ s.filtro=id; LFI.recarregar(); },
    busca:function(_,ev){ s.busca=ev.target.value; var qq=norm(s.busca); UI.els('.cq-cot',el).forEach(function(n){ n.style.display=!qq||norm(n.getAttribute('data-busca')).indexOf(qq)>=0?'':'none'; }); },
    abrir:function(id){ LFI.ir('compras', id); },
    novaModo:function(m){ var n=novaSt(true); n.modo=m; LFI.ir('compras','nova'); },
    cotarBaixos:function(){ var n=novaSt(true); n.modo='manual'; baixos.forEach(function(p){ n.carrinho[p.id]=sugQtd(p); }); n.itens=itensDoCarrinho(n); n.passo=1; LFI.ir('compras','nova'); }
  }));
}

function cardCot(c){
  var d=stCot(c.status), resp=c.fornecedores.filter(function(f){ return propDe(c,f); }).length, tot=c.fornecedores.length;
  var aguardando=['preparacao','aguardando_envio','enviada','aguardando_propostas'].indexOf(c.status)>=0;
  var venc=aguardando&&c.prazoRetorno<LFI.agoraISO();
  var o=ORIGEM[c.origem]||ORIGEM.manual, K=null;
  if(propostasOk(c).length) K=cestaAtual(c, analise(c));
  var busca=c.num+' '+c.resp+' '+c.itens.map(function(i){ return prodN(i.prod); }).join(' ')+' '+c.fornecedores.map(function(f){ var fo=LFI.forn(f); return fo?fo.nome:''; }).join(' ');
  var chips=c.itens.slice(0,5).map(function(i){ return '<span class="cq-chip">'+esc(curto(prodN(i.prod)))+' <b>'+esc(qtdP(i.prod,i.qtd))+'</b></span>'; }).join('')+(c.itens.length>5?'<span class="cq-chip">+'+(c.itens.length-5)+'</span>':'');
  var avs=c.fornecedores.slice(0,6).map(function(f){ var fo=LFI.forn(f); if(!fo) return ''; var p=propDe(c,f); return '<span class="'+(p?'ok':'')+'" title="'+esc(fo.nome+(p?' · respondeu ('+CANAL[p.canal][0]+')':' · aguardando resposta'))+'">'+esc(ini(fo.nome))+'</span>'; }).join('');
  var dir;
  if(c.status==='convertida') dir='<div class="x">'+plural((c.ordens||[]).length,'OC','OCs')+'</div><small>'+(K?'<span class="val">'+F.moeda(K.total)+'</span> · ':'')+'compra consolidada</small>';
  else if(c.status==='cancelada') dir='<small>'+esc((c.motivo||c.obs||'').slice(0,60))+'</small>';
  else if(c.status==='preparacao'||c.status==='aguardando_envio') dir='<small>Prazo de retorno</small><div class="x" style="font-size:14px">'+F.relativo(c.prazoRetorno)+'</div><small>'+plural(tot,'fornecedor a acionar','fornecedores a acionar')+'</small>';
  else dir='<div class="x">'+resp+'<span class="de"> / '+tot+' propostas</span></div>'+UI.bar(tot?resp/tot:0, resp>=tot?'ok':'')+'<small class="'+(venc?'venc':'')+'">'+(venc?'Prazo vencido · ':'Retorno até ')+F.relativo(c.prazoRetorno)+'</small>'+(K&&K.n?'<small>Melhor cesta <span class="val">'+F.moeda(K.total)+'</span></small>':'');
  return '<div class="cq-cot" data-act="abrir" data-id="'+c.id+'" data-busca="'+esc(busca)+'" style="--c:'+COR_ST[d[1]]+'">'+
    '<div><div class="n"><b>'+esc(c.num)+'</b>'+UI.status('cot',c.status)+'</div><div class="mt">'+UI.ic(o[1])+esc(o[0])+' · '+F.relativo(c.data)+'<br>'+esc(c.resp)+' · '+UI.dep(c.dep)+' '+UI.empTag(c.empresa)+'</div></div>'+
    '<div><div class="cq-chips">'+chips+'</div><div class="cq-fs"><span class="cq-avs">'+avs+'</span>'+plural(tot,'fornecedor acionado','fornecedores acionados')+'</div></div>'+
    '<div class="cq-pr">'+dir+'</div></div>';
}

/* =====================================================================
   NOVA SOLICITAÇÃO (foto · texto · seleção manual)
   ===================================================================== */
function novaSt(reset){ var s=st(); if(reset||!s.nova) s.nova={passo:0, modo:'foto', foto:'vazio', arquivo:null, fotoURL:null, texto:'', itens:[], busca:'', cat:'', soBaixo:false, carrinho:{}, forn:null, dep:null, prazo:null, obs:'', resp:LFI.usuario().nome, enviar:true, revF:null}; return s.nova; }
function lerItens(txt){ return LFI.lerLista(txt).map(function(x){ return {uid:LFI.novoId('l'), texto:x.texto, prod:x.prod, qtd:x.qtd, score:x.score, alt:x.alternativas||[], manual:false}; }); }
function itensDoCarrinho(n){ return Object.keys(n.carrinho).map(function(id){ return {uid:LFI.novoId('l'), texto:'', prod:id, qtd:n.carrinho[id], score:100, alt:[], manual:false, sel:true}; }); }

function renderNova(el){
  var n=novaSt();
  var h=UI.cabecalho({migalha:[{t:'Compras',ir:'compras'},{t:'Nova solicitação'}], titulo:'Nova solicitação de compra', sub:'Da lista da cozinha à rodada de cotação com os fornecedores, sem redigitar nada',
    acoes:'<button class="btn gh sm" data-act="sair">'+UI.ic('x')+'Descartar</button>'});
  h+='<div class="card mb" style="padding:16px 20px 0">'+UI.passos(['Lista de compras','Conferência dos itens','Fornecedores e prazo','Revisão e envio'], n.passo)+'</div>';
  if(n.passo===0) h+=passoEntrada(n);
  else if(n.passo===1) h+=passoConferencia(n);
  else if(n.passo===2) h+=passoFornecedores(n);
  else h+=passoRevisao(n);
  el.innerHTML=h;
  UI.liga(el, UI.navHandlers(handlersNova(el,n)));
  if(n.passo===0&&n.modo==='foto'&&n.foto==='lendo') animarFoto(el,n);
}

function passoEntrada(n){
  var modos=[['foto','foto','Foto de lista escrita à mão','Fotografe o papel da cozinha: o sistema lê a letra e identifica produtos e quantidades.'],['texto','lista','Lista digitada','Cole ou digite a lista em texto livre, como mandaria no WhatsApp.'],['manual','estoque','Seleção de produtos','Escolha no cadastro vendo o estoque atual e o mínimo de cada item.']];
  var h='<div class="cq-modos">'+modos.map(function(m){ return '<button type="button" class="cq-modo'+(n.modo===m[0]?' on':'')+'" data-act="modo" data-id="'+m[0]+'"><span class="av lf">'+UI.ic(m[1])+'</span><span><b>'+m[2]+'</b><small>'+m[3]+'</small></span></button>'; }).join('')+'</div>';
  if(n.modo==='foto'){
    if(n.foto==='lendo'){
      h+='<div class="grid g2"><div class="card"><h3><span class="lft">'+UI.ic('foto')+' Foto recebida</span><small>'+esc(n.arquivo||'lista_sushi.jpg')+'</small></h3>'+(n.fotoURL?'<div class="cq-thumb"><img src="'+n.fotoURL+'" alt=""><div>Imagem enviada: '+esc(n.arquivo)+'<small style="display:block;color:var(--muted);font-weight:600">Protótipo: a leitura é demonstrada com a lista de exemplo abaixo.</small></div></div>':'')+papel(EXEMPLO_FOTO,'Pedido do sushi — qui')+'</div>'+
        '<div class="card"><h3><span class="lft">'+UI.ic('ia')+' Lendo a lista</span><small>reconhecimento de escrita à mão</small></h3><div class="leitura">'+
        ['Foto recebida e endireitada (correção de perspectiva)','Reconhecimento da escrita à mão','Interpretação de quantidades e unidades','Correspondência com o cadastro de produtos','Consulta de estoque atual e mínimo'].map(function(t,i){ return '<div class="lt-it" id="cq-lt'+i+'"><span class="bo"></span>'+esc(t)+'</div>'; }).join('')+
        '</div><div id="cq-lt-txt" style="margin-top:16px"></div></div></div>';
    } else {
      h+='<div class="grid g2"><div class="card"><h3><span class="lft">'+UI.ic('foto')+' Fotografar ou enviar a lista</span></h3>'+
        '<label class="drop"><input type="file" accept="image/*" capture="environment" data-chg="arquivo"><div class="ic">'+UI.ic('foto')+'</div><b>Tirar foto ou escolher imagem</b><small>No celular abre a câmera · JPG, PNG ou HEIC</small></label>'+
        '<div style="text-align:center;margin:14px 0 4px;font-size:12px;font-weight:700;color:var(--muted)">ou</div><button class="btn esc wide" data-act="fotoEx">'+UI.ic('play')+'Usar foto de exemplo (lista do Chef Hiro)</button>'+
        UI.nota('Protótipo: a leitura da imagem é simulada. O resultado passa sempre pela sua conferência antes de virar cotação.','in')+'</div>'+
        '<div class="card"><h3><span class="lft">'+UI.ic('info')+' Dicas para uma boa leitura</span></h3><div class="grid cq-dg" style="gap:18px;align-items:center"><div class="cq-pass">'+
        [['Um item por linha','Quantidade, unidade e produto: "20 kg de salmão".'],['Unidades livres','kg, g, litros, ml, un, cx, dúzias, folhas…'],['Apelidos aprendidos','"Arroz p/ sushi" e "nori" já são reconhecidos.'],['Confiança por item','Itens com baixa confiança ficam destacados.']].map(function(x,i){ return '<div class="it"><span class="bo">'+(i+1)+'</span><div><b>'+x[0]+'</b>'+x[1]+'</div></div>'; }).join('')+
        '</div><div class="cq-sm cq-dica" style="opacity:.92">'+papel(EXEMPLO_FOTO.slice(0,4),'Pedido do sushi','cq-sm')+'</div></div></div></div>';
    }
  } else if(n.modo==='texto'){
    h+='<div class="grid g21"><div class="card"><h3><span class="lft">'+UI.ic('lista')+' Lista em texto livre</span><button class="vertodos" data-act="txtEx">Usar exemplo</button></h3>'+
      '<textarea class="inp" id="cq-txt" data-inp="txt" style="min-height:230px;font-size:14px" placeholder="Ex.:\n20 kg de salmão\n15 kg cream cheese\n30 kg arroz japonês\n10 litros de shoyu">'+esc(n.texto)+'</textarea>'+
      '<div class="cq-ft"><small style="color:var(--muted);font-weight:600;font-size:12px">Uma linha por item. Separar por ";" também funciona.</small><button class="btn pri" data-act="interpretar">'+UI.ic('ia')+'Interpretar lista</button></div></div>'+
      '<div class="card"><h3>Formatos reconhecidos</h3><div class="lst">'+[['20 kg de salmão','Quantidade + unidade + produto'],['cream cheese 15kg','Produto antes da quantidade'],['500 g de gergelim','Gramas convertidas para kg'],['2 dúzias de ovos','Dúzias convertidas em unidades'],['- shoyu 10 litros','Marcadores e travessões ignorados']].map(function(x){ return '<div class="li"><span class="av">'+UI.ic('check')+'</span><div class="gr"><div class="tt mono" style="font-size:12.5px">'+esc(x[0])+'</div><div class="dd">'+esc(x[1])+'</div></div></div>'; }).join('')+'</div></div></div>';
  } else {
    var nc=Object.keys(n.carrinho).length;
    h+='<div class="grid g21"><div class="card"><h3><span class="lft">'+UI.ic('estoque')+' Produtos do cadastro</span><button class="btn sec sm" data-act="addBaixo">'+UI.ic('raio')+'Adicionar todos abaixo do mínimo</button></h3>'+
      '<div class="barra"><div class="search">'+UI.ic('busca')+'<input id="cq-mb" placeholder="Buscar produto" value="'+esc(n.busca)+'" data-inp="mbusca"></div><select class="inp sm" style="width:auto" data-chg="mcat"><option value="">Todas as categorias</option>'+LFI.db.categorias.filter(function(c){ return c.id!=='aca'&&c.id!=='sob'; }).map(function(c){ return '<option value="'+c.id+'"'+(n.cat===c.id?' selected':'')+'>'+esc(c.nome)+'</option>'; }).join('')+'</select><label class="chk"><input type="checkbox" data-chg="soBaixo"'+(n.soBaixo?' checked':'')+'> Só abaixo do mínimo</label></div>'+
      '<div class="cq-mp" style="border-bottom:1px solid var(--border2);padding-top:0"><small style="font-weight:800;text-transform:uppercase;letter-spacing:.4px">Produto</small><small style="font-weight:800;text-transform:uppercase;letter-spacing:.4px;justify-content:flex-end">Estoque / mín.</small><small style="font-weight:800;text-transform:uppercase;letter-spacing:.4px">Quantidade</small><span></span></div>'+
      '<div class="cq-ml" id="cq-ml">'+listaManual(n)+'</div></div>'+
      '<div class="card"><h3><span class="lft">Itens selecionados <span class="n">'+nc+'</span></span>'+(nc?'<button class="vertodos" data-act="limparC">Limpar</button>':'')+'</h3>'+
      (nc?'<div class="lst">'+Object.keys(n.carrinho).map(function(id){ var p=LFI.prod(id); return '<div class="li"><div class="gr"><div class="tt">'+esc(p.nome)+'</div><div class="dd">Estoque '+F.qtd(LFI.estoqueGeral(p),p.un)+' · mín. '+F.qtd(p.estMin,p.un)+'</div></div><input class="inp sm num" style="width:78px" data-chg="cQtd" data-id="'+id+'" value="'+UI.numBR(n.carrinho[id])+'"><small style="width:18px;font-weight:700;color:var(--muted)">'+p.un+'</small><button class="btn gh xs" data-act="remC" data-id="'+id+'" title="Remover">✕</button></div>'; }).join('')+'</div>':UI.vazio('Escolha produtos ao lado ou adicione de uma vez todos os itens abaixo do mínimo.','🛒'))+
      '<button class="btn pri wide" style="margin-top:14px" data-act="manualOk"'+(nc?'':' disabled')+'>Continuar com '+plural(nc,'item','itens')+' '+UI.ic('seta')+'</button></div></div>';
  }
  return h;
}
function listaManual(n){
  var q=norm(n.busca), ord={critico:0, baixo:1, ok:2, excesso:3};
  var ps=LFI.db.produtos.filter(function(p){ return p.tipo==='insumo'&&(!q||norm(p.nome+' '+(p.apelidos||[]).join(' ')).indexOf(q)>=0)&&(!n.cat||p.cat===n.cat)&&(!n.soBaixo||['baixo','critico'].indexOf(LFI.situacao(p))>=0); })
    .sort(function(a,b){ var d=ord[LFI.situacao(a)]-ord[LFI.situacao(b)]; return d||a.nome.localeCompare(b.nome,'pt-BR'); });
  if(!ps.length) return UI.vazio('Nenhum produto encontrado.','🔎');
  return ps.slice(0,60).map(function(p){ var noC=n.carrinho[p.id]!=null;
    return '<div class="cq-mp"><div><b>'+esc(p.nome)+'</b><small>'+esc(LFI.cat(p.cat).nome)+' '+UI.situacao(p)+'</small></div><div class="e">'+F.qtd(LFI.estoqueGeral(p),p.un)+'<small>mín. '+F.qtd(p.estMin,p.un)+'</small></div>'+
      '<input class="inp sm num" id="cq-q-'+p.id+'" value="'+UI.numBR(noC?n.carrinho[p.id]:sugQtd(p))+'" aria-label="Quantidade de '+esc(p.nome)+'">'+
      '<button class="btn '+(noC?'ok':'sec')+' xs" data-act="addC" data-id="'+p.id+'">'+(noC?'✓ Incluído':'Adicionar')+'</button></div>'; }).join('');
}

function animarFoto(el, n){
  var linhas=UI.els('.papel [data-l]',el), passos=UI.els('.leitura .lt-it',el), scan=el.querySelector('#cq-scan');
  if(scan) scan.classList.add('scan');
  var i=0;
  function passo(){
    if(!document.body.contains(el)) return;
    if(i>0&&passos[i-1]){ passos[i-1].classList.remove('on'); passos[i-1].classList.add('ok'); passos[i-1].querySelector('.bo').textContent='✓'; }
    if(i>=passos.length){
      if(scan) scan.classList.remove('scan');
      n.itens=lerItens(EXEMPLO_FOTO.join('\n')); n.foto='lido'; n.passo=1;
      var t=el.querySelector('#cq-lt-txt'); if(t) t.innerHTML=UI.nota('<b>'+n.itens.length+' itens reconhecidos.</b> Abrindo a conferência…','ok','check');
      setTimeout(function(){ var a=LFI.atual(); if(a.id==='compras'&&a.arg==='nova') LFI.recarregar(); },650);
      return;
    }
    passos[i].classList.add('on');
    if(i===1){ linhas.forEach(function(l,k){ setTimeout(function(){ l.classList.add('cq-lida'); },k*170); }); }
    if(i===3){ linhas.forEach(function(l,k){ setTimeout(function(){ l.classList.remove('cq-lida'); l.classList.add('cq-ok'); },k*120); }); }
    i++; setTimeout(passo, i===2?1050:720);
  }
  setTimeout(passo, 350);
}

function opcoesProd(it){
  var h='';
  var alt=(it.alt||[]).filter(function(id){ return LFI.prod(id); });
  if(alt.length) h+='<optgroup label="Sugestões da leitura">'+alt.map(function(id){ return '<option value="'+id+'">'+esc(LFI.prod(id).nome)+'</option>'; }).join('')+'</optgroup>';
  var base=UI.selProdutos(it.prod);
  return base.replace('<option value="">Selecione o produto…</option>','<option value="">Não identificado — selecione…</option>'+h);
}
function passoConferencia(n){
  var sem=n.itens.filter(function(i){ return !i.prod; }).length, bx=0, sc=0, nsc=0;
  n.itens.forEach(function(i){ if(i.prod&&['baixo','critico'].indexOf(LFI.situacao(i.prod))>=0) bx++; if(i.texto){ sc+=i.score; nsc++; } });
  var tab='<div class="cq-mini"><div>Itens<b>'+n.itens.length+'</b></div>'+(nsc?'<div>Confiança média<b>'+Math.round(sc/nsc)+'%</b></div>':'')+'<div>Abaixo do mínimo<b>'+bx+'</b></div><div>A identificar<b style="color:'+(sem?'var(--red)':'var(--green)')+'">'+sem+'</b></div></div>';
  if(sem) tab+=UI.nota('<b>'+plural(sem,'item não foi identificado','itens não foram identificados')+'.</b> Escolha o produto correspondente — o sistema aprende o apelido para as próximas listas.','wt','alerta');
  tab+='<div class="tb-wrap"><table class="tb"><thead><tr>'+(n.modo!=='manual'?'<th>Texto lido</th>':'')+'<th>Produto no cadastro</th>'+(n.modo!=='manual'?'<th>Confiança</th>':'')+'<th>Quantidade</th><th class="r">Estoque · mín.</th><th></th></tr></thead><tbody>'+
    n.itens.map(function(i){ var p=i.prod?LFI.prod(i.prod):null;
      return '<tr class="'+(!p?'alerta':i.score<70&&!i.manual&&i.texto?'aviso':'')+'">'+(n.modo!=='manual'?'<td>'+(i.texto?(n.modo==='foto'?'<span class="cq-mao">'+esc(i.texto)+'</span>':'<span class="mono">'+esc(i.texto)+'</span>'):'<small>incluído na conferência</small>')+'</td>':'')+
        '<td style="min-width:200px"><select class="inp sm" data-chg="cfProd" data-id="'+i.uid+'">'+opcoesProd(i)+'</select></td>'+
        (n.modo!=='manual'?'<td>'+(i.manual||!i.texto?UI.badge('Ajustado','in'):UI.match(i.score))+'</td>':'')+
        '<td class="nw"><input class="inp sm num" style="width:84px;display:inline-block" data-chg="cfQtd" data-id="'+i.uid+'" value="'+UI.numBR(i.qtd)+'"> <small style="display:inline;font-weight:700">'+(p?p.un:'')+'</small></td>'+
        '<td class="r">'+(p?F.qtd(LFI.estoqueGeral(p),p.un)+'<small>mín. '+F.qtd(p.estMin,p.un)+' '+UI.situacao(p)+'</small>':'—')+'</td>'+
        '<td class="r"><button class="btn gh xs" data-act="cfRem" data-id="'+i.uid+'" title="Remover">✕</button></td></tr>'; }).join('')+
    '</tbody></table></div><button class="btn sec sm" style="margin-top:12px" data-act="cfAdd">'+UI.ic('mais')+'Incluir item</button>';
  var corpo='<div class="card"><h3><span class="lft">'+UI.ic('check')+' Conferência dos itens</span><small>'+(n.modo==='foto'?'reconhecidos na foto':n.modo==='texto'?'interpretados do texto':'selecionados no cadastro')+'</small></h3>'+tab+'</div>';
  var h = n.modo==='foto' ? '<div class="grid g12" style="grid-template-columns:minmax(0,.75fr) minmax(0,2fr)"><div class="card"><h3><span class="lft">'+UI.ic('foto')+' Lista original</span><small>'+esc(n.arquivo||'lista_sushi.jpg')+'</small></h3><div class="cq-sm">'+papel(EXEMPLO_FOTO,'Pedido do sushi — qui','cq-sm',true)+'</div></div>'+corpo+'</div>' : corpo;
  h+='<div class="cq-ft"><button class="btn sec" data-act="voltar">'+UI.ic('voltar')+'Voltar</button><button class="btn pri" data-act="avancar"'+(sem||!n.itens.length?' disabled':'')+'>Identificar fornecedores '+UI.ic('seta')+'</button></div>';
  return h;
}

function iniciarForn(n){
  if(!n.forn){ n.forn={}; }
  n.itens.forEach(function(i){ if(!n.forn[i.prod]) n.forn[i.prod]=fornDoProd(i.prod).map(function(f){ return f.id; }); });
  Object.keys(n.forn).forEach(function(k){ if(!n.itens.some(function(i){ return i.prod===k; })) delete n.forn[k]; });
  if(!n.dep||!LFI.depVisivel(n.dep)){
    var deps=LFI.depIds(), best=null, bs=-1;
    deps.forEach(function(d){ var s=0; n.itens.forEach(function(i){ var p=LFI.prod(i.prod); if(p&&(p.est[d]||0)>0) s+= d==='cen'?0.5:1; }); if(s>bs){ bs=s; best=d; } });
    n.dep=best||deps[0];
  }
  if(!n.prazo){ var d=new Date(); d.setMinutes(0); d.setHours(d.getHours()+4); if(d.getHours()>18||d.getHours()<7){ d=new Date(); d.setDate(d.getDate()+1); d.setHours(12,0,0,0); } n.prazo=isoMin(d); }
}
function uniaoForn(n){ var u=[]; n.itens.forEach(function(i){ (n.forn[i.prod]||[]).forEach(function(f){ if(u.indexOf(f)<0) u.push(f); }); }); return u; }
function passoFornecedores(n){
  iniciarForn(n);
  var u=uniaoForn(n), semF=n.itens.filter(function(i){ return !(n.forn[i.prod]||[]).length; });
  var h='<div class="grid g21"><div class="card"><h3><span class="lft">'+UI.ic('fornecedor')+' Fornecedores vinculados a cada produto</span><small>principal e alternativos do cadastro</small></h3>';
  h+=UI.nota('O sistema identificou automaticamente quem fornece cada produto. Desmarque quem não deve receber a cotação ou inclua outro fornecedor.','in','ia');
  h+=n.itens.map(function(i){ var p=LFI.prod(i.prod), lig=fornDoProd(i.prod).map(function(f){ return f.id; }), sel=n.forn[i.prod]||[];
    var todos=lig.concat(sel.filter(function(f){ return lig.indexOf(f)<0; }));
    return '<div class="cq-fi"><div><b>'+esc(curto(p.nome))+'</b><small>'+esc(qtdP(p.id,i.qtd))+' solicitados</small><small>Estoque '+F.qtd(LFI.estoqueGeral(p),p.un)+' · mín. '+F.qtd(p.estMin,p.un)+'</small></div><div class="cq-fi-f">'+
      todos.map(function(f){ var fo=LFI.forn(f), on=sel.indexOf(f)>=0, up=ultPreco(p.id,f); return '<label class="cq-fchip'+(on?' on':'')+'"><input type="checkbox" data-chg="tgF" data-id="'+p.id+'|'+f+'"'+(on?' checked':'')+'><span><b>'+esc(fo.nome)+'</b><small>'+(p.forn===f?'Principal':lig.indexOf(f)>=0?'Alternativo':'Incluído')+' · '+UI.estrelas(fo.qualidade)+' · '+fo.prazo+'d'+(up?' · últ. '+F.moeda(up.v):'')+'</small></span></label>'; }).join('')+
      '<select class="inp sm" data-chg="addF" data-id="'+p.id+'"><option value="">+ Outro fornecedor</option>'+LFI.db.fornecedores.filter(function(f){ return todos.indexOf(f.id)<0; }).map(function(f){ return '<option value="'+f.id+'">'+esc(f.nome)+'</option>'; }).join('')+'</select>'+
      (sel.length?'':'<span class="badge b-no"><i></i>Sem fornecedor</span>')+'</div></div>'; }).join('');
  h+='</div><div>';
  h+='<div class="card"><h3><span class="lft">'+UI.ic('calendario')+' Dados da cotação</span></h3>'+
    '<div class="field"><label>Departamento / empresa que recebe</label><select class="inp" data-chg="dep">'+UI.selDeps(n.dep)+'</select><div class="hint">'+(function(){ var e=LFI.empresaDoDep(n.dep); return e?esc(e.razao)+' · CNPJ '+e.cnpj:''; })()+'</div></div>'+
    '<div class="field"><label>Prazo de retorno dos fornecedores</label><input class="inp" type="datetime-local" data-chg="prazo" value="'+esc(n.prazo)+'"></div>'+
    '<div class="field"><label>Responsável</label><input class="inp" data-chg="resp" value="'+esc(n.resp)+'"></div>'+
    '<div class="field"><label>Observação interna</label><textarea class="inp" style="min-height:64px" data-chg="obs" placeholder="Ex.: reposição para o fim de semana">'+esc(n.obs)+'</textarea></div>'+
    '<label class="chk"><input type="checkbox" data-chg="enviar"'+(n.enviar?' checked':'')+'> Enviar pelo WhatsApp assim que criar</label></div>';
  h+='<div class="card"><h3><span class="lft">'+UI.ic('whats')+' Fornecedores acionados <span class="n">'+u.length+'</span></span></h3><div class="lst">'+
    u.map(function(f){ var fo=LFI.forn(f), k=n.itens.filter(function(i){ return (n.forn[i.prod]||[]).indexOf(f)>=0; }).length; return '<div class="li"><span class="av lf">'+esc(ini(fo.nome))+'</span><div class="gr"><div class="tt">'+esc(fo.nome)+'</div><div class="dd">'+fo.whats+' · '+esc(fo.contato)+'</div></div><div class="rt">'+plural(k,'item','itens')+'<small>'+fo.pontualidade+'% pontual</small></div></div>'; }).join('')+'</div></div>';
  h+='</div></div>';
  if(semF.length) h+=UI.nota('<b>'+plural(semF.length,'produto está','produtos estão')+' sem fornecedor selecionado</b>: '+semF.map(function(i){ return esc(curto(prodN(i.prod))); }).join(', ')+'.','wt','alerta');
  h+='<div class="cq-ft"><button class="btn sec" data-act="voltar">'+UI.ic('voltar')+'Voltar</button><button class="btn pri" data-act="avancar"'+(semF.length||!u.length?' disabled':'')+'>Revisar rodada de cotação '+UI.ic('seta')+'</button></div>';
  return h;
}
function cotPrevia(n){
  var u=uniaoForn(n), s=LFI.db.seq, ano=new Date().getFullYear();
  return {id:'previa', num:'COT-'+ano+'-'+String(s.cot+1).padStart(3,'0'), data:LFI.agoraISO(), resp:n.resp, dep:n.dep, empresa:LFI.dep(n.dep).empresa, prazoRetorno:n.prazo, itens:n.itens.map(function(i){ return {prod:i.prod, qtd:i.qtd}; }), itemForn:n.forn, fornecedores:u, propostas:[], status:'preparacao'};
}
function passoRevisao(n){
  iniciarForn(n);
  var c=cotPrevia(n), u=c.fornecedores, f=n.revF&&u.indexOf(n.revF)>=0?n.revF:u[0], custo=0;
  n.itens.forEach(function(i){ custo+=i.qtd*LFI.prod(i.prod).custoMedio; });
  var emp=LFI.emp(c.empresa);
  var h='<div class="kpis">'+UI.kpi({lb:'Cotação', vl:esc(c.num), dl:esc(LFI.dep(n.dep).nome)+' · '+esc(emp.fantasia)})+UI.kpi({lb:'Produtos', vl:String(n.itens.length), dl:'Custo estimado '+F.moeda(custo)+' (custo médio)'})+UI.kpi({lb:'Fornecedores acionados', vl:String(u.length), dl:'Uma mensagem personalizada para cada'})+UI.kpi({lb:'Prazo de retorno', vl:F.dataC(n.prazo)+' <small>'+F.hora(n.prazo)+'</small>', dl:F.relativo(n.prazo), hl:true})+'</div>';
  h+='<div class="grid g12"><div class="card"><h3><span class="lft">'+UI.ic('lista')+' Itens da cotação</span></h3><div class="tb-wrap"><table class="tb cp"><thead><tr><th>Produto</th><th class="r">Qtd</th><th>Fornecedores</th></tr></thead><tbody>'+
    n.itens.map(function(i){ return '<tr><td class="nw"><b>'+esc(curto(prodN(i.prod)))+'</b></td><td class="r">'+esc(qtdP(i.prod,i.qtd))+'</td><td>'+(n.forn[i.prod]||[]).map(function(x){ return '<span class="tag">'+esc(LFI.forn(x).nome)+'</span>'; }).join(' ')+'</td></tr>'; }).join('')+'</tbody></table></div>'+
    (n.obs?UI.nota(esc(n.obs),'',''):'')+'</div>';
  h+='<div class="card"><h3><span class="lft">'+UI.ic('whats')+' Mensagens que serão enviadas</span><small>prévia por fornecedor</small></h3><div class="pills" style="margin-bottom:12px">'+u.map(function(x){ return '<button class="pill'+(x===f?' on':'')+'" data-act="revF" data-id="'+x+'">'+esc(LFI.forn(x).nome)+'</button>'; }).join('')+'</div>'+(f?waConversa(c,f,{semResposta:true}):'')+'</div></div>';
  h+='<div class="cq-ft"><button class="btn sec" data-act="voltar">'+UI.ic('voltar')+'Voltar</button><span style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sec" data-act="criar" data-id="rascunho">Salvar em preparação</button><button class="btn pri" data-act="criar" data-id="enviar">'+UI.ic('enviar')+(n.enviar?'Criar cotação e enviar a '+plural(u.length,'fornecedor','fornecedores'):'Criar cotação')+'</button></span></div>';
  return h;
}

function handlersNova(el, n){
  function re(){ LFI.recarregar(); }
  function reTopo(){ LFI.recarregar(); window.scrollTo(0,0); }
  function item(uid){ for(var i=0;i<n.itens.length;i++) if(n.itens[i].uid===uid) return n.itens[i]; return null; }
  return {
    sair:function(){ UI.confirmar('Descartar solicitação','Os itens lidos e as escolhas de fornecedores desta solicitação serão descartados.','Descartar',function(){ st().nova=null; LFI.ir('compras'); },'esc'); },
    modo:function(id){ n.modo=id; if(id==='foto') n.foto='vazio'; re(); },
    fotoEx:function(){ n.foto='lendo'; n.arquivo='lista_sushi_'+F.dataC(LFI.hoje()).replace('/','')+'.jpg'; n.fotoURL=null; re(); },
    arquivo:function(_,ev){ var f=ev.target.files&&ev.target.files[0]; if(!f) return; n.arquivo=f.name; try{ n.fotoURL=/^image\//.test(f.type)?URL.createObjectURL(f):null; }catch(e){ n.fotoURL=null; } n.foto='lendo'; re(); },
    txt:function(_,ev){ n.texto=ev.target.value; },
    txtEx:function(){ n.texto='20 kg de salmão\n15kg cream cheese\n30 kg arroz japonês\nshoyu 10 litros\n500 g de gergelim branco\n2 pacotes de farinha panko'; re(); },
    interpretar:function(){ var t=(el.querySelector('#cq-txt')||{}).value||n.texto; n.texto=t; if(!t.trim()){ UI.toast('Digite ou cole a lista de compras','','wt'); return; } n.itens=lerItens(t); if(!n.itens.length){ UI.toast('Nenhum item encontrado no texto','','wt'); return; } n.passo=1; re(); UI.toast(plural(n.itens.length,'item interpretado','itens interpretados'),'Confira produtos e quantidades','in'); },
    mbusca:function(_,ev){ n.busca=ev.target.value; var b=el.querySelector('#cq-ml'); if(b) b.innerHTML=listaManual(n); },
    mcat:function(_,ev){ n.cat=ev.target.value; re(); },
    soBaixo:function(_,ev){ n.soBaixo=ev.target.checked; re(); },
    addC:function(id){ if(n.carrinho[id]!=null){ delete n.carrinho[id]; re(); return; } var i=el.querySelector('#cq-q-'+id), q=UI.num(i?i.value:1); if(!(q>0)){ UI.toast('Informe a quantidade','','wt'); return; } n.carrinho[id]=q; re(); },
    remC:function(id){ delete n.carrinho[id]; re(); },
    limparC:function(){ n.carrinho={}; re(); },
    cQtd:function(id,ev){ var q=UI.num(ev.target.value); if(q>0) n.carrinho[id]=q; },
    addBaixo:function(){ var k=0; LFI.db.produtos.forEach(function(p){ if(p.tipo==='insumo'&&['baixo','critico'].indexOf(LFI.situacao(p))>=0&&n.carrinho[p.id]==null){ n.carrinho[p.id]=sugQtd(p); k++; } }); re(); UI.toast(k?plural(k,'item abaixo do mínimo incluído','itens abaixo do mínimo incluídos'):'Todos os itens abaixo do mínimo já estão na lista','Quantidade sugerida para voltar a 2× o mínimo','in'); },
    manualOk:function(){ n.itens=itensDoCarrinho(n); n.passo=1; re(); },
    cfProd:function(uid,ev){ var i=item(uid); if(!i) return; i.prod=ev.target.value||null; i.manual=true; if(i.prod&&!i.texto) i.score=100; re(); },
    cfQtd:function(uid,ev){ var i=item(uid); if(i){ i.qtd=r3(UI.num(ev.target.value)); } },
    cfRem:function(uid){ n.itens=n.itens.filter(function(i){ return i.uid!==uid; }); re(); },
    cfAdd:function(){ n.itens.push({uid:LFI.novoId('l'), texto:'', prod:null, qtd:1, score:100, alt:[], manual:true}); re(); },
    voltar:function(){ n.passo=Math.max(0,n.passo-1); if(n.passo===0&&n.modo==='foto') n.foto='vazio'; reTopo(); },
    avancar:function(){
      if(n.passo===1){ if(n.itens.some(function(i){ return !i.prod; })){ UI.toast('Identifique todos os produtos','','wt'); return; } if(n.itens.some(function(i){ return !(i.qtd>0); })){ UI.toast('Informe quantidades maiores que zero','','wt'); return; }
        var vist={}, dup=false; n.itens.forEach(function(i){ if(vist[i.prod]){ vist[i.prod].qtd=r3(vist[i.prod].qtd+i.qtd); i._dup=true; dup=true; } else vist[i.prod]=i; }); if(dup){ n.itens=n.itens.filter(function(i){ return !i._dup; }); UI.toast('Itens repetidos foram somados','','in'); } }
      n.passo=Math.min(3,n.passo+1); reTopo(); },
    tgF:function(id,ev){ var p=id.split('|'); n.forn[p[0]]=n.forn[p[0]]||[]; var a=n.forn[p[0]], k=a.indexOf(p[1]); if(ev.target.checked&&k<0) a.push(p[1]); if(!ev.target.checked&&k>=0) a.splice(k,1); re(); },
    addF:function(prod,ev){ var f=ev.target.value; if(!f) return; n.forn[prod]=n.forn[prod]||[]; if(n.forn[prod].indexOf(f)<0) n.forn[prod].push(f); re(); },
    dep:function(_,ev){ n.dep=ev.target.value; re(); },
    prazo:function(_,ev){ if(ev.target.value) n.prazo=ev.target.value.slice(0,16); },
    resp:function(_,ev){ n.resp=ev.target.value.trim()||LFI.usuario().nome; },
    obs:function(_,ev){ n.obs=ev.target.value; },
    enviar:function(_,ev){ n.enviar=ev.target.checked; re(); },
    revF:function(f){ n.revF=f; re(); },
    criar:function(modo){ criarDaNova(n, modo==='enviar'&&n.enviar); }
  };
}

function criarDaNova(n, enviar){
  var u=uniaoForn(n);
  var etapas=['Registrando a cotação e os itens','Vinculando '+plural(u.length,'fornecedor','fornecedores')+' aos produtos','Gerando mensagens personalizadas'].concat(enviar?['Enviando pelo WhatsApp Business','Aguardando confirmação de entrega (✓✓)']:['Salvando em preparação']);
  var m=UI.modal({titulo:'Rodada de cotação', sub:enviar?'Criando e enviando aos fornecedores':'Criando a cotação', tam:'sm', fixo:true, rodape:false, corpo:'<div class="leitura">'+etapas.map(function(t,i){ return '<div class="lt-it" id="cq-cr'+i+'"><span class="bo"></span>'+esc(t)+'</div>'; }).join('')+'</div>'});
  var i=0;
  (function passo(){
    if(i>0){ var a=m.el.querySelector('#cq-cr'+(i-1)); a.classList.remove('on'); a.classList.add('ok'); a.querySelector('.bo').textContent='✓'; }
    if(i>=etapas.length){
      var c=LFI.criarCotacao({itens:n.itens.map(function(x){ return {prod:x.prod, qtd:x.qtd}; }), dep:n.dep, origem:n.modo==='foto'?'foto':n.modo==='texto'?'lista':'manual', resp:n.resp, obs:n.obs, fornecedores:u, status:enviar?'aguardando_propostas':'preparacao'});
      c.prazoRetorno=n.prazo; c.itemForn=JSON.parse(JSON.stringify(n.forn)); c.hist=[];
      if(n.modo==='foto') c.fotoTexto=EXEMPLO_FOTO.slice();
      if(n.modo==='texto') c.textoOriginal=n.texto;
      if(enviar){ var agora=LFI.agoraISO(); c.enviadaEm=agora; c.envios={}; u.forEach(function(f){ c.envios[f]=agora; }); hist(c,'envio','Enviada a '+plural(u.length,'fornecedor','fornecedores')+' pelo WhatsApp','Status: enviada → aguardando propostas'); LFI.atividade('cotacao',c.num+' enviada a '+plural(u.length,'fornecedor','fornecedores')+' pelo WhatsApp',{tela:'compras',id:c.id}); }
      LFI.salvar(); st().nova=null; m.fechar();
      UI.toast(enviar?'Rodada de cotação iniciada':'Cotação salva em preparação', c.num+' · '+plural(u.length,'fornecedor','fornecedores'));
      LFI.ir('compras', c.id); return;
    }
    m.el.querySelector('#cq-cr'+i).classList.add('on'); i++; setTimeout(passo, 520);
  })();
}

/* =====================================================================
   DETALHE DA COTAÇÃO
   ===================================================================== */
function renderDetalhe(el, c){
  var s=st(), A=analise(c), nOk=propostasOk(c).length, emp=LFI.emp(c.empresa), dep=LFI.dep(c.dep), o=ORIGEM[c.origem]||ORIGEM.manual;
  var resp=c.fornecedores.filter(function(f){ return propDe(c,f); }).length, temEsc=c.escolhas&&Object.keys(c.escolhas).length>0;
  var K=nOk?cestaAtual(c,A):null, editavel=c.status==='preparacao'||c.status==='aguardando_envio';
  var abas=[];
  if(c.propostas.length) abas.push(['comparador','Comparador inteligente','']);
  abas.push(['propostas','Propostas',resp+'/'+c.fornecedores.length]);
  abas.push(['itens','Itens e fornecedores',String(c.itens.length)]);
  abas.push(['mensagens','Mensagens WhatsApp','']);
  abas.push(['historico','Histórico','']);
  var aba=s.abas[c.id]||(nOk&&['propostas_recebidas','comparacao','aprovada','convertida'].indexOf(c.status)>=0?'comparador':editavel?'itens':'propostas');
  if(!abas.some(function(a){ return a[0]===aba; })) aba=abas[0][0];

  var ac='<button class="btn sec sm" data-act="pdf">'+UI.ic('imprimir')+'Mapa de cotação</button>';
  var cancel='<button class="btn no sm" data-act="cancelar">Cancelar</button>';
  if(editavel) ac+=cancel+'<button class="btn pri sm" data-act="enviar">'+UI.ic('whats')+'Enviar aos fornecedores</button>';
  else if(c.status==='enviada'||c.status==='aguardando_propostas') ac+=cancel+'<button class="btn sec sm" data-act="lembrete">'+UI.ic('relogio')+'Lembrar pendentes</button><button class="btn sec sm" data-act="simTodas">'+UI.ic('ia')+'Simular respostas pendentes</button><button class="btn '+(nOk?'sec':'pri')+' sm" data-act="receber">'+UI.ic('upload')+'Registrar proposta</button>'+(nOk?'<button class="btn pri sm" data-act="comparar">Comparar propostas</button>':'');
  else if(c.status==='propostas_recebidas') ac+=cancel+'<button class="btn pri sm" data-act="comparar">Iniciar comparação</button>';
  else if(c.status==='comparacao') ac+=cancel+'<button class="btn pri sm" data-act="aprovar"'+(temEsc?'':' disabled title="Selecione os fornecedores no comparador"')+'>'+UI.ic('check')+'Aprovar e gerar OC</button>';
  else if(c.status==='convertida') ac+='<button class="btn pri sm" data-act="verOcs">'+UI.ic('ordem')+'Ver ordens de compra</button>';

  var h=UI.cabecalho({migalha:[{t:'Compras',ir:'compras'},{t:c.num}], titulo:esc(c.num)+' '+UI.status('cot',c.status), sub:UI.ic(o[1]).replace('class=""','style="width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2;vertical-align:-2px"')+' '+esc(o[0])+' · '+F.dataHora(c.data)+' · '+esc(c.resp)+' · '+esc(dep?dep.nome:'')+' · '+esc(emp.fantasia)+' (CNPJ '+emp.cnpj+')', acoes:ac});
  if(!LFI.empresaVisivel(c.empresa)) h+=UI.nota('Esta cotação pertence a <b>'+esc(emp.fantasia)+'</b>, fora da empresa selecionada no topo.','wt');

  /* etapas */
  if(c.status==='cancelada') h+=UI.nota('<b>Cotação cancelada</b>'+(c.canceladaEm?' em '+F.dataHora(c.canceladaEm):'')+'. '+esc(c.motivo||c.obs||''),'wt','x');
  else {
    var idx=c.status==='convertida'?LFI.COT_FLUXO.length:LFI.COT_FLUXO.indexOf(c.status), env=enviadaEm(c), venc=['enviada','aguardando_propostas','aguardando_envio','preparacao'].indexOf(c.status)>=0&&c.prazoRetorno<LFI.agoraISO();
    h+='<div class="card mb" style="padding:16px 20px 14px">'+UI.passos(['Preparação','Envio','Enviada','Aguardando','Recebidas','Comparação','Aprovada','Convertida'], idx)+
      '<div class="cq-step"><span>'+UI.ic('relogio')+'Retorno até <b'+(venc?' style="color:var(--red)"':'')+'>'+F.dataHora(c.prazoRetorno)+'</b>'+(venc?' (vencido)':'')+'</span><span>'+UI.ic('enviar')+(env?'Enviada <b>'+F.dataHora(env)+'</b>':'Ainda não enviada')+'</span><span>'+UI.ic('whats')+'<b>'+resp+' de '+c.fornecedores.length+'</b> fornecedores responderam</span>'+(c.obs?'<span>'+UI.ic('info')+esc(c.obs)+'</span>':'')+'</div></div>';
  }

  /* indicadores */
  var tm=[], e0=enviadaEm(c); c.propostas.forEach(function(p){ if(e0){ var mm=difMin(e0,p.recebida); if(mm>=0) tm.push(mm); } });
  var custo=0; c.itens.forEach(function(i){ var p=LFI.prod(i.prod); if(p) custo+=i.qtd*p.custoMedio; });
  h+='<div class="kpis k5">'+
    UI.kpi({lb:'Produtos solicitados', vl:String(c.itens.length), dl:'Ao custo médio: '+F.moeda(custo)})+
    UI.kpi({lb:'Fornecedores acionados', vl:String(c.fornecedores.length), dl:c.fornecedores.map(function(f){ var fo=LFI.forn(f); return fo?esc(primeiro(fo.nome)):''; }).join(', ')})+
    UI.kpi({lb:'Propostas recebidas', vl:resp+' <small>/ '+c.fornecedores.length+'</small>', dl:tm.length?'Resposta média em '+dur(Math.round(tm.reduce(function(a,b){ return a+b; },0)/tm.length)):'Nenhuma resposta ainda'})+
    UI.kpi({lb:temEsc?'Cesta escolhida':'Melhor cesta (recomendada)', vl:K&&K.n?F.moeda(K.total):'—', dl:K&&K.n?plural(K.n,'fornecedor','fornecedores')+' · entrega até '+F.dataC(K.entrega):'Aguardando propostas', hl:true})+
    UI.kpi({lb:'Economia potencial', vl:K&&K.n?F.moeda(K.econPior):'—', dl:K&&K.n?'vs. maior preço · '+(K.econCM>=0?F.moeda(K.econCM)+' abaixo':F.moeda(-K.econCM)+' acima')+' do custo médio':'Calculada com as propostas'})+
  '</div>';

  h+='<div class="tabs">'+abas.map(function(a){ return '<button class="'+(aba===a[0]?'on':'')+'" data-act="aba" data-id="'+a[0]+'">'+esc(a[1])+(a[2]?' <span class="n">'+a[2]+'</span>':'')+'</button>'; }).join('')+'</div>';
  h+='<div id="cq-aba">';
  if(aba==='comparador') h+=secComparador(c,A);
  else if(aba==='propostas') h+=secPropostas(c);
  else if(aba==='itens') h+=secItens(c, editavel);
  else if(aba==='mensagens') h+=secMensagens(c);
  else h+=secHistorico(c);
  h+='</div>';
  el.innerHTML=h;
  if(aba==='comparador'&&nOk) graficosComparador(el,c,A);

  UI.liga(el, UI.navHandlers(handlersDetalhe(el,c,A)));
}

/* ---------- comparador ---------- */
function secComparador(c, A){
  var s=st(), ro=['aprovada','convertida','cancelada'].indexOf(c.status)>=0||!(LFI.empresaVisivel(c.empresa)||true);
  var pend=c.propostas.filter(function(p){ return p.conferida===false; });
  var h='';
  if(pend.length) h+=UI.nota('<b>'+plural(pend.length,'proposta aguarda','propostas aguardam')+' conferência</b> e ainda não '+(pend.length>1?'entram':'entra')+' no comparador: '+pend.map(function(p){ return '<a class="vertodos" data-act="conferir" data-id="'+p.forn+'">'+esc(LFI.forn(p.forn).nome)+'</a>'; }).join(', ')+'.','wt','alerta');
  if(!A.fs.length) return h+'<div class="card">'+UI.vazio('Nenhuma proposta conferida ainda. Confira as propostas recebidas para comparar.','⚖️')+'</div>';
  var E=c.escolhas||{}, temEsc=Object.keys(E).length>0, rec=mapaRec(A);
  h+=UI.nota('<b>O sistema não escolhe apenas pelo menor preço.</b> Cada oferta recebe uma nota ponderada por <b>preço</b>, <b>disponibilidade</b> para cobrir a quantidade, <b>prazo de entrega</b>, <b>condição de pagamento</b> e <b>qualidade/pontualidade</b> do fornecedor. Ajuste os pesos ao lado e '+(ro?'veja':'clique nas células para montar')+' a cesta.','lf','ia');
  h+='<div class="card pad0 mb"><h3 style="padding:16px 20px 12px;margin:0"><span class="lft">'+UI.ic('compras')+' Mapa comparativo <small>'+plural(c.itens.length,'produto','produtos')+' × '+plural(A.fs.length,'fornecedor','fornecedores')+' · preço por unidade</small></span>'+
    (ro?'':'<span style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn pri sm" data-act="aplRec">'+UI.ic('ia')+'Aplicar recomendação</button><button class="btn sec sm" data-act="aplMenor">Menor preço</button>'+(temEsc?'<button class="btn gh sm" data-act="limpar">Limpar escolhas</button>':'')+'</span>')+'</h3>';
  h+='<div class="tb-wrap"><table class="tb cmp cq-cmp"><thead><tr><th style="min-width:200px">Produto</th>'+A.fs.map(function(f,i){ var fo=LFI.forn(f), p=propDe(c,f); return '<th class="fo"><b><i style="display:inline-block;width:9px;height:9px;border-radius:3px;background:'+COR_F[i%COR_F.length]+';margin-right:5px"></i>'+esc(fo.nome)+'</b><small>'+UI.estrelas(fo.qualidade)+' '+fo.pontualidade+'% pontual</small><small>'+canalIc(p.canal)+'</small></th>'; }).join('')+'<th class="r" style="min-width:130px">Escolha · economia</th></tr></thead><tbody>';
  A.linhas.forEach(function(l){
    var p=l.prod, un=p?p.un:'';
    h+='<tr><td><div class="cp-prod">'+UI.fotoProd(p,44)+'<div><b>'+esc(curto(prodN(l.item.prod)))+'</b><small>'+esc(qtdP(l.item.prod,l.item.qtd))+' solicitados</small><small>Custo médio '+F.moeda(p?p.custoMedio:0)+'/'+un+'</small></div></div></td>';
    A.fs.forEach(function(f){
      var o=l.por[f], pr=propDe(c,f);
      if(!o){ var pedido=itensForn(c,f).some(function(i){ return i.prod===l.item.prod; }); h+='<td class="cel ind">'+(pedido?'Indisponível':'Não cotado')+'</td>'; return; }
      var parc=o.qtdDisp<l.item.qtd-0.0001, cls='cel'+(l.menor===f?' melhor':'')+(E[l.item.prod]===f?' esc':'');
      var tit='Nota '+o.score+' · preço '+Math.round(o.s.preco*100)+'% · disponibilidade '+Math.round(o.s.disp*100)+'% · prazo '+Math.round(o.s.prazo*100)+'% · pagamento '+Math.round(o.s.cond*100)+'% · qualidade '+Math.round(o.s.qual*100)+'%';
      h+='<td class="'+cls+'"'+(ro?'':' data-act="esc" data-id="'+l.item.prod+'|'+f+'"')+' title="'+esc(tit)+'"><div class="cq-tags">'+(l.rec===f?'<span class="tr">Recomendado</span>':'')+(l.menor===f&&l.ofs.length>1?'<span class="tm">Menor preço</span>':'')+'</div><div class="p">'+F.moeda(o.preco)+'</div><div class="q'+(parc?' parc':'')+'">'+(parc?'Só '+F.qtd(o.qtdDisp,un)+' de '+F.qtd(l.item.qtd,un):'Atende '+F.qtd(o.qtdDisp,un))+'</div><div class="cq-sc"><i style="width:'+o.score+'%"></i></div><div class="cq-nt">Nota '+o.score+'</div></td>';
    });
    var fe=E[l.item.prod]||null, oe=fe&&l.por[fe];
    if(oe){ var q=Math.min(l.item.qtd,oe.qtdDisp); h+='<td class="r"><b>'+esc(nomeC(LFI.forn(fe).nome))+'</b><small style="color:var(--green);font-weight:800">'+F.moeda((l.maxP-oe.preco)*q)+' vs. maior</small><small>'+UI.variacao(oe.preco,p.custoMedio,true)+' vs. custo médio</small></td>'; }
    else h+='<td class="r"><small>'+(l.ofs.length?(rec[l.item.prod]?'Sugestão: <b>'+esc(nomeC(LFI.forn(rec[l.item.prod]).nome))+'</b>':'—'):'<span style="color:var(--red);font-weight:800">Sem oferta</span>')+'</small></td>';
    h+='</tr>';
  });
  h+='</tbody><tfoot>';
  function lin(rot, fn, cls){ return '<tr class="'+(cls||'')+'"><td>'+rot+'</td>'+A.fs.map(function(f){ return '<td>'+fn(propDe(c,f),LFI.forn(f),f)+'</td>'; }).join('')+'<td></td></tr>'; }
  h+=lin('Prazo de entrega', function(p){ return p.prazo+' dia'+(p.prazo>1?'s':'')+'<small>'+F.dataC(U.D(p.prazo))+'</small>'; });
  h+=lin('Condição de pagamento', function(p){ return esc(p.cond); });
  h+=lin('Frete', function(p){ return p.frete?F.moeda(p.frete):'<span style="color:var(--green)">Grátis</span>'; });
  h+=lin('Itens atendidos', function(p){ var t=totalProposta(c,p); return t.n+' de '+c.itens.length; });
  h+=lin('Valor total da proposta', function(p){ return F.moeda(totalProposta(c,p).total); }, 'tt');
  h+='</tfoot></table></div></div>';

  h+='<div class="grid g2" style="align-items:start"><div>';
  h+=cestaCard(c,A,ro)+'</div><div>';
  h+='<div class="card"><h3><span class="lft">'+UI.ic('filtro')+' Pesos da análise</span><button class="vertodos" data-act="pesosPad">Restaurar padrão</button></h3>';
  var W=s.pesos, tw=(W.preco+W.disp+W.prazo+W.cond+W.qual)||1;
  h+=Object.keys(ROT_PESO).map(function(k){ return '<div class="cq-peso"><label>'+ROT_PESO[k][0]+'<small>'+ROT_PESO[k][1]+'</small></label><b id="cq-pw-'+k+'">'+Math.round(W[k]/tw*100)+'%</b><input type="range" min="0" max="60" step="5" value="'+W[k]+'" data-inp="pesoV" data-chg="pesoOk" data-id="'+k+'" aria-label="Peso de '+ROT_PESO[k][0]+'"></div>'; }).join('');
  h+='<div style="font-size:11.5px;color:var(--muted);font-weight:600;line-height:1.45">As notas e as recomendações são recalculadas ao soltar o controle. Os pesos valem para todas as cotações nesta sessão.</div></div>';
  h+='</div></div>';
  return h;
}
function cestaCard(c, A, ro){
  var E=c.escolhas||{}, temEsc=Object.keys(E).length>0, K=cesta(A, temEsc?E:mapaRec(A));
  var h='<div class="card cq-cesta"><h3><span class="lft">'+(c.status==='convertida'?'Compra consolidada':temEsc?'Cesta escolhida':'Cesta recomendada')+'</span><small>'+(c.status==='convertida'?esc(c.grupo||''):temEsc?Object.keys(E).length+' de '+c.itens.length+' itens':'prévia · aplique para confirmar')+'</small></h3>';
  h+='<div class="tt">'+F.moeda(K.total)+'</div><div class="st">'+F.moeda(K.itens)+' em itens'+(K.fretes?' + '+F.moeda(K.fretes)+' de frete':' · frete grátis')+'</div>';
  h+='<div class="lnr"><span class="k">Economia vs. maior preço</span><span class="v eco">'+F.moeda(K.econPior)+'</span></div>'+
     '<div class="lnr"><span class="k">Economia vs. média das propostas</span><span class="v '+(K.econMed>=0?'eco':'neg')+'">'+F.moeda(K.econMed)+'</span></div>'+
     '<div class="lnr"><span class="k">vs. custo médio atual do estoque</span><span class="v '+(K.econCM>=0?'eco':'neg')+'">'+(K.econCM>=0?'−':'+')+F.moeda(Math.abs(K.econCM))+'</span></div>'+
     '<div class="lnr"><span class="k">Fornecedores</span><span class="v">'+K.n+'</span></div>'+
     '<div class="lnr"><span class="k">Entrega completa até</span><span class="v">'+(K.entrega?F.data(K.entrega)+' ('+K.maxPrazo+'d)':'—')+'</span></div>'+
     (K.sem?'<div class="lnr"><span class="k">Itens sem fornecedor</span><span class="v neg">'+K.sem+'</span></div>':'');
  K.ordem.forEach(function(f){ var g=K.porF[f], fo=LFI.forn(f); h+='<div class="cq-gf"><div style="display:flex;justify-content:space-between;gap:8px"><b>'+esc(fo.nome)+'</b><b>'+F.moeda(g.valor+g.frete)+'</b></div><small>'+g.itens.map(function(i){ return esc(curto(prodN(i.prod)))+' '+esc(qtdP(i.prod,i.qtd)); }).join(' · ')+'</small><small>'+esc(g.cond)+' · entrega em '+g.prazo+'d'+(g.frete?' · frete '+F.moeda(g.frete):'')+'</small></div>'; });
  if(K.parciais.length) h+=UI.nota(K.parciais.map(function(x){ return '<b>'+esc(curto(x.l.prod.nome))+'</b>: '+esc(LFI.forn(x.o.forn).nome)+' atende '+F.qtd(x.o.qtdDisp,x.l.prod.un)+' — faltam '+F.qtd(x.falta,x.l.prod.un); }).join('<br>'),'wt','alerta');
  if(c.status==='convertida'){
    h+='<div style="margin-top:12px;display:flex;flex-direction:column;gap:6px">'+(c.ordens||[]).map(function(id){ var oc=LFI.ordem(id); if(!oc) return ''; return '<button class="btn sec sm wide" data-act="_ir" data-id="ordens/'+oc.id+'" style="justify-content:space-between"><span>'+esc(oc.num)+' · '+esc(LFI.forn(oc.forn).nome)+'</span>'+UI.status('oc',oc.status)+'</button>'; }).join('')+'</div>';
  } else if(!ro){
    h+=temEsc?'<button class="btn pri wide" style="margin-top:14px" data-act="aprovar">'+UI.ic('check')+'Criar pedido</button><div style="font-size:11px;color:#B9B9C0;font-weight:600;margin-top:8px;text-align:center">Um pedido por fornecedor</div>'
             :'<button class="btn pri wide" style="margin-top:14px" data-act="aplRec">'+UI.ic('ia')+'Aplicar recomendação</button><div style="font-size:11px;color:#B9B9C0;font-weight:600;margin-top:8px;text-align:center">ou clique nas células do mapa para escolher</div>';
  }
  return h+'</div>';
}
function graficosComparador(el, c, A){
  var g1=el.querySelector('#cq-g1'), g2=el.querySelector('#cq-g2'); if(!g1) return;
  UI.grafBarras(g1,{cats:A.linhas.map(function(l){ return curto(l.prod?l.prod.nome:''); }), altura:240, legenda:true,
    series:A.fs.map(function(f,i){ return {nome:LFI.forn(f).nome, cor:COR_F[i%COR_F.length], valores:A.linhas.map(function(l){ return l.por[f]?l.por[f].preco:0; })}; })});
  var K=cestaAtual(c,A);
  g2.innerHTML=UI.barrasH(A.fs.map(function(f,i){ var t=totalProposta(c,propDe(c,f)), g=K.porF[f]; return {nome:LFI.forn(f).nome, valor:t.total, sub:t.n+'/'+c.itens.length+' itens'+(g?' · '+F.moeda(g.valor+g.frete)+' na cesta':''), cor:COR_F[i%COR_F.length], id:f}; }).sort(function(a,b){ return b.valor-a.valor; }),{act:'_ir'});
  UI.els('.hb-it',g2).forEach(function(n){ n.setAttribute('data-id','fornecedores/'+n.getAttribute('data-id')); });
}

/* ---------- propostas ---------- */
function secPropostas(c){
  var podeReceber=['enviada','aguardando_propostas','propostas_recebidas','comparacao'].indexOf(c.status)>=0, e0=enviadaEm(c);
  var h='';
  if(!e0) h+=UI.nota('A cotação ainda não foi enviada. Envie aos fornecedores para começar a receber propostas.','in');
  h+='<div class="grid g2">'+c.fornecedores.map(function(f){
    var fo=LFI.forn(f); if(!fo) return ''; var p=propDe(c,f), its=itensForn(c,f);
    var x='<div class="cq-pc"><div class="hd"><span class="av lf">'+esc(ini(fo.nome))+'</span><div class="gr"><b>'+esc(fo.nome)+'</b><small>'+fo.whats+' · '+esc(fo.contato)+' · '+UI.estrelas(fo.qualidade)+'</small></div>'+
      (p?(p.conferida===false?UI.badge('Aguardando conferência','wt'):canalIc(p.canal)):UI.badge(e0?'Aguardando resposta':'Não enviada',e0?'wt':'nu'))+'</div>';
    if(p){ var t=totalProposta(c,p);
      x+='<div class="kv c4" style="margin-bottom:12px"><div><span>Recebida</span><b>'+F.hora(p.recebida)+' <small>'+F.relativo(p.recebida).replace(/ às.*/,'')+'</small></b></div><div><span>Resposta em</span><b>'+(e0?dur(difMin(e0,p.recebida)):'—')+'</b></div><div><span>Entrega</span><b>'+p.prazo+' dia'+(p.prazo>1?'s':'')+'</b></div><div><span>Frete</span><b>'+(p.frete?F.moeda(p.frete):'Grátis')+'</b></div></div>';
      x+='<table class="tb cp"><thead><tr><th>Produto</th><th class="r">Preço</th><th class="r">Disponível</th></tr></thead><tbody>'+its.map(function(i){ var it=null; p.itens.forEach(function(z){ if(z.prod===i.prod) it=z; }); var ok=it&&it.preco>0&&it.qtdDisp>0, parc=ok&&it.qtdDisp<i.qtd;
        return '<tr><td>'+esc(curto(prodN(i.prod)))+'<small>'+esc(qtdP(i.prod,i.qtd))+' solicitados</small></td><td class="r">'+(ok?'<b>'+F.moeda(it.preco)+'</b>':'<span class="badge b-no"><i></i>Indisponível</span>')+'</td><td class="r">'+(ok?(parc?'<span style="color:#946C00;font-weight:800">'+esc(qtdP(i.prod,it.qtdDisp))+'</span>':esc(qtdP(i.prod,it.qtdDisp))):'—')+'</td></tr>'; }).join('')+'</tbody></table>';
      x+='<div class="cq-wa-ft"><span>'+esc(p.cond)+' · '+t.n+' de '+its.length+' itens · <b style="color:var(--text)">'+F.moeda(t.total)+'</b></span><span style="display:flex;gap:6px"><button class="btn sec xs" data-act="verOrig" data-id="'+f+'">Ver original</button>'+
        (p.conferida===false?'<button class="btn pri xs" data-act="conferir" data-id="'+f+'">Conferir</button>':(['aprovada','convertida','cancelada'].indexOf(c.status)<0?'<button class="btn gh xs" data-act="revisar" data-id="'+f+'">Editar</button>':''))+'</span></div>';
    } else {
      x+='<div class="cq-chips" style="margin-bottom:12px">'+its.map(function(i){ return '<span class="cq-chip">'+esc(curto(prodN(i.prod)))+' <b>'+esc(qtdP(i.prod,i.qtd))+'</b></span>'; }).join('')+'</div>';
      x+='<div style="font-size:12px;color:var(--muted);font-weight:600;margin-bottom:10px">'+(e0?'Mensagem enviada '+F.relativo(c.envios&&c.envios[f]||e0).toLowerCase()+' · sem resposta há '+dur(difMin(c.envios&&c.envios[f]||e0, LFI.agoraISO())):'Cotação ainda não enviada a este fornecedor.')+'</div>';
      if(podeReceber&&e0) x+='<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><small style="font-size:11.5px;font-weight:800;color:var(--muted);margin-right:2px">Simular resposta:</small><button class="btn sec xs" data-act="sim" data-id="'+f+'|pdf">'+UI.ic('pdf')+'PDF</button><button class="btn sec xs" data-act="sim" data-id="'+f+'|excel">'+UI.ic('excel')+'Excel</button><button class="btn sec xs" data-act="sim" data-id="'+f+'|whatsapp">'+UI.ic('whats')+'Mensagem</button></div>';
    }
    return x+'</div>'; }).join('')+'</div>';
  return h;
}

/* ---------- itens e fornecedores ---------- */
function secItens(c, editavel){
  if(editavel) garantirItemForn(c);
  var fs=c.fornecedores.slice();
  var h='<div class="card pad0"><h3 style="padding:16px 20px 12px;margin:0"><span class="lft">'+UI.ic('lista')+' Produtos × fornecedores</span>'+(editavel?'<select class="inp sm" style="width:auto" data-chg="addFcol"><option value="">+ Incluir fornecedor</option>'+LFI.db.fornecedores.filter(function(f){ return fs.indexOf(f.id)<0; }).map(function(f){ return '<option value="'+f.id+'">'+esc(f.nome)+'</option>'; }).join('')+'</select>':'<small>quem foi acionado para cada item</small>')+'</h3>';
  h+='<div class="tb-wrap"><table class="tb"><thead><tr><th>Produto</th><th class="r">Quantidade</th><th class="r">Estoque · mín.</th>'+fs.map(function(f){ return '<th class="c">'+esc(LFI.forn(f).nome)+'</th>'; }).join('')+(editavel?'<th></th>':'')+'</tr></thead><tbody>';
  c.itens.forEach(function(i){ var p=LFI.prod(i.prod), lig=fornDoProd(i.prod).map(function(f){ return f.id; }), sel=fornsItem(c,i.prod);
    h+='<tr><td><div class="cp-prod">'+UI.fotoProd(p,38)+'<div><b>'+esc(p.nome)+'</b><small>'+esc(LFI.cat(p.cat).nome)+'</small></div></div></td><td class="r">'+(editavel?'<input class="inp sm num" style="width:84px;display:inline-block" data-chg="qtdIt" data-id="'+p.id+'" value="'+UI.numBR(i.qtd)+'"> <small style="display:inline">'+p.un+'</small>':'<b>'+esc(qtdP(p.id,i.qtd))+'</b>')+'</td><td class="r">'+F.qtd(LFI.estoqueGeral(p),p.un)+'<small>mín. '+F.qtd(p.estMin,p.un)+'</small></td>';
    fs.forEach(function(f){ var on=sel.indexOf(f)>=0, pr=propDe(c,f), it=null; if(pr) pr.itens.forEach(function(z){ if(z.prod===i.prod) it=z; });
      if(editavel) h+='<td class="c"><label class="chk" style="justify-content:center"><input type="checkbox" data-chg="tgIF" data-id="'+p.id+'|'+f+'"'+(on?' checked':'')+'></label><small>'+(p.forn===f?'principal':lig.indexOf(f)>=0?'alternativo':'')+'</small></td>';
      else h+='<td class="c">'+(!on?'<span style="color:var(--s4)">—</span>':pr?(it&&it.preco>0&&it.qtdDisp>0?'<b>'+F.moeda(it.preco)+'</b>':'<small style="color:var(--red)">indisponível</small>'):'<span style="color:var(--green);font-weight:800">✓</span><small>aguardando</small>')+'</td>'; });
    if(editavel) h+='<td class="r"><button class="btn gh xs" data-act="remIt" data-id="'+p.id+'" title="Remover item">'+UI.ic('lixo')+'</button></td>';
    h+='</tr>'; });
  h+='</tbody></table></div>';
  if(editavel) h+='<div style="display:flex;gap:8px;align-items:center;padding:12px 20px 16px;flex-wrap:wrap;border-top:1px solid var(--border)"><select class="inp sm" id="cq-np" style="max-width:300px">'+UI.selProdutos('')+'</select><input class="inp sm num" id="cq-nq" style="width:90px" placeholder="Qtd"><button class="btn sec sm" data-act="addIt">'+UI.ic('mais')+'Adicionar item</button><span style="flex:1"></span><small style="font-size:11.5px;color:var(--muted);font-weight:600">Edição liberada enquanto a cotação está em preparação.</small></div>';
  h+='</div>';
  if(c.origem==='foto'||c.textoOriginal){
    var lado=c.origem==='foto'?'<div class="card"><h3><span class="lft">'+UI.ic('foto')+' Lista original</span><small>foto enviada</small></h3><div class="cq-sm">'+papel(linhasFoto(c),'Pedido do '+(LFI.dep(c.dep)?LFI.dep(c.dep).curto.toLowerCase():'dia'),'cq-sm',true)+'</div></div>'
      :'<div class="card"><h3><span class="lft">'+UI.ic('lista')+' Texto original</span></h3><pre class="mono" style="white-space:pre-wrap;margin:0;background:var(--s2);border-radius:10px;padding:12px">'+esc(c.textoOriginal)+'</pre></div>';
    h='<div class="grid g21"><div>'+h+'</div><div>'+lado+'</div></div>';
  }
  return h;
}

/* ---------- mensagens ---------- */
function secMensagens(c){
  var e0=enviadaEm(c);
  var h=e0?UI.nota('Conversas pelo WhatsApp Business do grupo. Cada fornecedor recebeu apenas os itens que fornece. Respostas em PDF e planilha chegam como anexo e são lidas automaticamente.','in','whats')
          :UI.nota('<b>Prévia das mensagens.</b> Nada foi enviado ainda — use "Enviar aos fornecedores".','wt','whats');
  return h+'<div class="grid g2">'+c.fornecedores.map(function(f){ return LFI.forn(f)?'<div>'+waConversa(c,f,{realce:true})+'</div>':''; }).join('')+'</div>';
}

/* ---------- histórico ---------- */
function eventos(c){
  var ev=[{d:c.data, t:'Cotação criada', s:(ORIGEM[c.origem]||ORIGEM.manual)[0]+' · '+c.resp+' · '+plural(c.itens.length,'item','itens')}];
  var e=enviadaEm(c);
  if(e&&!temHist(c,'envio')) ev.push({d:e, t:'Enviada a '+plural(c.fornecedores.length,'fornecedor','fornecedores')+' pelo WhatsApp', s:'Mensagens personalizadas geradas automaticamente · status: aguardando propostas'});
  c.propostas.forEach(function(p){ var fo=LFI.forn(p.forn); ev.push({d:p.recebida, t:'Proposta de '+(fo?fo.nome:p.forn), s:'via '+CANAL[p.canal][0]+(e?' · resposta em '+dur(difMin(e,p.recebida)):'')+(p.conferida===false?' · aguardando conferência':' · conferida e vinculada')}); });
  (c.hist||[]).forEach(function(x){ ev.push(x); });
  var ult=c.propostas.reduce(function(a,p){ return p.recebida>a?p.recebida:a; }, c.data);
  if(['comparacao','aprovada','convertida'].indexOf(c.status)>=0&&!temHist(c,'comparacao')) ev.push({d:somaMin(ult,6), t:'Comparação iniciada', s:'Comparador ponderado com '+plural(propostasOk(c).length,'proposta','propostas')});
  if(c.status==='convertida'&&!temHist(c,'convertida')) ev.push({d:somaMin(ult,40), t:'Convertida em ordem de compra', s:(c.ordens||[]).map(function(id){ var o=LFI.ordem(id); return o?o.num:''; }).join(', ')});
  if(c.status==='cancelada'&&!temHist(c,'cancelada')) ev.push({d:c.canceladaEm||somaMin(c.data,60), t:'Cotação cancelada', s:c.motivo||c.obs||''});
  return ev.sort(function(a,b){ return a.d<b.d?-1:a.d>b.d?1:0; });
}
function secHistorico(c){
  var ev=eventos(c);
  return '<div class="grid g21"><div class="card"><h3><span class="lft">'+UI.ic('relogio')+' Linha do tempo</span><small>'+plural(ev.length,'evento','eventos')+'</small></h3><div class="tl">'+ev.map(function(x,i){ return '<div class="tl-it '+(i===ev.length-1?'on':'ok')+'"><b>'+esc(x.t)+'</b><small>'+F.dataHora(x.d)+(x.u?' · '+esc(x.u):'')+(x.s?' · '+esc(x.s):'')+'</small></div>'; }).join('')+'</div></div>'+
    '<div class="card"><h3>Dados da cotação</h3><div class="kv"><div><span>Número</span><b>'+esc(c.num)+'</b></div><div><span>Status</span><b>'+UI.status('cot',c.status)+'</b></div><div><span>Responsável</span><b>'+esc(c.resp)+'</b></div><div><span>Origem</span><b>'+esc((ORIGEM[c.origem]||ORIGEM.manual)[0])+'</b></div><div><span>Departamento</span><b>'+esc(LFI.dep(c.dep)?LFI.dep(c.dep).nome:'')+'</b></div><div><span>Empresa</span><b>'+esc(LFI.emp(c.empresa).fantasia)+'<small> '+LFI.emp(c.empresa).cnpj+'</small></b></div><div><span>Criada em</span><b>'+F.dataHora(c.data)+'</b></div><div><span>Prazo de retorno</span><b>'+F.dataHora(c.prazoRetorno)+'</b></div></div>'+
    (c.ordens&&c.ordens.length?'<div style="margin-top:16px"><div style="font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Ordens de compra geradas</div>'+c.ordens.map(function(id){ var o=LFI.ordem(id); return o?'<div class="li cl" data-act="_ir" data-id="ordens/'+o.id+'"><span class="av">'+UI.ic('ordem')+'</span><div class="gr"><div class="tt">'+esc(o.num)+'</div><div class="dd">'+esc(LFI.forn(o.forn).nome)+' · '+F.moeda(LFI.totalOrdem(o))+'</div></div>'+UI.status('oc',o.status)+'</div>':''; }).join('')+'</div>':'')+'</div></div>';
}

/* =====================================================================
   AÇÕES DO DETALHE
   ===================================================================== */
function handlersDetalhe(el, c, A){
  var s=st();
  function salvaRe(){ LFI.salvar(); LFI.recarregar(); }
  return {
    aba:function(id){ s.abas[c.id]=id; LFI.recarregar(); },
    pdf:function(){ imprimir(c,A); },
    enviar:function(){ enviarModal(c); },
    cancelar:function(){ cancelarModal(c); },
    lembrete:function(){ var pend=c.fornecedores.filter(function(f){ return !propDe(c,f); }); if(!pend.length){ UI.toast('Todos os fornecedores já responderam'); return; } hist(c,'lembrete','Lembrete enviado pelo WhatsApp', pend.map(function(f){ return LFI.forn(f).nome; }).join(', ')); LFI.salvar(); UI.toast('Lembrete enviado a '+plural(pend.length,'fornecedor','fornecedores'),'Prazo de retorno: '+F.dataHora(c.prazoRetorno),'in'); LFI.recarregar(); },
    receber:function(){ escolherRecebimento(c); },
    sim:function(id){ var p=id.split('|'); receberModal(c,p[0],p[1]); },
    conferir:function(f){ var p=propDe(c,f); if(p) receberModal(c,f,p.canal,{existente:p, animar:true}); },
    revisar:function(f){ var p=propDe(c,f); if(p) receberModal(c,f,p.canal,{existente:p, animar:false}); },
    verOrig:function(f){ var p=propDe(c,f); if(!p) return; var fo=LFI.forn(f); UI.modal({titulo:'Original recebido · '+esc(fo.nome), sub:CANAL[p.canal][0]+' · '+F.dataHora(p.recebida)+' · vinculado à '+esc(c.num), tam:'lg', corpo:original(c,p,true)}); },
    simTodas:function(){
      var pend=c.fornecedores.filter(function(f){ return !propDe(c,f); }); if(!pend.length){ UI.toast('Todos os fornecedores já responderam'); return; }
      var canais=['whatsapp','pdf','excel']; pend.forEach(function(f,i){ var pr=gerarProposta(c,f,canais[(i+c.propostas.length)%3]); pr.recebida=LFI.agoraISO(); c.propostas.push(pr); });
      atualizaStatus(c); LFI.atividade('cotacao',plural(pend.length,'proposta recebida','propostas recebidas')+' para a '+c.num,{tela:'compras',id:c.id}); s.abas[c.id]='propostas'; LFI.salvar(); LFI.recarregar();
      UI.toast(plural(pend.length,'proposta recebida','propostas recebidas'),'Valores extraídos automaticamente — confira antes de comparar','in'); },
    comparar:function(){ if(c.status!=='comparacao'){ c.status='comparacao'; hist(c,'comparacao','Comparação iniciada','Comparador ponderado com '+plural(propostasOk(c).length,'proposta','propostas')); } s.abas[c.id]='comparador'; salvaRe(); },
    esc:function(id){ var p=id.split('|'); c.escolhas=c.escolhas||{}; if(c.escolhas[p[0]]===p[1]) delete c.escolhas[p[0]]; else c.escolhas[p[0]]=p[1]; iniciaComparacao(c); salvaRe(); },
    aplRec:function(){ c.escolhas=mapaRec(A); iniciaComparacao(c); salvaRe(); UI.toast('Recomendação aplicada','Melhor nota ponderada em cada item','in'); },
    aplMenor:function(){ c.escolhas=mapaMenor(A); iniciaComparacao(c); salvaRe(); var K=cesta(A,c.escolhas); UI.toast('Menor preço em cada item', K.parciais.length?'Atenção: '+plural(K.parciais.length,'item com cobertura parcial','itens com cobertura parcial'):'', K.parciais.length?'wt':'in'); },
    limpar:function(){ c.escolhas={}; salvaRe(); },
    pesoV:function(k,ev){ s.pesos[k]=+ev.target.value; var W=s.pesos, tw=(W.preco+W.disp+W.prazo+W.cond+W.qual)||1; Object.keys(W).forEach(function(x){ var b=el.querySelector('#cq-pw-'+x); if(b) b.textContent=Math.round(W[x]/tw*100)+'%'; }); },
    pesoOk:function(k,ev){ s.pesos[k]=+ev.target.value; LFI.recarregar(); },
    pesosPad:function(){ s.pesos=JSON.parse(JSON.stringify(PESOS0)); LFI.recarregar(); },
    aprovar:function(){ aprovarModal(c, analise(c)); },
    verOcs:function(){ LFI.estado.ordens=LFI.estado.ordens||{}; LFI.estado.ordens.busca=c.grupo||''; LFI.ir('ordens'); },
    qtdIt:function(prod,ev){ var q=r3(UI.num(ev.target.value)); if(!(q>0)){ UI.toast('Quantidade inválida','','wt'); LFI.recarregar(); return; } c.itens.forEach(function(i){ if(i.prod===prod) i.qtd=q; }); salvaRe(); },
    remIt:function(prod){ if(c.itens.length<=1){ UI.toast('A cotação precisa de ao menos um item','','wt'); return; } c.itens=c.itens.filter(function(i){ return i.prod!==prod; }); delete c.itemForn[prod]; if(c.escolhas) delete c.escolhas[prod]; sincForn(c); salvaRe(); UI.toast('Item removido da cotação'); },
    addIt:function(){ var p=el.querySelector('#cq-np').value, q=UI.num(el.querySelector('#cq-nq').value); if(!p||!(q>0)){ UI.toast('Escolha o produto e a quantidade','','wt'); return; } var ex=null; c.itens.forEach(function(i){ if(i.prod===p) ex=i; }); if(ex) ex.qtd=r3(ex.qtd+q); else { c.itens.push({prod:p, qtd:r3(q)}); var fs=fornDoProd(p).map(function(f){ return f.id; }); c.itemForn[p]=fs.length?fs:c.fornecedores.slice(0,1); } sincForn(c); salvaRe(); UI.toast(ex?'Quantidade somada ao item existente':'Item incluído', prodN(p)); },
    tgIF:function(id,ev){ var p=id.split('|'), a=c.itemForn[p[0]]=c.itemForn[p[0]]||[], k=a.indexOf(p[1]); if(ev.target.checked&&k<0) a.push(p[1]); if(!ev.target.checked&&k>=0){ if(a.length<=1){ ev.target.checked=true; UI.toast('Cada item precisa de pelo menos um fornecedor','','wt'); return; } a.splice(k,1); } sincForn(c); salvaRe(); },
    addFcol:function(_,ev){ var f=ev.target.value; if(!f) return; c.itens.forEach(function(i){ var a=c.itemForn[i.prod]=c.itemForn[i.prod]||[]; if(a.indexOf(f)<0) a.push(f); }); sincForn(c); salvaRe(); UI.toast(LFI.forn(f).nome+' incluído','Desmarque os itens que ele não deve cotar','in'); }
  };
}
function iniciaComparacao(c){ if(['propostas_recebidas','aguardando_propostas','enviada'].indexOf(c.status)>=0){ c.status='comparacao'; hist(c,'comparacao','Comparação iniciada','Escolha de fornecedores no comparador'); } }

/* enviar aos fornecedores: prévia por fornecedor e envio simulado */
function enviarModal(c){
  garantirItemForn(c); sincForn(c);
  if(!c.fornecedores.length){ UI.toast('Inclua ao menos um fornecedor','','wt'); return; }
  var sel={}, atual=c.fornecedores[0]; c.fornecedores.forEach(function(f){ sel[f]=true; });
  function corpo(){
    return '<div class="cq-env"><div><div style="font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">Destinatários</div><div class="lst">'+c.fornecedores.map(function(f){ var fo=LFI.forn(f); return '<div class="li'+(f===atual?' on':'')+'" data-act="ver" data-id="'+f+'"><input type="checkbox" data-chg="sel" data-id="'+f+'"'+(sel[f]?' checked':'')+' style="width:16px;height:16px;accent-color:var(--roxo)"><div class="gr"><div class="tt" style="font-size:13px">'+esc(fo.nome)+'</div><div class="dd">'+fo.whats+' · '+plural(itensForn(c,f).length,'item','itens')+'</div></div></div>'; }).join('')+'</div>'+
      UI.nota('Cada fornecedor recebe somente os itens que fornece, com o prazo de retorno <b>'+F.dataHora(c.prazoRetorno)+'</b>.','in')+'</div><div>'+waConversa(c,atual,{semResposta:true})+'</div></div>';
  }
  function nSel(){ return Object.keys(sel).filter(function(f){ return sel[f]; }).length; }
  function rod(){ return '<button class="btn sec" data-act="_fechar">Cancelar</button><button class="btn pri" data-act="ok"'+(nSel()?'':' disabled')+'>'+UI.ic('whats')+'Enviar para '+plural(nSel(),'fornecedor','fornecedores')+'</button>'; }
  var m=UI.modal({titulo:'Enviar cotação pelo WhatsApp', sub:esc(c.num)+' · prévia da mensagem de cada fornecedor', tam:'xl', corpo:corpo(), botoes:rod(), acoes:{
    ver:function(f,ev){ if(ev.target.tagName==='INPUT') return; atual=f; m.corpoHTML(corpo()); },
    sel:function(f,ev){ sel[f]=ev.target.checked; m.rodapeHTML(rod()); },
    ok:function(){
      var lista=c.fornecedores.filter(function(f){ return sel[f]; }); if(!lista.length) return;
      m.rodapeHTML('<button class="btn pri" disabled>Enviando…</button>');
      m.corpoHTML('<div class="leitura">'+lista.map(function(f,i){ var fo=LFI.forn(f); return '<div class="lt-it" id="cq-ev'+i+'"><span class="bo"></span><span style="flex:1">'+esc(fo.nome)+' <small style="color:var(--muted)">'+fo.whats+'</small></span><small id="cq-evs'+i+'" style="color:var(--muted);font-weight:700">na fila</small></div>'; }).join('')+'</div>');
      c.status='enviada'; var agora=LFI.agoraISO(); c.enviadaEm=agora; c.envios=c.envios||{};
      var i=0;
      (function passo(){
        if(i>0){ var a=m.el.querySelector('#cq-ev'+(i-1)); a.classList.remove('on'); a.classList.add('ok'); a.querySelector('.bo').textContent='✓'; m.el.querySelector('#cq-evs'+(i-1)).innerHTML='<span style="color:#34B7F1">✓✓</span> entregue '+LFI.agoraHM(); }
        if(i>=lista.length){
          /* quem foi desmarcado sai da cotação */
          c.itens.forEach(function(it){ c.itemForn[it.prod]=(c.itemForn[it.prod]||[]).filter(function(f){ return sel[f]; }); });
          sincForn(c); lista.forEach(function(f){ c.envios[f]=agora; });
          hist(c,'envio','Enviada a '+plural(lista.length,'fornecedor','fornecedores')+' pelo WhatsApp','Status: enviada → aguardando propostas');
          c.status='aguardando_propostas'; st().abas[c.id]='propostas';
          LFI.atividade('cotacao',c.num+' enviada a '+plural(lista.length,'fornecedor','fornecedores')+' pelo WhatsApp',{tela:'compras',id:c.id});
          LFI.salvar(); setTimeout(function(){ m.fechar(); LFI.recarregar(); UI.toast('Cotação enviada pelo WhatsApp',plural(lista.length,'fornecedor','fornecedores')+' · aguardando propostas'); },450); return;
        }
        m.el.querySelector('#cq-ev'+i).classList.add('on'); m.el.querySelector('#cq-evs'+i).textContent='enviando…'; i++; setTimeout(passo,520);
      })();
    }}});
}

function escolherRecebimento(c){
  var pend=c.fornecedores.filter(function(f){ return !propDe(c,f); });
  if(!pend.length){ UI.toast('Todos os fornecedores já responderam'); return; }
  var m=UI.modal({titulo:'Registrar proposta recebida', sub:esc(c.num)+' · '+plural(pend.length,'fornecedor aguardando','fornecedores aguardando'), corpo:
    '<div class="field"><label>Fornecedor</label><select class="inp" id="cq-rf">'+pend.map(function(f){ return '<option value="'+f+'">'+esc(LFI.forn(f).nome)+'</option>'; }).join('')+'</select></div><label style="display:block;font-size:12px;font-weight:800;margin-bottom:8px">Como a proposta chegou</label>'+
    '<div style="display:flex;flex-direction:column;gap:8px">'+[['pdf','pdf','Arquivo PDF','Proposta comercial enviada como anexo'],['excel','excel','Planilha Excel','Planilha preenchida pelo fornecedor'],['whatsapp','whats','Mensagem de WhatsApp','Resposta escrita direto na conversa']].map(function(x){ return '<button type="button" class="cq-modo" data-act="canal" data-id="'+x[0]+'"><span class="av" style="color:'+CANAL[x[0]][2]+'">'+UI.ic(x[1])+'</span><span><b>'+x[2]+'</b><small>'+x[3]+'</small></span></button>'; }).join('')+'</div>'+
    UI.nota('A proposta é vinculada automaticamente a esta cotação pelo número de referência e pelo contato do fornecedor.','in'),
    acoes:{canal:function(k){ var f=m.el.querySelector('#cq-rf').value; m.fechar(); setTimeout(function(){ receberModal(c,f,k); },230); }}});
}

/* recebimento de proposta: leitura simulada (PDF, Excel, mensagem) + conferência */
function receberModal(c, f, canal, o){
  o=o||{}; var fo=LFI.forn(f), pr=o.existente||gerarProposta(c,f,canal), animar=o.animar!==false; canal=pr.canal;
  var etapas={pdf:['Anexo PDF recebido pelo WhatsApp','Leitura do documento (OCR)','Identificação da tabela de preços','Correspondência com os itens da cotação','Extração de prazo, pagamento e frete'],
    excel:['Planilha recebida pelo WhatsApp','Leitura das abas e colunas','Identificação das colunas de preço e quantidade','Correspondência com os itens da cotação','Extração de prazo, pagamento e frete'],
    whatsapp:['Mensagem recebida na conversa','Interpretação do texto (linguagem natural)','Identificação de preços e quantidades','Correspondência com os itens da cotação','Extração de prazo, pagamento e frete']}[canal];
  var pedidos=itensForn(c,f);
  function conf(){
    var R=U.rng(hash(c.id+f+'conf'));
    var h=UI.nota('<b>Valores extraídos automaticamente.</b> Confira e ajuste antes de aceitar — a proposta só entra no comparador depois de conferida.','lf','ia');
    h+='<div class="tb-wrap"><table class="tb cp"><thead><tr><th>Produto da cotação</th><th class="r">Pedido</th><th class="r">Preço unit.</th><th class="r">Qtd disponível</th><th class="c">Atende</th><th>Confiança</th></tr></thead><tbody>'+pedidos.map(function(i){ var it=null; pr.itens.forEach(function(z){ if(z.prod===i.prod) it=z; }); it=it||{preco:0,qtdDisp:0}; var ok=it.preco>0&&it.qtdDisp>0, cf=Math.round((canal==='whatsapp'?82:90)+R()*(canal==='whatsapp'?15:9)), p=LFI.prod(i.prod);
      return '<tr><td><b>'+esc(curto(p.nome))+'</b><small>custo médio '+F.moeda(p.custoMedio)+'</small></td><td class="r">'+esc(qtdP(i.prod,i.qtd))+'</td><td class="r"><input class="inp sm num" style="width:92px" data-k="preco" data-p="'+i.prod+'" value="'+(ok?UI.numBR(it.preco,2):'')+'" placeholder="—"></td><td class="r nw"><input class="inp sm num" style="width:80px;display:inline-block" data-k="qtd" data-p="'+i.prod+'" value="'+(ok?UI.numBR(it.qtdDisp):'')+'" placeholder="0"> <small style="display:inline">'+p.un+'</small></td><td class="c"><input type="checkbox" data-k="disp" data-p="'+i.prod+'"'+(ok?' checked':'')+' style="width:16px;height:16px;accent-color:var(--roxo)"></td><td>'+(ok?UI.match(cf):UI.badge('Indisponível','no'))+'</td></tr>'; }).join('')+'</tbody></table></div>';
    h+='<div class="fgrid c3" style="margin-top:14px"><div class="field"><label>Prazo de entrega (dias)</label><input class="inp num" id="cq-pz" value="'+pr.prazo+'"></div><div class="field"><label>Condição de pagamento</label><input class="inp" id="cq-cd" value="'+esc(pr.cond)+'"></div><div class="field"><label>Frete (R$)</label><input class="inp num" id="cq-fr" value="'+UI.numBR(pr.frete||0,2)+'"></div></div>';
    return h;
  }
  var m=UI.modal({titulo:'Proposta de '+esc(fo.nome), sub:'Recebida via '+CANAL[canal][0]+' · vinculada automaticamente à '+esc(c.num), tam:'xl', fixo:true,
    corpo:'<div class="cq-rx"><div><div id="cq-orig" class="'+(animar?'scan':'')+'">'+original(c,pr,!animar)+'</div></div><div id="cq-dir">'+(animar?'<h3 style="font-size:15px;font-weight:800;margin:0 0 12px">Lendo a proposta</h3><div class="leitura">'+etapas.map(function(t,i){ return '<div class="lt-it" id="cq-rl'+i+'"><span class="bo"></span>'+esc(t)+'</div>'; }).join('')+'</div>':conf())+'</div></div>',
    botoes:'<button class="btn sec" data-act="_fechar">'+(o.existente?'Fechar':'Descartar')+'</button><button class="btn pri" data-act="ok"'+(animar?' disabled':'')+'>'+UI.ic('check')+(o.existente&&pr.conferida!==false?'Salvar conferência':'Confirmar e vincular à cotação')+'</button>',
    acoes:{ok:function(){
      var dir=m.el.querySelector('#cq-dir');
      pr.itens.forEach(function(it){ var ip=dir.querySelector('[data-k="preco"][data-p="'+it.prod+'"]'); if(!ip) return; var q=UI.num(dir.querySelector('[data-k="qtd"][data-p="'+it.prod+'"]').value), pv=UI.num(ip.value), d=dir.querySelector('[data-k="disp"][data-p="'+it.prod+'"]').checked;
        it.disp=d&&pv>0&&q>0; it.preco=it.disp?r2(pv):0; it.qtdDisp=it.disp?r3(q):0; });
      pr.prazo=Math.max(0,Math.round(UI.num(m.el.querySelector('#cq-pz').value))); pr.cond=m.el.querySelector('#cq-cd').value.trim()||fo.cond; pr.frete=r2(UI.num(m.el.querySelector('#cq-fr').value));
      var novo=c.propostas.indexOf(pr)<0, eraPend=pr.conferida===false;
      pr.conferida=true; pr.conferidaEm=LFI.agoraISO(); pr.conferidaPor=LFI.usuario().nome;
      if(novo){ pr.recebida=pr.recebida||LFI.agoraISO(); c.propostas.push(pr); }
      if(c.status==='enviada') c.status='aguardando_propostas';
      atualizaStatus(c);
      if(novo||eraPend) LFI.atividade('cotacao',fo.nome+' respondeu a '+c.num+' ('+(canal==='whatsapp'?'WhatsApp':canal==='pdf'?'PDF':'Excel')+')',{tela:'compras',id:c.id});
      LFI.salvar(); m.fechar(); LFI.recarregar();
      UI.toast(novo||eraPend?'Proposta conferida e vinculada':'Conferência atualizada', fo.nome+' · '+c.num+(c.status==='propostas_recebidas'?' · todas as propostas recebidas':''));
    }}});
  if(!animar) return;
  var i=0;
  (function passo(){
    if(!document.body.contains(m.el)) return;
    if(i>0){ var a=m.el.querySelector('#cq-rl'+(i-1)); a.classList.remove('on'); a.classList.add('ok'); a.querySelector('.bo').textContent='✓'; }
    if(i>=etapas.length){
      var or=m.el.querySelector('#cq-orig'); or.classList.remove('scan'); if(canal==='whatsapp') or.innerHTML=original(c,pr,true);
      setTimeout(function(){ if(!document.body.contains(m.el)) return; m.el.querySelector('#cq-dir').innerHTML=conf(); var b=m.el.querySelector('[data-act="ok"]'); if(b) b.disabled=false; },380);
      return;
    }
    m.el.querySelector('#cq-rl'+i).classList.add('on'); i++; setTimeout(passo, 560);
  })();
}

function cancelarModal(c){
  var m=UI.modal({titulo:'Cancelar '+esc(c.num), tam:'sm', corpo:'<div class="field"><label>Motivo</label><select class="inp" id="cq-mot"><option>Compra fechada direto com o fornecedor</option><option>Necessidade suspensa pela operação</option><option>Prazo de retorno expirado sem propostas suficientes</option><option>Itens incluídos por engano</option><option>Outro motivo</option></select></div><div class="field"><label>Observação</label><textarea class="inp" id="cq-obs" style="min-height:70px"></textarea></div>'+
    (enviadaEm(c)?UI.nota('Os fornecedores serão avisados pelo WhatsApp de que a cotação foi encerrada.','wt'):''),
    botoes:'<button class="btn sec" data-act="_fechar">Voltar</button><button class="btn no" data-act="ok">Cancelar cotação</button>', acoes:{ok:function(){
      var mot=m.el.querySelector('#cq-mot').value, ob=m.el.querySelector('#cq-obs').value.trim();
      c.status='cancelada'; c.canceladaEm=LFI.agoraISO(); c.motivo=mot+(ob?' — '+ob:''); hist(c,'cancelada','Cotação cancelada',c.motivo);
      LFI.atividade('cotacao',c.num+' cancelada: '+mot,{tela:'compras',id:c.id}); LFI.salvar(); m.fechar(); LFI.recarregar(); UI.toast('Cotação cancelada',c.num,'wt'); }}});
}

/* aprovar e gerar OCs (uma por fornecedor, mesmo grupo = compra consolidada) */
function aprovarModal(c, A){
  var K=cesta(A, c.escolhas||{});
  if(!K.n){ UI.toast('Selecione os fornecedores no comparador','','wt'); return; }
  var grupo='GC-'+String(parseInt(c.num.split('-').pop(),10)||0).padStart(4,'0');
  var corpo=UI.nota('Será gerada a <b>compra consolidada '+grupo+'</b>: uma compra, '+plural(K.n,'ordem de compra','ordens de compra')+' (uma por fornecedor). Cada OC segue para aprovação em <b>Ordens de Compra</b>.','in','ordem')+
    '<div class="tb-wrap"><table class="tb"><thead><tr><th>Fornecedor</th><th>Itens</th><th>Condição</th><th>Entrega</th><th class="r">Valor</th></tr></thead><tbody>'+K.ordem.map(function(f){ var g=K.porF[f]; return '<tr><td><b>'+esc(LFI.forn(f).nome)+'</b><small>'+LFI.forn(f).whats+'</small></td><td>'+g.itens.map(function(i){ return esc(curto(prodN(i.prod)))+' <b>'+esc(qtdP(i.prod,i.qtd))+'</b> × '+F.moeda(i.preco); }).join('<br>')+'</td><td>'+esc(g.cond)+'</td><td class="nw">'+F.dataC(U.D(g.prazo))+'<small>'+g.prazo+' dia(s)</small></td><td class="r"><b>'+F.moeda(g.valor+g.frete)+'</b>'+(g.frete?'<small>frete '+F.moeda(g.frete)+'</small>':'')+'</td></tr>'; }).join('')+'</tbody><tfoot><tr><td colspan="4">Total da compra consolidada</td><td class="r">'+F.moeda(K.total)+'</td></tr></tfoot></table></div>'+
    (K.sem?UI.nota('<b>'+plural(K.sem,'item ficará','itens ficarão')+' sem fornecedor</b> e não entrará nas ordens.','wt','alerta'):'')+
    (K.parciais.length?UI.nota('Cobertura parcial: '+K.parciais.map(function(x){ return esc(curto(x.l.prod.nome))+' (faltam '+F.qtd(x.falta,x.l.prod.un)+')'; }).join(', ')+'. A OC sai com a quantidade disponível.','wt','alerta'):'')+
    '<div class="kv c3" style="margin-top:6px"><div><span>Economia vs. maior preço</span><b style="color:var(--green)">'+F.moeda(K.econPior)+'</b></div><div><span>vs. custo médio atual</span><b style="color:'+(K.econCM>=0?'var(--green)':'var(--red)')+'">'+(K.econCM>=0?'−':'+')+F.moeda(Math.abs(K.econCM))+'</b></div><div><span>Entrega completa até</span><b>'+F.data(K.entrega)+'</b></div></div>';
  var m=UI.modal({titulo:'Aprovar e gerar ordens de compra', sub:esc(c.num)+' · '+plural(K.n,'fornecedor','fornecedores'), tam:'lg', corpo:corpo,
    botoes:'<button class="btn sec" data-act="_fechar">Voltar</button><button class="btn pri" data-act="ok">'+UI.ic('check')+'Aprovar e gerar '+plural(K.n,'OC','OCs')+'</button>', acoes:{ok:function(){
      c.status='aprovada'; c.aprovadaEm=LFI.agoraISO(); c.aprovadaPor=LFI.usuario().nome; hist(c,'aprovada','Cotação aprovada','Cesta de '+plural(K.n,'fornecedor','fornecedores')+' · '+F.moeda(K.total));
      var ocs=K.ordem.map(function(f){ var g=K.porF[f]; return LFI.criarOrdem({forn:f, dep:c.dep, empresa:c.empresa, itens:g.itens, cond:g.cond, previsao:U.D(g.prazo), cot:c.id, grupo:grupo, obs:'Gerada pela '+c.num+' · compra consolidada '+grupo+(g.frete?' · frete R$ '+F.num(g.frete,2):'')}); });
      c.status='convertida'; c.ordens=ocs.map(function(x){ return x.id; }); c.grupo=grupo; c.convertidaEm=LFI.agoraISO();
      hist(c,'convertida','Convertida em ordem de compra',ocs.map(function(x){ return x.num; }).join(', ')+' · '+grupo);
      LFI.atividade('oc','Compra consolidada '+grupo+': '+plural(ocs.length,'OC gerada','OCs geradas')+' a partir da '+c.num,{tela:'ordens',id:ocs[0].id});
      LFI.salvar(); m.fechar();
      setTimeout(function(){ resultadoModal(c, ocs, K, grupo); },240);
    }}});
}
function resultadoModal(c, ocs, K, grupo){
  var h='<div style="text-align:center;padding:4px 0 14px"><div style="width:54px;height:54px;border-radius:50%;background:var(--g-soft);color:var(--green);display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:24px;font-weight:800">✓</div><div style="font-size:18px;font-weight:800">Compra consolidada '+esc(grupo)+'</div><div style="font-size:13px;color:var(--muted);font-weight:600;margin-top:4px">1 compra · '+plural(ocs.length,'fornecedor','fornecedores')+' · '+plural(ocs.length,'ordem de compra','ordens de compra')+' aguardando aprovação</div></div>';
  h+='<div class="kpis k3">'+UI.kpi({lb:'Valor total', vl:F.moeda(K.total), hl:true})+UI.kpi({lb:'Economia vs. maior preço', vl:F.moeda(K.econPior)})+UI.kpi({lb:'Entrega completa até', vl:F.dataC(K.entrega), dl:K.maxPrazo+' dia(s)'})+'</div>';
  h+='<div class="lst">'+ocs.map(function(o){ var fo=LFI.forn(o.forn); return '<div class="li cl" data-act="abrir" data-id="'+o.id+'"><span class="av lf">'+UI.ic('ordem')+'</span><div class="gr"><div class="tt">'+esc(o.num)+' · '+esc(fo.nome)+'</div><div class="dd">'+o.itens.map(function(i){ return esc(curto(prodN(i.prod)))+' '+esc(qtdP(i.prod,i.qtd)); }).join(' · ')+' · '+esc(o.cond)+' · entrega '+F.dataC(o.previsao)+'</div></div><div class="rt">'+F.moeda(LFI.totalOrdem(o))+'<small>'+UI.status('oc',o.status)+'</small></div></div>'; }).join('')+'</div>';
  var m=UI.modal({titulo:'Ordens de compra geradas', sub:esc(c.num)+' convertida', tam:'lg', corpo:h, aoFechar:function(){ if(LFI.atual().id==='compras') LFI.recarregar(); },
    botoes:'<button class="btn sec" data-act="_fechar">Fechar</button><button class="btn pri" data-act="todas">'+UI.ic('ordem')+'Ver em Ordens de Compra</button>',
    acoes:{abrir:function(id){ LFI.ir('ordens',id); }, todas:function(){ LFI.estado.ordens=LFI.estado.ordens||{}; LFI.estado.ordens.busca=grupo; LFI.ir('ordens'); }}});
}

/* mapa de cotação para impressão / PDF */
function imprimir(c, A){
  var E=c.escolhas||{}, emp=LFI.emp(c.empresa);
  var h='<div class="kp"><div><span>Cotação</span><b>'+esc(c.num)+'</b></div><div><span>Status</span><b>'+esc(stCot(c.status)[0])+'</b></div><div><span>Empresa</span><b>'+esc(emp.fantasia)+'</b></div><div><span>Fornecedores</span><b>'+c.fornecedores.length+'</b></div><div><span>Propostas</span><b>'+c.propostas.length+'</b></div></div>';
  h+='<h2>Mapa comparativo (preço por unidade)</h2><table><thead><tr><th>Produto</th><th class="r">Qtd</th>'+A.fs.map(function(f){ return '<th class="r">'+esc(LFI.forn(f).nome)+'</th>'; }).join('')+'</tr></thead><tbody>'+
    A.linhas.map(function(l){ return '<tr><td>'+esc(curto(prodN(l.item.prod)))+'</td><td class="r">'+esc(qtdP(l.item.prod,l.item.qtd))+'</td>'+A.fs.map(function(f){ var o=l.por[f]; return '<td class="r">'+(o?(E[l.item.prod]===f?'<b>✓ ':'')+F.moeda(o.preco)+(E[l.item.prod]===f?'</b>':'')+(o.qtdDisp<l.item.qtd?' ('+F.qtd(o.qtdDisp,l.prod.un)+')':'')+'<br><small>nota '+o.score+'</small>':'—')+'</td>'; }).join('')+'</tr>'; }).join('')+
    '</tbody><tfoot><tr><td colspan="2">Prazo · pagamento · frete</td>'+A.fs.map(function(f){ var p=propDe(c,f); return '<td class="r">'+p.prazo+'d · '+esc(p.cond)+' · '+(p.frete?F.moeda(p.frete):'grátis')+'</td>'; }).join('')+'</tr></tfoot></table>';
  if(A.fs.length){ var K=cestaAtual(c,A); h+='<h2>'+(Object.keys(E).length?'Cesta escolhida':'Cesta recomendada')+'</h2><table><thead><tr><th>Fornecedor</th><th>Itens</th><th class="r">Valor</th></tr></thead><tbody>'+K.ordem.map(function(f){ var g=K.porF[f]; return '<tr><td>'+esc(LFI.forn(f).nome)+'</td><td>'+g.itens.map(function(i){ return esc(curto(prodN(i.prod)))+' '+esc(qtdP(i.prod,i.qtd)); }).join(', ')+'</td><td class="r">'+F.moeda(g.valor+g.frete)+'</td></tr>'; }).join('')+'</tbody><tfoot><tr><td colspan="2">Total · economia vs. maior preço '+F.moeda(K.econPior)+'</td><td class="r">'+F.moeda(K.total)+'</td></tr></tfoot></table>'; }
  var W=st().pesos; h+='<p style="font-size:10px;color:#5E5E66">Pesos da análise: preço '+W.preco+' · disponibilidade '+W.disp+' · prazo '+W.prazo+' · pagamento '+W.cond+' · qualidade '+W.qual+'. O sistema não escolhe apenas pelo menor preço.</p>';
  UI.exportarPDF('Mapa de cotação '+c.num, F.dataHora(c.data)+' · '+c.resp+' · '+(LFI.dep(c.dep)?LFI.dep(c.dep).nome:''), h);
}


/* =====================================================================
   FLUXO SIMPLIFICADO: ORDEM → RESPOSTAS → PEDIDO → RECEBIMENTO
   (as telas "Produtos × fornecedores" e "Mapa comparativo" são reaproveitadas)
   ===================================================================== */
function css2(){ if(document.getElementById('css-compras2')) return; var e=document.createElement('style'); e.id='css-compras2'; e.textContent=[
  '.o2-n{display:inline-flex;width:24px;height:24px;border-radius:50%;background:var(--roxo);color:#fff;font-size:12px;font-weight:800;align-items:center;justify-content:center;margin-right:8px;flex:none}','.o2-ent{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}','.o2-dep{display:flex;flex-direction:column;align-items:flex-start;gap:2px;border:1.5px solid var(--border2);border-radius:12px;padding:12px 14px;background:var(--s1);cursor:pointer;font:inherit;color:inherit;text-align:left}','.o2-dep i{width:9px;height:9px;border-radius:3px;margin-bottom:4px}','.o2-dep b{font-size:14.5px}','.o2-dep small{font-size:12px;color:var(--muted);font-weight:600}','.o2-dep.on{border-color:var(--roxo);background:var(--lf-soft)}','.o2-busca{max-width:760px;margin:6px auto 0;position:relative}','.o2-bx{display:flex;align-items:center;gap:10px;border:2px solid var(--border2);border-radius:14px;padding:0 12px;background:#fff;min-height:56px;flex-wrap:wrap}','.o2-bx:focus-within{border-color:var(--roxo)}','.o2-bx>svg{width:20px;height:20px;stroke:var(--muted);fill:none;stroke-width:2;flex:none}','.o2-bx>input{flex:1;min-width:180px;border:0;outline:none;font:inherit;font-size:17px;font-weight:700;padding:14px 0;background:transparent}','.o2-bx>input[readonly]{color:var(--roxo-esc);cursor:pointer}','.o2-qbox{display:flex;align-items:center;gap:8px}','.o2-qbox[hidden]{display:none}','.o2-rh{cursor:pointer;user-select:none;margin:0!important}.card .o2-rh+.tb-wrap{margin-top:14px}','.o2-dot{font-size:11.5px;font-weight:800;border-radius:99px;padding:2px 9px;background:var(--s3);color:var(--muted2)}.o2-dot.on{background:var(--roxo);color:#fff}','.o2-seta{font-size:12.5px;font-weight:700;color:var(--roxo)}','.o2-zero{border-color:#F3B27A!important;background:#FFF7F0!important}','.o2-it.zero{background:#FFF1E8;color:#8A3A0A}','@media(max-width:700px){.o2-ent{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.o2-dep{padding:9px 10px}.o2-dep b{font-size:13px}.o2-dep small{display:none}.o2-bx>input{font-size:15px}}','.o2-qbox input{width:110px;border:1.5px solid var(--border2);border-radius:10px;padding:8px 10px;font:inherit;font-size:16px;font-weight:800;text-align:right;outline:none}','.o2-qbox input:focus{border-color:var(--roxo)}','.o2-qbox span{font-weight:800;color:var(--muted2)}','.o2-res{position:absolute;left:0;right:0;top:calc(100% + 6px);background:#fff;border:1px solid var(--border2);border-radius:14px;box-shadow:var(--sh3);z-index:30;overflow:auto;max-height:min(420px,55vh)}','.o2-res:empty{display:none}','.o2-r{display:grid;grid-template-columns:auto 1fr auto;gap:2px 12px;align-items:center;width:100%;text-align:left;border:0;background:none;padding:10px 14px;cursor:pointer;font:inherit;color:inherit;border-bottom:1px solid var(--border)}','.o2-r .fprod{grid-row:1/span 2}.o2-r b{font-size:14px;grid-column:2}.o2-r small{grid-column:2;font-size:12px;color:var(--muted);font-weight:600}.o2-r .badge{grid-row:1/span 2;grid-column:3;align-self:center}','.o2-r.on,.o2-r:hover{background:var(--lf-soft)}','.o2-nada{padding:14px;color:var(--muted);font-weight:600;font-size:13px}','.o2-lis{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:14px}','.o2-it{display:inline-flex;align-items:center;gap:6px;background:var(--s3);border-radius:99px;padding:6px 6px 6px 12px;font-size:13px}','.o2-it button{border:0;background:#fff;width:22px;height:22px;border-radius:50%;cursor:pointer;color:var(--muted2);font-size:11px}','.o2-top{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:16px}',
  '.o2-x{width:38px;height:38px;border-radius:50%;border:1px solid var(--border2);background:#fff;cursor:pointer;font-size:15px;color:var(--muted2);flex:none}',
  '.o2-tit{flex:1 1 260px;min-width:0}.o2-tit h1{margin:0;font-size:21px;font-weight:800;display:flex;align-items:center;gap:10px;flex-wrap:wrap}.o2-tit small{display:block;font-size:12.5px;color:var(--muted);font-weight:600;margin-top:3px}',
  '.o2-acs{display:flex;gap:8px;flex-wrap:wrap}',
  '.o2-flux{display:flex;align-items:center;gap:0;background:var(--s1);border:1px solid var(--border);border-radius:var(--r);padding:12px 18px;margin-bottom:16px;overflow-x:auto}',
  '.o2-fi{display:flex;align-items:center;gap:9px;flex:none;font-size:12.5px;font-weight:800;color:var(--muted)}.o2-fi .bo{width:26px;height:26px;border-radius:50%;border:2px solid var(--border2);display:flex;align-items:center;justify-content:center;font-size:11.5px;background:#fff}',
  '.o2-fi.on{color:var(--text)}.o2-fi.on .bo{border-color:var(--roxo);color:var(--roxo)}.o2-fi.ok{color:var(--text)}.o2-fi.ok .bo{background:var(--roxo);border-color:var(--roxo);color:#fff}.o2-fi small{display:block;font-size:11px;font-weight:600;color:var(--muted)}',
  '.o2-fl{flex:1 1 30px;min-width:30px;height:2px;background:var(--border2);margin:0 12px}.o2-fl.ok{background:var(--roxo)}',
  '.o2-resp{display:inline-flex;align-items:center;gap:6px;font-weight:800;font-variant-numeric:tabular-nums}',
  '.o2-novo{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:800;color:#fff;background:var(--roxo);border-radius:99px;padding:3px 8px;animation:o2pul 1.6s ease-in-out infinite}',
  '@keyframes o2pul{50%{box-shadow:0 0 0 5px rgba(255,90,0,.18)}}',
  '.o2-chips{display:flex;gap:4px;flex-wrap:wrap;max-width:360px}.o2-chips span{font-size:11.5px;font-weight:700;background:var(--s3);border-radius:6px;padding:2px 7px;white-space:nowrap}',
  '.o2-add{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.o2-add select{max-width:320px}.o2-add .num{width:100px}',
  '.o2-rod{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:var(--s1);border:1px solid var(--border);border-radius:var(--r);padding:14px 18px;margin-top:16px}',
  '.o2-rod label{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:800;color:var(--muted2)}.o2-rod input{width:auto}',
  '@media(max-width:700px){.o2-acs{width:100%}.o2-acs .btn{flex:1}}'
].join(''); document.head.appendChild(e); }

/* situação simplificada da ordem */
function sit2(c){
  var resp=c.fornecedores.filter(function(f){ return propDe(c,f); }).length, tot=c.fornecedores.length;
  if(c.status==='cancelada') return ['Cancelada','no'];
  if(c.status==='aprovada'||c.status==='convertida') return ['Pedido criado','dk'];
  if(c.status==='preparacao'||c.status==='aguardando_envio') return ['Em preparação','nu'];
  if(!resp) return ['Aguardando respostas','wt'];
  if(resp<tot) return ['Respondendo','lf'];
  return ['Pronta para criar pedido','ok'];
}
function novas(c){ return Math.max(0, c.propostas.length-(c.visto||0)); }

function renderLista2(el){
  css2(); document.body.classList.add('foco'); var s=st(); s.f2=s.f2||'andamento';
  var todas=cots(), q=norm(s.busca);
  var and=todas.filter(function(c){ return ['convertida','aprovada','cancelada'].indexOf(c.status)<0; });
  var aguard=and.filter(function(c){ return c.status!=='preparacao'&&c.status!=='aguardando_envio'; });
  var comNovas=and.filter(function(c){ return novas(c)>0; });
  var prontas=and.filter(function(c){ return c.propostas.length>0; });
  var ls=(s.f2==='andamento'?and:s.f2==='pedido'?todas.filter(function(c){ return c.status==='convertida'||c.status==='aprovada'; }):todas).filter(function(c){
    if(!q) return true; return norm(c.num+' '+c.itens.map(function(i){ return prodN(i.prod); }).join(' ')+' '+c.fornecedores.map(function(f){ var fo=LFI.forn(f); return fo?fo.nome:''; }).join(' ')).indexOf(q)>=0; }).sort(function(a,b){ return a.data<b.data?1:-1; });
  var h=UI.cabecalho({titulo:'Ordens', sub:'Cotações enviadas aos fornecedores · respostas e escolha do melhor preço', acoes:'<button class="btn pri" data-act="nova2">'+UI.ic('mais')+'Nova ordem</button>'});
  h+=fluxo(0);
  h+='<div class="kpis k3">'+UI.kpi({lb:'Aguardando respostas', vl:String(aguard.length), dl:'Cotações enviadas aos fornecedores'})+
    UI.kpi({lb:'<span style="color:var(--roxo)">●</span> Respostas novas', vl:String(comNovas.length), dl:'Ordens com resposta que você ainda não viu', hl:comNovas.length>0})+
    UI.kpi({lb:'Prontas para criar pedido', vl:String(prontas.length), dl:'Já têm propostas para comparar'})+'</div>';
  h+='<div class="card"><div class="barra"><div class="seg">'+[['andamento','Em andamento'],['pedido','Pedido criado'],['todas','Todas']].map(function(x){ return '<button class="'+(s.f2===x[0]?'on':'')+'" data-act="f2" data-id="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</div>'+
    '<div class="search">'+UI.ic('busca')+'<input placeholder="Buscar ordem, produto ou fornecedor" value="'+esc(s.busca||'')+'" data-chg="busca2"></div></div><div id="o2-t"></div></div>';
  el.innerHTML=h;
  UI.tabela(el.querySelector('#o2-t'),{linhas:ls, linhaAct:'abrir', vazio:'Nenhuma ordem por aqui. Clique em "Nova ordem" para começar.', classeLinha:function(c){ return novas(c)?'aviso':''; }, colunas:[
    {t:'Ordem', v:function(c){ return '<b>'+esc(c.num)+'</b><small>'+F.dataHora(c.data)+'</small>'; }, ord:function(c){ return c.data; }},
    {t:'Itens', v:function(c){ return '<div class="o2-chips">'+c.itens.slice(0,4).map(function(i){ return '<span>'+esc(curto(prodN(i.prod)))+' '+esc(qtdP(i.prod,i.qtd))+'</span>'; }).join('')+(c.itens.length>4?'<span>+'+(c.itens.length-4)+'</span>':'')+'</div>'; }, ord:false},
    {t:'Destino', v:function(c){ return UI.dep(c.dep); }, ord:function(c){ return c.dep; }},
    {t:'Respostas', v:function(c){ var r=c.fornecedores.filter(function(f){ return propDe(c,f); }).length, n=novas(c); return '<span class="o2-resp">'+r+'/'+c.fornecedores.length+' fornecedores</span>'+(n?' <span class="o2-novo">'+n+(n===1?' nova':' novas')+'</span>':''); }, ord:function(c){ return c.propostas.length; }},
    {t:'Situação', v:function(c){ var x=sit2(c); return UI.badge(x[0],x[1]); }, ord:function(c){ return sit2(c)[0]; }},
    {t:'', r:true, ord:false, v:function(c){ var x=sit2(c)[0]; return '<span class="btn '+(x==='Pedido criado'||x==='Cancelada'?'sec':'pri')+' xs">'+(x==='Em preparação'?'Enviar':x==='Pedido criado'?'Ver':x==='Cancelada'?'Ver':'Ver respostas')+'</span>'; }}
  ]});
  UI.liga(el, UI.navHandlers({ abrir:function(id){ LFI.ir('compras',id); }, f2:function(id){ s.f2=id; LFI.recarregar(); }, busca2:function(_,ev){ s.busca=ev.target.value; LFI.recarregar(); },
    nova2:function(){ s.n2=null; LFI.ir('compras','nova'); } }));
}
/* faixa do fluxo obrigatório */
function fluxo(at){
  var ps=[['Ordem','criar e enviar a cotação','compras'],['Respostas','comparar e escolher','compras'],['Pedido','pedido aprovado','ordens'],['Recebimento','conferir a entrega','notas']];
  return '<div class="o2-flux">'+ps.map(function(p,i){ return (i?'<div class="o2-fl'+(i<=at?' ok':'')+'"></div>':'')+'<div class="o2-fi'+(i<at?' ok':i===at?' on':'')+'"><span class="bo">'+(i<at?'✓':(i+1))+'</span><span>'+p[0]+'<small>'+p[1]+'</small></span></div>'; }).join('')+'</div>';
}

/* nova ordem: produtos + fornecedores numa tela só */
function n2(){ var s=st(); if(!s.n2){ var d=LFI.depIds(); s.n2={itens:[], forn:{}, extra:[], dep:d.indexOf('res')>=0?'res':d[0], prazo:U.D(1)+'T12:00'}; } return s.n2; }
function renderNova2(el){
  css2(); document.body.classList.add('foco'); var n=n2();
  var fs=[]; n.itens.forEach(function(i){ (n.forn[i.prod]||[]).forEach(function(f){ if(fs.indexOf(f)<0) fs.push(f); }); }); n.extra.forEach(function(f){ if(fs.indexOf(f)<0) fs.push(f); });
  var baixos=LFI.alertas().filter(function(a){ return a.tipo==='critico'||a.tipo==='baixo'; }).map(function(a){ return LFI.prod(a.prod); }).filter(function(p){ return p&&p.tipo==='insumo'&&!n.itens.some(function(i){ return i.prod===p.id; }); });
  var h='<div class="o2-top"><button class="o2-x" data-act="_ir" data-id="compras" aria-label="Fechar">✕</button><div class="o2-tit"><h1>Nova ordem</h1><small>Entrega → Produtos → Fornecedores → Enviar cotação</small></div></div>';
  h+='<div class="card mb o2-sec"><h3><span class="lft"><span class="o2-n">1</span>Entrega</span></h3><div class="o2-ent">'+LFI.depsVisiveis().map(function(d){ return '<button class="o2-dep'+(d.id===n.dep?' on':'')+'" data-act="dep2" data-id="'+d.id+'"><i style="background:'+d.cor+'"></i><b>'+esc(d.nome)+'</b><small>'+esc(LFI.emp(d.empresa).fantasia)+'</small></button>'; }).join('')+'</div></div>';
  h+='<div class="card mb o2-sec"><h3><span class="lft"><span class="o2-n">2</span>Produtos <span class="n">'+n.itens.length+'</span></span>'+(baixos.length?'<button class="btn gh sm" data-act="baixos2">'+UI.ic('raio')+'Adicionar os '+baixos.length+' itens abaixo do mínimo</button>':'')+'</h3>'+
    '<div class="o2-busca"><div class="o2-bx">'+UI.ic('busca')+'<input id="o2-b" placeholder="Digite o produto e tecle Enter (ex.: farinha)" autocomplete="off"><div class="o2-qbox" id="o2-qbox" hidden><span id="o2-qn"></span><input id="o2-q" inputmode="decimal" placeholder="Quantidade"><span id="o2-qu"></span><button class="btn pri sm" id="o2-qok">Adicionar</button></div></div><div class="o2-res" id="o2-res"></div></div>'+
    (n.itens.length?'<div class="o2-lis">'+n.itens.map(function(i){ var p=LFI.prod(i.prod); return '<span class="o2-it'+(i.qtd>0?'':' zero')+'">'+UI.fotoProd(p,22)+'<b>'+esc(p.nome)+'</b> '+(i.qtd>0?esc(F.qtd(i.qtd,p.un)):'sem quantidade')+'<button data-act="rem2" data-id="'+p.id+'" aria-label="Remover">✕</button></span>'; }).join('')+'</div>':'')+'</div>';
  if(n.itens.length){
    h+='<div class="card pad0 mb o2-sec"><h3 style="padding:16px 20px 12px;margin:0"><span class="lft"><span class="o2-n">3</span>Fornecedores</span><span style="display:flex;gap:8px;flex-wrap:wrap"><select class="inp sm" style="width:auto" data-chg="fcol2"><option value="">+ Incluir fornecedor</option>'+LFI.db.fornecedores.filter(function(f){ return fs.indexOf(f.id)<0; }).map(function(f){ return '<option value="'+f.id+'">'+esc(f.nome)+'</option>'; }).join('')+'</select><button class="btn sec sm" data-act="novoF">'+UI.ic('mais')+'Novo fornecedor</button></span></h3>'+
      '<div class="tb-wrap"><table class="tb"><thead><tr><th>Produto</th><th class="r">Quantidade</th><th class="r">Estoque · mín.</th>'+fs.map(function(f){ return '<th class="c">'+esc(LFI.forn(f).nome)+'</th>'; }).join('')+'<th></th></tr></thead><tbody>'+
      n.itens.map(function(i){ var p=LFI.prod(i.prod), lig=fornDoProd(i.prod).map(function(f){ return f.id; }), sel=n.forn[i.prod]||[];
        return '<tr><td><div class="cp-prod">'+UI.fotoProd(p,38)+'<div><b>'+esc(p.nome)+'</b><small>'+esc(LFI.cat(p.cat).nome)+'</small></div></div></td><td class="r"><input class="inp sm num'+(i.qtd>0?'':' o2-zero')+'" style="width:84px;display:inline-block" data-chg="qtd2" data-id="'+p.id+'" value="'+(i.qtd>0?UI.numBR(i.qtd):'')+'" placeholder="0"> <small style="display:inline">'+p.un+'</small></td><td class="r">'+F.qtd(LFI.estoqueGeral(p),p.un)+'<small>mín. '+F.qtd(p.estMin,p.un)+'</small></td>'+
          fs.map(function(f){ return '<td class="c"><label class="chk" style="justify-content:center"><input type="checkbox" data-chg="tg2" data-id="'+p.id+'|'+f+'"'+(sel.indexOf(f)>=0?' checked':'')+'></label><small>'+(p.forn===f?'principal':lig.indexOf(f)>=0?'alternativo':'')+'</small></td>'; }).join('')+
          '<td class="r"><button class="btn gh xs" data-act="rem2" data-id="'+p.id+'" title="Remover">'+UI.ic('lixo')+'</button></td></tr>'; }).join('')+'</tbody></table></div></div>';
  }
  var nf=fs.filter(function(f){ return n.itens.some(function(i){ return (n.forn[i.prod]||[]).indexOf(f)>=0; }); }).length;
  h+='<div class="o2-rod"><label><span class="o2-n">4</span>Fornecedores respondem até <input type="datetime-local" class="inp sm" data-chg="prazo2" value="'+esc(n.prazo)+'"></label><div class="o2-acs"><button class="btn sec" data-act="_ir" data-id="compras">Cancelar</button><button class="btn pri" data-act="env2"'+(n.itens.length&&nf?'':' disabled')+'>'+UI.ic('whats')+'Enviar cotação'+(nf?' para '+plural(nf,'fornecedor','fornecedores'):'')+'</button></div></div><div style="height:45vh" aria-hidden="true"></div>';
  el.innerHTML=h;
  function add(prod, qtd){ var ex=n.itens.filter(function(i){ return i.prod===prod; })[0]; if(ex) ex.qtd=r3(ex.qtd+qtd); else { n.itens.push({prod:prod, qtd:r3(qtd)}); n.forn[prod]=fornDoProd(prod).map(function(f){ return f.id; }); } }
  /* busca de produto: digita, lista os cadastrados, Enter escolhe e vai para a quantidade */
  var bi=el.querySelector('#o2-b'), res=el.querySelector('#o2-res'), qb=el.querySelector('#o2-qbox'), qi=el.querySelector('#o2-q'), achados=[], selI=0, escolhido=null;
  function lista(){ var t=norm(bi.value).trim(); if(!t){ res.innerHTML=''; achados=[]; return; }
    achados=UI.filtrarBusca(bi.value, LFI.db.produtos.filter(function(p){ return p.tipo==='insumo'; }), function(p){ return p.nome; }).slice(0,8);
    if(selI>=achados.length) selI=0;
    res.innerHTML=achados.length?achados.map(function(p,i){ var ja=n.itens.some(function(x){ return x.prod===p.id; }); return '<button class="o2-r'+(i===selI?' on':'')+'" data-i="'+i+'">'+UI.fotoProd(p,40)+'<b>'+esc(p.nome)+'</b><small>'+esc(LFI.cat(p.cat).nome)+' · estoque '+F.qtd(LFI.estoqueGeral(p),p.un)+' · mín. '+F.qtd(p.estMin,p.un)+(ja?' · já na lista':'')+'</small>'+UI.situacao(p)+'</button>'; }).join(''):'<div class="o2-nada">Nenhum produto com esse nome</div>'; }
  function escolhe(p){ escolhido=p; res.innerHTML=''; bi.value=p.nome; bi.readOnly=true; qb.hidden=false; el.querySelector('#o2-qn').textContent=''; el.querySelector('#o2-qu').textContent=p.un; qi.value=''; qi.placeholder='Quantidade em '+p.un; qi.focus(); }
  function confirma(){ if(!escolhido) return; var q=UI.num(qi.value); if(!(q>0)){ UI.toast('Informe a quantidade','','wt'); return; } add(escolhido.id,q); st().foco2=true; LFI.recarregar(); }
  function sobe(){ var y=bi.closest('.o2-sec').getBoundingClientRect().top+scrollY-(document.querySelector('.topbar').offsetHeight+12); if(Math.abs(scrollY-y)>8) scrollTo({top:y, behavior:'smooth'}); }
  bi.addEventListener('focus',sobe);
  bi.addEventListener('input',function(){ selI=0; lista(); });
  bi.addEventListener('keydown',function(e){ if(bi.readOnly) return; if(e.key==='ArrowDown'){ selI=Math.min(achados.length-1,selI+1); lista(); e.preventDefault(); } else if(e.key==='ArrowUp'){ selI=Math.max(0,selI-1); lista(); e.preventDefault(); } else if(e.key==='Enter'){ e.preventDefault(); if(achados[selI]) escolhe(achados[selI]); } });
  bi.addEventListener('click',function(){ if(bi.readOnly){ bi.readOnly=false; qb.hidden=true; escolhido=null; bi.select(); lista(); } });
  res.addEventListener('mousedown',function(e){ var b=e.target.closest('[data-i]'); if(b){ e.preventDefault(); escolhe(achados[+b.getAttribute('data-i')]); } });
  qi.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); confirma(); } if(e.key==='Escape'){ bi.readOnly=false; qb.hidden=true; escolhido=null; bi.value=''; bi.focus(); } });
  el.querySelector('#o2-qok').addEventListener('click',function(e){ e.preventDefault(); confirma(); });
  if(st().foco2){ st().foco2=false; setTimeout(function(){ bi.focus({preventScroll:true}); sobe(); },30); }
  UI.liga(el, UI.navHandlers({
    add2:function(){ var p=el.querySelector('#o2-p').value, q=UI.num(el.querySelector('#o2-q').value); if(!p){ UI.toast('Escolha o produto','','wt'); return; } if(!(q>0)){ UI.toast('Informe a quantidade','','wt'); return; } add(p,q); LFI.recarregar(); },
    baixos2:function(){ baixos.forEach(function(p){ add(p.id, 0); }); UI.toast(plural(baixos.length,'item adicionado','itens adicionados'),'Preencha a quantidade de cada um','in'); LFI.recarregar(); },
    qtd2:function(id,ev){ var q=r3(UI.num(ev.target.value)); n.itens.forEach(function(i){ if(i.prod===id) i.qtd=q>0?q:0; }); LFI.recarregar(); },
    rem2:function(id){ n.itens=n.itens.filter(function(i){ return i.prod!==id; }); delete n.forn[id]; LFI.recarregar(); },
    tg2:function(id,ev){ var x=id.split('|'), a=n.forn[x[0]]=n.forn[x[0]]||[], k=a.indexOf(x[1]); if(ev.target.checked&&k<0) a.push(x[1]); if(!ev.target.checked&&k>=0) a.splice(k,1); LFI.recarregar(); },
    novoF:function(){ novoFornecedor(function(f){ n.extra.push(f.id); n.itens.forEach(function(i){ var a=n.forn[i.prod]=n.forn[i.prod]||[]; if(a.indexOf(f.id)<0) a.push(f.id); }); LFI.recarregar(); }); },
    fcol2:function(_,ev){ var f=ev.target.value; if(!f) return; n.extra.push(f); n.itens.forEach(function(i){ var a=n.forn[i.prod]=n.forn[i.prod]||[]; if(a.indexOf(f)<0) a.push(f); }); LFI.recarregar(); },
    dep2:function(id){ n.dep=id; st().foco2=true; LFI.recarregar(); }, prazo2:function(_,ev){ n.prazo=ev.target.value||n.prazo; },
    env2:function(){
      var zq=n.itens.filter(function(i){ return !(i.qtd>0); }); if(zq.length){ UI.toast('Preencha a quantidade de: '+zq.map(function(i){ return prodN(i.prod); }).join(', '),'','wt'); return; }
      var sem=n.itens.filter(function(i){ return !(n.forn[i.prod]||[]).length; }); if(sem.length){ UI.toast('Marque ao menos um fornecedor para: '+sem.map(function(i){ return prodN(i.prod); }).join(', '),'','wt'); return; }
      var u=[]; n.itens.forEach(function(i){ n.forn[i.prod].forEach(function(f){ if(u.indexOf(f)<0) u.push(f); }); });
      var c=LFI.criarCotacao({itens:n.itens, dep:n.dep, origem:'manual', fornecedores:u, status:'aguardando_propostas'});
      c.prazoRetorno=n.prazo; c.itemForn=JSON.parse(JSON.stringify(n.forn)); var agora=LFI.agoraISO(); c.enviadaEm=agora; c.envios={}; u.forEach(function(f){ c.envios[f]=agora; }); c.visto=0;
      hist(c,'envio','Cotação enviada a '+plural(u.length,'fornecedor','fornecedores')+' pelo WhatsApp','');
      st().n2=null; LFI.salvar(); UI.toast('Cotação enviada pelo WhatsApp', c.num+' · '+plural(u.length,'fornecedor','fornecedores')); LFI.ir('compras');
    }
  }));
}


/* cadastro rápido de fornecedor sem sair da ordem */
function novoFornecedor(depois){
  var m=UI.modal({titulo:'Novo fornecedor', sub:'Cadastro rápido · os demais dados podem ser completados em Fornecedores', corpo:
    '<div class="fgrid"><div class="field full"><label>Nome do fornecedor *</label><input class="inp" id="nf-n" placeholder="Ex.: Empório Bom Preço"></div>'+
    '<div class="field"><label>WhatsApp *</label><input class="inp" id="nf-w" inputmode="tel" placeholder="(00) 00000-0000"></div><div class="field"><label>E-mail</label><input class="inp" id="nf-e" inputmode="email" placeholder="vendas@fornecedor.com.br"></div>'+
    '<div class="field"><label>Contato</label><input class="inp" id="nf-c" placeholder="Nome de quem atende"></div><div class="field"><label>CNPJ</label><input class="inp" id="nf-j" placeholder="00.000.000/0000-00"></div></div>',
    botoes:'<button class="btn sec" data-act="_fechar">Cancelar</button><button class="btn pri" data-act="ok">Cadastrar e incluir na ordem</button>',
    acoes:{ok:function(){ var v=function(i){ return m.el.querySelector(i).value.trim(); };
      if(!v('#nf-n')||v('#nf-w').replace(/\D/g,'').length<10){ UI.toast('Preencha o nome e um WhatsApp válido','','wt'); return; }
      var f={id:LFI.novoId('f'), nome:v('#nf-n'), razao:v('#nf-n'), cnpj:v('#nf-j'), cidade:'', uf:'SP', contato:v('#nf-c')||'Comercial', whats:v('#nf-w'), email:v('#nf-e'), prazo:2, cond:'28 dias', qualidade:3, pontualidade:90, cats:[], obs:'Cadastrado pela ordem de compra'};
      LFI.db.fornecedores.push(f); LFI.salvar(); m.fechar(); UI.toast('Fornecedor cadastrado', f.nome+' incluído na ordem'); depois(f); }}});
  setTimeout(function(){ var i=m.el.querySelector('#nf-n'); if(i) i.focus(); },80);
}
/* ordem aberta: respostas + mapa comparativo + criar pedido */
function renderDetalhe2(el, c){
  css2(); document.body.classList.add('foco');
  if(c.visto!==c.propostas.length){ c.visto=c.propostas.length; LFI.salvar(); }
  var A=analise(c), resp=c.fornecedores.filter(function(f){ return propDe(c,f); }).length, tot=c.fornecedores.length, x=sit2(c);
  var prep=c.status==='preparacao'||c.status==='aguardando_envio', feito=c.status==='convertida'||c.status==='aprovada', canc=c.status==='cancelada';
  var at=prep?0:feito?2:1;
  var ac='';
  if(prep) ac='<button class="btn no sm" data-act="cancelar">Cancelar ordem</button><button class="btn pri" data-act="envia2">'+UI.ic('whats')+'Enviar cotação</button>';
  else if(feito) ac='<button class="btn pri" data-act="verPed">'+UI.ic('ordem')+'Ver pedidos</button>';
  else if(!canc) ac='<button class="btn gh sm" data-act="simTodas">'+UI.ic('ia')+'Simular respostas</button><button class="btn sec" data-act="aguardar">Aguardar respostas</button>'+(propostasOk(c).length?'':'<button class="btn pri" disabled title="Aguarde ao menos uma resposta">'+UI.ic('check')+'Criar pedido</button>');
  var h='<div class="o2-top"><button class="o2-x" data-act="_ir" data-id="compras" aria-label="Fechar">✕</button><div class="o2-tit"><h1>Ordem '+esc(c.num)+' '+UI.badge(x[0],x[1])+'</h1><small>'+F.dataHora(c.data)+' · '+esc(c.resp)+' · entrega em '+esc(LFI.dep(c.dep)?LFI.dep(c.dep).nome:'')+' · respostas até '+F.dataHora(c.prazoRetorno)+'</small></div><div class="o2-acs">'+ac+'</div></div>';
  h+=fluxo(at);
  if(canc) h+=UI.nota('<b>Ordem cancelada.</b> '+esc(c.motivo||c.obs||''),'wt','x');
  if(prep){ h+=secItens(c, true); }
  else {
    var rAb=!!(st().respAb||{})[c.id];
    h+='<div class="card mb"><h3 class="o2-rh" data-act="respTg"><span class="lft">'+UI.ic('whats')+' Respostas dos fornecedores <span class="o2-dot'+(resp?' on':'')+'">'+resp+'/'+tot+'</span></span><span class="o2-seta">'+(rAb?'Recolher ▲':'Ver respostas ▼')+'</span></h3>'+(rAb?'<div class="tb-wrap"><table class="tb"><thead><tr><th>Fornecedor</th><th>Situação</th><th class="r">Itens atendidos</th><th class="r">Total da proposta</th><th></th></tr></thead><tbody>'+
      c.fornecedores.map(function(f){ var fo=LFI.forn(f), p=propDe(c,f), t=p?totalProposta(c,p):null;
        return '<tr><td><b>'+esc(fo.nome)+'</b><small>'+esc(fo.whats)+'</small></td><td>'+(p?(p.conferida===false?UI.badge('Aguardando conferência','wt'):UI.badge('Respondeu '+F.hora(p.recebida),'ok'))+' '+canalIc(p.canal):UI.badge('Aguardando','wt'))+'</td><td class="r">'+(t?t.n+' de '+itensForn(c,f).length:'—')+'</td><td class="r">'+(t?'<b>'+F.moeda(t.total)+'</b>':'—')+'</td>'+
          '<td class="r">'+(p?'<button class="btn sec xs" data-act="verOrig" data-id="'+f+'">Ver resposta</button>'+(p.conferida===false?' <button class="btn pri xs" data-act="conferir" data-id="'+f+'">Conferir</button>':''):(!feito&&!canc?'<button class="btn gh xs" data-act="sim" data-id="'+f+'|whatsapp">Simular resposta</button>':''))+'</td></tr>'; }).join('')+'</tbody></table></div>':'')+'</div>';
    if(c.propostas.length){ var sc=secComparador(c, A);
      if(!feito) sc=sc.replace('<span style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn pri sm" data-act="aplRec">','<span style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn pri" data-act="pedido2">'+UI.ic('check')+'Criar pedido</button><button class="btn sec sm" data-act="aplRec">');
      h+=sc; }
    else h+='<div class="card">'+UI.vazio('Assim que os fornecedores responderem, o mapa comparativo aparece aqui.','⏳')+'</div>';
  }
  el.innerHTML=h;
  if(c.propostas.length) graficosComparador(el,c,A);
  var H=handlersDetalhe(el,c,A);
  H.envia2=function(){ garantirItemForn(c); sincForn(c); if(!c.fornecedores.length){ UI.toast('Inclua ao menos um fornecedor','','wt'); return; } var agora=LFI.agoraISO(); c.status='aguardando_propostas'; c.enviadaEm=agora; c.envios=c.envios||{}; c.fornecedores.forEach(function(f){ c.envios[f]=agora; }); c.visto=c.propostas.length; hist(c,'envio','Cotação enviada a '+plural(c.fornecedores.length,'fornecedor','fornecedores')+' pelo WhatsApp',''); LFI.salvar(); UI.toast('Cotação enviada pelo WhatsApp', plural(c.fornecedores.length,'fornecedor','fornecedores')); LFI.ir('compras'); };
  H.respTg=function(){ var r=st().respAb=st().respAb||{}; r[c.id]=!r[c.id]; LFI.recarregar(); };
  H.aguardar=function(){ UI.toast('Ordem continua aguardando respostas', 'Você recebe um alerta na lista quando chegar resposta nova','in'); LFI.ir('compras'); };
  H.verPed=function(){ LFI.ir('ordens'); };
  H.pedido2=function(){ if(!c.escolhas||!Object.keys(c.escolhas).length) c.escolhas=mapaRec(analise(c)); pedidoModal(c, analise(c)); };
  H.aprovar=H.pedido2;
  /* respostas simuladas entram já lidas (sem etapa extra de conferência) */
  function simula(fs){ var canais=['whatsapp','pdf','excel']; fs.forEach(function(f,i){ var pr=gerarProposta(c,f,canais[(i+c.propostas.length)%3]); pr.recebida=LFI.agoraISO(); pr.conferida=true; c.propostas.push(pr); }); atualizaStatus(c); c.visto=c.propostas.length; LFI.atividade('cotacao',plural(fs.length,'resposta recebida','respostas recebidas')+' na ordem '+c.num,{tela:'compras',id:c.id}); LFI.salvar(); LFI.recarregar(); UI.toast(plural(fs.length,'resposta recebida','respostas recebidas'),'Preços lidos automaticamente','in'); }
  H.simTodas=function(){ var pend=c.fornecedores.filter(function(f){ return !propDe(c,f); }); if(!pend.length){ UI.toast('Todos os fornecedores já responderam'); return; } simula(pend); };
  H.sim=function(id){ simula([id.split('|')[0]]); };
  UI.liga(el, UI.navHandlers(H));
}
function pedidoModal(c, A){
  var K=cesta(A, c.escolhas||{}); if(!K.n){ UI.toast('Escolha os fornecedores no mapa comparativo','','wt'); return; }
  var corpo=UI.nota('Serão criados <b>'+plural(K.n,'pedido','pedidos')+'</b>, um por fornecedor. Os pedidos vão para o menu <b>Pedidos</b> e esta ordem é concluída.','in','ordem')+
    '<div class="tb-wrap"><table class="tb"><thead><tr><th>Fornecedor</th><th>Itens</th><th>Entrega</th><th class="r">Valor</th></tr></thead><tbody>'+K.ordem.map(function(f){ var g=K.porF[f]; return '<tr><td><b>'+esc(LFI.forn(f).nome)+'</b><small>'+esc(g.cond)+'</small></td><td>'+g.itens.map(function(i){ return esc(curto(prodN(i.prod)))+' <b>'+esc(qtdP(i.prod,i.qtd))+'</b> × '+F.moeda(i.preco); }).join('<br>')+'</td><td class="nw">'+F.dataC(U.D(g.prazo))+'</td><td class="r"><b>'+F.moeda(g.valor+g.frete)+'</b></td></tr>'; }).join('')+'</tbody><tfoot><tr><td colspan="3">Total</td><td class="r">'+F.moeda(K.total)+'</td></tr></tfoot></table></div>'+
    (K.sem?UI.nota('<b>'+plural(K.sem,'item fica','itens ficam')+' sem fornecedor</b> e não entra nos pedidos.','wt','alerta'):'');
  var m=UI.modal({titulo:'Criar pedido', sub:esc(c.num)+' · '+plural(K.n,'fornecedor','fornecedores'), tam:'lg', corpo:corpo,
    botoes:'<button class="btn sec" data-act="_fechar">Voltar</button><button class="btn pri" data-act="ok">'+UI.ic('check')+'Criar '+plural(K.n,'pedido','pedidos')+'</button>', acoes:{ok:function(){
      var grupo='GC-'+String(parseInt(c.num.split('-').pop(),10)||0).padStart(4,'0');
      var ocs=K.ordem.map(function(f){ var g=K.porF[f]; var oc=LFI.criarOrdem({forn:f, dep:c.dep, empresa:c.empresa, itens:g.itens, cond:g.cond, previsao:U.D(g.prazo), cot:c.id, grupo:grupo, status:'aguardando_entrega', obs:'Criado a partir da ordem '+c.num}); oc.hist=[{d:LFI.agoraISO(), s:'aprovada', u:LFI.usuario().nome},{d:LFI.agoraISO(), s:'aguardando_entrega', u:'Sistema'}]; return oc; });
      c.status='convertida'; c.ordens=ocs.map(function(o){ return o.id; }); c.grupo=grupo; c.convertidaEm=LFI.agoraISO(); hist(c,'convertida','Pedido criado',ocs.map(function(o){ return o.num; }).join(', '));
      LFI.atividade('oc',plural(ocs.length,'pedido criado','pedidos criados')+' a partir da '+c.num,{tela:'ordens'});
      LFI.salvar(); m.fechar(); UI.toast(plural(ocs.length,'pedido criado','pedidos criados'), 'Acompanhe em Pedidos'); LFI.ir('ordens'); }}});
}

LFI.registrar('compras',{titulo:'Ordens', render:render});
})();
