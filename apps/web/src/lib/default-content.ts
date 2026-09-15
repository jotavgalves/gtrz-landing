import type { Locale } from './cms';

const content = {
  'pt-BR': {
    hero: {
      eyebrow: 'Eventos latinos · curadoria · produção',
      title: 'FESTAS LATINAS COM IDENTIDADE PRÓPRIA.',
      body: 'A GTRZ produz eventos latinos com curadoria de pista, identidade visual própria e comunicação bilíngue. Nascida na Venezuela, hoje é construída no Brasil por venezuelanos e brasileiros — do conceito à última música da noite.',
      originTitle: 'VENEZUELA NA ORIGEM. BRASIL NA PISTA.',
      originBody: 'A GTRZ nasceu na Venezuela e ganhou corpo no Brasil. Essa mistura aparece na música, na comunicação, na equipe e na forma como cada evento é pensado.'
    },
    rhythms: {
      eyebrow: 'Curadoria de pista',
      title: 'NÃO EXISTE UMA ÚNICA PISTA LATINA.',
      body: 'A GTRZ cruza clássicos, urbano, Caribe, sons colombianos, Brasil e novas cenas sem transformar a noite numa playlist aleatória. A curadoria acompanha o público, o momento e a energia da pista.',
      manifesto: 'Cada ritmo entra com função. Cada transição sustenta a noite.',
      group1Title: 'Urbano latino',
      group1Body: 'Peso, refrão e pressão de pista.',
      group1Items: ['Reggaeton','Dembow','Perreo','Latin Trap','RKT','Cachengue'],
      group2Title: 'Caribe & clássicos',
      group2Body: 'Dança, memória e conexão.',
      group2Items: ['Salsa','Merengue','Bachata','Timba','Reparto Cubano'],
      group3Title: 'Colômbia & tropical',
      group3Body: 'Percussão, cor e identidade popular.',
      group3Items: ['Cumbia','Vallenato','Champeta','Guaracha'],
      group4Title: 'Brasil & crossover',
      group4Body: 'Pontes com o público local e novas misturas.',
      group4Items: ['Funk','Pagodão','Latin Pop','Afro-Latin','House Latino','Urban Mix'],
      footerLabel: 'CURADORIA, NÃO PLAYLIST.',
      countLabel: 'REFERÊNCIAS DE PISTA'
    },
    differentials: [
      {category:'PISTA',title:'Curadoria de pista',body:'O repertório acompanha o público e o momento da noite. A pista muda, e a curadoria muda junto.',featured:true},
      {category:'IDENTIDADE',title:'Cada edição tem linguagem própria',body:'Nome, direção visual, comunicação e ambientação são pensados para aquele evento — não reaproveitados como molde.',featured:true},
      {category:'COMUNICAÇÃO',title:'Latino sem rótulo único',body:'Português e espanhol convivem com naturalidade, sem reduzir um público diverso a uma única nacionalidade.'},
      {category:'OPERAÇÃO',title:'Produção do começo ao fim',body:'Equipe, entrada, bar, fornecedores, artistas e cronograma fazem parte da mesma experiência.'},
      {category:'PÚBLICO',title:'Pista multicultural',body:'Colombianos, argentinos, cubanos, venezuelanos, brasileiros e outros públicos latinos dividem a mesma noite sem precisar caber em uma única bandeira.'},
      {category:'COMUNIDADE',title:'Uma noite que dá vontade de repetir',body:'O objetivo não é só encher. É criar uma experiência que faça sentido para quem chega e dê vontade de voltar.'}
    ]
  },
  es: {
    hero: {
      eyebrow: 'Eventos latinos · curaduría · producción',
      title: 'FIESTAS LATINAS CON IDENTIDAD PROPIA.',
      body: 'GTRZ produce eventos latinos con curaduría de pista, identidad visual propia y comunicación bilingüe. Nació en Venezuela y hoy se construye en Brasil entre venezolanos y brasileños, desde el concepto hasta la última canción de la noche.',
      originTitle: 'VENEZUELA EN EL ORIGEN. BRASIL EN LA PISTA.',
      originBody: 'GTRZ nació en Venezuela y tomó forma en Brasil. Esa mezcla aparece en la música, la comunicación, el equipo y en la manera de pensar cada evento.'
    },
    rhythms: {
      eyebrow: 'Curaduría de pista',
      title: 'NO EXISTE UNA SOLA PISTA LATINA.',
      body: 'GTRZ cruza clásicos, urbano, Caribe, sonidos colombianos, Brasil y nuevas escenas sin convertir la noche en una playlist aleatoria. La curaduría sigue al público, el momento y la energía de la pista.',
      manifesto: 'Cada ritmo entra con una función. Cada transición sostiene la noche.',
      group1Title: 'Urbano latino',
      group1Body: 'Peso, coros y presión de pista.',
      group1Items: ['Reggaeton','Dembow','Perreo','Latin Trap','RKT','Cachengue'],
      group2Title: 'Caribe & clásicos',
      group2Body: 'Baile, memoria y conexión.',
      group2Items: ['Salsa','Merengue','Bachata','Timba','Reparto Cubano'],
      group3Title: 'Colombia & tropical',
      group3Body: 'Percusión, color e identidad popular.',
      group3Items: ['Cumbia','Vallenato','Champeta','Guaracha'],
      group4Title: 'Brasil & crossover',
      group4Body: 'Puentes con el público local y nuevas mezclas.',
      group4Items: ['Funk','Pagodão','Latin Pop','Afro-Latin','House Latino','Urban Mix'],
      footerLabel: 'CURADURÍA, NO PLAYLIST.',
      countLabel: 'REFERENCIAS DE PISTA'
    },
    differentials: [
      {category:'PISTA',title:'Curaduría de pista',body:'El repertorio acompaña al público y el momento de la noche. La pista cambia, y la curaduría cambia con ella.',featured:true},
      {category:'IDENTIDAD',title:'Cada edición tiene lenguaje propio',body:'Nombre, dirección visual, comunicación y ambientación se piensan para ese evento, no se reutilizan como una plantilla.',featured:true},
      {category:'COMUNICACIÓN',title:'Latino sin una sola etiqueta',body:'Portugués y español conviven con naturalidad, sin reducir a un público diverso a una sola nacionalidad.'},
      {category:'OPERACIÓN',title:'Producción de principio a fin',body:'Equipo, ingreso, bar, proveedores, artistas y cronograma forman parte de una misma experiencia.'},
      {category:'PÚBLICO',title:'Pista multicultural',body:'Colombianos, argentinos, cubanos, venezolanos, brasileños y otros públicos latinos comparten la misma noche sin tener que caber bajo una sola bandera.'},
      {category:'COMUNIDAD',title:'Una noche que dan ganas de repetir',body:'El objetivo no es solo llenar. Es crear una experiencia que tenga sentido para quien llega y dé ganas de volver.'}
    ]
  }
};

export function defaultContent(locale: Locale) { return content[locale]; }
