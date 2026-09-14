# GTRZ Platform

Plataforma institucional e operacional da GTRZ. O projeto substitui a antiga landing monolítica por aplicações independentes para site, administração e API.

A landing original da La Rumba Jampa está preservada integralmente em `jotavgalves/backupgtrzlandinglarumbajampa` e não deve ser recolocada neste repositório.

## Aplicações

- `apps/web` — site público institucional, páginas de eventos, PT/ES, formulários e tracking.
- `apps/admin` — GTRZ Control: CMS, eventos, freelancers, parcerias, mídia, marketing e analytics.
- `apps/api` — API em Cloudflare Workers/Hono, autenticação, D1, R2 e Analytics Engine.

## Pacotes compartilhados

- `packages/contracts` — contratos, tipos e validações usados entre aplicações.

## Dados

- D1 — conteúdo do CMS, eventos, leads, sessões administrativas, links rastreáveis e agregados históricos.
- R2 — biblioteca oficial de mídia.
- Analytics Engine — eventos de alta frequência, page views, seções, CTAs, ingressos e campanhas.

## Princípio de arquitetura

Cada recurso possui quatro faces: PUBLIC, ADMIN, SCHEMA e ANALYTICS. Conteúdo é editável pelo painel; componentes, validação, segurança e design system permanecem no código.

## Deploy

A produção é preparada para:

- `gtrz.com.br` → institucional;
- `control.gtrz.com.br` → painel administrativo;
- `api.gtrz.com.br` → API.

A configuração completa, recursos Cloudflare e segredos necessários estão documentados em `docs/DEPLOYMENT.md`.

## Comandos

```bash
pnpm install
pnpm typecheck
pnpm build
```

Desenvolvimento separado:

```bash
pnpm dev:web
pnpm dev:admin
pnpm dev:api
```
