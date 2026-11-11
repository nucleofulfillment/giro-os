import openpyxl, json, re, collections, unicodedata
f='/root/.claude/uploads/7f4a9325-6007-55c6-8154-2513d81da13e/e74d81d9-CUSTOS_2026.11.xlsx'
wv=openpyxl.load_workbook(f,data_only=True)
def k(s): return re.sub(r'\s+',' ',unicodedata.normalize('NFD',str(s)).encode('ascii','ignore').decode().lower()).strip()
tab={}
for ws in wv.worksheets:
  t=ws.title.strip()
  if t in ('INGREDIENTES','Planilha1','BALCÃO','PRODUTOS','PESQ. PREÇOS','INATIVOS','MASSAS E RECHEIOS'): continue
  heads=[]
  for row in ws.iter_rows():
    for c in row:
      if isinstance(c.value,str) and c.value.strip().upper()=='VENDA (R$)': heads.append(c)
  rows=[]
  for h in heads:
    hdr={str(x.value).strip().upper():x.column for x in ws[h.row] if isinstance(x.value,str)}
    nc=hdr.get('INGREDIENTES'); cc=hdr.get('CUSTO') or hdr.get('CUSTO (R$)'); cod=hdr.get('CÓDIGO') or hdr.get('CÓD')
    for r in range(h.row+1, ws.max_row+1):
      nm=ws.cell(r,nc).value; v=ws.cell(r,h.column).value
      if isinstance(nm,str) and nm.strip().upper()=='INGREDIENTES': break
      if nm and isinstance(v,(int,float)):
        rows.append({'nome':str(nm).strip(),'venda':v,'custo':ws.cell(r,cc).value if cc else None,'cod':ws.cell(r,cod).value if cod else None,'peso':ws.cell(r,nc+1).value})
  tab[t]=rows
  print(t,len(rows),rows[:2])
json.dump(tab,open('vendas.json','w'),ensure_ascii=False,indent=0)
