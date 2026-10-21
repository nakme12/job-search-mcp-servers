const puppeteer = require('puppeteer-core');
const { auditJobText } = require('./job_gatekeeper.cjs');

async function auditNaukriBatch() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });

  const naukriUrls = [
    { company: 'Ford Business Solutions', url: 'https://www.naukri.com/job-listings-full-stack-engineer-ford-motor-private-limited-chennai-0-to-5-years-141026929531' },
    { company: 'Veloces Consulting', url: 'https://www.naukri.com/job-listings-multimedia-designer-web-developer-veloces-consulting-services-bengaluru-0-to-2-years-111125015027' },
    { company: 'Perfectlyokay', url: 'https://www.naukri.com/job-listings-junior-full-stack-developer-perfectlyokay-ulhasnagar-0-to-3-years-131026501829' },
    { company: 'Rock Solid Solutions', url: 'https://www.naukri.com/job-listings-full-stack-developer-programming-internship-rock-solid-solutions-mumbai-0-to-0-years-131026016876' },
    { company: 'Rubyroman Tech', url: 'https://www.naukri.com/job-listings-mern-stack-developer-ruby-roman-jaipur-1-to-3-years-260525500636' }
  ];

  for (const item of naukriUrls) {
    const page = await browser.newPage();
    console.log('\n==============================================');
    console.log('[NAUKRI LIVE AUDIT] Opening:', item.company);
    try {
      await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise(r => setTimeout(r, 3000));
      
      const details = await page.evaluate(() => {
        const title = document.title;
        const text = document.body.innerText;
        return {
          title,
          textSnippet: text.substring(0, 1500).replace(/\s+/g, ' ')
        };
      });

      console.log('Title:', details.title);
      const audit = auditJobText(details.textSnippet, details.title);
      console.log('Gatekeeper Result:', audit.passed ? '✅ PASSED CLEAN' : '❌ REJECTED: ' + audit.reason);
      console.log('Snippet:', details.textSnippet.substring(0, 300));

    } catch (e) {
      console.log('Error opening:', e.message);
    } finally {
      await page.close();
    }
  }
}

auditNaukriBatch().catch(console.error);
