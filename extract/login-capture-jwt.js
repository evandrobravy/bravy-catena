// Login no ClickUp (conta Catena) via Playwright e captura do JWT de sessão
// (header Authorization do tráfego frontdoor). Salva em ~/.credentials/clients/clickup-jwt-catena.tmp
// Uso: node extract/login-capture-jwt.js
process.env.NODE_PATH = '/opt/homebrew/lib/node_modules';
require('module').Module._initPaths();
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const VAULT = path.join(os.homedir(), '.credentials/clients');
const OUT = path.join(VAULT, 'clickup-jwt-catena.tmp');
const env = fs.readFileSync(path.join(VAULT, 'catena.env'), 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();
const EMAIL = get('CLICKUP_LOGIN');
const PASSWORD = get('CLICKUP_PASSWORD');
const SAMPLE_TASK = process.argv[2] || '86ahuqxca';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  let jwt = null;
  let host = null;
  const interesting = new Set();
  page.on('request', (r) => {
    const auth = r.headers()['authorization'];
    const url = r.url();
    if (auth && /^Bearer ey/i.test(auth)) {
      if (!jwt) console.log('JWT capturado de', new URL(url).origin);
      jwt = auth.replace(/^Bearer\s+/i, '');
      if (/frontdoor|clickup\.com/.test(url)) host = new URL(url).origin;
    }
    if (/activity|history|audit|field\/v1|comments/i.test(url) && /clickup\.com/.test(url)) {
      interesting.add(r.method() + ' ' + url.split('?')[0] + (url.includes('?') ? '?' + url.split('?')[1] : ''));
    }
  });

  console.log('Abrindo login...');
  await page.goto('https://app.clickup.com/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // preenche devagar (anti-bot)
  const emailSel = 'input[type="email"], input[name="email"], [data-test="login-email-input"] input, #login-email-input';
  const passSel = 'input[type="password"], input[name="password"], [data-test="login-password-input"] input, #login-password-input';
  await page.locator(emailSel).first().click();
  await page.keyboard.type(EMAIL, { delay: 80 });
  await page.locator(passSel).first().click();
  await page.keyboard.type(PASSWORD, { delay: 90 });
  await page.waitForTimeout(800);
  await page.keyboard.press('Enter');
  console.log('Login submetido, aguardando app carregar...');

  try {
    await page.waitForURL(/app\.clickup\.com\/\d+/, { timeout: 60000 });
  } catch {
    console.log('URL atual:', page.url());
    await page.screenshot({ path: __dirname + '/login-state.png' });
    console.log('Screenshot salvo em extract/login-state.png — verificar (MFA/captcha?)');
  }
  await page.waitForTimeout(8000);
  console.log('URL pós-login:', page.url());

  // abre uma task pra provocar as chamadas de activity/log
  console.log('Abrindo task de amostra', SAMPLE_TASK);
  await page.goto(`https://app.clickup.com/t/${SAMPLE_TASK}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(10000);

  if (jwt) {
    const body = [
      '# JWT de sessao web do ClickUp (conta ' + EMAIL + ') - frontdoor/private API',
      '# Capturado: ' + new Date().toISOString() + ' via Playwright. Expira ~48h.',
      'ACCOUNT=' + EMAIL,
      'HOST=' + (host || 'https://frontdoor-prod-us-east-2-1.clickup.com'),
      'AUTH_SCHEME=Bearer',
      'JWT=' + jwt,
      '',
    ].join('\n');
    fs.writeFileSync(OUT, body, { mode: 0o600 });
    console.log('JWT salvo em', OUT, '(host:', host + ')');
  } else {
    console.log('NENHUM JWT capturado.');
  }

  console.log('\nEndpoints de interesse observados:');
  for (const u of interesting) console.log(' -', u);

  await browser.close();
  process.exit(jwt ? 0 : 1);
})().catch((e) => {
  console.error('ERRO:', e.message);
  process.exit(1);
});
