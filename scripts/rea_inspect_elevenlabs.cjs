const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function inspectElevenLabs() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  const url = 'https://jobs.ashbyhq.com/elevenlabs/e6924f60-c8cc-42b3-9d05-2442ec30e12d/application';
  
  console.log('[REA] Navigating to ElevenLabs Application URL:', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  const formSchema = await page.evaluate(() => {
    const title = document.title;
    const labels = Array.from(document.querySelectorAll('label')).map(l => ({
      for: l.htmlFor,
      text: l.innerText.trim().replace(/\n/g, ' ')
    }));
    const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
      tag: i.tagName,
      type: i.type,
      id: i.id,
      name: i.name,
      required: i.required,
      placeholder: i.placeholder
    })).filter(x => x.type !== 'hidden');
    const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean);

    return { title, labels, inputs, buttons };
  });

  console.log('[REA] ElevenLabs Form Schema:');
  console.log(JSON.stringify(formSchema, null, 2));

  await page.close();
  process.exit(0);
}

inspectElevenLabs().catch(e => {
  console.error('[REA Error]:', e);
  process.exit(1);
});
