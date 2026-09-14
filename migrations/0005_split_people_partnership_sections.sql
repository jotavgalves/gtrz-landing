INSERT OR IGNORE INTO page_sections(id,page_id,type,position,enabled,config_json) VALUES
('home_freelancers','page_home','freelancers',70,1,'{}'),
('home_partnerships','page_home','partnerships',80,1,'{}');

INSERT OR IGNORE INTO section_localizations(section_id,locale,content_json) VALUES
('home_freelancers','pt-BR','{"eyebrow":"Faça parte da operação","title":"TRABALHE COM A GTRZ.","body":"Eventos dependem de uma boa rede de profissionais. Cadastre seu perfil para futuras produções da GTRZ.","cta":"Cadastrar como freelancer"}'),
('home_freelancers','es','{"eyebrow":"Sé parte de la operación","title":"TRABAJA CON GTRZ.","body":"Los eventos dependen de una buena red de profesionales. Registra tu perfil para futuras producciones de GTRZ.","cta":"Registrarme como freelancer"}'),
('home_partnerships','pt-BR','{"eyebrow":"Marcas · Casas · Artistas · Fornecedores","title":"PARCERIAS QUE FAZEM SENTIDO.","body":"A GTRZ está aberta a colaborações que agreguem experiência para o público e valor para os dois lados.","cta":"Propor uma parceria"}'),
('home_partnerships','es','{"eyebrow":"Marcas · Espacios · Artistas · Proveedores","title":"ALIANZAS QUE TIENEN SENTIDO.","body":"GTRZ está abierta a colaboraciones que sumen experiencia para el público y valor para ambas partes.","cta":"Proponer una alianza"}');

UPDATE section_localizations
SET content_json='{"eyebrow":"Quem faz acontecer","title":"POR TRÁS DA GTRZ.","body":"Venezuelanos e brasileiros construindo juntos cada experiência."}'
WHERE section_id='home_team' AND locale='pt-BR';

UPDATE section_localizations
SET content_json='{"eyebrow":"Quién hace que suceda","title":"POR DETRÁS DE GTRZ.","body":"Venezolanos y brasileños construyendo juntos cada experiencia."}'
WHERE section_id='home_team' AND locale='es';
