# GTRZ Platform — Deployment

## Topologia de produção

- `gtrz.com.br` → `gtrz-web` (Astro/Cloudflare Worker)
- `control.gtrz.com.br` → `gtrz-control` (React/Vite + Workers Static Assets)
- `api.gtrz.com.br` → `gtrz-api` (Hono/Cloudflare Worker)
- D1 → conteúdo, eventos, leads, sessões e agregados
- R2 → biblioteca de mídia
- Analytics Engine → eventos de alta frequência

O site institucional usa uma Worker Route em `gtrz.com.br/*` durante a migração. Isso permite substituir a landing antiga sem depender de trocar imediatamente o DNS/Pages existente. Depois da estabilização, o projeto antigo de Pages pode ser removido e o host migrado para Custom Domain se desejado.

## Recursos Cloudflare

O `apps/api/wrangler.toml` usa provisionamento automático de bindings do Wrangler para a primeira publicação. O objetivo é criar/ligar:

- D1 binding `DB` / banco `gtrz-prod`
- R2 binding `MEDIA` / bucket `gtrz-media-prod`
- Analytics Engine binding `ANALYTICS` / dataset `gtrz_prod`

As migrations ficam em `/migrations` e são aplicadas com:

```bash
cd apps/api
pnpm exec wrangler d1 migrations apply DB --remote
```

## Segredos de produção

Nunca devem entrar no Git. O pipeline espera estes GitHub Actions secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `GTRZ_ADMIN_PASSWORD`
- `GTRZ_SESSION_SECRET`
- `GTRZ_TURNSTILE_SITE_KEY` (opcional enquanto Turnstile não estiver ativado)
- `GTRZ_TURNSTILE_SECRET_KEY` (opcional enquanto Turnstile não estiver ativado)

O token Cloudflare precisa de permissões suficientes para Workers Scripts, Workers Routes, D1 e R2 na conta/zona usada pela GTRZ.

## Ordem do deploy

O workflow `.github/workflows/deploy-production.yml` executa:

1. validação de credenciais;
2. instalação de dependências;
3. typecheck e build;
4. deploy inicial da API e provisionamento dos bindings;
5. migrations D1;
6. instalação dos secrets da API;
7. deploy final da API;
8. build/deploy do institucional;
9. build/deploy do GTRZ Control.

Se `CLOUDFLARE_API_TOKEN` ou `CLOUDFLARE_ACCOUNT_ID` não estiverem configurados, o workflow termina sem substituir a produção.

## Ambientes locais

Copie os arquivos `.env.example` das aplicações e preencha apenas localmente. `.env`, `.dev.vars`, builds e estado do Wrangler estão ignorados pelo Git.

## Backup do legado

A landing La Rumba Jampa anterior está preservada em:

`jotavgalves/backupgtrzlandinglarumbajampa`

Ela não deve voltar a ser copiada para a raiz do projeto novo. Eventos antigos devem ser recriados dentro do módulo de eventos da GTRZ Platform.
