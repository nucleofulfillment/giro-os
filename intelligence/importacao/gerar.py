import openpyxl, json, re, unicodedata, collections
f='/root/.claude/uploads/7f4a9325-6007-55c6-8154-2513d81da13e/e74d81d9-CUSTOS_2026.11.xlsx'
wv=openpyxl.load_workbook(f,data_only=True)
def k(s): return re.sub(r'\s+',' ',unicodedata.normalize('NFD',str(s)).encode('ascii','ignore').decode().lower()).strip()
def bonito(s):
  s=re.sub(r'\s+',' ',str(s)).strip()
  le=[c for c in s if c.isalpha()]
  if le and sum(1 for c in le if c.isupper())/len(le)>0.6 and len(s)>3:
    s=s[0].upper()+s[1:].lower()
  return s
B=json.load(open('blocos.json')); V=json.load(open('vendas.json'))
# ---------- ingredientes
ws=wv['INGREDIENTES ']; ING={}; ordem=[]; derivado=False
UN_RE=r'^(ovo|ovos|embalagem|etiqueta|bandeja|canudinho|colher|copo|filtro|forminha|fundo rendado|garfo|mexedor|papel manteiga|pote|maionese sachet|ketchup sachet|a[cç][uú]car sach|a[cç]ucar mascavo sach|ferreiro|charge|kit kat|pão de queijo|pao de queijo|bolacha negresco recheada|filme)'
L_RE=r'^(leite$|leite zero|agua|água|óleo|oleo|cacha|cerveja|suco|vinagre|essencia|essência|litro de caf|calda molhar)'
def cat(n):
  l=k(n)
  if re.match(r'^(tempo|m\.o)',l): return 'tem'
  if re.match(r'^(embalagem|etiqueta|bandeja|canud|colher|copo|filtro|forminha|fundo|garfo|mexedor|papel|pote|filme|sacola)',l): return 'emb'
  if re.search(r'farinha|polvilho|fermento|mistura|emustab|anti mofo|melhorador|panetone mix',l): return 'far'
  if re.search(r'leite|queij|nata|manteiga|creme de leite|requeij|chantily|iogurte|margarina',l): return 'lat'
  if re.search(r'peixe|camar',l): return 'pes'
  if re.search(r'alcatra|picanha|carne|frango|bacon|calabresa|linguica|presunto|apresuntado|salame|salsicha|mortadela|chester|hamburguer|mignon|file|coxa|coxao|coracao|costela',l): return 'car'
  if re.search(r'abacaxi|alface|aipim|banana|batata|cebol|cenoura|laranja|lim[aã]o|ma[cç][aã]|mam[aã]o|manga|mel[aã]o|morango|pepino|tomate|uva|frutas|cereja|ameixa|coco|ervilha|milho|palmito|cogumelo|oregano|cheiro|alho',l): return 'hor'
  if re.search(r'oleo|azeite|banha|gordura',l): return 'ole'
  if re.search(r'refri|suco|cerveja|cacha|agua|cafe|capuccino|achocolatado',l): return 'beb'
  return 'mer'
for r in range(2,ws.max_row+1):
  n=ws.cell(r,1).value
  if not n: continue
  n=str(n).strip()
  if n.upper().startswith('CUSTOS DE'): derivado=True; continue
  q,p=ws.cell(r,2).value, ws.cell(r,3).value
  kk=k(n)
  if kk in ING: continue
  l=kk
  un='min' if re.match(r'^(tempo|m\.o)',l) else 'un' if re.match(UN_RE,l) else 'L' if re.match(L_RE,l) else 'kg'
  qb=(q or 1) if un in('un','min') else (q or 1000)/1000
  ING[kk]={'nome':bonito(n),'un':un,'pac':round(qb,4),'preco':round(p or 0,4),'cat':cat(n),'derivado':derivado}
  ordem.append(kk)
# ---------- blocos -> receitas
VENDAS={}
for aba,rows in V.items():
  for x in rows: VENDAS.setdefault((aba.strip(),k(x['nome'])),x)
GRUPO={'PÃES':'Pães','PADARIA':'Padaria','BOLOS E TORTAS':'Bolos e tortas','CUCAS E BOLO SECO':'Cucas e bolos secos','LANCHES E PORÇÕES':'Lanches e porções','PASTEL':'Pastel','BEBIDAS':'Bebidas','MASSAS E RECHEIOS':'Bases','PROMOÇÃO':'Lanches e porções','INATIVOS':'Inativos','MIRO':'Mercado Miro'}
DEP={'Pães':'pad','Padaria':'pad','Bolos e tortas':'pad','Cucas e bolos secos':'pad','Pastel':'pad','Bases':'pad','Lanches e porções':'res','Bebidas':'res','Inativos':'pad','Mercado Miro':'pad'}
rec={}  # k -> dict
ordemR=[]
def addbloco(b, ativo=True):
  if not b['nome'] or k(b['nome']) in ('ingredientes','ingrediente','?','none'): return None
  kk=k(b['nome'])
  if kk in rec: return None
  g=GRUPO[b['aba']]
  rd=b['rend']; rendv=None; un='un'
  if rd and isinstance(rd[1],(int,float)) and rd[1]>0:
    rendv=rd[1]; un='L' if k(rd[0]).startswith('lt') else 'kg'
  itens=[[it[0].strip(),it[1]] for it in b['itens'] if it[0] and isinstance(it[1],(int,float)) and it[1]>0]
  v=VENDAS.get((b['aba'],kk))
  if (rendv or 1)<=1.0001 and not (v and v.get('peso')==1000) and un!='L': un='un'; rendv=None
  cod=None
  if v and v.get('cod') not in (None,'x','X',''):
    try: cod=str(int(float(v['cod'])))
    except: cod=None
  cx=None
  if b['fim']:
    cx=b['fim'][1] if rendv else b['fim'][2]
  rec[kk]={'nome':bonito(b['nome']),'grupo':g,'dep':DEP[g],'un':un,'rend':round(rendv or 1,4),'itens':itens,'preco':round(v['venda'],2) if v else None,'cod':cod,'custoX':round(cx,4) if isinstance(cx,(int,float)) else None,'ativo':ativo,'base':g=='Bases'}
  ordemR.append(kk); return kk
for b in B:
  if b['aba']=='MASSAS E RECHEIOS': addbloco(b)
for aba in ['PÃES','PADARIA','BOLOS E TORTAS','CUCAS E BOLO SECO','PASTEL','LANCHES E PORÇÕES','BEBIDAS']:
  for b in B:
    if b['aba']==aba: addbloco(b)
# promoção: produtos que não existem viram produto; preços promocionais
promoV={}
ws=wv['PROMOÇÃO']
hdr=None
for r in range(1,ws.max_row+1):
  row=[ws.cell(r,c).value for c in range(1,ws.max_column+1)]
  if 'VENDA (R$)' in [str(x).strip() if x else '' for x in row]:
    hdr={str(x).strip():i for i,x in enumerate(row) if x}; continue
  if hdr and row[hdr['INGREDIENTES']] and isinstance(row[hdr['VENDA (R$)']],(int,float)):
    promoV[k(row[hdr['INGREDIENTES']])]=(row[hdr.get('PREÇO NORMAL')],row[hdr['VENDA (R$)']])
nPromoNovo=0
for b in B:
  if b['aba']=='PROMOÇÃO' and b['nome']:
    kk=k(b['nome'])
    if kk not in rec:
      x=addbloco(b)
      if x and kk in promoV: rec[kk]['preco']=round(promoV[kk][0] or promoV[kk][1],2); nPromoNovo+=1
for kk,(normal,promo) in promoV.items():
  if kk in rec: rec[kk]['promo']=round(promo,2)
for b in B:
  if b['aba']=='INATIVOS': addbloco(b, ativo=False)
# miro: tabela de preço
miro=[[bonito(x['nome']),round(x['venda'],2),round(x['custo'] or 0,2),('promo' if x.get('peso')=='PROMOÇÃO' else '')] for x in V['MIRO']]
# revenda bebidas
rev=[]; ws=wv['BEBIDAS']; sec=None
for r in range(1,ws.max_row+1):
  n=ws.cell(r,9).value; c=ws.cell(r,10).value; vd=ws.cell(r,13).value
  if n is None: continue
  if isinstance(c,str) and c.strip().upper()=='CUSTO': sec=str(n).strip(); continue
  if sec and isinstance(vd,(int,float)) and k(n) not in rec:
    nm=bonito(n); sl=sec.lower()
    if sl.startswith('refri'): nm=nm+' '+sl.replace('refri','').replace('02 litros','2 litros').strip()
    elif sl.startswith('cerveja'): nm='Cerveja '+nm+' '+sl.replace('cerveja','').strip()
    rev.append([re.sub(r'\s+',' ',nm).strip(),round(c or 0,2) if isinstance(c,(int,float)) else 0,round(vd,2)])
# ---------- resolve itens
semPreco=set(); res_tipo=collections.Counter()
for kk in ordemR:
  r=rec[kk]; out=[]
  for nome,q in r['itens']:
    nk=k(nome)
    if re.match(r'^(rendimento|kg$|lt$|custo|despesas)',nk): continue
    if nk in rec and nk!=kk and rec[nk]['ativo'] and not (nk in ING and not ING[nk]['derivado'] and not rec[nk]['base']) and (rec[nk]['base'] or rec[nk]['grupo'] in ('Pães','Padaria','Bolos e tortas','Cucas e bolos secos','Pastel','Lanches e porções','Bebidas')):
      out.append(['R:'+nk,q]); res_tipo['receita']+=1
    elif nk in ING:
      out.append(['I:'+nk,q]); res_tipo['ing']+=1
    else:
      ING[nk]={'nome':bonito(nome),'un':'kg','pac':1,'preco':0,'cat':cat(nome),'derivado':False,'semPreco':True}; ordem.append(nk); semPreco.add(nome)
      out.append(['I:'+nk,q]); res_tipo['novo']+=1
  r['itens']=out
# ingredientes derivados que viraram receita: remover
usadosI={i[0][2:] for r in rec.values() for i in r['itens'] if i[0].startswith('I:')}
final=[kk for kk in ordem if not (ING[kk]['derivado'] and kk in rec)]
print('ingredientes',len(final),'(derivados removidos',len(ordem)-len(final),') não usados',len([x for x in final if x not in usadosI]))
print('receitas',len(rec),collections.Counter(r['grupo'] for r in rec.values()))
print('sem preço de venda',[r['nome'] for r in rec.values() if r['preco'] is None and not r['base'] and r['ativo']][:20])
print('promo novo',nPromoNovo,'promos',sum(1 for r in rec.values() if r.get('promo')))
print('revenda',len(rev),'miro',len(miro),'itens',res_tipo,'sem preço ing',semPreco)
# ---------- emitir JS
ik={kk:i for i,kk in enumerate(final)}
rk={kk:i for i,kk in enumerate(ordemR)}
def ref(x):
  t,kk=x.split(':',1)
  return ('i',ik[kk]) if t=='I' else ('r',rk[kk])
out={'ing':[[ING[kk]['nome'],ING[kk]['un'],ING[kk]['pac'],ING[kk]['preco'],ING[kk]['cat'],1 if ING[kk].get('semPreco') else 0] for kk in final],
     'rec':[[rec[kk]['nome'],rec[kk]['grupo'],rec[kk]['un'],rec[kk]['rend'],rec[kk]['preco'],rec[kk]['cod'],[[ref(i[0])[0]+str(ref(i[0])[1]),i[1]] for i in rec[kk]['itens']],rec[kk]['custoX'],1 if rec[kk]['ativo'] else 0,rec[kk].get('promo')] for kk in ordemR],
     'rev':rev,'miro':miro,'despesas':33}
js='/* LivePro — catálogo real do cliente (gerado a partir da planilha CUSTOS_2026.11.xlsx).\n   ing: [nome, unidade, tamanho do pacote (na unidade), preço do pacote, categoria, sem preço]\n   rec: [nome, grupo, unidade, rendimento, preço de venda, código, itens [[ref, qtd em g/ml/un/min]], custo no Excel, ativo, preço promocional]\n        ref "i12" = ingrediente 12, "r5" = outra receita (base ou produto) 5\n   rev: bebidas de revenda [nome, custo, venda] · miro: tabela do Mercado Miro [nome, venda, custo, promo] */\nwindow.LFI=window.LFI||{};\nLFI.CATALOGO='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n'
open('/home/user/giro-os/intelligence/catalogo-dados.js','w').write(js); print(len(js))

# ---------- verificação: custo calculado x Excel
import math
memo={}
def custo(kk, pilha=()):
  if kk in memo: return memo[kk]
  r=rec[kk]; t=0
  for ref,q in r['itens']:
    tp,nk=ref.split(':',1)
    if tp=='I':
      g=ING[nk]; cu=(g['preco']/g['pac']) if g['pac'] else 0
      t+= (q/1000 if g['un'] in ('kg','L') else q)*cu
    else:
      if nk in pilha: continue
      rr=rec[nk]; cu=custo(nk,pilha+(kk,))
      t+= (q/1000 if rr['un'] in ('kg','L') else q)*cu
  memo[kk]=t/(r['rend'] or 1); return memo[kk]
dif=[]; ok=0; n=0
for kk in ordemR:
  r=rec[kk]
  if not r['ativo'] or r['custoX'] is None: continue
  c=custo(kk); n+=1
  if r['custoX'] and abs(c-r['custoX'])/r['custoX']<0.02: ok+=1
  else: dif.append((r['nome'],round(c,2),round(r['custoX'],2)))
print('verificados',n,'iguais (2%)',ok)
for d in dif[:40]: print('  ',d)
