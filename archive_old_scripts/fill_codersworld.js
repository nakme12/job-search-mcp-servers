import puppeteer from 'puppeteer-core';
import path from 'path';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to Codersworld Frontend Developer form...');
    await page.goto('https://codersworld.in/careers/frontend-developer-reactjs-nextjs', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // Scroll to the application form
    await page.evaluate(() => {
      const f = document.querySelector('form');
      if (f) f.scrollIntoView({ behavior: 'smooth' });
    });
    await new Promise(r => setTimeout(r, 1000));

    // Fill the inputs natively
    console.log('Typing candidate details...');
    await page.type('#name', 'Pratik Patidar', { delay: 30 });
    await page.type('#email', 'pratikpatidar7990@gmail.com', { delay: 30 });
    await page.type('#phone', '8269647990', { delay: 30 });
    await page.type('#city', 'Indore', { delay: 30 });

    const coverPitch = `Frontend Engineer with 1.5 years of experience specializing in React.js, Next.js, TypeScript, and responsive UI engineering. Proven experience shipping production-grade reusable components, fast page loads, and seamless REST API integrations. Immediate joiner based in Indore / Open to reloc or remote.
Portfolio: https://pratik-portfolio-nine-orcin.vercel.app
GitHub: https://github.com/pratikpatidar`;

    await page.type('#cover_letter', coverPitch, { delay: 20 });

    // Upload Resume
    const resumePath = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
    console.log('Attaching resume:', resumePath);
    const fileInput = await page.$('input[type="file"]#resume');
    if (fileInput) {
      await fileInput.uploadFile(resumePath);
      console.log('Resume file attached.');
      await new Promise(r => setTimeout(r, 2000));
    } else {
      console.log('File input #resume not found!');
    }

    // Take Pre-Submit Screenshot (Rule 37)
    const preSubmitShot = 'screenshots/2026-10-13/pre_submit_codersworld.png';
    await page.screenshot({ path: preSubmitShot, fullPage: false });
    console.log('Pre-submit screenshot saved:', preSubmitShot);

  } catch (err) {
    console.error('Error filling Codersworld form:', err.message);
  }
})();
