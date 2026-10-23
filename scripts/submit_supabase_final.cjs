const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');
const path = require('path');
const fs = require('fs');

async function fillAndSubmitSupabase() {
  console.log('Attaching to CDP...');
  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const pages = context.pages();
  const page = pages.find(p => p.url().includes('jobs.ashbyhq.com/supabase') && p.url().includes('/application'));
  
  if (!page) {
    console.log('Supabase page not found in CDP!');
    process.exit(1);
  }

  console.log('Found Supabase application tab. Title:', await page.title());

  // 1. Name
  console.log('1. Typing Name...');
  const nameInput = page.locator('input[name="_systemfield_name"]');
  await nameInput.click();
  await nameInput.fill('Pratik Patidar');

  // 2. Email
  console.log('2. Typing Email...');
  const emailInput = page.locator('input[name="_systemfield_email"]');
  await emailInput.click();
  await emailInput.fill('pratikpatidar7990@gmail.com');

  // 3. Resume
  console.log('3. Attaching Resume...');
  const resumePath = 'C:/mcp/job-search-mcp-engine/resumes/Pratik Patidar Resume - MERN Full Stack.pdf';
  await page.locator('input#_systemfield_resume').setInputFiles(resumePath);
  await page.waitForTimeout(2000);

  // 4. Custom fields via evaluate to directly target the React DOM elements
  console.log('4. Handling custom questions via evaluate...');
  await page.evaluate(() => {
    function setNativeValue(element, value) {
      const valueSetter = Object.getOwnPropertyDescriptor(element, 'value') ? Object.getOwnPropertyDescriptor(element, 'value').set : null;
      const prototype = Object.getPrototypeOf(element);
      const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value') ? Object.getOwnPropertyDescriptor(prototype, 'value').set : null;
      if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
        prototypeValueSetter.call(element, value);
      } else if (valueSetter) {
        valueSetter.call(element, value);
      } else {
        element.value = value;
      }
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const containers = Array.from(document.querySelectorAll('div, fieldset'));
    for (const c of containers) {
      const label = c.querySelector('label, [class*="label"]');
      if (!label) continue;
      const text = label.innerText.trim();

      if (text.includes('Passport Country')) {
        const inp = c.querySelector('input:not([type="file"])');
        if (inp) setNativeValue(inp, 'India');
      }
      if (text.includes('Country of Residence')) {
        const inp = c.querySelector('input:not([type="file"])');
        if (inp) setNativeValue(inp, 'India');
      }
      if (text.includes('Github Profile')) {
        const inp = c.querySelector('input:not([type="file"])');
        if (inp) setNativeValue(inp, 'https://github.com/pratikpatidar');
      }
      if (text.includes('Linkedin')) {
        const inp = c.querySelector('input:not([type="file"])');
        if (inp) setNativeValue(inp, 'https://www.linkedin.com/in/pratik-patidar');
      }
      if (text.includes('Are you over the age of 18')) {
        const btns = Array.from(c.querySelectorAll('button, span, div'));
        const yes = btns.find(b => b.innerText && b.innerText.trim() === 'Yes');
        if (yes) yes.click();
      }
      if (text.includes('Tell us about your experience working in an async')) {
        const ta = c.querySelector('textarea');
        if (ta) setNativeValue(ta, 'I have 1.5 years of experience collaborating effectively in async and remote engineering environments using GitHub, Slack, Jira, clear documentation, and proactive daily check-ins. I prioritize structured communication and unblocking teammates promptly.');
      }
    }
  });

  await page.waitForTimeout(2000);

  // 5. Check validation errors
  const errors = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('*'))
      .filter(el => {
        const c = typeof el.className === 'string' ? el.className.toLowerCase() : '';
        return c.includes('error') || el.getAttribute('aria-invalid') === 'true';
      })
      .map(e => e.innerText.trim()).filter(Boolean);
  });
  console.log('Current Validation Errors:', Array.from(new Set(errors)));

  // 6. Submit Application
  console.log('5. Clicking Submit Application...');
  const submitBtn = page.locator('button.ashby-application-form-submit-button');
  await submitBtn.click();
  console.log('Submit clicked! Waiting 7 seconds for confirmation...');
  await page.waitForTimeout(7000);

  const snippet = await page.evaluate(() => document.body ? document.body.innerText.slice(0, 500).replace(/\s+/g, ' ') : '');
  console.log('Current DOM text snippet:\n', snippet);

  const isConfirmed = /thank you|application submitted|application received|submitted successfully/i.test(snippet);
  if (isConfirmed) {
    console.log('🎉 SUPABASE APPLICATION SUBMITTED SUCCESSFULLY!');
    const ssPath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-22/shift2/supabase_turso_confirmed.png';
    fs.mkdirSync(path.dirname(ssPath), { recursive: true });
    await page.screenshot({ path: ssPath, fullPage: true });
    console.log('Screenshot saved to:', ssPath);

    // Lock in File 5
    const f5Path = 'C:/mcp/job-search-mcp-engine/data/daily/applied_todays_2026-10-22.json';
    let f5 = { date: '2026-10-22', shift: 2, total: 0, jobs: [] };
    if (fs.existsSync(f5Path)) {
      try { f5 = JSON.parse(fs.readFileSync(f5Path, 'utf8')); } catch(e){}
    }
    f5.jobs.push({
      company: 'Supabase',
      role: 'Software Engineer - Turso',
      url: 'https://jobs.ashbyhq.com/supabase/7c5eb3fc-1087-4c1c-b3a2-a19fe01dd259/application',
      channel: 'Ashby Direct ATS (Slot 7 Fully Automated)',
      proof_screenshot: ssPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    });
    f5.total = f5.jobs.length;
    fs.writeFileSync(f5Path, JSON.stringify(f5, null, 2), 'utf8');
    console.log('File 5 updated successfully! Total confirmed applied:', f5.total);
  } else {
    console.log('⚠️ Confirmation text not detected yet.');
  }

  process.exit(0);
}

fillAndSubmitSupabase().catch(err => {
  console.error('Execution Error:', err);
  process.exit(1);
});
