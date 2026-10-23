const puppeteer = require('puppeteer-core');
const { applyAshbyJob } = require('./ashby_auto_fill_engine.cjs');

async function testSupabaseAshby() {
  console.log('Connecting to Brave CDP at http://127.0.0.1:9222...');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const page = await browser.newPage();
  
  const job = {
    company: 'Supabase',
    role: 'Software Engineer - Turso',
    url: 'https://jobs.ashbyhq.com/supabase/7c5eb3fc-1087-4c1c-b3a2-a19fe01dd259/application'
  };

  try {
    const res = await applyAshbyJob(page, job);
    console.log('Submission result for Supabase:', res);
  } catch (err) {
    console.error('Error during Ashby execution:', err);
  } finally {
    await page.close();
  }
}

testSupabaseAshby();
