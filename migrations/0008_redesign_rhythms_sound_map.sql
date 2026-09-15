-- Expand the Home rhythms section into four editable curatorial groups.
-- Keep a complete rhythm inventory in `items` so the generic Control editor remains useful.

UPDATE section_localizations
SET content_json = json_set(
  COALESCE(content_json, '{}'),
  '$.eyebrow', 'Curadoria de pista',
  '$.title', 'NÃO EXISTE UMA ÚNICA PISTA LATINA.',
  '$.body', 'A GTRZ cruza clássicos, urbano, Caribe, sons colombianos, Brasil e novas cenas sem transformar a noite numa playlist aleatória. A curadoria acompanha o público, o momento e a energia da pista.',
  '$.manifesto', 'Cada ritmo entra com função. Cada transição sustenta a noite.',
  '$.group1Title', 'Urbano latino',
  '$.group1Body', 'Peso, refrão e pressão de pista.',
  '$.group1Items', json('["Reggaeton","Dembow","Perreo","Latin Trap","RKT","Cachengue"]'),
  '$.group2Title', 'Caribe & clássicos',
  '$.group2Body', 'Dança, memória e conexão.',
  '$.group2Items', json('["Salsa","Merengue","Bachata","Timba","Reparto Cubano"]'),
  '$.group3Title', 'Colômbia & tropical',
  '$.group3Body', 'Percussão, cor e identidade popular.',
  '$.group3Items', json('["Cumbia","Vallenato","Champeta","Guaracha"]'),
  '$.group4Title', 'Brasil & crossover',
  '$.group4Body', 'Pontes com o público local e novas misturas.',
  '$.group4Items', json('["Funk","Pagodão","Latin Pop","Afro-Latin","House Latino","Urban Mix"]'),
  '$.items', json('["Reggaeton","Dembow","Perreo","Latin Trap","RKT","Cachengue","Salsa","Merengue","Bachata","Timba","Reparto Cubano","Cumbia","Vallenato","Champeta","Guaracha","Funk","Pagodão","Latin Pop","Afro-Latin","House Latino","Urban Mix"]'),
  '$.footerLabel', 'CURADORIA, NÃO PLAYLIST.',
  '$.countLabel', 'REFERÊNCIAS DE PISTA'
)
WHERE section_id = 'home_rhythms' AND locale = 'pt-BR';

UPDATE section_localizations
SET content_json = json_set(
  COALESCE(content_json, '{}'),
  '$.eyebrow', 'Curaduría de pista',
  '$.title', 'NO EXISTE UNA SOLA PISTA LATINA.',
  '$.body', 'GTRZ cruza clásicos, urbano, Caribe, sonidos colombianos, Brasil y nuevas escenas sin convertir la noche en una playlist aleatoria. La curaduría sigue al público, el momento y la energía de la pista.',
  '$.manifesto', 'Cada ritmo entra con una función. Cada transición sostiene la noche.',
  '$.group1Title', 'Urbano latino',
  '$.group1Body', 'Peso, coros y presión de pista.',
  '$.group1Items', json('["Reggaeton","Dembow","Perreo","Latin Trap","RKT","Cachengue"]'),
  '$.group2Title', 'Caribe & clásicos',
  '$.group2Body', 'Baile, memoria y conexión.',
  '$.group2Items', json('["Salsa","Merengue","Bachata","Timba","Reparto Cubano"]'),
  '$.group3Title', 'Colombia & tropical',
  '$.group3Body', 'Percusión, color e identidad popular.',
  '$.group3Items', json('["Cumbia","Vallenato","Champeta","Guaracha"]'),
  '$.group4Title', 'Brasil & crossover',
  '$.group4Body', 'Puentes con el público local y nuevas mezclas.',
  '$.group4Items', json('["Funk","Pagodão","Latin Pop","Afro-Latin","House Latino","Urban Mix"]'),
  '$.items', json('["Reggaeton","Dembow","Perreo","Latin Trap","RKT","Cachengue","Salsa","Merengue","Bachata","Timba","Reparto Cubano","Cumbia","Vallenato","Champeta","Guaracha","Funk","Pagodão","Latin Pop","Afro-Latin","House Latino","Urban Mix"]'),
  '$.footerLabel', 'CURADURÍA, NO PLAYLIST.',
  '$.countLabel', 'REFERENCIAS DE PISTA'
)
WHERE section_id = 'home_rhythms' AND locale = 'es';
