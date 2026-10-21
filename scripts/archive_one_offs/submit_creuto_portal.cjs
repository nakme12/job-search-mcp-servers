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

    console.log('Filling candidate details into Creuto application form...');

    // 1. Name
    await p.click('input[name="name"]', { clickCount: 3 });
    await p.type('input[name="name"]', 'Pratik Patidar', { delay: 25 });

    // 2. Email
    await p.click('input[name="email"]', { clickCount: 3 });
    await p.type('input[name="email"]', 'pratikpatidar7990@gmail.com', { delay: 25 });

    // 3. Phone
    await p.click('input[name="phone"]', { clickCount: 3 });
    await p.type('input[name="phone"]', '8269647990', { delay: 25 });

    // 4. Experience
    await p.click('input[name="experience"]', { clickCount: 3 });
    await p.type('input[name="experience"]', '1.5 Years', { delay: 25 });

    // 5. LinkedIn
    await p.click('input[name="linkedin"]', { clickCount: 3 });
    await p.type('input[name="linkedin"]', 'https://www.linkedin.com/in/pratik-patidar', { delay: 20 });

    // 6. Reason
    await p.click('textarea[name="reason"]', { clickCount: 3 });
    await p.type('textarea[name="reason"]', 'I am an active Full Stack Developer specializing in React.js, Node.js, Express, and MongoDB with 1.5 years experience building scalable web solutions.', { delay: 15 });

    // 7. Upload Resume
    const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
    console.log('Attaching resume:', resumePath, 'exists:', fs.existsSync(resumePath));
    const fileInputs = await p.$$('input[type="file"]');
    if (fileInputs.length > 0) {
      await fileInputs[0].uploadFile(resumePath);
      console.log('Uploaded resume to Creuto file input');
    }

    await new Promise(r => setTimeout(r, 3000));

    // Pre-submit screenshot
    const prePath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/creuto_mern_presubmit.png';
    await p.screenshot({ path: prePath, fullPage: true });
    console.log('Pre-submit screenshot saved:', prePath);

    // Click Submit
    console.log('Submitting Creuto application...');
    await p.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => (b.innerText || '').toLowerCase().trim() === 'submit');
      if (btn) btn.click();
    });

    console.log('Waiting 10s for Creuto submission response...');
    await new Promise(r => setTimeout(r, 10000));

    // Post-submit screenshot
    const postPath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/creuto_mern_postsubmit.png';
    await p.screenshot({ path: postPath, fullPage: true });
    console.log('Post-submit screenshot saved:', postPath);

    const postState = await p.evaluate(() => {
      return {
        url: window.location.href,
        bodySnippet: document.body.innerText.slice(0, 700)
      };
    });
    console.log('Creuto Post Submit Result:', postState);

    const bodyLower = postState.bodySnippet.toLowerCase();
    const success = bodyLower.includes('thank') || 
                    bodyLower.includes('received') || 
                    bodyLower.includes('submitted') || 
                    bodyLower.includes('success');
    console.log('Creuto DOM Confirmation Success:', success);
  } catch (err) {
    console.error('Error submitting Creuto:', err);
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
