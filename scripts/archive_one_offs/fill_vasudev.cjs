const path = require('path');
const puppeteer = require('puppeteer-core');

const RESUME_PATH = path.resolve(__dirname, '..', 'resumes', 'Pratik Patidar Resume - React Developer.pdf');

async function fillVasudev() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const p = pages.find(page => page.url().includes('vasudevs.com'));

  if (!p) {
    console.log('Vasudev page not found.');
    return;
  }

  await p.bringToFront();
  console.log('Vasudev portal tab brought to front!');

  // Fill WP forms inputs
  await p.evaluate(() => {
    // Fill Name
    const nameInp = document.querySelector('input[name="text-829"]') || document.getElementById('form-field-name');
    if (nameInp) {
      nameInp.value = 'Pratik Patidar';
      nameInp.dispatchEvent(new Event('input', { bubbles: true }));
      nameInp.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Fill Email
    const emailInp = document.querySelector('input[name="email-502"]') || document.getElementById('form-field-email');
    if (emailInp) {
      emailInp.value = 'pratikpatidar7990@gmail.com';
      emailInp.dispatchEvent(new Event('input', { bubbles: true }));
      emailInp.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Fill Phone
    const phoneInp = document.querySelector('input[name="tel-179"]') || document.getElementById('form-field-a21540f');
    if (phoneInp) {
      phoneInp.value = '8269647990';
      phoneInp.dispatchEvent(new Event('input', { bubbles: true }));
      phoneInp.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  // Upload Resume
  console.log('Uploading Resume:', RESUME_PATH);
  const fileInp = await p.$('input[name="file-114"], input[type="file"]');
  if (fileInp) {
    await fileInp.uploadFile(RESUME_PATH);
  }

  await new Promise(r => setTimeout(r, 2000));

  const state = await p.evaluate(() => {
    return {
      name: document.querySelector('input[name="text-829"]')?.value,
      email: document.querySelector('input[name="email-502"]')?.value,
      phone: document.querySelector('input[name="tel-179"]')?.value,
      file: document.querySelector('input[name="file-114"]')?.value
    };
  });

  console.log('\n================ LIVE VASUDEV FORM POPULATED ================');
  console.log(JSON.stringify(state, null, 2));
  console.log('=============================================================\n');

  await p.screenshot({ path: 'screenshots/preview_vasudev_populated.png' });
  console.log('Saved preview: screenshots/preview_vasudev_populated.png');
}

fillVasudev().catch(console.error);
