import puppeteer from 'puppeteer-core';

async function checkOptions() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const page = (await browser.pages()).find(p => p.url().includes('joinhandshake.com'));
  if (!page) return;

  const data = await page.evaluate(() => {
    const getOpts = (id) => {
      const el = document.getElementById(id);
      return el ? Array.from(el.querySelectorAll('option')).map(o => ({ value: o.value, text: o.text })) : [];
    };
    return {
      backgroundOpts: getOpts('_r_27_'),
      roleOpts: getOpts('_r_2d_'),
      educationOpts: getOpts('_r_2p_'),
      yearOpts: getOpts('_r_2u_'),
      hearOpts: getOpts('_r_3d_')
    };
  });

  console.log(JSON.stringify(data, null, 2));
  await browser.disconnect();
}

checkOptions().catch(console.error);
