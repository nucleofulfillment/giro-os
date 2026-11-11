import openpyxl, json, re, collections, sys
f='/root/.claude/uploads/7f4a9325-6007-55c6-8154-2513d81da13e/e74d81d9-CUSTOS_2026.11.xlsx'
wf=openpyxl.load_workbook(f); wv=openpyxl.load_workbook(f,data_only=True)
labels=collections.Counter(); totlab=collections.Counter()
SKIP=('INGREDIENTES ','Planilha1','BALCÃO','PRODUTOS','PESQ. PREÇOS')
blocos=[]
for ws in wf.worksheets:
  if ws.title in SKIP: continue
  wsv=wv[ws.title]
  for row in ws.iter_rows():
    for c in row:
      v=c.value
      if isinstance(v,str) and v.strip().lower()=='usado':
        col=c.column-1
        hdr=ws.cell(c.row-1,col).value
        h2=ws.cell(c.row,col).value
        if h2 and str(h2).strip().lower()!='ingrediente': hdr=h2
        its=[];rend=None;r=c.row+1;fim=None
        while r<=ws.max_row:
          n=ws.cell(r,col).value
          if n is None:
            vaz=0
            while r<=ws.max_row and ws.cell(r,col).value is None and vaz<4: r+=1; vaz+=1
            if ws.cell(r,col).value is None: break
            continue
          nx=ws.cell(r+1,col+1).value
          if isinstance(nx,str) and nx.strip().lower()=='usado': break
          ns=str(n).strip(); q=wsv.cell(r,col+1).value; cu=wsv.cell(r,col+2).value
          if ns.lower().startswith('custo total'):
            fim=(ns, wsv.cell(r,col+1).value, cu); totlab[ns.lower()]+=1
            d=ws.cell(r+1,col).value; dv=wsv.cell(r+1,col+1).value
            break
          if re.match(r'(rendimento|kg$|lt$|unid|und|porç)',ns.lower()) and not isinstance(cu,(int,float)) or (re.match(r'(rendimento|kg$|lt$)',ns.lower())):
            rend=(ns,q); labels[ns.lower()]+=1
          else: its.append([ns,q,cu])
          r+=1
        blocos.append({'aba':ws.title.strip(),'nome':str(hdr).strip() if hdr else None,'itens':its,'rend':rend,'fim':fim,'pos':c.coordinate})
print(len(blocos)); print(labels.most_common(20)); print(totlab.most_common(20))
print([b for b in blocos if not b['nome']][:3])
json.dump(blocos,open('blocos.json','w'),ensure_ascii=False,indent=0)
