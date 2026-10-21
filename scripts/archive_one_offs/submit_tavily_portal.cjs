const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1280, height: 900 });
    console.log('Navigating to Tavily Ashby form...');
    await page.goto('https://jobs.ashbyhq.com/tavily/fabd9b1b-a85b-4e74-a0ee-44f7251df743/application', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    // Upload resume to _systemfield_resume
    const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - React Developer.pdf');
    console.log('Resume path:', resumePath, 'exists:', fs.existsSync(resumePath));

    const fileInput = await page.$('input#_systemfield_resume') || await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(resumePath);
      console.log('Uploaded resume to file input');
    }
    await new Promise(r => setTimeout(r, 3000));

    // Fill Name
    await page.type('input[name="_systemfield_name"]', 'Pratik Patidar', { delay: 30 });
    // Fill Email
    await page.type('input[name="_systemfield_email"]', 'pratikpatidar7990@gmail.com', { delay: 30 });
    // Fill LinkedIn using attribute selector [name="..."]
    await page.type('input[name="96f5e442-7380-4c25-b7f0-e90a032a252a"]', 'https://www.linkedin.com/in/pratik-patidar', { delay: 30 });
    // Fill Years of Experience
    await page.type('input[name="e6cba91f-dd84-42fd-ace7-1bbf8f0281da"]', '1.5', { delay: 30 });

    await new Promise(r => setTimeout(r, 2000));

    const preScreenshot = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/tavily_fe_presubmit.png';
    await page.screenshot({ path: preScreenshot, fullPage: true });
    console.log('Pre-submission screenshot captured:', preScreenshot);

    // Find and click submit button
    const submitBtn = await page.$('button.ashby-application-form-submit-button') || await page.$('button[type="submit"]');
    console.log('Clicking submit button...');
    await submitBtn.click();

    // Wait for submission response / confirmation
    console.log('Waiting for confirmation...');
    await new Promise(r => setTimeout(r, 7000));

    const postScreenshot = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/tavily_fe_submitted.png';
    await page.screenshot({ path: postScreenshot, fullPage: true });
    console.log('Post-submission screenshot captured:', postScreenshot);

    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('Body text post-submission snippet:\n', bodyText.substring(0, 600));

    // Also check for confirmation indicators
    const isSubmitted = bodyText.toLowerCase().includes('thank') || 
                        bodyText.toLowerCase().includes('received') || 
                        bodyText.toLowerCase().includes('submitted') ||
                        bodyText.toLowerCase().includes('application received');
    console.log('Physical Confirmation Detected:', isSubmitted);
  } catch (err) {
    console.error('Error in script:', err);
  } finally {
    await page.close();
    await browser.disconnect();
  }
})();
