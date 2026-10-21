import puppeteer from 'puppeteer-core';
import path from 'path';

const TARGETS = [
  {
    company: 'Niti Technologies India Software',
    email: 'hr@nititechnologiesindia.com',
    role: 'MERN Stack Developer',
    location: 'Kharadi, Pune',
    resumeName: 'Pratik Patidar Resume - MERN Full Stack.pdf',
    subject: 'Application for MERN Stack Developer - Pratik Patidar'
  },
  {
    company: 'Tech Erudite',
    email: 'techerudite.career@gmail.com',
    role: 'MERN Stack Developer',
    location: 'Ahmedabad',
    resumeName: 'Pratik Patidar Resume - MERN Full Stack.pdf',
    subject: 'Application for MERN Stack Developer - Pratik Patidar'
  }
];

function getCanonicalBody(t) {
  return `Hi ${t.company} Hiring Team,

I came across your opening for a ${t.role} in ${t.location} and wanted to apply for the role.

I'm a Frontend Engineer with 1.5 years of experience, mainly working with React.js, Next.js, TypeScript, JavaScript, REST APIs, and responsive UI development. I have hands-on experience building reusable components, responsive interfaces, and API-integrated web applications.

I'm based in Indore and would be glad to discuss the opportunity further.

I've attached my updated resume for your review.

LinkedIn: https://www.linkedin.com/in/pratik-patidar
Portfolio: https://pratik-portfolio-nine-orcin.vercel.app

Thanks & Regards,
Pratik Patidar
pratikpatidar7990@gmail.com
+91 82696 47990`;
}

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('mail.google.com'));
  if (!page) {
    page = await browser.newPage();
    await page.goto('https://mail.google.com/mail/u/1/#sent', { waitUntil: 'networkidle2' });
  }
  await page.bringToFront();

  for (let i = 0; i < TARGETS.length; i++) {
    const t = TARGETS[i];
    console.log(`Sending exact canonical mail to ${t.company} (${t.email})...`);

    // Discard any open draft
    await page.evaluate(() => {
      document.querySelectorAll('img[aria-label="Discard draft"], div[aria-label="Discard draft"]').forEach(b => b.click());
    });
    await new Promise(r => setTimeout(r, 800));

    // Compose
    await page.evaluate(() => {
      const comp = document.querySelector('div[role="button"][gh="cm"], .T-I.T-I-KE.L3, [aria-label="Compose"]');
      if (comp) comp.click();
    });
    await new Promise(r => setTimeout(r, 1200));

    // To
    await page.type('input[name="to"], input[peoplekit-id], input.agP.aFw, [aria-label="To recipients"]', t.email);
    await page.keyboard.press('Enter');

    // Subject
    await page.type('input[name="subjectbox"], input[placeholder="Subject"]', t.subject);

    // Body
    const bodyText = getCanonicalBody(t);
    await page.evaluate((text) => {
      const bodyEl = document.querySelector('div[aria-label="Message Body"], div[role="textbox"][g_editable="true"]');
      if (bodyEl) {
        bodyEl.focus();
        bodyEl.innerText = text;
        bodyEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, bodyText);

    // Attachment
    const resumePath = path.resolve('resumes', t.resumeName);
    const fileInput = await page.$('input[type="file"][name="Filedata"], input[type="file"]');
    await fileInput.uploadFile(resumePath);
    await new Promise(r => setTimeout(r, 3000));

    // Pre-send screenshot
    const safeComp = t.company.toLowerCase().replace(/[^a-z0-9]/g, '_');
    await page.screenshot({ path: `screenshots/2026-10-12/fast_presend_${safeComp}.png` });

    // Send
    await page.keyboard.down('Control');
    await page.keyboard.press('Enter');
    await page.keyboard.up('Control');
    await new Promise(r => setTimeout(r, 2000));

    await page.screenshot({ path: `screenshots/2026-10-12/fast_sent_${safeComp}.png` });
    console.log(`Delivered to ${t.company}!`);
  }

  browser.disconnect();
})();
