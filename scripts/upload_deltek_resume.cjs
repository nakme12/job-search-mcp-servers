const puppeteer = require('puppeteer-core');

const RESUME_PATH = 'C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - MERN Full Stack.pdf';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const deltekPage = pages.find(p => p.url().includes('brassring.com'));
  
  if (!deltekPage) return;

  const fileInputs = await deltekPage.$$('input[type="file"]');
  console.log('File inputs count:', fileInputs.length);
  for (let i = 0; i < fileInputs.length; i++) {
    try {
      await fileInputs[i].uploadFile(RESUME_PATH);
      console.log(`Uploaded to file input [${i}]!`);
    } catch(e) {
      console.log(`Failed on [${i}]:`, e.message);
    }
  }

  await new Promise(r => setTimeout(r, 4000));
  const ssPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1\\deltek_resume_uploaded.png';
  await deltekPage.screenshot({ path: ssPath, fullPage: true });
  console.log('Saved screenshot to:', ssPath);
})();
