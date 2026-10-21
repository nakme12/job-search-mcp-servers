import puppeteer from 'puppeteer-core';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('mail.google.com'));

  const fullBody = `Hi Anuyog Softwares Team,

I came across your opening for the Software Development Engineer I role in Indore (Job ID: JD-2026-021) and wanted to apply.

I am a Frontend / Software Engineer with 1.5 years of experience specializing in React.js, Next.js, TypeScript, JavaScript, REST APIs, and full-stack development. I have hands-on experience building clean, responsive interfaces, shipping production features, and end-to-end web applications.

I am based locally in Indore, available to join immediately, and eager to contribute to the engineering team.

I have attached my updated resume for your review.

Portfolio: https://pratik-portfolio-nine-orcin.vercel.app
GitHub: https://github.com/pratikpatidar
LinkedIn: https://www.linkedin.com/in/pratik-patidar

Thanks & Regards,
Pratik Patidar
pratikpatidar7990@gmail.com
+91 82696 47990`;

  if (page) {
    await page.evaluate((text) => {
      const el = document.querySelector('div[aria-label="Message Body"], div[role="textbox"]');
      if (el) {
        el.innerText = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, fullBody);
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'screenshots/2026-10-13/gmail_anuyog_ready_to_send.png' });
    console.log('Complete body injected and saved screenshots/2026-10-13/gmail_anuyog_ready_to_send.png');
  }
})();
