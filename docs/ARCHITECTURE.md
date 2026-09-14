# Arquitetura — GTRZ Platform

## Objetivo

Transformar `gtrz.com.br` em uma plataforma institucional e operacional modular, administrável por CMS, preparada para vários eventos, cidades, idiomas, campanhas e usuários administrativos.

## Limites

1. O painel nunca injeta JavaScript ou CSS arbitrário.
2. Páginas são compostas por blocos tipados.
3. PT e ES são localizações de primeira classe.
4. Eventos têm ciclo de vida próprio (`draft`, `scheduled`, `published`, `sales_open`, `sold_out`, `finished`, `archived`).
5. Todo CTA importante possui `track_id`.
6. Analytics individual é anônimo por sessão. Não armazenar IP bruto.
7. Alterações administrativas relevantes geram `audit_logs` e, para conteúdo, revisão.

## Apps

### web
Astro SSR em Cloudflare. Renderiza conteúdo do CMS, páginas institucionais e páginas de eventos.

### admin
React/Vite. Módulos independentes: dashboard, páginas, eventos, pessoas, comercial, marketing, mídia, SEO, analytics e sistema.

### api
Cloudflare Worker/Hono. API pública, API administrativa, autenticação, mídia, analytics e links rastreáveis.

## Fluxo de analytics

Browser -> `/api/analytics/collect` -> Analytics Engine.

Links rastreáveis entram por `/r/:slug`, registram aquisição e redirecionam.

Cron diário agrega métricas relevantes em `analytics_daily` no D1 para retenção histórica e dashboards rápidos.

## Migrações

Nunca alterar esquema de produção manualmente. Toda alteração de banco deve existir em `migrations/`.
