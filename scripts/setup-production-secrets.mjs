#!/usr/bin/env node

import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import readline from 'node:readline/promises';

const REPO = 'jotavgalves/gtrz-landing';

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
    console.error('\nGitHub CLI (gh) não foi encontrado.');
    console.error('Instale-o e execute `gh auth login` antes de rodar este configurador.\n');
    process.exit(1);
  }

  const auth = run('gh', ['auth', 'status'], { stdio: 'ignore' });
  if (auth.status !== 0) {
    console.error('\nO GitHub CLI não está autenticado. Execute `gh auth login` e tente novamente.\n');
    process.exit(1);
  }
}

async function askVisible(label, fallback = '') {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const suffix = fallback ? ` [${fallback}]` : '';
    const value = (await rl.question(`${label}${suffix}: `)).trim();
    return value || fallback;
  } finally {
    rl.close();
  }
}

async function askHidden(label, { optional = false } = {}) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      return (await rl.question(`${label}${optional ? ' (opcional)' : ''}: `)).trim();
    } finally {
      rl.close();
    }
  }

  process.stdout.write(`${label}${optional ? ' (opcional)' : ''} — cole/digite e pressione Enter: `);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  return await new Promise((resolve) => {
    let value = '';

    const restore = () => {
      process.stdin.off('data', onData);
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdin.pause();
    };

    const finish = () => {
      restore();
      process.stdout.write('\n');
      resolve(value.trim());
    };

    const onData = (chunk) => {
      for (const char of String(chunk)) {
        if (char === '\u0003') {
          restore();
          process.stdout.write('\n');
          process.exit(130);
        }
        if (char === '\r' || char === '\n') return finish();
        if (char === '\u007f' || char === '\b') {
          if (value.length) {
            value = value.slice(0, -1);
            process.stdout.write('\b \b');
          }
          continue;
        }
        if (char === '\u001b') continue;
        value += char;
        process.stdout.write('*');
      }
    };

    process.stdin.on('data', onData);
  });
}

async function askAdminPassword() {
  while (true) {
    const password = await askHidden('Senha do GTRZ Control');
    if (password.length < 12) {
      console.error('A senha deve ter pelo menos 12 caracteres. Tente novamente.\n');
      continue;
    }

    const confirmation = await askHidden('Confirme a senha do GTRZ Control');
    if (password !== confirmation) {
      console.error('As senhas não coincidem. Tente novamente.\n');
      continue;
    }

    return password;
  }
}

function setSecret(name, value) {
  const result = run(
    'gh',
    ['secret', 'set', name, '--repo', REPO],
    { input: `${value}\n`, stdio: ['pipe', 'pipe', 'pipe'] }
  );

  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || '').trim();
    throw new Error(`Falha ao definir ${name}${detail ? `: ${detail}` : ''}`);
  }

  console.log(`✓ ${name}`);
}

function validateAccountId(value) {
  return /^[a-f0-9]{32}$/i.test(value);
}

console.log('\nGTRZ — configuração segura de secrets de produção');
console.log(`Repositório: ${REPO}`);
console.log('Nenhum valor será salvo em arquivo ou impresso no terminal.');
console.log('Nos campos secretos aparecerão apenas asteriscos para confirmar a digitação.\n');

requireGh();

const cloudflareToken = await askHidden('CLOUDFLARE_API_TOKEN');
if (!cloudflareToken) {
  console.error('\nCLOUDFLARE_API_TOKEN é obrigatório. Cole o token antes de pressionar Enter.');
  process.exit(1);
}

const accountId = await askVisible('CLOUDFLARE_ACCOUNT_ID');
if (!validateAccountId(accountId)) {
  console.error('CLOUDFLARE_ACCOUNT_ID deve ter 32 caracteres hexadecimais.');
  process.exit(1);
}

const adminPassword = await askAdminPassword();
const turnstileSecret = await askHidden('GTRZ_TURNSTILE_SECRET_KEY', { optional: true });
const turnstileSiteKey = await askVisible('GTRZ_TURNSTILE_SITE_KEY (opcional)');
const sessionSecret = randomBytes(48).toString('hex');

console.log('\nEnviando secrets para GitHub Actions...');

try {
  setSecret('CLOUDFLARE_API_TOKEN', cloudflareToken);
  setSecret('CLOUDFLARE_ACCOUNT_ID', accountId);
  setSecret('GTRZ_ADMIN_PASSWORD', adminPassword);
  setSecret('GTRZ_SESSION_SECRET', sessionSecret);
  if (turnstileSecret) setSecret('GTRZ_TURNSTILE_SECRET_KEY', turnstileSecret);
  if (turnstileSiteKey) setSecret('GTRZ_TURNSTILE_SITE_KEY', turnstileSiteKey);
} catch (error) {
  console.error(`\n${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}

console.log('\nConfiguração concluída.');
console.log('O SESSION_SECRET foi gerado automaticamente com 384 bits de entropia.');
console.log('Os valores podem ser confirmados pela presença dos nomes em GitHub → Settings → Secrets and variables → Actions.');
console.log('\nPara disparar a publicação depois da conferência:');
console.log(`gh workflow run "GTRZ Production Deploy" --repo ${REPO} --ref main\n`);
