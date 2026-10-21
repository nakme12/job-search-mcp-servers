const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const RESUME_PATH = 'C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - Frontend Engineer.pdf';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const deltekPage = pages.find(p => p.url().includes('brassring.com'));
  
  if (!deltekPage) {
    console.log('No Brassring page found.');
    return;
  }

  // 1. Try checking "Use my profile"
  console.log('Checking "Use my profile"...');
  await deltekPage.evaluate(() => {
    const cb = document.querySelector('input[type="checkbox"]');
    if (cb && !cb.checked) {
      cb.click();
      cb.checked = true;
      cb.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  await new Promise(r => setTimeout(r, 2000));

  // 2. Click "Add résumé/CV"
  console.log('Looking for resume upload...');
  const addResumeBtn = await deltekPage.$('a, button');
  // Check file inputs
  const fileInput = await deltekPage.$('input[type="file"]');
  if (fileInput) {
    console.log('Found file input directly! Uploading resume...');
    await fileInput.uploadFile(RESUME_PATH);
  } else {
    console.log('File input not direct, clicking Add résumé/CV link...');
    await deltekPage.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button'));
      const rLink = links.find(l => /add résumé|add resume/i.test(l.innerText));
      if (rLink) rLink.click();
    });
  }

  await new Promise(r => setTimeout(r, 2000));

  // Check file input again
  const fileInputAfter = await deltekPage.$('input[type="file"]');
  if (fileInputAfter) {
    console.log('Found file input after click! Uploading resume...');
    await fileInputAfter.uploadFile(RESUME_PATH);
  }

  await new Promise(r => setTimeout(r, 2000));

  const ssPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1\\deltek_step1_populated.png';
  await deltekPage.screenshot({ path: ssPath, fullPage: true });
  console.log('Populated screenshot saved to:', ssPath);
})();
