const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function testDiverseAdzunaJobs() {
  const targets = [
    { name: 'Octalbees', url: 'https://www.adzuna.in/details/5925630660?utm_medium=api&utm_source=22d4b243' },
    { name: 'TheKalki', url: 'https://www.adzuna.in/details/5920419680?utm_medium=api&utm_source=22d4b243' },
    { name: 'VY SYSTEMS', url: 'https://www.adzuna.in/details/5927319637?utm_medium=api&utm_source=de296ef6' },
    { name: 'BooksApp', url: 'https://www.adzuna.in/details/5925663944?utm_medium=api&utm_source=de296ef6' },
    { name: 'Training Basket', url: 'https://www.adzuna.in/details/5922455432?utm_medium=api&utm_source=de296ef6' }
  ];

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const results = [];

  for (let i = 0; i < targets.length; i++) {
    const job = targets[i];
    console.log(`\n======================================================`);
    console.log(`[TEST ${i + 1}/${targets.length}] Company: ${job.name}`);
    console.log(`Adzuna URL: ${job.url}`);
    console.log(`======================================================`);

    // Rule 81: Isolated worker tab
    const page = await browser.newPage();

    try {
      await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2500));

      // Stage 1 dismiss
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a, span, div'));
        const target = btns.find(b => b.innerText && (b.innerText.trim() === 'No, thanks' || b.innerText.trim() === 'No thanks'));
        if (target) target.click();
      });

      // Click Apply trigger
      await page.evaluate(() => {
        const link = document.querySelector('a[href*="/land/ad/"]');
        if (link) link.click();
      });
      await new Promise(r => setTimeout(r, 2000));

      // Stage 2 modal click
      await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a, button'));
        const target = links.find(b => b.innerText && b.innerText.toLowerCase().includes('take me to the job'));
        if (target) target.click();
      });

      // Wait for navigation
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 4000));

      const landedUrl = page.url();
      const landedTitle = await page.title();
      console.log(`  -> Landed URL: ${landedUrl}`);
      console.log(`  -> Landed Title: ${landedTitle}`);

      // Handle backdrop/Escape
      await page.mouse.click(10, 10);
      await page.keyboard.press('Escape');
      await new Promise(r => setTimeout(r, 1000));

      // Attempt to click Apply Button on Destination Page
      console.log(`  -> Looking for destination 'Apply' button...`);
      const applyClickResult = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const applyBtn = btns.find(b => {
          const t = b.innerText ? b.innerText.trim().toLowerCase() : '';
          return t === 'apply' || t === 'apply now' || t === 'apply to this job' || t.includes('apply for this');
        });
        if (applyBtn) {
          const btnText = applyBtn.innerText.trim();
          applyBtn.click();
          return { clicked: true, text: btnText };
        }
        return { clicked: false };
      });
      console.log(`  -> Destination Apply Click:`, applyClickResult);
      await new Promise(r => setTimeout(r, 3000));

      // Check what happens after Apply Click
      const postApplyUrl = page.url();
      const postApplyAnalysis = await page.evaluate(() => {
        return {
          formsCount: document.querySelectorAll('form').length,
          fileInputsCount: document.querySelectorAll('input[type="file"]').length,
          emailInputsCount: document.querySelectorAll('input[type="email"]').length,
          bodySnippet: document.body ? document.body.innerText.substring(0, 300).replace(/\s+/g, ' ') : ''
        };
      });

      results.push({
        name: job.name,
        landedUrl,
        landedTitle,
        applyClicked: applyClickResult.clicked,
        postApplyUrl,
        formsCount: postApplyAnalysis.formsCount,
        fileInputsCount: postApplyAnalysis.fileInputsCount,
        snippet: postApplyAnalysis.bodySnippet
      });

    } catch (err) {
      console.error(`  ❌ Error:`, err.message);
      results.push({ name: job.name, error: err.message });
    } finally {
      // Rule 81: Close ONLY worker tab
      await page.close().catch(() => {});
    }
  }

  browser.disconnect();

  console.log(`\n======================================================`);
  console.log(`📊 FINAL REPORT: WHERE DO DIVERSE ADZUNA JOBS LEAD?`);
  console.log(`======================================================`);
  console.table(results.map(r => ({
    Company: r.name,
    LandedDomain: r.landedUrl ? new URL(r.landedUrl).hostname : 'ERR',
    ApplyClicked: r.applyClicked,
    FormsFound: r.formsCount,
    FilesFound: r.fileInputsCount
  })));

  fs.writeFileSync('diverse_adzuna_destinations.json', JSON.stringify(results, null, 2));
}

testDiverseAdzunaJobs().catch(console.error);
