const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  let p = pages.find(page => page.url().includes('jobs.ashbyhq.com/supabase'));
  if (!p) {
    console.log('No Supabase page found.');
    return;
  }

  const res = await p.evaluate(() => {
    // Check radio buttons state
    const radios = Array.from(document.querySelectorAll('input[type="radio"]')).map(r => ({
      id: r.id,
      name: r.name,
      checked: r.checked,
      labelText: r.parentElement ? r.parentElement.innerText.trim() : ''
    }));

    // Check Country of Residence input
    const countryInp = document.getElementById('99930a87-5d77-4ae1-915f-653693ad3614');
    const githubInp = document.getElementById('a1a1ff15-2eef-4c24-b732-2938b7b11697');

    return {
      radios,
      country: countryInp ? { val: countryInp.value, outer: countryInp.outerHTML } : null,
      github: githubInp ? { val: githubInp.value, outer: githubInp.outerHTML } : null
    };
  });

  console.log('DOM State:\n', JSON.stringify(res, null, 2));
})();
