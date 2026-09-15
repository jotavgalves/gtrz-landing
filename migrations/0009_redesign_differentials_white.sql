-- Rework Home differentials into a white editorial section with concrete, multicultural proof points.
-- All visible copy remains editable through the existing PT/ES section localization editors in GTRZ Control.

UPDATE section_localizations
SET content_json = json_set(
  COALESCE(content_json, '{}'),
  '$.eyebrow', 'O jeito GTRZ de produzir',
  '$.title', 'NÃO É SÓ COLOCAR UMA LOGO NA FESTA.',
  '$.body', 'Cada edição é construída como uma experiência própria. Conceito, música, comunicação, operação e leitura de público precisam funcionar juntos — antes, durante e depois da pista.',
  '$.manifesto', 'CONCEITO SEM OPERAÇÃO É SÓ IDEIA. OPERAÇÃO SEM IDENTIDADE É SÓ MAIS UMA FESTA.',
  '$.items', json('[{"category":"PISTA","title":"Curadoria de pista","body":"O repertório acompanha o público e o momento da noite. A pista muda, e a curadoria muda junto.","featured":true},{"category":"IDENTIDADE","title":"Cada edição tem linguagem própria","body":"Nome, direção visual, comunicação e ambientação são pensados para aquele evento — não reaproveitados como molde.","featured":true},{"category":"COMUNICAÇÃO","title":"Latino sem rótulo único","body":"Português e espanhol convivem com naturalidade, sem reduzir um público diverso a uma única nacionalidade."},{"category":"OPERAÇÃO","title":"Produção do começo ao fim","body":"Equipe, entrada, bar, fornecedores, artistas e cronograma fazem parte da mesma experiência."},{"category":"PÚBLICO","title":"Pista multicultural","body":"Colombianos, argentinos, cubanos, venezuelanos, brasileiros e outros públicos latinos dividem a mesma noite sem precisar caber em uma única bandeira."},{"category":"COMUNIDADE","title":"Uma noite que dá vontade de repetir","body":"O objetivo não é só encher. É criar uma experiência que faça sentido para quem chega e dê vontade de voltar."}]')
)
WHERE section_id = 'home_differentials' AND locale = 'pt-BR';

UPDATE section_localizations
SET content_json = json_set(
  COALESCE(content_json, '{}'),
  '$.eyebrow', 'La forma GTRZ de producir',
  '$.title', 'NO ES PONER UN LOGO Y LLAMARLO FIESTA.',
  '$.body', 'Cada edición se construye como una experiencia propia. Concepto, música, comunicación, operación y lectura del público tienen que funcionar juntos antes, durante y después de la pista.',
  '$.manifesto', 'CONCEPTO SIN OPERACIÓN ES SOLO UNA IDEA. OPERACIÓN SIN IDENTIDAD ES SOLO OTRA FIESTA.',
  '$.items', json('[{"category":"PISTA","title":"Curaduría de pista","body":"El repertorio acompaña al público y el momento de la noche. La pista cambia, y la curaduría cambia con ella.","featured":true},{"category":"IDENTIDAD","title":"Cada edición tiene lenguaje propio","body":"Nombre, dirección visual, comunicación y ambientación se piensan para ese evento, no se reutilizan como una plantilla.","featured":true},{"category":"COMUNICACIÓN","title":"Latino sin una sola etiqueta","body":"Portugués y español conviven con naturalidad, sin reducir a un público diverso a una sola nacionalidad."},{"category":"OPERACIÓN","title":"Producción de principio a fin","body":"Equipo, ingreso, bar, proveedores, artistas y cronograma forman parte de una misma experiencia."},{"category":"PÚBLICO","title":"Pista multicultural","body":"Colombianos, argentinos, cubanos, venezolanos, brasileños y otros públicos latinos comparten la misma noche sin tener que caber bajo una sola bandera."},{"category":"COMUNIDAD","title":"Una noche que dan ganas de repetir","body":"El objetivo no es solo llenar. Es crear una experiencia que tenga sentido para quien llega y dé ganas de volver."}]')
)
WHERE section_id = 'home_differentials' AND locale = 'es';
