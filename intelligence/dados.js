/* LiveFood Intelligence — BASE FICTÍCIA DE DEMONSTRAÇÃO
   Tudo aqui é inventado, mas coerente: os mesmos produtos, fornecedores, notas, receitas e vendas
   são usados por todas as telas. As datas são relativas ao dia em que a base é criada,
   para os filtros "Hoje" e "Últimos 7 dias" sempre terem movimento. */
(function(){
'use strict';
var LFI = window.LFI = window.LFI || {};

/* ---------- utilidades de data e sorteio (determinístico) ---------- */
function rng(seed){ return function(){ seed|=0; seed=seed+0x6D2B79F5|0; var t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function iso(d){ var m=d.getMonth()+1, dd=d.getDate(); return d.getFullYear()+'-'+(m<10?'0':'')+m+'-'+(dd<10?'0':'')+dd; }
function hojeD(){ var d=new Date(); d.setHours(12,0,0,0); return d; }
function D(n){ var d=hojeD(); d.setDate(d.getDate()+n); return iso(d); }
function DH(n,h){ return D(n)+'T'+h; }
function r2(x){ return Math.round(x*100)/100; }
function r3(x){ return Math.round(x*1000)/1000; }

LFI.dataUtil = {iso:iso, hojeD:hojeD, D:D, DH:DH, r2:r2, r3:r3, rng:rng};

LFI.criarBase = function(){
  var R = rng(20261110);
  var db = {versao:5, criadaEm:new Date().toISOString(), hoje:D(0)};

  /* ===== EMPRESAS (multi-CNPJ) ===== */
  db.grupo = {nome:'Grupo Pão Dourado', cidade:'Campinas/SP'};
  db.empresas = [
    {id:'e1', sigla:'PD', fantasia:'Pão Dourado Padaria', razao:'Pão Dourado Panificadora Ltda', cnpj:'12.345.678/0001-90', ie:'244.118.902.115', regime:'Simples Nacional', uf:'SP', cidade:'Campinas', endereco:'Av. Orosimbo Maia, 1.420 — Cambuí', tipo:'Matriz', impVenda:8.0, pisCofins:'nao_se_aplica', cor:'#E08A1E'},
    {id:'e2', sigla:'DR', fantasia:'Dourado Restaurante', razao:'Pão Dourado Panificadora Ltda', cnpj:'12.345.678/0002-71', ie:'244.118.903.110', regime:'Simples Nacional', uf:'SP', cidade:'Campinas', endereco:'Av. Orosimbo Maia, 1.420 — Loja 2', tipo:'Filial', impVenda:8.0, pisCofins:'nao_se_aplica', cor:'#1D4ED8'},
    {id:'e3', sigla:'KS', fantasia:'Kaizen Sushi', razao:'Kaizen Sushi Bar Ltda', cnpj:'45.987.321/0001-08', ie:'244.556.781.119', regime:'Lucro Presumido', uf:'SP', cidade:'Campinas', endereco:'Rua Coronel Quirino, 980 — Cambuí', tipo:'Matriz', impVenda:11.33, pisCofins:'cumulativo', cor:'#C2185B'}
  ];

  /* ===== DEPARTAMENTOS / OPERAÇÕES ===== */
  db.departamentos = [
    {id:'cen', nome:'Estoque central', curto:'Central', empresa:'e1', cor:'#5E5E66'},
    {id:'pad', nome:'Padaria', curto:'Padaria', empresa:'e1', cor:'#E08A1E'},
    {id:'res', nome:'Restaurante', curto:'Restaurante', empresa:'e2', cor:'#1D4ED8'},
    {id:'sus', nome:'Sushi', curto:'Sushi', empresa:'e3', cor:'#C2185B'}
  ];

  /* ===== CATEGORIAS ===== */
  db.categorias = [
    {id:'far', nome:'Farinhas e grãos'}, {id:'lat', nome:'Laticínios e frios'}, {id:'pes', nome:'Pescados'},
    {id:'car', nome:'Carnes e aves'}, {id:'hor', nome:'Hortifrúti'}, {id:'mer', nome:'Mercearia'},
    {id:'ole', nome:'Óleos e gorduras'}, {id:'ori', nome:'Insumos orientais'}, {id:'beb', nome:'Bebidas'},
    {id:'emb', nome:'Embalagens e descartáveis'}, {id:'aca', nome:'Produtos acabados'}, {id:'sob', nome:'Sobras reaproveitáveis'}
  ];

  /* ===== FORNECEDORES ===== */
  db.fornecedores = [
    {id:'f1', nome:'Distribuidora Central', razao:'Distribuidora Central de Alimentos Ltda', cnpj:'08.412.335/0001-27', cidade:'Campinas', uf:'SP', contato:'Marcos Lima', whats:'(19) 99812-4401', email:'vendas@distcentral.com.br', prazo:2, cond:'28 dias', qualidade:4, pontualidade:94, cats:['mer','far','ole','ori','pes','lat'], obs:'Atende todas as operações. Pedido mínimo R$ 800.'},
    {id:'f2', nome:'Moinho Paulista', razao:'Moinho Paulista Farinhas S.A.', cnpj:'61.204.118/0003-45', cidade:'Jundiaí', uf:'SP', contato:'Juliana Prado', whats:'(11) 98877-2210', email:'comercial@moinhopaulista.com.br', prazo:3, cond:'21/28 dias', qualidade:5, pontualidade:98, cats:['far','mer'], obs:'Farinha especial tipo 1 com laudo de qualidade por lote.'},
    {id:'f3', nome:'Laticínios Serra Verde', razao:'Laticínios Serra Verde Ltda', cnpj:'17.330.912/0001-60', cidade:'Poços de Caldas', uf:'MG', contato:'Rogério Alves', whats:'(35) 99901-3344', email:'pedidos@serraverde.com.br', prazo:2, cond:'14 dias', qualidade:4, pontualidade:91, cats:['lat'], obs:'Entrega refrigerada às terças e sextas.'},
    {id:'f4', nome:'Mar Azul Pescados', razao:'Mar Azul Pescados e Frutos do Mar Ltda', cnpj:'29.871.004/0001-12', cidade:'Santos', uf:'SP', contato:'Paula Nogueira', whats:'(13) 99744-5120', email:'paula@marazulpescados.com.br', prazo:1, cond:'7 dias', qualidade:5, pontualidade:96, cats:['pes'], obs:'Salmão chileno fresco, entrega diária até 10h.'},
    {id:'f5', nome:'Oriental Foods', razao:'Oriental Foods Importadora Ltda', cnpj:'33.402.786/0001-91', cidade:'São Paulo', uf:'SP', contato:'Akira Sato', whats:'(11) 99610-7788', email:'akira@orientalfoods.com.br', prazo:2, cond:'28 dias', qualidade:4, pontualidade:89, cats:['ori','pes','lat'], obs:'Importador de insumos japoneses. Frete grátis acima de R$ 1.500.'},
    {id:'f6', nome:'Frigorífico Boi Nobre', razao:'Frigorífico Boi Nobre Ltda', cnpj:'05.776.430/0001-03', cidade:'Amparo', uf:'SP', contato:'Sérgio Mendes', whats:'(19) 99555-0921', email:'vendas@boinobre.com.br', prazo:1, cond:'14 dias', qualidade:4, pontualidade:93, cats:['car'], obs:'Cortes porcionados a vácuo sob encomenda.'},
    {id:'f7', nome:'Verde Campo Hortifrúti', razao:'Verde Campo Hortifrúti Ltda (Ceasa Campinas)', cnpj:'41.118.209/0001-55', cidade:'Campinas', uf:'SP', contato:'Aparecida Souza', whats:'(19) 99230-1180', email:'cida@verdecampo.com.br', prazo:1, cond:'Semanal (toda segunda)', qualidade:3, pontualidade:88, cats:['hor'], obs:'Entrega diária até 7h. Qualidade varia com a safra.'},
    {id:'f8', nome:'EmbalaFácil', razao:'EmbalaFácil Embalagens Ltda', cnpj:'22.019.554/0001-38', cidade:'Sumaré', uf:'SP', contato:'Patrícia Rocha', whats:'(19) 99102-6655', email:'patricia@embalafacil.com.br', prazo:4, cond:'30 dias', qualidade:4, pontualidade:95, cats:['emb'], obs:'Embalagens personalizadas com 15 dias de antecedência.'},
    {id:'f9', nome:'Rio Pardo Bebidas', razao:'Rio Pardo Distribuidora de Bebidas Ltda', cnpj:'14.665.873/0001-70', cidade:'Mogi Mirim', uf:'SP', contato:'Fábio Teixeira', whats:'(19) 99441-8090', email:'fabio@riopardobebidas.com.br', prazo:2, cond:'21 dias', qualidade:4, pontualidade:97, cats:['beb'], obs:'Bebidas com substituição tributária.'}
  ];

  /* ===== PRODUTOS =====
     [id, nome, categoria, unidade base, custo médio, estoque mínimo, NCM, CEST, fornecedor principal, alternativos,
      local, validade (dias a partir de hoje; null = não se aplica), conversão de compra [unidade, fator],
      estoque por departamento {cen,pad,res,sus}, apelidos que aparecem nas notas, dias sem movimento] */
  var L = {cf:'Câmara fria 01 (0 a 4 °C)', fz:'Freezer 02 (−18 °C)', ds:'Despensa seca A', db:'Despensa seca B', gs:'Geladeira do sushi bar', br:'Bar e adega', al:'Almoxarifado de embalagens', vt:'Vitrine da padaria', cr:'Câmara de resfriados 02'};
  var P = [
    ['p01','Farinha de trigo especial','far','kg',5.20,150,'1101.00.10','', 'f2',['f1'],L.ds,120,['Saco 25 kg',25],{cen:175,pad:30},['FARINHA TRIGO ESPECIAL 25KG','FARINHA DE TRIGO TIPO 1','FAR TRIGO ESP'],1],
    ['p02','Açúcar cristal','mer','kg',5.40,40,'1701.14.00','', 'f1',['f2'],L.ds,300,['Fardo 5 kg',5],{cen:35,pad:8,res:3,sus:4},['ACUCAR CRISTAL 5KG','ACUCAR CRIST'],2],
    ['p03','Sal refinado','mer','kg',2.10,15,'2501.00.20','', 'f1',[],L.ds,null,['Fardo 10 kg',10],{cen:22,pad:4,res:3,sus:2},['SAL REFINADO IODADO 1KG'],4],
    ['p04','Fermento biológico seco','far','kg',38.00,3,'2102.10.00','', 'f2',['f1'],L.ds,180,['Pacote 500 g',0.5],{cen:4.5,pad:1.2},['FERMENTO BIOL SECO 500G'],1],
    ['p05','Melhorador de farinha','far','kg',32.00,2,'2106.90.90','', 'f2',[],L.ds,150,['Pacote 1 kg',1],{cen:3,pad:0.8},['MELHORADOR PAES 1KG'],3],
    ['p06','Gordura vegetal','ole','kg',14.50,10,'1517.90.10','', 'f1',[],L.ds,200,['Balde 15 kg',15],{cen:18,pad:4},['GORDURA VEG HIDROG 15KG'],5],
    ['p07','Manteiga sem sal','lat','kg',52.00,10,'0405.10.00','', 'f3',['f1'],L.cf,40,['Bloco 5 kg',5],{cen:4,pad:1.5,sus:0.6},['MANTEIGA S/SAL 5KG','MANTEIGA EXTRA'],2],
    ['p08','Leite integral UHT','lat','L',5.60,48,'0401.10.10','', 'f3',['f1'],L.ds,4,['Caixa 12 L',12],{cen:36,pad:12,res:8},['LEITE UHT INTEGRAL 1L CX12'],1],
    ['p09','Creme de leite','lat','kg',22.00,12,'0401.40.21','', 'f3',['f1'],L.cf,35,['Caixa 1,02 kg (17 x 200 g)',1.02],{cen:14,res:4},['CREME DE LEITE 200G'],2],
    ['p10','Ovos brancos','lat','un',0.75,360,'0407.21.00','', 'f7',['f1'],L.cr,18,['Caixa 30 dúzias',360],{cen:420,pad:90,res:60,sus:30},['OVOS BRANCOS GRANDES CX 30DZ'],1],
    ['p11','Queijo muçarela','lat','kg',39.90,15,'0406.10.10','', 'f3',['f1'],L.cf,22,['Peça 4 kg',4],{cen:14.4,res:4},['QUEIJO MUSSARELA PECA'],2],
    ['p12','Queijo meia cura','lat','kg',48.00,6,'0406.90.10','', 'f3',[],L.cf,25,['Peça 3 kg',3],{cen:7,pad:2.4},['QUEIJO MEIA CURA MINAS'],3],
    ['p13','Presunto cozido','lat','kg',32.00,6,'1602.41.00','', 'f3',['f1'],L.cf,15,['Peça 3,5 kg',3.5],{cen:5,pad:1.8,res:1.2},['PRESUNTO COZIDO S/CAPA'],2],
    ['p14','Cream cheese','lat','kg',53.00,10,'0406.10.10','', 'f5',['f1','f3'],L.gs,3,['Balde 3,6 kg',3.6],{cen:1.6,sus:2.4},['CREAM CHEESE 3,6KG','CREAM CHEESE BALDE','REQUEIJAO CREAM CHEESE'],1],
    ['p15','Polvilho azedo','far','kg',11.50,20,'1108.14.00','', 'f1',['f2'],L.ds,240,['Fardo 10 kg',10],{cen:30,pad:6},['POLVILHO AZEDO 1KG'],3],
    ['p16','Chocolate meio amargo','mer','kg',38.00,5,'1806.20.00','', 'f1',[],L.ds,210,['Barra 2,1 kg',2.1],{cen:6.3,pad:1.4},['CHOCOLATE COBERTURA M.AMARGO 2,1KG'],4],
    ['p17','Fermento químico','far','kg',30.00,2,'2102.30.00','', 'f1',[],L.ds,300,['Pote 1 kg',1],{cen:3,pad:0.7},['FERMENTO QUIMICO PO 1KG'],6],
    ['p18','Óleo de soja','ole','L',9.40,40,'1507.90.11','', 'f1',['f5'],L.ds,240,['Galão 5 L',5],{cen:30,pad:6,res:10,sus:12},['OLEO DE SOJA GALAO 5L','OLEO SOJA REFINADO'],1],
    ['p19','Azeite extravirgem','ole','L',48.00,6,'1509.20.00','', 'f1',[],L.db,420,['Lata 3 L',3],{cen:9,res:1.5},['AZEITE EXTRA VIRGEM 3L'],48],
    ['p20','Arroz agulhinha tipo 1','far','kg',5.80,60,'1006.30.21','', 'f1',[],L.ds,270,['Fardo 30 kg',30],{cen:90,res:22},['ARROZ AGULHINHA T1 5KG'],1],
    ['p21','Arroz japonês (grão curto)','ori','kg',23.40,25,'1006.30.11','', 'f5',['f1'],L.ds,300,['Saco 10 kg',10],{cen:8,sus:4},['ARROZ JAPONES GRAO CURTO 10KG','ARROZ P/ SUSHI','ARROZ JAPONES'],1],
    ['p22','Feijão carioca','far','kg',8.20,30,'0713.33.19','', 'f1',[],L.ds,240,['Fardo 30 kg',30],{cen:40,res:9},['FEIJAO CARIOCA T1 1KG'],1],
    ['p23','Massa para lasanha','mer','kg',14.00,8,'1902.19.00','', 'f1',[],L.ds,180,['Caixa 5 kg',5],{cen:10,res:2},['MASSA LASANHA SEMOLA 500G'],4],
    ['p24','Farinha de rosca','far','kg',12.00,5,'1905.90.90','', 'f1',[],L.ds,120,['Pacote 1 kg',1],{cen:6,res:1.5},['FARINHA DE ROSCA 1KG'],5],
    ['p25','Farinha panko','ori','kg',26.00,5,'1905.90.90','', 'f5',['f1'],L.ds,180,['Pacote 1 kg',1],{cen:4,sus:1.6},['FARINHA PANKO 1KG'],2],
    ['p26','Molho de tomate','mer','kg',9.50,20,'2103.20.10','', 'f1',[],L.ds,365,['Caixa 12 kg (bag 2 kg)',12],{cen:26,res:6},['MOLHO TOMATE BAG 2KG'],2],
    ['p27','Champignon fatiado','mer','kg',42.00,4,'2003.10.00','', 'f1',[],L.ds,300,['Balde 2 kg',2],{cen:5,res:1.2},['COGUMELO CHAMPIGNON FATIADO 2KG'],8],
    ['p28','Cebola','hor','kg',4.80,25,'0703.10.19','', 'f7',[],L.cr,20,['Saco 20 kg',20],{cen:26,res:8,sus:2},['CEBOLA NACIONAL'],1],
    ['p29','Tomate','hor','kg',7.90,20,'0702.00.00','', 'f7',[],L.cr,6,['Caixa 20 kg',20],{cen:14,res:6},['TOMATE ITALIANO'],1],
    ['p30','Alface crespa','hor','kg',9.00,6,'0705.11.00','', 'f7',[],L.cr,4,['Engradado 6 kg',6],{res:5.2},['ALFACE CRESPA'],1],
    ['p31','Cenoura','hor','kg',4.90,10,'0706.10.00','', 'f7',[],L.cr,15,['Caixa 20 kg',20],{cen:12,pad:3,sus:2},['CENOURA EXTRA'],2],
    ['p32','Batata inglesa','hor','kg',5.60,30,'0701.90.00','', 'f7',[],L.cr,25,['Saco 25 kg',25],{cen:40,res:12},['BATATA LAVADA'],2],
    ['p33','Pepino japonês','hor','kg',7.50,8,'0707.00.00','', 'f7',[],L.gs,7,['Caixa 10 kg',10],{sus:9.5},['PEPINO JAPONES'],1],
    ['p34','Nabo','hor','kg',6.90,4,'0706.90.00','', 'f7',[],L.gs,10,['Caixa 10 kg',10],{sus:5},['NABO BRANCO'],2],
    ['p35','Shimeji','hor','kg',36.00,4,'0709.59.00','', 'f7',['f5'],L.gs,2,['Bandeja 200 g',0.2],{sus:3.4},['COGUMELO SHIMEJI BRANCO 200G'],1],
    ['p36','Filé de peito de frango','car','kg',21.90,30,'0207.14.00','', 'f6',['f1'],L.fz,90,['Caixa 20 kg',20],{cen:38,res:12},['FILE PEITO FRANGO CONG CX 20KG'],1],
    ['p37','Patinho bovino','car','kg',46.90,20,'0201.30.00','', 'f6',[],L.cf,6,['Peça a vácuo ~5 kg',5],{cen:22,res:6},['PATINHO BOVINO RESFRIADO'],1],
    ['p38','Carne moída (acém)','car','kg',36.90,15,'0201.30.00','', 'f6',[],L.cf,5,['Pacote 2 kg',2],{cen:16,res:4},['ACEM MOIDO RESFRIADO'],1],
    ['p39','Salmão fresco (filé)','pes','kg',76.20,15,'0304.41.00','', 'f4',['f1','f5'],L.gs,4,['Caixa ~10 kg',10],{cen:1.8,sus:3.8},['SALMAO FILE C/PELE FRESCO','SALMAO FRESCO FILE','FILE DE SALMAO'],1],
    ['p40','Kani kama','pes','kg',32.00,5,'1604.20.10','', 'f5',['f1'],L.fz,60,['Pacote 1 kg',1],{sus:6},['KANI KAMA 1KG'],3],
    ['p41','Alga nori (folha)','ori','un',0.85,300,'1212.29.00','', 'f5',['f1'],L.db,365,['Pacote 50 folhas',50],{cen:250,sus:180},['ALGA NORI YAKI 50 FOLHAS','NORI'],1],
    ['p42','Shoyu','ori','L',14.20,6,'2103.10.10','', 'f5',['f1'],L.db,300,['Galão 1,9 L',1.9],{cen:1.9,sus:1.1},['MOLHO SHOYU 1,9L','SHOYU TRADICIONAL'],1],
    ['p43','Vinagre de arroz','ori','L',16.80,6,'2209.00.00','', 'f5',[],L.db,365,['Galão 1,8 L',1.8],{cen:5.4,sus:2.6},['VINAGRE DE ARROZ 1,8L'],2],
    ['p44','Gergelim branco','ori','kg',34.00,2,'1207.40.90','', 'f5',[],L.db,240,['Pacote 1 kg',1],{cen:3,sus:0.8},['GERGELIM BRANCO 1KG'],3],
    ['p45','Wasabi em pasta','ori','kg',120.00,1,'2103.90.21','', 'f5',[],L.gs,120,['Bisnaga 43 g (cx 10)',0.43],{sus:1.3},['WASABI PASTA 43G'],2],
    ['p46','Gengibre em conserva','ori','kg',28.00,3,'2001.90.00','', 'f5',[],L.gs,180,['Balde 1,5 kg',1.5],{sus:4.5},['GENGIBRE CONSERVA GARI 1,5KG'],2],
    ['p47','Molho tarê','ori','L',22.00,3,'2103.90.91','', 'f5',[],L.db,240,['Galão 1,8 L',1.8],{sus:3.6},['MOLHO TARE 1,8L'],2],
    ['p48','Refrigerante lata 350 ml','beb','un',3.10,240,'2202.10.00','03.007.00','f9',['f1'],L.br,180,['Fardo 12 latas',12],{cen:180,pad:48,res:72,sus:60},['REFRIG COLA LATA 350ML FD12','REFRIGERANTE LATA'],1],
    ['p49','Água mineral 500 ml','beb','un',1.20,240,'2201.10.00','03.004.00','f9',[],L.br,300,['Fardo 12 un',12],{cen:240,pad:36,res:48,sus:48},['AGUA MINERAL S/GAS 500ML FD12'],1],
    ['p50','Cerveja long neck 355 ml','beb','un',5.40,120,'2203.00.00','03.021.00','f9',[],L.br,150,['Caixa 24 un',24],{cen:96,res:48,sus:72},['CERVEJA PILSEN LN 355ML CX24'],1],
    ['p51','Suco integral de uva','beb','L',12.50,24,'2009.69.00','','f9',['f1'],L.br,240,['Caixa 6 L',6],{cen:30,pad:6,res:6},['SUCO UVA INTEGRAL 1L'],3],
    ['p52','Saquê seco','beb','L',68.00,6,'2206.00.90','','f5',[],L.br,720,['Garrafa 750 ml',0.75],{sus:6.75},['SAQUE SECO 750ML'],61],
    ['p53','Marmitex com tampa 750 ml','emb','un',0.62,500,'3923.10.90','','f8',[],L.al,null,['Caixa 250 un',250],{cen:900,res:220},['EMBALAGEM MARMITEX 750ML C/TAMPA'],2],
    ['p54','Embalagem para sushi (combinado)','emb','un',1.45,300,'3923.10.90','','f8',[],L.al,null,['Caixa 200 un',200],{cen:260,sus:90},['EMBALAGEM SUSHI COMBINADO G'],2],
    ['p55','Sacola kraft delivery','emb','un',0.38,600,'4819.40.00','','f8',[],L.al,null,['Pacote 500 un',500],{cen:1500,pad:300,res:200,sus:200},['SACOLA KRAFT 30X40'],3],
    ['p56','Hashi descartável','emb','un',0.12,1000,'4421.99.00','','f8',['f5'],L.al,null,['Caixa 3.000 pares',3000],{cen:2400,sus:600},['HASHI BAMBU EMBALADO'],4],
    ['p57','Papel manteiga (rolo)','emb','un',18.50,6,'4806.20.00','','f8',[],L.al,null,['Caixa 6 rolos',6],{cen:8,pad:3},['PAPEL MANTEIGA 30CMX7,5M'],9]
  ];
  db.produtos = P.map(function(a){
    var est={cen:0,pad:0,res:0,sus:0}, k; for(k in a[13]) est[k]=a[13][k];
    return {id:a[0], nome:a[1], cat:a[2], un:a[3], custoMedio:a[4], ultimoCusto:a[4], estMin:a[5], ncm:a[6], cest:a[7],
      forn:a[8], fornAlt:a[9], local:a[10], validade:a[11]==null?null:D(a[11]), conv:{un:a[12][0], fator:a[12][1]},
      est:est, apelidos:a[14], ultMov:D(-a[15]), tipo:'insumo', contado:null, hist:[]};
  });

  /* produtos acabados (saem da produção) */
  [['pa1','Pão francês','un',0.21,120,L.vt,1,{pad:180},'r01'],
   ['pa2','Croissant de manteiga','un',2.10,12,L.vt,2,{pad:18},'r03'],
   ['pa3','Pão de queijo (congelado)','un',0.58,150,L.fz,60,{pad:260},'r04'],
   ['pa4','Bolo de cenoura com chocolate','un',21.50,2,L.vt,3,{pad:3},'r02']].forEach(function(a){
    var est={cen:0,pad:0,res:0,sus:0},k; for(k in a[7]) est[k]=a[7][k];
    db.produtos.push({id:a[0], nome:a[1], cat:'aca', un:a[2], custoMedio:a[3], ultimoCusto:a[3], estMin:a[4], ncm:'1905.90.90', cest:'', forn:null, fornAlt:[], local:a[5], validade:D(a[6]), conv:{un:'Unidade',fator:1}, est:est, apelidos:[], ultMov:D(0), tipo:'acabado', receita:a[8], contado:null, hist:[]});
  });

  /* divergência de inventário (contagem física diferente do sistema) */
  function prod(id){ for(var i=0;i<db.produtos.length;i++) if(db.produtos[i].id===id) return db.produtos[i]; return null; }
  prod('p11').contado = {qtd:16.9, data:D(-1), por:'Renata (estoquista)', dep:'cen'};
  prod('p50').contado = {qtd:90, data:D(-2), por:'Renata (estoquista)', dep:'cen'};

  /* histórico de custos (últimos 6 meses) — variação realista por produto */
  var tend = {p39:[64.8,66.5,69.9,71.4,74.0,76.2], p14:[46.2,47.0,48.9,50.5,51.8,53.0], p21:[21.0,21.4,22.1,22.6,23.0,23.4], p01:[4.62,4.75,4.90,5.02,5.10,5.20], p07:[45.5,47.2,48.0,49.8,51.0,52.0], p36:[23.4,22.9,22.1,21.6,21.9,21.9], p37:[42.1,43.0,44.2,45.0,46.1,46.9], p18:[8.10,8.40,8.90,9.20,9.30,9.40], p42:[12.9,13.2,13.6,13.9,14.0,14.2], p02:[4.95,5.05,5.20,5.30,5.35,5.40]};
  db.produtos.forEach(function(p){
    var t=tend[p.id], i, base=p.custoMedio;
    for(i=5;i>=0;i--){
      var v = t ? t[5-i] : r2(base*(1-(i*0.008)+(R()-.5)*0.02));
      if(i===0) v=base;
      p.hist.push({d:D(-i*30-5), v:v, origem:i===0?'Custo médio atual':'Compra'});
    }
  });

  /* ===== RECEITAS / FICHAS TÉCNICAS =====
     ingredientes: [produto, quantidade, unidade da receita] — g, kg, ml, L ou un */
  db.receitas = [
    {id:'r01', nome:'Pão francês', dep:'pad', cat:'Pães', foto:'🥖', cor:'#F6E3C5', rend:100, rendUn:'unidades', pesoFinal:5000, perda:3, tempo:180, preco:0.95, vendaUn:'un', acabado:'pa1',
      ing:[['p01',3,'kg'],['p04',60,'g'],['p03',60,'g'],['p02',30,'g'],['p05',30,'g'],['p06',45,'g']], modo:'Misturar secos, adicionar água gelada (1,8 L) e a gordura. Sovar 12 min, dividir em 50 g, fermentar 3 h e assar a 200 °C por 18 min.'},
    {id:'r02', nome:'Bolo de cenoura com chocolate', dep:'pad', cat:'Bolos', foto:'🍰', cor:'#F8DCC2', rend:1, rendUn:'bolo (12 fatias)', pesoFinal:1600, perda:4, tempo:70, preco:54.90, vendaUn:'un', acabado:'pa4',
      ing:[['p31',300,'g'],['p10',4,'un'],['p02',300,'g'],['p01',300,'g'],['p18',200,'ml'],['p17',15,'g'],['p16',200,'g'],['p08',120,'ml'],['p07',30,'g']], modo:'Bater cenoura, ovos e óleo; incorporar açúcar, farinha e fermento. Assar 40 min a 180 °C. Cobrir com ganache.'},
    {id:'r03', nome:'Croissant de manteiga', dep:'pad', cat:'Folhados', foto:'🥐', cor:'#F5E1B8', rend:24, rendUn:'unidades', pesoFinal:1920, perda:5, tempo:240, preco:8.90, vendaUn:'un', acabado:'pa2',
      ing:[['p01',1,'kg'],['p07',500,'g'],['p08',300,'ml'],['p02',100,'g'],['p10',2,'un'],['p04',25,'g'],['p03',20,'g']], modo:'Massa base descansada 12 h; laminação com 3 dobras simples; modelar, fermentar 2 h e assar 16 min a 190 °C.'},
    {id:'r04', nome:'Pão de queijo', dep:'pad', cat:'Salgados', foto:'🧀', cor:'#FBEBC0', rend:50, rendUn:'unidades', pesoFinal:1250, perda:2, tempo:60, preco:2.90, vendaUn:'un', acabado:'pa3',
      ing:[['p15',1,'kg'],['p12',500,'g'],['p08',500,'ml'],['p18',250,'ml'],['p10',4,'un'],['p03',20,'g']], modo:'Escaldar o polvilho com leite e óleo ferventes; adicionar ovos e queijo. Bolear 25 g e congelar.'},
    {id:'r05', nome:'Prato executivo de frango grelhado', dep:'res', cat:'Pratos do almoço', foto:'🍗', cor:'#E3ECF9', rend:1, rendUn:'porção', pesoFinal:520, perda:6, tempo:25, preco:34.90, vendaUn:'porção',
      ing:[['p36',180,'g'],['p20',150,'g'],['p22',120,'g'],['p30',30,'g'],['p29',40,'g'],['p18',10,'ml'],['p03',3,'g'],['p28',20,'g']], modo:'Grelhar o filé temperado; servir com arroz, feijão e salada.'},
    {id:'r06', nome:'Strogonoff de carne', dep:'res', cat:'Pratos do almoço', foto:'🍛', cor:'#E6EDF8', rend:10, rendUn:'porções', pesoFinal:3600, perda:8, tempo:50, preco:44.90, vendaUn:'porção',
      ing:[['p37',1.5,'kg'],['p09',600,'g'],['p27',300,'g'],['p28',300,'g'],['p26',200,'g'],['p07',60,'g'],['p20',1.2,'kg'],['p32',800,'g'],['p18',100,'ml']], modo:'Selar a carne em tiras, refogar cebola e champignon, juntar molho e creme. Servir com arroz e batata palha.'},
    {id:'r07', nome:'Lasanha à bolonhesa', dep:'res', cat:'Massas', foto:'🍝', cor:'#E8EEF7', rend:12, rendUn:'porções', pesoFinal:4200, perda:5, tempo:90, preco:41.90, vendaUn:'porção',
      ing:[['p23',1,'kg'],['p38',1.2,'kg'],['p11',800,'g'],['p26',1,'kg'],['p13',500,'g'],['p08',1,'L'],['p07',100,'g'],['p01',100,'g'],['p28',200,'g']], modo:'Montar camadas de massa, bolonhesa, bechamel, presunto e muçarela. Gratinar 35 min.'},
    {id:'r08', nome:'Filé à parmegiana', dep:'res', cat:'Pratos do almoço', foto:'🍽️', cor:'#E2E9F6', rend:1, rendUn:'porção', pesoFinal:610, perda:7, tempo:35, preco:46.90, vendaUn:'porção',
      ing:[['p37',200,'g'],['p11',60,'g'],['p26',80,'g'],['p24',40,'g'],['p10',1,'un'],['p20',150,'g'],['p32',200,'g'],['p18',60,'ml']], modo:'Empanar, fritar, cobrir com molho e queijo e gratinar. Acompanha arroz e fritas.'},
    {id:'r09', nome:'Temaki de salmão', dep:'sus', cat:'Temakis', foto:'🍣', cor:'#FBE0E9', rend:1, rendUn:'unidade', pesoFinal:235, perda:2, tempo:4, preco:32.00, vendaUn:'un', buffet:true,
      ing:[['p21',120,'g'],['p39',80,'g'],['p14',30,'g'],['p41',1,'un'],['p43',8,'ml']], modo:'Cone de nori com gohan, salmão em cubos e cream cheese.'},
    {id:'r10', nome:'Uramaki Filadélfia (8 peças)', dep:'sus', cat:'Rolls', foto:'🍥', cor:'#FCE3EC', rend:1, rendUn:'porção (8 peças)', pesoFinal:265, perda:3, tempo:6, preco:34.00, vendaUn:'porção', buffet:true,
      ing:[['p21',160,'g'],['p39',60,'g'],['p14',40,'g'],['p41',0.5,'un'],['p44',5,'g'],['p43',10,'ml']], modo:'Roll invertido com salmão e cream cheese, finalizado com gergelim.'},
    {id:'r11', nome:'Hot roll (10 peças)', dep:'sus', cat:'Rolls', foto:'🍤', cor:'#FDE6DA', rend:1, rendUn:'porção (10 peças)', pesoFinal:320, perda:4, tempo:8, preco:36.00, vendaUn:'porção', buffet:true,
      ing:[['p21',150,'g'],['p39',50,'g'],['p14',40,'g'],['p41',0.5,'un'],['p25',30,'g'],['p10',0.5,'un'],['p18',60,'ml'],['p47',20,'ml']], modo:'Roll empanado no panko e frito a 175 °C. Finalizar com tarê.'},
    {id:'r12', nome:'Sashimi de salmão (10 fatias)', dep:'sus', cat:'Sashimis', foto:'🐟', cor:'#FFE1D6', rend:1, rendUn:'porção (150 g)', pesoFinal:180, perda:12, tempo:5, preco:48.00, vendaUn:'porção', buffet:true,
      ing:[['p39',170,'g'],['p34',30,'g'],['p42',15,'ml']], modo:'Fatiar o lombo limpo em cortes de 15 g sobre cama de nabo.'},
    {id:'r13', nome:'Nigiri de salmão (2 unidades)', dep:'sus', cat:'Nigiris', foto:'🍙', cor:'#FFE5DD', rend:1, rendUn:'par', pesoFinal:70, perda:3, tempo:3, preco:16.00, vendaUn:'par', buffet:true,
      ing:[['p21',40,'g'],['p39',32,'g'],['p45',2,'g'],['p43',3,'ml']], modo:'Bolinho de gohan com lâmina de salmão e toque de wasabi.'},
    {id:'r14', nome:'Gohan (arroz temperado)', dep:'sus', cat:'Base', foto:'🍚', cor:'#F3F1EA', rend:1, rendUn:'kg', pesoFinal:1000, perda:2, tempo:45, preco:0, vendaUn:'kg', buffet:true,
      ing:[['p21',450,'g'],['p43',55,'ml'],['p02',35,'g'],['p03',10,'g']], modo:'Lavar, cozinhar e temperar com su (vinagre, açúcar e sal).'},
    {id:'r15', nome:'Sunomono', dep:'sus', cat:'Acompanhamentos', foto:'🥒', cor:'#E5F3E3', rend:1, rendUn:'kg', pesoFinal:1000, perda:6, tempo:20, preco:0, vendaUn:'kg', buffet:true,
      ing:[['p33',850,'g'],['p43',100,'ml'],['p02',60,'g'],['p44',10,'g']], modo:'Pepino em lâminas finas, desidratado com sal e marinado no su.'},
    {id:'r16', nome:'Shimeji na manteiga', dep:'sus', cat:'Acompanhamentos', foto:'🍄', cor:'#EFE7DC', rend:1, rendUn:'kg', pesoFinal:1000, perda:10, tempo:15, preco:0, vendaUn:'kg', buffet:true,
      ing:[['p35',1.1,'kg'],['p07',60,'g'],['p42',60,'ml']], modo:'Saltear o shimeji na manteiga e finalizar com shoyu.'}
  ].map(function(r){ r.ing=r.ing.map(function(i){ return {prod:i[0], qtd:i[1], un:i[2]}; }); return r; });

  /* ===== MARKUP E PRECIFICAÇÃO (configurável) ===== */
  db.markup = {
    pad:{padrao:3.0, cats:{'Pães':2.9,'Bolos':2.6,'Folhados':3.4,'Salgados':4.5}},
    res:{padrao:3.2, cats:{'Pratos do almoço':3.2,'Massas':3.0}},
    sus:{padrao:3.4, cats:{'Temakis':3.0,'Rolls':3.4,'Sashimis':3.0,'Nigiris':3.2}}
  };
  db.buffetPrecoKg = 139.90;

  /* ===== REGRAS TRIBUTÁRIAS (configuráveis, sujeitas a validação) =====
     Os percentuais abaixo são EXEMPLOS DE DEMONSTRAÇÃO, cadastrados para mostrar a mecânica.
     Regras com status "pendente" não entram na estimativa até o contador validar. */
  db.regrasTrib = [
    {id:'t01', escopo:'NCM', alvo:'2202.10.00', nome:'Refrigerantes', regime:'Todos', ufOrig:'SP', ufDest:'SP', operacao:'Compra para revenda', icms:18, pis:0, cofins:0, ipi:0, st:true, mva:'Pauta / MVA conforme portaria', creditavel:false, status:'validada', validadoPor:'Contabilidade Alves & Prado', obs:'ICMS recolhido por substituição tributária pelo fornecedor. PIS/COFINS monofásico.'},
    {id:'t02', escopo:'NCM', alvo:'2203.00.00', nome:'Cervejas', regime:'Todos', ufOrig:'SP', ufDest:'SP', operacao:'Compra para revenda', icms:20, pis:0, cofins:0, ipi:0, st:true, mva:'Conforme portaria CAT', creditavel:false, status:'validada', validadoPor:'Contabilidade Alves & Prado', obs:'Substituição tributária e tributação monofásica (exemplo).'},
    {id:'t03', escopo:'NCM', alvo:'2201.10.00', nome:'Água mineral', regime:'Todos', ufOrig:'SP', ufDest:'SP', operacao:'Compra para revenda', icms:18, pis:0, cofins:0, ipi:0, st:true, mva:'Conforme portaria CAT', creditavel:false, status:'validada', validadoPor:'Contabilidade Alves & Prado', obs:''},
    {id:'t04', escopo:'NCM', alvo:'2206.00.90', nome:'Saquê', regime:'Lucro Presumido', ufOrig:'SP', ufDest:'SP', operacao:'Compra para revenda', icms:null, pis:null, cofins:null, ipi:null, st:null, mva:'', creditavel:null, status:'pendente', validadoPor:'', obs:'Aguardando classificação do contador (bebida alcoólica importada).'},
    {id:'t05', escopo:'Categoria', alvo:'lat', nome:'Laticínios (regra geral)', regime:'Todos', ufOrig:'MG', ufDest:'SP', operacao:'Compra para industrialização', icms:12, pis:1.65, cofins:7.6, ipi:0, st:false, mva:'', creditavel:true, status:'validada', validadoPor:'Contabilidade Alves & Prado', obs:'Operação interestadual MG→SP (exemplo). Produtos com NCM específico podem ter tratamento próprio.'},
    {id:'t06', escopo:'Produto', alvo:'p14', nome:'Cream cheese', regime:'Lucro Presumido', ufOrig:'SP', ufDest:'SP', operacao:'Compra para industrialização', icms:18, pis:1.65, cofins:7.6, ipi:0, st:false, mva:'', creditavel:true, status:'validada', validadoPor:'Contabilidade Alves & Prado', obs:'Regra específica por produto: prevalece sobre a regra da categoria.'},
    {id:'t07', escopo:'NCM', alvo:'0304.41.00', nome:'Filé de salmão fresco', regime:'Lucro Presumido', ufOrig:'SP', ufDest:'SP', operacao:'Compra para industrialização', icms:0, pis:0, cofins:0, ipi:0, st:false, mva:'', creditavel:false, status:'validada', validadoPor:'Contabilidade Alves & Prado', obs:'Exemplo de produto com isenção de ICMS nas operações internas e alíquota zero de PIS/COFINS — confirmar enquadramento.'},
    {id:'t08', escopo:'Categoria', alvo:'far', nome:'Farinhas e grãos', regime:'Simples Nacional', ufOrig:'SP', ufDest:'SP', operacao:'Compra para industrialização', icms:7, pis:0, cofins:0, ipi:0, st:false, mva:'', creditavel:false, status:'validada', validadoPor:'Contabilidade Alves & Prado', obs:'Simples Nacional não aproveita crédito de PIS/COFINS (exemplo).'},
    {id:'t09', escopo:'Categoria', alvo:'ori', nome:'Insumos orientais', regime:'Lucro Presumido', ufOrig:'SP', ufDest:'SP', operacao:'Compra para industrialização', icms:18, pis:1.65, cofins:7.6, ipi:0, st:false, mva:'', creditavel:true, status:'validada', validadoPor:'Contabilidade Alves & Prado', obs:'Produtos importados podem ter IPI destacado na entrada — verificar nota a nota.'},
    {id:'t10', escopo:'Categoria', alvo:'emb', nome:'Embalagens', regime:'Todos', ufOrig:'SP', ufDest:'SP', operacao:'Uso e consumo', icms:18, pis:1.65, cofins:7.6, ipi:5, st:false, mva:'', creditavel:false, status:'validada', validadoPor:'Contabilidade Alves & Prado', obs:'IPI destacado pelo fabricante (exemplo).'},
    {id:'t11', escopo:'Categoria', alvo:'car', nome:'Carnes e aves', regime:'Simples Nacional', ufOrig:'SP', ufDest:'SP', operacao:'Compra para industrialização', icms:null, pis:null, cofins:null, ipi:null, st:null, mva:'', creditavel:null, status:'pendente', validadoPor:'', obs:'Pendente: verificar redução de base de cálculo e eventual isenção na cesta básica.'},
    {id:'t12', escopo:'Categoria', alvo:'hor', nome:'Hortifrúti in natura', regime:'Todos', ufOrig:'SP', ufDest:'SP', operacao:'Compra para industrialização', icms:0, pis:0, cofins:0, ipi:0, st:false, mva:'', creditavel:false, status:'validada', validadoPor:'Contabilidade Alves & Prado', obs:'Exemplo de produtos in natura isentos.'},
    {id:'t13', escopo:'Categoria', alvo:'mer', nome:'Mercearia (regra geral)', regime:'Todos', ufOrig:'SP', ufDest:'SP', operacao:'Compra para industrialização', icms:18, pis:1.65, cofins:7.6, ipi:0, st:false, mva:'', creditavel:true, status:'em_revisao', validadoPor:'', obs:'Em revisão: açúcar e sal podem ter tratamento diferente do restante da categoria.'},
    {id:'t14', escopo:'Categoria', alvo:'ole', nome:'Óleos e gorduras', regime:'Todos', ufOrig:'SP', ufDest:'SP', operacao:'Compra para industrialização', icms:12, pis:0, cofins:0, ipi:0, st:false, mva:'', creditavel:false, status:'validada', validadoPor:'Contabilidade Alves & Prado', obs:''},
    {id:'t15', escopo:'Categoria', alvo:'pes', nome:'Pescados (regra geral)', regime:'Todos', ufOrig:'SP', ufDest:'SP', operacao:'Compra para industrialização', icms:null, pis:null, cofins:null, ipi:null, st:null, mva:'', creditavel:null, status:'pendente', validadoPor:'', obs:'Cada NCM de pescado precisa de regra própria. Não presumir tratamento igual para toda a categoria.'},
    {id:'t16', escopo:'Categoria', alvo:'beb', nome:'Bebidas (demais)', regime:'Todos', ufOrig:'SP', ufDest:'SP', operacao:'Compra para revenda', icms:18, pis:0, cofins:0, ipi:0, st:false, mva:'', creditavel:false, status:'validada', validadoPor:'Contabilidade Alves & Prado', obs:'Sucos e demais bebidas sem ST (exemplo).'}
  ];

  /* ===== NOTAS FISCAIS ===== */
  var seqId = 0; function nid(p){ seqId++; return p+seqId; }
  function itemNF(desc, cod, ncm, cfop, un, qtd, vUn, prodId, fator, imp){
    imp = imp || {};
    var vProd = r2(qtd*vUn), it = {id:nid('i'), desc:desc, cod:cod, ncm:ncm, cfop:cfop, un:un, qtd:qtd, vUn:vUn, vProd:vProd, prod:prodId, fator:fator, conf:!!prodId};
    it.icms = {cst:imp.cst||'00', bc:imp.icms?vProd:0, p:imp.icms||0, v:imp.icms?r2(vProd*imp.icms/100):0};
    it.ipi = {p:imp.ipi||0, v:imp.ipi?r2(vProd*imp.ipi/100):0};
    it.pis = {p:imp.pis||0, v:imp.pis?r2(vProd*imp.pis/100):0};
    it.cofins = {p:imp.cofins||0, v:imp.cofins?r2(vProd*imp.cofins/100):0};
    it.st = {v:imp.st?r2(vProd*imp.st/100):0};
    return it;
  }
  function totalNF(n){ var t=0; n.itens.forEach(function(i){ t+=i.vProd+i.ipi.v+i.st.v; }); return r2(t+(n.frete||0)-(n.desconto||0)); }
  function chave(cnpj, num){ var c=cnpj.replace(/\D/g,''); var s='3526'+(new Date().getMonth()<9?'0':'')+'11'+c+'55001'+num.replace(/\D/g,'').padStart(9,'0')+'1'+String(Math.floor(R()*1e8)).padStart(8,'0'); return (s+'00000000000000').slice(0,44); }

  var LC = {icms:12, pis:1.65, cofins:7.6};
  db.notas = [];
  function addNF(o){ o.chave=chave(LFI._fornCnpj(db,o.forn), o.numero); o.valor=totalNF(o); db.notas.push(o); return o; }
  LFI._fornCnpj = function(d,f){ for(var i=0;i<d.fornecedores.length;i++) if(d.fornecedores[i].id===f) return d.fornecedores[i].cnpj; return ''; };

  /* (1) NOTA DA DEMONSTRAÇÃO — chega na caixa de entrada; ainda não foi lançada */
  addNF({id:'nf_demo', numero:'000.125.890', serie:'1', forn:'f1', empresa:'e1', dep:'cen', emissao:D(0), entrada:null, status:'recebida', origem:'xml', arquivo:'NFe35261108412335000127550010001258901.xml', oc:'oc121', frete:103, desconto:0, natOp:'Venda de mercadoria adquirida de terceiros',
    itens:[
      itemNF('ARROZ JAPONES GRAO CURTO 10KG','DC-10221','1006.30.11','5102','SC',5,255.00,null,10,LC),
      itemNF('SALMAO FILE C/PELE FRESCO','DC-55410','0304.41.00','5102','KG',20,84.50,null,1,{}),
      itemNF('CREAM CHEESE BALDE 3,6KG','DC-30981','0406.10.10','5102','KG',15,55.40,null,1,LC),
      itemNF('FARINHA TRIGO ESPECIAL 25KG','DC-10017','1101.00.10','5102','SC',4,141.50,null,25,{icms:7}),
      itemNF('ACUCAR CRISTAL 5KG','DC-10450','1701.14.00','5102','FD',6,29.50,null,5,{icms:7}),
      itemNF('OLEO DE SOJA GALAO 5L','DC-20112','1507.90.11','5102','GL',4,52.00,null,5,{icms:12})
    ]});
  /* (2..6) notas já lançadas — histórico */
  addNF({id:'nf01', numero:'000.098.112', serie:'1', forn:'f2', empresa:'e1', dep:'cen', emissao:D(-7), entrada:D(-6), status:'lancada', origem:'xml', arquivo:'NFe35261161204118000345550010000981121.xml', oc:'oc118', frete:0, desconto:0, natOp:'Venda de produção do estabelecimento',
    itens:[ itemNF('FARINHA DE TRIGO TIPO 1 ESPECIAL 25KG','MP-001','1101.00.10','5101','SC',8,130.00,'p01',25,{icms:7}),
            itemNF('FERMENTO BIOL SECO 500G','MP-114','2102.10.00','5101','PC',10,19.00,'p04',0.5,{icms:18}),
            itemNF('MELHORADOR PAES 1KG','MP-120','2106.90.90','5101','PC',4,32.00,'p05',1,{icms:18}) ]});
  addNF({id:'nf02', numero:'000.045.778', serie:'2', forn:'f5', empresa:'e3', dep:'sus', emissao:D(-13), entrada:D(-12), status:'lancada', origem:'xml', arquivo:'NFe35261133402786000191550020000457781.xml', oc:'oc116', frete:0, desconto:45, natOp:'Venda de mercadoria',
    itens:[ itemNF('ARROZ JAPONES GRAO CURTO 10KG','OF-0091','1006.30.11','5102','SC',4,229.00,'p21',10,LC),
            itemNF('ALGA NORI YAKI 50 FOLHAS','OF-0210','1212.29.00','5102','PC',8,42.50,'p41',50,LC),
            itemNF('MOLHO SHOYU 1,9L','OF-0331','2103.10.10','5102','GL',3,27.00,'p42',1.9,LC),
            itemNF('VINAGRE DE ARROZ 1,8L','OF-0340','2209.00.00','5102','GL',3,30.24,'p43',1.8,LC),
            itemNF('WASABI PASTA 43G','OF-0402','2103.90.21','6102','CX',2,51.60,'p45',0.43,{icms:12,pis:1.65,cofins:7.6,ipi:4}) ]});
  addNF({id:'nf03', numero:'000.231.004', serie:'1', forn:'f4', empresa:'e3', dep:'sus', emissao:D(-5), entrada:D(-5), status:'lancada', origem:'xml', arquivo:'NFe35261129871004000112550010002310041.xml', oc:null, frete:0, desconto:0, natOp:'Venda de mercadoria',
    itens:[ itemNF('SALMAO FRESCO FILE CHILE','MA-77','0304.41.00','5102','KG',18,78.90,'p39',1,{}),
            itemNF('KANI KAMA 1KG','MA-31','1604.20.10','5102','PC',6,32.00,'p40',1,LC) ]});
  addNF({id:'nf04', numero:'000.017.552', serie:'1', forn:'f3', empresa:'e1', dep:'cen', emissao:D(-3), entrada:D(-2), status:'lancada', origem:'pdf', arquivo:'DANFE_000017552_SerraVerde.pdf', oc:'oc119', frete:60, desconto:0, natOp:'Venda de produção do estabelecimento',
    itens:[ itemNF('MANTEIGA S/SAL 5KG','SV-12','0405.10.00','6101','BL',2,255.00,'p07',5,LC),
            itemNF('QUEIJO MUSSARELA PECA','SV-20','0406.10.10','6101','KG',16,39.50,'p11',1,LC),
            itemNF('LEITE UHT INTEGRAL 1L CX12','SV-03','0401.10.10','6101','CX',4,66.00,'p08',12,{icms:12}),
            itemNF('CREME DE LEITE 200G','SV-07','0401.40.21','6101','CX',6,22.30,'p09',1.02,LC) ]});
  addNF({id:'nf05', numero:'000.554.210', serie:'3', forn:'f9', empresa:'e1', dep:'cen', emissao:D(-11), entrada:D(-10), status:'lancada', origem:'xml', arquivo:'NFe35261114665873000170550030005542101.xml', oc:null, frete:0, desconto:0, natOp:'Venda de mercadoria sujeita a ST',
    itens:[ itemNF('REFRIG COLA LATA 350ML FD12','RP-100','2202.10.00','5405','FD',20,33.60,'p48',12,{cst:'60',st:21}),
            itemNF('AGUA MINERAL S/GAS 500ML FD12','RP-210','2201.10.00','5405','FD',20,13.20,'p49',12,{cst:'60',st:18}),
            itemNF('CERVEJA PILSEN LN 355ML CX24','RP-330','2203.00.00','5405','CX',5,118.80,'p50',24,{cst:'60',st:26}) ]});
  addNF({id:'nf06', numero:'000.088.341', serie:'1', forn:'f6', empresa:'e2', dep:'res', emissao:D(-9), entrada:D(-9), status:'lancada', origem:'xml', arquivo:'NFe35261105776430000103550010000883411.xml', oc:'oc117b', frete:0, desconto:0, natOp:'Venda de produção do estabelecimento',
    itens:[ itemNF('FILE PEITO FRANGO CONG CX 20KG','BN-301','0207.14.00','5101','CX',2,438.00,'p36',20,{icms:7}),
            itemNF('PATINHO BOVINO RESFRIADO','BN-110','0201.30.00','5101','KG',24,46.50,'p37',1,{icms:7}),
            itemNF('ACEM MOIDO RESFRIADO','BN-115','0201.30.00','5101','KG',16,36.90,'p38',1,{icms:7}) ]});
  db.notas.forEach(function(n){ n.cp = n.status==='lancada' ? 'cp_'+n.id : null; });

  /* ===== CONTAS A PAGAR ===== */
  db.contasPagar = [];
  var prazos = {f1:28,f2:28,f3:14,f4:7,f5:28,f6:14,f7:7,f8:30,f9:21};
  db.notas.forEach(function(n){ if(n.status!=='lancada') return;
    var venc=new Date(n.emissao+'T12:00:00'); venc.setDate(venc.getDate()+prazos[n.forn]);
    db.contasPagar.push({id:'cp_'+n.id, forn:n.forn, empresa:n.empresa, nf:n.id, descricao:'NF '+n.numero, emissao:n.emissao, venc:iso(venc), valor:n.valor, status:iso(venc)<D(0)?'pago':'aberto', categoria:'Compra de mercadorias'}); });
  [['f7','e2',-20,612.40,'pago'],['f7','e3',-13,488.90,'pago'],['f8','e1',-26,1840.00,'pago'],['f7','e2',3,702.30,'aberto'],['f8','e3',12,960.00,'aberto'],['f4','e3',2,1318.00,'aberto']].forEach(function(a,i){
    db.contasPagar.push({id:'cpx'+i, forn:a[0], empresa:a[1], nf:null, descricao:'Boleto '+(4100+i*37), emissao:D(a[2]-10), venc:D(a[2]), valor:a[3], status:a[4], categoria:'Compra de mercadorias'}); });

  /* ===== ORDENS DE COMPRA ===== */
  function oi(prod,qtd,preco,rec){ return {prod:prod, qtd:qtd, preco:preco, recebido:rec||0}; }
  db.ordens = [
    {id:'oc116', num:'OC-2026-0116', forn:'f5', empresa:'e3', dep:'sus', cot:'cot030', grupo:'GC-0030', emissao:D(-16), previsao:D(-12), cond:'28 dias', status:'recebida', nfs:['nf02'], obs:'', itens:[oi('p21',40,22.90,40),oi('p41',400,0.85,400),oi('p42',5.7,14.21,5.7),oi('p43',5.4,16.80,5.4),oi('p45',0.86,120,0.86)], hist:[{d:DH(-16,'09:12'),s:'aguardando_aprovacao',u:'Carla (compras)'},{d:DH(-16,'10:05'),s:'aprovada',u:'Roberto (proprietário)'},{d:DH(-16,'10:06'),s:'enviada',u:'Sistema'},{d:DH(-15,'08:00'),s:'aguardando_entrega',u:'Sistema'},{d:DH(-12,'09:40'),s:'recebida',u:'Renata (estoque)'}]},
    {id:'oc117', num:'OC-2026-0117', forn:'f8', empresa:'e1', dep:'cen', cot:null, grupo:null, emissao:D(-14), previsao:D(-9), cond:'30 dias', status:'cancelada', nfs:[], obs:'Cancelada: fornecedor sem estoque da sacola personalizada.', itens:[oi('p55',2000,0.38),oi('p53',1000,0.62)], hist:[{d:DH(-14,'14:00'),s:'aguardando_aprovacao',u:'Carla (compras)'},{d:DH(-14,'16:30'),s:'aprovada',u:'Roberto (proprietário)'},{d:DH(-13,'11:00'),s:'cancelada',u:'Carla (compras)'}]},
    {id:'oc117b', num:'OC-2026-0117-A', forn:'f6', empresa:'e2', dep:'res', cot:null, grupo:null, emissao:D(-11), previsao:D(-9), cond:'14 dias', status:'recebida', nfs:['nf06'], obs:'', itens:[oi('p36',40,21.90,40),oi('p37',24,46.50,24),oi('p38',16,36.90,16)], hist:[{d:DH(-11,'10:00'),s:'aguardando_aprovacao',u:'Chef Diego'},{d:DH(-11,'10:20'),s:'aprovada',u:'Roberto (proprietário)'},{d:DH(-11,'10:21'),s:'enviada',u:'Sistema'},{d:DH(-9,'07:30'),s:'recebida',u:'Renata (estoque)'}]},
    {id:'oc118', num:'OC-2026-0118', forn:'f2', empresa:'e1', dep:'cen', cot:'cot029', grupo:null, emissao:D(-9), previsao:D(-6), cond:'21/28 dias', status:'recebida', nfs:['nf01'], obs:'', itens:[oi('p01',200,5.20,200),oi('p04',5,38,5),oi('p05',4,32,4)], hist:[{d:DH(-9,'08:40'),s:'aguardando_aprovacao',u:'Carla (compras)'},{d:DH(-9,'09:00'),s:'aprovada',u:'Roberto (proprietário)'},{d:DH(-9,'09:01'),s:'enviada',u:'Sistema'},{d:DH(-8,'08:00'),s:'aguardando_entrega',u:'Sistema'},{d:DH(-6,'10:15'),s:'recebida',u:'Renata (estoque)'}]},
    {id:'oc119', num:'OC-2026-0119', forn:'f3', empresa:'e1', dep:'cen', cot:null, grupo:null, emissao:D(-4), previsao:D(-2), cond:'14 dias', status:'parcial', nfs:['nf04'], obs:'Faltaram 2 blocos de manteiga e 2 caixas de leite. Fornecedor promete o restante na sexta.', itens:[oi('p07',20,51.00,10),oi('p11',16,39.50,16),oi('p08',72,5.50,48),oi('p09',6.12,21.86,6.12)], hist:[{d:DH(-4,'15:10'),s:'aguardando_aprovacao',u:'Carla (compras)'},{d:DH(-4,'15:40'),s:'aprovada',u:'Roberto (proprietário)'},{d:DH(-4,'15:41'),s:'enviada',u:'Sistema'},{d:DH(-3,'08:00'),s:'aguardando_entrega',u:'Sistema'},{d:DH(-2,'09:05'),s:'parcial',u:'Renata (estoque)'}]},
    {id:'oc120', num:'OC-2026-0120', forn:'f6', empresa:'e2', dep:'res', cot:null, grupo:null, emissao:D(-1), previsao:D(1), cond:'14 dias', status:'aguardando_entrega', nfs:[], obs:'Cortes porcionados para o almoço de quinta.', itens:[oi('p37',20,46.90),oi('p36',40,21.60),oi('p38',10,36.90)], hist:[{d:DH(-1,'11:00'),s:'aguardando_aprovacao',u:'Chef Diego'},{d:DH(-1,'11:30'),s:'aprovada',u:'Roberto (proprietário)'},{d:DH(-1,'11:31'),s:'enviada',u:'Sistema'},{d:DH(-1,'14:00'),s:'aguardando_entrega',u:'Sistema'}]},
    {id:'oc121', num:'OC-2026-0121', forn:'f1', empresa:'e1', dep:'cen', cot:'cot030', grupo:null, emissao:D(-2), previsao:D(0), cond:'28 dias', status:'aguardando_entrega', nfs:[], obs:'Reposição do sushi e padaria. Nota fiscal chega com a entrega.', itens:[oi('p21',50,25.50),oi('p39',20,84.50),oi('p14',15,55.40),oi('p01',100,5.66),oi('p02',30,5.90),oi('p18',20,10.40)], hist:[{d:DH(-2,'16:00'),s:'aguardando_aprovacao',u:'Carla (compras)'},{d:DH(-2,'16:20'),s:'aprovada',u:'Roberto (proprietário)'},{d:DH(-2,'16:21'),s:'enviada',u:'Sistema'},{d:DH(-1,'08:00'),s:'aguardando_entrega',u:'Sistema'}]},
    {id:'oc122', num:'OC-2026-0122', forn:'f7', empresa:'e2', dep:'res', cot:null, grupo:null, emissao:D(0), previsao:D(1), cond:'Semanal (toda segunda)', status:'aguardando_aprovacao', nfs:[], obs:'Hortifrúti da semana para o restaurante.', itens:[oi('p29',20,7.80),oi('p28',20,4.70),oi('p30',6,9.00),oi('p32',25,5.50),oi('p31',10,4.90)], hist:[{d:DH(0,'07:45'),s:'aguardando_aprovacao',u:'Chef Diego'}]}
  ];

  /* ===== COTAÇÕES ===== */
  function ci(prod,qtd){ return {prod:prod, qtd:qtd}; }
  function prop(forn, canal, recebida, prazo, cond, frete, itens, arquivo, msg){ return {forn:forn, canal:canal, recebida:recebida, prazo:prazo, cond:cond, frete:frete, arquivo:arquivo||null, msg:msg||null, conferida:true, itens:itens.map(function(i){ return {prod:i[0], preco:i[1], qtdDisp:i[2], disp:i[2]>0}; })}; }
  db.cotacoes = [
    {id:'cot031', num:'COT-2026-031', data:DH(0,'08:20'), resp:'Carla (compras)', dep:'sus', empresa:'e3', origem:'foto', status:'comparacao', prazoRetorno:DH(0,'14:00'), obs:'Lista fotografada pelo Chef Hiro no fechamento de ontem.',
      itens:[ci('p39',20),ci('p14',15),ci('p21',30),ci('p42',10)], fornecedores:['f4','f1','f5','f3'],
      propostas:[
        prop('f4','whatsapp',DH(0,'09:02'),1,'7 dias',0,[['p39',82.00,20],['p14',0,0],['p21',0,0],['p42',0,0]],null,'Bom dia Carla! Salmão chileno fresco R$ 82,00 o kg, tenho os 20 kg para amanhã cedo. Cream cheese, arroz e shoyu não trabalhamos. Pagamento em 7 dias.'),
        prop('f1','pdf',DH(0,'09:35'),2,'28 dias',35,[['p39',78.50,12],['p14',52.40,15],['p21',24.20,30],['p42',13.90,10]],'Proposta_DistCentral_COT031.pdf'),
        prop('f5','excel',DH(0,'10:10'),2,'28 dias',0,[['p39',86.00,20],['p14',49.90,15],['p21',22.80,30],['p42',14.50,10]],'Cotacao_OrientalFoods_031.xlsx'),
        prop('f3','whatsapp',DH(0,'10:41'),2,'14 dias',0,[['p39',0,0],['p14',51.00,10],['p21',0,0],['p42',0,0]],null,'Oi Carla, tudo bem? Cream cheese temos 10 kg a R$ 51,00/kg (balde 3,6). Entrega quinta. Restante não temos.')
      ], escolhas:{}},
    {id:'cot032', num:'COT-2026-032', data:DH(-1,'15:30'), resp:'Carla (compras)', dep:'pad', empresa:'e1', origem:'lista', status:'aguardando_propostas', prazoRetorno:DH(1,'12:00'), obs:'Reposição semanal da padaria.',
      itens:[ci('p01',200),ci('p02',50),ci('p07',20),ci('p10',360)], fornecedores:['f2','f1','f3'],
      propostas:[ prop('f2','pdf',DH(0,'08:10'),3,'21/28 dias',0,[['p01',5.12,200],['p02',5.45,50],['p07',0,0],['p10',0,0]],'Orcamento_MoinhoPaulista_1029.pdf') ], escolhas:{}},
    {id:'cot033', num:'COT-2026-033', data:DH(0,'07:55'), resp:'Chef Diego', dep:'res', empresa:'e2', origem:'manual', status:'preparacao', prazoRetorno:DH(1,'10:00'), obs:'Proteínas para o cardápio da próxima semana.',
      itens:[ci('p37',30),ci('p36',40),ci('p38',15),ci('p09',12)], fornecedores:['f6','f1'], propostas:[], escolhas:{}},
    {id:'cot030', num:'COT-2026-030', data:DH(-17,'10:10'), resp:'Carla (compras)', dep:'sus', empresa:'e3', origem:'foto', status:'convertida', prazoRetorno:DH(-16,'12:00'), obs:'', ordens:['oc116'],
      itens:[ci('p21',40),ci('p41',400),ci('p42',5.7),ci('p43',5.4)], fornecedores:['f5','f1'],
      propostas:[ prop('f5','excel',DH(-17,'14:00'),2,'28 dias',0,[['p21',22.90,40],['p41',0.85,400],['p42',14.21,6],['p43',16.80,6]],'Cotacao_OrientalFoods_030.xlsx'),
                  prop('f1','whatsapp',DH(-17,'15:20'),2,'28 dias',35,[['p21',24.40,40],['p41',0.92,300],['p42',13.80,6],['p43',0,0]],null,'Carla, segue: arroz japonês 24,40/kg, nori 0,92 a folha (só 300), shoyu 13,80 o litro. Vinagre em falta.') ],
      escolhas:{p21:'f5',p41:'f5',p42:'f5',p43:'f5'}},
    {id:'cot029', num:'COT-2026-029', data:DH(-10,'09:00'), resp:'Carla (compras)', dep:'pad', empresa:'e1', origem:'manual', status:'cancelada', prazoRetorno:DH(-9,'12:00'), obs:'Cancelada: compra fechada direto com o Moinho Paulista (contrato mensal).',
      itens:[ci('p01',200),ci('p04',5)], fornecedores:['f2','f1'], propostas:[], escolhas:{}}
  ];

  /* ===== PRODUÇÃO ===== */
  db.producao = [
    {id:'op451', num:'OP-2026-0451', rec:'r01', qtd:300, dep:'pad', data:D(0), inicio:'04:30', fim:'07:40', resp:'Seu Antônio (padeiro)', status:'concluida', obs:'Fornada da manhã.'},
    {id:'op452', num:'OP-2026-0452', rec:'r03', qtd:48, dep:'pad', data:D(0), inicio:'06:10', fim:null, resp:'Seu Antônio (padeiro)', status:'producao', obs:'Laminação em andamento.'},
    {id:'op453', num:'OP-2026-0453', rec:'r06', qtd:30, dep:'res', data:D(0), inicio:null, fim:null, resp:'Chef Diego', status:'planejada', obs:'Almoço de hoje: 30 porções.'},
    {id:'op450', num:'OP-2026-0450', rec:'r04', qtd:200, dep:'pad', data:D(-1), inicio:'14:00', fim:'15:30', resp:'Larissa (confeitaria)', status:'concluida', obs:'Estoque de congelados.'},
    {id:'op449', num:'OP-2026-0449', rec:'r02', qtd:4, dep:'pad', data:D(-1), inicio:'09:00', fim:'10:20', resp:'Larissa (confeitaria)', status:'concluida', obs:''}
  ];

  /* ===== BUFFET (operação completa de sábado) =====
     destino: reaproveitar (vai ao estoque de sobras), descarte, perda */
  db.regrasSobra = [
    {grupo:'Peixe cru (sashimi, nigiri, temaki, uramaki)', receitas:['r12','r13','r09','r10'], reaproveita:false, tempMax:5, horasMax:0, validadeH:0, obs:'Peixe cru exposto no buffet não volta ao estoque. Destino obrigatório: descarte.'},
    {grupo:'Frituras (hot roll)', receitas:['r11'], reaproveita:false, tempMax:5, horasMax:0, validadeH:0, obs:'Perde textura e segurança após exposição. Descarte.'},
    {grupo:'Arroz temperado (gohan)', receitas:['r14'], reaproveita:true, tempMax:5, horasMax:2, validadeH:24, obs:'Reaproveitável somente se resfriado a até 5 °C em até 2 h após sair do buffet. Uso em até 24 h (yakimeshi).'},
    {grupo:'Conservas e marinados (sunomono)', receitas:['r15'], reaproveita:true, tempMax:5, horasMax:2, validadeH:24, obs:'Reaproveitável se mantido sob refrigeração e sem contato com o cliente (reposição por trás).'},
    {grupo:'Cozidos quentes (shimeji)', receitas:['r16'], reaproveita:true, tempMax:5, horasMax:2, validadeH:24, obs:'Resfriamento rápido obrigatório (de 60 °C para 10 °C em até 2 h).'}
  ];
  function bi(rec, ini, rep, fim, temp, hora, cond, dest, motivo){ return {rec:rec, pesoIni:ini, repos:rep||[], pesoFinal:fim, temp:temp, hora:hora, cond:cond, destino:dest, motivo:motivo||'', aprov:dest==='reaproveitar'}; }
  db.buffets = [
    {id:'bf088', num:'BF-2026-088', dep:'sus', empresa:'e3', data:D(-2), turno:'Jantar', abertura:'18:30', encerramento:'23:10', resp:'Chef Hiro', respEnc:'Chef Hiro', status:'encerrado', aprovadoPor:'Chef Hiro', clientes:142,
      itens:[
        bi('r12',8.5,[{h:'20:40',kg:3.0},{h:'21:50',kg:2.0}],1.2,4,'23:05','Câmara fria','descarte','Peixe cru exposto'),
        bi('r13',4.0,[{h:'21:15',kg:2.0}],0.6,4,'23:05','Câmara fria','descarte','Peixe cru exposto'),
        bi('r10',5.2,[{h:'20:55',kg:2.5}],0.9,5,'23:05','Câmara fria','descarte','Peixe cru exposto'),
        bi('r11',4.0,[{h:'21:30',kg:2.0}],0.7,null,'23:05','Ambiente','perda','Fritura exposta'),
        bi('r09',3.0,[],0.4,5,'23:05','Câmara fria','descarte','Peixe cru exposto'),
        bi('r14',6.0,[{h:'21:00',kg:3.0}],2.1,4,'23:08','Resfriador rápido','reaproveitar',''),
        bi('r15',3.0,[],0.9,4,'23:08','Câmara fria','reaproveitar',''),
        bi('r16',2.5,[],0.6,9,'23:08','Ambiente','descarte','Temperatura acima do limite (9 °C)')
      ],
      leituras:[]}
  ];
  /* curva de consumo do buffet de sábado (para os gráficos de acompanhamento) */
  db.buffets[0].leituras = [['18:30',0],['19:00',2.9],['19:30',8.0],['20:00',13.7],['20:30',20.3],['21:00',27.7],['21:30',34.4],['22:00',38.9],['22:30',41.9],['23:00',43.3]].map(function(a){ return {h:a[0], kg:a[1]}; });

  /* ===== FATURAMENTO (últimos 120 dias) ===== */
  db.vendas = [];
  var ops = {
    pad:{base:3900, sem:[1.18,0.86,0.9,0.92,0.95,1.06,1.32], cats:[['Pães',0.34],['Confeitaria',0.22],['Salgados',0.18],['Bebidas',0.14],['Revenda',0.12]]},
    res:{base:5600, sem:[0.55,1.02,1.04,1.06,1.08,1.12,1.38], cats:[['Almoço buffet/executivo',0.52],['À la carte',0.18],['Delivery',0.18],['Bebidas',0.12]]},
    sus:{base:7400, sem:[1.24,0,0.82,0.88,0.98,1.34,1.52], cats:[['Buffet por quilo',0.48],['Combinados',0.2],['Delivery',0.2],['Bebidas',0.12]]}
  };
  var i, k;
  for(i=119;i>=0;i--){
    var dd=new Date(hojeD()); dd.setDate(dd.getDate()-i); var dow=dd.getDay(), dia=iso(dd);
    var tr = 1+((119-i)/119)*0.09; // leve crescimento
    for(k in ops){
      var o=ops[k], f=o.sem[dow]; if(!f) continue;
      var tot = o.base*f*tr*(0.9+R()*0.2);
      if(i===0) tot*= (k==='sus'?0.18:k==='res'?0.62:0.7); // hoje ainda em andamento
      var cats={}; o.cats.forEach(function(c){ cats[c[0]]=r2(tot*c[1]*(0.92+R()*0.16)); });
      var soma=0, c2; for(c2 in cats) soma+=cats[c2];
      db.vendas.push({d:dia, dep:k, valor:r2(soma), cats:cats, tickets:Math.round(soma/(k==='pad'?24:k==='res'?52:96))});
    }
  }
  /* mix de produtos vendidos (participação por operação) */
  db.mixVendas = [
    {nome:'Pão francês', dep:'pad', rec:'r01', part:0.21, preco:0.95}, {nome:'Pão de queijo', dep:'pad', rec:'r04', part:0.11, preco:2.90},
    {nome:'Croissant de manteiga', dep:'pad', rec:'r03', part:0.09, preco:8.90}, {nome:'Bolo de cenoura com chocolate', dep:'pad', rec:'r02', part:0.06, preco:54.90},
    {nome:'Café expresso', dep:'pad', rec:null, part:0.12, preco:6.50, custo:1.10}, {nome:'Refrigerante lata', dep:'pad', rec:null, part:0.05, preco:7.00, custo:3.10, prod:'p48'},
    {nome:'Prato executivo de frango', dep:'res', rec:'r05', part:0.28, preco:34.90}, {nome:'Strogonoff de carne', dep:'res', rec:'r06', part:0.16, preco:44.90},
    {nome:'Filé à parmegiana', dep:'res', rec:'r08', part:0.15, preco:46.90}, {nome:'Lasanha à bolonhesa', dep:'res', rec:'r07', part:0.12, preco:41.90},
    {nome:'Suco integral', dep:'res', rec:null, part:0.06, preco:12.00, custo:3.40, prod:'p51'}, {nome:'Refrigerante lata', dep:'res', rec:null, part:0.06, preco:7.50, custo:3.10, prod:'p48'},
    {nome:'Buffet de sushi (kg)', dep:'sus', rec:null, part:0.46, preco:139.90, custo:44.80}, {nome:'Temaki de salmão', dep:'sus', rec:'r09', part:0.13, preco:32.00},
    {nome:'Uramaki Filadélfia', dep:'sus', rec:'r10', part:0.1, preco:34.00}, {nome:'Hot roll', dep:'sus', rec:'r11', part:0.08, preco:36.00},
    {nome:'Sashimi de salmão', dep:'sus', rec:'r12', part:0.07, preco:48.00}, {nome:'Cerveja long neck', dep:'sus', rec:null, part:0.07, preco:14.00, custo:5.40, prod:'p50'}
  ];

  /* ===== MOVIMENTAÇÕES DE ESTOQUE (histórico) ===== */
  db.movs = [];
  function mov(d, prod, dep, tipo, qtd, custo, origem, usuario, obs){ db.movs.push({id:'m'+(db.movs.length+1), d:d, prod:prod, dep:dep, tipo:tipo, qtd:qtd, custo:custo, origem:origem||null, usuario:usuario||'Sistema', obs:obs||''}); }
  db.notas.forEach(function(n){ if(n.status!=='lancada') return; n.itens.forEach(function(it){ var q=r3(it.qtd*it.fator); mov(n.entrada+'T09:30', it.prod, n.dep, 'entrada', q, r2(it.vProd/q), {tipo:'nf', id:n.id}, 'Renata (estoque)', 'NF '+n.numero); }); });
  /* transferências do central para as operações, consumo de produção, vendas de revenda, perdas */
  var transf = [['p01','pad',50,-6],['p01','pad',50,-3],['p21','sus',20,-11],['p21','sus',10,-4],['p39','sus',8,-4],['p39','sus',6,-1],['p14','sus',3.6,-3],['p07','pad',5,-2],['p11','res',6,-2],['p36','res',20,-8],['p37','res',12,-8],['p48','res',48,-9],['p50','sus',48,-9],['p41','sus',100,-10],['p08','pad',24,-2]];
  transf.forEach(function(t){ var p=prod(t[0]); mov(D(t[3])+'T07:15', t[0], 'cen', 'transferencia', -t[2], p.custoMedio, {tipo:'transf', para:t[1]}, 'Renata (estoque)', 'Para '+t[1]); mov(D(t[3])+'T07:15', t[0], t[1], 'transferencia', t[2], p.custoMedio, {tipo:'transf', de:'cen'}, 'Renata (estoque)', 'Do estoque central'); });
  db.producao.forEach(function(op){ if(op.status!=='concluida') return; var rec=null; db.receitas.forEach(function(r){ if(r.id===op.rec) rec=r; }); var lotes=op.qtd/rec.rend;
    rec.ing.forEach(function(g){ var p=prod(g.prod), q=LFI.converte(g.qtd,g.un,p.un)*lotes; mov(op.data+'T'+(op.fim||'08:00'), g.prod, op.dep, 'producao', -r3(q), p.custoMedio, {tipo:'op', id:op.id}, op.resp, op.num); });
    if(rec.acabado) mov(op.data+'T'+(op.fim||'08:00'), rec.acabado, op.dep, 'producao', op.qtd, null, {tipo:'op', id:op.id}, op.resp, 'Entrada de produto acabado'); });
  [['p39','sus',-3.1,-1,'consumo'],['p21','sus',-6.4,-1,'consumo'],['p14','sus',-2.2,-1,'consumo'],['p29','res',-3.4,-1,'perda','Tomate passado'],['p30','res',-1.1,-2,'perda','Alface murcha'],['p35','sus',-0.4,-3,'perda','Validade vencida'],['p11','cen',-1.5,-1,'ajuste','Ajuste de inventário'],['p48','res',-36,-1,'venda'],['p50','sus',-54,-1,'venda'],['p49','pad',-24,-1,'venda'],['p36','res',-9.6,0,'consumo'],['p20','res',-7.5,0,'consumo']].forEach(function(a){
    var p=prod(a[0]); mov(D(a[3])+'T'+(a[4]==='venda'?'22:00':'15:20'), a[0], a[1], a[4], a[2], p.custoMedio, null, a[4]==='perda'?'Chef Diego':'Sistema', a[5]||(a[4]==='venda'?'Baixa de vendas do PDV':'Consumo da cozinha')); });
  /* sobras do buffet de sábado que foram aprovadas */
  db.buffets[0].itens.forEach(function(it){
    if(it.destino==='reaproveitar'){
      var rec=null; db.receitas.forEach(function(r){ if(r.id===it.rec) rec=r; });
      var sid='sb_'+it.rec+'_bf088';
      db.produtos.push({id:sid, nome:rec.nome+' — sobra do buffet', cat:'sob', un:'kg', custoMedio:0, ultimoCusto:0, estMin:0, ncm:'', cest:'', forn:null, fornAlt:[], local:'Câmara fria 01 (0 a 4 °C)', validade:D(-1), conv:{un:'kg',fator:1}, est:{cen:0,pad:0,res:0,sus:0}, apelidos:[], ultMov:D(-2), tipo:'sobra', origem:{tipo:'buffet', id:'bf088', rec:it.rec}, contado:null, hist:[]});
      mov(D(-2)+'T23:10', sid, 'sus', 'sobra', it.pesoFinal, null, {tipo:'buffet', id:'bf088'}, 'Chef Hiro', 'Sobra aprovada (temp. '+it.temp+' °C)');
      mov(D(-1)+'T18:00', sid, 'sus', 'consumo', -it.pesoFinal, null, {tipo:'buffet', id:'bf088'}, 'Chef Hiro', 'Reaproveitada no yakimeshi / reposição');
    }
  });
  db.movs.sort(function(a,b){ return a.d<b.d?1:-1; });

  /* ===== ATIVIDADE RECENTE ===== */
  db.atividades = [
    {d:DH(0,'10:41'), tipo:'cotacao', txt:'Laticínios Serra Verde respondeu a COT-2026-031 pelo WhatsApp', ref:{tela:'compras', id:'cot031'}},
    {d:DH(0,'10:10'), tipo:'cotacao', txt:'Oriental Foods enviou planilha para a COT-2026-031', ref:{tela:'compras', id:'cot031'}},
    {d:DH(0,'09:35'), tipo:'cotacao', txt:'Distribuidora Central enviou proposta em PDF (COT-2026-031)', ref:{tela:'compras', id:'cot031'}},
    {d:DH(0,'08:20'), tipo:'cotacao', txt:'Cotação COT-2026-031 criada a partir de foto da lista', ref:{tela:'compras', id:'cot031'}},
    {d:DH(0,'07:45'), tipo:'oc', txt:'OC-2026-0122 aguardando aprovação (Verde Campo Hortifrúti)', ref:{tela:'ordens', id:'oc122'}},
    {d:DH(0,'07:40'), tipo:'producao', txt:'OP-2026-0451 concluída: 300 pães franceses', ref:{tela:'producao', id:'op451'}},
    {d:DH(-2,'23:10'), tipo:'buffet', txt:'Buffet BF-2026-088 encerrado: 43,3 kg consumidos', ref:{tela:'buffet', id:'bf088'}},
    {d:DH(-2,'09:05'), tipo:'nf', txt:'NF 000.017.552 lançada (Laticínios Serra Verde) — entrega parcial', ref:{tela:'notas', id:'nf04'}}
  ];


  /* ===== OPERAÇÕES: Padaria e Restaurante =====
     O sushi é uma categoria de produto dentro do Restaurante (mesmo CNPJ).
     Os dados acima ainda separam o sushi em 'sus'; aqui tudo é unificado no Restaurante. */
  (function unificarSushi(){
    var SUS_REC={r09:1,r10:1,r11:1,r12:1,r13:1,r14:1,r15:1,r16:1};
    db.empresas = db.empresas.filter(function(e){ return e.id!=='e3'; });
    var e2=db.empresas[1];
    e2.razao='Dourado Restaurante Ltda'; e2.fantasia='Dourado Restaurante'; e2.cnpj='45.987.321/0001-08'; e2.ie='244.556.781.119'; e2.tipo='Matriz';
    e2.regime='Lucro Presumido'; e2.impVenda=11.33; e2.pisCofins='cumulativo'; e2.sigla='DR'; e2.endereco='Av. Orosimbo Maia, 1.420 — Loja 2';
    db.departamentos = db.departamentos.filter(function(x){ return x.id!=='sus'; });
    function fix(o){ if(!o) return; if(o.empresa==='e3') o.empresa='e2'; if(o.dep==='sus') o.dep='res'; }
    db.produtos.forEach(function(p){ p.est.res=r3((p.est.res||0)+(p.est.sus||0)); delete p.est.sus; if(p.contado) fix(p.contado); });
    db.receitas.forEach(function(r){ fix(r); if(SUS_REC[r.id]) r.cat='Sushi'; });
    db.markup.res.cats['Sushi']=3.2; delete db.markup.sus;
    [db.notas, db.ordens, db.cotacoes, db.producao, db.buffets, db.contasPagar, db.movs].forEach(function(l){ l.forEach(fix); });
    db.movs.forEach(function(m){ if(m.origem){ if(m.origem.para==='sus') m.origem.para='res'; if(m.origem.de==='sus') m.origem.de='res'; } if(m.obs==='Para sus') m.obs='Para res'; });
    /* transferências internas do restaurante para o próprio restaurante deixam de existir */
    /* vendas: o sushi entra no Restaurante como categorias próprias */
    var porDia={};
    db.vendas.forEach(function(v){ var k=v.d+'|'+(v.dep==='sus'?'res':v.dep), o=porDia[k];
      if(!o){ o=porDia[k]={d:v.d, dep:v.dep==='sus'?'res':v.dep, valor:0, cats:{}, tickets:0}; }
      o.valor=r2(o.valor+v.valor); o.tickets+=v.tickets;
      for(var c in v.cats){ var nome = v.dep==='sus' ? ({'Buffet por quilo':'Sushi · buffet por quilo','Combinados':'Sushi · combinados'}[c]||c) : c; o.cats[nome]=r2((o.cats[nome]||0)+v.cats[c]); } });
    db.vendas = Object.keys(porDia).sort().map(function(k){ return porDia[k]; });
    /* mix: pesa cada parte pela participação de cada antiga operação no faturamento do restaurante */
    var tr=0, ts=0; db.vendas.forEach(function(){}); 
    var resBase=5600, susBase=7400, fr=resBase/(resBase+susBase), fs=susBase/(resBase+susBase);
    db.mixVendas.forEach(function(m){ if(m.dep==='res') m.part=r3(m.part*fr); else if(m.dep==='sus'){ m.part=r3(m.part*fs); m.dep='res'; } });
    db.atividades.forEach(function(a){ a.txt=a.txt.replace('Kaizen Sushi','Dourado Restaurante'); });
  })();

  db.seq = {nf:0, oc:122, cot:33, op:453, bf:88, cp:0, mov:db.movs.length+1};
  db.usuario = {nome:'Roberto Amaral', papel:'Proprietário', ini:'RA'};
  return db;
};

/* conversões de unidade — receita (g/ml/kg/L/un) para a unidade base do produto (kg/L/un) */
LFI.converte = function(qtd, de, para){
  de=(de||'').toLowerCase(); para=(para||'').toLowerCase();
  if(de===para) return qtd;
  var m={g:['kg',0.001], kg:['kg',1], ml:['l',0.001], l:['l',1], un:['un',1]};
  var a=m[de], b=m[para];
  if(!a||!b) return qtd;
  if(a[0]!==b[0]){ /* massa x volume: considera densidade 1 (líquidos culinários) */ return qtd*a[1]/b[1]; }
  return qtd*a[1]/b[1];
};
})();
