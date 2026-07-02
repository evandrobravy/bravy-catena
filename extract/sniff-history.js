// Reloga e captura o request/response real dos endpoints de histórico de task.
process.env.NODE_PATH = '/opt/homebrew/lib/node_modules';
require('module').Module._initPaths();
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const VAULT = path.join(os.homedir(), '.credentials/clients');
const env = fs.readFileSync(path.join(VAULT, 'catena.env'), 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();
const SAMPLE_TASK = process.argv[2] || '86ahuqxca';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const captured = [];
  page.on('response', async (resp) => {
    const url = resp.url();
    if (/tasks\/history|historyItems|\/history\b/i.test(url) && /clickup\.com/.test(url)) {
      let body = '';
      try { body = (await resp.text()).slice(0, 3000); } catch {}
      captured.push({
        method: resp.request().method(),
        url,
        postData: resp.request().postData(),
        status: resp.status(),
        body,
      });
    }
  });

  await page.goto('https://app.clickup.com/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.locator('input[type="email"]').first().click();
  await page.keyboard.type(get('CLICKUP_LOGIN'), { delay: 80 });
  await page.locator('input[type="password"]').first().click();
  await page.keyboard.type(get('CLICKUP_PASSWORD'), { delay: 90 });
  await page.keyboard.press('Enter');
  await page.waitForURL(/app\.clickup\.com\/\d+/, { timeout: 60000 });
  await page.waitForTimeout(5000);

  await page.goto(`https://app.clickup.com/t/${SAMPLE_TASK}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(12000);

  // salva storageState pra reuso sem relogar
  await ctx.storageState({ path: path.join(VAULT, 'clickup-catena-state.json') });

  fs.writeFileSync(
    __dirname + '/history-capture.json',
    JSON.stringify(captured, null, 2),
  );
  console.log('capturados:', captured.length, '-> extract/history-capture.json');
  await browser.close();
})().catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
