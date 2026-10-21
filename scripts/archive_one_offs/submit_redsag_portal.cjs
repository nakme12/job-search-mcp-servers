const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = await browser.newPage();
  try {
    await p.setViewport({ width: 1280, height: 950 });
    console.log('Navigating to Redsag career apply page...');
    await p.goto('https://www.red-sag.com/careers/apply/junior-frontend-developer', { waitUntil: 'domcontentloaded', timeout: 35000 });
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
          console.log('Response snippet:', txt.substring(0, 250));
        } catch (e) {}
      }
    });

    console.log('Filling candidate details into Redsag application form...');

    // firstName
    await p.click('input[name="firstName"]', { clickCount: 3 });
    await p.type('input[name="firstName"]', 'Pratik', { delay: 25 });

    // lastName
    await p.click('input[name="lastName"]', { clickCount: 3 });
    await p.type('input[name="lastName"]', 'Patidar', { delay: 25 });

    // email
    await p.click('input[name="email"]', { clickCount: 3 });
    await p.type('input[name="email"]', 'pratikpatidar7990@gmail.com', { delay: 25 });

    // phone
    await p.click('input[name="phone"]', { clickCount: 3 });
    await p.type('input[name="phone"]', '8269647990', { delay: 25 });

    // currentCity
    await p.click('input[name="currentCity"]', { clickCount: 3 });
    await p.type('input[name="currentCity"]', 'Indore, MP', { delay: 25 });

    // relocate radio ("yes")
    await p.evaluate(() => {
      const radio = document.querySelector('input[type="radio"][value="yes"]');
      if (radio) radio.click();
    });

    // noticePeriod select ("Immediate")
    await p.select('select[name="noticePeriod"]', 'Immediate');

    // expectedSalary
    await p.click('input[name="expectedSalary"]', { clickCount: 3 });
    await p.type('input[name="expectedSalary"]', '25,000', { delay: 20 });

    // linkedin
    await p.click('input[name="linkedin"]', { clickCount: 3 });
    await p.type('input[name="linkedin"]', 'https://www.linkedin.com/in/pratik-patidar', { delay: 20 });

    // portfolio
    await p.click('input[name="portfolio"]', { clickCount: 3 });
    await p.type('input[name="portfolio"]', 'https://pratik-portfolio-nine-orcin.vercel.app', { delay: 20 });

    // coverLetter
    await p.click('textarea[name="coverLetter"]', { clickCount: 3 });
    await p.type('textarea[name="coverLetter"]', 'I am a passionate Frontend Developer with 1.5 years experience building responsive, performant user interfaces using React, JavaScript, HTML5, and CSS3. I am eager to contribute to the engineering team at Redsag.', { delay: 15 });

    // Resume upload
    const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - React Developer.pdf');
    console.log('Attaching resume:', resumePath, 'exists:', fs.existsSync(resumePath));
    const fileInput = await p.$('input#apply-files') || await p.$('input[name="resume"]');
    if (fileInput) {
      await fileInput.uploadFile(resumePath);
      console.log('Uploaded resume to Redsag file input');
    }

    await new Promise(r => setTimeout(r, 3000));

    // Pre-submit screenshot
    const prePath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/redsag_fe_presubmit.png';
    await p.screenshot({ path: prePath, fullPage: true });
    console.log('Pre-submit screenshot saved:', prePath);

    // Submit application
    console.log('Clicking SUBMIT APPLICATION button...');
    const submitBtn = await p.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
    } else {
      await p.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').toLowerCase().includes('submit'));
        if (btn) btn.click();
      });
    }

    console.log('Waiting 10s for submission response...');
    await new Promise(r => setTimeout(r, 10000));

    // Post-submit screenshot
    const postPath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/redsag_fe_postsubmit.png';
    await p.screenshot({ path: postPath, fullPage: true });
    console.log('Post-submit screenshot saved:', postPath);

    const postInfo = await p.evaluate(() => ({
      url: window.location.href,
      bodyText: document.body.innerText.substring(0, 700)
    }));
    console.log('Redsag Post submit Result:', postInfo);

    const bodyLower = postInfo.bodyText.toLowerCase();
    const success = bodyLower.includes('thank') || 
                    bodyLower.includes('received') || 
                    bodyLower.includes('submitted') || 
                    bodyLower.includes('success');
    console.log('Redsag Physical Confirmation Success:', success);
  } catch (err) {
    console.error('Error submitting Redsag:', err);
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
