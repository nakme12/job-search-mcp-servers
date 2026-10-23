const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const NEW_TARGETS = [
  {
    company: "Wellfound Candidate #17",
    url: "https://wellfound.com/jobs/4751195-frontend-developer-ai",
    role: "Frontend Developer (AI)"
  },
  {
    company: "Wellfound Candidate #18",
    url: "https://wellfound.com/jobs/3363278-junior-frontend-developer-react-typescript",
    role: "Junior Frontend Developer (React + TypeScript)"
  },
  {
    company: "Wellfound Candidate #19",
    url: "https://wellfound.com/jobs/4634108-frontend-engineer",
    role: "Frontend Engineer"
  },
  {
    company: "Wellfound Candidate #20",
    url: "https://wellfound.com/jobs/4522614-founding-frontend-engineer",
    role: "Founding Frontend Engineer"
  }
];

const PITCH_TEXT = `Hi Hiring Team,

I came across your opening for the Frontend Developer role and wanted to apply.

I have 1.5+ years of experience building modern web applications using React.js, TypeScript, Next.js, and REST APIs. I am based in Indore and ready to join immediately (15 days notice).

Looking forward to discussing further.

Thanks & Regards,
Pratik Patidar
pratikpatidar7990@gmail.com | +91 82696 47990`;

async function runWellfoundBatch2() {
  console.log('=== STARTING WELLFOUND BATCH 2 (TARGET: 20 APPLICATIONS) ===');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();

  for (let i = 0; i < NEW_TARGETS.length; i++) {
    const job = NEW_TARGETS[i];
    console.log(`\n[${i + 1}/${NEW_TARGETS.length}] Opening: ${job.url}`);
    
    try {
      await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await new Promise(r => setTimeout(r, 2500));

      const title = await page.title();
      const companyMatch = title.match(/at\s+([^\•\|]+)/i);
      const actualCompany = companyMatch ? companyMatch[1].trim() : job.company;
      console.log(`Detected Company: ${actualCompany}`);

      // Check Apply button
      const clickedApply = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Apply');
        if (btn) { btn.click(); return true; }
        return false;
      });

      if (!clickedApply) {
        console.log(`[${actualCompany}] Apply button not present or already applied.`);
        continue;
      }

      await new Promise(r => setTimeout(r, 2500));

      // Step 1: Click Continue on profile review
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Continue');
        if (btn) btn.click();
      });
      await new Promise(r => setTimeout(r, 2500));

      // Step 2: Pitch note
      const area = await page.$('textarea');
      if (area) {
        await area.focus();
        await page.keyboard.type(PITCH_TEXT, { delay: 5 });
        await new Promise(r => setTimeout(r, 1000));
      }

      // Step 3: Send Application
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => {
          const t = b.innerText.toLowerCase();
          return t.includes('send application') || t.includes('submit');
        });
        if (btn) btn.click();
      });

      await new Promise(r => setTimeout(r, 5000));

      const text = await page.evaluate(() => document.body ? document.body.innerText : '');
      const isConfirmed = text.includes('Applied') || text.includes('Application sent') || text.includes('Your application was sent');
      console.log(`[${actualCompany}] Confirmation status:`, isConfirmed);

      const safeName = actualCompany.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const screenshotPath = `C:/mcp/job-search-mcp-engine/screenshots/2026-10-23/shift1/${safeName}_wellfound_confirmed.png`;
      fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
      await page.screenshot({ path: screenshotPath });

      if (isConfirmed) {
        const file5Path = 'C:/mcp/job-search-mcp-engine/data/daily/applied_todays_2026-10-23.json';
        const file5 = JSON.parse(fs.readFileSync(file5Path, 'utf8'));
        file5.jobs.push({
          company: actualCompany,
          role: job.role,
          url: job.url,
          channel: 'Wellfound 1-Click Platform Apply',
          proof_screenshot: screenshotPath,
          status: 'APPLIED_CONFIRMED',
          timestamp: new Date().toISOString()
        });
        file5.total = file5.jobs.length;
        fs.writeFileSync(file5Path, JSON.stringify(file5, null, 2), 'utf8');
        console.log(`🎉 [SUCCESS] ${actualCompany} confirmed! Total today: ${file5.total}`);
      }
    } catch (err) {
      console.error(`Error on ${job.url}:`, err.message);
    }
  }

  await page.close();
  await browser.disconnect();
  console.log('\n=== WELLFOUND BATCH 2 COMPLETED ===');
}

runWellfoundBatch2().catch(console.error);
