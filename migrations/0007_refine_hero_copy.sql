PRAGMA foreign_keys = ON;

-- Refresh the live Home hero copy without replacing unrelated CMS-managed fields.
UPDATE section_localizations
SET content_json = json_set(
  COALESCE(NULLIF(content_json, ''), '{}'),
  '$.eyebrow', 'Eventos latinos · curadoria · produção',
  '$.title', 'FESTAS LATINAS COM IDENTIDADE PRÓPRIA.',
  '$.body', 'A GTRZ produz eventos latinos com curadoria de pista, identidade visual própria e comunicação bilíngue. Nascida na Venezuela, hoje é construída no Brasil por venezuelanos e brasileiros — do conceito à última música da noite.',
  '$.originEyebrow', 'DA VENEZUELA PARA O BRASIL',
  '$.originTitle', 'VENEZUELA NA ORIGEM. BRASIL NA PISTA.',
  '$.originBody', 'A GTRZ nasceu na Venezuela e ganhou corpo no Brasil. Essa mistura aparece na música, na comunicação, na equipe e na forma como cada evento é pensado.',
  '$.routeFrom', 'VENEZUELA',
  '$.routeTo', 'BRASIL'
)
WHERE locale = 'pt-BR'
  AND section_id IN (
    SELECT id FROM page_sections WHERE page_id = 'page_home' AND type = 'hero'
  );

UPDATE section_localizations
SET content_json = json_set(
  COALESCE(NULLIF(content_json, ''), '{}'),
  '$.eyebrow', 'Eventos latinos · curaduría · producción',
  '$.title', 'FIESTAS LATINAS CON IDENTIDAD PROPIA.',
  '$.body', 'GTRZ produce eventos latinos con curaduría de pista, identidad visual propia y comunicación bilingüe. Nació en Venezuela y hoy se construye en Brasil entre venezolanos y brasileños, desde el concepto hasta la última canción de la noche.',
  '$.originEyebrow', 'DE VENEZUELA A BRASIL',
  '$.originTitle', 'VENEZUELA EN EL ORIGEN. BRASIL EN LA PISTA.',
  '$.originBody', 'GTRZ nació en Venezuela y tomó forma en Brasil. Esa mezcla aparece en la música, la comunicación, el equipo y en la manera de pensar cada evento.',
  '$.routeFrom', 'VENEZUELA',
  '$.routeTo', 'BRASIL'
)
WHERE locale = 'es'
  AND section_id IN (
    SELECT id FROM page_sections WHERE page_id = 'page_home' AND type = 'hero'
  );

UPDATE page_sections
SET updated_at = CURRENT_TIMESTAMP
WHERE page_id = 'page_home' AND type = 'hero';
