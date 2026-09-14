# GTRZ Platform

Nova arquitetura institucional da GTRZ. O site legado da La Rumba Jampa permanece preservado em `jotavgalves/backupgtrzlandinglarumbajampa`.

## Apps

- `apps/web`: site público institucional e páginas de eventos.
- `apps/admin`: GTRZ Control (CMS, eventos, mídia, marketing e analytics).
- `apps/api`: API em Cloudflare Workers.

## Packages

- `packages/contracts`: contratos, tipos e validação compartilhados.

## Dados

- D1: conteúdo, eventos, usuários, leads, revisões e agregados de analytics.
- R2: mídia oficial.
- Analytics Engine: eventos de alta frequência e cliques.

## Princípio de arquitetura

Cada recurso possui quatro faces: PUBLIC, ADMIN, SCHEMA e ANALYTICS. Conteúdo é editável pelo painel; componentes, validação, segurança e design system permanecem no código.
