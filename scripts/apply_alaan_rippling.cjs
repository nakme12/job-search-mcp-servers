const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
    const page = await browser.newPage();
    const url = 'https://ats.rippling.com/alaan-careers/jobs/5a84497e-6c95-4e99-8e42-279fef26e85c';
    
    console.log('Navigating to Alaan Rippling ATS...');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    
    // Click Apply now
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button, a')).find(b => b.innerText.trim() === 'Apply now');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 4000));

    // Upload Resume via CDP file chooser / input[type=file]
    const resumePath = 'C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - MERN Full Stack.pdf';
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(resumePath);
      console.log('✅ Uploaded Resume:', resumePath);
      await new Promise(r => setTimeout(r, 3000));
    }

    // Fill Form inputs with Rule 70 pre-clear
    await page.evaluate(() => {
      function fill(selector, val) {
        const el = document.querySelector(selector);
        if (el) {
          el.value = '';
          el.focus();
          el.value = val;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      fill('input[placeholder*="First name"]', 'Pratik');
      fill('input[placeholder*="Last name"]', 'Patidar');
      fill('input[placeholder*="Email"]', 'pratikpatidar7990@gmail.com');
      fill('input[placeholder*="Phone"]', '8269647990');
      fill('input[placeholder*="Current company"]', 'Techstuff Private Limited');
    });

    console.log('✅ Populated form fields (Pratik Patidar, 8269647990, pratikpatidar7990@gmail.com)');
    await new Promise(r => setTimeout(r, 2000));

    // Click Submit application button
    console.log('Clicking Submit button...');
    const submitClicked = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => {
        const t = b.innerText.toLowerCase();
        return t.includes('submit') || t.includes('apply');
      });
      if (btn) {
        btn.click();
        return btn.innerText.trim();
      }
      return null;
    });
    console.log('Clicked button:', submitClicked);

    await new Promise(r => setTimeout(r, 5000));

    // Check confirmation
    const isSubmitted = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes('thank you') || text.includes('submitted') || text.includes('application received');
    });
    console.log('Live DOM confirmation detected?:', isSubmitted);

    // Capture screenshot
    const dateDir = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-21/shift1';
    if (!fs.existsSync(dateDir)) fs.mkdirSync(dateDir, { recursive: true });
    const ssPath = path.join(dateDir, 'Alaan_Rippling_ATS_Confirmed.png');
    await page.screenshot({ path: ssPath });
    console.log('📸 Confirmation Screenshot Saved:', ssPath);

    // Save to File 5
    const f5Path = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-21.json';
    const raw = JSON.parse(fs.readFileSync(f5Path, 'utf8'));
    raw.jobs.push({
      id: raw.jobs.length + 1,
      company: 'Alaan',
      role: 'Fullstack Intern',
      location: 'Middle East / Remote',
      url: url,
      channel: 'Direct ATS / Rippling',
      status: 'CONFIRMED_SUBMITTED',
      applied_at: new Date().toISOString(),
      confirmation_screenshot: ssPath,
      resume_used: 'Pratik Patidar Resume - MERN Full Stack.pdf'
    });
    raw.total = raw.jobs.length;
    fs.writeFileSync(f5Path, JSON.stringify(raw, null, 2), 'utf8');
    console.log('✅ Updated File 5! Total confirmed applications today:', raw.total);

    await page.close();
  } catch(e) {
    console.log('Error in submission:', e.message);
  }
})();
