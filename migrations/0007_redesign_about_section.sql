-- Replace decorative counters with concrete, editable brand proof points.
-- Existing unrelated About fields are preserved.

UPDATE section_localizations
SET content_json = json_set(
  COALESCE(content_json, '{}'),
  '$.eyebrow', 'Da Venezuela para o Brasil',
  '$.title', 'A GTRZ NASCE DA PISTA.',
  '$.body1', 'A GTRZ nasceu na Venezuela e hoje é construída no Brasil por venezuelanos e brasileiros. Essa origem aparece sem fantasia: no idioma, nos ritmos, nas referências e na forma de receber quem chega.',
  '$.body2', 'Cada edição começa com uma pergunta simples: que noite vale a pena viver? A partir daí entram curadoria musical, direção visual, operação e os detalhes que fazem a festa ter nome próprio.',
  '$.note', 'NÃO REPETIMOS FÓRMULAS. CADA EDIÇÃO PRECISA TER UM MOTIVO PARA EXISTIR.',
  '$.metric1Value', 'ORIGEM LATINA REAL',
  '$.metric1Label', 'Venezuela faz parte da história da GTRZ, não de uma campanha.',
  '$.metric2Value', 'PISTA COM CURADORIA',
  '$.metric2Label', 'Reggaeton, dembow, salsa, funk e outros ritmos entram quando fazem sentido para aquela noite.',
  '$.metric3Value', 'PT + ES',
  '$.metric3Label', 'A comunicação bilíngue está no evento, no atendimento e no conteúdo.',
  '$.metric4Value', 'DO CONCEITO À OPERAÇÃO',
  '$.metric4Label', 'Identidade visual, equipe, entrada, bar e ambientação são pensados como uma experiência só.'
)
WHERE section_id = 'home_about' AND locale = 'pt-BR';

UPDATE section_localizations
SET content_json = json_set(
  COALESCE(content_json, '{}'),
  '$.eyebrow', 'De Venezuela a Brasil',
  '$.title', 'GTRZ NACE EN LA PISTA.',
  '$.body1', 'GTRZ nació en Venezuela y hoy se construye en Brasil por venezolanos y brasileños. Ese origen aparece sin disfraz: en el idioma, los ritmos, las referencias y la forma de recibir a quien llega.',
  '$.body2', 'Cada edición empieza con una pregunta simple: ¿qué noche vale la pena vivir? De ahí salen la curaduría musical, la dirección visual, la operación y los detalles que hacen que cada fiesta tenga nombre propio.',
  '$.note', 'NO REPETIMOS FÓRMULAS. CADA EDICIÓN NECESITA UNA RAZÓN PARA EXISTIR.',
  '$.metric1Value', 'ORIGEN LATINO REAL',
  '$.metric1Label', 'Venezuela forma parte de la historia de GTRZ, no de una campaña.',
  '$.metric2Value', 'PISTA CON CURADURÍA',
  '$.metric2Label', 'Reggaeton, dembow, salsa, funk y otros ritmos entran cuando tienen sentido para esa noche.',
  '$.metric3Value', 'PT + ES',
  '$.metric3Label', 'La comunicación bilingüe está en el evento, la atención y el contenido.',
  '$.metric4Value', 'DEL CONCEPTO A LA OPERACIÓN',
  '$.metric4Label', 'Identidad visual, equipo, entrada, bar y ambientación se piensan como una sola experiencia.'
)
WHERE section_id = 'home_about' AND locale = 'es';
