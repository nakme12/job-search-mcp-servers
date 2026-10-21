const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  const page = pages[0];
  const resumePath = 'C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - Frontend Engineer.pdf';

  console.log('Targeting page:', page.url());

  const [fileChooser] = await Promise.all([
    page.waitForFileChooser({ timeout: 6000 }).catch(() => null),
    page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(btn => btn.innerText.includes('Autofill from resume') || btn.innerText.includes('Upload a new resume'));
      if (b) b.click();
    })
  ]);

  if (fileChooser) {
    await fileChooser.accept([resumePath]);
    console.log('File chooser accepted!');
  } else {
    const inputs = await page.$$('input[type="file"]');
    if (inputs.length > 0) {
      await inputs[0].uploadFile(resumePath);
      console.log('Uploaded via standard file input!');
    } else {
      console.log('No file input found');
    }
  }

  await new Promise(r => setTimeout(r, 6000));
  const snippet = await page.evaluate(() => document.body.innerText.slice(0, 1500));
  console.log('UPDATED DOM SNIPPET:\n', snippet);

  browser.disconnect();
})().catch(e => console.error(e));
