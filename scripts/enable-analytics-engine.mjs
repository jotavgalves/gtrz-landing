#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import process from 'node:process';
import readline from 'node:readline/promises';

const REPO = 'jotavgalves/gtrz-landing';
const WORKFLOW = 'GTRZ Production Deploy';

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    ...options
  });
}

function requireGh() {
  const version = run('gh', ['--version'], { stdio: 'ignore' });
  if (version.status !== 0) {
    console.error('\nGitHub CLI (gh) não foi encontrado. Instale com:');
    console.error('winget install --id GitHub.cli\n');
    process.exit(1);
  }
  const auth = run('gh', ['auth', 'status'], { stdio: 'ignore' });
  if (auth.status !== 0) {
    console.error('\nO GitHub CLI não está autenticado. Execute `gh auth login` e tente novamente.\n');
    process.exit(1);
  }
}

function openBrowser(url) {
  let result;
  if (process.platform === 'win32') {
    result = run('cmd.exe', ['/c', 'start', '', url], { stdio: 'ignore' });
  } else if (process.platform === 'darwin') {
    result = run('open', [url], { stdio: 'ignore' });
  } else {
    result = run('xdg-open', [url], { stdio: 'ignore' });
  }
  return result.status === 0;
}

function validateAccountId(value) {
  return /^[a-f0-9]{32}$/i.test(value);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

try {
  console.log('\nGTRZ — ativação do Cloudflare Workers Analytics Engine\n');
  console.log('A primeira ativação do Analytics Engine é feita no painel da Cloudflare.');
  console.log('Este assistente abre a tela correta e, depois da ativação, dispara o deploy automaticamente.\n');

  requireGh();

  let accountId = '';
  while (!validateAccountId(accountId)) {
    accountId = (await rl.question('CLOUDFLARE_ACCOUNT_ID: ')).trim();
    if (!validateAccountId(accountId)) console.log('O Account ID deve ter 32 caracteres hexadecimais.');
  }

  const url = `https://dash.cloudflare.com/${accountId}/workers/analytics-engine`;
  console.log('\nAbrindo Cloudflare Analytics Engine...');
  if (!openBrowser(url)) {
    console.log(`Não consegui abrir automaticamente. Abra manualmente:\n${url}`);
  }

  console.log('\nNa página que abriu:');
  console.log('1. Faça login na Cloudflare, se necessário.');
  console.log('2. Clique em Enable / Enable Analytics Engine.');
  console.log('3. Não é necessário criar dataset manualmente.');
  console.log('4. Volte para esta janela do PowerShell.\n');

  await rl.question('Depois de ativar o Analytics Engine, pressione Enter aqui para continuar... ');

  console.log('\nDisparando novamente o deploy da GTRZ...');
  const deploy = run('gh', ['workflow', 'run', WORKFLOW, '--repo', REPO, '--ref', 'main'], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  if (deploy.status !== 0) {
    const detail = String(deploy.stderr || deploy.stdout || '').trim();
    console.error(`\nNão foi possível disparar o workflow${detail ? `: ${detail}` : '.'}`);
    console.error(`Execute manualmente:\ngh workflow run "${WORKFLOW}" --repo ${REPO} --ref main\n`);
    process.exit(1);
  }

  console.log('✓ Analytics Engine confirmado pelo usuário.');
  console.log('✓ Workflow de produção disparado.');
  console.log('\nO GitHub Actions agora continuará com API, migrations, site e GTRZ Control.\n');
} finally {
  rl.close();
}
