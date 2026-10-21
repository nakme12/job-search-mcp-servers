const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();

  const acpPage = pages.find(p => p.url().includes('myapply/showAcp'));
  const maestroPage = pages.find(p => p.url().includes('maestrointellect.com'));

  if (acpPage) {
    console.log('=== Tab 0 (showAcp) ===');
    console.log('URL:', acpPage.url());
    const text = await acpPage.evaluate(() => document.body ? document.body.innerText.slice(0, 500) : '');
    console.log('Text:\n', text);
    const proofPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1\\naukri_maestro_intellect_applied.png';
    await acpPage.screenshot({ path: proofPath, fullPage: true });
    console.log('Saved proof screenshot:', proofPath);

    // Update applied_todays
    const appliedPath = 'C:\\mcp\\job-search-mcp-engine\\applied_todays_2026-10-19.json';
    const appliedData = JSON.parse(fs.readFileSync(appliedPath, 'utf8'));
    appliedData.jobs.push({
      id: 'naukri_maestro_' + Date.now(),
      company: 'Maestro Intellect',
      role: 'React Developer (0-1 Yrs, Pune)',
      url: 'https://www.naukri.com/job-listings-react-developer-maestro-intellect-pune-0-to-1-years-161026501406',
      application_type: 'Direct Naukri 1-Click Apply',
      status: 'CONFIRMED_APPLIED',
      submitted_at: new Date().toISOString(),
      screenshot_proof: proofPath
    });
    appliedData.total = appliedData.jobs.length;
    fs.writeFileSync(appliedPath, JSON.stringify(appliedData, null, 2));
    console.log(`Updated applied_todays! Total applied now: ${appliedData.total}`);

    await acpPage.close();
    console.log('Closed showAcp tab per Rule 57.');
  }

  if (maestroPage) {
    console.log('\n=== Tab 4 (maestrointellect.com) ===');
    console.log('URL:', maestroPage.url());
    const mText = await maestroPage.evaluate(() => document.body ? document.body.innerText.slice(0, 500) : '');
    console.log('Maestro text:\n', mText);
    await maestroPage.close();
    console.log('Closed maestro carrier tab.');
  }
})();
