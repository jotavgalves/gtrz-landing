-- Replace the generic empty-events placeholder with a deliberate bilingual agenda state.
-- Existing event status labels and event-card copy remain untouched.

UPDATE section_localizations
SET content_json = json_set(
  COALESCE(content_json, '{}'),
  '$.eyebrow', 'Agenda GTRZ',
  '$.title', 'EVENTOS.',
  '$.body', 'Datas, cidades, line-up e ingressos entram aqui quando cada edição estiver confirmada.',
  '$.emptyTitle', 'SEM DATA PUBLICADA. POR ENQUANTO.',
  '$.emptyBody', 'A próxima edição só entra na agenda quando cidade, data e operação estiverem fechadas. Até lá, acompanhe os anúncios da GTRZ.',
  '$.cta', 'Acompanhar no Instagram',
  '$.secondaryCta', 'Falar com a GTRZ'
)
WHERE section_id = 'home_events' AND locale = 'pt-BR';

UPDATE section_localizations
SET content_json = json_set(
  COALESCE(content_json, '{}'),
  '$.eyebrow', 'Agenda GTRZ',
  '$.title', 'EVENTOS.',
  '$.body', 'Fechas, ciudades, line-up y entradas aparecen aquí cuando cada edición está confirmada.',
  '$.emptyTitle', 'SIN FECHA PUBLICADA. POR AHORA.',
  '$.emptyBody', 'La próxima edición solo entra en agenda cuando ciudad, fecha y operación están cerradas. Hasta entonces, acompaña los anuncios de GTRZ.',
  '$.cta', 'Seguir en Instagram',
  '$.secondaryCta', 'Hablar con GTRZ'
)
WHERE section_id = 'home_events' AND locale = 'es';
