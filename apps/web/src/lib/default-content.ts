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
      ['Identidade própria','Cada edição recebe direção visual e linguagem próprias.'],
      ['Brasil + Venezuela','Uma ponte real entre públicos, referências e culturas.'],
      ['Comunicação bilíngue','Português e espanhol fazem parte da experiência.'],
      ['Curadoria de pista','Line-up, ritmos e dinâmica da noite fazem parte do conceito.'],
      ['Experiência completa','Pensamos visual, entrada, bar, equipe e ambientação.'],
      ['Comunidade','Cada evento deve ser ponto de encontro, não apenas venda de ingresso.']
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
      ['Identidad propia','Cada edición recibe dirección visual y lenguaje propios.'],
      ['Brasil + Venezuela','Un puente real entre públicos, referencias y culturas.'],
      ['Comunicación bilingüe','Portugués y español forman parte de la experiencia.'],
      ['Curaduría de pista','Line-up, ritmos y dinámica de la noche forman parte del concepto.'],
      ['Experiencia completa','Pensamos visual, ingreso, bar, equipo y ambientación.'],
      ['Comunidad','Cada evento debe ser un punto de encuentro, no solo venta de entradas.']
    ]
  }
};

export function defaultContent(locale: Locale) { return content[locale]; }
