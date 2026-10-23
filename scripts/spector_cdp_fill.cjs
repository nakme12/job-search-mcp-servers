const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function testDirectCdpFill() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('jobs.ashbyhq.com/spector')) || pages[0];
  
  await page.bringToFront();

  // Upload Resume
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    console.log('Uploading resume...');
    await fileInput.uploadFile('C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - React Developer.pdf');
    await new Promise(r => setTimeout(r, 2000));
  }

  // Find all inputs
  const inputs = await page.$$('input[type="text"], input[type="email"], input[type="tel"]');
  console.log('Total inputs found:', inputs.length);

  for (let i = 0; i < inputs.length; i++) {
    const info = await inputs[i].evaluate(el => ({
      name: el.name,
      val: el.value,
      label: el.closest('div') ? el.closest('div').innerText : ''
    }));
    const l = info.label.toLowerCase();
    let textToType = '';
    if (l.includes('name') && !l.includes('company')) textToType = 'PRATIK PATIDAR';
    else if (l.includes('email')) textToType = 'pratikpatidar7990@gmail.com';
    else if (l.includes('company')) textToType = 'IT Services Firm';
    else if (l.includes('title')) textToType = 'Frontend Developer';
    else if (l.includes('linkedin')) textToType = 'https://www.linkedin.com/in/pratik-patidar';
    else if (l.includes('github')) textToType = 'https://github.com/pratikpatidar7990';

    if (textToType) {
      console.log(`Typing "${textToType}" into input ${i}...`);
      await inputs[i].click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await page.keyboard.type(textToType, { delay: 10 });
    }
  }

  // Click Radio / Yes-No options
  await page.evaluate(() => {
    const opts = Array.from(document.querySelectorAll('.ashby-application-form-input-yesno-option'));
    opts.forEach(o => {
      const parent = o.closest('div[class*="input"]') || o.parentElement;
      const pText = parent ? parent.innerText.toLowerCase() : '';
      if (pText.includes('authorized') && o.innerText.trim().toLowerCase() === 'yes') o.click();
      if (pText.includes('sponsorship') && o.innerText.trim().toLowerCase() === 'no') o.click();
    });
  });

  // Natural human mouse movement
  for (let i = 0; i < 15; i++) {
    const x = Math.floor(200 + Math.random() * 400);
    const y = Math.floor(200 + Math.random() * 300);
    await page.mouse.move(x, y, { steps: 2 });
    await new Promise(r => setTimeout(r, 40));
  }

  console.log('Filled via physical CDP! Clicking submit...');
  await page.evaluate(() => {
    const btn = document.querySelector('.ashby-application-form-submit-button');
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 6000));
  const snippet = await page.evaluate(() => document.body ? document.body.innerText.substring(0, 300).replace(/\n+/g, ' ') : '');
  console.log('Result:\n', snippet);

  const isConfirmed = snippet.includes('Thank you') || snippet.includes('Application submitted') || snippet.includes('successfully submitted');
  console.log('isConfirmed:', isConfirmed);

  const screenshotPath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-23/shift1/spector_ai_ashby_confirmed.png';
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath });
  console.log('Saved screenshot:', screenshotPath);

  if (isConfirmed) {
    const file5Path = 'C:/mcp/job-search-mcp-engine/data/daily/applied_todays_2026-10-23.json';
    const file5 = JSON.parse(fs.readFileSync(file5Path, 'utf8'));
    file5.jobs.push({
      company: 'Spector.ai',
      role: 'Fullstack Software Engineer',
      url: 'https://jobs.ashbyhq.com/spector-ai/68127883-4e2f-432b-95b2-e90335200b7c/application',
      channel: 'Ashby Direct ATS (Candidate #10 Confirmed)',
      proof_screenshot: screenshotPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    });
    file5.total = file5.jobs.length;
    fs.writeFileSync(file5Path, JSON.stringify(file5, null, 2), 'utf8');

    // Remove from skipped list
    const skippedPath = 'C:/mcp/job-search-mcp-engine/data/daily/already_applied_or_skipped_todays_2026-10-23.json';
    let skipped = JSON.parse(fs.readFileSync(skippedPath, 'utf8'));
    skipped = skipped.filter(j => j.company !== 'Spector.ai');
    fs.writeFileSync(skippedPath, JSON.stringify(skipped, null, 2), 'utf8');

    console.log('SPECTOR.AI APPLIED SUCCESSFULLY! Total today:', file5.total);
    await page.close();
  }

  await browser.disconnect();
}

testDirectCdpFill().catch(console.error);
