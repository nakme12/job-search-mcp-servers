const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const deltek = (await browser.pages()).find(p => p.url().includes('sjobs.brassring.com'));
  
  // Set travel, relocate, salary, start, referral
  await deltek.evaluate(() => {
    const sel = document.getElementById('custom_15197_529_fname_slt_0_15197');
    if (sel) {
      sel.value = '10';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Relocate
    const rel = document.getElementById('radio-18580-Yes');
    if (rel) rel.click();

    // Salary
    const sal = document.getElementById('custom_18579_529_fname_txt_0');
    if (sal) {
      sal.value = '465000';
      sal.dispatchEvent(new Event('input', { bubbles: true }));
      sal.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Start
    const st = document.getElementById('custom_40422_529_fname_txt_0');
    if (st) {
      st.value = '15 Days';
      st.dispatchEvent(new Event('input', { bubbles: true }));
      st.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Do you know anyone
    const know = document.getElementById('radio-92826-No');
    if (know) know.click();
  });

  // Source input
  const sourceInp = await deltek.$('input[id*="custom_63360"]');
  if (sourceInp) {
    await sourceInp.click();
    await sourceInp.type('LinkedIn');
    await new Promise(r => setTimeout(r, 1000));
  }

  // Check if dropdown list appeared or options
  const dropItems = await deltek.evaluate(() => {
    return Array.from(document.querySelectorAll('.ui-menu-item, .dropdown-menu li, .typeahead li, [role="option"], ul.ui-autocomplete li')).map(el => ({
      text: el.innerText.trim(),
      id: el.id
    }));
  });
  console.log('Drop items:', dropItems);

  // If items exist, click the first one
  if (dropItems.length > 0) {
    await deltek.evaluate(() => {
      const first = document.querySelector('.ui-menu-item, .dropdown-menu li, .typeahead li, [role="option"], ul.ui-autocomplete li');
      if (first) first.click();
    });
  }

  // Click continue button #shownext
  await new Promise(r => setTimeout(r, 1000));
  console.log('Clicking shownext...');
  await deltek.evaluate(() => {
    document.getElementById('shownext').click();
  });

  await new Promise(r => setTimeout(r, 3000));
  console.log('New Title after step 3:', await deltek.title());

  process.exit(0);
})();
