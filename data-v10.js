window.BoleirosData = (() => {
  const divisions = {
    'br-a': ['Brasileirão Série A', 1],
    'br-b': ['Brasileirão Série B', 2],
    'br-c': ['Brasileirão Série C', 3],
    'br-d': ['Brasileirão Série D', 4],
    'arg-a': ['Argentina Primeira', 5],
    'uru-a': ['Uruguai Primeira', 6],
    'par-a': ['Paraguai Primeira', 7],
    'col-a': ['Colômbia Primeira', 8],
    'chi-a': ['Chile Primeira', 9],
    'ecu-a': ['Equador Primeira', 10],
    'per-a': ['Peru Primeira', 11],
    'bol-a': ['Bolívia Primeira', 12],
    'ven-a': ['Venezuela Primeira', 13]
  };

  const states = {
    RJ: 'Cariocão Boleiros', SP: 'Paulistão Boleiros', MG: 'Mineiro Boleiros', RS: 'Gauchão Boleiros',
    PR: 'Paranaense Boleiros', BA: 'Baianão Boleiros', CE: 'Cearense Boleiros', PE: 'Pernambucano Boleiros',
    SC: 'Catarinense Boleiros', GO: 'Goiano Boleiros', PA: 'Paraense Boleiros', RN: 'Potiguar Boleiros',
    PB: 'Paraibano Boleiros', AM: 'Amazonense Boleiros', PI: 'Piauiense Boleiros', AL: 'Alagoano Boleiros', SE: 'Sergipano Boleiros', MT: 'Mato-Grossense Boleiros'
  };

  const teams = [
    ['fla','Flarengo RJ','Brasil','RJ','br-a',88], ['pal','Palmeyras SP','Brasil','SP','br-a',87], ['cor','Coríntia Paulista','Brasil','SP','br-a',84], ['spa','São Paolo FC','Brasil','SP','br-a',83],
    ['san','Santista Praiano','Brasil','SP','br-a',78], ['bot','Botafolgo RJ','Brasil','RJ','br-a',84], ['flu','Fluminese RJ','Brasil','RJ','br-a',83], ['vas','Vascão da Gama','Brasil','RJ','br-a',78],
    ['cam','Atlético Mineyro','Brasil','MG','br-a',84], ['cru','Cruseiro Azul','Brasil','MG','br-a',82], ['gre','Grêmio Portoalegrense','Brasil','RS','br-a',82], ['int','Internacional Sul','Brasil','RS','br-a',81],
    ['bah','Bahía Salvador','Brasil','BA','br-a',78], ['vit','Vitória da Barra','Brasil','BA','br-a',75], ['apr','Atlético Paranense','Brasil','PR','br-a',80], ['cox','Corytiba Verde','Brasil','PR','br-a',75],
    ['ame','Américo Mineyro','Brasil','MG','br-b',70], ['ago','Atlético Goianense','Brasil','GO','br-b',70], ['ava','Avaí da Ilha','Brasil','SC','br-b',68], ['bsp','Botafogo Ribeirão','Brasil','SP','br-b',67],
    ['cea','Cearense SC','Brasil','CE','br-b',71], ['crb','Regatas de Maceió','Brasil','AL','br-b',66], ['cri','Criciúma Carbono','Brasil','SC','br-b',68], ['cui','Cuiabano Dourado','Brasil','MT','br-b',69],
    ['for','Fortal City','Brasil','CE','br-b',74], ['goi','Goiás Esmeralda','Brasil','GO','br-b',69], ['juv','Juventude Serrana','Brasil','RS','br-b',68], ['nau','Náutico Recife','Brasil','PE','br-b',66],
    ['nov','Novo Horizonte FC','Brasil','SP','br-b',68], ['pon','Ponte Escura','Brasil','SP','br-b',66], ['spo','Sportivo Recife','Brasil','PE','br-b',70], ['vil','Vila Nova Goiânia','Brasil','GO','br-b',67],
    ['abc','ABC Natalense','Brasil','RN','br-c',62], ['botpb','Botafogo Paraibano','Brasil','PB','br-c',61], ['fer','Ferroviário Cearense','Brasil','CE','br-c',60], ['ope','Operário dos Trilhos','Brasil','PR','br-c',65],
    ['rem','Rei Azul Belém','Brasil','PA','br-c',66], ['sanrec','Santa Recife','Brasil','PE','br-c',63], ['ypp','Ypiranga Erechim','Brasil','RS','br-c',62], ['conf','Confiança Aracaju','Brasil','SE','br-c',60],
    ['bolfc','Boleiros FC','Brasil','SP','br-d',58], ['lus','Lusitana Capital','Brasil','SP','br-d',58], ['mad','Madureira Subúrbio','Brasil','RJ','br-d',56], ['aco','Aço do Paraíba','Brasil','RJ','br-d',57],
    ['cax','Caxias da Serra','Brasil','RS','br-d',56], ['man','Manaus Verde','Brasil','AM','br-d',55], ['alt','Altos do Piauí','Brasil','PI','br-d',54], ['pel','Brasil de Pelotas','Brasil','RS','br-d',56],
    ['boc','Bairro Juniors','Argentina','ARG','arg-a',86], ['riv','Rio da Prata','Argentina','ARG','arg-a',87], ['rac','Academia Azul','Argentina','ARG','arg-a',82], ['ind','Vermelho Avellaneda','Argentina','ARG','arg-a',81],
    ['sanlor','Santo Azulgrana','Argentina','ARG','arg-a',79], ['estlp','Estudantes da Prata','Argentina','ARG','arg-a',78], ['pen','Aurinegro Montevidéu','Uruguai','URU','uru-a',81], ['nac','Nacional Montevidéu','Uruguai','URU','uru-a',80],
    ['def','Defensor Violeta','Uruguai','URU','uru-a',70], ['cer','Cerro Azulgrana','Paraguai','PAR','par-a',77], ['oli','Olimpia Assunção','Paraguai','PAR','par-a',78], ['lib','Liberdade Capital','Paraguai','PAR','par-a',76],
    ['atn','Nacional Verde','Colômbia','COL','col-a',78], ['mil','Azuis de Bogotá','Colômbia','COL','col-a',76], ['cal','América de Cali','Colômbia','COL','col-a',75], ['col','Colo Macul','Chile','CHI','chi-a',77],
    ['uca','Católica dos Andes','Chile','CHI','chi-a',75], ['uaz','Universidade Azul','Chile','CHI','chi-a',76], ['ldu','Altitude Quito','Equador','ECU','ecu-a',75], ['idv','Independente do Vale','Equador','ECU','ecu-a',77],
    ['bar','Barcelona Guaya','Equador','ECU','ecu-a',76], ['ali','Aliança Lima','Peru','PER','per-a',74], ['uni','Universitário Crema','Peru','PER','per-a',75], ['cri2','Cristal do Rímac','Peru','PER','per-a',73],
    ['bol','Bolívar Altitude','Bolívia','BOL','bol-a',74], ['tig','Tigre das Alturas','Bolívia','BOL','bol-a',73], ['car','Caracas Capital','Venezuela','VEN','ven-a',70]
  ].map(([id,name,country,state,div,rep]) => ({ id, name, country, state, div, rep }));

  const countries = ['Brazil','Argentina','Uruguay','Colombia','Chile','Ecuador','Peru','Paraguay','Bolivia','Venezuela','Mexico','United States','Canada','Germany','France','Spain','Portugal','England','Netherlands','Italy','Croatia','Morocco','Japan','South Korea','Ghana','Senegal','Australia','Saudi Arabia','Egypt','Nigeria','South Africa','Belgium'];
  const firstNames = 'Rafael Bruno Caio Diego Felipe Guto Hugo João Kauã Léo Marcos Neto Otávio Paulo Renan Sandro Tiago Vini Wesley Yuri Zeca Facundo Santiago Nicolás Lautaro Matías Pablo Diego Sebastián Franco Carlos Andrés Miguel'.split(' ');
  const lastNames = 'Silva Souza Lima Costa Santos Rocha Moura Ribeiro Alves Gomes Castro Cardoso Nogueira Batista Duarte Teixeira Melo Araújo Fernández Rodríguez Gómez Pérez Martínez García López Morales Vargas Rojas'.split(' ');
  const positions = 'GOL ZAG ZAG LE LD VOL MC MEI PE PD ATA ATA ZAG MC MEI ATA VOL PD'.split(' ');

  return { divisions, states, teams, countries, firstNames, lastNames, positions };
})();
