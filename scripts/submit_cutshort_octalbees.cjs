const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  const cutshort = pages.find(p => p.url().includes('cutshort.io'));
  if (!cutshort) {
    console.log('Cutshort tab not found');
    browser.disconnect();
    return;
  }

  console.log('Focusing Cutshort tab...');
  await cutshort.bringToFront();

  const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
  const fileInput = await cutshort.$('input[type="file"]');
  if (fileInput && fs.existsSync(resumePath)) {
    console.log('Uploading MERN Resume...');
    await fileInput.uploadFile(resumePath);
    await new Promise(r => setTimeout(r, 2500));
  }

  // Click Save and continue
  console.log('Clicking Save and continue...');
  await cutshort.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText && b.innerText.toLowerCase().includes('save and continue'));
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 4000));

  // Check next step or confirmation
  const pageState = await cutshort.evaluate(() => {
    const text = document.body.innerText;
    const isSubmitted = /applied|application sent|successfully applied|applied on/i.test(text);
    return { isSubmitted, snippet: text.slice(0, 500).replace(/\n+/g, ' ') };
  });

  console.log('Page state:', pageState);

  // Take screenshot
  const shotPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-15\\shift1\\post_submit_octalbees_cutshort.png';
  await cutshort.screenshot({ path: shotPath, fullPage: true });
  console.log('Screenshot saved to:', shotPath);

  browser.disconnect();
})();
