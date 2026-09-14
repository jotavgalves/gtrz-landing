# Cobertura editorial do GTRZ Control

A interface pública foi estruturada para que todo texto visível possa ser alterado sem edição de código.

## Home

O módulo **Conteúdo** controla, separadamente em `pt-BR` e `es`, todos os textos das seções:

- Hero e faixa animada
- Sobre e números
- Ritmos
- Diferenciais
- Eventos, estados e CTAs
- Equipe e estados vazios
- Freelancers
- Parcerias e manifesto
- Instagram
- Contato

Dados editoriais próprios de eventos e integrantes da equipe continuam nos módulos **Eventos** e **Pessoas**.

## Textos do site

O módulo **Textos do site** controla em português e espanhol:

- Header, menu, SEO, rodapé e porta de idioma
- Página Trabalhe conosco, inclusive labels, placeholders, CTA e mensagens do formulário
- Página Parcerias, inclusive opções do formulário, CTA e mensagens
- Página individual de evento, labels, line-up, ingressos, estados de lote e 404
- Popup de eventos, títulos, textos, estados e CTAs

As configurações são persistidas no D1 nas chaves `chrome` e `copy`. A API pública entrega essas chaves ao site; nenhuma alteração de texto exige novo deploy.
