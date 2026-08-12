# La Rumba Jampa — Cloudflare Pages

Projeto preparado para **Cloudflare Pages + Pages Functions**, com landing pública PT/ES e painel em `/admin/`.

## Estrutura

- `index.html` — landing pública.
- `assets/site.css` / `assets/site.js` — frontend responsivo e configuração dinâmica.
- `assets/djs/` — pasta reservada para fallbacks estáticos dos DJs.
- `Cards de artistas/` — SVGs das referências musicais.
- `admin/` — painel de edição.
- `functions/api/site.js` — configuração pública.
- `functions/api/admin/*` — login, leitura, gravação e uploads.
- `functions/media/[[path]].js` — entrega das imagens armazenadas no Google Drive pelo próprio domínio.
- `src/functions-lib.js` — configuração padrão, D1 e sessão.
- `src/google-drive.js` — OAuth, upload e leitura das imagens do Google Drive.
- `_routes.json` — limita Functions a `/api/*` e `/media/*`.

## Deploy no Cloudflare Pages

Importe `jotavgalves/gtrz-landing` via integração Git.

- Production branch: `main`
- Framework preset: nenhum
- Build command: deixe vazio
- Build output directory: `public`
- Root directory: raiz do repositório

## Bindings e secrets

### D1 obrigatório para persistência do painel
Crie um D1 e vincule com nome **`DB`**. As tabelas necessárias são criadas automaticamente.

### Secrets obrigatórios para login
- `ADMIN_PASSWORD`
- `SESSION_SECRET` — use uma string longa e aleatória.

### Google Drive para fotos dos DJs
O painel envia as fotos diretamente para o Google Drive. Configure no Cloudflare:

- `GOOGLE_DRIVE_CLIENT_ID`
- `GOOGLE_DRIVE_CLIENT_SECRET`

Depois do deploy, abra `/admin/` e clique em **Conectar Google Drive** para autorizar sua conta uma única vez.

A pasta padrão do Drive já está configurada no backend. Opcionalmente, você pode sobrescrevê-la com `GOOGLE_DRIVE_FOLDER_ID`.

O refresh token do Google é armazenado criptografado no D1 usando `SESSION_SECRET`. O binding R2 **`MEDIA` não é mais necessário**; ele só permanece suportado para compatibilidade com URLs antigas que eventualmente tenham sido salvas no R2.

Você também pode continuar usando arquivos estáticos em `assets/djs/` ou uma URL externa.

## Google Maps

A seção do local usa um iframe Google Maps real com `loading="lazy"`. O painel permite:

- editar endereço;
- editar link “Como chegar”;
- colar uma URL de embed;
- gerar automaticamente o iframe a partir do endereço.

Se `mapEmbedUrl` ficar vazio, o frontend também gera automaticamente `https://www.google.com/maps?q=ENDERECO&output=embed`.

## O que o painel edita

- lote e preço;
- data/hora e labels exibidas;
- cidade, local e endereço;
- WhatsApp, Sympla, Instagram e email;
- iframe e link do Google Maps;
- fotos e biografias dos DJs;
- gêneros PT/ES;
- títulos, labels, botões, perguntas, respostas e textos PT/ES;
- conteúdo e velocidade da faixa animada;
- ordem/visibilidade dos cards de artistas;
- liga/desliga de cada seção;
- JSON avançado da configuração completa.

As alterações são salvas no D1 e aparecem na landing sem novo deploy.

## Faixa animada

O ticker usa apenas CSS `transform`, com dois segmentos idênticos para loop contínuo e leve. O padrão é **42 s por ciclo** e o painel aceita de 18 a 120 s.

## Após configurar bindings/secrets

Faça um novo deploy do Pages para que os bindings e secrets estejam disponíveis às Functions.
