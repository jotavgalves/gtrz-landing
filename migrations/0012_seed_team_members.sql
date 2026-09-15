PRAGMA foreign_keys = ON;

INSERT INTO team_members(id,name,role_key,media_id,instagram_url,position,active)
VALUES
  ('team_dario_gutierrez','Dario Gutiérrez','executive_producer',NULL,NULL,10,1),
  ('team_joao_goncalves','João Gonçalves','production_marketing',NULL,NULL,20,1),
  ('team_alexander_gutierrez','Alexander Gutiérrez','production_legal',NULL,NULL,30,1)
ON CONFLICT(id) DO UPDATE SET
  name=excluded.name,
  role_key=excluded.role_key,
  position=excluded.position,
  active=1;

INSERT INTO team_localizations(team_member_id,locale,role_label,bio)
VALUES
  ('team_dario_gutierrez','pt-BR','Produtor Executivo',NULL),
  ('team_dario_gutierrez','es','Productor Ejecutivo',NULL),
  ('team_joao_goncalves','pt-BR','Produção e Marketing',NULL),
  ('team_joao_goncalves','es','Producción y Marketing',NULL),
  ('team_alexander_gutierrez','pt-BR','Produção e Jurídico',NULL),
  ('team_alexander_gutierrez','es','Producción y Jurídico',NULL)
ON CONFLICT(team_member_id,locale) DO UPDATE SET
  role_label=excluded.role_label;

UPDATE section_localizations
SET content_json='{"eyebrow":"Equipe GTRZ","title":"AS PESSOAS POR TRÁS DE CADA NOITE.","body":"Produção, direção, comunicação e operação. A GTRZ é construída por pessoas com funções diferentes e o mesmo compromisso: levar cada edição do conceito à pista.","fallbackRole":"GTRZ","instagramLabel":"Instagram ↗","emptyText":"A equipe desta edição será apresentada em breve."}'
WHERE section_id='home_team' AND locale='pt-BR';

UPDATE section_localizations
SET content_json='{"eyebrow":"Equipo GTRZ","title":"LAS PERSONAS DETRÁS DE CADA NOCHE.","body":"Producción, dirección, comunicación y operación. GTRZ se construye con personas de distintas funciones y el mismo compromiso: llevar cada edición del concepto a la pista.","fallbackRole":"GTRZ","instagramLabel":"Instagram ↗","emptyText":"El equipo de esta edición será presentado muy pronto."}'
WHERE section_id='home_team' AND locale='es';
