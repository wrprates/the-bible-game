// Missions inspired by biblical narratives.
//
// Tile legend (each char = 32px tile):
//   .  empty
//   #  solid ground/brick
//   =  floating platform
//   ^  spike/hazard
//   ~  water/sea hazard
//   S  scroll (collectible — indexed left→right, top→bottom)
//   E  enemy spawn
//   B  boss spawn (David's mission)
//   F  sling pickup (David's mission — unlocks the projectile attack)
//   P  player spawn (horizontal position only; Y is clamped to ground)
//   G  flagpole marker (non-solid; the column of G tiles renders as the pole)
//
// Map layout: 17 rows × 60 cols. A tall G column at col 50 marks the goal;
// cols 50-59 on the ground row form the Mario-style safe zone that the
// player auto-walks into after touching the flag.

const TILE = 32;

const MISSIONS = [
  {
    id: "jonas",
    hero: "Jonas",
    title: "Jonas a caminho de Nínive",
    reference: "Jonas 1–3",
    intro: "Chamado por Deus para pregar em Nínive, Jonas tenta fugir. Atravesse a tempestade no ventre do grande peixe.",
    bgTop: "#1b3a6b",
    bgBottom: "#3a6ea5",
    groundColor: "#c2a878",
    accent: "#ffe27a",
    closingVerse: "\"E Jonas se levantou, e foi a Nínive, conforme a palavra do Senhor.\" — Jonas 3:3",
    scrolls: [
      {
        title: "A fuga para Társis",
        verse: "\"Mas Jonas se levantou para fugir da presença do Senhor para Társis.\" — Jonas 1:3",
        context: "Em vez de obedecer, Jonas embarca rumo ao extremo oposto. Não há como esconder-se de Deus."
      },
      {
        title: "A tempestade",
        verse: "\"Mas o Senhor lançou ao mar um grande vento.\" — Jonas 1:4",
        context: "A tempestade não é castigo aleatório: é chamado à consciência. Os marinheiros pagãos oram enquanto Jonas dorme."
      },
      {
        title: "Nínive se arrepende",
        verse: "\"E os homens de Nínive creram em Deus... desde o maior até ao menor.\" — Jonas 3:5",
        context: "A mensagem de juízo gera arrependimento coletivo, mostrando a misericórdia de Deus mesmo a povos estrangeiros."
      },
      {
        title: "O profeta e a cabaça",
        verse: "\"Teria eu pena de Nínive... em que há mais de cento e vinte mil homens?\" — Jonas 4:11",
        context: "O livro termina com uma pergunta. A compaixão de Deus alcança muito além do que o profeta estava disposto a aceitar."
      }
    ],
    quiz: {
      question: "Para onde Jonas tentou fugir em vez de ir a Nínive?",
      options: ["Jerusalém", "Társis", "Babilônia"],
      correct: 1,
      explain: "Társis (provavelmente no extremo ocidental do Mediterrâneo) era o oposto geográfico de Nínive. Jonas não fugia de um lugar — fugia da presença do Senhor (Jn 1:3)."
    },
    map: [
      "............................................................",
      "............................................................",
      "............................................................",
      "............................................................",
      ".......S.............S..............S...........S.G.........",
      ".....=====.........=====..........=====......=====G.........",
      "..................................................G.........",
      "..................................................G.........",
      "..................................................G.........",
      ".....E....................................E.......G.........",
      "##############....................##########################",
      "##############~~~~~~~~~~~~~~~~~~~~##########################",
      "##############~~~~~~~~~~~~~~~~~~~~##########################",
      "##############~~~~~~~~~~~~~~~~~~~~##########################",
      "##############~~~~~~~~~~~~~~~~~~~~##########################",
      "##############~~~~~~~~~~~~~~~~~~~~##########################",
      "P#############~~~~~~~~~~~~~~~~~~~~##########################"
    ],
    platforms: [
      {
        x: 15 * TILE, y: 10 * TILE - 4,
        w: 104, h: 30,
        axis: "x", speed: 0.9,
        min: 14 * TILE, max: 34 * TILE - 104,
        theme: "whale",
        trigger: {
          title: "Engolido pelo grande peixe",
          verse: "\"Preparou, pois, o Senhor um grande peixe, para que tragasse a Jonas.\" — Jonas 1:17",
          context: "Três dias no ventre do peixe tornam-se sinal profético — citado por Jesus em Mateus 12:40 como figura da sua morte e ressurreição."
        }
      }
    ]
  },

  {
    id: "davi",
    hero: "Davi",
    title: "Davi contra Golias",
    reference: "1 Samuel 17",
    intro: "No Vale de Elá, um jovem pastor enfrenta um gigante filisteu. Recolha a funda no caminho — só ela derrota Golias.",
    bgTop: "#6b4a2a",
    bgBottom: "#a77b4a",
    groundColor: "#8a6a3c",
    accent: "#ffe27a",
    closingVerse: "\"Tu vens a mim com espada... porém eu venho a ti em nome do Senhor dos Exércitos.\" — 1 Samuel 17:45",
    scrolls: [
      {
        title: "O pastor no acampamento",
        verse: "\"Teu servo apascentava as ovelhas de seu pai.\" — 1 Samuel 17:34",
        context: "Davi não era soldado treinado. A coragem nasce da experiência de proteger o rebanho contra leões e ursos."
      },
      {
        title: "Cinco pedras lisas",
        verse: "\"E tomou cinco seixos lisos do ribeiro.\" — 1 Samuel 17:40",
        context: "Davi recusa a armadura de Saul. A vitória não depende do arsenal, mas da confiança."
      },
      {
        title: "A batalha é do Senhor",
        verse: "\"O Senhor não livra com espada, nem com lança; porque do Senhor é a guerra.\" — 1 Samuel 17:47",
        context: "O confronto é teológico antes de ser militar: quem provoca o povo de Deus provoca o próprio Deus."
      }
    ],
    quiz: {
      question: "Quantas pedras lisas Davi recolheu do ribeiro?",
      options: ["Três", "Cinco", "Sete"],
      correct: 1,
      explain: "1 Samuel 17:40 fala em cinco seixos lisos. Uma leitura rabínica sugere que as quatro sobrando seriam para os quatro irmãos de Golias (cf. 2 Sm 21:15-22)."
    },
    map: [
      "............................................................",
      "............................................................",
      "............................................................",
      "............................................................",
      ".....S.................S....................S.....G.........",
      "...=====.............=====................=====...G.........",
      "..................................................G.........",
      "..................................................G.........",
      "..................................................G.........",
      "...F...L....H.......R....U.....................B..G.........",
      "############################################################",
      "############################################################",
      "############################################################",
      "############################################################",
      "############################################################",
      "############################################################",
      "P###########################################################"
    ],
    platforms: [
      {
        x: 18 * TILE, y: 7 * TILE,
        w: 38, h: 22,
        axis: "y", speed: 0.9,
        min: 4 * TILE, max: 8 * TILE,
        theme: "boulder"
      },
      {
        x: 30 * TILE, y: 6 * TILE,
        w: 38, h: 22,
        axis: "y", speed: 1.1,
        min: 4 * TILE, max: 8 * TILE,
        theme: "boulder"
      }
    ]
  },

  {
    id: "mar",
    hero: "Moisés",
    title: "A travessia do mar",
    reference: "Êxodo 14–15",
    intro: "Preso entre o exército do Faraó e o mar, Moisés estende a vara. As águas se abrem e formam um muro — corra antes que se fechem atrás.",
    bgTop: "#0a2e5c",
    bgBottom: "#3a7aa5",
    groundColor: "#5a4a30",
    accent: "#e0f0ff",
    closingVerse: "\"Cantarei ao Senhor, porque triunfou gloriosamente.\" — Êxodo 15:1",
    scrolls: [
      {
        title: "\"Não temais\"",
        verse: "\"Não temais; estai quietos, e vede o livramento do Senhor.\" — Êxodo 14:13",
        context: "Moisés fala ao povo encurralado entre o mar e o exército. A fé, neste momento, é ficar firme — não fugir, não lutar: confiar."
      },
      {
        title: "A vara estendida",
        verse: "\"Levanta a tua vara, e estende a tua mão sobre o mar.\" — Êxodo 14:16",
        context: "A vara, símbolo do chamado de Moisés (Êx 4), torna-se instrumento da libertação. O milagre responde ao gesto humano de obediência."
      },
      {
        title: "Águas por muro",
        verse: "\"E as águas lhes foram por muro à sua direita e à sua esquerda.\" — Êxodo 14:22",
        context: "A imagem dos muros de água virou figura fundante de salvação em toda a Escritura — a passagem do cativeiro para a liberdade."
      },
      {
        title: "Cântico do mar",
        verse: "\"Então cantou Moisés e os filhos de Israel este cântico ao Senhor.\" — Êxodo 15:1",
        context: "O primeiro cântico coletivo do povo livre. Miriã guia as mulheres com pandeiros. A libertação vira liturgia."
      }
    ],
    quiz: {
      question: "O que aconteceu com o exército egípcio que perseguia Israel?",
      options: ["Recuou e voltou ao Egito", "Afogou-se no mar", "Converteu-se ao Senhor"],
      correct: 1,
      explain: "Êx 14:28 — \"as águas cobriram os carros e os cavaleiros... nem um só deles escapou\". A mesma água que libertou Israel julgou o opressor."
    },
    map: [
      "................................................................................",
      "................................................................................",
      "................................................................................",
      "................................................................................",
      ".....S...................S...................S..............S.........G.........",
      "...=====...............=====...............=====..........=====.......G.........",
      "......................................................................G.........",
      "......................................................................G.........",
      "......................................................................G.........",
      "............C.................C...................C...................G.........",
      "################################################################################",
      "################################################################################",
      "################################################################################",
      "################################################################################",
      "################################################################################",
      "################################################################################",
      "P###############################################################################"
    ],
    platforms: []
  },

  {
    id: "moises",
    hero: "Moisés",
    title: "A travessia do deserto",
    reference: "Êxodo 14–16",
    intro: "Do Mar Vermelho ao maná no deserto. Desvie dos espinhos, recolha o maná que cai dos céus e alcance a terra prometida.",
    bgTop: "#b07a3a",
    bgBottom: "#e3b070",
    groundColor: "#c4883d",
    accent: "#ffe27a",
    closingVerse: "\"E o Senhor ia adiante deles... para os guiar pelo caminho.\" — Êxodo 13:21",
    scrolls: [
      {
        title: "Mar Vermelho",
        verse: "\"E os filhos de Israel entraram pelo meio do mar em seco.\" — Êxodo 14:22",
        context: "A libertação é retratada como novo começo. O povo atravessa do cativeiro para a vida com Deus."
      },
      {
        title: "Águas amargas de Mara",
        verse: "\"Lançou-o nas águas, e as águas se tornaram doces.\" — Êxodo 15:25",
        context: "Logo após o milagre, surge a sede. O deserto ensina dependência diária."
      },
      {
        title: "O maná",
        verse: "\"Eis que vos farei chover pão dos céus.\" — Êxodo 16:4",
        context: "Cada família recolhia apenas o necessário para o dia — lição sobre provisão e confiança."
      },
      {
        title: "Água da rocha",
        verse: "\"Ferirás a rocha, e dela sairão águas.\" — Êxodo 17:6",
        context: "Paulo relê esse episódio como símbolo de Cristo em 1 Coríntios 10:4."
      }
    ],
    quiz: {
      question: "Com que frequência o povo devia recolher o maná?",
      options: ["Uma vez por semana", "A cada dia", "Só em dias de culto"],
      correct: 1,
      explain: "Cada dia, na medida da necessidade (Êx 16:4). No sexto dia recolhiam em dobro, para guardar sábado — o maná ensinava dependência diária da provisão de Deus."
    },
    map: [
      "............................................................",
      "............................................................",
      "............................................................",
      "............................................................",
      "...S........S........S...............S............G.........",
      ".=====....=====....=====...........=====..........G.........",
      "..................................................G.........",
      "..................................................G.........",
      "..................................................G.........",
      ".....E............E..............E................G.........",
      "##########^^##########^^##########^^########################",
      "############################################################",
      "############################################################",
      "############################################################",
      "############################################################",
      "############################################################",
      "P###########################################################"
    ],
    platforms: [
      {
        x: 10 * TILE, y: 6 * TILE,
        w: 64, h: 22,
        axis: "x", speed: 0.65,
        min: 7 * TILE, max: 32 * TILE,
        theme: "cloud"
      }
    ]
  },

  {
    id: "sinai",
    hero: "Moisés",
    title: "Moisés no Sinai",
    reference: "Êxodo 19–34",
    intro: "Suba ao Sinai, receba as tábuas. Desça e encontre o bezerro de ouro no vale — as tábuas se quebram. Suba o monte de novo: Deus renova o pacto.",
    bgTop: "#3a2a50",
    bgBottom: "#8a6a92",
    groundColor: "#8a6a46",
    accent: "#f0d070",
    closingVerse: "\"A lei foi dada por meio de Moisés; a graça e a verdade vieram por Jesus Cristo.\" — João 1:17",
    scrolls: [
      {
        title: "As tábuas do testemunho",
        verse: "\"Deu-lhe as duas tábuas do testemunho... escritas pelo dedo de Deus.\" — Êxodo 31:18",
        context: "Os Dez Mandamentos foram gravados diretamente pelo dedo de Deus — o texto mais imediato e pessoal da revelação escrita."
      },
      {
        title: "As novas tábuas",
        verse: "\"Lavra duas tábuas de pedra, como as primeiras.\" — Êxodo 34:1",
        context: "A graça após a falha. Moisés agora lavra as pedras; Deus reescreve as palavras (34:28) — cooperação humana no pacto renovado."
      },
      {
        title: "Santificação do povo",
        verse: "\"Santifica-os hoje e amanhã, e lavem eles os seus vestidos.\" — Êxodo 19:10",
        context: "Três dias de consagração preparam o encontro com Deus. Santidade não é legalismo — é reverência diante de quem é Santo."
      },
      {
        title: "O bezerro de ouro",
        verse: "\"Fez dele um bezerro fundido. E disseram: 'Estes são os teus deuses, ó Israel.'\" — Êxodo 32:4",
        context: "A apostasia vem enquanto Moisés ainda recebe a Lei. Ao descer e ver a cena, ele quebra as tábuas aos pés do Sinai (32:19).",
        onCollect: "break-tablets"
      }
    ],
    quiz: {
      question: "Quem lavrou as SEGUNDAS tábuas do testemunho?",
      options: ["Deus, com o próprio dedo", "Moisés, por ordem do Senhor", "Arão, com suas mãos"],
      correct: 1,
      explain: "As primeiras foram escritas pelo dedo de Deus (Êx 31:18). Nas segundas, Moisés lavra as pedras e Deus reescreve as palavras (Êx 34:1, 28) — um quadro da cooperação na graça renovada."
    },
    map: [
      "...........................................................................",
      ".............S........................S.....................G..............",
      ".............#........................#.....................G..............",
      "............###......................###....................G..............",
      "...........#####....................#####...................G..............",
      "..........#######..................#######..................G..............",
      ".........#########................#########.................G..............",
      "........###########..............###########................G..............",
      ".......#############............#############...............G..............",
      ".NS.N.###############.NS.EB.E.N###############..............G..............",
      "###########################################################################",
      "###########################################################################",
      "###########################################################################",
      "###########################################################################",
      "###########################################################################",
      "###########################################################################",
      "P##########################################################################"
    ],
    platforms: [
      {
        // Glória do Senhor — nuvem sobre o cume do Sinai (Êx 19:20)
        x: 10 * TILE, y: 1 * TILE,
        w: 72, h: 22,
        axis: "x", speed: 0.45,
        min: 6 * TILE, max: 15 * TILE,
        theme: "cloud",
        trigger: {
          title: "A glória sobre o monte",
          verse: "\"E o Senhor desceu sobre o monte Sinai, sobre o cume do monte.\" — Êxodo 19:20",
          context: "A teofania acompanha trovões, relâmpagos, fumaça e som de trombeta (19:16-19). O povo treme ao pé do monte enquanto Moisés sobe."
        }
      }
    ]
  },

  {
    id: "fornalha",
    hero: "Sadraque, Mesaque e Abede-Nego",
    title: "A fornalha ardente",
    reference: "Daniel 3",
    intro: "Ao som da trombeta, todos se prostraram diante da estátua de Nabucodonosor. Três jovens ficaram de pé. Foram lançados no fogo — mas um quarto homem apareceu com eles.",
    bgTop: "#4a2010",
    bgBottom: "#a04020",
    groundColor: "#6a4028",
    accent: "#ffae40",
    closingVerse: "\"Bendito seja o Deus de Sadraque, Mesaque e Abede-Nego, que enviou o seu anjo.\" — Daniel 3:28",
    scrolls: [
      {
        title: "A estátua e a trombeta",
        verse: "\"Ao som da trombeta... prostrai-vos, e adorai a imagem de ouro.\" — Daniel 3:5",
        context: "A música chamava todos à idolatria coletiva. Três jovens ficaram de pé em meio à multidão ajoelhada."
      },
      {
        title: "A fé que não negocia",
        verse: "\"O nosso Deus pode nos livrar; mas se não, fica sabendo que não serviremos a teus deuses.\" — Daniel 3:17-18",
        context: "A fé não dependia do resultado do milagre. Dependia da identidade de Deus — ele é digno mesmo quando não livra."
      },
      {
        title: "Sete vezes mais aquecida",
        verse: "\"Aqueçam a fornalha sete vezes mais do que costumava se aquecer.\" — Daniel 3:19",
        context: "Nabucodonosor, furioso, superaqueceu a fornalha. Os soldados que lançaram os jovens morreram das labaredas (3:22). O fogo devorou o forte — e não tocou o fraco."
      },
      {
        title: "Nabucodonosor louva",
        verse: "\"Bendito seja o Deus de Sadraque, Mesaque e Abede-Nego, que enviou o seu anjo.\" — Daniel 3:28",
        context: "O rei pagão que acendeu a fornalha termina proclamando o Deus que o superou. A fé fiel evangeliza sem abrir a boca."
      }
    ],
    quiz: {
      question: "Quantos foram vistos andando no meio do fogo?",
      options: ["Três", "Quatro", "Sete"],
      correct: 1,
      explain: "Nabucodonosor viu QUATRO (Dn 3:25) — embora só três tivessem sido lançados. 'O aspecto do quarto é semelhante ao Filho de Deus.'"
    },
    map: [
      "............................................................",
      "............................................................",
      "............................................................",
      "............................................................",
      ".....S............S...........S...........S.......G.........",
      "...=====........=====.......=====.......=====.....G.........",
      "..................................................G.........",
      "..................................................G.........",
      "..................................................G.........",
      "..........E...........E.....A......N....N.........G.........",
      "###############################^^^^^^^^^^^^#################",
      "############################################################",
      "############################################################",
      "############################################################",
      "############################################################",
      "############################################################",
      "P###########################################################"
    ],
    platforms: []
  },

  {
    id: "leoes",
    hero: "Daniel",
    title: "Daniel na cova dos leões",
    reference: "Daniel 6",
    intro: "Os sátrapas decretam: orar a qualquer um que não seja o rei = cova dos leões. Daniel continua orando diante da janela. [B] ajoelha, [O] chama o anjo.",
    bgTop: "#2a1a3a",
    bgBottom: "#5a4a7a",
    groundColor: "#5a4a58",
    accent: "#e8d0ff",
    closingVerse: "\"Meu Deus enviou o seu anjo, e fechou a boca dos leões.\" — Daniel 6:22",
    scrolls: [
      {
        title: "Janelas abertas para Jerusalém",
        verse: "\"Três vezes no dia se punha de joelhos, e orava.\" — Daniel 6:10",
        context: "Daniel manteve a mesma disciplina de sempre — não mudou o padrão por causa do decreto. A coerência é linguagem da fé."
      },
      {
        title: "A conspiração",
        verse: "\"Todos os presidentes... acordaram que o rei estabelecesse um edito.\" — Daniel 6:7",
        context: "Os inimigos não achavam nada contra Daniel 'senão no tocante à lei do seu Deus' (6:5). A integridade irritava."
      },
      {
        title: "Lançado na cova",
        verse: "\"Tiraram a Daniel, e lançaram-no na cova dos leões.\" — Daniel 6:16",
        context: "O rei Dario, triste, não pôde revogar o próprio decreto. 'O teu Deus a quem continuamente serves, ele te livrará.'"
      },
      {
        title: "Boca dos leões fechada",
        verse: "\"O rei exultou sobremaneira... e mandou tirar a Daniel da cova.\" — Daniel 6:22-23",
        context: "De madrugada, Dario correu à cova. Daniel vivo, sem ferida. Deus responde à fé fiel mesmo na noite mais longa."
      }
    ],
    quiz: {
      question: "Com que frequência Daniel orava com as janelas abertas para Jerusalém?",
      options: ["Uma vez ao dia", "Três vezes ao dia", "Toda hora"],
      correct: 1,
      explain: "Dn 6:10 — três vezes ao dia, de joelhos, com as janelas abertas. Fidelidade pública que custou a perseguição."
    },
    map: [
      "............................................................",
      "............................................................",
      "............................................................",
      "....................................##############..........",
      ".....S..........S.......S........................#G.........",
      "...=====......=====...=====......................#G.........",
      ".................................................#G.........",
      ".................................................#G.........",
      "...............W.................................#G.........",
      "..................................S...L...L...L..#G.........",
      "######################^^########^^##########################",
      "############################################################",
      "############################################################",
      "############################################################",
      "############################################################",
      "############################################################",
      "P###########################################################"
    ],
    platforms: []
  },

  {
    id: "pedro",
    hero: "Pedro",
    title: "Pedro caminha sobre as águas",
    reference: "Mateus 14:22-33",
    intro: "Os apóstolos remavam contra o vento na quarta vigília. Jesus aparece sobre o mar revolto. Pegue o ícone da oração no barco — só a fé acalma as ondas e leva ao encontro do Mestre.",
    bgTop: "#10203a",
    bgBottom: "#3a5a8a",
    groundColor: "#5a3a1a",
    accent: "#ffe27a",
    closingVerse: "\"Verdadeiramente tu és o Filho de Deus.\" — Mateus 14:33",
    scrolls: [
      {
        title: "Vento contrário",
        verse: "\"O barco estava já no meio do mar, açoitado pelas ondas; porque o vento era contrário.\" — Mateus 14:24",
        context: "Jesus tinha mandado partir. A obediência levou os discípulos ao meio da tempestade — o caminho do Senhor às vezes atravessa o vento, não o evita."
      },
      {
        title: "Sobre o mar",
        verse: "\"Na quarta vigília da noite, foi Jesus ter com eles, andando sobre o mar.\" — Mateus 14:25",
        context: "Por volta das 3h da manhã. O Senhor pisa o caos primordial — o mar — como quem pisa terra firme. A criação reconhece o Criador."
      },
      {
        title: "Manda-me ir",
        verse: "\"Senhor, se és tu, manda-me ir ter contigo por sobre as águas.\" — Mateus 14:28",
        context: "Pedro não improvisa. Pede a ordem. Fé verdadeira não inventa caminho — responde ao chamado do Mestre."
      },
      {
        title: "A mão estendida",
        verse: "\"Logo Jesus, estendendo a mão, segurou-o, e disse-lhe: Homem de pequena fé, por que duvidaste?\" — Mateus 14:31",
        context: "Pedro afundou ao olhar para o vento. Antes da repreensão, vem o socorro: a graça resgata mesmo a fé pequena."
      }
    ],
    quiz: {
      question: "Por que Pedro começou a afundar?",
      options: ["Cansou de caminhar sobre o mar", "Viu o vento forte e teve medo", "Foi atingido por uma onda gigante"],
      correct: 1,
      explain: "Mt 14:30 — \"Vendo o vento forte, teve medo.\" A fé olha para Jesus; o medo olha para a circunstância — e quem olha para a tempestade afunda nela."
    },
    map: [
      "............................................................",
      "............................................................",
      "............................................................",
      "............................................................",
      ".....S...........S...............S...........S....G.........",
      "...=====.......=====...........=====.......=====..G.........",
      "..................................................G.........",
      "..................................................G.........",
      "..................................................G.........",
      "..N.N.N.NYNN...................................J..G.........",
      "############~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~##########",
      "############~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~##########",
      "############~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~##########",
      "############~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~##########",
      "############~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~##########",
      "############~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~##########",
      "P###########~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~##########"
    ],
    platforms: []
  },

  {
    id: "paulo",
    hero: "Paulo",
    title: "Viagens missionárias de Paulo",
    reference: "Atos 13–28; 2 Coríntios 11",
    intro: "Naufrágios, perseguições, prisões — e ainda assim, pregar o evangelho. Cruze o Mediterrâneo no navio e chegue a Roma.",
    bgTop: "#2a4a6b",
    bgBottom: "#4a88b0",
    groundColor: "#6a5a3c",
    accent: "#ffe27a",
    closingVerse: "\"Combati o bom combate, acabei a carreira, guardei a fé.\" — 2 Timóteo 4:7",
    scrolls: [
      {
        title: "Naufrágios",
        verse: "\"Três vezes sofri naufrágio, uma noite e um dia passei no abismo.\" — 2 Coríntios 11:25",
        context: "Paulo viajou mais de 15.000 km. O Mediterrâneo era tão perigoso quanto estratégico para o evangelho."
      },
      {
        title: "Cárcere em Filipos",
        verse: "\"Por volta da meia-noite, Paulo e Silas oravam e cantavam louvores.\" — Atos 16:25",
        context: "A alegria no cárcere abre a porta — literalmente — para a conversão do carcereiro."
      },
      {
        title: "Areópago em Atenas",
        verse: "\"O Deus que fez o mundo... não habita em templos feitos por mãos de homens.\" — Atos 17:24",
        context: "Paulo dialoga com filósofos gregos, citando poetas locais — modelo de apologética contextualizada."
      },
      {
        title: "Carta aos Romanos",
        verse: "\"Não me envergonho do evangelho de Cristo, pois é o poder de Deus para salvação.\" — Romanos 1:16",
        context: "Escrita em Corinto por volta de 57 d.C., é a mais teológica de suas cartas."
      },
      {
        title: "Prisão em Roma",
        verse: "\"Pregando o reino de Deus... sem impedimento algum.\" — Atos 28:31",
        context: "Atos termina com Paulo preso, mas livre para pregar. A missão continua mesmo sob correntes."
      }
    ],
    quiz: {
      question: "Em qual cidade Paulo e Silas cantavam louvores no cárcere à meia-noite?",
      options: ["Corinto", "Filipos", "Éfeso"],
      correct: 1,
      explain: "Filipos (Atos 16:25). Um terremoto abriu as portas, mas nenhum preso fugiu — o carcereiro, impressionado, se converteu com toda a sua casa."
    },
    map: [
      "............................................................",
      "............................................................",
      "............................................................",
      "............................................................",
      ".....S.......S.......S.......S............S.......G.........",
      "...=====...=====...=====...=====........=====.....G.........",
      "..................................................G.........",
      "..................................................G.........",
      "..................................................G.........",
      ".....E..........E..........E..........E...........G.........",
      "###############....................#########################",
      "###############~~~~~~~~~~~~~~~~~~~~#########################",
      "###############~~~~~~~~~~~~~~~~~~~~#########################",
      "###############~~~~~~~~~~~~~~~~~~~~#########################",
      "###############~~~~~~~~~~~~~~~~~~~~#########################",
      "###############~~~~~~~~~~~~~~~~~~~~#########################",
      "P##############~~~~~~~~~~~~~~~~~~~~#########################"
    ],
    platforms: [
      {
        x: 17 * TILE, y: 10 * TILE - 2,
        w: 96, h: 20,
        axis: "x", speed: 0.75,
        min: 15 * TILE, max: 34 * TILE - 96,
        theme: "ship",
        trigger: {
          title: "Rumo a Roma — pelo mar",
          verse: "\"Quando foi determinado que havíamos de navegar para a Itália...\" — Atos 27:1",
          context: "Paulo viaja como prisioneiro, mas a viagem vira oportunidade missionária. O naufrágio em Malta converte uma ilha inteira (Atos 28:1-10)."
        }
      }
    ]
  }
];
