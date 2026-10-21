import puppeteer from 'puppeteer-core';
import fs from 'fs';

const chunk1 = [
  {
    company: "Worldline",
    role: "Application Engineer - ReactJS Frontend",
    url: "https://in.linkedin.com/jobs/view/application-engineer-reactjs-frontend-at-worldline-4469882087",
    notes: "1-4 yrs professional experience"
  },
  {
    company: "Anuyogsoftwares",
    role: "Software Development Engineer I",
    url: "https://in.linkedin.com/jobs/view/software-development-engineer-i-4477962963",
    notes: "Indore local role, IIIT founders"
  },
  {
    company: "Codersworld",
    role: "Frontend Developer (React/Next.js)",
    url: "https://in.linkedin.com/jobs/view/frontend-developer-%E2%80%93-react-js-next-js-4477965943",
    notes: "1-5 yrs"
  },
  {
    company: "Ssssybertech",
    role: "Front End React JS Developer",
    url: "https://in.linkedin.com/jobs/view/front-end-react-js-developer-4477972673",
    notes: "Legit small company"
  },
  {
    company: "TCS",
    role: "Reactjs Developer",
    url: "https://in.linkedin.com/jobs/view/reactjs-developer-at-tata-consultancy-services-4478511534",
    notes: "TCS general React roles"
  }
];

(async () => {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    console.log('Connected to CDP Chrome.');
  } catch (err) {
    console.error('CDP connect error:', err.message);
    process.exit(1);
  }

  // Inspect each job in chunk 1 one by one
  for (let i = 0; i < chunk1.length; i++) {
    const job = chunk1[i];
    console.log(`\n==================================================`);
    console.log(`[Job ${i + 1}/5] Navigating to: ${job.company} - ${job.role}`);
    console.log(`URL: ${job.url}`);

    const page = await browser.newPage();
    try {
      await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise(r => setTimeout(r, 4000));

      const pageData = await page.evaluate(() => {
        const title = document.title;
        const text = document.body.innerText || '';
        const isClosed = text.includes('No longer accepting applications') || text.includes('This job is closed');
        
        // Find apply button
        const buttons = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
        const applyBtn = buttons.find(b => {
          const t = (b.innerText || b.value || '').trim().toLowerCase();
          return t.includes('easy apply') || t === 'apply' || t.includes('apply on company website');
        });

        const isEasyApply = applyBtn ? (applyBtn.innerText || '').toLowerCase().includes('easy apply') : false;
        const applyText = applyBtn ? (applyBtn.innerText || applyBtn.value || '').trim() : 'Not found';

        return {
          title,
          isClosed,
          applyText,
          isEasyApply,
          snippet: text.slice(0, 1500)
        };
      });

      console.log('Page Title:', pageData.title);
      console.log('Is Closed:', pageData.isClosed);
      console.log('Apply Button:', pageData.applyText, '| Is Easy Apply:', pageData.isEasyApply);

      const shotPath = `screenshots/2026-10-13/chunk1_job${i+1}_${job.company.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      await page.screenshot({ path: shotPath });
      console.log(`Saved screenshot: ${shotPath}`);

    } catch (e) {
      console.error(`Error inspecting job ${job.company}:`, e.message);
    } finally {
      // Keep tabs under limit (Rule 35: max 2 LI tabs)
      await page.close();
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log('\nChunk 1 verification complete!');
})();
