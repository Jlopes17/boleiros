(() => {
  'use strict';

  const club = (id, name, state, div, rep, group = null) => ({
    id, name, country: 'Brasil', state, div, rep, group
  });

  const serieA = [
    club('palmeiras','Palmeiras','SP','br-a',89), club('flamengo','Flamengo','RJ','br-a',89),
    club('fluminense','Fluminense','RJ','br-a',84), club('sao-paulo','São Paulo','SP','br-a',84),
    club('bahia','Bahia','BA','br-a',82), club('athletico-pr','Athletico Paranaense','PR','br-a',82),
    club('coritiba','Coritiba','PR','br-a',77), club('bragantino','Red Bull Bragantino','SP','br-a',80),
    club('botafogo','Botafogo','RJ','br-a',85), club('vasco','Vasco da Gama','RJ','br-a',81),
    club('vitoria','Vitória','BA','br-a',77), club('atletico-mg','Atlético Mineiro','MG','br-a',85),
    club('gremio','Grêmio','RS','br-a',83), club('internacional','Internacional','RS','br-a',83),
    club('santos','Santos','SP','br-a',82), club('cruzeiro','Cruzeiro','MG','br-a',85),
    club('corinthians','Corinthians','SP','br-a',84), club('mirassol','Mirassol','SP','br-a',75),
    club('remo','Remo','PA','br-a',72), club('chapecoense','Chapecoense','SC','br-a',72)
  ];

  const serieB = [
    club('botafogo-sp','Botafogo-SP','SP','br-b',68), club('novorizontino','Novorizontino','SP','br-b',72),
    club('ponte-preta','Ponte Preta','SP','br-b',70), club('sao-bernardo','São Bernardo','SP','br-b',70),
    club('america-mg','América-MG','MG','br-b',73), club('athletic-mg','Athletic Club','MG','br-b',68),
    club('londrina','Londrina','PR','br-b',67), club('operario-pr','Operário-PR','PR','br-b',69),
    club('ceara','Ceará','CE','br-b',74), club('goias','Goiás','GO','br-b',72),
    club('avai','Avaí','SC','br-b',70), club('nautico','Náutico','PE','br-b',69),
    club('cuiaba','Cuiabá','MT','br-b',71), club('vila-nova','Vila Nova','GO','br-b',70),
    club('fortaleza','Fortaleza','CE','br-b',77), club('atletico-go','Atlético-GO','GO','br-b',71),
    club('criciuma','Criciúma','SC','br-b',71), club('sport','Sport','PE','br-b',75),
    club('crb','CRB','AL','br-b',69), club('juventude','Juventude','RS','br-b',71)
  ];

  const serieC = [
    club('amazonas','Amazonas','AM','br-c',65), club('ypiranga-rs','Ypiranga-RS','RS','br-c',64),
    club('brusque','Brusque','SC','br-c',65), club('maringa','Maringá','PR','br-c',65),
    club('botafogo-pb','Botafogo-PB','PB','br-c',64), club('guarani','Guarani','SP','br-c',68),
    club('floresta','Floresta','CE','br-c',61), club('paysandu','Paysandu','PA','br-c',68),
    club('barra-sc','Barra-SC','SC','br-c',61), club('inter-limeira','Inter de Limeira','SP','br-c',63),
    club('santa-cruz','Santa Cruz','PE','br-c',68), club('figueirense','Figueirense','SC','br-c',67),
    club('ituano','Ituano','SP','br-c',65), club('caxias','Caxias','RS','br-c',64),
    club('confianca','Confiança','SE','br-c',63), club('volta-redonda','Volta Redonda','RJ','br-c',66),
    club('itabaiana','Itabaiana','SE','br-c',60), club('ferroviaria','Ferroviária','SP','br-c',65),
    club('maranhao','Maranhão','MA','br-c',61), club('anapolis','Anápolis','GO','br-c',61)
  ];

  const d = (group, entries) => entries.map(([id, name, state, rep = 58]) => club(id, name, state, 'br-d', rep, group));
  const serieD = [
    ...d('A1', [['nacional-am','Nacional-AM','AM',61],['manaus','Manaus','AM',62],['manauara','Manauara','AM',62],['gas','GAS','RR',54],['monte-roraima','Monte Roraima','RR',54],['sao-raimundo-rr','São Raimundo-RR','RR',56]]),
    ...d('A2', [['independencia-ac','Independência-AC','AC'],['galvez','Galvez','AC'],['humaita','Humaitá','AC'],['porto-velho','Porto Velho','RO',60],['guapore','Guaporé','RO',59],['araguaina','Araguaína','TO',59]]),
    ...d('A3', [['gama','Gama','DF',63],['brasiliense','Brasiliense','DF',64],['luverdense','Luverdense','MT',60],['primavera-mt','Primavera-MT','MT',59],['inhumas','Inhumas','GO',58],['aparecidense','Aparecidense','GO',61]]),
    ...d('A4', [['capital-df','Capital-DF','DF',60],['ceilandia','Ceilândia','DF',60],['mixto','Mixto','MT',60],['operario-mt','Operário-MT','MT',58],['uniao-mt','União-MT','MT',58],['goiatuba','Goiatuba','GO',60]]),
    ...d('A5', [['trem','Trem','AP',59],['oratorio','Oratório','AP',55],['tuna-luso','Tuna Luso','PA',60],['aguia-maraba','Águia de Marabá','PA',61],['tocantinopolis','Tocantinópolis','TO',59],['imperatriz','Imperatriz','MA',60]]),
    ...d('A6', [['sampaio-correa','Sampaio Corrêa','MA',65],['moto-club','Moto Club','MA',62],['iape','IAPE','MA',56],['maracana','Maracanã','CE',59],['iguatu','Iguatu','CE',61],['parnahyba','Parnahyba','PI',59]]),
    ...d('A7', [['ferroviario','Ferroviário','CE',63],['tirol','Tirol','CE',57],['atletico-ce','Atlético-CE','CE',59],['altos','Altos','PI',61],['piaui','Piauí','PI',58],['fluminense-pi','Fluminense-PI','PI',59]]),
    ...d('A8', [['abc','ABC','RN',65],['america-rn','América-RN','RN',64],['laguna','Laguna','RN',56],['sousa','Sousa','PB',61],['maguary','Maguary','PE',59],['central','Central','PE',61]]),
    ...d('A9', [['retro','Retrô','PE',62],['decisao','Decisão','PE',56],['serra-branca','Serra Branca','PB',59],['treze','Treze','PB',63],['lagarto','Lagarto','SE',57],['sergipe','Sergipe','SE',62]]),
    ...d('A10', [['asa','ASA','AL',62],['csa','CSA','AL',65],['cse','CSE','AL',58],['jacuipense','Jacuipense','BA',60],['atletico-ba','Atlético-BA','BA',58],['juazeirense','Juazeirense','BA',60]]),
    ...d('A11', [['uberlandia','Uberlândia','MG',61],['betim','Betim','MG',59],['crac','CRAC','GO',60],['abecat','ABECAT','GO',57],['operario-ms','Operário-MS','MS',58],['ivinhema','Ivinhema','MS',57]]),
    ...d('A12', [['porto-ba','Porto-BA','BA',57],['rio-branco-es','Rio Branco-ES','ES',60],['vitoria-es','Vitória-ES','ES',60],['real-noroeste','Real Noroeste','ES',59],['tombense','Tombense','MG',63],['democrata-gv','Democrata-GV','MG',59]]),
    ...d('A13', [['madureira','Madureira','RJ',61],['portuguesa-rj','Portuguesa-RJ','RJ',61],['america-rj','America-RJ','RJ',62],['portuguesa-sp','Portuguesa-SP','SP',64],['agua-santa','Água Santa','SP',62],['pouso-alegre','Pouso Alegre','MG',60]]),
    ...d('A14', [['nova-iguacu','Nova Iguaçu','RJ',62],['sampaio-correa-rj','Sampaio Corrêa-RJ','RJ',59],['marica','Maricá','RJ',59],['xv-piracicaba','XV de Piracicaba','SP',63],['noroeste','Noroeste','SP',61],['velo-clube','Velo Clube','SP',60]]),
    ...d('A15', [['cianorte','Cianorte','PR',61],['fc-cascavel','FC Cascavel','PR',61],['santa-catarina','Santa Catarina','SC',59],['joinville','Joinville','SC',63],['guarany-bage','Guarany de Bagé','RS',59],['sao-luiz','São Luiz','RS',60]]),
    ...d('A16', [['blumenau','Blumenau','SC',58],['marcilio-dias','Marcílio Dias','SC',61],['sao-joseense','São Joseense','PR',58],['azuriz','Azuriz','PR',60],['sao-jose-rs','São José-RS','RS',61],['brasil-pelotas','Brasil de Pelotas','RS',62]])
  ];

  window.BOLEIROS_DB = {
    version: 'br-2026.1',
    season: 2026,
    updatedAt: '2026-06-25',
    sourceLabel: 'CBF 2026',
    clubs: [...serieA, ...serieB, ...serieC, ...serieD],
    counts: { 'br-a': 20, 'br-b': 20, 'br-c': 20, 'br-d': 96 }
  };
})();
