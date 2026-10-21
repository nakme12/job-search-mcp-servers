const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  console.log('Total open tabs:', pages.length);

  // User personal tabs that MUST NEVER be closed:
  // Telegram, WhatsApp, Outlier, DataAnnotation, Handshake, Housebets, GitHub, Mynaukri session/login tab.
  const protectedDomains = [
    'telegram.org',
    'whatsapp.com',
    'outlier.ai',
    'dataannotation.tech',
    'handshake-ai.com',
    'housebets.com',
    'github.com'
  ];

  let closedCount = 0;

  for (const p of pages) {
    try {
      const url = p.url();
      const title = await p.title();
      
      const isProtected = protectedDomains.some(d => url.includes(d));
      
      // If it's a main login/session tab or empty tab
      if (isProtected) {
        console.log('[KEEP USER TAB]', title, '|', url);
        continue;
      }

      // Check if it's an applied job portal tab or redirect tab
      const isJobOrRedirect = 
        url.includes('/career') ||
        url.includes('/jobs') ||
        url.includes('showAcp') ||
        url.includes('zohorecruit') ||
        url.includes('oraclecloud') ||
        url.includes('unicoconnect') ||
        url.includes('stellartechnologies') ||
        url.includes('euclideesoftwaresolutions') ||
        url.includes('digiadsagency') ||
        url.includes('peacockindia') ||
        url.includes('midbrains') ||
        url.includes('incruiter') ||
        url.includes('iflowglobal') ||
        url.includes('job-listings');

      // Keep if it's the actively running search page or pending login (oraclecloud / CX_1 if user needs it)
      if (isJobOrRedirect) {
        console.log('[CLOSING UNUSED JOB TAB]', title, '|', url);
        await p.close();
        closedCount++;
      } else {
        console.log('[KEEP OTHER TAB]', title, '|', url);
      }
    } catch (e) {
      console.log('Error checking page:', e.message);
    }
  }

  console.log(`\nSuccessfully closed ${closedCount} unused job tabs.`);
})();
