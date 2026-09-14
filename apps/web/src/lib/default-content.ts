import type { Locale } from './cms';

const content = {
  'pt-BR': {
    hero: {
      eyebrow: 'Produção · cultura · experiência',
      title: 'EXPERIÊNCIAS QUE TÊM IDENTIDADE.',
      body: 'A GTRZ produz festas e experiências culturais com linguagem própria. Nascemos na Venezuela, fomos criados por venezuelanos e hoje, no Brasil, somos construídos por venezuelanos e brasileiros.',
      originTitle: 'DUAS CULTURAS. UMA MARCA.',
      originBody: 'Nossa história cruza países, sotaques e referências. A GTRZ carrega sua origem venezuelana e cresce no Brasil com uma construção feita também por brasileiros.'
    },
    rhythms: ['Reggaeton','Dembow','Salsa','Merengue','Bachata','Latin Pop','Funk','Urban Mix'],
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
      eyebrow: 'Producción · cultura · experiencia',
      title: 'EXPERIENCIAS CON IDENTIDAD.',
      body: 'GTRZ produce fiestas y experiencias culturales con lenguaje propio. Nacimos en Venezuela, fuimos creados por venezolanos y hoy, en Brasil, somos construidos por venezolanos y brasileños.',
      originTitle: 'DOS CULTURAS. UNA MARCA.',
      originBody: 'Nuestra historia cruza países, acentos y referencias. GTRZ lleva su origen venezolano y crece en Brasil con una construcción hecha también por brasileños.'
    },
    rhythms: ['Reggaeton','Dembow','Salsa','Merengue','Bachata','Latin Pop','Funk','Urban Mix'],
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
