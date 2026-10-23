const puppeteer = require('puppeteer-core');

const RESUME_PATH = 'C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - MERN Full Stack.pdf';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const deltekPage = pages.find(p => p.url().includes('brassring.com'));
  if (!deltekPage) return;

  console.log('Total frames:', deltekPage.frames().length);
  for (let i = 0; i < deltekPage.frames().length; i++) {
    const f = deltekPage.frames()[i];
    console.log(`[Frame ${i}] URL: ${f.url()} | Name: ${f.name()}`);
    const inputs = await f.$$('input[type="file"]');
    console.log(`[Frame ${i}] File inputs count:`, inputs.length);
    if (inputs.length > 0) {
      await inputs[0].uploadFile(RESUME_PATH);
      console.log(`[Frame ${i}] Uploaded resume to file input!`);
    }
  }

  await new Promise(r => setTimeout(r, 4000));
  const ssPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1\\deltek_frame_upload.png';
  await deltekPage.screenshot({ path: ssPath, fullPage: true });
  console.log('Saved screenshot to:', ssPath);
})();
