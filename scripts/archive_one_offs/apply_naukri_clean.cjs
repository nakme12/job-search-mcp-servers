const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function applyNaukriClean(jobUrl, companyName, roleName) {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const page = await browser.newPage();

  console.log('\n--- APPLYING ON NAUKRI: ' + companyName + ' (' + roleName + ') ---');
  try {
    await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // Find Apply button
    const applyBtn = await page.$('.apply-button') || await page.$('#apply-button') || await page.$('button[id*="apply"]') || await page.$('.styles_apply-button__K1jO6');
    if (!applyBtn) {
      console.log('Apply button not found for ' + companyName);
      await page.close();
      return;
    }

    const btnText = await page.evaluate(el => el.innerText.trim(), applyBtn);
    console.log('Found Apply button text: "' + btnText + '"');

    if (btnText.toLowerCase().includes('already applied')) {
      console.log('Already applied to ' + companyName + '!');
      await page.close();
      return;
    }

    await applyBtn.click();
    console.log('Clicked apply button for ' + companyName + '...');
    await new Promise(r => setTimeout(r, 4500));

    const ts = Date.now();
    const cleanComp = companyName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const screenshotPath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/shift2/' + cleanComp + '_postsubmit_' + ts + '.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Confirmation screenshot saved: ' + screenshotPath);

    // Update Shift 2 applied log
    const s2Path = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-14_shift2.json';
    const s2 = JSON.parse(fs.readFileSync(s2Path, 'utf8'));
    s2.jobs.push({
      company: companyName,
      role: roleName,
      recipient_or_url: jobUrl,
      channel: 'Naukri Fast Apply',
      resume: 'Pratik Patidar Resume - React Developer.pdf',
      timestamp: new Date().toISOString(),
      status: 'Applied & Submitted (Naukri Fast Apply)',
      proof_screenshots: ['screenshots/2026-10-14/shift2/' + cleanComp + '_postsubmit_' + ts + '.png'],
      notes: 'Submitted via Naukri Fast Apply. Screenshot captured.'
    });
    s2.total = s2.jobs.length;
    fs.writeFileSync(s2Path, JSON.stringify(s2, null, 2));

    // Sync main applied today log
    const mainPath = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-14.json';
    const main = JSON.parse(fs.readFileSync(mainPath, 'utf8'));
    main.jobs.push(s2.jobs[s2.jobs.length - 1]);
    main.total = main.jobs.length;
    fs.writeFileSync(mainPath, JSON.stringify(main, null, 2));

    console.log('Applied log updated. Shift 2 Total: ' + s2.total + ' | Today Total: ' + main.total);
  } catch (err) {
    console.error('Error applying to ' + companyName + ':', err.message);
  } finally {
    await page.close();
    console.log('Closed tab for ' + companyName + '.');
  }
}

(async () => {
  // 1. Veloces Consulting
  await applyNaukriClean(
    'https://www.naukri.com/job-listings-multimedia-designer-web-developer-veloces-consulting-services-bengaluru-0-to-2-years-111125015027',
    'Veloces Consulting Services',
    'Web Developer'
  );

  // 2. Rock Solid Solutions
  await applyNaukriClean(
    'https://www.naukri.com/job-listings-full-stack-developer-programming-internship-rock-solid-solutions-mumbai-0-to-0-years-131026016876',
    'Rock Solid Solutions',
    'Full Stack Developer'
  );
})();
