const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('affirm/jobs/8008649003')) || pages[0];
  await page.bringToFront();

  // Populate basic text inputs
  await page.evaluate(() => {
    function setVal(id, val) {
      const el = document.getElementById(id);
      if (el) {
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    setVal('first_name', 'Pratik');
    setVal('last_name', 'Patidar');
    setVal('email', 'pratikpatidar7990@gmail.com');
    setVal('phone', '8269647990');
  });

  // Upload Resume
  const resumePath = 'C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - MERN Full Stack.pdf';
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.uploadFile(resumePath);
    console.log('Resume uploaded successfully.');
  }

  // Handle all select dropdowns
  await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    selects.forEach(s => {
      const label = ((s.closest('label')?.innerText || '') + ' ' + (s.name || '')).toLowerCase();
      const opts = Array.from(s.options);

      if (label.includes('country')) {
        const ind = opts.find(o => o.text.includes('India') || o.value.includes('IN') || o.text.includes('+91'));
        if (ind) s.value = ind.value;
      } else if (label.includes('sponsorship')) {
        const yes = opts.find(o => o.text.toLowerCase().trim() === 'yes');
        if (yes) s.value = yes.value;
      } else if (label.includes('state') || label.includes('province')) {
        const outside = opts.find(o => o.text.toLowerCase().includes('not applicable') || o.text.toLowerCase().includes('outside') || o.text.toLowerCase().includes('other'));
        if (outside) s.value = outside.value;
        else s.selectedIndex = opts.length - 1;
      } else if (label.includes('learn about') || label.includes('employer')) {
        const li = opts.find(o => o.text.toLowerCase().includes('linkedin') || o.text.toLowerCase().includes('job board'));
        if (li) s.value = li.value;
      }
      s.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  console.log('Fields populated. Checking submit button...');
  const btn = await page.$('button[type="submit"], input[type="submit"], #submit_app');
  if (btn) {
    await btn.click();
    console.log('Submit button clicked!');
  } else {
    console.log('Submit button not found');
  }

  browser.disconnect();
})();
