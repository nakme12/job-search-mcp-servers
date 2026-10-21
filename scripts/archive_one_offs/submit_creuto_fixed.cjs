const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = await browser.newPage();
  try {
    await p.setViewport({ width: 1280, height: 900 });
    console.log('Navigating to Creuto career application portal...');
    await p.goto('https://creuto.com/careers/apply?position=MERN%20Stack%20Developer&jobId=69fe315bab54fb2fca546108', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 4000));

    // Listen to network requests
    p.on('request', req => {
      if (req.method() === 'POST') console.log('POST Request URL:', req.url());
    });
    p.on('response', async res => {
      if (res.request().method() === 'POST') {
        console.log('POST Response status:', res.status(), 'from:', res.url());
        try {
          const txt = await res.text();
          console.log('Response body:', txt.substring(0, 300));
        } catch (e) {}
      }
    });

    console.log('Filling details...');
    await p.type('input[name="name"]', 'Pratik Patidar', { delay: 25 });
    await p.type('input[name="email"]', 'pratikpatidar7990@gmail.com', { delay: 25 });
    await p.type('input[name="phone"]', '8269647990', { delay: 25 });
    await p.type('input[name="experience"]', '1.5 Years', { delay: 25 });
    await p.type('input[name="linkedin"]', 'https://www.linkedin.com/in/pratik-patidar', { delay: 20 });
    await p.type('textarea[name="reason"]', 'I am an active Full Stack Developer specializing in React.js, Node.js, Express, and MongoDB with 1.5 years experience building scalable web solutions.', { delay: 15 });

    const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
    const fileInputs = await p.$$('input[type="file"]');
    if (fileInputs.length > 0) {
      await fileInputs[0].uploadFile(resumePath);
      console.log('Uploaded resume');
    }
    await new Promise(r => setTimeout(r, 3000));

    const prePath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/creuto_mern_presubmit.png';
    await p.screenshot({ path: prePath, fullPage: true });

    // Click submit by finding the button element handle in puppeteer
    const btns = await p.$$('button');
    let submitHandle = null;
    for (const b of btns) {
      const text = await p.evaluate(el => el.innerText, b);
      if (text && text.trim() === 'Submit') {
        submitHandle = b;
        break;
      }
    }

    if (submitHandle) {
      console.log('Clicking Submit button element handle directly...');
      await submitHandle.click();
    }

    console.log('Waiting 10s...');
    await new Promise(r => setTimeout(r, 10000));

    const postPath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/creuto_mern_postsubmit.png';
    await p.screenshot({ path: postPath, fullPage: true });
    console.log('Post submit URL:', p.url());
    const snippet = await p.evaluate(() => document.body.innerText.substring(0, 500));
    console.log('Post submit text:', snippet);

    const bodyLower = snippet.toLowerCase();
    const success = bodyLower.includes('thank') || 
                    bodyLower.includes('received') || 
                    bodyLower.includes('submitted') || 
                    bodyLower.includes('success');
    console.log('Creuto Physical Confirmation Success:', success);
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
