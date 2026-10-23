const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');

async function inspectVersatileCareerSite() {
  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();

  const url = 'https://versatileit.in/jobs/react-js-developer-fresher-0-1-year-experience/';
  console.log('[REA] Inspecting Versatile Career Page:', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  const formSchema = await page.evaluate(() => {
    const title = document.title;
    const forms = Array.from(document.querySelectorAll('form')).map(f => ({
      id: f.id,
      className: f.className,
      action: f.action,
      method: f.method
    }));
    const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
      tag: i.tagName,
      type: i.type,
      name: i.name,
      id: i.id,
      placeholder: i.placeholder,
      required: i.required
    })).filter(x => x.type !== 'hidden');
    const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], a')).map(b => b.innerText ? b.innerText.trim() : '').filter(t => t.toLowerCase().includes('apply') || t.toLowerCase().includes('submit'));

    return { title, forms, inputs, buttons };
  });

  console.log('[REA] Versatile Career Form Schema:\n', JSON.stringify(formSchema, null, 2));

  await page.close();
  process.exit(0);
}

inspectVersatileCareerSite().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
